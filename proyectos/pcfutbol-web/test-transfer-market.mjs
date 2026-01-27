// ============================================================
// TEST COMPLETO DEL SISTEMA DE FICHAJES v2
// ============================================================

import { 
  TransferMarket, 
  createTransferMarket, 
  isTransferWindowOpen, 
  daysUntilWindowClose,
  formatOffer,
  OFFER_STATUS,
  LOAN_TYPES,
  AGENT_TYPES,
  CLAUSE_TYPES
} from './src/game/transferMarket.js';
import { generatePlayerPersonality, PERSONALITIES } from './src/game/playerPersonality.js';

console.log('🔄 TEST SISTEMA DE FICHAJES COMPLETO v2');
console.log('═'.repeat(70));

// ============================================================
// CREAR DATOS DE PRUEBA
// ============================================================

const createTestData = () => {
  const players = {};
  const teams = {};

  // Crear equipos
  const teamData = [
    { id: 'madrid', name: 'Real Madrid', shortName: 'Madrid', budget: 200000000, reputation: 95, leagueLevel: 1 },
    { id: 'barcelona', name: 'FC Barcelona', shortName: 'Barça', budget: 150000000, reputation: 93, leagueLevel: 1 },
    { id: 'atletico', name: 'Atlético Madrid', shortName: 'Atleti', budget: 80000000, reputation: 85, leagueLevel: 1 },
    { id: 'sevilla', name: 'Sevilla FC', shortName: 'Sevilla', budget: 50000000, reputation: 78, leagueLevel: 1 },
    { id: 'betis', name: 'Real Betis', shortName: 'Betis', budget: 35000000, reputation: 72, leagueLevel: 1 },
    { id: 'getafe', name: 'Getafe CF', shortName: 'Getafe', budget: 15000000, reputation: 60, leagueLevel: 1 },
    { id: 'leganes', name: 'CD Leganés', shortName: 'Leganés', budget: 8000000, reputation: 55, leagueLevel: 2 },
    { id: 'recreativo', name: 'Recreativo Huelva', shortName: 'Recre', budget: 800000, reputation: 45, leagueLevel: 4 }
  ];

  teamData.forEach(t => {
    teams[t.id] = { ...t, playerIds: [], wageBudget: t.budget * 0.4 };
  });

  // Crear jugadores
  const playerData = [
    // Madrid
    { id: 'p1', name: 'Vinicius Jr', position: 'LW', overall: 92, age: 24, teamId: 'madrid', salary: 350000 },
    { id: 'p2', name: 'Bellingham', position: 'CAM', overall: 90, age: 21, teamId: 'madrid', salary: 300000 },
    { id: 'p3', name: 'Rodrygo', position: 'RW', overall: 85, age: 23, teamId: 'madrid', salary: 200000 },
    { id: 'p4', name: 'Valverde', position: 'CM', overall: 88, age: 26, teamId: 'madrid', salary: 250000 },
    
    // Barcelona
    { id: 'p5', name: 'Pedri', position: 'CM', overall: 88, age: 21, teamId: 'barcelona', salary: 200000 },
    { id: 'p6', name: 'Gavi', position: 'CM', overall: 82, age: 20, teamId: 'barcelona', salary: 120000 },
    { id: 'p7', name: 'Lamine Yamal', position: 'RW', overall: 84, age: 17, teamId: 'barcelona', salary: 100000 },
    
    // Atlético
    { id: 'p8', name: 'Griezmann', position: 'ST', overall: 84, age: 33, teamId: 'atletico', salary: 280000 },
    { id: 'p9', name: 'João Félix', position: 'CAM', overall: 81, age: 24, teamId: 'atletico', salary: 180000 },
    
    // Sevilla
    { id: 'p10', name: 'Lukebakio', position: 'RW', overall: 78, age: 27, teamId: 'sevilla', salary: 80000 },
    
    // Betis
    { id: 'p11', name: 'Isco', position: 'CAM', overall: 79, age: 32, teamId: 'betis', salary: 100000 },
    { id: 'p12', name: 'Joven Promesa', position: 'CM', overall: 72, age: 19, teamId: 'betis', salary: 25000 },
    
    // Getafe
    { id: 'p13', name: 'Borja Mayoral', position: 'ST', overall: 75, age: 27, teamId: 'getafe', salary: 50000 },
    
    // Leganés
    { id: 'p14', name: 'Talismán Local', position: 'ST', overall: 70, age: 28, teamId: 'leganes', salary: 20000 },
    
    // Recreativo
    { id: 'p15', name: 'Canterano', position: 'CM', overall: 65, age: 20, teamId: 'recreativo', salary: 8000 },
    
    // Agentes libres
    { id: 'p16', name: 'Veterano Libre', position: 'CB', overall: 74, age: 34, teamId: null, salary: 0 },
    { id: 'p17', name: 'Joven Libre', position: 'RW', overall: 68, age: 22, teamId: null, salary: 0 }
  ];

  playerData.forEach(p => {
    // Generar personalidad
    const personality = generatePlayerPersonality(p, Date.now());
    players[p.id] = { 
      ...p, 
      personality,
      contractYears: p.age <= 24 ? 4 : (p.age >= 30 ? 2 : 3),
      releaseClause: p.overall >= 85 ? p.overall * 10000000 : null
    };
    
    // Añadir a equipo
    if (p.teamId && teams[p.teamId]) {
      teams[p.teamId].playerIds.push(p.id);
    }
  });

  return {
    players,
    teams,
    playerTeamId: 'betis', // Jugamos con el Betis
    currentDate: '2026-07-15' // Mercado de verano abierto
  };
};

