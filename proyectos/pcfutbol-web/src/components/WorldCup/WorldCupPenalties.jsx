import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Shield, Zap, Star, X, AlertTriangle } from 'lucide-react';
import FlagIcon from './FlagIcon';
import './WorldCupPenalties.scss';

// ─── i18n ───
const PENALTY_I18N = {
  es: {
    title: 'Tanda de Penaltis',
    selectTakers: 'Elige tus 5 lanzadores (el orden importa)',
    confirm: 'Confirmar lanzadores',
    chooseDirection: 'Elige la dirección del lanzamiento',
    chooseDive: 'Elige hacia dónde tirarte',
    left: 'Izquierda', center: 'Centro', right: 'Derecha',
    goal: '¡GOL!', saved: '¡PARADO!', miss: '¡FUERA!',
    youWin: '¡GANAS POR PENALTIS!', youLose: 'Eliminados por penaltis...',
    suddenDeath: 'MUERTE SÚBITA',
    round: 'Ronda',
    yourTeam: 'Tu equipo',
    opponent: 'Rival',
    yourTurn: 'Tu turno de lanzar',
    gkTurn: 'Tu turno de parar',
    waiting: 'El rival lanza...',
    stopPower: '¡Toca para lanzar!',
    gkHintLeft: 'El portero parece inquieto hacia la izquierda',
    gkHintCenter: 'El portero se mantiene firme en el centro',
    gkHintRight: 'El portero parece inclinarse hacia la derecha',
    strikerHintLeft: 'El delantero mira a la izquierda...',
    strikerHintCenter: 'El delantero mira fijamente al centro...',
    strikerHintRight: 'El delantero mira a la derecha...',
    decisive: '¡Momento decisivo! Tu estrella se prepara...',
    tooMuchPower: '¡Demasiada potencia!',
    tooLittlePower: '¡Muy flojo!',
    ovr: 'OVR',
  },
  en: {
    title: 'Penalty Shootout',
    selectTakers: 'Pick your 5 penalty takers (order matters)',
    confirm: 'Confirm takers',
    chooseDirection: 'Choose the kick direction',
    chooseDive: 'Choose which way to dive',
    left: 'Left', center: 'Center', right: 'Right',
    goal: 'GOAL!', saved: 'SAVED!', miss: 'MISS!',
    youWin: 'YOU WIN ON PENALTIES!', youLose: 'Eliminated on penalties...',
    suddenDeath: 'SUDDEN DEATH',
    round: 'Round',
    yourTeam: 'Your team',
    opponent: 'Opponent',
    yourTurn: 'Your turn to shoot',
    gkTurn: 'Your turn to save',
    waiting: 'Opponent shoots...',
    stopPower: 'Tap to shoot!',
    gkHintLeft: 'The keeper seems restless towards the left',
    gkHintCenter: 'The keeper stands firm in the center',
    gkHintRight: 'The keeper seems to lean right',
    strikerHintLeft: 'The striker glances left...',
    strikerHintCenter: 'The striker stares straight at center...',
    strikerHintRight: 'The striker glances right...',
    decisive: 'Decisive moment! Your star steps up...',
    tooMuchPower: 'Too much power!',
    tooLittlePower: 'Too weak!',
    ovr: 'OVR',
  },
  fr: {
    title: 'Tirs au but',
    selectTakers: 'Choisissez vos 5 tireurs (l\'ordre compte)',
    confirm: 'Confirmer',
    chooseDirection: 'Choisissez la direction',
    chooseDive: 'Choisissez où plonger',
    left: 'Gauche', center: 'Centre', right: 'Droite',
    goal: 'BUT !', saved: 'ARRÊTÉ !', miss: 'RATÉ !',
    youWin: 'VICTOIRE AUX TIRS AU BUT !', youLose: 'Éliminés aux tirs au but...',
    suddenDeath: 'MORT SUBITE',
    round: 'Tour', yourTeam: 'Votre équipe', opponent: 'Adversaire',
    yourTurn: 'Votre tour de tirer', gkTurn: 'Votre tour d\'arrêter', waiting: 'L\'adversaire tire...',
    stopPower: 'Touchez pour tirer !',
    gkHintLeft: 'Le gardien semble nerveux vers la gauche',
    gkHintCenter: 'Le gardien reste planté au centre',
    gkHintRight: 'Le gardien semble pencher à droite',
    strikerHintLeft: 'L\'attaquant regarde à gauche...',
    strikerHintCenter: 'L\'attaquant fixe le centre...',
    strikerHintRight: 'L\'attaquant regarde à droite...',
    decisive: 'Moment décisif ! Votre star s\'avance...',
    tooMuchPower: 'Trop de puissance !', tooLittlePower: 'Trop faible !', ovr: 'OVR',
  },
  de: {
    title: 'Elfmeterschießen',
    selectTakers: 'Wähle 5 Schützen (Reihenfolge zählt)',
    confirm: 'Bestätigen',
    chooseDirection: 'Wähle die Richtung',
    chooseDive: 'Wähle die Sprungrichtung',
    left: 'Links', center: 'Mitte', right: 'Rechts',
    goal: 'TOR!', saved: 'GEHALTEN!', miss: 'DANEBEN!',
    youWin: 'SIEG IM ELFMETERSCHIESSEN!', youLose: 'Im Elfmeterschießen ausgeschieden...',
    suddenDeath: 'SUDDEN DEATH',
    round: 'Runde', yourTeam: 'Dein Team', opponent: 'Gegner',
    yourTurn: 'Du schießt', gkTurn: 'Du hältst', waiting: 'Gegner schießt...',
    stopPower: 'Tippe zum Schießen!',
    gkHintLeft: 'Der Torwart wirkt unruhig nach links',
    gkHintCenter: 'Der Torwart bleibt in der Mitte',
    gkHintRight: 'Der Torwart scheint nach rechts zu tendieren',
    strikerHintLeft: 'Der Stürmer schaut nach links...',
    strikerHintCenter: 'Der Stürmer starrt geradeaus...',
    strikerHintRight: 'Der Stürmer schaut nach rechts...',
    decisive: 'Entscheidender Moment! Dein Star tritt an...',
    tooMuchPower: 'Zu viel Kraft!', tooLittlePower: 'Zu schwach!', ovr: 'OVR',
  },
  pt: {
    title: 'Grandes Penalidades',
    selectTakers: 'Escolha os 5 marcadores (a ordem importa)',
    confirm: 'Confirmar',
    chooseDirection: 'Escolha a direção',
    chooseDive: 'Escolha para onde mergulhar',
    left: 'Esquerda', center: 'Centro', right: 'Direita',
    goal: 'GOLO!', saved: 'DEFENDIDO!', miss: 'FORA!',
    youWin: 'VITÓRIA NOS PENÁLTIS!', youLose: 'Eliminados nos penáltis...',
    suddenDeath: 'MORTE SÚBITA',
    round: 'Ronda', yourTeam: 'A sua equipa', opponent: 'Adversário',
    yourTurn: 'A sua vez de chutar', gkTurn: 'A sua vez de defender', waiting: 'O adversário chuta...',
    stopPower: 'Toque para chutar!',
    gkHintLeft: 'O guarda-redes parece inquieto para a esquerda',
    gkHintCenter: 'O guarda-redes mantém-se firme no centro',
    gkHintRight: 'O guarda-redes parece inclinar-se para a direita',
    strikerHintLeft: 'O avançado olha para a esquerda...',
    strikerHintCenter: 'O avançado fixa o centro...',
    strikerHintRight: 'O avançado olha para a direita...',
    decisive: 'Momento decisivo! A sua estrela prepara-se...',
    tooMuchPower: 'Demasiada força!', tooLittlePower: 'Muito fraco!', ovr: 'OVR',
  },
  it: {
    title: 'Calci di Rigore',
    selectTakers: 'Scegli i 5 tiratori (l\'ordine conta)',
    confirm: 'Conferma',
    chooseDirection: 'Scegli la direzione',
    chooseDive: 'Scegli dove tuffarti',
    left: 'Sinistra', center: 'Centro', right: 'Destra',
    goal: 'GOL!', saved: 'PARATO!', miss: 'FUORI!',
    youWin: 'VITTORIA AI RIGORI!', youLose: 'Eliminati ai rigori...',
    suddenDeath: 'RIGORI AD OLTRANZA',
    round: 'Turno', yourTeam: 'La tua squadra', opponent: 'Avversario',
    yourTurn: 'Il tuo turno di tirare', gkTurn: 'Il tuo turno di parare', waiting: 'L\'avversario tira...',
    stopPower: 'Tocca per tirare!',
    gkHintLeft: 'Il portiere sembra irrequieto verso sinistra',
    gkHintCenter: 'Il portiere resta fermo al centro',
    gkHintRight: 'Il portiere sembra inclinarsi a destra',
    strikerHintLeft: 'L\'attaccante guarda a sinistra...',
    strikerHintCenter: 'L\'attaccante fissa il centro...',
    strikerHintRight: 'L\'attaccante guarda a destra...',
    decisive: 'Momento decisivo! La tua stella si prepara...',
    tooMuchPower: 'Troppa potenza!', tooLittlePower: 'Troppo debole!', ovr: 'OVR',
  },
};

