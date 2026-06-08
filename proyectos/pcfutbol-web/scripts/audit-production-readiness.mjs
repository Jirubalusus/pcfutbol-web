import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const fail = (message) => {
  throw new Error(message);
};
const assertIncludes = (text, needle, label) => {
  if (!text.includes(needle)) fail(`Missing ${label}: ${needle}`);
};
const assertNotIncludes = (text, needle, label) => {
  if (text.includes(needle)) fail(`Unexpected ${label}: ${needle}`);
};
const assertFile = (path, label = path) => {
  if (!existsSync(path)) fail(`Missing ${label}: ${path}`);
};

const packageJson = JSON.parse(read('package.json'));
const firebaseJson = JSON.parse(read('firebase.json'));
const manifest = JSON.parse(read('public/manifest.json'));
const indexHtml = read('index.html');
const viteConfig = read('vite.config.js');
const firestoreRules = read('firestore.rules');
const storageRules = read('storage.rules');
const rankingUi = read('src/components/Ranking/Ranking.jsx');
const rankingService = read('src/firebase/rankingService.js');
const functionsIndex = read('functions/index.js');
const gameContext = read('src/context/GameContext.jsx');

const hostingConfigs = Array.isArray(firebaseJson.hosting)
  ? firebaseJson.hosting
  : [firebaseJson.hosting].filter(Boolean);
const productionHosting = hostingConfigs.find((config) => config.target === 'production') || hostingConfigs[0] || {};
const preprodHosting = hostingConfigs.find((config) => config.target === 'preprod');

if (Array.isArray(firebaseJson.hosting)) {
  if (!productionHosting?.target) fail('Missing Firebase Hosting production target');
  if (!preprodHosting?.target) fail('Missing Firebase Hosting preprod target');
  const withoutTarget = (config) => {
    const clone = structuredClone(config);
    delete clone.target;
    return JSON.stringify(clone);
  };
  if (withoutTarget(productionHosting) !== withoutTarget(preprodHosting)) {
    fail('Firebase Hosting preprod and production configs differ beyond target');
  }
}

const globalHeaders = productionHosting?.headers?.find((entry) => entry.source === '**')?.headers || [];
const headerValue = (key) => globalHeaders.find((header) => header.key === key)?.value;

[
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Permissions-Policy',
].forEach((key) => {
  if (!headerValue(key)) fail(`Missing hosting security header: ${key}`);
});

const csp = headerValue('Content-Security-Policy') || headerValue('Content-Security-Policy-Report-Only');
if (!csp) fail('Missing CSP or CSP report-only header');
assertIncludes(csp, 'worker-src', 'CSP worker-src');
assertIncludes(csp, 'blob:', 'CSP blob worker allowance');
assertIncludes(csp, 'https://apis.google.com', 'CSP Google API script allowance');
assertIncludes(csp, 'https://www.gstatic.com', 'CSP Google static script allowance');
assertNotIncludes(csp, 'upgrade-insecure-requests', 'report-only CSP upgrade-insecure-requests warning');
assertNotIncludes(headerValue('Permissions-Policy') || '', 'bluetooth', 'unsupported Permissions-Policy bluetooth directive');

// Firebase Hosting release target: default deploy should be safe preprod-only; production must be explicit.
assertIncludes(packageJson.scripts?.deploy || '', 'firebase deploy --project pcfutbol-web --only hosting:preprod', 'safe default preprod deploy script');
assertIncludes(packageJson.scripts?.['deploy:preprod'] || '', 'firebase deploy --project pcfutbol-web --only hosting:preprod', 'explicit preprod deploy script');
assertIncludes(packageJson.scripts?.['deploy:production'] || '', 'firebase deploy --project pcfutbol-web --only hosting:production', 'explicit production deploy script');
if ((packageJson.scripts?.['deploy:firebase'] || '').includes('hosting:production')) {
  fail('deploy:firebase silently points to production; use deploy:firebase:production instead');
}
assertIncludes(packageJson.scripts?.['deploy:gh-pages'] || '', 'gh-pages', 'explicit gh-pages deploy script');

