/**
 * GeoEnergy Intelligence AI — Mock Backend Data Layer
 *
 * Represents the output of the following backend services:
 *   PriceService, NewsService, GeoRiskService, DataCleaningService,
 *   ClassificationService, AIAnalysisService, DashboardAggregationService, LiveFeedService
 *
 * All objects are structured as API-ready responses matching the endpoints:
 *   GET /api/dashboard/summary
 *   GET /api/prices
 *   GET /api/sectors
 *   GET /api/georisk
 *   GET /api/headlines
 *   GET /api/live-feed
 *   GET /api/executive-briefing
 *   GET /api/history/{sector}
 *   GET /api/events/high-impact
 *
 * Backend Validation Rules (enforced server-side, represented here):
 *   - JSON format must be valid
 *   - confidence: 0–100
 *   - sentiment: one of ALLOWED_SENTIMENTS
 *   - sector: one of ALLOWED_SECTORS
 *   - riskLevel: one of ALLOWED_RISK_LEVELS
 *   - every headline must have source, title, and time
 *   - no unsupported category may appear
 *
 * Fallback (when AI analysis fails or data is weak):
 *   { sentiment: 'Neutral', confidence: 45, reason: 'Not enough reliable market-moving data available in the latest cycle.' }
 */

// ─── VALIDATION CONSTANTS ───────────────────────────────────────────────────
const ALLOWED_SENTIMENTS  = ['Bullish', 'Bearish', 'Neutral', 'Volatile', 'Steady', 'Expanding'];
const ALLOWED_SECTORS     = ['Crude Oil', 'Natural Gas', 'Refined Products', 'Power', 'Renewables', 'Policy'];
const ALLOWED_RISK_LEVELS = ['Low', 'Moderate', 'High', 'Critical'];
const ALLOWED_IMPACTS     = ['High Impact', 'Medium Impact', 'Low Impact'];
const ALLOWED_DIRECTIONS  = ['up', 'down', 'flat'];

// ─── FALLBACK ────────────────────────────────────────────────────────────────
const AI_FALLBACK = {
  sentiment: 'Neutral',
  confidence: 45,
  reason: 'Not enough reliable market-moving data available in the latest cycle.'
};

// ─── 1. MARKET PULSE  (GET /api/dashboard/summary) ──────────────────────────
/**
 * Business Logic:
 *   - marketDirection: weighted average sentiment across all sectors
 *   - globalRiskLevel: geopolitical events + high-impact headlines + chokepoints + volatility
 *   - mostAffectedSector: highest (sentimentChange + riskLevel + headlineImpact) combined score
 *   - keyRegion: region most frequently appearing in high-impact events
 *   - biggestEvent: highest-impact event from the latest analysis cycle
 */
const marketPulse = {
  marketDirection: 'Stable-Bullish',    // derived from weighted sector sentiment avg
  globalRiskLevel: 'Elevated',          // derived from geoRisk scores + headline impact
  mostAffectedSector: 'Refined Products', // highest combined: sentiment delta + risk + impact
  keyRegion: 'Strait of Hormuz',        // most frequent high-impact region
  biggestEvent: 'OPEC+ Meeting',        // top-priority event this analysis cycle
  lastUpdated: new Date().toISOString(),
  systemStatus: 'Nominal',             // pipeline health: Nominal | Degraded | Alert
  analysisConfidence: 82,              // overall confidence across all sectors (0–100)
  cycleId: 'CYCLE-20260528-1402'       // unique ID for this analysis run
};

// ─── 2. TICKER ITEMS  (GET /api/prices) ─────────────────────────────────────
/**
 * PriceService output — cleaned and formatted by DataCleaningService
 * direction: derived from changePercent (up | down | flat)
 */
const tickerItems = [
  {
    id: 'WTI',
    name: 'WTI Crude',
    symbol: 'WTI',
    price: 78.42,
    unit: 'USD/bbl',
    currency: '$',
    change: +0.93,
    changePercent: +1.2,
    direction: 'up',       // getDirectionFromChange(+1.2)
    source: 'CME Group',
    timestamp: new Date().toISOString()
  },
  {
    id: 'BRENT',
    name: 'Brent Crude',
    symbol: 'BRENT',
    price: 82.15,
    unit: 'USD/bbl',
    currency: '$',
    change: +0.65,
    changePercent: +0.8,
    direction: 'up',
    source: 'ICE',
    timestamp: new Date().toISOString()
  },
  {
    id: 'NATGAS',
    name: 'Natural Gas',
    symbol: 'NG',
    price: 2.34,
    unit: 'USD/MMBtu',
    currency: '$',
    change: -0.06,
    changePercent: -2.4,
    direction: 'down',
    source: 'NYMEX',
    timestamp: new Date().toISOString()
  },
  {
    id: 'DIESEL',
    name: 'Diesel',
    symbol: 'HO',
    price: 124.50,
    unit: 'USc/gal',
    currency: '$',
    change: 0,
    changePercent: 0.0,
    direction: 'flat',
    source: 'NYMEX',
    timestamp: new Date().toISOString()
  },
  {
    id: 'GASOLINE',
    name: 'Gasoline',
    symbol: 'RB',
    price: 2.58,
    unit: 'USD/gal',
    currency: '$',
    change: +0.01,
    changePercent: +0.5,
    direction: 'up',
    source: 'NYMEX',
    timestamp: new Date().toISOString()
  },
  {
    id: 'EU_POWER',
    name: 'Power Index (EU)',
    symbol: 'EU-PWR',
    price: 94.20,
    unit: 'EUR/MWh',
    currency: '€',
    change: +2.82,
    changePercent: +3.1,
    direction: 'up',
    source: 'EEX',
    timestamp: new Date().toISOString()
  }
];

// ─── 3. SECTOR SCORES  (GET /api/sectors) ────────────────────────────────────
/**
 * AIAnalysisService output — one score object per sector
 *
 * Sentiment Logic:
 *   Bullish   = supply disruption + strong demand
 *   Bearish   = high inventories + weak demand
 *   Neutral   = mixed signals
 *   Volatile  = conflicting headlines + high geo activity
 *   Steady    = limited movement + balanced risk
 *   Expanding = growth in renewable capacity or adoption
 *
 * Confidence Ranges:
 *   80–100 = strong signal | 60–79 = moderate | 40–59 = weak | <40 = low
 *
 * sparklineData: last 8 daily confidence readings for mini-chart
 */