const DIRECTIONS = ['left', 'center', 'right'];

// ─── Helpers ───

function getPlayerRating(p) {
  return p.rating || p.overall || 70;
}

function findGK(squad) {
  const gk = squad.find(p => p.position === 'GK' && !p.injured && !p.suspended);
  if (gk) return gk;
  // Fallback: highest rated
  return [...squad].sort((a, b) => getPlayerRating(b) - getPlayerRating(a))[0];
}

function generateGKBias() {
  const roll = Math.random();
  if (roll < 0.33) return 'left';
  if (roll < 0.66) return 'right';
  return 'center';
}

function getBiasWeights(bias) {
  // Returns [left, center, right] probabilities
  if (bias === 'left') return [0.4, 0.3, 0.3];
  if (bias === 'right') return [0.3, 0.3, 0.4];
  return [0.3, 0.4, 0.3]; // center
}

function pickWeighted(weights) {
  const r = Math.random();
  if (r < weights[0]) return 'left';
  if (r < weights[0] + weights[1]) return 'center';
  return 'right';
}

function calcShootProb({ player, takerIndex, pressure, isSuddenDeath }) {
  let prob = 0.60;
  const ovr = getPlayerRating(player);
  if (ovr > 75) prob += Math.min((ovr - 75) * 0.01, 0.28);
  prob = Math.min(prob, 0.88);

  if (player.yellowCard) prob -= 0.08;
  if ((player.fitness ?? 100) < 40) prob -= 0.10;

  // Pressure penalty for 4th and 5th takers (index 3, 4)
  if (takerIndex >= 3 && takerIndex < 5) {
    prob -= (pressure || 50) / 1000;
  }

  // Sudden death extra pressure
  if (isSuddenDeath) {
    prob -= 0.05;
  }

  return Math.max(0.15, Math.min(0.88, prob));
}

