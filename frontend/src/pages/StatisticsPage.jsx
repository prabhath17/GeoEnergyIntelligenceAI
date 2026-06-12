import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchPredictionForecast, fetchStatisticsSnapshot } from '../services/api.js';

const INSTRUMENT_CONFIGS = {
  'crude-oil':        { name:'Crude Oil (WTI)',    unit:'USD/bbl',   currency:'$',  baseline:78.42,  vol:0.015, sentiment:'Bullish',   confidence:84, type:'energy',       relatedGeo:'Strait of Hormuz',  yLabel:'Price (USD/bbl)' },
  'brent':            { name:'Brent Crude',        unit:'USD/bbl',   currency:'$',  baseline:82.15,  vol:0.014, sentiment:'Bullish',   confidence:86, type:'energy',       relatedGeo:'Middle East',       yLabel:'Price (USD/bbl)' },
  'natural-gas':      { name:'Natural Gas',        unit:'USD/MMBtu', currency:'$',  baseline:2.34,   vol:0.025, sentiment:'Bearish',   confidence:62, type:'energy',       relatedGeo:'Eastern Europe',    yLabel:'Price (USD/MMBtu)' },
  'ttf':              { name:'EU TTF Gas',         unit:'USD/MMBtu', currency:'$',  baseline:10.80,  vol:0.032, sentiment:'Volatile',  confidence:73, type:'energy',       relatedGeo:'Europe',            yLabel:'Price (USD/MMBtu)' },
  'diesel':           { name:'Diesel',             unit:'USc/gal',   currency:'',   baseline:124.50, vol:0.012, sentiment:'Volatile',  confidence:78, type:'energy',       relatedGeo:'Gulf Coast',        yLabel:'Price (USc/gal)' },
  'gasoline':         { name:'Gasoline',           unit:'USD/gal',   currency:'$',  baseline:2.58,   vol:0.013, sentiment:'Bullish',   confidence:75, type:'energy',       relatedGeo:'North America',     yLabel:'Price (USD/gal)' },
  'jet-fuel':         { name:'Jet Fuel',           unit:'USD/gal',   currency:'$',  baseline:3.15,   vol:0.014, sentiment:'Volatile',  confidence:72, type:'energy',       relatedGeo:'Global Aviation',   yLabel:'Price (USD/gal)' },
  'power':            { name:'Power (EU)',          unit:'EUR/MWh',   currency:'€',  baseline:94.20,  vol:0.020, sentiment:'Steady',    confidence:91, type:'energy',       relatedGeo:'Europe',            yLabel:'Price (EUR/MWh)' },
  'renewables':       { name:'Renewables Index',   unit:'Index',     currency:'',   baseline:95.00,  vol:0.010, sentiment:'Expanding', confidence:95, type:'energy',       relatedGeo:'Southern Europe',   yLabel:'Index Value' },
  'gold':             { name:'Gold',               unit:'USD/oz',    currency:'$',  baseline:2341.20,vol:0.008, sentiment:'Bullish',   confidence:88, type:'cross-market', relatedGeo:'Global',            yLabel:'Price (USD/oz)' },
  'silver':           { name:'Silver',             unit:'USD/oz',    currency:'$',  baseline:31.24,  vol:0.014, sentiment:'Bullish',   confidence:76, type:'cross-market', relatedGeo:'Global',            yLabel:'Price (USD/oz)' },
  'copper':           { name:'Copper',             unit:'USD/lb',    currency:'$',  baseline:4.52,   vol:0.015, sentiment:'Bearish',   confidence:74, type:'cross-market', relatedGeo:'Asia Pacific',      yLabel:'Price (USD/lb)' },
  'wheat':            { name:'Wheat',              unit:'USc/bu',    currency:'',   baseline:582.40, vol:0.018, sentiment:'Volatile',  confidence:79, type:'cross-market', relatedGeo:'Black Sea',         yLabel:'Price (USc/bu)' },
  'uranium':          { name:'Uranium',            unit:'USD/lb',    currency:'$',  baseline:86.40,  vol:0.012, sentiment:'Bullish',   confidence:82, type:'cross-market', relatedGeo:'Kazakhstan',        yLabel:'Price (USD/lb)' },
  'lithium':          { name:'Lithium (LIT ETF)',  unit:'USD/share', currency:'$',  baseline:42.80,  vol:0.022, sentiment:'Bearish',   confidence:69, type:'cross-market', relatedGeo:'South America',     yLabel:'Index Value' },
  'coal':             { name:'Coal (ARA)',          unit:'USD/t',     currency:'$',  baseline:138.40, vol:0.016, sentiment:'Steady',    confidence:77, type:'cross-market', relatedGeo:'Europe',            yLabel:'Price (USD/t)' },
  'carbon':           { name:'Carbon EU ETS',      unit:'EUR/t',     currency:'€',  baseline:64.20,  vol:0.024, sentiment:'Bearish',   confidence:81, type:'cross-market', relatedGeo:'Europe',            yLabel:'Price (EUR/t)' },
  'aluminum':         { name:'Aluminum',           unit:'USD/t',     currency:'$',  baseline:2285.00,vol:0.013, sentiment:'Steady',    confidence:72, type:'cross-market', relatedGeo:'Europe / China',    yLabel:'Price (USD/t)' },
  'freight':          { name:'BDI / Freight',      unit:'Index',     currency:'',   baseline:1842.00, vol:0.028, sentiment:'Volatile',  confidence:69, type:'cross-market', relatedGeo:'Global Shipping',   yLabel:'Index Value' },
};

