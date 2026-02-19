import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  onDraftMatchChange, submitFormation, submitPick, submitDraftTeam,
  submitChanges, advanceDraftPhase, sendDraftHeartbeat,
  checkDraftDisconnect, claimDraftDisconnectWin,
} from '../../firebase/draftService';
import {
  drawFormations, drawPlayersForPosition, calculateSynergies,
  buildDraftTeam, DRAFT_FORMATIONS, TARGET_TEAM_OVR, TOTAL_PICKS, SQUAD_SIZE,
} from '../../game/draftEngine';
import { getTierByLP, calculateLPChange, LP_PER_DIVISION } from './tierUtils';
import {
  Clock, ChevronRight, ArrowLeft, Star, Users, Zap, Sparkles,
  Trophy, TrendingUp, TrendingDown, Minus, Shield, Target,
  UserPlus, RefreshCw, Check, X, Loader,
} from 'lucide-react';
import './DraftMatch.scss';

// ── Field position coordinates (% from top-left) for each formation ──
const FORMATION_COORDS = {
  // GK at 88%, DEF ~70%, MID ~48%, FWD ~20% — more vertical spread
  '4-3-3':   [{x:50,y:88},{x:82,y:68},{x:64,y:72},{x:36,y:72},{x:18,y:68},{x:66,y:47},{x:50,y:50},{x:34,y:47},{x:78,y:25},{x:50,y:18},{x:22,y:25}],
  '4-4-2':   [{x:50,y:88},{x:82,y:68},{x:64,y:72},{x:36,y:72},{x:18,y:68},{x:80,y:46},{x:62,y:50},{x:38,y:50},{x:20,y:46},{x:62,y:22},{x:38,y:22}],
  '3-5-2':   [{x:50,y:88},{x:68,y:72},{x:50,y:75},{x:32,y:72},{x:84,y:46},{x:66,y:48},{x:50,y:54},{x:34,y:48},{x:16,y:46},{x:62,y:22},{x:38,y:22}],
  '4-2-3-1': [{x:50,y:88},{x:82,y:68},{x:64,y:72},{x:36,y:72},{x:18,y:68},{x:62,y:54},{x:38,y:54},{x:50,y:38},{x:76,y:34},{x:50,y:18},{x:24,y:34}],
  '5-3-2':   [{x:50,y:88},{x:86,y:68},{x:68,y:73},{x:50,y:75},{x:32,y:73},{x:14,y:68},{x:66,y:47},{x:50,y:50},{x:34,y:47},{x:62,y:22},{x:38,y:22}],
  '3-4-3':   [{x:50,y:88},{x:68,y:72},{x:50,y:75},{x:32,y:72},{x:82,y:48},{x:62,y:50},{x:38,y:50},{x:18,y:48},{x:76,y:24},{x:50,y:18},{x:24,y:24}],
  '4-5-1':   [{x:50,y:88},{x:82,y:68},{x:64,y:72},{x:36,y:72},{x:18,y:68},{x:80,y:46},{x:62,y:48},{x:50,y:54},{x:38,y:48},{x:20,y:46},{x:50,y:22}],
  '4-1-4-1': [{x:50,y:88},{x:82,y:68},{x:64,y:72},{x:36,y:72},{x:18,y:68},{x:50,y:56},{x:80,y:40},{x:60,y:36},{x:40,y:36},{x:20,y:40},{x:50,y:18}],
};

