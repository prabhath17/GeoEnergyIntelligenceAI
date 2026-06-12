import { useState } from 'react';
import { getRiskLevel, getGeoRiskBarColor, formatTimestamp, getImpactBadge } from '../utils/helpers.js';

// ── Geographic hotspot positions (800×400 viewBox) ────────────────────────────
// x = (lon + 180) / 360 * 800,  y = (90 − lat) / 180 * 400
const GEO_POSITIONS = {
  'geo-001': { x: 524, y: 142 }, // Hormuz (56°E 26°N)
  'geo-002': { x: 471, y:  89 }, // Ukraine (32°E 50°N)
  'geo-003': { x: 500, y: 156 }, // Red Sea (43°E 20°N)
  'geo-004': { x: 438, y: 140 }, // Libya (17°E 27°N)
  'geo-005': { x: 200, y: 137 }, // Gulf Coast (−90° 28°N)
  'geo-006': { x: 411, y: 191 }, // W.Africa (5°E 4°N)
  'geo-007': { x: 473, y: 122 }, // E.Med (33°E 35°N)
  'geo-008': { x: 471, y: 133 }, // Suez (32°E 30°N)
  'geo-009': { x: 407, y:  76 }, // North Sea (3°E 56°N)
  'geo-010': { x: 473, y: 107 }, // Black Sea (33°E 42°N)
  'geo-011': { x: 422, y: 189 }, // Nigeria (8°E 5°N)
  'geo-012': { x: 255, y: 182 }, // Venezuela (−65° 8°N)
  'geo-013': { x: 516, y: 107 }, // Caspian (52°E 42°N)
  'geo-014': { x: 651, y: 173 }, // S.China Sea (113°E 12°N)
  'geo-015': { x: 222, y: 180 }, // Panama (−80° 9°N)
  'geo-016': { x: 422, y:  89 }, // EU Storage (10°E 50°N)
  'geo-017': { x: 200, y: 133 }, // US Gulf (−90° 30°N)
  'geo-018': { x: 522, y: 137 }, // ME Sanctions (55°E 28°N)
};

const RISK_COLORS = {
  Critical: { fill: '#ff6b6b', stroke: '#ff8f8f', glow: 'rgba(255,107,107,0.5)', bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,143,143,0.4)', text: '#ff8f8f' },
  High:     { fill: '#fabc45', stroke: '#fac84a', glow: 'rgba(250,188,69,0.45)', bg: 'rgba(250,188,69,0.1)',  border: 'rgba(250,188,69,0.4)',  text: '#fac84a' },
  Moderate: { fill: '#7dbfff', stroke: '#a2c9ff', glow: 'rgba(125,191,255,0.3)', bg: 'rgba(125,191,255,0.08)', border: 'rgba(125,191,255,0.35)', text: '#7dbfff' },
  Low:      { fill: '#6b7a8d', stroke: '#8b919d', glow: 'rgba(107,122,141,0.2)', bg: 'rgba(107,122,141,0.06)', border: 'rgba(139,145,157,0.3)', text: '#8b919d' },
};

const RISK_LEVELS  = ['All','Critical','High','Moderate','Low'];
const SECTOR_TABS  = ['All','Crude Oil','Natural Gas','Refined Products','Power','Renewables'];

function applyGlobalFilters(items, gf) {
  if (!gf) return items;
  let out = items;
  if (gf.sectors?.length)  out = out.filter(r => gf.sectors.some(s => (r.affectedSectors||[]).includes(s)));
  if (gf.impacts?.length)  out = out.filter(r => gf.impacts.some(lv => (r.riskLevel||'').toLowerCase().includes(lv.toLowerCase())));
  if (gf.regions?.length)  out = out.filter(r => gf.regions.some(g => (r.region||'').toLowerCase().includes(g.toLowerCase())));
  return out;
}

// ── GeoIntel dot-matrix map — purpose-built for geopolitical monitoring ──────
// Distinct from the dashboard map: dotted-terrain continents, chokepoint diamonds,
// crosshair hotspot markers with score badges, and a tactical HUD frame.
const CONTINENT_POLYGONS = [
  // North America
  [[95,42],[138,28],[188,30],[225,38],[255,58],[272,90],[268,138],[252,172],[235,192],[215,198],[194,188],[174,172],[160,148],[150,118],[138,88],[110,62]],
  // South America
  [[200,200],[250,196],[275,215],[286,262],[282,322],[264,358],[240,362],[218,345],[202,305],[196,255]],
  // Europe
  [[355,52],[392,42],[428,44],[455,56],[468,72],[462,98],[442,112],[412,118],[384,112],[366,96],[356,74]],
  // Africa
  [[356,115],[434,112],[478,132],[510,178],[512,268],[492,328],[462,350],[422,346],[390,315],[364,258],[350,190]],
  // Middle East
  [[432,114],[505,112],[526,132],[526,182],[506,198],[470,198],[440,180],[428,150]],
  // Russia / Central Asia
  [[455,28],[592,22],[660,30],[680,50],[662,78],[612,95],[548,106],[490,100],[456,78],[445,52]],
  // South / East Asia
  [[492,98],[622,90],[660,108],[682,145],[672,186],[638,210],[600,215],[562,200],[528,172],[500,140]],
  // China / East Asia extension
  [[622,90],[662,86],[695,92],[705,128],[692,162],[672,180],[650,174],[625,152],[618,118]],
  // Australia
  [[598,258],[660,252],[700,262],[716,298],[710,332],[688,350],[655,352],[620,340],[600,312],[595,278]],
];

