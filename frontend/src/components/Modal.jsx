import { useEffect, useState } from 'react';
import { getImpactBadge, formatTimestamp } from '../utils/helpers.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

function CloseIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
}

// ── Premium loading state ─────────────────────────────────────────────────────
const LOADING_STEPS = [
  'Pulling live commodity prices',
  'Reading intelligence headlines',
  'Scoring geopolitical risk signals',
  'Merging cross-market signals',
  'Computing stakeholder exposure',
  'Generating AI impact briefing',
];

function BriefingLoadingState({ step = 0 }) {
  const pct = Math.round((step / LOADING_STEPS.length) * 100);
  return (
    <div className="flex flex-col items-center justify-center p-xl" style={{ minHeight: 480 }}>
      {/* animated ring cluster */}
      <div className="relative flex items-center justify-center mb-lg" style={{ width: 140, height: 140 }}>
        {/* outermost slow orbit */}
        <div className="absolute rounded-full load-ring-b" style={{ width: 132, height: 132, border: '1px solid rgba(88,166,255,0.15)' }} />
        {/* outer ring */}
        <div className="absolute rounded-full load-ring-a" style={{ width: 120, height: 120, border: '2px solid transparent', borderTopColor: 'rgba(88,166,255,0.6)', borderRightColor: 'rgba(88,166,255,0.2)' }} />
        {/* inner ring */}
        <div className="absolute rounded-full load-ring-b" style={{ width: 88, height: 88, border: '2px solid transparent', borderTopColor: 'rgba(250,188,69,0.5)', borderLeftColor: 'rgba(250,188,69,0.15)' }} />
        {/* center pulse */}
        <div className="relative flex flex-col items-center justify-center load-pulse" style={{ width: 64, height: 64, borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,166,255,0.12) 0%, transparent 70%)' }}>
          <span className="text-[22px] font-bold font-mono-data" style={{ color: '#7dbfff', lineHeight: 1 }}>{pct}</span>
          <span className="text-[8px]" style={{ color: '#5a7080', letterSpacing: 1 }}>%</span>
        </div>
      </div>

      {/* current step label */}
      <div className="flex items-center gap-sm mb-md">
        <div className="w-1.5 h-1.5 rounded-full live-dot shrink-0" style={{ background: '#7dbfff' }} />
        <span className="text-[12px] font-bold" style={{ color: '#7dbfff' }}>
          {step < LOADING_STEPS.length ? LOADING_STEPS[step] + '…' : 'Analysis complete.'}
        </span>
      </div>

      {/* step list */}
      <div className="w-full max-w-xs space-y-xs mb-md">
        {LOADING_STEPS.map((s, i) => (
          <div key={i} className={`flex items-center gap-sm transition-all duration-300 ${i < step ? 'opacity-100' : 'opacity-20'}`}>
            <span className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full" style={{
              background: i < step ? 'rgba(88,166,255,0.2)' : 'rgba(65,71,82,0.4)',
              border: `1px solid ${i < step ? 'rgba(88,166,255,0.5)' : '#414752'}`,
            }}>
              {i < step
                ? <svg width="8" height="8" viewBox="0 0 10 10"><polyline points="1.5,5.5 4,8 8.5,2" fill="none" stroke="#7dbfff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#414752', display: 'block' }} />
              }
            </span>
            <span className="text-[10px] text-on-surface-variant flex-1">{s}</span>
            {i < step && <span className="text-[8px] font-bold font-mono-data ml-auto" style={{ color: '#7dbfff' }}>✓</span>}
          </div>
        ))}
      </div>

      {/* progress bar */}
      <div className="w-full max-w-xs">
        <div className="rounded-full overflow-hidden" style={{ height: 3, background: '#1a2c3d' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3a7fc1, #7dbfff)' }} />
        </div>
      </div>
      <p className="text-[9px] text-outline italic text-center mt-sm">Synthesizing stakeholder exposure & impact chains from live data…</p>
    </div>
  );
}

// ── SVG helpers ───────────────────────────────────────────────────────────────
function RadialGauge({ value = 82, size = 120 }) {
  const r = (size - 20) / 2, cx = size / 2, cy = size / 2;
  const toRad = d => d * Math.PI / 180;
  const polar = d => ({ x: cx + r * Math.cos(toRad(d)), y: cy + r * Math.sin(toRad(d)) });
  const bgStart = polar(150), bgEnd = polar(390);
  const bgPath  = `M ${bgStart.x.toFixed(2)},${bgStart.y.toFixed(2)} A ${r},${r} 0 1 1 ${bgEnd.x.toFixed(2)},${bgEnd.y.toFixed(2)}`;
  const sweep   = (value / 100) * 240;
  const valEnd  = polar(150 + sweep);
  const valPath = sweep > 0.5 ? `M ${bgStart.x.toFixed(2)},${bgStart.y.toFixed(2)} A ${r},${r} 0 ${sweep > 180 ? 1 : 0} 1 ${valEnd.x.toFixed(2)},${valEnd.y.toFixed(2)}` : '';
  const col     = value >= 85 ? '#ff8f8f' : value >= 70 ? '#fac84a' : value >= 50 ? '#7dbfff' : '#9aa3b0';
  const fid = `rg-${size}-${value}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <defs>
        <filter id={fid} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="glow"/>
          <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke={col} strokeWidth="0.5" opacity="0.15" />
      <path d={bgPath} fill="none" stroke="#1a2c3d" strokeWidth="9" strokeLinecap="round" />
      {valPath && <path d={valPath} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" opacity="0.28" filter={`url(#${fid})`} className="gauge-glow-anim" />}
      {valPath && <path d={valPath} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" />}
      <text x={cx} y={cy + 5}  textAnchor="middle" fill={col} fontSize={size > 100 ? '18' : '14'} fontWeight="bold" fontFamily="IBM Plex Mono">{value}</text>
      <text x={cx} y={cy + 17} textAnchor="middle" fill="#5a7080" fontSize="7" fontFamily="IBM Plex Mono" letterSpacing="1">AI CONF</text>
    </svg>
  );
}

function SmallGauge({ value = 70, size = 56 }) {
  const r = (size - 12) / 2, cx = size / 2, cy = size / 2;
  const toRad = d => d * Math.PI / 180;
  const polar = d => ({ x: cx + r * Math.cos(toRad(d)), y: cy + r * Math.sin(toRad(d)) });
  const bgStart = polar(150), bgEnd = polar(390);
  const bgPath  = `M ${bgStart.x.toFixed(2)},${bgStart.y.toFixed(2)} A ${r},${r} 0 1 1 ${bgEnd.x.toFixed(2)},${bgEnd.y.toFixed(2)}`;
  const sweep   = (value / 100) * 240;
  const valEnd  = polar(150 + sweep);
  const valPath = sweep > 0.5 ? `M ${bgStart.x.toFixed(2)},${bgStart.y.toFixed(2)} A ${r},${r} 0 ${sweep > 180 ? 1 : 0} 1 ${valEnd.x.toFixed(2)},${valEnd.y.toFixed(2)}` : '';
  const col     = value >= 75 ? '#ff8f8f' : value >= 55 ? '#fac84a' : value >= 35 ? '#7dbfff' : '#9aa3b0';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <path d={bgPath} fill="none" stroke="#1a2c3d" strokeWidth="6" strokeLinecap="round" />
      {valPath && <path d={valPath} fill="none" stroke={col} strokeWidth="6" strokeLinecap="round" />}
      <text x={cx} y={cy + 4} textAnchor="middle" fill={col} fontSize="11" fontWeight="bold" fontFamily="IBM Plex Mono">{value}</text>
    </svg>
  );
}

