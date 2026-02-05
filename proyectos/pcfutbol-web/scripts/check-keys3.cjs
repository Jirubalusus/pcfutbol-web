const en = require('../src/locales/en.json');
const es = require('../src/locales/es.json');

const keys = ['sem', 'weekLabel', 'expiresSem', 'expiresWeek', 'year', 'years', 'perYear'];
keys.forEach(k => {
  console.log(`transfers.${k}: en=${JSON.stringify(en.transfers?.[k])} | es=${JSON.stringify(es.transfers?.[k])}`);
});

// Also check matchday Spanish texts
console.log('\n=== matchday keys ===');
const mdKeys = ['friendly', 'finalResult', 'possession', 'shots', 'shotsOnTarget', 'corners', 'fouls', 'yellowCards', 'redCards', 'chronology', 'statistics', 'continue'];
mdKeys.forEach(k => {
  console.log(`matchday.${k}: en=${JSON.stringify(en.matchday?.[k])} | es=${JSON.stringify(es.matchday?.[k])}`);
});

// Check notifications for OFFER
console.log('\n=== notifications keys ===');
const nKeys = Object.keys(en.notifications || {});
console.log('All notification keys in en:', nKeys.join(', '));
console.log('\nnotifications.offer: en=' + JSON.stringify(en.notifications?.offer) + ' | es=' + JSON.stringify(es.notifications?.offer));
console.log('notifications.transferOffer: en=' + JSON.stringify(en.notifications?.transferOffer) + ' | es=' + JSON.stringify(es.notifications?.transferOffer));
console.log('notifications.counterOfferRejected: en=' + JSON.stringify(en.notifications?.counterOfferRejected) + ' | es=' + JSON.stringify(es.notifications?.counterOfferRejected));

// Check what counterOffer notifications exist
console.log('\n=== search "counter" in notifications ===');
for (const [k, v] of Object.entries(en.notifications || {})) {
  if (k.toLowerCase().includes('counter') || (typeof v === 'string' && v.toLowerCase().includes('counter'))) {
    console.log(`  notifications.${k}: en=${JSON.stringify(v)} | es=${JSON.stringify(es.notifications?.[k])}`);
  }
}

// Check for "Contraoferta rechazada"
console.log('\n=== search "rechazada/rejected" in all sections ===');
function searchAll(obj, prefix, searchTerms) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      for (const term of searchTerms) {
        if (v.toLowerCase().includes(term) || k.toLowerCase().includes(term)) {
          console.log(`  ${path}: ${JSON.stringify(v)}`);
          break;
        }
      }
    } else if (typeof v === 'object' && v !== null) {
      searchAll(v, path, searchTerms);
    }
  }
}
searchAll(en, '', ['counterrej', 'counter_rej', 'rejected']);
