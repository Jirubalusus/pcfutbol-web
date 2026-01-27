// Generador de teams.js con datos reales de Transfermarkt
// Temporada 25/26

import * as fs from 'fs';

// Datos scrapeados de Transfermarkt - Temporada 25/26 LaLiga
const LALIGA_REAL_DATA = {
  real_madrid: {
    name: 'Real Madrid CF', shortName: 'RMA', city: 'Madrid', stadium: 'Santiago Bernabéu', 
    stadiumCapacity: 81044, budget: 250000000, reputation: 95,
    colors: { primary: '#FFFFFF', secondary: '#000000' },
    players: [
      { name: 'Thibaut Courtois', position: 'GK', age: 33, value: 18000000 },
      { name: 'Andriy Lunin', position: 'GK', age: 26, value: 15000000 },
      { name: 'Fran González', position: 'GK', age: 20, value: 1000000 },
      { name: 'Dean Huijsen', position: 'CB', age: 20, value: 70000000 },
      { name: 'Éder Militão', position: 'CB', age: 28, value: 30000000 },
      { name: 'Raúl Asencio', position: 'CB', age: 22, value: 30000000 },
      { name: 'Antonio Rüdiger', position: 'CB', age: 32, value: 12000000 },
      { name: 'David Alaba', position: 'CB', age: 33, value: 4000000 },
      { name: 'Álvaro Carreras', position: 'LB', age: 22, value: 60000000 },
      { name: 'Fran García', position: 'LB', age: 26, value: 15000000 },
      { name: 'Ferland Mendy', position: 'LB', age: 30, value: 8000000 },
      { name: 'Trent Alexander-Arnold', position: 'RB', age: 27, value: 70000000 },
      { name: 'Daniel Carvajal', position: 'RB', age: 34, value: 7000000 },
      { name: 'Aurélien Tchouaméni', position: 'CDM', age: 26, value: 75000000 },
      { name: 'Federico Valverde', position: 'CM', age: 27, value: 120000000 },
      { name: 'Eduardo Camavinga', position: 'CM', age: 23, value: 50000000 },
      { name: 'Dani Ceballos', position: 'CM', age: 29, value: 8000000 },
      { name: 'Jude Bellingham', position: 'CAM', age: 22, value: 160000000 },
      { name: 'Arda Güler', position: 'CAM', age: 20, value: 90000000 },
      { name: 'Vinícius Júnior', position: 'LW', age: 25, value: 150000000 },
      { name: 'Rodrygo', position: 'RW', age: 25, value: 60000000 },
      { name: 'Franco Mastantuono', position: 'RW', age: 18, value: 50000000 },
      { name: 'Brahim Díaz', position: 'RW', age: 26, value: 35000000 },
      { name: 'Kylian Mbappé', position: 'ST', age: 27, value: 200000000 },
      { name: 'Gonzalo García', position: 'ST', age: 21, value: 15000000 }
    ]
  },
  barcelona: {
    name: 'FC Barcelona', shortName: 'BAR', city: 'Barcelona', stadium: 'Spotify Camp Nou',
    stadiumCapacity: 99354, budget: 180000000, reputation: 93,
    colors: { primary: '#004D98', secondary: '#A50044' },
    players: [
      { name: 'Joan García', position: 'GK', age: 24, value: 30000000 },
      { name: 'Wojciech Szczęsny', position: 'GK', age: 35, value: 900000 },
      { name: 'Pau Cubarsí', position: 'CB', age: 19, value: 80000000 },
      { name: 'Eric García', position: 'CB', age: 25, value: 30000000 },
      { name: 'Ronald Araujo', position: 'CB', age: 26, value: 25000000 },
      { name: 'Andreas Christensen', position: 'CB', age: 29, value: 10000000 },
      { name: 'Alejandro Balde', position: 'LB', age: 22, value: 60000000 },
      { name: 'Gerard Martín', position: 'LB', age: 23, value: 20000000 },
      { name: 'Jules Koundé', position: 'RB', age: 27, value: 65000000 },
      { name: 'João Cancelo', position: 'RB', age: 31, value: 10000000 },
      { name: 'Marc Casadó', position: 'CDM', age: 22, value: 25000000 },
      { name: 'Marc Bernal', position: 'CDM', age: 18, value: 10000000 },
      { name: 'Pedri', position: 'CM', age: 23, value: 140000000 },
      { name: 'Frenkie de Jong', position: 'CM', age: 28, value: 45000000 },
      { name: 'Gavi', position: 'CM', age: 21, value: 40000000 },
      { name: 'Fermín López', position: 'CAM', age: 22, value: 70000000 },
      { name: 'Dani Olmo', position: 'CAM', age: 27, value: 60000000 },
      { name: 'Raphinha', position: 'LW', age: 29, value: 80000000 },
      { name: 'Marcus Rashford', position: 'LW', age: 28, value: 40000000 },
      { name: 'Lamine Yamal', position: 'RW', age: 18, value: 200000000 },
      { name: 'Roony Bardghji', position: 'RW', age: 20, value: 10000000 },
      { name: 'Ferran Torres', position: 'ST', age: 25, value: 50000000 },
      { name: 'Robert Lewandowski', position: 'ST', age: 37, value: 9000000 }
    ]
  },
  atletico_madrid: {
    name: 'Atlético de Madrid', shortName: 'ATM', city: 'Madrid', stadium: 'Cívitas Metropolitano',
    stadiumCapacity: 70460, budget: 150000000, reputation: 88,
    colors: { primary: '#CE3524', secondary: '#FFFFFF' },
    players: [
      { name: 'Jan Oblak', position: 'GK', age: 33, value: 17000000 },
      { name: 'Juan Musso', position: 'GK', age: 31, value: 3000000 },
      { name: 'Dávid Hancko', position: 'CB', age: 28, value: 30000000 },
      { name: 'Robin Le Normand', position: 'CB', age: 29, value: 30000000 },
      { name: 'Marc Pubill', position: 'CB', age: 22, value: 15000000 },
      { name: 'José María Giménez', position: 'CB', age: 31, value: 14000000 },
      { name: 'Clément Lenglet', position: 'CB', age: 30, value: 6000000 },
      { name: 'Matteo Ruggeri', position: 'LB', age: 23, value: 15000000 },
      { name: 'Marcos Llorente', position: 'RB', age: 30, value: 22000000 },
      { name: 'Nahuel Molina', position: 'RB', age: 27, value: 15000000 },
      { name: 'Johnny Cardoso', position: 'CDM', age: 24, value: 22000000 },
      { name: 'Pablo Barrios', position: 'CM', age: 22, value: 60000000 },
      { name: 'Koke', position: 'CM', age: 34, value: 7000000 },
      { name: 'Álex Baena', position: 'LW', age: 24, value: 55000000 },
      { name: 'Nico González', position: 'LW', age: 27, value: 24000000 },
      { name: 'Thiago Almada', position: 'LW', age: 24, value: 20000000 },
      { name: 'Giuliano Simeone', position: 'RW', age: 23, value: 40000000 },
      { name: 'Antoine Griezmann', position: 'CAM', age: 34, value: 11000000 },
      { name: 'Julián Alvarez', position: 'ST', age: 25, value: 100000000 },
      { name: 'Alexander Sørloth', position: 'ST', age: 30, value: 20000000 }
    ]
  },
  athletic_bilbao: {
    name: 'Athletic Club', shortName: 'ATH', city: 'Bilbao', stadium: 'San Mamés',
    stadiumCapacity: 53289, budget: 90000000, reputation: 82,
    colors: { primary: '#EE2523', secondary: '#FFFFFF' },
    players: [
      { name: 'Unai Simón', position: 'GK', age: 28, value: 25000000 },
      { name: 'Álex Padilla', position: 'GK', age: 22, value: 3000000 },
      { name: 'Dani Vivian', position: 'CB', age: 26, value: 30000000 },
      { name: 'Aitor Paredes', position: 'CB', age: 25, value: 18000000 },
      { name: 'Aymeric Laporte', position: 'CB', age: 31, value: 9000000 },
      { name: 'Yeray Álvarez', position: 'CB', age: 31, value: 1000000 },
      { name: 'Unai Egiluz', position: 'CB', age: 23, value: 600000 },
      { name: 'Adama Boiro', position: 'LB', age: 23, value: 3000000 },
      { name: 'Yuri Berchiche', position: 'LB', age: 35, value: 1200000 },
      { name: 'Jesús Areso', position: 'RB', age: 26, value: 10000000 },
      { name: 'Andoni Gorosabel', position: 'RB', age: 29, value: 4000000 },
      { name: 'Iñigo Lekue', position: 'RB', age: 32, value: 1200000 },
      { name: 'Mikel Vesga', position: 'CDM', age: 32, value: 1500000 },
      { name: 'Mikel Jauregizar', position: 'CM', age: 22, value: 30000000 },
      { name: 'Beñat Prados', position: 'CM', age: 24, value: 18000000 },
      { name: 'Alejandro Rego', position: 'CM', age: 22, value: 3000000 },
      { name: 'Selton Sánchez', position: 'CM', age: 18, value: 3000000 },
      { name: 'Iñigo Ruiz de Galarreta', position: 'CM', age: 32, value: 2500000 },
      { name: 'Oihan Sancet', position: 'CAM', age: 25, value: 40000000 },
      { name: 'Unai Gómez', position: 'CAM', age: 22, value: 5000000 },
      { name: 'Nico Williams', position: 'LW', age: 23, value: 60000000 },
      { name: 'Álex Berenguer', position: 'LW', age: 30, value: 5000000 },
      { name: 'Nico Serrano', position: 'LW', age: 22, value: 1500000 },
      { name: 'Iñaki Williams', position: 'RW', age: 31, value: 10000000 },
      { name: 'Robert Navarro', position: 'RW', age: 23, value: 6000000 },
      { name: 'Gorka Guruzeta', position: 'ST', age: 29, value: 5000000 },
      { name: 'Maroan Sannadi', position: 'ST', age: 24, value: 5000000 },
      { name: 'Urko Izeta', position: 'ST', age: 26, value: 1500000 }
    ]
  },
  // Continuación del archivo con todos los equipos...
};

