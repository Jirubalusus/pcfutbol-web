// ============================================================
// PC FÚTBOL WEB - EQUIPOS LaLiga TEMPORADA 25/26
// Datos reales de Transfermarkt (enero 2026)
// ============================================================

// Helpers para cálculos
function calcOverall(valueM, age) {
  let ovr;
  if (valueM >= 150) ovr = 92;
  else if (valueM >= 100) ovr = 90;
  else if (valueM >= 70) ovr = 88;
  else if (valueM >= 50) ovr = 86;
  else if (valueM >= 35) ovr = 84;
  else if (valueM >= 25) ovr = 82;
  else if (valueM >= 15) ovr = 80;
  else if (valueM >= 10) ovr = 78;
  else if (valueM >= 6) ovr = 76;
  else if (valueM >= 3) ovr = 74;
  else if (valueM >= 1.5) ovr = 72;
  else if (valueM >= 0.5) ovr = 70;
  else if (valueM >= 0.2) ovr = 68;
  else ovr = 66;
  if (age <= 21) ovr += 1;
  else if (age >= 35) ovr -= 2;
  else if (age >= 33) ovr -= 1;
  return Math.max(62, Math.min(94, ovr));
}

function calcSalary(valueM, age) {
  const annual = valueM * 1000000 * 0.12;
  const weekly = annual / 52;
  const mult = age >= 32 ? 1.3 : (age >= 28 ? 1.1 : 1.0);
  return Math.max(20000, Math.round(weekly * mult));
}

function createPlayer(name, position, age, valueM) {
  return {
    name,
    position,
    age,
    overall: calcOverall(valueM, age),
    value: valueM * 1000000,
    salary: calcSalary(valueM, age),
    contract: age >= 32 ? 1 : (age >= 28 ? 2 : 3),
    morale: 75,
    fitness: 100
  };
}

// ============================================================
// EQUIPOS LaLiga 2025/26
// ============================================================

