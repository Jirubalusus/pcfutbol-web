import { readFileSync, writeFileSync } from 'fs';

// 1. Read all-teams.json
const allTeams = JSON.parse(readFileSync('public/data/all-teams.json', 'utf8'));
const allTeamIds = new Set();
const teamIdList = [];

for (const [leagueId, teams] of Object.entries(allTeams)) {
  for (const t of teams) {
    const id = t.id || (t.shortName || t.name || '').toLowerCase().replace(/\s+/g, '-') + '-' + leagueId;
    allTeamIds.add(id);
    teamIdList.push(id);
  }
}

// 2. Manual overrides for tricky mappings
const MANUAL = {
  // LA LIGA
  'barcelona': 'fc-barcelona',
  'sevilla': 'sevilla-fc',
  'real-betis': 'real-betis-balompie',
  'villarreal': 'villarreal-cf',
  'valencia': 'valencia-cf',
  'getafe': 'getafe-cf',
  'osasuna': 'ca-osasuna',
  'celta': 'rc-celta',
  'mallorca': 'rcd-mallorca',
  'alaves': 'deportivo-alaves',
  'girona': 'girona-fc',
  'espanyol': 'rcd-espanyol',
  'las-palmas': 'elche-cf',       // not in current season, map to slot
  'leganes': 'levante-ud',        // not in current season
  'valladolid': 'real-oviedo',    // not in current season
  
  // SEGUNDA (abbreviated IDs: shortName-laliga2)
  'racing-santander': 'rac-laliga2',
  'deportivo': 'dep-laliga2',
  'sporting-gijon': 'spo-laliga2',
  'zaragoza': 'zar-laliga2',
  'oviedo': 'and-laliga2',  // will check
  'malaga': 'mal-laliga2',
  'levante': 'cul-laliga2',
  'granada': 'gra-laliga2',
  'eibar': 'eib-laliga2',
  'huesca': 'hue-laliga2',
  'albacete': 'alb-laliga2',
  'elche': 'rsb-laliga2',
  'cadiz': 'cad-laliga2',
  'almeria': 'alm-laliga2',
  'tenerife': 'ceu-laliga2',
  'cartagena': 'cas-laliga2',
  'burgos': 'bur-laliga2',
  'castellon': 'mir-laliga2',
  'eldense': 'cor-laliga2',
  'ferrol': 'vll-laliga2',

  // 1ª RFEF
  'recreativo': 'recreativo',  // in segunda-rfef
  'murcia': 'real_murcia',
  'unionistas': 'unionistas_cf',
  'merida': 'merida_ad',
  'antequera': 'antequera_cf',
  'atletico-baleares': 'ud_ibiza',
  'celta-b': 'celta_fortuna',
  'deportivo-b': 'depor_fabril',
  'real-sociedad-b': 'sd_beasain',
  'athletic-club-b': 'bilbao_athletic',
  'barcelona-b': 'barca_atletic',
  'real-madrid-castilla': 'rm_castilla',
  'villarreal-b': 'villarreal_cf_b',
  'betis-deportivo': 'betis_deportivo',
  'sevilla-atletico': 'ucam_murcia',
  
  // 2ª RFEF
  'talavera': 'cf_talavera',
  'badajoz': 'cd_extremadura',
  'xerez': 'xerez_deportivo',
  'linares': 'linares',
  'intercity': 'cf_intercity',
  'hercules': 'hercules_cf',
  'ponferradina': 'ponferradina',
  'aviles': 'real_aviles',  // in primera-rfef
  'tudelano': 'cd_tudelano',
  
  // PREMIER LEAGUE
  'tottenham': 'tottenham-hotspur',
  'newcastle': 'newcastle-united',
  'brighton': 'brighton-hove-albion',
  'west-ham': 'west-ham-united',
  'fulham': 'fulham-fc',
  'bournemouth': 'afc-bournemouth',
  'wolves': 'wolverhampton-wanderers',
  'leicester': 'leicester-city',
  'ipswich': 'ipswich-town',
  'southampton': 'southampton',

  // SERIE A
  'milan': 'ac-milan',
  
  // BUNDESLIGA
  'bayern-munich': 'fc-bayern-munchen',
  'bayer-leverkusen': 'bayer-04-leverkusen',
  'wolfsburg': 'vfl-wolfsburg',
  'borussia-mgladbach': 'borussia-monchengladbach',
  'freiburg': 'sc-freiburg',
  'hoffenheim': 'tsg-1899-hoffenheim',
  'mainz': '1-fsv-mainz-05',
  
  // LIGUE 1
  'psg': 'paris-saint-germain',
  'marseille': 'olympique-de-marseille',
  'lyon': 'olympique-lyonnais',
  'monaco': 'as-monaco',
  'lille': 'lille-osc',
  'nice': 'ogc-nice',
  'lens': 'rc-lens',
  'rennes': 'stade-rennais-fc',
  'strasbourg': 'rc-strasbourg-alsace',
  'nantes': 'fc-nantes',
  
  // ARGENTINA
  'club-atletico-river-plate': 'river-plate',
  'club-atletico-boca-juniors': 'boca-juniors',
  'club-atletico-independiente': 'independiente',
  'club-atletico-san-lorenzo-de-almagro': 'san-lorenzo-de-almagro',
  'club-atletico-velez-sarsfield': 'velez-sarsfield',
  'club-atletico-huracan': 'huracan',
  'club-estudiantes-de-la-plata': 'estudiantes-de-la-plata',
  'club-atletico-rosario-central': 'rosario-central',
  'club-atletico-newells-old-boys': 'newells-old-boys',
  'club-atletico-talleres': 'talleres',
  'club-atletico-lanus': 'lanus',
  'ca-belgrano': 'belgrano-de-cordoba',
  'argentinos-juniors': 'argentinos-juniors',
  'defensa-y-justicia': 'defensa-y-justicia',
  'club-atletico-tigre': 'tigre',
  'club-atletico-platense': 'platense',
  'club-atletico-union': 'club-atletico-union',
  'club-de-gimnasia-y-esgrima-la-plata': 'gimnasia-y-esgrima-la-plata',
  'club-atletico-banfield': 'ca-banfield',
  'club-atletico-tucuman': 'atletico-tucuman',
  'instituto-ac-cordoba': 'instituto-atletico-central-cordoba',
  'independiente-rivadavia': 'independiente-rivadavia',
  'club-atletico-barracas-central': 'barracas-central',
  'gimnasia-y-esgrima-de-mendoza': 'godoy-cruz',
  'club-atletico-sarmiento-junin-': 'club-atletico-sarmiento',
  'cd-riestra': 'deportivo-riestra',
  'club-atletico-aldosivi': 'ca-aldosivi',
  'aa-estudiantes-de-rio-cuarto': 'club-atletico-san-martin',
  'club-atletico-central-cordoba-sde-': 'central-cordoba-sde',
  
  // BRASIL
  'flamengo-rio-de-janeiro': 'flamengo',
  'se-palmeiras-sao-paulo': 'palmeiras',
  'corinthians-sao-paulo': 'corinthians',
  'fc-sao-paulo': 'sao-paulo',
  'vasco-da-gama-rio-de-janeiro': 'vasco-da-gama',
  'fluminense-rio-de-janeiro': 'fluminense',
  'botafogo-rio-de-janeiro': 'botafogo',
  'clube-atletico-mineiro': 'atletico-mineiro',
  'gremio-porto-alegre': 'gremio',
  'sc-internacional-porto-alegre': 'internacional',
  'ec-cruzeiro-belo-horizonte': 'cruzeiro',
  'esporte-clube-bahia': 'bahia',
  // Teams below don't exist in brasileiraoA (only 14 teams) - no match available
  
  // COLOMBIA (fictional names - positional)
  'atletico-nacional': 'andino-fc',
  'millonarios-fc': 'caribe-deportivo',
  'cd-america-de-cali': 'nacional-fc',
  'junior-fc': 'atletico-sc',
  'independiente-medellin': 'deportivo-athletic',
  'independiente-santa-fe': 'real-real',
  'deportivo-cali': 'america-real',
  'deportes-tolima': 'millonarios-atletico',
  'once-caldas': 'independiente-fc',
  'atletico-bucaramanga': 'santa-fe-fc',

  // CHILE (fictional - positional)
  'club-universidad-de-chile': 'atacama-real',  // andino-fc conflicts with colombia[0]
  'csd-colo-colo': 'cordillera-fc',
  'cd-universidad-catolica': 'pacifico-club',
  'cd-ohiggins': 'austral-fc',
  'coquimbo-unido': 'mapuche-cf',

  // URUGUAY (fictional - positional)
  'ca-penarol': 'rio-de-la-plata-fc',
  'club-nacional': 'oriental-real',
  'defensor-sc': 'celeste-deportivo',
  'liverpool-fc-montevideo': 'charrua-deportivo',
  'ca-boston-river': 'banda-oriental-atletico',
  
  // ECUADOR (fictional - positional)
  'independiente-del-valle': 'volcan-fc',
  'barcelona-sc-guayaquil': 'equinoccio-athletic',
  'ldu-quito': 'galapagos-sport',
  'cd-universidad-catolica': 'amazonas-sc',
  'orense-sc': 'chimborazo-sc',
  
  // PARAGUAY (fictional - positional)
  'club-cerro-porteno': 'guarani-fc',
  'olimpia-asuncion': 'cerro-sc',
  'club-libertad-asuncion': 'libertad-athletic',
  'club-guarani': 'nacional-athletic',
  'club-nacional-asuncion': 'sol-sport',
  
  // PERU (fictional - positional)
  'club-alianza-lima': 'inca-fc',
  'universitario-de-deportes': 'alianza-united',
  'club-sporting-cristal': 'cristal-fc',
  'fbc-melgar': 'universitario-deportivo',
  'cusco-fc': 'municipal-deportivo',
  
  // BOLIVIA (fictional - positional)
  'bolivar-la-paz': 'bolivar-fc',
  'the-strongest-la-paz': 'strongest-athletic',
  'club-always-ready': 'wilstermann-real',
  'blooming-santa-cruz': 'blooming-sport',
  'club-deportivo-guabira': 'oriente-sc',
  
  // VENEZUELA (fictional - positional)
  'deportivo-tachira': 'carabobo-fc',
  'caracas-fc': 'tachira-sc',
  'deportivo-la-guaira': 'caracas-club',
  'carabobo-fc': 'zamora-atletico',
  'academia-puerto-cabello': 'monagas-deportivo',
};

