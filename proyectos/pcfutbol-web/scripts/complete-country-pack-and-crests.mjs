import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const globalRoot = 'C:/Users/Pablo/AppData/Roaming/npm/node_modules';
const Configstore = require(path.join(globalRoot, 'firebase-tools', 'node_modules', 'configstore'));
const config = new Configstore('firebase-tools');

let accessToken = config.get('tokens.access_token');
const refreshToken = config.get('tokens.refresh_token');
if (!accessToken) throw new Error('No firebase access token found');
if (!refreshToken) throw new Error('No firebase refresh token found');

const leagueKey = process.argv[2];
const folderSlug = process.argv[3] || leagueKey.replace(/Primera|LigaPro|Liga1/g, '').toLowerCase();
if (!leagueKey) {
  console.error('Usage: node complete-country-pack-and-crests.mjs <leagueKey> [folderSlug]');
  process.exit(1);
}

const editionId = 'real_names_2025_26';
const bucket = 'pcfutbol-web.firebasestorage.app';
const now = new Date().toISOString();
const root = process.cwd();
const outDir = path.resolve(root, 'scraped-data', `${folderSlug}-transfermarkt-crests`);
const localPackPath = path.resolve(root, 'scripts', 'edition-pack-2025-26.json');
const allTeams = JSON.parse(fs.readFileSync(path.resolve(root, 'public', 'data', 'all-teams.json'), 'utf8'));
const fakeTeams = [...(allTeams[leagueKey] || [])];
const scrapedPath = path.resolve(root, 'scraped-data', '2025-26', `${leagueKey}.json`);
if (!fs.existsSync(scrapedPath)) throw new Error(`No scraped data for ${leagueKey} at ${scrapedPath}`);
const scrapedTeams = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'))
  .slice()
  .sort((a, b) => (a.rank || 999) - (b.rank || 999));
const localPack = JSON.parse(fs.readFileSync(localPackPath, 'utf8'));

fs.mkdirSync(outDir, { recursive: true });

if (fakeTeams.length !== scrapedTeams.length) {
  throw new Error(`${leagueKey} team count mismatch: fake=${fakeTeams.length} real=${scrapedTeams.length}`);
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function fromFirestoreValue(value) {
  if (!value) return null;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('mapValue' in value) {
    const out = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) out[k] = fromFirestoreValue(v);
    return out;
  }
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  return null;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

async function refreshAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`Could not refresh firebase token: ${res.status} ${JSON.stringify(data)}`);
  accessToken = data.access_token;
}

async function fetchAuth(url, options = {}, retry = true) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });
  if (retry && (res.status === 401 || res.status === 403)) {
    await refreshAccessToken();
    return fetchAuth(url, options, false);
  }
  return res;
}

async function fetchRetry(url, headers = { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' }) {
  for (let i = 1; i <= 7; i++) {
    const res = await fetch(url, { headers }).catch(() => null);
    if (res && res.ok) return res;
    if (res && res.status !== 429) return res;
    await new Promise((r) => setTimeout(r, 1200 * i));
  }
  return null;
}

async function patchTeamAsset(teamKey, teamName, storagePath, downloadUrl, sizeBytes, sourceUrl) {
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/pcfutbol-web/databases/(default)/documents/editions/${editionId}/team_assets/${teamKey}`;
  const doc = {
    fields: {
      teamKey: { stringValue: teamKey },
      teamId: { stringValue: teamKey },
      teamName: { stringValue: teamName },
      assetType: { stringValue: 'crest' },
      variant: { stringValue: 'official' },
      storagePath: { stringValue: storagePath },
      downloadUrl: { stringValue: downloadUrl },
      mimeType: { stringValue: 'image/png' },
      width: { nullValue: null },
      height: { nullValue: null },
      sizeBytes: { integerValue: String(sizeBytes) },
      sourceUrl: { stringValue: sourceUrl },
      sourceSite: { stringValue: 'transfermarkt-current' },
      sourceLicense: { stringValue: 'check-rights-manually' },
      season: { stringValue: '2025-2026' },
      status: { stringValue: 'active' },
      createdAt: { stringValue: now },
      updatedAt: { stringValue: now }
    }
  };
  const res = await fetchAuth(firestoreUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Firestore patch failed ${teamKey}: ${res.status} ${text}`);
}