// ============================================================
// TESTS
// ============================================================

const gameState = createTestData();
const market = createTransferMarket(gameState);

const formatMoney = (n) => n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : `€${(n/1e3).toFixed(0)}K`;

// Test 1: Verificar ventana de fichajes
console.log('\n📅 TEST 1: Ventana de fichajes');
console.log('─'.repeat(50));
const windowStatus = isTransferWindowOpen(gameState.currentDate);
console.log(`  Estado: ${windowStatus.open ? '✅ ABIERTA' : '❌ CERRADA'}`);
console.log(`  Periodo: ${windowStatus.name || 'N/A'}`);
if (windowStatus.open) {
  const daysLeft = daysUntilWindowClose(gameState.currentDate, windowStatus.window);
  console.log(`  Días hasta cierre: ${daysLeft}`);
}

// Test 2: Calcular valor de mercado
console.log('\n💰 TEST 2: Valores de mercado');
console.log('─'.repeat(50));
const testPlayers = ['p1', 'p2', 'p7', 'p12', 'p15'];
testPlayers.forEach(id => {
  const player = gameState.players[id];
  const value = market.calculateMarketValue(player);
  console.log(`  ${player.name.padEnd(20)} | OVR ${player.overall} | Edad ${player.age} | ${formatMoney(value)}`);
});

// Test 3: Sistema de préstamos
console.log('\n🔄 TEST 3: Sistema de préstamos');
console.log('─'.repeat(50));

// Crear oferta de préstamo: Joven Promesa del Betis al Leganés
const loanResult = market.createLoanOffer({
  playerId: 'p12',
  fromTeamId: 'betis',
  toTeamId: 'leganes',
  duration: 12,
  loanFee: 100000,
  wageSplit: 100,
  buyOption: { amount: 3000000, mandatory: false }
});

console.log(`  Oferta creada: ${loanResult.success ? '✅' : '❌'}`);
if (loanResult.offer) {
  console.log(`  Jugador: ${loanResult.offer.playerName}`);
  console.log(`  De ${loanResult.offer.fromTeamName} → ${loanResult.offer.toTeamName}`);
  console.log(`  Duración: ${loanResult.offer.duration} meses`);
  console.log(`  Opción compra: ${formatMoney(loanResult.offer.buyOption?.amount || 0)}`);
}

// Responder a la oferta
const loanResponse = market.respondToLoanOffer(loanResult.offer.id, 'accept');
console.log(`\n  Respuesta club: ${loanResponse.success ? '✅ Aceptada' : '❌ ' + loanResponse.error}`);
if (loanResponse.playerReasons) {
  console.log('  Razones del jugador:');
  loanResponse.playerReasons.forEach(r => console.log(`    ${r.positive ? '✅' : '❌'} ${r.text}`));
}

