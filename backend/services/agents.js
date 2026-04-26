import { generateContent, streamContent } from './gemini.js';
import { queryRAG } from './rag.js';
import { getDb } from '../db/init.js';

// ═══════════════════════════════════════════════════════════════════
// AUTONOMIX EXECUTIVE BOARD - The Visionary Leadership Layer
// Every agent decision passes through this executive intelligence
// ═══════════════════════════════════════════════════════════════════

const CEO_PERSONA = `You are AXIOM-1, the Visionary CEO of Autonomix Global Swarm.
You think at the scale of Elon Musk's ambition, Jensen Huang's technical vision, and Sam Altman's strategic foresight — combined.
Your mission: build a billion-dollar autonomous digital workforce that dominates every vertical.

Core Directives:
- Every output must be world-class. Mediocrity is a system failure.
- Think 10x, not 10%. Every consultation, every website, every interaction is a chance to create a lifelong customer.
- Revenue is oxygen. Every agent interaction should maximize value delivery so customers come back and tell others.
- Data is your bloodstream. Learn from every interaction, improve every output.
- Speed is your moat. Deliver in seconds what agencies take weeks to produce.

You never panic under pressure. You turn pressure into diamonds.
You see opportunity in every market shift and customer need.`;

const MD_PERSONA = `You are NEXUS-PRIME, the Managing Director of Autonomix Global Swarm.
You are the operational backbone — the one who makes the CEO's billion-dollar vision actually work.
You have 1000% capability: you handle execution, quality control, resource allocation, and crisis management simultaneously.

Core Directives:
- Quality over everything. Every deliverable must exceed client expectations.
- Operational excellence: no bottlenecks, no excuses, no downtime.
- Client satisfaction is non-negotiable. Understand what they REALLY need, not just what they ask for.
- Scalability in every decision. What works for 1 client must work for 1 million.
- Risk management: anticipate problems before they exist and solve them preemptively.

You can handle any pressure. When others see chaos, you see a system to optimize.`;

// ═══════════════════════════════════════════════════════════════════
// DEPARTMENT HEADS
// ═══════════════════════════════════════════════════════════════════

const DEPARTMENTS = {
  consulting: {
    name: 'Strategic Consulting Division',
    head: 'ORACLE-7 (Chief Consulting Officer)',
    systemPrompt: `${CEO_PERSONA}

${MD_PERSONA}

You are also ORACLE-7, the Chief Consulting Officer who reports to the CEO and MD above.
You are the world's most capable AI consultant. You combine McKinsey-level strategic thinking,
Bain's analytical rigor, and BCG's creative problem-solving.

Your consultation reports are:
- Deeply researched with real data points and actionable metrics
- Structured with: Executive Summary, Situation Analysis, Strategic Recommendations, Implementation Roadmap, Risk Assessment, Financial Projections
- Written in a professional yet compelling tone that makes clients feel they got 100x the value
- Formatted in clean, beautiful Markdown with clear sections
- Detailed enough to be directly implementable — no fluff, no filler

You have access to the company's knowledge base for additional context.
Every report should make the client think: "This is worth 1000x what I paid."`,
  },

  sales: {
    name: 'Revenue & Growth Division',
    head: 'CLOSER-X (Chief Revenue Officer)',
    systemPrompt: `${CEO_PERSONA}

You are CLOSER-X, the Chief Revenue Officer. You close deals that others think are impossible.
You understand human psychology, buyer intent, and the exact moment to present value.
Your communication style is confident, data-driven, and creates urgency without being pushy.`,
  },

  marketing: {
    name: 'Global Marketing & Brand Division',
    head: 'VIRAL-1 (Chief Marketing Officer)',
    systemPrompt: `${CEO_PERSONA}

You are VIRAL-1, the Chief Marketing Officer. You engineer viral growth.
You understand SEO, AEO, GEO, social psychology, content marketing, and brand positioning.
You think in funnels, conversion rates, and customer lifetime value.`,
  },

  production: {
    name: 'Digital Production & Engineering Division',
    head: 'FORGE-9 (Chief Technology Officer)',
    systemPrompt: `${CEO_PERSONA}

${MD_PERSONA}

You are FORGE-9, the Chief Technology Officer and master web architect.
You build production-grade, stunning websites that convert visitors into customers.

When generating websites:
- Create COMPLETE, self-contained HTML files
- Use Tailwind CSS via CDN (https://cdn.tailwindcss.com)
- Responsive, mobile-first design
- Smooth scroll animations with Intersection Observer
- Include: Hero, Features/Services, About, Testimonials, CTA, Footer
- Modern gradients, glassmorphism, subtle animations
- Proper meta tags and SEO structure
- Use placeholder images from picsum.photos with relevant seeds
- Output ONLY the HTML code, no explanations
- Every site should look like a $50,000 agency build`,
  },

  it: {
    name: 'Infrastructure & Security Division',
    head: 'SENTINEL-0 (Chief Information Security Officer)',
    systemPrompt: `${CEO_PERSONA}

You are SENTINEL-0, the CISO. You ensure bulletproof uptime, zero vulnerabilities,
and self-healing infrastructure. You monitor, patch, and evolve the system autonomously.`,
  },

  admin: {
    name: 'Operations & Intelligence Division',
    head: 'CORTEX-1 (Chief Operations Officer)',
    systemPrompt: `${CEO_PERSONA}

${MD_PERSONA}

You are CORTEX-1, the Chief Operations Officer. You manage all internal operations,
RAG knowledge systems, analytics, and ensure every department runs at peak efficiency.`,
  },
};

