import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Configstore = require(path.join('C:/Users/Pablo/AppData/Roaming/npm/node_modules', 'firebase-tools', 'node_modules', 'configstore'));
const config = new Configstore('firebase-tools');
const token = config.get('tokens.access_token');

const leagueKey = process.argv[2];
const ids = process.argv.slice(3);
if (!leagueKey || !ids.length) { console.error('Usage: node _verify-remote.mjs <leagueKey> <id1> <id2> ...'); process.exit(1); }

console.log(`Verifying ${ids.length} team_assets for ${leagueKey}...`);
let okCount = 0;
for (const id of ids) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/pcfutbol-web/databases/(default)/documents/editions/real_names_2025_26/team_assets/${id}`, { headers: { Authorization: 'Bearer ' + token } });
  const j = await r.json();
  if (j.fields) {
    okCount++;
    console.log('OK', id.padEnd(35), '->', j.fields.teamName?.stringValue);
  } else {
    console.log('MISSING', id, JSON.stringify(j).slice(0, 150));
  }
}

const ed = await fetch(`https://firestore.googleapis.com/v1/projects/pcfutbol-web/databases/(default)/documents/editions/real_names_2025_26`, { headers: { Authorization: 'Bearer ' + token } });
const edJson = await ed.json();
const teamsField = edJson.fields?.teams?.mapValue?.fields || {};
let nameMatched = 0;
for (const id of ids) {
  if (teamsField[id]?.mapValue?.fields?.name?.stringValue) nameMatched++;
}
console.log(`assets ok: ${okCount}/${ids.length} | edition.teams names ok: ${nameMatched}/${ids.length}`);