// Test 4: Ofertas entrantes de IA
console.log('\n📥 TEST 4: Ofertas entrantes de IA');
console.log('─'.repeat(50));

// Hacer que Isco quiera irse
gameState.players['p11'].personality.happiness = 30;
gameState.players['p11'].personality.wantsToLeave = true;

const aiOffers = market.generateAIOffers('betis');
console.log(`  Ofertas generadas: ${aiOffers.length}`);
aiOffers.forEach(offer => {
  console.log(`\n  📨 ${offer.toTeamName} → ${offer.playerName}`);
  console.log(`     Cantidad: ${formatMoney(offer.amount)}`);
  console.log(`     Salario ofrecido: ${formatMoney(offer.salaryOffer * 52)}/año`);
  console.log(`     Contrato: ${offer.contractYears} años`);
});

// Test 5: Negociación con jugador
console.log('\n🤝 TEST 5: Negociación con jugador');
console.log('─'.repeat(50));

if (aiOffers.length > 0) {
  const testOffer = aiOffers[0];
  
  // Simular que el club acepta
  console.log(`  Oferta: ${testOffer.toTeamName} por ${testOffer.playerName}`);
  console.log(`  Monto: ${formatMoney(testOffer.amount)}`);
  
  // Negociar con el jugador
  const negotiation = market.negotiateWithPlayer(testOffer.id);
  console.log(`\n  Respuesta jugador: ${negotiation.response.toUpperCase()}`);
  console.log(`  Probabilidad aceptación: ${negotiation.probability}%`);
  console.log('  Razones:');
  negotiation.reasons.slice(0, 5).forEach(r => 
    console.log(`    ${r.positive ? '✅' : '❌'} ${r.text}`)
  );
  
  if (negotiation.counterDemand) {
    console.log('\n  📋 Contra-demanda del jugador:');
    console.log(`     Salario: ${formatMoney(negotiation.counterDemand.salary * 52)}/año`);
    console.log(`     Años: ${negotiation.counterDemand.contractYears}`);
    if (negotiation.counterDemand.signingBonus) {
      console.log(`     Prima: ${formatMoney(negotiation.counterDemand.signingBonus)}`);
    }
    if (negotiation.counterDemand.releaseClause) {
      console.log(`     Cláusula: ${formatMoney(negotiation.counterDemand.releaseClause)}`);
    }
  }
}

// Test 6: Deadline Day
console.log('\n⏰ TEST 6: Deadline Day Simulation');
console.log('─'.repeat(50));

const deadlineStart = market.startDeadlineDay();
console.log(`  ${deadlineStart.message}`);
console.log(`  Hora inicio: ${deadlineStart.startHour}:00`);

// Simular varias horas
for (let i = 0; i < 5; i++) {
  const hourResult = market.advanceDeadlineDayHour();
  if (!hourResult.active && hourResult.active !== undefined) {
    console.log(`\n  🔔 ${hourResult.message}`);
    break;
  }
  
  console.log(`\n  🕐 ${hourResult.hour}:00 - Urgencia: ${hourResult.urgencyLevel.toUpperCase()}`);
  console.log(`     Ofertas pendientes: ${hourResult.pendingDeals}`);
  
  if (hourResult.events && hourResult.events.length > 0) {
    console.log('     Eventos:');
    hourResult.events.slice(0, 3).forEach(e => {
      console.log(`       ${e.urgent ? '🚨' : '📌'} ${e.message}`);
    });
  }
}

// Saltar a últimas horas
console.log('\n  ⏩ Saltando a últimas horas...');
market.currentHour = 20;

