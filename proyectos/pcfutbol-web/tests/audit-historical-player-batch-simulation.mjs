import { createServer } from 'vite';
import fs from 'node:fs';

const season = process.argv.find(a => a.startsWith('--season='))?.split('=')[1] || '2006-07';
const teamName = process.argv.find(a => a.startsWith('--team='))?.split('=')[1] || 'Recreativo de Huelva';
const weeks = Number(process.argv.find(a => a.startsWith('--weeks='))?.split('=')[1] || 27);

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
Math.random = mulberry32(20260516);

const vite = await createServer({ logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
const { initializeLeague, simulateMatch, updateTable, simulateWeekMatches } = await vite.ssrLoadModule('/src/game/leagueEngine.js');

const teamsPath = new URL(`../public/historical-db/seasons/${season}/teams.json`, import.meta.url);
const teams = JSON.parse(fs.readFileSync(teamsPath, 'utf8'));
const playerTeam = teams.find(t => t.name === teamName);
if (!playerTeam) throw new Error(`Team not found: ${teamName} in ${season}`);
const leagueTeams = teams.filter(t => t.leagueId === playerTeam.leagueId);
if (leagueTeams.length < 2) throw new Error(`Not enough league teams for ${playerTeam.leagueId}`);

const { table, fixtures } = initializeLeague(leagueTeams, playerTeam.id);
let currentTable = table;
let currentFixtures = fixtures;

const byId = new Map();
const addTeam = t => { if (t?.id) byId.set(t.id, { ...(byId.get(t.id) || {}), ...t }); };
leagueTeams.forEach(addTeam);
addTeam(playerTeam);
currentTable.forEach(entry => {
  if (!byId.has(entry.teamId)) {
    addTeam({ id: entry.teamId, name: entry.teamName || entry.teamId, shortName: entry.shortName || entry.teamName || entry.teamId, reputation: entry.reputation || 50, players: [] });
  }
});
const allTeams = Array.from(byId.values());

let playerMatchesSimulated = 0;
let skippedPlayerMatches = [];
for (let week = 1; week <= weeks; week++) {
  const weekFixtures = currentFixtures.filter(f => f.week === week && !f.played);
  const playerMatch = weekFixtures.find(f => f.homeTeam === playerTeam.id || f.awayTeam === playerTeam.id);
  if (playerMatch) {
    const isHome = playerMatch.homeTeam === playerTeam.id;
    const opponentId = isHome ? playerMatch.awayTeam : playerMatch.homeTeam;
    const opponent = allTeams.find(t => t.id === opponentId);
    if (!opponent) {
      skippedPlayerMatches.push({ week, opponentId });
    } else {
      const result = simulateMatch(
        playerMatch.homeTeam,
        playerMatch.awayTeam,
        isHome ? playerTeam : opponent,
        isHome ? opponent : playerTeam,
        { homeTactic: 'balanced', awayTactic: 'balanced', homeMorale: 70, awayMorale: 70 },
        {},
        playerTeam.id
      );
      currentFixtures = currentFixtures.map(f => f.id === playerMatch.id ? { ...f, played: true, homeScore: result.homeScore, awayScore: result.awayScore, events: result.events } : f);
      currentTable = updateTable(currentTable, playerMatch.homeTeam, playerMatch.awayTeam, result.homeScore, result.awayScore);
      playerMatchesSimulated++;
    }
  }
  const other = simulateWeekMatches(currentFixtures, currentTable, week, playerTeam.id, allTeams);
  currentFixtures = other.fixtures;
  currentTable = other.table;
}

const playerRow = currentTable.find(t => t.teamId === playerTeam.id);
const playedFixtures = currentFixtures.filter(f => f.played && (f.homeTeam === playerTeam.id || f.awayTeam === playerTeam.id)).length;
const unplayedDueWeeks = currentFixtures.filter(f => f.week <= weeks && !f.played && (f.homeTeam === playerTeam.id || f.awayTeam === playerTeam.id));

await vite.close();

console.log(JSON.stringify({
  season,
  team: playerTeam.name,
  teamId: playerTeam.id,
  leagueId: playerTeam.leagueId,
  leagueTeams: leagueTeams.length,
  weeks,
  playerMatchesSimulated,
  playerRowPlayed: playerRow?.played,
  playedFixtures,
  skippedPlayerMatches,
  unplayedPlayerFixturesThroughWeeks: unplayedDueWeeks.map(f => ({ week: f.week, homeTeam: f.homeTeam, awayTeam: f.awayTeam }))
}, null, 2));

if (!playerRow || playerRow.played <= 0 || skippedPlayerMatches.length || unplayedDueWeeks.length) {
  process.exit(1);
}
