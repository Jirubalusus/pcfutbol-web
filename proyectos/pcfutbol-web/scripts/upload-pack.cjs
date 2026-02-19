/**
 * Upload edition pack to Firestore using REST API with Firebase CLI access token
 */
const fs = require('fs');
const path = require('path');

// Read access token from Firebase CLI config
const configPath = path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let accessToken = config.tokens.access_token;
const refreshToken = config.tokens.refresh_token;

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

async function refreshAccessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    })
  });
  const data = await r.json();
  if (data.access_token) {
    accessToken = data.access_token;
    console.log('Token refreshed');
  }
}

async function main() {
  const packPath = path.join(__dirname, 'edition-pack-2025-26.json');
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  
  // Add metadata
  pack.status = 'approved';
  pack.approvedAt = new Date().toISOString();
  pack.createdAt = new Date().toISOString();
  
  console.log(`Uploading pack: ${pack.name}`);
  console.log(`Teams: ${pack.teamCount}, Players: ${pack.playerCount}`);
  
  const fields = toFirestoreFields(pack);
  const docId = pack.id;
  
  // Try with current token first
  let url = `https://firestore.googleapis.com/v1/projects/pcfutbol-web/databases/(default)/documents/editions/${docId}`;
  
  let response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ fields })
  });
  
  // If token expired, refresh and retry
  if (response.status === 401 || response.status === 403) {
    console.log('Token expired, refreshing...');
    await refreshAccessToken();
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ fields })
    });
  }
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firebase error ${response.status}: ${errText}`);
  }
  
  console.log('✅ Pack uploaded to Firebase successfully!');
  console.log(`   Collection: editions, Document ID: ${docId}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