for (let i = 0; i < 4; i++) {
  const hourResult = market.advanceDeadlineDayHour();
  if (!hourResult) break;
  
  // Verificar si es cierre de mercado
  if (hourResult.active === false) {
    console.log(`\n  🔔 ${hourResult.message}`);
    if (hourResult.summary) {
      console.log(`\n  📊 RESUMEN DEADLINE DAY:`);
      console.log(`     Fichajes completados: ${hourResult.summary.completed}`);
      console.log(`     Ofertas expiradas: ${hourResult.summary.expired}`);
      console.log(`     Valor total: ${formatMoney(hourResult.summary.totalValue)}`);
    }
    break;
  }
  
  console.log(`\n  🕐 ${hourResult.hour}:00 - ${hourResult.urgencyLevel === 'critical' ? '🚨 CRÍTICO' : '⚠️ URGENTE'}`);
  
  if (hourResult.events && hourResult.events.length > 0) {
    hourResult.events.slice(0, 2).forEach(e => {
      console.log(`     ${e.message}`);
    });
  }
}

// Test 7: Guerra de ofertas
console.log('\n⚔️ TEST 7: Guerra de ofertas');
console.log('─'.repeat(50));

// Crear múltiples ofertas por Vinicius
const offer1 = market.generateAIOffer(
  gameState.players['p1'],
  gameState.teams['madrid'],
  gameState.teams['barcelona']
);
const offer2 = market.generateAIOffer(
  gameState.players['p1'],
  gameState.teams['madrid'],
  { id: 'psg', name: 'PSG', budget: 300000000, reputation: 88 }
);

if (offer1 && offer2) {
  market.offers.push(offer1, offer2);
  
  console.log(`  Ofertas por ${offer1.playerName}:`);
  console.log(`    1. ${offer1.toTeamName}: ${formatMoney(offer1.amount)}`);
  console.log(`    2. ${offer2.toTeamName}: ${formatMoney(offer2.amount)}`);
  
  const biddingWar = market.handleBiddingWar('p1');
  if (biddingWar) {
    console.log(`\n  🔥 GUERRA DE OFERTAS`);
    console.log(`  Oferta más alta: ${formatMoney(biddingWar.highestBid)}`);
    biddingWar.offers.forEach(o => {
      console.log(`    ${o.teamName}: ${formatMoney(o.amount)}`);
    });
  }
}

// Test 8: Rumores generados
console.log('\n📰 TEST 8: Rumores del mercado');
console.log('─'.repeat(50));
market.rumors.slice(-5).forEach(r => {
  const reliability = Math.round(r.reliability * 100);
  console.log(`  [${reliability}% fiable] ${r.type}: ${r.data.playerName || 'N/A'}`);
});

// Test 9: Cláusulas de rescisión
console.log('\n📋 TEST 9: Cláusulas de rescisión');
console.log('─'.repeat(50));

// Vinicius tiene cláusula
const vinicius = gameState.players['p1'];
console.log(`  ${vinicius.name} - Cláusula: ${formatMoney(vinicius.releaseClause)}`);

// PSG intenta pagar la cláusula
gameState.teams['psg'] = { id: 'psg', name: 'PSG', budget: 500000000, reputation: 88, playerIds: [] };
const clauseResult = market.payReleaseClause('p1', 'psg');
console.log(`\n  PSG paga cláusula: ${clauseResult.success ? '✅' : '❌'}`);
if (clauseResult.success) {
  console.log(`  ${clauseResult.message}`);
  console.log(`  Siguiente paso: ${clauseResult.nextStep}`);
}

// Test 10: Sistema de agentes
console.log('\n🤝 TEST 10: Sistema de agentes');
console.log('─'.repeat(50));

// Asignar agentes a jugadores estrella
market.assignAgent('p1', 'auto');
market.assignAgent('p2', 'auto');
market.assignAgent('p5', 'auto');
market.assignAgent('p15', 'auto');

const testAgentPlayers = ['p1', 'p2', 'p5', 'p15'];
testAgentPlayers.forEach(id => {
  const player = gameState.players[id];
  const agent = AGENT_TYPES[player.agent || 'generic'];
  console.log(`  ${player.name.padEnd(20)} → ${agent.name} (comisión: ${(agent.fee * 100).toFixed(0)}%)`);
});

// Calcular comisión en un fichaje
if (clauseResult.success) {
  const agentFee = market.calculateAgentFee(vinicius, clauseResult.offer.amount);
  console.log(`\n  Comisión agente en fichaje de ${vinicius.name}: ${formatMoney(agentFee)}`);
}

