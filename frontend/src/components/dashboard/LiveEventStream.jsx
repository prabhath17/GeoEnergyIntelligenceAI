import { getImpactBadge, filterLiveFeedByCategory, sortFeedByPriority, formatTimestamp } from '../../utils/helpers.js';

const FILTERS = ['All','High Impact','Geo Risk','Market Move','Policy'];

function applyGlobalFilters(items, gf) {
  if (!gf) return items;
  let out = items;
  if (gf.sectors?.length)  out = out.filter(i => gf.sectors.some(s => s === i.sector || s === i.category || (i.relatedSectors||[]).includes(s)));
  if (gf.impacts?.length)  out = out.filter(i => gf.impacts.some(lv => (i.impact||'').toLowerCase().includes(lv.toLowerCase())));
  if (gf.regions?.length)  out = out.filter(i => gf.regions.some(r => (i.region||'').includes(r) || (i.relatedRegions||[]).some(rr => rr.includes(r) || r.includes(rr))));
  if (gf.timeWindow && gf.timeWindow !== 'Live / Latest') {
    const cutoff = { '24H': 86400, '7D': 604800, '30D': 2592000 }[gf.timeWindow];
    if (cutoff) out = out.filter(i => (Date.now() - new Date(i.timestamp||0).getTime()) / 1000 < cutoff);
  }
  return out;
}

export default function LiveEventStream({ liveFeedItems, activeFilter, onFilterChange, onItemClick, globalFilters }) {
  const localFiltered = filterLiveFeedByCategory(sortFeedByPriority(liveFeedItems || []), activeFilter);
  const items = applyGlobalFilters(localFiltered, globalFilters);
  const isFiltered = globalFilters && (globalFilters.sectors?.length || globalFilters.impacts?.length || globalFilters.regions?.length);

  return (
    <section className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant flex-wrap gap-xs">
        <div className="flex items-center gap-xs flex-wrap">
          <span className="w-1.5 h-1.5 rounded-full bg-error live-dot shrink-0" />
          <h2 className="text-label-md font-bold tracking-widest text-on-surface-variant">LIVE EVENT STREAM</h2>
          <span className="text-[10px] font-mono-data text-outline px-1.5 py-0.5 border border-outline-variant rounded-full">{items.length}</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-error-container/20 text-error border border-error/30 rounded font-bold">REAL-TIME</span>
          {isFiltered && <span className="text-[9px] px-1.5 py-0.5 bg-primary-container/20 text-primary border border-primary/30 rounded font-bold">FILTERED</span>}
        </div>
        <div className="flex gap-xs flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`text-[9px] px-1.5 py-0.5 rounded-sm border font-bold transition-colors ${activeFilter===f?'border-primary text-primary':'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'}`}
            >
              {f === 'All' ? 'All' : f === 'High Impact' ? 'High' : f === 'Market Move' ? 'Markets' : f}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-xs space-y-xs" style={{ maxHeight: 560 }}>
        {items.map(item => {
          const badge = getImpactBadge(item.impact);
          return (
            <div
              key={item.id}
              className="p-sm bg-surface-container-high border border-outline-variant rounded hover:bg-surface-container-highest hover:border-primary/50 transition-colors cursor-pointer feed-new"
              onClick={() => onItemClick?.(item)}
            >
              <div className="flex items-center justify-between gap-xs mb-xs flex-wrap">
                <div className="flex items-center gap-xs flex-wrap">
                  {item.isBreaking && <span className="text-[10px] px-1.5 py-0.5 bg-error text-on-error font-bold rounded animate-pulse">BREAKING</span>}
                  <span className={`${badge.bg} ${badge.text} text-[10px] px-2 py-0.5 font-bold rounded`}>{badge.label}</span>
                  <span className="text-[10px] text-outline font-mono-data">{formatTimestamp(item.timestamp)}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-surface-container text-on-surface-variant rounded border border-outline-variant">{item.sector?.toUpperCase()}</span>
              </div>
              <p className="text-body-sm font-bold text-on-surface leading-snug mb-xs">{item.title}</p>
              {item.whyItMatters && <p className="text-body-sm text-on-surface-variant leading-snug italic">{item.whyItMatters}</p>}
              <div className="flex items-center gap-xs mt-xs flex-wrap">
                <span className="text-[10px] text-outline">SRC: {(item.source || '').toUpperCase()}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant rounded">{item.region}</span>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="p-md text-center">
            <p className="text-body-sm text-on-surface-variant">No intelligence items match the selected filters.</p>
            {isFiltered && <p className="text-[10px] text-outline mt-xs">Adjust global filters to see more results.</p>}
          </div>
        )}
      </div>
    </section>
  );
}