const sectorScores = [
  {
    id: 'crude-oil',
    sector: 'Crude Oil',
    sentiment: 'Bullish',
    confidence: 84,                      // strong signal
    changeVsYesterday: '+1.4%',
    riskLevel: 'High',
    reason: 'Supply constraints in Libya are offsetting weaker Asian demand data.',
    watchItem: 'North Sea Maintenance',
    affectedRegions: ['Libya', 'North Sea', 'Middle East', 'Asia Pacific'],
    topRiskFactors: [
      'Libyan field shutdowns reducing export capacity',
      'OPEC+ meeting signaling production posture change',
      'Strait of Hormuz tanker activity drop'
    ],
    sparklineData: [72, 68, 74, 79, 81, 80, 83, 84],  // last 8 days
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'natural-gas',
    sector: 'Natural Gas',
    sentiment: 'Bearish',
    confidence: 62,                      // moderate signal
    changeVsYesterday: '-3.1%',
    riskLevel: 'Moderate',
    reason: 'High storage levels in Europe are keeping immediate price pressure muted.',
    watchItem: 'Freeport LNG Status',
    affectedRegions: ['Europe', 'North America', 'Russia', 'Central Asia'],
    topRiskFactors: [
      'EU storage above 5-year seasonal average',
      'Freeport LNG terminal restart uncertainty',
      'Russian transit disruption risk (Eastern Europe)'
    ],
    sparklineData: [70, 66, 64, 61, 63, 60, 62, 62],
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'refined-products',
    sector: 'Refined Products',
    sentiment: 'Volatile',
    confidence: 78,                      // moderate-strong signal
    changeVsYesterday: '+0.2%',
    riskLevel: 'High',
    reason: 'Diesel/Gasoline/Jet Fuel margins tightening as maintenance cycles begin.',
    watchItem: 'Gulf Coast Yields',
    affectedRegions: ['North America', 'Europe', 'Middle East', 'Red Sea'],
    topRiskFactors: [
      'Gulf Coast refinery seasonal maintenance reducing output',
      'Red Sea insurance premiums rising for refined product carriers',
      'Crack spreads widening across diesel and jet fuel'
    ],
    sparklineData: [60, 65, 70, 74, 72, 76, 77, 78],
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'power',
    sector: 'Power',
    sentiment: 'Steady',
    confidence: 91,                      // strong signal
    changeVsYesterday: '+0.8%',
    riskLevel: 'Low',
    reason: 'Interconnector capacity between France and the UK remains near normal limits.',
    watchItem: 'French Nuclear Outage',
    affectedRegions: ['France', 'UK', 'Germany', 'Nordic'],
    topRiskFactors: [
      'French nuclear fleet partial outage risk',
      'German lignite phase-out accelerating gas demand for power',
      'Nordic hydrology below seasonal average'
    ],
    sparklineData: [88, 89, 90, 91, 90, 91, 91, 91],
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'renewables',
    sector: 'Renewables',
    sentiment: 'Expanding',
    confidence: 95,                      // strong signal
    changeVsYesterday: '+2.4%',
    riskLevel: 'Low',
    reason: 'Record solar output in Southern Europe is reducing coal dependence.',
    watchItem: 'Grid Congestion Nodes',
    affectedRegions: ['Spain', 'Italy', 'Southern Europe', 'Germany'],
    topRiskFactors: [
      'Grid congestion nodes limiting renewable dispatch in Germany',
      'Battery storage project delays pushing integration timelines',
      'Policy uncertainty in key EU offshore wind auctions'
    ],
    sparklineData: [88, 90, 91, 92, 93, 94, 95, 95],
    lastUpdated: new Date().toISOString()
  }
];

// ─── 4. GEO-RISK ITEMS  (GET /api/georisk) ──────────────────────────────────
/**
 * GeoRiskService output — classified by region, scored by AIAnalysisService
 * coordinates: [lat, lng] for map overlay positioning
 */
const geoRiskItems = [
  {
    id: 'geo-001',
    region: 'Middle East',
    countryOrArea: 'Strait of Hormuz',
    coordinates: [26.5, 56.5],
    riskScore: 9.2,
    riskLevel: 'Critical',
    affectedSectors: ['Crude Oil', 'Refined Products', 'Natural Gas'],
    eventType: 'Shipping Chokepoint',
    marketImpact: 'Supply constraints could support Brent, diesel, and LNG-linked prices. +$5-8 volatility projected.',
    source: 'GEI Signal / Satellite Telemetry',
    isActive: true,
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString()  // 14 mins ago
  },
  {
    id: 'geo-002',
    region: 'Eastern Europe',
    countryOrArea: 'Ukraine / Russia Transit Corridor',
    coordinates: [50.0, 30.5],
    riskScore: 8.5,
    riskLevel: 'High',
    affectedSectors: ['Natural Gas', 'Power'],
    eventType: 'Transit Risk',
    marketImpact: 'Gas transit uncertainty may increase European power price volatility. EU storage withdrawals accelerating.',
    source: 'Reuters Global / GeoRisk Monitor',
    isActive: true,
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()  // 1 hour ago
  },
  {
    id: 'geo-003',
    region: 'Middle East / Africa',
    countryOrArea: 'Red Sea Transit',
    coordinates: [20.0, 38.5],
    riskScore: 7.9,
    riskLevel: 'Moderate',
    affectedSectors: ['Refined Products', 'Crude Oil'],
    eventType: 'Maritime Insurance Risk',
    marketImpact: 'Insurance premiums may raise shipping costs for refined product carriers.',
    source: 'Lloyd\'s Intelligence / GeoRisk Monitor',
    isActive: true,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()  // 4 hours ago
  },
  {
    id: 'geo-004',
    region: 'North Africa',
    countryOrArea: 'Libya',
    coordinates: [27.0, 17.0],
    riskScore: 7.4,
    riskLevel: 'High',
    affectedSectors: ['Crude Oil'],
    eventType: 'Production Disruption',
    marketImpact: 'Libyan field shutdowns reducing OPEC+ effective output and supporting Brent premium.',
    source: 'GEI Signal-4',
    isActive: true,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'geo-005',
    region: 'North America',
    countryOrArea: 'Gulf of Mexico / Gulf Coast',
    coordinates: [26.0, -91.0],
    riskScore: 6.1,
    riskLevel: 'Moderate',
    affectedSectors: ['Refined Products', 'Crude Oil'],
    eventType: 'Refinery Outage',
    marketImpact: 'Seasonal refinery maintenance reducing diesel and gasoline output. Crack spreads widening.',
    source: 'Refinery Monitor',
    isActive: true,
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'geo-006',
    region: 'West Africa',
    countryOrArea: 'West Africa Offshore',
    coordinates: [6.5, 3.4],
    riskScore: 6.9,
    riskLevel: 'Moderate',
    affectedSectors: ['Crude Oil', 'Natural Gas'],
    eventType: 'Export Reliability',
    marketImpact: 'Port congestion and offshore loading risk can delay crude and LNG cargoes.',
    source: 'GeoRisk Monitor',
    isActive: true,
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'geo-007',
    region: 'Asia Pacific',
    countryOrArea: 'South China Sea',
    coordinates: [15.0, 115.0],
    riskScore: 7.1,
    riskLevel: 'High',
    affectedSectors: ['Crude Oil', 'Natural Gas', 'Refined Products'],
    eventType: 'Maritime Dispute',
    marketImpact: 'Territorial disputes raise insurance premiums and could disrupt LNG and crude tanker routes from Middle East to Asia.',
    source: 'GeoRisk Monitor / Lloyd\'s Intelligence',
    isActive: true,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'geo-008',
    region: 'Central America',
    countryOrArea: 'Panama Canal',
    coordinates: [9.0, -79.5],
    riskScore: 6.4,
    riskLevel: 'Moderate',
    affectedSectors: ['Crude Oil', 'Refined Products', 'Natural Gas'],
    eventType: 'Shipping Chokepoint',
    marketImpact: 'Drought-related draft restrictions have reduced vessel capacity. LNG and refined products rerouting to Cape Horn adds 2+ weeks transit.',
    source: 'Panama Canal Authority / Platts',
    isActive: true,
    timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'geo-009',
    region: 'Middle East / Africa',
    countryOrArea: 'Suez Canal',
    coordinates: [30.5, 32.3],
    riskScore: 7.6,
    riskLevel: 'High',
    affectedSectors: ['Crude Oil', 'Refined Products'],
    eventType: 'Shipping Chokepoint',
    marketImpact: 'Combined Suez/Red Sea disruption forcing rerouting around Cape of Good Hope. Adds 10–14 days and $0.8–1.2M per voyage.',
    source: 'Suez Canal Authority / GeoRisk Monitor',
    isActive: true,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'geo-010',
    region: 'North Sea / Europe',
    countryOrArea: 'North Sea Maintenance Zone',
    coordinates: [57.0, 2.5],
    riskScore: 5.8,
    riskLevel: 'Moderate',
    affectedSectors: ['Crude Oil', 'Natural Gas'],
    eventType: 'Production Disruption',
    marketImpact: 'Seasonal maintenance at Forties, Ekofisk, and Oseberg fields reducing North Sea output. Brent premium supported near-term.',
    source: 'Platts / Argus Media',
    isActive: true,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'geo-011',
    region: 'South America',
    countryOrArea: 'Venezuela Export Corridor',
    coordinates: [10.5, -66.9],
    riskScore: 7.8,
    riskLevel: 'High',
    affectedSectors: ['Crude Oil'],
    eventType: 'Sanctions / Export Risk',
    marketImpact: 'Renewed US sanctions risk on Venezuelan crude exports could remove up to 800,000 bpd from global supply.',
    source: 'GeoRisk Monitor / Reuters',
    isActive: true,
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString()
  },
  {
    id: 'geo-012',
    region: 'West Africa',
    countryOrArea: 'Nigeria Pipeline Network',
    coordinates: [5.8, 6.4],
    riskScore: 6.6,
    riskLevel: 'Moderate',
    affectedSectors: ['Crude Oil', 'Natural Gas'],
    eventType: 'Production Disruption',
    marketImpact: 'Pipeline vandalism and bunkering activity disrupting Nigerian crude output. Bonny Light and Forcados loading schedules affected.',
    source: 'Nigerian Petroleum / GeoRisk Monitor',
    isActive: true,
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'geo-013',
    region: 'Middle East',
    countryOrArea: 'Middle East Sanctions Corridor',
    coordinates: [26.0, 50.0],
    riskScore: 8.1,
    riskLevel: 'High',
    affectedSectors: ['Crude Oil', 'Natural Gas', 'Refined Products'],
    eventType: 'Sanctions Risk',
    marketImpact: 'Iran and Russia sanctions enforcement affecting shadow fleet activity. Dark cargo volumes create supply uncertainty across Gulf producers.',
    source: 'OFAC Monitor / GEI Signal',
    isActive: true,
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'geo-014',
    region: 'Europe',
    countryOrArea: 'European Gas Storage Network',
    coordinates: [50.0, 10.0],
    riskScore: 5.2,
    riskLevel: 'Moderate',
    affectedSectors: ['Natural Gas', 'Power'],
    eventType: 'Storage Risk',
    marketImpact: 'EU storage at 68% — above seasonal average but injection pace slowing. Winter 2026/27 buffer may be tighter if summer demand remains elevated.',
    source: 'GIE / AGSI Storage Monitor',
    isActive: true,
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'geo-015',
    region: 'North America',
    countryOrArea: 'US Gulf Coast Refinery Cluster',
    coordinates: [29.5, -95.0],
    riskScore: 6.1,
    riskLevel: 'Moderate',
    affectedSectors: ['Refined Products', 'Crude Oil'],
    eventType: 'Refinery Outage',
    marketImpact: 'Seasonal maintenance at 6 major Gulf Coast refineries reducing combined capacity by ~400,000 bpd. Diesel and jet fuel crack spreads widening.',
    source: 'Refinery Monitor / IIR Energy',
    isActive: true,
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  }
];

