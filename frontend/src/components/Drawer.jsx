import { useEffect } from 'react';
import { getSentimentLabel, getRiskLevel, getGeoRiskBarColor, getImpactBadge, getDirectionColorClass, formatTimestamp } from '../utils/helpers.js';

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}

function SectorDetail({ data, intelligenceFeed, onOpenModal }) {
  const si = getSentimentLabel(data.sentiment);
  const ri = getRiskLevel(data.riskLevel);
  const related = (intelligenceFeed || []).filter(h => h.sector === data.sector || (h.relatedSectors || []).includes(data.sector));
  const bars = (data.sparklineData || []).slice(-8).map((v, i, arr) => {
    const max = Math.max(...arr);
    const h = Math.max(4, Math.round((v / max) * 48));
    const col = data.sentiment === 'Bearish' ? '#93000a' : data.sentiment === 'Volatile' ? '#d29922' : '#58a6ff';
    return <div key={i} style={{ width: 10, height: h, background: col, borderRadius: 1 }} />;
  });

  return (
    <div className="space-y-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-label-md text-on-surface-variant mb-xs">{data.sector.toUpperCase()}</p>
          <p className="text-headline-sm font-bold">{data.confidence}% Confidence</p>
          <p className={`text-body-sm mt-xs ${data.changeVsYesterday?.startsWith('+') ? 'text-primary' : 'text-error'}`}>{data.changeVsYesterday} vs yesterday</p>
        </div>
        <span className={`text-[11px] px-2 py-1 border ${si.borderClass} ${si.colorClass} rounded-sm tracking-wider font-bold`}>{si.label}</span>
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">AI CONFIDENCE TREND</p>
        <div className="flex items-end gap-1 h-12">{bars}</div>
        <p className="text-[10px] text-outline mt-xs">Last 8 analysis cycles</p>
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">AI REASON</p>
        <p className="text-body-sm text-on-surface leading-relaxed">{data.reason}</p>
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">WATCH ITEM</p>
        <span className="text-[10px] font-mono-data text-tertiary border border-tertiary/40 px-2 py-0.5 rounded">⚑ {data.watchItem}</span>
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant mb-sm">RISK LEVEL</p>
        <div className="flex items-center gap-sm">
          <span className={`text-body-sm font-bold ${ri.colorClass}`}>{ri.label}</span>
          <div className="flex-1 bg-outline-variant h-1 rounded-full">
            <div className={`${getGeoRiskBarColor(data.riskLevel)} h-full rounded-full`} style={{ width: `${data.riskLevel==='Critical'?92:data.riskLevel==='High'?75:data.riskLevel==='Moderate'?50:25}%` }} />
          </div>
        </div>
      </div>
      {(data.affectedRegions || []).length > 0 && (
        <div>
          <p className="text-label-md text-on-surface-variant mb-sm">AFFECTED REGIONS</p>
          <div className="flex flex-wrap gap-xs">
            {data.affectedRegions.map(r => <span key={r} className="text-[10px] px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded-full border border-outline-variant">{r}</span>)}
          </div>
        </div>
      )}
      {(data.topRiskFactors || []).length > 0 && (
        <div>
          <p className="text-label-md text-on-surface-variant mb-sm">TOP RISK FACTORS</p>
          <ul className="space-y-xs">
            {data.topRiskFactors.map((f, i) => (
              <li key={i} className="flex gap-sm text-body-sm text-on-surface-variant">
                <span className="text-tertiary font-mono-data text-xs mt-0.5">{String(i+1).padStart(2,'0')}</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {related.length > 0 && (
        <div>
          <p className="text-label-md text-on-surface-variant mb-sm">RELATED HEADLINES</p>
          <div className="space-y-sm">
            {related.slice(0,3).map(h => {
              const b = getImpactBadge(h.impact);
              return (
                <div key={h.id} className="p-sm bg-surface-container-high rounded border border-outline-variant/50">
                  <div className="flex items-center gap-xs mb-xs">
                    <span className={`${b.bg} ${b.text} text-[10px] px-2 py-0.5 font-bold rounded`}>{b.label}</span>
                    <span className="text-[10px] text-outline">{h.time}</span>
                  </div>
                  <p className="text-body-sm text-on-surface leading-snug">{h.headline}</p>
                  <p className="text-[10px] text-outline mt-xs">{h.source}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <button onClick={onOpenModal} className="w-full py-sm bg-primary-container text-on-primary-container text-label-md font-bold rounded flex items-center justify-center gap-xs hover:brightness-110 transition-all">
        VIEW FULL ANALYSIS
      </button>
    </div>
  );
}

function DrawerSparkline({ data, direction }) {
  if (!data?.length || data.length < 2) return null;
  const w = 280, h = 56;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = direction === 'up' ? '#58a6ff' : direction === 'down' ? '#ff6b6b' : '#c0c7d4';
  const lv = data[data.length - 1];
  const ex = w, ey = h - ((lv - min) / range) * (h - 6) - 3;
  const fv = data[0];
  const sy = h - ((fv - min) / range) * (h - 6) - 3;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="rounded overflow-hidden">
      <defs>
        <linearGradient id="drawer-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${sy} ${pts} ${ex},${ey} ${w},${h} 0,${h}`} fill="url(#drawer-spark-fill)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ex} cy={ey} r="3" fill={color} />
    </svg>
  );
}

function SignalDetail({ data, intelligenceFeed }) {
  const col    = getDirectionColorClass(data.direction);
  const prefix = data.changePercent > 0 ? '+' : '';
  const arrow  = data.direction === 'up' ? '↑' : data.direction === 'down' ? '↓' : '→';

  const relH = (intelligenceFeed || []).filter(h => {
    const sectors = data.linkedSectors || [];
    if (sectors.some(s => h.sector === s || (h.relatedSectors || []).includes(s))) return true;
    const keywords = [data.name?.toLowerCase(), data.id?.toLowerCase()].filter(Boolean);
    return keywords.some(kw => (h.headline || '').toLowerCase().includes(kw) || (h.whyItMatters || '').toLowerCase().includes(kw));
  }).slice(0, 4);

  const confColor = (data.aiConfidence || 0) >= 80 ? 'text-primary border-primary/40' : (data.aiConfidence || 0) >= 65 ? 'text-tertiary border-tertiary/40' : 'text-error border-error/40';

  const priceDisplay = typeof data.price === 'number'
    ? (data.price >= 1000 ? data.price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : data.price.toFixed(2))
    : data.price;

  return (
    <div className="space-y-md">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-label-md text-on-surface-variant mb-xs">{(data.signalType || 'CROSS-MARKET SIGNAL').toUpperCase()}</p>
          <p className="text-headline-sm font-bold">{data.name}</p>
          <div className="flex items-baseline gap-sm mt-xs">
            <p className="text-headline-md font-bold font-mono-data text-on-surface">{data.currency}{priceDisplay}</p>
            <span className="text-[11px] text-outline">{data.unit}</span>
          </div>
          <p className={`text-body-md font-mono-data font-bold mt-xs ${col}`}>{arrow} {prefix}{typeof data.changePercent === 'number' ? data.changePercent.toFixed(1) : data.changePercent}%  today</p>
        </div>
        {data.aiConfidence && (
          <span className={`text-[10px] px-2 py-1 border rounded font-bold ${confColor}`}>{data.aiConfidence}% AI CONF</span>
        )}
      </div>

      {/* Sparkline */}
      {data.sparkline?.length >= 2 && (
        <div className="bg-surface-container-high rounded-lg p-sm overflow-hidden">
          <p className="text-[10px] text-outline mb-xs">7-DAY PRICE TREND</p>
          <DrawerSparkline data={data.sparkline} direction={data.direction} />
          <div className="flex justify-between mt-xs">
            <span className="text-[10px] font-mono-data text-outline">{data.currency}{typeof data.sparkline[0] === 'number' ? (data.sparkline[0] >= 1000 ? data.sparkline[0].toLocaleString('en-US',{maximumFractionDigits:0}) : data.sparkline[0].toFixed(2)) : data.sparkline[0]} (7d ago)</span>
            <span className="text-[10px] font-mono-data text-outline">Now: {data.currency}{priceDisplay}</span>
          </div>
        </div>
      )}

      {/* Why it matters */}
      {data.whyItMatters && (
        <div className="bg-surface-container-highest p-sm rounded border border-primary/20">
          <p className="text-[10px] font-bold text-primary mb-xs tracking-widest">WHY THIS MATTERS TO ENERGY</p>
          <p className="text-body-sm text-on-surface leading-relaxed">{data.whyItMatters}</p>
        </div>
      )}

      {/* Linked energy sectors */}
      {(data.linkedSectors || []).length > 0 && (
        <div>
          <p className="text-label-md text-on-surface-variant mb-xs">ENERGY SECTORS IMPACTED</p>
          <div className="flex flex-wrap gap-xs">
            {data.linkedSectors.map(s => (
              <span key={s} className="text-[10px] px-2 py-1 bg-primary-container/20 border border-primary/30 text-primary rounded font-bold">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* AI intelligence note */}
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">AI MARKET INTELLIGENCE</p>
        <div className="bg-surface-container-high border border-outline-variant rounded p-sm space-y-xs">
          <p className="text-[10px] text-outline">Relevance: <span className="text-on-surface-variant">{data.relevance || data.signalType}</span></p>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">{data.whyItMatters}</p>
          <div className="flex items-center gap-sm pt-xs border-t border-outline-variant/50">
            <div className="flex-1 bg-outline-variant h-1 rounded-full overflow-hidden">
              <div style={{ width: `${data.aiConfidence || 70}%`, background: '#58a6ff', height: '100%', borderRadius: 9999 }} />
            </div>
            <span className="text-[10px] text-outline font-mono-data shrink-0">AI confidence: {data.aiConfidence || 70}%</span>
          </div>
        </div>
      </div>

      {/* Related headlines */}
      {relH.length > 0 && (
        <div>
          <p className="text-label-md text-on-surface-variant mb-sm">RELATED INTELLIGENCE</p>
          <div className="space-y-xs">
            {relH.map(h => {
              const b = getImpactBadge(h.impact);
              return (
                <div key={h.id} className="p-sm bg-surface-container-high border border-outline-variant/50 rounded">
                  <div className="flex items-center gap-xs mb-xs flex-wrap">
                    <span className={`${b.bg} ${b.text} text-[10px] px-2 py-0.5 font-bold rounded`}>{b.label}</span>
                    <span className="text-[10px] text-outline">{h.time || '—'}</span>
                    <span className="text-[10px] text-outline">· {h.source}</span>
                  </div>
                  <p className="text-body-sm text-on-surface leading-snug">{h.headline}</p>
                  {h.whyItMatters && <p className="text-[10px] text-outline mt-xs italic">{h.whyItMatters}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {relH.length === 0 && (
        <div className="p-sm bg-surface-container-high border border-outline-variant rounded">
          <p className="text-[10px] text-outline">No directly linked headlines in current feed. Signal context above provides AI-derived market intelligence.</p>
        </div>
      )}

      {/* Source */}
      <div className="pt-sm border-t border-outline-variant flex items-center justify-between">
        <p className="text-[10px] text-outline">Data source: {data.source === 'Mock' ? 'GEI Mock / Derived' : (data.source || 'GEI Signal')}</p>
        <span className="text-[9px] px-1.5 py-0.5 border border-outline-variant text-outline rounded">AI-SCORED</span>
      </div>
    </div>
  );
}

function TickerDetail({ data, sectorScores, intelligenceFeed }) {
  const col = getDirectionColorClass(data.direction);
  const prefix = data.changePercent > 0 ? '+' : '';
  const sectorMap = { WTI: 'Crude Oil', BRENT: 'Crude Oil', NATGAS: 'Natural Gas', DIESEL: 'Refined Products', GASOLINE: 'Refined Products', EU_POWER: 'Power' };
  const relSector = (sectorScores || []).find(s => s.sector === sectorMap[data.id]);
  const relH = (intelligenceFeed || []).filter(h => h.sector === (relSector?.sector || 'Crude Oil')).slice(0,3);
  return (
    <div className="space-y-md">
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">{data.name.toUpperCase()}</p>
        <p className="text-headline-lg font-bold">{data.currency}{data.price.toFixed(2)}</p>
        <p className={`text-body-lg font-mono-data ${col}`}>{prefix}{data.changePercent.toFixed(1)}% <span className="text-body-sm text-outline">{data.unit}</span></p>
        <p className="text-[10px] text-outline mt-xs">Source: {data.source}</p>
      </div>
      {relSector && (
        <div>
          <p className="text-label-md text-on-surface-variant mb-sm">RELATED SECTOR</p>
          <div className="p-sm bg-surface-container-high rounded border border-outline-variant">
            <div className="flex justify-between">
              <span className="text-body-sm font-bold">{relSector.sector}</span>
              <span className={`text-[10px] ${getSentimentLabel(relSector.sentiment).colorClass}`}>{relSector.sentiment.toUpperCase()}</span>
            </div>
            <p className="text-[10px] text-outline mt-xs">AI Confidence: {relSector.confidence}%</p>
          </div>
        </div>
      )}
      {relH.length > 0 && (
        <div>
          <p className="text-label-md text-on-surface-variant mb-sm">RELATED INTELLIGENCE</p>
          <div className="space-y-xs">
            {relH.map(h => {
              const b = getImpactBadge(h.impact);
              return (
                <div key={h.id} className="p-xs bg-surface-container-high rounded border border-outline-variant/50">
                  <span className={`${b.bg} ${b.text} text-[10px] px-2 py-0.5 font-bold rounded`}>{b.label}</span>
                  <p className="text-body-sm text-on-surface leading-snug mt-xs">{h.headline}</p>
                  <p className="text-[10px] text-outline">{h.time} · {h.source}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GeoRiskDetail({ data, intelligenceFeed }) {
  const ri = getRiskLevel(data.riskLevel);
  const relH = (intelligenceFeed || []).filter(h => (h.relatedRegions || []).some(r => data.countryOrArea.includes(r) || r.includes(data.region))).slice(0,3);
  return (
    <div className="space-y-lg">
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">GEO-RISK REGION</p>
        <p className="text-headline-sm font-bold">{data.countryOrArea}</p>
        <p className="text-body-sm text-on-surface-variant">{data.region}</p>
      </div>
      <div className="flex items-center gap-md">
        <div><p className="text-label-md text-on-surface-variant">RISK SCORE</p><p className={`text-headline-md font-bold ${ri.colorClass}`}>{data.riskScore}</p></div>
        <div><p className="text-label-md text-on-surface-variant">RISK LEVEL</p><span className={`text-body-sm font-bold ${ri.colorClass} border ${ri.colorClass.replace('text-','border-')} px-2 py-0.5 rounded-sm`}>{ri.label}</span></div>
      </div>
      <div className="w-full bg-outline-variant h-2 rounded-full">
        <div className={`${getGeoRiskBarColor(data.riskLevel)} h-full rounded-full transition-all duration-1000`} style={{ width: `${data.riskScore*10}%` }} />
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">EVENT TYPE</p>
        <span className="text-[10px] px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded border border-outline-variant">{(data.eventType || '').toUpperCase()}</span>
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">AFFECTED SECTORS</p>
        <div className="flex flex-wrap gap-xs">
          {(data.affectedSectors || []).map(s => <span key={s} className="text-[10px] px-2 py-0.5 bg-surface-container-high border border-outline-variant rounded-full text-on-surface-variant">{s}</span>)}
        </div>
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">MARKET IMPACT</p>
        <p className="text-body-sm text-on-surface leading-relaxed">{data.marketImpact}</p>
      </div>
      <div className="grid grid-cols-2 gap-sm">
        <div><p className="text-label-md text-on-surface-variant">SOURCE</p><p className="text-body-sm text-on-surface">{data.source}</p></div>
        <div><p className="text-label-md text-on-surface-variant">UPDATED</p><p className="text-body-sm text-on-surface">{formatTimestamp(data.timestamp)}</p></div>
      </div>
      {relH.length > 0 && (
        <div>
          <p className="text-label-md text-on-surface-variant mb-sm">RELATED HEADLINES</p>
          <div className="space-y-sm">
            {relH.map(h => {
              const b = getImpactBadge(h.impact);
              return (
                <div key={h.id} className="p-sm bg-surface-container-high rounded border border-outline-variant/50">
                  <span className={`${b.bg} ${b.text} text-[10px] px-2 py-0.5 font-bold rounded`}>{b.label}</span>
                  <p className="text-body-sm text-on-surface mt-xs">{h.headline}</p>
                  <p className="text-[10px] text-outline">{h.time} · {h.source}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedItemDetail({ data }) {
  const badge = getImpactBadge(data?.impact || 'Medium Impact');
  const sentiment = data?.sentimentEffect || 'Neutral';
  const sentColMap = { Bullish: '#6edb9a', Bearish: '#ff8f8f', Neutral: '#9aa3b0', Volatile: '#fac84a', 'Risk Elevated': '#fac84a' };
  const sentCol = sentColMap[sentiment] || '#9aa3b0';
  const impactBorder = data?.impact === 'High Impact' ? 'rgba(255,143,143,0.4)' : data?.impact === 'Medium Impact' ? 'rgba(250,188,69,0.35)' : 'rgba(88,166,255,0.3)';
  const impactAccent = data?.impact === 'High Impact' ? '#ff8f8f' : data?.impact === 'Medium Impact' ? '#fac84a' : '#7dbfff';

  const catColMap = { 'Cross-Market': '#c79df7', 'Geo Risk': '#fac84a', 'Market Move': '#a2c9ff', 'Supply Chain': '#7dbfff', 'Policy': '#9aa3b0' };
  const catCol = catColMap[data?.category] || '#8b919d';

  // Derived recommended action from sentimentEffect
  const actionMap = {
    Bullish:        { posture: 'MONITOR / LONG', col: '#6edb9a', bg: 'rgba(110,219,154,0.08)', note: 'Bullish signal — consider monitoring for entry opportunities in related sectors.' },
    Bearish:        { posture: 'REDUCE / HEDGE', col: '#ff8f8f', bg: 'rgba(255,143,143,0.08)', note: 'Bearish signal — review exposure and consider hedging strategies.' },
    Volatile:       { posture: 'HEDGE / WAIT',   col: '#fac84a', bg: 'rgba(250,188,69,0.08)',  note: 'Elevated volatility — reduce size or hedge before full position.' },
    'Risk Elevated':{ posture: 'WATCH / HEDGE',  col: '#fac84a', bg: 'rgba(250,188,69,0.08)',  note: 'Risk premium elevated — watch for follow-through before committing direction.' },
    Neutral:        { posture: 'MONITOR',         col: '#9aa3b0', bg: 'rgba(134,144,160,0.06)', note: 'Neutral signal — monitor for regime change before taking action.' },
  };
  const action = actionMap[sentiment] || actionMap.Neutral;

  return (
    <div className="space-y-md">

      {/* Header badges */}
      <div className="flex items-center gap-xs flex-wrap">
        {data?.isBreaking && (
          <span className="px-2 py-0.5 bg-error text-on-error text-[9px] font-bold rounded breaking-badge">BREAKING</span>
        )}
        <span className={badge.bg + ' ' + badge.text + ' text-[10px] font-bold px-2 py-0.5 rounded-sm'}>{badge.label}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
          style={{ color: '#7dbfff', background: 'rgba(88,166,255,0.1)', borderColor: 'rgba(88,166,255,0.3)' }}>AI-SCORED</span>
        <span className="ml-auto text-[9px] font-mono-data text-outline">{data?.time || formatTimestamp(data?.timestamp)}</span>
      </div>

      {/* Headline */}
      <div className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.6)', border: `1px solid ${impactBorder}`, borderLeft: `3px solid ${impactAccent}` }}>
        <h3 className="text-[15px] font-bold text-on-surface leading-snug">{data?.headline || data?.title}</h3>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-xs flex-wrap">
        <span className="text-[9px] font-bold px-2 py-0.5 rounded border"
          style={{ color: '#8b919d', borderColor: 'rgba(45,61,78,0.8)', background: 'rgba(13,26,38,0.5)' }}>
          {(data?.sector || '').toUpperCase()}
        </span>
        {data?.category && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded border"
            style={{ color: catCol, borderColor: `${catCol}50`, background: `${catCol}12` }}>
            {data.category}
          </span>
        )}
        <span className="text-[9px] font-bold px-2 py-0.5 rounded border"
          style={{ color: sentCol, borderColor: `${sentCol}40`, background: `${sentCol}10` }}>
          {sentiment.toUpperCase()}
        </span>
        {data?.aiConfidence && (
          <span className="text-[9px] font-mono-data text-outline ml-auto">{data.aiConfidence}% AI CONF</span>
        )}
      </div>

      {/* AI Confidence bar */}
      {data?.aiConfidence && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[8px] font-bold tracking-widest" style={{ color: '#7dbfff' }}>AI CONFIDENCE</span>
            <span className="text-[9px] font-mono-data font-bold" style={{ color: '#7dbfff' }}>{data.aiConfidence}%</span>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 4, background: '#1a2c3d' }}>
            <div className="h-full rounded-full bar-fill" style={{ width: `${data.aiConfidence}%`, background: `linear-gradient(90deg, rgba(88,166,255,0.5), #7dbfff)` }} />
          </div>
        </div>
      )}

      {/* Recommended Action */}
      <div className="rounded-xl p-sm" style={{ background: action.bg, border: `1px solid ${action.col}30` }}>
        <p className="text-[8px] font-bold tracking-widest mb-xs" style={{ color: action.col }}>AI RECOMMENDED ACTION</p>
        <p className="text-[14px] font-bold" style={{ color: action.col }}>{action.posture}</p>
        <p className="text-[10px] text-on-surface-variant mt-xs leading-snug">{action.note}</p>
      </div>

      {/* Why it matters */}
      {data?.whyItMatters && (
        <div>
          <p className="text-[9px] font-bold tracking-widest text-outline mb-xs">WHY IT MATTERS</p>
          <div className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.5)', borderLeft: '2px solid rgba(162,201,255,0.4)' }}>
            <p className="text-[12px] text-on-surface leading-relaxed">{data.whyItMatters}</p>
          </div>
        </div>
      )}

      {/* Context */}
      {data?.context && data.context !== data?.whyItMatters && (
        <div>
          <p className="text-[9px] font-bold tracking-widest text-outline mb-xs">CONTEXT</p>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">{data.context}</p>
        </div>
      )}

      {/* Market read-through */}
      {data?.marketReadThrough && (
        <div className="rounded-xl p-sm" style={{ background: 'rgba(250,188,69,0.06)', border: '1px solid rgba(250,188,69,0.2)' }}>
          <p className="text-[8px] font-bold tracking-widest mb-xs" style={{ color: '#fac84a' }}>MARKET READ-THROUGH</p>
          <p className="text-[11px] leading-relaxed italic" style={{ color: '#e8d88a' }}>{data.marketReadThrough}</p>
        </div>
      )}

      {/* Regions */}
      {(data?.relatedRegions || []).length > 0 && (
        <div>
          <p className="text-[9px] font-bold tracking-widest text-outline mb-xs">RELATED REGIONS</p>
          <div className="flex flex-wrap gap-xs">
            {data.relatedRegions.map(r => (
              <span key={r} className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: '#fac84a', background: 'rgba(250,188,69,0.08)', borderColor: 'rgba(250,188,69,0.35)' }}>{r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Affected Sectors */}
      {(data?.relatedSectors || []).length > 0 && (
        <div>
          <p className="text-[9px] font-bold tracking-widest text-outline mb-xs">AFFECTED SECTORS</p>
          <div className="flex flex-wrap gap-xs">
            {data.relatedSectors.map(s => (
              <span key={s} className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: '#a2c9ff', background: 'rgba(162,201,255,0.08)', borderColor: 'rgba(162,201,255,0.3)' }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Source footer */}
      <div className="rounded-lg p-sm flex items-center justify-between"
        style={{ background: 'rgba(88,166,255,0.04)', border: '1px solid rgba(88,166,255,0.15)' }}>
        <div>
          <p className="text-[8px] text-outline tracking-widest">SOURCE</p>
          <p className="text-[10px] font-bold text-on-surface-variant">{(data?.source || 'Unknown').toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-outline tracking-widest">PUBLISHED</p>
          <p className="text-[10px] font-mono-data text-outline">{formatTimestamp(data?.timestamp)}</p>
        </div>
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border"
          style={{ color: '#7dbfff', background: 'rgba(88,166,255,0.1)', borderColor: 'rgba(88,166,255,0.3)' }}>
          GEI-AI-v2.4
        </span>
      </div>
    </div>
  );
}

function MarketPulseDetail({ data }) {
  return (
    <div className="space-y-md">
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">MARKET DIRECTION</p>
        <p className="text-headline-sm font-bold text-primary">{data?.marketDirection}</p>
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">GLOBAL RISK LEVEL</p>
        <p className="text-headline-sm font-bold text-tertiary">{data?.globalRiskLevel}</p>
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">MOST AFFECTED SECTOR</p>
        <p className="text-body-md font-bold text-on-surface">{data?.mostAffectedSector}</p>
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">KEY REGION</p>
        <p className="text-body-md font-bold text-on-surface">{data?.keyRegion}</p>
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant mb-xs">BIGGEST EVENT</p>
        <p className="text-body-sm text-on-surface leading-relaxed">{data?.biggestEvent}</p>
      </div>
    </div>
  );
}

export default function Drawer({ open, type, data, onClose, intelligenceFeed, sectorScores, executiveBriefing, onOpenBriefingModal }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const titles = {
    sector:      data?.sector      || 'Sector Detail',
    ticker:      data?.name        || 'Price Detail',
    georisk:     data?.countryOrArea || 'Geo Risk Detail',
    feedItem:    'Intelligence Detail',
    marketPulse: 'Market Pulse Detail',
    signal:      data?.name        || 'Signal Detail',
  };

  let content = null;
  if (open && data) {
    if (type === 'sector')      content = <SectorDetail data={data} intelligenceFeed={intelligenceFeed} onOpenModal={onOpenBriefingModal} />;
    else if (type === 'ticker') content = <TickerDetail data={data} />;
    else if (type === 'georisk') content = <GeoRiskDetail data={data} intelligenceFeed={intelligenceFeed} />;
    else if (type === 'feedItem') content = <FeedItemDetail data={data} />;
    else if (type === 'marketPulse') content = <MarketPulseDetail data={data} />;
    else if (type === 'signal') content = <SignalDetail data={data} intelligenceFeed={intelligenceFeed} />;
    else content = <div className="p-md text-body-sm text-on-surface-variant">No detail available.</div>;
  }

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer drawer-open flex flex-col">
        <div className="flex items-center justify-between p-md border-b border-outline-variant shrink-0">
          <h3 className="text-headline-sm font-bold">{titles[type] || 'Detail'}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors p-xs">
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-md">
          {content}
        </div>
      </div>
    </>
  );
}
