const DEFAULT_MINIMUM_PLAYERS = 18;

const POSITION_TEMPLATE = [
  'GK', 'GK',
  'RB', 'CB', 'CB', 'LB', 'CB', 'LB',
  'CDM', 'CM', 'CM', 'CAM', 'CM', 'CDM',
  'RW', 'LW', 'ST', 'ST',
  'CB', 'CM', 'RW', 'LW', 'ST'
];

const COUNTRY_NAME_POOLS = {
  ES: {
    first: ['Álvaro', 'Diego', 'Javier', 'Miguel', 'Sergio', 'David', 'Iván', 'Raúl', 'Óscar', 'Pablo', 'José', 'Antonio'],
    last: ['García', 'Martínez', 'López', 'Sánchez', 'Fernández', 'González', 'Rodríguez', 'Pérez', 'Romero', 'Jiménez', 'Moreno', 'Ruiz'],
    nationality: 'España'
  },
  AR: {
    first: ['Nicolás', 'Matías', 'Federico', 'Gonzalo', 'Lucas', 'Juan', 'Franco', 'Agustín'],
    last: ['Gómez', 'Fernández', 'Rodríguez', 'López', 'Martínez', 'Pérez', 'Sosa', 'Díaz'],
    nationality: 'Argentina'
  },
  BR: {
    first: ['João', 'Lucas', 'Gabriel', 'Rafael', 'Bruno', 'Felipe', 'André', 'Thiago'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Lima', 'Ferreira'],
    nationality: 'Brasil'
  },
  DEFAULT: {
    first: ['Daniel', 'Marco', 'Luis', 'Carlos', 'Andrés', 'Mateo', 'Alex', 'Bruno'],
    last: ['García', 'Martínez', 'Silva', 'Costa', 'López', 'Pérez', 'Rossi', 'Müller'],
    nationality: 'Desconocida'
  }
};

function hashString(value) {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(list, seed) {
  return list[seed % list.length];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function inferBaseOverall(team) {
  const tier = Number(team?.tier) || 4;
  const fromTeam = Number(team?.avgOverall || team?.overall || team?.reputation);
  if (Number.isFinite(fromTeam) && fromTeam > 0) return clamp(Math.round(fromTeam), 45, 88);
  return clamp(78 - ((tier - 1) * 4), 54, 78);
}

function createHistoricalRosterFiller(team, seasonId, index, existingCount) {
  const countryPool = COUNTRY_NAME_POOLS[team?.country] || COUNTRY_NAME_POOLS.DEFAULT;
  const seed = hashString(`${seasonId}:${team?.id || team?.name}:${index}:${existingCount}`);
  const position = POSITION_TEMPLATE[(existingCount + index) % POSITION_TEMPLATE.length];
  const baseOverall = inferBaseOverall(team);
  const variance = (seed % 9) - 4;
  const overall = clamp(baseOverall + variance, 45, 84);
  const age = 19 + ((seed >>> 4) % 14);
  const firstName = pick(countryPool.first, seed >>> 8);
  const lastName = pick(countryPool.last, seed >>> 16);
  const name = `${firstName} ${lastName}`;

  return {
    id: `hist-fill-${seasonId}-${team?.id || hashString(team?.name)}-${index + 1}`,
    name,
    position,
    age,
    overall,
    potential: clamp(overall + 3 + ((seed >>> 20) % 8), overall, 88),
    nationality: countryPool.nationality,
    value: Math.max(50_000, Math.round(overall * overall * 7000)),
    salary: Math.max(900, Math.round(900 + (overall * overall * 1.8))),
    contractYears: 2 + (seed % 3),
    teamId: team?.id,
    isHistoricalRosterFiller: true,
    source: 'historical-roster-repair'
  };
}

export function ensureHistoricalRosterCoverage(teams, options = {}) {
  const minimumPlayers = options.minimumPlayers || DEFAULT_MINIMUM_PLAYERS;
  const seasonId = options.seasonId || 'historical';

  if (!Array.isArray(teams)) return [];

  return teams.map((team) => {
    const currentPlayers = Array.isArray(team?.players) ? team.players.filter(Boolean) : [];
    if (currentPlayers.length >= minimumPlayers) {
      return {
        ...team,
        players: currentPlayers,
        playerCount: Math.max(team.playerCount || 0, currentPlayers.length)
      };
    }

    const missing = minimumPlayers - currentPlayers.length;
    const fillers = Array.from({ length: missing }, (_, index) =>
      createHistoricalRosterFiller(team, seasonId, index, currentPlayers.length)
    );
    const players = [...currentPlayers, ...fillers];

    return {
      ...team,
      players,
      playerIds: players.map((player) => player.id).filter(Boolean),
      playerCount: players.length,
      historicalRosterRepaired: true,
      historicalRosterOriginalCount: currentPlayers.length
    };
  });
}
