import React, { useMemo, useState } from 'react';
import { 
  BarChart3, Mail, User, Phone, 
  Layers, TrendingUp, ExternalLink, PieChart, Search, X 
} from 'lucide-react';
import { formatNumber } from '../utils/formatters';

function MetricCard({ label, shortLabel, icon, value, valueColor = 'text-white', sub }) {
  return (
    <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/[0.015] border border-white/[0.04] space-y-0.5 sm:space-y-1 min-w-0">
      <div className="flex items-center justify-between text-zinc-500 text-[8px] sm:text-[10px] uppercase tracking-wider font-semibold">
        <span className="truncate">{shortLabel ? <><span className="sm:hidden">{shortLabel}</span><span className="hidden sm:inline">{label}</span></> : label}</span>
        <span className="hidden sm:block flex-shrink-0">{icon}</span>
      </div>
      <div className={`text-xs sm:text-base lg:text-lg font-bold ${valueColor} truncate leading-tight`}>{value}</div>
      <div className="text-[8px] sm:text-[9px] text-zinc-600 truncate hidden xs:block">{sub}</div>
    </div>
  );
}

export function DomainAnalytics({ items = [], onFilterByDomain }) {
  const [domainFilter, setDomainFilter] = useState('');

  const analytics = useMemo(() => {
    const total = items.length;
    if (total === 0) {
      return {
        totalItems: 0,
        uniqueDomains: 0,
        epCount: 0, epRatio: '0.0',
        upCount: 0, upRatio: '0.0',
        mpCount: 0, mpRatio: '0.0',
        ukCount: 0, ukRatio: '0.0',
        weakPassCount: 0, weakPassRatio: '0.0',
        medPassCount: 0, medPassRatio: '0.0',
        strongPassCount: 0, strongPassRatio: '0.0',
        avgPassLen: 0,
        topDomains: [],
        tldDistribution: []
      };
    }

    const domainFreq = {};
    const tldFreq = {};
    let ep = 0, up = 0, mp = 0, uk = 0;
    let weakPass = 0, medPass = 0, strongPass = 0;
    let totalPassLen = 0;
    let passCount = 0;

    for (const item of items) {
      // Classification check (supporting both new EP/UP/MP/UK and legacy GREEN/YELLOW/RED)
      const conf = item.confidence || item.type || 'UK';
      if (conf === 'EP' || conf === 'GREEN') {
        ep++;
      } else if (conf === 'MP') {
        mp++;
      } else if (conf === 'UP' || conf === 'YELLOW') {
        up++;
      } else {
        uk++;
      }

      // Password profiling
      if (item.pass && typeof item.pass === 'string') {
        const pLen = item.pass.length;
        totalPassLen += pLen;
        passCount++;
        if (pLen < 8) weakPass++;
        else if (pLen <= 12) medPass++;
        else strongPass++;
      }

      // Domain extraction
      let d = item.domain;
      // Fallback: extract domain from email if domain is generic or missing
      if ((!d || ['email', 'non-email', 'unstructured', 'username', 'mobile'].includes(d)) && item.userOrEmail && item.userOrEmail.includes('@')) {
        d = item.userOrEmail.split('@')[1];
      }

      if (d && typeof d === 'string') {
        // Clean domain: strip port, trailing slash, protocol
        const cleanDomain = d.toLowerCase().replace(/:\d+$/, '').replace(/\/.*$/, '').replace(/^www\./, '').trim();
        // Ignore generic placeholders
        if (cleanDomain && !['non-email', 'unstructured', 'username', 'mobile', 'email'].includes(cleanDomain)) {
          // Must have at least one dot to be a valid domain name
          if (cleanDomain.includes('.') && cleanDomain.length >= 4) {
            domainFreq[cleanDomain] = (domainFreq[cleanDomain] || 0) + 1;
            const parts = cleanDomain.split('.');
            if (parts.length >= 2) {
              const tld = `.${parts.slice(-1)[0]}`;
              if (/^\.[a-z]{2,10}$/i.test(tld)) {
                tldFreq[tld] = (tldFreq[tld] || 0) + 1;
              }
            }
          }
        }
      }
    }

    const domainList = Object.entries(domainFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([domain, count]) => ({
        domain,
        count,
        percentage: ((count / total) * 100).toFixed(1)
      }));

    const tldList = Object.entries(tldFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tld, count]) => ({
        tld,
        count,
        percentage: ((count / total) * 100).toFixed(1)
      }));

    return {
      totalItems: total,
      uniqueDomains: domainList.length,
      epCount: ep,
      epRatio: ((ep / total) * 100).toFixed(1),
      upCount: up,
      upRatio: ((up / total) * 100).toFixed(1),
      mpCount: mp,
      mpRatio: ((mp / total) * 100).toFixed(1),
      ukCount: uk,
      ukRatio: ((uk / total) * 100).toFixed(1),
      avgPassLen: passCount > 0 ? (totalPassLen / passCount).toFixed(1) : 0,
      weakPassCount: weakPass,
      weakPassRatio: passCount > 0 ? ((weakPass / passCount) * 100).toFixed(1) : '0.0',
      medPassCount: medPass,
      medPassRatio: passCount > 0 ? ((medPass / passCount) * 100).toFixed(1) : '0.0',
      strongPassCount: strongPass,
      strongPassRatio: passCount > 0 ? ((strongPass / passCount) * 100).toFixed(1) : '0.0',
      topDomains: domainList.slice(0, 50),
      tldDistribution: tldList
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
        <h2 className="text-sm font-bold text-white mb-1.5">NO STREAM DATA YET</h2>
        <p className="text-xs text-zinc-500 max-w-md mx-auto mb-4">
          Start a search stream in <strong>Inspector Search</strong> to generate real-time domain analytics, classification breakdown, and TLD distributions.
        </p>
        <button
          onClick={() => onFilterByDomain('')}
          className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-bold transition-all inline-flex items-center gap-2"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Open Inspector Search</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-5 space-y-3 font-mono-code text-xs">

      {/* ── Metric Cards Grid (Compact 4-Column Single Row on Mobile & Desktop) ── */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
        <MetricCard 
          label="Total Records"
          shortLabel="Records"
          icon={<Layers className="w-3.5 h-3.5 text-cyan-400" />} 
          value={formatNumber(analytics.totalItems)} 
          sub="Streamed" 
        />
        <MetricCard 
          label="E:P (Emails)" 
          shortLabel="E:P"
          icon={<Mail className="w-3.5 h-3.5 text-emerald-400" />} 
          value={`${analytics.epRatio}%`} 
          valueColor="text-emerald-400" 
          sub={`${formatNumber(analytics.epCount)} pairs`} 
        />
        <MetricCard 
          label="U:P (Usernames)" 
          shortLabel="U:P"
          icon={<User className="w-3.5 h-3.5 text-cyan-300" />} 
          value={`${analytics.upRatio}%`} 
          valueColor="text-cyan-300" 
          sub={`${formatNumber(analytics.upCount)} pairs`} 
        />
        <MetricCard 
          label="M:P (Mobiles)" 
          shortLabel="M:P"
          icon={<Phone className="w-3.5 h-3.5 text-amber-400" />} 
          value={`${analytics.mpRatio}%`} 
          valueColor="text-amber-400" 
          sub={`${formatNumber(analytics.mpCount)} pairs`} 
        />
      </div>

      {/* ── Leaderboard + TLD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Top Domains */}
        <div className="lg:col-span-2 rounded-xl bg-white/[0.015] border border-white/[0.04] p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.04]">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Domain Leaderboard</h3>
              <span className="text-[10px] text-zinc-500">({analytics.uniqueDomains} total)</span>
            </div>
            <div className="relative">
              <Search className="w-3 h-3 text-zinc-600 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} placeholder="Filter domains..."
                className="h-7 w-40 pl-6 pr-6 bg-white/[0.03] border border-white/[0.05] rounded-md text-[10px] text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
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
            {analytics.tldDistribution.length === 0 ? (
              <div className="text-center py-6 text-zinc-600">No TLDs discovered</div>
            ) : (
              analytics.tldDistribution.map((t) => (
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
              ))
            )}
          </div>

          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[9px] text-zinc-500">
            💡 Tap any domain or TLD to filter matching credentials in <strong className="text-zinc-400">Inspector Search</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}
