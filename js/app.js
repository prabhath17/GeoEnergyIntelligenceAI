/**
 * GeoEnergy Intelligence AI — Main Application
 * Event wiring, routing, live simulation, refresh logic.
 */

'use strict';

// ─── AUTO-REFRESH TIMER ───────────────────────────────────────────────────────
let _autoRefreshTimer = null;

function restartAutoRefresh() {
  clearInterval(_autoRefreshTimer);
  const interval = GEIState.get('settings').refreshInterval;
  const ms = { '30s': 30000, '1m': 60000, '5m': 300000, 'manual': 0 }[interval] || 0;
  if (ms > 0) {
    _autoRefreshTimer = setInterval(handleRefresh, ms);
  }
}

// ─── MAIN INIT ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  GEIState.set({ isLoading: true, lastUpdated: new Date().toISOString() });

  // Render dashboard with mock data first (instant load)
  renderMarketPulseStrip();
  renderTickerBar();
  renderSectorCardsSection();
  renderCrossMarketSignals();
  renderGeoRiskPanelSection();
  renderExecutiveBriefingSection();
  renderIntelligenceFeedSection();
  renderLiveFeedStrip();
  renderLiveFeedPanelItems(sortFeedByPriority(liveFeedItems));

  // Wire all interactions
  wireNavigation();
  wireHeaderButtons();
  wireMarketPulseCards();
  wireTickerItems();
  wireSectorCards();
  wireGeoRiskRows();
  wireIntelligenceFeed();
  wireViewFullAnalysis();
  wireViewAllReports();
  wireMapHotspots();
  wireLiveFeedFilters();
  wireFooterLinks();
  wireGlobalKeyboard();
  wireDelegatedClicks();

  // Start live feed simulation
  startLiveFeedSim();
  startSystemClock();
  restartAutoRefresh();

  // Initialize routing from current hash
  handleRoute(window.location.hash || '#dashboard');

  GEIState.set({ isLoading: false });

  // Always try live on load — server handles fallback to mock if providers fail
  safeText('[data-system-status]', 'System: Connecting to live data...');
  setTimeout(() => {
    if (typeof handleRefresh === 'function') handleRefresh();
  }, 300);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDERING — bind data to existing HTML elements
// ═══════════════════════════════════════════════════════════════════════════════

function renderMarketPulseStrip() {
  const p = marketPulse;
  safeText('[data-pulse-direction]', p.marketDirection);
  safeText('[data-pulse-risk]',      p.globalRiskLevel);
  safeText('[data-pulse-sector]',    p.mostAffectedSector);
  safeText('[data-pulse-region]',    p.keyRegion);
  safeText('[data-pulse-event]',     p.biggestEvent);
  safeText('[data-system-status]',   `System: ${p.systemStatus} | ${formatLocalTime(p.lastUpdated)}`);
}

function renderTickerBar() {
  const container = document.querySelector('[data-ticker-container]');
  if (!container) return;
  container.innerHTML = tickerItems.map(item => {
    const col    = getDirectionColorClass(item.direction);
    const prefix = item.changePercent > 0 ? '+' : '';
    return `
      <div class="flex items-center gap-sm cursor-pointer group" data-ticker-id="${item.id}"
           title="Click for ${item.name} details">
        <span class="text-label-md text-on-surface-variant group-hover:text-primary transition-colors">${item.name.toUpperCase()}</span>
        <span class="font-mono-data text-body-md text-on-surface" data-ticker-price="${item.id}">${item.currency}${item.price.toFixed(2)}</span>
        <span class="font-mono-data text-body-sm ${col}" data-ticker-change="${item.id}">${prefix}${item.changePercent.toFixed(1)}%</span>
      </div>`;
  }).join('');

  // Wire clicks immediately after render
  container.querySelectorAll('[data-ticker-id]').forEach(el => {
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      const id   = el.dataset.tickerId;
      const item = tickerItems.find(t => t.id === id);
      if (item) openDrawer('ticker', item);
    });
  });
}

