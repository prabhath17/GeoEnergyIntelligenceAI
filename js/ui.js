/**
 * GeoEnergy Intelligence AI — UI System
 * Modal, Drawer, Panel rendering engine.
 * All content is generated as HTML strings and injected into containers.
 */

'use strict';

// ─── TOAST NOTIFICATIONS ─────────────────────────────────────────────────────
function showToast(message, type, duration) {
  type     = type     || 'info';
  duration = duration || 4000;
  const col  = type === 'error'   ? 'bg-error-container text-on-error-container border-error/40' :
               type === 'success' ? 'bg-primary-container text-on-primary-container border-primary/40' :
               type === 'warn'    ? 'bg-tertiary-container text-on-tertiary-container border-tertiary/40' :
                                    'bg-surface-container-highest text-on-surface border-outline-variant';
  const icon = type === 'error'   ? 'error' :
               type === 'success' ? 'check_circle' :
               type === 'warn'    ? 'warning' : 'info';
  const el = document.createElement('div');
  el.className = `fixed bottom-lg right-lg z-[200] flex items-center gap-sm px-md py-sm rounded border ${col} shadow-2xl text-body-sm font-bold animate-fadeIn`;
  el.innerHTML = `${geiIcon(icon)}${message}<button onclick="this.parentElement.remove()" class="ml-sm opacity-60 hover:opacity-100 transition-opacity">${geiIcon('close')}</button>`;
  document.body.appendChild(el);
  setTimeout(() => { if (el.parentElement) el.remove(); }, duration);
}

// ─── CLOSE ALL PANELS ─────────────────────────────────────────────────────────
function closeAll() {
  GEIState.set({
    showDrawer: false, drawerType: null, drawerData: null,
    showModal:  false, modalType:  null, modalData:  null,
    showFilterPanel: false, showAlertPanel: false, showSettingsPanel: false
  });
  document.getElementById('gei-drawer')?.classList.remove('drawer-open');
  document.getElementById('gei-modal-overlay')?.classList.add('hidden');
  document.getElementById('gei-filter-panel')?.classList.add('hidden');
  document.getElementById('gei-alerts-panel')?.classList.remove('panel-open');
  document.getElementById('gei-settings-panel')?.classList.remove('panel-open');
  document.getElementById('gei-drawer-overlay')?.classList.add('hidden');
}

// ─── DRAWER ───────────────────────────────────────────────────────────────────
function openDrawer(type, data) {
  const drawer  = document.getElementById('gei-drawer');
  const overlay = document.getElementById('gei-drawer-overlay');
  const body    = document.getElementById('gei-drawer-body');
  if (!drawer || !body) return;

  let html = '';
  switch (type) {
    case 'sector':      html = renderSectorDetail(data);      break;
    case 'ticker':      html = renderTickerDetail(data);      break;
    case 'georisk':     html = renderGeoRiskDetail(data);     break;
    case 'feedItem':    html = renderFeedItemDetail(data);    break;
    case 'liveBar':     html = renderFeedItemDetail(data);    break;
    case 'marketPulse': html = renderMarketPulseDetail(data); break;
    default: html = `<p class="text-on-surface-variant">${JSON.stringify(data)}</p>`;
  }

  body.innerHTML = html;
  drawer.classList.add('drawer-open');
  overlay.classList.remove('hidden');
  GEIState.set({ showDrawer: true, drawerType: type, drawerData: data });

  // wire internal buttons
  body.querySelectorAll('[data-close-drawer]').forEach(el =>
    el.addEventListener('click', closeAll)
  );
}

