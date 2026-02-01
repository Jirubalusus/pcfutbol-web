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

  // ============================================================
  // SOUTH AMERICA
  // ============================================================

  // === ARGENTINA ===
  'club-atletico-river-plate': { name: 'Estadio Monumental', capacity: 84567 },
  'club-atletico-boca-juniors': { name: 'La Bombonera', capacity: 54000 },
  'racing-club': { name: 'Cilindro de Avellaneda', capacity: 51389 },
  'club-atletico-independiente': { name: 'Libertadores de América', capacity: 48069 },
  'club-atletico-san-lorenzo-de-almagro': { name: 'Nuevo Gasómetro', capacity: 48000 },
  'club-atletico-velez-sarsfield': { name: 'José Amalfitani', capacity: 49540 },
  'club-atletico-huracan': { name: 'Tomás Adolfo Ducó', capacity: 48314 },
  'club-estudiantes-de-la-plata': { name: 'Jorge Luis Hirschi', capacity: 30018 },
  'club-atletico-rosario-central': { name: 'Gigante de Arroyito', capacity: 41654 },
  'club-atletico-newells-old-boys': { name: 'Marcelo Bielsa', capacity: 42000 },
  'club-atletico-talleres': { name: 'Mario Alberto Kempes', capacity: 57000 },
  'club-atletico-lanus': { name: 'La Fortaleza', capacity: 47027 },
  'ca-belgrano': { name: 'Julio César Villagra', capacity: 34000 },
  'argentinos-juniors': { name: 'Diego Armando Maradona', capacity: 26000 },
  'defensa-y-justicia': { name: 'Norberto Tomaghello', capacity: 18000 },
  'club-atletico-tigre': { name: 'José Dellagiovanna', capacity: 26282 },
  'club-atletico-platense': { name: 'Ciudad de Vicente López', capacity: 28000 },
  'club-atletico-union': { name: '15 de Abril', capacity: 27000 },
  'club-de-gimnasia-y-esgrima-la-plata': { name: 'Juan C. Zerillo', capacity: 33000 },
  'club-atletico-banfield': { name: 'Florencio Sola', capacity: 34901 },
  'club-atletico-tucuman': { name: 'Monumental José Fierro', capacity: 35200 },
  'instituto-ac-cordoba': { name: 'Juan Domingo Perón', capacity: 30000 },
  'independiente-rivadavia': { name: 'Bautista Gargantini', capacity: 25000 },
  'club-atletico-barracas-central': { name: 'Claudio Chiqui Tapia', capacity: 18000 },
  'gimnasia-y-esgrima-de-mendoza': { name: 'Víctor Antonio Legrotaglie', capacity: 20000 },
  'club-atletico-sarmiento-junin-': { name: 'Eva Perón', capacity: 25000 },
  'cd-riestra': { name: 'Guillermo Laza', capacity: 10000 },
  'club-atletico-aldosivi': { name: 'José María Minella', capacity: 35354 },
  'aa-estudiantes-de-rio-cuarto': { name: 'Ciudad de Río Cuarto', capacity: 14000 },
  'club-atletico-central-cordoba-sde-': { name: 'Alfredo Terrera', capacity: 30000 },

  // === BRASIL ===
  'flamengo-rio-de-janeiro': { name: 'Maracanã', capacity: 78838 },
  'se-palmeiras-sao-paulo': { name: 'Allianz Parque', capacity: 44000 },
  'corinthians-sao-paulo': { name: 'Neo Química Arena', capacity: 49205 },
  'fc-sao-paulo': { name: 'Morumbi', capacity: 66795 },
  'vasco-da-gama-rio-de-janeiro': { name: 'São Januário', capacity: 21880 },
  'fluminense-rio-de-janeiro': { name: 'Maracanã', capacity: 78838 },
  'botafogo-rio-de-janeiro': { name: 'Nilton Santos', capacity: 46931 },
  'clube-atletico-mineiro': { name: 'Arena MRV', capacity: 46000 },
  'gremio-porto-alegre': { name: 'Arena do Grêmio', capacity: 60540 },
  'sc-internacional-porto-alegre': { name: 'Beira-Rio', capacity: 50128 },
  'ec-cruzeiro-belo-horizonte': { name: 'Mineirão', capacity: 61846 },
  'esporte-clube-bahia': { name: 'Arena Fonte Nova', capacity: 50025 },
  'fc-santos': { name: 'Vila Belmiro', capacity: 16068 },
  'club-athletico-paranaense': { name: 'Arena da Baixada', capacity: 42372 },
  'red-bull-bragantino': { name: 'Nabi Abi Chedid', capacity: 17728 },
  'esporte-clube-vitoria': { name: 'Barradão', capacity: 36000 },
  'coritiba-fc': { name: 'Couto Pereira', capacity: 40502 },
  'chapecoense': { name: 'Arena Condá', capacity: 22600 },
  'clube-do-remo-pa-': { name: 'Baenão', capacity: 16200 },
  'mirassol-futebol-clube-sp-': { name: 'José Maria de Campos Maia', capacity: 15000 },

  // === COLOMBIA ===
  'atletico-nacional': { name: 'Atanasio Girardot', capacity: 45943 },
  'millonarios-fc': { name: 'El Campín', capacity: 36343 },
  'cd-america-de-cali': { name: 'Estadio Pascual Guerrero', capacity: 36000 },
  'junior-fc': { name: 'Estadio Metropolitano', capacity: 50000 },
  'independiente-medellin': { name: 'Atanasio Girardot', capacity: 45943 },
  'independiente-santa-fe': { name: 'El Campín', capacity: 36343 },
  'deportivo-cali': { name: 'Estadio Deportivo Cali', capacity: 60000 },
  'deportes-tolima': { name: 'Manuel Murillo Toro', capacity: 27000 },
  'once-caldas': { name: 'Palogrande', capacity: 31000 },
  'atletico-bucaramanga': { name: 'Alfonso López', capacity: 28000 },

  // === CHILE ===
  'club-universidad-de-chile': { name: 'Estadio Nacional', capacity: 48665 },
  'csd-colo-colo': { name: 'Estadio Monumental David Arellano', capacity: 47000 },
  'cd-universidad-catolica': { name: 'San Carlos de Apoquindo', capacity: 15000 },
  'cd-ohiggins': { name: 'El Teniente', capacity: 14000 },
  'coquimbo-unido': { name: 'Francisco Sánchez Rumoroso', capacity: 18750 },

  // === URUGUAY ===
  'ca-penarol': { name: 'Campeón del Siglo', capacity: 40000 },
  'club-nacional': { name: 'Gran Parque Central', capacity: 34000 },
  'defensor-sc': { name: 'Estadio Luis Franzini', capacity: 18000 },
  'liverpool-fc-montevideo': { name: 'Belvedere', capacity: 12000 },
  'ca-boston-river': { name: 'Tróccoli', capacity: 10000 },

  // === ECUADOR ===
  'independiente-del-valle': { name: 'Banco Guayaquil', capacity: 12000 },
  'barcelona-sc-guayaquil': { name: 'Estadio Monumental Isidro Romero', capacity: 59283 },
  'ldu-quito': { name: 'Estadio Rodrigo Paz Delgado', capacity: 41575 },
  'cd-universidad-catolica': { name: 'Estadio Olímpico Atahualpa', capacity: 35258 },
  'orense-sc': { name: 'Estadio 9 de Mayo', capacity: 18000 },

  // === PARAGUAY ===
  'club-cerro-porteno': { name: 'Nuevo Olla', capacity: 45000 },
  'olimpia-asuncion': { name: 'Manuel Ferreira', capacity: 25000 },
  'club-libertad-asuncion': { name: 'Dr. Nicolás Leoz', capacity: 12000 },
  'club-guarani': { name: 'Rogelio Livieres', capacity: 12000 },
  'club-nacional-asuncion': { name: 'Arsenio Erico', capacity: 15000 },

  // === PERÚ ===
  'club-alianza-lima': { name: 'Estadio Alejandro Villanueva', capacity: 35000 },
  'universitario-de-deportes': { name: 'Estadio Monumental', capacity: 80093 },
  'club-sporting-cristal': { name: 'Estadio Alberto Gallardo', capacity: 18000 },
  'fbc-melgar': { name: 'Estadio de la UNSA', capacity: 45000 },
  'cusco-fc': { name: 'Inca Garcilaso de la Vega', capacity: 42056 },

  // === BOLIVIA ===
  'bolivar-la-paz': { name: 'Hernando Siles', capacity: 42000 },
  'the-strongest-la-paz': { name: 'Hernando Siles', capacity: 42000 },
  'club-always-ready': { name: 'Estadio Municipal de El Alto', capacity: 25000 },
  'blooming-santa-cruz': { name: 'Ramón Tahuichi Aguilera', capacity: 38000 },
  'club-deportivo-guabira': { name: 'Gilberto Parada', capacity: 18000 },

  // === VENEZUELA ===
  'deportivo-tachira': { name: 'Pueblo Nuevo', capacity: 38755 },
  'caracas-fc': { name: 'Estadio Olímpico de la UCV', capacity: 25354 },
  'deportivo-la-guaira': { name: 'Estadio Olímpico de la UCV', capacity: 25354 },
  'carabobo-fc': { name: 'Misael Delgado', capacity: 15000 },
  'academia-puerto-cabello': { name: 'José Antonio Páez', capacity: 10000 },
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