// PWA manifest must target Firebase Hosting root, not the legacy GitHub Pages subpath.
if (manifest.start_url !== '/') fail(`Manifest start_url should be '/', got '${manifest.start_url}'`);
if (manifest.scope !== '/') fail(`Manifest scope should be '/', got '${manifest.scope}'`);
if (manifest.lang !== 'es') fail(`Manifest lang should be 'es', got '${manifest.lang}'`);
for (const icon of manifest.icons || []) {
  if (!icon.src?.startsWith('/')) fail(`Manifest icon should use root-relative src: ${icon.src}`);
  if (icon.src?.startsWith('/pcfutbol-web/')) fail(`Manifest icon still uses GitHub Pages subpath: ${icon.src}`);
}

// Mobile/accessibility + cache reset marker.
assertIncludes(indexHtml, 'width=device-width, initial-scale=1.0, viewport-fit=cover', 'zoom-friendly viewport');
assertNotIncludes(indexHtml, 'user-scalable=no', 'disabled mobile zoom');
assertNotIncludes(indexHtml, 'maximum-scale=1.0', 'maximum-scale zoom cap');
assertIncludes(indexHtml, 'production-hardening-20260603', 'fresh production hardening cache marker');
assertIncludes(indexHtml, 'new URLSearchParams(window.location.search)', 'cache reset query preservation');
assertIncludes(indexHtml, "params.set('v', version)", 'cache reset v replacement');
assertIncludes(indexHtml, 'og:title', 'Open Graph title');
assertIncludes(indexHtml, 'twitter:card', 'Twitter card metadata');

// Vite production build should not ship console/debugger noise.
assertIncludes(viteConfig, 'defineConfig(({ mode })', 'mode-aware Vite config');
assertIncludes(viteConfig, "mode === 'production' ? ['console', 'debugger']", 'production console/debugger drop');

// Legal/SEO static files.
assertFile('public/privacy.html', 'privacy page');
assertFile('public/delete-account.html', 'delete-account page');
assertFile('public/delete-data.html', 'delete-data page');
assertFile('public/terms.html', 'terms page');
assertFile('public/robots.txt', 'robots.txt');
assertFile('public/sitemap.xml', 'sitemap.xml');
assertFile('public/404.html', '404 page');
assertIncludes(read('public/robots.txt'), 'Sitemap: https://pcgaffer.com/sitemap.xml', 'robots sitemap link');
assertIncludes(read('public/sitemap.xml'), 'https://pcgaffer.com/', 'sitemap root URL');

// Save errors must surface to the user because prod builds drop console.*.
assertIncludes(gameContext, "useToast", 'toast hook import/use in GameContext');
assertIncludes(gameContext, "toast.error('No se pudo guardar la partida", 'user-visible save failure toast');
assertIncludes(gameContext, 'saveErrorNotifiedRef', 'save failure spam guard');

assertIncludes(storageRules, 'match /{allPaths=**}', 'Storage default-deny catch-all');
assertIncludes(storageRules, 'allow read, write: if false', 'Storage default-deny rule');

assertIncludes(firestoreRules, 'match /contrarreloj_ranking/{entryId}', 'contrarreloj ranking rules');
assertIncludes(firestoreRules, 'data.userId == request.auth.uid', 'ranking ownership check');
assertIncludes(firestoreRules, 'data.createdAt == request.time', 'ranking server timestamp check');
assertIncludes(firestoreRules, 'allow update, delete: if false', 'ranking immutable client rule');
assertIncludes(firestoreRules, 'match /{document=**}', 'Firestore catch-all');

assertIncludes(rankingService, 'sanitizeRankingEntry', 'ranking sanitizer');
assertIncludes(rankingService, 'MAX_RANKING_ENTRIES = 100', 'ranking load cap');
assertIncludes(rankingService, 'PC_GAFFER_ALLOW_RANKING_CLEAR', 'explicit local ranking clear flag');
assertIncludes(rankingUi, 'import.meta.env.DEV', 'dev-only clear ranking UI guard');
assertIncludes(rankingUi, 'PC_GAFFER_ALLOW_RANKING_CLEAR', 'explicit clear ranking UI flag');

assertIncludes(functionsIndex, 'MAX_DELETES_PER_RUN', 'cleanup delete budget');
assertIncludes(functionsIndex, '.where(fieldName, "<", cutoff)', 'cleanup timestamp query');
if (functionsIndex.includes('collection("users").select().get()')) {
  fail('Cleanup still performs a full users scan');
}
if (functionsIndex.includes('.collection(collectionName).get()')) {
  fail('Cleanup still performs an unbounded collection scan');
}

console.log('Production readiness audit passed.');
