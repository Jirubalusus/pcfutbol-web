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
    name: 'Oceanus Deportivo', shortName: 'DEP', city: 'A Coruña',
    stadium: 'Riazor', stadiumCapacity: 32912,
    budget: 15000000, reputation: 70, league: 'segunda',
    colors: { primary: '#005BAC', secondary: '#FFFFFF' },
    players: [
      createPlayer('Santiago Franco', 'POR', 27, 1.8, 64),
      createPlayer('Daniel Bermejo', 'POR', 31, 0.6, 62),
      createPlayer('Gonzalo Palacios', 'POR', 32, 0.3, 61),
      createPlayer('Leandro Navarro', 'DFC', 21, 1.5, 66),
      createPlayer('Davi Braga', 'DFC', 23, 1.2, 64),
      createPlayer('Adriano Campos', 'DFC', 25, 0.5, 62),
      createPlayer('Guilherme Queiroz', 'LB', 25, 1.5, 64),
      createPlayer('Salvador Escalante', 'LB', 36, 0.1, 60),
      createPlayer('A. Aguirre', 'RB', 24, 1.4, 64),
      createPlayer('Manuel Laínez', 'RB', 29, 1.0, 64),
      createPlayer('Jorge Giraldo', 'MC', 25, 1.5, 64),
      createPlayer('Darío Vázquez', 'MC', 29, 0.8, 62),
      createPlayer('Cristiano Pinto', 'MC', 22, 0.6, 62),
      createPlayer('Rafael Laínez', 'MC', 21, 0.5, 64),
      createPlayer('Matheus Saraiva', 'MCO', 23, 2.0, 67),
      createPlayer('D. Herrera', 'EI', 23, 25.0, 79),
      createPlayer('Diego Mendoza', 'ED', 20, 5.0, 72),
      createPlayer('Laurent Chevalier', 'ED', 24, 1.4, 64),
      createPlayer('Sergio', 'MCO', 32, 0.9, 61),
      createPlayer('Sergio Medrano', 'DC', 25, 3.0, 67),
      createPlayer('Gabriel Escalante', 'DC', 25, 2.0, 67)
    ]
  },

  // ========== RACING SANTANDER ==========
  racing_santander: {
    name: 'Sentinel Racing', shortName: 'RAC', city: 'Santander',
    stadium: 'El Sardinero', stadiumCapacity: 22222,
    budget: 12000000, reputation: 68, league: 'segunda',
    colors: { primary: '#00A651', secondary: '#FFFFFF' },
    players: [
      createPlayer('J. Escobar', 'POR', 29, 2.5, 67),
      createPlayer('Sergio Estrada', 'POR', 19, 1.5, 66),
      createPlayer('Fabián Giraldo', 'DFC', 22, 3.0, 67),
      createPlayer('Jorge Carrasco', 'DFC', 25, 1.8, 64),
      createPlayer('Miguel Henriques', 'DFC', 27, 1.4, 64),
      createPlayer('Philippe Renard', 'DFC', 24, 0.6, 62),
      createPlayer('Jorge Salcedo', 'LB', 18, 4.0, 72),
      createPlayer('Matheus Guerreiro', 'LB', 22, 0.9, 62),
      createPlayer('Cédric Moreau', 'RB', 28, 1.5, 64),
      createPlayer('Álvaro Medrano', 'RB', 25, 0.7, 62),
      createPlayer('Douglas Rezende', 'MCD', 22, 2.0, 67),
      createPlayer('M. Guzmán', 'MCD', 23, 1.0, 64),
      createPlayer('G. Pinto', 'MC', 22, 3.5, 67),
      createPlayer('A. Almeida', 'MC', 26, 2.0, 67),
      createPlayer('Philippe Carpentier', 'MCO', 21, 5.0, 72),
      createPlayer('Ismael Valderrama', 'EI', 28, 4.0, 70),
      createPlayer('A. Medrano', 'ED', 26, 5.0, 70),
      createPlayer('Adrián Valderrama', 'DC', 28, 2.0, 67),
      createPlayer('Jaime Aguirre', 'DC', 25, 1.8, 64),
      createPlayer('Gaston Gauthier', 'DC', 24, 1.3, 64)
    ]
  },

  // ========== UD ALMERÍA ==========
  almeria: {
    name: 'Indalo FC', shortName: 'ALM', city: 'Almería',
    stadium: 'Power Horse Stadium', stadiumCapacity: 15000,
    budget: 14000000, reputation: 68, league: 'segunda',
    colors: { primary: '#ED1C24', secondary: '#FFFFFF' },
    players: [
      createPlayer('Fernando Medrano', 'POR', 35, 0.2, 60),
      createPlayer('Adrián Fuentes', 'POR', 39, 0.1, 60),
      createPlayer('Felipe Braga', 'DFC', 24, 3.0, 67),
      createPlayer('Carlos', 'DFC', 26, 1.0, 64),
      createPlayer('Nícolas Moraes', 'DFC', 30, 0.5, 62),
      createPlayer('Agustín Mendoza', 'LB', 31, 1.0, 64),
      createPlayer('Á. Castaño', 'LB', 26, 0.8, 62),
      createPlayer('Duarte Coelho', 'RB', 24, 1.5, 64),
      createPlayer('D. Leitão', 'MCD', 23, 4.0, 70),
      createPlayer('Adrián Heredia', 'MC', 29, 2.0, 67),
      createPlayer('Adriano Pacheco', 'MC', 25, 1.5, 64),
      createPlayer('Ignacio Bravo', 'MC', 30, 1.0, 64),
      createPlayer('Salvador Aguirre', 'MCO', 24, 10.0, 73),
      createPlayer('Nuno Machado', 'MCO', 24, 3.0, 67),
      createPlayer('Joaquín Mendoza', 'EI', 27, 2.0, 67),
      createPlayer('P. Saavedra', 'ED', 28, 1.2, 64),
      createPlayer('Teodoro', 'DC', 20, 6.0, 72),
      createPlayer('M. Fuentes', 'DC', 26, 2.0, 67),
      createPlayer('L. Bermejo', 'DC', 33, 0.8, 61)
    ]
  },

  // ========== REAL VALLADOLID ==========
  valladolid: {
    name: 'Meseta FC', shortName: 'VLL', city: 'Valladolid',
    stadium: 'José Zorrilla', stadiumCapacity: 27618,
    budget: 10000000, reputation: 67, league: 'segunda',
    colors: { primary: '#6B2E7D', secondary: '#FFFFFF' },
    players: [
      createPlayer('Gonzalo Fuentes', 'POR', 24, 0.6, 62),
      createPlayer('Álvaro Arévalo', 'POR', 22, 0.4, 62),
      createPlayer('Diego Tolosa', 'DFC', 22, 1.5, 64),
      createPlayer('P. Teixeira', 'DFC', 26, 1.5, 64),
      createPlayer('Rafael Magalhães', 'DFC', 23, 1.0, 64),
      createPlayer('Mathieu Joubert', 'DFC', 23, 0.6, 62),
      createPlayer('Gabriel Bermejo', 'LB', 23, 1.2, 64),
      createPlayer('Henrique Alcântara', 'RB', 30, 1.0, 64),
      createPlayer('Santiago Juárez', 'MCD', 29, 1.2, 64),
      createPlayer('Miguel Leitão', 'MCD', 25, 1.0, 64),
      createPlayer('Valentín Medrano', 'MC', 26, 1.5, 64),
      createPlayer('Camilo', 'MCO', 21, 4.0, 72),
      createPlayer('Jacques Perrin', 'MCO', 25, 2.5, 67),
      createPlayer('Sergio Belmonte', 'EI', 23, 2.5, 67),
      createPlayer('S. Campos', 'EI', 28, 0.8, 62),
      createPlayer('Pedro Figueroa', 'ED', 23, 1.5, 64),
      createPlayer('Adrián Navarrete', 'ED', 29, 0.9, 62),
      createPlayer('Jacques Lefevre', 'DC', 24, 2.0, 67),
      createPlayer('Néstor Ocampo', 'DC', 23, 1.0, 64),
      createPlayer('M. Aguirre', 'DC', 29, 0.8, 62)
    ]
  },

  // ========== SPORTING GIJÓN ==========
  sporting_gijon: {
    name: 'Ember Sporting', shortName: 'SPO', city: 'Gijón',
    stadium: 'El Molinón', stadiumCapacity: 30000,
    budget: 9000000, reputation: 66, league: 'segunda',
    colors: { primary: '#FF0000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Ramiro Ledesma', 'POR', 32, 1.0, 63),
      createPlayer('Cédric Joubert', 'POR', 26, 0.7, 62),
      createPlayer('Luciano Pacheco', 'DFC', 27, 2.0, 67),
      createPlayer('Duarte Sousa', 'DFC', 22, 0.8, 62),
      createPlayer('Eduardo Cardoso', 'DFC', 32, 0.4, 61),
      createPlayer('Bastien Chevalier', 'LB', 31, 1.0, 64),
      createPlayer('Pedro Gallardo', 'LB', 25, 0.6, 62),
      createPlayer('G. Rezende', 'RB', 25, 1.5, 64),
      createPlayer('Marcos Laínez', 'MCD', 29, 0.8, 62),
      createPlayer('Nicolas Moreau', 'MC', 23, 1.0, 64),
      createPlayer('Daniel Carrasco', 'MC', 29, 0.8, 62),
      createPlayer('Carlos Giraldo', 'MCO', 25, 3.0, 67),
      createPlayer('João Domingues', 'EI', 25, 3.5, 67),
      createPlayer('Gaspard Chevalier', 'EI', 25, 2.0, 67),
      createPlayer('D. Quintero', 'EI', 23, 1.2, 64),
      createPlayer('Jaime Ocampo', 'ED', 30, 1.8, 64),
      createPlayer('Agustín Franco', 'DC', 23, 2.2, 67)
    ]
  },

  // ========== CÁDIZ CF ==========
  cadiz: {
    name: 'Gaditano CF', shortName: 'CAD', city: 'Cádiz',
    stadium: 'Nuevo Mirandilla', stadiumCapacity: 20724,
    budget: 8000000, reputation: 66, league: 'segunda',
    colors: { primary: '#FFD700', secondary: '#004D98' },
    players: [
      createPlayer('Víctor Aguirre', 'POR', 23, 1.2, 64),
      createPlayer('Davi Guedes', 'POR', 32, 0.4, 61),
      createPlayer('Benicio Iturbe', 'DFC', 21, 1.5, 66),
      createPlayer('Ivan Rocha', 'DFC', 24, 0.7, 62),
      createPlayer('Jaime Medrano', 'DFC', 24, 0.5, 62),
      createPlayer('Francisco', 'DFC', 32, 0.4, 61),
      createPlayer('M. Carrasco', 'LB', 23, 0.7, 62),
      createPlayer('I. Castaño', 'RB', 32, 0.7, 61),
      createPlayer('Ramón Giraldo', 'MC', 29, 2.0, 67),
      createPlayer('Marcos Domínguez', 'MC', 22, 1.0, 64),
      createPlayer('Salvador Ocampo', 'MC', 26, 1.0, 64),
      createPlayer('Á. Figueroa', 'MC', 33, 0.4, 61),
      createPlayer('Adrián Castaño', 'EI', 19, 2.0, 69),
      createPlayer('Jacques Hubert', 'EI', 28, 1.8, 64),
      createPlayer('Samuel', 'ED', 32, 1.2, 63),
      createPlayer('Yago Teixeira', 'ED', 26, 1.0, 64),
      createPlayer('Jaime Domínguez', 'DC', 20, 2.0, 69),
      createPlayer('Darío Ceballos', 'DC', 23, 1.0, 64),
      createPlayer('Rémi Masson', 'DC', 35, 0.3, 60)
    ]
  },

  // ========== REAL ZARAGOZA ==========
  zaragoza: {
    name: 'Aragón FC', shortName: 'ZAR', city: 'Zaragoza',
    stadium: 'La Romareda', stadiumCapacity: 33608,
    budget: 8000000, reputation: 66, league: 'segunda',
    colors: { primary: '#004D98', secondary: '#FFFFFF' },
    players: [
      createPlayer('Mathieu Arnaud', 'POR', 35, 0.8, 60),
      createPlayer('André Ramos', 'POR', 25, 0.2, 62),
      createPlayer('Patricio Iturbe', 'DFC', 32, 0.6, 61),
      createPlayer('Tobías', 'DFC', 28, 0.6, 62),
      createPlayer('A. Rezende', 'DFC', 32, 0.45, 61),
      createPlayer('Darío Tolosa', 'LB', 25, 0.8, 62),
      createPlayer('Marcos Aguirre', 'RB', 29, 0.4, 62),
      createPlayer('Pablo Arévalo', 'MCD', 28, 0.6, 62),
      createPlayer('Fábio Saraiva', 'MC', 24, 3.0, 67),
      createPlayer('Waldo Bravo', 'MC', 28, 1.2, 64),
      createPlayer('Rodrigo Gaspar', 'MC', 29, 1.2, 64),
      createPlayer('Tobías Mendoza', 'MC', 27, 1.0, 64),
      createPlayer('Sérgio Magalhães', 'EI', 28, 1.2, 64),
      createPlayer('Pedro Saraiva', 'ED', 21, 1.5, 66),
      createPlayer('Philippe Fontaine', 'ED', 28, 1.0, 64),
      createPlayer('Manuel Salcedo', 'DC', 28, 1.5, 64),
      createPlayer('Damien Gauthier', 'DC', 27, 1.0, 64),
      createPlayer('Kaique Moraes', 'DC', 32, 0.5, 61)
    ]
  },

  // ========== GRANADA CF ==========
  granada: {
    name: 'Alhambra CF', shortName: 'GRA', city: 'Granada',
    stadium: 'Nuevo Los Cármenes', stadiumCapacity: 22524,
    budget: 7000000, reputation: 65, league: 'segunda',
    colors: { primary: '#C8102E', secondary: '#FFFFFF' },
    players: [
      createPlayer('Laurent Fontaine', 'POR', 27, 1.0, 64),
      createPlayer('Adriano Alencar', 'POR', 21, 0.8, 64),
      createPlayer('Laurent Hubert', 'DFC', 24, 1.0, 64),
      createPlayer('Otávio Neves', 'DFC', 20, 0.8, 64),
      createPlayer('Mathieu Lefevre', 'DFC', 24, 0.6, 62),
      createPlayer('Bernardo Duarte', 'LB', 24, 0.8, 62),
      createPlayer('Francisco Leitão', 'RB', 32, 0.4, 61),
      createPlayer('Pedro Castaño', 'RB', 22, 0.3, 62),
      createPlayer('Salvador Robledo', 'MC', 31, 1.5, 64),
      createPlayer('Patricio Acosta', 'MC', 23, 1.2, 64),
      createPlayer('L. Giraldo', 'MC', 22, 1.0, 64),
      createPlayer('Joaquín Arroyo', 'MCO', 30, 0.9, 62),
      createPlayer('S. Renard', 'EI', 21, 0.8, 64),
      createPlayer('Facundo Saavedra', 'ED', 26, 2.0, 67),
      createPlayer('G. Perrin', 'DC', 19, 4.0, 72),
      createPlayer('Joaquín Peralta', 'DC', 22, 1.2, 64),
      createPlayer('Marcos Bermejo', 'DC', 30, 0.5, 62)
    ]
  },

  // ========== BURGOS CF ==========
  burgos: {
    name: 'Citadel CF', shortName: 'BUR', city: 'Burgos',
    stadium: 'El Plantío', stadiumCapacity: 12200,
    budget: 6000000, reputation: 62, league: 'segunda',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Adrián Carrasco', 'POR', 31, 1.0, 64),
      createPlayer('J. Ríos', 'POR', 29, 0.7, 62),
      createPlayer('Olivier Lacroix', 'DFC', 28, 0.9, 62),
      createPlayer('G. Salcedo', 'DFC', 32, 0.6, 61),
      createPlayer('Florian Masson', 'LB', 29, 1.2, 64),
      createPlayer('Leandro Leitão', 'RB', 22, 0.7, 62),
      createPlayer('Pedro Gaspar', 'MC', 29, 1.3, 64),
      createPlayer('Manuel Arévalo', 'MC', 26, 1.0, 64),
      createPlayer('D. Giraldo', 'MC', 23, 1.0, 64),
      createPlayer('Kevin Aguirre', 'MC', 28, 0.8, 62),
      createPlayer('I. Córdoba', 'EI', 28, 1.5, 64),
      createPlayer('Claudio Saavedra', 'ED', 30, 1.8, 64),
      createPlayer('Iván Carrasco', 'ED', 26, 1.0, 64),
      createPlayer('Felipe Novaes', 'DC', 25, 2.0, 67),
      createPlayer('Mathieu Gauthier', 'DC', 29, 1.0, 64)
    ]
  },

  // ========== MÁLAGA CF ==========
  malaga: {
    name: 'Coastline CF', shortName: 'MAL', city: 'Málaga',
    stadium: 'La Rosaleda', stadiumCapacity: 30044,
    budget: 6000000, reputation: 64, league: 'segunda',
    colors: { primary: '#007FFF', secondary: '#FFFFFF' },
    players: [
      createPlayer('Alexandre Henriques', 'POR', 31, 0.4, 62),
      createPlayer('Clément Lefevre', 'POR', 21, 0.1, 64),
      createPlayer('Jorge Medrano', 'DFC', 27, 1.0, 64),
      createPlayer('D. Mendoza', 'DFC', 24, 0.7, 62),
      createPlayer('Eduardo Gaspar', 'DFC', 31, 0.4, 62),
      createPlayer('D. Salcedo', 'LB', 26, 0.4, 62),
      createPlayer('Jonas Guedes', 'RB', 26, 0.4, 62),
      createPlayer('Cássio Pereira', 'RB', 25, 0.3, 62),
      createPlayer('Cristiano Duarte', 'MC', 24, 1.0, 64),
      createPlayer('Igor Machado', 'MC', 19, 1.0, 66),
      createPlayer('R. Robledo', 'MCO', 22, 1.0, 64),
      createPlayer('D. Lacerda', 'MCO', 22, 0.8, 62),
      createPlayer('J. Lacerda', 'EI', 25, 1.2, 64),
      createPlayer('Jonas Moraes', 'EI', 26, 1.0, 64),
      createPlayer('Diego Laínez', 'ED', 23, 1.2, 64),
      createPlayer('Claudio', 'DC', 21, 1.5, 66),
      createPlayer('Adriano Novaes', 'DC', 21, 1.0, 66),
      createPlayer('E. Jurado', 'DC', 29, 0.7, 62)
    ]
  },

  // ========== CD CASTELLÓN ==========
  castellon: {
    name: 'CD Rampart', shortName: 'CAS', city: 'Castellón',
    stadium: 'Nou Castalia', stadiumCapacity: 15500,
    budget: 5000000, reputation: 60, league: 'segunda',
    colors: { primary: '#000000', secondary: '#FFFFFF' },
    players: [
      createPlayer('Rodrigo Machado', 'POR', 27, 0.7, 62),
      createPlayer('A. Arnaud', 'POR', 32, 0.3, 61),
      createPlayer('Florian Beauchamp', 'DFC', 28, 1.2, 64),
      createPlayer('A. Saavedra', 'DFC', 26, 0.5, 62),
      createPlayer('L. Arroyo', 'LB', 23, 0.6, 62),
      createPlayer('J. Machado', 'RB', 31, 0.7, 62),
      createPlayer('D. Bravo', 'MC', 30, 0.5, 62),
      createPlayer('Matheus Domingues', 'MC', 25, 0.4, 62),
      createPlayer('O. Chevalier', 'MCO', 25, 3.0, 67),
      createPlayer('Breno Cardoso', 'EI', 27, 1.4, 64),
      createPlayer('Ramiro Saavedra', 'EI', 28, 0.9, 62),
      createPlayer('Diego Arévalo', 'ED', 26, 0.8, 62),
      createPlayer('Adriano Junqueira', 'DC', 26, 1.8, 64),
      createPlayer('Orlando Castaño', 'DC', 24, 0.8, 62)
    ]
  },

  // ========== FC ANDORRA ==========
  andorra: {
    name: 'FC Andorra', shortName: 'AND', city: 'Andorra la Vella',
    stadium: 'Estadi Nacional', stadiumCapacity: 3306,
    budget: 5000000, reputation: 58, league: 'segunda',
    colors: { primary: '#003366', secondary: '#FFD700' },
    players: [
      createPlayer('Quentin Thibault', 'POR', 19, 1.5, 66),
      createPlayer('João Oliveira', 'POR', 24, 0.9, 62),
      createPlayer('Emilio Gallardo', 'DFC', 28, 1.5, 64),
      createPlayer('Germán Acosta', 'DFC', 23, 0.8, 62),
      createPlayer('M. Bermejo', 'DFC', 20, 0.7, 64),
      createPlayer('Iñaki Guzmán', 'LB', 25, 0.8, 62),
      createPlayer('Tiago Coelho', 'RB', 26, 0.6, 62),
      createPlayer('Xavier Arnaud', 'MCD', 19, 0.5, 64),
      createPlayer('Daniel Valderrama', 'MC', 25, 0.8, 62),
      createPlayer('Manuel Delgado', 'MC', 23, 0.5, 62),
      createPlayer('M. Barbosa', 'EI', 20, 2.0, 69),
      createPlayer('Alexandre Oliveira', 'ED', 20, 0.8, 64),
      createPlayer('Tomás Carrasco', 'ED', 22, 0.5, 62),
      createPlayer('L. Lacerda', 'DC', 24, 0.8, 62),
      createPlayer('Marcos Castaño', 'DC', 30, 0.5, 62)
    ]
  },

  // ========== SD EIBAR ==========
  eibar: {
    name: 'SD Cobalt', shortName: 'EIB', city: 'Éibar',
    stadium: 'Ipurua', stadiumCapacity: 8164,
    budget: 5000000, reputation: 62, league: 'segunda',
    colors: { primary: '#003399', secondary: '#FF0000' },
    players: [
      createPlayer('J. Medrano', 'POR', 25, 0.8, 62),
      createPlayer('Lorenzo Laínez', 'POR', 24, 0.3, 62),
      createPlayer('Mathieu Masson', 'DFC', 24, 0.7, 62),
      createPlayer('Aurelio Acosta', 'DFC', 27, 0.6, 62),
      createPlayer('Leandro Bravo', 'LB', 23, 1.5, 64),
      createPlayer('Santiago Córdoba', 'RB', 26, 0.7, 62),
      createPlayer('Paulo Nascimento', 'MCD', 27, 0.7, 62),
      createPlayer('Sergio Bermejo', 'MCD', 34, 0.5, 61),
      createPlayer('Adrián Gallardo', 'MC', 21, 1.0, 66),
      createPlayer('Jacques Moreau', 'MCO', 24, 0.9, 62),
      createPlayer('João Machado', 'MCO', 26, 0.8, 62),
      createPlayer('A. Acosta', 'ED', 24, 1.4, 64),
      createPlayer('Xavier Arévalo', 'ED', 28, 0.8, 62),
      createPlayer('J. Beauchamp', 'DC', 30, 1.8, 64),
      createPlayer('João Magalhães', 'DC', 26, 0.7, 62)
    ]
  },

  // ========== CD MIRANDÉS ==========
  mirandes: {
    name: 'CD Redoak', shortName: 'MIR', city: 'Miranda de Ebro',
    stadium: 'Anduva', stadiumCapacity: 5762,
    budget: 4000000, reputation: 58, league: 'segunda',
    colors: { primary: '#FF0000', secondary: '#000000' },
    players: [
      createPlayer('Ismael Navarrete', 'POR', 25, 0.7, 62),
      createPlayer('Jacques Pelletier', 'POR', 25, 0.3, 62),
      createPlayer('Adrián Palacios', 'DFC', 23, 1.0, 64),
      createPlayer('Jaime Castaño', 'DFC', 21, 0.9, 64),
      createPlayer('J. Guerreiro', 'DFC', 25, 0.8, 62),
      createPlayer('Fábio Magalhães', 'LB', 25, 0.4, 62),
      createPlayer('Hernán Navarro', 'RB', 23, 1.0, 64),
      createPlayer('Thierry Hubert', 'MCD', 19, 3.5, 69),
      createPlayer('A. Masson', 'MC', 19, 1.0, 66),
      createPlayer('Rodrigo Borges', 'MC', 20, 0.8, 64),
      createPlayer('Jaime Hidalgo', 'MCO', 21, 0.5, 74),
      createPlayer('Álvaro Carrasco', 'MCO', 22, 0.4, 62),
      createPlayer('Sergio Jurado', 'EI', 21, 0.4, 64),
      createPlayer('César Figueroa', 'DC', 29, 1.0, 64),
      createPlayer('Adrián Medrano', 'DC', 24, 0.8, 62)
    ]
  },

  // ========== CÓRDOBA CF ==========
  cordoba: {
    name: 'Mosaic CF', shortName: 'COR', city: 'Córdoba',
    stadium: 'El Arcángel', stadiumCapacity: 21822,
    budget: 4000000, reputation: 60, league: 'segunda',
    colors: { primary: '#00A651', secondary: '#FFFFFF' },
    players: [
      createPlayer('Ignacio Orozco', 'POR', 24, 0.8, 62),
      createPlayer('César Medrano', 'POR', 28, 0.8, 62),
      createPlayer('Facundo Funes', 'DFC', 26, 0.6, 62),
      createPlayer('Rémi Arnaud', 'DFC', 31, 0.5, 62),
      createPlayer('B. Mendoza', 'DFC', 28, 0.4, 72),
      createPlayer('Ignacio Vázquez', 'LB', 26, 1.0, 64),
      createPlayer('C. Aguirre', 'RB', 32, 0.3, 61),
      createPlayer('G. Roche', 'MC', 24, 0.9, 62),
      createPlayer('André Machado', 'MC', 25, 0.8, 62),
      createPlayer('Tobías Zamora', 'MC', 23, 0.6, 62),
      createPlayer('Philippe Perrin', 'MC', 25, 0.6, 62),
      createPlayer('João Guerreiro', 'EI', 28, 0.9, 62),
      createPlayer('Kevin Medrano', 'EI', 24, 0.8, 62),
      createPlayer('Cássio Cardoso', 'ED', 30, 0.8, 62),
      createPlayer('Adrián Figueroa', 'DC', 29, 0.6, 62),
      createPlayer('Sergio Giraldo', 'DC', 34, 0.4, 61)
    ]
  },

  // ========== ALBACETE ==========
  albacete: {
    name: 'Opal Balompié', shortName: 'ALB', city: 'Albacete',
    stadium: 'Carlos Belmonte', stadiumCapacity: 17524,
    budget: 4000000, reputation: 60, league: 'segunda',
    colors: { primary: '#FFFFFF', secondary: '#FF0000' },
    players: [
      createPlayer('Raí Lacerda', 'POR', 35, 0.2, 60),
      createPlayer('Diogo Magalhães', 'POR', 35, 0.1, 60),
      createPlayer('Jorge Valderrama', 'DFC', 29, 1.0, 64),
      createPlayer('L. Laínez', 'DFC', 28, 0.7, 62),
      createPlayer('Pablo Salcedo', 'DFC', 25, 0.3, 62),
      createPlayer('Camilo Navarro', 'LB', 29, 1.0, 64),
      createPlayer('Jacques Girard', 'LB', 22, 0.8, 62),
      createPlayer('Laurent Arnaud', 'RB', 23, 0.2, 62),
      createPlayer('Rafael Robledo', 'MC', 28, 1.4, 64),
      createPlayer('Alexandre Magalhães', 'MC', 31, 1.0, 64),
      createPlayer('Anderson Pereira', 'MC', 24, 0.7, 62),
      createPlayer('Joaquín Lovera', 'EI', 29, 0.7, 62),
      createPlayer('A. Palacios', 'ED', 33, 0.8, 61),
      createPlayer('Jacques Beauchamp', 'DC', 32, 0.6, 61),
      createPlayer('Diego Estrada', 'DC', 27, 0.5, 62),
      createPlayer('S. Ocampo', 'DC', 28, 0.5, 62)
    ]
  },

  // ========== SD HUESCA ==========
  huesca: {
    name: 'SD Stonewall', shortName: 'HUE', city: 'Huesca',
    stadium: 'El Alcoraz', stadiumCapacity: 9087,
    budget: 4000000, reputation: 60, league: 'segunda',
    colors: { primary: '#005BAC', secondary: '#FF0000' },
    players: [
      createPlayer('J. Perrin', 'POR', 29, 0.3, 62),
      createPlayer('Damien Joubert', 'POR', 35, 0.2, 60),
      createPlayer('Baptiste Chevalier', 'DFC', 23, 0.6, 62),
      createPlayer('J. Palacios', 'DFC', 34, 0.5, 61),
      createPlayer('Pedro', 'DFC', 31, 0.3, 62),
      createPlayer('Jacques Masson', 'LB', 25, 0.6, 62),
      createPlayer('Jonas Alcântara', 'LB', 27, 0.6, 62),
      createPlayer('Álvaro Palacios', 'RB', 23, 0.6, 62),
      createPlayer('Tomás Arévalo', 'RB', 29, 0.5, 62),
      createPlayer('Ivan Valente', 'MC', 25, 0.8, 62),
      createPlayer('Jacques Roche', 'MC', 26, 0.6, 62),
      createPlayer('J. Mendoza', 'MC', 26, 0.5, 62),
      createPlayer('Diogo Leitão', 'MCO', 22, 0.6, 62),
      createPlayer('D. Lacroix', 'EI', 31, 0.8, 62),
      createPlayer('Elías Acosta', 'EI', 21, 0.7, 64),
      createPlayer('Emilio Robledo', 'DC', 24, 0.6, 62),
      createPlayer('S. Navarrete', 'DC', 24, 0.5, 62)
    ]
  },

  // ========== AD CEUTA ==========
  ceuta: {
    name: 'AD Ceuta FC', shortName: 'CEU', city: 'Ceuta',
    stadium: 'Alfonso Murube', stadiumCapacity: 6590,
    budget: 3000000, reputation: 55, league: 'segunda',
    colors: { primary: '#005BAC', secondary: '#FFFFFF' },
    players: [
      createPlayer('Gabriel Valderrama', 'POR', 30, 0.4, 62),
      createPlayer('P. Laínez', 'POR', 31, 0.2, 62),
      createPlayer('Diego Giraldo', 'DFC', 26, 0.6, 62),
      createPlayer('Gonçalo Coelho', 'DFC', 26, 0.3, 62),
      createPlayer('César Hidalgo', 'DFC', 35, 0.1, 60),
      createPlayer('J. Moreau', 'LB', 30, 0.8, 62),
      createPlayer('Geraldo Alcântara', 'RB', 28, 0.3, 62),
      createPlayer('Joaquín Córdoba', 'MC', 32, 0.75, 61),
      createPlayer('Iván Laínez', 'MC', 26, 0.6, 62),
      createPlayer('Yago Braga', 'MC', 30, 0.5, 62),
      createPlayer('Aurélien Arnaud', 'MCO', 24, 0.6, 62),
      createPlayer('Kevin Zabaleta', 'MCO', 27, 0.5, 62),
      createPlayer('Kevin Fernandes', 'EI', 24, 0.7, 62),
      createPlayer('Alexandre', 'ED', 31, 0.8, 62),
      createPlayer('Martín Delgado', 'DC', 19, 1.0, 66),
      createPlayer('Manuel Fuentes', 'DC', 22, 0.8, 62),
      createPlayer('J. Ocampo', 'DC', 33, 0.3, 61)
    ]
  },

  // ========== CULTURAL LEONESA ==========
  cultural_leonesa: {
    name: 'Legio FC', shortName: 'CUL', city: 'León',
    stadium: 'Reino de León', stadiumCapacity: 13354,
    budget: 3000000, reputation: 55, league: 'segunda',
    colors: { primary: '#FFFFFF', secondary: '#FF0000' },
    players: [
      createPlayer('Étienne Beauchamp', 'POR', 33, 0.5, 61),
      createPlayer('Murilo Braga', 'POR', 32, 0.2, 61),
      createPlayer('T. Roche', 'DFC', 26, 1.0, 64),
      createPlayer('Miguel Borges', 'DFC', 21, 0.8, 64),
      createPlayer('Rafael Heredia', 'DFC', 20, 0.7, 64),
      createPlayer('Marcos Figueroa', 'DFC', 29, 0.3, 62),
      createPlayer('Henri Arnaud', 'LB', 26, 0.5, 62),
      createPlayer('Ignacio Ceballos', 'RB', 30, 0.7, 62),
      createPlayer('Teodoro Ocampo', 'MC', 23, 0.6, 62),
      createPlayer('Pedro Giraldo', 'MC', 21, 0.3, 64),
      createPlayer('Benicio', 'MCO', 29, 0.3, 62),
      createPlayer('Leandro Córdoba', 'EI', 25, 0.8, 62),
      createPlayer('Diego Carrasco', 'EI', 25, 0.4, 62),
      createPlayer('Leonardo Ramos', 'ED', 27, 2.0, 67),
      createPlayer('Miguel Guerreiro', 'DC', 29, 0.5, 62),
      createPlayer('Raí Silveira', 'DC', 33, 0.5, 61)
    ]
  },

  // ========== REAL SOCIEDAD B ==========
  real_sociedad_b: {
    name: 'Real Sociedad B', shortName: 'RSB', city: 'San Sebastián',
    stadium: 'Zubieta', stadiumCapacity: 2500,
    budget: 3000000, reputation: 55, league: 'segunda',
    colors: { primary: '#0067B1', secondary: '#FFFFFF' },
    players: [
      createPlayer('Adriano Fontes', 'POR', 22, 0.5, 62),
      createPlayer('E. Aguirre', 'POR', 23, 0.1, 62),
      createPlayer('Pedro Robledo', 'DFC', 23, 0.6, 62),
      createPlayer('Lorenzo Bermejo', 'DFC', 21, 0.3, 64),
      createPlayer('Jacques Beaumont', 'LB', 23, 0.6, 62),
      createPlayer('Igor Ramos', 'RB', 23, 0.3, 62),
      createPlayer('Murilo Rezende', 'MC', 23, 0.5, 62),
      createPlayer('Guilherme Guedes', 'MC', 19, 0.5, 64),
      createPlayer('Adriano Linhares', 'MC', 21, 0.4, 64),
      createPlayer('Leandro Arroyo', 'MCO', 19, 0.5, 64),
      createPlayer('A. Moreau', 'EI', 20, 0.8, 64),
      createPlayer('Adrien Masson', 'EI', 18, 0.8, 64),
      createPlayer('Darío Dorrego', 'ED', 19, 0.4, 64),
      createPlayer('Gonzalo Carrasco', 'DC', 20, 1.0, 66),
      createPlayer('Sergio Ocampo', 'DC', 18, 1.0, 66)
    ]
  }
};

export const segundaTeamsArray = Object.entries(segundaTeams).map(([id, team]) => ({
  id,
  ...team
}));

export default segundaTeams;
