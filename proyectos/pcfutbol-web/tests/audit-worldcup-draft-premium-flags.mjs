import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const jsx = fs.readFileSync(path.join(root, 'src/components/WorldCupDraft/WorldCupDraft.jsx'), 'utf8');
const scss = fs.readFileSync(path.join(root, 'src/components/WorldCupDraft/WorldCupDraft.scss'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function cssBlock(flag) {
  const re = new RegExp(`&__feature-flag-css--${flag.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')} \\{([\\s\\S]*?)\\n  \\}`, 'm');
  const match = scss.match(re);
  assert(match, `Missing CSS flag block for ${flag}`);
  return match[1];
}

const requiredMappings = [
  ['MEX', 'mexico'],
  ['SUI', 'switzerland'],
  ['POL', 'poland'],
  ['USA', 'usa'],
  ['SEN', 'senegal'],
  ['CRC', 'costa-rica'],
  ['CIV', 'ivory-coast'],
];

for (const [code, flag] of requiredMappings) {
  assert(jsx.includes(`${code}: { flag: '${flag}'`), `Missing COUNTRY_VISUALS mapping ${code} -> ${flag}`);
  assert(jsx.includes(`'${flag}'`), `CSS_FLAGS does not mention ${flag}`);
  cssBlock(flag);
}

assert(jsx.includes('feature-flag-emblem--mexico'), 'Mexico flag must render a central crest/emblem overlay');
assert(jsx.includes('feature-flag-cross'), 'Switzerland flag must render compact cross overlay');
assert(jsx.includes('feature-flag-usa-canton'), 'USA flag must render a canton/star overlay');
assert(jsx.includes('feature-flag-star--senegal'), 'Senegal flag must render a star overlay');

const mexico = cssBlock('mexico');
assert(/linear-gradient\(90deg[\s\S]*#118a4b[\s\S]*#f4f4f1[\s\S]*#c51e2c/.test(mexico), 'Mexico must be green/white/red vertical tricolor');

const switzerland = cssBlock('switzerland');
assert(/#d52b1e/.test(switzerland), 'Switzerland must be solid red base');
assert(!/linear-gradient\(90deg/.test(switzerland) && !/linear-gradient\(180deg/.test(switzerland), 'Switzerland must not be an edge-to-edge Nordic cross background');

const poland = cssBlock('poland');
assert(/linear-gradient\(180deg[\s\S]*#f4f4f1[\s\S]*50%[\s\S]*#d61f34/.test(poland), 'Poland must be clean white-over-red horizontal bicolor');
assert(!/radial-gradient/.test(poland), 'Poland must not have a central red disc/ball');

const usa = cssBlock('usa');
assert(/repeating-linear-gradient\(180deg/.test(usa), 'USA must use horizontal red/white stripes');
assert(/width:\s*40%/.test(scss) && /height:\s*53\.85%/.test(scss), 'USA canton should be smaller than the card and match top seven stripes');
assert(/radial-gradient\(circle, #f4f4f1/.test(scss), 'USA canton must include visible white star dots');

const senegal = cssBlock('senegal');
assert(/linear-gradient\(90deg[\s\S]*#108343[\s\S]*#f5d23d[\s\S]*#c51e2c/.test(senegal), 'Senegal must be vertical green/yellow/red');
assert(/clip-path:\s*polygon\(50% 0%/.test(scss), 'Senegal star must be a five-point clip-path, not a circle');

const costaRica = cssBlock('costa-rica');
assert(/#002b7f/.test(costaRica) && /#d52b1e/.test(costaRica), 'Costa Rica full-card flag must include blue and red horizontal bands');

const ivoryCoast = cssBlock('ivory-coast');
assert(/linear-gradient\(90deg[\s\S]*#f77f00[\s\S]*#f4f4f1[\s\S]*#009e60/.test(ivoryCoast), 'Ivory Coast must be orange/white/green vertical tricolor');

const japan = cssBlock('japan');
assert(/radial-gradient/.test(japan), 'Japan should keep its sun disc');
assert(!/#d61f34\s+50%\s+100%/.test(japan), 'Japan must not use Poland bicolor background');

// ---------------------------------------------------------------------------
// Second wave: every newly-added nation must have a COUNTRY_VISUALS mapping, be
// listed in CSS_FLAGS, and own a hand-built &__feature-flag-css--<slug> block.
// ---------------------------------------------------------------------------
const secondWaveMappings = [
  ['HUN', 'hungary'], ['CMR', 'cameroon'], ['PAR', 'paraguay'], ['YUG', 'yugoslavia'],
  ['AUT', 'austria'], ['URS', 'ussr'], ['BUL', 'bulgaria'], ['ROU', 'romania'],
  ['AUS', 'australia'], ['TUN', 'tunisia'], ['KSA', 'saudi-arabia'], ['IRN', 'iran'],
  ['MAR', 'morocco'], ['PER', 'peru'], ['ECU', 'ecuador'], ['RUS', 'russia'],
  ['ALG', 'algeria'], ['SRB', 'serbia'], ['SCG', 'serbia-montenegro'], ['RSA', 'south-africa'],
  ['HON', 'honduras'], ['GRE', 'greece'], ['IRL', 'ireland'], ['NOR', 'norway'],
  ['EGY', 'egypt'], ['BOL', 'bolivia'], ['CAN', 'canada'], ['SVN', 'slovenia'],
  ['TUR', 'turkey'], ['PRK', 'north-korea'], ['NZL', 'new-zealand'], ['SLV', 'el-salvador'],
  ['QAT', 'qatar'], ['CHN', 'china'], ['TRI', 'trinidad-tobago'], ['ANG', 'angola'],
  ['TOG', 'togo'], ['UKR', 'ukraine'], ['SVK', 'slovakia'], ['BIH', 'bosnia'],
  ['ISL', 'iceland'], ['PAN', 'panama'], ['ISR', 'israel'], ['KUW', 'kuwait'],
  ['IRQ', 'iraq'], ['UAE', 'uae'], ['JAM', 'jamaica'], ['CUB', 'cuba'],
  ['HAI', 'haiti'], ['ZAI', 'zaire'], ['DEI', 'dutch-east-indies'], ['GDR', 'east-germany'],
];

for (const [code, flag] of secondWaveMappings) {
  assert(jsx.includes(`${code}: { flag: '${flag}'`), `Missing COUNTRY_VISUALS mapping ${code} -> ${flag}`);
  assert(jsx.includes(`'${flag}'`), `CSS_FLAGS does not mention ${flag}`);
  cssBlock(flag);
}

// FlagOverlay must own a case for every nation whose symbol is an overlay child.
const overlayCases = [
  'cameroon', 'yugoslavia', 'ussr', 'australia', 'new-zealand', 'tunisia', 'algeria',
  'turkey', 'morocco', 'saudi-arabia', 'iran', 'egypt', 'canada', 'china', 'honduras',
  'panama', 'israel', 'north-korea', 'el-salvador', 'angola', 'togo', 'bosnia', 'kuwait',
  'iraq', 'cuba', 'haiti', 'zaire', 'qatar', 'east-germany', 'south-africa', 'slovenia', 'slovakia',
];
for (const flag of overlayCases) {
  assert(jsx.includes(`case '${flag}':`), `FlagOverlay missing case for ${flag}`);
}

// Key historical/geometric details ------------------------------------------
// USSR must be a solid red field with a hoist hammer-and-sickle canton, never
// the modern Russia white-blue-red tricolour.
const ussr = cssBlock('ussr');
assert(/#c81e1e/.test(ussr), 'USSR must be a solid red field');
assert(!/linear-gradient\(180deg[^;]*#0039a6/.test(ussr), 'USSR must not reuse the Russia tricolour');
assert(jsx.includes('worldcup-draft__flag-ussr'), 'USSR must render the hammer & sickle canton overlay');

// Russia is the white-blue-red tricolour and must stay distinct from the USSR.
const russia = cssBlock('russia');
assert(/#f4f4f1 0 33\.33%[\s\S]*#0039a6[\s\S]*#d52b1e/.test(russia), 'Russia must be white-blue-red horizontal');

// Yugoslavia keeps the bordered red star; Serbia & Montenegro shares the field
// but has no star, so the two never look identical.
assert(/case 'yugoslavia':[\s\S]*?#f5d23d[\s\S]*?#c51e2c[\s\S]*?case 'ussr'/.test(jsx),
  'Yugoslavia must overlay a gold-bordered red star');

// Cameroon: vertical green/red/yellow with a central gold star.
const cameroon = cssBlock('cameroon');
assert(/linear-gradient\(90deg[\s\S]*#007a5e[\s\S]*#ce1126[\s\S]*#fcd116/.test(cameroon), 'Cameroon must be vertical green/red/yellow');

// Canada: vertical red-white-red with a maple-leaf overlay.
const canada = cssBlock('canada');
assert(/#d52b1e 0 25%[\s\S]*#f4f4f1 25% 75%[\s\S]*#d52b1e 75%/.test(canada), 'Canada must be red-white-red vertical (1:2:1)');
assert(jsx.includes('flag-emblem-c--canada'), 'Canada must render a maple-leaf crest overlay');

// Turkey: solid red field with a white crescent + star.
const turkey = cssBlock('turkey');
assert(/#e30a17/.test(turkey), 'Turkey must be a solid red field');

// Iran / Algeria / Saudi Arabia symbol checks.
const iran = cssBlock('iran');
assert(/#239f40[\s\S]*#f4f4f1[\s\S]*#da0000/.test(iran), 'Iran must be green/white/red horizontal');
const algeria = cssBlock('algeria');
assert(/#006233 0 50%[\s\S]*#f4f4f1 50%/.test(algeria), 'Algeria must be green/white vertical');
assert(/case 'algeria':[\s\S]*FlagCrescent/.test(jsx), 'Algeria must overlay a crescent');
const saudi = cssBlock('saudi-arabia');
assert(/#147b3c/.test(saudi), 'Saudi Arabia must be a solid green field');
assert(jsx.includes('flag-saudi-sword'), 'Saudi Arabia must render the sabre overlay');

// South Africa: recognizable green pall + black hoist triangle.
const southAfrica = cssBlock('south-africa');
assert(/#007a4d/.test(southAfrica), 'South Africa must include the green pall');
assert(/#de3831 0 50%[\s\S]*#002395 50%/.test(southAfrica), 'South Africa must have a red-over-blue base');
assert(jsx.includes('flag-sa-hoist'), 'South Africa must render the black hoist triangle');

// Australia / New Zealand: navy field + Union Jack canton.
const australia = cssBlock('australia');
assert(/#16306b/.test(australia), 'Australia must be a navy field');
assert(jsx.includes('UnionJackCanton'), 'Australia/NZ must render a Union Jack canton');
assert(jsx.includes('flag-unionjack'), 'Union Jack canton CSS must exist');

// Morocco: red field with a green pentagram.
const morocco = cssBlock('morocco');
assert(/#c1272d/.test(morocco), 'Morocco must be a solid red field');
assert(jsx.includes('flag-pentagram'), 'Morocco must render the green pentagram overlay');

console.log('WorldCup premium flag audit passed:',
  [...requiredMappings, ...secondWaveMappings].map(([, flag]) => flag).join(', '));
