import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Drawer from './components/Drawer.jsx';
import Modal from './components/Modal.jsx';
import AlertsPanel from './components/AlertsPanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import AccountDropdown from './components/AccountDropdown.jsx';
import DataSourcesModal from './components/DataSourcesModal.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CommoditiesPage from './pages/CommoditiesPage.jsx';
import AIAnalysisPage from './pages/AIAnalysisPage.jsx';
import GeoRiskPage from './pages/GeoRiskPage.jsx';
import HeadlinesPage from './pages/HeadlinesPage.jsx';
import StatisticsPage from './pages/StatisticsPage.jsx';
import { fetchLiveDashboard, fetchDataSourceStatus, fetchExecutiveBriefing } from './services/api.js';
import { sanitizeFeedItems, sortFeedByPriority, formatLocalTime } from './utils/helpers.js';
import { MOCK_PULSE, MOCK_TICKERS, MOCK_SECTORS, MOCK_GEORISK, MOCK_INTEL, MOCK_LIVE_FEED, MOCK_CROSS, MOCK_BRIEFING, MOCK_ALERTS, SIM_EVENTS } from './utils/mockData.js';
import { deriveSectorScores } from './utils/sectorIntelligenceEngine.js';

const INITIAL_DATA = {
  marketPulse:              { ...MOCK_PULSE },
  tickerItems:              [...MOCK_TICKERS],
  sectorScores:             deriveSectorScores({
    tickerItems: MOCK_TICKERS,
    intelligenceFeed: MOCK_INTEL,
    liveFeedItems: MOCK_LIVE_FEED,
    geoRiskItems: MOCK_GEORISK,
    crossMarketSignals: MOCK_CROSS,
    previous: MOCK_SECTORS,
  }),
  geoRiskItems:             [...MOCK_GEORISK],
  intelligenceFeed:         [...MOCK_INTEL],
  liveFeedItems:            [...MOCK_LIVE_FEED],
  crossMarketSignals:       [...MOCK_CROSS],
  executiveBriefing:        { ...MOCK_BRIEFING },
  structuredBriefing:       null,
  crossMarketSignalSummary: null,
  dataSourceStatus:         {},
  mode:                     'mock',
};

function Toast({ message, type, onDismiss }) {
  const col = type==='error'?'bg-error-container text-on-error-container border-error/40':type==='success'?'bg-primary-container text-on-primary-container border-primary/40':type==='warn'?'bg-tertiary-container text-on-tertiary-container border-tertiary/40':'bg-surface-container-highest text-on-surface border-outline-variant';
  return (
    <div className={`fixed bottom-lg right-lg z-[200] flex items-center gap-sm px-md py-sm rounded border ${col} shadow-2xl text-body-sm font-bold`}>
      {message}
      <button onClick={onDismiss} className="ml-sm opacity-60 hover:opacity-100 transition-opacity text-xs">✕</button>
    </div>
  );
}

