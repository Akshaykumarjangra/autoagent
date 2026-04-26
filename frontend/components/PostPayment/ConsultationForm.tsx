import React, { useState, useEffect } from 'react';
import { Icon } from '../Icons';
import { submitConsultation, getTaskStatus } from '../../api';

interface Props {
  taskId: string;
  tierName: string;
}

export const ConsultationForm: React.FC<Props> = ({ taskId, tierName }) => {
  const [step, setStep] = useState<'form' | 'processing' | 'done'>('form');
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    setError('');

    try {
      await submitConsultation(taskId, topic, details, customerName);
      pollStatus();
    } catch (err: any) {
      setError(err.message);
      setStep('form');
    }
  };

  const pollStatus = () => {
    const interval = setInterval(async () => {
      try {
        const status = await getTaskStatus(taskId);
        setProgress(status.progress || 0);

        if (status.status === 'completed') {
          clearInterval(interval);
          setReport(status.output?.report || 'Report generated successfully.');
          setStep('done');
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setError(status.error || 'Agent encountered an error');
          setStep('form');
        }
      } catch {
        // keep polling
      }
    }, 2000);
  };

  if (step === 'processing') {
    return (
      <div className="bg-cyber-800 border border-cyber-accent/30 rounded-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-cyber-accent/10 border border-cyber-accent flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(0,240,255,0.2)]">
          <Icon name="Brain" className="w-8 h-8 text-cyber-accent" />
        </div>
        <h3 className="text-xl font-bold text-gray-100 mb-2">Agents Are Working</h3>
        <p className="text-gray-400 text-sm mb-6">
          CEO AXIOM-1 and ORACLE-7 are generating your strategic report...
        </p>
        <div className="w-full bg-cyber-900 h-3 rounded-full overflow-hidden mb-3">
          <div
            className="bg-gradient-to-r from-cyber-accent to-purple-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs font-mono text-gray-500">{progress}% — Analyzing data, generating insights...</p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="space-y-6">
        <div className="bg-cyber-success/10 border border-cyber-success/30 rounded-lg p-4 flex items-center gap-3">
          <Icon name="CheckCircle" className="w-5 h-5 text-cyber-success" />
          <span className="text-cyber-success font-medium">Consultation Report Delivered by ORACLE-7</span>
        </div>
        <div className="bg-cyber-800 border border-cyber-700 rounded-lg p-6 prose prose-invert prose-cyan max-w-none overflow-auto max-h-[70vh]">
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(report) }} />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const blob = new Blob([report], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `autonomix-report-${Date.now()}.md`;
              a.click(); URL.revokeObjectURL(url);
            }}
            className="bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/50 px-4 py-2 rounded flex items-center gap-2 hover:bg-cyber-accent/20 transition-colors"
          >
            <Icon name="Download" className="w-4 h-4" /> Download Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cyber-800 border border-cyber-700 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <Icon name="Brain" className="w-6 h-6 text-cyber-accent" />
          {tierName} — Submit Your Query
        </h3>
        <p className="text-gray-400 text-sm mt-1">
          Our Consulting Division (led by ORACLE-7, reporting to CEO AXIOM-1) will generate a comprehensive strategic report.
        </p>
      </div>

      {error && (
        <div className="bg-cyber-warning/10 border border-cyber-warning text-cyber-warning text-sm p-3 rounded mb-4 flex items-center gap-2">
          <Icon name="AlertTriangle" className="w-4 h-4" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Your Name</label>
          <input
            type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
            className="w-full bg-cyber-900 border border-cyber-700 rounded px-4 py-3 text-gray-100 focus:outline-none focus:border-cyber-accent transition-all"
            placeholder="John Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Consultation Topic *</label>
          <input
            type="text" required value={topic} onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-cyber-900 border border-cyber-700 rounded px-4 py-3 text-gray-100 focus:outline-none focus:border-cyber-accent transition-all"
            placeholder="e.g., How to scale my SaaS from $10K to $100K MRR"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Additional Details</label>
          <textarea
            rows={4} value={details} onChange={(e) => setDetails(e.target.value)}
            className="w-full bg-cyber-900 border border-cyber-700 rounded px-4 py-3 text-gray-100 focus:outline-none focus:border-cyber-accent transition-all resize-none"
            placeholder="Tell us more about your situation, goals, constraints..."
          />
        </div>
        <button
          type="submit"
          className="w-full bg-cyber-accent text-cyber-900 font-bold py-3 rounded hover:bg-cyber-accent/90 transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
        >
          <Icon name="Zap" className="w-5 h-5" /> Activate Consulting Agent
        </button>
      </form>
    </div>
  );
};

// Simple markdown-to-HTML converter
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}
