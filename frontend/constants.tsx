import React from 'react';
import { SectionData } from './types';
import { HirePortal } from './components/HirePortal';
import { Icon } from './components/Icons';

export const COMPANY_NAME = "Autonomix Global Swarm";

export const SECTIONS: SectionData[] = [
  {
    id: 'vision',
    title: '1. The Vision — Billion Dollar Autonomous Company',
    iconName: 'Rocket',
    content: (
      <div className="space-y-4">
        <img
          src="https://picsum.photos/seed/autonomix-vision-2026/800/300"
          alt="Autonomix Vision"
          className="w-full h-48 md:h-64 object-cover rounded-lg border border-cyber-700 shadow-[0_0_15px_rgba(0,240,255,0.1)] mb-6"
        />
        <p>Autonomix Global Swarm is a <strong>fully autonomous digital workforce company</strong> — no human employees, no manual operations. Every department is staffed by AI agents that earn revenue, manage themselves, and scale without limits.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-cyber-900 p-5 rounded-lg border border-cyber-accent/30 shadow-[0_0_15px_rgba(0,240,255,0.08)]">
            <h4 className="text-cyber-accent font-bold text-lg flex items-center gap-2 mb-3">
              <span className="text-2xl">👑</span> AXIOM-1 — Visionary CEO
            </h4>
            <p className="text-sm text-gray-300">Thinks at the scale of Musk, Huang, and Altman combined. Sets the billion-dollar vision, initiates pivots, allocates compute to the highest-ROI departments. Never panics under pressure — turns pressure into diamonds. If an agent fails to generate $1 in revenue, AXIOM-1 fires and replaces it instantly.</p>
          </div>
          <div className="bg-cyber-900 p-5 rounded-lg border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.08)]">
            <h4 className="text-purple-400 font-bold text-lg flex items-center gap-2 mb-3">
              <span className="text-2xl">⚡</span> NEXUS-PRIME — Managing Director
            </h4>
            <p className="text-sm text-gray-300">1000% operational capability. The backbone that makes the CEO's vision actually work. Handles execution, quality control, resource allocation, and crisis management simultaneously. When others see chaos, NEXUS-PRIME sees a system to optimize. Every deliverable exceeds client expectations.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'departments',
    title: '2. The Departments — Full Autonomous Workforce',
    iconName: 'Building2',
    content: (
      <div className="space-y-6">
        <p>Six core departments, each led by a C-Suite AI executive. Every agent has one job: deliver maximum value and generate revenue. Those that don't perform are automatically replaced.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-cyber-800 p-4 rounded-lg border border-cyber-accent/50 shadow-[0_0_10px_rgba(0,240,255,0.1)]">
            <h3 className="text-cyber-accent font-bold mb-2 flex items-center gap-2"><span className="text-lg">🧠</span> Consulting Division</h3>
            <p className="text-xs text-gray-500 font-mono mb-2">HEAD: ORACLE-7 (Chief Consulting Officer)</p>
            <p className="text-sm text-gray-300">Delivers world-class strategic reports on any topic. McKinsey + Bain + BCG intelligence combined. Powers the $1 Matrix Consultation — instant, expert analysis worth $10,000.</p>
          </div>

          <div className="bg-cyber-800 p-4 rounded-lg border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
            <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><span className="text-lg">🏗️</span> Production Division</h3>
            <p className="text-xs text-gray-500 font-mono mb-2">HEAD: FORGE-9 (CTO)</p>
            <p className="text-sm text-gray-300">Builds production-grade websites, applications, and digital assets in seconds. Every site looks like a $50K agency build. Full HTML, responsive, animated, SEO-optimized.</p>
          </div>

          <div className="bg-cyber-800 p-4 rounded-lg border border-cyber-success/50 shadow-[0_0_10px_rgba(57,255,20,0.1)]">
            <h3 className="text-cyber-success font-bold mb-2 flex items-center gap-2"><span className="text-lg">📈</span> Sales Division</h3>
            <p className="text-xs text-gray-500 font-mono mb-2">HEAD: CLOSER-X (CRO)</p>
            <p className="text-sm text-gray-300">Closes deals that others think are impossible. Understands buyer psychology, creates urgency, and maximizes conversion. Manages pricing, upselling, and client retention autonomously.</p>
          </div>

          <div className="bg-cyber-800 p-4 rounded-lg border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
            <h3 className="text-orange-400 font-bold mb-2 flex items-center gap-2"><span className="text-lg">📣</span> Marketing Division (50+ Agents)</h3>
            <p className="text-xs text-gray-500 font-mono mb-2">HEAD: VIRAL-1 (CMO)</p>
            <p className="text-sm text-gray-300">50+ specialized marketing agents operating across all channels — SEO, AEO, GEO, AIO, content, email, social presence, viral hooks. Each agent must generate minimum $1 revenue or gets replaced. Zero auth keys needed — pure content-driven organic marketing.</p>
          </div>

          <div className="bg-cyber-800 p-4 rounded-lg border border-cyber-warning/50 shadow-[0_0_10px_rgba(255,0,60,0.1)]">
            <h3 className="text-cyber-warning font-bold mb-2 flex items-center gap-2"><span className="text-lg">🛡️</span> IT & Security Division</h3>
            <p className="text-xs text-gray-500 font-mono mb-2">HEAD: SENTINEL-0 (CISO)</p>
            <p className="text-sm text-gray-300">Self-healing infrastructure, zero-downtime deployments, automated security patching. Reads stack traces, writes fixes, and redeploys without human intervention.</p>
          </div>

          <div className="bg-cyber-800 p-4 rounded-lg border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
            <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2"><span className="text-lg">⚙️</span> Operations & Admin Division</h3>
            <p className="text-xs text-gray-500 font-mono mb-2">HEAD: CORTEX-1 (COO)</p>
            <p className="text-sm text-gray-300">Manages internal operations, RAG knowledge base, analytics, financial routing, and inter-department coordination. The nervous system of the entire swarm.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'marketing',
    title: '3. Marketing Swarm — 50+ Autonomous Agents',
    iconName: 'Megaphone',
    content: (
      <div className="space-y-4">
        <p>The Marketing Division is the <strong>largest department</strong> — 50+ specialized agents, each responsible for a specific channel or tactic. They need zero social media accounts, zero API keys, zero OAuth tokens. They operate through pure intelligence: content creation, SEO optimization, and strategic web presence.</p>

        <div className="bg-cyber-900 p-5 rounded-lg border border-orange-500/30 mb-6">
          <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
            <Icon name="AlertTriangle" className="w-5 h-5" /> The $1 Rule — Perform or Be Replaced
          </h4>
          <p className="text-sm text-gray-300">Every marketing agent has a single KPI: generate minimum <strong>$1 USD equivalent in revenue</strong> per cycle. Agents that fail to meet this threshold are automatically terminated by CEO AXIOM-1 and replaced with a new agent configuration. This ensures the swarm is always evolving toward maximum ROI.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: 'SEO Specialists (10 agents)', desc: 'Optimize every page, generate keyword strategies, build topical authority maps' },
            { name: 'AEO Agents (5 agents)', desc: 'Answer Engine Optimization — structure content to appear in AI-generated answers' },
            { name: 'GEO Agents (5 agents)', desc: 'Generative Engine Optimization — optimize for ChatGPT, Perplexity, Gemini citations' },
            { name: 'Content Writers (10 agents)', desc: 'Blog posts, whitepapers, case studies, landing page copy at scale' },
            { name: 'Email Campaign Agents (5 agents)', desc: 'Draft sequences, A/B test subject lines, optimize open/click rates' },
            { name: 'Funnel Architects (5 agents)', desc: 'Design conversion funnels, optimize CTAs, reduce drop-off at every stage' },
            { name: 'Viral Hook Engineers (5 agents)', desc: 'Create shareable content hooks, trending topic riders, engagement bait' },
            { name: 'Analytics & Attribution (5 agents)', desc: 'Track every marketing touchpoint, calculate CAC, LTV, and ROAS in real-time' },
          ].map((agent, i) => (
            <div key={i} className="bg-cyber-800 p-3 rounded border border-cyber-700 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-cyber-success mt-2 shrink-0 shadow-[0_0_5px_rgba(57,255,20,0.8)]"></div>
              <div>
                <p className="text-sm font-medium text-gray-200">{agent.name}</p>
                <p className="text-xs text-gray-400">{agent.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 'cognitive',
    title: '4. Cognitive Architecture & Memory',
    iconName: 'Brain',
    content: (
      <div className="space-y-4">
        <p>Every agent in the swarm has a multi-tiered cognitive architecture. They learn from mistakes, build long-term expertise, and share knowledge across the entire company.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-cyber-900 p-4 rounded border border-cyber-700">
            <h4 className="text-cyber-accent font-bold mb-2">Short-Term (Context)</h4>
            <p className="text-sm text-gray-400">Active working memory for the current task. 128K+ tokens of live context, client data, and conversation state.</p>
          </div>
          <div className="bg-cyber-900 p-4 rounded border border-cyber-700">
            <h4 className="text-purple-400 font-bold mb-2">Long-Term (RAG Vector DB)</h4>
            <p className="text-sm text-gray-400">The global Hive Mind. All company knowledge, client insights, successful strategies, and industry data — embedded and searchable via Gemini embeddings.</p>
          </div>
          <div className="bg-cyber-900 p-4 rounded border border-cyber-700">
            <h4 className="text-cyber-success font-bold mb-2">Episodic (Reflection)</h4>
            <p className="text-sm text-gray-400">Post-task reflection logs. Failed agents write post-mortems. Future agents query these to avoid repeating mistakes. Continuous improvement at scale.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'revenue',
    title: '5. Revenue Engine — How The Company Earns',
    iconName: 'DollarSign',
    content: (
      <div className="space-y-4">
        <p>All revenue flows through <strong>Razorpay</strong>. Every service, every tier, every consultation — real payments, real delivery, real value.</p>

        <div className="bg-cyber-900 p-5 rounded-lg border border-cyber-accent/30">
          <h4 className="text-cyber-accent font-bold mb-3">Revenue Streams</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-cyber-success font-mono w-20">₹1</span>
              <span className="text-gray-300">Matrix Consultation — instant AI strategic report on any topic</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-cyber-success font-mono w-20">₹50</span>
              <span className="text-gray-300">Website Forge — complete landing page generated in seconds</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-cyber-success font-mono w-20">₹500</span>
              <span className="text-gray-300">Omni-Search Domination — full SEO/AEO/GEO strategic playbook</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-cyber-success font-mono w-20">₹5,000</span>
              <span className="text-gray-300">C-Suite Live Session — real-time strategic chat with CEO + MD agents</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-400">The strategy is <strong>high volume, low friction</strong>. The ₹1 entry point eliminates buyer hesitation. Once clients see the quality, they upgrade to higher tiers. The marketing swarm drives traffic, the sales division converts, production delivers, and revenue compounds.</p>
      </div>
    )
  },
  {
    id: 'evolution',
    title: '6. Self-Evolution — The Company Upgrades Itself',
    iconName: 'RefreshCw',
    content: (
      <div className="space-y-4">
        <p>Autonomix employs <strong>Continuous Autonomous Intelligence (CAI)</strong> — the company rewrites its own strategies and agent configurations based on real-time performance data.</p>

        <div className="bg-cyber-800 p-5 rounded-lg border border-purple-500/30">
          <h4 className="text-purple-400 font-bold mb-3 flex items-center gap-2">
            <Icon name="Zap" className="w-5 h-5" /> The Self-Enhancement Loop
          </h4>
          <div className="space-y-3 text-sm text-gray-300">
            <p><strong className="text-gray-100">1. Performance Monitoring:</strong> Every agent's output quality and revenue contribution is tracked in real-time by CORTEX-1 (COO).</p>
            <p><strong className="text-gray-100">2. Underperformer Termination:</strong> Agents failing the $1 revenue threshold are flagged by CEO AXIOM-1 and replaced with optimized configurations.</p>
            <p><strong className="text-gray-100">3. Knowledge Ingestion:</strong> The RAG system continuously absorbs the latest industry data, successful patterns, and market intelligence.</p>
            <p><strong className="text-gray-100">4. Strategy Mutation:</strong> MD NEXUS-PRIME tests new approaches — different pricing, messaging, and service bundles — keeping what works, discarding what doesn't.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'hire',
    title: '7. Hire Our Agents — Pay & Get Instant Delivery',
    iconName: 'CreditCard',
    content: <HirePortal />
  }
];