// Función para calcular overall basado en valor y edad
function calcOverall(value, age) {
  const m = value / 1000000;
  let ovr;
  if (m >= 150) ovr = 92;
  else if (m >= 100) ovr = 90;
  else if (m >= 70) ovr = 88;
  else if (m >= 50) ovr = 86;
  else if (m >= 35) ovr = 84;
  else if (m >= 25) ovr = 82;
  else if (m >= 15) ovr = 80;
  else if (m >= 10) ovr = 78;
  else if (m >= 6) ovr = 76;
  else if (m >= 3) ovr = 74;
  else if (m >= 1.5) ovr = 72;
  else if (m >= 0.5) ovr = 70;
  else if (m >= 0.2) ovr = 68;
  else ovr = 66;
  
  if (age <= 21) ovr += 1;
  else if (age >= 33) ovr -= 1;
  else if (age >= 35) ovr -= 2;
  
  return Math.max(62, Math.min(94, ovr));
}

// Calcular salario
function calcSalary(value, age) {
  const annual = value * 0.12;
  const weekly = annual / 52;
  const mult = age >= 32 ? 1.3 : (age >= 28 ? 1.1 : 1.0);
  return Math.max(20000, Math.round(weekly * mult));
}

console.log('🔧 Ejecuta este script para generar teams.js actualizado');
console.log('   Datos de Transfermarkt temporada 25/26');
