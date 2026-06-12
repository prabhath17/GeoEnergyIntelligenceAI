function relTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const LEVEL_STYLE = {
  Critical: { border: 'border-error/40',    badge: 'bg-error text-on-error',              icon: '#f87171', label: 'CRITICAL' },
  High:     { border: 'border-tertiary/30', badge: 'bg-tertiary-container text-tertiary', icon: '#fabc45', label: 'HIGH' },
  Moderate: { border: 'border-primary/30',  badge: 'bg-primary-container text-primary',   icon: '#58a6ff', label: 'MOD' },
  Low:      { border: 'border-outline-variant', badge: 'bg-surface-container text-on-surface-variant', icon: '#8690a0', label: 'LOW' },
};

const CAT_COLORS = {
  'Price Movement': 'text-primary border-primary/30',
  'Geo Risk':       'text-tertiary border-tertiary/30',
  'Supply Chain':   'text-on-surface-variant border-outline-variant',
  'Refinery Outage':'text-tertiary border-tertiary/30',
  'Policy Event':   'text-on-surface-variant border-outline-variant',
  'Cross-Market':   'text-[#c79df7] border-[#c79df7]/30',
};

export default function AlertsPanel({ open, onClose, alerts, onOpenFeedItem }) {
  const items = [...(alerts || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const newCount = items.filter(a => a.isNew).length;

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="side-panel panel-open flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-md border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <h3 className="text-headline-sm font-bold">Alerts</h3>
            {newCount > 0 && <span className="w-5 h-5 rounded-full bg-error text-on-error text-[10px] flex items-center justify-center font-bold">{newCount}</span>}
          </div>
          <div className="flex items-center gap-sm">
            <span className="text-[10px] font-mono-data text-outline">{items.length} alerts</span>
            <button onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-md space-y-xs">
          {items.map(a => {
            const style = LEVEL_STYLE[a.level] || LEVEL_STYLE.Low;
            const catStyle = CAT_COLORS[a.category] || 'text-outline border-outline-variant';

            return (
              <div
                key={a.id}
                className={`p-sm bg-surface-container-high rounded border ${style.border} cursor-pointer hover:border-primary transition-colors group`}
                onClick={() => {
                  onOpenFeedItem?.({
                    id: a.id,
                    headline: a.title,
                    title: a.title,
                    sector: a.sector,
                    impact: a.level === 'Critical' ? 'High Impact' : a.level === 'High' ? 'High Impact' : a.level === 'Moderate' ? 'Medium Impact' : 'Low Impact',
                    sentimentEffect: a.sentimentEffect || 'Risk Elevated',
                    whyItMatters: a.detail,
                    marketImpact: a.marketImpact,
                    context: a.whatToWatchNext ? `Watch: ${a.whatToWatchNext}` : undefined,
                    relatedSectors: a.relatedSectors || [a.sector],
                    relatedRegions: a.relatedRegions || [],
                    aiConfidence: a.aiConfidence,
                    source: 'GEI Alert System',
                    timestamp: a.timestamp,
                    eventType: 'Alert',
                    category: a.category,
                    isBreaking: a.isNew,
                  });
                  // Do NOT call onClose() here — onOpenFeedItem already closes the panel via openDrawer
                }}
              >
                <div className="flex items-start gap-xs mb-xs">
                  {/* Alert icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={style.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">{a.title}</p>
                  </div>
                  {a.isNew && <span className="text-[9px] bg-error text-on-error px-1.5 py-0.5 rounded font-bold shrink-0">NEW</span>}
                </div>

                {/* Detail line */}
                <p className="text-[10px] text-on-surface-variant leading-snug mb-xs">{a.detail}</p>

                {/* Meta row */}
                <div className="flex items-center gap-xs flex-wrap">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${style.badge.replace('bg-','border-').split(' ')[0].replace('border-border-','border-')} ${style.badge}`}>{style.label}</span>
                  {a.category && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${catStyle}`}>{a.category}</span>
                  )}
                  <span className="text-[9px] px-1.5 py-0.5 bg-surface-container text-on-surface-variant rounded border border-outline-variant">{a.sector}</span>
                  <span className="text-[10px] font-mono-data text-outline ml-auto">{relTime(a.timestamp)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
