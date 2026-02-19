import fs from 'fs';
import https from 'https';

// Get refresh token from Firebase CLI config
const config = JSON.parse(fs.readFileSync('C:/Users/Pablo/.config/configstore/firebase-tools.json', 'utf8'));
const refreshToken = config.tokens.refresh_token;
const clientId = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'; // Firebase CLI client ID
const clientSecret = 'j9iVZfS8kkCEFUPaAeJV0sAi'; // Firebase CLI client secret (public)

const PROJECT_ID = 'pcfutbol-web';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Get access token
async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const data = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&client_id=${clientId}&client_secret=${clientSecret}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(JSON.parse(body).access_token));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Firestore REST helpers
async function firestoreRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${data.substring(0, 200)}`));
        else resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Convert JS object to Firestore document format
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return { fields };
}

// ============================================================
// TEAM GENERATION
// ============================================================

const SQUAD_TEMPLATE = [
  'GK','GK',
  'CB','CB','CB','CB',
  'LB','LB','RB','RB',
  'CDM','CDM','CM','CM','CM',
  'CAM','LW','RW','LM',
  'ST','ST','CF','RM'
];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }

const firstNames = {
  greek: ['N.','K.','D.','G.','A.','V.','S.','P.','L.','T.','M.','I.','E.','C.','F.','H.','R.','Z.','B.','O.'],
  czech: ['J.','M.','T.','P.','L.','D.','F.','R.','A.','V.','K.','S.','O.','Z.','I.','N.','H.','B.','E.','C.'],
  croatian: ['M.','I.','D.','N.','L.','A.','S.','K.','T.','Z.','P.','R.','B.','G.','F.','V.','H.','J.','E.','O.'],
  southAm: ['J.','C.','M.','A.','D.','R.','L.','S.','F.','E.','G.','H.','P.','N.','O.','T.','V.','B.','I.','W.']
};
const lastNames = {
  greek: ['Papadopoulos','Nikolaou','Georgiou','Konstantinou','Dimitriou','Vasileiou','Ioannou','Petridis','Alexiou','Christodoulou','Stavridis','Panagiotou','Antoniou','Karagiannis','Theodorou','Makris','Tsoukalas','Vlachos','Fotiadis','Zografos','Kapetanakis','Loukas','Manolis','Drakos','Filippou','Galanakis','Hatzis','Kaloudis','Leontidis','Maragkos'],
  czech: ['Novák','Dvořák','Svoboda','Černý','Procházka','Kučera','Veselý','Horák','Marek','Pospíšil','Hájek','Jelínek','Králíček','Růžička','Beneš','Fiala','Sedláček','Pokorný','Šťastný','Zeman','Blažek','Čermák','Doležal','Fišer','Holub','Jaroš','Kolář','Lacina','Machač','Navrátil'],
  croatian: ['Horvat','Kovačević','Babić','Marić','Novak','Jurić','Vuković','Matić','Tomić','Knežević','Perić','Blažević','Šarić','Pavlović','Golubić','Radić','Lukić','Mandić','Barišić','Dragović','Filipović','Grgić','Ivić','Jelić','Kramarić','Lovrić','Mihaljević','Nikolić','Orlić','Prskalo'],
  chile: ['González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Morales','Sepúlveda','Reyes','Gutiérrez','Torres','Araya','Hernández','Bravo','Vargas','Vásquez','Fuentes','Bustos','Cáceres','Delgado','Espinoza','Figueroa','Gallardo','Ibáñez','Jara','Lagos','Medina'],
  uruguay: ['García','Rodríguez','Martínez','López','González','Hernández','Pérez','Sánchez','Ramírez','Torres','Flores','Rivera','Gómez','Díaz','Cruz','Morales','Reyes','Gutiérrez','Ortiz','Ramos','Acosta','Bentancur','Cabrera','Duarte','Escobar','Ferreira','Giménez','Herrera','Ibarra','Juárez'],
  ecuador: ['López','García','Martínez','Rodríguez','Hernández','González','Pérez','Sánchez','Ramírez','Torres','Caicedo','Arboleda','Hurtado','Castillo','Zambrano','Valencia','Preciado','Quinónez','Estupiñán','Tenorio','Angulo','Banguera','Cifuentes','Delgado','Enríquez','Folleco','Gruezo','Ibarra','Jácome','Klinger'],
  paraguay: ['González','Rodríguez','Martínez','López','García','Hernández','Pérez','Gómez','Díaz','Romero','Benítez','Villalba','Cabañas','Rojas','Giménez','Aquino','Bobadilla','Cáceres','Domínguez','Enciso','Fernández','Gauto','Haedo','Irala','Jara','Lezcano','Morel','Núñez','Oviedo','Paredes'],
  peru: ['García','Rodríguez','Martínez','López','González','Hernández','Pérez','Sánchez','Ramírez','Torres','Flores','Guerrero','Carrillo','Cueva','Yotún','Advíncula','Zambrano','Tapia','Aquino','Callens','Dulanto','Espinoza','Farfán','Gonzales','Hurtado','Iberico','Lora','Mifflin','Nolberto','Calcaterra'],
  bolivia: ['García','Rodríguez','Martínez','López','González','Hernández','Pérez','Moreno','Romero','Saavedra','Chumacero','Arce','Bejarano','Castillo','Flores','Gutiérrez','Haquin','Justiniano','Lampe','Martins','Orellana','Pedriel','Quiroga','Ramallo','Saucedo','Torrico','Vaca','Wayar','Zenteno','Álvarez'],
  venezuela: ['García','Rodríguez','Martínez','López','González','Hernández','Pérez','Gómez','Díaz','Torres','Rondón','Soteldo','Osorio','Murillo','Rincón','Cumana','Bello','Córdova','Escalante','Graterol','Herrera','Ibarra','Josef','Lucena','Manzano','Navarro','Otero','Pinto','Rosales','Savarino'],
  colombia: ['García','Rodríguez','Martínez','López','González','Hernández','Pérez','Gómez','Díaz','Torres','Zapata','Muriel','Cuadrado','Mina','Ospina','Arias','Borja','Cuesta','Henao','Lerma','Mojica','Nieto','Ortega','Palacios','Quintero','Ríos','Sinisterra','Tello','Uribe','Velasco']
};

let currentRegion = 'greek';
const fnMap = { greek:'greek', czech:'czech', croatian:'croatian', chile:'southAm', uruguay:'southAm', ecuador:'southAm', paraguay:'southAm', peru:'southAm', bolivia:'southAm', venezuela:'southAm', colombia:'southAm' };

function generateName() {
  return `${pick(firstNames[fnMap[currentRegion]])} ${pick(lastNames[currentRegion])}`;
}

function generatePlayer(position, overallMin, overallMax) {
  const age = rand(17, 36);
  const overall = rand(overallMin, overallMax);
  const potential = Math.min(99, overall + rand(0, age < 24 ? 10 : 3));
  const value = Math.round(overall * overall * rand(5, 15) * (1 + (potential - overall) * 0.05));
  const salary = Math.max(5000, Math.round(value * 0.0025 + rand(0, 5000)));
  return { name: generateName(), position, age, overall, potential, value, salary, contract: rand(1, 4), morale: 75, fitness: 100 };
}

function generateTeam(name, league, overallMin, overallMax, region) {
  currentRegion = region;
  const id = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g, '-').replace(/-+$/,'');
  const players = SQUAD_TEMPLATE.map(pos => generatePlayer(pos, overallMin, overallMax));
  const avgOverall = Math.round(players.reduce((s,p) => s + p.overall, 0) / players.length);
  return { name, id, league, players, playerCount: players.length, avgOverall, updatedAt: new Date().toISOString() };
}

const leagueConfigs = {
  greekSuperLeague: { min: 55, max: 75, region: 'greek', teams: [
    'Aris Thessalonikis','Asteras Tripoleos','Atromitos Peristeriou','Volos NFC','Ionikos Nikaias',
    'Lamia FC','Levadiakos','OFI Kritis','Panaitolikos','PAS Ioannina'
  ]},
  czechLeague: { min: 50, max: 72, region: 'czech', teams: [
    'FK Baník Moravský','SK Sigma Hanácká','FK Dynamo Budějovické','FC Slovan Liberecký','FK Bohemians Vršovičtí',
    'FC Hradec Východní','SK Slovácko Uherské','FK Jablonec Severní','FK Teplice Lázně','FC Zlín Moravský',
    'FK Pardubice Východní','FC Karviná Slezská','FK Mladá Středočeská'
  ]},
  croatianLeague: { min: 50, max: 70, region: 'croatian', teams: [
    'NK Rijeka Primorska','NK Osijek Slavonski','NK Lokomotiva Trešnjevka','HNK Gorica Turopolska',
    'NK Istra Pulska','NK Varaždin Zagorski','NK Slaven Koprivnički','HNK Šibenik Dalmatinski'
  ]},
  chilePrimera: { min: 55, max: 78, region: 'chile', teams: [
    'Cobreloa Calameño','Audax Itálico Santiago','Everton Viñamarino','Cobresal Atacameño',
    'Ñublense Chillaneño','Huachipato Siderúrgico','Curicó Unidos','La Serena Papayero',
    'Antofagasta Puma','Coquimbo Puerto'
  ]},
  uruguayPrimera: { min: 55, max: 78, region: 'uruguay', teams: [
    'Defensor Sporting Violeta','Danubio Franjeado','Liverpool Montevideano','Wanderers Bohemio',
    'Plaza Colonia','River Plate Darsenero','Fénix Albirrojo','Progreso Gaucho',
    'Rentistas Bichos','Juventud Las Piedras','Sud América Alsina'
  ]},
  ecuadorLigaPro: { min: 55, max: 78, region: 'ecuador', teams: [
    'Deportivo Cuenca Morlacos','Aucas Quiteño','Macará Ambateño','Delfín Manabita',
    'Técnico Universitario Rodilla','Orense Machaleño','Cumbayá Suburbano','Libertad Lojeño',
    'Gualaceo Joyero','Imbabura Ibarreño','El Nacional Criollo'
  ]},
  paraguayPrimera: { min: 55, max: 78, region: 'paraguay', teams: [
    'Sol de América Danzarín','General Caballero JLM','Resistencia SC','Tacuary Villeta',
    '12 de Octubre Itaugüeño','Nacional Asunceño','Trinidense Obrero'
  ]},
  peruLiga1: { min: 55, max: 78, region: 'peru', teams: [
    'Carlos Mannucci Trujillano','Cienciano Cusqueño','Deportivo Garcilaso','ADT Tarmeño',
    'César Vallejo Poetista','Ayacucho FC Zorros','Cantolao Delfín','Binacional Juliaceño',
    'Comerciantes Unidos','Deportivo Municipal Edil','Sport Huancayo Rojo','UTC Cajamarca'
  ]},
  boliviaPrimera: { min: 55, max: 75, region: 'bolivia', teams: [
    'Bolívar Académico LP','The Strongest Atigrado','Oriente Petrolero SC','Blooming Cruceño',
    'Wilstermann Aviador','Jorge Wilstermann Rojo','Always Ready Millonario','Aurora Cochabambina',
    'Royal Pari Inmobiliario','Independiente Petrolero','Real Tomayapo Chapaco','Real Santa Cruz'
  ]},
  venezuelaPrimera: { min: 55, max: 75, region: 'venezuela', teams: [
    'Deportivo Táchira Aurinegro','Zamora FC Barinas','Monagas SC Guerrero','Deportivo Lara Crepuscular',
    'Metropolitanos Capitalino','Portuguesa FC Llanero','Mineros de Guayana','Estudiantes Mérida Albo',
    'Hermanos Colmenárez','Angostura FC Bolívar','Trujillanos Valiente','Zulia FC Petrolero'
  ]},
  colombiaPrimera: { min: 55, max: 78, region: 'colombia', teams: [
    'Deportivo Cali Azucarero','Junior Barranquillero','Millonarios Bogotano','Santa Fe Cardenal',
    'Deportivo Pereira Matecaña','Envigado Naranja','Jaguares Montería','Patriotas Boyacá',
    'Águilas Doradas Rionegro','Alianza Petrolera BGA','La Equidad Aseguradora','Deportivo Pasto Volcánico',
    'Boyacá Chicó Ajedrezado','Cortuluá Corazón','Llaneros Villavicencio','Fortaleza CEIF Bogotá'
  ]}
};

async function main() {
  const token = await getAccessToken();
  console.log('Got access token');
  
  let totalUploaded = 0;
  
  for (const [league, config] of Object.entries(leagueConfigs)) {
    console.log(`\n=== ${league}: generating ${config.teams.length} teams ===`);
    
    for (const teamName of config.teams) {
      const team = generateTeam(teamName, league, config.min, config.max, config.region);
      const doc = toFirestoreDoc(team);
      
      try {
        await firestoreRequest('POST', `/teams_v2`, doc, token);
        console.log(`  ✓ ${teamName} (${team.playerCount} players, avg ${team.avgOverall})`);
        totalUploaded++;
      } catch (e) {
        console.error(`  ✗ ${teamName}: ${e.message}`);
      }
    }
  }
  
  console.log(`\n=== DONE: ${totalUploaded} teams uploaded ===`);
  
  // Verify counts
  console.log('\n=== VERIFICATION ===');
  const expected = { greekSuperLeague:14, czechLeague:16, croatianLeague:10, chilePrimera:16, uruguayPrimera:16, ecuadorLigaPro:16, paraguayPrimera:12, peruLiga1:18, boliviaPrimera:16, venezuelaPrimera:16, colombiaPrimera:20 };
  
  for (const [league, exp] of Object.entries(expected)) {
    try {
      // Query with structuredQuery
      const result = await new Promise((resolve, reject) => {
        const body = JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'teams_v2' }],
            where: { fieldFilter: { field: { fieldPath: 'league' }, op: 'EQUAL', value: { stringValue: league } } }
          }
        });
        const req = https.request({
          hostname: 'firestore.googleapis.com',
          path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }, (res) => {
          let data = '';
          res.on('data', d => data += d);
          res.on('end', () => {
            const docs = JSON.parse(data);
            const count = Array.isArray(docs) ? docs.filter(d => d.document).length : 0;
            resolve(count);
          });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });
      const ok = result >= exp ? '✓' : '✗';
      console.log(`  ${ok} ${league}: ${result}/${exp}`);
    } catch(e) {
      console.log(`  ? ${league}: error - ${e.message}`);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
