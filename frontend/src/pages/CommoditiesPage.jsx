import { useState } from 'react';
import { getSentimentLabel, getSentimentBorderTop, getDirectionColorClass, getImpactBadge } from '../utils/helpers.js';

const SECTOR_TABS = ['All', 'Crude Oil', 'Natural Gas', 'Refined Products', 'Power', 'Renewables'];

// Cross-market signal relevance descriptions
const CROSS_RELEVANCE = {
  GOLD:     { label: 'Geopolitical / Safe Haven',    sectors: ['Crude Oil','Natural Gas'],              description: 'Rising gold signals risk premium — bullish for crude in geo-stress scenarios.' },
  SILVER:   { label: 'Haven + Industrial Hybrid',    sectors: ['Renewables','Crude Oil','Power'],       description: 'Safe-haven + industrial (solar, EVs) — signals geopolitical risk AND clean energy demand.' },
  COPPER:   { label: 'Industrial Demand Proxy',      sectors: ['Power','Renewables','Crude Oil'],       description: 'Copper weakness signals China/EM demand slowdown — bearish for industrial energy.' },
  WHEAT:    { label: 'Food Inflation / Supply Chain', sectors: ['Natural Gas','Refined Products'],      description: 'Black Sea risk feeds broad inflation pressure, lifting energy demand expectations.' },
  URANIUM:  { label: 'Nuclear Security / Energy Mix', sectors: ['Power','Natural Gas'],                 description: 'Rising uranium signals nuclear renaissance — long-term bearish for gas-for-power.' },
  LITHIUM:  { label: 'EV / Battery Chain',           sectors: ['Renewables','Power'],                   description: 'EV battery demand proxy — structurally bearish for transport fuel long-term.' },
  COAL:     { label: 'Fallback Fuel Stress',         sectors: ['Power','Natural Gas'],                  description: 'Rising coal = power sector stress + high-cost energy demand, gas displacement pressure.' },
  CARBON:   { label: 'Policy / Compliance Signal',   sectors: ['Power','Natural Gas','Crude Oil'],      description: 'EU ETS carbon price sets the coal-to-gas switching threshold. Bearish ETS = less switching.' },
  ALUMINUM: { label: 'Energy-Intensive Metals',      sectors: ['Power','Renewables','Crude Oil'],       description: 'Aluminum smelting is highly energy-intensive — rising demand signals grid load pressure.' },
  FREIGHT:  { label: 'Crude/LNG Transport Cost',     sectors: ['Crude Oil','Refined Products','Natural Gas'], description: 'BDI decline signals weakening bulk commodity demand, reducing crude/LNG transport pressure.' },
};

// Per-sector key driver data (static, AI-derived)
const SECTOR_DRIVERS = {
  'Crude Oil': [
    { name: 'OPEC+ Policy Shift',       pct: 28, dir: 'up' },
    { name: 'Geopolitical Risk',         pct: 24, dir: 'up' },
    { name: 'Inventory Draws',           pct: 18, dir: 'up' },
    { name: 'Shipping Disruption',       pct: 14, dir: 'up' },
    { name: 'Demand Slowdown Risk',      pct: 16, dir: 'down' },
  ],
  'Natural Gas': [
    { name: 'EU Storage Surplus',        pct: 32, dir: 'down' },
    { name: 'LNG Export Disruption',     pct: 22, dir: 'up' },
    { name: 'Gas-for-Power Demand',      pct: 18, dir: 'up' },
    { name: 'Pipeline Transit Risk',     pct: 15, dir: 'up' },
    { name: 'Mild Weather Demand',       pct: 13, dir: 'down' },
  ],
  'Refined Products': [
    { name: 'Diesel Crack Spread',       pct: 30, dir: 'up' },
    { name: 'Gulf Refinery Maint.',      pct: 25, dir: 'up' },
    { name: 'Red Sea Freight Cost',      pct: 20, dir: 'up' },
    { name: 'Summer Driving Demand',     pct: 15, dir: 'up' },
    { name: 'Crude Input Cost',          pct: 10, dir: 'up' },
  ],
  'Power': [
    { name: 'French Nuclear Outage',     pct: 28, dir: 'up' },
    { name: 'Gas-for-Power Link',        pct: 24, dir: 'up' },
    { name: 'Renewable Output Record',   pct: 20, dir: 'down' },
    { name: 'Interconnector Flows',      pct: 18, dir: 'down' },
    { name: 'Industrial Load',           pct: 10, dir: 'up' },
  ],
  'Renewables': [
    { name: 'Record Solar Output',       pct: 35, dir: 'up' },
    { name: 'Wind Capacity Expansion',   pct: 25, dir: 'up' },
    { name: 'Policy Tailwinds (UK/EU)',  pct: 20, dir: 'up' },
    { name: 'Grid Constraint Risk',      pct: 12, dir: 'down' },
    { name: 'Storage Cost Decline',      pct: 8,  dir: 'up' },
  ],
};

