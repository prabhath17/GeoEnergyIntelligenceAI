const nowIso = () => new Date().toISOString();

const COMMODITY_ALIASES = {
  'crude-oil': ['crude', 'oil', 'wti', 'brent', 'opec', 'hormuz', 'libya', 'tanker', 'diesel', 'gasoline'],
  'natural-gas': ['natural gas', 'natgas', 'gas', 'lng', 'ttf', 'henry hub', 'storage', 'pipeline', 'freeport'],
  coal: ['coal', 'thermal coal', 'power switching', 'ara'],
  power: ['power', 'electricity', 'grid', 'mwh', 'nuclear', 'gas-for-power', 'interconnector'],
  gasoline: ['gasoline', 'pump', 'retail fuel', 'driving season'],
  diesel: ['diesel', 'distillate', 'crack spread', 'freight', 'trucking'],
  'jet-fuel': ['jet fuel', 'airline', 'aviation', 'travel'],
  lng: ['lng', 'liquefied natural gas', 'export terminal', 'regasification', 'jkm', 'ttf'],
  silver: ['silver', 'xag', 'solar', 'photovoltaic'],
  aluminum: ['aluminum', 'aluminium', 'smelter', 'power cost', 'lme aluminum'],
  freight: ['freight', 'shipping', 'bdi', 'red sea', 'container', 'tanker', 'bulk', 'suez', 'panama'],
  'refined-products': ['diesel', 'gasoline', 'jet fuel', 'refinery', 'crack spread', 'heating oil', 'distillate'],
  gold: ['gold', 'xau', 'safe-haven', 'central bank'],
  copper: ['copper', 'industrial demand', 'china', 'lme'],
  uranium: ['uranium', 'nuclear', 'u3o8', 'reactor'],
  lithium: ['lithium', 'battery', 'ev', 'carbonate'],
  wheat: ['wheat', 'grain', 'food inflation', 'black sea'],
  carbon: ['carbon', 'ets', 'eua', 'emissions'],
  renewables: ['renewables', 'solar', 'wind', 'battery', 'grid curtailment'],
};

const COMMODITY_NAMES = {
  'crude-oil': 'Crude Oil',
  'natural-gas': 'Natural Gas',
  coal: 'Coal',
  power: 'Power / Electricity',
  gasoline: 'Gasoline',
  diesel: 'Diesel',
  'jet-fuel': 'Jet Fuel',
  lng: 'LNG',
  silver: 'Silver',
  aluminum: 'Aluminum',
  freight: 'Freight / Shipping Stress',
  'refined-products': 'Refined Products',
  gold: 'Gold',
  copper: 'Copper',
  uranium: 'Uranium',
  lithium: 'Lithium',
  wheat: 'Wheat',
  carbon: 'Carbon / EU ETS',
  renewables: 'Renewables',
};

