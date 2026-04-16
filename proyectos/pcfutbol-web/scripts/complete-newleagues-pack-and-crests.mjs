/**
 * Complete pack-and-crests for newly added leagues.
 *
 * For each league listed in LEAGUE_SOURCES:
 *   - Reads club definitions from scripts/leagues-config/<key>.mjs
 *   - Scrapes the Transfermarkt league page for current clubs + TM IDs
 *   - Fuzzy-matches each config club against a scraped TM club
 *   - Downloads the matching crest from Transfermarkt's CDN
 *   - Uploads it to Firebase Storage at editions/real_names_2025_26/teams/<id>/official/crest.png
 *   - Patches editions/real_names_2025_26/team_assets/<id>
 *   - Patches editions/real_names_2025_26.teams with { [fakeName]: {...}, [id]: {...} }
 *   - Mirrors the same mapping into scripts/edition-pack-2025-26.json
 *
 * Usage:
 *   node scripts/complete-newleagues-pack-and-crests.mjs <leagueKey>
 *   node scripts/complete-newleagues-pack-and-crests.mjs --all
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);
const Configstore = require('C:/Users/Pablo/AppData/Roaming/npm/node_modules/firebase-tools/node_modules/configstore');
const firebaseConfig = new Configstore('firebase-tools');
let accessToken = firebaseConfig.get('tokens.access_token');
const refreshToken = firebaseConfig.get('tokens.refresh_token');
if (!accessToken || !refreshToken) throw new Error('Firebase CLI not authenticated');

const editionId = 'real_names_2025_26';
const bucket = 'pcfutbol-web.firebasestorage.app';
const now = new Date().toISOString();
const localPackPath = path.join(ROOT, 'scripts', 'edition-pack-2025-26.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

const LEAGUE_SOURCES = {
  eliteserien:     { config: 'eliteserien.mjs',       tmUrl: 'https://www.transfermarkt.es/eliteserien/startseite/wettbewerb/NO1',             countryFolder: 'norway' },
  allsvenskan:     { config: 'allsvenskan.mjs',       tmUrl: 'https://www.transfermarkt.es/allsvenskan/startseite/wettbewerb/SE1',             countryFolder: 'sweden' },
  ekstraklasa:     { config: 'ekstraklasa.mjs',       tmUrl: 'https://www.transfermarkt.es/ekstraklasa/startseite/wettbewerb/PL1',             countryFolder: 'poland' },
  eersteDivisie:   { config: 'eerste-divisie.mjs',    tmUrl: 'https://www.transfermarkt.es/keuken-kampioen-divisie/startseite/wettbewerb/NL2', countryFolder: 'netherlands2' },
  ligaPortugal2:   { config: 'liga-portugal-2.mjs',   tmUrl: 'https://www.transfermarkt.es/liga-portugal-2/startseite/wettbewerb/PO2',         countryFolder: 'portugal2' },
  russiaPremier:   { config: 'russia-premier.mjs',    tmUrl: 'https://www.transfermarkt.es/premier-liga/startseite/wettbewerb/RU1',            countryFolder: 'russia' },
  ukrainePremier:  { config: 'ukraine-premier.mjs',   tmUrl: 'https://www.transfermarkt.es/ukrajinska-premjer-liga/startseite/wettbewerb/UKR1', countryFolder: 'ukraine' },
  romaniaSuperliga:{ config: 'romania-superliga.mjs', tmUrl: 'https://www.transfermarkt.es/superliga/startseite/wettbewerb/RO1',               countryFolder: 'romania' },
  hungaryNBI:      { config: 'hungary-nbi.mjs',       tmUrl: 'https://www.transfermarkt.es/nb-i/startseite/wettbewerb/UNG1',                   countryFolder: 'hungary' },
  kLeague1:        { config: 'south-korea-k1.mjs',    tmUrl: 'https://www.transfermarkt.es/k-league-1/startseite/wettbewerb/RSK1',             countryFolder: 'korea' },
  aLeagueMen:      { config: 'australia-aleague.mjs', tmUrl: 'https://www.transfermarkt.es/a-league-men/startseite/wettbewerb/AUS1',           countryFolder: 'australia' },
  southAfricaPSL:  { config: 'south-africa-psl.mjs',  tmUrl: 'https://www.transfermarkt.es/premier-soccer-league/startseite/wettbewerb/SFPL',  countryFolder: 'southafrica' }
};

// ── Normalise names for fuzzy matching ──
function normName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

const CLUB_TOKEN_STOPWORDS = new Set([
  'fc','cf','sc','ac','kf','bk','if','fk','sk','nk','il','tc','sv','us','ks','ca','club',
  // Portuguese/Spanish/French club abbreviations
  'ud','cd','sd','gd','sl','sl.','rcd','uds','usc','scu','cs','rc','ss','asd','ufc','ucf','gs','as',
  'fotball','futbol','fotboll','soccer','football','futebol','calcio',
  'de','da','do','del','la','el','le','les','y','i','e','dos','das',
  'and','the','do','the',
  // Reserve/youth markers (common across NL, PL, DE)
  'ii','iii','u17','u18','u19','u20','u21','u23','jong','jugend','juvenil','reserve','reserves','sub'
]);

function tokenizeName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function significantTokens(s) {
  return tokenizeName(s).filter(t => !CLUB_TOKEN_STOPWORDS.has(t));
}

// Score similarity: 0..1
function similarity(a, b) {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  // Significant-token overlap (ignore club-type tokens like FC, IF, FK, Fotboll)
  const sa = new Set(significantTokens(a));
  const sb = new Set(significantTokens(b));
  if (sa.size && sb.size) {
    let overlap = 0;
    const overlapTokens = [];
    for (const t of sa) if (sb.has(t)) { overlap++; overlapTokens.push(t); }
    const jaccard = overlap / new Set([...sa, ...sb]).size;
    if (jaccard >= 0.5) return Math.max(0.8, jaccard);
    if (overlap >= 1 && (sa.size === 1 || sb.size === 1)) return 0.85;
    // Rare/distinctive token overlap (length >= 7, e.g. "metaloglobus")
    for (const t of overlapTokens) {
      if (t.length >= 7) return 0.8;
    }
  }

  // Prefix match (HamKam vs Hamarkameratene)
  const minLen = Math.min(na.length, nb.length);
  let prefixLen = 0;
  while (prefixLen < minLen && na[prefixLen] === nb[prefixLen]) prefixLen++;
  const minPrefix = minLen <= 7 ? 3 : 4;
  if (prefixLen >= minPrefix) {
    const prefixScore = prefixLen / Math.min(na.length, nb.length);
    if (prefixScore >= 0.5) return Math.max(0.7, prefixScore * 0.85);
  }

  // Loose token overlap fallback
  const ta = new Set(tokenizeName(a));
  const tb = new Set(tokenizeName(b));
  if (!ta.size || !tb.size) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.max(ta.size, tb.size);
}

// Filter out reserve/youth/women's variants from TM results
// NOTE: (-YYYY) marks defunct main teams (e.g. FK Khimki (-2025)); accept them.
const EXCLUDE_VARIANT_RE = /(\bII\b|\bIII\b|\bU1[6-9]\b|\bU2[0-3]\b|\bSub-?\d+\b|\bCadete\b|\bJuvenil\b|\bJugend\b|\bReserve\b|\bAcademy\b|\bAcademia\b|\bFemenino\b|\bFemenina\b|\bWomen\b|\bDamen\b|\bJuniores\b|\bB-Jugend\b|\bA-Jugend\b|\bUEFA\b|\bYouth\b)/i;

// Explicit TM id overrides for hard cases (transliteration, defunct clubs,
// clubs not surfaced well by TM search). Keyed by `<leagueKey>:<club.id>`.
const TM_ID_OVERRIDES = {
  'russiaPremier:dynamo-moscow': '121',
  'russiaPremier:fakel-voronezh': '1124',
  'russiaPremier:khimki': '3719',
  'ukrainePremier:epitsentr': '84122',
  'ukrainePremier:inhulets': '49364',
  'southAfricaPSL:royal-am': '8607',
};

// Transfermarkt search fallback — try multiple query variants since TM is strict
async function tmSearchTeamOnce(query) {
  const url = `https://www.transfermarkt.es/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}`;
  const r = await fetchRetry(url);
  if (!r || !r.ok) return [];
  const html = await r.text();
  const anchorRe = /<a\b([^>]*)href="\/([^\/"]+)\/startseite\/verein\/(\d+)[^"]*"([^>]*)>([\s\S]*?)<\/a>/gi;
  const results = new Map();
  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    const [, pre, slug, tmId, post, inner] = m;
    if (results.has(tmId)) continue;
    const attrs = pre + ' ' + post;
    const titleMatch = attrs.match(/\btitle="([^"]+)"/i);
    const innerText = inner.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
    const display = (titleMatch?.[1] || innerText || '').trim();
    if (!display) continue;
    if (EXCLUDE_VARIANT_RE.test(display) || /-(ii|iii|u\d+|jugend|juvenil|reserves?)$/i.test(slug)) continue;
    results.set(tmId, { tmId, slug, name: display });
  }
  return [...results.values()];
}

async function tmSearchTeam(query) {
  // First, try the exact query
  let results = await tmSearchTeamOnce(query);
  if (results.length > 0) return results;

  // Strip leading/trailing club abbreviations (FC, FK, CF, CD, etc.)
  const stripped = query
    .replace(/^(FC|FK|CF|SC|AC|CD|SD|GD|SL|CS|KS|NK|UD|UFC|PFC|OFK|FK)\s+/i, '')
    .replace(/\s+(FC|FK|CF|SC|AC|CD|SD|GD|SL|CS|KS|NK|UD|UFC|PFC|OFK)$/i, '')
    .trim();
  if (stripped && stripped !== query) {
    results = await tmSearchTeamOnce(stripped);
    if (results.length > 0) return results;
  }

  // Fall back to the last multi-word fragment (often the city name)
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const lastTwo = tokens.slice(-2).join(' ');
    if (lastTwo !== stripped && lastTwo !== query) {
      results = await tmSearchTeamOnce(lastTwo);
      if (results.length > 0) return results;
    }
  }

  return [];
}

// ── Firebase token refresh & fetch ──
async function refreshAccessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const data = await r.json();
  if (!r.ok || !data.access_token) throw new Error(`Could not refresh firebase token: ${r.status} ${JSON.stringify(data)}`);
  accessToken = data.access_token;
}

async function fetchAuth(url, options = {}, retry = true) {
  const r = await fetch(url, { ...options, headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) } });
  if (retry && (r.status === 401 || r.status === 403)) {
    await refreshAccessToken();
    return fetchAuth(url, options, false);
  }
  return r;
}

async function fetchRetry(url, headers = HEADERS) {
  for (let i = 1; i <= 6; i++) {
    const r = await fetch(url, { headers }).catch(() => null);
    if (r && r.ok) return r;
    if (r && r.status !== 429 && r.status !== 503) return r;
    await new Promise(res => setTimeout(res, 1200 * i));
  }
  return null;
}

// ── Firestore value encoding ──
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

function clone(obj) { return JSON.parse(JSON.stringify(obj || {})); }

// ── Scrape TM league page for {name, tmId, slug} ──
// League pages list every participant, including reserve/U21 sides where allowed
// (e.g. Jong Ajax in Eerste Divisie), so variants are NOT filtered here.
async function scrapeLeaguePage(tmUrl) {
  const r = await fetchRetry(tmUrl);
  if (!r || !r.ok) throw new Error(`Failed to fetch league page: ${tmUrl} (${r?.status || 'no response'})`);
  const html = await r.text();
  const anchorRe = /<a\b([^>]*)href="\/([^\/"]+)\/startseite\/verein\/(\d+)[^"]*"([^>]*)>([\s\S]*?)<\/a>/gi;
  const teams = new Map();
  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    const [, pre, slug, tmId, post, inner] = m;
    if (teams.has(tmId)) continue;
    const attrs = pre + ' ' + post;
    const titleMatch = attrs.match(/\btitle="([^"]+)"/i);
    const innerText = inner.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
    const cleaned = (titleMatch?.[1] || innerText || '').trim();
    if (!cleaned) continue;
    teams.set(tmId, { tmId, slug, name: cleaned });
  }
  return [...teams.values()];
}

// ── Patch asset doc in team_assets subcollection ──
async function patchTeamAsset({ teamKey, teamName, storagePath, downloadUrl, sizeBytes, sourceUrl }) {
  const url = `https://firestore.googleapis.com/v1/projects/pcfutbol-web/databases/(default)/documents/editions/${editionId}/team_assets/${teamKey}`;
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
  const res = await fetchAuth(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firestore patch team_assets failed ${teamKey}: ${res.status} ${t}`);
  }
}

async function loadEditionDoc() {
  const res = await fetchAuth(`https://firestore.googleapis.com/v1/projects/pcfutbol-web/databases/(default)/documents/editions/${editionId}`);
  if (!res.ok) throw new Error(`Could not fetch edition: ${res.status} ${await res.text()}`);
  const raw = await res.json();
  const doc = {};
  for (const [k, v] of Object.entries(raw.fields || {})) doc[k] = fromFirestoreValue(v);
  doc.teams = doc.teams || {};
  return doc;
}

async function saveEditionDoc(doc) {
  doc.updatedAt = new Date().toISOString();
  const fields = {};
  for (const [k, v] of Object.entries(doc)) fields[k] = toFirestoreValue(v);
  const res = await fetchAuth(`https://firestore.googleapis.com/v1/projects/pcfutbol-web/databases/(default)/documents/editions/${editionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  if (!res.ok) throw new Error(`Edition patch failed: ${res.status} ${await res.text()}`);
}

async function processLeague(leagueKey) {
  const src = LEAGUE_SOURCES[leagueKey];
  if (!src) throw new Error(`Unknown leagueKey: ${leagueKey}`);

  console.log(`\n=== ${leagueKey} ===`);
  const configMod = await import(`./leagues-config/${src.config}`);
  const leagueCfg = configMod.default;

  const scrapedTeams = await scrapeLeaguePage(src.tmUrl);
  console.log(`  scraped ${scrapedTeams.length} TM clubs from ${src.tmUrl}`);

  const outDir = path.resolve(ROOT, 'scraped-data', `${src.countryFolder}-transfermarkt-crests`);
  fs.mkdirSync(outDir, { recursive: true });

  const editionDoc = await loadEditionDoc();
  const localPack = JSON.parse(fs.readFileSync(localPackPath, 'utf8'));
  localPack.teams = localPack.teams || {};
  localPack.leagues = localPack.leagues || {};
  // Make sure league name mapping is present too
  if (leagueCfg.fakeLeagueName && leagueCfg.realLeagueName) {
    localPack.leagues[leagueCfg.fakeLeagueName] = leagueCfg.realLeagueName;
  }

  const mapping = [];
  const blockers = [];
  let uploaded = 0;
  let patchedNames = 0;

  // Used TM IDs so we don't match the same team to two config slots
  const usedTmIds = new Set();

  // Unified scoring: name similarity + slug/id signal
  const idTokens = (club) => club.id.split('-').filter(Boolean);

  function scoreCandidate(club, cand) {
    let score = similarity(club.realName, cand.name);
    const cfgTokens = idTokens(club);
    const cfgTokenSet = new Set(cfgTokens);
    const slugTokens = cand.slug.split('-').filter(Boolean);
    const slugTokenSet = new Set(slugTokens);
    let slugOverlap = 0;
    for (const t of cfgTokenSet) if (slugTokenSet.has(t)) slugOverlap++;
    const slugUnion = new Set([...cfgTokenSet, ...slugTokenSet]).size;
    const slugJaccard = slugUnion ? slugOverlap / slugUnion : 0;
    if (slugJaccard >= 0.5) score = Math.max(score, slugJaccard);
    const GENERIC_FIRST = new Set(['royal','real','fc','ac','sc','cf','city','united','sporting','athletic','deportivo','atletico','atletic','atlético']);
    if (cfgTokens[0] && slugTokens[0] && cfgTokens[0] === slugTokens[0] && cfgTokens[0].length >= 4 && !GENERIC_FIRST.has(cfgTokens[0])) {
      score = Math.max(score, 0.85);
    }
    // Handle transliteration: dynamo↔dinamo, k↔c (Krasnodar), y↔i
    const t1 = normName(club.realName);
    const t2 = normName(cand.name);
    const cyrillicized = t1.replace(/dy/g, 'di').replace(/y/g, 'i');
    if (cyrillicized === t2 || t2.includes(cyrillicized) || cyrillicized.includes(t2)) {
      score = Math.max(score, 0.9);
    }
    return score;
  }

  for (const club of leagueCfg.clubs) {
    try {
      const overrideKey = `${leagueKey}:${club.id}`;
      const overrideTmId = TM_ID_OVERRIDES[overrideKey];

      let chosen = null;
      let topLeague = null;
      if (overrideTmId && !usedTmIds.has(overrideTmId)) {
        chosen = {
          cand: { tmId: overrideTmId, slug: 'override', name: `(override tm=${overrideTmId})` },
          source: 'override',
          score: 1
        };
      } else {
        const candidates = [];
        for (const s of scrapedTeams) {
          if (usedTmIds.has(s.tmId)) continue;
          candidates.push({ cand: s, source: 'league', score: scoreCandidate(club, s) });
        }
        candidates.sort((a, b) => b.score - a.score);
        topLeague = candidates[0] || null;

        let topSearch = null;
        if (!topLeague || topLeague.score < 0.9) {
          const searchResults = await tmSearchTeam(club.realName);
          const searchCands = [];
          for (const s of searchResults) {
            if (usedTmIds.has(s.tmId)) continue;
            searchCands.push({ cand: s, source: 'search', score: scoreCandidate(club, s) });
          }
          searchCands.sort((a, b) => b.score - a.score);
          topSearch = searchCands[0] || null;
        }

        if (topLeague && topLeague.score >= 0.9) chosen = topLeague;
        else if (topSearch && topSearch.score >= 0.7) chosen = topSearch;
        else if (topLeague && topLeague.score >= 0.7) chosen = topLeague;
        else if (topSearch && topSearch.score >= 0.55) chosen = topSearch;
        else if (topLeague && topLeague.score >= 0.5) chosen = topLeague;
      }

      const matched = !!chosen;
      const best = chosen?.cand || topLeague?.cand || null;
      const bestScore = chosen?.score || topLeague?.score || 0;
      let tmId = null, matchedName = null;
      if (matched) {
        tmId = chosen.cand.tmId;
        matchedName = chosen.cand.name;
        usedTmIds.add(chosen.cand.tmId);
      }

      const teamKey = club.id;
      const realName = club.realName;
      const nameEntry = clone(editionDoc.teams[club.fakeName] || localPack.teams[club.fakeName] || {});
      nameEntry.name = realName;
      if (club.realShortName) nameEntry.shortName = club.realShortName;
      if (club.realStadium) nameEntry.stadium = club.realStadium;
      nameEntry.city = realName;
      editionDoc.teams[club.fakeName] = nameEntry;
      localPack.teams[club.fakeName] = clone(nameEntry);

      const idEntry = clone(editionDoc.teams[club.id] || nameEntry);
      idEntry.name = realName;
      if (club.realShortName) idEntry.shortName = club.realShortName;
      if (club.realStadium) idEntry.stadium = club.realStadium;
      idEntry.city = realName;
      editionDoc.teams[club.id] = idEntry;
      localPack.teams[club.id] = clone(idEntry);
      patchedNames++;

      if (!tmId) {
        blockers.push({ type: 'no_crest_match', id: club.id, realName, best: best?.name || null, score: bestScore });
        console.log(`  NAME ${club.id} -> ${realName} (no crest match; best=${best?.name || 'n/a'} score=${bestScore.toFixed(2)})`);
        continue;
      }

      const sourceUrl = `https://tmssl.akamaized.net/images/wappen/head/${tmId}.png`;
      const img = await fetchRetry(sourceUrl);
      if (!img || !img.ok) {
        blockers.push({ type: 'crest_download_failed', id: club.id, tmId, status: img?.status || 'no-response' });
        console.log(`  FAIL download ${club.id} tm=${tmId} status=${img?.status || 'no-response'}`);
        continue;
      }

      const buffer = Buffer.from(await img.arrayBuffer());
      fs.writeFileSync(path.join(outDir, `${teamKey}.png`), buffer);

      const storagePath = `editions/${editionId}/teams/${teamKey}/official/crest.png`;
      const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
      const upRes = await fetchAuth(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/png', 'Content-Length': String(buffer.byteLength) },
        body: buffer
      });
      const upText = await upRes.text();
      if (!upRes.ok && !upText.includes('already exists')) {
        blockers.push({ type: 'crest_upload_failed', id: club.id, tmId, status: upRes.status, text: upText.slice(0, 300) });
        console.log(`  FAIL upload ${club.id}: ${upRes.status}`);
        continue;
      }

      // Long-term cache header
      await fetchAuth(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(storagePath)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheControl: 'public,max-age=2592000' })
      });

      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media`;
      await patchTeamAsset({
        teamKey,
        teamName: realName,
        storagePath,
        downloadUrl,
        sizeBytes: buffer.byteLength,
        sourceUrl
      });
      uploaded++;

      mapping.push({ id: club.id, fakeName: club.fakeName, realName, tmId, matchedName, score: bestScore });
      console.log(`  OK ${club.id} -> ${realName} (tm=${tmId}, matched="${matchedName}", score=${bestScore.toFixed(2)})`);
    } catch (err) {
      blockers.push({ type: 'exception', id: club.id, error: err.message });
      console.log(`  ERR ${club.id}: ${err.message}`);
    }
  }

  // Persist edition doc + local pack once per league to keep updates atomic per-league
  fs.writeFileSync(localPackPath, JSON.stringify(localPack, null, 2));
  await saveEditionDoc(editionDoc);

  return { leagueKey, uploaded, patchedNames, blockers, mapping, totalClubs: leagueCfg.clubs.length };
}

async function main() {
  const arg = process.argv[2];
  const targets = arg === '--all' || !arg ? Object.keys(LEAGUE_SOURCES) : [arg];

  const reports = [];
  for (const key of targets) {
    try {
      const r = await processLeague(key);
      reports.push(r);
    } catch (err) {
      console.error(`Failed league ${key}: ${err.message}`);
      reports.push({ leagueKey: key, fatal: err.message });
    }
  }

  console.log('\n===== SUMMARY =====');
  for (const r of reports) {
    if (r.fatal) { console.log(` ${r.leagueKey}: FATAL ${r.fatal}`); continue; }
    console.log(` ${r.leagueKey}: names=${r.patchedNames}/${r.totalClubs} crests=${r.uploaded}/${r.totalClubs} blockers=${r.blockers.length}`);
  }
  const fullReportPath = path.join(ROOT, 'scripts', `newleagues-packfix-report.json`);
  fs.writeFileSync(fullReportPath, JSON.stringify(reports, null, 2));
  console.log(`full report -> ${path.relative(ROOT, fullReportPath)}`);
}

main().catch(err => { console.error(err); process.exit(1); });