function renderSectorCardsSection() {
  const container = document.querySelector('[data-sector-cards]');
  if (!container) return;
  container.innerHTML = sectorScores.map(s => {
    const si   = getSentimentLabel(s.sentiment);
    const btop = getSentimentBorderTop(s.sentiment);
    const bars = renderSparkBarsHtml(s.sparklineData, s.sentiment);
    return `
      <div class="p-md bg-surface-container border-t-2 ${btop} border-x border-b border-outline-variant rounded-b-lg sector-card cursor-pointer hover:shadow-lg transition-all group"
           data-sector-id="${s.id}" title="Click for ${s.sector} detail">
        <div class="flex justify-between items-start mb-sm">
          <div>
            <h3 class="text-label-md text-on-surface-variant group-hover:text-primary transition-colors">${s.sector.toUpperCase()}</h3>
            <p class="text-headline-sm font-bold">${s.confidence}%</p>
          </div>
          <span class="text-[10px] px-2 py-0.5 border ${si.borderClass} ${si.colorClass} rounded-sm tracking-wider">${si.label}</span>
        </div>
        <p class="text-body-sm text-on-surface-variant h-10 line-clamp-2 mb-sm">${s.reason}</p>
        <div class="flex items-end gap-1 h-10 mb-xs">${bars}</div>
        <p class="text-[10px] font-mono-data text-tertiary">WATCH: ${s.watchItem}</p>
        <div class="mt-xs flex items-center justify-between">
          <span class="text-[10px] text-outline">${getConfidenceLabel(s.confidence)}</span>
          <span class="text-[10px] font-mono-data ${s.changeVsYesterday?.startsWith('+')?'text-primary':'text-error'}">${s.changeVsYesterday}</span>
        </div>
      </div>`;
  }).join('');
}

function renderSparkBarsHtml(data, sentiment) {
  if (!data?.length) return '';
  const max = Math.max(...data);
  const colorMap = {
    'Bullish':   ['bg-outline-variant','bg-outline-variant','bg-primary-container','bg-primary'],
    'Bearish':   ['bg-error-container','bg-error-container','bg-error-container','bg-outline-variant'],
    'Volatile':  ['bg-outline-variant','bg-outline-variant','bg-tertiary-container','bg-tertiary'],
    'Steady':    ['bg-outline-variant','bg-on-surface-variant','bg-on-surface-variant','bg-on-surface-variant'],
    'Expanding': ['bg-primary-fixed-dim/20','bg-primary-fixed-dim','bg-primary-container','bg-primary-container'],
    'Neutral':   ['bg-outline-variant','bg-outline-variant','bg-on-surface-variant','bg-on-surface-variant']
  };
  const colors = colorMap[sentiment] || colorMap['Neutral'];
  return data.slice(-4).map((v, i) => {
    const px = Math.max(4, Math.round((v / max) * 48));
    return `<div class="w-full ${colors[i]}" style="height:${px}px"></div>`;
  }).join('');
}

function renderGeoRiskPanelSection() {
  const container = document.querySelector('[data-georisk-panel]');
  if (!container) return;
  const visibleRisks = geoRiskItems.slice(0, 6);
  container.innerHTML = visibleRisks.map(item => {
    const ri  = getRiskLevel(item.riskLevel);
    const bar = getGeoRiskBarColorByLevel(item.riskLevel);
    return `
      <div class="space-y-sm cursor-pointer group" data-risk-id="${item.id}">
        <div class="flex justify-between items-end">
          <span class="text-body-md font-bold group-hover:text-primary transition-colors">${item.countryOrArea}</span>
          <span class="${ri.scoreClass} font-mono-data text-label-md">${item.riskScore} ${item.riskLevel.toUpperCase()}</span>
        </div>
        <p class="text-[10px] text-on-surface-variant leading-tight">${item.marketImpact}</p>
        <div class="w-full bg-outline-variant h-1 rounded-full overflow-hidden">
          <div class="${bar} h-full transition-all duration-1000" style="width:${item.riskScore*10}%"></div>
        </div>
      </div>`;
  }).join('');
}

function renderExecutiveBriefingSection() {
  const b = executiveBriefing;
  safeText('[data-briefing-changed]', `"${b.whatChanged}"`);
  safeText('[data-briefing-matters]', b.whyItMatters);

  const watchEl = document.querySelector('[data-briefing-watch]');
  if (watchEl) watchEl.innerHTML = (b.whatToWatchNext||[]).map(w=>
    `<li class="flex gap-sm items-start"><span class="text-tertiary font-mono-data text-xs">→</span><span class="text-body-sm text-on-surface-variant">${w}</span></li>`
  ).join('');

  const stratEl = document.querySelector('[data-briefing-strategy]');
  if (stratEl) stratEl.innerHTML = (b.strategyBrief||[]).map((s,i)=>
    `<li class="flex gap-sm"><span class="text-tertiary font-mono-data text-xs">${String(i+1).padStart(2,'0')}</span><span class="text-body-sm">${s}</span></li>`
  ).join('');
}