const CHOKEPOINTS = [
  { id: 'cp-hormuz',  x: 524, y: 142, label: 'HORMUZ',   note: '~20% global crude transit', riskId: 'geo-001' },
  { id: 'cp-redsea',  x: 500, y: 156, label: 'BAB EL-MANDEB', note: 'Asia-Europe container + LNG', riskId: 'geo-003' },
  { id: 'cp-suez',    x: 471, y: 133, label: 'SUEZ',     note: '~9% global cargo by value', riskId: 'geo-008' },
  { id: 'cp-malacca', x: 645, y: 188, label: 'MALACCA',  note: '~25% global oil transit', riskId: 'geo-014' },
  { id: 'cp-bosporus',x: 473, y: 104, label: 'BOSPORUS', note: 'Russian + Caspian crude', riskId: 'geo-010' },
  { id: 'cp-panama',  x: 222, y: 184, label: 'PANAMA',   note: 'US Gulf - Asia LNG route', riskId: 'geo-015' },
];

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

let DOT_CACHE = null;
function continentDots(step = 9) {
  if (DOT_CACHE) return DOT_CACHE;
  const dots = [];
  for (let y = 18; y < 392; y += step) {
    for (let x = 12 + ((y / step) % 2) * (step / 2); x < 790; x += step) {
      if (CONTINENT_POLYGONS.some(poly => pointInPolygon(x, y, poly))) dots.push([x, y]);
    }
  }
  DOT_CACHE = dots;
  return dots;
}

// Low-detail equirectangular world silhouette. These paths keep sharper coastal
// breaks so the map reads as geography, not abstract rounded blobs.
const WORLD_LAND_PATHS = [
  { id: 'north-america', label: 'NORTH AMERICA', labelX: 176, labelY: 105, d: 'M24 62 L42 49 L69 45 L91 55 L115 61 L135 78 L158 76 L181 68 L210 72 L235 82 L259 91 L282 94 L276 109 L251 112 L241 126 L224 137 L219 151 L204 159 L189 158 L177 145 L158 142 L151 129 L141 126 L130 113 L123 95 L111 85 L96 83 L82 76 L62 80 L44 76 Z M116 131 L129 137 L143 150 L161 155 L179 162 L193 176 L211 180 L225 188 L221 198 L204 191 L186 184 L171 174 L150 170 L134 160 L121 147 Z' },
  { id: 'greenland', label: 'GREENLAND', labelX: 314, labelY: 47, d: 'M260 38 L282 18 L320 18 L352 33 L360 55 L345 71 L315 76 L286 68 L267 55 Z' },
  { id: 'south-america', label: 'SOUTH AMERICA', labelX: 259, labelY: 272, d: 'M222 178 L246 175 L270 188 L291 208 L310 232 L304 255 L294 276 L283 304 L270 333 L253 356 L237 346 L231 319 L220 296 L217 263 L226 239 L218 214 Z' },
  { id: 'europe', label: 'EUROPE', labelX: 414, labelY: 82, d: 'M365 100 L379 82 L392 87 L402 73 L419 64 L439 59 L463 66 L480 79 L493 95 L485 108 L463 111 L451 123 L432 117 L419 126 L402 115 L385 118 L374 111 Z M390 69 L381 58 L396 51 L408 60 Z M418 56 L425 42 L444 40 L455 52 L449 64 Z' },
  { id: 'africa', label: 'AFRICA', labelX: 431, labelY: 235, d: 'M371 126 L398 118 L431 121 L462 133 L490 154 L509 181 L508 208 L494 224 L490 252 L477 283 L462 318 L438 343 L414 336 L397 309 L382 276 L367 247 L356 215 L352 180 L360 149 Z' },
  { id: 'middle-east', label: 'MIDDLE EAST', labelX: 516, labelY: 139, d: 'M476 119 L504 113 L532 124 L551 143 L546 167 L523 180 L493 173 L481 151 Z' },
  { id: 'asia', label: 'ASIA', labelX: 625, labelY: 119, d: 'M486 72 L526 54 L579 43 L642 37 L705 42 L756 53 L789 68 L776 88 L742 92 L722 110 L694 112 L675 128 L686 150 L676 170 L646 180 L632 199 L604 204 L582 190 L568 169 L548 158 L527 147 L510 126 L489 113 L475 92 Z M552 166 L569 180 L581 205 L575 231 L556 212 L544 188 Z M622 180 L641 189 L652 211 L635 229 L612 219 L607 196 Z M671 151 L697 151 L717 167 L706 184 L680 177 Z' },
  { id: 'southeast-asia-islands', label: '', d: 'M636 223 L651 222 L663 231 L655 240 L639 237 Z M671 222 L694 225 L708 237 L697 246 L676 238 Z M708 244 L735 250 L744 263 L724 268 L706 257 Z M681 198 L696 198 L705 207 L691 215 Z' },
  { id: 'japan', label: '', d: 'M708 124 L719 113 L728 116 L721 129 Z M724 137 L735 132 L741 144 L731 151 Z' },
  { id: 'australia', label: 'AUSTRALIA', labelX: 670, labelY: 312, d: 'M617 261 L645 251 L681 253 L714 266 L733 292 L724 319 L696 340 L657 343 L626 329 L603 304 L604 281 Z' },
  { id: 'new-zealand', label: '', d: 'M750 323 L763 333 L758 345 L744 337 Z M770 345 L788 356 L782 369 L764 357 Z' },
  { id: 'madagascar', label: '', d: 'M506 260 L517 280 L513 311 L500 329 L493 304 L496 276 Z' },
  { id: 'uk-isles', label: '', d: 'M386 75 L395 66 L405 73 L400 88 Z M376 88 L384 84 L388 95 L379 99 Z' },
];

