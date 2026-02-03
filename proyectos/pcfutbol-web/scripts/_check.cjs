const d = JSON.parse(require('fs').readFileSync(__dirname + '/sofifa-data-full.json', 'utf8'));
console.log('Keys:', Object.keys(d));
for (const k of Object.keys(d)) {
  console.log(k, ':', Array.isArray(d[k]) ? d[k].length + ' players' : typeof d[k]);
}
