import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/data/editions/editionAssetsService.js', import.meta.url), 'utf8');
const match = source.match(/const EDITION_ASSET_ID_ALIASES = \{[\s\S]*?\};[\s\S]*?export function getEditionAssetLookupIds\(editionId\) \{[\s\S]*?\n\}/);
assert.ok(match, 'getEditionAssetLookupIds should be exported from editionAssetsService');

const factory = new Function(`${match[0].replace('export function', 'function')}; return getEditionAssetLookupIds;`);
const getEditionAssetLookupIds = factory();

assert.deepEqual(
  getEditionAssetLookupIds('real_names_2025_26'),
  ['real_names_2025_26'],
  'canonical edition id should only query itself'
);

assert.deepEqual(
  getEditionAssetLookupIds('competicion_2025_26'),
  ['competicion_2025_26', 'real_names_2025_26'],
  'legacy/public pack id must also query the Firestore document that owns team_assets'
);

assert.deepEqual(
  getEditionAssetLookupIds('custom_pack'),
  ['custom_pack'],
  'unknown packs must not query unrelated asset collections'
);

assert.deepEqual(
  getEditionAssetLookupIds(null),
  [],
  'empty edition ids should not query assets'
);

console.log('edition asset alias tests passed');
