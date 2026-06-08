// ============================================================
// Historical Champions (Continental Champions Cup) participants
// ============================================================
//
// Real group-stage / league-phase entrants of the UEFA Champions League for
// every season available in the historical database (public/historical-db).
//
// In-game the competition is named "Continental Champions Cup", but for a
// historical career the actual clubs of that year must take part instead of a
// reputation/ranking proxy. This module is PURE (no React / no network) so it
// can be reused both by TeamSelection bootstrap and by the audit scripts.
//
// 2024-25 and 2025-26 carry the real 36 league-phase clubs. The current engine
// still runs a 32-team Swiss draw (see europeanCompetitions.js
// CHAMPIONS_LEAGUE.teamsCount = 32), so the team *builder* returns 32 by default
// (the top 32 seeds, source order) while the raw lists keep all 36. Do not
// migrate to 36 here; bump DEFAULT_ENGINE_TEAMS only when the engine is ready.

export const DEFAULT_ENGINE_TEAMS = 32;

// ── Raw participants by season (real clubs, English/common spelling) ─────────
// Order matters: it mirrors the UEFA pot / seeding order, so slicing the first
// N keeps the strongest seeds when the engine wants fewer than the full field.
export const CHAMPIONS_PARTICIPANTS_BY_SEASON = {
  '2025-26': ['Paris Saint-Germain', 'Real Madrid', 'Manchester City', 'Bayern Munich', 'Liverpool', 'Inter Milan', 'Chelsea', 'Borussia Dortmund', 'Barcelona', 'Arsenal', 'Bayer Leverkusen', 'Atlético Madrid', 'Benfica', 'Atalanta', 'Villarreal', 'Juventus', 'Eintracht Frankfurt', 'Club Brugge', 'Tottenham Hotspur', 'PSV Eindhoven', 'Ajax', 'Napoli', 'Sporting CP', 'Olympiacos', 'Slavia Prague', 'Bodø/Glimt', 'Marseille', 'Copenhagen', 'Monaco', 'Galatasaray', 'Union Saint-Gilloise', 'Qarabağ', 'Athletic Bilbao', 'Newcastle United', 'Pafos', 'Kairat'],
  '2024-25': ['Real Madrid', 'Manchester City', 'Bayern Munich', 'Paris Saint-Germain', 'Liverpool', 'Inter Milan', 'Borussia Dortmund', 'RB Leipzig', 'Barcelona', 'Bayer Leverkusen', 'Atlético Madrid', 'Atalanta', 'Juventus', 'Benfica', 'Arsenal', 'Club Brugge', 'Shakhtar Donetsk', 'Milan', 'Feyenoord', 'Sporting CP', 'PSV Eindhoven', 'Dinamo Zagreb', 'Red Bull Salzburg', 'Lille', 'Red Star Belgrade', 'Young Boys', 'Celtic', 'Slovan Bratislava', 'Monaco', 'Sparta Prague', 'Aston Villa', 'Bologna', 'Girona', 'VfB Stuttgart', 'Sturm Graz', 'Brest'],
  '2023-24': ['Manchester City', 'Sevilla', 'Barcelona', 'Napoli', 'Bayern Munich', 'Paris Saint-Germain', 'Benfica', 'Feyenoord', 'Real Madrid', 'Manchester United', 'Inter Milan', 'Borussia Dortmund', 'Atlético Madrid', 'RB Leipzig', 'Porto', 'Arsenal', 'Shakhtar Donetsk', 'Red Bull Salzburg', 'Milan', 'Braga', 'PSV Eindhoven', 'Lazio', 'Red Star Belgrade', 'Copenhagen', 'Young Boys', 'Real Sociedad', 'Galatasaray', 'Celtic', 'Newcastle United', 'Union Berlin', 'Antwerp', 'Lens'],
  '2022-23': ['Real Madrid', 'Eintracht Frankfurt', 'Manchester City', 'Milan', 'Bayern Munich', 'Paris Saint-Germain', 'Porto', 'Ajax', 'Liverpool', 'Chelsea', 'Barcelona', 'Juventus', 'Atlético Madrid', 'Sevilla', 'RB Leipzig', 'Tottenham Hotspur', 'Borussia Dortmund', 'Red Bull Salzburg', 'Shakhtar Donetsk', 'Inter Milan', 'Napoli', 'Benfica', 'Sporting CP', 'Bayer Leverkusen', 'Rangers', 'Dinamo Zagreb', 'Marseille', 'Copenhagen', 'Club Brugge', 'Celtic', 'Viktoria Plzeň', 'Maccabi Haifa'],
  '2018-19': ['Real Madrid', 'Atlético Madrid', 'Barcelona', 'Bayern Munich', 'Manchester City', 'Juventus', 'Paris Saint-Germain', 'Lokomotiv Moscow', 'Borussia Dortmund', 'Porto', 'Manchester United', 'Shakhtar Donetsk', 'Benfica', 'Napoli', 'Tottenham Hotspur', 'Roma', 'Liverpool', 'Schalke 04', 'Lyon', 'Monaco', 'Ajax', 'CSKA Moscow', 'PSV Eindhoven', 'Valencia', 'Viktoria Plzeň', 'Club Brugge', 'Galatasaray', 'Young Boys', 'Inter Milan', 'TSG Hoffenheim', 'Red Star Belgrade', 'AEK Athens'],
  '2017-18': ['Real Madrid', 'Bayern Munich', 'Chelsea', 'Juventus', 'Benfica', 'Monaco', 'Spartak Moscow', 'Shakhtar Donetsk', 'Barcelona', 'Atlético Madrid', 'Paris Saint-Germain', 'Borussia Dortmund', 'Sevilla', 'Manchester City', 'Porto', 'Manchester United', 'Napoli', 'Tottenham Hotspur', 'Basel', 'Olympiacos', 'Anderlecht', 'Liverpool', 'Roma', 'Beşiktaş', 'Celtic', 'CSKA Moscow', 'Sporting CP', 'APOEL', 'Feyenoord', 'Maribor', 'Qarabağ', 'RB Leipzig'],
  '2016-17': ['Real Madrid', 'Barcelona', 'Leicester City', 'Bayern Munich', 'Juventus', 'Benfica', 'Paris Saint-Germain', 'CSKA Moscow', 'Atlético Madrid', 'Borussia Dortmund', 'Arsenal', 'Sevilla', 'Porto', 'Napoli', 'Bayer Leverkusen', 'Manchester City', 'Basel', 'Tottenham Hotspur', 'Dynamo Kyiv', 'Lyon', 'PSV Eindhoven', 'Sporting CP', 'Club Brugge', 'Borussia Mönchengladbach', 'Celtic', 'Monaco', 'Beşiktaş', 'Legia Warsaw', 'Dinamo Zagreb', 'Ludogorets Razgrad', 'Copenhagen', 'Rostov'],
  '2015-16': ['Barcelona', 'Chelsea', 'Bayern Munich', 'Juventus', 'Benfica', 'Paris Saint-Germain', 'Zenit Saint Petersburg', 'PSV Eindhoven', 'Real Madrid', 'Atlético Madrid', 'Porto', 'Arsenal', 'Manchester United', 'Valencia', 'Bayer Leverkusen', 'Manchester City', 'Shakhtar Donetsk', 'Sevilla', 'Lyon', 'Dynamo Kyiv', 'Olympiacos', 'CSKA Moscow', 'Galatasaray', 'Roma', 'BATE Borisov', 'Borussia Mönchengladbach', 'VfL Wolfsburg', 'Dinamo Zagreb', 'Maccabi Tel Aviv', 'Gent', 'Malmö FF', 'Astana'],
  '2014-15': ['Real Madrid', 'Barcelona', 'Bayern Munich', 'Chelsea', 'Benfica', 'Atlético Madrid', 'Arsenal', 'Porto', 'Schalke 04', 'Borussia Dortmund', 'Juventus', 'Paris Saint-Germain', 'Shakhtar Donetsk', 'Basel', 'Zenit Saint Petersburg', 'Manchester City', 'Bayer Leverkusen', 'Olympiacos', 'CSKA Moscow', 'Ajax', 'Liverpool', 'Sporting CP', 'Galatasaray', 'Athletic Bilbao', 'Anderlecht', 'Roma', 'APOEL', 'BATE Borisov', 'Ludogorets Razgrad', 'Maribor', 'Monaco', 'Malmö FF'],
  '2013-14': ['Bayern Munich', 'Barcelona', 'Chelsea', 'Real Madrid', 'Manchester United', 'Arsenal', 'Porto', 'Benfica', 'Atlético Madrid', 'Shakhtar Donetsk', 'Milan', 'Schalke 04', 'Marseille', 'CSKA Moscow', 'Paris Saint-Germain', 'Juventus', 'Zenit Saint Petersburg', 'Manchester City', 'Ajax', 'Borussia Dortmund', 'Basel', 'Olympiacos', 'Galatasaray', 'Bayer Leverkusen', 'Copenhagen', 'Napoli', 'Anderlecht', 'Celtic', 'Steaua București', 'Viktoria Plzeň', 'Real Sociedad', 'Austria Wien'],
  '2012-13': ['Chelsea', 'Barcelona', 'Manchester United', 'Bayern Munich', 'Real Madrid', 'Arsenal', 'Porto', 'Milan', 'Valencia', 'Benfica', 'Shakhtar Donetsk', 'Zenit Saint Petersburg', 'Schalke 04', 'Manchester City', 'Braga', 'Dynamo Kyiv', 'Olympiacos', 'Ajax', 'Anderlecht', 'Juventus', 'Spartak Moscow', 'Paris Saint-Germain', 'Lille', 'Galatasaray', 'Celtic', 'Borussia Dortmund', 'BATE Borisov', 'Dinamo Zagreb', 'CFR Cluj', 'Málaga', 'Montpellier', 'Nordsjælland'],
  '2011-12': ['Barcelona', 'Manchester United', 'Chelsea', 'Bayern Munich', 'Arsenal', 'Real Madrid', 'Porto', 'Internazionale', 'Milan', 'Lyon', 'Shakhtar Donetsk', 'Valencia', 'Benfica', 'Villarreal', 'CSKA Moscow', 'Marseille', 'Zenit Saint Petersburg', 'Ajax', 'Bayer Leverkusen', 'Olympiacos', 'Manchester City', 'Lille', 'Basel', 'BATE Borisov', 'Borussia Dortmund', 'Napoli', 'Dinamo Zagreb', 'APOEL', 'Trabzonspor', 'Genk', 'Viktoria Plzeň', 'Oțelul Galați'],
  '2010-11': ['Internazionale', 'Barcelona', 'Manchester United', 'Chelsea', 'Arsenal', 'Bayern Munich', 'Milan', 'Lyon', 'Werder Bremen', 'Real Madrid', 'Roma', 'Shakhtar Donetsk', 'Benfica', 'Valencia', 'Marseille', 'Panathinaikos', 'Tottenham Hotspur', 'Rangers', 'Ajax', 'Schalke 04', 'Basel', 'Braga', 'Copenhagen', 'Spartak Moscow', 'Hapoel Tel Aviv', 'Twente', 'Rubin Kazan', 'Auxerre', 'CFR Cluj', 'Partizan', 'Žilina', 'Bursaspor'],
  '2009-10': ['Barcelona', 'Chelsea', 'Liverpool', 'Manchester United', 'Milan', 'Arsenal', 'Sevilla', 'Bayern Munich', 'Lyon', 'Inter Milan', 'Real Madrid', 'CSKA Moscow', 'Porto', 'AZ', 'Juventus', 'Rangers', 'Olympiacos', 'Marseille', 'Dynamo Kyiv', 'VfB Stuttgart', 'Fiorentina', 'Atlético Madrid', 'Bordeaux', 'Beşiktaş', 'VfL Wolfsburg', 'Standard Liège', 'Maccabi Haifa', 'Zürich', 'Rubin Kazan', 'Unirea Urziceni', 'APOEL', 'Debrecen'],
  '2008-09': ['Manchester United', 'Chelsea', 'Liverpool', 'Barcelona', 'Arsenal', 'Lyon', 'Internazionale', 'Real Madrid', 'Bayern Munich', 'PSV Eindhoven', 'Villarreal', 'Roma', 'Porto', 'Werder Bremen', 'Sporting CP', 'Juventus', 'Marseille', 'Zenit Saint Petersburg', 'Steaua București', 'Panathinaikos', 'Bordeaux', 'Celtic', 'Basel', 'Fenerbahçe', 'Shakhtar Donetsk', 'Fiorentina', 'Atlético Madrid', 'Dynamo Kyiv', 'CFR Cluj', 'AaB', 'Anorthosis Famagusta', 'BATE Borisov'],
  '2007-08': ['Milan', 'Barcelona', 'Liverpool', 'Internazionale', 'Arsenal', 'Real Madrid', 'Chelsea', 'Manchester United', 'Valencia', 'Lyon', 'Porto', 'Sevilla', 'PSV Eindhoven', 'Roma', 'Benfica', 'Werder Bremen', 'Celtic', 'Schalke 04', 'VfB Stuttgart', 'Steaua București', 'CSKA Moscow', 'Sporting CP', 'Lazio', 'Marseille', 'Rangers', 'Shakhtar Donetsk', 'Beşiktaş', 'Olympiacos', 'Dynamo Kyiv', 'Fenerbahçe', 'Slavia Prague', 'Rosenborg'],
  '2006-07': ['Barcelona', 'Milan', 'Real Madrid', 'Internazionale', 'Liverpool', 'Arsenal', 'Manchester United', 'Valencia', 'Lyon', 'Porto', 'PSV Eindhoven', 'Bayern Munich', 'Chelsea', 'Roma', 'Celtic', 'Lille', 'Sporting CP', 'Benfica', 'Bordeaux', 'Steaua București', 'Werder Bremen', 'Olympiacos', 'CSKA Moscow', 'AEK Athens', 'Anderlecht', 'Dynamo Kyiv', 'Levski Sofia', 'Shakhtar Donetsk', 'Galatasaray', 'Hamburger SV', 'Spartak Moscow', 'Copenhagen'],
  '2005-06': ['Liverpool', 'Real Madrid', 'Milan', 'Barcelona', 'Manchester United', 'Internazionale', 'Bayern Munich', 'Arsenal', 'Porto', 'Juventus', 'PSV Eindhoven', 'Lyon', 'Panathinaikos', 'Chelsea', 'Villarreal', 'Ajax', 'Club Brugge', 'Anderlecht', 'Olympiacos', 'Schalke 04', 'Sparta Prague', 'Lille', 'Rangers', 'Werder Bremen', 'Benfica', 'Rosenborg', 'Real Betis', 'Udinese', 'Fenerbahçe', 'Rapid Wien', 'Thun', 'Artmedia Bratislava'],
  '2004-05': ['Porto', 'Real Madrid', 'Valencia', 'Barcelona', 'Manchester United', 'Bayern Munich', 'Deportivo La Coruña', 'Arsenal', 'Milan', 'Liverpool', 'Juventus', 'Internazionale', 'Roma', 'Lyon', 'Chelsea', 'Panathinaikos', 'PSV Eindhoven', 'Bayer Leverkusen', 'Celtic', 'Sparta Prague', 'Monaco', 'Anderlecht', 'Ajax', 'Paris Saint-Germain', 'Rosenborg', 'Dynamo Kyiv', 'Olympiacos', 'Werder Bremen', 'Shakhtar Donetsk', 'Fenerbahçe', 'Maccabi Tel Aviv', 'CSKA Moscow'],
};

