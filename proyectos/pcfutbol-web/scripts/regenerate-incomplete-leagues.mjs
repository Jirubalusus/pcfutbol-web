/**
 * Regenerate incomplete leagues using scraped Transfermarkt data
 * Generates fictional names for teams and players
 * Outputs to public/data/ and src/data/teams-*.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const scrapedDir = join(projectRoot, 'scraped-data', '2025-26');
const publicDataDir = join(projectRoot, 'public', 'data');
const srcDataDir = join(projectRoot, 'src', 'data');

// ============================================================
// Position mapping from broad categories
// ============================================================
function distributePositions(players) {
  // Group by broad position
  const gk = players.filter(p => p.positionRaw === 'Portero');
  const def = players.filter(p => p.positionRaw === 'Defensa');
  const mid = players.filter(p => p.positionRaw === 'Centrocampista');
  const fwd = players.filter(p => p.positionRaw === 'Delantero');

  // Assign specific positions within each group
  const defPositions = ['DFC', 'DFC', 'DFC', 'LB', 'RB', 'DFC', 'LB', 'RB', 'DFC', 'DFC'];
  const midPositions = ['MC', 'MCD', 'MCO', 'MC', 'EI', 'ED', 'MC', 'MCD', 'MCO', 'EI', 'ED', 'MC'];
  const fwdPositions = ['DC', 'DC', 'SD', 'DC', 'EI', 'ED', 'DC'];

  gk.forEach(p => p.gamePosition = 'POR');
  def.forEach((p, i) => p.gamePosition = defPositions[i % defPositions.length]);
  mid.forEach((p, i) => p.gamePosition = midPositions[i % midPositions.length]);
  fwd.forEach((p, i) => p.gamePosition = fwdPositions[i % fwdPositions.length]);

  return [...gk, ...def, ...mid, ...fwd];
}

// ============================================================
// Fictional name generators by culture
// ============================================================

// Seeded PRNG for reproducibility
let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}
function pick(arr) { return arr[Math.floor(seededRandom() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => seededRandom() - 0.5);
  return shuffled.slice(0, n);
}

const GREEK_FIRST = ['Nikolaos','Alexandros','Dimitrios','Georgios','Konstantinos','Ioannis','Panagiotis','Christos','Vasileios','Athanasios','Michail','Emmanouil','Stefanos','Andreas','Theodoros','Evangelos','Spyridon','Antonios','Ilias','Pavlos','Grigorios','Nektarios','Kyriakos','Markos','Stavros','Petros','Sotirios','Filippos','Leonidas','Marios','Thanasis','Kostas','Dimos','Giorgos','Nikos','Manolis','Aggelos','Vassilis','Loukas','Tasos','Aris','Fotis','Christodoulos','Paraskevas','Theofanis','Orestis','Nestoras','Serafeim','Achilleas','Aimilios'];
const GREEK_LAST = ['Papadopoulos','Vlachos','Nikolaidis','Georgiou','Konstantinou','Alexiou','Dimitriou','Papanikolaou','Karagiannis','Tsimikas','Oikonomou','Charalampidis','Vasileiou','Tsoukalas','Koukos','Angelopoulos','Athanasiou','Mavridis','Chrysanthopoulos','Karamanlis','Samaras','Spyropoulos','Kapetanakis','Sideris','Anagnostopoulos','Kanellopoulos','Bakoyannis','Galanis','Hadjigeorgiou','Mitropoulos','Zagorakis','Kourkoulas','Yfantis','Stavridis','Doukas','Vergis','Triandafyllidis','Pantelidis','Daskalakis','Ioannidis'];
const GREEK_TEAM_PREFIXES = ['Olympos','Athenikos','Thessaloniki','Panellinos','Aris','Apollon','Iraklis','Poseidon','Achilleas','Spartan','Kronos','Hermes','Hellas','Delphi','Aegean','Naxos','Corfu','Patras','Kavala','Larissa'];
const GREEK_TEAM_SUFFIXES = ['FC','SC','AC','United','Athletikos','Sport','Athletic'];
const GREEK_STADIUMS = ['Parthenon Arena','Aegean Stadium','Olympus Park','Acropolis Ground','Delphi Arena','Poseidon Stadium','Heracles Park','Apollo Arena','Athena Stadium','Zeus Ground','Marathon Park','Mycenae Arena','Sparta Stadium','Thessaly Arena','Pindus Ground'];

const CZECH_FIRST = ['Jan','Tomáš','Martin','Lukáš','David','Jakub','Pavel','Michal','Petr','Ondřej','Adam','Jiří','Matyáš','Vojtěch','Filip','Daniel','Dominik','Marek','Radek','Karel','Vladimír','Stanislav','Jaroslav','Ladislav','Bohumil','Milan','Zdeněk','Richard','Kamil','Aleš','Libor','Roman','Patrik','Josef','Šimon','Matěj','Kryštof','Vít','Radim','Igor'];
const CZECH_LAST = ['Novák','Svoboda','Novotný','Dvořák','Černý','Procházka','Kučera','Veselý','Horák','Němec','Marek','Pospíšil','Hájek','Jelínek','Král','Růžička','Beneš','Fiala','Sedláček','Kolář','Navrátil','Čermák','Vaněk','Kadlec','Šťastný','Bartoš','Vlček','Kovář','Blažek','Kratochvíl','Holub','Urban','Adamec','Šimek','Pokorný','Zeman','Havlíček','Řezníček','Krejčí','Bureš'];
const CZECH_TEAM_PREFIXES = ['Bohemia','Moravia','Slovan','Dynamo','Baník','Viktoria','Sigma','Teplice','Pardubice','Vysočina','Liberec','Olomouc','Zlín','Opava','Karviná','Hradec','Jablonec','Kladno','Brno','České'];
const CZECH_TEAM_SUFFIXES = ['FK','SC','AC','United','Athletic','Sport'];
const CZECH_STADIUMS = ['Vltava Arena','Bohemia Stadium','Hradčany Park','Moldau Ground','Šumava Arena','Moravia Stadium','Karlův Park','Wenceslas Arena','Pilsner Stadium','Krkonoše Ground','Elbe Arena','Tatras Park','Brno Arena','Liberec Stadium','Olomouc Ground'];

const CROATIAN_FIRST = ['Ivan','Luka','Marko','Mateo','Josip','Ante','Tomislav','Nikola','Hrvoje','Davor','Zvonimir','Šime','Domagoj','Bruno','Mario','Dario','Petar','Mislav','Igor','Robert','Vedran','Stipe','Branimir','Kristijan','Fran','Leo','Lovro','Tin','Borna','Filip','Patrik','Karlo','Dominik','Denis','Pero','Goran','Vjekoslav','Stanko','Zlatko','Marin'];
const CROATIAN_LAST = ['Horvat','Kovačević','Babić','Marić','Novak','Jurić','Knežević','Matić','Tomić','Vuković','Pavlović','Blažević','Perić','Galić','Radić','Mandžukić','Šarić','Krstić','Bilić','Rakitić','Barišić','Kramarić','Brozović','Sučić','Pašalić','Vlašić','Čolak','Petković','Livaja','Rebić','Perišić','Olić','Modrić','Šimić','Lovrić','Ivanušec','Vidović','Stanišić','Oršić','Kramarić'];
const CROATIAN_TEAM_PREFIXES = ['Adriatic','Zagreb','Dalmacija','Slavonia','Istra','Rijeka','Osijek','Split','Varaždin','Dubrovnik','Zadar','Pula','Šibenik','Koprivnica','Lokomotiva','Gorica','Solin','Vukovar','Sisak','Karlovac'];
const CROATIAN_TEAM_SUFFIXES = ['NK','SC','FC','United','Athletic'];
const CROATIAN_STADIUMS = ['Adriatic Arena','Dalmatian Stadium','Zagreb Park','Drava Ground','Sava Arena','Pannonian Stadium','Istria Park','Velebit Arena','Kornati Stadium','Plitvice Ground','Krka Arena','Neretva Park','Cetina Stadium','Konavle Ground','Marjan Arena'];

// South American names
const SA_FIRST = ['Santiago','Matías','Sebastián','Nicolás','Alejandro','Andrés','Diego','Fernando','Carlos','Daniel','Emiliano','Gabriel','Gonzalo','Hernán','Ignacio','Joaquín','Leonardo','Martín','Pablo','Rafael','Rodrigo','Tomás','Valentín','Lucas','Maximiliano','Franco','Federico','Agustín','Facundo','Leandro','Germán','Emanuel','Cristian','Víctor','Ramiro','Adrián','Esteban','Julián','Marcelo','Ángel','Gastón','Mauricio','Oscar','Claudio','Fabián','Iván','Joel','Kevin','Néstor','Raúl'];
const SA_LAST = ['González','Rodríguez','Martínez','López','García','Hernández','Pérez','Sánchez','Ramírez','Torres','Flores','Díaz','Morales','Reyes','Cruz','Ortiz','Gutiérrez','Mendoza','Vargas','Castillo','Jiménez','Herrera','Medina','Aguilar','Rojas','Vega','Castro','Ríos','Suárez','Romero','Álvarez','Fernández','Gómez','Ruiz','Muñoz','Navarro','Delgado','Cabrera','Córdoba','Acosta','Palacios','Quintero','Ospina','Cardona','Cuadrado','Zapata','Valencia','Arango','Rincón','Barrios'];

const COLOMBIAN_FIRST = [...SA_FIRST, 'Yerry','Duván','Jhon','Freddy','Wílmar','James','Teófilo','Falcao','Edwin','Harold','Yimmi','Yairo','Dairon','Déiber','Jaminton','Jhonatan','Jorman','Brayan','Stiven','Yerson'];
const COLOMBIAN_LAST = [...SA_LAST, 'Ospina','Cardona','Cuadrado','Zapata','Valencia','Arango','Rincón','Barrios','Asprilla','Valderrama','Higuita','Yepes','Córdoba','Perea','Guarín','Teo','Arias','Mojica','Lerma','Sinisterra'];
const COLOMBIAN_TEAM_PREFIXES = ['Andino','Caribe','Nacional','Atlético','Deportivo','Real','América','Millonarios','Independiente','Santa Fe','Cúcuta','Pereira','Manizales','Cali','Medellín','Barranquilla','Bucaramanga','Ibagué','Pasto','Cartagena'];
const COLOMBIAN_CITIES = ['Bogotá','Medellín','Cali','Barranquilla','Cartagena','Cúcuta','Bucaramanga','Pereira','Manizales','Ibagué','Santa Marta','Pasto','Armenia','Neiva','Villavicencio','Montería','Popayán','Tunja','Sincelejo','Valledupar'];

const CHILEAN_FIRST = [...SA_FIRST, 'Arturo','Alexis','Eduardo','Claudio','Mauricio','Charles','Gary','Marcelo','Jorge','Erick','Guillermo','Ben','Benjamín','Bastián','Iván','Paulo','Hugo','Jean','Brayan','Robinson'];
const CHILEAN_LAST = [...SA_LAST, 'Vidal','Sánchez','Bravo','Aránguiz','Isla','Medel','Beausejour','Valdivia','Salas','Zamorano','Vargas','Pinilla','Paredes','Mena','Maripán','Pulgar','Sagal','Brereton','Pizarro','Fierro'];
const CHILEAN_CITIES = ['Santiago','Valparaíso','Concepción','Antofagasta','Viña del Mar','Temuco','Rancagua','Talca','Arica','Iquique','Calama','Copiapó','La Serena','Coquimbo','Chillán','Osorno','Puerto Montt','Curicó','Los Ángeles','Punta Arenas'];

const URUGUAYAN_FIRST = [...SA_FIRST, 'Luis','Edinson','Federico','Diego','José','Álvaro','Giorgian','Maximiliano','Ronald','Darwin','Nahitan','Facundo','Agustín','Brian','Mathías','Mauro','Jonathan','Gastón','Camilo','Manuel'];
const URUGUAYAN_LAST = [...SA_LAST, 'Suárez','Cavani','Valverde','Godín','Giménez','Muslera','Forlán','Recoba','Francescoli','Lugano','Cáceres','Coates','Bentancur','Pellistri','Araújo','Viña','Torres','Núñez','De Arrascaeta','Pereiro'];
const URUGUAYAN_CITIES = ['Montevideo','Salto','Paysandú','Las Piedras','Rivera','Maldonado','Tacuarembó','Melo','Mercedes','Artigas','Treinta y Tres','Durazno','Florida','San José','Colonia','Rocha','Canelones','Fray Bentos','Minas','Carmelo'];

const ECUADORIAN_FIRST = [...SA_FIRST, 'Enner','Antonio','Ángel','Moisés','Pervis','Robert','Carlos','Byron','Romario','Jefferson','Michael','Christian','Gonzalo','Joao','Djorkaeff','Piero','Jeremy','Jordy','Kenny','Alan'];
const ECUADORIAN_LAST = [...SA_LAST, 'Valencia','Caicedo','Estupiñán','Plata','Hincapié','Arboleda','Preciado','Méndez','Cifuentes','Sarmiento','Ibarra','Minda','Gruezo','Franco','Ramírez','Castillo','Ángulo','Chalá','Estrada','Campana'];
const ECUADORIAN_CITIES = ['Quito','Guayaquil','Cuenca','Santo Domingo','Ambato','Portoviejo','Machala','Durán','Manta','Riobamba','Esmeraldas','Loja','Ibarra','Latacunga','Babahoyo','Quevedo','Milagro','Tulcán','Sangolquí','Otavalo'];

const PARAGUAYAN_FIRST = [...SA_FIRST, 'Óscar','Roque','Nelson','Derlis','Gustavo','Hernán','Roberto','Miguel','Julio','Antonio','Blas','Alfredo','Alberto','Richard','Aldo','Edgar','Cristhian','Darío','Jorge','Ángel'];
const PARAGUAYAN_LAST = [...SA_LAST, 'Romero','González','Almirón','Arzamendia','Gómez','Sanabria','Villasanti','Cubas','Balbuena','Cardozo','Santa Cruz','Gamarra','Chilavert','Cabañas','Valdez','Haedo','Bobadilla','Benítez','Cáceres','Piris'];
const PARAGUAYAN_CITIES = ['Asunción','Ciudad del Este','San Lorenzo','Luque','Capiatá','Lambaré','Fernando de la Mora','Limpio','Ñemby','Mariano Roque Alonso','Pedro Juan Caballero','Encarnación','Caaguazú','Coronel Oviedo','Concepción','Villarrica','Pilar','Itauguá','Caacupé','Hernandarias'];

const PERUVIAN_FIRST = [...SA_FIRST, 'Paolo','Jefferson','André','Yoshimar','Edison','Raúl','Gianluca','Renato','Alexander','Wilder','Andy','Raziel','Bryan','Marcos','Percy','Aldo','Josepmir','Christofer','Adrián','Piero'];
const PERUVIAN_LAST = [...SA_LAST, 'Guerrero','Farfán','Carrillo','Yotún','Flores','Lapadula','Ruidíaz','Tapia','Advíncula','Cueva','Abram','Callens','Zambrano','Aquino','Trauco','Peña','López','Quispe','Valera','Iberico'];
const PERUVIAN_CITIES = ['Lima','Arequipa','Trujillo','Chiclayo','Piura','Iquitos','Cusco','Huancayo','Tacna','Chimbote','Pucallpa','Cajamarca','Sullana','Juliaca','Ayacucho','Huánuco','Ica','Puno','Tumbes','Tarapoto'];

const BOLIVIAN_FIRST = [...SA_FIRST, 'Marcelo','Boris','Erwin','Ronald','Jaime','Carlos','Henry','Juan','Leonel','Jhasmani','José','Samuel','Diego','Víctor','Hugo','Rodrigo','Roberto','Nelson','Alejandro','Ramiro'];
const BOLIVIAN_LAST = [...SA_LAST, 'Martins','Moreno','Saucedo','Vaca','Justiniano','Bejarano','Chumacero','Arce','Ramallo','Wayar','Haquin','Sagredo','Fernández','Vaca Díez','Saavedra','Galindo','Zenteno','Pedriel','Cardozo','Álvarez'];
const BOLIVIAN_CITIES = ['La Paz','Santa Cruz','Cochabamba','Sucre','Oruro','Tarija','Potosí','Trinidad','Cobija','Riberalta','Montero','Warnes','Quillacollo','Sacaba','Viacha','El Alto','Yacuiba','Camiri','Bermejo','Villazón'];

const VENEZUELAN_FIRST = [...SA_FIRST, 'Salomón','Tomás','Josef','Jan','Yeferson','Jhonder','Darwin','Rómulo','Yangel','Eduard','Anderson','Roberto','Mikel','Richard','Jhon','Eric','Adalberto','Edson','Cristian','Rolf'];
const VENEZUELAN_LAST = [...SA_LAST, 'Rondón','Machís','Soteldo','Rincón','Arango','Otero','Cásseres','Chancellor','Osorio','Hernández','Murillo','Rosales','Savarino','Peñaranda','Herrera','Mago','Córdova','Velásquez','Hurtado','Figuera'];
const VENEZUELAN_CITIES = ['Caracas','Maracaibo','Valencia','Barquisimeto','Ciudad Guayana','Maturín','Barcelona','Maracay','Cumaná','Puerto La Cruz','Mérida','San Cristóbal','Cabimas','Barinas','Los Teques','Punto Fijo','Guanare','Acarigua','Valera','Tucupita'];

const SA_TEAM_SUFFIXES = ['FC','SC','CF','Deportivo','Atlético','Real','Club','United','Sport','Athletic'];
const SA_STADIUMS = ['Continental Arena','Nacional Stadium','Libertadores Park','Gran Estadio','Andes Arena','Sol Stadium','Monumental Park','Victoria Arena','Centenario Stadium','Imperial Ground','Dorado Arena','Cóndor Stadium','Pacífico Park','Cordillera Arena','Bolívar Stadium'];

// ============================================================
// Generate fictional team data from scraped data
// ============================================================

function generateFictionalTeam(scrapedTeam, nameConfig, index, leagueId) {
  const { firstNames, lastNames, teamPrefixes, teamSuffixes, stadiums, cities } = nameConfig;
  
  // Generate fictional team name
  const teamPrefix = teamPrefixes[index % teamPrefixes.length];
  const teamSuffix = pick(teamSuffixes);
  const fictionalName = `${teamPrefix} ${teamSuffix}`;
  const shortName = teamPrefix.substring(0, 3).toUpperCase();
  
  // Use real city from scraped data or from cities list
  const city = cities ? cities[index % cities.length] : 'Unknown';
  const stadium = stadiums[index % stadiums.length];
  
  // Calculate budget and reputation from market value
  const teamValue = scrapedTeam.marketValue || 
    scrapedTeam.players.reduce((s, p) => s + (p.marketValue || 0), 0);
  const budget = Math.round(teamValue * 0.3);
  const maxValue = 500000000;
  const reputation = Math.max(50, Math.min(95, Math.round(50 + (teamValue / maxValue) * 45)));
  const stadiumCapacity = Math.round(10000 + seededRandom() * 40000);
  
  // Generate fictional players
  const playersWithPositions = distributePositions(scrapedTeam.players);
  const usedNames = new Set();
  
  const players = playersWithPositions.map(p => {
    let playerName;
    let attempts = 0;
    do {
      const first = pick(firstNames);
      const last = pick(lastNames);
      playerName = seededRandom() < 0.15 ? `${first.charAt(0)}. ${last}` : `${first} ${last}`;
      attempts++;
    } while (usedNames.has(playerName) && attempts < 20);
    usedNames.add(playerName);
    
    const valueM = (p.marketValue || 100000) / 1000000;
    const overall = p.overall || calculateFallbackOverall(valueM, p.age || 25);
    
    return {
      name: playerName,
      position: p.gamePosition || 'MC',
      age: p.age || 25,
      overall,
      value: p.marketValue || 100000,
      salary: calcSalary(valueM),
      contract: p.age >= 32 ? 1 : (p.age >= 28 ? 2 : 3),
      morale: 75,
      fitness: 100
    };
  });
  
  return {
    id: toSlug(fictionalName),
    name: fictionalName,
    shortName,
    city,
    stadium,
    stadiumCapacity,
    budget,
    reputation,
    league: leagueId,
    colors: { primary: randomColor(), secondary: '#FFFFFF' },
    players,
    avgOverall: Math.round(players.reduce((s, p) => s + p.overall, 0) / players.length),
    playerCount: players.length
  };
}

function calculateFallbackOverall(valueM, age) {
  let ovr;
  if (valueM >= 120) ovr = 91;
  else if (valueM >= 80) ovr = 88;
  else if (valueM >= 50) ovr = 85;
  else if (valueM >= 30) ovr = 82;
  else if (valueM >= 20) ovr = 79;
  else if (valueM >= 12) ovr = 76;
  else if (valueM >= 7) ovr = 73;
  else if (valueM >= 4) ovr = 70;
  else if (valueM >= 2) ovr = 67;
  else if (valueM >= 1) ovr = 64;
  else ovr = 62;
  if (age <= 21) ovr += 2;
  else if (age >= 35) ovr -= 3;
  else if (age >= 32) ovr -= 1;
  return Math.max(60, Math.min(94, ovr));
}

function calcSalary(valueM) {
  const annual = valueM * 1000000 * 0.12;
  const weekly = annual / 52;
  return Math.max(15000, Math.round(weekly));
}

function toSlug(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function randomColor() {
  const colors = ['#E30613','#003DA5','#009639','#FFD700','#800080','#FF6600','#1C1C1C','#00529F','#D71920','#00A651','#0033A0','#ED1C24','#FDB913','#7A263A','#1E4D2B','#C8102E','#003087','#F26522','#231F20','#4F2683'];
  return pick(colors);
}

// ============================================================
// League configurations
// ============================================================

const LEAGUES = [
  {
    scraped: 'greekSuperLeague.json',
    publicJson: 'greekSuperLeague.json',
    jsFile: 'teams-greek.js',
    exportName: 'greekTeams',
    leagueId: 'greekSuperLeague',
    nameConfig: { firstNames: GREEK_FIRST, lastNames: GREEK_LAST, teamPrefixes: GREEK_TEAM_PREFIXES, teamSuffixes: GREEK_TEAM_SUFFIXES, stadiums: GREEK_STADIUMS, cities: ['Piraeus','Athens','Thessaloniki','Volos','Lamia','Tripolis','Larissa','Heraklion','Ioannina','Patras','Agrinio','Levadiá','Giannina','Rhodes'] }
  },
  {
    scraped: 'czechLeague.json',
    publicJson: 'czechLeague.json',
    jsFile: 'teams-czech.js',
    exportName: 'czechTeams',
    leagueId: 'czechLeague',
    nameConfig: { firstNames: CZECH_FIRST, lastNames: CZECH_LAST, teamPrefixes: CZECH_TEAM_PREFIXES, teamSuffixes: CZECH_TEAM_SUFFIXES, stadiums: CZECH_STADIUMS, cities: ['Prague','Brno','Ostrava','Plzeň','Liberec','Olomouc','České Budějovice','Hradec Králové','Pardubice','Zlín','Opava','Karviná','Jablonec','Teplice','Slovácko','Mladá Boleslav','Bohemians','Dukla'] }
  },
  {
    scraped: 'croatianLeague.json',
    publicJson: 'croatianLeague.json',
    jsFile: 'teams-croatian.js',
    exportName: 'croatianTeams',
    leagueId: 'croatianLeague',
    nameConfig: { firstNames: CROATIAN_FIRST, lastNames: CROATIAN_LAST, teamPrefixes: CROATIAN_TEAM_PREFIXES, teamSuffixes: CROATIAN_TEAM_SUFFIXES, stadiums: CROATIAN_STADIUMS, cities: ['Zagreb','Split','Rijeka','Osijek','Zadar','Pula','Varaždin','Šibenik','Koprivnica','Gorica'] }
  },
  {
    scraped: 'colombiaPrimera.json',
    publicJson: 'colombiaPrimera.json',
    jsFile: null, // Firestore only
    leagueId: 'colombiaPrimera',
    nameConfig: { firstNames: COLOMBIAN_FIRST, lastNames: COLOMBIAN_LAST, teamPrefixes: COLOMBIAN_TEAM_PREFIXES, teamSuffixes: SA_TEAM_SUFFIXES, stadiums: SA_STADIUMS, cities: COLOMBIAN_CITIES }
  },
  {
    scraped: 'chilePrimera.json',
    publicJson: 'chilePrimera.json',
    jsFile: null,
    leagueId: 'chilePrimera',
    nameConfig: { firstNames: CHILEAN_FIRST, lastNames: CHILEAN_LAST, teamPrefixes: ['Andino','Cordillera','Pacífico','Austral','Mapuche','Atacama','Patagonia','O\'Higgins','Maipo','Biobío','Arauco','Valparaíso','Concepción','Santiago','Temuco','Coquimbo','Antofagasta','Rancagua','Talca','Iquique'], teamSuffixes: SA_TEAM_SUFFIXES, stadiums: SA_STADIUMS, cities: CHILEAN_CITIES }
  },
  {
    scraped: 'uruguayPrimera.json',
    publicJson: 'uruguayPrimera.json',
    jsFile: null,
    leagueId: 'uruguayPrimera',
    nameConfig: { firstNames: URUGUAYAN_FIRST, lastNames: URUGUAYAN_LAST, teamPrefixes: ['Río de la Plata','Oriental','Celeste','Charrúa','Banda Oriental','Platense','Rampla','Wanderers','Progreso','Cerrito','Fénix','Rentistas','Plaza','Defensor','River','Racing','Sud América','Liverpool','Boston','Danubio'], teamSuffixes: SA_TEAM_SUFFIXES, stadiums: SA_STADIUMS, cities: URUGUAYAN_CITIES }
  },
  {
    scraped: 'ecuadorLigaPro.json',
    publicJson: 'ecuadorLigaPro.json',
    jsFile: null,
    leagueId: 'ecuadorLigaPro',
    nameConfig: { firstNames: ECUADORIAN_FIRST, lastNames: ECUADORIAN_LAST, teamPrefixes: ['Volcán','Equinoccio','Galápagos','Amazonas','Chimborazo','Cotopaxi','Quiteño','Guayaquileño','Cuencano','Porteño','Machaleño','Ambateño','Esmeraldas','Lojano','Ibarreño','Riobamba'], teamSuffixes: SA_TEAM_SUFFIXES, stadiums: SA_STADIUMS, cities: ECUADORIAN_CITIES }
  },
  {
    scraped: 'paraguayPrimera.json',
    publicJson: 'paraguayPrimera.json',
    jsFile: null,
    leagueId: 'paraguayPrimera',
    nameConfig: { firstNames: PARAGUAYAN_FIRST, lastNames: PARAGUAYAN_LAST, teamPrefixes: ['Guaraní','Cerro','Libertad','Nacional','Sol','Sportivo','General','Rubio','Fernando','Silvio','Resistencia','Trinidense','River','Tacuary','Ameliano','Capiatá'], teamSuffixes: SA_TEAM_SUFFIXES, stadiums: SA_STADIUMS, cities: PARAGUAYAN_CITIES }
  },
  {
    scraped: 'peruLiga1.json',
    publicJson: 'peruLiga1.json',
    jsFile: null,
    leagueId: 'peruLiga1',
    nameConfig: { firstNames: PERUVIAN_FIRST, lastNames: PERUVIAN_LAST, teamPrefixes: ['Inca','Alianza','Cristal','Universitario','Municipal','Cienciano','Melgar','Binacional','Cantolao','Atlético','César Vallejo','Carlos Mannucci','Cusco','Huancayo','Ayacucho','Garcilaso'], teamSuffixes: SA_TEAM_SUFFIXES, stadiums: SA_STADIUMS, cities: PERUVIAN_CITIES }
  },
  {
    scraped: 'boliviaPrimera.json',
    publicJson: 'boliviaPrimera.json',
    jsFile: null,
    leagueId: 'boliviaPrimera',
    nameConfig: { firstNames: BOLIVIAN_FIRST, lastNames: BOLIVIAN_LAST, teamPrefixes: ['Bolívar','Strongest','Wilstermann','Blooming','Oriente','Nacional','Real','San José','Guabirá','Always Ready','Royal','Aurora','Universitario','Palmaflor','Independiente','Vinto'], teamSuffixes: SA_TEAM_SUFFIXES, stadiums: SA_STADIUMS, cities: BOLIVIAN_CITIES }
  },
  {
    scraped: 'venezuelaPrimera.json',
    publicJson: 'venezuelaPrimera.json',
    jsFile: null,
    leagueId: 'venezuelaPrimera',
    nameConfig: { firstNames: VENEZUELAN_FIRST, lastNames: VENEZUELAN_LAST, teamPrefixes: ['Carabobo','Táchira','Caracas','Zamora','Monagas','Lara','Portuguesa','Zulia','Aragua','Metropolitano','Mineros','Trujillanos','Estudiantes','Academia','Deportivo','Angostura','Atlántico','Yaracuyanos','Hermanos','Marítimo'], teamSuffixes: SA_TEAM_SUFFIXES, stadiums: SA_STADIUMS, cities: VENEZUELAN_CITIES }
  }
];

// ============================================================
// Generate JS file content (for Greek, Czech, Croatian)
// ============================================================

function generateJSFileContent(teams, exportName, leagueName, leagueId) {
  let js = `// ============================================================\n`;
  js += `// PC FÚTBOL WEB - ${leagueName.toUpperCase()} 25/26\n`;
  js += `// Datos reales de Transfermarkt (enero 2026)\n`;
  js += `// ============================================================\n\n`;
  
  js += `function calculateFallbackOverall(valueM, age) {\n`;
  js += `  let ovr;\n`;
  js += `  if (valueM >= 120) ovr = 91;\n`;
  js += `  else if (valueM >= 80) ovr = 88;\n`;
  js += `  else if (valueM >= 50) ovr = 85;\n`;
  js += `  else if (valueM >= 30) ovr = 82;\n`;
  js += `  else if (valueM >= 20) ovr = 79;\n`;
  js += `  else if (valueM >= 12) ovr = 76;\n`;
  js += `  else if (valueM >= 7) ovr = 73;\n`;
  js += `  else if (valueM >= 4) ovr = 70;\n`;
  js += `  else if (valueM >= 2) ovr = 67;\n`;
  js += `  else if (valueM >= 1) ovr = 64;\n`;
  js += `  else ovr = 62;\n`;
  js += `  if (age <= 21) ovr += 2;\n`;
  js += `  else if (age >= 35) ovr -= 3;\n`;
  js += `  else if (age >= 32) ovr -= 1;\n`;
  js += `  return Math.max(60, Math.min(94, ovr));\n`;
  js += `}\n\n`;
  
  js += `function calcSalary(valueM) {\n`;
  js += `  const annual = valueM * 1000000 * 0.12;\n`;
  js += `  const weekly = annual / 52;\n`;
  js += `  return Math.max(15000, Math.round(weekly));\n`;
  js += `}\n\n`;
  
  js += `function createPlayer(name, position, age, valueM, overall = null) {\n`;
  js += `  return {\n`;
  js += `    name, position, age,\n`;
  js += `    overall: overall || calculateFallbackOverall(valueM, age),\n`;
  js += `    value: valueM * 1000000,\n`;
  js += `    salary: calcSalary(valueM),\n`;
  js += `    contract: age >= 32 ? 1 : (age >= 28 ? 2 : 3),\n`;
  js += `    morale: 75, fitness: 100\n`;
  js += `  };\n`;
  js += `}\n\n`;
  
  js += `export const ${exportName} = {\n`;
  
  teams.forEach((team, idx) => {
    const teamKey = team.id.replace(/-/g, '_');
    js += `  // ========== ${team.name.toUpperCase()} ==========\n`;
    js += `  ${teamKey}: {\n`;
    js += `    name: '${team.name.replace(/'/g, "\\'")}', shortName: '${team.shortName}', city: '${team.city.replace(/'/g, "\\'")}',\n`;
    js += `    stadium: '${team.stadium.replace(/'/g, "\\'")}', stadiumCapacity: ${team.stadiumCapacity},\n`;
    js += `    budget: ${team.budget}, reputation: ${team.reputation}, league: '${leagueId}',\n`;
    js += `    colors: { primary: '${team.colors.primary}', secondary: '${team.colors.secondary}' },\n`;
    js += `    players: [\n`;
    
    team.players.forEach(p => {
      const valueM = Math.round(p.value / 10000) / 100; // to millions with 2 decimals
      js += `      createPlayer('${p.name.replace(/'/g, "\\'")}', '${p.position}', ${p.age}, ${valueM}, ${p.overall}),\n`;
    });
    
    js += `    ]\n`;
    js += `  }${idx < teams.length - 1 ? ',' : ''}\n`;
  });
  
  js += `};\n`;
  return js;
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('🔧 Regenerating incomplete leagues...\n');
  
  for (const league of LEAGUES) {
    // Reset seed per league for reproducibility
    seed = 42 + LEAGUES.indexOf(league) * 1000;
    
    const scrapedPath = join(scrapedDir, league.scraped);
    if (!existsSync(scrapedPath)) {
      console.log(`  ❌ ${league.scraped} not found, skipping`);
      continue;
    }
    
    const rawData = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
    console.log(`  ⚽ ${league.leagueId}: ${rawData.length} teams from ${league.scraped}`);
    
    // Generate fictional teams
    const teams = rawData.map((t, i) => generateFictionalTeam(t, league.nameConfig, i, league.leagueId));
    
    // Write public/data JSON (for Firestore upload)
    const jsonPath = join(publicDataDir, league.publicJson);
    writeFileSync(jsonPath, JSON.stringify(teams, null, 2), 'utf-8');
    console.log(`    ✅ Written ${jsonPath}`);
    
    // Write src/data JS file if applicable
    if (league.jsFile) {
      const leagueNames = {
        greekSuperLeague: 'GREEK SUPER LEAGUE',
        czechLeague: 'CZECH CHANCE LIGA',
        croatianLeague: 'CROATIAN HNL'
      };
      const jsContent = generateJSFileContent(teams, league.exportName, leagueNames[league.leagueId] || league.leagueId, league.leagueId);
      const jsPath = join(srcDataDir, league.jsFile);
      writeFileSync(jsPath, jsContent, 'utf-8');
      console.log(`    ✅ Written ${jsPath}`);
    }
    
    const totalPlayers = teams.reduce((s, t) => s + t.players.length, 0);
    console.log(`    📊 ${teams.length} teams, ${totalPlayers} players\n`);
  }
  
  console.log('✅ All leagues regenerated!');
  console.log('\n📌 Next step: Run upload-renamed-firebase.mjs to push to Firestore');
}

main().catch(e => { console.error(e); process.exit(1); });