const BASE = {
  'crude-oil': {
    bias: 'Bullish supply-risk bias',
    risk: 'High',
    horizon: '2-6 weeks',
    direct: 'Pump prices and jet fuel',
    indirect: 'Freight, plastics, retail goods',
    inflation: 'High',
    score: 76,
    household: 72,
    summary: 'Crude oil reaches consumers first through gasoline and diesel prices. It then spreads into airline costs, trucking, grocery logistics, plastics, retail goods, and inflation expectations.',
    cards: [
      ['Gasoline prices', 'High', 'Rising', 'Pump prices typically lag crude moves by 2-4 weeks.', 82],
      ['Diesel / freight cost', 'High', 'Rising', 'Diesel changes move trucking and delivery surcharges quickly.', 79],
      ['Airline tickets', 'Moderate', 'Rising', 'Jet fuel hedges delay but do not eliminate fare pressure.', 64],
      ['Grocery logistics', 'Moderate', 'Rising', 'Food distribution absorbs diesel and cold-chain costs.', 58],
      ['Retail goods', 'Moderate', 'Stable', 'Plastics, packaging, and delivery costs pass through gradually.', 52],
      ['Household inflation pressure', 'High', 'Rising', 'Fuel is visible and influences inflation expectations.', 74],
      ['Business pass-through', 'High', 'Rising', 'Fuel-intensive sectors have limited room to absorb costs.', 77],
      ['Consumer sentiment', 'Moderate', 'Falling', 'Higher pump prices reduce discretionary confidence.', 61],
    ],
    distribution: [78, 86, 62, 54, 66, 72],
    flow: ['Commodity Price', 'Refinery Cost', 'Freight / Utility Cost', 'Retail Price', 'Consumer Wallet'],
    thesis: 'Crude oil is being priced with a geopolitical supply premium. The market is not only reacting to spot barrels; it is repricing the probability that chokepoint, OPEC+, or Atlantic Basin supply risk tightens available crude and refined products.',
    blocks: {
      whatChanged: ['Supply-route risk and OPEC+ rhetoric are keeping a floor under Brent and WTI.', 'Diesel and gasoline pass-through risk rises when crude strength persists for more than one weekly cycle.'],
      whyItMatters: ['Crude is the upstream cost anchor for gasoline, diesel, jet fuel, petrochemicals, and freight.', 'A sustained crude move affects traders first, businesses next, and consumers with a short lag.'],
      confirmation: ['Brent holding above resistance, diesel cracks widening, and gold rising together confirm a real supply-risk premium.'],
      invalidation: ['A material OPEC+ output increase, weak China demand data, or rapid de-escalation at chokepoints would weaken the bullish thesis.'],
    },
    signals: ['Brent/WTI momentum', 'Hormuz tanker flow', 'Diesel crack spread', 'Gold safe-haven confirmation'],
    risks: ['OPEC+ supply surprise', 'Demand destruction', 'USD rally', 'China import weakness'],
    triggers: [
      ['Hormuz tanker flow disruption', 'Critical', 'Airlines / logistics / fuel buyers', 'A traffic disruption can add immediate supply premium to Brent.', 'AIS flow down 10%+ for 48 hours', 'Bullish'],
      ['OPEC+ production rhetoric', 'High', 'Traders and crude holders', 'Policy tone can reset the supply floor.', 'Formal quota or compliance shift', 'Bullish/Bearish'],
      ['US inventory surprise', 'High', 'Refiners and traders', 'Large draws confirm physical tightness.', 'EIA crude draw > 5M bbl', 'Bullish'],
      ['Diesel crack spread widening', 'Medium', 'Trucking and agriculture', 'Diesel stress transmits quickly into freight costs.', 'Crack spread > $35/bbl', 'Bullish refined products'],
      ['Brent resistance/support break', 'High', 'Portfolio risk desks', 'Technical confirmation changes hedge urgency.', 'Close above $90 or below $75', 'Directional'],
    ],
  },
  'natural-gas': {
    bias: 'Range-bound with weather optionality',
    risk: 'Moderate',
    horizon: '3-8 weeks',
    direct: 'Heating and utility bills',
    indirect: 'Power, fertilizer, industrial heat',
    inflation: 'Moderate',
    score: 61,
    household: 58,
    summary: 'Natural gas reaches consumers through heating bills and electricity rates in gas-heavy grids. It also affects fertilizer, chemicals, glass, and food costs through industrial fuel use.',
    cards: [
      ['Home heating', 'Moderate', 'Stable', 'Storage cushions bills unless weather turns colder.', 57],
      ['Electricity bills', 'Moderate', 'Stable', 'Gas-fired generation sets marginal power cost in many markets.', 60],
      ['Fertilizer cost', 'Moderate', 'Falling', 'Lower gas eases ammonia input costs.', 48],
      ['Industrial goods', 'Moderate', 'Stable', 'Manufacturers benefit when gas remains contained.', 50],
      ['Grocery inflation', 'Low', 'Falling', 'Fertilizer relief takes months to reach shelves.', 39],
      ['LNG-linked exposure', 'High', 'Rising', 'Export outages and TTF/JKM shocks can reprice rapidly.', 70],
      ['Utility pass-through', 'Moderate', 'Stable', 'Regulated tariffs lag spot prices by 6-8 weeks.', 55],
      ['Consumer sentiment', 'Low', 'Stable', 'Bills are less visible outside winter demand peaks.', 41],
    ],
    distribution: [72, 44, 48, 42, 24, 56],
    flow: ['Gas Price', 'Utility / Generator Cost', 'Tariff Adjustment', 'Monthly Bill', 'Household Budget'],
    thesis: 'Natural gas is balanced between storage surplus pressure and event risk from LNG exports, weather, and pipeline constraints. The thesis is less about immediate scarcity and more about whether storage buffers survive the next demand shock.',
    blocks: {
      whatChanged: ['Storage levels remain the anchor, but LNG outage headlines create regional divergence.', 'Henry Hub can stay soft while Europe or Asia tightens.'],
      whyItMatters: ['Gas is the marginal price setter for power and a core input for fertilizer and industry.', 'Small storage or weather surprises can create large price responses.'],
      confirmation: ['Falling storage injections, LNG disruptions, and gas-for-power burn rising together confirm upside risk.'],
      invalidation: ['Mild weather, strong injections, and export normalization would keep the market oversupplied.'],
    },
    signals: ['EU storage pace', 'LNG outage status', 'Weather forecast', 'Gas-for-power burn'],
    risks: ['Cold snap', 'Pipeline maintenance', 'LNG outage', 'Storage injection stall'],
    triggers: [
      ['EU storage injection pace', 'High', 'Utilities and industrial users', 'Storage deficits define winter scarcity risk.', 'Below 5-year injection pace for 3 weeks', 'Bullish gas'],
      ['LNG export outage', 'High', 'LNG traders and EU buyers', 'Outages shift supply between Henry Hub and global gas.', '2+ bcfd offline', 'Regional divergence'],
      ['Cold snap forecast', 'Critical', 'Households and utilities', 'Weather can rapidly erase storage comfort.', '10-day HDD forecast jumps 15%+', 'Bullish'],
      ['Pipeline maintenance', 'Medium', 'Power generators', 'Maintenance changes regional deliverability.', 'Major corridor outage notice', 'Bullish local basis'],
      ['Gas-for-power burn', 'Medium', 'Utilities', 'Rising burn ties power and gas upside together.', 'Burn above seasonal average', 'Bullish'],
    ],
  },
  'refined-products': {
    bias: 'Crack-spread volatility',
    risk: 'High',
    horizon: '2-5 weeks',
    direct: 'Gasoline, diesel, heating oil',
    indirect: 'Freight, groceries, travel',
    inflation: 'High',
    score: 73,
    household: 70,
    summary: 'Refined products are where upstream crude risk becomes consumer price pressure. Gasoline hits households directly; diesel reaches groceries, construction, agriculture, and delivery costs.',
    cards: [
      ['Gasoline pump price', 'High', 'Rising', 'Retail stations reprice faster than most consumer categories.', 78],
      ['Diesel freight', 'High', 'Rising', 'Diesel drives trucking, farming, and last-mile delivery costs.', 81],
      ['Heating oil bills', 'Moderate', 'Stable', 'Seasonality limits immediate impact outside winter.', 48],
      ['Air travel', 'Moderate', 'Rising', 'Jet fuel follows refining margins and crude input costs.', 62],
      ['Grocery logistics', 'Moderate', 'Rising', 'Cold-chain and trucking costs pass through in weeks.', 59],
      ['Retail delivery', 'Moderate', 'Rising', 'E-commerce and imported goods absorb fuel surcharges.', 55],
      ['Business pass-through', 'High', 'Rising', 'Low-margin sectors pass cost pressure to invoices.', 76],
      ['Consumer sentiment', 'Moderate', 'Falling', 'Visible fuel prices weigh on confidence.', 60],
    ],
    distribution: [54, 88, 62, 56, 67, 72],
    flow: ['Crude Input', 'Refinery Margin', 'Wholesale Rack Price', 'Retail Pump Price', 'Consumer Wallet'],
    thesis: 'Refined products remain vulnerable to crack-spread widening because refinery maintenance, crude feedstock costs, and freight disruptions can tighten diesel and gasoline even if crude is only moderately higher.',
    blocks: {
      whatChanged: ['Refinery maintenance and Red Sea freight costs are supporting product cracks.', 'Diesel sensitivity is more important than headline crude alone.'],
      whyItMatters: ['Refined products are the direct pass-through channel from energy markets to consumers and businesses.'],
      confirmation: ['Diesel cracks above threshold and refinery utilization below normal confirm product tightness.'],
      invalidation: ['Refinery restarts, weak demand, or crude input relief would compress cracks.'],
    },
    signals: ['Diesel crack spread', 'Refinery utilization', 'Red Sea insurance', 'Gasoline inventories'],
    risks: ['Refinery restart', 'Demand weakness', 'Inventory build', 'Crude reversal'],
    triggers: [
      ['Diesel crack spread widening', 'High', 'Logistics and agriculture', 'Diesel is the business cost pressure channel.', 'Crack spread > $35/bbl', 'Bullish diesel'],
      ['Gulf refinery utilization drop', 'High', 'Fuel distributors', 'Lower runs tighten wholesale supply.', 'Utilization < 85%', 'Bullish products'],
      ['Gasoline inventory draw', 'Medium', 'Consumers', 'Draws before driving season lift retail risk.', 'Draw > 3M bbl', 'Bullish gasoline'],
      ['Red Sea insurance premium', 'Medium', 'Importers', 'Freight premium adds delivered fuel cost.', 'War-risk premium doubles', 'Bullish delivered fuels'],
      ['Crude input cost reversal', 'Medium', 'Refiners', 'Lower crude can ease product prices if cracks do not widen.', 'Brent breaks below support', 'Bearish products'],
    ],
  },
};

