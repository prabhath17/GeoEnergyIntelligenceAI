import { useMemo, useState, useEffect } from 'react';

// ── Premium glow radial gauge ─────────────────────────────────────────────────
function GlowGauge({ value = 82, size = 108 }) {
  const pad = 14, r = (size - pad) / 2, cx = size / 2, cy = size / 2;
  const toRad = d => d * Math.PI / 180;
  const polar = d => ({ x: cx + r * Math.cos(toRad(d)), y: cy + r * Math.sin(toRad(d)) });
  const bgStart = polar(150), bgEnd = polar(390);
  const bgPath  = `M ${bgStart.x.toFixed(2)},${bgStart.y.toFixed(2)} A ${r},${r} 0 1 1 ${bgEnd.x.toFixed(2)},${bgEnd.y.toFixed(2)}`;
  const sweep   = (value / 100) * 240;
  const valEnd  = polar(150 + sweep);
  const valPath = sweep > 0.5 ? `M ${bgStart.x.toFixed(2)},${bgStart.y.toFixed(2)} A ${r},${r} 0 ${sweep > 180 ? 1 : 0} 1 ${valEnd.x.toFixed(2)},${valEnd.y.toFixed(2)}` : '';
  const col     = value >= 85 ? '#ff8f8f' : value >= 70 ? '#fac84a' : value >= 50 ? '#7dbfff' : '#9aa3b0';
  const glowCol = value >= 85 ? 'rgba(255,107,107,0.5)' : value >= 70 ? 'rgba(250,188,69,0.5)' : 'rgba(88,166,255,0.5)';
  const fid = `gf-${size}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 drop-shadow-sm">
      <defs>
        <filter id={fid} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="glow" />
          <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id={`cg-${size}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={glowCol} stopOpacity="0.12" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r + 7} fill={`url(#cg-${size})`} />
      <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={col} strokeWidth="0.5" opacity="0.18" />
      <path d={bgPath} fill="none" stroke="#1a2c3d" strokeWidth="10" strokeLinecap="round" />
      {valPath && <path d={valPath} fill="none" stroke={col} strokeWidth="10" strokeLinecap="round" opacity="0.3" filter={`url(#${fid})`} />}
      {valPath && <path d={valPath} fill="none" stroke={col} strokeWidth="10" strokeLinecap="round" />}
      <text x={cx} y={cy + 1}  textAnchor="middle" fill={col} fontSize={size > 90 ? '22' : '16'} fontWeight="700" fontFamily="IBM Plex Mono, monospace">{value}</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill="#5a7080" fontSize="8" fontFamily="IBM Plex Mono, monospace" letterSpacing="1">AI CONF</text>
    </svg>
  );
}

// ── Mini exposure bar row ─────────────────────────────────────────────────────
function StakeholderRow({ name, score, delay = 0 }) {
  const col   = score >= 80 ? '#ff8f8f' : score >= 65 ? '#fac84a' : '#7dbfff';
  const label = score >= 80 ? 'CRITICAL' : score >= 65 ? 'HIGH' : 'MOD';
  return (
    <div className="flex items-center gap-sm" style={{ animationDelay: `${delay}ms` }}>
      <span className="text-[12px] text-on-surface-variant w-[138px] shrink-0 truncate">{name}</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 7, background: '#1a2c3d' }}>
        <div className="bar-fill h-full rounded-full"
          style={{ width: `${score}%`, background: `linear-gradient(90deg, ${col}99, ${col})`, animationDelay: `${delay + 100}ms` }} />
      </div>
      <span className="text-[11px] font-bold font-mono-data w-6 text-right shrink-0" style={{ color: col }}>{score}</span>
      <span className="text-[9px] font-bold w-12 text-right shrink-0 opacity-80" style={{ color: col }}>{label}</span>
    </div>
  );
}

// ── Posture chip ──────────────────────────────────────────────────────────────
function PostureLabel({ commodity, posture }) {
  return (
    <div className={`flex items-center justify-between px-sm py-xs rounded border posture-chip-${posture}`}>
      <span className="text-[11px] text-on-surface-variant truncate pr-1">{commodity}</span>
      <span className="text-[11px] font-bold font-mono-data shrink-0">{posture}</span>
    </div>
  );
}