// Canonical export name used by callers/audits (alias of the constant above).
export const participantsBySeason = CHAMPIONS_PARTICIPANTS_BY_SEASON;

// ── Name aliases: source spelling → dataset spelling candidates ──────────────
// The historical dataset stores Spanish/localised club names. These map the
// English/common source names to the form(s) used in the dataset so the matcher
// reaches a clean token-equality instead of relying on fuzzy fallbacks. Add new
// entries here whenever a real participant fails to match a present club.
export const CHAMPIONS_NAME_ALIASES = {
  'Bayern Munich': ['Bayern Múnich'],
  'Inter Milan': ['Inter de Milán', 'Internazionale'],
  'Internazionale': ['Inter de Milán'],
  'Milan': ['AC Milan'],
  'Napoli': ['SSC Nápoles', 'Nápoles'],
  'Roma': ['AS Roma'],
  'Lazio': ['SS Lazio'],
  'Juventus': ['Juventus de Turín'],
  'Bologna': ['Bolonia'],
  'Atalanta': ['Atalanta de Bérgamo'],
  'Udinese': ['Udinese Calcio'],
  'Paris Saint-Germain': ['París Saint-Germain FC'],
  'Marseille': ['Olympique de Marsella'],
  'Lyon': ['Olympique de Lyon'],
  'Lille': ['LOSC Lille'],
  'Monaco': ['AS Mónaco'],
  'Bordeaux': ['Girondins de Burdeos'],
  'Lens': ['RC Lens'],
  'Auxerre': ['AJ Auxerre'],
  'Brest': ['Stade Brestois 29', 'Stade Brestois'],
  'Porto': ['FC Oporto'],
  'Sporting CP': ['Sporting de Lisboa'],
  'Braga': ['SC Braga'],
  'Benfica': ['SL Benfica'],
  'Athletic Bilbao': ['Athletic Club'],
  'Atlético Madrid': ['Atlético de Madrid'],
  'Deportivo La Coruña': ['RC Deportivo de La Coruña'],
  'Real Betis': ['Real Betis Balompié'],
  'Eintracht Frankfurt': ['Eintracht Fráncfort'],
  'Hamburger SV': ['Hamburgo SV'],
  'VfL Wolfsburg': ['VfL Wolfsburgo'],
  'Werder Bremen': ['SV Werder Bremen'],
  'Schalke 04': ['FC Schalke 04'],
  'TSG Hoffenheim': ['TSG 1899 Hoffenheim'],
  'Union Berlin': ['1.FC Unión Berlín'],
  'Ajax': ['Ajax de Ámsterdam'],
  'AZ': ['AZ Alkmaar'],
  'Twente': ['FC Twente Enschede'],
  'Gent': ['KAA Gante'],
  'Antwerp': ['Royal Amberes', 'Royal Amberes FC'],
  'Anderlecht': ['RSC Anderlecht'],
  'Genk': ['KRC Genk'],
  'Standard Liège': ['Standard de Lieja'],
  'Club Brugge': ['Club Brujas', 'Club Brujas KV'],
  'Copenhagen': ['FC Copenhague'],
  'Red Bull Salzburg': ['Red Bull Salzburgo'],
  'Sparta Prague': ['AC Sparta Praga'],
  'Slavia Prague': ['SK Slavia Praga'],
  'Sturm Graz': ['SK Sturm Graz'],
  'Austria Wien': ['FK Austria Viena'],
  'Rapid Wien': ['SK Rapid Viena', 'Rapid Viena'],
  'Dinamo Zagreb': ['GNK Dinamo Zagreb'],
  'Viktoria Plzeň': ['FC Viktoria Plzen'],
  'Basel': ['FC Basilea'],
  'Young Boys': ['BSC Young Boys'],
  'Zürich': ['FC Zúrich'],
  'Thun': ['FC Thun'],
  'Olympiacos': ['Olympiacos El Pireo'],
  'AEK Athens': ['AEK Atenas FC'],
  'Galatasaray': ['Galatasaray'],
  'Trabzonspor': ['Trabzonspor'],
  'Fenerbahçe': ['Fenerbahce'],
  'Beşiktaş': ['Besiktas JK'],
  'Bursaspor': ['Bursaspor'],
  'Aalborg': ['Aalborg BK'],
  'AaB': ['Aalborg BK'],
};

