import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Dice5, Trophy, Sparkles, Link2, Shield, ChevronLeft, ChevronRight, X, Star, AlertTriangle, Repeat2, Lock, Play, ListChecks } from 'lucide-react';
import { loadWorldCupDraftDatabase } from './worldCupDraftLoader';
import { bandSlice } from './campaignDifficulty';
import { buildMomentumBuckets } from '../../game/liveMatchStats';
import i18n from '../../i18n';
import { trackEvent } from '../../firebase/analytics';
import './WorldCupDraft.scss';

// Each formation is laid out explicitly so tactical tokens never overlap on any
// viewport. Coordinates are percentages on a pitch that attacks upward (y=0 top).
const FORMATION_LAYOUTS = {
  '4-3-3': [
    { label: 'GK', x: 50, y: 93 },
    { label: 'LB', x: 16, y: 74 }, { label: 'CB', x: 38, y: 78 }, { label: 'CB', x: 62, y: 78 }, { label: 'RB', x: 84, y: 74 },
    { label: 'CM', x: 30, y: 53 }, { label: 'CM', x: 50, y: 58 }, { label: 'CM', x: 70, y: 53 },
    { label: 'LW', x: 18, y: 25 }, { label: 'ST', x: 50, y: 17 }, { label: 'RW', x: 82, y: 25 },
  ],
  '4-4-2': [
    { label: 'GK', x: 50, y: 93 },
    { label: 'LB', x: 15, y: 74 }, { label: 'CB', x: 38, y: 78 }, { label: 'CB', x: 62, y: 78 }, { label: 'RB', x: 85, y: 74 },
    { label: 'LM', x: 16, y: 50 }, { label: 'CM', x: 40, y: 53 }, { label: 'CM', x: 60, y: 53 }, { label: 'RM', x: 84, y: 50 },
    { label: 'ST', x: 38, y: 19 }, { label: 'ST', x: 62, y: 19 },
  ],
  '4-2-3-1': [
    { label: 'GK', x: 50, y: 93 },
    { label: 'LB', x: 15, y: 75 }, { label: 'CB', x: 38, y: 78 }, { label: 'CB', x: 62, y: 78 }, { label: 'RB', x: 85, y: 75 },
    { label: 'DM', x: 38, y: 59 }, { label: 'DM', x: 62, y: 59 },
    { label: 'AM', x: 50, y: 40 }, { label: 'LW', x: 18, y: 27 }, { label: 'RW', x: 82, y: 27 },
    { label: 'ST', x: 50, y: 15 },
  ],
  '3-5-2': [
    { label: 'GK', x: 50, y: 93 },
    { label: 'CB', x: 30, y: 78 }, { label: 'CB', x: 50, y: 80 }, { label: 'CB', x: 70, y: 78 },
    { label: 'LM', x: 14, y: 52 }, { label: 'CM', x: 38, y: 56 }, { label: 'CM', x: 62, y: 56 }, { label: 'RM', x: 86, y: 52 },
    { label: 'AM', x: 50, y: 38 }, { label: 'ST', x: 38, y: 18 }, { label: 'ST', x: 62, y: 18 },
  ],
};

// Fixed perimeter positions (in % of the card) for the legendary spark glints.
// Kept deterministic so the twinkle never jumps between renders; staggered by
// index in CSS. Pure CSS lights — no images or particle library.
const LEGEND_SPARKS = [
  { x: 10, y: 7 }, { x: 38, y: 4 }, { x: 66, y: 5 }, { x: 91, y: 9 },
  { x: 95, y: 38 }, { x: 93, y: 70 }, { x: 88, y: 93 }, { x: 55, y: 96 },
  { x: 24, y: 95 }, { x: 7, y: 72 }, { x: 5, y: 41 }, { x: 8, y: 22 },
];

const FILTERS = [
  { id: 'all', label: 'Todos', min: 0, max: 9999 },
  { id: 'early', label: '1930-1962', min: 1930, max: 1962 },
  { id: 'classic', label: '1966-1994', min: 1966, max: 1994 },
  { id: 'modern', label: '1998-2022', min: 1998, max: 2022 },
];

// Full World Cup campaign: three group matches followed by a single-elimination
// knockout bracket. No wildcard/bonus rounds — draft is formation + XI only.
const CAMPAIGN_ROUNDS = ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Octavos', 'Cuartos', 'Semifinal', 'Final'];
const GROUP_MATCH_COUNT = 3;
// Group qualification: a team advances with 4+ points (e.g. win + draw), or with
// 3 points and a positive goal difference. Nobody is eliminated until matchday 3.
const GROUP_QUALIFY_POINTS = 4;

// Friendly stage labels for the progressive, match-by-match tournament viewer.
// The simulation stores the bare round key (CAMPAIGN_ROUNDS); these only affect
// how each step is presented on the reveal screen, never the result itself.
const ROUND_LABELS = {
  'Grupo 1': 'Fase de grupos · Jornada 1',
  'Grupo 2': 'Fase de grupos · Jornada 2',
  'Grupo 3': 'Fase de grupos · Jornada 3',
  Octavos: 'Octavos de final',
  Cuartos: 'Cuartos de final',
  Semifinal: 'Semifinal',
  Final: 'Final',
};
const ROUND_SHORT = {
  'Grupo 1': 'J1',
  'Grupo 2': 'J2',
  'Grupo 3': 'J3',
  Octavos: '8º',
  Cuartos: '4º',
  Semifinal: 'SF',
  Final: 'F',
};

const ATTACK_GROUPS = new Set(['FW']);
const MID_GROUPS = new Set(['MF']);
const DEF_GROUPS = new Set(['DF', 'GK']);
const POSITION_ALIASES = {
  MC: 'CM',
  MI: 'LM',
  MD: 'RM',
  MCD: 'CDM',
  MCO: 'CAM',
  DC: 'ST',
};
// Position tokens a player may carry to be eligible for each pitch slot. The
// source database only ever tags midfielders as CM/CDM/CAM and wide players as
// LW/RW — it has NO bare "LM"/"RM" tokens — so the wide-midfield slots used by
// 4-4-2 and 3-5-2 must also accept the natural wide forwards and central mids,
// otherwise their candidate pool is empty and tapping the circle does nothing.
// Side-consistent: LM widens to the left flank (LW) + CM, RM to the right.
const SLOT_COMPATIBLE_POSITIONS = {
  GK: ['GK'],
  LB: ['LB'],
  RB: ['RB'],
  CB: ['CB'],
  LM: ['LM', 'LW', 'CM'],
  RM: ['RM', 'RW', 'CM'],
  LW: ['LW'],
  RW: ['RW'],
  CM: ['CM'],
  DM: ['DM', 'CDM'],
  AM: ['AM', 'CAM'],
  ST: ['ST', 'CF'],
};

// Human-readable role per slot label, used as the card-picker heading so the
// player knows exactly which position they are drafting for.
const SLOT_FULL_NAMES = {
  GK: 'Portero',
  LB: 'Lateral izquierdo', RB: 'Lateral derecho', CB: 'Central',
  LM: 'Medio izquierdo', RM: 'Medio derecho',
  LW: 'Extremo izquierdo', RW: 'Extremo derecho',
  CM: 'Mediocentro', DM: 'Pivote defensivo', AM: 'Mediapunta',
  ST: 'Delantero',
};

// ---------------------------------------------------------------------------
// Player styles (original PC Gaffer chemistry — not tied to any FIFA formula).
// Each player is given ONE explainable playing style derived from their country
// football culture, position group, rating and era. Styles intentionally recur
// across nations so a mixed XI can still build "style links" the same way a
// single-nation XI builds "country links".
// ---------------------------------------------------------------------------
const STYLES = {
  TIKI: 'Tiki-taka',
  POTENCIA: 'Potencia',
  CATENACCIO: 'Catenaccio',
  SAMBA: 'Samba',
  PRESION: 'Presión',
  CONTRA: 'Contraataque',
  BALON: 'Balón parado',
  MURO: 'Muro defensivo',
  FANTASIA: 'Fantasía',
};

// Football-culture bucket per nation. Unknown nations fall back to the
// position/rating/era logic below, so every player always gets a style.
const COUNTRY_CULTURE = {
  ESP: 'TIKI',
  NED: 'PRESION', HOL: 'PRESION',
  BRA: 'SAMBA',
  ARG: 'FANTASIA', POR: 'FANTASIA',
  ITA: 'CATENACCIO',
  GER: 'POTENCIA', FRG: 'POTENCIA', GDR: 'POTENCIA', BEL: 'POTENCIA',
  ENG: 'BALON', SCO: 'BALON', SWE: 'BALON', NOR: 'BALON',
  FRA: 'CONTRA', CRO: 'CONTRA', SEN: 'CONTRA', NGA: 'CONTRA', GHA: 'CONTRA',
  URU: 'MURO', MEX: 'MURO', PAR: 'MURO', GRE: 'MURO',
};

function playerGroupKey(player) {
  const group = String(player?.positionGroup || '').toUpperCase();
  if (group === 'GK') return 'GK';
  if (group === 'DEF') return 'DF';
  if (group === 'MID') return 'MF';
  if (group === 'FWD' || group === 'FW' || group === 'ATT') return 'FW';
  // Fall back to the slot grouping of the primary listed position.
  return slotGroup(normalizePositionToken(player?.position));
}

function playerStyle(player) {
  if (!player) return STYLES.TIKI;
  const group = playerGroupKey(player);
  const rating = Number(player.rating) || 60;
  const year = Number(player.year) || 1990;
  const culture = COUNTRY_CULTURE[String(player.countryCode || '').toUpperCase()];

  // Goalkeepers always anchor the defensive identity.
  if (group === 'GK') return STYLES.MURO;

  if (culture) {
    const cultureStyle = STYLES[culture];
    // Defenders express defensive cultures, otherwise hold a defensive identity.
    if (group === 'DF') {
      return culture === 'CATENACCIO' || culture === 'MURO' ? cultureStyle : STYLES.MURO;
    }
    return cultureStyle;
  }

  // Fallback for nations without a mapped culture — keep it deterministic and
  // readable: defenders defend, midfielders pass or press by quality, forwards
  // dazzle or bulldoze, with a small era nudge toward power for older sides.
  if (group === 'DF') return STYLES.MURO;
  if (group === 'MF') return rating >= 82 ? STYLES.TIKI : STYLES.PRESION;
  if (rating >= 84) return STYLES.FANTASIA;
  return year <= 1978 ? STYLES.POTENCIA : STYLES.CONTRA;
}

function makeSlots(formation) {
  const layout = FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS['4-3-3'];
  return layout.map((point, index) => ({
    id: `${point.label}-${index}`,
    label: point.label,
    group: slotGroup(point.label),
    x: point.x,
    y: point.y,
    player: null,
    displayRating: null,
    adapted: false,
  }));
}

function slotGroup(label) {
  if (label === 'GK') return 'GK';
  if (['LB', 'CB', 'RB'].includes(label)) return 'DF';
  if (['DM', 'CM', 'AM', 'LM', 'RM'].includes(label)) return 'MF';
  return 'FW';
}

function normalizePositionToken(position) {
  const token = String(position || '').trim().toUpperCase();
  return POSITION_ALIASES[token] || token;
}

function playerPositionSet(player) {
  return new Set([player?.position, ...(Array.isArray(player?.positions) ? player.positions : [])]
    .map(normalizePositionToken)
    .filter(Boolean));
}

function isCompatible(player, slot) {
  if (!player || !slot) return false;
  const slotPositions = SLOT_COMPATIBLE_POSITIONS[normalizePositionToken(slot.label)] || [normalizePositionToken(slot.label)];
  const positions = playerPositionSet(player);
  return slotPositions.some((position) => positions.has(position));
}

function displayPositions(player) {
  const rawPositions = [player?.position, ...(Array.isArray(player?.positions) ? player.positions : [])]
    .map((position) => String(position || '').trim().toUpperCase())
    .filter(Boolean);
  const unique = rawPositions.filter((position, index) => rawPositions.indexOf(position) === index);
  return unique.slice(0, 3).join(' / ') || '-';
}

function primaryPosition(player) {
  return displayPositions(player).split('/')[0].trim() || '-';
}

function ratingTier(rating) {
  // Legendary is reserved for the all-time greats (Pelé, Maradona, etc.) so the
  // gold/shake treatment stays rare and meaningful.
  if (rating >= 90) return 'legendary';
  if (rating >= 86) return 'elite';
  if (rating >= 81) return 'great';
  if (rating >= 75) return 'good';
  return 'base';
}

// Active app language (es/en/fr...). The rest of the app localizes mainly to
// Spanish, so here we only branch Spanish vs. the international English codes.
function currentLang() {
  return String((i18n && i18n.language) || 'es').slice(0, 2).toLowerCase();
}

// Four rating-based card categories, only the very top labelled "leyenda". This
// replaces the old behaviour where every premium card claimed LEYENDA. Bands are
// by the player's overall rating (their "media"), graded into 4 tiers.
const RATING_BADGES = {
  legend: { key: 'legend', es: 'LEYENDA', en: 'LEGEND' },
  worldclass: { key: 'worldclass', es: 'CLASE MUNDIAL', en: 'WORLD CLASS' },
  star: { key: 'star', es: 'ESTRELLA', en: 'STAR' },
  prospect: { key: 'prospect', es: 'CLÁSICO', en: 'CLASSIC' },
};

function ratingBadge(rating, lang = currentLang()) {
  const value = Number(rating) || 0;
  const band = value >= 90 ? RATING_BADGES.legend
    : value >= 84 ? RATING_BADGES.worldclass
      : value >= 78 ? RATING_BADGES.star
        : RATING_BADGES.prospect;
  return { key: band.key, label: lang === 'es' ? band.es : band.en };
}

// Spanish football shorthand for each position token. Other languages keep the
// internationally-understood English codes (ST/CF/RW...), matching how the rest
// of the app localizes these football abbreviations.
const POSITION_LABELS_ES = {
  GK: 'POR',
  LB: 'LI', RB: 'LD', CB: 'DFC',
  LM: 'MI', RM: 'MD', LW: 'EI', RW: 'ED',
  CM: 'MC', DM: 'MCD', CDM: 'MCD', AM: 'MCO', CAM: 'MCO',
  ST: 'DC', CF: 'DC',
};

function localizePositionToken(token, lang = currentLang()) {
  const upper = String(token || '').trim().toUpperCase();
  if (!upper) return upper;
  if (lang === 'es') return POSITION_LABELS_ES[upper] || upper;
  return upper;
}

// Visible (localized) variants of the position helpers. The raw English helpers
// stay for data attributes / logic so QA hooks and matching never shift locale.
function displayPositionsLabel(player, lang = currentLang()) {
  const raw = displayPositions(player);
  if (raw === '-') return raw;
  return raw.split(' / ').map((token) => localizePositionToken(token, lang)).join(' / ');
}

function primaryPositionLabel(player, lang = currentLang()) {
  return localizePositionToken(primaryPosition(player), lang);
}

function chemistryPreviewText(chem, lang = currentLang()) {
  const isEs = lang === 'es';
  if (!chem || (!chem.country && !chem.style)) {
    return isEs ? 'Sin nueva química' : 'No new chemistry';
  }
  const parts = [];
  if (chem.country) {
    parts.push(`${isEs ? '+ País' : '+ Country'} ${chem.country.label}`);
  }
  if (chem.style) {
    parts.push(`${isEs ? '+ Estilo' : '+ Style'} ${chem.style.style}`);
  }
  return parts.join(' · ');
}

function chemistryPreviewClass(chem) {
  if (chem?.country && chem?.style) return 'mixed';
  if (chem?.country) return 'country';
  if (chem?.style) return 'style';
  return 'none';
}

function shortName(player) {
  if (!player) return '';
  const full = player.displayName || player.name || '';
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : full;
}

function countryKey(player) {
  return String(player?.countryCode || player?.nationality || '?').toUpperCase();
}

// The source data stores the UK home-nation flags as the BARE black-flag
// codepoint (U+1F3F4) with no regional tag sequence, so they render as a plain
// black flag on every platform. Upgrade them to the proper subdivision emoji so
// modern devices paint the real St George cross / saltire / dragon, instead of
// the "bandera negra" the user reported. Anything else keeps its stored flag.
const SUBDIVISION_FLAGS = {
  ENG: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  SCO: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  WAL: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
};

function flagGlyph(player) {
  return SUBDIVISION_FLAGS[countryKey(player)] || String(player?.flag || '');
}

