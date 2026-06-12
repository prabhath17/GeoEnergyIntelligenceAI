import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchSignalAnalysis } from '../services/api.js';
import { getCommodityIntelligence, getConsumerImpactSectors, calculateConsumerImpactScore, ensureSixConsumerImpactSectors, generateSectorScoreExplanation, normalizeConsumerImpactData } from '../utils/commodityIntelligence.js';

// ── Signal registry ──────────────────────────────────────────────────────────
const SIGNAL_MAP = {
  'crude-oil':        { label: 'Crude Oil',          category: 'energy',       icon: '🛢️',  aliases: ['crude','wti','brent','oil','crude oil'] },
  'natural-gas':      { label: 'Natural Gas',         category: 'energy',       icon: '🔥',  aliases: ['gas','natgas','henry hub','natural gas','ttf','lng'] },
  'refined-products': { label: 'Refined Products',    category: 'energy',       icon: '⛽',  aliases: ['diesel','gasoline','jet fuel','refined','heating oil','distillate','gasoil','refined products'] },
  'power':            { label: 'Power',               category: 'energy',       icon: '⚡',  aliases: ['electricity','grid','electric','power','mwh'] },
  'renewables':       { label: 'Renewables',          category: 'energy',       icon: '🌱',  aliases: ['solar','wind','renewable','renewables','green energy'] },
  'gold':             { label: 'Gold',                category: 'cross-market', icon: '🥇',  aliases: ['gold','xau','bullion'] },
  'silver':           { label: 'Silver',              category: 'cross-market', icon: '🥈',  aliases: ['silver','xag'] },
  'copper':           { label: 'Copper',              category: 'cross-market', icon: '🔩',  aliases: ['copper','hg'] },
  'wheat':            { label: 'Wheat',               category: 'cross-market', icon: '🌾',  aliases: ['wheat','grain','agriculture','agricultural'] },
  'uranium':          { label: 'Uranium',             category: 'cross-market', icon: '☢️',  aliases: ['uranium','u3o8','nuclear','nuclear fuel'] },
  'lithium':          { label: 'Lithium',             category: 'cross-market', icon: '🔋',  aliases: ['lithium','li','battery','ev battery'] },
  'coal':             { label: 'Coal',                category: 'cross-market', icon: '⚫',  aliases: ['coal','thermal coal','coking coal'] },
  'carbon':           { label: 'Carbon',              category: 'cross-market', icon: '🌡️',  aliases: ['carbon','ets','eua','carbon credits','emissions'] },
  'aluminum':         { label: 'Aluminum',            category: 'cross-market', icon: '🏗️',  aliases: ['aluminum','aluminium','al','alumina'] },
  'freight':          { label: 'Freight / Shipping',  category: 'cross-market', icon: '🚢',  aliases: ['freight','shipping','bdi','bulk','dry bulk','tanker','shipping stress'] },
};

Object.assign(SIGNAL_MAP, {
  gasoline: { label: 'Gasoline', category: 'energy', icon: '⛽', aliases: ['gasoline', 'pump price', 'retail fuel', 'gasoline prices'] },
  diesel: { label: 'Diesel', category: 'energy', icon: '⛽', aliases: ['diesel', 'distillate', 'diesel crack', 'trucking fuel'] },
  'jet-fuel': { label: 'Jet Fuel', category: 'energy', icon: '✈', aliases: ['jet fuel', 'aviation fuel', 'airline fuel', 'travel fuel'] },
  lng: { label: 'LNG', category: 'energy', icon: '⛴', aliases: ['lng', 'liquefied natural gas', 'jkm', 'export terminal', 'regasification'] },
});

const ENERGY_SIGNALS    = ['crude-oil','natural-gas','refined-products','gasoline','diesel','jet-fuel','lng','power','renewables'];
const XMARKET_SIGNALS   = ['gold','silver','copper','wheat','uranium','lithium','coal','carbon','aluminum','freight'];

