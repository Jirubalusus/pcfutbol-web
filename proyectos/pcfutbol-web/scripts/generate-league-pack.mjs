/**
 * Generic league pack generator.
 *
 * Given a league config with real clubs (slug, realName, fakeName, colors,
 * city, stadium, capacity, reputation), emits:
 *   - public/data/<leagueKey>.json (fake base data)
 *   - merges the league into public/data/all-teams.json
 *   - merges fake->real mappings into scripts/edition-pack-2025-26.json
 *
 * Invoke with a league id that matches a config in `LEAGUES` below:
 *   node scripts/generate-league-pack.mjs eliteserien
 *   node scripts/generate-league-pack.mjs --all
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const LEAGUES = {
  eliteserien: (await import('./leagues-config/eliteserien.mjs')).default,
  allsvenskan: (await import('./leagues-config/allsvenskan.mjs')).default,
  ekstraklasa: (await import('./leagues-config/ekstraklasa.mjs')).default,
  eersteDivisie: (await import('./leagues-config/eerste-divisie.mjs')).default,
  ligaPortugal2: (await import('./leagues-config/liga-portugal-2.mjs')).default,
  russiaPremier: (await import('./leagues-config/russia-premier.mjs')).default,
  ukrainePremier: (await import('./leagues-config/ukraine-premier.mjs')).default,
  romaniaSuperliga: (await import('./leagues-config/romania-superliga.mjs')).default,
  hungaryNBI: (await import('./leagues-config/hungary-nbi.mjs')).default,
  kLeague1: (await import('./leagues-config/south-korea-k1.mjs')).default,
  aLeagueMen: (await import('./leagues-config/australia-aleague.mjs')).default,
  southAfricaPSL: (await import('./leagues-config/south-africa-psl.mjs')).default,
};

// ── Position distribution for a 20-man squad ──
const POSITION_SLOTS = [
  'POR', 'POR',
  'DFC', 'DFC', 'DFC', 'DFC',
  'LB', 'RB',
  'MCD', 'MCD',
  'MC', 'MC', 'MC',
  'MCO',
  'EI', 'ED',
  'DC', 'DC', 'DC',
  'MP'
];

// Seeded PRNG so runs are reproducible.
function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t |= 0; t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }

// ── Overall ranges vary by position slot and reputation ──
function overallRangeForSlot(slotIndex, tier, reputation) {
  // stars get higher overalls, bench lower
  const base = tier === 1 ? 76 : tier === 2 ? 72 : tier === 3 ? 70 : 66;
  const spread = reputation >= 4 ? 4 : reputation >= 3 ? 3 : 2;
  if (slotIndex === 0) return [base + spread + 1, base + spread + 4]; // GK #1
  if (slotIndex === 1) return [base - 4, base - 1];                    // GK #2
  if (slotIndex < 8) return [base - 1, base + spread];                 // back 4 starters
  if (slotIndex < 13) return [base, base + spread + 1];                // midfielders
  if (slotIndex === 13) return [base + 1, base + spread + 2];          // CAM
  if (slotIndex < 16) return [base, base + spread + 1];                // wingers
  if (slotIndex === 16) return [base + 2, base + spread + 3];          // main ST
  if (slotIndex < 19) return [base - 2, base + spread];                // rotation FW
  return [base - 4, base - 1];                                         // sub
}

function ageForSlot(rand, slotIndex) {
  // starters ~24-29, subs younger or older
  if (slotIndex < 2) return 24 + Math.floor(rand() * 10);
  if (slotIndex < 16) return 21 + Math.floor(rand() * 11);
  return 19 + Math.floor(rand() * 14);
}

function valueFromOverall(overall, tier) {
  const tierMul = { 1: 1.0, 2: 0.5, 3: 0.28, 4: 0.12, 5: 0.05 }[tier] ?? 0.3;
  let base;
  if (overall >= 85) base = 40_000_000;
  else if (overall >= 82) base = 22_000_000;
  else if (overall >= 79) base = 12_000_000;
  else if (overall >= 76) base = 6_000_000;
  else if (overall >= 73) base = 3_000_000;
  else if (overall >= 70) base = 1_500_000;
  else if (overall >= 67) base = 800_000;
  else if (overall >= 64) base = 400_000;
  else base = 200_000;
  return Math.round(base * tierMul);
}

function buildPlayer(rand, firstNames, lastNames, slotIndex, tier, reputation, nationality) {
  const [lo, hi] = overallRangeForSlot(slotIndex, tier, reputation);
  const overall = lo + Math.floor(rand() * (hi - lo + 1));
  const age = ageForSlot(rand, slotIndex);
  const first = pick(rand, firstNames);
  const last = pick(rand, lastNames);
  const position = POSITION_SLOTS[slotIndex];
  const value = valueFromOverall(overall, tier);
  return { name: `${first} ${last}`, position, age, overall, nationality, value };
}

function buildSquad(rand, localePools, tier, reputation, teamSeed) {
  // ~80% home-nation names, 20% imports pulled from other pools
  const home = localePools.home;
  const imports = localePools.imports;
  const squad = [];
  const usedNames = new Set();
  for (let i = 0; i < POSITION_SLOTS.length; i++) {
    let tries = 0;
    let player;
    do {
      const importRoll = rand() < 0.2 && imports.length > 0;
      const pool = importRoll ? pick(rand, imports) : home;
      const nat = pool.nationality;
      player = buildPlayer(rand, pool.first, pool.last, i, tier, reputation, nat);
      tries++;
    } while (usedNames.has(player.name) && tries < 6);
    usedNames.add(player.name);
    squad.push(player);
  }
  return squad;
}

// ── Locale name pools ──
const POOLS = {
  norway: {
    nationality: 'Noruega',
    first: ['Magnus', 'Erik', 'Olav', 'Håkon', 'Henrik', 'Sondre', 'Mats', 'Eirik', 'Jonas', 'Kristian', 'Anders', 'Marius', 'Vegard', 'Tobias', 'Sebastian', 'Fredrik', 'Martin', 'Andreas', 'Aron', 'Lars'],
    last: ['Johansen', 'Hansen', 'Olsen', 'Berg', 'Lund', 'Strand', 'Dahl', 'Kristiansen', 'Pedersen', 'Sørensen', 'Nilsen', 'Aasen', 'Haugen', 'Solberg', 'Fredriksen', 'Myhre', 'Storm', 'Bråten', 'Engen', 'Ødegård']
  },
  sweden: {
    nationality: 'Suecia',
    first: ['Anders', 'Erik', 'Lars', 'Johan', 'Mikael', 'Fredrik', 'Karl', 'Gustav', 'Oskar', 'Viktor', 'Emil', 'Linus', 'Niklas', 'Alexander', 'Daniel', 'Henrik', 'Simon', 'Jonas', 'Tobias', 'Filip'],
    last: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Lindqvist', 'Bergström', 'Lindberg', 'Forsberg', 'Jönsson', 'Hedlund', 'Strömberg', 'Åberg', 'Sandberg', 'Öberg']
  },
  denmark: {
    nationality: 'Dinamarca',
    first: ['Kasper', 'Jonas', 'Mikkel', 'Lasse', 'Frederik', 'Rasmus', 'Christian', 'Nikolaj', 'Simon', 'Emil', 'Jesper', 'Mads', 'Morten', 'Andreas', 'Oliver', 'Victor', 'Magnus', 'Tobias', 'Mathias', 'Pernille'],
    last: ['Jensen', 'Nielsen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen', 'Rasmussen', 'Jørgensen', 'Møller', 'Kristensen', 'Madsen', 'Olsen', 'Poulsen', 'Thomsen', 'Christiansen', 'Laursen', 'Eriksen', 'Lund']
  },
  poland: {
    nationality: 'Polonia',
    first: ['Jakub', 'Piotr', 'Michał', 'Tomasz', 'Krzysztof', 'Mateusz', 'Bartosz', 'Dawid', 'Kamil', 'Łukasz', 'Paweł', 'Marcin', 'Adrian', 'Sebastian', 'Damian', 'Patryk', 'Dominik', 'Kacper', 'Szymon', 'Wojciech'],
    last: ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Kwiatkowski', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Nowakowski', 'Pawlak']
  },
  netherlands: {
    nationality: 'Países Bajos',
    first: ['Daan', 'Sem', 'Finn', 'Luuk', 'Stijn', 'Bram', 'Thijs', 'Lars', 'Jesse', 'Tim', 'Mees', 'Jurriën', 'Joost', 'Gijs', 'Thomas', 'Niels', 'Ruud', 'Koen', 'Ryan', 'Sven'],
    last: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Janssen', 'Visser', 'Smit', 'Meijer', 'Dekker', 'Mulder', 'de Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'van Leeuwen', 'Brouwer', 'de Wit']
  },
  portugal: {
    nationality: 'Portugal',
    first: ['João', 'Rafael', 'Tiago', 'Pedro', 'Miguel', 'Rúben', 'André', 'Bruno', 'Diogo', 'Gonçalo', 'Ricardo', 'Daniel', 'Fábio', 'Nuno', 'Sérgio', 'Duarte', 'Luís', 'Vasco', 'Francisco', 'Gustavo'],
    last: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Martins', 'Jesus', 'Sousa', 'Gonçalves', 'Marques', 'Fernandes', 'Almeida', 'Dias', 'Teixeira', 'Rodrigues', 'Moreira', 'Cardoso', 'Mendes', 'Ribeiro']
  },
  brasil: {
    nationality: 'Brasil',
    first: ['Lucas', 'Gabriel', 'Rafael', 'Matheus', 'Bruno', 'Thiago', 'Felipe', 'André', 'Daniel', 'Caio', 'Vinícius', 'João', 'Leandro', 'Diogo', 'Igor', 'Pedro', 'Ronaldo', 'Eduardo', 'Fernando', 'Márcio'],
    last: ['Souza', 'Silva', 'Oliveira', 'Santos', 'Costa', 'Almeida', 'Pereira', 'Ferreira', 'Rodrigues', 'Gomes', 'Martins', 'Ribeiro', 'Carvalho', 'Araújo', 'Barbosa', 'Fernandes', 'Nascimento', 'Moreira', 'Cavalcante', 'Monteiro']
  },
  spain: {
    nationality: 'España',
    first: ['Álvaro', 'Javier', 'Sergio', 'Pablo', 'Diego', 'Carlos', 'Iván', 'Rubén', 'David', 'Adrián', 'Iker', 'Marcos', 'Mario', 'Óscar', 'Héctor', 'Raúl', 'Samuel', 'Daniel', 'Víctor', 'Jorge'],
    last: ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'González', 'Rodríguez', 'Fernández', 'Gómez', 'Hernández', 'Díaz', 'Ruiz', 'Jiménez', 'Moreno', 'Álvarez', 'Muñoz', 'Romero', 'Alonso', 'Navarro', 'Serrano']
  },
  france: {
    nationality: 'Francia',
    first: ['Antoine', 'Nicolas', 'Julien', 'Kévin', 'Thomas', 'Mathieu', 'Quentin', 'Florian', 'Hugo', 'Maxime', 'Loïc', 'Benjamin', 'Lucas', 'Alexandre', 'Baptiste', 'Raphaël', 'Valentin', 'Clément', 'Théo', 'Adrien'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard']
  },
  argentina: {
    nationality: 'Argentina',
    first: ['Matías', 'Nicolás', 'Martín', 'Juan', 'Lucas', 'Federico', 'Diego', 'Alejandro', 'Gonzalo', 'Ezequiel', 'Franco', 'Tomás', 'Agustín', 'Leandro', 'Pablo', 'Cristian', 'Rodrigo', 'Rafael', 'Emiliano', 'Santiago'],
    last: ['González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Pérez', 'García', 'Sánchez', 'Romero', 'Álvarez', 'Ruiz', 'Díaz', 'Sosa', 'Morales', 'Torres', 'Acosta', 'Flores', 'Gómez', 'Castro', 'Ortega']
  },
  serbia: {
    nationality: 'Serbia',
    first: ['Nikola', 'Marko', 'Aleksandar', 'Stefan', 'Miloš', 'Filip', 'Dušan', 'Luka', 'Ivan', 'Petar'],
    last: ['Jović', 'Mitrović', 'Stojanović', 'Ivanović', 'Nikolić', 'Đorđević', 'Marković', 'Petrović', 'Pavlović', 'Radović']
  },
  africa: {
    nationality: 'Nigeria',
    first: ['Chinedu', 'Kelechi', 'Samuel', 'Victor', 'Emeka', 'Obi', 'Kingsley', 'Ebenezer', 'Moses', 'Peter'],
    last: ['Okafor', 'Adeyemi', 'Boateng', 'Mensah', 'Ndiaye', 'Sarr', 'Diop', 'Traoré', 'Koné', 'Ouattara']
  },
  japan: {
    nationality: 'Japón',
    first: ['Hiroshi', 'Takumi', 'Sota', 'Yuma', 'Kenta', 'Ryota', 'Haru', 'Shota', 'Daichi', 'Ryoma'],
    last: ['Tanaka', 'Suzuki', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Saito', 'Yoshida']
  },
  korea: {
    nationality: 'Corea del Sur',
    first: ['Min-jun', 'Ji-ho', 'Seo-jun', 'Do-yun', 'Ji-woo', 'Joon-ho', 'Hyun-woo', 'Eun-woo', 'Tae-hyun', 'Sung-min', 'Sang-ho', 'Dong-hyun', 'Woo-jin', 'Young-soo', 'Jae-sung', 'Hyun-jun', 'Jin-woo', 'Seung-ho', 'Kyung-min', 'Chan-hee'],
    last: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh', 'Shin', 'Seo', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Hong', 'Moon']
  },
  russia: {
    nationality: 'Rusia',
    first: ['Ivan', 'Dmitri', 'Aleksei', 'Sergei', 'Andrei', 'Nikolai', 'Maksim', 'Vladimir', 'Yegor', 'Roman', 'Artyom', 'Kirill', 'Mikhail', 'Yuri', 'Pavel', 'Anton', 'Denis', 'Vadim', 'Oleg', 'Ilya'],
    last: ['Ivanov', 'Smirnov', 'Kuznetsov', 'Popov', 'Sokolov', 'Lebedev', 'Kozlov', 'Novikov', 'Morozov', 'Petrov', 'Volkov', 'Solovyov', 'Vasiliev', 'Zaytsev', 'Pavlov', 'Semyonov', 'Golubev', 'Vinogradov', 'Bogdanov', 'Vorobyov']
  },
  ukraine: {
    nationality: 'Ucrania',
    first: ['Oleh', 'Andriy', 'Volodymyr', 'Serhiy', 'Yuriy', 'Bohdan', 'Mykola', 'Ihor', 'Taras', 'Vasyl', 'Dmytro', 'Maksym', 'Denys', 'Artem', 'Oleksandr', 'Pavlo', 'Roman', 'Yevhen', 'Vitaliy', 'Ruslan'],
    last: ['Shevchenko', 'Boyko', 'Kovalenko', 'Koval', 'Oliynyk', 'Bondarenko', 'Tkachenko', 'Kravchenko', 'Moroz', 'Melnyk', 'Savchenko', 'Lysenko', 'Marchenko', 'Romanenko', 'Pylypenko', 'Ponomarenko', 'Vasylchenko', 'Demchenko', 'Popovych', 'Lytvynenko']
  },
  romania: {
    nationality: 'Rumania',
    first: ['Andrei', 'Cristian', 'Ionuț', 'Răzvan', 'Florin', 'Alexandru', 'Mihai', 'Bogdan', 'Vlad', 'Daniel', 'Cosmin', 'Marius', 'Dan', 'Sorin', 'Tudor', 'Valentin', 'Ciprian', 'Octavian', 'Horațiu', 'Nicolae'],
    last: ['Popescu', 'Ionescu', 'Popa', 'Stoica', 'Constantin', 'Radu', 'Dumitrescu', 'Munteanu', 'Marin', 'Tudor', 'Stan', 'Dinu', 'Nistor', 'Barbu', 'Enache', 'Olteanu', 'Vlad', 'Cristea', 'Stancu', 'Matei']
  },
  hungary: {
    nationality: 'Hungría',
    first: ['László', 'Zoltán', 'István', 'József', 'Gábor', 'Attila', 'Tamás', 'Péter', 'Bence', 'Dávid', 'Krisztián', 'Ádám', 'Márk', 'Balázs', 'Roland', 'Viktor', 'Mihály', 'Dániel', 'Ferenc', 'Gergő'],
    last: ['Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas', 'Balogh', 'Papp', 'Takács', 'Juhász', 'Lakatos', 'Mészáros', 'Oláh', 'Simon', 'Rácz', 'Fekete']
  },
  australia: {
    nationality: 'Australia',
    first: ['Jack', 'Riley', 'Jamie', 'Connor', 'Lachlan', 'Liam', 'Jayden', 'Harry', 'Brandon', 'Dylan', 'Mitchell', 'Ryan', 'Kieran', 'Callum', 'Cameron', 'Blake', 'Nathan', 'Beau', 'Kai', 'Oliver'],
    last: ['Smith', 'Jones', 'Williams', 'Brown', 'Taylor', 'Wilson', 'Thompson', 'Walker', 'Hughes', 'Harrison', 'Burns', 'Kennedy', 'Clarke', 'Hall', 'Ryan', 'Campbell', 'Fitzgerald', 'Murphy', 'Dooley', 'Mackenzie']
  },
  southAfrica: {
    nationality: 'Sudáfrica',
    first: ['Thabo', 'Sipho', 'Bongani', 'Lungelo', 'Mandla', 'Sizwe', 'Tshepo', 'Teboho', 'Kagiso', 'Lebo', 'Siphelele', 'Mpho', 'Oupa', 'Themba', 'Sibusiso', 'Lucky', 'Njabulo', 'Percy', 'Keagan', 'Lyle'],
    last: ['Dlamini', 'Nkosi', 'Mthembu', 'Zulu', 'Mokoena', 'Ngcobo', 'Khumalo', 'Mabaso', 'Sithole', 'Mokwena', 'Baloyi', 'Shabalala', 'Mabena', 'Mofokeng', 'Modise', 'Tshabalala', 'Hlatshwayo', 'Radebe', 'Maluleke', 'Jali']
  },
  china: {
    nationality: 'China',
    first: ['Wei', 'Lei', 'Jun', 'Ming', 'Yang', 'Chen', 'Hao', 'Feng', 'Kai', 'Bo'],
    last: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu']
  },
  senegal: {
    nationality: 'Senegal',
    first: ['Aliou', 'Ibrahima', 'Cheikh', 'Mamadou', 'Ousmane', 'Pape', 'Modou', 'Abdoulaye', 'Moussa', 'Lamine'],
    last: ['Diop', 'Ndiaye', 'Sarr', 'Fall', 'Gueye', 'Cissé', 'Diouf', 'Sène', 'Ba', 'Mbaye']
  }
};

function poolsForLeague(leagueKey) {
  switch (leagueKey) {
    case 'eliteserien':
      return { home: POOLS.norway, imports: [POOLS.sweden, POOLS.denmark, POOLS.brasil, POOLS.africa] };
    case 'allsvenskan':
      return { home: POOLS.sweden, imports: [POOLS.norway, POOLS.denmark, POOLS.brasil, POOLS.africa] };
    case 'ekstraklasa':
      return { home: POOLS.poland, imports: [POOLS.spain, POOLS.brasil, POOLS.serbia, POOLS.portugal] };
    case 'eersteDivisie':
      return { home: POOLS.netherlands, imports: [POOLS.brasil, POOLS.africa, POOLS.spain, POOLS.japan] };
    case 'ligaPortugal2':
      return { home: POOLS.portugal, imports: [POOLS.brasil, POOLS.africa, POOLS.spain, POOLS.france] };
    case 'russiaPremier':
      return { home: POOLS.russia, imports: [POOLS.ukraine, POOLS.brasil, POOLS.serbia, POOLS.africa] };
    case 'ukrainePremier':
      return { home: POOLS.ukraine, imports: [POOLS.brasil, POOLS.serbia, POOLS.africa, POOLS.portugal] };
    case 'romaniaSuperliga':
      return { home: POOLS.romania, imports: [POOLS.serbia, POOLS.africa, POOLS.portugal, POOLS.france] };
    case 'hungaryNBI':
      return { home: POOLS.hungary, imports: [POOLS.serbia, POOLS.africa, POOLS.brasil, POOLS.france] };
    case 'kLeague1':
      return { home: POOLS.korea, imports: [POOLS.brasil, POOLS.japan, POOLS.africa, POOLS.china] };
    case 'aLeagueMen':
      return { home: POOLS.australia, imports: [POOLS.spain, POOLS.japan, POOLS.brasil, POOLS.france] };
    case 'southAfricaPSL':
      return { home: POOLS.southAfrica, imports: [POOLS.africa, POOLS.senegal, POOLS.brasil, POOLS.portugal] };
    default:
      return { home: POOLS.spain, imports: [POOLS.portugal, POOLS.france] };
  }
}

function generateLeagueData(leagueKey, config) {
  const pools = poolsForLeague(leagueKey);
  const seedBase = [...leagueKey].reduce((a, c) => a + c.charCodeAt(0), 0) * 131;
  const teams = config.clubs.map((club, idx) => {
    const rand = mulberry32(seedBase + idx * 997);
    const players = buildSquad(rand, pools, config.tier, club.reputation, idx);
    return {
      id: club.id,
      name: club.fakeName,
      shortName: club.shortName,
      city: club.city,
      colors: club.colors,
      stadium: club.fakeStadium,
      stadiumCapacity: club.stadiumCapacity,
      reputation: club.reputation,
      players
    };
  });
  return teams;
}

function buildPackEntries(config) {
  const entries = {};
  for (const club of config.clubs) {
    entries[club.fakeName] = {
      name: club.realName,
      shortName: club.realShortName,
      stadium: club.realStadium
    };
  }
  return entries;
}

async function main() {
  const arg = process.argv[2];
  const targets = arg === '--all' || !arg
    ? Object.keys(LEAGUES)
    : [arg];

  const allTeamsPath = path.join(ROOT, 'public', 'data', 'all-teams.json');
  const allTeams = JSON.parse(fs.readFileSync(allTeamsPath, 'utf-8'));

  const packPath = path.join(ROOT, 'scripts', 'edition-pack-2025-26.json');
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));

  for (const key of targets) {
    const config = LEAGUES[key];
    if (!config) {
      console.error(`Unknown league key: ${key}`);
      continue;
    }
    console.log(`\n=== ${key} (${config.realLeagueName}) ===`);
    const teams = generateLeagueData(key, config);
    const outPath = path.join(ROOT, 'public', 'data', `${key}.json`);
    fs.writeFileSync(outPath, JSON.stringify(teams, null, 2), 'utf-8');
    console.log(`  wrote ${teams.length} teams -> ${path.relative(ROOT, outPath)}`);

    allTeams[key] = teams;

    const packEntries = buildPackEntries(config);
    pack.teams = pack.teams || {};
    for (const [fakeName, entry] of Object.entries(packEntries)) {
      pack.teams[fakeName] = { ...(pack.teams[fakeName] || {}), ...entry };
    }
    pack.leagues = pack.leagues || {};
    pack.leagues[config.fakeLeagueName] = config.realLeagueName;
    console.log(`  added ${Object.keys(packEntries).length} pack entries`);
  }

  fs.writeFileSync(allTeamsPath, JSON.stringify(allTeams, null, 2), 'utf-8');
  console.log(`\nmerged into ${path.relative(ROOT, allTeamsPath)}`);

  pack.teamCount = Object.keys(pack.teams).length;
  pack.playerCount = Object.values(pack.teams).reduce(
    (n, t) => n + (t.players ? Object.keys(t.players).length : 0),
    0
  );
  fs.writeFileSync(packPath, JSON.stringify(pack, null, 2), 'utf-8');
  console.log(`merged into ${path.relative(ROOT, packPath)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
