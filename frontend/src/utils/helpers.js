export function getSentimentLabel(sentiment) {
  const map = {
    Bullish:   { label: 'BULLISH',   colorClass: 'text-primary',            borderClass: 'border-primary' },
    Bearish:   { label: 'BEARISH',   colorClass: 'text-error',              borderClass: 'border-error' },
    Neutral:   { label: 'NEUTRAL',   colorClass: 'text-on-surface-variant', borderClass: 'border-on-surface-variant' },
    Volatile:  { label: 'VOLATILE',  colorClass: 'text-tertiary',           borderClass: 'border-tertiary' },
    Steady:    { label: 'STEADY',    colorClass: 'text-on-surface-variant', borderClass: 'border-on-surface-variant' },
    Expanding: { label: 'EXPANDING', colorClass: 'text-primary-container',  borderClass: 'border-primary-container' },
  };
  return map[sentiment] || { label: (sentiment || '').toUpperCase(), colorClass: 'text-on-surface-variant', borderClass: 'border-outline-variant' };
}

export function getSentimentBorderTop(sentiment) {
  const map = {
    Bullish:   'border-t-primary',
    Bearish:   'border-t-error',
    Neutral:   'border-t-on-surface-variant',
    Volatile:  'border-t-tertiary',
    Steady:    'border-t-on-surface-variant',
    Expanding: 'border-t-primary-container',
  };
  return map[sentiment] || 'border-t-outline-variant';
}

export function getRiskLevel(riskLevel) {
  const map = {
    Critical: { label: 'CRITICAL', colorClass: 'text-error',             scoreClass: 'text-error' },
    High:     { label: 'HIGH',     colorClass: 'text-tertiary',          scoreClass: 'text-tertiary' },
    Moderate: { label: 'MODERATE', colorClass: 'text-primary',           scoreClass: 'text-primary' },
    Low:      { label: 'LOW',      colorClass: 'text-on-surface-variant', scoreClass: 'text-on-surface-variant' },
  };
  return map[riskLevel] || { label: (riskLevel || '').toUpperCase(), colorClass: 'text-outline', scoreClass: 'text-outline' };
}

export function getGeoRiskBarColor(riskLevel) {
  return { Critical: 'bg-error', High: 'bg-tertiary', Moderate: 'bg-primary', Low: 'bg-on-surface-variant' }[riskLevel] || 'bg-outline-variant';
}

export function getImpactBadge(impact) {
  const map = {
    'High Impact':   { bg: 'bg-error-container',   text: 'text-on-error-container',    label: 'HIGH IMPACT' },
    'Medium Impact': { bg: 'bg-tertiary-container', text: 'text-on-tertiary-container', label: 'MED IMPACT' },
    'Low Impact':    { bg: 'bg-surface-variant',    text: 'text-on-surface-variant',    label: 'LOW IMPACT' },
  };
  return map[impact] || { bg: 'bg-surface-variant', text: 'text-on-surface-variant', label: (impact || '').toUpperCase() };
}

export function getDirectionColorClass(direction) {
  return { up: 'text-primary', down: 'text-error', flat: 'text-outline' }[direction] || 'text-outline';
}

export function getDirectionFromChange(pct) {
  if (pct > 0) return 'up';
  if (pct < 0) return 'down';
  return 'flat';
}

export function getConfidenceLabel(confidence) {
  if (confidence >= 80) return 'Strong Signal';
  if (confidence >= 60) return 'Moderate Signal';
  if (confidence >= 40) return 'Weak Signal';
  return 'Low Confidence';
}

export function formatTimestamp(iso) {
  if (!iso) return '—';
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const m  = Math.floor(ms / 60000);
    const h  = Math.floor(m / 60);
    const d  = Math.floor(h / 24);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m} min${m !== 1 ? 's' : ''} ago`;
    if (h < 24) return `${h} hour${h !== 1 ? 's' : ''} ago`;
    return `${d} day${d !== 1 ? 's' : ''} ago`;
  } catch { return '—'; }
}

export function formatLocalTime(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));
  } catch { return ''; }
}

export function getCurrentLocalTime() {
  return formatLocalTime(new Date().toISOString());
}

export function sortFeedByPriority(items) {
  return [...(items || [])].sort((a, b) => {
    if (a.isBreaking && !b.isBreaking) return -1;
    if (!a.isBreaking && b.isBreaking) return 1;
    if (a.priority !== b.priority) return (a.priority || 99) - (b.priority || 99);
    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
  });
}

export function filterLiveFeedByCategory(items, category) {
  if (!category || category === 'All') return items;
  const map = {
    'High Impact':  (i) => i.impact === 'High Impact',
    'Geo Risk':     (i) => ['Geo Risk','Sanctions','Shipping Chokepoint','Transit Risk','Maritime Insurance Risk'].includes(i.eventType),
    'Market Move':  (i) => ['Price Movement','Market Move'].includes(i.eventType),
    'Policy':       (i) => i.eventType === 'Policy Event' || i.sector === 'Policy',
    'Supply Chain': (i) => ['Supply Chain','Refinery Outage','Production Disruption','Storage Report'].includes(i.eventType),
  };
  return (items || []).filter(map[category] || (() => true));
}

export function isEnergyRelevant(item) {
  const text = [item?.headline, item?.title, item?.whyItMatters, item?.context, item?.marketReadThrough].filter(Boolean).join(' ');
  if (/\b(crude bombs?|crude weapons?|group clash|police arrested|crime|violence|murder|celebrity|sports)\b/i.test(text)) return false;
  const hasEnergy = /\b(crude oil|oil prices?|brent|wti|opec|barrels?|bbl|refiner|petroleum|diesel|gasoline|natural gas|lng|power grid|electricity|renewables?|solar|wind|nuclear|uranium|lithium|battery|pipeline|sanctions?|hormuz|red sea)\b/i.test(text);
  const hasMkt    = /\b(price|market|futures?|supply|demand|exports?|inventory|production|refinery|shipping|tanker|opec|brent|wti|lng|grid|power|sanction|geopolitical|volatility|storage|outage)\b/i.test(text);
  return hasEnergy && hasMkt;
}

export function sanitizeFeedItems(items) {
  const seen = new Set();
  return (items || []).filter(item => {
    const key = String(item.headline || item.title || '').toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
