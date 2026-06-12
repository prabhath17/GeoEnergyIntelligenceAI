import { formatTimestamp } from '../utils/helpers.js';

export default function SettingsPanel({ open, onClose, settings, onSettingsChange, dataMode, onDataModeChange, dataSourceStatus, onOpenDataSources }) {
  if (!open) return null;
  const s = settings || { refreshInterval: '5m', theme: 'dark', notifications: true };
  const dss = dataSourceStatus || {};
  const intOpts = ['30s','1m','5m','manual'];

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="side-panel panel-open flex flex-col">
        <div className="flex items-center justify-between p-md border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            <h3 className="text-headline-sm font-bold">Settings</h3>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-md space-y-lg">
          <div>
            <p className="text-label-md text-on-surface-variant mb-sm">REFRESH INTERVAL</p>
            <div className="grid grid-cols-4 gap-xs">
              {intOpts.map(v => (
                <button key={v} onClick={() => onSettingsChange?.('refreshInterval', v)}
                  className={`py-sm rounded text-[11px] font-bold border transition-colors ${s.refreshInterval===v?'bg-primary-container border-primary text-on-primary-container':'border-outline-variant text-on-surface-variant hover:border-primary'}`}>
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-label-md text-on-surface-variant mb-sm">THEME</p>
            <div className="flex items-center gap-sm px-sm py-xs bg-surface-container-high border border-primary/30 rounded">
              <span className="w-3 h-3 rounded-full bg-background border border-primary/50 shrink-0" />
              <span className="text-[11px] font-bold text-primary">Dark</span>
              <span className="text-[10px] text-outline ml-auto font-mono-data">ACTIVE</span>
            </div>
          </div>

          <div>
            <p className="text-label-md text-on-surface-variant mb-sm">DATA MODE</p>
            <div className="grid grid-cols-2 gap-xs">
              {['mock','live'].map(v => (
                <button key={v} onClick={() => onDataModeChange?.(v)}
                  className={`py-sm rounded text-[11px] font-bold border transition-colors ${dataMode===v?'bg-primary-container border-primary text-on-primary-container':'border-outline-variant text-on-surface-variant hover:border-primary'}`}>
                  {v==='mock'?'Mock Data':'Live API'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-sm font-bold text-on-surface">Notifications</p>
              <p className="text-[10px] text-outline">Alert panel + badge updates</p>
            </div>
            <button onClick={() => onSettingsChange?.('notifications', !s.notifications)}
              className={`w-12 h-6 rounded-full transition-colors relative ${s.notifications?'bg-primary':'bg-outline-variant'}`}>
              <span className={`w-4 h-4 bg-background rounded-full absolute top-1 transition-all ${s.notifications?'left-7':'left-1'}`} />
            </button>
          </div>

          <div className="bg-surface-container-high p-md rounded border border-outline-variant">
            <p className="text-label-md text-on-surface-variant mb-sm">DATA SOURCE STATUS</p>
            <div className="space-y-xs">
              {Object.entries(dss).filter(([k]) => k !== 'lastSyncTime').map(([k, v]) => {
                const status = typeof v === 'string' ? v : v?.status;
                const isLive = status === 'live' || status === 'online' || status === 'configured';
                return (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-body-sm text-on-surface-variant capitalize">{k}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isLive?'bg-primary-container/30 text-primary':status==='mock'?'bg-tertiary-container/30 text-tertiary':'bg-error-container/30 text-error'}`}>
                      {isLive ? 'LIVE' : String(status || 'offline').toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-outline mt-sm">Last sync: {formatTimestamp(dss.lastSyncTime || new Date().toISOString())}</p>
            <button onClick={onOpenDataSources} className="w-full mt-sm py-xs text-label-md text-primary hover:underline">
              View Full API Status →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
