import { readFileSync } from 'node:fs';

// Source audit for the privacy-conscious analytics instrumentation. Verifies the
// measurement-id gate and the core event helpers/calls are present, so a refactor
// can't silently drop analytics or remove its self-disabling safety gate.

const config = readFileSync('src/firebase/config.js', 'utf8');
const analytics = readFileSync('src/firebase/analytics.js', 'utf8');
const app = readFileSync('src/App.jsx', 'utf8');
const draft = readFileSync('src/components/WorldCupDraft/WorldCupDraft.jsx', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function includesAll(source, patterns, scope) {
  for (const pattern of patterns) {
    assert(source.includes(pattern), `${scope} missing: ${pattern}`);
  }
}

// 1. Firebase config exposes the measurement id from env (the gate input).
includesAll(config, [
  'measurementId',
  'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID',
], 'firebase/config.js');

// 2. Analytics module: env gate + support gate + the four required helpers + QA hook.
includesAll(analytics, [
  'VITE_FIREBASE_MEASUREMENT_ID',
  'isSupported',
  'export function trackEvent',
  'export function trackScreenView',
  'export function trackClick',
  'export function setAnalyticsUserProperties',
  'export function setAnalyticsUserId',
  'export function trackAuthState',
  'export function trackSessionHeartbeat',
  'export function gameModeLabel',
  '__pcgAnalyticsDebug',
  "'[email]'",
], 'firebase/analytics.js');

// The hard gate: with no measurement id, nothing is sent.
assert(
  /if \(!MEASUREMENT_ID\)/.test(analytics),
  'firebase/analytics.js must short-circuit when MEASUREMENT_ID is unset',
);
// Debug helpers must be confined to dev/preprod builds.
assert(
  analytics.includes('IS_DEBUG_BUILD') && analytics.includes('pcgaffer-preprod'),
  'firebase/analytics.js must gate debug helpers to dev/preprod only',
);

// 3. App shell wires lifecycle, screen views and sanitized click delegation.
includesAll(app, [
  "from './firebase/analytics'",
  "trackEvent('app_start'",
  "trackEvent('app_loaded'",
  'trackScreenView(',
  'setAnalyticsUserProperties(',
  'setAnalyticsUserId(',
  'trackAuthState(',
  'trackSessionHeartbeat(',
  "trackEvent('game_session_start'",
  "trackEvent('match_start'",
  "trackEvent('match_finish'",
  'handleAnalyticsClick',
  'data-analytics-label',
], 'App.jsx');

// 3b. Auth funnel events are coarse provider/auth-state only.
const authContext = readFileSync('src/context/AuthContext.jsx', 'utf8');
includesAll(authContext, [
  "trackEvent('trial_start'",
  "trackEvent('login_success'",
  "trackEvent('register_success'",
  "trackEvent('logout'",
], 'AuthContext.jsx');

// 3c. Privacy guard: analytics event params must not use obvious PII/save-data keys.
// setAnalyticsUserId is allowed to receive an opaque Firebase UID, but UID must not be
// sent as a normal GA event param where it would be easier to misuse in reports.
const sourceFiles = [
  ['src/firebase/analytics.js', analytics],
  ['src/App.jsx', app],
  ['src/context/AuthContext.jsx', authContext],
  ['src/components/WorldCupDraft/WorldCupDraft.jsx', draft],
  ['src/components/MainMenu/MainMenu.jsx', readFileSync('src/components/MainMenu/MainMenu.jsx', 'utf8')],
  ['src/components/Ranking/Ranking.jsx', readFileSync('src/components/Ranking/Ranking.jsx', 'utf8')],
];
const forbiddenParamKeys = /\b(email|mail|displayName|playerName|player_name|userName|username|uid|user_id|roster|lineup|saveData|save_data|password|token|secret)\s*:/i;
for (const [file, source] of sourceFiles) {
  const eventCalls = source.match(/track(?:Event|Click|ScreenView|AuthState|SessionHeartbeat)\s*\([\s\S]{0,700}?\)/g) || [];
  for (const call of eventCalls) {
    assert(!forbiddenParamKeys.test(call), `${file} has forbidden analytics param key in: ${call.slice(0, 160)}`);
  }
}

// 4. Mundial Draft funnel events are present and lightweight.
includesAll(draft, [
  "from '../../firebase/analytics'",
  "trackEvent('wc_draft_start'",
  "trackEvent('wc_draft_pick'",
  "trackEvent('wc_draft_complete'",
  "trackEvent('wc_draft_tournament_start'",
  "trackEvent('wc_draft_tournament_finish'",
], 'WorldCupDraft.jsx');

// 5. Privacy guard: the draft pick event must not forward a player name.
const pickBlock = draft.slice(draft.indexOf("trackEvent('wc_draft_pick'"));
assert(
  !/wc_draft_pick'[^)]*\bname\b/.test(pickBlock.slice(0, 200)),
  'wc_draft_pick must not include a player name',
);

console.log(JSON.stringify({
  ok: true,
  checks: [
    'firebase config exposes VITE_FIREBASE_MEASUREMENT_ID gate',
    'analytics module has env + support gates and the 4 core helpers',
    'analytics self-disables with no measurement id',
    'debug helpers confined to dev/preprod',
    'App wires app_start/app_loaded, screen views, user properties, user id, auth state, heartbeat, game/match events, click delegation',
    'Auth funnel events present with coarse providers only',
    'PII-like analytics param keys rejected in event calls',
    'Mundial Draft funnel events present',
    'draft pick event omits player names',
  ],
}, null, 2));