// Test 11: Contraoferta del club
console.log('\n🔄 TEST 11: Contraoferta del club vendedor');
console.log('─'.repeat(50));

// Crear oferta baja por Pedri
const lowOffer = {
  id: 'test_low',
  playerId: 'p5',
  playerName: 'Pedri',
  fromTeamId: 'barcelona',
  toTeamId: 'madrid',
  amount: 30000000 // 30M por Pedri (bajo)
};

const counterOffer = market.generateSellerCounterOffer(lowOffer);
console.log(`  Oferta original: ${formatMoney(lowOffer.amount)}`);
console.log(`  Contraoferta: ${formatMoney(counterOffer.amount)}`);
console.log(`  Diferencia: +${formatMoney(counterOffer.amount - lowOffer.amount)}`);
if (counterOffer.conditions.length > 0) {
  console.log('  Condiciones adicionales:');
  counterOffer.conditions.forEach(c => {
    console.log(`    • ${c.text}: ${c.value}${c.type === 'sell_on' ? '%' : ''}`);
  });
}

// Test 12: Estado completo del mercado
console.log('\n📊 TEST 12: Estado del mercado');
console.log('─'.repeat(50));

const marketStatus = market.getMarketStatus();
console.log(`  Ventana: ${marketStatus.windowOpen ? '✅ ABIERTA' : '❌ CERRADA'} (${marketStatus.windowName || 'N/A'})`);
console.log(`  Ofertas totales: ${marketStatus.totalOffers}`);
console.log(`  Ofertas pendientes: ${marketStatus.pendingOffers}`);
console.log(`  Fichajes completados: ${marketStatus.completedDeals}`);
console.log(`  Gasto total: ${formatMoney(marketStatus.totalSpent)}`);

// Test 13: Simulación actividad diaria
console.log('\n🔄 TEST 13: Simulación actividad diaria');
console.log('─'.repeat(50));

for (let day = 1; day <= 3; day++) {
  const events = market.simulateDailyMarketActivity();
  console.log(`\n  Día ${day}:`);
  console.log(`    Eventos: ${events.length}`);
  events.slice(0, 3).forEach(e => {
    if (e.type === 'ai_offer') {
      console.log(`      📨 ${e.offer.toTeamName} interesado en ${e.offer.playerName}`);
    } else if (e.type === 'ai_transfer') {
      console.log(`      ✅ ${e.offer.playerName} → ${e.offer.toTeamName}`);
    } else if (e.type === 'ai_counter') {
      console.log(`      🔄 Contraoferta por ${e.offer.playerName}`);
    } else if (e.type === 'cleanup') {
      console.log(`      🧹 ${e.count} ofertas expiradas`);
    }
  });
}

// Test 14: Valores de mercado actualizados
console.log('\n💰 TEST 14: Valores de mercado (ACTUALIZADOS)');
console.log('─'.repeat(50));
const topPlayers = ['p1', 'p2', 'p5', 'p7', 'p8', 'p11', 'p12'];
topPlayers.forEach(id => {
  const player = gameState.players[id];
  if (!player) return;
  const value = market.calculateMarketValue(player);
  const clause = player.releaseClause ? formatMoney(player.releaseClause) : 'N/A';
  console.log(`  ${player.name.padEnd(20)} | OVR ${player.overall} | Edad ${player.age} | ${formatMoney(value).padStart(8)} | Cláusula: ${clause}`);
});

// Resumen final
console.log('\n' + '═'.repeat(70));
console.log('📊 RESUMEN DEL TEST');
console.log('═'.repeat(70));
console.log(`  ✅ Ofertas creadas: ${market.offers.length}`);
console.log(`  ✅ Préstamos creados: ${market.loanOffers.length}`);
console.log(`  ✅ Rumores generados: ${market.rumors.length}`);
console.log(`  ✅ Fichajes completados: ${market.completedDeals.length}`);
console.log(`  ✅ Tipos de agente: ${Object.keys(AGENT_TYPES).length}`);
console.log(`  ✅ Tipos de cláusula: ${Object.keys(CLAUSE_TYPES).length}`);

console.log('\n✅ Test del sistema de fichajes v2 completado');