// ─── PRICE COMPARISON  (GET /api/price-comparison/{id}) ──────────────────────
/**
 * Period-over-period price change data for each instrument.
 * Changes are in percentage points.
 */
const priceComparison = {
  WTI:     { dailyChange: +1.2,  monthChange: +3.4,  threeMonthChange: -2.1,  ytdChange: +5.8,  oneYearChange: +8.3  },
  BRENT:   { dailyChange: +0.8,  monthChange: +2.9,  threeMonthChange: -1.8,  ytdChange: +5.1,  oneYearChange: +7.6  },
  NATGAS:  { dailyChange: -2.4,  monthChange: -8.1,  threeMonthChange: -12.3, ytdChange: -15.2, oneYearChange: -22.4 },
  DIESEL:  { dailyChange:  0.0,  monthChange: +1.2,  threeMonthChange: +2.8,  ytdChange: +4.1,  oneYearChange: +6.2  },
  GASOLINE:{ dailyChange: +0.5,  monthChange: +2.1,  threeMonthChange: +1.8,  ytdChange: +3.9,  oneYearChange: +5.7  },
  EU_POWER:{ dailyChange: +3.1,  monthChange: +5.8,  threeMonthChange: +8.2,  ytdChange: +12.1, oneYearChange: +18.4 },
  GOLD:    { dailyChange: +0.8,  monthChange: +4.2,  threeMonthChange: +6.8,  ytdChange: +9.3,  oneYearChange: +14.7 },
  COPPER:  { dailyChange: -0.4,  monthChange: -2.8,  threeMonthChange: -5.1,  ytdChange: -3.2,  oneYearChange: +2.1  },
  WHEAT:   { dailyChange: +1.2,  monthChange: +3.8,  threeMonthChange: +2.1,  ytdChange: +5.4,  oneYearChange: -8.3  },
  URANIUM: { dailyChange: +2.1,  monthChange: +6.4,  threeMonthChange: +12.8, ytdChange: +18.3, oneYearChange: +32.5 },
  LITHIUM: { dailyChange: -1.8,  monthChange: -8.2,  threeMonthChange: -15.4, ytdChange: -18.9, oneYearChange: -35.2 }
};

// ─── 5. EXECUTIVE BRIEFING  (GET /api/executive-briefing) ───────────────────
/**
 * AIAnalysisService synthesis — final executive-grade market summary
 * Generated once per analysis cycle
 */
const executiveBriefing = {
  id: 'brief-20260528-1402',
  whatChanged: 'The overnight shift in OPEC+ production rhetoric signals a pivot toward defending market share over price floors. This is a structural departure from the Q1 stance.',
  whyItMatters: 'Short-term liquidity in Brent futures is increasing. Expect a breakdown in the $80–82 range. Downside protection is now more expensive as hedging activity spikes in the refined products sector.',
  whatToWatchNext: [
    'Strait of Hormuz tanker activity',
    'European gas storage levels',
    'Gulf Coast refinery yields',
    'EU power market volatility',
    'Renewable grid congestion nodes'
  ],
  strategyBrief: [
    'Increase exposure monitoring for North American pipeline operators.',
    'Maintain neutral stance on EU Power spot markets.',
    'Track long-dated calls on uranium miners.'
  ],
  riskSummary: {
    topRisk: 'Strait of Hormuz chokepoint — Critical (9.2)',
    secondaryRisk: 'Eastern Europe gas transit — High (8.5)',
    watchFlag: 'OPEC+ production guidance shift — structural change detected'
  },
  analysisConfidence: 82,
  generatedAt: new Date().toISOString(),
  cycleId: 'CYCLE-20260528-1402',
  modelVersion: 'GEI-AI-v2.4'
};

// ─── 6. LIVE FEED ITEMS  (GET /api/live-feed) ────────────────────────────────
/**
 * LiveFeedService output — sorted by priority (breaking first), then timestamp desc
 * Simulates real-time energy intelligence updates
 *
 * priority: 1 = highest (breaking), 5 = lowest (background)
 * isBreaking: true = appears at top of feed regardless of time
 * confidence: AI classification confidence (0–100)
 * sourceStatus: 'Live' | 'Mock' | 'Derived'
 */
