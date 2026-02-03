// ============================================================
// PC FÚTBOL WEB - EQUIPOS SEGUNDA DIVISIÓN 25/26
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
  const annual = valueM * 1000000 * 0.10;
  const weekly = annual / 52;
  return Math.max(10000, Math.round(weekly));
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

export const segundaTeams = {
  // ========== RC DEPORTIVO ==========
  deportivo: {
    name: 'RC Deportivo', shortName: 'DEP', city: 'A Coruña',
    stadium: 'Riazor', stadiumCapacity: 32912,
    budget: 15000000, reputation: 70, league: 'segunda',
    colors: { primary: '#005BAC', secondary: '#FFFFFF' },
    players: [
      createPlayer('Álvaro Fernández', 'POR', 27, 1.8, 64),
      createPlayer('Daniel Bachmann', 'POR', 31, 0.6, 62),
      createPlayer('Germán Parreño', 'POR', 32, 0.3, 61),
      createPlayer('Lucas Noubi', 'DFC', 21, 1.5, 66),
      createPlayer('Dani Barcia', 'DFC', 23, 1.2, 64),
      createPlayer('Arnau Comas', 'DFC', 25, 0.5, 62),
      createPlayer('Giacomo Quagliata', 'LB', 25, 1.5, 64),
      createPlayer('Sergio Escudero', 'LB', 36, 0.1, 60),
      createPlayer('Adrià Altimira', 'RB', 24, 1.4, 64),
      createPlayer('Miguel Loureiro', 'RB', 29, 1.0, 64),
      createPlayer('José Gragera', 'MC', 25, 1.5, 64),
      createPlayer('Diego Villares', 'MC', 29, 0.8, 62),
      createPlayer('Charlie Patiño', 'MC', 22, 0.6, 62),
      createPlayer('Rubén López', 'MC', 21, 0.5, 64),
      createPlayer('Mario Soriano', 'MCO', 23, 2.0, 67),
      createPlayer('Yeremay Hernández', 'EI', 23, 25.0, 79),
      createPlayer('David Mella', 'ED', 20, 5.0, 72),
      createPlayer('Luismi Cruz', 'ED', 24, 1.4, 64),
      createPlayer('Stoichkov', 'MCO', 32, 0.9, 61),
      createPlayer('Samuele Mulattieri', 'DC', 25, 3.0, 67),
      createPlayer('Zakaria Eddahchouri', 'DC', 25, 2.0, 67)
    ]
  },

  // ========== RACING SANTANDER ==========
  racing_santander: {
    name: 'Racing de Santander', shortName: 'RAC', city: 'Santander',
    stadium: 'El Sardinero', stadiumCapacity: 22222,
    budget: 12000000, reputation: 68, league: 'segunda',
    colors: { primary: '#00A651', secondary: '#FFFFFF' },
    players: [
      createPlayer('Jokin Ezkieta', 'POR', 29, 2.5, 67),
      createPlayer('Simon Eriksson', 'POR', 19, 1.5, 66),
      createPlayer('Facundo González', 'DFC', 22, 3.0, 67),
      createPlayer('Javi Castro', 'DFC', 25, 1.8, 64),
      createPlayer('Manu Hernando', 'DFC', 27, 1.4, 64),
      createPlayer('Pablo Ramón', 'DFC', 24, 0.6, 62),
      createPlayer('Jorge Salinas', 'LB', 18, 4.0, 72),
      createPlayer('Mario García', 'LB', 22, 0.9, 62),
      createPlayer('Clément Michelin', 'RB', 28, 1.5, 64),
      createPlayer('Álvaro Mantilla', 'RB', 25, 0.7, 62),
      createPlayer('Damián Rodríguez', 'MCD', 22, 2.0, 67),
      createPlayer('Maguette Gueye', 'MCD', 23, 1.0, 64),
      createPlayer('Gustavo Puerta', 'MC', 22, 3.5, 67),
      createPlayer('Aritz Aldasoro', 'MC', 26, 2.0, 67),
      createPlayer('Peio Canales', 'MCO', 21, 5.0, 72),
      createPlayer('Iñigo Vicente', 'EI', 28, 4.0, 70),
      createPlayer('Andrés Martín', 'ED', 26, 5.0, 70),
      createPlayer('Asier Villalibre', 'DC', 28, 2.0, 67),
      createPlayer('Juan Carlos Arana', 'DC', 25, 1.8, 64),
      createPlayer('Giorgi Guliashvili', 'DC', 24, 1.3, 64)
    ]
  },

  // ========== UD ALMERÍA ==========
  almeria: {
    name: 'UD Almería', shortName: 'ALM', city: 'Almería',
    stadium: 'Power Horse Stadium', stadiumCapacity: 15000,
    budget: 14000000, reputation: 68, league: 'segunda',
    colors: { primary: '#ED1C24', secondary: '#FFFFFF' },
    players: [
      createPlayer('Fernando Martínez', 'POR', 35, 0.2, 60),
      createPlayer('Andrés Fernández', 'POR', 39, 0.1, 60),
      createPlayer('Federico Bonini', 'DFC', 24, 3.0, 67),
      createPlayer('Chumi', 'DFC', 26, 1.0, 64),
      createPlayer('Nélson Monte', 'DFC', 30, 0.5, 62),
      createPlayer('Álex Muñoz', 'LB', 31, 1.0, 64),
      createPlayer('Álex Centelles', 'LB', 26, 0.8, 62),
      createPlayer('Daijiro Chirino', 'RB', 24, 1.5, 64),
      createPlayer('Dion Lopy', 'MCD', 23, 4.0, 70),
      createPlayer('André Horta', 'MC', 29, 2.0, 67),
      createPlayer('Arnau Puigmal', 'MC', 25, 1.5, 64),
      createPlayer('Iddrisu Baba', 'MC', 30, 1.0, 64),
      createPlayer('Sergio Arribas', 'MCO', 24, 10.0, 73),
      createPlayer('Nico Melamed', 'MCO', 24, 3.0, 67),
      createPlayer('Jon Morcillo', 'EI', 27, 2.0, 67),
      createPlayer('Patrick Soko', 'ED', 28, 1.2, 64),
      createPlayer('Thalys', 'DC', 20, 6.0, 72),
      createPlayer('Miguel de la Fuente', 'DC', 26, 2.0, 67),
      createPlayer('Léo Baptistão', 'DC', 33, 0.8, 61)
    ]
  },

  // ========== REAL VALLADOLID ==========
  valladolid: {
    name: 'Real Valladolid', shortName: 'VLL', city: 'Valladolid',
    stadium: 'José Zorrilla', stadiumCapacity: 27618,
    budget: 10000000, reputation: 67, league: 'segunda',
    colors: { primary: '#6B2E7D', secondary: '#FFFFFF' },
    players: [
      createPlayer('Guilherme Fernandes', 'POR', 24, 0.6, 62),
      createPlayer('Álvaro Aceves', 'POR', 22, 0.4, 62),
      createPlayer('David Torres', 'DFC', 22, 1.5, 64),
      createPlayer('Pablo Tomeo', 'DFC', 26, 1.5, 64),
      createPlayer('Ramón Martínez', 'DFC', 23, 1.0, 64),
      createPlayer('Mohamed Jaouab', 'DFC', 23, 0.6, 62),
      createPlayer('Guille Bueno', 'LB', 23, 1.2, 64),
      createPlayer('Iván Alejo', 'RB', 30, 1.0, 64),
      createPlayer('Stanko Juric', 'MCD', 29, 1.2, 64),
      createPlayer('Mathis Lachuer', 'MCD', 25, 1.0, 64),
      createPlayer('Víctor Meseguer', 'MC', 26, 1.5, 64),
      createPlayer('Chuki', 'MCO', 21, 4.0, 72),
      createPlayer('Julien Ponceau', 'MCO', 25, 2.5, 67),
      createPlayer('Stipe Biuk', 'EI', 23, 2.5, 67),
      createPlayer('Sergi Canós', 'EI', 28, 0.8, 62),
      createPlayer('Peter Federico', 'ED', 23, 1.5, 64),
      createPlayer('Amath Ndiaye', 'ED', 29, 0.9, 62),
      createPlayer('Juanmi Latasa', 'DC', 24, 2.0, 67),
      createPlayer('Noah Ohio', 'DC', 23, 1.0, 64),
      createPlayer('Marcos André', 'DC', 29, 0.8, 62)
    ]
  },

  // ========== SPORTING GIJÓN ==========
  sporting_gijon: {
    name: 'Sporting de Gijón', shortName: 'SPO', city: 'Gijón',
    stadium: 'El Molinón', stadiumCapacity: 30000,
    budget: 9000000, reputation: 66, league: 'segunda',
    colors: { primary: '#FF0000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Rubén Yáñez', 'POR', 32, 1.0, 63),
      createPlayer('Christian Joel', 'POR', 26, 0.7, 62),
      createPlayer('Lucas Perrin', 'DFC', 27, 2.0, 67),
      createPlayer('Diego Sánchez', 'DFC', 22, 0.8, 62),
      createPlayer('Eric Curbelo', 'DFC', 32, 0.4, 61),
      createPlayer('Brian Oliván', 'LB', 31, 1.0, 64),
      createPlayer('Pablo García', 'LB', 25, 0.6, 62),
      createPlayer('Guille Rosas', 'RB', 25, 1.5, 64),
      createPlayer('Mamadou Loum', 'MCD', 29, 0.8, 62),
      createPlayer('Nacho Martín', 'MC', 23, 1.0, 64),
      createPlayer('Àlex Corredera', 'MC', 29, 0.8, 62),
      createPlayer('César Gelabert', 'MCO', 25, 3.0, 67),
      createPlayer('Jonathan Dubasin', 'EI', 25, 3.5, 67),
      createPlayer('Gaspar Campos', 'EI', 25, 2.0, 67),
      createPlayer('Dani Queipo', 'EI', 23, 1.2, 64),
      createPlayer('Juan Otero', 'ED', 30, 1.8, 64),
      createPlayer('Andrés Ferrari', 'DC', 23, 2.2, 67)
    ]
  },

  // ========== CÁDIZ CF ==========
  cadiz: {
    name: 'Cádiz CF', shortName: 'CAD', city: 'Cádiz',
    stadium: 'Nuevo Mirandilla', stadiumCapacity: 20724,
    budget: 8000000, reputation: 66, league: 'segunda',
    colors: { primary: '#FFD700', secondary: '#004D98' },
    players: [
      createPlayer('Victor Aznar', 'POR', 23, 1.2, 64),
      createPlayer('David Gil', 'POR', 32, 0.4, 61),
      createPlayer('Bojan Kovacevic', 'DFC', 21, 1.5, 66),
      createPlayer('Iker Recio', 'DFC', 24, 0.7, 62),
      createPlayer('Jorge Moreno', 'DFC', 24, 0.5, 62),
      createPlayer('Fali', 'DFC', 32, 0.4, 61),
      createPlayer('Mario Climent', 'LB', 23, 0.7, 62),
      createPlayer('Iza Carcelén', 'RB', 32, 0.7, 61),
      createPlayer('Rominigue Kouamé', 'MC', 29, 2.0, 67),
      createPlayer('Moussa Diakité', 'MC', 22, 1.0, 64),
      createPlayer('Sergio Ortuño', 'MC', 26, 1.0, 64),
      createPlayer('Álex Fernández', 'MC', 33, 0.4, 61),
      createPlayer('Antoñito Cordero', 'EI', 19, 2.0, 69),
      createPlayer('Javi Ontiveros', 'EI', 28, 1.8, 64),
      createPlayer('Suso', 'ED', 32, 1.2, 63),
      createPlayer('Iuri Tabatadze', 'ED', 26, 1.0, 64),
      createPlayer('Jerónimo Dómina', 'DC', 20, 2.0, 69),
      createPlayer('Dawda Camara', 'DC', 23, 1.0, 64),
      createPlayer('Roger Martí', 'DC', 35, 0.3, 60)
    ]
  },

  // ========== REAL ZARAGOZA ==========
  zaragoza: {
    name: 'Real Zaragoza', shortName: 'ZAR', city: 'Zaragoza',
    stadium: 'La Romareda', stadiumCapacity: 33608,
    budget: 8000000, reputation: 66, league: 'segunda',
    colors: { primary: '#004D98', secondary: '#FFFFFF' },
    players: [
      createPlayer('Esteban Andrada', 'POR', 35, 0.8, 60),
      createPlayer('Adrián Rodríguez', 'POR', 25, 0.2, 62),
      createPlayer('Pablo Insua', 'DFC', 32, 0.6, 61),
      createPlayer('Tachi', 'DFC', 28, 0.6, 62),
      createPlayer('Aleksandar Radovanovic', 'DFC', 32, 0.45, 61),
      createPlayer('Dani Tasende', 'LB', 25, 0.8, 62),
      createPlayer('Martín Aguirregabiria', 'RB', 29, 0.4, 62),
      createPlayer('Paul Akouokou', 'MCD', 28, 0.6, 62),
      createPlayer('Francho Serrano', 'MC', 24, 3.0, 67),
      createPlayer('Keidi Bare', 'MC', 28, 1.2, 64),
      createPlayer('Raúl Guti', 'MC', 29, 1.2, 64),
      createPlayer('Toni Moya', 'MC', 27, 1.0, 64),
      createPlayer('Sebas Moyano', 'EI', 28, 1.2, 64),
      createPlayer('Pau Sans', 'ED', 21, 1.5, 66),
      createPlayer('Paulino de la Fuente', 'ED', 28, 1.0, 64),
      createPlayer('Mario Soberón', 'DC', 28, 1.5, 64),
      createPlayer('Dani Gómez', 'DC', 27, 1.0, 64),
      createPlayer('Kenan Kodro', 'DC', 32, 0.5, 61)
    ]
  },

  // ========== GRANADA CF ==========
  granada: {
    name: 'Granada CF', shortName: 'GRA', city: 'Granada',
    stadium: 'Nuevo Los Cármenes', stadiumCapacity: 22524,
    budget: 7000000, reputation: 65, league: 'segunda',
    colors: { primary: '#C8102E', secondary: '#FFFFFF' },
    players: [
      createPlayer('Luca Zidane', 'POR', 27, 1.0, 64),
      createPlayer('Ander Astralaga', 'POR', 21, 0.8, 64),
      createPlayer('Loïc Williams', 'DFC', 24, 1.0, 64),
      createPlayer('Oscar Naasei', 'DFC', 20, 0.8, 64),
      createPlayer('Manu Lama', 'DFC', 24, 0.6, 62),
      createPlayer('Baïla Diallo', 'LB', 24, 0.8, 62),
      createPlayer('Álvaro Lemos', 'RB', 32, 0.4, 61),
      createPlayer('Pau Casadesús', 'RB', 22, 0.3, 62),
      createPlayer('Sergio Ruiz', 'MC', 31, 1.5, 64),
      createPlayer('Pedro Alemañ', 'MC', 23, 1.2, 64),
      createPlayer('Luka Gagnidze', 'MC', 22, 1.0, 64),
      createPlayer('José Manuel Arnáiz', 'MCO', 30, 0.9, 62),
      createPlayer('Sergio Rodelas', 'EI', 21, 0.8, 64),
      createPlayer('Álex Sola', 'ED', 26, 2.0, 67),
      createPlayer('Gonzalo Petit', 'DC', 19, 4.0, 72),
      createPlayer('Jorge Pascual', 'DC', 22, 1.2, 64),
      createPlayer('Mohamed Bouldini', 'DC', 30, 0.5, 62)
    ]
  },

  // ========== BURGOS CF ==========
  burgos: {
    name: 'Burgos CF', shortName: 'BUR', city: 'Burgos',
    stadium: 'El Plantío', stadiumCapacity: 12200,
    budget: 6000000, reputation: 62, league: 'segunda',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Ander Cantero', 'POR', 31, 1.0, 64),
      createPlayer('Jesús Ruiz', 'POR', 29, 0.7, 62),
      createPlayer('Oier Luengo', 'DFC', 28, 0.9, 62),
      createPlayer('Grego Sierra', 'DFC', 32, 0.6, 61),
      createPlayer('Florian Miguel', 'LB', 29, 1.2, 64),
      createPlayer('Álex Lizancos', 'RB', 22, 0.7, 62),
      createPlayer('Pablo Galdames', 'MC', 29, 1.3, 64),
      createPlayer('Miguel Atienza', 'MC', 26, 1.0, 64),
      createPlayer('David González', 'MC', 23, 1.0, 64),
      createPlayer('Kévin Appin', 'MC', 28, 0.8, 62),
      createPlayer('Iñigo Córdoba', 'EI', 28, 1.5, 64),
      createPlayer('Curro Sánchez', 'ED', 30, 1.8, 64),
      createPlayer('Iván Chapela', 'ED', 26, 1.0, 64),
      createPlayer('Fer Niño', 'DC', 25, 2.0, 67),
      createPlayer('Mario González', 'DC', 29, 1.0, 64)
    ]
  },

  // ========== MÁLAGA CF ==========
  malaga: {
    name: 'Málaga CF', shortName: 'MAL', city: 'Málaga',
    stadium: 'La Rosaleda', stadiumCapacity: 30044,
    budget: 6000000, reputation: 64, league: 'segunda',
    colors: { primary: '#007FFF', secondary: '#FFFFFF' },
    players: [
      createPlayer('Alfonso Herrero', 'POR', 31, 0.4, 62),
      createPlayer('Carlos López', 'POR', 21, 0.1, 64),
      createPlayer('Javi Montero', 'DFC', 27, 1.0, 64),
      createPlayer('Diego Murillo', 'DFC', 24, 0.7, 62),
      createPlayer('Einar Galilea', 'DFC', 31, 0.4, 62),
      createPlayer('Dani Sánchez', 'LB', 26, 0.4, 62),
      createPlayer('Jokin Gabilondo', 'RB', 26, 0.4, 62),
      createPlayer('Carlos Puga', 'RB', 25, 0.3, 62),
      createPlayer('Carlos Dotor', 'MC', 24, 1.0, 64),
      createPlayer('Izan Merino', 'MC', 19, 1.0, 66),
      createPlayer('Rafa Rodríguez', 'MCO', 22, 1.0, 64),
      createPlayer('Dani Lorenzo', 'MCO', 22, 0.8, 62),
      createPlayer('Julen Lobete', 'EI', 25, 1.2, 64),
      createPlayer('Joaquín Muñoz', 'EI', 26, 1.0, 64),
      createPlayer('David Larrubia', 'ED', 23, 1.2, 64),
      createPlayer('Chupe', 'DC', 21, 1.5, 66),
      createPlayer('Adrián Niño', 'DC', 21, 1.0, 66),
      createPlayer('Eneko Jauregi', 'DC', 29, 0.7, 62)
    ]
  },

  // ========== CD CASTELLÓN ==========
  castellon: {
    name: 'CD Castellón', shortName: 'CAS', city: 'Castellón',
    stadium: 'Nou Castalia', stadiumCapacity: 15500,
    budget: 5000000, reputation: 60, league: 'segunda',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Romain Matthys', 'POR', 27, 0.7, 62),
      createPlayer('Amir Abedzadeh', 'POR', 32, 0.3, 61),
      createPlayer('Fabrizio Brignani', 'DFC', 28, 1.2, 64),
      createPlayer('Agustín Sienra', 'DFC', 26, 0.5, 62),
      createPlayer('Lucas Alcázar', 'LB', 23, 0.6, 62),
      createPlayer('Jérémy Mellot', 'RB', 31, 0.7, 62),
      createPlayer('Diego Barri', 'MC', 30, 0.5, 62),
      createPlayer('Marc-Olivier Doué', 'MC', 25, 0.4, 62),
      createPlayer('Álex Calatrava', 'MCO', 25, 3.0, 67),
      createPlayer('Brian Cipenga', 'EI', 27, 1.4, 64),
      createPlayer('Raúl Sánchez', 'EI', 28, 0.9, 62),
      createPlayer('Douglas Aurélio', 'ED', 26, 0.8, 62),
      createPlayer('Adam Jakobsen', 'DC', 26, 1.8, 64),
      createPlayer('Ousmane Camara', 'DC', 24, 0.8, 62)
    ]
  },

  // ========== FC ANDORRA ==========
  andorra: {
    name: 'FC Andorra', shortName: 'AND', city: 'Andorra la Vella',
    stadium: 'Estadi Nacional', stadiumCapacity: 3306,
    budget: 5000000, reputation: 58, league: 'segunda',
    colors: { primary: '#003366', secondary: '#FFD700' },
    players: [
      createPlayer('Áron Yaakobishvili', 'POR', 19, 1.5, 66),
      createPlayer('Jesús Owono', 'POR', 24, 0.9, 62),
      createPlayer('Edgar González', 'DFC', 28, 1.5, 64),
      createPlayer('Gael Alonso', 'DFC', 23, 0.8, 62),
      createPlayer('Marc Bombardó', 'DFC', 20, 0.7, 64),
      createPlayer('Imanol García', 'LB', 25, 0.8, 62),
      createPlayer('Thomas Carrique', 'RB', 26, 0.6, 62),
      createPlayer('Efe Akman', 'MCD', 19, 0.5, 64),
      createPlayer('Dani Villahermosa', 'MC', 25, 0.8, 62),
      createPlayer('Marc Doménech', 'MC', 23, 0.5, 62),
      createPlayer('Min-su Kim', 'EI', 20, 2.0, 69),
      createPlayer('Aingeru Olabarrieta', 'ED', 20, 0.8, 64),
      createPlayer('Yeray Cabanzón', 'ED', 22, 0.5, 62),
      createPlayer('Lautaro de León', 'DC', 24, 0.8, 62),
      createPlayer('Marc Cardona', 'DC', 30, 0.5, 62)
    ]
  },

  // ========== SD EIBAR ==========
  eibar: {
    name: 'SD Eibar', shortName: 'EIB', city: 'Éibar',
    stadium: 'Ipurua', stadiumCapacity: 8164,
    budget: 5000000, reputation: 62, league: 'segunda',
    colors: { primary: '#003399', secondary: '#FF0000' },
    players: [
      createPlayer('Jonmi Magunagoitia', 'POR', 25, 0.8, 62),
      createPlayer('Luis López', 'POR', 24, 0.3, 62),
      createPlayer('Marco Moreno', 'DFC', 24, 0.7, 62),
      createPlayer('Aritz Arambarri', 'DFC', 27, 0.6, 62),
      createPlayer('Leonardo Buta', 'LB', 23, 1.5, 64),
      createPlayer('Sergio Cubero', 'RB', 26, 0.7, 62),
      createPlayer('Peru Nolaskoain', 'MCD', 27, 0.7, 62),
      createPlayer('Sergio Álvarez', 'MCD', 34, 0.5, 61),
      createPlayer('Aleix Garrido', 'MC', 21, 1.0, 66),
      createPlayer('Jon Magunazelaia', 'MCO', 24, 0.9, 62),
      createPlayer('Javi Martínez', 'MCO', 26, 0.8, 62),
      createPlayer('Adu Ares', 'ED', 24, 1.4, 64),
      createPlayer('Xeber Alkain', 'ED', 28, 0.8, 62),
      createPlayer('Jon Bautista', 'DC', 30, 1.8, 64),
      createPlayer('Javi Martón', 'DC', 26, 0.7, 62)
    ]
  },

  // ========== CD MIRANDÉS ==========
  mirandes: {
    name: 'CD Mirandés', shortName: 'MIR', city: 'Miranda de Ebro',
    stadium: 'Anduva', stadiumCapacity: 5762,
    budget: 4000000, reputation: 58, league: 'segunda',
    colors: { primary: '#FF0000', secondary: '#000000' },
    players: [
      createPlayer('Igor Nikic', 'POR', 25, 0.7, 62),
      createPlayer('Juanpa Palomares', 'POR', 25, 0.3, 62),
      createPlayer('Adrián Pica', 'DFC', 23, 1.0, 64),
      createPlayer('Jorge Cabello', 'DFC', 21, 0.9, 64),
      createPlayer('Juan Gutiérrez', 'DFC', 25, 0.8, 62),
      createPlayer('Fernando Medrano', 'LB', 25, 0.4, 62),
      createPlayer('Hugo Novoa', 'RB', 23, 1.0, 64),
      createPlayer('Thiago Helguera', 'MCD', 19, 3.5, 69),
      createPlayer('Aarón Martin', 'MC', 19, 1.0, 66),
      createPlayer('Rafel Bauzà', 'MC', 20, 0.8, 64),
      createPlayer('Javi Hernández', 'MCO', 21, 0.5, 74),
      createPlayer('Álex Cardero', 'MCO', 22, 0.4, 62),
      createPlayer('Salim El Jebari', 'EI', 21, 0.4, 64),
      createPlayer('Carlos Fernández', 'DC', 29, 1.0, 64),
      createPlayer('Alberto Marí', 'DC', 24, 0.8, 62)
    ]
  },

  // ========== CÓRDOBA CF ==========
  cordoba: {
    name: 'Córdoba CF', shortName: 'COR', city: 'Córdoba',
    stadium: 'El Arcángel', stadiumCapacity: 21822,
    budget: 4000000, reputation: 60, league: 'segunda',
    colors: { primary: '#00A651', secondary: '#FFFFFF' },
    players: [
      createPlayer('Iker Álvarez', 'POR', 24, 0.8, 62),
      createPlayer('Carlos Marín', 'POR', 28, 0.8, 62),
      createPlayer('Franck Fomeyem', 'DFC', 26, 0.6, 62),
      createPlayer('Rubén Alves', 'DFC', 31, 0.5, 62),
      createPlayer('Álex Martín', 'DFC', 28, 0.4, 72),
      createPlayer('Ignasi Vilarrasa', 'LB', 26, 1.0, 64),
      createPlayer('Carlos Albarrán', 'RB', 32, 0.3, 61),
      createPlayer('Isma Ruiz', 'MC', 24, 0.9, 62),
      createPlayer('Alberto del Moral', 'MC', 25, 0.8, 62),
      createPlayer('Théo Zidane', 'MC', 23, 0.6, 62),
      createPlayer('Pedro Ortiz', 'MC', 25, 0.6, 62),
      createPlayer('Jacobo González', 'EI', 28, 0.9, 62),
      createPlayer('Kevin Medina', 'EI', 24, 0.8, 62),
      createPlayer('Cristian Carracedo', 'ED', 30, 0.8, 62),
      createPlayer('Adrián Fuentes', 'DC', 29, 0.6, 62),
      createPlayer('Sergi Guardiola', 'DC', 34, 0.4, 61)
    ]
  },

  // ========== ALBACETE ==========
  albacete: {
    name: 'Albacete Balompié', shortName: 'ALB', city: 'Albacete',
    stadium: 'Carlos Belmonte', stadiumCapacity: 17524,
    budget: 4000000, reputation: 60, league: 'segunda',
    colors: { primary: '#FFFFFF', secondary: '#FF0000' },
    players: [
      createPlayer('Raúl Lizoain', 'POR', 35, 0.2, 60),
      createPlayer('Diego Mariño', 'POR', 35, 0.1, 60),
      createPlayer('Jesús Vallejo', 'DFC', 29, 1.0, 64),
      createPlayer('Lluís López', 'DFC', 28, 0.7, 62),
      createPlayer('Pepe Sánchez', 'DFC', 25, 0.3, 62),
      createPlayer('Carlos Neva', 'LB', 29, 1.0, 64),
      createPlayer('Jonathan Gómez', 'LB', 22, 0.8, 62),
      createPlayer('Lorenzo Aguado', 'RB', 23, 0.2, 62),
      createPlayer('Riki Rodríguez', 'MC', 28, 1.4, 64),
      createPlayer('Agus Medina', 'MC', 31, 1.0, 64),
      createPlayer('Antonio Pacheco', 'MC', 24, 0.7, 62),
      createPlayer('José Carlos Lazo', 'EI', 29, 0.7, 62),
      createPlayer('Antonio Puertas', 'ED', 33, 0.8, 61),
      createPlayer('Jefté Betancor', 'DC', 32, 0.6, 61),
      createPlayer('Dani Escriche', 'DC', 27, 0.5, 62),
      createPlayer('Samuel Obeng', 'DC', 28, 0.5, 62)
    ]
  },

  // ========== SD HUESCA ==========
  huesca: {
    name: 'SD Huesca', shortName: 'HUE', city: 'Huesca',
    stadium: 'El Alcoraz', stadiumCapacity: 9087,
    budget: 4000000, reputation: 60, league: 'segunda',
    colors: { primary: '#005BAC', secondary: '#FF0000' },
    players: [
      createPlayer('Juan Pérez', 'POR', 29, 0.3, 62),
      createPlayer('Dani Jiménez', 'POR', 35, 0.2, 60),
      createPlayer('Álvaro Carrillo', 'DFC', 23, 0.6, 62),
      createPlayer('Jorge Pulido', 'DFC', 34, 0.5, 61),
      createPlayer('Piña', 'DFC', 31, 0.3, 62),
      createPlayer('Jordi Martín', 'LB', 25, 0.6, 62),
      createPlayer('Julio Alonso', 'LB', 27, 0.6, 62),
      createPlayer('Ángel Pérez', 'RB', 23, 0.6, 62),
      createPlayer('Toni Abad', 'RB', 29, 0.5, 62),
      createPlayer('Iker Kortajarena', 'MC', 25, 0.8, 62),
      createPlayer('Jesús Álvarez', 'MC', 26, 0.6, 62),
      createPlayer('Javi Mier', 'MC', 26, 0.5, 62),
      createPlayer('Daniel Luna', 'MCO', 22, 0.6, 62),
      createPlayer('Dani Ojeda', 'EI', 31, 0.8, 62),
      createPlayer('Efe Aghama', 'EI', 21, 0.7, 64),
      createPlayer('Enol Rodríguez', 'DC', 24, 0.6, 62),
      createPlayer('Samuel Ntamack', 'DC', 24, 0.5, 62)
    ]
  },

  // ========== AD CEUTA ==========
  ceuta: {
    name: 'AD Ceuta FC', shortName: 'CEU', city: 'Ceuta',
    stadium: 'Alfonso Murube', stadiumCapacity: 6590,
    budget: 3000000, reputation: 55, league: 'segunda',
    colors: { primary: '#005BAC', secondary: '#FFFFFF' },
    players: [
      createPlayer('Guillermo Vallejo', 'POR', 30, 0.4, 62),
      createPlayer('Pedro López', 'POR', 31, 0.2, 62),
      createPlayer('Diego González', 'DFC', 26, 0.6, 62),
      createPlayer('Yago Cantero', 'DFC', 26, 0.3, 62),
      createPlayer('Carlos Hernández', 'DFC', 35, 0.1, 60),
      createPlayer('José Matos', 'LB', 30, 0.8, 62),
      createPlayer('Gonzalo Almenara', 'RB', 28, 0.3, 62),
      createPlayer('José Campaña', 'MC', 32, 0.75, 61),
      createPlayer('Youness Lachhab', 'MC', 26, 0.6, 62),
      createPlayer('Yann Bodiger', 'MC', 30, 0.5, 62),
      createPlayer('Aisar Ahmed', 'MCO', 24, 0.6, 62),
      createPlayer('Kuki Zalazar', 'MCO', 27, 0.5, 62),
      createPlayer('Konrad de la Fuente', 'EI', 24, 0.7, 62),
      createPlayer('Anuar', 'ED', 31, 0.8, 62),
      createPlayer('Marc Domènech', 'DC', 19, 1.0, 66),
      createPlayer('Marcos Fernández', 'DC', 22, 0.8, 62),
      createPlayer('Juanto Ortuño', 'DC', 33, 0.3, 61)
    ]
  },

  // ========== CULTURAL LEONESA ==========
  cultural_leonesa: {
    name: 'Cultural Leonesa', shortName: 'CUL', city: 'León',
    stadium: 'Reino de León', stadiumCapacity: 13354,
    budget: 3000000, reputation: 55, league: 'segunda',
    colors: { primary: '#FFFFFF', secondary: '#FF0000' },
    players: [
      createPlayer('Edgar Badia', 'POR', 33, 0.5, 61),
      createPlayer('Miguel Bañuz', 'POR', 32, 0.2, 61),
      createPlayer('Tomás Ribeiro', 'DFC', 26, 1.0, 64),
      createPlayer('Matia Barzic', 'DFC', 21, 0.8, 64),
      createPlayer('Roger Hinojo', 'DFC', 20, 0.7, 64),
      createPlayer('Quique Fornos', 'DFC', 29, 0.3, 62),
      createPlayer('Homam Al-Amin', 'LB', 26, 0.5, 62),
      createPlayer('Iván Calero', 'RB', 30, 0.7, 62),
      createPlayer('Thiago Ojeda', 'MC', 23, 0.6, 62),
      createPlayer('Yayo González', 'MC', 21, 0.3, 64),
      createPlayer('Bicho', 'MCO', 29, 0.3, 62),
      createPlayer('Luis Chacón', 'EI', 25, 0.8, 62),
      createPlayer('Diego Collado', 'EI', 25, 0.4, 62),
      createPlayer('Lucas Ribeiro', 'ED', 27, 2.0, 67),
      createPlayer('Manu Justo', 'DC', 29, 0.5, 62),
      createPlayer('Rubén Sobrino', 'DC', 33, 0.5, 61)
    ]
  },

  // ========== REAL SOCIEDAD B ==========
  real_sociedad_b: {
    name: 'Real Sociedad B', shortName: 'RSB', city: 'San Sebastián',
    stadium: 'Zubieta', stadiumCapacity: 2500,
    budget: 3000000, reputation: 55, league: 'segunda',
    colors: { primary: '#0067B1', secondary: '#FFFFFF' },
    players: [
      createPlayer('Aitor Fraga', 'POR', 22, 0.5, 62),
      createPlayer('Egoitz Arana', 'POR', 23, 0.1, 62),
      createPlayer('Peru Rodríguez', 'DFC', 23, 0.6, 62),
      createPlayer('Luken Beitia', 'DFC', 21, 0.3, 64),
      createPlayer('Jon Balda', 'LB', 23, 0.6, 62),
      createPlayer('Iñaki Rupérez', 'RB', 23, 0.3, 62),
      createPlayer('Mikel Rodriguez', 'MC', 23, 0.5, 62),
      createPlayer('Gorka Gorosabel', 'MC', 19, 0.5, 64),
      createPlayer('Alex Lebarbier', 'MC', 21, 0.4, 64),
      createPlayer('Lander Astiazaran', 'MCO', 19, 0.5, 64),
      createPlayer('Arkaitz Mariezkurrena', 'EI', 20, 0.8, 64),
      createPlayer('Alex Marchal', 'EI', 18, 0.8, 64),
      createPlayer('Dani Díaz', 'ED', 19, 0.4, 64),
      createPlayer('Gorka Carrera', 'DC', 20, 1.0, 66),
      createPlayer('Sydney Osazuwa', 'DC', 18, 1.0, 66)
    ]
  }
};

export const segundaTeamsArray = Object.entries(segundaTeams).map(([id, team]) => ({
  id,
  ...team
}));

export default segundaTeams;
