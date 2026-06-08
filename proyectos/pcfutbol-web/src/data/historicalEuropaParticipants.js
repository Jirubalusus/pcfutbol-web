import {
  DEFAULT_ENGINE_TEAMS,
  CHAMPIONS_NAME_ALIASES,
  buildHistoricalParticipantTeams,
} from './historicalChampionsParticipants.js';

export const EUROPA_PARTICIPANTS_BY_SEASON = {
  '2007-08': [
    'Atlético Madrid', 'Villarreal', 'Getafe', 'Real Zaragoza',
    'Bayern Munich', 'Tottenham Hotspur', 'Everton', 'Zenit Saint Petersburg',
    'Fiorentina', 'Bayer Leverkusen', 'Hamburg', 'Galatasaray',
    'Anderlecht', 'Panathinaikos', 'Lokomotiv Moscow', 'Basel',
    'Spartak Moscow', 'Sparta Prague', 'Bordeaux', 'Austria Wien',
    'Bolton Wanderers', 'Braga', 'Red Star Belgrade', 'AZ',
    'Nürnberg', 'Copenhagen', 'AEK Athens', 'Rennes',
    'Dinamo Zagreb', 'Toulouse', 'Zürich', 'Aberdeen',
    'Aalborg', 'Helsingborg', 'Aris', 'Brann',
    'Mladá Boleslav', 'Elfsborg', 'Hapoel Tel Aviv', 'Larissa'
  ],
  '2005-06': [
    'Sevilla', 'Espanyol', 'Osasuna', 'Middlesbrough',
    'Roma', 'Palermo', 'Hamburg', 'Hertha Berlin',
    'Marseille', 'Lens', 'Monaco', 'Strasbourg',
    'Feyenoord', 'AZ', 'Heerenveen', 'Twente',
    'CSKA Moscow', 'Zenit Saint Petersburg', 'Lokomotiv Moscow', 'Basel',
    'Red Star Belgrade', 'Steaua București', 'Rapid București', 'Shakhtar Donetsk',
    'Dynamo Kyiv', 'Galatasaray', 'Beşiktaş', 'Braga',
    'Vitória Guimarães', 'Halmstad', 'Viking', 'Levski Sofia'
  ]
};

export const EUROPA_NAME_ALIASES = {
  ...CHAMPIONS_NAME_ALIASES,
  Hamburg: ['Hamburgo SV', 'Hamburger SV'],
  Nürnberg: ['1. FC Nürnberg', 'Núremberg'],
  Rennes: ['Stade Rennais'],
  Toulouse: ['Toulouse FC'],
  Aberdeen: ['Aberdeen FC'],
  Helsingborg: ['Helsingborgs IF'],
  Aris: ['Aris Salónica'],
  Brann: ['SK Brann'],
  'Mladá Boleslav': ['FK Mladá Boleslav'],
  Elfsborg: ['IF Elfsborg'],
  Larissa: ['AEL Larissa'],
  Espanyol: ['RCD Espanyol'],
  Osasuna: ['CA Osasuna'],
  Middlesbrough: ['Middlesbrough FC'],
  Palermo: ['US Palermo'],
  Strasbourg: ['RC Strasbourg'],
  Feyenoord: ['Feyenoord Rotterdam'],
  Heerenveen: ['SC Heerenveen'],
  'Rapid București': ['Rapid Bucarest'],
  'Vitória Guimarães': ['Vitoria Guimaraes'],
  Halmstad: ['Halmstads BK'],
  Viking: ['Viking FK'],
  'Levski Sofia': ['PFC Levski Sofia'],
};

export function getHistoricalEuropaParticipantNames(seasonId) {
  return EUROPA_PARTICIPANTS_BY_SEASON[seasonId] || [];
}

export function hasHistoricalEuropaParticipants(seasonId) {
  return getHistoricalEuropaParticipantNames(seasonId).length > 0;
}

export function buildHistoricalEuropaLeagueTeams(seasonId, historicalTeams, options = {}) {
  const names = getHistoricalEuropaParticipantNames(seasonId);
  if (!names.length) return [];

  return buildHistoricalParticipantTeams(seasonId, names, historicalTeams, {
    teamsCount: options.teamsCount || DEFAULT_ENGINE_TEAMS,
    allTeamsMap: options.allTeamsMap,
    aliases: EUROPA_NAME_ALIASES,
    idPrefix: 'historical-uefa',
    leagueTag: 'historicalUefaCup',
    sourceField: 'historicalEuropaSourceName',
    stubField: 'historicalEuropaStub',
    priorityTeamId: options.priorityTeamId,
    priorityTeamName: options.priorityTeamName,
  });
}

export default {
  EUROPA_PARTICIPANTS_BY_SEASON,
  EUROPA_NAME_ALIASES,
  getHistoricalEuropaParticipantNames,
  hasHistoricalEuropaParticipants,
  buildHistoricalEuropaLeagueTeams,
};