export const teams = {
  // ========== REAL MADRID CF ==========
  real_madrid: {
    name: 'Real Madrid CF',
    shortName: 'RMA',
    city: 'Madrid',
    stadium: 'Santiago Bernabéu',
    stadiumCapacity: 81044,
    budget: 250000000,
    reputation: 95,
    colors: { primary: '#FFFFFF', secondary: '#000000', accent: '#EE9B00' },
    players: [
      createPlayer('Thibaut Courtois', 'GK', 33, 18),
      createPlayer('Andriy Lunin', 'GK', 26, 15),
      createPlayer('Fran González', 'GK', 20, 1),
      createPlayer('Dean Huijsen', 'CB', 20, 70),
      createPlayer('Éder Militão', 'CB', 28, 30),
      createPlayer('Raúl Asencio', 'CB', 22, 30),
      createPlayer('Antonio Rüdiger', 'CB', 32, 12),
      createPlayer('David Alaba', 'CB', 33, 4),
      createPlayer('Álvaro Carreras', 'LB', 22, 60),
      createPlayer('Fran García', 'LB', 26, 15),
      createPlayer('Ferland Mendy', 'LB', 30, 8),
      createPlayer('Trent Alexander-Arnold', 'RB', 27, 70),
      createPlayer('Daniel Carvajal', 'RB', 34, 7),
      createPlayer('Aurélien Tchouaméni', 'CDM', 26, 75),
      createPlayer('Federico Valverde', 'CM', 27, 120),
      createPlayer('Eduardo Camavinga', 'CM', 23, 50),
      createPlayer('Dani Ceballos', 'CM', 29, 8),
      createPlayer('Jude Bellingham', 'CAM', 22, 160),
      createPlayer('Arda Güler', 'CAM', 20, 90),
      createPlayer('Vinícius Júnior', 'LW', 25, 150),
      createPlayer('Rodrygo', 'RW', 25, 60),
      createPlayer('Franco Mastantuono', 'RW', 18, 50),
      createPlayer('Brahim Díaz', 'RW', 26, 35),
      createPlayer('Kylian Mbappé', 'ST', 27, 200),
      createPlayer('Gonzalo García', 'ST', 21, 15)
    ]
  },

  // ========== FC BARCELONA ==========
  barcelona: {
    name: 'FC Barcelona',
    shortName: 'BAR',
    city: 'Barcelona',
    stadium: 'Spotify Camp Nou',
    stadiumCapacity: 99354,
    budget: 180000000,
    reputation: 93,
    colors: { primary: '#004D98', secondary: '#A50044', accent: '#EDBB00' },
    players: [
      createPlayer('Joan García', 'GK', 24, 30),
      createPlayer('Wojciech Szczęsny', 'GK', 35, 0.9),
      createPlayer('Pau Cubarsí', 'CB', 19, 80),
      createPlayer('Eric García', 'CB', 25, 30),
      createPlayer('Ronald Araujo', 'CB', 26, 25),
      createPlayer('Andreas Christensen', 'CB', 29, 10),
      createPlayer('Alejandro Balde', 'LB', 22, 60),
      createPlayer('Gerard Martín', 'LB', 23, 20),
      createPlayer('Jules Koundé', 'RB', 27, 65),
      createPlayer('João Cancelo', 'RB', 31, 10),
      createPlayer('Marc Casadó', 'CDM', 22, 25),
      createPlayer('Marc Bernal', 'CDM', 18, 10),
      createPlayer('Pedri', 'CM', 23, 140),
      createPlayer('Frenkie de Jong', 'CM', 28, 45),
      createPlayer('Gavi', 'CM', 21, 40),
      createPlayer('Fermín López', 'CAM', 22, 70),
      createPlayer('Dani Olmo', 'CAM', 27, 60),
      createPlayer('Raphinha', 'LW', 29, 80),
      createPlayer('Marcus Rashford', 'LW', 28, 40),
      createPlayer('Lamine Yamal', 'RW', 18, 200),
      createPlayer('Roony Bardghji', 'RW', 20, 10),
      createPlayer('Ferran Torres', 'ST', 25, 50),
      createPlayer('Robert Lewandowski', 'ST', 37, 9)
    ]
  },

  // ========== ATLÉTICO DE MADRID ==========
  atletico_madrid: {
    name: 'Atlético de Madrid',
    shortName: 'ATM',
    city: 'Madrid',
    stadium: 'Cívitas Metropolitano',
    stadiumCapacity: 70460,
    budget: 150000000,
    reputation: 88,
    colors: { primary: '#CE3524', secondary: '#FFFFFF', accent: '#272E61' },
    players: [
      createPlayer('Jan Oblak', 'GK', 33, 17),
      createPlayer('Juan Musso', 'GK', 31, 3),
      createPlayer('Dávid Hancko', 'CB', 28, 30),
      createPlayer('Robin Le Normand', 'CB', 29, 30),
      createPlayer('Marc Pubill', 'CB', 22, 15),
      createPlayer('José María Giménez', 'CB', 31, 14),
      createPlayer('Clément Lenglet', 'CB', 30, 6),
      createPlayer('Matteo Ruggeri', 'LB', 23, 15),
      createPlayer('Marcos Llorente', 'RB', 30, 22),
      createPlayer('Nahuel Molina', 'RB', 27, 15),
      createPlayer('Johnny Cardoso', 'CDM', 24, 22),
      createPlayer('Pablo Barrios', 'CM', 22, 60),
      createPlayer('Koke', 'CM', 34, 7),
      createPlayer('Álex Baena', 'LW', 24, 55),
      createPlayer('Nico González', 'LW', 27, 24),
      createPlayer('Thiago Almada', 'LW', 24, 20),
      createPlayer('Giuliano Simeone', 'RW', 23, 40),
      createPlayer('Antoine Griezmann', 'CAM', 34, 11),
      createPlayer('Julián Alvarez', 'ST', 25, 100),
      createPlayer('Alexander Sørloth', 'ST', 30, 20)
    ]
  },

  // ========== ATHLETIC CLUB ==========
  athletic_bilbao: {
    name: 'Athletic Club',
    shortName: 'ATH',
    city: 'Bilbao',
    stadium: 'San Mamés',
    stadiumCapacity: 53289,
    budget: 90000000,
    reputation: 82,
    colors: { primary: '#EE2523', secondary: '#FFFFFF', accent: '#000000' },
    players: [
      createPlayer('Unai Simón', 'GK', 28, 25),
      createPlayer('Álex Padilla', 'GK', 22, 3),
      createPlayer('Dani Vivian', 'CB', 26, 30),
      createPlayer('Aitor Paredes', 'CB', 25, 18),
      createPlayer('Aymeric Laporte', 'CB', 31, 9),
      createPlayer('Yeray Álvarez', 'CB', 31, 1),
      createPlayer('Adama Boiro', 'LB', 23, 3),
      createPlayer('Yuri Berchiche', 'LB', 35, 1.2),
      createPlayer('Jesús Areso', 'RB', 26, 10),
      createPlayer('Andoni Gorosabel', 'RB', 29, 4),
      createPlayer('Mikel Vesga', 'CDM', 32, 1.5),
      createPlayer('Mikel Jauregizar', 'CM', 22, 30),
      createPlayer('Beñat Prados', 'CM', 24, 18),
      createPlayer('Iñigo Ruiz de Galarreta', 'CM', 32, 2.5),
      createPlayer('Oihan Sancet', 'CAM', 25, 40),
      createPlayer('Unai Gómez', 'CAM', 22, 5),
      createPlayer('Nico Williams', 'LW', 23, 60),
      createPlayer('Álex Berenguer', 'LW', 30, 5),
      createPlayer('Iñaki Williams', 'RW', 31, 10),
      createPlayer('Robert Navarro', 'RW', 23, 6),
      createPlayer('Gorka Guruzeta', 'ST', 29, 5),
      createPlayer('Maroan Sannadi', 'ST', 24, 5)
    ]
  },

  // ========== REAL SOCIEDAD ==========
  real_sociedad: {
    name: 'Real Sociedad',
    shortName: 'RSO',
    city: 'San Sebastián',
    stadium: 'Reale Arena',
    stadiumCapacity: 39500,
    budget: 70000000,
    reputation: 80,
    colors: { primary: '#0067B1', secondary: '#FFFFFF', accent: '#000000' },
    players: [
      createPlayer('Álex Remiro', 'GK', 30, 12),
      createPlayer('Marton Dani', 'GK', 26, 1.5),
      createPlayer('Nayef Aguerd', 'CB', 30, 8),
      createPlayer('Aritz Elustondo', 'CB', 28, 6),
      createPlayer('Mikel González', 'CB', 36, 0.3),
      createPlayer('Hamari Traoré', 'CB', 32, 0.3),
      createPlayer('Sergio Gómez', 'LB', 26, 7),
      createPlayer('Unai Garcés', 'LB', 19, 2),
      createPlayer('Nayel Mehssatou', 'RB', 22, 15),
      createPlayer('Álvaro Odriozola', 'RB', 30, 5),
      createPlayer('Martín Zubimendi', 'CDM', 26, 75),
      createPlayer('Luka Sucic', 'CM', 23, 30),
      createPlayer('Brais Méndez', 'CM', 28, 25),
      createPlayer('Ander Guevara', 'CM', 28, 6),
      createPlayer('Mikel Oyarzabal', 'LW', 28, 30),
      createPlayer('Takefusa Kubo', 'RW', 24, 50),
      createPlayer('Bryan Zaragoza', 'RW', 24, 3),
      createPlayer('Orri Óskarsson', 'ST', 21, 25),
      createPlayer('Ander Barrenetxea', 'ST', 23, 12),
      createPlayer('Umar Sadiq', 'ST', 28, 4)
    ]
  },

  // ========== VILLARREAL CF ==========
  villarreal: {
    name: 'Villarreal CF',
    shortName: 'VIL',
    city: 'Villarreal',
    stadium: 'Estadio de la Cerámica',
    stadiumCapacity: 23500,
    budget: 65000000,
    reputation: 78,
    colors: { primary: '#FFE114', secondary: '#005187', accent: '#005187' },
    players: [
      createPlayer('Filip Jörgensen', 'GK', 23, 22),
      createPlayer('Luiz Júnior', 'GK', 24, 4),
      createPlayer('Diego Conde', 'GK', 28, 1),
      createPlayer('Eric Bertrand', 'CB', 23, 8),
      createPlayer('Logan Costa', 'CB', 24, 6),
      createPlayer('Raúl Albiol', 'CB', 39, 0.5),
      createPlayer('Aïssa Mandi', 'CB', 33, 2),
      createPlayer('Alfonso Pedraza', 'LB', 29, 20),
      createPlayer('Álex Baena', 'LB', 24, 40),
      createPlayer('Sergi Cardona', 'LB', 26, 5),
      createPlayer('Kiko Femenía', 'RB', 34, 1),
      createPlayer('Juan Foyth', 'RB', 27, 25),
      createPlayer('Dani Parejo', 'CDM', 37, 3),
      createPlayer('Santi Comesaña', 'CDM', 28, 4),
      createPlayer('Étienne Capoue', 'CDM', 37, 1),
      createPlayer('Aleix García', 'CM', 28, 18),
      createPlayer('Gabi Veiga', 'CM', 23, 15),
      createPlayer('Thierno Barry', 'LW', 22, 18),
      createPlayer('Yeremy Pino', 'RW', 23, 35),
      createPlayer('Ilias Akhomach', 'RW', 21, 8),
      createPlayer('Gerard Moreno', 'ST', 33, 8),
      createPlayer('Arnaut Danjuma', 'ST', 28, 12)
    ]
  },

  // ========== REAL BETIS ==========
  real_betis: {
    name: 'Real Betis Balompié',
    shortName: 'BET',
    city: 'Sevilla',
    stadium: 'Benito Villamarín',
    stadiumCapacity: 60720,
    budget: 60000000,
    reputation: 77,
    colors: { primary: '#00954C', secondary: '#FFFFFF', accent: '#00954C' },
    players: [
      // Porteros
      createPlayer('Álvaro Valles', 'GK', 28, 2.5),
      createPlayer('Pau López', 'GK', 31, 2.5),
      createPlayer('Adrián', 'GK', 39, 0.4),
      // Defensas centrales
      createPlayer('Natan', 'CB', 24, 20),
      createPlayer('Valentín Gómez', 'CB', 22, 12),
      createPlayer('Diego Llorente', 'CB', 32, 3),
      createPlayer('Marc Bartra', 'CB', 35, 1),
      // Laterales
      createPlayer('Junior Firpo', 'LB', 29, 6),
      createPlayer('Ricardo Rodríguez', 'LB', 33, 1.5),
      createPlayer('Ángel Ortiz', 'RB', 21, 4),
      createPlayer('Héctor Bellerín', 'RB', 30, 2.5),
      // Centrocampistas
      createPlayer('Sofyan Amrabat', 'CDM', 29, 12),
      createPlayer('Marc Roca', 'CDM', 29, 4),
      createPlayer('Sergi Altimira', 'CM', 24, 20),
      createPlayer('Nelson Deossa', 'CM', 25, 9),
      createPlayer('Pablo Fornals', 'CM', 29, 8),
      createPlayer('Giovani Lo Celso', 'CAM', 29, 15),
      createPlayer('Isco', 'CAM', 33, 4),
      // Extremos
      createPlayer('Abde Ezzalzouli', 'LW', 24, 20),
      createPlayer('Rodrigo Riquelme', 'LW', 25, 8),
      createPlayer('Antony', 'RW', 25, 30),
      createPlayer('Pablo García', 'RW', 19, 10),
      createPlayer('Aitor Ruibal', 'RW', 29, 3.5),
      // Delanteros
      createPlayer('Cucho Hernández', 'ST', 26, 18),
      createPlayer('Chimy Ávila', 'ST', 31, 1.5),
      createPlayer('Cédric Bakambu', 'ST', 34, 1.4)
    ]
  },

  // ========== SEVILLA FC ==========
  sevilla: {
    name: 'Sevilla FC',
    shortName: 'SEV',
    city: 'Sevilla',
    stadium: 'Ramón Sánchez-Pizjuán',
    stadiumCapacity: 43883,
    budget: 55000000,
    reputation: 78,
    colors: { primary: '#FFFFFF', secondary: '#ED1C24', accent: '#ED1C24' },
    players: [
      createPlayer('Orjan Nyland', 'GK', 35, 2),
      createPlayer('Álvaro Fernández', 'GK', 26, 2),
      createPlayer('Alberto Flores', 'GK', 22, 0.5),
      createPlayer('Loïc Badé', 'CB', 25, 20),
      createPlayer('Tanguy Nianzou', 'CB', 23, 12),
      createPlayer('Marcão', 'CB', 28, 8),
      createPlayer('Kike Salas', 'CB', 23, 5),
      createPlayer('Adrià Pedrosa', 'LB', 27, 8),
      createPlayer('José Ángel Carmona', 'RB', 23, 6),
      createPlayer('Gonzalo Montiel', 'RB', 28, 8),
      createPlayer('Juanlu Sánchez', 'RB', 22, 10),
      createPlayer('Lucien Agoumé', 'CDM', 23, 8),
      createPlayer('Sambi Lokonga', 'CDM', 26, 12),
      createPlayer('Djibril Sow', 'CM', 28, 8),
      createPlayer('Suso', 'CM', 32, 4),
      createPlayer('Jesús Navas', 'CM', 40, 0.5),
      createPlayer('Dodi Lukebakio', 'LW', 28, 12),
      createPlayer('Stanis Idumbo', 'LW', 22, 6),
      createPlayer('Chidera Ejuke', 'RW', 27, 6),
      createPlayer('Peque', 'RW', 22, 7),
      createPlayer('Isaac Romero', 'ST', 24, 12),
      createPlayer('Kelechi Iheanacho', 'ST', 29, 8)
    ]
  },

  // ========== GIRONA FC ==========
  girona: {
    name: 'Girona FC',
    shortName: 'GIR',
    city: 'Girona',
    stadium: 'Montilivi',
    stadiumCapacity: 14286,
    budget: 50000000,
    reputation: 75,
    colors: { primary: '#CD2534', secondary: '#FFFFFF', accent: '#CD2534' },
    players: [
      createPlayer('Paulo Gazzaniga', 'GK', 33, 5),
      createPlayer('Juan Carlos', 'GK', 33, 0.5),
      createPlayer('Pau López', 'GK', 30, 3),
      createPlayer('Alejandro Francés', 'CB', 23, 12),
      createPlayer('David López', 'CB', 35, 1),
      createPlayer('Ladislav Krejci', 'CB', 26, 8),
      createPlayer('Santiago Bueno', 'CB', 25, 5),
      createPlayer('Miguel Gutiérrez', 'LB', 24, 35),
      createPlayer('Arnau Martínez', 'RB', 22, 28),
      createPlayer('Yan Couto', 'RB', 23, 20),
      createPlayer('Oriol Romeu', 'CDM', 34, 3),
      createPlayer('Donny van de Beek', 'CM', 28, 10),
      createPlayer('Iván Martín', 'CM', 27, 15),
      createPlayer('Jhon Solís', 'CM', 24, 8),
      createPlayer('Yangel Herrera', 'CM', 27, 6),
      createPlayer('Yaser Asprilla', 'RW', 22, 22),
      createPlayer('Bryan Gil', 'LW', 24, 12),
      createPlayer('Viktor Tsygankov', 'RW', 28, 18),
      createPlayer('Portu', 'RW', 32, 4),
      createPlayer('Abel Ruiz', 'ST', 26, 12),
      createPlayer('Arnaut Danjuma', 'ST', 28, 15),
      createPlayer('Cristhian Stuani', 'ST', 38, 0.5)
    ]
  },

  // ========== RC CELTA DE VIGO ==========
  celta_vigo: {
    name: 'RC Celta de Vigo',
    shortName: 'CEL',
    city: 'Vigo',
    stadium: 'Abanca-Balaídos',
    stadiumCapacity: 29000,
    budget: 45000000,
    reputation: 74,
    colors: { primary: '#8AC3EE', secondary: '#FFFFFF', accent: '#8AC3EE' },
    players: [
      createPlayer('Iván Villar', 'GK', 28, 3),
      createPlayer('Vicente Guaita', 'GK', 38, 1),
      createPlayer('Giorgi Mamardashvili', 'GK', 25, 2),
      createPlayer('Carl Starfelt', 'CB', 30, 5),
      createPlayer('Jailson', 'CB', 31, 2),
      createPlayer('Unai Núñez', 'CB', 28, 3),
      createPlayer('Joseph Aidoo', 'CB', 30, 1),
      createPlayer('Marcos Alonso', 'LB', 34, 2),
      createPlayer('Manu Sánchez', 'LB', 25, 5),
      createPlayer('Oscar Mingueza', 'RB', 26, 10),
      createPlayer('Hugo Álvarez', 'RB', 21, 8),
      createPlayer('Fran Beltrán', 'CDM', 26, 10),
      createPlayer('Damián Rodríguez', 'CDM', 23, 5),
      createPlayer('Ilaix Moriba', 'CM', 23, 8),
      createPlayer('Luca de la Torre', 'CM', 27, 6),
      createPlayer('Williot Swedberg', 'CM', 22, 5),
      createPlayer('Franco Cervi', 'LW', 31, 4),
      createPlayer('Iago Aspas', 'CAM', 38, 3),
      createPlayer('Anastasios Douvikas', 'ST', 26, 15),
      createPlayer('Borja Iglesias', 'ST', 32, 6),
      createPlayer('Pablo Durán', 'RW', 22, 7),
      createPlayer('Tasos Douvikas', 'ST', 26, 12)
    ]
  },

  // ========== VALENCIA CF ==========
  valencia: {
    name: 'Valencia CF',
    shortName: 'VAL',
    city: 'Valencia',
    stadium: 'Mestalla',
    stadiumCapacity: 49430,
    budget: 40000000,
    reputation: 76,
    colors: { primary: '#FFFFFF', secondary: '#000000', accent: '#FFAA00' },
    players: [
      createPlayer('Giorgi Mamardashvili', 'GK', 25, 40),
      createPlayer('Stole Dimitrievski', 'GK', 32, 2),
      createPlayer('Cristhian Mosquera', 'CB', 21, 30),
      createPlayer('Yarek Gasiorowski', 'CB', 20, 12),
      createPlayer('César Tárrega', 'CB', 23, 4),
      createPlayer('Hugo Guillamón', 'CB', 25, 3),
      createPlayer('Mouctar Diakhaby', 'CB', 28, 1.5),
      createPlayer('Jesús Vázquez', 'LB', 22, 5),
      createPlayer('José Gayà', 'LB', 31, 3),
      createPlayer('Thierry Correia', 'RB', 26, 4),
      createPlayer('Dimitri Foulquier', 'RB', 31, 2.5),
      createPlayer('Pepelu', 'CDM', 27, 15),
      createPlayer('André Almeida', 'CM', 26, 8),
      createPlayer('Enzo Barrenechea', 'CM', 24, 7),
      createPlayer('Javi Guerra', 'CM', 22, 4.5),
      createPlayer('Diego López', 'LW', 23, 12),
      createPlayer('Sergi Canós', 'LW', 28, 3.5),
      createPlayer('Rafa Mir', 'ST', 28, 4),
      createPlayer('Hugo Duro', 'ST', 26, 5)
    ]
  },

  // ========== UD LAS PALMAS ==========
  las_palmas: {
    name: 'UD Las Palmas',
    shortName: 'LPA',
    city: 'Las Palmas',
    stadium: 'Gran Canaria',
    stadiumCapacity: 32392,
    budget: 35000000,
    reputation: 70,
    colors: { primary: '#FFE000', secondary: '#005BA6', accent: '#005BA6' },
    players: [
      createPlayer('Jasper Cillessen', 'GK', 36, 1),
      createPlayer('Álvaro Valles', 'GK', 27, 10),
      createPlayer('Sergi Cardona', 'CB', 26, 2.5),
      createPlayer('Scott McKenna', 'CB', 29, 4),
      createPlayer('Álex Suárez', 'CB', 32, 1.5),
      createPlayer('Mika Mármol', 'CB', 25, 3.5),
      createPlayer('Daley Sinkgraven', 'LB', 30, 1),
      createPlayer('Marvin Park', 'LB', 24, 2.5),
      createPlayer('Álex Muñoz', 'RB', 30, 2.5),
      createPlayer('Viti', 'RB', 23, 1.5),
      createPlayer('Manu Fuster', 'CDM', 32, 0.7),
      createPlayer('Kirian Rodríguez', 'CM', 30, 1.8),
      createPlayer('Enzo Loiodice', 'CM', 24, 2.5),
      createPlayer('Javi Muñoz', 'CM', 30, 1.5),
      createPlayer('Alberto Moleiro', 'LW', 22, 18),
      createPlayer('Sandro Ramírez', 'LW', 30, 0.8),
      createPlayer('Fabio González', 'RW', 24, 2),
      createPlayer('Marc Cardona', 'ST', 29, 0.8),
      createPlayer('Oli McBurnie', 'ST', 29, 3)
    ]
  },

  // ========== RAYO VALLECANO ==========
  rayo_vallecano: {
    name: 'Rayo Vallecano',
    shortName: 'RAY',
    city: 'Madrid',
    stadium: 'Estadio de Vallecas',
    stadiumCapacity: 14708,
    budget: 30000000,
    reputation: 68,
    colors: { primary: '#FFFFFF', secondary: '#E53027', accent: '#E53027' },
    players: [
      createPlayer('Augusto Batalla', 'GK', 28, 4),
      createPlayer('Dani Cárdenas', 'GK', 26, 1),
      createPlayer('Diego López', 'GK', 33, 0.5),
      createPlayer('Florian Lejeune', 'CB', 34, 2.5),
      createPlayer('Aridane Hernández', 'CB', 36, 1),
      createPlayer('Esteban Saveljich', 'CB', 33, 1.2),
      createPlayer('Pelayo Fernández', 'CB', 25, 4),
      createPlayer('Abdul Mumin', 'CB', 26, 5),
      createPlayer('Andrei Ratiu', 'RB', 27, 20),
      createPlayer('Alfonso Espino', 'LB', 32, 1.5),
      createPlayer('Pathé Ciss', 'RB', 31, 1),
      createPlayer('Iván Balliu', 'RB', 32, 2),
      createPlayer('Óscar Valentín', 'CDM', 30, 4),
      createPlayer('Unai López', 'CM', 30, 4),
      createPlayer('Óscar Trejo', 'CM', 36, 1),
      createPlayer('Gonzalo Melero', 'CM', 30, 3),
      createPlayer('James Rodríguez', 'CAM', 34, 4),
      createPlayer('Jorge de Frutos', 'RW', 28, 8),
      createPlayer('Álvaro García', 'LW', 32, 5),
      createPlayer('Isi Palazón', 'RW', 30, 6),
      createPlayer('Randy Nteka', 'ST', 26, 5),
      createPlayer('Sergio Camello', 'ST', 24, 7),
      createPlayer('Raúl de Tomás', 'ST', 31, 4)
    ]
  },

  // ========== CD LEGANÉS ==========
  leganes: {
    name: 'CD Leganés',
    shortName: 'LEG',
    city: 'Leganés',
    stadium: 'Butarque',
    stadiumCapacity: 12454,
    budget: 25000000,
    reputation: 65,
    colors: { primary: '#005BBF', secondary: '#FFFFFF', accent: '#005BBF' },
    players: [
      createPlayer('Juan Soriano', 'GK', 29, 3),
      createPlayer('Marko Dmitrovic', 'GK', 34, 1),
      createPlayer('Óscar Plano', 'GK', 32, 0.5),
      createPlayer('Jorge Sáenz', 'CB', 28, 3),
      createPlayer('Jackson Porozo', 'CB', 24, 2),
      createPlayer('Sergio González', 'CB', 34, 0.8),
      createPlayer('Matija Nastasic', 'CB', 32, 2),
      createPlayer('Enric Franquesa', 'LB', 27, 3),
      createPlayer('Javi Hernández', 'LB', 29, 2),
      createPlayer('Valentin Rosier', 'RB', 29, 4),
      createPlayer('Jon Karrikaburu', 'RB', 26, 2),
      createPlayer('Yvan Neyou', 'CDM', 29, 3),
      createPlayer('Renato Tapia', 'CDM', 29, 4),
      createPlayer('Seydouba Cissé', 'CM', 24, 3),
      createPlayer('Dani Raba', 'CM', 29, 2),
      createPlayer('Roberto López', 'CM', 27, 2),
      createPlayer('Óscar Rodríguez', 'CAM', 26, 4),
      createPlayer('Juan Cruz', 'LW', 27, 6),
      createPlayer('Diego García', 'RW', 27, 3),
      createPlayer('Munir El Haddadi', 'LW', 30, 3),
      createPlayer('Miguel de la Fuente', 'ST', 26, 6),
      createPlayer('Sebastián Haller', 'ST', 31, 5),
      createPlayer('Dani Gómez', 'ST', 26, 4)
    ]
  },

  // ========== ELCHE CF ==========
  elche: {
    name: 'Elche CF',
    shortName: 'ELC',
    city: 'Elche',
    stadium: 'Martínez Valero',
    stadiumCapacity: 33732,
    budget: 30000000,
    reputation: 66,
    colors: { primary: '#008847', secondary: '#FFFFFF', accent: '#008847' },
    players: [
      createPlayer('Iñaki Peña', 'GK', 26, 8),
      createPlayer('Alejandro Iturbe', 'GK', 22, 2),
      createPlayer('Matías Dituro', 'GK', 38, 0.2),
      createPlayer('David Affengruber', 'CB', 24, 9),
      createPlayer('Víctor Chust', 'CB', 25, 4),
      createPlayer('John Donald', 'CB', 25, 1),
      createPlayer('Bambo Diaby', 'CB', 28, 0.8),
      createPlayer('Adrià Pedrosa', 'LB', 27, 4),
      createPlayer('Léo Pétrot', 'LB', 28, 1.5),
      createPlayer('Héctor Fort', 'RB', 19, 12),
      createPlayer('Álvaro Núñez', 'RB', 25, 6),
      createPlayer('Federico Redondo', 'CDM', 23, 4),
      createPlayer('Marc Aguado', 'CDM', 25, 3),
      createPlayer('Rodrigo Mendoza', 'CM', 20, 15),
      createPlayer('Martim Neto', 'CM', 23, 5),
      createPlayer('Aleix Febas', 'CM', 29, 4),
      createPlayer('Germán Valera', 'LW', 23, 5),
      createPlayer('Lucas Cepeda', 'LW', 23, 3.2),
      createPlayer('Grady Diangana', 'RW', 27, 3.5),
      createPlayer('Rafa Mir', 'ST', 28, 4),
      createPlayer('Álvaro Rodríguez', 'ST', 21, 4),
      createPlayer('André Silva', 'ST', 30, 3)
    ]
  },

  // ========== RCD ESPANYOL ==========
  espanyol: {
    name: 'RCD Espanyol',
    shortName: 'ESP',
    city: 'Barcelona',
    stadium: 'RCDE Stadium',
    stadiumCapacity: 40000,
    budget: 28000000,
    reputation: 68,
    colors: { primary: '#007FC8', secondary: '#FFFFFF', accent: '#007FC8' },
    players: [
      createPlayer('Marko Dmitrovic', 'GK', 34, 0.8),
      createPlayer('Ángel Fortuño', 'GK', 24, 0.3),
      createPlayer('Clemens Riedel', 'CB', 22, 5),
      createPlayer('Fernando Calero', 'CB', 30, 2),
      createPlayer('Miguel Rubio', 'CB', 27, 2),
      createPlayer('Leandro Cabrera', 'CB', 34, 1),
      createPlayer('Carlos Romero', 'LB', 24, 15),
      createPlayer('José Salinas', 'LB', 25, 2.8),
      createPlayer('Omar El Hilali', 'RB', 22, 15),
      createPlayer('Rubén Sánchez', 'RB', 24, 1.5),
      createPlayer('Urko González', 'CDM', 24, 5),
      createPlayer('Charles Pickel', 'CDM', 28, 2.5),
      createPlayer('Pol Lozano', 'CM', 26, 6),
      createPlayer('Edu Expósito', 'CM', 29, 4),
      createPlayer('Ramón Terrats', 'CM', 25, 3),
      createPlayer('Javi Puado', 'LW', 27, 10),
      createPlayer('Pere Milla', 'LW', 33, 1.2),
      createPlayer('Tyrhys Dolan', 'RW', 24, 10),
      createPlayer('Jofre Carreras', 'RW', 24, 3),
      createPlayer('Roberto Fernández', 'ST', 23, 10),
      createPlayer('Kike García', 'ST', 36, 0.8)
    ]
  },

  // ========== CA OSASUNA ==========
  osasuna: {
    name: 'CA Osasuna',
    shortName: 'OSA',
    city: 'Pamplona',
    stadium: 'El Sadar',
    stadiumCapacity: 23576,
    budget: 28000000,
    reputation: 70,
    colors: { primary: '#D91A21', secondary: '#001E62', accent: '#001E62' },
    players: [
      createPlayer('Sergio Herrera', 'GK', 32, 3),
      createPlayer('Aitor Fernández', 'GK', 34, 0.6),
      createPlayer('Enzo Boyomo', 'CB', 24, 20),
      createPlayer('Jorge Herrando', 'CB', 24, 3.5),
      createPlayer('Alejandro Catena', 'CB', 31, 2.8),
      createPlayer('Abel Bretones', 'LB', 25, 4.5),
      createPlayer('Javi Galán', 'LB', 31, 3.5),
      createPlayer('Juan Cruz', 'LB', 33, 1.2),
      createPlayer('Valentin Rosier', 'RB', 29, 3),
      createPlayer('Lucas Torró', 'CDM', 31, 2.8),
      createPlayer('Iker Muñoz', 'CDM', 23, 2),
      createPlayer('Jon Moncayola', 'CM', 27, 7),
      createPlayer('Asier Osambela', 'CM', 21, 1),
      createPlayer('Aimar Oroz', 'CAM', 24, 9),
      createPlayer('Moi Gómez', 'CAM', 31, 1.8),
      createPlayer('Víctor Muñoz', 'LW', 22, 10),
      createPlayer('Raúl Moro', 'LW', 23, 7),
      createPlayer('Sheraldo Becker', 'LW', 30, 1.5),
      createPlayer('Rubén García', 'RW', 32, 1.8),
      createPlayer('Raúl García', 'ST', 25, 3),
      createPlayer('Ante Budimir', 'ST', 34, 3)
    ]
  },

  // ========== LEVANTE UD ==========
  levante: {
    name: 'Levante UD',
    shortName: 'LEV',
    city: 'Valencia',
    stadium: 'Ciutat de València',
    stadiumCapacity: 26354,
    budget: 26000000,
    reputation: 67,
    colors: { primary: '#004D98', secondary: '#CE1126', accent: '#FFFFFF' },
    players: [
      createPlayer('Mathew Ryan', 'GK', 33, 2),
      createPlayer('Pablo Campos', 'GK', 23, 1.5),
      createPlayer('Matías Moreno', 'CB', 22, 4),
      createPlayer('Alan Matturro', 'CB', 21, 4),
      createPlayer('Adrián Dela', 'CB', 26, 2),
      createPlayer('Unai Elgezabal', 'CB', 32, 0.6),
      createPlayer('Manu Sánchez', 'LB', 25, 6),
      createPlayer('Diego Pampín', 'LB', 25, 1.2),
      createPlayer('Jeremy Toljan', 'RB', 31, 2.2),
      createPlayer('Víctor García', 'RB', 28, 1),
      createPlayer('Ugo Raghouber', 'CDM', 22, 3),
      createPlayer('Oriol Rey', 'CDM', 27, 2),
      createPlayer('Pablo Martínez', 'CM', 27, 2),
      createPlayer('Unai Vencedor', 'CM', 25, 2),
      createPlayer('Jon Ander Olasagasti', 'CM', 25, 1.8),
      createPlayer('Roger Brugué', 'LW', 29, 2),
      createPlayer('Carlos Álvarez', 'RW', 22, 15),
      createPlayer('Iker Losada', 'CAM', 24, 1.4),
      createPlayer('Karl Etta Eyong', 'ST', 22, 20),
      createPlayer('Iván Romero', 'ST', 24, 7.5),
      createPlayer('José Luis Morales', 'ST', 38, 0.4)
    ]
  },

  // ========== RCD MALLORCA ==========
  mallorca: {
    name: 'RCD Mallorca',
    shortName: 'MLL',
    city: 'Palma',
    stadium: 'Son Moix',
    stadiumCapacity: 23142,
    budget: 28000000,
    reputation: 69,
    colors: { primary: '#E30613', secondary: '#000000', accent: '#FFCD00' },
    players: [
      createPlayer('Leo Román', 'GK', 25, 5),
      createPlayer('Lucas Bergström', 'GK', 23, 1.5),
      createPlayer('Marash Kumbulla', 'CB', 25, 5),
      createPlayer('Martin Valjent', 'CB', 30, 4.5),
      createPlayer('Antonio Raíllo', 'CB', 34, 1.5),
      createPlayer('Johan Mojica', 'LB', 33, 1.8),
      createPlayer('Toni Lato', 'LB', 28, 1.5),
      createPlayer('Pablo Maffeo', 'RB', 28, 5),
      createPlayer('Mateu Morey', 'RB', 25, 1.5),
      createPlayer('Samú Costa', 'CDM', 25, 15),
      createPlayer('Omar Mascarell', 'CDM', 32, 0.8),
      createPlayer('Sergi Darder', 'CM', 32, 3.5),
      createPlayer('Antonio Sánchez', 'CM', 28, 2.4),
      createPlayer('Manu Morlanes', 'CM', 27, 2.4),
      createPlayer('Pablo Torre', 'CAM', 22, 5),
      createPlayer('Jan Virgili', 'LW', 19, 12),
      createPlayer('Takuma Asano', 'RW', 31, 1.8),
      createPlayer('Vedat Muriqi', 'ST', 31, 4.5),
      createPlayer('Mateo Joseph', 'ST', 22, 3.5),
      createPlayer('Abdón Prats', 'ST', 33, 0.9)
    ]
  },

  // ========== GETAFE CF ==========
  getafe: {
    name: 'Getafe CF',
    shortName: 'GET',
    city: 'Getafe',
    stadium: 'Coliseum Alfonso Pérez',
    stadiumCapacity: 17393,
    budget: 25000000,
    reputation: 67,
    colors: { primary: '#004999', secondary: '#FFFFFF', accent: '#004999' },
    players: [
      createPlayer('David Soria', 'GK', 32, 3),
      createPlayer('Jiri Letacek', 'GK', 27, 2),
      createPlayer('Abdel Abqar', 'CB', 26, 6),
      createPlayer('Sebastián Boselli', 'CB', 22, 2.8),
      createPlayer('Zaid Romero', 'CB', 26, 2),
      createPlayer('Dakonam Djené', 'CB', 34, 1.6),
      createPlayer('Diego Rico', 'LB', 32, 1.2),
      createPlayer('Davinchi', 'LB', 18, 1),
      createPlayer('Juan Iglesias', 'RB', 27, 5),
      createPlayer('Kiko Femenía', 'RB', 34, 0.8),
      createPlayer('Allan Nyom', 'RB', 37, 0.2),
      createPlayer('Mario Martín', 'CDM', 21, 5),
      createPlayer('Yvan Neyou', 'CDM', 29, 2.5),
      createPlayer('Mauro Arambarri', 'CM', 30, 10),
      createPlayer('Luis Milla', 'CM', 31, 3.5),
      createPlayer('Javi Muñoz', 'CM', 30, 1.5),
      createPlayer('Adrián Liso', 'LW', 20, 8),
      createPlayer('Coba da Costa', 'LW', 23, 2.5),
      createPlayer('Abu Kamara', 'RW', 22, 3),
      createPlayer('Borja Mayoral', 'ST', 28, 7.5),
      createPlayer('Martín Satriano', 'ST', 24, 6)
    ]
  },

  // ========== DEPORTIVO ALAVÉS ==========
  alaves: {
    name: 'Deportivo Alavés',
    shortName: 'ALA',
    city: 'Vitoria-Gasteiz',
    stadium: 'Mendizorroza',
    stadiumCapacity: 19840,
    budget: 24000000,
    reputation: 66,
    colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' },
    players: [
      createPlayer('Antonio Sivera', 'GK', 29, 6),
      createPlayer('Raúl Fernández', 'GK', 37, 0.2),
      createPlayer('Jon Pacheco', 'CB', 25, 5),
      createPlayer('Moussa Diarra', 'CB', 25, 1.5),
      createPlayer('Nikola Maras', 'CB', 30, 0.8),
      createPlayer('Youssef Enríquez', 'LB', 20, 5),
      createPlayer('Victor Parada', 'LB', 23, 2),
      createPlayer('Nahuel Tenaglia', 'RB', 29, 3),
      createPlayer('Jonny Otto', 'RB', 31, 2.5),
      createPlayer('Antonio Blanco', 'CDM', 25, 10),
      createPlayer('Carlos Protesoni', 'CDM', 27, 1),
      createPlayer('Ander Guevara', 'CM', 28, 3),
      createPlayer('Carles Aleñá', 'CM', 28, 3),
      createPlayer('Pablo Ibáñez', 'CM', 27, 3),
      createPlayer('Jon Guridi', 'CM', 30, 2.5),
      createPlayer('Denis Suárez', 'CAM', 32, 1.2),
      createPlayer('Abde Rebbach', 'LW', 27, 1.5),
      createPlayer('Carlos Vicente', 'RW', 26, 7),
      createPlayer('Lucas Boyé', 'ST', 29, 5),
      createPlayer('Toni Martínez', 'ST', 28, 3.5),
      createPlayer('Mariano Díaz', 'ST', 32, 0.8)
    ]
  },

  // ========== REAL OVIEDO ==========
  oviedo: {
    name: 'Real Oviedo',
    shortName: 'OVI',
    city: 'Oviedo',
    stadium: 'Carlos Tartiere',
    stadiumCapacity: 30500,
    budget: 22000000,
    reputation: 64,
    colors: { primary: '#005BA6', secondary: '#FFFFFF', accent: '#005BA6' },
    players: [
      createPlayer('Horatiu Moldovan', 'GK', 28, 2),
      createPlayer('Aarón Escandell', 'GK', 30, 2),
      createPlayer('David Carmo', 'CB', 26, 10),
      createPlayer('Eric Bailly', 'CB', 31, 1.5),
      createPlayer('David Costas', 'CB', 30, 1.4),
      createPlayer('Dani Calvo', 'CB', 31, 1),
      createPlayer('Javi López', 'LB', 23, 5),
      createPlayer('Rahim Alhassane', 'LB', 24, 2),
      createPlayer('Nacho Vidal', 'RB', 31, 1.6),
      createPlayer('Lucas Ahijado', 'RB', 30, 0.7),
      createPlayer('Leander Dendoncker', 'CDM', 30, 4),
      createPlayer('Santiago Colombatto', 'CDM', 29, 3),
      createPlayer('Alberto Reina', 'CM', 28, 1.5),
      createPlayer('Kwasi Sibo', 'CM', 27, 1.4),
      createPlayer('Santi Cazorla', 'CM', 41, 0.2),
      createPlayer('Luka Ilic', 'CAM', 26, 2),
      createPlayer('Thiago Fernández', 'LW', 21, 4.5),
      createPlayer('Ilyas Chaira', 'LW', 24, 4),
      createPlayer('Josip Brekalo', 'LW', 27, 2.5),
      createPlayer('Haissem Hassan', 'RW', 23, 5),
      createPlayer('Federico Viñas', 'ST', 27, 4),
      createPlayer('Thiago Borbas', 'ST', 23, 4)
    ]
  }
};

