import React from 'react';
import { Cpu, HardDrive, Flame, Activity, Zap } from 'lucide-react';

export function HardwareMonitorBar({ stats, isStreaming, onOpenDrawer }) {
  const ram = stats?.ram || { usagePercent: 0 };
  const thermal = stats?.thermal || { currentTempC: 42, status: 'OPTIMAL' };
  const cpu = stats?.cpu || { usagePercent: 0 };

  const tempColor =
    thermal.currentTempC >= 70 ? 'text-rose-400 bg-rose-500/10 border-rose-500/25'
    : thermal.currentTempC >= 55 ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';

  const ramColor =
    ram.usagePercent > 85 ? 'bg-rose-500' : ram.usagePercent > 70 ? 'bg-amber-500' : 'bg-cyan-500';

  const metrics = [
    {
      icon: <HardDrive className="w-3 h-3 text-cyan-400" />,
      label: 'RAM',
      value: `${ram.usagePercent}%`,
      extra: (
        <div className="w-10 h-[3px] bg-zinc-800 rounded-full overflow-hidden ml-1 hidden sm:block">
          <div className={`h-full rounded-full ${ramColor}`} style={{ width: `${Math.min(100, ram.usagePercent)}%` }} />
        </div>
      )
    },
    {
      icon: <Flame className="w-3 h-3 text-amber-400" />,
      label: 'TEMP',
      value: (
        <span className={`px-1.5 py-px rounded border text-[10px] font-semibold leading-tight ${tempColor}`}>
          {thermal.currentTempC}°C
        </span>
      )
    },
    {
      icon: <Activity className="w-3 h-3 text-emerald-400" />,
      label: 'CPU',
      value: `${cpu.usagePercent}%`
    },
    {
      icon: <Cpu className="w-3 h-3 text-cyan-400" />,
      label: 'RG',
      value: (
        <span className={`px-1.5 py-px rounded border text-[10px] font-bold leading-tight ${
          isStreaming ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 animate-pulse' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
        }`}>
          {isStreaming ? '-j 8' : 'IDLE'}
        </span>
      )
    }
  ];

  return (
    <div className="w-full bg-obsidian-300/80 border-b border-white/[0.04] px-3 sm:px-5 lg:px-8 py-1.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">

        {/* Chipset badge */}
        <button
          onClick={onOpenDrawer}
          className="flex items-center gap-1.5 px-2 py-[3px] rounded-md bg-cyan-500/[0.08] border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/[0.12] transition-colors flex-shrink-0 max-w-[160px] sm:max-w-[260px]"
        >
          <Zap className="w-3 h-3 text-cyan-400 flex-shrink-0" />
          <span className="font-mono-code text-[10px] sm:text-[11px] font-bold truncate">{stats?.soc?.name || 'Local System'}</span>
        </button>

        {/* Metrics strip */}
        <div className="flex items-center gap-3 sm:gap-5 font-mono-code text-[10px] sm:text-[11px]">
          {metrics.map(({ icon, label, value, extra }, i) => (
            <div key={i} className="flex items-center gap-1">
              {icon}
              <span className="text-zinc-600 hidden sm:inline">{label}:</span>
              <span className="text-zinc-300 font-semibold">{value}</span>
              {extra}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
