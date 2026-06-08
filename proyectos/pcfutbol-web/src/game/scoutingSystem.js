// ============================================================
// SISTEMA DE OJEADOR (SCOUTING)
// ============================================================
// Genera sugerencias de fichajes basadas en necesidades del equipo

import { calculateMarketValue, TEAM_PROFILES } from './globalTransferEngine';
import { getClubTier, calculateTransferDifficulty, PLAYER_PERSONALITIES, assignPersonality } from './transferNegotiation';
import { posToEN } from './positionNames';
import { getTeamsInLeague, normalizeLeagueId, getTeamLeagueId } from '../data/leagueRegistry';

// ============================================================
// CONFIGURACIÓN DEL OJEADOR
// ============================================================

// Niveles del ojeador 1-4 (Local / Regional / Nacional / Mundial).
// El nivel se deriva del club (scoutLevel 1-4). El índice 0 se mantiene como
// alias de nivel 1 para no romper llamadas antiguas (facilities zero-indexed).
export const SCOUTING_LEVELS = {
  1: {
    level: 1,
    name: 'Ojeador Local',
    stage: 'Local',
    description: 'Busca jugadores en tu propia liga',
    scopeLabel: 'Solo tu liga',
    accuracy: 0.5,
    maxSuggestions: 12,
    features: ['Posición a buscar']
  },
  2: {
    level: 2,
    name: 'Ojeador Regional',
    stage: 'Regional',
    description: 'Amplía con rango de edad y presupuesto',
    scopeLabel: 'Liga + filiales',
    accuracy: 0.7,
    maxSuggestions: 16,
    features: ['Posición', 'Rango de edad', 'Presupuesto y valor']
  },
  3: {
    level: 3,
    name: 'Ojeador Nacional',
    stage: 'Nacional',
    description: 'Filtra por origen, media y atributos clave',
    scopeLabel: 'Mercado global',
    accuracy: 0.85,
    maxSuggestions: 20,
    features: ['Región de origen', 'Media mínima', 'Atributos clave']
  },
  4: {
    level: 4,
    name: 'Ojeador Mundial',
    stage: 'Mundial',
    description: 'Descubre potencial, joyas y perfil físico',
    scopeLabel: 'Mercado global',
    accuracy: 0.95,
    maxSuggestions: 24,
    features: ['Potencial y joyas', 'Perfil físico', 'Comparar con plantilla']
  }
};
// Alias defensivo: nivel 0 (facilities sin mejorar) se trata como nivel 1.
SCOUTING_LEVELS[0] = SCOUTING_LEVELS[1];

// ============================================================
// FILTROS DEL OJEADOR (cada uno con su minLevel de desbloqueo)
// ============================================================

export const SCOUT_FILTERS = [
  { key: 'position',  minLevel: 1 },
  { key: 'age',       minLevel: 2 },
  { key: 'budget',    minLevel: 2 },
  { key: 'region',    minLevel: 3 },
  { key: 'ovr',       minLevel: 3 },
  { key: 'attrs',     minLevel: 3 },
  { key: 'potential', minLevel: 4 },
  { key: 'physique',  minLevel: 4 },
  { key: 'compare',   minLevel: 4 }
];

export const SCOUT_CONTINENTS = ['Europa', 'Sudamérica', 'África', 'Norteamérica', 'Asia'];
export const SCOUT_ATTRIBUTES = ['Velocidad', 'Regate', 'Pase', 'Tiro', 'Defensa', 'Físico'];

/** ¿Está desbloqueado un filtro para el nivel actual? */
export function isFilterUnlocked(level, minLevel) {
  return (Number(level) || 1) >= (Number(minLevel) || 1);
}

/** Cuántas de las 9 opciones están activas en un nivel dado. */
export function countActiveFilters(level) {
  return SCOUT_FILTERS.filter(f => isFilterUnlocked(level, f.minLevel)).length;
}

// ============================================================
// FALLBACKS DETERMINISTAS (potencial, pie, altura, región, atributos)
// ============================================================
// Los datos de jugador suelen traer solo name/position/age/overall/value.
// Estos helpers sintetizan el resto de forma estable (sin Math.random) para
// que la UI nunca rompa y los resultados sean reproducibles.

