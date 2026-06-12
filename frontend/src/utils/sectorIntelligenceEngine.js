const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const SECTOR_CONFIG = [
  {
    id: 'crude-oil',
    sector: 'Crude Oil',
    tickers: ['WTI', 'BRENT'],
    cross: ['GOLD', 'COPPER', 'FREIGHT', 'CARBON'],
    keywords: ['crude', 'brent', 'wti', 'opec', 'hormuz', 'libya', 'tanker', 'sanctions'],
    watch: 'Hormuz tanker flow + Brent $85 confirmation',
  },
  {
    id: 'natural-gas',
    sector: 'Natural Gas',
    tickers: ['NATGAS'],
    cross: ['COAL', 'URANIUM', 'CARBON', 'FREIGHT'],
    keywords: ['gas', 'lng', 'storage', 'freeport', 'ttf', 'pipeline', 'qatar'],
    watch: 'EU storage pace + LNG outage confirmation',
  },
  {
    id: 'refined-products',
    sector: 'Refined Products',
    tickers: ['DIESEL', 'GASOLINE', 'BRENT'],
    cross: ['FREIGHT', 'WHEAT', 'GOLD'],
    keywords: ['diesel', 'gasoline', 'refinery', 'crack', 'jet fuel', 'suez', 'red sea'],
    watch: 'Diesel crack spread + Gulf Coast utilization',
  },
  {
    id: 'power',
    sector: 'Power',
    tickers: ['EU_POWER', 'NATGAS'],
    cross: ['COAL', 'CARBON', 'URANIUM', 'ALUMINUM'],
    keywords: ['power', 'grid', 'nuclear', 'coal', 'carbon', 'eua', 'electricity'],
    watch: 'French nuclear output + gas-for-power demand',
  },
  {
    id: 'renewables',
    sector: 'Renewables',
    tickers: ['EU_POWER'],
    cross: ['SILVER', 'LITHIUM', 'COPPER', 'ALUMINUM'],
    keywords: ['renewable', 'solar', 'wind', 'lithium', 'battery', 'ev', 'offshore'],
    watch: 'Lithium floor + grid curtailment reports',
  },
];

function average(values) {
  const clean = values.filter(v => Number.isFinite(v));
  return clean.length ? clean.reduce((sum, v) => sum + v, 0) / clean.length : 0;
}

function scoreImpact(item) {
  const impact = item?.impact || item?.level || '';
  if (/critical|high/i.test(impact)) return 3;
  if (/medium|moderate/i.test(impact)) return 2;
  if (/low/i.test(impact)) return 1;
  return 0.5;
}

function sentimentBias(item) {
  const raw = `${item?.sentimentEffect || ''} ${item?.direction || ''}`.toLowerCase();
  if (/bullish|risk elevated|up/.test(raw)) return 1;
  if (/bearish|down/.test(raw)) return -1;
  return 0;
}

