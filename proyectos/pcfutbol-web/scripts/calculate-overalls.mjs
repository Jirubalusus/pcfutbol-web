/**
 * Post-proceso: Calcula overalls usando estadísticas de temporada anterior
 * 
 * Overall de temporada N = f(Stats N-1, Edad, Valor, Progresión)
 * 
 * Uso:
 *   node calculate-overalls.mjs                    # Procesa todas las temporadas
 *   node calculate-overalls.mjs --season 2023-24  # Solo una temporada
 */

import fs from 'fs';
import path from 'path';

const RAW_DIR = 'scraped-data/raw';
const OUTPUT_DIR = 'scraped-data/processed';

// Curvas de edad por posición
const AGE_CURVES = {
  GK:  { peakStart: 28, peakEnd: 34, maxAge: 40, potential: 0.8 },
  CB:  { peakStart: 26, peakEnd: 32, maxAge: 37, potential: 0.85 },
  LB:  { peakStart: 25, peakEnd: 30, maxAge: 35, potential: 0.9 },
  RB:  { peakStart: 25, peakEnd: 30, maxAge: 35, potential: 0.9 },
  CDM: { peakStart: 26, peakEnd: 32, maxAge: 36, potential: 0.85 },
  CM:  { peakStart: 25, peakEnd: 31, maxAge: 35, potential: 0.9 },
  CAM: { peakStart: 24, peakEnd: 30, maxAge: 34, potential: 0.95 },
  LW:  { peakStart: 24, peakEnd: 29, maxAge: 33, potential: 1.0 },
  RW:  { peakStart: 24, peakEnd: 29, maxAge: 33, potential: 1.0 },
  CF:  { peakStart: 25, peakEnd: 30, maxAge: 34, potential: 0.95 },
  ST:  { peakStart: 25, peakEnd: 30, maxAge: 34, potential: 0.95 }
};

// Base por tier de liga
const LEAGUE_BASE = {
  1: 72,  // Top 5 europeas
  2: 65,  // Segunda división
  3: 58   // Tercera categoría
};

// Tier de ligas conocidas
const LEAGUE_TIERS = {
  laliga: 1, premier: 1, bundesliga: 1, seriea: 1, ligue1: 1,
  laliga2: 2,
  primeraRfefG1: 3, primeraRfefG2: 3
};

/**
 * Calcula el overall de un jugador para la temporada actual
 * basándose en sus estadísticas de la temporada anterior
 */
