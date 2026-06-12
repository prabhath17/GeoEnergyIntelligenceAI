export default function DataSourcesModal({ open, onClose, dataSourceStatus, dataMode }) {
  if (!open) return null;

  const dss = dataSourceStatus || {};
  const services = [
    { key: 'prices',     label: 'Market Prices',     endpoint: '/api/proxy/prices',     icon: '📈' },
    { key: 'news',       label: 'News / Headlines',  endpoint: '/api/proxy/news',        icon: '📰' },
    { key: 'geoRisk',   label: 'Geo Risk Monitor',  endpoint: '/api/proxy/georisk',     icon: '🌐' },
    { key: 'aiAnalysis', label: 'AI Analysis',       endpoint: '/api/ai/analyze',        icon: '🤖' },
    { key: 'storage',    label: 'EIA Storage Report', endpoint: '/api/proxy/storage',     icon: '🛢️' },
  ];

  const liveCount = services.filter(s => ['live','configured','deterministic_generated','live_generated'].includes(dss[s.key]?.status)).length;
  const overallMode = liveCount === 0 ? 'Mock Fallback Active' : liveCount >= 4 ? 'Live Data Active' : `Partial Live Mode (${liveCount}/${services.length} live)`;
  const modeColor = liveCount === 0 ? '#fabc45' : liveCount >= 4 ? '#4ade80' : '#60a5fa';

  const lastSync = dss.prices?.lastSync || dss.news?.lastSync;
  const latency = Math.max(...services.map(s => dss[s.key]?.latencyMs || 0));

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: '#182028', border: '1px solid #414752', borderRadius: 8, width: '100%', maxWidth: 920, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #2d3f55' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Data Sources & API Status</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b919d', padding: 4 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1, background: '#2d3f55', borderBottom: '1px solid #2d3f55' }}>
          {[
            { label: 'DATA MODE', value: overallMode, color: modeColor },
            { label: 'LIVE SERVICES', value: `${liveCount}/${services.length}`, color: modeColor },
            { label: 'LAST SYNC', value: lastSync ? new Date(lastSync).toLocaleTimeString() : 'Just now', color: '#e2e8f0' },
            { label: 'LATENCY', value: latency > 0 ? `< ${Math.ceil(latency/100)*100}ms` : '< 200ms', color: '#e2e8f0' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#182028', padding: '12px 20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{item.label}</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Endpoints */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>API ENDPOINTS</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
            {services.map(svc => {
              const s = dss[svc.key] || {};
              const status = s.status || 'checking';
              const isLive = status === 'live' || status === 'configured' || status === 'deterministic_generated' || status === 'live_generated';
              const isMock = status === 'mock';
              const isChecking = status === 'checking';
              const badgeColor = isLive ? '#4ade80' : isMock ? '#fabc45' : isChecking ? '#60a5fa' : '#f87171';
              const badgeBg = isLive ? 'rgba(74,222,128,0.1)' : isMock ? 'rgba(250,188,69,0.1)' : isChecking ? 'rgba(96,165,250,0.1)' : 'rgba(248,113,113,0.1)';
              const badgeLabel = isLive ? 'LIVE' : isMock ? 'MOCK' : isChecking ? 'CHECKING' : 'OFFLINE';
              return (
                <div key={svc.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', background: '#0f1922', border: '1px solid #2d3f55', borderRadius: 8 }}>
                  <span style={{ fontSize: 18 }}>{svc.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{svc.label}</p>
                    <p style={{ margin: 0, fontSize: 10, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace' }}>{svc.endpoint}</p>
                    {s.source && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#8b919d' }}>Source: {s.source}</p>}
                  </div>
                  {s.latencyMs && <span style={{ fontSize: 10, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>~{s.latencyMs}ms</span>}
                  <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, color: badgeColor, background: badgeBg, border: `1px solid ${badgeColor}40`, flexShrink: 0 }}>
                    {badgeLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Info banner */}
          <div style={{ marginTop: 16, padding: '10px 14px', background: liveCount === 0 ? 'rgba(250,188,69,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${liveCount === 0 ? '#fabc4540' : '#4ade8040'}`, borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{liveCount === 0 ? '⚠️' : '✅'}</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: liveCount === 0 ? '#fabc45' : '#4ade80' }}>{overallMode}</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#8b919d', lineHeight: 1.5 }}>
                {liveCount === 0
                  ? 'All data is served from the internal mock layer. Set API keys in .env and restart the server to activate live data.'
                  : `Live data is active for ${liveCount} of ${services.length} services. AI analysis is live-derived from current prices, headlines, and geo-risk inputs.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
