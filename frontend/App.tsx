import React, { useState, useEffect } from 'react';
import { SECTIONS, COMPANY_NAME } from './constants';
import { Icon } from './components/Icons';
import { TerminalLog } from './components/TerminalLog';
import { GrowthChart } from './components/GrowthChart';
import { AdminLogin } from './components/Admin/AdminLogin';
import { AdminDashboard } from './components/Admin/AdminDashboard';

const PublicApp: React.FC = () => {
  const [activeSectionId, setActiveSectionId] = useState<string>(SECTIONS[0].id);
  const activeSection = SECTIONS.find(s => s.id === activeSectionId) || SECTIONS[0];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-cyber-900 text-gray-100 font-sans selection:bg-cyber-accent selection:text-cyber-900">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-cyber-800 border-r border-cyber-700 flex flex-col h-auto md:h-screen sticky top-0 z-10">
        <div className="p-6 border-b border-cyber-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded bg-cyber-accent/20 flex items-center justify-center border border-cyber-accent shadow-[0_0_10px_rgba(0,240,255,0.2)]">
              <Icon name="Hexagon" className="text-cyber-accent w-5 h-5" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">{COMPANY_NAME}</h1>
          </div>
          <p className="text-xs text-gray-400 font-mono">Autonomous Digital Workforce</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSectionId(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-left transition-all duration-200 ${
                activeSectionId === section.id
                  ? 'bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                  : 'text-gray-400 hover:bg-cyber-700 hover:text-gray-200'
              }`}
            >
              <Icon name={section.iconName || 'Circle'} className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium truncate">{section.title}</span>
              {section.id === 'hire' && (
                <span className="ml-auto flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-success"></span>
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Trust Signals in Sidebar */}
        <div className="p-5 border-t border-cyber-700 bg-cyber-900/50">
           <p className="text-[10px] text-gray-500 font-mono mb-3 uppercase tracking-widest">Trusted By</p>
           <div className="flex flex-wrap gap-4 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
             <div className="flex items-center gap-1 text-xs font-bold"><Icon name="Box" className="w-4 h-4"/> NEXUS</div>
             <div className="flex items-center gap-1 text-xs font-bold"><Icon name="Triangle" className="w-4 h-4"/> APEX_AI</div>
             <div className="flex items-center gap-1 text-xs font-bold"><Icon name="Hexagon" className="w-4 h-4"/> QUANTUM</div>
           </div>
        </div>

        <div className="p-4 border-t border-cyber-700 bg-cyber-900">
           <div className="flex items-center justify-between text-xs font-mono text-gray-500">
             <span>SYSTEM STATUS</span>
             <span className="text-cyber-success flex items-center gap-1">
               <span className="w-2 h-2 rounded-full bg-cyber-success animate-pulse shadow-[0_0_5px_rgba(57,255,20,0.8)]"></span>
               ONLINE
             </span>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 border-b border-cyber-700 bg-cyber-800/50 backdrop-blur-sm flex items-center px-8 shrink-0">
          <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-3">
            <Icon name={activeSection.iconName || 'FileText'} className="text-cyber-accent w-5 h-5" />
            {activeSection.title}
          </h2>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 pb-24">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Document Content */}
            <div className="prose prose-invert prose-cyan max-w-none">
              {activeSection.content}
            </div>

            {/* Interactive "Explained Background Processes" Section */}
            <div className="mt-12 pt-8 border-t border-cyber-700">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Icon name="Eye" className="w-5 h-5 text-gray-400" />
                Live System Telemetry (Explained Processes)
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TerminalLog />
                <GrowthChart />
              </div>
            </div>

          </div>
        </div>

        {/* Hidden Admin Link in Footer */}
        <div className="absolute bottom-2 right-4 opacity-20 hover:opacity-100 transition-opacity">
          <button onClick={() => window.location.hash = '#admin'} className="text-gray-500 hover:text-cyber-accent flex items-center gap-1 text-xs font-mono">
            <Icon name="Lock" className="w-3 h-3" />
            Admin
          </button>
        </div>
      </main>

    </div>
  );
};

const App: React.FC = () => {
  const [route, setRoute] = useState(window.location.hash);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (route === '#admin') {
    if (!isAdminAuthenticated) {
      return <AdminLogin onSuccess={() => setIsAdminAuthenticated(true)} />;
    }
    return <AdminDashboard />;
  }

  return <PublicApp />;
};

export default App;
