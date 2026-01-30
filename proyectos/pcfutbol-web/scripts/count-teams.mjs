import fs from 'fs';
const c1 = fs.readFileSync('src/data/teams-primera-rfef.js', 'utf8');
const c2 = fs.readFileSync('src/data/teams-segunda-rfef.js', 'utf8');

function countTeamsPerGroup(content, prefix) {
  const lines = content.split('\n');
  const groups = {};
  let cur = '';
  for (const l of lines) {
    const m = l.match(new RegExp(`export const (${prefix}\\d)`));
    if (m) { cur = m[1]; groups[cur] = 0; }
    if (cur && l.includes('"id"')) groups[cur]++;
  }
  return groups;
}

console.log('Primera RFEF:', countTeamsPerGroup(c1, 'primeraRFEFGrupo'));
console.log('Segunda RFEF:', countTeamsPerGroup(c2, 'segundaRFEFGrupo'));
