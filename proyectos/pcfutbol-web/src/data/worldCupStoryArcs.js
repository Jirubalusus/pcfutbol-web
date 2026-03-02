// ============================================================
// WORLD CUP MODE — Story Arc System
// ============================================================
// Each run picks 2-3 arcs from this pool. Arcs have 3-4 chapters
// that unfold across the tournament based on player decisions.
// Arc chapters integrate with the existing event pipeline.
// ============================================================
// REDESIGNED: All specials are now logical consequences of each
// chapter's narrative. No generic aggressive/safe patterns.
// ============================================================

export const STORY_ARC_TEMPLATES = [
  // ════════════════════════════════════════════
  // A. "La Promesa" (The Promise)
  // ════════════════════════════════════════════
  // Journalist asks if you promise to win the World Cup.
  // Arc explores pressure, credibility, and narrative momentum.
  {
    id: 'la_promesa',
    chapters: [
      {
        // Ch1: "Do you promise the nation you'll bring the cup home?"
        id: 'la_promesa_1',
        trigger: { round: 1 },
        category: 'press',
        weight: 100,
        chapterIndex: 0,
        totalChapters: 4,
        choiceA: {
          // Promise victory → star inspired, massive pressure, devastating if you lose
          effects: { morale: 15, fitness: 10, pressure: -15, budget: 5 },
          special: { playerOnFire: { player: 'star' }, pressureBomb: { value: 15 }, loseStreakPenalty: true },
          arcFlag: 'promised_victory',
        },
        choiceB: {
          // Stay humble → relaxed team, controlled game, no pressure
          effects: { morale: 15, fitness: -10, pressure: 10, budget: -5 },
          special: { comebackPower: true, lowScoringMatch: true },
          arcFlag: 'stayed_humble',
        },
      },
      {
        // Ch2: The promise/humility has consequences
        id: 'la_promesa_2',
        trigger: { round: 3, requires: 'la_promesa_1' },
        category: 'press',
        weight: 100,
        chapterIndex: 1,
        totalChapters: 4,
        variants: {
          promised_victory: {
            // Promise is everywhere. Reporter asks: "Do you reaffirm?"
            choiceA: {
              // Double down → star even more fired up, but crushing pressure
              effects: { morale: 20, fitness: 10, pressure: -10, budget: 5 },
              special: { extraGoalChance: { player: 'star', percent: 45 }, pressureBomb: { value: 15 }, loseStreakPenalty: true },
              arcFlag: 'doubled_down_promise',
            },
            choiceB: {
              // Walk it back → credibility destroyed, team confused
              effects: { morale: 20, fitness: 15, pressure: -15, budget: 10 },
              special: { moraleCrash: { value: -10 }, concedeLate: { percent: 30 } },
              arcFlag: 'backtracked_promise',
            },
          },
          stayed_humble: {
            // Some praise your humility, others mock your lack of ambition
            choiceA: {
              // Motivational speech → team energized internally
              effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
              special: { comebackPower: true, moraleExplosion: { value: 10 } },
              arcFlag: 'humble_praised',
            },
            choiceB: {
              // Keep low profile, work in silence → no inspiration but solid
              effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
              special: { cleanSheet: { percent: 25 }, boostNextMatch: { team: true, rating: 4 } },
              arcFlag: 'humble_mocked',
            },
          },
        },
      },
      {
        // Ch3: Knockout stage — the promise arc intensifies
        id: 'la_promesa_3',
        trigger: { phase: 'knockout', requires: 'la_promesa_2' },
        category: 'press',
        weight: 100,
        chapterIndex: 2,
        totalChapters: 4,
        variants: {
          doubled_down_promise: {
            // Semifinal. "THE PROMISE" is painted in stands. Now or never.
            choiceA: {
              // "Today we fulfill the promise!" → All or nothing, star ablaze
              effects: { morale: -10, fitness: 10, pressure: -15, budget: 5 },
              special: { playerOnFire: { player: 'star' }, extraGoalChance: { player: 'star', percent: 50 }, loseStreakPenalty: true, pressureBomb: { value: 10 } },
              arcFlag: 'promise_all_in',
            },
            choiceB: {
              // "Forget the promise, play free" → pressure relief but momentum lost
              effects: { morale: 10, fitness: -15, pressure: 5, budget: -10 },
              special: { lowScoringMatch: true, comebackPower: true },
              arcFlag: 'promise_cracked',
            },
          },
          backtracked_promise: {
            // Media crucified you. "Coach lost his nerve." Team is relaxed though.
            choiceA: {
              // "I was wrong to doubt us" → reclaim narrative, team responds
              effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
              special: { comebackPower: true, moraleExplosion: { value: 10 } },
              arcFlag: 'promise_redeemed',
            },
            choiceB: {
              // Accept criticism, keep working → pragmatic but uninspiring
              effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
              special: { cleanSheet: { percent: 25 }, boostNextMatch: { team: true, rating: 3 } },
              arcFlag: 'promise_forgotten',
            },
          },
          humble_praised: {
            // "The coach who doesn't promise, delivers." Team adores you.
            choiceA: {
              // Epic speech: "Today is OUR day" → breaking character = powerful
              effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
              special: { moraleExplosion: { value: 15 }, comebackPower: true, winStreakBonus: true },
              arcFlag: 'humble_leader',
            },
            choiceB: {
              // "One more match, step by step" → consistent but lacks fire
              effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
              special: { cleanSheet: { percent: 30 }, lowScoringMatch: true },
              arcFlag: 'humble_boring',
            },
          },
          humble_mocked: {
            // "Coach with no ambition." But team went far in silence.
            choiceA: {
              // "Now they'll see what we're made of!" → finally roar
              effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
              special: { playerOnFire: { player: 'star' }, highScoringMatch: true, comebackPower: true },
              arcFlag: 'humble_finally_roars',
            },
            choiceB: {
              // Stay silent, let results talk → discipline wins
              effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
              special: { cleanSheet: { percent: 30 }, boostNextMatch: { team: true, rating: 5 } },
              arcFlag: 'humble_stays_quiet',
            },
          },
        },
      },
      {
        // Ch4: THE FINAL — ultimate payoff of the promise arc
        id: 'la_promesa_4',
        trigger: { round: 6, requires: 'la_promesa_3' },
        category: 'press',
        weight: 100,
        chapterIndex: 3,
        totalChapters: 4,
        variants: {
          promise_all_in: {
            // Final. All-in on promise. "THE PROMISE" painted in stands. Country holds breath.
            choiceA: {
              // "TODAY WE DELIVER! FOR EVERYONE!" → maximum emotion, maximum risk
              effects: { morale: -5, fitness: -10, pressure: 15, budget: 10 },
              special: { playerOnFire: { player: 'star' }, extraGoalChance: { player: 'star', percent: 55 }, loseStreakPenalty: true, pressureBomb: { value: 10 } },
            },
            choiceB: {
              // "Stay calm. We're the best." → cold confidence, solid approach
              effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
              special: { cleanSheet: { percent: 35 }, comebackPower: true, winStreakBonus: true },
            },
          },
          promise_cracked: {
            // Final, but credibility shattered. Players look at captain, not you.
            choiceA: {
              // "I've failed you. But today, together, we make history." → vulnerability
              effects: { morale: 15, fitness: -5, pressure: -10, budget: -10 },
              special: { comebackPower: true, moraleExplosion: { value: 10 }, concedeLate: { percent: 25 } },
            },
            choiceB: {
              // "Forget everything. Only football remains." → pragmatism
              effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
              special: { lowScoringMatch: true, cleanSheet: { percent: 30 } },
            },
          },
          promise_redeemed: {
            // Redeemed yourself. Media respects honesty. Final is your vindication.
            choiceA: {
              // "Now yes: THIS cup is ours." → finally promise, with earned credibility
              effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
              special: { playerOnFire: { player: 'star' }, winStreakBonus: true, comebackPower: true },
            },
            choiceB: {
              // "Let's do what we do best." → humble to the end
              effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
              special: { cleanSheet: { percent: 30 }, boostNextMatch: { team: true, rating: 5 } },
            },
          },
          promise_forgotten: {
            // Promise forgotten. No narrative. No epic. Just football.
            choiceA: {
              // Try to create an epic moment now → forced, may backfire
              effects: { morale: 10, fitness: 15, pressure: -10, budget: 10 },
              special: { highScoringMatch: true, concedeLate: { percent: 30 } },
            },
            choiceB: {
              // Simply play the match → no drama, no extras
              effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
              special: { boostNextMatch: { team: true, rating: 3 } },
            },
          },
          humble_leader: {
            // Silent leadership got you here. Anti-hero. Players would do anything for you.
            choiceA: {
              // "This time I DO promise. I promise I'll give EVERYTHING." → breaking the mold
              effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
              special: { playerOnFire: { player: 'star' }, moraleExplosion: { value: 15 }, winStreakBonus: true },
            },
            choiceB: {
              // "I change nothing. We are who we are." → true to the end
              effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
              special: { cleanSheet: { percent: 35 }, comebackPower: true, boostNextMatch: { team: true, rating: 5 } },
            },
          },
          humble_boring: {
            // Reached final being "boring." Media wants drama, you give work.
            choiceA: {
              // For once, give a passionate speech → surprise the world
              effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
              special: { comebackPower: true, moraleExplosion: { value: 10 } },
            },
            choiceB: {
              // Be yourself to the very end → consistency is strength
              effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
              special: { cleanSheet: { percent: 30 }, lowScoringMatch: true, playerProtected: { player: 'star' } },
            },
          },
          humble_finally_roars: {
            // YOU ROARED! Semifinal explosion was the moment. Fans adore you.
            choiceA: {
              // "LET'S GO ALL IN! THIS IS OUR MOMENT!" → maintain the fire
              effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
              special: { playerOnFire: { player: 'star' }, extraGoalChance: { player: 'star', percent: 45 }, highScoringMatch: true },
            },
            choiceB: {
              // "I said everything. Now, let's play." → return to silence, let quality shine
              effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
              special: { cleanSheet: { percent: 30 }, comebackPower: true, boostNextMatch: { team: true, rating: 5 } },
            },
          },
          humble_stays_quiet: {
            // Stayed quiet. Team won, but nobody talks about you. No narrative = no extra motivation?
            choiceA: {
              // Try to inspire one last time → may feel forced
              effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
              special: { comebackPower: true, moraleExplosion: { value: 5 } },
            },
            choiceB: {
              // Let the football speak → pure football, no extras
              effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
              special: { boostNextMatch: { team: true, rating: 5 }, cleanSheet: { percent: 25 } },
            },
          },
        },
      },
    ],
  },

  // ════════════════════════════════════════════
  // B. "El Periodista" (The Journalist)
  // ════════════════════════════════════════════
  // A veteran journalist attacks you publicly. Arc explores media warfare.
  {
    id: 'el_periodista',
    chapters: [
      {
        // Ch1: Veteran journalist attacks your tactics. Confront or ignore?
        id: 'el_periodista_1',
        trigger: { round: 1 },
        category: 'press',
        weight: 100,
        chapterIndex: 0,
        totalChapters: 3,
        choiceA: {
          // Confront: "My tactics got us here. What have yours won?"
          // → team rallied behind you, but journalist will seek revenge
          effects: { morale: 15, fitness: 5, pressure: -15, budget: 10 },
          special: { comebackPower: true, pressureBomb: { value: 10 } },
          arcFlag: 'confronted_journalist',
        },
        choiceB: {
          // Ignore: "We respect all opinions" → looks weak, journalist keeps attacking
          effects: { morale: 25, fitness: 10, pressure: -10, budget: 15 },
          special: { opponentExtraGoal: { percent: 20 }, pressureBomb: { value: 10 } },
          arcFlag: 'ignored_journalist',
        },
      },
      {
        // Ch2: Journalist returns. Your previous choice shapes the situation.
        id: 'el_periodista_2',
        trigger: { round: 3, requires: 'el_periodista_1' },
        category: 'press',
        weight: 100,
        chapterIndex: 1,
        totalChapters: 3,
        variants: {
          confronted_journalist: {
            // Confrontation went viral. He's back with reinforcements.
            choiceA: {
              // Stand ground again → team even more united, but media war escalates
              effects: { morale: -10, fitness: 15, pressure: 10, budget: -5 },
              special: { comebackPower: true, moraleExplosion: { value: 8 }, pressureBomb: { value: 10 } },
              arcFlag: 'journalist_backed_off',
            },
            choiceB: {
              // Offer exclusive in exchange for peace → buying silence costs money
              effects: { morale: 10, fitness: -10, pressure: -5, budget: -15 },
              special: { playerProtected: { player: 'star' }, lowScoringMatch: true },
              arcFlag: 'journalist_bribed',
            },
          },
          ignored_journalist: {
            // He published devastating lies. Star player targeted. Anonymous sources.
            choiceA: {
              // Publicly denounce lies → high risk, could backfire spectacularly
              effects: { morale: 15, fitness: 20, pressure: -15, budget: 10 },
              special: { pressureBomb: { value: 15 }, redCardRisk: { percent: 20, team: 'player' } },
              arcFlag: 'journalist_published_lies',
            },
            choiceB: {
              // Pay PR firm to control damage → expensive but effective
              effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
              special: { playerProtected: { player: 'star' }, cleanSheet: { percent: 20 } },
              arcFlag: 'journalist_paid_off',
            },
          },
        },
      },
      {
        // Ch3: Final resolution of the journalist arc
        id: 'el_periodista_3',
        trigger: { phase: 'knockout', requires: 'el_periodista_2' },
        category: 'press',
        weight: 100,
        chapterIndex: 2,
        totalChapters: 3,
        variants: {
          journalist_backed_off: {
            // Journalist writes "I Was Wrong." Becomes unexpected ally. Pressure drops.
            choiceA: {
              // Accept apology publicly → media alliance, pressure relief, team confident
              effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
              special: { moraleExplosion: { value: 10 }, winStreakBonus: true },
            },
            choiceB: {
              // Ignore article, focus on football → no drama, solid
              effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
              special: { cleanSheet: { percent: 25 }, boostNextMatch: { team: true, rating: 4 } },
            },
          },
          journalist_bribed: {
            // Bribe half-worked. Another journalist suspects. If truth comes out = catastrophic.
            choiceA: {
              // Confess publicly → devastating short-term but clean conscience
              effects: { morale: 20, fitness: 10, pressure: -20, budget: 15 },
              special: { moraleCrash: { value: -10 }, concedeLate: { percent: 30 }, loseStreakPenalty: true },
            },
            choiceB: {
              // Pay more to silence the second journalist → deeper in the hole
              effects: { morale: 15, fitness: 15, pressure: -10, budget: 20 },
              special: { pressureBomb: { value: 15 }, opponentExtraGoal: { percent: 25 } },
            },
          },
          journalist_published_lies: {
            // Lies multiplied. Star threatens to leave. Darkest moment.
            choiceA: {
              // "ENOUGH! Here are the facts." → full counterattack, star motivated by truth
              effects: { morale: -15, fitness: 10, pressure: -5, budget: 10 },
              special: { playerOnFire: { player: 'star' }, comebackPower: true, pressureBomb: { value: 10 } },
            },
            choiceB: {
              // Negotiate quietly with editors → pay to make it go away
              effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
              special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 3 } },
            },
          },
          journalist_paid_off: {
            // Paid and silence worked. Team can focus. But money is gone.
            choiceA: {
              // Use media calm to prepare team → tactical advantage from no distractions
              effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
              special: { boostNextMatch: { team: true, rating: 5 }, cleanSheet: { percent: 25 } },
            },
            choiceB: {
              // Invest remaining budget in scouting → intel advantage
              effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
              special: { revealOpponent: true, lowScoringMatch: true },
            },
          },
        },
      },
    ],
  },

  // ════════════════════════════════════════════
  // C. "El Vestuario" (The Locker Room)
  // ════════════════════════════════════════════
  // Star player and captain argue about tactics. Arc explores team unity vs fracture.
  {
    id: 'el_vestuario',
    chapters: [
      {
        // Ch1: Star and captain argue. "We need to play more direct!" vs "That's Sunday league!"
        id: 'el_vestuario_1',
        trigger: { round: 1 },
        category: 'camp',
        weight: 100,
        chapterIndex: 0,
        totalChapters: 3,
        choiceA: {
          // Side with veteran captain → order and discipline, but young players resentful
          effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
          special: { cleanSheet: { percent: 25 }, lowScoringMatch: true },
          arcFlag: 'sided_with_veteran',
        },
        choiceB: {
          // Mediate: "You're both right" → fragile peace, team works together
          effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
          special: { comebackPower: true, moraleExplosion: { value: 5 } },
          arcFlag: 'mediated_conflict',
        },
      },
      {
        // Ch2: Consequences of your choice
        id: 'el_vestuario_2',
        trigger: { round: 3, requires: 'el_vestuario_1' },
        category: 'camp',
        weight: 100,
        chapterIndex: 1,
        totalChapters: 3,
        variants: {
          sided_with_veteran: {
            // Order came, but young group is resentful. Whispers in hallways.
            choiceA: {
              // Veteran gives the talk → consolidate his leadership, experienced approach
              effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
              special: { cleanSheet: { percent: 30 }, comebackPower: true },
              arcFlag: 'veteran_leads',
            },
            choiceB: {
              // You take back control → "I'm in charge" — risks rebellion
              effects: { morale: 20, fitness: 15, pressure: -15, budget: 10 },
              special: { moraleCrash: { value: -10 }, redCardRisk: { percent: 20, team: 'player' } },
              arcFlag: 'rebel_faction',
            },
          },
          mediated_conflict: {
            // Mediation worked for now. Tension lingers. Bad pass = death stares.
            choiceA: {
              // Team activity off pitch → bond the group through fun
              effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
              special: { moraleExplosion: { value: 10 }, comebackPower: true },
              arcFlag: 'peace_holds',
            },
            choiceB: {
              // Train hard without addressing it → sweep under rug
              effects: { morale: 25, fitness: 10, pressure: -10, budget: 15 },
              special: { concedeLate: { percent: 25 }, pressureBomb: { value: 5 } },
              arcFlag: 'peace_breaks',
            },
          },
        },
      },
      {
        // Ch3: Final resolution before biggest match
        id: 'el_vestuario_3',
        trigger: { phase: 'knockout', requires: 'el_vestuario_2' },
        category: 'camp',
        weight: 100,
        chapterIndex: 2,
        totalChapters: 3,
        variants: {
          veteran_leads: {
            // Veteran took charge. Total unity. "Coach, whatever you say."
            choiceA: {
              // "Win for us. For everything." → let emotion flow, full team spirit
              effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
              special: { moraleExplosion: { value: 15 }, comebackPower: true, winStreakBonus: true },
            },
            choiceB: {
              // "Same plan as always." → cold discipline, machine-like
              effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
              special: { cleanSheet: { percent: 35 }, lowScoringMatch: true, boostNextMatch: { team: true, rating: 5 } },
            },
          },
          rebel_faction: {
            // Rebel faction exploded. Three players demand changes or go to press.
            choiceA: {
              // Expel the rebels → lose players but restore authority
              effects: { morale: 10, fitness: 10, pressure: -15, budget: 15 },
              special: { blockPlayer: { duration: 1, who: 'random' }, playerSuspended: { who: 'random', count: 1 }, cleanSheet: { percent: 20 } },
            },
            choiceB: {
              // Negotiate: "What do you need to come back?" → keep players but lose authority
              effects: { morale: 20, fitness: 5, pressure: -10, budget: 10 },
              special: { concedeLate: { percent: 30 }, highScoringMatch: true },
            },
          },
          peace_holds: {
            // Peace held through mutual respect. Silence says more than words.
            choiceA: {
              // Break silence with emotional speech → powerful if genuine
              effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
              special: { comebackPower: true, moraleExplosion: { value: 10 }, winStreakBonus: true },
            },
            choiceB: {
              // Let the silence speak: "Let's go." → pure discipline
              effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
              special: { cleanSheet: { percent: 30 }, boostNextMatch: { team: true, rating: 5 } },
            },
          },
          peace_breaks: {
            // Peace broke. Shoving before biggest match. Need a miracle.
            choiceA: {
              // "ENOUGH! Together or we go home!" → authority, shock therapy
              effects: { morale: 15, fitness: 10, pressure: -15, budget: 5 },
              special: { redCardRisk: { percent: 25, team: 'player' }, comebackPower: true },
            },
            choiceB: {
              // Talk one-on-one with each player → empathy, slow but human
              effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
              special: { moraleExplosion: { value: 8 }, playerProtected: { player: 'star' } },
            },
          },
        },
      },
    ],
  },

  // ════════════════════════════════════════════
  // D. "El Prodigio" (The Prodigy)
  // ════════════════════════════════════════════
  // 19-year-old does something incredible in training. Arc explores risk vs protection of youth.
  {
    id: 'el_prodigio',
    chapters: [
      {
        // Ch1: Prodigy shows brilliance. First call-up. Next match is decisive.
        id: 'el_prodigio_1',
        trigger: { round: 2 },
        category: 'camp',
        weight: 100,
        chapterIndex: 0,
        totalChapters: 3,
        choiceA: {
          // Give him minutes → high risk/reward, unpredictable talent
          effects: { morale: 15, fitness: -10, pressure: 10, budget: -5 },
          special: { extraGoalChance: { player: 'random', percent: 45 }, highScoringMatch: true, redCardRisk: { percent: 15, team: 'player' } },
          arcFlag: 'prodigy_given_chance',
        },
        choiceB: {
          // Protect him: "Your time will come" → safe, veterans play
          effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
          special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 4 } },
          arcFlag: 'prodigy_protected',
        },
      },
      {
        // Ch2: How did the prodigy decision play out?
        id: 'el_prodigio_2',
        trigger: { round: 4, requires: 'el_prodigio_1' },
        category: 'camp',
        weight: 100,
        chapterIndex: 1,
        totalChapters: 3,
        variants: {
          prodigy_given_chance: {
            // Prodigy played. Results speak.
            choiceA: {
              // He delivered! Build on his confidence → prodigy becomes weapon
              effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
              special: { extraGoalChance: { player: 'random', percent: 45 }, comebackPower: true },
              arcFlag: 'prodigy_shines',
            },
            choiceB: {
              // He struggled. Back to bench → learning experience
              effects: { morale: -10, fitness: 10, pressure: -15, budget: 5 },
              special: { concedeLate: { percent: 20 }, boostNextMatch: { team: true, rating: 3 } },
              arcFlag: 'prodigy_struggles',
            },
          },
          prodigy_protected: {
            // Prodigy was protected. He's hungry.
            choiceA: {
              // Finally give him a chance → he's been training like crazy
              effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
              special: { extraGoalChance: { player: 'random', percent: 40 }, highScoringMatch: true },
              arcFlag: 'prodigy_hungry',
            },
            choiceB: {
              // Keep protecting → safe but prodigy loses motivation
              effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
              special: { cleanSheet: { percent: 25 }, lowScoringMatch: true },
              arcFlag: 'prodigy_forgotten',
            },
          },
        },
      },
      {
        // Ch3: Knockout — does the prodigy become legend or fade?
        id: 'el_prodigio_3',
        trigger: { phase: 'knockout', requires: 'el_prodigio_2' },
        category: 'camp',
        weight: 100,
        chapterIndex: 2,
        totalChapters: 3,
        variants: {
          prodigy_shines: {
            // Prodigy is the tournament's breakout star
            choiceA: {
              // Give him the spotlight in the biggest match → genius or disaster
              effects: { morale: 10, fitness: -15, pressure: 5, budget: -10 },
              special: { extraGoalChance: { player: 'random', percent: 50 }, highScoringMatch: true, concedeLate: { percent: 25 } },
            },
            choiceB: {
              // Manage him carefully → don't burn him out
              effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
              special: { comebackPower: true, boostNextMatch: { team: true, rating: 5 } },
            },
          },
          prodigy_struggles: {
            // Prodigy struggled but learned. One last shot?
            choiceA: {
              // Give him redemption chance → volatile outcome
              effects: { morale: -5, fitness: -10, pressure: 15, budget: 10 },
              special: { moraleSwing: { min: -10, max: 20 }, highScoringMatch: true },
            },
            choiceB: {
              // Veterans handle it → reliable but no magic
              effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
              special: { cleanSheet: { percent: 25 }, boostNextMatch: { team: true, rating: 4 } },
            },
          },
          prodigy_hungry: {
            // Prodigy finally got his chance and is ON FIRE
            choiceA: {
              // Build entire game plan around him → revolutionary but risky
              effects: { morale: 15, fitness: -5, pressure: -10, budget: -10 },
              special: { extraGoalChance: { player: 'random', percent: 50 }, comebackPower: true, concedeLate: { percent: 25 } },
            },
            choiceB: {
              // Use him as super-sub → controlled impact
              effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
              special: { comebackPower: true, boostNextMatch: { team: true, rating: 4 } },
            },
          },
          prodigy_forgotten: {
            // Prodigy was never used. Frustrated. Team missed an opportunity?
            choiceA: {
              // Desperate times: throw him in → hail mary
              effects: { morale: -10, fitness: 15, pressure: 10, budget: -5 },
              special: { moraleSwing: { min: -15, max: 25 }, highScoringMatch: true },
            },
            choiceB: {
              // Stick with what you know → no surprises
              effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
              special: { cleanSheet: { percent: 20 }, boostNextMatch: { team: true, rating: 3 } },
            },
          },
        },
      },
    ],
  },

  // ════════════════════════════════════════════
  // E. "La Lesión" (The Injury)
  // ════════════════════════════════════════════
  // Star player has injury scare. Arc explores risk management with your best player.
  {
    id: 'la_lesion',
    chapters: [
      {
        // Ch1: Star player tweaked something in training. Doctor says can play with risk.
        id: 'la_lesion_1',
        trigger: { round: 1 },
        category: 'personal',
        weight: 100,
        chapterIndex: 0,
        totalChapters: 3,
        choiceA: {
          // Rest him → he doesn't play THIS match, but will recover fully
          effects: { morale: 10, fitness: -10, pressure: -5, budget: -15 },
          special: { playerSuspended: { who: 'star', count: 1 }, boostNextMatch: { player: 'star', rating: 8 } },
          arcFlag: 'rested_star',
        },
        choiceB: {
          // Risk it → playing through pain, fired up but could break
          effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
          special: { playerOnFire: { player: 'star' }, injuryRisk: 0.35, extraGoalChance: { player: 'star', percent: 40 } },
          arcFlag: 'risked_star',
        },
      },
      {
        // Ch2: How did the injury decision play out?
        id: 'la_lesion_2',
        trigger: { round: 3, requires: 'la_lesion_1' },
        category: 'personal',
        weight: 100,
        chapterIndex: 1,
        totalChapters: 3,
        variants: {
          rested_star: {
            // Star rested. Now he's back. How is he?
            choiceA: {
              // Full recovery! Star returns at 100% → dominant
              effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
              special: { playerOnFire: { player: 'star' }, extraGoalChance: { player: 'star', percent: 50 } },
              arcFlag: 'star_recovered_fully',
            },
            choiceB: {
              // Recovery needs specialist treatment → expensive but thorough
              effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
              special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 5 } },
              arcFlag: 'star_treatment_costly',
            },
          },
          risked_star: {
            // Star played through injury. What happened?
            choiceA: {
              // Injury worsened → star out for multiple matches
              effects: { morale: 15, fitness: 20, pressure: -15, budget: 10 },
              special: { playerSuspended: { who: 'star', count: 2 }, moraleCrash: { value: -10 } },
              arcFlag: 'star_injury_worsened',
            },
            choiceB: {
              // Star survived and is OK → gamble paid off, but still managing pain
              effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
              special: { playerOnFire: { player: 'star' }, extraGoalChance: { player: 'star', percent: 40 }, injuryRisk: 0.2 },
              arcFlag: 'star_survives_risk',
            },
          },
        },
      },
      {
        // Ch3: Knockout stage — the injury arc reaches climax
        id: 'la_lesion_3',
        trigger: { phase: 'knockout', requires: 'la_lesion_2' },
        category: 'personal',
        weight: 100,
        chapterIndex: 2,
        totalChapters: 3,
        variants: {
          star_recovered_fully: {
            // Star at 100%. Dominant. The best version of himself.
            choiceA: {
              // Build entire game around him → he's ready for the moment
              effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
              special: { playerOnFire: { player: 'star' }, extraGoalChance: { player: 'star', percent: 55 }, winStreakBonus: true },
            },
            choiceB: {
              // Use him wisely, don't overload → manage minutes
              effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
              special: { playerProtected: { player: 'star' }, comebackPower: true, boostNextMatch: { team: true, rating: 5 } },
            },
          },
          star_treatment_costly: {
            // Treatment worked but expensive. Star is fit but budget drained.
            choiceA: {
              // Star repays the investment → motivated by your faith in him
              effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
              special: { playerOnFire: { player: 'star' }, extraGoalChance: { player: 'star', percent: 45 } },
            },
            choiceB: {
              // Play it safe with remaining budget → conservative approach
              effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
              special: { cleanSheet: { percent: 30 }, lowScoringMatch: true },
            },
          },
          star_injury_worsened: {
            // Star is out. Team devastated. The worst timeline.
            choiceA: {
              // Channel the anger → "Win it FOR him!" — emotional but fragile
              effects: { morale: 20, fitness: 10, pressure: -20, budget: 15 },
              special: { comebackPower: true, moraleCrash: { value: -10 }, loseStreakPenalty: true },
            },
            choiceB: {
              // Accept reality, adapt tactically → pragmatic without star
              effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
              special: { cleanSheet: { percent: 30 }, lowScoringMatch: true, boostNextMatch: { team: true, rating: 3 } },
            },
          },
          star_survives_risk: {
            // Star playing through pain. Heart of a lion. But still fragile.
            choiceA: {
              // One more game, all in → push him to the limit
              effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
              special: { playerOnFire: { player: 'star' }, extraGoalChance: { player: 'star', percent: 50 }, injuryRisk: 0.3 },
            },
            choiceB: {
              // Finally rest him → accept the risk is too high
              effects: { morale: -15, fitness: 10, pressure: -5, budget: 10 },
              special: { playerSuspended: { who: 'star', count: 1 }, boostNextMatch: { team: true, rating: 8 } },
            },
          },
        },
      },
    ],
  },

  // ════════════════════════════════════════════
  // F. "El Soborno" (The Bribe)
  // ════════════════════════════════════════════
  // Someone offers a bribe. Arc explores corruption vs integrity.
  {
    id: 'el_soborno',
    chapters: [
      {
        // Ch1: Mysterious intermediary offers "donation" for "flexibility" in next match
        id: 'el_soborno_1',
        trigger: { round: 2 },
        category: 'scandal',
        weight: 100,
        chapterIndex: 0,
        totalChapters: 3,
        choiceA: {
          // Accept the bribe → money and a rigged penalty, but moral corruption
          effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
          special: { penaltyGuaranteed: true, budgetJackpot: { value: 15 }, pressureBomb: { value: 10 } },
          arcFlag: 'accepted_bribe',
        },
        choiceB: {
          // Refuse → integrity intact, team proud, but no money
          effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
          special: { moraleExplosion: { value: 10 }, comebackPower: true },
          arcFlag: 'refused_bribe',
        },
      },
      {
        // Ch2: Consequences of your bribe decision
        id: 'el_soborno_2',
        trigger: { round: 4, requires: 'el_soborno_1' },
        category: 'scandal',
        weight: 100,
        chapterIndex: 1,
        totalChapters: 3,
        variants: {
          accepted_bribe: {
            // Investigation begins. Evidence mounting.
            choiceA: {
              // Under investigation → walls closing in, panic
              effects: { morale: 15, fitness: 15, pressure: -10, budget: 20 },
              special: { moraleCrash: { value: -15 }, pressureBomb: { value: 15 }, loseStreakPenalty: true },
              arcFlag: 'bribe_investigated',
            },
            choiceB: {
              // Cover up → destroy evidence, expensive and stressful
              effects: { morale: 20, fitness: 15, pressure: -15, budget: 10 },
              special: { concedeLate: { percent: 30 }, opponentExtraGoal: { percent: 20 } },
              arcFlag: 'bribe_covered_up',
            },
          },
          refused_bribe: {
            // Your integrity made headlines. Hero narrative.
            choiceA: {
              // Public hero → media loves you, sponsors come calling
              effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
              special: { moraleExplosion: { value: 10 }, winStreakBonus: true, budgetJackpot: { value: 10 } },
              arcFlag: 'bribe_hero',
            },
            choiceB: {
              // Silent hero → no fanfare, just pride
              effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
              special: { playerProtected: { player: 'star' }, cleanSheet: { percent: 25 } },
              arcFlag: 'bribe_silent_hero',
            },
          },
        },
      },
      {
        // Ch3: Final resolution
        id: 'el_soborno_3',
        trigger: { phase: 'knockout', requires: 'el_soborno_2' },
        category: 'scandal',
        weight: 100,
        chapterIndex: 2,
        totalChapters: 3,
        variants: {
          bribe_investigated: {
            // FIFA investigation. Career on the line.
            choiceA: {
              // Confess everything → players banned, career possibly over
              effects: { morale: 25, fitness: 10, pressure: -10, budget: 15 },
              special: { blockPlayer: { duration: 1, who: 'random' }, moraleCrash: { value: -20 }, loseStreakPenalty: true },
            },
            choiceB: {
              // Lawyer up, fight it → expensive but might survive
              effects: { morale: 15, fitness: 20, pressure: -15, budget: 10 },
              special: { pressureBomb: { value: 15 }, concedeLate: { percent: 35 } },
            },
          },
          bribe_covered_up: {
            // Cover-up holds... barely. Living on borrowed time.
            choiceA: {
              // The truth might come out any second → anxiety-fueled chaos
              effects: { morale: 20, fitness: 10, pressure: -10, budget: 5 },
              special: { moraleSwing: { min: -15, max: 15 }, concedeLate: { percent: 30 } },
            },
            choiceB: {
              // Move on and try to forget → uneasy calm
              effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
              special: { lowScoringMatch: true, cleanSheet: { percent: 20 } },
            },
          },
          bribe_hero: {
            // You're a hero. Sponsors, media, fans all love you. Riding high.
            choiceA: {
              // Channel the goodwill into team performance → incredible momentum
              effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
              special: { playerOnFire: { player: 'star' }, moraleExplosion: { value: 15 }, winStreakBonus: true },
            },
            choiceB: {
              // Stay grounded → don't let success go to your head
              effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
              special: { cleanSheet: { percent: 30 }, comebackPower: true, boostNextMatch: { team: true, rating: 5 } },
            },
          },
          bribe_silent_hero: {
            // Quiet pride. No fanfare. Just doing the right thing.
            choiceA: {
              // Finally tell the story publicly → inspire the nation
              effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
              special: { moraleExplosion: { value: 10 }, comebackPower: true },
            },
            choiceB: {
              // Keep it quiet forever → inner peace
              effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
              special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 4 } },
            },
          },
        },
      },
    ],
  },

  // ════════════════════════════════════════════
  // G. "La Rivalidad" (The Rivalry)
  // ════════════════════════════════════════════
  // Rival coach trash-talks you. Arc explores rivalry psychology.
  {
    id: 'la_rivalidad',
    chapters: [
      {
        // Ch1: Rival coach provokes you publicly
        id: 'la_rivalidad_1',
        trigger: { round: 1 },
        category: 'press',
        weight: 100,
        chapterIndex: 0,
        totalChapters: 3,
        choiceA: {
          // Respond to rival → fires up team but creates chaos
          effects: { morale: 10, fitness: 15, pressure: -10, budget: 10 },
          special: { highScoringMatch: true, redCardRisk: { percent: 15, team: 'player' }, comebackPower: true },
          arcFlag: 'responded_to_rival',
        },
        choiceB: {
          // Ignore rival → keeps composure, controlled approach
          effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
          special: { cleanSheet: { percent: 20 }, lowScoringMatch: true },
          arcFlag: 'ignored_rival',
        },
      },
      {
        // Ch2: Rivalry escalation or de-escalation
        id: 'la_rivalidad_2',
        trigger: { round: 3, requires: 'la_rivalidad_1' },
        category: 'press',
        weight: 100,
        chapterIndex: 1,
        totalChapters: 3,
        variants: {
          responded_to_rival: {
            // War of words escalated. Headlines explode.
            choiceA: {
              // Full war → "We'll destroy them!" — team is ablaze, match will be chaotic
              effects: { morale: 15, fitness: -10, pressure: 10, budget: -5 },
              special: { highScoringMatch: true, extraGoalChance: { player: 'random', percent: 40 }, redCardRisk: { percent: 20, team: 'player' } },
              arcFlag: 'rivalry_war',
            },
            choiceB: {
              // Cool it down → "I said what I said, but now we focus"
              effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
              special: { comebackPower: true, boostNextMatch: { team: true, rating: 3 } },
              arcFlag: 'rivalry_cooled',
            },
          },
          ignored_rival: {
            // You ignored him. How did that play out?
            choiceA: {
              // Rival respected your silence → mutual respect, fair game
              effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
              special: { comebackPower: true, cleanSheet: { percent: 20 } },
              arcFlag: 'rival_respected_silence',
            },
            choiceB: {
              // Rival sees weakness → doubles down, your team doubts you
              effects: { morale: 20, fitness: 10, pressure: -20, budget: 15 },
              special: { opponentExtraGoal: { percent: 25 }, pressureBomb: { value: 10 } },
              arcFlag: 'rival_sees_weakness',
            },
          },
        },
      },
      {
        // Ch3: Final rivalry showdown
        id: 'la_rivalidad_3',
        trigger: { phase: 'knockout', requires: 'la_rivalidad_2' },
        category: 'press',
        weight: 100,
        chapterIndex: 2,
        totalChapters: 3,
        variants: {
          rivalry_war: {
            // Full war. Both teams hate each other. The match will be WILD.
            choiceA: {
              // "We end this TODAY!" → all-out attack, emotional warfare
              effects: { morale: -10, fitness: 10, pressure: -15, budget: 5 },
              special: { playerOnFire: { player: 'star' }, highScoringMatch: true, redCardRisk: { percent: 25, team: 'both' } },
            },
            choiceB: {
              // "Let's win with class" → channel anger into discipline
              effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
              special: { cleanSheet: { percent: 30 }, comebackPower: true, boostNextMatch: { team: true, rating: 5 } },
            },
          },
          rivalry_cooled: {
            // Rivalry cooled. Just a normal match now.
            choiceA: {
              // Find new motivation → "We don't need rivalry, we have purpose"
              effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
              special: { comebackPower: true, moraleExplosion: { value: 8 } },
            },
            choiceB: {
              // Purely tactical approach → no emotions, just football
              effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
              special: { cleanSheet: { percent: 25 }, lowScoringMatch: true },
            },
          },
          rival_respected_silence: {
            // Mutual respect. Clean rivalry. Both teams at their best.
            choiceA: {
              // "Let's show them what we're made of" — respectful fire
              effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
              special: { comebackPower: true, winStreakBonus: true },
            },
            choiceB: {
              // Pure focus, no mind games → master class preparation
              effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
              special: { revealOpponent: true, cleanSheet: { percent: 25 }, boostNextMatch: { team: true, rating: 4 } },
            },
          },
          rival_sees_weakness: {
            // Rival thinks you're weak. Your own team doubts you. Must respond NOW.
            choiceA: {
              // Finally respond → "They think we're weak? Watch this."
              effects: { morale: -10, fitness: -5, pressure: 15, budget: -10 },
              special: { comebackPower: true, playerOnFire: { player: 'star' }, highScoringMatch: true },
            },
            choiceB: {
              // Keep ignoring → risk looking even weaker but save energy
              effects: { morale: 15, fitness: 15, pressure: -10, budget: 20 },
              special: { concedeLate: { percent: 25 }, opponentExtraGoal: { percent: 20 } },
            },
          },
        },
      },
    ],
  },

  // ════════════════════════════════════════════
  // H. "El Héroe Inesperado" (The Unlikely Hero)
  // ════════════════════════════════════════════
  // A bench player shows surprising quality. Arc explores trust in unknowns.
  {
    id: 'el_heroe',
    chapters: [
      {
        // Ch1: Bench player impresses in training. Give him a chance?
        id: 'el_heroe_1',
        trigger: { round: 2 },
        category: 'camp',
        weight: 100,
        chapterIndex: 0,
        totalChapters: 3,
        choiceA: {
          // Trust bench player → unpredictable, could be magic or disaster
          effects: { morale: -10, fitness: -10, pressure: 15, budget: -5 },
          special: { moraleSwing: { min: -5, max: 20 }, extraGoalChance: { player: 'random', percent: 35 } },
          arcFlag: 'trusted_bench_player',
        },
        choiceB: {
          // Stick with starters → reliable, proven, boring
          effects: { morale: -15, fitness: -5, pressure: 10, budget: -10 },
          special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 3 } },
          arcFlag: 'stuck_with_starters',
        },
      },
      {
        // Ch2: How did the bench player do?
        id: 'el_heroe_2',
        trigger: { round: 4, requires: 'el_heroe_1' },
        category: 'camp',
        weight: 100,
        chapterIndex: 1,
        totalChapters: 3,
        variants: {
          trusted_bench_player: {
            // Bench player played. Fans loved it.
            choiceA: {
              // He's become a fan favorite! Keep the momentum → hero grows
              effects: { morale: -15, fitness: -10, pressure: 20, budget: -10 },
              special: { comebackPower: true, extraGoalChance: { player: 'random', percent: 40 }, moraleExplosion: { value: 8 } },
              arcFlag: 'hero_fan_favorite',
            },
            choiceB: {
              // Back to bench, job done → return to normal hierarchy
              effects: { morale: -5, fitness: -10, pressure: 15, budget: -10 },
              special: { playerProtected: { player: 'star' }, boostNextMatch: { team: true, rating: 3 } },
              arcFlag: 'hero_back_to_bench',
            },
          },
          stuck_with_starters: {
            // Starters played. Bench player is now frustrated.
            choiceA: {
              // Bench player is bitter → creates tension, wants out
              effects: { morale: 20, fitness: 15, pressure: -15, budget: 10 },
              special: { concedeLate: { percent: 25 }, redCardRisk: { percent: 15, team: 'player' } },
              arcFlag: 'bench_player_bitter',
            },
            choiceB: {
              // Bench player accepts role → team harmony maintained
              effects: { morale: -10, fitness: -15, pressure: 15, budget: -5 },
              special: { cleanSheet: { percent: 20 }, boostNextMatch: { team: true, rating: 3 } },
              arcFlag: 'bench_player_accepts',
            },
          },
        },
      },
      {
        // Ch3: Knockout — does the unlikely hero become legend?
        id: 'el_heroe_3',
        trigger: { phase: 'knockout', requires: 'el_heroe_2' },
        category: 'camp',
        weight: 100,
        chapterIndex: 2,
        totalChapters: 3,
        variants: {
          hero_fan_favorite: {
            // Fan favorite hero. Tournament darling. Biggest match of his life.
            choiceA: {
              // Give him the biggest stage → fairy tale or heartbreak
              effects: { morale: -20, fitness: -10, pressure: 15, budget: -10 },
              special: { extraGoalChance: { player: 'random', percent: 50 }, comebackPower: true, moraleExplosion: { value: 10 } },
            },
            choiceB: {
              // Manage expectations, use him wisely → controlled hero
              effects: { morale: -10, fitness: -15, pressure: 10, budget: -5 },
              special: { comebackPower: true, boostNextMatch: { team: true, rating: 5 } },
            },
          },
          hero_back_to_bench: {
            // Hero back on bench. A what-if story. Do you regret it?
            choiceA: {
              // Throw him in for one last chance → nostalgic gamble
              effects: { morale: 10, fitness: -15, pressure: 5, budget: -10 },
              special: { moraleSwing: { min: -10, max: 20 }, highScoringMatch: true },
            },
            choiceB: {
              // Starters handle it → no romance, just pragmatism
              effects: { morale: -15, fitness: -15, pressure: 20, budget: -5 },
              special: { cleanSheet: { percent: 25 }, boostNextMatch: { team: true, rating: 3 } },
            },
          },
          bench_player_bitter: {
            // Bitter player is causing problems. Toxic in the dressing room.
            choiceA: {
              // Send him home → lose a player, gain peace
              effects: { morale: -5, fitness: -10, pressure: 15, budget: 10 },
              special: { blockPlayer: { duration: 1, who: 'random' }, cleanSheet: { percent: 20 } },
            },
            choiceB: {
              // Give him one chance to prove himself → redemption arc
              effects: { morale: 15, fitness: -5, pressure: -10, budget: -10 },
              special: { moraleSwing: { min: -10, max: 15 }, comebackPower: true },
            },
          },
          bench_player_accepts: {
            // Bench player accepted his role gracefully. Professional.
            choiceA: {
              // Reward his professionalism → surprise start in knockout match
              effects: { morale: -15, fitness: -10, pressure: 10, budget: -5 },
              special: { comebackPower: true, moraleExplosion: { value: 8 } },
            },
            choiceB: {
              // Keep things as they are → stability wins
              effects: { morale: -10, fitness: -10, pressure: 15, budget: -15 },
              special: { cleanSheet: { percent: 25 }, boostNextMatch: { team: true, rating: 4 } },
            },
          },
        },
      },
    ],
  },
];