function renderIntelligenceFeedSection() {
  const container = document.querySelector('[data-intelligence-feed]');
  if (!container) return;
  container.className = '';
  container.innerHTML = intelligenceFeed.map(h => renderAIReportCard(h)).join('');
  wireIntelFeedClicks();
  const countEl = document.getElementById('intel-feed-count');
  if (countEl) countEl.textContent = `${intelligenceFeed.length}`;
}

function renderCrossMarketSignals() {
  const container = document.querySelector('[data-cross-market-signals]');
  if (!container) return;
  const signals = typeof crossMarketSignals !== 'undefined' ? crossMarketSignals : [];
  if (!signals.length) { container.innerHTML = '<p class="p-md text-body-sm text-on-surface-variant col-span-full">No cross-market data.</p>'; return; }
  container.innerHTML = signals.map(s => {
    const col    = getDirectionColorClass(s.direction);
    const prefix = s.changePercent > 0 ? '+' : '';
    const sigBg  = s.direction === 'up' ? 'bg-primary-container/20 text-primary' :
                   s.direction === 'down' ? 'bg-error-container/20 text-error' :
                   'bg-surface-container-highest text-on-surface-variant';
    return `
      <div class="p-md border-b border-outline-variant last:border-b-0 md:border-b-0 md:border-r cursor-pointer hover:bg-surface-container-highest transition-colors group"
           data-cross-market-id="${s.id}"
           title="${s.whyItMatters}">
        <div class="flex items-center justify-between mb-xs">
          <span class="text-label-md text-on-surface-variant group-hover:text-primary transition-colors">${s.name.toUpperCase()}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${sigBg}">${s.signalType || 'Signal'}</span>
        </div>
        <p class="font-mono-data text-body-md text-on-surface">${s.currency}${typeof s.price === 'number' ? s.price.toFixed(2) : s.price}</p>
        <p class="font-mono-data text-body-sm ${col}">${prefix}${typeof s.changePercent === 'number' ? s.changePercent.toFixed(1) : s.changePercent}%</p>
        <p class="text-[10px] text-on-surface-variant mt-xs leading-tight line-clamp-2">${s.whyItMatters}</p>
      </div>`;
  }).join('');
}

function renderLiveFeedStrip() {
  const bar = document.querySelector('[data-live-bar]');
  if (!bar) return;
  const items = sortFeedByPriority(liveFeedItems).slice(0, 6);
  const row = (duplicate = false) => `
    <div class="flex items-center gap-xl px-md ${duplicate ? 'ml-xl' : ''}">
      <span class="px-1.5 py-0.5 bg-error text-[10px] font-bold rounded-sm breaking-badge">LIVE FEED</span>
      ${items.map(item => `
        <button class="text-body-sm text-on-surface hover:text-primary transition-colors cursor-pointer"
                data-live-bar-item-id="${item.id}" title="${item.source}: ${item.eventType}">
          ${item.title}
        </button>
        <span class="text-outline-variant text-xs">•</span>
      `).join('')}
    </div>`;
  bar.innerHTML = `${row(false)}${row(true)}`;
  bar.querySelectorAll('[data-live-bar-item-id]').forEach(itemEl => {
    itemEl.addEventListener('click', event => {
      event.stopPropagation();
      const item = liveFeedItems.find(i => i.id === itemEl.dataset.liveBarItemId);
      if (item) {
        GEIState.set({ selectedFeedItem: item.id });
        openDrawer('feedItem', item);
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT WIRING
// ═══════════════════════════════════════════════════════════════════════════════

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function wireNavigation() {
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const tab = link.dataset.nav;
      window.location.hash = tab;
      handleRoute(`#${tab}`);
    });
  });
  window.addEventListener('hashchange', () => handleRoute(window.location.hash));
}

function handleRoute(hash) {
  const tab = (hash || '#dashboard').replace('#', '') || 'dashboard';
  closeAll();
  GEIState.set({ selectedTab: tab });

  // Show/hide page sections
  document.querySelectorAll('[data-page]').forEach(page => {
    const isActive = page.dataset.page === tab;
    page.classList.toggle('hidden', !isActive);
  });

  // Update nav active state
  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = link.dataset.nav === tab;
    link.classList.toggle('text-primary', active);
    link.classList.toggle('border-b-2', active);
    link.classList.toggle('border-primary', active);
    link.classList.toggle('text-on-surface-variant', !active);
    link.classList.toggle('pb-1', active);
  });

  // Render page-specific content if needed
  if (tab === 'statistics' || tab === 'history') {
    const el = document.getElementById('statistics-content');
    if (el) {
      el.innerHTML = renderStatisticsPage();
      wireStatisticsPage();
    }
  } else if (tab === 'commodities' && typeof renderCommoditiesPage === 'function') {
    renderCommoditiesPage();
  } else if (tab === 'georisk' && typeof renderGeoRiskPage === 'function') {
    renderGeoRiskPage();
  } else if (tab === 'headlines' && typeof renderHeadlinesPage === 'function') {
    renderHeadlinesPage();
  }
}

