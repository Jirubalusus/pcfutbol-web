// Scraper de Transfermarkt para PC Fútbol Web
// Scrapea plantillas reales de LaLiga y jugadores libres

import * as fs from 'fs';

const BASE_URL = 'https://www.transfermarkt.es';

// Mapeo de equipos de LaLiga con IDs de Transfermarkt
const LALIGA_TEAMS_TM = [
  { id: 'real_madrid', name: 'Real Madrid CF', shortName: 'RMA', tmId: 418, city: 'Madrid', stadium: 'Santiago Bernabéu', stadiumCapacity: 81044, reputation: 95, colors: { primary: '#FFFFFF', secondary: '#000000' } },
  { id: 'barcelona', name: 'FC Barcelona', shortName: 'BAR', tmId: 131, city: 'Barcelona', stadium: 'Spotify Camp Nou', stadiumCapacity: 99354, reputation: 93, colors: { primary: '#004D98', secondary: '#A50044' } },
  { id: 'atletico_madrid', name: 'Atlético de Madrid', shortName: 'ATM', tmId: 13, city: 'Madrid', stadium: 'Cívitas Metropolitano', stadiumCapacity: 70460, reputation: 88, colors: { primary: '#CE3524', secondary: '#FFFFFF' } },
  { id: 'athletic_bilbao', name: 'Athletic Club', shortName: 'ATH', tmId: 621, city: 'Bilbao', stadium: 'San Mamés', stadiumCapacity: 53289, reputation: 82, colors: { primary: '#EE2523', secondary: '#FFFFFF' } },
  { id: 'villarreal', name: 'Villarreal CF', shortName: 'VIL', tmId: 1050, city: 'Villarreal', stadium: 'Estadio de la Cerámica', stadiumCapacity: 23500, reputation: 82, colors: { primary: '#FFE114', secondary: '#005CA7' } },
  { id: 'real_sociedad', name: 'Real Sociedad', shortName: 'RSO', tmId: 681, city: 'San Sebastián', stadium: 'Reale Arena', stadiumCapacity: 39500, reputation: 83, colors: { primary: '#003DA5', secondary: '#FFFFFF' } },
  { id: 'real_betis', name: 'Real Betis Balompié', shortName: 'BET', tmId: 150, city: 'Sevilla', stadium: 'Benito Villamarín', stadiumCapacity: 60720, reputation: 80, colors: { primary: '#00954C', secondary: '#FFFFFF' } },
  { id: 'valencia', name: 'Valencia CF', shortName: 'VAL', tmId: 1049, city: 'Valencia', stadium: 'Mestalla', stadiumCapacity: 49430, reputation: 78, colors: { primary: '#FFFFFF', secondary: '#FF4500' } },
  { id: 'girona', name: 'Girona FC', shortName: 'GIR', tmId: 12321, city: 'Girona', stadium: 'Montilivi', stadiumCapacity: 14624, reputation: 75, colors: { primary: '#CD2534', secondary: '#FFFFFF' } },
  { id: 'celta', name: 'RC Celta de Vigo', shortName: 'CEL', tmId: 940, city: 'Vigo', stadium: 'Abanca-Balaídos', stadiumCapacity: 29000, reputation: 74, colors: { primary: '#8FBCE5', secondary: '#FFFFFF' } },
  { id: 'sevilla', name: 'Sevilla FC', shortName: 'SEV', tmId: 368, city: 'Sevilla', stadium: 'Ramón Sánchez-Pizjuán', stadiumCapacity: 43883, reputation: 82, colors: { primary: '#FFFFFF', secondary: '#D4021D' } },
  { id: 'rayo', name: 'Rayo Vallecano', shortName: 'RAY', tmId: 367, city: 'Madrid', stadium: 'Estadio de Vallecas', stadiumCapacity: 14708, reputation: 70, colors: { primary: '#FFFFFF', secondary: '#E53027' } },
  { id: 'elche', name: 'Elche CF', shortName: 'ELC', tmId: 1531, city: 'Elche', stadium: 'Martínez Valero', stadiumCapacity: 33732, reputation: 68, colors: { primary: '#008000', secondary: '#FFFFFF' } },
  { id: 'espanyol', name: 'RCD Espanyol', shortName: 'ESP', tmId: 714, city: 'Barcelona', stadium: 'RCDE Stadium', stadiumCapacity: 40500, reputation: 72, colors: { primary: '#007FC8', secondary: '#FFFFFF' } },
  { id: 'osasuna', name: 'CA Osasuna', shortName: 'OSA', tmId: 331, city: 'Pamplona', stadium: 'El Sadar', stadiumCapacity: 23576, reputation: 73, colors: { primary: '#D91A21', secondary: '#000066' } },
  { id: 'levante', name: 'Levante UD', shortName: 'LEV', tmId: 3368, city: 'Valencia', stadium: 'Ciutat de València', stadiumCapacity: 25354, reputation: 70, colors: { primary: '#003399', secondary: '#CC0000' } },
  { id: 'mallorca', name: 'RCD Mallorca', shortName: 'MLL', tmId: 237, city: 'Palma', stadium: 'Mallorca Son Moix', stadiumCapacity: 23142, reputation: 72, colors: { primary: '#E30613', secondary: '#000000' } },
  { id: 'getafe', name: 'Getafe CF', shortName: 'GET', tmId: 3709, city: 'Getafe', stadium: 'Coliseum Alfonso Pérez', stadiumCapacity: 17393, reputation: 72, colors: { primary: '#004FA3', secondary: '#FFFFFF' } },
  { id: 'alaves', name: 'Deportivo Alavés', shortName: 'ALA', tmId: 1108, city: 'Vitoria-Gasteiz', stadium: 'Mendizorroza', stadiumCapacity: 19840, reputation: 68, colors: { primary: '#003DA5', secondary: '#FFFFFF' } },
  { id: 'oviedo', name: 'Real Oviedo', shortName: 'OVI', tmId: 2497, city: 'Oviedo', stadium: 'Carlos Tartiere', stadiumCapacity: 30500, reputation: 65, colors: { primary: '#0066CC', secondary: '#FFFFFF' } }
];

