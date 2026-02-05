// Find all keys in es.json that are MISSING from en.json (these cause fallback to Spanish)
const es = require('../src/locales/es.json');
const en = require('../src/locales/en.json');

let missing = [];
function compare(esObj, enObj, prefix = '') {
  for (const [key, val] of Object.entries(esObj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      if (!enObj?.[key] || typeof enObj[key] !== 'object') {
        missing.push({ path, type: 'section' });
      } else {
        compare(val, enObj[key], path);
      }
    } else if (typeof val === 'string') {
      if (enObj?.[key] === undefined) {
        missing.push({ path, esVal: val });
      }
    }
  }
}
compare(es, en);

console.log(`Keys in es.json missing from en.json: ${missing.length}`);
missing.forEach(m => {
  if (m.type === 'section') {
    console.log(`  SECTION: ${m.path}`);
  } else {
    console.log(`  ${m.path}: "${m.esVal}"`);
  }
});
