/**
 * GeoEnergy Intelligence AI — State Management
 * Simple pub/sub state store. No framework needed.
 */
const GEIState = (() => {
  let _state = {
    selectedTab: 'dashboard',       // dashboard | commodities | georisk | headlines | history
    selectedSector: null,           // sector id string
    selectedRiskRegion: null,       // geoRisk id string
    selectedFeedItem: null,         // live feed item id
    selectedTickerItem: null,       // ticker id
    highlightedSectors: [],         // sectors highlighted from risk row click

    activeFilters: {
      sector:      'All',
      impact:      'All',
      region:      'All',
      time:        'Today',
      risk:        'All',
      feedCategory:'All'
    },

    isLoading:        false,
    lastUpdated:      null,
    refreshCount:     0,

    showFilterPanel:  false,
    showAlertPanel:   false,
    showSettingsPanel:false,

    showDrawer:       false,
    drawerType:       null,   // 'sector'|'ticker'|'georisk'|'feedItem'|'marketPulse'|'liveBar'
    drawerData:       null,

    showModal:        false,
    modalType:        null,   // 'executiveBriefing'|'allReports'|'footer'|'account'|'history'|'dataSources'
    modalData:        null,

    dataMode:         'live', // 'mock' | 'live'
    settings: {
      refreshInterval: '5m',  // '30s'|'1m'|'5m'|'manual'
      theme:           'dark',
      notifications:   true
    },
    dataSourceStatus: {
      prices:     'mock',
      news:       'mock',
      geoRisk:    'mock',
      aiAnalysis: 'mock',
      satellite:  'offline',
      lastSyncTime: new Date().toISOString()
    },
    allReportsSearch: '',
    allReportsSort:   'newest',  // 'newest'|'impact'|'sector'
    allReportsLimit:  3
  };

  const _subscribers = [];

  function _notify() {
    _subscribers.forEach(fn => fn({ ..._state }));
  }

  return {
    get(key) {
      return key ? _state[key] : { ..._state };
    },
    set(updates) {
      _state = { ..._state, ...updates };
      _notify();
    },
    setNested(path, value) {
      // e.g. setNested('activeFilters.sector', 'Crude Oil')
      const keys = path.split('.');
      const top  = keys[0];
      if (keys.length === 2) {
        _state = { ..._state, [top]: { ..._state[top], [keys[1]]: value } };
      }
      _notify();
    },
    subscribe(fn) {
      _subscribers.push(fn);
      return () => _subscribers.splice(_subscribers.indexOf(fn), 1);
    },
    reset() {
      _state.activeFilters = { sector:'All', impact:'All', region:'All', time:'Today', risk:'All', feedCategory:'All' };
      _notify();
    }
  };
})();
