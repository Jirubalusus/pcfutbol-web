// Firebase Analytics (Google Analytics 4) — production-safe, privacy-conscious wrapper.
//
// Design goals:
//  - Never crash the app. Every export is a no-op if analytics is unavailable
//    (no measurement id, unsupported browser, SSR/build/test, init failure).
//  - Gated on VITE_FIREBASE_MEASUREMENT_ID. With no id configured, analytics
//    stays fully disabled and nothing is sent. This keeps production untouched
//    until the env var is provisioned.
//  - No personal data. We never log emails, typed text, player names from user
//    input, or raw save contents. Click labels are sanitized + truncated.
//  - In dev/preprod we keep a small in-memory ring buffer of recent events and
//    expose it on window.__pcgAnalyticsDebug so QA can verify without the GA
//    console (which can lag up to 24h for standard reports).

import app from './config';

const MEASUREMENT_ID = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

// Debug builds: local dev OR the preprod hosting target. We never expose debug
// helpers in production.
const isPreprodHost = typeof window !== 'undefined'
  && /(^|\.)pcgaffer-preprod\.web\.app$/.test(window.location?.hostname || '')
  || (typeof window !== 'undefined' && /preprod/i.test(window.location?.hostname || ''));
const IS_DEBUG_BUILD = Boolean(import.meta.env.DEV) || isPreprodHost;

// Recent-events ring buffer for QA (debug builds only).
const DEBUG_BUFFER_LIMIT = 50;
const debugBuffer = [];

let analyticsInstance = null;
let initPromise = null;
let initialized = false;
let enabled = false; // true only once analytics is live and sending.

function sequenceCounter() {
  // Avoid Date.now()/Math.random() at module init concerns; a simple counter is
  // enough to order debug events. Timestamps are stamped lazily inside helpers.
  sequenceCounter._n = (sequenceCounter._n || 0) + 1;
  return sequenceCounter._n;
}

function pushDebug(kind, name, params) {
  if (!IS_DEBUG_BUILD) return;
  let ts = null;
  try { ts = new Date().toISOString(); } catch { ts = null; }
  debugBuffer.push({ seq: sequenceCounter(), ts, kind, name, params: params || {}, sent: enabled });
  if (debugBuffer.length > DEBUG_BUFFER_LIMIT) debugBuffer.shift();
  if (import.meta.env.DEV) {
    // Keep dev console signal low-noise but visible.
    // eslint-disable-next-line no-console
    console.debug('[pcg-analytics]', enabled ? 'send' : 'queued(disabled)', name, params || {});
  }
}

// Truncate + flatten arbitrary strings before they reach GA. Defends against
// accidentally shipping long blobs or unexpected input values as event params.
export function sanitizeLabel(value, max = 80) {
  if (value == null) return undefined;
  let str = String(value);
  // Collapse whitespace/newlines so multi-line button content stays a clean label.
  str = str.replace(/\s+/g, ' ').trim();
  // Never send email addresses or mailto payloads as labels, even when they are
  // visible link text. The click tracker separately records link_type=mailto.
  str = str.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
  str = str.replace(/mailto:[^\s)]+/gi, 'mailto:[email]');
  if (!str) return undefined;
  if (str.length > max) str = `${str.slice(0, max - 1)}…`;
  return str;
}

// Strip params down to GA-safe primitives and drop empties. Never forwards
// objects/arrays (which could smuggle raw save data).
function sanitizeParams(params) {
  const out = {};
  if (!params || typeof params !== 'object') return out;
  for (const [key, raw] of Object.entries(params)) {
    if (raw == null) continue;
    if (typeof raw === 'number' || typeof raw === 'boolean') {
      out[key] = raw;
    } else if (typeof raw === 'string') {
      const clean = sanitizeLabel(raw, 100);
      if (clean !== undefined) out[key] = clean;
    }
    // Objects/arrays/functions are intentionally ignored.
  }
  return out;
}

// Kick off async, support-gated initialization. Safe to call repeatedly.
export function initAnalytics() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (initialized) return enabled;
    initialized = true;
    if (typeof window === 'undefined') return false; // SSR/build/test guard.
    if (!MEASUREMENT_ID) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[pcg-analytics] disabled: VITE_FIREBASE_MEASUREMENT_ID not set');
      }
      return false;
    }
    try {
      const { isSupported, getAnalytics } = await import('firebase/analytics');
      const supported = await isSupported().catch(() => false);
      if (!supported) return false;
      analyticsInstance = getAnalytics(app);
      enabled = true;
      return true;
    } catch {
      // Blocked by a content blocker, unsupported env, etc. Stay silent + disabled.
      enabled = false;
      return false;
    }
  })();
  return initPromise;
}

