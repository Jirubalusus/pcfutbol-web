import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Swords, ChevronRight, AlertTriangle, HeartPulse, Lock, Star, X, Check, Target, Scale, Zap, CheckCircle2, Eye } from 'lucide-react';
import { WORLD_CUP_UI_I18N } from '../../data/worldCupEventsI18n';
import { translatePosition, posToEN } from '../../game/positionNames';
import { getPositionFit, FIT_COLORS } from '../../game/positionSystem';
import ResourceBars from './ResourceBars';
import FlagIcon from './FlagIcon';
import '../../components/Formation/Formation.scss';
import './WorldCupFormation.scss';

const FORMATIONS = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '4-1-4-1', '5-3-2', '3-4-3'];

const STYLE_EMOJIS = {
  defensive: '🛡️', offensive: '⚔️', balanced: '⚖️',
  'counter-attack': '🏃', possession: '🎯', physical: '💪',
};
const STYLE_KEYS = {
  defensive: 'styleDefensive', offensive: 'styleOffensive', balanced: 'styleBalanced',
  'counter-attack': 'styleCounterAttack', possession: 'stylePossession', physical: 'stylePhysical',
};

const FORMATION_SLOTS = {
  '4-3-3': [
    { id: 'GK', pos: 'GK', x: 50, y: 90 },
    { id: 'RB', pos: 'RB', x: 85, y: 70 },
    { id: 'CB1', pos: 'CB', x: 65, y: 78 },
    { id: 'CB2', pos: 'CB', x: 35, y: 78 },
    { id: 'LB', pos: 'LB', x: 15, y: 70 },
    { id: 'CM1', pos: 'CM', x: 70, y: 50 },
    { id: 'CDM', pos: 'CDM', x: 50, y: 55 },
    { id: 'CM2', pos: 'CM', x: 30, y: 50 },
    { id: 'RW', pos: 'RW', x: 80, y: 25 },
    { id: 'ST', pos: 'ST', x: 50, y: 18 },
    { id: 'LW', pos: 'LW', x: 20, y: 25 },
  ],
  '4-4-2': [
    { id: 'GK', pos: 'GK', x: 50, y: 90 },
    { id: 'RB', pos: 'RB', x: 85, y: 70 },
    { id: 'CB1', pos: 'CB', x: 65, y: 78 },
    { id: 'CB2', pos: 'CB', x: 35, y: 78 },
    { id: 'LB', pos: 'LB', x: 15, y: 70 },
    { id: 'RM', pos: 'RM', x: 85, y: 48 },
    { id: 'CM1', pos: 'CM', x: 60, y: 52 },
    { id: 'CM2', pos: 'CM', x: 40, y: 52 },
    { id: 'LM', pos: 'LM', x: 15, y: 48 },
    { id: 'ST1', pos: 'ST', x: 60, y: 20 },
    { id: 'ST2', pos: 'ST', x: 40, y: 20 },
  ],
  '3-5-2': [
    { id: 'GK', pos: 'GK', x: 50, y: 90 },
    { id: 'CB1', pos: 'CB', x: 75, y: 75 },
    { id: 'CB2', pos: 'CB', x: 50, y: 80 },
    { id: 'CB3', pos: 'CB', x: 25, y: 75 },
    { id: 'RM', pos: 'RM', x: 90, y: 48 },
    { id: 'CM1', pos: 'CM', x: 65, y: 50 },
    { id: 'CDM', pos: 'CDM', x: 50, y: 55 },
    { id: 'CM2', pos: 'CM', x: 35, y: 50 },
    { id: 'LM', pos: 'LM', x: 10, y: 48 },
    { id: 'ST1', pos: 'ST', x: 60, y: 20 },
    { id: 'ST2', pos: 'ST', x: 40, y: 20 },
  ],
  '4-2-3-1': [
    { id: 'GK', pos: 'GK', x: 50, y: 90 },
    { id: 'RB', pos: 'RB', x: 85, y: 70 },
    { id: 'CB1', pos: 'CB', x: 65, y: 78 },
    { id: 'CB2', pos: 'CB', x: 35, y: 78 },
    { id: 'LB', pos: 'LB', x: 15, y: 70 },
    { id: 'CDM1', pos: 'CDM', x: 60, y: 55 },
    { id: 'CDM2', pos: 'CDM', x: 40, y: 55 },
    { id: 'RW', pos: 'RW', x: 75, y: 35 },
    { id: 'CAM', pos: 'CAM', x: 50, y: 35 },
    { id: 'LW', pos: 'LW', x: 25, y: 35 },
    { id: 'ST', pos: 'ST', x: 50, y: 15 },
  ],
  '4-1-4-1': [
    { id: 'GK', pos: 'GK', x: 50, y: 90 },
    { id: 'RB', pos: 'RB', x: 85, y: 70 },
    { id: 'CB1', pos: 'CB', x: 65, y: 78 },
    { id: 'CB2', pos: 'CB', x: 35, y: 78 },
    { id: 'LB', pos: 'LB', x: 15, y: 70 },
    { id: 'CDM', pos: 'CDM', x: 50, y: 58 },
    { id: 'RM', pos: 'RM', x: 85, y: 40 },
    { id: 'CM1', pos: 'CM', x: 60, y: 45 },
    { id: 'CM2', pos: 'CM', x: 40, y: 45 },
    { id: 'LM', pos: 'LM', x: 15, y: 40 },
    { id: 'ST', pos: 'ST', x: 50, y: 18 },
  ],
  '5-3-2': [
    { id: 'GK', pos: 'GK', x: 50, y: 90 },
    { id: 'RB', pos: 'RB', x: 90, y: 65 },
    { id: 'CB1', pos: 'CB', x: 70, y: 75 },
    { id: 'CB2', pos: 'CB', x: 50, y: 80 },
    { id: 'CB3', pos: 'CB', x: 30, y: 75 },
    { id: 'LB', pos: 'LB', x: 10, y: 65 },
    { id: 'CM1', pos: 'CM', x: 65, y: 48 },
    { id: 'CDM', pos: 'CDM', x: 50, y: 52 },
    { id: 'CM2', pos: 'CM', x: 35, y: 48 },
    { id: 'ST1', pos: 'ST', x: 60, y: 20 },
    { id: 'ST2', pos: 'ST', x: 40, y: 20 },
  ],
  '3-4-3': [
    { id: 'GK', pos: 'GK', x: 50, y: 90 },
    { id: 'CB1', pos: 'CB', x: 70, y: 75 },
    { id: 'CB2', pos: 'CB', x: 50, y: 80 },
    { id: 'CB3', pos: 'CB', x: 30, y: 75 },
    { id: 'RM', pos: 'RM', x: 85, y: 50 },
    { id: 'CM1', pos: 'CM', x: 60, y: 52 },
    { id: 'CM2', pos: 'CM', x: 40, y: 52 },
    { id: 'LM', pos: 'LM', x: 15, y: 50 },
    { id: 'RW', pos: 'RW', x: 75, y: 22 },
    { id: 'ST', pos: 'ST', x: 50, y: 18 },
    { id: 'LW', pos: 'LW', x: 25, y: 22 },
  ],
};

