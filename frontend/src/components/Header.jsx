import { getCurrentLocalTime } from '../utils/helpers.js';

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'commodities',  label: 'Commodities' },
  { id: 'ai-analysis',  label: 'AI Analysis', badge: 'NEW' },
  { id: 'georisk',      label: 'Geo Risk' },
  { id: 'headlines',    label: 'Headlines' },
  { id: 'statistics',   label: 'Statistics' },
];

export default function Header({ currentPage, onNav, onRefresh, onAlerts, onSettings, onProfile, systemStatus, loading }) {
  return (
    <header className="flex justify-between items-center w-full px-lg py-sm h-16 border-b border-outline-variant bg-background sticky top-0 z-50">
      <div className="flex items-center gap-xl">
        <div className="cursor-pointer" onClick={() => onNav('dashboard')}>
          <h1 className="text-headline-sm font-bold text-on-background tracking-tight leading-none">
            GeoEnergy Intelligence AI
          </h1>
          <p style={{ fontFamily: "'Segoe Script','Bradley Hand ITC','Brush Script MT','Dancing Script',cursive", fontSize: '10px', color: '#5d7d94', marginTop: 1, letterSpacing: '0.01em', lineHeight: 1, opacity: 0.85 }}>
            by Prabhath Chigurupati
          </p>
        </div>
        <nav className="hidden md:flex gap-md xl:gap-lg">
          {NAV_ITEMS.map(item => (
            <a
              key={item.id}
              onClick={e => { e.preventDefault(); onNav(item.id); }}
              href={`#${item.id}`}
              className={`text-[12px] xl:text-label-md cursor-pointer transition-colors duration-200 flex items-center gap-xs ${
                currentPage === item.id
                  ? 'text-primary border-b-2 border-primary pb-1'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {item.label}
              {item.badge && (
                <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(199,157,247,0.15)', color: '#c79df7', border: '1px solid rgba(199,157,247,0.3)', lineHeight: 1 }}>
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-md">
        <div className="hidden lg:flex items-center gap-xs px-sm py-xs bg-surface-container rounded-full border border-outline-variant max-w-[260px] xl:max-w-none">
          <span className="w-2 h-2 rounded-full bg-tertiary live-dot shrink-0" />
          <span className="text-[11px] xl:text-label-md font-mono-data text-on-surface-variant truncate">
            {systemStatus || `System: Nominal | ${getCurrentLocalTime()}`}
          </span>
        </div>

        <div className="flex gap-sm">
          <button
            onClick={onRefresh}
            className={`p-xs text-on-surface-variant hover:text-primary transition-all ${loading ? 'animate-spin-slow' : ''}`}
            title="Refresh data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
          </button>
          <button onClick={onAlerts} className="p-xs text-on-surface-variant hover:text-primary transition-all relative" title="Alerts">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span className="w-2 h-2 bg-error rounded-full absolute top-1 right-1" />
          </button>
          <button onClick={onSettings} className="p-xs text-on-surface-variant hover:text-primary transition-all" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>

        <button
          onClick={onProfile}
          className="w-8 h-8 rounded-full border border-outline-variant bg-primary-container flex items-center justify-center hover:brightness-110 transition-all"
          title="Account"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-primary-container"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      </div>
    </header>
  );
}
