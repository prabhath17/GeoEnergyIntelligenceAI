export default function Footer({ onFooterLink }) {
  return (
    <footer className="flex flex-col md:flex-row justify-between items-center w-full px-lg py-sm mt-lg border-t border-outline-variant bg-background gap-sm">
      <div>
        <p className="text-body-sm font-bold text-on-surface">GeoEnergy Intelligence</p>
        <p className="text-body-sm text-on-surface-variant">© 2024 GeoEnergy Intelligence. All rights reserved. Data latency &lt; 200ms.</p>
      </div>
      <div className="flex gap-lg">
        {['methodology','compliance','support','privacy'].map(k => (
          <a
            key={k}
            className="text-body-sm text-on-surface-variant hover:text-primary underline cursor-pointer capitalize"
            onClick={e => { e.preventDefault(); onFooterLink?.(k); }}
            href="#"
          >
            {k === 'privacy' ? 'Privacy Policy' : k.charAt(0).toUpperCase() + k.slice(1)}
          </a>
        ))}
      </div>
    </footer>
  );
}
