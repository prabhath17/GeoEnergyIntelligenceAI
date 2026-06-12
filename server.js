'use strict';
/**
 * GeoEnergy Intelligence AI — Dev Server
 * Serves static files + backend proxy API endpoints.
 * Run: node server.js
 * Then open: http://localhost:8080
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT = 8080;
const ROOT = __dirname;

// ─── Load .env ────────────────────────────────────────────────────────────────
(function loadEnv() {
  const f = path.join(__dirname, '.env');
  if (!fs.existsSync(f)) return;
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const eq = t.indexOf('=');
    if (eq < 1) return;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k && !process.env[k]) process.env[k] = v;
  });
})();

// ─── Adapters ─────────────────────────────────────────────────────────────────
const { fetchPrices  } = require('./dataSources/priceAdapter');
const { fetchNews    } = require('./dataSources/newsAdapter');
const { fetchGeoRisk } = require('./dataSources/geoRiskAdapter');
const { analyze      } = require('./dataSources/aiAnalysisAdapter');
const { fetchSatelliteEvents } = require('./dataSources/satelliteAdapter');

// ─── Mime types ───────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon'
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function json(res, data, status) {
  res.writeHead(status || 200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 2e6) { req.destroy(); reject(new Error('too-large')); } });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

function buildLiveFeed(newsItems, geoItems) {
  const fromNews = (newsItems || []).slice(0, 5).map((n, i) => ({
    id: `lf-news-${Date.now()}-${i}`,
    timestamp: n.timestamp || new Date().toISOString(),
    title: n.headline || n.title || '',
    source: n.source || 'News',
    url: n.url || '',
    sector: n.sector || 'Crude Oil',
    impact: n.impact || 'Medium Impact',
    sentimentEffect: n.sentimentEffect || 'Neutral',
    whyItMatters: n.whyItMatters || n.context || '',
    context: n.context || '',
    marketReadThrough: n.marketReadThrough || '',
    relatedRegions: n.relatedRegions || [],
    relatedSectors: n.relatedSectors || [],
    region: n.region || 'Global',
    eventType: n.category || 'Market Move',
    isBreaking: n.impact === 'High Impact',
    priority: n.impact === 'High Impact' ? 1 : 2
  }));
  const fromRisk = (geoItems || []).slice(0, 3).map((r, i) => ({
    id: `lf-risk-${Date.now()}-${i}`,
    timestamp: r.timestamp || new Date().toISOString(),
    title: `${r.riskLevel} risk — ${r.countryOrArea}: ${r.eventType}`,
    source: r.source || 'GeoRisk Monitor',
    sector: (r.affectedSectors || [])[0] || 'Crude Oil',
    impact: r.riskLevel === 'Critical' ? 'High Impact' : r.riskLevel === 'High' ? 'High Impact' : 'Medium Impact',
    sentimentEffect: 'Risk Elevated',
    whyItMatters: r.marketImpact || '',
    context: `${r.countryOrArea} is being scored from ${r.source || 'live risk inputs'} with affected sectors: ${(r.affectedSectors || []).join(', ') || 'Energy'}. Current score is ${r.riskScore}/10 (${r.riskLevel}).`,
    marketReadThrough: `Watch ${(r.affectedSectors || ['energy']).join(', ')} price action, shipping or transit headlines, and insurance or logistics costs for confirmation that this risk is moving markets.`,
    relatedRegions: [r.region].filter(Boolean),
    relatedSectors: r.affectedSectors || [],
    region: r.region || 'Global',
    eventType: 'Geo Risk',
    isBreaking: r.riskLevel === 'Critical',
    priority: r.riskLevel === 'Critical' ? 1 : 2
  }));
  return [...fromNews, ...fromRisk];
}

function dedupeByHeadline(items) {
  const seen = new Set();
  return (items || []).filter(item => {
    const key = String(item.headline || item.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── API route handler ────────────────────────────────────────────────────────
async function handleAPI(req, res, pathname) {
  const t0 = Date.now();

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  try {
    // GET /api/proxy/prices
    if (pathname === '/api/proxy/prices' && req.method === 'GET') {
      return json(res, { ...(await fetchPrices()), latencyMs: Date.now() - t0 });
    }

    // GET /api/proxy/news
    if (pathname === '/api/proxy/news' && req.method === 'GET') {
      return json(res, { ...(await fetchNews()), latencyMs: Date.now() - t0 });
    }

    // GET /api/proxy/georisk
    if (pathname === '/api/proxy/georisk' && req.method === 'GET') {
      return json(res, { ...(await fetchGeoRisk()), latencyMs: Date.now() - t0 });
    }

    // GET /api/proxy/satellite
    if (pathname === '/api/proxy/satellite' && req.method === 'GET') {
      return json(res, { ...(await fetchSatelliteEvents()), latencyMs: Date.now() - t0 });
    }

    // POST /api/ai/analyze
    if (pathname === '/api/ai/analyze' && req.method === 'POST') {
      const body = await readBody(req);
      return json(res, { ...(await analyze(body)), latencyMs: Date.now() - t0 });
    }

    // GET /api/data-sources/status
    if (pathname === '/api/data-sources/status' && req.method === 'GET') {
      const dss = {
        prices:     { status: 'checking', source: 'Yahoo Finance / EIA / Alpha Vantage', endpoint: '/api/proxy/prices' },
        news:       { status: 'checking', source: 'NewsAPI / GDELT',                    endpoint: '/api/proxy/news' },
        geoRisk:    { status: 'checking', source: 'GDELT-derived / Headlines',           endpoint: '/api/proxy/georisk' },
        aiAnalysis: { status: process.env.ANTHROPIC_API_KEY ? 'configured' : (process.env.OPENAI_API_KEY ? 'configured' : 'mock'), source: process.env.ANTHROPIC_API_KEY ? 'Claude' : (process.env.OPENAI_API_KEY ? 'OpenAI' : 'Deterministic'), endpoint: '/api/ai/analyze' },
        satellite:  { status: 'simulated', source: 'SAT_ALPHA_47',                      endpoint: '/api/proxy/satellite' },
        lastSyncTime: new Date().toISOString()
      };
      return json(res, dss);
    }

    // GET /api/dashboard/live  ← primary endpoint used by frontend in live mode
    if (pathname === '/api/dashboard/live' && req.method === 'GET') {
      const [pricesRes, newsRes, satelliteRes] = await Promise.all([
        fetchPrices().catch(() => null),
        fetchNews().catch(() => null),
        fetchSatelliteEvents().catch(() => null)
      ]);
      const geoRes = await fetchGeoRisk(newsRes?.items).catch(() => null);

      const crossMarketSignals = pricesRes?.crossMarketSignals || [];
      const aiPayload = {
        prices:              (pricesRes?.items || []),
        headlines:           (newsRes?.items   || []),
        geoRiskItems:        (geoRes?.items    || []),
        crossMarketSignals
      };
      const aiRes = await analyze(aiPayload).catch(() => null);

      const statuses = {
        prices:     pricesRes?.status || 'offline',
        news:       newsRes?.status   || 'offline',
        geoRisk:    geoRes?.status    || 'offline',
        aiAnalysis: aiRes?.status     || 'offline',
        satellite:  satelliteRes?.status || 'simulated'
      };
      const dataSourceStatus = {
        prices:     { status: statuses.prices,     source: pricesRes?.source || 'None', latencyMs: pricesRes?.latencyMs ?? null, lastSync: new Date().toISOString() },
        news:       { status: statuses.news,       source: newsRes?.source   || 'None', latencyMs: newsRes?.latencyMs   ?? null, lastSync: new Date().toISOString() },
        geoRisk:    { status: statuses.geoRisk,    source: geoRes?.source    || 'None', latencyMs: geoRes?.latencyMs    ?? null, lastSync: new Date().toISOString() },
        aiAnalysis: { status: statuses.aiAnalysis, source: aiRes?.source     || 'None', latencyMs: aiRes?.latencyMs     ?? null, lastSync: new Date().toISOString() },
        satellite:  { status: statuses.satellite,  source: satelliteRes?.source || 'SAT_ALPHA_47', latencyMs: satelliteRes?.latencyMs ?? null, lastSync: satelliteRes?.lastSync || null },
        lastSyncTime: new Date().toISOString()
      };

      const energyStatuses = [statuses.prices, statuses.news, statuses.geoRisk, statuses.aiAnalysis];
      const liveCount = energyStatuses.filter(s => s === 'live').length;
      const mode      = liveCount === 0 ? 'mock' : liveCount >= 3 ? 'live' : 'partial';

      // Sort intelligence feed by timestamp descending, filter to 24h window
      const cutoff24h  = Date.now() - 24 * 60 * 60 * 1000;
      const rawFeed    = dedupeByHeadline(aiRes?.intelligenceFeed || []);
      const recentFeed = rawFeed.filter(i => new Date(i.timestamp || 0).getTime() >= cutoff24h);
      const feedToUse  = recentFeed.length ? recentFeed : rawFeed;
      feedToUse.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

      return json(res, {
        mode, fallbackActive: mode === 'mock',
        lastSync: new Date().toISOString(),
        latencyMs: Date.now() - t0,
        dataSourceStatus,
        marketPulse:               aiRes?.marketPulse               || null,
        sectorScores:              aiRes?.sectorScores               || null,
        executiveBriefing:         aiRes?.executiveBriefing          || null,
        intelligenceFeed:          feedToUse.length ? feedToUse : null,
        crossMarketSignalSummary:  aiRes?.crossMarketSignalSummary   || null,
        tickerItems:               pricesRes?.items || null,
        crossMarketSignals:        crossMarketSignals.length ? crossMarketSignals : null,
        geoRiskItems:              geoRes?.items    || null,
        liveFeedItems:             buildLiveFeed(newsRes?.items, geoRes?.items)
      });
    }

    return json(res, { error: 'Not Found' }, 404);

  } catch (err) {
    console.error('[API Error]', pathname, err.message);
    return json(res, { error: 'Internal server error', message: err.message }, 500);
  }
}

// ─── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed   = url.parse(req.url || '/');
  const pathname = decodeURIComponent(parsed.pathname || '/');

  if (pathname.startsWith('/api/')) return handleAPI(req, res, pathname);

  // Static file serving
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(ROOT, filePath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end(`404 — Not Found: ${pathname}`); }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'text/plain',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
    if (!pathname.includes('.map')) console.log(`[GEI] ${req.method} ${pathname} 200`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const has = k => process.env[k] ? '✓' : '✗ (mock fallback)';
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────┐');
  console.log('  │  GeoEnergy Intelligence AI — Dev Server          │');
  console.log(`  │  http://localhost:${PORT}                          │`);
  console.log('  │  Press Ctrl+C to stop                            │');
  console.log('  └─────────────────────────────────────────────────┘');
  console.log('');
  console.log('  API Keys:');
  console.log(`    NEWS_API_KEY:          ${has('NEWS_API_KEY')}`);
  console.log(`    EIA_API_KEY:           ${has('EIA_API_KEY')}`);
  console.log(`    ALPHA_VANTAGE_API_KEY: ${has('ALPHA_VANTAGE_API_KEY')}`);
  console.log(`    ANTHROPIC_API_KEY:     ${has('ANTHROPIC_API_KEY')}`);
  console.log(`    OPENAI_API_KEY:        ${has('OPENAI_API_KEY')}`);
  console.log('');
});
