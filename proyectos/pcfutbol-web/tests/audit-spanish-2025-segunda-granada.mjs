import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getTeamLeagueId, normalizeLeagueId } from '../src/data/leagueRegistry.js';
import { toGameLeagueId } from '../src/data/activeSeasonUniverse.js';
import { getLeagueZones, LEAGUE_CONFIG } from '../src/game/multiLeagueEngine.js';
import { LEAGUE_MATCHDAYS } from '../src/game/seasonManager.js';

const readJson = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

const scrapedLaliga = readJson('scraped-data/2025-26/laliga.json');
const scrapedLaliga2 = readJson('scraped-data/2025-26/laliga2.json');
const currentBundle = readJson('public/data/all-teams.json');

const granada = scrapedLaliga2.find((team) => team.name === 'Granada CF');
assert.ok(granada, 'Granada CF must exist in the 2025/26 second-tier source data');
assert.equal(getTeamLeagueId(granada), 'segunda', 'Granada CF source league laliga2 must map to game league segunda');
assert.equal(toGameLeagueId(granada.league), 'segunda', 'Historical/source laliga2 must become game league segunda');
assert.equal(normalizeLeagueId('laliga2'), 'segunda', 'laliga2 must be accepted as an alias for segunda');
assert.equal(normalizeLeagueId('segunda'), 'segunda', 'segunda must remain the canonical game-state id');

assert.equal(
  scrapedLaliga.some((team) => team.name === 'Granada CF'),
  false,
  'Granada CF must not be part of the 2025/26 first-tier source data'
);

assert.equal(currentBundle.laliga.length, 20, 'Liga Iberica current bundle must keep 20 first-tier teams');
assert.equal(currentBundle.laliga2.length, 20, 'Segunda Iberica current bundle must provide 20 selectable teams');
assert.equal(
  currentBundle.laliga2.every((team) => getTeamLeagueId(team) === 'segunda'),
  true,
  'Current Segunda bundle teams must resolve to game league segunda'
);

assert.deepEqual(LEAGUE_CONFIG.segunda.zones.promotion, [1, 2], 'Segunda must render direct promotion spots');
assert.deepEqual(LEAGUE_CONFIG.segunda.zones.playoff, [3, 4, 5, 6], 'Segunda must render promotion playoff spots');
assert.deepEqual(LEAGUE_CONFIG.segunda.zones.relegation, [18, 19, 20], '20-team Segunda must render relegation spots');
assert.equal(LEAGUE_CONFIG.segunda.teams, 20, 'Segunda engine config must match the simplified 20-team current data');

assert.deepEqual(getLeagueZones('segunda').promotion, [1, 2], 'Domestic engine zones must expose Segunda direct promotion');
assert.deepEqual(getLeagueZones('segunda').playoff, [3, 4, 5, 6], 'Domestic engine zones must expose Segunda playoff');
assert.deepEqual(getLeagueZones('segunda').relegation, [18, 19, 20], 'Domestic engine zones must expose 20-team Segunda relegation');
assert.equal(LEAGUE_MATCHDAYS.segunda, 38, '20-team Segunda must use 38 league matchdays');

console.log('Spanish 2025 Segunda/Granada audit passed');
