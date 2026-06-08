// ============================================================
// AUDIT — Historical initial Champions (Continental Champions Cup) field
// ============================================================
// Verifies that, for every season shipped in the historical database, the
// real Champions League entrants of that year are used to seed the initial
// Continental Champions Cup — instead of the reputation/position proxy that
// qualifyTeamsForEurope produces.
//
// Checks, per index season:
//   • a real source participant list exists (participantsBySeason),
//   • buildHistoricalChampionsLeagueTeams produces exactly 32 UNIQUE teams,
//   • dataset clubs reuse their real `tm-team-*` ids (not stubs / placeholders),
//   • no club is named "Placeholder" / "TBD".
//
// Plus targeted era samples that pin the behaviour to real history:
//   • 2004-05: Porto, Real Madrid, Valencia, Barcelona, Man United,
//              Deportivo, Liverpool present; Man City absent.
//   • 2009-10: Barcelona, Inter, Real Madrid, Sevilla, Atlético, Rubin,
//              APOEL, Debrecen present; Man City absent.
//   • 2016-17: Leicester, Legia, Ludogorets, Rostov present.
//   • 2024-25: source carries 36 real entrants, builder returns 32.
//
// Run:  npm run audit:historical-initial-champions
// ============================================================

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  participantsBySeason,
  getHistoricalChampionsParticipantNames,
  buildHistoricalChampionsLeagueTeams,
} from '../src/data/historicalChampionsParticipants.js';

const repoRoot = process.cwd();
const dbRoot = path.join(repoRoot, 'public/historical-db');
const seasonsRoot = path.join(dbRoot, 'seasons');

const ENGINE_TEAMS = 32;