const liveFeedItems = [
  {
    id: 'lf-001',
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    title: 'WTI Crude jumps +1.2% on supply concerns — benchmarks under upside pressure',
    source: 'Market Signal',
    sector: 'Crude Oil',
    category: 'Market Move',
    impact: 'High Impact',
    sentimentEffect: 'Bullish',
    whyItMatters: 'Near-term supply concerns are increasing upside pressure on crude benchmarks.',
    region: 'Global',
    eventType: 'Price Movement',
    isBreaking: true,
    priority: 1,
    confidence: 89,
    relatedCommodities: ['WTI Crude', 'Brent', 'Gasoline'],
    affectedSectors: ['Crude Oil', 'Refined Products'],
    marketImpact: 'WTI upside driving short-covering in Brent futures. Refined products following higher.',
    whatToWatch: ['$80/bbl WTI resistance', 'Brent/WTI spread', 'API inventory report'],
    geoRiskRegion: 'Global',
    sourceStatus: 'Mock'
  },
  {
    id: 'lf-002',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    title: 'OPEC+ production meeting confirmed for July — agenda includes market share strategy',
    source: 'Policy Monitor',
    sector: 'Crude Oil',
    category: 'Policy',
    impact: 'High Impact',
    sentimentEffect: 'Volatile',
    whyItMatters: 'Production guidance could shift market expectations for Q3 supply balance materially.',
    region: 'Middle East',
    eventType: 'Policy Event',
    isBreaking: true,
    priority: 1,
    confidence: 87,
    relatedCommodities: ['WTI Crude', 'Brent', 'Natural Gas'],
    affectedSectors: ['Crude Oil', 'Natural Gas', 'Refined Products'],
    marketImpact: 'Market pricing increased production uncertainty. Q3 supply guidance may shift.',
    whatToWatch: ['OPEC+ July meeting outcome', 'Saudi production signals', 'Russia compliance'],
    geoRiskRegion: 'Middle East',
    sourceStatus: 'Mock'
  },
  {
    id: 'lf-003',
    timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    title: 'Gulf Coast refinery maintenance season begins — diesel output projected down 4%',
    source: 'Refinery Monitor',
    sector: 'Refined Products',
    category: 'Supply Chain',
    impact: 'High Impact',
    sentimentEffect: 'Bullish',
    whyItMatters: 'Lower refinery output can tighten diesel availability heading into peak summer demand.',
    region: 'North America',
    eventType: 'Refinery Outage',
    isBreaking: true,
    priority: 1,
    confidence: 84,
    relatedCommodities: ['Diesel', 'Gasoline', 'Jet Fuel'],
    affectedSectors: ['Refined Products', 'Crude Oil'],
    marketImpact: 'Diesel crack spreads widening. Jet fuel forward curve moving higher.',
    whatToWatch: ['Gulf Coast run rates', 'Diesel crack spread', 'Jet fuel forward'],
    geoRiskRegion: 'North America',
    sourceStatus: 'Mock'
  },
  {
    id: 'lf-004',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    title: 'New sanctions on Russian energy exports proposed by EU foreign ministers',
    source: 'GeoRisk Monitor',
    sector: 'Natural Gas',
    category: 'Geo Risk',
    impact: 'Medium Impact',
    sentimentEffect: 'Risk Elevated',
    whyItMatters: 'Additional sanctions could tighten regional supply routes and increase European price volatility.',
    region: 'Eastern Europe',
    eventType: 'Sanctions',
    isBreaking: false,
    priority: 2,
    confidence: 76,
    relatedCommodities: ['Natural Gas', 'LNG', 'Power (EU)'],
    affectedSectors: ['Natural Gas', 'Power'],
    marketImpact: 'European TTF gas may react on sanction confirmation. Power prices correlated.',
    whatToWatch: ['EU foreign minister vote', 'TTF gas forward curve', 'Russian export volumes'],
    geoRiskRegion: 'Eastern Europe',
    sourceStatus: 'Mock'
  },
  {
    id: 'lf-005',
    timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    title: 'EU natural gas storage at 68% — above 5-year seasonal average, bearish near-term',
    source: 'Storage Monitor',
    sector: 'Natural Gas',
    category: 'Supply Chain',
    impact: 'Medium Impact',
    sentimentEffect: 'Bearish',
    whyItMatters: 'Strong storage buffers reduce immediate upside risk for European gas prices through summer.',
    region: 'Europe',
    eventType: 'Storage Report',
    isBreaking: false,
    priority: 2,
    confidence: 81,
    relatedCommodities: ['Natural Gas', 'LNG', 'Power (EU)'],
    affectedSectors: ['Natural Gas', 'Power'],
    marketImpact: 'Bearish for TTF prompt. Market may refocus on winter 26/27 forward strips.',
    whatToWatch: ['Weekly injection rate', 'EU winter demand forecast', 'LNG import volumes'],
    geoRiskRegion: 'Europe',
    sourceStatus: 'Mock'
  },
  {
    id: 'lf-006',
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    title: 'EU Energy Council concludes with no consensus on additional Russia sanctions',
    source: 'Reuters Global',
    sector: 'Policy',
    category: 'Policy',
    impact: 'Medium Impact',
    sentimentEffect: 'Neutral',
    whyItMatters: 'Stabilizes near-term Natural Gas supply outlook for Central Europe. No immediate policy shock.',
    region: 'Europe',
    eventType: 'Policy Event',
    isBreaking: false,
    priority: 2,
    confidence: 72,
    relatedCommodities: ['Natural Gas', 'Power (EU)'],
    affectedSectors: ['Natural Gas', 'Power'],
    marketImpact: 'Near-term gas supply risk deferred. Next council meeting in 6 weeks.',
    whatToWatch: ['Next EU council meeting', 'Russian transit volumes', 'Member state positions'],
    geoRiskRegion: 'Eastern Europe',
    sourceStatus: 'Mock'
  },
  {
    id: 'lf-007',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    title: 'Port of Rotterdam logs 2% rise in renewable feedstock arrivals — bio-diesel integration on track',
    source: 'Logistics News',
    sector: 'Renewables',
    category: 'Supply Chain',
    impact: 'Low Impact',
    sentimentEffect: 'Neutral',
    whyItMatters: 'Long-term trend toward bio-diesel integration in European refinery programs remains on track.',
    region: 'Europe',
    eventType: 'Supply Chain',
    isBreaking: false,
    priority: 4,
    confidence: 61,
    relatedCommodities: ['Renewable Feedstocks', 'Bio-diesel'],
    affectedSectors: ['Renewables', 'Refined Products'],
    marketImpact: 'Structural positive for bio-diesel. No near-term price impact expected.',
    whatToWatch: ['Rotterdam throughput trend', 'EU bio-diesel mandates', 'Feedstock price spread'],
    geoRiskRegion: 'Europe',
    sourceStatus: 'Mock'
  },
  {
    id: 'lf-008',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    title: 'Record solar output in Southern Europe — grid operators report 52% renewable share',
    source: 'Grid Monitor',
    sector: 'Renewables',
    category: 'Market Move',
    impact: 'Medium Impact',
    sentimentEffect: 'Bullish',
    whyItMatters: 'Record solar generation reduces thermal plant dispatch and coal imports across Spain and Italy.',
    region: 'Southern Europe',
    eventType: 'Market Move',
    isBreaking: false,
    priority: 3,
    confidence: 79,
    relatedCommodities: ['Power (EU)', 'Coal', 'Carbon Credits (EUA)'],
    affectedSectors: ['Renewables', 'Power'],
    marketImpact: 'Day-ahead power prices softening in Iberia. Negative for thermal generators.',
    whatToWatch: ['Spanish wind/solar mix', 'Iberian power price', 'Coal import volumes'],
    geoRiskRegion: 'Southern Europe',
    sourceStatus: 'Mock'
  },
  {
    id: 'lf-009',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    title: 'French nuclear fleet at 78% capacity — partial outage risk flagged by RTE',
    source: 'GEI Signal',
    sector: 'Power',
    category: 'Geo Risk',
    impact: 'Medium Impact',
    sentimentEffect: 'Risk Elevated',
    whyItMatters: 'Partial nuclear outage risk in France could increase gas-for-power demand and EU power prices.',
    region: 'France',
    eventType: 'Geo Risk',
    isBreaking: false,
    priority: 2,
    confidence: 77,
    relatedCommodities: ['Power (EU)', 'Natural Gas', 'Carbon Credits (EUA)'],
    affectedSectors: ['Power', 'Natural Gas'],
    marketImpact: 'Gas-for-power demand uplift if nuclear output drops further. EU power prices reactive.',
    whatToWatch: ['French nuclear availability factor', 'UK-France interconnector flow', 'TTF gas price'],
    geoRiskRegion: 'France / Europe',
    sourceStatus: 'Mock'
  },
  {
    id: 'lf-010',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    title: 'Satellite imagery confirms tanker throughput drop in Persian Gulf — GEI Signal-4',
    source: 'GEI Signal-4',
    sector: 'Crude Oil',
    category: 'Geo Risk',
    impact: 'High Impact',
    sentimentEffect: 'Risk Elevated',
    whyItMatters: 'May indicate undeclared maintenance or tactical holding by regional producers.',
    region: 'Middle East',
    eventType: 'Geo Risk',
    isBreaking: false,
    priority: 2,
    confidence: 91,
    relatedCommodities: ['WTI Crude', 'Brent', 'LNG'],
    affectedSectors: ['Crude Oil', 'Refined Products'],
    marketImpact: 'Could tighten near-term supply. +$3-5 Brent volatility projected if sustained.',
    whatToWatch: ['Hormuz tanker count', 'VLCC spot rates', 'Brent premium'],
    geoRiskRegion: 'Strait of Hormuz',
    sourceStatus: 'Mock'
  },
  {
    id: 'lf-011',
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    title: 'Gold breaks $2,380/oz on safe-haven demand — energy risk premium widening',
    source: 'COMEX Signal',
    sector: 'Gold',
    category: 'Market Move',
    impact: 'High Impact',
    sentimentEffect: 'Risk Elevated',
    whyItMatters: 'Gold strength signals broad geopolitical fear, historically precedes crude oil volatility spikes within 48–72 hours.',
    region: 'Global',
    eventType: 'Market Move',
    isBreaking: false,
    priority: 2,
    confidence: 88,
    relatedCommodities: ['Gold', 'WTI Crude', 'Brent'],
    affectedSectors: ['Crude Oil', 'Natural Gas'],
    marketImpact: 'Risk premium building across energy complex. Watch crude correlation for follow-through.',
    whatToWatch: ['$2,400 gold resistance level', 'Crude/gold spread', 'USD DXY index'],
    geoRiskRegion: 'Global',
    sourceStatus: 'Derived'
  },
  {
    id: 'lf-012',
    timestamp: new Date(Date.now() - 135 * 60 * 1000).toISOString(),
    title: 'Copper slides below $4.50/lb on China PMI contraction — industrial demand signal bearish',
    source: 'LME / COMEX Monitor',
    sector: 'Copper',
    category: 'Market Move',
    impact: 'Medium Impact',
    sentimentEffect: 'Bearish',
    whyItMatters: 'Copper contraction signals weakening global industrial demand — leads energy demand slowdowns by 4–6 weeks.',
    region: 'Asia Pacific',
    eventType: 'Market Move',
    isBreaking: false,
    priority: 3,
    confidence: 74,
    relatedCommodities: ['Copper', 'Lithium', 'Aluminum'],
    affectedSectors: ['Power', 'Renewables'],
    marketImpact: 'Potential reduction in Chinese LNG and coal demand growth in coming weeks.',
    whatToWatch: ['China PMI next print', 'LME copper inventory', 'Chinese grid capex data'],
    geoRiskRegion: 'Asia Pacific',
    sourceStatus: 'Derived'
  },
  {
    id: 'lf-013',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    title: 'Wheat futures surge 3.2% on Black Sea corridor escalation — MENA food risk elevated',
    source: 'CBOT / Reuters',
    sector: 'Wheat',
    category: 'Geo Risk',
    impact: 'Medium Impact',
    sentimentEffect: 'Risk Elevated',
    whyItMatters: 'Black Sea grain disruptions widen global risk premium and increase food-energy inflation linkage in MENA markets.',
    region: 'Black Sea / Eastern Europe',
    eventType: 'Geo Risk',
    isBreaking: false,
    priority: 2,
    confidence: 79,
    relatedCommodities: ['Wheat', 'Crude Oil', 'Fertilizers'],
    affectedSectors: ['Policy', 'Refined Products'],
    marketImpact: 'Food inflation pressure on MENA sovereigns may affect energy subsidy sustainability.',
    whatToWatch: ['Black Sea shipping corridor', 'MENA food subsidy budgets', 'Ceasefire talks'],
    geoRiskRegion: 'Black Sea',
    sourceStatus: 'Mock'
  },
  {
    id: 'lf-014',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    title: 'Uranium spot price breaks $90/lb as US utilities accelerate long-term contracting',
    source: 'Sprott Monitor',
    sector: 'Uranium',
    category: 'Market Move',
    impact: 'Medium Impact',
    sentimentEffect: 'Bullish',
    whyItMatters: 'Nuclear demand renaissance is structural — energy security policy driving utilities to lock in uranium supply 5–10 years out.',
    region: 'Global',
    eventType: 'Market Move',
    isBreaking: false,
    priority: 3,
    confidence: 82,
    relatedCommodities: ['Uranium', 'Natural Gas', 'Coal'],
    affectedSectors: ['Power', 'Renewables'],
    marketImpact: 'Bullish for uranium miners. Long-term bearish for gas-for-power demand as nuclear displaces thermal.',
    whatToWatch: ['Utility contracting volumes', 'Kazakh supply pipeline', '$100/lb spot resistance'],
    geoRiskRegion: 'Kazakhstan / Global',
    sourceStatus: 'Mock'
  },
  {
    id: 'lf-015',
    timestamp: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    title: 'German power spot spikes €18/MWh on ENTSO-E transmission bottleneck warning',
    source: 'ENTSO-E / EEX',
    sector: 'Power',
    category: 'Market Move',
    impact: 'Medium Impact',
    sentimentEffect: 'Risk Elevated',
    whyItMatters: 'Grid congestion forces renewable curtailment and increases gas-for-power demand, widening EU power prices.',
    region: 'Germany / Europe',
    eventType: 'Market Move',
    isBreaking: false,
    priority: 2,
    confidence: 75,
    relatedCommodities: ['Power (EU)', 'Natural Gas', 'Carbon Credits (EUA)'],
    affectedSectors: ['Power', 'Renewables', 'Natural Gas'],
    marketImpact: 'EU spot power spiking. Gas-for-power demand uptick expected through weekend balancing window.',
    whatToWatch: ['German day-ahead power price', 'Cross-border flows', 'Gas balancing market'],
    geoRiskRegion: 'Germany / Europe',
    sourceStatus: 'Mock'
  }
];

