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
      createPlayer('Álvaro Fernández', 'GK', 27, 1.8),
      createPlayer('Daniel Bachmann', 'GK', 31, 0.6),
      createPlayer('Germán Parreño', 'GK', 32, 0.3),
      createPlayer('Lucas Noubi', 'CB', 21, 1.5),
      createPlayer('Dani Barcia', 'CB', 23, 1.2),
      createPlayer('Arnau Comas', 'CB', 25, 0.5),
      createPlayer('Giacomo Quagliata', 'LB', 25, 1.5),
      createPlayer('Sergio Escudero', 'LB', 36, 0.1),
      createPlayer('Adrià Altimira', 'RB', 24, 1.4),
      createPlayer('Miguel Loureiro', 'RB', 29, 1.0),
      createPlayer('José Gragera', 'CM', 25, 1.5),
      createPlayer('Diego Villares', 'CM', 29, 0.8),
      createPlayer('Charlie Patiño', 'CM', 22, 0.6),
      createPlayer('Rubén López', 'CM', 21, 0.5),
      createPlayer('Mario Soriano', 'CAM', 23, 2.0),
      createPlayer('Yeremay Hernández', 'LW', 23, 25.0),
      createPlayer('David Mella', 'RW', 20, 5.0),
      createPlayer('Luismi Cruz', 'RW', 24, 1.4),
      createPlayer('Stoichkov', 'CAM', 32, 0.9),
      createPlayer('Samuele Mulattieri', 'ST', 25, 3.0),
      createPlayer('Zakaria Eddahchouri', 'ST', 25, 2.0)
    ]
  },

  // ========== RACING SANTANDER ==========
  racing_santander: {
    name: 'Racing de Santander', shortName: 'RAC', city: 'Santander',
    stadium: 'El Sardinero', stadiumCapacity: 22222,
    budget: 12000000, reputation: 68, league: 'segunda',
    colors: { primary: '#00A651', secondary: '#FFFFFF' },
    players: [
      createPlayer('Jokin Ezkieta', 'GK', 29, 2.5),
      createPlayer('Simon Eriksson', 'GK', 19, 1.5),
      createPlayer('Facundo González', 'CB', 22, 3.0),
      createPlayer('Javi Castro', 'CB', 25, 1.8),
      createPlayer('Manu Hernando', 'CB', 27, 1.4),
      createPlayer('Pablo Ramón', 'CB', 24, 0.6),
      createPlayer('Jorge Salinas', 'LB', 18, 4.0),
      createPlayer('Mario García', 'LB', 22, 0.9),
      createPlayer('Clément Michelin', 'RB', 28, 1.5),
      createPlayer('Álvaro Mantilla', 'RB', 25, 0.7),
      createPlayer('Damián Rodríguez', 'CDM', 22, 2.0),
      createPlayer('Maguette Gueye', 'CDM', 23, 1.0),
      createPlayer('Gustavo Puerta', 'CM', 22, 3.5),
      createPlayer('Aritz Aldasoro', 'CM', 26, 2.0),
      createPlayer('Peio Canales', 'CAM', 21, 5.0),
      createPlayer('Iñigo Vicente', 'LW', 28, 4.0),
      createPlayer('Andrés Martín', 'RW', 26, 5.0),
      createPlayer('Asier Villalibre', 'ST', 28, 2.0),
      createPlayer('Juan Carlos Arana', 'ST', 25, 1.8),
      createPlayer('Giorgi Guliashvili', 'ST', 24, 1.3)
    ]
  },

  // ========== UD ALMERÍA ==========
  almeria: {
    name: 'UD Almería', shortName: 'ALM', city: 'Almería',
    stadium: 'Power Horse Stadium', stadiumCapacity: 15000,
    budget: 14000000, reputation: 68, league: 'segunda',
    colors: { primary: '#ED1C24', secondary: '#FFFFFF' },
    players: [
      createPlayer('Fernando Martínez', 'GK', 35, 0.2),
      createPlayer('Andrés Fernández', 'GK', 39, 0.1),
      createPlayer('Federico Bonini', 'CB', 24, 3.0),
      createPlayer('Chumi', 'CB', 26, 1.0),
      createPlayer('Nélson Monte', 'CB', 30, 0.5),
      createPlayer('Álex Muñoz', 'LB', 31, 1.0),
      createPlayer('Álex Centelles', 'LB', 26, 0.8),
      createPlayer('Daijiro Chirino', 'RB', 24, 1.5),
      createPlayer('Dion Lopy', 'CDM', 23, 4.0),
      createPlayer('André Horta', 'CM', 29, 2.0),
      createPlayer('Arnau Puigmal', 'CM', 25, 1.5),
      createPlayer('Iddrisu Baba', 'CM', 30, 1.0),
      createPlayer('Sergio Arribas', 'CAM', 24, 10.0),
      createPlayer('Nico Melamed', 'CAM', 24, 3.0),
      createPlayer('Jon Morcillo', 'LW', 27, 2.0),
      createPlayer('Patrick Soko', 'RW', 28, 1.2),
      createPlayer('Thalys', 'ST', 20, 6.0),
      createPlayer('Miguel de la Fuente', 'ST', 26, 2.0),
      createPlayer('Léo Baptistão', 'ST', 33, 0.8)
    ]
  },

  // ========== REAL VALLADOLID ==========
  valladolid: {
    name: 'Real Valladolid', shortName: 'VLL', city: 'Valladolid',
    stadium: 'José Zorrilla', stadiumCapacity: 27618,
    budget: 10000000, reputation: 67, league: 'segunda',
    colors: { primary: '#6B2E7D', secondary: '#FFFFFF' },
    players: [
      createPlayer('Guilherme Fernandes', 'GK', 24, 0.6),
      createPlayer('Álvaro Aceves', 'GK', 22, 0.4),
      createPlayer('David Torres', 'CB', 22, 1.5),
      createPlayer('Pablo Tomeo', 'CB', 26, 1.5),
      createPlayer('Ramón Martínez', 'CB', 23, 1.0),
      createPlayer('Mohamed Jaouab', 'CB', 23, 0.6),
      createPlayer('Guille Bueno', 'LB', 23, 1.2),
      createPlayer('Iván Alejo', 'RB', 30, 1.0),
      createPlayer('Stanko Juric', 'CDM', 29, 1.2),
      createPlayer('Mathis Lachuer', 'CDM', 25, 1.0),
      createPlayer('Víctor Meseguer', 'CM', 26, 1.5),
      createPlayer('Chuki', 'CAM', 21, 4.0),
      createPlayer('Julien Ponceau', 'CAM', 25, 2.5),
      createPlayer('Stipe Biuk', 'LW', 23, 2.5),
      createPlayer('Sergi Canós', 'LW', 28, 0.8),
      createPlayer('Peter Federico', 'RW', 23, 1.5),
      createPlayer('Amath Ndiaye', 'RW', 29, 0.9),
      createPlayer('Juanmi Latasa', 'ST', 24, 2.0),
      createPlayer('Noah Ohio', 'ST', 23, 1.0),
      createPlayer('Marcos André', 'ST', 29, 0.8)
    ]
  },

  // ========== SPORTING GIJÓN ==========
  sporting_gijon: {
    name: 'Sporting de Gijón', shortName: 'SPO', city: 'Gijón',
    stadium: 'El Molinón', stadiumCapacity: 30000,
    budget: 9000000, reputation: 66, league: 'segunda',
    colors: { primary: '#FF0000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Rubén Yáñez', 'GK', 32, 1.0),
      createPlayer('Christian Joel', 'GK', 26, 0.7),
      createPlayer('Lucas Perrin', 'CB', 27, 2.0),
      createPlayer('Diego Sánchez', 'CB', 22, 0.8),
      createPlayer('Eric Curbelo', 'CB', 32, 0.4),
      createPlayer('Brian Oliván', 'LB', 31, 1.0),
      createPlayer('Pablo García', 'LB', 25, 0.6),
      createPlayer('Guille Rosas', 'RB', 25, 1.5),
      createPlayer('Mamadou Loum', 'CDM', 29, 0.8),
      createPlayer('Nacho Martín', 'CM', 23, 1.0),
      createPlayer('Àlex Corredera', 'CM', 29, 0.8),
      createPlayer('César Gelabert', 'CAM', 25, 3.0),
      createPlayer('Jonathan Dubasin', 'LW', 25, 3.5),
      createPlayer('Gaspar Campos', 'LW', 25, 2.0),
      createPlayer('Dani Queipo', 'LW', 23, 1.2),
      createPlayer('Juan Otero', 'RW', 30, 1.8),
      createPlayer('Andrés Ferrari', 'ST', 23, 2.2)
    ]
  },

  // ========== CÁDIZ CF ==========
  cadiz: {
    name: 'Cádiz CF', shortName: 'CAD', city: 'Cádiz',
    stadium: 'Nuevo Mirandilla', stadiumCapacity: 20724,
    budget: 8000000, reputation: 66, league: 'segunda',
    colors: { primary: '#FFD700', secondary: '#004D98' },
    players: [
      createPlayer('Victor Aznar', 'GK', 23, 1.2),
      createPlayer('David Gil', 'GK', 32, 0.4),
      createPlayer('Bojan Kovacevic', 'CB', 21, 1.5),
      createPlayer('Iker Recio', 'CB', 24, 0.7),
      createPlayer('Jorge Moreno', 'CB', 24, 0.5),
      createPlayer('Fali', 'CB', 32, 0.4),
      createPlayer('Mario Climent', 'LB', 23, 0.7),
      createPlayer('Iza Carcelén', 'RB', 32, 0.7),
      createPlayer('Rominigue Kouamé', 'CM', 29, 2.0),
      createPlayer('Moussa Diakité', 'CM', 22, 1.0),
      createPlayer('Sergio Ortuño', 'CM', 26, 1.0),
      createPlayer('Álex Fernández', 'CM', 33, 0.4),
      createPlayer('Antoñito Cordero', 'LW', 19, 2.0),
      createPlayer('Javi Ontiveros', 'LW', 28, 1.8),
      createPlayer('Suso', 'RW', 32, 1.2),
      createPlayer('Iuri Tabatadze', 'RW', 26, 1.0),
      createPlayer('Jerónimo Dómina', 'ST', 20, 2.0),
      createPlayer('Dawda Camara', 'ST', 23, 1.0),
      createPlayer('Roger Martí', 'ST', 35, 0.3)
    ]
  },

  // ========== REAL ZARAGOZA ==========
  zaragoza: {
    name: 'Real Zaragoza', shortName: 'ZAR', city: 'Zaragoza',
    stadium: 'La Romareda', stadiumCapacity: 33608,
    budget: 8000000, reputation: 66, league: 'segunda',
    colors: { primary: '#004D98', secondary: '#FFFFFF' },
    players: [
      createPlayer('Esteban Andrada', 'GK', 35, 0.8),
      createPlayer('Adrián Rodríguez', 'GK', 25, 0.2),
      createPlayer('Pablo Insua', 'CB', 32, 0.6),
      createPlayer('Tachi', 'CB', 28, 0.6),
      createPlayer('Aleksandar Radovanovic', 'CB', 32, 0.45),
      createPlayer('Dani Tasende', 'LB', 25, 0.8),
      createPlayer('Martín Aguirregabiria', 'RB', 29, 0.4),
      createPlayer('Paul Akouokou', 'CDM', 28, 0.6),
      createPlayer('Francho Serrano', 'CM', 24, 3.0),
      createPlayer('Keidi Bare', 'CM', 28, 1.2),
      createPlayer('Raúl Guti', 'CM', 29, 1.2),
      createPlayer('Toni Moya', 'CM', 27, 1.0),
      createPlayer('Sebas Moyano', 'LW', 28, 1.2),
      createPlayer('Pau Sans', 'RW', 21, 1.5),
      createPlayer('Paulino de la Fuente', 'RW', 28, 1.0),
      createPlayer('Mario Soberón', 'ST', 28, 1.5),
      createPlayer('Dani Gómez', 'ST', 27, 1.0),
      createPlayer('Kenan Kodro', 'ST', 32, 0.5)
    ]
  },

  // ========== GRANADA CF ==========
  granada: {
    name: 'Granada CF', shortName: 'GRA', city: 'Granada',
    stadium: 'Nuevo Los Cármenes', stadiumCapacity: 22524,
    budget: 7000000, reputation: 65, league: 'segunda',
    colors: { primary: '#C8102E', secondary: '#FFFFFF' },
    players: [
      createPlayer('Luca Zidane', 'GK', 27, 1.0),
      createPlayer('Ander Astralaga', 'GK', 21, 0.8),
      createPlayer('Loïc Williams', 'CB', 24, 1.0),
      createPlayer('Oscar Naasei', 'CB', 20, 0.8),
      createPlayer('Manu Lama', 'CB', 24, 0.6),
      createPlayer('Baïla Diallo', 'LB', 24, 0.8),
      createPlayer('Álvaro Lemos', 'RB', 32, 0.4),
      createPlayer('Pau Casadesús', 'RB', 22, 0.3),
      createPlayer('Sergio Ruiz', 'CM', 31, 1.5),
      createPlayer('Pedro Alemañ', 'CM', 23, 1.2),
      createPlayer('Luka Gagnidze', 'CM', 22, 1.0),
      createPlayer('José Manuel Arnáiz', 'CAM', 30, 0.9),
      createPlayer('Sergio Rodelas', 'LW', 21, 0.8),
      createPlayer('Álex Sola', 'RW', 26, 2.0),
      createPlayer('Gonzalo Petit', 'ST', 19, 4.0),
      createPlayer('Jorge Pascual', 'ST', 22, 1.2),
      createPlayer('Mohamed Bouldini', 'ST', 30, 0.5)
    ]
  },

  // ========== BURGOS CF ==========
  burgos: {
    name: 'Burgos CF', shortName: 'BUR', city: 'Burgos',
    stadium: 'El Plantío', stadiumCapacity: 12200,
    budget: 6000000, reputation: 62, league: 'segunda',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Ander Cantero', 'GK', 31, 1.0),
      createPlayer('Jesús Ruiz', 'GK', 29, 0.7),
      createPlayer('Oier Luengo', 'CB', 28, 0.9),
      createPlayer('Grego Sierra', 'CB', 32, 0.6),
      createPlayer('Florian Miguel', 'LB', 29, 1.2),
      createPlayer('Álex Lizancos', 'RB', 22, 0.7),
      createPlayer('Pablo Galdames', 'CM', 29, 1.3),
      createPlayer('Miguel Atienza', 'CM', 26, 1.0),
      createPlayer('David González', 'CM', 23, 1.0),
      createPlayer('Kévin Appin', 'CM', 28, 0.8),
      createPlayer('Iñigo Córdoba', 'LW', 28, 1.5),
      createPlayer('Curro Sánchez', 'RW', 30, 1.8),
      createPlayer('Iván Chapela', 'RW', 26, 1.0),
      createPlayer('Fer Niño', 'ST', 25, 2.0),
      createPlayer('Mario González', 'ST', 29, 1.0)
    ]
  },

  // ========== MÁLAGA CF ==========
  malaga: {
    name: 'Málaga CF', shortName: 'MAL', city: 'Málaga',
    stadium: 'La Rosaleda', stadiumCapacity: 30044,
    budget: 6000000, reputation: 64, league: 'segunda',
    colors: { primary: '#007FFF', secondary: '#FFFFFF' },
    players: [
      createPlayer('Alfonso Herrero', 'GK', 31, 0.4),
      createPlayer('Carlos López', 'GK', 21, 0.1),
      createPlayer('Javi Montero', 'CB', 27, 1.0),
      createPlayer('Diego Murillo', 'CB', 24, 0.7),
      createPlayer('Einar Galilea', 'CB', 31, 0.4),
      createPlayer('Dani Sánchez', 'LB', 26, 0.4),
      createPlayer('Jokin Gabilondo', 'RB', 26, 0.4),
      createPlayer('Carlos Puga', 'RB', 25, 0.3),
      createPlayer('Carlos Dotor', 'CM', 24, 1.0),
      createPlayer('Izan Merino', 'CM', 19, 1.0),
      createPlayer('Rafa Rodríguez', 'CAM', 22, 1.0),
      createPlayer('Dani Lorenzo', 'CAM', 22, 0.8),
      createPlayer('Julen Lobete', 'LW', 25, 1.2),
      createPlayer('Joaquín Muñoz', 'LW', 26, 1.0),
      createPlayer('David Larrubia', 'RW', 23, 1.2),
      createPlayer('Chupe', 'ST', 21, 1.5),
      createPlayer('Adrián Niño', 'ST', 21, 1.0),
      createPlayer('Eneko Jauregi', 'ST', 29, 0.7)
    ]
  },

  // ========== CD CASTELLÓN ==========
  castellon: {
    name: 'CD Castellón', shortName: 'CAS', city: 'Castellón',
    stadium: 'Nou Castalia', stadiumCapacity: 15500,
    budget: 5000000, reputation: 60, league: 'segunda',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Romain Matthys', 'GK', 27, 0.7),
      createPlayer('Amir Abedzadeh', 'GK', 32, 0.3),
      createPlayer('Fabrizio Brignani', 'CB', 28, 1.2),
      createPlayer('Agustín Sienra', 'CB', 26, 0.5),
      createPlayer('Lucas Alcázar', 'LB', 23, 0.6),
      createPlayer('Jérémy Mellot', 'RB', 31, 0.7),
      createPlayer('Diego Barri', 'CM', 30, 0.5),
      createPlayer('Marc-Olivier Doué', 'CM', 25, 0.4),
      createPlayer('Álex Calatrava', 'CAM', 25, 3.0),
      createPlayer('Brian Cipenga', 'LW', 27, 1.4),
      createPlayer('Raúl Sánchez', 'LW', 28, 0.9),
      createPlayer('Douglas Aurélio', 'RW', 26, 0.8),
      createPlayer('Adam Jakobsen', 'ST', 26, 1.8),
      createPlayer('Ousmane Camara', 'ST', 24, 0.8)
    ]
  },

  // ========== FC ANDORRA ==========
  andorra: {
    name: 'FC Andorra', shortName: 'AND', city: 'Andorra la Vella',
    stadium: 'Estadi Nacional', stadiumCapacity: 3306,
    budget: 5000000, reputation: 58, league: 'segunda',
    colors: { primary: '#003366', secondary: '#FFD700' },
    players: [
      createPlayer('Áron Yaakobishvili', 'GK', 19, 1.5),
      createPlayer('Jesús Owono', 'GK', 24, 0.9),
      createPlayer('Edgar González', 'CB', 28, 1.5),
      createPlayer('Gael Alonso', 'CB', 23, 0.8),
      createPlayer('Marc Bombardó', 'CB', 20, 0.7),
      createPlayer('Imanol García', 'LB', 25, 0.8),
      createPlayer('Thomas Carrique', 'RB', 26, 0.6),
      createPlayer('Efe Akman', 'CDM', 19, 0.5),
      createPlayer('Dani Villahermosa', 'CM', 25, 0.8),
      createPlayer('Marc Doménech', 'CM', 23, 0.5),
      createPlayer('Min-su Kim', 'LW', 20, 2.0),
      createPlayer('Aingeru Olabarrieta', 'RW', 20, 0.8),
      createPlayer('Yeray Cabanzón', 'RW', 22, 0.5),
      createPlayer('Lautaro de León', 'ST', 24, 0.8),
      createPlayer('Marc Cardona', 'ST', 30, 0.5)
    ]
  },

  // ========== SD EIBAR ==========
  eibar: {
    name: 'SD Eibar', shortName: 'EIB', city: 'Éibar',
    stadium: 'Ipurua', stadiumCapacity: 8164,
    budget: 5000000, reputation: 62, league: 'segunda',
    colors: { primary: '#003399', secondary: '#FF0000' },
    players: [
      createPlayer('Jonmi Magunagoitia', 'GK', 25, 0.8),
      createPlayer('Luis López', 'GK', 24, 0.3),
      createPlayer('Marco Moreno', 'CB', 24, 0.7),
      createPlayer('Aritz Arambarri', 'CB', 27, 0.6),
      createPlayer('Leonardo Buta', 'LB', 23, 1.5),
      createPlayer('Sergio Cubero', 'RB', 26, 0.7),
      createPlayer('Peru Nolaskoain', 'CDM', 27, 0.7),
      createPlayer('Sergio Álvarez', 'CDM', 34, 0.5),
      createPlayer('Aleix Garrido', 'CM', 21, 1.0),
      createPlayer('Jon Magunazelaia', 'CAM', 24, 0.9),
      createPlayer('Javi Martínez', 'CAM', 26, 0.8),
      createPlayer('Adu Ares', 'RW', 24, 1.4),
      createPlayer('Xeber Alkain', 'RW', 28, 0.8),
      createPlayer('Jon Bautista', 'ST', 30, 1.8),
      createPlayer('Javi Martón', 'ST', 26, 0.7)
    ]
  },

  // ========== CD MIRANDÉS ==========
  mirandes: {
    name: 'CD Mirandés', shortName: 'MIR', city: 'Miranda de Ebro',
    stadium: 'Anduva', stadiumCapacity: 5762,
    budget: 4000000, reputation: 58, league: 'segunda',
    colors: { primary: '#FF0000', secondary: '#000000' },
    players: [
      createPlayer('Igor Nikic', 'GK', 25, 0.7),
      createPlayer('Juanpa Palomares', 'GK', 25, 0.3),
      createPlayer('Adrián Pica', 'CB', 23, 1.0),
      createPlayer('Jorge Cabello', 'CB', 21, 0.9),
      createPlayer('Juan Gutiérrez', 'CB', 25, 0.8),
      createPlayer('Fernando Medrano', 'LB', 25, 0.4),
      createPlayer('Hugo Novoa', 'RB', 23, 1.0),
      createPlayer('Thiago Helguera', 'CDM', 19, 3.5),
      createPlayer('Aarón Martin', 'CM', 19, 1.0),
      createPlayer('Rafel Bauzà', 'CM', 20, 0.8),
      createPlayer('Javi Hernández', 'CAM', 21, 0.5),
      createPlayer('Álex Cardero', 'CAM', 22, 0.4),
      createPlayer('Salim El Jebari', 'LW', 21, 0.4),
      createPlayer('Carlos Fernández', 'ST', 29, 1.0),
      createPlayer('Alberto Marí', 'ST', 24, 0.8)
    ]
  },

  // ========== CÓRDOBA CF ==========
  cordoba: {
    name: 'Córdoba CF', shortName: 'COR', city: 'Córdoba',
    stadium: 'El Arcángel', stadiumCapacity: 21822,
    budget: 4000000, reputation: 60, league: 'segunda',
    colors: { primary: '#00A651', secondary: '#FFFFFF' },
    players: [
      createPlayer('Iker Álvarez', 'GK', 24, 0.8),
      createPlayer('Carlos Marín', 'GK', 28, 0.8),
      createPlayer('Franck Fomeyem', 'CB', 26, 0.6),
      createPlayer('Rubén Alves', 'CB', 31, 0.5),
      createPlayer('Álex Martín', 'CB', 28, 0.4),
      createPlayer('Ignasi Vilarrasa', 'LB', 26, 1.0),
      createPlayer('Carlos Albarrán', 'RB', 32, 0.3),
      createPlayer('Isma Ruiz', 'CM', 24, 0.9),
      createPlayer('Alberto del Moral', 'CM', 25, 0.8),
      createPlayer('Théo Zidane', 'CM', 23, 0.6),
      createPlayer('Pedro Ortiz', 'CM', 25, 0.6),
      createPlayer('Jacobo González', 'LW', 28, 0.9),
      createPlayer('Kevin Medina', 'LW', 24, 0.8),
      createPlayer('Cristian Carracedo', 'RW', 30, 0.8),
      createPlayer('Adrián Fuentes', 'ST', 29, 0.6),
      createPlayer('Sergi Guardiola', 'ST', 34, 0.4)
    ]
  },

  // ========== ALBACETE ==========
  albacete: {
    name: 'Albacete Balompié', shortName: 'ALB', city: 'Albacete',
    stadium: 'Carlos Belmonte', stadiumCapacity: 17524,
    budget: 4000000, reputation: 60, league: 'segunda',
    colors: { primary: '#FFFFFF', secondary: '#FF0000' },
    players: [
      createPlayer('Raúl Lizoain', 'GK', 35, 0.2),
      createPlayer('Diego Mariño', 'GK', 35, 0.1),
      createPlayer('Jesús Vallejo', 'CB', 29, 1.0),
      createPlayer('Lluís López', 'CB', 28, 0.7),
      createPlayer('Pepe Sánchez', 'CB', 25, 0.3),
      createPlayer('Carlos Neva', 'LB', 29, 1.0),
      createPlayer('Jonathan Gómez', 'LB', 22, 0.8),
      createPlayer('Lorenzo Aguado', 'RB', 23, 0.2),
      createPlayer('Riki Rodríguez', 'CM', 28, 1.4),
      createPlayer('Agus Medina', 'CM', 31, 1.0),
      createPlayer('Antonio Pacheco', 'CM', 24, 0.7),
      createPlayer('José Carlos Lazo', 'LW', 29, 0.7),
      createPlayer('Antonio Puertas', 'RW', 33, 0.8),
      createPlayer('Jefté Betancor', 'ST', 32, 0.6),
      createPlayer('Dani Escriche', 'ST', 27, 0.5),
      createPlayer('Samuel Obeng', 'ST', 28, 0.5)
    ]
  },

  // ========== SD HUESCA ==========
  huesca: {
    name: 'SD Huesca', shortName: 'HUE', city: 'Huesca',
    stadium: 'El Alcoraz', stadiumCapacity: 9087,
    budget: 4000000, reputation: 60, league: 'segunda',
    colors: { primary: '#005BAC', secondary: '#FF0000' },
    players: [
      createPlayer('Juan Pérez', 'GK', 29, 0.3),
      createPlayer('Dani Jiménez', 'GK', 35, 0.2),
      createPlayer('Álvaro Carrillo', 'CB', 23, 0.6),
      createPlayer('Jorge Pulido', 'CB', 34, 0.5),
      createPlayer('Piña', 'CB', 31, 0.3),
      createPlayer('Jordi Martín', 'LB', 25, 0.6),
      createPlayer('Julio Alonso', 'LB', 27, 0.6),
      createPlayer('Ángel Pérez', 'RB', 23, 0.6),
      createPlayer('Toni Abad', 'RB', 29, 0.5),
      createPlayer('Iker Kortajarena', 'CM', 25, 0.8),
      createPlayer('Jesús Álvarez', 'CM', 26, 0.6),
      createPlayer('Javi Mier', 'CM', 26, 0.5),
      createPlayer('Daniel Luna', 'CAM', 22, 0.6),
      createPlayer('Dani Ojeda', 'LW', 31, 0.8),
      createPlayer('Efe Aghama', 'LW', 21, 0.7),
      createPlayer('Enol Rodríguez', 'ST', 24, 0.6),
      createPlayer('Samuel Ntamack', 'ST', 24, 0.5)
    ]
  },

  // ========== AD CEUTA ==========
  ceuta: {
    name: 'AD Ceuta FC', shortName: 'CEU', city: 'Ceuta',
    stadium: 'Alfonso Murube', stadiumCapacity: 6590,
    budget: 3000000, reputation: 55, league: 'segunda',
    colors: { primary: '#005BAC', secondary: '#FFFFFF' },
    players: [
      createPlayer('Guillermo Vallejo', 'GK', 30, 0.4),
      createPlayer('Pedro López', 'GK', 31, 0.2),
      createPlayer('Diego González', 'CB', 26, 0.6),
      createPlayer('Yago Cantero', 'CB', 26, 0.3),
      createPlayer('Carlos Hernández', 'CB', 35, 0.1),
      createPlayer('José Matos', 'LB', 30, 0.8),
      createPlayer('Gonzalo Almenara', 'RB', 28, 0.3),
      createPlayer('José Campaña', 'CM', 32, 0.75),
      createPlayer('Youness Lachhab', 'CM', 26, 0.6),
      createPlayer('Yann Bodiger', 'CM', 30, 0.5),
      createPlayer('Aisar Ahmed', 'CAM', 24, 0.6),
      createPlayer('Kuki Zalazar', 'CAM', 27, 0.5),
      createPlayer('Konrad de la Fuente', 'LW', 24, 0.7),
      createPlayer('Anuar', 'RW', 31, 0.8),
      createPlayer('Marc Domènech', 'ST', 19, 1.0),
      createPlayer('Marcos Fernández', 'ST', 22, 0.8),
      createPlayer('Juanto Ortuño', 'ST', 33, 0.3)
    ]
  },

  // ========== CULTURAL LEONESA ==========
  cultural_leonesa: {
    name: 'Cultural Leonesa', shortName: 'CUL', city: 'León',
    stadium: 'Reino de León', stadiumCapacity: 13354,
    budget: 3000000, reputation: 55, league: 'segunda',
    colors: { primary: '#FFFFFF', secondary: '#FF0000' },
    players: [
      createPlayer('Edgar Badia', 'GK', 33, 0.5),
      createPlayer('Miguel Bañuz', 'GK', 32, 0.2),
      createPlayer('Tomás Ribeiro', 'CB', 26, 1.0),
      createPlayer('Matia Barzic', 'CB', 21, 0.8),
      createPlayer('Roger Hinojo', 'CB', 20, 0.7),
      createPlayer('Quique Fornos', 'CB', 29, 0.3),
      createPlayer('Homam Al-Amin', 'LB', 26, 0.5),
      createPlayer('Iván Calero', 'RB', 30, 0.7),
      createPlayer('Thiago Ojeda', 'CM', 23, 0.6),
      createPlayer('Yayo González', 'CM', 21, 0.3),
      createPlayer('Bicho', 'CAM', 29, 0.3),
      createPlayer('Luis Chacón', 'LW', 25, 0.8),
      createPlayer('Diego Collado', 'LW', 25, 0.4),
      createPlayer('Lucas Ribeiro', 'RW', 27, 2.0),
      createPlayer('Manu Justo', 'ST', 29, 0.5),
      createPlayer('Rubén Sobrino', 'ST', 33, 0.5)
    ]
  },

  // ========== REAL SOCIEDAD B ==========
  real_sociedad_b: {
    name: 'Real Sociedad B', shortName: 'RSB', city: 'San Sebastián',
    stadium: 'Zubieta', stadiumCapacity: 2500,
    budget: 3000000, reputation: 55, league: 'segunda',
    colors: { primary: '#0067B1', secondary: '#FFFFFF' },
    players: [
      createPlayer('Aitor Fraga', 'GK', 22, 0.5),
      createPlayer('Egoitz Arana', 'GK', 23, 0.1),
      createPlayer('Peru Rodríguez', 'CB', 23, 0.6),
      createPlayer('Luken Beitia', 'CB', 21, 0.3),
      createPlayer('Jon Balda', 'LB', 23, 0.6),
      createPlayer('Iñaki Rupérez', 'RB', 23, 0.3),
      createPlayer('Mikel Rodriguez', 'CM', 23, 0.5),
      createPlayer('Gorka Gorosabel', 'CM', 19, 0.5),
      createPlayer('Alex Lebarbier', 'CM', 21, 0.4),
      createPlayer('Lander Astiazaran', 'CAM', 19, 0.5),
      createPlayer('Arkaitz Mariezkurrena', 'LW', 20, 0.8),
      createPlayer('Alex Marchal', 'LW', 18, 0.8),
      createPlayer('Dani Díaz', 'RW', 19, 0.4),
      createPlayer('Gorka Carrera', 'ST', 20, 1.0),
      createPlayer('Sydney Osazuwa', 'ST', 18, 1.0)
    ]
  }
};

export const segundaTeamsArray = Object.entries(segundaTeams).map(([id, team]) => ({
  id,
  ...team
}));

export default segundaTeams;