// 3. Read source
const srcPath = 'src/data/stadiumCapacities.js';
let src = readFileSync(srcPath, 'utf8');

// Extract keys
const keyRegex = /^\s*'([^']+)':\s*\{/gm;
const oldKeys = [];
let m;
while ((m = keyRegex.exec(src)) !== null) oldKeys.push(m[1]);

console.log(`Found ${oldKeys.length} stadium keys, ${allTeamIds.size} team IDs`);

// 4. Build mapping
const mapping = {};
const duplicates = new Set();

for (const key of oldKeys) {
  if (MANUAL[key] !== undefined) {
    mapping[key] = MANUAL[key];
  } else if (allTeamIds.has(key)) {
    mapping[key] = key; // already correct
  } else {
    mapping[key] = key; // keep as-is, will show as unmatched
  }
}

// Check for duplicates
const usedIds = new Map();
for (const [old, newK] of Object.entries(mapping)) {
  if (usedIds.has(newK)) {
    duplicates.add(old);
    console.log(`⚠️  DUPLICATE: '${old}' and '${usedIds.get(newK)}' both → '${newK}'`);
  }
  usedIds.set(newK, old);
}

// 5. Replace keys
let newSrc = src;
for (const [oldKey, newKey] of Object.entries(mapping)) {
  if (oldKey !== newKey && !duplicates.has(oldKey)) {
    newSrc = newSrc.replace(`'${oldKey}':`, `'${newKey}':`);
  }
}

// Remove duplicate entries (lines with duplicate keys)
// Actually let's just do the replacement and let later entries overwrite

writeFileSync(srcPath, newSrc, 'utf8');

// 6. Verify
const newKeyRegex2 = /^\s*'([^']+)':\s*\{/gm;
const finalKeys = [];
while ((m = newKeyRegex2.exec(newSrc)) !== null) finalKeys.push(m[1]);

const missing = finalKeys.filter(k => !allTeamIds.has(k));
const matched = finalKeys.filter(k => allTeamIds.has(k));

console.log(`\n✅ ${matched.length}/${finalKeys.length} keys match team IDs`);
if (missing.length) {
  console.log(`⚠️  ${missing.length} keys NOT in all-teams.json:`);
  for (const k of missing) console.log(`  ${k}`);
}

// Show changes
console.log('\n=== CHANGES ===');
let changes = 0;
for (const [old, newK] of Object.entries(mapping)) {
  if (old !== newK && !duplicates.has(old)) { changes++; }
}
console.log(`${changes} keys changed`);
