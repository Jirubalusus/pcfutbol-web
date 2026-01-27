/**
 * Process scraped data into game-ready format
 */

import { Player, Team, GameState, PlayerAttributes, AIPersonality, TeamSeasonStats, PlayerSeasonStats } from '../types';
import { PlayerProgression } from '../core/PlayerProgression';

interface ScrapedData {
  leagues: {
    [leagueId: string]: {
      name: string;
      groups: {
        [groupId: string]: {
          name: string;
          teamIds: string[];
        };
      };
    };
  };
  teams: {
    [id: string]: {
      id: string;
      name: string;
      league: string;
      group: string;
      marketValue: number;
      marketValueDisplay: string;
      playerIds: string[];
    };
  };
  players: {
    [id: string]: {
      id: string;
      name: string;
      position: string;
      positionOriginal: string;
      age: number | null;
      birthDate: string;
      nationalities: string[];
      marketValue: string;
      marketValueNum: number;
      number: number | null;
      teamId: string;
    };
  };
}

export function processScrapedData(scraped: ScrapedData): Partial<GameState> {
  const progression = new PlayerProgression();
  
  const players: { [id: string]: Player } = {};
  const teams: { [id: string]: Team } = {};

  // Process players first
  for (const [id, rawPlayer] of Object.entries(scraped.players)) {
    const age = rawPlayer.age || 25;
    const position = rawPlayer.position || 'CM';
    
    // Estimate overall based on market value and age
    const overall = estimateOverall(rawPlayer.marketValueNum, age, position);
    
    // Generate attributes
    const attributes = progression.generateAttributes(position, overall, age);
    
    // Generate potential
    const potential = progression.generatePotential(age, overall);

    const player: Player = {
      id,
      name: rawPlayer.name,
      position: position as any,
      positionOriginal: rawPlayer.positionOriginal,
      age,
      birthDate: rawPlayer.birthDate,
      nationalities: rawPlayer.nationalities,
      teamId: rawPlayer.teamId,
      
      attributes,
      overall,
      potential,
      
      // Contract (random 1-4 years)
      contractEnd: generateContractEnd(),
      salary: estimateSalary(overall, rawPlayer.marketValueNum),
      
      marketValue: rawPlayer.marketValueNum || overall * 10000,
      marketValueDisplay: rawPlayer.marketValue,
      
      condition: 80 + Math.floor(Math.random() * 20),
      morale: 60 + Math.floor(Math.random() * 30),
      injured: false,
      suspended: false,
      
      seasonStats: createEmptySeasonStats(),
      transferHistory: [],
    };

    players[id] = player;
  }

  // Process teams
  for (const [id, rawTeam] of Object.entries(scraped.teams)) {
    // Calculate team market value from player values (since scraper didn't parse it correctly)
    let teamMarketValue = 0;
    for (const playerId of rawTeam.playerIds) {
      const player = players[playerId];
      if (player) {
        teamMarketValue += player.marketValue;
      }
    }
    
    // Fallback: if no players or very low value, estimate from raw data
    if (teamMarketValue < 100000) {
      teamMarketValue = 2000000 + Math.random() * 3000000; // 2-5 mill default
    }

    const team: Team = {
      id,
      name: rawTeam.name,
      shortName: rawTeam.name.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase(),
      league: rawTeam.league,
      group: rawTeam.group,
      
      playerIds: rawTeam.playerIds,
      lineup: [],
      formation: '4-4-2',
      
      // Finances based on calculated market value
      budget: Math.round(teamMarketValue * 0.3), // 30% of market value as starting budget
      wagesBudget: Math.round(teamMarketValue * 0.5),
      currentWages: calculateCurrentWages(rawTeam.playerIds, players),
      
      marketValue: teamMarketValue,
      marketValueDisplay: formatMarketValueDisplay(teamMarketValue),
      
      seasonStats: createEmptyTeamStats(),
      aiPersonality: generateAIPersonality(),
    };

    teams[id] = team;
  }

  return {
    teams,
    players,
    leagues: scraped.leagues,
  };
}

function estimateOverall(marketValue: number, age: number, position: string): number {
  // Base overall from market value
  // €100k = ~55 overall, €1M = ~70 overall, €10M = ~80 overall
  let overall: number;
  
  if (marketValue <= 0) {
    overall = 50 + Math.floor(Math.random() * 15);
  } else if (marketValue < 100000) {
    overall = 45 + Math.floor(marketValue / 10000) * 1.5;
  } else if (marketValue < 1000000) {
    overall = 55 + Math.floor((marketValue - 100000) / 100000) * 1.5;
  } else if (marketValue < 10000000) {
    overall = 70 + Math.floor((marketValue - 1000000) / 1000000) * 1.5;
  } else {
    overall = 85 + Math.floor((marketValue - 10000000) / 10000000);
  }

  // Adjust for age (young players have inflated values)
  if (age < 21) overall -= 3;
  else if (age < 24) overall -= 1;
  else if (age > 30) overall += 2;
  else if (age > 33) overall += 3;

  // Add some randomness
  overall += Math.floor(Math.random() * 6) - 3;

  // Clamp
  return Math.max(40, Math.min(95, Math.round(overall)));
}

function generateContractEnd(): string {
  const years = 1 + Math.floor(Math.random() * 4); // 1-4 years
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  date.setMonth(5, 30); // June 30
  return date.toISOString();
}

function estimateSalary(overall: number, marketValue: number): number {
  // Weekly salary roughly 0.5-1% of market value annually
  // So weekly = (marketValue * 0.007) / 52
  const baseSalary = marketValue * 0.007 / 52;
  return Math.max(500, Math.round(baseSalary / 100) * 100);
}

function calculateCurrentWages(playerIds: string[], players: { [id: string]: Player }): number {
  let total = 0;
  for (const id of playerIds) {
    const player = players[id];
    if (player) {
      total += player.salary * 52; // Annual
    }
  }
  return total;
}

function createEmptySeasonStats(): PlayerSeasonStats {
  return {
    appearances: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    minutesPlayed: 0,
    averageRating: 0,
  };
}

function createEmptyTeamStats(): TeamSeasonStats {
  return {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    position: 0,
    form: [],
  };
}

function generateAIPersonality(): AIPersonality {
  return {
    transferActivity: ['passive', 'moderate', 'aggressive'][Math.floor(Math.random() * 3)] as any,
    playStyle: ['defensive', 'balanced', 'attacking'][Math.floor(Math.random() * 3)] as any,
    youthFocus: 30 + Math.floor(Math.random() * 50),
    riskTolerance: 30 + Math.floor(Math.random() * 50),
  };
}

function formatMarketValueDisplay(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)} mil mill. €`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)} mill. €`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)} mil €`;
  }
  return `${value.toLocaleString('es-ES')} €`;
}

/**
 * Create initial game state from processed data
 */
export function createInitialGameState(
  processedData: Partial<GameState>,
  playerTeamId: string,
  playerName: string
): GameState {
  const currentDate = new Date();
  currentDate.setMonth(7, 1); // August 1 (season start)

  return {
    version: '1.0.0',
    currentDate: currentDate.toISOString(),
    season: 1,
    playerTeamId,
    playerName,
    teams: processedData.teams || {},
    players: processedData.players || {},
    leagues: processedData.leagues || {},
    currentSeason: {
      number: 1,
      startDate: currentDate.toISOString(),
      endDate: new Date(currentDate.getFullYear() + 1, 5, 30).toISOString(),
      leagues: {},
    },
    transferWindowOpen: true, // Summer window
    pendingOffers: [],
    managerHistory: [],
  };
}