function getPositionColor(pos) {
  const p = posToEN(pos);
  if (p === 'GK') return '#f1c40f';
  if (['RB', 'CB', 'LB', 'RWB', 'LWB'].includes(p)) return '#3498db';
  if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(p)) return '#2ecc71';
  return '#e74c3c';
}

function getPositionStyle(pos) {
  const color = getPositionColor(pos);
  return {
    color: color,
    background: `${color}33`,
    border: `1px solid ${color}66`,
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 700,
    fontSize: '0.75rem',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
  };
}

function getPositionClass(pos) {
  const p = posToEN(pos);
  if (p === 'GK') return 'pos-gk';
  if (['RB', 'CB', 'LB', 'RWB', 'LWB', 'DF'].includes(p)) return 'pos-def';
  if (['CDM', 'CM', 'CAM', 'RM', 'LM', 'MF'].includes(p)) return 'pos-mid';
  return 'pos-fwd';
}

const WC_FORMATION_I18N = {
  es: { formation: 'Formación', starters: 'Titulares', subs: 'Suplentes', playMatch: 'Jugar Partido', vs: 'VS', rating: 'Valoración', injured: 'Lesionado', suspended: 'Sancionado', selectPlayer: 'Seleccionar jugador', opponent: 'Rival', tactic: 'Táctica', parameters: 'Parámetros', teamAverage: 'Media', reserves: 'Suplentes' },
  en: { formation: 'Formation', starters: 'Starters', subs: 'Substitutes', playMatch: 'Play Match', vs: 'VS', rating: 'Rating', injured: 'Injured', suspended: 'Suspended', selectPlayer: 'Select player', opponent: 'Opponent', tactic: 'Tactic', parameters: 'Parameters', teamAverage: 'Average', reserves: 'Reserves' },
  fr: { formation: 'Formation', starters: 'Titulaires', subs: 'Remplaçants', playMatch: 'Jouer', vs: 'VS', rating: 'Note', injured: 'Blessé', suspended: 'Suspendu', selectPlayer: 'Sélectionner', opponent: 'Adversaire', tactic: 'Tactique', parameters: 'Paramètres', teamAverage: 'Moyenne', reserves: 'Remplaçants' },
  de: { formation: 'Formation', starters: 'Startelf', subs: 'Ersatzbank', playMatch: 'Spielen', vs: 'VS', rating: 'Bewertung', injured: 'Verletzt', suspended: 'Gesperrt', selectPlayer: 'Spieler wählen', opponent: 'Gegner', tactic: 'Taktik', parameters: 'Parameter', teamAverage: 'Durchschnitt', reserves: 'Ersatzbank' },
  pt: { formation: 'Formação', starters: 'Titulares', subs: 'Suplentes', playMatch: 'Jogar', vs: 'VS', rating: 'Avaliação', injured: 'Lesionado', suspended: 'Suspenso', selectPlayer: 'Selecionar', opponent: 'Adversário', tactic: 'Tática', parameters: 'Parâmetros', teamAverage: 'Média', reserves: 'Suplentes' },
  it: { formation: 'Formazione', starters: 'Titolari', subs: 'Riserve', playMatch: 'Gioca', vs: 'VS', rating: 'Valutazione', injured: 'Infortunato', suspended: 'Squalificato', selectPlayer: 'Seleziona', opponent: 'Avversario', tactic: 'Tattica', parameters: 'Parametri', teamAverage: 'Media', reserves: 'Riserve' },
};

const PREDICTION_I18N = {
  es: { btn: 'Predecir resultado', title: 'Predicción', confirm: 'Confirmar', cancel: 'Cancelar', done: 'Predicción' },
  en: { btn: 'Predict result', title: 'Prediction', confirm: 'Confirm', cancel: 'Cancel', done: 'Prediction' },
  fr: { btn: 'Prédire le résultat', title: 'Prédiction', confirm: 'Confirmer', cancel: 'Annuler', done: 'Prédiction' },
  de: { btn: 'Ergebnis vorhersagen', title: 'Vorhersage', confirm: 'Bestätigen', cancel: 'Abbrechen', done: 'Vorhersage' },
  pt: { btn: 'Prever resultado', title: 'Previsão', confirm: 'Confirmar', cancel: 'Cancelar', done: 'Previsão' },
  it: { btn: 'Prevedere risultato', title: 'Previsione', confirm: 'Conferma', cancel: 'Annulla', done: 'Previsione' },
};

