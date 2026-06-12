const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const BASE = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';
const TIMEOUT = 45000;

async function apiFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${BASE}${endpoint}`, { signal: controller.signal, ...options });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(tid);
  }
}

export async function fetchLiveDashboard() {
  return apiFetch('/dashboard/live');
}

export async function fetchExecutiveBriefing() {
  return apiFetch('/intelligence/executive-briefing');
}

export async function fetchPrices() {
  return apiFetch('/proxy/prices');
}

export async function fetchNews() {
  return apiFetch('/proxy/news');
}

export async function fetchGeoRisk() {
  return apiFetch('/proxy/georisk');
}

export async function fetchDataSourceStatus() {
  return apiFetch('/data-sources/status');
}

export async function postAiAnalyze(payload) {
  return apiFetch('/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchStatistics(type, instrument) {
  return apiFetch(`/statistics/${type}/${instrument}`);
}

export async function fetchStatisticsSnapshot(instrument, range = '1y') {
  return apiFetch(`/statistics/${instrument}?range=${encodeURIComponent(range)}`);
}

export async function fetchStatisticsSummary() {
  return apiFetch('/statistics/summary');
}

export async function fetchStatisticsCorrelations(instrument) {
  return apiFetch(`/statistics/correlations/${instrument}`);
}

export async function fetchStatisticsAnalogues(instrument) {
  return apiFetch(`/statistics/analogues/${instrument}`);
}

export async function fetchAIAnalysis() {
  return apiFetch('/intelligence/ai-analysis');
}

export async function fetchPredictionForecast(commodity, horizon = '30D') {
  return apiFetch(`/prediction/forecast/${commodity}?horizon=${encodeURIComponent(horizon)}`);
}

export async function fetchPredictionSnapshot() {
  return apiFetch('/prediction/snapshot');
}

export async function fetchSignalAnalysis(payload) {
  return apiFetch('/ai/signal-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
