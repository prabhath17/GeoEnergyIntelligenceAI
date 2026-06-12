import { sortFeedByPriority } from '../../utils/helpers.js';

export default function LiveFeedBar({ liveFeedItems, onItemClick }) {
  const items = sortFeedByPriority(liveFeedItems || []).slice(0, 6);

  const Row = ({ ml = '' }) => (
    <div className={`flex items-center gap-xl px-md ${ml}`}>
      <span className="px-1.5 py-0.5 bg-error text-[10px] font-bold rounded-sm breaking-badge">LIVE FEED</span>
      {items.map((item, i) => (
        <span key={`${item.id}-${i}`} className="flex items-center gap-xl">
          <button
            className="text-[12px] text-on-surface hover:text-primary transition-colors cursor-pointer max-w-[360px] truncate"
            onClick={() => onItemClick?.(item)}
            title={`${item.source}: ${item.eventType}`}
          >
            {item.title || item.headline || item.eventType || item.summary || 'Live market intelligence update'}
          </button>
          <span className="text-outline-variant text-xs">•</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="bg-surface-container-low border-y border-outline-variant py-xs overflow-hidden whitespace-nowrap relative cursor-pointer" title="Click any item for details">
      <div className="ticker-scroll-inner">
        <Row />
        <Row ml="ml-xl" />
      </div>
    </div>
  );
}
