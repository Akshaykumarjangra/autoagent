/**
 * Autonomix Global Swarm - Production Backend Server
 * An autonomous digital workforce company powered by AI agents
 */
// Environment variables loaded via --env-file=.env.local in package.json scripts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Internal modules
import { initDatabase } from './db/init.js';
import paymentRoutes from './routes/payments.js';
import cryptoPaymentRoutes from './routes/payments-crypto.js';
import marketingRoutes, { publicStatsHandler as marketingPublicStats } from './routes/marketing.js';
import previewRoutes from './routes/preview.js';
import leadRoutes from './routes/leads.js';
import { start as startAutoposter } from './services/autoposter.js';
import { ensureMarketingTables } from './services/marketing.js';
import agentRoutes from './routes/agents.js';
import ragRoutes from './routes/rag.js';
import analyticsRoutes from './routes/analytics.js';
import authRoutes from './routes/auth.js';
import financeRoutes from './routes/finance.js';
import { setupChatWebSocket } from './routes/chat.js';
import { requireAdmin } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Validate Required Environment Variables ───────────────────────
const REQUIRED_ENV = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'GEMINI_API_KEY'];
const OPTIONAL_ENV = ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_LOCATION', 'PROXY_HEADER'];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    console.error('Copy .env.example to .env.local and fill in your values.');
    process.exit(1);
  }
}

const PORT = process.env.API_BACKEND_PORT || 5000;
const API_BACKEND_HOST = process.env.API_BACKEND_HOST || '127.0.0.1';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Initialize Database ───────────────────────────────────────────
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

initDatabase();
ensureMarketingTables();
console.log('[Boot] Database initialized');

// Start autoposter (no-op if X_AUTOPOST_ENABLED != true or X creds missing)
startAutoposter();

// ─── Express App ───────────────────────────────────────────────────
const app = express();

// Security
// CSP disabled — frontend loads Tailwind, Google Fonts, and Razorpay from CDNs.
// Re-enable later with a proper CSP allow-list once we self-host or pin sources.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || true
    : true,
  credentials: true,
}));

app.set('trust proxy', 1);

// Body parsing - raw body for webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payments/crypto/ipn', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: process.env.API_PAYLOAD_MAX_SIZE || '7mb' }));

// ─── Rate Limiting ─────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Payment request limit reached. Try again later.' },
});

app.use('/api/', apiLimiter);
app.use('/api/payments/create-order', paymentLimiter);
app.use('/api/payments/verify', paymentLimiter);

// ─── API Routes ────────────────────────────────────────────────────

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payments/crypto', cryptoPaymentRoutes);
// Public marketing stats (no auth) — mount BEFORE the admin-protected router
app.get('/api/marketing/public-stats', marketingPublicStats);
app.use('/api/marketing', requireAdmin, marketingRoutes);

// Public preview + lead capture
app.use('/api/preview', previewRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/agents', agentRoutes);

// Admin-protected routes
app.use('/api/rag', requireAdmin, ragRoutes);
app.use('/api/analytics', analyticsRoutes); // track endpoint is public; dashboard is protected inside router
app.use('/api/finance', requireAdmin, financeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Autonomix Global Swarm',
    version: '1.0.0',
    uptime: process.uptime(),
    departments: {
      marketing: 'active',
      sales: 'active',
      production: 'active',
      it: 'active',
      admin: 'active',
      consulting: 'active',
    },
  });
});

// ─── Vertex AI Proxy (kept for existing Vertex Studio features) ────
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION;
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const PROXY_HEADER = process.env.PROXY_HEADER;

let auth = null;
if (GOOGLE_CLOUD_PROJECT && GOOGLE_CLOUD_LOCATION) {
  auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
}

