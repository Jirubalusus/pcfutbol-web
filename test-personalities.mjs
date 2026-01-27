// Test del sistema de personalidades y motivaciones
import { 
  generatePlayerPersonality, 
  evaluateTransferOffer,
  evaluateRenewalOffer,
  PERSONALITIES,
  SPECIAL_GOALS
} from './src/game/playerPersonality.js';

console.log('🧠 TEST DEL SISTEMA DE PERSONALIDADES');
console.log('═'.repeat(60));

// === TEST 1: Generación de personalidades ===
console.log('\n📋 TEST 1: Distribución de personalidades');
console.log('-'.repeat(40));

const personalityCounts = {};
const goalCounts = {};

for (let i = 0; i < 1000; i++) {
  const player = {
    name: `Player${i}`,
    overall: 60 + Math.floor(Math.random() * 35),
    age: 18 + Math.floor(Math.random() * 20)
  };
  
  const personality = generatePlayerPersonality(player, i * 100);
  personalityCounts[personality.type] = (personalityCounts[personality.type] || 0) + 1;
  
  if (personality.specialGoal) {
    goalCounts[personality.specialGoal] = (goalCounts[personality.specialGoal] || 0) + 1;
  }
}

console.log('Personalidades (de 1000 jugadores):');
Object.entries(personalityCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    const info = PERSONALITIES[type];
    console.log(`  ${info.icon} ${info.name.padEnd(12)} ${count.toString().padStart(3)} (${(count/10).toFixed(1)}%)`);
  });

console.log('\nObjetivos especiales:');
Object.entries(goalCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([goal, count]) => {
    const info = SPECIAL_GOALS[goal];
    console.log(`  ${info.icon} ${info.name.padEnd(20)} ${count.toString().padStart(3)} (${(count/10).toFixed(1)}%)`);
  });

// === TEST 2: Evaluación de ofertas ===
console.log('\n\n📋 TEST 2: Evaluación de ofertas de fichaje');
console.log('-'.repeat(40));

const testCases = [
  {
    name: 'Estrella ambiciosa → equipo grande',
    player: { name: 'Star', overall: 88, age: 27, salary: 300000, personality: { type: 'ambitious', happiness: 70 } },
    currentTeam: { reputation: 80 },
    newTeam: { reputation: 92 },
    offer: { salary: 350000, promisedRole: 'starter' }
  },
  {
    name: 'Veterano leal → más dinero',
    player: { name: 'Veteran', overall: 78, age: 33, salary: 150000, personality: { type: 'loyal', happiness: 85, loyaltyYears: 6 } },
    currentTeam: { reputation: 75 },
    newTeam: { reputation: 70 },
    offer: { salary: 200000, promisedRole: 'starter' }
  },
  {
    name: 'Joven competidor → sin minutos',
    player: { name: 'Young', overall: 76, age: 21, salary: 50000, personality: { type: 'competitor', happiness: 40, minutesPlayed: 20 } },
    currentTeam: { reputation: 85 },
    newTeam: { reputation: 75 },
    offer: { salary: 80000, promisedRole: 'starter' }
  },
  {
    name: 'Mercenario → oferta baja',
    player: { name: 'Merc', overall: 80, age: 28, salary: 200000, personality: { type: 'mercenary', happiness: 60 } },
    currentTeam: { reputation: 78 },
    newTeam: { reputation: 80 },
    offer: { salary: 180000, promisedRole: 'rotation' }
  },
  {
    name: 'Jugador con objetivo Mundial',
    player: { name: 'WCPlayer', overall: 82, age: 29, salary: 180000, personality: { type: 'professional', happiness: 50, minutesPlayed: 30, specialGoal: 'worldCup' } },
    currentTeam: { reputation: 85 },
    newTeam: { reputation: 75 },
    offer: { salary: 150000, promisedRole: 'starter' }
  },
  {
    name: 'Último gran contrato',
    player: { name: 'LastContract', overall: 79, age: 32, salary: 120000, personality: { type: 'professional', happiness: 65, specialGoal: 'lastContract' } },
    currentTeam: { reputation: 75 },
    newTeam: { reputation: 70 },
    offer: { salary: 200000, promisedRole: 'rotation' }
  }
];

testCases.forEach(tc => {
  const result = evaluateTransferOffer(tc.player, tc.currentTeam, tc.newTeam, tc.offer);
  
  console.log(`\n${tc.name}:`);
  console.log(`  Probabilidad: ${result.probability}% | Aceptaría: ${result.wouldAccept ? '✅ SÍ' : '❌ NO'}`);
  console.log(`  Razones:`);
  result.reasons.slice(0, 4).forEach(r => {
    console.log(`    ${r.positive ? '✓' : '✗'} ${r.text}`);
  });
});

// === TEST 3: Renovaciones ===
console.log('\n\n📋 TEST 3: Evaluación de renovaciones');
console.log('-'.repeat(40));

