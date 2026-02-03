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
    name: 'Manchester City', shortName: 'MCI', city: 'Manchester',
    stadium: 'Etihad Stadium', stadiumCapacity: 53400,
    budget: 250000000, reputation: 95, league: 'premier',
    colors: { primary: '#6CABDD', secondary: '#FFFFFF' },
    players: [
      createPlayer('Gianluigi Donnarumma', 'POR', 26, 45, 82),
      createPlayer('James Trafford', 'POR', 23, 25, 79),
      createPlayer('Stefan Ortega', 'POR', 33, 5, 69),
      createPlayer('Josko Gvardiol', 'DFC', 24, 70, 85),
      createPlayer('Rúben Dias', 'DFC', 28, 60, 85),
      createPlayer('Marc Guéhi', 'DFC', 25, 55, 85),
      createPlayer('Abdukodir Khusanov', 'DFC', 21, 35, 84),
      createPlayer('John Stones', 'DFC', 31, 18, 82),
      createPlayer('Nathan Aké', 'DFC', 30, 18, 76),
      createPlayer('Rayan Aït-Nouri', 'LB', 24, 40, 82),
      createPlayer('Nico O\'Reilly', 'LB', 20, 40),
      createPlayer('Matheus Nunes', 'RB', 27, 38, 82),
      createPlayer('Rico Lewis', 'RB', 21, 35, 84),
      createPlayer('Rodri', 'MCD', 29, 75, 85),
      createPlayer('Nico González', 'MCD', 24, 45, 82),
      createPlayer('Kalvin Phillips', 'MCD', 30, 6, 70),
      createPlayer('Tijjani Reijnders', 'MC', 27, 65, 85),
      createPlayer('Mateo Kovacic', 'MC', 31, 15, 76),
      createPlayer('Phil Foden', 'MCO', 25, 80, 88),
      createPlayer('Rayan Cherki', 'MCO', 22, 50, 85),
      createPlayer('Bernardo Silva', 'MCO', 31, 27, 79),
      createPlayer('Jérémy Doku', 'EI', 23, 65, 85),
      createPlayer('Savinho', 'EI', 21, 45, 84),
      createPlayer('Antoine Semenyo', 'ED', 26, 65, 85),
      createPlayer('Oscar Bobb', 'ED', 22, 25, 79),
      createPlayer('Erling Haaland', 'DC', 25, 200, 93),
      createPlayer('Omar Marmoush', 'DC', 26, 65, 85)
    ]
  },

  // ========== ARSENAL ==========
  arsenal: {
    name: 'Arsenal FC', shortName: 'ARS', city: 'London',
    stadium: 'Emirates Stadium', stadiumCapacity: 60704,
    budget: 200000000, reputation: 92, league: 'premier',
    colors: { primary: '#EF0107', secondary: '#FFFFFF' },
    players: [
      createPlayer('David Raya', 'POR', 30, 35, 82),
      createPlayer('Kepa Arrizabalaga', 'POR', 31, 7, 73),
      createPlayer('William Saliba', 'DFC', 24, 90, 88),
      createPlayer('Gabriel Magalhães', 'DFC', 28, 75, 85),
      createPlayer('Piero Hincapié', 'DFC', 24, 50, 85),
      createPlayer('Cristhian Mosquera', 'DFC', 21, 35, 84),
      createPlayer('Riccardo Calafiori', 'LB', 23, 50, 85),
      createPlayer('Myles Lewis-Skelly', 'LB', 19, 40, 84),
      createPlayer('Jurriën Timber', 'RB', 24, 70, 85),
      createPlayer('Ben White', 'RB', 28, 30, 82),
      createPlayer('Martín Zubimendi', 'MCD', 26, 75, 85),
      createPlayer('Christian Nørgaard', 'MCD', 31, 9, 73),
      createPlayer('Declan Rice', 'MC', 27, 120, 91),
      createPlayer('Mikel Merino', 'MC', 29, 30, 82),
      createPlayer('Martin Ødegaard', 'MCO', 27, 75, 85),
      createPlayer('Eberechi Eze', 'MCO', 27, 65, 85),
      createPlayer('Gabriel Martinelli', 'EI', 24, 45, 82),
      createPlayer('Leandro Trossard', 'EI', 31, 20, 79),
      createPlayer('Bukayo Saka', 'ED', 24, 130, 87),
      createPlayer('Noni Madueke', 'ED', 23, 50, 85),
      createPlayer('Max Dowman', 'ED', 16, 20, 81),
      createPlayer('Viktor Gyökeres', 'DC', 27, 70, 85),
      createPlayer('Kai Havertz', 'DC', 26, 55, 85),
      createPlayer('Gabriel Jesus', 'DC', 28, 20, 79)
    ]
  },

  // ========== CHELSEA ==========
  chelsea: {
    name: 'Chelsea FC', shortName: 'CHE', city: 'London',
    stadium: 'Stamford Bridge', stadiumCapacity: 40343,
    budget: 180000000, reputation: 90, league: 'premier',
    colors: { primary: '#034694', secondary: '#FFFFFF' },
    players: [
      createPlayer('Robert Sánchez', 'POR', 28, 22, 79),
      createPlayer('Filip Jørgensen', 'POR', 23, 15, 76),
      createPlayer('Gabriel Slonina', 'POR', 21, 3.5, 69),
      createPlayer('Levi Colwill', 'DFC', 22, 50, 85),
      createPlayer('Trevoh Chalobah', 'DFC', 26, 35, 82),
      createPlayer('Wesley Fofana', 'DFC', 25, 28, 79),
      createPlayer('Tosin Adarabioyo', 'DFC', 28, 20, 79),
      createPlayer('Benoît Badiashile', 'DFC', 24, 18, 76),
      createPlayer('Axel Disasi', 'DFC', 27, 15, 76),
      createPlayer('Marc Cucurella', 'LB', 27, 50, 85),
      createPlayer('Jorrel Hato', 'LB', 19, 35, 84),
      createPlayer('Reece James', 'RB', 26, 50, 85),
      createPlayer('Malo Gusto', 'RB', 22, 35, 82),
      createPlayer('Josh Acheampong', 'RB', 19, 20, 81),
      createPlayer('Moisés Caicedo', 'MCD', 24, 110, 88),
      createPlayer('Roméo Lavia', 'MCD', 22, 30, 82),
      createPlayer('Dário Essugo', 'MCD', 20, 20, 81),
      createPlayer('Enzo Fernández', 'MC', 25, 85, 88),
      createPlayer('Andrey Santos', 'MC', 21, 40, 84),
      createPlayer('Cole Palmer', 'MCO', 23, 120, 91),
      createPlayer('Alejandro Garnacho', 'EI', 21, 45, 84),
      createPlayer('Jamie Gittens', 'EI', 21, 40, 84),
      createPlayer('Estêvão', 'ED', 18, 80, 90),
      createPlayer('Pedro Neto', 'ED', 25, 60, 85),
      createPlayer('João Pedro', 'DC', 24, 65, 85),
      createPlayer('Liam Delap', 'DC', 22, 35, 82),
      createPlayer('Marc Guiu', 'DC', 20, 12, 78)
    ]
  },

  // ========== LIVERPOOL ==========
  liverpool: {
    name: 'Liverpool FC', shortName: 'LIV', city: 'Liverpool',
    stadium: 'Anfield', stadiumCapacity: 61276,
    budget: 180000000, reputation: 92, league: 'premier',
    colors: { primary: '#C8102E', secondary: '#FFFFFF' },
    players: [
      createPlayer('Giorgi Mamardashvili', 'POR', 25, 28, 79),
      createPlayer('Alisson', 'POR', 33, 17, 88),
      createPlayer('Ibrahima Konaté', 'DFC', 26, 50, 85),
      createPlayer('Giovanni Leoni', 'DFC', 19, 25, 81),
      createPlayer('Virgil van Dijk', 'DFC', 34, 18, 88),
      createPlayer('Joe Gomez', 'DFC', 28, 15, 76),
      createPlayer('Milos Kerkez', 'LB', 22, 40, 82),
      createPlayer('Andrew Robertson', 'LB', 31, 12, 76),
      createPlayer('Jeremie Frimpong', 'RB', 25, 38, 82),
      createPlayer('Conor Bradley', 'RB', 22, 30, 82),
      createPlayer('Ryan Gravenberch', 'MCD', 23, 90, 88),
      createPlayer('Stefan Bajcetic', 'MCD', 21, 7, 75),
      createPlayer('Wataru Endo', 'MCD', 32, 5, 69),
      createPlayer('Alexis Mac Allister', 'MC', 27, 85, 88),
      createPlayer('Curtis Jones', 'MC', 24, 40, 82),
      createPlayer('Trey Nyoni', 'MC', 18, 6, 72),
      createPlayer('Florian Wirtz', 'MCO', 22, 110, 88),
      createPlayer('Dominik Szoboszlai', 'MCO', 25, 85, 88),
      createPlayer('Cody Gakpo', 'EI', 26, 70, 85),
      createPlayer('Rio Ngumoha', 'EI', 17, 15, 78),
      createPlayer('Mohamed Salah', 'ED', 33, 30, 89),
      createPlayer('Federico Chiesa', 'ED', 28, 18, 76),
      createPlayer('Alexander Isak', 'DC', 26, 120, 91),
      createPlayer('Hugo Ekitiké', 'DC', 23, 85, 88)
    ]
  },

  // ========== TOTTENHAM ==========
  tottenham: {
    name: 'Tottenham Hotspur', shortName: 'TOT', city: 'London',
    stadium: 'Tottenham Hotspur Stadium', stadiumCapacity: 62850,
    budget: 150000000, reputation: 85, league: 'premier',
    colors: { primary: '#132257', secondary: '#FFFFFF' },
    players: [
      createPlayer('Guglielmo Vicario', 'POR', 29, 30, 82),
      createPlayer('Antonín Kinský', 'POR', 22, 13, 76),
      createPlayer('Micky van de Ven', 'DFC', 24, 65, 85),
      createPlayer('Cristian Romero', 'DFC', 27, 60, 85),
      createPlayer('Radu Drăgușin', 'DFC', 23, 22, 79),
      createPlayer('Kevin Danso', 'DFC', 27, 22, 79),
      createPlayer('Ben Davies', 'DFC', 32, 5, 69),
      createPlayer('Destiny Udogie', 'LB', 23, 40, 82),
      createPlayer('Djed Spence', 'LB', 25, 32, 82),
      createPlayer('Pedro Porro', 'RB', 26, 40, 82),
      createPlayer('João Palhinha', 'MCD', 30, 25, 79),
      createPlayer('Yves Bissouma', 'MCD', 29, 15, 76),
      createPlayer('Lucas Bergvall', 'MC', 19, 40, 84),
      createPlayer('Archie Gray', 'MC', 19, 35, 84),
      createPlayer('Conor Gallagher', 'MC', 25, 35, 82),
      createPlayer('Pape Matar Sarr', 'MC', 23, 35, 82),
      createPlayer('Rodrigo Bentancur', 'MC', 28, 27, 80),
      createPlayer('Xavi Simons', 'MCO', 22, 60, 85),
      createPlayer('Dejan Kulusevski', 'MCO', 25, 45, 82),
      createPlayer('James Maddison', 'MCO', 29, 30, 82),
      createPlayer('Wilson Odobert', 'EI', 21, 22, 81),
      createPlayer('Mohammed Kudus', 'ED', 25, 55, 85),
      createPlayer('Dominic Solanke', 'DC', 28, 35, 82),
      createPlayer('Mathys Tel', 'DC', 20, 30, 84),
      createPlayer('Richarlison', 'DC', 28, 28, 79),
      createPlayer('Randal Kolo Muani', 'DC', 27, 25, 79)
    ]
  },

  // ========== MANCHESTER UNITED ==========
  manchester_united: {
    name: 'Manchester United', shortName: 'MUN', city: 'Manchester',
    stadium: 'Old Trafford', stadiumCapacity: 74310,
    budget: 160000000, reputation: 88, league: 'premier',
    colors: { primary: '#DA291C', secondary: '#FFFFFF' },
    players: [
      createPlayer('Senne Lammens', 'POR', 23, 25, 79),
      createPlayer('Altay Bayındır', 'POR', 27, 7, 73),
      createPlayer('Leny Yoro', 'DFC', 20, 55, 87),
      createPlayer('Matthijs de Ligt', 'DFC', 26, 40, 82),
      createPlayer('Lisandro Martínez', 'DFC', 28, 35, 81),
      createPlayer('Harry Maguire', 'DFC', 32, 10, 72),
      createPlayer('Ayden Heaven', 'DFC', 19, 10, 75),
      createPlayer('Patrick Dorgu', 'LB', 21, 30, 84),
      createPlayer('Luke Shaw', 'LB', 30, 10, 73),
      createPlayer('Tyrell Malacia', 'LB', 26, 5, 70),
      createPlayer('Diogo Dalot', 'RB', 26, 28, 79),
      createPlayer('Noussair Mazraoui', 'RB', 28, 22, 79),
      createPlayer('Manuel Ugarte', 'MCD', 24, 30, 82),
      createPlayer('Casemiro', 'MCD', 33, 8, 72),
      createPlayer('Kobbie Mainoo', 'MC', 20, 40, 84),
      createPlayer('Bruno Fernandes', 'MCO', 31, 40, 87),
      createPlayer('Mason Mount', 'MCO', 27, 32, 82),
      createPlayer('Bryan Mbeumo', 'ED', 26, 75, 85),
      createPlayer('Amad Diallo', 'ED', 23, 50, 85),
      createPlayer('Matheus Cunha', 'DC', 26, 70, 85),
      createPlayer('Benjamin Sesko', 'DC', 22, 60, 85),
      createPlayer('Joshua Zirkzee', 'DC', 24, 25, 79)
    ]
  },

  // ========== NEWCASTLE ==========
  newcastle: {
    name: 'Newcastle United', shortName: 'NEW', city: 'Newcastle',
    stadium: 'St. James\' Park', stadiumCapacity: 52305,
    budget: 120000000, reputation: 82, league: 'premier',
    colors: { primary: '#241F20', secondary: '#FFFFFF' },
    players: [
      createPlayer('Aaron Ramsdale', 'POR', 27, 12, 76),
      createPlayer('Nick Pope', 'POR', 33, 7, 72),
      createPlayer('Malick Thiaw', 'DFC', 24, 40, 82),
      createPlayer('Sven Botman', 'DFC', 26, 35, 82),
      createPlayer('Fabian Schär', 'DFC', 34, 6, 82),
      createPlayer('Dan Burn', 'DFC', 33, 5, 69),
      createPlayer('Lewis Hall', 'LB', 21, 32, 80),
      createPlayer('Tino Livramento', 'RB', 23, 40, 82),
      createPlayer('Kieran Trippier', 'RB', 35, 2.5, 64),
      createPlayer('Sandro Tonali', 'MCD', 25, 75, 85),
      createPlayer('Bruno Guimarães', 'MC', 28, 75, 85),
      createPlayer('Jacob Ramsey', 'MC', 24, 35, 82),
      createPlayer('Joelinton', 'MC', 29, 30, 82),
      createPlayer('Lewis Miley', 'MC', 19, 20, 81),
      createPlayer('Joe Willock', 'MC', 26, 16, 76),
      createPlayer('Anthony Gordon', 'EI', 24, 60, 85),
      createPlayer('Harvey Barnes', 'EI', 28, 32, 82),
      createPlayer('Anthony Elanga', 'ED', 23, 50, 85),
      createPlayer('Jacob Murphy', 'ED', 30, 15, 81),
      createPlayer('Nick Woltemade', 'DC', 23, 70, 85),
      createPlayer('Yoane Wissa', 'DC', 29, 35, 82),
      createPlayer('William Osula', 'DC', 22, 15, 76)
    ]
  },

  // ========== NOTTINGHAM FOREST ==========
  nottingham_forest: {
    name: 'Nottingham Forest', shortName: 'NFO', city: 'Nottingham',
    stadium: 'City Ground', stadiumCapacity: 30445,
    budget: 90000000, reputation: 75, league: 'premier',
    colors: { primary: '#DD0000', secondary: '#FFFFFF' },
    players: [
      createPlayer('John Victor', 'POR', 29, 7, 73),
      createPlayer('Matz Sels', 'POR', 33, 6, 69),
      createPlayer('Murillo', 'DFC', 23, 55, 85),
      createPlayer('Nikola Milenković', 'DFC', 28, 30, 82),
      createPlayer('Morato', 'DFC', 24, 14, 76),
      createPlayer('Jair Cunha', 'DFC', 20, 12, 78),
      createPlayer('Neco Williams', 'LB', 24, 25, 79),
      createPlayer('Oleksandr Zinchenko', 'LB', 29, 15, 76),
      createPlayer('Ola Aina', 'RB', 29, 20, 79),
      createPlayer('Nicolò Savona', 'RB', 22, 15, 76),
      createPlayer('Ibrahim Sangaré', 'MCD', 28, 22, 79),
      createPlayer('Elliot Anderson', 'MC', 23, 60, 85),
      createPlayer('Douglas Luiz', 'MC', 27, 25, 79),
      createPlayer('Nicolás Domínguez', 'MC', 27, 16, 76),
      createPlayer('Ryan Yates', 'MC', 28, 10, 73),
      createPlayer('Morgan Gibbs-White', 'MCO', 26, 65, 85),
      createPlayer('Omari Hutchinson', 'MCO', 22, 30, 82),
      createPlayer('James McAtee', 'MCO', 23, 23, 79),
      createPlayer('Callum Hudson-Odoi', 'EI', 25, 30, 82),
      createPlayer('Dan Ndoye', 'ED', 25, 40, 82),
      createPlayer('Dilane Bakwa', 'ED', 23, 32, 82),
      createPlayer('Lorenzo Lucca', 'DC', 25, 25, 79),
      createPlayer('Igor Jesus', 'DC', 24, 20, 79),
      createPlayer('Taiwo Awoniyi', 'DC', 28, 12, 76),
      createPlayer('Chris Wood', 'DC', 34, 8, 82)
    ]
  },

  // ========== BRIGHTON ==========
  brighton: {
    name: 'Brighton & Hove Albion', shortName: 'BHA', city: 'Brighton',
    stadium: 'Amex Stadium', stadiumCapacity: 31800,
    budget: 80000000, reputation: 75, league: 'premier',
    colors: { primary: '#0057B8', secondary: '#FFFFFF' },
    players: [
      createPlayer('Bart Verbruggen', 'POR', 23, 35, 82),
      createPlayer('Jason Steele', 'POR', 35, 0.75, 60),
      createPlayer('Jan Paul van Hecke', 'DFC', 25, 35, 82),
      createPlayer('Olivier Boscagli', 'DFC', 28, 18, 76),
      createPlayer('Diego Coppola', 'DFC', 22, 10, 73),
      createPlayer('Adam Webster', 'DFC', 31, 7, 73),
      createPlayer('Lewis Dunk', 'DFC', 34, 4, 69),
      createPlayer('Ferdi Kadıoğlu', 'LB', 26, 28, 79),
      createPlayer('Maxim De Cuyper', 'LB', 25, 22, 79),
      createPlayer('Joël Veltman', 'RB', 34, 2.5, 66),
      createPlayer('Carlos Baleba', 'MCD', 22, 60, 81),
      createPlayer('Mats Wieffer', 'MCD', 26, 25, 79),
      createPlayer('Jack Hinshelwood', 'MCD', 20, 22, 81),
      createPlayer('Yasin Ayari', 'MC', 22, 30, 82),
      createPlayer('Diego Gómez', 'MC', 22, 25, 79),
      createPlayer('Pascal Groß', 'MC', 34, 3.5, 66),
      createPlayer('James Milner', 'MC', 40, 0.75, 60),
      createPlayer('Kaoru Mitoma', 'EI', 28, 30, 82),
      createPlayer('Tom Watson', 'EI', 19, 10, 75),
      createPlayer('Yankuba Minteh', 'ED', 21, 40, 84),
      createPlayer('Brajan Gruda', 'ED', 21, 28, 81),
      createPlayer('Solly March', 'ED', 31, 3, 67),
      createPlayer('Georginio Rutter', 'DC', 23, 32, 82),
      createPlayer('Charalampos Kostoulas', 'DC', 18, 25, 81),
      createPlayer('Stefanos Tzimas', 'DC', 20, 22, 81),
      createPlayer('Danny Welbeck', 'DC', 35, 4, 67)
    ]
  },

  // ========== ASTON VILLA ==========
  aston_villa: {
    name: 'Aston Villa', shortName: 'AVL', city: 'Birmingham',
    stadium: 'Villa Park', stadiumCapacity: 42682,
    budget: 100000000, reputation: 78, league: 'premier',
    colors: { primary: '#670E36', secondary: '#95BFE5' },
    players: [
      createPlayer('Emiliano Martínez', 'POR', 33, 15, 75),
      createPlayer('Marco Bizot', 'POR', 34, 2.5, 66),
      createPlayer('Ezri Konsa', 'DFC', 28, 35, 82),
      createPlayer('Pau Torres', 'DFC', 29, 25, 79),
      createPlayer('Victor Lindelöf', 'DFC', 31, 6, 70),
      createPlayer('Tyrone Mings', 'DFC', 32, 4, 69),
      createPlayer('Ian Maatsen', 'LB', 23, 25, 79),
      createPlayer('Lucas Digne', 'LB', 32, 8, 72),
      createPlayer('Matty Cash', 'RB', 28, 22, 79),
      createPlayer('Andrés García', 'RB', 22, 7, 73),
      createPlayer('Amadou Onana', 'MCD', 24, 42, 82),
      createPlayer('Boubacar Kamara', 'MCD', 26, 40, 82),
      createPlayer('Lamare Bogarde', 'MCD', 22, 12, 76),
      createPlayer('Youri Tielemans', 'MC', 28, 35, 82),
      createPlayer('John McGinn', 'MC', 31, 15, 81),
      createPlayer('Ross Barkley', 'MC', 32, 5, 69),
      createPlayer('Morgan Rogers', 'MCO', 23, 70, 85),
      createPlayer('Harvey Elliott', 'MCO', 22, 30, 82),
      createPlayer('Emiliano Buendía', 'MCO', 29, 18, 76),
      createPlayer('Jadon Sancho', 'EI', 25, 20, 79),
      createPlayer('Evann Guessand', 'ED', 24, 28, 79),
      createPlayer('Leon Bailey', 'ED', 28, 18, 76),
      createPlayer('Ollie Watkins', 'DC', 30, 30, 82),
      createPlayer('Brian Madjo', 'DC', 17, 4, 72)
    ]
  },

  // ========== CRYSTAL PALACE ==========
  crystal_palace: {
    name: 'Crystal Palace', shortName: 'CRY', city: 'London',
    stadium: 'Selhurst Park', stadiumCapacity: 25486,
    budget: 70000000, reputation: 72, league: 'premier',
    colors: { primary: '#1B458F', secondary: '#C4122E' },
    players: [
      createPlayer('Dean Henderson', 'POR', 28, 28, 79),
      createPlayer('Walter Benítez', 'POR', 33, 5, 69),
      createPlayer('Maxence Lacroix', 'DFC', 25, 35, 82),
      createPlayer('Chris Richards', 'DFC', 25, 25, 79),
      createPlayer('Jaydee Canvot', 'DFC', 19, 20, 81),
      createPlayer('Chadi Riad', 'DFC', 22, 12, 76),
      createPlayer('Tyrick Mitchell', 'LB', 26, 25, 79),
      createPlayer('Borna Sosa', 'LB', 28, 4, 70),
      createPlayer('Daniel Muñoz', 'RB', 29, 27, 79),
      createPlayer('Nathaniel Clyne', 'RB', 34, 0.5, 61),
      createPlayer('Adam Wharton', 'MCD', 21, 60, 87),
      createPlayer('Cheick Doucouré', 'MCD', 26, 15, 76),
      createPlayer('Jefferson Lerma', 'MCD', 31, 8, 73),
      createPlayer('Will Hughes', 'MC', 30, 6, 70),
      createPlayer('Daichi Kamada', 'MCO', 29, 12, 76),
      createPlayer('Justin Devenny', 'MCO', 22, 8, 73),
      createPlayer('Ismaïla Sarr', 'ED', 27, 35, 82),
      createPlayer('Yéremy Pino', 'ED', 23, 35, 82),
      createPlayer('Brennan Johnson', 'ED', 24, 35, 82),
      createPlayer('Jesurun Rak-Sakyi', 'ED', 23, 6, 70),
      createPlayer('Jean-Philippe Mateta', 'DC', 28, 40, 82),
      createPlayer('Eddie Nketiah', 'DC', 26, 16, 76),
      createPlayer('Christantus Uche', 'DC', 22, 15, 76)
    ]
  },

  // ========== BRENTFORD ==========
  brentford: {
    name: 'Brentford FC', shortName: 'BRE', city: 'London',
    stadium: 'Gtech Community Stadium', stadiumCapacity: 17250,
    budget: 65000000, reputation: 72, league: 'premier',
    colors: { primary: '#E30613', secondary: '#FFB81C' },
    players: [
      createPlayer('Caoimhín Kelleher', 'POR', 27, 22, 79),
      createPlayer('Hákon Valdimarsson', 'POR', 24, 2.5, 67),
      createPlayer('Nathan Collins', 'DFC', 24, 35, 82),
      createPlayer('Sepp van den Berg', 'DFC', 24, 28, 79),
      createPlayer('Kristoffer Ajer', 'DFC', 27, 16, 76),
      createPlayer('Ethan Pinnock', 'DFC', 32, 4, 69),
      createPlayer('Rico Henry', 'LB', 28, 15, 76),
      createPlayer('Michael Kayode', 'RB', 21, 27, 81),
      createPlayer('Aaron Hickey', 'RB', 23, 16, 76),
      createPlayer('Vitaly Janelt', 'MCD', 27, 18, 76),
      createPlayer('Jordan Henderson', 'MCD', 35, 2, 64),
      createPlayer('Yegor Yarmolyuk', 'MC', 21, 25, 81),
      createPlayer('Mathias Jensen', 'MC', 30, 12, 76),
      createPlayer('Frank Onyeka', 'MC', 28, 7, 73),
      createPlayer('Keane Lewis-Potter', 'MI', 24, 22, 79),
      createPlayer('Mikkel Damsgaard', 'MCO', 25, 30, 82),
      createPlayer('Antoni Milambo', 'MCO', 20, 20, 81),
      createPlayer('Fábio Carvalho', 'MCO', 23, 12, 76),
      createPlayer('Kevin Schade', 'EI', 24, 35, 82),
      createPlayer('Reiss Nelson', 'EI', 26, 14, 76),
      createPlayer('Dango Ouattara', 'ED', 23, 35, 82),
      createPlayer('Igor Thiago', 'DC', 24, 35, 82),
      createPlayer('Kaye Furo', 'DC', 18, 2.5, 69)
    ]
  },

  // ========== BOURNEMOUTH ==========
  bournemouth: {
    name: 'AFC Bournemouth', shortName: 'BOU', city: 'Bournemouth',
    stadium: 'Vitality Stadium', stadiumCapacity: 11364,
    budget: 60000000, reputation: 70, league: 'premier',
    colors: { primary: '#DA291C', secondary: '#000000' },
    players: [
      createPlayer('Djordje Petrovic', 'POR', 26, 28, 79),
      createPlayer('Fraser Forster', 'POR', 37, 0.6, 60),
      createPlayer('Bafodé Diakité', 'DFC', 25, 35, 82),
      createPlayer('Marcos Senesi', 'DFC', 28, 22, 79),
      createPlayer('Veljko Milosavljevic', 'DFC', 18, 20, 81),
      createPlayer('James Hill', 'DFC', 24, 7, 73),
      createPlayer('Adrien Truffert', 'LB', 24, 20, 79),
      createPlayer('Julio Soler', 'LB', 20, 8, 75),
      createPlayer('Álex Jiménez', 'RB', 20, 18, 78),
      createPlayer('Adam Smith', 'RB', 34, 0.5, 61),
      createPlayer('Tyler Adams', 'MCD', 26, 25, 79),
      createPlayer('Alex Scott', 'MC', 22, 30, 82),
      createPlayer('Lewis Cook', 'MC', 28, 13, 76),
      createPlayer('Ryan Christie', 'MC', 30, 9, 73),
      createPlayer('Alex Tóth', 'MC', 20, 8, 75),
      createPlayer('Justin Kluivert', 'MCO', 26, 32, 82),
      createPlayer('Marcus Tavernier', 'MCO', 26, 20, 79),
      createPlayer('Amine Adli', 'EI', 25, 20, 79),
      createPlayer('Ben Gannon-Doak', 'ED', 20, 18, 78),
      createPlayer('David Brooks', 'ED', 28, 12, 76),
      createPlayer('Evanilson', 'DC', 26, 40, 82),
      createPlayer('Eli Kroupi', 'DC', 19, 22, 81),
      createPlayer('Enes Ünal', 'DC', 28, 8, 73)
    ]
  },

  // ========== EVERTON ==========
  everton: {
    name: 'Everton FC', shortName: 'EVE', city: 'Liverpool',
    stadium: 'Everton Stadium', stadiumCapacity: 52888,
    budget: 60000000, reputation: 72, league: 'premier',
    colors: { primary: '#003399', secondary: '#FFFFFF' },
    players: [
      createPlayer('Jordan Pickford', 'POR', 31, 15, 76),
      createPlayer('Mark Travers', 'POR', 26, 4, 70),
      createPlayer('Jarrad Branthwaite', 'DFC', 23, 45, 82),
      createPlayer('James Tarkowski', 'DFC', 33, 7, 72),
      createPlayer('Michael Keane', 'DFC', 33, 4, 69),
      createPlayer('Vitaliy Mykolenko', 'LB', 26, 25, 79),
      createPlayer('Adam Aznou', 'LB', 19, 7, 75),
      createPlayer('Jake O\'Brien', 'RB', 24, 16),
      createPlayer('Nathan Patterson', 'RB', 24, 10, 73),
      createPlayer('Séamus Coleman', 'RB', 37, 0.3, 60),
      createPlayer('James Garner', 'MCD', 24, 25, 79),
      createPlayer('Idrissa Gueye', 'MCD', 36, 1, 61),
      createPlayer('Kiernan Dewsbury-Hall', 'MC', 27, 28, 79),
      createPlayer('Carlos Alcaraz', 'MC', 23, 15, 76),
      createPlayer('Tim Iroegbunam', 'MC', 22, 12, 76),
      createPlayer('Merlin Röhl', 'MCO', 23, 16, 76),
      createPlayer('Jack Grealish', 'EI', 30, 25, 79),
      createPlayer('Dwight McNeil', 'EI', 26, 20, 79),
      createPlayer('Iliman Ndiaye', 'ED', 25, 45, 82),
      createPlayer('Tyler Dibling', 'ED', 19, 30, 84),
      createPlayer('Thierno Barry', 'DC', 23, 30, 82),
      createPlayer('Beto', 'DC', 27, 20, 79)
    ]
  },

  // ========== WEST HAM ==========
  west_ham: {
    name: 'West Ham United', shortName: 'WHU', city: 'London',
    stadium: 'London Stadium', stadiumCapacity: 62500,
    budget: 65000000, reputation: 72, league: 'premier',
    colors: { primary: '#7A263A', secondary: '#1BB1E7' },
    players: [
      createPlayer('Mads Hermansen', 'POR', 25, 15, 76),
      createPlayer('Alphonse Areola', 'POR', 32, 7, 72),
      createPlayer('Jean-Clair Todibo', 'DFC', 26, 23, 79),
      createPlayer('Maximilian Kilman', 'DFC', 28, 22, 79),
      createPlayer('Igor Julio', 'DFC', 27, 15, 76),
      createPlayer('Konstantinos Mavropanos', 'DFC', 28, 15, 76),
      createPlayer('El Hadji Malick Diouf', 'LB', 21, 28, 81),
      createPlayer('Oliver Scarles', 'LB', 20, 8, 75),
      createPlayer('Aaron Wan-Bissaka', 'RB', 28, 22, 79),
      createPlayer('Kyle Walker-Peters', 'RB', 28, 13, 76),
      createPlayer('Soungoutou Magassa', 'MCD', 22, 17, 76),
      createPlayer('Tomáš Souček', 'MCD', 30, 12, 76),
      createPlayer('Freddie Potts', 'MCD', 22, 8, 73),
      createPlayer('Mateus Fernandes', 'MC', 21, 32, 84),
      createPlayer('James Ward-Prowse', 'MC', 31, 6, 70),
      createPlayer('Lucas Paquetá', 'MCO', 28, 35, 82),
      createPlayer('Crysencio Summerville', 'EI', 24, 22, 79),
      createPlayer('Jarrod Bowen', 'ED', 29, 35, 82),
      createPlayer('Taty Castellanos', 'DC', 27, 25, 79),
      createPlayer('Callum Wilson', 'DC', 33, 5, 69),
      createPlayer('Pablo', 'DC', 22, 5, 70)
    ]
  },

  // ========== SUNDERLAND ==========
  sunderland: {
    name: 'Sunderland AFC', shortName: 'SUN', city: 'Sunderland',
    stadium: 'Stadium of Light', stadiumCapacity: 49000,
    budget: 50000000, reputation: 68, league: 'premier',
    colors: { primary: '#FF0000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Robin Roefs', 'POR', 23, 18, 76),
      createPlayer('Anthony Patterson', 'POR', 25, 10, 73),
      createPlayer('Dan Ballard', 'DFC', 26, 16, 76),
      createPlayer('Omar Alderete', 'DFC', 29, 12, 76),
      createPlayer('Luke O\'Nien', 'DFC', 31, 1.3),
      createPlayer('Aji Alese', 'DFC', 25, 1, 64),
      createPlayer('Dennis Cirkin', 'LB', 23, 8, 73),
      createPlayer('Reinildo Mandava', 'LB', 32, 5, 69),
      createPlayer('Arthur Masuaku', 'LB', 32, 2.5, 66),
      createPlayer('Lutsharel Geertruida', 'RB', 25, 20, 79),
      createPlayer('Trai Hume', 'RB', 23, 18, 76),
      createPlayer('Nordi Mukiele', 'RB', 28, 15, 76),
      createPlayer('Granit Xhaka', 'MCD', 33, 10, 72),
      createPlayer('Habib Diarra', 'MC', 22, 32, 82),
      createPlayer('Noah Sadiki', 'MC', 21, 25, 81),
      createPlayer('Enzo Le Fée', 'MC', 25, 20, 79),
      createPlayer('Dan Neil', 'MC', 24, 6.5, 70),
      createPlayer('Chris Rigg', 'MCO', 18, 25, 81),
      createPlayer('Simon Adingra', 'EI', 24, 22, 79),
      createPlayer('Romaine Mundle', 'EI', 22, 6, 70),
      createPlayer('Chemsdine Talbi', 'ED', 20, 22, 81),
      createPlayer('Bertrand Traoré', 'ED', 30, 5, 70),
      createPlayer('Brian Brobbey', 'DC', 23, 20, 79),
      createPlayer('Eliezer Mayenda', 'DC', 20, 18, 78),
      createPlayer('Wilson Isidor', 'DC', 25, 18, 76)
    ]
  },

  // ========== FULHAM ==========
  fulham: {
    name: 'Fulham FC', shortName: 'FUL', city: 'London',
    stadium: 'Craven Cottage', stadiumCapacity: 22384,
    budget: 55000000, reputation: 70, league: 'premier',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Bernd Leno', 'POR', 33, 8, 72),
      createPlayer('Benjamin Lecomte', 'POR', 34, 1.2, 63),
      createPlayer('Calvin Bassey', 'DFC', 26, 28, 79),
      createPlayer('Joachim Andersen', 'DFC', 29, 25, 79),
      createPlayer('Issa Diop', 'DFC', 29, 10, 73),
      createPlayer('Jorge Cuenca', 'DFC', 26, 4, 70),
      createPlayer('Antonee Robinson', 'LB', 28, 30, 82),
      createPlayer('Ryan Sessegnon', 'LB', 25, 20, 79),
      createPlayer('Kenny Tete', 'RB', 30, 11, 73),
      createPlayer('Timothy Castagne', 'RB', 30, 10, 73),
      createPlayer('Sander Berge', 'MCD', 27, 25, 79),
      createPlayer('Saša Lukić', 'MC', 29, 12, 76),
      createPlayer('Harrison Reed', 'MC', 31, 3, 67),
      createPlayer('Tom Cairney', 'MC', 35, 0.75, 60),
      createPlayer('Emile Smith Rowe', 'MCO', 25, 22, 79),
      createPlayer('Josh King', 'MCO', 19, 20, 81),
      createPlayer('Kevin', 'EI', 23, 30, 82),
      createPlayer('Alex Iwobi', 'EI', 29, 25, 79),
      createPlayer('Harry Wilson', 'ED', 28, 20, 79),
      createPlayer('Samuel Chukwueze', 'ED', 26, 10, 73),
      createPlayer('Adama Traoré', 'ED', 30, 8, 73),
      createPlayer('Rodrigo Muniz', 'DC', 24, 25, 79),
      createPlayer('Raúl Jiménez', 'DC', 34, 4, 69)
    ]
  },

  // ========== WOLVES ==========
  wolves: {
    name: 'Wolverhampton Wanderers', shortName: 'WOL', city: 'Wolverhampton',
    stadium: 'Molineux Stadium', stadiumCapacity: 31750,
    budget: 50000000, reputation: 68, league: 'premier',
    colors: { primary: '#FDB913', secondary: '#231F20' },
    players: [
      createPlayer('José Sá', 'POR', 33, 5, 69),
      createPlayer('Sam Johnstone', 'POR', 32, 5, 69),
      createPlayer('Toti', 'DFC', 27, 25, 79),
      createPlayer('Ladislav Krejci', 'DFC', 26, 22, 79),
      createPlayer('Emmanuel Agbadou', 'DFC', 28, 18, 76),
      createPlayer('Santiago Bueno', 'DFC', 27, 10, 73),
      createPlayer('Yerson Mosquera', 'DFC', 24, 10, 73),
      createPlayer('Hugo Bueno', 'LB', 23, 10, 73),
      createPlayer('David Møller Wolfe', 'LB', 23, 10, 73),
      createPlayer('Jackson Tchatchoua', 'RB', 24, 12, 76),
      createPlayer('Pedro Lima', 'RB', 19, 4, 72),
      createPlayer('Matt Doherty', 'RB', 34, 1.5, 63),
      createPlayer('André', 'MCD', 24, 28, 79),
      createPlayer('João Gomes', 'MC', 24, 40, 82),
      createPlayer('Jean-Ricner Bellegarde', 'MC', 27, 16, 76),
      createPlayer('Rodrigo Gomes', 'MI', 22, 15, 76),
      createPlayer('Enso González', 'EI', 21, 4, 72),
      createPlayer('Jhon Arias', 'ED', 28, 15, 76),
      createPlayer('Jørgen Strand Larsen', 'DC', 25, 40, 82),
      createPlayer('Tolu Arokodare', 'DC', 25, 22, 79),
      createPlayer('Hee-chan Hwang', 'DC', 30, 10, 73)
    ]
  },

  // ========== LEEDS UNITED ==========
  leeds: {
    name: 'Leeds United', shortName: 'LEE', city: 'Leeds',
    stadium: 'Elland Road', stadiumCapacity: 37890,
    budget: 55000000, reputation: 70, league: 'premier',
    colors: { primary: '#FFFFFF', secondary: '#1D428A' },
    players: [
      createPlayer('Lucas Perri', 'POR', 28, 16, 76),
      createPlayer('Illan Meslier', 'POR', 25, 12, 76),
      createPlayer('Karl Darlow', 'POR', 35, 0.2, 60),
      createPlayer('Pascal Struijk', 'DFC', 26, 20, 79),
      createPlayer('Jaka Bijol', 'DFC', 26, 18, 76),
      createPlayer('Joe Rodon', 'DFC', 28, 12, 76),
      createPlayer('Sebastiaan Bornauw', 'DFC', 26, 5, 70),
      createPlayer('Gabriel Gudmundsson', 'LB', 26, 15, 76),
      createPlayer('Sam Byram', 'LB', 32, 0.6, 61),
      createPlayer('James Justin', 'RB', 27, 12, 76),
      createPlayer('Jayden Bogle', 'RB', 25, 10, 73),
      createPlayer('Ethan Ampadu', 'MCD', 25, 20, 79),
      createPlayer('Anton Stach', 'MCD', 27, 20, 79),
      createPlayer('Ilia Gruev', 'MCD', 25, 9, 73),
      createPlayer('Sean Longstaff', 'MC', 28, 18, 76),
      createPlayer('Ao Tanaka', 'MC', 27, 10, 73),
      createPlayer('Facundo Buonanotte', 'MCO', 21, 18, 78),
      createPlayer('Brenden Aaronson', 'MCO', 25, 15, 76),
      createPlayer('Noah Okafor', 'EI', 25, 18, 76),
      createPlayer('Wilfried Gnonto', 'ED', 22, 20, 79),
      createPlayer('Daniel James', 'ED', 28, 14, 76),
      createPlayer('Dominic Calvert-Lewin', 'DC', 28, 15, 76),
      createPlayer('Joël Piroe', 'DC', 26, 15, 76),
      createPlayer('Lukas Nmecha', 'DC', 27, 8, 73)
    ]
  },

  // ========== BURNLEY ==========
  burnley: {
    name: 'Burnley FC', shortName: 'BUR', city: 'Burnley',
    stadium: 'Turf Moor', stadiumCapacity: 21944,
    budget: 40000000, reputation: 65, league: 'premier',
    colors: { primary: '#6C1D45', secondary: '#99D6EA' },
    players: [
      createPlayer('Max Weiß', 'POR', 21, 4, 72),
      createPlayer('Martin Dúbravka', 'POR', 37, 0.75, 60),
      createPlayer('Václav Hladký', 'POR', 35, 0.2, 60),
      createPlayer('Maxime Estève', 'DFC', 23, 25, 79),
      createPlayer('Bashir Humphreys', 'DFC', 22, 12, 76),
      createPlayer('Hjalmar Ekdal', 'DFC', 27, 6, 70),
      createPlayer('Axel Tuanzebe', 'DFC', 28, 5, 70),
      createPlayer('Joe Worrall', 'DFC', 29, 4, 70),
      createPlayer('Jordan Beyer', 'DFC', 25, 4, 70),
      createPlayer('Quilindschy Hartman', 'LB', 24, 18, 76),
      createPlayer('Lucas Pires', 'LB', 24, 5, 70),
      createPlayer('Oliver Sonne', 'RB', 25, 4, 70),
      createPlayer('Connor Roberts', 'RB', 30, 3, 67),
      createPlayer('Kyle Walker', 'RB', 35, 2.5, 64),
      createPlayer('Lesley Ugochukwu', 'MCD', 21, 25, 81),
      createPlayer('Florentino', 'MCD', 26, 22, 79),
      createPlayer('Josh Cullen', 'MC', 29, 7, 73),
      createPlayer('Josh Laurent', 'MC', 30, 2, 67),
      createPlayer('Hannibal', 'MCO', 23, 14, 76),
      createPlayer('Mike Tresor', 'MCO', 26, 4, 70),
      createPlayer('Jaidon Anthony', 'EI', 26, 15, 76),
      createPlayer('Jacob Bruun Larsen', 'EI', 27, 5, 70),
      createPlayer('Loum Tchaouna', 'ED', 22, 15, 76),
      createPlayer('Marcus Edwards', 'ED', 27, 8, 73),
      createPlayer('Lyle Foster', 'DC', 25, 10, 73),
      createPlayer('Zian Flemming', 'DC', 27, 10, 73),
      createPlayer('Armando Broja', 'DC', 24, 10, 73),
      createPlayer('Zeki Amdouni', 'DC', 25, 9, 73)
    ]
  }
};

export const premierTeamsArray = Object.entries(premierTeams).map(([id, team]) => ({
  id,
  ...team
}));

export default premierTeams;
