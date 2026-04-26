import React, { useState, useEffect } from 'react';
import { Icon } from '../Icons';
import { RagManager } from './RagManager';
import { TaskQueue } from './TaskQueue';
import { TerminalLog } from '../TerminalLog';
import { GrowthChart } from '../GrowthChart';
import { FinanceDashboard } from './FinanceDashboard';
import { getDashboardStats, getPaymentHistory, clearAdminToken } from '../../api';
import { DashboardStats, PaymentRecord } from '../../types';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rag' | 'tasks' | 'financials' | 'finance'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [dashData, payData] = await Promise.all([
        getDashboardStats(),
        getPaymentHistory(),
      ]);
      setStats(dashData);
      setPayments(payData.payments || []);
    } catch (err) {
      console.error('Dashboard data load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    window.location.hash = '';
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-cyber-900 text-gray-100 font-sans selection:bg-cyber-accent selection:text-cyber-900 flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-cyber-700 bg-cyber-800 flex items-center justify-between px-6 shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded bg-cyber-warning/20 flex items-center justify-center border border-cyber-warning shadow-[0_0_10px_rgba(255,0,60,0.2)]">
            <Icon name="ShieldAlert" className="text-cyber-warning w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-tight">Autonomix Command Center</h1>
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">CEO AXIOM-1 • Root Access</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-1 bg-cyber-900 p-1 rounded-lg border border-cyber-700">
            {(['overview', 'rag', 'tasks', 'finance', 'financials'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === tab ? 'bg-cyber-800 text-cyber-accent shadow' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab === 'overview' ? 'Overview' : tab === 'rag' ? 'Knowledge Base' : tab === 'tasks' ? 'Tasks' : tab === 'finance' ? 'Tax & P&L' : 'Payments'}
              </button>
            ))}
          </nav>

          <button onClick={handleLogout} className="text-gray-500 hover:text-cyber-warning transition-colors" title="Logout">
            <Icon name="LogOut" className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto">

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                  label="Total Revenue"
                  value={stats ? `₹${stats.revenue.total_revenue_display}` : '...'}
                  sub={stats ? `${stats.revenue.successful_payments} payments` : ''}
                  icon="DollarSign" color="cyber-success"
                />
                <KPICard
                  label="Today's Revenue"
                  value={stats ? `₹${stats.revenue.today_revenue_display}` : '...'}
                  sub="Live"
                  icon="TrendingUp" color="cyber-accent"
                />
                <KPICard
                  label="Tasks Completed"
                  value={stats?.taskStats?.completed?.toString() || '0'}
                  sub={`${stats?.taskStats?.running || 0} running`}
                  icon="CheckCircle" color="cyber-success"
                />
                <KPICard
                  label="Knowledge Chunks"
                  value={stats?.ragStats?.total_chunks?.toString() || '0'}
                  sub={`${stats?.ragStats?.total_documents || 0} documents`}
                  icon="Brain" color="purple-400"
                />
                <KPICard
                  label="Failed Tasks"
                  value={stats?.taskStats?.failed?.toString() || '0'}
                  sub="Auto-retried by SENTINEL-0"
                  icon="AlertTriangle" color="cyber-warning"
                />
              </div>

              {/* Charts & Logs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-cyber-800 border border-cyber-700 rounded-lg p-5">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Icon name="Activity" className="w-5 h-5 text-cyber-accent" />
                    Live Swarm Telemetry
                  </h3>
                  <GrowthChart />
                </div>
                <div className="bg-cyber-800 border border-cyber-700 rounded-lg p-5">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Icon name="Terminal" className="w-5 h-5 text-cyber-accent" />
                    Global Execution Log
                  </h3>
                  <TerminalLog />
                </div>
              </div>

              {/* Recent Payments */}
              <div className="bg-cyber-800 border border-cyber-700 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-cyber-700 bg-cyber-900/50">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Icon name="CreditCard" className="w-5 h-5 text-gray-400" />
                    Recent Payments (Live)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-cyber-900/80 border-b border-cyber-700">
                      <tr>
                        <th className="px-4 py-3">Tier</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Agent</th>
                        <th className="px-4 py-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats?.recentPayments || []).map((p) => (
                        <tr key={p.id} className="border-b border-cyber-700/50 hover:bg-cyber-700/30">
                          <td className="px-4 py-3 font-medium text-gray-200">{p.tier_name}</td>
                          <td className="px-4 py-3 font-mono text-cyber-success">₹{(p.amount / 100).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-mono px-2 py-1 rounded ${
                              p.status === 'captured' ? 'bg-cyber-success/10 text-cyber-success' :
                              p.status === 'failed' ? 'bg-cyber-warning/10 text-cyber-warning' :
                              'bg-cyber-accent/10 text-cyber-accent'
                            }`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{p.agent_type || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                      {(!stats?.recentPayments || stats.recentPayments.length === 0) && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No payments yet. The swarm is warming up...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rag' && <RagManager />}
          {activeTab === 'tasks' && <TaskQueue />}
          {activeTab === 'finance' && <FinanceDashboard />}

          {activeTab === 'financials' && (
            <div className="space-y-6">
              <div className="bg-cyber-800 border border-cyber-700 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-cyber-700 bg-cyber-900/50 flex justify-between items-center">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Icon name="Wallet" className="w-5 h-5 text-gray-400" />
                    Full Payment History
                  </h3>
                  <span className="text-xs font-mono text-cyber-accent bg-cyber-accent/10 px-2 py-1 rounded">
                    Razorpay Live
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-cyber-900/80 border-b border-cyber-700">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Tier</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Currency</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Razorpay ID</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b border-cyber-700/50 hover:bg-cyber-700/30">
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.id.slice(0, 8)}...</td>
                          <td className="px-4 py-3 font-medium text-gray-200">{p.tier_name}</td>
                          <td className="px-4 py-3 font-mono text-cyber-success">₹{(p.amount / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-400">{p.currency}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-mono px-2 py-1 rounded ${
                              p.status === 'captured' ? 'bg-cyber-success/10 text-cyber-success' :
                              p.status === 'failed' ? 'bg-cyber-warning/10 text-cyber-warning' :
                              'bg-yellow-500/10 text-yellow-400'
                            }`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{p.customer_email || '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.razorpay_payment_id || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No transactions yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

// ─── KPI Card Component ────────────────────
const KPICard: React.FC<{ label: string; value: string; sub: string; icon: string; color: string }> = ({ label, value, sub, icon, color }) => (
  <div className="bg-cyber-800 border border-cyber-700 p-5 rounded-lg">
    <p className="text-gray-400 text-sm font-medium mb-1">{label}</p>
    <h3 className={`text-3xl font-mono font-bold text-${color}`}>{value}</h3>
    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
      <Icon name={icon} className={`w-3 h-3 text-${color}`} /> {sub}
    </p>
  </div>
);
