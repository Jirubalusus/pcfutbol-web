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
      createPlayer('Gianluigi Donnarumma', 'GK', 26, 45),
      createPlayer('James Trafford', 'GK', 23, 25),
      createPlayer('Stefan Ortega', 'GK', 33, 5),
      createPlayer('Josko Gvardiol', 'CB', 24, 70),
      createPlayer('Rúben Dias', 'CB', 28, 60),
      createPlayer('Marc Guéhi', 'CB', 25, 55),
      createPlayer('Abdukodir Khusanov', 'CB', 21, 35),
      createPlayer('John Stones', 'CB', 31, 18),
      createPlayer('Nathan Aké', 'CB', 30, 18),
      createPlayer('Rayan Aït-Nouri', 'LB', 24, 40),
      createPlayer('Nico O\'Reilly', 'LB', 20, 40),
      createPlayer('Matheus Nunes', 'RB', 27, 38),
      createPlayer('Rico Lewis', 'RB', 21, 35),
      createPlayer('Rodri', 'CDM', 29, 75),
      createPlayer('Nico González', 'CDM', 24, 45),
      createPlayer('Kalvin Phillips', 'CDM', 30, 6),
      createPlayer('Tijjani Reijnders', 'CM', 27, 65),
      createPlayer('Mateo Kovacic', 'CM', 31, 15),
      createPlayer('Phil Foden', 'CAM', 25, 80),
      createPlayer('Rayan Cherki', 'CAM', 22, 50),
      createPlayer('Bernardo Silva', 'CAM', 31, 27),
      createPlayer('Jérémy Doku', 'LW', 23, 65),
      createPlayer('Savinho', 'LW', 21, 45),
      createPlayer('Antoine Semenyo', 'RW', 26, 65),
      createPlayer('Oscar Bobb', 'RW', 22, 25),
      createPlayer('Erling Haaland', 'ST', 25, 200),
      createPlayer('Omar Marmoush', 'ST', 26, 65)
    ]
  },

  // ========== ARSENAL ==========
  arsenal: {
    name: 'Arsenal FC', shortName: 'ARS', city: 'London',
    stadium: 'Emirates Stadium', stadiumCapacity: 60704,
    budget: 200000000, reputation: 92, league: 'premier',
    colors: { primary: '#EF0107', secondary: '#FFFFFF' },
    players: [
      createPlayer('David Raya', 'GK', 30, 35),
      createPlayer('Kepa Arrizabalaga', 'GK', 31, 7),
      createPlayer('William Saliba', 'CB', 24, 90),
      createPlayer('Gabriel Magalhães', 'CB', 28, 75),
      createPlayer('Piero Hincapié', 'CB', 24, 50),
      createPlayer('Cristhian Mosquera', 'CB', 21, 35),
      createPlayer('Riccardo Calafiori', 'LB', 23, 50),
      createPlayer('Myles Lewis-Skelly', 'LB', 19, 40),
      createPlayer('Jurriën Timber', 'RB', 24, 70),
      createPlayer('Ben White', 'RB', 28, 30),
      createPlayer('Martín Zubimendi', 'CDM', 26, 75),
      createPlayer('Christian Nørgaard', 'CDM', 31, 9),
      createPlayer('Declan Rice', 'CM', 27, 120),
      createPlayer('Mikel Merino', 'CM', 29, 30),
      createPlayer('Martin Ødegaard', 'CAM', 27, 75),
      createPlayer('Eberechi Eze', 'CAM', 27, 65),
      createPlayer('Gabriel Martinelli', 'LW', 24, 45),
      createPlayer('Leandro Trossard', 'LW', 31, 20),
      createPlayer('Bukayo Saka', 'RW', 24, 130),
      createPlayer('Noni Madueke', 'RW', 23, 50),
      createPlayer('Max Dowman', 'RW', 16, 20),
      createPlayer('Viktor Gyökeres', 'ST', 27, 70),
      createPlayer('Kai Havertz', 'ST', 26, 55),
      createPlayer('Gabriel Jesus', 'ST', 28, 20)
    ]
  },

  // ========== CHELSEA ==========
  chelsea: {
    name: 'Chelsea FC', shortName: 'CHE', city: 'London',
    stadium: 'Stamford Bridge', stadiumCapacity: 40343,
    budget: 180000000, reputation: 90, league: 'premier',
    colors: { primary: '#034694', secondary: '#FFFFFF' },
    players: [
      createPlayer('Robert Sánchez', 'GK', 28, 22),
      createPlayer('Filip Jørgensen', 'GK', 23, 15),
      createPlayer('Gabriel Slonina', 'GK', 21, 3.5),
      createPlayer('Levi Colwill', 'CB', 22, 50),
      createPlayer('Trevoh Chalobah', 'CB', 26, 35),
      createPlayer('Wesley Fofana', 'CB', 25, 28),
      createPlayer('Tosin Adarabioyo', 'CB', 28, 20),
      createPlayer('Benoît Badiashile', 'CB', 24, 18),
      createPlayer('Axel Disasi', 'CB', 27, 15),
      createPlayer('Marc Cucurella', 'LB', 27, 50),
      createPlayer('Jorrel Hato', 'LB', 19, 35),
      createPlayer('Reece James', 'RB', 26, 50),
      createPlayer('Malo Gusto', 'RB', 22, 35),
      createPlayer('Josh Acheampong', 'RB', 19, 20),
      createPlayer('Moisés Caicedo', 'CDM', 24, 110),
      createPlayer('Roméo Lavia', 'CDM', 22, 30),
      createPlayer('Dário Essugo', 'CDM', 20, 20),
      createPlayer('Enzo Fernández', 'CM', 25, 85),
      createPlayer('Andrey Santos', 'CM', 21, 40),
      createPlayer('Cole Palmer', 'CAM', 23, 120),
      createPlayer('Alejandro Garnacho', 'LW', 21, 45),
      createPlayer('Jamie Gittens', 'LW', 21, 40),
      createPlayer('Estêvão', 'RW', 18, 80),
      createPlayer('Pedro Neto', 'RW', 25, 60),
      createPlayer('João Pedro', 'ST', 24, 65),
      createPlayer('Liam Delap', 'ST', 22, 35),
      createPlayer('Marc Guiu', 'ST', 20, 12)
    ]
  },

  // ========== LIVERPOOL ==========
  liverpool: {
    name: 'Liverpool FC', shortName: 'LIV', city: 'Liverpool',
    stadium: 'Anfield', stadiumCapacity: 61276,
    budget: 180000000, reputation: 92, league: 'premier',
    colors: { primary: '#C8102E', secondary: '#FFFFFF' },
    players: [
      createPlayer('Giorgi Mamardashvili', 'GK', 25, 28),
      createPlayer('Alisson', 'GK', 33, 17),
      createPlayer('Ibrahima Konaté', 'CB', 26, 50),
      createPlayer('Giovanni Leoni', 'CB', 19, 25),
      createPlayer('Virgil van Dijk', 'CB', 34, 18),
      createPlayer('Joe Gomez', 'CB', 28, 15),
      createPlayer('Milos Kerkez', 'LB', 22, 40),
      createPlayer('Andrew Robertson', 'LB', 31, 12),
      createPlayer('Jeremie Frimpong', 'RB', 25, 38),
      createPlayer('Conor Bradley', 'RB', 22, 30),
      createPlayer('Ryan Gravenberch', 'CDM', 23, 90),
      createPlayer('Stefan Bajcetic', 'CDM', 21, 7),
      createPlayer('Wataru Endo', 'CDM', 32, 5),
      createPlayer('Alexis Mac Allister', 'CM', 27, 85),
      createPlayer('Curtis Jones', 'CM', 24, 40),
      createPlayer('Trey Nyoni', 'CM', 18, 6),
      createPlayer('Florian Wirtz', 'CAM', 22, 110),
      createPlayer('Dominik Szoboszlai', 'CAM', 25, 85),
      createPlayer('Cody Gakpo', 'LW', 26, 70),
      createPlayer('Rio Ngumoha', 'LW', 17, 15),
      createPlayer('Mohamed Salah', 'RW', 33, 30),
      createPlayer('Federico Chiesa', 'RW', 28, 18),
      createPlayer('Alexander Isak', 'ST', 26, 120),
      createPlayer('Hugo Ekitiké', 'ST', 23, 85)
    ]
  },

  // ========== TOTTENHAM ==========
  tottenham: {
    name: 'Tottenham Hotspur', shortName: 'TOT', city: 'London',
    stadium: 'Tottenham Hotspur Stadium', stadiumCapacity: 62850,
    budget: 150000000, reputation: 85, league: 'premier',
    colors: { primary: '#132257', secondary: '#FFFFFF' },
    players: [
      createPlayer('Guglielmo Vicario', 'GK', 29, 30),
      createPlayer('Antonín Kinský', 'GK', 22, 13),
      createPlayer('Micky van de Ven', 'CB', 24, 65),
      createPlayer('Cristian Romero', 'CB', 27, 60),
      createPlayer('Radu Drăgușin', 'CB', 23, 22),
      createPlayer('Kevin Danso', 'CB', 27, 22),
      createPlayer('Ben Davies', 'CB', 32, 5),
      createPlayer('Destiny Udogie', 'LB', 23, 40),
      createPlayer('Djed Spence', 'LB', 25, 32),
      createPlayer('Pedro Porro', 'RB', 26, 40),
      createPlayer('João Palhinha', 'CDM', 30, 25),
      createPlayer('Yves Bissouma', 'CDM', 29, 15),
      createPlayer('Lucas Bergvall', 'CM', 19, 40),
      createPlayer('Archie Gray', 'CM', 19, 35),
      createPlayer('Conor Gallagher', 'CM', 25, 35),
      createPlayer('Pape Matar Sarr', 'CM', 23, 35),
      createPlayer('Rodrigo Bentancur', 'CM', 28, 27),
      createPlayer('Xavi Simons', 'CAM', 22, 60),
      createPlayer('Dejan Kulusevski', 'CAM', 25, 45),
      createPlayer('James Maddison', 'CAM', 29, 30),
      createPlayer('Wilson Odobert', 'LW', 21, 22),
      createPlayer('Mohammed Kudus', 'RW', 25, 55),
      createPlayer('Dominic Solanke', 'ST', 28, 35),
      createPlayer('Mathys Tel', 'ST', 20, 30),
      createPlayer('Richarlison', 'ST', 28, 28),
      createPlayer('Randal Kolo Muani', 'ST', 27, 25)
    ]
  },

  // ========== MANCHESTER UNITED ==========
  manchester_united: {
    name: 'Manchester United', shortName: 'MUN', city: 'Manchester',
    stadium: 'Old Trafford', stadiumCapacity: 74310,
    budget: 160000000, reputation: 88, league: 'premier',
    colors: { primary: '#DA291C', secondary: '#FFFFFF' },
    players: [
      createPlayer('Senne Lammens', 'GK', 23, 25),
      createPlayer('Altay Bayındır', 'GK', 27, 7),
      createPlayer('Leny Yoro', 'CB', 20, 55),
      createPlayer('Matthijs de Ligt', 'CB', 26, 40),
      createPlayer('Lisandro Martínez', 'CB', 28, 35),
      createPlayer('Harry Maguire', 'CB', 32, 10),
      createPlayer('Ayden Heaven', 'CB', 19, 10),
      createPlayer('Patrick Dorgu', 'LB', 21, 30),
      createPlayer('Luke Shaw', 'LB', 30, 10),
      createPlayer('Tyrell Malacia', 'LB', 26, 5),
      createPlayer('Diogo Dalot', 'RB', 26, 28),
      createPlayer('Noussair Mazraoui', 'RB', 28, 22),
      createPlayer('Manuel Ugarte', 'CDM', 24, 30),
      createPlayer('Casemiro', 'CDM', 33, 8),
      createPlayer('Kobbie Mainoo', 'CM', 20, 40),
      createPlayer('Bruno Fernandes', 'CAM', 31, 40),
      createPlayer('Mason Mount', 'CAM', 27, 32),
      createPlayer('Bryan Mbeumo', 'RW', 26, 75),
      createPlayer('Amad Diallo', 'RW', 23, 50),
      createPlayer('Matheus Cunha', 'ST', 26, 70),
      createPlayer('Benjamin Sesko', 'ST', 22, 60),
      createPlayer('Joshua Zirkzee', 'ST', 24, 25)
    ]
  },

  // ========== NEWCASTLE ==========
  newcastle: {
    name: 'Newcastle United', shortName: 'NEW', city: 'Newcastle',
    stadium: 'St. James\' Park', stadiumCapacity: 52305,
    budget: 120000000, reputation: 82, league: 'premier',
    colors: { primary: '#241F20', secondary: '#FFFFFF' },
    players: [
      createPlayer('Aaron Ramsdale', 'GK', 27, 12),
      createPlayer('Nick Pope', 'GK', 33, 7),
      createPlayer('Malick Thiaw', 'CB', 24, 40),
      createPlayer('Sven Botman', 'CB', 26, 35),
      createPlayer('Fabian Schär', 'CB', 34, 6),
      createPlayer('Dan Burn', 'CB', 33, 5),
      createPlayer('Lewis Hall', 'LB', 21, 32),
      createPlayer('Tino Livramento', 'RB', 23, 40),
      createPlayer('Kieran Trippier', 'RB', 35, 2.5),
      createPlayer('Sandro Tonali', 'CDM', 25, 75),
      createPlayer('Bruno Guimarães', 'CM', 28, 75),
      createPlayer('Jacob Ramsey', 'CM', 24, 35),
      createPlayer('Joelinton', 'CM', 29, 30),
      createPlayer('Lewis Miley', 'CM', 19, 20),
      createPlayer('Joe Willock', 'CM', 26, 16),
      createPlayer('Anthony Gordon', 'LW', 24, 60),
      createPlayer('Harvey Barnes', 'LW', 28, 32),
      createPlayer('Anthony Elanga', 'RW', 23, 50),
      createPlayer('Jacob Murphy', 'RW', 30, 15),
      createPlayer('Nick Woltemade', 'ST', 23, 70),
      createPlayer('Yoane Wissa', 'ST', 29, 35),
      createPlayer('William Osula', 'ST', 22, 15)
    ]
  },

  // ========== NOTTINGHAM FOREST ==========
  nottingham_forest: {
    name: 'Nottingham Forest', shortName: 'NFO', city: 'Nottingham',
    stadium: 'City Ground', stadiumCapacity: 30445,
    budget: 90000000, reputation: 75, league: 'premier',
    colors: { primary: '#DD0000', secondary: '#FFFFFF' },
    players: [
      createPlayer('John Victor', 'GK', 29, 7),
      createPlayer('Matz Sels', 'GK', 33, 6),
      createPlayer('Murillo', 'CB', 23, 55),
      createPlayer('Nikola Milenković', 'CB', 28, 30),
      createPlayer('Morato', 'CB', 24, 14),
      createPlayer('Jair Cunha', 'CB', 20, 12),
      createPlayer('Neco Williams', 'LB', 24, 25),
      createPlayer('Oleksandr Zinchenko', 'LB', 29, 15),
      createPlayer('Ola Aina', 'RB', 29, 20),
      createPlayer('Nicolò Savona', 'RB', 22, 15),
      createPlayer('Ibrahim Sangaré', 'CDM', 28, 22),
      createPlayer('Elliot Anderson', 'CM', 23, 60),
      createPlayer('Douglas Luiz', 'CM', 27, 25),
      createPlayer('Nicolás Domínguez', 'CM', 27, 16),
      createPlayer('Ryan Yates', 'CM', 28, 10),
      createPlayer('Morgan Gibbs-White', 'CAM', 26, 65),
      createPlayer('Omari Hutchinson', 'CAM', 22, 30),
      createPlayer('James McAtee', 'CAM', 23, 23),
      createPlayer('Callum Hudson-Odoi', 'LW', 25, 30),
      createPlayer('Dan Ndoye', 'RW', 25, 40),
      createPlayer('Dilane Bakwa', 'RW', 23, 32),
      createPlayer('Lorenzo Lucca', 'ST', 25, 25),
      createPlayer('Igor Jesus', 'ST', 24, 20),
      createPlayer('Taiwo Awoniyi', 'ST', 28, 12),
      createPlayer('Chris Wood', 'ST', 34, 8)
    ]
  },

  // ========== BRIGHTON ==========
  brighton: {
    name: 'Brighton & Hove Albion', shortName: 'BHA', city: 'Brighton',
    stadium: 'Amex Stadium', stadiumCapacity: 31800,
    budget: 80000000, reputation: 75, league: 'premier',
    colors: { primary: '#0057B8', secondary: '#FFFFFF' },
    players: [
      createPlayer('Bart Verbruggen', 'GK', 23, 35),
      createPlayer('Jason Steele', 'GK', 35, 0.75),
      createPlayer('Jan Paul van Hecke', 'CB', 25, 35),
      createPlayer('Olivier Boscagli', 'CB', 28, 18),
      createPlayer('Diego Coppola', 'CB', 22, 10),
      createPlayer('Adam Webster', 'CB', 31, 7),
      createPlayer('Lewis Dunk', 'CB', 34, 4),
      createPlayer('Ferdi Kadıoğlu', 'LB', 26, 28),
      createPlayer('Maxim De Cuyper', 'LB', 25, 22),
      createPlayer('Joël Veltman', 'RB', 34, 2.5),
      createPlayer('Carlos Baleba', 'CDM', 22, 60),
      createPlayer('Mats Wieffer', 'CDM', 26, 25),
      createPlayer('Jack Hinshelwood', 'CDM', 20, 22),
      createPlayer('Yasin Ayari', 'CM', 22, 30),
      createPlayer('Diego Gómez', 'CM', 22, 25),
      createPlayer('Pascal Groß', 'CM', 34, 3.5),
      createPlayer('James Milner', 'CM', 40, 0.75),
      createPlayer('Kaoru Mitoma', 'LW', 28, 30),
      createPlayer('Tom Watson', 'LW', 19, 10),
      createPlayer('Yankuba Minteh', 'RW', 21, 40),
      createPlayer('Brajan Gruda', 'RW', 21, 28),
      createPlayer('Solly March', 'RW', 31, 3),
      createPlayer('Georginio Rutter', 'ST', 23, 32),
      createPlayer('Charalampos Kostoulas', 'ST', 18, 25),
      createPlayer('Stefanos Tzimas', 'ST', 20, 22),
      createPlayer('Danny Welbeck', 'ST', 35, 4)
    ]
  },

  // ========== ASTON VILLA ==========
  aston_villa: {
    name: 'Aston Villa', shortName: 'AVL', city: 'Birmingham',
    stadium: 'Villa Park', stadiumCapacity: 42682,
    budget: 100000000, reputation: 78, league: 'premier',
    colors: { primary: '#670E36', secondary: '#95BFE5' },
    players: [
      createPlayer('Emiliano Martínez', 'GK', 33, 15),
      createPlayer('Marco Bizot', 'GK', 34, 2.5),
      createPlayer('Ezri Konsa', 'CB', 28, 35),
      createPlayer('Pau Torres', 'CB', 29, 25),
      createPlayer('Victor Lindelöf', 'CB', 31, 6),
      createPlayer('Tyrone Mings', 'CB', 32, 4),
      createPlayer('Ian Maatsen', 'LB', 23, 25),
      createPlayer('Lucas Digne', 'LB', 32, 8),
      createPlayer('Matty Cash', 'RB', 28, 22),
      createPlayer('Andrés García', 'RB', 22, 7),
      createPlayer('Amadou Onana', 'CDM', 24, 42),
      createPlayer('Boubacar Kamara', 'CDM', 26, 40),
      createPlayer('Lamare Bogarde', 'CDM', 22, 12),
      createPlayer('Youri Tielemans', 'CM', 28, 35),
      createPlayer('John McGinn', 'CM', 31, 15),
      createPlayer('Ross Barkley', 'CM', 32, 5),
      createPlayer('Morgan Rogers', 'CAM', 23, 70),
      createPlayer('Harvey Elliott', 'CAM', 22, 30),
      createPlayer('Emiliano Buendía', 'CAM', 29, 18),
      createPlayer('Jadon Sancho', 'LW', 25, 20),
      createPlayer('Evann Guessand', 'RW', 24, 28),
      createPlayer('Leon Bailey', 'RW', 28, 18),
      createPlayer('Ollie Watkins', 'ST', 30, 30),
      createPlayer('Brian Madjo', 'ST', 17, 4)
    ]
  },

  // ========== CRYSTAL PALACE ==========
  crystal_palace: {
    name: 'Crystal Palace', shortName: 'CRY', city: 'London',
    stadium: 'Selhurst Park', stadiumCapacity: 25486,
    budget: 70000000, reputation: 72, league: 'premier',
    colors: { primary: '#1B458F', secondary: '#C4122E' },
    players: [
      createPlayer('Dean Henderson', 'GK', 28, 28),
      createPlayer('Walter Benítez', 'GK', 33, 5),
      createPlayer('Maxence Lacroix', 'CB', 25, 35),
      createPlayer('Chris Richards', 'CB', 25, 25),
      createPlayer('Jaydee Canvot', 'CB', 19, 20),
      createPlayer('Chadi Riad', 'CB', 22, 12),
      createPlayer('Tyrick Mitchell', 'LB', 26, 25),
      createPlayer('Borna Sosa', 'LB', 28, 4),
      createPlayer('Daniel Muñoz', 'RB', 29, 27),
      createPlayer('Nathaniel Clyne', 'RB', 34, 0.5),
      createPlayer('Adam Wharton', 'CDM', 21, 60),
      createPlayer('Cheick Doucouré', 'CDM', 26, 15),
      createPlayer('Jefferson Lerma', 'CDM', 31, 8),
      createPlayer('Will Hughes', 'CM', 30, 6),
      createPlayer('Daichi Kamada', 'CAM', 29, 12),
      createPlayer('Justin Devenny', 'CAM', 22, 8),
      createPlayer('Ismaïla Sarr', 'RW', 27, 35),
      createPlayer('Yéremy Pino', 'RW', 23, 35),
      createPlayer('Brennan Johnson', 'RW', 24, 35),
      createPlayer('Jesurun Rak-Sakyi', 'RW', 23, 6),
      createPlayer('Jean-Philippe Mateta', 'ST', 28, 40),
      createPlayer('Eddie Nketiah', 'ST', 26, 16),
      createPlayer('Christantus Uche', 'ST', 22, 15)
    ]
  },

  // ========== BRENTFORD ==========
  brentford: {
    name: 'Brentford FC', shortName: 'BRE', city: 'London',
    stadium: 'Gtech Community Stadium', stadiumCapacity: 17250,
    budget: 65000000, reputation: 72, league: 'premier',
    colors: { primary: '#E30613', secondary: '#FFB81C' },
    players: [
      createPlayer('Caoimhín Kelleher', 'GK', 27, 22),
      createPlayer('Hákon Valdimarsson', 'GK', 24, 2.5),
      createPlayer('Nathan Collins', 'CB', 24, 35),
      createPlayer('Sepp van den Berg', 'CB', 24, 28),
      createPlayer('Kristoffer Ajer', 'CB', 27, 16),
      createPlayer('Ethan Pinnock', 'CB', 32, 4),
      createPlayer('Rico Henry', 'LB', 28, 15),
      createPlayer('Michael Kayode', 'RB', 21, 27),
      createPlayer('Aaron Hickey', 'RB', 23, 16),
      createPlayer('Vitaly Janelt', 'CDM', 27, 18),
      createPlayer('Jordan Henderson', 'CDM', 35, 2),
      createPlayer('Yegor Yarmolyuk', 'CM', 21, 25),
      createPlayer('Mathias Jensen', 'CM', 30, 12),
      createPlayer('Frank Onyeka', 'CM', 28, 7),
      createPlayer('Keane Lewis-Potter', 'LM', 24, 22),
      createPlayer('Mikkel Damsgaard', 'CAM', 25, 30),
      createPlayer('Antoni Milambo', 'CAM', 20, 20),
      createPlayer('Fábio Carvalho', 'CAM', 23, 12),
      createPlayer('Kevin Schade', 'LW', 24, 35),
      createPlayer('Reiss Nelson', 'LW', 26, 14),
      createPlayer('Dango Ouattara', 'RW', 23, 35),
      createPlayer('Igor Thiago', 'ST', 24, 35),
      createPlayer('Kaye Furo', 'ST', 18, 2.5)
    ]
  },

  // ========== BOURNEMOUTH ==========
  bournemouth: {
    name: 'AFC Bournemouth', shortName: 'BOU', city: 'Bournemouth',
    stadium: 'Vitality Stadium', stadiumCapacity: 11364,
    budget: 60000000, reputation: 70, league: 'premier',
    colors: { primary: '#DA291C', secondary: '#000000' },
    players: [
      createPlayer('Djordje Petrovic', 'GK', 26, 28),
      createPlayer('Fraser Forster', 'GK', 37, 0.6),
      createPlayer('Bafodé Diakité', 'CB', 25, 35),
      createPlayer('Marcos Senesi', 'CB', 28, 22),
      createPlayer('Veljko Milosavljevic', 'CB', 18, 20),
      createPlayer('James Hill', 'CB', 24, 7),
      createPlayer('Adrien Truffert', 'LB', 24, 20),
      createPlayer('Julio Soler', 'LB', 20, 8),
      createPlayer('Álex Jiménez', 'RB', 20, 18),
      createPlayer('Adam Smith', 'RB', 34, 0.5),
      createPlayer('Tyler Adams', 'CDM', 26, 25),
      createPlayer('Alex Scott', 'CM', 22, 30),
      createPlayer('Lewis Cook', 'CM', 28, 13),
      createPlayer('Ryan Christie', 'CM', 30, 9),
      createPlayer('Alex Tóth', 'CM', 20, 8),
      createPlayer('Justin Kluivert', 'CAM', 26, 32),
      createPlayer('Marcus Tavernier', 'CAM', 26, 20),
      createPlayer('Amine Adli', 'LW', 25, 20),
      createPlayer('Ben Gannon-Doak', 'RW', 20, 18),
      createPlayer('David Brooks', 'RW', 28, 12),
      createPlayer('Evanilson', 'ST', 26, 40),
      createPlayer('Eli Kroupi', 'ST', 19, 22),
      createPlayer('Enes Ünal', 'ST', 28, 8)
    ]
  },

  // ========== EVERTON ==========
  everton: {
    name: 'Everton FC', shortName: 'EVE', city: 'Liverpool',
    stadium: 'Everton Stadium', stadiumCapacity: 52888,
    budget: 60000000, reputation: 72, league: 'premier',
    colors: { primary: '#003399', secondary: '#FFFFFF' },
    players: [
      createPlayer('Jordan Pickford', 'GK', 31, 15),
      createPlayer('Mark Travers', 'GK', 26, 4),
      createPlayer('Jarrad Branthwaite', 'CB', 23, 45),
      createPlayer('James Tarkowski', 'CB', 33, 7),
      createPlayer('Michael Keane', 'CB', 33, 4),
      createPlayer('Vitaliy Mykolenko', 'LB', 26, 25),
      createPlayer('Adam Aznou', 'LB', 19, 7),
      createPlayer('Jake O\'Brien', 'RB', 24, 16),
      createPlayer('Nathan Patterson', 'RB', 24, 10),
      createPlayer('Séamus Coleman', 'RB', 37, 0.3),
      createPlayer('James Garner', 'CDM', 24, 25),
      createPlayer('Idrissa Gueye', 'CDM', 36, 1),
      createPlayer('Kiernan Dewsbury-Hall', 'CM', 27, 28),
      createPlayer('Carlos Alcaraz', 'CM', 23, 15),
      createPlayer('Tim Iroegbunam', 'CM', 22, 12),
      createPlayer('Merlin Röhl', 'CAM', 23, 16),
      createPlayer('Jack Grealish', 'LW', 30, 25),
      createPlayer('Dwight McNeil', 'LW', 26, 20),
      createPlayer('Iliman Ndiaye', 'RW', 25, 45),
      createPlayer('Tyler Dibling', 'RW', 19, 30),
      createPlayer('Thierno Barry', 'ST', 23, 30),
      createPlayer('Beto', 'ST', 27, 20)
    ]
  },

  // ========== WEST HAM ==========
  west_ham: {
    name: 'West Ham United', shortName: 'WHU', city: 'London',
    stadium: 'London Stadium', stadiumCapacity: 62500,
    budget: 65000000, reputation: 72, league: 'premier',
    colors: { primary: '#7A263A', secondary: '#1BB1E7' },
    players: [
      createPlayer('Mads Hermansen', 'GK', 25, 15),
      createPlayer('Alphonse Areola', 'GK', 32, 7),
      createPlayer('Jean-Clair Todibo', 'CB', 26, 23),
      createPlayer('Maximilian Kilman', 'CB', 28, 22),
      createPlayer('Igor Julio', 'CB', 27, 15),
      createPlayer('Konstantinos Mavropanos', 'CB', 28, 15),
      createPlayer('El Hadji Malick Diouf', 'LB', 21, 28),
      createPlayer('Oliver Scarles', 'LB', 20, 8),
      createPlayer('Aaron Wan-Bissaka', 'RB', 28, 22),
      createPlayer('Kyle Walker-Peters', 'RB', 28, 13),
      createPlayer('Soungoutou Magassa', 'CDM', 22, 17),
      createPlayer('Tomáš Souček', 'CDM', 30, 12),
      createPlayer('Freddie Potts', 'CDM', 22, 8),
      createPlayer('Mateus Fernandes', 'CM', 21, 32),
      createPlayer('James Ward-Prowse', 'CM', 31, 6),
      createPlayer('Lucas Paquetá', 'CAM', 28, 35),
      createPlayer('Crysencio Summerville', 'LW', 24, 22),
      createPlayer('Jarrod Bowen', 'RW', 29, 35),
      createPlayer('Taty Castellanos', 'ST', 27, 25),
      createPlayer('Callum Wilson', 'ST', 33, 5),
      createPlayer('Pablo', 'ST', 22, 5)
    ]
  },

  // ========== SUNDERLAND ==========
  sunderland: {
    name: 'Sunderland AFC', shortName: 'SUN', city: 'Sunderland',
    stadium: 'Stadium of Light', stadiumCapacity: 49000,
    budget: 50000000, reputation: 68, league: 'premier',
    colors: { primary: '#FF0000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Robin Roefs', 'GK', 23, 18),
      createPlayer('Anthony Patterson', 'GK', 25, 10),
      createPlayer('Dan Ballard', 'CB', 26, 16),
      createPlayer('Omar Alderete', 'CB', 29, 12),
      createPlayer('Luke O\'Nien', 'CB', 31, 1.3),
      createPlayer('Aji Alese', 'CB', 25, 1),
      createPlayer('Dennis Cirkin', 'LB', 23, 8),
      createPlayer('Reinildo Mandava', 'LB', 32, 5),
      createPlayer('Arthur Masuaku', 'LB', 32, 2.5),
      createPlayer('Lutsharel Geertruida', 'RB', 25, 20),
      createPlayer('Trai Hume', 'RB', 23, 18),
      createPlayer('Nordi Mukiele', 'RB', 28, 15),
      createPlayer('Granit Xhaka', 'CDM', 33, 10),
      createPlayer('Habib Diarra', 'CM', 22, 32),
      createPlayer('Noah Sadiki', 'CM', 21, 25),
      createPlayer('Enzo Le Fée', 'CM', 25, 20),
      createPlayer('Dan Neil', 'CM', 24, 6.5),
      createPlayer('Chris Rigg', 'CAM', 18, 25),
      createPlayer('Simon Adingra', 'LW', 24, 22),
      createPlayer('Romaine Mundle', 'LW', 22, 6),
      createPlayer('Chemsdine Talbi', 'RW', 20, 22),
      createPlayer('Bertrand Traoré', 'RW', 30, 5),
      createPlayer('Brian Brobbey', 'ST', 23, 20),
      createPlayer('Eliezer Mayenda', 'ST', 20, 18),
      createPlayer('Wilson Isidor', 'ST', 25, 18)
    ]
  },

  // ========== FULHAM ==========
  fulham: {
    name: 'Fulham FC', shortName: 'FUL', city: 'London',
    stadium: 'Craven Cottage', stadiumCapacity: 22384,
    budget: 55000000, reputation: 70, league: 'premier',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Bernd Leno', 'GK', 33, 8),
      createPlayer('Benjamin Lecomte', 'GK', 34, 1.2),
      createPlayer('Calvin Bassey', 'CB', 26, 28),
      createPlayer('Joachim Andersen', 'CB', 29, 25),
      createPlayer('Issa Diop', 'CB', 29, 10),
      createPlayer('Jorge Cuenca', 'CB', 26, 4),
      createPlayer('Antonee Robinson', 'LB', 28, 30),
      createPlayer('Ryan Sessegnon', 'LB', 25, 20),
      createPlayer('Kenny Tete', 'RB', 30, 11),
      createPlayer('Timothy Castagne', 'RB', 30, 10),
      createPlayer('Sander Berge', 'CDM', 27, 25),
      createPlayer('Saša Lukić', 'CM', 29, 12),
      createPlayer('Harrison Reed', 'CM', 31, 3),
      createPlayer('Tom Cairney', 'CM', 35, 0.75),
      createPlayer('Emile Smith Rowe', 'CAM', 25, 22),
      createPlayer('Josh King', 'CAM', 19, 20),
      createPlayer('Kevin', 'LW', 23, 30),
      createPlayer('Alex Iwobi', 'LW', 29, 25),
      createPlayer('Harry Wilson', 'RW', 28, 20),
      createPlayer('Samuel Chukwueze', 'RW', 26, 10),
      createPlayer('Adama Traoré', 'RW', 30, 8),
      createPlayer('Rodrigo Muniz', 'ST', 24, 25),
      createPlayer('Raúl Jiménez', 'ST', 34, 4)
    ]
  },

  // ========== WOLVES ==========
  wolves: {
    name: 'Wolverhampton Wanderers', shortName: 'WOL', city: 'Wolverhampton',
    stadium: 'Molineux Stadium', stadiumCapacity: 31750,
    budget: 50000000, reputation: 68, league: 'premier',
    colors: { primary: '#FDB913', secondary: '#231F20' },
    players: [
      createPlayer('José Sá', 'GK', 33, 5),
      createPlayer('Sam Johnstone', 'GK', 32, 5),
      createPlayer('Toti', 'CB', 27, 25),
      createPlayer('Ladislav Krejci', 'CB', 26, 22),
      createPlayer('Emmanuel Agbadou', 'CB', 28, 18),
      createPlayer('Santiago Bueno', 'CB', 27, 10),
      createPlayer('Yerson Mosquera', 'CB', 24, 10),
      createPlayer('Hugo Bueno', 'LB', 23, 10),
      createPlayer('David Møller Wolfe', 'LB', 23, 10),
      createPlayer('Jackson Tchatchoua', 'RB', 24, 12),
      createPlayer('Pedro Lima', 'RB', 19, 4),
      createPlayer('Matt Doherty', 'RB', 34, 1.5),
      createPlayer('André', 'CDM', 24, 28),
      createPlayer('João Gomes', 'CM', 24, 40),
      createPlayer('Jean-Ricner Bellegarde', 'CM', 27, 16),
      createPlayer('Rodrigo Gomes', 'LM', 22, 15),
      createPlayer('Enso González', 'LW', 21, 4),
      createPlayer('Jhon Arias', 'RW', 28, 15),
      createPlayer('Jørgen Strand Larsen', 'ST', 25, 40),
      createPlayer('Tolu Arokodare', 'ST', 25, 22),
      createPlayer('Hee-chan Hwang', 'ST', 30, 10)
    ]
  },

  // ========== LEEDS UNITED ==========
  leeds: {
    name: 'Leeds United', shortName: 'LEE', city: 'Leeds',
    stadium: 'Elland Road', stadiumCapacity: 37890,
    budget: 55000000, reputation: 70, league: 'premier',
    colors: { primary: '#FFFFFF', secondary: '#1D428A' },
    players: [
      createPlayer('Lucas Perri', 'GK', 28, 16),
      createPlayer('Illan Meslier', 'GK', 25, 12),
      createPlayer('Karl Darlow', 'GK', 35, 0.2),
      createPlayer('Pascal Struijk', 'CB', 26, 20),
      createPlayer('Jaka Bijol', 'CB', 26, 18),
      createPlayer('Joe Rodon', 'CB', 28, 12),
      createPlayer('Sebastiaan Bornauw', 'CB', 26, 5),
      createPlayer('Gabriel Gudmundsson', 'LB', 26, 15),
      createPlayer('Sam Byram', 'LB', 32, 0.6),
      createPlayer('James Justin', 'RB', 27, 12),
      createPlayer('Jayden Bogle', 'RB', 25, 10),
      createPlayer('Ethan Ampadu', 'CDM', 25, 20),
      createPlayer('Anton Stach', 'CDM', 27, 20),
      createPlayer('Ilia Gruev', 'CDM', 25, 9),
      createPlayer('Sean Longstaff', 'CM', 28, 18),
      createPlayer('Ao Tanaka', 'CM', 27, 10),
      createPlayer('Facundo Buonanotte', 'CAM', 21, 18),
      createPlayer('Brenden Aaronson', 'CAM', 25, 15),
      createPlayer('Noah Okafor', 'LW', 25, 18),
      createPlayer('Wilfried Gnonto', 'RW', 22, 20),
      createPlayer('Daniel James', 'RW', 28, 14),
      createPlayer('Dominic Calvert-Lewin', 'ST', 28, 15),
      createPlayer('Joël Piroe', 'ST', 26, 15),
      createPlayer('Lukas Nmecha', 'ST', 27, 8)
    ]
  },

  // ========== BURNLEY ==========
  burnley: {
    name: 'Burnley FC', shortName: 'BUR', city: 'Burnley',
    stadium: 'Turf Moor', stadiumCapacity: 21944,
    budget: 40000000, reputation: 65, league: 'premier',
    colors: { primary: '#6C1D45', secondary: '#99D6EA' },
    players: [
      createPlayer('Max Weiß', 'GK', 21, 4),
      createPlayer('Martin Dúbravka', 'GK', 37, 0.75),
      createPlayer('Václav Hladký', 'GK', 35, 0.2),
      createPlayer('Maxime Estève', 'CB', 23, 25),
      createPlayer('Bashir Humphreys', 'CB', 22, 12),
      createPlayer('Hjalmar Ekdal', 'CB', 27, 6),
      createPlayer('Axel Tuanzebe', 'CB', 28, 5),
      createPlayer('Joe Worrall', 'CB', 29, 4),
      createPlayer('Jordan Beyer', 'CB', 25, 4),
      createPlayer('Quilindschy Hartman', 'LB', 24, 18),
      createPlayer('Lucas Pires', 'LB', 24, 5),
      createPlayer('Oliver Sonne', 'RB', 25, 4),
      createPlayer('Connor Roberts', 'RB', 30, 3),
      createPlayer('Kyle Walker', 'RB', 35, 2.5),
      createPlayer('Lesley Ugochukwu', 'CDM', 21, 25),
      createPlayer('Florentino', 'CDM', 26, 22),
      createPlayer('Josh Cullen', 'CM', 29, 7),
      createPlayer('Josh Laurent', 'CM', 30, 2),
      createPlayer('Hannibal', 'CAM', 23, 14),
      createPlayer('Mike Tresor', 'CAM', 26, 4),
      createPlayer('Jaidon Anthony', 'LW', 26, 15),
      createPlayer('Jacob Bruun Larsen', 'LW', 27, 5),
      createPlayer('Loum Tchaouna', 'RW', 22, 15),
      createPlayer('Marcus Edwards', 'RW', 27, 8),
      createPlayer('Lyle Foster', 'ST', 25, 10),
      createPlayer('Zian Flemming', 'ST', 27, 10),
      createPlayer('Armando Broja', 'ST', 24, 10),
      createPlayer('Zeki Amdouni', 'ST', 25, 9)
    ]
  }
};

export const premierTeamsArray = Object.entries(premierTeams).map(([id, team]) => ({
  id,
  ...team
}));

export default premierTeams;
