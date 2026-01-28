// Capacidades reales de estadios (redondeadas)
// Fuente: Wikipedia / Transfermarkt 2024

export const STADIUM_CAPACITIES = {
  // === LA LIGA ===
  'real-madrid': { name: 'Santiago Bernabéu', capacity: 80000 },
  'barcelona': { name: 'Spotify Camp Nou', capacity: 100000 },
  'atletico-madrid': { name: 'Cívitas Metropolitano', capacity: 70000 },
  'sevilla': { name: 'Ramón Sánchez-Pizjuán', capacity: 43000 },
  'real-betis': { name: 'Benito Villamarín', capacity: 60000 },
  'real-sociedad': { name: 'Reale Arena', capacity: 40000 },
  'athletic-club': { name: 'San Mamés', capacity: 53000 },
  'villarreal': { name: 'Estadio de la Cerámica', capacity: 23000 },
  'valencia': { name: 'Mestalla', capacity: 50000 },
  'getafe': { name: 'Coliseum', capacity: 17000 },
  'osasuna': { name: 'El Sadar', capacity: 24000 },
  'celta': { name: 'Abanca-Balaídos', capacity: 29000 },
  'mallorca': { name: 'Visit Mallorca Estadi', capacity: 23000 },
  'las-palmas': { name: 'Gran Canaria', capacity: 32000 },
  'rayo-vallecano': { name: 'Vallecas', capacity: 15000 },
  'alaves': { name: 'Mendizorroza', capacity: 20000 },
  'girona': { name: 'Montilivi', capacity: 15000 },
  'espanyol': { name: 'RCDE Stadium', capacity: 40000 },
  'leganes': { name: 'Butarque', capacity: 12000 },
  'valladolid': { name: 'José Zorrilla', capacity: 27000 },
  
  // === SEGUNDA ===
  'racing-santander': { name: 'El Sardinero', capacity: 22000 },
  'deportivo': { name: 'Riazor', capacity: 32000 },
  'sporting-gijon': { name: 'El Molinón', capacity: 30000 },
  'zaragoza': { name: 'La Romareda', capacity: 34000 },
  'oviedo': { name: 'Carlos Tartiere', capacity: 30000 },
  'malaga': { name: 'La Rosaleda', capacity: 30000 },
  'levante': { name: 'Ciutat de València', capacity: 26000 },
  'granada': { name: 'Nuevo Los Cármenes', capacity: 22000 },
  'eibar': { name: 'Ipurua', capacity: 8000 },
  'huesca': { name: 'El Alcoraz', capacity: 9000 },
  'albacete': { name: 'Carlos Belmonte', capacity: 17000 },
  'elche': { name: 'Martínez Valero', capacity: 33000 },
  'cadiz': { name: 'Nuevo Mirandilla', capacity: 22000 },
  'almeria': { name: 'Power Horse Stadium', capacity: 17000 },
  'tenerife': { name: 'Heliodoro Rodríguez López', capacity: 22000 },
  'cartagena': { name: 'Cartagonova', capacity: 15000 },
  'burgos': { name: 'El Plantío', capacity: 12000 },
  'castellon': { name: 'Castalia', capacity: 15000 },
  'eldense': { name: 'Nuevo Pepico Amat', capacity: 6000 },
  'ferrol': { name: 'A Malata', capacity: 13000 },
  'mirandes': { name: 'Anduva', capacity: 6000 },
  'cordoba': { name: 'El Arcángel', capacity: 22000 },
  
  // === 1ª RFEF (principales) ===
  'recreativo': { name: 'Nuevo Colombino', capacity: 21000 },
  'murcia': { name: 'Nueva Condomina', capacity: 31000 },
  'unionistas': { name: 'Reina Sofía', capacity: 6000 },
  'merida': { name: 'Romano', capacity: 14000 },
  'antequera': { name: 'El Maulí', capacity: 6000 },
  'atletico-baleares': { name: 'Estadi Balear', capacity: 7000 },
  'celta-b': { name: 'Campos de Abegondo', capacity: 5000 },
  'deportivo-b': { name: 'Campos de Abegondo', capacity: 5000 },
  'real-sociedad-b': { name: 'Zubieta', capacity: 4000 },
  'athletic-club-b': { name: 'Lezama', capacity: 3000 },
  'barcelona-b': { name: 'Johan Cruyff', capacity: 6000 },
  'real-madrid-castilla': { name: 'Alfredo Di Stéfano', capacity: 6000 },
  'villarreal-b': { name: 'Mini Estadi', capacity: 5000 },
  'betis-deportivo': { name: 'Luis del Sol', capacity: 4000 },
  'sevilla-atletico': { name: 'Jesús Navas', capacity: 8000 },
  
  // === 2ª RFEF (principales) ===
  'talavera': { name: 'El Prado', capacity: 7000 },
  'badajoz': { name: 'Nuevo Vivero', capacity: 13000 },
  'xerez': { name: 'Chapín', capacity: 20000 },
  'linares': { name: 'Linarejos', capacity: 10000 },
  'intercity': { name: 'Antonio Solana', capacity: 5000 },
  'hercules': { name: 'Rico Pérez', capacity: 30000 },
  'ponferradina': { name: 'El Toralín', capacity: 9000 },
  'aviles': { name: 'Suárez Puerta', capacity: 6000 },
  'tudelano': { name: 'Ciudad de Tudela', capacity: 4000 },
  
  // === PREMIER LEAGUE ===
  'manchester-city': { name: 'Etihad Stadium', capacity: 54000 },
  'arsenal': { name: 'Emirates Stadium', capacity: 60000 },
  'liverpool': { name: 'Anfield', capacity: 61000 },
  'manchester-united': { name: 'Old Trafford', capacity: 75000 },
  'chelsea': { name: 'Stamford Bridge', capacity: 42000 },
  'tottenham': { name: 'Tottenham Hotspur Stadium', capacity: 63000 },
  'newcastle': { name: "St. James' Park", capacity: 52000 },
  'aston-villa': { name: 'Villa Park', capacity: 43000 },
  'brighton': { name: 'Amex Stadium', capacity: 32000 },
  'west-ham': { name: 'London Stadium', capacity: 62000 },
  'everton': { name: 'Goodison Park', capacity: 40000 },
  'crystal-palace': { name: 'Selhurst Park', capacity: 26000 },
  'fulham': { name: 'Craven Cottage', capacity: 25000 },
  'brentford': { name: 'Gtech Community Stadium', capacity: 17000 },
  'nottingham-forest': { name: 'City Ground', capacity: 30000 },
  'bournemouth': { name: 'Vitality Stadium', capacity: 11000 },
  'wolves': { name: 'Molineux', capacity: 32000 },
  'leicester': { name: 'King Power Stadium', capacity: 32000 },
  'ipswich': { name: 'Portman Road', capacity: 30000 },
  'southampton': { name: "St. Mary's Stadium", capacity: 32000 },
  
  // === SERIE A ===
  'inter': { name: 'San Siro', capacity: 75000 },
  'milan': { name: 'San Siro', capacity: 75000 },
  'juventus': { name: 'Allianz Stadium', capacity: 41000 },
  'napoli': { name: 'Diego Armando Maradona', capacity: 55000 },
  'roma': { name: 'Stadio Olimpico', capacity: 73000 },
  'lazio': { name: 'Stadio Olimpico', capacity: 73000 },
  'atalanta': { name: 'Gewiss Stadium', capacity: 24000 },
  'fiorentina': { name: 'Artemio Franchi', capacity: 43000 },
  'bologna': { name: 'Renato Dall\'Ara', capacity: 39000 },
  'torino': { name: 'Stadio Olimpico Grande Torino', capacity: 28000 },
  
  // === BUNDESLIGA ===
  'bayern-munich': { name: 'Allianz Arena', capacity: 75000 },
  'borussia-dortmund': { name: 'Signal Iduna Park', capacity: 81000 },
  'rb-leipzig': { name: 'Red Bull Arena', capacity: 47000 },
  'bayer-leverkusen': { name: 'BayArena', capacity: 30000 },
  'eintracht-frankfurt': { name: 'Deutsche Bank Park', capacity: 51000 },
  'wolfsburg': { name: 'Volkswagen Arena', capacity: 30000 },
  'borussia-mgladbach': { name: 'Borussia-Park', capacity: 54000 },
  'freiburg': { name: 'Europa-Park Stadion', capacity: 35000 },
  'hoffenheim': { name: 'PreZero Arena', capacity: 30000 },
  'mainz': { name: 'Mewa Arena', capacity: 33000 },
  
  // === LIGUE 1 ===
  'psg': { name: 'Parc des Princes', capacity: 48000 },
  'marseille': { name: 'Vélodrome', capacity: 67000 },
  'lyon': { name: 'Groupama Stadium', capacity: 59000 },
  'monaco': { name: 'Stade Louis II', capacity: 18000 },
  'lille': { name: 'Stade Pierre-Mauroy', capacity: 50000 },
  'nice': { name: 'Allianz Riviera', capacity: 36000 },
  'lens': { name: 'Stade Bollaert-Delelis', capacity: 38000 },
  'rennes': { name: 'Roazhon Park', capacity: 30000 },
  'strasbourg': { name: 'Stade de la Meinau', capacity: 26000 },
  'nantes': { name: 'Stade de la Beaujoire', capacity: 37000 },
};

