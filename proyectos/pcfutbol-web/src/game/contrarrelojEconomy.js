import { generateSalary } from './salaryGenerator';
import { getBaseCommercialIncome, getLeagueTier } from './leagueTiers';

export const CONTRARRELOJ_WEEKS_PER_YEAR = 52;
export const CONTRARRELOJ_BALANCE_FLOOR = -5_000_000;
export const CONTRARRELOJ_BALANCE_CEIL = 5_000_000;

export const CONTRARRELOJ_STADIUM_LEVELS = [
  { name: 'Municipal', capacity: 8000, maintenance: 500000 },
  { name: 'Moderno', capacity: 18000, maintenance: 1200000 },
  { name: 'Grande', capacity: 35000, maintenance: 2500000 },
  { name: 'Elite', capacity: 55000, maintenance: 4000000 },
  { name: 'Legendario', capacity: 80000, maintenance: 6000000 }
];

const TIER_BUDGETS = {
  1: { pct: 0.12, min: 15_000_000, max: 500_000_000 },
  2: { pct: 0.10, min: 5_000_000, max: 120_000_000 },
  3: { pct: 0.07, min: 1_500_000, max: 30_000_000 },
  4: { pct: 0.05, min: 300_000, max: 5_000_000 },
  5: { pct: 0.03, min: 100_000, max: 1_500_000 }
};

const REPUTATION_BUDGET_MULTIPLIER = [0.5, 0.7, 1.0, 1.5, 2.5];
const MIN_WEEKLY_SALARY_BY_TIER = { 1: 1000, 2: 600, 3: 300, 4: 150, 5: 80 };

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function getPlayerMarketValue(player) {
  return Number(player?.value ?? player?.marketValue ?? player?.market_value ?? 0) || 0;
}

export function getSquadMarketValue(playersOrTeam) {
  const players = Array.isArray(playersOrTeam) ? playersOrTeam : (playersOrTeam?.players || []);
  return players.reduce((sum, player) => sum + getPlayerMarketValue(player), 0);
}

export function calculateContrarrelojReputation(team) {
  const players = team?.players || [];
  const avgOverall = players.length
    ? players.reduce((sum, player) => sum + (player.overall || 0), 0) / players.length
    : (team?.overall || 70);
  if (avgOverall >= 82) return 5;
  if (avgOverall >= 78) return 4;
  if (avgOverall >= 73) return 3;
  if (avgOverall >= 68) return 2;
  return 1;
}

export function normalizeContrarrelojBudgetAndReputation(team, leagueId) {
  const tier = getLeagueTier(leagueId);
  const budgetConfig = TIER_BUDGETS[tier] || TIER_BUDGETS[3];
  const currentReputation = Number(team?.reputation);
  const reputation = currentReputation >= 1 && currentReputation <= 5
    ? currentReputation
    : calculateContrarrelojReputation(team);
  const totalValue = getSquadMarketValue(team);
  const baseBudget = Math.max(totalValue * budgetConfig.pct, budgetConfig.min);
  const repMultiplier = REPUTATION_BUDGET_MULTIPLIER[reputation - 1] || 1.0;
  const calculatedBudget = Math.round(Math.min(baseBudget * repMultiplier, budgetConfig.max));
  const hasRealBudget = team?.budget && !team?._syntheticBudget;

  return {
    ...team,
    reputation,
    budget: hasRealBudget ? team.budget : calculatedBudget,
    _contrarrelojEconomy: {
      ...(team?._contrarrelojEconomy || {}),
      squadValue: totalValue,
      calculatedBudget
    }
  };
}

export function getContrarrelojTargetBalance({ reputation = 2, leagueId } = {}) {
  const tier = getLeagueTier(leagueId);
  const repTarget = { 1: -2_000_000, 2: -1_000_000, 3: 0, 4: 1_000_000, 5: 2_000_000 }[reputation] ?? -1_000_000;
  const tierTarget = { 1: 500_000, 2: 0, 3: -500_000, 4: -1_000_000, 5: -1_500_000 }[tier] ?? -500_000;
  return clamp(repTarget + tierTarget, -2_000_000, 2_000_000);
}