function scoutHash(str) {
  let h = 2166136261;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function playerSeed(player) {
  return scoutHash(`${player?.id ?? ''}:${player?.name ?? ''}:${player?.position ?? ''}`);
}

const LEAGUE_CONTINENT = {
  Europa: new Set(['laliga','segunda','primeraRFEF','segundaRFEF','premierLeague','championship','serieA','serieB','bundesliga','bundesliga2','ligue1','ligue2','eredivisie','primeiraLiga','belgianPro','superLig','scottishPrem','swissSuperLeague','austrianBundesliga','greekSuperLeague','danishSuperliga','croatianLeague','czechLeague']),
  'Sudamérica': new Set(['argentinaPrimera','brasileiraoA','colombiaPrimera','chilePrimera','uruguayPrimera','ecuadorLigaPro','paraguayPrimera','peruLiga1','boliviaPrimera','venezuelaPrimera']),
  'Norteamérica': new Set(['mls','ligaMX']),
  Asia: new Set(['saudiPro','jLeague'])
};

/** Región/continente de origen del jugador (deriva de la liga; si no, determinista). */
export function deriveRegion(player) {
  const lid = normalizeLeagueId(player?.leagueId || player?.league || player?.teamLeagueId || getTeamLeagueId(player || {}) || '');
  if (lid) {
    for (const [continent, set] of Object.entries(LEAGUE_CONTINENT)) {
      if (set.has(lid)) return continent;
    }
  }
  // Reparto determinista sesgado hacia Europa.
  const buckets = ['Europa', 'Europa', 'Europa', 'Sudamérica', 'Sudamérica', 'África', 'Norteamérica', 'Asia'];
  return buckets[playerSeed(player) % buckets.length];
}

/** Potencial del jugador (usa el real si existe; si no, lo estima por edad+overall). */
export function derivePotential(player) {
  if (Number.isFinite(player?.potential) && player.potential > 0) return player.potential;
  const ovr = player?.overall || 65;
  const age = player?.age || 25;
  const seed = playerSeed(player);
  let bump;
  if (age <= 19) bump = 6 + (seed % 7);
  else if (age <= 22) bump = 4 + (seed % 5);
  else if (age <= 25) bump = 2 + (seed % 4);
  else if (age <= 28) bump = (seed % 2);
  else bump = 0;
  return Math.min(99, ovr + bump);
}

/** Pie preferido (Diestro/Zurdo). ~25% zurdos, determinista. */
export function derivePreferredFoot(player) {
  const f = (player?.foot || player?.preferredFoot || '').toString().toLowerCase();
  if (f.includes('left') || f.includes('zurd') || f === 'l') return 'Zurdo';
  if (f.includes('right') || f.includes('diestr') || f === 'r') return 'Diestro';
  return (playerSeed(player) % 4 === 0) ? 'Zurdo' : 'Diestro';
}

/** Altura en cm (real si existe; si no, por posición + varianza determinista). */
export function deriveHeight(player) {
  if (Number.isFinite(player?.height) && player.height > 120) return Math.round(player.height);
  const pos = posToEN((player?.position || '').replace(/\d+$/, '').toUpperCase().trim());
  let base = 178;
  if (pos === 'GK' || pos === 'CB') base = 186;
  else if (pos === 'ST' || pos === 'CF') base = 182;
  else if (['LB','RB','LWB','RWB','LM','RM','LW','RW','CAM'].includes(pos)) base = 175;
  const variance = (playerSeed(player) % 13) - 6; // -6..+6
  return base + variance;
}

/** Valores 1-99 de los atributos clave, derivados del overall + varianza estable. */
export function deriveAttributes(player) {
  const ovr = player?.overall || 65;
  const out = {};
  SCOUT_ATTRIBUTES.forEach((attr, idx) => {
    if (Number.isFinite(player?.attributes?.[attr])) { out[attr] = player.attributes[attr]; return; }
    const seed = scoutHash(`${playerSeed(player)}:${idx}:${attr}`);
    out[attr] = Math.max(20, Math.min(99, ovr + ((seed % 21) - 10)));
  });
  return out;
}

// ============================================================
// ANÁLISIS DE NECESIDADES DEL EQUIPO
// ============================================================

/**
 * Analizar qué posiciones necesita reforzar el equipo
 */
export function analyzeTeamNeeds(team, scoutingLevel = 0) {
  const players = team?.players || [];
  const needs = [];
  
  // Contar jugadores por posición
  const positionGroups = {
    GK: { positions: ['GK'], ideal: 2, current: 0, avgOvr: 0 },
    CB: { positions: ['CB'], ideal: 4, current: 0, avgOvr: 0 },
    FB: { positions: ['RB', 'LB', 'RWB', 'LWB'], ideal: 4, current: 0, avgOvr: 0 },
    CDM: { positions: ['CDM'], ideal: 2, current: 0, avgOvr: 0 },
    CM: { positions: ['CM', 'CAM'], ideal: 4, current: 0, avgOvr: 0 },
    WM: { positions: ['RM', 'LM'], ideal: 2, current: 0, avgOvr: 0 },
    WIN: { positions: ['RW', 'LW'], ideal: 2, current: 0, avgOvr: 0 },
    ST: { positions: ['ST', 'CF'], ideal: 3, current: 0, avgOvr: 0 }
  };
  
  // Calcular actuales
  players.forEach(p => {
    const normalizedPos = posToEN(p.position);
    for (const [groupKey, group] of Object.entries(positionGroups)) {
      if (group.positions.includes(normalizedPos)) {
        group.current++;
        group.avgOvr = (group.avgOvr * (group.current - 1) + p.overall) / group.current;
        break;
      }
    }
  });
  
  // Calcular media global del equipo
  const teamAvgOvr = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + p.overall, 0) / players.length)
    : 70;
  
  // Determinar necesidades
  for (const [groupKey, group] of Object.entries(positionGroups)) {
    const shortage = group.ideal - group.current;
    const qualityGap = teamAvgOvr - group.avgOvr;
    
    let priority = 'low';
    let reason = '';
    
    if (shortage >= 2) {
      priority = 'critical';
      reason = `Faltan ${shortage} jugadores`;
    } else if (shortage === 1) {
      priority = 'high';
      reason = 'Falta profundidad';
    } else if (qualityGap >= 5 && group.current > 0) {
      priority = 'medium';
      reason = `Nivel bajo (${Math.round(group.avgOvr)} vs ${teamAvgOvr} media)`;
    } else if (qualityGap >= 3 && group.current > 0) {
      priority = 'low';
      reason = 'Mejorable';
    }
    
    if (priority !== 'low' || (scoutingLevel >= 2 && qualityGap > 0)) {
      needs.push({
        group: groupKey,
        positions: group.positions,
        priority,
        reason,
        current: group.current,
        ideal: group.ideal,
        avgOvr: Math.round(group.avgOvr),
        targetOvr: Math.max(teamAvgOvr, Math.round(group.avgOvr) + 3)
      });
    }
  }
  
  // Ordenar por prioridad
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  needs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return { needs, teamAvgOvr };
}

