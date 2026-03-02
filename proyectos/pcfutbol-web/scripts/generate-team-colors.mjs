import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const allTeams = JSON.parse(readFileSync(join(root, 'public/data/all-teams.json'), 'utf-8'));
// Read from .old.json (original real-team-keyed colors) if it exists, otherwise from teamColors.json
import { existsSync } from 'fs';
const oldPath = existsSync(join(root, 'src/data/teamColors.old.json'))
  ? join(root, 'src/data/teamColors.old.json')
  : join(root, 'src/data/teamColors.json');
const oldColors = JSON.parse(readFileSync(oldPath, 'utf-8'));

// The teamId used at runtime is:
//   - t.id if it exists in all-teams.json
//   - otherwise: (t.shortName || t.name || '').toLowerCase().replace(/\s+/g, '-') + '-' + leagueId
//
// We need teamColors.json keyed by those runtime teamIds.
// The old teamColors.json is keyed by simplified real-team slugs.
// We map: runtime teamId → old color key.

const idToColorKey = {
  // LaLiga (ids are real slugs like fc-barcelona)
  'fc-barcelona': 'barcelona', 'villarreal-cf': 'villarreal', 'real-betis-balompie': 'real-betis',
  'rc-celta': 'celta', 'rcd-espanyol': 'espanyol', 'rcd-mallorca': 'mallorca',
  'girona-fc': 'girona', 'ca-osasuna': 'osasuna', 'valencia-cf': 'valencia',
  'sevilla-fc': 'sevilla', 'deportivo-alaves': 'alaves', 'elche-cf': 'elche',
  'levante-ud': 'levante', 'getafe-cf': 'getafe', 'real-oviedo': 'oviedo',

  // Premier
  'tottenham-hotspur': 'tottenham', 'newcastle-united': 'newcastle',
  'fulham-fc': 'fulham', 'brighton-hove-albion': 'brighton',
  'west-ham-united': 'west-ham', 'afc-bournemouth': 'bournemouth',
  'manchester-united': 'manchester-united', 'wolverhampton-wanderers': 'wolves',
  'leicester-city': 'leicester', 'ipswich-town': 'ipswich',

  // Serie A
  'ac-milan': 'milan',

  // Bundesliga
  'fc-bayern-munchen': 'bayern-munich', 'bayer-04-leverkusen': 'bayer-leverkusen',
  'sc-freiburg': 'freiburg', 'tsg-1899-hoffenheim': 'hoffenheim',
  '1-fsv-mainz-05': 'mainz', 'vfl-wolfsburg': 'wolfsburg',
  'borussia-monchengladbach': 'borussia-mgladbach',

  // Ligue 1
  'paris-saint-germain': 'psg', 'olympique-de-marseille': 'marseille',
  'lille-osc': 'lille', 'as-monaco': 'monaco', 'stade-rennais-fc': 'rennes',
  'olympique-lyonnais': 'lyon', 'rc-strasbourg-alsace': 'strasbourg',
  'ogc-nice': 'nice', 'rc-lens': 'lens', 'fc-nantes': 'nantes',

  // Argentina
  'boca-juniors': 'club-atletico-boca-juniors', 'river-plate': 'club-atletico-river-plate',
  'racing-club': 'racing-club', 'lanus': 'club-atletico-lanus',
  'velez-sarsfield': 'club-atletico-velez-sarsfield',
  'estudiantes-de-la-plata': 'club-estudiantes-de-la-plata',
  'independiente': 'club-atletico-independiente', 'argentinos-juniors': 'argentinos-juniors',
  'rosario-central': 'club-atletico-rosario-central', 'talleres': 'club-atletico-talleres',
  'belgrano-de-cordoba': 'ca-belgrano', 'club-atletico-union': 'club-atletico-union',
  'platense': 'club-atletico-platense', 'ca-banfield': 'club-atletico-banfield',
  'defensa-y-justicia': 'defensa-y-justicia', 'tigre': 'club-atletico-tigre',
  'gimnasia-y-esgrima-la-plata': 'club-de-gimnasia-y-esgrima-la-plata',
  'huracan': 'club-atletico-huracan', 'independiente-rivadavia': 'independiente-rivadavia',
  'atletico-tucuman': 'club-atletico-tucuman', 'godoy-cruz': 'gimnasia-y-esgrima-de-mendoza',
  'instituto-atletico-central-cordoba': 'instituto-ac-cordoba',
  'ca-aldosivi': 'club-atletico-aldosivi', 'barracas-central': 'club-atletico-barracas-central',
  'san-lorenzo-de-almagro': 'club-atletico-san-lorenzo-de-almagro',
  'club-atletico-sarmiento': 'club-atletico-sarmiento-junin-',
  'newells-old-boys': 'club-atletico-newells-old-boys',
  'central-cordoba-sde': 'club-atletico-central-cordoba-sde-',
  'deportivo-riestra': 'cd-riestra',

  // Brazil
  'flamengo': 'flamengo-rio-de-janeiro', 'palmeiras': 'se-palmeiras-sao-paulo',
  'atletico-mineiro': 'clube-atletico-mineiro', 'botafogo': 'botafogo-rio-de-janeiro',
  'internacional': 'sc-internacional-porto-alegre', 'corinthians': 'corinthians-sao-paulo',
  'sao-paulo': 'fc-sao-paulo', 'fluminense': 'fluminense-rio-de-janeiro',
  'bahia': 'esporte-clube-bahia', 'gremio': 'gremio-porto-alegre',
  'cruzeiro': 'ec-cruzeiro-belo-horizonte', 'vasco-da-gama': 'vasco-da-gama-rio-de-janeiro',
  'vitoria': 'esporte-clube-vitoria', 'fortaleza': 'fc-santos',

  // Colombia
  'atletico-sc': 'atletico-nacional', 'millonarios-atletico': 'millonarios-fc',
  'america-real': 'cd-america-de-cali', 'barranquilla-athletic': 'junior-fc',
  'medellin-fc': 'independiente-medellin', 'santa-fe-fc': 'independiente-santa-fe',
  'cali-cf': 'deportivo-cali', 'ibague-fc': 'deportes-tolima',
  'manizales-fc': 'once-caldas', 'bucaramanga-real': 'atletico-bucaramanga',

  // Chile
  'ohiggins-club': 'cd-ohiggins', 'coquimbo-united': 'coquimbo-unido',
  'santiago-fc': 'club-universidad-de-chile', 'concepcion-club': 'csd-colo-colo',
  'valparaiso-atletico': 'cd-universidad-catolica',

  // Uruguay
  'defensor-athletic': 'defensor-sc', 'nacional-athletic': 'club-nacional',
  'banda-oriental-atletico': 'ca-boston-river', 'rio-de-la-plata-fc': 'ca-penarol',
  'racing-sc': 'liverpool-fc-montevideo',

  // Ecuador
  'quiteno-united': 'ldu-quito', 'esmeraldas-club': 'barcelona-sc-guayaquil',
  'oriente-sc': 'orense-sc', 'independiente-fc': 'independiente-del-valle',

  // Paraguay
  'guarani-fc': 'club-guarani', 'cerro-sc': 'club-cerro-porteno',
  'libertad-athletic': 'club-libertad-asuncion',
  'trinidense-atletico': 'club-nacional-asuncion',
  'nacional-real': 'olimpia-asuncion',

  // Peru
  'alianza-united': 'club-alianza-lima', 'cristal-fc': 'club-sporting-cristal',
  'universitario-deportivo': 'universitario-de-deportes',
  'melgar-athletic': 'fbc-melgar', 'cusco-club': 'cusco-fc',

  // Bolivia
  'bolivar-fc': 'bolivar-la-paz', 'strongest-athletic': 'the-strongest-la-paz',
  'always-ready-club': 'club-always-ready', 'blooming-sport': 'blooming-santa-cruz',
  'guabira-fc': 'club-deportivo-guabira',

  // Venezuela
  'carabobo-fc': 'carabobo-fc', 'tachira-sc': 'deportivo-tachira',
  'caracas-club': 'caracas-fc', 'academia-fc': 'academia-puerto-cabello',
  'deportivo-athletic': 'deportivo-la-guaira',

  // Primera RFEF
  'rm_castilla': 'real-madrid-castilla', 'bilbao_athletic': 'athletic-club-b',
  'celta_fortuna': 'celta-b', 'merida_ad': 'merida',
  'cf_talavera': 'talavera', 'unionistas_cf': 'unionistas',
  'real_murcia': 'murcia', 'villarreal_cf_b': 'villarreal-b',
  'betis_deportivo': 'betis-deportivo', 'antequera_cf': 'antequera',
  'hercules_cf': 'hercules', 'fc_cartagena': 'cartagena',
  'ponferradina': 'ponferradina', 'real_aviles': 'aviles',
  'cd_eldense': 'eldense', 'racing_ferrol': 'ferrol',
  'recreativo': 'recreativo', 'cd_tenerife': 'tenerife',
  'osasuna_b': 'osasuna',

  // Segunda RFEF
  'depor_fabril': 'deportivo-b', 'barca_atletic': 'barcelona-b',
  'ud_sanse': 'real-sociedad-b', 'xerez_cd': 'xerez', 'xerez_deportivo': 'xerez',
  'cf_intercity': 'intercity', 'cd_tudelano': 'tudelano',
  'linares': 'linares', 'burgos_promesas': 'burgos',
  'alaves_b': 'alaves', 'cd_ebro': 'zaragoza',
  'sd_eibar_b': 'eibar', 'rcd_espanyol_b': 'espanyol',
  'rayo_b': 'rayo-vallecano', 'getafe_cf_b': 'getafe',
  'girona_fc_b': 'girona', 'valladolid_prom': 'valladolid',
  'real_madrid_c': 'real-madrid', 'cd_castellon_b': 'castellon',
  'oviedo_vetusta': 'oviedo', 'cd_numancia': 'racing-santander',
  'ucam_murcia': 'murcia',
};

