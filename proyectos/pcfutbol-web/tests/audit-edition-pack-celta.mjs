import assert from 'node:assert/strict';
import fs from 'node:fs';

const pack = JSON.parse(fs.readFileSync(new URL('../scripts/edition-pack-2025-26.json', import.meta.url), 'utf8'));
const teams = pack.teams || pack;

assert.equal(teams['rc-celta']?.name, 'RC Celta de Vigo', 'rc-celta id mapping must show the real Celta name');
assert.equal(teams['RC Celta de Vigo']?.name, 'RC Celta de Vigo', 'Celta real-name mapping must be explicit');
assert.equal(teams['rc-celta']?.shortName, 'CEL', 'rc-celta id mapping must keep CEL short name');
assert.ok(Object.keys(teams['rc-celta']?.players || {}).length >= 20, 'rc-celta id mapping should keep Celta player mappings');
assert.equal(teams['rukh-lviv']?.name, 'FC Rukh Lviv', 'Rukh must remain mapped by id despite the Galicia FC fictional-name collision');
assert.notEqual(teams['rc-celta']?.name, teams['rukh-lviv']?.name, 'Celta and Rukh cannot resolve to the same name');

console.log('✅ Edition pack Celta/Rukh mapping is valid');
