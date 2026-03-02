import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Hotel, Newspaper, Landmark, Zap, CloudRain, User, Dice5, Link, Heart, Activity, Wallet } from 'lucide-react';
import { WORLD_CUP_EVENTS_I18N } from '../../data/worldCupEventsI18n';
import { STORY_ARC_EVENTS_I18N, DECISION_MEMORY_I18N, CHAPTER_BANNER_I18N } from '../../data/worldCupStoryArcsI18n';
import { EVENT_CATEGORIES } from '../../data/worldCupEvents';
import ResourceBars from './ResourceBars';
import EventIllustration, { CATEGORY_COLORS } from './EventIllustrations';
import './WorldCupEvent.scss';

const CATEGORY_ICONS = {
  press: Mic,
  camp: Hotel,
  scandal: Newspaper,
  federation: Landmark,
  tactical: Zap,
  weather: CloudRain,
  personal: User,
  wildcard: Dice5,
  chain: Link,
};

const EFFECT_ICONS = { morale: Heart, fitness: Activity, pressure: Newspaper, budget: Wallet };

export default function WorldCupEvent({ event, resources, onChoice, starPlayer, arcFlags }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'es';

  // Resolve i18n: story arc events use their own i18n source
  const isArc = !!event.isStoryArc;
  let rawTexts;
  if (isArc) {
    const arcI18n = STORY_ARC_EVENTS_I18N[event.id];
    const arcLangData = arcI18n?.[lang] || arcI18n?.es || {};
    // For variant chapters, resolve the variant text
    if (arcLangData.variants && event.matchedFlag) {
      const variantData = arcLangData.variants[event.matchedFlag];
      rawTexts = { title: arcLangData.title, ...(variantData || { desc: '', a: 'A', b: 'B' }) };
    } else {
      rawTexts = { title: arcLangData.title, desc: arcLangData.desc, a: arcLangData.a, b: arcLangData.b };
    }
  } else {
    const i18nData = WORLD_CUP_EVENTS_I18N[event.id];
    rawTexts = i18nData?.[lang] || i18nData?.es || { title: event.id, desc: '', a: 'A', b: 'B' };
  }
  const texts = { ...rawTexts };
  if (starPlayer) {
    texts.desc = (texts.desc || '').replace(/{starPlayer}/g, starPlayer);
    texts.title = (texts.title || '').replace(/{starPlayer}/g, starPlayer);
  }

  // Decision memory: show past decision context for arc events
  let decisionMemory = null;
  if (isArc && event.matchedFlag && arcFlags) {
    const memI18n = DECISION_MEMORY_I18N[lang] || DECISION_MEMORY_I18N.en || {};
    const memText = memI18n[event.matchedFlag];
    if (memText) {
      decisionMemory = starPlayer ? memText.replace(/{starPlayer}/g, starPlayer) : memText;
    }
  }

  // Chapter banner for arc events
  let chapterBanner = null;
  if (isArc && event.chapterIndex !== undefined && event.totalChapters) {
    const bannerFn = CHAPTER_BANNER_I18N[lang] || CHAPTER_BANNER_I18N.en;
    chapterBanner = bannerFn(event.chapterIndex, event.totalChapters);
  }

  const [chosen, setChosen] = useState(null);
  const [deltas, setDeltas] = useState(null);
  const [swipeX, setSwipeX] = useState(0);
  const [hoveredChoice, setHoveredChoice] = useState(null);
  const touchStartRef = useRef(null);

  const categoryColor = isArc ? '#d4a017' : (CATEGORY_COLORS[event.category] || '#94a3b8');

  const handleChoice = useCallback((choice, side) => {
    if (chosen) return;
    setChosen(side);
    const eff = choice.effects;
    setDeltas(eff);
    setTimeout(() => {
      onChoice(choice, side);
      setChosen(null);
      setDeltas(null);
      setSwipeX(0);
    }, 1200);
  }, [chosen, onChoice]);

  const onTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };
  const onTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const diff = e.touches[0].clientX - touchStartRef.current;
    setSwipeX(diff);
  };
  const onTouchEnd = () => {
    if (Math.abs(swipeX) > 80) {
      if (swipeX < -80) handleChoice(event.choiceA, 'A');
      else handleChoice(event.choiceB, 'B');
    }
    setSwipeX(0);
    touchStartRef.current = null;
  };

  const SPECIAL_LABELS = {
    es: { playerBuff: '🔺 Buff jugador', teamBuff: '🛡️ Buff equipo', opponentDebuff: '💥 Debuff rival', conflictPair: '⚠️ Conflicto vestuario', opponentRevealed: '🔍 Espionaje', clearInjuries: '🏥 Cura lesiones', injureRandom: '🤕 Lesión aleatoria', penaltyBonus: '🎯 Bonus penaltis', groupTableChange: '📊 Cambio tabla', nextMatchBonus: '⚡ Bonus próximo partido', suspendPlayer: '🚫 Jugador suspendido', formationForced: '⚠️ Formación forzada', moraleSwing: '🎭 Moral condicional', rivalWeakened: '💪 Rival debilitado', doubleOrNothing: '🎰 Doble o nada', fanBoost: '📣 Apoyo gradual', mediaBlackout: '🔇 Silencio mediático', starInjured: '🤕 Estrella lesionada', moraleCollapse: '💔 Riesgo moral', pressureSurge: '📈 Presión imparable', budgetCrisis: '💸 Crisis presupuestaria', tacticsLeaked: '👁️ Táctica filtrada', cardRisk: '🟥 Riesgo tarjetas', fanRevolt: '😡 Revuelta fans' },
    en: { playerBuff: '🔺 Player buff', teamBuff: '🛡️ Team buff', opponentDebuff: '💥 Rival debuff', conflictPair: '⚠️ Locker room conflict', opponentRevealed: '🔍 Scouting', clearInjuries: '🏥 Heal injuries', injureRandom: '🤕 Random injury', penaltyBonus: '🎯 Penalty bonus', groupTableChange: '📊 Table change', nextMatchBonus: '⚡ Next match bonus', suspendPlayer: '🚫 Player suspended', formationForced: '⚠️ Formation forced', moraleSwing: '🎭 Conditional morale', rivalWeakened: '💪 Rival weakened', doubleOrNothing: '🎰 Double or nothing', fanBoost: '📣 Gradual fan boost', mediaBlackout: '🔇 Media blackout', starInjured: '🤕 Star injured', moraleCollapse: '💔 Morale risk', pressureSurge: '📈 Pressure surge', budgetCrisis: '💸 Budget crisis', tacticsLeaked: '👁️ Tactics leaked', cardRisk: '🟥 Card risk', fanRevolt: '😡 Fan revolt' },
    fr: { playerBuff: '🔺 Buff joueur', teamBuff: '🛡️ Buff équipe', opponentDebuff: '💥 Debuff rival', conflictPair: '⚠️ Conflit vestiaire', opponentRevealed: '🔍 Espionnage', clearInjuries: '🏥 Soigner blessures', injureRandom: '🤕 Blessure aléatoire', penaltyBonus: '🎯 Bonus tirs au but', groupTableChange: '📊 Changement classement', nextMatchBonus: '⚡ Bonus prochain match', suspendPlayer: '🚫 Joueur suspendu', formationForced: '⚠️ Formation forcée', moraleSwing: '🎭 Moral conditionnel', rivalWeakened: '💪 Rival affaibli', doubleOrNothing: '🎰 Quitte ou double', fanBoost: '📣 Soutien graduel', mediaBlackout: '🔇 Blackout médiatique', starInjured: '🤕 Star blessée', moraleCollapse: '💔 Risque moral', pressureSurge: '📈 Pression imparable', budgetCrisis: '💸 Crise budgétaire', tacticsLeaked: '👁️ Tactique révélée', cardRisk: '🟥 Risque cartons', fanRevolt: '😡 Révolte des fans' },
    de: { playerBuff: '🔺 Spieler-Buff', teamBuff: '🛡️ Team-Buff', opponentDebuff: '💥 Gegner-Debuff', conflictPair: '⚠️ Kabinen-Konflikt', opponentRevealed: '🔍 Spionage', clearInjuries: '🏥 Verletzungen heilen', injureRandom: '🤕 Zufällige Verletzung', penaltyBonus: '🎯 Elfmeter-Bonus', groupTableChange: '📊 Tabellenänderung', nextMatchBonus: '⚡ Bonus nächstes Spiel', suspendPlayer: '🚫 Spieler gesperrt', formationForced: '⚠️ Formation erzwungen', moraleSwing: '🎭 Bedingte Moral', rivalWeakened: '💪 Gegner geschwächt', doubleOrNothing: '🎰 Alles oder nichts', fanBoost: '📣 Gradueller Fan-Boost', mediaBlackout: '🔇 Medien-Blackout', starInjured: '🤕 Star verletzt', moraleCollapse: '💔 Moral-Risiko', pressureSurge: '📈 Druckwelle', budgetCrisis: '💸 Budget-Krise', tacticsLeaked: '👁️ Taktik verraten', cardRisk: '🟥 Kartenrisiko', fanRevolt: '😡 Fan-Revolte' },
    pt: { playerBuff: '🔺 Buff jogador', teamBuff: '🛡️ Buff equipa', opponentDebuff: '💥 Debuff rival', conflictPair: '⚠️ Conflito balneário', opponentRevealed: '🔍 Espionagem', clearInjuries: '🏥 Curar lesões', injureRandom: '🤕 Lesão aleatória', penaltyBonus: '🎯 Bónus penáltis', groupTableChange: '📊 Mudança classificação', nextMatchBonus: '⚡ Bónus próximo jogo', suspendPlayer: '🚫 Jogador suspenso', formationForced: '⚠️ Formação forçada', moraleSwing: '🎭 Moral condicional', rivalWeakened: '💪 Rival enfraquecido', doubleOrNothing: '🎰 Tudo ou nada', fanBoost: '📣 Apoio gradual', mediaBlackout: '🔇 Blackout mediático', starInjured: '🤕 Estrela lesionada', moraleCollapse: '💔 Risco moral', pressureSurge: '📈 Pressão imparável', budgetCrisis: '💸 Crise orçamental', tacticsLeaked: '👁️ Tática vazada', cardRisk: '🟥 Risco cartões', fanRevolt: '😡 Revolta adeptos' },
    it: { playerBuff: '🔺 Buff giocatore', teamBuff: '🛡️ Buff squadra', opponentDebuff: '💥 Debuff rivale', conflictPair: '⚠️ Conflitto spogliatoio', opponentRevealed: '🔍 Spionaggio', clearInjuries: '🏥 Cura infortuni', injureRandom: '🤕 Infortunio casuale', penaltyBonus: '🎯 Bonus rigori', groupTableChange: '📊 Cambio classifica', nextMatchBonus: '⚡ Bonus prossima partita', suspendPlayer: '🚫 Giocatore sospeso', formationForced: '⚠️ Formazione forzata', moraleSwing: '🎭 Morale condizionale', rivalWeakened: '💪 Rivale indebolito', doubleOrNothing: '🎰 Tutto o niente', fanBoost: '📣 Supporto graduale', mediaBlackout: '🔇 Blackout mediatico', starInjured: '🤕 Star infortunata', moraleCollapse: '💔 Rischio morale', pressureSurge: '📈 Pressione inarrestabile', budgetCrisis: '💸 Crisi di bilancio', tacticsLeaked: '👁️ Tattica svelata', cardRisk: '🟥 Rischio cartellini', fanRevolt: '😡 Rivolta tifosi' },
  };

  // ── Probability text helper ──
  const PROB = {
    es: (p) => p >= 50 ? 'Muy probable' : p >= 30 ? 'Probable' : 'Poco probable',
    en: (p) => p >= 50 ? 'Very likely' : p >= 30 ? 'Likely' : 'Unlikely',
    fr: (p) => p >= 50 ? 'Très probable' : p >= 30 ? 'Probable' : 'Peu probable',
    de: (p) => p >= 50 ? 'Sehr wahrscheinlich' : p >= 30 ? 'Wahrscheinlich' : 'Unwahrscheinlich',
    pt: (p) => p >= 50 ? 'Muito provável' : p >= 30 ? 'Provável' : 'Pouco provável',
    it: (p) => p >= 50 ? 'Molto probabile' : p >= 30 ? 'Probabile' : 'Poco probabile',
  };
  const prob = (p) => (PROB[lang] || PROB.en)(typeof p === 'number' ? (p <= 1 ? Math.round(p * 100) : p) : 0);

  // ── Special effect labels (match modifiers + legacy) ──
  const starName = starPlayer || '★';
  const SPECIAL_EFFECT_I18N = {
    es: {
      boostNextMatch: (sp) => `⭐ +${sp.rating} rating próximo partido`,
      blockPlayer: () => '🚫 Jugador bloqueado 1 partido',
      injuryRisk: (sp) => `⚠️ ${prob(sp)} riesgo lesión`,
      riskRecurrence: (sp) => `⚠️ ${prob(sp)} de repetirse`,
      moraleSwing: () => '🎲 Moral impredecible',
      revealOpponent: () => '👁️ Ves alineación rival',
      matchBonus: (sp) => `⚽ +${sp} rating este partido`,
      unlockFormation: () => '🔓 Nueva formación',
      extraGoalChance: (sp) => `⚽ ${prob(sp.percent)} gol extra de ${sp.player === 'star' ? starName : 'alguien'}`,
      opponentExtraGoal: (sp) => `⚽ ${prob(sp.percent)} gol extra del rival`,
      lowScoringMatch: () => '🛡️ Partido con pocos goles',
      highScoringMatch: () => '🔥 Partido abierto, muchos goles',
      playerOnFire: () => `🔥 ${starName} en modo bestia`,
      playerNerfed: () => `📉 ${starName} rinde menos`,
      playerSuspended: () => '🚫 Jugador suspendido',
      playerProtected: () => `🛡️ ${starName} protegido`,
      penaltyGuaranteed: () => '⚠️ Habrá un penalti',
      redCardRisk: (sp) => `🟥 ${prob(sp.percent)} roja ${sp.team === 'opponent' ? 'rival' : 'tuya'}`,
      cleanSheet: (sp) => `🧤 ${prob(sp.percent)} portería a cero`,
      concedeLate: (sp) => `⏰ ${prob(sp.percent)} gol en contra al final`,
      comebackPower: () => '💪 Poder de remontada',
      moraleExplosion: (sp) => `🚀 +${sp.value} moral`,
      moraleCrash: (sp) => `💔 ${sp.value} moral`,
      pressureBomb: (sp) => `💣 +${sp.value} presión`,
      budgetJackpot: (sp) => `💰 +${sp.value} presupuesto`,
      nextMatchBan: () => `🚫 ${starName} suspendido siguiente partido`,
      winStreakBonus: () => '📈 Si ganas: +5 rating próximo partido',
      loseStreakPenalty: () => '📉 Si pierdes: -15 moral (promesa rota)',
    },
    en: {
      boostNextMatch: (sp) => `⭐ +${sp.rating} rating next match`,
      blockPlayer: () => '🚫 Player blocked 1 match',
      injuryRisk: (sp) => `⚠️ ${prob(sp)} injury risk`,
      riskRecurrence: (sp) => `⚠️ ${prob(sp)} recurrence`,
      moraleSwing: () => '🎲 Unpredictable morale',
      revealOpponent: () => '👁️ Reveals opponent lineup',
      matchBonus: (sp) => `⚽ +${sp} match rating`,
      unlockFormation: () => '🔓 New formation unlocked',
      extraGoalChance: (sp) => `⚽ ${prob(sp.percent)} extra goal from ${sp.player === 'star' ? starName : 'someone'}`,
      opponentExtraGoal: (sp) => `⚽ ${prob(sp.percent)} extra opponent goal`,
      lowScoringMatch: () => '🛡️ Low-scoring match',
      highScoringMatch: () => '🔥 High-scoring open match',
      playerOnFire: () => `🔥 ${starName} on fire`,
      playerNerfed: () => `📉 ${starName} plays badly`,
      playerSuspended: () => '🚫 Player suspended',
      playerProtected: () => `🛡️ ${starName} protected`,
      penaltyGuaranteed: () => '⚠️ A penalty will happen',
      redCardRisk: (sp) => `🟥 ${prob(sp.percent)} red card ${sp.team === 'opponent' ? 'opponent' : 'your team'}`,
      cleanSheet: (sp) => `🧤 ${prob(sp.percent)} clean sheet`,
      concedeLate: (sp) => `⏰ ${prob(sp.percent)} late goal conceded`,
      comebackPower: () => '💪 Comeback power',
      moraleExplosion: (sp) => `🚀 +${sp.value} morale`,
      moraleCrash: (sp) => `💔 ${sp.value} morale`,
      pressureBomb: (sp) => `💣 +${sp.value} pressure`,
      budgetJackpot: (sp) => `💰 +${sp.value} budget`,
      nextMatchBan: () => `🚫 ${starName} banned next match`,
      winStreakBonus: () => '📈 Win = +5 rating next match',
      loseStreakPenalty: () => '📉 Lose = -15 morale hit',
    },
    fr: {
      boostNextMatch: (sp) => `⭐ +${sp.rating} rating prochain match`,
      blockPlayer: () => '🚫 Joueur bloqué 1 match',
      injuryRisk: (sp) => `⚠️ ${prob(sp)} risque blessure`,
      riskRecurrence: (sp) => `⚠️ ${prob(sp)} de récurrence`,
      moraleSwing: () => '🎲 Moral imprévisible',
      revealOpponent: () => '👁️ Composition adverse révélée',
      matchBonus: (sp) => `⚽ +${sp} rating ce match`,
      unlockFormation: () => '🔓 Nouvelle formation',
      extraGoalChance: (sp) => `⚽ ${prob(sp.percent)} but extra de ${sp.player === 'star' ? starName : 'qqn'}`,
      opponentExtraGoal: (sp) => `⚽ ${prob(sp.percent)} but extra adverse`,
      lowScoringMatch: () => '🛡️ Match fermé, peu de buts',
      highScoringMatch: () => '🔥 Match ouvert, beaucoup de buts',
      playerOnFire: () => `🔥 ${starName} en feu`,
      playerNerfed: () => `📉 ${starName} en méforme`,
      playerSuspended: () => '🚫 Joueur suspendu',
      playerProtected: () => `🛡️ ${starName} protégé`,
      penaltyGuaranteed: () => '⚠️ Il y aura un penalty',
      redCardRisk: (sp) => `🟥 ${prob(sp.percent)} carton rouge ${sp.team === 'opponent' ? 'adverse' : 'pour vous'}`,
      cleanSheet: (sp) => `🧤 ${prob(sp.percent)} clean sheet`,
      concedeLate: (sp) => `⏰ ${prob(sp.percent)} but encaissé en fin`,
      comebackPower: () => '💪 Pouvoir de remontada',
      moraleExplosion: (sp) => `🚀 +${sp.value} moral`,
      moraleCrash: (sp) => `💔 ${sp.value} moral`,
      pressureBomb: (sp) => `💣 +${sp.value} pression`,
      budgetJackpot: (sp) => `💰 +${sp.value} budget`,
      nextMatchBan: () => `🚫 ${starName} suspendu prochain match`,
      winStreakBonus: () => '📈 Victoire = +5 rating suivant',
      loseStreakPenalty: () => '📉 Défaite = -5 rating suivant',
    },
    de: {
      boostNextMatch: (sp) => `⭐ +${sp.rating} Rating nächstes Spiel`,
      blockPlayer: () => '🚫 Spieler 1 Spiel gesperrt',
      injuryRisk: (sp) => `⚠️ ${prob(sp)} Verletzungsrisiko`,
      riskRecurrence: (sp) => `⚠️ ${prob(sp)} Wiederholung`,
      moraleSwing: () => '🎲 Unvorhersehbare Moral',
      revealOpponent: () => '👁️ Gegner-Aufstellung enthüllt',
      matchBonus: (sp) => `⚽ +${sp} Rating dieses Spiel`,
      unlockFormation: () => '🔓 Neue Formation',
      extraGoalChance: (sp) => `⚽ ${prob(sp.percent)} Extrator von ${sp.player === 'star' ? starName : 'jemandem'}`,
      opponentExtraGoal: (sp) => `⚽ ${prob(sp.percent)} Extrator Gegner`,
      lowScoringMatch: () => '🛡️ Torarm, wenig Tore',
      highScoringMatch: () => '🔥 Offenes Spiel, viele Tore',
      playerOnFire: () => `🔥 ${starName} in Topform`,
      playerNerfed: () => `📉 ${starName} spielt schlecht`,
      playerSuspended: () => '🚫 Spieler gesperrt',
      playerProtected: () => `🛡️ ${starName} geschützt`,
      penaltyGuaranteed: () => '⚠️ Es wird einen Elfmeter geben',
      redCardRisk: (sp) => `🟥 ${prob(sp.percent)} Rote Karte ${sp.team === 'opponent' ? 'Gegner' : 'dein Team'}`,
      cleanSheet: (sp) => `🧤 ${prob(sp.percent)} Zu-Null`,
      concedeLate: (sp) => `⏰ ${prob(sp.percent)} Gegentor spät`,
      comebackPower: () => '💪 Comeback-Power',
      moraleExplosion: (sp) => `🚀 +${sp.value} Moral`,
      moraleCrash: (sp) => `💔 ${sp.value} Moral`,
      pressureBomb: (sp) => `💣 +${sp.value} Druck`,
      budgetJackpot: (sp) => `💰 +${sp.value} Budget`,
      nextMatchBan: () => `🚫 ${starName} nächstes Spiel gesperrt`,
      winStreakBonus: () => '📈 Sieg = +5 Rating nächstes',
      loseStreakPenalty: () => '📉 Niederlage = -5 Rating nächstes',
    },
    pt: {
      boostNextMatch: (sp) => `⭐ +${sp.rating} rating próximo jogo`,
      blockPlayer: () => '🚫 Jogador bloqueado 1 jogo',
      injuryRisk: (sp) => `⚠️ ${prob(sp)} risco lesão`,
      riskRecurrence: (sp) => `⚠️ ${prob(sp)} de repetir`,
      moraleSwing: () => '🎲 Moral imprevisível',
      revealOpponent: () => '👁️ Vês alinhamento rival',
      matchBonus: (sp) => `⚽ +${sp} rating este jogo`,
      unlockFormation: () => '🔓 Nova formação',
      extraGoalChance: (sp) => `⚽ ${prob(sp.percent)} golo extra de ${sp.player === 'star' ? starName : 'alguém'}`,
      opponentExtraGoal: (sp) => `⚽ ${prob(sp.percent)} golo extra do rival`,
      lowScoringMatch: () => '🛡️ Jogo com poucos golos',
      highScoringMatch: () => '🔥 Jogo aberto, muitos golos',
      playerOnFire: () => `🔥 ${starName} em modo bestial`,
      playerNerfed: () => `📉 ${starName} rende menos`,
      playerSuspended: () => '🚫 Jogador suspenso',
      playerProtected: () => `🛡️ ${starName} protegido`,
      penaltyGuaranteed: () => '⚠️ Haverá um penálti',
      redCardRisk: (sp) => `🟥 ${prob(sp.percent)} cartão vermelho ${sp.team === 'opponent' ? 'rival' : 'seu'}`,
      cleanSheet: (sp) => `🧤 ${prob(sp.percent)} baliza a zero`,
      concedeLate: (sp) => `⏰ ${prob(sp.percent)} golo sofrido no final`,
      comebackPower: () => '💪 Poder de remontada',
      moraleExplosion: (sp) => `🚀 +${sp.value} moral`,
      moraleCrash: (sp) => `💔 ${sp.value} moral`,
      pressureBomb: (sp) => `💣 +${sp.value} pressão`,
      budgetJackpot: (sp) => `💰 +${sp.value} orçamento`,
      nextMatchBan: () => `🚫 ${starName} suspenso próximo jogo`,
      winStreakBonus: () => '📈 Vitória = +5 rating seguinte',
      loseStreakPenalty: () => '📉 Derrota = -5 rating seguinte',
    },
    it: {
      boostNextMatch: (sp) => `⭐ +${sp.rating} rating prossima partita`,
      blockPlayer: () => '🚫 Giocatore bloccato 1 partita',
      injuryRisk: (sp) => `⚠️ ${prob(sp)} rischio infortunio`,
      riskRecurrence: (sp) => `⚠️ ${prob(sp)} di ricorrenza`,
      moraleSwing: () => '🎲 Morale imprevedibile',
      revealOpponent: () => '👁️ Formazione avversaria svelata',
      matchBonus: (sp) => `⚽ +${sp} rating questa partita`,
      unlockFormation: () => '🔓 Nuova formazione',
      extraGoalChance: (sp) => `⚽ ${prob(sp.percent)} gol extra da ${sp.player === 'star' ? starName : 'qualcuno'}`,
      opponentExtraGoal: (sp) => `⚽ ${prob(sp.percent)} gol extra avversario`,
      lowScoringMatch: () => '🛡️ Partita chiusa, pochi gol',
      highScoringMatch: () => '🔥 Partita aperta, tanti gol',
      playerOnFire: () => `🔥 ${starName} in modalità bestia`,
      playerNerfed: () => `📉 ${starName} rende meno`,
      playerSuspended: () => '🚫 Giocatore sospeso',
      playerProtected: () => `🛡️ ${starName} protetto`,
      penaltyGuaranteed: () => '⚠️ Ci sarà un rigore',
      redCardRisk: (sp) => `🟥 ${prob(sp.percent)} cartellino rosso ${sp.team === 'opponent' ? 'avversario' : 'tuo'}`,
      cleanSheet: (sp) => `🧤 ${prob(sp.percent)} porta inviolata`,
      concedeLate: (sp) => `⏰ ${prob(sp.percent)} gol subito nel finale`,
      comebackPower: () => '💪 Potere di rimonta',
      moraleExplosion: (sp) => `🚀 +${sp.value} morale`,
      moraleCrash: (sp) => `💔 ${sp.value} morale`,
      pressureBomb: (sp) => `💣 +${sp.value} pressione`,
      budgetJackpot: (sp) => `💰 +${sp.value} budget`,
      nextMatchBan: () => `🚫 ${starName} squalificato prossima partita`,
      winStreakBonus: () => '📈 Vittoria = +5 rating prossima',
      loseStreakPenalty: () => '📉 Sconfitta = -5 rating prossima',
    },
  };

  const getSpecialEffects = (choice) => {
    const labels = SPECIAL_LABELS[lang] || SPECIAL_LABELS.en;
    const tags = [];
    if (choice.playerBuff) tags.push({ label: labels.playerBuff, positive: true });
    if (choice.teamBuff) tags.push({ label: labels.teamBuff, positive: choice.teamBuff.value > 0 });
    if (choice.opponentDebuff) tags.push({ label: labels.opponentDebuff, positive: true });
    if (choice.conflictPair) tags.push({ label: labels.conflictPair, positive: false });
    if (choice.opponentRevealed) tags.push({ label: labels.opponentRevealed, positive: true });
    if (choice.clearInjuries) tags.push({ label: labels.clearInjuries, positive: true });
    if (choice.injureRandom) tags.push({ label: labels.injureRandom, positive: false });
    if (choice.penaltyBonus) tags.push({ label: labels.penaltyBonus, positive: true });
    if (choice.groupTableChange) tags.push({ label: labels.groupTableChange, positive: false });
    if (choice.nextMatchBonus) tags.push({ label: labels.nextMatchBonus, positive: true });
    if (choice.suspendPlayer) tags.push({ label: labels.suspendPlayer, positive: false });
    if (choice.formationForced) tags.push({ label: labels.formationForced, positive: false });
    if (choice.moraleSwing) tags.push({ label: labels.moraleSwing, positive: false });
    if (choice.rivalWeakened) tags.push({ label: labels.rivalWeakened, positive: true });
    if (choice.doubleOrNothing) tags.push({ label: labels.doubleOrNothing, positive: true });
    if (choice.fanBoost) tags.push({ label: labels.fanBoost, positive: true });
    if (choice.mediaBlackout) tags.push({ label: labels.mediaBlackout, positive: true });
    if (choice.starInjured) tags.push({ label: labels.starInjured, positive: false });
    if (choice.moraleCollapse) tags.push({ label: labels.moraleCollapse, positive: false });
    if (choice.pressureSurge) tags.push({ label: labels.pressureSurge, positive: false });
    if (choice.budgetCrisis) tags.push({ label: labels.budgetCrisis, positive: false });
    if (choice.tacticsLeaked) tags.push({ label: labels.tacticsLeaked, positive: false });
    if (choice.cardRisk) tags.push({ label: labels.cardRisk, positive: false });
    if (choice.fanRevolt) tags.push({ label: labels.fanRevolt, positive: false });

    // Narrative v2 special effects
    if (choice.special) {
      const sp = choice.special;
      const spLabels = SPECIAL_EFFECT_I18N[lang] || SPECIAL_EFFECT_I18N.en;
      if (sp.boostNextMatch && spLabels.boostNextMatch) tags.push({ label: spLabels.boostNextMatch(sp.boostNextMatch), positive: true, style: 'gold' });
      if (sp.blockPlayer && spLabels.blockPlayer) tags.push({ label: spLabels.blockPlayer(sp.blockPlayer), positive: false, style: 'red' });
      if (sp.injuryRisk && spLabels.injuryRisk) tags.push({ label: spLabels.injuryRisk(sp.injuryRisk), positive: false, style: 'orange' });
      if (sp.riskRecurrence && spLabels.riskRecurrence) tags.push({ label: spLabels.riskRecurrence(sp.riskRecurrence), positive: false, style: 'orange' });
      if (sp.moraleSwing && spLabels.moraleSwing) tags.push({ label: spLabels.moraleSwing(sp.moraleSwing), positive: false, style: 'purple' });
      if (sp.revealOpponent && spLabels.revealOpponent) tags.push({ label: spLabels.revealOpponent(), positive: true, style: 'blue' });
      if (sp.matchBonus && spLabels.matchBonus) tags.push({ label: spLabels.matchBonus(sp.matchBonus), positive: true, style: 'green' });
      if (sp.unlockFormation && spLabels.unlockFormation) tags.push({ label: spLabels.unlockFormation(), positive: true, style: 'cyan' });
      // ── NEW MATCH MODIFIER PILLS ──
      if (sp.extraGoalChance && spLabels.extraGoalChance) tags.push({ label: spLabels.extraGoalChance(sp.extraGoalChance), positive: true, style: 'green' });
      if (sp.opponentExtraGoal && spLabels.opponentExtraGoal) tags.push({ label: spLabels.opponentExtraGoal(sp.opponentExtraGoal), positive: false, style: 'red' });
      if (sp.lowScoringMatch && spLabels.lowScoringMatch) tags.push({ label: spLabels.lowScoringMatch(), positive: true, style: 'blue' });
      if (sp.highScoringMatch && spLabels.highScoringMatch) tags.push({ label: spLabels.highScoringMatch(), positive: false, style: 'orange' });
      if (sp.playerOnFire && spLabels.playerOnFire) tags.push({ label: spLabels.playerOnFire(), positive: true, style: 'gold' });
      if (sp.playerNerfed && spLabels.playerNerfed) tags.push({ label: spLabels.playerNerfed(), positive: false, style: 'red' });
      if (sp.playerSuspended && spLabels.playerSuspended) tags.push({ label: spLabels.playerSuspended(), positive: false, style: 'red' });
      if (sp.playerProtected && spLabels.playerProtected) tags.push({ label: spLabels.playerProtected(), positive: true, style: 'blue' });
      if (sp.penaltyGuaranteed && spLabels.penaltyGuaranteed) tags.push({ label: spLabels.penaltyGuaranteed(), positive: false, style: 'orange' });
      if (sp.redCardRisk && spLabels.redCardRisk) tags.push({ label: spLabels.redCardRisk(sp.redCardRisk), positive: sp.redCardRisk.team === 'opponent', style: sp.redCardRisk.team === 'opponent' ? 'green' : 'red' });
      if (sp.cleanSheet && spLabels.cleanSheet) tags.push({ label: spLabels.cleanSheet(sp.cleanSheet), positive: true, style: 'blue' });
      if (sp.concedeLate && spLabels.concedeLate) tags.push({ label: spLabels.concedeLate(sp.concedeLate), positive: false, style: 'red' });
      if (sp.comebackPower && spLabels.comebackPower) tags.push({ label: spLabels.comebackPower(), positive: true, style: 'purple' });
      if (sp.moraleExplosion && spLabels.moraleExplosion) tags.push({ label: spLabels.moraleExplosion(sp.moraleExplosion), positive: true, style: 'green' });
      if (sp.moraleCrash && spLabels.moraleCrash) tags.push({ label: spLabels.moraleCrash(sp.moraleCrash), positive: false, style: 'red' });
      if (sp.pressureBomb && spLabels.pressureBomb) tags.push({ label: spLabels.pressureBomb(sp.pressureBomb), positive: false, style: 'orange' });
      if (sp.budgetJackpot && spLabels.budgetJackpot) tags.push({ label: spLabels.budgetJackpot(sp.budgetJackpot), positive: true, style: 'green' });
      if (sp.nextMatchBan && spLabels.nextMatchBan) tags.push({ label: spLabels.nextMatchBan(), positive: false, style: 'red' });
      if (sp.winStreakBonus && spLabels.winStreakBonus) tags.push({ label: spLabels.winStreakBonus(), positive: true, style: 'gold' });
      if (sp.loseStreakPenalty && spLabels.loseStreakPenalty) tags.push({ label: spLabels.loseStreakPenalty(), positive: false, style: 'red' });
    }

    return tags;
  };

  const EFFECT_ICON_COLORS = {
    morale: '#f472b6',
    fitness: '#a78bfa',
    pressure: '#fb923c',
    budget: '#34d399',
  };

  const getEffectPreview = (effects) => {
    if (!effects) return null;
    const entries = Object.entries(effects).filter(([, v]) => v !== 0);
    return entries.map(([k, v], idx) => {
      const Icon = EFFECT_ICONS[k];
      const iconColor = EFFECT_ICON_COLORS[k] || '#fff';
      const isPositive = (k === 'pressure') ? v < 0 : v > 0;
      const textColor = isPositive ? '#4afa7f' : '#ff6b6b';
      const bgColor = isPositive ? 'rgba(74,250,127,0.1)' : 'rgba(255,107,107,0.1)';
      return (
        <span
          key={k}
          className="wc-event__effect"
          style={{ color: textColor, background: bgColor, '--i': idx }}
        >
          {v > 0 ? '+' : ''}{v} {Icon && <Icon size={12} style={{ color: iconColor }} />}
        </span>
      );
    });
  };

  const cardRotation = swipeX * 0.15;
  const cardStyle = swipeX !== 0 ? { transform: `translateX(${swipeX}px) rotate(${cardRotation}deg)` } : {};
  if (chosen === 'A') cardStyle.transform = 'translateX(-120%) rotate(-15deg)';
  if (chosen === 'B') cardStyle.transform = 'translateX(120%) rotate(15deg)';

  return (
    <div className="wc-event">
      <div className="wc-event__stage">
        <div
          className={`wc-event__card ${chosen ? 'wc-event__card--chosen' : ''} ${isArc ? 'wc-event__card--story-arc' : ''}`}
          style={{ ...cardStyle, '--cat-color': categoryColor }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Chapter banner removed per design */}

          {/* Grass top + Category banner */}
          <div className="wc-event__grass-top" style={{ background: `linear-gradient(180deg, ${categoryColor}18 0%, transparent 100%)` }}>
            <div className="wc-event__category-banner" style={{ backgroundColor: `${categoryColor}22`, borderBottom: `2px solid ${categoryColor}44` }}>
              {(() => { const CatIcon = CATEGORY_ICONS[event.category]; return CatIcon ? <CatIcon size={16} className="wc-event__category-icon" style={{ color: categoryColor }} /> : null; })()}
              <span className="wc-event__category-title" style={{ color: categoryColor }}>{texts.title}</span>
            </div>
          </div>

          {/* Illustration */}
          <div className="wc-event__card-illustration">
            <div className="wc-event__illustration-glow" style={{ boxShadow: `0 0 40px ${categoryColor}25` }}>
              <EventIllustration category={event.category} size={180} />
            </div>
          </div>

          <div className="wc-event__card-body">
            <p className="wc-event__description">{texts.desc}</p>
            {decisionMemory && (
              <p className="wc-event__decision-memory">{decisionMemory}</p>
            )}
          </div>

          <div className="wc-event__choices">
            <button
              className={`wc-event__choice wc-event__choice--a ${hoveredChoice === 'A' ? 'wc-event__choice--peek' : ''}`}
              onClick={() => handleChoice(event.choiceA, 'A')}
              onMouseEnter={() => setHoveredChoice('A')}
              onMouseLeave={() => setHoveredChoice(null)}
              disabled={!!chosen}
            >
              <span className="wc-event__choice-text">{texts.a}</span>
              <div className="wc-event__choice-effects">
                {getEffectPreview(event.choiceA.effects)}
                {getSpecialEffects(event.choiceA).map((t, i) => (
                  <span key={`sa${i}`} className={`wc-event__effect wc-event__effect--special ${t.positive ? 'wc-event__effect--pos' : 'wc-event__effect--neg'}`}>{t.label}</span>
                ))}
              </div>
            </button>

            <button
              className={`wc-event__choice wc-event__choice--b ${hoveredChoice === 'B' ? 'wc-event__choice--peek' : ''}`}
              onClick={() => handleChoice(event.choiceB, 'B')}
              onMouseEnter={() => setHoveredChoice('B')}
              onMouseLeave={() => setHoveredChoice(null)}
              disabled={!!chosen}
            >
              <span className="wc-event__choice-text">{texts.b}</span>
              <div className="wc-event__choice-effects">
                {getEffectPreview(event.choiceB.effects)}
                {getSpecialEffects(event.choiceB).map((t, i) => (
                  <span key={`sb${i}`} className={`wc-event__effect wc-event__effect--special ${t.positive ? 'wc-event__effect--pos' : 'wc-event__effect--neg'}`}>{t.label}</span>
                ))}
              </div>
            </button>
          </div>
        </div>

        {/* Swipe hints */}
        {!chosen && (
          <div className="wc-event__swipe-hints">
            <span className={`wc-event__swipe-hint ${swipeX < -30 ? 'wc-event__swipe-hint--active' : ''}`}>
              ← {texts.a?.slice(0, 20)}
            </span>
            <span className={`wc-event__swipe-hint ${swipeX > 30 ? 'wc-event__swipe-hint--active' : ''}`}>
              {texts.b?.slice(0, 20)} →
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