// For laliga2: teams have no id, so runtime teamId = shortName.toLowerCase() + '-laliga2'
// Map those shortName-based ids to color keys
const laliga2ShortToColorKey = {
  'dep': 'deportivo', 'rac': 'racing-santander', 'alm': 'almeria',
  'vll': 'valladolid', 'spo': 'sporting-gijon', 'cad': 'cadiz',
  'zar': 'zaragoza', 'gra': 'granada', 'bur': 'burgos',
  'mal': 'malaga', 'cas': 'castellon', 'eib': 'eibar',
  'mir': 'mirandes', 'cor': 'cordoba', 'alb': 'albacete',
  'hue': 'huesca', 'eld': 'eldense', 'fer': 'ferrol',
  'rsb': 'real-sociedad-b',
};

const newColors = {};
let mapped = 0, unmapped = 0;

for (const [leagueId, teams] of Object.entries(allTeams)) {
  if (!Array.isArray(teams)) continue;

  for (const t of teams) {
    if (!t) continue;

    // Compute the runtime teamId (same logic as teamsFirestore.js)
    let teamId;
    if (t.id) {
      teamId = t.id;
    } else {
      teamId = (t.shortName || t.name || '').toLowerCase().replace(/\s+/g, '-') + '-' + leagueId;
    }
    if (!teamId) continue;

    let colorEntry = null;

    // 1. Direct match in oldColors
    if (oldColors[teamId]) {
      colorEntry = oldColors[teamId];
    }
    // 2. Via mapping table
    else if (idToColorKey[teamId] && oldColors[idToColorKey[teamId]]) {
      colorEntry = oldColors[idToColorKey[teamId]];
    }
    // 3. For auto-generated ids (no t.id), try laliga2 shortName mapping
    else if (!t.id && t.shortName) {
      const sn = t.shortName.toLowerCase();
      if (laliga2ShortToColorKey[sn] && oldColors[laliga2ShortToColorKey[sn]]) {
        colorEntry = oldColors[laliga2ShortToColorKey[sn]];
      }
    }

    if (colorEntry) {
      newColors[teamId] = colorEntry;
      mapped++;
    } else {
      unmapped++;
    }
  }
}

console.log(`Mapped: ${mapped}, Unmapped (will use hash fallback): ${unmapped}`);
console.log(`Total entries in new teamColors: ${Object.keys(newColors).length}`);

// Sort keys
const sorted = {};
for (const k of Object.keys(newColors).sort()) {
  sorted[k] = newColors[k];
}

writeFileSync(
  join(root, 'src/data/teamColors.json'),
  JSON.stringify(sorted, null, 2) + '\n',
  'utf-8'
);
console.log('Written to src/data/teamColors.json');
