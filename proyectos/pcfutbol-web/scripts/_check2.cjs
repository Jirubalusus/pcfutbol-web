const fs = require('fs');
// Check laliga.json structure
const laliga = JSON.parse(fs.readFileSync(__dirname + '/../public/data/laliga.json', 'utf8'));
console.log('=== LALIGA ===');
console.log('Type:', typeof laliga, Array.isArray(laliga) ? 'array' : 'obj');
if (laliga.teams) {
  console.log('Has .teams, count:', laliga.teams.length);
  console.log('First team keys:', Object.keys(laliga.teams[0]));
  console.log('First team name:', laliga.teams[0].name);
  console.log('First team players count:', laliga.teams[0].players?.length);
  if (laliga.teams[0].players?.[0]) console.log('First player:', laliga.teams[0].players[0]);
  // Show team metadata keys
  const t = laliga.teams[0];
  const meta = {};
  for (const k of Object.keys(t)) {
    if (k !== 'players') meta[k] = typeof t[k] === 'string' ? t[k].substring(0,50) : t[k];
  }
  console.log('Team metadata:', JSON.stringify(meta, null, 2));
} else if (Array.isArray(laliga)) {
  console.log('Is array, length:', laliga.length);
  console.log('First item keys:', Object.keys(laliga[0]));
}
// Check league-level metadata
const topKeys = Object.keys(laliga).filter(k => k !== 'teams');
console.log('Top-level keys (non-teams):', topKeys);
for (const k of topKeys) {
  console.log(`  ${k}:`, typeof laliga[k] === 'object' ? JSON.stringify(laliga[k]).substring(0, 100) : laliga[k]);
}

console.log('\n=== PREMIER ===');
const premier = JSON.parse(fs.readFileSync(__dirname + '/../public/data/premier.json', 'utf8'));
console.log('Type:', typeof premier, Array.isArray(premier) ? 'array' : 'obj');
if (premier.teams) {
  console.log('Has .teams, count:', premier.teams.length);
  console.log('First team keys:', Object.keys(premier.teams[0]));
  console.log('First team name:', premier.teams[0].name);
  if (premier.teams[0].players?.[0]) console.log('First player:', premier.teams[0].players[0]);
}
const topKeys2 = Object.keys(premier).filter(k => k !== 'teams');
console.log('Top-level keys (non-teams):', topKeys2);

// Check sofifa-data-full for league 53
console.log('\n=== SOFIFA 53 (LaLiga) ===');
const sofifa = JSON.parse(fs.readFileSync(__dirname + '/sofifa-data-full.json', 'utf8'));
const lg53 = sofifa['53'];
console.log('Count:', lg53.length);
console.log('First player:', lg53[0]);
// List unique teams
const teams53 = [...new Set(lg53.map(p => p.team))];
console.log('Teams:', teams53.length, teams53.sort());
