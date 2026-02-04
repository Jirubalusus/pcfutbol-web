#!/usr/bin/env node
/**
 * Fix remaining leagues:
 * 1. Fix Saudi team names in JSON (no-hyphen variants)
 * 2. Generate Liga MX and J-League JSONs from JS source
 * 3. Apply team name fixes to all
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dataDir = path.join(__dirname, '..', 'src', 'data');
const outDir = path.join(__dirname, '..', 'public', 'data');

// Additional team name fixes (missed variants)
const EXTRA_FIXES = {
  // Saudi (without hyphens, SFC/FC suffixes)
  'Al Hilal': 'Crescent SC', 'Al-Hilal': 'Crescent SC', 'Al-Hilal SFC': 'Crescent SC',
  'Al Nassr': 'Victory FC', 'Al-Nassr': 'Victory FC', 'Al-Nassr FC': 'Victory FC',
  'Al Ahli': 'National SFC', 'Al-Ahli': 'National SFC', 'Al-Ahli SFC': 'National SFC',
  'Al Ittihad': 'Unity FC', 'Al-Ittihad': 'Unity FC', 'Al-Ittihad Club': 'Unity FC',
  'Al Shabab': 'Youth FC', 'Al-Shabab': 'Youth FC', 'Al-Shabab FC': 'Youth FC',
  'Al Fateh': 'Conquest FC', 'Al-Fateh': 'Conquest FC', 'Al-Fateh SC': 'Conquest FC',
  'Al Raed': 'Pioneer FC', 'Al-Raed': 'Pioneer FC',
  'Al Taawoun': 'Solidarity FC', 'Al-Taawoun': 'Solidarity FC', 'Al-Taawoun FC': 'Solidarity FC',
  'Al Ettifaq': 'Accord FC', 'Al-Ettifaq': 'Accord FC', 'Al-Ettifaq FC': 'Accord FC',
  'Al Feiha': 'Oasis FC', 'Al-Feiha': 'Oasis FC', 'Al-Fayha FC': 'Oasis FC',
  'Al Riyadh': 'Capital SC', 'Al-Riyadh': 'Capital SC', 'Al-Riyadh SC': 'Capital SC',
  'Al Wehda': 'United SC', 'Al-Wehda': 'United SC',
  'Al Khaleej': 'Gulf FC', 'Al-Khaleej': 'Gulf FC', 'Al-Khaleej FC': 'Gulf FC',
  'Al Hazm': 'Resolve FC', 'Al-Hazm': 'Resolve FC', 'Al-Hazem SC': 'Resolve FC',
  'Al Akhdoud': 'Trench FC', 'Al-Akhdoud': 'Trench FC', 'Al-Okhdood Club': 'Trench FC',
  'Al Qadisiyah': 'Legacy FC', 'Al-Qadisiyah': 'Legacy FC', 'Al-Qadsiah FC': 'Legacy FC',
  'Abha Club': 'Highland Club', 'Abha': 'Highland Club',
  'Damac FC': 'Southern FC', 'Damac': 'Southern FC',
  'Al Kholood FC': 'Eternal FC', 'Al-Kholood': 'Eternal FC',
  'NEOM SC': 'Desert SC', 'NEOM': 'Desert SC',
  'Al Najma SC': 'Star SC', 'Al-Najma': 'Star SC',

  // J-League
  'Kashima Antlers': 'Stag FC',
  'Urawa Red Diamonds': 'Crimson Diamonds',
  'FC Tokyo': 'Capital FC',
  'Tokyo Verdy': 'Verdy FC',
  'Kawasaki Frontale': 'Frontale FC',
  'Yokohama F. Marinos': 'Bay Marinos',
  'Shimizu S-Pulse': 'Shimizu Pulse',
  'Nagoya Grampus': 'Nagoya FC',
  'Kyoto Sanga FC': 'Kyoto FC', 'Kyoto Sanga': 'Kyoto FC',
  'Gamba Osaka': 'Osaka Gamba',
  'Cerezo Osaka': 'Osaka Cerezo',
  'Vissel Kobe': 'Hyōgo FC',
  'Sanfrecce Hiroshima': 'Hiroshima Arrows',
  'Avispa Fukuoka': 'Fukuoka FC',
  'Kashiwa Reysol': 'Sol Reysol',
  'FC Machida Zelvia': 'Zelvia FC', 'Machida Zelvia': 'Zelvia FC',
  'Sagan Tosu': 'Tosu FC',
  'Consadole Sapporo': 'Sapporo FC',
  'Albirex Niigata': 'Niigata FC',
  'Jubilo Iwata': 'Iwata FC',
  'Mito HollyHock': 'Holly FC',
  'JEF United Chiba': 'Chiba United',
  'Fagiano Okayama': 'Okayama FC',
  'V-Varen Nagasaki': 'Nagasaki FC',

  // Liga MX extras
  'Club América': 'Águila Dorada FC', 'América': 'Águila Dorada FC',
  'UNAM Pumas': 'Puma Azul FC', 'Pumas UNAM': 'Puma Azul FC', 'Pumas': 'Puma Azul FC',
  'Cruz Azul': 'Cruz Celeste',
  'Guadalajara': 'Tapatío FC', 'CD Guadalajara': 'Tapatío FC', 'Chivas': 'Tapatío FC',
  'Tigres UANL': 'Tigre Regio FC', 'Tigres': 'Tigre Regio FC',
  'CF Monterrey': 'Sierra FC', 'Monterrey': 'Sierra FC',
  'Santos Laguna': 'Laguna Verde FC',
  'Club León': 'Esmeralda FC', 'León': 'Esmeralda FC',
  'Deportivo Toluca': 'Volcán Rojo FC', 'Toluca': 'Volcán Rojo FC',
  'Atlas FC': 'Rojinegro FC', 'Atlas': 'Rojinegro FC',
  'CF Pachuca': 'Minero FC', 'Pachuca': 'Minero FC',
  'Club Necaxa': 'Rayo Eléctrico FC', 'Necaxa': 'Rayo Eléctrico FC',
  'Querétaro FC': 'Gallos FC', 'Querétaro': 'Gallos FC',
  'Club Puebla': 'Camoteros FC', 'Puebla': 'Camoteros FC',
  'Mazatlán FC': 'Puerto FC',
  'FC Juárez': 'Frontera FC', 'Juárez': 'Frontera FC',
  'Club Tijuana': 'Xolos FC', 'Tijuana': 'Xolos FC',
  'San Luis': 'Tuneros FC', 'Atlético de San Luis': 'Tuneros FC',
};

// ============================================================
// 1. Fix Saudi JSON
// ============================================================
console.log('📋 Fixing Saudi team names...');
const saudiPath = path.join(outDir, 'saudiProLeague.json');
if (fs.existsSync(saudiPath)) {
  const saudi = JSON.parse(fs.readFileSync(saudiPath, 'utf-8'));
  let fixes = 0;
  for (const team of saudi) {
    const mapped = EXTRA_FIXES[team.name];
    if (mapped) { team.name = mapped; fixes++; }
  }
  fs.writeFileSync(saudiPath, JSON.stringify(saudi));
  console.log(`  ✅ ${fixes} team names fixed`);
}

// ============================================================
// 2. Export Liga MX and J-League from JS → JSON
// ============================================================
function extractFromJS(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Strip ESM
  let modified = content
    .replace(/export\s+const\s+(\w+)\s*=/g, 'exports.$1 =')
    .replace(/export\s+default\s+/g, 'exports.default = ')
    .replace(/export\s*\{[^}]*\}/g, '')
    .replace(/import\s+.*from\s+['"][^'"]+['"]/g, '');
  
  const sandbox = { exports: {}, module: { exports: {} }, require: () => ({}) };
  try {
    vm.runInNewContext(modified, sandbox);
    return sandbox.exports;
  } catch (e) {
    console.error(`  ❌ Error evaluating ${path.basename(filePath)}:`, e.message);
    return null;
  }
}

function fixTeamNames(teams) {
  let fixes = 0;
  for (const team of teams) {
    const mapped = EXTRA_FIXES[team.name];
    if (mapped) { team.name = mapped; fixes++; }
  }
  return fixes;
}

// Liga MX
console.log('\n📋 Exporting Liga MX...');
const ligamxExports = extractFromJS(path.join(dataDir, 'teams-ligamx.js'));
if (ligamxExports) {
  const teams = ligamxExports.ligaMXTeams || ligamxExports.default || [];
  const fixes = fixTeamNames(teams);
  fs.writeFileSync(path.join(outDir, 'ligamx.json'), JSON.stringify(teams));
  console.log(`  ✅ ${teams.length} teams exported, ${fixes} name fixes`);
}

// J-League
console.log('\n📋 Exporting J-League...');
const jleagueExports = extractFromJS(path.join(dataDir, 'teams-jleague.js'));
if (jleagueExports) {
  const teams = jleagueExports.jLeagueTeams || jleagueExports.default || [];
  const fixes = fixTeamNames(teams);
  fs.writeFileSync(path.join(outDir, 'jleague.json'), JSON.stringify(teams));
  console.log(`  ✅ ${teams.length} teams exported, ${fixes} name fixes`);
}

console.log('\n✅ All done!');
