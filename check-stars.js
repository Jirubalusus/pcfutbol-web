const fs = require('fs');
const check = [
  ['teams-mls.js', ['Messi','Suárez','De Paul','Riqui Puig','Chicharito','Insigne']],
  ['teams-saudi.js', ['Ronaldo','Benzema','Kanté','Firmino','Mané']],
  ['teams-ligamx.js', ['Gignac','Guardado']],
  ['teams-jleague.js', ['Iniesta','Oscar']]
];
for (const [file, names] of check) {
  console.log('\n' + file.replace('teams-','').replace('.js','').toUpperCase());
  const d = fs.readFileSync('proyectos/pcfutbol-web/src/data/'+file,'utf8');
  for (const n of names) {
    const re = new RegExp("name: '([^']*" + n + "[^']*)'.+?overall: (\\d+).+?value: (\\d+)");
    const m = d.match(re);
    if (m) console.log('  ' + n.padEnd(15) + ' OVR:' + m[2] + ' Val:€' + (+m[3]/1000000).toFixed(1) + 'M (' + m[1] + ')');
    else console.log('  ' + n.padEnd(15) + ' NOT FOUND');
  }
}
