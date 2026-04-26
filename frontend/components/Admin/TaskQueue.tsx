import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../Icons';
import { listTasks } from '../../api';
import { AgentTask } from '../../types';

export const TaskQueue: React.FC = () => {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, running: 0, completed: 0, failed: 0 });
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      const data = await listTasks(100, 0, filter || undefined);
      setTasks(data.tasks || []);
      setCounts(data.counts || { total: 0, pending: 0, running: 0, completed: 0, failed: 0 });
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-cyber-success bg-cyber-success/10';
      case 'running': return 'text-cyber-accent bg-cyber-accent/10';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'failed': return 'text-cyber-warning bg-cyber-warning/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'consultation': return 'Consulting';
      case 'website': return 'Production';
      case 'chat': return 'C-Suite Chat';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Icon name="ListTodo" className="text-cyber-accent" />
            Agent Task Queue
          </h2>
          <p className="text-gray-400 text-sm mt-1">Real-time view of all agent jobs across departments</p>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'text-gray-100', filterVal: '' },
          { label: 'Pending', value: counts.pending, color: 'text-yellow-400', filterVal: 'pending' },
          { label: 'Running', value: counts.running, color: 'text-cyber-accent', filterVal: 'running' },
          { label: 'Completed', value: counts.completed, color: 'text-cyber-success', filterVal: 'completed' },
          { label: 'Failed', value: counts.failed, color: 'text-cyber-warning', filterVal: 'failed' },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => setFilter(s.filterVal)}
            className={`bg-cyber-800 border ${filter === s.filterVal ? 'border-cyber-accent' : 'border-cyber-700'} p-4 rounded-lg text-center transition-colors hover:border-cyber-accent/50`}
          >
            <div className={`text-2xl font-mono font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Task Table */}
      <div className="bg-cyber-800 border border-cyber-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-cyber-900/80 border-b border-cyber-700">
              <tr>
                <th className="px-4 py-3">Task ID</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-cyber-700/50 hover:bg-cyber-700/30">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{task.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 font-medium text-gray-200">{typeLabel(task.type)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono px-2 py-1 rounded ${statusColor(task.status)}`}>
                      {task.status === 'running' && <Icon name="Loader" className="w-3 h-3 animate-spin inline mr-1" />}
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-cyber-900 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            task.status === 'completed' ? 'bg-cyber-success' :
                            task.status === 'failed' ? 'bg-cyber-warning' : 'bg-cyber-accent'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-mono">{task.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(task.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{task.completed_at ? new Date(task.completed_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-cyber-warning text-xs max-w-[200px] truncate">{task.error || '—'}</td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {loading ? 'Loading...' : 'No tasks yet. Revenue will trigger agent jobs.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