function wireStatisticsPage() {
  const energySelect = document.getElementById('stats-energy-select');
  const crossSelect  = document.getElementById('stats-cross-select');
  const cardsEl = document.getElementById('stats-summary-cards');
  const chartEl = document.getElementById('stats-chart-area');
  if (!energySelect && !crossSelect) return;

  let currentRange      = '30D';
  let currentInstrument = 'crude-oil';
  let currentType       = 'energy';

  function setActiveRange(r) {
    document.querySelectorAll('[data-stats-range]').forEach(b => {
      const on = b.dataset.statsRange === r;
      b.className = b.className
        .replace(/bg-primary-container|text-on-primary-container|bg-surface-container|text-on-surface-variant/g, '')
        .trim();
      b.classList.add(...(on
        ? ['bg-primary-container', 'text-on-primary-container']
        : ['bg-surface-container', 'text-on-surface-variant']));
    });
  }

  let currentMode = 'Price';

  function render() {
    if (!currentInstrument || typeof generateStatsMockData !== 'function') return;
    const data = generateStatsMockData(currentInstrument, currentRange);
    if (!data) return;
    data.instrumentId = currentInstrument;
    if (cardsEl) cardsEl.innerHTML = renderStatisticsSummaryCards(data);
    if (chartEl) chartEl.innerHTML = renderStatisticsChartArea(data, currentMode);
  }

  energySelect?.addEventListener('change', () => {
    if (energySelect.value) {
      currentInstrument = energySelect.value;
      currentType = 'energy';
      if (crossSelect) crossSelect.value = '';
    }
    render();
  });

  crossSelect?.addEventListener('change', () => {
    if (crossSelect.value) {
      currentInstrument = crossSelect.value;
      currentType = 'cross-market';
      if (energySelect) energySelect.value = '';
    }
    render();
  });

  document.querySelectorAll('[data-stats-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentRange = btn.dataset.statsRange;
      setActiveRange(currentRange);
      render();
    });
  });

  // Auto-select crude oil on load
  if (energySelect) {
    energySelect.value = 'crude-oil';
    energySelect.dispatchEvent(new Event('change'));
  }
  setActiveRange(currentRange);
}

// Keep alias for any legacy references
function wireHistoryPage() { wireStatisticsPage(); }

// ─── HEADER BUTTONS ───────────────────────────────────────────────────────────
function wireHeaderButtons() {
  // Refresh
  document.querySelector('[data-action="refresh"]')?.addEventListener('click', event => {
    event.__geiHandled = true;
    event.stopPropagation();
    handleRefresh();
  });

  // Filter
  document.querySelector('[data-action="filter"]')?.addEventListener('click', event => {
    event.__geiHandled = true;
    event.stopPropagation();
    toggleFilterPanel();
  });

  // Alerts
  document.querySelector('[data-action="alerts"]')?.addEventListener('click', event => {
    event.__geiHandled = true;
    event.stopPropagation();
    toggleAlertPanel();
  });

  // Settings
  document.querySelector('[data-action="settings"]')?.addEventListener('click', event => {
    event.__geiHandled = true;
    event.stopPropagation();
    toggleSettingsPanel();
  });

  // Profile
  document.querySelector('[data-action="profile"]')?.addEventListener('click', event => {
    event.__geiHandled = true;
    event.stopPropagation();
    openModal('account', { anchor: event.currentTarget });
  });
}