let failures = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${name}\n      ${err.message}`);
  }
};

function loadIndexSeasonIds() {
  const index = JSON.parse(fs.readFileSync(path.join(dbRoot, 'index.json'), 'utf8'));
  return (index.seasons || []).map((s) => s.id);
}

// Load that season's teams as the runtime does (real `tm-team-*` ids + names).
function loadSeasonTeams(seasonId) {
  const file = path.join(seasonsRoot, seasonId, 'teams.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Find a built team for a real-club source name. The builder stamps the exact
// source spelling it resolved on `historicalChampionsSourceName`, so match on
// that (authoritative) rather than re-implementing fuzzy name matching here.
function findBySource(built, clubName) {
  return built.find((t) => t.historicalChampionsSourceName === clubName);
}
function buildContains(built, clubName) {
  return Boolean(findBySource(built, clubName));
}

console.log('AUDIT: historical initial Champions field\n');

const seasonIds = loadIndexSeasonIds();
assert.ok(seasonIds.length > 0, 'historical index has no seasons');

// ── 1. Every index season: real source list + 32 unique builder output ───────
console.log('Per-season coverage:');
for (const seasonId of seasonIds) {
  check(`${seasonId} — source participant list exists`, () => {
    const names = getHistoricalChampionsParticipantNames(seasonId);
    assert.ok(Array.isArray(names) && names.length >= ENGINE_TEAMS,
      `expected >= ${ENGINE_TEAMS} real participants, got ${names.length}`);
    assert.ok(participantsBySeason[seasonId] === names || participantsBySeason[seasonId],
      'participantsBySeason missing this season');
  });

  check(`${seasonId} — builder yields ${ENGINE_TEAMS} unique teams`, () => {
    const teams = loadSeasonTeams(seasonId);
    const built = buildHistoricalChampionsLeagueTeams(seasonId, teams, { teamsCount: ENGINE_TEAMS });
    assert.equal(built.length, ENGINE_TEAMS, `built ${built.length} teams`);

    const ids = built.map((t) => t.teamId || t.id);
    assert.ok(ids.every(Boolean), 'every built team has an id');
    assert.equal(new Set(ids).size, ENGINE_TEAMS, 'built ids are not all unique');

    // Never a placeholder / current-era filler; stubs must be flagged + named.
    for (const t of built) {
      const nm = String(t.name || t.teamName || '');
      assert.ok(nm.trim().length > 0, 'built team has empty name');
      assert.ok(!/placeholder|^tbd$/i.test(nm), `placeholder-like name: "${nm}"`);
      if (t.historicalChampionsStub) {
        assert.ok(String(t.teamId).startsWith(`historical-ucl-${seasonId}-`),
          `stub id not stable: ${t.teamId}`);
        assert.equal(t.players.length, 0, 'stub must have empty players');
        assert.equal(t.league, 'historicalChampions', 'stub league tag wrong');
      } else {
        // Dataset clubs keep their real transfermarkt id.
        assert.ok(String(t.teamId).startsWith('tm-team-'),
          `present club should reuse tm-team-* id, got ${t.teamId}`);
      }
    }
  });
}

// ── 2. Era samples ───────────────────────────────────────────────────────────
function sample(seasonId, { present = [], absent = [] }) {
  const teams = loadSeasonTeams(seasonId);
  const built = buildHistoricalChampionsLeagueTeams(seasonId, teams, { teamsCount: ENGINE_TEAMS });
  for (const club of present) {
    check(`${seasonId} — contains ${club}`, () => {
      assert.ok(buildContains(built, club), `${club} missing from field`);
    });
  }
  for (const club of absent) {
    check(`${seasonId} — excludes ${club}`, () => {
      assert.ok(!buildContains(built, club), `${club} should NOT be in field`);
    });
  }
  return built;
}

console.log('\nEra samples:');
sample('2004-05', {
  present: ['Porto', 'Real Madrid', 'Valencia', 'Barcelona', 'Manchester United', 'Deportivo La Coruña', 'Liverpool'],
  absent: ['Manchester City'],
});
sample('2009-10', {
  present: ['Barcelona', 'Inter Milan', 'Real Madrid', 'Sevilla', 'Atlético Madrid', 'Rubin Kazan', 'APOEL', 'Debrecen'],
  absent: ['Manchester City'],
});
sample('2016-17', {
  present: ['Leicester City', 'Legia Warsaw', 'Ludogorets Razgrad', 'Rostov'],
});

// ── 3. 2024-25: 36 real entrants in source, engine returns 32 ────────────────
console.log('\n36→32 engine sizing:');
check('2024-25 — source carries 36 real entrants', () => {
  const names = getHistoricalChampionsParticipantNames('2024-25');
  assert.equal(names.length, 36, `expected 36 source entrants, got ${names.length}`);
});
check('2024-25 — builder slices to 32', () => {
  const teams = loadSeasonTeams('2024-25');
  const built = buildHistoricalChampionsLeagueTeams('2024-25', teams, { teamsCount: ENGINE_TEAMS });
  assert.equal(built.length, ENGINE_TEAMS, `built ${built.length}`);
});

// ── 4. Headline clubs reuse real ids across seasons ──────────────────────────
console.log('\nReal-id reuse for headline clubs:');
const headline = {
  '2009-10': ['Barcelona', 'Real Madrid', 'Bayern Munich', 'Inter Milan'],
  '2016-17': ['Real Madrid', 'Barcelona', 'Bayern Munich'],
  '2024-25': ['Barcelona', 'Real Madrid', 'Bayern Munich', 'Inter Milan'],
};
for (const [seasonId, clubs] of Object.entries(headline)) {
  const teams = loadSeasonTeams(seasonId);
  const built = buildHistoricalChampionsLeagueTeams(seasonId, teams, { teamsCount: ENGINE_TEAMS });
  for (const club of clubs) {
    check(`${seasonId} — ${club} uses tm-team-* id`, () => {
      const hit = findBySource(built, club);
      assert.ok(hit, `${club} not found in field`);
      assert.ok(!hit.historicalChampionsStub, `${club} resolved to a stub`);
      assert.ok(String(hit.teamId).startsWith('tm-team-'),
        `${club} id is ${hit.teamId}, expected tm-team-*`);
    });
  }
}

console.log('');
if (failures > 0) {
  console.error(`AUDIT FAILED — ${failures} check(s) failed.`);
  process.exit(1);
}
console.log('AUDIT PASSED — all historical initial Champions checks green.');
