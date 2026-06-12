/**
 * GeoEnergy Intelligence AI — Helper Functions
 *
 * Pure utility functions used across the dashboard.
 * No DOM dependencies — these are safe to unit-test independently.
 */

// ─── SENTIMENT ───────────────────────────────────────────────────────────────

/**
 * Returns display label and CSS class info for a sentiment value.
 * @param {string} sentiment - one of ALLOWED_SENTIMENTS
 * @returns {{ label: string, colorClass: string, borderClass: string }}
 */
function getSentimentLabel(sentiment) {
  const map = {
    'Bullish':   { label: 'BULLISH',   colorClass: 'text-primary',           borderClass: 'border-primary' },
    'Bearish':   { label: 'BEARISH',   colorClass: 'text-error',             borderClass: 'border-error' },
    'Neutral':   { label: 'NEUTRAL',   colorClass: 'text-on-surface-variant', borderClass: 'border-on-surface-variant' },
    'Volatile':  { label: 'VOLATILE',  colorClass: 'text-tertiary',          borderClass: 'border-tertiary' },
    'Steady':    { label: 'STEADY',    colorClass: 'text-on-surface-variant', borderClass: 'border-on-surface-variant' },
    'Expanding': { label: 'EXPANDING', colorClass: 'text-primary-container', borderClass: 'border-primary-container' }
  };
  return map[sentiment] || { label: sentiment.toUpperCase(), colorClass: 'text-on-surface-variant', borderClass: 'border-outline-variant' };
}

/**
 * Returns the top-border color class for sector cards, keyed by sentiment.
 * Matches the existing design's border-t-2 color conventions.
 * @param {string} sentiment
 * @returns {string} Tailwind border-t class
 */
function getSentimentBorderTop(sentiment) {
  const map = {
    'Bullish':   'border-t-primary',
    'Bearish':   'border-t-error',
    'Neutral':   'border-t-on-surface-variant',
    'Volatile':  'border-t-tertiary',
    'Steady':    'border-t-on-surface-variant',
    'Expanding': 'border-t-primary-container'
  };
  return map[sentiment] || 'border-t-outline-variant';
}

// ─── RISK LEVEL ──────────────────────────────────────────────────────────────

/**
 * Returns display info for a risk level string.
 * @param {string} riskLevel - one of ALLOWED_RISK_LEVELS
 * @returns {{ label: string, colorClass: string, score: string }}
 */
function getRiskLevel(riskLevel) {
  const map = {
    'Critical': { label: 'CRITICAL', colorClass: 'text-error',             scoreClass: 'text-error' },
    'High':     { label: 'HIGH',     colorClass: 'text-tertiary',          scoreClass: 'text-tertiary' },
    'Moderate': { label: 'MODERATE', colorClass: 'text-primary',           scoreClass: 'text-primary' },
    'Low':      { label: 'LOW',      colorClass: 'text-on-surface-variant', scoreClass: 'text-on-surface-variant' }
  };
  return map[riskLevel] || { label: riskLevel.toUpperCase(), colorClass: 'text-outline', scoreClass: 'text-outline' };
}

/**
 * Determines risk level from a numeric risk score (0–10).
 * @param {number} score
 * @returns {string} riskLevel
 */
function getRiskLevelFromScore(score) {
  if (score >= 9.0) return 'Critical';
  if (score >= 7.5) return 'High';
  if (score >= 5.0) return 'Moderate';
  return 'Low';
}

// ─── IMPACT BADGE ────────────────────────────────────────────────────────────

/**
 * Returns CSS classes for impact badge rendering.
 * @param {string} impact - 'High Impact' | 'Medium Impact' | 'Low Impact'
 * @returns {{ bg: string, text: string, label: string }}
 */
function getImpactBadge(impact) {
  const map = {
    'High Impact':   { bg: 'bg-error-container',   text: 'text-on-error-container', label: 'HIGH IMPACT' },
    'Medium Impact': { bg: 'bg-tertiary-container', text: 'text-on-tertiary-container', label: 'MED IMPACT' },
    'Low Impact':    { bg: 'bg-surface-variant',    text: 'text-on-surface-variant', label: 'LOW IMPACT' }
  };
  return map[impact] || { bg: 'bg-surface-variant', text: 'text-on-surface-variant', label: impact.toUpperCase() };
}