// ─── 7. INTELLIGENCE FEED  (GET /api/headlines) ──────────────────────────────
/**
 * NewsService + ClassificationService output
 * Deduplicated, classified, and enriched with AI sentiment + context
 * Every item validated: must have source, title (headline), and time
 * confidence: AI classification confidence score (0–100)
 * sourceStatus: 'Live' | 'Mock' | 'Derived'
 */
const intelligenceFeed = [
  {
    id: 'news-001',
    impact: 'High Impact',
    headline: 'Satellite imagery confirms sudden drop in Persian Gulf oil tanker throughput.',
    source: 'GEI Signal-4',
    time: '14 mins ago',
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    sector: 'Crude Oil',
    category: 'Supply Chain',
    sentimentEffect: 'Bullish',
    confidence: 91,
    whyItMatters: 'May indicate undeclared maintenance or tactical holding by regional producers.',
    context: 'Could tighten near-term supply expectations and provide upside support to Brent.',
    relatedRegions: ['Persian Gulf', 'Strait of Hormuz', 'Middle East'],
    relatedSectors: ['Crude Oil', 'Refined Products'],
    relatedCommodities: ['WTI Crude', 'Brent', 'LNG'],
    marketImpact: 'Could tighten near-term supply expectations. +$3-5 Brent volatility projected if throughput remains reduced.',
    affectedSectors: ['Crude Oil', 'Refined Products'],
    whatToWatch: ['Strait of Hormuz tanker count', 'VLCC spot rates', 'Brent premium vs WTI'],
    geoRiskRegion: 'Strait of Hormuz',
    sourceStatus: 'Mock'
  },
  {
    id: 'news-002',
    impact: 'High Impact',
    headline: 'OPEC+ production meeting confirmed for July — agenda includes market share strategy.',
    source: 'Policy Monitor',
    time: '20 mins ago',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    sector: 'Crude Oil',
    category: 'Policy',
    sentimentEffect: 'Volatile',
    confidence: 87,
    whyItMatters: 'Shift in production strategy rhetoric signals structural change from Q1 price-floor defense.',
    context: 'Market is pricing in increased production uncertainty through Q3.',
    relatedRegions: ['Middle East', 'Global'],
    relatedSectors: ['Crude Oil', 'Natural Gas', 'Refined Products'],
    relatedCommodities: ['WTI Crude', 'Brent', 'Natural Gas'],
    marketImpact: 'Market pricing increased production uncertainty. Q3 supply guidance may shift materially.',
    affectedSectors: ['Crude Oil', 'Natural Gas', 'Refined Products'],
    whatToWatch: ['OPEC+ July meeting agenda', 'Saudi production signaling', 'Russia compliance'],
    geoRiskRegion: 'Middle East',
    sourceStatus: 'Mock'
  },
  {
    id: 'news-003',
    impact: 'Medium Impact',
    headline: 'EU Energy Council meeting concludes with no consensus on additional sanctions.',
    source: 'Reuters Global',
    time: '1 hour ago',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    sector: 'Policy',
    category: 'Geo Risk',
    sentimentEffect: 'Neutral',
    confidence: 72,
    whyItMatters: 'Stabilizes near-term Natural Gas supply outlook for Central Europe.',
    context: 'Reduces immediate policy shock risk. Next council meeting scheduled in 6 weeks.',
    relatedRegions: ['Europe', 'Eastern Europe'],
    relatedSectors: ['Natural Gas', 'Power'],
    relatedCommodities: ['Natural Gas', 'Power (EU)'],
    marketImpact: 'Near-term gas supply risk deferred. No immediate policy shock to energy markets.',
    affectedSectors: ['Natural Gas', 'Power'],
    whatToWatch: ['Next EU council meeting', 'Russian transit volumes', 'EU gas price forward curve'],
    geoRiskRegion: 'Eastern Europe',
    sourceStatus: 'Mock'
  },
  {
    id: 'news-004',
    impact: 'High Impact',
    headline: 'Gulf Coast refinery maintenance season begins — diesel output projected down 4%.',
    source: 'Refinery Monitor',
    time: '35 mins ago',
    timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    sector: 'Refined Products',
    category: 'Supply Chain',
    sentimentEffect: 'Bullish',
    confidence: 84,
    whyItMatters: 'Tighter diesel supply heading into high-demand summer transport season.',
    context: 'Crack spreads likely to widen further if maintenance extends beyond initial 2-week window.',
    relatedRegions: ['North America', 'Gulf Coast'],
    relatedSectors: ['Refined Products', 'Crude Oil'],
    relatedCommodities: ['Diesel', 'Gasoline', 'Jet Fuel'],
    marketImpact: 'Diesel crack spreads widening. Jet fuel availability tightening ahead of peak summer travel.',
    affectedSectors: ['Refined Products', 'Crude Oil'],
    whatToWatch: ['Gulf Coast refinery run rates', 'Diesel crack spreads', 'Jet fuel forward curve'],
    geoRiskRegion: 'North America',
    sourceStatus: 'Mock'
  },
  {
    id: 'news-005',
    impact: 'Low Impact',
    headline: 'Port of Rotterdam reports 2% increase in renewable feedstock arrivals.',
    source: 'Logistics News',
    time: '4 hours ago',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    sector: 'Renewables',
    category: 'Supply Chain',
    sentimentEffect: 'Neutral',
    confidence: 61,
    whyItMatters: 'Long-term trend toward bio-diesel integration remains on track.',
    context: 'Supports gradual renewable feedstock adoption in European refinery conversion programs.',
    relatedRegions: ['Europe', 'Netherlands'],
    relatedSectors: ['Renewables', 'Refined Products'],
    relatedCommodities: ['Renewable Feedstocks', 'Bio-diesel'],
    marketImpact: 'Long-term structural positive for bio-diesel. No near-term price impact.',
    affectedSectors: ['Renewables', 'Refined Products'],
    whatToWatch: ['Rotterdam feedstock throughput', 'EU bio-diesel policy timeline', 'Refinery conversion progress'],
    geoRiskRegion: 'Europe',
    sourceStatus: 'Mock'
  },
  {
    id: 'news-006',
    impact: 'High Impact',
    headline: 'Gold surges past $2,380/oz as geopolitical risk premium builds across energy markets.',
    source: 'COMEX Signal',
    time: '45 mins ago',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    sector: 'Gold',
    category: 'Market Move',
    sentimentEffect: 'Risk Elevated',
    confidence: 88,
    whyItMatters: 'Gold strength signals broad risk-off sentiment, historically correlating with crude oil volatility spikes within 48–72 hours.',
    context: 'Safe-haven demand accelerating as Middle East tensions remain unresolved and dollar index shows weakness.',
    relatedRegions: ['Global', 'Middle East'],
    relatedSectors: ['Crude Oil', 'Natural Gas'],
    relatedCommodities: ['Gold', 'WTI Crude', 'Brent'],
    marketImpact: 'Risk premium widening across energy complex. Correlation-driven crude upside expected. Watch $2,400 resistance.',
    affectedSectors: ['Crude Oil', 'Natural Gas'],
    whatToWatch: ['$2,400 gold resistance level', 'Dollar index (DXY) reaction', 'Crude/gold correlation coefficient'],
    geoRiskRegion: 'Global',
    sourceStatus: 'Derived'
  },
  {
    id: 'news-007',
    impact: 'Medium Impact',
    headline: 'Copper slips below $4.50/lb signaling China demand slowdown risk for energy complex.',
    source: 'COMEX / LME Monitor',
    time: '2 hours ago',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sector: 'Copper',
    category: 'Market Move',
    sentimentEffect: 'Bearish',
    confidence: 74,
    whyItMatters: 'Copper is a leading indicator of global industrial demand. Weakness signals reduced power and renewables build-out in China.',
    context: 'China PMI data showing contraction for second consecutive month.',
    relatedRegions: ['China', 'Asia Pacific', 'Global'],
    relatedSectors: ['Power', 'Renewables'],
    relatedCommodities: ['Copper', 'Lithium', 'Aluminum'],
    marketImpact: 'Demand slowdown signal may reduce LNG and coal import growth from China. Negative for renewables expansion timelines.',
    affectedSectors: ['Power', 'Renewables'],
    whatToWatch: ['China PMI monthly print', 'LME copper inventory', 'Chinese power sector capex outlook'],
    geoRiskRegion: 'Asia Pacific',
    sourceStatus: 'Derived'
  },
  {
    id: 'news-008',
    impact: 'Medium Impact',
    headline: 'Wheat futures spike 3.2% on renewed Black Sea shipping disruption fears near Ukrainian ports.',
    source: 'CBOT / Reuters',
    time: '3 hours ago',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    sector: 'Wheat',
    category: 'Geo Risk',
    sentimentEffect: 'Risk Elevated',
    confidence: 79,
    whyItMatters: 'Black Sea disruption links directly to food inflation and sovereign risk in import-dependent energy producers across MENA.',
    context: 'Ukrainian port officials report tightening of corridor security following recent incident.',
    relatedRegions: ['Black Sea', 'Ukraine', 'MENA'],
    relatedSectors: ['Policy', 'Refined Products'],
    relatedCommodities: ['Wheat', 'Crude Oil', 'Fertilizers'],
    marketImpact: 'Broad food inflation risk supports USD and energy risk premium. MENA energy exporters may face domestic subsidy pressures.',
    affectedSectors: ['Policy', 'Refined Products'],
    whatToWatch: ['Black Sea shipping corridor status', 'MENA food subsidy budgets', 'Russia-Ukraine ceasefire signals'],
    geoRiskRegion: 'Black Sea / Eastern Europe',
    sourceStatus: 'Derived'
  },
  {
    id: 'news-009',
    impact: 'Medium Impact',
    headline: 'Uranium spot breaks $90/lb — nuclear buildout demand accelerating as energy security dominates policy.',
    source: 'Sprott / Nuclear Intelligence Weekly',
    time: '5 hours ago',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    sector: 'Uranium',
    category: 'Market Move',
    sentimentEffect: 'Bullish',
    confidence: 82,
    whyItMatters: 'Uranium at $90/lb signals structural nuclear renaissance. Long-term demand from energy security policy driving utilities to lock in supply.',
    context: 'US, France, Japan, and South Korea all accelerating nuclear capacity additions.',
    relatedRegions: ['Global', 'US', 'Europe', 'Asia Pacific'],
    relatedSectors: ['Power', 'Renewables'],
    relatedCommodities: ['Uranium', 'Natural Gas', 'Coal'],
    marketImpact: 'Bullish for uranium miners. Long-term negative for natural gas as nuclear displaces gas-for-power demand.',
    affectedSectors: ['Power', 'Renewables'],
    whatToWatch: ['Uranium spot vs term price spread', 'US utility contracting activity', 'Kazakh supply pipeline status'],
    geoRiskRegion: 'Kazakhstan / Global',
    sourceStatus: 'Mock'
  },
  {
    id: 'news-010',
    impact: 'Low Impact',
    headline: 'Lithium carbonate oversupply weighs on EV battery margins — spot price down 12% YTD.',
    source: 'Metal Bulletin / EV Supply Monitor',
    time: '6 hours ago',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    sector: 'Lithium',
    category: 'Supply Chain',
    sentimentEffect: 'Bearish',
    confidence: 69,
    whyItMatters: 'Lithium price collapse compresses EV battery margins, potentially accelerating EV adoption through lower vehicle costs.',
    context: 'Chilean and Australian production ramps outpacing demand growth. Market may rebalance in H2 2027.',
    relatedRegions: ['Chile', 'Australia', 'China', 'Global'],
    relatedSectors: ['Renewables', 'Power'],
    relatedCommodities: ['Lithium', 'Cobalt', 'Nickel'],
    marketImpact: 'Near-term: negative for lithium producers. Long-term: positive for EV adoption rates and grid battery storage deployment.',
    affectedSectors: ['Renewables', 'Power'],
    whatToWatch: ['Chilean lithium export volumes', 'EV OEM battery cost per kWh', 'Grid storage project pipelines'],
    geoRiskRegion: 'South America / Asia Pacific',
    sourceStatus: 'Mock'
  },
  {
    id: 'news-011',
    impact: 'High Impact',
    headline: 'Sudan pipeline suspended — 150,000 bpd crude supply disruption flagged by African Energy Monitor.',
    source: 'GEI Signal-4 / African Energy Monitor',
    time: '1 hour ago',
    timestamp: new Date(Date.now() - 62 * 60 * 1000).toISOString(),
    sector: 'Crude Oil',
    category: 'Geo Risk',
    sentimentEffect: 'Bullish',
    confidence: 86,
    whyItMatters: 'African crude supply disruptions tighten the global crude balance and provide Brent upside support.',
    context: 'Pipeline operator reports force majeure. Third disruption this quarter. Resolution timeline unknown.',
    relatedRegions: ['Sudan', 'Red Sea', 'North Africa', 'East Africa'],
    relatedSectors: ['Crude Oil', 'Refined Products'],
    relatedCommodities: ['Brent', 'WTI Crude', 'Dubai Crude'],
    marketImpact: 'Loss of 150,000 bpd tightens African grade availability. Brent may see +$1-2 premium on supply risk alone.',
    affectedSectors: ['Crude Oil', 'Refined Products'],
    whatToWatch: ['Pipeline restoration timeline', 'Alternative supply via Red Sea', 'Brent premium reaction'],
    geoRiskRegion: 'East Africa / Red Sea',
    sourceStatus: 'Mock'
  },
  {
    id: 'news-012',
    impact: 'Medium Impact',
    headline: 'US Department of Energy signals SPR refilling strategy — purchases to begin Q3 2026.',
    source: 'DOE / Policy Monitor',
    time: '2 hours ago',
    timestamp: new Date(Date.now() - 118 * 60 * 1000).toISOString(),
    sector: 'Crude Oil',
    category: 'Policy',
    sentimentEffect: 'Bullish',
    confidence: 77,
    whyItMatters: 'SPR refilling adds systematic demand support to US domestic crude market and may tighten WTI differentials.',
    context: 'DOE seeking to rebuild reserves after record drawdown in 2022–2023. Purchase price cap under negotiation.',
    relatedRegions: ['North America', 'Global'],
    relatedSectors: ['Crude Oil'],
    relatedCommodities: ['WTI Crude', 'Domestic US grades'],
    marketImpact: 'Systematic WTI buying program may narrow Brent/WTI spread. Positive for US domestic crude producers.',
    affectedSectors: ['Crude Oil'],
    whatToWatch: ['SPR purchase volume and timing', 'WTI/Brent spread movement', 'US domestic producer response'],
    geoRiskRegion: 'North America',
    sourceStatus: 'Derived'
  },
  {
    id: 'news-013',
    impact: 'High Impact',
    headline: 'Texas LNG terminal expansion delayed 6 months on FERC regulatory hurdle — export window narrows.',
    source: 'LNG Intelligence / Reuters',
    time: '3 hours ago',
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    sector: 'Natural Gas',
    category: 'Supply Chain',
    sentimentEffect: 'Bullish',
    confidence: 80,
    whyItMatters: 'LNG export delays tighten domestic natural gas availability and could limit European import volumes through H1 next year.',
    context: 'FERC approval delayed pending environmental review. Two additional projects face similar timeline risks.',
    relatedRegions: ['North America', 'Europe', 'Asia Pacific'],
    relatedSectors: ['Natural Gas', 'Power'],
    relatedCommodities: ['Natural Gas', 'LNG', 'Power (EU)'],
    marketImpact: 'Bullish for European TTF gas prices if US LNG supply remains constrained. Asian spot LNG premium may widen.',
    affectedSectors: ['Natural Gas', 'Power'],
    whatToWatch: ['FERC approval timeline', 'European TTF forward curve', 'Asian LNG spot premium'],
    geoRiskRegion: 'North America / Europe',
    sourceStatus: 'Mock'
  },
  {
    id: 'news-014',
    impact: 'Medium Impact',
    headline: 'ENTSO-E flags German transmission bottleneck — renewable curtailment risk flagged for weekend.',
    source: 'ENTSO-E / Grid Monitor',
    time: '2.5 hours ago',
    timestamp: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    sector: 'Power',
    category: 'Geo Risk',
    sentimentEffect: 'Risk Elevated',
    confidence: 75,
    whyItMatters: 'Grid bottlenecks force curtailment of renewable generation and increase balancing costs, potentially spiking spot power prices.',
    context: 'Weekend wind generation forecast high while cross-border interconnectors near capacity. Balancing market stress expected.',
    relatedRegions: ['Germany', 'Europe', 'Nordic'],
    relatedSectors: ['Power', 'Renewables', 'Natural Gas'],
    relatedCommodities: ['Power (EU)', 'Natural Gas', 'Carbon Credits (EUA)'],
    marketImpact: 'EU power spot may spike Saturday. Gas-for-power demand could increase as renewable output is curtailed.',
    affectedSectors: ['Power', 'Renewables', 'Natural Gas'],
    whatToWatch: ['German day-ahead power price', 'Intraday balancing costs', 'Cross-border flow capacity'],
    geoRiskRegion: 'Germany / Europe',
    sourceStatus: 'Mock'
  },
  {
    id: 'news-015',
    impact: 'Medium Impact',
    headline: 'North Sea Forties field maintenance extended by 10 days — Brent loading schedule revised by Shell.',
    source: 'Platts / Argus Media',
    time: '4 hours ago',
    timestamp: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    sector: 'Crude Oil',
    category: 'Supply Chain',
    sentimentEffect: 'Bullish',
    confidence: 83,
    whyItMatters: 'North Sea production cuts support Brent benchmark and widen the Brent/WTI spread short-term.',
    context: 'Shell confirms Forties field at reduced output for additional 10 days. Cargo loading rescheduled to next month.',
    relatedRegions: ['North Sea', 'Europe', 'UK'],
    relatedSectors: ['Crude Oil', 'Refined Products'],
    relatedCommodities: ['Brent', 'Forties Crude', 'WTI Crude'],
    marketImpact: 'Brent/WTI spread may widen +$0.50-1.50 on reduced North Sea supply. European refinery margins affected.',
    affectedSectors: ['Crude Oil', 'Refined Products'],
    whatToWatch: ['Forties field restart timeline', 'Brent/WTI spread', 'European crude cargo availability'],
    geoRiskRegion: 'North Sea / UK',
    sourceStatus: 'Mock'
  }
];

