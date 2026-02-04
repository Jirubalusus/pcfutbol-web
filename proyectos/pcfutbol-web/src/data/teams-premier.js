// ============================================================
// PC FÚTBOL WEB - PREMIER LEAGUE 25/26
// Datos reales de Transfermarkt (enero 2026)
// ============================================================

// calcOverall function removed - using EA FC 26 ratings
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

function createPlayer(name, position, age, valueM, overall = null) {
  return {
    name, position, age,
    overall: overall || calculateFallbackOverall(valueM, age),
    value: valueM * 1000000,
    salary: calcSalary(valueM),
    contract: age >= 32 ? 1 : (age >= 28 ? 2 : 3),
    morale: 75, fitness: 100
  };
}

export const premierTeams = {
  // ========== MANCHESTER CITY ==========
  manchester_city: {
    name: 'Azure United', shortName: 'MCI', city: 'Manchester',
    stadium: 'Nova Stadium', stadiumCapacity: 53400,
    budget: 250000000, reputation: 95, league: 'premier',
    colors: { primary: '#6CABDD', secondary: '#FFFFFF' },
    players: [
      createPlayer('George Dawson', 'POR', 26, 45, 82),
      createPlayer('Juma Touré', 'POR', 23, 25, 79),
      createPlayer('Sam Osborne', 'POR', 33, 5, 69),
      createPlayer('Jacques Gauthier', 'DFC', 24, 70, 85),
      createPlayer('R. Delgado', 'DFC', 28, 60, 85),
      createPlayer('Murilo Gonçalves', 'DFC', 25, 55, 85),
      createPlayer('A. Keating', 'DFC', 21, 35, 84),
      createPlayer('J. Shelton', 'DFC', 31, 18, 82),
      createPlayer('N. Aalbers', 'DFC', 30, 18, 76),
      createPlayer('Raí Alcântara', 'LB', 24, 40, 82),
      createPlayer('Nathan Osborne'Reilly', 'LB', 20, 40),
      createPlayer('M. Ndiaye', 'RB', 27, 38, 82),
      createPlayer('Raí Lacerda', 'RB', 21, 35, 84),
      createPlayer('Rachid', 'MCD', 29, 75, 85),
      createPlayer('Noah Greenwood', 'MCD', 24, 45, 82),
      createPlayer('Kevin Palacios', 'MCD', 30, 6, 70),
      createPlayer('Thijs Timmermans', 'MC', 27, 65, 85),
      createPlayer('Mathieu Fontaine', 'MC', 31, 15, 76),
      createPlayer('Paulo Ferreira', 'MCO', 25, 80, 88),
      createPlayer('R. Cardoso', 'MCO', 22, 50, 85),
      createPlayer('B. Shelton', 'MCO', 31, 27, 79),
      createPlayer('J. Dekker', 'EI', 23, 65, 85),
      createPlayer('Souleyman', 'EI', 21, 45, 84),
      createPlayer('A. Saunier', 'ED', 26, 65, 85),
      createPlayer('O. Blackwell', 'ED', 22, 25, 79),
      createPlayer('Emilio Heredia', 'DC', 25, 200, 93),
      createPlayer('Oliver Morrison', 'DC', 26, 65, 85)
    ]
  },

  // ========== ARSENAL ==========
  arsenal: {
    name: 'Arsenal FC', shortName: 'ARS', city: 'London',
    stadium: 'Cannon Park Stadium', stadiumCapacity: 60704,
    budget: 200000000, reputation: 92, league: 'premier',
    colors: { primary: '#EF0107', secondary: '#FFFFFF' },
    players: [
      createPlayer('Dylan Radford', 'POR', 30, 35, 82),
      createPlayer('Kevin Arévalo', 'POR', 31, 7, 73),
      createPlayer('W. Shelton', 'DFC', 24, 90, 88),
      createPlayer('George Morrison', 'DFC', 28, 75, 85),
      createPlayer('Perry Hayward', 'DFC', 24, 50, 85),
      createPlayer('César Medrano', 'DFC', 21, 35, 84),
      createPlayer('Ramón Carrasco', 'LB', 23, 50, 85),
      createPlayer('Matthijs Pieters', 'LB', 19, 40, 84),
      createPlayer('J. Touré', 'RB', 24, 70, 85),
      createPlayer('Bastien Beaumont', 'RB', 28, 30, 82),
      createPlayer('Mathieu Beaumont', 'MCD', 26, 75, 85),
      createPlayer('Craig Norwood', 'MCD', 31, 9, 73),
      createPlayer('Daniel Robledo', 'MC', 27, 120, 91),
      createPlayer('Morgan Morrison', 'MC', 29, 30, 82),
      createPlayer('Mason Kingsley', 'MCO', 27, 75, 85),
      createPlayer('Edward Ellwood', 'MCO', 27, 65, 85),
      createPlayer('Gijs Mulder', 'EI', 24, 45, 82),
      createPlayer('Lars Timmermans', 'EI', 31, 20, 79),
      createPlayer('Ben Shelton', 'ED', 24, 130, 87),
      createPlayer('Ndaye Mensah', 'ED', 23, 50, 85),
      createPlayer('Morgan Dixon', 'ED', 16, 20, 81),
      createPlayer('Vincent Geerts', 'DC', 27, 70, 85),
      createPlayer('Kaique Holanda', 'DC', 26, 55, 85),
      createPlayer('G. Bamba', 'DC', 28, 20, 79)
    ]
  },

  // ========== CHELSEA ==========
  chelsea: {
    name: 'Chelsea FC', shortName: 'CHE', city: 'London',
    stadium: 'Bridge Arena', stadiumCapacity: 40343,
    budget: 180000000, reputation: 90, league: 'premier',
    colors: { primary: '#034694', secondary: '#FFFFFF' },
    players: [
      createPlayer('Ramón Salcedo', 'POR', 28, 22, 79),
      createPlayer('Fode Bamba', 'POR', 23, 15, 76),
      createPlayer('G. Salcedo', 'POR', 21, 3.5, 69),
      createPlayer('L. Carpentier', 'DFC', 22, 50, 85),
      createPlayer('Teodoro Carrasco', 'DFC', 26, 35, 82),
      createPlayer('Wyatt Fletcher', 'DFC', 25, 28, 79),
      createPlayer('Tidiane Appiah', 'DFC', 28, 20, 79),
      createPlayer('Bradley Barrett', 'DFC', 24, 18, 76),
      createPlayer('Arjen Dekker', 'DFC', 27, 15, 76),
      createPlayer('M. Crawford', 'LB', 27, 50, 85),
      createPlayer('Jaime Heredia', 'LB', 19, 35, 84),
      createPlayer('Ricky Jennings', 'RB', 26, 50, 85),
      createPlayer('Mason Greenwood', 'RB', 22, 35, 82),
      createPlayer('Joost Aalbers', 'RB', 19, 20, 81),
      createPlayer('Morgan Caldwell', 'MCD', 24, 110, 88),
      createPlayer('Ryan Lambert', 'MCD', 22, 30, 82),
      createPlayer('D. Ellwood', 'MCD', 20, 20, 81),
      createPlayer('E. Ferreira', 'MC', 25, 85, 88),
      createPlayer('Aaron Shelton', 'MC', 21, 40, 84),
      createPlayer('Craig Prescott', 'MCO', 23, 120, 91),
      createPlayer('Aaron Greenwood', 'EI', 21, 45, 84),
      createPlayer('Jamie Gifford', 'EI', 21, 40, 84),
      createPlayer('Dorian', 'ED', 18, 80, 90),
      createPlayer('P. Ndiaye', 'ED', 25, 60, 85),
      createPlayer('J. Prescott', 'DC', 24, 65, 85),
      createPlayer('Luciano Drummond', 'DC', 22, 35, 82),
      createPlayer('M. Greenwood', 'DC', 20, 12, 78)
    ]
  },

  // ========== LIVERPOOL ==========
  liverpool: {
    name: 'Liverpool FC', shortName: 'LIV', city: 'Scarlet Port FC',
    stadium: 'Scarlet Field', stadiumCapacity: 61276,
    budget: 180000000, reputation: 92, league: 'premier',
    colors: { primary: '#C8102E', secondary: '#FFFFFF' },
    players: [
      createPlayer('G. Morrison', 'POR', 25, 28, 79),
      createPlayer('Adriano', 'POR', 33, 17, 88),
      createPlayer('Isaac Kingsley', 'DFC', 26, 50, 85),
      createPlayer('Gabriel Laínez', 'DFC', 19, 25, 81),
      createPlayer('Victor Dixon', 'DFC', 34, 18, 88),
      createPlayer('Juma Gnamba', 'DFC', 28, 15, 76),
      createPlayer('Moussa Keita', 'LB', 22, 40, 82),
      createPlayer('Arjen Bos', 'LB', 31, 12, 76),
      createPlayer('J. Fletcher', 'RB', 25, 38, 82),
      createPlayer('Craig Barrett', 'RB', 22, 30, 82),
      createPlayer('Raí Gonçalves', 'MCD', 23, 90, 88),
      createPlayer('Sébastien Beauchamp', 'MCD', 21, 7, 75),
      createPlayer('Teodoro Estrada', 'MCD', 32, 5, 69),
      createPlayer('Arjen Aalbers', 'MC', 27, 85, 88),
      createPlayer('Caio Junqueira', 'MC', 24, 40, 82),
      createPlayer('Thiago Nascimento', 'MC', 18, 6, 72),
      createPlayer('Freddie Whitfield', 'MCO', 22, 110, 88),
      createPlayer('Dylan Shelton', 'MCO', 25, 85, 88),
      createPlayer('Caio Gonçalves', 'EI', 26, 70, 85),
      createPlayer('Raí Nascimento', 'EI', 17, 15, 78),
      createPlayer('Morgan Shelton', 'ED', 33, 30, 89),
      createPlayer('Fabrice Carpentier', 'ED', 28, 18, 76),
      createPlayer('Adam Irving', 'DC', 26, 120, 91),
      createPlayer('H. Ellwood', 'DC', 23, 85, 88)
    ]
  },

  // ========== TOTTENHAM ==========
  tottenham: {
    name: 'Ivory Hotspur', shortName: 'TOT', city: 'London',
    stadium: 'Whitecrest Arena', stadiumCapacity: 62850,
    budget: 150000000, reputation: 85, league: 'premier',
    colors: { primary: '#132257', secondary: '#FFFFFF' },
    players: [
      createPlayer('Gabriel Valderrama', 'POR', 29, 30, 82),
      createPlayer('A. Keita', 'POR', 22, 13, 76),
      createPlayer('M. Vernon', 'DFC', 24, 65, 85),
      createPlayer('Caio Rezende', 'DFC', 27, 60, 85),
      createPlayer('Raí Drummond', 'DFC', 23, 22, 79),
      createPlayer('Kevin Delgado', 'DFC', 27, 22, 79),
      createPlayer('Bernardo Drummond', 'DFC', 32, 5, 69),
      createPlayer('Dylan Underwood', 'LB', 23, 40, 82),
      createPlayer('Dorian Saunier', 'LB', 25, 32, 82),
      createPlayer('Perry Prescott', 'RB', 26, 40, 82),
      createPlayer('Juma Bamba', 'MCD', 30, 25, 79),
      createPlayer('Gonzalo Belmonte', 'MCD', 29, 15, 76),
      createPlayer('Lars Bakker', 'MC', 19, 40, 84),
      createPlayer('Arjen Geerts', 'MC', 19, 35, 84),
      createPlayer('C. Gnamba', 'MC', 25, 35, 82),
      createPlayer('P. Shelton', 'MC', 23, 35, 82),
      createPlayer('Rachid Boateng', 'MC', 28, 27, 80),
      createPlayer('Kaique Silveira', 'MCO', 22, 60, 85),
      createPlayer('D. Kamara', 'MCO', 25, 45, 82),
      createPlayer('Joost Mulder', 'MCO', 29, 30, 82),
      createPlayer('Wayne Osborne', 'EI', 21, 22, 81),
      createPlayer('Morgan Keating', 'ED', 25, 55, 85),
      createPlayer('Drissa Sangaré', 'DC', 28, 35, 82),
      createPlayer('M. Thornton', 'DC', 20, 30, 84),
      createPlayer('Rémi', 'DC', 28, 28, 79),
      createPlayer('Raí Monteiro', 'DC', 27, 25, 79)
    ]
  },

  // ========== MANCHESTER UNITED ==========
  manchester_united: {
    name: 'Old Reds United', shortName: 'MUN', city: 'Manchester',
    stadium: 'Fortress Ground', stadiumCapacity: 74310,
    budget: 160000000, reputation: 88, league: 'premier',
    colors: { primary: '#DA291C', secondary: '#FFFFFF' },
    players: [
      createPlayer('Sébastien Lefevre', 'POR', 23, 25, 79),
      createPlayer('Aaron Blackwell', 'POR', 27, 7, 73),
      createPlayer('L. Campos', 'DFC', 20, 55, 87),
      createPlayer('Mason Lambert', 'DFC', 26, 40, 82),
      createPlayer('Lorenzo Medrano', 'DFC', 28, 35, 81),
      createPlayer('Habib Mensah', 'DFC', 32, 10, 72),
      createPlayer('Abdou Haidara', 'DFC', 19, 10, 75),
      createPlayer('P. Dekker', 'LB', 21, 30, 84),
      createPlayer('Lewis Shelton', 'LB', 30, 10, 73),
      createPlayer('Theo Morrison', 'LB', 26, 5, 70),
      createPlayer('Dorian Delacroix', 'RB', 26, 28, 79),
      createPlayer('Nathan Morrison', 'RB', 28, 22, 79),
      createPlayer('Marcos Uriarte', 'MCD', 24, 30, 82),
      createPlayer('Charlie', 'MCD', 33, 8, 72),
      createPlayer('Koen Mulder', 'MC', 20, 40, 84),
      createPlayer('Bradley Fletcher', 'MCO', 31, 40, 87),
      createPlayer('Murilo Monteiro', 'MCO', 27, 32, 82),
      createPlayer('Bernardo Monteiro', 'ED', 26, 75, 85),
      createPlayer('Abdou Diop', 'ED', 23, 50, 85),
      createPlayer('M. Carpentier', 'DC', 26, 70, 85),
      createPlayer('B. Silveira', 'DC', 22, 60, 85),
      createPlayer('Jacques Renard', 'DC', 24, 25, 79)
    ]
  },

  // ========== NEWCASTLE ==========
  newcastle: {
    name: 'Tyne United', shortName: 'NEW', city: 'Tyne United',
    stadium: 'St. James\' Park', stadiumCapacity: 52305,
    budget: 120000000, reputation: 82, league: 'premier',
    colors: { primary: '#241F20', secondary: '#FFFFFF' },
    players: [
      createPlayer('Adrián Robledo', 'POR', 27, 12, 76),
      createPlayer('Nícolas Pereira', 'POR', 33, 7, 72),
      createPlayer('M. Thibault', 'DFC', 24, 40, 82),
      createPlayer('Sam Blackwell', 'DFC', 26, 35, 82),
      createPlayer('Freddie Shelton', 'DFC', 34, 6, 82),
      createPlayer('Daniel Belmonte', 'DFC', 33, 5, 69),
      createPlayer('Liam Hammond', 'LB', 21, 32, 80),
      createPlayer('Tyler Lambert', 'RB', 23, 40, 82),
      createPlayer('Kaique Teixeira', 'RB', 35, 2.5, 64),
      createPlayer('S. Thibault', 'MCD', 25, 75, 85),
      createPlayer('Bastien Gauthier', 'MC', 28, 75, 85),
      createPlayer('J. Boateng', 'MC', 24, 35, 82),
      createPlayer('Jaime', 'MC', 29, 30, 82),
      createPlayer('Lewis Morrison', 'MC', 19, 20, 81),
      createPlayer('Jake Whitfield', 'MC', 26, 16, 76),
      createPlayer('Adrián Giraldo', 'EI', 24, 60, 85),
      createPlayer('Hugo Belmonte', 'EI', 28, 32, 82),
      createPlayer('Adriano Esperança', 'ED', 23, 50, 85),
      createPlayer('Jamie Morrison', 'ED', 30, 15, 81),
      createPlayer('N. Willems', 'DC', 23, 70, 85),
      createPlayer('Quinn Whitfield', 'DC', 29, 35, 82),
      createPlayer('W. Osborne', 'DC', 22, 15, 76)
    ]
  },

  // ========== NOTTINGHAM FOREST ==========
  nottingham_forest: {
    name: 'Sherwood Forest FC', shortName: 'NFO', city: 'Nottingham',
    stadium: 'City Ground', stadiumCapacity: 30445,
    budget: 90000000, reputation: 75, league: 'premier',
    colors: { primary: '#DD0000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Jacques Vasseur', 'POR', 29, 7, 73),
      createPlayer('Mason Shelton', 'POR', 33, 6, 69),
      createPlayer('Morgan', 'DFC', 23, 55, 85),
      createPlayer('Noah Morrison', 'DFC', 28, 30, 82),
      createPlayer('Marcos', 'DFC', 24, 14, 76),
      createPlayer('Jake Crawford', 'DFC', 20, 12, 78),
      createPlayer('Niels Willems', 'LB', 24, 25, 79),
      createPlayer('Owen Blackwell', 'LB', 29, 15, 76),
      createPlayer('O. Ashford', 'RB', 29, 20, 79),
      createPlayer('Niels Smit', 'RB', 22, 15, 76),
      createPlayer('Wallace Silveira', 'MCD', 28, 22, 79),
      createPlayer('Edward Ashford', 'MC', 23, 60, 85),
      createPlayer('Dylan Lambert', 'MC', 27, 25, 79),
      createPlayer('Niels Dekker', 'MC', 27, 16, 76),
      createPlayer('Rachid Maïga', 'MC', 28, 10, 73),
      createPlayer('M. Gonçalves', 'MCO', 26, 65, 85),
      createPlayer('Oliver Hammond', 'MCO', 22, 30, 82),
      createPlayer('Juma Mensah', 'MCO', 23, 23, 79),
      createPlayer('Casper Hendriks', 'EI', 25, 30, 82),
      createPlayer('Daniel Navarrete', 'ED', 25, 40, 82),
      createPlayer('Dylan Blackwell', 'ED', 23, 32, 82),
      createPlayer('Luciano Lacerda', 'DC', 25, 25, 79),
      createPlayer('Isaac Jennings', 'DC', 24, 20, 79),
      createPlayer('Theo Ashford', 'DC', 28, 12, 76),
      createPlayer('C. Heredia', 'DC', 34, 8, 82)
    ]
  },

  // ========== BRIGHTON ==========
  brighton: {
    name: 'Seagull Albion', shortName: 'BHA', city: 'Seagull Albion',
    stadium: 'Amex Stadium', stadiumCapacity: 31800,
    budget: 80000000, reputation: 75, league: 'premier',
    colors: { primary: '#0057B8', secondary: '#FFFFFF' },
    players: [
      createPlayer('Boubacar Traoré', 'POR', 23, 35, 82),
      createPlayer('Jake Shelton', 'POR', 35, 0.75, 60),
      createPlayer('Juma Haidara', 'DFC', 25, 35, 82),
      createPlayer('Olivier Beauchamp', 'DFC', 28, 18, 76),
      createPlayer('Dorian Carpentier', 'DFC', 22, 10, 73),
      createPlayer('A. Willems', 'DFC', 31, 7, 73),
      createPlayer('Laurent Delacroix', 'DFC', 34, 4, 69),
      createPlayer('Fernando Zabaleta', 'LB', 26, 28, 79),
      createPlayer('Mason Crawford', 'LB', 25, 22, 79),
      createPlayer('Joost Veenstra', 'RB', 34, 2.5, 66),
      createPlayer('Charlie Blackwell', 'MCD', 22, 60, 81),
      createPlayer('Mason Whitfield', 'MCD', 26, 25, 79),
      createPlayer('Jake Hammond', 'MCD', 20, 22, 81),
      createPlayer('César Arévalo', 'MC', 22, 30, 82),
      createPlayer('Dorian Gauthier', 'MC', 22, 25, 79),
      createPlayer('Patrick Greenwood', 'MC', 34, 3.5, 66),
      createPlayer('Jonas Monteiro', 'MC', 40, 0.75, 60),
      createPlayer('Kaique Monteiro', 'EI', 28, 30, 82),
      createPlayer('T. Whitfield', 'EI', 19, 10, 75),
      createPlayer('Youssef Mensah', 'ED', 21, 40, 84),
      createPlayer('Bernardo Gonçalves', 'ED', 21, 28, 81),
      createPlayer('Sébastien Masson', 'ED', 31, 3, 67),
      createPlayer('Guilherme Rezende', 'DC', 23, 32, 82),
      createPlayer('C. Kanté', 'DC', 18, 25, 81),
      createPlayer('Sam Thornton', 'DC', 20, 22, 81),
      createPlayer('Daan Willems', 'DC', 35, 4, 67)
    ]
  },

  // ========== ASTON VILLA ==========
  aston_villa: {
    name: 'Claret Villa', shortName: 'AVL', city: 'Birmingham',
    stadium: 'Villa Park', stadiumCapacity: 42682,
    budget: 100000000, reputation: 78, league: 'premier',
    colors: { primary: '#670E36', secondary: '#95BFE5' },
    players: [
      createPlayer('Elliot Morrison', 'POR', 33, 15, 75),
      createPlayer('Marcos Belmonte', 'POR', 34, 2.5, 66),
      createPlayer('Mathieu Renard', 'DFC', 28, 35, 82),
      createPlayer('Patrick Thornton', 'DFC', 29, 25, 79),
      createPlayer('Victor Lambert', 'DFC', 31, 6, 70),
      createPlayer('Thijs Mulder', 'DFC', 32, 4, 69),
      createPlayer('Anderson Monteiro', 'LB', 23, 25, 79),
      createPlayer('Lars Dekker', 'LB', 32, 8, 72),
      createPlayer('Mathieu Carpentier', 'RB', 28, 22, 79),
      createPlayer('Adam Gifford', 'RB', 22, 7, 73),
      createPlayer('Adam Osborne', 'MCD', 24, 42, 82),
      createPlayer('Bradley Keating', 'MCD', 26, 40, 82),
      createPlayer('Laurent Beauchamp', 'MCD', 22, 12, 76),
      createPlayer('P. Torralba', 'MC', 28, 35, 82),
      createPlayer('Jake Morrison', 'MC', 31, 15, 81),
      createPlayer('Raí Barbosa', 'MC', 32, 5, 69),
      createPlayer('Mathieu Roche', 'MCO', 23, 70, 85),
      createPlayer('Harry Emerson', 'MCO', 22, 30, 82),
      createPlayer('Emilio Belmonte', 'MCO', 29, 18, 76),
      createPlayer('Juma Sylla', 'EI', 25, 20, 79),
      createPlayer('Emilio Giraldo', 'ED', 24, 28, 79),
      createPlayer('Lewis Barrett', 'ED', 28, 18, 76),
      createPlayer('Olivier Joubert', 'DC', 30, 30, 82),
      createPlayer('B. Mulder', 'DC', 17, 4, 72)
    ]
  },

  // ========== CRYSTAL PALACE ==========
  crystal_palace: {
    name: 'Palace Eagles FC', shortName: 'CRY', city: 'London',
    stadium: 'Selhurst Park', stadiumCapacity: 25486,
    budget: 70000000, reputation: 72, league: 'premier',
    colors: { primary: '#1B458F', secondary: '#C4122E' },
    players: [
      createPlayer('Dorian Hubert', 'POR', 28, 28, 79),
      createPlayer('Wyatt Barrett', 'POR', 33, 5, 69),
      createPlayer('M. Lambert', 'DFC', 25, 35, 82),
      createPlayer('César Robledo', 'DFC', 25, 25, 79),
      createPlayer('Jacques Carpentier', 'DFC', 19, 20, 81),
      createPlayer('C. Rezende', 'DFC', 22, 12, 76),
      createPlayer('Tidiane Mensah', 'LB', 26, 25, 79),
      createPlayer('Boubacar Sylla', 'LB', 28, 4, 70),
      createPlayer('Davi Monteiro', 'RB', 29, 27, 79),
      createPlayer('N. Claassen', 'RB', 34, 0.5, 61),
      createPlayer('A. Renard', 'MCD', 21, 60, 87),
      createPlayer('C. Drummond', 'MCD', 26, 15, 76),
      createPlayer('Jake Lambert', 'MCD', 31, 8, 73),
      createPlayer('Wyatt Hayward', 'MC', 30, 6, 70),
      createPlayer('D. Campos', 'MCO', 29, 12, 76),
      createPlayer('J. Delacroix', 'MCO', 22, 8, 73),
      createPlayer('B. Saunier', 'ED', 27, 35, 82),
      createPlayer('B. Prescott', 'ED', 23, 35, 82),
      createPlayer('Ben Jennings', 'ED', 24, 35, 82),
      createPlayer('Juma Traoré', 'ED', 23, 6, 70),
      createPlayer('Jaime Medrano', 'DC', 28, 40, 82),
      createPlayer('Edwin Nijhuis', 'DC', 26, 16, 76),
      createPlayer('Charlie Underwood', 'DC', 22, 15, 76)
    ]
  },

  // ========== BRENTFORD ==========
  brentford: {
    name: 'Brentford FC', shortName: 'BRE', city: 'London',
    stadium: 'Gtech Community Stadium', stadiumCapacity: 17250,
    budget: 65000000, reputation: 72, league: 'premier',
    colors: { primary: '#E30613', secondary: '#FFB81C' },
    players: [
      createPlayer('Cissé Koroma', 'POR', 27, 22, 79),
      createPlayer('Harry Vernon', 'POR', 24, 2.5, 67),
      createPlayer('Nicolas Carpentier', 'DFC', 24, 35, 82),
      createPlayer('Shane Barrett', 'DFC', 24, 28, 79),
      createPlayer('Kaique Alcântara', 'DFC', 27, 16, 76),
      createPlayer('Emilio Palacios', 'DFC', 32, 4, 69),
      createPlayer('Ryan Hammond', 'LB', 28, 15, 76),
      createPlayer('M. Koroma', 'RB', 21, 27, 81),
      createPlayer('Aurélien Hubert', 'RB', 23, 16, 76),
      createPlayer('Vincent Janssen', 'MCD', 27, 18, 76),
      createPlayer('Jamie Hayward', 'MCD', 35, 2, 64),
      createPlayer('Frank Gifford', 'MC', 21, 25, 81),
      createPlayer('Marcos Jurado', 'MC', 30, 12, 76),
      createPlayer('Felipe Olímpio', 'MC', 28, 7, 73),
      createPlayer('Kyle Lambert', 'MI', 24, 22, 79),
      createPlayer('Murilo Drummond', 'MCO', 25, 30, 82),
      createPlayer('Adrián Medrano', 'MCO', 20, 20, 81),
      createPlayer('Felipe Cardoso', 'MCO', 23, 12, 76),
      createPlayer('Kyle Shelton', 'EI', 24, 35, 82),
      createPlayer('Ryan Norwood', 'EI', 26, 14, 76),
      createPlayer('Daniel Ocampo', 'ED', 23, 35, 82),
      createPlayer('Isaac Thornton', 'DC', 24, 35, 82),
      createPlayer('Kévin Favre', 'DC', 18, 2.5, 69)
    ]
  },

  // ========== BOURNEMOUTH ==========
  bournemouth: {
    name: 'Cherry Town FC', shortName: 'BOU', city: 'Cherry Town FC',
    stadium: 'Vitality Stadium', stadiumCapacity: 11364,
    budget: 60000000, reputation: 70, league: 'premier',
    colors: { primary: '#DA291C', secondary: '#000000' },
    players: [
      createPlayer('Dorian Perrin', 'POR', 26, 28, 79),
      createPlayer('Fode Frimpong', 'POR', 37, 0.6, 60),
      createPlayer('Bradley Dixon', 'DFC', 25, 35, 82),
      createPlayer('Mathieu Saunier', 'DFC', 28, 22, 79),
      createPlayer('Victor Morrison', 'DFC', 18, 20, 81),
      createPlayer('Jonas Holanda', 'DFC', 24, 7, 73),
      createPlayer('Aaron Thornton', 'LB', 24, 20, 79),
      createPlayer('Juma Sesay', 'LB', 20, 8, 75),
      createPlayer('Guilherme Junqueira', 'RB', 20, 18, 78),
      createPlayer('A. Sesay', 'RB', 34, 0.5, 61),
      createPlayer('Thierry Arnaud', 'MCD', 26, 25, 79),
      createPlayer('Arjen Smit', 'MC', 22, 30, 82),
      createPlayer('L. Coulibaly', 'MC', 28, 13, 76),
      createPlayer('Ryan Crawford', 'MC', 30, 9, 73),
      createPlayer('Aurélien Thibault', 'MC', 20, 8, 75),
      createPlayer('Jake Kingsley', 'MCO', 26, 32, 82),
      createPlayer('Mason Thornton', 'MCO', 26, 20, 79),
      createPlayer('Adam Ashford', 'EI', 25, 20, 79),
      createPlayer('Bruno Giraldo', 'ED', 20, 18, 78),
      createPlayer('D. Bamba', 'ED', 28, 12, 76),
      createPlayer('Edwin', 'DC', 26, 40, 82),
      createPlayer('Elliot Keating', 'DC', 19, 22, 81),
      createPlayer('E. Zabaleta', 'DC', 28, 8, 73)
    ]
  },

  // ========== EVERTON ==========
  everton: {
    name: 'Everton FC', shortName: 'EVE', city: 'Scarlet Port FC',
    stadium: 'Everton Stadium', stadiumCapacity: 52888,
    budget: 60000000, reputation: 72, league: 'premier',
    colors: { primary: '#003399', secondary: '#FFFFFF' },
    players: [
      createPlayer('Jonas Pereira', 'POR', 31, 15, 76),
      createPlayer('Marcos Torralba', 'POR', 26, 4, 70),
      createPlayer('Jake Blackwell', 'DFC', 23, 45, 82),
      createPlayer('Joost Timmermans', 'DFC', 33, 7, 72),
      createPlayer('Matthijs Kuiper', 'DFC', 33, 4, 69),
      createPlayer('V. Masson', 'LB', 26, 25, 79),
      createPlayer('Abdou Appiah', 'LB', 19, 7, 75),
      createPlayer('Jacques Masson'Brien', 'RB', 24, 16),
      createPlayer('N. Palacios', 'RB', 24, 10, 73),
      createPlayer('S. Cardoso', 'RB', 37, 0.3, 60),
      createPlayer('J. Geerts', 'MCD', 24, 25, 79),
      createPlayer('B. Gauthier', 'MCD', 36, 1, 61),
      createPlayer('K. Dawson', 'MC', 27, 28, 79),
      createPlayer('Charlie Ashford', 'MC', 23, 15, 76),
      createPlayer('Tyler Irving', 'MC', 22, 12, 76),
      createPlayer('Mason Radford', 'MCO', 23, 16, 76),
      createPlayer('J. Gnamba', 'EI', 30, 25, 79),
      createPlayer('Daan Mulder', 'EI', 26, 20, 79),
      createPlayer('Ian Norwood', 'ED', 25, 45, 82),
      createPlayer('Thiago Drummond', 'ED', 19, 30, 84),
      createPlayer('Thiago Barbosa', 'DC', 23, 30, 82),
      createPlayer('Bruno', 'DC', 27, 20, 79)
    ]
  },

  // ========== WEST HAM ==========
  west_ham: {
    name: 'Iron Hammers United', shortName: 'WHU', city: 'London',
    stadium: 'London Stadium', stadiumCapacity: 62500,
    budget: 65000000, reputation: 72, league: 'premier',
    colors: { primary: '#7A263A', secondary: '#1BB1E7' },
    players: [
      createPlayer('Mathieu Hubert', 'POR', 25, 15, 76),
      createPlayer('A. Arnaud', 'POR', 32, 7, 72),
      createPlayer('J. Timmermans', 'DFC', 26, 23, 79),
      createPlayer('Mathieu Tessier', 'DFC', 28, 22, 79),
      createPlayer('I. Jennings', 'DFC', 27, 15, 76),
      createPlayer('K. Monteiro', 'DFC', 28, 15, 76),
      createPlayer('Enzo Drummond', 'LB', 21, 28, 81),
      createPlayer('Olivier Saunier', 'LB', 20, 8, 75),
      createPlayer('Adrián Jurado', 'RB', 28, 22, 79),
      createPlayer('Kyle Whitfield', 'RB', 28, 13, 76),
      createPlayer('S. Morrison', 'MCD', 22, 17, 76),
      createPlayer('Thierry Saunier', 'MCD', 30, 12, 76),
      createPlayer('F. Prescott', 'MCD', 22, 8, 73),
      createPlayer('Mason Fletcher', 'MC', 21, 32, 84),
      createPlayer('J. Whitfield', 'MC', 31, 6, 70),
      createPlayer('Luciano Pereira', 'MCO', 28, 35, 82),
      createPlayer('Craig Shelton', 'EI', 24, 22, 79),
      createPlayer('J. Beauchamp', 'ED', 29, 35, 82),
      createPlayer('Tyler Crawford', 'DC', 27, 25, 79),
      createPlayer('César Bermejo', 'DC', 33, 5, 69),
      createPlayer('Philippe', 'DC', 22, 5, 70)
    ]
  },

  // ========== SUNDERLAND ==========
  sunderland: {
    name: 'Sunderland AFC', shortName: 'SUN', city: 'Sunderland',
    stadium: 'Stadium of Light', stadiumCapacity: 49000,
    budget: 50000000, reputation: 68, league: 'premier',
    colors: { primary: '#FF0000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Raí Rezende', 'POR', 23, 18, 76),
      createPlayer('Adriano Pereira', 'POR', 25, 10, 73),
      createPlayer('D. Blackwell', 'DFC', 26, 16, 76),
      createPlayer('Oliver Ashford', 'DFC', 29, 12, 76),
      createPlayer('Lewis Osborne'Nien', 'DFC', 31, 1.3),
      createPlayer('Aurélien Arnaud', 'DFC', 25, 1, 64),
      createPlayer('Davi Cardoso', 'LB', 23, 8, 73),
      createPlayer('Rémi Masson', 'LB', 32, 5, 69),
      createPlayer('Aaron Morrison', 'LB', 32, 2.5, 66),
      createPlayer('Lamine Gnamba', 'RB', 25, 20, 79),
      createPlayer('Thijs Hendriks', 'RB', 23, 18, 76),
      createPlayer('N. Mensah', 'RB', 28, 15, 76),
      createPlayer('G. Heredia', 'MCD', 33, 10, 72),
      createPlayer('Heitor Drummond', 'MC', 22, 32, 82),
      createPlayer('Noah Shelton', 'MC', 21, 25, 81),
      createPlayer('Enzo Ferreira', 'MC', 25, 20, 79),
      createPlayer('Dylan Norwood', 'MC', 24, 6.5, 70),
      createPlayer('Charlie Radford', 'MCO', 18, 25, 81),
      createPlayer('Shane Ashford', 'EI', 24, 22, 79),
      createPlayer('Rachid Mensah', 'EI', 22, 6, 70),
      createPlayer('Craig Thornton', 'ED', 20, 22, 81),
      createPlayer('Ben Thornton', 'ED', 30, 5, 70),
      createPlayer('B. Barbosa', 'DC', 23, 20, 79),
      createPlayer('Edwin Mulder', 'DC', 20, 18, 78),
      createPlayer('Dorian Vasseur', 'DC', 25, 18, 76)
    ]
  },

  // ========== FULHAM ==========
  fulham: {
    name: 'Fulham FC', shortName: 'FUL', city: 'London',
    stadium: 'Craven Cottage', stadiumCapacity: 22384,
    budget: 55000000, reputation: 70, league: 'premier',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Bernardo Lacerda', 'POR', 33, 8, 72),
      createPlayer('B. Lambert', 'POR', 34, 1.2, 63),
      createPlayer('Cédric Beauchamp', 'DFC', 26, 28, 79),
      createPlayer('Jake Ashford', 'DFC', 29, 25, 79),
      createPlayer('Ian Dixon', 'DFC', 29, 10, 73),
      createPlayer('Joost Claassen', 'DFC', 26, 4, 70),
      createPlayer('Adam Radford', 'LB', 28, 30, 82),
      createPlayer('Remco Smit', 'LB', 25, 20, 79),
      createPlayer('K. Timmermans', 'RB', 30, 11, 73),
      createPlayer('Theo Caldwell', 'RB', 30, 10, 73),
      createPlayer('Salvador Belmonte', 'MCD', 27, 25, 79),
      createPlayer('Salvador Laínez', 'MC', 29, 12, 76),
      createPlayer('Henri Roche', 'MC', 31, 3, 67),
      createPlayer('T. Crawford', 'MC', 35, 0.75, 60),
      createPlayer('Yannick Roche', 'MCO', 25, 22, 79),
      createPlayer('Jacques Roche', 'MCO', 19, 20, 81),
      createPlayer('Kyle', 'EI', 23, 30, 82),
      createPlayer('A. Irving', 'EI', 29, 25, 79),
      createPlayer('Hugo Jurado', 'ED', 28, 20, 79),
      createPlayer('Salvador Carrasco', 'ED', 26, 10, 73),
      createPlayer('Arjen Timmermans', 'ED', 30, 8, 73),
      createPlayer('Ramón Medrano', 'DC', 24, 25, 79),
      createPlayer('Remco Janssen', 'DC', 34, 4, 69)
    ]
  },

  // ========== WOLVES ==========
  wolves: {
    name: 'Golden Wolves FC', shortName: 'WOL', city: 'Golden Wolves FC',
    stadium: 'Molineux Stadium', stadiumCapacity: 31750,
    budget: 50000000, reputation: 68, league: 'premier',
    colors: { primary: '#FDB913', secondary: '#231F20' },
    players: [
      createPlayer('Jonas Silveira', 'POR', 33, 5, 69),
      createPlayer('Samuel Junqueira', 'POR', 32, 5, 69),
      createPlayer('Tidiane', 'DFC', 27, 25, 79),
      createPlayer('Lamine Kanté', 'DFC', 26, 22, 79),
      createPlayer('Edwin Aalbers', 'DFC', 28, 18, 76),
      createPlayer('Sander Bakker', 'DFC', 27, 10, 73),
      createPlayer('Z. Morrison', 'DFC', 24, 10, 73),
      createPlayer('Harry Barrett', 'LB', 23, 10, 73),
      createPlayer('Davi Olímpio', 'LB', 23, 10, 73),
      createPlayer('Jake Thornton', 'RB', 24, 12, 76),
      createPlayer('Patrick Lambert', 'RB', 19, 4, 72),
      createPlayer('Mason Dawson', 'RB', 34, 1.5, 63),
      createPlayer('Aurélien', 'MCD', 24, 28, 79),
      createPlayer('Joost Geerts', 'MC', 24, 40, 82),
      createPlayer('J. Blackwell', 'MC', 27, 16, 76),
      createPlayer('R. Gonçalves', 'MI', 22, 15, 76),
      createPlayer('Edwin Geerts', 'EI', 21, 4, 72),
      createPlayer('J. Appiah', 'ED', 28, 15, 76),
      createPlayer('Joost Dekker', 'DC', 25, 40, 82),
      createPlayer('Tyler Ashford', 'DC', 25, 22, 79),
      createPlayer('Henri Hubert', 'DC', 30, 10, 73)
    ]
  },

  // ========== LEEDS UNITED ==========
  leeds: {
    name: 'Leeds United', shortName: 'LEE', city: 'Leeds',
    stadium: 'Elland Road', stadiumCapacity: 37890,
    budget: 55000000, reputation: 70, league: 'premier',
    colors: { primary: '#FFFFFF', secondary: '#1D428A' },
    players: [
      createPlayer('L. Palacios', 'POR', 28, 16, 76),
      createPlayer('I. Medrano', 'POR', 25, 12, 76),
      createPlayer('Kyle Dawson', 'POR', 35, 0.2, 60),
      createPlayer('Pape Sangaré', 'DFC', 26, 20, 79),
      createPlayer('Joost Bakker', 'DFC', 26, 18, 76),
      createPlayer('J. Maïga', 'DFC', 28, 12, 76),
      createPlayer('Samuel Barbosa', 'DFC', 26, 5, 70),
      createPlayer('George Greenwood', 'LB', 26, 15, 76),
      createPlayer('S. Blackwell', 'LB', 32, 0.6, 61),
      createPlayer('Jake Jennings', 'RB', 27, 12, 76),
      createPlayer('J. Barrett', 'RB', 25, 10, 73),
      createPlayer('Elia Appiah', 'MCD', 25, 20, 79),
      createPlayer('A. Shelton', 'MCD', 27, 20, 79),
      createPlayer('Ismaël Gnamba', 'MCD', 25, 9, 73),
      createPlayer('Sam Lambert', 'MC', 28, 18, 76),
      createPlayer('A. Touré', 'MC', 27, 10, 73),
      createPlayer('Freek Bakker', 'MCO', 21, 18, 78),
      createPlayer('B. Aalbers', 'MCO', 25, 15, 76),
      createPlayer('Ndaye Opoku', 'EI', 25, 18, 76),
      createPlayer('W. Greenwood', 'ED', 22, 20, 79),
      createPlayer('Dylan Jennings', 'ED', 28, 14, 76),
      createPlayer('Drissa Coulibaly', 'DC', 28, 15, 76),
      createPlayer('J. Peeters', 'DC', 26, 15, 76),
      createPlayer('Lewis Norwood', 'DC', 27, 8, 73)
    ]
  },

  // ========== BURNLEY ==========
  burnley: {
    name: 'Burnley FC', shortName: 'BUR', city: 'Burnley',
    stadium: 'Turf Moor', stadiumCapacity: 21944,
    budget: 40000000, reputation: 65, league: 'premier',
    colors: { primary: '#6C1D45', secondary: '#99D6EA' },
    players: [
      createPlayer('Marcos Ocampo', 'POR', 21, 4, 72),
      createPlayer('Moussa Diop', 'POR', 37, 0.75, 60),
      createPlayer('Valentin Hubert', 'POR', 35, 0.2, 60),
      createPlayer('Moussa Touré', 'DFC', 23, 25, 79),
      createPlayer('Bastien Hubert', 'DFC', 22, 12, 76),
      createPlayer('Habib Sesay', 'DFC', 27, 6, 70),
      createPlayer('Abdou Touré', 'DFC', 28, 5, 70),
      createPlayer('Jonas Campos', 'DFC', 29, 4, 70),
      createPlayer('Jacques Beauchamp', 'DFC', 25, 4, 70),
      createPlayer('Fode Haidara', 'LB', 24, 18, 76),
      createPlayer('Liam Prescott', 'LB', 24, 5, 70),
      createPlayer('Owen Shelton', 'RB', 25, 4, 70),
      createPlayer('Cissé Sesay', 'RB', 30, 3, 67),
      createPlayer('K. Whitfield', 'RB', 35, 2.5, 64),
      createPlayer('Lamine Touré', 'MCD', 21, 25, 81),
      createPlayer('Fode', 'MCD', 26, 22, 79),
      createPlayer('J. Claassen', 'MC', 29, 7, 73),
      createPlayer('J. Lacerda', 'MC', 30, 2, 67),
      createPlayer('Harvey', 'MCO', 23, 14, 76),
      createPlayer('Mathieu Thibault', 'MCO', 26, 4, 70),
      createPlayer('Jacques Arnaud', 'EI', 26, 15, 76),
      createPlayer('Jonas Lacerda', 'EI', 27, 5, 70),
      createPlayer('Lamine Tetteh', 'ED', 22, 15, 76),
      createPlayer('Mason Ellwood', 'ED', 27, 8, 73),
      createPlayer('Luciano Ferreira', 'DC', 25, 10, 73),
      createPlayer('Murilo Ferreira', 'DC', 27, 10, 73),
      createPlayer('Abdou Bamba', 'DC', 24, 10, 73),
      createPlayer('Drissa Appiah', 'DC', 25, 9, 73)
    ]
  }
};

export const premierTeamsArray = Object.entries(premierTeams).map(([id, team]) => ({
  id,
  ...team
}));

export default premierTeams;
