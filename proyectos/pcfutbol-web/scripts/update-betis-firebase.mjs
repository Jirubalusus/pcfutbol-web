// Script para actualizar la plantilla del Betis en Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBqC6Im3pkGjdRqVJInYi0jNCO4A8iLwP8",
  authDomain: "pcfutbol-6ccef.firebaseapp.com",
  projectId: "pcfutbol-6ccef",
  storageBucket: "pcfutbol-6ccef.firebasestorage.app",
  messagingSenderId: "407418193650",
  appId: "1:407418193650:web:00bea1f9f6b4b0df4f8c41"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Función para calcular overall basado en valor (millones €)
function calculateOverall(valueMillions, age) {
  // Base según valor
  let overall;
  if (valueMillions >= 80) overall = 90;
  else if (valueMillions >= 60) overall = 88;
  else if (valueMillions >= 45) overall = 86;
  else if (valueMillions >= 35) overall = 84;
  else if (valueMillions >= 25) overall = 82;
  else if (valueMillions >= 18) overall = 80;
  else if (valueMillions >= 12) overall = 78;
  else if (valueMillions >= 8) overall = 76;
  else if (valueMillions >= 5) overall = 74;
  else if (valueMillions >= 3) overall = 72;
  else if (valueMillions >= 1.5) overall = 70;
  else if (valueMillions >= 0.8) overall = 68;
  else if (valueMillions >= 0.4) overall = 66;
  else overall = 64;
  
  // Ajuste por edad para veteranos
  if (age >= 35) overall = Math.min(overall, 75);
  else if (age >= 33) overall = Math.min(overall, 78);
  
  return overall;
}

// Calcular salario basado en valor
function calculateSalary(valueMillions) {
  return Math.round(valueMillions * 3000 + 15000);
}

// Plantilla actualizada del Betis 25/26 según Transfermarkt
const betisPlayers = [
  // Porteros
  { name: 'Álvaro Valles', position: 'GK', age: 28, value: 2500000 },
  { name: 'Pau López', position: 'GK', age: 31, value: 2500000 },
  { name: 'Adrián', position: 'GK', age: 39, value: 400000 },
  // Defensas centrales
  { name: 'Natan', position: 'CB', age: 24, value: 20000000 },
  { name: 'Valentín Gómez', position: 'CB', age: 22, value: 12000000 },
  { name: 'Diego Llorente', position: 'CB', age: 32, value: 3000000 },
  { name: 'Marc Bartra', position: 'CB', age: 35, value: 1000000 },
  // Laterales
  { name: 'Junior Firpo', position: 'LB', age: 29, value: 6000000 },
  { name: 'Ricardo Rodríguez', position: 'LB', age: 33, value: 1500000 },
  { name: 'Ángel Ortiz', position: 'RB', age: 21, value: 4000000 },
  { name: 'Héctor Bellerín', position: 'RB', age: 30, value: 2500000 },
  // Centrocampistas
  { name: 'Sofyan Amrabat', position: 'CDM', age: 29, value: 12000000 },
  { name: 'Marc Roca', position: 'CDM', age: 29, value: 4000000 },
  { name: 'Sergi Altimira', position: 'CM', age: 24, value: 20000000 },
  { name: 'Nelson Deossa', position: 'CM', age: 25, value: 9000000 },
  { name: 'Pablo Fornals', position: 'CM', age: 29, value: 8000000 },
  { name: 'Giovani Lo Celso', position: 'CAM', age: 29, value: 15000000 },
  { name: 'Isco', position: 'CAM', age: 33, value: 4000000 },
  // Extremos
  { name: 'Abde Ezzalzouli', position: 'LW', age: 24, value: 20000000 },
  { name: 'Rodrigo Riquelme', position: 'LW', age: 25, value: 8000000 },
  { name: 'Antony', position: 'RW', age: 25, value: 30000000 },
  { name: 'Pablo García', position: 'RW', age: 19, value: 10000000 },
  { name: 'Aitor Ruibal', position: 'RW', age: 29, value: 3500000 },
  // Delanteros
  { name: 'Cucho Hernández', position: 'ST', age: 26, value: 18000000 },
  { name: 'Chimy Ávila', position: 'ST', age: 31, value: 1500000 },
  { name: 'Cédric Bakambu', position: 'ST', age: 34, value: 1400000 }
].map((p, idx) => {
  const valueM = p.value / 1000000;
  return {
    id: `betis_${idx + 1}`,
    name: p.name,
    position: p.position,
    age: p.age,
    overall: calculateOverall(valueM, p.age),
    value: p.value,
    salary: calculateSalary(valueM),
    contract: 3,
    status: 'available',
    injured: false
  };
});

// Calcular promedios
const avgOverall = Math.round(betisPlayers.reduce((s, p) => s + p.overall, 0) / betisPlayers.length);
const totalValue = betisPlayers.reduce((s, p) => s + p.value, 0);

async function updateBetis() {
  console.log('🔄 Actualizando Real Betis en Firebase...');
  
  // Buscar el documento del Betis
  const teamRef = doc(db, 'teams', 'real-betis-balompie');
  const teamSnap = await getDoc(teamRef);
  
  if (!teamSnap.exists()) {
    console.log('❌ No se encontró el equipo real-betis-balompie');
    console.log('Intentando con otros IDs posibles...');
    
    // Intentar otros posibles IDs
    const possibleIds = ['real_betis', 'betis', 'real-betis'];
    for (const id of possibleIds) {
      const ref = doc(db, 'teams', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        console.log(`✅ Encontrado como: ${id}`);
        await updateDoc(ref, {
          players: betisPlayers,
          avgOverall,
          totalValue,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Betis actualizado!');
        console.log(`   - Jugadores: ${betisPlayers.length}`);
        console.log(`   - Overall promedio: ${avgOverall}`);
        console.log(`   - Valor total: €${(totalValue/1000000).toFixed(1)}M`);
        process.exit(0);
      }
    }
    console.log('❌ No se encontró el equipo con ningún ID');
    process.exit(1);
  }
  
  await updateDoc(teamRef, {
    players: betisPlayers,
    avgOverall,
    totalValue,
    updatedAt: new Date().toISOString()
  });
  
  console.log('✅ Real Betis actualizado!');
  console.log(`   - Jugadores: ${betisPlayers.length}`);
  console.log(`   - Overall promedio: ${avgOverall}`);
  console.log(`   - Valor total: €${(totalValue/1000000).toFixed(1)}M`);
  
  process.exit(0);
}

updateBetis().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