// ─── 7b. CROSS-MARKET SIGNALS ───────────────────────────────────────────────
/**
 * Secondary signals: not primary sector cards.
 * Used by AI analysis as supporting context.
 */
const crossMarketSignals = [
  {
    id: 'gold',
    name: 'Gold',
    symbol: 'GOLD',
    price: 2341.20,
    unit: 'USD/oz',
    currency: '$',
    change: 18.40,
    changePercent: 0.8,
    direction: 'up',
    signalType: 'Safe-Haven',
    signalColor: 'text-tertiary',
    whyItMatters: 'Rising gold = geopolitical fear / USD stress. Supports energy risk premium.',
    affectedSectors: ['Crude Oil', 'Natural Gas'],
    source: 'COMEX',
    timestamp: new Date().toISOString()
  },
  {
    id: 'copper',
    name: 'Copper',
    symbol: 'COPPER',
    price: 4.52,
    unit: 'USD/lb',
    currency: '$',
    change: -0.02,
    changePercent: -0.4,
    direction: 'down',
    signalType: 'Industrial Demand',
    signalColor: 'text-on-surface-variant',
    whyItMatters: 'Copper tracks global industrial demand. Weakness signals China/EM slowdown.',
    affectedSectors: ['Power', 'Renewables'],
    source: 'COMEX',
    timestamp: new Date().toISOString()
  },
  {
    id: 'wheat',
    name: 'Wheat',
    symbol: 'WHEAT',
    price: 582.40,
    unit: 'USc/bu',
    currency: '',
    change: 6.80,
    changePercent: 1.2,
    direction: 'up',
    signalType: 'Food Inflation',
    signalColor: 'text-tertiary',
    whyItMatters: 'Black Sea / Russia supply risk. Food inflation feeds broad inflation and energy demand.',
    affectedSectors: ['Refined Products', 'Policy'],
    source: 'CBOT',
    timestamp: new Date().toISOString()
  },
  {
    id: 'uranium',
    name: 'Uranium',
    symbol: 'URA',
    price: 86.40,
    unit: 'USD/lb',
    currency: '$',
    change: 1.80,
    changePercent: 2.1,
    direction: 'up',
    signalType: 'Nuclear Security',
    signalColor: 'text-primary',
    whyItMatters: 'Nuclear power renaissance. Energy security re-rating driving long-term demand.',
    affectedSectors: ['Power', 'Renewables'],
    source: 'Sprott/ETF',
    timestamp: new Date().toISOString()
  },
  {
    id: 'lithium',
    name: 'Lithium',
    symbol: 'LIT',
    price: 42.80,
    unit: 'USD/share',
    currency: '$',
    change: -0.78,
    changePercent: -1.8,
    direction: 'down',
    signalType: 'EV Supply Chain',
    signalColor: 'text-error',
    whyItMatters: 'EV battery demand and clean energy storage. Oversupply weighing on price.',
    affectedSectors: ['Renewables', 'Power'],
    source: 'ETF',
    timestamp: new Date().toISOString()
  }
];

