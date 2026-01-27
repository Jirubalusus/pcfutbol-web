/**
 * AIManager - Controls AI team decisions
 */

import { GameState, Team, Player, AIPersonality } from '../types';

export class AIManager {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  /**
   * Process daily AI decisions
   */
  processDaily(): void {
    for (const team of Object.values(this.state.teams)) {
      // Skip player's team
      if (team.id === this.state.playerTeamId) continue;
      
      // Random chance of making a decision each day
      if (Math.random() < 0.1) { // 10% chance
        this.makeTransferDecision(team);
      }
    }
  }

  /**
   * Process end of season AI planning
   */
  processSeasonEnd(): void {
    for (const team of Object.values(this.state.teams)) {
      if (team.id === this.state.playerTeamId) continue;
      
      this.planNextSeason(team);
    }
  }

  /**
   * Suggest a lineup for a team
   */
  suggestLineup(teamId: string): { lineup: string[]; formation: string } {
    const team = this.state.teams[teamId];
    if (!team) return { lineup: [], formation: '4-4-2' };

    const players = team.playerIds
      .map(id => this.state.players[id])
      .filter(p => p && !p.injured && !p.suspended && p.condition > 30);

    // Choose formation based on available players
    const formation = this.chooseFormation(players);
    const lineup = this.selectBestLineup(players, formation);

    return { lineup: lineup.map(p => p.id), formation };
  }

  private makeTransferDecision(team: Team): void {
    const personality = team.aiPersonality;
    
    // Analyze squad weaknesses
    const weaknesses = this.analyzeSquadWeaknesses(team);
    
    if (weaknesses.length === 0) return;
    
    // Based on personality, decide whether to act
    const activityThreshold = {
      passive: 0.8,
      moderate: 0.5,
      aggressive: 0.2,
    }[personality.transferActivity];

    if (Math.random() > activityThreshold) return;

    // Look for targets (simplified)
    const targetPosition = weaknesses[0];
    const budget = team.budget * 0.3; // Max 30% of budget on one player

    // Would normally search for suitable players here
    // For now, just log the intention
    console.log(`AI: ${team.name} looking for ${targetPosition} with budget ${budget}`);
  }

  private analyzeSquadWeaknesses(team: Team): string[] {
    const players = team.playerIds.map(id => this.state.players[id]).filter(Boolean);
    
    const positionCounts: { [pos: string]: number } = {};
    const positionQuality: { [pos: string]: number } = {};

    for (const player of players) {
      positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
      positionQuality[player.position] = Math.max(
        positionQuality[player.position] || 0,
        player.overall
      );
    }

    const weaknesses: string[] = [];

    // Required minimum per position
    const required: { [pos: string]: number } = {
      GK: 2, CB: 4, RB: 2, LB: 2, CDM: 2, CM: 3, CAM: 1, RW: 2, LW: 2, ST: 2,
    };

    for (const [pos, min] of Object.entries(required)) {
      if ((positionCounts[pos] || 0) < min) {
        weaknesses.push(pos);
      }
    }

    // Also check quality - if best player in position is below 65 overall
    for (const [pos, quality] of Object.entries(positionQuality)) {
      if (quality < 65 && !weaknesses.includes(pos)) {
        weaknesses.push(pos);
      }
    }

    return weaknesses;
  }

  private planNextSeason(team: Team): void {
    // Analyze squad age
    const players = team.playerIds.map(id => this.state.players[id]).filter(Boolean);
    const avgAge = players.reduce((sum, p) => sum + p.age, 0) / players.length;

    // If squad is old, focus on youth
    if (avgAge > 28) {
      team.aiPersonality.youthFocus = Math.min(100, team.aiPersonality.youthFocus + 20);
    }

    // Adjust transfer activity based on league position
    if (team.seasonStats.position <= 3) {
      // Top team - maintain
      team.aiPersonality.transferActivity = 'moderate';
    } else if (team.seasonStats.position >= 18) {
      // Relegation zone - desperate
      team.aiPersonality.transferActivity = 'aggressive';
      team.aiPersonality.riskTolerance = Math.min(100, team.aiPersonality.riskTolerance + 20);
    }
  }

  private chooseFormation(players: Player[]): string {
    const positions: { [pos: string]: number } = {};
    for (const player of players) {
      positions[player.position] = (positions[player.position] || 0) + 1;
    }

    // Simple formation selection based on available players
    const defenders = (positions['CB'] || 0) + (positions['RB'] || 0) + (positions['LB'] || 0);
    const midfielders = (positions['CDM'] || 0) + (positions['CM'] || 0) + (positions['CAM'] || 0) + 
                        (positions['RM'] || 0) + (positions['LM'] || 0);
    const attackers = (positions['ST'] || 0) + (positions['CF'] || 0) + 
                      (positions['RW'] || 0) + (positions['LW'] || 0);

    if (attackers >= 4 && midfielders >= 4) return '4-3-3';
    if (midfielders >= 5) return '4-5-1';
    if (defenders >= 5) return '5-3-2';
    return '4-4-2';
  }

  private selectBestLineup(players: Player[], formation: string): Player[] {
    const formationPositions: { [f: string]: string[] } = {
      '4-4-2': ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST'],
      '4-3-3': ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'RW', 'ST', 'LW'],
      '4-5-1': ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CDM', 'CM', 'LM', 'ST'],
      '5-3-2': ['GK', 'RB', 'CB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'ST', 'ST'],
      '3-5-2': ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CDM', 'CM', 'LM', 'ST', 'ST'],
    };

    const positions = formationPositions[formation] || formationPositions['4-4-2'];
    const lineup: Player[] = [];
    const used = new Set<string>();

    for (const pos of positions) {
      // Find best available player for this position
      const suitable = players
        .filter(p => !used.has(p.id))
        .filter(p => this.canPlayPosition(p, pos))
        .sort((a, b) => {
          // Prefer natural position, then by overall
          const aBonus = a.position === pos ? 5 : 0;
          const bBonus = b.position === pos ? 5 : 0;
          return (b.overall + bBonus) - (a.overall + aBonus);
        });

      if (suitable.length > 0) {
        lineup.push(suitable[0]);
        used.add(suitable[0].id);
      }
    }

    return lineup;
  }

  private canPlayPosition(player: Player, targetPos: string): boolean {
    const pos = player.position;
    
    // Exact match
    if (pos === targetPos) return true;
    
    // Compatible positions
    const compatible: { [p: string]: string[] } = {
      GK: [],
      CB: ['CDM'],
      RB: ['RM', 'RW'],
      LB: ['LM', 'LW'],
      CDM: ['CB', 'CM'],
      CM: ['CDM', 'CAM'],
      CAM: ['CM', 'CF'],
      RM: ['RB', 'RW'],
      LM: ['LB', 'LW'],
      RW: ['RM', 'ST'],
      LW: ['LM', 'ST'],
      ST: ['CF', 'RW', 'LW'],
      CF: ['ST', 'CAM'],
    };

    return (compatible[pos] || []).includes(targetPos);
  }
}