const renewalCases = [
  {
    name: 'Titular feliz, aumento modesto',
    player: { name: 'Happy', overall: 82, age: 26, salary: 150000, personality: { type: 'professional', happiness: 80, minutesPlayed: 85 } },
    team: { reputation: 78 },
    offer: { newSalary: 170000, years: 4 }
  },
  {
    name: 'Suplente descontento',
    player: { name: 'Unhappy', overall: 78, age: 24, salary: 100000, personality: { type: 'competitor', happiness: 35, minutesPlayed: 25 } },
    team: { reputation: 80 },
    offer: { newSalary: 120000, years: 3 }
  },
  {
    name: 'Veterano quiere seguridad',
    player: { name: 'OldPro', overall: 77, age: 34, salary: 120000, personality: { type: 'loyal', happiness: 70, minutesPlayed: 60, loyaltyYears: 8 } },
    team: { reputation: 75 },
    offer: { newSalary: 110000, years: 2 }
  },
  {
    name: 'Estrella joven infrapagada',
    player: { name: 'YoungStar', overall: 84, age: 23, salary: 80000, personality: { type: 'ambitious', happiness: 60, minutesPlayed: 90 } },
    team: { reputation: 82 },
    offer: { newSalary: 100000, years: 5 }
  }
];

renewalCases.forEach(tc => {
  const result = evaluateRenewalOffer(tc.player, tc.team, tc.offer);
  
  console.log(`\n${tc.name}:`);
  console.log(`  Probabilidad: ${result.probability}% | Respuesta: ${result.response.toUpperCase()}`);
  console.log(`  Razones:`);
  result.reasons.slice(0, 4).forEach(r => {
    console.log(`    ${r.positive ? '✓' : '✗'} ${r.text}`);
  });
  
  if (result.counterOffer) {
    console.log(`  Contraoferta: €${(result.counterOffer.salary/1000).toFixed(0)}K/sem, ${result.counterOffer.promisedRole}`);
  }
});

// === TEST 4: Consistencia ===
console.log('\n\n📋 TEST 4: Consistencia de decisiones');
console.log('-'.repeat(40));

const consistencyPlayer = { 
  name: 'TestPlayer', 
  overall: 80, 
  age: 26, 
  salary: 150000, 
  personality: { type: 'professional', happiness: 60, minutesPlayed: 50 } 
};

const acceptCounts = { accept: 0, reject: 0 };
const ITERATIONS = 100;

for (let i = 0; i < ITERATIONS; i++) {
  const result = evaluateTransferOffer(
    consistencyPlayer,
    { reputation: 75 },
    { reputation: 80 },
    { salary: 180000, promisedRole: 'starter' }
  );
  
  if (result.wouldAccept) acceptCounts.accept++;
  else acceptCounts.reject++;
}

console.log(`Misma oferta evaluada ${ITERATIONS} veces:`);
console.log(`  Aceptaría: ${acceptCounts.accept}% | Rechazaría: ${acceptCounts.reject}%`);
console.log(`  (El sistema es determinista, debería ser 100% uno u otro)`);

// === TEST 5: Impacto del rol prometido ===
console.log('\n\n📋 TEST 5: Impacto del rol prometido');
console.log('-'.repeat(40));

const roles = ['star', 'starter', 'rotation', 'backup'];
const rolePlayer = { 
  name: 'RoleTest', 
  overall: 79, 
  age: 25, 
  salary: 100000, 
  personality: { type: 'competitor', happiness: 50, minutesPlayed: 40 } 
};

console.log('Jugador competidor (quiere jugar):');
roles.forEach(role => {
  const result = evaluateTransferOffer(
    rolePlayer,
    { reputation: 75 },
    { reputation: 78 },
    { salary: 120000, promisedRole: role }
  );
  console.log(`  ${role.padEnd(10)} → ${result.probability}% interés`);
});

// === TEST 6: Personalidades extremas ===
console.log('\n\n📋 TEST 6: Comportamiento por personalidad');
console.log('-'.repeat(40));

const baseOffer = { salary: 200000, promisedRole: 'rotation' };
const basePlayer = { name: 'Test', overall: 82, age: 27, salary: 180000 };

Object.entries(PERSONALITIES).forEach(([type, info]) => {
  const player = { 
    ...basePlayer, 
    personality: { type, happiness: 60, minutesPlayed: 50 } 
  };
  
  const toSmall = evaluateTransferOffer(player, { reputation: 85 }, { reputation: 70 }, baseOffer);
  const toBig = evaluateTransferOffer(player, { reputation: 70 }, { reputation: 90 }, baseOffer);
  const moreMoney = evaluateTransferOffer(player, { reputation: 75 }, { reputation: 75 }, { salary: 300000, promisedRole: 'rotation' });
  
  console.log(`\n${info.icon} ${info.name}:`);
  console.log(`  A equipo pequeño: ${toSmall.probability}%`);
  console.log(`  A equipo grande:  ${toBig.probability}%`);
  console.log(`  Por más dinero:   ${moreMoney.probability}%`);
});

console.log('\n\n✅ Tests de personalidades completados');