/**
 * Obtiene la capacidad del estadio de un equipo
 * @param {string} teamId - ID del equipo
 * @param {number} teamReputation - Reputación del equipo (fallback)
 * @returns {object} { name, capacity }
 */
export function getStadiumInfo(teamId, teamReputation = 50) {
  const stadium = STADIUM_CAPACITIES[teamId];
  
  if (stadium) {
    return stadium;
  }
  
  // Fallback basado en reputación
  if (teamReputation >= 90) return { name: 'Estadio Legendario', capacity: 80000 };
  if (teamReputation >= 75) return { name: 'Estadio Élite', capacity: 55000 };
  if (teamReputation >= 60) return { name: 'Estadio Grande', capacity: 35000 };
  if (teamReputation >= 45) return { name: 'Estadio Moderno', capacity: 18000 };
  return { name: 'Estadio Municipal', capacity: 8000 };
}

/**
 * Obtiene el nivel de estadio para una capacidad dada
 * @param {number} capacity 
 * @returns {number} nivel 0-4
 */
export function getStadiumLevel(capacity) {
  if (capacity >= 70000) return 4; // Legendario
  if (capacity >= 45000) return 3; // Élite
  if (capacity >= 25000) return 2; // Grande
  if (capacity >= 12000) return 1; // Moderno
  return 0; // Municipal
}