// ============================================================
// GENERACIÓN DE SUGERENCIAS
// ============================================================

// Grupos de posiciones equivalentes para búsquedas útiles.
const POSITION_GROUPS = {
  'ST': ['ST', 'CF'], 'CF': ['CF', 'ST'], 'CB': ['CB'],
  'RB': ['RB', 'RWB'], 'LB': ['LB', 'LWB'], 'RWB': ['RWB', 'RB'], 'LWB': ['LWB', 'LB'],
  'CDM': ['CDM', 'CM'], 'CM': ['CM', 'CDM', 'CAM'], 'CAM': ['CAM', 'CM'],
  'RM': ['RM', 'RW'], 'LM': ['LM', 'LW'], 'RW': ['RW', 'RM'], 'LW': ['LW', 'LM'],
  'GK': ['GK']
};

/** Normaliza el objeto de criterios (acepta string heredado = posición). */
export function normalizeCriteria(criteria) {
  if (typeof criteria === 'string' || criteria == null) {
    return { position: criteria || null };
  }
  return {
    position: criteria.position || null,
    ageMax: criteria.ageMax ?? null,
    valueMax: criteria.valueMax ?? null,
    regions: Array.isArray(criteria.regions) ? criteria.regions : [],
    ovrMin: criteria.ovrMin ?? null,
    attributes: Array.isArray(criteria.attributes) ? criteria.attributes : [],
    revealPotential: !!criteria.revealPotential,
    potentialMin: criteria.potentialMin ?? null,
    preferredFoot: criteria.preferredFoot || 'Indiferente',
    heightMin: criteria.heightMin ?? null,
    compareWithStarter: !!criteria.compareWithStarter,
    starter: criteria.starter || null
  };
}

