// ============================================================
// PC FÚTBOL WEB - EQUIPOS LaLiga TEMPORADA 25/26
// Datos reales de Transfermarkt (enero 2026)
// ============================================================

// Helpers para cálculos
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

function calcSalary(valueM, age) {
  const annual = valueM * 1000000 * 0.12;
  const weekly = annual / 52;
  const mult = age >= 32 ? 1.3 : (age >= 28 ? 1.1 : 1.0);
  return Math.max(20000, Math.round(weekly * mult));
}

function createPlayer(name, position, age, valueM, overall = null) {
  return {
    name,
    position,
    age,
    overall: overall || calculateFallbackOverall(valueM, age),
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
    name: 'Royal Zenith CF',
    shortName: 'RMA',
    city: 'Madrid',
    stadium: 'Crown Arena',
    stadiumCapacity: 81044,
    budget: 250000000,
    reputation: 95,
    colors: { primary: '#FFFFFF', secondary: '#000000', accent: '#EE9B00' },
    players: [
      createPlayer('Teodoro Castaño', 'GK', 33, 18, 89),
      createPlayer('A. Lacroix', 'GK', 26, 15, 81),
      createPlayer('F. Guzmán', 'GK', 20, 1, 66),
      createPlayer('Diego Heredia', 'CB', 20, 70, 87),
      createPlayer('Víctor Medrano', 'CB', 28, 30, 84),
      createPlayer('Ramón Aguirre', 'CB', 22, 30, 82),
      createPlayer('Aurélien Renard', 'CB', 32, 12, 85),
      createPlayer('D. Alcântara', 'CB', 33, 4, 69),
      createPlayer('Álvaro Carrasco', 'LB', 22, 60, 85),
      createPlayer('Felipe Guedes', 'LB', 26, 15, 76),
      createPlayer('Fernando Medrano', 'LB', 30, 8, 73),
      createPlayer('T. Arnaud', 'RB', 27, 70, 85),
      createPlayer('Diogo Cardoso', 'RB', 34, 7, 85),
      createPlayer('André Tavares', 'CDM', 26, 75, 84),
      createPlayer('Franco Vázquez', 'CM', 27, 120, 88),
      createPlayer('Sébastien Chevalier', 'CM', 23, 50, 85),
      createPlayer('Daniel Castaño', 'CM', 29, 8, 73),
      createPlayer('Jaime Bermejo', 'CAM', 22, 160, 90),
      createPlayer('Adrián Giraldo', 'CAM', 20, 90, 90),
      createPlayer('Valentin Joubert', 'LW', 25, 150, 89),
      createPlayer('Ramiro', 'RW', 25, 60, 84),
      createPlayer('Franco Mendoza', 'RW', 18, 50, 87),
      createPlayer('Bruno Domínguez', 'RW', 26, 35, 82),
      createPlayer('Kaique Monteiro', 'ST', 27, 200, 91),
      createPlayer('Geraldo Gonçalves', 'ST', 21, 15, 78)
    ]
  },

  // ========== FC BARCELONA ==========
  barcelona: {
    name: 'Nova Blau FC',
    shortName: 'BAR',
    city: 'Barcelona',
    stadium: 'Grand Coliseum',
    stadiumCapacity: 99354,
    budget: 180000000,
    reputation: 93,
    colors: { primary: '#004D98', secondary: '#A50044', accent: '#EDBB00' },
    players: [
      createPlayer('J. Guzmán', 'GK', 24, 30, 85),
      createPlayer('Wallace Silveira', 'GK', 35, 0.9, 60),
      createPlayer('Pedro Castaño', 'CB', 19, 80, 90),
      createPlayer('Ernesto Giraldo', 'CB', 25, 30, 82),
      createPlayer('R. Azevedo', 'CB', 26, 25, 79),
      createPlayer('Adrien Carpentier', 'CB', 29, 10, 80),
      createPlayer('Adrián Belmonte', 'LB', 22, 60, 85),
      createPlayer('G. Moraes', 'LB', 23, 20, 79),
      createPlayer('Jaime Palacios', 'RB', 27, 65, 85),
      createPlayer('Jacques Carpentier', 'RB', 31, 10, 73),
      createPlayer('Manuel Carrasco', 'CDM', 22, 25, 79),
      createPlayer('Marcos Bermejo', 'CDM', 18, 10, 75),
      createPlayer('Pablo', 'CM', 23, 140, 90),
      createPlayer('Fábio Tavares', 'CM', 28, 45, 87),
      createPlayer('Gustavo', 'CM', 21, 40, 84),
      createPlayer('F. Laínez', 'CAM', 22, 70, 80),
      createPlayer('Diogo Oliveira', 'CAM', 27, 60, 85),
      createPlayer('Rémi', 'LW', 29, 80, 89),
      createPlayer('Martín Ríos', 'LW', 28, 40, 82),
      createPlayer('Luis Delgado', 'RW', 18, 200, 89),
      createPlayer('Rémi Beauchamp', 'RW', 20, 10, 75),
      createPlayer('Fernando Torralba', 'ST', 25, 50, 85),
      createPlayer('Rafael Laínez', 'ST', 37, 9, 87)
    ]
  },

  // ========== ATLÉTICO DE MADRID ==========
  atletico_madrid: {
    name: 'Rojo Atlético',
    shortName: 'ATM',
    city: 'Madrid',
    stadium: 'Cívitas Metropolitano',
    stadiumCapacity: 70460,
    budget: 150000000,
    reputation: 88,
    colors: { primary: '#CE3524', secondary: '#FFFFFF', accent: '#272E61' },
    players: [
      createPlayer('Jacques Roche', 'GK', 33, 17, 88),
      createPlayer('Jaime Medrano', 'GK', 31, 3, 79),
      createPlayer('Davi Holanda', 'CB', 28, 30, 82),
      createPlayer('Rodrigo Nogueira', 'CB', 29, 30, 80),
      createPlayer('Murilo Pereira', 'CB', 22, 15, 76),
      createPlayer('Jacques Gauthier', 'CB', 31, 14, 76),
      createPlayer('Cássio Lacerda', 'CB', 30, 6, 80),
      createPlayer('Marcos Robledo', 'LB', 23, 15, 76),
      createPlayer('Manuel Laínez', 'RB', 30, 22, 79),
      createPlayer('Néstor Medrano', 'RB', 27, 15, 76),
      createPlayer('Jacques Chevalier', 'CDM', 24, 22, 79),
      createPlayer('Patricio Bravo', 'CM', 22, 60, 85),
      createPlayer('Kevin', 'CM', 34, 7, 72),
      createPlayer('Álvaro Bermejo', 'LW', 24, 55, 85),
      createPlayer('Néstor Gallardo', 'LW', 27, 24, 79),
      createPlayer('Tiago Azevedo', 'LW', 24, 20, 79),
      createPlayer('Gaston Saunier', 'RW', 23, 40, 82),
      createPlayer('Adrián Gallardo', 'CAM', 34, 11, 85),
      createPlayer('Jorge Arévalo', 'ST', 25, 100, 88),
      createPlayer('André Sousa', 'ST', 30, 20, 79)
    ]
  },

  // ========== ATHLETIC CLUB ==========
  athletic_bilbao: {
    name: 'Basque Lions AC',
    shortName: 'ATH',
    city: 'Bilbao',
    stadium: 'Coliseo del Norte',
    stadiumCapacity: 53289,
    budget: 90000000,
    reputation: 82,
    colors: { primary: '#EE2523', secondary: '#FFFFFF', accent: '#000000' },
    players: [
      createPlayer('João Saraiva', 'GK', 28, 25, 79),
      createPlayer('Bautista Peralta', 'GK', 22, 3, 67),
      createPlayer('D. Vázquez', 'CB', 26, 30, 82),
      createPlayer('A. Palacios', 'CB', 25, 18, 76),
      createPlayer('Adrián Laínez', 'CB', 31, 9, 73),
      createPlayer('Valentín Laínez', 'CB', 31, 1, 64),
      createPlayer('Adrián Bermejo', 'LB', 23, 3, 67),
      createPlayer('Esteban Bravo', 'LB', 35, 1.2, 61),
      createPlayer('Jaime Aguirre', 'RB', 26, 10, 73),
      createPlayer('Aurélien Girard', 'RB', 29, 4, 70),
      createPlayer('Mathieu Vasseur', 'CDM', 32, 1.5, 63),
      createPlayer('Miguel Nogueira', 'CM', 22, 30, 82),
      createPlayer('Bruno Palacios', 'CM', 24, 18, 76),
      createPlayer('I. Gallardo', 'CM', 32, 2.5, 80),
      createPlayer('O. Salcedo', 'CAM', 25, 40, 82),
      createPlayer('Baptiste Girard', 'CAM', 22, 5, 70),
      createPlayer('Nícolas Fontes', 'LW', 23, 60, 85),
      createPlayer('Yannick Beaumont', 'LW', 30, 5, 70),
      createPlayer('I. Azevedo', 'RW', 31, 10, 73),
      createPlayer('Rafael Neves', 'RW', 23, 6, 70),
      createPlayer('Germán Guzmán', 'ST', 29, 5, 79),
      createPlayer('Miguel Sousa', 'ST', 24, 5, 70)
    ]
  },

  // ========== REAL SOCIEDAD ==========
  real_sociedad: {
    name: 'Coastal Reale',
    shortName: 'RSO',
    city: 'San Sebastián',
    stadium: 'Silver Dome',
    stadiumCapacity: 39500,
    budget: 70000000,
    reputation: 80,
    colors: { primary: '#0067B1', secondary: '#FFFFFF', accent: '#000000' },
    players: [
      createPlayer('U. Ríos', 'GK', 30, 12, 76),
      createPlayer('Mathieu Dubois', 'GK', 26, 1.5, 64),
      createPlayer('Nicolas Arnaud', 'CB', 30, 8, 73),
      createPlayer('A. Esperança', 'CB', 28, 6, 70),
      createPlayer('Manuel Giraldo', 'CB', 36, 0.3, 60),
      createPlayer('Henrique Teixeira', 'CB', 32, 0.3, 61),
      createPlayer('Sérgio Guerreiro', 'LB', 26, 7, 79),
      createPlayer('Ulises Giraldo', 'LB', 19, 2, 69),
      createPlayer('Nicolas Masson', 'RB', 22, 15, 76),
      createPlayer('Á. Ocampo', 'RB', 30, 5, 70),
      createPlayer('Miguel Coelho', 'CDM', 26, 75, 85),
      createPlayer('Luis Salcedo', 'CM', 23, 30, 82),
      createPlayer('Baptiste Masson', 'CM', 28, 25, 79),
      createPlayer('Alexandre Guerreiro', 'CM', 28, 6, 70),
      createPlayer('M. Ocampo', 'LW', 28, 30, 82),
      createPlayer('Tobías Escobar', 'RW', 24, 50, 85),
      createPlayer('Bruno Zabaleta', 'RW', 24, 3, 67),
      createPlayer('Otávio Oliveira', 'ST', 21, 25, 81),
      createPlayer('André Borges', 'ST', 23, 12, 76),
      createPlayer('Ulises Saavedra', 'ST', 28, 4, 70)
    ]
  },

  // ========== VILLARREAL CF ==========
  villarreal: {
    name: 'Amarillo CF',
    shortName: 'VIL',
    city: 'Villarreal',
    stadium: 'Hawk Stadium',
    stadiumCapacity: 23500,
    budget: 65000000,
    reputation: 78,
    colors: { primary: '#FFE114', secondary: '#005187', accent: '#005187' },
    players: [
      createPlayer('Fabián Jurado', 'GK', 23, 22, 79),
      createPlayer('Laurent Joubert', 'GK', 24, 4, 70),
      createPlayer('Douglas Cardoso', 'GK', 28, 1, 64),
      createPlayer('Henri Beaumont', 'CB', 23, 8, 73),
      createPlayer('Lorenzo Castaño', 'CB', 24, 6, 70),
      createPlayer('Raí Alencar', 'CB', 39, 0.5, 60),
      createPlayer('Agustín Mendoza', 'CB', 33, 2, 66),
      createPlayer('A. Pelletier', 'LB', 29, 20, 79),
      createPlayer('B. Beaumont', 'LB', 24, 40, 82),
      createPlayer('Sébastien Carpentier', 'LB', 26, 5, 70),
      createPlayer('Kevin Figueroa', 'RB', 34, 1, 63),
      createPlayer('J. Fuentes', 'RB', 27, 25, 79),
      createPlayer('Diego Peralta', 'CDM', 37, 3, 64),
      createPlayer('Samuel Cardoso', 'CDM', 28, 4, 70),
      createPlayer('E. Castaño', 'CDM', 37, 1, 61),
      createPlayer('Adrien Gauthier', 'CM', 28, 18, 76),
      createPlayer('Gabriel Valderrama', 'CM', 23, 15, 76),
      createPlayer('Teodoro Bermejo', 'LW', 22, 18, 76),
      createPlayer('Joaquín Peralta', 'RW', 23, 35, 80),
      createPlayer('Iván Arévalo', 'RW', 21, 8, 75),
      createPlayer('Germán Mendoza', 'ST', 33, 8, 81),
      createPlayer('Adrián Domínguez', 'ST', 28, 12, 76)
    ]
  },

  // ========== REAL BETIS ==========
  real_betis: {
    name: 'Real Betis Balompié',
    shortName: 'BET',
    city: 'Sevilla',
    stadium: 'Estadio Solar',
    stadiumCapacity: 60720,
    budget: 60000000,
    reputation: 77,
    colors: { primary: '#00954C', secondary: '#FFFFFF', accent: '#00954C' },
    players: [
      // Porteros
      createPlayer('Matheus Valente', 'GK', 28, 2.5, 79),
      createPlayer('P. Laínez', 'GK', 31, 2.5, 79),
      createPlayer('Alexandre', 'GK', 39, 0.4, 60),
      // Defensas centrales
      createPlayer('Nícolas', 'CB', 24, 20, 79),
      createPlayer('V. Gallardo', 'CB', 22, 12, 76),
      createPlayer('Daniel Laínez', 'CB', 32, 3, 80),
      createPlayer('M. Barbosa', 'CB', 35, 1, 79),
      // Laterales
      createPlayer('Jaime Figueroa', 'LB', 29, 6, 70),
      createPlayer('Raí Rezende', 'LB', 33, 1.5, 63),
      createPlayer('Hernán Orozco', 'RB', 21, 4, 72),
      createPlayer('Héctor Belmonte', 'RB', 30, 2.5, 67),
      // Centrocampistas
      createPlayer('Sébastien Arnaud', 'CDM', 29, 12, 76),
      createPlayer('Murilo Rezende', 'CDM', 29, 4, 70),
      createPlayer('Salvador Aguirre', 'CM', 24, 20, 79),
      createPlayer('Nicolas Delacroix', 'CM', 25, 9, 73),
      createPlayer('Pedro Figueroa', 'CM', 29, 8, 79),
      createPlayer('Gonzalo Carrasco', 'CAM', 29, 15, 76),
      createPlayer('Ignacio', 'CAM', 33, 4, 69),
      // Extremos
      createPlayer('Adrián Escalante', 'LW', 24, 20, 79),
      createPlayer('Rémi Roche', 'LW', 25, 8, 73),
      createPlayer('Anderson', 'RW', 25, 30, 82),
      createPlayer('Pedro Gallardo', 'RW', 19, 10, 75),
      createPlayer('André Ramos', 'RW', 29, 3.5, 67),
      // Delanteros
      createPlayer('Cédric Hubert', 'ST', 26, 18, 76),
      createPlayer('Cristiano Peixoto', 'ST', 31, 1.5, 64),
      createPlayer('César Bermejo', 'ST', 34, 1.4, 63)
    ]
  },

  // ========== SEVILLA FC ==========
  sevilla: {
    name: 'Triana FC',
    shortName: 'SEV',
    city: 'Sevilla',
    stadium: 'Crimson Grounds',
    stadiumCapacity: 43883,
    budget: 55000000,
    reputation: 78,
    colors: { primary: '#FFFFFF', secondary: '#ED1C24', accent: '#ED1C24' },
    players: [
      createPlayer('O. Navarrete', 'GK', 35, 2, 64),
      createPlayer('Esteban Franco', 'GK', 26, 2, 67),
      createPlayer('A. Fuentes', 'GK', 22, 0.5, 62),
      createPlayer('Luciano Barbosa', 'CB', 25, 20, 79),
      createPlayer('Tobías Navarro', 'CB', 23, 12, 76),
      createPlayer('Murilo', 'CB', 28, 8, 73),
      createPlayer('Kaique Silveira', 'CB', 23, 5, 70),
      createPlayer('André Pinto', 'LB', 27, 8, 73),
      createPlayer('J. Castaño', 'RB', 23, 6, 70),
      createPlayer('Gonzalo Medrano', 'RB', 28, 8, 73),
      createPlayer('J. Silveira', 'RB', 22, 10, 73),
      createPlayer('Laurent Arnaud', 'CDM', 23, 8, 73),
      createPlayer('Samuel Lacerda', 'CDM', 26, 12, 76),
      createPlayer('Diogo Saraiva', 'CM', 28, 8, 73),
      createPlayer('Samuel', 'CM', 32, 4, 69),
      createPlayer('Jacques Pelletier', 'CM', 40, 0.5, 60),
      createPlayer('Diogo Leitão', 'LW', 28, 12, 76),
      createPlayer('S. Delacroix', 'LW', 22, 6, 70),
      createPlayer('C. Estrada', 'RW', 27, 6, 70),
      createPlayer('Patricio', 'RW', 22, 7, 73),
      createPlayer('Samuel Rezende', 'ST', 24, 12, 76),
      createPlayer('Kevin Ibarra', 'ST', 29, 8, 73)
    ]
  },

  // ========== GIRONA FC ==========
  girona: {
    name: 'Terra Brava FC',
    shortName: 'GIR',
    city: 'Girona',
    stadium: 'Montilivi',
    stadiumCapacity: 14286,
    budget: 50000000,
    reputation: 75,
    colors: { primary: '#CD2534', secondary: '#FFFFFF', accent: '#CD2534' },
    players: [
      createPlayer('Pedro Guerreiro', 'GK', 33, 5, 69),
      createPlayer('Joaquín Ceballos', 'GK', 33, 0.5, 61),
      createPlayer('Pablo Laínez', 'GK', 30, 3, 79),
      createPlayer('Adrien Favre', 'CB', 23, 12, 76),
      createPlayer('Diego Laínez', 'CB', 35, 1, 61),
      createPlayer('L. Delgado', 'CB', 26, 8, 73),
      createPlayer('Samuel Barbosa', 'CB', 25, 5, 70),
      createPlayer('Mathieu Gauthier', 'LB', 24, 35, 82),
      createPlayer('Alexandre Magalhães', 'RB', 22, 28, 79),
      createPlayer('Yannick Carpentier', 'RB', 23, 20, 79),
      createPlayer('O. Rezende', 'CDM', 34, 3, 66),
      createPlayer('Daniel Bermejo', 'CM', 28, 10, 73),
      createPlayer('I. Medrano', 'CM', 27, 15, 76),
      createPlayer('Jaime Salcedo', 'CM', 24, 8, 73),
      createPlayer('Yago Holanda', 'CM', 27, 6, 70),
      createPlayer('Yannick Arnaud', 'RW', 22, 22, 79),
      createPlayer('Bruno Giraldo', 'LW', 24, 12, 76),
      createPlayer('Valentin Tessier', 'RW', 28, 18, 76),
      createPlayer('Paulo', 'RW', 32, 4, 69),
      createPlayer('Adrián Robledo', 'ST', 26, 12, 76),
      createPlayer('Adrián Delgado', 'ST', 28, 15, 76),
      createPlayer('Cássio Silveira', 'ST', 38, 0.5, 60)
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
      createPlayer('Iván Valderrama', 'GK', 28, 3, 67),
      createPlayer('Valentin Girard', 'GK', 38, 1, 61),
      createPlayer('G. Medrano', 'GK', 25, 2, 67),
      createPlayer('Cédric Saunier', 'CB', 30, 5, 70),
      createPlayer('João', 'CB', 31, 2, 67),
      createPlayer('Ulises Navarrete', 'CB', 28, 3, 67),
      createPlayer('Jonas Alcântara', 'CB', 30, 1, 64),
      createPlayer('Matheus Almeida', 'LB', 34, 2, 79),
      createPlayer('Marcos Salcedo', 'LB', 25, 5, 70),
      createPlayer('Otávio Machado', 'RB', 26, 10, 80),
      createPlayer('Héctor Jurado', 'RB', 21, 8, 75),
      createPlayer('F. Bermejo', 'CDM', 26, 10, 73),
      createPlayer('Douglas Rezende', 'CDM', 23, 5, 70),
      createPlayer('Iñaki Mendoza', 'CM', 23, 8, 73),
      createPlayer('Laurent Tessier', 'CM', 27, 6, 70),
      createPlayer('Waldo Saavedra', 'CM', 22, 5, 70),
      createPlayer('Fabián Carrasco', 'LW', 31, 4, 70),
      createPlayer('Igor Azevedo', 'CAM', 38, 3, 64),
      createPlayer('Agustín Dorrego', 'ST', 26, 15, 76),
      createPlayer('B. Silveira', 'ST', 32, 6, 80),
      createPlayer('Patricio Dorrego', 'RW', 22, 7, 73),
      createPlayer('Thierry Delacroix', 'ST', 26, 12, 76)
    ]
  },

  // ========== VALENCIA CF ==========
  valencia: {
    name: 'Levante Bay CF',
    shortName: 'VAL',
    city: 'Valencia',
    stadium: 'Tidal Stadium',
    stadiumCapacity: 49430,
    budget: 40000000,
    reputation: 76,
    colors: { primary: '#FFFFFF', secondary: '#000000', accent: '#FFAA00' },
    players: [
      createPlayer('Gabriel Medrano', 'GK', 25, 40, 82),
      createPlayer('Salvador Domínguez', 'GK', 32, 2, 79),
      createPlayer('Clément Masson', 'CB', 21, 30, 84),
      createPlayer('Yannick Gauthier', 'CB', 20, 12, 78),
      createPlayer('C. Thibault', 'CB', 23, 4, 70),
      createPlayer('Hugo Gallardo', 'CB', 25, 3, 67),
      createPlayer('Manuel Delgado', 'CB', 28, 1.5, 64),
      createPlayer('Joaquín Vázquez', 'LB', 22, 5, 70),
      createPlayer('J. Giraldo', 'LB', 31, 3, 67),
      createPlayer('Tomás Carrasco', 'RB', 26, 4, 70),
      createPlayer('Diego Fuentes', 'RB', 31, 2.5, 67),
      createPlayer('Philippe', 'CDM', 27, 15, 80),
      createPlayer('Adrián Aguirre', 'CM', 26, 8, 73),
      createPlayer('E. Braga', 'CM', 24, 7, 73),
      createPlayer('Jorge Giraldo', 'CM', 22, 4.5, 70),
      createPlayer('Darío Ledesma', 'LW', 23, 12, 76),
      createPlayer('Samuel Campos', 'LW', 28, 3.5, 67),
      createPlayer('Rafael Medrano', 'ST', 28, 4, 70),
      createPlayer('H. Domínguez', 'ST', 26, 5, 70)
    ]
  },

  // ========== UD LAS PALMAS ==========
  las_palmas: {
    name: 'Islas Canaria UD',
    shortName: 'LPA',
    city: 'Las Palmas',
    stadium: 'Gran Canaria',
    stadiumCapacity: 32392,
    budget: 35000000,
    reputation: 70,
    colors: { primary: '#FFE000', secondary: '#005BA6', accent: '#005BA6' },
    players: [
      createPlayer('Joaquín Córdoba', 'GK', 36, 1, 61),
      createPlayer('Álvaro Valderrama', 'GK', 27, 10, 79),
      createPlayer('Sergio Carrasco', 'CB', 26, 2.5, 67),
      createPlayer('S. Masson', 'CB', 29, 4, 70),
      createPlayer('Xavier Saunier', 'CB', 32, 1.5, 63),
      createPlayer('Manuel Medrano', 'CB', 25, 3.5, 67),
      createPlayer('Douglas Silveira', 'LB', 30, 1, 64),
      createPlayer('Marcos Palacios', 'LB', 24, 2.5, 67),
      createPlayer('Waldo Mendoza', 'RB', 30, 2.5, 67),
      createPlayer('Vasco', 'RB', 23, 1.5, 64),
      createPlayer('Miguel Fernandes', 'CDM', 32, 0.7, 61),
      createPlayer('Kevin Robledo', 'CM', 30, 1.8, 64),
      createPlayer('E. Leitão', 'CM', 24, 2.5, 67),
      createPlayer('Jorge Medrano', 'CM', 30, 1.5, 64),
      createPlayer('Anderson Monteiro', 'LW', 22, 18, 79),
      createPlayer('S. Robledo', 'LW', 30, 0.8, 62),
      createPlayer('Fabrice Girard', 'RW', 24, 2, 67),
      createPlayer('Marcos Castaño', 'ST', 29, 0.8, 62),
      createPlayer('Orlando Medrano', 'ST', 29, 3, 67)
    ]
  },

  // ========== RAYO VALLECANO ==========
  rayo_vallecano: {
    name: 'Barrio FC',
    shortName: 'RAY',
    city: 'Madrid',
    stadium: 'Estadio de Vallecas',
    stadiumCapacity: 14708,
    budget: 30000000,
    reputation: 68,
    colors: { primary: '#FFFFFF', secondary: '#E53027', accent: '#E53027' },
    players: [
      createPlayer('Aurélien Beaumont', 'GK', 28, 4, 79),
      createPlayer('Duarte Coelho', 'GK', 26, 1, 64),
      createPlayer('D. Ledesma', 'GK', 33, 0.5, 61),
      createPlayer('Fernando Laínez', 'CB', 34, 2.5, 66),
      createPlayer('Alexandre Henriques', 'CB', 36, 1, 61),
      createPlayer('Eduardo Saraiva', 'CB', 33, 1.2, 63),
      createPlayer('Pablo Fuentes', 'CB', 25, 4, 70),
      createPlayer('A. Masson', 'CB', 26, 5, 70),
      createPlayer('Adriano Rezende', 'RB', 27, 20, 79),
      createPlayer('Adrien Dubois', 'LB', 32, 1.5, 63),
      createPlayer('Pedro Coelho', 'RB', 31, 1, 64),
      createPlayer('Iñaki Bustos', 'RB', 32, 2, 66),
      createPlayer('Henrique Valente', 'CDM', 30, 4, 70),
      createPlayer('Ulises Lovera', 'CM', 30, 4, 70),
      createPlayer('Óscar Torralba', 'CM', 36, 1, 61),
      createPlayer('G. Mendoza', 'CM', 30, 3, 67),
      createPlayer('J. Ríos', 'CAM', 34, 4, 69),
      createPlayer('J. Figueroa', 'RW', 28, 8, 73),
      createPlayer('Gaston Gauthier', 'LW', 32, 5, 80),
      createPlayer('Gaston Perrin', 'RW', 30, 6, 70),
      createPlayer('R. Neves', 'ST', 26, 5, 70),
      createPlayer('S. Campos', 'ST', 24, 7, 73),
      createPlayer('R. Torralba', 'ST', 31, 4, 70)
    ]
  },

  // ========== CD LEGANÉS ==========
  leganes: {
    name: 'Sur Villa CD',
    shortName: 'LEG',
    city: 'Leganés',
    stadium: 'Butarque',
    stadiumCapacity: 12454,
    budget: 25000000,
    reputation: 65,
    colors: { primary: '#005BBF', secondary: '#FFFFFF', accent: '#005BBF' },
    players: [
      createPlayer('Jorge Salcedo', 'GK', 29, 3, 67),
      createPlayer('Martín Dorrego', 'GK', 34, 1, 63),
      createPlayer('J. Perrin', 'GK', 32, 0.5, 61),
      createPlayer('Jonas Silveira', 'CB', 28, 3, 67),
      createPlayer('Jonas Pacheco', 'CB', 24, 2, 67),
      createPlayer('Samuel Gonçalves', 'CB', 34, 0.8, 61),
      createPlayer('Mathieu Chevalier', 'CB', 32, 2, 66),
      createPlayer('Emilio Figueroa', 'LB', 27, 3, 67),
      createPlayer('J. Hidalgo', 'LB', 29, 2, 67),
      createPlayer('Vasco Rocha', 'RB', 29, 4, 70),
      createPlayer('Jonas Braga', 'RB', 26, 2, 67),
      createPlayer('Leandro Navarro', 'CDM', 29, 3, 67),
      createPlayer('Ramiro Tolosa', 'CDM', 29, 4, 70),
      createPlayer('S. Castaño', 'CM', 24, 3, 67),
      createPlayer('Davi Rezende', 'CM', 29, 2, 67),
      createPlayer('R. Lovera', 'CM', 27, 2, 67),
      createPlayer('B. Ríos', 'CAM', 26, 4, 70),
      createPlayer('Jonas Campos', 'LW', 27, 6, 70),
      createPlayer('Dorian Girard', 'RW', 27, 3, 67),
      createPlayer('Marcos Hidalgo', 'LW', 30, 3, 67),
      createPlayer('Manuel Fuentes', 'ST', 26, 6, 70),
      createPlayer('Santiago Herrera', 'ST', 31, 5, 70),
      createPlayer('D. Gauthier', 'ST', 26, 4, 70)
    ]
  },

  // ========== ELCHE CF ==========
  elche: {
    name: 'Palm Grove CF',
    shortName: 'ELC',
    city: 'Elche',
    stadium: 'Martínez Valero',
    stadiumCapacity: 33732,
    budget: 30000000,
    reputation: 66,
    colors: { primary: '#008847', secondary: '#FFFFFF', accent: '#008847' },
    players: [
      createPlayer('Iván Palacios', 'GK', 26, 8, 73),
      createPlayer('Adrián Ibarra', 'GK', 22, 2, 67),
      createPlayer('M. Dorrego', 'GK', 38, 0.2, 60),
      createPlayer('Daniel Aguirre', 'CB', 24, 9, 73),
      createPlayer('Valentín Carrasco', 'CB', 25, 4, 70),
      createPlayer('J. Domingues', 'CB', 25, 1, 64),
      createPlayer('B. Delgado', 'CB', 28, 0.8, 62),
      createPlayer('Adrián Palacios', 'LB', 27, 4, 70),
      createPlayer('L. Palacios', 'LB', 28, 1.5, 64),
      createPlayer('Hernán Franco', 'RB', 19, 12, 78),
      createPlayer('Álvaro Navarrete', 'RB', 25, 6, 70),
      createPlayer('F. Robledo', 'CDM', 23, 4, 70),
      createPlayer('Murilo Alencar', 'CDM', 25, 3, 67),
      createPlayer('R. Mendoza', 'CM', 20, 15, 78),
      createPlayer('M. Navarrete', 'CM', 23, 5, 70),
      createPlayer('Adrián Fuentes', 'CM', 29, 4, 70),
      createPlayer('Gustavo Valente', 'LW', 23, 5, 70),
      createPlayer('L. Carrasco', 'LW', 23, 3.2, 67),
      createPlayer('Gonzalo Delgado', 'RW', 27, 3.5, 67),
      createPlayer('Raí Monteiro', 'ST', 28, 4, 70),
      createPlayer('Kaique Rezende', 'ST', 21, 4, 72),
      createPlayer('Adrián Salcedo', 'ST', 30, 3, 67)
    ]
  },

  // ========== RCD ESPANYOL ==========
  espanyol: {
    name: 'Periquito FC',
    shortName: 'ESP',
    city: 'Barcelona',
    stadium: 'RCDE Stadium',
    stadiumCapacity: 40000,
    budget: 28000000,
    reputation: 68,
    colors: { primary: '#007FC8', secondary: '#FFFFFF', accent: '#007FC8' },
    players: [
      createPlayer('Murilo Drummond', 'GK', 34, 0.8, 61),
      createPlayer('Vinícius Ferreira', 'GK', 24, 0.3, 62),
      createPlayer('Caio Rezende', 'CB', 22, 5, 70),
      createPlayer('Facundo Córdoba', 'CB', 30, 2, 67),
      createPlayer('Manuel Robledo', 'CB', 27, 2, 67),
      createPlayer('Laurent Chevalier', 'CB', 34, 1, 63),
      createPlayer('Camilo Ríos', 'LB', 24, 15, 76),
      createPlayer('J. Salcedo', 'LB', 25, 2.8, 67),
      createPlayer('Osvaldo Herrera', 'RB', 22, 15, 76),
      createPlayer('Rafael Salcedo', 'RB', 24, 1.5, 64),
      createPlayer('Ulises Gallardo', 'CDM', 24, 5, 70),
      createPlayer('Camilo Peralta', 'CDM', 28, 2.5, 67),
      createPlayer('Pedro Laínez', 'CM', 26, 6, 70),
      createPlayer('E. Esteves', 'CM', 29, 4, 70),
      createPlayer('Rémi Thibault', 'CM', 25, 3, 67),
      createPlayer('Jonas Pereira', 'LW', 27, 10, 73),
      createPlayer('Paulo Monteiro', 'LW', 33, 1.2, 63),
      createPlayer('Thierry Dubois', 'RW', 24, 10, 73),
      createPlayer('Jonas Cardoso', 'RW', 24, 3, 67),
      createPlayer('R. Fontes', 'ST', 23, 10, 73),
      createPlayer('Martín Guzmán', 'ST', 36, 0.8, 60)
    ]
  },

  // ========== CA OSASUNA ==========
  osasuna: {
    name: 'Navarra CA',
    shortName: 'OSA',
    city: 'Pamplona',
    stadium: 'El Sadar',
    stadiumCapacity: 23576,
    budget: 28000000,
    reputation: 70,
    colors: { primary: '#D91A21', secondary: '#001E62', accent: '#001E62' },
    players: [
      createPlayer('S. Heredia', 'GK', 32, 3, 66),
      createPlayer('Alexandre Faria', 'GK', 34, 0.6, 61),
      createPlayer('Emilio Bermejo', 'CB', 24, 20, 79),
      createPlayer('Jorge Heredia', 'CB', 24, 3.5, 67),
      createPlayer('Adrián Carrasco', 'CB', 31, 2.8, 67),
      createPlayer('A. Bermejo', 'LB', 25, 4.5, 70),
      createPlayer('Jaime Gallardo', 'LB', 31, 3.5, 80),
      createPlayer('Jorge Carrasco', 'LB', 33, 1.2, 63),
      createPlayer('Valentín Ríos', 'RB', 29, 3, 67),
      createPlayer('Luciano Teixeira', 'CDM', 31, 2.8, 67),
      createPlayer('Yago Monteiro', 'CDM', 23, 2, 67),
      createPlayer('Jonas Moraes', 'CM', 27, 7, 73),
      createPlayer('Agustín Orozco', 'CM', 21, 1, 66),
      createPlayer('André Oliveira', 'CAM', 24, 9, 73),
      createPlayer('Matheus Guerreiro', 'CAM', 31, 1.8, 64),
      createPlayer('Valentin Moreau', 'LW', 22, 10, 73),
      createPlayer('Rémi Masson', 'LW', 23, 7, 73),
      createPlayer('Sérgio Borges', 'LW', 30, 1.5, 64),
      createPlayer('Rémi Girard', 'RW', 32, 1.8, 63),
      createPlayer('Rafael Giraldo', 'ST', 25, 3, 67),
      createPlayer('Adrien Beauchamp', 'ST', 34, 3, 66)
    ]
  },

  // ========== LEVANTE UD ==========
  levante: {
    name: 'Sunrise UD',
    shortName: 'LEV',
    city: 'Valencia',
    stadium: 'Ciutat de València',
    stadiumCapacity: 26354,
    budget: 26000000,
    reputation: 67,
    colors: { primary: '#004D98', secondary: '#CE1126', accent: '#FFFFFF' },
    players: [
      createPlayer('M. Robledo', 'GK', 33, 2, 66),
      createPlayer('P. Castaño', 'GK', 23, 1.5, 64),
      createPlayer('Marcos Medrano', 'CB', 22, 4, 70),
      createPlayer('Adrien Masson', 'CB', 21, 4, 72),
      createPlayer('Alexandre Domingues', 'CB', 26, 2, 67),
      createPlayer('U. Escobar', 'CB', 32, 0.6, 61),
      createPlayer('M. Salcedo', 'LB', 25, 6, 70),
      createPlayer('Diogo Peixoto', 'LB', 25, 1.2, 64),
      createPlayer('J. Torralba', 'RB', 31, 2.2, 67),
      createPlayer('Valentín Giménez', 'RB', 28, 1, 64),
      createPlayer('Xavier Roche', 'CDM', 22, 3, 67),
      createPlayer('Orlando Robledo', 'CDM', 27, 2, 67),
      createPlayer('Pedro Machado', 'CM', 27, 2, 67),
      createPlayer('Ulises Valderrama', 'CM', 25, 2, 67),
      createPlayer('Jaime Ocampo', 'CM', 25, 1.8, 64),
      createPlayer('Raí Barbosa', 'LW', 29, 2, 67),
      createPlayer('Cédric Joubert', 'RW', 22, 15, 76),
      createPlayer('Ismael Laínez', 'CAM', 24, 1.4, 64),
      createPlayer('Kevin Esteves', 'ST', 22, 20, 79),
      createPlayer('Ignacio Ríos', 'ST', 24, 7.5, 73),
      createPlayer('J. Medrano', 'ST', 38, 0.4, 60)
    ]
  },

  // ========== RCD MALLORCA ==========
  mallorca: {
    name: 'Balear FC',
    shortName: 'MLL',
    city: 'Palma',
    stadium: 'Son Moix',
    stadiumCapacity: 23142,
    budget: 28000000,
    reputation: 69,
    colors: { primary: '#E30613', secondary: '#000000', accent: '#FFCD00' },
    players: [
      createPlayer('Lorenzo Robledo', 'GK', 25, 5, 70),
      createPlayer('Laurent Beauchamp', 'GK', 23, 1.5, 64),
      createPlayer('M. Aguirre', 'CB', 25, 5, 70),
      createPlayer('Murilo Ventura', 'CB', 30, 4.5, 70),
      createPlayer('Anderson Rezende', 'CB', 34, 1.5, 63),
      createPlayer('Joaquín Mendoza', 'LB', 33, 1.8, 63),
      createPlayer('T. Laínez', 'LB', 28, 1.5, 64),
      createPlayer('Pablo Medrano', 'RB', 28, 5, 70),
      createPlayer('Martín Mendoza', 'RB', 25, 1.5, 64),
      createPlayer('S. Cardoso', 'CDM', 25, 15, 76),
      createPlayer('Olivier Moreau', 'CDM', 32, 0.8, 61),
      createPlayer('Sébastien Delacroix', 'CM', 32, 3.5, 66),
      createPlayer('A. Saunier', 'CM', 28, 2.4, 67),
      createPlayer('Murilo Moraes', 'CM', 27, 2.4, 67),
      createPlayer('Philippe Thibault', 'CAM', 22, 5, 70),
      createPlayer('Jaime Valderrama', 'LW', 19, 12, 78),
      createPlayer('Thierry Arnaud', 'RW', 31, 1.8, 64),
      createPlayer('V. Moreau', 'ST', 31, 4.5, 70),
      createPlayer('Matheus Azevedo', 'ST', 22, 3.5, 67),
      createPlayer('A. Pinto', 'ST', 33, 0.9, 61)
    ]
  },

  // ========== GETAFE CF ==========
  getafe: {
    name: 'Centauro CF',
    shortName: 'GET',
    city: 'Getafe',
    stadium: 'Coliseum Alfonso Pérez',
    stadiumCapacity: 17393,
    budget: 25000000,
    reputation: 67,
    colors: { primary: '#004999', secondary: '#FFFFFF', accent: '#004999' },
    players: [
      createPlayer('D. Salcedo', 'GK', 32, 3, 81),
      createPlayer('João Leitão', 'GK', 27, 2, 67),
      createPlayer('Alexandre Almeida', 'CB', 26, 6, 70),
      createPlayer('Santiago Bravo', 'CB', 22, 2.8, 67),
      createPlayer('Héctor Robledo', 'CB', 26, 2, 67),
      createPlayer('Dorian Dubois', 'CB', 34, 1.6, 63),
      createPlayer('Daniel Robledo', 'LB', 32, 1.2, 63),
      createPlayer('Darío', 'LB', 18, 1, 66),
      createPlayer('Jaime Ibarra', 'RB', 27, 5, 70),
      createPlayer('K. Ferreira', 'RB', 34, 0.8, 61),
      createPlayer('Adrián Navarrete', 'RB', 37, 0.2, 60),
      createPlayer('Mathieu Moreau', 'CDM', 21, 5, 72),
      createPlayer('Kevin Nogueira', 'CDM', 29, 2.5, 67),
      createPlayer('Mathieu Arnaud', 'CM', 30, 10, 73),
      createPlayer('Leonardo Machado', 'CM', 31, 3.5, 79),
      createPlayer('J. Machado', 'CM', 30, 1.5, 64),
      createPlayer('André Leitão', 'LW', 20, 8, 75),
      createPlayer('Carlos Carrasco', 'LW', 23, 2.5, 67),
      createPlayer('Adrián Torralba', 'RW', 22, 3, 67),
      createPlayer('Breno Monteiro', 'ST', 28, 7.5, 73),
      createPlayer('Martín Saavedra', 'ST', 24, 6, 70)
    ]
  },

  // ========== DEPORTIVO ALAVÉS ==========
  alaves: {
    name: 'Rioja Deportivo',
    shortName: 'ALA',
    city: 'Vitoria-Gasteiz',
    stadium: 'Mendizorroza',
    stadiumCapacity: 19840,
    budget: 24000000,
    reputation: 66,
    colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' },
    players: [
      createPlayer('Adriano Silveira', 'GK', 29, 6, 70),
      createPlayer('Raí Fontes', 'GK', 37, 0.2, 60),
      createPlayer('João Pinto', 'CB', 25, 5, 70),
      createPlayer('M. Domínguez', 'CB', 25, 1.5, 64),
      createPlayer('Nicolás Medrano', 'CB', 30, 0.8, 62),
      createPlayer('Yago Esperança', 'LB', 20, 5, 72),
      createPlayer('Valentín Palacios', 'LB', 23, 2, 67),
      createPlayer('Nahuel Tolosa', 'RB', 29, 3, 67),
      createPlayer('Joaquín Orozco', 'RB', 31, 2.5, 67),
      createPlayer('Anderson Barbosa', 'CDM', 25, 10, 73),
      createPlayer('César Palacios', 'CDM', 27, 1, 64),
      createPlayer('Aurelio Guzmán', 'CM', 28, 3, 67),
      createPlayer('Clément Arnaud', 'CM', 28, 3, 67),
      createPlayer('Pablo Ibarra', 'CM', 27, 3, 67),
      createPlayer('Jacques Girard', 'CM', 30, 2.5, 67),
      createPlayer('Dorian Saunier', 'CAM', 32, 1.2, 63),
      createPlayer('A. Ríos', 'LW', 27, 1.5, 64),
      createPlayer('C. Vázquez', 'RW', 26, 7, 73),
      createPlayer('Luis Belmonte', 'ST', 29, 5, 70),
      createPlayer('Thiago Moraes', 'ST', 28, 3.5, 67),
      createPlayer('Martín Delgado', 'ST', 32, 0.8, 61)
    ]
  },

  // ========== REAL OVIEDO ==========
  oviedo: {
    name: 'Ashfield FC',
    shortName: 'OVI',
    city: 'Oviedo',
    stadium: 'Carlos Tartiere',
    stadiumCapacity: 30500,
    budget: 22000000,
    reputation: 64,
    colors: { primary: '#005BA6', secondary: '#FFFFFF', accent: '#005BA6' },
    players: [
      createPlayer('Henrique Machado', 'GK', 28, 2, 67),
      createPlayer('Adrián Estrada', 'GK', 30, 2, 67),
      createPlayer('Damien Carpentier', 'CB', 26, 10, 73),
      createPlayer('Ernesto Belmonte', 'CB', 31, 1.5, 64),
      createPlayer('Dorian Chevalier', 'CB', 30, 1.4, 64),
      createPlayer('Darío Ceballos', 'CB', 31, 1, 64),
      createPlayer('Jorge Laínez', 'LB', 23, 5, 70),
      createPlayer('Rafael Almeida', 'LB', 24, 2, 67),
      createPlayer('N. Ventura', 'RB', 31, 1.6, 64),
      createPlayer('Luis Arévalo', 'RB', 30, 0.7, 62),
      createPlayer('Luciano Dutra', 'CDM', 30, 4, 80),
      createPlayer('Salvador Castaño', 'CDM', 29, 3, 67),
      createPlayer('A. Ramos', 'CM', 28, 1.5, 64),
      createPlayer('Kevin Salcedo', 'CM', 27, 1.4, 64),
      createPlayer('Sérgio Cardoso', 'CM', 41, 0.2, 60),
      createPlayer('L. Iturbe', 'CAM', 26, 2, 67),
      createPlayer('Teodoro Figueroa', 'LW', 21, 4.5, 72),
      createPlayer('Iván Carrasco', 'LW', 24, 4, 70),
      createPlayer('Joaquín Bustos', 'LW', 27, 2.5, 67),
      createPlayer('H. Hubert', 'RW', 23, 5, 70),
      createPlayer('Fernando Valderrama', 'ST', 27, 4, 70),
      createPlayer('T. Borges', 'ST', 23, 4, 70)
    ]
  }
};

