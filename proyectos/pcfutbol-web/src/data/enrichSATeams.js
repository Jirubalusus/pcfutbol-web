// ============================================================
// SOUTH AMERICAN TEAMS — Metadata Enrichment
// Adds missing fields (stadium, budget, reputation, etc.)
// so SA teams match the format of European team JSONs.
// Applied at load time in teamsFirestore.js
// ============================================================

import { getStadiumInfo, getStadiumLevel } from './stadiumCapacities';
import { getLeagueTier } from '../game/leagueTiers';

// ── SA league IDs ──
const SA_LEAGUES = new Set([
  'argentinaPrimera', 'brasileiraoA', 'colombiaPrimera', 'chilePrimera',
  'uruguayPrimera', 'ecuadorLigaPro', 'paraguayPrimera', 'peruLiga1',
  'boliviaPrimera', 'venezuelaPrimera'
]);

export function isSALeague(leagueId) {
  return SA_LEAGUES.has(leagueId);
}

// ============================================================
// TEAM METADATA LOOKUP
// city, shortName, colors for every SA team
// ============================================================

const SA_TEAM_META = {
  // ── ARGENTINA ──
  'club-atletico-river-plate':            { city: 'Buenos Aires', shortName: 'RIV', colors: { primary: '#FFFFFF', secondary: '#D2042D', accent: '#D2042D' } },
  'club-atletico-boca-juniors':           { city: 'Buenos Aires', shortName: 'BOC', colors: { primary: '#003DA5', secondary: '#FFD700', accent: '#003DA5' } },
  'racing-club':                          { city: 'Avellaneda', shortName: 'RAC', colors: { primary: '#6CACE4', secondary: '#FFFFFF', accent: '#6CACE4' } },
  'club-atletico-independiente':          { city: 'Avellaneda', shortName: 'IND', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'club-atletico-san-lorenzo-de-almagro': { city: 'Buenos Aires', shortName: 'SLO', colors: { primary: '#D2042D', secondary: '#00205B', accent: '#D2042D' } },
  'club-atletico-velez-sarsfield':        { city: 'Buenos Aires', shortName: 'VEL', colors: { primary: '#FFFFFF', secondary: '#002F6C', accent: '#002F6C' } },
  'club-atletico-huracan':               { city: 'Buenos Aires', shortName: 'HUR', colors: { primary: '#FFFFFF', secondary: '#D2042D', accent: '#002F6C' } },
  'club-estudiantes-de-la-plata':         { city: 'La Plata', shortName: 'EDL', colors: { primary: '#FFFFFF', secondary: '#D2042D', accent: '#D2042D' } },
  'club-atletico-rosario-central':        { city: 'Rosario', shortName: 'ROC', colors: { primary: '#003DA5', secondary: '#FFD700', accent: '#003DA5' } },
  'club-atletico-newells-old-boys':       { city: 'Rosario', shortName: 'NOB', colors: { primary: '#D2042D', secondary: '#000000', accent: '#D2042D' } },
  'club-atletico-talleres':               { city: 'Córdoba', shortName: 'TAL', colors: { primary: '#002F6C', secondary: '#FFFFFF', accent: '#002F6C' } },
  'club-atletico-lanus':                  { city: 'Lanús', shortName: 'LAN', colors: { primary: '#800020', secondary: '#FFFFFF', accent: '#800020' } },
  'ca-belgrano':                          { city: 'Córdoba', shortName: 'BEL', colors: { primary: '#6CACE4', secondary: '#FFFFFF', accent: '#6CACE4' } },
  'argentinos-juniors':                   { city: 'Buenos Aires', shortName: 'ARJ', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'defensa-y-justicia':                   { city: 'Florencio Varela', shortName: 'DYJ', colors: { primary: '#FFD700', secondary: '#228B22', accent: '#228B22' } },
  'club-atletico-tigre':                  { city: 'Victoria', shortName: 'TIG', colors: { primary: '#003DA5', secondary: '#D2042D', accent: '#003DA5' } },
  'club-atletico-platense':               { city: 'Buenos Aires', shortName: 'PLA', colors: { primary: '#8B4513', secondary: '#FFFFFF', accent: '#8B4513' } },
  'club-atletico-union':                  { city: 'Santa Fe', shortName: 'UNI', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'club-de-gimnasia-y-esgrima-la-plata':  { city: 'La Plata', shortName: 'GLP', colors: { primary: '#002F6C', secondary: '#FFFFFF', accent: '#002F6C' } },
  'club-atletico-banfield':               { city: 'Banfield', shortName: 'BAN', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'club-atletico-tucuman':                { city: 'Tucumán', shortName: 'ATU', colors: { primary: '#6CACE4', secondary: '#FFFFFF', accent: '#6CACE4' } },
  'instituto-ac-cordoba':                 { city: 'Córdoba', shortName: 'INS', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'independiente-rivadavia':              { city: 'Mendoza', shortName: 'IRV', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'club-atletico-barracas-central':       { city: 'Buenos Aires', shortName: 'BAR', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#000000' } },
  'gimnasia-y-esgrima-de-mendoza':        { city: 'Mendoza', shortName: 'GEM', colors: { primary: '#FFFFFF', secondary: '#000000', accent: '#FFD700' } },
  'club-atletico-sarmiento-junin-':       { city: 'Junín', shortName: 'SAR', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'cd-riestra':                           { city: 'Buenos Aires', shortName: 'RIE', colors: { primary: '#D2042D', secondary: '#000000', accent: '#FFFFFF' } },
  'club-atletico-aldosivi':               { city: 'Mar del Plata', shortName: 'ALD', colors: { primary: '#006B3F', secondary: '#FFD700', accent: '#006B3F' } },
  'aa-estudiantes-de-rio-cuarto':         { city: 'Río Cuarto', shortName: 'ERC', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'club-atletico-central-cordoba-sde-':   { city: 'Santiago del Estero', shortName: 'CCS', colors: { primary: '#000000', secondary: '#FFD700', accent: '#000000' } },

  // ── BRASIL ──
  'flamengo-rio-de-janeiro':              { city: 'Río de Janeiro', shortName: 'FLA', colors: { primary: '#D2042D', secondary: '#000000', accent: '#D2042D' } },
  'se-palmeiras-sao-paulo':               { city: 'São Paulo', shortName: 'PAL', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'corinthians-sao-paulo':                { city: 'São Paulo', shortName: 'COR', colors: { primary: '#000000', secondary: '#FFFFFF', accent: '#000000' } },
  'fc-sao-paulo':                         { city: 'São Paulo', shortName: 'SAO', colors: { primary: '#FFFFFF', secondary: '#D2042D', accent: '#000000' } },
  'vasco-da-gama-rio-de-janeiro':         { city: 'Río de Janeiro', shortName: 'VAS', colors: { primary: '#000000', secondary: '#FFFFFF', accent: '#D2042D' } },
  'fluminense-rio-de-janeiro':            { city: 'Río de Janeiro', shortName: 'FLU', colors: { primary: '#800020', secondary: '#006B3F', accent: '#FFFFFF' } },
  'botafogo-rio-de-janeiro':              { city: 'Río de Janeiro', shortName: 'BOT', colors: { primary: '#000000', secondary: '#FFFFFF', accent: '#000000' } },
  'clube-atletico-mineiro':               { city: 'Belo Horizonte', shortName: 'CAM', colors: { primary: '#000000', secondary: '#FFFFFF', accent: '#000000' } },
  'gremio-porto-alegre':                  { city: 'Porto Alegre', shortName: 'GRE', colors: { primary: '#003DA5', secondary: '#000000', accent: '#FFFFFF' } },
  'sc-internacional-porto-alegre':        { city: 'Porto Alegre', shortName: 'INT', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'ec-cruzeiro-belo-horizonte':           { city: 'Belo Horizonte', shortName: 'CRU', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'esporte-clube-bahia':                  { city: 'Salvador', shortName: 'BAH', colors: { primary: '#003DA5', secondary: '#D2042D', accent: '#FFFFFF' } },
  'fc-santos':                            { city: 'Santos', shortName: 'SAN', colors: { primary: '#FFFFFF', secondary: '#000000', accent: '#FFFFFF' } },
  'club-athletico-paranaense':            { city: 'Curitiba', shortName: 'CAP', colors: { primary: '#D2042D', secondary: '#000000', accent: '#D2042D' } },
  'red-bull-bragantino':                  { city: 'Bragança Paulista', shortName: 'BRA', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'esporte-clube-vitoria':                { city: 'Salvador', shortName: 'VIT', colors: { primary: '#D2042D', secondary: '#000000', accent: '#D2042D' } },
  'coritiba-fc':                          { city: 'Curitiba', shortName: 'CFC', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'chapecoense':                          { city: 'Chapecó', shortName: 'CHA', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'clube-do-remo-pa-':                    { city: 'Belém', shortName: 'REM', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'mirassol-futebol-clube-sp-':           { city: 'Mirassol', shortName: 'MIR', colors: { primary: '#FFD700', secondary: '#006B3F', accent: '#000000' } },

  // ── COLOMBIA ──
  'atletico-nacional':                    { city: 'Medellín', shortName: 'NAL', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'millonarios-fc':                       { city: 'Bogotá', shortName: 'MIL', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'cd-america-de-cali':                   { city: 'Cali', shortName: 'AME', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'junior-fc':                            { city: 'Barranquilla', shortName: 'JUN', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#003DA5' } },
  'independiente-medellin':               { city: 'Medellín', shortName: 'DIM', colors: { primary: '#D2042D', secondary: '#003DA5', accent: '#D2042D' } },
  'independiente-santa-fe':               { city: 'Bogotá', shortName: 'ISF', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'deportivo-cali':                       { city: 'Cali', shortName: 'DCA', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'deportes-tolima':                      { city: 'Ibagué', shortName: 'TOL', colors: { primary: '#800020', secondary: '#FFD700', accent: '#800020' } },
  'once-caldas':                          { city: 'Manizales', shortName: 'ONC', colors: { primary: '#FFFFFF', secondary: '#006B3F', accent: '#006B3F' } },
  'atletico-bucaramanga':                 { city: 'Bucaramanga', shortName: 'BUC', colors: { primary: '#FFD700', secondary: '#006B3F', accent: '#FFD700' } },
  'rionegro-aguilas':                     { city: 'Rionegro', shortName: 'RIO', colors: { primary: '#FFD700', secondary: '#000000', accent: '#FFD700' } },
  'cd-la-equidad-seguros-sa':             { city: 'Bogotá', shortName: 'EQU', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'deportivo-pereira':                    { city: 'Pereira', shortName: 'PER', colors: { primary: '#D2042D', secondary: '#FFD700', accent: '#D2042D' } },
  'llaneros-fc':                          { city: 'Villavicencio', shortName: 'LLA', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'ad-union-magdalena':                   { city: 'Santa Marta', shortName: 'UMG', colors: { primary: '#003DA5', secondary: '#FFD700', accent: '#D2042D' } },
  'deportivo-pasto':                      { city: 'Pasto', shortName: 'PAS', colors: { primary: '#D2042D', secondary: '#003DA5', accent: '#FFFFFF' } },
  'alianza-petrolera':                    { city: 'Barrancabermeja', shortName: 'APE', colors: { primary: '#006B3F', secondary: '#FFD700', accent: '#006B3F' } },
  'envigado-fc':                          { city: 'Envigado', shortName: 'ENV', colors: { primary: '#FF8C00', secondary: '#006B3F', accent: '#FF8C00' } },
  'boyaca-chico-fc':                      { city: 'Tunja', shortName: 'BOY', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'fortaleza-ceif':                       { city: 'Bogotá', shortName: 'FOR', colors: { primary: '#D2042D', secondary: '#003DA5', accent: '#FFFFFF' } },

  // ── CHILE ──
  'club-universidad-de-chile':            { city: 'Santiago', shortName: 'UCH', colors: { primary: '#003DA5', secondary: '#D2042D', accent: '#003DA5' } },
  'csd-colo-colo':                        { city: 'Santiago', shortName: 'COL', colors: { primary: '#FFFFFF', secondary: '#000000', accent: '#FFFFFF' } },
  'cd-universidad-catolica':              { city: 'Santiago', shortName: 'UCA', colors: { primary: '#FFFFFF', secondary: '#003DA5', accent: '#D2042D' } },
  'cd-ohiggins':                          { city: 'Rancagua', shortName: 'OHI', colors: { primary: '#6CACE4', secondary: '#FFFFFF', accent: '#6CACE4' } },
  'coquimbo-unido':                       { city: 'Coquimbo', shortName: 'COQ', colors: { primary: '#FFD700', secondary: '#000000', accent: '#FFD700' } },
  'audax-italiano':                       { city: 'Santiago', shortName: 'AUD', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'universidad-concepcion':               { city: 'Concepción', shortName: 'UDE', colors: { primary: '#FFD700', secondary: '#000000', accent: '#FFD700' } },
  'cd-palestino':                         { city: 'Santiago', shortName: 'PAL', colors: { primary: '#FFFFFF', secondary: '#006B3F', accent: '#D2042D' } },
  'cd-everton':                           { city: 'Viña del Mar', shortName: 'EVE', colors: { primary: '#003DA5', secondary: '#FFD700', accent: '#003DA5' } },
  'huachipato-fc':                        { city: 'Talcahuano', shortName: 'HUA', colors: { primary: '#003DA5', secondary: '#000000', accent: '#003DA5' } },
  'club-de-deportes-limache':             { city: 'Limache', shortName: 'LIM', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'deportes-la-serena':                   { city: 'La Serena', shortName: 'SER', colors: { primary: '#D2042D', secondary: '#FFD700', accent: '#D2042D' } },
  'cd-nublense':                          { city: 'Chillán', shortName: 'NUB', colors: { primary: '#D2042D', secondary: '#000000', accent: '#D2042D' } },
  'deportes-concepcion':                  { city: 'Concepción', shortName: 'DCC', colors: { primary: '#800080', secondary: '#FFFFFF', accent: '#800080' } },
  'union-la-calera':                      { city: 'La Calera', shortName: 'ULC', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'cd-cobresal':                          { city: 'El Salvador', shortName: 'COB', colors: { primary: '#FF8C00', secondary: '#000000', accent: '#FF8C00' } },

  // ── URUGUAY ──
  'ca-penarol':                           { city: 'Montevideo', shortName: 'PEÑ', colors: { primary: '#FFD700', secondary: '#000000', accent: '#FFD700' } },
  'club-nacional':                        { city: 'Montevideo', shortName: 'NAC', colors: { primary: '#FFFFFF', secondary: '#003DA5', accent: '#D2042D' } },
  'defensor-sc':                          { city: 'Montevideo', shortName: 'DEF', colors: { primary: '#800080', secondary: '#FFFFFF', accent: '#800080' } },
  'liverpool-fc-montevideo':              { city: 'Montevideo', shortName: 'LIV', colors: { primary: '#000000', secondary: '#003DA5', accent: '#000000' } },
  'ca-boston-river':                       { city: 'Montevideo', shortName: 'BOS', colors: { primary: '#D2042D', secondary: '#FFD700', accent: '#D2042D' } },
  'juventud-de-las-piedras':              { city: 'Las Piedras', shortName: 'JUV', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'montevideo-city-torque':               { city: 'Montevideo', shortName: 'MCT', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'racing-club-de-montevideo':            { city: 'Montevideo', shortName: 'RCM', colors: { primary: '#6CACE4', secondary: '#FFFFFF', accent: '#6CACE4' } },
  'cd-maldonado':                         { city: 'Maldonado', shortName: 'MAL', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'montevideo-wanderers':                 { city: 'Montevideo', shortName: 'WAN', colors: { primary: '#000000', secondary: '#FFFFFF', accent: '#000000' } },
  'albion-fc':                            { city: 'Montevideo', shortName: 'ALB', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'cerro-largo-fc':                       { city: 'Melo', shortName: 'CLA', colors: { primary: '#FFD700', secondary: '#003DA5', accent: '#FFD700' } },
  'ca-progreso':                          { city: 'Montevideo', shortName: 'PRO', colors: { primary: '#FFD700', secondary: '#D2042D', accent: '#FFD700' } },
  'danubio-fc':                           { city: 'Montevideo', shortName: 'DAN', colors: { primary: '#FFFFFF', secondary: '#D2042D', accent: '#003DA5' } },
  'central-espanol':                      { city: 'Montevideo', shortName: 'CEP', colors: { primary: '#D2042D', secondary: '#003DA5', accent: '#D2042D' } },
  'ca-cerro':                             { city: 'Montevideo', shortName: 'CER', colors: { primary: '#003DA5', secondary: '#FFD700', accent: '#003DA5' } },

  // ── ECUADOR ──
  'independiente-del-valle':              { city: 'Sangolquí', shortName: 'IDV', colors: { primary: '#000000', secondary: '#D2042D', accent: '#FFD700' } },
  'barcelona-sc-guayaquil':               { city: 'Guayaquil', shortName: 'BSC', colors: { primary: '#FFD700', secondary: '#000000', accent: '#FFD700' } },
  'ldu-quito':                            { city: 'Quito', shortName: 'LDU', colors: { primary: '#FFFFFF', secondary: '#003DA5', accent: '#D2042D' } },
  'cd-universidad-catolica':              { city: 'Quito', shortName: 'UCE', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'orense-sc':                            { city: 'Machala', shortName: 'ORE', colors: { primary: '#FFD700', secondary: '#003DA5', accent: '#FFD700' } },
  'sd-aucas':                             { city: 'Quito', shortName: 'AUC', colors: { primary: '#FFD700', secondary: '#D2042D', accent: '#FFD700' } },
  'cd-macara':                            { city: 'Ambato', shortName: 'MAC', colors: { primary: '#6CACE4', secondary: '#FFFFFF', accent: '#6CACE4' } },
  'deportivo-cuenca':                     { city: 'Cuenca', shortName: 'DCU', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'manta-fc':                             { city: 'Manta', shortName: 'MAN', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'cs-emelec':                            { city: 'Guayaquil', shortName: 'EME', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'mushuc-runa-sc':                       { city: 'Ambato', shortName: 'MUS', colors: { primary: '#800080', secondary: '#FFFFFF', accent: '#800080' } },
  'delfin-sc':                            { city: 'Manta', shortName: 'DEL', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#D2042D' } },
  'club-leones-del-norte':                { city: 'Tulcán', shortName: 'LDN', colors: { primary: '#D2042D', secondary: '#000000', accent: '#D2042D' } },
  'guayaquil-city-fc':                    { city: 'Guayaquil', shortName: 'GCF', colors: { primary: '#003DA5', secondary: '#FFD700', accent: '#003DA5' } },
  'libertad-fc':                          { city: 'Loja', shortName: 'LIB', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'tecnico-universitario':                { city: 'Ambato', shortName: 'TUN', colors: { primary: '#800020', secondary: '#FFFFFF', accent: '#800020' } },

  // ── PARAGUAY ──
  'club-cerro-porteno':                   { city: 'Asunción', shortName: 'CCP', colors: { primary: '#003DA5', secondary: '#D2042D', accent: '#003DA5' } },
  'olimpia-asuncion':                     { city: 'Asunción', shortName: 'OLI', colors: { primary: '#000000', secondary: '#FFFFFF', accent: '#000000' } },
  'club-libertad-asuncion':               { city: 'Asunción', shortName: 'LIB', colors: { primary: '#000000', secondary: '#FFFFFF', accent: '#000000' } },
  'club-guarani':                         { city: 'Asunción', shortName: 'GUA', colors: { primary: '#FFD700', secondary: '#000000', accent: '#FFD700' } },
  'club-nacional-asuncion':               { city: 'Asunción', shortName: 'NAC', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#003DA5' } },
  'club-sportivo-trinidense':             { city: 'Trinidad', shortName: 'TRI', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'sportivo-luqueno':                     { city: 'Luque', shortName: 'LUQ', colors: { primary: '#003DA5', secondary: '#FFD700', accent: '#003DA5' } },
  'sportivo-ameliano':                    { city: 'Asunción', shortName: 'AME', colors: { primary: '#D2042D', secondary: '#000000', accent: '#D2042D' } },
  'club-sportivo-2-de-mayo':              { city: 'Pedro Juan Caballero', shortName: '2DM', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'club-deportivo-recoleta':              { city: 'Asunción', shortName: 'REC', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'club-rubio-nu-asuncion-':              { city: 'Asunción', shortName: 'RUB', colors: { primary: '#D2042D', secondary: '#000000', accent: '#FFFFFF' } },
  'club-sportivo-san-lorenzo':            { city: 'San Lorenzo', shortName: 'SPL', colors: { primary: '#003DA5', secondary: '#D2042D', accent: '#003DA5' } },

  // ── PERÚ ──
  'club-alianza-lima':                    { city: 'Lima', shortName: 'ALI', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'universitario-de-deportes':            { city: 'Lima', shortName: 'UNI', colors: { primary: '#FFD700', secondary: '#D2042D', accent: '#FFD700' } },
  'club-sporting-cristal':                { city: 'Lima', shortName: 'CRI', colors: { primary: '#6CACE4', secondary: '#FFFFFF', accent: '#6CACE4' } },
  'fbc-melgar':                           { city: 'Arequipa', shortName: 'MEL', colors: { primary: '#D2042D', secondary: '#000000', accent: '#D2042D' } },
  'cusco-fc':                             { city: 'Cusco', shortName: 'CUS', colors: { primary: '#FFD700', secondary: '#D2042D', accent: '#FFD700' } },
  'sport-boys-association':               { city: 'Callao', shortName: 'SPB', colors: { primary: '#FF69B4', secondary: '#000000', accent: '#FF69B4' } },
  'deportivo-garcilaso':                  { city: 'Cusco', shortName: 'GAR', colors: { primary: '#D2042D', secondary: '#003DA5', accent: '#D2042D' } },
  'comerciantes-unidos':                  { city: 'Cutervo', shortName: 'COU', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'club-cienciano':                       { city: 'Cusco', shortName: 'CIE', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'sport-huancayo':                       { city: 'Huancayo', shortName: 'SHU', colors: { primary: '#D2042D', secondary: '#000000', accent: '#D2042D' } },
  'asociacion-deportiva-tarma':           { city: 'Tarma', shortName: 'ADT', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'club-atletico-grau':                   { city: 'Piura', shortName: 'GRA', colors: { primary: '#FFFFFF', secondary: '#003DA5', accent: '#D2042D' } },
  'utc-cajamarca':                        { city: 'Cajamarca', shortName: 'UTC', colors: { primary: '#003DA5', secondary: '#FFD700', accent: '#003DA5' } },
  'fc-cajamarca':                         { city: 'Cajamarca', shortName: 'FCC', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'cultural-santa-rosa':                  { city: 'Ayaviri', shortName: 'CSR', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'alianza-atletico-sullana':             { city: 'Sullana', shortName: 'AAS', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'club-juan-pablo-ii':                   { city: 'Chimbote', shortName: 'JPB', colors: { primary: '#FFFFFF', secondary: '#003DA5', accent: '#FFD700' } },
  'ucv-moquegua':                         { city: 'Moquegua', shortName: 'UCV', colors: { primary: '#003DA5', secondary: '#D2042D', accent: '#003DA5' } },

  // ── BOLIVIA ──
  'bolivar-la-paz':                       { city: 'La Paz', shortName: 'BOL', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'the-strongest-la-paz':                 { city: 'La Paz', shortName: 'STR', colors: { primary: '#FFD700', secondary: '#000000', accent: '#FFD700' } },
  'club-always-ready':                    { city: 'El Alto', shortName: 'ALR', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'blooming-santa-cruz':                  { city: 'Santa Cruz', shortName: 'BLO', colors: { primary: '#6CACE4', secondary: '#FFFFFF', accent: '#6CACE4' } },
  'club-deportivo-guabira':               { city: 'Montero', shortName: 'GBR', colors: { primary: '#FFD700', secondary: '#D2042D', accent: '#FFD700' } },
  'san-antonio-bulo':                     { city: 'Bulo Bulo', shortName: 'SAB', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'ca-nacional-potosi':                   { city: 'Potosí', shortName: 'NAP', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'cd-oriente-petrolero':                 { city: 'Santa Cruz', shortName: 'ORI', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'gualberto-villarroel-san-jose':        { city: 'Oruro', shortName: 'SJO', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'real-oruro':                           { city: 'Oruro', shortName: 'ROR', colors: { primary: '#D2042D', secondary: '#003DA5', accent: '#D2042D' } },
  'club-a-b-b-':                          { city: 'Cochabamba', shortName: 'ABB', colors: { primary: '#003DA5', secondary: '#FFFFFF', accent: '#003DA5' } },
  'universitario-de-vinto':               { city: 'Vinto', shortName: 'UDV', colors: { primary: '#D2042D', secondary: '#FFD700', accent: '#D2042D' } },
  'cd-real-tomayapo':                     { city: 'Tarija', shortName: 'TOM', colors: { primary: '#D2042D', secondary: '#000000', accent: '#FFFFFF' } },
  'club-aurora':                          { city: 'Cochabamba', shortName: 'AUR', colors: { primary: '#003DA5', secondary: '#6CACE4', accent: '#003DA5' } },
  'club-independiente-petrolero':         { city: 'Sucre', shortName: 'CIP', colors: { primary: '#006B3F', secondary: '#FFFFFF', accent: '#006B3F' } },
  'real-potosi':                          { city: 'Potosí', shortName: 'RPO', colors: { primary: '#800020', secondary: '#FFFFFF', accent: '#800020' } },

  // ── VENEZUELA ──
  'deportivo-tachira':                    { city: 'San Cristóbal', shortName: 'TAC', colors: { primary: '#FFD700', secondary: '#000000', accent: '#FFD700' } },
  'caracas-fc':                           { city: 'Caracas', shortName: 'CCS', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#D2042D' } },
  'deportivo-la-guaira':                  { city: 'La Guaira', shortName: 'DLG', colors: { primary: '#FF8C00', secondary: '#000000', accent: '#FF8C00' } },
  'carabobo-fc':                          { city: 'Valencia', shortName: 'CAR', colors: { primary: '#800020', secondary: '#FFD700', accent: '#800020' } },
  'academia-puerto-cabello':              { city: 'Puerto Cabello', shortName: 'APC', colors: { primary: '#D2042D', secondary: '#003DA5', accent: '#FFFFFF' } },
  'universidad-central-de-venezuela':     { city: 'Caracas', shortName: 'UCV', colors: { primary: '#006B3F', secondary: '#FFD700', accent: '#006B3F' } },
  'monagas-sc':                           { city: 'Maturín', shortName: 'MON', colors: { primary: '#003DA5', secondary: '#D2042D', accent: '#003DA5' } },
  'academia-anzoategui-fc':               { city: 'Puerto La Cruz', shortName: 'AAF', colors: { primary: '#000000', secondary: '#FFD700', accent: '#000000' } },
  'estudiantes-de-merida':                { city: 'Mérida', shortName: 'EDM', colors: { primary: '#D2042D', secondary: '#FFFFFF', accent: '#000000' } },
  'zamora-fc':                            { city: 'Barinas', shortName: 'ZAM', colors: { primary: '#FFFFFF', secondary: '#D2042D', accent: '#D2042D' } },
  'metropolitanos-fc':                    { city: 'Caracas', shortName: 'MET', colors: { primary: '#800080', secondary: '#FFFFFF', accent: '#800080' } },
  'portuguesa-fc':                        { city: 'Acarigua', shortName: 'POR', colors: { primary: '#D2042D', secondary: '#003DA5', accent: '#FFFFFF' } },
  'trujillanos-fc':                       { city: 'Valera', shortName: 'TRU', colors: { primary: '#800020', secondary: '#FFFFFF', accent: '#800020' } },
  'dvo-rayo-zuliano':                     { city: 'Maracaibo', shortName: 'RZU', colors: { primary: '#003DA5', secondary: '#D2042D', accent: '#003DA5' } },
};

// ============================================================
// Budget config per tier (matches TeamSelection.jsx logic)
// ============================================================
const TIER_BUDGETS = {
  1: { pct: 0.12, min: 15_000_000, max: 500_000_000 },
  2: { pct: 0.10, min:  5_000_000, max: 120_000_000 },
  3: { pct: 0.07, min:  1_500_000, max:  30_000_000 },
  4: { pct: 0.05, min:    300_000, max:   5_000_000 },
  5: { pct: 0.03, min:    100_000, max:   1_500_000 },
};

// ============================================================
// ENRICHMENT FUNCTION
// ============================================================

/**
 * Enriches a single SA team with missing metadata fields.
 * Only fills in fields that are absent; never overwrites existing data.
 * 
 * @param {object} team  — raw team object { id, name, players, ... }
 * @param {string} leagueId — e.g. 'argentinaPrimera'
 * @returns {object} enriched team (same object, mutated for performance)
 */
export function enrichSATeam(team, leagueId) {
  const players = team.players || [];
  const avgOverall = players.length
    ? players.reduce((sum, p) => sum + (p.overall || 0), 0) / players.length
    : 70;
  const totalValue = players.reduce((sum, p) => sum + (p.value || 0), 0);

  // ── Reputation (numeric, ~60-90 scale) — always compute from players ──
  team.reputation = Math.round(avgOverall);

  // ── Stadium — always set from lookup (real stadiums) ──
  const info = getStadiumInfo(team.id, team.reputation);
  team.stadium = info.name;
  team.stadiumCapacity = info.capacity;

  // ── Budget — always compute from tier + player values ──
  const tier = getLeagueTier(leagueId);
  const cfg = TIER_BUDGETS[tier] || TIER_BUDGETS[3];
  const baseBudget = Math.max(totalValue * cfg.pct, cfg.min);
  let repMul = 1.0;
  if (avgOverall >= 80) repMul = 2.5;
  else if (avgOverall >= 77) repMul = 1.8;
  else if (avgOverall >= 74) repMul = 1.3;
  else if (avgOverall >= 70) repMul = 1.0;
  else if (avgOverall >= 66) repMul = 0.7;
  else repMul = 0.5;
  team.budget = Math.round(Math.min(baseBudget * repMul, cfg.max));

  // ── Lookup metadata (shortName, city, colors) ──
  const meta = SA_TEAM_META[team.id];
  team.shortName = meta?.shortName || deriveShortName(team.name);
  team.city = meta?.city || '';
  team.colors = meta?.colors || { primary: '#333333', secondary: '#FFFFFF', accent: '#888888' };

  return team;
}

/**
 * Batch-enrich an array of SA teams.
 * @param {array}  teams    — array of team objects
 * @param {string} leagueId — e.g. 'brasileiraoA'
 * @returns {array} same array, with each team enriched
 */
export function enrichSATeams(teams, leagueId) {
  for (const team of teams) {
    enrichSATeam(team, leagueId);
  }
  return teams;
}

// ── Helpers ──

/**
 * Derive a 3-letter short name from the team's full name.
 * Picks the most "significant" word (longest, excluding common prefixes).
 */
function deriveShortName(name) {
  if (!name) return '???';
  const skip = new Set(['club', 'atletico', 'de', 'del', 'la', 'el', 'los', 'las', 'fc', 'sc', 'cd', 'ca', 'cf', 'se', 'ec', 'aa', 'ad', 'sd', 'cs', 'fbc', 'csd', 'deportivo', 'esporte', 'clube', 'associacao', 'association', 'futebol']);
  const words = name.replace(/[()]/g, '').split(/[\s-]+/).filter(w => !skip.has(w.toLowerCase()));
  // Pick the longest remaining word
  const best = words.reduce((a, b) => (b.length > a.length ? b : a), words[0] || name);
  return best.slice(0, 3).toUpperCase();
}
