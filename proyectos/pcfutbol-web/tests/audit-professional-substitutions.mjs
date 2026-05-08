import assert from 'node:assert/strict';

const { simulateMatch } = await import('../src/game/leagueEngine.js');

function player(name, position, overall, extra = {}) {
  return { name, position, playingPosition: position, overall, stamina: extra.stamina ?? 70, ...extra };
}

const starters = [
  player('TIT_GK', 'GK', 68),
  player('TIT_RB', 'RB', 66),
  player('TIT_CB1', 'CB', 67),
  player('TIT_CB2', 'CB', 67),
  player('TIT_LB', 'LB', 66),
  player('TIT_CDM', 'CDM', 65),
  player('TIT_CM1', 'CM', 66),
  player('TIT_CM2', 'CM', 66),
  player('TIT_RW', 'RW', 67),
  player('TIT_LW', 'LW', 67),
  player('TIT_ST', 'ST', 68),
];

const bench = [
  player('SUP_ST_90', 'ST', 90),
  player('SUP_CAM_88', 'CAM', 88),
  player('SUP_RW_86', 'RW', 86),
  player('SUP_CDM_84', 'CDM', 84),
  player('SUP_CB_83', 'CB', 83),
  player('SUP_LB_82', 'LB', 82),
  player('SUP_GK_80', 'GK', 80),
];

const homeTeam = {
  id: 'home-pro',
  name: 'Home Pro',
  reputation: 70,
  players: [...starters, ...bench]
};

const awayTeam = {
  id: 'away-pro',
  name: 'Away Pro',
  reputation: 74,
  players: starters.map(p => player(`AWAY_${p.position}_${p.name}`, p.position, 72))
};

const homeLineup = Object.fromEntries(starters.map((p, index) => [`slot${index}`, p]));
const playerBenchPlayers = bench;

const summary = {
  runs: 120,
  substitutionEvents: 0,
  invalidEventAfterExit: 0,
  invalidSubstitutionShapes: 0,
  entrantGoalOrAssistAfterEntry: 0,
  overLimitSubstitutionMatches: 0,
  tacticalReasons: new Set(),
};

for (let i = 0; i < summary.runs; i++) {
  const result = simulateMatch('home-pro', 'away-pro', homeTeam, awayTeam, {
    homeLineup,
    playerIsHome: true,
    playerBenchPlayers,
    homeMorale: 70,
    awayMorale: 70,
    homeTactic: 'balanced',
    awayTactic: 'balanced',
  }, {}, 'home-pro');

  const subs = (result.events || []).filter(e => e.type === 'substitution');
  summary.substitutionEvents += subs.length;
  if (subs.length > 5) summary.overLimitSubstitutionMatches++;

  for (const sub of subs) {
    const inName = sub.playerIn?.name || sub.playerIn;
    const outName = sub.playerOut?.name || sub.playerOut;
    if (!inName || !outName || !sub.tacticalIntent || !sub.reason) summary.invalidSubstitutionShapes++;
    summary.tacticalReasons.add(sub.tacticalIntent);

    for (const event of result.events || []) {
      if (event.team !== sub.team || (event.minute || 0) <= (sub.minute || 0)) continue;
      const actor = event.player?.name || event.player;
      const assist = event.assist?.name || event.assist;
      if (actor === outName || assist === outName) summary.invalidEventAfterExit++;
      if ((actor === inName || assist === inName) && ['goal', 'yellow_card', 'red_card', 'injury'].includes(event.type)) {
        summary.entrantGoalOrAssistAfterEntry++;
      }
    }
  }
}

summary.tacticalReasons = [...summary.tacticalReasons].sort();

assert.ok(summary.substitutionEvents > 0, 'El motor profesional debe generar eventos reales de sustitución');
assert.equal(summary.invalidSubstitutionShapes, 0, 'Cada sustitución debe incluir jugador que entra/sale, intención táctica y motivo');
assert.equal(summary.invalidEventAfterExit, 0, 'Un jugador sustituido no puede marcar, asistir, recibir tarjeta ni lesionarse después de salir');
assert.equal(summary.overLimitSubstitutionMatches, 0, 'No puede haber más de 5 cambios por equipo');
assert.ok(summary.tacticalReasons.length >= 2, 'La IA de cambios debe exponer varias intenciones tácticas según contexto');

console.log(JSON.stringify({ ok: true, summary }, null, 2));