const DERIVED_KEYS = {
  gasoline: ['Gasoline', 'Pump-price sensitive', 'Critical', '1-4 weeks', 78, 76],
  diesel: ['Diesel', 'Freight-cost pressure', 'High', '2-6 weeks', 80, 74],
  'jet-fuel': ['Jet Fuel', 'Airline fuel surcharge risk', 'High', '2-8 weeks', 66, 60],
  lng: ['LNG', 'Global gas trade optionality', 'High', '2-10 weeks', 64, 58],
  coal: ['Coal', 'Power substitution stress', 'Moderate', '4-12 weeks', 55, 52],
  power: ['Power / Electricity', 'Grid-cost sensitivity', 'Moderate', '1-3 billing cycles', 62, 68],
  silver: ['Silver', 'Solar and safe-haven hybrid', 'Moderate', '3-12 weeks', 46, 42],
  aluminum: ['Aluminum', 'Power-intensive metal cost', 'Moderate', '4-10 weeks', 52, 49],
  freight: ['Freight / Shipping Stress', 'Shipping cost pass-through', 'High', '6-12 weeks', 69, 65],
  gold: ['Gold', 'Safe-haven inflation signal', 'Moderate', '2-8 weeks', 38, 35],
  copper: ['Copper', 'Industrial demand signal', 'Moderate', '4-12 weeks', 44, 41],
  uranium: ['Uranium', 'Long-term power stability', 'Low', '12+ months', 33, 38],
  lithium: ['Lithium', 'EV battery cost pass-through', 'Moderate', '12-18 months', 42, 46],
  wheat: ['Wheat', 'Food inflation channel', 'High', '4-16 weeks', 70, 68],
  carbon: ['Carbon / EU ETS', 'Compliance cost channel', 'Moderate', '1-2 quarters', 48, 45],
  renewables: ['Renewables', 'Power bill stabilization', 'Low', '6-18 months', 35, 44],
};

