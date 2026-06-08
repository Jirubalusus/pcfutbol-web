export function normalizeHistoricalIdentityKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(real|rcd|rc|cd|cf|ca|sd|ud|fc|club|de|del|la|el)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeTeamAssetKey(value) {
  return normalizeHistoricalIdentityKey(value);
}

function getEditionTeamEntry(edition, team) {
  if (!edition?.teams || !team) return null;

  const directKeys = Array.from(new Set([
    team.id,
    team.name,
    team.originalName,
    team.publicName,
    team.displayName,
    team.slug,
    ...(Array.isArray(team.crestLookupKeys) ? team.crestLookupKeys : []),
    ...(Array.isArray(team.identity?.crestLookupKeys) ? team.identity.crestLookupKeys : [])
  ].filter(Boolean)));

  for (const key of directKeys) {
    if (edition.teams[key]) return edition.teams[key];
  }

  const normalizedKeys = new Set(directKeys.map(normalizeHistoricalIdentityKey).filter(Boolean));
  for (const [editionKey, entry] of Object.entries(edition.teams)) {
    const entryKeys = [
      editionKey,
      entry?.name,
      entry?.shortName,
      entry?.teamName,
      entry?.officialName
    ].map(normalizeHistoricalIdentityKey).filter(Boolean);

    if (entryKeys.some((key) => normalizedKeys.has(key))) return entry;
  }

  return null;
}