function WorldMapSVG({ riskItems, onRegionClick, activeId }) {
  const regionLabels = WORLD_LAND_PATHS.filter(p => p.label);

  const routes = [
    [[200,137],[438,140],[471,133],[500,156],[524,142],[651,173]],
    [[255,182],[222,184],[200,137],[438,140]],
    [[411,191],[438,140],[471,133],[500,156]],
    [[473,107],[471,89],[516,107],[524,142]],
  ];

  return (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <radialGradient id="geoIntelBg" cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor="#101e2e" stopOpacity="0.9" />
          <stop offset="62%" stopColor="#0a1520" stopOpacity="0.94" />
          <stop offset="100%" stopColor="#070e16" stopOpacity="1" />
        </radialGradient>
        <filter id="softLandGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {Object.entries(RISK_COLORS).map(([level, c]) => (
          <radialGradient key={level} id={`glow-${level}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={c.fill} stopOpacity="0.55" />
            <stop offset="100%" stopColor={c.fill} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      <rect width="800" height="400" fill="url(#geoIntelBg)" />
      {Array.from({ length: 9 }, (_, i) => 40 + i * 80).map(x => <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="400" stroke="#16283a" strokeWidth="0.45" strokeDasharray="2,8" />)}
      {Array.from({ length: 5 }, (_, i) => 40 + i * 80).map(y => <line key={`lat-${y}`} x1="0" y1={y} x2="800" y2={y} stroke="#16283a" strokeWidth="0.45" strokeDasharray="2,8" />)}
      <line x1="0" y1="200" x2="800" y2="200" stroke="#1f3a52" strokeWidth="0.8" strokeDasharray="6,8" opacity="0.7" />

      <g filter="url(#softLandGlow)">
        {WORLD_LAND_PATHS.map(part => (
          <path
            key={part.id}
            d={part.d}
            fill="rgba(42,70,91,0.31)"
            stroke="rgba(125,191,255,0.48)"
            strokeWidth="1.05"
            strokeLinejoin="round"
          />
        ))}
      </g>
      {WORLD_LAND_PATHS.map(part => (
        <path
          key={`coast-${part.id}`}
          d={part.d}
          fill="none"
          stroke="rgba(188,217,240,0.22)"
          strokeWidth="0.55"
          strokeLinejoin="round"
          strokeDasharray="3,5"
        />
      ))}

      {routes.map((pts, i) => (
        <polyline key={`route-${i}`} points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke="rgba(125,191,255,0.2)" strokeWidth="1" strokeDasharray="4,7" />
      ))}

      {CHOKEPOINTS.map(cp => {
        const linkedRisk = riskItems.find(r => r.id === cp.riskId);
        return (
        <g
          key={cp.id}
          opacity="0.96"
          style={{ cursor: linkedRisk ? 'pointer' : 'default' }}
          onClick={() => linkedRisk && onRegionClick(linkedRisk)}
          tabIndex={linkedRisk ? 0 : undefined}
          role={linkedRisk ? 'button' : undefined}
          onKeyDown={e => {
            if (linkedRisk && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onRegionClick(linkedRisk);
            }
          }}
        >
          <rect x={cp.x - 4} y={cp.y - 4} width="8" height="8" transform={`rotate(45 ${cp.x} ${cp.y})`} fill="rgba(250,188,69,0.18)" stroke="#fac84a" strokeWidth="1" />
          <rect x={cp.x - 1.6} y={cp.y - 1.6} width="3.2" height="3.2" transform={`rotate(45 ${cp.x} ${cp.y})`} fill="#fac84a" />
          <text x={cp.x} y={cp.y + 15} textAnchor="middle" fill="rgba(250,188,69,0.78)" fontSize="6.5" fontFamily="IBM Plex Mono" letterSpacing="0.8" fontWeight="700">{cp.label}</text>
          <title>{`${cp.label} - ${cp.note}`}</title>
        </g>
        );
      })}

      {regionLabels.map(({ labelX, labelY, label }) => (
        <text key={label} x={labelX} y={labelY} textAnchor="middle" fill="rgba(125,191,255,0.34)" fontSize="8" fontFamily="IBM Plex Mono" letterSpacing="1.4" fontWeight="700">{label}</text>
      ))}

      {riskItems.map(r => {
        const pos = GEO_POSITIONS[r.id];
        if (!pos) return null;
        const c = RISK_COLORS[r.riskLevel] || RISK_COLORS.Low;
        const isActive = activeId === r.id;
        const size = Math.max(5, r.riskScore * 1.45);
        const showLabel = isActive || r.riskLevel === 'Critical' || r.riskLevel === 'High' || ['geo-015','geo-014'].includes(r.id);
        const label = (r.countryOrArea || '').replace(' / ', '/');
        const labelWidth = Math.min(150, Math.max(34, label.length * 4.6 + 30));
        return (
          <g
            key={r.id}
            style={{ cursor: 'pointer' }}
            onClick={() => onRegionClick(r)}
            tabIndex="0"
            role="button"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRegionClick(r);
              }
            }}
          >
            <circle cx={pos.x} cy={pos.y} r={size * 2.6} fill={`url(#glow-${r.riskLevel})`} opacity={isActive ? 0.9 : 0.48} />
            <circle cx={pos.x} cy={pos.y} r={size * 1.35} fill="none" stroke={c.stroke} strokeWidth="1" opacity={isActive ? 0.95 : 0.58} />
            <circle cx={pos.x} cy={pos.y} r={isActive ? 4.5 : 3.2} fill={c.fill} stroke="#06101a" strokeWidth="1" />
            <line x1={pos.x - size} y1={pos.y} x2={pos.x - 4} y2={pos.y} stroke={c.stroke} strokeWidth="1" opacity="0.8" />
            <line x1={pos.x + 4} y1={pos.y} x2={pos.x + size} y2={pos.y} stroke={c.stroke} strokeWidth="1" opacity="0.8" />
            <line x1={pos.x} y1={pos.y - size} x2={pos.x} y2={pos.y - 4} stroke={c.stroke} strokeWidth="1" opacity="0.8" />
            <line x1={pos.x} y1={pos.y + 4} x2={pos.x} y2={pos.y + size} stroke={c.stroke} strokeWidth="1" opacity="0.8" />
            {showLabel && (
              <g>
                <rect x={Math.min(790 - labelWidth, pos.x + size * 0.7 + 3)} y={pos.y - 16} rx="3" width={labelWidth} height="14" fill="rgba(7,14,22,0.9)" stroke={c.stroke} strokeWidth="0.7" />
                <text x={Math.min(790 - labelWidth, pos.x + size * 0.7 + 3) + 7} y={pos.y - 6} fill={c.text} fontSize="7.2" fontFamily="IBM Plex Mono" fontWeight="700">{label.slice(0, 24)} {r.riskScore}</text>
              </g>
            )}
            <title>{`${r.countryOrArea} - ${r.riskLevel} ${r.riskScore}/10 - ${r.eventType}`}</title>
          </g>
        );
      })}

      <text x="14" y="392" fill="rgba(125,191,255,0.42)" fontSize="7" fontFamily="IBM Plex Mono" letterSpacing="1.4">
        GEOINTEL VECTOR PROJECTION - CHOKEPOINTS - ACTIVE ENERGY RISK ZONES
      </text>
    </svg>
  );
}
// ── Region card ───────────────────────────────────────────────────────────────
function RegionCard({ r, onRiskClick, isActive }) {
  const c = RISK_COLORS[r.riskLevel] || RISK_COLORS.Low;
  return (
    <div
      className="p-sm rounded-xl cursor-pointer transition-all group"
      style={{
        background: isActive ? c.bg : 'rgba(13,26,38,0.6)',
        border: `1px solid ${isActive ? c.border : '#2d3d4e'}`,
        borderLeft: `3px solid ${c.fill}`,
      }}
      onClick={() => onRiskClick(r)}
    >
      <div className="flex items-start gap-sm">
        <div className="shrink-0 text-center" style={{ minWidth: 36 }}>
          <div className="text-[18px] font-bold font-mono-data leading-none" style={{ color: c.text }}>
            {r.riskScore}
          </div>
          <div className="text-[9px] font-bold tracking-widest mt-0.5" style={{ color: c.text }}>
            {r.riskLevel?.toUpperCase()}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">
            {r.countryOrArea}
          </p>
          <p className="text-[10px] text-outline mt-0.5">{r.region}</p>
          {r.whyItMatters && (
            <p className="text-[10px] text-on-surface-variant leading-snug mt-xs line-clamp-2">
              {r.whyItMatters}
            </p>
          )}
          <div className="flex flex-wrap gap-xs mt-xs">
            <span className="text-[9px] px-1.5 py-0.5 rounded border font-bold"
              style={{ color: c.text, borderColor: c.border, background: c.bg }}>
              {r.eventType}
            </span>
            {(r.affectedSectors || []).slice(0, 2).map(s => (
              <span key={s} className="text-[9px] px-1.5 py-0.5 rounded border border-outline-variant/50 text-outline">
                {s}
              </span>
            ))}
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 self-center">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </div>
    </div>
  );
}

