const fs = require('fs');
// Check laliga.json first team in detail
const laliga = JSON.parse(fs.readFileSync(__dirname + '/../public/data/laliga.json', 'utf8'));
const t = laliga[0];
const { players, ...meta } = t;
console.log('=== LaLiga team metadata (Real Madrid) ===');
console.log(JSON.stringify(meta, null, 2));
console.log('Player count:', players.length);
console.log('First player:', JSON.stringify(players[0]));
console.log('Player keys:', Object.keys(players[0]));

console.log('\n=== All LaLiga team names ===');
laliga.forEach((t,i) => console.log(`${i}: ${t.name} (id: ${t.id})`));

// Check premier.json
const premier = JSON.parse(fs.readFileSync(__dirname + '/../public/data/premier.json', 'utf8'));
console.log('\n=== Premier team metadata ===');
const p = premier[0];
const { players: pp, ...pmeta } = p;
console.log(JSON.stringify(pmeta, null, 2));
console.log('Player count:', pp.length);
console.log('First player:', JSON.stringify(pp[0]));

// Check what other JSON files exist in public/data/
const dataFiles = fs.readdirSync(__dirname + '/../public/data/').filter(f => f.endsWith('.json'));
console.log('\n=== Files in public/data/ ===');
dataFiles.forEach(f => {
  const d = JSON.parse(fs.readFileSync(__dirname + '/../public/data/' + f, 'utf8'));
  const count = Array.isArray(d) ? d.length : 'not array';
  console.log(`${f}: ${count} items`);
});
