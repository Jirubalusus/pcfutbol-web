// ============================================================
// PC FÚTBOL WEB - PREMIER LEAGUE 25/26
// Datos reales de Transfermarkt (enero 2026)
// ============================================================

function calcOverall(valueM, age) {
  let ovr;
  if (valueM >= 100) ovr = 92;
  else if (valueM >= 75) ovr = 90;
  else if (valueM >= 60) ovr = 88;
  else if (valueM >= 45) ovr = 86;
  else if (valueM >= 35) ovr = 84;
  else if (valueM >= 25) ovr = 82;
  else if (valueM >= 18) ovr = 80;
  else if (valueM >= 12) ovr = 78;
  else if (valueM >= 8) ovr = 76;
  else if (valueM >= 5) ovr = 74;
  else if (valueM >= 3) ovr = 72;
  else if (valueM >= 1.5) ovr = 70;
  else if (valueM >= 0.8) ovr = 68;
  else ovr = 65;
  if (age <= 21) ovr += 1;
  else if (age >= 34) ovr -= 2;
  else if (age >= 32) ovr -= 1;
  return Math.max(60, Math.min(94, ovr));
}

function calcSalary(valueM) {
  const annual = valueM * 1000000 * 0.12;
  const weekly = annual / 52;
  return Math.max(15000, Math.round(weekly));
}