async function dispatchEvent(name, params) {
  const safeName = sanitizeLabel(name, 40);
  if (!safeName) return;
  const safeParams = sanitizeParams(params);
  pushDebug('event', safeName, safeParams);
  if (!MEASUREMENT_ID) return; // hard gate
  try {
    await initAnalytics();
    if (!enabled || !analyticsInstance) return;
    const { logEvent } = await import('firebase/analytics');
    logEvent(analyticsInstance, safeName, safeParams);
  } catch {
    // Swallow — analytics must never affect gameplay.
  }
}

// --- Public helpers -------------------------------------------------------

export function trackEvent(name, params) {
  // Fire-and-forget; callers never need to await.
  void dispatchEvent(name, params);
}

export function trackScreenView(screenName, params = {}) {
  const screen = sanitizeLabel(screenName, 60) || 'unknown';
  void dispatchEvent('screen_view', {
    screen_name: screen,
    firebase_screen: screen,
    ...params,
  });
}

export function trackClick(params = {}) {
  void dispatchEvent('ui_click', params);
}

export function setAnalyticsUserProperties(props) {
  const safe = sanitizeParams(props);
  pushDebug('user_properties', 'user_properties', safe);
  if (!MEASUREMENT_ID) return;
  (async () => {
    try {
      await initAnalytics();
      if (!enabled || !analyticsInstance) return;
      const { setUserProperties } = await import('firebase/analytics');
      setUserProperties(analyticsInstance, safe);
    } catch {
      // ignore
    }
  })();
}

// --- User id (GA4 setUserId) ---------------------------------------------
// We forward ONLY the Firebase Auth UID (or a coarse provider-prefixed id like
// `playgames_…`). A UID is an opaque identifier, not PII — unlike an email or a
// display name. We still defensively sanitize: anything that looks like an email
// or free text is rejected so a refactor can never smuggle PII into setUserId.
let currentUserId = null;

// Allow only opaque id characters and cap length. Reject emails outright.
function sanitizeUserId(value) {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (str.includes('@')) return null;        // never an email
  if (/\s/.test(str)) return null;           // never free text with spaces
  const clean = str.replace(/[^A-Za-z0-9_:-]/g, '');
  if (!clean) return null;
  return clean.slice(0, 64);
}

// Set the GA4 user id for an authenticated user, or clear it (pass null) when
// the user is anonymous/trial/logged out. Idempotent — repeated identical calls
// are ignored. Never crashes; no-op when analytics is unconfigured/disabled.
export function setAnalyticsUserId(uidOrNull) {
  const next = sanitizeUserId(uidOrNull); // null when clearing or invalid
  if (next === currentUserId) return;
  currentUserId = next;
  pushDebug('user_id', 'set_user_id', { user_id: next ? 'set' : 'cleared' });
  if (!MEASUREMENT_ID) return;
  (async () => {
    try {
      await initAnalytics();
      if (!enabled || !analyticsInstance) return;
      const { setUserId } = await import('firebase/analytics');
      // Passing null clears the id for anonymous/logged-out sessions.
      setUserId(analyticsInstance, next);
    } catch {
      // ignore — analytics must never affect gameplay
    }
  })();
}

// --- Auth-state + presence events ----------------------------------------
// Emitted when auth resolves or changes. Lets GA4 segment logged vs unlogged
// and returning/engaged users. auth_state is one of:
// verified | unverified | trial | anonymous (never an email/uid).
export function trackAuthState(authState, metadata = {}) {
  void dispatchEvent('session_auth_state', {
    auth_state: sanitizeLabel(authState, 24) || 'anonymous',
    ...metadata,
  });
}

// Lightweight presence ping (~every 60s while the app is open). Lets GA4
// Realtime approximate who is currently playing and in which area without any
// Firestore/RTDB cost. Params must stay non-personal: auth_state, current_screen,
// app_area, game_mode.
export function trackSessionHeartbeat(params = {}) {
  void dispatchEvent('session_heartbeat', params);
}

// Allow-listed game-mode label. Anything unknown collapses to 'other' so we
// never forward arbitrary strings as a dimension value.
const KNOWN_GAME_MODES = new Set([
  'career', 'free', 'contrarreloj', 'promanager', 'glory',
  'ranked', 'ranked_draft', 'worldcup', 'worldcup_draft',
]);
export function gameModeLabel(mode) {
  const clean = sanitizeLabel(mode, 24);
  if (clean && KNOWN_GAME_MODES.has(clean)) return clean;
  return 'other';
}

// Whether analytics is configured at all (id present). Useful for callers that
// want to skip building params when nothing will ever be sent.
export function isAnalyticsConfigured() {
  return Boolean(MEASUREMENT_ID);
}

// Expose a QA handle in debug builds only.
if (IS_DEBUG_BUILD && typeof window !== 'undefined') {
  window.__pcgAnalyticsDebug = {
    get configured() { return Boolean(MEASUREMENT_ID); },
    get enabled() { return enabled; },
    get measurementId() { return MEASUREMENT_ID || null; },
    get events() { return debugBuffer.slice(); },
    clear() { debugBuffer.length = 0; },
    init: initAnalytics,
    track: trackEvent,
  };
}