export default function WorldCupFormation({ squad, opponent, resources, formation: initFormation, onConfirm, teams, playerTeamId, unlockedFormations, starPlayer, suspendedPlayers = [], injuredPlayers = [], playerBuffs = {}, conflictPairs = [], opponentRevealed = false, teamBuffs = [], opponentDebuffs = [], wcState, prediction, onPrediction }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'es';
  const ui = WC_FORMATION_I18N[lang] || WC_FORMATION_I18N.es;
  const uiGlobal = WORLD_CUP_UI_I18N[lang] || WORLD_CUP_UI_I18N.es;
  const unlocked = unlockedFormations || ['4-3-3', '4-4-2', '3-5-2'];

  const [formation, setFormation] = useState(initFormation || '4-3-3');
  const hasUnavailable = suspendedPlayers.length > 0 || injuredPlayers.length > 0;
  const [lineup, setLineup] = useState(() => autoFill(squad, formation, resources, suspendedPlayers, injuredPlayers, hasUnavailable));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-3-3'];

  function getAdjustedRating(player) {
    if (!player) return 0;
    let r = player.rating || player.overall || 70;
    if (resources.morale < 30) r -= 3;
    if (resources.fitness < 30) r -= 5;
    return Math.max(30, Math.min(99, r));
  }

  function isUnavailable(player) {
    if (!player) return false;
    return suspendedPlayers.includes(player.name) || injuredPlayers.includes(player.name);
  }

  // Build categorized players (titulares + suplentes) matching Formation.jsx style
  const categorizedPlayers = useMemo(() => {
    const starterNames = new Set(Object.values(lineup).map(p => p?.name).filter(Boolean));
    
    // Titulares: ordered by slot position in formation
    const slotOrder = {};
    slots.forEach((s, idx) => { slotOrder[s.id] = idx; });
    
    const titulares = [];
    const lineupEntries = Object.entries(lineup);
    
    lineupEntries.forEach(([slotId, player]) => {
      if (!player) return;
      const slot = slots.find(s => s.id === slotId);
      const fit = slot ? getPositionFit(player.position, slot.pos) : { factor: 1.0, level: 'perfect' };
      titulares.push({ ...player, slotId, slotPos: slot?.pos, fit, _slotOrder: slotOrder[slotId] ?? 99 });
    });
    titulares.sort((a, b) => a._slotOrder - b._slotOrder);
    
    // Suplentes: everyone not in lineup
    const posOrder = { 'GK': 0, 'CB': 1, 'RB': 2, 'LB': 3, 'RWB': 4, 'LWB': 5, 'CDM': 6, 'CM': 7, 'RM': 8, 'LM': 9, 'CAM': 10, 'RW': 11, 'LW': 12, 'CF': 13, 'ST': 14 };
    const subs = squad
      .filter(p => !starterNames.has(p.name))
      .sort((a, b) => {
        const orderA = posOrder[a.position] ?? 99;
        const orderB = posOrder[b.position] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (b.rating || b.overall || 70) - (a.rating || a.overall || 70);
      });
    
    return { titulares, subs };
  }, [lineup, squad, slots]);

  // Player → slot map
  const playerSlotMap = useMemo(() => {
    const map = {};
    Object.entries(lineup).forEach(([slotId, player]) => {
      if (player?.name) map[player.name] = slotId;
    });
    return map;
  }, [lineup]);

  const handleFormationChange = useCallback((f) => {
    setFormation(f);
    setLineup(autoFill(squad, f, resources, suspendedPlayers, injuredPlayers, suspendedPlayers.length > 0 || injuredPlayers.length > 0));
    setSelectedSlot(null);
    setSelectedPlayer(null);
  }, [squad, resources, suspendedPlayers, injuredPlayers]);

  const handleSlotClick = useCallback((slotId) => {
    setSelectedSlot(slotId);
    setShowModal(true);
    setSelectedPlayer(null);
  }, []);

  const handlePlayerSelect = useCallback((player) => {
    if (!selectedSlot || isUnavailable(player)) return;
    setLineup(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (next[k]?.name === player.name) delete next[k];
      });
      next[selectedSlot] = player;
      return next;
    });
    setShowModal(false);
    setSelectedSlot(null);
  }, [selectedSlot]);

  // Row click: select/swap players (same as Formation.jsx)
  const handleRowClick = useCallback((player) => {
    if (isUnavailable(player)) return;
    
    if (!selectedPlayer) {
      setSelectedPlayer(player);
      return;
    }
    
    if (selectedPlayer.name === player.name) {
      setSelectedPlayer(null);
      return;
    }
    
    // Swap
    const player1 = selectedPlayer;
    const player2 = player;
    const slot1 = Object.keys(lineup).find(k => lineup[k]?.name === player1.name);
    const slot2 = Object.keys(lineup).find(k => lineup[k]?.name === player2.name);
    
    // Block unavailable players from entering lineup
    if (slot1 && !slot2 && isUnavailable(player2)) { setSelectedPlayer(null); return; }
    if (!slot1 && slot2 && isUnavailable(player1)) { setSelectedPlayer(null); return; }
    
    setLineup(prev => {
      const next = { ...prev };
      if (slot1 && slot2) {
        next[slot1] = player2;
        next[slot2] = player1;
      } else if (slot1 && !slot2) {
        next[slot1] = player2;
      } else if (!slot1 && slot2) {
        next[slot2] = player1;
      }
      return next;
    });
    setSelectedPlayer(null);
  }, [selectedPlayer, lineup]);

  // Swap compatibility check
  const getSwapFit = (p1, p2) => {
    if (!p1 || !p2 || p1.name === p2.name) return null;
    const s1 = playerSlotMap[p1.name];
    const s2 = playerSlotMap[p2.name];
    const slot1Data = s1 ? slots.find(s => s.id === s1) : null;
    const slot2Data = s2 ? slots.find(s => s.id === s2) : null;
    const pos1 = slot1Data?.pos || p1.position;
    const pos2 = slot2Data?.pos || p2.position;
    const fit1 = getPositionFit(p2.position, pos1);
    const fit2 = getPositionFit(p1.position, pos2);
    return fit1.factor >= fit2.factor ? fit1 : fit2;
  };

  const isCompatibleSwap = (p1, p2) => {
    const fit = getSwapFit(p1, p2);
    return fit !== null && fit.factor >= 0.7;
  };

  const opponentTeam = teams?.find(t => t.id === opponent);
  const opponentData = opponentTeam || { flag: '🏳️', name: opponent, rating: 70 };
  const opponentStyle = opponentData.style || 'balanced';

  // Build opponent's best XI from their squad using a default formation
  const opponentXI = useMemo(() => {
    if (!opponentData.players || opponentData.players.length === 0) return [];
    const OPP_FORMATION = [
      'GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW'
    ];
    const pool = [...opponentData.players].sort((a, b) => (b.rating || b.overall || 0) - (a.rating || a.overall || 0));
    const used = new Set();
    const xi = [];
    // First pass: exact position match (best rating first)
    for (const need of OPP_FORMATION) {
      const found = pool.find(p => !used.has(p.name) && (p.position === need || posToEN(p.position) === need));
      if (found) { used.add(found.name); xi.push({ ...found, assignedPos: need }); }
      else { xi.push(null); }
    }
    // Second pass: fill gaps with best remaining
    for (let i = 0; i < xi.length; i++) {
      if (!xi[i]) {
        const fill = pool.find(p => !used.has(p.name));
        if (fill) { used.add(fill.name); xi[i] = { ...fill, assignedPos: OPP_FORMATION[i] }; }
      }
    }
    return xi.filter(Boolean);
  }, [opponentData.players]);
  const [showSpyModal, setShowSpyModal] = useState(false);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [predHome, setPredHome] = useState(0);
  const [predAway, setPredAway] = useState(0);
  const predUi = PREDICTION_I18N[lang] || PREDICTION_I18N.en;

  // Spy tactic suggestion based on opponent style
  const SPY_SUGGESTIONS = {
    es: {
      defensive: { tactic: 'Posesión', tip: 'El rival juega muy defensivo. Con posesión puedes desmontar su bloque bajo poco a poco. Si tienes prisa, un ataque total también puede funcionar.' },
      offensive: { tactic: 'Contraataque', tip: 'El rival ataca mucho y deja espacios atrás. Un contraataque letal aprovecharía sus huecos. También podrías plantear un autobús y esperar tu momento.' },
      balanced: { tactic: 'Posesión o Contraataque', tip: 'El rival es equilibrado, no tiene debilidades claras. Adapta tu táctica a tus puntos fuertes. Si tienes buenos atacantes, presiona. Si no, controla el balón.' },
    },
    en: {
      defensive: { tactic: 'Possession', tip: 'The opponent plays very defensively. Possession can break down their low block. If you\'re in a hurry, all-out attack could also work.' },
      offensive: { tactic: 'Counter-attack', tip: 'The opponent attacks a lot and leaves gaps at the back. A lethal counter-attack would exploit those spaces. Parking the bus could also work.' },
      balanced: { tactic: 'Possession or Counter', tip: 'The opponent is balanced with no clear weaknesses. Adapt your tactic to your strengths. Strong attackers? Press. Otherwise, control the ball.' },
    },
    fr: {
      defensive: { tactic: 'Possession', tip: 'L\'adversaire joue très défensif. La possession peut casser leur bloc bas. En cas d\'urgence, l\'attaque totale peut fonctionner.' },
      offensive: { tactic: 'Contre-attaque', tip: 'L\'adversaire attaque beaucoup et laisse des espaces. Une contre-attaque mortelle exploiterait ces brèches.' },
      balanced: { tactic: 'Possession ou Contre', tip: 'L\'adversaire est équilibré. Adaptez votre tactique à vos forces.' },
    },
    de: {
      defensive: { tactic: 'Ballbesitz', tip: 'Der Gegner spielt sehr defensiv. Ballbesitz kann den tiefen Block knacken.' },
      offensive: { tactic: 'Konter', tip: 'Der Gegner greift viel an und lässt Lücken hinten. Ein tödlicher Konter nutzt diese Räume.' },
      balanced: { tactic: 'Ballbesitz oder Konter', tip: 'Der Gegner ist ausgeglichen. Passen Sie Ihre Taktik an Ihre Stärken an.' },
    },
    pt: {
      defensive: { tactic: 'Posse', tip: 'O adversário joga muito defensivo. Posse de bola pode desmontar o bloco baixo.' },
      offensive: { tactic: 'Contra-ataque', tip: 'O adversário ataca muito e deixa espaços. Um contra-ataque mortal aproveitaria essas brechas.' },
      balanced: { tactic: 'Posse ou Contra', tip: 'O adversário é equilibrado. Adapte a tática às suas forças.' },
    },
    it: {
      defensive: { tactic: 'Possesso', tip: 'L\'avversario gioca molto difensivo. Il possesso palla può smontare il blocco basso.' },
      offensive: { tactic: 'Contropiede', tip: 'L\'avversario attacca molto e lascia spazi dietro. Un contropiede letale sfrutterebbe queste falle.' },
      balanced: { tactic: 'Possesso o Contro', tip: 'L\'avversario è equilibrato. Adatta la tattica ai tuoi punti di forza.' },
    },
  };
  const spySuggestion = (SPY_SUGGESTIONS[lang] || SPY_SUGGESTIONS.en)[opponentStyle] || (SPY_SUGGESTIONS[lang] || SPY_SUGGESTIONS.en).balanced;

  const SPY_UI = {
    es: { title: 'Informe del Espía', style: 'Estilo de juego', recommendation: 'Recomendación', viewLineup: 'Ver alineación rival', close: 'Cerrar' },
    en: { title: 'Spy Report', style: 'Playing style', recommendation: 'Recommendation', viewLineup: 'View opponent lineup', close: 'Close' },
    fr: { title: 'Rapport d\'espion', style: 'Style de jeu', recommendation: 'Recommandation', viewLineup: 'Voir composition adverse', close: 'Fermer' },
    de: { title: 'Spion-Bericht', style: 'Spielstil', recommendation: 'Empfehlung', viewLineup: 'Gegner-Aufstellung', close: 'Schließen' },
    pt: { title: 'Relatório do Espião', style: 'Estilo de jogo', recommendation: 'Recomendação', viewLineup: 'Ver escalação rival', close: 'Fechar' },
    it: { title: 'Rapporto Spia', style: 'Stile di gioco', recommendation: 'Raccomandazione', viewLineup: 'Vedi formazione avversaria', close: 'Chiudi' },
  };
  const spyUi = SPY_UI[lang] || SPY_UI.en;

  const STYLE_NAMES = {
    es: { defensive: 'Defensivo', offensive: 'Ofensivo', balanced: 'Equilibrado' },
    en: { defensive: 'Defensive', offensive: 'Offensive', balanced: 'Balanced' },
    fr: { defensive: 'Défensif', offensive: 'Offensif', balanced: 'Équilibré' },
    de: { defensive: 'Defensiv', offensive: 'Offensiv', balanced: 'Ausgeglichen' },
    pt: { defensive: 'Defensivo', offensive: 'Ofensivo', balanced: 'Equilibrado' },
    it: { defensive: 'Difensivo', offensive: 'Offensivo', balanced: 'Equilibrato' },
  };

  const handleConfirm = () => {
    const starterList = Object.entries(lineup).map(([slotId, player]) => ({
      ...player,
      slotId,
      overall: getAdjustedRating(player),
    }));
    onConfirm({ formation, starters: starterList, lineup });
  };

  const starterCount = Object.values(lineup).filter(Boolean).length;
  const unavailableStarters = Object.values(lineup).filter(p => p && isUnavailable(p));
  
  // Team average
  const teamAvg = useMemo(() => {
    const starters = Object.values(lineup).filter(Boolean);
    if (starters.length === 0) return 0;
    return Math.round(starters.reduce((sum, p) => sum + getAdjustedRating(p), 0) / starters.length);
  }, [lineup, resources]);

  const getStarRating = (overall) => {
    if (overall >= 85) return 5;
    if (overall >= 80) return 4;
    if (overall >= 75) return 3;
    if (overall >= 70) return 2;
    return 1;
  };

  const renderStars = (count) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={12} className={i < count ? 'star-filled' : 'star-empty'} fill={i < count ? 'currentColor' : 'none'} />
    ));
  };

  return (
    <div className="pcf-formation wcf-wrapper">
      {/* HEADER - Opponent info */}
      <div className="pcf-header">
        <div className="pcf-header__team">
          <FlagIcon teamId={playerTeamId} size={32} />
          <span className="team-name">{(teams?.find(t => t.id === playerTeamId))?.name || playerTeamId}</span>
        </div>
        <div className="pcf-header__title">
          <h1>{ui.formation.toUpperCase()}</h1>
        </div>
        <div className="pcf-header__team" style={{ flexDirection: 'row-reverse' }}>
          <FlagIcon teamId={opponent} size={32} />
          <span className="team-name" style={{ textAlign: 'right' }}>
            {lang === 'es' ? (opponentData.nameEs || opponentData.name) : opponentData.name}
            <span style={{ marginLeft: 6, color: '#ffd700', fontSize: '0.8rem' }}>⭐ {opponentData.rating}</span>
          </span>
        </div>
      </div>

      {/* Buffs bar */}
      {(teamBuffs.length > 0 || Object.keys(playerBuffs).length > 0 || conflictPairs.length > 0 || opponentDebuffs.length > 0) && (
        <div className="wcf__buffs-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem', fontSize: '0.7rem' }}>
          {teamBuffs.map((b, i) => (
            <span key={i} className="wcf__buff-tag wcf__buff-tag--team">{b.value > 0 ? '🔺' : '🔻'} {b.description || b.type} ({b.duration})</span>
          ))}
          {Object.entries(playerBuffs).map(([name, b]) => (
            <span key={name} className="wcf__buff-tag wcf__buff-tag--player">⬆️ {name.split(' ').pop()} +{b.ratingMod}</span>
          ))}
          {conflictPairs.map(([a, b], i) => (
            <span key={i} className="wcf__buff-tag wcf__buff-tag--conflict">⚠️ {a.split(' ').pop()} ⚡ {b.split(' ').pop()}</span>
          ))}
          {opponentDebuffs.length > 0 && (
            <span className="wcf__buff-tag" style={{ background: 'rgba(255,69,58,0.15)', color: '#ff453a', padding: '2px 8px', borderRadius: 6 }}>🔻 {lang === 'es' ? 'Rival debilitado' : 'Rival weakened'} (-{opponentDebuffs.reduce((s, d) => s + d.value, 0)})</span>
          )}
        </div>
      )}

      {/* MAIN CONTENT - same grid as Formation.jsx */}
      <div className="pcf-content">
        {/* LEFT: Player table */}
        <div className="pcf-table-container">
          {/* TITULARES */}
          <div className="pcf-table">
            <div className="table-header titulares">
              <span className="col-num">Nº</span>
              <span className="col-name">{ui.starters}</span>
              <span className="col-status"></span>
              <span className="col-attr">MED</span>
              <span className="col-pos">POS</span>
            </div>
            <div className="table-body">
              {categorizedPlayers.titulares.map((player, idx) => {
                const isSelected = selectedPlayer?.name === player.name;
                const isCompatible = selectedPlayer && !isSelected && isCompatibleSwap(selectedPlayer, player);
                const swapFit = isCompatible ? getSwapFit(selectedPlayer, player) : null;
                const swapClass = swapFit ? (swapFit.level === 'perfect' ? 'swap-perfect' : swapFit.level === 'good' ? 'swap-good' : 'swap-decent') : '';
                const adjRating = Math.round(getAdjustedRating(player) * player.fit.factor);
                const fitClass = `fit-${player.fit.level}`;
                const slotPos = player.slotPos || player.position;
                const unavailable = isUnavailable(player);
                
                return (
                  <div
                    key={player.name}
                    className={`table-row titulares ${getPositionClass(player.position)} ${isSelected ? 'selected' : ''} ${isCompatible ? `compatible-swap ${swapClass}` : ''} ${unavailable ? 'injured' : ''}`}
                    onClick={() => handleRowClick(player)}
                  >
                    <span className="col-num">{idx + 1}</span>
                    <span className="col-name">{player.name}</span>
                    <span className="col-status">
                      {injuredPlayers.includes(player.name) && <span className="status-icon injury"><HeartPulse size={14} /></span>}
                      {suspendedPlayers.includes(player.name) && <span className="status-icon red" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><span style={{ width: 10, height: 14, background: '#ef4444', borderRadius: 2, display: 'inline-block' }}></span><span style={{ fontSize: '0.65rem' }}>1p</span></span>}
                      {playerBuffs[player.name] && <span style={{ color: '#4afa7f', fontSize: '0.65rem' }}>+{playerBuffs[player.name].ratingMod}</span>}
                    </span>
                    <span className={`col-attr ${fitClass}`}>{adjRating}</span>
                    <span className="col-pos" style={getPositionStyle(slotPos)}>
                      {translatePosition(slotPos)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SUPLENTES */}
          <div className="pcf-section-header convocados">{ui.reserves.toUpperCase()}</div>
          <div className="pcf-table">
            <div className="table-body table-body--scroll">
              {categorizedPlayers.subs.map((player, idx) => {
                const isSelected = selectedPlayer?.name === player.name;
                const isCompatible = selectedPlayer && !isSelected && isCompatibleSwap(selectedPlayer, player);
                const swapFit = isCompatible ? getSwapFit(selectedPlayer, player) : null;
                const swapClass = swapFit ? (swapFit.level === 'perfect' ? 'swap-perfect' : swapFit.level === 'good' ? 'swap-good' : 'swap-decent') : '';
                const rating = getAdjustedRating(player);
                const unavailable = isUnavailable(player);
                
                return (
                  <div
                    key={player.name}
                    className={`table-row convocados ${getPositionClass(player.position)} ${isSelected ? 'selected' : ''} ${isCompatible ? `compatible-swap ${swapClass}` : ''} ${unavailable ? 'injured' : ''}`}
                    onClick={() => handleRowClick(player)}
                  >
                    <span className="col-num">{11 + idx + 1}</span>
                    <span className="col-name">{player.name}</span>
                    <span className="col-status">
                      {injuredPlayers.includes(player.name) && <span className="status-icon injury"><HeartPulse size={14} /> {ui.injured}</span>}
                      {suspendedPlayers.includes(player.name) && <span className="status-icon red" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><span style={{ width: 10, height: 14, background: '#ef4444', borderRadius: 2, display: 'inline-block' }}></span><span style={{ fontSize: '0.65rem' }}>1p</span></span>}
                    </span>
                    <span className={`col-attr ${rating >= 80 ? 'high' : rating <= 60 ? 'low' : ''}`}>{unavailable ? '—' : rating}</span>
                    <span className="col-pos" style={getPositionStyle(player.position)}>
                      {translatePosition(player.position)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Sidebar with pitch + params */}
        <div className="pcf-sidebar">
          {/* PITCH */}
          <div className="pcf-pitch">
            <div className="pitch-bg">
              <div className="pitch-line center"></div>
              <div className="pitch-circle"></div>
              <div className="pitch-area top"></div>
              <div className="pitch-area bottom"></div>
            </div>

            {slots.map(slot => {
              const player = lineup[slot.id];
              const fit = player ? getPositionFit(player.position, slot.pos) : null;
              const adjRating = player ? Math.round(getAdjustedRating(player) * fit.factor) : null;
              const borderColor = fit ? (FIT_COLORS[fit.level] || '#fff') : '#fff';

              return (
                <div
                  key={slot.id}
                  className={`pitch-slot ${player ? 'filled' : 'empty'}`}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  onClick={() => handleSlotClick(slot.id)}
                >
                  {player ? (
                    <div className="player-dot" style={{ background: getPositionColor(player.position), borderColor }}>
                      <span className="ovr">{adjRating}</span>
                    </div>
                  ) : (
                    <div className="empty-dot">
                      <span>+</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* PARAMETERS */}
          <div className="pcf-params">
            <div className="params-header">{ui.parameters}</div>
            <div className="params-section">
              <div className="param-item">
                <span className="label">{ui.rating}</span>
                <span className="stars">{renderStars(getStarRating(teamAvg))}</span>
              </div>
              <div className="param-item">
                <span className="label">{ui.teamAverage}</span>
                <span className="value big">{teamAvg}</span>
              </div>
            </div>

            {selectedPlayer && (
              <div className="params-player">
                <div className="player-name">{selectedPlayer.name}</div>
                <div className="player-info-grid">
                  <div className="info-item">
                    <span className="label">OVR</span>
                    <span className="value">{getAdjustedRating(selectedPlayer)}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">POS</span>
                    <span className="value">{selectedPlayer.position}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FORMATION TABS - same style as Formation.jsx TacticModal */}
          <div className="wcf-formation-tabs">
            {FORMATIONS.map(f => {
              const isLocked = !unlocked.includes(f);
              const isActive = f === formation;
              return (
                <button
                  key={f}
                  className={`pcf-btn ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => !isLocked && handleFormationChange(f)}
                  disabled={isLocked}
                  style={isActive ? { background: 'rgba(48, 209, 88, 0.15)', borderColor: 'rgba(48, 209, 88, 0.4)', color: '#30d158' } : {}}
                >
                  {isLocked && <Lock size={10} />}
                  {f}
                </button>
              );
            })}
          </div>

          {/* SPY BUTTON */}
          {opponentRevealed && (
            <button
              className="wcf-spy-btn"
              onClick={() => setShowSpyModal(true)}
            >
              <Eye size={18} />
              {spyUi.viewLineup}
            </button>
          )}

          {/* PREDICTION BUTTON */}
          {wcState?.perks?.tac1 && (
            prediction ? (
              <div className="wcf-spy-btn" style={{ opacity: 0.7, cursor: 'default', color: '#30d158', borderColor: 'rgba(48,209,88,0.25)', background: 'rgba(48,209,88,0.08)' }}>
                <CheckCircle2 size={18} />
                {predUi.done}: {prediction.home} - {prediction.away}
              </div>
            ) : (
              <button className="wcf-spy-btn" onClick={() => { setPredHome(0); setPredAway(0); setShowPredictionModal(true); }}>
                <Target size={18} />
                {predUi.btn}
              </button>
            )
          )}

          {/* PLAY MATCH BUTTON */}
          {unavailableStarters.length > 0 && (
            <div className="wcf-warning" style={{ 
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', 
              borderRadius: 10, padding: '0.6rem 0.8rem', marginBottom: '0.5rem',
              color: '#fca5a5', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.4
            }}>
              ⚠️ {unavailableStarters.map(p => p.name).join(', ')} {unavailableStarters.length === 1 ? (lang === 'es' ? 'no puede jugar' : 'cannot play') : (lang === 'es' ? 'no pueden jugar' : 'cannot play')}. {lang === 'es' ? 'Cámbialos antes de jugar.' : 'Swap them before playing.'}
            </div>
          )}
          <button
            className="wcf-play-btn"
            onClick={handleConfirm}
            disabled={starterCount < 11 || unavailableStarters.length > 0}
            style={unavailableStarters.length > 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          >
            <Swords size={20} />
            {ui.playMatch}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* SPY MODAL */}
      {showSpyModal && (
        <div className="wcf-spy-overlay" onClick={() => setShowSpyModal(false)}>
          <div className="wcf-spy-modal" onClick={e => e.stopPropagation()}>
            <div className="wcf-spy-modal__header">
              <Eye size={20} style={{ color: '#14b8a6' }} />
              <h3>{spyUi.title}</h3>
              <button className="wcf-spy-modal__close" onClick={() => setShowSpyModal(false)}><X size={16} /></button>
            </div>

            <div className="wcf-spy-modal__team">
              <FlagIcon teamId={opponent} size={40} />
              <div>
                <span className="wcf-spy-modal__team-name">{lang === 'es' ? (opponentData.nameEs || opponentData.name) : opponentData.name}</span>
                <span className="wcf-spy-modal__team-rating">⭐ {opponentData.rating}</span>
              </div>
            </div>

            <div className="wcf-spy-modal__section">
              <span className="wcf-spy-modal__label">{spyUi.style}</span>
              <span className="wcf-spy-modal__style">
                {STYLE_EMOJIS[opponentStyle] || '⚖️'} {(STYLE_NAMES[lang] || STYLE_NAMES.en)[opponentStyle] || opponentStyle}
              </span>
            </div>

            {/* Opponent players */}
            {opponentXI.length > 0 && (
              <div className="wcf-spy-modal__lineup">
                {opponentXI.map((p, i) => (
                  <div key={i} className="wcf-spy-modal__player">
                    <span className="wcf-spy-modal__player-pos" style={getPositionStyle(p.assignedPos || p.position)}>{translatePosition(p.assignedPos || p.position)}</span>
                    <span className="wcf-spy-modal__player-name">{p.name}</span>
                    <span className="wcf-spy-modal__player-ovr">{p.rating || p.overall || '—'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="wcf-spy-modal__suggestion">
              <div className="wcf-spy-modal__suggestion-header">
                <Eye size={14} style={{ color: '#14b8a6' }} />
                <span>{spyUi.recommendation}</span>
              </div>
              <p className="wcf-spy-modal__suggestion-text">
                <strong>🎯 {spySuggestion.tactic}</strong> — {spySuggestion.tip}
              </p>
            </div>

            <button className="wcf-spy-modal__close-btn" onClick={() => setShowSpyModal(false)}>
              {spyUi.close}
            </button>
          </div>
        </div>
      )}

      {/* PREDICTION MODAL */}
      {showPredictionModal && (
        <div className="wcf-spy-overlay" onClick={() => setShowPredictionModal(false)}>
          <div className="wcf-prediction-modal" onClick={e => e.stopPropagation()}>
            <div className="wcf-spy-modal__header">
              <Target size={20} style={{ color: '#30d158' }} />
              <h3>{predUi.title}</h3>
              <button className="wcf-spy-modal__close" onClick={() => setShowPredictionModal(false)}><X size={16} /></button>
            </div>

            {/* Home team row */}
            <div className="wcf-prediction-row">
              <div className="wcf-prediction-team">
                <FlagIcon teamId={playerTeamId} size={28} />
                <span>{(teams?.find(t => t.id === playerTeamId))?.name || playerTeamId}</span>
              </div>
              <div className="wcf-prediction-score">
                <button className="wcf-prediction-btn" onClick={() => setPredHome(h => Math.max(0, h - 1))}>−</button>
                <span className="wcf-prediction-num">{predHome}</span>
                <button className="wcf-prediction-btn" onClick={() => setPredHome(h => Math.min(9, h + 1))}>+</button>
              </div>
            </div>

            {/* Away team row */}
            <div className="wcf-prediction-row">
              <div className="wcf-prediction-team">
                <FlagIcon teamId={opponent} size={28} />
                <span>{lang === 'es' ? (opponentData.nameEs || opponentData.name) : opponentData.name}</span>
              </div>
              <div className="wcf-prediction-score">
                <button className="wcf-prediction-btn" onClick={() => setPredAway(a => Math.max(0, a - 1))}>−</button>
                <span className="wcf-prediction-num">{predAway}</span>
                <button className="wcf-prediction-btn" onClick={() => setPredAway(a => Math.min(9, a + 1))}>+</button>
              </div>
            </div>

            <div className="wcf-prediction-actions">
              <button className="wcf-prediction-confirm" onClick={() => { onPrediction({ home: predHome, away: predAway }); setShowPredictionModal(false); }}>
                <Check size={16} /> {predUi.confirm}
              </button>
              <button className="wcf-spy-modal__close-btn" onClick={() => setShowPredictionModal(false)}>
                {predUi.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Player selection (same as Formation.jsx) */}
      {showModal && selectedSlot && (
        <div className="pcf-modal-overlay" onClick={() => { setShowModal(false); setSelectedSlot(null); }}>
          <div className="pcf-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{ui.selectPlayer} — {selectedSlot}</h3>
              <button onClick={() => { setShowModal(false); setSelectedSlot(null); }}><X size={14} /></button>
            </div>
            <div className="modal-body">
              {squad
                .filter(p => !isUnavailable(p))
                .sort((a, b) => {
                  const slotData = slots.find(s => s.id === selectedSlot);
                  const fitA = slotData ? getPositionFit(a.position, slotData.pos) : { factor: 0.5 };
                  const fitB = slotData ? getPositionFit(b.position, slotData.pos) : { factor: 0.5 };
                  if (fitB.factor !== fitA.factor) return fitB.factor - fitA.factor;
                  return (b.rating || b.overall || 70) - (a.rating || a.overall || 70);
                })
                .map(player => {
                  const slotData = slots.find(s => s.id === selectedSlot);
                  const fit = slotData ? getPositionFit(player.position, slotData.pos) : { factor: 0.7, level: 'poor' };
                  const fitClass = fit.level === 'perfect' ? 'fit-perfect' :
                                   fit.level === 'good' ? 'fit-good' : '';
                  const isInLineup = Object.values(lineup).some(p => p?.name === player.name);
                  return (
                    <div
                      key={player.name}
                      className={`modal-player ${fitClass} ${isInLineup ? 'in-lineup' : ''}`}
                      onClick={() => handlePlayerSelect(player)}
                    >
                      <span className="pos" style={{ color: getPositionColor(player.position) }}>
                        {translatePosition(player.position)}
                      </span>
                      <span className="name">{player.name}</span>
                      <span className="ovr">{getAdjustedRating(player)}</span>
                      {fit.level === 'perfect' && <span className="badge"><Check size={10} /></span>}
                      {fit.level === 'good' && <span className="badge good">≈</span>}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function autoFill(squad, formation, resources, suspendedPlayers = [], injuredPlayers = [], keepUnavailable = false) {
  const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-3-3'];
  const lineup = {};
  const used = new Set();

  if (keepUnavailable) {
    // First pass: place unavailable players in their best-fit slots
    const unavailable = squad.filter(p => suspendedPlayers.includes(p.name) || injuredPlayers.includes(p.name));
    unavailable.forEach(p => {
      let bestSlot = null, bestFit = 0;
      slots.forEach(slot => {
        if (lineup[slot.id]) return;
        const fit = getPositionFit(p.position, slot.pos).factor;
        if (fit > bestFit) { bestFit = fit; bestSlot = slot; }
      });
      if (bestSlot) {
        lineup[bestSlot.id] = p;
        used.add(p.name);
      }
    });
  }

  // Fill remaining slots with available players
  slots.forEach(slot => {
    if (lineup[slot.id]) return; // already filled by unavailable player
    const best = squad
      .filter(p => !used.has(p.name) && !p.injured && !p.suspended && !p.banned && !suspendedPlayers.includes(p.name) && !injuredPlayers.includes(p.name))
      .sort((a, b) => {
        const fitA = getPositionFit(a.position, slot.pos);
        const fitB = getPositionFit(b.position, slot.pos);
        const rA = (a.rating || a.overall || 70) * fitA.factor;
        const rB = (b.rating || b.overall || 70) * fitB.factor;
        return rB - rA;
      })[0];
    if (best) {
      lineup[slot.id] = best;
      used.add(best.name);
    }
  });

  return lineup;
}
