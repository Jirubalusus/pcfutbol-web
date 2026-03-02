// ============================================================
// WORLD CUP MODE — Event System (Reigns-style)
// ============================================================
// Each event has two choices. Each choice affects 4 resource bars:
//   morale (⚽), fitness (🏥), pressure (📰), budget (💰)
// Values: -30 to +30 (negative = decrease, positive = increase)
// Pressure is INVERSE: high = bad (you get fired at 100)
//
// REDESIGNED: All specials are now logical consequences of each
// event's narrative. No generic aggressive/safe patterns.
// ============================================================

export const EVENT_CATEGORIES = {
  PRESS: 'press',
  CAMP: 'camp',
  SCANDAL: 'scandal',
  FEDERATION: 'federation',
  TACTICAL: 'tactical',
  WEATHER: 'weather',
  PERSONAL: 'personal',
  WILDCARD: 'wildcard',
  CHAIN: 'chain',
};

export const CONFEDERATIONS = {
  UEFA: 'UEFA',
  CONMEBOL: 'CONMEBOL',
  CONCACAF: 'CONCACAF',
  CAF: 'CAF',
  AFC: 'AFC',
  OFC: 'OFC',
};

export const RESOURCE_LIMITS = {
  morale: { min: 0, max: 100, start: 60, criticalLow: 20, criticalHigh: null },
  fitness: { min: 0, max: 100, start: 75, criticalLow: 20, criticalHigh: null },
  pressure: { min: 0, max: 100, start: 30, criticalLow: null, criticalHigh: 85 },
  budget: { min: 0, max: 100, start: 50, criticalLow: 10, criticalHigh: null },
};