function createPlayer(name, position, age, valueM) {
  return {
    name, position, age,
    overall: calcOverall(valueM, age),
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
      createPlayer('Gianluigi Donnarumma', 'POR', 26, 45),
      createPlayer('James Trafford', 'POR', 23, 25),
      createPlayer('Stefan Ortega', 'POR', 33, 5),
      createPlayer('Josko Gvardiol', 'DFC', 24, 70),
      createPlayer('Rúben Dias', 'DFC', 28, 60),
      createPlayer('Marc Guéhi', 'DFC', 25, 55),
      createPlayer('Abdukodir Khusanov', 'DFC', 21, 35),
      createPlayer('John Stones', 'DFC', 31, 18),
      createPlayer('Nathan Aké', 'DFC', 30, 18),
      createPlayer('Rayan Aït-Nouri', 'LTI', 24, 40),
      createPlayer('Nico O\'Reilly', 'LTI', 20, 40),
      createPlayer('Matheus Nunes', 'LTD', 27, 38),
      createPlayer('Rico Lewis', 'LTD', 21, 35),
      createPlayer('Rodri', 'MCD', 29, 75),
      createPlayer('Nico González', 'MCD', 24, 45),
      createPlayer('Kalvin Phillips', 'MCD', 30, 6),
      createPlayer('Tijjani Reijnders', 'MC', 27, 65),
      createPlayer('Mateo Kovacic', 'MC', 31, 15),
      createPlayer('Phil Foden', 'MCO', 25, 80),
      createPlayer('Rayan Cherki', 'MCO', 22, 50),
      createPlayer('Bernardo Silva', 'MCO', 31, 27),
      createPlayer('Jérémy Doku', 'EI', 23, 65),
      createPlayer('Savinho', 'EI', 21, 45),
      createPlayer('Antoine Semenyo', 'ED', 26, 65),
      createPlayer('Oscar Bobb', 'ED', 22, 25),
      createPlayer('Erling Haaland', 'DC', 25, 200),
      createPlayer('Omar Marmoush', 'DC', 26, 65)
    ]
  },

  // ========== ARSENAL ==========
  arsenal: {
    name: 'Arsenal FC', shortName: 'ARS', city: 'London',
    stadium: 'Emirates Stadium', stadiumCapacity: 60704,
    budget: 200000000, reputation: 92, league: 'premier',
    colors: { primary: '#EF0107', secondary: '#FFFFFF' },
    players: [
      createPlayer('David Raya', 'POR', 30, 35),
      createPlayer('Kepa Arrizabalaga', 'POR', 31, 7),
      createPlayer('William Saliba', 'DFC', 24, 90),
      createPlayer('Gabriel Magalhães', 'DFC', 28, 75),
      createPlayer('Piero Hincapié', 'DFC', 24, 50),
      createPlayer('Cristhian Mosquera', 'DFC', 21, 35),
      createPlayer('Riccardo Calafiori', 'LTI', 23, 50),
      createPlayer('Myles Lewis-Skelly', 'LTI', 19, 40),
      createPlayer('Jurriën Timber', 'LTD', 24, 70),
      createPlayer('Ben White', 'LTD', 28, 30),
      createPlayer('Martín Zubimendi', 'MCD', 26, 75),
      createPlayer('Christian Nørgaard', 'MCD', 31, 9),
      createPlayer('Declan Rice', 'MC', 27, 120),
      createPlayer('Mikel Merino', 'MC', 29, 30),
      createPlayer('Martin Ødegaard', 'MCO', 27, 75),
      createPlayer('Eberechi Eze', 'MCO', 27, 65),
      createPlayer('Gabriel Martinelli', 'EI', 24, 45),
      createPlayer('Leandro Trossard', 'EI', 31, 20),
      createPlayer('Bukayo Saka', 'ED', 24, 130),
      createPlayer('Noni Madueke', 'ED', 23, 50),
      createPlayer('Max Dowman', 'ED', 16, 20),
      createPlayer('Viktor Gyökeres', 'DC', 27, 70),
      createPlayer('Kai Havertz', 'DC', 26, 55),
      createPlayer('Gabriel Jesus', 'DC', 28, 20)
    ]
  },

  // ========== CHELSEA ==========
  chelsea: {
    name: 'Chelsea FC', shortName: 'CHE', city: 'London',
    stadium: 'Stamford Bridge', stadiumCapacity: 40343,
    budget: 180000000, reputation: 90, league: 'premier',
    colors: { primary: '#034694', secondary: '#FFFFFF' },
    players: [
      createPlayer('Robert Sánchez', 'POR', 28, 22),
      createPlayer('Filip Jørgensen', 'POR', 23, 15),
      createPlayer('Gabriel Slonina', 'POR', 21, 3.5),
      createPlayer('Levi Colwill', 'DFC', 22, 50),
      createPlayer('Trevoh Chalobah', 'DFC', 26, 35),
      createPlayer('Wesley Fofana', 'DFC', 25, 28),
      createPlayer('Tosin Adarabioyo', 'DFC', 28, 20),
      createPlayer('Benoît Badiashile', 'DFC', 24, 18),
      createPlayer('Axel Disasi', 'DFC', 27, 15),
      createPlayer('Marc Cucurella', 'LTI', 27, 50),
      createPlayer('Jorrel Hato', 'LTI', 19, 35),
      createPlayer('Reece James', 'LTD', 26, 50),
      createPlayer('Malo Gusto', 'LTD', 22, 35),
      createPlayer('Josh Acheampong', 'LTD', 19, 20),
      createPlayer('Moisés Caicedo', 'MCD', 24, 110),
      createPlayer('Roméo Lavia', 'MCD', 22, 30),
      createPlayer('Dário Essugo', 'MCD', 20, 20),
      createPlayer('Enzo Fernández', 'MC', 25, 85),
      createPlayer('Andrey Santos', 'MC', 21, 40),
      createPlayer('Cole Palmer', 'MCO', 23, 120),
      createPlayer('Alejandro Garnacho', 'EI', 21, 45),
      createPlayer('Jamie Gittens', 'EI', 21, 40),
      createPlayer('Estêvão', 'ED', 18, 80),
      createPlayer('Pedro Neto', 'ED', 25, 60),
      createPlayer('João Pedro', 'DC', 24, 65),
      createPlayer('Liam Delap', 'DC', 22, 35),
      createPlayer('Marc Guiu', 'DC', 20, 12)
    ]
  },

  // ========== LIVERPOOL ==========
  liverpool: {
    name: 'Liverpool FC', shortName: 'LIV', city: 'Liverpool',
    stadium: 'Anfield', stadiumCapacity: 61276,
    budget: 180000000, reputation: 92, league: 'premier',
    colors: { primary: '#C8102E', secondary: '#FFFFFF' },
    players: [
      createPlayer('Giorgi Mamardashvili', 'POR', 25, 28),
      createPlayer('Alisson', 'POR', 33, 17),
      createPlayer('Ibrahima Konaté', 'DFC', 26, 50),
      createPlayer('Giovanni Leoni', 'DFC', 19, 25),
      createPlayer('Virgil van Dijk', 'DFC', 34, 18),
      createPlayer('Joe Gomez', 'DFC', 28, 15),
      createPlayer('Milos Kerkez', 'LTI', 22, 40),
      createPlayer('Andrew Robertson', 'LTI', 31, 12),
      createPlayer('Jeremie Frimpong', 'LTD', 25, 38),
      createPlayer('Conor Bradley', 'LTD', 22, 30),
      createPlayer('Ryan Gravenberch', 'MCD', 23, 90),
      createPlayer('Stefan Bajcetic', 'MCD', 21, 7),
      createPlayer('Wataru Endo', 'MCD', 32, 5),
      createPlayer('Alexis Mac Allister', 'MC', 27, 85),
      createPlayer('Curtis Jones', 'MC', 24, 40),
      createPlayer('Trey Nyoni', 'MC', 18, 6),
      createPlayer('Florian Wirtz', 'MCO', 22, 110),
      createPlayer('Dominik Szoboszlai', 'MCO', 25, 85),
      createPlayer('Cody Gakpo', 'EI', 26, 70),
      createPlayer('Rio Ngumoha', 'EI', 17, 15),
      createPlayer('Mohamed Salah', 'ED', 33, 30),
      createPlayer('Federico Chiesa', 'ED', 28, 18),
      createPlayer('Alexander Isak', 'DC', 26, 120),
      createPlayer('Hugo Ekitiké', 'DC', 23, 85)
    ]
  },

  // ========== TOTTENHAM ==========
  tottenham: {
    name: 'Tottenham Hotspur', shortName: 'TOT', city: 'London',
    stadium: 'Tottenham Hotspur Stadium', stadiumCapacity: 62850,
    budget: 150000000, reputation: 85, league: 'premier',
    colors: { primary: '#132257', secondary: '#FFFFFF' },
    players: [
      createPlayer('Guglielmo Vicario', 'POR', 29, 30),
      createPlayer('Antonín Kinský', 'POR', 22, 13),
      createPlayer('Micky van de Ven', 'DFC', 24, 65),
      createPlayer('Cristian Romero', 'DFC', 27, 60),
      createPlayer('Radu Drăgușin', 'DFC', 23, 22),
      createPlayer('Kevin Danso', 'DFC', 27, 22),
      createPlayer('Ben Davies', 'DFC', 32, 5),
      createPlayer('Destiny Udogie', 'LTI', 23, 40),
      createPlayer('Djed Spence', 'LTI', 25, 32),
      createPlayer('Pedro Porro', 'LTD', 26, 40),
      createPlayer('João Palhinha', 'MCD', 30, 25),
      createPlayer('Yves Bissouma', 'MCD', 29, 15),
      createPlayer('Lucas Bergvall', 'MC', 19, 40),
      createPlayer('Archie Gray', 'MC', 19, 35),
      createPlayer('Conor Gallagher', 'MC', 25, 35),
      createPlayer('Pape Matar Sarr', 'MC', 23, 35),
      createPlayer('Rodrigo Bentancur', 'MC', 28, 27),
      createPlayer('Xavi Simons', 'MCO', 22, 60),
      createPlayer('Dejan Kulusevski', 'MCO', 25, 45),
      createPlayer('James Maddison', 'MCO', 29, 30),
      createPlayer('Wilson Odobert', 'EI', 21, 22),
      createPlayer('Mohammed Kudus', 'ED', 25, 55),
      createPlayer('Dominic Solanke', 'DC', 28, 35),
      createPlayer('Mathys Tel', 'DC', 20, 30),
      createPlayer('Richarlison', 'DC', 28, 28),
      createPlayer('Randal Kolo Muani', 'DC', 27, 25)
    ]
  },

  // ========== MANCHESTER UNITED ==========
  manchester_united: {
    name: 'Manchester United', shortName: 'MUN', city: 'Manchester',
    stadium: 'Old Trafford', stadiumCapacity: 74310,
    budget: 160000000, reputation: 88, league: 'premier',
    colors: { primary: '#DA291C', secondary: '#FFFFFF' },
    players: [
      createPlayer('Senne Lammens', 'POR', 23, 25),
      createPlayer('Altay Bayındır', 'POR', 27, 7),
      createPlayer('Leny Yoro', 'DFC', 20, 55),
      createPlayer('Matthijs de Ligt', 'DFC', 26, 40),
      createPlayer('Lisandro Martínez', 'DFC', 28, 35),
      createPlayer('Harry Maguire', 'DFC', 32, 10),
      createPlayer('Ayden Heaven', 'DFC', 19, 10),
      createPlayer('Patrick Dorgu', 'LTI', 21, 30),
      createPlayer('Luke Shaw', 'LTI', 30, 10),
      createPlayer('Tyrell Malacia', 'LTI', 26, 5),
      createPlayer('Diogo Dalot', 'LTD', 26, 28),
      createPlayer('Noussair Mazraoui', 'LTD', 28, 22),
      createPlayer('Manuel Ugarte', 'MCD', 24, 30),
      createPlayer('Casemiro', 'MCD', 33, 8),
      createPlayer('Kobbie Mainoo', 'MC', 20, 40),
      createPlayer('Bruno Fernandes', 'MCO', 31, 40),
      createPlayer('Mason Mount', 'MCO', 27, 32),
      createPlayer('Bryan Mbeumo', 'ED', 26, 75),
      createPlayer('Amad Diallo', 'ED', 23, 50),
      createPlayer('Matheus Cunha', 'DC', 26, 70),
      createPlayer('Benjamin Sesko', 'DC', 22, 60),
      createPlayer('Joshua Zirkzee', 'DC', 24, 25)
    ]
  },

  // ========== NEWCASTLE ==========
  newcastle: {
    name: 'Newcastle United', shortName: 'NEW', city: 'Newcastle',
    stadium: 'St. James\' Park', stadiumCapacity: 52305,
    budget: 120000000, reputation: 82, league: 'premier',
    colors: { primary: '#241F20', secondary: '#FFFFFF' },
    players: [
      createPlayer('Aaron Ramsdale', 'POR', 27, 12),
      createPlayer('Nick Pope', 'POR', 33, 7),
      createPlayer('Malick Thiaw', 'DFC', 24, 40),
      createPlayer('Sven Botman', 'DFC', 26, 35),
      createPlayer('Fabian Schär', 'DFC', 34, 6),
      createPlayer('Dan Burn', 'DFC', 33, 5),
      createPlayer('Lewis Hall', 'LTI', 21, 32),
      createPlayer('Tino Livramento', 'LTD', 23, 40),
      createPlayer('Kieran Trippier', 'LTD', 35, 2.5),
      createPlayer('Sandro Tonali', 'MCD', 25, 75),
      createPlayer('Bruno Guimarães', 'MC', 28, 75),
      createPlayer('Jacob Ramsey', 'MC', 24, 35),
      createPlayer('Joelinton', 'MC', 29, 30),
      createPlayer('Lewis Miley', 'MC', 19, 20),
      createPlayer('Joe Willock', 'MC', 26, 16),
      createPlayer('Anthony Gordon', 'EI', 24, 60),
      createPlayer('Harvey Barnes', 'EI', 28, 32),
      createPlayer('Anthony Elanga', 'ED', 23, 50),
      createPlayer('Jacob Murphy', 'ED', 30, 15),
      createPlayer('Nick Woltemade', 'DC', 23, 70),
      createPlayer('Yoane Wissa', 'DC', 29, 35),
      createPlayer('William Osula', 'DC', 22, 15)
    ]
  },

  // ========== NOTTINGHAM FOREST ==========
  nottingham_forest: {
    name: 'Nottingham Forest', shortName: 'NFO', city: 'Nottingham',
    stadium: 'City Ground', stadiumCapacity: 30445,
    budget: 90000000, reputation: 75, league: 'premier',
    colors: { primary: '#DD0000', secondary: '#FFFFFF' },
    players: [
      createPlayer('John Victor', 'POR', 29, 7),
      createPlayer('Matz Sels', 'POR', 33, 6),
      createPlayer('Murillo', 'DFC', 23, 55),
      createPlayer('Nikola Milenković', 'DFC', 28, 30),
      createPlayer('Morato', 'DFC', 24, 14),
      createPlayer('Jair Cunha', 'DFC', 20, 12),
      createPlayer('Neco Williams', 'LTI', 24, 25),
      createPlayer('Oleksandr Zinchenko', 'LTI', 29, 15),
      createPlayer('Ola Aina', 'LTD', 29, 20),
      createPlayer('Nicolò Savona', 'LTD', 22, 15),
      createPlayer('Ibrahim Sangaré', 'MCD', 28, 22),
      createPlayer('Elliot Anderson', 'MC', 23, 60),
      createPlayer('Douglas Luiz', 'MC', 27, 25),
      createPlayer('Nicolás Domínguez', 'MC', 27, 16),
      createPlayer('Ryan Yates', 'MC', 28, 10),
      createPlayer('Morgan Gibbs-White', 'MCO', 26, 65),
      createPlayer('Omari Hutchinson', 'MCO', 22, 30),
      createPlayer('James McAtee', 'MCO', 23, 23),
      createPlayer('Callum Hudson-Odoi', 'EI', 25, 30),
      createPlayer('Dan Ndoye', 'ED', 25, 40),
      createPlayer('Dilane Bakwa', 'ED', 23, 32),
      createPlayer('Lorenzo Lucca', 'DC', 25, 25),
      createPlayer('Igor Jesus', 'DC', 24, 20),
      createPlayer('Taiwo Awoniyi', 'DC', 28, 12),
      createPlayer('Chris Wood', 'DC', 34, 8)
    ]
  },

  // ========== BRIGHTON ==========
  brighton: {
    name: 'Brighton & Hove Albion', shortName: 'BHA', city: 'Brighton',
    stadium: 'Amex Stadium', stadiumCapacity: 31800,
    budget: 80000000, reputation: 75, league: 'premier',
    colors: { primary: '#0057B8', secondary: '#FFFFFF' },
    players: [
      createPlayer('Bart Verbruggen', 'POR', 23, 35),
      createPlayer('Jason Steele', 'POR', 35, 0.75),
      createPlayer('Jan Paul van Hecke', 'DFC', 25, 35),
      createPlayer('Olivier Boscagli', 'DFC', 28, 18),
      createPlayer('Diego Coppola', 'DFC', 22, 10),
      createPlayer('Adam Webster', 'DFC', 31, 7),
      createPlayer('Lewis Dunk', 'DFC', 34, 4),
      createPlayer('Ferdi Kadıoğlu', 'LTI', 26, 28),
      createPlayer('Maxim De Cuyper', 'LTI', 25, 22),
      createPlayer('Joël Veltman', 'LTD', 34, 2.5),
      createPlayer('Carlos Baleba', 'MCD', 22, 60),
      createPlayer('Mats Wieffer', 'MCD', 26, 25),
      createPlayer('Jack Hinshelwood', 'MCD', 20, 22),
      createPlayer('Yasin Ayari', 'MC', 22, 30),
      createPlayer('Diego Gómez', 'MC', 22, 25),
      createPlayer('Pascal Groß', 'MC', 34, 3.5),
      createPlayer('James Milner', 'MC', 40, 0.75),
      createPlayer('Kaoru Mitoma', 'EI', 28, 30),
      createPlayer('Tom Watson', 'EI', 19, 10),
      createPlayer('Yankuba Minteh', 'ED', 21, 40),
      createPlayer('Brajan Gruda', 'ED', 21, 28),
      createPlayer('Solly March', 'ED', 31, 3),
      createPlayer('Georginio Rutter', 'DC', 23, 32),
      createPlayer('Charalampos Kostoulas', 'DC', 18, 25),
      createPlayer('Stefanos Tzimas', 'DC', 20, 22),
      createPlayer('Danny Welbeck', 'DC', 35, 4)
    ]
  },

  // ========== ASTON VILLA ==========
  aston_villa: {
    name: 'Aston Villa', shortName: 'AVL', city: 'Birmingham',
    stadium: 'Villa Park', stadiumCapacity: 42682,
    budget: 100000000, reputation: 78, league: 'premier',
    colors: { primary: '#670E36', secondary: '#95BFE5' },
    players: [
      createPlayer('Emiliano Martínez', 'POR', 33, 15),
      createPlayer('Marco Bizot', 'POR', 34, 2.5),
      createPlayer('Ezri Konsa', 'DFC', 28, 35),
      createPlayer('Pau Torres', 'DFC', 29, 25),
      createPlayer('Victor Lindelöf', 'DFC', 31, 6),
      createPlayer('Tyrone Mings', 'DFC', 32, 4),
      createPlayer('Ian Maatsen', 'LTI', 23, 25),
      createPlayer('Lucas Digne', 'LTI', 32, 8),
      createPlayer('Matty Cash', 'LTD', 28, 22),
      createPlayer('Andrés García', 'LTD', 22, 7),
      createPlayer('Amadou Onana', 'MCD', 24, 42),
      createPlayer('Boubacar Kamara', 'MCD', 26, 40),
      createPlayer('Lamare Bogarde', 'MCD', 22, 12),
      createPlayer('Youri Tielemans', 'MC', 28, 35),
      createPlayer('John McGinn', 'MC', 31, 15),
      createPlayer('Ross Barkley', 'MC', 32, 5),
      createPlayer('Morgan Rogers', 'MCO', 23, 70),
      createPlayer('Harvey Elliott', 'MCO', 22, 30),
      createPlayer('Emiliano Buendía', 'MCO', 29, 18),
      createPlayer('Jadon Sancho', 'EI', 25, 20),
      createPlayer('Evann Guessand', 'ED', 24, 28),
      createPlayer('Leon Bailey', 'ED', 28, 18),
      createPlayer('Ollie Watkins', 'DC', 30, 30),
      createPlayer('Brian Madjo', 'DC', 17, 4)
    ]
  },

  // ========== CRYSTAL PALACE ==========
  crystal_palace: {
    name: 'Crystal Palace', shortName: 'CRY', city: 'London',
    stadium: 'Selhurst Park', stadiumCapacity: 25486,
    budget: 70000000, reputation: 72, league: 'premier',
    colors: { primary: '#1B458F', secondary: '#C4122E' },
    players: [
      createPlayer('Dean Henderson', 'POR', 28, 28),
      createPlayer('Walter Benítez', 'POR', 33, 5),
      createPlayer('Maxence Lacroix', 'DFC', 25, 35),
      createPlayer('Chris Richards', 'DFC', 25, 25),
      createPlayer('Jaydee Canvot', 'DFC', 19, 20),
      createPlayer('Chadi Riad', 'DFC', 22, 12),
      createPlayer('Tyrick Mitchell', 'LTI', 26, 25),
      createPlayer('Borna Sosa', 'LTI', 28, 4),
      createPlayer('Daniel Muñoz', 'LTD', 29, 27),
      createPlayer('Nathaniel Clyne', 'LTD', 34, 0.5),
      createPlayer('Adam Wharton', 'MCD', 21, 60),
      createPlayer('Cheick Doucouré', 'MCD', 26, 15),
      createPlayer('Jefferson Lerma', 'MCD', 31, 8),
      createPlayer('Will Hughes', 'MC', 30, 6),
      createPlayer('Daichi Kamada', 'MCO', 29, 12),
      createPlayer('Justin Devenny', 'MCO', 22, 8),
      createPlayer('Ismaïla Sarr', 'ED', 27, 35),
      createPlayer('Yéremy Pino', 'ED', 23, 35),
      createPlayer('Brennan Johnson', 'ED', 24, 35),
      createPlayer('Jesurun Rak-Sakyi', 'ED', 23, 6),
      createPlayer('Jean-Philippe Mateta', 'DC', 28, 40),
      createPlayer('Eddie Nketiah', 'DC', 26, 16),
      createPlayer('Christantus Uche', 'DC', 22, 15)
    ]
  },

  // ========== BRENTFORD ==========
  brentford: {
    name: 'Brentford FC', shortName: 'BRE', city: 'London',
    stadium: 'Gtech Community Stadium', stadiumCapacity: 17250,
    budget: 65000000, reputation: 72, league: 'premier',
    colors: { primary: '#E30613', secondary: '#FFB81C' },
    players: [
      createPlayer('Caoimhín Kelleher', 'POR', 27, 22),
      createPlayer('Hákon Valdimarsson', 'POR', 24, 2.5),
      createPlayer('Nathan Collins', 'DFC', 24, 35),
      createPlayer('Sepp van den Berg', 'DFC', 24, 28),
      createPlayer('Kristoffer Ajer', 'DFC', 27, 16),
      createPlayer('Ethan Pinnock', 'DFC', 32, 4),
      createPlayer('Rico Henry', 'LTI', 28, 15),
      createPlayer('Michael Kayode', 'LTD', 21, 27),
      createPlayer('Aaron Hickey', 'LTD', 23, 16),
      createPlayer('Vitaly Janelt', 'MCD', 27, 18),
      createPlayer('Jordan Henderson', 'MCD', 35, 2),
      createPlayer('Yegor Yarmolyuk', 'MC', 21, 25),
      createPlayer('Mathias Jensen', 'MC', 30, 12),
      createPlayer('Frank Onyeka', 'MC', 28, 7),
      createPlayer('Keane Lewis-Potter', 'MI', 24, 22),
      createPlayer('Mikkel Damsgaard', 'MCO', 25, 30),
      createPlayer('Antoni Milambo', 'MCO', 20, 20),
      createPlayer('Fábio Carvalho', 'MCO', 23, 12),
      createPlayer('Kevin Schade', 'EI', 24, 35),
      createPlayer('Reiss Nelson', 'EI', 26, 14),
      createPlayer('Dango Ouattara', 'ED', 23, 35),
      createPlayer('Igor Thiago', 'DC', 24, 35),
      createPlayer('Kaye Furo', 'DC', 18, 2.5)
    ]
  },

  // ========== BOURNEMOUTH ==========
  bournemouth: {
    name: 'AFC Bournemouth', shortName: 'BOU', city: 'Bournemouth',
    stadium: 'Vitality Stadium', stadiumCapacity: 11364,
    budget: 60000000, reputation: 70, league: 'premier',
    colors: { primary: '#DA291C', secondary: '#000000' },
    players: [
      createPlayer('Djordje Petrovic', 'POR', 26, 28),
      createPlayer('Fraser Forster', 'POR', 37, 0.6),
      createPlayer('Bafodé Diakité', 'DFC', 25, 35),
      createPlayer('Marcos Senesi', 'DFC', 28, 22),
      createPlayer('Veljko Milosavljevic', 'DFC', 18, 20),
      createPlayer('James Hill', 'DFC', 24, 7),
      createPlayer('Adrien Truffert', 'LTI', 24, 20),
      createPlayer('Julio Soler', 'LTI', 20, 8),
      createPlayer('Álex Jiménez', 'LTD', 20, 18),
      createPlayer('Adam Smith', 'LTD', 34, 0.5),
      createPlayer('Tyler Adams', 'MCD', 26, 25),
      createPlayer('Alex Scott', 'MC', 22, 30),
      createPlayer('Lewis Cook', 'MC', 28, 13),
      createPlayer('Ryan Christie', 'MC', 30, 9),
      createPlayer('Alex Tóth', 'MC', 20, 8),
      createPlayer('Justin Kluivert', 'MCO', 26, 32),
      createPlayer('Marcus Tavernier', 'MCO', 26, 20),
      createPlayer('Amine Adli', 'EI', 25, 20),
      createPlayer('Ben Gannon-Doak', 'ED', 20, 18),
      createPlayer('David Brooks', 'ED', 28, 12),
      createPlayer('Evanilson', 'DC', 26, 40),
      createPlayer('Eli Kroupi', 'DC', 19, 22),
      createPlayer('Enes Ünal', 'DC', 28, 8)
    ]
  },

  // ========== EVERTON ==========
  everton: {
    name: 'Everton FC', shortName: 'EVE', city: 'Liverpool',
    stadium: 'Everton Stadium', stadiumCapacity: 52888,
    budget: 60000000, reputation: 72, league: 'premier',
    colors: { primary: '#003399', secondary: '#FFFFFF' },
    players: [
      createPlayer('Jordan Pickford', 'POR', 31, 15),
      createPlayer('Mark Travers', 'POR', 26, 4),
      createPlayer('Jarrad Branthwaite', 'DFC', 23, 45),
      createPlayer('James Tarkowski', 'DFC', 33, 7),
      createPlayer('Michael Keane', 'DFC', 33, 4),
      createPlayer('Vitaliy Mykolenko', 'LTI', 26, 25),
      createPlayer('Adam Aznou', 'LTI', 19, 7),
      createPlayer('Jake O\'Brien', 'LTD', 24, 16),
      createPlayer('Nathan Patterson', 'LTD', 24, 10),
      createPlayer('Séamus Coleman', 'LTD', 37, 0.3),
      createPlayer('James Garner', 'MCD', 24, 25),
      createPlayer('Idrissa Gueye', 'MCD', 36, 1),
      createPlayer('Kiernan Dewsbury-Hall', 'MC', 27, 28),
      createPlayer('Carlos Alcaraz', 'MC', 23, 15),
      createPlayer('Tim Iroegbunam', 'MC', 22, 12),
      createPlayer('Merlin Röhl', 'MCO', 23, 16),
      createPlayer('Jack Grealish', 'EI', 30, 25),
      createPlayer('Dwight McNeil', 'EI', 26, 20),
      createPlayer('Iliman Ndiaye', 'ED', 25, 45),
      createPlayer('Tyler Dibling', 'ED', 19, 30),
      createPlayer('Thierno Barry', 'DC', 23, 30),
      createPlayer('Beto', 'DC', 27, 20)
    ]
  },

  // ========== WEST HAM ==========
  west_ham: {
    name: 'West Ham United', shortName: 'WHU', city: 'London',
    stadium: 'London Stadium', stadiumCapacity: 62500,
    budget: 65000000, reputation: 72, league: 'premier',
    colors: { primary: '#7A263A', secondary: '#1BB1E7' },
    players: [
      createPlayer('Mads Hermansen', 'POR', 25, 15),
      createPlayer('Alphonse Areola', 'POR', 32, 7),
      createPlayer('Jean-Clair Todibo', 'DFC', 26, 23),
      createPlayer('Maximilian Kilman', 'DFC', 28, 22),
      createPlayer('Igor Julio', 'DFC', 27, 15),
      createPlayer('Konstantinos Mavropanos', 'DFC', 28, 15),
      createPlayer('El Hadji Malick Diouf', 'LTI', 21, 28),
      createPlayer('Oliver Scarles', 'LTI', 20, 8),
      createPlayer('Aaron Wan-Bissaka', 'LTD', 28, 22),
      createPlayer('Kyle Walker-Peters', 'LTD', 28, 13),
      createPlayer('Soungoutou Magassa', 'MCD', 22, 17),
      createPlayer('Tomáš Souček', 'MCD', 30, 12),
      createPlayer('Freddie Potts', 'MCD', 22, 8),
      createPlayer('Mateus Fernandes', 'MC', 21, 32),
      createPlayer('James Ward-Prowse', 'MC', 31, 6),
      createPlayer('Lucas Paquetá', 'MCO', 28, 35),
      createPlayer('Crysencio Summerville', 'EI', 24, 22),
      createPlayer('Jarrod Bowen', 'ED', 29, 35),
      createPlayer('Taty Castellanos', 'DC', 27, 25),
      createPlayer('Callum Wilson', 'DC', 33, 5),
      createPlayer('Pablo', 'DC', 22, 5)
    ]
  },

  // ========== SUNDERLAND ==========
  sunderland: {
    name: 'Sunderland AFC', shortName: 'SUN', city: 'Sunderland',
    stadium: 'Stadium of Light', stadiumCapacity: 49000,
    budget: 50000000, reputation: 68, league: 'premier',
    colors: { primary: '#FF0000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Robin Roefs', 'POR', 23, 18),
      createPlayer('Anthony Patterson', 'POR', 25, 10),
      createPlayer('Dan Ballard', 'DFC', 26, 16),
      createPlayer('Omar Alderete', 'DFC', 29, 12),
      createPlayer('Luke O\'Nien', 'DFC', 31, 1.3),
      createPlayer('Aji Alese', 'DFC', 25, 1),
      createPlayer('Dennis Cirkin', 'LTI', 23, 8),
      createPlayer('Reinildo Mandava', 'LTI', 32, 5),
      createPlayer('Arthur Masuaku', 'LTI', 32, 2.5),
      createPlayer('Lutsharel Geertruida', 'LTD', 25, 20),
      createPlayer('Trai Hume', 'LTD', 23, 18),
      createPlayer('Nordi Mukiele', 'LTD', 28, 15),
      createPlayer('Granit Xhaka', 'MCD', 33, 10),
      createPlayer('Habib Diarra', 'MC', 22, 32),
      createPlayer('Noah Sadiki', 'MC', 21, 25),
      createPlayer('Enzo Le Fée', 'MC', 25, 20),
      createPlayer('Dan Neil', 'MC', 24, 6.5),
      createPlayer('Chris Rigg', 'MCO', 18, 25),
      createPlayer('Simon Adingra', 'EI', 24, 22),
      createPlayer('Romaine Mundle', 'EI', 22, 6),
      createPlayer('Chemsdine Talbi', 'ED', 20, 22),
      createPlayer('Bertrand Traoré', 'ED', 30, 5),
      createPlayer('Brian Brobbey', 'DC', 23, 20),
      createPlayer('Eliezer Mayenda', 'DC', 20, 18),
      createPlayer('Wilson Isidor', 'DC', 25, 18)
    ]
  },

  // ========== FULHAM ==========
  fulham: {
    name: 'Fulham FC', shortName: 'FUL', city: 'London',
    stadium: 'Craven Cottage', stadiumCapacity: 22384,
    budget: 55000000, reputation: 70, league: 'premier',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Bernd Leno', 'POR', 33, 8),
      createPlayer('Benjamin Lecomte', 'POR', 34, 1.2),
      createPlayer('Calvin Bassey', 'DFC', 26, 28),
      createPlayer('Joachim Andersen', 'DFC', 29, 25),
      createPlayer('Issa Diop', 'DFC', 29, 10),
      createPlayer('Jorge Cuenca', 'DFC', 26, 4),
      createPlayer('Antonee Robinson', 'LTI', 28, 30),
      createPlayer('Ryan Sessegnon', 'LTI', 25, 20),
      createPlayer('Kenny Tete', 'LTD', 30, 11),
      createPlayer('Timothy Castagne', 'LTD', 30, 10),
      createPlayer('Sander Berge', 'MCD', 27, 25),
      createPlayer('Saša Lukić', 'MC', 29, 12),
      createPlayer('Harrison Reed', 'MC', 31, 3),
      createPlayer('Tom Cairney', 'MC', 35, 0.75),
      createPlayer('Emile Smith Rowe', 'MCO', 25, 22),
      createPlayer('Josh King', 'MCO', 19, 20),
      createPlayer('Kevin', 'EI', 23, 30),
      createPlayer('Alex Iwobi', 'EI', 29, 25),
      createPlayer('Harry Wilson', 'ED', 28, 20),
      createPlayer('Samuel Chukwueze', 'ED', 26, 10),
      createPlayer('Adama Traoré', 'ED', 30, 8),
      createPlayer('Rodrigo Muniz', 'DC', 24, 25),
      createPlayer('Raúl Jiménez', 'DC', 34, 4)
    ]
  },

  // ========== WOLVES ==========
  wolves: {
    name: 'Wolverhampton Wanderers', shortName: 'WOL', city: 'Wolverhampton',
    stadium: 'Molineux Stadium', stadiumCapacity: 31750,
    budget: 50000000, reputation: 68, league: 'premier',
    colors: { primary: '#FDB913', secondary: '#231F20' },
    players: [
      createPlayer('José Sá', 'POR', 33, 5),
      createPlayer('Sam Johnstone', 'POR', 32, 5),
      createPlayer('Toti', 'DFC', 27, 25),
      createPlayer('Ladislav Krejci', 'DFC', 26, 22),
      createPlayer('Emmanuel Agbadou', 'DFC', 28, 18),
      createPlayer('Santiago Bueno', 'DFC', 27, 10),
      createPlayer('Yerson Mosquera', 'DFC', 24, 10),
      createPlayer('Hugo Bueno', 'LTI', 23, 10),
      createPlayer('David Møller Wolfe', 'LTI', 23, 10),
      createPlayer('Jackson Tchatchoua', 'LTD', 24, 12),
      createPlayer('Pedro Lima', 'LTD', 19, 4),
      createPlayer('Matt Doherty', 'LTD', 34, 1.5),
      createPlayer('André', 'MCD', 24, 28),
      createPlayer('João Gomes', 'MC', 24, 40),
      createPlayer('Jean-Ricner Bellegarde', 'MC', 27, 16),
      createPlayer('Rodrigo Gomes', 'MI', 22, 15),
      createPlayer('Enso González', 'EI', 21, 4),
      createPlayer('Jhon Arias', 'ED', 28, 15),
      createPlayer('Jørgen Strand Larsen', 'DC', 25, 40),
      createPlayer('Tolu Arokodare', 'DC', 25, 22),
      createPlayer('Hee-chan Hwang', 'DC', 30, 10)
    ]
  },

  // ========== LEEDS UNITED ==========
  leeds: {
    name: 'Leeds United', shortName: 'LEE', city: 'Leeds',
    stadium: 'Elland Road', stadiumCapacity: 37890,
    budget: 55000000, reputation: 70, league: 'premier',
    colors: { primary: '#FFFFFF', secondary: '#1D428A' },
    players: [
      createPlayer('Lucas Perri', 'POR', 28, 16),
      createPlayer('Illan Meslier', 'POR', 25, 12),
      createPlayer('Karl Darlow', 'POR', 35, 0.2),
      createPlayer('Pascal Struijk', 'DFC', 26, 20),
      createPlayer('Jaka Bijol', 'DFC', 26, 18),
      createPlayer('Joe Rodon', 'DFC', 28, 12),
      createPlayer('Sebastiaan Bornauw', 'DFC', 26, 5),
      createPlayer('Gabriel Gudmundsson', 'LTI', 26, 15),
      createPlayer('Sam Byram', 'LTI', 32, 0.6),
      createPlayer('James Justin', 'LTD', 27, 12),
      createPlayer('Jayden Bogle', 'LTD', 25, 10),
      createPlayer('Ethan Ampadu', 'MCD', 25, 20),
      createPlayer('Anton Stach', 'MCD', 27, 20),
      createPlayer('Ilia Gruev', 'MCD', 25, 9),
      createPlayer('Sean Longstaff', 'MC', 28, 18),
      createPlayer('Ao Tanaka', 'MC', 27, 10),
      createPlayer('Facundo Buonanotte', 'MCO', 21, 18),
      createPlayer('Brenden Aaronson', 'MCO', 25, 15),
      createPlayer('Noah Okafor', 'EI', 25, 18),
      createPlayer('Wilfried Gnonto', 'ED', 22, 20),
      createPlayer('Daniel James', 'ED', 28, 14),
      createPlayer('Dominic Calvert-Lewin', 'DC', 28, 15),
      createPlayer('Joël Piroe', 'DC', 26, 15),
      createPlayer('Lukas Nmecha', 'DC', 27, 8)
    ]
  },

  // ========== BURNLEY ==========
  burnley: {
    name: 'Burnley FC', shortName: 'BUR', city: 'Burnley',
    stadium: 'Turf Moor', stadiumCapacity: 21944,
    budget: 40000000, reputation: 65, league: 'premier',
    colors: { primary: '#6C1D45', secondary: '#99D6EA' },
    players: [
      createPlayer('Max Weiß', 'POR', 21, 4),
      createPlayer('Martin Dúbravka', 'POR', 37, 0.75),
      createPlayer('Václav Hladký', 'POR', 35, 0.2),
      createPlayer('Maxime Estève', 'DFC', 23, 25),
      createPlayer('Bashir Humphreys', 'DFC', 22, 12),
      createPlayer('Hjalmar Ekdal', 'DFC', 27, 6),
      createPlayer('Axel Tuanzebe', 'DFC', 28, 5),
      createPlayer('Joe Worrall', 'DFC', 29, 4),
      createPlayer('Jordan Beyer', 'DFC', 25, 4),
      createPlayer('Quilindschy Hartman', 'LTI', 24, 18),
      createPlayer('Lucas Pires', 'LTI', 24, 5),
      createPlayer('Oliver Sonne', 'LTD', 25, 4),
      createPlayer('Connor Roberts', 'LTD', 30, 3),
      createPlayer('Kyle Walker', 'LTD', 35, 2.5),
      createPlayer('Lesley Ugochukwu', 'MCD', 21, 25),
      createPlayer('Florentino', 'MCD', 26, 22),
      createPlayer('Josh Cullen', 'MC', 29, 7),
      createPlayer('Josh Laurent', 'MC', 30, 2),
      createPlayer('Hannibal', 'MCO', 23, 14),
      createPlayer('Mike Tresor', 'MCO', 26, 4),
      createPlayer('Jaidon Anthony', 'EI', 26, 15),
      createPlayer('Jacob Bruun Larsen', 'EI', 27, 5),
      createPlayer('Loum Tchaouna', 'ED', 22, 15),
      createPlayer('Marcus Edwards', 'ED', 27, 8),
      createPlayer('Lyle Foster', 'DC', 25, 10),
      createPlayer('Zian Flemming', 'DC', 27, 10),
      createPlayer('Armando Broja', 'DC', 24, 10),
      createPlayer('Zeki Amdouni', 'DC', 25, 9)
    ]
  }
};

export const premierTeamsArray = Object.entries(premierTeams).map(([id, team]) => ({
  id,
  ...team
}));

export default premierTeams;
