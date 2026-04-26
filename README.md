# Autonomix Global Swarm — Enterprise Edition

A fully autonomous digital workforce company powered by AI agents. Every department — Marketing (50+ agents), Sales, Production, IT, Admin, Consulting, and Finance — operates without human intervention, earns revenue through Razorpay, and self-optimizes continuously.

## Executive Team (AI Agents)

- **AXIOM-1** — Visionary CEO. Sets billion-dollar strategy, fires underperforming agents.
- **NEXUS-PRIME** — Managing Director. 1000% operational capability. Makes the vision work.
- **ORACLE-7** — Chief Consulting Officer. McKinsey-level strategic reports.
- **FORGE-9** — CTO. Builds $50K-quality websites in seconds.
- **CLOSER-X** — Chief Revenue Officer. Closes deals autonomously.
- **VIRAL-1** — CMO. Commands 50+ marketing agents across all channels.
- **SENTINEL-0** — CISO. Self-healing infrastructure, zero-downtime.
- **CORTEX-1** — COO. RAG knowledge base, analytics, operations.
- **LEDGER-1** — CFO. Auto-computes GST, generates P&L, ensures tax compliance.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp backend/.env.example backend/.env.local
# Edit backend/.env.local with your:
#   - GEMINI_API_KEY (from https://aistudio.google.com/apikey)
#   - RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET (from https://dashboard.razorpay.com)
#   - ADMIN_EMAIL (your email for admin access)
#   - JWT_SECRET (any strong random string)

# 3. Run in development
npm run dev
```

## Production Deployment (Single VPS)

### Option A: Docker (Recommended)

```bash
docker compose up -d --build
```

### Option B: PM2

```bash
cd frontend && npm run build && cd ..
pm2 start ecosystem.config.cjs
```

## Revenue Services

| Tier | Price | Agent | Service |
|------|-------|-------|---------|
| Matrix Consultation | ₹1 | ORACLE-7 | 2000+ word strategic report on any topic |
| Website Forge | ₹50 | FORGE-9 | Complete responsive landing page |
| Omni-Search Domination | ₹500 | Full C-Suite | SEO/AEO/GEO strategic playbook |
| C-Suite Live Session | ₹5,000 | AXIOM-1 + NEXUS-PRIME | Real-time strategic chat |

## Admin Dashboard

Access at `/#admin` with your configured admin email. Features:

- Real-time payment history (Razorpay live data)
- Agent task queue (pending/running/completed/failed)
- RAG Knowledge Base management (upload, embed, query)
- Financial P&L with auto-computed GST (LEDGER-1)
- Tax compliance monitoring (GST registration, advance tax, audit thresholds)

## Architecture

```
Frontend (React + Vite + Tailwind)
    ↓ Razorpay Checkout
Backend (Express + SQLite)
    ├── /api/payments  → Razorpay order creation, verification, webhooks
    ├── /api/agents    → Consultation, website gen, task polling
    ├── /api/finance   → Auto-tax, GST, P&L, compliance
    ├── /api/rag       → Document upload, embedding, vector search
    ├── /api/analytics → Dashboard stats, event tracking
    ├── /ws-chat       → Live Gemini streaming chat
    └── /api-proxy     → Vertex AI Studio proxy (optional)
```