// ─── DIRECTION ───────────────────────────────────────────────────────────────

/**
 * Derives direction from a changePercent number.
 * @param {number} changePercent
 * @returns {'up'|'down'|'flat'}
 */
function getDirectionFromChange(changePercent) {
  if (changePercent > 0) return 'up';
  if (changePercent < 0) return 'down';
  return 'flat';
}

/**
 * Returns the CSS color class for a direction.
 * @param {'up'|'down'|'flat'} direction
 * @returns {string} Tailwind text color class
 */
function getDirectionColorClass(direction) {
  const map = {
    'up':   'text-primary',
    'down': 'text-error',
    'flat': 'text-outline'
  };
  return map[direction] || 'text-outline';
}

/**
 * Returns a + or - prefix string for display.
 * @param {number} changePercent
 * @returns {string}
 */
function getChangePrefix(changePercent) {
  if (changePercent > 0) return '+';
  return '';  // negative numbers already carry their minus sign
}

// ─── PRICE FORMATTING ────────────────────────────────────────────────────────

/**
 * Formats a price number with currency symbol and appropriate decimal places.
 * @param {number} price
 * @param {string} currency - '$' | '€' | '£'
 * @param {number} [decimals=2]
 * @returns {string} e.g. '$78.42'
 */
function formatPrice(price, currency = '$', decimals = 2) {
  return `${currency}${price.toFixed(decimals)}`;
}

/**
 * Formats a change percent for display.
 * @param {number} changePercent
 * @returns {string} e.g. '+1.2%' or '-2.4%'
 */
function formatChangePercent(changePercent) {
  const prefix = getChangePrefix(changePercent);
  return `${prefix}${changePercent.toFixed(1)}%`;
}

// ─── TIMESTAMP FORMATTING ────────────────────────────────────────────────────

/**
 * Converts an ISO timestamp to a human-readable relative time string.
 * @param {string} isoTimestamp
 * @returns {string} e.g. '14 mins ago', '2 hours ago', 'Just now'
 */
