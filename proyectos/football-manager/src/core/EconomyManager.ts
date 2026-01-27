/**
 * EconomyManager - Handles all financial aspects
 */

import { GameState, Team, Match } from '../types';

export class EconomyManager {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  /**
   * Process income from a match
   */
  processMatchIncome(match: Match): void {
    if (!match.played) return;

    const homeTeam = this.state.teams[match.homeTeamId];
    if (!homeTeam) return;

    // Gate receipts (home team only)
    const baseAttendance = this.getBaseAttendance(homeTeam);
    const attendanceMultiplier = this.getAttendanceMultiplier(match);
    const attendance = Math.floor(baseAttendance * attendanceMultiplier);
    const ticketPrice = this.getAverageTicketPrice(homeTeam);
    
    const gateReceipts = attendance * ticketPrice;
    homeTeam.budget += gateReceipts;

    // TV money (split between teams) - for league matches
    const tvMoney = this.getMatchTVMoney(match);
    homeTeam.budget += tvMoney / 2;
    
    const awayTeam = this.state.teams[match.awayTeamId];
    if (awayTeam) {
      awayTeam.budget += tvMoney / 2;
    }

    // Win bonus
    if (match.homeScore! > match.awayScore!) {
      homeTeam.budget += this.getWinBonus(homeTeam);
    } else if (match.awayScore! > match.homeScore!) {
      if (awayTeam) awayTeam.budget += this.getWinBonus(awayTeam);
    }
  }

  /**
   * Process weekly expenses
   */
  processWeeklyExpenses(): void {
    for (const team of Object.values(this.state.teams)) {
      // Wages
      const weeklyWages = team.currentWages / 52;
      team.budget -= weeklyWages;

      // Stadium/facilities maintenance
      const maintenance = this.getMaintenanceCost(team);
      team.budget -= maintenance;

      // Check for financial trouble
      if (team.budget < 0) {
        this.handleFinancialTrouble(team);
      }
    }
  }

  /**
   * Process new season budgets
   */
  processNewSeasonBudgets(): void {
    for (const team of Object.values(this.state.teams)) {
      // Base budget by league
      const baseBudget = this.getLeagueBaseBudget(team.league);
      
      // Position bonus
      const positionBonus = this.getPositionBonus(team);
      
      // Sponsor income
      const sponsorIncome = this.getSponsorIncome(team);
      
      team.budget += baseBudget + positionBonus + sponsorIncome;
      
      // Set wage budget (typically 60% of total budget)
      team.wagesBudget = team.budget * 0.6;
    }
  }

  /**
   * Calculate team's current financial health
   */
  getFinancialHealth(teamId: string): 'excellent' | 'good' | 'stable' | 'poor' | 'critical' {
    const team = this.state.teams[teamId];
    if (!team) return 'stable';

    const wageRatio = team.currentWages / team.wagesBudget;
    const budgetHealth = team.budget > 0 ? team.budget / team.wagesBudget : -1;

    if (wageRatio > 1.2 || budgetHealth < 0) return 'critical';
    if (wageRatio > 1.0 || budgetHealth < 0.2) return 'poor';
    if (wageRatio > 0.8 || budgetHealth < 0.5) return 'stable';
    if (wageRatio > 0.6) return 'good';
    return 'excellent';
  }

  /**
   * Get projected end of season balance
   */
  getProjectedBalance(teamId: string): number {
    const team = this.state.teams[teamId];
    if (!team) return 0;

    // Estimate remaining income
    const remainingMatches = 20; // Simplified
    const avgMatchIncome = 50000; // Simplified
    const projectedIncome = remainingMatches * avgMatchIncome;

    // Estimate remaining expenses
    const weeksLeft = 30;
    const weeklyExpenses = (team.currentWages / 52) + this.getMaintenanceCost(team);
    const projectedExpenses = weeksLeft * weeklyExpenses;

    return team.budget + projectedIncome - projectedExpenses;
  }

  private getBaseAttendance(team: Team): number {
    // Base attendance by league tier
    const leagueAttendance: { [league: string]: number } = {
      primeraFederacion: 3000,
      segundaFederacion: 1500,
    };
    return leagueAttendance[team.league] || 2000;
  }

  private getAttendanceMultiplier(match: Match): number {
    // Factors that affect attendance
    let multiplier = 1.0;

    // Derby or big opponent bonus
    // Would check rivalry/opponent strength here
    
    // Time of season (end of season = higher attendance)
    const currentDate = new Date(this.state.currentDate);
    const month = currentDate.getMonth();
    if (month >= 3 && month <= 5) multiplier *= 1.2; // Spring

    // Weather (simplified - random factor)
    multiplier *= 0.8 + Math.random() * 0.4;

    return multiplier;
  }

  private getAverageTicketPrice(team: Team): number {
    const basePrices: { [league: string]: number } = {
      primeraFederacion: 15,
      segundaFederacion: 10,
    };
    return basePrices[team.league] || 12;
  }

  private getMatchTVMoney(match: Match): number {
    // TV money per match by league
    const tvMoney: { [league: string]: number } = {
      primeraFederacion: 20000,
      segundaFederacion: 5000,
    };
    
    const homeTeam = this.state.teams[match.homeTeamId];
    return tvMoney[homeTeam?.league || ''] || 10000;
  }

  private getWinBonus(team: Team): number {
    const bonuses: { [league: string]: number } = {
      primeraFederacion: 10000,
      segundaFederacion: 5000,
    };
    return bonuses[team.league] || 7500;
  }

  private getMaintenanceCost(team: Team): number {
    const costs: { [league: string]: number } = {
      primeraFederacion: 10000,
      segundaFederacion: 5000,
    };
    return (costs[team.league] || 7500) / 4; // Weekly
  }

  private handleFinancialTrouble(team: Team): void {
    // AI teams in trouble will try to sell players
    if (team.id !== this.state.playerTeamId) {
      // Mark team as needing to sell
      team.aiPersonality.transferActivity = 'aggressive';
      
      // Could also reduce wages by releasing players
      console.log(`Financial trouble: ${team.name}`);
    }
    // Player team: just notify (handled in UI)
  }

  private getLeagueBaseBudget(league: string): number {
    const budgets: { [league: string]: number } = {
      primeraFederacion: 2000000,
      segundaFederacion: 800000,
    };
    return budgets[league] || 1000000;
  }

  private getPositionBonus(team: Team): number {
    const position = team.seasonStats.position;
    if (position <= 3) return 500000;
    if (position <= 6) return 300000;
    if (position <= 10) return 150000;
    return 0;
  }

  private getSponsorIncome(team: Team): number {
    // Based on team's market value and performance
    const baseSponsorship = team.marketValue * 0.05; // 5% of market value
    const performanceBonus = (20 - team.seasonStats.position) * 10000;
    return baseSponsorship + performanceBonus;
  }
}