// ── Signal pill ───────────────────────────────────────────────────────────────
function SignalPill({ label, value, color }) {
  return (
    <div className="flex items-center justify-between px-sm py-xs rounded border border-outline-variant/50 bg-surface-container-highest/60">
      <span className="text-[9px] text-outline tracking-wider">{label}</span>
      <span className="text-[10px] font-bold font-mono-data" style={{ color }}>{value}</span>
    </div>
  );
}

// ── Commodity tag ─────────────────────────────────────────────────────────────
function CommodityTag({ label }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-outline-variant/60"
      style={{ background: 'rgba(88,166,255,0.08)', color: '#7dbfff' }}>
      {label}
    </span>
  );
}

// ── What changed item ─────────────────────────────────────────────────────────
function ChangeItem({ text, index }) {
  const col = index === 0 ? '#fac84a' : '#9aa3b0';
  return (
    <div className="flex items-start gap-xs">
      <span className="shrink-0 mt-0.5 text-[9px]" style={{ color: col }}>▸</span>
      <span className="text-[11px] text-on-surface-variant leading-snug">{text}</span>
    </div>
  );
}

// ── Analogue card ─────────────────────────────────────────────────────────────
function AnalogueCard({ analogue }) {
  if (!analogue?.eventName) return null;
  return (
    <div className="rounded-xl p-sm" style={{ background: 'rgba(199,157,247,0.06)', border: '1px solid rgba(199,157,247,0.2)' }}>
      <div className="flex items-center justify-between mb-xs">
        <p className="text-[9px] font-bold tracking-widest" style={{ color: '#c79df7' }}>HISTORICAL ANALOGUE</p>
        {analogue.date && <span className="text-[9px] text-outline">{analogue.date}</span>}
      </div>
      <p className="text-[12px] font-bold text-on-surface mb-xs">{analogue.eventName}</p>
      {analogue.lesson && (
        <p className="text-[10px] text-on-surface-variant leading-snug mb-xs">"{analogue.lesson}"</p>
      )}
      {analogue.keyDifferenceToday && (
        <p className="text-[9px] text-outline italic leading-snug">{analogue.keyDifferenceToday}</p>
      )}
    </div>
  );
}

