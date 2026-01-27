// Construir archivo teams.js desde datos de Transfermarkt
// Ejecutar después de tener los datos scrapeados

const POSITION_MAP = {
  'Portero': 'GK',
  'Defensa central': 'CB',
  'Lateral izquierdo': 'LB',
  'Lateral derecho': 'RB',
  'Pivote': 'CDM',
  'Mediocentro': 'CM',
  'Mediocentro ofensivo': 'CAM',
  'Mediapunta': 'CAM',
  'Extremo izquierdo': 'LW',
  'Extremo derecho': 'RW',
  'Delantero centro': 'ST',
  'Interior derecho': 'CM',
  'Interior izquierdo': 'CM',
  'Segundo delantero': 'ST',
  'Carrilero derecho': 'RB',
  'Carrilero izquierdo': 'LB'
};

function parseValue(str) {
  if (!str) return 500000;
  const match = str.match(/([0-9,.]+)\s*(mil mill|mill|mil)/);
  if (!match) return 500000;
  
  const num = parseFloat(match[1].replace(',', '.'));
  if (match[2] === 'mil mill') return num * 1000000000;
  if (match[2] === 'mill') return num * 1000000;
  if (match[2] === 'mil') return num * 1000;
  return 500000;
}

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

function calcSalary(value, age) {
  const annual = value * 0.12;
  const weekly = annual / 52;
  const mult = age >= 32 ? 1.3 : (age >= 28 ? 1.1 : 1.0);
  return Math.max(20000, Math.round(weekly * mult));
}

function parseTeamMarkdown(text) {
  const players = [];
  const lines = text.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Buscar línea con nombre del jugador
    const nameMatch = line.match(/\[([^\]]+)\]\([^)]+\/profil\/spieler/);
    if (nameMatch) {
      const name = nameMatch[1];
      
      // Siguiente línea debería ser posición
      let pos = null;
      let age = null;
      let value = null;
      
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j].trim();
        
        // Buscar posición
        if (!pos) {
          const foundPos = Object.keys(POSITION_MAP).find(p => nextLine === p);
          if (foundPos) {
            pos = POSITION_MAP[foundPos];
            continue;
          }
        }
        
        // Buscar edad (número de 2 dígitos)
        if (!age) {
          const ageMatch = nextLine.match(/^(\d{2})$/);
          if (ageMatch) {
            const a = parseInt(ageMatch[1]);
            if (a >= 16 && a <= 45) {
              age = a;
              continue;
            }
          }
        }
        
        // Buscar valor
        if (!value) {
          const valueMatch = nextLine.match(/\[([0-9,.]+ (?:mil )?mill\. €|[0-9,.]+ mil €)\]/);
          if (valueMatch) {
            value = parseValue(valueMatch[1]);
            break;
          }
        }
      }
      
      if (name && pos) {
        const actualAge = age || 25;
        const actualValue = value || 1000000;
        players.push({
          name,
          position: pos,
          overall: calcOverall(actualValue, actualAge),
          age: actualAge,
          value: actualValue,
          salary: calcSalary(actualValue, actualAge)
        });
      }
    }
    i++;
  }
  
  return players;
}

