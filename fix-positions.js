const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'proyectos', 'pcfutbol-web', 'src', 'data');

// English → Spanish position mapping
const EN_TO_ES = {
  'GK': 'POR',
  'CB': 'DFC',
  'LB': 'LTI',
  'RB': 'LTD',
  'LWB': 'LTI',
  'RWB': 'LTD',
  'CDM': 'MCD',
  'CM': 'MC',
  'CAM': 'MCO',
  'LM': 'MI',
  'RM': 'MD',
  'LW': 'EI',
  'RW': 'ED',
  'CF': 'MP',
  'ST': 'DC',
  // Old Spanish variants
  'LD': 'LTD',
  'LI': 'LTI',
};

const files = fs.readdirSync(DIR).filter(f => f.startsWith('teams-') && f.endsWith('.js'));

let totalFixes = 0;

for (const file of files) {
  const filePath = path.join(DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let fixes = 0;

  // Fix createPlayer format: createPlayer('Name', 'POS', ...)
  for (const [en, es] of Object.entries(EN_TO_ES)) {
    const re = new RegExp(`(createPlayer\\([^,]+,\\s*)'${en}'`, 'g');
    const matches = content.match(re);
    if (matches) {
      fixes += matches.length;
      content = content.replace(re, `$1'${es}'`);
    }
  }

  // Fix object format: position: 'POS'
  for (const [en, es] of Object.entries(EN_TO_ES)) {
    const re = new RegExp(`(position:\\s*)'${en}'`, 'g');
    const matches = content.match(re);
    if (matches) {
      fixes += matches.length;
      content = content.replace(re, `$1'${es}'`);
    }
  }

  if (fixes > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${file}: ${fixes} posiciones corregidas`);
    totalFixes += fixes;
  }
}

console.log(`\nTotal: ${totalFixes} posiciones corregidas en ${files.length} archivos`);

// Verify
console.log('\n--- Verificación ---');
for (const file of files) {
  const d = fs.readFileSync(path.join(DIR, file), 'utf8');
  const pos = new Set();
  let m;
  const re1 = /position:\s*'([^']+)'/g;
  while (m = re1.exec(d)) pos.add(m[1]);
  const re2 = /createPlayer\([^,]+,\s*'([^']+)'/g;
  while (m = re2.exec(d)) pos.add(m[1]);
  const arr = [...pos].sort();
  const hasEnglish = arr.some(p => Object.keys(EN_TO_ES).includes(p));
  if (hasEnglish) {
    console.log(`❌ ${file}: aún tiene posiciones inglesas: ${arr.filter(p => Object.keys(EN_TO_ES).includes(p)).join(', ')}`);
  } else if (arr.length > 0) {
    console.log(`✅ ${file}: ${arr.join(', ')}`);
  }
}