// Cross-market sector driver data
const CROSS_MARKET_DRIVERS = {
  'Gold': [
    { name: 'Safe-Haven Demand',      pct: 35, dir: 'up' },
    { name: 'USD Inverse Pressure',   pct: 25, dir: 'up' },
    { name: 'Central Bank Buying',    pct: 22, dir: 'up' },
    { name: 'Inflation Expectations', pct: 18, dir: 'up' },
  ],
  'Silver': [
    { name: 'Safe-Haven Bid',         pct: 30, dir: 'up' },
    { name: 'Solar Industrial Demand',pct: 28, dir: 'up' },
    { name: 'Gold/Silver Ratio',      pct: 22, dir: 'up' },
    { name: 'EV Battery Demand',      pct: 20, dir: 'up' },
  ],
  'Copper': [
    { name: 'China PMI Weakness',     pct: 34, dir: 'down' },
    { name: 'EM Demand Slowdown',     pct: 26, dir: 'down' },
    { name: 'EV Supply Chain',        pct: 22, dir: 'up' },
    { name: 'Renewable Infra Build',  pct: 18, dir: 'up' },
  ],
  'Aluminum': [
    { name: 'EU Power Cost',          pct: 32, dir: 'up' },
    { name: 'Smelter Curtailments',   pct: 26, dir: 'up' },
    { name: 'China Export Pressure',  pct: 24, dir: 'down' },
    { name: 'Automotive Demand',      pct: 18, dir: 'down' },
  ],
  'BDI / Freight': [
    { name: 'Global Trade Volume',    pct: 35, dir: 'down' },
    { name: 'Red Sea Re-routing',     pct: 28, dir: 'up' },
    { name: 'Fleet Oversupply',       pct: 22, dir: 'down' },
    { name: 'Bunker Fuel Costs',      pct: 15, dir: 'up' },
  ],
  'Uranium': [
    { name: 'Nuclear Policy Tailwinds',pct: 35, dir: 'up' },
    { name: 'Supply Deficit Building', pct: 28, dir: 'up' },
    { name: 'SMR Pipeline Demand',     pct: 22, dir: 'up' },
    { name: 'Kazakh Supply Risk',      pct: 15, dir: 'up' },
  ],
  'Lithium': [
    { name: 'Mine Oversupply Cycle',   pct: 38, dir: 'down' },
    { name: 'EV Demand Slowing',       pct: 28, dir: 'down' },
    { name: 'Battery Tech Shift',      pct: 20, dir: 'down' },
    { name: 'Policy Support (IRA)',    pct: 14, dir: 'up' },
  ],
  'Wheat': [
    { name: 'Black Sea Supply Risk',  pct: 32, dir: 'up' },
    { name: 'Weather Disruption',     pct: 26, dir: 'up' },
    { name: 'Food Demand Stable',     pct: 22, dir: 'up' },
    { name: 'Ukraine Export Corridor',pct: 20, dir: 'down' },
  ],
  'EU Carbon / EUA': [
    { name: 'Industrial Demand Weak', pct: 34, dir: 'down' },
    { name: 'ETS Policy Tightening',  pct: 28, dir: 'up' },
    { name: 'Coal-to-Gas Switching',  pct: 22, dir: 'down' },
    { name: 'Renewable Record Output',pct: 16, dir: 'down' },
  ],
  'Coal': [
    { name: 'Asia Thermal Demand',    pct: 32, dir: 'up' },
    { name: 'EU Phase-Out Policy',    pct: 28, dir: 'down' },
    { name: 'LNG Competition',        pct: 22, dir: 'down' },
    { name: 'Sea Route Costs',        pct: 18, dir: 'up' },
  ],
};

const CROSS_MARKET_STATUS = {
  'Gold':           { label: 'Bullish',     colorClass: 'text-primary',            borderClass: 'border-primary/40' },
  'Silver':         { label: 'Bullish',     colorClass: 'text-primary',            borderClass: 'border-primary/40' },
  'Copper':         { label: 'Bearish',     colorClass: 'text-error',              borderClass: 'border-error/40' },
  'Aluminum':       { label: 'Steady',      colorClass: 'text-on-surface-variant', borderClass: 'border-outline-variant' },
  'BDI / Freight':  { label: 'Volatile',    colorClass: 'text-tertiary',           borderClass: 'border-tertiary/40' },
  'Uranium':        { label: 'Bullish',     colorClass: 'text-primary',            borderClass: 'border-primary/40' },
  'Lithium':        { label: 'Bearish',     colorClass: 'text-error',              borderClass: 'border-error/40' },
  'Wheat':          { label: 'Risk-Off',    colorClass: 'text-tertiary',           borderClass: 'border-tertiary/40' },
  'EU Carbon / EUA':{ label: 'Bearish',     colorClass: 'text-error',              borderClass: 'border-error/40' },
  'Coal':           { label: 'Demand Watch',colorClass: 'text-on-surface-variant', borderClass: 'border-outline-variant' },
};