// ============================================================
// JUGADORES LIBRES
// ============================================================
export const freeAgents = [
  createPlayer('Raí Moraes', 'RW', 37, 3, 64),
  createPlayer('M. Delgado', 'ST', 31, 8, 73),
  createPlayer('Martín Herrera', 'CB', 30, 10, 73),
  createPlayer('Adrien Roche', 'CM', 30, 20, 79),
  createPlayer('Salvador Bermejo', 'CDM', 37, 1, 61),
  createPlayer('Jacques Arnaud', 'LB', 36, 2, 64),
  createPlayer('Nicolás Fuentes', 'CB', 35, 3, 64),
  createPlayer('Sergio Robledo', 'GK', 31, 1.5, 64),
  createPlayer('Manuel Heredia', 'ST', 30, 2, 67),
  createPlayer('Martín Franco', 'CM', 38, 0.3, 60),
  createPlayer('Enzo Guedes', 'CB', 38, 0.2, 60),
  createPlayer('Nahuel', 'LW', 39, 0.3, 60),
  createPlayer('Émile', 'RW', 37, 1, 61),
  createPlayer('Teodoro Aguirre', 'CM', 34, 2, 66),
  createPlayer('Carlos Fuentes', 'CM', 38, 0.3, 60)
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
  laliga: { id: 'laliga', name: 'Liga Ibérica', country: 'spain', level: 1 },
  segunda: { id: 'segunda', name: 'Segunda Ibérica', country: 'spain', level: 2 },
  primeraRFEF: { id: 'primeraRFEF', name: 'Primera RFEF', country: 'spain', level: 3 },
  segundaRFEF: { id: 'segundaRFEF', name: 'Segunda RFEF', country: 'spain', level: 4 },
  premierLeague: { id: 'premierLeague', name: 'First League', country: 'england', level: 1 },
  bundesliga: { id: 'bundesliga', name: 'Erste Liga', country: 'germany', level: 1 },
  serieA: { id: 'serieA', name: 'Calcio League', country: 'italy', level: 1 },
  ligue1: { id: 'ligue1', name: 'Division Première', country: 'france', level: 1 },
  eredivisie: { id: 'eredivisie', name: 'Dutch First', country: 'netherlands', level: 1 },
  primeiraLiga: { id: 'primeiraLiga', name: 'Liga Lusitana', country: 'portugal', level: 1 },
  championship: { id: 'championship', name: 'Second League', country: 'england', level: 2 },
  belgianPro: { id: 'belgianPro', name: 'Belgian First', country: 'belgium', level: 1 },
  superLig: { id: 'superLig', name: 'Anatolian League', country: 'turkey', level: 1 },
  scottishPrem: { id: 'scottishPrem', name: 'Highland League', country: 'scotland', level: 1 },
  serieB: { id: 'serieB', name: 'Calcio B', country: 'italy', level: 2 },
  bundesliga2: { id: 'bundesliga2', name: 'Zweite Liga', country: 'germany', level: 2 },
  ligue2: { id: 'ligue2', name: 'Division Seconde', country: 'france', level: 2 },
  swissSuperLeague: { id: 'swissSuperLeague', name: 'Alpine League', country: 'switzerland', level: 1 },
  austrianBundesliga: { id: 'austrianBundesliga', name: 'Erste Liga (Austria)', country: 'austria', level: 1 },
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