function calculatePlayerOverall(player, prevSeasonStats, teamRank, totalTeams, leagueTier) {
  const curve = AGE_CURVES[player.position] || AGE_CURVES.CM;
  const baseOverall = LEAGUE_BASE[leagueTier] || 70;
  
  let overall = baseOverall;
  
  // 1. VALOR DE MERCADO (proxy de calidad reconocida)
  const mv = player.marketValue || 0;
  if (mv >= 100000000) overall += 18;
  else if (mv >= 70000000) overall += 15;
  else if (mv >= 50000000) overall += 12;
  else if (mv >= 30000000) overall += 9;
  else if (mv >= 15000000) overall += 6;
  else if (mv >= 8000000) overall += 4;
  else if (mv >= 3000000) overall += 2;
  else if (mv >= 1000000) overall += 1;
  
  // 2. POSICIÓN EN TABLA DEL EQUIPO
  if (teamRank && totalTeams) {
    const pos = teamRank / totalTeams;
    if (pos <= 0.1) overall += 5;       // Top 2
    else if (pos <= 0.2) overall += 4;  // Top 4
    else if (pos <= 0.35) overall += 2; // Top 7
    else if (pos >= 0.85) overall -= 2; // Descenso
  }
  
  // 3. ESTADÍSTICAS TEMPORADA ANTERIOR (si disponibles)
  if (prevSeasonStats) {
    const { goals = 0, assists = 0, matches = 0, minutes = 0 } = prevSeasonStats;
    
    if (matches > 0) {
      const goalsPerMatch = goals / matches;
      const assistsPerMatch = assists / matches;
      const avgMinutes = minutes / matches;
      
      // Bonus por goles según posición
      if (player.position === 'ST' || player.position === 'CF') {
        if (goalsPerMatch >= 0.6) overall += 5;
        else if (goalsPerMatch >= 0.45) overall += 3;
        else if (goalsPerMatch >= 0.3) overall += 2;
        else if (goalsPerMatch >= 0.2) overall += 1;
        else if (goalsPerMatch < 0.1 && matches >= 20) overall -= 2;
      } else if (player.position === 'CAM' || player.position === 'LW' || player.position === 'RW') {
        if (goalsPerMatch >= 0.4) overall += 4;
        else if (goalsPerMatch >= 0.25) overall += 2;
        else if (goalsPerMatch >= 0.15) overall += 1;
      } else if (player.position === 'CM' || player.position === 'CDM') {
        if (goalsPerMatch >= 0.2) overall += 3;
        else if (goalsPerMatch >= 0.1) overall += 1;
      }
      
      // Bonus por asistencias
      if (assistsPerMatch >= 0.35) overall += 4;
      else if (assistsPerMatch >= 0.25) overall += 3;
      else if (assistsPerMatch >= 0.15) overall += 2;
      else if (assistsPerMatch >= 0.1) overall += 1;
      
      // Bonus por regularidad (titular habitual)
      if (avgMinutes >= 75 && matches >= 25) overall += 2;
      else if (avgMinutes >= 60 && matches >= 20) overall += 1;
      else if (avgMinutes < 30 && matches >= 10) overall -= 1;
    }
  }
  
  // 4. AJUSTE POR EDAD Y CURVA DE DESARROLLO
  const age = player.age || 25;
  
  if (age < curve.peakStart - 4) {
    // Muy joven: potencial alto pero overall conservador
    // (dejamos margen para que crezca en la partida)
    overall -= 4;
  } else if (age < curve.peakStart - 2) {
    // Joven prometedor
    overall -= 2;
  } else if (age < curve.peakStart) {
    // Acercándose al pico
    overall += 0;
  } else if (age <= curve.peakEnd) {
    // En su pico
    overall += 2;
  } else if (age <= curve.peakEnd + 2) {
    // Empezando a declinar
    overall -= 1;
  } else if (age <= curve.peakEnd + 4) {
    // Veterano
    overall -= 3;
  } else {
    // Muy veterano
    overall -= 5;
  }
  
  // 5. AJUSTE ESPECIAL PARA JÓVENES SIN STATS
  // Si es joven y no tiene stats previas, no penalizar demasiado
  if (age <= 21 && !prevSeasonStats) {
    // Usar solo valor de mercado como indicador de potencial
    if (mv >= 5000000) overall += 2;
    else if (mv >= 1000000) overall += 1;
  }
  
  // 6. CAP POR LIGA (evitar overalls demasiado altos en ligas menores)
  const maxByTier = {
    1: 99,  // Top ligas: sin límite real
    2: 85,  // Segunda: máx 85
    3: 78   // Tercera: máx 78
  };
  const tierMax = maxByTier[leagueTier] || 99;
  
  // Limitar rango final
  return Math.max(45, Math.min(tierMax, Math.round(overall)));
}

/**
 * Busca las estadísticas de un jugador en la temporada anterior
 */
