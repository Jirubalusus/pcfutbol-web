// Audit: active database selector options.
//
// Run: npm run audit:database-options

import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const historicalIndex = JSON.parse(readFileSync('public/historical-db/index.json', 'utf8'));

globalThis.fetch = async (url) => {
  if (String(url) === '/historical-db/index.json') {
    return {
      ok: true,
      json: async () => historicalIndex,
    };
  }

  throw new Error(`Unexpected fetch in database options audit: ${url}`);
};

const {
  CURRENT_DATABASE_ID,
  getDatabaseOptions,
  getDatabaseSeasonStartYear,
} = await import('../src/data/activeDatabaseService.js');

function displaySeason(option) {
  const startYear = getDatabaseSeasonStartYear(option);
  assert(Number.isInteger(startYear), `Option ${option.id} must have a normalized start year`);
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
}

const options = await getDatabaseOptions();
const optionIds = options.map((option) => option.id);
const uniqueIds = new Set(optionIds);

assert(
  uniqueIds.size === optionIds.length,
  `Database option ids must be unique: ${optionIds.join(', ')}`
);

const seasons = options.map(displaySeason);
const duplicateSeason = seasons.find((season, index) => seasons.indexOf(season) !== index);
assert(
  !duplicateSeason,
  `Database selector must not contain duplicate display seasons; duplicated ${duplicateSeason}`
);

const currentOption = options.find((option) => option.id === CURRENT_DATABASE_ID);
assert(currentOption, 'Current database option must be present');
assert(displaySeason(currentOption) === '2025/26', 'Current database option must represent 2025/26');

const optionsFor2025 = options.filter((option) => displaySeason(option) === '2025/26');
assert(optionsFor2025.length === 1, '2025/26 must appear exactly once');
assert(optionsFor2025[0].id === CURRENT_DATABASE_ID, '2025/26 must be represented by the current option');
assert(!optionIds.includes('2025-26'), 'Historical 2025-26 must be hidden from getDatabaseOptions()');
assert(optionIds.includes('2024-25'), 'Historical 2024-25 must remain available');

assert(
  historicalIndex.seasons.some((season) => season.id === '2025-26'),
  'Historical 2025-26 data must remain in the source index'
);

console.log(JSON.stringify({
  ok: true,
  optionCount: options.length,
  firstOptions: options.slice(0, 4).map((option) => ({
    id: option.id,
    season: displaySeason(option),
    type: option.type,
  })),
  checks: [
    'option ids are unique',
    'normalized display seasons are unique',
    '2025/26 appears only as current',
    'historical 2025-26 is hidden from getDatabaseOptions()',
    'historical 2024-25 remains available',
    'historical 2025-26 source data remains present',
  ],
}, null, 2));
