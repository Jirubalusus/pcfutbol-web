const en = require('../src/locales/en.json');
const es = require('../src/locales/es.json');

// Check matchday keys
console.log('=== matchday section (es) ===');
if (es.matchday) {
  for (const [k, v] of Object.entries(es.matchday)) {
    if (k === 'finalResult') console.log(`  matchday.${k}: ${JSON.stringify(v)}`);
  }
}
console.log(`  matchday.finalResult en: ${JSON.stringify(en.matchday?.finalResult)}`);
console.log(`  matchday.finalResult es: ${JSON.stringify(es.matchday?.finalResult)}`);

// Check transfers Spanish translations
console.log('\n=== Key transfers keys (es) ===');
const checkKeys = [
  'prepareOffer', 'transferToClub', 'clubAccepts', 'annualSalary',
  'minEstimated', 'contractDuration', 'playerAccepts', 'sendOffer',
  'offerSentTitle', 'offerSentContent', 'counterOfferRejected',
  'offerRejected'
];
checkKeys.forEach(k => {
  console.log(`  transfers.${k}: en=${JSON.stringify(en.transfers?.[k])} | es=${JSON.stringify(es.transfers?.[k])}`);
});

// Check notifications
console.log('\n=== notifications (es) ===');
const notifKeys = ['offer', 'transferOffer', 'counterRejected', 'counterOfferRejected'];
notifKeys.forEach(k => {
  console.log(`  notifications.${k}: en=${JSON.stringify(en.notifications?.[k])} | es=${JSON.stringify(es.notifications?.[k])}`);
});

// Find ALL keys in en.json that DON'T exist in es.json
console.log('\n=== Keys missing in es.json ===');
let missing = 0;
function compareKeys(enObj, esObj, prefix = '') {
  for (const [key, val] of Object.entries(enObj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      if (!esObj?.[key] || typeof esObj[key] !== 'object') {
        console.log(`  SECTION MISSING: ${path}`);
        missing++;
      } else {
        compareKeys(val, esObj[key], path);
      }
    } else if (typeof val === 'string') {
      if (esObj?.[key] === undefined) {
        console.log(`  MISSING: ${path}`);
        missing++;
      }
    }
  }
}
compareKeys(en, es);
console.log(`\nTotal missing keys: ${missing}`);
