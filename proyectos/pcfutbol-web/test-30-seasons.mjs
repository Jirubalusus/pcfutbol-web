// Test completo - 30 temporadas con análisis detallado
import { teamsArray as LALIGA_TEAMS } from './src/data/teams.js';
import { initializeLeague, simulateMatch, updateTable, getWeekFixtures, calculateTeamStrength } from './src/game/leagueEngine.js';
import { calculateSeasonOutcome, prepareNewSeason } from './src/game/seasonEngine.js';
import { generatePlayerPersonality, evaluateTransferOffer } from './src/game/playerPersonality.js';

const formatMoney = (n) => n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : `€${(n/1e3).toFixed(0)}K`;

console.log('🎮 TEST COMPLETO - 30 TEMPORADAS');
console.log('═'.repeat(60));

// ============== ANÁLISIS INICIAL ==============
console.log('\n📊 ANÁLISIS INICIAL DE EQUIPOS:');
console.log('─'.repeat(60));

const initialAnalysis = LALIGA_TEAMS.map(team => {
  const strength = calculateTeamStrength(team);
  return {
    id: team.id,
    name: team.shortName,
    players: team.players.length,
    avgOverall: team.players.length > 0 
      ? (team.players.reduce((s, p) => s + p.overall, 0) / team.players.length).toFixed(1)
      : 0,
    strength: strength.overall.toFixed(1),
    budget: formatMoney(team.budget),
    reputation: team.reputation
  };
}).sort((a, b) => b.strength - a.strength);

console.log('Equipo   | Jug | Media | Fuerza | Budget   | Rep');
console.log('─'.repeat(60));
initialAnalysis.forEach(t => {
  console.log(
    `${t.name.padEnd(8)} | ${String(t.players).padStart(3)} | ${t.avgOverall.padStart(5)} | ${t.strength.padStart(6)} | ${t.budget.padStart(8)} | ${t.reputation}`
  );
});

// ============== DETECTAR PROBLEMAS INICIALES ==============
console.log('\n⚠️ PROBLEMAS DETECTADOS:');
const problems = [];

LALIGA_TEAMS.forEach(team => {
  if (team.players.length < 14) {
    problems.push(`${team.shortName}: Solo ${team.players.length} jugadores (mínimo recomendado: 18)`);
  }
  
  const positionCount = {};
  team.players.forEach(p => {
    positionCount[p.position] = (positionCount[p.position] || 0) + 1;
  });
  
  if (!positionCount['GK']) problems.push(`${team.shortName}: Sin portero!`);
  if ((positionCount['CB'] || 0) < 2) problems.push(`${team.shortName}: Pocos centrales (${positionCount['CB'] || 0})`);
  if ((positionCount['ST'] || 0) < 1) problems.push(`${team.shortName}: Sin delanteros!`);
});

if (problems.length === 0) {
  console.log('  ✅ No se detectaron problemas graves');
} else {
  problems.forEach(p => console.log(`  ❌ ${p}`));
}

// ============== SIMULACIÓN DE 30 TEMPORADAS ==============
console.log('\n🏆 SIMULANDO 30 TEMPORADAS...');
console.log('─'.repeat(60));

const stats = {
  byTeam: {},
  totalGoals: 0,
  totalMatches: 0,
  homeWins: 0,
  awayWins: 0,
  draws: 0,
  upsets: 0, // Cuando un equipo débil gana a uno fuerte
  seasonChampions: [],
  seasonRelegated: []
};

// Inicializar stats por equipo
LALIGA_TEAMS.forEach(team => {
  stats.byTeam[team.id] = {
    name: team.shortName,
    positions: [],
    points: [],
    titles: 0,
    championsQualifications: 0,
    europaQualifications: 0,
    relegations: 0,
    avgPosition: 0,
    goalsFor: 0,
    goalsAgainst: 0
  };
});

// Clonar equipos para poder modificarlos
let teams = JSON.parse(JSON.stringify(LALIGA_TEAMS));

const startTime = Date.now();

