import React, { useState, useEffect, useMemo } from 'react';
import { FolderSearch, FileText, RefreshCw, Trash2, Edit3, PlusCircle, Folder, Search, X } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

/* ── Shared Modal Shell ── */
function Modal({ isOpen, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      {children}
    </div>
  );
}

export function LogExplorer({ onNotify }) {
  const [logsData, setLogsData] = useState({ dir: '', files: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [fileFilter, setFileFilter] = useState('');
  const [selectedFileNames, setSelectedFileNames] = useState(new Set());
  const [renameModal, setRenameModal] = useState({ isOpen: false, oldName: '', newName: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, files: [] });
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/logs');
      if (res.ok) setLogsData(await res.json());
      else onNotify?.('Failed to fetch log files', 'error');
    } catch { onNotify?.('Error connecting to backend', 'error'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const filteredFiles = useMemo(() => {
    if (!fileFilter.trim()) return logsData.files;
    const q = fileFilter.toLowerCase();
    return logsData.files.filter(f => f.name.toLowerCase().includes(q));
  }, [logsData.files, fileFilter]);

  const handleToggleFileActive = async (filename, currentActive) => {
    try {
      const res = await fetch('/api/logs/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, active: !currentActive }) });
      if (res.ok) setLogsData(prev => ({ ...prev, files: prev.files.map(f => f.name === filename ? { ...f, isActive: !currentActive } : f) }));
    } catch { onNotify?.('Toggle failed', 'error'); }
  };

  const handleBulkToggleActive = async (active) => {
    try {
      const res = await fetch('/api/logs/bulk-toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filenames: logsData.files.map(f => f.name), active }) });
      if (res.ok) { setLogsData(prev => ({ ...prev, files: prev.files.map(f => ({ ...f, isActive: active })) })); onNotify?.(`All files ${active ? 'included' : 'excluded'}`, 'success'); }
    } catch { onNotify?.('Bulk toggle failed', 'error'); }
  };

  const handleToggleRowSelection = (name) => {
    setSelectedFileNames(prev => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });
  };

  const handleSelectAllRows = () => {
    setSelectedFileNames(selectedFileNames.size === filteredFiles.length ? new Set() : new Set(filteredFiles.map(f => f.name)));
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameModal.newName.trim()) return;
    try {
      const res = await fetch('/api/logs/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldName: renameModal.oldName, newName: renameModal.newName.trim() }) });
      const data = await res.json();
      if (res.ok) { onNotify?.(`Renamed to ${data.newName}`, 'success'); setRenameModal({ isOpen: false, oldName: '', newName: '' }); fetchLogs(); }
      else onNotify?.(data.error || 'Rename failed', 'error');
    } catch { onNotify?.('Rename request failed', 'error'); }
  };

  const handleDeleteSubmit = async () => {
    try {
      const res = await fetch('/api/logs/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filenames: deleteModal.files }) });
      if (res.ok) { onNotify?.(`Deleted ${deleteModal.files.length} file(s)`, 'success'); setDeleteModal({ isOpen: false, files: [] }); setSelectedFileNames(new Set()); fetchLogs(); }
    } catch { onNotify?.('Delete failed', 'error'); }
  };


  const totalLines = logsData.files.reduce((acc, f) => acc + (f.lineCount || 0), 0);
  const activeCount = logsData.files.filter(f => f.isActive).length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-5 space-y-3 font-mono-code text-xs">

      {/* ── Overview Header ── */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.015] border border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Folder className="w-3.5 h-3.5" />
            <span>Target Directory</span>
          </div>
          <p className="text-sm font-semibold text-white truncate max-w-xl">{logsData.dir || '~/logs/'}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {logsData.files.length} Files · {formatNumber(totalLines)} Lines · {activeCount} Active
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={fetchLogs} disabled={isLoading}
            className="h-8 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-300 hover:text-white flex items-center gap-1.5 text-[11px] transition-colors"
          >
            <RefreshCw className={`w-3 h-3 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3 h-3 text-zinc-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text" value={fileFilter} onChange={(e) => setFileFilter(e.target.value)}
            placeholder="Filter files..."
            className="w-full h-8 pl-7 pr-7 bg-white/[0.03] border border-white/[0.05] rounded-md text-[11px] text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
          {fileFilter && (
            <button onClick={() => setFileFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => handleBulkToggleActive(true)} className="h-7 px-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-medium text-[10px] transition-colors hover:bg-emerald-500/15">Include All</button>
          <button onClick={() => handleBulkToggleActive(false)} className="h-7 px-2.5 rounded-md bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-white text-[10px] transition-colors">Exclude All</button>
          {selectedFileNames.size > 0 && (
            <button onClick={() => setDeleteModal({ isOpen: true, files: Array.from(selectedFileNames) })} className="h-7 px-2.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-rose-400 font-medium flex items-center gap-1 text-[10px] transition-colors hover:bg-rose-500/15">
              <Trash2 className="w-3 h-3" />Delete ({selectedFileNames.size})
            </button>
          )}
          <button onClick={handleSelectAllRows} className="h-7 px-2.5 rounded-md bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-white text-[10px] transition-colors">
            {selectedFileNames.size === filteredFiles.length && filteredFiles.length > 0 ? 'Deselect' : 'Select All'}
          </button>
        </div>
      </div>

      {/* ── Mobile Card List ── */}
      <div className="block md:hidden space-y-2">
        {filteredFiles.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 rounded-lg bg-white/[0.015] border border-white/[0.04]">No log files found.</div>
        ) : (
          filteredFiles.map((file) => {
            const sel = selectedFileNames.has(file.name);
            return (
              <div key={file.name} className={`p-3 rounded-lg border transition-all ${sel ? 'bg-cyan-950/15 border-cyan-500/30' : 'bg-white/[0.015] border-white/[0.04]'}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input type="checkbox" checked={sel} onChange={() => handleToggleRowSelection(file.name)} className="w-3.5 h-3.5 rounded flex-shrink-0" />
                    <FileText className="w-3.5 h-3.5 text-cyan-400/70 flex-shrink-0" />
                    <span className="font-semibold text-white truncate text-[11px]">{file.name}</span>
                  </div>
                  <button onClick={() => handleToggleFileActive(file.name, file.isActive)}
                    className={`px-2 py-px rounded-full text-[9px] font-bold border flex-shrink-0 ${file.isActive ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-zinc-900 text-zinc-600 border-zinc-800'}`}>
                    {file.isActive ? 'ACTIVE' : 'OFF'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1.5 border-t border-white/[0.04]">
                  <span>{file.sizeFormatted} · <span className="text-emerald-400 font-semibold">{formatNumber(file.lineCount)} lines</span></span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setRenameModal({ isOpen: true, oldName: file.name, newName: file.name })} className="p-1 text-zinc-500 hover:text-cyan-300"><Edit3 className="w-3 h-3" /></button>
                    <button onClick={() => setDeleteModal({ isOpen: true, files: [file.name] })} className="p-1 text-zinc-500 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop Table ── */}
      <div className="hidden md:block overflow-x-auto rounded-xl bg-white/[0.01] border border-white/[0.04]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02] text-zinc-500 uppercase text-[10px] tracking-wider">
              <th className="p-3 w-10 text-center">
                <input type="checkbox" checked={filteredFiles.length > 0 && selectedFileNames.size === filteredFiles.length} onChange={handleSelectAllRows} className="w-3.5 h-3.5 rounded" />
              </th>
              <th className="p-3">File Name</th>
              <th className="p-3">Size</th>
              <th className="p-3">Lines</th>
              <th className="p-3">Modified</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {filteredFiles.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center text-zinc-600">No log files found.</td></tr>
            ) : (
              filteredFiles.map((file) => {
                const sel = selectedFileNames.has(file.name);
                return (
                  <tr key={file.name} className={`hover:bg-white/[0.02] transition-colors ${sel ? 'bg-cyan-950/10' : ''}`}>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={sel} onChange={() => handleToggleRowSelection(file.name)} className="w-3.5 h-3.5 rounded" />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-cyan-400/70 flex-shrink-0" />
                        <span className="font-semibold text-white">{file.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-zinc-400">{file.sizeFormatted}</td>
                    <td className="p-3 text-emerald-400 font-semibold">{formatNumber(file.lineCount)}</td>
                    <td className="p-3 text-zinc-600 text-[10px]">{new Date(file.lastModified).toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleToggleFileActive(file.name, file.isActive)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all ${file.isActive ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:text-zinc-400'}`}>
                        {file.isActive ? 'ACTIVE' : 'EXCLUDED'}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setRenameModal({ isOpen: true, oldName: file.name, newName: file.name })} className="w-7 h-7 rounded-md text-zinc-500 hover:text-cyan-300 hover:bg-white/[0.04] flex items-center justify-center transition-colors"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => setDeleteModal({ isOpen: true, files: [file.name] })} className="w-7 h-7 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-white/[0.04] flex items-center justify-center transition-colors"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Rename Modal ── */}
      <Modal isOpen={renameModal.isOpen}>
        <div className="w-full max-w-sm p-4 rounded-xl bg-[#060a14] border border-white/[0.06] shadow-2xl space-y-3.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Rename Log File</h3>
          <form onSubmit={handleRenameSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">New File Name</label>
              <input type="text" value={renameModal.newName} onChange={(e) => setRenameModal({ ...renameModal, newName: e.target.value })}
                className="w-full h-9 px-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500/50" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRenameModal({ isOpen: false, oldName: '', newName: '' })} className="h-8 px-4 rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white text-xs transition-colors">Cancel</button>
              <button type="submit" className="h-8 px-4 rounded-lg bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-colors">Rename</button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ── Delete Modal ── */}
      <Modal isOpen={deleteModal.isOpen}>
        <div className="w-full max-w-sm p-4 rounded-xl bg-[#060a14] border border-rose-500/20 shadow-2xl space-y-3.5">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Confirm Deletion</h3>
          <p className="text-[11px] text-zinc-400">Permanently delete {deleteModal.files.length} file(s)?</p>
          <div className="max-h-28 overflow-y-auto p-2 rounded-md bg-black border border-zinc-900 text-[10px] text-zinc-500 space-y-0.5">
            {deleteModal.files.map(f => <div key={f} className="truncate">· {f}</div>)}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteModal({ isOpen: false, files: [] })} className="h-8 px-4 rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white text-xs transition-colors">Cancel</button>
            <button onClick={handleDeleteSubmit} className="h-8 px-4 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition-colors">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
