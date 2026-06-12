import { useEffect, useRef } from 'react';

export default function AccountDropdown({ open, onClose, onOpenDataSources, onOpenSettings, anchorRef }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const menuItems = [
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
      label: 'Account Settings',
      sub: 'Profile, preferences, security',
      onClick: () => { onClose(); onOpenSettings?.(); },
    },
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
      label: 'Data Sources & API Status',
      sub: 'Live connection health, API keys',
      onClick: () => { onClose(); onOpenDataSources?.(); },
    },
  ];

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', top: 68, right: 16, zIndex: 200, width: 300,
        background: '#182028', border: '1px solid #414752', borderRadius: 8,
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)', overflow: 'hidden',
      }}
    >
      {/* User info */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #2d3f55', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #2d5f9e', flexShrink: 0 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a2c9ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Prabhath Chigurupati</p>
          <p style={{ fontSize: 11, color: '#8b919d', margin: 0 }}>Enterprise Plan · Active</p>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80', borderRadius: 4, fontWeight: 700 }}>LIVE</div>
      </div>

      {/* Menu items */}
      <div style={{ padding: '6px 0' }}>
        {menuItems.map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', background: 'transparent', border: 'none',
              cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s', color: '#e2e8f0',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e2d3d'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ color: '#8b919d', flexShrink: 0 }}>{item.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{item.label}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{item.sub}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', color: '#6b7280', flexShrink: 0 }}><path d="m9 18 6-6-6-6"/></svg>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #2d3f55' }}>
        <p style={{ margin: 0, fontSize: 10, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace' }}>GeoEnergy Intelligence AI · v2.4 · Enterprise</p>
      </div>
    </div>
  );
}
