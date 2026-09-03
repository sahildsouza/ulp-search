import React from 'react';
import { X, Cpu, HardDrive, Flame, Zap, ShieldCheck } from 'lucide-react';
import { formatBytes, formatDuration } from '../utils/formatters';

function StatRow({ label, children, className = '' }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${className}`}>
      <span className="text-zinc-500 text-[11px]">{label}</span>
      <span className="text-[11px] text-right">{children}</span>
    </div>
  );
}

function SectionCard({ icon, title, color = 'text-cyan-400', children }) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-1.5 ${color} font-semibold tracking-wider uppercase text-[10px]`}>
        {icon}
        <span>{title}</span>
      </div>
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 divide-y divide-white/[0.03]">
        {children}
      </div>
    </div>
  );
}

export function SystemStatsDrawer({ isOpen, onClose, stats }) {
  if (!isOpen) return null;

  const soc = stats?.soc || {};
  const ram = stats?.ram || {};
  const thermal = stats?.thermal || {};
  const engine = stats?.engine || {};

  const thermalStatusCls = thermal.currentTempC >= 70
    ? 'text-rose-400 bg-rose-500/10 border-rose-500/25'
    : thermal.currentTempC >= 55
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#050810] border-l border-white/[0.06] shadow-2xl flex flex-col animate-slide-in">

        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.06] bg-black/40 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/[0.08] border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white font-mono-code tracking-wide">SYSTEM TELEMETRY</h2>
              <p className="text-[9px] text-zinc-500 font-mono-code">{soc.name || 'Local'} · Diagnostics</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono-code">

          <SectionCard icon={<Zap className="w-3 h-3" />} title="System Architecture">
            <StatRow label="SoC"><span className="text-white font-semibold break-all text-right max-w-[240px]">{soc.name || 'Local Processor'}</span></StatRow>
            <StatRow label="Architecture"><span className="text-zinc-300">{soc.architecture || 'Unknown'}</span></StatRow>
            <StatRow label="Hardware Threads"><span className="text-cyan-300">{soc.hardwareThreads || 8} Threads</span></StatRow>
            <StatRow label="RG Threads"><span className="text-emerald-400 font-bold">8 (-j 8)</span></StatRow>
            {soc.detectedFrom && (
              <StatRow label="Source"><span className="text-zinc-500 text-[10px]">{soc.detectedFrom}</span></StatRow>
            )}
          </SectionCard>

          <SectionCard icon={<HardDrive className="w-3 h-3" />} title="RAM (/proc/meminfo)">
            <StatRow label="Installed"><span className="text-white font-semibold">{formatBytes(ram.totalBytes)}</span></StatRow>
            <StatRow label="Used"><span className="text-rose-300 font-semibold">{formatBytes(ram.usedBytes)} ({ram.usagePercent}%)</span></StatRow>
            <StatRow label="Available"><span className="text-emerald-300">{formatBytes(ram.availableBytes || ram.freeBytes)}</span></StatRow>
            <StatRow label="Source"><span className="text-zinc-500 text-[10px]">{ram.source || '/proc/meminfo'}</span></StatRow>
          </SectionCard>

          <SectionCard icon={<Flame className="w-3 h-3" />} title="Thermal Zones" color="text-amber-400">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
              <span className="text-zinc-500 text-[11px]">Status</span>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${thermalStatusCls}`}>
                {thermal.status || 'OPTIMAL'} · {thermal.currentTempC}°C
              </span>
            </div>
            {thermal.sensors?.length > 0 ? (
              thermal.sensors.map((s, i) => (
                <StatRow key={i} label={s.type}><span className="text-amber-300 font-semibold">{s.tempC}°C</span></StatRow>
              ))
            ) : (
              <div className="text-zinc-600 text-center py-3 text-[10px]">No thermal sensors detected</div>
            )}
          </SectionCard>

          <SectionCard icon={<ShieldCheck className="w-3 h-3" />} title="Ripgrep Engine" color="text-emerald-400">
            <StatRow label="Flags"><span className="text-cyan-300 text-[10px]">-i --no-line-number --mmap -j 8</span></StatRow>
            <StatRow label="Status">
              <span className={engine.activeRgSearch ? 'text-cyan-300 font-bold animate-pulse' : 'text-zinc-500'}>
                {engine.activeRgSearch ? `ACTIVE (PID ${engine.pid})` : 'IDLE'}
              </span>
            </StatRow>
            <StatRow label="Backpressure"><span className="text-emerald-300 text-[10px]">Fastify Stream Drain Guard</span></StatRow>
          </SectionCard>
        </div>

        {/* Footer */}
        <div className="h-10 flex items-center justify-center border-t border-white/[0.06] bg-black/40 text-[10px] text-zinc-600 font-mono-code flex-shrink-0">
          Uptime: {formatDuration((stats?.uptimeSeconds || 0) * 1000)} · Node.js Fastify SSE
        </div>
      </div>
    </div>
  );
}
