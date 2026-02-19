import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'public', 'data');

const LEAGUES = [
  'greekSuperLeague','czechLeague','croatianLeague','colombiaPrimera','chilePrimera',
  'uruguayPrimera','ecuadorLigaPro','paraguayPrimera','peruLiga1','boliviaPrimera','venezuelaPrimera'
];

const log = [];
function report(msg) { log.push(msg); console.log(msg); }

// Helper: value from overall
function valueFromOverall(ovr) {
  if (ovr >= 75) return 10000000;
  if (ovr >= 73) return 8000000;
  if (ovr >= 70) return 5000000;
  if (ovr >= 68) return 3000000;
  if (ovr >= 65) return 1500000;
  if (ovr >= 63) return 1000000;
  if (ovr >= 60) return 500000;
  return 300000;
}

function makePlayer(name, position, age, overall) {
  const value = valueFromOverall(overall);
  const salary = Math.max(15000, Math.round(value * 0.003));
  const contract = age >= 32 ? 1 : age >= 28 ? 2 : 3;
  return { name, position, age, overall, value, salary, contract, morale: 75, fitness: 100 };
}

// FIX 1: Nacional Athletic - generate 25 players
function fixNacionalAthletic(leagues) {
  const py = leagues.paraguayPrimera;
  const team = py.find(t => t.name === 'Nacional Athletic');
  if (!team) return;

  team.budget = 5000000;
  team.reputation = 75;
  team.city = 'Asunción';
  team.stadium = 'Estadio Defensores del Chaco';
  team.stadiumCapacity = 42000;

  const players = [
    // 3 POR
    makePlayer('Ramón Ayala', 'POR', 28, 72),
    makePlayer('Diego Ñamandú', 'POR', 22, 65),
    makePlayer('Carlos Benítez', 'POR', 34, 68),
    // 5 DFC
    makePlayer('Julio Caballero', 'DFC', 26, 73),
    makePlayer('Marcos Riveros', 'DFC', 30, 71),
    makePlayer('Gustavo Paredes', 'DFC', 24, 69),
    makePlayer('Héctor Giménez', 'DFC', 21, 66),
    makePlayer('Nelson Acosta', 'DFC', 33, 70),
    // 2 LB
    makePlayer('Fernando Espínola', 'LB', 25, 70),
    makePlayer('Óscar Cabañas', 'LB', 20, 64),
    // 2 RB
    makePlayer('Roberto Vera', 'RB', 27, 71),
    makePlayer('Adrián Samudio', 'RB', 22, 65),
    // 3 MCD/MC
    makePlayer('Luis Sanabria', 'MCD', 29, 73),
    makePlayer('Esteban Rojas', 'MC', 26, 72),
    makePlayer('Sergio Aquino', 'MC', 23, 68),
    // 3 MCO/EI/ED
    makePlayer('Alejandro Villalba', 'MCO', 25, 74),
    makePlayer('Cristian Oviedo', 'EI', 24, 71),
    makePlayer('Matías Gauto', 'ED', 21, 67),
    // 4 DC
    makePlayer('Raúl Domínguez', 'DC', 27, 75),
    makePlayer('Pablo Arévalo', 'DC', 30, 72),
    makePlayer('Iván Chamorro', 'DC', 22, 68),
    makePlayer('Darío Irala', 'DC', 19, 63),
    // 3 extras
    makePlayer('Tomás Bareiro', 'MC', 18, 62),
    makePlayer('Andrés Centurión', 'DFC', 20, 64),
    makePlayer('Miguel Aponte', 'DC', 32, 70),
  ];

  team.players = players;
  team.playerCount = players.length;
  team.avgOverall = Math.round(players.reduce((s, p) => s + p.overall, 0) / players.length);
  report(`✅ FIX1: Nacional Athletic — generated ${players.length} players, budget=5M, rep=75`);
}

// FIX 2: Resistencia Club — trim to 30
function trimTeam(team, max, leagueId) {
  if (!team.players || team.players.length <= max) return false;
  const before = team.players.length;
  team.players.sort((a, b) => b.overall - a.overall);
  team.players = team.players.slice(0, max);
  team.playerCount = team.players.length;
  team.avgOverall = Math.round(team.players.reduce((s, p) => s + p.overall, 0) / team.players.length);
  report(`✅ ${leagueId}: ${team.name} trimmed ${before} → ${max}`);
  return true;
}

// FIX 3: age 15 → 16
function fixAge15(leagues) {
  let count = 0;
  for (const [lid, teams] of Object.entries(leagues)) {
    for (const t of teams) {
      for (const p of (t.players || [])) {
        if (p.age === 15) { p.age = 16; count++; }
      }
    }
  }
  report(`✅ FIX3: Fixed ${count} players with age 15 → 16`);
}

