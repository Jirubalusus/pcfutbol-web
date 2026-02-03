// ============================================================
// POSITION NAMES — Sistema de traducción multiidioma
// Estilo PC Fútbol clásico
// ============================================================

// Posiciones base en inglés (formato interno)
const BASE_POSITIONS = {
  GK: 'GK',   // Goalkeeper / Portero
  CB: 'CB',   // Center Back / Defensa Central
  RB: 'RB',   // Right Back / Lateral Derecho
  LB: 'LB',   // Left Back / Lateral Izquierdo
  RWB: 'RWB', // Right Wing Back / Carrilero Derecho
  LWB: 'LWB', // Left Wing Back / Carrilero Izquierdo
  CDM: 'CDM', // Central Defensive Midfielder / Mediocentro Defensivo
  CM: 'CM',   // Central Midfielder / Mediocentro
  CAM: 'CAM', // Central Attacking Midfielder / Mediocentro Ofensivo
  RM: 'RM',   // Right Midfielder / Medio Derecho
  LM: 'LM',   // Left Midfielder / Medio Izquierdo
  RW: 'RW',   // Right Wing / Extremo Derecho
  LW: 'LW',   // Left Wing / Extremo Izquierdo
  ST: 'ST',   // Striker / Delantero Centro
  CF: 'CF',   // Center Forward / Segunda Delantero
};

// Mapas de traducción por idioma
const POSITIONS = {
  es: { // Español
    GK: 'POR', CB: 'DFC', RB: 'LD', LB: 'LI',
    RWB: 'CRD', LWB: 'CRI', CDM: 'MCD', CM: 'MC', CAM: 'MCO',
    RM: 'MD', LM: 'MI', RW: 'ED', LW: 'EI', ST: 'DC', CF: 'SD'
  },
  en: { // English
    GK: 'GK', CB: 'CB', RB: 'RB', LB: 'LB',
    RWB: 'RWB', LWB: 'LWB', CDM: 'CDM', CM: 'CM', CAM: 'CAM',
    RM: 'RM', LM: 'LM', RW: 'RW', LW: 'LW', ST: 'ST', CF: 'CF'
  },
  fr: { // Français
    GK: 'GAR', CB: 'DC', RB: 'DD', LB: 'DG',
    RWB: 'PDD', LWB: 'PDG', CDM: 'MDC', CM: 'MC', CAM: 'MOC',
    RM: 'MD', LM: 'MG', RW: 'AD', LW: 'AG', ST: 'AV', CF: 'BU'
  },
  de: { // Deutsch
    GK: 'TW', CB: 'IV', RB: 'RV', LB: 'LV',
    RWB: 'RSV', LWB: 'LSV', CDM: 'ZDM', CM: 'ZM', CAM: 'ZOM',
    RM: 'RM', LM: 'LM', RW: 'RA', LW: 'LA', ST: 'ST', CF: 'HS'
  },
  pt: { // Português
    GK: 'GR', CB: 'ZAG', RB: 'LD', LB: 'LE',
    RWB: 'ADD', LWB: 'ADE', CDM: 'VOL', CM: 'MC', CAM: 'MEI',
    RM: 'MD', LM: 'ME', RW: 'PD', LW: 'PE', ST: 'ATA', CF: 'SA'
  },
  it: { // Italiano
    GK: 'POR', CB: 'DC', RB: 'TD', LB: 'TS',
    RWB: 'EDD', LWB: 'EDS', CDM: 'MDI', CM: 'CC', CAM: 'TRQ',
    RM: 'ED', LM: 'ES', RW: 'AD', LW: 'AS', ST: 'ATT', CF: 'PUN'
  }
};

// Crear mapas inversos para cada idioma
const POSITION_REVERSE_MAPS = {};
Object.keys(POSITIONS).forEach(lang => {
  POSITION_REVERSE_MAPS[lang] = {};
  Object.entries(POSITIONS[lang]).forEach(([en, local]) => {
    POSITION_REVERSE_MAPS[lang][local] = en;
  });
});