// Dataset league IDs that correspond to European top flights, used to prefer the
// right club when a source name token-matches several candidates.
const EURO_TOP_LEAGUE_IDS = new Set([
  'laliga', 'premier', 'seriea', 'bundesliga', 'ligue1', 'eredivisie',
  'primeiraLiga', 'belgianPro', 'superLig', 'scottishPrem', 'greekSuperLeague',
  'swissSuperLeague', 'austrianBundesliga', 'danishSuperliga', 'croatianLeague',
  'czechLeague',
]);

// Dataset league IDs that still sit in Europe (second tiers etc.). Used as a
// weaker preference signal than the top flights above.
const EURO_SECONDARY_LEAGUE_IDS = new Set([
  'laliga2', 'championship', 'serieB', 'bundesliga2', 'ligue2', 'eersteDivisie',
  'ligaPortugal2', 'russiaPremier', 'ukrainePremier', 'romaniaSuperliga',
  'hungaryNBI', 'ekstraklasa', 'eliteserien', 'allsvenskan',
]);

const EUROPEAN_COUNTRY_CODES = new Set([
  'ES', 'GB', 'SC', 'EN', 'WA', 'NI', 'IE', 'IT', 'DE', 'FR', 'NL', 'PT', 'BE',
  'TR', 'GR', 'CH', 'AT', 'DK', 'HR', 'CZ', 'NO', 'SE', 'PL', 'RU', 'UA', 'RO',
  'HU', 'RS', 'CY', 'IL', 'BG', 'BY', 'SK', 'SI', 'SCO',
]);