// ── Local deterministic fallback data ─────────────────────────────────────────
const LOCAL_PROFILES = {
  'crude-oil': {
    stance: 'Risk Elevated — Geo-Premium Active',
    thesis: 'Crude oil is trading with an embedded geopolitical risk premium driven by active supply-route disruptions. OPEC+ output discipline combined with key chokepoint stress is supporting the bullish floor. Fuel-intensive businesses face direct cost escalation within 3-4 weeks.',
    posture: 'HOLD', conviction: 'High', riskScore: 72,
    drivers: [
      { name: 'Geo-Risk', label: 'ELEVATED', color: '#ff8f8f', desc: 'Active supply route disruptions and OPEC+ output discipline creating a floor.' },
      { name: 'Supply/Demand', label: 'TIGHT', color: '#fac84a', desc: 'Global demand steady, supply constrained by production cuts and geo-disruptions.' },
      { name: 'USD / Macro', label: 'MODERATE', color: '#7dbfff', desc: 'USD strength is a headwind but risk-off sentiment supports crude risk premium.' },
      { name: 'Policy', label: 'SUPPORTIVE', color: '#6edb9a', desc: 'OPEC+ compliance holding above 90% — no production surge imminent.' },
    ],
    stakeholders: [
      { name: 'Energy Traders', score: 92, posture: 'HEDGE', note: 'High volatility opportunity. Long crude futures or options hedges viable given geo-premium.' },
      { name: 'Airlines', score: 85, posture: 'HEDGE', note: 'Jet fuel directly tracks Brent — every $10/bbl adds ~$180M annual cost to mid-size carrier.' },
      { name: 'Fuel Distributors', score: 83, posture: 'HOLD', note: 'Margin pressure building from upstream crude + refinery spread. Monitor crack spreads.' },
      { name: 'Logistics / Trucking', score: 80, posture: 'HEDGE', note: 'Diesel cost sensitivity high — a $0.20/gal move significantly affects annual freight costs.' },
      { name: 'Consumers', score: 62, posture: 'MONITOR', note: 'Pump price lag 3-4 weeks. Gasoline cost rise expected if crude sustains above $85/bbl.' },
      { name: 'Manufacturers', score: 58, posture: 'MONITOR', note: 'Indirect energy input cost and freight surcharge pass-through building.' },
    ],
    holderScenario: { posture: 'HOLD', conviction: 'High', risk: 'Moderate', watch: 'Hormuz tanker flow + Libya / Nigeria output reports', invalidation: 'OPEC+ surprise production increase or significant China demand miss' },
    consumerImpact: 'Crude oil moves reach consumers primarily through gasoline and diesel prices at the pump. At current levels, expect a 5-8 cents/gallon increase within 3-4 weeks. Airlines may begin adding fuel surcharges. Grocery prices see secondary inflation as freight costs rise with a 4-6 week lag.',
    connected: { affects: ['Refined Products', 'Freight', 'Airlines cost base'], affectedBy: ['Gold (safe-haven confirm)', 'USD index', 'Geo-Risk Score'], correlations: ['+0.85 with Brent/WTI spread', '+0.72 with Freight Index', '-0.65 with USD strength'] },
    watchlist: [
      { trigger: 'Brent sustained > $90/bbl for 5+ days', why: 'Defines bullish regime — fuel cost escalation accelerates for all businesses.', who: 'Airlines, Logistics, Fuel Retailers' },
      { trigger: 'Hormuz tanker disruption', why: '20% of global crude flows through — any disruption = $15-25/bbl spike.', who: 'Energy Traders, Airlines, Consumers' },
      { trigger: 'OPEC+ production announcement', why: 'Supply swing factor — a production increase breaks the geo-premium floor.', who: 'All Energy Participants' },
      { trigger: 'US crude inventory draw > 5M bbl/week', why: 'Confirms demand strength over supply — bullish confirmation signal.', who: 'Energy Traders, Refiners' },
      { trigger: 'Libya / Nigeria output disruption', why: 'Key floating supply sources — disruption tightens Atlantic basin significantly.', who: 'European Refiners, Airlines' },
    ],
    businessImpact: [
      { sector: 'Airlines', impact: 'High', costPressure: 'High', watch: 'Brent > $90/bbl sustained' },
      { sector: 'Logistics / Trucking', impact: 'High', costPressure: 'High', watch: 'Diesel crack spread > $35/bbl' },
      { sector: 'Fuel Retailers', impact: 'High', costPressure: 'High', watch: 'Retail margin vs crack spread' },
      { sector: 'Agriculture', impact: 'Moderate', costPressure: 'High', watch: 'Diesel cost + fertilizer spread' },
      { sector: 'Manufacturing', impact: 'Moderate', costPressure: 'Moderate', watch: 'Energy input cost index' },
    ],
  },
  'natural-gas': {
    stance: 'Oversupply Risk — Storage Surplus Watch',
    thesis: 'Natural gas markets face storage surplus pressure with EU injection pace running above 5-year average. Mild weather reducing near-term demand — winter risk is the key binary event. LNG export capacity is a structural support for Henry Hub prices.',
    posture: 'REDUCE', conviction: 'Moderate', riskScore: 58,
    drivers: [
      { name: 'Storage Level', label: 'SURPLUS', color: '#7dbfff', desc: 'EU storage above 5-year average suppressing prompt price. US storage neutral.' },
      { name: 'Demand / Weather', label: 'WEAK', color: '#6edb9a', desc: 'Mild temperatures reducing gas-for-heating demand. Industrial demand subdued.' },
      { name: 'LNG Exports', label: 'SUPPORTIVE', color: '#fac84a', desc: 'US LNG export capacity expansion structurally supports Henry Hub above $2.00/MMBtu.' },
      { name: 'Policy', label: 'NEUTRAL', color: '#9aa3b0', desc: 'No major regulatory changes affecting pipeline or LNG export policy near term.' },
    ],
    stakeholders: [
      { name: 'Utilities / Power Producers', score: 78, posture: 'MONITOR', note: 'Gas-for-power demand moderating. Storage surplus reduces supply security risk.' },
      { name: 'Industrial Users', score: 72, posture: 'HOLD', note: 'Lower gas prices support margins for chemical, fertilizer, and glass manufacturers.' },
      { name: 'LNG Traders', score: 68, posture: 'REDUCE', note: 'Spot LNG prices weak globally — regasification margins compressed for now.' },
      { name: 'Households', score: 55, posture: 'MONITOR', note: 'Home heating costs likely stable to lower. Benefit if winter remains mild.' },
      { name: 'Fertilizer / Agriculture', score: 52, posture: 'HOLD', note: 'Natural gas is key input for ammonia/fertilizer — lower prices are a positive margin signal.' },
    ],
    holderScenario: { posture: 'REDUCE', conviction: 'Moderate', risk: 'High', watch: 'EU storage fill rate + LNG export volumes + early winter weather forecasts', invalidation: 'Cold snap, LNG export disruption, or storage injection pace stalls below 60% by September' },
    consumerImpact: 'Natural gas directly impacts home heating bills and electricity costs in gas-heavy grids. With current storage surplus and mild weather, household energy bills are likely flat to slightly lower this season. A cold snap reversal would change this rapidly — expect a 6-8 week price pass-through lag to utility bills.',
    connected: { affects: ['Power (grid price)', 'Fertilizer / Wheat (input cost)', 'Aluminum (smelting cost)'], affectedBy: ['Weather forecasts (temperature)', 'LNG trade flows', 'EU weekly storage data'], correlations: ['+0.78 with EU TTF', '+0.52 with Power grid price', '-0.45 with US storage surplus'] },
    watchlist: [
      { trigger: 'EU storage below 60% entering September', why: 'Winter deficit risk accelerates — all gas-dependent industry and consumers exposed.', who: 'Utilities, Manufacturers, Consumers' },
      { trigger: 'Henry Hub moves above $3.50/MMBtu', why: 'Regime shift — changes economics for power generation and industrial users.', who: 'Utilities, Chemical/Fertilizer, Households' },
      { trigger: 'LNG export terminal disruption (US Gulf)', why: 'US export disruption can briefly flood domestic market — bearish for Henry Hub.', who: 'LNG Traders, European Importers' },
      { trigger: 'Early cold snap forecast (October onset)', why: 'Rapid demand pull can reverse storage surplus quickly — key binary winter event.', who: 'All Gas-Exposed Stakeholders' },
    ],
    businessImpact: [
      { sector: 'Utilities / Power', impact: 'High', costPressure: 'Moderate', watch: 'Gas storage injection pace' },
      { sector: 'Fertilizer / Agriculture', impact: 'Moderate', costPressure: 'Low (benefit)', watch: 'Ammonia spread vs gas price' },
      { sector: 'Industrial Manufacturing', impact: 'Moderate', costPressure: 'Low', watch: 'Gas price vs production cost floor' },
      { sector: 'Consumers / Households', impact: 'Moderate', costPressure: 'Low', watch: 'Utility bill adjustment cycle' },
    ],
  },
  'gold': {
    stance: 'Safe-Haven Bid Active — Geo-Risk Confirmation',
    thesis: 'Gold is acting as a safe-haven confirmation signal. Elevated geopolitical risk and defensive flows suggest investors are pricing uncertainty, which indirectly supports crude oil risk premium and pressures risk-sensitive industrial assets. Central bank buying remains a structural floor.',
    posture: 'HOLD', conviction: 'High', riskScore: 68,
    drivers: [
      { name: 'Geo-Risk / Safe-Haven', label: 'ACTIVE', color: '#fac84a', desc: 'Elevated conflict zones driving defensive flows — gold confirms broader risk-off sentiment.' },
      { name: 'USD / Real Rates', label: 'HEADWIND', color: '#7dbfff', desc: 'USD strength is a structural headwind. Lower real rates would be gold\'s catalyst for next leg.' },
      { name: 'Central Bank Demand', label: 'STRONG', color: '#6edb9a', desc: 'EM central banks diversifying reserves into gold — structural floor below market price.' },
      { name: 'Inflation Expectations', label: 'ELEVATED', color: '#fac84a', desc: 'Sticky inflation narrative supports gold as a store of value thesis globally.' },
    ],
    stakeholders: [
      { name: 'Gold Traders / Miners', score: 88, posture: 'HOLD', note: 'Safe-haven bid + central bank demand creating a strong floor. Geo escalation = sharp upside.' },
      { name: 'Investors (Portfolio Hedge)', score: 82, posture: 'HOLD', note: 'Gold serves as portfolio insurance. $2300+ signals genuine risk-off positioning by institutions.' },
      { name: 'Energy Traders', score: 68, posture: 'MONITOR', note: 'Gold-up is a crude risk premium confirmation — watch correlation for energy timing signals.' },
      { name: 'Jewelry / Industrial Users', score: 64, posture: 'MONITOR', note: 'High gold prices compress jewelry demand in price-sensitive markets (India, China).' },
      { name: 'Consumers', score: 52, posture: 'MONITOR', note: 'Gold rise signals broader inflation/risk environment — watch for secondary consumer cost effects.' },
    ],
    holderScenario: { posture: 'HOLD', conviction: 'High', risk: 'Moderate', watch: 'Middle East / Russia escalation + Fed interest rate signals + USD direction', invalidation: 'Geo-risk de-escalation or significant USD rally + broad risk-on pivot by institutions' },
    consumerImpact: 'Gold does not directly impact household bills, but a rising gold price signals defensive market behavior, inflation concern, or geopolitical fear. These same forces also support oil\'s risk premium — meaning rising gold often precedes higher gasoline prices by several weeks.',
    connected: { affects: ['Crude Oil (risk premium confirm)', 'Silver (safe-haven correlation)', 'USD (inverse)'], affectedBy: ['Geopolitical risk score', 'USD index (DXY)', 'Fed rate decisions', 'Central bank buying programs'], correlations: ['+0.72 with Silver (safe-haven)', '+0.65 with Crude (geo-risk regime)', '-0.78 with USD strength'] },
    watchlist: [
      { trigger: 'Gold sustained above $2,500/oz', why: 'Signals extreme risk-off — crude oil risk premium likely follows within days.', who: 'Energy Traders, Portfolio Managers, Risk Desks' },
      { trigger: 'Gold breaks below $2,100/oz', why: 'Risk-off unwind — geo-risk premium in crude may also deflate quickly.', who: 'Energy Traders, Crude Holders' },
      { trigger: 'Central bank reserve diversification announcement', why: 'Structural demand driver — major CB gold purchase is a medium-term floor signal.', who: 'Gold Traders, Long-Term Investors' },
      { trigger: 'Fed pivot to rate cuts confirmed', why: 'Lower real rates remove key headwind — gold historically surges on rate cut cycles.', who: 'Gold Holders, Investors, Miners' },
    ],
    businessImpact: [
      { sector: 'Gold Mining', impact: 'High (benefit)', costPressure: 'Low', watch: 'Gold price vs all-in sustaining cost' },
      { sector: 'Jewelry / Retail', impact: 'Moderate (negative)', costPressure: 'High', watch: 'Gold > $2,400 for demand destruction' },
      { sector: 'Electronics / Tech', impact: 'Low', costPressure: 'Moderate', watch: 'Industrial gold consumption trends' },
      { sector: 'Financial Services', impact: 'High (opportunity)', costPressure: 'Low', watch: 'Safe-haven flow volumes + ETF positioning' },
    ],
  },
  'uranium': {
    stance: 'Nuclear Renaissance — Structural Bull',
    thesis: 'Uranium is in a structural bull market driven by global nuclear renaissance policy. Advanced economies are reversing nuclear phase-outs while emerging markets build first-generation fleets. Long-term supply deficits are building as mines cannot ramp fast enough to meet growing demand.',
    posture: 'BUY', conviction: 'High', riskScore: 35,
    drivers: [
      { name: 'Policy / Nuclear Renaissance', label: 'VERY STRONG', color: '#6edb9a', desc: 'US, EU, Japan, South Korea all extending or restarting nuclear programs with bipartisan support.' },
      { name: 'Supply Deficit', label: 'BUILDING', color: '#ff8f8f', desc: 'Mine restarts are slow — Cameco and Kazatomprom cannot ramp fast enough to meet forward demand.' },
      { name: 'Demand Growth', label: 'ACCELERATING', color: '#fac84a', desc: 'SMR pipeline, data center power demand, and AI energy consumption — all structurally bullish.' },
      { name: 'Geopolitical Risk', label: 'ELEVATED', color: '#fac84a', desc: 'Kazakhstan and Russia supply concentration creates geopolitical supply risk for Western buyers.' },
    ],
    stakeholders: [
      { name: 'Uranium Producers / Miners', score: 94, posture: 'BUY', note: 'Long-term demand re-rating. Contracted supply at $80+/lb is highly profitable.' },
      { name: 'Nuclear Plant Operators', score: 82, posture: 'HOLD', note: 'Higher uranium prices increase fuel costs — partially offset by high power output revenues.' },
      { name: 'Power Utilities', score: 78, posture: 'MONITOR', note: 'Long-term power price stability benefit from nuclear fleet extension — watch fuel cost hedging.' },
      { name: 'Investors', score: 85, posture: 'HOLD', note: 'Strong structural bull thesis — ETF (URA, NLR) and physical uranium funds have seen significant inflows.' },
      { name: 'Government / Policy Makers', score: 72, posture: 'BUY', note: 'Energy security narrative drives uranium as a strategic national asset — stockpiling signals.' },
    ],
    holderScenario: { posture: 'HOLD', conviction: 'High', risk: 'Low-Moderate', watch: 'New reactor announcements + enrichment supply chain + Kazakh export restrictions', invalidation: 'Major accident, widespread plant cancellations, or breakthrough alternative displacing nuclear' },
    consumerImpact: 'Uranium does not directly affect consumer energy bills in the short term. However, the nuclear renaissance is helping stabilize long-term electricity prices — more nuclear capacity means less reliance on volatile gas-for-power markets. Consumers in nuclear-heavy grids (France, South Korea) benefit from lower, more stable electricity costs.',
    connected: { affects: ['Power (grid stability)', 'Carbon (emission reduction via nuclear)'], affectedBy: ['Energy policy decisions', 'Mine supply (Kazakhstan, Canada)', 'SMR development pipeline'], correlations: ['+0.82 with nuclear ETFs (URA, NLR)', '+0.55 with Power price stability', '-0.40 with natural gas demand for power'] },
    watchlist: [
      { trigger: 'Uranium holds above $90/lb for 2 consecutive weeks', why: 'Confirms nuclear renaissance demand re-rating — reshapes long-term power generation mix.', who: 'Utilities, Power Investors, Governments' },
      { trigger: 'New SMR contract or government reactor announcement', why: 'Forward demand signal — each new reactor adds ~40 years of uranium demand.', who: 'Uranium Producers, Power Utilities' },
      { trigger: 'Kazakhstan export restriction or quota cut', why: 'Kazakhstan is ~45% of global supply — any restriction = acute supply shock for Western buyers.', who: 'All Nuclear Industry Participants' },
      { trigger: 'Data center / AI nuclear PPA announcement', why: 'AI/cloud is driving new nuclear power purchase agreements — incremental demand driver.', who: 'Power Utilities, Uranium Miners' },
    ],
    businessImpact: [
      { sector: 'Nuclear Utilities', impact: 'High', costPressure: 'Moderate', watch: 'Fuel cost vs power revenue spread' },
      { sector: 'Mining / Resources', impact: 'High (benefit)', costPressure: 'Low', watch: 'Cameco / Kazatomprom production' },
      { sector: 'Technology / AI', impact: 'Moderate', costPressure: 'Low', watch: 'Nuclear PPA signings for data centers' },
      { sector: 'Carbon / Climate Policy', impact: 'Moderate (benefit)', costPressure: 'Low', watch: 'Nuclear inclusion in green taxonomy' },
    ],
  },
  'lithium': {
    stance: 'Oversupply Pressure — Wait for Floor Confirmation',
    thesis: 'Lithium markets face a significant oversupply cycle following aggressive mine capacity expansion that outpaced EV demand growth. Prices have corrected sharply from 2022 highs. A floor is forming but the timing of demand recovery from the EV adoption curve remains uncertain.',
    posture: 'WAIT', conviction: 'Low', riskScore: 82,
    drivers: [
      { name: 'Supply Surplus', label: 'CRITICAL', color: '#ff8f8f', desc: 'Mine expansion (Australia, Chile, China) has significantly outpaced demand — inventory builds.' },
      { name: 'EV Demand', label: 'SLOWING', color: '#fac84a', desc: 'EV adoption growth rate decelerating, particularly in EU and US — below initial projections.' },
      { name: 'Battery Technology', label: 'SHIFTING', color: '#7dbfff', desc: 'Sodium-ion and LFP (lower lithium intensity) batteries gaining market share.' },
      { name: 'Policy', label: 'SUPPORTIVE', color: '#6edb9a', desc: 'IRA, EU Green Deal, and Asian EV subsidies still structurally supportive for long-term demand.' },
    ],
    stakeholders: [
      { name: 'Lithium Miners', score: 88, posture: 'WAIT', note: 'Margin compression severe at current spot prices — watching for floor confirmation before new investment.' },
      { name: 'Battery Manufacturers', score: 72, posture: 'HOLD', note: 'Lower lithium input costs support margin recovery. CATL and LG Chem benefiting near-term.' },
      { name: 'EV Automakers', score: 68, posture: 'HOLD', note: 'Lower battery costs help offset EV price pressure. Ford, GM benefit from cell cost reduction.' },
      { name: 'Investors', score: 65, posture: 'WAIT', note: 'Floor not yet confirmed — wait for demand recovery signals or supply curtailment announcements.' },
      { name: 'Consumers', score: 55, posture: 'MONITOR', note: 'Lower lithium costs eventually reach EV buyers through battery pack price reductions (12-18m lag).' },
    ],
    holderScenario: { posture: 'WAIT', conviction: 'Low', risk: 'High', watch: 'EV adoption rate data (monthly) + major mine curtailment announcements', invalidation: 'EV demand reacceleration above 30% YoY growth OR major mine closures reducing supply significantly' },
    consumerImpact: 'Falling lithium prices are ultimately consumer-positive — they reduce EV battery costs, making electric vehicles more price-competitive with gasoline cars. The timing of cost pass-through to consumers is typically 12-18 months behind spot market moves due to long-term supply contracts.',
    connected: { affects: ['Copper (EV wire demand)', 'Silver (solar panel demand overlap)', 'Carbon (EV adoption pace)'], affectedBy: ['EV demand growth rate', 'Mine supply (Australia, Chile, China)', 'Battery technology innovation'], correlations: ['+0.75 with EV ETFs (LIT)', '+0.55 with Copper', '-0.60 with Sodium-ion battery adoption rate'] },
    watchlist: [
      { trigger: 'Lithium carbonate below $10,000/tonne for 30 days', why: 'Forces uneconomic mine shutdowns — supply curtailment accelerates floor formation.', who: 'Miners, Battery Manufacturers, EV OEMs' },
      { trigger: 'China EV sales above +35% YoY for 2 consecutive months', why: 'China is 60% of global EV market — demand recovery signal is lithium\'s key catalyst.', who: 'Lithium Miners, Battery Makers, Investors' },
      { trigger: 'Major miner announces production curtailment', why: 'Supply side response to oversupply — first step to market rebalancing.', who: 'Lithium Traders, Miners, Investors' },
      { trigger: 'New battery technology reducing lithium intensity', why: 'Structural demand shift — could extend oversupply cycle significantly.', who: 'Miners, Long-Term Investors' },
    ],
    businessImpact: [
      { sector: 'EV Manufacturing', impact: 'High (benefit)', costPressure: 'Low', watch: 'Battery cell cost per kWh trend' },
      { sector: 'Lithium Mining', impact: 'High (negative)', costPressure: 'High', watch: 'Spot price vs all-in sustaining cost' },
      { sector: 'Battery Manufacturing', impact: 'Moderate (benefit)', costPressure: 'Low', watch: 'Cell price vs EV demand volume' },
      { sector: 'Consumer Electronics', impact: 'Low', costPressure: 'Moderate', watch: 'Consumer device battery cost index' },
    ],
  },
  'freight': {
    stance: 'Stress Signals — Demand Slowdown Watch',
    thesis: 'Freight and shipping markets are showing stress signals indicating a broader demand slowdown. Baltic Dry Index weakness reflects slowing bulk commodity trade, while container freight rates remain elevated from Red Sea re-routing.',
    posture: 'WAIT', conviction: 'Low', riskScore: 75,
    drivers: [
      { name: 'Demand / Trade Volume', label: 'SLOWING', color: '#fac84a', desc: 'Global trade volume growth decelerating — bulk commodity demand particularly weak.' },
      { name: 'Red Sea Disruption', label: 'ONGOING', color: '#ff8f8f', desc: 'Container ships re-routing via Cape of Good Hope adds 10-14 days to Asia-Europe voyages.' },
      { name: 'Fuel Cost (Bunker)', label: 'ELEVATED', color: '#fac84a', desc: 'Bunker fuel costs remain high — adds to shipping operating costs and freight rate floor.' },
      { name: 'Fleet Capacity', label: 'OVERSUPPLY', color: '#7dbfff', desc: 'New vessel deliveries outpacing retirement — excess capacity is a structural bearish factor.' },
    ],
    stakeholders: [
      { name: 'Shipping Companies', score: 78, posture: 'HEDGE', note: 'Red Sea diversion supporting container rates, but BDI weakness signals weaker fundamental demand.' },
      { name: 'Commodity Traders', score: 75, posture: 'MONITOR', note: 'BDI as demand indicator — weakness suggests bulk commodity demand softness.' },
      { name: 'Importers / Retailers', score: 72, posture: 'MONITOR', note: 'Elevated container rates adding to landed cost of imported goods.' },
      { name: 'Energy Traders', score: 68, posture: 'MONITOR', note: 'Tanker rates and VLCC demand reflect crude trade patterns — watch for geo-risk freight premium.' },
      { name: 'Consumers', score: 60, posture: 'MONITOR', note: 'Higher shipping costs feed into consumer goods inflation with a 6-12 week lag.' },
    ],
    holderScenario: { posture: 'WAIT', conviction: 'Low', risk: 'High', watch: 'BDI weekly trend + Red Sea security situation + China import data', invalidation: 'Commodity demand surge (China stimulus) or acute supply crunch in bulk shipping markets' },
    consumerImpact: 'Freight market stress feeds into consumer prices with a 6-12 week lag. Elevated container freight rates (driven by Red Sea re-routing) add to the cost of imported goods — electronics, clothing, and manufactured goods.',
    connected: { affects: ['Crude Oil (tanker demand)', 'Coal (bulk shipping)', 'Wheat (grain shipping)', 'Aluminum (bulk trade)'], affectedBy: ['Global trade volume', 'Red Sea security situation', 'Fuel oil / bunker costs', 'China import demand'], correlations: ['+0.72 with Global Trade Volume', '+0.65 with Crude tanker demand', '-0.55 with Consumer goods inflation lag'] },
    watchlist: [
      { trigger: 'BDI drops below 1,500 or spikes above 3,000', why: 'Extreme levels signal demand shock or acute supply crunch in bulk commodity shipping.', who: 'Commodity Traders, Logistics, Consumers' },
      { trigger: 'Red Sea security normalization announced', why: 'Container re-routing adds $500-$1000/TEU — normalization deflates container rates quickly.', who: 'Importers, Retailers, Consumers' },
      { trigger: 'China commodity import data (monthly)', why: 'China is 50%+ of global bulk demand — import data drives BDI direction.', who: 'Commodity Traders, Shipping Companies' },
      { trigger: 'VLCC tanker rate spike', why: 'Crude tanker stress signals tight crude market or geo-risk shipping premium.', who: 'Energy Traders, Crude Holders' },
    ],
    businessImpact: [
      { sector: 'Global Trade / Importers', impact: 'High', costPressure: 'High', watch: 'Container spot rate + BDI weekly reading' },
      { sector: 'Retail / Consumer Goods', impact: 'Moderate', costPressure: 'Moderate', watch: 'Landed cost inflation vs consumer demand' },
      { sector: 'Commodity Trading', impact: 'Moderate', costPressure: 'Moderate', watch: 'BDI as global demand barometer' },
      { sector: 'Energy (Tanker Market)', impact: 'Moderate', costPressure: 'Low', watch: 'VLCC rate + crude flow patterns' },
    ],
  },
};

