import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { X, RotateCcw, Trophy, Frown, Minus, ChevronRight, Zap, Check, ArrowRight } from 'lucide-react';
import { simulateMatchV2 } from '../../game/matchSimulationV2';
import { sortTable } from '../../game/leagueEngine';
import './ReplayMatch.scss';

export default function ReplayMatchModal({ onClose }) {
  const { state, dispatch } = useGame();
  const [phase, setPhase] = useState('select'); // select | countdown | simulating | reveal | result
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [simProgress, setSimProgress] = useState(0);
  const [simEvents, setSimEvents] = useState([]);
  const [newResult, setNewResult] = useState(null);
  const [revealStep, setRevealStep] = useState(0); // 0=hidden, 1=flash, 2=show
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const [countdown, setCountdown] = useState(3);

  const teamId = state.teamId;
  const teamName = state.team?.name || 'Tu equipo';
  const fixtures = state.fixtures || [];

  // All played matches
  const playedMatches = fixtures
    .filter(f => f.played && (f.homeTeam === teamId || f.awayTeam === teamId))
    .sort((a, b) => a.week - b.week)
    .map(f => {
      const isHome = f.homeTeam === teamId;
      const playerGoals = isHome ? f.homeScore : f.awayScore;
      const rivalGoals = isHome ? f.awayScore : f.homeScore;
      const rivalId = isHome ? f.awayTeam : f.homeTeam;
      const rivalName = getRivalName(state, rivalId);
      const result = playerGoals > rivalGoals ? 'W' : playerGoals < rivalGoals ? 'L' : 'D';
      return { ...f, isHome, playerGoals, rivalGoals, rivalId, rivalName, result };
    });

  const handleSelectMatch = (match) => {
    setSelectedMatch(match);
    setPhase('countdown');
    setCountdown(3);
  };

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('simulating');
      runSimulation(selectedMatch);
      return;
    }
    countdownRef.current = setTimeout(() => setCountdown(c => c - 1), 700);
    return () => clearTimeout(countdownRef.current);
  }, [phase, countdown]);

  const runSimulation = (match) => {
    const allTeams = state.leagueTeams || [];
    const playerTeam = state.team;
    const rivalTeamData = allTeams.find(t => t.id === match.rivalId) || {
      id: match.rivalId, name: match.rivalName, players: [], overall: 50
    };

    const context = {
      homeFormation: state.formation || '4-3-3',
      awayFormation: '4-3-3',
      homeTactic: state.tactic || 'balanced',
      awayTactic: 'balanced',
      homeMorale: 75,
      awayMorale: 70,
      homeLineup: match.isHome ? state.lineup : null,
      awayLineup: match.isHome ? null : state.lineup,
      playerTeamId: teamId,
      playerIsHome: match.isHome,
    };

    const homeData = match.isHome ? playerTeam : rivalTeamData;
    const awayData = match.isHome ? rivalTeamData : playerTeam;
    const homeId = match.isHome ? teamId : match.rivalId;
    const awayId = match.isHome ? match.rivalId : teamId;

    const simResult = simulateMatchV2(homeId, awayId, homeData, awayData, context);

    const events = (simResult.events || [])
      .filter(e => ['goal', 'yellowCard', 'redCard', 'yellow_card', 'red_card'].includes(e.type))
      .sort((a, b) => a.minute - b.minute);

    let minute = 0;
    const revealedEvents = [];

    intervalRef.current = setInterval(() => {
      minute += 1;
      setSimProgress(minute);

      while (events.length > 0 && events[0].minute <= minute) {
        revealedEvents.push(events.shift());
        setSimEvents([...revealedEvents]);
      }

      if (minute >= 90) {
        clearInterval(intervalRef.current);
        const playerGoals = match.isHome ? simResult.homeScore : simResult.awayScore;
        const rivalGoals = match.isHome ? simResult.awayScore : simResult.homeScore;
        const result = playerGoals > rivalGoals ? 'W' : playerGoals < rivalGoals ? 'L' : 'D';

        setNewResult({
          homeScore: simResult.homeScore,
          awayScore: simResult.awayScore,
          playerGoals,
          rivalGoals,
          result,
          events: simResult.events || [],
        });

        // Dramatic reveal sequence
        setTimeout(() => {
          setPhase('reveal');
          setRevealStep(1); // flash
          setTimeout(() => setRevealStep(2), 600); // show result
          setTimeout(() => setPhase('result'), 1800); // full result screen
        }, 600);
      }
    }, 30);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, []);

  const handleConfirmReplay = () => {
    if (!selectedMatch || !newResult) return;

    const updatedFixtures = fixtures.map(f => {
      if (f.id === selectedMatch.id) {
        return { ...f, homeScore: newResult.homeScore, awayScore: newResult.awayScore, events: newResult.events };
      }
      return f;
    });

    const revertedTable = state.leagueTable.map(t => {
      if (t.teamId === selectedMatch.homeTeam) return revertMatchFromTable(t, selectedMatch.homeScore, selectedMatch.awayScore);
      if (t.teamId === selectedMatch.awayTeam) return revertMatchFromTable(t, selectedMatch.awayScore, selectedMatch.homeScore);
      return t;
    });

    const updatedTable = revertedTable.map(t => {
      if (t.teamId === selectedMatch.homeTeam) return applyMatchToTable(t, newResult.homeScore, newResult.awayScore);
      if (t.teamId === selectedMatch.awayTeam) return applyMatchToTable(t, newResult.awayScore, newResult.homeScore);
      return t;
    });

    dispatch({ type: 'SET_FIXTURES', payload: updatedFixtures });
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: sortTable(updatedTable) });
    dispatch({
      type: 'UPDATE_GLORY_STATE',
      payload: {
        gloryData: { ...state.gloryData, replaysLeft: Math.max(0, (state.gloryData?.replaysLeft || 1) - 1) },
      },
    });
    onClose();
  };

  // ── SELECT PHASE ──
  if (phase === 'select') {
    return (
      <div className="replay2__overlay" onClick={onClose}>
        <div className="replay2__modal" onClick={e => e.stopPropagation()}>
          <div className="replay2__top">
            <div className="replay2__top-info">
              <RotateCcw size={18} className="replay2__top-icon" />
              <div>
                <h2>Segunda Oportunidad</h2>
                <p>Elige un partido para rejugarlo</p>
              </div>
            </div>
            <button className="replay2__close" onClick={onClose}><X size={18} /></button>
          </div>

          <div className="replay2__list">
            {playedMatches.length === 0 ? (
              <div className="replay2__empty">
                <p>No has jugado ningún partido aún.</p>
              </div>
            ) : (
              playedMatches.map(match => (
                <button key={match.id} className="replay2__match" onClick={() => handleSelectMatch(match)}>
                  <span className="replay2__match-week">J{match.week}</span>
                  <div className="replay2__match-body">
                    <span className={`replay2__match-team ${match.isHome ? 'replay2__match-team--you' : ''}`}>
                      {match.isHome ? teamName : match.rivalName}
                    </span>
                    <div className={`replay2__match-result replay2__match-result--${match.result.toLowerCase()}`}>
                      <span>{match.isHome ? match.homeScore : match.awayScore}</span>
                      <span className="replay2__match-dash">-</span>
                      <span>{match.isHome ? match.awayScore : match.homeScore}</span>
                    </div>
                    <span className={`replay2__match-team ${!match.isHome ? 'replay2__match-team--you' : ''}`}>
                      {!match.isHome ? teamName : match.rivalName}
                    </span>
                  </div>
                  <ChevronRight size={14} className="replay2__match-arrow" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── COUNTDOWN ──
  if (phase === 'countdown') {
    return (
      <div className="replay2__overlay">
        <div className="replay2__countdown">
          <div className="replay2__countdown-number" key={countdown}>{countdown || 'GO'}</div>
          <p className="replay2__countdown-vs">
            {teamName} vs {selectedMatch.rivalName}
          </p>
        </div>
      </div>
    );
  }

  // ── SIMULATING ──
  if (phase === 'simulating' || phase === 'reveal') {
    const homeName = selectedMatch.isHome ? teamName : selectedMatch.rivalName;
    const awayName = selectedMatch.isHome ? selectedMatch.rivalName : teamName;
    let liveHome = 0, liveAway = 0;
    simEvents.forEach(e => {
      if (e.type === 'goal') {
        if (e.team === 'home') liveHome++;
        else liveAway++;
      }
    });

    return (
      <div className="replay2__overlay">
        <div className={`replay2__sim ${phase === 'reveal' ? 'replay2__sim--reveal' : ''}`}>
          {/* Live badge */}
          <div className="replay2__sim-live">
            <Zap size={12} />
            <span>{phase === 'reveal' ? 'FINAL' : `${simProgress}'`}</span>
          </div>

          {/* Scoreboard */}
          <div className="replay2__sim-board">
            <div className="replay2__sim-side">
              <span className={`replay2__sim-name ${selectedMatch.isHome ? 'replay2__sim-name--you' : ''}`}>{homeName}</span>
            </div>
            <div className={`replay2__sim-score ${phase === 'reveal' && revealStep >= 1 ? 'replay2__sim-score--flash' : ''}`}>
              <span>{liveHome}</span>
              <span className="replay2__sim-colon">:</span>
              <span>{liveAway}</span>
            </div>
            <div className="replay2__sim-side">
              <span className={`replay2__sim-name ${!selectedMatch.isHome ? 'replay2__sim-name--you' : ''}`}>{awayName}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="replay2__sim-progress">
            <div className="replay2__sim-bar" style={{ width: `${(simProgress / 90) * 100}%` }} />
          </div>

          {/* Events feed */}
          <div className="replay2__sim-feed">
            {simEvents.slice(-6).map((e, i) => (
              <div key={i} className={`replay2__sim-evt replay2__sim-evt--${e.type}`}>
                <span className="replay2__sim-evt-min">{e.minute}'</span>
                <span className="replay2__sim-evt-icon">
                  {e.type === 'goal' ? '⚽' : e.type === 'redCard' || e.type === 'red_card' ? '🟥' : '🟨'}
                </span>
                <span className="replay2__sim-evt-name">{typeof e.player === 'object' ? e.player?.name : e.player || '???'}</span>
                <span className="replay2__sim-evt-team">{e.team === 'home' ? homeName : awayName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (phase === 'result' && newResult) {
    const isWin = newResult.result === 'W';
    const isDraw = newResult.result === 'D';
    const isLoss = newResult.result === 'L';
    const isBetter = (newResult.playerGoals - newResult.rivalGoals) > (selectedMatch.playerGoals - selectedMatch.rivalGoals);
    const isWorse = (newResult.playerGoals - newResult.rivalGoals) < (selectedMatch.playerGoals - selectedMatch.rivalGoals);

    return (
      <div className="replay2__overlay">
        <div className={`replay2__result replay2__result--${newResult.result.toLowerCase()}`}>
          {/* Glow effect */}
          <div className="replay2__result-glow" />

          <div className="replay2__result-badge">
            {isWin && <Trophy size={36} />}
            {isDraw && <Minus size={36} />}
            {isLoss && <Frown size={36} />}
          </div>

          <h2 className="replay2__result-title">
            {isWin ? '¡Victoria!' : isDraw ? 'Empate' : 'Derrota'}
          </h2>

          <div className="replay2__result-score">
            <span>{newResult.playerGoals}</span>
            <span className="replay2__result-dash">-</span>
            <span>{newResult.rivalGoals}</span>
          </div>
          <p className="replay2__result-vs">vs {selectedMatch.rivalName}</p>

          {/* Comparison */}
          <div className="replay2__result-compare">
            <div className="replay2__result-old">
              <span className="replay2__result-label">Antes</span>
              <span className="replay2__result-val">{selectedMatch.playerGoals} - {selectedMatch.rivalGoals}</span>
            </div>
            <ArrowRight size={16} className="replay2__result-arrow" />
            <div className={`replay2__result-new ${isBetter ? 'better' : isWorse ? 'worse' : 'same'}`}>
              <span className="replay2__result-label">Ahora</span>
              <span className="replay2__result-val">{newResult.playerGoals} - {newResult.rivalGoals}</span>
            </div>
          </div>

          <p className="replay2__result-hint">
            {isBetter ? '¡El destino te ha sonreído!' : isWorse ? 'El destino no estuvo de tu lado...' : 'El resultado no ha cambiado.'}
          </p>

          <div className="replay2__result-actions">
            <button className="replay2__btn replay2__btn--accept" onClick={handleConfirmReplay}>
              <Check size={16} /> Aplicar resultado
            </button>
            <button className="replay2__btn replay2__btn--discard" onClick={() => {
              // Still consume the replay use even if discarding
              dispatch({
                type: 'UPDATE_GLORY_STATE',
                payload: {
                  gloryData: { ...state.gloryData, replaysLeft: Math.max(0, (state.gloryData?.replaysLeft || 1) - 1) },
                },
              });
              onClose();
            }}>
              Mantener original
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── Helpers ──
function getRivalName(state, rivalId) {
  const tableEntry = state.leagueTable?.find(t => t.teamId === rivalId);
  if (tableEntry) return tableEntry.teamName;
  const team = state.leagueTeams?.find(t => t.id === rivalId);
  return team?.name || rivalId;
}

function revertMatchFromTable(entry, goalsFor, goalsAgainst) {
  const won = goalsFor > goalsAgainst ? 1 : 0;
  const drawn = goalsFor === goalsAgainst ? 1 : 0;
  const lost = goalsFor < goalsAgainst ? 1 : 0;
  const pts = won * 3 + drawn;
  return {
    ...entry,
    played: Math.max(0, entry.played - 1),
    won: Math.max(0, entry.won - won),
    drawn: Math.max(0, entry.drawn - drawn),
    lost: Math.max(0, entry.lost - lost),
    goalsFor: Math.max(0, entry.goalsFor - goalsFor),
    goalsAgainst: Math.max(0, entry.goalsAgainst - goalsAgainst),
    goalDifference: (entry.goalsFor - goalsFor) - (entry.goalsAgainst - goalsAgainst),
    points: Math.max(0, entry.points - pts),
  };
}

function applyMatchToTable(entry, goalsFor, goalsAgainst) {
  const won = goalsFor > goalsAgainst ? 1 : 0;
  const drawn = goalsFor === goalsAgainst ? 1 : 0;
  const lost = goalsFor < goalsAgainst ? 1 : 0;
  const pts = won * 3 + drawn;
  return {
    ...entry,
    played: entry.played + 1,
    won: entry.won + won,
    drawn: entry.drawn + drawn,
    lost: entry.lost + lost,
    goalsFor: entry.goalsFor + goalsFor,
    goalsAgainst: entry.goalsAgainst + goalsAgainst,
    goalDifference: (entry.goalsFor + goalsFor) - (entry.goalsAgainst + goalsAgainst),
    points: entry.points + pts,
  };
}
