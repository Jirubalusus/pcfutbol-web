#!/usr/bin/env node
/**
 * audit-i18n-production.mjs
 *
 * Production i18n guard for the screens that must be fully localized in
 * English mode: the Main Menu and the complete Road to Glory flow.
 *
 * It does two things:
 *   1. Loads src/locales/en.json and es.json and fails if any key present in
 *      es is missing from en (English must cover every Spanish string).
 *   2. Scans MainMenu.jsx, MatchDay.jsx and every src/components/GloryMode/*.jsx file for
 *      hardcoded Spanish UI copy. It is deliberately practical: it only looks
 *      inside string literals and JSX text, skips comments / imports / console
 *      calls, allows proper nouns (Segunda RFEF, Primera RFEF, Champions,
 *      FC Gloria, Estadio Municipal) and fails on a denylist of visible Spanish
 *      copy words.
 *
 * Usage: node scripts/audit-i18n-production.mjs
 * Exit code 0 = clean, 1 = violations found.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// ---------------------------------------------------------------------------
// 1. Locale key coverage: every es key must exist in en
// ---------------------------------------------------------------------------

function flatten(obj, prefix = '', out = {}) {
  for (const key of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, full, out);
    } else {
      out[full] = value;
    }
  }
  return out;
}

function loadJson(rel) {
  const file = path.join(SRC, rel);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const en = flatten(loadJson('locales/en.json'));
const es = flatten(loadJson('locales/es.json'));

const missingInEn = Object.keys(es).filter((k) => !(k in en));

// ---------------------------------------------------------------------------
// 2. Hardcoded Spanish UI scan
// ---------------------------------------------------------------------------

// Visible Spanish copy that must never appear in the audited files.
// Matched case-insensitively as substrings inside string literals / JSX text.
const FORBIDDEN = [
  'Volver',
  'Camino a la Gloria',
  'Crea tu club',
  'Sin partida',
  'Nueva partida',
  'Vitrina',
  'Desbloqueada',
  'Desbloqueadas',
  'desbloqueadas',
  'Robo Legal',
  'Presupuesto',
  'Plantilla',
  'Siguiente',
  'Anterior',
  'Temporada',
  'Jornada',
  'Próximamente',
  'Proximamente',
  'Cancelar',
  'Confirmar',
  'Cambiar temporada',
  'Base de datos',
  'cartas desbloqueadas',
  'Ascensos',
  'Cartas únicas',
  'Meta final',
  'Nuevo proyecto',
  'Sin partida activa',
  'Iniciar Camino',
  'Ver vitrina',
  'Elige',
  'jugador',
  'jugadores',
  'media similar',
  'intercambio',
  'renovarle',
  'contrato',
  'años',
  'partido',
  'partidos',
  'resultado',
  'Victoria',
  'Derrota',
  'Empate',
  'Mantener original',
  'Aplicar resultado',
  'Ascenso',
  'Mejoras',
  'Historial',
  'Overall Strength',
  'Your formation',
  'Your tactic',
  'Skip to end',
  'Último evento',
  'Ultimo evento',
  'El partido está arrancando',
  'Esperando la primera acción',
  'Dominio',
  'A puerta',
  'Cambios',
  'Sin cambios',
  'Total faltas',
  'Cronología',
  'Cronologia',
  'Sin goles',
  'Claves del partido',
  'Aforo',
  'Asistencia',
  'Recaudación',
  'Recaudacion',
  'Jugador del partido',
  'Valoración',
  'Valoracion',
  'prórroga',
  'prorroga',
  'Apuesta de ruleta',
  'Casilla elegida',
  'Ganas:',
  'Empatas:',
  'Pierdes:',
  'Burbuja financiera',
  'Investigación fiscal',
  'Investigacion fiscal',
  'Necesitas 11 titulares',
  // TeamSelection/trial visitor flow
  'Base de datos activa',
  'Base actual del juego',
  'Cambia el año/base de datos',
  'Foto histórica inicial',
  'Cargando temporada histórica',
  'Planificacion de pretemporada',
  'Planificación de pretemporada',
  'Elige una gira',
  'Saltar pretemporada',
  'OVR rivales',
  'dificultad',
  'Casa',
  'Fuera',
  'Tour de Rodaje',
  'Gira de Prestigio',
  'Preparacion premium',
  'Preparación premium',
  'Maxima taquilla',
  'Máxima taquilla',
];

// Proper nouns / data that are allowed even though they look Spanish.
// (Documented here for maintainers; the scanner does not flag words outside
// the FORBIDDEN list, so these pass automatically.)
const ALLOWED_PROPER_NOUNS = [
  'Segunda RFEF',
  'Primera RFEF',
  'Primera Federación',
  'Segunda División',
  'Champions',
  'FC Gloria',
  'Estadio Municipal',
];

const forbiddenMatchers = FORBIDDEN.map((phrase) => ({
  phrase,
  re: new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
}));

function isSkippableLine(line) {
  const trimmed = line.trim();
  if (trimmed === '') return true;
  // comments (// line, /* block, * jsdoc continuation)
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return true;
  // imports / re-exports
  if (trimmed.startsWith('import ') || trimmed.startsWith('} from')) return true;
  // console diagnostics are not user-facing
  if (/console\.(log|warn|error|info|debug)\s*\(/.test(trimmed)) return true;
  return false;
}

// Extract user-facing text regions from a line: string-literal contents and
// JSX text nodes. Everything else (identifiers, regex literals, class names
// without quotes, etc.) is ignored.
function extractTextRegions(line) {
  const regions = [];
  // String literals: '...', "...", `...`
  const strRe = /(['"`])((?:\\.|(?!\1).)*)\1/g;
  let m;
  while ((m = strRe.exec(line)) !== null) {
    regions.push(m[2]);
  }
  // JSX text between a closing '>' and the next '<' or '{'
  const jsxRe = />([^<>{}]+)[<{]/g;
  while ((m = jsxRe.exec(line)) !== null) {
    regions.push(m[1]);
  }
  return regions;
}

function scanFile(absPath) {
  const violations = [];
  const lines = fs.readFileSync(absPath, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (isSkippableLine(line)) return;
    const regions = extractTextRegions(line);
    if (regions.length === 0) return;
    const haystack = regions.join('');
    for (const { phrase, re } of forbiddenMatchers) {
      if (re.test(haystack)) {
        violations.push({ line: idx + 1, phrase, text: line.trim() });
      }
    }
  });
  return violations;
}

function collectTargets() {
  const targets = [];
  const mainMenu = path.join(SRC, 'components/MainMenu/MainMenu.jsx');
  if (fs.existsSync(mainMenu)) targets.push(mainMenu);
  const matchDay = path.join(SRC, 'components/MatchDay/MatchDay.jsx');
  if (fs.existsSync(matchDay)) targets.push(matchDay);
  const teamSelection = path.join(SRC, 'components/TeamSelection/TeamSelection.jsx');
  if (fs.existsSync(teamSelection)) targets.push(teamSelection);
  const gloryDir = path.join(SRC, 'components/GloryMode');
  if (fs.existsSync(gloryDir)) {
    for (const file of fs.readdirSync(gloryDir).sort()) {
      if (file.endsWith('.jsx')) targets.push(path.join(gloryDir, file));
    }
  }
  return targets;
}

const targets = collectTargets();
const fileViolations = [];
for (const file of targets) {
  const v = scanFile(file);
  if (v.length) fileViolations.push({ file: path.relative(ROOT, file), violations: v });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

let failed = false;

console.log('i18n production audit');
console.log('======================');
console.log(`Locale keys: en=${Object.keys(en).length} es=${Object.keys(es).length}`);

if (missingInEn.length) {
  failed = true;
  console.log(`\n✖ ${missingInEn.length} key(s) present in es.json but MISSING in en.json:`);
  for (const k of missingInEn) console.log(`    - ${k}`);
} else {
  console.log('✓ Every es.json key has an en.json counterpart.');
}

console.log(`\nScanned ${targets.length} component file(s) for hardcoded Spanish UI copy.`);
if (fileViolations.length) {
  failed = true;
  let count = 0;
  for (const { file, violations } of fileViolations) {
    console.log(`\n✖ ${file}`);
    for (const v of violations) {
      count++;
      console.log(`    ${file}:${v.line}  [${v.phrase}]  ${v.text}`);
    }
  }
  console.log(`\n${count} hardcoded Spanish UI literal(s) found.`);
} else {
  console.log('✓ No hardcoded Spanish UI copy in audited files.');
}

if (failed) {
  console.log('\nAUDIT FAILED.');
  process.exit(1);
}
console.log('\nAUDIT PASSED.');