// ── Events Database ──
export const WORLD_CUP_EVENTS = [
  // ════════════════════════════════════════════
  // 🎙️ PRESS CONFERENCES
  // ════════════════════════════════════════════

  {
    // Fans demand you start injured star striker
    id: 'press_fans_demand',
    category: 'press',
    weight: 10,
    choiceA: {
      // Start him — fan pressure motivates him, but he's injured
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { playerOnFire: { player: 'star' }, injuryRisk: 0.3, extraGoalChance: { player: 'star', percent: 40 } },
    },
    choiceB: {
      // Bench him — he doesn't play, comes back stronger
      effects: { morale: 15, fitness: -10, pressure: 10, budget: -5 },
      special: { playerSuspended: { who: 'star', count: 1 }, boostNextMatch: { team: true, rating: 5 } },
    },
  },
  {
    // Rival coach says your team "plays with fear"
    id: 'press_rival_provocation',
    category: 'press',
    weight: 10,
    choiceA: {
      // Respond aggressively — team fired up, match becomes chaotic
      effects: { morale: 15, fitness: 10, pressure: -15, budget: 5 },
      special: { highScoringMatch: true, redCardRisk: { percent: 20, team: 'player' }, comebackPower: true },
    },
    choiceB: {
      // Diplomatic — controlled composure, tight game
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { lowScoringMatch: true, cleanSheet: { percent: 20 } },
    },
  },
  {
    // Journalist insists on knowing if injured midfielder will play
    id: 'press_injury_question',
    category: 'press',
    weight: 8,
    choiceA: {
      // Honest: "He's a doubt" — transparency earns respect, protects player
      effects: { morale: -10, fitness: 10, pressure: -15, budget: 5 },
      special: { playerProtected: { player: 'star' } },
    },
    choiceB: {
      // Lie: "He's 100%" — mindgames confuse opponent but lie may backfire
      effects: { morale: 10, fitness: -15, pressure: 5, budget: -10 },
      special: { revealOpponent: true, pressureBomb: { value: 8 } },
    },
  },
  {
    // Mid-conference you blurt out "We're definitely winning tomorrow"
    id: 'press_promise_victory',
    category: 'press',
    weight: 8,
    choiceA: {
      // Stand by it — team believes, massive pressure, conditional
      effects: { morale: -5, fitness: -10, pressure: 15, budget: 10 },
      chain: { win: 'chain_promise_kept', lose: 'chain_promise_broken' },
      special: { playerOnFire: { player: 'star' }, pressureBomb: { value: 15 }, winStreakBonus: true, loseStreakPenalty: true },
    },
    choiceB: {
      // Walk it back — no pressure, but team loses edge
      effects: { morale: 15, fitness: -5, pressure: -10, budget: -10 },
      special: { comebackPower: true, lowScoringMatch: true },
    },
  },
  {
    // Staff leaked your lineup to media. Rival knows your plan.
    id: 'press_tactics_leaked',
    category: 'press',
    weight: 7,
    choiceA: {
      // Change tactics last minute — surprise factor but hasty
      effects: { morale: -10, fitness: 15, pressure: 10, budget: -5 },
      special: { extraGoalChance: { player: 'random', percent: 35 }, redCardRisk: { percent: 15, team: 'player' } },
    },
    choiceB: {
      // Stick to plan, trust execution — rival knows but you're confident
      effects: { morale: 20, fitness: 10, pressure: -10, budget: 5 },
      special: { playerProtected: { player: 'star' }, opponentExtraGoal: { percent: 25 } },
    },
  },
  {
    // Press won't stop talking about your young star
    id: 'press_young_talent',
    category: 'press',
    weight: 8,
    choiceA: {
      // Give him the spotlight — pressure on youth, but motivated
      effects: { morale: 10, fitness: -10, pressure: -5, budget: -15 },
      playerBuff: { target: 'youngBest', ratingMod: 5, duration: 2 },
      special: { extraGoalChance: { player: 'random', percent: 35 }, pressureBomb: { value: 10 } },
    },
    choiceB: {
      // Shield him: "Just part of the group" — no pressure, veteran leads
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      playerBuff: { target: 'captain', ratingMod: 3, duration: 2 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 3 } },
    },
  },

  // ════════════════════════════════════════════
  // 🏨 CAMP / CONCENTRATION
  // ════════════════════════════════════════════

  {
    // Captain wants family dinner night before match
    id: 'camp_family_dinner',
    category: 'camp',
    weight: 10,
    choiceA: {
      // Allow it — captain relaxed, warm atmosphere, but less focused
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { moraleExplosion: { value: 10 }, comebackPower: true },
    },
    choiceB: {
      // Deny it — focused, disciplined night
      effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
      special: { cleanSheet: { percent: 25 }, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Starter snuck out of hotel at 2AM
    id: 'camp_curfew_break',
    category: 'camp',
    weight: 8,
    choiceA: {
      // Punish — player suspended, discipline restored
      effects: { morale: -15, fitness: 10, pressure: -5, budget: 10 },
      special: { playerSuspended: { who: 'random', count: 1 }, cleanSheet: { percent: 20 } },
    },
    choiceB: {
      // Forgive — keeps player but lack of discipline shows on pitch
      effects: { morale: 20, fitness: 15, pressure: -15, budget: 10 },
      special: { concedeLate: { percent: 35 }, redCardRisk: { percent: 15, team: 'player' } },
    },
  },
  {
    // Intense or light training one day before match
    id: 'camp_training_intensity',
    category: 'camp',
    weight: 10,
    choiceA: {
      // Intense session — sharp but risk of injury
      effects: { morale: 15, fitness: -10, pressure: 10, budget: -5 },
      special: { extraGoalChance: { player: 'random', percent: 30 }, injuryRisk: 0.2 },
    },
    choiceB: {
      // Light session — fresh legs, protected
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { playerProtected: { player: 'star' }, comebackPower: true, boostNextMatch: { team: true, rating: 4 } },
    },
  },
  {
    // Reggaeton vs drill music war in dressing room
    id: 'camp_music_dispute',
    category: 'camp',
    weight: 7,
    choiceA: {
      // Play reggaeton — party vibes, loose atmosphere
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { moraleExplosion: { value: 8 }, highScoringMatch: true },
    },
    choiceB: {
      // Kill the music — silence and concentration
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      conflictPair: true,
      special: { lowScoringMatch: true, cleanSheet: { percent: 20 } },
    },
  },
  {
    // Three players sick from hotel buffet
    id: 'camp_food_poisoning',
    category: 'camp',
    weight: 5,
    choiceA: {
      // Change hotels — disruption and expense
      effects: { morale: 25, fitness: 10, pressure: -10, budget: 15 },
      special: { injuryRisk: 0.2, concedeLate: { percent: 30 } },
    },
    choiceB: {
      // Stay and treat — cheaper but may recur
      effects: { morale: 15, fitness: 20, pressure: -15, budget: 10 },
      special: { playerNerfed: { player: 'star' }, opponentExtraGoal: { percent: 20 } },
    },
  },
  {
    // Paintball/BBQ vs tactical whiteboard session
    id: 'camp_team_bonding',
    category: 'camp',
    weight: 9,
    choiceA: {
      // Paintball and BBQ — bonding, fun, but not training
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { moraleExplosion: { value: 10 }, comebackPower: true },
    },
    choiceB: {
      // Tactical whiteboard — study, preparation
      effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
      special: { revealOpponent: true, cleanSheet: { percent: 25 } },
    },
  },
  {
    // Veteran vs young star want to give pre-match talk
    id: 'camp_veteran_advice',
    category: 'camp',
    weight: 7,
    choiceA: {
      // Veteran speaks — experience, calm, defensive solidity
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      playerBuff: { target: 'captain', ratingMod: 4, duration: 2 },
      special: { cleanSheet: { percent: 30 }, comebackPower: true },
    },
    choiceB: {
      // Young star speaks — energy, fire, attacking intent
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      playerBuff: { target: 'youngBest', ratingMod: 6, duration: 2 },
      special: { extraGoalChance: { player: 'random', percent: 40 }, highScoringMatch: true },
    },
  },

  // ════════════════════════════════════════════
  // 📰 SCANDALS
  // ════════════════════════════════════════════

  {
    // Two starters fought in training, videos circulating
    id: 'scandal_fight_training',
    category: 'scandal',
    weight: 7,
    choiceA: {
      // Deny everything — cover-up, but tension festers
      effects: { morale: 20, fitness: 10, pressure: -20, budget: 15 },
      conflictPair: true,
      special: { redCardRisk: { percent: 25, team: 'player' }, concedeLate: { percent: 25 } },
    },
    choiceB: {
      // Admit and mediate — transparency, but chaos
      effects: { morale: -10, fitness: 10, pressure: -15, budget: 5 },
      special: { comebackPower: true, highScoringMatch: true },
    },
  },
  {
    // Player posted story criticizing your lineup
    id: 'scandal_social_media',
    category: 'scandal',
    weight: 8,
    choiceA: {
      // Drop him — player suspended, authority restored
      effects: { morale: 10, fitness: -15, pressure: 5, budget: -10 },
      special: { playerSuspended: { who: 'random', count: 1 }, cleanSheet: { percent: 20 } },
    },
    choiceB: {
      // Ignore — keeps player but disrespect spreads
      effects: { morale: 15, fitness: 15, pressure: -10, budget: 20 },
      special: { pressureBomb: { value: 10 }, concedeLate: { percent: 25 } },
    },
  },
  {
    // Photos of best player at late-night party
    id: 'scandal_party_photo',
    category: 'scandal',
    weight: 6,
    choiceA: {
      // Confront — suspend player, discipline over results
      effects: { morale: -5, fitness: -10, pressure: 15, budget: 10 },
      special: { playerSuspended: { who: 'random', count: 1 }, lowScoringMatch: true, cleanSheet: { percent: 25 } },
    },
    choiceB: {
      // Cover it up — keep player but discipline erodes
      effects: { morale: 20, fitness: 15, pressure: -15, budget: 10 },
      special: { concedeLate: { percent: 35 }, redCardRisk: { percent: 20, team: 'player' } },
    },
  },
  {
    // Two players' partners fought at hotel. Tabloids have everything.
    id: 'scandal_wag_drama',
    category: 'scandal',
    weight: 6,
    choiceA: {
      // Ban visits — eliminates distraction but players resent it
      effects: { morale: 10, fitness: 15, pressure: -10, budget: 10 },
      special: { playerNerfed: { player: 'star' }, lowScoringMatch: true },
    },
    choiceB: {
      // Don't intervene — drama may escalate
      effects: { morale: 25, fitness: 10, pressure: -10, budget: 15 },
      conflictPair: true,
      special: { concedeLate: { percent: 30 }, pressureBomb: { value: 10 } },
    },
  },
  {
    // FIFA investigates starter for illegal betting
    id: 'scandal_betting',
    category: 'scandal',
    weight: 4,
    unique: true,
    choiceA: {
      // Cooperate — lose player but clean conscience
      effects: { morale: 15, fitness: -5, pressure: -10, budget: -10 },
      special: { playerSuspended: { who: 'random', count: 1 }, cleanSheet: { percent: 20 } },
    },
    choiceB: {
      // Defend player — high risk, could blow up
      effects: { morale: 15, fitness: 20, pressure: -15, budget: 10 },
      chain: { any: 'chain_betting_exposed' },
      special: { pressureBomb: { value: 15 }, loseStreakPenalty: true },
    },
  },

  // ════════════════════════════════════════════
  // 💰 FEDERATION
  // ════════════════════════════════════════════

  {
    // Federation offers bonus money but wants a "recommended" player to start
    id: 'fed_bonus_offer',
    category: 'federation',
    weight: 8,
    conditions: { phase: 'groups' },
    choiceA: {
      // Accept money — budget boost but forced to play weaker player
      effects: { morale: 15, fitness: 5, pressure: -15, budget: 10 },
      special: { budgetJackpot: { value: 10 }, pressureBomb: { value: 10 }, concedeLate: { percent: 25 } },
    },
    choiceB: {
      // Reject — independence, team stronger
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { moraleExplosion: { value: 8 }, playerProtected: { player: 'star' } },
    },
  },
  {
    // Sponsor wants players at commercial event day before match
    id: 'fed_sponsor_clash',
    category: 'federation',
    weight: 7,
    choiceA: {
      // Give in — sponsor money but distraction/fatigue
      effects: { morale: -10, fitness: 15, pressure: 10, budget: -5 },
      special: { budgetJackpot: { value: 10 }, concedeLate: { percent: 25 } },
    },
    choiceB: {
      // Refuse — rested team, focus on football
      effects: { morale: 10, fitness: -10, pressure: -5, budget: -15 },
      special: { playerProtected: { player: 'star' }, comebackPower: true },
    },
  },
  {
    // Federation president comes to "motivate" — 2-hour speech
    id: 'fed_president_visit',
    category: 'federation',
    weight: 6,
    choiceA: {
      // Let him in — boring speech, wasted time, but budget favor
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { budgetJackpot: { value: 10 }, lowScoringMatch: true },
    },
    choiceB: {
      // Block him — players happy, president angry
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { moraleExplosion: { value: 8 }, comebackPower: true },
    },
  },
  {
    // Stadium changed to one 3 hours away
    id: 'fed_stadium_change',
    category: 'federation',
    weight: 5,
    conditions: { phaseNot: 'groups' },
    choiceA: {
      // Protest and demand compensation — money but stress
      effects: { morale: 10, fitness: 10, pressure: -15, budget: 15 },
      special: { comebackPower: true, pressureBomb: { value: 8 } },
    },
    choiceB: {
      // Accept it — energy drained from travel
      effects: { morale: 20, fitness: 10, pressure: -20, budget: 15 },
      special: { concedeLate: { percent: 30 }, opponentExtraGoal: { percent: 20 } },
    },
  },
  {
    // Federation offers U-21 youngster to replace injuries
    id: 'fed_youth_call',
    category: 'federation',
    weight: 6,
    choiceA: {
      // Call him up — raw talent, unpredictable
      effects: { morale: -15, fitness: 10, pressure: -5, budget: 10 },
      special: { extraGoalChance: { player: 'random', percent: 40 }, highScoringMatch: true, redCardRisk: { percent: 15, team: 'player' } },
    },
    choiceB: {
      // Decline — make do with current squad
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 3 } },
    },
  },

  // ════════════════════════════════════════════
  // ⚡ TACTICAL
  // ════════════════════════════════════════════

  {
    // Analyst prepared exhaustive video of opponent
    id: 'tactic_rival_analysis',
    category: 'tactical',
    weight: 10,
    choiceA: {
      // Video session — intel but tiring
      effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
      special: { revealOpponent: true, cleanSheet: { percent: 30 } },
    },
    choiceB: {
      // Rest, play free — fresh but unprepared
      effects: { morale: 15, fitness: -10, pressure: 10, budget: -5 },
      special: { highScoringMatch: true, comebackPower: true },
    },
  },
  {
    // Assistant wants last session all on set pieces
    id: 'tactic_set_piece_drill',
    category: 'tactical',
    weight: 9,
    choiceA: {
      // Set pieces — bonus from dead balls
      effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
      special: { penaltyGuaranteed: true, extraGoalChance: { player: 'random', percent: 35 } },
    },
    choiceB: {
      // Scrimmage — fun, relaxed, good vibes
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { comebackPower: true, moraleExplosion: { value: 5 } },
    },
  },
  {
    // Captain wants 3 at the back, you planned 4
    id: 'tactic_captain_disagrees',
    category: 'tactical',
    weight: 7,
    choiceA: {
      // Impose your decision — authority, your system
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { cleanSheet: { percent: 35 }, lowScoringMatch: true },
    },
    choiceB: {
      // Listen to captain — players empowered, different system
      effects: { morale: -10, fitness: 10, pressure: -15, budget: 5 },
      special: { highScoringMatch: true, comebackPower: true },
    },
  },
  {
    // Contact offers detailed intel on opponent for money
    id: 'tactic_spy_intel',
    category: 'tactical',
    weight: 12,
    choiceA: {
      // Pay the informant — expensive but reveals opponent
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
      special: { revealOpponent: true, cleanSheet: { percent: 25 } },
    },
    choiceB: {
      // Not worth it — save money, play your game
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Do-or-die knockout. Park the bus or attack?
    id: 'tactic_park_bus',
    category: 'tactical',
    weight: 8,
    conditions: { phaseNot: 'groups' },
    choiceA: {
      // Total defense — ultra-defensive, penalty likely
      effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
      special: { cleanSheet: { percent: 50 }, lowScoringMatch: true, penaltyGuaranteed: true },
    },
    choiceB: {
      // Attack — win playing well, open game
      effects: { morale: 10, fitness: -15, pressure: 5, budget: -10 },
      special: { highScoringMatch: true, extraGoalChance: { player: 'star', percent: 40 }, concedeLate: { percent: 25 } },
    },
  },

  // ════════════════════════════════════════════
  // 🌧️ WEATHER / PITCH
  // ════════════════════════════════════════════

  {
    // Torrential rain forecast
    id: 'weather_torrential',
    category: 'weather',
    weight: 7,
    choiceA: {
      // Train in the rain to adapt — prepared but exhausting
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { lowScoringMatch: true, cleanSheet: { percent: 25 } },
    },
    choiceB: {
      // Train indoors — not adapted, slippery pitch
      effects: { morale: 15, fitness: 15, pressure: -10, budget: 20 },
      special: { highScoringMatch: true, concedeLate: { percent: 30 }, injuryRisk: 0.2 },
    },
  },
  {
    // 42°C forecast
    id: 'weather_extreme_heat',
    category: 'weather',
    weight: 6,
    choiceA: {
      // Buy cooling equipment — prepared but expensive
      effects: { morale: -5, fitness: -10, pressure: 15, budget: 10 },
      special: { playerProtected: { player: 'star' }, comebackPower: true },
    },
    choiceB: {
      // Endure — save money, risk heat exhaustion
      effects: { morale: 20, fitness: 15, pressure: -15, budget: 10 },
      special: { concedeLate: { percent: 40 }, injuryRisk: 0.25 },
    },
  },
  {
    // Match at 2,500m altitude
    id: 'weather_altitude',
    category: 'weather',
    weight: 5,
    choiceA: {
      // Acclimatize — arrive early, prepare properly
      effects: { morale: 15, fitness: -5, pressure: -10, budget: -10 },
      special: { comebackPower: true, playerProtected: { player: 'star' } },
    },
    choiceB: {
      // Trust the squad — players will fight through
      effects: { morale: 25, fitness: 10, pressure: -10, budget: 15 },
      special: { concedeLate: { percent: 35 }, playerNerfed: { player: 'star' }, injuryRisk: 0.2 },
    },
  },

  // ════════════════════════════════════════════
  // 👤 PERSONAL
  // ════════════════════════════════════════════

  {
    // Key player homesick, considering leaving
    id: 'personal_homesick',
    category: 'personal',
    weight: 8,
    choiceA: {
      // Let him go — lose player, recover budget
      effects: { morale: -10, fitness: 15, pressure: 10, budget: -5 },
      special: { playerSuspended: { who: 'random', count: 1 }, budgetJackpot: { value: 5 } },
    },
    choiceB: {
      // Talk to him, convince him to stay — human connection
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { comebackPower: true, moraleExplosion: { value: 10 } },
    },
  },
  {
    // Right-back's wife just gave birth
    id: 'personal_baby_born',
    category: 'personal',
    weight: 5,
    choiceA: {
      // Let him go — team more united, one player misses match
      effects: { morale: 10, fitness: -10, pressure: -5, budget: -15 },
      special: { playerSuspended: { who: 'random', count: 1 }, moraleExplosion: { value: 10 } },
    },
    choiceB: {
      // Ask him to stay — keeps player but he's distracted
      effects: { morale: 15, fitness: 20, pressure: -15, budget: 10 },
      special: { playerNerfed: { player: 'star' }, concedeLate: { percent: 25 } },
    },
  },
  {
    // Veteran announces last tournament. Public tribute?
    id: 'personal_retirement_announce',
    category: 'personal',
    weight: 4,
    unique: true,
    choiceA: {
      // Public tribute — veteran motivated, emotional team, pressure from narrative
      effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
      special: { playerOnFire: { player: 'star' }, comebackPower: true, winStreakBonus: true },
    },
    choiceB: {
      // Keep private — no distractions, quiet focus
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 5 } },
    },
  },
  {
    // Goalkeeper's terrible haircut became worldwide meme
    id: 'personal_haircut_meme',
    category: 'personal',
    weight: 6,
    choiceA: {
      // Support him publicly — team bonds over humor, loose atmosphere
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { moraleExplosion: { value: 8 }, highScoringMatch: true },
    },
    choiceB: {
      // Do nothing — keeper may be shaky in goal
      effects: { morale: 20, fitness: 10, pressure: -20, budget: 15 },
      special: { concedeLate: { percent: 25 }, opponentExtraGoal: { percent: 20 } },
    },
  },

  // ════════════════════════════════════════════
  // 🎲 WILDCARD
  // ════════════════════════════════════════════

  {
    // Mascot escaped during training, team chasing it is trending
    id: 'wild_mascot_escape',
    category: 'wildcard',
    weight: 4,
    choiceA: {
      // Laugh — relaxed atmosphere, team bonding
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { moraleExplosion: { value: 8 }, highScoringMatch: true },
    },
    choiceB: {
      // Get angry — discipline, but kills the mood
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { lowScoringMatch: true, cleanSheet: { percent: 20 } },
    },
  },
  {
    // Team dancing video went viral, FIFA "recommends professionalism"
    id: 'wild_viral_video',
    category: 'wildcard',
    weight: 5,
    choiceA: {
      // Post another — double down on fun, team identity
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { moraleExplosion: { value: 10 }, comebackPower: true },
    },
    choiceB: {
      // Apologize and delete — damage control
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { lowScoringMatch: true, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Fan snuck into training, asked star for shirt
    id: 'wild_pitch_invader',
    category: 'wildcard',
    weight: 3,
    choiceA: {
      // Give him the shirt — heartwarming moment, star inspired
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { playerOnFire: { player: 'star' }, comebackPower: true },
    },
    choiceB: {
      // Tighten security — no distractions
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { playerProtected: { player: 'star' }, cleanSheet: { percent: 20 } },
    },
  },
  {
    // Team bus broke down on the way to stadium
    id: 'wild_bus_breakdown',
    category: 'wildcard',
    weight: 4,
    choiceA: {
      // Wait for repairs — late arrival, players stiff and cold
      effects: { morale: 15, fitness: 15, pressure: -10, budget: 20 },
      special: { concedeLate: { percent: 35 }, opponentExtraGoal: { percent: 20 } },
    },
    choiceB: {
      // Alternative transport — expensive but arrive on time
      effects: { morale: -15, fitness: 10, pressure: -5, budget: 10 },
      special: { playerProtected: { player: 'star' } },
    },
  },
  {
    // Fan cycled 3 months from your country to watch the team
    id: 'wild_superfan',
    category: 'wildcard',
    weight: 5,
    choiceA: {
      // Invite him — team inspired by dedication
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { moraleExplosion: { value: 10 }, comebackPower: true },
    },
    choiceB: {
      // Decline — no time for this
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Assigned referee was involved in controversy against your team 2 years ago
    id: 'wild_referee_controversy',
    category: 'wildcard',
    weight: 6,
    conditions: { phaseNot: 'groups' },
    choiceA: {
      // Challenge the referee — could get favorable calls or backlash
      effects: { morale: 15, fitness: -10, pressure: 10, budget: -5 },
      special: { penaltyGuaranteed: true, redCardRisk: { percent: 25, team: 'opponent' } },
    },
    choiceB: {
      // Accept — show class, mental strength
      effects: { morale: -10, fitness: 10, pressure: -15, budget: 5 },
      special: { comebackPower: true, playerProtected: { player: 'star' } },
    },
  },

  // ════════════════════════════════════════════
  // 🔗 CHAIN EVENTS
  // ════════════════════════════════════════════

  {
    // Promise kept! You promised and won. Fans adore you.
    id: 'chain_promise_kept',
    category: 'chain',
    weight: 0,
    choiceA: {
      // Public celebration — incredible morale, but partying risks
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { moraleExplosion: { value: 15 }, winStreakBonus: true, concedeLate: { percent: 25 } },
    },
    choiceB: {
      // Humility — grounded, focused on next match
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 5 } },
    },
  },
  {
    // Promise broken. Memes brutal. Face on every paper.
    id: 'chain_promise_broken',
    category: 'chain',
    weight: 0,
    choiceA: {
      // Face it — public accountability, may motivate or devastate
      effects: { morale: 20, fitness: 15, pressure: -15, budget: 10 },
      special: { moraleCrash: { value: -10 }, comebackPower: true, loseStreakPenalty: true },
    },
    choiceB: {
      // Avoid press — may get worse
      effects: { morale: 25, fitness: 10, pressure: -10, budget: 15 },
      special: { pressureBomb: { value: 15 }, concedeLate: { percent: 30 } },
    },
  },
  {
    // Betting case exposed. FIFA threatens disqualification.
    id: 'chain_betting_exposed',
    category: 'chain',
    weight: 0,
    unique: true,
    choiceA: {
      // Cooperate — lose player, show integrity
      effects: { morale: 10, fitness: -15, pressure: 5, budget: -10 },
      special: { playerSuspended: { who: 'random', count: 1 }, cleanSheet: { percent: 20 } },
    },
    choiceB: {
      // Resist — may get much worse
      effects: { morale: 15, fitness: 20, pressure: -15, budget: 10 },
      special: { pressureBomb: { value: 20 }, loseStreakPenalty: true },
    },
  },

  // ════════════════════════════════════════════
  // 🆕 DEEP GAMEPLAY EVENTS
  // ════════════════════════════════════════════

  {
    // Star wants extra training, physio warns of injury
    id: 'star_extra_training',
    category: 'tactical',
    weight: 12,
    choiceA: {
      // Allow extra — star sharper but injury risk
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { playerOnFire: { player: 'star' }, extraGoalChance: { player: 'star', percent: 40 }, injuryRisk: 0.25 },
    },
    choiceB: {
      // Mandatory rest — star protected
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 5 } },
    },
  },
  {
    // Federation president demands more attacking football
    id: 'federation_demands_offensive',
    category: 'federation',
    weight: 12,
    choiceA: {
      // Accept — play attacking, open game
      effects: { morale: -5, fitness: -10, pressure: 15, budget: 10 },
      special: { highScoringMatch: true, extraGoalChance: { player: 'random', percent: 35 }, concedeLate: { percent: 25 } },
    },
    choiceB: {
      // Refuse — "I decide" — authority, your system
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { cleanSheet: { percent: 25 }, playerProtected: { player: 'star' } },
    },
  },
  {
    // Two players clashed over bus seating. Tension is real.
    id: 'locker_room_conflict',
    category: 'scandal',
    weight: 12,
    choiceA: {
      // Punish both — lose a player, restore order
      effects: { morale: 20, fitness: 5, pressure: -10, budget: 10 },
      conflictPair: true,
      special: { playerSuspended: { who: 'random', count: 1 }, lowScoringMatch: true },
    },
    choiceB: {
      // Mediate with dinner — keep harmony
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { comebackPower: true, moraleExplosion: { value: 8 } },
    },
  },
  {
    // Assistant found opponent weakness. Needs extra video session.
    id: 'tactical_insight',
    category: 'tactical',
    weight: 12,
    choiceA: {
      // Video session — reveals opponent weakness
      effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
      special: { revealOpponent: true, cleanSheet: { percent: 30 } },
    },
    choiceB: {
      // Rest — improvise on the fly
      effects: { morale: 15, fitness: -5, pressure: -10, budget: -10 },
      special: { comebackPower: true, highScoringMatch: true },
    },
  },
  {
    // Medical team discovered new recovery method. Expensive.
    id: 'physio_breakthrough',
    category: 'camp',
    weight: 12,
    unique: true,
    choiceA: {
      // Invest in treatment — heal all injured, expensive
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      clearInjuries: true,
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 5 } },
    },
    choiceB: {
      // Keep usual protocol — save money
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Captain and young star both want the armband
    id: 'captain_armband_dispute',
    category: 'personal',
    weight: 12,
    choiceA: {
      // Give to veteran — stability, experience
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      conflictPair: true,
      special: { cleanSheet: { percent: 25 }, comebackPower: true },
    },
    choiceB: {
      // Give to young talent — energy, unpredictable
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      conflictPair: true,
      special: { extraGoalChance: { player: 'random', percent: 40 }, highScoringMatch: true },
    },
  },
  {
    // Substitute spectacular in training. Everyone talks about him.
    id: 'youth_prospect_emerges',
    category: 'camp',
    weight: 12,
    unique: true,
    choiceA: {
      // Announce him — put him in the squad, huge gamble
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      playerBuff: { target: 'randomBench', ratingMod: 15, duration: 99 },
      special: { extraGoalChance: { player: 'random', percent: 45 }, highScoringMatch: true },
    },
    choiceB: {
      // Keep it under wraps — controlled introduction
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      playerBuff: { target: 'randomBench', ratingMod: 5, duration: 3 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 4 } },
    },
  },

  // ── Rival/Opponent Impact ──

  {
    // Scout got detailed intel on opponent — risky if discovered
    id: 'scout_infiltration',
    category: 'tactical',
    weight: 12,
    choiceA: {
      // Use the intel — reveals opponent, controversy risk
      effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
      special: { revealOpponent: true, cleanSheet: { percent: 25 } },
    },
    choiceB: {
      // Reject it — fair play
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { moraleExplosion: { value: 5 }, comebackPower: true },
    },
  },
  {
    // Rival captain injured in training. Their best player.
    id: 'rival_captain_injury',
    category: 'wildcard',
    weight: 12,
    choiceA: {
      // Exploit the advantage — psychological edge
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      opponentDebuff: { type: 'injury', value: 5, duration: 1 },
      special: { extraGoalChance: { player: 'random', percent: 35 }, highScoringMatch: true },
    },
    choiceB: {
      // Show respect — "We wish them well" — class act
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { comebackPower: true, winStreakBonus: true },
    },
  },
  {
    // News of fights in rival dressing room. Their morale is rock bottom.
    id: 'rival_internal_drama',
    category: 'press',
    weight: 12,
    choiceA: {
      // Motivate: "They're weak" — psychological advantage
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      opponentDebuff: { type: 'morale', value: 4, duration: 1 },
      special: { extraGoalChance: { player: 'random', percent: 30 }, highScoringMatch: true },
    },
    choiceB: {
      // Don't get complacent — respect everyone
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
      special: { cleanSheet: { percent: 25 }, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Friendly coach proposes pact: both play reserves to save energy
    id: 'diplomatic_alliance',
    category: 'federation',
    weight: 12,
    unique: true,
    choiceA: {
      // Accept pact — save energy, see their tactics
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { revealOpponent: true, lowScoringMatch: true },
    },
    choiceB: {
      // Refuse — always play to win
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { comebackPower: true, moraleExplosion: { value: 8 } },
    },
  },
  {
    // Team in your group tested positive for doping
    id: 'rival_doping_scandal',
    category: 'scandal',
    weight: 12,
    unique: true,
    conditions: { phase: 'groups' },
    choiceA: {
      // Demand disqualification — controversial but benefits you
      effects: { morale: -10, fitness: 15, pressure: 10, budget: -5 },
      groupTableChange: 'dopingDisqualify',
      special: { pressureBomb: { value: 10 }, winStreakBonus: true },
    },
    choiceB: {
      // Stay neutral — "Let FIFA decide" — clean hands
      effects: { morale: 10, fitness: -10, pressure: -5, budget: -15 },
      special: { playerProtected: { player: 'star' }, comebackPower: true },
    },
  },
  {
    // Storm forces match to different stadium, poor pitch
    id: 'weather_disruption',
    category: 'weather',
    weight: 12,
    choiceA: {
      // Adapt tactics — play to conditions
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { lowScoringMatch: true, cleanSheet: { percent: 25 } },
    },
    choiceB: {
      // Protest — waste energy on politics
      effects: { morale: 15, fitness: 10, pressure: -15, budget: 5 },
      special: { highScoringMatch: true, concedeLate: { percent: 25 } },
    },
  },

  // ── World Events ──

  {
    // VAR controversy in another group match changed standings
    id: 'var_controversy',
    category: 'wildcard',
    weight: 12,
    conditions: { phase: 'groups' },
    choiceA: {
      // Protest — demand justice, emotional
      effects: { morale: -15, fitness: 10, pressure: -5, budget: 10 },
      special: { penaltyGuaranteed: true, pressureBomb: { value: 10 } },
    },
    choiceB: {
      // Accept rules — composed, focused
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Thousands of fans from your country traveled to the World Cup
    id: 'fan_invasion',
    category: 'wildcard',
    weight: 12,
    choiceA: {
      // Meet fans — incredible motivation
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { moraleExplosion: { value: 15 }, comebackPower: true },
    },
    choiceB: {
      // Keep distance — focus, no distractions
      effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
      special: { cleanSheet: { percent: 20 }, boostNextMatch: { team: true, rating: 4 } },
    },
  },
  {
    // TV demands match moved to noon for ratings — unbearably hot
    id: 'broadcast_pressure',
    category: 'federation',
    weight: 12,
    choiceA: {
      // Accept — budget from TV deal, but heat risk
      effects: { morale: 20, fitness: 10, pressure: -10, budget: 5 },
      special: { budgetJackpot: { value: 10 }, concedeLate: { percent: 30 }, injuryRisk: 0.15 },
    },
    choiceB: {
      // Refuse — protect players
      effects: { morale: 15, fitness: -10, pressure: 10, budget: -5 },
      special: { playerProtected: { player: 'star' } },
    },
  },
  {
    // Playing in city with large community from your country
    id: 'host_nation_boost',
    category: 'camp',
    weight: 12,
    choiceA: {
      // Enjoy the atmosphere — feels like home
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { moraleExplosion: { value: 10 }, comebackPower: true },
    },
    choiceB: {
      // Isolate — no distractions
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 4 } },
    },
  },
  {
    // Security alert at hotel and stadium
    id: 'security_threat',
    category: 'wildcard',
    weight: 12,
    choiceA: {
      // Maximum security — team calmer but restricted
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { lowScoringMatch: true, cleanSheet: { percent: 25 } },
    },
    choiceB: {
      // Maintain normality — pretend nothing happened, risky
      effects: { morale: 20, fitness: 10, pressure: -20, budget: 15 },
      special: { concedeLate: { percent: 30 }, opponentExtraGoal: { percent: 20 } },
    },
  },
  {
    // Venue changed to neutral stadium
    id: 'neutral_venue',
    category: 'weather',
    weight: 12,
    conditions: { phaseNot: 'groups' },
    choiceA: {
      // Formally protest — may get favorable ruling
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { penaltyGuaranteed: true, comebackPower: true },
    },
    choiceB: {
      // Accept and adapt — mental flexibility
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { highScoringMatch: true, boostNextMatch: { team: true, rating: 3 } },
    },
  },

  // ── Chain/Narrative Events ──

  {
    // Mysterious middleman offers bribe for "flexibility"
    id: 'bribe_offered',
    category: 'scandal',
    weight: 12,
    unique: true,
    choiceA: {
      // Accept — money and rigged ref, but soul sold
      effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
      chain: { any: 'chain_bribe_scandal' },
      special: { penaltyGuaranteed: true, budgetJackpot: { value: 15 } },
    },
    choiceB: {
      // Refuse — "Get out!" — integrity, team proud
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { moraleExplosion: { value: 15 }, comebackPower: true },
    },
  },
  {
    // Bribe discovered. Press front page. Career on a thread.
    id: 'chain_bribe_scandal',
    category: 'chain',
    weight: 0,
    choiceA: {
      // Confess — player suspended, devastating
      effects: { morale: 15, fitness: 15, pressure: -10, budget: 20 },
      special: { playerSuspended: { who: 'random', count: 1 }, moraleCrash: { value: -20 }, loseStreakPenalty: true },
    },
    choiceB: {
      // Deny — dig deeper, may get worse
      effects: { morale: 20, fitness: 15, pressure: -15, budget: 10 },
      special: { pressureBomb: { value: 20 }, opponentExtraGoal: { percent: 25 } },
    },
  },
  {
    // Influential journalist requests exclusive interview
    id: 'reject_interview',
    category: 'press',
    weight: 12,
    choiceA: {
      // Reject — may have consequences (vendetta)
      effects: { morale: 10, fitness: 15, pressure: -10, budget: 10 },
      chain: { any: 'chain_journalist_vendetta' },
      special: { pressureBomb: { value: 10 } },
    },
    choiceB: {
      // Accept — keep media onside, takes time
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Rejected journalist wrote devastating article. Sponsor threatens to pull out.
    id: 'chain_journalist_vendetta',
    category: 'chain',
    weight: 0,
    choiceA: {
      // Apologize — may fix it
      effects: { morale: 25, fitness: 10, pressure: -10, budget: 15 },
      special: { pressureBomb: { value: 10 }, concedeLate: { percent: 25 } },
    },
    choiceB: {
      // Ignore — may recur
      effects: { morale: 15, fitness: 20, pressure: -15, budget: 10 },
      special: { opponentExtraGoal: { percent: 20 }, pressureBomb: { value: 10 } },
    },
  },
  {
    // Players ask for day off. If you lose after, media will crucify you.
    id: 'day_off_given',
    category: 'camp',
    weight: 12,
    choiceA: {
      // Grant day off — rested but risky if you lose
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      chain: { lose: 'chain_day_off_aftermath' },
      special: { comebackPower: true, moraleExplosion: { value: 8 } },
    },
    choiceB: {
      // Deny — training continues, disciplined
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { cleanSheet: { percent: 25 }, lowScoringMatch: true },
    },
  },
  {
    // Lost after day off. "Holiday FC" memes trending.
    id: 'chain_day_off_aftermath',
    category: 'chain',
    weight: 0,
    choiceA: {
      // Own the mistake — accountability
      effects: { morale: 15, fitness: 5, pressure: -15, budget: 10 },
      special: { moraleCrash: { value: -10 }, comebackPower: true },
    },
    choiceB: {
      // Defend yourself — may continue
      effects: { morale: 20, fitness: 10, pressure: -20, budget: 15 },
      special: { pressureBomb: { value: 10 }, concedeLate: { percent: 30 } },
    },
  },
  {
    // In a moment of euphoria, promise to win on live TV
    id: 'promise_victory',
    category: 'press',
    weight: 12,
    choiceA: {
      // Stand by it — all in
      effects: { morale: -10, fitness: 10, pressure: -15, budget: 5 },
      chain: { win: 'chain_promise_kept_deep', lose: 'chain_promise_broken_deep' },
      special: { playerOnFire: { player: 'star' }, pressureBomb: { value: 10 }, winStreakBonus: true, loseStreakPenalty: true },
    },
    choiceB: {
      // Walk it back — "We'll do our best"
      effects: { morale: 10, fitness: -15, pressure: 5, budget: -10 },
      special: { lowScoringMatch: true, comebackPower: true },
    },
  },
  {
    // Promised and delivered! National hero.
    id: 'chain_promise_kept_deep',
    category: 'chain',
    weight: 0,
    choiceA: {
      // Celebrate — euphoria
      effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
      special: { moraleExplosion: { value: 15 }, winStreakBonus: true },
    },
    choiceB: {
      // Stay grounded — humble champion
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 5 } },
    },
  },
  {
    // Promised and lost. Memes brutal. Unbearable pressure.
    id: 'chain_promise_broken_deep',
    category: 'chain',
    weight: 0,
    choiceA: {
      // Face it — may motivate or devastate
      effects: { morale: 15, fitness: 15, pressure: -10, budget: 20 },
      special: { moraleCrash: { value: -15 }, comebackPower: true, loseStreakPenalty: true },
    },
    choiceB: {
      // Hide — things may get worse
      effects: { morale: 20, fitness: 15, pressure: -15, budget: 10 },
      conflictPair: true,
      special: { pressureBomb: { value: 15 }, concedeLate: { percent: 35 } },
    },
  },

  // ── Wildcard/Fun ──

  {
    // Team mascot broke during travel. Superstitious players worried.
    id: 'mascot_curse',
    category: 'wildcard',
    weight: 12,
    choiceA: {
      // Ignore superstition — rational but players uneasy
      effects: { morale: 25, fitness: 10, pressure: -10, budget: 15 },
      special: { concedeLate: { percent: 25 }, opponentExtraGoal: { percent: 20 } },
    },
    choiceB: {
      // Buy a new one — calm the superstitious, small cost
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { moraleExplosion: { value: 5 }, playerProtected: { player: 'star' } },
    },
  },
  {
    // Goal celebration went viral. 100M views. Sponsor wants to sign.
    id: 'viral_celebration',
    category: 'wildcard',
    weight: 12,
    choiceA: {
      // Accept sponsor deal — money but distraction
      effects: { morale: -5, fitness: -10, pressure: 15, budget: 10 },
      special: { budgetJackpot: { value: 10 }, pressureBomb: { value: 10 } },
    },
    choiceB: {
      // Refuse: "No circus" — focus
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 4 } },
    },
  },
  {
    // Player found old boots, swears they bring luck
    id: 'lucky_boots',
    category: 'wildcard',
    weight: 12,
    unique: true,
    choiceA: {
      // Allow it — player believes, plays with confidence
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { playerOnFire: { player: 'star' }, comebackPower: true },
    },
    choiceB: {
      // Forbid — wear sponsor's boots, player deflated
      effects: { morale: 15, fitness: -5, pressure: -10, budget: -10 },
      special: { playerNerfed: { player: 'star' }, cleanSheet: { percent: 20 } },
    },
  },
  {
    // Anonymous package with tactical dossier. Genius or sabotage?
    id: 'mystery_package',
    category: 'wildcard',
    weight: 12,
    choiceA: {
      // Open and use — could be brilliant intel or trap
      effects: { morale: -10, fitness: 15, pressure: 10, budget: -5 },
      special: { revealOpponent: true, opponentExtraGoal: { percent: 25 } },
    },
    choiceB: {
      // Destroy it — could be a trap, play safe
      effects: { morale: 10, fitness: -10, pressure: -5, budget: -15 },
      special: { playerProtected: { player: 'star' } },
    },
  },
  {
    // Stadium food made three players sick
    id: 'stadium_food_poisoning',
    category: 'camp',
    weight: 12,
    choiceA: {
      // Change diet and treat urgently — expensive
      effects: { morale: 15, fitness: 20, pressure: -15, budget: 10 },
      special: { playerNerfed: { player: 'star' }, concedeLate: { percent: 30 } },
    },
    choiceB: {
      // Minimize — hope it passes
      effects: { morale: 10, fitness: 10, pressure: -15, budget: 15 },
      special: { opponentExtraGoal: { percent: 25 }, lowScoringMatch: true },
    },
  },
  {
    // GK coach proposes special penalty session. Knockout stage.
    id: 'penalty_specialist',
    category: 'tactical',
    weight: 12,
    conditions: { phaseNot: 'groups' },
    choiceA: {
      // Penalty session — tiring but prepared for shootout
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      penaltyBonus: true,
      special: { penaltyGuaranteed: true },
    },
    choiceB: {
      // Normal session — don't jinx it
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 3 } },
    },
  },

  // ════════════════════════════════════════════
  // 🎙️ POST-MATCH PRESS CONFERENCES
  // ════════════════════════════════════════════

  {
    // After a win: fans want you to promise another victory
    id: 'postmatch_win_promise',
    category: 'press',
    weight: 0,
    isPostMatch: true,
    matchResult: 'win',
    choiceA: {
      // Promise again — riding high, but creating pressure
      effects: { morale: 20, fitness: 5, pressure: -10, budget: 10 },
      special: { playerOnFire: { player: 'star' }, pressureBomb: { value: 10 }, loseStreakPenalty: true },
    },
    choiceB: {
      // Stay humble — no pressure
      effects: { morale: -15, fitness: 10, pressure: -5, budget: 10 },
      special: { comebackPower: true, lowScoringMatch: true },
    },
  },
  {
    // After a win: players want to celebrate
    id: 'postmatch_win_celebrate',
    category: 'press',
    weight: 0,
    isPostMatch: true,
    matchResult: 'win',
    choiceA: {
      // Let them celebrate — morale through the roof, fitness drop
      effects: { morale: 15, fitness: -10, pressure: 10, budget: -5 },
      special: { moraleExplosion: { value: 15 }, concedeLate: { percent: 25 } },
    },
    choiceB: {
      // Back to work — disciplined, focused
      effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
      special: { cleanSheet: { percent: 25 }, boostNextMatch: { team: true, rating: 4 } },
    },
  },
  {
    // After a loss: media demands explanations
    id: 'postmatch_lose_blame',
    category: 'press',
    weight: 0,
    isPostMatch: true,
    matchResult: 'lose',
    choiceA: {
      // Blame players — shifts blame, players angry, but discipline
      effects: { morale: -10, fitness: 10, pressure: -15, budget: 5 },
      special: { moraleCrash: { value: -10 }, cleanSheet: { percent: 25 } },
    },
    choiceB: {
      // Take responsibility — team respects you, united
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { comebackPower: true, moraleExplosion: { value: 10 } },
    },
  },
  {
    // After a loss: journalist asks if you'll keep your job
    id: 'postmatch_lose_future',
    category: 'press',
    weight: 0,
    isPostMatch: true,
    matchResult: 'lose',
    choiceA: {
      // Defy: "We'll reach the final" — pressure bomb
      effects: { morale: 10, fitness: -15, pressure: 5, budget: -10 },
      special: { pressureBomb: { value: 15 }, playerOnFire: { player: 'star' } },
    },
    choiceB: {
      // Be realistic — honest, less pressure
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 4 } },
    },
  },
  {
    // After a draw: was it a good result?
    id: 'postmatch_draw_spin',
    category: 'press',
    weight: 0,
    isPostMatch: true,
    matchResult: 'draw',
    choiceA: {
      // Positive spin — "A valuable point" — team content
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 3 } },
    },
    choiceB: {
      // Negative: "We deserved more" — fires team up but adds pressure
      effects: { morale: -5, fitness: -10, pressure: 15, budget: 10 },
      special: { playerOnFire: { player: 'star' }, pressureBomb: { value: 5 } },
    },
  },
  {
    // After a draw: analyst criticizes your conservative approach
    id: 'postmatch_draw_tactics',
    category: 'press',
    weight: 0,
    isPostMatch: true,
    matchResult: 'draw',
    choiceA: {
      // Defend tactics — study shows you were right
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
      special: { revealOpponent: true, cleanSheet: { percent: 25 } },
    },
    choiceB: {
      // Admit and change — open to attacking next time
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { highScoringMatch: true, extraGoalChance: { player: 'random', percent: 30 } },
    },
  },

  // ════════════════════════════════════════════
  // 🔥 HISTORIC RIVALRIES
  // ════════════════════════════════════════════

  {
    // Argentina vs Brazil
    id: 'rivalry_arg_bra',
    category: 'press', weight: 0, isRivalry: true, rivalryPairs: [['argentina', 'brazil']],
    choiceA: {
      // Motivate with history — emotional, high-intensity match
      effects: { morale: 15, fitness: 10, pressure: -15, budget: 5 },
      special: { highScoringMatch: true, comebackPower: true, redCardRisk: { percent: 15, team: 'player' } },
    },
    choiceB: {
      // Calm the team — "Just another match"
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { cleanSheet: { percent: 25 }, lowScoringMatch: true },
    },
  },
  {
    // Spain vs France
    id: 'rivalry_esp_fra',
    category: 'press', weight: 0, isRivalry: true, rivalryPairs: [['spain', 'france']],
    choiceA: {
      // Respond to provocations — tactical battle heats up
      effects: { morale: 15, fitness: -5, pressure: -10, budget: -10 },
      special: { highScoringMatch: true, extraGoalChance: { player: 'random', percent: 35 }, redCardRisk: { percent: 15, team: 'player' } },
    },
    choiceB: {
      // Ignore noise — let quality speak
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { comebackPower: true, cleanSheet: { percent: 25 } },
    },
  },
  {
    // England vs Germany
    id: 'rivalry_eng_ger',
    category: 'press', weight: 0, isRivalry: true, rivalryPairs: [['england', 'germany']],
    choiceA: {
      // Use history — Wembley 1966, penalties, the weight of legacy
      effects: { morale: -10, fitness: 15, pressure: 10, budget: -5 },
      special: { penaltyGuaranteed: true, comebackPower: true, pressureBomb: { value: 10 } },
    },
    choiceB: {
      // Focus on the present — modern football, not history
      effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
      special: { cleanSheet: { percent: 25 }, boostNextMatch: { team: true, rating: 4 } },
    },
  },
  {
    // USA vs Mexico
    id: 'rivalry_usa_mex',
    category: 'press', weight: 0, isRivalry: true, rivalryPairs: [['usa', 'mexico']],
    choiceA: {
      // Fire up passion — continental pride
      effects: { morale: 10, fitness: -10, pressure: -5, budget: -15 },
      special: { highScoringMatch: true, moraleExplosion: { value: 10 }, redCardRisk: { percent: 15, team: 'opponent' } },
    },
    choiceB: {
      // Keep calm — professional
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { comebackPower: true, cleanSheet: { percent: 20 } },
    },
  },
  {
    // Japan vs South Korea
    id: 'rivalry_jpn_kor',
    category: 'press', weight: 0, isRivalry: true, rivalryPairs: [['japan', 'south_korea'], ['japan', 'korea_republic']],
    choiceA: {
      // Embrace the rivalry — emotional intensity
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { comebackPower: true, extraGoalChance: { player: 'random', percent: 35 } },
    },
    choiceB: {
      // Call for fair play — dignified
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { lowScoringMatch: true, cleanSheet: { percent: 25 } },
    },
  },
  {
    // Italy vs Spain
    id: 'rivalry_ita_esp',
    category: 'press', weight: 0, isRivalry: true, rivalryPairs: [['italy', 'spain']],
    choiceA: {
      // Remember Euro 2012 — tactical war, penalties likely
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { penaltyGuaranteed: true, comebackPower: true },
    },
    choiceB: {
      // Respect rival — "Italy is always tough"
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { cleanSheet: { percent: 25 }, lowScoringMatch: true },
    },
  },

  // ════════════════════════════════════════════
  // 📖 NARRATIVE-TRIGGERED EVENTS
  // ════════════════════════════════════════════

  {
    // Press hostility level 3 — media front against you
    id: 'narrative_press_enemy',
    category: 'press', weight: 0, isNarrative: true, narrativeCondition: { pressHostility: 3 },
    choiceA: {
      // Confront them — fight the press
      effects: { morale: 20, fitness: 10, pressure: -10, budget: 5 },
      special: { pressureBomb: { value: 15 }, comebackPower: true },
    },
    choiceB: {
      // Make peace — diffuse tension
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Player loyalty level 3 — players prepared thank-you video
    id: 'narrative_players_gift',
    category: 'camp', weight: 0, isNarrative: true, narrativeCondition: { playerLoyalty: 3 },
    choiceA: {
      // Get emotional — team bonds even deeper
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { moraleExplosion: { value: 15 }, comebackPower: true },
    },
    choiceB: {
      // Stay composed — professional but touching
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 4 } },
    },
  },
  {
    // Tactical reputation level 3 — praised as tactical genius
    id: 'narrative_tactical_genius',
    category: 'tactical', weight: 0, isNarrative: true, narrativeCondition: { tacticalReputation: 3 },
    choiceA: {
      // Accept recognition — confident, rivals fear you
      effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
      special: { revealOpponent: true, winStreakBonus: true },
    },
    choiceB: {
      // Humility: "Credit goes to the team" — grounded
      effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
      special: { moraleExplosion: { value: 8 }, boostNextMatch: { team: true, rating: 4 } },
    },
  },
  {
    // Press hostility level 5 — total media war, editorials demand resignation
    id: 'narrative_press_war',
    category: 'press', weight: 0, isNarrative: true, narrativeCondition: { pressHostility: 5 },
    choiceA: {
      // Apologize — swallow pride, reduce heat
      effects: { morale: 10, fitness: 15, pressure: -10, budget: 10 },
      special: { lowScoringMatch: true, concedeLate: { percent: 25 } },
    },
    choiceB: {
      // Stand firm — may get worse but shows character
      effects: { morale: 15, fitness: 5, pressure: -15, budget: 10 },
      special: { pressureBomb: { value: 15 }, comebackPower: true },
    },
  },
  {
    // Player loyalty level 5 — extraordinary unity, players fight like brothers
    id: 'narrative_team_unity',
    category: 'camp', weight: 0, isNarrative: true, narrativeCondition: { playerLoyalty: 5 },
    choiceA: {
      // Channel the energy — incredible team spirit
      effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
      special: { moraleExplosion: { value: 20 }, comebackPower: true, winStreakBonus: true },
    },
    choiceB: {
      // Enjoy the moment — maintain the bond
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { playerProtected: { player: 'star' }, cleanSheet: { percent: 30 } },
    },
  },
  {
    // Tactical reputation level 5 — last win was a masterpiece
    id: 'narrative_masterclass',
    category: 'tactical', weight: 0, isNarrative: true, narrativeCondition: { tacticalReputation: 5 },
    choiceA: {
      // Give a tactical talk — share your vision, inspire
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
      special: { revealOpponent: true, extraGoalChance: { player: 'star', percent: 45 }, winStreakBonus: true },
    },
    choiceB: {
      // Deflect attention — team effort
      effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
      special: { cleanSheet: { percent: 35 }, boostNextMatch: { team: true, rating: 5 } },
    },
  },

  // ════════════════════════════════════════════
  // ⭐ STAR PLAYER EVENTS
  // ════════════════════════════════════════════

  {
    // Star player injury scare in training
    id: 'personal_star_injury_scare',
    category: 'personal', weight: 0, isStarPlayer: true,
    choiceA: {
      // Protect him — doesn't play, recovery
      effects: { morale: -15, fitness: 10, pressure: -5, budget: 10 },
      special: { playerSuspended: { who: 'star', count: 1 }, boostNextMatch: { team: true, rating: 8 } },
    },
    choiceB: {
      // Let him play — risk but heart of a lion
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { playerOnFire: { player: 'star' }, injuryRisk: 0.35, extraGoalChance: { player: 'star', percent: 45 } },
    },
  },
  {
    // Star player's agent demands special bonus or threatens to leak discontent
    id: 'personal_star_contract',
    category: 'personal', weight: 0, isStarPlayer: true,
    choiceA: {
      // Give in to demands — star happy, expensive
      effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
      special: { playerOnFire: { player: 'star' }, extraGoalChance: { player: 'star', percent: 35 } },
    },
    choiceB: {
      // Hold the line: "I'm in charge" — risk discontent leak
      effects: { morale: 10, fitness: 10, pressure: -15, budget: 15 },
      special: { pressureBomb: { value: 10 }, comebackPower: true },
    },
  },
  {
    // Captain fierce argument with another player
    id: 'personal_captain_fight',
    category: 'personal', weight: 0, isStarPlayer: true,
    choiceA: {
      // Back the captain — discipline, but other player threatens not to play
      effects: { morale: 15, fitness: -10, pressure: 10, budget: -5 },
      special: { blockPlayer: { duration: 1, who: 'random' }, cleanSheet: { percent: 20 }, comebackPower: true },
    },
    choiceB: {
      // Mediate — keep both, fragile peace
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { moraleExplosion: { value: 5 }, playerProtected: { player: 'star' } },
    },
  },
  {
    // Star gathers team and gives incredible speech: "Let's make history"
    id: 'star_inspiration',
    category: 'camp', weight: 0, isStarPlayer: true,
    choiceA: {
      // Let him lead — star's charisma drives the team
      effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
      special: { playerOnFire: { player: 'star' }, comebackPower: true, moraleExplosion: { value: 10 } },
    },
    choiceB: {
      // Take charge: "Thanks, but I lead" — authority
      effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
      special: { cleanSheet: { percent: 25 }, boostNextMatch: { team: true, rating: 4 } },
    },
  },
  {
    // Star scored wondergoal. Every show replays it. Nation goes wild.
    id: 'star_incredible_goal',
    category: 'wildcard', weight: 0, isStarPlayer: true, isPostMatch: true, matchResult: 'win',
    choiceA: {
      // Give him all the glory — star ego boost, pressure on him
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { playerOnFire: { player: 'star' }, extraGoalChance: { player: 'star', percent: 45 }, pressureBomb: { value: 10 } },
    },
    choiceB: {
      // Share credit: "Team effort" — balanced, everyone happy
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
      special: { moraleExplosion: { value: 10 }, comebackPower: true, boostNextMatch: { team: true, rating: 5 } },
    },
  },

  // ════════════════════════════════════════════
  // 🆕 ADDITIONAL EVENTS (v2 with match modifiers)
  // ════════════════════════════════════════════

  {
    // Sponsor demands TV appearance. "It's in the contract."
    id: 'press_sponsor_interview',
    category: 'press', weight: 9,
    choiceA: {
      // Accept — money but exhausting distraction
      effects: { morale: -10, fitness: 10, pressure: -15, budget: 5 },
      special: { budgetJackpot: { value: 10 }, concedeLate: { percent: 25 } },
    },
    choiceB: {
      // Refuse — total media blackout, no distractions
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      mediaBlackout: { pressureFreeze: 2 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Tabloid accuses team of match-fixing. No evidence.
    id: 'press_conspiracy_theory',
    category: 'press', weight: 7,
    choiceA: {
      // Publicly deny — draws attention, adds pressure
      effects: { morale: 20, fitness: 5, pressure: -10, budget: 10 },
      special: { pressureBomb: { value: 10 }, comebackPower: true },
    },
    choiceB: {
      // Ignore — let it blow over, but rumor may cost a player
      effects: { morale: 20, fitness: 10, pressure: -20, budget: 15 },
      special: { concedeLate: { percent: 20 }, opponentExtraGoal: { percent: 15 } },
    },
  },
  {
    // Press reports star plans to retire from international duty after WC
    id: 'press_retirement_rumor',
    category: 'press', weight: 6,
    choiceA: {
      // Confirm — "It's his decision" — fans revolt, some players want to win FOR him
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      fanRevolt: true,
      special: { comebackPower: true, moraleExplosion: { value: 5 } },
    },
    choiceB: {
      // Deny — "He's not retiring" — star motivated to prove it
      effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
      special: { playerOnFire: { player: 'star' }, extraGoalChance: { player: 'star', percent: 35 } },
    },
  },
  {
    // Assistant devised revolutionary set piece routine. Never tested.
    id: 'camp_secret_weapon',
    category: 'camp', weight: 9,
    choiceA: {
      // Try it — genius or disaster
      effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
      special: { extraGoalChance: { player: 'random', percent: 45 }, penaltyGuaranteed: true },
    },
    choiceB: {
      // Stick to what works — reliable
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Two players threw punches during training
    id: 'camp_player_fight',
    category: 'camp', weight: 8,
    choiceA: {
      // Punish aggressor — suspended, discipline
      effects: { morale: 10, fitness: -15, pressure: 5, budget: -10 },
      special: { playerSuspended: { who: 'random', count: 1 }, lowScoringMatch: true, cleanSheet: { percent: 20 } },
    },
    choiceB: {
      // Mediate — keep both, risky
      effects: { morale: 15, fitness: 15, pressure: -10, budget: 20 },
      conflictPair: true,
      special: { redCardRisk: { percent: 20, team: 'player' }, concedeLate: { percent: 25 } },
    },
  },
  {
    // Night before biggest match. Strict lockdown or let players unwind?
    id: 'camp_night_before',
    category: 'camp', weight: 8,
    choiceA: {
      // Strict curfew — focused, disciplined
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { cleanSheet: { percent: 25 }, lowScoringMatch: true },
    },
    choiceB: {
      // Let them relax — trust, loose atmosphere
      effects: { morale: -5, fitness: -10, pressure: 15, budget: 10 },
      special: { highScoringMatch: true, comebackPower: true },
    },
  },
  {
    // Player's massive contract leaked. Teammates discover he earns triple.
    id: 'scandal_leaked_contract',
    category: 'scandal', weight: 6,
    choiceA: {
      // Let squad handle it — resentment but honest
      effects: { morale: 20, fitness: 15, pressure: -15, budget: 10 },
      special: { moraleCrash: { value: -8 }, redCardRisk: { percent: 15, team: 'player' } },
    },
    choiceB: {
      // Media spin — "Everyone is valued"
      effects: { morale: 25, fitness: 10, pressure: -10, budget: 15 },
      special: { pressureBomb: { value: 8 }, concedeLate: { percent: 25 } },
    },
  },
  {
    // Media reports star striker injured (false). Rival preparing without him.
    id: 'scandal_fake_news',
    category: 'scandal', weight: 7,
    choiceA: {
      // Correct the info — honest, lose tactical advantage
      effects: { morale: 15, fitness: -5, pressure: -10, budget: -10 },
      special: { playerProtected: { player: 'star' } },
    },
    choiceB: {
      // Exploit it — rival prepares for wrong lineup
      effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
      special: { revealOpponent: true, extraGoalChance: { player: 'star', percent: 30 } },
    },
  },
  {
    // Shady middleman offers to "fix" the referee. No cards for your team.
    id: 'scandal_referee_bribe',
    category: 'scandal', weight: 4, unique: true,
    choiceA: {
      // Accept — rigged ref, but corruption
      effects: { morale: -10, fitness: 15, pressure: 10, budget: -5 },
      special: { penaltyGuaranteed: true, redCardRisk: { percent: 30, team: 'opponent' } },
    },
    choiceB: {
      // Report — fair football, team proud
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { moraleExplosion: { value: 12 }, comebackPower: true },
    },
  },
  {
    // FIFA wants to audit your accounts
    id: 'fed_budget_audit',
    category: 'federation', weight: 7,
    choiceA: {
      // Clean the books — transparent, costs money
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { boostNextMatch: { team: true, rating: 3 } },
    },
    choiceB: {
      // Hide spending — risky, may blow up
      effects: { morale: 15, fitness: 20, pressure: -15, budget: 10 },
      budgetCrisis: true,
      special: { pressureBomb: { value: 10 }, loseStreakPenalty: true },
    },
  },
  {
    // FIFA demands you rest certain players due to match overload
    id: 'fed_forced_rotation',
    category: 'federation', weight: 7,
    choiceA: {
      // Comply — forced rotation but team rested after
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 5 } },
    },
    choiceB: {
      // Ignore — "My team, my rules" — risk sanctions
      effects: { morale: 20, fitness: 10, pressure: -20, budget: 15 },
      special: { pressureBomb: { value: 15 }, injuryRisk: 0.15 },
    },
  },
  {
    // FIFA offers advance prize money with conditions
    id: 'fed_prize_money',
    category: 'federation', weight: 8,
    choiceA: {
      // Take the advance — big cash, strings attached
      effects: { morale: 10, fitness: -10, pressure: -5, budget: -15 },
      special: { budgetJackpot: { value: 15 }, pressureBomb: { value: 10 } },
    },
    choiceB: {
      // Wait — no strings
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Analyst wants video session until midnight
    id: 'tactic_film_study',
    category: 'tactical', weight: 9,
    choiceA: {
      // Study — reveals opponent weakness, but tiring
      effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
      special: { revealOpponent: true, cleanSheet: { percent: 30 } },
    },
    choiceB: {
      // Rest — arrive fresh
      effects: { morale: -15, fitness: 10, pressure: -5, budget: 10 },
      special: { comebackPower: true, highScoringMatch: true },
    },
  },
  {
    // Knockout stage. Dedicate last session to penalties?
    id: 'tactic_penalty_practice',
    category: 'tactical', weight: 8, conditions: { phaseNot: 'groups' },
    choiceA: {
      // Practice penalties — prepared for shootout
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      penaltyBonus: 20,
      special: { penaltyGuaranteed: true },
    },
    choiceB: {
      // Normal session — don't think about pens
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Assistant proposes ultra-defensive plan
    id: 'tactic_defensive_masterclass',
    category: 'tactical', weight: 8,
    choiceA: {
      // Impenetrable defense — total lockdown
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { cleanSheet: { percent: 45 }, lowScoringMatch: true },
    },
    choiceB: {
      // Attack — win with goals
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { highScoringMatch: true, extraGoalChance: { player: 'random', percent: 35 } },
    },
  },
  {
    // Storm cancelled training. Day off or gym?
    id: 'weather_cancelled_training',
    category: 'weather', weight: 7,
    choiceA: {
      // Rest day — team fresher, morale boost
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { comebackPower: true, moraleExplosion: { value: 5 } },
    },
    choiceB: {
      // Gym session — maintain fitness
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
      special: { cleanSheet: { percent: 15 }, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Starter gets call: family member in hospital
    id: 'personal_family_emergency',
    category: 'personal', weight: 6,
    choiceA: {
      // Let him go — "Family first" — team respects you, lose player
      effects: { morale: 15, fitness: -10, pressure: 10, budget: -5 },
      special: { playerSuspended: { who: 'random', count: 1 }, moraleExplosion: { value: 12 } },
    },
    choiceB: {
      // Ask him to stay — keep player but he's devastated
      effects: { morale: 15, fitness: 15, pressure: -10, budget: 20 },
      special: { playerNerfed: { player: 'star' }, concedeLate: { percent: 25 } },
    },
  },
  {
    // Ban social media for rest of tournament?
    id: 'personal_social_media_ban',
    category: 'personal', weight: 7,
    choiceA: {
      // Ban — total focus, young players unhappy
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      mediaBlackout: { pressureFreeze: 2 },
      special: { cleanSheet: { percent: 20 }, lowScoringMatch: true },
    },
    choiceB: {
      // Allow — freedom but distractions continue
      effects: { morale: 15, fitness: 10, pressure: -15, budget: 5 },
      special: { pressureBomb: { value: 8 }, highScoringMatch: true },
    },
  },
  {
    // Scout swears he saw rival star at casino at 3AM
    id: 'wild_doppelganger',
    category: 'wildcard', weight: 5,
    choiceA: {
      // Report it — weakens rival if true
      effects: { morale: -10, fitness: 10, pressure: -15, budget: 5 },
      special: { revealOpponent: true, opponentExtraGoal: { percent: 15 } },
    },
    choiceB: {
      // Ignore — could be fake
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Stadium lights go out during warmup. Chaos.
    id: 'wild_stadium_blackout',
    category: 'wildcard', weight: 5,
    choiceA: {
      // Wait patiently — focused, calm
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { lowScoringMatch: true, cleanSheet: { percent: 20 } },
    },
    choiceB: {
      // Use the chaos to motivate — "This is a sign!"
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { moraleExplosion: { value: 10 }, comebackPower: true },
    },
  },
  {
    // Local fortune teller: "Your next decision will have double the impact"
    id: 'wild_fortune_teller',
    category: 'wildcard', weight: 4,
    choiceA: {
      // Listen — big unpredictable swing
      effects: { morale: 10, fitness: -15, pressure: 5, budget: -10 },
      special: { moraleSwing: { min: -15, max: 20 }, highScoringMatch: true },
    },
    choiceB: {
      // Ignore — no superstitions, steady
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Players want lucky ritual (war cry). Press will film.
    id: 'wild_superstition',
    category: 'wildcard', weight: 5,
    choiceA: {
      // Allow — collective energy, viral moment
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { comebackPower: true, moraleExplosion: { value: 8 } },
    },
    choiceB: {
      // Forbid — serious professionals
      effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
      special: { cleanSheet: { percent: 15 }, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Legendary ex-coach offers to consult. Unconventional methods.
    id: 'wild_mysterious_coach',
    category: 'wildcard', weight: 4, unique: true,
    choiceA: {
      // Accept help — brilliant but risky methods
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { revealOpponent: true, extraGoalChance: { player: 'star', percent: 40 }, injuryRisk: 0.15 },
    },
    choiceB: {
      // Refuse — "I'm in charge" — independence
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 4 } },
    },
  },

  // ── SCANDAL (v2) ──

  {
    // Star injured in routine training. Can play with risk or rest.
    id: 'scandal_star_injured',
    category: 'scandal', weight: 6,
    choiceA: {
      // Rest him — out for 2 matches, comes back strong
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      starInjured: { duration: 2 },
      special: { boostNextMatch: { team: true, rating: 8 } },
    },
    choiceB: {
      // Play him — risk but available now
      effects: { morale: -5, fitness: -10, pressure: 15, budget: 10 },
      starInjured: { duration: 1 },
      special: { playerOnFire: { player: 'star' }, injuryRisk: 0.3 },
    },
  },
  {
    // Coordinated media campaign against you
    id: 'scandal_pressure_surge',
    category: 'scandal', weight: 6,
    choiceA: {
      // Face it — "I don't hide"
      effects: { morale: 20, fitness: 10, pressure: -10, budget: 5 },
      special: { pressureBomb: { value: 10 }, comebackPower: true },
    },
    choiceB: {
      // Seek allies in federation — political maneuvering
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { boostNextMatch: { team: true, rating: 3 }, lowScoringMatch: true },
    },
  },
  {
    // Main sponsor threatens to pull out. Budget crashing.
    id: 'scandal_budget_crisis',
    category: 'federation', weight: 5,
    choiceA: {
      // Accept humiliating conditions — money but at what cost
      effects: { morale: 20, fitness: 15, pressure: -15, budget: 10 },
      special: { pressureBomb: { value: 10 }, concedeLate: { percent: 25 } },
    },
    choiceB: {
      // Find alternatives, cut spending — lean but independent
      effects: { morale: 15, fitness: -5, pressure: -10, budget: -10 },
      special: { comebackPower: true, playerProtected: { player: 'star' } },
    },
  },
  {
    // Game plan appeared on Telegram. Rival knows everything.
    id: 'scandal_tactics_leaked_v2',
    category: 'tactical', weight: 6,
    choiceA: {
      // Keep plan — trust execution despite leak
      effects: { morale: 10, fitness: 15, pressure: -10, budget: 10 },
      special: { opponentExtraGoal: { percent: 30 }, playerProtected: { player: 'star' } },
    },
    choiceB: {
      // Switch to new formation — surprise element
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { unlockFormation: true, extraGoalChance: { player: 'random', percent: 30 } },
    },
  },

  // ── CHAIN ──

  {
    // FIFA investigation into referee bribe. Evidence points at you.
    id: 'chain_bribe_aftermath',
    category: 'chain', weight: 0,
    choiceA: {
      // Cover up — destroy evidence, player takes fall
      effects: { morale: 25, fitness: 10, pressure: -10, budget: 15 },
      special: { playerSuspended: { who: 'random', count: 1 }, pressureBomb: { value: 10 } },
    },
    choiceB: {
      // Confess — "I made a mistake" — devastating but clean
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { comebackPower: true, moraleExplosion: { value: 8 } },
    },
  },

  // ════════════════════════════════════════════
  // 🎭 REMAINING EVENTS (v2)
  // ════════════════════════════════════════════

  {
    // Assistant found tactical exploit in rival's system
    id: 'tactic_formation_discovery',
    category: 'tactical', weight: 8,
    choiceA: {
      // Try new tactic — redo training, surprise element
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { unlockFormation: true, extraGoalChance: { player: 'random', percent: 30 } },
    },
    choiceB: {
      // Don't change what works — reliable
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // 11PM. Analyst has complete dossier on opponent. Team needs sleep.
    id: 'tactic_video_analysis',
    category: 'tactical', weight: 9,
    choiceA: {
      // All-night video — reveals opponent, exhausting
      effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
      special: { revealOpponent: true, cleanSheet: { percent: 25 } },
    },
    choiceB: {
      // Rest — fresh for the match
      effects: { morale: -10, fitness: 15, pressure: 10, budget: -5 },
      special: { comebackPower: true, highScoringMatch: true },
    },
  },
  {
    // Renowned set-piece specialist offers intensive session. Expensive.
    id: 'tactic_set_piece_specialist',
    category: 'tactical', weight: 7,
    choiceA: {
      // Hire specialist — dead-ball advantage
      effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
      special: { penaltyGuaranteed: true, extraGoalChance: { player: 'random', percent: 30 } },
    },
    choiceB: {
      // Not worth it — save budget
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Investigative journalist leaked your game plan to press
    id: 'scandal_leaked_tactics',
    category: 'scandal', weight: 7,
    choiceA: {
      // Change entire plan — surprise but chaos
      effects: { morale: 10, fitness: -10, pressure: -5, budget: -15 },
      special: { extraGoalChance: { player: 'random', percent: 35 }, redCardRisk: { percent: 15, team: 'player' } },
    },
    choiceB: {
      // Keep original plan — trust your system
      effects: { morale: 15, fitness: 5, pressure: -15, budget: 10 },
      special: { opponentExtraGoal: { percent: 25 }, playerProtected: { player: 'star' } },
    },
  },
  {
    // Anti-doping agency flagged player for "anomaly"
    id: 'scandal_doping_accusation',
    category: 'scandal', weight: 5,
    choiceA: {
      // Suspend preventively — lose player, show integrity
      effects: { morale: -15, fitness: 10, pressure: -5, budget: 10 },
      special: { playerSuspended: { who: 'random', count: 1 }, boostNextMatch: { team: true, rating: 3 } },
    },
    choiceB: {
      // Defend innocence publicly — expensive legal battle
      effects: { morale: 10, fitness: 10, pressure: -15, budget: 15 },
      special: { playerProtected: { player: 'star' }, pressureBomb: { value: 8 } },
    },
  },
  {
    // Hotel cameras catch players leaving at 3AM. Training is disaster next day.
    id: 'scandal_party_night',
    category: 'scandal', weight: 6,
    choiceA: {
      // Exemplary punishment — fine + double training
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { lowScoringMatch: true, cleanSheet: { percent: 20 } },
    },
    choiceB: {
      // Turn a blind eye — happy players, undisciplined
      effects: { morale: 20, fitness: 5, pressure: -10, budget: 10 },
      special: { highScoringMatch: true, concedeLate: { percent: 35 } },
    },
  },
  {
    // Federation offers extra budget with conditions (pressure if you don't win)
    id: 'federation_stadium_upgrade',
    category: 'federation', weight: 7,
    choiceA: {
      // Accept — money with strings
      effects: { morale: 15, fitness: -10, pressure: 10, budget: -5 },
      special: { budgetJackpot: { value: 10 }, pressureBomb: { value: 10 } },
    },
    choiceB: {
      // Reject — no extra pressure
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { comebackPower: true, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Federation asks for charity friendly before big match
    id: 'federation_friendly_request',
    category: 'federation', weight: 6,
    choiceA: {
      // Play friendly — tiring but can spy on rival next door
      effects: { morale: -10, fitness: 10, pressure: -15, budget: 5 },
      special: { revealOpponent: true, injuryRisk: 0.15 },
    },
    choiceB: {
      // Refuse — focus on the real match
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 4 } },
    },
  },
  {
    // 43°C forecast. Train in sun to acclimatize?
    id: 'weather_heatwave',
    category: 'weather', weight: 7,
    choiceA: {
      // Acclimatization training — brutal but prepared
      effects: { morale: 10, fitness: -15, pressure: 5, budget: -10 },
      special: { playerProtected: { player: 'star' }, comebackPower: true },
    },
    choiceB: {
      // Train indoors with AC — comfortable but unprepared
      effects: { morale: 15, fitness: 20, pressure: -15, budget: 10 },
      special: { concedeLate: { percent: 30 }, injuryRisk: 0.2 },
    },
  },
  {
    // Pitch in terrible condition. Muddy, uneven.
    id: 'weather_bad_pitch',
    category: 'weather', weight: 6,
    choiceA: {
      // Adapt training — practice on bad pitch
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { lowScoringMatch: true, cleanSheet: { percent: 20 } },
    },
    choiceB: {
      // Complain to FIFA — may get pitch fixed
      effects: { morale: 15, fitness: 10, pressure: -15, budget: 5 },
      special: { highScoringMatch: true, concedeLate: { percent: 25 } },
    },
  },
  {
    // Key player's personal rival is on the opposing team
    id: 'personal_rival_matchup',
    category: 'personal', weight: 7,
    choiceA: {
      // Fuel the rivalry — extra motivation
      effects: { morale: -5, fitness: -10, pressure: 15, budget: 10 },
      special: { playerOnFire: { player: 'star' }, redCardRisk: { percent: 15, team: 'player' } },
    },
    choiceB: {
      // Calm him down — composed, disciplined
      effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
      special: { cleanSheet: { percent: 20 }, lowScoringMatch: true },
    },
  },
  {
    // Star player dedicates next match to sick child fan
    id: 'personal_fan_dedication',
    category: 'personal', weight: 6,
    choiceA: {
      // Support publicly — emotional, whole team motivated
      effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
      special: { moraleExplosion: { value: 12 }, comebackPower: true },
    },
    choiceB: {
      // Keep it private — "Focus on football"
      effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
      special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Ghost of past tournament failure haunts the team
    id: 'wild_tournament_ghost',
    category: 'wildcard', weight: 6,
    choiceA: {
      // Confront it — watch the old match, learn from it
      effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
      special: { comebackPower: true, revealOpponent: true },
    },
    choiceB: {
      // Ignore — "This is a new team"
      effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
      special: { boostNextMatch: { team: true, rating: 3 } },
    },
  },
  {
    // Celebrity visits camp. Huge distraction or morale boost?
    id: 'wild_celebrity_visit',
    category: 'wildcard', weight: 5,
    choiceA: {
      // Welcome them — amazing team spirit
      effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
      special: { moraleExplosion: { value: 10 }, highScoringMatch: true },
    },
    choiceB: {
      // Politely decline — no distractions
      effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
      special: { cleanSheet: { percent: 15 }, boostNextMatch: { team: true, rating: 3 } },
    },
  },
];

// ═══════════════════════════════════════════════
// Engine helpers — DO NOT MODIFY without testing
// ═══════════════════════════════════════════════

const seenEvents = new Set();
const activeChains = [];

/** Pick a weighted-random event that hasn't been seen (unless repeatable) */
export function pickEvent(state = {}) {
  const phase = state.phase || 'groups';
  const eligible = WORLD_CUP_EVENTS.filter((e) => {
    if (e.weight === 0) return false;
    if (e.unique && seenEvents.has(e.id)) return false;
    if (e.isPostMatch || e.isRivalry || e.isNarrative || e.isStarPlayer) return false;
    if (e.conditions) {
      if (e.conditions.phase && e.conditions.phase !== phase) return false;
      if (e.conditions.phaseNot && e.conditions.phaseNot === phase) return false;
    }
    return true;
  });
  if (eligible.length === 0) return null;
  const totalWeight = eligible.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const e of eligible) {
    r -= e.weight;
    if (r <= 0) {
      seenEvents.add(e.id);
      return e;
    }
  }
  return eligible[eligible.length - 1];
}

/** Apply a choice object to state and return new state */
export function applyChoice(state, choice) {
  if (!choice) return state;
  const ns = { ...state };

  // Apply resource effects
  if (choice.effects) {
    const eff = choice.effects;
    if (eff.morale !== undefined) ns.morale = Math.max(0, Math.min(100, (ns.morale || 60) + eff.morale));
    if (eff.fitness !== undefined) ns.fitness = Math.max(0, Math.min(100, (ns.fitness || 60) + eff.fitness));
    if (eff.pressure !== undefined) ns.pressure = Math.max(0, Math.min(100, (ns.pressure || 30) + eff.pressure));
    if (eff.budget !== undefined) ns.budget = Math.max(0, Math.min(100, (ns.budget || 50) + eff.budget));
  }

  // Apply special effects
  if (choice.special) {
    const sp = choice.special;

    if (sp.opponentRevealed) ns.opponentRevealed = true;
    if (sp.boostNextMatch) ns.nextMatchBoost = sp.boostNextMatch;
    if (sp.injuryRisk) ns.nextMatchInjuryRisk = sp.injuryRisk;
    if (sp.riskRecurrence) ns.riskRecurrence = sp.riskRecurrence;

    if (sp.blockPlayer) {
      const available = (ns.playerSquad || []).filter(p => p.name !== ns.starPlayer);
      if (available.length > 0 && sp.blockPlayer.who === 'random') {
        const blocked = available[Math.floor(Math.random() * available.length)];
        ns.suspendedPlayers = [...(ns.suspendedPlayers || []), blocked.name];
      }
      if (sp.blockPlayer.who === 'star' && ns.starPlayer) {
        ns.suspendedPlayers = [...(ns.suspendedPlayers || []), ns.starPlayer];
      }
    }

    if (sp.moraleSwing) {
      const swing = sp.moraleSwing.min + Math.random() * (sp.moraleSwing.max - sp.moraleSwing.min);
      ns.morale = Math.max(0, Math.min(100, (ns.morale || 60) + Math.round(swing)));
    }

    if (sp.matchBonus) ns.currentMatchBonus = (ns.currentMatchBonus || 0) + sp.matchBonus;

    if (sp.unlockFormation) {
      const ALL_FORMATIONS = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '4-1-4-1', '5-3-2', '3-4-3'];
      const locked = ALL_FORMATIONS.filter(f => !(ns.unlockedFormations || []).includes(f));
      if (locked.length > 0) {
        ns.unlockedFormations = [...(ns.unlockedFormations || []), locked[Math.floor(Math.random() * locked.length)]];
      }
    }

    // Match modifiers
    const modKeys = ['extraGoalChance', 'opponentExtraGoal', 'lowScoringMatch', 'highScoringMatch',
      'playerOnFire', 'playerNerfed', 'playerSuspended', 'playerProtected',
      'penaltyGuaranteed', 'redCardRisk', 'cleanSheet', 'concedeLate', 'comebackPower'];
    for (const key of modKeys) {
      if (sp[key] !== undefined) {
        ns.matchModifiers = ns.matchModifiers || {};
        ns.matchModifiers[key] = sp[key];
      }
    }

    // Immediate resource swings
    if (sp.moraleExplosion) ns.morale = Math.min(100, (ns.morale || 60) + sp.moraleExplosion.value);
    if (sp.moraleCrash) ns.morale = Math.max(0, (ns.morale || 60) + sp.moraleCrash.value);
    if (sp.pressureBomb) ns.pressure = Math.min(100, (ns.pressure || 30) + sp.pressureBomb.value);
    if (sp.budgetJackpot) ns.budget = Math.min(100, (ns.budget || 50) + sp.budgetJackpot.value);

    if (sp.winStreakBonus) ns.winStreakBonus = true;
    if (sp.loseStreakPenalty) ns.loseStreakPenalty = true;
    if (sp.nextMatchBan && ns.starPlayer) ns.nextMatchBanPlayer = ns.starPlayer;
  }

  // Player/team buffs
  if (choice.playerBuff) {
    const pb = choice.playerBuff;
    ns.playerBuffs = { ...(ns.playerBuffs || {}) };
    let targetName = ns.starPlayer;
    if (pb.target === 'random') {
      const avail = (ns.playerSquad || []).filter(p => p.name !== ns.starPlayer);
      if (avail.length > 0) targetName = avail[Math.floor(Math.random() * avail.length)].name;
    }
    if (targetName) ns.playerBuffs[targetName] = { ratingMod: pb.ratingMod, duration: pb.duration || 1 };
  }
  if (choice.teamBuff) {
    ns.teamBuffs = [...(ns.teamBuffs || [])];
    const val = choice.teamBuff.value || 3;
    ns.teamBuffs.push({ ...choice.teamBuff, value: val });
  }
  if (choice.opponentDebuff) {
    ns.opponentDebuffs = [...(ns.opponentDebuffs || []), { ...choice.opponentDebuff }];
  }

  // Chain events
  if (choice.chain) activeChains.push({ ...choice.chain, source: 'event' });

  // Arc flags
  if (choice.arcFlag) {
    ns.arcFlags = { ...(ns.arcFlags || {}), [choice.arcFlag]: true };
  }

  // Event flags
  if (choice.flag) {
    ns.eventFlags = { ...(ns.eventFlags || {}), [choice.flag]: true };
  }

  return ns;
}

/** Check if any resource is at game-over levels */
export function checkGameOver(state) {
  if ((state.morale || 60) <= 0) return 'mutiny';
  if ((state.fitness || 60) <= 0) return 'exhaustion';
  if ((state.pressure || 30) >= 100) return 'fired';
  if (state.eliminatedInGroups) return 'eliminated';
  return null;
}

/** Resolve pending chain events after a match result */
export function resolveChains(state, matchResult) {
  const ns = { ...state };

  // Win/lose streak effects
  if (ns.winStreakBonus && matchResult === 'win') {
    ns.nextMatchBoost = { team: true, rating: 5 };
  }
  if (ns.loseStreakPenalty && matchResult === 'lose') {
    ns.morale = Math.max(0, (ns.morale || 60) - 15);
  }
  ns.winStreakBonus = false;
  ns.loseStreakPenalty = false;

  // Risk recurrence
  if (ns.riskRecurrence && Math.random() < ns.riskRecurrence) {
    ns.morale = Math.max(0, (ns.morale || 60) - 10);
    ns.pressure = Math.min(100, (ns.pressure || 30) + 10);
  }
  ns.riskRecurrence = null;

  // Next match ban
  if (ns.nextMatchBanPlayer) {
    ns.suspendedPlayers = [...(ns.suspendedPlayers || []), ns.nextMatchBanPlayer];
    ns.nextMatchBanPlayer = null;
  }

  // Process chain events
  const triggered = [];
  for (let i = activeChains.length - 1; i >= 0; i--) {
    const chain = activeChains[i];
    let targetId = null;
    if (chain.any) targetId = chain.any;
    else if (chain[matchResult]) targetId = chain[matchResult];
    if (targetId) {
      const evt = WORLD_CUP_EVENTS.find((e) => e.id === targetId);
      if (evt) triggered.push(evt);
      activeChains.splice(i, 1);
    }
  }
  ns.pendingChainEvents = triggered;

  return ns;
}

/** Pick a post-match press conference event */
export function pickPostMatchEvent(matchResult) {
  const pool = WORLD_CUP_EVENTS.filter(
    (e) => e.isPostMatch && e.matchResult === matchResult && !e.isStarPlayer
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Pick a rivalry event if applicable */
export function pickRivalryEvent(teamA, teamB) {
  const a = (teamA || '').toLowerCase().replace(/\s+/g, '_');
  const b = (teamB || '').toLowerCase().replace(/\s+/g, '_');
  return WORLD_CUP_EVENTS.find(
    (e) =>
      e.isRivalry &&
      e.rivalryPairs &&
      e.rivalryPairs.some(
        ([x, y]) => (x === a && y === b) || (x === b && y === a)
      )
  ) || null;
}

/** Pick a narrative event if conditions are met */
export function pickNarrativeEvent(narrativeState) {
  return WORLD_CUP_EVENTS.filter((e) => {
    if (!e.isNarrative || !e.narrativeCondition) return false;
    return Object.entries(e.narrativeCondition).every(
      ([key, val]) => (narrativeState[key] || 0) >= val
    );
  });
}

/** Pick a star-player event */
export function pickStarPlayerEvent(matchResult) {
  const pool = WORLD_CUP_EVENTS.filter((e) => {
    if (!e.isStarPlayer) return false;
    if (e.isPostMatch && e.matchResult !== matchResult) return false;
    if (e.isPostMatch) return true;
    return !e.isPostMatch;
  });
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Reset state for a new game */
export function resetEventState() {
  seenEvents.clear();
  activeChains.length = 0;
}