function closeDrawer() {
  document.getElementById('gei-drawer')?.classList.remove('drawer-open');
  document.getElementById('gei-drawer-overlay')?.classList.add('hidden');
  GEIState.set({ showDrawer: false, drawerType: null, drawerData: null });
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function openModal(type, data) {
  const overlay = document.getElementById('gei-modal-overlay');
  const modal   = document.getElementById('gei-modal');
  const body    = document.getElementById('gei-modal-body');
  const title   = document.getElementById('gei-modal-title');
  if (!overlay || !body) return;
  const anchorRect = data?.anchor?.getBoundingClientRect ? data.anchor.getBoundingClientRect() : null;
  const anchorWasInModal = !!data?.anchor?.closest?.('#gei-modal');
  overlay.classList.remove('account-popover', 'anchor-popover');
  if (modal) {
    modal.style.top = '';
    modal.style.left = '';
    modal.style.right = '';
  }

  let html = '', titleText = '';
  switch (type) {
    case 'executiveBriefing':
      titleText = 'Executive Intelligence Briefing';
      html = renderBriefingLoadingState(); break;
    case 'allReports':
      titleText = 'All Intelligence Reports';
      html = renderAllReportsModal(data); break;
    case 'footer':
      titleText = data.title;
      html = renderFooterModal(data); break;
    case 'account':
      titleText = 'Account';
      html = renderAccountModal(data); break;
    case 'dataSources':
      titleText = 'Data Sources & API Status';
      html = renderDataSourcesModal(data); break;
    case 'placeholder':
      titleText = data.title || 'Coming Soon';
      html = `<div class="p-lg"><p class="text-body-sm text-on-surface-variant leading-relaxed">${data.content || 'This workflow is ready for backend integration in a later prototype step.'}</p></div>`;
      break;
    default:
      titleText = type;
      html = `<p class="text-on-surface-variant p-md">${data?.content || ''}</p>`;
  }

  if (title) title.textContent = titleText;
  try { body.innerHTML = html; } catch(e) {
    console.error('[Modal] Render error for type:', type, e);
    body.innerHTML = `<div class="p-lg text-on-surface-variant text-body-sm">Unable to render modal content. Check console for details.</div>`;
  }
  if (type === 'account' && modal) positionAccountPopover(data?.anchor, anchorRect);
  if (type === 'dataSources' && modal) positionAnchoredPopover(data?.anchor, anchorRect, anchorWasInModal);
  overlay.classList.remove('hidden');
  GEIState.set({ showModal: true, modalType: type, modalData: data });

  // AI loading sequence for executive briefing
  if (type === 'executiveBriefing') startBriefingLoadingSequence(body, data);

  // wire search/sort in allReports
  if (type === 'allReports') wireAllReportsHandlers();
}

function positionAccountPopover(anchor, anchorRect) {
  const overlay = document.getElementById('gei-modal-overlay');
  const modal = document.getElementById('gei-modal');
  const target = anchor || document.querySelector('[data-action="profile"]');
  if (!overlay || !modal || !target) return;
  const rect = anchorRect || target.getBoundingClientRect();
  overlay.classList.add('account-popover');
  const gap = 10;
  const width = Math.min(360, window.innerWidth - 24);
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
  modal.style.top = `${Math.min(window.innerHeight - 12, rect.bottom + gap)}px`;
  modal.style.left = `${left}px`;
}

function positionAnchoredPopover(anchor, anchorRect, anchorWasInModal) {
  const overlay = document.getElementById('gei-modal-overlay');
  const modal = document.getElementById('gei-modal');
  const target = anchorWasInModal
    ? document.querySelector('[data-action="profile"]')
    : (anchor || document.querySelector('[data-action="settings"]') || document.querySelector('[data-action="profile"]'));
  if (!overlay || !modal || !target) return;
  const rect = target === anchor ? (anchorRect || target.getBoundingClientRect()) : target.getBoundingClientRect();
  overlay.classList.add('anchor-popover');
  const gap = 10;
  const width = Math.min(780, window.innerWidth - 24);
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
  const top = Math.max(12, Math.min(window.innerHeight - 80, rect.bottom + gap));
  modal.style.top = `${top}px`;
  modal.style.left = `${left}px`;
}

function closeModal() {
  document.getElementById('gei-modal-overlay')?.classList.add('hidden');
  GEIState.set({ showModal: false, modalType: null, modalData: null });
}

// ─── FILTER PANEL ─────────────────────────────────────────────────────────────
let _lastPanelToggleAt = 0;
function shouldIgnoreDuplicateToggle() {
  const now = Date.now();
  if (now - _lastPanelToggleAt < 120) return true;
  _lastPanelToggleAt = now;
  return false;
}

function toggleFilterPanel() {
  const panel = document.getElementById('gei-filter-panel');
  if (!panel) return;
  const isHidden = panel.classList.contains('hidden');
  if (!isHidden) {
    panel.classList.add('hidden');
    GEIState.set({ showFilterPanel: false });
    return;
  }
  closeAll();
  panel.innerHTML = renderFilterPanel();
  panel.classList.remove('hidden');
  panel.dataset.openedAt = String(Date.now());
  wireFilterHandlers();
  GEIState.set({ showFilterPanel: true });
}

// ─── ALERTS PANEL ─────────────────────────────────────────────────────────────
function toggleAlertPanel() {
  const panel = document.getElementById('gei-alerts-panel');
  if (!panel) return;
  const isOpen = panel.classList.contains('panel-open');
  if (isOpen) return;
  closeAll();
  if (!isOpen) {
    panel.innerHTML = renderAlertsPanel();
    panel.classList.add('panel-open');
    panel.dataset.openedAt = String(Date.now());
    document.getElementById('gei-drawer-overlay')?.classList.remove('hidden');
    GEIState.set({ showAlertPanel: true });
    panel.querySelector('[data-close-panel]')?.addEventListener('click', closeAll);
  }
}

// ─── SETTINGS PANEL ───────────────────────────────────────────────────────────
function toggleSettingsPanel() {
  const panel = document.getElementById('gei-settings-panel');
  if (!panel) return;
  const isOpen = panel.classList.contains('panel-open');
  if (isOpen) return;
  closeAll();
  if (!isOpen) {
    panel.innerHTML = renderSettingsPanel();
    panel.classList.add('panel-open');
    panel.dataset.openedAt = String(Date.now());
    document.getElementById('gei-drawer-overlay')?.classList.remove('hidden');
    GEIState.set({ showSettingsPanel: true });
    wireSettingsHandlers();
    panel.querySelector('[data-close-panel]')?.addEventListener('click', closeAll);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT RENDERERS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── SECTOR DETAIL ────────────────────────────────────────────────────────────
function renderSectorDetail(s) {
  const si = getSentimentLabel(s.sentiment);
  const ri = getRiskLevel(s.riskLevel);
  const relHeadlines = intelligenceFeed.filter(h =>
    h.sector === s.sector || (h.relatedSectors && h.relatedSectors.includes(s.sector))
  );
  const bars = (s.sparklineData || []).slice(-8).map((v, i, arr) => {
    const max = Math.max(...arr);
    const h   = Math.max(4, Math.round((v / max) * 48));
    const col = s.sentiment === 'Bearish' ? '#93000a' :
                s.sentiment === 'Volatile'? '#d29922' : '#58a6ff';
    return `<div style="width:10px;height:${h}px;background:${col};border-radius:1px"></div>`;
  }).join('');

  return `
    <div class="space-y-lg">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-label-md text-on-surface-variant mb-xs">${s.sector.toUpperCase()}</p>
          <p class="text-headline-sm font-bold">${s.confidence}% Confidence</p>
          <p class="text-body-sm ${s.changeVsYesterday?.startsWith('+') ? 'text-primary':'text-error'} mt-xs">${s.changeVsYesterday} vs yesterday</p>
        </div>
        <span class="text-[11px] px-2 py-1 border ${si.borderClass} ${si.colorClass} rounded-sm tracking-wider font-bold">${si.label}</span>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">AI CONFIDENCE TREND</p>
        <div class="flex items-end gap-1 h-12">${bars}</div>
        <p class="text-[10px] text-outline mt-xs">Last 8 analysis cycles</p>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">AI REASON</p>
        <p class="text-body-sm text-on-surface leading-relaxed">${s.reason}</p>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">WATCH ITEM</p>
        <span class="text-[10px] font-mono-data text-tertiary border border-tertiary/40 px-2 py-0.5 rounded">⚑ ${s.watchItem}</span>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-sm">RISK LEVEL</p>
        <div class="flex items-center gap-sm">
          <span class="text-body-sm font-bold ${ri.colorClass}">${ri.label}</span>
          <div class="flex-1 bg-outline-variant h-1 rounded-full">
            <div class="${getGeoRiskBarColorByLevel(s.riskLevel)} h-full rounded-full" style="width:${s.riskLevel==='Critical'?92:s.riskLevel==='High'?75:s.riskLevel==='Moderate'?50:25}%"></div>
          </div>
        </div>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-sm">AFFECTED REGIONS</p>
        <div class="flex flex-wrap gap-xs">
          ${(s.affectedRegions||[]).map(r=>`<span class="text-[10px] px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded-full border border-outline-variant">${r}</span>`).join('')}
        </div>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-sm">TOP RISK FACTORS</p>
        <ul class="space-y-xs">
          ${(s.topRiskFactors||[]).map((f,i)=>`
          <li class="flex gap-sm text-body-sm text-on-surface-variant">
            <span class="text-tertiary font-mono-data text-xs mt-0.5">${String(i+1).padStart(2,'0')}</span>
            <span>${f}</span>
          </li>`).join('')}
        </ul>
      </div>

      ${relHeadlines.length ? `
      <div>
        <p class="text-label-md text-on-surface-variant mb-sm">RELATED HEADLINES</p>
        <div class="space-y-sm">
          ${relHeadlines.map(h=>`
          <div class="p-sm bg-surface-container-high rounded border border-outline-variant/50">
            <div class="flex items-center gap-xs mb-xs">
              ${getImpactBadgeHtml(h.impact)}
              <span class="text-[10px] text-outline">${h.time}</span>
            </div>
            <p class="text-body-sm text-on-surface leading-snug">${h.headline}</p>
            <p class="text-[10px] text-outline mt-xs">${h.source}</p>
          </div>`).join('')}
        </div>
      </div>` : ''}

      <button onclick="openModal('executiveBriefing', executiveBriefing)"
              class="w-full py-sm bg-primary-container text-on-primary-container text-label-md font-bold rounded flex items-center justify-center gap-xs hover:brightness-110 transition-all">
        ${geiIcon('data_exploration')}
        VIEW FULL ANALYSIS
      </button>
    </div>
  `;
}

// ─── TICKER DETAIL ────────────────────────────────────────────────────────────
function renderTickerDetail(item) {
  const colorClass = item.direction === 'up' ? 'text-primary' :
                     item.direction === 'down'? 'text-error' : 'text-outline';
  const prefix     = item.changePercent > 0 ? '+' : '';
  const sector     = sectorScores.find(s =>
    item.id === 'WTI'     && s.sector === 'Crude Oil'        ||
    item.id === 'BRENT'   && s.sector === 'Crude Oil'        ||
    item.id === 'NATGAS'  && s.sector === 'Natural Gas'      ||
    item.id === 'DIESEL'  && s.sector === 'Refined Products' ||
    item.id === 'GASOLINE'&& s.sector === 'Refined Products' ||
    item.id === 'EU_POWER'&& s.sector === 'Power'
  );

  const hist  = historicalTrends[sector?.id] || historicalTrends['crude-oil'];
  const trend = renderMiniLineChart(hist);
  const relH  = intelligenceFeed.filter(h => h.sector === (sector?.sector || 'Crude Oil') || (h.relatedCommodities||[]).some(c => c.toUpperCase().includes(item.id))).slice(0,3);
  const cmp   = typeof priceComparison !== 'undefined' ? (priceComparison[item.id] || null) : null;

  const periodRow = (label, val) => {
    if (val === undefined || val === null) return '';
    const col = val > 0 ? 'text-primary' : val < 0 ? 'text-error' : 'text-outline';
    const sign = val > 0 ? '+' : '';
    return `<div class="flex justify-between items-center py-xs border-b border-outline-variant/40 last:border-0">
      <span class="text-body-sm text-on-surface-variant">${label}</span>
      <span class="font-mono-data text-body-sm font-bold ${col}">${sign}${val.toFixed(1)}%</span>
    </div>`;
  };

  return `
    <div class="space-y-md">
      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">${item.name.toUpperCase()}</p>
        <p class="text-headline-lg font-bold">${item.currency}${item.price.toFixed(2)}</p>
        <p class="text-body-lg ${colorClass} font-mono-data">${prefix}${item.changePercent.toFixed(1)}% <span class="text-body-sm text-outline">${item.unit}</span></p>
        <p class="text-[10px] text-outline mt-xs">Source: ${item.source}</p>
      </div>

      ${cmp ? `
      <div class="bg-surface-container-high p-sm rounded border border-outline-variant">
        <p class="text-label-md text-on-surface-variant mb-sm">PERIOD COMPARISON</p>
        ${periodRow('Daily', cmp.dailyChange)}
        ${periodRow('This Month', cmp.monthChange)}
        ${periodRow('3 Months', cmp.threeMonthChange)}
        ${periodRow('Year to Date', cmp.ytdChange)}
        ${periodRow('1 Year', cmp.oneYearChange)}
      </div>` : ''}

      <div>
        <p class="text-label-md text-on-surface-variant mb-sm">7-DAY PRICE TREND</p>
        ${trend}
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">RELATED SECTOR</p>
        ${sector ? `
        <div class="p-sm bg-surface-container-high rounded border border-outline-variant cursor-pointer hover:border-primary transition-colors"
             onclick="closeAll(); openDrawer('sector', sectorScores.find(s=>s.id==='${sector.id}'))">
          <div class="flex justify-between">
            <span class="text-body-sm font-bold">${sector.sector}</span>
            <span class="text-[10px] ${getSentimentLabel(sector.sentiment).colorClass}">${sector.sentiment.toUpperCase()}</span>
          </div>
          <p class="text-[10px] text-outline mt-xs">AI Confidence: ${sector.confidence}% · Click for detail →</p>
        </div>` : '<p class="text-body-sm text-on-surface-variant">—</p>'}
      </div>

      ${relH.length ? `
      <div>
        <p class="text-label-md text-on-surface-variant mb-sm">RELATED INTELLIGENCE</p>
        <div class="space-y-xs">
          ${relH.map(h=>`
          <div class="p-xs bg-surface-container-high rounded border border-outline-variant/50 cursor-pointer hover:border-primary/40 transition-colors" onclick="closeAll();openDrawer('feedItem',intelligenceFeed.find(i=>i.id==='${h.id}'))">
            ${getImpactBadgeHtml(h.impact)}
            <p class="text-body-sm text-on-surface leading-snug mt-xs">${h.headline}</p>
            <p class="text-[10px] text-outline">${h.time || formatTimestamp(h.timestamp||'')} · ${h.source}</p>
          </div>`).join('')}
        </div>
      </div>` : ''}
    </div>
  `;
}

// ─── GEO RISK DETAIL ─────────────────────────────────────────────────────────
function renderGeoRiskDetail(risk) {
  const ri = getRiskLevel(risk.riskLevel);
  const relH = intelligenceFeed.filter(h =>
    (h.relatedRegions || []).some(r => risk.countryOrArea.includes(r) || r.includes(risk.region))
  ).slice(0,3);

  return `
    <div class="space-y-lg">
      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">GEO-RISK REGION</p>
        <p class="text-headline-sm font-bold">${risk.countryOrArea}</p>
        <p class="text-body-sm text-on-surface-variant">${risk.region}</p>
      </div>

      <div class="flex items-center gap-md">
        <div>
          <p class="text-label-md text-on-surface-variant">RISK SCORE</p>
          <p class="text-headline-md font-bold ${ri.colorClass}">${risk.riskScore}</p>
        </div>
        <div>
          <p class="text-label-md text-on-surface-variant">RISK LEVEL</p>
          <span class="text-body-sm font-bold ${ri.colorClass} border ${ri.colorClass.replace('text-','border-')} px-2 py-0.5 rounded-sm">${ri.label}</span>
        </div>
      </div>

      <div class="w-full bg-outline-variant h-2 rounded-full">
        <div class="${getGeoRiskBarColorByLevel(risk.riskLevel)} h-full rounded-full transition-all duration-1000" style="width:${risk.riskScore*10}%"></div>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">EVENT TYPE</p>
        <span class="text-[10px] px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded border border-outline-variant">${risk.eventType.toUpperCase()}</span>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">AFFECTED SECTORS</p>
        <div class="flex flex-wrap gap-xs">
          ${(risk.affectedSectors||[]).map(s=>`
          <span class="text-[10px] px-2 py-0.5 bg-surface-container-high border border-outline-variant rounded-full text-on-surface-variant cursor-pointer hover:border-primary"
                onclick="closeAll();openDrawer('sector',sectorScores.find(sec=>sec.sector==='${s}'))">${s}</span>
          `).join('')}
        </div>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">MARKET IMPACT</p>
        <p class="text-body-sm text-on-surface leading-relaxed">${risk.marketImpact}</p>
      </div>

      <div class="grid grid-cols-2 gap-sm">
        <div>
          <p class="text-label-md text-on-surface-variant">SOURCE</p>
          <p class="text-body-sm text-on-surface">${risk.source}</p>
        </div>
        <div>
          <p class="text-label-md text-on-surface-variant">UPDATED</p>
          <p class="text-body-sm text-on-surface">${formatTimestamp(risk.timestamp)}</p>
        </div>
      </div>

      ${relH.length ? `
      <div>
        <p class="text-label-md text-on-surface-variant mb-sm">RELATED HEADLINES</p>
        <div class="space-y-sm">
          ${relH.map(h=>`
          <div class="p-sm bg-surface-container-high rounded border border-outline-variant/50">
            ${getImpactBadgeHtml(h.impact)}
            <p class="text-body-sm text-on-surface mt-xs">${h.headline}</p>
            <p class="text-[10px] text-outline">${h.time} · ${h.source}</p>
          </div>`).join('')}
        </div>
      </div>` : ''}
    </div>
  `;
}

// ─── FEED ITEM DETAIL ─────────────────────────────────────────────────────────
function renderFeedItemDetail(item) {
  if (typeof isEnergyRelevantHeadlineClient === 'function' && !isEnergyRelevantHeadlineClient(item)) {
    return `
      <div class="space-y-md">
        <p class="text-label-md text-error font-bold">FILTERED OUT</p>
        <p class="text-body-sm text-on-surface-variant leading-relaxed">
          This item was excluded because it is not energy-market relevant.
        </p>
      </div>`;
  }
  const badge = getImpactBadge(item.impact);
  const sentColor = { Bullish:'text-primary', Bearish:'text-error', Neutral:'text-on-surface-variant', Volatile:'text-tertiary', 'Risk Elevated':'text-tertiary' }[item.sentimentEffect] || 'text-on-surface-variant';
  const sourceStatusClasses = {
    'Live':    'text-primary bg-primary-container/20 border-primary/40',
    'Mock':    'text-tertiary bg-tertiary-container/20 border-tertiary/40',
    'Derived': 'text-on-surface-variant bg-surface-container-high border-outline-variant'
  }[item.sourceStatus] || 'text-outline bg-surface-container border-outline-variant';
  const allSectors = [...new Set([...(item.affectedSectors||[]), ...(item.relatedSectors||[])])];

  return `
    <div class="space-y-md">
      <div class="flex items-start justify-between gap-sm flex-wrap">
        <div class="flex items-center gap-xs flex-wrap">
          ${item.isBreaking ? '<span class="text-[10px] px-2 py-0.5 bg-error text-on-error font-bold rounded animate-pulse shrink-0">BREAKING</span>' : ''}
          <span class="${badge.bg} ${badge.text} text-[10px] px-2 py-0.5 font-bold rounded">${badge.label}</span>
        </div>
        ${item.sourceStatus ? `<span class="text-[10px] px-2 py-0.5 font-bold rounded border ${sourceStatusClasses}">${item.sourceStatus.toUpperCase()}</span>` : ''}
      </div>

      <div>
        <p class="text-body-lg font-bold text-on-surface leading-snug">${item.title || item.headline}</p>
      </div>

      <div class="grid grid-cols-2 gap-sm">
        <div><p class="text-label-md text-on-surface-variant mb-xs">SOURCE</p><p class="text-body-sm text-on-surface">${item.source}</p></div>
        <div><p class="text-label-md text-on-surface-variant mb-xs">PUBLISHED</p><p class="text-body-sm text-on-surface font-mono-data">${formatTimestamp(item.timestamp || '')}</p></div>
        <div><p class="text-label-md text-on-surface-variant mb-xs">SECTOR</p><p class="text-body-sm text-on-surface">${item.sector}</p></div>
        <div><p class="text-label-md text-on-surface-variant mb-xs">CATEGORY</p><p class="text-body-sm text-on-surface">${item.category || item.eventType || '—'}</p></div>
        <div><p class="text-label-md text-on-surface-variant mb-xs">IMPACT</p><p class="text-body-sm font-bold ${badge.text}">${item.impact}</p></div>
        <div><p class="text-label-md text-on-surface-variant mb-xs">SENTIMENT</p><p class="text-body-sm font-bold ${sentColor}">${item.sentimentEffect}</p></div>
        <div><p class="text-label-md text-on-surface-variant mb-xs">REGION</p><p class="text-body-sm text-on-surface">${item.region || '—'}</p></div>
        ${item.geoRiskRegion ? `<div><p class="text-label-md text-on-surface-variant mb-xs">GEO-RISK ZONE</p><p class="text-body-sm text-on-surface">${item.geoRiskRegion}</p></div>` : '<div></div>'}
      </div>

      <div class="bg-surface-container-highest p-sm rounded border border-primary/20">
        <p class="text-label-md text-primary mb-xs">WHY IT MATTERS</p>
        <p class="text-body-sm text-on-surface leading-relaxed">${item.whyItMatters}</p>
      </div>

      ${(item.marketImpact || item.context) ? `
      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">MARKET IMPACT</p>
        <p class="text-body-sm text-on-surface-variant leading-relaxed">${item.marketImpact || item.context}</p>
      </div>` : ''}

      ${(item.relatedCommodities||[]).length ? `
      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">RELATED COMMODITIES</p>
        <div class="flex flex-wrap gap-xs">
          ${item.relatedCommodities.map(c=>`<span class="text-[10px] px-2 py-0.5 bg-surface-container-high border border-outline-variant rounded-full text-on-surface-variant">${c}</span>`).join('')}
        </div>
      </div>` : ''}

      ${allSectors.length ? `
      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">AFFECTED SECTORS</p>
        <div class="flex flex-wrap gap-xs">
          ${allSectors.map(s=>`
          <span class="text-[10px] px-2 py-0.5 bg-surface-container-high border border-outline-variant rounded-full text-on-surface-variant cursor-pointer hover:border-primary transition-colors"
                onclick="closeAll();const sec=sectorScores.find(x=>x.sector==='${s}');if(sec)openDrawer('sector',sec)">${s}</span>
          `).join('')}
        </div>
      </div>` : ''}

      ${(item.whatToWatch||[]).length ? `
      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">WHAT TO WATCH NEXT</p>
        <ul class="space-y-xs">
          ${item.whatToWatch.map(w=>`<li class="flex gap-sm items-start"><span class="text-tertiary font-mono-data text-xs mt-0.5">→</span><span class="text-body-sm text-on-surface-variant">${w}</span></li>`).join('')}
        </ul>
      </div>` : ''}

      ${(item.relatedRegions||[]).length ? `
      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">RELATED REGIONS</p>
        <div class="flex flex-wrap gap-xs">
          ${item.relatedRegions.map(r=>`<span class="text-[10px] px-2 py-0.5 bg-surface-container-high border border-outline-variant rounded-full text-on-surface-variant">${r}</span>`).join('')}
        </div>
      </div>` : ''}

      <div class="flex items-center justify-between pt-sm border-t border-outline-variant">
        ${item.confidence !== undefined ? `
        <div class="flex items-center gap-sm">
          <span class="text-[10px] text-outline">AI CONFIDENCE</span>
          <div class="w-20 bg-outline-variant h-1.5 rounded-full overflow-hidden">
            <div class="${item.confidence>=80?'bg-primary':item.confidence>=60?'bg-tertiary':'bg-error'} h-full rounded-full" style="width:${item.confidence}%"></div>
          </div>
          <span class="text-[10px] font-mono-data font-bold text-primary">${item.confidence}%</span>
        </div>` : '<div></div>'}
        ${item.sourceStatus ? `<span class="text-[10px] px-2 py-0.5 font-bold rounded border ${sourceStatusClasses}">${item.sourceStatus.toUpperCase()}</span>` : ''}
      </div>
    </div>
  `;
}

// ─── MARKET PULSE DETAIL ──────────────────────────────────────────────────────
function renderMarketPulseDetail(data) {
  const { field, pulse } = data;
  const fieldLabels = {
    direction: { label:'Market Direction',     icon:'trending_up', color:'text-primary' },
    risk:      { label:'Global Risk Level',    icon:'warning',     color:'text-tertiary' },
    sector:    { label:'Most Affected Sector', icon:'hub',         color:'text-on-surface' },
    region:    { label:'Key Region',           icon:'public',      color:'text-on-surface' },
    event:     { label:'Biggest Event',        icon:'event',       color:'text-on-surface' }
  };
  const fi = fieldLabels[field] || { label: field, icon:'info', color:'text-on-surface' };
  const valueMap = {
    direction: pulse.marketDirection,
    risk:      pulse.globalRiskLevel,
    sector:    pulse.mostAffectedSector,
    region:    pulse.keyRegion,
    event:     pulse.biggestEvent
  };
  const descriptions = {
    direction: 'Market Direction reflects the weighted-average sentiment across all five energy sectors in this analysis cycle. Stable-Bullish means most sectors lean positive with limited downside risk.',
    risk:      'Global Risk Level is derived from the combined score of active geopolitical events, shipping chokepoint activity, sanction events, and headline impact density.',
    sector:    'Most Affected Sector is the sector with the highest combined score of sentiment change, risk level, and headline impact this cycle.',
    region:    'Key Region is the geographic area most frequently implicated across high-impact events in the current analysis cycle.',
    event:     'Biggest Event is the single highest-priority event from the current intelligence cycle, weighted by impact, recency, and source confidence.'
  };

  const relSectors = sectorScores.filter(s =>
    field === 'sector' ? s.sector === pulse.mostAffectedSector : true
  ).slice(0, 3);

  return `
    <div class="space-y-lg">
      <div class="flex items-center gap-sm">
        ${geiIcon(fi.icon, fi.color)}
        <div>
          <p class="text-label-md text-on-surface-variant">${fi.label.toUpperCase()}</p>
          <p class="text-headline-sm font-bold ${fi.color}">${valueMap[field]}</p>
        </div>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">WHAT THIS MEANS</p>
        <p class="text-body-sm text-on-surface-variant leading-relaxed">${descriptions[field] || ''}</p>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">WHY IT CHANGED</p>
        <p class="text-body-sm text-on-surface leading-relaxed">${executiveBriefing.whatChanged}</p>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-sm">RELATED SECTORS</p>
        <div class="space-y-xs">
          ${relSectors.map(s=>`
          <div class="flex items-center justify-between p-sm bg-surface-container-high rounded border border-outline-variant cursor-pointer hover:border-primary"
               onclick="closeAll();openDrawer('sector',sectorScores.find(x=>x.id==='${s.id}'))">
            <span class="text-body-sm text-on-surface">${s.sector}</span>
            <span class="text-[10px] ${getSentimentLabel(s.sentiment).colorClass}">${s.sentiment}</span>
          </div>`).join('')}
        </div>
      </div>

      <div>
        <p class="text-label-md text-on-surface-variant mb-xs">LAST UPDATED</p>
        <p class="text-body-sm font-mono-data text-on-surface-variant">${formatTimestamp(pulse.lastUpdated)}</p>
      </div>
    </div>
  `;
}

// ─── EXECUTIVE BRIEFING — AI LOADING STATE ───────────────────────────────────
function renderBriefingLoadingState() {
  const steps = [
    'Analyzing price movement...',
    'Reading live headlines...',
    'Mapping geopolitical risk...',
    'Scoring sector sentiment...',
    'Generating executive briefing...'
  ];
  return `
    <div class="flex flex-col items-center justify-center p-xl space-y-lg" id="briefing-loading-state" style="min-height:360px">
      <div class="flex items-center gap-sm">
        <span class="gei-icon text-primary animate-spin-slow">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
        </span>
        <p class="text-label-md text-primary font-bold tracking-widest" id="briefing-loading-text">Initializing AI analysis...</p>
      </div>
      <div class="w-full max-w-xs space-y-sm" id="briefing-loading-steps">
        ${steps.map((s, i) => `
        <div class="flex items-center gap-sm opacity-20 transition-opacity duration-300" id="briefing-step-${i}">
          <span class="w-2 h-2 rounded-full bg-outline-variant shrink-0 transition-colors duration-300" id="briefing-step-dot-${i}"></span>
          <span class="text-body-sm text-on-surface-variant">${s}</span>
        </div>`).join('')}
      </div>
      <div class="w-full max-w-xs bg-outline-variant h-0.5 rounded-full overflow-hidden">
        <div class="h-full bg-primary rounded-full transition-all duration-400" id="briefing-progress" style="width:0%"></div>
      </div>
      <p class="text-[10px] text-outline italic">AI analyzing live market signals…</p>
    </div>`;
}

function startBriefingLoadingSequence(body, briefing) {
  const steps = [
    { delay: 220,  text: 'Analyzing price movement...', progress: 20 },
    { delay: 520,  text: 'Reading live headlines...', progress: 40 },
    { delay: 820,  text: 'Mapping geopolitical risk...', progress: 60 },
    { delay: 1100, text: 'Scoring sector sentiment...', progress: 80 },
    { delay: 1380, text: 'Generating executive briefing...', progress: 95 }
  ];
  steps.forEach((step, idx) => {
    setTimeout(() => {
      if (!document.getElementById('briefing-loading-state')) return;
      const textEl     = document.getElementById('briefing-loading-text');
      const progressEl = document.getElementById('briefing-progress');
      const stepEl     = document.getElementById(`briefing-step-${idx}`);
      const dotEl      = document.getElementById(`briefing-step-dot-${idx}`);
      if (textEl) textEl.textContent = step.text;
      if (progressEl) progressEl.style.width = `${step.progress}%`;
      if (stepEl) { stepEl.classList.remove('opacity-20'); stepEl.classList.add('opacity-100'); }
      if (dotEl)  { dotEl.classList.remove('bg-outline-variant'); dotEl.classList.add('bg-primary'); }
      for (let j = 0; j < idx; j++) {
        const prev = document.getElementById(`briefing-step-dot-${j}`);
        if (prev) prev.classList.add('bg-primary');
      }
    }, step.delay);
  });
  setTimeout(() => {
    if (body && document.getElementById('briefing-loading-state')) {
      body.innerHTML = renderExecutiveBriefingModal(briefing);
    }
  }, 1750);
}

// ─── EXECUTIVE BRIEFING MODAL ─────────────────────────────────────────────────
function renderExecutiveBriefingModal(briefing) {
  return `
    <div class="space-y-lg p-lg">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div class="bg-surface-container-high p-md rounded border border-outline-variant">
          <h4 class="text-label-md text-primary font-bold uppercase mb-sm">• WHAT CHANGED?</h4>
          <p class="text-body-md text-on-surface italic leading-relaxed">"${briefing.whatChanged}"</p>
        </div>
        <div class="bg-surface-container-high p-md rounded border border-outline-variant">
          <h4 class="text-label-md text-primary font-bold uppercase mb-sm">• WHY IT MATTERS</h4>
          <p class="text-body-sm text-on-surface-variant leading-relaxed">${briefing.whyItMatters}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div class="bg-surface-container-high p-md rounded border border-outline-variant">
          <h4 class="text-label-md text-tertiary font-bold uppercase mb-sm">• WHAT TO WATCH NEXT</h4>
          <ul class="space-y-xs">
            ${(briefing.whatToWatchNext||[]).map((w,i)=>`
            <li class="flex gap-sm text-body-sm text-on-surface-variant">
              <span class="text-tertiary font-mono-data text-xs mt-0.5">${String(i+1).padStart(2,'0')}</span>
              ${w}
            </li>`).join('')}
          </ul>
        </div>
        <div class="bg-surface-container-high p-md rounded border border-outline-variant">
          <h4 class="text-label-md text-tertiary font-bold uppercase mb-sm">• STRATEGY BRIEF</h4>
          <ul class="space-y-xs">
            ${(briefing.strategyBrief||[]).map((s,i)=>`
            <li class="flex gap-sm text-body-sm text-on-surface">
              <span class="text-tertiary font-mono-data text-xs mt-0.5">${String(i+1).padStart(2,'0')}</span>
              ${s}
            </li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="bg-surface-container-high p-md rounded border border-outline-variant">
        <h4 class="text-label-md text-on-surface-variant font-bold uppercase mb-sm">RISK SUMMARY</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-sm">
          ${geoRiskItems.slice(0,3).map(r=>`
          <div class="p-sm bg-background rounded border border-outline-variant">
            <div class="flex justify-between items-center mb-xs">
              <span class="text-body-sm font-bold text-on-surface">${r.countryOrArea}</span>
              <span class="text-[10px] ${getRiskLevel(r.riskLevel).colorClass} font-bold">${r.riskScore}</span>
            </div>
            <p class="text-[10px] text-on-surface-variant">${r.eventType}</p>
          </div>`).join('')}
        </div>
      </div>

      ${typeof crossMarketSignalSummary !== 'undefined' && crossMarketSignalSummary.overallCrossMarketRead ? `
      <div class="bg-surface-container-high p-md rounded border border-outline-variant">
        <h4 class="text-label-md text-on-surface-variant font-bold uppercase mb-sm">CROSS-MARKET READ</h4>
        <p class="text-body-sm text-on-surface-variant italic leading-relaxed">${crossMarketSignalSummary.overallCrossMarketRead}</p>
        <div class="grid grid-cols-2 gap-xs mt-sm">
          ${['gold','copper','wheat','uranium','lithium'].map(k => crossMarketSignalSummary[k] ? `
          <div class="p-xs bg-background rounded border border-outline-variant/50">
            <p class="text-[9px] text-outline uppercase font-bold">${k}</p>
            <p class="text-[10px] text-on-surface-variant leading-snug">${crossMarketSignalSummary[k]}</p>
          </div>` : '').join('')}
        </div>
      </div>` : ''}

      <div class="flex items-center justify-between pt-sm border-t border-outline-variant flex-wrap gap-sm">
        <p class="text-[10px] text-outline font-mono-data">Generated: ${formatTimestamp(briefing.generatedAt)} · ${briefing.modelVersion || 'GEI-AI-v2.4'} · Cycle: ${briefing.cycleId || '—'}</p>
        <div class="flex items-center gap-xs">
          <span class="text-[10px] px-2 py-0.5 border border-primary/30 text-primary rounded font-bold">AI CONFIDENCE: ${briefing.analysisConfidence || marketPulse.analysisConfidence || 82}%</span>
          <span class="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant border border-outline-variant rounded">${GEIState.get('dataMode') === 'live' ? 'Live AI Analysis' : 'Derived from live signals'}</span>
        </div>
      </div>
    </div>
  `;
}

// ─── ALL REPORTS MODAL ────────────────────────────────────────────────────────
function renderAllReportsModal(data) {
  const items = intelligenceFeed;
  const state = GEIState.get();
  return `
    <div class="p-md space-y-md">
      <div class="flex gap-sm flex-wrap">
        <input id="reports-search" placeholder="Search headlines..." value="${state.allReportsSearch || ''}"
               class="flex-1 min-w-[200px] bg-surface-container border border-outline-variant rounded px-sm py-xs text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"/>
        <select id="reports-sort" class="bg-surface-container border border-outline-variant rounded px-sm py-xs text-body-sm text-on-surface focus:outline-none focus:border-primary">
          <option value="newest" ${state.allReportsSort==='newest'?'selected':''}>Newest First</option>
          <option value="impact" ${state.allReportsSort==='impact'?'selected':''}>By Impact</option>
          <option value="sector" ${state.allReportsSort==='sector'?'selected':''}>By Sector</option>
        </select>
        <select id="reports-filter-impact" class="bg-surface-container border border-outline-variant rounded px-sm py-xs text-body-sm text-on-surface focus:outline-none focus:border-primary">
          <option value="All">All Impact</option>
          <option value="High Impact">High Impact</option>
          <option value="Medium Impact">Medium Impact</option>
          <option value="Low Impact">Low Impact</option>
        </select>
      </div>
      <div id="reports-list" class="space-y-sm max-h-[60vh] overflow-y-auto custom-scrollbar">
        ${renderReportsList(items, state.allReportsLimit || 5)}
      </div>
    </div>
  `;
}

function renderReportsList(items, limit = items.length) {
  const visible = items.slice(0, limit);
  const rows = visible.map(h => {
    const badge = getImpactBadge(h.impact);
    return `
    <div class="p-sm bg-surface-container-high rounded border border-outline-variant hover:border-primary cursor-pointer transition-colors"
         onclick="closeModal();openDrawer('feedItem', intelligenceFeed.find(i=>i.id==='${h.id}'))">
      <div class="flex items-center gap-sm mb-xs flex-wrap">
        <span class="${badge.bg} ${badge.text} text-[10px] px-2 py-0.5 font-bold rounded">${badge.label}</span>
        <span class="text-[10px] px-1.5 py-0.5 bg-surface-container text-on-surface-variant rounded">${h.sector}</span>
        <span class="text-[10px] text-outline">${h.time}</span>
      </div>
      <p class="text-body-sm text-on-surface font-bold">${h.headline}</p>
      <p class="text-[10px] text-outline mt-xs">${h.source}</p>
    </div>`;
  }).join('') || '<p class="text-body-sm text-on-surface-variant p-sm">No results found.</p>';
  const loadMore = items.length > visible.length
    ? `<button id="reports-load-more" class="w-full py-sm text-label-md text-primary hover:underline border border-outline-variant rounded">Load more (${items.length - visible.length} remaining)</button>`
    : '';
  return `${rows}${loadMore}`;
}

function wireAllReportsHandlers() {
  const search = document.getElementById('reports-search');
  const sort   = document.getElementById('reports-sort');
  const filter = document.getElementById('reports-filter-impact');
  const list   = document.getElementById('reports-list');

  function update() {
    const q  = (search?.value || '').toLowerCase();
    const s  = sort?.value || 'newest';
    const fi = filter?.value || 'All';
    let items = [...intelligenceFeed];
    if (q)          items = items.filter(i => i.headline.toLowerCase().includes(q) || i.source.toLowerCase().includes(q));
    if (fi !== 'All') items = items.filter(i => i.impact === fi);
    if (s === 'impact') items.sort((a,b)=>['High Impact','Medium Impact','Low Impact'].indexOf(a.impact)-['High Impact','Medium Impact','Low Impact'].indexOf(b.impact));
    else if (s === 'sector') items.sort((a,b)=>a.sector.localeCompare(b.sector));
    if (list) {
      const limit = GEIState.get('allReportsLimit') || 5;
      list.innerHTML = renderReportsList(items, limit);
      document.getElementById('reports-load-more')?.addEventListener('click', () => {
        GEIState.set({ allReportsLimit: limit + 5 });
        update();
      });
    }
  }
  search?.addEventListener('input',  update);
  sort?.addEventListener('change',   update);
  filter?.addEventListener('change', update);
  update();
}

// ─── FILTER PANEL ─────────────────────────────────────────────────────────────
function renderFilterPanel() {
  const f = GEIState.get('activeFilters');
  const opt = (val, cur, key) =>
    `<button class="text-left px-sm py-xs rounded text-body-sm transition-colors ${cur===val?'bg-primary-container text-on-primary-container':'text-on-surface-variant hover:bg-surface-container-high'}"
             data-filter-key="${key}" data-filter-val="${val}">${val}</button>`;

  return `
    <div class="w-72 bg-surface-container border border-outline-variant rounded-xl shadow-2xl p-md space-y-md">
      <div class="flex items-center justify-between">
        <h3 class="text-label-md font-bold text-on-surface-variant tracking-widest">FILTERS</h3>
        <button onclick="GEIState.reset();toggleFilterPanel()" class="text-[10px] text-primary hover:underline">Reset All</button>
      </div>

      <div>
        <p class="text-[10px] text-outline mb-xs uppercase tracking-wider">Sector</p>
        <div class="grid grid-cols-2 gap-xs">
          ${['All','Crude Oil','Natural Gas','Refined Products','Power','Renewables'].map(v=>opt(v,f.sector,'sector')).join('')}
        </div>
      </div>

      <div>
        <p class="text-[10px] text-outline mb-xs uppercase tracking-wider">Impact</p>
        <div class="flex flex-col gap-xs">
          ${['All','High Impact','Medium Impact','Low Impact'].map(v=>opt(v,f.impact,'impact')).join('')}
        </div>
      </div>

      <div>
        <p class="text-[10px] text-outline mb-xs uppercase tracking-wider">Region</p>
        <div class="grid grid-cols-2 gap-xs">
          ${['All','Middle East','Europe','North America','Asia-Pacific','West Africa'].map(v=>opt(v,f.region,'region')).join('')}
        </div>
      </div>

      <div>
        <p class="text-[10px] text-outline mb-xs uppercase tracking-wider">Time</p>
        <div class="flex flex-wrap gap-xs">
          ${['Today','24H','7D','30D'].map(v=>opt(v,f.time,'time')).join('')}
        </div>
      </div>

      <div>
        <p class="text-[10px] text-outline mb-xs uppercase tracking-wider">Risk Level</p>
        <div class="flex flex-wrap gap-xs">
          ${['All','Low','Moderate','High','Critical'].map(v=>opt(v,f.risk,'risk')).join('')}
        </div>
      </div>

      <button onclick="toggleFilterPanel()"
              class="w-full py-sm bg-primary-container text-on-primary-container text-label-md font-bold rounded hover:brightness-110">
        Apply Filters
      </button>
    </div>
  `;
}

function wireFilterHandlers() {
  document.querySelectorAll('#gei-filter-panel [data-filter-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.filterKey;
      const val = btn.dataset.filterVal;
      GEIState.setNested(`activeFilters.${key}`, val);
      // Re-render filter panel to show active state
      document.getElementById('gei-filter-panel').innerHTML = renderFilterPanel();
      wireFilterHandlers();
      // Apply to feeds
      applyFiltersToUI();
    });
  });
}

function applyFiltersToUI() {
  const filters = GEIState.get('activeFilters');
  // Filter intelligence feed
  const feedContainer = document.querySelector('[data-intelligence-feed]');
  if (feedContainer) {
    const filtered = applyAllFilters(intelligenceFeed, filters);
    feedContainer.className = '';
    feedContainer.innerHTML = filtered.map(h => renderAIReportCard(h)).join('') ||
      '<p class="p-xs text-body-sm text-on-surface-variant">No results for selected filters.</p>';
    wireIntelFeedClicks();
    const countEl = document.getElementById('intel-feed-count');
    if (countEl) countEl.textContent = `${filtered.length}`;
  }
  // Filter live feed panel
  const filtered2 = applyAllFilters(liveFeedItems, filters);
  renderLiveFeedPanelItems(filtered2);

  // Filter sector cards without changing the underlying layout style.
  document.querySelectorAll('[data-sector-id]').forEach(card => {
    const sector = sectorScores.find(s => s.id === card.dataset.sectorId);
    const visible = !sector || filters.sector === 'All' || sector.sector === filters.sector;
    card.classList.toggle('hidden', !visible);
  });

  // Filter risk rows and map markers by sector, region, and risk level.
  document.querySelectorAll('[data-risk-id]').forEach(row => {
    const risk = geoRiskItems.find(r => r.id === row.dataset.riskId);
    row.classList.toggle('hidden', risk ? !passesRiskFilters(risk, filters) : false);
  });
  document.querySelectorAll('[data-hotspot-id]').forEach(marker => {
    const risk = geoRiskItems.find(r => r.id === marker.dataset.hotspotId);
    marker.style.display = risk && !passesRiskFilters(risk, filters) ? 'none' : '';
  });
  document.querySelectorAll('[data-hotspot-button-id]').forEach(marker => {
    const risk = geoRiskItems.find(r => r.id === marker.dataset.hotspotButtonId);
    marker.style.display = risk && !passesRiskFilters(risk, filters) ? 'none' : '';
  });

  if (GEIState.get('selectedTab') === 'georisk' && typeof renderGeoRiskPage === 'function') renderGeoRiskPage();
  if (GEIState.get('selectedTab') === 'commodities' && typeof renderCommoditiesPage === 'function') renderCommoditiesPage();
}

function passesRiskFilters(risk, filters) {
  const sectorOk = filters.sector === 'All' || (risk.affectedSectors || []).includes(filters.sector);
  const regionOk = filters.region === 'All' || risk.region.includes(filters.region) || risk.countryOrArea.includes(filters.region);
  const riskOk = filters.risk === 'All' || risk.riskLevel === filters.risk;
  return sectorOk && regionOk && riskOk;
}

function renderIntelFeedRow(h) {
  const badge = getImpactBadge(h.impact);
  const sentCol = { Bullish:'text-primary', Bearish:'text-error', Neutral:'text-on-surface-variant', Volatile:'text-tertiary', 'Risk Elevated':'text-tertiary' }[h.sentimentEffect] || 'text-on-surface-variant';
  const displayTime = h.time || formatTimestamp(h.timestamp || '');
  return `
  <div class="intel-card p-sm bg-surface-container-high border border-outline-variant rounded hover:bg-surface-container-highest hover:border-primary/50 transition-colors cursor-pointer feed-row"
       data-feed-id="${h.id}">
    <div class="flex items-center justify-between gap-xs mb-xs">
      <div class="flex items-center gap-xs flex-wrap">
        <span class="${badge.bg} ${badge.text} text-[10px] font-bold rounded px-2 py-0.5">${badge.label}</span>
        <span class="text-[10px] text-outline font-mono-data">${displayTime}</span>
      </div>
      <span class="text-[9px] px-1.5 py-0.5 border border-primary/30 text-primary rounded font-bold shrink-0">AI-SCORED</span>
    </div>
    <h4 class="text-body-md font-bold text-on-surface leading-snug mb-xs">${h.headline}</h4>
    <p class="text-body-sm text-on-surface-variant leading-snug italic mb-sm">${h.whyItMatters}</p>
    <div class="flex items-center gap-xs flex-wrap">
      <span class="text-[10px] text-outline">SRC: ${h.source.toUpperCase()}</span>
      <span class="text-[10px] px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant rounded">${h.sector.toUpperCase()}</span>
      ${h.category ? `<span class="text-[10px] px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant rounded border border-outline-variant/50">${h.category.toUpperCase()}</span>` : ''}
      <span class="text-[10px] px-1.5 py-0.5 border border-outline-variant ${sentCol} rounded ml-auto">${h.sentimentEffect.toUpperCase()}</span>
    </div>
  </div>`;
}

// ─── ALERTS PANEL ─────────────────────────────────────────────────────────────
function renderAlertsPanel() {
  const newCount = alertItems.filter(a=>a.isNew).length;
  return `
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-between p-md border-b border-outline-variant shrink-0">
        <div class="flex items-center gap-sm">
          ${geiIcon('notifications_active', 'text-primary')}
          <h3 class="text-headline-sm font-bold">Alerts</h3>
          ${newCount ? `<span class="w-5 h-5 rounded-full bg-error text-on-error text-[10px] flex items-center justify-center font-bold">${newCount}</span>` : ''}
        </div>
        <button data-close-panel class="text-on-surface-variant hover:text-primary transition-colors">
          ${geiIcon('close')}
        </button>
      </div>
      <div class="flex-1 overflow-y-auto custom-scrollbar p-md space-y-sm">
        ${alertItems.map(a => `
        <div class="p-sm bg-surface-container-high rounded border ${a.isNew?'border-error/40':'border-outline-variant'} cursor-pointer hover:border-primary transition-colors"
             onclick="closeAll();openDrawer('feedItem',{id:'${a.id}',title:'${a.title}',sector:'${a.sector}',impact:'${a.level} Impact',sentimentEffect:'Risk Elevated',whyItMatters:'${a.detail}',source:'GEI Alert System',timestamp:'${a.timestamp}',eventType:'Alert',isBreaking:${a.isNew}})">
          <div class="flex items-start justify-between gap-sm">
            <div class="flex items-start gap-xs">
              ${geiIcon('warning', a.level==='Critical'?'text-error':a.level==='High'?'text-tertiary':'text-primary')}
              <div>
                <p class="text-body-sm font-bold text-on-surface">${a.title}</p>
                <p class="text-[10px] text-outline mt-xs">${a.sector} · ${formatTimestamp(a.timestamp)}</p>
              </div>
            </div>
            ${a.isNew ? '<span class="text-[9px] bg-error text-on-error px-1 py-0.5 rounded font-bold shrink-0">NEW</span>' : ''}
          </div>
        </div>`).join('')}
      </div>
    </div>
  `;
}

// ─── SETTINGS PANEL ───────────────────────────────────────────────────────────
function renderSettingsPanel() {
  const s   = GEIState.get('settings');
  const dss = GEIState.get('dataSourceStatus') || dataSourceStatus;
  const intOpts = ['30s','1m','5m','manual'];

  return `
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-between p-md border-b border-outline-variant shrink-0">
        <div class="flex items-center gap-sm">
          ${geiIcon('settings', 'text-primary')}
          <h3 class="text-headline-sm font-bold">Settings</h3>
        </div>
        <button data-close-panel class="text-on-surface-variant hover:text-primary transition-colors">
          ${geiIcon('close')}
        </button>
      </div>
      <div class="flex-1 overflow-y-auto custom-scrollbar p-md space-y-lg">

        <div>
          <p class="text-label-md text-on-surface-variant mb-sm">REFRESH INTERVAL</p>
          <div class="grid grid-cols-4 gap-xs">
            ${intOpts.map(v=>`
            <button class="py-sm rounded text-[11px] font-bold border transition-colors ${s.refreshInterval===v?'bg-primary-container border-primary text-on-primary-container':'border-outline-variant text-on-surface-variant hover:border-primary'}"
                    data-setting-refresh="${v}">${v.toUpperCase()}</button>`).join('')}
          </div>
        </div>

        <div>
          <p class="text-label-md text-on-surface-variant mb-sm">THEME</p>
          <div class="grid grid-cols-3 gap-xs">
            ${['dark','medium','light'].map(v=>`
            <button class="py-sm rounded text-[11px] font-bold border transition-colors ${s.theme===v?'bg-primary-container border-primary text-on-primary-container':'border-outline-variant text-on-surface-variant hover:border-primary'}"
                    data-setting-theme="${v}">${v.charAt(0).toUpperCase()+v.slice(1)}</button>`).join('')}
          </div>
        </div>

        <div>
          <p class="text-label-md text-on-surface-variant mb-sm">DATA MODE</p>
          <div class="grid grid-cols-2 gap-xs">
            ${['mock','live'].map(v=>`
            <button class="py-sm rounded text-[11px] font-bold border transition-colors ${GEIState.get('dataMode')===v?'bg-primary-container border-primary text-on-primary-container':'border-outline-variant text-on-surface-variant hover:border-primary'}"
                    data-setting-datamode="${v}">${v==='mock'?'Mock Data':'Live API'}</button>`).join('')}
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-body-sm font-bold text-on-surface">Notifications</p>
            <p class="text-[10px] text-outline">Alert panel + badge updates</p>
          </div>
          <button id="notif-toggle"
                  class="w-12 h-6 rounded-full transition-colors relative ${s.notifications?'bg-primary':'bg-outline-variant'}"
                  data-setting-notifications>
            <span class="w-4 h-4 bg-background rounded-full absolute top-1 transition-all ${s.notifications?'left-7':'left-1'}"></span>
          </button>
        </div>

        <div class="bg-surface-container-high p-md rounded border border-outline-variant">
          <p class="text-label-md text-on-surface-variant mb-sm">DATA SOURCE STATUS</p>
          <div class="space-y-xs">
            ${Object.entries(dss).filter(([k])=>k!=='lastSyncTime').map(([k,v])=>{
              const status = typeof v === 'string' ? v : v.status;
              const isLive = status === 'live' || status === 'online';
              return `
            <div class="flex items-center justify-between">
              <span class="text-body-sm text-on-surface-variant capitalize">${k}</span>
              <span class="text-[10px] px-2 py-0.5 rounded font-bold ${isLive?'bg-primary-container/30 text-primary':status==='mock'?'bg-tertiary-container/30 text-tertiary':'bg-error-container/30 text-error'}">${isLive ? 'LIVE' : String(status || 'offline').toUpperCase()}</span>
            </div>`;
            }).join('')}
          </div>
          <p class="text-[10px] text-outline mt-sm">Last sync: ${formatTimestamp(dss.lastSyncTime || new Date().toISOString())}</p>
          <button onclick="openModal('dataSources',{anchor:this})"
                  class="w-full mt-sm py-xs text-label-md text-primary hover:underline">
            View Full API Status →
          </button>
        </div>
      </div>
    </div>
  `;
}

function wireSettingsHandlers() {
  function rerenderSettingsPanel() {
    const panel = document.getElementById('gei-settings-panel');
    if (!panel) return;
    panel.innerHTML = renderSettingsPanel();
    panel.classList.add('panel-open');
    wireSettingsHandlers();
    panel.querySelector('[data-close-panel]')?.addEventListener('click', closeAll);
  }
  document.querySelectorAll('[data-setting-refresh]').forEach(b =>
    b.addEventListener('click', () => {
      GEIState.setNested('settings.refreshInterval', b.dataset.settingRefresh);
      restartAutoRefresh();
      rerenderSettingsPanel();
    })
  );
  document.querySelectorAll('[data-setting-theme]').forEach(b =>
    b.addEventListener('click', () => {
      GEIState.setNested('settings.theme', b.dataset.settingTheme);
      rerenderSettingsPanel();
    })
  );
  document.querySelectorAll('[data-setting-datamode]').forEach(b =>
    b.addEventListener('click', () => {
      const mode = b.dataset.settingDatamode;
      GEIState.set({ dataMode: mode });
      GEI_CONFIG.useMock = mode === 'mock';
      rerenderSettingsPanel();
      // Trigger live fetch immediately when switching to Live API
      if (mode === 'live') {
        closeAll();
        showToast('Switching to Live API mode…', 'info', 2500);
        setTimeout(() => {
          if (typeof handleRefresh === 'function') handleRefresh();
        }, 300);
      }
    })
  );
  document.querySelector('[data-setting-notifications]')?.addEventListener('click', () => {
    GEIState.setNested('settings.notifications', !GEIState.get('settings').notifications);
    rerenderSettingsPanel();
  });
}

// ─── DATA SOURCES MODAL ───────────────────────────────────────────────────────
function renderDataSourcesModal() {
  const dss = GEIState.get('dataSourceStatus') || dataSourceStatus;
  const lastSync = dss.lastSyncTime ? formatTimestamp(dss.lastSyncTime) : 'Unknown';
  const mode = GEIState.get('dataMode') === 'mock' ? 'Mock Fallback Active' : 'Live API';
  const svcList = [
    { key:'prices',     label:'Market Prices',      icon:'trending_up', endpoint:'/api/proxy/prices',    latency:'< 200ms' },
    { key:'news',       label:'News / Headlines',   icon:'newspaper',   endpoint:'/api/proxy/news',      latency:'< 300ms' },
    { key:'geoRisk',    label:'Geo Risk Monitor',   icon:'public',      endpoint:'/api/proxy/georisk',   latency:'< 500ms' },
    { key:'aiAnalysis', label:'AI Analysis',        icon:'analytics',   endpoint:'/api/ai/analyze',      latency:'< 1200ms' },
    { key:'satellite',  label:'Satellite Feed',     icon:'satellite',   endpoint:'/api/proxy/satellite', latency:'< 1200ms' }
  ];
  const rows = svcList.map(svc => {
    const raw = dss[svc.key];
    const status = typeof raw === 'string' ? raw : raw?.status || 'offline';
    const isLive = status === 'live' || status === 'online';
    const col = isLive ? 'bg-primary-container/30 text-primary border-primary/30' :
                status==='mock'   ? 'bg-tertiary-container/30 text-tertiary border-tertiary/30' :
                                    'bg-error-container/30 text-error border-error/30';
    const dot = isLive ? 'bg-primary' : status==='mock' ? 'bg-tertiary' : 'bg-error';
    const lbl = isLive ? 'LIVE' : status==='mock' ? 'MOCK' : 'OFFLINE';
    return `
      <div class="flex items-center justify-between p-sm bg-surface-container-high rounded border border-outline-variant">
        <div class="flex items-center gap-sm">
          ${geiIcon(svc.icon, 'text-on-surface-variant')}
          <div>
            <p class="text-body-sm font-bold text-on-surface">${svc.label}</p>
            <p class="text-[10px] font-mono-data text-outline">${svc.endpoint}</p>
          </div>
        </div>
        <div class="flex items-center gap-sm">
          <span class="text-[10px] text-outline hidden sm:block">${svc.latency}</span>
          <span class="flex items-center gap-xs text-[10px] px-2 py-0.5 rounded border font-bold ${col}">
            <span class="w-1.5 h-1.5 rounded-full ${dot} inline-block"></span>${lbl}
          </span>
        </div>
      </div>`;
  }).join('');
  return `
    <div class="p-lg space-y-md">
      <div class="grid grid-cols-3 gap-sm">
        <div class="p-sm bg-surface-container-high rounded border border-outline-variant text-center">
          <p class="text-label-md text-on-surface-variant">DATA MODE</p>
          <p class="text-body-sm font-bold text-tertiary mt-xs">${mode}</p>
        </div>
        <div class="p-sm bg-surface-container-high rounded border border-outline-variant text-center">
          <p class="text-label-md text-on-surface-variant">LAST SYNC</p>
          <p class="text-body-sm font-bold text-on-surface mt-xs">${lastSync}</p>
        </div>
        <div class="p-sm bg-surface-container-high rounded border border-outline-variant text-center">
          <p class="text-label-md text-on-surface-variant">LATENCY</p>
          <p class="text-body-sm font-bold text-primary mt-xs">&lt; 200ms</p>
        </div>
      </div>
      <div>
        <p class="text-label-md text-on-surface-variant mb-sm">API ENDPOINTS</p>
        <div class="space-y-xs">${rows}</div>
      </div>
      ${(() => {
        const statuses = Object.values(dss).filter(v => v && typeof v === 'object' && 'status' in v).map(v => v.status);
        const liveN = statuses.filter(s => s === 'live').length;
        const totalN = statuses.length;
        const modeLabel = liveN === 0     ? 'Mock Fallback Active' :
                          liveN === totalN ? 'Live Data Active'     : `Partial Live Mode (${liveN}/${totalN} live)`;
        const modeCol   = liveN === 0     ? 'text-tertiary'        :
                          liveN === totalN ? 'text-primary'         : 'text-primary';
        const modeIcon  = liveN === 0     ? 'info' : liveN === totalN ? 'check_circle' : 'pending';
        const modeText  = liveN === 0
          ? 'All data is served from the internal mock layer. Set API keys in <code class="font-mono-data text-primary">.env</code> and switch to Live API in Settings to activate live data.'
          : 'Live data is active for the services shown above. AI analysis is live-derived from current prices, headlines, and geo-risk inputs when no AI provider key is configured.';
        return `<div class="flex items-start gap-sm p-sm bg-surface-container-highest rounded border border-outline-variant">
          ${geiIcon(modeIcon, modeCol)}
          <div>
            <p class="text-body-sm font-bold ${modeCol}">${modeLabel}</p>
            <p class="text-[10px] text-on-surface-variant leading-relaxed">${modeText}</p>
          </div>
        </div>`;
      })()}
    </div>`;
}

// ─── FOOTER MODALS ────────────────────────────────────────────────────────────
function renderFooterModal(data) {
  const content = {
    methodology: `<p class="text-body-sm text-on-surface-variant leading-relaxed">GeoEnergy Intelligence AI uses a multi-stage pipeline: prices from commodity markets, headlines from curated energy news sources, and geopolitical signals from satellite and shipping telemetry. All data is classified by sector, scored by an AI model, and aggregated into the dashboard. Confidence scores reflect data recency, source quality, and cross-signal agreement.</p>`,
    compliance:  `<p class="text-body-sm text-on-surface-variant leading-relaxed">GeoEnergy Intelligence AI provides market intelligence for informational purposes only. Nothing on this dashboard constitutes financial advice. Users should conduct their own due diligence before making investment or trading decisions. Data may be delayed. See Terms of Service for full disclaimer.</p>`,
    support:     `<p class="text-body-sm text-on-surface-variant leading-relaxed">For support, contact your GeoEnergy Intelligence representative or email <span class="text-primary">support@geoenergy.ai</span>. Enterprise customers have access to dedicated support channels. Response time: 4 hours for critical issues, 24 hours for standard requests.</p>`,
    privacy:     `<p class="text-body-sm text-on-surface-variant leading-relaxed">GeoEnergy Intelligence AI collects minimal user data necessary to provide the service. Dashboard usage data is used to improve the product. Market data and intelligence content are not sold to third parties. See our full Privacy Policy for details on data retention and user rights under GDPR and CCPA.</p>`
  };
  return `<div class="p-lg">${content[data.type] || '<p class="text-on-surface-variant">Content not found.</p>'}</div>`;
}

// ─── ACCOUNT MODAL ────────────────────────────────────────────────────────────
function renderAccountModal() {
  return `
    <div class="p-lg space-y-md">
      <div class="flex items-center gap-md p-md bg-surface-container-high rounded border border-outline-variant">
        <div class="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
          ${geiIcon('person', 'text-on-primary-container')}
        </div>
        <div>
          <p class="text-body-md font-bold text-on-surface">GeoEnergy User</p>
          <p class="text-body-sm text-on-surface-variant">Enterprise Plan · Active</p>
        </div>
      </div>
      <div class="space-y-xs">
        ${[
          {icon:'manage_accounts', label:'Account Settings', sub:'Profile, preferences, security', action:"closeModal();openModal('placeholder',{title:'Account Settings',content:'Profile, preferences, and security controls will connect to the enterprise identity backend.'})"},
              {icon:'hub',             label:'Data Sources',     sub:'API keys, connector status',      action:"openModal('dataSources',{anchor:this})"},
              {icon:'monitoring',      label:'API Status',       sub:'Live connection health',           action:"openModal('dataSources',{anchor:this})"},
          {icon:'logout',          label:'Sign Out',         sub:'End your current session',         action:"closeModal();openModal('placeholder',{title:'Sign Out',content:'Sign out is a placeholder until authentication is connected.'})"}
        ].map(item=>`
        <div class="flex items-center gap-sm p-sm bg-surface-container-high rounded border border-outline-variant cursor-pointer hover:border-primary transition-colors"
             ${item.action?`onclick="${item.action}"`:''}>
          ${geiIcon(item.icon, 'text-on-surface-variant')}
          <div>
            <p class="text-body-sm font-bold text-on-surface">${item.label}</p>
            <p class="text-[10px] text-outline">${item.sub}</p>
          </div>
          ${geiIcon('chevron_right', 'text-outline ml-auto')}
        </div>`).join('')}
      </div>
    </div>
  `;
}

// ─── MINI LINE CHART (SVG) ────────────────────────────────────────────────────
function renderMiniLineChart(hist) {
  if (!hist) return '<p class="text-body-sm text-on-surface-variant">No trend data.</p>';
  const prices = hist.priceHistory || [];
  if (prices.length < 2) return '';

  const vals = prices.map(p => Object.values(p).find(v => typeof v === 'number'));
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const range = max - min || 1;

  const W = 320, H = 80, pad = 8;
  const points = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (W - 2 * pad);
    const y = H - pad - ((v - min) / range) * (H - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const lastDate = prices[prices.length-1]?.date || '';
  const firstDate= prices[0]?.date || '';
  const lastVal  = vals[vals.length-1];
  const firstVal = vals[0];
  const up       = lastVal >= firstVal;

  return `
    <div class="relative">
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="w-full rounded" style="background:#060f16">
        <polyline points="${points}" fill="none" stroke="${up?'#a2c9ff':'#ffb4ab'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${(pad + (vals.length-1)/(vals.length-1)*(W-2*pad)).toFixed(1)}" cy="${(H-pad-((lastVal-min)/range)*(H-2*pad)).toFixed(1)}" r="3" fill="${up?'#a2c9ff':'#ffb4ab'}"/>
      </svg>
      <div class="flex justify-between text-[10px] text-outline mt-xs">
        <span>${firstDate}</span>
        <span>${lastDate}</span>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS PAGE — complete replacement for History
// ═══════════════════════════════════════════════════════════════════════════════

function renderStatisticsPage() {
  const energyOpts = [
    { id:'crude-oil',         label:'Crude Oil' },
    { id:'natural-gas',       label:'Natural Gas' },
    { id:'refined-products',  label:'Refined Products' },
    { id:'power',             label:'Power (EU)' },
    { id:'renewables',        label:'Renewables' }
  ];
  const crossOpts = [
    { id:'gold',    label:'Gold' },
    { id:'copper',  label:'Copper' },
    { id:'wheat',   label:'Wheat' },
    { id:'uranium', label:'Uranium' },
    { id:'lithium', label:'Lithium' }
  ];
  const ranges = ['7D','30D','90D','YTD','1Y','5Y'];

  return `
    <div class="space-y-md">
      <div class="flex items-center justify-between flex-wrap gap-sm">
        <div>
          <h2 class="text-headline-sm font-bold">Statistics</h2>
          <p class="text-body-sm text-on-surface-variant mt-xs">Price history, AI confidence, sentiment, and risk trends across energy and cross-market signals.</p>
        </div>
        <span class="text-[10px] font-mono-data text-outline px-2 py-0.5 border border-outline-variant rounded">Live Data · ${getCurrentLocalTime()}</span>
      </div>

      <div class="bg-surface-container border border-outline-variant rounded-lg p-md">
        <div class="flex flex-wrap items-end gap-lg">
          <div class="flex flex-col gap-xs">
            <label class="text-[10px] text-outline uppercase tracking-wider font-bold">Energy Sector</label>
            <select id="stats-energy-select"
                    class="bg-surface-container-high border border-outline-variant rounded px-sm py-xs text-body-sm text-on-surface focus:outline-none focus:border-primary min-w-[180px] cursor-pointer">
              <option value="">— Select —</option>
              ${energyOpts.map(o=>`<option value="${o.id}">${o.label}</option>`).join('')}
            </select>
          </div>

          <div class="text-on-surface-variant text-body-sm font-mono-data pb-xs px-xs">or</div>

          <div class="flex flex-col gap-xs">
            <label class="text-[10px] text-outline uppercase tracking-wider font-bold">Cross-Market Signal</label>
            <select id="stats-cross-select"
                    class="bg-surface-container-high border border-outline-variant rounded px-sm py-xs text-body-sm text-on-surface focus:outline-none focus:border-primary min-w-[180px] cursor-pointer">
              <option value="">— Select —</option>
              ${crossOpts.map(o=>`<option value="${o.id}">${o.label}</option>`).join('')}
            </select>
          </div>

          <div class="flex flex-col gap-xs ml-auto">
            <label class="text-[10px] text-outline uppercase tracking-wider font-bold">Time Range</label>
            <div class="flex border border-outline-variant rounded overflow-hidden">
              ${ranges.map(r=>`
              <button data-stats-range="${r}"
                      class="px-sm py-xs text-[11px] font-bold border-r last:border-r-0 border-outline-variant transition-colors ${r==='30D'?'bg-primary-container text-on-primary-container':'bg-surface-container text-on-surface-variant hover:text-primary'}">${r}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-sm" id="stats-summary-cards">
        <div class="col-span-full p-md bg-surface-container border border-outline-variant rounded-lg text-center text-on-surface-variant text-body-sm">Select a commodity above to view statistics.</div>
      </div>

      <div id="stats-chart-area">
        <div class="bg-surface-container border border-outline-variant rounded-lg p-lg flex items-center justify-center" style="min-height:260px">
          <p class="text-on-surface-variant text-body-sm">Select a commodity and time range to view price history.</p>
        </div>
      </div>
    </div>
  `;
}

// ─── STATISTICS: DETAILED CHART SVG ──────────────────────────────────────────
function buildDetailedChartSVG(priceSeries, opts) {
  if (!priceSeries || priceSeries.length < 2) return '<p class="text-body-sm text-on-surface-variant p-sm">Insufficient data for this range.</p>';
  const { unit = '', currency = '', instrumentName = '' } = opts || {};

  const W = 580, H = 200;
  const L = 62, R = 12, T = 16, B = 40;
  const cW = W - L - R, cH = H - T - B;

  const vals   = priceSeries.map(p => p.value);
  const rawMin = Math.min(...vals), rawMax = Math.max(...vals);
  const pad    = (rawMax - rawMin) * 0.12 || rawMax * 0.05;
  const vMin   = rawMin - pad, vMax = rawMax + pad, vRange = vMax - vMin;

  const toX = i => L + (i / (priceSeries.length - 1)) * cW;
  const toY = v => T + (1 - (v - vMin) / vRange) * cH;

  // Y-axis tick count and rounding
  const yTicks  = 5;
  const tickStep = vRange / (yTicks - 1);
  const yTickVals = Array.from({ length: yTicks }, (_, i) => vMin + tickStep * i);

  function fmtPrice(v) {
    if (Math.abs(v) >= 1000) return currency + v.toFixed(0);
    if (Math.abs(v) >= 10)   return currency + v.toFixed(1);
    return currency + v.toFixed(2);
  }

  // X-axis: max 8 evenly-spaced labels
  const maxXL = Math.min(8, priceSeries.length);
  const xStep = Math.max(1, Math.floor((priceSeries.length - 1) / (maxXL - 1)));
  const xIdxSet = new Set();
  for (let i = 0; i < priceSeries.length; i += xStep) xIdxSet.add(i);
  xIdxSet.add(priceSeries.length - 1);

  const gridLines = yTickVals.map(v => {
    const y = toY(v).toFixed(1);
    return `<line x1="${L}" y1="${y}" x2="${L+cW}" y2="${y}" stroke="#2d363e" stroke-width="0.8"/>`;
  }).join('');

  const yLabels = yTickVals.map(v => {
    const y = (toY(v) + 3.5).toFixed(1);
    return `<text x="${L-5}" y="${y}" fill="#8b919d" font-size="9" font-family="IBM Plex Mono" text-anchor="end">${fmtPrice(v)}</text>`;
  }).join('');

  const xLabels = priceSeries.map((p, i) => {
    if (!xIdxSet.has(i)) return '';
    const x = toX(i).toFixed(1);
    return `<text x="${x}" y="${T+cH+18}" fill="#8b919d" font-size="9" font-family="IBM Plex Mono" text-anchor="middle">${p.date}</text>`;
  }).join('');

  const linePoints = priceSeries.map((p, i) => `${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(' ');
  const areaPoints = [
    `${L},${T+cH}`,
    ...priceSeries.map((p, i) => `${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`),
    `${L+cW},${T+cH}`
  ].join(' ');

  // Data point circles + native SVG tooltips
  const circles = priceSeries.map((p, i) => {
    const x = toX(i).toFixed(1), y = toY(p.value).toFixed(1);
    const isLast = i === priceSeries.length - 1;
    const prev = priceSeries[i - 1];
    const chg = prev ? ((p.value - prev.value) / prev.value * 100).toFixed(2) : '—';
    const chgTxt = prev ? (parseFloat(chg) >= 0 ? `+${chg}%` : `${chg}%`) : '';
    return `<g>
      <circle cx="${x}" cy="${y}" r="${isLast ? 5 : 3}" fill="${isLast ? '#a2c9ff' : '#58a6ff'}" opacity="${isLast ? 1 : 0.65}" style="cursor:crosshair"/>
      <title>${p.date}: ${fmtPrice(p.value)} ${unit}${chgTxt ? ' (' + chgTxt + ')' : ''}</title>
    </g>`;
  }).join('');

  // Latest price label
  const lp = priceSeries[priceSeries.length - 1];
  const lpX = toX(priceSeries.length - 1), lpY = toY(lp.value);
  const lblX = lpX > L + cW * 0.78 ? lpX - 6 : lpX + 6;
  const lblAnchor = lpX > L + cW * 0.78 ? 'end' : 'start';
  const latestLabel = `<text x="${lblX.toFixed(1)}" y="${(lpY - 7).toFixed(1)}" fill="#a2c9ff" font-size="9.5" font-family="IBM Plex Mono" font-weight="600" text-anchor="${lblAnchor}">${fmtPrice(lp.value)}</text>`;

  // Axis titles
  const yAxisTitle = `<text x="11" y="${T+cH/2}" fill="#5d6774" font-size="8.5" font-family="IBM Plex Mono" text-anchor="middle" transform="rotate(-90,11,${T+cH/2})">Price / Index</text>`;
  const xAxisTitle = `<text x="${L+cW/2}" y="${H-2}" fill="#5d6774" font-size="8.5" font-family="IBM Plex Mono" text-anchor="middle">Date</text>`;

  return `
    <div>
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="w-full" style="background:#060f16;border-radius:4px">
        <defs>
          <linearGradient id="statArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="#58a6ff" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#58a6ff" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        ${gridLines}
        <line x1="${L}" y1="${T}" x2="${L}" y2="${T+cH}" stroke="#414752" stroke-width="1"/>
        <line x1="${L}" y1="${T+cH}" x2="${L+cW}" y2="${T+cH}" stroke="#414752" stroke-width="1"/>
        <polygon points="${areaPoints}" fill="url(#statArea)"/>
        <polyline points="${linePoints}" fill="none" stroke="#a2c9ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        ${circles}
        ${yLabels}
        ${xLabels}
        ${yAxisTitle}
        ${xAxisTitle}
        ${latestLabel}
      </svg>
      <div class="flex justify-between text-[9px] text-outline mt-xs font-mono-data px-xs">
        <span>${priceSeries.length} data points · ${instrumentName} · Hover circles for detail</span>
        <span>Source: GEI Statistics Engine</span>
      </div>
    </div>`;
}

// ─── STATISTICS: SUMMARY CARDS ────────────────────────────────────────────────
function renderStatisticsSummaryCards(data) {
  if (!data) return '<div class="col-span-full p-md text-center text-on-surface-variant text-body-sm">No data.</div>';
  const { summaryStats, range, name } = data;
  const si = getSentimentLabel(summaryStats.currentSentiment);
  const periodLabel = ({
    '7D':'7D CHANGE','30D':'30D CHANGE','90D':'90D CHANGE',
    'YTD':'YTD CHANGE','1Y':'1Y CHANGE','5Y':'5Y CHANGE'
  }[range] || 'PERIOD CHANGE');
  const chgCol = summaryStats.periodChange >= 0 ? 'text-primary' : 'text-error';
  const chgSign = summaryStats.periodChange >= 0 ? '+' : '';
  const confCol = summaryStats.averageConfidence >= 80 ? 'text-primary' : summaryStats.averageConfidence >= 60 ? 'text-tertiary' : 'text-error';
  return `
    <div class="p-md bg-surface-container border border-outline-variant rounded-lg">
      <p class="text-label-md text-on-surface-variant mb-xs">CURRENT SENTIMENT</p>
      <p class="text-headline-sm font-bold ${si.colorClass}">${summaryStats.currentSentiment}</p>
      <p class="text-body-sm text-on-surface-variant mt-xs">${summaryStats.currentConfidence}% AI confidence</p>
    </div>
    <div class="p-md bg-surface-container border border-outline-variant rounded-lg">
      <p class="text-label-md text-on-surface-variant mb-xs">${periodLabel}</p>
      <p class="text-headline-sm font-bold ${chgCol}">${chgSign}${summaryStats.periodChange}%</p>
      <p class="text-body-sm text-on-surface-variant mt-xs">${name} · ${range}</p>
    </div>
    <div class="p-md bg-surface-container border border-outline-variant rounded-lg">
      <p class="text-label-md text-on-surface-variant mb-xs">HIGHEST RISK EVENT</p>
      <p class="text-body-sm font-bold text-tertiary leading-snug mt-xs line-clamp-3">${summaryStats.highestRiskEvent}</p>
    </div>
    <div class="p-md bg-surface-container border border-outline-variant rounded-lg">
      <p class="text-label-md text-on-surface-variant mb-xs">AVG AI CONFIDENCE</p>
      <p class="text-headline-sm font-bold ${confCol}">${summaryStats.averageConfidence}%</p>
      <p class="text-body-sm text-on-surface-variant mt-xs">${getConfidenceLabel(summaryStats.averageConfidence)}</p>
    </div>`;
}

// ─── STATISTICS: CHART AREA (premium canvas chart) ───────────────────────────
function renderStatisticsChartArea(data, chartMode) {
  if (!data) return '';
  chartMode = chartMode || 'Price';
  const { confidenceSeries, sentimentSeries, keyEvents, name, unit, range, summaryStats, instrumentId } = data;

  const confBars = (confidenceSeries || []).map(s => {
    const col = s.confidence >= 80 ? 'bg-primary' : s.confidence >= 60 ? 'bg-tertiary' : 'bg-error';
    const sc  = getSentimentLabel(s.sentiment).colorClass;
    return `
      <div class="flex items-center gap-sm">
        <span class="text-[10px] text-outline font-mono-data w-16 shrink-0">${s.date}</span>
        <div class="flex-1 bg-outline-variant h-1.5 rounded-full overflow-hidden">
          <div class="${col} h-full rounded-full" style="width:${s.confidence}%"></div>
        </div>
        <span class="text-[10px] font-mono-data ${sc} w-24 text-right shrink-0">${s.confidence}% ${s.sentiment}</span>
      </div>`;
  }).join('');

  const sentTimeline = (sentimentSeries || []).map(s => {
    const si = getSentimentLabel(s.sentiment);
    return `
      <div class="flex items-center gap-xs py-xs border-b border-outline-variant/50 last:border-b-0">
        <span class="text-[10px] text-outline font-mono-data w-16 shrink-0">${s.date}</span>
        <span class="text-[10px] px-2 py-0.5 border ${si.borderClass} ${si.colorClass} rounded-sm font-bold">${si.label}</span>
        <span class="text-[10px] text-on-surface-variant">${s.confidence}%</span>
      </div>`;
  }).join('');

  const eventsHtml = (keyEvents || []).map(e => `
    <div class="flex gap-sm items-start py-xs border-b border-outline-variant/50 last:border-b-0">
      <span class="text-tertiary font-mono-data text-[10px] w-16 shrink-0 mt-0.5">${e.date}</span>
      <div>
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-tertiary mr-xs" style="vertical-align:middle"></span>
        <span class="text-body-sm text-on-surface">${e.event}</span>
      </div>
    </div>`).join('') || '<p class="text-body-sm text-on-surface-variant">No key events recorded for this range.</p>';

  // Mode toggle buttons
  const modes = ['Price', 'Compare', 'AI Insight'];
  const modeBtns = modes.map((m, i) => `
    <button data-chart-mode="${m}"
      class="px-sm py-xs text-[11px] font-bold transition-colors ${m === chartMode ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-primary'} ${i < modes.length-1 ? 'border-r border-outline-variant' : ''}">
      ${m}
    </button>`).join('');

  const sectorId = instrumentId || 'crude-oil';

  setTimeout(() => {
    renderPremiumChart('stats-premium-chart', sectorId, range, chartMode, name);
    // Wire mode toggle
    document.querySelectorAll('[data-chart-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newMode = btn.dataset.chartMode;
        document.querySelectorAll('[data-chart-mode]').forEach(b => {
          const on = b.dataset.chartMode === newMode;
          b.className = b.className.replace(/bg-primary text-on-primary|bg-surface-container text-on-surface-variant/g, '').trim();
          b.classList.add(...(on ? ['bg-primary','text-on-primary'] : ['bg-surface-container','text-on-surface-variant']));
        });
        renderPremiumChart('stats-premium-chart', sectorId, range, newMode, name);
      });
    });
  }, 30);

  return `
    <div class="space-y-md">
      <div class="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
        <div class="flex items-center justify-between px-md pt-md pb-sm">
          <div>
            <p class="text-label-md font-bold text-on-surface">${name.toUpperCase()} — STATISTICS</p>
            <p class="text-[10px] text-outline font-mono-data">${unit} · ${range}</p>
          </div>
          <div class="flex items-center gap-sm">
            <span class="text-[10px] px-1.5 py-0.5 border border-primary/30 text-primary rounded font-bold">AI: ${summaryStats.currentConfidence}%</span>
            <div class="flex border border-outline-variant rounded overflow-hidden">${modeBtns}</div>
          </div>
        </div>
        <div id="stats-premium-chart"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div class="bg-surface-container border border-outline-variant rounded-lg p-md">
          <p class="text-label-md text-on-surface-variant font-bold mb-md">AI CONFIDENCE TREND</p>
          ${confBars || '<p class="text-body-sm text-on-surface-variant">No confidence data.</p>'}
        </div>
        <div class="bg-surface-container border border-outline-variant rounded-lg p-md">
          <p class="text-label-md text-on-surface-variant font-bold mb-md">SENTIMENT HISTORY</p>
          <div class="space-y-xs">${sentTimeline || '<p class="text-body-sm text-on-surface-variant">No sentiment data.</p>'}</div>
        </div>
      </div>

      <div class="bg-surface-container border border-outline-variant rounded-lg p-md">
        <p class="text-label-md text-on-surface-variant font-bold mb-md">KEY EVENTS TIMELINE</p>
        <div>${eventsHtml}</div>
      </div>
    </div>`;
}

// ─── HISTORY PAGE (kept for backward compatibility — delegates to Statistics) ─
function renderHistoryPage() {
  const energySectors = sectorScores.map(s=>`<option value="${s.id}">${s.sector}</option>`).join('');
  const crossMarkets = [
    { id:'gold', label:'Gold' }, { id:'copper', label:'Copper' }, { id:'wheat', label:'Wheat' },
    { id:'uranium', label:'Uranium' }, { id:'lithium', label:'Lithium' }
  ].map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
  const sectors = `<optgroup label="Energy Sectors">${energySectors}</optgroup><optgroup label="Cross-Market">${crossMarkets}</optgroup>`;
  const ranges = ['7D','30D','90D','YTD','1Y','5Y'];
  const rangeBtns = ranges.map((r,i) => `
    <button data-history-range="${r}"
      class="px-sm py-xs text-[11px] font-bold transition-colors ${i===1?'bg-primary-container text-on-primary-container':'bg-surface-container text-on-surface-variant hover:text-primary'} ${i<ranges.length-1?'border-r border-outline-variant':''}">
      ${r}
    </button>`).join('');
  const modeBtns = ['Price','Compare','AI Insight'].map((m,i) => `
    <button data-chart-mode="${m}"
      class="px-sm py-xs text-[11px] font-bold transition-colors ${i===0?'bg-primary text-on-primary':'bg-surface-container text-on-surface-variant hover:text-primary'} ${i<2?'border-r border-outline-variant':''}">
      ${m}
    </button>`).join('');
  return `
    <div class="space-y-md">
      <div class="flex items-center justify-between flex-wrap gap-sm">
        <div>
          <h2 class="text-headline-sm font-bold">Historical Trends</h2>
          <p class="text-body-sm text-on-surface-variant mt-xs">Price history, AI confidence &amp; sentiment — 10 commodities tracked</p>
        </div>
        <div class="flex items-center gap-sm flex-wrap">
          <select id="history-sector-select" class="bg-surface-container border border-outline-variant rounded px-sm py-xs text-body-sm text-on-surface focus:outline-none focus:border-primary">
            ${sectors}
          </select>
          <div class="flex border border-outline-variant rounded overflow-hidden">${modeBtns}</div>
          <div class="flex border border-outline-variant rounded overflow-hidden">${rangeBtns}</div>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-sm" id="history-summary-cards"></div>
      <div id="history-chart-area"></div>
    </div>
  `;
}

function renderHistorySummaryCards(sectorId) {
  const hist = historicalTrends[sectorId];
  if (!hist) return '<div class="col-span-full p-md text-center text-on-surface-variant text-body-sm">No historical data for this commodity.</div>';
  const sector = sectorScores.find(s => s.id === sectorId);
  const latestSentiment = hist.sentimentHistory?.[hist.sentimentHistory.length - 1];
  const sentHist = hist.sentimentHistory || [];
  const latest   = sentHist[sentHist.length - 1] || {};
  const earliest = sentHist[0] || {};
  const avgConf  = sentHist.length ? Math.round(sentHist.reduce((a,s)=>a+s.confidence,0)/sentHist.length) : 0;
  const confDelta= (latest.confidence||0) - (earliest.confidence||0);
  const highestRiskEvt = hist.keyEvents?.[hist.keyEvents.length-1]?.event || 'No major events';
  const currentSentiment = sector?.sentiment || latestSentiment?.sentiment || '—';
  const currentConf = sector?.confidence || latestSentiment?.confidence || 0;
  const si = getSentimentLabel(currentSentiment);
  return `
    <div class="p-md bg-surface-container border border-outline-variant rounded-lg">
      <p class="text-label-md text-on-surface-variant mb-xs">CURRENT SENTIMENT</p>
      <p class="text-headline-sm font-bold ${si.colorClass}">${currentSentiment}</p>
      <p class="text-body-sm text-on-surface-variant mt-xs">${currentConf}% confidence</p>
    </div>
    <div class="p-md bg-surface-container border border-outline-variant rounded-lg">
      <p class="text-label-md text-on-surface-variant mb-xs">30D CONF. CHANGE</p>
      <p class="text-headline-sm font-bold ${confDelta>=0?'text-primary':'text-error'}">${confDelta>=0?'+':''}${confDelta}pp</p>
      <p class="text-body-sm text-on-surface-variant mt-xs">${earliest.confidence||0}% → ${latest.confidence||0}%</p>
    </div>
    <div class="p-md bg-surface-container border border-outline-variant rounded-lg">
      <p class="text-label-md text-on-surface-variant mb-xs">HIGHEST RISK EVENT</p>
      <p class="text-body-sm font-bold text-tertiary leading-snug mt-xs">${highestRiskEvt}</p>
    </div>
    <div class="p-md bg-surface-container border border-outline-variant rounded-lg">
      <p class="text-label-md text-on-surface-variant mb-xs">AVG AI CONFIDENCE</p>
      <p class="text-headline-sm font-bold text-on-surface">${avgConf}%</p>
      <p class="text-body-sm text-on-surface-variant mt-xs">${getConfidenceLabel(avgConf)}</p>
    </div>`;
}

// ─── PREMIUM CHART SYSTEM ─────────────────────────────────────────────────────
const CHART_UNITS = {
  'crude-oil':'USD/bbl','natural-gas':'USD/MMBtu','refined-products':'USD/gal',
  'power':'EUR/MWh','renewables':'Index','gold':'USD/oz','copper':'USD/lb',
  'wheat':'USD/bu','uranium':'USD/lb','lithium':'USD/share'
};
const CHART_COMPARE_PAIRS = {
  'crude-oil':   { label:'WTI vs Brent',        keys:['wti','brent'] },
  'natural-gas': { label:'Nat Gas vs Power',     keys:['natgas','euPower'] },
  'refined-products':{ label:'Diesel vs Crude',  keys:['diesel','wti'] },
  'power':       { label:'EU Power vs Gas',      keys:['euPower','natgas'] },
  'renewables':  { label:'Renewables vs Power',  keys:['solarIdx','euPower'] },
  'gold':        { label:'Gold vs Crude',        keys:['gold','wti'] },
  'copper':      { label:'Copper vs Renewables', keys:['copper','solarIdx'] },
  'lithium':     { label:'Lithium vs Renewables',keys:['lithium','solarIdx'] },
};

function generateChartData(sectorId, range, mode) {
  const hist = historicalTrends[sectorId] || {};
  const base = hist.priceHistory || [];
  const events = hist.keyEvents || [];
  const sentHistory = hist.sentimentHistory || [];

  // Generate synthetic data for ranges beyond what we have
  function syntheticPoints(count, baseVal, volatility, startDate) {
    const pts = [];
    let val = baseVal;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - count * 864e5);
    for (let i = 0; i < count; i++) {
      val = Math.max(0.1, val + (Math.random() - 0.48) * volatility);
      const d = new Date(start.getTime() + i * 864e5);
      const label = d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
      pts.push({ date: label, price: +val.toFixed(2), _ts: d });
    }
    return pts;
  }

  function syntheticQuarterly(count, baseVal, volatility) {
    const pts = [];
    let val = baseVal;
    const start = new Date(Date.now() - count * 90 * 864e5);
    for (let i = 0; i < count; i++) {
      val = Math.max(0.1, val + (Math.random() - 0.48) * volatility * 3);
      const d = new Date(start.getTime() + i * 90 * 864e5);
      pts.push({ date: `Q${Math.floor(i%4)+1}'${String(d.getFullYear()).slice(2)}`, price: +val.toFixed(2), _ts: d });
    }
    return pts;
  }

  // Extract primary price key from base data
  function extractPrices(data) {
    return data.map(p => {
      const keys = Object.keys(p).filter(k => k !== 'date' && typeof p[k] === 'number');
      const price = p[keys[0]] || 0;
      return { date: p.date, price, _raw: p };
    });
  }

  const basePrice = base.length ? (Object.values(base[base.length-1]).find(v => typeof v === 'number') || 50) : 50;
  const vol = basePrice * 0.02;

  let points = [];
  if (range === '7D') {
    points = syntheticPoints(7, basePrice, vol * 0.5);
  } else if (range === '30D') {
    points = base.length >= 5 ? extractPrices(base).slice(-9) : syntheticPoints(30, basePrice, vol);
  } else if (range === '90D') {
    points = syntheticPoints(13, basePrice * 0.95, vol * 1.5, new Date(Date.now() - 90*864e5));
  } else if (range === 'YTD') {
    const now = new Date(); const jan = new Date(now.getFullYear(), 0, 1);
    const months = Math.max(1, now.getMonth() + 1);
    points = syntheticPoints(months, basePrice * 0.9, vol * 2, jan).map((p,i) => {
      const d = new Date(jan.getTime() + i * 30 * 864e5);
      return { ...p, date: d.toLocaleDateString('en-US',{month:'short'}) };
    });
  } else if (range === '1Y') {
    points = syntheticPoints(12, basePrice * 0.85, vol * 2.5, new Date(Date.now() - 365*864e5)).map((p,i) => {
      const d = new Date(Date.now() - (11-i) * 30 * 864e5);
      return { ...p, date: d.toLocaleDateString('en-US',{month:'short',year:'2-digit'}) };
    });
  } else if (range === '5Y') {
    points = syntheticQuarterly(20, basePrice * 0.7, vol * 3);
  }

  // Attach events to nearest date index
  const evtMap = {};
  events.forEach(e => {
    // Find closest point index by date string match
    const idx = points.findIndex(p => p.date && e.date && p.date.includes(e.date.slice(4)));
    const target = idx >= 0 ? idx : points.length - 1;
    if (!evtMap[target]) evtMap[target] = [];
    evtMap[target].push(e);
  });

  // Attach sentiment to points (for AI Insight mode)
  const sentMap = {};
  sentHistory.forEach(s => {
    const idx = points.findIndex(p => p.date && s.date && p.date.includes(s.date.slice(4)));
    if (idx >= 0) sentMap[idx] = s;
  });

  // Add change/changePercent
  points = points.map((p, i) => {
    const prev = i > 0 ? points[i-1].price : p.price;
    const change = +(p.price - prev).toFixed(2);
    const changePct = prev ? +((change/prev)*100).toFixed(2) : 0;
    return { ...p, change, changePct, events: evtMap[i] || [], sentiment: sentMap[i] || null };
  });

  // Compare mode: add second series
  let comparePoints = null;
  if (mode === 'Compare') {
    const pair = CHART_COMPARE_PAIRS[sectorId];
    if (pair) {
      const b2 = basePrice * (0.7 + Math.random() * 0.6);
      comparePoints = points.map(p => ({ ...p, price: +(b2 + (Math.random()-0.49)*(vol*2)).toFixed(2) }));
    }
  }

  return { points, comparePoints, unit: CHART_UNITS[sectorId] || 'Index' };
}

function renderPremiumChart(containerId, sectorId, range, mode, sectorLabel) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { points, comparePoints, unit } = generateChartData(sectorId, range, mode);
  if (!points.length) return;

  const prices = points.map(p => p.price);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const startP = prices[0], endP = prices[prices.length-1];
  const absChg = +(endP - startP).toFixed(2);
  const pctChg = startP ? +((absChg/startP)*100).toFixed(2) : 0;
  const chgColor = absChg >= 0 ? '#4ade80' : '#f87171';
  const chgSign = absChg >= 0 ? '+' : '';

  const hiIdx = prices.indexOf(maxP), loIdx = prices.indexOf(minP);

  // Summary bar
  const summaryHTML = `
    <div class="flex flex-wrap gap-md px-md pt-md pb-sm border-b border-outline-variant/30">
      <div>
        <p class="text-[10px] text-outline font-mono-data">CURRENT</p>
        <p class="text-headline-sm font-bold text-on-surface">$${endP.toFixed(2)}</p>
        <p class="text-[10px] font-mono-data" style="color:${chgColor}">${chgSign}$${absChg} (${chgSign}${pctChg}%)</p>
      </div>
      <div class="w-px bg-outline-variant/30 self-stretch mx-xs"></div>
      <div><p class="text-[10px] text-outline font-mono-data">START</p><p class="text-body-sm font-bold text-on-surface">$${startP.toFixed(2)}</p></div>
      <div><p class="text-[10px] text-outline font-mono-data">HIGH</p><p class="text-body-sm font-bold text-primary">$${maxP.toFixed(2)}</p></div>
      <div><p class="text-[10px] text-outline font-mono-data">LOW</p><p class="text-body-sm font-bold text-error">$${minP.toFixed(2)}</p></div>
      <div class="ml-auto text-right">
        <p class="text-[10px] text-outline font-mono-data">UNIT</p>
        <p class="text-body-sm font-bold text-on-surface-variant">${unit}</p>
      </div>
    </div>`;

  // Canvas chart
  const canvasId = `chart-canvas-${Date.now()}`;
  const tooltipId = `chart-tooltip-${Date.now()}`;

  const chartHTML = `
    <div style="position:relative;padding:16px 12px 8px;">
      <canvas id="${canvasId}" style="width:100%;height:220px;display:block;"></canvas>
      <div id="${tooltipId}" style="position:absolute;display:none;background:#1a2535;border:1px solid #2d3f55;border-radius:6px;padding:8px 12px;pointer-events:none;z-index:10;min-width:160px;">
        <p id="${tooltipId}-date" style="font-size:10px;color:#8b919d;font-family:'IBM Plex Mono',monospace;margin:0 0 4px"></p>
        <p id="${tooltipId}-price" style="font-size:14px;font-weight:700;color:#e2e8f0;margin:0 0 2px"></p>
        <p id="${tooltipId}-change" style="font-size:10px;font-family:'IBM Plex Mono',monospace;margin:0 0 4px"></p>
        <p id="${tooltipId}-event" style="font-size:10px;color:#fabc45;margin:0;display:none;"></p>
      </div>
    </div>`;

  // X-axis labels
  const xLabels = points.map(p => p.date);
  const maxLabels = Math.min(8, points.length);
  const step = Math.max(1, Math.floor(points.length / maxLabels));
  const visibleLabels = points.map((p, i) => i % step === 0 || i === points.length-1 ? p.date : '');

  const xLabelHTML = `
    <div style="display:flex;justify-content:space-between;padding:0 12px 8px;overflow:hidden;">
      ${visibleLabels.filter(l=>l).map(l=>`<span style="font-size:9px;color:#6b7280;font-family:'IBM Plex Mono',monospace;white-space:nowrap;">${l}</span>`).join('')}
    </div>`;

  // Events timeline
  const allEvents = points.flatMap((p,i) => (p.events||[]).map(e => ({...e, idx:i, date:p.date})));
  const eventsHTML = allEvents.length ? `
    <div class="p-md border-t border-outline-variant/30">
      <p class="text-label-md text-on-surface-variant font-bold mb-sm">KEY EVENTS TIMELINE</p>
      <div class="space-y-xs">
        ${allEvents.map(e => `
          <div class="flex gap-sm items-start py-xs border-b border-outline-variant/30 last:border-0">
            <span class="text-tertiary font-mono-data text-[10px] w-14 shrink-0 mt-0.5">${e.date || e.date}</span>
            <div>
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-tertiary mr-xs" style="vertical-align:middle"></span>
              <span class="text-body-sm text-on-surface">${e.event}</span>
            </div>
          </div>`).join('')}
      </div>
    </div>` : '';

  container.innerHTML = `
    <div class="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
      <div class="flex items-center justify-between px-md pt-md pb-xs">
        <div>
          <p class="text-label-md font-bold text-on-surface">${(mode==='Compare'?CHART_COMPARE_PAIRS[sectorId]?.label||sectorLabel:sectorLabel).toUpperCase()} — PRICE TREND</p>
          <p class="text-[10px] text-outline font-mono-data">${unit} · ${range} · ${points.length} data points</p>
        </div>
        <span class="text-[10px] font-mono-data px-sm py-xs border border-outline-variant rounded" style="color:${chgColor}">
          ${chgSign}${pctChg}% ${range}
        </span>
      </div>
      ${summaryHTML}
      ${chartHTML}
      ${xLabelHTML}
      ${eventsHTML}
    </div>`;

  // Draw canvas chart after DOM settles
  setTimeout(() => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 600;
    const H = 220;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const PAD = { t:20, r:16, b:10, l:52 };
    const cW = W - PAD.l - PAD.r;
    const cH = H - PAD.t - PAD.b;
    const pRange = (maxP - minP) || 1;
    const padded = pRange * 0.12;
    const yMin = minP - padded, yMax = maxP + padded;

    function xPos(i) { return PAD.l + (i / (points.length - 1)) * cW; }
    function yPos(v) { return PAD.t + cH - ((v - yMin) / (yMax - yMin)) * cH; }

    // Gridlines + Y labels
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = yMin + (yMax - yMin) * (i / yTicks);
      const y = yPos(val);
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
      ctx.fillStyle = '#6b7280';
      ctx.font = `9px 'IBM Plex Mono', monospace`;
      ctx.textAlign = 'right';
      ctx.fillText('$' + val.toFixed(val < 10 ? 2 : val < 100 ? 1 : 0), PAD.l - 6, y + 3);
    }

    // Area fill
    const gradient = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + cH);
    gradient.addColorStop(0, absChg >= 0 ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(prices[0]));
    // Smooth bezier
    for (let i = 1; i < points.length; i++) {
      const xc = (xPos(i-1) + xPos(i)) / 2;
      ctx.bezierCurveTo(xc, yPos(prices[i-1]), xc, yPos(prices[i]), xPos(i), yPos(prices[i]));
    }
    ctx.lineTo(xPos(points.length-1), PAD.t + cH);
    ctx.lineTo(PAD.l, PAD.t + cH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Main line
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(prices[0]));
    for (let i = 1; i < points.length; i++) {
      const xc = (xPos(i-1) + xPos(i)) / 2;
      ctx.bezierCurveTo(xc, yPos(prices[i-1]), xc, yPos(prices[i]), xPos(i), yPos(prices[i]));
    }
    ctx.strokeStyle = absChg >= 0 ? '#4ade80' : '#f87171';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Compare line
    if (comparePoints) {
      const cp = comparePoints.map(p => p.price);
      ctx.beginPath();
      ctx.moveTo(xPos(0), yPos(cp[0]));
      for (let i = 1; i < comparePoints.length; i++) {
        const xc = (xPos(i-1) + xPos(i)) / 2;
        ctx.bezierCurveTo(xc, yPos(cp[i-1]), xc, yPos(cp[i]), xPos(i), yPos(cp[i]));
      }
      ctx.strokeStyle = '#fabc45';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // AI Insight shading
    if (mode === 'AI Insight') {
      points.forEach((p, i) => {
        if (!p.sentiment) return;
        const colors = { Bullish:'rgba(74,222,128,0.08)', Bearish:'rgba(248,113,113,0.08)', Volatile:'rgba(250,188,69,0.1)', Neutral:'rgba(255,255,255,0.03)' };
        const col = colors[p.sentiment.sentiment] || 'rgba(255,255,255,0.03)';
        const x1 = xPos(Math.max(0, i-1));
        const x2 = xPos(i);
        ctx.fillStyle = col;
        ctx.fillRect(x1, PAD.t, x2 - x1, cH);
        ctx.fillStyle = '#fabc45';
        ctx.font = `7px 'IBM Plex Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(p.sentiment.sentiment, (x1+x2)/2, PAD.t + 10);
      });
    }

    // High/Low markers
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.arc(xPos(hiIdx), yPos(maxP), 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f87171';
    ctx.beginPath(); ctx.arc(xPos(loIdx), yPos(minP), 4, 0, Math.PI*2); ctx.fill();

    // Event markers
    points.forEach((p, i) => {
      if (!p.events || !p.events.length) return;
      ctx.fillStyle = '#fabc45';
      ctx.beginPath();
      const ex = xPos(i), ey = yPos(p.price) - 10;
      ctx.moveTo(ex, ey - 6); ctx.lineTo(ex - 4, ey); ctx.lineTo(ex + 4, ey);
      ctx.closePath(); ctx.fill();
    });

    // End price bubble
    const lx = xPos(points.length-1), ly = yPos(endP);
    ctx.fillStyle = absChg >= 0 ? '#4ade80' : '#f87171';
    ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0a1628';
    ctx.beginPath(); ctx.arc(lx, ly, 2.5, 0, Math.PI*2); ctx.fill();
    // Price label
    const label = '$' + endP.toFixed(2);
    ctx.font = `bold 11px 'IBM Plex Sans', sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(label, lx - 8, ly - 8);

    // Save chart snapshot AFTER full draw — this is what we restore on every hover
    const chartSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Hover interaction
    const tooltip = document.getElementById(tooltipId);
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const idx = Math.max(0, Math.min(points.length - 1, Math.round(((mx - PAD.l) / cW) * (points.length - 1))));
      if (mx < PAD.l || mx > W - PAD.r) { tooltip.style.display = 'none'; ctx.putImageData(chartSnapshot, 0, 0); return; }
      const pt = points[idx];
      const chgCol = pt.change >= 0 ? '#4ade80' : '#f87171';
      const sign = pt.change >= 0 ? '+' : '';
      document.getElementById(`${tooltipId}-date`).textContent = pt.date;
      document.getElementById(`${tooltipId}-price`).textContent = '$' + pt.price.toFixed(2);
      document.getElementById(`${tooltipId}-change`).innerHTML = `<span style="color:${chgCol}">${sign}$${Math.abs(pt.change)} (${sign}${pt.changePct}%)</span>`;
      const evEl = document.getElementById(`${tooltipId}-event`);
      if (pt.events && pt.events.length) {
        evEl.textContent = '⚡ ' + pt.events[0].event;
        evEl.style.display = 'block';
      } else { evEl.style.display = 'none'; }
      // Restore full chart then draw crosshair on top
      ctx.putImageData(chartSnapshot, 0, 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.setLineDash([4,4]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xPos(idx), PAD.t); ctx.lineTo(xPos(idx), PAD.t + cH); ctx.stroke();
      ctx.setLineDash([]);
      // Position tooltip
      const tx = xPos(idx) > W/2 ? xPos(idx) - 175 : xPos(idx) + 12;
      tooltip.style.left = tx + 'px';
      tooltip.style.top  = (yPos(pt.price) - 20) + 'px';
      tooltip.style.display = 'block';
      // Dot on hover
      ctx.fillStyle = absChg >= 0 ? '#4ade80' : '#f87171';
      ctx.beginPath(); ctx.arc(xPos(idx), yPos(pt.price), 4, 0, Math.PI*2); ctx.fill();
    });
    canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
  }, 60);
}