// Tokens that are club legal-forms / generic prefixes; dropped before comparing
// token sets so e.g. "Real Madrid CF" reaches equality with "Real Madrid".
const CLUB_AFFIXES = new Set([
  'fc', 'cf', 'ac', 'sc', 'sv', 'sk', 'ss', 'ssc', 'sl', 'cd', 'ca', 'as', 'aj',
  'ao', 'afc', 'bsc', 'vfb', 'vfl', 'fsv', 'fk', 'nk', 'gnk', 'hnk', 'bk', 'if',
  'gf', 'rc', 'rcd', 'ud', 'sd', 'kv', 'jk', 'kaa', 'krc', 'rsc', 'us', 'uc',
  'ogc', 'losc', 'tsg', 'sad', 'gd', 'scp', 'club', 'calcio',
]);

// Connector words dropped from token sets.
const STOPWORDS = new Set(['de', 'of', 'the', 'el', 'la', 'le', 'los', 'las', 'da', 'do', 'di', 'des', 'du', 'und']);

// ── Normalisation ────────────────────────────────────────────────────────────
export function normalizeClubName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/ß/g, 'ss')
    .replace(/&/g, ' ')
    .replace(/[​-‍﻿­]/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`.,/()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(name) {
  const norm = normalizeClubName(name);
  if (!norm) return [];
  return norm
    .split(' ')
    .filter((tok) => tok && !CLUB_AFFIXES.has(tok) && !STOPWORDS.has(tok));
}

function teamLeagueId(team) {
  return team?.leagueId || team?.league || team?.sourceLeagueId || team?.historicalLeagueId || team?.competitionId || '';
}

function euroLeagueScore(team) {
  const lid = teamLeagueId(team);
  if (EURO_TOP_LEAGUE_IDS.has(lid)) return 3;
  if (EURO_SECONDARY_LEAGUE_IDS.has(lid)) return 2;
  if (EUROPEAN_COUNTRY_CODES.has(team?.country)) return 1;
  return 0;
}

function teamStrength(team) {
  return team?.reputation ?? team?.overall ?? team?.avgOverall ?? 0;
}

// Higher comparator result = better candidate.
function compareCandidates(a, b, sourceTokenCount) {
  // 1. Fewest "extra" tokens vs the source (closest match wins; reserves lose).
  const extraA = Math.abs((a.tokens.length) - sourceTokenCount);
  const extraB = Math.abs((b.tokens.length) - sourceTokenCount);
  if (extraA !== extraB) return extraB - extraA;
  // 2. Prefer European top-flight clubs over secondary / non-European homonyms.
  const euroA = euroLeagueScore(a.team);
  const euroB = euroLeagueScore(b.team);
  if (euroA !== euroB) return euroA - euroB;
  // 3. Prefer the stronger club.
  const strA = teamStrength(a.team);
  const strB = teamStrength(b.team);
  if (strA !== strB) return strA - strB;
  // 4. Prefer higher market value.
  const mvA = a.team?.marketValue || 0;
  const mvB = b.team?.marketValue || 0;
  if (mvA !== mvB) return mvA - mvB;
  // 5. Prefer the better historical rank (lower is better).
  const rankA = a.team?.rank ?? 9999;
  const rankB = b.team?.rank ?? 9999;
  if (rankA !== rankB) return rankB - rankA;
  // 6. Prefer the shorter (less qualified) name.
  return (b.norm?.length || 0) - (a.norm?.length || 0);
}

function isSubset(small, big) {
  const set = new Set(big);
  return small.every((tok) => set.has(tok));
}

// Index a season's teams for matching.
function buildCandidateIndex(historicalTeams) {
  return (historicalTeams || []).map((team) => ({
    team,
    norm: normalizeClubName(team?.name || team?.teamName || ''),
    tokens: tokenize(team?.name || team?.teamName || ''),
  })).filter((c) => c.norm);
}

// Try to match one source club name against the season's candidate index.
// Returns the chosen candidate's team, or null when the real club is absent
// from the dataset (foreign leagues such as Russia/Ukraine/Cyprus/Israel...).
function matchParticipant(sourceName, candidates) {
  const searchNames = [sourceName, ...(CHAMPIONS_NAME_ALIASES[sourceName] || [])];

  // Build the (norm, tokens) for every search spelling once.
  const searches = searchNames.map((n) => ({
    norm: normalizeClubName(n),
    tokens: tokenize(n),
  })).filter((s) => s.norm);
  if (!searches.length) return null;

  const pickBest = (matched, tokenCountForCompare) => {
    if (!matched.length) return null;
    let best = matched[0];
    for (let i = 1; i < matched.length; i++) {
      if (compareCandidates(matched[i], best, tokenCountForCompare) > 0) best = matched[i];
    }
    return best.team;
  };

  // Tier 0: exact normalised full-string equality.
  for (const s of searches) {
    const hits = candidates.filter((c) => c.norm === s.norm);
    const best = pickBest(hits, s.tokens.length);
    if (best) return best;
  }
  // Tier 1: token-set equality (order-independent, affixes/stopwords stripped).
  for (const s of searches) {
    const key = [...s.tokens].sort().join(' ');
    const hits = candidates.filter((c) => [...c.tokens].sort().join(' ') === key);
    const best = pickBest(hits, s.tokens.length);
    if (best) return best;
  }
  // Tier 2: source tokens ⊆ candidate tokens (e.g. "Lyon" ⊆ "Olympique de Lyon").
  for (const s of searches) {
    if (!s.tokens.length) continue;
    const hits = candidates.filter((c) => isSubset(s.tokens, c.tokens));
    const best = pickBest(hits, s.tokens.length);
    if (best) return best;
  }
  // Tier 3: candidate tokens ⊆ source tokens (e.g. "Athletic Club" ⊆ "Athletic Bilbao").
  for (const s of searches) {
    if (!s.tokens.length) continue;
    const hits = candidates.filter((c) => c.tokens.length && isSubset(c.tokens, s.tokens));
    const best = pickBest(hits, s.tokens.length);
    if (best) return best;
  }
  // Tier 4: controlled substring fallback (guarded by length to avoid noise).
  for (const s of searches) {
    if (s.norm.length < 4) continue;
    const hits = candidates.filter((c) =>
      (c.norm.length >= 4) && (c.norm.includes(s.norm) || s.norm.includes(c.norm))
    );
    const best = pickBest(hits, s.tokens.length);
    if (best) return best;
  }
  return null;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the raw real participant names for a historical season (all of them,
 * including the 36 for 2024-25 / 2025-26), or [] if the season is unknown.
 */
export function getHistoricalChampionsParticipantNames(seasonId) {
  return CHAMPIONS_PARTICIPANTS_BY_SEASON[seasonId] || [];
}

/** Whether a season has a real Champions participant list available. */
export function hasHistoricalChampionsParticipants(seasonId) {
  return Array.isArray(CHAMPIONS_PARTICIPANTS_BY_SEASON[seasonId]) &&
    CHAMPIONS_PARTICIPANTS_BY_SEASON[seasonId].length > 0;
}

function slugify(name) {
  return normalizeClubName(name).replace(/\s+/g, '-') || 'club';
}

// Reputation/overall ramp for stub clubs (foreign leagues not in the dataset),
// decreasing with seeding order, with a floor.
function stubRating(index, total) {
  const top = 82;
  const bottom = 68;
  if (total <= 1) return 72;
  const ratio = index / (total - 1);
  return Math.round(top - (top - bottom) * ratio);
}

/**
 * Build the real Champions (Continental Champions Cup) field for a historical
 * season, ready for initializeEuropeanCompetitions.
 *
 * For each real participant: if the club exists in `historicalTeams` (that
 * season's dataset) it is reused with its real id / players / crest / league
 * metadata. If it does not (foreign leagues outside the dataset) a correctly
 * named stub is created — never a Placeholder and never a current-era club.
 *
 * @param {string} seasonId            e.g. "2009-10"
 * @param {Array}  historicalTeams     that season's team objects (dataset)
 * @param {Object} [options]
 * @param {number} [options.teamsCount=32]  engine field size (slices source order)
 * @param {Object} [options.allTeamsMap]    optional id→team map to enrich matches
 * @returns {Array} team objects ({ teamId, teamName, name, reputation, overall, players, ... })
 *                  or [] when the season has no source list.
 */
export function buildHistoricalChampionsLeagueTeams(seasonId, historicalTeams, options = {}) {
  const names = getHistoricalChampionsParticipantNames(seasonId);
  if (!names.length) return [];

  const teamsCount = options.teamsCount || DEFAULT_ENGINE_TEAMS;
  const allTeamsMap = options.allTeamsMap || null;
  const prioritySourceName = options.priorityTeamName || options.prioritySourceName || null;
  let selected = names.slice(0, teamsCount);
  if (prioritySourceName && !selected.includes(prioritySourceName) && names.includes(prioritySourceName)) {
    selected = [...selected.slice(0, Math.max(0, teamsCount - 1)), prioritySourceName];
  }

  const candidates = buildCandidateIndex(historicalTeams);
  const usedIds = new Set();
  const out = [];

  selected.forEach((sourceName, idx) => {
    const matched = matchParticipant(sourceName, candidates);

    if (matched) {
      const id = matched.id || matched.teamId;
      // Guard against the same dataset club being picked twice.
      if (id && !usedIds.has(id)) {
        usedIds.add(id);
        const enriched = (allTeamsMap && allTeamsMap[id]) ? { ...matched, ...allTeamsMap[id] } : matched;
        const rep = enriched.reputation ?? enriched.overall ?? enriched.avgOverall ?? 75;
        const ovr = enriched.overall ?? enriched.avgOverall ?? enriched.reputation ?? 75;
        out.push({
          ...enriched,
          teamId: id,
          id,
          teamName: enriched.name || enriched.teamName || sourceName,
          name: enriched.name || enriched.teamName || sourceName,
          shortName: enriched.shortName || '',
          league: teamLeagueId(enriched) || 'historicalChampions',
          leaguePosition: idx + 1,
          reputation: rep,
          overall: ovr,
          players: enriched.players || [],
          historicalChampionsSourceName: sourceName,
        });
        return;
      }
    }

    // Stub: real club not present in this dataset (foreign league). Stable id,
    // correct name, no players, decreasing rating by seeding order.
    const rating = stubRating(idx, selected.length);
    const id = `historical-ucl-${seasonId}-${slugify(sourceName)}`;
    out.push({
      teamId: id,
      id,
      teamName: sourceName,
      name: sourceName,
      shortName: '',
      league: 'historicalChampions',
      sourceLeagueId: 'historicalChampions',
      historicalLeagueId: 'historicalChampions',
      leaguePosition: idx + 1,
      reputation: rating,
      overall: rating,
      players: [],
      historicalChampionsStub: true,
      historicalChampionsSourceName: sourceName,
    });
  });

  return out;
}

export function buildHistoricalParticipantTeams(seasonId, sourceNames, historicalTeams, options = {}) {
  if (!Array.isArray(sourceNames) || !sourceNames.length) return [];

  const teamsCount = options.teamsCount || DEFAULT_ENGINE_TEAMS;
  const allTeamsMap = options.allTeamsMap || null;
  const aliases = options.aliases || {};
  const idPrefix = options.idPrefix || 'historical-euro';
  const leagueTag = options.leagueTag || 'historicalEurope';
  const sourceField = options.sourceField || 'historicalEuropeSourceName';
  const stubField = options.stubField || 'historicalEuropeStub';
  const prioritySourceName = options.priorityTeamName || options.prioritySourceName || null;
  const priorityTeamId = options.priorityTeamId || null;
  let selected = sourceNames.slice(0, teamsCount);

  if (prioritySourceName && !selected.includes(prioritySourceName) && sourceNames.includes(prioritySourceName)) {
    selected = [...selected.slice(0, Math.max(0, teamsCount - 1)), prioritySourceName];
  }

  const originalAliases = {};
  for (const [sourceName, aliasList] of Object.entries(aliases)) {
    originalAliases[sourceName] = CHAMPIONS_NAME_ALIASES[sourceName];
    CHAMPIONS_NAME_ALIASES[sourceName] = [
      ...(CHAMPIONS_NAME_ALIASES[sourceName] || []),
      ...(aliasList || [])
    ];
  }

  const candidates = buildCandidateIndex(historicalTeams);
  const usedIds = new Set();
  const out = [];

  try {
    selected.forEach((sourceName, idx) => {
      const matched = matchParticipant(sourceName, candidates);

      if (matched) {
        const id = matched.id || matched.teamId;
        if (id && !usedIds.has(id)) {
          usedIds.add(id);
          const enriched = (allTeamsMap && allTeamsMap[id]) ? { ...matched, ...allTeamsMap[id] } : matched;
          const rep = enriched.reputation ?? enriched.overall ?? enriched.avgOverall ?? 75;
          const ovr = enriched.overall ?? enriched.avgOverall ?? enriched.reputation ?? 75;
          out.push({
            ...enriched,
            teamId: id,
            id,
            teamName: enriched.name || enriched.teamName || sourceName,
            name: enriched.name || enriched.teamName || sourceName,
            shortName: enriched.shortName || '',
            league: teamLeagueId(enriched) || leagueTag,
            leaguePosition: idx + 1,
            reputation: rep,
            overall: ovr,
            players: enriched.players || [],
            [sourceField]: sourceName,
          });
          return;
        }
      }

      const rating = stubRating(idx, selected.length);
      const id = `${idPrefix}-${seasonId}-${slugify(sourceName)}`;
      out.push({
        teamId: id,
        id,
        teamName: sourceName,
        name: sourceName,
        shortName: '',
        league: leagueTag,
        sourceLeagueId: leagueTag,
        historicalLeagueId: leagueTag,
        leaguePosition: idx + 1,
        reputation: rating,
        overall: rating,
        players: [],
        [stubField]: true,
        [sourceField]: sourceName,
      });
    });

    if (priorityTeamId && out.length && !out.some((t) => (t.teamId || t.id) === priorityTeamId)) {
      // Only force the selected club into the 32-team engine slice when that
      // club is actually present in the historical source list. Without this
      // guard, any user-selected club from the season dataset would be injected
      // into UEFA/Europa even if it did not qualify historically.
      const prioritySourceNameFromList = sourceNames.find((sourceName) => {
        const matched = matchParticipant(sourceName, candidates);
        return (matched?.id || matched?.teamId) === priorityTeamId;
      });
      const priorityCandidate = prioritySourceNameFromList
        ? candidates.find((c) => (c.team?.id || c.team?.teamId) === priorityTeamId)?.team
        : null;
      if (priorityCandidate) {
        const id = priorityCandidate.id || priorityCandidate.teamId;
        const rep = priorityCandidate.reputation ?? priorityCandidate.overall ?? priorityCandidate.avgOverall ?? 75;
        out[out.length - 1] = {
          ...priorityCandidate,
          teamId: id,
          id,
          teamName: priorityCandidate.name || priorityCandidate.teamName || id,
          name: priorityCandidate.name || priorityCandidate.teamName || id,
          shortName: priorityCandidate.shortName || '',
          league: teamLeagueId(priorityCandidate) || leagueTag,
          leaguePosition: out.length,
          reputation: rep,
          overall: priorityCandidate.overall ?? priorityCandidate.avgOverall ?? rep,
          players: priorityCandidate.players || [],
          [sourceField]: prioritySourceNameFromList,
        };
      }
    }
  } finally {
    for (const [sourceName, aliasList] of Object.entries(originalAliases)) {
      if (aliasList === undefined) delete CHAMPIONS_NAME_ALIASES[sourceName];
      else CHAMPIONS_NAME_ALIASES[sourceName] = aliasList;
    }
  }

  return out;
}

export default {
  DEFAULT_ENGINE_TEAMS,
  CHAMPIONS_PARTICIPANTS_BY_SEASON,
  participantsBySeason,
  CHAMPIONS_NAME_ALIASES,
  normalizeClubName,
  getHistoricalChampionsParticipantNames,
  hasHistoricalChampionsParticipants,
  buildHistoricalChampionsLeagueTeams,
  buildHistoricalParticipantTeams,
};
