import MarketPulseStrip from '../components/dashboard/MarketPulseStrip.jsx';
import LiveFeedBar from '../components/dashboard/LiveFeedBar.jsx';
import TickerBar from '../components/dashboard/TickerBar.jsx';
import SectorCards from '../components/dashboard/SectorCards.jsx';
import CrossMarketSignals from '../components/dashboard/CrossMarketSignals.jsx';
import GeoRiskSection from '../components/dashboard/GeoRiskSection.jsx';
import ExecutiveBriefing from '../components/dashboard/ExecutiveBriefing.jsx';
import LiveEventStream from '../components/dashboard/LiveEventStream.jsx';
import IntelligenceFeed from '../components/dashboard/IntelligenceFeed.jsx';
import { formatTimestamp } from '../utils/helpers.js';

function deriveDashboardInsights(data) {
  const geoRiskItems = data?.geoRiskItems || [];
  const liveFeedItems = data?.liveFeedItems || [];
  const intelligenceFeed = data?.intelligenceFeed || [];
  const sectorScores = data?.sectorScores || [];
  const briefing = data?.executiveBriefing || {};

  const latestChanges = [...liveFeedItems, ...intelligenceFeed]
    .filter(item => item?.title || item?.headline)
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 3)
    .map(item => ({
      label: item.title || item.headline,
      meta: item.time || formatTimestamp(item.timestamp),
    }));

  const whyItMatters = [
    ...geoRiskItems
      .filter(item => item.riskLevel === 'Critical' || item.riskLevel === 'High')
      .slice(0, 2)
      .map(item => item.priceImpactHint || item.marketImpact),
    briefing.whyItMatters,
  ].filter(Boolean).slice(0, 3).map((label, index) => ({
    label,
    meta: ['Supply at risk', 'Price sensitivity', 'Trade flow impact'][index] || 'Market impact',
  }));

  const watchItems = (briefing.whatToWatchNext?.length ? briefing.whatToWatchNext : geoRiskItems.map(item => item.countryOrArea))
    .slice(0, 4)
    .map((label, index) => ({ label, meta: `#${index + 1}` }));

  const affected = sectorScores
    .slice()
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 4)
    .map(item => ({
      label: item.sector,
      meta: item.riskLevel === 'High' || item.riskLevel === 'Critical' ? 'High' : item.riskLevel === 'Moderate' ? 'Medium' : 'Low',
    }));

  return {
    changes: latestChanges.length ? latestChanges : [
      { label: 'Strait of Hormuz escalation', meta: '14 mins ago' },
      { label: 'Libya production disruption', meta: '2 hrs ago' },
      { label: 'US Gulf refinery maintenance', meta: '6 hrs ago' },
    ],
    matters: whyItMatters.length ? whyItMatters : [
      { label: 'Supply disruption risk elevated across crude and refined products.', meta: 'Supply at risk' },
      { label: 'Forward volatility sensitivity rising around chokepoints.', meta: 'Price sensitivity' },
      { label: 'Rerouting and insurance costs pressuring delivered fuel margins.', meta: 'Trade flow impact' },
    ],
    watch: watchItems.length ? watchItems : [
      { label: 'Strait of Hormuz', meta: '#1' },
      { label: 'Russia Transit Routes', meta: '#2' },
      { label: 'Red Sea Security', meta: '#3' },
      { label: 'Nigeria Production', meta: '#4' },
    ],
    impact: affected.length ? affected : [
      { label: 'Refiners', meta: 'High' },
      { label: 'Traders', meta: 'High' },
      { label: 'Producers', meta: 'Medium' },
      { label: 'Shippers', meta: 'Medium' },
    ],
  };
}