function formatTimestamp(isoTimestamp) {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

/**
 * Formats an ISO timestamp to a short local time string.
 * @param {string} isoTimestamp
 * @returns {string} e.g. '10:02 PM CDT'
 */
function formatLocalTime(isoTimestamp) {
  const d = new Date(isoTimestamp);
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(d);
}

// ─── LIVE FEED FILTERING ─────────────────────────────────────────────────────

/**
 * Filter categories and their matching logic against liveFeedItems fields.
 */
const FEED_FILTER_CATEGORIES = {
  'All':          () => true,
  'High Impact':  (item) => item.impact === 'High Impact',
  'Geo Risk':     (item) => ['Geo Risk', 'Sanctions', 'Shipping Chokepoint', 'Transit Risk', 'Maritime Insurance Risk'].includes(item.eventType),
  'Market Move':  (item) => item.eventType === 'Price Movement' || item.eventType === 'Market Move',
  'Policy':       (item) => item.eventType === 'Policy Event' || item.sector === 'Policy',
  'Supply Chain': (item) => ['Supply Chain', 'Refinery Outage', 'Production Disruption', 'Storage Report'].includes(item.eventType)
};

/**
 * Filters live feed items by a named category.
 * @param {Array} items - liveFeedItems array
 * @param {string} category - key from FEED_FILTER_CATEGORIES
 * @returns {Array} filtered items
 */
function filterLiveFeedByCategory(items, category) {
  const filterFn = FEED_FILTER_CATEGORIES[category] || FEED_FILTER_CATEGORIES['All'];
  return items.filter(filterFn);
}

// ─── LIVE FEED SORTING ───────────────────────────────────────────────────────

/**
 * Sorts live feed items by priority (breaking first, then by timestamp desc).
 * Breaking items (isBreaking: true) are always sorted to the top within their priority tier.
 * @param {Array} items
 * @returns {Array} sorted copy
 */
function sortFeedByPriority(items) {
  return [...items].sort((a, b) => {
    // Breaking items first
    if (a.isBreaking && !b.isBreaking) return -1;
    if (!a.isBreaking && b.isBreaking) return 1;
    // Then by priority (lower = higher priority)
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Then by most recent timestamp
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
}

// ─── CONFIDENCE ──────────────────────────────────────────────────────────────

/**
 * Returns a signal strength label based on confidence score.
 * @param {number} confidence - 0 to 100
 * @returns {string}
 */
function getConfidenceLabel(confidence) {
  if (confidence >= 80) return 'Strong Signal';
  if (confidence >= 60) return 'Moderate Signal';
  if (confidence >= 40) return 'Weak Signal';
  return 'Low Confidence';
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────

/**
 * Validates a sector score object from the AI service.
 * Returns { valid: true } or { valid: false, errors: string[] }
 * @param {object} score
 * @returns {{ valid: boolean, errors?: string[] }}
 */
function validateSectorScore(score) {
  const errors = [];
  if (!score) { return { valid: false, errors: ['Score object is null'] }; }
  if (!ALLOWED_SENTIMENTS.includes(score.sentiment))  errors.push(`Invalid sentiment: ${score.sentiment}`);
  if (typeof score.confidence !== 'number' || score.confidence < 0 || score.confidence > 100)
    errors.push(`Confidence out of range: ${score.confidence}`);
  if (!ALLOWED_SECTORS.includes(score.sector))        errors.push(`Invalid sector: ${score.sector}`);
  if (!ALLOWED_RISK_LEVELS.includes(score.riskLevel)) errors.push(`Invalid riskLevel: ${score.riskLevel}`);
  if (!score.reason)    errors.push('Missing required field: reason');
  if (!score.watchItem) errors.push('Missing required field: watchItem');
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

/**
 * Validates a headline item from the news service.
 * @param {object} item
 * @returns {{ valid: boolean, errors?: string[] }}
 */
function validateHeadlineItem(item) {
  const errors = [];
  if (!item.headline) errors.push('Missing required field: headline (title)');
  if (!item.source)   errors.push('Missing required field: source');
  if (!item.time && !item.timestamp) errors.push('Missing required field: time or timestamp');
  if (item.impact && !ALLOWED_IMPACTS.includes(item.impact)) errors.push(`Invalid impact: ${item.impact}`);
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

/**
 * Applies AI fallback to a sector score object if validation fails.
 * @param {object} score - the score to check
 * @returns {object} valid score (original or fallback-merged)
 */
function applyFallbackIfInvalid(score) {
  const result = validateSectorScore(score);
  if (!result.valid) {
    console.warn('[GEI] Score validation failed:', result.errors, '— applying fallback');
    return { ...score, ...AI_FALLBACK };
  }
  return score;
}

// ─── SYSTEM CLOCK ────────────────────────────────────────────────────────────

/**
 * Returns the current local time as a formatted string.
 * Used by the top nav system clock.
 * @returns {string} e.g. '10:02 PM CDT'
 */
function getCurrentLocalTime() {
  return formatLocalTime(new Date().toISOString());
}

// ─── ICON SYSTEM (replaces Material Symbols) ──────────────────────────────────
const GEI_ICONS = {
  refresh:        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
  filter_list:    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="6" y2="6"/><line x1="8" x2="16" y1="12" y2="12"/><line x1="11" x2="13" y1="18" y2="18"/></svg>',
  notifications:  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  settings:       '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  person:         '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  analytics:      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>',
  content_paste:  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>',
  data_exploration:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>',
  info:           '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  close:          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  satellite:      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/></svg>',
  search:         '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  check_circle:   '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  error:          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
  warning:        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  pending:        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  trending_up:    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  hub:            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="5" r="2"/><line x1="12" x2="19" y1="12" y2="5"/><line x1="12" x2="5" y1="12" y2="19"/><line x1="12" x2="19" y1="12" y2="19"/><line x1="12" x2="5" y1="12" y2="5"/></svg>',
  public:         '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  event:          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
  open_in_new:    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>',
  link:           '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  notifications_active: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4.2 4.2C2.8 5.6 2 7.7 2 10"/><path d="M19.8 4.2C21.2 5.6 22 7.7 22 10"/></svg>',
  manage_accounts:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>',
  monitoring:     '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  logout:         '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
  chevron_right:  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  newspaper:      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/></svg>',
};

function geiIcon(name, extraClass) {
  const svg = GEI_ICONS[name] || GEI_ICONS.info;
  return '<span class="gei-icon' + (extraClass ? ' ' + extraClass : '') + '" style="display:inline-flex;align-items:center;vertical-align:middle">' + svg + '</span>';
}
