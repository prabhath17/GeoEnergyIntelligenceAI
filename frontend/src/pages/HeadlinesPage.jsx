import { useEffect, useMemo, useState } from 'react';
import { getImpactBadge, formatTimestamp } from '../utils/helpers.js';

const SORT_OPTIONS = ['Newest', 'Highest Impact', 'Sector', 'Source'];
const IMPACT_SCORE = { 'High Impact': 3, 'Medium Impact': 2, 'Low Impact': 1 };

const ACCENTS = {
  red: { text: '#ff8f8f', border: 'rgba(255,143,143,0.42)', bg: 'rgba(255,143,143,0.08)' },
  amber: { text: '#fac84a', border: 'rgba(250,188,69,0.36)', bg: 'rgba(250,188,69,0.07)' },
  blue: { text: '#a2c9ff', border: 'rgba(162,201,255,0.34)', bg: 'rgba(162,201,255,0.07)' },
  violet: { text: '#c79df7', border: 'rgba(199,157,247,0.34)', bg: 'rgba(199,157,247,0.07)' },
  green: { text: '#6edb9a', border: 'rgba(110,219,154,0.30)', bg: 'rgba(110,219,154,0.06)' },
  muted: { text: '#9aa3b0', border: 'rgba(154,163,176,0.28)', bg: 'rgba(154,163,176,0.06)' },
};

const SECTION_DEFS = [
  { key: 'geo-risk', label: 'Geo Risk', accent: ACCENTS.amber, test: h => h.category === 'Geo Risk' },
  { key: 'market-moves', label: 'Market Moves', accent: ACCENTS.blue, test: h => h.category === 'Market Move' },
  { key: 'supply-chain', label: 'Supply Chain', accent: ACCENTS.green, test: h => h.category === 'Supply Chain' },
  { key: 'policy', label: 'Policy', accent: ACCENTS.muted, test: h => h.category === 'Policy' },
  { key: 'cross-market', label: 'Cross-Market', accent: ACCENTS.violet, test: h => h.category === 'Cross-Market' },
  { key: 'sector-intel', label: 'Sector Intelligence', accent: ACCENTS.blue, test: h => !['Geo Risk', 'Market Move', 'Supply Chain', 'Policy', 'Cross-Market'].includes(h.category) },
];

const FILTER_CHIPS = [
  'All',
  'High Impact',
  'Medium Impact',
  'Geo Risk',
  'Supply Chain',
  'Market Move',
  'Policy',
  'Cross-Market',
  'Crude Oil',
  'Natural Gas',
  'Refined Products',
  'Power',
  'Renewables',
];

const SENTIMENT_COLORS = {
  Bullish: '#6edb9a',
  Bearish: '#ff8f8f',
  Neutral: '#9aa3b0',
  Volatile: '#fac84a',
  'Risk Elevated': '#fac84a',
  Expanding: '#6edb9a',
};

const CATEGORY_BY_EVENT = {
  'Geo Risk': 'Geo Risk',
  'Market Move': 'Market Move',
  'Price Movement': 'Market Move',
  'Policy Event': 'Policy',
  'Refinery Outage': 'Supply Chain',
  'Production Disruption': 'Supply Chain',
  'Supply Disruption': 'Supply Chain',
  'Storage Report': 'Supply Chain',
};

const SECTOR_COMMODITIES = {
  'Crude Oil': ['WTI', 'Brent', 'Kirkuk crude'],
  'Natural Gas': ['LNG', 'Henry Hub', 'TTF'],
  'Refined Products': ['Diesel', 'Gasoline', 'Jet fuel'],
  Power: ['Power', 'Uranium', 'Gas-for-power'],
  Renewables: ['Solar', 'Wind', 'Biofuel feedstock'],
};

const BUSINESS_SECTORS = {
  'Crude Oil': ['E&P operators', 'Refiners', 'Crude shippers'],
  'Natural Gas': ['LNG exporters', 'Utilities', 'Industrial gas buyers'],
  'Refined Products': ['Refiners', 'Logistics operators', 'Fuel retailers'],
  Power: ['Utilities', 'Grid operators', 'Industrial power buyers'],
  Renewables: ['Project developers', 'Equipment OEMs', 'Power offtakers'],
};

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function arrayify(value, fallback = []) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value) return [value];
  return fallback;
}

function normalizeCategory(item) {
  if (item.category === 'Policy Event') return 'Policy';
  if (item.category === 'Price Movement') return 'Market Move';
  if (item.category) return item.category;
  return CATEGORY_BY_EVENT[item.eventType] || 'Sector Intelligence';
}

