import { useEffect, useMemo, useState } from 'react';

const LAND = [
  "M70 112 L92 88 L130 75 L172 82 L205 103 L230 138 L222 166 L246 186 L229 207 L196 205 L177 227 L158 258 L130 250 L119 215 L92 199 L78 168 L52 150 Z",
  "M160 264 L194 286 L207 326 L195 365 L173 405 L148 374 L134 330 L142 292 Z",
  "M292 63 L329 42 L374 50 L397 72 L371 92 L326 89 Z",
  "M351 105 L390 92 L436 100 L462 123 L444 150 L404 146 L383 130 L350 134 L326 121 Z",
  "M390 156 L437 151 L474 182 L488 229 L475 289 L444 354 L409 324 L388 267 L374 212 Z",
  "M476 170 L522 163 L552 191 L534 224 L491 211 Z",
  "M505 100 L564 84 L631 91 L695 118 L746 160 L733 207 L682 226 L633 209 L589 181 L552 190 L523 163 L462 124 Z",
  "M690 107 L716 115 L727 136 L710 145 Z",
  "M640 293 L698 284 L739 314 L726 359 L673 371 L631 338 Z",
  "M478 284 L494 316 L485 354 L466 326 Z",
];

const HOTSPOTS = [
  { id: 'geo-001', cx: 522, cy: 165, r: 14, color: '#ffb4ab', label: 'HORMUZ', score: '10', dur: '2s', fallbackRegion: 'Strait of Hormuz', region: 'Middle East' },
  { id: 'geo-002', cx: 432, cy: 103, r: 10, color: '#fabc45', label: 'RUSSIA TRANSIT', score: '8.4', dur: '2.5s', fallbackRegion: 'Ukraine / Russia Transit', region: 'Eastern Europe' },
  { id: 'geo-007', cx: 446, cy: 151, r: 10, color: '#fabc45', label: 'E. MEDITERRANEAN', score: '8.7', dur: '2.4s', fallbackRegion: 'Eastern Mediterranean', region: 'Mediterranean' },
  { id: 'geo-003', cx: 473, cy: 201, r: 9, color: '#a2c9ff', label: 'RED SEA', score: '8', dur: '3s', fallbackRegion: 'Red Sea Transit', region: 'Middle East / Africa' },
  { id: 'geo-004', cx: 414, cy: 176, r: 8, color: '#fabc45', label: 'LIBYA', score: '7.4', dur: '3.2s', fallbackRegion: 'Libya', region: 'North Africa' },
  { id: 'geo-008', cx: 456, cy: 177, r: 8, color: '#fabc45', label: 'SUEZ', score: '7.1', dur: '3.5s', fallbackRegion: 'Suez Canal', region: 'Egypt / Middle East' },
  { id: 'geo-006', cx: 385, cy: 234, r: 7, color: '#a2c9ff', label: 'W. AFRICA', score: '6.9', dur: '3.1s', fallbackRegion: 'West Africa Offshore', region: 'West Africa' },
  { id: 'geo-005', cx: 158, cy: 170, r: 7, color: '#a2c9ff', label: 'US GULF', score: '6.6', dur: '3.8s', fallbackRegion: 'US Gulf Coast', region: 'North America' },
];

const CONNECTIONS = [
  { x1: 522, y1: 165, x2: 473, y2: 201 },
  { x1: 473, y1: 201, x2: 456, y2: 177 },
  { x1: 456, y1: 177, x2: 446, y2: 151 },
  { x1: 446, y1: 151, x2: 414, y2: 176 },
  { x1: 446, y1: 151, x2: 432, y2: 103 },
  { x1: 385, y1: 234, x2: 414, y2: 176 },
  { x1: 158, y1: 170, x2: 385, y2: 234 },
];

const RISK_LEGEND = [
  { label: 'LOW', color: '#9aa3b0' },
  { label: 'MODERATE', color: '#a2c9ff' },
  { label: 'HIGH', color: '#fabc45' },
  { label: 'CRITICAL', color: '#ffb4ab' },
];