function PressureRingChart({ items = [], size = 200 }) {
  const sw = 22, r = (size - sw - 6) / 2, cx = size / 2, cy = size / 2;
  const C   = 2 * Math.PI * r;
  const gap = 3;
  const total = items.reduce((a, i) => a + (i.weight || 0), 0) || 100;
  const avail = C - items.length * gap;
  let offset = 0;
  const segs = items.map(item => {
    const len = (item.weight / total) * avail;
    const s = { ...item, dArr: `${len.toFixed(2)} ${C.toFixed(2)}`, dOff: (C / 4 - offset).toFixed(2) };
    offset += len + gap;
    return s;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#141f29" strokeWidth={sw} />
      {segs.map(seg => (
        <circle key={seg.label} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={sw}
          strokeDasharray={seg.dArr} strokeDashoffset={seg.dOff} strokeLinecap="butt" />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#c0c7d4" fontSize="9" fontWeight="bold" fontFamily="IBM Plex Mono">SIGNAL</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#5a7080" fontSize="8" fontFamily="IBM Plex Mono">FUSION</text>
    </svg>
  );
}

// ── Shared style maps ─────────────────────────────────────────────────────────
const SEV_COL = { Critical: '#ff8f8f', High: '#fac84a', Moderate: '#7dbfff', Low: '#9aa3b0' };
const SEV_BG  = {
  Critical: { bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,143,143,0.3)' },
  High:     { bg: 'rgba(250,188,69,0.08)',  border: 'rgba(250,200,74,0.3)' },
  Moderate: { bg: 'rgba(88,166,255,0.06)',  border: 'rgba(125,191,255,0.25)' },
  Low:      { bg: 'rgba(134,144,160,0.06)', border: 'rgba(154,163,176,0.2)' },
};
const DIR_ARROW = { up: '↑', down: '↓', flat: '→' };
const DIR_COL   = { up: '#ff8f8f', down: '#6edb9a', flat: '#9aa3b0' };
const POSTURE_COL = { HOLD: '#7dbfff', BUY: '#6edb9a', REDUCE: '#ff8f8f', HEDGE: '#fac84a', MONITOR: '#9aa3b0', WAIT: '#c79df7' };
const POSTURE_BG  = {
  HOLD:    'rgba(88,166,255,0.1)',
  BUY:     'rgba(74,222,128,0.1)',
  REDUCE:  'rgba(255,107,107,0.1)',
  HEDGE:   'rgba(250,188,69,0.1)',
  MONITOR: 'rgba(134,144,160,0.08)',
  WAIT:    'rgba(199,157,247,0.1)',
};

// ── UI atoms ──────────────────────────────────────────────────────────────────
function SecHeader({ num, title }) {
  return (
    <div className="flex items-center gap-sm mb-lg" style={{ borderBottom: '1px solid rgba(45,61,78,0.7)', paddingBottom: 12, marginBottom: 18 }}>
      <span className="text-[9px] font-bold font-mono-data px-1.5 py-0.5 rounded shrink-0" style={{ color: '#7dbfff', background: 'rgba(88,166,255,0.12)', border: '1px solid rgba(88,166,255,0.35)' }}>{num}</span>
      <h4 className="text-[13px] font-bold tracking-widest" style={{ color: '#a8c8e8' }}>{title}</h4>
    </div>
  );
}

function PostureChip({ posture, size = 'sm' }) {
  const col = POSTURE_COL[posture] || '#9aa3b0';
  const bg  = POSTURE_BG[posture]  || POSTURE_BG.MONITOR;
  const cls = size === 'lg' ? 'text-[12px] px-2.5 py-1' : 'text-[10px] px-2 py-0.5';
  return (
    <span className={`font-bold rounded border ${cls}`} style={{ color: col, background: bg, borderColor: `${col}55` }}>{posture}</span>
  );
}

function SevBadge({ severity }) {
  const col = SEV_COL[severity] || '#9aa3b0';
  const bg  = SEV_BG[severity]  || SEV_BG.Low;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap" style={{ color: col, background: bg.bg, borderColor: bg.border }}>{severity}</span>
  );
}

// ── Static fallback data ──────────────────────────────────────────────────────
const STATIC_STAKEHOLDERS = [
  { id: 'traders',   name: 'Energy Traders',       score: 88, note: 'High volatility opportunity across crude, gas, and cross-market spreads.', posture: 'HEDGE', severity: 'Critical' },
  { id: 'fuel-dist', name: 'Fuel Distributors',    score: 82, note: 'Diesel and gasoline margin pressure from crude and refinery disruptions.', posture: 'HOLD',  severity: 'Critical' },
  { id: 'logistics', name: 'Logistics / Trucking', score: 79, note: 'Diesel cost sensitivity; freight index weakness signals demand slowdown.',  posture: 'HEDGE', severity: 'High' },
  { id: 'airlines',  name: 'Airlines',             score: 76, note: 'Jet fuel closely tracks Brent; geopolitical premium adds route cost risk.', posture: 'HEDGE', severity: 'High' },
  { id: 'utilities', name: 'Utilities',            score: 68, note: 'Gas-for-power demand and nuclear availability drive grid cost.',            posture: 'MONITOR',severity: 'High' },
  { id: 'investors', name: 'Investors',            score: 72, note: 'Safe-haven flows and commodity volatility create cross-asset opportunity.', posture: 'HOLD',  severity: 'High' },
  { id: 'mfg',       name: 'Manufacturing',        score: 64, note: 'Power, copper, aluminum, and natural gas input cost pressure.',            posture: 'MONITOR',severity: 'Moderate' },
  { id: 'agri',      name: 'Agriculture',          score: 57, note: 'Diesel, natural gas, and wheat signal fertilizer and fuel cost pressure.', posture: 'HOLD',  severity: 'Moderate' },
  { id: 'consumers', name: 'Consumers',            score: 54, note: 'Gasoline, power bills, and grocery inflation pass-through building.',       posture: 'MONITOR',severity: 'Moderate' },
  { id: 'ev',        name: 'EV / Battery',         score: 48, note: 'Lithium oversupply weighs; copper and silver costs are secondary risks.',  posture: 'WAIT',  severity: 'Low' },
];

const STATIC_HOLDER_GUIDANCE = [
  { id: 'crude',      name: 'Crude Oil Holders',    commodity: 'WTI / Brent',       posture: 'HOLD',   conviction: 'High',    why: 'Supply tightness and geo-risk premium building from key hotspots.',           invalidator: 'OPEC+ production increase or significant demand miss',            watch: 'Hormuz tanker flow + Libya output reports' },
  { id: 'gas',        name: 'Nat. Gas Holders',     commodity: 'Henry Hub / TTF',   posture: 'REDUCE', conviction: 'Moderate',why: 'EU storage surplus and mild weather reducing near-term demand pressure.',     invalidator: 'Cold snap, LNG export disruption, or storage injection stall',     watch: 'EU gas storage fill rate + LNG export volumes' },
  { id: 'refined',    name: 'Refined Holders',      commodity: 'Diesel / Gasoline', posture: 'HOLD',   conviction: 'Moderate',why: 'Crack spread elevated post-Gulf Coast refinery maintenance cycle.',           invalidator: 'Refinery restarts and demand destruction combining',               watch: 'Diesel crack spread vs $35/bbl threshold' },
  { id: 'power',      name: 'Power Holders',        commodity: 'Grid / EUA',        posture: 'MONITOR',conviction: 'Low',     why: 'Grid stable from French nuclear and renewables — limited upside.',            invalidator: 'Gas price spike, nuclear outage, or extreme demand surge',         watch: 'Nuclear capacity % + gas-for-power demand' },
  { id: 'renewables', name: 'Renewables Holders',   commodity: 'Solar / Wind',      posture: 'BUY',    conviction: 'High',    why: 'Policy tailwinds and record solar output support long-term growth.',          invalidator: 'Policy reversal or grid congestion limiting output',               watch: 'Grid curtailment events + new capacity pipeline' },
  { id: 'uranium',    name: 'Uranium Holders',      commodity: 'U3O8',              posture: 'HOLD',   conviction: 'High',    why: 'Nuclear renaissance policy driving long-term demand re-rating globally.',     invalidator: 'Plant cancellations, regulatory reversal, or major accident',      watch: 'New plant announcements + enrichment supply' },
  { id: 'gold',       name: 'Gold Holders',         commodity: 'XAU / USD',         posture: 'HOLD',   conviction: 'Moderate',why: 'Geo-fear and USD stress supporting safe-haven bid alongside energy premium.', invalidator: 'Geo-risk de-escalation or significant USD rally',                 watch: 'Middle East / Russia escalation + Fed signals' },
  { id: 'silver',     name: 'Silver Holders',       commodity: 'XAG / USD',         posture: 'HOLD',   conviction: 'Moderate',why: 'Safe-haven bid combined with solar industrial demand supporting price.',      invalidator: 'Solar demand crash or gold breakdown',                             watch: 'Solar panel demand + gold/silver ratio above 85' },
  { id: 'copper',     name: 'Copper Holders',       commodity: 'HG Futures',        posture: 'REDUCE', conviction: 'Moderate',why: 'China and EM demand weakness weighing on industrial metals.',                 invalidator: 'China stimulus or manufacturing PMI recovery above 52',            watch: 'Chinese manufacturing PMI + construction data' },
  { id: 'freight',    name: 'Freight Holders',      commodity: 'BDI / FFA',         posture: 'WAIT',   conviction: 'Low',     why: 'BDI weakness signals bulk demand slowdown — defensive wait posture.',         invalidator: 'Commodity demand surge or acute supply crunch',                    watch: 'Dry bulk + LNG shipping routes + port congestion' },
  { id: 'aluminum',   name: 'Aluminum Holders',     commodity: 'LME Aluminum',      posture: 'MONITOR',conviction: 'Moderate',why: 'Power-cost sensitivity keeps aluminum exposed to grid stress and European energy volatility.', invalidator: 'Power prices normalize while China demand weakens',                  watch: 'EU power price + smelter curtailment reports' },
  { id: 'lithium',    name: 'Lithium Holders',         commodity: 'LCE / Spodumene', posture: 'WAIT',   conviction: 'Low',     why: 'Mine oversupply cycle and EV demand slowdown keep lithium in structural correction. Battery cost deflation is a long-term tailwind.', invalidator: 'IRA policy reversal, EV demand recovery, or major mine curtailments', watch: 'EV sales data + spodumene spot + battery cathode orders' },
];

const STATIC_SECTOR_MATRIX = [
  { sector: 'Logistics / Trucking', commodities: 'Diesel · Freight',           impact: 'High',     costPressure: 'High',     supplyRisk: 'Moderate', demandRisk: 'Low',      posture: 'HEDGE',   watch: 'Diesel crack spread > $35/bbl' },
  { sector: 'Airlines',             commodities: 'Jet Fuel · Crude Oil',        impact: 'High',     costPressure: 'High',     supplyRisk: 'Moderate', demandRisk: 'Moderate', posture: 'HEDGE',   watch: 'Brent > $90 sustained / route geo-risk' },
  { sector: 'Utilities',            commodities: 'Nat. Gas · Coal · Uranium',   impact: 'Moderate', costPressure: 'Moderate', supplyRisk: 'High',     demandRisk: 'Low',      posture: 'MONITOR', watch: 'Gas storage injection pace + nuclear %' },
  { sector: 'Manufacturing',        commodities: 'Power · Copper · Aluminum',   impact: 'Moderate', costPressure: 'High',     supplyRisk: 'Low',      demandRisk: 'Moderate', posture: 'MONITOR', watch: 'Copper demand + ETS carbon price' },
  { sector: 'Agriculture',          commodities: 'Diesel · Nat. Gas · Wheat',   impact: 'Moderate', costPressure: 'High',     supplyRisk: 'Moderate', demandRisk: 'Low',      posture: 'HOLD',    watch: 'Wheat / fertilizer spread + diesel' },
  { sector: 'Construction',         commodities: 'Diesel · Copper · Aluminum',  impact: 'Moderate', costPressure: 'High',     supplyRisk: 'Low',      demandRisk: 'High',     posture: 'HOLD',    watch: 'Copper spot + diesel cost index' },
  { sector: 'Fuel Retailers',       commodities: 'Gasoline · Diesel',           impact: 'High',     costPressure: 'High',     supplyRisk: 'Low',      demandRisk: 'Moderate', posture: 'HOLD',    watch: 'Retail margin vs crack spread' },
  { sector: 'EV / Battery Chain',   commodities: 'Lithium · Copper · Silver',   impact: 'Low',      costPressure: 'Low',      supplyRisk: 'Moderate', demandRisk: 'High',     posture: 'WAIT',    watch: 'Lithium floor + EV policy update' },
  { sector: 'Consumers',            commodities: 'Gasoline · Power · Wheat',    impact: 'Moderate', costPressure: 'High',     supplyRisk: 'Low',      demandRisk: 'Low',      posture: 'MONITOR', watch: 'Pump price + utility bill + CPI lag' },
  { sector: 'Commodity Traders',    commodities: 'Crude · Gas · Gold · Copper', impact: 'High',     costPressure: 'Low',      supplyRisk: 'High',     demandRisk: 'High',     posture: 'HEDGE',   watch: 'WTI/Brent spread + Hormuz + safe-haven' },
];

const STATIC_CONSUMER_IMPACT = [
  { id: 'gasoline', category: 'Gasoline / Pump Price',    commodity: 'Crude + Refined', direction: 'up',   severity: 'High',     explanation: 'Crude oil geopolitical premium flowing through to pump prices. Expect 5-8 cents/gal increase within 3-4 weeks.', lag: '3-4 weeks' },
  { id: 'power',    category: 'Electricity Bills',         commodity: 'Nat. Gas + Grid', direction: 'flat', severity: 'Moderate', explanation: 'Grid stable from nuclear and renewables. Gas-for-power demand limited. Bills expected flat to slightly higher.',  lag: '6-8 weeks' },
  { id: 'grocery',  category: 'Grocery / Freight Costs',  commodity: 'Diesel + Wheat',  direction: 'up',   severity: 'Moderate', explanation: 'Diesel keeps freight costs elevated. Black Sea wheat risk adds food inflation pressure. Grocery basket up ~2-3%.', lag: '4-6 weeks' },
  { id: 'travel',   category: 'Travel / Airline Tickets',  commodity: 'Jet Fuel',        direction: 'up',   severity: 'High',     explanation: 'Jet fuel tied to Brent. Geopolitical route risk adding surcharges. Expect 8-15% ticket price increase.',          lag: '2-3 weeks' },
  { id: 'home',     category: 'Home Heating / Cooling',    commodity: 'Nat. Gas + Power',direction: 'flat', severity: 'Low',      explanation: 'Mild weather and EU storage surplus keeping home energy costs stable. Winter risk builds if injection pace slows.',  lag: 'Seasonal' },
  { id: 'retail',   category: 'Retail Goods / Imports',   commodity: 'Freight + Diesel + Aluminum', direction: 'up', severity: 'Moderate', explanation: 'Red Sea re-routing and diesel-driven logistics pass through to imported goods. Electronics, clothing, and consumer goods face 6–12 week inflation lag as container rates and fuel surcharges compound.', lag: '6-12 weeks' },
];

const STATIC_PRESSURE_MIX = [
  { label: 'Geo Risk',         weight: 28, color: '#ff8f8f', description: 'Active hotspot count and severity' },
  { label: 'Price Action',     weight: 24, color: '#fac84a', description: 'Commodity price direction and momentum' },
  { label: 'Headlines',        weight: 18, color: '#7dbfff', description: 'AI-classified news impact density' },
  { label: 'Cross-Market',     weight: 15, color: '#c79df7', description: 'Safe-haven and industrial demand signals' },
  { label: 'Historical Trend', weight: 10, color: '#6edb9a', description: 'Statistical pattern vs current deviation' },
  { label: 'Sector Risk',      weight:  5, color: '#9aa3b0', description: 'Sector score divergence and sentiment' },
];

const STATIC_WATCHLIST = [
  { id: 'hormuz',  name: 'Strait of Hormuz Tanker Flow',  trigger: 'Tanker incidents or 15%+ traffic reduction',       why: '20% of global crude passes through this chokepoint. Any disruption = $15-25/bbl spike.',          who: 'Energy Traders · Airlines · Logistics' },
  { id: 'brent',   name: 'Brent Crude Key Level',         trigger: 'Sustained move above $90/bbl or below $75/bbl',    why: 'Defines the bullish/bearish regime for all fuel-linked business costs and consumer pump prices.',  who: 'Airlines · Fuel Distributors · Consumers' },
  { id: 'diesel',  name: 'Diesel Crack Spread',           trigger: 'Crack spread breaks above $35/bbl',                why: 'Refinery margin stress passes directly to freight, agriculture, and logistics costs.',              who: 'Logistics · Agriculture · Manufacturing' },
  { id: 'eu-gas',  name: 'EU Gas Storage Fill Rate',      trigger: 'Below 60% fill rate entering September',           why: 'Storage deficit entering winter = price spike risk for EU industry, power, and heating.',           who: 'Utilities · Manufacturing · Consumers' },
  { id: 'gulf',    name: 'Gulf Coast Refinery Yields',    trigger: 'US refinery utilization drops below 85%',          why: 'Lower yields tighten refined product supply — diesel and gasoline shortage risk builds quickly.',   who: 'Logistics · Airlines · Fuel Distributors' },
  { id: 'uranium', name: 'Uranium Momentum Continuation', trigger: 'Price holds above $90/lb for 2 consecutive weeks', why: 'Confirms nuclear renaissance demand — reshapes long-term power generation mix globally.',            who: 'Utilities · Power Investors · Governments' },
  { id: 'power',   name: 'EU Power Grid Volatility',      trigger: 'EU spot power > €150/MWh for 3+ days',             why: 'Extreme power prices stress manufacturing margins and aluminum smelting profitability.',              who: 'Manufacturing · Aluminum · Utilities' },
  { id: 'freight', name: 'Freight / Shipping Stress',     trigger: 'BDI drops below 1500 or spikes above 3000',       why: 'Extreme BDI signals global demand shock or acute supply crunch in bulk commodity shipping.',         who: 'Traders · Logistics · Consumers' },
];

const STATIC_SCENARIOS = [
  { id: 'base',    type: 'Base Case',        prob: 55, color: '#7dbfff', conditions: 'Geo-risk contained, OPEC+ holds agreed output, EU gas injection pace continues', price_range: 'Brent $78-85 · Gas $2.0-2.5/MMBtu', benefits: ['Crude Oil Holders','Refiners','Energy Traders'], suffers: ['Airlines','Logistics','Consumers (mild)'], note: 'Status quo. Moderate manageable cost pressure. No major supply disruption.' },
  { id: 'bullish', type: 'Bullish Risk Case',prob: 25, color: '#fac84a', conditions: 'Hormuz incident, Libya shutdown expansion, or OPEC+ surprise production cut',  price_range: 'Brent $92-105 · Gas $3.0+/MMBtu',    benefits: ['Crude Producers','Energy Traders','Gold/Silver'], suffers: ['Airlines','Logistics','Consumers','Mfg.'],     note: 'Shock-driven supply tightening. Energy inflation accelerates broadly.' },
  { id: 'bearish', type: 'Bearish Risk Case',prob: 20, color: '#ff8f8f', conditions: 'China demand miss, US recession signals, or OPEC+ unexpected production surge', price_range: 'Brent $62-70 · Gas $1.6-2.0/MMBtu',  benefits: ['Airlines','Logistics','Consumers','Mfg.'],      suffers: ['Crude Producers','Energy Traders','EM Exporters'],  note: 'Demand-driven correction. Deflationary for energy-intensive businesses.' },
];

function generateLocalAnalysis(fullData) {
  const { sectorScores = [], geoRiskItems = [], intelligenceFeed = [], crossMarketSignals = [] } = fullData || {};
  const find    = id => sectorScores.find(s => s.id === id || s.sector?.toLowerCase().replace(/\s+/g, '-') === id);
  const crude   = find('crude-oil');
  const gas     = find('natural-gas');
  const bullish = sectorScores.filter(s => s.sentiment === 'Bullish' || s.sentiment === 'Expanding');
  const bearish = sectorScores.filter(s => s.sentiment === 'Bearish');
  const critical = geoRiskItems.filter(r => r.riskLevel === 'Critical');
  const highRisk = geoRiskItems.filter(r => r.riskLevel === 'High');
  const hiImpact = intelligenceFeed.filter(i => i.impact === 'High Impact');
  const goldUp   = crossMarketSignals.some(s => (s.id || '').toUpperCase().includes('GOLD') && s.direction === 'up');
  const conf     = sectorScores.length ? Math.round(sectorScores.reduce((a, s) => a + (s.confidence || 80), 0) / sectorScores.length) : 82;

  const chips = [];
  if (crude?.sentiment === 'Bullish') chips.push('Crude Bullish');
  else if (crude?.sentiment === 'Bearish') chips.push('Crude Bearish');
  if (gas?.sentiment === 'Bearish') chips.push('Gas Bearish');
  else if (gas?.sentiment === 'Bullish') chips.push('Gas Bullish');
  if (critical.length > 0) chips.push('Geo-Risk Elevated');
  if (hiImpact.length >= 3) chips.push('High Impact Active');
  if (goldUp) chips.push('Safe-Haven Active');
  if (!chips.length) chips.push('Market Tension', 'Supply Risk', 'Geo-Risk Elevated', 'Safe-Haven Active', 'Consumer Pressure', 'Cross-Market Signal');

  let thesis;
  if (bullish.length > bearish.length && critical.length > 0)
    thesis = `AI detects bullish energy complex with ${critical.length} critical geo-risk event${critical.length > 1 ? 's' : ''} active — supply disruption risk elevated. ${hiImpact.length} high-impact signals confirm fuel-intensive businesses face escalating cost pressure.`;
  else if (bullish.length > bearish.length)
    thesis = `AI detects bullish momentum in ${bullish.slice(0, 2).map(s => s.sector).join(' and ')}. Sector sentiment favours upside with geo-risk premium. Logistics, airlines, and fuel distributors face near-term margin pressure.`;
  else if (bearish.length > bullish.length)
    thesis = `AI detects bearish signals in ${bearish.slice(0, 2).map(s => s.sector).join(' and ')} driven by storage surpluses and demand weakness. Consumer pass-through expected with 4-8 week lag.`;
  else
    thesis = `Mixed market signals — ${critical.length + highRisk.length} geo-risk zones tracked with ${hiImpact.length} high-impact events. Sector performance diverging across energy complex.`;

  const stakeholders = STATIC_STAKEHOLDERS.map(sh => {
    let score = sh.score;
    if (sh.id === 'traders'   && crude?.sentiment === 'Bullish') score = Math.min(97, score + 5);
    if (sh.id === 'airlines'  && crude?.sentiment === 'Bullish') score = Math.min(94, score + 5);
    if (sh.id === 'logistics' && crude?.sentiment === 'Bullish') score = Math.min(94, score + 4);
    if (sh.id === 'investors' && goldUp) score = Math.min(97, score + 6);
    if (critical.length >= 2) score = Math.min(97, score + 3);
    return { ...sh, score: Math.round(score), severity: score >= 75 ? 'Critical' : score >= 60 ? 'High' : score >= 45 ? 'Moderate' : 'Low' };
  });

  return {
    thesis, confidence: conf, themeChips: chips.slice(0, 6),
    environmentExplanation: `Energy markets under ${bullish.length > bearish.length ? 'bullish supply constraints' : 'mixed demand signals'}. ${critical.length + highRisk.length} active geo-risk zones tracked. Gold ${goldUp ? 'bullish — safe-haven active' : 'neutral'}.`,
    stakeholderImpacts: stakeholders, holderGuidance: STATIC_HOLDER_GUIDANCE,
    sectorMatrix: STATIC_SECTOR_MATRIX, consumerImpact: STATIC_CONSUMER_IMPACT,
    pressureMix: STATIC_PRESSURE_MIX, watchlist: STATIC_WATCHLIST, scenarios: STATIC_SCENARIOS,
    explainabilityNote: `Derived from live price direction (${crude?.sentiment || 'Mixed'} crude), active geo-risk signals (${critical.length} critical), alert density (${hiImpact.length} high-impact), sector stress, and cross-market confirmation. Confidence ${conf}% reflects data availability.`,
    generatedAt: new Date().toISOString(),
    dataFreshness: { prices: 'derived', geoRisk: 'derived', news: 'derived' },
  };
}

// ── Main Briefing Modal ───────────────────────────────────────────────────────
// ── Per-item dynamic score for Modal consumer sectors ─────────────────────────
function modalConsumerItemScore(item) {
  const base = item.severity === 'Critical' ? 92 : item.severity === 'High' ? 78 : item.severity === 'Moderate' ? 55 : 30;
  const trend = item.direction === 'up' ? 12 : item.direction === 'down' ? -8 : 0;
  return Math.round(Math.min(95, Math.max(20, base + trend)));
}

function BriefingModal({ briefing, fullData, globalFilters, dataMode }) {
  const [loadStep,          setLoadStep]          = useState(0);
  const [phase,             setPhase]             = useState('loading');
  const [analysis,          setAnalysis]          = useState(null);
  const [analysisStatus,    setAnalysisStatus]    = useState(null);
  const [selectedConsumerId, setSelectedConsumerId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const stepMs = [200, 650, 1050, 1500, 1950, 2250];
    const timers = stepMs.map((d, i) => setTimeout(() => { if (!cancelled) setLoadStep(i + 1); }, d));

    const minWait = new Promise(r => setTimeout(r, 2400));
    const ctrl    = new AbortController();

    const payload = {
      prices:               (fullData?.tickerItems         || []),
      geoRiskItems:         (fullData?.geoRiskItems        || []),
      headlines:            (fullData?.intelligenceFeed    || []),
      crossMarketSignals:   (fullData?.crossMarketSignals  || []),
      generatedRequestTime: new Date().toISOString(),
    };
    console.log('[Executive AI] Request started', { pricesCount: payload.prices.length, geoCount: payload.geoRiskItems.length, headlinesCount: payload.headlines.length, crossCount: payload.crossMarketSignals.length });

    const fetchApi = fetch(`${API_BASE}/ai/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: ctrl.signal,
    })
      .then(r => { console.log('[Executive AI] Response status:', r.status); return r.ok ? r.json() : null; })
      .catch(e => { console.warn('[Executive AI] Fetch error:', e.message); return null; });

    Promise.all([minWait, fetchApi]).then(([, res]) => {
      if (cancelled) return;
      console.log('[Executive AI] Analysis status:', res?.status, '| thesis present:', !!res?.thesis);
      if (res && res.thesis) {
        setAnalysis(res);
        setAnalysisStatus(res.status || 'deterministic_generated');
      } else {
        setAnalysis(generateLocalAnalysis(fullData));
        setAnalysisStatus('cached_fallback');
      }
      setLoadStep(6);
      setTimeout(() => { if (!cancelled) setPhase('done'); }, 220);
    });

    return () => { cancelled = true; ctrl.abort(); timers.forEach(clearTimeout); };
  }, []);

  if (phase === 'loading' || !analysis) return <BriefingLoadingState step={loadStep} />;

  const {
    thesis, confidence, themeChips = [], environmentExplanation,
    stakeholderImpacts = [], holderGuidance = [], sectorMatrix = [],
    consumerImpact = [], pressureMix = [], watchlist = [], scenarios = [],
    explainabilityNote, generatedAt, dataFreshness = {},
    regime = null, keyLevels = [],
  } = analysis;

  const genTime = generatedAt ? new Date(generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--';
  const genDate = generatedAt ? new Date(generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '---';

  const statusBadge = analysisStatus === 'live_generated'
    ? { text: 'LIVE AI GENERATED',           col: '#6edb9a', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.4)' }
    : analysisStatus === 'deterministic_generated'
    ? { text: 'GENERATED FROM CURRENT DATA', col: '#7dbfff', bg: 'rgba(88,166,255,0.1)',   border: 'rgba(125,191,255,0.4)' }
    : { text: 'CACHED FALLBACK',              col: '#fac84a', bg: 'rgba(250,188,69,0.08)',  border: 'rgba(250,188,69,0.35)' };

  const baseScenario = scenarios.find(s => /base/i.test(s.type)) || scenarios[0] || {};
  const bullScenario = scenarios.find(s => /bull/i.test(s.type)) || scenarios[1] || {};
  const bearScenario = scenarios.find(s => /bear/i.test(s.type)) || scenarios[2] || {};
  const thesisCards = [
    { label: 'What Changed', value: themeChips.slice(0, 2).join(' + ') || 'Signal mix repriced' },
    { label: 'Why It Matters', value: environmentExplanation || explainabilityNote || 'Cross-market pressure is feeding business cost exposure.' },
    { label: 'Confirmation', value: watchlist[0]?.trigger || 'Watch confirmation from crude, gas, freight, and safe-haven signals.' },
    { label: 'Invalidation', value: holderGuidance[0]?.invalidator || 'Thesis weakens if geo-risk de-escalates and price momentum reverses.' },
    { label: 'Bull Case', value: `${bullScenario.prob || 25}% - ${bullScenario.conditions || 'Supply shock extends and volatility rises.'}` },
    { label: 'Bear Case', value: `${bearScenario.prob || 20}% - ${bearScenario.conditions || 'Demand weakens and risk premium unwinds.'}` },
    { label: 'Base Case', value: `${baseScenario.prob || 55}% - ${baseScenario.price_range || baseScenario.conditions || 'Contained risk with elevated monitoring.'}` },
    { label: 'Watch Trigger', value: watchlist[1]?.trigger || keyLevels[0]?.value || 'Break above/below key energy resistance levels.' },
    { label: 'Confidence / Caveat', value: `${confidence}% confidence. ${explainabilityNote || 'Deterministic fallback depends on available feed depth.'}` },
  ];

  const marginImpact = (row) => {
    if (row.marginImpact) return row.marginImpact;
    if (row.costPressure === 'High' && row.demandRisk === 'High') return 'Severe';
    if (row.costPressure === 'High') return 'Squeezed';
    if (row.demandRisk === 'High') return 'Demand Risk';
    return row.impact || row.base_impact || 'Moderate';
  };

  // Ensure we always have exactly 6 consumer sectors (guard against API string or missing items)
  const safeConsumerImpact = Array.isArray(consumerImpact) && consumerImpact.length >= 6
    ? consumerImpact
    : STATIC_CONSUMER_IMPACT;

  const defaultConsumerId = (safeConsumerImpact.find(c => c.severity === 'High') || safeConsumerImpact[0] || {}).id;
  const selectedConsumerItem = safeConsumerImpact.find(c => c.id === (selectedConsumerId || defaultConsumerId)) || safeConsumerImpact[0] || {};
  const selectedConsumerScore = modalConsumerItemScore(selectedConsumerItem);

  // Legacy aggregate score kept for backward compat
  const consumerScore = Math.round(Math.min(96, Math.max(38,
    safeConsumerImpact.reduce((sum, item) => sum + (item.severity === 'High' ? 18 : item.severity === 'Moderate' ? 12 : 7), 32)
  )));

  return (
    <div className="p-lg space-y-[36px]">

      {/* ── Stamp bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-sm -mb-sm">
        <div className="flex items-center gap-sm flex-wrap">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusBadge.col, boxShadow: `0 0 6px ${statusBadge.col}` }} />
          <span className="text-[10px] font-mono-data text-outline">Analysis generated {genDate} at {genTime} UTC</span>
          <span className="text-[8px] px-2 py-0.5 rounded font-bold border" style={{ color: statusBadge.col, background: statusBadge.bg, borderColor: statusBadge.border }}>{statusBadge.text}</span>
        </div>
        <div className="flex items-center gap-xs flex-wrap">
          {(['prices', 'geoRisk', 'news']).map(k => (
            <span key={k} className="text-[8px] px-1.5 py-0.5 rounded font-bold border" style={{
              color: dataFreshness[k] === 'live' ? '#7dbfff' : '#5a7080',
              borderColor: dataFreshness[k] === 'live' ? 'rgba(88,166,255,0.35)' : '#2d3d4e',
              background: dataFreshness[k] === 'live' ? 'rgba(88,166,255,0.08)' : 'transparent',
            }}>
              {k.toUpperCase()} {dataFreshness[k] === 'live' ? '●' : '○'}
            </span>
          ))}
        </div>
      </div>

      {/* ── 01. AI Market Impact Thesis ── */}
      <section className="fade-up">
        <SecHeader num="01" title="AI MARKET IMPACT THESIS" />
        <div className="rounded-xl p-md space-y-md" style={{ background: 'linear-gradient(135deg, rgba(88,166,255,0.06), rgba(15,30,44,0.8))', border: '1px solid rgba(88,166,255,0.2)' }}>
          <div className="grid grid-cols-1 xl:grid-cols-[150px_minmax(0,1fr)] gap-md">
            <div className="shrink-0"><RadialGauge value={confidence} size={136} /></div>
            <div className="min-w-0">
              {regime && (
                <div className="flex items-center gap-sm mb-sm flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-1 rounded border tracking-widest" style={{ color: regime.color, background: `${regime.color}12`, borderColor: `${regime.color}50` }}>
                    REGIME: {String(regime.name || '').toUpperCase()}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">{regime.postureNote}</span>
                </div>
              )}
              <p className="text-[15px] text-on-surface leading-relaxed font-medium mb-sm">{thesis}</p>
              <div className="flex flex-wrap gap-xs mb-sm">
                {themeChips.map(t => (
                  <span key={t} className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ color: '#7dbfff', background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.3)' }}>{t}</span>
                ))}
              </div>
              {environmentExplanation && (
                <p className="text-[11px] text-on-surface-variant leading-relaxed italic" style={{ borderLeft: '2px solid rgba(88,166,255,0.3)', paddingLeft: 10 }}>{environmentExplanation}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
            {thesisCards.map(card => (
              <div key={card.label} className="rounded-lg p-sm" style={{ background: 'rgba(8,18,28,0.48)', border: '1px solid rgba(45,61,78,0.72)' }}>
                <p className="text-[9px] font-bold tracking-widest text-outline mb-xs">{card.label.toUpperCase()}</p>
                <p className="text-[11px] text-on-surface-variant leading-snug line-clamp-3">{card.value}</p>
              </div>
            ))}
          </div>
          {keyLevels.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-sm mt-md pt-md" style={{ borderTop: '1px solid rgba(45,61,78,0.6)' }}>
              {keyLevels.map(kl => {
                const breached = kl.state === 'BREACHED' || kl.state === 'WIDE';
                const col = breached ? '#ff8f8f' : '#6edb9a';
                return (
                  <div key={kl.id} className="rounded-lg p-sm" style={{ background: 'rgba(8,18,28,0.5)', border: `1px solid ${col}30` }} title={kl.note}>
                    <p className="text-[9px] text-outline tracking-wider mb-xs leading-tight">{kl.label.toUpperCase()}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold font-mono-data text-on-surface">{kl.value}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: col, background: `${col}14`, border: `1px solid ${col}40` }}>{kl.state}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── 02. Stakeholder Impact Radar ── */}
      <section>
        <SecHeader num="02" title="STAKEHOLDER IMPACT RADAR" />
        <p className="text-[10px] text-outline -mt-sm mb-md">AI exposure score 0–100 with recommended posture for each stakeholder group</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {stakeholderImpacts.map((s, i) => {
            const col = SEV_COL[s.severity] || '#9aa3b0';
            const sb  = SEV_BG[s.severity]  || SEV_BG.Low;
            return (
              <div key={s.id} className="flex items-start gap-md rounded-xl p-md" style={{ background: sb.bg, border: `1px solid ${sb.border}` }}>
                <SmallGauge value={s.score} size={62} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-xs flex-wrap mb-xs">
                    <span className="text-[12px] font-bold text-on-surface">{s.name}</span>
                    <SevBadge severity={s.severity} />
                    <PostureChip posture={s.posture} />
                  </div>
                  <div className="rounded-full overflow-hidden mb-xs" style={{ height: 5, background: 'rgba(26,44,61,0.8)' }}>
                    <div className="bar-fill h-full rounded-full" style={{ width: `${s.score}%`, background: `linear-gradient(90deg, ${col}88, ${col})`, animationDelay: `${i * 60}ms` }} />
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-snug">{s.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 03. Business Sector Exposure Matrix ── */}
      <section>
        <SecHeader num="03" title="BUSINESS SECTOR EXPOSURE MATRIX" />
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2d3d4e' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[840px]">
              <thead>
                <tr className="text-[10px] font-bold tracking-widest" style={{ background: '#0d1a26', borderBottom: '1px solid #2d3d4e', color: '#7d93a8' }}>
                  <th className="px-sm py-sm text-left">SECTOR</th>
                  <th className="px-sm py-sm text-left">COMMODITIES</th>
                  <th className="px-sm py-sm text-center">COST</th>
                  <th className="px-sm py-sm text-center">DEMAND</th>
                  <th className="px-sm py-sm text-center">SUPPLY</th>
                  <th className="px-sm py-sm text-center">MARGIN</th>
                  <th className="px-sm py-sm text-center">POSTURE</th>
                  <th className="px-sm py-sm text-left hidden xl:table-cell">WATCH</th>
                </tr>
              </thead>
              <tbody>
                {sectorMatrix.map((row, i) => (
                  <tr key={row.sector} style={{ borderBottom: i < sectorMatrix.length - 1 ? '1px solid rgba(45,61,78,0.5)' : 'none', background: i % 2 === 0 ? 'rgba(13,26,38,0.4)' : 'transparent' }}
                    className="hover:bg-[rgba(88,166,255,0.03)] transition-colors">
                    <td className="px-sm py-sm font-bold text-on-surface whitespace-nowrap text-[12px]">{row.sector}</td>
                    <td className="px-sm py-sm text-on-surface-variant text-[11px]">{row.commodities}</td>
                    {[row.costPressure, row.demandRisk, row.supplyRisk, marginImpact(row)].map((lvl, li) => (
                      <td key={li} className="px-sm py-sm text-center"><SevBadge severity={lvl} /></td>
                    ))}
                    <td className="px-sm py-sm text-center"><PostureChip posture={row.posture} /></td>
                    <td className="px-sm py-sm text-on-surface-variant hidden xl:table-cell text-[11px]">{row.watch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 04. Holder / Position Guidance Board ── */}
      <section>
        <SecHeader num="04" title="HOLDER / POSITION GUIDANCE BOARD" />
        <p className="text-[10px] text-outline -mt-sm mb-md">Current stance for each commodity position — informational, not financial advice</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {holderGuidance.map(h => {
            const pc  = POSTURE_COL[h.posture] || '#9aa3b0';
            const pb  = POSTURE_BG[h.posture]  || POSTURE_BG.MONITOR;
            const cc  = h.conviction === 'High' ? '#ff8f8f' : h.conviction === 'Moderate' ? '#fac84a' : '#9aa3b0';
            return (
              <div key={h.id} className="rounded-xl p-md flex flex-col gap-sm" style={{ background: 'rgba(13,26,38,0.6)', border: `1px solid #2d3d4e`, borderTop: `3px solid ${pc}` }}>
                <div className="flex items-start justify-between gap-xs">
                  <div>
                    <p className="text-[12px] font-bold text-on-surface leading-tight">{h.name}</p>
                    <p className="text-[10px] font-mono-data text-outline">{h.commodity}</p>
                  </div>
                  <PostureChip posture={h.posture} size="lg" />
                </div>
                <div className="flex items-center gap-xs">
                  <span className="text-[10px] text-on-surface-variant">Conviction:</span>
                  <span className="text-[10px] font-bold" style={{ color: cc }}>{h.conviction}</span>
                </div>
                <div style={{ borderTop: '1px solid #1e2d3d', paddingTop: 6 }}>
                  <p className="text-[11px] text-on-surface-variant leading-snug">{h.why}</p>
                </div>
                <p className="text-[10px] text-outline italic leading-tight"><span className="font-bold text-on-surface-variant not-italic">Invalidator: </span>{h.invalidator}</p>
                <p className="text-[10px] font-bold leading-tight" style={{ color: '#7dbfff' }}>Watch: <span className="font-normal text-on-surface-variant">{h.watch}</span></p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 05. Consumer Impact Summary */}
      <section>
        <SecHeader num="05" title="CONSUMER IMPACT SUMMARY" />
        <p className="text-[10px] text-outline -mt-sm mb-md">How current commodity movements translate to everyday consumer costs — click any sector to update the score panel</p>
        <div className="rounded-xl p-md grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-md" style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid #2d3d4e' }}>
          {/* Left: interactive score panel */}
          <div className="rounded-lg p-md flex flex-col items-center gap-sm text-center"
            style={{ background: 'rgba(8,18,28,0.55)', border: `1px solid ${DIR_COL[selectedConsumerItem.direction] || '#2d3d4e'}40`, borderTop: `3px solid ${DIR_COL[selectedConsumerItem.direction] || '#7dbfff'}` }}>
            <SmallGauge value={selectedConsumerScore} size={88} />
            <p className="text-[8px] font-bold tracking-widest" style={{ color: '#7dbfff' }}>AI-WEIGHTED PASS-THROUGH SCORE</p>
            <p className="text-[11px] font-bold text-on-surface leading-tight">{selectedConsumerItem.category || 'Household energy basket'}</p>
            <div className="flex items-center justify-center gap-xs">
              <SevBadge severity={selectedConsumerItem.severity} />
              <span className="text-[11px] font-bold" style={{ color: DIR_COL[selectedConsumerItem.direction] || '#9aa3b0' }}>
                {DIR_ARROW[selectedConsumerItem.direction] || '→'}
              </span>
            </div>
            <div className="w-full space-y-1">
              {[
                ['LAG', selectedConsumerItem.lag],
                ['PASS-THROUGH', selectedConsumerItem.severity === 'High' ? 'Fast' : selectedConsumerItem.severity === 'Moderate' ? 'Medium' : 'Slow'],
                ['DIRECT', selectedConsumerItem.direction === 'up' ? 'Higher bills/costs' : 'Contained'],
                ['INDIRECT', 'Freight / CPI'],
              ].map(([label, val]) => (
                <div key={label} className="rounded px-xs py-0.5 text-left" style={{ background: 'rgba(8,18,28,0.5)', border: '1px solid rgba(45,61,78,0.5)' }}>
                  <p className="text-[8px] text-outline tracking-widest">{label}</p>
                  <p className="text-[9px] font-bold text-on-surface-variant">{val}</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-on-surface-variant leading-snug text-left italic w-full">{selectedConsumerItem.explanation}</p>
          </div>
          {/* Right: 6 clickable sector cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            {safeConsumerImpact.map(c => {
              const dc = DIR_COL[c.direction] || '#9aa3b0';
              const sb = SEV_BG[c.severity] || SEV_BG.Low;
              const isSelected = c.id === (selectedConsumerId || defaultConsumerId);
              const itemScore = modalConsumerItemScore(c);
              return (
                <div
                  key={c.id}
                  className="rounded-lg p-sm cursor-pointer transition-all"
                  onClick={() => setSelectedConsumerId(c.id)}
                  style={{
                    background: isSelected ? sb.bg : 'rgba(13,26,38,0.5)',
                    border: isSelected ? `2px solid ${dc}70` : `1px solid ${sb.border}`,
                    boxShadow: isSelected ? `0 0 12px ${dc}18` : 'none',
                  }}>
                  <div className="flex items-start justify-between gap-sm mb-xs">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-on-surface leading-tight">{c.category}</p>
                      <p className="text-[9px] text-outline">{c.commodity}</p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                      <span className="text-[16px] font-bold leading-none" style={{ color: dc }}>{DIR_ARROW[c.direction] || '?'}</span>
                      <SevBadge severity={c.severity} />
                      <span className="text-[9px] font-bold font-mono-data" style={{ color: dc }}>{itemScore}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-xs mb-xs">
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-outline-variant text-outline">Lag: {c.lag}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-outline-variant text-outline">Pass: {c.severity === 'High' ? 'Fast' : c.severity === 'Moderate' ? 'Medium' : 'Slow'}</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant leading-snug line-clamp-2">{c.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* ── 06. Pressure Mix / Signal Fusion ── */}
      <section>
        <SecHeader num="06" title="PRESSURE MIX — SIGNAL FUSION" />
        <p className="text-[10px] text-outline -mt-sm mb-md">Relative weighting of signal sources driving this analysis</p>
        <div className="rounded-xl p-md flex flex-col md:flex-row gap-lg items-center" style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid #2d3d4e' }}>
          <div className="shrink-0"><PressureRingChart items={pressureMix} size={230} /></div>
          <div className="flex-1 min-w-0 space-y-sm w-full">
            {pressureMix.map(item => (
              <div key={item.label} className="flex items-center gap-sm">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                <span className="text-[11px] text-on-surface w-36 shrink-0">{item.label}</span>
                <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: '#1a2c3d' }}>
                  <div className="bar-fill h-full rounded-full" style={{ width: `${item.weight}%`, background: item.color }} />
                </div>
                <span className="text-[10px] font-bold font-mono-data w-8 text-right shrink-0" style={{ color: item.color }}>{item.weight}%</span>
                <span className="text-[9px] text-outline hidden lg:block w-44 shrink-0">{item.description}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 07. Actionable Watchlist ── */}
      <section>
        <SecHeader num="07" title="ACTIONABLE WATCHLIST — TRIGGERS" />
        <p className="text-[10px] text-outline -mt-sm mb-md">Monitor these signals — each represents a potential regime shift or business decision point</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
          {watchlist.map((w, i) => (
            <div key={w.id} className="rounded-lg p-sm transition-colors" style={{ background: 'rgba(13,26,38,0.5)', border: '1px solid #2d3d4e' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(88,166,255,0.35)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#2d3d4e'}>
              <div className="flex items-start gap-sm mb-xs">
                <span className="text-[8px] font-bold font-mono-data shrink-0 px-1 py-0.5 rounded" style={{ color: '#7dbfff', background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.3)' }}>{String(i + 1).padStart(2, '0')}</span>
                <p className="text-[11px] font-bold text-on-surface leading-tight">{w.name}</p>
              </div>
              <div className="space-y-xs" style={{ marginLeft: 28 }}>
                <div className="flex gap-xs"><span className="text-[9px] font-bold shrink-0 w-14" style={{ color: '#fac84a' }}>TRIGGER</span><p className="text-[10px] text-on-surface-variant leading-snug">{w.trigger}</p></div>
                <div className="flex gap-xs"><span className="text-[9px] font-bold shrink-0 w-14" style={{ color: '#7dbfff' }}>WHY</span><p className="text-[10px] text-on-surface-variant leading-snug">{w.why}</p></div>
                <div className="flex gap-xs"><span className="text-[9px] font-bold shrink-0 w-14 text-outline">AFFECTS</span><p className="text-[9px] text-on-surface-variant leading-snug">{w.who}</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 08. Scenario Outlook ── */}
      <section>
        <SecHeader num="08" title="SCENARIO OUTLOOK" />
        <p className="text-[10px] text-outline -mt-sm mb-md">Three probability-weighted scenarios based on current signal environment</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {scenarios.map(sc => (
            <div key={sc.id} className="rounded-xl p-lg flex flex-col gap-md" style={{ background: 'rgba(13,26,38,0.6)', border: `1px solid #2d3d4e`, borderTop: `3px solid ${sc.color}` }}>
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold text-on-surface leading-tight">{sc.type}</p>
                <div className="flex flex-col items-end shrink-0 gap-xs">
                  <span className="text-[22px] font-bold font-mono-data leading-none" style={{ color: sc.color }}>{sc.prob}%</span>
                  <span className="text-[8px] text-outline">probability</span>
                </div>
              </div>
              <div className="rounded-full overflow-hidden" style={{ height: 3, background: '#1a2c3d' }}>
                <div style={{ width: `${sc.prob}%`, background: sc.color, height: '100%', borderRadius: 9999 }} />
              </div>
              <div>
                <p className="text-[8px] font-bold uppercase tracking-widest mb-xs text-outline">PRICE RANGE</p>
                <p className="text-[10px] font-bold" style={{ color: sc.color }}>{sc.price_range}</p>
              </div>
              <div>
                <p className="text-[8px] font-bold uppercase tracking-widest mb-xs text-outline">CONDITIONS</p>
                <p className="text-[10px] text-on-surface-variant leading-snug">{sc.conditions}</p>
              </div>
              <div className="grid grid-cols-2 gap-xs" style={{ borderTop: '1px solid #1e2d3d', paddingTop: 8 }}>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest mb-xs" style={{ color: '#6edb9a' }}>BENEFITS</p>
                  <ul className="space-y-xs">{sc.benefits.map((b, i) => <li key={i} className="text-[9px] text-on-surface-variant flex gap-xs"><span style={{ color: '#6edb9a' }} className="shrink-0">+</span>{b}</li>)}</ul>
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest mb-xs" style={{ color: '#ff8f8f' }}>SUFFERS</p>
                  <ul className="space-y-xs">{sc.suffers.map((s, i) => <li key={i} className="text-[9px] text-on-surface-variant flex gap-xs"><span style={{ color: '#ff8f8f' }} className="shrink-0">−</span>{s}</li>)}</ul>
                </div>
              </div>
              <p className="text-[9px] text-on-surface-variant italic leading-snug" style={{ borderTop: '1px solid #1e2d3d', paddingTop: 6 }}>{sc.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 09. AI Clarity ── */}
      <section>
        <SecHeader num="09" title="AI CLARITY — HOW THIS WAS DERIVED" />
        <div className="rounded-xl p-md space-y-sm" style={{ background: 'rgba(88,166,255,0.04)', border: '1px solid rgba(88,166,255,0.2)' }}>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#7dbfff' }}>METHODOLOGY</p>
          <p className="text-[12px] text-on-surface leading-relaxed italic" style={{ borderLeft: '2px solid rgba(88,166,255,0.4)', paddingLeft: 10 }}>
            "This conclusion is derived from live price direction, active geo-risk signals, alert density, sector stress, and cross-market confirmation."
          </p>
          <p className="text-[11px] text-on-surface-variant leading-relaxed" style={{ borderTop: '1px solid rgba(45,61,78,0.6)', paddingTop: 10 }}>{explainabilityNote}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-sm" style={{ borderTop: '1px solid rgba(45,61,78,0.6)', paddingTop: 10 }}>
            <div>
              <p className="text-[8px] text-outline uppercase tracking-widest mb-xs">AI CONFIDENCE</p>
              <p className="text-[18px] font-bold font-mono-data" style={{ color: '#7dbfff' }}>{confidence}%</p>
            </div>
            <div>
              <p className="text-[8px] text-outline uppercase tracking-widest mb-xs">GENERATED</p>
              <p className="text-[10px] font-mono-data text-on-surface">{genDate}<br/>{genTime} UTC</p>
            </div>
            <div>
              <p className="text-[8px] text-outline uppercase tracking-widest mb-xs">DATA MODE</p>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold border" style={{ color: statusBadge.col, background: statusBadge.bg, borderColor: statusBadge.border }}>
                {analysisStatus === 'live_generated' ? 'Live AI' : analysisStatus === 'deterministic_generated' ? 'Current Data' : 'Cached Fallback'}
              </span>
            </div>
            <div>
              <p className="text-[8px] text-outline uppercase tracking-widest mb-xs">SOURCES</p>
              <div className="flex flex-wrap gap-xs">
                {['Prices','Geo','Headlines','Cross-Mkt'].map(s => (
                  <span key={s} className="text-[8px] px-1.5 py-0.5 rounded border border-outline-variant text-outline">{s}</span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[9px] text-outline font-mono-data">Model: GEI-AI-v2.4 · Informational only — not financial advice.</p>
        </div>
      </section>

    </div>
  );
}

// ── All Reports Modal ─────────────────────────────────────────────────────────
function AllReportsModal({ items }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('newest');
  const [filterImpact, setFilterImpact] = useState('All');
  const [limit, setLimit] = useState(15);
  let filtered = [...(items || [])];
  if (q) filtered = filtered.filter(i => (i.headline || '').toLowerCase().includes(q.toLowerCase()) || (i.source || '').toLowerCase().includes(q.toLowerCase()));
  if (filterImpact !== 'All') filtered = filtered.filter(i => i.impact === filterImpact);
  if (sort === 'impact')      filtered.sort((a, b) => ['High Impact','Medium Impact','Low Impact'].indexOf(a.impact) - ['High Impact','Medium Impact','Low Impact'].indexOf(b.impact));
  else if (sort === 'sector') filtered.sort((a, b) => (a.sector || '').localeCompare(b.sector || ''));
  else                        filtered.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  const visible = filtered.slice(0, limit);
  return (
    <div className="p-md space-y-md">
      <div className="flex gap-sm flex-wrap">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search headlines…" className="flex-1 min-w-[200px] bg-surface-container border border-outline-variant rounded px-sm py-xs text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary" />
        <select value={sort} onChange={e => setSort(e.target.value)} className="bg-surface-container border border-outline-variant rounded px-sm py-xs text-body-sm text-on-surface focus:outline-none focus:border-primary">
          <option value="newest">Newest First</option>
          <option value="impact">By Impact</option>
          <option value="sector">By Sector</option>
        </select>
        <select value={filterImpact} onChange={e => setFilterImpact(e.target.value)} className="bg-surface-container border border-outline-variant rounded px-sm py-xs text-body-sm text-on-surface focus:outline-none focus:border-primary">
          <option value="All">All Impact</option>
          <option value="High Impact">High Impact</option>
          <option value="Medium Impact">Medium Impact</option>
          <option value="Low Impact">Low Impact</option>
        </select>
      </div>
      <div className="space-y-xs max-h-[60vh] overflow-y-auto custom-scrollbar">
        {visible.map(h => {
          const b = getImpactBadge(h.impact);
          return (
            <div key={h.id} className="p-sm bg-surface-container-high rounded border border-outline-variant hover:border-primary cursor-pointer transition-colors">
              <div className="flex items-center gap-sm mb-xs flex-wrap">
                <span className={`${b.bg} ${b.text} text-[10px] px-2 py-0.5 font-bold rounded`}>{b.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-surface-container text-on-surface-variant rounded">{h.sector}</span>
                <span className="text-[10px] text-outline">{h.time || formatTimestamp(h.timestamp)}</span>
                <span className="text-[9px] px-1.5 py-0.5 border border-primary/30 text-primary rounded font-bold ml-auto">AI-SCORED</span>
              </div>
              <p className="text-body-sm text-on-surface font-bold leading-snug">{h.headline}</p>
              {h.whyItMatters && <p className="text-[11px] text-on-surface-variant mt-xs italic leading-snug">{h.whyItMatters}</p>}
              <p className="text-[10px] text-outline mt-xs">{h.source}</p>
            </div>
          );
        })}
        {filtered.length > limit && (
          <button onClick={() => setLimit(l => l + 15)} className="w-full py-sm text-label-md text-primary hover:underline border border-outline-variant rounded">
            Load more ({filtered.length - limit} remaining)
          </button>
        )}
        {visible.length === 0 && <p className="text-body-sm text-on-surface-variant p-sm">No results found.</p>}
      </div>
    </div>
  );
}

// ── Footer Modal ──────────────────────────────────────────────────────────────
function FooterModal({ data }) {
  const content = {
    methodology: 'GeoEnergy Intelligence AI uses a proprietary data fusion pipeline combining real-time market prices, geopolitical risk scoring, AI-classified news, and satellite telemetry to generate actionable energy market intelligence.',
    compliance:  'This platform is provided for informational purposes only. Data is sourced from public APIs and AI analysis. Not intended as financial or investment advice.',
    support:     'For technical support or feedback, contact the GeoEnergy Intelligence team. Feature requests can be submitted via the project repository.',
    privacy:     'GeoEnergy Intelligence AI does not collect or store personal data. API keys are stored locally in your environment variables and never transmitted to third parties.',
  }[data.type] || '';
  return <div className="p-lg"><p className="text-body-sm text-on-surface-variant leading-relaxed">{content}</p></div>;
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function Modal({ open, type, data, onClose, intelligenceFeed, geoRiskItems, crossMarketSignalSummary, dataMode }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const titles = {
    executiveBriefing: 'Executive AI Intelligence Briefing',
    allReports:        'All Intelligence Reports',
    footer:            data?.title || 'Information',
  };

  let content = null;
  if (open && data) {
    if (type === 'executiveBriefing') content = <BriefingModal briefing={data?.briefing} fullData={data?.fullData} globalFilters={data?.globalFilters} dataMode={dataMode} />;
    else if (type === 'allReports')   content = <AllReportsModal items={data.items || intelligenceFeed} />;
    else if (type === 'footer')       content = <FooterModal data={data} />;
    else content = <div className="p-lg"><p className="text-body-sm text-on-surface-variant">{data.content || ''}</p></div>;
  }

  if (!open) return null;
  const isFullScreen = type === 'executiveBriefing';

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={isFullScreen ? 'modal-briefing-box' : 'modal-box'}>
        <div className="flex items-center justify-between px-md py-sm shrink-0" style={{ borderBottom: '1px solid #2d3d4e' }}>
          <div className="flex items-center gap-sm">
            {isFullScreen && (
              <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.25)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7dbfff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
            )}
            <div>
              <h3 className="text-[15px] font-bold text-on-surface">{titles[type] || type}</h3>
              {isFullScreen && <p className="text-[10px] text-outline mt-0.5">AI impact analysis for traders, businesses, and consumers exposed to energy and cross-market volatility</p>}
            </div>
          </div>
          <div className="flex items-center gap-sm">
            {isFullScreen && (
              <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ color: '#7dbfff', background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.3)' }}>GEI-AI-v2.4</span>
            )}
            <button onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors p-xs"><CloseIcon /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">{content}</div>
      </div>
    </div>
  );
}