// ════════════════════════════════════════════
// Story Arc Engine Functions
// ════════════════════════════════════════════

/**
 * Initialize story arcs for a new run. Picks 2-3 random arcs.
 * @returns {{ storyArcs: string[], arcFlags: {}, arcChaptersShown: string[] }}
 */
export function initStoryArcs() {
  const shuffled = [...STORY_ARC_TEMPLATES].sort(() => Math.random() - 0.5);
  const count = 2 + (Math.random() < 0.5 ? 1 : 0); // 2 or 3 arcs
  return {
    storyArcs: shuffled.slice(0, count).map(a => a.id),
    arcFlags: {},
    arcChaptersShown: [],
  };
}

/**
 * Check if any story arc chapter should trigger this round.
 * @param {Object} state - game state with storyArcs, arcFlags, arcChaptersShown, currentMatchday, phase
 * @returns {Object|null} - the arc chapter event to show, or null
 */
export function pickStoryArcEvent(state) {
  const { storyArcs = [], arcFlags = {}, arcChaptersShown = [] } = state;
  // Determine current round (1-indexed matchday)
  const round = (state.currentMatchday || 0) + 1;
  const phase = state.phase || 'groups';

  for (const arcId of storyArcs) {
    const arc = STORY_ARC_TEMPLATES.find(a => a.id === arcId);
    if (!arc) continue;

    for (const chapter of arc.chapters) {
      // Skip already shown chapters
      if (arcChaptersShown.includes(chapter.id)) continue;

      // Check trigger conditions
      const trigger = chapter.trigger;

      // Requires: previous chapter must have been shown
      if (trigger.requires) {
        const reqChapterId = trigger.requires;
        if (!arcChaptersShown.includes(reqChapterId)) continue;
      }

      // Round trigger
      if (trigger.round !== undefined && round < trigger.round) continue;

      // Phase trigger
      if (trigger.phase && phase !== trigger.phase) continue;

      // If this chapter has variants, resolve which variant to use
      let resolvedEvent = { ...chapter, isStoryArc: true, arcId };

      if (chapter.variants) {
        // Find which variant matches current arcFlags
        let matchedVariant = null;
        for (const [flagKey, variant] of Object.entries(chapter.variants)) {
          if (arcFlags[flagKey]) {
            matchedVariant = variant;
            break;
          }
        }
        if (!matchedVariant) continue; // No matching variant, skip

        resolvedEvent.choiceA = matchedVariant.choiceA;
        resolvedEvent.choiceB = matchedVariant.choiceB;
        // Find which flag was matched for decision context
        resolvedEvent.matchedFlag = Object.keys(chapter.variants).find(k => arcFlags[k]);
      }

      return resolvedEvent;
    }
  }

  return null;
}

/**
 * Process a story arc choice — store arcFlag and mark chapter shown.
 * @param {Object} state - game state
 * @param {Object} chapter - the arc chapter
 * @param {Object} choice - choiceA or choiceB
 * @returns {Object} updated state
 */
export function processArcChoice(state, chapter, choice) {
  const ns = { ...state };
  ns.arcChaptersShown = [...(ns.arcChaptersShown || []), chapter.id];

  if (choice.arcFlag) {
    ns.arcFlags = { ...(ns.arcFlags || {}), [choice.arcFlag]: true };
  }

  return ns;
}
