import React, { useState } from 'react';
import { Icon } from './Icons';
import { getFreePreview, captureLead, trackEvent } from '../api';

interface Props {
  onClose: () => void;
  onUpgrade: () => void;       // user clicks "get full report"
  onDismissWithEmail?: (email: string, topic: string) => void;
}

export const PreviewModal: React.FC<Props> = ({ onClose, onUpgrade }) => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const submitTopic = async () => {
    if (topic.trim().length < 10) {
      setError('Tell me a bit more — at least 10 characters about what you need strategy for.');
      return;
    }
    setError(null); setLoading(true);
    trackEvent('preview_requested', { topic_length: topic.length });
    try {
      const r = await getFreePreview(topic.trim());
      setPreview(r.preview);
      setRemaining(typeof r.remainingToday === 'number' ? r.remainingToday : null);
      trackEvent('preview_received');
    } catch (e: any) {
      setError(e.message || 'Could not generate preview. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email.'); return; }
    setError(null);
    try {
      await captureLead(email.trim(), 'preview_modal', topic.trim());
      setEmailSaved(true);
      trackEvent('lead_captured', { source: 'preview_modal' });
    } catch (e: any) {
      setError(e.message || 'Failed to save.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-cyber-800 border border-cyber-accent/40 rounded-lg max-w-2xl w-full my-8 shadow-[0_0_40px_rgba(0,240,255,0.15)]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-cyber-700">
          <div className="flex items-center gap-2 text-cyber-accent font-mono text-sm">
            <Icon name="Cpu" className="w-4 h-4" />
            <span>ORACLE-7 // FREE 200-WORD PREVIEW</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition" aria-label="Close">✕</button>
        </div>

        <div className="p-5">
          {!preview && (
            <>
              <p className="text-sm text-gray-400 mb-3">
                Drop your business question. ORACLE-7 returns a 200-word strategic teaser in ~10 seconds. Free, no signup. Full $1 report unlocks 10–20 more pages.
              </p>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. How can a 3-person SaaS targeting Indian SMBs reach ₹50L ARR in 12 months?"
                className="w-full h-28 bg-cyber-900 border border-cyber-700 rounded p-3 text-sm text-gray-200 placeholder-gray-600 focus:border-cyber-accent focus:outline-none resize-none font-mono"
                disabled={loading}
              />
              {error && <div className="text-cyber-warning text-xs mt-2">{error}</div>}
              <div className="flex justify-end mt-4">
                <button
                  onClick={submitTopic}
                  disabled={loading || topic.trim().length < 10}
                  className="bg-cyber-accent text-cyber-900 font-bold px-5 py-2.5 rounded hover:bg-cyber-accent/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? <><Icon name="Loader" className="w-4 h-4 animate-spin"/> ORACLE-7 thinking...</> : <>⚡ Generate Free Preview</>}
                </button>
              </div>
            </>
          )}

          {preview && (
            <>
              <div className="bg-cyber-900 border border-cyber-700 rounded p-4 max-h-80 overflow-y-auto whitespace-pre-wrap text-sm text-gray-200 leading-relaxed font-sans">
                {preview}
              </div>
              {remaining !== null && (
                <div className="text-xs text-gray-500 mt-2 font-mono">
                  Free previews remaining today (this device): {remaining}
                </div>
              )}

              <div className="mt-5 bg-cyber-900/60 border border-cyber-accent/40 rounded p-4">
                <div className="text-cyber-accent font-bold text-sm mb-1">Want the full report?</div>
                <p className="text-xs text-gray-400 mb-3">
                  Pay $1 in any crypto → get a 2,000+ word McKinsey-style report with executive summary, situation analysis, strategic recommendations, implementation roadmap, risk assessment & financial projections — same topic, generated in 30 seconds.
                </p>
                <button
                  onClick={() => { trackEvent('preview_to_paywall'); onUpgrade(); }}
                  className="w-full bg-cyber-success text-cyber-900 font-bold py-3 rounded hover:bg-cyber-success/90 transition flex items-center justify-center gap-2"
                >
                  ⚡ Get the full $1 report →
                </button>
              </div>

              {!emailSaved ? (
                <div className="mt-5 pt-4 border-t border-cyber-700">
                  <div className="text-xs text-gray-500 mb-2">Not ready? Get notified when we add new tiers.</div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="flex-1 bg-cyber-900 border border-cyber-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-cyber-accent focus:outline-none"
                    />
                    <button onClick={saveEmail} className="bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/50 px-4 rounded text-sm font-mono">
                      Save
                    </button>
                  </div>
                  {error && <div className="text-cyber-warning text-xs mt-2">{error}</div>}
                </div>
              ) : (
                <div className="mt-5 pt-4 border-t border-cyber-700 text-cyber-success text-xs font-mono">
                  ✓ Saved. We'll be in touch.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