/**
 * Generar sugerencias de fichajes.
 * @param scoutLevel 1-4 (nivel del ojeador del club). Acepta 0 (=1) por compat.
 * @param criteria objeto de criterios, o string de posición (compat heredado).
 */
export function generateScoutingSuggestions(myTeam, allTeams, scoutLevel = 1, budget = 0, criteria = null) {
  const level = Math.max(1, Math.min(4, Number(scoutLevel) || 1));
  const config = SCOUTING_LEVELS[level] || SCOUTING_LEVELS[1];
  const c = normalizeCriteria(criteria);
  const { needs, teamAvgOvr } = analyzeTeamNeeds(myTeam, level);
  const myTeamId = myTeam?.id;

  // Sólo aplican los criterios cuyo filtro está desbloqueado en este nivel.
  const filterLevel = {};
  SCOUT_FILTERS.forEach(f => { filterLevel[f.key] = isFilterUnlocked(level, f.minLevel); });

  // Recopilar todos los jugadores disponibles (excepto los míos)
  let allPlayers = [];
  (allTeams || []).forEach(team => {
    if (team.id === myTeamId) return;
    (team.players || []).forEach(player => {
      if (!player.personality) player.personality = assignPersonality(player);
      allPlayers.push({
        ...player,
        teamId: team.id,
        teamName: team.name,
        teamLeagueId: team.leagueId || player.leagueId || null,
        teamTier: getClubTier(team.name)
      });
    });
  });

  const neededPositions = new Set();
  needs.forEach(n => n.positions.forEach(p => neededPositions.add(p)));

  // ---- Aplicar criterios (sólo los desbloqueados) ----
  let filtered = allPlayers.filter(p => {
    // Posición (Nv.1)
    if (filterLevel.position && c.position) {
      const valid = new Set(POSITION_GROUPS[c.position] || [c.position]);
      const rawPos = (p.position || '').replace(/\d+$/, '').toUpperCase().trim();
      if (!valid.has(posToEN(rawPos))) return false;
    }
    // Rango de edad (Nv.2)
    if (filterLevel.age && c.ageMax && p.age > c.ageMax) return false;
    // Presupuesto / valor máximo (Nv.2)
    if (filterLevel.budget && c.valueMax) {
      const value = calculateMarketValue(p);
      if (value > c.valueMax) return false;
    }
    // Región de origen (Nv.3)
    if (filterLevel.region && c.regions.length > 0) {
      if (!c.regions.includes(deriveRegion(p))) return false;
    }
    // Media mínima OVR (Nv.3)
    if (filterLevel.ovr && c.ovrMin && p.overall < c.ovrMin) return false;
    // Potencial mínimo (Nv.4) — sólo si el manager activa "Revelar potencial"
    if (filterLevel.potential && c.revealPotential && c.potentialMin) {
      if (derivePotential(p) < c.potentialMin) return false;
    }
    // Perfil físico: pie + altura (Nv.4)
    if (filterLevel.physique) {
      if (c.preferredFoot && c.preferredFoot !== 'Indiferente' && derivePreferredFoot(p) !== c.preferredFoot) return false;
      if (c.heightMin && deriveHeight(p) < c.heightMin) return false;
    }
    // Comparar con titular (Nv.4): mantener sólo recambios comparables/mejores
    if (filterLevel.compare && c.compareWithStarter && c.starter) {
      const valid = new Set(POSITION_GROUPS[posToEN(c.starter.position)] || [posToEN(c.starter.position)]);
      if (!valid.has(posToEN(p.position))) return false;
      if (p.overall < (c.starter.overall || 0) - 3) return false;
    }
    return true;
  });

  // ---- Puntuar idoneidad (determinista) ----
  filtered = filtered.map(p => {
    let score = 0;
    // Posición necesaria
    const matchingNeed = needs.find(n => n.positions.includes(posToEN(p.position)));
    if (matchingNeed) {
      score += { critical: 30, high: 20, medium: 10, low: 5 }[matchingNeed.priority] || 0;
    }
    // Nivel apropiado
    const ovrDiff = Math.abs(p.overall - teamAvgOvr);
    score += ovrDiff <= 3 ? 15 : ovrDiff <= 5 ? 10 : ovrDiff <= 8 ? 5 : 0;
    // Juventud
    score += p.age <= 23 ? 15 : p.age <= 26 ? 10 : p.age <= 29 ? 5 : 0;
    // Atributos clave seleccionados (Nv.3)
    let attrScore = null;
    if (filterLevel.attrs && c.attributes.length > 0) {
      const attrs = deriveAttributes(p);
      attrScore = Math.round(c.attributes.reduce((s, a) => s + (attrs[a] || 0), 0) / c.attributes.length);
      score += Math.round((attrScore - 60) / 2);
    }
    // Potencial (Nv.4)
    const potential = derivePotential(p);
    if (filterLevel.potential && c.revealPotential) {
      score += Math.max(0, potential - p.overall);
    }
    // Comparar con titular (Nv.4)
    let vsStarter = null;
    if (filterLevel.compare && c.compareWithStarter && c.starter) {
      vsStarter = p.overall - (c.starter.overall || 0);
      score += vsStarter * 2;
    }
    return { ...p, scoutScore: score, attrScore, potentialEst: potential, vsStarter };
  });

  filtered.sort((a, b) => (b.scoutScore - a.scoutScore) || (b.overall - a.overall));

  let suggestions = filtered.slice(0, config.maxSuggestions).map(p => {
    const value = calculateMarketValue(p);
    const difficulty = calculateTransferDifficulty(p, { name: p.teamName }, { name: myTeam?.name || '' });
    const matchingNeed = needs.find(n => n.positions.includes(posToEN(p.position)));
    return {
      ...p,
      marketValue: value,
      difficulty,
      region: deriveRegion(p),
      foot: derivePreferredFoot(p),
      height: deriveHeight(p),
      potential: p.potentialEst,
      matchesNeed: !!matchingNeed,
      needPriority: matchingNeed?.priority || null,
      recommendation: generateRecommendation(p, matchingNeed, difficulty, level)
    };
  });

  return {
    suggestions,
    needs,
    teamAvgOvr,
    scoutLevel: level,
    scoutingLevel: level,
    scopeLabel: config.scopeLabel,
    activeFilters: countActiveFilters(level),
    config
  };
}

