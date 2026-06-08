import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getSeasonResult } from '../src/game/seasonManager.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

const glorySetup = read('../src/components/GloryMode/GlorySetup.jsx');
const leagueTable = read('../src/components/LeagueTable/LeagueTable.jsx');
const seasonEnd = read('../src/components/SeasonEnd/SeasonEnd.jsx');
const multiLeagueEngine = read('../src/game/multiLeagueEngine.js');
const helper = read('../src/game/gloryHistoricalRules.js');

assert.match(helper, /activeUniverseHasSegundaRfef/, 'El helper debe detectar si existe Segunda RFEF en el universo activo');
assert.match(helper, /gloryStartsInHistoricalPrimeraRfef/, 'El helper debe detectar arranque historico en Primera RFEF sin Segunda RFEF');
assert.match(helper, /shouldSuppressGloryHistoricalRelegation/, 'El helper debe exponer la regla de supresion de descensos');

assert.match(glorySetup, /historicalNoSegundaRfef/, 'GlorySetup debe persistir historicalNoSegundaRfef');
assert.match(glorySetup, /noRelegationFrom/, 'GlorySetup debe persistir noRelegationFrom');
assert.match(glorySetup, /startDivision/, 'GlorySetup debe persistir startDivision');
assert.match(glorySetup, /no incluye Segunda RFEF/, 'GlorySetup debe mostrar aviso de temporada historica sin Segunda RFEF');
assert.match(glorySetup, /Primera Federaci[oó]n/, 'GlorySetup debe explicar el arranque en Primera Federacion');

const bottomPrimeraRfefTable = Array.from({ length: 20 }, (_, idx) => ({
  teamId: idx === 19 ? 'glory_team' : `team-${idx}`,
  teamName: idx === 19 ? 'FC Gloria' : `Team ${idx}`,
  points: 20 - idx,
  goalsFor: 0,
  goalsAgainst: 0,
  won: 0,
  drawn: 0,
  lost: 0
}));

assert.equal(
  getSeasonResult(bottomPrimeraRfefTable, 'glory_team', 'primeraRFEF').relegation,
  true,
  'Primera RFEF mantiene descensos normales cuando no se suprime'
);
assert.equal(
  getSeasonResult(bottomPrimeraRfefTable, 'glory_team', 'primeraRFEF', { suppressRelegation: true }).relegation,
  false,
  'getSeasonResult debe respetar suppressRelegation'
);

assert.match(leagueTable, /shouldSuppressGloryHistoricalRelegation/, 'LeagueTable debe usar la regla central');
assert.match(leagueTable, /relegationFromBottom:\s*0/, 'LeagueTable debe anular relegationFromBottom cuando no hay categoria inferior');
assert.match(leagueTable, /hasRelegationZones/, 'LeagueTable debe ocultar la leyenda si no hay zonas de descenso');
assert.match(leagueTable, /Sin descensos: la base hist[oó]rica no incluye Segunda Federaci[oó]n/, 'LeagueTable debe mostrar nota compacta de sin descensos');

assert.match(seasonEnd, /suppressRelegation/, 'SeasonEnd debe pasar suppressRelegation a getSeasonResult');
assert.match(seasonEnd, /administrativePermanence/, 'SeasonEnd debe calcular permanencia administrativa');
assert.match(seasonEnd, /Permanencia administrativa/, 'SeasonEnd debe mostrar texto neutral de permanencia administrativa');
assert.match(seasonEnd, /no hay descensos desde Primera Federaci[oó]n/, 'SeasonEnd debe explicar que no hay categoria inferior');

assert.match(multiLeagueEngine, /disablePrimeraRFEFToSegundaRFEFRelegation/, 'multiLeagueEngine debe aceptar bandera para desactivar descensos Primera RFEF -> Segunda RFEF');
assert.match(multiLeagueEngine, /rfefToSegundaRFEF/, 'multiLeagueEngine debe conservar el flujo normal cuando la bandera no esta activa');
assert.match(multiLeagueEngine, /newSegundaRFEFData\s*=\s*disablePrimeraRFEFToSegundaRFEFRelegation\s*\?\s*null/s, 'multiLeagueEngine no debe inventar Segunda RFEF cuando la bandera esta activa');

console.log('Glory historical RFEF floor audit passed.');