function buildGenericProfile(signalId, label) {
  const genericMap = {
    'silver':           { stance: 'Dual-Use — Safe-Haven + Solar Industrial', thesis: `Silver trades on a dual narrative: safe-haven demand mirrors gold's geo-risk bid while solar panel industrial demand provides a structural floor. The gold/silver ratio suggests silver is relatively undervalued vs gold at current levels.`, posture: 'HOLD', conviction: 'Moderate', riskScore: 60 },
    'copper':           { stance: 'Industrial Demand Weakness — China Risk', thesis: `Copper is facing headwinds from China and EM demand weakness. As the bellwether of global industrial activity, copper weakness signals broader economic slowdown risk. Watch Chinese manufacturing PMI as the key demand catalyst.`, posture: 'REDUCE', conviction: 'Moderate', riskScore: 70 },
    'wheat':            { stance: 'Black Sea Risk + Demand Stable', thesis: `Wheat is elevated from Black Sea supply risk and weather disruptions. Demand remains stable but supply volatility from Ukraine/Russia conflict remains the key risk factor for global grain markets and food inflation.`, posture: 'HOLD', conviction: 'Moderate', riskScore: 65 },
    'coal':             { stance: 'Transition Headwind — Policy Pressure', thesis: `Coal faces structural decline from energy transition policy while near-term demand remains in Asia. EU coal phase-out and US regulations create a long-term structural bear case despite short-term Asian demand support.`, posture: 'REDUCE', conviction: 'High', riskScore: 72 },
    'carbon':           { stance: 'Policy-Driven — Watch ETS Reform', thesis: `Carbon credits are a policy asset — price determined by EU ETS cap tightening and energy transition policy. Higher carbon prices accelerate fuel switching from coal and gas to renewables, driving long-term demand growth.`, posture: 'HOLD', conviction: 'Moderate', riskScore: 55 },
    'aluminum':         { stance: 'Energy-Intensive — Power Cost Sensitivity', thesis: `Aluminum smelting is highly energy-intensive — high European power costs have forced smelter curtailments. China smelting recovery and power cost dynamics are the key price drivers for global aluminum markets.`, posture: 'MONITOR', conviction: 'Low', riskScore: 62 },
    'refined-products': { stance: 'Crack Spread Elevated — Margin Pressure', thesis: `Diesel and gasoline crack spreads remain elevated from refinery maintenance and capacity constraints. Consumers face direct pump price pressure while the logistics sector faces sustained margin headwinds.`, posture: 'HOLD', conviction: 'Moderate', riskScore: 68 },
    'power':            { stance: 'Grid Stable — Gas Price Sensitivity', thesis: `Power grids are stabilized by nuclear and renewable capacity growth. Gas-for-power demand sensitivity remains the key volatility driver. EU grid stability is significantly improved vs the 2022 crisis levels.`, posture: 'MONITOR', conviction: 'Low', riskScore: 50 },
    'renewables':       { stance: 'Structural Growth — Policy Tailwinds', thesis: `Renewables are on a structural growth path with record solar installations globally. Policy support (IRA, EU Green Deal) and falling costs create a long-term secular bull case despite short-term margin pressure from interest rates.`, posture: 'BUY', conviction: 'High', riskScore: 30 },
  };
  const g = genericMap[signalId] || { stance: 'Under Analysis', thesis: `${label} market conditions require monitoring. Watch key supply/demand fundamentals and policy developments.`, posture: 'MONITOR', conviction: 'Low', riskScore: 50 };
  return {
    stance: g.stance, thesis: g.thesis, posture: g.posture, conviction: g.conviction, riskScore: g.riskScore,
    drivers: [
      { name: 'Price Momentum', label: 'MIXED', color: '#7dbfff', desc: `Current ${label} price action shows mixed signals from global supply/demand balance.` },
      { name: 'Policy / Macro', label: 'NEUTRAL', color: '#9aa3b0', desc: `Macro and policy backdrop is neutral to slightly supportive for ${label}.` },
      { name: 'Demand', label: 'MODERATE', color: '#fac84a', desc: `Global demand for ${label} is steady with regional variations.` },
    ],
    stakeholders: [
      { name: `${label} Traders`, score: 75, posture: g.posture, note: `Active monitoring recommended given current ${label} market conditions.` },
      { name: 'Industrial Users', score: 65, posture: 'MONITOR', note: `${label} input cost sensitivity varies by sector — watch for cost pass-through.` },
      { name: 'Investors', score: 60, posture: g.posture, note: `${g.conviction} conviction posture on ${label} given current data signals.` },
    ],
    holderScenario: { posture: g.posture, conviction: g.conviction, risk: 'Moderate', watch: `Key ${label} supply/demand data releases and policy announcements`, invalidation: `Major structural shift in ${label} supply or demand fundamentals` },
    consumerImpact: `${label} impacts consumers indirectly through input cost chains. Monitor for secondary inflation effects and sector-specific cost pressures with a typical 4-8 week transmission lag.`,
    connected: { affects: [`Related ${label} downstream sectors`], affectedBy: ['Global demand', 'Supply dynamics', 'Policy decisions'], correlations: [] },
    watchlist: [
      { trigger: `Key ${label} price breakout above/below established range`, why: 'Signals regime change in supply/demand balance — watch for follow-through.', who: `${label} Traders and Related Industries` },
      { trigger: 'Major policy announcement affecting market structure', why: 'Policy is often the swing factor for this market.', who: 'Investors, Industry Participants' },
    ],
    businessImpact: [
      { sector: `${label} Industry`, impact: 'High', costPressure: 'Moderate', watch: `${label} price vs cost floor` },
    ],
  };
}

function resolveSignal(query) {
  const q = query.toLowerCase().trim();
  for (const [id, info] of Object.entries(SIGNAL_MAP)) {
    if (id === q || info.label.toLowerCase() === q) return id;
    if (info.aliases.some(a => q === a || q.includes(a) || a.includes(q))) return id;
  }
  return null;
}

// ── Colour helpers ─────────────────────────────────────────────────────────────
function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function directionFromChange(changePercent) {
  const pct = toNum(changePercent, 0);
  if (pct > 0.05) return 'up';
  if (pct < -0.05) return 'down';
  return 'flat';
}

function findSignalPrice(signalId, info, data) {
  const aliases = [signalId, info?.label, ...(info?.aliases || [])]
    .filter(Boolean)
    .map(v => String(v).toLowerCase());
  const pools = [
    ...(data?.tickerItems || []),
    ...(data?.crossMarketSignals || []),
    ...(data?.prices || []),
  ];
  return pools.find(item => {
    const haystack = [
      item?.id,
      item?.name,
      item?.label,
      item?.symbol,
      item?.ticker,
      item?.signalType,
      item?.commodity,
      item?.category,
    ].filter(Boolean).join(' ').toLowerCase();
    return aliases.some(alias => haystack.includes(alias));
  }) || null;
}

function buildDerivedPrice(signalId, info, data) {
  const bases = {
    'crude-oil': 82.4, 'natural-gas': 3.18, 'refined-products': 2.74,
    power: 94.2, renewables: 42.8, gold: 2365, silver: 31.24,
    copper: 4.52, wheat: 582.4, uranium: 86.4, lithium: 42.8,
    coal: 138.4, carbon: 64.2, aluminum: 2285, freight: 1842,
  };
  const related = [...(data?.tickerItems || []), ...(data?.crossMarketSignals || [])];
  const avgMove = related.length
    ? related.reduce((sum, item) => sum + toNum(item?.changePercent, 0), 0) / related.length
    : 0.4;
  const profileBias = {
    uranium: 1.8, aluminum: 0.6, freight: -1.4, lithium: -0.8,
    carbon: -1.1, renewables: 1.0, power: 0.5, 'refined-products': 0.9,
  }[signalId] ?? 0;
  const pct = Number((avgMove * 0.35 + profileBias).toFixed(2));
  const price = bases[signalId] ?? 50;
  return {
    name: info?.label || signalId,
    price,
    change: Number((price * pct / 100).toFixed(3)),
    changePercent: pct,
    direction: directionFromChange(pct),
    unit: signalId === 'freight' ? 'BDI / shipping index' : signalId === 'power' ? 'Power price index' : signalId === 'carbon' ? 'EUA / carbon index' : 'USD reference',
    currency: signalId === 'power' || signalId === 'carbon' ? '' : '$',
    source: 'GEI live-context proxy',
    sourceStatus: 'derived_from_live_context',
  };
}

function buildChartPoints(price, changePercent, signalId) {
  const base = Math.max(toNum(price, 50), 0.001);
  const pct = toNum(changePercent, 0) / 100;
  const amp = ({ freight: 0.035, uranium: 0.022, aluminum: 0.016, gold: 0.012, 'natural-gas': 0.028 }[signalId]) ?? 0.018;
  return Array.from({ length: 30 }, (_, i) => {
    const progress = i / 29;
    const wave = (((i % 6) - 2.5) / 2.5) * amp;
    const value = base * (1 - pct + pct * progress + wave);
    return { label: i === 29 ? 'Now' : `D-${29 - i}`, value: Number(value.toFixed(3)) };
  });
}

function normalizePriceSnapshot(raw, signalId, info, data) {
  const live = raw?.price != null ? raw : findSignalPrice(signalId, info, data);
  const base = live?.price != null ? live : buildDerivedPrice(signalId, info, data);
  const pct = toNum(base.changePercent, 0);
  const price = toNum(base.price, null);
  const change = base.change != null ? toNum(base.change, 0) : Number(((price || 0) * pct / 100).toFixed(3));
  const direction = base.direction || directionFromChange(pct);
  const chartPoints = base.chartPoints || base.sparkline || buildChartPoints(price, pct, signalId);
  const trends = base.trends || {
    intraday: Number(pct.toFixed(2)),
    '7D': Number((pct * 2.2).toFixed(2)),
    '30D': Number((pct * 5.4).toFixed(2)),
    '90D': Number((pct * 9).toFixed(2)),
    '1Y': Number((pct * 18).toFixed(2)),
  };
  return {
    name: base.name || info?.label || signalId,
    price,
    change,
    changePercent: pct,
    direction,
    unit: base.unit || 'USD reference',
    currency: base.currency ?? '$',
    source: base.source || 'GEI Data',
    sourceStatus: base.sourceStatus || (base.source ? 'live' : 'derived_from_live_context'),
    chartPoints,
    trends,
    volatility: base.volatility || (Math.abs(pct) >= 2 ? 'High' : Math.abs(pct) >= 0.7 ? 'Moderate' : 'Low'),
    momentum: base.momentum || (pct > 0.2 ? 'Bullish' : pct < -0.2 ? 'Bearish' : 'Neutral'),
    timeHorizon: base.timeHorizon || 'Intraday / 30D momentum composite',
  };
}

function formatPriceValue(snapshot) {
  if (snapshot?.price == null) return 'N/A';
  const value = Number(snapshot.price);
  const prefix = snapshot.currency === '' ? '' : (snapshot.currency || '$');
  if (!Number.isFinite(value)) return String(snapshot.price);
  const digits = value >= 10 ? 2 : 3;
  return `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function formatSigned(value, suffix = '%') {
  const n = toNum(value, 0);
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}${suffix}`;
}

function makeRecommendationSummary(holderScenario, stakeholderImpacts, signalLabel) {
  const posture = holderScenario?.posture || 'MONITOR';
  const trader = stakeholderImpacts.find(s => /trader|investor|miner|producer/i.test(s.name || ''));
  const business = stakeholderImpacts.find(s => /business|industrial|manufacturer|airline|utility|retail|logistics|shipping|importer/i.test(s.name || ''));
  const consumer = stakeholderImpacts.find(s => /consumer|household/i.test(s.name || ''));
  return {
    traders: { posture: trader?.posture || posture, summary: trader?.note || `Trade ${signalLabel} only around confirmed trigger levels; current posture is ${posture}.` },
    holders: { posture, summary: holderScenario?.watch ? `Maintain discipline around ${holderScenario.watch}.` : `Hold posture is ${posture} until the thesis is invalidated.` },
    businesses: { posture: business?.posture || (posture === 'BUY' ? 'HEDGE' : 'MONITOR'), summary: business?.note || `Track ${signalLabel} input-cost exposure and prepare hedges around volatility spikes.` },
    consumers: { posture: consumer?.posture || 'MONITOR', summary: consumer?.note || `Expect indirect price transmission if ${signalLabel} momentum persists.` },
  };
}

function normalizeBusinessImpact(items = []) {
  return items.map(item => {
    const impactText = item.impact || 'Moderate';
    const high = /high|negative/i.test(`${impactText} ${item.costPressure || ''}`);
    const low = /low|benefit/i.test(`${impactText} ${item.costPressure || ''}`);
    return {
      ...item,
      impact: impactText,
      costPressure: item.costPressure || (high ? 'High' : low ? 'Low' : 'Moderate'),
      demandImpact: item.demandImpact || (high ? 'Demand at risk' : low ? 'Supportive' : 'Mixed'),
      supplyRisk: item.supplyRisk || (high ? 'Elevated' : 'Watch'),
      marginImpact: item.marginImpact || (high ? 'Compression risk' : low ? 'Margin support' : 'Neutral to mixed'),
      watch: item.watch || 'Price momentum and policy headlines',
    };
  });
}

