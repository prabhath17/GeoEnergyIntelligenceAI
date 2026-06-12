'use strict';
/**
 * News Adapter — The Guardian → NewsAPI → GDELT → mock fallback.
 * Multiple sources ensure news is always live and latest.
 */
const https = require('https');

// ─── Classifiers ─────────────────────────────────────────────────────────────
function sector(t) {
  t = (t || '').toLowerCase();
  if (/\b(crude oil|wti|brent|opec|oil prices?|oil supply|oil demand|oil production|barrels?|tanker|petroleum)\b/.test(t)) return 'Crude Oil';
  if (/natural gas|lng|freeport|gas price|gas supply|gas storage/.test(t)) return 'Natural Gas';
  if (/diesel|gasoline|refin|crack spread|jet fuel|heating oil/.test(t)) return 'Refined Products';
  if (/power|electricity|grid|nuclear|generation/.test(t)) return 'Power';
  if (/solar|wind|renewable|hydro|green energy|lithium|battery/.test(t)) return 'Renewables';
  return 'Policy';
}
function region(t) {
  t = (t || '').toLowerCase();
  if (/hormuz|persian gulf|iran|uae|saudi|gulf/.test(t)) return 'Middle East';
  if (/russia|ukraine|eastern europe|moscow/.test(t)) return 'Eastern Europe';
  if (/red sea|suez|houthi|yemen/.test(t)) return 'Middle East / Africa';
  if (/libya|nigeria|west africa/.test(t)) return 'North Africa';
  if (/gulf coast|texas|usa|north america/.test(t)) return 'North America';
  if (/europe|eu |germany|france|uk |britain/.test(t)) return 'Europe';
  return 'Global';
}
function category(t) {
  t = (t || '').toLowerCase();
  if (/sanction|ban|restriction|policy|meeting|opec/.test(t)) return 'Policy';
  if (/attack|conflict|war|strike|military/.test(t)) return 'Geo Risk';
  if (/supply chain|shipment|tanker|route|transit|port/.test(t)) return 'Supply Chain';
  return 'Market Move';
}
function impact(t) {
  if (/critical|breaking|major|surge|plunge|spike|crisis|attack|disruption|emergency/i.test(t)) return 'High Impact';
  if (/minor|slight|marginal|routine|planned/i.test(t)) return 'Low Impact';
  return 'Medium Impact';
}
function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const m  = Math.floor(ms / 60000), h = Math.floor(m / 60);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min${m !== 1 ? 's' : ''} ago`;
  if (h < 24) return `${h} hour${h !== 1 ? 's' : ''} ago`;
  return `${Math.floor(h/24)} day${Math.floor(h/24) !== 1 ? 's' : ''} ago`;
}
function marketReadThrough(sec) {
  if (sec === 'Crude Oil') return 'Watch front-month crude spreads and tanker freight for confirmation.';
  if (sec === 'Natural Gas') return 'Watch LNG cargo diversions and storage changes.';
  if (sec === 'Refined Products') return 'Watch diesel and gasoline cracks and refinery utilization.';
  if (sec === 'Power') return 'Watch day-ahead power prices and interconnector flows.';
  if (sec === 'Renewables') return 'Watch curtailment and grid congestion.';
  return 'Watch price reaction and follow-on policy updates.';
}
function toItem(id, headline, src, ts, url) {
  const sec = sector(headline);
  const cat = category(headline);
  const reg = region(headline);
  return {
    id, impact: impact(headline), headline,
    source: src, url: url || '', time: timeAgo(ts), timestamp: ts,
    sector: sec, category: cat, region: reg,
    sentimentEffect: 'Neutral',
    whyItMatters: headline,
    context: `Live energy market signal from ${src}.`,
    marketReadThrough: marketReadThrough(sec),
    relatedRegions: reg === 'Global' ? [] : [reg],
    relatedSectors: sec === 'Policy' ? [] : [sec]
  };
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function httpsGetJSON(urlStr) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.get({
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      headers: { 'User-Agent': 'GeoEnergyIntelligenceAI/1.0' },
      timeout: 8000
    }, res => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { reject(new Error('invalid-json')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ─── The Guardian ─────────────────────────────────────────────────────────────
async function tryGuardian(apiKey) {
  const q   = 'oil OR gas OR energy OR OPEC OR crude OR refinery OR pipeline OR sanctions OR Hormuz';
  const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(q)}&section=business|environment|world&order-by=newest&page-size=20&show-fields=headline,trailText,webUrl&api-key=${apiKey}`;
  const data = await httpsGetJSON(url);
  const results = data?.response?.results;
  if (!Array.isArray(results) || !results.length) return null;
  const items = results
    .filter(a => a.webTitle && a.webTitle.length > 10)
    .slice(0, 15)
    .map((a, i) => toItem(
      `guardian-${i}-${Date.now()}`,
      a.fields?.headline || a.webTitle,
      'The Guardian',
      a.webPublicationDate || new Date().toISOString(),
      a.webUrl
    ));
  if (!items.length) return null;
  console.log('[News] Source: The Guardian, items:', items.length);
  return { status: 'live', source: 'The Guardian', items };
}