const CROSS_MARKET_SECTORS = ['Gold', 'Silver', 'Copper', 'Aluminum', 'BDI / Freight', 'Uranium', 'Lithium', 'Wheat', 'EU Carbon / EUA', 'Coal'];

// Cross-market impact matrix: energy sector rows × signal columns
// H = high, M = moderate, L = low, - = none
const LINKAGE_MATRIX = {
  'Crude Oil':        { GOLD:'H', SILVER:'M', COPPER:'M', WHEAT:'L', URANIUM:'-', LITHIUM:'-', COAL:'-',  CARBON:'M', ALUMINUM:'L', FREIGHT:'H' },
  'Natural Gas':      { GOLD:'M', SILVER:'-', COPPER:'-', WHEAT:'M', URANIUM:'H', LITHIUM:'-', COAL:'H',  CARBON:'H', ALUMINUM:'-', FREIGHT:'H' },
  'Refined Products': { GOLD:'-', SILVER:'-', COPPER:'-', WHEAT:'M', URANIUM:'-', LITHIUM:'-', COAL:'-',  CARBON:'M', ALUMINUM:'-', FREIGHT:'H' },
  'Power':            { GOLD:'-', SILVER:'M', COPPER:'H', WHEAT:'-', URANIUM:'H', LITHIUM:'M', COAL:'H',  CARBON:'H', ALUMINUM:'H', FREIGHT:'-' },
  'Renewables':       { GOLD:'-', SILVER:'H', COPPER:'H', WHEAT:'-', URANIUM:'-', LITHIUM:'H', COAL:'-',  CARBON:'M', ALUMINUM:'M', FREIGHT:'-' },
};

