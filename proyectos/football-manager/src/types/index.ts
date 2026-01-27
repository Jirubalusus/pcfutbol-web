/**
 * Core Types for Football Manager
 */

// Player positions
export type Position = 'GK' | 'CB' | 'RB' | 'LB' | 'CDM' | 'CM' | 'CAM' | 'RM' | 'LM' | 'RW' | 'LW' | 'ST' | 'CF';

// Player attributes (0-100 scale)
export interface PlayerAttributes {
  // Technical
  passing: number;
  shooting: number;
  dribbling: number;
  tackling: number;
  heading: number;
  crossing: number;
  finishing: number;
  firstTouch: number;
  freeKick: number;
  penalty: number;
  
  // Physical
  pace: number;
  strength: number;
  stamina: number;
  agility: number;
  jumping: number;
  
  // Mental
  vision: number;
  composure: number;
  aggression: number;
  positioning: number;
  workRate: number;
  leadership: number;
  
  // Goalkeeping (only for GK)
  reflexes?: number;
  handling?: number;
  positioning_gk?: number;
  diving?: number;
  kicking?: number;
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  positionOriginal?: string;
  age: number;
  birthDate?: string;
  nationalities: string[];
  teamId: string;
  
  // Attributes
  attributes: PlayerAttributes;
  overall: number; // Calculated from attributes
  potential: number; // Max overall they can reach
  
  // Contract
  contractEnd: string; // ISO date
  salary: number; // Weekly salary
  releaseClause?: number;
  
  // Market
  marketValue: number;
  marketValueDisplay?: string;
  
  // Current state
  condition: number; // 0-100, fitness
  morale: number; // 0-100
  injured: boolean;
  injuryReturnDate?: string;
  suspended: boolean;
  suspendedMatches?: number;
  
  // Stats for current season
  seasonStats: PlayerSeasonStats;
  
  // History
  transferHistory: TransferRecord[];
}

export interface PlayerSeasonStats {
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  cleanSheets?: number; // GK only
  averageRating: number;
}

export interface Team {
  id: string;
  name: string;
  shortName?: string;
  league: string;
  group: string;
  
  // Squad
  playerIds: string[];
  lineup: string[]; // Starting 11 player IDs
  formation: string; // e.g., "4-3-3"
  
  // Finances
  budget: number;
  wagesBudget: number;
  currentWages: number;
  
  // Market value
  marketValue: number;
  marketValueDisplay?: string;
  
  // Season stats
  seasonStats: TeamSeasonStats;
  
  // AI settings (for non-player teams)
  aiPersonality: AIPersonality;
}

export interface TeamSeasonStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  position: number;
  form: ('W' | 'D' | 'L')[]; // Last 5 results
}

export interface AIPersonality {
  transferActivity: 'passive' | 'moderate' | 'aggressive';
  playStyle: 'defensive' | 'balanced' | 'attacking';
  youthFocus: number; // 0-100, preference for young players
  riskTolerance: number; // 0-100
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string; // ISO date
  league: string;
  group: string;
  matchday: number;
  
  // Result (filled after match)
  played: boolean;
  homeScore?: number;
  awayScore?: number;
  events?: MatchEvent[];
  stats?: MatchStats;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'assist' | 'yellow' | 'red' | 'substitution' | 'injury' | 'penalty_scored' | 'penalty_missed' | 'own_goal';
  playerId: string;
  teamId: string;
  relatedPlayerId?: string; // For assists, substitutions
}

export interface MatchStats {
  possession: [number, number]; // [home, away]
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
  offsides: [number, number];
  passes: [number, number];
  passAccuracy: [number, number];
}

export interface TransferRecord {
  date: string;
  fromTeamId: string | null; // null if free agent
  toTeamId: string;
  fee: number;
  type: 'transfer' | 'loan' | 'free' | 'release';
}

export interface TransferOffer {
  id: string;
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  counterAmount?: number;
  date: string;
}

export interface Season {
  number: number;
  startDate: string;
  endDate: string;
  leagues: {
    [leagueId: string]: {
      groups: {
        [groupId: string]: {
          teamIds: string[];
          fixtures: Match[];
        };
      };
    };
  };
}

export interface GameState {
  // Meta
  version: string;
  savedAt?: string;
  
  // Time
  currentDate: string; // ISO date
  season: number;
  
  // Player's team
  playerTeamId: string;
  playerName: string;
  
  // Data
  teams: { [id: string]: Team };
  players: { [id: string]: Player };
  leagues: LeagueData;
  
  // Active season
  currentSeason: Season;
  
  // Transfer market
  transferWindowOpen: boolean;
  pendingOffers: TransferOffer[];
  
  // History
  managerHistory: ManagerHistoryEntry[];
}

export interface LeagueData {
  [leagueId: string]: {
    name: string;
    groups: {
      [groupId: string]: {
        name: string;
        teamIds: string[];
      };
    };
  };
}

export interface ManagerHistoryEntry {
  season: number;
  teamId: string;
  leaguePosition: number;
  achievements: string[];
}
