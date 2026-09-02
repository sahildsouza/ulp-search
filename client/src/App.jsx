import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HardwareMonitorBar } from './components/HardwareMonitorBar';
import { SystemStatsDrawer } from './components/SystemStatsDrawer';
import { InspectorSearch } from './pages/InspectorSearch';
import { LogExplorer } from './pages/LogExplorer';
import { DomainAnalytics } from './pages/DomainAnalytics';
import { useSSEStream } from './hooks/useSSEStream';
import { useCopyMemory } from './hooks/useCopyMemory';
import { CheckCircle, XCircle, Info } from 'lucide-react';

const TOAST_ICON = {
  success: <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />,
  error: <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />,
  info: <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
};

const TOAST_CLS = {
  success: 'bg-emerald-950/95 text-emerald-300 border-emerald-500/30',
  error: 'bg-rose-950/95 text-rose-300 border-rose-500/30',
  info: 'bg-[#060a14] text-cyan-300 border-cyan-500/30'
};

export function App() {
  const [activeTab, setActiveTab] = useState('inspector');
  const [isStatsDrawerOpen, setIsStatsDrawerOpen] = useState(false);
  const [systemStats, setSystemStats] = useState(null);
  const [toast, setToast] = useState(null);

  const streamState = useSSEStream();
  const copyMemory = useCopyMemory();

  const notify = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(prev => (prev?.message === message ? null : prev)), 3000);
  }, []);

  // Poll system telemetry
  useEffect(() => {
    let live = true;
    const poll = async () => {
      try {
        const res = await fetch('/api/system-stats');
        if (res.ok && live) setSystemStats(await res.json());
      } catch {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { live = false; clearInterval(id); };
  }, []);

  const handleFilterByDomain = (domain) => {
    setActiveTab('inspector');
    streamState.startStream(domain);
    notify(`Searching: "${domain}"`, 'info');
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 flex flex-col">

      <Navbar
        activeTab={activeTab} setActiveTab={setActiveTab}
        streamStatus={streamState.streamStatus} metrics={streamState.metrics}
        systemStats={systemStats} onOpenStatsDrawer={() => setIsStatsDrawerOpen(true)}
      />

      <HardwareMonitorBar
        stats={systemStats} isStreaming={streamState.isStreaming}
        onOpenDrawer={() => setIsStatsDrawerOpen(true)}
      />

      <main className="flex-1 pb-10 sm:pb-14">
        {activeTab === 'inspector' && <InspectorSearch streamState={streamState} copyMemory={copyMemory} onNotify={notify} />}
        {activeTab === 'explorer' && <LogExplorer onNotify={notify} />}
        {activeTab === 'analytics' && <DomainAnalytics items={streamState.items} onFilterByDomain={handleFilterByDomain} />}
      </main>

      <SystemStatsDrawer isOpen={isStatsDrawerOpen} onClose={() => setIsStatsDrawerOpen(false)} stats={systemStats} />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 max-w-[88vw] sm:max-w-sm animate-fade-up">
          <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border backdrop-blur-md font-mono-code text-[11px] font-medium shadow-2xl ${TOAST_CLS[toast.type] || TOAST_CLS.info}`}>
            {TOAST_ICON[toast.type]}
            <span className="truncate">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