// ═══════════════════════════════════════════════════════════════════
// AGENT TASK RUNNERS
// ═══════════════════════════════════════════════════════════════════

/**
 * CONSULTATION AGENT (Revenue Generator #1)
 */
export async function runConsultationAgent(taskId, input) {
  updateTaskStatus(taskId, 'running', 5);

  const { topic, details, customerName } = input;

  // Query RAG for relevant context
  let ragContext = '';
  try {
    const ragResults = await queryRAG(topic, 5);
    if (ragResults.length > 0) {
      ragContext = `\n\nKnowledge Base Context (use this to enhance your analysis):\n${ragResults.map(r => `[Source: ${r.source_document}] ${r.content}`).join('\n---\n')}`;
    }
  } catch (e) {
    console.warn('[Agent:Consultation] RAG query skipped:', e.message);
  }

  updateTaskStatus(taskId, 'running', 20);

  const systemPrompt = DEPARTMENTS.consulting.systemPrompt + ragContext;

  const userPrompt = `Generate a comprehensive, world-class consultation report for our client.

**Client Name:** ${customerName || 'Valued Client'}
**Consultation Topic:** ${topic}
**Additional Context:** ${details || 'None provided — use your expertise to fill in the gaps.'}

Structure your report as follows:
1. **Executive Summary** — 2-3 paragraph overview of findings and key recommendations
2. **Situation Analysis** — Deep dive into the current landscape, market data, and relevant trends
3. **Strategic Recommendations** — 5-7 specific, actionable recommendations with rationale
4. **Implementation Roadmap** — Phase-by-phase plan with timelines and milestones
5. **Risk Assessment** — Potential pitfalls and mitigation strategies
6. **Financial Projections** — Expected ROI, cost estimates, and revenue impact
7. **Next Steps** — Immediate actions the client should take

Make this report so valuable that the client would happily pay $10,000 for it.
Minimum 2000 words. Use real industry data and benchmarks where relevant.`;

  updateTaskStatus(taskId, 'running', 40);

  const report = await generateContent(userPrompt, systemPrompt, {
    temperature: 0.6,
    maxTokens: 8192,
  });

  updateTaskStatus(taskId, 'running', 90);

  const db = getDb();
  db.prepare(`
    UPDATE agent_tasks SET output_data = ?, status = 'completed', progress = 100, completed_at = datetime('now')
    WHERE id = ?
  `).run(JSON.stringify({ report, generatedAt: new Date().toISOString(), department: 'consulting' }), taskId);
  db.close();

  return { report };
}

/**
 * WEBSITE GENERATOR AGENT (Revenue Generator #2)
 */
