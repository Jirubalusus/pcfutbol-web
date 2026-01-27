const d = require('./football-data.json');
const t = d.teams['648']; // CD Tenerife
console.log('Team:', JSON.stringify(t, null, 2));

const p = d.players[t.playerIds[0]];
console.log('\nFirst player:', JSON.stringify(p, null, 2));
