import { getDirectionColorClass } from '../../utils/helpers.js';

export default function TickerBar({ tickerItems, onTickerClick }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-md px-md py-sm border border-outline-variant bg-surface-container-lowest rounded-lg">
      {(tickerItems || []).map(item => {
        const col    = getDirectionColorClass(item.direction);
        const prefix = item.changePercent > 0 ? '+' : '';
        return (
          <div
            key={item.id}
            className="flex items-center gap-sm cursor-pointer group"
            onClick={() => onTickerClick?.(item)}
            title={`Click for ${item.name} details`}
          >
            <span className="text-label-md text-on-surface-variant group-hover:text-primary transition-colors">{item.name.toUpperCase()}</span>
            <span className="font-mono-data text-body-md text-on-surface">{item.currency}{item.price.toFixed(2)}</span>
            <span className={`font-mono-data text-body-sm ${col}`}>{prefix}{item.changePercent.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}
