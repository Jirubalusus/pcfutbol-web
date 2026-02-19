/**
 * Use firebase-tools programmatic API to upload edition
 * firebase-tools uses admin credentials from `firebase login`
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Step 1: Build the final edition data locally
const editionPath = join(projectRoot, 'edition-final.json');
const edition = JSON.parse(readFileSync(editionPath, 'utf-8'));
console.log(`📊 Edition: ${edition.teamCount} teams, ${edition.playerCount} players`);
console.log(`   JSON: ${JSON.stringify(edition).length} bytes`);

// Step 2: Delete the existing edition doc
console.log('\n🗑️  Deleting existing edition doc...');
try {
  execSync('firebase firestore:delete editions/real_names_2025_26 --project pcfutbol-web --force', { stdio: 'inherit' });
} catch (e) {
  console.log('Delete failed or doc didnt exist:', e.message);
}

// Step 3: Import via a small Node script that uses firebase-admin with the token from firebase login
// firebase-tools stores the refresh token in ~/.config/configstore/firebase-tools.json
import { createRequire } from 'module';
const require2 = createRequire(import.meta.url);
const os = require2('os');
const configPath = join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
let refreshToken;
try {
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  refreshToken = config.tokens?.refresh_token;
  if (refreshToken) console.log('✅ Found Firebase refresh token');
} catch (e) {
  // Try Windows path
  const winPath = join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json');
  try {
    const config = JSON.parse(readFileSync(winPath, 'utf-8'));
    refreshToken = config.tokens?.refresh_token;
    if (refreshToken) console.log('✅ Found Firebase refresh token (Windows)');
  } catch (e2) {
    console.log('❌ Cannot find Firebase refresh token');
  }
}

if (!refreshToken) {
  console.log('\nTrying alternate approach: use google-auth-library with firebase token...');
  // Try to get access token from firebase CLI
  try {
    const token = execSync('firebase login:ci --no-localhost 2>&1', { encoding: 'utf-8', timeout: 5000 });
    console.log(token.substring(0, 200));
  } catch(e) {
    console.log('Cannot get token interactively');
  }
}

// If we have the refresh token, exchange it for an access token
if (refreshToken) {
  console.log('\n🔑 Exchanging refresh token for access token...');
  const resp = await fetch('https://securetoken.googleapis.com/v1/token?key=AIzaSyBIpJz1ZoZx_roIne3oc0yArVzeo4kDmvw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`
  });

  if (resp.ok) {
    const data = await resp.json();
    const accessToken = data.access_token || data.id_token;
    console.log('✅ Got access token');

    // Upload using REST API with auth
    const url = `https://firestore.googleapis.com/v1/projects/pcfutbol-web/databases/(default)/documents/editions/real_names_2025_26`;
    
    function toFirestoreValue(val) {
      if (val === null || val === undefined) return { nullValue: null };
      if (typeof val === 'string') return { stringValue: val };
      if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
      if (typeof val === 'boolean') return { booleanValue: val };
      if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
      if (typeof val === 'object') {
        const fields = {};
        for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
        return { mapValue: { fields } };
      }
      return { stringValue: String(val) };
    }

    const firestoreDoc = { fields: {} };
    for (const [k, v] of Object.entries(edition)) firestoreDoc.fields[k] = toFirestoreValue(v);

    console.log(`📤 Uploading (${JSON.stringify(firestoreDoc).length} bytes)...`);
    const uploadResp = await fetch(url, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(firestoreDoc)
    });

    if (uploadResp.ok) {
      console.log('✅ Upload successful!');
    } else {
      const err = await uploadResp.json();
      console.log(`❌ Error ${uploadResp.status}:`, JSON.stringify(err.error?.message || err).substring(0, 500));
    }
  } else {
    const err = await resp.json();
    console.log('❌ Token exchange failed:', JSON.stringify(err).substring(0, 300));
  }
}

process.exit(0);