function relatedToSector(item, sector, keywords) {
  const text = [
    item?.sector,
    item?.category,
    item?.headline,
    item?.title,
    item?.whyItMatters,
    item?.eventType,
    ...(item?.relatedSectors || []),
    ...(item?.affectedSectors || []),
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes(sector.toLowerCase()) || keywords.some(k => text.includes(k));
}

function sparklineFrom(base, momentum, confidence) {
  const start = clamp(confidence - 8 - Math.abs(momentum), 35, 96);
  return Array.from({ length: 8 }, (_, i) => {
    const wave = Math.sin(i * 0.95) * 2.5;
    const trend = (i / 7) * (confidence - start);
    return Math.round(clamp(start + trend + wave, 30, 99));
  });
}

function sentimentFrom(momentum, geoPressure, newsBias, crossPressure, volatility) {
  const pressure = momentum * 0.9 + geoPressure * 0.22 + newsBias * 2.4 + crossPressure * 0.45;
  if (volatility > 4.2 || geoPressure >= 7.5) return 'Volatile';
  if (pressure >= 3.8) return 'Bullish';
  if (pressure <= -2.6) return 'Bearish';
  if (pressure >= 1.6) return 'Expanding';
  return 'Steady';
}

function reasonFor(config, sentiment, momentum, topRegion, headline, crossSignal) {
  const move = momentum >= 0 ? 'positive' : 'negative';
  const region = topRegion?.countryOrArea || topRegion?.region || 'tracked regions';
  const cross = crossSignal?.name ? `${crossSignal.name} ${crossSignal.direction || 'signal'}` : 'cross-market pressure';
  if (sentiment === 'Bullish') return `${config.sector} is pricing ${move} momentum with ${region} risk and ${cross} reinforcing upside sensitivity.`;
  if (sentiment === 'Bearish') return `${config.sector} is weakening as price momentum and demand-sensitive signals outweigh current supply risk.`;
  if (sentiment === 'Volatile') return `${config.sector} is in a volatile regime: ${headline?.headline || headline?.title || region} is raising short-term repricing risk.`;
  if (sentiment === 'Expanding') return `${config.sector} has constructive demand support from ${cross}, with policy and infrastructure headlines adding confidence.`;
  return `${config.sector} remains steady as live price moves are offset by headline and geo-risk signals.`;
}

export function deriveSectorScores({
  tickerItems = [],
  intelligenceFeed = [],
  liveFeedItems = [],
  geoRiskItems = [],
  crossMarketSignals = [],
  previous = [],
} = {}) {
  const tickerById = new Map(tickerItems.map(t => [String(t.id || '').toUpperCase(), t]));
  const crossById = new Map(crossMarketSignals.map(s => [String(s.id || '').toUpperCase(), s]));
  const feed = [...intelligenceFeed, ...liveFeedItems];
  const prevById = new Map(previous.map(s => [s.id, s]));

  return SECTOR_CONFIG.map(config => {
    const tickerMoves = config.tickers.map(id => tickerById.get(id)?.changePercent);
    const momentum = average(tickerMoves);
    const volatility = average(tickerMoves.map(v => Math.abs(v || 0)));
    const relatedNews = feed.filter(item => relatedToSector(item, config.sector, config.keywords));
    const newsWeight = relatedNews.reduce((sum, item) => sum + scoreImpact(item), 0);
    const newsBias = average(relatedNews.map(sentimentBias));
    const relatedGeo = geoRiskItems.filter(r => relatedToSector(r, config.sector, config.keywords));
    const topRegion = relatedGeo.slice().sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0];
    const geoPressure = average(relatedGeo.map(r => r.riskScore || 0));
    const relatedCross = config.cross.map(id => crossById.get(id)).filter(Boolean);
    const crossPressure = average(relatedCross.map(s => (s.changePercent || 0) * (s.direction === 'down' ? -1 : 1)));
    const leadSignal = relatedCross.slice().sort((a, b) => (b.aiConfidence || 0) - (a.aiConfidence || 0))[0];
    const sentiment = sentimentFrom(momentum, geoPressure, newsBias, crossPressure, volatility);
    const confidence = Math.round(clamp(
      52 + Math.abs(momentum) * 5 + Math.min(18, newsWeight * 1.8) + geoPressure * 2.2 + Math.abs(crossPressure) * 3,
      42,
      96
    ));
    const prior = prevById.get(config.id);
    const delta = prior?.confidence ? confidence - prior.confidence : Math.round(momentum * 1.2 + newsBias);
    const riskLevel = geoPressure >= 7.6 ? 'High' : geoPressure >= 5.4 ? 'Moderate' : 'Low';

    return {
      id: config.id,
      sector: config.sector,
      sentiment,
      confidence,
      changeVsYesterday: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
      riskLevel,
      reason: reasonFor(config, sentiment, momentum, topRegion, relatedNews[0], leadSignal),
      watchItem: topRegion?.priceImpactHint || config.watch,
      affectedRegions: relatedGeo.map(r => r.countryOrArea || r.region).slice(0, 4),
      topRiskFactors: [
        topRegion?.countryOrArea || 'No dominant region',
        relatedNews[0]?.headline || relatedNews[0]?.title || 'Headline pressure neutral',
        leadSignal?.name ? `${leadSignal.name}: ${leadSignal.signalType}` : 'Cross-market signal neutral',
      ],
      primaryDriver: topRegion?.eventType || relatedNews[0]?.eventType || 'Price momentum',
      supportingSignal: leadSignal?.whyItMatters || relatedNews[0]?.whyItMatters || 'Current market feed',
      signalStrength: confidence,
      sparklineData: sparklineFrom(70, momentum, confidence),
    };
  });
}
