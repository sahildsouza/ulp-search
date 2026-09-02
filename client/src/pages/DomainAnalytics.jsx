import React, { useMemo, useState } from 'react';
import { BarChart3, Globe, ShieldCheck, AlertTriangle, Layers, TrendingUp, ExternalLink, PieChart, Search, X } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

function MetricCard({ label, icon, value, valueColor = 'text-white', sub }) {
  return (
    <div className="p-3 sm:p-4 rounded-xl bg-white/[0.015] border border-white/[0.04] space-y-1">
      <div className="flex items-center justify-between text-zinc-500 text-[10px] uppercase tracking-wider">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`text-lg sm:text-xl font-bold ${valueColor}`}>{value}</div>
      <div className="text-[9px] text-zinc-600">{sub}</div>
    </div>
  );
}

export function DomainAnalytics({ items = [], onFilterByDomain }) {
  const [domainFilter, setDomainFilter] = useState('');

  const analytics = useMemo(() => {
    const total = items.length;
    if (total === 0) return { totalItems: 0, uniqueDomains: 0, rfcEmailCount: 0, rfcEmailRatio: '0.0', fallbackCount: 0, fallbackRatio: '0.0', unstructuredCount: 0, unstructuredRatio: '0.0', topDomains: [], tldDistribution: [] };

    const domainFreq = {}, tldFreq = {};
    let rfc = 0, fb = 0, raw = 0;
    for (const item of items) {
      if (item.confidence === 'GREEN') rfc++; else if (item.confidence === 'YELLOW') fb++; else raw++;
      const d = item.domain;
      if (d && d !== 'non-email' && d !== 'unstructured') {
        const dl = d.toLowerCase();
        domainFreq[dl] = (domainFreq[dl] || 0) + 1;
        const parts = dl.split('.');
        if (parts.length >= 2) { const tld = `.${parts.slice(-1)[0]}`; tldFreq[tld] = (tldFreq[tld] || 0) + 1; }
      }
    }

    return {
      totalItems: total, uniqueDomains: Object.keys(domainFreq).length,
      rfcEmailCount: rfc, rfcEmailRatio: ((rfc / total) * 100).toFixed(1),
      fallbackCount: fb, fallbackRatio: ((fb / total) * 100).toFixed(1),
      unstructuredCount: raw, unstructuredRatio: ((raw / total) * 100).toFixed(1),
      topDomains: Object.entries(domainFreq).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([domain, count]) => ({ domain, count, percentage: ((count / total) * 100).toFixed(1) })),
      tldDistribution: Object.entries(tldFreq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tld, count]) => ({ tld, count, percentage: ((count / total) * 100).toFixed(1) }))
    };
  }, [items]);

  const filteredTopDomains = useMemo(() => {
    if (!domainFilter.trim()) return analytics.topDomains;
    const q = domainFilter.toLowerCase();
    return analytics.topDomains.filter(d => d.domain.includes(q));
  }, [analytics.topDomains, domainFilter]);

  if (analytics.totalItems === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center font-mono-code">
        <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto text-cyan-400/60 mb-3">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-bold text-white mb-1.5">NO STREAM DATA</h2>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">Start a search in <strong>Inspector Search</strong> to generate real-time domain analytics and TLD distributions.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-5 space-y-3 font-mono-code text-xs">

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <MetricCard label="Records" icon={<Layers className="w-3.5 h-3.5 text-cyan-400" />} value={formatNumber(analytics.totalItems)} sub="Active stream" />
        <MetricCard label="Domains" icon={<Globe className="w-3.5 h-3.5 text-cyan-400" />} value={formatNumber(analytics.uniqueDomains)} valueColor="text-cyan-400" sub="Distinct hostnames" />
        <MetricCard label="RFC Accuracy" icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />} value={`${analytics.rfcEmailRatio}%`} valueColor="text-emerald-400" sub={`${formatNumber(analytics.rfcEmailCount)} validated`} />
        <MetricCard label="Fallback" icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />} value={formatNumber(analytics.fallbackCount)} valueColor="text-amber-400" sub="Non-email tokens" />
      </div>

      {/* ── Confidence Bar ── */}
      <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.04] space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <span className="font-bold text-white uppercase text-[10px] tracking-wider">Parser Confidence</span>
          <div className="flex items-center gap-3 text-[9px]">
            <span className="flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />RFC {analytics.rfcEmailRatio}%</span>
            <span className="flex items-center gap-1 text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Fallback {analytics.fallbackRatio}%</span>
            <span className="flex items-center gap-1 text-rose-400"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Raw {analytics.unstructuredRatio}%</span>
          </div>
        </div>
        <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden flex">
          <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${analytics.rfcEmailRatio}%` }} />
          <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${analytics.fallbackRatio}%` }} />
          <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${analytics.unstructuredRatio}%` }} />
        </div>
      </div>

      {/* ── Leaderboard + TLD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Top Domains */}
        <div className="lg:col-span-2 rounded-xl bg-white/[0.015] border border-white/[0.04] p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.04]">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Domain Leaderboard</h3>
            </div>
            <div className="relative">
              <Search className="w-3 h-3 text-zinc-600 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} placeholder="Filter..."
                className="h-7 w-36 pl-6 pr-6 bg-white/[0.03] border border-white/[0.05] rounded-md text-[10px] text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
              />
              {domainFilter && (
                <button onClick={() => setDomainFilter('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-0.5">
            {filteredTopDomains.length === 0 ? (
              <div className="text-center py-6 text-zinc-600">No domains match filter</div>
            ) : (
              filteredTopDomains.map((d, i) => (
                <div key={d.domain} onClick={() => onFilterByDomain(d.domain)}
                  className="group p-2 rounded-lg bg-white/[0.02] border border-white/[0.03] hover:border-cyan-500/20 cursor-pointer transition-all space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-center text-[9px] text-zinc-600 font-bold">#{i + 1}</span>
                      <span className="font-semibold text-zinc-200 group-hover:text-cyan-300 truncate transition-colors">{d.domain}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-emerald-400 font-bold">{formatNumber(d.count)}</span>
                      <span className="text-zinc-600 text-[9px]">({d.percentage}%)</span>
                      <ExternalLink className="w-2.5 h-2.5 text-zinc-700 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="w-full h-[3px] bg-zinc-900 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(2, parseFloat(d.percentage) * 3))}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TLD Breakdown */}
        <div className="rounded-xl bg-white/[0.015] border border-white/[0.04] p-3 sm:p-4 space-y-3 flex flex-col">
          <div className="flex items-center gap-1.5 pb-2 border-b border-white/[0.04]">
            <PieChart className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">TLD Breakdown</h3>
          </div>

          <div className="space-y-1.5 flex-1">
            {analytics.tldDistribution.map((t) => (
              <div key={t.tld} onClick={() => onFilterByDomain(t.tld)}
                className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.03] hover:border-cyan-500/20 cursor-pointer transition-all space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-[11px]">{t.tld}</span>
                  <span className="text-zinc-500 text-[10px]">{formatNumber(t.count)} ({t.percentage}%)</span>
                </div>
                <div className="w-full h-[3px] bg-zinc-900 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(3, parseFloat(t.percentage)))}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[9px] text-zinc-500">
            💡 Tap any domain or TLD to filter matching credentials in <strong className="text-zinc-400">Inspector Search</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}
