// Test de 500 simulaciones del sistema de Plantilla
// Verifica renovaciones, ventas y liberaciones

console.log('🧪 Test de 500 simulaciones del sistema de Plantilla\n');

const WEEKS_PER_YEAR = 52;

// Helpers del componente
const getPlayerValue = (player) => {
  const baseValue = Math.pow(player.overall / 50, 3) * 500000;
  const ageFactor = player.age <= 24 ? 1.3 : player.age <= 28 ? 1.1 : player.age <= 32 ? 0.8 : 0.5;
  return Math.round(baseValue * ageFactor);
};

const getRenewalDemand = (player) => {
  const currentSalary = player.salary || 30000;
  const overallFactor = player.overall / 75;
  const ageFactor = player.age <= 28 ? 1.2 : player.age <= 32 ? 1.0 : 0.85;
  const demandedSalary = Math.round(currentSalary * overallFactor * ageFactor * 1.15);
  const demandedYears = player.age <= 28 ? 4 : player.age <= 32 ? 3 : 2;
  return { salary: demandedSalary, years: demandedYears };
};

const getContractStatus = (player) => {
  const years = player.contractYears ?? 2;
  if (years <= 0) return { status: 'expired', label: 'Expirado', color: '#ff453a' };
  if (years <= 1) return { status: 'urgent', label: `${years} año`, color: '#ff9500' };
  return { status: 'ok', label: `${years} años`, color: '#30d158' };
};

const needsAttention = (player) => {
  const contractYears = player.contractYears ?? 2;
  const happiness = player.happiness ?? 70;
  const wantsToLeave = player.wantsToLeave ?? false;
  return contractYears <= 1 || happiness <= 40 || wantsToLeave;
};