// ─── 7c. CROSS-MARKET SIGNAL SUMMARY ────────────────────────────────────────
const crossMarketSignalSummary = {
  gold: 'Gold rising signals elevated geopolitical risk, supporting crude risk premium.',
  copper: 'Copper stable — no major demand stress signal at this time.',
  wheat: 'Wheat tracking Black Sea developments and food-energy inflation linkage.',
  uranium: 'Uranium strength signals continued nuclear power investment renaissance.',
  lithium: 'Lithium tracking EV demand and clean energy storage supply chain conditions.',
  overallCrossMarketRead: 'Cross-market signals lean cautious: rising gold and soft copper suggest contained but watchful risk posture.'
};

// ─── 8. HISTORICAL DATA  (GET /api/history/{sector}) ────────────────────────
/**
 * Historical sentiment and confidence trend — last 30 days per sector
 * Used for trend charts and momentum analysis
 */
const historicalData = {
  'crude-oil': {
    sector: 'Crude Oil',
    period: '30d',
    sentimentHistory: [
      { date: '2026-04-28', sentiment: 'Neutral', confidence: 61 },
      { date: '2026-05-05', sentiment: 'Neutral', confidence: 58 },
      { date: '2026-05-12', sentiment: 'Bullish', confidence: 68 },
      { date: '2026-05-19', sentiment: 'Bullish', confidence: 76 },
      { date: '2026-05-26', sentiment: 'Bullish', confidence: 82 },
      { date: '2026-05-28', sentiment: 'Bullish', confidence: 84 }
    ]
  },
  'natural-gas': {
    sector: 'Natural Gas',
    period: '30d',
    sentimentHistory: [
      { date: '2026-04-28', sentiment: 'Neutral', confidence: 70 },
      { date: '2026-05-05', sentiment: 'Bearish', confidence: 66 },
      { date: '2026-05-12', sentiment: 'Bearish', confidence: 64 },
      { date: '2026-05-19', sentiment: 'Bearish', confidence: 61 },
      { date: '2026-05-26', sentiment: 'Bearish', confidence: 60 },
      { date: '2026-05-28', sentiment: 'Bearish', confidence: 62 }
    ]
  },
  'refined-products': {
    sector: 'Refined Products',
    period: '30d',
    sentimentHistory: [
      { date: '2026-04-28', sentiment: 'Neutral', confidence: 60 },
      { date: '2026-05-05', sentiment: 'Bullish', confidence: 65 },
      { date: '2026-05-12', sentiment: 'Volatile', confidence: 72 },
      { date: '2026-05-19', sentiment: 'Volatile', confidence: 74 },
      { date: '2026-05-26', sentiment: 'Volatile', confidence: 77 },
      { date: '2026-05-28', sentiment: 'Volatile', confidence: 78 }
    ]
  },
  'power': {
    sector: 'Power',
    period: '30d',
    sentimentHistory: [
      { date: '2026-04-28', sentiment: 'Steady', confidence: 88 },
      { date: '2026-05-05', sentiment: 'Steady', confidence: 89 },
      { date: '2026-05-12', sentiment: 'Steady', confidence: 90 },
      { date: '2026-05-19', sentiment: 'Steady', confidence: 91 },
      { date: '2026-05-26', sentiment: 'Steady', confidence: 91 },
      { date: '2026-05-28', sentiment: 'Steady', confidence: 91 }
    ]
  },
  'renewables': {
    sector: 'Renewables',
    period: '30d',
    sentimentHistory: [
      { date: '2026-04-28', sentiment: 'Expanding', confidence: 88 },
      { date: '2026-05-05', sentiment: 'Expanding', confidence: 90 },
      { date: '2026-05-12', sentiment: 'Expanding', confidence: 92 },
      { date: '2026-05-19', sentiment: 'Expanding', confidence: 93 },
      { date: '2026-05-26', sentiment: 'Expanding', confidence: 95 },
      { date: '2026-05-28', sentiment: 'Expanding', confidence: 95 }
    ]
  }
};

