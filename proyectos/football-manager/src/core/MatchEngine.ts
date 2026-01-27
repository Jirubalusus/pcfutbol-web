/**
 * MatchEngine - Simulates football matches
 * 
 * Uses team/player attributes to calculate probabilities
 * and generate realistic match events.
 */

import { Match, MatchEvent, MatchStats, GameState, Team, Player, Position } from '../types';

interface MatchContext {
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  homeLineup: Player[];
  awayLineup: Player[];
}

export class MatchEngine {
  
  /**
   * Simulate a complete match
   */
  simulateMatch(match: Match, state: GameState): Match {
    const context = this.buildContext(match, state);
    
    // Calculate team strengths
    const homeStrength = this.calculateTeamStrength(context.homeLineup, true);
    const awayStrength = this.calculateTeamStrength(context.awayLineup, false);
    
    // Initialize result
    const result: Match = {
      ...match,
      played: true,
      homeScore: 0,
      awayScore: 0,
      events: [],
      stats: this.initializeStats(),
    };
    
    // Simulate 90 minutes + injury time
    const totalMinutes = 90 + Math.floor(Math.random() * 5);
    
    for (let minute = 1; minute <= totalMinutes; minute++) {
      this.simulateMinute(minute, result, context, homeStrength, awayStrength, state);
    }
    
    // Calculate final stats
    result.stats = this.calculateFinalStats(context, homeStrength, awayStrength);
    
    return result;
  }

  private buildContext(match: Match, state: GameState): MatchContext {
    const homeTeam = state.teams[match.homeTeamId];
    const awayTeam = state.teams[match.awayTeamId];
    
    const homePlayers = homeTeam.playerIds.map(id => state.players[id]).filter(Boolean);
    const awayPlayers = awayTeam.playerIds.map(id => state.players[id]).filter(Boolean);
    
    // Get lineup or auto-select best 11
    const homeLineup = homeTeam.lineup?.length === 11 
      ? homeTeam.lineup.map(id => state.players[id]).filter(Boolean)
      : this.autoSelectLineup(homePlayers);
      
    const awayLineup = awayTeam.lineup?.length === 11
      ? awayTeam.lineup.map(id => state.players[id]).filter(Boolean)
      : this.autoSelectLineup(awayPlayers);
    
    return { homeTeam, awayTeam, homePlayers, awayPlayers, homeLineup, awayLineup };
  }

  private autoSelectLineup(players: Player[]): Player[] {
    // Simple auto-selection: best 11 by overall
    const available = players.filter(p => !p.injured && !p.suspended && p.condition > 30);
    
    // Need at least 1 GK
    const gks = available.filter(p => p.position === 'GK').sort((a, b) => b.overall - a.overall);
    const outfield = available.filter(p => p.position !== 'GK').sort((a, b) => b.overall - a.overall);
    
    const lineup: Player[] = [];
    if (gks.length > 0) lineup.push(gks[0]);
    else if (outfield.length > 0) lineup.push(outfield[0]); // Emergency GK
    
    // Fill rest with best outfield players
    for (const player of outfield) {
      if (lineup.length >= 11) break;
      if (!lineup.includes(player)) lineup.push(player);
    }
    
    return lineup;
  }

  private calculateTeamStrength(lineup: Player[], isHome: boolean): number {
    if (lineup.length === 0) return 50;
    
    const avgOverall = lineup.reduce((sum, p) => sum + p.overall, 0) / lineup.length;
    const avgCondition = lineup.reduce((sum, p) => sum + p.condition, 0) / lineup.length;
    
    // Home advantage
    const homeBonus = isHome ? 5 : 0;
    
    // Condition modifier
    const conditionMod = (avgCondition - 70) / 30 * 10; // -10 to +10
    
    return avgOverall + homeBonus + conditionMod;
  }

  private initializeStats(): MatchStats {
    return {
      possession: [50, 50],
      shots: [0, 0],
      shotsOnTarget: [0, 0],
      corners: [0, 0],
      fouls: [0, 0],
      offsides: [0, 0],
      passes: [0, 0],
      passAccuracy: [0, 0],
    };
  }

  private simulateMinute(
    minute: number,
    result: Match,
    context: MatchContext,
    homeStrength: number,
    awayStrength: number,
    state: GameState
  ): void {
    // Chance of significant event per minute
    const eventChance = 0.05; // 5% chance per minute
    
    if (Math.random() > eventChance) return;
    
    // Determine which team has the chance
    const totalStrength = homeStrength + awayStrength;
    const homeChance = homeStrength / totalStrength;
    const isHomeEvent = Math.random() < homeChance;
    
    const attackingTeam = isHomeEvent ? context.homeTeam : context.awayTeam;
    const attackingLineup = isHomeEvent ? context.homeLineup : context.awayLineup;
    const defendingLineup = isHomeEvent ? context.awayLineup : context.homeLineup;
    
    // Determine event type
    const eventRoll = Math.random();
    
    if (eventRoll < 0.4) {
      // Shot
      this.processShot(minute, result, attackingTeam, attackingLineup, defendingLineup, isHomeEvent);
    } else if (eventRoll < 0.6) {
      // Foul (potential card)
      this.processFoul(minute, result, context, isHomeEvent);
    } else if (eventRoll < 0.65) {
      // Corner
      result.stats![isHomeEvent ? 'corners' : 'corners'][isHomeEvent ? 0 : 1]++;
    }
  }

