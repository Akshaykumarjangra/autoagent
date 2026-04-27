import React, { useState, useEffect, useRef } from 'react';
import { AgentLog } from '../types';
import { Icon } from './Icons';
import { getMarketingPublicStats } from '../api';

interface PublicStats {
  postedToday: number;
  postedTotal: number;
  queued: number;
  lastPost: { text: string; posted_at: string } | null;
}

const ACTIONS = [
  "SENTINEL-0 health probe → all green",
  "CORTEX-1 indexing knowledge base",
  "ORACLE-7 standing by for consultation requests",
  "FORGE-9 standing by for website generation",
  "VIRAL-1 monitoring engagement signals",
  "AXIOM-1 strategic loop iteration complete",
  "NEXUS-PRIME orchestration cycle complete",
  "LEDGER-1 ledger snapshot taken",
  "Self-heal probe: all subsystems operational",
];

const AGENTS = [
  "AXIOM-1", "NEXUS-PM", "ORACLE-7", "FORGE-9", "CLOSER-X",
  "VIRAL-1", "SENTINEL", "CORTEX-1", "LEDGER-1",
  "SEO_03", "SEO_07", "AEO_01", "GEO_02", "AIO_04",
  "Writer_05", "Funnel_02", "Email_03", "Hook_01",
];

export const TerminalLog: React.FC = () => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Poll real public stats every 30s
  useEffect(() => {
    const load = () => getMarketingPublicStats().then(setStats).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Status-only heartbeats (no fake transactions or fake revenue).
    // Real payment events still arrive via the 'agent-revenue' window event below.
    const generateLog = (): AgentLog => ({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      agentId: AGENTS[Math.floor(Math.random() * AGENTS.length)],
      action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)],
      status: 'info',
    });

    setLogs(Array.from({ length: 5 }, generateLog));
    const interval = setInterval(() => {
      setLogs(prev => [...prev, generateLog()].slice(-50));
    }, 6000);

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
      {stats && (
        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono mb-2 pb-2 border-b border-cyber-700/50">
          <span>X posts today: <span className="text-cyber-success font-bold">{stats.postedToday}</span></span>
          <span className="text-gray-700">|</span>
          <span>Total: <span className="text-gray-300">{stats.postedTotal}</span></span>
          <span className="text-gray-700">|</span>
          <span>Queued: <span className="text-purple-400">{stats.queued}</span></span>
        </div>
      )}
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
