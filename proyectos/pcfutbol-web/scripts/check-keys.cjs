const en = require('../src/locales/en.json');
const es = require('../src/locales/es.json');

// Check transfers keys
const keys = ['year', 'years', 'expiresSem', 'perYear', 'minEstimated'];
console.log('=== transfers keys in en.json ===');
keys.forEach(k => console.log(`  ${k}: ${JSON.stringify(en.transfers?.[k])}`));
console.log('=== transfers keys in es.json ===');
keys.forEach(k => console.log(`  ${k}: ${JSON.stringify(es.transfers?.[k])}`));

// Check match result keys
console.log('\n=== Match/result keys ===');
const checkKeys = [
  'match.finalResult', 'matchDay.finalResult', 'matchResult.finalResult',
  'match.result', 'results.finalResult', 'finalResult'
];

function getNestedKey(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

checkKeys.forEach(k => {
  const enVal = getNestedKey(en, k);
  const esVal = getNestedKey(es, k);
  if (enVal !== undefined || esVal !== undefined) {
    console.log(`  ${k}: en=${JSON.stringify(enVal)} es=${JSON.stringify(esVal)}`);
  }
});

// Find FINAL RESULT
console.log('\n=== Searching for "FINAL RESULT" or "finalResult" ===');
function searchObj(obj, prefix = '') {
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'string' && (val.includes('FINAL RESULT') || val.includes('Final Result') || key === 'finalResult')) {
      console.log(`  ${path}: ${JSON.stringify(val)}`);
    } else if (typeof val === 'object' && val !== null) {
      searchObj(val, path);
    }
  }
}
searchObj(en);

// Check for "OFFER" translation
console.log('\n=== Searching for "Offer" related keys in es ===');
function searchObjES(obj, prefix = '') {
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'string' && (key.toLowerCase().includes('offer') || (val === 'OFFER') || (val === 'Offer'))) {
      console.log(`  ${path}: ${JSON.stringify(val)}`);
    } else if (typeof val === 'object' && val !== null) {
      searchObjES(val, path);
    }
  }
}
searchObjES(en);