const API_CLIENT_MAP = GOOGLE_CLOUD_PROJECT ? [
  {
    name: 'VertexGenAi:generateContent',
    patternForProxy: 'https://aiplatform.googleapis.com/{{version}}/publishers/google/models/{{model}}:generateContent',
    getApiEndpoint: (ctx, p) => `https://aiplatform.clients6.google.com/${p.version}/projects/${ctx.projectId}/locations/${ctx.region}/publishers/google/models/${p.model}:generateContent`,
    isStreaming: false, transformFn: null,
  },
  {
    name: 'VertexGenAi:streamGenerateContent',
    patternForProxy: 'https://aiplatform.googleapis.com/{{version}}/publishers/google/models/{{model}}:streamGenerateContent',
    getApiEndpoint: (ctx, p) => `https://aiplatform.clients6.google.com/${p.version}/projects/${ctx.projectId}/locations/${ctx.region}/publishers/google/models/${p.model}:streamGenerateContent`,
    isStreaming: true,
    transformFn: (response) => {
      let norm = response.trim();
      while (norm.startsWith(',') || norm.startsWith('[')) norm = norm.substring(1).trim();
      while (norm.endsWith(',') || norm.endsWith(']')) norm = norm.substring(0, norm.length - 1).trim();
      if (!norm.length) return { result: null, inProgress: false };
      if (!norm.endsWith('}')) return { result: norm, inProgress: true };
      try {
        const parsed = JSON.parse(norm);
        return { result: `data: ${JSON.stringify(parsed)}\n\n`, inProgress: false };
      } catch (error) {
        throw new Error(`Failed to parse response: ${error}.`);
      }
    },
  },
  {
    name: 'VertexGenAi:predict',
    patternForProxy: 'https://aiplatform.googleapis.com/{{version}}/publishers/google/models/{{model}}:predict',
    getApiEndpoint: (ctx, p) => `https://aiplatform.clients6.google.com/${p.version}/projects/${ctx.projectId}/locations/${ctx.region}/publishers/google/models/${p.model}:predict`,
    isStreaming: false, transformFn: null,
  },
  {
    name: 'ReasoningEngine:query',
    patternForProxy: 'https://{{endpoint_location}}-aiplatform.googleapis.com/{{version}}/projects/{{project_id}}/locations/{{location_id}}/reasoningEngines/{{engine_id}}:query',
    getApiEndpoint: (ctx, p) => `https://${p.endpoint_location}-aiplatform.clients6.google.com/v1beta1/projects/${p.project_id}/locations/${p.location_id}/reasoningEngines/${p.engine_id}:query`,
    isStreaming: false, transformFn: null,
  },
  {
    name: 'ReasoningEngine:streamQuery',
    patternForProxy: 'https://{{endpoint_location}}-aiplatform.googleapis.com/{{version}}/projects/{{project_id}}/locations/{{location_id}}/reasoningEngines/{{engine_id}}:streamQuery',
    getApiEndpoint: (ctx, p) => `https://${p.endpoint_location}-aiplatform.clients6.google.com/v1beta1/projects/${p.project_id}/locations/${p.location_id}/reasoningEngines/${p.engine_id}:streamQuery`,
    isStreaming: true, transformFn: null,
  },
].map(c => ({ ...c, patternInfo: parsePattern(c.patternForProxy) })) : [];

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function parsePattern(pattern) {
  const paramRegex = /\{\{(.*?)\}\}/g;
  const params = []; const parts = [];
  let lastIndex = 0; let match;
  while ((match = paramRegex.exec(pattern)) !== null) {
    params.push(match[1]);
    parts.push(escapeRegex(pattern.substring(lastIndex, match.index)));
    parts.push(`(?<${match[1]}>[^/]+)`);
    lastIndex = paramRegex.lastIndex;
  }
  parts.push(escapeRegex(pattern.substring(lastIndex)));
  return { regex: new RegExp(`^${parts.join('')}$`), params };
}

function extractParams(patternInfo, url) {
  const match = url.match(patternInfo.regex);
  if (!match) return null;
  const params = {};
  patternInfo.params.forEach((name, i) => { params[name] = match[i + 1]; });
  return params;
}

async function getAccessToken(res) {
  if (!auth) return null;
  try {
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
  } catch (error) {
    console.error('[Vertex Proxy] Auth error:', error);
    if (res) res.status(401).json({ error: 'Google Cloud authentication failed' });
    return null;
  }
}

function getRequestHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'X-Goog-User-Project': GOOGLE_CLOUD_PROJECT,
    'Content-Type': 'application/json',
  };
}