/**
 * Generar texto de recomendación
 */
function generateRecommendation(player, need, difficulty, scoutingLevel) {
  if (scoutingLevel < 2) return null;
  
  const parts = [];
  
  // Por posición
  if (need) {
    if (need.priority === 'critical') {
      parts.push(`Cubre una necesidad crítica en ${need.group}`);
    } else if (need.priority === 'high') {
      parts.push(`Refuerzo importante para ${need.group}`);
    }
  }
  
  // Por edad
  if (player.age <= 22) {
    parts.push('Gran potencial de mejora');
  } else if (player.age >= 30) {
    parts.push('Experiencia inmediata');
  }
  
  // Por dificultad
  if (difficulty.percentage >= 70) {
    parts.push('Fichaje muy asequible');
  } else if (difficulty.percentage >= 50) {
    parts.push('Negociación viable');
  } else if (difficulty.percentage < 30) {
    parts.push('⚠️ Difícil de convencer');
  }
  
  // Por personalidad
  const personality = PLAYER_PERSONALITIES[player.personality];
  if (personality) {
    if (player.personality === 'adventurous') {
      parts.push('Abierto a nuevos retos');
    } else if (player.personality === 'mercenary') {
      parts.push('Sensible a buenas ofertas');
    } else if (player.personality === 'ambitious' && difficulty.tierDiff <= 0) {
      parts.push('Buscará subir de nivel');
    }
  }
  
  return parts.length > 0 ? parts.join('. ') + '.' : null;
}