function SparkLine({ seed = 0, trend = 'up' }) {
  const pts = useMemo(() => {
    const base = [8, 10, 6, 12, 8, 14, 10, 16, 12, 18, 14, 20];
    const inv = [20, 18, 16, 14, 12, 10, 8, 10, 8, 6, 8, 6];
    const vol = [10, 6, 16, 8, 18, 10, 20, 8, 16, 10, 18, 12];
    const raw = trend === 'down' ? inv : trend === 'volatile' ? vol : base;
    return raw.map((v, i) => [i * 8, 24 - (v + (seed % 3))]);
  }, [seed, trend]);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x},${y}`).join(' ');
  const col = trend === 'up' ? '#ff6b6b' : trend === 'down' ? '#4ade80' : '#fabc45';
  return (
    <svg width="88" height="24" viewBox="0 0 88 24" style={{ flexShrink: 0 }}>
      <path d={d} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={col} />
    </svg>
  );
}

function onKeyOpen(e, fn) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
}

function ClickableCard({ title, children, onOpen, actionLabel = 'Open detail' }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => onKeyOpen(e, onOpen)}
      className="dashboard-insight-card dashboard-insight-clickable px-md py-sm flex flex-col"
      aria-label={`${title} detail`}
    >
      {children}
      <span className="mt-sm text-[9px] text-primary text-left">{actionLabel} -&gt;</span>
    </div>
  );
}

function WhatChangedCard({ items, onOpen }) {
  const events = (items || []).slice(0, 3).map((item, i) => ({
    dot: ['#ff453a', '#fabc45', '#60a5fa'][i],
    title: item.countryOrArea || item.label,
    desc: item.eventType || item.marketImpact || 'Risk conditions elevated',
    time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ['1h ago', '3h ago', '6h ago'][i],
  }));
  if (!events.length) events.push(
    { dot: '#ff453a', title: 'Strait of Hormuz escalation', desc: 'Military posture and tanker tracking anomalies detected.', time: '1h ago' },
    { dot: '#fabc45', title: 'Libya production disruption', desc: 'Field output risk remains active.', time: '3h ago' },
    { dot: '#60a5fa', title: 'US Gulf refinery maintenance', desc: 'Utilization cuts lifting crack-spread sensitivity.', time: '6h ago' },
  );
  return (
    <ClickableCard title="What Changed" onOpen={onOpen} actionLabel="View all changes">
      <div className="flex items-center justify-between mb-sm shrink-0">
        <span className="text-[9px] font-bold tracking-[2px] text-outline">WHAT CHANGED</span>
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-outline-variant text-outline">24H</span>
      </div>
      <div className="flex-1 flex flex-col gap-xs">
        {events.map((e, i) => (
          <div key={i} className="flex gap-xs items-start">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: e.dot, flexShrink: 0, marginTop: 4, boxShadow: `0 0 6px ${e.dot}88` }} />
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold text-on-surface leading-snug">{e.title}</p>
              <p className="text-[9px] text-outline leading-snug line-clamp-1">{e.desc}</p>
              <p className="text-[8.5px] text-outline mt-0.5">{e.time}</p>
            </div>
          </div>
        ))}
      </div>
    </ClickableCard>
  );
}

function WhyItMattersCard({ criticalN, onOpen }) {
  const rows = [
    { label: 'Supply at Risk', desc: criticalN >= 1 ? `Critical chokepoint risk active across ${criticalN} zone(s).` : 'Seaborne crude and product flows remain exposed.', badge: 'HIGH', col: '#ff453a' },
    { label: 'Price Sensitivity', desc: `Brent and refined products are sensitive to route disruption headlines.`, badge: 'HIGH', col: '#fabc45' },
    { label: 'Trade Flow Impact', desc: 'Insurance, voyage length, and rerouting costs can widen delivered fuel margins.', badge: 'HIGH', col: '#fabc45' },
  ];
  return (
    <ClickableCard title="Why It Matters" onOpen={onOpen} actionLabel="View full analysis">
      <div className="flex items-center gap-xs mb-sm shrink-0">
        <span className="text-[9px] font-bold tracking-[2px] text-outline">WHY IT MATTERS</span>
      </div>
      <div className="flex-1 flex flex-col gap-sm">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start justify-between gap-xs">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold text-on-surface leading-snug">{r.label}</p>
              <p className="text-[9px] text-outline leading-snug">{r.desc}</p>
            </div>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0" style={{ color: r.col, background: `${r.col}18`, borderColor: `${r.col}40` }}>{r.badge}</span>
          </div>
        ))}
      </div>
    </ClickableCard>
  );
}

function TopWatchCard({ items, onOpen }) {
  const watches = (items || []).slice(0, 4).map((item, i) => ({
    rank: i + 1,
    label: item.countryOrArea || item.label,
    desc: item.eventType || item.priceImpactHint || 'Risk elevated',
    trend: i === 0 ? 'up' : i === 1 ? 'volatile' : i === 2 ? 'up' : 'volatile',
    seed: i,
  }));
  if (!watches.length) ['Strait of Hormuz', 'Russia Transit Routes', 'Red Sea Security', 'Nigeria Production'].forEach((label, i) => watches.push({ rank: i + 1, label, desc: 'Watch trigger confirmation', trend: i % 2 ? 'volatile' : 'up', seed: i }));
  return (
    <ClickableCard title="Top Watch Items" onOpen={onOpen} actionLabel="See all watch items">
      <div className="flex items-center justify-between mb-sm shrink-0">
        <span className="text-[9px] font-bold tracking-[2px] text-outline">TOP WATCH ITEMS</span>
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-outline-variant text-outline">7D TREND</span>
      </div>
      <div className="flex-1 flex flex-col gap-xs">
        {watches.map((w, i) => (
          <div key={i} className="flex items-center gap-xs">
            <span className="text-[9px] text-outline font-mono-data w-3 shrink-0">{w.rank}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold text-on-surface truncate">{w.label}</p>
              <p className="text-[9px] text-outline truncate">{w.desc}</p>
            </div>
            <SparkLine seed={w.seed} trend={w.trend} />
          </div>
        ))}
      </div>
    </ClickableCard>
  );
}

function BusinessImpactCard({ criticalN, highN, onOpen }) {
  const isHigh = criticalN >= 1 || highN >= 3;
  const impacts = [
    { label: 'Refiners', desc: 'Margin volatility likely', badge: isHigh ? 'HIGH' : 'MEDIUM', col: isHigh ? '#ff453a' : '#fabc45' },
    { label: 'Traders', desc: 'Inventory and freight costs rise', badge: isHigh ? 'HIGH' : 'MEDIUM', col: isHigh ? '#ff453a' : '#fabc45' },
    { label: 'Producers', desc: 'Revenue exposed to price swing', badge: 'MEDIUM', col: '#fabc45' },
    { label: 'Shippers', desc: 'Rerouting and delays increase', badge: 'MEDIUM', col: '#fabc45' },
    { label: 'Airlines', desc: 'Jet fuel cost pressure', badge: isHigh ? 'HIGH' : 'MEDIUM', col: isHigh ? '#ff453a' : '#fabc45' },
  ];
  return (
    <ClickableCard title="Business Impact" onOpen={onOpen} actionLabel="View sector breakdown">
      <div className="flex items-center justify-between mb-sm shrink-0">
        <span className="text-[9px] font-bold tracking-[2px] text-outline">BUSINESS IMPACT</span>
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-outline-variant text-outline">NEXT 30D</span>
      </div>
      <div className="flex-1 flex flex-col gap-xs">
        {impacts.map((imp, i) => (
          <div key={i} className="flex items-center justify-between gap-xs">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold text-on-surface truncate">{imp.label}</p>
              <p className="text-[9px] text-outline truncate">{imp.desc}</p>
            </div>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0" style={{ color: imp.col, background: `${imp.col}18`, borderColor: `${imp.col}40` }}>{imp.badge}</span>
          </div>
        ))}
      </div>
    </ClickableCard>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg p-sm" style={{ background: 'rgba(13,26,38,0.55)', border: '1px solid rgba(45,61,78,0.65)' }}>
      <p className="text-[9px] font-bold tracking-widest text-outline mb-xs">{label}</p>
      <p className="text-[11px] text-on-surface-variant leading-relaxed">{value || 'Monitor for confirmation.'}</p>
    </div>
  );
}

function GeoMapDetailDrawer({ open, detail, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open || !detail) return null;

  const title = {
    changed: 'What Changed',
    matters: 'Why It Matters',
    watch: 'Top Watch Items',
    business: 'Business Impact',
  }[detail.type] || 'Geo-Risk Detail';

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer drawer-open flex flex-col" aria-modal="true" role="dialog">
        <div className="flex items-center justify-between p-md border-b border-outline-variant shrink-0">
          <div>
            <h3 className="text-headline-sm font-bold">{title}</h3>
            <p className="text-[10px] text-outline mt-0.5">Global geopolitical risk map intelligence</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors p-xs" aria-label="Close detail">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-md space-y-md">
          {detail.sections.map((section, idx) => (
            <section key={idx}>
              <p className="text-[10px] font-bold tracking-widest text-primary mb-sm">{section.title}</p>
              <div className="space-y-sm">
                {section.rows.map((row, i) => <DetailRow key={i} label={row.label} value={row.value} />)}
              </div>
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}

function relatedHeadlines(feed, risk) {
  if (!risk) return [];
  return (feed || []).filter(h => {
    const text = `${h.headline || h.title || ''} ${h.whyItMatters || ''} ${(h.relatedRegions || []).join(' ')}`.toLowerCase();
    return [risk.countryOrArea, risk.region, ...(risk.affectedSectors || [])].filter(Boolean).some(v => text.includes(String(v).toLowerCase().split('/')[0].trim()));
  }).slice(0, 3);
}

function buildFallbackRisk(hs) {
  return {
    id: hs.id,
    countryOrArea: hs.fallbackRegion,
    region: hs.region,
    riskScore: Number(hs.score) || 6.5,
    riskLevel: Number(hs.score) >= 9 ? 'Critical' : Number(hs.score) >= 7 ? 'High' : 'Moderate',
    eventType: `${hs.label} risk signal`,
    affectedSectors: ['Crude Oil', 'Refined Products', 'Natural Gas'],
    marketImpact: 'Potential route, insurance, supply, or delivered-cost pressure for energy markets.',
    whyItMatters: 'This hotspot is part of the tactical map watchlist and can alter fuel, freight, or supply-risk premia if confirmed by live headlines.',
    priceImpactHint: 'Watch confirmation through crude, diesel, freight, and gold.',
    source: 'GEI Tactical Map',
    timestamp: new Date().toISOString(),
  };
}

export default function GeoRiskSection({ geoRiskItems, onRiskClick, intelligenceFeed }) {
  const [detail, setDetail] = useState(null);
  const items = geoRiskItems || [];
  const feed = intelligenceFeed || [];
  const sorted = useMemo(() => [...items].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0)), [items]);
  const critical = useMemo(() => items.filter(i => (i.riskLevel || '').toLowerCase() === 'critical').length, [items]);
  const high = useMemo(() => items.filter(i => (i.riskLevel || '').toLowerCase() === 'high').length, [items]);
  const topRisk = sorted[0];

  const hotspots = useMemo(() => HOTSPOTS.map(hs => {
    const live = items.find(r => r.id === hs.id || (r.countryOrArea || '').toLowerCase().includes(hs.fallbackRegion.toLowerCase().split(' ')[0]));
    if (!live) return hs;
    const scoreStr = live.riskScore != null ? String(live.riskScore) : hs.score;
    const col = (live.riskLevel || '').toLowerCase() === 'critical' ? '#ffb4ab'
      : (live.riskLevel || '').toLowerCase() === 'high' ? '#fabc45'
      : '#a2c9ff';
    return { ...hs, score: scoreStr, color: col };
  }), [items]);

  const openCard = type => {
    const related = relatedHeadlines(feed, topRisk).map(h => h.headline || h.title).join(' | ');
    const watch = sorted.slice(0, 4);
    const sectors = [...new Set(sorted.flatMap(i => i.affectedSectors || []))].slice(0, 6).join(', ');
    const common = {
      changed: [
        { title: 'Latest Geo-Risk Changes', rows: (watch.length ? watch : [buildFallbackRisk(HOTSPOTS[0])]).map(r => ({ label: r.countryOrArea, value: `${r.riskLevel || 'Moderate'} severity, ${r.region || 'Global'}; affected commodities: ${(r.affectedSectors || []).join(', ') || 'Crude Oil, Refined Products'}; watch: ${r.priceImpactHint || r.eventType}` })) },
        { title: 'Context', rows: [{ label: 'Timestamp', value: topRisk?.timestamp ? new Date(topRisk.timestamp).toLocaleString() : new Date().toLocaleString() }, { label: 'Why the change matters', value: topRisk?.whyItMatters || topRisk?.marketImpact }, { label: 'Related headlines', value: related || 'No directly linked headlines in current feed.' }] },
      ],
      matters: [
        { title: 'Market Transmission', rows: [{ label: 'Supply impact', value: topRisk?.marketImpact || 'Potential supply or transit disruption risk for crude, refined products, LNG, and power-linked markets.' }, { label: 'Price sensitivity', value: 'Crude, diesel, freight, and gold should be watched for confirmation; P&L sensitivity rises when route risk and safe-haven signals move together.' }, { label: 'Trade flow impact', value: 'Rerouting, war-risk insurance, tanker availability, and voyage time can raise delivered fuel costs even without a physical shortage.' }] },
        { title: 'Interpretation', rows: [{ label: 'Affected businesses', value: 'Airlines, refiners, logistics, utilities, fuel distributors, manufacturers, and agriculture/fertilizer users.' }, { label: 'Affected consumers', value: 'Pump prices, travel tickets, utility bills, and grocery/freight costs can pass through with a 2-8 week lag.' }, { label: 'AI interpretation', value: 'Risk is elevated but still needs price confirmation through crude, gold, freight, and affected commodity spreads.' }] },
      ],
      watch: [
        { title: 'Ranked Watchlist', rows: (watch.length ? watch : HOTSPOTS.slice(0, 4).map(buildFallbackRisk)).map((r, i) => ({ label: `#${i + 1} ${r.countryOrArea}`, value: `Region/signal: ${r.region || r.eventType}. Urgency: ${r.riskLevel}. Commodity: ${(r.affectedSectors || [])[0] || 'Crude Oil'}. Trigger: ${r.priceImpactHint || r.eventType}. Possible outcome: ${r.marketImpact || 'Risk premium repricing.'}` })) },
      ],
      business: [
        { title: 'Sector Exposure', rows: [{ label: 'Affected sectors', value: sectors || 'Airlines, logistics, refiners, utilities, fuel distributors, manufacturers.' }, { label: 'Severity', value: critical ? 'Critical: active high-impact chokepoint or supply-route risk.' : high ? 'High: elevated watch posture.' : 'Moderate: monitor for confirmation.' }, { label: 'Cost pressure', value: 'Fuel, freight, insurance, feedstock, and power costs are the primary cost channels.' }] },
        { title: 'Operating Posture', rows: [{ label: 'Margin impact', value: 'Refiners and fuel distributors face spread volatility; airlines and logistics face direct fuel-cost pressure.' }, { label: 'Supply risk', value: 'Watch physical flow disruptions, storage buffers, vessel rerouting, and policy response.' }, { label: 'Recommended posture', value: critical || high ? 'HEDGE / MONITOR: lock exposed fuel and freight costs around confirmed triggers.' : 'MONITOR: wait for price and headline confirmation.' }, { label: 'Watch item', value: topRisk?.priceImpactHint || 'Brent, diesel crack spread, tanker flow, freight rates, and gold safe-haven confirmation.' }] },
      ],
    };
    setDetail({ type, sections: common[type] });
  };

  const handleHotspot = hs => {
    const risk = items.find(r => r.id === hs.id) || buildFallbackRisk(hs);
    onRiskClick?.(risk);
  };

  const latestTs = sorted.map(r => r.timestamp).filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0];
  const updatedLabel = latestTs ? new Date(latestTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' UTC' : '2 min ago';

  return (
    <div className="dashboard-map-card overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm px-md py-sm shrink-0" style={{ borderBottom: '1px solid rgba(88,166,255,0.08)' }}>
        <div>
          <h2 className="text-[14px] font-bold tracking-wide text-on-surface">Global Geopolitical Risk Map</h2>
          <p className="text-[10px] text-outline mt-0.5">AI-assessed energy risk across active geo-risk zones</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm sm:justify-end">
          {RISK_LEGEND.map(l => (
            <span key={l.label} className="inline-flex items-center gap-xs text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 8px ${l.color}55` }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden flex-1 map-container dashboard-map-stage">
        <div className="scanline" />
        <div className="absolute inset-0 geo-grid-overlay opacity-80" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-90 dashboard-map-svg">
            <defs>
              <pattern id="tac-grid" width="80" height="45" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 45" fill="none" stroke="#414752" strokeWidth="0.45" />
              </pattern>
              <linearGradient id="tac-land" x1="0" x2="1">
                <stop offset="0" stopColor="#1b2a35" />
                <stop offset="1" stopColor="#253441" />
              </linearGradient>
              <filter id="tac-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <rect width="800" height="450" fill="url(#tac-grid)" opacity="0.55" />
            {LAND.map((d, i) => <path key={i} d={d} fill="url(#tac-land)" stroke="#5d6774" strokeWidth="1.1" />)}
            {CONNECTIONS.map((c, i) => <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="#a2c9ff" strokeWidth="0.5" strokeDasharray="4 5" opacity="0.32" />)}
            {hotspots.map(hs => (
              <g key={hs.id} role="button" tabIndex={0} aria-label={`${hs.label} risk detail`} style={{ cursor: 'pointer', outline: 'none' }} onClick={() => handleHotspot(hs)} onKeyDown={e => onKeyOpen(e, () => handleHotspot(hs))}>
                <circle cx={hs.cx} cy={hs.cy} r={hs.r} fill={`${hs.color}22`} stroke={hs.color} strokeWidth="1">
                  <animate attributeName="r" values={`${hs.r - 3};${hs.r + 4};${hs.r - 3}`} dur={hs.dur} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.25;0.8" dur={hs.dur} repeatCount="indefinite" />
                </circle>
                <circle cx={hs.cx} cy={hs.cy} r={Math.max(3, hs.r - 8)} fill={hs.color} filter="url(#tac-glow)" />
                <text x={hs.cx + hs.r + 5} y={hs.cy - 3} fill={hs.color} fontSize="9.5" fontFamily="IBM Plex Mono, monospace" fontWeight="700" letterSpacing="0.3" style={{ pointerEvents: 'none' }}>{hs.label}</text>
                <text x={hs.cx + hs.r + 5} y={hs.cy + 10} fill={hs.color} fontSize="11" fontFamily="IBM Plex Mono, monospace" fontWeight="800" style={{ pointerEvents: 'none' }}>{hs.score}</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="absolute left-md bottom-md flex flex-wrap items-center gap-xs z-10">
          <div className="px-sm py-xs rounded border flex items-center gap-xs" style={{ background: 'rgba(11,20,28,0.82)', borderColor: 'rgba(88,166,255,0.28)', backdropFilter: 'blur(4px)' }}>
            <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#4ade80' }} />
            <span className="text-[10px] font-mono-data text-primary">FEED: SAT_ALPHA_47_LIVE</span>
          </div>
          <div className="px-sm py-xs rounded border" style={{ background: 'rgba(11,20,28,0.72)', borderColor: 'rgba(65,71,82,0.6)', backdropFilter: 'blur(4px)' }}>
            <span className="text-[10px] font-mono-data text-on-surface-variant">UPDATED: {updatedLabel}</span>
          </div>
        </div>
        <div className="absolute top-sm right-sm flex items-center gap-xs z-10">
          {['SAT', 'AIS', 'FLOW'].map(tag => <span key={tag} className="text-[9px] font-bold text-primary border border-primary-container/30 bg-primary-container/10 px-sm py-xs rounded">{tag}</span>)}
        </div>
        <div className="absolute top-sm left-md z-10">
          <span className="text-[10px] text-outline bg-surface-container/60 px-sm py-xs rounded border border-outline-variant/50">Click hotspots for detail</span>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-xs shrink-0" style={{ borderTop: '1px solid rgba(88,166,255,0.07)', padding: '8px 8px 0' }}>
        <WhatChangedCard items={sorted} onOpen={() => openCard('changed')} />
        <WhyItMattersCard criticalN={critical} onOpen={() => openCard('matters')} />
        <TopWatchCard items={sorted} onOpen={() => openCard('watch')} />
        <BusinessImpactCard criticalN={critical} highN={high} onOpen={() => openCard('business')} />
      </div>
      <GeoMapDetailDrawer open={!!detail} detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
