import React, { useState, useEffect, useRef } from 'react';
import { AgentLog } from '../types';
import { Icon } from './Icons';

const ACTIONS = [
  "SENTINEL-0 patched memory leak in production (Self-Heal)",
  "SENTINEL-0 claimed ₹82K HackerOne bounty (Zero-Day found)",
  "Board_Debate: Consensus reached on API migration (3/4 agree)",
  "FORGE-9 deployed new landing page for client (Production)",
  "VIRAL-1 SEO agent achieved #1 ranking for target keyword",
  "CLOSER-X closed ₹15K enterprise contract via AI consultation",
  "ORACLE-7 generated premium consultation report (Consulting)",
  "CORTEX-1 ingested 850 new vectors into Hive Mind (RAG)",
  "GEO agent secured citation in ChatGPT for client query",
  "AXIOM-1 initiated strategic pivot to new vertical",
  "NEXUS-PRIME optimized agent allocation (MD override)",
  "LEDGER-1 auto-computed GST: CGST ₹0.08 + SGST ₹0.08",
  "Marketing agent fired for underperformance. Replacement spawned.",
  "AEO agent optimized FAQ schema for AI answer engines",
  "Email Campaign agent achieved 34% open rate (Viral Hook #47)",
  "Content Writer #7 published SEO blog post (2,400 words)",
  "Funnel Architect redesigned CTA — conversion up 12%",
  "LEDGER-1 recorded transaction in fiscal ledger (auto-tax)",
];

const AGENTS = [
  "AXIOM-1", "NEXUS-PM", "ORACLE-7", "FORGE-9", "CLOSER-X",
  "VIRAL-1", "SENTINEL", "CORTEX-1", "LEDGER-1",
  "SEO_03", "SEO_07", "AEO_01", "GEO_02", "AIO_04",
  "Writer_05", "Funnel_02", "Email_03", "Hook_01",
];

export const TerminalLog: React.FC = () => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateLog = (): AgentLog => {
      const isDuplication = Math.random() > 0.95;
      const isRevenue = Math.random() > 0.85;
      const isFired = Math.random() > 0.96;

      let action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      let status: AgentLog['status'] = 'info';
      let value = undefined;

      if (isDuplication) {
        action = "AXIOM-1: New marketing agent spawned (replacing underperformer)";
        status = 'success';
        value = "$1 threshold enforced";
      } else if (isFired) {
        action = `Marketing agent #${Math.floor(Math.random() * 50)} TERMINATED — revenue below $1`;
        status = 'warning';
        value = "CEO decision";
      } else if (isRevenue) {
        action = "Razorpay: Micro-Transaction Captured";
        status = 'success';
        value = `+₹${(Math.random() * 5000 + 1).toFixed(0)}`;
      }

      return {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        agentId: AGENTS[Math.floor(Math.random() * AGENTS.length)],
        action,
        status,
        value
      };
    };

    setLogs(Array.from({ length: 5 }, generateLog));

    const interval = setInterval(() => {
      setLogs(prev => [...prev, generateLog()].slice(-50));
    }, 2500);

    const handleRealRevenue = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setLogs(prev => {
        const newLogs = [...prev];
        newLogs.push({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString(),
          agentId: "LEDGER-1",
          action: `PAYMENT CAPTURED via ${detail.method} — Tax auto-filed`,
          status: 'success',
          value: `+₹${detail.amount}`
        });
        const dupes = Math.min(Math.floor(detail.amount / 100), 10);
        for (let i = 0; i < dupes; i++) {
          newLogs.push({
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toLocaleTimeString(),
            agentId: `Agent_${Math.floor(Math.random() * 9000) + 1000}`,
            action: "New agent deployed from revenue injection",
            status: 'success',
            value: "Capital allocated"
          });
        }
        return newLogs.slice(-50);
      });
    };

    window.addEventListener('agent-revenue', handleRealRevenue);
    return () => { clearInterval(interval); window.removeEventListener('agent-revenue', handleRealRevenue); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-cyber-900 border border-cyber-700 rounded-lg p-4 h-64 flex flex-col font-mono text-xs">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-cyber-700 text-cyber-accent">
        <div className="flex items-center gap-2">
          <Icon name="Terminal" className="w-4 h-4" />
          <span>SWARM_EXECUTION_LOG</span>
        </div>
        <span className="animate-pulse">● LIVE</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-2">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 items-start">
            <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
            <span className="text-purple-400 shrink-0 w-24 truncate">{log.agentId}</span>
            <span className={`flex-1 ${
              log.status === 'success' ? 'text-cyber-success' :
              log.status === 'warning' ? 'text-cyber-warning' : 'text-gray-300'
            }`}>
              {log.action}
              {log.value && <span className="ml-2 font-bold">{log.value}</span>}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