for (let season = 1; season <= 30; season++) {
  const { table, fixtures } = initializeLeague(teams, null);
  let tbl = table;
  let fix = fixtures;
  
  // Simular todas las jornadas
  for (let week = 1; week <= 38; week++) {
    for (const f of getWeekFixtures(fix, week)) {
      if (f.played) continue;
      
      const homeTeam = teams.find(t => t.id === f.homeTeam);
      const awayTeam = teams.find(t => t.id === f.awayTeam);
      
      if (!homeTeam || !awayTeam) continue;
      
      const homeEntry = tbl.find(t => t.teamId === f.homeTeam);
      const awayEntry = tbl.find(t => t.teamId === f.awayTeam);
      
      const result = simulateMatch(f.homeTeam, f.awayTeam, homeTeam, awayTeam, {
        homeMorale: homeEntry?.morale || 70,
        awayMorale: awayEntry?.morale || 70
      });
      
      tbl = updateTable(tbl, f.homeTeam, f.awayTeam, result.homeScore, result.awayScore);
      
      // Estadísticas
      stats.totalMatches++;
      stats.totalGoals += result.homeScore + result.awayScore;
      
      if (result.homeScore > result.awayScore) {
        stats.homeWins++;
      } else if (result.awayScore > result.homeScore) {
        stats.awayWins++;
      } else {
        stats.draws++;
      }
      
      // Detectar sorpresas
      const homeStrength = calculateTeamStrength(homeTeam).overall;
      const awayStrength = calculateTeamStrength(awayTeam).overall;
      
      if (result.awayScore > result.homeScore && homeStrength > awayStrength + 10) {
        stats.upsets++;
      }
      if (result.homeScore > result.awayScore && awayStrength > homeStrength + 10) {
        stats.upsets++;
      }
      
      // Actualizar fixture
      const idx = fix.findIndex(x => x.id === f.id);
      if (idx >= 0) fix[idx] = { ...f, played: true, homeScore: result.homeScore, awayScore: result.awayScore };
    }
  }
  
  // Procesar fin de temporada
  tbl.forEach((entry, idx) => {
    const pos = idx + 1;
    const teamStats = stats.byTeam[entry.teamId];
    
    teamStats.positions.push(pos);
    teamStats.points.push(entry.points);
    teamStats.goalsFor += entry.goalsFor;
    teamStats.goalsAgainst += entry.goalsAgainst;
    
    if (pos === 1) {
      teamStats.titles++;
      stats.seasonChampions.push(entry.teamId);
    }
    if (pos <= 4) teamStats.championsQualifications++;
    if (pos >= 5 && pos <= 6) teamStats.europaQualifications++;
    if (pos >= 18) {
      teamStats.relegations++;
      stats.seasonRelegated.push(entry.teamId);
    }
  });
  
  // Preparar siguiente temporada (envejecer jugadores, etc.)
  teams = teams.map(team => {
    const entry = tbl.find(t => t.teamId === team.id);
    const position = tbl.findIndex(t => t.teamId === team.id) + 1;
    const outcome = calculateSeasonOutcome(position, 'laliga', 20);
    const prepared = prepareNewSeason(team, outcome);
    
    // Si la plantilla quedó muy corta, añadir jugadores genéricos
    if (prepared.players.length < 14) {
      const positionsNeeded = ['GK', 'CB', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CM', 'RW', 'LW', 'ST'];
      const existing = new Set(prepared.players.map(p => p.position));
      
      for (const pos of positionsNeeded) {
        if (prepared.players.length >= 18) break;
        if (!existing.has(pos) || prepared.players.filter(p => p.position === pos).length < 2) {
          prepared.players.push({
            name: `Regen ${pos} ${season}`,
            position: pos,
            overall: 68 + Math.floor(Math.random() * 8),
            age: 19 + Math.floor(Math.random() * 5),
            value: 5000000,
            salary: 40000
          });
        }
      }
    }
    
    return prepared;
  });
  
  // Progress
  if (season % 5 === 0) {
    const champion = tbl[0];
    console.log(`  Temporada ${season}/30: Campeón ${champion.teamName} (${champion.points} pts)`);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

// ============== RESULTADOS FINALES ==============
console.log('\n' + '═'.repeat(60));
console.log('📈 RESULTADOS FINALES');
console.log('═'.repeat(60));

console.log(`\n⏱️ Tiempo: ${elapsed}s (${(30/parseFloat(elapsed)).toFixed(1)} temporadas/seg)`);

console.log(`\n⚽ ESTADÍSTICAS DE PARTIDOS:`);
console.log(`  Total partidos: ${stats.totalMatches}`);
console.log(`  Goles totales: ${stats.totalGoals} (${(stats.totalGoals/stats.totalMatches).toFixed(2)} por partido)`);
console.log(`  Victorias locales: ${stats.homeWins} (${(stats.homeWins/stats.totalMatches*100).toFixed(1)}%)`);
console.log(`  Empates: ${stats.draws} (${(stats.draws/stats.totalMatches*100).toFixed(1)}%)`);
console.log(`  Victorias visitantes: ${stats.awayWins} (${(stats.awayWins/stats.totalMatches*100).toFixed(1)}%)`);
console.log(`  Sorpresas (upset): ${stats.upsets} (${(stats.upsets/stats.totalMatches*100).toFixed(1)}%)`);

// Valores esperados de LaLiga real (aproximados)
console.log(`\n  📊 Comparación con LaLiga real:`);
console.log(`     - Goles por partido: Real ~2.5, Simulación ${(stats.totalGoals/stats.totalMatches).toFixed(2)}`);
console.log(`     - Victorias local: Real ~46%, Simulación ${(stats.homeWins/stats.totalMatches*100).toFixed(1)}%`);
console.log(`     - Empates: Real ~24%, Simulación ${(stats.draws/stats.totalMatches*100).toFixed(1)}%`);
console.log(`     - Victorias visitante: Real ~30%, Simulación ${(stats.awayWins/stats.totalMatches*100).toFixed(1)}%`);

// Calcular medias por equipo
Object.values(stats.byTeam).forEach(team => {
  team.avgPosition = team.positions.reduce((a, b) => a + b, 0) / team.positions.length;
  team.avgPoints = team.points.reduce((a, b) => a + b, 0) / team.points.length;
});

// Ordenar por posición media
const sortedTeams = Object.values(stats.byTeam).sort((a, b) => a.avgPosition - b.avgPosition);

console.log('\n🏆 RANKING POR POSICIÓN MEDIA (30 temporadas):');
console.log('─'.repeat(70));
console.log('Equipo   | Pos.Med | Pts.Med | Títulos | UCL | UEL | Desc | GF/GA');
console.log('─'.repeat(70));

sortedTeams.forEach(team => {
  const gfAvg = (team.goalsFor / 30).toFixed(0);
  const gaAvg = (team.goalsAgainst / 30).toFixed(0);
  console.log(
    `${team.name.padEnd(8)} | ${team.avgPosition.toFixed(1).padStart(7)} | ${team.avgPoints.toFixed(1).padStart(7)} | ` +
    `${String(team.titles).padStart(7)} | ${String(team.championsQualifications).padStart(3)} | ` +
    `${String(team.europaQualifications).padStart(3)} | ${String(team.relegations).padStart(4)} | ${gfAvg}/${gaAvg}`
  );
});

// Campeones únicos
const uniqueChampions = [...new Set(stats.seasonChampions)];
console.log(`\n🥇 Campeones únicos: ${uniqueChampions.length}/20`);
console.log(`   ${uniqueChampions.map(id => stats.byTeam[id].name).join(', ')}`);

// Distribución de títulos
console.log('\n📊 DISTRIBUCIÓN DE TÍTULOS:');
const titleDist = {};
stats.seasonChampions.forEach(id => {
  titleDist[id] = (titleDist[id] || 0) + 1;
});
Object.entries(titleDist)
  .sort((a, b) => b[1] - a[1])
  .forEach(([id, count]) => {
    const bar = '█'.repeat(count);
    console.log(`  ${stats.byTeam[id].name.padEnd(8)}: ${bar} ${count}`);
  });

// Análisis de relegaciones
const relegationTeams = [...new Set(stats.seasonRelegated)];
console.log(`\n📉 Equipos que descendieron al menos una vez: ${relegationTeams.length}/20`);

const neverRelegated = sortedTeams.filter(t => t.relegations === 0).map(t => t.name);
console.log(`   Nunca descendieron: ${neverRelegated.join(', ')}`);

const frequentlyRelegated = sortedTeams.filter(t => t.relegations >= 5).map(t => `${t.name}(${t.relegations})`);
if (frequentlyRelegated.length > 0) {
  console.log(`   Descendieron ≥5 veces: ${frequentlyRelegated.join(', ')}`);
}

// ============== PROBLEMAS DETECTADOS ==============
console.log('\n' + '═'.repeat(60));
console.log('🔍 ANÁLISIS DE PROBLEMAS');
console.log('═'.repeat(60));

const issues = [];

// 1. Verificar si hay demasiado dominio de pocos equipos
const topTeamTitles = sortedTeams.slice(0, 3).reduce((s, t) => s + t.titles, 0);
if (topTeamTitles >= 27) {
  issues.push(`⚠️ DOMINIO EXCESIVO: Top 3 gana ${topTeamTitles}/30 títulos (${(topTeamTitles/30*100).toFixed(0)}%)`);
}

// 2. Verificar si equipos medios nunca compiten
const midTeamsNoChance = sortedTeams.slice(5, 15).filter(t => t.championsQualifications === 0);
if (midTeamsNoChance.length >= 5) {
  issues.push(`⚠️ FALTA COMPETITIVIDAD: ${midTeamsNoChance.length} equipos medios nunca clasifican a Champions`);
}

// 3. Verificar tasa de descenso realista
// Un equipo debería descender ~15% de las veces en 30 años si está en zona de peligro
const bottomTeams = sortedTeams.slice(-5);
const avgRelegations = bottomTeams.reduce((s, t) => s + t.relegations, 0) / 5;
if (avgRelegations < 3) {
  issues.push(`⚠️ DESCENSOS BAJOS: Equipos de abajo bajan solo ${avgRelegations.toFixed(1)} veces de media`);
} else if (avgRelegations > 15) {
  issues.push(`⚠️ DESCENSOS EXCESIVOS: Equipos de abajo bajan ${avgRelegations.toFixed(1)} veces de media`);
}

// 4. Verificar si hay equipos "atrapados" en posiciones
const positionVariance = sortedTeams.map(t => {
  const mean = t.avgPosition;
  const variance = t.positions.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / t.positions.length;
  return { name: t.name, stdDev: Math.sqrt(variance) };
});

const lowVariance = positionVariance.filter(t => t.stdDev < 2);
if (lowVariance.length > 5) {
  issues.push(`⚠️ POCA VARIABILIDAD: ${lowVariance.length} equipos siempre terminan en posiciones similares`);
}

// 5. Verificar goles por partido
const goalsPerMatch = stats.totalGoals / stats.totalMatches;
if (goalsPerMatch < 2.2) {
  issues.push(`⚠️ POCOS GOLES: ${goalsPerMatch.toFixed(2)} goles/partido (real: ~2.5)`);
} else if (goalsPerMatch > 3.0) {
  issues.push(`⚠️ MUCHOS GOLES: ${goalsPerMatch.toFixed(2)} goles/partido (real: ~2.5)`);
}

// 6. Ventaja local
const homeWinRate = stats.homeWins / stats.totalMatches;
if (homeWinRate > 0.55) {
  issues.push(`⚠️ VENTAJA LOCAL EXCESIVA: ${(homeWinRate*100).toFixed(1)}% (real: ~46%)`);
} else if (homeWinRate < 0.38) {
  issues.push(`⚠️ VENTAJA LOCAL BAJA: ${(homeWinRate*100).toFixed(1)}% (real: ~46%)`);
}

// 7. Empates
const drawRate = stats.draws / stats.totalMatches;
if (drawRate < 0.18) {
  issues.push(`⚠️ POCOS EMPATES: ${(drawRate*100).toFixed(1)}% (real: ~24%)`);
} else if (drawRate > 0.30) {
  issues.push(`⚠️ MUCHOS EMPATES: ${(drawRate*100).toFixed(1)}% (real: ~24%)`);
}

if (issues.length === 0) {
  console.log('✅ No se detectaron problemas significativos');
} else {
  issues.forEach(issue => console.log(issue));
}

// ============== RECOMENDACIONES ==============
console.log('\n' + '═'.repeat(60));
console.log('💡 RECOMENDACIONES');
console.log('═'.repeat(60));

const recommendations = [];

// Basadas en problemas detectados
if (topTeamTitles >= 27) {
  recommendations.push('• Reducir diferencias de overall entre equipos top y medios');
  recommendations.push('• Aumentar factor de variación aleatoria en partidos');
}

if (goalsPerMatch < 2.2) {
  recommendations.push('• Aumentar baseChance en calculateGoalChance()');
}

if (goalsPerMatch > 3.0) {
  recommendations.push('• Reducir baseChance en calculateGoalChance()');
}

if (homeWinRate > 0.55) {
  recommendations.push('• Reducir homeAdvantage en simulateMatch()');
}

if (drawRate < 0.18) {
  recommendations.push('• Ajustar probabilidades para más empates');
}

// Chequear plantillas cortas
const shortSquads = LALIGA_TEAMS.filter(t => t.players.length < 16);
if (shortSquads.length > 0) {
  recommendations.push(`• URGENTE: Añadir jugadores a ${shortSquads.map(t => t.shortName).join(', ')}`);
}

if (recommendations.length === 0) {
  console.log('✅ El sistema parece balanceado');
} else {
  recommendations.forEach(r => console.log(r));
}

console.log('\n✅ Test completado');