function normalizeImpact(impact) {
  if (impact === 'High' || impact === 'Critical') return 'High Impact';
  if (impact === 'Moderate') return 'Medium Impact';
  if (impact === 'Low') return 'Low Impact';
  return impact || 'Medium Impact';
}

function normalizeHeadline(item, index) {
  const title = item.headline || item.title || 'Energy market signal under AI review';
  const sector = item.sector || item.primarySector || 'Crude Oil';
  const category = normalizeCategory(item);
  const timestamp = item.timestamp || new Date(Date.now() - index * 20 * 60000).toISOString();
  const relatedSectors = arrayify(item.relatedSectors || item.affectedSectors, [sector]);
  const relatedRegions = arrayify(item.relatedRegions || item.region || item.countryOrArea, ['Global']);
  const commodities = arrayify(item.relatedCommodities, SECTOR_COMMODITIES[sector] || relatedSectors);
  const sentiment = item.sentiment || item.sentimentEffect || 'Neutral';
  const impact = normalizeImpact(item.impact || item.level);
  const aiSummary = item.aiSummary || item.context || item.whyItMatters || `AI classification links this ${sector} report to ${category.toLowerCase()} conditions.`;
  const whyItMatters = item.whyItMatters || item.detail || `This signal can alter pricing, risk premiums, or operating exposure for ${relatedSectors.join(', ')}.`;
  const marketImpact = item.marketImpact || item.marketReadThrough || deriveMarketImpact({ impact, sentiment, sector, category });
  const affectedBusinessSectors = arrayify(item.affectedBusinessSectors || item.affectedStakeholders, BUSINESS_SECTORS[sector] || relatedSectors);

  return {
    ...item,
    id: item.id || `headline-${index}`,
    title,
    headline: title,
    source: item.source || 'GEI Signal',
    timestamp,
    timeAgo: item.timeAgo || item.time || formatTimestamp(timestamp),
    time: item.time || item.timeAgo || formatTimestamp(timestamp),
    impact,
    category,
    sector,
    sentiment,
    sentimentEffect: sentiment,
    relatedCommodities: commodities,
    relatedRegions,
    relatedSectors,
    whyItMatters,
    marketImpact,
    affectedBusinessSectors,
    whatToWatchNext: item.whatToWatchNext || deriveWatchList({ sector, category, relatedRegions }),
    sourceStatus: item.sourceStatus || 'AI classified',
    url: item.url || item.sourceUrl || '',
    aiSummary,
    aiConfidence: item.aiConfidence || Math.min(94, 66 + (IMPACT_SCORE[impact] || 2) * 7 + (index % 9)),
  };
}

const FRESHNESS_STYLE = {
  LIVE:   { color: '#6edb9a', label: 'LIVE' },
  TODAY:  { color: '#a2c9ff', label: 'TODAY' },
  RECENT: { color: '#fac84a', label: '48-72H' },
  STALE:  { color: '#6b7a8d', label: 'ARCHIVE' },
};

function freshnessOf(item) {
  if (item.freshness && FRESHNESS_STYLE[item.freshness]) return item.freshness;
  const hours = (Date.now() - new Date(item.timestamp || 0).getTime()) / 36e5;
  if (!Number.isFinite(hours)) return 'RECENT';
  if (hours < 6) return 'LIVE';
  if (hours < 24) return 'TODAY';
  if (hours < 72) return 'RECENT';
  return 'STALE';
}

function FreshnessChip({ item }) {
  const f = FRESHNESS_STYLE[freshnessOf(item)];
  return (
    <span className="text-[8px] font-bold px-1 py-0.5 rounded shrink-0 flex items-center gap-1"
      style={{ color: f.color, background: `${f.color}14`, border: `1px solid ${f.color}45` }}>
      {freshnessOf(item) === 'LIVE' && <span className="w-1 h-1 rounded-full live-dot" style={{ background: f.color }} />}
      {f.label}
    </span>
  );
}