// ============================================================
// JUGADORES LIBRES
// ============================================================
export const freeAgents = [
  createPlayer('Ángel Di María', 'RW', 37, 3),
  createPlayer('Memphis Depay', 'ST', 31, 8),
  createPlayer('Mario Hermoso', 'CB', 30, 10),
  createPlayer('Adrien Rabiot', 'CM', 30, 20),
  createPlayer('Sergio Busquets', 'CDM', 37, 1),
  createPlayer('Jordi Alba', 'LB', 36, 2),
  createPlayer('Nacho Fernández', 'CB', 35, 3),
  createPlayer('Sergio Rico', 'GK', 31, 1.5),
  createPlayer('Munir El Haddadi', 'ST', 30, 2),
  createPlayer('Marouane Fellaini', 'CM', 38, 0.3),
  createPlayer('Ezequiel Garay', 'CB', 38, 0.2),
  createPlayer('Nani', 'LW', 39, 0.3),
  createPlayer('Willian', 'RW', 37, 1),
  createPlayer('Thiago Alcántara', 'CM', 34, 2),
  createPlayer('Cesc Fàbregas', 'CM', 38, 0.3)
];

// ============================================================
// EXPORTAR ARRAY DE EQUIPOS
// ============================================================
export const teamsArray = Object.entries(teams).map(([id, team]) => ({
  id,
  ...team
}));

