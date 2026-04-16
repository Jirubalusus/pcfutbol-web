import fs from 'fs';
import path from 'path';

const leagueKeys = process.argv.slice(2);
if (!leagueKeys.length) { console.error('Usage: node _dryrun-id-match.mjs <leagueKey> ...'); process.exit(1); }

const root = process.cwd();
const allTeams = JSON.parse(fs.readFileSync(path.resolve(root, 'public', 'data', 'all-teams.json'), 'utf8'));

const STOPWORDS = new Set([
  'fc','sc','cf','cd','sfc','de','del','la','el','los','las','club','clube','futebol',
  'futbol','soccer','football','calcio','sports','sporting','sport','team','city','town',
  'union','united','do','da','und','sv','sk','ssc','as','ac','associacao',
  'real','royal','athletic','atletico','deportivo','american','american','cfc','sa',
  'al' // arabic article — too common across Saudi clubs
]);

function normalize(s) {
  return (s || '').toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
function tokens(s) { return normalize(s).split(' ').filter((t) => t && !STOPWORDS.has(t)); }
function score(fakeId, fakeName, scrapedTeam) {
  const a = new Set([...tokens(fakeId), ...tokens(fakeName)]);
  const b = new Set([...tokens(scrapedTeam.slug), ...tokens(scrapedTeam.name)]);
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / Math.max(a.size, b.size);
}

for (const leagueKey of leagueKeys) {
  console.log(`\n=== ${leagueKey} ===`);
  const fakeTeams = [...(allTeams[leagueKey] || [])];
  const scraped = JSON.parse(fs.readFileSync(path.resolve(root, 'scraped-data', '2025-26', `${leagueKey}.json`), 'utf8'));
  const used = new Set();
  let ok = 0, low = 0;
  for (const f of fakeTeams) {
    let best = null;
    for (const t of scraped) {
      if (used.has(t.transfermarktId)) continue;
      const s = score(f.id, f.name, t);
      if (!best || s > best.score) best = { team: t, score: s };
    }
    if (!best) { console.log(`  - ${f.id} : NO CANDIDATE`); continue; }
    const tag = best.score >= 0.2 ? 'OK' : 'LOW';
    if (best.score >= 0.2) { used.add(best.team.transfermarktId); ok++; } else low++;
    console.log(`  ${tag} ${f.id.padEnd(35)} -> ${best.team.name.padEnd(30)} [tm-${best.team.transfermarktId}] (${best.score.toFixed(2)})`);
  }
  console.log(`  total=${fakeTeams.length} matched=${ok} low=${low}`);
}