function InsightCard({ title, accent = 'primary', items, compact = false }) {
  const accentClass = {
    primary: 'text-primary border-primary-container/30 bg-primary-container/10',
    gold: 'text-tertiary border-tertiary/30 bg-tertiary/10',
    red: 'text-error border-error/30 bg-error/10',
  }[accent] || 'text-primary border-primary-container/30 bg-primary-container/10';

  return (
    <div className="dashboard-insight-card">
      <div className="flex items-center justify-between gap-sm mb-sm">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{title}</h3>
        <span className={`w-2 h-2 rounded-full border ${accentClass}`} />
      </div>
      <div className={compact ? 'grid grid-cols-2 gap-xs' : 'space-y-xs'}>
        {(items || []).map((item, index) => {
          const severity = /high|critical/i.test(item.meta) ? 'red' : /medium|moderate/i.test(item.meta) ? 'gold' : 'primary';
          const badgeClass = {
            primary: 'text-primary border-primary-container/30 bg-primary-container/10',
            gold: 'text-tertiary border-tertiary/30 bg-tertiary/10',
            red: 'text-error border-error/30 bg-error/10',
          }[severity];
          return (
            <div key={`${item.label}-${index}`} className="dashboard-insight-row">
              <span className="min-w-0 text-[11px] leading-snug text-on-surface-variant line-clamp-2">{item.label}</span>
              <span className={`shrink-0 text-[9px] font-bold font-mono-data px-xs py-0.5 rounded border ${badgeClass}`}>
                {item.meta}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage({
  data, feedFilter, onFeedFilterChange, intelFilter, onIntelFilterChange,
  onMarketPulseClick, onTickerClick, onSectorClick, onRiskClick, onSignalClick,
  onFeedItemClick, onViewFullAnalysis, onViewAllReports,
}) {
  const { marketPulse, tickerItems, sectorScores, geoRiskItems, intelligenceFeed, liveFeedItems, crossMarketSignals, executiveBriefing, structuredBriefing } = data || {};
  deriveDashboardInsights(data);

  return (
    <div className="page-enter">
      <main className="max-w-[1920px] mx-auto p-md space-y-md density-compact">

        {/* 1. Market Pulse */}
        <MarketPulseStrip pulse={marketPulse} onCardClick={onMarketPulseClick} />

        {/* 2. Live Feed + Ticker */}
        <LiveFeedBar liveFeedItems={liveFeedItems} onItemClick={onFeedItemClick} />
        <TickerBar tickerItems={tickerItems} onTickerClick={onTickerClick} />

        {/* 3. Sector Intelligence */}
        <section>
          <div className="flex items-center gap-sm mb-sm">
            <h2 className="text-label-md font-bold tracking-widest text-on-surface-variant">SECTOR INTELLIGENCE</h2>
            <span className="text-[10px] font-mono-data text-outline border border-outline-variant px-1.5 py-0.5 rounded">{(sectorScores || []).length} SECTORS</span>
          </div>
          <SectorCards sectorScores={sectorScores} onSectorClick={onSectorClick} />
        </section>

        {/* 4. Global Risk Map + Intelligence Cards + Executive Briefing */}
        <section className="dashboard-command-grid items-start">
          <GeoRiskSection geoRiskItems={geoRiskItems} intelligenceFeed={intelligenceFeed} onRiskClick={onRiskClick} />
          <ExecutiveBriefing briefing={executiveBriefing} onViewFullAnalysis={onViewFullAnalysis} fullData={data} structuredBriefing={structuredBriefing} compact />
        </section>

        {/* 5. Cross-Market Signals */}
        <CrossMarketSignals signals={crossMarketSignals} onSignalClick={onSignalClick} />

        {/* 6. Live Event Stream + AI Intelligence Reports */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)] gap-md">
          <LiveEventStream
            liveFeedItems={liveFeedItems}
            activeFilter={feedFilter}
            onFilterChange={onFeedFilterChange}
            onItemClick={onFeedItemClick}
          />
          <IntelligenceFeed
            intelligenceFeed={intelligenceFeed}
            activeFilter={intelFilter}
            onFilterChange={onIntelFilterChange}
            onItemClick={onFeedItemClick}
            onViewAll={onViewAllReports}
          />
        </div>

      </main>
    </div>
  );
}