// Aliases: posiciones antiguas/alternativas → inglés
const POS_ALIASES = {
  // Español antiguo
  LTD: 'RB', LTI: 'LB',       // antiguo: Lateral → ahora LD/LI
  MDD: 'RM', MDI: 'LM',       // antiguo: Medio Derecho/Izquierdo → ahora MD/MI
  EDD: 'RW', EDI: 'LW',       // antiguo: Extremo Derecho/Izquierdo → ahora ED/EI
  MP: 'CF',                   // antiguo: Media Punta → ahora SD
};

// Obtener idioma actual de localStorage o usar español por defecto
function getCurrentLanguage() {
  return localStorage.getItem('language') || 'es';
}

/**
 * Traduce una posición a un idioma específico para UI.
 * @param {string} pos - Posición en inglés o cualquier idioma (ej: "CB", "ST1", "DFC")
 * @param {string} targetLang - Idioma de destino ('es', 'en', 'fr', 'de', 'pt', 'it')
 * @returns {string} Posición traducida (ej: "DFC", "DC", "POR")
 */
export function translatePosition(pos, targetLang = getCurrentLanguage()) {
  if (!pos) return '';
  
  const clean = pos.replace(/\d+$/, '').toUpperCase();
  
  // Si ya está en inglés base, traducir directamente
  if (POSITIONS[targetLang] && POSITIONS[targetLang][clean]) {
    return POSITIONS[targetLang][clean];
  }
  
  // Intentar encontrar el inglés base desde cualquier idioma
  let englishPos = clean;
  
  // Buscar en aliases
  if (POS_ALIASES[clean]) {
    englishPos = POS_ALIASES[clean];
  } else {
    // Buscar en mapas inversos de todos los idiomas
    for (const lang of Object.keys(POSITION_REVERSE_MAPS)) {
      if (POSITION_REVERSE_MAPS[lang][clean]) {
        englishPos = POSITION_REVERSE_MAPS[lang][clean];
        break;
      }
    }
  }
  
  // Traducir al idioma de destino
  if (POSITIONS[targetLang] && POSITIONS[targetLang][englishPos]) {
    return POSITIONS[targetLang][englishPos];
  }
  
  return pos; // Si no se encuentra, devolver original
}

/**
 * Traduce una posición a español (retrocompatibilidad).
 * @param {string} pos - Posición en cualquier idioma
 * @returns {string} Posición en español
 */
export function posES(pos) {
  return translatePosition(pos, 'es');
}

/**
 * Normaliza cualquier posición a inglés base.
 * @param {string} pos - Posición en cualquier idioma
 * @returns {string} Posición en inglés base
 */
export function posToEN(pos) {
  if (!pos) return '';
  
  const clean = pos.replace(/\d+$/, '').toUpperCase();
  
  // Si ya es inglés base, devolver tal cual
  if (BASE_POSITIONS[clean]) return clean;
  
  // Buscar en aliases
  if (POS_ALIASES[clean]) {
    return POS_ALIASES[clean];
  }
  
  // Buscar en mapas inversos de todos los idiomas
  for (const lang of Object.keys(POSITION_REVERSE_MAPS)) {
    if (POSITION_REVERSE_MAPS[lang][clean]) {
      return POSITION_REVERSE_MAPS[lang][clean];
    }
  }
  
  return pos; // Si no se encuentra, devolver original
}

/**
 * Obtiene todas las posiciones en un idioma específico.
 * @param {string} lang - Código de idioma
 * @returns {Object} Mapa de posiciones {EN: LOCAL}
 */
export function getPositionsForLanguage(lang = getCurrentLanguage()) {
  return POSITIONS[lang] || POSITIONS.es;
}

// Exportar mapa español para retrocompatibilidad
export default POSITIONS.es;
