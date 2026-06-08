import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('public/data/world-cup-draft-database.json');
const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const errors = [];
const editions = Array.isArray(raw.editions) ? raw.editions : [];
let teamCount = 0;
let playerCount = 0;
let rating99Count = 0;

const ICONIC_PLAYER_RATING_FLOORS = [
  ['Zlatan Ibrahimović', 2002, 84], ['Zlatan Ibrahimović', 2006, 91],
  ['Thierry Henry', 1998, 86], ['Thierry Henry', 2002, 93], ['Thierry Henry', 2006, 92], ['Thierry Henry', 2010, 86],
  ['Didier Drogba', 2006, 90], ['Didier Drogba', 2010, 88], ['Didier Drogba', 2014, 84],
  ['Samuel Eto\'o', 1998, 75], ['Samuel Eto\'o', 2002, 88], ['Samuel Eto\'o', 2010, 91], ['Samuel Eto\'o', 2014, 84],
  ['Andriy Shevchenko', 2006, 91],
  ['Robert Lewandowski', 2018, 92], ['Robert Lewandowski', 2022, 91],
  ['Wayne Rooney', 2006, 90], ['Wayne Rooney', 2010, 91], ['Wayne Rooney', 2014, 86],
  ['David Beckham', 1998, 89], ['David Beckham', 2002, 91], ['David Beckham', 2006, 88],
  ['Kaká', 2002, 84], ['Kaká', 2006, 93], ['Kaká', 2010, 89],
  ['Luís Figo', 2002, 93], ['Luís Figo', 2006, 90],
  ['Raúl', 1998, 88], ['Raúl', 2002, 91], ['Raúl', 2006, 88],
  ['Luka Modrić', 2006, 78], ['Luka Modrić', 2014, 91], ['Luka Modrić', 2018, 94], ['Luka Modrić', 2022, 91],
  ['Arjen Robben', 2006, 87], ['Arjen Robben', 2010, 91], ['Arjen Robben', 2014, 93],
  ['Franck Ribéry', 2006, 86], ['Franck Ribéry', 2010, 91],
  ['Paul Scholes', 1998, 88], ['Paul Scholes', 2002, 90],
];

function comparablePlayerName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const playersByYearAndName = new Map();

if (editions.length !== 22) {
  errors.push(`Expected 22 editions, found ${editions.length}`);
}

for (const edition of editions) {
  if (!Number.isFinite(Number(edition.year))) {
    errors.push('Edition without numeric year');
  }
  if (!Array.isArray(edition.teams) || edition.teams.length === 0) {
    errors.push(`Edition ${edition.year || '?'} has no teams`);
    continue;
  }

  for (const team of edition.teams) {
    teamCount += 1;
    for (const field of ['id', 'year', 'country', 'countryEs', 'code', 'flag', 'rating']) {
      if (team[field] === undefined || team[field] === null || team[field] === '') {
        errors.push(`Team ${team.id || '?'} missing ${field}`);
      }
    }
    if (!Array.isArray(team.players) || team.players.length === 0) {
      errors.push(`Team ${team.id || '?'} has no players`);
      continue;
    }

    for (const player of team.players) {
      playerCount += 1;
      for (const field of ['id', 'name', 'nationality', 'nationalityEs', 'countryCode', 'flag', 'position', 'positions', 'positionGroup', 'rating', 'clubs']) {
        if (player[field] === undefined || player[field] === null || player[field] === '') {
          errors.push(`Player ${player.id || player.name || '?'} missing ${field}`);
        }
      }
      for (const field of ['age', 'club']) {
        if (!Object.hasOwn(player, field)) {
          errors.push(`Player ${player.id || player.name || '?'} missing ${field}`);
        }
      }
      if (player.age !== null && player.age !== undefined && !Number.isFinite(Number(player.age))) {
        errors.push(`Player ${player.id || player.name || '?'} has invalid age`);
      }
      if (!Array.isArray(player.positions) || player.positions.length === 0) {
        errors.push(`Player ${player.id || player.name || '?'} has invalid positions`);
      }
      if (!Array.isArray(player.clubs)) {
        errors.push(`Player ${player.id || player.name || '?'} has invalid clubs`);
      }
      if (!Number.isInteger(player.rating) || player.rating < 50 || player.rating > 99) {
        errors.push(`Player ${player.id || player.name || '?'} has rating out of range: ${player.rating}`);
      }
      if (player.rating === 99) {
        rating99Count += 1;
      }
      playersByYearAndName.set(`${edition.year}:${comparablePlayerName(player.name)}`, player);
    }
  }
}

if (teamCount !== 489) {
  errors.push(`Expected 489 teams, found ${teamCount}`);
}

if (playerCount !== 10964) {
  errors.push(`Expected 10964 players, found ${playerCount}`);
}

if (rating99Count > 25) {
  errors.push(`Too many 99-rated players: ${rating99Count}`);
}

for (const [name, year, floor] of ICONIC_PLAYER_RATING_FLOORS) {
  const player = playersByYearAndName.get(`${year}:${comparablePlayerName(name)}`);
  if (!player) {
    errors.push(`Iconic rating floor player not found: ${name} ${year}`);
  } else if (player.rating < floor) {
    errors.push(`Iconic rating floor failed: ${name} ${year} rating ${player.rating}, expected >= ${floor}`);
  }
}

if (errors.length) {
  process.stderr.write(`WorldCup draft database audit failed:\n${errors.slice(0, 40).map((error) => `- ${error}`).join('\n')}\n`);
  if (errors.length > 40) {
    process.stderr.write(`...and ${errors.length - 40} more errors\n`);
  }
  process.exit(1);
}

process.stdout.write(`WorldCup draft database audit passed: ${editions.length} editions, ${teamCount} teams, ${playerCount} players\n`);