// Generar jugadores aleatorios
const generatePlayer = (index) => {
  const positions = ['GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];
  const overall = 55 + Math.floor(Math.random() * 35); // 55-89
  const age = 18 + Math.floor(Math.random() * 18); // 18-35
  const salary = Math.round((overall * 500 + Math.random() * 20000)); // Basado en overall
  const contractYears = Math.floor(Math.random() * 5); // 0-4
  const happiness = 20 + Math.floor(Math.random() * 80); // 20-99
  
  return {
    name: `Jugador ${index}`,
    position: positions[Math.floor(Math.random() * positions.length)],
    overall,
    age,
    salary,
    contractYears,
    happiness,
    wantsToLeave: Math.random() < 0.1 // 10% quiere irse
  };
};

// Simular plantilla
const generateSquad = () => {
  const squad = [];
  for (let i = 0; i < 25; i++) {
    squad.push(generatePlayer(i));
  }
  return squad;
};

// Tests
const results = {
  total: 0,
  errors: [],
  renewals: { count: 0, avgIncrease: 0, totalIncrease: 0 },
  sales: { count: 0, avgValue: 0, totalValue: 0 },
  releases: { count: 0, avgSaved: 0, totalSaved: 0 },
  attentionNeeded: { count: 0, avgPerSquad: 0 },
  salaryStats: { min: Infinity, max: 0, avgTotal: 0 },
  valueStats: { min: Infinity, max: 0, avgTotal: 0 }
};

console.log('Ejecutando 500 simulaciones...\n');

for (let sim = 0; sim < 500; sim++) {
  const squad = generateSquad();
  const budget = 5000000 + Math.floor(Math.random() * 20000000); // 5M-25M
  
  // Calcular masa salarial
  const totalWeeklySalary = squad.reduce((sum, p) => sum + p.salary, 0);
  const totalYearlySalary = totalWeeklySalary * WEEKS_PER_YEAR;
  
  // Validaciones básicas
  if (totalWeeklySalary < 0) {
    results.errors.push(`Sim ${sim}: Salario semanal negativo`);
  }
  if (totalYearlySalary < 0) {
    results.errors.push(`Sim ${sim}: Salario anual negativo`);
  }
  
  // Stats de salario
  results.salaryStats.min = Math.min(results.salaryStats.min, totalYearlySalary);
  results.salaryStats.max = Math.max(results.salaryStats.max, totalYearlySalary);
  results.salaryStats.avgTotal += totalYearlySalary;
  
  // Jugadores que necesitan atención
  const attentionPlayers = squad.filter(needsAttention);
  results.attentionNeeded.count += attentionPlayers.length;
  
  // Simular acciones en 3 jugadores aleatorios
  for (let i = 0; i < 3; i++) {
    const player = squad[Math.floor(Math.random() * squad.length)];
    const action = Math.random();
    
    if (action < 0.4) {
      // RENOVAR
      const demand = getRenewalDemand(player);
      const increase = demand.salary - player.salary;
      const yearlyIncrease = increase * WEEKS_PER_YEAR;
      
      if (demand.salary <= 0) {
        results.errors.push(`Sim ${sim}: Demanda de salario <= 0`);
      }
      if (demand.years <= 0 || demand.years > 5) {
        results.errors.push(`Sim ${sim}: Años de contrato inválidos (${demand.years})`);
      }
      
      results.renewals.count++;
      results.renewals.totalIncrease += yearlyIncrease;
      
    } else if (action < 0.7) {
      // VENDER
      const value = getPlayerValue(player);
      const yearlySaved = player.salary * WEEKS_PER_YEAR;
      
      if (value < 0) {
        results.errors.push(`Sim ${sim}: Valor de jugador negativo`);
      }
      if (value > 200000000) {
        results.errors.push(`Sim ${sim}: Valor excesivo (${value})`);
      }
      
      results.sales.count++;
      results.sales.totalValue += value;
      results.valueStats.min = Math.min(results.valueStats.min, value);
      results.valueStats.max = Math.max(results.valueStats.max, value);
      results.valueStats.avgTotal += value;
      
    } else {
      // LIBERAR
      const yearlySaved = player.salary * WEEKS_PER_YEAR;
      
      if (yearlySaved < 0) {
        results.errors.push(`Sim ${sim}: Ahorro negativo`);
      }
      
      results.releases.count++;
      results.releases.totalSaved += yearlySaved;
    }
  }
  
  // Verificar estado de contratos
  for (const player of squad) {
    const contract = getContractStatus(player);
    if (!['expired', 'urgent', 'ok'].includes(contract.status)) {
      results.errors.push(`Sim ${sim}: Estado de contrato inválido`);
    }
  }
  
  results.total++;
}

// Calcular promedios
results.renewals.avgIncrease = results.renewals.count > 0 
  ? Math.round(results.renewals.totalIncrease / results.renewals.count) 
  : 0;
results.sales.avgValue = results.sales.count > 0 
  ? Math.round(results.sales.totalValue / results.sales.count) 
  : 0;
results.releases.avgSaved = results.releases.count > 0 
  ? Math.round(results.releases.totalSaved / results.releases.count) 
  : 0;
results.attentionNeeded.avgPerSquad = results.attentionNeeded.count / results.total;
results.salaryStats.avgTotal = Math.round(results.salaryStats.avgTotal / results.total);
results.valueStats.avgTotal = results.sales.count > 0 
  ? Math.round(results.valueStats.avgTotal / results.sales.count) 
  : 0;

// Reporte
console.log('='.repeat(60));
console.log('📋 REPORTE DE 500 SIMULACIONES - SISTEMA PLANTILLA');
console.log('='.repeat(60));

if (results.errors.length === 0) {
  console.log('\n✅ SIN ERRORES - Todas las validaciones pasaron');
} else {
  console.log(`\n❌ ${results.errors.length} ERRORES:`);
  results.errors.slice(0, 10).forEach(e => console.log(`  ${e}`));
  if (results.errors.length > 10) console.log(`  ... y ${results.errors.length - 10} más`);
}

console.log('\n📊 Estadísticas de acciones:');
console.log(`  Renovaciones: ${results.renewals.count} (aumento medio: €${(results.renewals.avgIncrease/1000).toFixed(0)}K/año)`);
console.log(`  Ventas: ${results.sales.count} (valor medio: €${(results.sales.avgValue/1000000).toFixed(2)}M)`);
console.log(`  Liberaciones: ${results.releases.count} (ahorro medio: €${(results.releases.avgSaved/1000).toFixed(0)}K/año)`);

console.log('\n💰 Estadísticas financieras:');
console.log(`  Masa salarial: €${(results.salaryStats.min/1000000).toFixed(1)}M - €${(results.salaryStats.max/1000000).toFixed(1)}M (media: €${(results.salaryStats.avgTotal/1000000).toFixed(1)}M/año)`);
console.log(`  Valor jugadores: €${(results.valueStats.min/1000).toFixed(0)}K - €${(results.valueStats.max/1000000).toFixed(1)}M (media: €${(results.valueStats.avgTotal/1000000).toFixed(2)}M)`);

console.log('\n⚠️ Jugadores que necesitan atención:');
console.log(`  Promedio por plantilla: ${results.attentionNeeded.avgPerSquad.toFixed(1)} jugadores`);

// Verificaciones de lógica
console.log('\n🔍 Verificación de lógica:');
const renewalMakeSense = results.renewals.avgIncrease > 0;
const valuesMakeSense = results.valueStats.min > 0 && results.valueStats.max < 200000000;
const attentionMakeSense = results.attentionNeeded.avgPerSquad > 0 && results.attentionNeeded.avgPerSquad < 25;

console.log(`  ¿Renovaciones aumentan salario? ${renewalMakeSense ? '✅ SÍ' : '❌ NO'} (media: +€${(results.renewals.avgIncrease/1000).toFixed(0)}K/año)`);
console.log(`  ¿Valores de mercado razonables? ${valuesMakeSense ? '✅ SÍ' : '❌ NO'} (€${(results.valueStats.min/1000).toFixed(0)}K - €${(results.valueStats.max/1000000).toFixed(1)}M)`);
console.log(`  ¿Detección de atención funciona? ${attentionMakeSense ? '✅ SÍ' : '❌ NO'} (${results.attentionNeeded.avgPerSquad.toFixed(1)}/25 jugadores)`);

console.log('\n' + '='.repeat(60));
console.log(results.errors.length === 0 && renewalMakeSense && valuesMakeSense && attentionMakeSense
  ? '🎉 SISTEMA PLANTILLA FUNCIONANDO CORRECTAMENTE'
  : '⚠️ REVISAR ERRORES O LÓGICA');
console.log('='.repeat(60));