// Mapeo de posiciones Transfermarkt -> Juego
const POSITION_MAP = {
  'Portero': 'GK',
  'Defensa central': 'CB',
  'Lateral izquierdo': 'LB',
  'Lateral derecho': 'RB',
  'Pivote': 'CDM',
  'Mediocentro': 'CM',
  'Mediocentro ofensivo': 'CAM',
  'Extremo izquierdo': 'LW',
  'Extremo derecho': 'RW',
  'Delantero centro': 'ST',
  'Mediapunta': 'CAM',
  'Interior derecho': 'CM',
  'Interior izquierdo': 'CM',
  'Medio centro': 'CM',
  'Medio centro defensivo': 'CDM',
  'Mediocentro defensivo': 'CDM',
  'Carrilero derecho': 'RB',
  'Carrilero izquierdo': 'LB',
  'Segundo delantero': 'ST'
};

// Calcular overall basado en valor de mercado y edad
function calculateOverall(marketValue, age, position) {
  // Valor en millones
  const valueInM = marketValue / 1000000;
  
  // Base overall por valor (logarítmico para no escalar linealmente)
  let baseOverall;
  if (valueInM >= 150) baseOverall = 92;
  else if (valueInM >= 100) baseOverall = 90;
  else if (valueInM >= 70) baseOverall = 88;
  else if (valueInM >= 50) baseOverall = 86;
  else if (valueInM >= 35) baseOverall = 84;
  else if (valueInM >= 25) baseOverall = 82;
  else if (valueInM >= 15) baseOverall = 80;
  else if (valueInM >= 10) baseOverall = 78;
  else if (valueInM >= 6) baseOverall = 76;
  else if (valueInM >= 3) baseOverall = 74;
  else if (valueInM >= 1.5) baseOverall = 72;
  else if (valueInM >= 0.5) baseOverall = 70;
  else if (valueInM >= 0.2) baseOverall = 68;
  else baseOverall = 66;
  
  // Ajuste por edad (jugadores en su prime valen más)
  if (age <= 21) baseOverall += 1; // Jóvenes con potencial
  else if (age >= 33) baseOverall -= 1; // Veteranos pueden bajar
  else if (age >= 35) baseOverall -= 2;
  
  return Math.max(60, Math.min(94, baseOverall));
}