// Datos de equipos de LaLiga 25/26 (de Transfermarkt)
const LALIGA_TEAMS_CONFIG = [
  { id: 'real_madrid', name: 'Real Madrid CF', shortName: 'RMA', tmSlug: 'real-madrid-cf', tmId: 418, city: 'Madrid', stadium: 'Santiago Bernabéu', stadiumCapacity: 81044, reputation: 95, colors: { primary: '#FFFFFF', secondary: '#000000' } },
  { id: 'barcelona', name: 'FC Barcelona', shortName: 'BAR', tmSlug: 'fc-barcelona', tmId: 131, city: 'Barcelona', stadium: 'Spotify Camp Nou', stadiumCapacity: 99354, reputation: 93, colors: { primary: '#004D98', secondary: '#A50044' } },
  { id: 'atletico_madrid', name: 'Atlético de Madrid', shortName: 'ATM', tmSlug: 'atletico-de-madrid', tmId: 13, city: 'Madrid', stadium: 'Cívitas Metropolitano', stadiumCapacity: 70460, reputation: 88, colors: { primary: '#CE3524', secondary: '#FFFFFF' } },
  { id: 'athletic_bilbao', name: 'Athletic Club', shortName: 'ATH', tmSlug: 'athletic-club', tmId: 621, city: 'Bilbao', stadium: 'San Mamés', stadiumCapacity: 53289, reputation: 82, colors: { primary: '#EE2523', secondary: '#FFFFFF' } },
  { id: 'villarreal', name: 'Villarreal CF', shortName: 'VIL', tmSlug: 'villarreal-cf', tmId: 1050, city: 'Villarreal', stadium: 'Estadio de la Cerámica', stadiumCapacity: 23500, reputation: 82, colors: { primary: '#FFE114', secondary: '#005CA7' } },
  { id: 'real_sociedad', name: 'Real Sociedad', shortName: 'RSO', tmSlug: 'real-sociedad', tmId: 681, city: 'San Sebastián', stadium: 'Reale Arena', stadiumCapacity: 39500, reputation: 83, colors: { primary: '#003DA5', secondary: '#FFFFFF' } },
  { id: 'real_betis', name: 'Real Betis Balompié', shortName: 'BET', tmSlug: 'real-betis-balompie', tmId: 150, city: 'Sevilla', stadium: 'Benito Villamarín', stadiumCapacity: 60720, reputation: 80, colors: { primary: '#00954C', secondary: '#FFFFFF' } },
  { id: 'valencia', name: 'Valencia CF', shortName: 'VAL', tmSlug: 'valencia-cf', tmId: 1049, city: 'Valencia', stadium: 'Mestalla', stadiumCapacity: 49430, reputation: 78, colors: { primary: '#FFFFFF', secondary: '#FF4500' } },
  { id: 'girona', name: 'Girona FC', shortName: 'GIR', tmSlug: 'girona-fc', tmId: 12321, city: 'Girona', stadium: 'Montilivi', stadiumCapacity: 14624, reputation: 75, colors: { primary: '#CD2534', secondary: '#FFFFFF' } },
  { id: 'celta', name: 'RC Celta de Vigo', shortName: 'CEL', tmSlug: 'rc-celta-de-vigo', tmId: 940, city: 'Vigo', stadium: 'Abanca-Balaídos', stadiumCapacity: 29000, reputation: 74, colors: { primary: '#8FBCE5', secondary: '#FFFFFF' } },
  { id: 'sevilla', name: 'Sevilla FC', shortName: 'SEV', tmSlug: 'sevilla-fc', tmId: 368, city: 'Sevilla', stadium: 'Ramón Sánchez-Pizjuán', stadiumCapacity: 43883, reputation: 82, colors: { primary: '#FFFFFF', secondary: '#D4021D' } },
  { id: 'rayo', name: 'Rayo Vallecano', shortName: 'RAY', tmSlug: 'rayo-vallecano', tmId: 367, city: 'Madrid', stadium: 'Estadio de Vallecas', stadiumCapacity: 14708, reputation: 70, colors: { primary: '#FFFFFF', secondary: '#E53027' } },
  { id: 'elche', name: 'Elche CF', shortName: 'ELC', tmSlug: 'elche-cf', tmId: 1531, city: 'Elche', stadium: 'Martínez Valero', stadiumCapacity: 33732, reputation: 68, colors: { primary: '#008000', secondary: '#FFFFFF' } },
  { id: 'espanyol', name: 'RCD Espanyol', shortName: 'ESP', tmSlug: 'rcd-espanyol', tmId: 714, city: 'Barcelona', stadium: 'RCDE Stadium', stadiumCapacity: 40500, reputation: 72, colors: { primary: '#007FC8', secondary: '#FFFFFF' } },
  { id: 'osasuna', name: 'CA Osasuna', shortName: 'OSA', tmSlug: 'ca-osasuna', tmId: 331, city: 'Pamplona', stadium: 'El Sadar', stadiumCapacity: 23576, reputation: 73, colors: { primary: '#D91A21', secondary: '#000066' } },
  { id: 'levante', name: 'Levante UD', shortName: 'LEV', tmSlug: 'levante-ud', tmId: 3368, city: 'Valencia', stadium: 'Ciutat de València', stadiumCapacity: 25354, reputation: 70, colors: { primary: '#003399', secondary: '#CC0000' } },
  { id: 'mallorca', name: 'RCD Mallorca', shortName: 'MLL', tmSlug: 'rcd-mallorca', tmId: 237, city: 'Palma', stadium: 'Mallorca Son Moix', stadiumCapacity: 23142, reputation: 72, colors: { primary: '#E30613', secondary: '#000000' } },
  { id: 'getafe', name: 'Getafe CF', shortName: 'GET', tmSlug: 'getafe-cf', tmId: 3709, city: 'Getafe', stadium: 'Coliseum Alfonso Pérez', stadiumCapacity: 17393, reputation: 72, colors: { primary: '#004FA3', secondary: '#FFFFFF' } },
  { id: 'alaves', name: 'Deportivo Alavés', shortName: 'ALA', tmSlug: 'deportivo-alaves', tmId: 1108, city: 'Vitoria-Gasteiz', stadium: 'Mendizorroza', stadiumCapacity: 19840, reputation: 68, colors: { primary: '#003DA5', secondary: '#FFFFFF' } },
  { id: 'oviedo', name: 'Real Oviedo', shortName: 'OVI', tmSlug: 'real-oviedo', tmId: 2497, city: 'Oviedo', stadium: 'Carlos Tartiere', stadiumCapacity: 30500, reputation: 65, colors: { primary: '#0066CC', secondary: '#FFFFFF' } }
];

// Exportar
export { parseTeamMarkdown, LALIGA_TEAMS_CONFIG, calcOverall, calcSalary, parseValue };

console.log('🔧 Build teams helper cargado');
console.log(`   ${LALIGA_TEAMS_CONFIG.length} equipos configurados`);