let _delegatedClicksWired = false;
function wireDelegatedClicks() {
  if (_delegatedClicksWired) return;
  _delegatedClicksWired = true;
  document.addEventListener('click', event => {
    if (event.__geiHandled) return;

    const action = event.target.closest('[data-action]');
    if (action) {
      const name = action.dataset.action;
      if (name === 'refresh') { event.preventDefault(); handleRefresh(); return; }
      if (name === 'filter') { event.preventDefault(); toggleFilterPanel(); return; }
      if (name === 'alerts') { event.preventDefault(); toggleAlertPanel(); return; }
      if (name === 'settings') { event.preventDefault(); toggleSettingsPanel(); return; }
      if (name === 'profile') { event.preventDefault(); openModal('account', { anchor: action }); return; }
      if (name === 'view-analysis') { event.preventDefault(); openModal('executiveBriefing', executiveBriefing); return; }
      if (name === 'view-all-reports') { event.preventDefault(); openModal('allReports', { items: intelligenceFeed }); return; }
    }

    const ticker = event.target.closest('[data-ticker-id]');
    if (ticker) {
      const item = tickerItems.find(t => t.id === ticker.dataset.tickerId);
      if (item) { event.preventDefault(); GEIState.set({ selectedTickerItem: item.id }); openDrawer('ticker', item); }
      return;
    }

    const crossSignal = event.target.closest('[data-cross-market-id]');
    if (crossSignal) {
      const item = crossMarketSignals.find(s => s.id === crossSignal.dataset.crossMarketId);
      if (item) { event.preventDefault(); GEIState.set({ selectedTickerItem: item.id }); openDrawer('ticker', item); }
      return;
    }

    const sectorCard = event.target.closest('[data-sector-id]');
    if (sectorCard) {
      const sector = sectorScores.find(s => s.id === sectorCard.dataset.sectorId);
      if (sector) { event.preventDefault(); GEIState.set({ selectedSector: sector.id }); openDrawer('sector', sector); }
      return;
    }

    const riskRow = event.target.closest('[data-risk-id]');
    if (riskRow) {
      const risk = geoRiskItems.find(r => r.id === riskRow.dataset.riskId);
      if (risk) { event.preventDefault(); showRiskContext(risk); }
      return;
    }

    const hotspot = event.target.closest('[data-hotspot-id]');
    if (hotspot) {
      const risk = geoRiskItems.find(r => r.id === hotspot.dataset.hotspotId);
      if (risk) { event.preventDefault(); showRiskContext(risk); }
      return;
    }

    const hotspotButton = event.target.closest('[data-hotspot-button-id]');
    if (hotspotButton) {
      const risk = geoRiskItems.find(r => r.id === hotspotButton.dataset.hotspotButtonId);
      if (risk) { event.preventDefault(); showRiskContext(risk); }
      return;
    }

    const feedRow = event.target.closest('[data-feed-id]');
    if (feedRow) {
      const item = intelligenceFeed.find(i => i.id === feedRow.dataset.feedId);
      if (item) { event.preventDefault(); GEIState.set({ selectedFeedItem: item.id }); openDrawer('feedItem', item); }
      return;
    }

    const liveRow = event.target.closest('[data-live-item-id]');
    if (liveRow) {
      const item = liveFeedItems.find(i => i.id === liveRow.dataset.liveItemId);
      if (item) { event.preventDefault(); GEIState.set({ selectedFeedItem: item.id }); openDrawer('feedItem', item); }
      return;
    }

    const liveStripItem = event.target.closest('[data-live-bar-item-id]');
    if (liveStripItem) {
      const item = liveFeedItems.find(i => i.id === liveStripItem.dataset.liveBarItemId);
      if (item) { event.preventDefault(); GEIState.set({ selectedFeedItem: item.id }); openDrawer('feedItem', item); }
    }
  });
}

async function handleRefresh() {
  const btn = document.querySelector('[data-action="refresh"]');
  if (btn) btn.classList.add('animate-spin');
  GEIState.set({ isLoading: true });

  const isLive = GEIState.get('dataMode') === 'live' || !GEI_CONFIG.useMock;
  safeText('[data-system-status]', isLive ? 'System: Fetching live data...' : 'System: Refreshing...');

  const result = await refreshDashboardData();

  if (btn) setTimeout(() => btn.classList.remove('animate-spin'), 800);

  renderMarketPulseStrip();
  renderTickerBar();
  renderSectorCardsSection();
  renderCrossMarketSignals();
  renderGeoRiskPanelSection();
  renderExecutiveBriefingSection();
  renderIntelligenceFeedSection();
  renderLiveFeedStrip();
  renderLiveFeedPanelItems(sortFeedByPriority(liveFeedItems));
  applyFiltersToUI();

  // Re-render active secondary page
  const tab = GEIState.get('selectedTab');
  if (tab === 'commodities' && typeof renderCommoditiesPage === 'function') renderCommoditiesPage();
  else if (tab === 'georisk'  && typeof renderGeoRiskPage    === 'function') renderGeoRiskPage();
  else if (tab === 'headlines' && typeof renderHeadlinesPage  === 'function') renderHeadlinesPage();

  const now = new Date().toISOString();
  GEIState.set({ isLoading: false, lastUpdated: now });

  if (result?.liveError) {
    showToast('Live data unavailable — using mock fallback.', 'warn');
    safeText('[data-system-status]', `Mock Fallback Active | ${formatLocalTime(now)}`);
    return;
  }

  const dss   = GEIState.get('dataSourceStatus') || {};
  const liveN = Object.values(dss).filter(v => v && (typeof v === 'object' ? v.status : v) === 'live').length;
  const mode  = result?.mode || (result?.usedFallback ? 'mock' : 'live');
  const label = mode === 'live'    ? 'Live Data Active'    :
                mode === 'partial' ? 'Partial Live Mode'   :
                                    'Mock Fallback Active';
  const toastType = mode === 'live' ? 'success' : mode === 'partial' ? 'info' : 'warn';
  showToast(`${label}${liveN > 0 ? ` · ${liveN} source${liveN !== 1 ? 's' : ''} live` : ''}`, toastType, 3500);
  safeText('[data-system-status]', `${label} | ${formatLocalTime(now)}`);
}

