import React, { useState } from 'react';
import { Icon } from '../Icons';
import { adminLogin } from '../../api';

interface AdminLoginProps {
  onSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await adminLogin(email);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cyber-900 flex items-center justify-center p-4 font-sans selection:bg-cyber-accent selection:text-cyber-900 relative"
      style={{
        backgroundImage: 'url(https://picsum.photos/seed/admin-bg-secure/1920/1080)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-cyber-900/90 backdrop-blur-sm"></div>

      <div className="relative max-w-md w-full bg-cyber-800/90 border border-cyber-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
        <div className="p-8 text-center border-b border-cyber-700 bg-cyber-900/50">
          <div className="w-16 h-16 mx-auto bg-cyber-accent/10 border border-cyber-accent rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,240,255,0.2)]">
            <Icon name="ShieldAlert" className="w-8 h-8 text-cyber-accent" />
          </div>
          <h2 className="text-2xl font-bold text-gray-100 tracking-tight">Autonomix Command Center</h2>
          <p className="text-sm text-gray-400 mt-2 font-mono">CEO AXIOM-1 Authorization Required</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Admin Email</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-cyber-900 border border-cyber-700 rounded px-4 py-3 text-gray-100 focus:outline-none focus:border-cyber-accent focus:ring-1 focus:ring-cyber-accent transition-all"
                placeholder="admin@example.com"
              />
            </div>

            {error && (
              <div className="bg-cyber-warning/10 border border-cyber-warning text-cyber-warning text-sm p-3 rounded flex items-start gap-2">
                <Icon name="AlertTriangle" className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cyber-accent text-cyber-900 font-bold py-3 px-4 rounded hover:bg-cyber-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              {isLoading ? (
                <><Icon name="Loader" className="w-5 h-5 animate-spin" /> Authenticating...</>
              ) : (
                'Verify Identity'
              )}
            </button>
          </form>
        </div>

        <div className="p-4 border-t border-cyber-700 bg-cyber-900/80 text-center">
          <p className="text-xs text-gray-500 font-mono">Protected by Autonomix Zero-Trust Protocol</p>
        </div>
      </div>
    </div>
  );
};