function buildPriceChartSVG(prices, sectorId) {
  if (!prices || prices.length < 2) return '<p class="text-body-sm text-on-surface-variant p-sm">Insufficient price data.</p>';
  const entries = prices.map(p => {
    const vals = Object.entries(p).filter(([k,v]) => k !== 'date' && typeof v === 'number');
    return { date: p.date, vals };
  });
  const allVals = entries.flatMap(e => e.vals.map(([,v])=>v));
  const minV = Math.min(...allVals), maxV = Math.max(...allVals), range = maxV - minV || 1;
  const W=400, H=90, px=10, py=12;
  const keys = entries[0]?.vals.map(([k])=>k) || [];
  const palette = ['#a2c9ff','#fabc45','#ffb4ab','#c3c6cf'];
  const lines = keys.map((key,ki) => {
    const pts = entries.map((e,i) => {
      const v = e.vals.find(([k])=>k===key)?.[1];
      if (v===undefined) return null;
      const x = px + (i/(entries.length-1))*(W-2*px);
      const y = H - py - ((v-minV)/range)*(H-2*py);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).filter(Boolean).join(' ');
    const col = palette[ki % palette.length];
    const lastE = entries[entries.length-1];
    const lv = lastE?.vals.find(([k])=>k===key)?.[1];
    const lx = W-px, ly = lv!==undefined ? H-py-((lv-minV)/range)*(H-2*py) : py;
    return `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3" fill="${col}"/>`;
  }).join('');
  const dtLabels = [0, Math.floor(entries.length/2), entries.length-1].map((idx,i) => {
    const xPos = i===0?px : i===1?W/2 : W-px;
    const anchor = i===0?'start':i===1?'middle':'end';
    return `<text x="${xPos}" y="${H+11}" fill="#8b919d" font-size="8" font-family="IBM Plex Mono" text-anchor="${anchor}">${entries[idx]?.date||''}</text>`;
  }).join('');
  const legend = keys.map((k,i) => `<span class="flex items-center gap-xs text-[10px] text-on-surface-variant"><span style="width:12px;height:2px;background:${palette[i%palette.length]};display:inline-block;border-radius:1px"></span>${k.toUpperCase()}</span>`).join('');
  return `
    <div>
      <svg viewBox="0 0 ${W} ${H+16}" xmlns="http://www.w3.org/2000/svg" class="w-full" style="background:#060f16;border-radius:4px">
        ${lines}${dtLabels}
        <text x="${px}" y="${py+6}" fill="#8b919d" font-size="7" font-family="IBM Plex Mono">${maxV.toFixed(1)}</text>
        <text x="${px}" y="${H-py}" fill="#8b919d" font-size="7" font-family="IBM Plex Mono">${minV.toFixed(1)}</text>
      </svg>
      ${legend ? `<div class="flex flex-wrap gap-sm mt-sm">${legend}</div>` : ''}
    </div>`;
}

function renderHistoryChartArea(sectorId, range, mode) {
  range = range || '30D';
  mode  = mode  || 'Price';
  const hist   = historicalTrends[sectorId];
  const sector = sectorScores.find(s => s.id === sectorId) ||
                 [{ id:'gold',label:'Gold' },{ id:'copper',label:'Copper' },{ id:'wheat',label:'Wheat' },{ id:'uranium',label:'Uranium' },{ id:'lithium',label:'Lithium' }].find(c=>c.id===sectorId);
  if (!hist) {
    // Cross-market commodities: still render chart with synthetic data
    const label = sector?.sector || sector?.label || sectorId;
    document.getElementById('history-chart-area').innerHTML = `<div id="premium-chart-wrap"></div>`;
    renderPremiumChart('premium-chart-wrap', sectorId, range, mode, label);
    return;
  }
  const sectorLabel = sector?.sector || sector?.label || sectorId;
  const sentHist = (hist.sentimentHistory || []);
  const confBars = sentHist.map(s => {
    const col = s.confidence>=80?'bg-primary':s.confidence>=60?'bg-tertiary':'bg-error';
    const sc  = getSentimentLabel(s.sentiment).colorClass;
    return `
      <div class="flex items-center gap-sm">
        <span class="text-[10px] text-outline font-mono-data w-14 shrink-0">${s.date}</span>
        <div class="flex-1 bg-outline-variant h-2 rounded-full overflow-hidden">
          <div class="${col} h-full rounded-full" style="width:${s.confidence}%"></div>
        </div>
        <span class="text-[10px] font-mono-data ${sc} w-24 text-right shrink-0">${s.confidence}% ${s.sentiment}</span>
      </div>`;
  }).join('');
  const sentTimeline = sentHist.map(s => {
    const si = getSentimentLabel(s.sentiment);
    return `
      <div class="flex items-center gap-xs py-xs border-b border-outline-variant/50 last:border-b-0">
        <span class="text-[10px] text-outline font-mono-data w-14 shrink-0">${s.date}</span>
        <span class="text-[10px] px-2 py-0.5 border ${si.borderClass} ${si.colorClass} rounded-sm font-bold">${si.label}</span>
        <span class="text-[10px] text-on-surface-variant">${s.confidence}%</span>
      </div>`;
  }).join('');

  document.getElementById('history-chart-area').innerHTML = `
    <div class="space-y-md">
      <div id="premium-chart-wrap"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div class="bg-surface-container border border-outline-variant rounded-lg p-md">
          <p class="text-label-md text-on-surface-variant font-bold mb-md">AI CONFIDENCE TREND</p>
          <div class="space-y-sm">${confBars || '<p class="text-body-sm text-on-surface-variant">No confidence data.</p>'}</div>
        </div>
        <div class="bg-surface-container border border-outline-variant rounded-lg p-md">
          <p class="text-label-md text-on-surface-variant font-bold mb-md">SENTIMENT HISTORY</p>
          <div>${sentTimeline || '<p class="text-body-sm text-on-surface-variant">No sentiment data.</p>'}</div>
        </div>
      </div>
    </div>`;

  renderPremiumChart('premium-chart-wrap', sectorId, range, mode, sectorLabel);
}

// ─── AI REPORT CARD (right column — analytical style) ─────────────────────────
function renderAIReportCard(h) {
  const badge = getImpactBadge(h.impact);
  const sentCol = { Bullish:'text-primary', Bearish:'text-error', Neutral:'text-on-surface-variant', Volatile:'text-tertiary', 'Risk Elevated':'text-tertiary' }[h.sentimentEffect] || 'text-on-surface-variant';
  const displayTime = h.time || formatTimestamp(h.timestamp || '');
  const confPct = h.confidence || 0;
  const confCol = confPct >= 80 ? 'bg-primary' : confPct >= 60 ? 'bg-tertiary' : 'bg-error';
  return `
  <div class="p-xs bg-surface-container-high border border-outline-variant rounded hover:bg-surface-container-highest hover:border-primary/40 transition-colors cursor-pointer feed-row border-l-2 border-l-primary/30"
       data-feed-id="${h.id}">
    <div class="flex items-center justify-between gap-xs mb-xs">
      <div class="flex items-center gap-xs flex-wrap">
        <span class="${badge.bg} ${badge.text} text-[9px] font-bold rounded px-1.5 py-0.5">${badge.label}</span>
        <span class="text-[9px] text-outline font-mono-data">${displayTime}</span>
      </div>
      <div class="flex items-center gap-xs shrink-0">
        <span class="text-[9px] px-1 py-0.5 border border-primary/30 text-primary rounded font-bold">AI-SCORED</span>
        ${confPct ? `<div class="flex items-center gap-xs"><div class="w-8 bg-outline-variant h-1 rounded-full overflow-hidden"><div class="${confCol} h-full rounded-full" style="width:${confPct}%"></div></div><span class="text-[9px] font-mono-data text-primary">${confPct}%</span></div>` : ''}
      </div>
    </div>
    <p class="text-body-sm font-bold text-on-surface leading-snug mb-xs">${h.headline}</p>
    <p class="text-[10px] text-on-surface-variant leading-snug italic mb-xs">${h.whyItMatters}</p>
    <div class="flex items-center gap-xs flex-wrap">
      <span class="text-[9px] text-outline">SRC: ${h.source.toUpperCase()}</span>
      <span class="text-[9px] px-1 py-0.5 bg-surface-container-highest text-on-surface-variant rounded">${h.sector.toUpperCase()}</span>
      ${h.category ? `<span class="text-[9px] px-1 py-0.5 bg-surface-container-highest text-on-surface-variant rounded border border-outline-variant/40">${h.category.toUpperCase()}</span>` : ''}
      <span class="text-[9px] ${sentCol} border border-outline-variant/40 px-1 py-0.5 rounded ml-auto">${h.sentimentEffect.toUpperCase()}</span>
    </div>
  </div>`;
}

// ─── LIVE FEED PANEL ITEMS ────────────────────────────────────────────────────
function renderLiveFeedPanelItems(items) {
  const panel = document.getElementById('live-feed-panel');
  const count = document.getElementById('live-feed-count');
  if (!panel) return;
  panel.className = '';

  const sorted = sortFeedByPriority(items);
  if (count) count.textContent = `${sorted.length}`;

  panel.innerHTML = sorted.map((item, idx) => {
    const badge    = getImpactBadge(item.impact);
    const sentCol  = { Bullish:'text-primary', Bearish:'text-error', Neutral:'text-on-surface-variant', Volatile:'text-tertiary', 'Risk Elevated':'text-tertiary' }[item.sentimentEffect] || 'text-on-surface-variant';
    const relTime  = formatTimestamp(item.timestamp);
    return `
      <div class="p-xs bg-surface-container-high border border-outline-variant rounded hover:bg-surface-container-highest hover:border-primary/40 transition-colors cursor-pointer live-feed-row ${idx===0?'feed-new':''} border-l-2 border-l-error/40 mb-xs"
           data-live-item-id="${item.id}">
        <div class="flex items-center justify-between gap-xs mb-xs">
          <div class="flex items-center gap-xs flex-wrap">
            ${item.isBreaking?'<span class="px-1 py-0.5 bg-error text-[9px] font-bold rounded-sm breaking-badge">BREAKING</span>':''}
            <span class="${badge.bg} ${badge.text} text-[9px] font-bold rounded px-1.5 py-0.5">${badge.label}</span>
            <span class="text-[9px] text-outline font-mono-data">${relTime}</span>
          </div>
          <span class="text-[9px] px-1 py-0.5 border border-error/40 text-error rounded font-bold shrink-0 flex items-center gap-xs"><span class="w-1 h-1 rounded-full bg-error live-dot inline-block"></span>LIVE</span>
        </div>
        <p class="text-body-sm font-bold text-on-surface leading-snug mb-xs">${item.title}</p>
        <p class="text-[10px] text-on-surface-variant leading-snug italic mb-xs">${item.whyItMatters}</p>
        <div class="flex items-center gap-xs flex-wrap">
          <span class="text-[9px] text-outline">SRC: ${item.source.toUpperCase()}</span>
          <span class="text-[9px] px-1 py-0.5 bg-surface-container-highest text-on-surface-variant rounded">${item.sector.toUpperCase()}</span>
          ${item.eventType ? `<span class="text-[9px] px-1 py-0.5 bg-surface-container-highest text-on-surface-variant rounded border border-outline-variant/40">${item.eventType.toUpperCase()}</span>` : ''}
          <span class="text-[9px] px-1 py-0.5 border border-outline-variant/40 ${sentCol} rounded ml-auto">${item.sentimentEffect.toUpperCase()}</span>
        </div>
      </div>`;
  }).join('');

  // Wire clicks
  panel.querySelectorAll('.live-feed-row').forEach(row => {
    row.addEventListener('click', () => {
      const id   = row.dataset.liveItemId;
      const item = liveFeedItems.find(i => i.id === id);
      if (item) {
        GEIState.set({ selectedFeedItem: item.id, selectedSector: sectorScores.find(s => s.sector === item.sector)?.id || null });
        openDrawer('feedItem', item);
      }
    });
  });
}

// ─── HELPER: wire intel feed clicks ──────────────────────────────────────────
function wireIntelFeedClicks() {
  document.querySelectorAll('.feed-row').forEach(row => {
    row.addEventListener('click', () => {
      const id   = row.dataset.feedId;
      const item = intelligenceFeed.find(i => i.id === id);
      if (item) {
        GEIState.set({ selectedFeedItem: item.id, selectedSector: sectorScores.find(s => s.sector === item.sector)?.id || null });
        openDrawer('feedItem', item);
      }
    });
  });
}

// ─── HELPER: impact badge html ────────────────────────────────────────────────
function getImpactBadgeHtml(impact) {
  const b = getImpactBadge(impact);
  return '<span class=' + JSON.stringify(b.bg + ' ' + b.text + ' text-[10px] px-2 py-0.5 font-bold rounded') + '>' + b.label + '</span>';
}

function getGeoRiskBarColorByLevel(level) {
  const m = {Critical:'bg-error',High:'bg-tertiary',Moderate:'bg-primary',Low:'bg-on-surface-variant'};
  return m[level] || 'bg-outline-variant';
}
