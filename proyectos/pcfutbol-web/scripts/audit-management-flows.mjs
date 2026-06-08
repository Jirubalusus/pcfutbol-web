import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

globalThis.fetch = async () => ({ ok: true, text: async () => '[]', json: async () => [] });
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

const server = await createServer({
  root: repoRoot,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error'
});

const summary = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function scenario(name, fn) {
  const started = Date.now();
  try {
    await fn();
    summary.push({ name, status: 'PASS', ms: Date.now() - started });
    console.log(`PASS ${name}`);
  } catch (error) {
    summary.push({ name, status: 'FAIL', ms: Date.now() - started, error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

function player(name, position, overall, extras = {}) {
  return {
    name,
    position,
    overall,
    age: extras.age ?? 24,
    salary: extras.salary ?? 20000,
    value: extras.value ?? overall * overall * 10000,
    contractYears: extras.contractYears ?? 3,
    ...extras
  };
}

function makeSquad(prefix, count = 16) {
  const positions = ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'CAM', 'RW', 'ST', 'LW', 'CB', 'CM', 'ST', 'GK'];
  return positions.slice(0, count).map((pos, index) => player(`${prefix} ${index + 1}`, pos, 68 + (index % 8), {
    age: 20 + (index % 12),
    salary: 10000 + index * 1000
  }));
}

const { gameReducer, initialState } = await server.ssrLoadModule('/src/context/GameContext.jsx');
const { calculateSeasonOutcome } = await server.ssrLoadModule('/src/game/seasonEngine.js');
const { generateLoanCandidates, generateLoanOffers, canLoanPlayer } = await server.ssrLoadModule('/src/game/loanSystem.js');

const baseMySquad = makeSquad('My');
const buyTarget = player('Buy Target', 'ST', 78, { teamId: 'seller', value: 12000000 });
const loanTarget = player('Loan Target', 'CM', 72, { teamId: 'owner', age: 21, value: 5000000 });
const outboundTarget = baseMySquad[12];

function baseState() {
  return {
    ...initialState,
    gameStarted: true,
    currentWeek: 2,
    currentSeason: 1,
    teamId: 'my',
    leagueId: 'laliga',
    playerLeagueId: 'laliga',
    leagueTier: 1,
    money: 100000000,
    team: {
      id: 'my',
      name: 'QA FC',
      reputation: 72,
      players: baseMySquad.map(p => ({ ...p }))
    },
    lineup: Object.fromEntries(baseMySquad.slice(0, 11).map((p, i) => [`slot${i}`, p])),
    convocados: baseMySquad.slice(0, 11).map(p => p.name),
    leagueTable: [{ teamId: 'my', points: 50, goalsFor: 60, goalsAgainst: 42, won: 15, drawn: 5, lost: 8 }],
    fixtures: [{ id: 'm1', week: 1, homeTeam: 'my', awayTeam: 'seller', played: true }],
    facilities: { stadium: 0, sponsorship: 0, youth: 0, medical: 0, scouting: 0 },
    stadium: { level: 0, realCapacity: 8000, accumulatedTicketIncome: 0, seasonTicketIncomeCollected: 0 },
    messages: [],
    transferOffers: [],
    activeLoans: [],
    loanHistory: [],
    incomingLoanOffers: [],
    leagueTeams: [
      { id: 'seller', name: 'Seller CF', leagueId: 'laliga', budget: 40000000, players: [buyTarget, ...makeSquad('Seller', 14)] },
      { id: 'buyer', name: 'Buyer CF', leagueId: 'laliga', budget: 40000000, players: makeSquad('Buyer', 15) },
      { id: 'owner', name: 'Real Madrid', leagueId: 'laliga', budget: 40000000, players: [loanTarget, ...makeSquad('Owner', 15)] },
      { id: 'receiver', name: 'Receiver CF', leagueId: 'segunda', budget: 10000000, players: makeSquad('Receiver', 15) }
    ]
  };
}

await scenario('transfer buy and sell update squads, money and AI rosters', () => {
  let state = baseState();

  state = gameReducer(state, {
    type: 'SIGN_PLAYER',
    payload: { player: buyTarget, fee: 10000000, fromTeamId: 'seller' }
  });
  assert(state.team.players.some(p => p.name === buyTarget.name), 'signed player missing from squad');
  assert(!state.leagueTeams.find(t => t.id === 'seller').players.some(p => p.name === buyTarget.name), 'seller still owns signed player');
  assert(state.money === 90000000, 'signing fee not deducted');

  state = gameReducer(state, {
    type: 'SELL_PLAYER',
    payload: { playerName: 'My 16', fee: 3000000, buyerTeamId: 'buyer' }
  });
  assert(!state.team.players.some(p => p.name === 'My 16'), 'sold player still in squad');
  assert(state.leagueTeams.find(t => t.id === 'buyer').players.some(p => p.name === 'My 16'), 'buyer did not receive sold player');
  assert(state.money === 93000000, 'sale fee not added');
});

await scenario('loan out expires cleanly and restores player to parent squad', () => {
  let state = baseState();
  state = gameReducer(state, {
    type: 'LOAN_OUT_PLAYER',
    payload: {
      player: outboundTarget,
      toTeamId: 'receiver',
      toTeamName: 'Receiver CF',
      loanFee: 500000,
      salaryShare: 0.5,
      purchaseOption: 3000000
    }
  });

  assert(!state.team.players.some(p => p.name === outboundTarget.name), 'loaned-out player stayed in user squad');
  assert(state.leagueTeams.find(t => t.id === 'receiver').players.some(p => p.name === outboundTarget.name && p.onLoan), 'receiver missing loaned player');

  state = gameReducer(state, { type: 'EXPIRE_LOANS' });
  assert(state.team.players.some(p => p.name === outboundTarget.name && !p.onLoan), 'loaned-out player did not return');
  assert(!state.leagueTeams.find(t => t.id === 'receiver').players.some(p => p.name === outboundTarget.name), 'receiver kept expired loan player');
  assert(state.activeLoans.length === 0, 'expired loan remained active');
});

await scenario('loan in can be purchased and is removed from active loans', () => {
  let state = baseState();
  state = gameReducer(state, {
    type: 'LOAN_IN_PLAYER',
    payload: {
      player: loanTarget,
      fromTeamId: 'owner',
      fromTeamName: 'Owner CF',
      loanFee: 400000,
      salaryShare: 0.5,
      purchaseOption: 2500000
    }
  });

  const loan = state.activeLoans[0];
  assert(loan, 'incoming loan was not created');
  assert(state.team.players.some(p => p.name === loanTarget.name && p.onLoan), 'loaned-in player missing or not marked on loan');
  assert(!state.leagueTeams.find(t => t.id === 'owner').players.some(p => p.name === loanTarget.name), 'owner still lists loaned-in player');

  state = gameReducer(state, { type: 'EXERCISE_LOAN_PURCHASE', payload: { loanId: loan.id } });
  const signed = state.team.players.find(p => p.name === loanTarget.name);
  assert(signed && !signed.onLoan && signed.contractYears === 4, 'purchase did not convert loan to permanent player');
  assert(state.activeLoans.length === 0, 'purchased loan remained active');
  assert(state.loanHistory.some(l => l.id === loan.id && l.status === 'purchased'), 'purchase missing from loan history');
});

await scenario('loan in expiry returns player to owning club', () => {
  let state = baseState();
  state = gameReducer(state, {
    type: 'LOAN_IN_PLAYER',
    payload: {
      player: loanTarget,
      fromTeamId: 'owner',
      fromTeamName: 'Owner CF',
      loanFee: 400000,
      salaryShare: 0.5,
      purchaseOption: null
    }
  });

  state = gameReducer(state, { type: 'EXPIRE_LOANS' });
  assert(!state.team.players.some(p => p.name === loanTarget.name), 'expired incoming loan stayed in user squad');
  assert(state.leagueTeams.find(t => t.id === 'owner').players.some(p => p.name === loanTarget.name && !p.onLoan), 'owning club did not get expired loan player back');
  assert(state.activeLoans.length === 0, 'expired incoming loan remained active');
});

await scenario('loan helpers expose candidates, offers and squad-size guardrails', () => {
  const state = baseState();
  const candidates = generateLoanCandidates(state.leagueTeams, state.team, state.teamId);
  assert(candidates.some(p => p.name === loanTarget.name), 'loan candidate pool did not include useful owned player');

  const offers = generateLoanOffers(state.team, state.leagueTeams, state.teamId);
  assert(Array.isArray(offers), 'loan offers did not return an array');

  const smallState = { ...state, team: { ...state.team, players: state.team.players.slice(0, 14) } };
  const check = canLoanPlayer(smallState.team.players[0], smallState, 'out');
  assert(!check.canLoan, 'loan-out guard allowed squad to drop below minimum size');
});

await scenario('facility upgrade, medical treatment and stadium construction season rollover', () => {
  let state = baseState();
  state.team.players[0] = { ...state.team.players[0], injured: true, injuryWeeksLeft: 4 };
  state = { ...state, facilities: { ...state.facilities, medical: 1, youth: 0 }, money: 20000000 };

  state = gameReducer(state, { type: 'UPGRADE_FACILITY', payload: { facilityId: 'youth', cost: 8000000 } });
  assert(state.facilities.youth === 1, 'youth facility did not upgrade');
  assert(state.money === 12000000, 'facility cost not deducted');

  state = gameReducer(state, { type: 'APPLY_MEDICAL_TREATMENT', payload: { playerName: state.team.players[0].name, healingWeeks: 1, cost: 500000 } });
  assert(state.team.players[0].injuryWeeksLeft === 3, 'medical treatment did not reduce injury');
  assert(state.medicalSlots.includes(state.team.players[0].name), 'medical slot not occupied for still-injured player');

  state = {
    ...state,
    stadium: {
      ...state.stadium,
      construction: { targetLevel: 1, targetCapacity: 18000, startedSeason: state.currentSeason }
    }
  };
  state = gameReducer(state, {
    type: 'START_NEW_SEASON',
    payload: {
      seasonResult: { position: 10, points: 45, goalDifference: 0, qualification: null },
      objectiveRewards: { netResult: 0 },
      europeanBonus: 0,
      preseasonMatches: [],
      moneyChange: 0,
      newFixtures: [],
      newTable: [],
      newObjectives: [],
      newPlayerLeagueId: 'laliga',
      newOtherLeagues: {}
    }
  });
  assert(state.facilities.stadium === 1, 'stadium facility level did not complete construction');
  assert(state.stadium.level === 1 && state.stadium.realCapacity === 18000 && !state.stadium.construction, 'stadium construction did not roll over cleanly');
});

await scenario('season outcome covers spanish pyramid promotion, relegation and survival', () => {
  assert(calculateSeasonOutcome(1, 'segundaRFEF', 18).newLeagueId === 'primeraRFEF', 'Segunda RFEF champion should promote');
  assert(calculateSeasonOutcome(21, 'segunda', 22).newLeagueId === 'primeraRFEF', 'Segunda relegation should drop to Primera RFEF');
  assert(calculateSeasonOutcome(18, 'laliga', 20).newLeagueId === 'segunda', 'LaLiga relegation should drop to Segunda');
  assert(calculateSeasonOutcome(10, 'laliga', 20).newLeagueId === 'laliga', 'LaLiga mid-table should stay in league');
});

await server.close();

const failed = summary.filter(s => s.status === 'FAIL');
console.log('\nManagement flow audit summary');
console.table(summary);

if (failed.length > 0) {
  process.exitCode = 1;
}