function dedupeHeadlines(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = String(item.headline || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).slice(0, 10).join(' ');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deriveMarketImpact({ impact, sentiment, sector, category }) {
  const direction = sentiment === 'Bearish' ? 'downside pressure' : sentiment === 'Neutral' ? 'range-bound sensitivity' : 'upside risk premium';
  const urgency = impact === 'High Impact' ? 'Immediate' : impact === 'Medium Impact' ? 'Near-term' : 'Watchlist';
  return `${urgency} ${sector} read-through with ${direction}; ${category.toLowerCase()} conditions may affect spreads, hedging costs, and procurement timing.`;
}

function deriveWatchList({ sector, category, relatedRegions }) {
  const region = relatedRegions?.[0] || 'Global';
  return [
    `${region} follow-through over the next reporting cycle`,
    `${sector} price spreads and forward curve reaction`,
    `${category} confirmation from source and adjacent market signals`,
  ];
}

function applyGlobalFilters(items, gf) {
  if (!gf) return items;
  let out = items;
  if (gf.sectors?.length) {
    out = out.filter(i => gf.sectors.some(s => s === i.sector || s === i.category || (i.relatedSectors || []).includes(s)));
  }
  if (gf.impacts?.length) {
    out = out.filter(i => gf.impacts.some(level => (i.impact || '').toLowerCase().includes(level.toLowerCase())));
  }
  if (gf.regions?.length) {
    out = out.filter(i => gf.regions.some(r => (i.relatedRegions || []).some(rr => rr.includes(r) || r.includes(rr))));
  }
  return out;
}

function chipMatches(item, chip) {
  if (chip === 'All') return true;
  const haystack = [
    item.impact,
    item.category,
    item.sector,
    item.sentiment,
    ...(item.relatedSectors || []),
    ...(item.relatedCommodities || []),
    ...(item.relatedRegions || []),
  ].map(v => String(v).toLowerCase());
  return haystack.some(v => v === chip.toLowerCase() || v.includes(chip.toLowerCase()));
}

function getAccentFor(item) {
  if (item.impact === 'High Impact') return ACCENTS.red;
  if (item.category === 'Geo Risk') return ACCENTS.amber;
  if (item.category === 'Cross-Market') return ACCENTS.violet;
  if (item.category === 'Supply Chain') return ACCENTS.green;
  return ACCENTS.blue;
}

function MiniChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function NewspaperIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Z" />
      <path d="M4 22a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </svg>
  );
}

