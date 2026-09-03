import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Check, Mail, User, Phone, HelpCircle, FileText, Globe, CopyCheck } from 'lucide-react';

const CONFIDENCE_MAP = {
  EP: { cls: 'badge-green', icon: Mail, label: 'EMAIL:PASS', shortLabel: 'E:P' },
  UP: { cls: 'badge-cyan', icon: User, label: 'USER:PASS', shortLabel: 'U:P' },
  MP: { cls: 'badge-amber', icon: Phone, label: 'MOBILE:PASS', shortLabel: 'M:P' },
  UK: { cls: 'badge-red', icon: HelpCircle, label: 'UNKNOWN', shortLabel: 'UK' },
  // Backward compatibility
  GREEN: { cls: 'badge-green', icon: Mail, label: 'EMAIL:PASS', shortLabel: 'E:P' },
  YELLOW: { cls: 'badge-cyan', icon: User, label: 'USER:PASS', shortLabel: 'U:P' },
  RED: { cls: 'badge-red', icon: HelpCircle, label: 'UNKNOWN', shortLabel: 'UK' },
};

export function ResultCard({ item, isSelected, onToggleSelect, isExpanded, onToggleExpand, isCopied, onCopy, isRawMode, copyMemory }) {
  const [justCopied, setJustCopied] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [justCopiedUser, setJustCopiedUser] = useState(false);
  const [justCopiedPass, setJustCopiedPass] = useState(false);

  const alreadyCopied = (typeof isCopied === 'function' && isCopied(item.id)) || (copyMemory?.isCopied?.(item.id));
  const isUserCopied = (copyMemory?.isUserCopied ? copyMemory.isUserCopied(item.id) : alreadyCopied) || justCopiedUser;
  const isPassCopied = (copyMemory?.isPassCopied ? copyMemory.isPassCopied(item.id) : alreadyCopied) || justCopiedPass;

  const copyText = async (text) => {
    if (!text) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyUser = async (e) => {
    e.stopPropagation();
    if (!item.userOrEmail) return;
    let ok = false;
    if (copyMemory?.copyUser) {
      ok = await copyMemory.copyUser(item);
    } else {
      ok = await copyText(item.userOrEmail);
    }
    if (ok) {
      setJustCopiedUser(true);
      setTimeout(() => setJustCopiedUser(false), 1400);
    }
  };

  const handleCopyPass = async (e) => {
    e.stopPropagation();
    if (!item.pass) return;
    let ok = false;
    if (copyMemory?.copyPass) {
      ok = await copyMemory.copyPass(item);
    } else {
      ok = await copyText(item.pass);
    }
    if (ok) {
      setJustCopiedPass(true);
      setTimeout(() => setJustCopiedPass(false), 1400);
    }
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    let ok = false;
    if (copyMemory?.copyRecord) {
      ok = await copyMemory.copyRecord(item);
    } else if (onCopy) {
      ok = await onCopy(item);
    }
    if (ok) { 
      setJustCopied(true); 
      setTimeout(() => setJustCopied(false), 1500); 
    }
  };

  const handleCopyRaw = async (e) => {
    e.stopPropagation();
    let ok = false;
    if (copyMemory?.copyRaw) {
      ok = await copyMemory.copyRaw(item);
    } else {
      ok = await copyText(item.raw);
    }
    if (ok) {
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 1500);
    }
  };

  const toggleRaw = (e) => {
    e?.stopPropagation();
    onToggleExpand();
  };

  // Full raw unparsed line view
  if (isRawMode) {
    const rawCopied = copiedRaw || alreadyCopied;
    return (
      <div className={`group rounded-lg border transition-colors duration-100 ${
        isSelected
          ? 'bg-cyan-950/20 border-cyan-500/40'
          : 'bg-obsidian-200/80 border-white/[0.04] hover:border-white/[0.08]'
      }`}>
        <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-[7px]">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(item.id)}
            className="w-3 h-3 rounded flex-shrink-0"
          />

          {/* Badge RAW */}
          <span className="badge-purple inline-flex items-center gap-0.5 px-1 py-px rounded text-[8px] font-bold font-mono-code tracking-wider uppercase flex-shrink-0">
            <FileText className="w-2 h-2" />
            <span>RAW</span>
          </span>

          {/* Full raw line without parsing */}
          <div className="flex-1 min-w-0 font-mono-code text-[11px] sm:text-[12px] leading-tight overflow-hidden">
            <span className="text-zinc-300 font-normal select-all truncate block break-all">
              {item.raw}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="hidden lg:inline-flex items-center gap-0.5 px-1 py-px rounded bg-zinc-900/40 border border-zinc-800/40 text-[8px] text-zinc-600 font-mono-code truncate max-w-[90px]">
              <FileText className="w-2 h-2" />
              <span className="truncate">{item.file}</span>
            </span>
            <button
              onClick={handleCopyRaw}
              title="Copy full raw line"
              className={`h-6 px-1.5 rounded border flex items-center gap-0.5 text-[9px] font-mono-code font-semibold transition-all ${
                rawCopied
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white hover:border-cyan-500/30'
              }`}
            >
              {rawCopied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
              <span className="hidden xs:inline">{rawCopied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const conf = CONFIDENCE_MAP[item.confidence] || CONFIDENCE_MAP[item.type] || CONFIDENCE_MAP.UK;
  const ConfIcon = conf.icon;

  const hasDomain = item.domain && item.domain !== 'non-email' && item.domain !== 'unstructured';

  return (
    <div className={`group rounded-lg border transition-colors duration-100 ${
      isSelected
        ? 'bg-cyan-950/20 border-cyan-500/40'
        : 'bg-obsidian-200/80 border-white/[0.04] hover:border-white/[0.08]'
    }`}>

      {/* ── Single compact row ── */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-[7px]">

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(item.id)}
          className="w-3 h-3 rounded flex-shrink-0"
        />

        {/* Badge */}
        <span className={`${conf.cls} inline-flex items-center gap-0.5 px-1 py-px rounded text-[8px] font-bold font-mono-code tracking-wider uppercase flex-shrink-0`}>
          <ConfIcon className="w-2 h-2" />
          <span>{conf.shortLabel}</span>
        </span>

        {/* Credentials inline with memory */}
        <div className="flex items-center gap-0.5 min-w-0 flex-1 font-mono-code text-[11px] sm:text-[12px] leading-tight overflow-hidden">
          <button
            type="button"
            onClick={handleCopyUser}
            title={isUserCopied ? "Email copied to memory (click to re-copy)" : "Click to copy email/username"}
            className={`inline-flex items-center gap-0.5 px-1 py-px rounded transition-all select-all text-left min-w-0 ${
              justCopiedUser
                ? 'bg-emerald-500/25 text-emerald-200 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.4)]'
                : isUserCopied
                  ? 'text-cyan-200/90 bg-cyan-500/10 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.25)] hover:bg-cyan-500/20 cursor-pointer'
                  : 'text-cyan-300 hover:bg-cyan-500/10 cursor-pointer active:scale-95'
            }`}
          >
            {isUserCopied && (
              <Check className={`w-2.5 h-2.5 text-emerald-400 flex-shrink-0 ${justCopiedUser ? 'animate-pulse' : ''}`} />
            )}
            <span className={`truncate ${isUserCopied ? 'font-semibold' : 'font-medium'}`}>{item.userOrEmail}</span>
          </button>

          <span className="text-zinc-700 font-bold select-none flex-shrink-0">:</span>

          <button
            type="button"
            onClick={handleCopyPass}
            disabled={!item.pass}
            title={!item.pass ? "No password" : isPassCopied ? "Password copied to memory (click to re-copy)" : "Click to copy password"}
            className={`inline-flex items-center gap-0.5 px-1 py-px rounded transition-all select-all text-left min-w-0 ${
              !item.pass
                ? 'text-zinc-700 italic cursor-default'
                : justCopiedPass
                  ? 'bg-emerald-500/25 text-emerald-200 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.4)]'
                  : isPassCopied
                    ? 'text-emerald-300/90 bg-emerald-500/10 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)] hover:bg-emerald-500/20 cursor-pointer'
                    : 'text-emerald-400 hover:bg-emerald-500/10 cursor-pointer active:scale-95'
            }`}
          >
            {isPassCopied && (
              <Check className={`w-2.5 h-2.5 text-emerald-400 flex-shrink-0 ${justCopiedPass ? 'animate-pulse' : ''}`} />
            )}
            <span className={`truncate ${isPassCopied ? 'font-semibold' : 'font-medium'}`}>{item.pass || '—'}</span>
          </button>

          {hasDomain && (
            <span className="hidden sm:inline-flex items-center gap-0.5 px-1 py-px rounded bg-zinc-900/50 border border-zinc-800/50 text-[9px] text-zinc-600 font-mono-code truncate max-w-[100px] ml-1 flex-shrink-0">
              <Globe className="w-2 h-2 text-cyan-500/50 flex-shrink-0" />
              <span className="truncate">{item.domain}</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="hidden lg:inline-flex items-center gap-0.5 px-1 py-px rounded bg-zinc-900/40 border border-zinc-800/40 text-[8px] text-zinc-600 font-mono-code truncate max-w-[80px]">
            <FileText className="w-2 h-2" />
            <span className="truncate">{item.file}</span>
          </span>
          <button
            onClick={toggleRaw}
            className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
              isExpanded ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-white/[0.03] text-zinc-500 border-white/[0.05] hover:text-zinc-300'
            }`}
          >
            {isExpanded ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
          </button>
          <button
            onClick={handleCopy}
            title={alreadyCopied ? "Record copied to memory (click to re-copy)" : "Copy record"}
            className={`h-6 px-1.5 rounded border flex items-center gap-0.5 text-[9px] font-mono-code font-semibold transition-all ${
              alreadyCopied
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : justCopied
                  ? 'bg-cyan-500 text-black border-cyan-400'
                  : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white hover:border-cyan-500/30'
            }`}
          >
            {alreadyCopied || justCopied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
          </button>
        </div>
      </div>

      {/* Raw drawer */}
      {isExpanded && (
        <div className="px-2 sm:px-2.5 pb-2 pt-1.5 border-t border-white/[0.05]">
          <div className="flex items-center justify-between mb-1 text-[8px] text-zinc-600 font-mono-code uppercase tracking-wider">
            <span>Raw · {item.file}</span>
            <button onClick={handleCopyRaw} className="flex items-center gap-0.5 text-cyan-400/70 hover:text-cyan-300 transition-colors">
              {copiedRaw ? <CopyCheck className="w-2 h-2 text-emerald-400" /> : <Copy className="w-2 h-2" />}
              <span>{copiedRaw ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="px-1.5 py-1 rounded bg-black border border-zinc-900 font-mono-code text-[10px] text-zinc-400 break-all select-all whitespace-pre-wrap leading-snug">
            {item.raw}
          </div>
        </div>
      )}
    </div>
  );
}
