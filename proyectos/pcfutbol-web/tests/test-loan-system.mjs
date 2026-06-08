import assert from 'node:assert/strict';
import { simulateAILoans } from '../src/game/loanSystem.js';

const originalRandom = Math.random;
try {
  Math.random = () => 0;

  const samePlayer = { id: 'loan_p1', name: 'Canterano', position: 'CF', age: 21, overall: 70, salary: 100_000 };
  const teams = [
    { id: 'big_a', name: 'Madrid FC', leagueId: 'laliga', players: [samePlayer] },
    { id: 'small_a', name: 'Getafe Azul', leagueId: 'laliga', players: [] },
    { id: 'small_b', name: 'Rayo Capital', leagueId: 'laliga', players: [] },
  ];

  const events = simulateAILoans(teams, 'user_team', []);
  const keys = events.map(evt => `${evt.from.id}|${evt.player.id || evt.player.name}`);
  assert.equal(new Set(keys).size, keys.length, 'no debe generar varias cesiones para el mismo jugador en el mismo tick');

  const blocked = simulateAILoans(teams, 'user_team', [{ fromTeamId: 'big_a', playerId: 'loan_p1' }]);
  assert.equal(blocked.length, 0, 'no debe volver a ceder un jugador ya cedido');
} finally {
  Math.random = originalRandom;
}

console.log('✅ loanSystem AI loan duplicate guard OK');