// ============================================================
// IMPORTS DE OTRAS LIGAS
// ============================================================
import { segundaTeamsArray } from './teams-segunda.js';
import { primeraRFEFTeamsArray, primeraRFEFGroups } from './teams-primera-rfef.js';
import { segundaRFEFTeamsArray, segundaRFEFGroups } from './teams-segunda-rfef.js';
import { premierTeamsArray } from './teams-premier.js';
import { serieATeams } from './teams-seriea.js';
import { bundesligaTeams } from './teams-bundesliga.js';
import { ligue1Teams } from './teams-ligue1.js';
import { eredivisieTeams } from './teams-eredivisie.js';
import { primeiraLigaTeams } from './teams-primeira-liga.js';
import { championshipTeams } from './teams-championship.js';
import { belgianProTeams } from './teams-belgian-pro.js';
import { superLigTeams } from './teams-super-lig.js';
import { scottishPremTeams } from './teams-scottish-prem.js';
import { serieBTeams } from './teams-serie-b.js';
import { bundesliga2Teams } from './teams-bundesliga2.js';
import { ligue2Teams } from './teams-ligue2.js';
import { swissTeams } from './teams-swiss.js';
import { austrianTeams } from './teams-austrian.js';
import { greekTeams } from './teams-greek.js';
import { danishTeams } from './teams-danish.js';
import { croatianTeams } from './teams-croatian.js';
import { czechTeams } from './teams-czech.js';