function ImpactBadge({ impact, small = false }) {
  const badge = getImpactBadge(impact);
  return (
    <span className={cx(badge.bg, badge.text, 'font-bold rounded-sm shrink-0', small ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5')}>
      {badge.label}
    </span>
  );
}

function Tag({ children, color = '#9aa3b0' }) {
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
      style={{ color, borderColor: `${color}55`, background: `${color}12` }}
    >
      {children}
    </span>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg px-sm py-sm min-h-[76px] flex flex-col justify-between"
      style={{
        background: `linear-gradient(150deg, ${accent.bg} 0%, rgba(13,26,38,0.90) 72%)`,
        border: `1px solid ${accent.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div className="absolute left-0 top-0 h-full w-[3px]" style={{ background: accent.text }} />
      <p className="text-[24px] font-bold font-mono-data leading-none" style={{ color: accent.text }}>{value}</p>
      <p className="text-[9px] text-outline tracking-widest font-bold">{label.toUpperCase()}</p>
    </div>
  );
}

function FeaturedCard({ item, onOpen }) {
  const accent = getAccentFor(item);
  const sentCol = SENTIMENT_COLORS[item.sentiment] || '#9aa3b0';

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group text-left rounded-lg p-md min-h-[226px] flex flex-col transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-1 focus:ring-primary/60"
      style={{
        background: `linear-gradient(145deg, ${accent.bg} 0%, rgba(13,26,38,0.94) 58%, rgba(9,18,26,0.98) 100%)`,
        border: `1px solid ${accent.border}`,
        boxShadow: '0 18px 42px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-start justify-between gap-sm mb-sm">
        <div className="flex flex-wrap items-center gap-xs">
          <ImpactBadge impact={item.impact} />
          <FreshnessChip item={item} />
          <Tag color="#7dbfff">AI-SCORED {item.aiConfidence}%</Tag>
        </div>
        <span className="text-[10px] font-mono-data text-outline shrink-0">{item.timeAgo}</span>
      </div>

      <h3 className="text-[15px] font-bold leading-snug text-on-surface group-hover:text-primary transition-colors">
        {item.headline}
      </h3>
      <p className="text-[10px] text-outline mt-xs">{item.source}</p>
      <p className="text-[11px] text-on-surface-variant leading-snug mt-sm flex-1">
        {item.aiSummary}
      </p>

      <div className="flex flex-wrap gap-xs mt-md">
        {item.relatedCommodities.slice(0, 2).map(c => <Tag key={c} color="#a2c9ff">{c}</Tag>)}
        {item.relatedRegions.slice(0, 1).map(r => <Tag key={r} color="#fac84a">{r}</Tag>)}
        <Tag color={sentCol}>{String(item.sentiment).toUpperCase()}</Tag>
      </div>
    </button>
  );
}

function CompactHeadline({ item, onOpen, dense = false }) {
  const accent = getAccentFor(item);
  const sentCol = SENTIMENT_COLORS[item.sentiment] || '#9aa3b0';

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="w-full text-left group rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50"
      style={{
        background: 'rgba(8,17,25,0.42)',
        border: '1px solid rgba(45,61,78,0.62)',
      }}
    >
      <div className={cx('flex flex-col gap-xs', dense ? 'p-sm' : 'p-sm')}>
        <div className="flex items-center gap-xs min-w-0">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 live-dot" style={{ background: accent.text }} />
          <ImpactBadge impact={item.impact} small />
          <FreshnessChip item={item} />
          <span className="text-[9px] font-mono-data text-outline shrink-0">{item.timeAgo}</span>
          <span className="text-[9px] text-outline-variant truncate">/ {item.source}</span>
          <span className="ml-auto text-[9px] font-bold shrink-0" style={{ color: sentCol }}>{String(item.sentiment).toUpperCase()}</span>
        </div>
        <p className="text-[11px] font-bold leading-snug text-on-surface group-hover:text-primary transition-colors">
          {item.headline}
        </p>
        <p className="text-[10px] text-on-surface-variant leading-snug">
          {item.whyItMatters}
        </p>
        <div className="flex items-center gap-xs flex-wrap">
          <Tag color="#a2c9ff">{item.sector}</Tag>
          <Tag color={accent.text}>{item.category}</Tag>
          {item.relatedCommodities.slice(0, 1).map(c => <Tag key={c}>{c}</Tag>)}
          <span className="ml-auto text-outline group-hover:text-primary transition-colors">
            <MiniChevron />
          </span>
        </div>
      </div>
    </button>
  );
}

function SectionBlock({ section, items, fallbackItems, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const displayItems = items.length ? items : fallbackItems.slice(0, 3);
  const visible = expanded ? displayItems : displayItems.slice(0, 5);
  const isFallback = !items.length;

  return (
    <section
      className="rounded-lg overflow-hidden flex flex-col min-h-[430px]"
      style={{
        background: 'linear-gradient(180deg, rgba(13,26,38,0.96) 0%, rgba(9,18,26,0.98) 100%)',
        border: `1px solid ${section.accent.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div
        className="px-sm py-sm flex items-center gap-sm border-b"
        style={{ borderBottomColor: section.accent.border, background: section.accent.bg }}
      >
        <div className="w-1 h-7 rounded-full" style={{ background: section.accent.text }} />
        <div className="min-w-0">
          <h3 className="text-[10px] font-bold tracking-widest" style={{ color: section.accent.text }}>
            {section.label.toUpperCase()}
          </h3>
          <p className="text-[9px] text-outline font-mono-data">
            {items.length} classified {isFallback ? '/ showing adjacent signals' : ''}
          </p>
        </div>
        <span className="ml-auto text-[18px] font-bold font-mono-data" style={{ color: section.accent.text }}>{items.length}</span>
      </div>

      <div className="p-sm flex-1 flex flex-col gap-xs">
        {visible.map(item => <CompactHeadline key={`${section.key}-${item.id}`} item={item} onOpen={onOpen} dense />)}
      </div>

      {displayItems.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="py-xs text-[10px] font-bold tracking-widest border-t transition-colors"
          style={{ color: section.accent.text, borderTopColor: section.accent.border, background: section.accent.bg }}
        >
          {expanded ? 'SHOW LESS' : `VIEW MORE (${displayItems.length - 5})`}
        </button>
      )}
    </section>
  );
}

function DetailDrawer({ item, allItems, onClose, onOpenItem }) {
  useEffect(() => {
    if (!item) return undefined;
    const handler = event => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [item, onClose]);

  if (!item) return null;

  const accent = getAccentFor(item);
  const sentCol = SENTIMENT_COLORS[item.sentiment] || '#9aa3b0';
  const related = allItems
    .filter(other => other.id !== item.id)
    .filter(other =>
      other.sector === item.sector ||
      other.category === item.category ||
      other.relatedRegions.some(r => item.relatedRegions.includes(r)) ||
      other.relatedCommodities.some(c => item.relatedCommodities.includes(c))
    )
    .slice(0, 4);

  return (
    <>
      <div className="fixed inset-0 z-[75] bg-black/60" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 z-[80] h-screen w-[520px] max-w-[94vw] overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #111d29 0%, #0b141c 100%)',
          borderLeft: `1px solid ${accent.border}`,
          boxShadow: '0 0 60px rgba(0,0,0,0.70)',
        }}
      >
        <div className="p-md border-b shrink-0" style={{ borderBottomColor: 'rgba(65,71,82,0.75)' }}>
          <div className="flex items-start justify-between gap-md">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-widest mb-xs" style={{ color: accent.text }}>HEADLINE INTELLIGENCE DETAIL</p>
              <h2 className="text-[17px] font-bold leading-snug text-on-surface">{item.headline}</h2>
            </div>
            <button type="button" onClick={onClose} className="p-xs text-outline hover:text-primary transition-colors" aria-label="Close detail">
              <CloseIcon />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-xs mt-sm">
            <ImpactBadge impact={item.impact} />
            <Tag color={accent.text}>{item.category}</Tag>
            <Tag color={sentCol}>{String(item.sentiment).toUpperCase()}</Tag>
            <Tag color="#7dbfff">AI {item.aiConfidence}%</Tag>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-md space-y-md">
          <div className="grid grid-cols-2 gap-sm">
            <InfoTile label="Source" value={item.source} />
            <InfoTile label="Published" value={item.timeAgo} />
            <InfoTile label="Sector" value={item.sector} />
            <InfoTile label="Source Status" value={item.sourceStatus} />
          </div>

          <DetailPanel title="AI Summary" accent={accent}>
            {item.aiSummary}
          </DetailPanel>

          <DetailPanel title="Why It Matters" accent={accent}>
            {item.whyItMatters}
          </DetailPanel>

          <DetailPanel title="Likely Market Impact" accent={accent}>
            {item.marketImpact}
          </DetailPanel>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            <ChipPanel title="Related Commodities" values={item.relatedCommodities} color="#a2c9ff" />
            <ChipPanel title="Related Regions" values={item.relatedRegions} color="#fac84a" />
            <ChipPanel title="Affected Sectors / Businesses" values={item.affectedBusinessSectors} color="#6edb9a" />
            <ChipPanel title="Classified Sectors" values={item.relatedSectors} color="#c79df7" />
          </div>

          <div className="rounded-lg p-sm" style={{ background: 'rgba(13,26,38,0.70)', border: '1px solid rgba(45,61,78,0.75)' }}>
            <p className="text-[10px] font-bold tracking-widest text-outline mb-sm">WHAT TO WATCH NEXT</p>
            <div className="space-y-xs">
              {arrayify(item.whatToWatchNext).map((watch, index) => (
                <div key={watch} className="flex gap-sm text-[11px] text-on-surface-variant leading-snug">
                  <span className="font-mono-data font-bold shrink-0" style={{ color: accent.text }}>{String(index + 1).padStart(2, '0')}</span>
                  <span>{watch}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg p-sm" style={{ background: 'rgba(13,26,38,0.70)', border: '1px solid rgba(45,61,78,0.75)' }}>
            <div className="flex items-center justify-between gap-sm mb-sm">
              <p className="text-[10px] font-bold tracking-widest text-outline">RELATED HEADLINES</p>
              <span className="text-[10px] font-mono-data text-outline">{related.length}</span>
            </div>
            <div className="space-y-xs">
              {related.length ? related.map(relatedItem => (
                <button
                  type="button"
                  key={relatedItem.id}
                  onClick={() => onOpenItem(relatedItem)}
                  className="w-full text-left p-sm rounded-md group transition-colors"
                  style={{ background: 'rgba(8,17,25,0.55)', border: '1px solid rgba(45,61,78,0.62)' }}
                >
                  <div className="flex items-center gap-xs mb-xs">
                    <ImpactBadge impact={relatedItem.impact} small />
                    <span className="text-[9px] text-outline">{relatedItem.timeAgo} / {relatedItem.source}</span>
                  </div>
                  <p className="text-[10px] font-bold text-on-surface group-hover:text-primary leading-snug">{relatedItem.headline}</p>
                </button>
              )) : (
                <p className="text-[10px] text-outline">No directly linked headlines in the current filtered feed.</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-md border-t shrink-0 flex items-center gap-sm" style={{ borderTopColor: 'rgba(65,71,82,0.75)' }}>
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center py-sm rounded font-bold text-[10px] tracking-widest"
              style={{ color: '#00315c', background: '#a2c9ff' }}
            >
              OPEN SOURCE
            </a>
          ) : (
            <span
              className="flex-1 text-center py-sm rounded font-bold text-[10px] tracking-widest"
              style={{ color: '#7dbfff', background: 'rgba(88,166,255,0.10)', border: '1px solid rgba(88,166,255,0.24)' }}
            >
              SOURCE URL NOT PROVIDED
            </span>
          )}
          <span className="text-[10px] font-mono-data text-outline">GEI-AI-v2.4</span>
        </div>
      </aside>
    </>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-lg p-sm" style={{ background: 'rgba(13,26,38,0.70)', border: '1px solid rgba(45,61,78,0.75)' }}>
      <p className="text-[9px] text-outline tracking-widest mb-xs">{label.toUpperCase()}</p>
      <p className="text-[11px] font-bold text-on-surface-variant">{value || 'Classified'}</p>
    </div>
  );
}

function DetailPanel({ title, accent, children }) {
  return (
    <section className="rounded-lg p-sm" style={{ background: 'rgba(13,26,38,0.72)', border: `1px solid ${accent.border}`, borderLeft: `3px solid ${accent.text}` }}>
      <p className="text-[10px] font-bold tracking-widest mb-xs" style={{ color: accent.text }}>{title.toUpperCase()}</p>
      <p className="text-[12px] text-on-surface leading-relaxed">{children}</p>
    </section>
  );
}

function ChipPanel({ title, values, color }) {
  return (
    <section className="rounded-lg p-sm" style={{ background: 'rgba(13,26,38,0.70)', border: '1px solid rgba(45,61,78,0.75)' }}>
      <p className="text-[9px] text-outline tracking-widest mb-xs">{title.toUpperCase()}</p>
      <div className="flex flex-wrap gap-xs">
        {arrayify(values, ['Classified']).map(value => <Tag key={value} color={color}>{value}</Tag>)}
      </div>
    </section>
  );
}

export default function HeadlinesPage({ data, globalFilters }) {
  const [activeFilters, setActiveFilters] = useState(['All']);
  const [sort, setSort] = useState('Newest');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('sections');
  const [selected, setSelected] = useState(null);

  const allItems = useMemo(
    () => dedupeHeadlines((data?.intelligenceFeed || []).map(normalizeHeadline))
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)),
    [data?.intelligenceFeed]
  );

  const filteredItems = useMemo(() => {
    let items = applyGlobalFilters([...allItems], globalFilters);
    const q = search.trim().toLowerCase();

    if (q) {
      items = items.filter(item => [
        item.headline,
        item.source,
        item.aiSummary,
        item.whyItMatters,
        item.marketImpact,
        item.category,
        item.sector,
        ...item.relatedCommodities,
        ...item.relatedRegions,
      ].join(' ').toLowerCase().includes(q));
    }

    if (!activeFilters.includes('All')) {
      items = items.filter(item => activeFilters.some(filter => chipMatches(item, filter)));
    }

    if (sort === 'Newest') items.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    if (sort === 'Highest Impact') {
      items.sort((a, b) => (IMPACT_SCORE[b.impact] || 0) - (IMPACT_SCORE[a.impact] || 0) || new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    }
    if (sort === 'Sector') items.sort((a, b) => a.sector.localeCompare(b.sector) || new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    if (sort === 'Source') items.sort((a, b) => a.source.localeCompare(b.source) || new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    return items;
  }, [activeFilters, allItems, globalFilters, search, sort]);

  const metrics = useMemo(() => ({
    total: allItems.length,
    high: allItems.filter(h => h.impact === 'High Impact').length,
    medium: allItems.filter(h => h.impact === 'Medium Impact').length,
    geo: allItems.filter(h => h.category === 'Geo Risk').length,
    market: allItems.filter(h => h.category === 'Market Move').length,
    cross: allItems.filter(h => h.category === 'Cross-Market').length,
  }), [allItems]);

  const latestTime = allItems.length
    ? formatTimestamp([...allItems].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0].timestamp)
    : 'No feed';

  const featured = useMemo(() => (
    [...filteredItems]
      .sort((a, b) => (IMPACT_SCORE[b.impact] || 0) - (IMPACT_SCORE[a.impact] || 0) || new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 3)
  ), [filteredItems]);

  const sectionItems = useMemo(() => {
    const bySection = {};
    SECTION_DEFS.forEach(section => {
      bySection[section.key] = filteredItems.filter(section.test);
    });
    return bySection;
  }, [filteredItems]);

  const fallbackItems = useMemo(() => (
    [...filteredItems].sort((a, b) => (IMPACT_SCORE[b.impact] || 0) - (IMPACT_SCORE[a.impact] || 0)).slice(0, 6)
  ), [filteredItems]);

  const isGloballyFiltered = globalFilters && (globalFilters.sectors?.length || globalFilters.impacts?.length || globalFilters.regions?.length);

  const toggleFilter = filter => {
    if (filter === 'All') {
      setActiveFilters(['All']);
      return;
    }
    setActiveFilters(prev => {
      const withoutAll = prev.filter(f => f !== 'All');
      const next = withoutAll.includes(filter) ? withoutAll.filter(f => f !== filter) : [...withoutAll, filter];
      return next.length ? next : ['All'];
    });
  };

  const isActive = filter => activeFilters.includes(filter) || (filter === 'All' && activeFilters.includes('All'));

  return (
    <div className="page-enter">
      <main className="max-w-[1920px] mx-auto px-lg py-md space-y-md">
        <header
          className="rounded-lg p-md"
          style={{
            background: 'linear-gradient(135deg, rgba(162,201,255,0.07) 0%, rgba(13,26,38,0.55) 48%, rgba(11,20,28,0.15) 100%)',
            border: '1px solid rgba(45,61,78,0.74)',
          }}
        >
          <div className="flex items-start justify-between gap-md flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-sm mb-xs">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ color: '#a2c9ff', background: 'rgba(162,201,255,0.10)', border: '1px solid rgba(162,201,255,0.30)' }}
                >
                  <NewspaperIcon />
                </div>
                <h1 className="text-[20px] font-bold text-on-surface tracking-tight">Energy Intelligence Headlines</h1>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                AI-classified market signals / <span className="font-mono-data text-primary">{filteredItems.length}</span> shown from{' '}
                <span className="font-mono-data text-primary">{metrics.total}</span> total /{' '}
                <span className="font-mono-data" style={{ color: '#ff8f8f' }}>{metrics.high}</span> high impact
                {isGloballyFiltered && (
                  <span className="ml-sm text-[10px] font-bold px-2 py-0.5 rounded border" style={{ color: '#a2c9ff', background: 'rgba(162,201,255,0.08)', borderColor: 'rgba(162,201,255,0.3)' }}>
                    GLOBAL FILTER ACTIVE
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-sm flex-wrap">
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(45,61,78,0.8)' }}>
                <button
                  type="button"
                  onClick={() => setView('sections')}
                  className="text-[10px] px-sm py-xs font-bold transition-colors"
                  style={{ background: view === 'sections' ? 'rgba(162,201,255,0.15)' : 'transparent', color: view === 'sections' ? '#a2c9ff' : '#8b919d' }}
                >
                  Sections
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="text-[10px] px-sm py-xs font-bold transition-colors border-l"
                  style={{ borderLeftColor: 'rgba(45,61,78,0.8)', background: view === 'list' ? 'rgba(162,201,255,0.15)' : 'transparent', color: view === 'list' ? '#a2c9ff' : '#8b919d' }}
                >
                  List
                </button>
              </div>
              <div className="flex items-center gap-xs px-sm py-xs rounded border" style={{ background: 'rgba(13,26,38,0.75)', borderColor: 'rgba(45,61,78,0.8)' }}>
                <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#a2c9ff' }} />
                <span className="text-[9px] font-bold font-mono-data text-outline">AI-CLASSIFIED / {latestTime}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-sm">
          <SummaryCard label="Total Reports" value={metrics.total} accent={ACCENTS.blue} />
          <SummaryCard label="High Impact" value={metrics.high} accent={ACCENTS.red} />
          <SummaryCard label="Medium Impact" value={metrics.medium} accent={ACCENTS.amber} />
          <SummaryCard label="Geo Risk" value={metrics.geo} accent={ACCENTS.amber} />
          <SummaryCard label="Market Moves" value={metrics.market} accent={ACCENTS.blue} />
          <SummaryCard label="Cross-Market" value={metrics.cross} accent={ACCENTS.violet} />
        </section>

        <section className="rounded-lg p-sm space-y-sm" style={{ background: 'rgba(13,26,38,0.56)', border: '1px solid rgba(45,61,78,0.70)' }}>
          <div className="flex flex-wrap gap-sm items-center">
            <div className="flex-1 min-w-[260px] flex items-center gap-sm px-sm py-xs rounded-lg" style={{ background: '#0f1922', border: '1px solid rgba(162,201,255,0.22)' }}>
              <span className="text-outline"><SearchIcon /></span>
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search headlines, source, commodity, region, or AI context..."
                className="flex-1 bg-transparent text-[11px] text-on-surface placeholder:text-outline focus:outline-none min-w-0"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-outline hover:text-primary transition-colors" aria-label="Clear search">
                  <CloseIcon />
                </button>
              )}
            </div>
            <select
              value={sort}
              onChange={event => setSort(event.target.value)}
              className="px-sm py-xs text-[10px] font-bold rounded-lg focus:outline-none"
              style={{ background: '#0f1922', border: '1px solid rgba(45,61,78,0.8)', color: '#c0c7d4' }}
            >
              {SORT_OPTIONS.map(option => <option key={option}>{option}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-xs">
            {FILTER_CHIPS.map(filter => {
              const active = isActive(filter);
              const color = filter === 'High Impact' ? '#ff8f8f' : filter === 'Medium Impact' || filter === 'Geo Risk' ? '#fac84a' : filter === 'Cross-Market' ? '#c79df7' : '#a2c9ff';
              return (
                <button
                  type="button"
                  key={filter}
                  onClick={() => toggleFilter(filter)}
                  className="text-[10px] font-bold px-sm py-xs rounded-full border transition-all"
                  style={{
                    background: active ? `${color}16` : 'rgba(8,17,25,0.36)',
                    color: active ? color : '#8b919d',
                    borderColor: active ? `${color}66` : 'rgba(45,61,78,0.72)',
                  }}
                >
                  {filter}
                </button>
              );
            })}
            {!activeFilters.includes('All') && (
              <button
                type="button"
                onClick={() => setActiveFilters(['All'])}
                className="text-[10px] font-bold px-sm py-xs rounded-full border transition-all"
                style={{ color: '#ff8f8f', borderColor: 'rgba(255,143,143,0.4)', background: 'rgba(255,143,143,0.08)' }}
              >
                Clear
              </button>
            )}
          </div>
        </section>

        {view === 'sections' ? (
          <div className="space-y-md">
            <section>
              <div className="flex items-center gap-sm mb-sm">
                <div className="w-1 h-5 rounded-full" style={{ background: '#ff8f8f' }} />
                <h2 className="text-[10px] font-bold tracking-widest" style={{ color: '#ff8f8f' }}>FEATURED INTELLIGENCE</h2>
                <span className="text-[10px] font-mono-data text-outline">{featured.length} priority reports</span>
              </div>
              {featured.length ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-sm">
                  {featured.map(item => <FeaturedCard key={item.id} item={item} onOpen={setSelected} />)}
                </div>
              ) : (
                <EmptyState onClear={() => { setActiveFilters(['All']); setSearch(''); }} />
              )}
            </section>

            <section>
              <div className="flex items-center gap-sm mb-sm">
                <div className="w-1 h-5 rounded-full" style={{ background: '#a2c9ff' }} />
                <h2 className="text-[10px] font-bold tracking-widest text-on-surface-variant">INTELLIGENCE BY CATEGORY</h2>
                <span className="text-[10px] font-mono-data text-outline">{filteredItems.length} visible reports</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-sm items-stretch">
                {SECTION_DEFS.map(section => (
                  <SectionBlock
                    key={section.key}
                    section={section}
                    items={sectionItems[section.key] || []}
                    fallbackItems={fallbackItems}
                    onOpen={setSelected}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : (
          <section className="rounded-lg overflow-hidden" style={{ background: '#0d1a26', border: '1px solid rgba(45,61,78,0.82)' }}>
            <div className="px-sm py-sm border-b flex items-center justify-between" style={{ borderBottomColor: 'rgba(45,61,78,0.82)' }}>
              <h2 className="text-[10px] font-bold tracking-widest text-on-surface-variant">ALL AI-CLASSIFIED HEADLINES</h2>
              <span className="text-[10px] font-mono-data text-outline">{filteredItems.length}</span>
            </div>
            <div className="p-sm grid grid-cols-1 lg:grid-cols-2 gap-xs">
              {filteredItems.length ? filteredItems.map(item => (
                <CompactHeadline key={item.id} item={item} onOpen={setSelected} />
              )) : (
                <div className="lg:col-span-2">
                  <EmptyState onClear={() => { setActiveFilters(['All']); setSearch(''); }} />
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <DetailDrawer item={selected} allItems={allItems} onClose={() => setSelected(null)} onOpenItem={setSelected} />
    </div>
  );
}

function EmptyState({ onClear }) {
  return (
    <div className="rounded-lg p-lg text-center" style={{ background: 'rgba(13,26,38,0.72)', border: '1px solid rgba(45,61,78,0.75)' }}>
      <p className="text-[12px] text-on-surface-variant">No intelligence items match the selected filters.</p>
      <button type="button" onClick={onClear} className="mt-sm text-[10px] font-bold text-primary hover:underline">
        Clear filters
      </button>
    </div>
  );
}
