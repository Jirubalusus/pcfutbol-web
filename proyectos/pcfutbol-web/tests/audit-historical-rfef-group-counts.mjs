import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';

import { getTeamsInExactLeague, getTeamsInLeague } from '../src/data/leagueRegistry.js';

const root = 'public/historical-db';
const index = JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8'));

const readJsonMaybeGzip = (filePath) => {
  const data = fs.readFileSync(filePath);
  const text = filePath.endsWith('.gz') ? zlib.gunzipSync(data).toString('utf8') : data.toString('utf8');
  return JSON.parse(text);
};

const rfefLeaguePattern = /^(primera|segunda)RfefG\d+$/;
const seasonsChecked = [];
const leagueChecks = [];

for (const season of index.seasons || []) {
  const basePath = path.join(root, season.basePath);
  const manifest = JSON.parse(fs.readFileSync(path.join(basePath, 'manifest.json'), 'utf8'));
  const teams = readJsonMaybeGzip(path.join(basePath, manifest.files?.teams || 'teams.json'));
  const leagues = readJsonMaybeGzip(path.join(basePath, manifest.files?.leagues || 'leagues.json'));
  const rfefLeagues = leagues.filter((league) => rfefLeaguePattern.test(league.id));
  if (!rfefLeagues.length) continue;

  seasonsChecked.push(season.id);

  for (const league of rfefLeagues) {
    const exactCount = getTeamsInExactLeague(teams, league.id).length;
    const directCount = teams.filter((team) => (team.leagueId || team.league || team.competitionId) === league.id).length;
    const canonicalCount = getTeamsInLeague(teams, league.id).length;

    assert.equal(
      exactCount,
      directCount,
      `${season.id} ${league.id} exact helper must match direct leagueId count`
    );
    assert.ok(exactCount > 0, `${season.id} ${league.id} must expose teams`);
    assert.ok(
      canonicalCount >= exactCount,
      `${season.id} ${league.id} canonical helper should be same or broader than exact helper`
    );

    leagueChecks.push({ season: season.id, league: league.id, exactCount, canonicalCount });
  }
}

assert.ok(seasonsChecked.length > 0, 'Expected at least one historical season with RFEF groups');

const season2025 = leagueChecks.filter((row) => row.season === '2025-26');
const expected2025 = {
  primeraRfefG1: 20,
  primeraRfefG2: 20,
  segundaRfefG1: 18,
  segundaRfefG2: 18,
  segundaRfefG3: 18,
  segundaRfefG4: 18,
  segundaRfefG5: 18,
};
assert.deepEqual(
  Object.fromEntries(season2025.map((row) => [row.league, row.exactCount])),
  expected2025
);

console.log(`Historical RFEF exact group counts OK across ${seasonsChecked.length} seasons / ${leagueChecks.length} group leagues.`);
console.log('2025-26 RFEF counts:', expected2025);
console.log('Canonical helpers remain broader where group aliases intentionally collapse for game-state use.');
