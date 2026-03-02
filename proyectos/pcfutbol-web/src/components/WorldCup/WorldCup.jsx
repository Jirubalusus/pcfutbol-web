import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { generateWorldCup, getPlayerNextMatch, simulateMatchday, recordPlayerMatch, checkGroupStageComplete, advanceKnockout, isPlayerEliminated, isWorldCupWinner } from '../../game/worldCupEngine';
import { pickEvent, pickPostMatchEvent, applyChoice, checkGameOver, resolveChains, resetEventState, WORLD_CUP_EVENTS } from '../../data/worldCupEvents';
import { initStoryArcs, pickStoryArcEvent, processArcChoice } from '../../data/worldCupStoryArcs';
import WorldCupSetup from './WorldCupSetup';
import WorldCupEvent from './WorldCupEvent';
import WorldCupDashboard from './WorldCupDashboard';
import WorldCupFormation from './WorldCupFormation';
import WorldCupTeamTalk from './WorldCupTeamTalk';
// import WorldCupMidMatch from './WorldCupMidMatch'; // unused — halftime handled in LiveMatch
import WorldCupLiveMatch from './WorldCupLiveMatch';
import WorldCupPress from './WorldCupPress';
import WorldCupPenalties from './WorldCupPenalties';
import WorldCupPerks from './WorldCupPerks';
import WorldCupResult from './WorldCupResult';
import WorldCupGameOver from './WorldCupGameOver';
import ResourceBars from './ResourceBars';
import './WorldCup.scss';

/*
  FLOW: setup → [event → formation → teamTalk → livematch → (halftime) → press → (perks?) → dashboard] → result/gameover
*/

const DEFAULT_FORMATIONS = ['4-3-3', '4-4-2', '3-5-2'];
const ALL_FORMATIONS = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '4-1-4-1', '5-3-2', '3-4-3'];