// ─── MARKET PULSE CARDS ───────────────────────────────────────────────────────
function wireMarketPulseCards() {
  const fieldMap = {
    '[data-pulse-direction]': 'direction',
    '[data-pulse-risk]':      'risk',
    '[data-pulse-sector]':    'sector',
    '[data-pulse-region]':    'region',
    '[data-pulse-event]':     'event'
  };
  Object.entries(fieldMap).forEach(([sel, field]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    // Make parent card clickable
    const card = el.closest('.p-md');
    if (card) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () =>
        openDrawer('marketPulse', { field, pulse: marketPulse })
      );
      card.classList.add('hover:border-primary', 'transition-colors', 'group');
    }
  });
}

// ─── TICKER ITEMS ─────────────────────────────────────────────────────────────
function wireTickerItems() {
  // Already wired in renderTickerBar — this re-wires for cases where container existed before render
  document.querySelector('[data-ticker-container]')?.addEventListener('click', e => {
    const item = e.target.closest('[data-ticker-id]');
    if (!item) return;
    const ticker = tickerItems.find(t => t.id === item.dataset.tickerId);
    if (ticker) openDrawer('ticker', ticker);
  });
}

// ─── SECTOR CARDS ─────────────────────────────────────────────────────────────
function wireSectorCards() {
  document.querySelector('[data-sector-cards]')?.addEventListener('click', e => {
    const card = e.target.closest('[data-sector-id]');
    if (!card) return;
    const sector = sectorScores.find(s => s.id === card.dataset.sectorId);
    if (sector) openDrawer('sector', sector);
  });
}

// ─── GEO RISK ROWS ────────────────────────────────────────────────────────────
function wireGeoRiskRows() {
  const panel = document.querySelector('[data-georisk-panel]');
  if (!panel) return;
  panel.addEventListener('click', e => {
    const row = e.target.closest('[data-risk-id]');
    if (!row) return;
    const risk = geoRiskItems.find(r => r.id === row.dataset.riskId);
    if (!risk) return;
    showRiskContext(risk);
  });
}

function showRiskContext(risk) {
  GEIState.set({ selectedRiskRegion: risk.id });
  openDrawer('georisk', risk);
  highlightSectors(risk.affectedSectors || []);

  const relatedIntel = intelligenceFeed.filter(item =>
    (item.relatedSectors || []).some(s => risk.affectedSectors?.includes(s)) ||
    (item.relatedRegions || []).some(region => region.includes(risk.region) || risk.countryOrArea.includes(region))
  );
  const relatedLive = liveFeedItems.filter(item =>
    risk.affectedSectors?.includes(item.sector) || item.region === risk.region || risk.countryOrArea.includes(item.region)
  );

  const feedContainer = document.querySelector('[data-intelligence-feed]');
  if (feedContainer) {
    feedContainer.className = '';
    feedContainer.innerHTML = relatedIntel.map(h => renderAIReportCard(h)).join('') ||
      '<p class="p-xs text-body-sm text-on-surface-variant">No related intelligence for this risk region.</p>';
    wireIntelFeedClicks();
    const countEl = document.getElementById('intel-feed-count');
    if (countEl) countEl.textContent = `${relatedIntel.length}`;
  }
  renderLiveFeedPanelItems(relatedLive.length ? relatedLive : liveFeedItems);
}

function highlightSectors(sectors) {
  document.querySelectorAll('[data-sector-id]').forEach(card => {
    const sec = sectorScores.find(s => s.id === card.dataset.sectorId);
    const isRelated = sectors.includes(sec?.sector);
    card.classList.toggle('ring-2',           isRelated);
    card.classList.toggle('ring-primary',     isRelated);
    card.classList.toggle('opacity-40',       !isRelated);
  });
  setTimeout(() => {
    document.querySelectorAll('[data-sector-id]').forEach(card => {
      card.classList.remove('ring-2','ring-primary','opacity-40');
    });
  }, 4000);
}