function buildDerivedCommodityProfile(signalId) {
  const [name, bias, risk, horizon, score, household] = DERIVED_KEYS[signalId] || [COMMODITY_NAMES[signalId] || signalId, 'Balanced monitoring regime', 'Moderate', '4-8 weeks', 50, 50];
  const isFuel = ['gasoline', 'diesel', 'jet-fuel'].includes(signalId);
  return {
    bias,
    risk,
    horizon,
    direct: isFuel ? 'Retail and transport fuel' : `${name} linked cost exposure`,
    indirect: isFuel ? 'Freight, travel, delivery, inflation expectations' : 'Business input costs and second-round pass-through',
    inflation: risk,
    score,
    household,
    summary: `${name} affects consumers through its position in the energy and industrial cost chain. Direct exposure appears where households buy the product or pay utility bills; indirect exposure arrives through freight, business input costs, retail pricing, and inflation expectations.`,
    cards: [
      ['Direct household cost', risk, 'Stable', `${name} changes affect the most exposed consumer category first.`, score],
      ['Transportation exposure', isFuel ? 'High' : 'Moderate', isFuel ? 'Rising' : 'Stable', 'Transport costs determine how quickly prices reach households.', Math.min(90, score + 8)],
      ['Energy bills', signalId === 'power' || signalId === 'coal' || signalId === 'lng' ? 'High' : 'Moderate', 'Stable', 'Utility and fuel tariffs convert market moves into monthly bills.', Math.min(88, score + 4)],
      ['Food and grocery logistics', 'Moderate', 'Stable', 'Freight, refrigeration, and packaging transmit costs into food baskets.', Math.max(35, score - 7)],
      ['Retail goods', 'Moderate', 'Stable', 'Imported and manufactured goods absorb energy and shipping costs.', Math.max(32, score - 9)],
      ['Business pass-through', risk, 'Rising', 'Companies pass sustained input pressure into invoices and shelf prices.', Math.min(92, score + 6)],
      ['Household budget stress', risk, 'Stable', 'Budget pressure rises when the category is visible and recurring.', household],
      ['Consumer sentiment', 'Moderate', score > 60 ? 'Falling' : 'Stable', 'Visible price increases influence confidence and spending intent.', Math.max(30, household - 6)],
    ],
    distribution: [score, Math.min(90, score + 10), Math.max(25, score - 5), Math.max(25, score - 8), Math.max(25, score - 2), household],
    flow: ['Commodity Price', 'Producer Cost', 'Freight / Utility Cost', 'Retail Price', 'Consumer Wallet'],
    thesis: `${name} is being evaluated through ${bias.toLowerCase()}. The key question is whether current price moves are isolated or strong enough to transmit into business costs, consumer prices, and positioning across related energy markets.`,
    blocks: {
      whatChanged: [`${name} is showing a changed risk profile versus the prior monitoring cycle.`, 'The live feed is being checked for price, policy, supply, demand, and cross-market confirmation.'],
      whyItMatters: [`${name} is tied to consumer and business cost channels through direct prices, substitution, or pass-through.`, 'A sustained move changes hedging urgency and household exposure.'],
      confirmation: [`Confirmation requires price momentum plus matching news or cross-market signals for ${name}.`],
      invalidation: [`The thesis weakens if price action reverses and related headlines fail to confirm ${name} stress.`],
    },
    signals: [`${name} price momentum`, 'Related sector headlines', 'Cross-market confirmation', 'Pass-through pressure'],
    risks: ['Demand reversal', 'Policy shock', 'Inventory surprise', 'Macro risk-off'],
    triggers: [
      [`${name} price breakout`, 'High', 'Traders and exposed businesses', 'A confirmed breakout changes hedge urgency.', 'Two closes beyond recent range', 'Directional'],
      ['Inventory or supply surprise', 'High', 'Holders and procurement teams', 'Physical balance surprises move the front of the curve.', 'Official inventory miss/beat', 'Directional'],
      ['Policy or regulation update', 'Medium', 'Businesses and investors', 'Policy can reset cost, compliance, or supply assumptions.', 'Formal agency or government release', 'Directional'],
      ['Demand signal shift', 'Medium', 'Industrial users', 'Demand validates whether price pressure can persist.', 'PMI/import/consumption data surprise', 'Bullish if demand improves'],
      ['Cross-market confirmation', 'Medium', 'Risk desks', 'Related markets confirm or contradict the thesis.', 'Linked commodity moves same direction', 'Higher conviction'],
    ],
  };
}