const RANGES = ['7D','30D','90D','YTD','1Y','5Y'];

const RANGE_CONFIG = {
  '7D':  { points:7,   stepDays:1,   labelFmt:'dayOnly',     devFactor:0.04 },
  '30D': { points:30,  stepDays:1,   labelFmt:'monthDay',    devFactor:0.10 },
  '90D': { points:13,  stepDays:7,   labelFmt:'monthDay',    devFactor:0.18 },
  'YTD': { points:22,  stepDays:7,   labelFmt:'monthDay',    devFactor:0.22 },
  '1Y':  { points:52,  stepDays:7,   labelFmt:'monthYear',   devFactor:0.30 },
  '5Y':  { points:60,  stepDays:30,  labelFmt:'monthYear',   devFactor:0.55 },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateLabel(d, fmt) {
  if (fmt === 'dayOnly')    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  if (fmt === 'monthDay')   return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  if (fmt === 'monthYear')  return `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function niceNum(range, round) {
  const exp   = Math.floor(Math.log10(range));
  const frac  = range / Math.pow(10, exp);
  let nf;
  if (round) {
    if      (frac < 1.5) nf = 1;
    else if (frac < 3)   nf = 2;
    else if (frac < 7)   nf = 5;
    else                 nf = 10;
  } else {
    if      (frac <= 1)  nf = 1;
    else if (frac <= 2)  nf = 2;
    else if (frac <= 5)  nf = 5;
    else                 nf = 10;
  }
  return nf * Math.pow(10, exp);
}

function niceTicks(minV, maxV, numTicks = 5) {
  const range  = niceNum(maxV - minV, false);
  const step   = niceNum(range / (numTicks - 1), true);
  const niceMin = Math.floor(minV / step) * step;
  const niceMax = Math.ceil(maxV  / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
    ticks.push(parseFloat(v.toFixed(10)));
  }
  return ticks;
}

function generateData(instrumentId, range) {
  const cfg = INSTRUMENT_CONFIGS[instrumentId];
  if (!cfg) return null;
  const rc = RANGE_CONFIG[range] || RANGE_CONFIG['30D'];
  const seed = instrumentId.split('').reduce((a,c) => a+c.charCodeAt(0), 0);
  const prng = i => { const x = Math.sin(seed * 9.7 + i * 127.3) * 43758.5; return x - Math.floor(x); };

  const now = new Date('2026-06-05');
  const startPrice = cfg.baseline * (1 + (prng(0) * 2 - 1) * rc.devFactor);
  const dailyVol = cfg.vol * cfg.baseline * Math.sqrt(rc.stepDays);

  const priceSeries = Array.from({ length: rc.points }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (rc.points - 1 - i) * rc.stepDays);
    const t = rc.points > 1 ? i / (rc.points - 1) : 1;
    const trended = startPrice + (cfg.baseline - startPrice) * t;
    const noise = (prng(i + 5) - 0.5) * dailyVol * 1.5;
    const val = Math.max(cfg.baseline * 0.4, trended + noise);
    return { date: formatDateLabel(d, rc.labelFmt), rawDate: d.toISOString(), value: parseFloat(val.toFixed(2)) };
  });
  priceSeries[priceSeries.length - 1].value = cfg.baseline;

  const vals = priceSeries.map(p => p.value);
  const high = Math.max(...vals);
  const low  = Math.min(...vals);
  const highIdx = vals.indexOf(high);
  const lowIdx  = vals.indexOf(low);
  const firstPrice = priceSeries[0].value;
  const periodChange = parseFloat(((cfg.baseline - firstPrice) / firstPrice * 100).toFixed(2));

  const evtAt = [
    Math.max(0, Math.floor(rc.points * 0.2)),
    Math.floor(rc.points * 0.5),
    Math.max(0, Math.floor(rc.points * 0.8)),
  ];
  const keyEvents = [
    { date: priceSeries[evtAt[0]].date, event: `${cfg.name} enters new pricing regime — AI signal triggered`, type: 'signal' },
    { date: priceSeries[evtAt[1]].date, event: `Supply/demand balance shift detected — confidence updated`, type: 'balance' },
    { date: priceSeries[evtAt[2]].date, event: `Geopolitical event in ${cfg.relatedGeo} affects ${cfg.name}`, type: 'geo' },
  ];

  const confidenceSeries = priceSeries.map((p, i) => ({
    date: p.date,
    value: Math.min(100, Math.max(30, cfg.confidence + (prng(i + 10) - 0.5) * 18)),
  }));
  const sentiments = ['Bullish','Bullish','Neutral','Bearish','Volatile','Bullish'];
  const sentimentSeries = priceSeries.filter((_, i) => i % Math.max(1, Math.floor(rc.points / 8)) === 0).map((p, i) => ({
    date: p.date,
    value: sentiments[(seed + i) % sentiments.length],
  }));

  return {
    name: cfg.name, unit: cfg.unit, currency: cfg.currency, yLabel: cfg.yLabel,
    currentPrice: cfg.baseline, priceSeries, keyEvents, highIdx, lowIdx,
    summaryStats: {
      currentSentiment: cfg.sentiment,
      currentConfidence: cfg.confidence,
      periodChange,
      averageConfidence: parseFloat((confidenceSeries.reduce((a,c) => a + c.value, 0) / confidenceSeries.length).toFixed(0)),
      periodHigh: high, periodLow: low,
    },
    confidenceSeries, sentimentSeries,
  };
}

function drawChart(canvas, data, keyEvents, highIdx, lowIdx) {
  if (!canvas || !data?.length) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const pad = { l: 68, r: 40, t: 28, b: 42 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;

  ctx.clearRect(0, 0, W, H);

  const vals   = data.map(d => d.value);
  const minRaw = Math.min(...vals);
  const maxRaw = Math.max(...vals);
  const ticks  = niceTicks(minRaw * 0.995, maxRaw * 1.005, 6);
  const minV   = ticks[0];
  const maxV   = ticks[ticks.length - 1];
  const yScale = v => pad.t + chartH - ((v - minV) / (maxV - minV)) * chartH;
  const xOf    = i => pad.l + (i / (data.length - 1)) * chartW;

  // Subtle vertical grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  const xSteps = Math.min(data.length, 8);
  for (let i = 0; i < xSteps; i++) {
    const x = pad.l + (i / (xSteps - 1)) * chartW;
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + chartH); ctx.stroke();
  }

  // Horizontal grid + y-axis labels
  ticks.forEach(tick => {
    const y = yScale(tick);
    if (y < pad.t - 2 || y > pad.t + chartH + 2) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + chartW, y); ctx.stroke();
    ctx.fillStyle = '#8b919d';
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.textAlign = 'right';
    const label = tick >= 1000 ? tick.toFixed(0) : tick >= 10 ? tick.toFixed(1) : tick.toFixed(2);
    ctx.fillText(label, pad.l - 8, y + 4);
  });

  // Area gradient fill
  const points = data.map((d, i) => ({ x: xOf(i), y: yScale(d.value) }));
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + chartH);
  const isUp = data[data.length-1].value >= data[0].value;
  if (isUp) {
    grad.addColorStop(0, 'rgba(88,166,255,0.22)');
    grad.addColorStop(1, 'rgba(88,166,255,0)');
  } else {
    grad.addColorStop(0, 'rgba(147,0,10,0.22)');
    grad.addColorStop(1, 'rgba(147,0,10,0)');
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cpx = (points[i-1].x + points[i].x) / 2;
    ctx.bezierCurveTo(cpx, points[i-1].y, cpx, points[i].y, points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length-1].x, pad.t + chartH);
  ctx.lineTo(points[0].x, pad.t + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Smooth price line with glow
  const lineColor = isUp ? '#58a6ff' : '#ef4444';
  ctx.shadowColor = isUp ? 'rgba(88,166,255,0.5)' : 'rgba(239,68,68,0.5)';
  ctx.shadowBlur  = 6;
  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cpx = (points[i-1].x + points[i].x) / 2;
    ctx.bezierCurveTo(cpx, points[i-1].y, cpx, points[i].y, points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Key event vertical lines
  const eventDates = (keyEvents || []).map(e => e.date);
  data.forEach((d, i) => {
    if (eventDates.includes(d.date)) {
      const x = xOf(i);
      ctx.strokeStyle = 'rgba(210,153,34,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + chartH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, yScale(d.value), 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fabc45'; ctx.fill();
      ctx.strokeStyle = '#0b141c'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  });

  // Period high marker
  if (highIdx != null && highIdx >= 0 && highIdx < data.length) {
    const x = xOf(highIdx); const y = yScale(data[highIdx].value);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e'; ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 9px IBM Plex Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('H', x, y - 8);
  }

  // Period low marker
  if (lowIdx != null && lowIdx >= 0 && lowIdx < data.length) {
    const x = xOf(lowIdx); const y = yScale(data[lowIdx].value);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444'; ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 9px IBM Plex Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('L', x, y + 16);
  }

  // Start price label
  const startPt = points[0];
  const startVal = data[0].value;
  ctx.font = '10px IBM Plex Mono, monospace';
  const startLbl = startVal >= 1000 ? startVal.toFixed(0) : startVal >= 10 ? startVal.toFixed(1) : startVal.toFixed(2);
  const sw = ctx.measureText(startLbl).width + 8;
  ctx.fillStyle = 'rgba(15,23,32,0.85)';
  ctx.strokeStyle = 'rgba(139,145,157,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.rect(startPt.x + 4, startPt.y - 9, sw, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8b919d'; ctx.textAlign = 'left';
  ctx.fillText(startLbl, startPt.x + 8, startPt.y + 3);

  // Latest price bubble
  const lastPt  = points[points.length - 1];
  const lastVal = data[data.length - 1].value;
  ctx.font = 'bold 10px IBM Plex Mono, monospace';
  const lastLbl = lastVal >= 1000 ? lastVal.toFixed(0) : lastVal >= 10 ? lastVal.toFixed(1) : lastVal.toFixed(2);
  const lw = ctx.measureText(lastLbl).width + 12;
  ctx.fillStyle = lineColor;
  ctx.beginPath(); ctx.rect(lastPt.x - lw / 2, lastPt.y - 18, lw, 16); ctx.fill();
  ctx.fillStyle = '#0b141c'; ctx.textAlign = 'center';
  ctx.fillText(lastLbl, lastPt.x, lastPt.y - 7);
  ctx.beginPath(); ctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = lineColor; ctx.fill();
  ctx.strokeStyle = '#0b141c'; ctx.lineWidth = 2; ctx.stroke();

  // X-axis labels
  const maxLabels = 8;
  const step = Math.max(1, Math.floor(data.length / maxLabels));
  ctx.fillStyle = '#6b7280'; ctx.font = '10px IBM Plex Sans, sans-serif'; ctx.textAlign = 'center';
  data.forEach((d, i) => {
    if (i % step === 0 || i === data.length - 1) {
      ctx.fillText(d.date, xOf(i), H - 8);
    }
  });

  // Axis border
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + chartH); ctx.lineTo(pad.l + chartW, pad.t + chartH); ctx.stroke();
}

function PriceChart({ data, keyEvents, highIdx, lowIdx }) {
  const canvasRef     = useRef(null);
  const containerRef  = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const redraw = useCallback(() => {
    if (canvasRef.current && dataRef.current?.length) {
      drawChart(canvasRef.current, dataRef.current, keyEvents, highIdx, lowIdx);
    }
  }, [keyEvents, highIdx, lowIdx]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(redraw);
    ro.observe(containerRef.current);
    redraw();
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => { redraw(); }, [data, redraw]);

  const handleMouseMove = (e) => {
    if (!canvasRef.current || !data?.length) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const padL = 68; const padR = 40;
    const chartW = rect.width - padL - padR;
    const idx = Math.round(((mx - padL) / chartW) * (data.length - 1));
    if (idx >= 0 && idx < data.length) {
      const prev = data[idx - 1];
      const curr = data[idx];
      const chg  = prev ? parseFloat((curr.value - prev.value).toFixed(3)) : 0;
      const pct  = prev ? parseFloat(((curr.value - prev.value) / prev.value * 100).toFixed(2)) : 0;
      const evt  = (keyEvents || []).find(ev => ev.date === curr.date);
      setTooltip({ ...curr, idx, chg, pct, event: evt?.event || null, x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-[340px] 2xl:h-[410px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: 'crosshair', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div
          className="absolute z-10 bg-surface-container-highest border border-outline-variant rounded-lg p-sm text-[11px] font-mono-data text-on-surface pointer-events-none shadow-xl"
          style={{ left: Math.min(tooltip.x + 14, 280), top: Math.max(4, tooltip.y - 80), minWidth: 160 }}
        >
          <p className="text-outline mb-xs">{tooltip.date}</p>
          <p className="font-bold text-primary text-[13px]">{tooltip.value.toFixed(tooltip.value >= 1000 ? 0 : tooltip.value >= 10 ? 1 : 2)}</p>
          {tooltip.chg !== 0 && (
            <p className={tooltip.chg > 0 ? 'text-primary' : 'text-error'}>
              {tooltip.chg > 0 ? '+' : ''}{tooltip.chg.toFixed(tooltip.value >= 100 ? 1 : 2)} ({tooltip.pct > 0 ? '+' : ''}{tooltip.pct}%)
            </p>
          )}
          {tooltip.event && <p className="text-tertiary mt-xs text-[10px] leading-tight border-t border-outline-variant pt-xs">{tooltip.event}</p>}
        </div>
      )}
    </div>
  );
}

function ConfidenceTrend({ series }) {
  if (!series?.length) return null;
  const max = 100;
  const step = Math.max(1, Math.floor(series.length / 12));
  const visible = series.filter((_, i) => i % step === 0 || i === series.length - 1);
  return (
    <div className="flex items-end gap-px h-10">
      {visible.map((p, i) => {
        const h = Math.max(2, Math.round((p.value / max) * 40));
        const pct = p.value / 100;
        const r = Math.round(pct < 0.5 ? 147 + (88 - 147) * pct * 2 : 88);
        const g = Math.round(pct < 0.5 ? 0  + (166 - 0) * pct * 2 : 166);
        const b = Math.round(pct < 0.5 ? 10 + (255 - 10) * pct * 2 : 255);
        return <div key={i} style={{ flex: 1, height: h, background: `rgb(${r},${g},${b})`, borderRadius: 1, opacity: 0.8 }} title={`${p.date}: ${Math.round(p.value)}%`} />;
      })}
    </div>
  );
}

function SentimentHistory({ series }) {
  if (!series?.length) return null;
  const colors = { Bullish:'bg-primary text-on-primary', Bearish:'bg-error-container text-on-error-container', Neutral:'bg-surface-container-highest text-on-surface-variant', Volatile:'bg-tertiary-container text-on-tertiary-container', Expanding:'bg-primary-container text-on-primary-container' };
  return (
    <div className="flex flex-wrap gap-xs">
      {series.map((p, i) => (
        <div key={i} className="flex items-center gap-xs">
          <span className="text-[9px] text-outline font-mono-data">{p.date}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${colors[p.value] || colors.Neutral}`}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

const STAT_ID_MAP = {
  'crude-oil': 'WTI',
  brent: 'BRENT',
  'natural-gas': 'NATGAS',
  ttf: 'TTF',
  diesel: 'DIESEL',
  gasoline: 'DIESEL',
  'jet-fuel': 'DIESEL',
  power: 'EU_POWER',
  renewables: 'CARBON',
  gold: 'GOLD',
  silver: 'SILVER',
  copper: 'COPPER',
  wheat: 'WHEAT',
  uranium: 'URANIUM',
  lithium: 'LITHIUM',
  coal: 'COAL',
  carbon: 'CARBON',
  aluminum: 'ALUMINUM',
  freight: 'FREIGHT',
};

function formatStatValue(value, digits = 1, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  const n = Number(value);
  return `${n >= 1000 ? n.toFixed(0) : n.toFixed(digits)}${suffix}`;
}

function normalizeApiSeries(stats, fallbackSeries) {
  const pts = stats?.dataPoints || [];
  if (!pts.length) return fallbackSeries;
  const visible = pts.slice(-Math.max(30, Math.min(260, fallbackSeries.length || 90)));
  return visible.map((p) => {
    const d = p.date ? new Date(p.date) : new Date();
    return {
      date: Number.isNaN(d.getTime()) ? String(p.date || '') : formatDateLabel(d, visible.length > 80 ? 'monthYear' : 'monthDay'),
      rawDate: p.date,
      value: Number(p.price),
    };
  }).filter(p => Number.isFinite(p.value));
}

function RangePosition({ value = 50 }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[9px] text-outline mb-xs">
        <span>LOW</span><span>TYPICAL RANGE</span><span>HIGH</span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: '#1a2c3d' }}>
        <div className="absolute inset-y-0 left-0" style={{ width: `${value}%`, background: 'linear-gradient(90deg, rgba(88,166,255,0.55), rgba(250,188,69,0.9))' }} />
      </div>
      <p className="text-[10px] text-outline mt-xs font-mono-data">{formatStatValue(value, 1, '%')} percentile/range position</p>
    </div>
  );
}