function calcGKSaveProb(gk) {
  const rating = getPlayerRating(gk);
  let prob = 0.25;
  if (rating > 90) prob += 0.15;
  else if (rating > 85) prob += 0.10;
  return prob;
}

function getPowerZone(power) {
  if (power < 15 || power > 90) return 'red';
  if (power < 35 || power > 75) return 'yellow';
  return 'green';
}

function getPowerSpeed(ovr, isSuddenDeath) {
  // Base speed: 2-4 (lower = slower = easier). Low OVR and sudden death = faster
  let speed = 2.5;
  if (ovr < 70) speed += 0.8;
  else if (ovr < 80) speed += 0.3;
  if (isSuddenDeath) speed += 0.6;
  return speed;
}

// ─── Power Bar Component ───

function PowerBar({ ovr, isSuddenDeath, onStop, ui }) {
  const [power, setPower] = useState(0);
  const [stopped, setStopped] = useState(false);
  const animRef = useRef(null);
  const dirRef = useRef(1);
  const valRef = useRef(0);
  const speed = getPowerSpeed(ovr, isSuddenDeath);

  useEffect(() => {
    if (stopped) return;
    let lastTime = null;
    const tick = (ts) => {
      if (!lastTime) lastTime = ts;
      const dt = ts - lastTime;
      lastTime = ts;
      valRef.current += dirRef.current * speed * (dt / 16);
      if (valRef.current >= 100) { valRef.current = 100; dirRef.current = -1; }
      if (valRef.current <= 0) { valRef.current = 0; dirRef.current = 1; }
      setPower(Math.round(valRef.current));
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [stopped, speed]);

  const handleStop = () => {
    if (stopped) return;
    setStopped(true);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    onStop(Math.round(valRef.current));
  };

  const zone = getPowerZone(power);
  const zoneColor = zone === 'green' ? '#22c55e' : zone === 'yellow' ? '#eab308' : '#ef4444';

  return (
    <div className="wc-pen__power" onClick={handleStop}>
      <div className="wc-pen__power-label">{ui.stopPower}</div>
      <div className="wc-pen__power-track">
        {/* Zone indicators */}
        <div className="wc-pen__power-zones">
          <div className="wc-pen__power-zone wc-pen__power-zone--red" style={{ left: '0%', width: '15%' }} />
          <div className="wc-pen__power-zone wc-pen__power-zone--yellow" style={{ left: '15%', width: '20%' }} />
          <div className="wc-pen__power-zone wc-pen__power-zone--green" style={{ left: '35%', width: '40%' }} />
          <div className="wc-pen__power-zone wc-pen__power-zone--yellow" style={{ left: '75%', width: '15%' }} />
          <div className="wc-pen__power-zone wc-pen__power-zone--red" style={{ left: '90%', width: '10%' }} />
        </div>
        <div
          className="wc-pen__power-needle"
          style={{ left: `${power}%`, background: zoneColor }}
        />
      </div>
      <div className="wc-pen__power-value" style={{ color: zoneColor }}>{power}</div>
    </div>
  );
}

// ─── Main Component ───

export default function WorldCupPenalties({ squad, playerTeamId, opponentTeam, playerTeam, isHome, morale, pressure, penaltyBonus, onResult }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'es';
  const ui = PENALTY_I18N[lang] || PENALTY_I18N.es;

  const [phase, setPhase] = useState('select'); // select | shooting | result
  const [takers, setTakers] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [turnType, setTurnType] = useState('shoot'); // 'shoot' | 'power' | 'gk'
  const [playerScores, setPlayerScores] = useState([]);
  const [opponentScores, setOpponentScores] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [ballAnim, setBallAnim] = useState(null);
  const [gkAnim, setGkAnim] = useState(null);
  const [finished, setFinished] = useState(false);
  const [winner, setWinner] = useState(null);
  const [suspenseActive, setSuspenseActive] = useState(false);

  // New state
  const [chosenDirection, setChosenDirection] = useState(null);
  const [gkBias] = useState(() => generateGKBias());
  const [gkHint, setGkHint] = useState('');
  const [strikerHint, setStrikerHint] = useState('');
  const [lastTwoGKDives, setLastTwoGKDives] = useState([]); // track player's GK dives
  const [opponentGKBias] = useState(() => generateGKBias()); // opponent GK bias for when player shoots

  const availablePlayers = (squad || []).filter(p => !p.injured && !p.suspended && !p.banned);
  const playerGK = findGK(availablePlayers);
  const gkSaveProb = calcGKSaveProb(playerGK || { rating: 70 });
  const isSuddenDeath = currentRound >= 5;

  const oppName = lang === 'es' ? (opponentTeam?.nameEs || opponentTeam?.name || 'Rival') : (opponentTeam?.name || 'Rival');

  // Get current taker
  const currentTaker = takers.length > 0 ? takers[currentRound % takers.length] : null;
  const currentTakerOVR = currentTaker ? getPlayerRating(currentTaker) : 70;

  // Is current taker the star (highest rated)?
  const starPlayer = availablePlayers.length > 0
    ? availablePlayers.reduce((best, p) => getPlayerRating(p) > getPlayerRating(best) ? p : best, availablePlayers[0])
    : null;
  const isStarTaker = currentTaker && starPlayer && currentTaker.name === starPlayer.name;

  // ─── Generate GK hint (for player shooting phase) ───
  const generateGKHint = useCallback(() => {
    // 50% correct, 50% decoy
    const isCorrect = Math.random() < 0.5;
    const actualBias = opponentGKBias;
    let hintDir;
    if (isCorrect) {
      hintDir = actualBias;
    } else {
      const others = DIRECTIONS.filter(d => d !== actualBias);
      hintDir = others[Math.floor(Math.random() * others.length)];
    }
    const key = `gkHint${hintDir.charAt(0).toUpperCase() + hintDir.slice(1)}`;
    return ui[key] || '';
  }, [opponentGKBias, ui]);

  // ─── Generate striker hint (for GK phase) ───
  const generateStrikerHint = useCallback(() => {
    // Opponent will shoot - generate hint (60% correct)
    const biasWeights = getBiasWeights(gkBias);
    const likelyDir = pickWeighted(biasWeights);
    const isCorrect = Math.random() < 0.6;
    let hintDir;
    if (isCorrect) {
      hintDir = likelyDir;
    } else {
      const others = DIRECTIONS.filter(d => d !== likelyDir);
      hintDir = others[Math.floor(Math.random() * others.length)];
    }
    const key = `strikerHint${hintDir.charAt(0).toUpperCase() + hintDir.slice(1)}`;
    return ui[key] || '';
  }, [gkBias, ui]);

  const toggleTaker = (player) => {
    setTakers(prev => {
      if (prev.find(p => p.name === player.name)) return prev.filter(p => p.name !== player.name);
      if (prev.length >= 5) return prev;
      return [...prev, player];
    });
  };

  const confirmTakers = () => {
    if (takers.length < 5) return;
    setPhase('shooting');
    setTurnType('shoot');
    setGkHint(generateGKHint());
  };

  // ─── Player chooses direction → show power bar ───
  const handleShootDirection = useCallback((dir) => {
    if (finished || suspenseActive) return;
    setChosenDirection(dir);
    setTurnType('power');
  }, [finished, suspenseActive]);

  // ─── Power bar stopped → resolve shot ───
  const handlePowerStop = useCallback((powerValue) => {
    if (finished || suspenseActive) return;
    setSuspenseActive(true);
    const dir = chosenDirection;
    const zone = getPowerZone(powerValue);

    // Opponent GK dives based on their bias
    const biasWeights = getBiasWeights(opponentGKBias);
    const gkDir = pickWeighted(biasWeights);

    setBallAnim(dir);
    setGkAnim(gkDir);

    setTimeout(() => {
      let scored = false;
      let resultType = 'saved';

      if (zone === 'red') {
        // Ball goes over/wide — miss regardless
        scored = false;
        resultType = 'miss';
      } else {
        // Calculate probability
        let prob = calcShootProb({
          player: currentTaker,
          takerIndex: currentRound % takers.length,
          pressure: pressure || 50,
          isSuddenDeath,
        });

        if (zone === 'yellow') prob -= 0.15;
        if (penaltyBonus) prob += 0.05;
        prob = Math.max(0.10, Math.min(0.88, prob));

        if (dir !== gkDir) {
          // GK went wrong way — goal based on probability (very likely)
          scored = Math.random() < Math.min(prob + 0.20, 0.95);
        } else {
          // GK guessed right — harder to score
          scored = Math.random() < (prob * 0.4);
        }
        resultType = scored ? 'goal' : 'saved';
      }

      const newPlayerScores = [...playerScores, scored];
      setPlayerScores(newPlayerScores);
      setLastResult(resultType);

      setTimeout(() => {
        setLastResult(null);
        setBallAnim(null);
        setGkAnim(null);
        setSuspenseActive(false);
        setChosenDirection(null);

        // Generate striker hint for GK phase
        setStrikerHint(generateStrikerHint());
        setTurnType('gk');
      }, 1200);
    }, 800);
  }, [finished, suspenseActive, chosenDirection, opponentGKBias, currentTaker, currentRound, takers, pressure, isSuddenDeath, penaltyBonus, playerScores, generateStrikerHint]);

  // ─── Player as GK ───
  const handleDiveDirection = useCallback((diveDir) => {
    if (finished || suspenseActive) return;
    setSuspenseActive(true);

    // Opponent shoots based on gkBias, but avoids direction if player dived there twice in a row
    let biasWeights = getBiasWeights(gkBias);

    // If player dived same direction last 2 times, opponent avoids it
    if (lastTwoGKDives.length >= 2 && lastTwoGKDives[0] === lastTwoGKDives[1]) {
      const avoidDir = lastTwoGKDives[0];
      const avoidIdx = DIRECTIONS.indexOf(avoidDir);
      if (avoidIdx >= 0) {
        // Redistribute that weight to others
        const removed = biasWeights[avoidIdx];
        biasWeights = [...biasWeights];
        biasWeights[avoidIdx] = 0;
        const otherIdxs = [0, 1, 2].filter(i => i !== avoidIdx);
        const totalOther = otherIdxs.reduce((s, i) => s + biasWeights[i], 0);
        if (totalOther === 0) {
          // Distribute equally among the other two directions
          otherIdxs.forEach(i => { biasWeights[i] = removed / otherIdxs.length; });
        } else {
          otherIdxs.forEach(i => {
            biasWeights[i] = biasWeights[i] + (removed * (biasWeights[i] / totalOther));
          });
        }
      }
    }

    const shootDir = pickWeighted(biasWeights);
    setBallAnim(shootDir);
    setGkAnim(diveDir);

    // Track dives
    setLastTwoGKDives(prev => [prev.length > 0 ? prev[prev.length - 1] : diveDir, diveDir].slice(-2));

    setTimeout(() => {
      let scored;
      if (diveDir === shootDir) {
        // Correct dive — use GK save probability
        scored = Math.random() > gkSaveProb;
      } else {
        // Wrong dive — goal (small chance of miss)
        scored = Math.random() < 0.90;
      }

      const newOppScores = [...opponentScores, scored];
      setOpponentScores(newOppScores);
      setLastResult(scored ? 'goal' : 'saved');

      setTimeout(() => {
        setLastResult(null);
        setBallAnim(null);
        setGkAnim(null);
        setSuspenseActive(false);

        const round = currentRound + 1;
        setCurrentRound(round);

        // Sudden death limit: after 20 rounds, decide by random
        if (round >= 20) {
          const pTotal2 = playerScores.filter(Boolean).length;
          const oTotal2 = newOppScores.filter(Boolean).length;
          if (pTotal2 === oTotal2) {
            const coinFlip = Math.random() < 0.5;
            endShootout(playerScores, newOppScores, coinFlip);
            return;
          }
          endShootout(playerScores, newOppScores, pTotal2 > oTotal2);
          return;
        }

        // Check if decided
        const pTotal = playerScores.filter(Boolean).length;
        const oTotal = newOppScores.filter(Boolean).length;
        const pCount = playerScores.length;
        const oCount = newOppScores.length;
        const pRemaining = Math.max(0, 5 - pCount);
        const oRemaining = Math.max(0, 5 - oCount);

        if (round <= 5) {
          if (pTotal > oTotal + oRemaining) {
            endShootout(playerScores, newOppScores, true);
            return;
          }
          if (oTotal > pTotal + pRemaining) {
            endShootout(playerScores, newOppScores, false);
            return;
          }
        }

        if (round >= 5 && pCount === oCount) {
          if (pTotal !== oTotal) {
            endShootout(playerScores, newOppScores, pTotal > oTotal);
            return;
          }
        }

        // Next round — generate new GK hint
        setGkHint(generateGKHint());
        setTurnType('shoot');
      }, 1200);
    }, 800);
  }, [finished, suspenseActive, opponentScores, playerScores, currentRound, gkBias, lastTwoGKDives, gkSaveProb, generateGKHint]);

  const endShootout = (pScores, oScores, playerWins) => {
    setFinished(true);
    setWinner(playerWins ? 'player' : 'opponent');
    setPhase('result');
    setTimeout(() => {
      onResult({
        playerWins,
        playerGoals: pScores.filter(Boolean).length,
        opponentGoals: oScores.filter(Boolean).length,
        winner: playerWins ? playerTeamId : (opponentTeam?.id),
        homeScore: isHome ? pScores.filter(Boolean).length : oScores.filter(Boolean).length,
        awayScore: isHome ? oScores.filter(Boolean).length : pScores.filter(Boolean).length,
      });
    }, 3000);
  };

  const playerTotal = playerScores.filter(Boolean).length;
  const opponentTotal = opponentScores.filter(Boolean).length;

  // ─── Render ───
  return (
    <div className="wc-pen">
      {/* ═══ SELECT PHASE ═══ */}
      {phase === 'select' && (
        <div className="wc-pen__select">
          <h2><Target size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />{ui.title}</h2>
          <p>{ui.selectTakers}</p>
          <div className="wc-pen__taker-list">
            {availablePlayers
              .filter(p => p.position !== 'GK')
              .sort((a, b) => getPlayerRating(b) - getPlayerRating(a))
              .map(p => {
                const idx = takers.findIndex(t => t.name === p.name);
                const isSelected = idx >= 0;
                const ovr = getPlayerRating(p);
                const isStar = starPlayer && p.name === starPlayer.name;
                return (
                  <button
                    key={p.name}
                    className={`wc-pen__taker ${isSelected ? 'wc-pen__taker--selected' : ''}`}
                    onClick={() => toggleTaker(p)}
                  >
                    {isSelected && <span className="wc-pen__taker-order">{idx + 1}</span>}
                    <span className="wc-pen__taker-name">
                      {isStar && <Star size={12} style={{ color: '#f59e0b', marginRight: 4, verticalAlign: 'middle' }} />}
                      {p.name}
                    </span>
                    <span className="wc-pen__taker-rating">{ovr}</span>
                    {p.yellowCard && <AlertTriangle size={12} style={{ color: '#eab308', marginLeft: 4 }} />}
                  </button>
                );
              })}
          </div>
          {playerGK && (
            <div className="wc-pen__gk-info">
              <Shield size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {playerGK.name} — {ui.ovr} {getPlayerRating(playerGK)}
            </div>
          )}
          <button
            className="wc-pen__confirm"
            onClick={confirmTakers}
            disabled={takers.length < 5}
          >
            {ui.confirm} ({takers.length}/5)
          </button>
        </div>
      )}

      {/* ═══ SHOOTING PHASE ═══ */}
      {phase === 'shooting' && (
        <div className="wc-pen__shooting">
          <h2><Target size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />{ui.title}</h2>

          {/* Scoreboard */}
          <div className="wc-pen__scoreboard">
            <div className="wc-pen__team">
              <span className="wc-pen__team-label">{ui.yourTeam}</span>
              <span className="wc-pen__team-score">{playerTotal}</span>
              <div className="wc-pen__dots">
                {playerScores.map((s, i) => (
                  <span key={i} className={`wc-pen__dot ${s ? 'wc-pen__dot--scored' : 'wc-pen__dot--missed'}`}>
                    {s ? '⚽' : <X size={14} style={{ color: '#ef4444' }} />}
                  </span>
                ))}
              </div>
            </div>
            <div className="wc-pen__vs">-</div>
            <div className="wc-pen__team">
              <span className="wc-pen__team-label"><FlagIcon teamId={opponentTeam?.id} size={24} /> {oppName}</span>
              <span className="wc-pen__team-score">{opponentTotal}</span>
              <div className="wc-pen__dots">
                {opponentScores.map((s, i) => (
                  <span key={i} className={`wc-pen__dot ${s ? 'wc-pen__dot--scored' : 'wc-pen__dot--missed'}`}>
                    {s ? '⚽' : <X size={14} style={{ color: '#ef4444' }} />}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sudden Death */}
          {isSuddenDeath && (
            <div className="wc-pen__sudden-death">
              <Zap size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {ui.suddenDeath}
            </div>
          )}

          {/* ── Player shoots: choose direction ── */}
          {turnType === 'shoot' && !finished && !suspenseActive && (
            <div className="wc-pen__kick">
              <div className="wc-pen__taker-info">
                <span className="wc-pen__turn-label">{ui.yourTurn}</span>
                <span>
                  {isStarTaker && <Star size={14} style={{ color: '#f59e0b', marginRight: 4, verticalAlign: 'middle' }} />}
                  {currentTaker?.name}
                  <span className="wc-pen__taker-ovr">{currentTakerOVR}</span>
                </span>
              </div>
              {/* Decisive moment text */}
              {isStarTaker && isSuddenDeath && (
                <div className="wc-pen__decisive">{ui.decisive}</div>
              )}
              {/* GK hint */}
              {gkHint && <div className="wc-pen__hint">{gkHint}</div>}
              <p className="wc-pen__choose-text">{ui.chooseDirection}</p>
              <div className="wc-pen__goal">
                <div className={`wc-pen__ball ${ballAnim ? `wc-pen__ball--${ballAnim}` : ''}`}>⚽</div>
                <div className="wc-pen__goal-frame">
                  {DIRECTIONS.map(dir => (
                    <button key={dir} className={`wc-pen__zone wc-pen__zone--${dir}`} onClick={() => handleShootDirection(dir)}>
                      {ui[dir]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Power bar phase ── */}
          {turnType === 'power' && !finished && !suspenseActive && (
            <div className="wc-pen__kick">
              <div className="wc-pen__taker-info">
                <span className="wc-pen__turn-label">{ui.yourTurn}</span>
                <span>
                  {currentTaker?.name}
                  <span className="wc-pen__taker-ovr">{currentTakerOVR}</span>
                </span>
              </div>
              <PowerBar
                ovr={currentTakerOVR}
                isSuddenDeath={isSuddenDeath}
                onStop={handlePowerStop}
                ui={ui}
              />
            </div>
          )}

          {/* ── Player as GK ── */}
          {turnType === 'gk' && !finished && !suspenseActive && (
            <div className="wc-pen__kick">
              <div className="wc-pen__taker-info">
                <span className="wc-pen__turn-label wc-pen__turn-label--gk">
                  <Shield size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {ui.gkTurn}
                </span>
                <span>🧤 {playerGK?.name || 'GK'} <span className="wc-pen__taker-ovr">{getPlayerRating(playerGK || { rating: 70 })}</span></span>
              </div>
              {/* Striker hint */}
              {strikerHint && <div className="wc-pen__hint wc-pen__hint--gk">{strikerHint}</div>}
              <p className="wc-pen__choose-text">{ui.chooseDive}</p>
              <div className="wc-pen__goal">
                <div className={`wc-pen__ball ${ballAnim ? `wc-pen__ball--${ballAnim}` : ''}`}>⚽</div>
                <div className={`wc-pen__gk ${gkAnim ? `wc-pen__gk--${gkAnim}` : ''}`}>🧤</div>
                <div className="wc-pen__goal-frame">
                  {DIRECTIONS.map(dir => (
                    <button key={dir} className={`wc-pen__zone wc-pen__zone--${dir} wc-pen__zone--gk`} onClick={() => handleDiveDirection(dir)}>
                      {ui[dir]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Suspense animation */}
          {suspenseActive && (
            <div className="wc-pen__suspense">
              <div className="wc-pen__goal">
                <div className={`wc-pen__ball ${ballAnim ? `wc-pen__ball--${ballAnim}` : ''}`}>⚽</div>
                <div className={`wc-pen__gk ${gkAnim ? `wc-pen__gk--${gkAnim}` : ''}`}>🧤</div>
                <div className="wc-pen__goal-frame">
                  <div className="wc-pen__zone">&nbsp;</div>
                  <div className="wc-pen__zone">&nbsp;</div>
                  <div className="wc-pen__zone">&nbsp;</div>
                </div>
              </div>
            </div>
          )}

          {/* Result flash */}
          {lastResult && (
            <div className={`wc-pen__flash wc-pen__flash--${lastResult}`}>
              {lastResult === 'goal' ? ui.goal : lastResult === 'miss' ? ui.miss : ui.saved}
            </div>
          )}
        </div>
      )}

      {/* ═══ RESULT PHASE ═══ */}
      {phase === 'result' && (
        <div className={`wc-pen__result ${winner === 'player' ? 'wc-pen__result--win' : 'wc-pen__result--lose'}`}>
          <div className="wc-pen__result-score">
            {playerTotal} - {opponentTotal}
          </div>
          <h2>{winner === 'player' ? ui.youWin : ui.youLose}</h2>
          {/* Final dot summary */}
          <div className="wc-pen__result-dots">
            <div className="wc-pen__dots">
              {playerScores.map((s, i) => (
                <span key={i} className={`wc-pen__dot ${s ? 'wc-pen__dot--scored' : 'wc-pen__dot--missed'}`}>
                  {s ? '⚽' : <X size={14} style={{ color: '#ef4444' }} />}
                </span>
              ))}
            </div>
            <span style={{ margin: '0 0.5rem', opacity: 0.3 }}>vs</span>
            <div className="wc-pen__dots">
              {opponentScores.map((s, i) => (
                <span key={i} className={`wc-pen__dot ${s ? 'wc-pen__dot--scored' : 'wc-pen__dot--missed'}`}>
                  {s ? '⚽' : <X size={14} style={{ color: '#ef4444' }} />}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
