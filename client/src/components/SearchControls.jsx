import React from 'react';
import { Search, Filter, Play, Pause, Square, CheckSquare, Copy, FileText, FileCode, Trash2, XCircle, Globe } from 'lucide-react';

export function SearchControls({
  searchQuery, setSearchQuery, onStartSearch, streamStatus,
  onPauseResume, onStopEngine, filterQuery, setFilterQuery,
  confidenceFilter, setConfidenceFilter,
  totalItemsCount, filteredCount, selectedCount,
  onSelectAll, onCopySelected, onExportTxt, onExportJson, onClear,
  mainInputRef, filterInputRef,
  searchDomainOnly = false, setSearchDomainOnly
}) {
  const isStreaming = streamStatus === 'streaming';
  const isPaused = streamStatus === 'paused';

  return (
    <div className="space-y-2.5 mb-4">

      {/* ── Row 1: Primary search ── */}
      <form onSubmit={(e) => { e.preventDefault(); onStartSearch(); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/70 pointer-events-none" />
          <input
            ref={mainInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchDomainOnly ? "Search domain only (e.g. example.com)..." : "Search query (e.g. gmail.com, admin, keyword)..."}
            className="w-full h-10 sm:h-11 pl-10 pr-16 bg-white/[0.03] border border-white/[0.07] rounded-lg text-[13px] text-white placeholder-zinc-600 font-mono-code focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="p-0.5 text-zinc-600 hover:text-zinc-400">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="hidden md:inline text-[9px] font-mono-code text-zinc-600 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded">/</kbd>
          </div>
        </div>

        {/* ── Domain-Only Toggle Button ── */}
        {setSearchDomainOnly && (
          <button
            type="button"
            onClick={() => setSearchDomainOnly(prev => !prev)}
            title={searchDomainOnly ? "Domain-only active: Only searches in domain (e.g. example.com:user:pass)" : "Click to search ONLY in domains (e.g. example.com)"}
            className={`h-10 sm:h-11 px-2.5 sm:px-3.5 rounded-lg text-[11px] sm:text-xs font-semibold font-mono-code flex items-center gap-1.5 flex-shrink-0 transition-all border ${
              searchDomainOnly
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_16px_rgba(6,182,212,0.35),inset_0_0_12px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/30'
                : 'bg-white/[0.03] text-zinc-400 border-white/[0.07] hover:text-zinc-200 hover:bg-white/[0.06]'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${searchDomainOnly ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] scale-105' : 'text-zinc-500'}`} />
            <span className="hidden xs:inline">Domain</span>
            <span className="hidden md:inline">Only</span>
          </button>
        )}

        <button
          type="submit"
          className="h-10 sm:h-11 px-4 sm:px-5 rounded-lg text-[11px] sm:text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-cyan-500 to-blue-600 text-black flex items-center gap-1.5 flex-shrink-0 shadow-[0_0_16px_rgba(6,182,212,0.25)] hover:shadow-[0_0_24px_rgba(6,182,212,0.4)] transition-shadow"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Stream</span>
          <span>Search</span>
        </button>
      </form>

      {/* ── Row 2: Filter + Actions ── */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">

        {/* Filter input */}
        <div className="relative flex-1 sm:max-w-sm">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-400/70 pointer-events-none" />
          <input
            ref={filterInputRef}
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter streamed results..."
            className="w-full h-8 pl-8 pr-10 bg-white/[0.03] border border-white/[0.05] rounded-md text-[11px] text-white placeholder-zinc-600 font-mono-code focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {filterQuery && (
              <button type="button" onClick={() => setFilterQuery('')} className="p-0.5 text-zinc-600 hover:text-zinc-400">
                <XCircle className="w-3 h-3" />
              </button>
            )}
            <kbd className="hidden md:inline text-[8px] font-mono-code text-zinc-600 bg-white/[0.04] border border-white/[0.06] px-1 py-px rounded">F</kbd>
          </div>
        </div>

        {/* Classification / Stream View Filter */}
        <div className="grid grid-cols-6 sm:flex items-center h-8 rounded-md border border-white/[0.06] overflow-hidden bg-white/[0.02] flex-shrink-0 text-[9px] sm:text-[10px] font-mono-code font-bold w-full sm:w-auto">
          <button 
            onClick={() => setConfidenceFilter('ALL')} 
            className={`flex items-center justify-center h-full transition-colors ${confidenceFilter === 'ALL' ? 'bg-white/[0.10] text-white' : 'text-zinc-500 hover:text-zinc-300'} px-1 sm:px-2.5`}
          >ALL</button>
          <button 
            onClick={() => setConfidenceFilter('EP')} 
            title="Email:Password"
            className={`flex items-center justify-center h-full border-l border-white/[0.06] transition-colors ${confidenceFilter === 'EP' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'} px-1 sm:px-2.5`}
          >E:P</button>
          <button 
            onClick={() => setConfidenceFilter('UP')} 
            title="Username:Password"
            className={`flex items-center justify-center h-full border-l border-white/[0.06] transition-colors ${confidenceFilter === 'UP' ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'} px-1 sm:px-2.5`}
          >U:P</button>
          <button 
            onClick={() => setConfidenceFilter('MP')} 
            title="Mobile:Password"
            className={`flex items-center justify-center h-full border-l border-white/[0.06] transition-colors ${confidenceFilter === 'MP' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-500 hover:text-zinc-300'} px-1 sm:px-2.5`}
          >M:P</button>
          <button 
            onClick={() => setConfidenceFilter('UK')} 
            title="Unknown / Malformed"
            className={`flex items-center justify-center h-full border-l border-white/[0.06] transition-colors ${confidenceFilter === 'UK' ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-500 hover:text-zinc-300'} px-1 sm:px-2.5`}
          >UK</button>
          <button 
            onClick={() => setConfidenceFilter('RAW')} 
            title="Full raw line without parsing"
            className={`flex items-center justify-center h-full border-l border-white/[0.06] transition-colors ${confidenceFilter === 'RAW' ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-500 hover:text-zinc-300'} px-1 sm:px-2.5`}
          >RAW</button>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-1.5 flex-wrap font-mono-code text-[10px] sm:text-[11px]">

          {(isStreaming || isPaused) && (
            <button
              onClick={onPauseResume}
              className={`h-7 px-2.5 rounded-md border font-semibold flex items-center gap-1 transition-colors ${
                isPaused ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white'
              }`}
            >
              {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}

          {isStreaming && (
            <button
              onClick={onStopEngine}
              className="h-7 px-2.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/25 font-semibold flex items-center gap-1 transition-colors hover:bg-rose-500/15"
            >
              <Square className="w-3 h-3 fill-current" />
              Stop
            </button>
          )}

          <span className="w-px h-4 bg-white/[0.06] hidden sm:block" />

          <button
            onClick={onSelectAll}
            disabled={filteredCount === 0}
            className="h-7 px-2 rounded-md bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-white disabled:opacity-30 flex items-center gap-1 transition-colors"
          >
            <CheckSquare className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Select All</span>
            <span className="sm:hidden">All</span>
          </button>

          <button
            onClick={onCopySelected}
            disabled={selectedCount === 0}
            className="h-7 px-2 rounded-md bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-white disabled:opacity-30 flex items-center gap-1 transition-colors"
          >
            <Copy className="w-3 h-3 text-emerald-400" />
            Copy{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>

          {/* Export buttons */}
          <div className="flex items-center h-7 rounded-md border border-white/[0.06] overflow-hidden bg-white/[0.02]">
            <button onClick={onExportTxt} disabled={filteredCount === 0} className="h-full px-2 flex items-center gap-1 text-zinc-400 hover:text-white disabled:opacity-30 border-r border-white/[0.06] transition-colors">
              <FileText className="w-3 h-3" />TXT
            </button>
            <button onClick={onExportJson} disabled={filteredCount === 0} className="h-full px-2 flex items-center gap-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors">
              <FileCode className="w-3 h-3" />JSON
            </button>
          </div>

          {totalItemsCount > 0 && (
            <button onClick={onClear} className="h-7 w-7 rounded-md bg-white/[0.03] border border-white/[0.05] text-zinc-500 hover:text-rose-400 hover:border-rose-500/25 flex items-center justify-center transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