// ── Risk donut chart (SVG) ────────────────────────────────────────────────────
function RiskDonut({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!total) return null;
  const cx = 60, cy = 60, r = 42, stroke = 10;
  let offset = 0;
  const circ = 2 * Math.PI * r;
  const segments = data.filter(d => d.count > 0).map(d => {
    const pct = d.count / total;
    const dash = pct * circ;
    const seg = { ...d, dash, offset: offset * circ };
    offset += pct;
    return seg;
  });

  return (
    <div className="flex items-center gap-md">
      <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a2c3d" strokeWidth={stroke} />
        {segments.map(s => (
          <circle key={s.level} cx={cx} cy={cy} r={r} fill="none"
            stroke={RISK_COLORS[s.level]?.fill || '#6b7a8d'}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={-s.offset + circ / 4}
            strokeLinecap="butt"
          />
        ))}
        <text x={cx} y={cy + 4} textAnchor="middle" fill="#dae3ee"
          fontSize="20" fontWeight="700" fontFamily="IBM Plex Mono">{total}</text>
        <text x={cx} y={cy + 15} textAnchor="middle" fill="#6b7a8d"
          fontSize="7" fontFamily="IBM Plex Mono" letterSpacing="1">ZONES</text>
      </svg>
      <div className="space-y-xs flex-1">
        {data.map(d => {
          const c = RISK_COLORS[d.level] || RISK_COLORS.Low;
          const pct = total ? Math.round((d.count / total) * 100) : 0;
          return (
            <div key={d.level} className="flex items-center gap-sm">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.fill }} />
              <span className="text-[10px] font-bold w-16 shrink-0" style={{ color: c.text }}>{d.level}</span>
              <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: '#1a2c3d' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.fill }} />
              </div>
              <span className="text-[10px] font-mono-data text-outline w-4 text-right">{d.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Alert card (from intelligence feed) ──────────────────────────────────────
function AlertCard({ item, onItemClick }) {
  const badge = getImpactBadge(item.impact);
  return (
    <div
      className="flex items-start gap-sm p-sm rounded-xl cursor-pointer transition-all group"
      style={{ background: 'rgba(13,26,38,0.6)', border: '1px solid #2d3d4e' }}
      onClick={() => onItemClick?.(item)}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(88,150,200,0.4)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#2d3d4e'}
    >
      <span className={`${badge.bg} ${badge.text} text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5`}>
        {badge.label}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-on-surface group-hover:text-primary leading-snug transition-colors">
          {item.headline}
        </p>
        {item.whyItMatters && (
          <p className="text-[10px] text-on-surface-variant italic mt-0.5 line-clamp-1">{item.whyItMatters}</p>
        )}
        <div className="flex items-center gap-xs mt-xs">
          <span className="text-[9px] text-outline font-mono-data">{item.time}</span>
          <span className="text-[9px] text-outline">· {item.source}</span>
        </div>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none"
        stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 self-center">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GeoRiskPage({ data, onRiskClick, onFeedItemClick, onItemClick, globalFilters }) {
  const [activeLevel,  setActiveLevel]  = useState('All');
  const [activeSector, setActiveSector] = useState('All');
  const [search,       setSearch]       = useState('');
  const [activeMapId,  setActiveMapId]  = useState(null);
  const { geoRiskItems = [], intelligenceFeed = [] } = data || {};

  const handleItemClick = onFeedItemClick || onItemClick;

  const sorted     = [...geoRiskItems].sort((a, b) => b.riskScore - a.riskScore);
  const critCount  = geoRiskItems.filter(r => r.riskLevel === 'Critical').length;
  const highCount  = geoRiskItems.filter(r => r.riskLevel === 'High').length;
  const modCount   = geoRiskItems.filter(r => r.riskLevel === 'Moderate').length;
  const lowCount   = geoRiskItems.filter(r => r.riskLevel === 'Low').length;
  const allSectors = [...new Set(geoRiskItems.flatMap(r => r.affectedSectors || []))];
  const mostAff    = allSectors.reduce((best, s) => {
    const n = geoRiskItems.filter(r => (r.affectedSectors||[]).includes(s)).length;
    return n > (best.n || 0) ? { s, n } : best;
  }, {}).s || '—';
  const topRisk    = sorted[0];

  const geoAlerts = intelligenceFeed
    .filter(h => h.category === 'Geo Risk' || h.category === 'Supply Chain')
    .sort((a, b) => {
      const impOrder = { 'High Impact': 0, 'Medium Impact': 1, 'Low Impact': 2 };
      return (impOrder[a.impact] ?? 2) - (impOrder[b.impact] ?? 2);
    })
    .slice(0, 8);

  const filtered = applyGlobalFilters(
    sorted.filter(r =>
      (activeLevel  === 'All' || r.riskLevel === activeLevel) &&
      (activeSector === 'All' || (r.affectedSectors || []).includes(activeSector)) &&
      (!search || r.countryOrArea.toLowerCase().includes(search.toLowerCase()) ||
                  r.region.toLowerCase().includes(search.toLowerCase()))
    ),
    globalFilters
  );

  const handleRegionClick = (r) => {
    setActiveMapId(r.id);
    onRiskClick?.(r);
  };

  const donutData = [
    { level: 'Critical', count: critCount },
    { level: 'High',     count: highCount },
    { level: 'Moderate', count: modCount  },
    { level: 'Low',      count: lowCount  },
  ];

  // Sector exposure counts
  const sectorExposure = ['Crude Oil','Natural Gas','Refined Products','Power','Renewables'].map(s => ({
    sector: s,
    count: geoRiskItems.filter(r => (r.affectedSectors||[]).includes(s)).length,
    critHigh: geoRiskItems.filter(r => (r.affectedSectors||[]).includes(s) && ['Critical','High'].includes(r.riskLevel)).length,
  })).sort((a, b) => b.critHigh - a.critHigh);

  return (
    <div className="page-enter">
      <div className="max-w-[1920px] mx-auto">

        {/* ── Page header ── */}
        <div className="px-lg py-md border-b border-outline-variant/60"
          style={{ background: 'linear-gradient(135deg, rgba(255,107,107,0.04) 0%, rgba(11,20,28,0) 60%)' }}>
          <div className="flex items-center justify-between flex-wrap gap-sm">
            <div>
              <div className="flex items-center gap-sm mb-xs">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#ff8f8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <h1 className="text-[20px] font-bold text-on-surface tracking-tight">Geopolitical Risk Monitor</h1>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded border"
                  style={{ color: '#ff8f8f', background: 'rgba(255,107,107,0.08)', borderColor: 'rgba(255,143,143,0.3)' }}>
                  GEI RISK ENGINE
                </span>
                {critCount > 0 && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1"
                    style={{ background: 'rgba(255,107,107,0.15)', color: '#ff8f8f' }}>
                    <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#ff8f8f' }} />
                    {critCount} CRITICAL ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant">
                {geoRiskItems.length} regions tracked globally · Monitoring supply chokepoints, transit routes, and geo-risk events
              </p>
            </div>
          </div>
        </div>

        {/* ── Top stats band ── */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-px border-b border-outline-variant/40"
          style={{ background: '#1a2c3d' }}>
          {[
            { label: 'Active Regions',    value: geoRiskItems.length, color: '#a2c9ff' },
            { label: 'Critical Zones',    value: critCount,           color: '#ff8f8f' },
            { label: 'High Risk',         value: highCount,           color: '#fac84a' },
            { label: 'Total Alerts',      value: geoAlerts.length,    color: '#c79df7' },
            { label: 'Most Affected',     value: mostAff,             color: '#a2c9ff' },
            { label: 'Top Score',         value: topRisk ? `${topRisk.riskScore} / 10` : '—', color: '#ff8f8f' },
          ].map((s, i) => (
            <div key={i} className="px-md py-sm text-center"
              style={{ background: '#0f1922' }}>
              <div className="text-[16px] font-bold font-mono-data leading-none" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[9px] text-outline tracking-widest mt-0.5">{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* ── Main layout ── */}
        <div className="p-md space-y-md">

          {/* Map + Active Regions */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.42fr)] gap-md items-stretch">

            {/* Left: Map panel */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: '#0d1a26', border: '1px solid rgba(45,61,78,0.8)' }}>
              {/* Map header */}
              <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant/40">
                <div className="flex items-center gap-sm">
                  <span className="text-[10px] font-bold tracking-widest text-on-surface-variant">GEOINTEL TACTICAL MAP</span>
                  <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#6edb9a' }} />
                  <span className="text-[9px] text-outline">Vector tactical projection · chokepoints + active zones</span>
                </div>
                <div className="flex items-center gap-sm">
                  {Object.entries(RISK_COLORS).map(([level, c]) => (
                    <div key={level} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: c.fill }} />
                      <span className="text-[9px] font-bold" style={{ color: c.text }}>{level}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rotate-45" style={{ background: 'rgba(250,188,69,0.25)', border: '1px solid #fac84a' }} />
                    <span className="text-[9px] font-bold" style={{ color: '#fac84a' }}>Chokepoint</span>
                  </div>
                </div>
              </div>
              {/* Map container */}
              <div className="relative geo-monitor-map h-[380px] 2xl:h-[440px]">
                <div className="absolute inset-0 geo-grid-overlay pointer-events-none" />
                <div className="scanline opacity-20 pointer-events-none" />
                <WorldMapSVG
                  riskItems={geoRiskItems}
                  onRegionClick={handleRegionClick}
                  activeId={activeMapId}
                />
              </div>
              {/* Map footer */}
              <div className="px-md py-xs border-t border-outline-variant/30 flex items-center justify-between">
                <span className="text-[10px] text-outline font-mono-data">
                  {geoRiskItems.length} risk zones plotted · Click any hotspot to view detail
                </span>
                <span className="text-[10px] text-outline font-mono-data">GEI Risk Engine v2.4</span>
              </div>
            </div>

            {/* Right: Active regions list */}
            <div className="rounded-2xl flex flex-col overflow-hidden"
              style={{ background: '#0d1a26', border: '1px solid rgba(45,61,78,0.8)' }}>
              {/* Header */}
              <div className="px-md py-sm border-b border-outline-variant/40 shrink-0">
                <div className="flex items-center justify-between mb-sm">
                  <span className="text-[10px] font-bold tracking-widest text-on-surface-variant">ACTIVE REGIONS</span>
                  <span className="text-[10px] font-mono-data text-outline">{filtered.length} shown</span>
                </div>
                {/* Search */}
                <div className="relative mb-sm">
                  <svg className="absolute left-sm top-1/2 -translate-y-1/2 text-outline" width="12" height="12"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search regions..."
                    className="w-full pl-7 pr-sm py-xs rounded-lg text-[11px] text-on-surface placeholder:text-outline focus:outline-none"
                    style={{ background: 'rgba(13,26,38,0.8)', border: '1px solid rgba(45,61,78,0.8)' }} />
                </div>
                {/* Level filters */}
                <div className="flex flex-wrap gap-xs">
                  {RISK_LEVELS.map(lvl => {
                    const c = lvl === 'All' ? '#a2c9ff' : RISK_COLORS[lvl]?.text || '#8b919d';
                    const isActive = activeLevel === lvl;
                    return (
                      <button key={lvl} onClick={() => setActiveLevel(lvl)}
                        className="text-[10px] px-sm py-0.5 rounded-full font-bold transition-all"
                        style={{
                          color: isActive ? c : '#6b7a8d',
                          background: isActive ? `${c}18` : 'transparent',
                          border: `1px solid ${isActive ? `${c}60` : '#2d3d4e'}`,
                        }}>
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Region list */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-sm space-y-xs max-h-[360px] 2xl:max-h-[420px]">
                {filtered.length === 0 ? (
                  <div className="py-lg text-center">
                    <p className="text-[11px] text-outline">No regions match filters.</p>
                    <button onClick={() => { setActiveLevel('All'); setSearch(''); }}
                      className="mt-sm text-[10px] text-primary hover:underline">Clear filters</button>
                  </div>
                ) : filtered.map(r => (
                  <RegionCard key={r.id} r={r}
                    onRiskClick={handleRegionClick}
                    isActive={activeMapId === r.id} />
                ))}
              </div>
            </div>
          </div>

          {/* ── Risk Distribution + Sector Exposure + Geo Alerts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.15fr_1fr] gap-md">

            {/* Risk Distribution */}
            <div className="rounded-2xl p-md"
              style={{ background: '#0d1a26', border: '1px solid rgba(45,61,78,0.8)' }}>
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant mb-md">RISK LEVEL DISTRIBUTION</p>
              <RiskDonut data={donutData} />
              {/* Most impacted commodity */}
              <div className="mt-md pt-sm border-t border-outline-variant/40">
                <p className="text-[10px] text-outline tracking-widest mb-xs">MOST AFFECTED SECTOR</p>
                <p className="text-[14px] font-bold text-on-surface">{mostAff}</p>
                <p className="text-[10px] text-on-surface-variant mt-xs">
                  {geoRiskItems.filter(r => (r.affectedSectors||[]).includes(mostAff)).length} active risk zones
                </p>
              </div>
            </div>

            {/* Sector Exposure Matrix */}
            <div className="rounded-2xl p-md"
              style={{ background: '#0d1a26', border: '1px solid rgba(45,61,78,0.8)' }}>
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant mb-md">SECTOR EXPOSURE MATRIX</p>
              <div className="space-y-sm">
                {sectorExposure.map(s => {
                  const pct = geoRiskItems.length ? (s.count / geoRiskItems.length) * 100 : 0;
                  const critPct = geoRiskItems.length ? (s.critHigh / geoRiskItems.length) * 100 : 0;
                  return (
                    <div key={s.sector}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-on-surface">{s.sector}</span>
                        <div className="flex items-center gap-xs">
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded"
                            style={{ color: '#ff8f8f', background: 'rgba(255,107,107,0.1)' }}>
                            {s.critHigh} CRITICAL/HIGH
                          </span>
                          <span className="text-[10px] font-mono-data text-outline">{s.count}</span>
                        </div>
                      </div>
                      <div className="rounded-full overflow-hidden relative" style={{ height: 6, background: '#1a2c3d' }}>
                        <div className="h-full rounded-full absolute left-0"
                          style={{ width: `${pct}%`, background: 'rgba(125,191,255,0.3)' }} />
                        <div className="h-full rounded-full absolute left-0"
                          style={{ width: `${critPct}%`, background: '#ff8f8f' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-md pt-sm border-t border-outline-variant/40 flex items-center gap-md">
                <div className="flex items-center gap-xs">
                  <div className="w-3 h-1.5 rounded" style={{ background: '#ff8f8f' }} />
                  <span className="text-[9px] text-outline">Critical/High</span>
                </div>
                <div className="flex items-center gap-xs">
                  <div className="w-3 h-1.5 rounded" style={{ background: 'rgba(125,191,255,0.3)' }} />
                  <span className="text-[9px] text-outline">All Risk Zones</span>
                </div>
              </div>
            </div>

            {/* Top Risk Regions Quick View */}
            <div className="rounded-2xl p-md"
              style={{ background: '#0d1a26', border: '1px solid rgba(45,61,78,0.8)' }}>
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant mb-md">TOP RISK REGIONS</p>
              <div className="space-y-xs">
                {sorted.slice(0, 6).map((r, i) => {
                  const c = RISK_COLORS[r.riskLevel] || RISK_COLORS.Low;
                  return (
                    <div key={r.id}
                      className="flex items-center gap-sm cursor-pointer rounded-lg px-sm py-xs transition-all group"
                      style={{ background: 'rgba(13,26,38,0.5)' }}
                      onClick={() => handleRegionClick(r)}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(13,26,38,0.9)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(13,26,38,0.5)'}>
                      <span className="text-[10px] font-mono-data font-bold text-outline w-4 shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                          {r.countryOrArea}
                        </p>
                        <p className="text-[9px] text-outline truncate">{r.region}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-[12px] font-bold font-mono-data" style={{ color: c.text }}>
                          {r.riskScore}
                        </span>
                        <p className="text-[9px] font-bold" style={{ color: c.text }}>{r.riskLevel?.toUpperCase()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Recent Geo-Risk Alerts ── */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: '#0d1a26', border: '1px solid rgba(45,61,78,0.8)' }}>
            <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant/40">
              <div className="flex items-center gap-sm">
                <span className="text-[10px] font-bold tracking-widest text-on-surface-variant">RECENT GEO-RISK ALERTS</span>
                <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#ff8f8f' }} />
                <span className="text-[10px] text-outline">Click any alert for full detail</span>
              </div>
              <span className="text-[10px] font-mono-data text-outline">{geoAlerts.length} alerts</span>
            </div>
            <div className="p-md grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-sm">
              {geoAlerts.length > 0 ? geoAlerts.map(item => (
                <AlertCard key={item.id} item={item} onItemClick={handleItemClick} />
              )) : (
                <div className="col-span-full py-md text-center">
                  <p className="text-[11px] text-outline">No geo-risk alerts in current feed.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Sector filter row + remaining cards ── */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: '#0d1a26', border: '1px solid rgba(45,61,78,0.8)' }}>
            <div className="px-md py-sm border-b border-outline-variant/40">
              <div className="flex items-center justify-between mb-sm">
                <span className="text-[10px] font-bold tracking-widest text-on-surface-variant">ALL RISK ZONES — DETAIL VIEW</span>
                <span className="text-[10px] font-mono-data text-outline">{filtered.length} zones</span>
              </div>
              <div className="flex flex-wrap gap-xs">
                <span className="text-[9px] font-bold text-outline tracking-widest self-center">SECTOR:</span>
                {SECTOR_TABS.map(s => (
                  <button key={s} onClick={() => setActiveSector(s)}
                    className="text-[10px] px-sm py-0.5 rounded-full font-bold transition-all"
                    style={{
                      color: activeSector === s ? '#a2c9ff' : '#6b7a8d',
                      background: activeSector === s ? 'rgba(162,201,255,0.12)' : 'transparent',
                      border: `1px solid ${activeSector === s ? 'rgba(162,201,255,0.4)' : '#2d3d4e'}`,
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-md grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-sm">
              {filtered.map(r => {
                const c = RISK_COLORS[r.riskLevel] || RISK_COLORS.Low;
                return (
                  <div key={r.id}
                    className="rounded-xl cursor-pointer transition-all group overflow-hidden"
                    style={{ background: 'rgba(13,26,38,0.6)', border: `1px solid #2d3d4e`, borderLeft: `3px solid ${c.fill}` }}
                    onClick={() => handleRegionClick(r)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = `${c.border}`}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#2d3d4e'; e.currentTarget.style.borderLeftColor = c.fill; }}>
                    <div className="p-sm">
                      <div className="flex items-start justify-between mb-xs">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">
                            {r.countryOrArea}
                          </p>
                          <p className="text-[10px] text-outline">{r.region}</p>
                        </div>
                        <div className="shrink-0 text-right ml-sm">
                          <p className="text-[18px] font-bold font-mono-data leading-none" style={{ color: c.text }}>
                            {r.riskScore}
                          </p>
                          <p className="text-[9px] font-bold" style={{ color: c.text }}>{r.riskLevel?.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="w-full rounded-full mb-sm overflow-hidden" style={{ height: 3, background: '#1a2c3d' }}>
                        <div className="h-full rounded-full" style={{ width: `${r.riskScore * 10}%`, background: c.fill }} />
                      </div>
                      {r.whyItMatters && (
                        <p className="text-[10px] text-on-surface-variant leading-snug mb-sm line-clamp-2">
                          {r.whyItMatters}
                        </p>
                      )}
                      <div className="flex items-center justify-between flex-wrap gap-xs">
                        <div className="flex flex-wrap gap-xs">
                          <span className="text-[9px] px-1.5 py-0.5 rounded border font-bold"
                            style={{ color: c.text, borderColor: c.border, background: c.bg }}>
                            {r.eventType}
                          </span>
                          {(r.affectedSectors || []).slice(0, 2).map(s => (
                            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded border border-outline-variant/40 text-outline">
                              {s}
                            </span>
                          ))}
                        </div>
                        {r.priceImpactHint && (
                          <span className="text-[9px] font-mono-data shrink-0" style={{ color: '#fac84a' }}>
                            ⚑ {r.priceImpactHint}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full py-lg text-center">
                  <p className="text-[11px] text-on-surface-variant">No regions match selected filters.</p>
                  <button onClick={() => { setActiveLevel('All'); setActiveSector('All'); setSearch(''); }}
                    className="mt-sm text-[10px] text-primary hover:underline">Clear all filters</button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