function findPrevSeasonStats(playerName, playerId, prevSeasonData) {
  if (!prevSeasonData) return null;
  
  const normalizedName = playerName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  // Buscar en todos los equipos de la temporada anterior
  for (const leagueKey of Object.keys(prevSeasonData)) {
    if (leagueKey.startsWith('_')) continue;
    
    const teams = prevSeasonData[leagueKey];
    if (!Array.isArray(teams)) continue;
    
    for (const team of teams) {
      if (!team.players) continue;
      
      for (const player of team.players) {
        // Match por ID si disponible
        if (playerId && player.playerId === playerId) {
          return {
            goals: player.goals || 0,
            assists: player.assists || 0,
            matches: player.matches || 0,
            minutes: player.minutes || 0,
            team: team.name,
            league: leagueKey
          };
        }
        
        // Match por nombre normalizado
        const prevNormalized = player.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (prevNormalized === normalizedName || 
            prevNormalized.includes(normalizedName.substring(0, 10)) ||
            normalizedName.includes(prevNormalized.substring(0, 10))) {
          return {
            goals: player.goals || 0,
            assists: player.assists || 0,
            matches: player.matches || 0,
            minutes: player.minutes || 0,
            team: team.name,
            league: leagueKey
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * Carga todos los datos raw de una temporada
 */
function loadSeasonData(seasonStr) {
  const seasonDir = path.join(RAW_DIR, seasonStr);
  if (!fs.existsSync(seasonDir)) return null;
  
  const data = {};
  const files = fs.readdirSync(seasonDir);
  
  for (const file of files) {
    if (file.startsWith('_') || !file.endsWith('.json')) continue;
    const leagueKey = file.replace('.json', '');
    const filePath = path.join(seasonDir, file);
    data[leagueKey] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  
  return data;
}

/**
 * Obtiene la temporada anterior
 */
function getPrevSeason(seasonStr) {
  const [start] = seasonStr.split('-');
  const prevStart = parseInt(start) - 1;
  return `${prevStart}-${(prevStart + 1).toString().slice(-2)}`;
}

/**
 * Procesa una temporada completa
 */
function processSeason(seasonStr, prevSeasonData) {
  console.log(`\n📊 Procesando ${seasonStr}...`);
  
  const seasonData = loadSeasonData(seasonStr);
  if (!seasonData) {
    console.log(`   ⚠️ No hay datos para ${seasonStr}`);
    return null;
  }
  
  const outputSeasonDir = path.join(OUTPUT_DIR, seasonStr);
  if (!fs.existsSync(outputSeasonDir)) {
    fs.mkdirSync(outputSeasonDir, { recursive: true });
  }
  
  const summary = { leagues: {} };
  
  for (const leagueKey of Object.keys(seasonData)) {
    const teams = seasonData[leagueKey];
    if (!Array.isArray(teams)) continue;
    
    const leagueTier = LEAGUE_TIERS[leagueKey] || 1;
    const totalTeams = teams.length;
    
    console.log(`   🏆 ${leagueKey}: ${totalTeams} equipos`);
    
    let totalPlayers = 0;
    let totalGoals = 0;
    let overallSum = 0;
    
    for (const team of teams) {
      if (!team.players) continue;
      
      for (const player of team.players) {
        // Buscar stats de temporada anterior
        const prevStats = findPrevSeasonStats(player.name, player.playerId, prevSeasonData);
        
        // Calcular overall
        player.overall = calculatePlayerOverall(
          player,
          prevStats,
          team.rank,
          totalTeams,
          leagueTier
        );
        
        // Guardar referencia a stats previas (para debug)
        if (prevStats) {
          player.prevSeasonStats = prevStats;
        }
        
        totalPlayers++;
        totalGoals += player.goals || 0;
        overallSum += player.overall;
      }
      
      // Calcular average del equipo
      if (team.players.length > 0) {
        team.avgOverall = Math.round(team.players.reduce((s, p) => s + p.overall, 0) / team.players.length);
      }
    }
    
    // Guardar liga procesada
    const outFile = path.join(outputSeasonDir, `${leagueKey}.json`);
    fs.writeFileSync(outFile, JSON.stringify(teams, null, 2));
    
    const avgOverall = totalPlayers > 0 ? Math.round(overallSum / totalPlayers) : 0;
    console.log(`      ✓ ${totalPlayers} jugadores, avg ${avgOverall}`);
    
    summary.leagues[leagueKey] = {
      teams: totalTeams,
      players: totalPlayers,
      goals: totalGoals,
      avgOverall
    };
  }
  
  // Guardar summary
  const summaryFile = path.join(outputSeasonDir, '_summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  return summary;
}

async function main() {
  console.log('📊 Post-Proceso: Cálculo de Overalls');
  console.log('=====================================\n');
  console.log('Overall(N) = f(Stats(N-1), Edad, Valor, Liga)\n');
  
  // Obtener lista de temporadas disponibles
  const rawDir = path.join(process.cwd(), RAW_DIR);
  if (!fs.existsSync(rawDir)) {
    console.log('❌ No se encontró directorio de datos raw');
    return;
  }
  
  const seasons = fs.readdirSync(rawDir)
    .filter(d => /^\d{4}-\d{2}$/.test(d))
    .sort((a, b) => b.localeCompare(a)); // Más reciente primero
  
  console.log(`📅 Temporadas encontradas: ${seasons.length}`);
  console.log(`   ${seasons.join(', ')}\n`);
  
  // Crear directorio de salida
  const outputDir = path.join(process.cwd(), OUTPUT_DIR);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Procesar cada temporada
  let prevSeasonData = null;
  
  // Iterar de más antigua a más reciente para tener stats previas
  for (const seasonStr of seasons.reverse()) {
    processSeason(seasonStr, prevSeasonData);
    
    // Cargar esta temporada para usarla como "previa" en la siguiente iteración
    prevSeasonData = loadSeasonData(seasonStr);
  }
  
  console.log('\n=====================================');
  console.log('✅ Post-proceso completado!');
  console.log(`📁 Datos procesados en: ${OUTPUT_DIR}/`);
}

main().catch(console.error);
