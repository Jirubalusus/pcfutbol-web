/**
 * PlayerProgression - Handles player development and decline
 */

import { Player, Team, PlayerAttributes } from '../types';

export class PlayerProgression {
  
  /**
   * Process daily training for all teams
   */
  processDailyTraining(teams: { [id: string]: Team }): void {
    // Training happens but changes are minimal daily
    // Main progression happens weekly/monthly
  }

  /**
   * Process weekly training session
   */
  processWeeklyTraining(players: { [id: string]: Player }): void {
    for (const player of Object.values(players)) {
      // Skip injured players
      if (player.injured) continue;

      // Small chance of attribute improvement based on age
      const improvementChance = this.getImprovementChance(player.age);
      
      if (Math.random() < improvementChance) {
        this.improveRandomAttribute(player);
      }

      // Condition recovery
      player.condition = Math.min(100, player.condition + 10);

      // Morale slight drift towards 60 (neutral)
      if (player.morale < 60) {
        player.morale = Math.min(60, player.morale + 2);
      } else if (player.morale > 60) {
        player.morale = Math.max(60, player.morale - 1);
      }
    }
  }

  /**
   * Process end of season - yearly progression/regression
   */
  processSeasonEnd(players: { [id: string]: Player }): void {
    for (const player of Object.values(players)) {
      // Age the player
      player.age += 1;

      if (player.age < 24) {
        // Young players: high growth potential
        this.applyGrowth(player, 2, 5);
      } else if (player.age < 28) {
        // Prime years: small improvements possible
        this.applyGrowth(player, 0, 2);
      } else if (player.age < 32) {
        // Starting decline
        this.applyDecline(player, 0, 2);
      } else {
        // Significant decline
        this.applyDecline(player, 2, 5);
      }

      // Recalculate overall
      player.overall = this.calculateOverall(player);

      // Reset season stats
      player.seasonStats = {
        appearances: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        minutesPlayed: 0,
        averageRating: 0,
      };
    }
  }

  /**
   * Calculate overall rating from attributes
   */
  calculateOverall(player: Player): number {
    const attrs = player.attributes;
    const pos = player.position;

    let weights: { [key: string]: number } = {};

    if (pos === 'GK') {
      weights = {
        reflexes: 25,
        handling: 20,
        positioning_gk: 20,
        diving: 20,
        kicking: 15,
      };
    } else if (['CB', 'RB', 'LB'].includes(pos)) {
      weights = {
        tackling: 20,
        positioning: 15,
        strength: 15,
        heading: 15,
        pace: 10,
        passing: 10,
        stamina: 10,
        composure: 5,
      };
    } else if (['CDM', 'CM'].includes(pos)) {
      weights = {
        passing: 20,
        vision: 15,
        tackling: 15,
        stamina: 15,
        positioning: 10,
        firstTouch: 10,
        workRate: 10,
        shooting: 5,
      };
    } else if (['CAM', 'RM', 'LM'].includes(pos)) {
      weights = {
        passing: 18,
        vision: 15,
        dribbling: 15,
        pace: 12,
        shooting: 12,
        firstTouch: 10,
        crossing: 10,
        stamina: 8,
      };
    } else if (['RW', 'LW'].includes(pos)) {
      weights = {
        pace: 20,
        dribbling: 18,
        crossing: 15,
        passing: 12,
        shooting: 12,
        firstTouch: 10,
        agility: 8,
        stamina: 5,
      };
    } else { // ST, CF
      weights = {
        finishing: 25,
        shooting: 20,
        positioning: 15,
        heading: 10,
        firstTouch: 10,
        pace: 10,
        composure: 10,
      };
    }

    let total = 0;
    let weightSum = 0;

    for (const [attr, weight] of Object.entries(weights)) {
      const value = (attrs as any)[attr] || 50;
      total += value * weight;
      weightSum += weight;
    }

    return Math.round(total / weightSum);
  }

