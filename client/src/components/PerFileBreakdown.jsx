import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Layers } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

export function PerFileBreakdown({ perFileCounts = {}, totalMatches = 0, onSelectFileFilter, activeFilter = '' }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const files = Object.entries(perFileCounts).sort((a, b) => b[1] - a[1]);

  if (files.length === 0 && totalMatches === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.04] overflow-hidden mb-3 font-mono-code">

      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-10 px-3 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] text-left transition-colors"
      >
        <div className="flex items-center gap-2 text-[11px]">
          <Layers className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="font-bold text-white tracking-wide">PER-FILE BREAKDOWN</span>
          <span className="px-1.5 py-px rounded-full bg-cyan-500/[0.08] border border-cyan-500/20 text-[9px] text-cyan-300 font-semibold">
            {files.length} {files.length === 1 ? 'FILE' : 'FILES'}
          </span>
          <span className="text-zinc-500 hidden sm:inline">·</span>
          <span className="text-zinc-500 hidden sm:inline text-[11px]">
            Total: <strong className="text-zinc-300">{formatNumber(totalMatches)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1 text-zinc-500">
          <span className="text-[10px] hidden sm:inline">{isExpanded ? 'Collapse' : 'Expand'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Body */}
      {isExpanded && (
        <div className="p-2.5 sm:p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {files.map(([filename, count]) => {
              const pct = totalMatches > 0 ? ((count / totalMatches) * 100).toFixed(1) : '0.0';
              const isActive = activeFilter === filename;
              return (
                <div
                  key={filename}
                  onClick={() => onSelectFileFilter?.(filename)}
                  className={`p-2.5 rounded-lg border transition-all space-y-2 ${
                    isActive 
                      ? 'bg-cyan-500/10 border-cyan-500/40 ring-1 ring-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.1)]' 
                      : 'bg-white/[0.02] border-white/[0.04] hover:border-cyan-500/20'
                  } ${onSelectFileFilter ? 'cursor-pointer group' : ''}`}
                  title={onSelectFileFilter ? (isActive ? `Clear filter: ${filename}` : `Filter: ${filename}`) : filename}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="w-3 h-3 text-cyan-400/70 flex-shrink-0" />
                      <span className={`text-[11px] font-medium truncate transition-colors ${isActive ? 'text-cyan-300' : 'text-zinc-300 group-hover:text-cyan-300'}`}>
                        {filename}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-bold flex-shrink-0">{formatNumber(count)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-zinc-600">
                      <span>Share</span>
                      <span className="text-cyan-400 font-semibold">{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