// ── Scenario probability strip ────────────────────────────────────────────────
function ScenarioStrip({ scenarios, probs }) {
  // Support both new schema (scenarios = {base:{probability,label}, bull:{...}, bear:{...}})
  // and old schema (probs = {base:45, bullish:30, bearish:25})
  const segs = scenarios
    ? [
        { id: 'base',    label: 'BASE',    value: scenarios.base?.probability  ?? 45, sublabel: scenarios.base?.label,  color: '#7dbfff' },
        { id: 'bullish', label: 'BULL',    value: scenarios.bull?.probability  ?? 30, sublabel: scenarios.bull?.label,  color: '#fac84a' },
        { id: 'bearish', label: 'BEAR',    value: scenarios.bear?.probability  ?? 25, sublabel: scenarios.bear?.label,  color: '#ff8f8f' },
      ]
    : [
        { id: 'base',    label: 'BASE',    value: probs?.base    ?? 55, color: '#7dbfff' },
        { id: 'bullish', label: 'BULL',    value: probs?.bullish ?? 25, color: '#fac84a' },
        { id: 'bearish', label: 'BEAR',    value: probs?.bearish ?? 20, color: '#ff8f8f' },
      ];
  return (
    <div className="rounded-xl p-sm" style={{ background: 'rgba(8,18,28,0.28)', border: '1px solid rgba(45,61,78,0.55)' }}>
      <div className="flex items-center justify-between mb-xs">
        <p className="text-[10px] font-bold tracking-widest" style={{ color: '#7dbfff' }}>SCENARIO PROBABILITIES</p>
        <span className="text-[9px] text-outline">base / bull / bear</span>
      </div>
      <div className="flex rounded-full overflow-hidden" style={{ height: 8, background: '#1a2c3d' }}>
        {segs.map(s => (
          <div key={s.id} style={{ width: `${s.value}%`, background: `linear-gradient(90deg, ${s.color}99, ${s.color})` }} />
        ))}
      </div>
      <div className="flex justify-between mt-xs">
        {segs.map(s => (
          <div key={s.id} className="flex flex-col items-start">
            <span className="text-[9px] font-bold font-mono-data" style={{ color: s.color }}>{s.label} {s.value}%</span>
            {s.sublabel && <span className="text-[8px] text-outline leading-tight max-w-[100px]" title={s.sublabel}>{s.sublabel.slice(0, 22)}{s.sublabel.length > 22 ? '…' : ''}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cross-market confirmation row ─────────────────────────────────────────────
function ConfirmationRow({ signal }) {
  return (
    <div className="flex items-start gap-xs py-xs" style={{ borderBottom: '1px solid rgba(45,61,78,0.4)' }}>
      <span className="shrink-0 text-[9px] mt-0.5" style={{ color: '#6edb9a' }}>✓</span>
      <span className="text-[10px] text-on-surface-variant leading-snug flex-1">{signal.meaning || signal.description || signal.signal}</span>
    </div>
  );
}

// ── Derive card data from fullData (legacy fallback) ──────────────────────────
function deriveHomeCard(fullData, briefing) {
  const { sectorScores = [], geoRiskItems = [], intelligenceFeed = [], crossMarketSignals = [] } = fullData || {};

  const conf = sectorScores.length
    ? Math.round(sectorScores.reduce((a, s) => a + (s.confidence || 80), 0) / sectorScores.length)
    : (briefing?.analysisConfidence || 82);

  const find    = id => sectorScores.find(s => s.id === id || s.sector?.toLowerCase().replace(/\s+/g, '-') === id);
  const crude   = find('crude-oil');
  const gas     = find('natural-gas');
  const refined = find('refined-products');
  const power   = find('power');

  const bullish  = sectorScores.filter(s => s.sentiment === 'Bullish' || s.sentiment === 'Expanding');
  const bearish  = sectorScores.filter(s => s.sentiment === 'Bearish');
  const critical = geoRiskItems.filter(r => r.riskLevel === 'Critical');
  const highRisk = geoRiskItems.filter(r => r.riskLevel === 'High');
  const hiImpact = intelligenceFeed.filter(i => i.impact === 'High Impact');
  const goldUp   = crossMarketSignals.some(s => (s.id || '').toUpperCase().includes('GOLD') && s.direction === 'up');

  let thesis;
  if (bullish.length > bearish.length && critical.length > 0)
    thesis = `Bullish energy complex with ${critical.length} critical geo-risk event${critical.length > 1 ? 's' : ''} active — supply disruption risk elevated.`;
  else if (bullish.length > bearish.length)
    thesis = `Bullish momentum across ${bullish.slice(0, 2).map(s => s.sector).join(' and ')} — sector sentiment favours upside.`;
  else if (bearish.length > bullish.length)
    thesis = `Bearish signals in ${bearish.slice(0, 2).map(s => s.sector).join(' and ')} — storage surplus and demand weakness.`;
  else
    thesis = `Mixed signals — ${critical.length + highRisk.length} geo-risk zones tracked, ${hiImpact.length} high-impact events active.`;

  const BASE_SH = [
    { name: 'Energy Traders',       base: 88, sectors: ['crude-oil'] },
    { name: 'Fuel Distributors',    base: 82, sectors: ['refined-products'] },
    { name: 'Logistics / Trucking', base: 79, sectors: ['refined-products'] },
    { name: 'Airlines',             base: 76, sectors: ['crude-oil'] },
    { name: 'Investors',            base: 72, sectors: [] },
    { name: 'Manufacturing',        base: 64, sectors: ['power'] },
  ];
  const stakeholders = BASE_SH.map(sh => {
    let score = sh.base;
    if (sh.sectors.includes('crude-oil')        && crude?.sentiment   === 'Bullish')  score = Math.min(96, score + 5);
    if (sh.sectors.includes('crude-oil')        && crude?.sentiment   === 'Bearish')  score = Math.max(20, score - 5);
    if (sh.sectors.includes('refined-products') && refined?.sentiment === 'Volatile') score = Math.min(96, score + 4);
    if (sh.name === 'Investors' && goldUp)                                             score = Math.min(96, score + 8);
    if (critical.length >= 2)                                                          score = Math.min(96, score + 3);
    return { ...sh, score: Math.round(score) };
  }).sort((a, b) => b.score - a.score).slice(0, 4);

  const pc = p => ({ HOLD: '#7dbfff', BUY: '#6edb9a', REDUCE: '#ff8f8f', HEDGE: '#fac84a', MONITOR: '#9aa3b0', WAIT: '#c79df7' }[p] || '#9aa3b0');
  const postures = [
    { label: 'Crude',  posture: crude?.sentiment === 'Bullish' ? 'HOLD' : crude?.sentiment === 'Bearish' ? 'REDUCE' : 'MONITOR' },
    { label: 'Gas',    posture: gas?.sentiment   === 'Bearish' ? 'REDUCE' : gas?.sentiment === 'Bullish' ? 'HOLD' : 'MONITOR' },
    { label: 'Power',  posture: power?.sentiment === 'Steady'  ? 'HOLD'   : power?.sentiment === 'Risk Elevated' ? 'HEDGE' : 'MONITOR' },
    { label: 'Gold',   posture: goldUp ? 'HOLD' : 'MONITOR' },
  ].map(p => ({ ...p, color: pc(p.posture) }));

  const signals = [
    { label: 'GEO RISK',   value: critical.length > 0 ? 'CRITICAL' : highRisk.length > 2 ? 'HIGH' : 'MODERATE', color: critical.length > 0 ? '#ff8f8f' : highRisk.length > 2 ? '#fac84a' : '#7dbfff' },
    { label: 'SUPPLY',     value: critical.length > 1 ? 'ELEVATED' : 'CONTAINED',                                color: critical.length > 1 ? '#fac84a' : '#9aa3b0' },
    { label: 'CONSUMER',   value: hiImpact.length > 3 ? 'PRESSURE' : 'MODERATE',                                 color: hiImpact.length > 3 ? '#fac84a' : '#7dbfff' },
    { label: 'SAFE-HAVEN', value: goldUp ? 'ACTIVE' : 'NEUTRAL',                                                  color: goldUp ? '#fac84a' : '#9aa3b0' },
  ];

  return { conf, thesis, stakeholders, postures, signals };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ExecutiveBriefing({ briefing, onViewFullAnalysis, fullData, structuredBriefing, compact = false }) {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
  useEffect(() => {
    const t = setInterval(() =>
      setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    , 30000);
    return () => clearInterval(t);
  }, []);

  const derived = useMemo(() => deriveHomeCard(fullData, briefing), [fullData, briefing]);

  // ── Prefer structured briefing fields (V1 Rules + RAG) when present ──────
  const sb = structuredBriefing || {};

  const conf              = sb.confidence || briefing?.analysisConfidence || derived.conf;
  const thesis            = briefing?.thesis || derived.thesis;
  const regime            = briefing?.regime || null;
  const scenarioProbs     = briefing?.scenarioProbs || null;
  const forecast          = briefing?.forecast || null;
  const statisticalBenchmarks = briefing?.statisticalBenchmarks || null;

  // New V1 structured fields
  const globalEnergyRegime    = sb.globalEnergyRegime || regime?.name || null;
  const whatChanged24h        = sb.whatChanged24h || [];
  const topMarketRisk         = sb.topMarketRisk || null;
  const mostAffectedCommodities = sb.mostAffectedCommodities || [];
  const mostExposedStakeholders = sb.mostExposedStakeholders || [];
  const baseBullBearScenarios = sb.baseBullBearScenarios || null;
  const crossMarketConfirmations = sb.crossMarketConfirmations || briefing?.compoundSignals || [];
  const contradictions        = sb.contradictions || [];
  const historicalAnalogue    = sb.historicalAnalogue || briefing?.historicalAnalogue || null;
  const watchNext             = sb.watchNext || [];
  const thesisInvalidation    = sb.thesisInvalidation || null;
  const consumerImpactSummary = sb.consumerImpactSummary || null;
  const analysisMode          = sb.analysisMode || 'rules_rag';

  // Stakeholder posture from engine or derive from existing data
  const stakeholderPostureEngine = sb.stakeholderPosture || null;
  const { stakeholders: derivedStakeholders, postures: derivedPostures, signals } = derived;

  // Build posture chips from engine or fallback
  const postures = stakeholderPostureEngine
    ? Object.entries(stakeholderPostureEngine).slice(0, 4).map(([name, data]) => ({
        label: name, posture: data.posture || 'MONITOR',
      }))
    : derivedPostures;

  // Stakeholder rows: prefer most-exposed list from engine, fallback to derived
  const stakeholderRows = mostExposedStakeholders.length
    ? mostExposedStakeholders.slice(0, 4).map((name, i) => ({
        name, score: Math.max(60, 88 - i * 7),
      }))
    : derivedStakeholders;

  const hasStructured = whatChanged24h.length > 0 || topMarketRisk || mostAffectedCommodities.length > 0;

  return (
    <div className="exec-briefing-card rounded-xl flex flex-col min-w-0">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-sm px-md py-sm shrink-0" style={{ borderBottom: '1px solid rgba(45,61,78,0.8)' }}>
        <div className="flex items-center gap-sm min-w-0">
          <div className="shrink-0 w-7 h-7 rounded flex items-center justify-center" style={{ background: 'rgba(88,166,255,0.12)', border: '1px solid rgba(88,166,255,0.25)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7dbfff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-on-surface leading-tight tracking-wide">Executive AI Intelligence Briefing</h2>
            <p className="text-[10px] text-outline mt-0.5 leading-tight">
              {globalEnergyRegime ? `Regime: ${globalEnergyRegime}` : 'Impact analysis · traders · businesses · consumers'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-xs shrink-0">
          <div className="flex items-center gap-xs">
            <span className="w-1.5 h-1.5 rounded-full live-dot shrink-0" style={{ background: '#4ade80' }} />
            <span className="text-[9px] font-bold" style={{ color: '#4ade80' }}>LIVE AI</span>
          </div>
          <span className="text-[9px] font-mono-data text-outline">{time} UTC</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.3)', color: '#7dbfff' }}>
            {analysisMode === 'rules_rag' ? 'GEI-v1-RAG' : 'GEI-AI-v2.4'}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 gap-sm px-md py-md">

        {/* Row 1: Gauge + Thesis */}
        <div className="flex items-start gap-md rounded-xl p-sm" style={{ background: 'rgba(8,18,28,0.35)', border: '1px solid rgba(88,166,255,0.12)' }}>
          <div className="flex flex-col items-center gap-xs shrink-0">
            <GlowGauge value={conf} size={108} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-sm mb-xs flex-wrap">
              <p className="text-[10px] font-bold tracking-widest" style={{ color: '#7dbfff' }}>AI MARKET THESIS</p>
              {regime && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border" title={regime.description}
                  style={{ color: regime.color, background: `${regime.color}14`, borderColor: `${regime.color}55` }}>
                  {regime.name.toUpperCase()}
                </span>
              )}
              {analysisMode === 'rules_rag' && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border" style={{ color: '#6edb9a', background: 'rgba(110,219,154,0.08)', borderColor: 'rgba(110,219,154,0.3)' }}>
                  RULES+RAG
                </span>
              )}
            </div>
            <div className="rounded-lg p-sm" style={{ background: 'rgba(88,166,255,0.06)', border: '1px solid rgba(88,166,255,0.15)', borderLeft: '2px solid rgba(88,166,255,0.5)' }}>
              <p className="text-[13px] text-on-surface leading-relaxed font-semibold">"{thesis}"</p>
            </div>
            <p className="text-[9px] text-outline mt-xs font-mono-data">
              Synthesized from {(fullData?.intelligenceFeed?.length || 0)} signals · {(fullData?.geoRiskItems?.length || 0)} geo-risk zones
            </p>
          </div>
        </div>

        {/* Top Market Risk highlight */}
        {topMarketRisk && (
          <div className="rounded-xl px-sm py-xs flex items-start gap-sm" style={{ background: 'rgba(255,143,143,0.06)', border: '1px solid rgba(255,143,143,0.2)' }}>
            <span className="text-[9px] font-bold shrink-0 mt-0.5" style={{ color: '#ff8f8f' }}>TOP RISK</span>
            <span className="text-[11px] text-on-surface-variant leading-snug flex-1">{topMarketRisk}</span>
          </div>
        )}

        {/* Compact: Affected Commodities chips (brief) */}
        {compact && hasStructured && mostAffectedCommodities.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            <span className="text-[9px] font-bold text-outline tracking-widest shrink-0 mt-0.5">AFFECTED:</span>
            {mostAffectedCommodities.slice(0, 4).map(c => <CommodityTag key={c} label={c} />)}
          </div>
        )}

        {/* Full mode: What Changed 24h */}
        {!compact && hasStructured && whatChanged24h.length > 0 && (
          <div className="rounded-xl p-sm" style={{ background: 'rgba(8,18,28,0.28)', border: '1px solid rgba(45,61,78,0.55)' }}>
            <p className="text-[10px] font-bold tracking-widest mb-xs" style={{ color: '#fac84a' }}>WHAT CHANGED (24H)</p>
            <div className="space-y-xs">
              {whatChanged24h.slice(0, 4).map((text, i) => (
                <ChangeItem key={i} text={text} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Full mode: Affected Commodities chips */}
        {!compact && hasStructured && mostAffectedCommodities.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            <span className="text-[9px] font-bold text-outline tracking-widest shrink-0 mt-0.5">MOST AFFECTED:</span>
            {mostAffectedCommodities.slice(0, 6).map(c => <CommodityTag key={c} label={c} />)}
          </div>
        )}

        {/* Full mode: Cross-market confirmations */}
        {!compact && crossMarketConfirmations.length > 0 && (
          <div className="rounded-xl p-sm" style={{ background: 'rgba(8,18,28,0.28)', border: '1px solid rgba(45,61,78,0.55)' }}>
            <p className="text-[10px] font-bold tracking-widest mb-xs" style={{ color: '#6edb9a' }}>CROSS-MARKET CONFIRMATIONS</p>
            <div>
              {crossMarketConfirmations.slice(0, 3).map((sig, i) => (
                <ConfirmationRow key={i} signal={typeof sig === 'string' ? { signal: sig } : sig} />
              ))}
            </div>
          </div>
        )}

        {/* Full mode: Contradictions detected */}
        {!compact && contradictions.length > 0 && (
          <div className="rounded-xl px-sm py-xs" style={{ background: 'rgba(255,143,143,0.04)', border: '1px solid rgba(255,143,143,0.18)' }}>
            <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: '#ff8f8f' }}>CONTRADICTIONS DETECTED</p>
            <div className="space-y-xs">
              {contradictions.slice(0, 2).map((c, i) => (
                <p key={i} className="text-[10px] text-on-surface-variant leading-snug">⚠ {c}</p>
              ))}
            </div>
          </div>
        )}

        {/* Full mode: Historical Analogue */}
        {!compact && historicalAnalogue && <AnalogueCard analogue={
          typeof historicalAnalogue === 'string'
            ? { eventName: historicalAnalogue }
            : historicalAnalogue
        } />}

        {/* Scenario probabilities */}
        <ScenarioStrip scenarios={baseBullBearScenarios} probs={scenarioProbs} />

        {/* Stakeholder exposure */}
        <div className="rounded-xl p-sm space-y-xs" style={{ background: 'rgba(8,18,28,0.28)', border: '1px solid rgba(45,61,78,0.55)' }}>
          <p className="text-[10px] font-bold tracking-widest mb-xs" style={{ color: '#7dbfff' }}>STAKEHOLDER EXPOSURE INDEX</p>
          {(compact ? stakeholderRows.slice(0, 3) : stakeholderRows).map((s, i) => (
            <StakeholderRow key={s.name} name={s.name} score={s.score} delay={i * 60} />
          ))}
        </div>

        {/* Signal pills row */}
        <div className="grid grid-cols-2 gap-xs">
          {signals.map(s => <SignalPill key={s.label} label={s.label} value={s.value} color={s.color} />)}
        </div>

        {/* Commodity posture chips */}
        <div className="grid grid-cols-2 gap-xs">
          {postures.map(p => <PostureLabel key={p.label} commodity={p.label} posture={p.posture} />)}
        </div>

        {/* Compact: Next trigger / invalidation signal */}
        {compact && (watchNext.length > 0 || thesisInvalidation) && (
          <div className="rounded-xl px-sm py-xs flex items-start gap-sm"
            style={{ background: 'rgba(250,188,69,0.04)', border: '1px solid rgba(250,188,69,0.18)' }}>
            <span className="text-[9px] font-bold shrink-0 mt-0.5 tracking-widest" style={{ color: '#fac84a' }}>
              {watchNext.length > 0 ? 'NEXT TRIGGER' : 'INVALIDATION'}
            </span>
            <span className="text-[10px] text-on-surface-variant leading-snug flex-1">
              {watchNext.length > 0 ? watchNext[0] : thesisInvalidation}
            </span>
          </div>
        )}

        {/* Full mode: Consumer pass-through */}
        {!compact && consumerImpactSummary && (
          <div className="rounded-xl p-sm" style={{ background: 'rgba(250,188,69,0.05)', border: '1px solid rgba(250,188,69,0.2)' }}>
            <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: '#fac84a' }}>CONSUMER PASS-THROUGH</p>
            <p className="text-[11px] text-on-surface-variant leading-snug">{
              typeof consumerImpactSummary === 'string'
                ? consumerImpactSummary
                : consumerImpactSummary.summary || JSON.stringify(consumerImpactSummary)
            }</p>
          </div>
        )}

        {/* Full mode: Watch next triggers */}
        {!compact && watchNext.length > 0 && (
          <div className="rounded-xl p-sm" style={{ background: 'rgba(8,18,28,0.28)', border: '1px solid rgba(45,61,78,0.55)' }}>
            <p className="text-[9px] font-bold tracking-widest mb-xs text-outline">WATCH NEXT</p>
            <div className="space-y-xs">
              {watchNext.slice(0, 3).map((trigger, i) => (
                <p key={i} className="text-[10px] text-on-surface-variant leading-snug">
                  <span className="text-outline mr-1">→</span>{trigger}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Full mode: Thesis invalidation signal */}
        {!compact && thesisInvalidation && (
          <div className="rounded-xl px-sm py-xs flex items-start gap-sm"
            style={{ background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,143,143,0.18)' }}>
            <span className="text-[9px] font-bold shrink-0 mt-0.5" style={{ color: '#ff8f8f' }}>INVALIDATION</span>
            <span className="text-[10px] text-on-surface-variant leading-snug flex-1">{thesisInvalidation}</span>
          </div>
        )}

        {/* Full mode: Forecast row (legacy) */}
        {!compact && forecast && (
          <div className="rounded-xl p-sm space-y-xs" style={{ background: 'rgba(8,18,28,0.28)', border: '1px solid rgba(45,61,78,0.55)' }}>
            <p className="text-[10px] font-bold tracking-widest" style={{ color: '#7dbfff' }}>PRICE FORECAST RANGE</p>
            <div className="flex items-center gap-xs">
              <span className="text-[11px] font-bold font-mono-data" style={{ color: '#ff8f8f' }}>Bear: {forecast.bear}</span>
              <span className="text-outline text-[9px]">·</span>
              <span className="text-[11px] font-bold font-mono-data" style={{ color: '#7dbfff' }}>Base: {forecast.base}</span>
              <span className="text-outline text-[9px]">·</span>
              <span className="text-[11px] font-bold font-mono-data" style={{ color: '#6edb9a' }}>Bull: {forecast.bull}</span>
            </div>
            {forecast.timeframe && <p className="text-[9px] text-outline">Timeframe: {forecast.timeframe}</p>}
          </div>
        )}

        {/* Full mode: Statistical benchmarks (legacy) */}
        {!compact && statisticalBenchmarks && (
          <div className="rounded-xl p-sm" style={{ background: 'rgba(8,18,28,0.28)', border: '1px solid rgba(45,61,78,0.55)' }}>
            <p className="text-[10px] font-bold tracking-widest mb-xs" style={{ color: '#fac84a' }}>STATISTICAL BENCHMARKS</p>
            <p className="text-[11px] text-on-surface">{statisticalBenchmarks.regime}</p>
            <p className="text-[10px] text-on-surface-variant mt-xs">Sigma {statisticalBenchmarks.sigma} · volatility {statisticalBenchmarks.volatilityRegime} · pass-through lag {statisticalBenchmarks.passThroughLag}</p>
          </div>
        )}

      </div>

      {/* ── Footer CTA ── */}
      {onViewFullAnalysis && (
        <div className="px-md pt-sm pb-md shrink-0" style={{ borderTop: '1px solid rgba(45,61,78,0.8)' }}>
          <button
            onClick={onViewFullAnalysis}
            className="cta-view-analysis w-full rounded-xl font-bold tracking-wide"
            style={{ padding: '20px 24px', minHeight: 82 }}
            aria-label="View Full AI Analysis"
          >
            <div className="flex flex-col items-center gap-1 relative z-10">
              <span className="flex items-center gap-2 text-[15px] font-bold">
                View Full AI Analysis
                <span style={{ color: '#fac84a', fontSize: 17 }}>→</span>
              </span>
              <span className="text-[10px] font-normal" style={{ color: 'rgba(162,201,255,0.65)' }}>
                Open full thesis, scenarios, stakeholders &amp; historical analogues
              </span>
            </div>
          </button>
        </div>
      )}

    </div>
  );
}
