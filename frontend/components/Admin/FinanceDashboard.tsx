import React, { useState, useEffect } from 'react';
import { Icon } from '../Icons';

const API_BASE = '/api';

function getToken(): string {
  try { return sessionStorage.getItem('autonomix_admin_token') || ''; } catch { return ''; }
}

async function fetchFinance(path: string) {
  const res = await fetch(`${API_BASE}/finance${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

export const FinanceDashboard: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [gst, setGst] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'gst' | 'compliance'>('overview');

  useEffect(() => {
    Promise.all([
      fetchFinance('/report').catch(() => null),
      fetchFinance('/pnl').catch(() => null),
      fetchFinance('/gst-summary').catch(() => null),
      fetchFinance('/compliance-check').catch(() => null),
    ]).then(([r, p, g, c]) => {
      setReport(r);
      setPnl(p);
      setGst(g);
      setCompliance(c);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="Loader" className="w-8 h-8 text-cyber-accent animate-spin" />
        <span className="ml-3 text-gray-400">LEDGER-1 computing financials...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Icon name="Landmark" className="text-cyber-success" />
            Financial Command — LEDGER-1 (CFO)
          </h2>
          <p className="text-gray-400 text-sm mt-1">Autonomous tax regulation, GST compliance, P&L reporting</p>
        </div>
        <div className="flex items-center gap-2 bg-cyber-800 border border-cyber-success/30 px-4 py-2 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-cyber-success animate-pulse"></span>
          <span className="text-xs font-mono text-cyber-success">AUTO-COMPLIANT</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(['overview', 'gst', 'compliance'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeSubTab === tab ? 'bg-cyber-800 text-cyber-accent border border-cyber-accent/30' : 'text-gray-400 hover:text-gray-200 border border-transparent'
            }`}>
            {tab === 'overview' ? 'P&L Overview' : tab === 'gst' ? 'GST Filing' : 'Compliance'}
          </button>
        ))}
      </div>

      {/* P&L Overview */}
      {activeSubTab === 'overview' && pnl && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-cyber-800 border border-cyber-700 p-5 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Gross Revenue</p>
              <h3 className="text-2xl font-mono font-bold text-cyber-success">₹{pnl.revenue.gross_revenue.toFixed(2)}</h3>
              <p className="text-xs text-gray-500 mt-1">{pnl.metadata.total_transactions} transactions</p>
            </div>
            <div className="bg-cyber-800 border border-cyber-700 p-5 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">GST Collected</p>
              <h3 className="text-2xl font-mono font-bold text-yellow-400">₹{pnl.revenue.gst_collected.toFixed(2)}</h3>
              <p className="text-xs text-gray-500 mt-1">18% GST (CGST + SGST)</p>
            </div>
            <div className="bg-cyber-800 border border-cyber-700 p-5 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Net Revenue</p>
              <h3 className="text-2xl font-mono font-bold text-cyber-accent">₹{pnl.revenue.net_revenue.toFixed(2)}</h3>
              <p className="text-xs text-gray-500 mt-1">After GST deduction</p>
            </div>
            <div className="bg-cyber-800 border border-cyber-success/30 p-5 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Operating Profit</p>
              <h3 className={`text-2xl font-mono font-bold ${pnl.profit.operating_profit >= 0 ? 'text-cyber-success' : 'text-cyber-warning'}`}>
                ₹{pnl.profit.operating_profit.toFixed(2)}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{pnl.profit.net_profit_margin}% margin</p>
            </div>
          </div>

          {/* P&L Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-cyber-800 border border-cyber-700 rounded-lg p-5">
              <h3 className="text-lg font-semibold mb-4 text-cyber-success flex items-center gap-2">
                <Icon name="TrendingUp" className="w-5 h-5" /> Revenue
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Gross Revenue</span><span className="font-mono text-gray-200">₹{pnl.revenue.gross_revenue.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Less: GST Collected</span><span className="font-mono text-yellow-400">−₹{pnl.revenue.gst_collected.toFixed(2)}</span></div>
                <div className="border-t border-cyber-700 pt-2 flex justify-between font-bold"><span className="text-gray-200">Net Revenue</span><span className="font-mono text-cyber-accent">₹{pnl.revenue.net_revenue.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="bg-cyber-800 border border-cyber-700 rounded-lg p-5">
              <h3 className="text-lg font-semibold mb-4 text-cyber-warning flex items-center gap-2">
                <Icon name="TrendingDown" className="w-5 h-5" /> Expenses
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">GST Payable</span><span className="font-mono text-gray-200">₹{pnl.expenses.gst_payable.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Gemini API Costs</span><span className="font-mono text-gray-200">₹{pnl.expenses.api_costs.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Infrastructure</span><span className="font-mono text-gray-200">₹{pnl.expenses.infrastructure.toFixed(2)}</span></div>
                <div className="border-t border-cyber-700 pt-2 flex justify-between font-bold"><span className="text-gray-200">Total Expenses</span><span className="font-mono text-cyber-warning">₹{pnl.expenses.total_expenses.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          {/* Transaction Ledger */}
          {report?.ledger?.length > 0 && (
            <div className="bg-cyber-800 border border-cyber-700 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-cyber-700 bg-cyber-900/50">
                <h3 className="font-semibold flex items-center gap-2">
                  <Icon name="BookOpen" className="w-5 h-5 text-gray-400" />
                  Transaction Ledger (Auto-recorded by LEDGER-1)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-cyber-900/80 border-b border-cyber-700">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Gross (₹)</th>
                      <th className="px-4 py-3">Base (₹)</th>
                      <th className="px-4 py-3">GST (₹)</th>
                      <th className="px-4 py-3">CGST</th>
                      <th className="px-4 py-3">SGST</th>
                      <th className="px-4 py-3">Fiscal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.ledger.slice(0, 20).map((tx: any, i: number) => (
                      <tr key={i} className="border-b border-cyber-700/50 hover:bg-cyber-700/30">
                        <td className="px-4 py-3 text-gray-400 text-xs">{new Date(tx.transaction_date).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-200">{tx.tier_name}</td>
                        <td className="px-4 py-3 font-mono text-cyber-success">₹{tx.gross_amount.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-gray-300">₹{tx.base_amount.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-yellow-400">₹{tx.gst_total.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-gray-400">₹{tx.cgst.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-gray-400">₹{tx.sgst.toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{tx.fiscal_quarter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GST Filing Tab */}
      {activeSubTab === 'gst' && gst && (
        <div className="space-y-6">
          {/* Deadlines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(gst.deadlines).map((d: any, i: number) => (
              <div key={i} className="bg-cyber-800 border border-yellow-500/30 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-100">{d.name}</h4>
                  <span className="text-xs font-mono bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded">{d.status}</span>
                </div>
                <p className="text-sm text-gray-400 mb-2">{d.description}</p>
                <p className="text-sm font-mono text-cyber-accent">Due: {d.due_date}</p>
              </div>
            ))}
          </div>

          {/* Monthly GST Summary */}
          {gst.summary?.length > 0 && (
            <div className="bg-cyber-800 border border-cyber-700 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-cyber-700 bg-cyber-900/50">
                <h3 className="font-semibold flex items-center gap-2">
                  <Icon name="Calendar" className="w-5 h-5 text-gray-400" />
                  Monthly GST Summary
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-cyber-900/80 border-b border-cyber-700">
                    <tr>
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3">Gross (₹)</th>
                      <th className="px-4 py-3">Base (₹)</th>
                      <th className="px-4 py-3">Total GST</th>
                      <th className="px-4 py-3">CGST</th>
                      <th className="px-4 py-3">SGST</th>
                      <th className="px-4 py-3">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gst.summary.map((s: any, i: number) => (
                      <tr key={i} className="border-b border-cyber-700/50 hover:bg-cyber-700/30">
                        <td className="px-4 py-3 font-medium text-gray-200">{s.period}</td>
                        <td className="px-4 py-3 font-mono text-cyber-success">₹{s.total_gross.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-gray-300">₹{s.total_base.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-yellow-400">₹{s.total_gst.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-gray-400">₹{s.total_cgst.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-gray-400">₹{s.total_sgst.toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-400">{s.total_transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compliance Tab */}
      {activeSubTab === 'compliance' && compliance && (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border flex items-center gap-3 ${
            compliance.overall_status === 'compliant'
              ? 'bg-cyber-success/10 border-cyber-success/30'
              : 'bg-cyber-warning/10 border-cyber-warning/30'
          }`}>
            <Icon name={compliance.overall_status === 'compliant' ? 'ShieldCheck' : 'AlertTriangle'}
              className={`w-6 h-6 ${compliance.overall_status === 'compliant' ? 'text-cyber-success' : 'text-cyber-warning'}`} />
            <div>
              <p className={`font-bold ${compliance.overall_status === 'compliant' ? 'text-cyber-success' : 'text-cyber-warning'}`}>
                {compliance.overall_status === 'compliant' ? 'All Systems Compliant' : 'Action Required'}
              </p>
              <p className="text-xs text-gray-400">Last checked: {new Date(compliance.last_checked).toLocaleString()}</p>
            </div>
          </div>

          {compliance.checks.map((check: any, i: number) => (
            <div key={i} className={`bg-cyber-800 border rounded-lg p-5 ${
              check.priority === 'critical' ? 'border-cyber-warning/50' :
              check.priority === 'high' ? 'border-yellow-500/30' :
              'border-cyber-700'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-100">{check.name}</h4>
                <span className={`text-xs font-mono px-2 py-1 rounded ${
                  check.priority === 'critical' ? 'bg-cyber-warning/10 text-cyber-warning' :
                  check.priority === 'high' ? 'bg-yellow-500/10 text-yellow-400' :
                  check.priority === 'info' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-cyber-success/10 text-cyber-success'
                }`}>{check.status}</span>
              </div>
              {check.threshold && (
                <p className="text-xs text-gray-500 mb-1">Threshold: {check.threshold} | Current: {check.current}</p>
              )}
              <p className="text-sm text-gray-300">{check.action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
