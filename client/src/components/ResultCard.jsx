import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Check, ShieldCheck, AlertTriangle, AlertCircle, FileText, Globe, CopyCheck } from 'lucide-react';

const CONFIDENCE_MAP = {
  GREEN: { cls: 'badge-green', icon: ShieldCheck, label: 'RFC EMAIL', shortLabel: 'RFC' },
  YELLOW: { cls: 'badge-yellow', icon: AlertTriangle, label: 'FALLBACK', shortLabel: 'FLLB' },
  RED: { cls: 'badge-red', icon: AlertCircle, label: 'RAW', shortLabel: 'RAW' },
};

export function ResultCard({ item, isSelected, onToggleSelect, isExpanded, onToggleExpand, isCopied, onCopy }) {
  const [justCopied, setJustCopied] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const alreadyCopied = isCopied(item.id);

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
    const ok = await copyText(item.userOrEmail);
    if (ok) {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 1400);
    }
  };

  const handleCopyPass = async (e) => {
    e.stopPropagation();
    if (!item.pass) return;
    const ok = await copyText(item.pass);
    if (ok) {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 1400);
    }
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    const ok = await onCopy(item);
    if (ok) { setJustCopied(true); setTimeout(() => setJustCopied(false), 1500); }
  };

  const handleCopyRaw = async (e) => {
    e.stopPropagation();
    try { if (navigator.clipboard) await navigator.clipboard.writeText(item.raw); setCopiedRaw(true); setTimeout(() => setCopiedRaw(false), 1500); } catch {}
  };

  const toggleRaw = (e) => {
    e?.stopPropagation();
    onToggleExpand();
  };

  const conf = CONFIDENCE_MAP[item.confidence] || CONFIDENCE_MAP.RED;
  const ConfIcon = conf.icon;

  const hasDomain = item.domain && item.domain !== 'non-email' && item.domain !== 'unstructured';

  return (
    <div className={`group rounded-xl border transition-colors duration-150 ${
      isSelected
        ? 'bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
        : 'bg-obsidian-200/80 border-white/[0.04] hover:border-white/[0.08]'
    }`}>

      <div className="p-3 sm:p-3.5">

        {/* Row 1: Meta + Actions */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(item.id)}
              className="w-3.5 h-3.5 rounded flex-shrink-0"
            />
            <span className={`${conf.cls} inline-flex items-center gap-1 px-1.5 py-[2px] rounded text-[9px] font-bold font-mono-code tracking-wider uppercase flex-shrink-0`}>
              <ConfIcon className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">{conf.label}</span>
              <span className="sm:hidden">{conf.shortLabel}</span>
            </span>
            {hasDomain && (
              <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded bg-zinc-900/70 border border-zinc-800/60 text-[10px] text-zinc-500 font-mono-code truncate max-w-[120px] sm:max-w-[160px]">
                <Globe className="w-2.5 h-2.5 text-cyan-500/70 flex-shrink-0" />
                <span className="truncate">{item.domain}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-[2px] rounded bg-zinc-900/50 border border-zinc-800/50 text-[9px] text-zinc-600 font-mono-code truncate max-w-[100px]">
              <FileText className="w-2.5 h-2.5" />
              <span className="truncate">{item.file}</span>
            </span>
            <button
              onClick={toggleRaw}
              className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors ${
                isExpanded ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-white/[0.03] text-zinc-500 border-white/[0.05] hover:text-zinc-300'
              }`}
            >
              {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
            <button
              onClick={handleCopy}
              className={`h-7 px-2 rounded-md border flex items-center gap-1 text-[10px] font-mono-code font-semibold transition-all ${
                alreadyCopied
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : justCopied
                    ? 'bg-cyan-500 text-black border-cyan-400'
                    : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white hover:border-cyan-500/30'
              }`}
            >
              {alreadyCopied || justCopied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
              <span className="hidden xs:inline">{alreadyCopied || justCopied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Credentials (Click to Copy Individually) */}
        <div className="flex items-center flex-wrap gap-1 text-[13px] sm:text-sm font-mono-code leading-relaxed pt-0.5">
          {/* User / Email */}
          <button
            type="button"
            onClick={handleCopyUser}
            title="Click to copy email/username"
            className={`group/user inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-all select-all text-left ${
              copiedUser
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200 cursor-pointer active:scale-95'
            }`}
          >
            <span className="font-medium break-all">{item.userOrEmail}</span>
            {copiedUser ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-950/90 px-1 py-px rounded border border-emerald-500/30">
                <Check className="w-2.5 h-2.5" />
                <span>COPIED</span>
              </span>
            ) : (
              <Copy className="w-2.5 h-2.5 opacity-0 group-hover/user:opacity-60 transition-opacity flex-shrink-0" />
            )}
          </button>

          <span className="text-zinc-700 font-bold select-none px-0.5">:</span>

          {/* Password */}
          <button
            type="button"
            onClick={handleCopyPass}
            disabled={!item.pass}
            title={item.pass ? "Click to copy password" : "No password"}
            className={`group/pass inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-all select-all text-left ${
              !item.pass
                ? 'text-zinc-700 italic cursor-default'
                : copiedPass
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer active:scale-95'
            }`}
          >
            <span className="font-medium break-all">{item.pass || '—'}</span>
            {copiedPass ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-950/90 px-1 py-px rounded border border-emerald-500/30">
                <Check className="w-2.5 h-2.5" />
                <span>COPIED</span>
              </span>
            ) : (
              item.pass && <Copy className="w-2.5 h-2.5 opacity-0 group-hover/pass:opacity-60 transition-opacity flex-shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* Raw drawer */}
      {isExpanded && (
        <div className="px-3 sm:px-3.5 pb-3 pt-2 border-t border-white/[0.05]">
          <div className="flex items-center justify-between mb-1.5 text-[9px] text-zinc-600 font-mono-code uppercase tracking-wider">
            <span>Raw Line · {item.file}</span>
            <button onClick={handleCopyRaw} className="flex items-center gap-1 text-cyan-400/70 hover:text-cyan-300 transition-colors">
              {copiedRaw ? <CopyCheck className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
              <span>{copiedRaw ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="p-2 rounded-md bg-black border border-zinc-900 font-mono-code text-[11px] text-zinc-400 break-all select-all whitespace-pre-wrap leading-relaxed">
            {item.raw}
          </div>
        </div>
      )}
    </div>
  );
}
