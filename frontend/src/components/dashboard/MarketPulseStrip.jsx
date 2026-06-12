export default function MarketPulseStrip({ pulse, onCardClick }) {
  const p = pulse || {};
  const cards = [
    {
      label: 'MARKET DIRECTION',
      value: p.marketDirection,
      field: 'direction',
      color: 'text-primary',
      secondary: p.directionChange || '+0.8% vs prev',
      secondaryNote: `${p.directionConfidence || 84}% confidence`,
    },
    {
      label: 'GLOBAL RISK LEVEL',
      value: p.globalRiskLevel,
      field: 'risk',
      color: 'text-tertiary',
      secondary: `${p.riskHotspots || 6} active hotspots`,
      secondaryNote: p.riskChangeNote || 'Hormuz elevated',
    },
    {
      label: 'MOST AFFECTED SECTOR',
      value: p.mostAffectedSector,
      field: 'sector',
      color: 'text-on-surface',
      secondary: 'Top driver:',
      secondaryNote: p.sectorTopDriver || 'Red Sea rerouting',
    },
    {
      label: 'KEY REGION',
      value: p.keyRegion,
      field: 'region',
      color: 'text-on-surface',
      extra: 'border-l-4 border-l-tertiary',
      secondary: `Risk score ${p.regionRiskScore || 9.2}`,
      secondaryNote: p.regionImpactNote || 'Supply chokepoint active',
    },
    {
      label: 'BIGGEST EVENT',
      value: p.biggestEvent,
      field: 'event',
      color: 'text-on-surface',
      secondary: 'Last cycle',
      secondaryNote: p.cycleId ? p.cycleId.split('-').slice(-1)[0] : '1402',
    },
  ];

  return (
    <section className="grid gap-sm" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      {cards.map(c => (
        <div
          key={c.field}
          className={`px-md py-sm bg-surface-container border border-outline-variant rounded-lg cursor-pointer hover:border-primary transition-colors ${c.extra || ''}`}
          onClick={() => onCardClick?.({ field: c.field, pulse: p })}
        >
          <p className="text-[10px] font-bold text-on-surface-variant tracking-widest mb-0.5">{c.label}</p>
          <p className={`text-body-lg font-bold ${c.color} leading-tight`}>{c.value || '—'}</p>
          <div className="flex items-center gap-xs mt-xs flex-wrap">
            <span className="text-[10px] text-outline">{c.secondary}</span>
            <span className="text-[10px] font-bold text-on-surface-variant">{c.secondaryNote}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