export function projectContrarrelojStartingBalance({
  team,
  leagueId,
  totalCalendarWeeks = 38,
  stadiumLevel = 0,
  sponsorLevel = 0,
  glorySponsorMult = 1
} = {}) {
  const players = team?.players || [];
  const level = clamp(Number(stadiumLevel) || 0, 0, CONTRARRELOJ_STADIUM_LEVELS.length - 1);
  const weeks = Math.max(1, Number(totalCalendarWeeks) || 38);
  const facilityBonus = [0, 8000, 53000, 158000, 316000, 527000][sponsorLevel] || 0;
  const sponsorWeekly = Math.round((getBaseCommercialIncome(leagueId) + facilityBonus) * glorySponsorMult);
  const sponsorAnnualIncome = sponsorWeekly * weeks;
  const weeklySalaries = players.reduce((sum, player) => sum + (Number(player.salary) || 0), 0);
  const annualSalaries = weeklySalaries * CONTRARRELOJ_WEEKS_PER_YEAR;
  const maintenanceCost = CONTRARRELOJ_STADIUM_LEVELS[level]?.maintenance || 500000;
  const totalIncome = sponsorAnnualIncome;
  const totalExpenses = annualSalaries + maintenanceCost;

  return {
    weeklySalaries,
    annualSalaries,
    maintenanceCost,
    sponsorWeekly,
    sponsorAnnualIncome,
    totalCalendarWeeks: weeks,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses
  };
}

export function normalizeContrarrelojSalaries(team, leagueId, options = {}) {
  const prepared = normalizeContrarrelojBudgetAndReputation(team, leagueId);
  const players = prepared.players || [];
  if (!players.length) {
    return { ...prepared, _contrarrelojEconomy: { ...(prepared._contrarrelojEconomy || {}), normalized: false } };
  }

  const projectionBase = projectContrarrelojStartingBalance({
    team: { ...prepared, players: [] },
    leagueId,
    totalCalendarWeeks: options.totalCalendarWeeks,
    stadiumLevel: options.stadiumLevel
  });
  const targetBalance = options.targetBalance ?? getContrarrelojTargetBalance({
    reputation: prepared.reputation,
    leagueId
  });
  const targetAnnualSalaries = Math.max(0, projectionBase.totalIncome - projectionBase.maintenanceCost - targetBalance);
  const targetWeeklySalaries = Math.max(0, Math.round(targetAnnualSalaries / CONTRARRELOJ_WEEKS_PER_YEAR));
  const tier = getLeagueTier(leagueId);
  const minWeekly = MIN_WEEKLY_SALARY_BY_TIER[tier] ?? MIN_WEEKLY_SALARY_BY_TIER[3];
  const baseRows = players.map((player) => {
    const generated = generateSalary(player, leagueId);
    const baseSalary = Number(player.salary) > 0 ? Number(player.salary) : generated;
    return {
      player,
      baseSalary: Math.max(minWeekly, Math.round(baseSalary))
    };
  });
  const minTotalWeekly = players.length * minWeekly;
  const extraTotal = baseRows.reduce((sum, row) => sum + Math.max(0, row.baseSalary - minWeekly), 0);
  const targetExtra = Math.max(0, targetWeeklySalaries - minTotalWeekly);
  const factor = extraTotal > 0 ? targetExtra / extraTotal : 0;

  const normalizedPlayers = baseRows.map(({ player, baseSalary }) => {
    const normalizedSalary = targetWeeklySalaries <= minTotalWeekly
      ? minWeekly
      : minWeekly + Math.round(Math.max(0, baseSalary - minWeekly) * factor);
    return {
      ...player,
      salary: Math.max(minWeekly, normalizedSalary),
      _contrarrelojBaseSalary: baseSalary
    };
  });

  const normalizedTeam = { ...prepared, players: normalizedPlayers };
  const projection = projectContrarrelojStartingBalance({
    team: normalizedTeam,
    leagueId,
    totalCalendarWeeks: options.totalCalendarWeeks,
    stadiumLevel: options.stadiumLevel
  });

  return {
    ...normalizedTeam,
    _contrarrelojEconomy: {
      ...(prepared._contrarrelojEconomy || {}),
      normalized: true,
      minWeeklySalary: minWeekly,
      targetBalance,
      targetWeeklySalaries,
      projection
    }
  };
}

export function prepareContrarrelojTeam(team, leagueId, options = {}) {
  return normalizeContrarrelojSalaries(team, leagueId, options);
}

export function shouldNormalizeContrarrelojSave(state, options = {}) {
  if (state?.gameMode !== 'contrarreloj' || !state?.team?.players?.length) return false;
  const projection = projectContrarrelojStartingBalance({
    team: state.team,
    leagueId: state.playerLeagueId || state.leagueId,
    totalCalendarWeeks: options.totalCalendarWeeks,
    stadiumLevel: state.facilities?.stadium ?? state.stadium?.level ?? 0
  });
  return projection.balance < (options.floor ?? CONTRARRELOJ_BALANCE_FLOOR);
}