  private processShot(
    minute: number,
    result: Match,
    attackingTeam: Team,
    attackingLineup: Player[],
    defendingLineup: Player[],
    isHome: boolean
  ): void {
    const stats = result.stats!;
    const scoreIndex = isHome ? 0 : 1;
    
    // Pick a shooter (weighted by position and shooting)
    const shooter = this.pickShooter(attackingLineup);
    if (!shooter) return;
    
    stats.shots[scoreIndex]++;
    
    // Calculate shot on target chance
    const shootingSkill = shooter.attributes.shooting;
    const onTargetChance = 0.3 + (shootingSkill / 100) * 0.4; // 30-70%
    
    if (Math.random() < onTargetChance) {
      stats.shotsOnTarget[scoreIndex]++;
      
      // Calculate goal chance
      const gk = defendingLineup.find(p => p.position === 'GK');
      const gkSkill = gk ? (gk.attributes.reflexes || 50) : 50;
      
      const finishingSkill = shooter.attributes.finishing;
      const goalChance = 0.1 + (finishingSkill / 100) * 0.3 - (gkSkill / 100) * 0.2; // ~10-30%
      
      if (Math.random() < goalChance) {
        // GOAL!
        if (isHome) result.homeScore!++;
        else result.awayScore!++;
        
        // Find potential assister
        const assister = this.pickAssister(attackingLineup, shooter);
        
        result.events!.push({
          minute,
          type: 'goal',
          playerId: shooter.id,
          teamId: attackingTeam.id,
          relatedPlayerId: assister?.id,
        });
        
        if (assister) {
          result.events!.push({
            minute,
            type: 'assist',
            playerId: assister.id,
            teamId: attackingTeam.id,
            relatedPlayerId: shooter.id,
          });
        }
      }
    }
  }

  private pickShooter(lineup: Player[]): Player | null {
    // Weight by position (attackers more likely) and shooting attribute
    const weights = lineup.map(p => {
      let posWeight = 1;
      if (['ST', 'CF'].includes(p.position)) posWeight = 4;
      else if (['RW', 'LW', 'CAM'].includes(p.position)) posWeight = 3;
      else if (['CM', 'RM', 'LM'].includes(p.position)) posWeight = 2;
      else if (['CDM'].includes(p.position)) posWeight = 1;
      else posWeight = 0.5; // Defenders, GK
      
      return posWeight * (p.attributes.shooting / 50);
    });
    
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (totalWeight === 0) return lineup[0];
    
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < lineup.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return lineup[i];
    }
    
    return lineup[lineup.length - 1];
  }

  private pickAssister(lineup: Player[], shooter: Player): Player | null {
    // 70% chance of assist
    if (Math.random() > 0.7) return null;
    
    const potential = lineup.filter(p => p.id !== shooter.id);
    if (potential.length === 0) return null;
    
    // Weight by vision and passing
    const weights = potential.map(p => (p.attributes.vision + p.attributes.passing) / 100);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < potential.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return potential[i];
    }
    
    return potential[0];
  }

  private processFoul(minute: number, result: Match, context: MatchContext, isHomeAttacking: boolean): void {
    // Defending team commits foul
    const defendingTeam = isHomeAttacking ? context.awayTeam : context.homeTeam;
    const defendingLineup = isHomeAttacking ? context.awayLineup : context.homeLineup;
    
    const fouler = defendingLineup[Math.floor(Math.random() * defendingLineup.length)];
    if (!fouler) return;
    
    result.stats!.fouls[isHomeAttacking ? 1 : 0]++;
    
    // Card chance based on aggression
    const cardChance = 0.1 + (fouler.attributes.aggression / 100) * 0.2;
    
    if (Math.random() < cardChance) {
      // Yellow or red?
      const isRed = Math.random() < 0.1; // 10% of cards are red
      
      result.events!.push({
        minute,
        type: isRed ? 'red' : 'yellow',
        playerId: fouler.id,
        teamId: defendingTeam.id,
      });
    }
  }

  private calculateFinalStats(context: MatchContext, homeStrength: number, awayStrength: number): MatchStats {
    const totalStrength = homeStrength + awayStrength;
    const homePossession = Math.round((homeStrength / totalStrength) * 100);
    
    return {
      possession: [homePossession, 100 - homePossession],
      shots: [8 + Math.floor(Math.random() * 8), 6 + Math.floor(Math.random() * 8)],
      shotsOnTarget: [3 + Math.floor(Math.random() * 5), 2 + Math.floor(Math.random() * 5)],
      corners: [3 + Math.floor(Math.random() * 6), 2 + Math.floor(Math.random() * 6)],
      fouls: [8 + Math.floor(Math.random() * 8), 8 + Math.floor(Math.random() * 8)],
      offsides: [Math.floor(Math.random() * 5), Math.floor(Math.random() * 5)],
      passes: [300 + Math.floor(Math.random() * 200), 250 + Math.floor(Math.random() * 200)],
      passAccuracy: [75 + Math.floor(Math.random() * 15), 70 + Math.floor(Math.random() * 15)],
    };
  }
}