// ============================================================
// EXPORTS PARA COMPONENTES (con datos reales)
// ============================================================

// La Liga (Primera División) - 20 equipos
export const LALIGA_TEAMS = teamsArray;

// Segunda División - importar de archivo
export const SEGUNDA_TEAMS = segundaTeamsArray || [];

// Primera RFEF y Segunda RFEF
export const PRIMERA_RFEF_TEAMS = primeraRFEFTeamsArray || [];
export const SEGUNDA_RFEF_TEAMS = segundaRFEFTeamsArray || [];
export const PRIMERA_RFEF_GROUPS = primeraRFEFGroups;
export const SEGUNDA_RFEF_GROUPS = segundaRFEFGroups;

// Premier League
export const PREMIER_LEAGUE_TEAMS = premierTeamsArray || [];

// Bundesliga
export const BUNDESLIGA_TEAMS = bundesligaTeams || [];

// Serie A
export const SERIE_A_TEAMS = serieATeams || [];

// Ligue 1
export const LIGUE1_TEAMS = ligue1Teams || [];

// Other European leagues
export const EREDIVISIE_TEAMS = eredivisieTeams || [];
export const PRIMEIRA_LIGA_TEAMS = primeiraLigaTeams || [];
export const CHAMPIONSHIP_TEAMS = championshipTeams || [];
export const BELGIAN_PRO_TEAMS = belgianProTeams || [];
export const SUPER_LIG_TEAMS = superLigTeams || [];
export const SCOTTISH_PREM_TEAMS = scottishPremTeams || [];
export const SERIE_B_TEAMS = serieBTeams || [];
export const BUNDESLIGA2_TEAMS = bundesliga2Teams || [];
export const LIGUE2_TEAMS = ligue2Teams || [];
export const SWISS_TEAMS = swissTeams || [];
export const AUSTRIAN_TEAMS = austrianTeams || [];
export const GREEK_TEAMS = greekTeams || [];
export const DANISH_TEAMS = danishTeams || [];
export const CROATIAN_TEAMS = croatianTeams || [];
export const CZECH_TEAMS = czechTeams || [];