function getBaseProfile(signalId) {
  return BASE[signalId] || buildDerivedCommodityProfile(signalId);
}

function titleCaseTag(tag = 'macro') {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

function normalizeSentiment(value = '') {
  const text = String(value).toLowerCase();
  if (text.includes('bull') || text.includes('risk elevated') || text.includes('up')) return 'bullish';
  if (text.includes('bear') || text.includes('down')) return 'bearish';
  return 'neutral';
}

function inferTag(item = {}) {
  const text = [item.category, item.eventType, item.headline, item.title, item.whyItMatters].filter(Boolean).join(' ').toLowerCase();
  if (/supply|outage|refinery|pipeline|storage|inventory/.test(text)) return 'supply';
  if (/demand|consumer|driving|industrial|pmi/.test(text)) return 'demand';
  if (/geo|sanction|hormuz|red sea|black sea|war|risk/.test(text)) return 'geopolitics';
  if (/inflation|fed|usd|macro|rates/.test(text)) return 'macro';
  if (/technical|resistance|support|break/.test(text)) return 'technical';
  if (/consumer|pump|grocery|bill|retail/.test(text)) return 'consumer';
  return 'macro';
}

function getItemTime(item = {}) {
  return item.timestamp || item.date || item.time || nowIso();
}

function itemMatchesCommodity(item, signalId) {
  const aliases = [COMMODITY_NAMES[signalId], ...(COMMODITY_ALIASES[signalId] || [])].filter(Boolean).map(v => String(v).toLowerCase());
  const text = [
    item.headline,
    item.title,
    item.summary,
    item.whyItMatters,
    item.sector,
    item.category,
    item.eventType,
    ...(item.relatedSectors || []),
    ...(item.relatedRegions || []),
  ].filter(Boolean).join(' ').toLowerCase();
  return aliases.some(alias => text.includes(alias));
}

export function dedupeNewsItems(items = []) {
  const seen = new Set();
  return items.filter(item => {
    const key = String(item.headline || item.title || '').toLowerCase().replace(/\W+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeIntelligenceItem(item, signalId, index = 0) {
  const headline = item.headline || item.title || `${COMMODITY_NAMES[signalId]} intelligence update`;
  const summary = item.summary || item.whyItMatters || item.context || `${headline} is relevant to ${COMMODITY_NAMES[signalId]} exposure and market direction.`;
  return {
    ...item,
    id: item.id || `${signalId}-intel-${index}`,
    headline,
    title: headline,
    source: item.source || 'GEI Intelligence',
    timestamp: item.timestamp || item.date || nowIso(),
    time: item.time || 'Current cycle',
    summary,
    whyItMatters: item.whyItMatters || summary,
    relevanceReason: item.relevanceReason || `Mapped to ${COMMODITY_NAMES[signalId]} by commodity keywords, sector linkage, or related risk channel.`,
    tag: item.tag || inferTag(item),
    sentiment: item.sentiment || normalizeSentiment(item.sentimentEffect || item.direction || ''),
    priority: item.priority || (item.impact === 'High Impact' ? 'High' : item.impact === 'Low Impact' ? 'Low' : 'Medium'),
    impact: item.impact || 'Medium Impact',
  };
}

function fallbackItems(signalId, count = 5) {
  const profile = getBaseProfile(signalId);
  const name = COMMODITY_NAMES[signalId] || signalId;
  const angles = ['supply balance', 'demand confirmation', 'macro linkage', 'geopolitical risk', 'consumer pass-through', 'technical confirmation', 'business margin pressure', 'volatility regime'];
  return Array.from({ length: count }, (_, i) => {
    const signal = profile.signals[i % profile.signals.length] || `${name} market signal`;
    const risk = profile.risks[i % profile.risks.length] || `${name} risk factor`;
    const tags = ['supply', 'demand', 'macro', 'geopolitics', 'consumer', 'technical'];
    const sentiment = i % 3 === 0 ? 'bullish' : i % 3 === 1 ? 'neutral' : 'bearish';
    return normalizeIntelligenceItem({
      id: `${signalId}-fallback-${i}`,
      headline: `${name}: ${signal} ${angles[i % angles.length]} update`,
      source: 'GEI Fallback Intelligence',
      timestamp: nowIso(),
      time: 'Fallback cycle',
      summary: `${signal} is being tracked against ${risk.toLowerCase()} to determine whether the current ${name} thesis strengthens or weakens.`,
      relevanceReason: `${signal} directly affects ${profile.direct.toLowerCase()} and ${profile.indirect.toLowerCase()}.`,
      tag: tags[i % tags.length],
      sentiment,
      priority: i < 2 ? 'High' : 'Medium',
      impact: i < 2 ? 'High Impact' : 'Medium Impact',
    }, signalId, i);
  });
}

export function fillWithFallbackItems(items = [], fallback = [], count = 5) {
  return dedupeNewsItems([...items, ...fallback]).slice(0, count);
}

export function getCommodityNews(data, signalId, count = 5) {
  const pools = [...(data?.intelligenceFeed || []), ...(data?.liveFeedItems || [])];
  const matched = pools
    .filter(item => itemMatchesCommodity(item, signalId))
    .map((item, i) => normalizeIntelligenceItem(item, signalId, i))
    .sort((a, b) => new Date(getItemTime(b)) - new Date(getItemTime(a)));
  return fillWithFallbackItems(matched, fallbackItems(signalId, count + 3), count);
}

export function getRelatedIntelligence(data, signalId) {
  return getCommodityNews(data, signalId, 5);
}

export function getThesisNews(data, signalId) {
  return getCommodityNews(data, signalId, 3);
}

export function getCommodityConsumerImpact(signalId) {
  const p = getBaseProfile(signalId);
  return {
    impactScore: p.score,
    directImpact: p.direct,
    indirectImpact: p.indirect,
    inflationPressure: p.inflation,
    consumerSummary: p.summary,
    impactCards: p.cards.map(([title, impactLevel, trend, explanation, score]) => ({ title, impactLevel, trend, explanation, score })),
    impactDistribution: ['Energy Bills', 'Transportation', 'Food', 'Retail Goods', 'Travel', 'Household Budget'].map((label, i) => ({ label, value: p.distribution[i] || 40 })),
    transmissionFlow: p.flow,
    householdImpactScore: p.household,
    whyConsumersFeelThisCommodity: p.summary,
  };
}

export function getCommodityThesis(signalId, liveNews = []) {
  const p = getBaseProfile(signalId);
  const block = (key, title, direction, confidence, supportingSignal) => ({
    title,
    explanation: p.blocks[key],
    direction,
    confidence,
    supportingSignal,
  });
  return {
    mainThesis: p.thesis,
    whatChanged: block('whatChanged', 'What changed', p.bias.toLowerCase().includes('bear') ? 'Bearish' : 'Bullish', 82, liveNews[0]?.headline || p.signals[0]),
    whyItMatters: block('whyItMatters', 'Why it matters', 'Neutral', 79, p.signals[1] || p.direct),
    confirmation: block('confirmation', 'Confirmation', 'Bullish', 76, p.signals[2] || 'Price and news alignment'),
    invalidation: block('invalidation', 'Invalidation', 'Bearish', 74, p.risks[0] || 'Thesis reversal trigger'),
    marketBias: p.bias,
    confidenceScore: Math.min(96, Math.max(55, p.score + 8)),
    riskLevel: p.risk,
    timeHorizon: p.horizon,
    supportingSignals: p.signals,
    keyRisks: p.risks,
    thesisNews: liveNews.length ? liveNews : fallbackItems(signalId, 3).slice(0, 3),
  };
}

export function getCommodityWatchlist(signalId) {
  return getBaseProfile(signalId).triggers.map(([trigger, urgency, affectedStakeholder, whyItMatters, confirmationLevel, likelyMarketDirection]) => ({
    trigger,
    triggerTitle: trigger,
    urgency,
    affectedStakeholder,
    whyItMatters,
    why: whyItMatters,
    confirmationLevel,
    watchThreshold: confirmationLevel,
    likelyMarketDirection,
    who: affectedStakeholder,
  })).slice(0, 5);
}

export function getCommodityIntelligence(data, signalId) {
  const relatedIntelligence = getRelatedIntelligence(data, signalId);
  const thesisNews = getThesisNews(data, signalId);
  return {
    consumerImpact: getCommodityConsumerImpact(signalId),
    aiThesis: getCommodityThesis(signalId, thesisNews),
    thesisNews,
    relatedIntelligence,
    watchlist: getCommodityWatchlist(signalId),
  };
}

// ── 6 standardized consumer-facing sectors ────────────────────────────────────
const CONSUMER_SECTORS_BASE = [
  {
    id: 'gasoline-pump',
    title: 'Gasoline / Pump Price',
    drivers: ['Crude Oil', 'Refined Products', 'OPEC+'],
    lag: '2–4 weeks',
    passThroughSpeed: 'Fast',
    directImpact: 'Pump prices per gallon / litre',
    indirectImpact: 'Consumer confidence, discretionary spending',
    explanation: 'Gasoline prices are the most visible consumer energy cost. A $10/bbl crude move typically translates to 5–8¢/gallon at the pump within 2–4 weeks.',
  },
  {
    id: 'electricity-bills',
    title: 'Electricity Bills',
    drivers: ['Natural Gas', 'Coal', 'Power Grid'],
    lag: '4–8 weeks',
    passThroughSpeed: 'Moderate',
    directImpact: 'Monthly utility bill increases',
    indirectImpact: 'Home appliance costs, EV charging costs',
    explanation: 'Electricity bills reflect gas-for-power costs with a tariff adjustment lag. Gas-heavy grids are most exposed; renewable-heavy grids are more insulated from shocks.',
  },
  {
    id: 'grocery-freight',
    title: 'Grocery / Freight Costs',
    drivers: ['Diesel', 'Freight / Shipping', 'Agriculture'],
    lag: '4–8 weeks',
    passThroughSpeed: 'Moderate',
    directImpact: 'Food basket price increases',
    indirectImpact: 'Cold-chain logistics, last-mile delivery surcharges',
    explanation: 'Diesel drives trucking and last-mile delivery costs. A sustained 10% diesel rise adds 2–4% to food basket prices through logistics pass-through.',
  },
  {
    id: 'travel-airline',
    title: 'Travel / Airline Tickets',
    drivers: ['Jet Fuel', 'Crude Oil', 'Freight'],
    lag: '6–10 weeks',
    passThroughSpeed: 'Moderate',
    directImpact: 'Airfare increases and fuel surcharges',
    indirectImpact: 'Tourism costs, business travel budgets',
    explanation: 'Airlines hedge 40–60% of fuel exposure but pass remaining costs through ticket pricing and fuel surcharges. Fare adjustments typically take 6–10 weeks.',
  },
  {
    id: 'home-heating',
    title: 'Home Heating / Cooling',
    drivers: ['Natural Gas', 'Power / Electricity', 'Coal'],
    lag: '4–10 weeks',
    passThroughSpeed: 'Slow (regulated)',
    directImpact: 'Heating oil, gas bills, winter utility costs',
    indirectImpact: 'Low-income household stress, energy poverty risk',
    explanation: 'Home heating is seasonal and utility-regulated. Gas and heating oil shocks take 4–10 weeks to flow through tariff adjustments to residential bills.',
  },
  {
    id: 'retail-imported',
    title: 'Retail Goods / Imported Goods',
    drivers: ['Freight / Shipping', 'Diesel', 'Aluminum', 'Copper'],
    lag: '6–12 weeks',
    passThroughSpeed: 'Slow',
    directImpact: 'Electronics, clothing, manufactured goods prices',
    indirectImpact: 'Import cost inflation, supply chain logistics fees',
    explanation: 'Freight stress, diesel costs, shipping surcharges, and energy-intensive materials (aluminum, copper, plastics) all pass into retail goods prices with a 6–12 week lag.',
  },
];

function impactLevelForSector(sectorId, signalId) {
  const isFuel = ['crude-oil', 'refined-products', 'gasoline', 'diesel'].includes(signalId);
  const isGas  = ['natural-gas', 'lng'].includes(signalId);
  const isFreight = signalId === 'freight';
  const isJet  = signalId === 'jet-fuel';
  const isPower = signalId === 'power';
  const isCoal = signalId === 'coal';
  const isAlum = signalId === 'aluminum';
  const isCopper = signalId === 'copper';
  const map = {
    'gasoline-pump':   isFuel ? 'High'     : isFreight ? 'Moderate' : isJet ? 'Moderate' : 'Low',
    'electricity-bills': (isGas || isPower || isCoal) ? 'High' : isFuel ? 'Moderate' : 'Low',
    'grocery-freight': (isFuel || isFreight) ? 'High' : (isAlum || isCopper) ? 'Moderate' : 'Moderate',
    'travel-airline':  (isJet || isFuel) ? 'High' : isFreight ? 'Moderate' : 'Low',
    'home-heating':    (isGas || isCoal) ? 'High' : isPower ? 'Moderate' : 'Low',
    'retail-imported': isFreight ? 'High' : (isFuel || isAlum || isCopper) ? 'Moderate' : 'Low',
  };
  return map[sectorId] || 'Low';
}

export function getConsumerImpactSectors(signalId) {
  const profile = getBaseProfile(signalId);
  const isBullish = (profile.bias || '').toLowerCase().includes('bull') ||
                    (profile.bias || '').toLowerCase().includes('elevated') ||
                    (profile.bias || '').toLowerCase().includes('stress') ||
                    (profile.bias || '').toLowerCase().includes('rising');
  return CONSUMER_SECTORS_BASE.map(sector => {
    const impactLevel = impactLevelForSector(sector.id, signalId);
    const direction = impactLevel === 'Low' ? '→' : (isBullish ? '↑' : '→');
    return { ...sector, impactLevel, direction };
  });
}

// ── Dynamic multi-factor consumer impact scoring ──────────────────────────────
export function calculateConsumerImpactScore(sector, signalId) {
  const impactVal = { Severe: 95, High: 82, Moderate: 62, Low: 35, Contained: 20 };
  const impactBase = impactVal[sector.impactLevel] || 50;

  // 35% — direct consumer exposure
  const direct = impactBase * 0.35;

  // 20% — indirect / CPI pass-through
  const indirectMap = { Severe: 90, High: 75, Moderate: 55, Low: 25 };
  const indirect = (indirectMap[sector.impactLevel] || 45) * 0.20;

  // 15% — current trend direction
  const trendMap = { '↑': 75, '→': 50, '↓': 25 };
  const trend = (trendMap[sector.direction] || 50) * 0.15;

  // 15% — inflation pressure proxy
  const inflMap = { Severe: 92, High: 78, Moderate: 55, Low: 28 };
  const infl = (inflMap[sector.impactLevel] || 45) * 0.15;

  // 10% — pass-through speed + lag urgency combined
  const speedMap = { Fast: 85, Moderate: 65, 'Slow (regulated)': 38, Slow: 40, Seasonal: 45 };
  const speedBase = speedMap[sector.passThroughSpeed] || 55;
  const lagNum = parseFloat((sector.lag || '').match(/\d+/)?.[0] || '8');
  const lagUrgency = lagNum <= 3 ? 85 : lagNum <= 5 ? 68 : lagNum <= 8 ? 52 : 38;
  const speedLag = ((speedBase + lagUrgency) / 2) * 0.10;

  // 5% — AI confidence proxy (signal relevance to this sector)
  const sectorRelevance = {
    'gasoline-pump':     ['crude-oil', 'refined-products'],
    'electricity-bills': ['natural-gas', 'power'],
    'grocery-freight':   ['crude-oil', 'refined-products'],
    'travel-airline':    ['refined-products', 'crude-oil'],
    'home-heating':      ['natural-gas'],
    'retail-imported':   ['freight', 'copper', 'aluminum'],
  };
  const relevantSignals = sectorRelevance[sector.id] || [];
  const conf = (relevantSignals.includes(signalId) ? 90 : 72) * 0.05;

  const total = direct + indirect + trend + infl + speedLag + conf;
  return Math.round(Math.min(97, Math.max(15, total)));
}

// ── Score explanation generator ───────────────────────────────────────────────
export function generateSectorScoreExplanation(sector) {
  const parts = [];
  if (sector.impactLevel === 'Severe' || sector.impactLevel === 'High')
    parts.push(`${sector.impactLevel.toLowerCase()} direct consumer exposure`);
  if (sector.direction === '↑') parts.push('rising trend adds pressure');
  if (sector.passThroughSpeed === 'Fast') parts.push('fast pass-through speed amplifies impact');
  else if (sector.passThroughSpeed === 'Slow (regulated)') parts.push('regulated tariffs slow transmission');
  if (!parts.length) parts.push('moderate exposure from current commodity signal');
  return `Scored ${sector.score || '–'}/100: ${parts.join(', ')}.`;
}

// ── Canonical display order for 6 sectors ────────────────────────────────────
const SECTOR_DISPLAY_ORDER = [
  'gasoline-pump', 'electricity-bills', 'grocery-freight',
  'travel-airline', 'home-heating', 'retail-imported',
];

// ── Ensure exactly 6 consumer impact sectors ─────────────────────────────────
export function ensureSixConsumerImpactSectors(sectors, signalId) {
  const allSix = getConsumerImpactSectors(signalId);
  const provided = Array.isArray(sectors) ? sectors : [];
  const seen = new Set();
  const deduped = provided.filter(s => {
    if (!s.id || seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
  return SECTOR_DISPLAY_ORDER.map(id =>
    deduped.find(s => s.id === id) || allSix.find(s => s.id === id)
  ).filter(Boolean);
}

// ── Normalize consumer impact data with scoring ───────────────────────────────
export function normalizeConsumerImpactData(rawConsumerImpact, signalId) {
  const rawSectors =
    (Array.isArray(rawConsumerImpact) && rawConsumerImpact.length > 0) ? rawConsumerImpact :
    (rawConsumerImpact && typeof rawConsumerImpact === 'object' && rawConsumerImpact.sectors) ? rawConsumerImpact.sectors :
    null;

  const isFallback = !rawSectors;
  const baseSectors = ensureSixConsumerImpactSectors(rawSectors, signalId);
  const sectors = baseSectors.map(s => ({
    ...s,
    score: calculateConsumerImpactScore(s, signalId),
  }));
  sectors.forEach(s => { s.explanation_score = generateSectorScoreExplanation(s); });

  const highestImpactSector = [...sectors].sort((a, b) => b.score - a.score)[0];

  return {
    selectedCommodity: signalId,
    isFallback,
    sectors,
    highestImpactSector,
    scoringBasis: 'direct(35%) + indirect-CPI(20%) + trend(15%) + inflation(15%) + speed-lag(10%) + confidence(5%)',
    generatedAt: new Date().toISOString(),
    sourceLabel: isFallback ? 'FALLBACK' : 'LIVE',
  };
}