// Parsear valor de mercado (ej: "70,00 mill. €" -> 70000000)
function parseMarketValue(valueStr) {
  if (!valueStr || valueStr === '-') return 500000;
  
  const cleaned = valueStr.replace(/[€\s]/g, '').replace(',', '.');
  
  if (cleaned.includes('mil mill')) {
    return parseFloat(cleaned) * 1000000000;
  } else if (cleaned.includes('mill')) {
    return parseFloat(cleaned) * 1000000;
  } else if (cleaned.includes('mil')) {
    return parseFloat(cleaned) * 1000;
  }
  
  return parseFloat(cleaned) || 500000;
}

// Calcular salario basado en valor
function calculateSalary(marketValue, age) {
  // Salario anual aproximado = 10-15% del valor de mercado
  const baseSalary = marketValue * 0.12;
  // Dividido entre 52 semanas para salario semanal
  const weeklySalary = baseSalary / 52;
  // Ajuste por edad (veteranos cobran más de lo que su valor indica)
  const ageMultiplier = age >= 32 ? 1.3 : (age >= 28 ? 1.1 : 1.0);
  return Math.round(weeklySalary * ageMultiplier);
}

// Scrapear un equipo desde el texto markdown
function parseTeamFromMarkdown(markdown, teamInfo) {
  const players = [];
  const lines = markdown.split('\n');
  
  let currentNumber = null;
  let currentName = null;
  let currentPosition = null;
  let currentAge = null;
  let currentValue = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detectar número de camiseta (línea con solo número)
    if (/^\d{1,2}$/.test(line)) {
      // Si ya tenemos datos previos, guardar el jugador anterior
      if (currentName && currentPosition) {
        const pos = POSITION_MAP[currentPosition] || 'CM';
        const value = parseMarketValue(currentValue);
        const overall = calculateOverall(value, currentAge || 25, pos);
        const salary = calculateSalary(value, currentAge || 25);
        
        players.push({
          name: currentName,
          position: pos,
          overall,
          age: currentAge || 25,
          value,
          salary
        });
      }
      
      currentNumber = parseInt(line);
      currentName = null;
      currentPosition = null;
      currentAge = null;
      currentValue = null;
      continue;
    }
    
    // Detectar nombre del jugador (línea con enlace)
    const nameMatch = line.match(/\[([^\]]+)\]\([^)]+\/profil\/spieler/);
    if (nameMatch) {
      currentName = nameMatch[1];
      continue;
    }
    
    // Detectar posición
    const posMatch = Object.keys(POSITION_MAP).find(pos => line === pos);
    if (posMatch) {
      currentPosition = posMatch;
      continue;
    }
    
    // Detectar edad (número de 2 dígitos entre 16-45)
    const ageMatch = line.match(/^(\d{2})$/);
    if (ageMatch) {
      const age = parseInt(ageMatch[1]);
      if (age >= 16 && age <= 45) {
        currentAge = age;
      }
      continue;
    }
    
    // Detectar valor de mercado
    const valueMatch = line.match(/\[([0-9,.]+ (?:mil )?mill\. €)\]/);
    if (valueMatch) {
      currentValue = valueMatch[1];
      continue;
    }
  }
  
  // Guardar el último jugador
  if (currentName && currentPosition) {
    const pos = POSITION_MAP[currentPosition] || 'CM';
    const value = parseMarketValue(currentValue);
    const overall = calculateOverall(value, currentAge || 25, pos);
    const salary = calculateSalary(value, currentAge || 25);
    
    players.push({
      name: currentName,
      position: pos,
      overall,
      age: currentAge || 25,
      value,
      salary
    });
  }
  
  return {
    ...teamInfo,
    budget: calculateBudget(players, teamInfo.reputation),
    players
  };
}

// Calcular presupuesto del equipo
function calculateBudget(players, reputation) {
  const totalValue = players.reduce((sum, p) => sum + p.value, 0);
  // Presupuesto es aproximadamente 30-50% del valor total
  const budgetRatio = 0.3 + (reputation / 100) * 0.2;
  return Math.round(totalValue * budgetRatio);
}

// Exportar para uso en consola
console.log('📋 Configuración de Transfermarkt Scraper lista');
console.log(`   ${LALIGA_TEAMS_TM.length} equipos de LaLiga configurados`);
console.log('\nEjecuta desde Node con Puppeteer o usa el browser de Clawdbot para scrapear');

// Exportar funciones para uso externo
export { 
  LALIGA_TEAMS_TM, 
  POSITION_MAP, 
  parseTeamFromMarkdown, 
  parseMarketValue, 
  calculateOverall,
  calculateSalary,
  calculateBudget
};