// Definición de ligas
export const LEAGUES = {
  laliga: { id: 'laliga', name: 'La Liga', country: 'spain', level: 1 },
  segunda: { id: 'segunda', name: 'La Liga 2', country: 'spain', level: 2 },
  primeraRFEF: { id: 'primeraRFEF', name: 'Primera RFEF', country: 'spain', level: 3 },
  segundaRFEF: { id: 'segundaRFEF', name: 'Segunda RFEF', country: 'spain', level: 4 },
  premierLeague: { id: 'premierLeague', name: 'Premier League', country: 'england', level: 1 },
  bundesliga: { id: 'bundesliga', name: 'Bundesliga', country: 'germany', level: 1 },
  serieA: { id: 'serieA', name: 'Serie A', country: 'italy', level: 1 },
  ligue1: { id: 'ligue1', name: 'Ligue 1', country: 'france', level: 1 },
  eredivisie: { id: 'eredivisie', name: 'Eredivisie', country: 'netherlands', level: 1 },
  primeiraLiga: { id: 'primeiraLiga', name: 'Primeira Liga', country: 'portugal', level: 1 },
  championship: { id: 'championship', name: 'Championship', country: 'england', level: 2 },
  belgianPro: { id: 'belgianPro', name: 'Jupiler Pro League', country: 'belgium', level: 1 },
  superLig: { id: 'superLig', name: 'Süper Lig', country: 'turkey', level: 1 },
  scottishPrem: { id: 'scottishPrem', name: 'Scottish Premiership', country: 'scotland', level: 1 },
  serieB: { id: 'serieB', name: 'Serie B', country: 'italy', level: 2 },
  bundesliga2: { id: 'bundesliga2', name: '2. Bundesliga', country: 'germany', level: 2 },
  ligue2: { id: 'ligue2', name: 'Ligue 2', country: 'france', level: 2 },
  swissSuperLeague: { id: 'swissSuperLeague', name: 'Super League', country: 'switzerland', level: 1 },
  austrianBundesliga: { id: 'austrianBundesliga', name: 'Bundesliga (Austria)', country: 'austria', level: 1 },
  greekSuperLeague: { id: 'greekSuperLeague', name: 'Super League', country: 'greece', level: 1 },
  danishSuperliga: { id: 'danishSuperliga', name: 'Superligaen', country: 'denmark', level: 1 },
  croatianLeague: { id: 'croatianLeague', name: 'HNL', country: 'croatia', level: 1 },
  czechLeague: { id: 'czechLeague', name: 'Chance Liga', country: 'czechia', level: 1 }
};

