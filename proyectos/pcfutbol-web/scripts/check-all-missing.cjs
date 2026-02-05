// Check ALL locales for missing keys compared to each other
const fs = require('fs');
const path = require('path');

const locales = {};
['en', 'es', 'fr', 'de', 'it', 'pt'].forEach(lang => {
  locales[lang] = require(`../src/locales/${lang}.json`);
});

// Find keys in es that are missing in en, and vice versa
function getKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...getKeys(v, p));
    } else {
      keys.push(p);
    }
  }
  return keys;
}

const esKeys = new Set(getKeys(locales.es));
const enKeys = new Set(getKeys(locales.en));

// Keys in en missing from es
const enOnly = [...enKeys].filter(k => !esKeys.has(k));
console.log(`Keys in en.json but NOT in es.json: ${enOnly.length}`);
enOnly.forEach(k => console.log(`  ${k}`));

// Keys in es missing from en
const esOnly = [...esKeys].filter(k => !enKeys.has(k));
console.log(`\nKeys in es.json but NOT in en.json: ${esOnly.length}`);
esOnly.forEach(k => console.log(`  ${k}`));

// Check contrarreloj message generation
console.log('\n=== Contrarreloj message keys ===');
const ctKeys = ['contrarrelojActivated', 'contrarrelojObjective', 'clockTicking'];
['contrarreloj', 'messages', 'common', 'mainMenu'].forEach(section => {
  ctKeys.forEach(k => {
    const val = locales.es[section]?.[k];
    if (val) console.log(`  es.${section}.${k} = "${val}"`);
  });
});
