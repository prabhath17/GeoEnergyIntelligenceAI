'use strict';
/**
 * Geo-Risk Adapter — derives risk scores from GDELT news, falls back to mock.
 */
const https = require('https');

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

// ─── Region templates ─────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id:'geo-001', countryOrArea:'Strait of Hormuz', region:'Middle East',
    coordinates:[26.5,56.5], eventType:'Shipping Chokepoint',
    affectedSectors:['Crude Oil','Refined Products','Natural Gas'],
    keywords:['hormuz','persian gulf','iran','tanker','strait'],
    baseScore: 9.2, baseLevel: 'Critical',
    marketImpact: 'Supply constraints could support Brent, diesel, and LNG-linked prices. +$5-8 volatility projected.',
    source: 'GEI Signal / Satellite Telemetry'
  },
  {
    id:'geo-002', countryOrArea:'Ukraine / Russia Transit', region:'Eastern Europe',
    coordinates:[50.0,30.5], eventType:'Transit Risk',
    affectedSectors:['Natural Gas','Power'],
    keywords:['russia','ukraine','gas transit','pipeline','moscow'],
    baseScore: 8.5, baseLevel: 'High',
    marketImpact: 'Gas transit uncertainty may increase European power price volatility. EU storage withdrawals accelerating.',
    source: 'Reuters Global / GeoRisk Monitor'
  },
  {
    id:'geo-003', countryOrArea:'Red Sea Transit', region:'Middle East / Africa',
    coordinates:[20.0,38.5], eventType:'Maritime Insurance Risk',
    affectedSectors:['Refined Products','Crude Oil'],
    keywords:['red sea','suez','houthi','yemen','shipping'],
    baseScore: 7.9, baseLevel: 'Moderate',
    marketImpact: 'Insurance premiums may raise shipping costs for refined product carriers.',
    source: "Lloyd's Intelligence / GeoRisk Monitor"
  },
  {
    id:'geo-004', countryOrArea:'Libya', region:'North Africa',
    coordinates:[27.0,17.0], eventType:'Production Disruption',
    affectedSectors:['Crude Oil'],
    keywords:['libya','sharara','noc','libyan'],
    baseScore: 7.4, baseLevel: 'High',
    marketImpact: 'Libyan field shutdowns reducing OPEC+ effective output and supporting Brent premium.',
    source: 'GEI Signal-4'
  },
  {
    id:'geo-005', countryOrArea:'Gulf of Mexico / Gulf Coast', region:'North America',
    coordinates:[26.0,-91.0], eventType:'Refinery Outage',
    affectedSectors:['Refined Products','Crude Oil'],
    keywords:['gulf coast','texas','refinery','hurricane','maintenance'],
    baseScore: 6.1, baseLevel: 'Moderate',
    marketImpact: 'Seasonal refinery maintenance reducing diesel and gasoline output. Crack spreads widening.',
    source: 'Refinery Monitor'
  }
];

const MOCK_ITEMS = TEMPLATES.map((t, i) => ({
  ...t,
  riskScore: t.baseScore,
  riskLevel: t.baseLevel,
  isActive: true,
  timestamp: new Date(Date.now() - [14,60,240,120,360][i] * 6e4).toISOString()
}));

// ─── GDELT-derived scoring ────────────────────────────────────────────────────
async function tryGDELTDerived() {
  const q   = 'oil tanker attack shipping disruption refinery sanctions pipeline conflict energy';
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=25&format=json&timespan=2days&sourcelang=english`;
  const data = await httpsGetJSON(url);
  if (!Array.isArray(data?.articles) || !data.articles.length) return null;
  const corpus = data.articles.map(a => (a.title || '')).join(' ').toLowerCase();

  const items = TEMPLATES.map(tmpl => {
    const hits = tmpl.keywords.filter(kw => corpus.includes(kw)).length;
    const adj  = hits >= 3 ? 0.4 : hits >= 1 ? 0.1 : -0.2;
    const score = Math.min(10, Math.max(1, +(tmpl.baseScore + adj).toFixed(1)));
    const level = score >= 9 ? 'Critical' : score >= 7.5 ? 'High' : score >= 5 ? 'Moderate' : 'Low';
    return {
      ...tmpl,
      riskScore: score, riskLevel: level,
      source: 'GDELT-derived',
      isActive: true,
      timestamp: new Date().toISOString()
    };
  });
  return { status: 'live', source: 'GDELT-derived', items };
}

// ─── Main export ──────────────────────────────────────────────────────────────
function deriveFromHeadlines(headlines) {
  if (!Array.isArray(headlines) || !headlines.length) return null;
  const corpus = headlines.map(h => `${h.headline || h.title || ''} ${h.whyItMatters || h.context || ''}`).join(' ').toLowerCase();
  const items = TEMPLATES.map(tmpl => {
    const hits = tmpl.keywords.filter(kw => corpus.includes(kw)).length;
    const headlineBoost = headlines.some(h =>
      (h.region && (tmpl.region.includes(h.region) || h.region.includes(tmpl.region))) ||
      (h.relatedRegions || []).some(r => tmpl.countryOrArea.includes(r) || tmpl.region.includes(r))
    ) ? 0.2 : 0;
    const adj = hits >= 3 ? 0.6 : hits >= 1 ? 0.2 : -0.1;
    const score = Math.min(10, Math.max(1, +(tmpl.baseScore + adj + headlineBoost).toFixed(1)));
    const level = score >= 9 ? 'Critical' : score >= 7.5 ? 'High' : score >= 5 ? 'Moderate' : 'Low';
    return {
      ...tmpl,
      riskScore: score,
      riskLevel: level,
      source: 'Live headlines-derived',
      isActive: true,
      timestamp: new Date().toISOString()
    };
  });
  return { status: 'live', source: 'Live headlines-derived', items };
}

async function fetchGeoRisk(headlines) {
  const t0 = Date.now();
  const derived = deriveFromHeadlines(headlines);
  if (derived) return { ...derived, latencyMs: Date.now() - t0, lastSync: new Date().toISOString() };
  const r  = await tryGDELTDerived().catch(() => null);
  if (r) return { ...r, latencyMs: Date.now() - t0, lastSync: new Date().toISOString() };
  return { status: 'mock', source: 'Internal Mock', items: MOCK_ITEMS, latencyMs: Date.now() - t0, lastSync: new Date().toISOString() };
}

module.exports = { fetchGeoRisk };