function normalizeAnalysis(raw, signalId, info, data) {
  const profile = LOCAL_PROFILES[signalId] || buildGenericProfile(signalId, info.label);
  const commodityIntel = getCommodityIntelligence(data, signalId);
  const holderScenario = {
    ...profile.holderScenario,
    ...(raw?.holderScenario || {}),
    timeHorizon: raw?.holderScenario?.timeHorizon || profile.holderScenario?.timeHorizon || '2-8 week tactical horizon',
  };
  const stakeholderImpacts = raw?.stakeholderImpacts?.length ? raw.stakeholderImpacts : profile.stakeholders;
  const priceSnapshot = normalizePriceSnapshot(raw?.priceSnapshot, signalId, info, data);
  const businessSectorImpact = normalizeBusinessImpact(raw?.businessSectorImpact?.length ? raw.businessSectorImpact : profile.businessImpact);
  const recommendationSummary = raw?.recommendationSummary || makeRecommendationSummary(holderScenario, stakeholderImpacts, info.label);
  const relatedNews = commodityIntel.relatedIntelligence;
  const thesisNews = commodityIntel.thesisNews;
  const aiThesis = {
    ...commodityIntel.aiThesis,
    mainThesis: raw?.thesis || commodityIntel.aiThesis.mainThesis || profile.thesis,
    thesisNews,
  };
  const scenarioCases = raw?.scenarioCases || {
    bullish: `${info.label} confirms upside if momentum improves and the key watch trigger breaks in favor of supply tightness or stronger demand.`,
    neutral: `${info.label} remains range-bound while current drivers offset each other and volatility stays contained.`,
    bearish: `${info.label} weakens if ${holderScenario.invalidation || 'the current thesis is invalidated by a major supply or demand shift'}.`,
  };
  return {
    status: raw?.status || 'deterministic_generated',
    selectedSignal: raw?.selectedSignal || info.label,
    signalId,
    generatedAt: raw?.generatedAt || new Date().toISOString(),
    confidence: raw?.confidence ?? 78,
    stance: raw?.stance || profile.stance,
    thesis: raw?.thesis || commodityIntel.aiThesis.mainThesis || profile.thesis,
    aiThesis,
    priceSnapshot,
    drivers: raw?.drivers?.length ? raw.drivers : profile.drivers,
    stakeholderImpacts,
    holderScenario,
    businessSectorImpact,
    consumerImpact: commodityIntel.consumerImpact,
    connectedCommodities: raw?.connectedCommodities || profile.connected,
    predictionInsight: raw?.predictionInsight || null,
    statisticalBenchmark: raw?.statisticalBenchmark || null,
    compoundSignals: raw?.compoundSignals || [],
    historicalAnalogue: raw?.historicalAnalogue || null,
    analystPattern: raw?.analystPattern || null,
    thesisNews,
    relatedNews,
    watchlist: commodityIntel.watchlist,
    recommendationSummary,
    scenarioCases,
    // ── V1 Rules + RAG structured fields ──────────────────────────────────────
    aiPosture:          raw?.analystPattern?.posture || holderScenario.posture || null,
    conviction:         raw?.analystPattern?.conviction || holderScenario.conviction || null,
    riskScore:          raw?.riskScore ?? null,
    whatChanged:        raw?.analystPattern?.whatChanged || null,
    whyItMatters:       raw?.analystPattern?.whyItMatters || null,
    invalidationSignal: raw?.analystPattern?.invalidation || holderScenario.invalidation || null,
    watchTriggers:      raw?.analystPattern?.watch || [],
    activeRules:        raw?.activeRules || [],
    ruleCount:          raw?.ruleCount ?? 0,
    newsDrivers:        raw?.newsDrivers || [],
    newsClassification: raw?.newsClassificationSummary || null,
    crossMarketConfirmations: raw?.crossMarketConfirmation || [],
    invalidationSignals: raw?.invalidationSignals || [],
    featureAttribution: raw?.featureAttribution || [],
    structuredPrediction: raw?.prediction || null,
    sourceTransparency: {
      analysisType: 'Deterministic analysis from current market data',
      ...(raw?.sourceTransparency || {}),
      model: raw?.sourceTransparency?.model || 'GEI-AI-v2.4',
      relatedNewsCount: relatedNews.length,
    },
  };
}

const POSTURE_COL = { HOLD: '#7dbfff', BUY: '#6edb9a', REDUCE: '#ff8f8f', HEDGE: '#fac84a', MONITOR: '#9aa3b0', WAIT: '#c79df7', SELL: '#ff6b6b', AVOID: '#ff4040' };
const POSTURE_BG  = { HOLD: 'rgba(88,166,255,0.1)', BUY: 'rgba(74,222,128,0.1)', REDUCE: 'rgba(255,107,107,0.1)', HEDGE: 'rgba(250,188,69,0.1)', MONITOR: 'rgba(134,144,160,0.08)', WAIT: 'rgba(199,157,247,0.1)', SELL: 'rgba(255,107,107,0.12)', AVOID: 'rgba(255,64,64,0.12)' };

function PostureChip({ posture, large }) {
  const col = POSTURE_COL[posture] || '#9aa3b0';
  const bg  = POSTURE_BG[posture]  || POSTURE_BG.MONITOR;
  if (large) {
    return (
      <span className="text-[13px] font-bold px-3 py-1 rounded border" style={{ color: col, background: bg, borderColor: `${col}55` }}>
        {posture}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded border" style={{ color: col, background: bg, borderColor: `${col}55` }}>
      {posture}
    </span>
  );
}

function SectionHeader({ num, title, icon }) {
  return (
    <div className="flex items-center gap-sm mb-md" style={{ borderBottom: '1px solid rgba(45,61,78,0.6)', paddingBottom: 8 }}>
      <span className="text-[10px] font-bold font-mono-data px-1.5 py-0.5 rounded shrink-0"
        style={{ color: '#7dbfff', background: 'rgba(88,166,255,0.12)', border: '1px solid rgba(88,166,255,0.3)' }}>{num}</span>
      {icon && <span className="text-base shrink-0">{icon}</span>}
      <h3 className="text-[11px] font-bold tracking-widest" style={{ color: '#a8c8e8' }}>{title}</h3>
    </div>
  );
}

function MiniSparkline({ direction = 'flat', points: rawPoints, width = 80, height = 24 }) {
  const col = direction === 'up' ? '#6edb9a' : direction === 'down' ? '#ff8f8f' : '#9aa3b0';
  const values = (rawPoints || []).map(p => toNum(p.value, null)).filter(v => v != null);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const points = values.length > 1
    ? values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 3 - ((v - min) / range) * (height - 6)}`).join(' ')
    : direction === 'up'
    ? '0,20 10,18 20,14 30,15 40,11 50,8 60,10 70,6 80,4'
    : direction === 'down'
    ? '0,4 10,6 20,8 30,7 40,12 50,14 60,13 70,18 80,20'
    : '0,12 10,11 20,13 30,11 40,12 50,11 60,13 70,12 80,12';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

function PriceChart({ snapshot }) {
  const direction = snapshot?.direction || 'flat';
  const col = direction === 'up' ? '#6edb9a' : direction === 'down' ? '#ff8f8f' : '#9aa3b0';
  const points = snapshot?.chartPoints || [];
  const values = points.map(p => toNum(p.value, null)).filter(v => v != null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 620;
  const h = 170;
  const line = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * w},${h - 18 - ((v - min) / range) * (h - 34)}`).join(' ');
  const area = values.length > 1 ? `0,${h - 12} ${line} ${w},${h - 12}` : '';
  return (
    <div className="rounded-xl p-sm" style={{ background: 'rgba(8,18,28,0.75)', border: `1px solid ${col}25` }}>
      <div className="flex items-center justify-between mb-xs">
        <span className="text-[9px] font-bold tracking-widest text-outline">LIVE PRICE PATH</span>
        <span className="text-[9px] font-bold font-mono-data" style={{ color: col }}>{snapshot?.timeHorizon}</span>
      </div>
      <svg className="w-full h-[170px]" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`priceFill-${direction}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.25" />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map(i => (
          <line key={i} x1="0" x2={w} y1={18 + i * 40} y2={18 + i * 40} stroke="rgba(45,61,78,0.55)" strokeWidth="1" />
        ))}
        {area && <polygon points={area} fill={`url(#priceFill-${direction})`} />}
        {line && <polyline points={line} fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <div className="flex items-center justify-between text-[9px] text-outline font-mono-data">
        <span>{points[0]?.label || 'D-29'}</span>
        <span>RANGE {formatPriceValue({ ...snapshot, price: min })} - {formatPriceValue({ ...snapshot, price: max })}</span>
        <span>{points[points.length - 1]?.label || 'Now'}</span>
      </div>
    </div>
  );
}

function ConfidenceGauge({ value = 82 }) {
  const size = 80, r = 30, cx = 40, cy = 40;
  const toRad = d => d * Math.PI / 180;
  const polar = d => ({ x: cx + r * Math.cos(toRad(d)), y: cy + r * Math.sin(toRad(d)) });
  const bgStart = polar(150), bgEnd = polar(390);
  const bgPath = `M ${bgStart.x.toFixed(2)},${bgStart.y.toFixed(2)} A ${r},${r} 0 1 1 ${bgEnd.x.toFixed(2)},${bgEnd.y.toFixed(2)}`;
  const sweep = (value / 100) * 240;
  const valEnd = polar(150 + sweep);
  const valPath = sweep > 0.5 ? `M ${bgStart.x.toFixed(2)},${bgStart.y.toFixed(2)} A ${r},${r} 0 ${sweep > 180 ? 1 : 0} 1 ${valEnd.x.toFixed(2)},${valEnd.y.toFixed(2)}` : '';
  const col = value >= 85 ? '#ff8f8f' : value >= 70 ? '#fac84a' : '#7dbfff';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <path d={bgPath} fill="none" stroke="#1a2c3d" strokeWidth="7" strokeLinecap="round" />
      {valPath && <path d={valPath} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round" />}
      <text x={cx} y={cy + 4} textAnchor="middle" fill={col} fontSize="15" fontWeight="bold" fontFamily="IBM Plex Mono">{value}</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill="#5a7080" fontSize="6" fontFamily="IBM Plex Mono" letterSpacing="1">CONF</text>
    </svg>
  );
}

function RiskScoreBar({ value = 50 }) {
  const col = value >= 75 ? '#ff8f8f' : value >= 50 ? '#fac84a' : '#6edb9a';
  const label = value >= 75 ? 'HIGH' : value >= 50 ? 'MOD' : 'LOW';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-outline tracking-widest">RISK SCORE</span>
        <span className="text-[10px] font-bold" style={{ color: col }}>{label}</span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 6, background: '#1a2c3d' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: `linear-gradient(90deg, ${col}80, ${col})` }} />
      </div>
      <div className="text-[10px] font-mono-data font-bold mt-0.5" style={{ color: col }}>{value}/100</div>
    </div>
  );
}

function AnalysisLoading({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-xl">
      <div className="relative flex items-center justify-center mb-lg" style={{ width: 88, height: 88 }}>
        <div className="absolute rounded-full load-ring-a" style={{ width: 80, height: 80, border: '2px solid transparent', borderTopColor: 'rgba(199,157,247,0.7)', borderRightColor: 'rgba(199,157,247,0.2)' }} />
        <div className="absolute rounded-full load-ring-b" style={{ width: 58, height: 58, border: '2px solid transparent', borderTopColor: 'rgba(88,166,255,0.6)', borderLeftColor: 'rgba(88,166,255,0.15)' }} />
        <span className="text-[22px]">{SIGNAL_MAP[resolveSignal(label) || 'crude-oil']?.icon || '🔍'}</span>
      </div>
      <p className="text-[13px] font-bold" style={{ color: '#c79df7' }}>Generating analysis for <span style={{ color: '#e2e8f0' }}>{label}</span>…</p>
      <p className="text-[10px] text-outline mt-xs">Synthesizing price signals, geo-risk zones, and cross-market data</p>
    </div>
  );
}

