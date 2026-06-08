import { readFileSync } from 'node:fs';

const jsx = readFileSync('src/components/MainMenu/MainMenu.jsx', 'utf8');
const scss = readFileSync('src/components/MainMenu/MainMenu.scss', 'utf8');
const es = JSON.parse(readFileSync('src/locales/es.json', 'utf8'));
const en = JSON.parse(readFileSync('src/locales/en.json', 'utf8'));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(jsx.includes('data-main-menu-season-wheel'), 'Season wheel QA hook must remain present');
assert(jsx.includes('data-main-menu-season-apply'), 'Apply season CTA QA hook is missing');
assert(jsx.includes('const [selectedDatabaseId, setSelectedDatabaseId]'), 'Wheel must keep a browsed selected database separate from the active database');
assert(jsx.includes('const applySelectedDatabase = () =>'), 'Apply CTA must use an explicit apply handler');
assert(jsx.includes('setPendingDatabaseId(selectedDatabaseId)'), 'Destructive modal must be opened from the selected season apply path');
assert(jsx.includes('setActiveDatabaseId(selectedDatabaseId)'), 'No-save apply path must commit the selected season');
assert(jsx.includes('const localCareerInfo = getLocalCareerInfo'), 'Apply/save guard must check localStorage live, not only async React state');
assert(jsx.includes('localCareerInfo.hasActive'), 'Apply must treat local career saves as destructive-change blockers');

const wheelBlock = jsx.slice(
  jsx.indexOf('data-main-menu-season-wheel'),
  jsx.indexOf('data-main-menu-mode-carousel')
);

assert(wheelBlock.includes('selectSeasonWheelDatabase(prevDatabaseOption.id)'), 'Previous wheel controls must browse the previous season');
assert(wheelBlock.includes('selectSeasonWheelDatabase(nextDatabaseOption.id)'), 'Next wheel controls must browse the next season');
assert(!wheelBlock.includes('setPendingDatabaseId('), 'Wheel browsing must not open the destructive modal');
assert(!wheelBlock.includes('confirmDatabaseChange'), 'Wheel browsing must not confirm or apply database changes');
assert(scss.includes('.season-wheel__apply'), 'Apply season CTA styles are missing');

for (const [locale, data] of Object.entries({ es, en })) {
  assert(data.mainMenu.applySeason, `${locale} missing mainMenu.applySeason`);
  assert(data.mainMenu.changeDatabaseConfirmWarning, `${locale} missing mainMenu.changeDatabaseConfirmWarning`);
  assert(data.mainMenu.changeSeasonAndDelete, `${locale} missing mainMenu.changeSeasonAndDelete`);
}

console.log(JSON.stringify({
  ok: true,
  checks: [
    'season wheel remains browsable with stable QA hook',
    'wheel controls select seasons without opening the destructive modal',
    'apply CTA is present and is the only source-audited entry to pending database change',
    'ES/EN apply and destructive disclaimer copy exists',
  ],
}, null, 2));