function getEditionPlayerName(editionTeam, player) {
  if (!editionTeam?.players || !player) return null;

  const directKeys = Array.from(new Set([
    player.name,
    player.originalName,
    player.publicName,
    player.displayName,
    player.identity?.originalName,
    player.identity?.publicName
  ].filter(Boolean)));

  for (const key of directKeys) {
    const value = editionTeam.players[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  const normalizedKeys = new Set(directKeys.map(normalizeHistoricalIdentityKey).filter(Boolean));
  for (const [key, value] of Object.entries(editionTeam.players)) {
    if (normalizedKeys.has(normalizeHistoricalIdentityKey(key)) && typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
}

const FIRST_NAMES = [
  'Adrián', 'Bruno', 'César', 'Damián', 'Enzo', 'Fabián', 'Gael', 'Hugo', 'Iván', 'Jairo',
  'Leo', 'Marco', 'Nico', 'Óscar', 'Pablo', 'Raúl', 'Sergio', 'Tomás', 'Unai', 'Víctor',
  'Álex', 'Darío', 'Iker', 'Mario', 'Rubén', 'Saúl', 'Thiago', 'Yago', 'Joel', 'Mauro'
];

const LAST_NAMES = [
  'Aranda', 'Beltrán', 'Carmona', 'Delgado', 'Escobar', 'Ferrer', 'Galván', 'Herrero', 'Iglesias', 'Jiménez',
  'Luna', 'Molina', 'Navarro', 'Ortega', 'Paredes', 'Quintana', 'Rivas', 'Santos', 'Torres', 'Valverde',
  'Aguilar', 'Benítez', 'Crespo', 'Domínguez', 'Fuentes', 'Ledesma', 'Miralles', 'Núñez', 'Ponce', 'Romero'
];

function hashString(value) {
  const str = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function playerPositionBucket(position) {
  const value = String(position || '').toUpperCase();
  if (value.includes('GK') || value.includes('POR')) return 'GK';
  if (value.includes('CB') || value.includes('LB') || value.includes('RB') || value.includes('DEF') || value.includes('DFC') || value.includes('LAT')) return 'DEF';
  if (value.includes('ST') || value.includes('CF') || value.includes('LW') || value.includes('RW') || value.includes('DEL') || value.includes('EXT')) return 'FWD';
  return 'MID';
}

export function getHistoricalPlayerAlias(player, seasonId = 'historical') {
  const hash = hashString(`${seasonId}:${player?.id || player?.name || 'player'}:${player?.position || ''}`);
  const bucket = playerPositionBucket(player?.position);
  const firstSalt = { GK: 3, DEF: 7, MID: 11, FWD: 17 }[bucket] || 0;
  const lastAIndex = hash % LAST_NAMES.length;
  const lastBIndex = Math.floor(hash / LAST_NAMES.length) % LAST_NAMES.length;
  const firstIndex = (Math.floor(hash / (LAST_NAMES.length * LAST_NAMES.length)) + firstSalt) % FIRST_NAMES.length;
  const first = FIRST_NAMES[firstIndex];
  const lastA = LAST_NAMES[lastAIndex];
  const lastB = LAST_NAMES[lastBIndex];
  return lastA === lastB ? `${first} ${lastA}` : `${first} ${lastA} ${lastB}`;
}

function getTeamIdentity(team, seasonId) {
  const teamName = team?.name || 'Equipo histórico';
  const lookupKeys = Array.from(new Set([
    team?.id,
    team?.slug,
    team?.source?.id,
    teamName,
    normalizeTeamAssetKey(teamName),
    normalizeTeamAssetKey(team?.slug),
  ].filter(Boolean)));

  return {
    source: 'historical-transfermarkt',
    seasonId,
    publicName: teamName,
    displayName: teamName,
    originalName: teamName,
    crestSeed: `${seasonId}:${team?.id || teamName}`,
    crestLookupKeys: lookupKeys,
    fictionalized: false
  };
}

export function applyHistoricalIdentities(dataset, seasonId, options = {}) {
  if (!dataset) return dataset;

  const { edition = null, revealOriginalNames = false } = options;
  const players = (dataset.players || []).map((player) => {
    const originalName = player.name || 'Jugador histórico';
    const alias = getHistoricalPlayerAlias(player, seasonId);
    const publicName = revealOriginalNames ? originalName : alias;

    return {
      ...player,
      name: publicName,
      displayName: publicName,
      publicName,
      originalName,
      identity: {
        source: revealOriginalNames ? 'active-edition-original-historical-name' : 'deterministic-historical-alias-v1',
        seasonId,
        originalName,
        publicName,
        aliasName: alias,
        fictionalized: !revealOriginalNames
      }
    };
  });

  const playersById = new Map(players.map((player) => [player.id, player]));
  const teams = (dataset.teams || []).map((team) => {
    const identity = getTeamIdentity(team, seasonId);
    const editionTeam = getEditionTeamEntry(edition, { ...team, ...identity });
    const teamPublicName = editionTeam?.name || editionTeam?.officialName || identity.publicName;

    const teamPlayers = (team.players || [])
      .map((player) => {
        const resolvedPlayer = playersById.get(player.id) || player;
        const editionName = getEditionPlayerName(editionTeam, resolvedPlayer);
        if (!editionName) return resolvedPlayer;
        return {
          ...resolvedPlayer,
          name: editionName,
          displayName: editionName,
          publicName: editionName,
          identity: {
            ...(resolvedPlayer.identity || {}),
            publicName: editionName,
            source: 'active-edition-player-name',
            fictionalized: false
          }
        };
      })
      .filter(Boolean);

    return {
      ...team,
      name: teamPublicName,
      shortName: editionTeam?.shortName || team.shortName,
      stadium: editionTeam?.stadium || team.stadium,
      displayName: teamPublicName,
      publicName: teamPublicName,
      originalName: identity.originalName,
      crestSeed: identity.crestSeed,
      crestLookupKeys: Array.from(new Set([
        ...(identity.crestLookupKeys || []),
        editionTeam?.name,
        editionTeam?.shortName,
        editionTeam?.officialName,
        teamPublicName
      ].filter(Boolean))),
      identity: {
        ...identity,
        publicName: teamPublicName,
        displayName: teamPublicName,
        editionApplied: Boolean(editionTeam)
      },
      players: teamPlayers
    };
  });

  const teamPlayersById = new Map();
  for (const team of teams) {
    for (const player of team.players || []) {
      teamPlayersById.set(player.id, player);
    }
  }

  return {
    ...dataset,
    players: players.map((player) => teamPlayersById.get(player.id) || player),
    teams,
    identityMode: revealOriginalNames ? 'historical_official_names_with_active_edition_v1' : 'historical_public_aliases_v1'
  };
}

export function getTeamDisplayName(team) {
  return team?.displayName || team?.publicName || team?.name || team?.teamName || 'Equipo';
}

export function getPlayerDisplayName(player) {
  return player?.displayName || player?.publicName || player?.name || 'Jugador';
}