const COUNTRY_VISUALS = {
  ARG: { flag: 'argentina', glow: 'rgba(96, 165, 250, 0.42)', accent: '#75aadb' },
  BRA: { flag: 'brazil', glow: 'rgba(34, 197, 94, 0.46)', accent: '#f5d23d' },
  ESP: { flag: 'spain', glow: 'rgba(242, 195, 51, 0.38)', accent: '#f2c333' },
  FRA: { flag: 'france', glow: 'rgba(63, 112, 207, 0.42)', accent: '#315aa8' },
  GER: { flag: 'germany', glow: 'rgba(215, 185, 104, 0.42)', accent: '#e1b328' },
  FRG: { flag: 'germany', glow: 'rgba(215, 185, 104, 0.42)', accent: '#e1b328' },
  GDR: { flag: 'east-germany', glow: 'rgba(215, 185, 104, 0.42)', accent: '#e1b328' },
  ITA: { flag: 'italy', glow: 'rgba(74, 222, 128, 0.32)', accent: '#1f9d55' },
  NED: { flag: 'netherlands', glow: 'rgba(249, 115, 22, 0.36)', accent: '#f97316' },
  HOL: { flag: 'netherlands', glow: 'rgba(249, 115, 22, 0.36)', accent: '#f97316' },
  ENG: { flag: 'england', glow: 'rgba(248, 250, 252, 0.3)', accent: '#e5e7eb' },
  SCO: { flag: 'scotland', glow: 'rgba(59, 130, 246, 0.4)', accent: '#2f7bd6' },
  WAL: { flag: 'wales', glow: 'rgba(34, 197, 94, 0.4)', accent: '#2faa55' },
  NIR: { flag: 'northern-ireland', glow: 'rgba(239, 68, 68, 0.34)', accent: '#d22f27' },
  POR: { flag: 'portugal', glow: 'rgba(34, 197, 94, 0.36)', accent: '#d22f27' },
  URU: { flag: 'uruguay', glow: 'rgba(96, 165, 250, 0.38)', accent: '#7dd3fc' },
  CRO: { flag: 'croatia', glow: 'rgba(239, 68, 68, 0.36)', accent: '#ef4444' },
  BEL: { flag: 'belgium', glow: 'rgba(251, 191, 36, 0.35)', accent: '#fbbf24' },
  MEX: { flag: 'mexico', glow: 'rgba(34, 197, 94, 0.34)', accent: '#15803d' },
  USA: { flag: 'usa', glow: 'rgba(96, 165, 250, 0.34)', accent: '#2563eb' },
  SWE: { flag: 'sweden', glow: 'rgba(250, 204, 21, 0.32)', accent: '#facc15' },
  DEN: { flag: 'denmark', glow: 'rgba(239, 68, 68, 0.34)', accent: '#ef4444' },
  COL: { flag: 'colombia', glow: 'rgba(250, 204, 21, 0.36)', accent: '#facc15' },
  CHI: { flag: 'chile', glow: 'rgba(59, 130, 246, 0.34)', accent: '#2563eb' },
  POL: { flag: 'poland', glow: 'rgba(248, 113, 113, 0.34)', accent: '#ef4444' },
  CZE: { flag: 'czechia', glow: 'rgba(59, 130, 246, 0.34)', accent: '#2563eb' },
  TCH: { flag: 'czechia', glow: 'rgba(59, 130, 246, 0.34)', accent: '#2563eb' },
  SUI: { flag: 'switzerland', glow: 'rgba(239, 68, 68, 0.34)', accent: '#ef4444' },
  JPN: { flag: 'japan', glow: 'rgba(248, 250, 252, 0.28)', accent: '#e5e7eb' },
  KOR: { flag: 'korea', glow: 'rgba(59, 130, 246, 0.34)', accent: '#2563eb' },
  SEN: { flag: 'senegal', glow: 'rgba(34, 197, 94, 0.34)', accent: '#22c55e' },
  NGA: { flag: 'nigeria', glow: 'rgba(34, 197, 94, 0.36)', accent: '#22c55e' },
  GHA: { flag: 'ghana', glow: 'rgba(251, 191, 36, 0.34)', accent: '#fbbf24' },
  CRC: { flag: 'costa-rica', glow: 'rgba(59, 130, 246, 0.34)', accent: '#2563eb' },
  CIV: { flag: 'ivory-coast', glow: 'rgba(249, 115, 22, 0.36)', accent: '#f97316' },

  // --- Second wave: high-frequency historical & modern nations, each with a
  // hand-built full-card CSS flag (see CSS_FLAGS + the SCSS blocks). Symbols that
  // need an overlay (stars, crescents, crests, cantons) are drawn by FlagOverlay.
  HUN: { flag: 'hungary', glow: 'rgba(34, 197, 94, 0.34)', accent: '#2e7d4f' },
  CMR: { flag: 'cameroon', glow: 'rgba(250, 204, 21, 0.36)', accent: '#fcd116' },
  PAR: { flag: 'paraguay', glow: 'rgba(96, 165, 250, 0.34)', accent: '#2449a5' },
  YUG: { flag: 'yugoslavia', glow: 'rgba(96, 165, 250, 0.34)', accent: '#c51e2c' },
  AUT: { flag: 'austria', glow: 'rgba(239, 68, 68, 0.34)', accent: '#ed2939' },
  URS: { flag: 'ussr', glow: 'rgba(250, 204, 21, 0.4)', accent: '#f5d23d' },
  BUL: { flag: 'bulgaria', glow: 'rgba(34, 197, 94, 0.34)', accent: '#009b48' },
  ROU: { flag: 'romania', glow: 'rgba(250, 204, 21, 0.34)', accent: '#fcd116' },
  AUS: { flag: 'australia', glow: 'rgba(96, 165, 250, 0.34)', accent: '#1f3b73' },
  TUN: { flag: 'tunisia', glow: 'rgba(239, 68, 68, 0.36)', accent: '#e70013' },
  KSA: { flag: 'saudi-arabia', glow: 'rgba(34, 197, 94, 0.36)', accent: '#147b3c' },
  IRN: { flag: 'iran', glow: 'rgba(34, 197, 94, 0.34)', accent: '#da0000' },
  MAR: { flag: 'morocco', glow: 'rgba(34, 197, 94, 0.34)', accent: '#138808' },
  PER: { flag: 'peru', glow: 'rgba(239, 68, 68, 0.34)', accent: '#d91023' },
  ECU: { flag: 'ecuador', glow: 'rgba(250, 204, 21, 0.36)', accent: '#ffd100' },
  RUS: { flag: 'russia', glow: 'rgba(96, 165, 250, 0.34)', accent: '#0039a6' },
  ALG: { flag: 'algeria', glow: 'rgba(34, 197, 94, 0.34)', accent: '#006233' },
  SRB: { flag: 'serbia', glow: 'rgba(239, 68, 68, 0.34)', accent: '#c6363c' },
  SCG: { flag: 'serbia-montenegro', glow: 'rgba(96, 165, 250, 0.34)', accent: '#2449a5' },
  RSA: { flag: 'south-africa', glow: 'rgba(34, 197, 94, 0.36)', accent: '#007a4d' },
  HON: { flag: 'honduras', glow: 'rgba(96, 165, 250, 0.34)', accent: '#0073cf' },
  GRE: { flag: 'greece', glow: 'rgba(96, 165, 250, 0.34)', accent: '#1f65a6' },
  IRL: { flag: 'ireland', glow: 'rgba(34, 197, 94, 0.34)', accent: '#169b62' },
  NOR: { flag: 'norway', glow: 'rgba(239, 68, 68, 0.34)', accent: '#ba0c2f' },
  EGY: { flag: 'egypt', glow: 'rgba(239, 68, 68, 0.34)', accent: '#ce1126' },
  BOL: { flag: 'bolivia', glow: 'rgba(250, 204, 21, 0.34)', accent: '#ffe000' },
  CAN: { flag: 'canada', glow: 'rgba(239, 68, 68, 0.36)', accent: '#d52b1e' },
  SVN: { flag: 'slovenia', glow: 'rgba(96, 165, 250, 0.34)', accent: '#2449a5' },
  TUR: { flag: 'turkey', glow: 'rgba(239, 68, 68, 0.36)', accent: '#e30a17' },
  PRK: { flag: 'north-korea', glow: 'rgba(239, 68, 68, 0.36)', accent: '#024fa2' },
  NZL: { flag: 'new-zealand', glow: 'rgba(96, 165, 250, 0.34)', accent: '#1f3b73' },
  SLV: { flag: 'el-salvador', glow: 'rgba(96, 165, 250, 0.34)', accent: '#0f47af' },
  QAT: { flag: 'qatar', glow: 'rgba(136, 23, 64, 0.4)', accent: '#8a1538' },
  CHN: { flag: 'china', glow: 'rgba(250, 204, 21, 0.4)', accent: '#de2910' },
  TRI: { flag: 'trinidad-tobago', glow: 'rgba(239, 68, 68, 0.34)', accent: '#da1a35' },
  ANG: { flag: 'angola', glow: 'rgba(250, 204, 21, 0.36)', accent: '#cc092f' },
  TOG: { flag: 'togo', glow: 'rgba(34, 197, 94, 0.34)', accent: '#006a4e' },
  UKR: { flag: 'ukraine', glow: 'rgba(250, 204, 21, 0.38)', accent: '#ffd500' },
  SVK: { flag: 'slovakia', glow: 'rgba(96, 165, 250, 0.34)', accent: '#2449a5' },
  BIH: { flag: 'bosnia', glow: 'rgba(250, 204, 21, 0.36)', accent: '#002395' },
  ISL: { flag: 'iceland', glow: 'rgba(96, 165, 250, 0.34)', accent: '#02529c' },
  PAN: { flag: 'panama', glow: 'rgba(96, 165, 250, 0.34)', accent: '#072357' },
  ISR: { flag: 'israel', glow: 'rgba(96, 165, 250, 0.34)', accent: '#0038b8' },
  KUW: { flag: 'kuwait', glow: 'rgba(34, 197, 94, 0.34)', accent: '#007a3d' },
  IRQ: { flag: 'iraq', glow: 'rgba(239, 68, 68, 0.34)', accent: '#ce1126' },
  UAE: { flag: 'uae', glow: 'rgba(34, 197, 94, 0.34)', accent: '#00732f' },
  JAM: { flag: 'jamaica', glow: 'rgba(250, 204, 21, 0.4)', accent: '#fed100' },
  CUB: { flag: 'cuba', glow: 'rgba(96, 165, 250, 0.34)', accent: '#002a8f' },
  HAI: { flag: 'haiti', glow: 'rgba(96, 165, 250, 0.34)', accent: '#00209f' },
  ZAI: { flag: 'zaire', glow: 'rgba(34, 197, 94, 0.34)', accent: '#13a538' },
  DEI: { flag: 'dutch-east-indies', glow: 'rgba(239, 68, 68, 0.34)', accent: '#ce1126' },
};

// Country codes that have a hand-built, geometrically accurate CSS flag. Every
// other nation in the database (Hungary, Cameroon, Austria, the USSR, etc.) is
// rendered through the real emoji flag fallback below, so EVERY player always
// shows their own real flag — never a generic dark panel.
const CSS_FLAGS = new Set([
  'spain', 'france', 'netherlands', 'germany', 'brazil', 'argentina', 'uruguay',
  'italy', 'mexico', 'england', 'scotland', 'wales', 'northern-ireland', 'portugal', 'croatia', 'belgium',
  'usa', 'sweden', 'denmark', 'switzerland', 'colombia', 'chile', 'poland',
  'japan', 'czechia', 'korea', 'senegal', 'ghana', 'nigeria',
  'costa-rica', 'ivory-coast',
  // Second wave (high-frequency historical + modern nations).
  'hungary', 'cameroon', 'paraguay', 'yugoslavia', 'austria', 'ussr', 'bulgaria',
  'romania', 'australia', 'tunisia', 'saudi-arabia', 'iran', 'morocco', 'peru',
  'ecuador', 'russia', 'algeria', 'serbia', 'serbia-montenegro', 'south-africa',
  'honduras', 'greece', 'ireland', 'norway', 'egypt', 'bolivia', 'canada',
  'slovenia', 'turkey', 'north-korea', 'new-zealand', 'el-salvador', 'qatar',
  'china', 'trinidad-tobago', 'angola', 'togo', 'ukraine', 'slovakia', 'bosnia',
  'iceland', 'panama', 'israel', 'kuwait', 'iraq', 'uae', 'jamaica', 'cuba',
  'haiti', 'zaire', 'dutch-east-indies', 'east-germany',
]);

function countryVisualTheme(player) {
  const code = countryKey(player);
  return COUNTRY_VISUALS[code] || { flag: 'generic', glow: 'rgba(34, 197, 94, 0.34)', accent: '#22c55e' };
}

const HOME_NATION_CODES = new Set(['ENG', 'SCO', 'WAL', 'NIR']);

function CountryFlagMark({ player, code, className = '' }) {
  const resolvedCode = String(code || countryKey(player)).toUpperCase();
  const theme = COUNTRY_VISUALS[resolvedCode];
  if (HOME_NATION_CODES.has(resolvedCode) && theme?.flag) {
    return (
      <i
        className={`worldcup-draft__mini-flag worldcup-draft__mini-flag--${theme.flag}${className ? ` ${className}` : ''}`}
        aria-hidden="true"
      />
    );
  }
  if (HOME_NATION_CODES.has(resolvedCode)) {
    return (
      <i className={`worldcup-draft__mini-flag worldcup-draft__mini-flag--code${className ? ` ${className}` : ''}`} aria-hidden="true">
        {resolvedCode}
      </i>
    );
  }
  return (
    <i className={className || undefined} aria-hidden="true">
      {flagGlyph(player)}
    </i>
  );
}

function cardStyleTag(player) {
  const style = playerStyle(player);
  const name = String(player?.name || player?.displayName || '').toLowerCase();
  const code = countryKey(player);
  const position = primaryPosition(player);
  if (/GK/.test(position)) return 'GUARDIÁN';
  if (/CB|LB|RB/.test(position)) return 'MURO';
  if (/iniesta|xavi|busquets|guardiola/.test(name)) return 'TIKI-TAKA';
  if (/(^|\b)(zidane|platini|ronaldinho|maradona|messi|baggio)(\b|$)/.test(name)) return 'MAGIA';
  if (/cruyff|neeskens|rijkaard|gullit|van basten/.test(name) || code === 'NED' || code === 'HOL') return 'TOTAL';
  if (/beckenbauer|maldini|baresi/.test(name)) return 'ELEGANCIA';
  if (/pele|pelé|ronaldo|romario|garincha/.test(name) || code === 'BRA') return 'JOGA BONITO';
  if (style === STYLES.TIKI) return 'TIKI-TAKA';
  if (style === STYLES.FANTASIA) return 'MAGIA';
  if (style === STYLES.PRESION) return 'PRESIÓN';
  if (style === STYLES.CATENACCIO) return 'OFICIO';
  return style.toUpperCase();
}

