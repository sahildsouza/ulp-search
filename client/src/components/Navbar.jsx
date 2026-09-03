import React from 'react';
import { Search, FolderSearch, BarChart3, Radio } from 'lucide-react';
import { formatNumber, formatSpeed } from '../utils/formatters';

const TAB_ITEMS = [
  { key: 'inspector', icon: Search, label: 'Inspector Search', shortLabel: 'Search' },
  { key: 'explorer', icon: FolderSearch, label: 'Log Explorer', shortLabel: 'Logs' },
  { key: 'analytics', icon: BarChart3, label: 'Domain Analytics', shortLabel: 'Analytics' }
];

export function Navbar({ activeTab, setActiveTab, streamStatus, metrics, systemStats, onOpenStatsDrawer }) {
  const isActive = streamStatus === 'streaming' || streamStatus === 'connecting';
  const isPaused = streamStatus === 'paused';

  const statusDotColor = isActive ? 'bg-cyan-400' : isPaused ? 'bg-amber-400' : streamStatus === 'completed' ? 'bg-emerald-400' : 'bg-zinc-600';
  const statusLabel = streamStatus === 'connecting' ? 'CONNECTING' : isActive ? 'LIVE' : isPaused ? 'PAUSED' : streamStatus.toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full bg-black/90 backdrop-blur-lg border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto h-14 sm:h-[60px] flex items-center justify-between px-3 sm:px-5 lg:px-8 gap-3">

        {/* ── Brand ── */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-obsidian-200 border border-cyan-500/25 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <Radio className={`w-4 h-4 text-cyan-400 ${isActive ? 'animate-pulse' : ''}`} />
            {(isActive || isPaused) && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className={`absolute inset-0 rounded-full ${statusDotColor} ${isActive ? 'animate-ping opacity-75' : ''}`} />
                <span className={`relative rounded-full h-2 w-2 ${statusDotColor}`} />
              </span>
            )}
          </div>
          <div className="hidden xs:block">
            <span className="text-[13px] sm:text-sm font-bold tracking-wide text-white font-mono-code leading-none">
              ULP<span className="text-cyan-400">.STREAM</span>
            </span>
            <p className="text-[10px] text-zinc-500 font-mono-code leading-tight hidden md:block mt-0.5">
              {systemStats?.os?.distro ? `${systemStats.os.distro} · High-Speed SSE` : 'High-Speed SSE Stream'}
            </p>
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <nav className="flex items-center gap-px bg-white/[0.03] p-[3px] rounded-lg border border-white/[0.04]">
          {TAB_ITEMS.map(({ key, icon: Icon, label, shortLabel }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`
                  flex items-center gap-1.5 px-2 sm:px-3 py-[6px] rounded-md text-[11px] sm:text-xs font-semibold
                  transition-all duration-150 whitespace-nowrap
                  ${active
                    ? 'bg-cyan-500/15 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.3)]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Right: Stream throughput / status (Clean, no redundant counts/temps) ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] font-mono-code text-[11px]">
            <span className={`flex items-center gap-1.5 font-semibold ${isActive ? 'text-cyan-300' : isPaused ? 'text-amber-300' : 'text-zinc-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`} />
              {statusLabel}
            </span>
            {(isActive || isPaused) && (
              <>
                <span className="w-px h-3 bg-white/[0.08]" />
                <span className="text-zinc-400">{formatSpeed(metrics.bytesPerSec)}</span>
                <span className="w-px h-3 bg-white/[0.08] hidden sm:block" />
                <span className="text-zinc-500 hidden sm:inline">
                  {formatNumber(metrics.matchesPerSec)}<span className="text-zinc-600">/s</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
