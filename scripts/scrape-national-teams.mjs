#!/usr/bin/env node
/**
 * National Teams Generator for PC Gaffer
 * Generates top 48 national teams with realistic squads.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', 'public', 'data', 'national-teams.json');

function teamRating(rank) { return Math.round(88 - ((rank - 1) / 47) * 26); }
function playerRating(teamRat, idx) {
  const base = idx < 11 ? teamRat + 2 : teamRat - 3;
  return Math.max(45, Math.min(95, base + Math.floor(Math.random() * 7) - 3));
}
function flag(code) {
  const cc = { ENG:'GB-ENG', WAL:'GB-WLS', SCO:'GB-SCT', NIR:'GB-NIR' }[code];
  if (cc) { /* use flag emoji for GB subdivisions */ }
  // Map 3-letter to 2-letter for flag
  const map2 = CC_MAP[code];
  if (!map2) return '🏳️';
  return [...map2].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
}

const CC_MAP = {
  ESP:'ES',FRA:'FR',ARG:'AR',ENG:'GB',BRA:'BR',BEL:'BE',NED:'NL',POR:'PT',ITA:'IT',GER:'DE',
  CRO:'HR',COL:'CO',MAR:'MA',URU:'UY',SUI:'CH',JPN:'JP',MEX:'MX',USA:'US',SEN:'SN',DEN:'DK',
  AUT:'AT',UKR:'UA',TUR:'TR',IRN:'IR',KOR:'KR',AUS:'AU',NGA:'NG',PER:'PE',ECU:'EC',EGY:'EG',
  SWE:'SE',POL:'PL',SRB:'RS',HUN:'HU',CMR:'CM',CZE:'CZ',NOR:'NO',SCO:'GB',CIV:'CI',TUN:'TN',
  ALG:'DZ',CRC:'CR',CAN:'CA',PAR:'PY',GHA:'GH',QAT:'QA',SAU:'SA',CHI:'CL',WAL:'GB',MLI:'ML',
  VEN:'VE',JAM:'JM',COD:'CD',BFA:'BF',PAN:'PA',BOL:'BO',ROU:'RO',GRE:'GR',SVK:'SK',GEO:'GE',
  IRQ:'IQ',UZB:'UZ',ZAF:'ZA'
};

const CONF_MAP = {
  UEFA:'ESP FRA ENG BEL NED POR ITA GER CRO SUI DEN AUT UKR TUR SWE POL SRB HUN CZE NOR SCO GRE ROU SVK GEO WAL'.split(' '),
  CONMEBOL:'ARG BRA COL URU ECU PER CHI PAR VEN BOL'.split(' '),
  CONCACAF:'MEX USA CRC CAN JAM PAN'.split(' '),
  CAF:'MAR SEN NGA CMR EGY CIV TUN ALG GHA MLI COD BFA ZAF'.split(' '),
  AFC:'JPN IRN KOR AUS QAT SAU IRQ UZB'.split(' '),
};
function getConf(code) {
  for (const [c, codes] of Object.entries(CONF_MAP)) if (codes.includes(code)) return c;
  return 'UEFA';
}

const NAME_ES = {
  Spain:'España',France:'Francia',Germany:'Alemania',Brazil:'Brasil',Argentina:'Argentina',
  England:'Inglaterra',Netherlands:'Países Bajos',Portugal:'Portugal',Belgium:'Bélgica',
  Italy:'Italia',Croatia:'Croacia',Switzerland:'Suiza',Denmark:'Dinamarca',Austria:'Austria',
  Colombia:'Colombia',Uruguay:'Uruguay',Mexico:'México',Sweden:'Suecia',Turkey:'Turquía',
  'United States':'Estados Unidos',Japan:'Japón',Morocco:'Marruecos',Senegal:'Senegal',
  Ukraine:'Ucrania',Serbia:'Serbia',Poland:'Polonia',Hungary:'Hungría','South Korea':'Corea del Sur',
  Ecuador:'Ecuador',Iran:'Irán',Australia:'Australia',Nigeria:'Nigeria',Peru:'Perú',
  'Czech Republic':'Rep. Checa','Ivory Coast':'Costa de Marfil',Norway:'Noruega',
  Scotland:'Escocia',Cameroon:'Camerún',Egypt:'Egipto',Chile:'Chile',Canada:'Canadá',
  Paraguay:'Paraguay',Tunisia:'Túnez',Algeria:'Argelia',Greece:'Grecia',Romania:'Rumanía',
  Ghana:'Ghana',Mali:'Malí',Panama:'Panamá',Venezuela:'Venezuela',Slovakia:'Eslovaquia',
  'Costa Rica':'Costa Rica','Saudi Arabia':'Arabia Saudita',Iraq:'Irak',Qatar:'Catar',
  'DR Congo':'RD Congo',Jamaica:'Jamaica',Wales:'Gales','Burkina Faso':'Burkina Faso',
  Bolivia:'Bolivia',Georgia:'Georgia','South Africa':'Sudáfrica',Uzbekistan:'Uzbekistán',
};

// All 48 teams with squads stored in separate file
import { SQUADS } from './squad-data.mjs';

const TEAMS = SQUADS.map((t, i) => {
  const rank = i + 1;
  const tr = teamRating(rank);
  return {
    id: t.name.toLowerCase().replace(/\s+/g, '-'),
    name: t.name,
    nameEs: NAME_ES[t.name] || t.name,
    code: t.code,
    flag: flag(t.code),
    confederation: getConf(t.code),
    fifaRanking: rank,
    rating: tr,
    players: t.players.map((p, j) => ({
      name: p.n,
      position: p.p,
      age: p.a,
      rating: playerRating(tr, j),
      club: p.c || ''
    }))
  };
});

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(TEAMS, null, 2), 'utf-8');
console.log(`✅ Saved ${TEAMS.length} teams to ${OUTPUT}`);
