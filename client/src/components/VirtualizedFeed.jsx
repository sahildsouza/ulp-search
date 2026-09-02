import React, { useRef, useCallback, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ResultCard } from './ResultCard';
import { Database, Loader2 } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

export function VirtualizedFeed({ items = [], selectedIds = new Set(), onToggleSelect, isCopied, onCopy, isStreaming }) {
  const parentRef = useRef(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpanded = useCallback((id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    getItemKey: (index) => items[index]?.id ?? index,
    gap: 6,
    overscan: 12
  });

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 sm:p-16 rounded-xl bg-white/[0.015] border border-white/[0.04] text-center min-h-[350px]">
        {isStreaming ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <h3 className="text-sm font-semibold text-white font-mono-code">INITIALIZING RG THREADS (-j 8)...</h3>
            <p className="text-xs text-zinc-500 max-w-xs">Streaming combo credentials over SSE from log files</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-cyan-400/60">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white font-mono-code">READY FOR INSPECTION</h3>
            <p className="text-xs text-zinc-500 max-w-sm">Enter a search query to stream unlimited ripgrep results across 1GB+ log files.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between text-[11px] font-mono-code text-zinc-500 px-0.5">
        <span>Showing <strong className="text-zinc-300">{formatNumber(items.length)}</strong> records</span>
        <span className="hidden sm:inline text-zinc-700">Virtual DOM windowing active</span>
      </div>

      {/* Scroll container */}
      <div
        ref={parentRef}
        className="h-[calc(100vh-250px)] sm:h-[calc(100vh-260px)] min-h-[380px] w-full overflow-auto rounded-xl bg-white/[0.01] border border-white/[0.04] p-1.5 sm:p-2"
      >
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = items[virtualRow.index];
            if (!item) return null;
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <ResultCard
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={onToggleSelect}
                  isExpanded={expandedIds.has(item.id)}
                  onToggleExpand={() => toggleExpanded(item.id)}
                  isCopied={isCopied}
                  onCopy={onCopy}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
