/**
 * TransferMarket - Handles all transfer activities
 */

import { GameState, Player, Team, TransferOffer, TransferRecord } from '../types';

export class TransferMarket {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  /**
   * Make a transfer offer for a player
   */
  makeOffer(playerId: string, fromTeamId: string, amount: number): boolean {
    const player = this.state.players[playerId];
    if (!player) return false;

    // Check if transfer window is open
    if (!this.state.transferWindowOpen) return false;

    // Check if buyer can afford it
    const buyingTeam = this.state.teams[fromTeamId];
    if (!buyingTeam || buyingTeam.budget < amount) return false;

    const offer: TransferOffer = {
      id: `offer_${Date.now()}`,
      playerId,
      fromTeamId: player.teamId,
      toTeamId: fromTeamId,
      amount,
      status: 'pending',
      date: this.state.currentDate,
    };

    this.state.pendingOffers.push(offer);
    return true;
  }

  /**
   * Process an offer response (accept/reject/counter)
   */
  respondToOffer(offerId: string, response: 'accept' | 'reject' | 'counter', counterAmount?: number): boolean {
    const offer = this.state.pendingOffers.find(o => o.id === offerId);
    if (!offer || offer.status !== 'pending') return false;

    if (response === 'accept') {
      return this.executeTransfer(offer);
    } else if (response === 'reject') {
      offer.status = 'rejected';
      return true;
    } else if (response === 'counter' && counterAmount) {
      offer.status = 'countered';
      offer.counterAmount = counterAmount;
      return true;
    }

    return false;
  }

  /**
   * Execute a transfer
   */
  private executeTransfer(offer: TransferOffer): boolean {
    const player = this.state.players[offer.playerId];
    const sellingTeam = this.state.teams[offer.fromTeamId];
    const buyingTeam = this.state.teams[offer.toTeamId];

    if (!player || !sellingTeam || !buyingTeam) return false;

    // Transfer money
    buyingTeam.budget -= offer.amount;
    sellingTeam.budget += offer.amount;

    // Move player
    sellingTeam.playerIds = sellingTeam.playerIds.filter(id => id !== player.id);
    buyingTeam.playerIds.push(player.id);

    // Update player
    const transferRecord: TransferRecord = {
      date: this.state.currentDate,
      fromTeamId: offer.fromTeamId,
      toTeamId: offer.toTeamId,
      fee: offer.amount,
      type: 'transfer',
    };
    player.transferHistory.push(transferRecord);
    player.teamId = offer.toTeamId;

    // Update offer status
    offer.status = 'accepted';

    return true;
  }

  /**
   * Calculate a player's market value based on attributes
   */
  calculateMarketValue(player: Player): number {
    const baseValue = player.overall * 10000; // 100 overall = 1M base

    // Age modifier
    let ageMod = 1;
    if (player.age < 21) ageMod = 1.5; // Young premium
    else if (player.age < 25) ageMod = 1.3;
    else if (player.age < 29) ageMod = 1.0;
    else if (player.age < 32) ageMod = 0.7;
    else ageMod = 0.4; // 32+

    // Potential modifier
    const potentialMod = 1 + (player.potential - player.overall) / 100;

    // Contract modifier (less time = lower value)
    const contractEnd = new Date(player.contractEnd);
    const now = new Date(this.state.currentDate);
    const yearsLeft = (contractEnd.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const contractMod = Math.min(1, Math.max(0.3, yearsLeft / 3));

    return Math.round(baseValue * ageMod * potentialMod * contractMod);
  }

  /**
   * Process daily transfer market activity (AI offers, etc.)
   */
  processDailyActivity(): void {
    // Process pending offers
    for (const offer of this.state.pendingOffers) {
      if (offer.status !== 'pending') continue;
      
      // If selling team is AI, decide on offer
      if (offer.fromTeamId !== this.state.playerTeamId) {
        this.aiDecideOnOffer(offer);
      }
    }

    // Clean up old offers
    this.state.pendingOffers = this.state.pendingOffers.filter(o => {
      if (o.status === 'pending') return true;
      const offerDate = new Date(o.date);
      const now = new Date(this.state.currentDate);
      const daysDiff = (now.getTime() - offerDate.getTime()) / (24 * 60 * 60 * 1000);
      return daysDiff < 7; // Keep for 7 days
    });
  }

  private aiDecideOnOffer(offer: TransferOffer): void {
    const player = this.state.players[offer.playerId];
    if (!player) return;

    const marketValue = this.calculateMarketValue(player);
    const offerRatio = offer.amount / marketValue;

    // AI accepts if offer is >= 90% of market value
    if (offerRatio >= 0.9) {
      this.respondToOffer(offer.id, 'accept');
    } else if (offerRatio >= 0.7) {
      // Counter with market value
      this.respondToOffer(offer.id, 'counter', Math.round(marketValue * 1.1));
    } else {
      this.respondToOffer(offer.id, 'reject');
    }
  }

  /**
   * Process contract expirations at end of season
   */
  processContractExpirations(): void {
    const endOfSeason = new Date(this.state.currentDate);
    endOfSeason.setMonth(5, 30); // June 30

    for (const player of Object.values(this.state.players)) {
      const contractEnd = new Date(player.contractEnd);
      if (contractEnd <= endOfSeason) {
        // Player becomes free agent
        const team = this.state.teams[player.teamId];
        if (team) {
          team.playerIds = team.playerIds.filter(id => id !== player.id);
        }
        player.teamId = '';
        player.transferHistory.push({
          date: this.state.currentDate,
          fromTeamId: team?.id || null,
          toTeamId: '',
          fee: 0,
          type: 'release',
        });
      }
    }
  }

  /**
   * Get all available free agents
   */
  getFreeAgents(): Player[] {
    return Object.values(this.state.players).filter(p => !p.teamId);
  }

  /**
   * Sign a free agent
   */
  signFreeAgent(playerId: string, teamId: string, contractYears: number, weeklySalary: number): boolean {
    const player = this.state.players[playerId];
    const team = this.state.teams[teamId];

    if (!player || !team || player.teamId) return false;

    // Check wage budget
    const annualCost = weeklySalary * 52;
    if (team.currentWages + annualCost > team.wagesBudget) return false;

    // Sign player
    player.teamId = teamId;
    player.salary = weeklySalary;
    
    const contractEnd = new Date(this.state.currentDate);
    contractEnd.setFullYear(contractEnd.getFullYear() + contractYears);
    player.contractEnd = contractEnd.toISOString();

    team.playerIds.push(playerId);
    team.currentWages += annualCost;

    player.transferHistory.push({
      date: this.state.currentDate,
      fromTeamId: null,
      toTeamId: teamId,
      fee: 0,
      type: 'free',
    });

    return true;
  }
}