// ─── INTELLIGENCE FEED ────────────────────────────────────────────────────────
function wireIntelligenceFeed() {
  // Filter buttons in intelligence feed
  document.querySelectorAll('[data-intel-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-intel-filter]').forEach(b => {
        b.classList.replace('text-primary','text-on-surface-variant');
      });
      btn.classList.replace('text-on-surface-variant','text-primary');

      const val = btn.dataset.intelFilter;
      let items = [...intelligenceFeed];
      if (val === 'high-impact')   items = items.filter(i => i.impact === 'High Impact');
      else if (val === 'geo-risk') items = items.filter(i => i.category === 'Geo Risk');
      else if (val === 'supply-chain') items = items.filter(i => i.category === 'Supply Chain');
      else if (val === 'market-move')  items = items.filter(i => i.category === 'Market Move');
      else if (val === 'policy')       items = items.filter(i => i.category === 'Policy');

      const container = document.querySelector('[data-intelligence-feed]');
      if (container) {
        container.innerHTML = items.map(h => renderAIReportCard(h)).join('');
        wireIntelFeedClicks();
        const countEl = document.getElementById('intel-feed-count');
        if (countEl) countEl.textContent = `${items.length}`;
      }
      const pageContainer = document.getElementById('headlines-feed');
      if (pageContainer) {
        pageContainer.innerHTML = items.map(h => renderIntelFeedRow(h)).join('');
        wireIntelFeedClicks();
      }
    });
  });
}

// ─── VIEW FULL ANALYSIS ───────────────────────────────────────────────────────
function wireViewFullAnalysis() {
  document.querySelectorAll('[data-action="view-analysis"]').forEach(btn => {
    btn.addEventListener('click', () => openModal('executiveBriefing', executiveBriefing));
  });
}

// ─── VIEW ALL INTELLIGENCE REPORTS ────────────────────────────────────────────
function wireViewAllReports() {
  document.querySelector('[data-action="view-all-reports"]')?.addEventListener('click', () =>
    openModal('allReports', { items: intelligenceFeed })
  );
}

// ─── MAP HOTSPOTS ─────────────────────────────────────────────────────────────
function wireMapHotspots() {
  document.querySelectorAll('[data-hotspot-id]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const id   = el.dataset.hotspotId;
      const risk = geoRiskItems.find(r => r.id === id);
      if (risk) showRiskContext(risk);
    });
  });
}

// ─── LIVE FEED FILTER BUTTONS ─────────────────────────────────────────────────
function wireLiveFeedFilters() {
  document.querySelectorAll('[data-feed-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-feed-filter]').forEach(b => {
        b.classList.remove('border-primary','text-primary');
        b.classList.add('border-outline-variant','text-on-surface-variant');
      });
      btn.classList.add('border-primary','text-primary');
      btn.classList.remove('border-outline-variant','text-on-surface-variant');

      const cat      = btn.dataset.feedFilter;
      GEIState.setNested('activeFilters.feedCategory', cat);
      const filtered = filterLiveFeedByCategory(liveFeedItems, cat);
      renderLiveFeedPanelItems(filtered);
    });
  });
}

// ─── FOOTER LINKS ─────────────────────────────────────────────────────────────
function wireFooterLinks() {
  const links = {
    '[data-footer="methodology"]': { title:'Methodology',   type:'methodology' },
    '[data-footer="compliance"]':  { title:'Compliance',    type:'compliance'  },
    '[data-footer="support"]':     { title:'Support',       type:'support'     },
    '[data-footer="privacy"]':     { title:'Privacy Policy',type:'privacy'     }
  };
  Object.entries(links).forEach(([sel, data]) => {
    document.querySelector(sel)?.addEventListener('click', e => {
      e.preventDefault();
      openModal('footer', data);
    });
  });
}

// ─── GLOBAL KEYBOARD ──────────────────────────────────────────────────────────
function wireGlobalKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAll();
  });
}

// ─── DRAWER/MODAL OVERLAY CLICKS ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('gei-drawer-overlay')?.addEventListener('click', closeAll);
  document.getElementById('gei-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('gei-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('gei-drawer-close')?.addEventListener('click', closeDrawer);
});

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE FEED SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