// Helper para obtener equipos por liga
export function getTeamsByLeague(leagueId) {
  switch (leagueId) {
    case 'laliga': return LALIGA_TEAMS;
    case 'segunda': return SEGUNDA_TEAMS;
    case 'premierLeague': return PREMIER_LEAGUE_TEAMS;
    case 'bundesliga': return BUNDESLIGA_TEAMS;
    case 'serieA': return SERIE_A_TEAMS;
    case 'ligue1': return LIGUE1_TEAMS;
    case 'eredivisie': return EREDIVISIE_TEAMS;
    case 'primeiraLiga': return PRIMEIRA_LIGA_TEAMS;
    case 'championship': return CHAMPIONSHIP_TEAMS;
    case 'belgianPro': return BELGIAN_PRO_TEAMS;
    case 'superLig': return SUPER_LIG_TEAMS;
    case 'scottishPrem': return SCOTTISH_PREM_TEAMS;
    case 'serieB': return SERIE_B_TEAMS;
    case 'bundesliga2': return BUNDESLIGA2_TEAMS;
    case 'ligue2': return LIGUE2_TEAMS;
    case 'swissSuperLeague': return SWISS_TEAMS;
    case 'austrianBundesliga': return AUSTRIAN_TEAMS;
    case 'greekSuperLeague': return GREEK_TEAMS;
    case 'danishSuperliga': return DANISH_TEAMS;
    case 'croatianLeague': return CROATIAN_TEAMS;
    case 'czechLeague': return CZECH_TEAMS;
    default: return [];
  }
}

export default teams;
