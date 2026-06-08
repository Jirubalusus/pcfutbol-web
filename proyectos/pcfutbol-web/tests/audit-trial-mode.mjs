import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
};
const ok = (message) => console.log(`✅ ${message}`);

const auth = read('src/context/AuthContext.jsx');
const mainMenu = read('src/components/MainMenu/MainMenu.jsx');
const app = read('src/App.jsx');
const game = read('src/context/GameContext.jsx');
const trialBanner = read('src/components/TrialBanner/TrialBanner.jsx');

if (!auth.includes('const [isTrial, setIsTrial] = useState(false)')) fail('AuthContext must own an isTrial state');
else ok('AuthContext owns isTrial state');

if (!auth.includes('const startTrial = () => setIsTrial(true)') || !auth.includes('const endTrial = () => setIsTrial(false)')) {
  fail('AuthContext must expose startTrial/endTrial helpers');
} else ok('AuthContext exposes startTrial/endTrial');

if (!auth.includes('isAuthenticated: !!user')) fail('Trial mode must not make isAuthenticated true');
else ok('isAuthenticated still depends only on a real user object');

const valueBlock = auth.slice(auth.indexOf('const value = {'), auth.indexOf('};', auth.indexOf('const value = {')) + 2);
if (valueBlock.includes('loginAsGuest')) fail('loginAsGuest must not be part of the production context value');
else ok('loginAsGuest is excluded from production context value');

const devHookIndex = auth.indexOf('window.__pcfAuth');
const devGuardIndex = auth.lastIndexOf('import.meta.env.DEV', devHookIndex);
if (devHookIndex === -1 || devGuardIndex === -1 || devHookIndex - devGuardIndex > 220) {
  fail('window.__pcfAuth must stay behind an import.meta.env.DEV guard');
} else ok('window.__pcfAuth is DEV-guarded');

if (!mainMenu.includes('startTrial();') || !mainMenu.includes("dispatch({ type: 'SET_SCREEN', payload: 'team_selection' })")) {
  fail('Unauthenticated Play Now must start trial and navigate to TeamSelection');
} else ok('Play Now starts trial and enters TeamSelection');

if (!mainMenu.includes('!user?.isGuest') || !mainMenu.includes('hasActiveCareer(user.uid)') || !mainMenu.includes('hasActiveGlory(user.uid)')) {
  fail('MainMenu active-save checks must guard Firestore reads for guest/trial users');
} else ok('MainMenu active-save checks have guest/trial guards');

if (!mainMenu.includes("openAuth('rankings')") || !mainMenu.includes("openAuth('edition-mode')")) {
  fail('Login-only features must open contextual Auth intents');
} else ok('Login-only features open contextual Auth intents');

if (!mainMenu.includes('mainMenu.playNow') || !mainMenu.includes('mainMenu.loginCreateAccount')) {
  fail('MainMenu must use trial/no-login i18n keys');
} else ok('MainMenu uses trial/no-login i18n keys');

if (!app.includes('<TrialBanner') || !app.includes("setTrialAuthIntent('save-progress')")) {
  fail('App shell must render TrialBanner and open save-progress Auth intent');
} else ok('App shell renders TrialBanner with save-progress intent');

if (!trialBanner.includes("t('trial.bannerText')") || !trialBanner.includes("t('trial.bannerCta')")) {
  fail('TrialBanner must use localized copy');
} else ok('TrialBanner uses localized copy');

if (!game.includes("import { saveLocalCareer } from '../game/localCareerSave'") || !game.includes('const localResult = saveLocalCareer(state, { uid: userId || null });') || !game.includes('if (!userId) {')) {
  fail('Career saveGame must persist trial/no-login careers locally before any cloud write');
} else ok('Career saveGame persists trial/no-login careers locally');

if (!game.includes('markLocalCareerSynced({ uid: userId })') || !game.includes('markLocalCareerSyncFailed({ uid: userId }, error)') || !game.includes('isLocalCareerPendingSync({ uid })')) {
  fail('Career cloud sync must mark local backups pending/synced and retry only pending UID saves');
} else ok('Career cloud sync tracks pending/synced UID backups');

if (game.includes('navigator.onLine === false')) {
  fail('Career save/sync must not hard-stop on navigator.onLine === false');
} else ok('Career save/sync does not hard-stop on navigator.onLine === false');

if (!game.includes("window.addEventListener('online'") || !game.includes("document.addEventListener('visibilitychange'") || !game.includes('retryPendingCareerSync({ force: true })')) {
  fail('GameContext must retry pending career cloud sync on online/app-init/visibility recovery');
} else ok('GameContext retries pending cloud sync on online/app-init/visibility recovery');

if (!mainMenu.includes('getLocalCareerInfo()') || !mainMenu.includes('const loaded = loadLocalCareer()')) {
  fail('MainMenu must surface and load no-login local career saves');
} else ok('MainMenu surfaces and loads no-login local career saves');

for (const lang of ['es', 'en', 'fr', 'de', 'pt', 'it']) {
  const locale = JSON.parse(read(`src/locales/${lang}.json`));
  for (const key of ['playNow', 'playNowSubtitle', 'loginCreateAccount', 'lockedLoginRequired']) {
    if (!locale.mainMenu?.[key]) fail(`${lang}: missing mainMenu.${key}`);
  }
  if (!locale.trial?.bannerText || !locale.trial?.bannerCta) fail(`${lang}: missing trial banner copy`);
  for (const intent of ['generic', 'save-progress', 'rankings', 'edition-mode', 'cloud-load']) {
    if (!locale.auth?.intent?.[intent]?.title || !locale.auth?.intent?.[intent]?.subtitle) {
      fail(`${lang}: missing auth.intent.${intent}`);
    }
  }
}
ok('Trial i18n keys exist in all supported locales');

if (process.exitCode) process.exit(1);
console.log('🎯 Trial mode source audit passed.');
