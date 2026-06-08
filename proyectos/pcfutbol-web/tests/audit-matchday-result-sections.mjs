// Static source audit for the MatchDay result summary CAMBIOS + MOMENTUM sections.
// Verifies the markup hooks exist, substitutions are no longer rendered inline with
// goals/cards, and the result momentum panel (SofaScore-style) renders the full-match
// timeline with goal, yellow-card and red-card markers.
//
// Run: node tests/audit-matchday-result-sections.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const jsx = readFileSync(resolve(root, 'src/components/MatchDay/MatchDay.jsx'), 'utf8');
const scss = readFileSync(resolve(root, 'src/components/MatchDay/MatchDay.scss'), 'utf8');
const es = JSON.parse(readFileSync(resolve(root, 'src/locales/es.json'), 'utf8'));
const en = JSON.parse(readFileSync(resolve(root, 'src/locales/en.json'), 'utf8'));

const failures = [];
const check = (cond, message, details = '') => {
  if (!cond) failures.push(details ? `${message} — ${details}` : message);
};

// 1. CAMBIOS (substitutions) markup hooks still present.
check(jsx.includes('result-substitutions'), 'JSX must render a result-substitutions (CAMBIOS) block');
check(/subs-count/.test(jsx), 'CAMBIOS block must include a count badge (subs-count)');
check(/t\(\s*['"]matchday\.noSubstitutions['"]\s*\)/.test(jsx), 'CAMBIOS block must use the localized noSubstitutions placeholder');
check(es.matchday?.noSubstitutions === 'Sin cambios' && en.matchday?.noSubstitutions === 'No substitutions', 'noSubstitutions locale keys must exist in ES and EN');
check(scss.includes('.result-substitutions'), 'SCSS must style .result-substitutions');

// 2. The old goal-only chronology has been replaced by the momentum panel.
check(!/result-chronology/.test(jsx), 'Old result-chronology block must be removed from JSX');
check(!/result-chronology/.test(scss), 'Old .result-chronology styles must be removed from SCSS');

// 3. Result momentum panel markup hooks present (JSX & SCSS).
check(jsx.includes('result-momentum-card'), 'JSX must render a result-momentum-card panel');
check(jsx.includes('result-momentum-chart'), 'JSX must render the result-momentum-chart');
check(scss.includes('.result-momentum-card'), 'SCSS must style .result-momentum-card');
check(scss.includes('.result-event-marker'), 'SCSS must style .result-event-marker');

// 4. Header uses the localized matchMomentum key (no hardcoded Spanish).
check(/t\(\s*['"]matchday\.matchMomentum['"]\s*\)/.test(jsx), 'Momentum panel header must use the localized matchMomentum placeholder');
check(typeof es.matchday?.matchMomentum === 'string' && typeof en.matchday?.matchMomentum === 'string', 'matchMomentum locale keys must exist in ES and EN');

// 5. Momentum buckets cover the FULL match: 90 buckets, full-match minute, all events.
const fullMatchBuckets =
  /resultMomentumBuckets/.test(jsx) &&
  /buildMomentumBuckets\(\{[\s\S]*?bucketCount:\s*90[\s\S]*?\}\)/.test(jsx);
check(fullMatchBuckets, 'Result momentum must build 90 buckets via buildMomentumBuckets (resultMomentumBuckets)');
check(/resultFullMinute\s*=\s*matchResult\.extraTime\s*\?\s*120\s*:\s*90\s*\+\s*\(matchResult\.stoppageTime/.test(jsx),
  'Result momentum must use the full match duration (120 / 90 + stoppageTime)');
check(/currentMinute:\s*resultFullMinute/.test(jsx),
  'Result momentum must feed the full match as elapsed so every bucket is active');

// 6. Event markers cover goals AND yellow/red cards, positioned by minute per team.
check(/resultMarkers/.test(jsx), 'Result momentum must derive a resultMarkers list');
const markersAllEvents =
  /e\.type\s*===\s*'goal'\s*\|\|\s*e\.type\s*===\s*'yellow_card'\s*\|\|\s*e\.type\s*===\s*'red_card'/.test(jsx);
check(markersAllEvents, 'resultMarkers must include goals, yellow_card and red_card events');
check(/result-event-marker--\$\{m\.team\}/.test(jsx), 'Markers must be placed on the correct team half (result-event-marker--home/away)');
check(/rem-card--\$\{m\.type\s*===\s*'yellow_card'\s*\?\s*'yellow'\s*:\s*'red'\}/.test(jsx),
  'Card markers must distinguish yellow vs red (rem-card--yellow / rem-card--red)');
check(scss.includes('.rem-card--yellow') && scss.includes('.rem-card--red'),
  'SCSS must style yellow and red card markers (.rem-card--yellow / .rem-card--red)');
check(/goal-net-ball\.svg/.test(jsx), 'Goal markers must reuse the goal-net-ball asset from the live panel');

// 7. Accessibility: each marker carries a title/aria-label with minute, team, type, player.
check(/aria-label=\{label\}/.test(jsx) && /title=\{label\}/.test(jsx),
  'Markers must expose a title and aria-label describing the event');

// 8. Empty case: still shows the bars plus a localized empty note (not the goal-only one).
check(/t\(\s*['"]matchday\.noEvents['"]\s*\)/.test(jsx), 'Empty momentum must use the localized noEvents placeholder');
check(typeof es.matchday?.noEvents === 'string' && typeof en.matchday?.noEvents === 'string', 'noEvents locale keys must exist in ES and EN');

// 9. Crests on the left, matching the live SofaScore panel.
check(/momentum-crest momentum-crest--home/.test(jsx) && /momentum-crest momentum-crest--away/.test(jsx),
  'Momentum panel must show team crests on the left (reusing the live momentum-crest classes)');

// 10. Substitutions must NOT be rendered inline with goals/cards anymore.
check(!/event-item substitution/.test(jsx),
  'Substitutions must not be listed inline with goals/cards (no "event-item substitution")');

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    checks: [
      'CAMBIOS markup hooks present (JSX & SCSS)',
      'old goal-only chronology replaced by the momentum panel',
      'result momentum panel markup hooks present (JSX & SCSS)',
      'momentum builds 90 full-match buckets with all events',
      'event markers cover goals + yellow/red cards by minute per team',
      'markers expose accessible title/aria-label',
      'empty case shows bars + localized noEvents note',
      'team crests on the left (reused live classes)',
      'no inline substitution rows in goals/cards columns',
    ],
  }, null, 2));
}