const _simEvents = [
  { title:'Brent crude spread widens as Red Sea rerouting increases', source:'GEI Signal', sector:'Crude Oil', impact:'High Impact', sentimentEffect:'Bullish', whyItMatters:'Rerouting around Red Sea extends delivery times and increases supply uncertainty.', region:'Middle East', eventType:'Geo Risk', isBreaking:true, priority:1 },
  { title:'US crude inventory draw exceeds estimate by 2.1M bbl', source:'EIA Report', sector:'Crude Oil', impact:'High Impact', sentimentEffect:'Bullish', whyItMatters:'Larger-than-expected draw supports upward pressure on WTI benchmarks.', region:'North America', eventType:'Market Move', isBreaking:true, priority:1 },
  { title:'Spanish wind generation exceeds 50% of grid mix', source:'Grid Monitor', sector:'Renewables', impact:'Medium Impact', sentimentEffect:'Bullish', whyItMatters:'High renewable penetration reduces gas-for-power demand across Iberia.', region:'Southern Europe', eventType:'Market Move', isBreaking:false, priority:3 },
  { title:'EU natural gas injection season slowing — demand uptick flagged', source:'Storage Monitor', sector:'Natural Gas', impact:'Medium Impact', sentimentEffect:'Risk Elevated', whyItMatters:'Slower injections could reduce EU buffer ahead of winter.', region:'Europe', eventType:'Storage Report', isBreaking:false, priority:2 },
  { title:'Diesel crack spreads hit 3-month high on Gulf Coast maintenance', source:'Refinery Monitor', sector:'Refined Products', impact:'High Impact', sentimentEffect:'Bullish', whyItMatters:'Widening cracks signal tightening supply ahead of peak summer demand.', region:'North America', eventType:'Market Move', isBreaking:true, priority:1 },
  { title:'Libya NOC declares force majeure at Sharara oil field', source:'GEI Signal-4', sector:'Crude Oil', impact:'High Impact', sentimentEffect:'Bullish', whyItMatters:'Force majeure could remove 300,000 bpd from global supply.', region:'North Africa', eventType:'Production Disruption', isBreaking:true, priority:1 },
  { title:'ENTSO-E warns of grid congestion risk in Germany for weekend', source:'ENTSO-E', sector:'Power', impact:'Medium Impact', sentimentEffect:'Risk Elevated', whyItMatters:'Weekend renewable surplus may strain balancing capacity in the German grid.', region:'Europe', eventType:'Geo Risk', isBreaking:false, priority:2 }
];
let _simIdx = 0;

function startLiveFeedSim() {
  function schedule() {
    const delay = 30000 + Math.random() * 30000; // 30–60 seconds
    setTimeout(() => {
      injectSimEvent();
      schedule();
    }, delay);
  }
  schedule();
}

function injectSimEvent() {
  if (_simIdx >= _simEvents.length) _simIdx = 0;
  const evt = {
    ..._simEvents[_simIdx++],
    id:        `sim-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  liveFeedItems.unshift(evt);
  renderLiveFeedStrip();

  // Re-render panel
  const cat      = GEIState.get('activeFilters').feedCategory;
  const filtered = filterLiveFeedByCategory(liveFeedItems, cat);
  renderLiveFeedPanelItems(filtered);

  // Flash notification badge
  const badge = document.querySelector('[data-notif-badge]');
  if (badge) { badge.classList.remove('hidden'); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE TICKER SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

setInterval(() => {
  tickerItems.forEach(item => {
    const delta = (Math.random() - 0.48) * (item.price * 0.003);
    item.price  = Math.max(0.01, item.price + delta);
    item.changePercent = parseFloat((item.changePercent + (Math.random() - 0.5) * 0.08).toFixed(1));
    item.direction = getDirectionFromChange(item.changePercent);

    const priceEl  = document.querySelector(`[data-ticker-price="${item.id}"]`);
    const changeEl = document.querySelector(`[data-ticker-change="${item.id}"]`);
    if (priceEl)  priceEl.textContent  = `${item.currency}${item.price.toFixed(2)}`;
    if (changeEl) {
      const prefix = item.changePercent > 0 ? '+' : '';
      changeEl.textContent = `${prefix}${item.changePercent.toFixed(1)}%`;
      changeEl.className   = changeEl.className.replace(/text-(primary|error|outline)\b/g, '');
      changeEl.classList.add(getDirectionColorClass(item.direction));
    }
  });
}, 8000);

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM CLOCK
// ═══════════════════════════════════════════════════════════════════════════════

function startSystemClock() {
  function tick() {
    const el = document.querySelector('[data-system-status]');
    if (el && !GEIState.get('isLoading')) {
      el.textContent = `System: Nominal | ${getCurrentLocalTime()}`;
    }
  }
  tick();
  setInterval(tick, 60000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

function safeText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}
