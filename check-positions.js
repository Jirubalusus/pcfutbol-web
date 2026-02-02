const fs = require('fs');
const files = {
  'MLS': 'teams-mls.js',
  'Saudi': 'teams-saudi.js', 
  'Liga MX': 'teams-ligamx.js',
  'J-League': 'teams-jleague.js'
};

for (const [league, file] of Object.entries(files)) {
  const d = fs.readFileSync('proyectos/pcfutbol-web/src/data/' + file, 'utf8');
  const positions = new Set();
  const re = /position: '([^']+)'/g;
  let m;
  while (m = re.exec(d)) positions.add(m[1]);
  console.log(league + ':', [...positions].sort().join(', '));
}
