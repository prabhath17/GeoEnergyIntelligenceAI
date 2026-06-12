import { getImpactBadge, formatTimestamp } from '../../utils/helpers.js';

const FILTERS = [
  { id: 'all',          label: 'All' },
  { id: 'high-impact',  label: 'High' },
  { id: 'geo-risk',     label: 'Geo Risk' },
  { id: 'supply-chain', label: 'Supply' },
  { id: 'market-move',  label: 'Markets' },
  { id: 'policy',       label: 'Policy' },
];

function filterIntel(items, f) {
  if (!f || f === 'all') return items;
  if (f === 'high-impact')  return items.filter(i => i.impact === 'High Impact');
  if (f === 'geo-risk')     return items.filter(i => i.category === 'Geo Risk');
  if (f === 'supply-chain') return items.filter(i => i.category === 'Supply Chain');
  if (f === 'market-move')  return items.filter(i => i.category === 'Market Move');
  if (f === 'policy')       return items.filter(i => i.category === 'Policy');
  return items;
}

function applyGlobalFilters(items, gf) {
  if (!gf) return items;
  let out = items;
  if (gf.sectors?.length)  out = out.filter(i => gf.sectors.some(s => s === i.sector || s === i.category || (i.relatedSectors||[]).includes(s)));
  if (gf.impacts?.length)  out = out.filter(i => gf.impacts.some(lv => (i.impact||'').toLowerCase().includes(lv.toLowerCase())));
  if (gf.regions?.length)  out = out.filter(i => gf.regions.some(r => (i.relatedRegions||[]).some(rr => rr.includes(r) || r.includes(rr)) || (i.sector||'').includes(r)));
  if (gf.timeWindow && gf.timeWindow !== 'Live / Latest') {
    const cutoff = { '24H': 86400, '7D': 604800, '30D': 2592000 }[gf.timeWindow];
    if (cutoff) out = out.filter(i => (Date.now() - new Date(i.timestamp||0).getTime()) / 1000 < cutoff);
  }
  return out;
}

function IntelCard({ h, onClick }) {
  const badge = getImpactBadge(h.impact);
  const sentColor = { Bullish:'text-primary', Bearish:'text-error', Neutral:'text-on-surface-variant', Volatile:'text-tertiary', 'Risk Elevated':'text-tertiary' }[h.sentimentEffect] || 'text-on-surface-variant';
  return (
    <div className="intel-card p-sm bg-surface-container-high border border-outline-variant rounded hover:bg-surface-container-highest hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onClick?.(h)}>
      <div className="flex items-center justify-between gap-xs mb-xs">
        <div className="flex items-center gap-xs flex-wrap">
          <span className={`${badge.bg} ${badge.text} text-[10px] font-bold rounded px-2 py-0.5`}>{badge.label}</span>
          <span className="text-[10px] text-outline font-mono-data">{h.time || formatTimestamp(h.timestamp)}</span>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 border border-primary/30 text-primary rounded font-bold shrink-0">AI-SCORED</span>
      </div>
      <h4 className="text-body-md font-bold text-on-surface leading-snug mb-xs">{h.headline}</h4>
      <p className="text-body-sm text-on-surface-variant leading-snug italic mb-sm">{h.whyItMatters}</p>
      <div className="flex items-center gap-xs flex-wrap">
        <span className="text-[10px] text-outline">SRC: {(h.source||'').toUpperCase()}</span>
        <span className="text-[10px] px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant rounded">{(h.sector||'').toUpperCase()}</span>
        {h.category && <span className="text-[10px] px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant rounded border border-outline-variant/50">{h.category.toUpperCase()}</span>}
        <span className={`text-[10px] px-1.5 py-0.5 border border-outline-variant ${sentColor} rounded ml-auto`}>{(h.sentimentEffect||'').toUpperCase()}</span>
      </div>
    </div>
  );
}

export default function IntelligenceFeed({ intelligenceFeed, activeFilter, onFilterChange, onItemClick, onViewAll, globalFilters }) {
  const localFiltered = filterIntel(intelligenceFeed || [], activeFilter);
  const items = applyGlobalFilters(localFiltered, globalFilters);
  const isFiltered = globalFilters && (globalFilters.sectors?.length || globalFilters.impacts?.length || globalFilters.regions?.length);

  return (
    <section className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant flex-wrap gap-xs">
        <div className="flex items-center gap-xs flex-wrap">
          <h2 className="text-label-md font-bold tracking-widest text-on-surface-variant">AI INTELLIGENCE REPORTS</h2>
          <span className="text-[10px] font-mono-data text-outline px-1.5 py-0.5 border border-outline-variant rounded-full">{items.length}</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-primary-container/20 text-primary border border-primary/30 rounded font-bold">AI-CLASSIFIED</span>
          {isFiltered && <span className="text-[9px] px-1.5 py-0.5 bg-primary-container/20 text-primary border border-primary/30 rounded font-bold">FILTERED</span>}
        </div>
        <div className="flex gap-xs flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => onFilterChange?.(f.id)}
              className={`text-[9px] px-1.5 py-0.5 rounded-sm border font-bold transition-colors ${activeFilter===f.id?'border-primary text-primary':'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-xs space-y-xs" style={{ maxHeight: 520 }}>
        {items.map(h => <IntelCard key={h.id} h={h} onClick={onItemClick} />)}
        {items.length === 0 && (
          <div className="p-md text-center">
            <p className="text-body-sm text-on-surface-variant">No intelligence items match the selected filters.</p>
            {isFiltered && <p className="text-[10px] text-outline mt-xs">Adjust global filters to see more results.</p>}
          </div>
        )}
      </div>
      <button onClick={onViewAll} className="w-full py-sm text-[10px] text-on-surface-variant hover:text-primary transition-colors border-t border-outline-variant uppercase font-bold tracking-widest cursor-pointer">
        VIEW ALL INTELLIGENCE REPORTS
      </button>
    </section>
  );
}