// ─── NewsAPI ──────────────────────────────────────────────────────────────────
async function tryNewsAPI(apiKey) {
  const q   = 'crude oil OR WTI OR Brent OR OPEC OR natural gas OR LNG OR refinery OR energy sanctions OR Hormuz OR Red Sea';
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&apiKey=${apiKey}&language=en&sortBy=publishedAt&pageSize=20`;
  const data = await httpsGetJSON(url);
  if (data?.status !== 'ok' || !Array.isArray(data.articles) || !data.articles.length) return null;
  const items = data.articles
    .filter(a => a.title && a.title.length > 10 && !a.title.includes('[Removed]'))
    .slice(0, 15)
    .map((a, i) => toItem(
      `newsapi-${i}-${Date.now()}`,
      a.title,
      a.source?.name || 'NewsAPI',
      a.publishedAt || new Date().toISOString(),
      a.url
    ));
  if (!items.length) return null;
  console.log('[News] Source: NewsAPI, items:', items.length);
  return { status: 'live', source: 'NewsAPI', items };
}

// ─── GDELT ────────────────────────────────────────────────────────────────────
function gdeltDateToISO(s) {
  s = String(s || '');
  if (s.length === 14) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:${s.slice(12,14)}Z`;
  return new Date().toISOString();
}
async function tryGDELT() {
  const q   = 'oil energy crude OPEC gas refinery pipeline sanctions Hormuz';
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=20&format=json&timespan=24hours&sourcelang=english`;
  const data = await httpsGetJSON(url);
  if (!Array.isArray(data?.articles) || !data.articles.length) return null;
  const items = data.articles
    .filter(a => (a.title || a.url) && String(a.title || a.url).length > 10)
    .slice(0, 12)
    .map((a, i) => toItem(
      `gdelt-${i}-${Date.now()}`,
      a.title || a.url,
      a.domain || 'GDELT',
      gdeltDateToISO(a.seendate),
      a.url
    ));
  if (!items.length) return null;
  console.log('[News] Source: GDELT, items:', items.length);
  return { status: 'live', source: 'GDELT', items };
}

// ─── Mock fallback ────────────────────────────────────────────────────────────
const MOCK_ITEMS = [
  { id:'news-001', impact:'High Impact', headline:'Satellite imagery confirms sudden drop in Persian Gulf oil tanker throughput.', source:'GEI Signal-4', time:'14 mins ago', timestamp:new Date(Date.now()-14*6e4).toISOString(), sector:'Crude Oil', category:'Supply Chain', sentimentEffect:'Bullish', whyItMatters:'May indicate undeclared maintenance or tactical holding by regional producers.', context:'Could tighten near-term supply expectations.', relatedRegions:['Persian Gulf'], relatedSectors:['Crude Oil'] },
  { id:'news-002', impact:'High Impact', headline:'OPEC+ production meeting confirmed for July — agenda includes market share strategy.', source:'Policy Monitor', time:'20 mins ago', timestamp:new Date(Date.now()-20*6e4).toISOString(), sector:'Crude Oil', category:'Policy', sentimentEffect:'Volatile', whyItMatters:'Shift in production strategy signals structural change.', context:'Market pricing in increased uncertainty.', relatedRegions:['Middle East'], relatedSectors:['Crude Oil'] },
  { id:'news-003', impact:'Medium Impact', headline:'EU Energy Council concludes with no consensus on additional sanctions.', source:'Reuters Global', time:'1 hour ago', timestamp:new Date(Date.now()-6e4*60).toISOString(), sector:'Policy', category:'Geo Risk', sentimentEffect:'Neutral', whyItMatters:'Stabilizes near-term Natural Gas supply outlook for Central Europe.', context:'Next council meeting in 6 weeks.', relatedRegions:['Europe'], relatedSectors:['Natural Gas'] },
  { id:'news-004', impact:'High Impact', headline:'Gulf Coast refinery maintenance season begins — diesel output projected down 4%.', source:'Refinery Monitor', time:'35 mins ago', timestamp:new Date(Date.now()-35*6e4).toISOString(), sector:'Refined Products', category:'Supply Chain', sentimentEffect:'Bullish', whyItMatters:'Tighter diesel supply heading into summer.', context:'Crack spreads likely to widen.', relatedRegions:['North America'], relatedSectors:['Refined Products'] },
  { id:'news-005', impact:'Low Impact', headline:'Port of Rotterdam reports 2% increase in renewable feedstock arrivals.', source:'Logistics News', time:'4 hours ago', timestamp:new Date(Date.now()-4*36e5).toISOString(), sector:'Renewables', category:'Supply Chain', sentimentEffect:'Neutral', whyItMatters:'Long-term trend toward bio-diesel integration on track.', context:'Supports gradual renewable feedstock adoption.', relatedRegions:['Europe'], relatedSectors:['Renewables'] }
];

// ─── Main export ──────────────────────────────────────────────────────────────
async function fetchNews() {
  const t0  = Date.now();
  const gK  = process.env.GUARDIAN_API_KEY;
  const nK  = process.env.NEWS_API_KEY;

  // 1. The Guardian — best quality, no server-side restrictions
  if (gK) {
    const r = await tryGuardian(gK).catch(e => { console.warn('[News] Guardian failed:', e.message); return null; });
    if (r?.items?.length) return { ...r, latencyMs: Date.now() - t0, lastSync: new Date().toISOString() };
  }

  // 2. NewsAPI — good but may be restricted on free tier
  if (nK) {
    const r = await tryNewsAPI(nK).catch(e => { console.warn('[News] NewsAPI failed:', e.message); return null; });
    if (r?.items?.length) return { ...r, latencyMs: Date.now() - t0, lastSync: new Date().toISOString() };
  }

  // 3. GDELT — no key, always available
  const g = await tryGDELT().catch(e => { console.warn('[News] GDELT failed:', e.message); return null; });
  if (g?.items?.length) return { ...g, latencyMs: Date.now() - t0, lastSync: new Date().toISOString() };

  // 4. Mock fallback
  console.warn('[News] All live sources failed — using mock');
  return { status: 'mock', source: 'Internal Mock', items: MOCK_ITEMS, latencyMs: Date.now() - t0, lastSync: new Date().toISOString() };
}

module.exports = { fetchNews };