// ============================================================
// LIGAS DISPONIBLES PARA EXPLORAR
// ============================================================

export const AVAILABLE_LEAGUES = [
  // España
  { id: 'laliga', name: 'Liga Ibérica', country: 'España', flagUrl: 'https://flagcdn.com/es.svg', color: '#ff4444' },
  { id: 'segunda', name: 'Segunda Ibérica', country: 'España', flagUrl: 'https://flagcdn.com/es.svg', color: '#ff8844' },
  { id: 'primeraRFEF', name: 'Primera Federación', country: 'España', flagUrl: 'https://flagcdn.com/es.svg', color: '#cc6600' },
  { id: 'segundaRFEF', name: 'Segunda Federación', country: 'España', flagUrl: 'https://flagcdn.com/es.svg', color: '#996633' },
  // Top 5 + segundas
  { id: 'premierLeague', name: 'First League', country: 'Inglaterra', flagUrl: 'https://flagcdn.com/gb-eng.svg', color: '#3d195b' },
  { id: 'championship', name: 'Second League', country: 'Inglaterra', flagUrl: 'https://flagcdn.com/gb-eng.svg', color: '#5b2d8e' },
  { id: 'serieA', name: 'Calcio League', country: 'Italia', flagUrl: 'https://flagcdn.com/it.svg', color: '#008c45' },
  { id: 'serieB', name: 'Calcio B', country: 'Italia', flagUrl: 'https://flagcdn.com/it.svg', color: '#00b359' },
  { id: 'bundesliga', name: 'Erste Liga', country: 'Alemania', flagUrl: 'https://flagcdn.com/de.svg', color: '#dd0000' },
  { id: 'bundesliga2', name: 'Zweite Liga', country: 'Alemania', flagUrl: 'https://flagcdn.com/de.svg', color: '#ff3333' },
  { id: 'ligue1', name: 'Division Première', country: 'Francia', flagUrl: 'https://flagcdn.com/fr.svg', color: '#091c3e' },
  { id: 'ligue2', name: 'Division Seconde', country: 'Francia', flagUrl: 'https://flagcdn.com/fr.svg', color: '#1a3366' },
  // Resto de Europa
  { id: 'eredivisie', name: 'Dutch First', country: 'Países Bajos', flagUrl: 'https://flagcdn.com/nl.svg', color: '#ff6600' },
  { id: 'primeiraLiga', name: 'Liga Lusitana', country: 'Portugal', flagUrl: 'https://flagcdn.com/pt.svg', color: '#006600' },
  { id: 'belgianPro', name: 'Belgian First', country: 'Bélgica', flagUrl: 'https://flagcdn.com/be.svg', color: '#cc9900' },
  { id: 'superLig', name: 'Anatolian League', country: 'Turquía', flagUrl: 'https://flagcdn.com/tr.svg', color: '#e30a17' },
  { id: 'scottishPrem', name: 'Highland League', country: 'Escocia', flagUrl: 'https://flagcdn.com/gb-sct.svg', color: '#003399' },
  { id: 'swissSuperLeague', name: 'Alpine League', country: 'Suiza', flagUrl: 'https://flagcdn.com/ch.svg', color: '#ff0000' },
  { id: 'austrianBundesliga', name: 'Erste Liga (AT)', country: 'Austria', flagUrl: 'https://flagcdn.com/at.svg', color: '#ed2939' },
  { id: 'greekSuperLeague', name: 'Super League', country: 'Grecia', flagUrl: 'https://flagcdn.com/gr.svg', color: '#0d5eaf' },
  { id: 'danishSuperliga', name: 'Superligaen', country: 'Dinamarca', flagUrl: 'https://flagcdn.com/dk.svg', color: '#c8102e' },
  { id: 'croatianLeague', name: 'HNL', country: 'Croacia', flagUrl: 'https://flagcdn.com/hr.svg', color: '#0046a8' },
  { id: 'czechLeague', name: 'Chance Liga', country: 'Chequia', flagUrl: 'https://flagcdn.com/cz.svg', color: '#11457e' },
  // South America
  { id: 'argentinaPrimera', name: 'Liga Profesional', country: 'Argentina', flagUrl: 'https://flagcdn.com/ar.svg', color: '#75aadb' },
  { id: 'brasileiraoA', name: 'Série A', country: 'Brasil', flagUrl: 'https://flagcdn.com/br.svg', color: '#009739' },
  { id: 'colombiaPrimera', name: 'Liga BetPlay', country: 'Colombia', flagUrl: 'https://flagcdn.com/co.svg', color: '#fcd116' },
  { id: 'chilePrimera', name: 'Primera División', country: 'Chile', flagUrl: 'https://flagcdn.com/cl.svg', color: '#d52b1e' },
  { id: 'uruguayPrimera', name: 'Primera División', country: 'Uruguay', flagUrl: 'https://flagcdn.com/uy.svg', color: '#001489' },
  { id: 'ecuadorLigaPro', name: 'LigaPro', country: 'Ecuador', flagUrl: 'https://flagcdn.com/ec.svg', color: '#ffd100' },
  { id: 'paraguayPrimera', name: 'División de Honor', country: 'Paraguay', flagUrl: 'https://flagcdn.com/py.svg', color: '#d52b1e' },
  { id: 'peruLiga1', name: 'Liga 1', country: 'Perú', flagUrl: 'https://flagcdn.com/pe.svg', color: '#d91023' },
  { id: 'boliviaPrimera', name: 'División Profesional', country: 'Bolivia', flagUrl: 'https://flagcdn.com/bo.svg', color: '#007934' },
  { id: 'venezuelaPrimera', name: 'Liga FUTVE', country: 'Venezuela', flagUrl: 'https://flagcdn.com/ve.svg', color: '#cf142b' },
  // Resto del Mundo
  { id: 'mls', name: 'American League', country: 'Estados Unidos', flagUrl: 'https://flagcdn.com/us.svg', color: '#013474' },
  { id: 'saudiPro', name: 'Arabian League', country: 'Arabia Saudí', flagUrl: 'https://flagcdn.com/sa.svg', color: '#006C35' },
  { id: 'ligaMX', name: 'Azteca League', country: 'México', flagUrl: 'https://flagcdn.com/mx.svg', color: '#006847' },
  { id: 'jLeague', name: 'Sakura League', country: 'Japón', flagUrl: 'https://flagcdn.com/jp.svg', color: '#BC002D' },
];

/**
 * Obtener equipos de una liga
 */
export function getTeamsByLeague(allTeams, leagueId) {
  let teams = allTeams || [];
  if (leagueId) {
    teams = getTeamsInLeague(teams, leagueId);
  }
  return teams.map(team => ({
    ...team,
    tier: getClubTier(team.name),
    avgOverall: team.players?.length > 0
      ? Math.round(team.players.reduce((sum, p) => sum + p.overall, 0) / team.players.length)
      : 70,
    totalValue: team.players?.reduce((sum, p) => sum + calculateMarketValue(p), 0) || 0
  })).sort((a, b) => b.avgOverall - a.avgOverall);
}

export default {
  SCOUTING_LEVELS,
  SCOUT_FILTERS,
  SCOUT_CONTINENTS,
  SCOUT_ATTRIBUTES,
  isFilterUnlocked,
  countActiveFilters,
  normalizeCriteria,
  deriveRegion,
  derivePotential,
  derivePreferredFoot,
  deriveHeight,
  deriveAttributes,
  analyzeTeamNeeds,
  generateScoutingSuggestions,
  AVAILABLE_LEAGUES,
  getTeamsByLeague
};