// Static key market metrics
const MARKET_METRICS = [
  { label: 'Brent–WTI Spread',    value: '$3.73', unit: '/bbl',   status: 'Elevated',  statusColor: 'text-tertiary', note: 'US domestic tightness vs global' },
  { label: 'Diesel Crack Spread', value: '$28.40', unit: '/bbl',  status: 'Wide',      statusColor: 'text-primary', note: 'Summer demand + Gulf maint.' },
  { label: 'EU Gas Storage',      value: '62%',   unit: ' full',  status: 'Below Avg', statusColor: 'text-tertiary', note: 'Injection pace slowing' },
  { label: 'EU Carbon (ETS)',     value: '€64.20', unit: '/t',    status: 'Falling',   statusColor: 'text-error',   note: 'Lower switching incentive' },
  { label: 'EU Renewable Mix',    value: '38%',   unit: ' of grid', status: 'Record',  statusColor: 'text-primary', note: 'Solar + wind combined' },
  { label: 'Brent Volatility',    value: '24.1',  unit: ' (IV)',   status: 'Rising',   statusColor: 'text-tertiary', note: 'Options premium expanding' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function MiniSparkline({ data, direction, w = 60, h = 24 }) {
  if (!data?.length || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = direction === 'up' ? '#58a6ff' : direction === 'down' ? '#ff6b6b' : '#c0c7d4';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function SparkBars({ data, sentiment }) {
  if (!data?.length) return null;
  const max = Math.max(...data);
  const colorMap = { Bullish: '#58a6ff', Bearish: '#ff6b6b', Volatile: '#fabc45', Steady: '#c0c7d4', Expanding: '#a2c9ff', Neutral: '#c0c7d4' };
  const col = colorMap[sentiment] || '#c0c7d4';
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.slice(-8).map((v, i, arr) => {
        const h = Math.max(2, Math.round((v / max) * 32));
        const opacity = (0.3 + 0.7 * (i / arr.length)).toFixed(2);
        return <div key={i} style={{ flex: 1, height: h, background: col, borderRadius: 1, opacity }} />;
      })}
    </div>
  );
}

function MiniBar({ value, max = 100, colorClass = 'bg-primary' }) {
  return (
    <div className="flex-1 bg-outline-variant h-1 rounded-full overflow-hidden">
      <div className={`${colorClass} h-full rounded-full`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

function DriverBar({ name, pct, dir }) {
  const color = dir === 'up' ? '#58a6ff' : dir === 'down' ? '#ff6b6b' : '#8690a0';
  const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→';
  const dirLabel = dir === 'up' ? 'SUPPORTIVE' : dir === 'down' ? 'PRESSURING' : 'NEUTRAL';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] text-on-surface truncate flex items-center gap-1.5">
          <span className="font-mono-data font-bold text-[14px]" style={{ color }}>{arrow}</span>
          {name}
        </span>
        <span className="flex items-center gap-sm shrink-0 ml-sm">
          <span className="text-[9px] font-bold tracking-wider hidden md:inline" style={{ color: `${color}aa` }}>{dirLabel}</span>
          <span className="text-[13px] font-mono-data font-bold" style={{ color }}>{pct}%</span>
        </span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 10, background: '#1a2c3d' }}>
        <div className="bar-fill h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
      </div>
    </div>
  );
}

function LinkageCell({ level }) {
  if (!level || level === '-') return <div className="flex items-center justify-center h-full"><span className="text-[9px] text-outline/40">—</span></div>;
  const map = {
    H: { bg: 'bg-primary-container/40', text: 'text-primary', label: 'H' },
    M: { bg: 'bg-tertiary-container/30', text: 'text-tertiary', label: 'M' },
    L: { bg: 'bg-outline-variant/30', text: 'text-on-surface-variant', label: 'L' },
  };
  const s = map[level] || map.L;
  return (
    <div className={`flex items-center justify-center h-full rounded-sm ${s.bg}`}>
      <span className={`text-[9px] font-bold ${s.text}`}>{s.label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CommoditiesPage({ data, onSectorClick, onTickerClick, onSignalClick }) {
  const [activeSector, setActiveSector] = useState('All');
  const [showAllHeadlines, setShowAllHeadlines] = useState({});
  const [driverPage, setDriverPage] = useState(0);
  const { sectorScores = [], tickerItems = [], intelligenceFeed = [], crossMarketSignals = [] } = data || {};

  const filtered = sectorScores.filter(s => activeSector === 'All' || s.sector === activeSector);
  const allSectors = ['Crude Oil', 'Natural Gas', 'Refined Products', 'Power', 'Renewables'];
  const driverSectors = activeSector === 'All'
    ? [...allSectors, ...CROSS_MARKET_SECTORS]
    : allSectors.includes(activeSector) ? [activeSector] : [activeSector];
  const sectorsPerPage = 6;
  const totalDriverPages = Math.max(1, Math.ceil(driverSectors.length / sectorsPerPage));
  const currentDriverPage = Math.min(driverPage, totalDriverPages - 1);
  const visibleDriverSectors = driverSectors.slice(
    currentDriverPage * sectorsPerPage,
    currentDriverPage * sectorsPerPage + sectorsPerPage
  );
  const driverStart = driverSectors.length ? currentDriverPage * sectorsPerPage + 1 : 0;
  const driverEnd = Math.min(driverSectors.length, currentDriverPage * sectorsPerPage + visibleDriverSectors.length);
  const canPrevDriver = currentDriverPage > 0;
  const canNextDriver = currentDriverPage < totalDriverPages - 1;
  const signalIds = crossMarketSignals.map(s => s.id);

  const toggleHeadlines = (sector) => setShowAllHeadlines(prev => ({ ...prev, [sector]: !prev[sector] }));

  return (
    <div className="page-enter">
      <main className="max-w-[1920px] mx-auto p-md space-y-md">

        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-sm">
          <div>
            <h2 className="text-headline-sm font-bold">Commodity & Sector Intelligence</h2>
            <p className="text-body-sm text-on-surface-variant mt-xs">Deep sector research · {sectorScores.length} sectors · {crossMarketSignals.length} cross-market signals · AI-scored</p>
          </div>
          <div className="flex gap-xs">
            <span className="text-[10px] font-mono-data text-outline px-2 py-0.5 border border-outline-variant rounded">AI-SCORED</span>
            <span className="text-[10px] font-mono-data text-outline px-2 py-0.5 border border-outline-variant rounded">RESEARCH VIEW</span>
          </div>
        </div>

        {/* Sector filter tabs */}
        <div className="flex flex-wrap gap-xs">
          {SECTOR_TABS.map(s => (
            <button
              key={s}
              onClick={() => { setActiveSector(s); setDriverPage(0); }}
              className={`text-[11px] px-sm py-xs font-bold rounded-sm border transition-colors ${activeSector === s ? 'border-primary bg-primary-container/30 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* ── A. Commodity Performance Overview ── */}
        <section className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant">
            <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">COMMODITY PERFORMANCE OVERVIEW</h3>
            <span className="text-[10px] text-outline">Confidence · Direction · Key Driver · 24H change</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-outline-variant text-[10px] text-on-surface-variant font-bold tracking-widest">
                  <th className="px-md py-xs text-left">SECTOR</th>
                  <th className="px-sm py-xs text-left">STATUS</th>
                  <th className="px-sm py-xs text-right">AI SCORE</th>
                  <th className="px-sm py-xs text-right">24H</th>
                  <th className="px-sm py-xs text-left hidden md:table-cell">TREND (8 CYCLES)</th>
                  <th className="px-sm py-xs text-left hidden lg:table-cell">PRIMARY DRIVER</th>
                  <th className="px-sm py-xs text-left hidden xl:table-cell">WATCH ITEM</th>
                </tr>
              </thead>
              <tbody>
                {sectorScores.filter(s => activeSector === 'All' || s.sector === activeSector).map((s, i, arr) => {
                  const si = getSentimentLabel(s.sentiment);
                  const changeColor = s.changeVsYesterday?.startsWith('+') ? 'text-primary' : 'text-error';
                  return (
                    <tr
                      key={s.id}
                      className={`cursor-pointer hover:bg-surface-container-highest transition-colors ${i < arr.length - 1 ? 'border-b border-outline-variant/50' : ''}`}
                      onClick={() => onSectorClick?.(s)}
                    >
                      <td className="px-md py-sm font-bold text-on-surface">{s.sector}</td>
                      <td className="px-sm py-sm">
                        <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded-sm ${si.borderClass} ${si.colorClass}`}>{si.label}</span>
                      </td>
                      <td className="px-sm py-sm text-right">
                        <div className="flex items-center justify-end gap-xs">
                          <div className="w-12 bg-outline-variant h-1 rounded-full overflow-hidden hidden sm:block">
                            <div style={{ width: `${s.confidence}%`, height: '100%', background: s.confidence > 80 ? '#58a6ff' : s.confidence > 60 ? '#fabc45' : '#ff6b6b', borderRadius: 9999 }} />
                          </div>
                          <span className="font-mono-data font-bold text-on-surface">{s.confidence}%</span>
                        </div>
                      </td>
                      <td className={`px-sm py-sm text-right font-mono-data font-bold ${changeColor}`}>{s.changeVsYesterday}</td>
                      <td className="px-sm py-sm hidden md:table-cell">
                        <SparkBars data={s.sparklineData} sentiment={s.sentiment} />
                      </td>
                      <td className="px-sm py-sm text-on-surface-variant hidden lg:table-cell max-w-[180px] truncate">{s.primaryDriver || s.watchItem}</td>
                      <td className="px-sm py-sm hidden xl:table-cell">
                        <span className="text-[10px] font-mono-data text-tertiary">⚑ {s.watchItem}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── B. Enhanced Sector Intelligence Cards ── */}
        <section>
          <h3 className="text-[10px] font-bold text-on-surface-variant mb-sm tracking-widest">DEEP SECTOR INTELLIGENCE</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-sm">
            {filtered.map(s => {
              const si   = getSentimentLabel(s.sentiment);
              const btop = getSentimentBorderTop(s.sentiment);
              const relH = intelligenceFeed.filter(h => h.sector === s.sector || (h.relatedSectors || []).includes(s.sector));
              const relSignals = crossMarketSignals.filter(cs => (cs.linkedSectors || []).includes(s.sector));
              return (
                <div
                  key={s.id}
                  className={`bg-surface-container border-t-2 ${btop} border-x border-b border-outline-variant rounded-b-lg cursor-pointer hover:shadow-lg transition-all group min-h-[248px] flex flex-col`}
                  onClick={() => onSectorClick?.(s)}
                >
                  <div className="p-sm flex-1">
                    <div className="flex justify-between items-start mb-xs">
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant group-hover:text-primary transition-colors tracking-widest">{s.sector.toUpperCase()}</p>
                        <p className="text-headline-sm font-bold">{s.confidence}%</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 border ${si.borderClass} ${si.colorClass} rounded-sm font-bold`}>{si.label}</span>
                    </div>

                    <p className="text-[12px] text-on-surface-variant leading-snug mb-xs line-clamp-3">{s.reason}</p>
                    <SparkBars data={s.sparklineData} sentiment={s.sentiment} />

                    {s.primaryDriver && <p className="text-[10px] text-primary mt-xs">▲ {s.primaryDriver}</p>}
                    <p className="text-[10px] font-mono-data text-tertiary mt-xs">⚑ {s.watchItem}</p>

                    {/* Confidence bar */}
                    <div className="flex items-center gap-xs mt-xs">
                      <MiniBar value={s.confidence} colorClass={s.confidence > 80 ? 'bg-primary' : s.confidence > 60 ? 'bg-tertiary' : 'bg-error'} />
                      <span className="text-[10px] font-mono-data text-outline shrink-0">{s.confidence}%</span>
                    </div>

                    {/* Linked cross-market signals */}
                    {relSignals.length > 0 && (
                      <div className="flex flex-wrap gap-xs mt-xs">
                        {relSignals.slice(0, 3).map(cs => (
                          <span key={cs.id} className="text-[9px] px-1 py-0.5 border border-outline-variant rounded text-outline">{cs.name}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-xs">
                      <div className="flex gap-xs flex-wrap">
                        {(s.affectedRegions || []).slice(0, 2).map(r => (
                          <span key={r} className="text-[9px] text-outline">{r}</span>
                        ))}
                      </div>
                      <span className={`text-[10px] font-mono-data ${s.changeVsYesterday?.startsWith('+') ? 'text-primary' : 'text-error'}`}>{s.changeVsYesterday}</span>
                    </div>

                    {s.supportingSignal && (
                      <p className="text-[10px] text-outline mt-xs italic">Signal: {s.supportingSignal}</p>
                    )}
                  </div>

                  <div className="border-t border-outline-variant px-sm py-xs bg-surface-container-high flex items-center justify-between">
                    <p className="text-[10px] text-outline">{relH.length} headlines · {relSignals.length} signals</p>
                    <span className="text-[10px] text-primary">View detail →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── C. Driver Breakdown ── */}
        <section className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant flex-wrap gap-sm">
            <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">DRIVER DECOMPOSITION BY SECTOR</h3>
            <div className="flex items-center gap-md">
              <span className="text-[10px] flex items-center gap-1"><span className="font-mono-data font-bold" style={{ color: '#58a6ff' }}>↑</span><span className="text-outline">Supportive driver</span></span>
              <span className="text-[10px] flex items-center gap-1"><span className="font-mono-data font-bold" style={{ color: '#ff6b6b' }}>↓</span><span className="text-outline">Pressuring driver</span></span>
              <span className="text-[10px] text-outline hidden md:block">AI-weighted contribution · sums to 100% per sector</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-x divide-y divide-outline-variant">
            {visibleDriverSectors.map(name => {
              const drivers = SECTOR_DRIVERS[name] || CROSS_MARKET_DRIVERS[name] || [];
              const sectorData = sectorScores.find(s => s.sector === name);
              const si = sectorData ? getSentimentLabel(sectorData.sentiment) : CROSS_MARKET_STATUS[name] || null;
              const dominant = [...drivers].sort((a, b) => b.pct - a.pct)[0];
              return (
                <div key={name} className="p-md min-h-[230px]">
                  <div className="flex items-center justify-between mb-sm pb-xs" style={{ borderBottom: '1px solid rgba(65,71,82,0.5)' }}>
                    <p className="text-[13px] font-bold text-on-surface tracking-widest">{name.toUpperCase()}</p>
                    {si && <span className={`text-[11px] font-bold px-1.5 py-0.5 border rounded-sm ${si.borderClass} ${si.colorClass}`}>{si.label}</span>}
                  </div>
                  {dominant && (
                    <p className="text-[10px] text-outline mb-md">
                      Dominant force: <span className="font-bold" style={{ color: dominant.dir === 'down' ? '#ff8f8f' : '#7dbfff' }}>{dominant.name}</span> at {dominant.pct}% weight
                    </p>
                  )}
                  <div className="space-y-md">
                    {drivers.map((d, i) => <DriverBar key={i} name={d.name} pct={d.pct} dir={d.dir} />)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-md py-xs bg-surface-container-low/60 border-t border-outline-variant">
            <span className="text-[10px] text-outline font-mono-data">
              PAGE {currentDriverPage + 1}/{totalDriverPages} - {driverStart}-{driverEnd} OF {driverSectors.length}
            </span>
            <div className="flex items-center gap-xs">
              <button
                type="button"
                disabled={!canPrevDriver}
                onClick={() => setDriverPage(p => Math.max(0, p - 1))}
                className={`w-7 h-7 flex items-center justify-center rounded border border-outline-variant transition-colors ${
                  canPrevDriver
                    ? 'text-on-surface-variant hover:text-primary hover:border-primary/40'
                    : 'text-outline/40 opacity-50 cursor-not-allowed'
                }`}
                title="Previous driver sectors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button
                type="button"
                disabled={!canNextDriver}
                onClick={() => setDriverPage(p => Math.min(totalDriverPages - 1, p + 1))}
                className={`w-7 h-7 flex items-center justify-center rounded border border-outline-variant transition-colors ${
                  canNextDriver
                    ? 'text-on-surface-variant hover:text-primary hover:border-primary/40'
                    : 'text-outline/40 opacity-50 cursor-not-allowed'
                }`}
                title="Next driver sectors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </section>

        {/* ── D. Sector ↔ Cross-Market Linkage Matrix ── */}
        {crossMarketSignals.length > 0 && (
          <section className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant">
              <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">SECTOR ↔ CROSS-MARKET LINKAGE</h3>
              <div className="flex gap-sm text-[9px] text-outline">
                <span><span className="inline-block w-3 h-3 bg-primary-container/40 rounded-sm mr-1 align-middle" />H = High</span>
                <span><span className="inline-block w-3 h-3 bg-tertiary-container/30 rounded-sm mr-1 align-middle" />M = Moderate</span>
                <span><span className="inline-block w-3 h-3 bg-outline-variant/30 rounded-sm mr-1 align-middle" />L = Low</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] min-w-[640px]">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="px-sm py-xs text-left text-on-surface-variant font-bold w-32">SECTOR</th>
                    {crossMarketSignals.map(s => (
                      <th key={s.id} className="px-xs py-xs text-center font-bold text-on-surface-variant" style={{ minWidth: 56 }}>
                        <div>{s.name.split(' ')[0]}</div>
                        <div className={`text-[9px] font-mono-data ${s.direction === 'up' ? 'text-primary' : s.direction === 'down' ? 'text-error' : 'text-outline'}`}>
                          {s.changePercent > 0 ? '+' : ''}{typeof s.changePercent === 'number' ? s.changePercent.toFixed(1) : s.changePercent}%
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSectors.filter(name => activeSector === 'All' || name === activeSector).map((name, ri, arr) => {
                    const row = LINKAGE_MATRIX[name] || {};
                    return (
                      <tr key={name} className={`${ri < arr.length - 1 ? 'border-b border-outline-variant/50' : ''}`}>
                        <td className="px-sm py-xs font-bold text-on-surface">{name}</td>
                        {crossMarketSignals.map(s => (
                          <td key={s.id} className="px-xs py-xs" style={{ minWidth: 56, height: 32 }}>
                            <LinkageCell level={row[s.id] || '-'} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── E. Key Market Metrics ── */}
        <section>
          <h3 className="text-[10px] font-bold text-on-surface-variant mb-sm tracking-widest">KEY MARKET METRICS</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-sm">
            {MARKET_METRICS.map(m => (
              <div key={m.label} className="bg-surface-container-high border border-outline-variant rounded-lg p-sm">
                <p className="text-[10px] text-outline mb-xs leading-tight">{m.label}</p>
                <p className="font-mono-data text-body-md font-bold text-on-surface leading-none">{m.value}<span className="text-[10px] text-outline ml-0.5">{m.unit}</span></p>
                <div className="flex items-center justify-between mt-xs">
                  <span className={`text-[10px] font-bold ${m.statusColor}`}>{m.status}</span>
                  <span className="text-[9px] text-outline text-right leading-tight max-w-[80px]">{m.note}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── F. Cross-Market Signals (Commodities view) ── */}
        {crossMarketSignals.length > 0 && (
          <section className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant">
              <div>
                <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">CROSS-MARKET INTELLIGENCE</h3>
                <p className="text-[10px] text-outline mt-0.5">Non-energy markets influencing commodity sectors</p>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 border border-outline-variant text-outline rounded-full font-mono-data">AI Context</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 divide-x divide-y divide-outline-variant">
              {crossMarketSignals.map(s => {
                const col    = getDirectionColorClass(s.direction);
                const prefix = s.changePercent > 0 ? '+' : '';
                const rel    = CROSS_RELEVANCE[s.id];
                return (
                  <div
                    key={s.id}
                    className="p-sm cursor-pointer hover:bg-surface-container-highest transition-colors group min-h-[172px]"
                    onClick={() => onSignalClick?.(s)}
                  >
                    <div className="flex items-start justify-between mb-xs">
                      <span className="text-[11px] font-bold text-on-surface-variant group-hover:text-primary transition-colors leading-tight">{s.name}</span>
                      <span className="text-[9px] px-1 py-0.5 border border-outline-variant rounded text-outline shrink-0 ml-xs">{s.signalType?.split(' ')[0]}</span>
                    </div>

                    {/* Price + sparkline */}
                    <div className="flex items-end justify-between mb-xs">
                      <div>
                        <p className="font-mono-data text-body-sm font-bold text-on-surface leading-none">
                          {s.currency}{typeof s.price === 'number' ? (s.price >= 1000 ? s.price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : s.price.toFixed(2)) : s.price}
                        </p>
                        <p className={`font-mono-data text-[10px] ${col}`}>{prefix}{typeof s.changePercent === 'number' ? s.changePercent.toFixed(1) : s.changePercent}%</p>
                      </div>
                      <MiniSparkline data={s.sparkline} direction={s.direction} />
                    </div>

                    {rel && (
                      <>
                        <p className="text-[11px] text-on-surface-variant leading-snug line-clamp-3">{rel.description}</p>
                        <div className="flex flex-wrap gap-xs mt-xs">
                          {rel.sectors.slice(0, 2).map(sec => (
                            <span key={sec} className="text-[9px] px-1 py-0.5 bg-surface-container border border-outline-variant rounded text-outline">{sec}</span>
                          ))}
                        </div>
                      </>
                    )}

                    {s.aiConfidence && (
                      <div className="flex items-center gap-xs mt-xs">
                        <div className="flex-1 h-1 bg-outline-variant rounded-full overflow-hidden">
                          <div style={{ width: `${s.aiConfidence}%`, background: '#58a6ff', height: '100%', borderRadius: 9999 }} />
                        </div>
                        <span className="text-[9px] font-mono-data text-outline shrink-0">{s.aiConfidence}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── G. Sector Headlines (grouped) ── */}
        <section>
          <h3 className="text-[10px] font-bold text-on-surface-variant mb-sm tracking-widest">SECTOR INTELLIGENCE REPORTS</h3>
          <div className="space-y-sm">
            {allSectors.filter(name => activeSector === 'All' || name === activeSector).map(name => {
              const relH = intelligenceFeed.filter(h => h.sector === name || (h.relatedSectors || []).includes(name));
              if (!relH.length) return null;
              const showAll = showAllHeadlines[name];
              const displayed = showAll ? relH : relH.slice(0, 3);
              return (
                <div key={name} className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant">
                    <div className="flex items-center gap-sm">
                      <h4 className="text-[11px] font-bold tracking-widest text-on-surface">{name.toUpperCase()}</h4>
                      <span className="text-[10px] font-mono-data text-outline border border-outline-variant px-1.5 py-0.5 rounded">{relH.length} REPORTS</span>
                    </div>
                    {relH.length > 3 && (
                      <button onClick={() => toggleHeadlines(name)} className="text-[10px] text-primary hover:underline shrink-0">
                        {showAll ? 'Show less' : `+${relH.length - 3} more`}
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-outline-variant/50">
                    {displayed.map(h => {
                      const badge = getImpactBadge(h.impact);
                      const sentColor = { Bullish: 'text-primary', Bearish: 'text-error', Neutral: 'text-on-surface-variant', Volatile: 'text-tertiary', 'Risk Elevated': 'text-tertiary' }[h.sentimentEffect] || 'text-on-surface-variant';
                      return (
                        <div key={h.id} className="px-md py-sm hover:bg-surface-container-highest transition-colors">
                          <div className="flex items-center gap-xs mb-xs flex-wrap">
                            <span className={`${badge.bg} ${badge.text} text-[10px] font-bold rounded px-2 py-0.5`}>{badge.label}</span>
                            <span className="text-[10px] text-outline font-mono-data">{h.time}</span>
                            <span className="text-[10px] text-outline">· {h.source}</span>
                            {h.category && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ml-auto ${h.category === 'Cross-Market' ? 'border-tertiary/50 text-tertiary' : 'border-outline-variant text-on-surface-variant'}`}>{h.category}</span>
                            )}
                          </div>
                          <p className="text-body-sm font-bold text-on-surface leading-snug">{h.headline}</p>
                          {h.whyItMatters && <p className="text-[10px] text-on-surface-variant mt-xs italic">{h.whyItMatters}</p>}
                          <p className={`text-[10px] font-bold mt-xs ${sentColor}`}>{(h.sentimentEffect || '').toUpperCase()}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── H. Live Market Prices ── */}
        <section className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant">
            <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">LIVE MARKET PRICES</h3>
            <span className="text-[10px] text-outline">Click instrument for detail</span>
          </div>
          <div className="p-sm grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-sm">
            {tickerItems
              .filter(t => activeSector === 'All' || { WTI: 'Crude Oil', BRENT: 'Crude Oil', NATGAS: 'Natural Gas', DIESEL: 'Refined Products', GASOLINE: 'Refined Products', EU_POWER: 'Power' }[t.id] === activeSector)
              .map(item => {
                const col   = getDirectionColorClass(item.direction);
                const arrow = item.direction === 'up' ? '↑' : item.direction === 'down' ? '↓' : '→';
                const pfix  = item.changePercent > 0 ? '+' : '';
                return (
                  <div
                    key={item.id}
                    className="p-sm bg-surface-container-high border border-outline-variant rounded-lg cursor-pointer hover:border-primary transition-colors group"
                    onClick={() => onTickerClick?.(item)}
                  >
                    <p className="text-[10px] font-bold text-on-surface-variant group-hover:text-primary transition-colors tracking-widest mb-xs">{item.name.toUpperCase()}</p>
                    <p className="font-mono-data text-body-lg font-bold text-on-surface">{item.currency}{item.price.toFixed(2)}</p>
                    <div className="flex items-center justify-between mt-xs">
                      <span className={`font-mono-data text-body-sm ${col} font-bold`}>{arrow} {pfix}{item.changePercent.toFixed(1)}%</span>
                      <span className="text-[10px] text-outline">{item.unit}</span>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </section>

      </main>
    </div>
  );
}
