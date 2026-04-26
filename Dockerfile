# ═══════════════════════════════════════════════
# Autonomix Global Swarm — Production Dockerfile
# ═══════════════════════════════════════════════

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
# Repo uses npm workspaces (no per-package lockfile), so use npm install
RUN npm install --ignore-scripts --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine AS production
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy backend
COPY backend/package.json backend/package-lock.json* ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev --no-audit --no-fund

COPY backend/ ./

# Create data and uploads directories
RUN mkdir -p data uploads

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Set environment
ENV NODE_ENV=production
ENV API_BACKEND_HOST=0.0.0.0
ENV API_BACKEND_PORT=5000

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start server
# In production (Coolify), env vars are injected by the platform — no .env.local on disk.
# The startup script loads .env.local only if present (useful for local docker run).
CMD ["sh", "-c", "if [ -f .env.local ]; then node --env-file=.env.local server.js; else node server.js; fi"]
