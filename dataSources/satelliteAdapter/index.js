'use strict';
/**
 * Satellite / event adapter using NASA EONET.
 * EONET is free and does not require an API key.
 */
const https = require('https');

function httpsGetJSON(urlStr) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.get({
      hostname: u.hostname,
      port: 443,
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

async function fetchSatelliteEvents() {
  const t0 = Date.now();
  const url = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=20';
  const data = await httpsGetJSON(url).catch(() => null);
  const events = Array.isArray(data?.events) ? data.events : [];
  return {
    status: 'live',
    source: 'NASA EONET',
    latencyMs: Date.now() - t0,
    lastSync: new Date().toISOString(),
    items: events.map(evt => ({
      id: evt.id,
      title: evt.title,
      category: evt.categories?.[0]?.title || 'Natural Event',
      source: evt.sources?.[0]?.id || 'NASA EONET',
      url: evt.sources?.[0]?.url || evt.link || '',
      timestamp: evt.geometry?.[0]?.date || new Date().toISOString()
    }))
  };
}

module.exports = { fetchSatelliteEvents };
