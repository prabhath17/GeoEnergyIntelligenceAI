import { getDirectionColorClass } from '../../utils/helpers.js';

function MiniSparkline({ data, direction }) {
  if (!data?.length || data.length < 2) return null;
  const w = 68, h = 30;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 5) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = direction === 'up' ? '#58a6ff' : direction === 'down' ? '#ff6b6b' : '#c0c7d4';
  const lastPt = data[data.length - 1];
  const ex = w, ey = h - ((lastPt - min) / range) * (h - 5) - 2;
  const firstPt = data[0];
  const sy = h - ((firstPt - min) / range) * (h - 5) - 2;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-fill-${direction}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${sy} ${pts} ${ex},${ey} ${w},${h} 0,${h}`} fill={`url(#spark-fill-${direction})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ex} cy={ey} r="2.5" fill={color} />
    </svg>
  );
}

function ConfBar({ value }) {
  const pct = Math.min(100, value);
  const col = pct >= 80 ? '#58a6ff' : pct >= 65 ? '#fabc45' : '#ff6b6b';
  return (
    <div className="flex items-center gap-xs">
      <div className="flex-1 h-1 bg-outline-variant rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: col, height: '100%', borderRadius: 9999 }} />
      </div>
      <span className="text-[9px] font-mono-data shrink-0" style={{ color: col }}>{pct}%</span>
    </div>
  );
}

export default function CrossMarketSignals({ signals }) {
  if (!signals?.length) {
    return (
      <section className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
        <div className="px-md py-sm border-b border-outline-variant">
          <h2 className="text-label-md font-bold tracking-widest text-on-surface-variant">CROSS-MARKET SIGNALS</h2>
        </div>
        <p className="p-md text-body-sm text-on-surface-variant">No cross-market data.</p>
      </section>
    );
  }

  const openAnalysis = (signal) => {
    sessionStorage.setItem('gei:selectedSignal', signal.name || signal.id);
    window.location.hash = 'ai-analysis';
  };

  const SignalCard = ({ s }) => {
    const col = getDirectionColorClass(s.direction);
    const prefix = s.changePercent > 0 ? '+' : '';
    const arrow = s.direction === 'up' ? '↑' : s.direction === 'down' ? '↓' : '→';
    const chipBg = s.direction === 'up'
      ? 'bg-primary-container/20 text-primary border-primary/30'
      : s.direction === 'down'
      ? 'bg-error-container/20 text-error border-error/30'
      : 'bg-surface-container-highest text-on-surface-variant border-outline-variant';

    return (
      <div
        className="p-sm cursor-pointer hover:bg-surface-container-highest transition-colors group grid grid-rows-[auto_34px_auto_auto_auto] gap-xs border-r border-b border-outline-variant min-h-[154px] focus:outline-none focus:ring-1 focus:ring-primary/50"
        onClick={() => openAnalysis(s)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openAnalysis(s);
          }
        }}
        role="button"
        tabIndex={0}
        title={s.whyItMatters}
      >
        <div className="flex items-start justify-between gap-xs">
          <span className="text-[12px] font-bold text-on-surface-variant group-hover:text-primary transition-colors leading-tight">{s.name}</span>
          <span className={`text-[9px] px-1.5 py-0.5 border rounded font-bold shrink-0 leading-tight ${chipBg}`}>
            {s.signalType?.split('/')[0]?.split(' ')[0] || 'Signal'}
          </span>
        </div>

        <MiniSparkline data={s.sparkline} direction={s.direction} />

        <div>
          <p className="font-mono-data text-body-sm font-bold text-on-surface leading-none">
            {s.currency}{typeof s.price === 'number' ? (s.price >= 1000 ? s.price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : s.price.toFixed(2)) : s.price}
          </p>
          <p className="text-[10px] text-outline leading-none mt-0.5">{s.unit}</p>
        </div>
        <div className="flex items-center justify-between gap-xs">
          <p className={`font-mono-data text-[12px] font-bold ${col}`}>{arrow} {prefix}{typeof s.changePercent === 'number' ? s.changePercent.toFixed(1) : s.changePercent}%</p>
          <span className="text-[9px] text-outline truncate">{(s.relevance || s.whyItMatters || '').slice(0, 34)}</span>
        </div>

        {s.aiConfidence && <ConfBar value={s.aiConfidence} />}

        {s.linkedSectors?.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            {s.linkedSectors.slice(0, 2).map(sec => (
              <span key={sec} className="text-[9px] px-1.5 py-0.5 bg-surface-container border border-outline-variant rounded text-outline leading-none">{sec}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant">
        <div className="flex items-center gap-sm">
          <h2 className="text-label-md font-bold tracking-widest text-on-surface-variant">CROSS-MARKET SIGNALS</h2>
          <span className="text-[10px] px-1.5 py-0.5 border border-outline-variant text-outline rounded-full font-mono-data">AI Context</span>
        </div>
        <span className="text-[10px] text-outline hidden md:block">{signals.length} signals - click for AI Analysis</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-b border-outline-variant">
        {signals.map(s => <SignalCard key={s.id} s={s} />)}
      </div>
    </section>
  );
}