export default function WorldCup({ onExit }) {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith('es');

  const [screen, setScreen] = useState('setup');
  const [wcState, setWcState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentFixture, setCurrentFixture] = useState(null);
  const [lineup, setLineup] = useState(null);
  const [teamTalkBonus, setTeamTalkBonus] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [matchEvents, setMatchEvents] = useState([]);
  const [matchScore, setMatchScore] = useState(null);
  const [lastMatchResult, setLastMatchResult] = useState(null);
  const [resultType, setResultType] = useState(null);
  const [gameOverReason, setGameOverReason] = useState(null);
  const [showPerks, setShowPerks] = useState(false);
  const [pendingPenalties, setPendingPenalties] = useState(null);
  const pendingPenaltiesRef = useRef(null);
  const [liveMatchData, setLiveMatchData] = useState(null);
  const liveMatchDataRef = useRef(null);

  // Load teams
  useEffect(() => {
    fetch('/data/national-teams.json')
      .then(r => r.json())
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  // ── SETUP ──
  const handleSelectTeam = useCallback((team) => {
    const sorted = [...teams].sort((a, b) => a.fifaRanking - b.fifaRanking);
    const state = generateWorldCup(sorted, team.id);
    state.playerSquad = team.players || [];
    state.perks = {};
    state.skillPoints = 0;
    state.suspendedPlayers = [];
    state.injuredPlayers = [];
    state.matchHistory = [];
    // Deep gameplay state
    state.playerBuffs = {};
    state.teamBuffs = [];
    state.opponentDebuffs = [];
    state.conflictPairs = [];
    state.opponentRevealed = false;
    state.penaltyBonus = false;
    // Feature 4: Narrative system
    state.narrative = { pressHostility: 0, playerLoyalty: 0, tacticalReputation: 0 };
    // Feature 5: Star player
    const star = (team.players || []).reduce((best, p) => (!best || (p.rating || 0) > (best.rating || 0)) ? p : best, null);
    state.starPlayer = star ? star.name : null;
    // Feature 6: Formation unlocking
    state.unlockedFormations = [...DEFAULT_FORMATIONS];
    // Feature 7: Story Arcs
    const arcInit = initStoryArcs();
    state.storyArcs = arcInit.storyArcs;
    state.arcFlags = arcInit.arcFlags;
    state.arcChaptersShown = arcInit.arcChaptersShown;
    setWcState(state);
    triggerEvent(state);
  }, [teams]);

  // ── EVENT ──
  const triggerEvent = useCallback((state) => {
    // Feature 7: Check for story arc chapter first
    const arcEvt = pickStoryArcEvent(state);
    if (arcEvt) {
      setCurrentEvent(arcEvt);
      setScreen('event');
      return;
    }
    // Feature 4: Check for narrative-triggered events first
    const narrativeEvt = pickNarrativeEvent(state);
    if (narrativeEvt) {
      setCurrentEvent(narrativeEvt);
      setScreen('event');
      return;
    }
    // Feature 5: Random chance for star player event
    const starEvt = pickStarPlayerEvent(state);
    if (starEvt) {
      setCurrentEvent(starEvt);
      setScreen('event');
      return;
    }

    const evt = pickEvent({
      phase: state.phase,
      morale: state.morale,
      fitness: state.fitness,
      pressure: state.pressure,
      budget: state.budget,
      usedEvents: state.usedEvents,
      pendingChains: state.pendingChains,
    });
    setCurrentEvent(evt);
    setScreen('event');
  }, []);

  const handleEventChoice = useCallback((choice, side) => {
    setWcState(prev => {
      // doubleOrNothing — double the effects of this event
      let effectiveChoice = choice;
      if (prev.doubleOrNothing) {
        effectiveChoice = { ...choice, effects: {} };
        for (const [k, v] of Object.entries(choice.effects)) {
          effectiveChoice.effects[k] = v * 2;
        }
      }
      let ns = applyChoice(prev, effectiveChoice);
      if (prev.doubleOrNothing) delete ns.doubleOrNothing;
      // mediaBlackout — freeze pressure changes
      if (prev.mediaBlackout && prev.mediaBlackout > 0) {
        ns.pressure = prev.pressure; // revert pressure change
        ns.mediaBlackout = prev.mediaBlackout - 1;
        if (ns.mediaBlackout <= 0) delete ns.mediaBlackout;
      }
      ns.usedEvents = [...(ns.usedEvents || []), currentEvent.id];
      if (ns.pendingChains?.includes(currentEvent.id)) {
        ns.pendingChains = ns.pendingChains.filter(id => id !== currentEvent.id);
      }
      ns.eventHistory = [...(ns.eventHistory || []), { eventId: currentEvent.id, choice: side }];

      // Feature 7: Process story arc choice
      if (currentEvent.isStoryArc) {
        ns = processArcChoice(ns, currentEvent, choice);
      }

      // Feature 4: Update narrative counters based on event category + choice
      ns.narrative = { ...(ns.narrative || { pressHostility: 0, playerLoyalty: 0, tacticalReputation: 0 }) };
      if (currentEvent.category === 'press') {
        if (side === 'A') ns.narrative.pressHostility += 1;
      }
      if (currentEvent.category === 'camp' || currentEvent.category === 'personal') {
        if (side === 'A') ns.narrative.playerLoyalty += 1;
      }
      if (currentEvent.category === 'tactical') {
        if (side === 'A') ns.narrative.tacticalReputation += 1;
      }

      if (choice.playerEffect) {
        const pe = choice.playerEffect;
        if (pe.target === 'randomStarter' && pe.suspended) {
          const available = (ns.playerSquad || []).filter(p => !ns.suspendedPlayers?.includes(p.name) && !ns.injuredPlayers?.includes(p.name));
          if (available.length > 0) {
            const victim = available[Math.floor(Math.random() * available.length)];
            ns.suspendedPlayers = [...(ns.suspendedPlayers || []), victim.name];
          }
        }
      }

      // ── Deep gameplay effect processing ──
      // NOTE: playerBuff, teamBuff, opponentDebuff are already handled in applyChoice()
      // Only process extended targets (captain, youngBest, randomBench, randomStarter) here
      if (choice.playerBuff && ['captain', 'youngBest', 'randomBench', 'randomStarter'].includes(choice.playerBuff.target)) {
        const pb = choice.playerBuff;
        ns.playerBuffs = { ...(ns.playerBuffs || {}) };
        let targetName = null;
        if (pb.target === 'captain') {
          const cap = (ns.playerSquad || []).reduce((best, p) => (!best || (p.rating || 0) > (best.rating || 0)) ? p : best, null);
          targetName = cap?.name;
        } else if (pb.target === 'youngBest') {
          const young = (ns.playerSquad || []).filter(p => (p.age || 30) < 23).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
          targetName = young?.name;
        } else if (pb.target === 'randomBench') {
          const bench = (ns.playerSquad || []).slice(11);
          const pick = bench[Math.floor(Math.random() * bench.length)];
          targetName = pick?.name;
        } else if (pb.target === 'randomStarter') {
          const available = (ns.playerSquad || []).slice(0, 11);
          const pick = available[Math.floor(Math.random() * available.length)];
          targetName = pick?.name;
        }
        if (targetName) {
          ns.playerBuffs[targetName] = { ratingMod: pb.ratingMod, duration: pb.duration };
        }
      }

      if (choice.teamBuff) {
        const tb = choice.teamBuff;
        ns.teamBuffs = [...(ns.teamBuffs || [])];
        // Mystery package: 50/50 positive or negative
        if (tb.type === 'mystery') {
          const val = Math.random() < 0.5 ? 5 : -5;
          ns.teamBuffs.push({ ...tb, value: val });
        } else {
          ns.teamBuffs.push({ ...tb });
        }
      }

      // opponentDebuff already handled in applyChoice()

      if (choice.conflictPair) {
        const available = (ns.playerSquad || []).filter(p => !ns.suspendedPlayers?.includes(p.name));
        if (available.length >= 2) {
          const i = Math.floor(Math.random() * available.length);
          let j = Math.floor(Math.random() * (available.length - 1));
          if (j >= i) j++;
          ns.conflictPairs = [...(ns.conflictPairs || []), [available[i].name, available[j].name]];
        }
      }

      // opponentRevealed already handled in applyChoice()

      if (choice.clearInjuries) {
        ns.injuredPlayers = [];
      }

      if (choice.injureRandom) {
        const count = choice.injureRandom;
        const available = (ns.playerSquad || []).filter(p => !(ns.injuredPlayers || []).includes(p.name));
        const victims = [];
        for (let i = 0; i < count && available.length > 0; i++) {
          const idx = Math.floor(Math.random() * available.length);
          victims.push(available[idx].name);
          available.splice(idx, 1);
        }
        ns.injuredPlayers = [...(ns.injuredPlayers || []), ...victims];
      }

      if (choice.penaltyBonus) {
        ns.penaltyBonus = true;
      }

      if (choice.groupTableChange === 'dopingDisqualify') {
        // Find a random non-player team in player's group and zero their points
        if (ns.groups && ns.playerTeamId) {
          const playerGroup = ns.groups.find(g => g.teams?.includes(ns.playerTeamId));
          if (playerGroup) {
            const others = (playerGroup.teams || []).filter(t => t !== ns.playerTeamId);
            if (others.length > 0) {
              const victimId = others[Math.floor(Math.random() * others.length)];
              // Zero out their table entry (correct field name)
              if (playerGroup.table) {
                const entry = playerGroup.table.find(s => s.teamId === victimId);
                if (entry) { entry.points = 0; entry.goalsFor = 0; entry.goalsAgainst = 0; entry.won = 0; entry.drawn = 0; entry.lost = entry.played || 0; }
              }
            }
          }
        }
      }

      const gameOver = checkGameOver(ns);
      if (gameOver) {
        setTimeout(() => { setGameOverReason(gameOver); setScreen('gameover'); }, 800);
        return ns;
      }

      const fixture = getPlayerNextMatch(ns);
      if (fixture) {
        setCurrentFixture(fixture);
        ns.currentFixture = fixture;
        setPrediction(null);
        setTimeout(() => setScreen('formation'), 800);
      } else {
        setTimeout(() => setScreen('dashboard'), 800);
      }
      return ns;
    });
  }, [currentEvent]);

  // ── FORMATION ──
  const handleFormationConfirm = useCallback((selectedLineup) => {
    setLineup(selectedLineup);
    setScreen('teamTalk');
  }, []);

  // ── TEAM TALK ──
  const simulateMatchRef = useRef(null);
  const handleTeamTalk = useCallback((bonus) => {
    setTeamTalkBonus(bonus);
    // Start match simulation immediately, then go to live match
    simulateMatchRef.current?.(bonus);
  }, []);

  // ── MATCH SIMULATION ──
  const simulateMatch = useCallback((bonus) => {
    setWcState(prev => {
      const state = { ...prev };
      const fixture = state.currentFixture || currentFixture;
      if (!fixture) return state;

      let ns = simulateMatchday(state, state.playerTeamId);

      const isHome = fixture.home === ns.playerTeamId;
      const opponentId = isHome ? fixture.away : fixture.home;
      const playerTeam = teams.find(t => t.id === ns.playerTeamId);
      const opponentTeam = teams.find(t => t.id === opponentId);

      let playerRating = playerTeam?.rating || 75;
      let opponentRating = opponentTeam?.rating || 70;

      if (ns.morale < 30) playerRating -= 5;
      if (ns.fitness < 30) playerRating -= 4;
      if (ns.pressure > 70) playerRating -= 3;

      // Team talk bonus — minor rating bump
      if (bonus) {
        if (bonus.id === 'allOut') playerRating += 2;
        if (bonus.id === 'possession') playerRating += 1;
      }

      // ── Spy intel bonus: if opponent revealed and team talk matches recommended tactic ──
      const SPY_TACTIC_MAP = {
        defensive: ['possession', 'allOut'],
        offensive: ['counter', 'parkBus'],
        balanced: ['possession', 'counter'],
        'counter-attack': ['possession', 'allOut'],
        possession: ['counter', 'parkBus'],
        physical: ['possession', 'counter'],
      };
      if (ns.opponentRevealed && bonus?.id) {
        const oppStyle = opponentTeam?.style || 'balanced';
        const recommended = SPY_TACTIC_MAP[oppStyle] || [];
        if (recommended.includes(bonus.id)) {
          playerRating += 3;
        }
      }

      // ── Apply perk effects ──
      if (ns.perks) {
        // Leyenda Viva: star plays at 130% in knockout (quarters+)
        if (ns.perks.mot3 && (ns.phase === 'knockout' || ns.phase === 'quarter' || ns.phase === 'semi' || ns.phase === 'final')) {
          playerRating += 5;
        }
        // Muro de Hielo: +3 rating when pressure > 70
        if (ns.perks.mot2 && (ns.pressure || 30) > 70) {
          playerRating += 3;
        }
        // Máquinas: +3 rating in 2nd half (applied as overall boost since sim is abstract)
        if (ns.perks.phy2) {
          playerRating += 2; // Slightly less than 3 since it's "2nd half only" but sim is full match
        }
      }

      // ── Apply deep gameplay buffs ──
      // Team buffs
      if (ns.teamBuffs?.length > 0) {
        for (const buff of ns.teamBuffs) {
          playerRating += buff.value;
        }
      }
      // Opponent debuffs
      if (ns.opponentDebuffs?.length > 0) {
        for (const debuff of ns.opponentDebuffs) {
          opponentRating -= debuff.value;
        }
      }
      // Player buffs — average boost weighted by squad
      if (ns.playerBuffs && Object.keys(ns.playerBuffs).length > 0) {
        let totalBuff = 0;
        let buffCount = 0;
        for (const [name, buff] of Object.entries(ns.playerBuffs)) {
          if ((ns.playerSquad || []).some(p => p.name === name)) {
            totalBuff += buff.ratingMod;
            buffCount++;
          }
        }
        if (buffCount > 0) {
          playerRating += Math.round(totalBuff / 3); // Scaled down since it's individual buffs
        }
      }
      // Conflict pairs penalty — if both in lineup
      if (ns.conflictPairs?.length > 0) {
        for (const [p1, p2] of ns.conflictPairs) {
          const squad11 = (ns.playerSquad || []).slice(0, 11).map(p => p.name);
          if (squad11.includes(p1) && squad11.includes(p2)) {
            playerRating -= 3; // Penalty for conflict in lineup
          }
        }
      }
      // Reset opponentRevealed after use (per-event, not per-perk)
      ns.opponentRevealed = false;

      // Feature 3: Rival personality modifiers
      const oppStyle = opponentTeam?.style || 'balanced';
      let pGoalMod = 0, oGoalMod = 0, cardMod = 0;
      if (oppStyle === 'defensive') { oGoalMod = -0.3; pGoalMod = -0.2; }
      if (oppStyle === 'offensive') { oGoalMod = 0.3; pGoalMod = 0.2; }
      if (oppStyle === 'physical') { cardMod = 0.15; }
      if (oppStyle === 'counter-attack') { oGoalMod = 0.1; pGoalMod = -0.1; }
      if (oppStyle === 'possession') { pGoalMod = -0.1; }

      // ── Apply new special effects ──
      // nextMatchBonus (legacy)
      if (ns.nextMatchBonus) {
        if (ns.nextMatchBonus.defense) playerRating += Math.round(ns.nextMatchBonus.defense / 3);
        if (ns.nextMatchBonus.goals) pGoalMod += ns.nextMatchBonus.goals * 0.4;
      }
      // ── Narrative v2: currentMatchBonus ──
      if (ns.currentMatchBonus) {
        playerRating += ns.currentMatchBonus;
        delete ns.currentMatchBonus;
      }
      // ── Narrative v2: nextMatchBoost (applied this match, set last event) ──
      if (ns.nextMatchBoost) {
        playerRating += ns.nextMatchBoost.rating || 0;
        delete ns.nextMatchBoost;
      }
      // ── Narrative v2: nextMatchInjuryRisk ──
      if (ns.nextMatchInjuryRisk) {
        if (Math.random() < ns.nextMatchInjuryRisk) {
          // Injure star player
          if (ns.starPlayer && !(ns.injuredPlayers || []).includes(ns.starPlayer)) {
            ns.injuredPlayers = [...(ns.injuredPlayers || []), ns.starPlayer];
          }
        }
        delete ns.nextMatchInjuryRisk;
      }
      // ── Narrative v2: riskRecurrence — chance of -3 rating penalty ──
      if (ns.riskRecurrence) {
        if (Math.random() < ns.riskRecurrence) {
          playerRating -= 3;
        }
        delete ns.riskRecurrence;
      }
      // rivalWeakened — opponent star is out
      if (ns.rivalWeakened) {
        oGoalMod -= 0.5;
      }
      // tacticsLeaked — opponent knows your plan
      if (ns.tacticsLeaked) {
        oGoalMod += 0.3;
      }
      // cardRisk — higher card chance (handled below in card section)

      // ════════════════════════════════════════════
      // ⚡ MATCH MODIFIERS — tangible gameplay consequences from events
      // ════════════════════════════════════════════
      const mods = ns.matchModifiers || {};

      // playerOnFire — star plays amazing
      if (mods.playerOnFire) {
        playerRating += 5;
      }
      // playerNerfed — star plays badly
      if (mods.playerNerfed) {
        playerRating -= 5;
      }
      // lowScoringMatch — fewer goals both sides
      if (mods.lowScoringMatch) {
        playerRating -= 3;
        opponentRating -= 3;
      }
      // highScoringMatch — more goals both sides
      if (mods.highScoringMatch) {
        playerRating += 3;
        opponentRating += 3;
      }
      // playerSuspended — random player can't play, team weaker
      if (mods.playerSuspended) {
        playerRating -= 3;
      }
      // playerProtected — star guaranteed safe (handled post-match)
      // comebackPower — handled after halftime below
      // winStreakBonus / loseStreakPenalty — handled post-match

      const homeAdv = isHome ? 0.3 : 0;
      let pExpected = Math.max(0.3, (playerRating / 100) * 2.2 + homeAdv + pGoalMod);
      let oExpected = Math.max(0.3, (opponentRating / 100) * 1.8 + (isHome ? 0 : 0.2) + oGoalMod);

      // ── Apply team talk matchEffects (goal modifiers) ──
      if (bonus?.matchEffects) {
        const me = bonus.matchEffects;
        if (me.playerGoalMod) pExpected *= (1 + me.playerGoalMod);
        if (me.opponentGoalMod) oExpected *= (1 + me.opponentGoalMod);
      }
      pExpected = Math.max(0.2, pExpected);
      oExpected = Math.max(0.1, oExpected);

      let playerGoals = poissonRandom(pExpected);
      let opponentGoals = poissonRandom(oExpected);

      // Possession comeback penalty: if opponent scores and you don't, remove one of your goals
      if (bonus?.matchEffects?.comebackPenalty && opponentGoals > 0 && playerGoals > opponentGoals) {
        if (Math.random() < 0.4) playerGoals = Math.max(0, playerGoals - 1);
      }

      // Perk: Discurso épico - 30% of scoring when losing
      if (ns.perks?.mot1 && opponentGoals > playerGoals && Math.random() < 0.30) {
        playerGoals += 1;
      }

      // ── Match Modifier: extra goal chances ──
      if (mods.extraGoalChance && Math.random() < (mods.extraGoalChance.percent / 100)) {
        playerGoals += 1;
      }
      if (mods.opponentExtraGoal && Math.random() < (mods.opponentExtraGoal.percent / 100)) {
        opponentGoals += 1;
      }
      // cleanSheet — chance opponent scores 0
      if (mods.cleanSheet && Math.random() < (mods.cleanSheet.percent / 100)) {
        opponentGoals = 0;
      }
      // concedeLate — chance of late opponent goal
      if (mods.concedeLate && Math.random() < (mods.concedeLate.percent / 100)) {
        opponentGoals += 1;
      }
      // comebackPower — if losing at "halftime" (simulate: if opp > player after initial calc), big boost
      if (mods.comebackPower && opponentGoals > playerGoals) {
        // Massive 2nd half surge
        if (Math.random() < 0.6) playerGoals += 1;
        if (Math.random() < 0.35) playerGoals += 1;
      }

      const events = [];
      const usedMinutes = new Set();
      const getMinute = (half) => {
        const min = half === 1 ? 1 : 46;
        const max = half === 1 ? 45 : 90;
        let m;
        do { m = min + Math.floor(Math.random() * (max - min + 1)); } while (usedMinutes.has(m));
        usedMinutes.add(m);
        return m;
      };

      const playerPlayers = ns.playerSquad || [];
      const attackers = playerPlayers.filter(p => ['ST', 'CF', 'RW', 'LW', 'CAM'].includes(p.position));
      const midfielders = playerPlayers.filter(p => ['CM', 'CDM', 'RM', 'LM'].includes(p.position));
      const scorers = [...attackers, ...attackers, ...midfielders];

      // Feature 5: Star player more likely to score
      if (ns.starPlayer) {
        const starP = playerPlayers.find(p => p.name === ns.starPlayer);
        if (starP) { scorers.push(starP, starP, starP); } // triple chance
      }
      // playerOnFire — star even MORE likely to score
      if (mods.playerOnFire && ns.starPlayer) {
        const starP = playerPlayers.find(p => p.name === ns.starPlayer);
        if (starP) { scorers.push(starP, starP, starP, starP, starP); } // dominate scoring
      }

      // Goals
      for (let i = 0; i < playerGoals; i++) {
        const scorer = scorers[Math.floor(Math.random() * scorers.length)] || playerPlayers[0];
        const half = i < Math.ceil(playerGoals / 2) ? 1 : 2;
        events.push({ type: 'goal', minute: getMinute(half), team: 'player', player: scorer?.name || 'Unknown' });
      }
      for (let i = 0; i < opponentGoals; i++) {
        const half = i < Math.ceil(opponentGoals / 2) ? 1 : 2;
        events.push({ type: 'goal', minute: getMinute(half), team: 'opponent', player: `${opponentTeam?.name || 'Rival'} #${Math.floor(Math.random() * 11) + 1}` });
      }

      // ── Match Modifier: penaltyGuaranteed ──
      if (mods.penaltyGuaranteed) {
        const penForPlayer = Math.random() < 0.5;
        const penMinute = getMinute(Math.random() < 0.5 ? 1 : 2);
        if (penForPlayer) {
          const penScorer = scorers[Math.floor(Math.random() * scorers.length)] || playerPlayers[0];
          const scored = Math.random() < 0.75;
          events.push({ type: scored ? 'goal' : 'nearMiss', minute: penMinute, team: 'player', player: penScorer?.name || 'Unknown', isPenalty: true });
          if (scored) playerGoals += 1;
        } else {
          const scored = Math.random() < 0.7;
          events.push({ type: scored ? 'goal' : 'save', minute: penMinute, team: 'opponent', player: `${opponentTeam?.name || 'Rival'} #9`, isPenalty: true });
          if (scored) opponentGoals += 1;
        }
      }

      // ── Match Modifier: concedeLate goal event at minute 85+ ──
      if (mods.concedeLate) {
        // The goal was already added above; ensure one opp goal is late
        const oppGoalEvents = events.filter(e => e.type === 'goal' && e.team === 'opponent');
        if (oppGoalEvents.length > 0) {
          const lastOpp = oppGoalEvents[oppGoalEvents.length - 1];
          if (lastOpp.minute < 80) {
            usedMinutes.delete(lastOpp.minute);
            lastOpp.minute = 85 + Math.floor(Math.random() * 5);
            usedMinutes.add(lastOpp.minute);
          }
        }
      }

      // Cards
      const noCards = ns.nextMatchBonus?.noCards;
      const cardRiskMod = ns.cardRisk ? 0.2 : 0;
      const yellowChance = noCards ? 0 : 0.4 + cardMod + (bonus?.matchEffects?.yellowCardMod || 0) + cardRiskMod;
      const redChance = noCards ? 0 : 0.15 + (bonus?.matchEffects?.redCardMod || 0) + cardMod + cardRiskMod;
      if (Math.random() < yellowChance) {
        const carded = playerPlayers[Math.floor(Math.random() * Math.min(11, playerPlayers.length))];
        events.push({ type: 'yellow', minute: getMinute(Math.random() < 0.5 ? 1 : 2), team: 'player', player: carded?.name || 'Unknown' });
      }
      if (!ns.perks?.phy3 && Math.random() < redChance) {
        const carded = playerPlayers[Math.floor(Math.random() * Math.min(11, playerPlayers.length))];
        // playerProtected: star can't get carded
        if (!(mods.playerProtected && carded?.name === ns.starPlayer)) {
          events.push({ type: 'red', minute: getMinute(2), team: 'player', player: carded?.name || 'Unknown' });
          if (carded) ns.suspendedPlayers = [...(ns.suspendedPlayers || []), carded.name];
        }
      }

      // ── Match Modifier: redCardRisk ──
      if (mods.redCardRisk && Math.random() < (mods.redCardRisk.percent / 100)) {
        const targetTeam = mods.redCardRisk.team || 'player';
        if (targetTeam === 'player') {
          const carded = playerPlayers[Math.floor(Math.random() * Math.min(11, playerPlayers.length))];
          if (carded && !(mods.playerProtected && carded.name === ns.starPlayer)) {
            events.push({ type: 'red', minute: getMinute(2), team: 'player', player: carded.name });
            ns.suspendedPlayers = [...(ns.suspendedPlayers || []), carded.name];
            playerGoals = Math.max(0, playerGoals - (Math.random() < 0.3 ? 1 : 0)); // may lose a goal from being a man down
          }
        } else {
          events.push({ type: 'red', minute: getMinute(2), team: 'opponent', player: `${opponentTeam?.name || 'Rival'} #${Math.floor(Math.random() * 11) + 1}` });
          opponentGoals = Math.max(0, opponentGoals - (Math.random() < 0.3 ? 1 : 0));
        }
      }

      // ── Match Modifier: nextMatchBan (for NEXT match, store it) ──
      if (mods.nextMatchBan) {
        if (mods.nextMatchBan.who === 'star' && ns.starPlayer) {
          ns.suspendedNextMatch = ns.starPlayer;
        }
      }

      // ── Clear match modifiers after use ──
      ns.matchModifiers = {};

      // Feature 1: Extra narrative events
      const extraCount = 8 + Math.floor(Math.random() * 6);
      for (let i = 0; i < extraCount; i++) {
        const half = Math.random() < 0.5 ? 1 : 2;
        const roll = Math.random();
        const team = Math.random() < 0.5 ? 'player' : 'opponent';
        const player = team === 'player'
          ? (playerPlayers[Math.floor(Math.random() * Math.min(11, playerPlayers.length))]?.name || 'Unknown')
          : `${opponentTeam?.name || 'Rival'} #${Math.floor(Math.random() * 11) + 1}`;

        let type;
        if (oppStyle === 'defensive') {
          // More blocks/saves
          if (roll < 0.3) type = 'save';
          else if (roll < 0.5) type = 'foul';
          else if (roll < 0.7) type = 'possession';
          else if (roll < 0.85) type = 'chance';
          else type = 'nearMiss';
        } else if (oppStyle === 'offensive') {
          // More shots
          if (roll < 0.35) type = 'chance';
          else if (roll < 0.55) type = 'nearMiss';
          else if (roll < 0.7) type = 'save';
          else if (roll < 0.85) type = 'corner';
          else type = 'foul';
        } else {
          if (roll < 0.2) type = 'chance';
          else if (roll < 0.35) type = 'save';
          else if (roll < 0.5) type = 'nearMiss';
          else if (roll < 0.65) type = 'foul';
          else if (roll < 0.8) type = 'possession';
          else if (roll < 0.9) type = 'corner';
          else type = 'freeKick';
        }

        events.push({ type, minute: getMinute(half), team, player });
      }

      events.sort((a, b) => a.minute - b.minute);

      const playerGoalScorers = events.filter(e => e.type === 'goal' && e.team === 'player');
      const motm = playerGoalScorers.length > 0 ? playerGoalScorers[0].player : (playerPlayers[Math.floor(Math.random() * Math.min(11, playerPlayers.length))]?.name || 'Unknown');

      const homeScore = isHome ? playerGoals : opponentGoals;
      const awayScore = isHome ? opponentGoals : playerGoals;

      // Store live match data for narration screen
      const liveData = {
        events,
        homeScore,
        awayScore,
        playerGoals,
        opponentGoals,
        motm,
        isHome,
        fixture,
        opponentTeam,
        playerTeam,
        isKnockoutDraw: ns.phase !== 'groups' && homeScore === awayScore,
      };

      setLiveMatchData(liveData);
      liveMatchDataRef.current = liveData;
      setScreen('livematch');
      return ns;
    });
  }, [currentFixture, teams]);
  simulateMatchRef.current = simulateMatch;

  // Keep liveMatchData ref in sync
  useEffect(() => { liveMatchDataRef.current = liveMatchData; }, [liveMatchData]);

  // ── LIVE MATCH COMPLETE ──
  const handleLiveMatchComplete = useCallback(() => {
    const ld = liveMatchDataRef.current;
    if (!ld) return;

    if (ld.isKnockoutDraw) {
      setMatchEvents(ld.events);
      setMatchScore({ home: ld.homeScore, away: ld.awayScore, motm: ld.motm, events: ld.events, isHome: ld.isHome, fixture: ld.fixture, opponentTeam: ld.opponentTeam });
      setWcState(prev => {
        setPendingPenalties({ fixture: ld.fixture, homeScore: ld.homeScore, awayScore: ld.awayScore, ns: prev, events: ld.events, motm: ld.motm, isHome: ld.isHome, opponentTeam: ld.opponentTeam });
        return prev;
      });
      setTimeout(() => setScreen('penalties'), 500);
      return;
    }

    setWcState(prev => {
      let ns = { ...prev };
      const { fixture, homeScore, awayScore, playerGoals, opponentGoals, motm, isHome, opponentTeam } = ld;

      // Clear suspensions (1-match ban served)
      ns.suspendedPlayers = [];

      // Random injury chance (10%) — one player injured for 1 match
      // Perk: Hierro - no injuries
      if (!ns.perks?.phy1 && Math.random() < 0.10 && ns.playerSquad?.length > 0) {
        const available = ns.playerSquad.filter(p => !(ns.injuredPlayers || []).includes(p.name));
        if (available.length > 0) {
          const victim = available[Math.floor(Math.random() * available.length)];
          ns.injuredPlayers = [...(ns.injuredPlayers || []), victim.name];
        }
      }
      // Clear injuries that have served their 1-match recovery (decrement instead of wipe)
      // Injuries persist until the next match cycle; only remove those already "served"
      // For simplicity, injuries last 1 match — remove those carried over from the previous match
      if (ns._injuriesServed) {
        ns.injuredPlayers = (ns.injuredPlayers || []).filter(name => !ns._injuriesServed.includes(name));
        delete ns._injuriesServed;
      }
      // Mark current injuries to be cleared next match
      ns._injuriesServed = [...(ns.injuredPlayers || [])];

      // Add new red card suspensions from this match
      const redCards = ld.events.filter(e => e.type === 'red' && e.team === 'player');
      if (redCards.length > 0) {
        ns.suspendedPlayers = redCards.map(e => e.player);
      }

      ns = recordPlayerMatch(ns, fixture, homeScore, awayScore);

      const actualResult = playerGoals > opponentGoals ? 'win' : (playerGoals < opponentGoals ? 'lose' : 'draw');
      setLastMatchResult(actualResult);

      // Perk: Mentalista (tac1) — check manual prediction
      if (prediction && ns.perks?.tac1) {
        const pHome = isHome ? prediction.home : prediction.away;
        const pAway = isHome ? prediction.away : prediction.home;
        if (pHome === playerGoals && pAway === opponentGoals) {
          ns.morale = Math.min(100, (ns.morale || 60) + 5);
          ns.fitness = Math.min(100, (ns.fitness || 60) + 5);
          ns.budget = Math.min(100, (ns.budget || 60) + 5);
          ns.pressure = Math.max(0, (ns.pressure || 50) - 5);
        }
      }

      if (actualResult === 'win') {
        ns.morale = Math.min(100, ns.morale + 10);
        ns.pressure = Math.max(0, ns.pressure - 5);
        ns.skillPoints = (ns.skillPoints || 0) + 1;
        // Feature 6: Unlock a random formation on win
        ns = unlockRandomFormation(ns);
        // winStreakBonus — next match gets +5 rating
        if (ns.winStreakBonus) {
          ns.nextMatchBoost = { rating: 5 };
          delete ns.winStreakBonus;
        }
        // loseStreakPenalty — clear it on win
        if (ns.loseStreakPenalty) delete ns.loseStreakPenalty;
      } else if (actualResult === 'lose') {
        ns.morale = Math.max(0, ns.morale - 10);
        ns.pressure = Math.min(100, ns.pressure + 10);
        // Autobús extra morale penalty on loss
        if (teamTalkBonus?.matchEffects?.moralePenaltyOnLoss) {
          ns.morale = Math.max(0, ns.morale - teamTalkBonus.matchEffects.moralePenaltyOnLoss);
        }
        // loseStreakPenalty — next match gets -5 rating
        if (ns.loseStreakPenalty) {
          ns.nextMatchBoost = { rating: -5 };
          delete ns.loseStreakPenalty;
        }
        // winStreakBonus — clear it on loss
        if (ns.winStreakBonus) delete ns.winStreakBonus;
      }
      ns.fitness = Math.max(0, ns.fitness - 5);

      // suspendedNextMatch — apply star suspension for NEXT match
      if (ns.suspendedNextMatch) {
        ns.suspendedPlayers = [...(ns.suspendedPlayers || []), ns.suspendedNextMatch];
        delete ns.suspendedNextMatch;
      }

      // ── Apply new special effects post-match ──
      // moraleSwing — conditional on result
      if (ns.moraleSwing) {
        if (actualResult === 'win' && ns.moraleSwing.winBonus) {
          ns.morale = Math.min(100, ns.morale + ns.moraleSwing.winBonus);
        }
        if (actualResult === 'lose' && ns.moraleSwing.losePenalty) {
          ns.morale = Math.max(0, ns.morale + ns.moraleSwing.losePenalty);
        }
        delete ns.moraleSwing;
      }
      // moraleCollapse — big penalty on loss
      if (ns.moraleCollapse && actualResult === 'lose') {
        ns.morale = Math.max(0, ns.morale + (ns.moraleCollapse.losePenalty || -25));
      }
      delete ns.moraleCollapse;
      // fanRevolt — pressure +20 if not win
      if (ns.fanRevolt && actualResult !== 'win') {
        ns.pressure = Math.min(100, ns.pressure + 20);
      }
      delete ns.fanRevolt;
      // fanBoost — gradual morale over matches
      if (ns.fanBoost) {
        ns.morale = Math.min(100, ns.morale + (ns.fanBoost.moralPerMatch || 0));
        ns.fanBoost.duration = (ns.fanBoost.duration || 1) - 1;
        if (ns.fanBoost.duration <= 0) delete ns.fanBoost;
      }
      // mediaBlackout — decrement counter
      if (ns.mediaBlackout && ns.mediaBlackout > 0) {
        ns.mediaBlackout--;
        if (ns.mediaBlackout <= 0) delete ns.mediaBlackout;
      }
      // Clear one-shot effects
      delete ns.nextMatchBonus;
      delete ns.rivalWeakened;
      delete ns.tacticsLeaked;
      delete ns.cardRisk;
      delete ns.formationForced;
      delete ns.pressureSurge;

      // ── Perk enforcement ──
      // (mot2 Muro de Hielo and phy2 Máquinas now apply as rating boosts in match sim above)

      ns = resolveChains(ns, actualResult);

      // ── Decrement buff/debuff durations ──
      if (ns.playerBuffs) {
        const newBuffs = {};
        for (const [name, buff] of Object.entries(ns.playerBuffs)) {
          const remaining = buff.duration - 1;
          if (remaining > 0) newBuffs[name] = { ...buff, duration: remaining };
        }
        ns.playerBuffs = newBuffs;
      }
      if (ns.teamBuffs?.length > 0) {
        ns.teamBuffs = ns.teamBuffs.map(b => ({ ...b, duration: b.duration - 1 })).filter(b => b.duration > 0);
      }
      if (ns.opponentDebuffs?.length > 0) {
        ns.opponentDebuffs = ns.opponentDebuffs.map(d => ({ ...d, duration: d.duration - 1 })).filter(d => d.duration > 0);
      }

      if (ns.phase === 'groups') {
        ns.currentMatchday++;
        // Check if player finished bottom of group BEFORE transitioning
        const playerGroup = ns.groups?.find(g => g.teams.includes(ns.playerTeamId));
        const allGroupPlayed = playerGroup && ns.groupFixtures.filter(f => f.group === playerGroup.name).every(f => f.played);
        if (allGroupPlayed) {
          const playerPos = playerGroup.table.findIndex(t => t.teamId === ns.playerTeamId);
          if (playerPos > 1) {
            // Player eliminated in group stage — don't transition to knockout
            ns.eliminatedInGroups = true;
          }
        }
        if (ns.currentMatchday >= 3) ns = checkGroupStageComplete(ns);
      } else {
        ns = advanceKnockout(ns);
      }

      ns.matchHistory = [...(ns.matchHistory || []), { homeScore, awayScore, isHome, opponent: opponentTeam?.name, motm, result: actualResult }];

      setMatchEvents(ld.events);
      setMatchScore({ home: homeScore, away: awayScore, motm, events: ld.events, isHome, fixture, opponentTeam });

      if (ns.eliminatedInGroups || isPlayerEliminated(ns)) {
        setTimeout(() => { setResultType('eliminated'); setScreen('result'); }, 500);
        return ns;
      }
      if (isWorldCupWinner(ns)) {
        setTimeout(() => { setResultType('champion'); setScreen('result'); }, 500);
        return ns;
      }

      const pressEvt = pickPostMatchPress(ns, actualResult);
      ns.currentPressEvent = pressEvt;

      setTimeout(() => setScreen('press'), 500);
      return ns;
    });
  }, []);

  // ── HALFTIME CHOICE ──
  const handleHalftimeChoice = useCallback((choice) => {
    if (!liveMatchData) return;
    // Modify second-half events based on choice
    setLiveMatchData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, events: [...prev.events] };
      // Will update ref after state settles (see below)
      const secondHalfEvents = updated.events.filter(e => e.minute >= 46);

      const htMult = wcState?.perks?.tac3 ? 2 : 1; // Lectura de juego: double effect
      const squad = wcState?.playerSquad || [];
      const attackers = squad.filter(p => ['ST','CF','RW','LW','CAM'].includes(p.position));
      const getScorer = () => attackers[Math.floor(Math.random() * attackers.length)];
      const addPlayerGoal = (min) => {
        const s = getScorer();
        if (!s) return;
        updated.events.push({ type: 'goal', minute: min, team: 'player', player: s.name });
        updated.playerGoals = (updated.playerGoals || 0) + 1;
        if (updated.isHome) updated.homeScore++; else updated.awayScore++;
      };
      const addOpponentGoal = (min) => {
        updated.events.push({ type: 'goal', minute: min, team: 'opponent', player: `Rival #${Math.floor(Math.random()*9)+2}` });
        updated.opponentGoals = (updated.opponentGoals || 0) + 1;
        if (updated.isHome) updated.awayScore++; else updated.homeScore++;
      };

      if (choice === 'changeFormation') {
        // ⚽ 40% extra goal for you (good)
        if (Math.random() < Math.min(0.4 * htMult, 0.75)) addPlayerGoal(58 + Math.floor(Math.random() * 25));
        // 🟥 25% red card for YOUR team (bad)
        if (Math.random() < 0.25) {
          const carded = squad[Math.floor(Math.random() * 11)];
          updated.events.push({ type: 'red', minute: 55 + Math.floor(Math.random() * 30), team: 'player', player: carded?.name || 'Unknown' });
        }
      } else if (choice === 'motivational') {
        // 💪 Comeback power: if losing, high chance of goal
        const losing = (updated.isHome ? updated.homeScore : updated.awayScore) < (updated.isHome ? updated.awayScore : updated.homeScore);
        if (losing && Math.random() < Math.min(0.6 * htMult, 0.9)) {
          addPlayerGoal(75 + Math.floor(Math.random() * 13));
        }
        // ⏰ 30% late goal against (bad)
        if (Math.random() < 0.30) addOpponentGoal(85 + Math.floor(Math.random() * 5));
        // Small morale boost
        setWcState(st => ({ ...st, morale: Math.min(100, st.morale + 8 * htMult) }));
      } else if (choice === 'conservative') {
        // 🧤 35% clean sheet in 2nd half — remove ALL opponent 2nd half goals
        if (Math.random() < Math.min(0.35 * htMult, 0.60)) {
          const toRemove = [];
          updated.events.forEach((e, idx) => { if (e.minute >= 46 && e.type === 'goal' && e.team === 'opponent') toRemove.push(idx); });
          for (let i = toRemove.length - 1; i >= 0; i--) {
            updated.events.splice(toRemove[i], 1);
            updated.opponentGoals = Math.max(0, (updated.opponentGoals || 0) - 1);
            if (updated.isHome) updated.awayScore = Math.max(0, updated.awayScore - 1);
            else updated.homeScore = Math.max(0, updated.homeScore - 1);
          }
        }
        // 🐢 Slower game — remove 2nd half chance/nearMiss events (fewer exciting moments, but you keep your goals)
        updated.events = updated.events.filter(e => !(e.minute >= 46 && (e.type === 'chance' || e.type === 'nearMiss')));
      } else if (choice === 'aggressive') {
        // 🔥 High scoring — add goals for BOTH sides
        if (Math.random() < Math.min(0.55 * htMult, 0.85)) addPlayerGoal(60 + Math.floor(Math.random() * 20));
        if (Math.random() < 0.40) addOpponentGoal(65 + Math.floor(Math.random() * 20));
        // 🟥 30% red card for your team
        if (Math.random() < 0.30) {
          const carded = squad[Math.floor(Math.random() * 11)];
          updated.events.push({ type: 'red', minute: 68 + Math.floor(Math.random() * 15), team: 'player', player: carded?.name || 'Unknown' });
        }
      }

      // Re-check knockout draw status
      updated.isKnockoutDraw = wcState?.phase !== 'groups' && updated.homeScore === updated.awayScore;
      updated.events.sort((a, b) => a.minute - b.minute);
      return updated;
    });
  }, [liveMatchData, wcState]);

  // Keep pendingPenalties ref in sync
  useEffect(() => { pendingPenaltiesRef.current = pendingPenalties; }, [pendingPenalties]);

  // ── PENALTIES ──
  const handlePenaltyResult = useCallback((penaltyResult) => {
    setPendingPenalties(null);
    setWcState(prev => {
      const pp = pendingPenaltiesRef.current;
      if (!pp) return prev;

      let ns = { ...prev };
      const { fixture, homeScore, awayScore, isHome } = pp;

      const penalties = {
        home: penaltyResult.homeScore || penaltyResult.playerGoals || 0,
        away: penaltyResult.awayScore || penaltyResult.opponentGoals || 0,
        winner: penaltyResult.winner || (penaltyResult.playerWins ? ns.playerTeamId : (isHome ? fixture.away : fixture.home)),
      };

      ns = recordPlayerMatch(ns, fixture, homeScore, awayScore, penalties);

      const actualResult = penalties.winner === ns.playerTeamId ? 'win' : 'lose';
      setLastMatchResult(actualResult);

      if (actualResult === 'win') {
        ns.morale = Math.min(100, ns.morale + 15);
        ns.pressure = Math.max(0, ns.pressure - 5);
        ns.skillPoints = (ns.skillPoints || 0) + 1;
        ns = unlockRandomFormation(ns);
      } else {
        ns.morale = Math.max(0, ns.morale - 15);
        ns.pressure = Math.min(100, ns.pressure + 15);
      }
      ns.fitness = Math.max(0, ns.fitness - 5);

      // Clear suspensions (1-match ban served)
      ns.suspendedPlayers = [];

      // Random injury chance (10%)
      if (Math.random() < 0.10 && ns.playerSquad?.length > 0) {
        const available = ns.playerSquad.filter(p => !(ns.injuredPlayers || []).includes(p.name));
        if (available.length > 0) {
          const victim = available[Math.floor(Math.random() * available.length)];
          ns.injuredPlayers = [...(ns.injuredPlayers || []), victim.name];
        }
      }
      // Clear injuries that have served their 1-match recovery
      if (ns._injuriesServed) {
        ns.injuredPlayers = (ns.injuredPlayers || []).filter(name => !ns._injuriesServed.includes(name));
        delete ns._injuriesServed;
      }
      ns._injuriesServed = [...(ns.injuredPlayers || [])];

      // Decrement buff/debuff durations
      if (ns.playerBuffs) {
        const newBuffs = {};
        for (const [name, buff] of Object.entries(ns.playerBuffs)) {
          const remaining = buff.duration - 1;
          if (remaining > 0) newBuffs[name] = { ...buff, duration: remaining };
        }
        ns.playerBuffs = newBuffs;
      }
      if (ns.teamBuffs?.length > 0) {
        ns.teamBuffs = ns.teamBuffs.map(b => ({ ...b, duration: b.duration - 1 })).filter(b => b.duration > 0);
      }
      if (ns.opponentDebuffs?.length > 0) {
        ns.opponentDebuffs = ns.opponentDebuffs.map(d => ({ ...d, duration: d.duration - 1 })).filter(d => d.duration > 0);
      }

      ns = resolveChains(ns, actualResult);
      ns = advanceKnockout(ns);

      ns.matchHistory = [...(ns.matchHistory || []), {
        homeScore, awayScore, isHome: pp.isHome,
        opponent: pp.opponentTeam?.name, motm: pp.motm,
        result: actualResult, penalties: true
      }];

      if (isPlayerEliminated(ns)) {
        setTimeout(() => { setResultType('eliminated'); setScreen('result'); }, 500);
        return ns;
      }
      if (isWorldCupWinner(ns)) {
        setTimeout(() => { setResultType('champion'); setScreen('result'); }, 500);
        return ns;
      }

      const pressEvt = pickPostMatchPress(ns, actualResult);
      ns.currentPressEvent = pressEvt;

      setTimeout(() => setScreen('press'), 500);
      return ns;
    });
  }, []);

  // ── PRESS CONFERENCE ──
  const handlePressChoice = useCallback((choice, side) => {
    setWcState(prev => {
      let ns = applyChoice(prev, choice);

      // Feature 4: Update narrative counters from press choice
      ns.narrative = { ...(ns.narrative || { pressHostility: 0, playerLoyalty: 0, tacticalReputation: 0 }) };
      if (side === 'A') {
        ns.narrative.pressHostility += 1;
      } else {
        ns.narrative.playerLoyalty += 1;
      }

      const gameOver = checkGameOver(ns);
      if (gameOver) {
        setTimeout(() => { setGameOverReason(gameOver); setScreen('gameover'); }, 800);
        return ns;
      }
      if (ns.skillPoints > 0) {
        setTimeout(() => setShowPerks(true), 500);
        setTimeout(() => setScreen('dashboard'), 500);
      } else {
        setTimeout(() => setScreen('dashboard'), 500);
      }
      return ns;
    });
  }, []);

  // ── PERKS ──
  const handlePerkUnlock = useCallback((perkId, effect) => {
    setWcState(prev => {
      if ((prev.skillPoints || 0) <= 0) return prev;
      const ns = { ...prev };
      ns.perks = { ...ns.perks, [perkId]: true };
      ns.perkEffects = { ...ns.perkEffects, ...effect };
      ns.skillPoints = (ns.skillPoints || 0) - 1;
      // Feature 6: tac3 unlocks all formations
      if (perkId === 'tac3') {
        ns.unlockedFormations = [...ALL_FORMATIONS];
      }
      return ns;
    });
  }, []);

  // ── DASHBOARD → Next match ──
  const nextMatchRef = useRef(false);
  const handleNextMatch = useCallback(() => {
    if (!wcState || nextMatchRef.current) return;
    nextMatchRef.current = true;
    setTimeout(() => { nextMatchRef.current = false; }, 500);
    triggerEvent(wcState);
  }, [wcState, triggerEvent]);

  // ── PLAY AGAIN ──
  const handlePlayAgain = useCallback(() => {
    resetEventState(); // Clear seenEvents + activeChains between games
    setWcState(null); setCurrentEvent(null); setCurrentFixture(null);
    setLineup(null); setTeamTalkBonus(null); setPrediction(null); setMatchEvents([]);
    setMatchScore(null); setLastMatchResult(null); setResultType(null);
    setGameOverReason(null); setShowPerks(false); setPendingPenalties(null);
    setLiveMatchData(null);
    setScreen('setup');
  }, []);

  const playerTeam = teams.find(t => t.id === wcState?.playerTeamId);
  const showResourceBars = wcState && screen !== 'setup' && screen !== 'result' && screen !== 'gameover' && screen !== 'livematch';

  return (
    <div className="wc-main">
      {showResourceBars && (
        <ResourceBars resources={{ morale: wcState.morale, fitness: wcState.fitness, pressure: wcState.pressure, budget: wcState.budget }} lang={i18n.language} />
      )}

      <div key={screen} className="wc-screen-transition">
      {screen === 'setup' && (
        <WorldCupSetup onSelectTeam={handleSelectTeam} onBack={onExit} />
      )}

      {screen === 'event' && currentEvent && wcState && (
        <WorldCupEvent
          event={currentEvent}
          resources={{ morale: wcState.morale, fitness: wcState.fitness, pressure: wcState.pressure, budget: wcState.budget }}
          onChoice={handleEventChoice}
          starPlayer={wcState.starPlayer}
          arcFlags={wcState.arcFlags}
        />
      )}

      {screen === 'formation' && wcState && currentFixture && (
        <WorldCupFormation
          squad={wcState.playerSquad || []}
          opponent={currentFixture.home === wcState.playerTeamId ? currentFixture.away : currentFixture.home}
          teams={teams}
          playerTeamId={wcState.playerTeamId}
          resources={{ morale: wcState.morale, fitness: wcState.fitness, pressure: wcState.pressure, budget: wcState.budget }}
          suspendedPlayers={wcState.suspendedPlayers || []}
          injuredPlayers={wcState.injuredPlayers || []}
          onConfirm={handleFormationConfirm}
          unlockedFormations={wcState.perks?.tac2 ? ALL_FORMATIONS : (wcState.unlockedFormations || DEFAULT_FORMATIONS)}
          starPlayer={wcState.starPlayer}
          playerBuffs={wcState.playerBuffs || {}}
          conflictPairs={wcState.conflictPairs || []}
          opponentRevealed={!!wcState.opponentRevealed}
          teamBuffs={wcState.teamBuffs || []}
          opponentDebuffs={wcState.opponentDebuffs || []}
          wcState={wcState}
          prediction={prediction}
          onPrediction={setPrediction}
        />
      )}

      {screen === 'teamTalk' && (
        <WorldCupTeamTalk
          resources={{ morale: wcState.morale, fitness: wcState.fitness, pressure: wcState.pressure, budget: wcState.budget }}
          onChoice={handleTeamTalk}
        />
      )}

      {screen === 'livematch' && liveMatchData && wcState && (
        <WorldCupLiveMatch
          events={liveMatchData.events}
          homeTeam={liveMatchData.isHome ? liveMatchData.playerTeam : liveMatchData.opponentTeam}
          awayTeam={liveMatchData.isHome ? liveMatchData.opponentTeam : liveMatchData.playerTeam}
          isHome={liveMatchData.isHome}
          playerTeamId={wcState.playerTeamId}
          onComplete={handleLiveMatchComplete}
          onHalftimeChoice={handleHalftimeChoice}
        />
      )}

      {screen === 'penalties' && pendingPenalties && wcState && (
        <WorldCupPenalties
          squad={wcState.playerSquad || []}
          playerTeamId={wcState.playerTeamId}
          opponentTeam={pendingPenalties.opponentTeam}
          playerTeam={playerTeam}
          isHome={pendingPenalties.isHome}
          morale={wcState.morale}
          pressure={wcState.pressure}
          penaltyBonus={wcState.penaltyBonus || false}
          onResult={handlePenaltyResult}
        />
      )}

      {screen === 'press' && matchScore && (
        <WorldCupPress
          event={wcState.currentPressEvent}
          resources={{ morale: wcState.morale, fitness: wcState.fitness, pressure: wcState.pressure, budget: wcState.budget }}
          matchResult={lastMatchResult}
          onChoice={handlePressChoice}
          starPlayer={wcState.starPlayer}
        />
      )}

      {screen === 'dashboard' && wcState && (
        <>
          {showPerks && wcState.skillPoints > 0 && (
            <WorldCupPerks
              perks={wcState.perks || {}}
              skillPoints={wcState.skillPoints || 0}
              onUnlock={handlePerkUnlock}
              onClose={() => setShowPerks(false)}
              starPlayer={wcState.starPlayer}
            />
          )}
          <WorldCupDashboard
            state={wcState}
            teams={teams}
            onPlayMatch={handleNextMatch}
            matchHistory={wcState.matchHistory || []}
            perks={wcState.perks}
            skillPoints={wcState.skillPoints || 0}
            onShowPerks={() => setShowPerks(true)}
          />
        </>
      )}

      {screen === 'result' && wcState && (
        <WorldCupResult
          type={resultType}
          state={wcState}
          teams={teams}
          onPlayAgain={handlePlayAgain}
          onExit={onExit}
        />
      )}

      {screen === 'gameover' && wcState && (
        <WorldCupGameOver
          reason={gameOverReason}
          state={wcState}
          teams={teams}
          onPlayAgain={handlePlayAgain}
          onExit={onExit}
        />
      )}
      </div>
    </div>
  );
}

