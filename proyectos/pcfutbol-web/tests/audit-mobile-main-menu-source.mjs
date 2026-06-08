import { readFileSync } from 'node:fs';

const scss = readFileSync('src/components/MainMenu/MainMenu.scss', 'utf8');
const jsx = readFileSync('src/components/MainMenu/MainMenu.jsx', 'utf8');
const index = readFileSync('index.html', 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function includesAll(source, patterns, scope) {
  for (const pattern of patterns) {
    assert(source.includes(pattern), `${scope} missing ${pattern}`);
  }
}

const mobileMenuMatch = scss.match(/@media \(max-width: 768px\) \{[\s\S]*?overflow-x: hidden;[\s\S]*?overflow-y: auto;[\s\S]*?overscroll-behavior: contain;[\s\S]*?-webkit-overflow-scrolling: touch;[\s\S]*?\}/);
assert(mobileMenuMatch, 'Mobile .main-menu must be an internal vertical scroll container without horizontal overflow');

// The decorative background must be viewport-bound (fixed) so the app gradient/grid/glow
// covers the whole visible mobile viewport at every scroll position. Since .main-menu is the
// internal scroller on mobile, an absolutely-positioned background would scroll away and leave
// the footer / support / safe-area region detached from the app background.
const backgroundMatch = scss.match(/&__background \{[\s\S]*?position: fixed;[\s\S]*?inset: 0;[\s\S]*?pointer-events: none;[\s\S]*?\}/);
assert(backgroundMatch, 'Mobile .main-menu__background must be fixed/viewport-bound with pointer-events: none so it covers all scroll positions');
assert(scss.includes('marker: main-menu-mobile-background-20260602'), 'MainMenu.scss must include the main-menu-mobile-background-20260602 marker');

includesAll(scss, [
  'padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 5.5rem);',
  '&__secondary-label',
  'display: inline;',
  'text-overflow: ellipsis;',
  '&__settings-wrapper',
  'overflow-y: auto;',
], 'MainMenu.scss');

includesAll(jsx, [
  'main-menu__secondary-label',
  "aria-label={t('mainMenu.recordsButton')}",
  "aria-label={t('mainMenu.optionsButton')}",
  "aria-label={t('mainMenu.editionButton')}",
  "setShowSettings(true)",
  "setShowEditionMode(true)",
  "payload: 'ranking'",
], 'MainMenu.jsx');

assert(index.includes('production-hardening-20260603'), 'index.html production cache marker was not updated');

console.log(JSON.stringify({
  ok: true,
  checks: [
    'mobile main menu uses internal vertical scroll',
    'decorative background is fixed/viewport-bound and covers all scroll positions',
    'mobile secondary actions have visible labels and no horizontal overflow',
    'settings, edition, and ranking actions remain wired',
    'settings overlay remains scrollable',
    'cache marker updated',
  ],
}, null, 2));