  /**
   * Generate initial attributes for a player based on position and overall
   */
  generateAttributes(position: string, overall: number, age: number): PlayerAttributes {
    const baseValue = overall;
    const variance = () => Math.floor(Math.random() * 20) - 10; // -10 to +10

    const clamp = (v: number) => Math.max(1, Math.min(99, v));

    // Position-specific bonuses
    const posBonus: { [pos: string]: { [attr: string]: number } } = {
      GK: { reflexes: 20, handling: 15, diving: 15, positioning_gk: 15, kicking: 10 },
      CB: { tackling: 15, heading: 15, strength: 15, positioning: 10 },
      RB: { pace: 15, tackling: 10, crossing: 10, stamina: 10 },
      LB: { pace: 15, tackling: 10, crossing: 10, stamina: 10 },
      CDM: { tackling: 15, passing: 10, positioning: 10, strength: 10 },
      CM: { passing: 15, vision: 10, stamina: 10, firstTouch: 10 },
      CAM: { vision: 15, passing: 15, dribbling: 10, shooting: 10 },
      RM: { pace: 15, crossing: 15, dribbling: 10 },
      LM: { pace: 15, crossing: 15, dribbling: 10 },
      RW: { pace: 20, dribbling: 15, crossing: 10 },
      LW: { pace: 20, dribbling: 15, crossing: 10 },
      ST: { finishing: 20, shooting: 15, positioning: 10 },
      CF: { finishing: 15, shooting: 15, dribbling: 10, vision: 10 },
    };

    const bonus = posBonus[position] || {};

    const attrs: PlayerAttributes = {
      // Technical
      passing: clamp(baseValue + variance() + (bonus.passing || 0)),
      shooting: clamp(baseValue + variance() + (bonus.shooting || 0)),
      dribbling: clamp(baseValue + variance() + (bonus.dribbling || 0)),
      tackling: clamp(baseValue - 10 + variance() + (bonus.tackling || 0)),
      heading: clamp(baseValue - 5 + variance() + (bonus.heading || 0)),
      crossing: clamp(baseValue - 5 + variance() + (bonus.crossing || 0)),
      finishing: clamp(baseValue - 5 + variance() + (bonus.finishing || 0)),
      firstTouch: clamp(baseValue + variance() + (bonus.firstTouch || 0)),
      freeKick: clamp(baseValue - 10 + variance()),
      penalty: clamp(baseValue - 5 + variance()),

      // Physical
      pace: clamp(baseValue + variance() + (bonus.pace || 0)),
      strength: clamp(baseValue - 5 + variance() + (bonus.strength || 0)),
      stamina: clamp(baseValue + variance() + (bonus.stamina || 0)),
      agility: clamp(baseValue + variance()),
      jumping: clamp(baseValue - 5 + variance()),

      // Mental
      vision: clamp(baseValue - 5 + variance() + (bonus.vision || 0)),
      composure: clamp(baseValue - 5 + variance()),
      aggression: clamp(50 + Math.floor(Math.random() * 30)),
      positioning: clamp(baseValue + variance() + (bonus.positioning || 0)),
      workRate: clamp(60 + Math.floor(Math.random() * 30)),
      leadership: clamp(30 + age + Math.floor(Math.random() * 20)),
    };

    // GK-specific
    if (position === 'GK') {
      attrs.reflexes = clamp(baseValue + variance() + 15);
      attrs.handling = clamp(baseValue + variance() + 10);
      attrs.positioning_gk = clamp(baseValue + variance() + 10);
      attrs.diving = clamp(baseValue + variance() + 10);
      attrs.kicking = clamp(baseValue + variance());
    }

    return attrs;
  }

  /**
   * Calculate potential based on age and current overall
   */
  generatePotential(age: number, overall: number): number {
    // Younger players have more potential growth room
    if (age < 19) {
      return Math.min(99, overall + 15 + Math.floor(Math.random() * 15));
    } else if (age < 22) {
      return Math.min(99, overall + 10 + Math.floor(Math.random() * 10));
    } else if (age < 25) {
      return Math.min(99, overall + 5 + Math.floor(Math.random() * 5));
    } else {
      return overall + Math.floor(Math.random() * 3);
    }
  }

  private getImprovementChance(age: number): number {
    if (age < 21) return 0.15;
    if (age < 24) return 0.10;
    if (age < 28) return 0.05;
    return 0.02;
  }

  private improveRandomAttribute(player: Player): void {
    const attrs = Object.keys(player.attributes) as (keyof PlayerAttributes)[];
    const attr = attrs[Math.floor(Math.random() * attrs.length)];
    
    if (player.attributes[attr] !== undefined) {
      (player.attributes as any)[attr] = Math.min(99, (player.attributes as any)[attr] + 1);
    }
  }

  private applyGrowth(player: Player, min: number, max: number): void {
    if (player.overall >= player.potential) return;
    
    const growth = min + Math.floor(Math.random() * (max - min + 1));
    const newOverall = Math.min(player.potential, player.overall + growth);
    
    // Distribute growth across attributes
    const improvement = newOverall - player.overall;
    for (let i = 0; i < improvement; i++) {
      this.improveRandomAttribute(player);
    }
    
    player.overall = newOverall;
  }

  private applyDecline(player: Player, min: number, max: number): void {
    const decline = min + Math.floor(Math.random() * (max - min + 1));
    
    // Physical attributes decline more
    const physicalAttrs: (keyof PlayerAttributes)[] = ['pace', 'stamina', 'agility', 'jumping'];
    
    for (let i = 0; i < decline; i++) {
      if (Math.random() < 0.6) {
        // Physical decline
        const attr = physicalAttrs[Math.floor(Math.random() * physicalAttrs.length)];
        if (player.attributes[attr] !== undefined) {
          (player.attributes as any)[attr] = Math.max(1, (player.attributes as any)[attr] - 1);
        }
      } else {
        // Random decline
        const attrs = Object.keys(player.attributes) as (keyof PlayerAttributes)[];
        const attr = attrs[Math.floor(Math.random() * attrs.length)];
        if (player.attributes[attr] !== undefined) {
          (player.attributes as any)[attr] = Math.max(1, (player.attributes as any)[attr] - 1);
        }
      }
    }
    
    player.overall = this.calculateOverall(player);
  }
}
