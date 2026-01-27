const d = require('./football-data.json');
console.log('Equipos:', Object.keys(d.teams).length);
console.log('Jugadores:', Object.keys(d.players).length);
console.log('Ligas:', Object.keys(d.leagues).join(', '));
Object.entries(d.leagues).forEach(([id, l]) => {
  console.log(`  ${l.name}:`, Object.keys(l.groups).length, 'grupos');
});