// ── Left sidebar ──────────────────────────────────────────────────────────────
function SignalSidebar({ analysis, onChipClick, activeSignalId }) {
  return (
    <div className="flex flex-col gap-sm">
      {/* Energy signals */}
      <div className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.7)', border: '1px solid rgba(45,61,78,0.7)' }}>
        <p className="text-[9px] font-bold tracking-widest text-outline mb-sm">ENERGY SECTORS</p>
        <div className="space-y-0.5">
          {ENERGY_SIGNALS.map(id => {
            const info = SIGNAL_MAP[id];
            const isActive = activeSignalId === id;
            return (
              <button key={id} onClick={() => onChipClick(info.label)}
                className="w-full text-left flex items-center gap-xs px-sm py-xs rounded-lg transition-all text-[10px] font-bold"
                style={{
                  background: isActive ? 'rgba(162,201,255,0.12)' : 'transparent',
                  color: isActive ? '#a2c9ff' : '#6b7a8d',
                  border: `1px solid ${isActive ? 'rgba(162,201,255,0.4)' : 'transparent'}`,
                }}>
                <span>{info.icon}</span>
                <span className="truncate">{info.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cross-market signals */}
      <div className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.7)', border: '1px solid rgba(45,61,78,0.7)' }}>
        <p className="text-[9px] font-bold tracking-widest text-outline mb-sm">CROSS-MARKET</p>
        <div className="space-y-0.5">
          {XMARKET_SIGNALS.map(id => {
            const info = SIGNAL_MAP[id];
            const isActive = activeSignalId === id;
            return (
              <button key={id} onClick={() => onChipClick(info.label)}
                className="w-full text-left flex items-center gap-xs px-sm py-xs rounded-lg transition-all text-[10px] font-bold"
                style={{
                  background: isActive ? 'rgba(199,157,247,0.1)' : 'transparent',
                  color: isActive ? '#c79df7' : '#6b7a8d',
                  border: `1px solid ${isActive ? 'rgba(199,157,247,0.35)' : 'transparent'}`,
                }}>
                <span>{info.icon}</span>
                <span className="truncate">{info.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Analysis metadata (when loaded) */}
      {analysis && (
        <div className="rounded-xl p-sm space-y-sm" style={{ background: 'rgba(13,26,38,0.7)', border: '1px solid rgba(45,61,78,0.7)' }}>
          <p className="text-[9px] font-bold tracking-widest text-outline">CURRENT ANALYSIS</p>
          <div>
            <p className="text-[10px] text-outline mb-0.5">Signal</p>
            <p className="text-[11px] font-bold text-on-surface">{analysis.selectedSignal}</p>
          </div>
          <div>
            <p className="text-[10px] text-outline mb-0.5">Category</p>
            <p className="text-[10px] font-bold" style={{ color: SIGNAL_MAP[analysis.signalId]?.category === 'energy' ? '#a2c9ff' : '#c79df7' }}>
              {SIGNAL_MAP[analysis.signalId]?.category === 'energy' ? 'ENERGY' : 'CROSS-MARKET'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-outline mb-0.5">AI Confidence</p>
            <p className="text-[14px] font-bold font-mono-data text-on-surface">{analysis.confidence}%</p>
          </div>
          {analysis.stakeholderImpacts?.length > 0 && (
            <div>
              <p className="text-[10px] text-outline mb-xs">Posture</p>
              <PostureChip posture={analysis.holderScenario?.posture || 'MONITOR'} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Posture Decision Panel ──────────────────────────────────────────────────
function PostureDecisionPanel({ analysis }) {
  const { holderScenario = {}, confidence, selectedSignal, signalId } = analysis;
  const posture = holderScenario.posture || 'MONITOR';
  const col = POSTURE_COL[posture] || '#9aa3b0';
  const bg  = POSTURE_BG[posture]  || POSTURE_BG.MONITOR;
  const profile = LOCAL_PROFILES[signalId];
  const riskScore = profile?.riskScore ?? 50;

  const postureDesc = {
    BUY:     'Strong signal to enter or add to position. Fundamentals support upside thesis.',
    HOLD:    'Maintain current exposure. Conditions are supportive — no need to exit or chase.',
    REDUCE:  'Reduce position size. Headwinds building — take partial profits or trim risk.',
    HEDGE:   'Hedge existing exposure. Volatility is elevated — protect against adverse moves.',
    MONITOR: 'No clear edge. Monitor key triggers before committing capital in either direction.',
    WAIT:    'Stand aside. Trend unclear or oversupply/floor not yet confirmed. Wait for setup.',
    SELL:    'Exit position. Bearish thesis confirmed — move to cash or short side.',
    AVOID:   'Avoid new exposure. Structural headwinds or extreme risk conditions not worth taking.',
  }[posture] || 'Monitor this signal for regime-defining catalysts.';

  return (
    <div className="rounded-2xl p-md relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${bg} 0%, rgba(13,26,38,0.9) 60%)`, border: `1px solid ${col}40`, borderLeft: `4px solid ${col}` }}>
      <div className="flex items-start gap-md">
        <div className="shrink-0">
          <p className="text-[9px] font-bold tracking-widest text-outline mb-sm">AI POSTURE DECISION</p>
          <div className="text-[32px] font-bold font-mono-data leading-none" style={{ color: col }}>{posture}</div>
          <p className="text-[9px] font-bold tracking-widest mt-xs" style={{ color: `${col}aa` }}>
            {holderScenario.conviction?.toUpperCase() || 'MODERATE'} CONVICTION
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-on-surface leading-snug mb-sm">{postureDesc}</p>
          <div className="grid grid-cols-2 gap-sm">
            <div>
              <p className="text-[9px] text-outline tracking-widest mb-xs">RISK LEVEL</p>
              <p className="text-[11px] font-bold" style={{ color: (holderScenario.risk||'').includes('High') ? '#ff8f8f' : '#7dbfff' }}>
                {holderScenario.risk || 'Moderate'}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-outline tracking-widest mb-xs">AI CONFIDENCE</p>
              <p className="text-[11px] font-bold font-mono-data" style={{ color: col }}>{confidence}%</p>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <RiskScoreBar value={riskScore} />
        </div>
        <div className="shrink-0">
          <ConfidenceGauge value={confidence} />
        </div>
      </div>
      {holderScenario.watch && (
        <div className="mt-sm pt-sm" style={{ borderTop: '1px solid rgba(45,61,78,0.5)' }}>
          <span className="text-[9px] font-bold tracking-widest mr-sm" style={{ color: '#7dbfff' }}>WATCH:</span>
          <span className="text-[10px] text-on-surface-variant">{holderScenario.watch}</span>
        </div>
      )}
      {holderScenario.invalidation && (
        <div className="mt-xs">
          <span className="text-[9px] font-bold tracking-widest mr-sm" style={{ color: '#ff8f8f' }}>INVALIDATION:</span>
          <span className="text-[10px] text-on-surface-variant">{holderScenario.invalidation}</span>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AIAnalysisPage({ data, onFeedItemClick }) {
  const [query,    setQuery]    = useState('');
  const [inputVal, setInputVal] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState(null);
  const inputRef = useRef(null);

  const runAnalysis = useCallback(async (q) => {
    const signalId = resolveSignal(q);
    if (!signalId) return;
    const info = SIGNAL_MAP[signalId];
    setLoading(true);
    setQuery(q);
    setInputVal(info.label);
    setAnalysis(null);

    try {
      const payload = {
        query: q.toLowerCase(),
        prices:             data?.tickerItems          || [],
        geoRiskItems:       data?.geoRiskItems         || [],
        headlines:          data?.intelligenceFeed     || [],
        crossMarketSignals: data?.crossMarketSignals   || [],
        generatedRequestTime: new Date().toISOString(),
      };
      const res = await fetchSignalAnalysis(payload);
      if (res && res.thesis) {
        const normalized = normalizeAnalysis(res, signalId, info, data);
        setAnalysis(normalized);
        setStatus(normalized.status || 'deterministic_generated');
      } else {
        throw new Error('empty response');
      }
    } catch {
      const profile = LOCAL_PROFILES[signalId] || buildGenericProfile(signalId, info.label);
      const kws = info.aliases.concat([info.label.toLowerCase()]);
      const relatedNews = (data?.intelligenceFeed || []).filter(h =>
        kws.some(kw => (h.headline || h.title || '').toLowerCase().includes(kw))
      ).slice(0, 6);

      const fallbackAnalysis = normalizeAnalysis({
        status: 'local_fallback',
        selectedSignal: info.label,
        signalId,
        generatedAt: new Date().toISOString(),
        confidence: 78,
        stance: profile.stance,
        thesis: profile.thesis,
        drivers: profile.drivers,
        stakeholderImpacts: profile.stakeholders,
        holderScenario: profile.holderScenario,
        businessSectorImpact: profile.businessImpact,
        consumerImpact: profile.consumerImpact,
        connectedCommodities: profile.connected,
        relatedNews,
        watchlist: profile.watchlist,
        sourceTransparency: { analysisType: 'Local deterministic fallback', model: 'GEI-AI-v2.4' },
      }, signalId, info, data);
      setAnalysis(fallbackAnalysis);
      setStatus(fallbackAnalysis.status);
    } finally {
      setLoading(false);
    }
  }, [data]);

  // Load signal from sessionStorage only (set by CTA on other pages); always fresh on nav
  const didAutoRun = useRef(false);
  useEffect(() => {
    if (!didAutoRun.current) {
      didAutoRun.current = true;
      const selectedSignal = sessionStorage.getItem('gei:selectedSignal');
      if (selectedSignal) {
        sessionStorage.removeItem('gei:selectedSignal');
        runAnalysis(selectedSignal);
      }
    }
  }, [runAnalysis]);

  const handleSearch = useCallback((e) => {
    e?.preventDefault();
    if (inputVal.trim()) runAnalysis(inputVal.trim());
  }, [inputVal, runAnalysis]);

  const handleChip = useCallback((label) => {
    setInputVal(label);
    runAnalysis(label);
  }, [runAnalysis]);

  const activeSignalId = analysis?.signalId || null;

  const statusBadge = status === 'live_generated'
    ? { text: 'LIVE AI GENERATED', col: '#6edb9a', bg: 'rgba(74,222,128,0.1)' }
    : status === 'deterministic_generated'
    ? { text: 'GENERATED FROM CURRENT DATA', col: '#7dbfff', bg: 'rgba(88,166,255,0.1)' }
    : { text: 'LOCAL DETERMINISTIC', col: '#fac84a', bg: 'rgba(250,188,69,0.08)' };

  return (
    <div className="page-enter max-w-[1920px] mx-auto">

      {/* ── Page header ── */}
      <div className="px-lg py-md border-b border-outline-variant"
        style={{ background: 'linear-gradient(135deg, rgba(199,157,247,0.04) 0%, rgba(15,25,38,0) 60%)' }}>
        <div className="flex items-start justify-between flex-wrap gap-md mb-md">
          <div>
            <div className="flex items-center gap-sm mb-xs">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(199,157,247,0.12)', border: '1px solid rgba(199,157,247,0.3)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#c79df7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
                </svg>
              </div>
              <h1 className="text-[20px] font-bold text-on-surface tracking-tight">AI Analysis</h1>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                style={{ background: 'rgba(199,157,247,0.15)', color: '#c79df7', border: '1px solid rgba(199,157,247,0.3)' }}>
                WORKSPACE
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant max-w-xl">
              Select any energy or cross-market signal for deep AI-driven analysis — posture, drivers, stakeholder impact, and market connections.
            </p>
          </div>
          {analysis && (
            <div className="flex items-center gap-xs px-sm py-xs rounded border"
              style={{ background: statusBadge.bg, borderColor: `${statusBadge.col}40`, color: statusBadge.col }}>
              <div className="w-1.5 h-1.5 rounded-full live-dot shrink-0" style={{ background: statusBadge.col }} />
              <span className="text-[9px] font-bold font-mono-data">{statusBadge.text}</span>
            </div>
          )}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-sm mb-sm">
          <div className="flex-1 flex items-center gap-sm px-md py-sm rounded-xl"
            style={{ background: '#0f1922', border: '1px solid rgba(199,157,247,0.25)', maxWidth: 580 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#8b919d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input ref={inputRef} value={inputVal} onChange={e => setInputVal(e.target.value)}
              placeholder="Search crude oil, gold, uranium, diesel, power, freight..."
              className="flex-1 bg-transparent text-[12px] text-on-surface placeholder:text-outline focus:outline-none"
              style={{ fontFamily: 'inherit' }} />
            {inputVal && (
              <button type="button" onClick={() => { setInputVal(''); setAnalysis(null); }}
                className="text-outline hover:text-primary transition-colors shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            )}
          </div>
          <button type="submit"
            className="px-lg py-sm rounded-xl font-bold text-[11px] transition-all hover:brightness-110 shrink-0"
            style={{ background: 'rgba(199,157,247,0.15)', border: '1px solid rgba(199,157,247,0.4)', color: '#c79df7' }}>
            Analyze
          </button>
        </form>
      </div>

      {/* ── Main layout ── */}
      <div className="flex gap-0 min-h-[calc(100vh-220px)]">

        {/* Left sidebar */}
        <div className="hidden xl:block shrink-0 p-md border-r border-outline-variant/40"
          style={{ width: 200, background: '#0c1820' }}>
          <SignalSidebar analysis={analysis} onChipClick={handleChip} activeSignalId={activeSignalId} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 p-md">

          {loading && <AnalysisLoading label={inputVal} />}

          {!loading && !analysis && (
            <EmptyState onChipClick={handleChip} />
          )}

          {!loading && analysis && (
            <AnalysisOutput analysis={analysis} onFeedItemClick={onFeedItemClick} />
          )}
        </div>
      </div>

    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({ onChipClick }) {
  return (
    <div className="space-y-lg">
      {/* Hero */}
      <div className="text-center py-lg">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-lg"
          style={{ background: 'rgba(199,157,247,0.08)', border: '1px solid rgba(199,157,247,0.2)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="#c79df7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <h3 className="text-[20px] font-bold text-on-surface mb-xs">Select a Signal to Analyze</h3>
        <p className="text-[12px] text-on-surface-variant max-w-lg mx-auto leading-relaxed">
          Choose any energy sector or cross-market signal below for AI-driven posture analysis, stakeholder impact assessment, and connected market mapping.
        </p>
      </div>

      {/* Energy sector grid */}
      <div>
        <p className="text-[10px] font-bold tracking-widest text-outline mb-md">⚡ ENERGY SECTORS</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-sm">
          {ENERGY_SIGNALS.map(id => {
            const info = SIGNAL_MAP[id];
            return (
              <button key={id} onClick={() => onChipClick(info.label)}
                className="p-md rounded-xl text-left transition-all hover:scale-[1.02] group"
                style={{ background: 'rgba(13,26,38,0.7)', border: '1px solid rgba(45,61,78,0.8)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(162,201,255,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(45,61,78,0.8)'}>
                <span className="text-[28px] block mb-sm">{info.icon}</span>
                <p className="text-[11px] font-bold text-on-surface group-hover:text-primary transition-colors">{info.label}</p>
                <p className="text-[9px] text-outline mt-0.5 uppercase tracking-widest">Energy</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cross-market grid */}
      <div>
        <p className="text-[10px] font-bold tracking-widest text-outline mb-md">🔗 CROSS-MARKET SIGNALS</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-sm">
          {XMARKET_SIGNALS.map(id => {
            const info = SIGNAL_MAP[id];
            return (
              <button key={id} onClick={() => onChipClick(info.label)}
                className="p-md rounded-xl text-left transition-all hover:scale-[1.02] group"
                style={{ background: 'rgba(13,26,38,0.7)', border: '1px solid rgba(45,61,78,0.8)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(199,157,247,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(45,61,78,0.8)'}>
                <span className="text-[28px] block mb-sm">{info.icon}</span>
                <p className="text-[11px] font-bold text-on-surface group-hover:text-[#c79df7] transition-colors">{info.label}</p>
                <p className="text-[9px] text-outline mt-0.5 uppercase tracking-widest">Cross-Market</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Active Rules Panel ────────────────────────────────────────────────────────
function ActiveRulesPanel({ rules }) {
  if (!rules || rules.length === 0) return null;
  const dirCol = d => d === 'bullish' ? '#6edb9a' : d === 'bearish' ? '#ff8f8f' : '#7dbfff';
  const impactCol = l => l === 'Critical' ? '#ff6b6b' : l === 'High' ? '#ff8f8f' : l === 'Moderate' ? '#fac84a' : '#9aa3b0';
  return (
    <div>
      <div className="flex items-center gap-sm mb-sm">
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: 'rgba(110,219,154,0.12)', border: '1px solid rgba(110,219,154,0.3)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6edb9a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p className="text-[10px] font-bold tracking-widest" style={{ color: '#6edb9a' }}>RULE ENGINE — {rules.length} SIGNAL{rules.length !== 1 ? 'S' : ''} ACTIVE</p>
      </div>
      <div className="space-y-xs">
        {rules.map((rule, i) => (
          <div key={rule.signalId || i} className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.6)', border: `1px solid ${dirCol(rule.direction)}25`, borderLeft: `3px solid ${dirCol(rule.direction)}` }}>
            <div className="flex items-center gap-sm flex-wrap mb-xs">
              <span className="text-[11px] font-bold text-on-surface">{rule.signalName}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{ color: dirCol(rule.direction), background: `${dirCol(rule.direction)}12`, borderColor: `${dirCol(rule.direction)}40` }}>{(rule.direction || 'neutral').toUpperCase()}</span>
              {rule.impactLevel && <span className="text-[9px] font-bold" style={{ color: impactCol(rule.impactLevel) }}>{rule.impactLevel.toUpperCase()}</span>}
              {rule.confidence && <span className="text-[9px] font-mono-data text-outline">{rule.confidence}% conf</span>}
              {rule.recommendedPosture && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{ color: '#7dbfff', borderColor: 'rgba(88,166,255,0.3)', background: 'rgba(88,166,255,0.08)' }}>{rule.recommendedPosture}</span>}
            </div>
            <p className="text-[10px] text-on-surface-variant leading-snug">{rule.explanation}</p>
            {(rule.confirmationSignal || rule.invalidationSignal) && (
              <div className="flex gap-md mt-xs">
                {rule.confirmationSignal && <p className="text-[9px]"><span className="text-outline">Confirm: </span><span style={{ color: '#6edb9a' }}>{rule.confirmationSignal}</span></p>}
                {rule.invalidationSignal && <p className="text-[9px]"><span className="text-outline">Invalidate: </span><span style={{ color: '#ff8f8f' }}>{rule.invalidationSignal}</span></p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── News Classification Summary ────────────────────────────────────────────────
function NewsClassificationPanel({ summary, drivers }) {
  if (!summary && (!drivers || drivers.length === 0)) return null;
  const sentCol = s => s > 0.1 ? '#6edb9a' : s < -0.1 ? '#ff8f8f' : '#9aa3b0';
  const sc = summary?.sentimentScore ?? 0;
  return (
    <div className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid rgba(45,61,78,0.8)' }}>
      <p className="text-[9px] font-bold tracking-widest mb-sm" style={{ color: '#7dbfff' }}>NEWS CLASSIFICATION (AI ENGINE)</p>
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-xs mb-sm">
          {[
            ['SENTIMENT', sc > 0.05 ? 'Bullish' : sc < -0.05 ? 'Bearish' : 'Neutral', sentCol(sc)],
            ['TOP EVENT', summary.topEventType || 'Mixed', '#fac84a'],
            ['HIGH IMPACT', `${summary.highImpactCount || 0} articles`, summary.highImpactCount > 3 ? '#ff8f8f' : '#9aa3b0'],
            ['VOLUME', summary.newsVolume || `${summary.count || 0} items`, '#7dbfff'],
          ].map(([label, value, color]) => (
            <div key={label} className="rounded-lg px-xs py-1" style={{ background: 'rgba(8,18,28,0.5)', border: '1px solid rgba(45,61,78,0.65)' }}>
              <p className="text-[8px] text-outline tracking-widest">{label}</p>
              <p className="text-[10px] font-bold truncate" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}
      {drivers && drivers.length > 0 && (
        <div className="space-y-xs">
          <p className="text-[9px] text-outline tracking-widest">TOP CLASSIFIED HEADLINES</p>
          {drivers.slice(0, 4).map((d, i) => (
            <div key={i} className="flex items-start gap-xs">
              <span className="shrink-0 text-[9px] mt-0.5" style={{ color: '#7dbfff' }}>{i + 1}.</span>
              <p className="text-[10px] text-on-surface-variant leading-snug">{typeof d === 'string' ? d : d.headline || d.title || JSON.stringify(d)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Invalidation Signals Panel ─────────────────────────────────────────────────
function InvalidationPanel({ signals, primarySignal }) {
  const all = signals?.length ? signals : primarySignal ? [primarySignal] : [];
  if (!all.length) return null;
  return (
    <div className="rounded-xl p-sm" style={{ background: 'rgba(255,107,107,0.04)', border: '1px solid rgba(255,143,143,0.2)' }}>
      <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: '#ff8f8f' }}>THESIS INVALIDATION SIGNALS</p>
      <div className="space-y-xs">
        {all.slice(0, 4).map((sig, i) => (
          <div key={i} className="flex items-start gap-xs">
            <span className="shrink-0 mt-0.5 text-[9px]" style={{ color: '#ff8f8f' }}>✕</span>
            <p className="text-[10px] text-on-surface-variant leading-snug">{sig}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feature Attribution Panel ──────────────────────────────────────────────────
function FeatureAttributionPanel({ attribution }) {
  if (!attribution || attribution.length === 0) return null;
  return (
    <div className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid rgba(45,61,78,0.8)' }}>
      <p className="text-[9px] font-bold tracking-widest mb-sm" style={{ color: '#c79df7' }}>FEATURE ATTRIBUTION (AI DRIVER IMPORTANCE)</p>
      <div className="space-y-xs">
        {attribution.slice(0, 5).map((f, i) => {
          const col = f.direction === 'bullish' ? '#6edb9a' : f.direction === 'bearish' ? '#ff8f8f' : '#9aa3b0';
          const pct = Math.round((f.importance || 0) * 100);
          return (
            <div key={i} className="flex items-center gap-sm">
              <span className="text-[10px] text-on-surface-variant w-[160px] shrink-0 truncate">{f.feature}</span>
              <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: '#1a2c3d' }}>
                <div className="h-full rounded-full" style={{ width: `${pct * 3}%`, background: `linear-gradient(90deg, ${col}80, ${col})` }} />
              </div>
              <span className="text-[10px] font-mono-data shrink-0 w-8 text-right" style={{ color: col }}>{pct}%</span>
              <span className="text-[9px] text-outline shrink-0 w-14 text-right">{f.value != null ? `${f.value > 0 ? '+' : ''}${Number(f.value).toFixed(2)}` : '--'}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[8px] text-outline mt-xs">Deterministic importance ranking — SHAP values activate when ML model is loaded</p>
    </div>
  );
}

// ── Consumer Impact Sector Card ───────────────────────────────────────────────
function ConsumerSectorCard({ sector, isSelected = false, onClick }) {
  const impactColor =
    sector.impactLevel === 'Severe'   ? '#ff6b6b' :
    sector.impactLevel === 'High'     ? '#ff8f8f' :
    sector.impactLevel === 'Moderate' ? '#fac84a' : '#7dbfff';
  const dirSymbol = sector.direction === '↑' ? '▲' : sector.direction === '↓' ? '▼' : '→';
  return (
    <div
      className="rounded-xl p-sm flex flex-col gap-sm min-w-0 cursor-pointer transition-all"
      onClick={onClick}
      style={{
        background: isSelected ? 'rgba(13,26,38,0.88)' : 'rgba(13,26,38,0.6)',
        border: isSelected ? `2px solid ${impactColor}70` : `1px solid ${impactColor}25`,
        borderTop: `2px solid ${impactColor}`,
        boxShadow: isSelected ? `0 0 18px ${impactColor}18` : 'none',
      }}>
      <div className="flex items-start justify-between gap-xs">
        <h4 className="text-[11px] font-bold text-on-surface leading-tight">{sector.title}</h4>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-bold font-mono-data" style={{ color: impactColor }}>{dirSymbol}</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
            style={{ color: impactColor, background: `${impactColor}14`, borderColor: `${impactColor}45` }}>
            {sector.impactLevel}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {sector.drivers.map(d => (
          <span key={d} className="text-[8px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.22)', color: '#7dbfff' }}>
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-xs">
        {[
          ['LAG', sector.lag],
          ['PASS-THROUGH', sector.passThroughSpeed],
          ['DIRECT', sector.directImpact],
          ['INDIRECT', sector.indirectImpact],
        ].map(([label, val]) => (
          <div key={label} className="rounded-md px-xs py-1" style={{ background: 'rgba(8,18,28,0.5)', border: '1px solid rgba(45,61,78,0.6)' }}>
            <p className="text-[8px] text-outline tracking-widest">{label}</p>
            <p className="text-[9px] font-bold text-on-surface-variant leading-snug line-clamp-2">{val}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-on-surface-variant leading-snug">{sector.explanation}</p>
    </div>
  );
}

// ── Consumer Impact Left Panel (dynamic scoring) ──────────────────────────────
function ConsumerSelectedPanel({ sector }) {
  if (!sector) return null;
  // Use pre-computed score from normalizeConsumerImpactData, fallback to 50
  const score = sector.score ?? 50;
  const color = sector.impactLevel === 'Severe' ? '#ff6b6b' : sector.impactLevel === 'High' ? '#ff8f8f' : sector.impactLevel === 'Moderate' ? '#fac84a' : '#7dbfff';
  const dirLabel = sector.direction === '↑' ? 'RISING' : sector.direction === '↓' ? 'FALLING' : 'STABLE';
  const dirSymbol = sector.direction === '↑' ? '▲' : sector.direction === '↓' ? '▼' : '→';
  const explanation = sector.explanation_score || sector.explanation || '';
  // Arc gauge
  const size = 104; const r = 36; const cx = 52; const cy = 56;
  const toRad = d => d * Math.PI / 180;
  const polar = d => ({ x: cx + r * Math.cos(toRad(d)), y: cy + r * Math.sin(toRad(d)) });
  const bgStart = polar(150); const bgEnd = polar(390);
  const bgPath = `M ${bgStart.x.toFixed(1)},${bgStart.y.toFixed(1)} A ${r},${r} 0 1 1 ${bgEnd.x.toFixed(1)},${bgEnd.y.toFixed(1)}`;
  const sweep = (score / 100) * 240;
  const valEnd = polar(150 + sweep);
  const valPath = sweep > 0.5 ? `M ${bgStart.x.toFixed(1)},${bgStart.y.toFixed(1)} A ${r},${r} 0 ${sweep > 180 ? 1 : 0} 1 ${valEnd.x.toFixed(1)},${valEnd.y.toFixed(1)}` : '';
  return (
    <div className="rounded-xl p-sm flex flex-col items-center gap-sm"
      style={{ background: 'rgba(10,20,32,0.8)', border: `1px solid ${color}35`, borderTop: `3px solid ${color}`, minHeight: 360 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 mt-xs">
        <path d={bgPath} fill="none" stroke="#1a2c3d" strokeWidth="10" strokeLinecap="round" />
        {valPath && <path d={valPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" opacity="0.25" />}
        {valPath && <path d={valPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="22" fontWeight="700" fontFamily="IBM Plex Mono, monospace">{score}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#5a7080" fontSize="7" fontFamily="IBM Plex Mono, monospace" letterSpacing="1.5">/ 100</text>
      </svg>
      <div className="text-center w-full">
        <p className="text-[8px] font-bold tracking-widest mb-1" style={{ color: '#7dbfff' }}>AI-WEIGHTED CONSUMER PASS-THROUGH SCORE</p>
        <h4 className="text-[12px] font-bold text-on-surface leading-tight mb-xs">{sector.title}</h4>
        <div className="flex items-center justify-center gap-xs">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
            style={{ color, background: `${color}14`, borderColor: `${color}45` }}>{sector.impactLevel}</span>
          <span className="text-[9px] font-bold font-mono-data" style={{ color }}>{dirSymbol} {dirLabel}</span>
        </div>
      </div>
      <div className="w-full space-y-1">
        {[
          ['PASS-THROUGH', sector.passThroughSpeed],
          ['LAG', sector.lag],
          ['DIRECT', sector.directImpact],
          ['INDIRECT', sector.indirectImpact],
        ].map(([label, val]) => (
          <div key={label} className="rounded-md px-xs py-1"
            style={{ background: 'rgba(8,18,28,0.5)', border: '1px solid rgba(45,61,78,0.6)' }}>
            <p className="text-[8px] text-outline tracking-widest">{label}</p>
            <p className="text-[9px] font-bold text-on-surface-variant leading-snug">{val}</p>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-on-surface-variant leading-snug w-full italic">{explanation}</p>
      <div className="flex flex-wrap gap-1 w-full">
        {(sector.drivers || []).map(d => (
          <span key={d} className="text-[8px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.22)', color: '#7dbfff' }}>
            {d}
          </span>
        ))}
      </div>
      <div className="w-full rounded-md px-xs py-1" style={{ background: 'rgba(88,166,255,0.05)', border: '1px solid rgba(88,166,255,0.15)' }}>
        <p className="text-[8px] text-outline tracking-widest">SCORING BASIS</p>
        <p className="text-[8px] text-on-surface-variant leading-snug">direct(35%) + indirect(20%) + trend(15%) + inflation(15%) + lag-speed(10%) + AI conf(5%)</p>
      </div>
    </div>
  );
}

// ── Analysis Output ────────────────────────────────────────────────────────────
function AnalysisOutput({ analysis, onFeedItemClick }) {
  const {
    selectedSignal, signalId, generatedAt, confidence, stance,
    thesis, aiThesis = null, thesisNews = [], priceSnapshot, drivers = [], stakeholderImpacts = [],
    holderScenario = {}, businessSectorImpact = [], consumerImpact,
    connectedCommodities = {}, relatedNews = [], watchlist = [],
    sourceTransparency = {}, recommendationSummary = {}, scenarioCases = {},
    predictionInsight, statisticalBenchmark, compoundSignals = [], historicalAnalogue,
    // V1 Rules + RAG structured fields
    activeRules = [], ruleCount = 0,
    newsDrivers = [], newsClassification = null,
    invalidationSignal = null, invalidationSignals = [],
    crossMarketConfirmations = [],
    featureAttribution = [],
    whatChanged = null, whyItMatters = null,
  } = analysis;

  const info = SIGNAL_MAP[signalId] || {};
  const genTime = generatedAt ? new Date(generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const priceDir = priceSnapshot?.direction || 'flat';
  const priceCol = priceDir === 'up' ? '#6edb9a' : priceDir === 'down' ? '#ff8f8f' : '#9aa3b0';
  const thesisData = aiThesis || {};
  const thesisBlocks = [
    thesisData.whatChanged,
    thesisData.whyItMatters,
    thesisData.confirmation,
    thesisData.invalidation,
  ].filter(Boolean);
  const consumerData = typeof consumerImpact === 'object' ? consumerImpact : null;
  // Normalize: always 6 sectors with dynamic scores, prefer live data over fallback
  const normalizedConsumer = normalizeConsumerImpactData(consumerData, signalId);
  const consumerSectors = normalizedConsumer.sectors;
  const defaultConsumerSectorId = normalizedConsumer.highestImpactSector?.id || 'gasoline-pump';
  const [selectedConsumerSectorId, setSelectedConsumerSectorId] = useState(() => defaultConsumerSectorId);
  useEffect(() => { setSelectedConsumerSectorId(defaultConsumerSectorId); }, [signalId]);
  const selectedConsumerSector = consumerSectors.find(s => s.id === selectedConsumerSectorId) || consumerSectors[0];
  const sentimentColor = (sentiment) => sentiment === 'bullish' ? '#6edb9a' : sentiment === 'bearish' ? '#ff8f8f' : '#9aa3b0';
  const directionColor = (direction) => direction === 'Bullish' ? '#6edb9a' : direction === 'Bearish' ? '#ff8f8f' : '#7dbfff';
  const urgencyColor = (urgency) => urgency === 'Critical' ? '#ff6b6b' : urgency === 'High' ? '#ff8f8f' : urgency === 'Medium' ? '#fac84a' : '#7dbfff';

  const obsPoints = (priceSnapshot?.chartPoints || []).map(p => toNum(p.value, null)).filter(v => v != null);
  const obsHi = obsPoints.length >= 2 ? Math.max(...obsPoints) : null;
  const obsLo = obsPoints.length >= 2 ? Math.min(...obsPoints) : null;
  const obsCur = obsHi != null ? toNum(priceSnapshot?.price, obsPoints[obsPoints.length - 1]) : null;
  const obsRangePct = (obsHi != null && obsHi > obsLo) ? Math.round(((obsCur - obsLo) / (obsHi - obsLo)) * 100) : null;
  const obsDistHi = obsHi ? ((obsCur - obsHi) / obsHi * 100).toFixed(1) : null;
  const obsDistLo = obsLo ? ((obsCur - obsLo) / obsLo * 100).toFixed(1) : null;
  const obsFmt = (v) => v >= 1000 ? v.toFixed(0) : v.toFixed(2);
  const obsSupport = obsLo ? (obsLo * 1.003).toFixed(2) : null;
  const obsResistance = obsHi ? (obsHi * 0.997).toFixed(2) : null;
  const obsBarCol = obsRangePct != null ? (obsRangePct > 60 ? '#6edb9a' : obsRangePct < 40 ? '#ff8f8f' : '#9aa3b0') : '#9aa3b0';
  const obsChgAbs = Math.abs(priceSnapshot?.changePercent || 0);
  const obsTrendStr = obsChgAbs >= 3 ? 'Strong' : obsChgAbs >= 1 ? 'Moderate' : 'Weak';
  const obsCur$ = priceSnapshot?.currency || '';

  return (
    <div className="space-y-md">

      {/* ── Signal hero bar ── */}
      <div className="rounded-2xl p-md"
        style={{ background: 'linear-gradient(135deg, rgba(199,157,247,0.06), rgba(15,25,38,0.8))', border: '1px solid rgba(199,157,247,0.2)' }}>
        <div className="flex items-center gap-md flex-wrap">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[22px] shrink-0"
            style={{ background: 'rgba(199,157,247,0.1)', border: '1px solid rgba(199,157,247,0.3)' }}>
            {info.icon || '📊'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-sm flex-wrap">
              <h2 className="text-[18px] font-bold text-on-surface">{selectedSignal}</h2>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                style={{ color: '#c79df7', background: 'rgba(199,157,247,0.1)', borderColor: 'rgba(199,157,247,0.4)' }}>
                {info.category === 'energy' ? 'ENERGY' : 'CROSS-MARKET'}
              </span>
            </div>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: '#fac84a' }}>{stance}</p>
          </div>
          {priceSnapshot?.price != null && (
            <div className="shrink-0 text-right rounded-xl px-sm py-xs" style={{ background: 'rgba(8,18,28,0.55)', border: `1px solid ${priceCol}30` }}>
              <p className="text-[18px] font-bold font-mono-data" style={{ color: priceCol }}>
                {formatPriceValue(priceSnapshot)}
              </p>
              {priceSnapshot.changePercent != null && (
                <p className="text-[10px] font-bold" style={{ color: priceCol }}>
                  {priceDir === 'up' ? '▲' : priceDir === 'down' ? '▼' : '→'} {Math.abs(priceSnapshot.changePercent).toFixed(1)}%
                </p>
              )}
              <p className="text-[9px] text-outline">{priceSnapshot.sourceStatus === 'live' ? `LIVE · ${priceSnapshot.source}` : 'LIVE SOURCE UNAVAILABLE FOR THIS SIGNAL'}</p>
            </div>
          )}
          <MiniSparkline direction={priceDir} points={priceSnapshot?.chartPoints} width={110} height={30} />
          <ConfidenceGauge value={confidence} />
          <div className="shrink-0 text-right">
            <p className="text-[9px] text-outline font-mono-data">Generated {genTime}</p>
            <p className="text-[9px] text-outline font-mono-data">GEI-AI-v2.4</p>
          </div>
        </div>
      </div>

      {/* ── AI Posture Decision (prominent, full width) ── */}
      <PostureDecisionPanel analysis={analysis} />

      <div>
        <SectionHeader num="00" title="RECOMMENDATION SUMMARY" icon="AI" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-sm">
          {[
            ['TRADERS', recommendationSummary.traders],
            ['HOLDERS', recommendationSummary.holders],
            ['BUSINESSES', recommendationSummary.businesses],
            ['CONSUMERS', recommendationSummary.consumers],
          ].map(([label, rec]) => {
            const posture = rec?.posture || 'MONITOR';
            const col = POSTURE_COL[posture] || '#9aa3b0';
            return (
              <div key={label} className="rounded-xl p-md min-h-[126px]" style={{ background: `linear-gradient(135deg, ${col}12, rgba(13,26,38,0.72))`, border: `1px solid ${col}35` }}>
                <div className="flex items-center justify-between mb-sm">
                  <p className="text-[9px] font-bold tracking-widest text-outline">{label}</p>
                  <PostureChip posture={posture} />
                </div>
                <p className="text-[10px] text-on-surface-variant leading-snug">{rec?.summary}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-sm">
        {[
          ['BULLISH CASE', scenarioCases.bullish, '#6edb9a'],
          ['NEUTRAL CASE', scenarioCases.neutral, '#7dbfff'],
          ['BEARISH CASE', scenarioCases.bearish, '#ff8f8f'],
        ].map(([label, text, col]) => (
          <div key={label} className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.62)', border: `1px solid ${col}35`, borderTop: `3px solid ${col}` }}>
            <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: col }}>{label}</p>
            <p className="text-[10px] text-on-surface-variant leading-snug">{text}</p>
          </div>
        ))}
      </div>

      {/* ── Thesis + Drivers (2-col) ── */}
      {(predictionInsight || statisticalBenchmark || historicalAnalogue) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-sm">
          {predictionInsight && (
            <div className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.62)', border: '1px solid rgba(88,166,255,0.25)' }}>
              <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: '#7dbfff' }}>PREDICTION RANGE</p>
              <div className="grid grid-cols-3 gap-xs">
                {[
                  ['P10', predictionInsight.p10BearishForecast, '#ff8f8f'],
                  ['P50', predictionInsight.p50BaseForecast, '#7dbfff'],
                  ['P90', predictionInsight.p90BullishForecast, '#fac84a'],
                ].map(([label, val, col]) => (
                  <div key={label} className="rounded-lg p-xs" style={{ background: 'rgba(8,18,28,0.5)', border: `1px solid ${col}35` }}>
                    <p className="text-[9px] text-outline">{label}</p>
                    <p className="text-[11px] font-bold font-mono-data" style={{ color: col }}>{val}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-on-surface-variant mt-xs">{predictionInsight.modelDisclosure}</p>
            </div>
          )}
          {statisticalBenchmark && (
            <div className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.62)', border: '1px solid rgba(250,188,69,0.25)' }}>
              <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: '#fac84a' }}>STATISTICAL REGIME</p>
              <p className="text-[12px] font-bold text-on-surface">{statisticalBenchmark.regime}</p>
              <p className="text-[10px] text-on-surface-variant mt-xs">Sigma {statisticalBenchmark.sigma} · volatility {statisticalBenchmark.volatilityRegime} · pass-through {statisticalBenchmark.passThroughLag}</p>
            </div>
          )}
          {historicalAnalogue && (
            <div className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.62)', border: '1px solid rgba(199,157,247,0.25)' }}>
              <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: '#c79df7' }}>HISTORICAL ANALOGUE</p>
              <p className="text-[12px] font-bold text-on-surface">{historicalAnalogue.eventName}</p>
              <p className="text-[10px] text-on-surface-variant mt-xs">{historicalAnalogue.keyLesson}</p>
            </div>
          )}
          {compoundSignals.length > 0 && (
            <div className="lg:col-span-3 rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.5)', border: '1px solid rgba(45,61,78,0.8)' }}>
              <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: '#7dbfff' }}>COMPOUND SIGNALS</p>
              <div className="flex gap-xs flex-wrap">
                {compoundSignals.map(s => (
                  <span key={s.id} className="text-[10px] font-bold px-2 py-1 rounded border" style={{ color: '#fac84a', background: 'rgba(250,188,69,0.08)', borderColor: 'rgba(250,188,69,0.25)' }}>
                    {s.id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── V1 Rule Engine Active Signals ── */}
      {activeRules.length > 0 && (
        <div>
          <SectionHeader num="00b" title="RULE ENGINE SIGNALS" icon="⚙️" />
          <ActiveRulesPanel rules={activeRules} />
        </div>
      )}

      {/* ── What Changed / Why It Matters ── */}
      {(whatChanged || whyItMatters) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
          {whatChanged && (
            <div className="rounded-xl p-sm" style={{ background: 'rgba(250,188,74,0.05)', border: '1px solid rgba(250,188,74,0.2)', borderLeft: '3px solid rgba(250,188,74,0.6)' }}>
              <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: '#fac84a' }}>WHAT CHANGED</p>
              <p className="text-[11px] text-on-surface-variant leading-snug">{whatChanged}</p>
            </div>
          )}
          {whyItMatters && (
            <div className="rounded-xl p-sm" style={{ background: 'rgba(88,166,255,0.05)', border: '1px solid rgba(88,166,255,0.2)', borderLeft: '3px solid rgba(88,166,255,0.5)' }}>
              <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: '#7dbfff' }}>WHY IT MATTERS</p>
              <p className="text-[11px] text-on-surface-variant leading-snug">{whyItMatters}</p>
            </div>
          )}
        </div>
      )}

      {/* ── News Classification + Invalidation ── */}
      {(newsClassification || newsDrivers.length > 0 || invalidationSignals.length > 0 || invalidationSignal) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-sm">
          <NewsClassificationPanel summary={newsClassification} drivers={newsDrivers} />
          <InvalidationPanel signals={invalidationSignals} primarySignal={invalidationSignal} />
        </div>
      )}

      {/* ── Feature Attribution ── */}
      {featureAttribution.length > 0 && (
        <FeatureAttributionPanel attribution={featureAttribution} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] gap-md">

        {/* Thesis */}
        <div>
          <SectionHeader num="01" title="AI THESIS" icon="🧠" />
          <div className="rounded-xl p-md h-full space-y-sm"
            style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid rgba(88,166,255,0.2)', borderLeft: '3px solid rgba(88,166,255,0.6)' }}>
            <p className="text-[14px] text-on-surface leading-relaxed font-semibold">&ldquo;{thesisData.mainThesis || thesis}&rdquo;</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-xs">
              {[
                ['MARKET BIAS', thesisData.marketBias || stance],
                ['AI CONFIDENCE', `${thesisData.confidenceScore || confidence}%`],
                ['RISK LEVEL', thesisData.riskLevel || holderScenario.risk || 'Moderate'],
                ['TIME HORIZON', thesisData.timeHorizon || holderScenario.timeHorizon || '2-8 weeks'],
                ['SUPPORTING SIGNALS', (thesisData.supportingSignals || []).slice(0, 2).join(' + ') || drivers[0]?.name],
                ['KEY RISKS', (thesisData.keyRisks || []).slice(0, 2).join(' + ') || holderScenario.invalidation],
              ].map(([label, text]) => (
                <div key={label} className="rounded-lg p-xs" style={{ background: 'rgba(8,18,28,0.48)', border: '1px solid rgba(45,61,78,0.65)' }}>
                  <p className="text-[9px] text-outline tracking-widest font-bold mb-0.5">{label}</p>
                  <p className="text-[10px] text-on-surface-variant leading-snug line-clamp-2">{text}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-xs">
              {thesisBlocks.map(block => {
                const col = directionColor(block.direction);
                return (
                  <div key={block.title} className="rounded-lg p-sm" style={{ background: 'rgba(8,18,28,0.5)', border: `1px solid ${col}30` }}>
                    <div className="flex items-center justify-between gap-xs mb-xs">
                      <p className="text-[10px] text-on-surface font-bold tracking-widest">{block.title.toUpperCase()}</p>
                      <div className="flex items-center gap-xs">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{ color: col, background: `${col}12`, borderColor: `${col}40` }}>{block.direction}</span>
                        <span className="text-[9px] font-mono-data text-outline">{block.confidence}%</span>
                      </div>
                    </div>
                    {(block.explanation || []).slice(0, 2).map((line, i) => (
                      <p key={i} className="text-[10px] text-on-surface-variant leading-snug mb-1">{line}</p>
                    ))}
                    <p className="text-[9px] font-bold mt-xs" style={{ color: '#7dbfff' }}>Signal: <span className="font-normal text-on-surface-variant">{block.supportingSignal}</span></p>
                  </div>
                );
              })}
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-widest text-outline mb-xs">LATEST NEWS DRIVING THIS THESIS</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-xs">
                {(thesisData.thesisNews || thesisNews).slice(0, 3).map((item, i) => {
                  const col = sentimentColor(item.sentiment);
                  return (
                    <div key={item.id || i} className="rounded-lg p-xs" style={{ background: 'rgba(8,18,28,0.5)', border: `1px solid ${col}30` }}>
                      <div className="flex items-center gap-xs mb-xs">
                        <span className="text-[8px] font-bold px-1 py-0.5 rounded border" style={{ color: col, background: `${col}12`, borderColor: `${col}35` }}>{String(item.sentiment || 'neutral').toUpperCase()}</span>
                        <span className="text-[8px] text-outline font-mono-data">{item.priority || 'Medium'}</span>
                      </div>
                      <p className="text-[10px] font-bold text-on-surface leading-snug line-clamp-2">{item.headline}</p>
                      <p className="text-[9px] text-outline mt-1">{item.source} · {item.time}</p>
                      <p className="text-[9px] text-on-surface-variant mt-1 leading-snug line-clamp-2">{item.whyItMatters || item.summary}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Price Snapshot + Momentum */}
        <div>
          <SectionHeader num="02" title="PRICE & MOMENTUM SNAPSHOT" icon="📈" />
          <div className="rounded-xl p-md"
            style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid rgba(45,61,78,0.8)' }}>
            {priceSnapshot?.price != null ? (
              <div className="space-y-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-outline tracking-widest mb-xs">CURRENT PRICE</p>
                    <p className="text-[22px] font-bold font-mono-data" style={{ color: priceCol }}>
                      {formatPriceValue(priceSnapshot)}
                    </p>
                    <p className="text-[10px] text-outline">{priceSnapshot.unit}</p>
                    <p className="text-[9px] font-bold mt-xs" style={{ color: priceSnapshot.sourceStatus === 'live' ? priceCol : '#fac84a' }}>
                      {priceSnapshot.sourceStatus === 'live' ? `LIVE SOURCE · ${priceSnapshot.source}` : 'LIVE SOURCE UNAVAILABLE FOR THIS SIGNAL — derived from current market context'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-outline tracking-widest mb-xs">CHANGE</p>
                    <p className="text-[16px] font-bold font-mono-data" style={{ color: priceCol }}>
                      {priceDir === 'up' ? '▲' : priceDir === 'down' ? '▼' : '→'} {Math.abs(priceSnapshot.changePercent || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <PriceChart snapshot={priceSnapshot} />
                <div className="grid grid-cols-3 md:grid-cols-5 gap-xs mt-sm">
                  {Object.entries(priceSnapshot.trends || {}).map(([period, val]) => {
                    const c = val > 0 ? '#6edb9a' : val < 0 ? '#ff8f8f' : '#9aa3b0';
                    return (
                      <div key={period} className="text-center p-xs rounded"
                        style={{ background: 'rgba(13,26,38,0.5)', border: '1px solid rgba(45,61,78,0.6)' }}>
                        <p className="text-[9px] text-outline">{period}</p>
                        <p className="text-[11px] font-bold font-mono-data" style={{ color: c }}>
                          {formatSigned(val)}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-xs">
                  {[
                    ['MOMENTUM', priceSnapshot.momentum],
                    ['VOLATILITY', priceSnapshot.volatility],
                    ['HORIZON', priceSnapshot.timeHorizon],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg p-xs" style={{ background: 'rgba(8,18,28,0.55)', border: '1px solid rgba(45,61,78,0.7)' }}>
                      <p className="text-[9px] text-outline tracking-widest">{label}</p>
                      <p className="text-[10px] font-bold text-on-surface truncate">{value}</p>
                    </div>
                  ))}
                </div>
                {obsRangePct != null && (
                  <div className="space-y-xs pt-sm" style={{ borderTop: '1px solid rgba(45,61,78,0.6)' }}>
                    <p className="text-[9px] font-bold tracking-widest" style={{ color: '#5a7080' }}>RANGE OBSERVATIONS</p>
                    <div className="rounded-lg px-sm py-xs" style={{ background: 'rgba(8,18,28,0.5)', border: '1px solid rgba(45,61,78,0.65)' }}>
                      <div className="flex items-center justify-between text-[9px] text-outline mb-xs">
                        <span>LO: {obsCur$}{obsFmt(obsLo)}</span>
                        <span>RANGE POSITION: {obsRangePct}%</span>
                        <span>HI: {obsCur$}{obsFmt(obsHi)}</span>
                      </div>
                      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2c3d' }}>
                        <div style={{ width: `${obsRangePct}%`, background: `linear-gradient(90deg, ${obsBarCol}66, ${obsBarCol})`, height: '100%', borderRadius: 9999 }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-xs">
                      {[
                        ['DIST FROM HIGH', `${obsDistHi}%`,      parseFloat(obsDistHi) < 0 ? '#ff8f8f' : '#6edb9a'],
                        ['DIST FROM LOW',  `+${obsDistLo}%`,     '#6edb9a'],
                        ['SUPPORT',        `${obsCur$}${obsSupport}`,    '#7dbfff'],
                        ['RESISTANCE',     `${obsCur$}${obsResistance}`, '#fac84a'],
                        ['RANGE HIGH',     `${obsCur$}${obsFmt(obsHi)}`, '#6edb9a'],
                        ['RANGE LOW',      `${obsCur$}${obsFmt(obsLo)}`, '#ff8f8f'],
                      ].map(([lbl, val, obsCol]) => (
                        <div key={lbl} className="rounded-lg p-xs" style={{ background: 'rgba(8,18,28,0.5)', border: '1px solid rgba(45,61,78,0.65)' }}>
                          <p className="text-[9px] text-outline tracking-widest">{lbl}</p>
                          <p className="text-[11px] font-bold font-mono-data" style={{ color: obsCol }}>{val}</p>
                        </div>
                      ))}
                      <div className="rounded-lg p-xs" style={{ background: 'rgba(8,18,28,0.5)', border: '1px solid rgba(45,61,78,0.65)' }}>
                        <p className="text-[9px] text-outline tracking-widest">TREND STRENGTH</p>
                        <p className="text-[11px] font-bold" style={{ color: priceCol }}>{obsTrendStr}</p>
                      </div>
                      <div className="rounded-lg p-xs" style={{ background: 'rgba(8,18,28,0.5)', border: '1px solid rgba(45,61,78,0.65)' }}>
                        <p className="text-[9px] text-outline tracking-widest">WATCH TRIGGER</p>
                        <p className="text-[10px] font-bold text-on-surface truncate">
                          {priceDir === 'up' ? `Break above ${obsCur$}${obsResistance}` : `Hold above ${obsCur$}${obsSupport}`}
                        </p>
                      </div>
                      <div className="col-span-2 rounded-lg p-xs" style={{ background: 'rgba(8,18,28,0.5)', border: '1px solid rgba(45,61,78,0.65)' }}>
                        <p className="text-[9px] text-outline tracking-widest mb-xs">STATISTICAL NOTE</p>
                        <p className="text-[9px] text-on-surface-variant leading-snug">
                          Price at {obsRangePct}% of chart range.{' '}
                          {priceSnapshot.volatility === 'High' ? 'Elevated volatility - wider swings expected.' : 'Volatility contained - normal trading conditions.'}{' '}
                          Source: {priceSnapshot.sourceStatus === 'live' ? 'LIVE' : 'derived from context'}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-md">
                <MiniSparkline direction={priceDir} />
                <p className="text-[11px] font-bold mt-sm" style={{ color: '#fac84a' }}>Live source unavailable for this signal</p>
                <p className="text-[10px] text-outline mt-xs">Analysis continues using current live-market context until a direct feed resolves</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Drivers ── */}
      {drivers.length > 0 && (
        <div>
          <SectionHeader num="03" title="WHAT IS AFFECTING THIS SIGNAL?" icon="⚙️" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-sm">
            {drivers.map((d, i) => (
              <div key={i} className="rounded-xl p-md"
                style={{ background: 'rgba(13,26,38,0.7)', border: `1px solid ${d.color}30`, borderTop: `3px solid ${d.color}` }}>
                <div className="flex items-center justify-between mb-sm">
                  <p className="text-[11px] font-bold text-on-surface">{d.name}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ color: d.color, background: `${d.color}15`, border: `1px solid ${d.color}40` }}>{d.label}</span>
                </div>
                <p className="text-[10px] text-on-surface-variant leading-snug">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stakeholders ── */}
      {stakeholderImpacts.length > 0 && (
        <div>
          <SectionHeader num="04" title="WHO IS AFFECTED?" icon="👥" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-sm">
            {stakeholderImpacts.map((s, i) => {
              const sc = s.score;
              const col = sc >= 80 ? '#ff8f8f' : sc >= 65 ? '#fac84a' : '#7dbfff';
              const sevLabel = sc >= 80 ? 'HIGH' : sc >= 65 ? 'MOD' : 'LOW';
              return (
                <div key={i} className="rounded-xl p-sm flex gap-sm items-start"
                  style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid #2d3d4e' }}>
                  <div className="shrink-0 flex flex-col items-center gap-0.5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold font-mono-data text-[12px]"
                      style={{ background: `${col}15`, border: `2px solid ${col}55`, color: col }}>{sc}</div>
                    <span className="text-[9px] font-bold" style={{ color: col }}>{sevLabel}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-xs mb-xs flex-wrap">
                      <span className="text-[11px] font-bold text-on-surface">{s.name}</span>
                      <PostureChip posture={s.posture} />
                    </div>
                    <div className="rounded-full overflow-hidden mb-xs" style={{ height: 2, background: '#1a2c3d' }}>
                      <div className="h-full rounded-full" style={{ width: `${sc}%`, background: `linear-gradient(90deg, ${col}66, ${col})` }} />
                    </div>
                    <p className="text-[10px] text-on-surface-variant leading-snug">{s.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Business Sector Impact ── */}
      {businessSectorImpact.length > 0 && (
        <div>
          <SectionHeader num="05" title="BUSINESS SECTOR IMPACT" icon="🏭" />
          <div className="space-y-xs">
            {businessSectorImpact.map((b, i) => {
              const impactCol = (b.impact || '').toLowerCase().includes('high') ? '#ff8f8f' : (b.impact || '').toLowerCase().includes('moderate') ? '#fac84a' : '#7dbfff';
              return (
                <div key={i} className="rounded-xl p-sm"
                  style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid #2d3d4e', borderLeft: `3px solid ${impactCol}55` }}>
                  <div className="flex items-center justify-between mb-xs">
                    <span className="text-[11px] font-bold text-on-surface">{b.sector}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                      style={{ color: impactCol, background: `${impactCol}15`, borderColor: `${impactCol}40` }}>{b.impact}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-xs">
                    {[
                      ['Cost', b.costPressure],
                      ['Demand', b.demandImpact],
                      ['Supply', b.supplyRisk],
                      ['Margin', b.marginImpact],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md px-xs py-1" style={{ background: 'rgba(8,18,28,0.45)', border: '1px solid rgba(45,61,78,0.55)' }}>
                        <p className="text-[9px] text-outline tracking-widest">{label}</p>
                        <p className="text-[10px] font-bold text-on-surface-variant truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-xs items-center mt-xs">
                    <span className="text-[9px] font-bold" style={{ color: '#7dbfff' }}>Watch:</span>
                    <span className="text-[10px] text-on-surface-variant truncate">{b.watch}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Consumer Impact Summary — 6 standardized sectors ── */}
      <div>
        <SectionHeader num="06" title="CONSUMER IMPACT SUMMARY" icon="🛒" />
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-sm">
          {/* Left: selected sector score panel */}
          <ConsumerSelectedPanel sector={selectedConsumerSector} />
          {/* Right: 6 clickable sector cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-xs">
            {consumerSectors.map(sector => (
              <ConsumerSectorCard
                key={sector.id}
                sector={sector}
                isSelected={sector.id === selectedConsumerSectorId}
                onClick={() => setSelectedConsumerSectorId(sector.id)}
              />
            ))}
          </div>
        </div>
        {consumerData && (
          <div className="mt-sm rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.5)', border: '1px solid rgba(250,188,69,0.2)', borderLeft: '3px solid rgba(250,188,69,0.5)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-xs mb-sm">
              {[
                ['IMPACT SCORE', consumerData.impactScore, '#fac84a'],
                ['DIRECT IMPACT', consumerData.directImpact, '#7dbfff'],
                ['INDIRECT IMPACT', consumerData.indirectImpact, '#fac84a'],
                ['INFLATION PRESSURE', consumerData.inflationPressure, '#ff8f8f'],
              ].map(([label, value, col]) => (
                <div key={label} className="rounded-lg p-xs" style={{ background: 'rgba(8,18,28,0.5)', border: `1px solid ${col}30` }}>
                  <p className="text-[9px] text-outline tracking-widest">{label}</p>
                  <p className="text-[10px] font-bold line-clamp-2" style={{ color: col }}>{value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg p-sm" style={{ background: 'rgba(8,18,28,0.45)', border: '1px solid rgba(45,61,78,0.65)' }}>
              <p className="text-[9px] font-bold tracking-widest text-outline mb-xs">COST TRANSMISSION FLOW</p>
              <div className="flex flex-wrap items-center gap-xs">
                {(consumerData.transmissionFlow || []).map((step, i, arr) => (
                  <div key={step} className="flex items-center gap-xs">
                    <span className="text-[9px] px-2 py-1 rounded border text-on-surface-variant" style={{ borderColor: 'rgba(125,191,255,0.3)', background: 'rgba(125,191,255,0.06)' }}>{step}</span>
                    {i < arr.length - 1 && <span className="text-outline">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Watchlist ── */}
      {watchlist.length > 0 && (
        <div>
          <SectionHeader num="07" title="WATCHLIST" icon="👁️" />
          <div className="space-y-xs">
            {watchlist.map((item, i) => (
              <div key={i} className="rounded-xl p-sm"
                style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid rgba(45,61,78,0.8)' }}>
                <p className="text-[11px] font-bold text-on-surface mb-xs">{item.trigger}</p>
                <p className="text-[10px] text-on-surface-variant leading-snug">{item.why}</p>
                {item.who && <p className="text-[9px] text-outline mt-xs">Affects: {item.who}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cross-Market Connections ── */}
      {(connectedCommodities?.affects?.length > 0 || connectedCommodities?.affectedBy?.length > 0) && (
        <div>
          <SectionHeader num="08" title="CROSS-MARKET CONNECTIONS" icon="🔗" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
            {connectedCommodities.affects?.length > 0 && (
              <div className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid rgba(110,219,154,0.2)', borderTop: '2px solid rgba(110,219,154,0.5)' }}>
                <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: '#6edb9a' }}>THIS SIGNAL AFFECTS</p>
                <div className="space-y-xs">
                  {connectedCommodities.affects.map((a, i) => <p key={i} className="text-[10px] text-on-surface-variant">{a}</p>)}
                </div>
              </div>
            )}
            {connectedCommodities.affectedBy?.length > 0 && (
              <div className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid rgba(255,143,143,0.2)', borderTop: '2px solid rgba(255,143,143,0.5)' }}>
                <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: '#ff8f8f' }}>AFFECTED BY</p>
                <div className="space-y-xs">
                  {connectedCommodities.affectedBy.map((a, i) => <p key={i} className="text-[10px] text-on-surface-variant">{a}</p>)}
                </div>
              </div>
            )}
            {connectedCommodities.correlations?.length > 0 && (
              <div className="rounded-xl p-sm" style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid rgba(125,191,255,0.2)', borderTop: '2px solid rgba(125,191,255,0.5)' }}>
                <p className="text-[9px] font-bold tracking-widest mb-xs" style={{ color: '#7dbfff' }}>CORRELATIONS</p>
                <div className="space-y-xs">
                  {connectedCommodities.correlations.map((c, i) => <p key={i} className="text-[10px] font-mono-data text-on-surface-variant">{c}</p>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Related News ── */}
      {relatedNews.length > 0 && (
        <div>
          <SectionHeader num="09" title="RELATED NEWS" icon="📰" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-sm">
            {relatedNews.slice(0, 6).map((item, i) => {
              const col = item.sentiment === 'bullish' ? '#6edb9a' : item.sentiment === 'bearish' ? '#ff8f8f' : '#9aa3b0';
              return (
                <div key={i} className="rounded-xl p-sm cursor-pointer"
                  style={{ background: 'rgba(13,26,38,0.6)', border: `1px solid ${col}25` }}
                  onClick={() => onFeedItemClick?.(item)}>
                  <div className="flex items-center gap-xs mb-xs">
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded border"
                      style={{ color: col, background: `${col}12`, borderColor: `${col}35` }}>
                      {String(item.sentiment || 'neutral').toUpperCase()}
                    </span>
                    <span className="text-[8px] text-outline">{item.source} · {item.time}</span>
                  </div>
                  <p className="text-[10px] font-bold text-on-surface leading-snug line-clamp-2">{item.headline}</p>
                  <p className="text-[9px] text-on-surface-variant mt-1 leading-snug line-clamp-2">{item.summary}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Source Transparency ── */}
      {sourceTransparency && Object.keys(sourceTransparency).length > 0 && (
        <div className="rounded-xl p-sm" style={{ background: 'rgba(8,18,28,0.5)', border: '1px solid rgba(45,61,78,0.6)' }}>
          <p className="text-[9px] font-bold tracking-widest mb-sm text-outline">SOURCE TRANSPARENCY</p>
          <div className="flex flex-wrap gap-sm">
            {Object.entries(sourceTransparency).map(([key, val]) => (
              <div key={key} className="rounded-lg px-xs py-1"
                style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid rgba(45,61,78,0.7)' }}>
                <p className="text-[8px] text-outline">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</p>
                <p className="text-[9px] text-on-surface-variant">{String(val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