export default function DraftMatch({ matchId, onExit }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [timer, setTimer] = useState(null);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [formationOptions, setFormationOptions] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [cardOptions, setCardOptions] = useState([]);
  const [picks, setPicks] = useState([]); // { position, player, slotIndex }
  const [revealIdx, setRevealIdx] = useState(-1);
  const [changesLeft, setChangesLeft] = useState(3);
  const [markedForChange, setMarkedForChange] = useState(null);
  const [changeOptions, setChangeOptions] = useState([]);
  const heartbeatRef = useRef(null);
  const formationsRef = useRef(null);

  const isP1 = match?.player1?.uid === user?.uid;
  const myData = isP1 ? match?.player1 : match?.player2;
  const rivalData = isP1 ? match?.player2 : match?.player1;
  const phase = match?.phase;

  // ── Match listener ──
  useEffect(() => {
    if (!matchId) return;
    const unsub = onDraftMatchChange(matchId, (data) => {
      setMatch(data);
    });
    return () => unsub();
  }, [matchId]);

  // ── Sync picks from Firestore (reconnect / page reload) ──
  useEffect(() => {
    if (!myData?.picks || myData.picks.length === 0) return;
    if (picks.length > 0) return; // already have local picks
    setPicks(myData.picks);
  }, [myData?.picks?.length]);

  // ── Sync formation from Firestore ──
  useEffect(() => {
    if (myData?.formation && !selectedFormation) {
      setSelectedFormation(myData.formation);
    }
  }, [myData?.formation]);

  // ── Timer ──
  useEffect(() => {
    if (!match?.phaseDeadline) return;
    const deadline = match.phaseDeadline.toDate ? match.phaseDeadline.toDate() : new Date(match.phaseDeadline);
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      setTimer(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [match?.phaseDeadline, phase]);

  // ── Heartbeat ──
  useEffect(() => {
    if (!matchId || !user?.uid || phase === 'results') return;
    heartbeatRef.current = setInterval(() => {
      sendDraftHeartbeat(matchId, user.uid);
    }, 5000);
    sendDraftHeartbeat(matchId, user.uid);
    return () => clearInterval(heartbeatRef.current);
  }, [matchId, user?.uid, phase]);

  // ── Generate formation options once ──
  useEffect(() => {
    if (phase === 'formation_pick' && formationOptions.length === 0) {
      if (!formationsRef.current) {
        formationsRef.current = drawFormations(3);
      }
      setFormationOptions(formationsRef.current);
    }
  }, [phase]);

  // ── Reveal animation ──
  useEffect(() => {
    if (phase !== 'reveal') return;
    setRevealIdx(-1);
    const rivalPicks = rivalData?.picks || [];
    let i = 0;
    const interval = setInterval(() => {
      if (i >= rivalPicks.length) {
        clearInterval(interval);
        return;
      }
      setRevealIdx(i);
      i++;
    }, 800);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Auto-advance when timer hits 0 ──
  useEffect(() => {
    if (timer !== 0 || !match || phase === 'results') return;
    // Auto-submit if needed
    if (phase === 'formation_pick' && !myData?.formation) {
      const auto = formationOptions[0]?.id || '4-3-3';
      submitFormation(matchId, user.uid, auto);
    }
    if (phase === 'drafting' && picks.length < TOTAL_PICKS) {
      // Auto-fill remaining slots with random players for each position
      try {
        const fm = DRAFT_FORMATIONS.find(f => f.id === (myData?.formation || selectedFormation)) || DRAFT_FORMATIONS[0];
        const allPositions = [...fm.positions];
        // Add bench positions
        const benchPositions = ['GK', 'CB', 'CM', 'ST'];
        const fullPositions = [...allPositions, ...benchPositions];
        
        const autoPicks = [...picks];
        const pickedIds = new Set(autoPicks.map(p => p.player?.id));
        
        for (let i = autoPicks.length; i < TOTAL_PICKS; i++) {
          const pos = fullPositions[i] || 'CM';
          const options = drawPlayersForPosition(pos, [...pickedIds], autoPicks.map(p => p.player), TOTAL_PICKS, TARGET_TEAM_OVR);
          if (options.length > 0) {
            const pick = options[0];
            autoPicks.push({ slotIndex: i, player: pick });
            pickedIds.add(pick.id);
          }
        }
        
        if (autoPicks.length >= SQUAD_SIZE) {
          const result = buildDraftTeam(autoPicks.map(p => p.player), fm, user.displayName || 'Draft FC');
          submitDraftTeam(matchId, user.uid, result.team);
        }
      } catch (e) {
        console.error('Auto-pick failed:', e);
      }
    }
    // Try to advance phase
    advanceDraftPhase(matchId);
  }, [timer]);

  // ── Auto-advance when both formations submitted ──
  useEffect(() => {
    if (phase !== 'formation_pick' || !match) return;
    if (match.player1?.formation && match.player2?.formation) {
      advanceDraftPhase(matchId);
    }
  }, [phase, match?.player1?.formation, match?.player2?.formation]);

  // ── Auto-advance when both teams submitted (drafting complete) ──
  useEffect(() => {
    if (phase !== 'drafting' || !match) return;
    if (match.player1?.team && match.player2?.team) {
      console.log('🎯 Both teams submitted — advancing from drafting');
      advanceDraftPhase(matchId);
    }
  }, [phase, match?.player1?.team, match?.player2?.team]);

  // ── Handlers ──
  const handleFormationSelect = useCallback(async (formationId) => {
    setSelectedFormation(formationId);
    await submitFormation(matchId, user.uid, formationId);
  }, [matchId, user?.uid]);

  const handleSlotClick = useCallback((slotIndex, position) => {
    if (picks.find(p => p.slotIndex === slotIndex)) return; // already filled
    setActiveSlot({ index: slotIndex, position });
    const pickedIds = picks.map(p => p.player?.id).filter(Boolean);
    const options = drawPlayersForPosition(position, pickedIds, picks.map(p => p.player), TOTAL_PICKS);
    setCardOptions(options);
  }, [picks]);

  const handlePickPlayer = useCallback(async (player) => {
    if (!activeSlot) return;
    const pick = { position: activeSlot.position, player, slotIndex: activeSlot.index };
    const newPicks = [...picks, pick];
    setPicks(newPicks);
    setActiveSlot(null);
    setCardOptions([]);
    await submitPick(matchId, user.uid, pick);

    // If all picked, submit team
    if (newPicks.length >= TOTAL_PICKS) {
      const formation = DRAFT_FORMATIONS.find(f => f.id === myData?.formation) || DRAFT_FORMATIONS[0];
      const team = buildDraftTeam(newPicks.map(p => p.player), formation, user.displayName || 'Draft FC');
      await submitDraftTeam(matchId, user.uid, team.team);
    }
  }, [activeSlot, picks, matchId, user]);

  const handleMarkForChange = useCallback((idx) => {
    if (changesLeft <= 0) return;
    setMarkedForChange(idx);
    const currentPlayers = picks.map(p => p.player);
    const position = picks[idx]?.position || 'CM';
    const pickedIds = currentPlayers.map(p => p?.id).filter(Boolean);
    const options = drawPlayersForPosition(position, pickedIds, currentPlayers, TOTAL_PICKS);
    setChangeOptions(options);
  }, [changesLeft, picks]);

  const handleSwapPlayer = useCallback(async (newPlayer) => {
    if (markedForChange === null) return;
    const newPicks = [...picks];
    const oldPick = newPicks[markedForChange];
    newPicks[markedForChange] = { ...oldPick, player: newPlayer };
    setPicks(newPicks);
    setChangesLeft(c => c - 1);
    setMarkedForChange(null);
    setChangeOptions([]);
    await submitChanges(matchId, user.uid, [{ outPlayer: oldPick.player, inPlayer: newPlayer }]);
  }, [markedForChange, picks, matchId, user]);

  // ── Computed ──
  const currentOvr = useMemo(() => {
    if (picks.length === 0) return TARGET_TEAM_OVR;
    const sum = picks.reduce((s, p) => s + (p.player?.overall || 0), 0);
    return Math.round(sum / picks.length);
  }, [picks]);

  const synergies = useMemo(() => {
    if (picks.length < 3) return { bonuses: [], modifiedPlayers: [] };
    return calculateSynergies(picks.map(p => p.player));
  }, [picks]);

  // Preview synergy bonus for a candidate player (used in card overlay)
  const getPreviewSynergy = useCallback((player) => {
    if (!player) return null;
    const currentPlayers = picks.map(p => p.player);
    const withPlayer = [...currentPlayers, player];
    const preview = calculateSynergies(withPlayer);
    const mp = preview.modifiedPlayers.find(p => p.id === player.id || p.name === player.name);
    return mp?.synergyBonus || 0;
  }, [picks]);

  const formation = useMemo(() => {
    const fId = myData?.formation || selectedFormation;
    return DRAFT_FORMATIONS.find(f => f.id === fId) || null;
  }, [myData?.formation, selectedFormation]);

  if (!match) {
    return (
      <div className="draft-match">
        <div className="draft-simulating">
          <div className="draft-simulating__spinner" />
          <div className="draft-simulating__text">Conectando...</div>
        </div>
      </div>
    );
  }

  // ── Render by phase ──
  return (
    <div className="draft-match">
      {/* Header */}
      <div className="draft-match__header">
        <div className="draft-phase">{getPhaseLabel(phase)}</div>
        {timer !== null && timer > 0 && (
          <div className={`draft-timer ${timer <= 10 ? 'urgent' : timer <= 30 ? 'warning' : ''}`}>
            <Clock size={16} />
            <span>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</span>
          </div>
        )}
        {phase === 'drafting' && (
          <div className="draft-ovr">
            <span className="ovr-label">Media:</span>
            <span className="ovr-value">{currentOvr}</span>
            <span className="ovr-target">/ {TARGET_TEAM_OVR}</span>
          </div>
        )}
      </div>

      <div className="draft-match__content">
        {phase === 'formation_pick' && (
          <FormationPicker
            options={formationOptions}
            selected={selectedFormation}
            onSelect={handleFormationSelect}
            submitted={!!myData?.formation}
          />
        )}

        {phase === 'drafting' && formation && (
          <DraftBoard
            formation={formation}
            picks={picks}
            activeSlot={activeSlot}
            cardOptions={cardOptions}
            synergies={synergies}
            getPreviewSynergy={getPreviewSynergy}
            onSlotClick={handleSlotClick}
            onPickPlayer={handlePickPlayer}
          />
        )}

        {phase === 'reveal' && (
          <RivalReveal
            rivalData={rivalData}
            revealIdx={revealIdx}
            onContinue={() => advanceDraftPhase(matchId)}
          />
        )}

        {(phase === 'simulating1' || phase === 'simulating2') && (
          <div className="draft-simulating">
            <div className="draft-simulating__spinner" />
            <div className="draft-simulating__text">
              {phase === 'simulating1' ? 'Simulando 1ª vuelta...' : 'Simulando 2ª vuelta...'}
            </div>
          </div>
        )}

        {phase === 'changes' && (
          <ChangesPanel
            match={match}
            isP1={isP1}
            picks={picks}
            changesLeft={changesLeft}
            markedForChange={markedForChange}
            changeOptions={changeOptions}
            onMarkForChange={handleMarkForChange}
            onSwapPlayer={handleSwapPlayer}
            onConfirm={() => advanceDraftPhase(matchId)}
          />
        )}

        {phase === 'results' && (
          <DraftResults
            match={match}
            isP1={isP1}
            onExit={onExit}
          />
        )}
      </div>
    </div>
  );
}

function getPhaseLabel(phase) {
  const labels = {
    formation_pick: 'Elige formación',
    drafting: 'Draft de jugadores',
    reveal: 'Reveal del rival',
    simulating1: 'Simulando...',
    changes: 'Ventana de cambios',
    simulating2: 'Simulando...',
    results: 'Resultados',
  };
  return labels[phase] || phase;
}

// ── FormationPicker ──
function FormationPicker({ options, selected, onSelect, submitted }) {
  return (
    <div className="formation-picker">
      <div className="formation-picker__title">
        <h2>Elige tu formación</h2>
        <p>Selecciona cómo quieres alinear tu equipo</p>
      </div>
      <div className="formation-picker__grid">
        {options.map(f => {
          const coords = FORMATION_COORDS[f.id] || [];
          return (
            <div
              key={f.id}
              className={`formation-picker__card ${selected === f.id ? 'selected' : ''}`}
              onClick={() => !submitted && onSelect(f.id)}
            >
              <div className="formation-name">{f.name}</div>
              <div className="formation-preview">
                {coords.map((c, i) => (
                  <div
                    key={i}
                    className="position-dot"
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {submitted && (
        <div className="formation-picker__confirm" style={{ opacity: 0.5, cursor: 'default' }}>
          <Check size={18} />
          <span>Esperando al rival...</span>
        </div>
      )}
    </div>
  );
}

// ── DraftBoard ──
function DraftBoard({ formation, picks, activeSlot, cardOptions, synergies, getPreviewSynergy, onSlotClick, onPickPlayer }) {
  const coords = FORMATION_COORDS[formation.id] || [];
  const benchPositions = ['GK', 'CM', 'ST'];
  const [selectedCard, setSelectedCard] = useState(null);
  const showCards = cardOptions.length > 0;

  const handlePick = (player) => {
    setSelectedCard(player.id);
    setTimeout(() => {
      onPickPlayer(player);
      setSelectedCard(null);
    }, 400);
  };

  return (
    <div className="draft-board">
      {/* Full-width field */}
      <div className="draft-board__field">
        {/* Field markings */}
        <div className="field-markings">
          <div className="field-outline" />
          <div className="field-center-line" />
          <div className="field-center-circle" />
          <div className="field-center-dot" />
          <div className="field-penalty-top" />
          <div className="field-penalty-bottom" />
          <div className="field-goal-top" />
          <div className="field-goal-bottom" />
        </div>

        {/* Picks counter */}
        <div className="draft-board__counter">
          {picks.length}/{TOTAL_PICKS}
        </div>

        {/* Formation slots */}
        {formation.positions.map((pos, i) => {
          const pick = picks.find(p => p.slotIndex === i);
          const coord = coords[i] || { x: 50, y: 50 };
          const isActive = activeSlot?.index === i;
          const modPlayer = pick && synergies.modifiedPlayers?.find(mp => mp.id === pick.player?.id || mp.name === pick.player?.name);
          const isLinked = modPlayer?.synergyBonus > 0;
          const synergyBonus = modPlayer?.synergyBonus || 0;

          return (
            <div
              key={i}
              className={`draft-board__slot ${pick ? 'filled' : 'empty'} ${isActive ? 'active' : ''} ${isLinked ? 'synergy-linked' : ''}`}
              style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
              onClick={() => !pick && onSlotClick(i, pos)}
              title={isLinked ? `+${synergyBonus} sinergia` : ''}
            >
              {pick ? (
                <>
                  <div className="slot-avatar" style={{
                    background: pick.player?.overall >= 85 ? 'rgba(34,197,94,0.25)' :
                                pick.player?.overall >= 78 ? 'rgba(245,158,11,0.25)' : 'rgba(148,163,184,0.25)',
                    borderColor: pick.player?.overall >= 85 ? '#22c55e' :
                                 pick.player?.overall >= 78 ? '#f59e0b' : '#64748b',
                  }}>
                    {pick.player?.overall}
                  </div>
                  <div className="slot-name">{pick.player?.name?.split(' ').pop()}</div>
                  {isLinked && <div className="slot-synergy">+{synergyBonus}</div>}
                </>
              ) : (
                <span className="slot-pos">{pos}</span>
              )}
            </div>
          );
        })}

        {/* Bench */}
        <div className="draft-board__bench">
          {benchPositions.map((pos, i) => {
            const slotIdx = SQUAD_SIZE + i;
            const pick = picks.find(p => p.slotIndex === slotIdx);
            const isActive = activeSlot?.index === slotIdx;

            return (
              <div
                key={slotIdx}
                className={`bench-slot ${pick ? 'filled' : ''} ${isActive ? 'active' : ''}`}
                onClick={() => !pick && onSlotClick(slotIdx, pos)}
              >
                {pick ? (
                  <span className="bench-ovr">{pick.player?.overall}</span>
                ) : (
                  <span className="bench-pos">{pos}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Synergies badges (bottom-left) */}
        {synergies.bonuses.length > 0 && (
          <div className="draft-board__synergy-badges">
            {synergies.bonuses.map((b, i) => (
              <div key={i} className="synergy-badge">
                <Zap size={10} />
                <span>{b.name || (b.type === 'league' ? 'Liga' : 'Club')} +{b.bonus}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card overlay (appears when selecting a position) */}
      {showCards && (
        <div className="draft-card-overlay" onClick={() => onSlotClick(null, null)}>
          <div className="draft-card-overlay__content" onClick={e => e.stopPropagation()}>
            <div className="draft-card-overlay__title">
              <Target size={16} />
              <span>Elige {activeSlot?.position}</span>
            </div>
            <div className="draft-card-overlay__cards">
              {cardOptions.map((player, i) => {
                const previewBonus = getPreviewSynergy ? getPreviewSynergy(player) : 0;
                return (
                <div
                  key={player.id || i}
                  className={`draft-big-card ${selectedCard === player.id ? 'picked' : ''} ${previewBonus > 0 ? 'has-synergy' : ''}`}
                  style={{
                    '--card-color': player.overall >= 85 ? '#22c55e' : player.overall >= 78 ? '#f59e0b' : '#64748b',
                    animationDelay: `${i * 0.1}s`,
                  }}
                  onClick={() => handlePick(player)}
                >
                  <div className="draft-big-card__glow" />
                  <div className="draft-big-card__ovr">{player.overall}</div>
                  <div className="draft-big-card__pos">{player.position}</div>
                  <div className="draft-big-card__name">{player.name}</div>
                  <div className="draft-big-card__team">{player.teamName}</div>
                  <div className="draft-big-card__detail">
                    <span>{player.leagueName || player.league || ''}</span>
                    {player.country && <span>· {player.country}</span>}
                  </div>
                  <div className="draft-big-card__age">{player.age} años</div>
                  {previewBonus > 0 && (
                    <div className="draft-big-card__synergy-badge">
                      +{previewBonus} sinergia
                    </div>
                  )}
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

// ── RivalReveal ──
function RivalReveal({ rivalData, revealIdx, onContinue }) {
  const rivalPicks = rivalData?.picks || [];
  const allRevealed = revealIdx >= rivalPicks.length - 1;
  const formation = DRAFT_FORMATIONS.find(f => f.id === rivalData?.formation) || DRAFT_FORMATIONS[0];
  const coords = FORMATION_COORDS[formation?.id] || [];

  // Calculate synergies for revealed players
  const revealedPlayers = rivalPicks.filter((_, i) => i <= revealIdx).map(p => p.player);
  const synergies = useMemo(() => {
    if (revealedPlayers.length < 3) return { bonuses: [], modifiedPlayers: [] };
    return calculateSynergies(revealedPlayers);
  }, [revealIdx, rivalPicks.length]);

  // Bench picks (slotIndex >= SQUAD_SIZE)
  const benchPicks = rivalPicks.filter(p => p.slotIndex >= SQUAD_SIZE);

  return (
    <div className="rival-reveal">
      <div className="rival-reveal__header">
        <div className="rival-reveal__title">Equipo rival</div>
        <div className="rival-reveal__formation">{rivalData?.formation || '?'}</div>
      </div>

      <div className="draft-board">
        <div className="draft-board__field">
          <div className="field-markings">
            <div className="field-outline" />
            <div className="field-center-line" />
            <div className="field-center-circle" />
            <div className="field-center-dot" />
            <div className="field-penalty-top" />
            <div className="field-penalty-bottom" />
            <div className="field-goal-top" />
            <div className="field-goal-bottom" />
          </div>

          {formation.positions.map((pos, i) => {
            const pick = rivalPicks.find(p => p.slotIndex === i);
            const coord = coords[i] || { x: 50, y: 50 };
            const isRevealed = i <= revealIdx;
            const modPlayer = pick && synergies.modifiedPlayers?.find(mp => mp.id === pick.player?.id || mp.name === pick.player?.name);
            const synergyBonus = modPlayer?.synergyBonus || 0;

            return (
              <div
                key={i}
                className={`draft-board__slot ${isRevealed && pick ? 'filled' : 'empty'} ${synergyBonus > 0 ? 'synergy-linked' : ''} reveal-slot ${isRevealed ? 'revealed' : ''}`}
                style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
              >
                {isRevealed && pick ? (
                  <>
                    <div className="slot-avatar" style={{
                      background: pick.player?.overall >= 85 ? 'rgba(239,68,68,0.25)' :
                                  pick.player?.overall >= 78 ? 'rgba(245,158,11,0.25)' : 'rgba(148,163,184,0.25)',
                      borderColor: pick.player?.overall >= 85 ? '#ef4444' :
                                   pick.player?.overall >= 78 ? '#f59e0b' : '#64748b',
                    }}>
                      {pick.player?.overall}
                    </div>
                    <div className="slot-name">{pick.player?.name?.split(' ').pop()}</div>
                    {synergyBonus > 0 && <div className="slot-synergy">+{synergyBonus}</div>}
                  </>
                ) : (
                  <span className="slot-pos">?</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Bench */}
        {allRevealed && benchPicks.length > 0 && (
          <div className="draft-board__bench">
            {benchPicks.map((pick, i) => (
              <div key={i} className="bench-slot filled">
                <div className="bench-ovr">{pick.player?.overall}</div>
                <div className="bench-name">{pick.player?.name?.split(' ').pop()}</div>
              </div>
            ))}
          </div>
        )}

        {/* Synergy badges */}
        {allRevealed && synergies.bonuses.length > 0 && (
          <div className="draft-board__synergy-badges">
            {synergies.bonuses.map((b, i) => (
              <div key={i} className="synergy-badge">
                <Sparkles size={12} /> {b.name} +{b.bonus}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rival-reveal__footer">
        <button
          className={`rival-reveal__continue ${allRevealed ? 'visible' : ''}`}
          onClick={onContinue}
          disabled={!allRevealed}
        >
          Continuar <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ── ChangesPanel ──
function ChangesPanel({ match, isP1, picks, changesLeft, markedForChange, changeOptions, onMarkForChange, onSwapPlayer, onConfirm }) {
  const [showField, setShowField] = useState(false);
  const [changedSlots, setChangedSlots] = useState(new Set());
  const [selectedCard, setSelectedCard] = useState(null);
  const table = match?.simulation1?.table || [];

  const myData = isP1 ? match?.player1 : match?.player2;
  const formation = DRAFT_FORMATIONS.find(f => f.id === myData?.formation) || DRAFT_FORMATIONS[0];
  const coords = FORMATION_COORDS[formation?.id] || [];

  const handleSlotClick = (idx, pos) => {
    if (changesLeft <= 0 || changedSlots.has(idx)) return;
    onMarkForChange(idx);
  };

  const handleSwap = (player) => {
    if (markedForChange === null) return;
    setSelectedCard(player.id);
    setTimeout(() => {
      setChangedSlots(prev => new Set([...prev, markedForChange]));
      onSwapPlayer(player);
      setSelectedCard(null);
    }, 400);
  };

  const showCards = markedForChange !== null && changeOptions.length > 0;

  // ── Screen 1: Table + Lineup List ──
  if (!showField) {
    return (
      <div className="changes-overview">
        <div className="changes-overview__table">
          <h3 className="changes-overview__title">Clasificación (media temporada)</h3>
          <div className="mini-table">
            {table.map((team, i) => (
              <div
                key={team.teamId}
                className={`table-row ${
                  team.teamId === (isP1 ? 'draft_player1' : 'draft_player2') ? 'me' :
                  team.teamId === (isP1 ? 'draft_player2' : 'draft_player1') ? 'rival' : ''
                }`}
              >
                <span className="pos">{i + 1}</span>
                <span className="name">{team.teamName}</span>
                <span className="pts">{team.points}</span>
                <span className="gd">{team.goalDifference > 0 ? '+' : ''}{team.goalDifference}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="changes-overview__lineup">
          <h4 className="changes-overview__subtitle">Tu alineación</h4>
          {picks.slice(0, SQUAD_SIZE).map((pick, i) => (
            <div key={i} className="changes-overview__player">
              <span className="player-pos-badge">{pick.position}</span>
              <span className="player-name">{pick.player?.name}</span>
              <span className="player-ovr" style={{
                color: pick.player?.overall >= 85 ? '#22c55e' : pick.player?.overall >= 78 ? '#f59e0b' : '#94a3b8'
              }}>{pick.player?.overall}</span>
            </div>
          ))}
          {picks.length > SQUAD_SIZE && (
            <>
              <h4 className="changes-overview__subtitle" style={{ marginTop: '0.5rem' }}>Banquillo</h4>
              {picks.slice(SQUAD_SIZE).map((pick, i) => (
                <div key={SQUAD_SIZE + i} className="changes-overview__player bench">
                  <span className="player-pos-badge">{pick.position}</span>
                  <span className="player-name">{pick.player?.name}</span>
                  <span className="player-ovr" style={{
                    color: pick.player?.overall >= 85 ? '#22c55e' : pick.player?.overall >= 78 ? '#f59e0b' : '#94a3b8'
                  }}>{pick.player?.overall}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="changes-overview__actions">
          {changesLeft > 0 && (
            <button className="changes-overview__change-btn" onClick={() => setShowField(true)}>
              <RefreshCw size={18} />
              <span>Hacer cambios ({changesLeft} disponibles)</span>
            </button>
          )}
          <button className="changes-overview__confirm-btn" onClick={onConfirm}>
            <span>Confirmar y simular 2ª vuelta</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ── Screen 2: Pitch with player dots ──
  return (
    <div className="changes-field">
      <div className="changes-field__info">
        <button className="changes-field__back" onClick={() => setShowField(false)}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="changes-field__remaining">
          <RefreshCw size={14} /> {changesLeft} cambios
        </div>
      </div>

      <div className="draft-board">
        <div className="draft-board__field">
          <div className="field-markings">
            <div className="field-outline" />
            <div className="field-center-line" />
            <div className="field-center-circle" />
            <div className="field-center-dot" />
            <div className="field-penalty-top" />
            <div className="field-penalty-bottom" />
            <div className="field-goal-top" />
            <div className="field-goal-bottom" />
          </div>

          {formation.positions.map((pos, i) => {
            const pick = picks.find(p => p.slotIndex === i);
            const coord = coords[i] || { x: 50, y: 50 };
            const isLocked = changedSlots.has(i);
            const isActive = markedForChange === i;

            return (
              <div
                key={i}
                className={`draft-board__slot filled ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                onClick={() => !isLocked && handleSlotClick(i, pos)}
              >
                <div className="slot-avatar" style={{
                  background: isLocked ? 'rgba(100,116,139,0.3)' :
                    pick?.player?.overall >= 85 ? 'rgba(34,197,94,0.25)' :
                    pick?.player?.overall >= 78 ? 'rgba(245,158,11,0.25)' : 'rgba(148,163,184,0.25)',
                  borderColor: isLocked ? '#475569' :
                    pick?.player?.overall >= 85 ? '#22c55e' :
                    pick?.player?.overall >= 78 ? '#f59e0b' : '#64748b',
                }}>
                  {pick?.player?.overall}
                </div>
                <div className="slot-name">{pick?.player?.name?.split(' ').pop()}</div>
                {isLocked && <div className="slot-lock">✓</div>}
              </div>
            );
          })}
        </div>

        {/* Card overlay for replacement picks */}
        {showCards && (
          <div className="draft-card-overlay" onClick={() => onMarkForChange(null)}>
            <div className="draft-card-overlay__content" onClick={e => e.stopPropagation()}>
              <div className="draft-card-overlay__title">
                <Target size={16} />
                <span>Reemplazo para {picks[markedForChange]?.position}</span>
              </div>
              <div className="draft-card-overlay__cards">
                {changeOptions.map((player, i) => (
                  <div
                    key={player.id || i}
                    className={`draft-big-card ${selectedCard === player.id ? 'picked' : ''}`}
                    style={{
                      '--card-color': player.overall >= 85 ? '#22c55e' : player.overall >= 78 ? '#f59e0b' : '#64748b',
                      animationDelay: `${i * 0.1}s`,
                    }}
                    onClick={() => handleSwap(player)}
                  >
                    <div className="draft-big-card__glow" />
                    <div className="draft-big-card__ovr">{player.overall}</div>
                    <div className="draft-big-card__pos">{player.position}</div>
                    <div className="draft-big-card__name">{player.name}</div>
                    <div className="draft-big-card__team">{player.teamName}</div>
                    <div className="draft-big-card__detail">
                      <span>{player.leagueName || player.league || ''}</span>
                      {player.country && <span>· {player.country}</span>}
                    </div>
                    <div className="draft-big-card__age">{player.age} años</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {changesLeft <= 0 && (
        <div className="changes-field__done">
          <button className="changes-overview__confirm-btn" onClick={onConfirm}>
            <span>Confirmar y simular 2ª vuelta</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Medal icon for top 3 positions ──
function PositionBadge({ position }) {
  if (position === 1) return <Trophy size={20} className="medal gold" />;
  if (position === 2) return <Trophy size={20} className="medal silver" />;
  if (position === 3) return <Trophy size={20} className="medal bronze" />;
  return <span className="pos-num">{position}º</span>;
}

// ── DraftResults ──
function DraftResults({ match, isP1, onExit }) {
  const [activeTab, setActiveTab] = useState('resumen');
  const myUid = isP1 ? match.player1?.uid : match.player2?.uid;
  const isWin = match.winner === myUid;
  const isDraw = !match.winner;
  const results = match.results || {};
  const sim = match.simulation2 || {};
  const table = sim.table || [];

  // Extract positions from table (more reliable than results object)
  const myTeamId = isP1 ? 'draft_player1' : 'draft_player2';
  const rivalTeamId = isP1 ? 'draft_player2' : 'draft_player1';
  const myPos = table.findIndex(t => t.teamId === myTeamId) + 1 || results[isP1 ? 'player1Position' : 'player2Position'] || '?';
  const rivalPos = table.findIndex(t => t.teamId === rivalTeamId) + 1 || results[isP1 ? 'player2Position' : 'player1Position'] || '?';
  const myEntry = table.find(t => t.teamId === myTeamId) || {};
  const rivalEntry = table.find(t => t.teamId === rivalTeamId) || {};

  const myLPChange = isP1 ? results.player1LPChange : results.player2LPChange;
  const mySimData = isP1 ? sim.player1 : sim.player2;
  const rivalSimData = isP1 ? sim.player2 : sim.player1;
  const myName = isP1 ? match.player1?.displayName : match.player2?.displayName;
  const rivalName = isP1 ? match.player2?.displayName : match.player1?.displayName;

  // H2H data
  const myH2H = mySimData?.h2hResults || [];
  const h2hWins = myH2H.filter(r => r.goalsFor > r.goalsAgainst).length;
  const h2hDraws = myH2H.filter(r => r.goalsFor === r.goalsAgainst).length;
  const h2hLosses = myH2H.filter(r => r.goalsFor < r.goalsAgainst).length;

  // Top scorers across all teams (from sim player data)
  const allTopScorers = [];
  if (mySimData?.topScorers) mySimData.topScorers.forEach(s => allTopScorers.push({ ...s, teamId: myTeamId, teamName: myName }));
  if (rivalSimData?.topScorers) rivalSimData.topScorers.forEach(s => allTopScorers.push({ ...s, teamId: rivalTeamId, teamName: rivalName }));
  allTopScorers.sort((a, b) => b.goals - a.goals);

  const allTopAssists = [];
  if (mySimData?.topAssists) mySimData.topAssists.forEach(s => allTopAssists.push({ ...s, teamId: myTeamId, teamName: myName }));
  if (rivalSimData?.topAssists) rivalSimData.topAssists.forEach(s => allTopAssists.push({ ...s, teamId: rivalTeamId, teamName: rivalName }));
  allTopAssists.sort((a, b) => b.assists - a.assists);

  const allTopYellows = [];
  if (mySimData?.topYellows) mySimData.topYellows.forEach(s => allTopYellows.push({ ...s, teamId: myTeamId, teamName: myName }));
  if (rivalSimData?.topYellows) rivalSimData.topYellows.forEach(s => allTopYellows.push({ ...s, teamId: rivalTeamId, teamName: rivalName }));
  allTopYellows.sort((a, b) => b.yellows - a.yellows);

  // Best attack/defense from table
  const bestAttack = [...table].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const bestDefense = [...table].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];

  // Trophies
  const myTrophies = [];
  if (mySimData?.liga) myTrophies.push('🏆 Liga');
  if (mySimData?.copa) myTrophies.push('🏆 Copa');
  if (mySimData?.championsLeague) myTrophies.push('🏆 Champions');
  if (mySimData?.europaLeague) myTrophies.push('🏆 Europa League');
  if (mySimData?.conference) myTrophies.push('🏆 Conference');
  if (mySimData?.libertadores) myTrophies.push('🏆 Libertadores');
  if (mySimData?.sudamericana) myTrophies.push('🏆 Sudamericana');

  const rivalTrophies = [];
  if (rivalSimData?.liga) rivalTrophies.push('🏆 Liga');
  if (rivalSimData?.copa) rivalTrophies.push('🏆 Copa');
  if (rivalSimData?.championsLeague) rivalTrophies.push('🏆 Champions');
  if (rivalSimData?.europaLeague) rivalTrophies.push('🏆 Europa League');

  return (
    <div className="draft-results">
      {/* Hero result banner */}
      <div className={`draft-results__hero ${isWin ? 'win' : isDraw ? 'draw' : 'loss'}`}>
        <div className="hero-result-text">
          {results.disconnection
            ? (isWin ? 'Victoria por desconexión' : 'Derrota por desconexión')
            : isWin ? '¡Victoria!' : isDraw ? 'Empate' : 'Derrota'
          }
        </div>
        <div className={`hero-lp ${myLPChange > 0 ? 'positive' : myLPChange < 0 ? 'negative' : ''}`}>
          {myLPChange > 0 ? <TrendingUp size={18} /> : myLPChange < 0 ? <TrendingDown size={18} /> : <Minus size={18} />}
          <span>{myLPChange > 0 ? '+' : ''}{myLPChange || 0} LP</span>
        </div>
      </div>

      {/* Position cards */}
      <div className="draft-results__positions">
        <div className={`pos-card ${isWin || (isDraw && myPos <= rivalPos) ? 'winner' : ''}`}>
          <div className="pos-card__badge"><PositionBadge position={myPos} /></div>
          <div className="pos-card__name">{myName}</div>
          <div className="pos-card__stats">{myEntry.points || 0} pts · {myEntry.goalsFor || 0} GF</div>
          {myTrophies.length > 0 && <div className="pos-card__trophies">{myTrophies.join(' ')}</div>}
        </div>
        <div className="pos-vs">vs</div>
        <div className={`pos-card ${!isWin && !isDraw ? 'winner' : ''}`}>
          <div className="pos-card__badge"><PositionBadge position={rivalPos} /></div>
          <div className="pos-card__name">{rivalName}</div>
          <div className="pos-card__stats">{rivalEntry.points || 0} pts · {rivalEntry.goalsFor || 0} GF</div>
          {rivalTrophies.length > 0 && <div className="pos-card__trophies">{rivalTrophies.join(' ')}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="draft-results__tabs">
        {['resumen', 'tabla', 'h2h', 'stats'].map(tab => (
          <button
            key={tab}
            className={`results-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'resumen' ? 'Resumen' : tab === 'tabla' ? 'Clasificación' : tab === 'h2h' ? 'Enfrentamientos' : 'Estadísticas'}
          </button>
        ))}
      </div>

      <div className="draft-results__body">
        {/* Resumen tab */}
        {activeTab === 'resumen' && (
          <div className="results-resumen">
            <div className="resumen-grid">
              <div className="resumen-stat">
                <div className="resumen-stat__label">Tu posición</div>
                <div className="resumen-stat__value">{myPos}º</div>
              </div>
              <div className="resumen-stat">
                <div className="resumen-stat__label">Puntos liga</div>
                <div className="resumen-stat__value">{myEntry.points || 0}</div>
              </div>
              <div className="resumen-stat">
                <div className="resumen-stat__label">Goles F / C</div>
                <div className="resumen-stat__value">{myEntry.goalsFor || 0} / {myEntry.goalsAgainst || 0}</div>
              </div>
              <div className="resumen-stat">
                <div className="resumen-stat__label">Balance</div>
                <div className="resumen-stat__value">{myEntry.won || 0}V {myEntry.drawn || 0}E {myEntry.lost || 0}D</div>
              </div>
              <div className="resumen-stat">
                <div className="resumen-stat__label">H2H vs rival</div>
                <div className="resumen-stat__value">{h2hWins}V {h2hDraws}E {h2hLosses}D</div>
              </div>
              <div className="resumen-stat">
                <div className="resumen-stat__label">Copa</div>
                <div className="resumen-stat__value">{mySimData?.copa ? '🏆 Campeón' : mySimData?.cupRound || '-'}</div>
              </div>
              {mySimData?.europeanCompetition && (
                <div className="resumen-stat">
                  <div className="resumen-stat__label">Europa</div>
                  <div className="resumen-stat__value">{mySimData.europeanRound || '-'}</div>
                </div>
              )}
            </div>
            {mySimData?.topScorers?.length > 0 && (
              <div className="resumen-scorers">
                <div className="resumen-scorers__title">Tus goleadores</div>
                {mySimData.topScorers.map((s, i) => (
                  <div key={i} className="resumen-scorers__row">
                    <span className="scorer-name">{s.name}</span>
                    <span className="scorer-goals">{s.goals} ⚽</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tabla tab */}
        {activeTab === 'tabla' && table.length > 0 && (
          <div className="results-tabla">
            <div className="results-table-header">
              <span className="th-pos">#</span>
              <span className="th-name">Equipo</span>
              <span className="th-pj">PJ</span>
              <span className="th-v">V</span>
              <span className="th-e">E</span>
              <span className="th-d">D</span>
              <span className="th-gf">GF</span>
              <span className="th-gc">GC</span>
              <span className="th-dg">DG</span>
              <span className="th-pts">Pts</span>
            </div>
            <div className="results-table-body">
              {table.map((team, i) => {
                const isMe = team.teamId === myTeamId;
                const isRival = team.teamId === rivalTeamId;
                return (
                  <div key={team.teamId} className={`results-table-row ${isMe ? 'me' : isRival ? 'rival' : ''} ${i < 3 ? 'top3' : ''}`}>
                    <span className="td-pos">
                      {i < 3 ? <PositionBadge position={i + 1} /> : <span>{i + 1}</span>}
                    </span>
                    <span className="td-name">{team.teamName}</span>
                    <span className="td-pj">{team.played}</span>
                    <span className="td-v">{team.won}</span>
                    <span className="td-e">{team.drawn}</span>
                    <span className="td-d">{team.lost}</span>
                    <span className="td-gf">{team.goalsFor}</span>
                    <span className="td-gc">{team.goalsAgainst}</span>
                    <span className="td-dg">{(team.goalDifference > 0 ? '+' : '')}{team.goalDifference}</span>
                    <span className="td-pts">{team.points}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* H2H tab */}
        {activeTab === 'h2h' && (
          <div className="results-h2h">
            <div className="h2h-summary">
              <span className="h2h-record">{h2hWins}V - {h2hDraws}E - {h2hLosses}D</span>
            </div>
            {myH2H.length > 0 ? myH2H.map((r, i) => (
              <div key={i} className={`h2h-match ${r.goalsFor > r.goalsAgainst ? 'win' : r.goalsFor < r.goalsAgainst ? 'loss' : 'draw'}`}>
                <div className="h2h-match__teams">
                  <span className="h2h-team home">{r.home ? myName : rivalName}</span>
                  <span className="h2h-score">{r.home ? r.goalsFor : r.goalsAgainst} - {r.home ? r.goalsAgainst : r.goalsFor}</span>
                  <span className="h2h-team away">{r.home ? rivalName : myName}</span>
                </div>
                <div className="h2h-match__badge">
                  {r.goalsFor > r.goalsAgainst ? <span className="badge-win">V</span> :
                   r.goalsFor < r.goalsAgainst ? <span className="badge-loss">D</span> :
                   <span className="badge-draw">E</span>}
                </div>
              </div>
            )) : (
              <div className="h2h-empty">No hubo enfrentamientos directos</div>
            )}
          </div>
        )}

        {/* Stats tab */}
        {activeTab === 'stats' && (
          <div className="results-stats">
            {allTopScorers.length > 0 && (
              <div className="stats-section">
                <div className="stats-section__title">⚽ Goleadores</div>
                {allTopScorers.slice(0, 5).map((s, i) => (
                  <div key={i} className={`stats-row ${s.teamId === myTeamId ? 'highlight-me' : s.teamId === rivalTeamId ? 'highlight-rival' : ''}`}>
                    <span className="stats-rank">{i + 1}</span>
                    <span className="stats-name">{s.name}</span>
                    <span className="stats-team">{s.teamName}</span>
                    <span className="stats-value">{s.goals}</span>
                  </div>
                ))}
              </div>
            )}
            {allTopAssists.length > 0 && (
              <div className="stats-section">
                <div className="stats-section__title">🅰️ Asistencias</div>
                {allTopAssists.slice(0, 5).map((s, i) => (
                  <div key={i} className={`stats-row ${s.teamId === myTeamId ? 'highlight-me' : s.teamId === rivalTeamId ? 'highlight-rival' : ''}`}>
                    <span className="stats-rank">{i + 1}</span>
                    <span className="stats-name">{s.name}</span>
                    <span className="stats-team">{s.teamName}</span>
                    <span className="stats-value">{s.assists}</span>
                  </div>
                ))}
              </div>
            )}
            {allTopYellows.length > 0 && (
              <div className="stats-section">
                <div className="stats-section__title">🟨 Tarjetas amarillas</div>
                {allTopYellows.slice(0, 3).map((s, i) => (
                  <div key={i} className={`stats-row ${s.teamId === myTeamId ? 'highlight-me' : s.teamId === rivalTeamId ? 'highlight-rival' : ''}`}>
                    <span className="stats-rank">{i + 1}</span>
                    <span className="stats-name">{s.name}</span>
                    <span className="stats-team">{s.teamName}</span>
                    <span className="stats-value">{s.yellows}</span>
                  </div>
                ))}
              </div>
            )}
            {bestAttack && (
              <div className="stats-section">
                <div className="stats-section__title">💥 Mejor ataque</div>
                <div className={`stats-row ${bestAttack.teamId === myTeamId ? 'highlight-me' : bestAttack.teamId === rivalTeamId ? 'highlight-rival' : ''}`}>
                  <span className="stats-name">{bestAttack.teamName}</span>
                  <span className="stats-value">{bestAttack.goalsFor} goles</span>
                </div>
              </div>
            )}
            {bestDefense && (
              <div className="stats-section">
                <div className="stats-section__title">🛡️ Mejor defensa</div>
                <div className={`stats-row ${bestDefense.teamId === myTeamId ? 'highlight-me' : bestDefense.teamId === rivalTeamId ? 'highlight-rival' : ''}`}>
                  <span className="stats-name">{bestDefense.teamName}</span>
                  <span className="stats-value">{bestDefense.goalsAgainst} goles enc.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <button className="draft-results__back" onClick={onExit}>
        <ArrowLeft size={18} />
        <span>Volver al lobby</span>
      </button>
    </div>
  );
}
