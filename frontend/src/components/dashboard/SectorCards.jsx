import { getSentimentLabel, getSentimentBorderTop, getConfidenceLabel } from '../../utils/helpers.js';

function SparkBars({ data, sentiment }) {
  if (!data?.length) return null;
  const max = Math.max(...data);
  const colorMap = {
    Bullish:   ['bg-outline-variant','bg-outline-variant','bg-primary-container','bg-primary'],
    Bearish:   ['bg-error-container','bg-error-container','bg-error-container','bg-outline-variant'],
    Volatile:  ['bg-outline-variant','bg-outline-variant','bg-tertiary-container','bg-tertiary'],
    Steady:    ['bg-outline-variant','bg-on-surface-variant','bg-on-surface-variant','bg-on-surface-variant'],
    Expanding: ['bg-primary-fixed-dim/20','bg-primary-fixed-dim','bg-primary-container','bg-primary-container'],
    Neutral:   ['bg-outline-variant','bg-outline-variant','bg-on-surface-variant','bg-on-surface-variant'],
  };
  const colors = colorMap[sentiment] || colorMap.Neutral;
  const last4 = data.slice(-4);
  return (
    <div className="flex items-end gap-1 h-10 mb-xs">
      {last4.map((v, i) => {
        const px = Math.max(4, Math.round((v / max) * 48));
        return <div key={i} className={`w-full ${colors[i]}`} style={{ height: px }} />;
      })}
    </div>
  );
}

export default function SectorCards({ sectorScores, onSectorClick }) {
  return (
    <section className="grid gap-sm w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {(sectorScores || []).map(s => {
        const si   = getSentimentLabel(s.sentiment);
        const btop = getSentimentBorderTop(s.sentiment);
        return (
          <div
            key={s.id}
            className={`p-sm bg-surface-container border-t-2 ${btop} border-x border-b border-outline-variant rounded-b-lg sector-card cursor-pointer hover:shadow-lg transition-all group min-h-[168px] min-w-0`}
            onClick={() => onSectorClick?.(s)}
            title={`Click for ${s.sector} detail`}
          >
            <div className="flex justify-between items-start mb-sm">
              <div>
                <h3 className="text-label-md text-on-surface-variant group-hover:text-primary transition-colors">{s.sector.toUpperCase()}</h3>
                <p className="text-headline-sm font-bold">{s.confidence}%</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 border ${si.borderClass} ${si.colorClass} rounded-sm tracking-wider`}>{si.label}</span>
            </div>
            <p className="text-[12px] text-on-surface-variant min-h-[42px] line-clamp-2 mb-sm leading-snug">{s.reason}</p>
            <SparkBars data={s.sparklineData} sentiment={s.sentiment} />
            <div className="rounded-md px-xs py-1 mt-xs" style={{ background: 'rgba(8,18,28,0.45)', border: '1px solid rgba(45,61,78,0.55)' }}>
              <p className="text-[10px] font-mono-data text-tertiary truncate">WATCH: {s.watchItem}</p>
            </div>
            <div className="mt-xs flex items-center justify-between">
              <span className="text-[10px] text-outline">{getConfidenceLabel(s.confidence)}</span>
              <span className={`text-[10px] font-mono-data ${s.changeVsYesterday?.startsWith('+') ? 'text-primary' : 'text-error'}`}>{s.changeVsYesterday}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