const editionRes = await fetchAuth(`https://firestore.googleapis.com/v1/projects/pcfutbol-web/databases/(default)/documents/editions/${editionId}`);
if (!editionRes.ok) throw new Error(`Could not fetch edition doc: ${editionRes.status} ${await editionRes.text()}`);
const rawEdition = await editionRes.json();
const editionDoc = {};
for (const [k, v] of Object.entries(rawEdition.fields || {})) editionDoc[k] = fromFirestoreValue(v);
editionDoc.teams = editionDoc.teams || {};
localPack.teams = localPack.teams || {};

let uploaded = 0;
let patchedNames = 0;
const mapping = [];
const blockers = [];

for (let i = 0; i < fakeTeams.length; i++) {
  const fakeTeam = fakeTeams[i];
  const realTeam = scrapedTeams[i];
  try {
    if (!realTeam?.transfermarktId) throw new Error(`Missing transfermarktId for slot ${i + 1}`);

    const realName = realTeam.name;
    const sourceUrl = `https://tmssl.akamaized.net/images/wappen/head/${realTeam.transfermarktId}.png`;
    const img = await fetchRetry(sourceUrl);
    if (!img || !img.ok) throw new Error(`Download failed ${fakeTeam.id}: ${img?.status || 'no-response'} ${sourceUrl}`);

    const buffer = Buffer.from(await img.arrayBuffer());
    fs.writeFileSync(path.join(outDir, `${fakeTeam.id}.png`), buffer);

    const storagePath = `editions/${editionId}/teams/${fakeTeam.id}/official/crest.png`;
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
    const uploadRes = await fetchAuth(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(buffer.byteLength)
      },
      body: buffer
    });
    const uploadText = await uploadRes.text();
    if (!uploadRes.ok && !uploadText.includes('already exists')) {
      throw new Error(`Storage upload failed ${fakeTeam.id}: ${uploadRes.status} ${uploadText}`);
    }

    await fetchAuth(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(storagePath)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cacheControl: 'public,max-age=2592000' })
    });

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media`;
    await patchTeamAsset(fakeTeam.id, realName, storagePath, downloadUrl, buffer.byteLength, sourceUrl);
    uploaded += 1;

    const base = editionDoc.teams[fakeTeam.name] || editionDoc.teams[fakeTeam.id] || localPack.teams[fakeTeam.name] || localPack.teams[fakeTeam.id] || {};
    const nameEntry = clone(base);
    nameEntry.name = realName;
    nameEntry.city = realName;
    editionDoc.teams[fakeTeam.name] = nameEntry;
    localPack.teams[fakeTeam.name] = clone(nameEntry);

    const idEntry = clone(editionDoc.teams[fakeTeam.id] || nameEntry);
    idEntry.name = realName;
    idEntry.city = realName;
    editionDoc.teams[fakeTeam.id] = idEntry;
    localPack.teams[fakeTeam.id] = clone(idEntry);
    patchedNames += 1;

    mapping.push({ slot: i + 1, fakeId: fakeTeam.id, fakeName: fakeTeam.name, realName, tmId: realTeam.transfermarktId });
    console.log(`OK ${leagueKey} ${fakeTeam.id} -> ${realName}`);
  } catch (err) {
    console.error(`FAIL ${leagueKey} ${fakeTeam.id}: ${err.message}`);
    blockers.push({ slot: i + 1, fakeId: fakeTeam.id, error: err.message });
  }
}

editionDoc.updatedAt = new Date().toISOString();
fs.writeFileSync(localPackPath, JSON.stringify(localPack, null, 2));
const fields = {};
for (const [k, v] of Object.entries(editionDoc)) fields[k] = toFirestoreValue(v);
const patchEdition = await fetchAuth(`https://firestore.googleapis.com/v1/projects/pcfutbol-web/databases/(default)/documents/editions/${editionId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields })
});
const patchText = await patchEdition.text();
if (!patchEdition.ok) throw new Error(`Edition patch failed: ${patchEdition.status} ${patchText}`);

console.log(JSON.stringify({ ok: blockers.length === 0, leagueKey, uploaded, patchedNames, blockers, mapping }, null, 2));