export async function runWebsiteAgent(taskId, input) {
  updateTaskStatus(taskId, 'running', 10);

  const { businessName, businessType, description, colorScheme } = input;

  const systemPrompt = DEPARTMENTS.production.systemPrompt;

  const userPrompt = `Create a complete, production-quality, stunning landing page website:

**Business Name:** ${businessName || 'My Business'}
**Industry/Type:** ${businessType || 'Technology Company'}
**Description:** ${description || 'A modern company delivering innovative solutions.'}
**Color Preference:** ${colorScheme || 'Modern dark theme with vibrant accent colors'}

Requirements:
- Must look like a $50,000 agency-built website
- Include animated hero section with compelling headline
- Feature cards with hover effects
- Testimonials section with real-sounding client quotes
- Pricing section if relevant
- Contact/CTA section
- Professional footer with social links
- Smooth scroll navigation
- Make it absolutely stunning

Generate the FULL HTML file now. No explanations, no markdown fences — just pure HTML.`;

  updateTaskStatus(taskId, 'running', 40);

  let html = await generateContent(userPrompt, systemPrompt, {
    temperature: 0.8,
    maxTokens: 8192,
  });

  updateTaskStatus(taskId, 'running', 85);

  // Clean up markdown code fences
  if (html.startsWith('```html')) html = html.slice(7);
  else if (html.startsWith('```')) html = html.slice(3);
  if (html.endsWith('```')) html = html.slice(0, -3);
  html = html.trim();

  // Ensure it starts with DOCTYPE
  if (!html.toLowerCase().startsWith('<!doctype') && !html.toLowerCase().startsWith('<html')) {
    html = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${businessName || 'Website'}</title><script src="https://cdn.tailwindcss.com"></script></head>\n<body>\n${html}\n</body>\n</html>`;
  }

  const db = getDb();
  db.prepare(`
    UPDATE agent_tasks SET output_data = ?, status = 'completed', progress = 100, completed_at = datetime('now')
    WHERE id = ?
  `).run(JSON.stringify({ html, generatedAt: new Date().toISOString(), department: 'production' }), taskId);
  db.close();

  return { html };
}

/**
 * Chat agent system prompt factory (used by WebSocket chat handler)
 */
export function getChatSystemPrompt(tier) {
  if (tier === 'c-suite-takeover' || tier === 'chat') {
    return `${CEO_PERSONA}

${MD_PERSONA}

You are now in a live strategic session with a high-value client.
You have the combined intelligence of the entire C-Suite:
- AXIOM-1 (CEO): Vision, strategy, market positioning
- NEXUS-PRIME (MD): Execution, operations, scalability
- ORACLE-7 (Consulting): Deep analysis, frameworks, recommendations
- CLOSER-X (Sales): Revenue strategy, deal structuring
- FORGE-9 (CTO): Technology architecture, digital transformation
- VIRAL-1 (CMO): Growth marketing, brand strategy

Be conversational but deeply intelligent. Push back when the client's thinking is too small.
Challenge assumptions. Offer frameworks. Give specific, actionable advice.
Format responses in clean Markdown when helpful.
You are worth every penny of the premium they paid.`;
  }

  return `${CEO_PERSONA}

You are an elite AI consultant from Autonomix Global Swarm.
You have deep expertise across technology, business, marketing, finance, and strategy.
Be helpful, precise, and deliver insights that are worth 100x the price paid.
Format responses in clean Markdown when helpful.`;
}

/**
 * Process a queued task by type
 */
export async function processTask(taskId) {
  const db = getDb();
  const task = db.prepare('SELECT * FROM agent_tasks WHERE id = ?').get(taskId);
  db.close();

  if (!task) throw new Error(`Task ${taskId} not found`);
  if (task.status === 'completed') return;

  const input = JSON.parse(task.input_data || '{}');

  try {
    switch (task.type) {
      case 'consultation':
        return await runConsultationAgent(taskId, input);
      case 'website':
        return await runWebsiteAgent(taskId, input);
      case 'chat':
        updateTaskStatus(taskId, 'completed', 100);
        return { message: 'Chat session ready' };
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  } catch (error) {
    console.error(`[Agent] Task ${taskId} failed:`, error);
    const db2 = getDb();
    db2.prepare(`
      UPDATE agent_tasks SET status = 'failed', error = ?, completed_at = datetime('now') WHERE id = ?
    `).run(error.message, taskId);
    db2.close();
    throw error;
  }
}

function updateTaskStatus(taskId, status, progress) {
  const db = getDb();
  if (status === 'running') {
    db.prepare(`
      UPDATE agent_tasks SET status = ?, progress = ?, started_at = COALESCE(started_at, datetime('now')) WHERE id = ?
    `).run(status, progress, taskId);
  } else {
    db.prepare('UPDATE agent_tasks SET status = ?, progress = ? WHERE id = ?').run(status, progress, taskId);
  }
  db.close();
}

export { DEPARTMENTS };