// FIX 4: Trim squads > 35 to 30
function trimAllSquads(leagues) {
  for (const [lid, teams] of Object.entries(leagues)) {
    for (const t of teams) {
      if (t.players && t.players.length > 35) {
        trimTeam(t, 30, lid);
      }
    }
  }
}

// FIX 5: Boost top teams
function boostTopTeams(leagues) {
  const boosts = {
    paraguayPrimera: { count: 3, boost: 5 },
    peruLiga1: { count: 3, boost: 3 },
    boliviaPrimera: { count: 3, boost: 5 },
    venezuelaPrimera: { count: 3, boost: 4 },
  };
  for (const [lid, { count, boost }] of Object.entries(boosts)) {
    const teams = leagues[lid];
    const sorted = [...teams].sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
    const topNames = sorted.slice(0, count).map(t => t.name);
    for (const t of teams) {
      if (topNames.includes(t.name)) {
        for (const p of (t.players || [])) {
          p.overall = Math.min(85, p.overall + boost);
          p.value = valueFromOverall(p.overall);
          p.salary = Math.max(15000, Math.round(p.value * 0.003));
        }
        t.avgOverall = Math.round(t.players.reduce((s, p) => s + p.overall, 0) / t.players.length);
        report(`✅ FIX5: ${lid}/${t.name} boosted +${boost} (new avg: ${t.avgOverall})`);
      }
    }
  }
}

// FIX 6 & 7: Add players to Ecuador teams
function fixEcuador(leagues) {
  const ec = leagues.ecuadorLigaPro;
  
  const porteno = ec.find(t => t.name === 'Porteño CF');
  if (porteno) {
    porteno.players.push(makePlayer('Jefferson Montaño', 'MC', 22, 63));
    porteno.playerCount = porteno.players.length;
    porteno.avgOverall = Math.round(porteno.players.reduce((s, p) => s + p.overall, 0) / porteno.players.length);
    report(`✅ FIX6: Porteño CF — added MC player (now ${porteno.players.length})`);
  }

  const ibarreno = ec.find(t => t.name === 'Ibarreño Atlético');
  if (ibarreno) {
    ibarreno.players.push(makePlayer('Andrés Cevallos', 'POR', 25, 62));
    ibarreno.playerCount = ibarreno.players.length;
    ibarreno.avgOverall = Math.round(ibarreno.players.reduce((s, p) => s + p.overall, 0) / ibarreno.players.length);
    report(`✅ FIX7: Ibarreño Atlético — added GK (now ${ibarreno.players.length})`);
  }
}

// Main
async function main() {
  console.log('🔧 Fixing 11 leagues...\n');

  // Load all
  const leagues = {};
  for (const lid of LEAGUES) {
    leagues[lid] = JSON.parse(readFileSync(join(dataDir, `${lid}.json`), 'utf8'));
  }

  // Apply fixes in order
  fixNacionalAthletic(leagues);
  
  // FIX 2: Resistencia
  const resis = leagues.paraguayPrimera.find(t => t.name === 'Resistencia Club');
  if (resis) trimTeam(resis, 30, 'paraguayPrimera');

  fixAge15(leagues);
  trimAllSquads(leagues);
  boostTopTeams(leagues);
  fixEcuador(leagues);

  // Write back
  for (const lid of LEAGUES) {
    writeFileSync(join(dataDir, `${lid}.json`), JSON.stringify(leagues[lid], null, 2), 'utf8');
  }
  report('\n📁 All JSON files saved.');

  // Try Firestore upload
  console.log('\n📤 Attempting Firestore upload...');
  try {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, doc, setDoc } = await import('firebase/firestore');
    const { firebaseConfig } = await import('./firebase-config.mjs');
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    for (const lid of LEAGUES) {
      try {
        await setDoc(doc(db, 'teams_v2', lid), { teams: leagues[lid] });
        report(`✅ Uploaded teams_v2/${lid}`);
      } catch (e) {
        if (e.code === 'permission-denied' || e.message?.includes('PERMISSION_DENIED')) {
          report(`⚠️ PERMISSION_DENIED for teams_v2/${lid} — need to open Firestore rules`);
          break;
        }
        throw e;
      }
    }
  } catch (e) {
    report(`⚠️ Firestore upload failed: ${e.message}`);
    report('💾 Fixed JSONs are saved locally. Upload manually when permissions are open.');
  }

  console.log('\n📋 Summary:');
  log.forEach(l => console.log('  ' + l));
}

main().catch(e => { console.error('❌', e); process.exit(1); });