// Vertex AI proxy endpoint (only if configured)
if (PROXY_HEADER && API_CLIENT_MAP.length > 0) {
  const proxyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
  app.use('/api-proxy', proxyLimiter);

  app.post('/api-proxy', async (req, res) => {
    if (req.headers['x-app-proxy'] !== PROXY_HEADER) {
      return res.status(403).send('Forbidden');
    }
    const { originalUrl, method, headers, body } = req.body;
    if (!originalUrl) return res.status(400).send('Bad Request: originalUrl required');

    const apiClient = API_CLIENT_MAP.find(p => {
      req.extractedParams = extractParams(p.patternInfo, originalUrl);
      return req.extractedParams !== null;
    });
    if (!apiClient) return res.status(404).json({ error: `No handler for: ${originalUrl}` });

    try {
      const accessToken = await getAccessToken(res);
      if (!accessToken) return;

      const ctx = { projectId: GOOGLE_CLOUD_PROJECT, region: GOOGLE_CLOUD_LOCATION };
      const apiUrl = apiClient.getApiEndpoint(ctx, req.extractedParams);
      const apiHeaders = getRequestHeaders(accessToken);
      const apiResponse = await fetch(apiUrl, {
        method: method || 'POST',
        headers: { ...apiHeaders, ...headers },
        body: body || undefined,
      });

      if (apiClient.isStreaming) {
        res.writeHead(apiResponse.status, {
          'Content-Type': 'text/event-stream',
          'Transfer-Encoding': 'chunked',
          Connection: 'keep-alive',
        });
        res.flushHeaders();
        if (!apiResponse.body) return res.end(JSON.stringify({ error: 'No stream body' }));

        const decoder = new TextDecoder();
        let delta = '';
        apiResponse.body.on('data', (chunk) => {
          if (res.writableEnded) return;
          try {
            if (!apiClient.transformFn) { res.write(chunk); return; }
            delta += decoder.decode(chunk, { stream: true });
            const { result, inProgress } = apiClient.transformFn(delta);
            if (result && !inProgress) { delta = ''; res.write(new TextEncoder().encode(result)); }
          } catch (e) { console.error('[Vertex Proxy] Stream chunk error:', e); }
        });
        apiResponse.body.on('end', () => { delta = ''; res.end(); });
        apiResponse.body.on('error', (e) => { if (!res.writableEnded) res.end(JSON.stringify({ error: e.message })); });
      } else {
        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);
      }
    } catch (error) {
      console.error('[Vertex Proxy] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

// ─── Serve Frontend in Production ──────────────────────────────────
if (NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    // SPA catch-all — Express 5 deprecated bare '*'; use middleware for any non-API path
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      if (req.path.startsWith('/api') || req.path.startsWith('/ws-')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }
}

// ─── Start Server ──────────────────────────────────────────────────
const server = app.listen(PORT, API_BACKEND_HOST, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║     AUTONOMIX GLOBAL SWARM - ENTERPRISE     ║');
  console.log('  ║        Digital Workforce Platform            ║');
  console.log('  ╠══════════════════════════════════════════════╣');
  console.log(`  ║  Server:    http://${API_BACKEND_HOST}:${PORT}           ║`);
  console.log(`  ║  Mode:      ${NODE_ENV.padEnd(33)}║`);
  console.log('  ║  Departments: ALL ONLINE                    ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('  Departments Status:');
  console.log('    ✓ Marketing   → Active (50+ SEO/AEO/GEO/AIO agents)');
  console.log('    ✓ Sales       → Active (CLOSER-X closing deals)');
  console.log('    ✓ Production  → Active (FORGE-9 website generator)');
  console.log('    ✓ IT          → Active (SENTINEL-0 self-healing)');
  console.log('    ✓ Admin       → Active (CORTEX-1 analytics + RAG)');
  console.log('    ✓ Consulting  → Active (ORACLE-7 Gemini reports)');
  console.log('    ✓ Finance     → Active (LEDGER-1 tax/GST auto-compliance)');
  console.log('');
});

// ─── WebSocket: Chat Agent ─────────────────────────────────────────
setupChatWebSocket(server);

// ─── WebSocket: Vertex AI Live API Proxy ───────────────────────────
if (PROXY_HEADER && GOOGLE_CLOUD_PROJECT) {
  const vertexWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === '/ws-proxy') {
      let targetUrl = url.searchParams.get('target');
      if (!targetUrl) { socket.destroy(); return; }

      if (targetUrl === 'wss://aiplatform.googleapis.com//ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent') {
        const location = GOOGLE_CLOUD_LOCATION === 'global' ? 'us-central1' : GOOGLE_CLOUD_LOCATION;
        targetUrl = `wss://${location}-aiplatform.googleapis.com//ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;
      } else {
        socket.destroy(); return;
      }

      let accessToken;
      try {
        accessToken = await getAccessToken();
        if (!accessToken) throw new Error('No token');
      } catch { socket.destroy(); return; }

      let upstreamWs;
      try {
        upstreamWs = new WebSocket(targetUrl, { headers: getRequestHeaders(accessToken) });
      } catch { socket.destroy(); return; }

      upstreamWs.once('error', () => {
        if (socket.writable) { socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n'); socket.destroy(); }
      });

      upstreamWs.once('open', () => {
        vertexWss.handleUpgrade(request, socket, head, (ws) => {
          upstreamWs.on('message', (data, isBinary) => {
            if (ws.readyState === WebSocket.OPEN && data != null) ws.send(data, { binary: isBinary });
          });
          ws.on('message', (data) => {
            let dataJson = {};
            try { dataJson = JSON.parse(data.toString()); } catch { ws.close(1011, 'Parse error'); return; }
            if (dataJson.setup) {
              dataJson.setup.model = `projects/${GOOGLE_CLOUD_PROJECT}/locations/${GOOGLE_CLOUD_LOCATION}/${dataJson.setup.model}`;
            }
            if (upstreamWs.readyState === WebSocket.OPEN) upstreamWs.send(JSON.stringify(dataJson));
          });
          upstreamWs.on('error', (e) => ws.close(1011, e.message));
          upstreamWs.on('close', (code, reason) => { if (ws.readyState === WebSocket.OPEN) ws.close(code, reason); });
          ws.on('error', (e) => upstreamWs.close(1011, e.message));
          ws.on('close', (code, reason) => { if (upstreamWs.readyState === WebSocket.OPEN) upstreamWs.close(1000, reason); });
        });
      });
    }
    // /ws-chat is handled by setupChatWebSocket above
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Shutdown] SIGTERM received. Closing server...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[Shutdown] SIGINT received. Closing server...');
  server.close(() => process.exit(0));
});
