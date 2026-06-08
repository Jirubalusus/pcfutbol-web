// Central registry for league IDs used by current data, historical datasets and UI.
// Keep IDs canonical at game-state boundaries to avoid mixing e.g. segunda/laliga2.

export const LEAGUE_ALIASES = {
  // Spain
  segunda: 'segunda',
  laliga2: 'segunda',
  laLiga2: 'segunda',
  laliga: 'laliga',

  // England
  premierLeague: 'premier',
  premier: 'premier',

  // Italy
  serieA: 'seriea',
  seriea: 'seriea',

  // Rest of world naming drift
  ligaMX: 'ligaMx',
  ligaMx: 'ligaMx',
  jLeague: 'jleague',
  jleague: 'jleague',

  // Stable pass-through ids
  primeraRFEF: 'primeraRFEF',
  primeraRfefG1: 'primeraRFEF',
  primeraRfefG2: 'primeraRFEF',
  primeraRfefG3: 'primeraRFEF',
  primeraRfefG4: 'primeraRFEF',
  segundaRFEF: 'segundaRFEF',
  segundaRfefG1: 'segundaRFEF',
  segundaRfefG2: 'segundaRFEF',
  segundaRfefG3: 'segundaRFEF',
  segundaRfefG4: 'segundaRFEF',
  segundaRfefG5: 'segundaRFEF',
  bundesliga: 'bundesliga',
  bundesliga2: 'bundesliga2',
  ligue1: 'ligue1',
  ligue2: 'ligue2',
  championship: 'championship',
  eredivisie: 'eredivisie',
  primeiraLiga: 'primeiraLiga',
  belgianPro: 'belgianPro',
  superLig: 'superLig',
  scottishPrem: 'scottishPrem',
  serieB: 'serieB',
  swissSuperLeague: 'swissSuperLeague',
  austrianBundesliga: 'austrianBundesliga',
  greekSuperLeague: 'greekSuperLeague',
  danishSuperliga: 'danishSuperliga',
  croatianLeague: 'croatianLeague',
  czechLeague: 'czechLeague',
  argentinaPrimera: 'argentinaPrimera',
  brasileiraoA: 'brasileiraoA',
  colombiaPrimera: 'colombiaPrimera',
  chilePrimera: 'chilePrimera',
  uruguayPrimera: 'uruguayPrimera',
  ecuadorLigaPro: 'ecuadorLigaPro',
  paraguayPrimera: 'paraguayPrimera',
  peruLiga1: 'peruLiga1',
  boliviaPrimera: 'boliviaPrimera',
  venezuelaPrimera: 'venezuelaPrimera',
  mls: 'mls',
  saudiPro: 'saudiPro',
};

export function normalizeLeagueId(leagueId) {
  if (!leagueId) return leagueId;
  return LEAGUE_ALIASES[leagueId] || leagueId;
}

export function leagueIdsEquivalent(a, b) {
  return normalizeLeagueId(a) === normalizeLeagueId(b);
}

export function getTeamLeagueId(team) {
  return normalizeLeagueId(team?.leagueId || team?.league || team?.competitionId);
}

export function getTeamExactLeagueId(team) {
  return team?.leagueId || team?.league || team?.competitionId;
}

export function getTeamsInLeague(teams = [], leagueId) {
  const canonical = normalizeLeagueId(leagueId);
  return (teams || []).filter(team => getTeamLeagueId(team) === canonical);
}

export function getTeamsInExactLeague(teams = [], leagueId) {
  return (teams || []).filter(team => getTeamExactLeagueId(team) === leagueId);
}

export function countTeamsInLeague(teams = [], leagueId) {
  return getTeamsInLeague(teams, leagueId).length;
}

export function hasTeamsInLeague(teams = [], leagueId) {
  return countTeamsInLeague(teams, leagueId) > 0;
}