export default function StatisticsPage() {
  const [instrument, setInstrument] = useState('crude-oil');
  const [range, setRange] = useState('30D');
  const [forecast, setForecast] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const data = generateData(instrument, range);
  const cfg  = INSTRUMENT_CONFIGS[instrument];
  const statId = STAT_ID_MAP[instrument] || instrument;
  const chartSeries = normalizeApiSeries(stats, data?.priceSeries || []);
  const chartEvents = stats?.analogueEvents?.length
    ? stats.analogueEvents.slice(0, 3).map((event, i) => ({
      date: chartSeries[Math.min(chartSeries.length - 1, Math.max(0, Math.floor((i + 1) * chartSeries.length / 4)))]?.date,
      event: `${event.eventName}: ${event.lesson}`,
      type: 'signal',
    }))
    : data?.keyEvents || [];
  const chartValues = chartSeries.map(p => p.value);
  const apiHighIdx = chartValues.indexOf(Math.max(...chartValues));
  const apiLowIdx = chartValues.indexOf(Math.min(...chartValues));

  useEffect(() => {
    let cancelled = false;
    fetchPredictionForecast(statId, range)
      .then(res => { if (!cancelled) setForecast(res); })
      .catch(() => { if (!cancelled) setForecast(null); });
    return () => { cancelled = true; };
  }, [statId, range]);

  useEffect(() => {
    let cancelled = false;
    setStatsError(null);
    fetchStatisticsSnapshot(statId, range === '5Y' ? '5y' : '1y')
      .then(res => { if (!cancelled) setStats(res); })
      .catch(err => {
        if (!cancelled) {
          setStats(null);
          setStatsError(err?.message || 'Statistics unavailable');
        }
      });
    return () => { cancelled = true; };
  }, [statId, range]);

  const sentColor = {
    Bullish:'text-primary', Bearish:'text-error',
    Volatile:'text-tertiary', Steady:'text-on-surface-variant',
    Expanding:'text-primary',
  }[cfg?.sentiment] || 'text-on-surface-variant';

  const handleEnergyChange = (e) => { if (e.target.value) setInstrument(e.target.value); };
  const handleCrossChange  = (e) => { if (e.target.value) setInstrument(e.target.value); };

  const periodChg = range === '30D'
    ? (stats?.change30d ?? (data?.summaryStats.periodChange ?? 0))
    : (data?.summaryStats.periodChange ?? 0);
  const volatilityLabel = (range === '30D' && stats?.historicVolatility30d != null)
    ? `${formatStatValue(stats.historicVolatility30d, 1)}%`
    : `${Math.abs(data?.summaryStats.periodChange ?? 0) >= 8 ? 'High' : Math.abs(data?.summaryStats.periodChange ?? 0) >= 3 ? 'Moderate' : 'Low'}`;

  const energyVal      = cfg?.type === 'energy'       ? instrument : '';
  const crossMarketVal = cfg?.type === 'cross-market' ? instrument : '';

  return (
    <div className="page-enter">
      <main className="max-w-[1920px] mx-auto p-md space-y-md">

        {/* Header row: title left, range buttons right */}
        <div className="flex items-start justify-between gap-md flex-wrap">
          <div>
            <h2 className="text-headline-sm font-bold">Statistics</h2>
            <p className="text-body-sm text-on-surface-variant mt-xs">PDF-trained commodity statistics, regimes, benchmarks, correlations, and historical analogues.</p>
          </div>
          <div className="flex items-center gap-xs flex-wrap">
            <span className="text-[10px] text-on-surface-variant font-bold mr-xs">RANGE</span>
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-sm py-xs rounded text-[11px] font-bold border transition-colors ${
                  range === r
                    ? 'bg-primary-container border-primary text-on-primary-container'
                    : 'bg-surface-container border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Instrument selectors */}
        <div className="flex flex-wrap gap-md items-end">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant mb-xs tracking-widest">ENERGY</p>
            <select
              value={energyVal}
              onChange={handleEnergyChange}
              className="bg-surface-container border border-outline-variant rounded px-sm py-xs text-body-sm text-on-surface focus:outline-none focus:border-primary min-w-[160px]"
            >
              <option value="">— Energy —</option>
              {Object.entries(INSTRUMENT_CONFIGS).filter(([,v]) => v.type === 'energy').map(([k,v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant mb-xs tracking-widest">CROSS-MARKET</p>
            <select
              value={crossMarketVal}
              onChange={handleCrossChange}
              className="bg-surface-container border border-outline-variant rounded px-sm py-xs text-body-sm text-on-surface focus:outline-none focus:border-primary min-w-[160px]"
            >
              <option value="">— Cross-Market —</option>
              {Object.entries(INSTRUMENT_CONFIGS).filter(([,v]) => v.type === 'cross-market').map(([k,v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </div>
          {cfg && (
            <div className="flex items-center gap-sm pb-xs">
              <span className="text-[10px] font-mono-data text-outline border border-outline-variant px-2 py-0.5 rounded">{cfg.unit}</span>
              <span className={`text-[10px] font-bold ${sentColor}`}>{cfg.sentiment?.toUpperCase()}</span>
            </div>
          )}
        </div>

        {data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-sm">
              {[
                {
                  label: 'CURRENT PRICE',
                  value: `${data.currency}${formatStatValue(stats?.currentPrice ?? data.currentPrice, 2)}`,
                  sub: stats?.unit || data.unit,
                  color: 'text-on-surface',
                },
                {
                  label: `${range} CHANGE`,
                  value: `${periodChg >= 0 ? '+' : ''}${formatStatValue(periodChg, 2, '%')}`,
                  sub: `${data.summaryStats.periodChange >= 0 ? '+' : ''}${(data.currentPrice - data.priceSeries[0].value).toFixed(2)} ${data.unit}`,
                  color: periodChg >= 0 ? 'text-primary' : 'text-error',
                },
                {
                  label: 'ACTIVE REGIME',
                  value: stats?.regime || data.summaryStats.currentSentiment,
                  sub: stats?.statisticalAnomaly ? '2-sigma anomaly flagged' : 'PDF benchmark state',
                  color: stats?.statisticalAnomaly ? 'text-error' : sentColor,
                },
                {
                  label: 'Z-SCORE',
                  value: formatStatValue(stats?.zScore12m, 2),
                  sub: `Range position ${formatStatValue(stats?.rangePosition, 1, '%')}`,
                  color: 'text-primary',
                },
                {
                  label: `${range} VOLATILITY`,
                  value: volatilityLabel,
                  sub: stats?.volatilityRegime || `${range} realized range`,
                  color: stats?.volatilityRegime === 'ELEVATED' ? 'text-error' : 'text-tertiary',
                },
                {
                  label: 'DATA SOURCE',
                  value: stats?.dataSourceStatus?.includes('live') ? 'LIVE' : 'FALLBACK',
                  sub: stats?.dataSource || `${cfg.relatedGeo} linked`,
                  color: 'text-on-surface',
                },
                {
                  label: 'P50 FORECAST',
                  value: forecast?.p50BaseForecast != null ? `${data.currency}${forecast.p50BaseForecast}` : 'Pending',
                  sub: forecast?.modelType || 'model-ready fallback',
                  color: 'text-primary',
                },
              ].map(c => (
                <div key={c.label} className="px-md py-sm bg-surface-container border border-outline-variant rounded-lg">
                  <p className="text-[10px] font-bold text-on-surface-variant tracking-widest mb-0.5">{c.label}</p>
                  <p className={`text-headline-sm font-bold ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] text-outline mt-0.5 font-mono-data">{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant flex-wrap gap-sm">
                <div className="flex items-center gap-md">
                  <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">{data.name.toUpperCase()} — {range}</h3>
                  <div className="flex items-center gap-md text-[10px]">
                    <div className="flex items-center gap-xs">
                      <span className="w-6 h-0.5 bg-primary inline-block" />
                      <span className="text-outline">Price</span>
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                      <span className="text-outline">Event</span>
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      <span className="text-outline">H — Period High</span>
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                      <span className="text-outline">L — Period Low</span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-outline font-mono-data">{data.yLabel}</span>
              </div>
              <div className="px-md pt-sm pb-md">
                <p className="text-[9px] text-outline mb-xs text-right font-mono-data">← Date →</p>
                <PriceChart
                  data={chartSeries}
                  keyEvents={chartEvents}
                  highIdx={apiHighIdx >= 0 ? apiHighIdx : data.highIdx}
                  lowIdx={apiLowIdx >= 0 ? apiLowIdx : data.lowIdx}
                />
              </div>
            </div>

            {stats && (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-md">
                  <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
                    <div className="px-md py-sm border-b border-outline-variant">
                      <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">HISTORICAL BENCHMARK</h3>
                      <p className="text-[10px] text-outline mt-0.5">Long-run range and extremes from statistics training data</p>
                    </div>
                    <div className="p-md space-y-sm">
                      <RangePosition value={stats.rangePosition} />
                      <div className="grid grid-cols-2 gap-xs">
                        {[
                          ['LONG-RUN MEAN', `${data.currency}${formatStatValue(stats.benchmarkStats.longRunMean, 2)}`],
                          ['TYPICAL RANGE', `${formatStatValue(stats.benchmarkStats.typicalRangeLow, 2)} - ${formatStatValue(stats.benchmarkStats.typicalRangeHigh, 2)}`],
                          ['ALL-TIME HIGH', `${formatStatValue(stats.benchmarkStats.allTimeHigh, 2)} (${stats.benchmarkStats.allTimeHighDate})`],
                          ['ALL-TIME LOW', `${formatStatValue(stats.benchmarkStats.allTimeLow, 2)} (${stats.benchmarkStats.allTimeLowDate})`],
                          ['VOL BENCHMARK', `${formatStatValue(stats.benchmarkStats.annualisedVolBenchmark, 1)}% annualized`],
                          ['MEAN DEVIATION', `${formatStatValue(stats.deviationFromLongRunMean, 1, '%')}`],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded px-sm py-xs" style={{ background: 'rgba(8,18,28,0.45)', border: '1px solid rgba(45,61,78,0.65)' }}>
                            <p className="text-[9px] text-outline tracking-widest">{label}</p>
                            <p className="text-[11px] text-on-surface font-bold leading-snug">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
                    <div className="px-md py-sm border-b border-outline-variant">
                      <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">REGIME THRESHOLDS</h3>
                      <p className="text-[10px] text-outline mt-0.5">Active trigger status and commodity-specific rules</p>
                    </div>
                    <div className="p-md space-y-sm">
                      <div className="flex items-center justify-between rounded-lg px-sm py-xs" style={{ background: 'rgba(250,188,69,0.08)', border: '1px solid rgba(250,188,69,0.2)' }}>
                        <span className="text-[10px] text-outline tracking-widest">ACTIVE REGIME</span>
                        <span className="text-[12px] font-bold" style={{ color: stats.statisticalAnomaly ? '#ff8f8f' : '#fac84a' }}>{stats.regime}</span>
                      </div>
                      <div className="space-y-xs">
                        {stats.regimeTriggers.slice(0, 5).map(trigger => (
                          <div key={trigger.name} className="flex items-start gap-sm rounded px-sm py-xs" style={{ background: 'rgba(8,18,28,0.45)', border: `1px solid ${trigger.active ? 'rgba(250,188,69,0.35)' : 'rgba(45,61,78,0.65)'}` }}>
                            <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: trigger.active ? '#fac84a' : '#39495a' }} />
                            <div>
                              <p className="text-[10px] font-bold text-on-surface">{trigger.name}</p>
                              <p className="text-[10px] text-on-surface-variant leading-snug">{trigger.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-outline leading-snug border-t border-outline-variant pt-sm">{stats.regimeInterpretationRules?.[0]}</p>
                    </div>
                  </div>

                  <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
                    <div className="px-md py-sm border-b border-outline-variant">
                      <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">STATISTICAL INTERPRETATION</h3>
                      <p className="text-[10px] text-outline mt-0.5">Fact, statistical context, implication</p>
                    </div>
                    <div className="p-md space-y-sm">
                      <p className="text-body-sm text-on-surface leading-relaxed">{stats.statisticalInterpretation}</p>
                      <div className="grid grid-cols-2 gap-xs">
                        <div className="rounded px-sm py-xs" style={{ background: 'rgba(8,18,28,0.45)', border: '1px solid rgba(45,61,78,0.65)' }}>
                          <p className="text-[9px] text-outline tracking-widest">PASS-THROUGH</p>
                          <p className="text-[11px] text-on-surface-variant">{stats.consumerPassThroughLag}</p>
                        </div>
                        <div className="rounded px-sm py-xs" style={{ background: 'rgba(8,18,28,0.45)', border: '1px solid rgba(45,61,78,0.65)' }}>
                          <p className="text-[9px] text-outline tracking-widest">MODEL METHOD</p>
                          <p className="text-[11px] text-on-surface-variant">{stats.volatilityModelRecommendation}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-outline leading-snug">{stats.modelDisclosure}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
                  <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
                    <div className="px-md py-sm border-b border-outline-variant">
                      <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">CORRELATION / LEAD-LAG</h3>
                      <p className="text-[10px] text-outline mt-0.5">Top related assets and condition-aware warnings</p>
                    </div>
                    <div className="p-md space-y-xs">
                      {stats.correlations.slice(0, 5).map((corr) => (
                        <div key={corr.pair} className="rounded-lg p-sm" style={{ background: 'rgba(8,18,28,0.45)', border: '1px solid rgba(45,61,78,0.65)' }}>
                          <div className="flex items-center justify-between gap-sm mb-xs">
                            <p className="text-[11px] font-bold text-on-surface">{stats.commodity} / {corr.pair}</p>
                            <span className="text-[10px] font-bold font-mono-data" style={{ color: corr.coefficient < 0 ? '#ff8f8f' : '#7dbfff' }}>{corr.range}</span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant leading-snug">{corr.relationship}. {corr.leadLag}.</p>
                          <p className="text-[10px] text-outline mt-xs leading-snug">Confirm: {corr.condition} Breakdown: {corr.breakdown}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
                    <div className="px-md py-sm border-b border-outline-variant">
                      <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">HISTORICAL ANALOGUE</h3>
                      <p className="text-[10px] text-outline mt-0.5">Closest PDF-trained regime events</p>
                    </div>
                    <div className="p-md space-y-xs">
                      {stats.analogueEvents.slice(0, 3).map((event) => (
                        <div key={event.eventName} className="rounded-lg p-sm" style={{ background: 'rgba(8,18,28,0.45)', border: '1px solid rgba(45,61,78,0.65)' }}>
                          <div className="flex items-center justify-between gap-sm mb-xs">
                            <p className="text-[11px] font-bold text-on-surface">{event.eventName}</p>
                            <span className="text-[9px] font-mono-data text-outline">{event.date}</span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant leading-snug">{event.priceMove}</p>
                          <div className="grid grid-cols-2 gap-xs mt-xs">
                            <div>
                              <p className="text-[9px] text-outline tracking-widest">SIGNIFICANCE</p>
                              <p className="text-[10px] text-on-surface-variant">{event.statisticalSignificance}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-outline tracking-widest">RECOVERY</p>
                              <p className="text-[10px] text-on-surface-variant">{event.recoveryTime}</p>
                            </div>
                          </div>
                          <p className="text-[10px] mt-xs" style={{ color: '#fac84a' }}>Lesson: <span className="text-on-surface-variant">{event.lesson}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {statsError && (
              <div className="bg-surface-container border border-outline-variant rounded-lg p-md">
                <p className="text-[11px] text-tertiary font-bold">Statistics API fallback active</p>
                <p className="text-[10px] text-outline mt-xs">{statsError}</p>
              </div>
            )}

            {/* AI Confidence Trend + Sentiment History */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
                <div className="px-md py-sm border-b border-outline-variant">
                  <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">AI CONFIDENCE TREND</h3>
                  <p className="text-[10px] text-outline mt-0.5">Confidence score across {range} period</p>
                </div>
                <div className="p-md">
                  <ConfidenceTrend series={data.confidenceSeries} />
                  <div className="flex items-center justify-between mt-sm text-[10px]">
                    <span className="text-outline">Low confidence</span>
                    <span className="text-outline font-mono-data">Avg: {data.summaryStats.averageConfidence}%</span>
                    <span className="text-outline">High confidence</span>
                  </div>
                  <div className="mt-sm flex items-center gap-xs">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: 'linear-gradient(to right, #93000a, #fabc45, #58a6ff)' }} />
                  </div>
                </div>
              </div>

              <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
                <div className="px-md py-sm border-b border-outline-variant">
                  <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">SENTIMENT HISTORY</h3>
                  <p className="text-[10px] text-outline mt-0.5">AI sentiment snapshots over {range}</p>
                </div>
                <div className="p-md">
                  <SentimentHistory series={data.sentimentSeries} />
                  <div className="mt-sm pt-sm border-t border-outline-variant flex items-center gap-sm flex-wrap">
                    {['Bullish','Bearish','Volatile','Neutral','Expanding'].map(s => {
                      const map = { Bullish:'bg-primary text-on-primary', Bearish:'bg-error-container text-on-error-container', Neutral:'bg-surface-container-highest text-on-surface-variant', Volatile:'bg-tertiary-container text-on-tertiary-container', Expanding:'bg-primary-container text-on-primary-container' };
                      return <span key={s} className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${map[s]}`}>{s}</span>;
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Events Timeline */}
            <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
              <div className="px-md py-sm border-b border-outline-variant">
                <h3 className="text-label-md text-on-surface-variant font-bold tracking-widest">KEY EVENTS TIMELINE</h3>
                <p className="text-[10px] text-outline mt-0.5">AI-detected market events for {data.name} over {range}</p>
              </div>
              <div className="divide-y divide-outline-variant">
                {data.keyEvents.map((ev, i) => {
                  const typeIcons = { signal: '◈', balance: '⇌', geo: '⚑' };
                  const typeColors = { signal: 'text-primary', balance: 'text-on-surface-variant', geo: 'text-tertiary' };
                  return (
                    <div key={i} className="flex items-start gap-md px-md py-sm">
                      <span className="text-[10px] font-mono-data text-outline shrink-0 w-20 mt-0.5">{ev.date}</span>
                      <span className={`shrink-0 text-sm ${typeColors[ev.type] || 'text-tertiary'}`}>{typeIcons[ev.type] || '●'}</span>
                      <p className="text-body-sm text-on-surface leading-snug">{ev.event}</p>
                    </div>
                  );
                })}
              </div>
            </div>

          </>
        )}
      </main>
    </div>
  );
}