export default function App() {
  const [data,         setData]         = useState(INITIAL_DATA);
  const [currentPage,  setCurrentPage]  = useState(() => window.location.hash.replace('#','') || 'dashboard');
  const [loading,      setLoading]      = useState(false);
  const [systemStatus, setSystemStatus] = useState('');
  const [toast,        setToast]        = useState(null);
  const [drawer,       setDrawer]       = useState({ open: false, type: null, data: null });
  const [modal,        setModal]        = useState({ open: false, type: null, data: null });
  const [alertsOpen,       setAlertsOpen]       = useState(false);
  const [settingsOpen,     setSettingsOpen]     = useState(false);
  const [accountOpen,      setAccountOpen]      = useState(false);
  const [dataSourcesOpen,  setDataSourcesOpen]  = useState(false);
  const profileBtnRef = useRef(null);
  const [feedFilter,   setFeedFilter]   = useState('All');
  const [intelFilter,  setIntelFilter]  = useState('all');
  const [settings,     setSettings]     = useState({ refreshInterval: '5m', theme: 'dark', notifications: true });
  const [dataMode,     setDataMode]     = useState('live');
  const simIdxRef = useRef(0);
  const autoRefreshRef = useRef(null);

  const showToast = useCallback((msg, type = 'info', duration = 4000) => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const closeAll = useCallback(() => {
    setDrawer({ open: false, type: null, data: null });
    setModal({ open: false, type: null, data: null });
    setAlertsOpen(false);
    setSettingsOpen(false);
    setAccountOpen(false);
    setDataSourcesOpen(false);
  }, []);

  const openDrawer = useCallback((type, data) => {
    setAlertsOpen(false); setSettingsOpen(false);
    setModal({ open: false, type: null, data: null });
    setDrawer({ open: true, type, data });
  }, []);

  const openModal = useCallback((type, data) => {
    setAlertsOpen(false); setSettingsOpen(false);
    setModal({ open: true, type, data });
  }, []);

  // Live data fetch — guards prevent short API responses from overwriting full mock data
  const fetchLive = useCallback(async () => {
    if (dataMode === 'mock') return;
    setLoading(true);
    setSystemStatus('System: Fetching live data...');
    try {
      const [res, briefingRes] = await Promise.allSettled([
        fetchLiveDashboard(),
        fetchExecutiveBriefing(),
      ]);
      const dashData = res.status === 'fulfilled' ? res.value : {};
      const structuredBriefing = briefingRes.status === 'fulfilled' ? briefingRes.value : null;
      setData(prev => {
        const next = {
          ...prev,
          marketPulse:              dashData.marketPulse      || prev.marketPulse,
          tickerItems:              dashData.tickerItems      || prev.tickerItems,
          // geo risk: only replace if API returns full set (>= 18 items)
          geoRiskItems:             (dashData.geoRiskItems?.length >= 18 ? dashData.geoRiskItems : null) || prev.geoRiskItems,
          intelligenceFeed:         sanitizeFeedItems(dashData.intelligenceFeed  || prev.intelligenceFeed),
          liveFeedItems:            sanitizeFeedItems(dashData.liveFeedItems     || prev.liveFeedItems),
          // cross-market: only replace if API returns full set (>= 10 items)
          crossMarketSignals:       (dashData.crossMarketSignals?.length >= 10 ? dashData.crossMarketSignals : null) || prev.crossMarketSignals,
          executiveBriefing:        dashData.executiveBriefing || prev.executiveBriefing,
          structuredBriefing:       structuredBriefing || prev.structuredBriefing,
          crossMarketSignalSummary: dashData.crossMarketSignalSummary || prev.crossMarketSignalSummary,
          dataSourceStatus:         dashData.dataSourceStatus || prev.dataSourceStatus,
          mode:                     dashData.mode || 'mock',
        };
        next.sectorScores = deriveSectorScores({ ...next, previous: dashData.sectorScores || prev.sectorScores });
        return next;
      });
      const mode = dashData.mode || 'mock';
      const label = mode==='live'?'Live Data Active':mode==='partial'?'Partial Live Mode':'Mock Fallback Active';
      const type  = mode==='live'?'success':mode==='partial'?'info':'warn';
      showToast(label, type, 3500);
      setSystemStatus(`${label} | ${formatLocalTime(new Date().toISOString())}`);
    } catch (err) {
      showToast('Live data unavailable — using mock fallback.', 'warn');
      setSystemStatus(`Mock Fallback Active | ${formatLocalTime(new Date().toISOString())}`);
      setData(prev => ({
        ...prev,
        mode: 'mock',
      }));
    } finally {
      setLoading(false);
    }
  }, [dataMode, showToast]);

  // Auto-refresh
  const restartAutoRefresh = useCallback(() => {
    clearInterval(autoRefreshRef.current);
    const msMap = { '30s':30000, '1m':60000, '5m':300000, 'manual':0 };
    const ms = msMap[settings.refreshInterval] || 300000;
    if (ms > 0) autoRefreshRef.current = setInterval(fetchLive, ms);
  }, [settings.refreshInterval, fetchLive]);

  // Live feed simulation
  useEffect(() => {
    const injectSim = () => {
      const evt = { ...SIM_EVENTS[simIdxRef.current % SIM_EVENTS.length], id: `sim-${Date.now()}`, timestamp: new Date().toISOString() };
      simIdxRef.current++;
      setData(prev => {
        const next = { ...prev, liveFeedItems: [evt, ...prev.liveFeedItems].slice(0, 30) };
        return { ...next, sectorScores: deriveSectorScores({ ...next, previous: prev.sectorScores }) };
      });
    };
    let t;
    const schedule = () => { t = setTimeout(() => { injectSim(); schedule(); }, 30000 + Math.random()*30000); };
    schedule();
    return () => clearTimeout(t);
  }, []);

  // Ticker simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const next = {
          ...prev,
          tickerItems: prev.tickerItems.map(item => {
          const delta = (Math.random()-0.48)*(item.price*0.003);
          const price = Math.max(0.01, item.price + delta);
          const changePercent = parseFloat((item.changePercent + (Math.random()-0.5)*0.08).toFixed(1));
          const direction = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat';
          return { ...item, price, changePercent, direction };
          }),
        };
        return { ...next, sectorScores: deriveSectorScores({ ...next, previous: prev.sectorScores }) };
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // System clock
  useEffect(() => {
    const tick = () => {
      if (!loading) setSystemStatus(`System: Nominal | ${formatLocalTime(new Date().toISOString())}`);
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [loading]);

  // Hash routing
  useEffect(() => {
    const handler = () => setCurrentPage(window.location.hash.replace('#','') || 'dashboard');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // Standalone data-source status poll — runs fast independently of the full dashboard fetch
  useEffect(() => {
    const applyStatus = (res) => {
      if (!res || typeof res !== 'object') return;
      const { prices, news, geoRisk, aiAnalysis, storage, lastSync } = res;
      setData(prev => ({
        ...prev,
        dataSourceStatus: { prices, news, geoRisk, aiAnalysis, storage, lastSyncTime: lastSync || new Date().toISOString() },
      }));
    };
    fetchDataSourceStatus().then(applyStatus).catch(() => {});
    const interval = setInterval(() => fetchDataSourceStatus().then(applyStatus).catch(() => {}), 60000);
    return () => clearInterval(interval);
  }, []);

  // Initial fetch + auto-refresh setup
  useEffect(() => {
    fetchLive();
    restartAutoRefresh();
    return () => clearInterval(autoRefreshRef.current);
  }, []);

  useEffect(() => { restartAutoRefresh(); }, [settings.refreshInterval]);

  const handleNav = (page) => {
    closeAll();
    setCurrentPage(page);
    window.location.hash = page;
  };

  const handleSettingsChange = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const handleDataModeChange = (mode) => {
    setDataMode(mode);
    if (mode === 'live') { closeAll(); showToast('Switching to Live API mode…', 'info', 2500); setTimeout(fetchLive, 300); }
  };

  const commonProps = {
    data,
    onSectorClick:  (s)    => openDrawer('sector',    s),
    onTickerClick:  (t)    => openDrawer('ticker',    t),
    onRiskClick:    (r)    => openDrawer('georisk',   r),
    onSignalClick:  (s)    => openDrawer('signal',    s),
    onFeedItemClick:(item) => openDrawer('feedItem',  item),
    onItemClick:    (item) => openDrawer('feedItem',  item),
  };

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md">
      <Header
        currentPage={currentPage} onNav={handleNav}
        onRefresh={fetchLive} onAlerts={() => { closeAll(); setAlertsOpen(true); }}
        onSettings={() => { closeAll(); setSettingsOpen(true); }}
        onProfile={() => { closeAll(); setAccountOpen(a => !a); }}
        profileBtnRef={profileBtnRef}
        systemStatus={systemStatus} loading={loading}
      />

      {/* Pages */}
      {currentPage === 'dashboard' && (
        <DashboardPage
          {...commonProps}
          feedFilter={feedFilter} onFeedFilterChange={setFeedFilter}
          intelFilter={intelFilter} onIntelFilterChange={setIntelFilter}
          onMarketPulseClick={(d) => openDrawer('marketPulse', d)}
          onViewFullAnalysis={() => openModal('executiveBriefing', { briefing: data.executiveBriefing, fullData: data })}
          onViewAllReports={() => openModal('allReports', { items: data.intelligenceFeed })}
        />
      )}
      {currentPage === 'commodities'  && <CommoditiesPage {...commonProps} />}
      {currentPage === 'ai-analysis'  && (
        <AIAnalysisPage
          data={data}
          onFeedItemClick={(item) => openDrawer('feedItem', item)}
        />
      )}
      {currentPage === 'georisk'     && <GeoRiskPage     {...commonProps} />}
      {currentPage === 'headlines'   && <HeadlinesPage   {...commonProps} />}
      {currentPage === 'statistics'  && <StatisticsPage />}

      <Footer onFooterLink={type => openModal('footer', { title: type.charAt(0).toUpperCase()+type.slice(1), type })} />

      {/* Overlays */}
      <Drawer
        open={drawer.open} type={drawer.type} data={drawer.data}
        onClose={closeAll}
        intelligenceFeed={data.intelligenceFeed}
        sectorScores={data.sectorScores}
        crossMarketSignals={data.crossMarketSignals}
        executiveBriefing={data.executiveBriefing}
        onOpenBriefingModal={() => openModal('executiveBriefing', { briefing: data.executiveBriefing, fullData: data })}
      />

      <Modal
        open={modal.open} type={modal.type} data={modal.data}
        onClose={() => setModal({ open: false, type: null, data: null })}
        intelligenceFeed={data.intelligenceFeed}
        geoRiskItems={data.geoRiskItems}
        crossMarketSignalSummary={data.crossMarketSignalSummary}
        dataMode={dataMode}
      />

      <AlertsPanel
        open={alertsOpen} onClose={closeAll} alerts={MOCK_ALERTS}
        onOpenFeedItem={(item) => openDrawer('feedItem', item)}
      />

      <SettingsPanel
        open={settingsOpen} onClose={closeAll}
        settings={settings} onSettingsChange={handleSettingsChange}
        dataMode={dataMode} onDataModeChange={handleDataModeChange}
        dataSourceStatus={data.dataSourceStatus}
        onOpenDataSources={() => { setSettingsOpen(false); setDataSourcesOpen(true); }}
      />

      <AccountDropdown
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onOpenDataSources={() => { setAccountOpen(false); setDataSourcesOpen(true); }}
        profileBtnRef={profileBtnRef}
      />

      <DataSourcesModal
        open={dataSourcesOpen}
        onClose={() => setDataSourcesOpen(false)}
        dataSourceStatus={data.dataSourceStatus}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
