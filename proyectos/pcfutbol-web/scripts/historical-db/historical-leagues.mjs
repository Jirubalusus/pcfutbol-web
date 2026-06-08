#!/usr/bin/env node
/** Shared historical league config for PC Gaffer historical DB tooling. */

export const MAJOR_LEAGUE_KEYS = new Set(['laliga', 'premier', 'bundesliga', 'seriea', 'ligue1']);

export const HISTORICAL_LEAGUES = [
  { key: 'laliga', name: 'LaLiga', tmId: 'ES1', slug: 'laliga', country: 'ES', tier: 1, priority: 'major' },
  { key: 'laliga2', name: 'LaLiga 2', tmId: 'ES2', slug: 'segunda-division', country: 'ES', tier: 2, priority: 'secondary' },
  // 2ªB is the historical tier-3 equivalent of today's Primera RFEF. Keep the
  // canonical group ids so UI filters/counts can aggregate them as Primera Federación.
  { key: 'primeraRfefG1', name: 'Segunda División B G1', tmId: 'ES3A', slug: 'segunda-division-b-grupo-i', country: 'ES', tier: 3, priority: 'minor', maxSeason: 2020 },
  { key: 'primeraRfefG2', name: 'Segunda División B G2', tmId: 'ES3B', slug: 'segunda-division-b-grupo-ii', country: 'ES', tier: 3, priority: 'minor', maxSeason: 2020 },
  { key: 'primeraRfefG3', name: 'Segunda División B G3', tmId: 'ES3C', slug: 'segunda-division-b-grupo-iii', country: 'ES', tier: 3, priority: 'minor', maxSeason: 2020 },
  { key: 'primeraRfefG4', name: 'Segunda División B G4', tmId: 'ES3D', slug: 'segunda-division-b-grupo-iv', country: 'ES', tier: 3, priority: 'minor', maxSeason: 2020 },
  { key: 'primeraRfefG1', name: 'Primera Federación G1', tmId: 'E3G1', slug: 'primera-federacion-grupo-1', country: 'ES', tier: 3, priority: 'minor', minSeason: 2021 },
  { key: 'primeraRfefG2', name: 'Primera Federación G2', tmId: 'E3G2', slug: 'primera-federacion-grupo-2', country: 'ES', tier: 3, priority: 'minor', minSeason: 2021 },
  { key: 'segundaRfefG1', name: 'Segunda Federación G1', tmId: 'E4G1', slug: 'segunda-federacion-grupo-1', country: 'ES', tier: 4, priority: 'minor', minSeason: 2021 },
  { key: 'segundaRfefG2', name: 'Segunda Federación G2', tmId: 'E4G2', slug: 'segunda-federacion-grupo-2', country: 'ES', tier: 4, priority: 'minor', minSeason: 2021 },
  { key: 'segundaRfefG3', name: 'Segunda Federación G3', tmId: 'E4G3', slug: 'segunda-federacion-grupo-3', country: 'ES', tier: 4, priority: 'minor', minSeason: 2021 },
  { key: 'segundaRfefG4', name: 'Segunda Federación G4', tmId: 'E4G4', slug: 'segunda-federacion-grupo-4', country: 'ES', tier: 4, priority: 'minor', minSeason: 2021 },
  { key: 'segundaRfefG5', name: 'Segunda Federación G5', tmId: 'E4G5', slug: 'segunda-federacion-grupo-5', country: 'ES', tier: 4, priority: 'minor', minSeason: 2021 },
  { key: 'premier', name: 'Premier League', tmId: 'GB1', slug: 'premier-league', country: 'GB', tier: 1, priority: 'major' },
  { key: 'championship', name: 'Championship', tmId: 'GB2', slug: 'championship', country: 'GB', tier: 2, priority: 'secondary' },
  { key: 'bundesliga', name: 'Bundesliga', tmId: 'L1', slug: 'bundesliga', country: 'DE', tier: 1, priority: 'major' },
  { key: 'bundesliga2', name: '2. Bundesliga', tmId: 'L2', slug: '2-bundesliga', country: 'DE', tier: 2, priority: 'secondary' },
  { key: 'seriea', name: 'Serie A', tmId: 'IT1', slug: 'serie-a', country: 'IT', tier: 1, priority: 'major' },
  { key: 'serieB', name: 'Serie B', tmId: 'IT2', slug: 'serie-b', country: 'IT', tier: 2, priority: 'secondary' },
  { key: 'ligue1', name: 'Ligue 1', tmId: 'FR1', slug: 'ligue-1', country: 'FR', tier: 1, priority: 'major' },
  { key: 'ligue2', name: 'Ligue 2', tmId: 'FR2', slug: 'ligue-2', country: 'FR', tier: 2, priority: 'secondary' },
  { key: 'eredivisie', name: 'Eredivisie', tmId: 'NL1', slug: 'eredivisie', country: 'NL', tier: 1, priority: 'secondary' },
  { key: 'primeiraLiga', name: 'Primeira Liga', tmId: 'PO1', slug: 'liga-portugal-betclic', country: 'PT', tier: 1, priority: 'secondary' },
  { key: 'belgianPro', name: 'Jupiler Pro League', tmId: 'BE1', slug: 'jupiler-pro-league', country: 'BE', tier: 1, priority: 'secondary' },
  { key: 'superLig', name: 'Süper Lig', tmId: 'TR1', slug: 'super-lig', country: 'TR', tier: 1, priority: 'secondary' },
  { key: 'scottishPrem', name: 'Scottish Premiership', tmId: 'SC1', slug: 'scottish-premiership', country: 'SC', tier: 1, priority: 'secondary' },
  { key: 'swissSuperLeague', name: 'Swiss Super League', tmId: 'C1', slug: 'super-league', country: 'CH', tier: 1, priority: 'minor' },
  { key: 'austrianBundesliga', name: 'Bundesliga Austria', tmId: 'A1', slug: 'bundesliga', country: 'AT', tier: 1, priority: 'minor' },
  { key: 'greekSuperLeague', name: 'Greek Super League', tmId: 'GR1', slug: 'super-league-1', country: 'GR', tier: 1, priority: 'minor' },
  { key: 'danishSuperliga', name: 'Danish Superliga', tmId: 'DK1', slug: 'superligaen', country: 'DK', tier: 1, priority: 'minor' },
  { key: 'croatianLeague', name: 'HNL Croatia', tmId: 'KR1', slug: 'hrvatska-nogometna-liga', country: 'HR', tier: 1, priority: 'minor' },
  { key: 'czechLeague', name: 'Czech Chance Liga', tmId: 'TS1', slug: 'chance-liga', country: 'CZ', tier: 1, priority: 'minor' },
  { key: 'argentinaPrimera', name: 'Argentina Primera', tmId: 'ARG1', slug: 'torneo-apertura', country: 'AR', tier: 1, priority: 'secondary' },
  { key: 'brasileiraoA', name: 'Brasileirão Série A', tmId: 'BRA1', slug: 'campeonato-brasileiro-serie-a', country: 'BR', tier: 1, priority: 'secondary' },
  { key: 'colombiaPrimera', name: 'Colombia Primera', tmId: 'COL1', slug: 'liga-betplay', country: 'CO', tier: 1, priority: 'minor' },
  { key: 'chilePrimera', name: 'Chile Primera', tmId: 'CLPD', slug: 'liga-de-primera', country: 'CL', tier: 1, priority: 'minor' },
  { key: 'uruguayPrimera', name: 'Uruguay Primera', tmId: 'URU1', slug: 'liga-auf-apertura', country: 'UY', tier: 1, priority: 'minor' },
  { key: 'ecuadorLigaPro', name: 'Ecuador LigaPro', tmId: 'EC1N', slug: 'ligapro-serie-a', country: 'EC', tier: 1, priority: 'minor' },
  { key: 'paraguayPrimera', name: 'Paraguay Primera', tmId: 'PR1A', slug: 'primera-division-apertura', country: 'PY', tier: 1, priority: 'minor' },
  { key: 'peruLiga1', name: 'Perú Liga 1', tmId: 'TDeA', slug: 'liga-1-apertura', country: 'PE', tier: 1, priority: 'minor' },
  { key: 'boliviaPrimera', name: 'Bolivia Primera', tmId: 'BO1A', slug: 'division-profesional', country: 'BO', tier: 1, priority: 'minor' },
  { key: 'venezuelaPrimera', name: 'Venezuela Liga FUTVE', tmId: 'VZ1A', slug: 'liga-futve-apertura', country: 'VE', tier: 1, priority: 'minor' },
  { key: 'mls', name: 'MLS', tmId: 'MLS1', slug: 'major-league-soccer', country: 'US', tier: 1, priority: 'minor' },
  { key: 'ligaMx', name: 'Liga MX', tmId: 'MEX1', slug: 'liga-mx-clausura', country: 'MX', tier: 1, priority: 'minor' },
  { key: 'jleague', name: 'J1 League', tmId: 'JAP1', slug: 'j1-league', country: 'JP', tier: 1, priority: 'minor' },
  { key: 'saudiPro', name: 'Saudi Pro League', tmId: 'SA1', slug: 'saudi-professional-league', country: 'SA', tier: 1, priority: 'minor' }
];

export function seasonLabel(startYear) {
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

export function transfermarktLeagueUrl(league, season) {
  return `https://www.transfermarkt.es/${league.slug}/startseite/wettbewerb/${league.tmId}/plus/?saison_id=${season}`;
}

export function transfermarktSquadUrl(teamUrl, season) {
  return teamUrl.replace('/startseite/', '/kader/') + `/saison_id/${season}`;
}

export function isLeagueApplicable(league, season) {
  if (league.minSeason && season < league.minSeason) return false;
  if (league.maxSeason && season > league.maxSeason) return false;
  return true;
}

export function getLeagueByKey(key) {
  return HISTORICAL_LEAGUES.find((league) => league.key === key);
}
