import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const globalRoot = 'C:/Users/Pablo/AppData/Roaming/npm/node_modules';
const Configstore = require(path.join(globalRoot, 'firebase-tools', 'node_modules', 'configstore'));
const c = new Configstore('firebase-tools');
let token = c.get('tokens.access_token');
const refreshToken = c.get('tokens.refresh_token');
if (!token) throw new Error('No firebase access token found');
let auth = { Authorization: `Bearer ${token}` };

async function refreshAccessToken() {
  if (!refreshToken) throw new Error('No firebase refresh token found');
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
  token = data.access_token;
  auth = { Authorization: `Bearer ${token}` };
}

async function fetchGoogle(url, options = {}, retry = true) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...auth
    }
  });
  if (retry && (res.status === 401 || res.status === 403)) {
    await refreshAccessToken();
    return fetchGoogle(url, options, false);
  }
  return res;
}

const editionId = 'real_names_2025_26';
const teams = JSON.parse(fs.readFileSync('public/data/all-teams.json', 'utf8')).argentinaPrimera;
const res = await fetchGoogle(`https://firestore.googleapis.com/v1/projects/pcfutbol-web/databases/(default)/documents/editions/${editionId}`);
if (!res.ok) throw new Error(`Firestore read failed: ${res.status} ${await res.text()}`);
const j = await res.json();
const entries = j.fields?.teams?.mapValue?.fields || {};
const missing = [];
const fictional = [];
for (const t of teams) {
  for (const k of [t.name, t.id]) {
    const e = entries[k]?.mapValue?.fields;
    if (!e) missing.push(k);
    else {
      const name = e.name?.stringValue || '';
      if (!name || name === t.name) fictional.push({ key: k, name });
    }
  }
}
console.log(JSON.stringify({ missing, fictional }, null, 2));