// ─── 9. HIGH-IMPACT EVENTS  (GET /api/events/high-impact) ───────────────────
const highImpactEvents = intelligenceFeed
  .filter(item => item.impact === 'High Impact')
  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

// ─── 10. API RESPONSE SHAPES  ───────────────────────────────────────────────
/**
 * These functions simulate what the backend API endpoints return.
 * Replace these with actual fetch() calls when real endpoints are ready.
 */
const API = {
  /** GET /api/dashboard/summary */
  getDashboardSummary: () => ({
    marketPulse,
    topRiskRegion: geoRiskItems[0],
    topAffectedSector: sectorScores.find(s => s.sector === marketPulse.mostAffectedSector),
    latestExecutiveBriefing: executiveBriefing
  }),

  /** GET /api/prices */
  getPrices: () => ({ tickerItems }),

  /** GET /api/sectors */
  getSectors: () => ({ sectorScores }),

  /** GET /api/georisk */
  getGeoRisk: () => ({ geoRiskItems }),

  /** GET /api/headlines */
  getHeadlines: () => ({ intelligenceFeed }),

  /** GET /api/live-feed */
  getLiveFeed: () => ({ liveFeedItems }),

  /** GET /api/executive-briefing */
  getExecutiveBriefing: () => ({ executiveBriefing }),

  /** GET /api/history/{sector} */
  getSectorHistory: (sectorId) => ({ history: historicalData[sectorId] || null }),

  /** GET /api/events/high-impact */
  getHighImpactEvents: () => ({ events: highImpactEvents })
};