function splitDisplayName(player) {
  const full = String(player?.displayName || player?.name || '').trim();
  if (!full) return { first: '', last: '' };
  const parts = full.split(/\s+/);
  if (parts.length === 1) return { first: '', last: parts[0] };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

// What new chemistry would picking this player add to the current XI? Compared
// against the already-picked players EXCLUDING the slot being filled/replaced.
// Returns the candidate country link and/or style link this player would create
// or extend, so the card can preview "+ País Brasil" / "+ Estilo Samba" or make
// it clear there is "Sin nueva química".
function chemistryPreview(player, otherPlayers) {
  if (!player) return { country: null, style: null };
  const code = countryKey(player);
  const style = playerStyle(player);
  let countryCount = 0;
  let styleCount = 0;
  (otherPlayers || []).forEach((other) => {
    if (countryKey(other) === code) countryCount += 1;
    if (playerStyle(other) === style) styleCount += 1;
  });
  return {
    country: countryCount >= 1
      ? { code, label: player.nationalityEs || player.nationality || code, flag: flagGlyph(player), count: countryCount + 1 }
      : null,
    style: styleCount >= 1 ? { style, count: styleCount + 1 } : null,
  };
}

function chooseRandom(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

// Accent/whitespace-insensitive name key, so the same legend across editions
// (e.g. Maradona '86 vs '90) never shows twice in one card deck or XI.
function comparableName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Collapse multi-edition duplicates of the same footballer to their best card.
function dedupeByBestRating(players) {
  const map = new Map();
  for (const player of players) {
    const key = comparableName(player.name);
    const current = map.get(key);
    if (!current || (Number(player.rating) || 0) > (Number(current.rating) || 0)) {
      map.set(key, player);
    }
  }
  return [...map.values()];
}

// Rating-weighted draw without replacement: higher-rated players surface more
// often (so legends genuinely feel rare-but-possible) while every compatible
// player keeps a real chance. Weight grows quadratically above a 49 floor.
function weightedSample(pool, count) {
  const items = [...pool];
  const chosen = [];
  while (chosen.length < count && items.length) {
    const weights = items.map((player) => Math.pow(Math.max(1, (Number(player.rating) || 60) - 49), 2));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let threshold = Math.random() * total;
    let index = 0;
    for (; index < items.length; index += 1) {
      threshold -= weights[index];
      if (threshold <= 0) break;
    }
    if (index >= items.length) index = items.length - 1;
    chosen.push(items[index]);
    items.splice(index, 1);
  }
  return chosen;
}

// Build the 5 position-compatible card choices for a slot. Strictly excludes
// already-picked players (by id AND name) and anyone whose listed positions are
// not compatible with the slot. Honours the active era filter first, then widens
// to all eras only if the era pool can't fill the deck — never offers an
// incompatible player.
function buildChoices(players, slot, filter, pickedIds, pickedNames, count = 5) {
  const eligible = (player) => !pickedIds.has(player.id)
    && !pickedNames.has(comparableName(player.name))
    && isCompatible(player, slot);
  const inEra = players.filter((player) => Number(player.year) >= filter.min
    && Number(player.year) <= filter.max
    && eligible(player));
  const pool = dedupeByBestRating(inEra);
  if (pool.length < count) {
    const seen = new Set(pool.map((player) => comparableName(player.name)));
    for (const player of dedupeByBestRating(players.filter(eligible))) {
      const key = comparableName(player.name);
      if (!seen.has(key)) {
        pool.push(player);
        seen.add(key);
      }
    }
  }
  return weightedSample(pool, Math.min(count, pool.length));
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function calcSummary(slots) {
  const picked = slots.filter((slot) => slot.player);
  const avg = average(picked.map((slot) => slot.displayRating));
  const attack = average(picked.filter((slot) => ATTACK_GROUPS.has(slot.group)).map((slot) => slot.displayRating));
  const midfield = average(picked.filter((slot) => MID_GROUPS.has(slot.group)).map((slot) => slot.displayRating));
  const defense = average(picked.filter((slot) => DEF_GROUPS.has(slot.group)).map((slot) => slot.displayRating));
  const chemistry = calcChemistryDetails(picked);
  return { picked: picked.length, avg, attack, midfield, defense, chemistry, chem: chemistry.total };
}

// Draft chemistry, PC Gaffer style. Returns a rich breakdown rather than a bare
// number: base (scales with how full the XI is) + country links + style links +
// a small same team/year bonus, minus an out-of-position penalty, capped at 100.
function calcChemistryDetails(pickedSlots) {
  const count = pickedSlots.length;
  const empty = {
    total: 0, base: 0, country: 0, style: 0, teamYear: 0, penalty: 0,
    countryLinks: [], styleLinks: [],
  };
  if (!count) return empty;

  const countryMap = new Map();
  const styleMap = new Map();
  const teamYearMap = new Map();
  let adapted = 0;

  pickedSlots.forEach((slot) => {
    const player = slot.player;
    const code = countryKey(player);
    const country = countryMap.get(code) || { code, count: 0, flag: flagGlyph(player), label: player.nationalityEs || player.nationality || code };
    country.count += 1;
    countryMap.set(code, country);

    const style = playerStyle(player);
    const styleEntry = styleMap.get(style) || { style, count: 0 };
    styleEntry.count += 1;
    styleMap.set(style, styleEntry);

    const ty = `${player.teamId}-${player.year}`;
    teamYearMap.set(ty, (teamYearMap.get(ty) || 0) + 1);
    if (slot.adapted) adapted += 1;
  });

  // Each extra team-mate sharing a link contributes a fixed weight. Country links
  // are worth the most, style links next, same-edition squads a small extra.
  const linkBonus = (n, weight) => Math.max(0, n - 1) * weight;
  const country = [...countryMap.values()].reduce((sum, entry) => sum + linkBonus(entry.count, 6), 0);
  const style = [...styleMap.values()].reduce((sum, entry) => sum + linkBonus(entry.count, 4), 0);
  const teamYear = [...teamYearMap.values()].reduce((sum, n) => sum + linkBonus(n, 3), 0);
  const penalty = adapted * 4;
  const base = Math.round((count / 11) * 40);
  const total = Math.max(0, Math.min(100, Math.round(base + country + style + teamYear - penalty)));

  const countryLinks = [...countryMap.values()].filter((entry) => entry.count >= 2).sort((a, b) => b.count - a.count);
  const styleLinks = [...styleMap.values()].filter((entry) => entry.count >= 2).sort((a, b) => b.count - a.count);

  return { total, base, country, style, teamYear, penalty, countryLinks, styleLinks };
}

function simulateCampaign(slots, teams) {
  const selected = slots.filter((slot) => slot.player);
  const summary = calcSummary(slots);
  const squadPower = summary.avg + summary.chem * 0.08;
  const sortedTeams = [...teams].sort((a, b) => a.rating - b.rating);
  const matches = [];
  let alive = true;
  let eliminatedRound = null;
  let score = 0;
  let groupPoints = 0;
  let groupGf = 0;
  let groupGa = 0;
  const usedOpponents = new Set();

  for (let index = 0; index < CAMPAIGN_ROUNDS.length; index += 1) {
    const round = CAMPAIGN_ROUNDS[index];
    const isGroup = index < GROUP_MATCH_COUNT;
    const band = bandSlice(sortedTeams, index);
    const fresh = band.filter((team) => !usedOpponents.has(team));
    const pool = fresh.length ? fresh : (band.length ? band : sortedTeams);
    const opponent = chooseRandom(pool) || chooseRandom(sortedTeams);
    if (opponent) usedOpponents.add(opponent);
    const swing = Math.random() * 18 - 8 + index * 0.8;
    const edge = squadPower - opponent.rating - swing;
    const forceWin = typeof window !== 'undefined' && window.__WC_DRAFT_FORCE_WIN;
    const forcePenaltyMatch = typeof window !== 'undefined' && window.__WC_DRAFT_FORCE_PENALTY_MATCH;
    const forceGroupPass = forcePenaltyMatch && isGroup;
    const forceFirstKnockoutPenalty = forcePenaltyMatch && !isGroup && index === GROUP_MATCH_COUNT;
    const forGoals = forceFirstKnockoutPenalty
      ? 1
      : (forceWin || forceGroupPass)
        ? Math.max(2, Math.min(5, 2 + Math.floor(index / 2)))
        : Math.max(0, Math.min(5, Math.round(1.7 + edge / 18 + Math.random() * 1.8)));
    const againstGoals = forceFirstKnockoutPenalty
      ? 1
      : (forceWin || forceGroupPass)
        ? Math.max(0, Math.min(2, index % 2))
        : Math.max(0, Math.min(5, Math.round(1.4 - edge / 20 + Math.random() * 1.9)));
    const result = forGoals > againstGoals ? 'W' : forGoals === againstGoals ? 'D' : 'L';
    const scorers = pickScorers(selected, forGoals);

    // Knockouts cannot end level — a deterministic-ish shootout settles draws.
    let decided = result;
    let shootout = null;
    if (!isGroup && result === 'D') {
      const won = Math.random() * 100 < Math.max(12, Math.min(88, 50 + (squadPower - opponent.rating) * 1.5));
      decided = won ? 'W' : 'L';
      shootout = won ? 'won' : 'lost';
    }

    const points = isGroup ? (result === 'W' ? 3 : result === 'D' ? 1 : 0) : null;
    score += (decided === 'W' ? 300 : result === 'D' ? 100 : 0) + Math.max(0, forGoals - againstGoals) * 15 + Math.round(summary.chem * 0.4);
    matches.push({ round, isGroup, opponent, forGoals, againstGoals, result, decided, shootout, scorers, points });

    if (isGroup) {
      groupPoints += points;
      groupGf += forGoals;
      groupGa += againstGoals;
      if (index === GROUP_MATCH_COUNT - 1) {
        const qualified = groupPoints >= GROUP_QUALIFY_POINTS || (groupPoints === 3 && groupGf - groupGa > 0);
        if (!qualified) {
          alive = false;
          eliminatedRound = 'Fase de grupos';
          break;
        }
      }
    } else if (decided === 'L') {
      alive = false;
      eliminatedRound = round;
      break;
    }
  }

  const groupMatches = matches.filter((match) => match.isGroup);
  const knockoutMatches = matches.filter((match) => !match.isGroup);
  const champion = alive && matches.length === CAMPAIGN_ROUNDS.length && matches[matches.length - 1].decided === 'W';
  const status = champion
    ? 'Campeón del Mundo'
    : eliminatedRound === 'Fase de grupos'
      ? 'Eliminado en fase de grupos'
      : `Eliminado en ${eliminatedRound || matches[matches.length - 1]?.round || 'el torneo'}`;

  const recordOf = (list, key) => ({
    w: list.filter((m) => m[key] === 'W').length,
    d: list.filter((m) => m[key] === 'D').length,
    l: list.filter((m) => m[key] === 'L').length,
    gf: list.reduce((sum, m) => sum + m.forGoals, 0),
    ga: list.reduce((sum, m) => sum + m.againstGoals, 0),
  });

  return {
    champion,
    eliminatedRound,
    status,
    score: score + (champion ? 500 : 0),
    matches,
    groupMatches,
    knockoutMatches,
    group: {
      points: groupPoints,
      qualified: groupMatches.length === GROUP_MATCH_COUNT && eliminatedRound !== 'Fase de grupos',
      ...recordOf(groupMatches, 'result'),
    },
    record: recordOf(matches, 'decided'),
  };
}

function pickScorers(players, goals) {
  const weighted = players.flatMap(({ player, group }) => {
    const weight = group === 'FW' ? 5 : group === 'MF' ? 3 : 1;
    return Array.from({ length: weight + Math.max(0, Math.floor((player.rating - 70) / 8)) }, () => player);
  });
  return Array.from({ length: goals }, () => chooseRandom(weighted)?.displayName || chooseRandom(weighted)?.name || 'Jugador');
}

function sortedWorldCupEditions(database) {
  return [...(database?.editions || [])]
    .filter((edition) => Array.isArray(edition.teams) && edition.teams.length)
    .sort((a, b) => Number(a.year) - Number(b.year));
}

function teamsForEdition(database, year) {
  const edition = (database?.editions || []).find((item) => Number(item.year) === Number(year));
  if (!edition) return [];
  return (edition.teams || []).map((team) => ({
    ...team,
    year: Number(edition.year),
    rating: Number(team.rating || 70),
    attack: Number(team.attack || team.rating || 70),
    midfield: Number(team.midfield || team.rating || 70),
    defense: Number(team.defense || team.rating || 70),
  }));
}

function buildStrictEditionChoices(players, slot, year, pickedIds, pickedNames, count = 3) {
  const pool = dedupeByBestRating(players.filter((player) => Number(player.year) === Number(year)
    && !pickedIds.has(player.id)
    && !pickedNames.has(comparableName(player.name))
    && isCompatible(player, slot)));
  return weightedSample(pool, Math.min(count, pool.length));
}

function championLikeTeam(edition) {
  const teams = (edition?.teams || []).map((team) => ({ ...team, year: Number(edition.year), rating: Number(team.rating || 70) }));
  return [...teams].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))[0] || null;
}

function simulateSingleLegendMatch(slots, opponent, round = 'Campeones') {
  const selected = slots.filter((slot) => slot.player);
  const summary = calcSummary(slots);
  const squadPower = summary.avg + summary.chem * 0.08;
  const edge = squadPower - (Number(opponent?.rating) || 72) - (Math.random() * 12 - 5);
  const forGoals = Math.max(0, Math.min(5, Math.round(1.8 + edge / 18 + Math.random() * 1.6)));
  const againstGoals = Math.max(0, Math.min(5, Math.round(1.2 - edge / 20 + Math.random() * 1.8)));
  let decided = forGoals > againstGoals ? 'W' : forGoals === againstGoals ? 'D' : 'L';
  let shootout = null;
  if (decided === 'D') {
    const won = Math.random() * 100 < Math.max(12, Math.min(88, 50 + (squadPower - (Number(opponent?.rating) || 72)) * 1.5));
    decided = won ? 'W' : 'L';
    shootout = won ? 'won' : 'lost';
  }
  return {
    round,
    isGroup: false,
    opponent,
    forGoals,
    againstGoals,
    result: forGoals > againstGoals ? 'W' : forGoals === againstGoals ? 'D' : 'L',
    decided,
    shootout,
    scorers: pickScorers(selected, forGoals),
    points: null,
  };
}

// ---------------------------------------------------------------------------
// Progressive match presentation (PC Gaffer's own match feel + a SofaScore-like
// momentum strip). The tournament engine above stays the single source of truth:
// these helpers only DERIVE a deterministic minute-by-minute narrative from the
// already-computed match result (goals, scorers, opponent rating) plus the XI's
// media/química, so re-renders never jitter and the on-screen drama matches the
// authoritative final score. The momentum silhouette reuses the live MatchDay
// engine (buildMomentumBuckets) so it shares the app's real simulator look.
// ---------------------------------------------------------------------------
function hashSeed(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Small deterministic PRNG (mulberry32) so the generated events are stable for a
// given match seed — no Math.random() here, unlike the result engine above.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MATCH_FULL_MINUTE = 90;

function eventMinuteLabel(minute) {
  if (minute > MATCH_FULL_MINUTE) return `90+${minute - MATCH_FULL_MINUTE}'`;
  return `${minute}'`;
}

// Build the full progressive narrative for ONE already-decided match. Goals come
// straight from the authoritative result (count + scorers); cards, clear chances
// and saves are layered in deterministically and weighted by the XI's strength
// vs the opponent so a stronger/более-cohesive draft visibly dominates the strip.
function buildMatchTimeline(match, summary, focusIndex) {
  if (!match) return null;
  const oppId = match.opponent?.id || match.opponent?.country || 'rival';
  const seed = hashSeed(`${oppId}:${focusIndex}:${match.forGoals}:${match.againstGoals}:${match.round}`);
  const rand = mulberry32(seed);

  const oppName = match.opponent?.countryEs || match.opponent?.country || 'Rival';
  const oppShort = String(oppName).slice(0, 3).toUpperCase();

  // Influence: media + química drive how much of the ball/pressure the XI keeps.
  const squadPower = (summary?.avg || 0) + (summary?.chemistry?.total || 0) * 0.08;
  const oppRating = Number(match.opponent?.rating) || 75;
  const edge = squadPower - oppRating;
  const possessionHome = Math.max(30, Math.min(72, Math.round(52 + edge * 0.85)));

  const usedMinutes = new Set();
  const pickMinute = (lo, hi) => {
    for (let i = 0; i < 14; i += 1) {
      const m = lo + Math.floor(rand() * (hi - lo + 1));
      if (!usedMinutes.has(m)) { usedMinutes.add(m); return m; }
    }
    for (let m = lo; m <= hi; m += 1) {
      if (!usedMinutes.has(m)) { usedMinutes.add(m); return m; }
    }
    return lo;
  };

  const scorers = Array.isArray(match.scorers) ? match.scorers : [];
  const events = [];

  for (let i = 0; i < match.forGoals; i += 1) {
    events.push({ minute: pickMinute(2, 90), team: 'home', type: 'goal', player: scorers[i] || 'Tu XI' });
  }
  for (let i = 0; i < match.againstGoals; i += 1) {
    events.push({ minute: pickMinute(2, 90), team: 'away', type: 'goal', player: oppName });
  }

  // Cards: tighter, higher-stakes knockout ties carry more bookings.
  const cardCount = (match.isGroup ? 0 : 1) + (rand() < 0.45 ? 1 : 0) + (rand() < 0.18 ? 1 : 0);
  for (let i = 0; i < cardCount; i += 1) {
    // The side under more pressure (less possession) tends to foul more.
    const homeFouls = rand() > possessionHome / 100;
    const isRed = rand() < 0.08;
    events.push({
      minute: pickMinute(18, 90),
      team: homeFouls ? 'home' : 'away',
      type: isRed ? 'red_card' : 'yellow_card',
      player: homeFouls ? 'Tu XI' : oppName,
    });
  }

  // Clear chances / saves flesh out the feed; the dominant side gets more of them.
  const chanceCount = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < chanceCount; i += 1) {
    const homeChance = rand() < possessionHome / 100;
    const saved = rand() < 0.55;
    events.push({
      minute: pickMinute(4, 90),
      team: homeChance ? 'home' : 'away',
      type: saved ? 'save' : 'chance',
      player: homeChance ? 'Tu XI' : oppName,
    });
  }

  events.sort((a, b) => a.minute - b.minute);

  const buckets = buildMomentumBuckets({
    currentMinute: MATCH_FULL_MINUTE,
    fullTimeMinute: MATCH_FULL_MINUTE,
    possessionHome,
    events: events.filter((event) => event.type === 'goal'),
    seed,
    bucketCount: 46,
  });

  const homeMass = buckets.reduce((sum, b) => (b.value > 0 ? sum + b.value : sum), 0);
  const awayMass = buckets.reduce((sum, b) => (b.value < 0 ? sum - b.value : sum), 0);
  const momentumHome = homeMass + awayMass > 0
    ? Math.round((homeMass / (homeMass + awayMass)) * 100)
    : possessionHome;

  // Goal + card markers laid on the strip, with a stacking index so two events in
  // the same minute window never overlap.
  const markerStack = new Map();
  const markers = events
    .filter((event) => event.type === 'goal' || event.type === 'yellow_card' || event.type === 'red_card')
    .map((event) => {
      const left = Math.max(2, Math.min(98, (event.minute / MATCH_FULL_MINUTE) * 100));
      const bucket = Math.round(left / 6);
      const stack = markerStack.get(bucket) || 0;
      markerStack.set(bucket, stack + 1);
      return { ...event, left, stack };
    });

  // Box statistics derived from the same deterministic event stream, so the
  // "Estadísticas en vivo" bars always agree with the timeline the user sees:
  // a save = a shot on target the keeper stopped, a chance = a shot off target,
  // a goal counts on target. xG is a simple weighting of those, never random.
  const homeEv = events.filter((event) => event.team === 'home');
  const awayEv = events.filter((event) => event.team === 'away');
  const countType = (list, type) => list.filter((event) => event.type === type).length;
  const shotsHome = match.forGoals + countType(homeEv, 'chance') + countType(homeEv, 'save');
  const shotsAway = match.againstGoals + countType(awayEv, 'chance') + countType(awayEv, 'save');
  const onTargetHome = match.forGoals + countType(homeEv, 'save');
  const onTargetAway = match.againstGoals + countType(awayEv, 'save');
  const round1 = (value) => Math.round(value * 10) / 10;
  const stats = {
    possessionHome,
    possessionAway: 100 - possessionHome,
    shotsHome,
    shotsAway,
    onTargetHome,
    onTargetAway,
    xgHome: round1(match.forGoals * 0.62 + onTargetHome * 0.22 + shotsHome * 0.05),
    xgAway: round1(match.againstGoals * 0.62 + onTargetAway * 0.22 + shotsAway * 0.05),
  };

  // The headline "Último evento": prefer the last goal, otherwise the last thing
  // that happened. The assist (home goals only) is a deterministic team-mate pick
  // so the line reads like the reference ("asistencia de …") without inventing data.
  const goalEvents = events.filter((event) => event.type === 'goal');
  const lastEvent = goalEvents.length ? goalEvents[goalEvents.length - 1] : (events[events.length - 1] || null);

  return { events, buckets, markers, possessionHome, momentumHome, oppName, oppShort, edge, squadPower, oppRating, stats, lastEvent, seed };
}

function buildPartialMatchTimeline(timeline, liveMinute = MATCH_FULL_MINUTE) {
  if (!timeline) return null;
  const minute = Math.max(0, Math.min(MATCH_FULL_MINUTE, Number(liveMinute) || 0));
  if (minute >= MATCH_FULL_MINUTE) return timeline;

  const visibleEvents = timeline.events.filter((event) => event.minute <= minute);
  const homeEvents = visibleEvents.filter((event) => event.team === 'home');
  const awayEvents = visibleEvents.filter((event) => event.team === 'away');
  const countType = (list, type) => list.filter((event) => event.type === type).length;
  const homeGoals = countType(homeEvents, 'goal');
  const awayGoals = countType(awayEvents, 'goal');
  const shotsHome = homeGoals + countType(homeEvents, 'chance') + countType(homeEvents, 'save');
  const shotsAway = awayGoals + countType(awayEvents, 'chance') + countType(awayEvents, 'save');
  const onTargetHome = homeGoals + countType(homeEvents, 'save');
  const onTargetAway = awayGoals + countType(awayEvents, 'save');
  const round1 = (value) => Math.round(value * 10) / 10;
  const markers = timeline.markers.filter((marker) => marker.minute <= minute);
  const buckets = buildMomentumBuckets({
    currentMinute: minute,
    fullTimeMinute: MATCH_FULL_MINUTE,
    possessionHome: timeline.possessionHome,
    events: visibleEvents.filter((event) => event.type === 'goal'),
    seed: timeline.seed || 1,
    bucketCount: 46,
  });
  const homeMass = buckets.reduce((sum, b) => (b.value > 0 ? sum + b.value : sum), 0);
  const awayMass = buckets.reduce((sum, b) => (b.value < 0 ? sum - b.value : sum), 0);
  const momentumHome = homeMass + awayMass > 0
    ? Math.round((homeMass / (homeMass + awayMass)) * 100)
    : timeline.possessionHome;
  const goalEvents = visibleEvents.filter((event) => event.type === 'goal');
  const lastEvent = goalEvents.length ? goalEvents[goalEvents.length - 1] : (visibleEvents[visibleEvents.length - 1] || null);

  return {
    ...timeline,
    events: visibleEvents,
    markers,
    buckets,
    momentumHome,
    lastEvent,
    liveScore: { home: homeGoals, away: awayGoals },
    stats: {
      possessionHome: timeline.stats.possessionHome,
      possessionAway: timeline.stats.possessionAway,
      shotsHome,
      shotsAway,
      onTargetHome,
      onTargetAway,
      xgHome: round1(homeGoals * 0.62 + onTargetHome * 0.22 + shotsHome * 0.05),
      xgAway: round1(awayGoals * 0.62 + onTargetAway * 0.22 + shotsAway * 0.05),
    },
  };
}

const EVENT_ICONS = {
  goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
  save: '🧤',
  chance: '🎯',
};

const PENALTY_OUTCOMES = ['goal', 'miss', 'saved'];

function penaltyScoreFromRaw(raw, homeWins, seed) {
  if (raw && typeof raw === 'object') {
    const home = Number(raw.home ?? raw.homeGoals ?? raw.playerGoals ?? raw.forGoals);
    const away = Number(raw.away ?? raw.awayGoals ?? raw.opponentGoals ?? raw.againstGoals);
    if (Number.isFinite(home) && Number.isFinite(away) && home !== away) {
      if ((home > away) === homeWins) return { home, away };
    }
  }

  const highScoring = seed % 3 === 0;
  if (homeWins) return highScoring ? { home: 5, away: 4 } : { home: 4, away: 3 };
  return highScoring ? { home: 4, away: 5 } : { home: 3, away: 4 };
}

function buildPenaltyAttempts(goalCount, attempts, rand) {
  const goals = new Array(attempts).fill(false);
  const preferred = attempts - 1;
  const target = Math.max(0, Math.min(attempts, goalCount));

  if (target > 0) goals[preferred] = true;
  let remaining = target - (goals[preferred] ? 1 : 0);
  const indexes = Array.from({ length: attempts }, (_, index) => index)
    .filter((index) => index !== preferred)
    .sort(() => rand() - 0.5);

  for (let i = 0; i < indexes.length && remaining > 0; i += 1) {
    goals[indexes[i]] = true;
    remaining -= 1;
  }

  return goals.map((scored) => {
    if (scored) return { state: 'goal', label: 'Gol' };
    const state = rand() < 0.52 ? 'saved' : 'miss';
    return { state, label: state === 'saved' ? 'Parada' : 'Fuera' };
  });
}

function buildPenaltyShootout(match, timeline) {
  if (!match?.shootout && !match?.penalties) return null;
  const homeWins = (match.decided || match.result) === 'W';
  const seed = hashSeed(`${timeline?.seed || 1}:penalties:${match.round}:${match.shootout || ''}`);
  const rand = mulberry32(seed);
  const score = penaltyScoreFromRaw(match.penalties || match.shootout, homeWins, seed);
  const attempts = Math.max(5, score.home, score.away);
  const homeAttempts = buildPenaltyAttempts(score.home, attempts, rand);
  const awayAttempts = buildPenaltyAttempts(score.away, attempts, rand);
  const shots = [];

  for (let round = 0; round < attempts; round += 1) {
    shots.push({ team: 'home', round, ...homeAttempts[round] });
    shots.push({ team: 'away', round, ...awayAttempts[round] });
  }

  return {
    score,
    winner: homeWins ? 'home' : 'away',
    attempts,
    shots,
  };
}

function eventText(event, oppName) {
  const who = event.team === 'home' ? 'Tu XI' : oppName;
  switch (event.type) {
    case 'goal':
      return event.team === 'home'
        ? `Gol de ${event.player || 'tu XI'}`
        : `Gol de ${oppName}`;
    case 'yellow_card':
      return `Amarilla · ${who}`;
    case 'red_card':
      return `Roja · ${who}`;
    case 'save':
      return event.team === 'home'
        ? `Paradón del portero rival a tu XI`
        : `Tu portero despeja el peligro`;
    case 'chance':
      return `Ocasión clara · ${who}`;
    default:
      return who;
  }
}

// Deterministic "Jugador del partido". Tied to the authoritative scorers + the
// XI's ratings: the top scorer wins it, otherwise the best-rated outfield player
// on a positive result, or the keeper/best defender when the side defended. The
// 1–10 mark is derived (never random) from goals + result + chemistry.
function pickMatchMvp(lineup, match, summary, resultCode) {
  if (!lineup || !lineup.length) return null;
  const scorers = Array.isArray(match.scorers) ? match.scorers : [];
  const goalsByName = scorers.reduce((map, name) => map.set(name, (map.get(name) || 0) + 1), new Map());

  // Map scorer display names back to the actual drafted player so we can show the
  // rating, flag and goal count, not just a bare string.
  const scorerSlots = lineup
    .map((slot) => ({ slot, goals: goalsByName.get(slot.player.displayName) || goalsByName.get(slot.player.name) || 0 }))
    .filter((entry) => entry.goals > 0)
    .sort((a, b) => b.goals - a.goals || (b.slot.displayRating || 0) - (a.slot.displayRating || 0));

  let chosen = scorerSlots[0]?.slot || null;
  let goals = scorerSlots[0]?.goals || 0;
  if (!chosen) {
    // No goalscorer to honour: a win/draw rewards the best attacker, a loss the
    // best defender/keeper who limited the damage.
    const pool = resultCode === 'l'
      ? lineup.filter((slot) => DEF_GROUPS.has(slot.group))
      : lineup.filter((slot) => ATTACK_GROUPS.has(slot.group) || MID_GROUPS.has(slot.group));
    const ranked = (pool.length ? pool : lineup).slice().sort((a, b) => (b.displayRating || 0) - (a.displayRating || 0));
    chosen = ranked[0] || lineup[0];
  }
  if (!chosen) return null;

  const chemNudge = (summary?.chemistry?.total || 0) >= 70 ? 0.3 : 0;
  const base = 6.4 + goals * 0.8 + (resultCode === 'w' ? 0.6 : resultCode === 'd' ? 0.2 : -0.1) + chemNudge;
  const mark = Math.max(6, Math.min(9.8, Math.round(base * 10) / 10));
  return { slot: chosen, goals, mark };
}

// Two-to-three deterministic "claves del partido" lines. Pure narration over the
// already-decided result — possession, chemistry, scorers, shootout — so the
// panel reads like a report without ever altering the outcome.
function buildMatchKeys(match, summary, stats, resultCode, oppName) {
  const keys = [];
  const poss = stats.possessionHome;
  if (resultCode === 'w') {
    keys.push(`Tu XI mandó con el ${poss}% de posesión y firmó ${match.forGoals} ${match.forGoals === 1 ? 'gol' : 'goles'} ante ${oppName}.`);
  } else if (resultCode === 'd') {
    keys.push(`Igualdad máxima: el ${poss}% de balón no bastó para batir a ${oppName} en los 90 minutos.`);
  } else {
    keys.push(`${oppName} fue más eficaz: tu ${poss}% de posesión no se tradujo en el marcador.`);
  }

  if ((summary?.chemistry?.total || 0) >= 68) {
    keys.push(`La química del combinado (${summary.chemistry.total}) sostuvo el bloque y los automatismos.`);
  } else {
    keys.push(`Faltó acople: con ${summary.chemistry.total} de química el equipo aún busca sus enlaces.`);
  }

  if (match.shootout) {
    keys.push(`Todo se decidió en la tanda de penaltis (${match.shootout === 'won' ? 'ganada' : 'perdida'}).`);
  } else if (stats.onTargetHome >= 4) {
    keys.push(`${stats.onTargetHome} disparos a puerta reflejan el dominio ofensivo de tu XI.`);
  } else if (match.againstGoals >= 2) {
    keys.push(`${match.againstGoals} goles encajados señalan a una defensa superada por momentos.`);
  }

  return keys.slice(0, 3);
}

export default function WorldCupDraft({ onExit }) {
  const [screen, setScreen] = useState('setup');
  const [database, setDatabase] = useState({ editions: [], teams: [], players: [] });
  const [loadState, setLoadState] = useState('loading');
  // Which tier served the data ('firestore' | 'local-json' | 'emergency'), so
  // the setup screen can hint when it is running on the minimal embedded set.
  const [dataSource, setDataSource] = useState(null);
  // Bumped by the retry button to re-run the loader. A retry resets loadState to
  // 'loading' so a previous error never lingers once the retry succeeds.
  const [reloadToken, setReloadToken] = useState(0);
  const [formation, setFormation] = useState('4-3-3');
  const [filterId, setFilterId] = useState('all');
  const [draftMode, setDraftMode] = useState('single');
  const [slots, setSlots] = useState(() => makeSlots('4-3-3'));
  const [rerolls, setRerolls] = useState(3);
  const [result, setResult] = useState(null);
  const [legendEditionIndex, setLegendEditionIndex] = useState(0);
  const [legendUpgradeRerolls, setLegendUpgradeRerolls] = useState(3);
  const [legendUpgradeSlotId, setLegendUpgradeSlotId] = useState(null);
  const [legendUpgradeChoices, setLegendUpgradeChoices] = useState([]);
  // The Road upgrade reuses the exact Mundial Draft CardPicker carousel, so it
  // needs the same focused-card index + deal nonce the draft picker uses.
  const [legendUpgradeCardIndex, setLegendUpgradeCardIndex] = useState(0);
  const [legendUpgradeDealNonce, setLegendUpgradeDealNonce] = useState(0);
  const [legendGauntlet, setLegendGauntlet] = useState([]);
  // Progressive tournament reveal. `revealIndex` is the match currently in focus
  // (0-based into result.matches); `matchRevealed` flips to true once its score
  // has been simulated on screen. Together they form a small state machine so the
  // whole Mundial is uncovered one match at a time instead of all at once.
  const [revealIndex, setRevealIndex] = useState(0);
  const [matchRevealed, setMatchRevealed] = useState(false);
  // Mobile/Figma live-match tab: pressing “Simular partido” opens a separate
  // in-app live screen. The tournament reveal count advances only when that
  // live screen is finished and the user returns to the fixture list.
  const [liveMatchOpen, setLiveMatchOpen] = useState(false);
  const [liveMatchFinished, setLiveMatchFinished] = useState(false);
  // Card-picker state: which empty slot is being drafted, its 5 candidate cards,
  // the focused card, and a nonce that retriggers the deal/flip animations.
  const [activeSlotId, setActiveSlotId] = useState(null);
  const [cardChoices, setCardChoices] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [cardDealNonce, setCardDealNonce] = useState(0);
  // 'select' = picking a card for an empty slot (or after a reroll); 'replace' =
  // a filled slot was clicked and we are confirming whether to spend a reroll
  // (which loses the current player and deals five fresh cards).
  const [pickerPhase, setPickerPhase] = useState('select');

  useEffect(() => {
    let cancelled = false;
    // Firestore is the primary source; the loader falls back to the full bundled
    // JSON, then to a tiny embedded emergency dataset, so the game can always
    // start a draft even offline / behind a stale cache. Re-runs on retry.
    setLoadState('loading');
    loadWorldCupDraftDatabase()
      .then(({ database: loaded, source }) => {
        if (cancelled) return;
        setDatabase(loaded);
        setDataSource(source);
        setLoadState('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        // The embedded emergency tier means this is effectively unreachable, but
        // if it ever fires, log full detail so the failure is diagnosable on a
        // real device instead of being swallowed.
        if (typeof console !== 'undefined') {
          console.error('[WorldCupDraft] No se pudo cargar la base del draft:', error?.message || error);
        }
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const retryLoad = () => setReloadToken((value) => value + 1);

  useEffect(() => {
    if (!liveMatchOpen) return;
    const scrollTop = () => window.scrollTo({ top: 0, behavior: 'auto' });
    scrollTop();
    const raf = requestAnimationFrame(scrollTop);
    const timer = window.setTimeout(scrollTop, 60);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [liveMatchOpen]);

  const activeFilter = FILTERS.find((filter) => filter.id === filterId) || FILTERS[0];
  const legendEditions = useMemo(() => sortedWorldCupEditions(database), [database]);
  const currentLegendEdition = legendEditions[legendEditionIndex] || legendEditions[0] || null;
  // Road to Mundial Legend builds its INITIAL XI (the "Legend" team) from cards of
  // EVERY World Cup edition: the draft board is only ever shown for that first
  // team creation, so legend mode always drafts all-edition here (FILTERS[0]).
  // The chronological road itself — which national sides you face each Mundial and
  // the strict-edition upgrades between them — stays edition-filtered downstream.
  const effectiveFilter = draftMode === 'legend' ? FILTERS[0] : activeFilter;
  // The first Road team is fixed-name "Legend"; the classic Un Mundial draft keeps
  // the neutral "Tu XI" label everywhere a side name is shown.
  const teamName = draftMode === 'legend' ? 'Legend' : 'Tu XI';
  const filteredTeams = useMemo(() => {
    if (draftMode === 'legend' && currentLegendEdition) return teamsForEdition(database, currentLegendEdition.year);
    return database.teams.filter((team) => team.year >= activeFilter.min && team.year <= activeFilter.max);
  }, [database, activeFilter, draftMode, currentLegendEdition]);
  const pickedSlots = useMemo(() => slots.filter((slot) => slot.player), [slots]);
  const pickedIds = useMemo(() => new Set(pickedSlots.map((slot) => slot.player.id)), [pickedSlots]);
  const pickedNames = useMemo(() => new Set(pickedSlots.map((slot) => comparableName(slot.player.name))), [pickedSlots]);
  const summary = useMemo(() => calcSummary(slots), [slots]);
  const isComplete = summary.picked >= 11;
  const activeSlot = useMemo(() => slots.find((slot) => slot.id === activeSlotId) || null, [slots, activeSlotId]);
  const legendUpgradeSlot = useMemo(() => slots.find((slot) => slot.id === legendUpgradeSlotId) || null, [slots, legendUpgradeSlotId]);

  const startDraft = () => {
    setSlots(makeSlots(formation));
    // The initial Road to Mundial Legend draft (the "Legend" team) gets exactly
    // one reroll; the classic Un Mundial draft keeps its three.
    setRerolls(draftMode === 'legend' ? 1 : 3);
    setResult(null);
    setRevealIndex(0);
    setMatchRevealed(false);
    setLiveMatchOpen(false);
    setLiveMatchFinished(false);
    setLegendEditionIndex(0);
    setLegendUpgradeRerolls(3);
    setLegendUpgradeSlotId(null);
    setLegendUpgradeChoices([]);
    setLegendGauntlet([]);
    closePicker();
    setScreen('draft');
    // Funnel: user committed to a formation/era and entered the draft board.
    trackEvent('wc_draft_start', { formation, era_filter: draftMode === 'legend' ? 'legend-all' : filterId, mode: draftMode });
  };

  // Open the card picker for a slot.
  //  - Empty slot  -> 'select' mode: deal 5 position-compatible cards, no reroll.
  //  - Filled slot -> 'replace' mode: show the current player and the reroll
  //    confirmation. No new cards are dealt until the reroll is confirmed, so
  //    clicking a filled slot is non-destructive until the user commits.
  const openPicker = (slotId) => {
    const slot = slots.find((item) => item.id === slotId);
    if (!slot) return;
    if (slot.player) {
      setActiveSlotId(slotId);
      setCardChoices([]);
      setActiveCardIndex(0);
      setPickerPhase('replace');
      return;
    }
    const choices = buildChoices(database.players, slot, effectiveFilter, pickedIds, pickedNames);
    if (!choices.length) return;
    setCardChoices(choices);
    setActiveSlotId(slotId);
    setActiveCardIndex(0);
    setPickerPhase('select');
    setCardDealNonce((value) => value + 1);
  };

  const closePicker = () => {
    setActiveSlotId(null);
    setCardChoices([]);
    setActiveCardIndex(0);
    setPickerPhase('select');
  };

  // Place the focused card into its slot. Position-compatible by construction,
  // so there is never an out-of-position penalty here. The slot is always empty
  // at this point (empty slot, or a filled slot just emptied by a reroll).
  const selectActiveCard = () => {
    const player = cardChoices[activeCardIndex];
    if (!player || !activeSlotId) return;
    const slotLabel = activeSlot?.label;
    setSlots((prev) => prev.map((slot) => (
      slot.id === activeSlotId && !slot.player
        ? { ...slot, player, displayRating: player.rating, adapted: false }
        : slot
    )));
    closePicker();
    // Funnel: a card was placed. We log the position slot and running count only —
    // never the player's name (treated as non-trackable game content).
    const pickedAfter = pickedSlots.length + 1;
    trackEvent('wc_draft_pick', { slot: slotLabel, picked: pickedAfter });
    if (pickedAfter >= 11) {
      trackEvent('wc_draft_complete', { formation });
    }
  };

  // Reroll a FILLED slot: this is the only way to spend a reroll. It discards
  // (loses) the current player, empties the slot, and deals five fresh
  // compatible cards for that position. The slot stays empty until one is
  // picked. Exclusions are computed from the OTHER picked players so the dropped
  // player can resurface in the new deck.
  const rerollPosition = () => {
    if (rerolls <= 0 || pickerPhase !== 'replace' || !activeSlot || !activeSlot.player) return;
    const others = slots.filter((slot) => slot.player && slot.id !== activeSlotId);
    const exclusionIds = new Set(others.map((slot) => slot.player.id));
    const exclusionNames = new Set(others.map((slot) => comparableName(slot.player.name)));
    const choices = buildChoices(database.players, activeSlot, effectiveFilter, exclusionIds, exclusionNames);
    if (!choices.length) return;
    setRerolls((value) => value - 1);
    setSlots((prev) => prev.map((slot) => (
      slot.id === activeSlotId ? { ...slot, player: null, displayRating: null, adapted: false } : slot
    )));
    setCardChoices(choices);
    setActiveCardIndex(0);
    setPickerPhase('select');
    setCardDealNonce((value) => value + 1);
  };

  const simulate = () => {
    trackEvent('wc_draft_tournament_start', { formation, era_filter: draftMode === 'legend' ? `legend-${currentLegendEdition?.year || 'year'}` : filterId, mode: draftMode });
    const campaign = simulateCampaign(slots, filteredTeams.length ? filteredTeams : database.teams);
    // The full campaign is computed up front (single source of truth) but the
    // viewer starts on the first pending match and reveals one at a time. The
    // final result is identical to before — only the pacing changes.
    setResult(campaign);
    setRevealIndex(0);
    setMatchRevealed(false);
    setLiveMatchOpen(false);
    setLiveMatchFinished(false);
    setScreen('tournament');
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    // Funnel close: outcome of the simulated Mundial. Only the coarse result
    // (champion + how far they got) is logged.
    trackEvent('wc_draft_tournament_finish', {
      champion: Boolean(campaign?.champion),
      eliminated_round: campaign?.eliminatedRound || undefined,
    });
  };

  // Open a dedicated live simulation tab/screen. The score is not revealed in
  // the tournament view until the user finishes this live screen and returns.
  const playCurrentMatch = () => {
    setLiveMatchOpen(true);
    setLiveMatchFinished(false);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  };

  const finishLiveMatch = () => {
    setLiveMatchFinished(true);
  };

  const returnFromLiveMatch = () => {
    if (!result?.matches?.length) return;
    const isLast = revealIndex >= result.matches.length - 1;
    setLiveMatchOpen(false);
    setLiveMatchFinished(false);
    if (isLast) {
      setMatchRevealed(true);
    } else {
      setRevealIndex((value) => Math.min(value + 1, result.matches.length - 1));
      setMatchRevealed(false);
    }
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  };

  // Legacy inline-next hook retained for desktop/QA fallback if a revealed card is
  // ever shown in the tournament screen before the final match.
  const advanceMatch = () => {
    setRevealIndex((value) => value + 1);
    setMatchRevealed(false);
  };

  // The whole bracket has been revealed match by match: hand off to the existing
  // full summary screen, or to the Road to Mundial Legend progression layer.
  const finishTournament = () => {
    if (draftMode === 'legend') {
      if (!result?.champion) {
        setScreen('result');
        return;
      }
      const isLastEdition = legendEditionIndex >= legendEditions.length - 1;
      if (isLastEdition) {
        setLegendGauntlet(legendEditions.map((edition) => ({ edition, opponent: championLikeTeam(edition) })).filter((item) => item.opponent));
        setScreen('legend-gauntlet');
        return;
      }
      setLegendUpgradeRerolls(3);
      setLegendUpgradeSlotId(null);
      setLegendUpgradeChoices([]);
      setScreen('legend-upgrade');
      return;
    }
    setScreen('result');
  };

  // Clicking a pitch slot during an upgrade deals exactly 3 strict-edition
  // candidates and opens the SAME fullscreen CardPicker carousel used by the
  // Mundial Draft (select phase), instead of a separate compact grid.
  const selectLegendUpgradeSlot = (slotId) => {
    const slot = slots.find((item) => item.id === slotId);
    if (!slot || legendUpgradeRerolls <= 0 || !currentLegendEdition) return;
    const others = slots.filter((item) => item.player && item.id !== slotId);
    const exclusionIds = new Set(others.map((item) => item.player.id));
    const exclusionNames = new Set(others.map((item) => comparableName(item.player.name)));
    const choices = buildStrictEditionChoices(database.players, slot, currentLegendEdition.year, exclusionIds, exclusionNames, 3);
    setLegendUpgradeSlotId(slotId);
    setLegendUpgradeChoices(choices);
    setLegendUpgradeCardIndex(0);
    // Only retrigger the deal/flip animation when there are cards to show; an
    // empty hand keeps the pitch visible with the "no candidates" notice.
    if (choices.length) setLegendUpgradeDealNonce((value) => value + 1);
  };

  // Close the upgrade picker without spending an opportunity (back to the pitch).
  const closeLegendUpgradePicker = () => {
    setLegendUpgradeSlotId(null);
    setLegendUpgradeChoices([]);
    setLegendUpgradeCardIndex(0);
  };

  const applyLegendUpgrade = (player) => {
    if (!player || !legendUpgradeSlotId || legendUpgradeRerolls <= 0) return;
    setSlots((prev) => prev.map((slot) => (
      slot.id === legendUpgradeSlotId ? { ...slot, player, displayRating: player.rating, adapted: false } : slot
    )));
    const remaining = Math.max(0, legendUpgradeRerolls - 1);
    setLegendUpgradeRerolls(remaining);
    setLegendUpgradeSlotId(null);
    setLegendUpgradeChoices([]);
    setLegendUpgradeCardIndex(0);
    if (remaining === 0) {
      window.setTimeout(() => continueLegendRoad(), 450);
    }
  };

  // Place the focused carousel card into the upgraded slot (CardPicker onSelect).
  const selectLegendUpgradeCard = () => {
    const player = legendUpgradeChoices[legendUpgradeCardIndex];
    if (player) applyLegendUpgrade(player);
  };

  const continueLegendRoad = () => {
    const nextIndex = Math.min(legendEditionIndex + 1, Math.max(0, legendEditions.length - 1));
    const nextEdition = legendEditions[nextIndex];
    setLegendEditionIndex(nextIndex);
    setLegendUpgradeRerolls(3);
    setLegendUpgradeSlotId(null);
    setLegendUpgradeChoices([]);
    setRevealIndex(0);
    setMatchRevealed(false);
    setLiveMatchOpen(false);
    setLiveMatchFinished(false);
    if (nextEdition) {
      const nextTeams = teamsForEdition(database, nextEdition.year);
      const campaign = simulateCampaign(slots, nextTeams.length ? nextTeams : database.teams);
      setResult(campaign);
      setScreen('tournament');
    } else {
      setScreen('legend-gauntlet');
    }
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  };

  const simulateLegendGauntlet = () => {
    const matches = legendGauntlet.map(({ edition, opponent }) => simulateSingleLegendMatch(slots, opponent, `Campeón ${edition.year}`));
    const wonAll = matches.every((match) => match.decided === 'W');
    if (wonAll) {
      setScreen('legend-champion');
      return;
    }
    const firstLoss = matches.find((match) => match.decided !== 'W');
    setResult({
      champion: false,
      eliminatedRound: firstLoss?.round || 'Campeones históricos',
      status: `Reto terminado ante ${firstLoss?.opponent?.countryEs || firstLoss?.opponent?.country || 'un campeón histórico'}`,
      score: matches.filter((match) => match.decided === 'W').length * 300,
      matches,
      groupMatches: [],
      knockoutMatches: matches,
      group: { points: 0, qualified: true, w: 0, d: 0, l: 0, gf: 0, ga: 0 },
      record: {
        w: matches.filter((match) => match.decided === 'W').length,
        d: matches.filter((match) => match.result === 'D').length,
        l: matches.filter((match) => match.decided === 'L').length,
        gf: matches.reduce((sum, match) => sum + match.forGoals, 0),
        ga: matches.reduce((sum, match) => sum + match.againstGoals, 0),
      },
    });
    setScreen('result');
  };

  const shareLegendImage = async () => {
    const text = `Campeón de los Mundiales en PC Gaffer · XI ${formation} · Media ${summary.avg} · Química ${summary.chemistry.total}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Road to Mundial Legend', text });
      else if (navigator.clipboard) await navigator.clipboard.writeText(text);
    } catch {
      // Native share can be cancelled by the user; keep the button safe/no-op.
    }
  };

  const resetDraft = () => {
    setScreen('setup');
    setSlots(makeSlots(formation));
    setRerolls(3);
    setResult(null);
    setRevealIndex(0);
    setMatchRevealed(false);
    setLiveMatchOpen(false);
    setLiveMatchFinished(false);
    setLegendEditionIndex(0);
    setLegendUpgradeRerolls(3);
    setLegendUpgradeSlotId(null);
    setLegendUpgradeChoices([]);
    setLegendGauntlet([]);
    closePicker();
  };

  return (
    <main className="worldcup-draft" data-worldcup-draft data-screen={screen} data-worldcup-mode={draftMode} data-worldcup-team-name={teamName} data-worldcup-rerolls={rerolls}>
      <div className="worldcup-draft__stadium" aria-hidden="true" />
      {!(screen === 'tournament' && liveMatchOpen) && (
        <header className="worldcup-draft__topbar">
          <button className="worldcup-draft__ghost" type="button" onClick={onExit}>
            <ArrowLeft size={18} /> Menú
          </button>
          <div className="worldcup-draft__title">
            <span className="worldcup-draft__kicker">PC Gaffer Tournament Lab</span>
            <h1>Mundial Draft</h1>
          </div>
          <div className="worldcup-draft__top-stat">
            <Trophy size={16} />
            <span>
              {screen === 'draft'
                ? `${summary.picked}/11`
                : screen === 'tournament' && result
                  ? `${Math.min(revealIndex + 1, result.matches.length)}/${result.matches.length}`
                  : 'Mundial completo'}
            </span>
          </div>
        </header>
      )}

      {screen === 'setup' && (
        <section className="worldcup-draft__setup">
          <div className="worldcup-draft__hero-panel">
            <span className="worldcup-draft__kicker">Mundial completo</span>
            <h2>Construye un XI imposible con leyendas de todos los Mundiales.</h2>
            <p>Ronda a ronda recibes una selección histórica, eliges un jugador y lo encajas en tu sistema. Después juegas un Mundial entero: tres partidos de grupo y la fase eliminatoria hasta la final.</p>
            <div className="worldcup-draft__chips">
              <span>Fase de grupos</span>
              <span>Octavos a Final</span>
              <span>Química país + estilo</span>
            </div>
          </div>

          <div className="worldcup-draft__setup-panel">
            {loadState === 'error' && (
              <div className="worldcup-draft__error" role="alert">
                <span>No se pudo cargar la base del draft.</span>
                <button className="worldcup-draft__retry" type="button" onClick={retryLoad}>
                  <Repeat2 size={16} /> Reintentar
                </button>
              </div>
            )}
            {loadState === 'ready' && dataSource === 'emergency' && (
              <div className="worldcup-draft__notice" role="status">
                Sin conexión con la base completa: jugarás con una selección reducida de leyendas.
                <button className="worldcup-draft__retry worldcup-draft__retry--ghost" type="button" onClick={retryLoad}>
                  <Repeat2 size={16} /> Cargar base completa
                </button>
              </div>
            )}
            <div className="worldcup-draft__field" data-worldcup-mode-select>
              <label>Modo Mundial</label>
              <div className="worldcup-draft__mode-grid">
                <button type="button" className={draftMode === 'single' ? 'is-active' : ''} data-worldcup-draft-mode="single" onClick={() => setDraftMode('single')}>
                  <strong>Un Mundial</strong>
                  <span>Draft clásico: arma un XI y disputa un Mundial completo.</span>
                </button>
                <button type="button" className={draftMode === 'legend' ? 'is-active' : ''} data-worldcup-draft-mode="legend" onClick={() => setDraftMode('legend')}>
                  <strong>Road to Mundial Legend</strong>
                  <span>Crea tu equipo «Legend» con leyendas de todos los Mundiales y recorre la historia edición a edición.</span>
                </button>
              </div>
            </div>
            {draftMode === 'legend' && (
              <div className="worldcup-draft__notice" data-worldcup-legend-start-year>
                Ruta Legend: tu primer draft crea el equipo «Legend» con cartas de todos los Mundiales y solo 1 reroll. Después la ruta arranca en {legendEditions[0]?.year || 1930} y, si ganas, recibirás 3 mejoras de esa edición antes del siguiente Mundial.
              </div>
            )}
            <div className="worldcup-draft__field">
              <label>Formación</label>
              <div className="worldcup-draft__segmented">
                {Object.keys(FORMATION_LAYOUTS).map((item) => (
                  <button key={item} type="button" className={formation === item ? 'is-active' : ''} onClick={() => setFormation(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
            {draftMode === 'single' && (
              <div className="worldcup-draft__field">
                <label>Filtro de edición</label>
                <div className="worldcup-draft__segmented worldcup-draft__segmented--wrap">
                  {FILTERS.map((filter) => (
                    <button key={filter.id} type="button" className={filterId === filter.id ? 'is-active' : ''} onClick={() => setFilterId(filter.id)}>
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button className="worldcup-draft__primary" type="button" onClick={startDraft} disabled={loadState !== 'ready'}>
              {loadState === 'loading' ? 'Cargando base...' : <><Sparkles size={18} /> Empezar draft</>}
            </button>
          </div>
        </section>
      )}

      {screen === 'draft' && (
        <section className="worldcup-draft__draft">
          <DraftPitch
            slots={slots}
            formation={formation}
            activeSlotId={activeSlotId}
            onSlotClick={openPicker}
          />

          <SummaryPanel
            summary={summary}
            onSimulate={simulate}
            isComplete={isComplete}
          />

          {activeSlot && (
            <CardPicker
              slot={activeSlot}
              phase={pickerPhase}
              currentPlayer={activeSlot.player}
              otherPlayers={pickedSlots.filter((slot) => slot.id !== activeSlotId).map((slot) => slot.player)}
              choices={cardChoices}
              activeIndex={activeCardIndex}
              dealNonce={cardDealNonce}
              rerolls={rerolls}
              onNavigate={(index) => {
                // Circular queue: the 5 dealt cards loop endlessly until one is
                // selected, so navigation wraps instead of clamping at the ends.
                const len = cardChoices.length;
                if (!len) return;
                setActiveCardIndex(((index % len) + len) % len);
              }}
              onSelect={selectActiveCard}
              onReroll={rerollPosition}
              onClose={closePicker}
            />
          )}
        </section>
      )}

      {screen === 'tournament' && result && (
        liveMatchOpen ? (
          <LiveMatchStage
            result={result}
            summary={summary}
            slots={slots}
            teamName={teamName}
            revealIndex={revealIndex}
            finished={liveMatchFinished}
            onFinishLive={finishLiveMatch}
            onReturn={returnFromLiveMatch}
            onExit={onExit}
          />
        ) : (
          <TournamentStage
            result={result}
            summary={summary}
            formation={formation}
            slots={slots}
            revealIndex={revealIndex}
            matchRevealed={matchRevealed}
            onSimulateMatch={playCurrentMatch}
            onNextMatch={advanceMatch}
            onFinish={finishTournament}
            onExit={onExit}
          />
        )
      )}

      {screen === 'legend-upgrade' && currentLegendEdition && (
        <>
          <LegendUpgradeStage
            slots={slots}
            formation={formation}
            edition={currentLegendEdition}
            nextEdition={legendEditions[legendEditionIndex + 1]}
            rerolls={legendUpgradeRerolls}
            activeSlotId={legendUpgradeSlotId}
            choices={legendUpgradeChoices}
            onSlotClick={selectLegendUpgradeSlot}
            onSkip={continueLegendRoad}
          />

          {legendUpgradeSlot && legendUpgradeChoices.length > 0 && (
            // Exactly the Mundial Draft card-choice system: same CardPicker in
            // 'select' phase, fed the 3 strict-edition candidates for this slot.
            <CardPicker
              slot={legendUpgradeSlot}
              phase="select"
              currentPlayer={legendUpgradeSlot.player}
              otherPlayers={pickedSlots.filter((slot) => slot.id !== legendUpgradeSlotId).map((slot) => slot.player)}
              choices={legendUpgradeChoices}
              activeIndex={legendUpgradeCardIndex}
              dealNonce={legendUpgradeDealNonce}
              rerolls={0}
              onNavigate={(index) => {
                const len = legendUpgradeChoices.length;
                if (!len) return;
                setLegendUpgradeCardIndex(((index % len) + len) % len);
              }}
              onSelect={selectLegendUpgradeCard}
              onReroll={() => {}}
              onClose={closeLegendUpgradePicker}
            />
          )}
        </>
      )}

      {screen === 'legend-gauntlet' && (
        <LegendGauntletStage
          slots={slots}
          formation={formation}
          opponents={legendGauntlet}
          onStart={simulateLegendGauntlet}
        />
      )}

      {screen === 'legend-champion' && (
        <LegendChampionStage
          slots={slots}
          formation={formation}
          summary={summary}
          onShare={shareLegendImage}
          onReset={resetDraft}
        />
      )}

      {screen === 'result' && result && (
        <section className="worldcup-draft__result" data-worldcup-final-summary>
          <div className={`worldcup-draft__result-head${result.champion ? ' is-champion' : ''}`}>
            <div className="worldcup-draft__result-badge">{result.champion ? <Trophy size={34} /> : <Dice5 size={30} />}</div>
            <span className="worldcup-draft__kicker">Mundial completo</span>
            <h2>{result.status}</h2>
            <div className="worldcup-draft__result-stats">
              <div><b>{result.score}</b><span>Puntos</span></div>
              <div><b>{result.record.w}-{result.record.d}-{result.record.l}</b><span>V-E-D</span></div>
              <div><b>{result.record.gf}:{result.record.ga}</b><span>Goles</span></div>
            </div>
            <div className="worldcup-draft__actions">
              <button className="worldcup-draft__primary" type="button" onClick={resetDraft}>
                <Dice5 size={18} /> Nuevo draft
              </button>
              <button className="worldcup-draft__ghost worldcup-draft__ghost--block" type="button" onClick={onExit}>
                Volver al menú
              </button>
            </div>
          </div>
          <div className="worldcup-draft__fixtures">
            <div className="worldcup-draft__fixtures-block">
              <div className="worldcup-draft__fixtures-head">
                <span className="worldcup-draft__kicker">Fase de grupos</span>
                <em className={`worldcup-draft__group-tag${result.group.qualified ? ' is-pass' : ' is-out'}`}>
                  {result.group.points} pts · {result.group.w}-{result.group.d}-{result.group.l} · {result.group.qualified ? 'Clasificado' : 'Eliminado'}
                </em>
              </div>
              {result.groupMatches.map((match, index) => (
                <FixtureRow key={`g-${index}`} match={match} />
              ))}
            </div>

            {result.knockoutMatches.length > 0 && (
              <div className="worldcup-draft__fixtures-block">
                <div className="worldcup-draft__fixtures-head">
                  <span className="worldcup-draft__kicker">Fase eliminatoria</span>
                </div>
                {result.knockoutMatches.map((match, index) => (
                  <FixtureRow key={`k-${index}`} match={match} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

// Full-screen / bottom-sheet card picker.
//  - 'select' phase: deals exactly 5 position-compatible cards as a swipeable
//    stack (the big featured card + arrows), each previewing the chemistry it
//    would add. Selecting fills the slot. No reroll here.
//  - 'replace' phase (a filled slot was clicked): shows the current player and a
//    warning that rerolling LOSES them; the only action is "Rerolear hueco (N)".
function CardPicker({ slot, phase, currentPlayer, otherPlayers, choices, activeIndex, dealNonce, rerolls, onNavigate, onSelect, onReroll, onClose }) {
  const { i18n: i18nHook } = useTranslation();
  const lang = String(i18nHook?.language || 'es').slice(0, 2).toLowerCase();
  const isReplace = phase === 'replace';
  const active = choices[activeIndex] || null;
  const roleName = SLOT_FULL_NAMES[slot.label] || slot.label;
  const slotLabelText = localizePositionToken(slot.label, lang);
  const preview = active ? chemistryPreview(active, otherPlayers) : null;
  const dragRef = useRef(null);
  const [drag, setDrag] = useState({ active: false, x: 0, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0, peek: 0 });
  // Track which of the 5 cards the user has already cycled past so we can show a
  // subtle "vuelta completa" marker once they loop back to the starting card.
  const [seen, setSeen] = useState([0]);

  useEffect(() => {
    setDrag({ active: false, x: 0, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0, peek: 0 });
    dragRef.current = null;
  }, [activeIndex, dealNonce]);

  // Reset the seen-tracker whenever a fresh hand is dealt (new slot or reroll).
  useEffect(() => {
    setSeen([0]);
  }, [dealNonce]);

  useEffect(() => {
    setSeen((prev) => (prev.includes(activeIndex) ? prev : [...prev, activeIndex]));
  }, [activeIndex]);

  // The carousel has come full circle: every card has been viewed and we are
  // back on the first one. Used to render the restart marker, never to gate input.
  const completedLoop = choices.length > 1 && seen.length >= choices.length && activeIndex === 0;

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (isReplace) return;
      if (event.key === 'ArrowLeft') onNavigate(activeIndex - 1);
      else if (event.key === 'ArrowRight') onNavigate(activeIndex + 1);
      else if (event.key === 'Enter') onSelect();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, isReplace, onNavigate, onSelect, onClose]);

  const updateDrag = (dx, dy) => {
    const easedX = Math.max(-180, Math.min(180, dx));
    const easedY = Math.max(-120, Math.min(120, dy));
    const rotateY = Math.max(-16, Math.min(16, dx / 14));
    const rotateX = Math.max(-13, Math.min(13, -dy / 16));
    const rotateZ = Math.max(-9, Math.min(9, dx / 28));
    const peek = Math.min(1, Math.hypot(dx, dy) / 132);
    setDrag({ active: true, x: easedX, y: easedY, rotateX, rotateY, rotateZ, peek });
  };

  const endDrag = (event) => {
    const info = dragRef.current;
    if (!info) return;
    if (event.currentTarget?.releasePointerCapture) {
      try { event.currentTarget.releasePointerCapture(info.pointerId); } catch { /* Pointer may already be released. */ }
    }

    dragRef.current = null;
    const threshold = Math.min(104, Math.max(72, window.innerWidth * 0.22));

    // Past the threshold the front card rotates out to the back of the queue and
    // the next/previous one snaps in. Navigation wraps, so there is no dead end:
    // a small drag just springs the card back to centre.
    if (Math.abs(info.dx) > threshold || Math.abs(info.dy) > threshold) {
      setDrag({ active: false, x: 0, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0, peek: 0 });
      const horizontal = Math.abs(info.dx) >= Math.abs(info.dy);
      onNavigate(horizontal ? activeIndex + (info.dx < 0 ? 1 : -1) : activeIndex + (info.dy < 0 ? 1 : -1));
      return;
    }
    setDrag({ active: false, x: 0, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0, peek: 0 });
  };

  const dragProps = !isReplace && active ? {
    onPointerDown: (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dx: 0,
        dy: 0,
      };
      updateDrag(0, 0);
    },
    onPointerMove: (event) => {
      const info = dragRef.current;
      if (!info || info.pointerId !== event.pointerId) return;
      const dx = event.clientX - info.startX;
      const dy = event.clientY - info.startY;
      info.dx = dx;
      info.dy = dy;
      updateDrag(dx, dy);
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  } : {};

  const dragStyle = {
    '--drag-x': `${drag.x}px`,
    '--drag-y': `${drag.y}px`,
    '--drag-rotate-x': `${drag.rotateX}deg`,
    '--drag-rotate-y': `${drag.rotateY}deg`,
    '--drag-rotate-z': `${drag.rotateZ}deg`,
    '--drag-peek': drag.peek,
  };

  return (
    <div
      className={`worldcup-draft__picker${isReplace ? '' : ' worldcup-draft__picker--stage'}`}
      data-draft-card-picker
      data-slot-label={slot.label}
      data-replacement-mode={isReplace ? 'true' : 'false'}
      role="dialog"
      aria-modal="true"
      aria-label={isReplace ? `Reemplazar ${roleName}` : `Elegir ${roleName}`}
    >
      <button className="worldcup-draft__picker-backdrop" type="button" aria-label="Cerrar" onClick={onClose} />

      {isReplace ? (
        // Replacement mode keeps the explicit panel: a clear warning plus the
        // reroll/keep decision is safer surfaced as a sheet than as a bare card.
        <div className="worldcup-draft__picker-sheet">
          <header className="worldcup-draft__picker-head">
            <div>
              <span className="worldcup-draft__kicker">Reemplazar jugador</span>
              <h2>{roleName} <em>{slotLabelText}</em></h2>
            </div>
            <button className="worldcup-draft__picker-close" type="button" onClick={onClose} aria-label="Cerrar selector">
              <X size={20} />
            </button>
          </header>

          <div className="worldcup-draft__replace" data-draft-replace>
            <p className="worldcup-draft__replace-warn">
              <AlertTriangle size={16} />
              Si reroleas pierdes a <strong>{shortName(currentPlayer)}</strong> y aparecen 5 cartas nuevas para este hueco.
            </p>
            <div className="worldcup-draft__picker-stage worldcup-draft__picker-stage--single">
              <FeaturedCard player={currentPlayer} otherPlayers={otherPlayers} variant="current" />
            </div>
            <div className="worldcup-draft__picker-actions worldcup-draft__picker-actions--replace">
              <button
                className="worldcup-draft__reroll-btn"
                type="button"
                data-draft-reroll
                onClick={onReroll}
                disabled={rerolls <= 0}
                title={rerolls > 0 ? 'Pierdes al jugador actual y se reparten 5 cartas nuevas' : 'No quedan rerolls'}
              >
                <Repeat2 size={18} /> Rerolear hueco ({rerolls})
              </button>
              <button className="worldcup-draft__ghost worldcup-draft__ghost--block" type="button" onClick={onClose}>
                Conservar a {shortName(currentPlayer)}
              </button>
            </div>
            {rerolls <= 0 && <p className="worldcup-draft__replace-empty">No te quedan rerolls.</p>}
          </div>
        </div>
      ) : (
        // Select mode: a clean fullscreen card-stage. No panel chrome — only the
        // hero card on a dark/blurred backdrop. The role label and close are tiny
        // ghost elements floating over the backdrop; progress + select live INSIDE
        // the card bottom; the side arrows are near-invisible edge hotspots.
        <>
          <span className="worldcup-draft__stage-role" aria-hidden="true">{roleName} <em>{slotLabelText}</em></span>
          <button className="worldcup-draft__stage-close" type="button" onClick={onClose} aria-label="Cerrar selector">
            <X size={18} />
          </button>

          <div className="worldcup-draft__picker-sheet worldcup-draft__picker-sheet--bare">
            <div className="worldcup-draft__picker-stage">
              <button
                className="worldcup-draft__picker-arrow worldcup-draft__picker-arrow--ghost"
                type="button"
                data-draft-prev
                onClick={() => onNavigate(activeIndex - 1)}
                aria-label="Carta anterior"
              >
                <ChevronLeft size={26} />
              </button>

              <div className="worldcup-draft__stage-card">
                <FeaturedCard
                  key={`${dealNonce}-${activeIndex}`}
                  player={active}
                  otherPlayers={otherPlayers}
                  preview={preview}
                  featured
                  chemInline={false}
                  dragProps={dragProps}
                  dragStyle={dragStyle}
                  isDragging={drag.active}
                >
                  {active && (
                    <div className="worldcup-draft__card-footer">
                      <div className="worldcup-draft__card-chem" data-chem-preview>
                        {preview && (preview.country || preview.style) ? (
                          <>
                            {preview.country && (
                              <em className="worldcup-draft__chem-pill worldcup-draft__chem-pill--country">
                                <i aria-hidden="true">{preview.country.flag}</i> +País {preview.country.label}
                              </em>
                            )}
                            {preview.style && (
                              <em className="worldcup-draft__chem-pill worldcup-draft__chem-pill--style" data-style={preview.style.style}>
                                +Estilo {preview.style.style}
                              </em>
                            )}
                          </>
                        ) : (
                          <em className="worldcup-draft__chem-pill worldcup-draft__chem-pill--none">Sin nueva química</em>
                        )}
                      </div>

                      <button
                        className="worldcup-draft__card-select"
                        type="button"
                        data-draft-select-active
                        onClick={onSelect}
                        onPointerDown={(event) => event.stopPropagation()}
                        disabled={!active}
                      >
                        <Sparkles size={16} /> Elegir {active ? shortName(active) : ''}
                      </button>

                      {/* Tiny in-card progress notch: one dot per dealt card, a
                          loop marker once the carousel comes full circle, and the
                          n/total count — all integrated, never a separate UI row. */}
                      <div className="worldcup-draft__card-progress" data-draft-progress>
                        <span className="worldcup-draft__picker-dots" aria-hidden="true">
                          {choices.map((player, index) => (
                            <i
                              key={player.id}
                              className={`worldcup-draft__picker-dot${index === activeIndex ? ' is-on' : ''}${seen.includes(index) ? ' is-seen' : ''}`}
                            />
                          ))}
                        </span>
                        <span className={`worldcup-draft__picker-loop${completedLoop ? ' is-on' : ''}`} aria-hidden={!completedLoop}>
                          <Repeat2 size={11} /> Vuelta
                        </span>
                        <span className="worldcup-draft__picker-count">{activeIndex + 1}/{choices.length}</span>
                      </div>
                    </div>
                  )}
                </FeaturedCard>
              </div>

              <button
                className="worldcup-draft__picker-arrow worldcup-draft__picker-arrow--ghost"
                type="button"
                data-draft-next
                onClick={() => onNavigate(activeIndex + 1)}
                aria-label="Carta siguiente"
              >
                <ChevronRight size={26} />
              </button>
            </div>

            {/* QA hooks only: the five dealt choices stay in the DOM (data-draft-choice)
                but are visually hidden — only the hero card is shown on screen. */}
            <div className="worldcup-draft__picker-deck worldcup-draft__picker-deck--hidden" key={dealNonce} aria-hidden="true">
              {choices.map((player, index) => {
                const tier = ratingTier(player.rating);
                return (
                  <button
                    key={player.id}
                    type="button"
                    tabIndex={-1}
                    data-draft-choice
                    data-player-year={player.year}
                    data-player-positions={displayPositions(player)}
                    className={`worldcup-draft__deck-card tier-${tier}${index === activeIndex ? ' is-active' : ''}`}
                    style={{ '--card-index': index }}
                    onClick={() => onNavigate(index)}
                    aria-pressed={index === activeIndex}
                    aria-label={`${shortName(player)} ${player.rating}`}
                  >
                    <CountryFlagMark player={player} className="worldcup-draft__deck-flag" />
                    <b>{player.rating}</b>
                    <span>{shortName(player)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flag overlays. Each hand-built CSS flag draws its FIELD as a pure SCSS
// background (see &__feature-flag-css--*). Anything that can't be a flat
// gradient — stars, crescents, cantons, crests — is drawn here as a positioned
// child so the JSX of FeaturedCard stays small. Pure CSS/SVG geometry, never a
// raster asset and never a fake "random circle". Symbols are deliberately
// simplified silhouettes, not exact copyrighted coats of arms.
// ---------------------------------------------------------------------------

// A single five-point star. Size/position are percentages of the card; colour is
// passed through so the same primitive serves every nation's star.
function FlagStar({ size = 18, left = 50, top = 50, color = '#f4f4f1', rotate = 0, className = '' }) {
  return (
    <i
      className={`worldcup-draft__flag-star${className ? ` ${className}` : ''}`}
      style={{ width: `${size}%`, left: `${left}%`, top: `${top}%`, background: color, transform: `translate(-50%, -50%) rotate(${rotate}deg)` }}
      aria-hidden="true"
    />
  );
}

// A filled crescent drawn from two SVG arcs, so it never depends on the field
// colour behind it (Algeria sits on a green/white seam, Turkey on solid red).
// `rotate` aims the opening; default opens to the right.
function FlagCrescent({ size = 26, left = 50, top = 50, color = '#f4f4f1', rotate = 0 }) {
  return (
    <span
      className="worldcup-draft__flag-crescent"
      style={{ width: `${size}%`, left: `${left}%`, top: `${top}%`, transform: `translate(-50%, -50%) rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M60 8 A42 42 0 1 0 60 92 A33 33 0 1 1 60 8 Z" fill={color} />
      </svg>
    </span>
  );
}

// A compact Union Jack canton (top-left quarter), used by Australia & New
// Zealand. Built entirely from layered gradients in SCSS.
function UnionJackCanton() {
  return <span className="worldcup-draft__flag-unionjack" aria-hidden="true" />;
}

// Southern Cross used by Australia (white) and New Zealand (red, four stars).
// Star coordinates are % of the card, tuned to the lower-right of the field.
const SOUTHERN_CROSS = [
  { left: 76, top: 30, size: 8 },
  { left: 84, top: 52, size: 9 },
  { left: 74, top: 70, size: 8 },
  { left: 64, top: 54, size: 7 },
];

// Argentina's Sol de Mayo: a golden sun with a calm face and 32 rays that
// alternate straight (triangular) and wavy (flame), centred on the flag's white
// band. Generated from rotated SVG geometry so it is a real radiant sun, not the
// flat yellow disc the card used to draw. A deliberately simplified silhouette,
// never the copyrighted national coat of arms.
const SUN_RAY_COUNT = 16;
function SunOfMay({ variant = 'argentina' }) {
  const rays = [];
  for (let i = 0; i < SUN_RAY_COUNT; i += 1) {
    const straightAngle = (360 / SUN_RAY_COUNT) * i;
    const wavyAngle = straightAngle + 360 / (SUN_RAY_COUNT * 2);
    rays.push(
      <path key={`s${i}`} d="M50 1 L55.5 32 L44.5 32 Z" fill="#e0a313" transform={`rotate(${straightAngle} 50 50)`} />,
      <path key={`w${i}`} d="M47.4 32 Q44.4 18 50 7 Q55.6 18 52.6 32 Z" fill="#f2c235" transform={`rotate(${wavyAngle} 50 50)`} />,
    );
  }
  return (
    <span className={`worldcup-draft__feature-flag-sun worldcup-draft__feature-flag-sun--${variant}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g>{rays}</g>
        <circle cx="50" cy="50" r="20" fill="#f5c842" stroke="#cf9015" strokeWidth="2.2" />
        <g fill="#bf8718">
          <circle cx="44" cy="47" r="2.1" />
          <circle cx="56" cy="47" r="2.1" />
        </g>
        <g fill="none" stroke="#bf8718" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M40 43 Q44 40.5 48 43" />
          <path d="M52 43 Q56 40.5 60 43" />
          <path d="M50 49 L50 53.5" />
          <path d="M44 57 Q50 61.5 56 57" />
        </g>
      </svg>
    </span>
  );
}

function FlagOverlay({ flag }) {
  switch (flag) {
    case 'brazil':
      return (
        <span className="worldcup-draft__feature-flag-brazil">
          <i className="worldcup-draft__feature-flag-brazil-diamond" />
          <i className="worldcup-draft__feature-flag-brazil-globe" />
        </span>
      );
    // Mexico: stylised eagle-on-cactus silhouette centred in the white band, so
    // the card never reads as a plain Italian tricolour. Never the real arms.
    case 'mexico':
      return (
        <span className="worldcup-draft__feature-flag-emblem worldcup-draft__feature-flag-emblem--mexico">
          <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M40 72C22 69 14 53 18 38" fill="none" stroke="#1f7a3a" strokeWidth="3" strokeLinecap="round" />
            <path d="M40 72C58 69 66 53 62 38" fill="none" stroke="#1f7a3a" strokeWidth="3" strokeLinecap="round" />
            <g fill="#6b4423">
              <path d="M40 60c-2-8-5-13-10-17-6-5-13-6-19-3 7 0 11 4 14 9 3 5 5 9 5 14z" />
              <path d="M40 60c1-7 3-12 8-16 4-3 9-4 14-3-5 1-8 4-10 8-2 4-3 7-3 11z" />
              <path d="M40 36c4-4 9-6 15-5l8-3-6 6 4 1-7 2c-4 4-8 6-14 6z" />
            </g>
            <path d="M30 64c6-3 14-3 20 0" fill="none" stroke="#1f7a3a" strokeWidth="3" strokeLinecap="round" />
            <path d="M26 40c4 2 6 5 5 9-1 4-5 6-9 5" fill="none" stroke="#b07a2a" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </span>
      );
    // Argentina: the Sol de Mayo centred on the white band — the radiant sun the
    // user asked for, replacing the plain yellow ball the shared rule drew.
    case 'argentina':
      return <SunOfMay />;
    // Uruguay: the Sol de Mayo sits in the white upper-hoist canton (see the
    // --uruguay variant), not flat in the centre like the old yellow ball.
    case 'uruguay':
      return <SunOfMay variant="uruguay" />;
    case 'senegal':
      return <span className="worldcup-draft__feature-flag-star worldcup-draft__feature-flag-star--senegal" />;
    case 'ghana':
      return <span className="worldcup-draft__feature-flag-star worldcup-draft__feature-flag-star--ghana" />;
    case 'switzerland':
      return <span className="worldcup-draft__feature-flag-cross" />;
    case 'usa':
      return <span className="worldcup-draft__feature-flag-usa-canton" />;

    // Cameroon: one gold star centred over the red middle stripe.
    case 'cameroon':
      return <FlagStar size={17} color="#fcd116" />;
    // Yugoslavia (SFRJ): the red star with a thin gold border, centred — this is
    // what separates it from modern Serbia/Serbia & Montenegro.
    case 'yugoslavia':
      return (
        <>
          <FlagStar size={26} color="#f5d23d" />
          <FlagStar size={20} color="#c51e2c" />
        </>
      );
    // USSR: gold hammer & sickle under a gold star, in the upper hoist canton.
    case 'ussr':
      return (
        <span className="worldcup-draft__flag-ussr" aria-hidden="true">
          <FlagStar size={9} left={20} top={16} color="#f5d23d" />
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="#f5d23d" strokeWidth="6" strokeLinecap="round">
              <path d="M30 70 Q34 40 64 40" />
              <path d="M64 40 A26 26 0 0 1 40 64" />
            </g>
            <g stroke="#f5d23d" strokeWidth="7" strokeLinecap="round">
              <line x1="30" y1="44" x2="64" y2="78" />
              <line x1="56" y1="40" x2="74" y2="58" />
            </g>
          </svg>
        </span>
      );

    // Australia / New Zealand: Union Jack canton + the Southern Cross. Australia
    // adds the white Commonwealth star under the canton; both crosses are simple
    // five-point stars (NZ's are red, Australia's white).
    case 'australia':
      return (
        <>
          <UnionJackCanton />
          <FlagStar size={11} left={25} top={74} color="#f4f4f1" />
          {SOUTHERN_CROSS.map((s, i) => (
            <FlagStar key={i} size={s.size} left={s.left} top={s.top} color="#f4f4f1" />
          ))}
        </>
      );
    case 'new-zealand':
      return (
        <>
          <UnionJackCanton />
          {SOUTHERN_CROSS.map((s, i) => (
            <FlagStar key={i} size={s.size} left={s.left} top={s.top} color="#c8102e" />
          ))}
        </>
      );

    // Tunisia: central white disc carrying a red crescent + red star.
    case 'tunisia':
      return (
        <span className="worldcup-draft__flag-disc worldcup-draft__flag-disc--tunisia" aria-hidden="true">
          <svg className="worldcup-draft__flag-disc-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#e70013">
            <path d="M46 20 A30 30 0 1 0 46 80 A24 24 0 1 1 46 20 Z" />
            <path d="M70 37 L72.92 45.98 L82.36 45.98 L74.73 51.54 L77.64 60.52 L70 54.97 L62.36 60.52 L65.27 51.54 L57.64 45.98 L67.08 45.98 Z" />
          </svg>
        </span>
      );
    // Algeria: red crescent + red star straddling the green/white seam.
    case 'algeria':
      return (
        <>
          <FlagCrescent size={30} left={50} top={50} color="#d21034" rotate={-18} />
          <FlagStar size={17} left={57} top={50} color="#d21034" />
        </>
      );
    // Turkey: white crescent + white star toward the hoist.
    case 'turkey':
      return (
        <>
          <FlagCrescent size={34} left={42} top={50} color="#f4f4f1" rotate={-15} />
          <FlagStar size={16} left={56} top={50} color="#f4f4f1" />
        </>
      );
    // Morocco: green interlaced pentagram (drawn as an outline star) centred.
    case 'morocco':
      return (
        <span className="worldcup-draft__flag-pentagram" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 12 L61 79 L7 36 L93 36 L39 79 Z" fill="none" stroke="#0f7a32" strokeWidth="6" strokeLinejoin="round" />
          </svg>
        </span>
      );
    // Saudi Arabia: white shahada bar + sword along the lower third (stylised,
    // not real Arabic script).
    case 'saudi-arabia':
      return (
        <span className="worldcup-draft__flag-saudi" aria-hidden="true">
          <svg className="worldcup-draft__flag-saudi-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* Stylised shahada script (a flowing line + letter ticks), never real Arabic. */}
            <g fill="none" stroke="#f4f4f1" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 39 Q23 30 30 39 Q36 46 43 39 Q50 30 57 39 Q63 46 70 39 Q77 30 84 39" />
              <path d="M24 48 L29 48 M39 48 L46 48 M54 48 L61 48 M69 48 L76 48" />
            </g>
            {/* Sword: thicker blade + hilt so it reads clearly on small screens. */}
            <g fill="#f4f4f1">
              <path d="M16 66 L72 62.8 L72 69.2 Z" />
              <rect x="71" y="60.4" width="5.2" height="10.4" rx="1.7" />
              <rect x="76.5" y="63" width="10" height="5.2" rx="2.4" />
              <circle cx="89" cy="65.6" r="3.4" />
            </g>
          </svg>
        </span>
      );
    // Iran: central red emblem (stylised tulip / four-crescent mark).
    case 'iran':
      return (
        <span className="worldcup-draft__flag-emblem-c worldcup-draft__flag-emblem-c--iran" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#da0000">
            <path d="M50 22 C46 34 46 44 50 52 C54 44 54 34 50 22 Z" />
            <path d="M34 40 C40 46 44 52 44 60 C36 58 31 52 30 44 Z" />
            <path d="M66 40 C60 46 56 52 56 60 C64 58 69 52 70 44 Z" />
            <path d="M50 56 C47 64 47 72 50 78 C53 72 53 64 50 56 Z" />
          </svg>
        </span>
      );
    // Egypt: gold eagle of Saladin silhouette centred on the white band.
    case 'egypt':
      return (
        <span className="worldcup-draft__flag-emblem-c worldcup-draft__flag-emblem-c--egypt" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#c8a02a">
            <path d="M50 28 L58 36 L70 33 L62 44 L72 50 L58 52 L60 64 L50 56 L40 64 L42 52 L28 50 L38 44 L30 33 L42 36 Z" />
            <rect x="44" y="60" width="12" height="12" />
          </svg>
        </span>
      );
    // Canada: red eleven-point maple leaf centred in the white band.
    case 'canada':
      return (
        <span className="worldcup-draft__flag-emblem-c worldcup-draft__flag-emblem-c--canada" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#d52b1e">
            <path d="M50 12 L54 30 L66 22 L60 38 L78 36 L66 47 L82 54 L64 56 L68 70 L54 60 L56 84 L50 74 L44 84 L46 60 L32 70 L36 56 L18 54 L34 47 L22 36 L40 38 L34 22 L46 30 Z" />
          </svg>
        </span>
      );
    // China: large gold star + an arc of four small stars in the upper hoist.
    case 'china':
      return (
        <>
          <FlagStar size={16} left={16} top={20} color="#ffde00" />
          <FlagStar size={6} left={30} top={10} color="#ffde00" />
          <FlagStar size={6} left={36} top={20} color="#ffde00" />
          <FlagStar size={6} left={36} top={31} color="#ffde00" />
          <FlagStar size={6} left={30} top={41} color="#ffde00" />
        </>
      );
    // Honduras: five blue stars in an X (quincunx) across the white band.
    case 'honduras':
      return (
        <>
          <FlagStar size={11} left={50} top={50} color="#0073cf" />
          <FlagStar size={10} left={38} top={40} color="#0073cf" />
          <FlagStar size={10} left={62} top={40} color="#0073cf" />
          <FlagStar size={10} left={38} top={60} color="#0073cf" />
          <FlagStar size={10} left={62} top={60} color="#0073cf" />
        </>
      );
    // Panama: blue star in the white upper-hoist quarter, red star in the white
    // lower-fly quarter.
    case 'panama':
      return (
        <>
          <FlagStar size={16} left={25} top={25} color="#072357" />
          <FlagStar size={16} left={75} top={75} color="#da121a" />
        </>
      );
    // Israel: blue Star of David (two overlaid triangles) centred between the
    // two blue stripes.
    case 'israel':
      return (
        <span className="worldcup-draft__flag-emblem-c worldcup-draft__flag-emblem-c--israel" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#0038b8" strokeWidth="7" strokeLinejoin="round">
            <path d="M50 22 L72 60 L28 60 Z" />
            <path d="M50 78 L28 40 L72 40 Z" />
          </svg>
        </span>
      );
    // North Korea: white disc carrying a red star, set toward the hoist on the
    // central red band.
    case 'north-korea':
      return (
        <span className="worldcup-draft__flag-disc worldcup-draft__flag-disc--prk" aria-hidden="true">
          <FlagStar size={52} left={50} top={50} color="#ed1c27" />
        </span>
      );
    // El Salvador: small blue triangular emblem centred in the white band.
    case 'el-salvador':
      return (
        <span className="worldcup-draft__flag-emblem-c worldcup-draft__flag-emblem-c--salvador" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#0f47af" strokeWidth="5">
            <path d="M50 34 L66 64 L34 64 Z" />
            <line x1="50" y1="30" x2="50" y2="40" stroke="#cf9b16" strokeWidth="6" />
          </svg>
        </span>
      );
    // Angola: gold half-gearwheel crossed with a machete, with a star above.
    case 'angola':
      return (
        <span className="worldcup-draft__flag-emblem-c worldcup-draft__flag-emblem-c--angola" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#f5d23d" strokeWidth="6" strokeLinecap="round">
            <path d="M28 56 A24 24 0 0 0 72 56" />
            <line x1="34" y1="44" x2="66" y2="64" />
          </svg>
          <FlagStar size={13} left={50} top={34} color="#f5d23d" />
        </span>
      );
    // Togo: white star in the red upper-hoist canton.
    case 'togo':
      return (
        <span className="worldcup-draft__flag-canton worldcup-draft__flag-canton--togo" aria-hidden="true">
          <FlagStar size={56} left={50} top={50} color="#f4f4f1" />
        </span>
      );
    // Bosnia: yellow right-triangle down the fly with a diagonal line of white
    // stars along its hypotenuse.
    case 'bosnia':
      return (
        <>
          <span className="worldcup-draft__flag-bih-triangle" aria-hidden="true" />
          {[18, 32, 46, 60, 74].map((t, i) => (
            <FlagStar key={i} size={7} left={28 + i * 11} top={t} color="#f4f4f1" />
          ))}
        </>
      );
    // Kuwait: black trapezoid at the hoist.
    case 'kuwait':
      return <span className="worldcup-draft__flag-kuwait-trapezoid" aria-hidden="true" />;
    // Iraq (1963–1991 era): three green stars across the white band.
    case 'iraq':
      return (
        <>
          <FlagStar size={12} left={32} top={50} color="#007a3d" />
          <FlagStar size={12} left={50} top={50} color="#007a3d" />
          <FlagStar size={12} left={68} top={50} color="#007a3d" />
        </>
      );
    // Cuba: red hoist triangle with a white five-point star.
    case 'cuba':
      return (
        <>
          <span className="worldcup-draft__flag-cuba-triangle" aria-hidden="true" />
          <FlagStar size={13} left={16} top={50} color="#f4f4f1" />
        </>
      );
    // Haiti: small central white panel (stand-in for the arms).
    case 'haiti':
      return <span className="worldcup-draft__flag-haiti-panel" aria-hidden="true" />;
    // Zaire (1971–1997): a yellow disc bearing a stylised torch toward the hoist.
    case 'zaire':
      return (
        <span className="worldcup-draft__flag-disc worldcup-draft__flag-disc--zaire" aria-hidden="true">
          <span className="worldcup-draft__flag-zaire-torch" />
        </span>
      );
    // Qatar: white serrated band at the hoist (nine points).
    case 'qatar':
      return <span className="worldcup-draft__flag-qatar-band" aria-hidden="true" />;
    // East Germany (GDR): gold hammer-and-compass within a wreath, centred.
    case 'east-germany':
      return (
        <span className="worldcup-draft__flag-emblem-c worldcup-draft__flag-emblem-c--gdr" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#d4a017" strokeWidth="4">
            <circle cx="50" cy="50" r="26" strokeDasharray="3 4" />
            <line x1="34" y1="62" x2="66" y2="38" strokeWidth="6" strokeLinecap="round" />
            <path d="M40 36 L60 36 L50 64 Z" />
          </svg>
        </span>
      );
    // South Africa: black hoist triangle (gold-edged) that turns the layered
    // green/white X behind it into the green Y (pall) of the real flag.
    case 'south-africa':
      return (
        <span className="worldcup-draft__flag-sa-hoist" aria-hidden="true">
          <span className="worldcup-draft__flag-sa-hoist-gold" />
          <span className="worldcup-draft__flag-sa-hoist-black" />
        </span>
      );
    // Slovenia: small blue hoist shield — Mt Triglav + three gold stars — so it
    // never reads as a plain Russia/Slovakia white-blue-red tricolour.
    case 'slovenia':
      return (
        <span className="worldcup-draft__flag-emblem-sm worldcup-draft__flag-emblem-sm--slovenia" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 26 H86 V96 L50 78 L14 96 Z" fill="#0000a0" stroke="#c8102e" strokeWidth="5" />
            <path d="M30 70 L50 40 L70 70 Z" fill="#f4f4f1" />
            <g fill="#f5d23d">
              <path d="M38 26 l4 8 8 1 -6 6 2 8 -8 -4 -8 4 2 -8 -6 -6 8 -1 Z" />
            </g>
          </svg>
        </span>
      );
    // Slovakia: small hoist shield — white double cross on three blue hills.
    case 'slovakia':
      return (
        <span className="worldcup-draft__flag-emblem-sm worldcup-draft__flag-emblem-sm--slovakia" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 22 H86 V62 Q86 90 50 98 Q14 90 14 62 Z" fill="#ee1c25" stroke="#f4f4f1" strokeWidth="4" />
            <path d="M30 78 Q50 64 70 78 V86 H30 Z" fill="#0b4ea2" />
            <g stroke="#f4f4f1" strokeWidth="7" strokeLinecap="round">
              <line x1="50" y1="34" x2="50" y2="74" />
              <line x1="38" y1="48" x2="62" y2="48" />
              <line x1="42" y1="62" x2="58" y2="62" />
            </g>
          </svg>
        </span>
      );
    default:
      return null;
  }
}

// The hero card the player is currently focused on. Remounted on every
// navigation (via key) so the flip-in animation replays; legendary cards get an
// extra gold glow + subtle shake. FIFA-style trading-card hierarchy: an enormous
// diffused national-team flag fills the background, a giant top-left rating block
// anchors the stats, and the player identity (name · país · año · club) sits
// below, with a bottom chemistry-preview strip.
function FeaturedCard({ player, otherPlayers, preview, featured = false, variant = 'choice', chemInline = true, dragProps = {}, dragStyle = null, isDragging = false, children = null }) {
  if (!player) {
    return (
      <div className="worldcup-draft__feature-wrap">
        <article className="worldcup-draft__feature is-empty">Sin jugadores compatibles</article>
      </div>
    );
  }
  const { i18n: i18nHook } = useTranslation();
  const lang = String(i18nHook?.language || 'es').slice(0, 2).toLowerCase();
  const tier = ratingTier(player.rating);
  const badge = ratingBadge(player.rating, lang);
  const style = playerStyle(player);
  const styleTag = cardStyleTag(player);
  const theme = countryVisualTheme(player);
  const hasCssFlag = CSS_FLAGS.has(theme.flag);
  const flagEmoji = flagGlyph(player).trim();
  const nameParts = splitDisplayName(player);
  const chem = preview || (featured ? chemistryPreview(player, otherPlayers) : null);
  const club = String(player.club || '').trim();
  return (
    <div
      className={`worldcup-draft__feature-wrap${featured ? ' is-swipeable' : ''}${isDragging ? ' is-dragging' : ''}`}
      data-dragging={isDragging ? 'true' : 'false'}
      style={dragStyle || undefined}
      {...dragProps}
    >
      <span className="worldcup-draft__feature-stack worldcup-draft__feature-stack--2" aria-hidden="true" />
      <span className="worldcup-draft__feature-stack worldcup-draft__feature-stack--1" aria-hidden="true" />
      <article
        className={`worldcup-draft__feature tier-${tier}${variant === 'current' ? ' is-current' : ''}`}
        data-draft-featured-card
        data-draft-player
        data-country-flag={theme.flag}
        data-player-positions={displayPositions(player)}
        style={{ '--country-glow': theme.glow, '--country-accent': theme.accent }}
      >
        <span className={`worldcup-draft__feature-flag-css worldcup-draft__feature-flag-css--${theme.flag}`} aria-hidden="true">
          <FlagOverlay flag={theme.flag} />
          {!hasCssFlag && flagEmoji && (
            <span className="worldcup-draft__feature-flag-emoji" data-flag-emoji>{flagEmoji}</span>
          )}
        </span>
        <span className="worldcup-draft__feature-shine" aria-hidden="true" />
        {tier === 'legendary' && (
          <span className="worldcup-draft__feature-sparks" aria-hidden="true">
            {LEGEND_SPARKS.map((spark, index) => (
              <i
                key={index}
                className="worldcup-draft__feature-spark"
                style={{ left: `${spark.x}%`, top: `${spark.y}%`, '--spark-i': index }}
              />
            ))}
          </span>
        )}
        <div className="worldcup-draft__feature-top">
          <div className="worldcup-draft__feature-stat">
            <span className="worldcup-draft__feature-rating">{player.rating}</span>
            <div className="worldcup-draft__feature-stat-sub">
              <span className="worldcup-draft__feature-pos">{primaryPositionLabel(player, lang)}</span>
            </div>
          </div>
          <em className={`worldcup-draft__feature-legend worldcup-draft__feature-legend--${badge.key}`}>
            {badge.key === 'legend' && <Star size={12} />} {badge.label}
          </em>
        </div>
        <div className="worldcup-draft__feature-meta">
          <span className="worldcup-draft__feature-positions">{displayPositionsLabel(player, lang)}</span>
          <em className="worldcup-draft__feature-style-tag" data-style={style}>{styleTag}</em>
        </div>
        <div className="worldcup-draft__feature-id">
          <strong className="worldcup-draft__feature-name">
            {nameParts.first && <span>{nameParts.first}</span>}
            <b>{nameParts.last}</b>
          </strong>
          <span className="worldcup-draft__feature-origin">
            <CountryFlagMark player={player} className="worldcup-draft__origin-flag" />
            {player.nationalityEs || player.nationality} · {player.year}
          </span>
          <span className="worldcup-draft__feature-club">
            Club: {club || 'no disponible'}
          </span>
        </div>
        {chemInline && variant !== 'current' && (
          <div className="worldcup-draft__feature-chem" data-chem-preview>
            <em
              className={`worldcup-draft__chem-pill worldcup-draft__chem-pill--${chemistryPreviewClass(chem)}`}
              data-style={chem?.style?.style || undefined}
            >
              <span className="worldcup-draft__feature-chem-label">
                {lang === 'es' ? 'Química' : 'Chemistry'}
              </span>
              {chem?.country && <CountryFlagMark code={chem.country.code} className="worldcup-draft__chem-flag" />}
              <span>{chemistryPreviewText(chem, lang)}</span>
            </em>
          </div>
        )}
        {children}
      </article>
    </div>
  );
}

// Separate in-app live tab for the current match. The campaign has already been
// computed, but the tournament screen does not advance until this view finishes.
function LiveMatchStage({ result, summary, slots, revealIndex, finished, onFinishLive, onReturn, onExit }) {
  const matches = result.matches || [];
  const total = matches.length;
  const focusIndex = Math.min(revealIndex, total - 1);
  const current = matches[focusIndex] || null;
  const [simMinute, setSimMinute] = useState(0);
  const [penaltyStep, setPenaltyStep] = useState(0);
  const lineup = slots.filter((slot) => slot.player);
  const identity = summary.chemistry.countryLinks[0] || null;
  const resultCode = current ? (current.decided || current.result).toLowerCase() : '';
  const resultWord = current
    ? ((current.decided || current.result) === 'W' ? 'Victoria' : (current.decided || current.result) === 'D' ? 'Empate' : 'Derrota')
    : '';
  const timeline = useMemo(
    () => (current ? buildMatchTimeline(current, summary, focusIndex) : null),
    [current, summary, focusIndex],
  );
  const penaltyShootout = useMemo(
    () => (current ? buildPenaltyShootout(current, timeline) : null),
    [current, timeline],
  );
  const hasPenaltyShootout = Boolean(penaltyShootout);

  useEffect(() => {
    setSimMinute(0);
    setPenaltyStep(0);
  }, [focusIndex]);

  useEffect(() => {
    if (finished) {
      setSimMinute(MATCH_FULL_MINUTE);
      if (penaltyShootout) setPenaltyStep(penaltyShootout.shots.length);
      return undefined;
    }
    if (simMinute >= MATCH_FULL_MINUTE) {
      if (!hasPenaltyShootout) {
        onFinishLive();
      }
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setSimMinute((minute) => Math.min(MATCH_FULL_MINUTE, minute + 2));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [finished, hasPenaltyShootout, penaltyShootout, simMinute, onFinishLive]);

  useEffect(() => {
    if (finished || !hasPenaltyShootout || simMinute < MATCH_FULL_MINUTE) return undefined;
    if (penaltyStep >= penaltyShootout.shots.length) {
      const timer = window.setTimeout(onFinishLive, 420);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setPenaltyStep((step) => Math.min(penaltyShootout.shots.length, step + 1));
    }, penaltyStep === 0 ? 520 : 700);
    return () => window.clearTimeout(timer);
  }, [finished, hasPenaltyShootout, onFinishLive, penaltyShootout, penaltyStep, simMinute]);

  const handleSkipLive = () => {
    if (hasPenaltyShootout && !finished) {
      if (simMinute >= MATCH_FULL_MINUTE) {
        setPenaltyStep(penaltyShootout.shots.length);
        return;
      }
      setSimMinute(MATCH_FULL_MINUTE);
      return;
    }
    onFinishLive();
  };

  const liveMinute = finished ? MATCH_FULL_MINUTE : simMinute;
  const visibleTimeline = useMemo(
    () => buildPartialMatchTimeline(timeline, liveMinute),
    [timeline, liveMinute],
  );
  const liveScore = visibleTimeline?.liveScore || {
    home: liveMinute >= MATCH_FULL_MINUTE ? (current?.forGoals || 0) : 0,
    away: liveMinute >= MATCH_FULL_MINUTE ? (current?.againstGoals || 0) : 0,
  };
  const homeCode = identity ? String(identity.code || identity.label || 'XI').slice(0, 3).toUpperCase() : 'XI';
  const oppCode = current ? String(current.opponent.code || current.opponent.country || '').slice(0, 3).toUpperCase() : '';
  const oppName = current ? (current.opponent.countryEs || current.opponent.country) : '';
  const isLastMatch = focusIndex >= total - 1;

  if (!current || !timeline || !visibleTimeline) return null;

  return (
    <section
      className={`worldcup-draft__live${finished ? ' is-finished' : ' is-live'}`}
      data-worldcup-live-match
      data-worldcup-live-finished={finished ? 'true' : 'false'}
      data-live-minute={liveMinute}
      data-reveal-index={revealIndex}
    >
      <header className="worldcup-draft__live-top">
        <button className="worldcup-draft__live-menu" type="button" onClick={onExit} aria-label="Volver al menú">
          <ArrowLeft size={17} />
        </button>
        <div className="worldcup-draft__live-title">
          <span>TOURNAMENT LAB</span>
          <strong>Mundial Draft</strong>
        </div>
        <em className="worldcup-draft__live-count"><Trophy size={12} /> {focusIndex + 1}/{total}</em>
      </header>

      <div className="worldcup-draft__live-scorecard">
        <div className="worldcup-draft__live-status">
          <span className={finished ? 'is-final' : 'is-directo'}>{finished ? 'FINAL' : 'EN DIRECTO'}</span>
          <small>{finished ? '90’' : `${Math.max(1, liveMinute)}’`} · {ROUND_SHORT[current.round]}</small>
        </div>
        <div className="worldcup-draft__live-scoreline" data-worldcup-live-score={`${liveScore.home}-${liveScore.away}`}>
          <div><b>{homeCode}</b><span>Tu XI</span></div>
          <strong>{liveScore.home}<i>-</i>{liveScore.away}</strong>
          <div><b>{oppCode}</b><span>{oppName}</span></div>
        </div>
      </div>

      {hasPenaltyShootout && liveMinute >= MATCH_FULL_MINUTE && (
        <PenaltyShootoutStage
          shootout={penaltyShootout}
          revealedShots={finished ? penaltyShootout.shots.length : penaltyStep}
          homeLabel="Tu XI"
          awayLabel={oppName}
          homeCode={homeCode}
          awayCode={oppCode}
        />
      )}

      <MatchTimeline
        match={current}
        summary={summary}
        timeline={visibleTimeline}
        lineup={lineup}
        resultWord={resultWord}
        resultCode={resultCode}
        live={!finished}
      />

      <div className="worldcup-draft__live-actions">
        {!finished ? (
          <button className="worldcup-draft__ghost worldcup-draft__ghost--block" type="button" data-worldcup-live-finish onClick={handleSkipLive}>
            <ChevronRight size={17} /> {hasPenaltyShootout && liveMinute >= MATCH_FULL_MINUTE ? 'Acelerar tanda' : 'Saltar al final'}
          </button>
        ) : (
          <button className="worldcup-draft__primary" type="button" data-worldcup-live-next onClick={onReturn}>
            <ChevronRight size={18} /> {isLastMatch ? 'Ver resultado del partido' : 'Siguiente'}
          </button>
        )}
      </div>
    </section>
  );
}

function PenaltyShootoutStage({ shootout, revealedShots, homeLabel, awayLabel, homeCode, awayCode }) {
  if (!shootout) return null;
  const visibleShots = shootout.shots.slice(0, revealedShots);
  const homeGoals = visibleShots.filter((shot) => shot.team === 'home' && shot.state === 'goal').length;
  const awayGoals = visibleShots.filter((shot) => shot.team === 'away' && shot.state === 'goal').length;
  const currentShot = shootout.shots[Math.max(0, revealedShots - 1)] || null;
  const complete = revealedShots >= shootout.shots.length;
  const rows = Array.from({ length: shootout.attempts }, (_, round) => ({
    round,
    home: shootout.shots.find((shot) => shot.team === 'home' && shot.round === round),
    away: shootout.shots.find((shot) => shot.team === 'away' && shot.round === round),
  }));

  const renderShot = (shot) => {
    const shotIndex = shootout.shots.indexOf(shot);
    const revealed = shotIndex >= 0 && shotIndex < revealedShots;
    const state = revealed ? shot.state : 'pending';
    return (
      <span
        className={`worldcup-draft__pen-shot is-${state}${currentShot === shot ? ' is-current' : ''}`}
        data-penalty-shot
        data-team={shot.team}
        data-round={shot.round + 1}
        data-state={state}
        title={revealed ? shot.label : 'Pendiente'}
      >
        <i aria-hidden="true" />
        <b>{revealed ? shot.label : '...'}</b>
      </span>
    );
  };

  return (
    <section
      className={`worldcup-draft__penalties${complete ? ' is-complete' : ' is-live'}`}
      data-worldcup-penalty-shootout
      data-penalty-complete={complete ? 'true' : 'false'}
    >
      <header className="worldcup-draft__pen-head">
        <span className="worldcup-draft__kicker">Final tras 90'</span>
        <h3>Ronda de penaltis</h3>
        <p>{complete ? 'Tanda cerrada. La eliminatoria queda decidida desde los once metros.' : 'La eliminatoria se decide desde los once metros.'}</p>
      </header>

      <div className="worldcup-draft__pen-scoreboard" data-penalty-final={`${shootout.score.home}-${shootout.score.away}`}>
        <div className={`worldcup-draft__pen-team${shootout.winner === 'home' && complete ? ' is-winner' : ''}`}>
          <span>{homeCode}</span>
          <strong>{homeLabel}</strong>
          <b>{homeGoals}</b>
        </div>
        <em>pen.</em>
        <div className={`worldcup-draft__pen-team${shootout.winner === 'away' && complete ? ' is-winner' : ''}`}>
          <span>{awayCode}</span>
          <strong>{awayLabel}</strong>
          <b>{awayGoals}</b>
        </div>
      </div>

      <div className="worldcup-draft__pen-grid">
        <div className="worldcup-draft__pen-grid-head">
          <span>{homeLabel}</span>
          <b>Turno</b>
          <span>{awayLabel}</span>
        </div>
        {rows.map((row) => (
          <div className="worldcup-draft__pen-row" key={row.round}>
            {renderShot(row.home)}
            <strong>{row.round + 1}</strong>
            {renderShot(row.away)}
          </div>
        ))}
      </div>

      <footer className="worldcup-draft__pen-footer">
        {complete ? (
          <strong>{shootout.winner === 'home' ? homeLabel : awayLabel} gana {shootout.score.home}-{shootout.score.away} en penaltis</strong>
        ) : currentShot ? (
          <span>{currentShot.team === 'home' ? homeLabel : awayLabel}: {currentShot.label}</span>
        ) : (
          <span>Preparando la primera tanda</span>
        )}
      </footer>
    </section>
  );
}

// Progressive tournament stage: one match in focus, hidden future scores, a pitch
// inspired by 7a0's slot pitch but rebuilt PC Gaffer style. Future matches stay
// locked until the user simulates up to them.
function TournamentStage({ result, summary, formation, slots, revealIndex, matchRevealed, onSimulateMatch, onNextMatch, onFinish, onExit }) {
  const matches = result.matches || [];
  const total = matches.length;
  const focusIndex = Math.min(revealIndex, total - 1);
  const current = matches[focusIndex] || null;
  const isLastMatch = focusIndex >= total - 1;
  const revealedCount = revealIndex + (matchRevealed ? 1 : 0);
  // Dominant nationality of the XI (if any), used as the side's badge identity.
  const identity = summary.chemistry.countryLinks[0] || null;
  const lineup = slots.filter((slot) => slot.player);

  const resultCode = current ? (current.decided || current.result).toLowerCase() : '';
  const resultWord = current
    ? ((current.decided || current.result) === 'W' ? 'Victoria' : (current.decided || current.result) === 'D' ? 'Empate' : 'Derrota')
    : '';

  // Derived only when the focused match has been simulated on screen, so the
  // SofaScore-like strip + event feed appear as a staged reveal, never up front.
  const timeline = useMemo(
    () => (matchRevealed && current ? buildMatchTimeline(current, summary, focusIndex) : null),
    [matchRevealed, current, summary, focusIndex],
  );

  // Short 2–3 letter side codes, broadcast-scoreboard style (BR · PL). The home
  // code is the XI's dominant nationality; falls back to a neutral "XI".
  const homeCode = identity ? String(identity.code || identity.label || 'XI').slice(0, 3).toUpperCase() : 'XI';
  const oppCode = current ? String(current.opponent.code || current.opponent.country || '').slice(0, 3).toUpperCase() : '';
  const oppDisplayName = current ? (current.opponent.countryEs || current.opponent.country) : '';

  return (
    <section
      className="worldcup-draft__tournament"
      data-worldcup-progressive
      data-reveal-index={revealIndex}
      data-revealed-count={revealedCount}
      data-match-revealed={matchRevealed ? 'true' : 'false'}
    >
      {/* Stage stepper: a 7-step skeleton (3 group + 4 knockout). Reached steps
          show their score, the live one is highlighted, the rest stay locked so
          the bracket never jumps and elimination is not spoiled in advance. */}
      <ol className="worldcup-draft__steps" aria-label="Fases del Mundial">
        {CAMPAIGN_ROUNDS.map((round, idx) => {
          const stepMatch = matches[idx];
          const isReached = idx < revealIndex || (idx === revealIndex && matchRevealed);
          const isNow = idx === revealIndex && idx < total;
          const code = isReached && stepMatch ? (stepMatch.decided || stepMatch.result).toLowerCase() : '';
          const state = isReached ? 'done' : isNow ? 'now' : 'locked';
          return (
            <li key={round} className={`worldcup-draft__step is-${state}${code ? ` result-${code}` : ''}`} data-step-state={state}>
              <span className="worldcup-draft__step-tag">{ROUND_SHORT[round]}</span>
              {isReached && stepMatch ? (
                <b className="worldcup-draft__step-score">{stepMatch.forGoals}-{stepMatch.againstGoals}</b>
              ) : (
                <span className="worldcup-draft__step-mark" aria-hidden="true">
                  {isNow ? <Play size={12} /> : <Lock size={11} />}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Broadcast scoreboard banner, full width above the pitch/rail split. Pre
          match it reads BR · VS · PL with ratings; once simulated it flips to the
          live-style score with a coloured verdict pill and the round/end status. */}
      <div className={`worldcup-draft__scoreboard${matchRevealed ? ` is-revealed result-${resultCode}` : ''}`} data-worldcup-scoreboard>
        <div className="worldcup-draft__score-side">
          <b className="worldcup-draft__score-code">{homeCode}</b>
          <span className="worldcup-draft__score-name">Tu XI</span>
          <em className="worldcup-draft__score-rating">{summary.avg}</em>
        </div>

        <div className="worldcup-draft__score-core">
          {matchRevealed && current ? (
            <>
              <em className={`worldcup-draft__score-pill result-${resultCode}`} data-result-word>
                {resultWord}
              </em>
              <strong className="worldcup-draft__score-line">{current.forGoals}<i>-</i>{current.againstGoals}</strong>
              <em className="worldcup-draft__score-sub">
                Final · {ROUND_SHORT[current.round]}
                {current.shootout ? ` · Penaltis ${current.shootout === 'won' ? 'ganados' : 'perdidos'}` : ''}
              </em>
            </>
          ) : (
            <>
              <em className="worldcup-draft__score-pill is-upcoming">Por jugar</em>
              <strong className="worldcup-draft__score-vs">VS</strong>
              <em className="worldcup-draft__score-sub">{current ? ROUND_LABELS[current.round] : ''}</em>
            </>
          )}
        </div>

        <div className="worldcup-draft__score-side worldcup-draft__score-side--opp">
          <b className="worldcup-draft__score-code">{oppCode}</b>
          <span className="worldcup-draft__score-name">{oppDisplayName}</span>
          <em className="worldcup-draft__score-rating">{current?.opponent.rating}</em>
        </div>
      </div>

      <div className="worldcup-draft__tournament-main">
        {/* Central tactical pitch with the XI laid out. Read-only: the draft is
            locked once the Mundial is under way. */}
        <div className="worldcup-draft__match-pitch">
          <div className="worldcup-draft__pitch-wrap worldcup-draft__pitch-wrap--static">
            <div className="worldcup-draft__pitch-tag">{formation}</div>
            <div className="worldcup-draft__pitch">
              <div className="worldcup-draft__pitch-lines" aria-hidden="true">
                <span className="worldcup-draft__pitch-circle" />
                <span className="worldcup-draft__pitch-spot" />
                <span className="worldcup-draft__pitch-box worldcup-draft__pitch-box--top" />
                <span className="worldcup-draft__pitch-box worldcup-draft__pitch-box--bottom" />
                <span className="worldcup-draft__pitch-six worldcup-draft__pitch-six--top" />
                <span className="worldcup-draft__pitch-six worldcup-draft__pitch-six--bottom" />
              </div>
              {lineup.map((slot) => (
                <div
                  key={slot.id}
                  className={`worldcup-draft__slot is-filled is-static tier-${ratingTier(slot.displayRating)}`}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  <span className="worldcup-draft__slot-badge">{slot.displayRating}</span>
                  <span className="worldcup-draft__slot-name">{shortName(slot.player)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right analysis rail: pre-match shows the opponent + squad readout and
            the primary CTA; once simulated the SofaScore-style match detail takes
            over (último evento, presión, estadísticas, cronología, MVP, claves). */}
        <aside className="worldcup-draft__match" data-worldcup-current-match data-round={current?.round} data-revealed={matchRevealed ? 'true' : 'false'}>
          <header className="worldcup-draft__match-head">
            <span className="worldcup-draft__kicker">Camino al título · Partido {focusIndex + 1} de {total}</span>
            <h2 className="worldcup-draft__match-stage">{current ? ROUND_LABELS[current.round] : ''}</h2>
          </header>

          {!matchRevealed && (
            <>
              <div className="worldcup-draft__match-opp">
                <span className="worldcup-draft__match-opp-flag" aria-hidden="true">{current?.opponent.flag}</span>
                <div className="worldcup-draft__match-opp-id">
                  <strong>{oppDisplayName}</strong>
                  <small>Selección {current?.opponent.year} · Valoración {current?.opponent.rating}</small>
                </div>
              </div>

              <div className="worldcup-draft__match-box-team">
                <span className="worldcup-draft__kicker">Tu combinado</span>
                <div className="worldcup-draft__match-box-stats">
                  <span>Media <b>{summary.avg}</b></span>
                  <span>Ataque <b>{summary.attack}</b></span>
                  <span>Medio <b>{summary.midfield}</b></span>
                  <span>Defensa <b>{summary.defense}</b></span>
                  <span className="is-accent">Química <b>{summary.chemistry.total}</b></span>
                </div>
              </div>
            </>
          )}

          {matchRevealed && current && timeline && (
            <MatchTimeline
              match={current}
              summary={summary}
              timeline={timeline}
              lineup={lineup}
              resultWord={resultWord}
              resultCode={resultCode}
            />
          )}

          <div className="worldcup-draft__match-cta">
            {!matchRevealed ? (
              <button className="worldcup-draft__primary" type="button" data-worldcup-simulate-match onClick={onSimulateMatch}>
                <Play size={18} /> Simular partido
              </button>
            ) : !isLastMatch ? (
              <button className="worldcup-draft__primary" type="button" data-worldcup-next-match onClick={onNextMatch}>
                <ChevronRight size={18} /> Siguiente partido
              </button>
            ) : (
              <button className="worldcup-draft__primary" type="button" data-worldcup-finish onClick={onFinish}>
                <ListChecks size={18} /> Ver resumen final
              </button>
            )}
          </div>
        </aside>
      </div>

    </section>
  );
}

function LegendUpgradeStage({ slots, formation, edition, nextEdition, rerolls, activeSlotId, choices, onSlotClick, onSkip }) {
  return (
    <section className="worldcup-draft__legend-upgrade" data-worldcup-legend-upgrade data-worldcup-legend-rerolls={rerolls}>
      <div className="worldcup-draft__legend-head">
        <span className="worldcup-draft__kicker">Road to Mundial Legend</span>
        <h2>Campeón {edition.year}: mejora tu XI</h2>
        <p>Elige una posición del campo. Cada mejora ofrece exactamente 3 jugadores del Mundial {edition.year} para esa posición. Puedes gastar hasta 3 o saltar al Mundial {nextEdition?.year || 'siguiente'}.</p>
        <div className="worldcup-draft__legend-pills">
          <span>Rerolls: <b>{rerolls}</b></span>
          <span>Siguiente: <b>{nextEdition?.year || 'Campeones'}</b></span>
        </div>
      </div>
      <DraftPitch slots={slots} formation={formation} activeSlotId={activeSlotId} onSlotClick={onSlotClick} />
      {/* The candidate cards are dealt by the shared Mundial Draft CardPicker
          (rendered by the parent). Only the no-candidates notice lives here. */}
      {activeSlotId && choices.length === 0 && (
        <div className="worldcup-draft__legend-choices">
          <p className="worldcup-draft__legend-empty">No hay 3 candidatos puros de {edition.year} para esa posición. Elige otra posición o salta mejoras.</p>
        </div>
      )}
      <button className="worldcup-draft__ghost worldcup-draft__ghost--block" type="button" data-worldcup-legend-skip-upgrades onClick={onSkip}>
        Saltar mejoras
      </button>
    </section>
  );
}

function LegendGauntletStage({ slots, formation, opponents, onStart }) {
  return (
    <section className="worldcup-draft__legend-gauntlet" data-worldcup-legend-gauntlet>
      <div className="worldcup-draft__legend-head">
        <span className="worldcup-draft__kicker">Reto final</span>
        <h2>Campeones históricos, sin rerolls</h2>
        <p>Has superado todos los Mundiales. Ahora tu XI se mide, seguido y sin mejoras, contra los campeones históricos de cada edición.</p>
      </div>
      <DraftPitch slots={slots} formation={formation} activeSlotId={null} onSlotClick={() => {}} />
      <div className="worldcup-draft__legend-opponents">
        {opponents.map(({ edition, opponent }) => (
          <div key={`${edition.year}-${opponent.country}`} className="worldcup-draft__legend-opponent">
            <span>{edition.year}</span>
            <strong>{opponent.flag} {opponent.countryEs || opponent.country}</strong>
            <em>{opponent.rating}</em>
          </div>
        ))}
      </div>
      <button className="worldcup-draft__primary" type="button" onClick={onStart}>Enfrentarse a campeones</button>
    </section>
  );
}

function LegendChampionStage({ slots, formation, summary, onShare, onReset }) {
  return (
    <section className="worldcup-draft__legend-champion" data-worldcup-legend-champion>
      <div className="worldcup-draft__result-head is-champion">
        <div className="worldcup-draft__result-badge"><Trophy size={34} /></div>
        <span className="worldcup-draft__kicker">Road to Mundial Legend</span>
        <h2>Campeón de los Mundiales</h2>
        <div className="worldcup-draft__result-stats">
          <div><b>{summary.avg}</b><span>Media</span></div>
          <div><b>{summary.chemistry.total}</b><span>Química</span></div>
          <div><b>{formation}</b><span>Sistema</span></div>
        </div>
      </div>
      <DraftPitch slots={slots} formation={formation} activeSlotId={null} onSlotClick={() => {}} />
      <div className="worldcup-draft__actions">
        <button className="worldcup-draft__primary" type="button" data-worldcup-legend-share onClick={onShare}>Compartir imagen</button>
        <button className="worldcup-draft__ghost worldcup-draft__ghost--block" type="button" onClick={onReset}>Nuevo reto</button>
      </div>
    </section>
  );
}

// A single "Estadísticas en vivo" comparison row: home value (left), the label
// in the middle, away value (right) and a split bar weighted to the home share.
// Percent rows are already 0–100; raw counts (shots, xG) are normalised here.
function StatRow({ label, home, away, suffix = '', isPercent = false }) {
  const total = (Number(home) || 0) + (Number(away) || 0);
  const homePct = isPercent
    ? Math.max(0, Math.min(100, Number(home) || 0))
    : total > 0 ? Math.round(((Number(home) || 0) / total) * 100) : 50;
  return (
    <div className="worldcup-draft__statrow">
      <b className="worldcup-draft__statrow-home">{home}{suffix}</b>
      <span className="worldcup-draft__statrow-label">{label}</span>
      <b className="worldcup-draft__statrow-away">{away}{suffix}</b>
      <div className="worldcup-draft__statrow-track" aria-hidden="true">
        <i className="worldcup-draft__statrow-fill worldcup-draft__statrow-fill--home" style={{ width: `${homePct}%` }} />
        <i className="worldcup-draft__statrow-fill worldcup-draft__statrow-fill--away" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

// SofaScore-like, PC Gaffer-branded match detail, rebuilt as a stacked analysis
// rail to match the Figma direction: último evento, the influence chips, the
// momentum (presión) strip, live statistics bars, the minute feed (cronología),
// the player of the match and the keys — all pure presentation derived from the
// already-authoritative result, never re-simulating the outcome.
function MatchTimeline({ match, summary, timeline, lineup, resultWord, resultCode, live = false }) {
  const { events, buckets, markers, possessionHome, momentumHome, oppName, oppShort, stats, lastEvent } = timeline;
  const momentumAway = 100 - momentumHome;

  // Deterministic assist for a home goal: a team-mate (mid/att) other than the
  // scorer, chosen by a stable hash so the line never jitters between renders.
  const assistName = (() => {
    if (!lastEvent || lastEvent.team !== 'home' || lastEvent.type !== 'goal') return null;
    const creators = lineup.filter((slot) => MID_GROUPS.has(slot.group) || ATTACK_GROUPS.has(slot.group));
    const pool = (creators.length ? creators : lineup)
      .filter((slot) => shortName(slot.player) !== lastEvent.player && slot.player.displayName !== lastEvent.player);
    if (!pool.length) return null;
    const idx = hashSeed(`${match.round}:${lastEvent.minute}:${lastEvent.player}`) % pool.length;
    return shortName(pool[idx].player);
  })();

  const mvp = pickMatchMvp(lineup, match, summary, resultCode);
  const keys = buildMatchKeys(match, summary, stats, resultCode, oppName);

  return (
    <section className="worldcup-draft__sim" data-worldcup-match-timeline data-result={resultCode}>
      {/* Último evento — the headline moment of the tie. */}
      {lastEvent && (
        <div className="worldcup-draft__sim-block worldcup-draft__last-event" data-worldcup-last-event>
          <span className="worldcup-draft__kicker">Último evento</span>
          <div className="worldcup-draft__last-event-row">
            <span className="worldcup-draft__last-event-min">{eventMinuteLabel(lastEvent.minute)}</span>
            <span className="worldcup-draft__last-event-icon" aria-hidden="true">{EVENT_ICONS[lastEvent.type] || '•'}</span>
            <div className="worldcup-draft__last-event-id">
              <strong>{eventText(lastEvent, oppName)}</strong>
              <small>
                {lastEvent.team === 'home' ? 'Tu XI' : oppName}
                {assistName ? ` · asistencia de ${assistName}` : ''}
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Influence chips: the levers the user actually controls vs the rival. */}
      <div className="worldcup-draft__sim-influence" data-worldcup-influence>
        <div className="worldcup-draft__sim-metric is-accent">
          <span>Media XI</span><b>{summary.avg}</b>
        </div>
        <div className="worldcup-draft__sim-metric is-accent">
          <span>Química</span><b>{summary.chemistry.total}</b>
        </div>
        <div className="worldcup-draft__sim-metric">
          <span>Posesión</span><b>{possessionHome}%</b>
        </div>
        <div className="worldcup-draft__sim-metric worldcup-draft__sim-metric--opp">
          <span>Rival ({oppShort})</span><b>{match.opponent.rating}</b>
        </div>
      </div>

      {/* Presión / momentum strip — shares the live MatchDay simulator engine. */}
      <div className="worldcup-draft__sim-block worldcup-draft__sim-momentum" data-worldcup-momentum data-bucket-count={buckets.length}>
        <div className="worldcup-draft__sim-momentum-head">
          <span className="worldcup-draft__kicker">Presión</span>
          <span className="worldcup-draft__sim-dominance">
            <span>Tu XI {momentumHome}%</span>
            <i aria-hidden="true">·</i>
            <span>{momentumAway}% {oppShort}</span>
          </span>
        </div>
        <div className="worldcup-draft__mom-chart" data-worldcup-mom-chart>
          <span className="worldcup-draft__mom-zone worldcup-draft__mom-zone--home" aria-hidden="true" />
          <span className="worldcup-draft__mom-zone worldcup-draft__mom-zone--away" aria-hidden="true" />
          {buckets.map((bucket, index) => {
            const height = Math.max(4, Math.abs(bucket.value));
            const dir = bucket.value >= 0 ? 'up' : 'down';
            return (
              <div className="worldcup-draft__mom-bucket" key={index} data-worldcup-mom-bucket title={`${bucket.start}'–${bucket.end}'`}>
                <span className={`worldcup-draft__mom-bar worldcup-draft__mom-bar--${dir}`} style={{ height: `${height / 2}%` }} />
              </div>
            );
          })}
          <span className="worldcup-draft__mom-baseline" aria-hidden="true" />
          <span className="worldcup-draft__mom-halftime" aria-hidden="true" />
          {markers.map((marker, index) => {
            const label = `${eventMinuteLabel(marker.minute)} · ${marker.team === 'home' ? 'Tu XI' : oppName}`;
            return (
              <span
                key={`m-${index}`}
                className={`worldcup-draft__mom-marker worldcup-draft__mom-marker--${marker.team} is-${marker.type}`}
                style={{ left: `${marker.left}%`, '--stack': marker.stack }}
                data-worldcup-mom-marker
                title={label}
                aria-label={label}
              >
                {marker.type === 'goal'
                  ? <i className="worldcup-draft__mom-goal" aria-hidden="true" />
                  : <i className={`worldcup-draft__mom-card worldcup-draft__mom-card--${marker.type === 'yellow_card' ? 'yellow' : 'red'}`} />}
              </span>
            );
          })}
        </div>
        <div className="worldcup-draft__mom-axis" aria-hidden="true">
          <span>0'</span><span>45'</span><span>90'</span>
        </div>
      </div>

      {/* Estadísticas en vivo — split bars, derived from the same event stream. */}
      <div className="worldcup-draft__sim-block worldcup-draft__sim-stats" data-worldcup-stats>
        <span className="worldcup-draft__kicker">Estadísticas en vivo</span>
        <div className="worldcup-draft__statlist">
          <StatRow label="Posesión" home={stats.possessionHome} away={stats.possessionAway} suffix="%" isPercent />
          <StatRow label="Tiros" home={stats.shotsHome} away={stats.shotsAway} />
          <StatRow label="A puerta" home={stats.onTargetHome} away={stats.onTargetAway} />
          <StatRow label="xG" home={stats.xgHome} away={stats.xgAway} />
        </div>
      </div>

      {/* Cronología — the minute-by-minute feed. */}
      <div className="worldcup-draft__sim-block">
        <span className="worldcup-draft__kicker">Cronología</span>
        <ol className="worldcup-draft__sim-events" data-worldcup-event-list>
          {events.map((event, index) => (
            <li
              key={`e-${index}`}
              className={`worldcup-draft__sim-event is-${event.type} is-${event.team}`}
              data-worldcup-event
              data-event-type={event.type}
            >
              <span className="worldcup-draft__sim-event-min">{eventMinuteLabel(event.minute)}</span>
              <span className="worldcup-draft__sim-event-icon" aria-hidden="true">{EVENT_ICONS[event.type] || '•'}</span>
              <span className="worldcup-draft__sim-event-text">{eventText(event, oppName)}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Jugador del partido — deterministic MVP tied to scorers + ratings. */}
      {!live && mvp && (
        <div className="worldcup-draft__sim-block worldcup-draft__mvp" data-worldcup-mvp>
          <span className="worldcup-draft__kicker">Jugador del partido</span>
          <div className="worldcup-draft__mvp-card">
            <span className={`worldcup-draft__mvp-rating tier-${ratingTier(mvp.slot.displayRating)}`}>{mvp.slot.displayRating}</span>
            <div className="worldcup-draft__mvp-id">
              <strong>{mvp.slot.player.displayName || mvp.slot.player.name}</strong>
              <small>
                {primaryPositionLabel(mvp.slot.player)}
                {mvp.goals > 0 ? ` · ${mvp.goals} ${mvp.goals === 1 ? 'gol' : 'goles'}` : ''}
                {assistName && shortName(mvp.slot.player) === assistName ? ' · 1 asistencia' : ''}
              </small>
            </div>
            <em className="worldcup-draft__mvp-mark">{mvp.mark.toFixed(1)}</em>
          </div>
        </div>
      )}

      {/* Claves del partido — derived narration, never alters the outcome. */}
      {!live && keys.length > 0 && (
        <div className="worldcup-draft__sim-block worldcup-draft__keys" data-worldcup-keys>
          <span className="worldcup-draft__kicker">Claves del partido</span>
          <ul className="worldcup-draft__keys-list">
            {keys.map((key, index) => (
              <li key={`k-${index}`}><ChevronRight size={13} /> <span>{key}</span></li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FixtureRow({ match }) {
  const code = (match.decided || match.result).toLowerCase();
  return (
    <div className={`worldcup-draft__fixture result-${code}`}>
      <em className="worldcup-draft__result-pill">{match.decided || match.result}</em>
      <div className="worldcup-draft__fixture-main">
        <strong>{match.opponent.flag} {match.opponent.countryEs || match.opponent.country} <span>{match.opponent.year}</span></strong>
        <small>
          {match.round}
          {match.shootout ? ` · Penaltis ${match.shootout === 'won' ? 'ganados' : 'perdidos'}` : ''}
          {match.scorers.length ? ` · ${match.scorers.join(', ')}` : ' · Sin goles'}
        </small>
      </div>
      <b className="worldcup-draft__fixture-score">{match.forGoals}<i>-</i>{match.againstGoals}</b>
    </div>
  );
}

function DraftPitch({ slots, formation, activeSlotId, onSlotClick }) {
  return (
    <div className="worldcup-draft__pitch-wrap">
      <div className="worldcup-draft__pitch-tag">{formation}</div>
      <div className="worldcup-draft__pitch">
        <div className="worldcup-draft__pitch-lines" aria-hidden="true">
          <span className="worldcup-draft__pitch-circle" />
          <span className="worldcup-draft__pitch-spot" />
          <span className="worldcup-draft__pitch-box worldcup-draft__pitch-box--top" />
          <span className="worldcup-draft__pitch-box worldcup-draft__pitch-box--bottom" />
          <span className="worldcup-draft__pitch-six worldcup-draft__pitch-six--top" />
          <span className="worldcup-draft__pitch-six worldcup-draft__pitch-six--bottom" />
        </div>
        {slots.map((slot) => {
          const filled = Boolean(slot.player);
          const stateClass = filled
            ? `is-filled tier-${ratingTier(slot.displayRating)}`
            : slot.id === activeSlotId
              ? 'is-open is-active'
              : 'is-open';
          return (
            <button
              key={slot.id}
              type="button"
              data-draft-slot={slot.label}
              data-slot-filled={filled ? 'true' : 'false'}
              className={`worldcup-draft__slot ${stateClass}`}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              onClick={() => onSlotClick(slot.id)}
              aria-label={filled
                ? `${slot.label}: ${slot.player.displayName || slot.player.name} — reemplazar`
                : `${slot.label} libre, elegir jugador`}
            >
              <span className="worldcup-draft__slot-badge">{filled ? slot.displayRating : slot.label}</span>
              <span className="worldcup-draft__slot-name">{filled ? shortName(slot.player) : slot.label}</span>
              <small className="worldcup-draft__slot-hint">{filled ? 'Cambiar' : 'Elegir'}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Chemistry + squad summary, rendered BELOW the pitch. Shows the line metrics,
// the chemistry total with its country/style links, and the primary CTA that
// becomes available once the XI is complete.
function SummaryPanel({ summary, onSimulate, isComplete }) {
  const chem = summary.chemistry;
  return (
    <section className="worldcup-draft__chem" data-draft-chemistry>
      <div className="worldcup-draft__chem-metrics">
        <Metric label="Media" value={summary.avg} />
        <Metric label="Ataque" value={summary.attack} />
        <Metric label="Medio" value={summary.midfield} />
        <Metric label="Defensa" value={summary.defense} />
        <Metric label="Química" value={chem.total} accent />
      </div>

      <div className="worldcup-draft__chem-breakdown">
        <div className="worldcup-draft__chem-split">
          <span><Link2 size={12} /> País <b>+{chem.country}</b></span>
          <span><Shield size={12} /> Estilo <b>+{chem.style}</b></span>
        </div>
        {(chem.countryLinks.length > 0 || chem.styleLinks.length > 0) ? (
          <div className="worldcup-draft__links">
            {chem.countryLinks.slice(0, 4).map((link) => (
              <em key={`c-${link.code}`} className="worldcup-draft__link worldcup-draft__link--country">
                <i aria-hidden="true">{link.flag}</i>{link.label} ×{link.count}
              </em>
            ))}
            {chem.styleLinks.slice(0, 4).map((link) => (
              <em key={`s-${link.style}`} className="worldcup-draft__link worldcup-draft__link--style" data-style={link.style}>
                {link.style} ×{link.count}
              </em>
            ))}
          </div>
        ) : (
          <p className="worldcup-draft__links-empty">Reúne jugadores del mismo país o estilo para activar enlaces de química.</p>
        )}
      </div>

      <button
        className="worldcup-draft__primary worldcup-draft__chem-cta"
        type="button"
        onClick={onSimulate}
        disabled={!isComplete}
        data-draft-simulate
      >
        <Trophy size={18} /> {isComplete ? 'Disputar Mundial' : `Completa tu XI (${summary.picked}/11)`}
      </button>
    </section>
  );
}

function Metric({ label, value, accent }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`worldcup-draft__metric${accent ? ' is-accent' : ''}`}>
      <div className="worldcup-draft__metric-row">
        <span>{label}</span>
        <strong>{value || '-'}</strong>
      </div>
      <div className="worldcup-draft__metric-bar"><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
