import React, { useState, useMemo, useRef } from 'react';
import { SearchControls } from '../components/SearchControls';
import { PerFileBreakdown } from '../components/PerFileBreakdown';
import { VirtualizedFeed } from '../components/VirtualizedFeed';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { exportToTxt, exportToJson } from '../utils/exportUtils';
import { AlertCircle } from 'lucide-react';

export function InspectorSearch({ streamState, copyMemory, onNotify }) {
  const { items, streamStatus, isStreaming, isPaused, perFileCounts, metrics, error, startStream, pauseStream, resumeStream, stopEngine, clearStream } = streamState;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const mainInputRef = useRef(null);
  const filterInputRef = useRef(null);

  const filteredItems = useMemo(() => {
    let result = items;
    if (confidenceFilter !== 'ALL') {
      result = result.filter(item => item.confidence === confidenceFilter);
    }
    if (!filterQuery.trim()) return result;
    const q = filterQuery.toLowerCase();
    return result.filter(item =>
      (item.userOrEmail?.toLowerCase().includes(q)) ||
      (item.pass?.toLowerCase().includes(q)) ||
      (item.domain?.toLowerCase().includes(q)) ||
      (item.file?.toLowerCase().includes(q)) ||
      (item.raw?.toLowerCase().includes(q))
    );
  }, [items, filterQuery, confidenceFilter]);

  const handleStartSearch = () => { setSelectedIds(new Set()); startStream(searchQuery); };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleSelectAll = () => {
    setSelectedIds(selectedIds.size === filteredItems.length && filteredItems.length > 0 ? new Set() : new Set(filteredItems.map(i => i.id)));
  };

  const handleCopySelected = async () => {
    const selected = filteredItems.filter(i => selectedIds.has(i.id));
    if (selected.length === 0) return;
    const text = selected.map(i => `${i.userOrEmail}:${i.pass}`).join('\n');
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      for (const item of selected) copyMemory.copyRecord(item);
      onNotify?.(`Copied ${selected.length} credentials`, 'success');
    } catch { onNotify?.('Failed to copy', 'error'); }
  };

  const handleExportTxt = () => {
    const d = selectedIds.size > 0 ? filteredItems.filter(i => selectedIds.has(i.id)) : filteredItems;
    exportToTxt(d, `ulp_export_${Date.now()}.txt`);
    onNotify?.(`Exported ${d.length} records (.txt)`, 'success');
  };

  const handleExportJson = () => {
    const d = selectedIds.size > 0 ? filteredItems.filter(i => selectedIds.has(i.id)) : filteredItems;
    exportToJson(d, `ulp_export_${Date.now()}.json`);
    onNotify?.(`Exported ${d.length} records (.json)`, 'success');
  };

  const handleSelectFileFilter = (filename) => { 
    if (filterQuery === filename) {
      setFilterQuery(''); 
      onNotify?.(`Filter cleared`, 'info'); 
    } else {
      setFilterQuery(filename); 
      onNotify?.(`Filtered: ${filename}`, 'info'); 
    }
  };

  useKeyboardShortcuts({ mainSearchInputRef: mainInputRef, filterInputRef, onCancelStream: stopEngine, onSelectAll: handleSelectAll, isStreaming });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-5">
      <SearchControls
        searchQuery={searchQuery} setSearchQuery={setSearchQuery} onStartSearch={handleStartSearch}
        streamStatus={streamStatus} onPauseResume={isPaused ? resumeStream : pauseStream} onStopEngine={stopEngine}
        filterQuery={filterQuery} setFilterQuery={setFilterQuery} 
        confidenceFilter={confidenceFilter} setConfidenceFilter={setConfidenceFilter}
        totalItemsCount={items.length}
        filteredCount={filteredItems.length} selectedCount={selectedIds.size} onSelectAll={handleSelectAll}
        onCopySelected={handleCopySelected} onExportTxt={handleExportTxt} onExportJson={handleExportJson}
        onClear={clearStream} mainInputRef={mainInputRef} filterInputRef={filterInputRef}
      />

      <PerFileBreakdown 
        perFileCounts={perFileCounts} 
        totalMatches={metrics.totalMatches} 
        onSelectFileFilter={handleSelectFileFilter}
        activeFilter={filterQuery} 
      />

      {error && (
        <div className="mb-3 px-3 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-rose-300 font-mono-code text-xs animate-fade-up">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span><strong>Error:</strong> {error}</span>
        </div>
      )}

      <VirtualizedFeed
        items={filteredItems} selectedIds={selectedIds} onToggleSelect={handleToggleSelect}
        isCopied={copyMemory.isCopied} onCopy={copyMemory.copyRecord} isStreaming={isStreaming}
      />
    </div>
  );
}
