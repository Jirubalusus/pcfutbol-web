// Test de estrés - 100 temporadas rápidas
import { LALIGA_TEAMS } from './src/data/teams.js';
import { initializeLeague, simulateMatch, updateTable, getWeekFixtures } from './src/game/leagueEngine.js';
import { generatePlayerPersonality, evaluateTransferOffer } from './src/game/playerPersonality.js';

const formatMoney = (n) => n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : `€${(n/1e3).toFixed(0)}K`;
const seededRandom = (seed, off = 0) => { const x = Math.sin(seed + off) * 10000; return x - Math.floor(x); };

console.log('🔥 TEST DE ESTRÉS - 100 TEMPORADAS');
console.log('═'.repeat(50));

const stats = {
  seasons: 0,
  signings: 0,
  sales: 0,
  failed: 0,
  positions: {},
  money: { spent: 0, earned: 0 },
  avgSquadSize: [],
  bankruptcies: 0
};

const teamId = 'real_betis';
let team = JSON.parse(JSON.stringify(LALIGA_TEAMS.find(t => t.id === teamId)));
let money = team.budget;

const startTime = Date.now();

for (let season = 1; season <= 100; season++) {
  const { table, fixtures } = initializeLeague(LALIGA_TEAMS, teamId);
  let tbl = table, fix = fixtures;
  
  for (let week = 1; week <= 38; week++) {
    // Simular partidos
    for (const f of getWeekFixtures(fix, week)) {
      if (f.played) continue;
      const h = f.homeTeam === teamId ? team : LALIGA_TEAMS.find(t => t.id === f.homeTeam);
      const a = f.awayTeam === teamId ? team : LALIGA_TEAMS.find(t => t.id === f.awayTeam);
      if (!h || !a) continue;
      const r = simulateMatch(f.homeTeam, f.awayTeam, h, a, {});
      tbl = updateTable(tbl, f.homeTeam, f.awayTeam, r.homeScore, r.awayScore);
      const idx = fix.findIndex(x => x.id === f.id);
      if (idx >= 0) fix[idx] = { ...f, played: true };
    }
    
    // Mercado (ventanas: 1-8, 20-24)
    const inWindow = (week >= 1 && week <= 8) || (week >= 20 && week <= 24);
    if (inWindow && money > 0 && team.players.length < 25 && Math.random() < 0.4) {
      // Generar candidato random
      const allPlayers = LALIGA_TEAMS.flatMap(t => 
        t.id !== teamId && t.players ? t.players.map(p => ({ ...p, teamRep: t.reputation || 70 })) : []
      );
      const available = allPlayers.filter(p => 
        p.overall >= 75 && p.age <= 30 && p.value <= money * 0.5 &&
        !team.players.some(tp => tp.name === p.name)
      );
      
      if (available.length > 0) {
        const target = available[Math.floor(Math.random() * Math.min(10, available.length))];
        const personality = generatePlayerPersonality(target, season * 1000 + week);
        const eval_ = evaluateTransferOffer(
          { ...target, personality },
          { reputation: target.teamRep },
          { reputation: team.reputation || 80 },
          { salary: target.salary * 1.1, promisedRole: 'rotation' }
        );
        
        if (eval_.probability > 50 || Math.random() < 0.3) {
          team.players.push({ ...target });
          money -= target.value;
          stats.signings++;
          stats.money.spent += target.value;
        } else {
          stats.failed++;
        }
      }
    }
    
    // Ventas
    if (inWindow && team.players.length > 18 && Math.random() < 0.2) {
      const sellable = team.players.filter(p => p.overall < 80).sort((a,b) => a.overall - b.overall);
      if (sellable.length > 0) {
        const sold = sellable[0];
        team.players = team.players.filter(p => p.name !== sold.name);
        const fee = Math.round(sold.value * 0.85);
        money += fee;
        stats.sales++;
        stats.money.earned += fee;
      }
    }
    
    // Gastos semanales
    money += 500000;
    money -= team.players.reduce((s, p) => s + (p.salary || 50000), 0);
  }
  
  // Fin de temporada
  const pos = tbl.findIndex(t => t.teamId === teamId) + 1;
  stats.positions[pos] = (stats.positions[pos] || 0) + 1;
  stats.avgSquadSize.push(team.players.length);
  stats.seasons++;
  
  if (money < -50000000) stats.bankruptcies++;
  
  // Preparar siguiente temporada
  money = Math.max(money, 5000000) + 40000000;
  team.players = team.players
    .map(p => ({ ...p, age: p.age + 1, overall: p.age >= 32 ? Math.max(60, p.overall - 1) : p.overall }))
    .filter(p => p.age <= 38);
  
  // Progress
  if (season % 20 === 0) {
    console.log(`  Temporada ${season}/100 completada...`);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

console.log(`\n⏱️ Tiempo: ${elapsed}s (${(100/parseFloat(elapsed)).toFixed(1)} temporadas/seg)`);

console.log('\n📊 RESULTADOS:');
console.log(`  Temporadas: ${stats.seasons}`);
console.log(`  Fichajes exitosos: ${stats.signings}`);
console.log(`  Fichajes fallidos: ${stats.failed}`);
console.log(`  Tasa éxito: ${((stats.signings/(stats.signings+stats.failed))*100).toFixed(1)}%`);
console.log(`  Ventas: ${stats.sales}`);
console.log(`  Gastado: ${formatMoney(stats.money.spent)}`);
console.log(`  Ingresado: ${formatMoney(stats.money.earned)}`);
console.log(`  Bancarrotas: ${stats.bankruptcies}`);

const avgSquad = stats.avgSquadSize.reduce((a,b) => a+b, 0) / stats.avgSquadSize.length;
console.log(`  Plantilla media: ${avgSquad.toFixed(1)} jugadores`);

console.log('\n🏆 POSICIONES:');
const sorted = Object.entries(stats.positions).sort((a,b) => Number(a[0]) - Number(b[0]));
const maxCount = Math.max(...sorted.map(([,c]) => c));
sorted.forEach(([pos, count]) => {
  const bar = '█'.repeat(Math.round(count / maxCount * 20));
  console.log(`  ${pos.padStart(2)}º: ${bar} ${count}`);
});

const avgPos = sorted.reduce((s, [p, c]) => s + Number(p) * c, 0) / stats.seasons;
const best = Math.min(...sorted.map(([p]) => Number(p)));
const worst = Math.max(...sorted.map(([p]) => Number(p)));
console.log(`\n  Media: ${avgPos.toFixed(1)}º | Mejor: ${best}º | Peor: ${worst}º`);

// Top 3 / Descenso stats
const top3 = (stats.positions[1] || 0) + (stats.positions[2] || 0) + (stats.positions[3] || 0);
const relegation = (stats.positions[18] || 0) + (stats.positions[19] || 0) + (stats.positions[20] || 0);
console.log(`  Top 3: ${top3} veces (${(top3/stats.seasons*100).toFixed(1)}%)`);
console.log(`  Descenso: ${relegation} veces (${(relegation/stats.seasons*100).toFixed(1)}%)`);

console.log('\n✅ Test de estrés completado');
