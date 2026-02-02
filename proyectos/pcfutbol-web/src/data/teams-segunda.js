// ============================================================
// PC FÚTBOL WEB - EQUIPOS SEGUNDA DIVISIÓN 25/26
// Datos reales de Transfermarkt (enero 2026)
// ============================================================

function calcOverall(valueM, age) {
  let ovr;
  if (valueM >= 25) ovr = 82;
  else if (valueM >= 15) ovr = 80;
  else if (valueM >= 10) ovr = 78;
  else if (valueM >= 6) ovr = 76;
  else if (valueM >= 3) ovr = 74;
  else if (valueM >= 1.5) ovr = 72;
  else if (valueM >= 0.8) ovr = 70;
  else if (valueM >= 0.5) ovr = 68;
  else if (valueM >= 0.3) ovr = 66;
  else ovr = 64;
  if (age <= 21) ovr += 1;
  else if (age >= 35) ovr -= 2;
  else if (age >= 33) ovr -= 1;
  return Math.max(60, Math.min(84, ovr));
}

function calcSalary(valueM) {
  const annual = valueM * 1000000 * 0.10;
  const weekly = annual / 52;
  return Math.max(10000, Math.round(weekly));
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

export const segundaTeams = {
  // ========== RC DEPORTIVO ==========
  deportivo: {
    name: 'RC Deportivo', shortName: 'DEP', city: 'A Coruña',
    stadium: 'Riazor', stadiumCapacity: 32912,
    budget: 15000000, reputation: 70, league: 'segunda',
    colors: { primary: '#005BAC', secondary: '#FFFFFF' },
    players: [
      createPlayer('Álvaro Fernández', 'POR', 27, 1.8),
      createPlayer('Daniel Bachmann', 'POR', 31, 0.6),
      createPlayer('Germán Parreño', 'POR', 32, 0.3),
      createPlayer('Lucas Noubi', 'DFC', 21, 1.5),
      createPlayer('Dani Barcia', 'DFC', 23, 1.2),
      createPlayer('Arnau Comas', 'DFC', 25, 0.5),
      createPlayer('Giacomo Quagliata', 'LTI', 25, 1.5),
      createPlayer('Sergio Escudero', 'LTI', 36, 0.1),
      createPlayer('Adrià Altimira', 'LTD', 24, 1.4),
      createPlayer('Miguel Loureiro', 'LTD', 29, 1.0),
      createPlayer('José Gragera', 'MC', 25, 1.5),
      createPlayer('Diego Villares', 'MC', 29, 0.8),
      createPlayer('Charlie Patiño', 'MC', 22, 0.6),
      createPlayer('Rubén López', 'MC', 21, 0.5),
      createPlayer('Mario Soriano', 'MCO', 23, 2.0),
      createPlayer('Yeremay Hernández', 'EI', 23, 25.0),
      createPlayer('David Mella', 'ED', 20, 5.0),
      createPlayer('Luismi Cruz', 'ED', 24, 1.4),
      createPlayer('Stoichkov', 'MCO', 32, 0.9),
      createPlayer('Samuele Mulattieri', 'DC', 25, 3.0),
      createPlayer('Zakaria Eddahchouri', 'DC', 25, 2.0)
    ]
  },

  // ========== RACING SANTANDER ==========
  racing_santander: {
    name: 'Racing de Santander', shortName: 'RAC', city: 'Santander',
    stadium: 'El Sardinero', stadiumCapacity: 22222,
    budget: 12000000, reputation: 68, league: 'segunda',
    colors: { primary: '#00A651', secondary: '#FFFFFF' },
    players: [
      createPlayer('Jokin Ezkieta', 'POR', 29, 2.5),
      createPlayer('Simon Eriksson', 'POR', 19, 1.5),
      createPlayer('Facundo González', 'DFC', 22, 3.0),
      createPlayer('Javi Castro', 'DFC', 25, 1.8),
      createPlayer('Manu Hernando', 'DFC', 27, 1.4),
      createPlayer('Pablo Ramón', 'DFC', 24, 0.6),
      createPlayer('Jorge Salinas', 'LTI', 18, 4.0),
      createPlayer('Mario García', 'LTI', 22, 0.9),
      createPlayer('Clément Michelin', 'LTD', 28, 1.5),
      createPlayer('Álvaro Mantilla', 'LTD', 25, 0.7),
      createPlayer('Damián Rodríguez', 'MCD', 22, 2.0),
      createPlayer('Maguette Gueye', 'MCD', 23, 1.0),
      createPlayer('Gustavo Puerta', 'MC', 22, 3.5),
      createPlayer('Aritz Aldasoro', 'MC', 26, 2.0),
      createPlayer('Peio Canales', 'MCO', 21, 5.0),
      createPlayer('Iñigo Vicente', 'EI', 28, 4.0),
      createPlayer('Andrés Martín', 'ED', 26, 5.0),
      createPlayer('Asier Villalibre', 'DC', 28, 2.0),
      createPlayer('Juan Carlos Arana', 'DC', 25, 1.8),
      createPlayer('Giorgi Guliashvili', 'DC', 24, 1.3)
    ]
  },

  // ========== UD ALMERÍA ==========
  almeria: {
    name: 'UD Almería', shortName: 'ALM', city: 'Almería',
    stadium: 'Power Horse Stadium', stadiumCapacity: 15000,
    budget: 14000000, reputation: 68, league: 'segunda',
    colors: { primary: '#ED1C24', secondary: '#FFFFFF' },
    players: [
      createPlayer('Fernando Martínez', 'POR', 35, 0.2),
      createPlayer('Andrés Fernández', 'POR', 39, 0.1),
      createPlayer('Federico Bonini', 'DFC', 24, 3.0),
      createPlayer('Chumi', 'DFC', 26, 1.0),
      createPlayer('Nélson Monte', 'DFC', 30, 0.5),
      createPlayer('Álex Muñoz', 'LTI', 31, 1.0),
      createPlayer('Álex Centelles', 'LTI', 26, 0.8),
      createPlayer('Daijiro Chirino', 'LTD', 24, 1.5),
      createPlayer('Dion Lopy', 'MCD', 23, 4.0),
      createPlayer('André Horta', 'MC', 29, 2.0),
      createPlayer('Arnau Puigmal', 'MC', 25, 1.5),
      createPlayer('Iddrisu Baba', 'MC', 30, 1.0),
      createPlayer('Sergio Arribas', 'MCO', 24, 10.0),
      createPlayer('Nico Melamed', 'MCO', 24, 3.0),
      createPlayer('Jon Morcillo', 'EI', 27, 2.0),
      createPlayer('Patrick Soko', 'ED', 28, 1.2),
      createPlayer('Thalys', 'DC', 20, 6.0),
      createPlayer('Miguel de la Fuente', 'DC', 26, 2.0),
      createPlayer('Léo Baptistão', 'DC', 33, 0.8)
    ]
  },

  // ========== REAL VALLADOLID ==========
  valladolid: {
    name: 'Real Valladolid', shortName: 'VLL', city: 'Valladolid',
    stadium: 'José Zorrilla', stadiumCapacity: 27618,
    budget: 10000000, reputation: 67, league: 'segunda',
    colors: { primary: '#6B2E7D', secondary: '#FFFFFF' },
    players: [
      createPlayer('Guilherme Fernandes', 'POR', 24, 0.6),
      createPlayer('Álvaro Aceves', 'POR', 22, 0.4),
      createPlayer('David Torres', 'DFC', 22, 1.5),
      createPlayer('Pablo Tomeo', 'DFC', 26, 1.5),
      createPlayer('Ramón Martínez', 'DFC', 23, 1.0),
      createPlayer('Mohamed Jaouab', 'DFC', 23, 0.6),
      createPlayer('Guille Bueno', 'LTI', 23, 1.2),
      createPlayer('Iván Alejo', 'LTD', 30, 1.0),
      createPlayer('Stanko Juric', 'MCD', 29, 1.2),
      createPlayer('Mathis Lachuer', 'MCD', 25, 1.0),
      createPlayer('Víctor Meseguer', 'MC', 26, 1.5),
      createPlayer('Chuki', 'MCO', 21, 4.0),
      createPlayer('Julien Ponceau', 'MCO', 25, 2.5),
      createPlayer('Stipe Biuk', 'EI', 23, 2.5),
      createPlayer('Sergi Canós', 'EI', 28, 0.8),
      createPlayer('Peter Federico', 'ED', 23, 1.5),
      createPlayer('Amath Ndiaye', 'ED', 29, 0.9),
      createPlayer('Juanmi Latasa', 'DC', 24, 2.0),
      createPlayer('Noah Ohio', 'DC', 23, 1.0),
      createPlayer('Marcos André', 'DC', 29, 0.8)
    ]
  },

  // ========== SPORTING GIJÓN ==========
  sporting_gijon: {
    name: 'Sporting de Gijón', shortName: 'SPO', city: 'Gijón',
    stadium: 'El Molinón', stadiumCapacity: 30000,
    budget: 9000000, reputation: 66, league: 'segunda',
    colors: { primary: '#FF0000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Rubén Yáñez', 'POR', 32, 1.0),
      createPlayer('Christian Joel', 'POR', 26, 0.7),
      createPlayer('Lucas Perrin', 'DFC', 27, 2.0),
      createPlayer('Diego Sánchez', 'DFC', 22, 0.8),
      createPlayer('Eric Curbelo', 'DFC', 32, 0.4),
      createPlayer('Brian Oliván', 'LTI', 31, 1.0),
      createPlayer('Pablo García', 'LTI', 25, 0.6),
      createPlayer('Guille Rosas', 'LTD', 25, 1.5),
      createPlayer('Mamadou Loum', 'MCD', 29, 0.8),
      createPlayer('Nacho Martín', 'MC', 23, 1.0),
      createPlayer('Àlex Corredera', 'MC', 29, 0.8),
      createPlayer('César Gelabert', 'MCO', 25, 3.0),
      createPlayer('Jonathan Dubasin', 'EI', 25, 3.5),
      createPlayer('Gaspar Campos', 'EI', 25, 2.0),
      createPlayer('Dani Queipo', 'EI', 23, 1.2),
      createPlayer('Juan Otero', 'ED', 30, 1.8),
      createPlayer('Andrés Ferrari', 'DC', 23, 2.2)
    ]
  },

  // ========== CÁDIZ CF ==========
  cadiz: {
    name: 'Cádiz CF', shortName: 'CAD', city: 'Cádiz',
    stadium: 'Nuevo Mirandilla', stadiumCapacity: 20724,
    budget: 8000000, reputation: 66, league: 'segunda',
    colors: { primary: '#FFD700', secondary: '#004D98' },
    players: [
      createPlayer('Victor Aznar', 'POR', 23, 1.2),
      createPlayer('David Gil', 'POR', 32, 0.4),
      createPlayer('Bojan Kovacevic', 'DFC', 21, 1.5),
      createPlayer('Iker Recio', 'DFC', 24, 0.7),
      createPlayer('Jorge Moreno', 'DFC', 24, 0.5),
      createPlayer('Fali', 'DFC', 32, 0.4),
      createPlayer('Mario Climent', 'LTI', 23, 0.7),
      createPlayer('Iza Carcelén', 'LTD', 32, 0.7),
      createPlayer('Rominigue Kouamé', 'MC', 29, 2.0),
      createPlayer('Moussa Diakité', 'MC', 22, 1.0),
      createPlayer('Sergio Ortuño', 'MC', 26, 1.0),
      createPlayer('Álex Fernández', 'MC', 33, 0.4),
      createPlayer('Antoñito Cordero', 'EI', 19, 2.0),
      createPlayer('Javi Ontiveros', 'EI', 28, 1.8),
      createPlayer('Suso', 'ED', 32, 1.2),
      createPlayer('Iuri Tabatadze', 'ED', 26, 1.0),
      createPlayer('Jerónimo Dómina', 'DC', 20, 2.0),
      createPlayer('Dawda Camara', 'DC', 23, 1.0),
      createPlayer('Roger Martí', 'DC', 35, 0.3)
    ]
  },

  // ========== REAL ZARAGOZA ==========
  zaragoza: {
    name: 'Real Zaragoza', shortName: 'ZAR', city: 'Zaragoza',
    stadium: 'La Romareda', stadiumCapacity: 33608,
    budget: 8000000, reputation: 66, league: 'segunda',
    colors: { primary: '#004D98', secondary: '#FFFFFF' },
    players: [
      createPlayer('Esteban Andrada', 'POR', 35, 0.8),
      createPlayer('Adrián Rodríguez', 'POR', 25, 0.2),
      createPlayer('Pablo Insua', 'DFC', 32, 0.6),
      createPlayer('Tachi', 'DFC', 28, 0.6),
      createPlayer('Aleksandar Radovanovic', 'DFC', 32, 0.45),
      createPlayer('Dani Tasende', 'LTI', 25, 0.8),
      createPlayer('Martín Aguirregabiria', 'LTD', 29, 0.4),
      createPlayer('Paul Akouokou', 'MCD', 28, 0.6),
      createPlayer('Francho Serrano', 'MC', 24, 3.0),
      createPlayer('Keidi Bare', 'MC', 28, 1.2),
      createPlayer('Raúl Guti', 'MC', 29, 1.2),
      createPlayer('Toni Moya', 'MC', 27, 1.0),
      createPlayer('Sebas Moyano', 'EI', 28, 1.2),
      createPlayer('Pau Sans', 'ED', 21, 1.5),
      createPlayer('Paulino de la Fuente', 'ED', 28, 1.0),
      createPlayer('Mario Soberón', 'DC', 28, 1.5),
      createPlayer('Dani Gómez', 'DC', 27, 1.0),
      createPlayer('Kenan Kodro', 'DC', 32, 0.5)
    ]
  },

  // ========== GRANADA CF ==========
  granada: {
    name: 'Granada CF', shortName: 'GRA', city: 'Granada',
    stadium: 'Nuevo Los Cármenes', stadiumCapacity: 22524,
    budget: 7000000, reputation: 65, league: 'segunda',
    colors: { primary: '#C8102E', secondary: '#FFFFFF' },
    players: [
      createPlayer('Luca Zidane', 'POR', 27, 1.0),
      createPlayer('Ander Astralaga', 'POR', 21, 0.8),
      createPlayer('Loïc Williams', 'DFC', 24, 1.0),
      createPlayer('Oscar Naasei', 'DFC', 20, 0.8),
      createPlayer('Manu Lama', 'DFC', 24, 0.6),
      createPlayer('Baïla Diallo', 'LTI', 24, 0.8),
      createPlayer('Álvaro Lemos', 'LTD', 32, 0.4),
      createPlayer('Pau Casadesús', 'LTD', 22, 0.3),
      createPlayer('Sergio Ruiz', 'MC', 31, 1.5),
      createPlayer('Pedro Alemañ', 'MC', 23, 1.2),
      createPlayer('Luka Gagnidze', 'MC', 22, 1.0),
      createPlayer('José Manuel Arnáiz', 'MCO', 30, 0.9),
      createPlayer('Sergio Rodelas', 'EI', 21, 0.8),
      createPlayer('Álex Sola', 'ED', 26, 2.0),
      createPlayer('Gonzalo Petit', 'DC', 19, 4.0),
      createPlayer('Jorge Pascual', 'DC', 22, 1.2),
      createPlayer('Mohamed Bouldini', 'DC', 30, 0.5)
    ]
  },

  // ========== BURGOS CF ==========
  burgos: {
    name: 'Burgos CF', shortName: 'BUR', city: 'Burgos',
    stadium: 'El Plantío', stadiumCapacity: 12200,
    budget: 6000000, reputation: 62, league: 'segunda',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Ander Cantero', 'POR', 31, 1.0),
      createPlayer('Jesús Ruiz', 'POR', 29, 0.7),
      createPlayer('Oier Luengo', 'DFC', 28, 0.9),
      createPlayer('Grego Sierra', 'DFC', 32, 0.6),
      createPlayer('Florian Miguel', 'LTI', 29, 1.2),
      createPlayer('Álex Lizancos', 'LTD', 22, 0.7),
      createPlayer('Pablo Galdames', 'MC', 29, 1.3),
      createPlayer('Miguel Atienza', 'MC', 26, 1.0),
      createPlayer('David González', 'MC', 23, 1.0),
      createPlayer('Kévin Appin', 'MC', 28, 0.8),
      createPlayer('Iñigo Córdoba', 'EI', 28, 1.5),
      createPlayer('Curro Sánchez', 'ED', 30, 1.8),
      createPlayer('Iván Chapela', 'ED', 26, 1.0),
      createPlayer('Fer Niño', 'DC', 25, 2.0),
      createPlayer('Mario González', 'DC', 29, 1.0)
    ]
  },

  // ========== MÁLAGA CF ==========
  malaga: {
    name: 'Málaga CF', shortName: 'MAL', city: 'Málaga',
    stadium: 'La Rosaleda', stadiumCapacity: 30044,
    budget: 6000000, reputation: 64, league: 'segunda',
    colors: { primary: '#007FFF', secondary: '#FFFFFF' },
    players: [
      createPlayer('Alfonso Herrero', 'POR', 31, 0.4),
      createPlayer('Carlos López', 'POR', 21, 0.1),
      createPlayer('Javi Montero', 'DFC', 27, 1.0),
      createPlayer('Diego Murillo', 'DFC', 24, 0.7),
      createPlayer('Einar Galilea', 'DFC', 31, 0.4),
      createPlayer('Dani Sánchez', 'LTI', 26, 0.4),
      createPlayer('Jokin Gabilondo', 'LTD', 26, 0.4),
      createPlayer('Carlos Puga', 'LTD', 25, 0.3),
      createPlayer('Carlos Dotor', 'MC', 24, 1.0),
      createPlayer('Izan Merino', 'MC', 19, 1.0),
      createPlayer('Rafa Rodríguez', 'MCO', 22, 1.0),
      createPlayer('Dani Lorenzo', 'MCO', 22, 0.8),
      createPlayer('Julen Lobete', 'EI', 25, 1.2),
      createPlayer('Joaquín Muñoz', 'EI', 26, 1.0),
      createPlayer('David Larrubia', 'ED', 23, 1.2),
      createPlayer('Chupe', 'DC', 21, 1.5),
      createPlayer('Adrián Niño', 'DC', 21, 1.0),
      createPlayer('Eneko Jauregi', 'DC', 29, 0.7)
    ]
  },

  // ========== CD CASTELLÓN ==========
  castellon: {
    name: 'CD Castellón', shortName: 'CAS', city: 'Castellón',
    stadium: 'Nou Castalia', stadiumCapacity: 15500,
    budget: 5000000, reputation: 60, league: 'segunda',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Romain Matthys', 'POR', 27, 0.7),
      createPlayer('Amir Abedzadeh', 'POR', 32, 0.3),
      createPlayer('Fabrizio Brignani', 'DFC', 28, 1.2),
      createPlayer('Agustín Sienra', 'DFC', 26, 0.5),
      createPlayer('Lucas Alcázar', 'LTI', 23, 0.6),
      createPlayer('Jérémy Mellot', 'LTD', 31, 0.7),
      createPlayer('Diego Barri', 'MC', 30, 0.5),
      createPlayer('Marc-Olivier Doué', 'MC', 25, 0.4),
      createPlayer('Álex Calatrava', 'MCO', 25, 3.0),
      createPlayer('Brian Cipenga', 'EI', 27, 1.4),
      createPlayer('Raúl Sánchez', 'EI', 28, 0.9),
      createPlayer('Douglas Aurélio', 'ED', 26, 0.8),
      createPlayer('Adam Jakobsen', 'DC', 26, 1.8),
      createPlayer('Ousmane Camara', 'DC', 24, 0.8)
    ]
  },

  // ========== FC ANDORRA ==========
  andorra: {
    name: 'FC Andorra', shortName: 'AND', city: 'Andorra la Vella',
    stadium: 'Estadi Nacional', stadiumCapacity: 3306,
    budget: 5000000, reputation: 58, league: 'segunda',
    colors: { primary: '#003366', secondary: '#FFD700' },
    players: [
      createPlayer('Áron Yaakobishvili', 'POR', 19, 1.5),
      createPlayer('Jesús Owono', 'POR', 24, 0.9),
      createPlayer('Edgar González', 'DFC', 28, 1.5),
      createPlayer('Gael Alonso', 'DFC', 23, 0.8),
      createPlayer('Marc Bombardó', 'DFC', 20, 0.7),
      createPlayer('Imanol García', 'LTI', 25, 0.8),
      createPlayer('Thomas Carrique', 'LTD', 26, 0.6),
      createPlayer('Efe Akman', 'MCD', 19, 0.5),
      createPlayer('Dani Villahermosa', 'MC', 25, 0.8),
      createPlayer('Marc Doménech', 'MC', 23, 0.5),
      createPlayer('Min-su Kim', 'EI', 20, 2.0),
      createPlayer('Aingeru Olabarrieta', 'ED', 20, 0.8),
      createPlayer('Yeray Cabanzón', 'ED', 22, 0.5),
      createPlayer('Lautaro de León', 'DC', 24, 0.8),
      createPlayer('Marc Cardona', 'DC', 30, 0.5)
    ]
  },

  // ========== SD EIBAR ==========
  eibar: {
    name: 'SD Eibar', shortName: 'EIB', city: 'Éibar',
    stadium: 'Ipurua', stadiumCapacity: 8164,
    budget: 5000000, reputation: 62, league: 'segunda',
    colors: { primary: '#003399', secondary: '#FF0000' },
    players: [
      createPlayer('Jonmi Magunagoitia', 'POR', 25, 0.8),
      createPlayer('Luis López', 'POR', 24, 0.3),
      createPlayer('Marco Moreno', 'DFC', 24, 0.7),
      createPlayer('Aritz Arambarri', 'DFC', 27, 0.6),
      createPlayer('Leonardo Buta', 'LTI', 23, 1.5),
      createPlayer('Sergio Cubero', 'LTD', 26, 0.7),
      createPlayer('Peru Nolaskoain', 'MCD', 27, 0.7),
      createPlayer('Sergio Álvarez', 'MCD', 34, 0.5),
      createPlayer('Aleix Garrido', 'MC', 21, 1.0),
      createPlayer('Jon Magunazelaia', 'MCO', 24, 0.9),
      createPlayer('Javi Martínez', 'MCO', 26, 0.8),
      createPlayer('Adu Ares', 'ED', 24, 1.4),
      createPlayer('Xeber Alkain', 'ED', 28, 0.8),
      createPlayer('Jon Bautista', 'DC', 30, 1.8),
      createPlayer('Javi Martón', 'DC', 26, 0.7)
    ]
  },

  // ========== CD MIRANDÉS ==========
  mirandes: {
    name: 'CD Mirandés', shortName: 'MIR', city: 'Miranda de Ebro',
    stadium: 'Anduva', stadiumCapacity: 5762,
    budget: 4000000, reputation: 58, league: 'segunda',
    colors: { primary: '#FF0000', secondary: '#000000' },
    players: [
      createPlayer('Igor Nikic', 'POR', 25, 0.7),
      createPlayer('Juanpa Palomares', 'POR', 25, 0.3),
      createPlayer('Adrián Pica', 'DFC', 23, 1.0),
      createPlayer('Jorge Cabello', 'DFC', 21, 0.9),
      createPlayer('Juan Gutiérrez', 'DFC', 25, 0.8),
      createPlayer('Fernando Medrano', 'LTI', 25, 0.4),
      createPlayer('Hugo Novoa', 'LTD', 23, 1.0),
      createPlayer('Thiago Helguera', 'MCD', 19, 3.5),
      createPlayer('Aarón Martin', 'MC', 19, 1.0),
      createPlayer('Rafel Bauzà', 'MC', 20, 0.8),
      createPlayer('Javi Hernández', 'MCO', 21, 0.5),
      createPlayer('Álex Cardero', 'MCO', 22, 0.4),
      createPlayer('Salim El Jebari', 'EI', 21, 0.4),
      createPlayer('Carlos Fernández', 'DC', 29, 1.0),
      createPlayer('Alberto Marí', 'DC', 24, 0.8)
    ]
  },

  // ========== CÓRDOBA CF ==========
  cordoba: {
    name: 'Córdoba CF', shortName: 'COR', city: 'Córdoba',
    stadium: 'El Arcángel', stadiumCapacity: 21822,
    budget: 4000000, reputation: 60, league: 'segunda',
    colors: { primary: '#00A651', secondary: '#FFFFFF' },
    players: [
      createPlayer('Iker Álvarez', 'POR', 24, 0.8),
      createPlayer('Carlos Marín', 'POR', 28, 0.8),
      createPlayer('Franck Fomeyem', 'DFC', 26, 0.6),
      createPlayer('Rubén Alves', 'DFC', 31, 0.5),
      createPlayer('Álex Martín', 'DFC', 28, 0.4),
      createPlayer('Ignasi Vilarrasa', 'LTI', 26, 1.0),
      createPlayer('Carlos Albarrán', 'LTD', 32, 0.3),
      createPlayer('Isma Ruiz', 'MC', 24, 0.9),
      createPlayer('Alberto del Moral', 'MC', 25, 0.8),
      createPlayer('Théo Zidane', 'MC', 23, 0.6),
      createPlayer('Pedro Ortiz', 'MC', 25, 0.6),
      createPlayer('Jacobo González', 'EI', 28, 0.9),
      createPlayer('Kevin Medina', 'EI', 24, 0.8),
      createPlayer('Cristian Carracedo', 'ED', 30, 0.8),
      createPlayer('Adrián Fuentes', 'DC', 29, 0.6),
      createPlayer('Sergi Guardiola', 'DC', 34, 0.4)
    ]
  },

  // ========== ALBACETE ==========
  albacete: {
    name: 'Albacete Balompié', shortName: 'ALB', city: 'Albacete',
    stadium: 'Carlos Belmonte', stadiumCapacity: 17524,
    budget: 4000000, reputation: 60, league: 'segunda',
    colors: { primary: '#FFFFFF', secondary: '#FF0000' },
    players: [
      createPlayer('Raúl Lizoain', 'POR', 35, 0.2),
      createPlayer('Diego Mariño', 'POR', 35, 0.1),
      createPlayer('Jesús Vallejo', 'DFC', 29, 1.0),
      createPlayer('Lluís López', 'DFC', 28, 0.7),
      createPlayer('Pepe Sánchez', 'DFC', 25, 0.3),
      createPlayer('Carlos Neva', 'LTI', 29, 1.0),
      createPlayer('Jonathan Gómez', 'LTI', 22, 0.8),
      createPlayer('Lorenzo Aguado', 'LTD', 23, 0.2),
      createPlayer('Riki Rodríguez', 'MC', 28, 1.4),
      createPlayer('Agus Medina', 'MC', 31, 1.0),
      createPlayer('Antonio Pacheco', 'MC', 24, 0.7),
      createPlayer('José Carlos Lazo', 'EI', 29, 0.7),
      createPlayer('Antonio Puertas', 'ED', 33, 0.8),
      createPlayer('Jefté Betancor', 'DC', 32, 0.6),
      createPlayer('Dani Escriche', 'DC', 27, 0.5),
      createPlayer('Samuel Obeng', 'DC', 28, 0.5)
    ]
  },

  // ========== SD HUESCA ==========
  huesca: {
    name: 'SD Huesca', shortName: 'HUE', city: 'Huesca',
    stadium: 'El Alcoraz', stadiumCapacity: 9087,
    budget: 4000000, reputation: 60, league: 'segunda',
    colors: { primary: '#005BAC', secondary: '#FF0000' },
    players: [
      createPlayer('Juan Pérez', 'POR', 29, 0.3),
      createPlayer('Dani Jiménez', 'POR', 35, 0.2),
      createPlayer('Álvaro Carrillo', 'DFC', 23, 0.6),
      createPlayer('Jorge Pulido', 'DFC', 34, 0.5),
      createPlayer('Piña', 'DFC', 31, 0.3),
      createPlayer('Jordi Martín', 'LTI', 25, 0.6),
      createPlayer('Julio Alonso', 'LTI', 27, 0.6),
      createPlayer('Ángel Pérez', 'LTD', 23, 0.6),
      createPlayer('Toni Abad', 'LTD', 29, 0.5),
      createPlayer('Iker Kortajarena', 'MC', 25, 0.8),
      createPlayer('Jesús Álvarez', 'MC', 26, 0.6),
      createPlayer('Javi Mier', 'MC', 26, 0.5),
      createPlayer('Daniel Luna', 'MCO', 22, 0.6),
      createPlayer('Dani Ojeda', 'EI', 31, 0.8),
      createPlayer('Efe Aghama', 'EI', 21, 0.7),
      createPlayer('Enol Rodríguez', 'DC', 24, 0.6),
      createPlayer('Samuel Ntamack', 'DC', 24, 0.5)
    ]
  },

  // ========== AD CEUTA ==========
  ceuta: {
    name: 'AD Ceuta FC', shortName: 'CEU', city: 'Ceuta',
    stadium: 'Alfonso Murube', stadiumCapacity: 6590,
    budget: 3000000, reputation: 55, league: 'segunda',
    colors: { primary: '#005BAC', secondary: '#FFFFFF' },
    players: [
      createPlayer('Guillermo Vallejo', 'POR', 30, 0.4),
      createPlayer('Pedro López', 'POR', 31, 0.2),
      createPlayer('Diego González', 'DFC', 26, 0.6),
      createPlayer('Yago Cantero', 'DFC', 26, 0.3),
      createPlayer('Carlos Hernández', 'DFC', 35, 0.1),
      createPlayer('José Matos', 'LTI', 30, 0.8),
      createPlayer('Gonzalo Almenara', 'LTD', 28, 0.3),
      createPlayer('José Campaña', 'MC', 32, 0.75),
      createPlayer('Youness Lachhab', 'MC', 26, 0.6),
      createPlayer('Yann Bodiger', 'MC', 30, 0.5),
      createPlayer('Aisar Ahmed', 'MCO', 24, 0.6),
      createPlayer('Kuki Zalazar', 'MCO', 27, 0.5),
      createPlayer('Konrad de la Fuente', 'EI', 24, 0.7),
      createPlayer('Anuar', 'ED', 31, 0.8),
      createPlayer('Marc Domènech', 'DC', 19, 1.0),
      createPlayer('Marcos Fernández', 'DC', 22, 0.8),
      createPlayer('Juanto Ortuño', 'DC', 33, 0.3)
    ]
  },

  // ========== CULTURAL LEONESA ==========
  cultural_leonesa: {
    name: 'Cultural Leonesa', shortName: 'CUL', city: 'León',
    stadium: 'Reino de León', stadiumCapacity: 13354,
    budget: 3000000, reputation: 55, league: 'segunda',
    colors: { primary: '#FFFFFF', secondary: '#FF0000' },
    players: [
      createPlayer('Edgar Badia', 'POR', 33, 0.5),
      createPlayer('Miguel Bañuz', 'POR', 32, 0.2),
      createPlayer('Tomás Ribeiro', 'DFC', 26, 1.0),
      createPlayer('Matia Barzic', 'DFC', 21, 0.8),
      createPlayer('Roger Hinojo', 'DFC', 20, 0.7),
      createPlayer('Quique Fornos', 'DFC', 29, 0.3),
      createPlayer('Homam Al-Amin', 'LTI', 26, 0.5),
      createPlayer('Iván Calero', 'LTD', 30, 0.7),
      createPlayer('Thiago Ojeda', 'MC', 23, 0.6),
      createPlayer('Yayo González', 'MC', 21, 0.3),
      createPlayer('Bicho', 'MCO', 29, 0.3),
      createPlayer('Luis Chacón', 'EI', 25, 0.8),
      createPlayer('Diego Collado', 'EI', 25, 0.4),
      createPlayer('Lucas Ribeiro', 'ED', 27, 2.0),
      createPlayer('Manu Justo', 'DC', 29, 0.5),
      createPlayer('Rubén Sobrino', 'DC', 33, 0.5)
    ]
  },

  // ========== REAL SOCIEDAD B ==========
  real_sociedad_b: {
    name: 'Real Sociedad B', shortName: 'RSB', city: 'San Sebastián',
    stadium: 'Zubieta', stadiumCapacity: 2500,
    budget: 3000000, reputation: 55, league: 'segunda',
    colors: { primary: '#0067B1', secondary: '#FFFFFF' },
    players: [
      createPlayer('Aitor Fraga', 'POR', 22, 0.5),
      createPlayer('Egoitz Arana', 'POR', 23, 0.1),
      createPlayer('Peru Rodríguez', 'DFC', 23, 0.6),
      createPlayer('Luken Beitia', 'DFC', 21, 0.3),
      createPlayer('Jon Balda', 'LTI', 23, 0.6),
      createPlayer('Iñaki Rupérez', 'LTD', 23, 0.3),
      createPlayer('Mikel Rodriguez', 'MC', 23, 0.5),
      createPlayer('Gorka Gorosabel', 'MC', 19, 0.5),
      createPlayer('Alex Lebarbier', 'MC', 21, 0.4),
      createPlayer('Lander Astiazaran', 'MCO', 19, 0.5),
      createPlayer('Arkaitz Mariezkurrena', 'EI', 20, 0.8),
      createPlayer('Alex Marchal', 'EI', 18, 0.8),
      createPlayer('Dani Díaz', 'ED', 19, 0.4),
      createPlayer('Gorka Carrera', 'DC', 20, 1.0),
      createPlayer('Sydney Osazuwa', 'DC', 18, 1.0)
    ]
  }
};

export const segundaTeamsArray = Object.entries(segundaTeams).map(([id, team]) => ({
  id,
  ...team
}));

export default segundaTeams;