// ── Feature 4: Pick narrative-triggered event ──
function pickNarrativeEvent(state) {
  const narrative = state.narrative || {};
  const usedEvents = state.usedEvents || [];
  
  for (const evt of WORLD_CUP_EVENTS) {
    if (!evt.isNarrative) continue;
    if (usedEvents.includes(evt.id)) continue;
    const cond = evt.narrativeCondition;
    if (!cond) continue;
    let match = true;
    for (const [key, threshold] of Object.entries(cond)) {
      if ((narrative[key] || 0) < threshold) { match = false; break; }
    }
    if (match) return evt;
  }
  return null;
}

// ── Feature 5: Pick star player event ──
function pickStarPlayerEvent(state) {
  if (!state.starPlayer) return null;
  if (Math.random() > 0.25) return null; // 25% chance each turn

  const usedEvents = state.usedEvents || [];
  const starEvents = WORLD_CUP_EVENTS.filter(e => e.isStarPlayer && !e.isPostMatch && !usedEvents.includes(e.id));
  if (starEvents.length === 0) return null;
  return starEvents[Math.floor(Math.random() * starEvents.length)];
}

// ── Feature 6: Unlock random formation ──
function unlockRandomFormation(state) {
  const unlocked = state.unlockedFormations || [...DEFAULT_FORMATIONS];
  const locked = ALL_FORMATIONS.filter(f => !unlocked.includes(f));
  if (locked.length === 0) return state;
  const toUnlock = locked[Math.floor(Math.random() * locked.length)];
  return { ...state, unlockedFormations: [...unlocked, toUnlock] };
}

// ── Pick post-match press event (uses proper postmatch events) ──
function pickPostMatchPress(state, matchResult) {
  const evt = pickPostMatchEvent(matchResult);
  if (evt) return evt;
  // Fallback to regular event if no postmatch event available
  return pickEvent({
    phase: state.phase,
    morale: state.morale, fitness: state.fitness, pressure: state.pressure, budget: state.budget,
    usedEvents: state.usedEvents || [], pendingChains: state.pendingChains || [],
  });
}

function poissonRandom(lambda) {
  const cappedLambda = Math.min(Math.max(0.1, lambda), 100);
  let L = Math.exp(-cappedLambda);
  let k = 0;
  let p = 1;
  let iterations = 0;
  do { k++; p *= Math.random(); iterations++; } while (p > L && iterations < 200);
  return k - 1;
}
