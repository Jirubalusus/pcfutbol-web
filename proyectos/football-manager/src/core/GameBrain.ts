/**
 * GameBrain - Central AI Director for Football Manager
 * 
 * Orchestrates all game systems:
 * - Match simulation
 * - Transfer market
 * - Player progression
 * - AI team decisions
 * - Economy
 * - League management
 */

import { MatchEngine } from './MatchEngine';
import { TransferMarket } from './TransferMarket';
import { PlayerProgression } from './PlayerProgression';
import { AIManager } from './AIManager';
import { EconomyManager } from './EconomyManager';
import { LeagueManager } from './LeagueManager';
import { GameState, Team, Player, Match, Season } from '../types';

export class GameBrain {
  private state: GameState;
  private matchEngine: MatchEngine;
  private transferMarket: TransferMarket;
  private playerProgression: PlayerProgression;
  private aiManager: AIManager;
  private economyManager: EconomyManager;
  private leagueManager: LeagueManager;

  constructor(initialState: GameState) {
    this.state = initialState;
    
    // Initialize all subsystems
    this.matchEngine = new MatchEngine();
    this.transferMarket = new TransferMarket(this.state);
    this.playerProgression = new PlayerProgression();
    this.aiManager = new AIManager(this.state);
    this.economyManager = new EconomyManager(this.state);
    this.leagueManager = new LeagueManager(this.state);
  }

  /**
   * Advance the game by one day
   */
  advanceDay(): void {
    const currentDate = new Date(this.state.currentDate);
    
    // Process scheduled matches
    const todayMatches = this.leagueManager.getMatchesForDate(currentDate);
    for (const match of todayMatches) {
      const result = this.matchEngine.simulateMatch(match, this.state);
      this.leagueManager.recordResult(result);
      this.economyManager.processMatchIncome(result);
    }

    // Process transfer market
    this.transferMarket.processDailyActivity();

    // AI teams make decisions
    this.aiManager.processDaily();

    // Update player conditions
    this.playerProgression.processDailyTraining(this.state.teams);

    // Advance date
    currentDate.setDate(currentDate.getDate() + 1);
    this.state.currentDate = currentDate.toISOString();

    // Check for season events
    this.checkSeasonEvents(currentDate);
  }

  /**
   * Advance to next match (skip days without player interaction)
   */
  advanceToNextMatch(): void {
    const nextMatch = this.leagueManager.getNextMatchForTeam(this.state.playerTeamId);
    if (!nextMatch) return;

    const targetDate = new Date(nextMatch.date);
    const currentDate = new Date(this.state.currentDate);

    while (currentDate < targetDate) {
      this.advanceDay();
    }
  }

  /**
   * Process player transfer offer
   */
  makeTransferOffer(playerId: string, targetTeamId: string, amount: number): boolean {
    return this.transferMarket.makeOffer(playerId, targetTeamId, amount);
  }

  /**
   * Set team lineup for next match
   */
  setLineup(teamId: string, lineup: string[], formation: string): void {
    const team = this.state.teams[teamId];
    if (team) {
      team.lineup = lineup;
      team.formation = formation;
    }
  }

  /**
   * Get AI suggested lineup
   */
  getSuggestedLineup(teamId: string): { lineup: string[]; formation: string } {
    return this.aiManager.suggestLineup(teamId);
  }

  /**
   * Check for end of season, transfer windows, etc.
   */
  private checkSeasonEvents(date: Date): void {
    const month = date.getMonth();
    const day = date.getDate();

    // Transfer window periods (simplified)
    // Summer: July 1 - August 31
    // Winter: January 1 - January 31
    const isSummerWindow = month >= 6 && month <= 7;
    const isWinterWindow = month === 0;
    this.state.transferWindowOpen = isSummerWindow || isWinterWindow;

    // End of season (June 30)
    if (month === 5 && day === 30) {
      this.endSeason();
    }

    // Start of season (August 1)
    if (month === 7 && day === 1) {
      this.startNewSeason();
    }
  }

  private endSeason(): void {
    // Process relegation/promotion
    this.leagueManager.processSeasonEnd();
    
    // Player progression (yearly updates)
    this.playerProgression.processSeasonEnd(this.state.players);
    
    // Contract expirations
    this.transferMarket.processContractExpirations();
    
    // AI teams plan for next season
    this.aiManager.processSeasonEnd();
  }

  private startNewSeason(): void {
    this.state.season += 1;
    this.leagueManager.generateFixtures();
    this.economyManager.processNewSeasonBudgets();
  }

  // Getters for UI
  getState(): GameState {
    return this.state;
  }

  getTeam(teamId: string): Team | undefined {
    return this.state.teams[teamId];
  }

  getPlayer(playerId: string): Player | undefined {
    return this.state.players[playerId];
  }

  getLeagueTable(leagueId: string, groupId: string): Team[] {
    return this.leagueManager.getTable(leagueId, groupId);
  }

  getUpcomingMatches(teamId: string, count: number = 5): Match[] {
    return this.leagueManager.getUpcomingMatches(teamId, count);
  }

  getRecentResults(teamId: string, count: number = 5): Match[] {
    return this.leagueManager.getRecentResults(teamId, count);
  }

  generateFixtures(): void {
    this.leagueManager.generateFixtures();
  }

  /**
   * Simulate a single match immediately (for testing)
   */
  simulateMatch(match: Match): Match {
    const result = this.matchEngine.simulateMatch(match, this.state);
    this.leagueManager.recordResult(result);
    return result;
  }
}
