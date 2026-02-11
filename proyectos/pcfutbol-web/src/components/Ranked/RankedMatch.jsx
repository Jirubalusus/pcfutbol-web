import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import {
  onMatchChange, selectTeam, submitRoundConfig, advancePhase,
  sendHeartbeat, checkDisconnect, claimDisconnectWin,
  attemptRankedTransfer, getLeagueTeamsForMatch
} from '../../firebase/rankedService';
import { getTierByLP, calculateMatchPoints, COMPETITION_POINTS } from './tierUtils';
import { FORMATIONS, TACTICS } from '../../game/gameShared';
import {
  Swords, Shield, Clock, Trophy, ChevronRight, AlertTriangle,
  Check, X, ArrowLeft, Star, Zap, Target, Users, Search,
  ChevronDown, Lock, Unlock, TrendingUp, Award
} from 'lucide-react';
import './RankedMatch.scss';

// Available formations and tactics for the UI
const FORMATION_OPTIONS = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2', '3-4-3', '4-5-1', '4-1-4-1'];
const TACTIC_OPTIONS = [
  { id: 'attacking', name: 'Ofensiva', icon: '⚔️' },
  { id: 'balanced', name: 'Equilibrada', icon: '⚖️' },
  { id: 'defensive', name: 'Defensiva', icon: '🛡️' },
  { id: 'counter', name: 'Contraataque', icon: '🏃' },
  { id: 'possession', name: 'Posesión', icon: '🎯' },
  { id: 'pressing', name: 'Presión alta', icon: '🔥' },
];

export default function RankedMatch() {
  const { user } = useAuth();
  const { state, dispatch } = useGame();
  const [match, setMatch] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Round config state
  const [formation, setFormation] = useState('4-3-3');
  const [tactic, setTactic] = useState('balanced');
  const [configSubmitted, setConfigSubmitted] = useState(false);
  
  // Transfer state
  const [showTransfers, setShowTransfers] = useState(false);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferResult, setTransferResult] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [leagueTeams, setLeagueTeams] = useState([]);
  
  const matchId = state.rankedMatchId;

  // If user logged out, go back to menu
  useEffect(() => {
    if (!user?.uid) {
      dispatch({ type: 'SET_SCREEN', payload: 'menu' });
    }
  }, [user?.uid]);

  // Listen to match changes
  useEffect(() => {
    if (!matchId) return;
    const unsub = onMatchChange(matchId, (data) => {
      setMatch(data);
      setLoading(false);
      // Load league teams when match data arrives
      if (data?.leagueId) {
        const teams = getLeagueTeamsForMatch(data.leagueId);
        setLeagueTeams(teams);
      }
    });
    return () => unsub();
  }, [matchId]);

  // Reset config when phase changes
  useEffect(() => {
    if (match?.phase === 'round1' || match?.phase === 'round2') {
      setConfigSubmitted(false);
      setShowTransfers(false);
      setTransferResult(null);
    }
  }, [match?.phase]);

  // Countdown timer
  useEffect(() => {
    if (!match?.phaseDeadline) return;
    const tick = () => {
      const deadline = match.phaseDeadline.toDate ? match.phaseDeadline.toDate() : new Date(match.phaseDeadline);
      const remaining = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      // Auto-advance when timer hits 0
      if (remaining === 0 && isPlayer1() && ['team_selection', 'round1', 'round2'].includes(match.phase)) {
        advancePhase(matchId).catch(console.error);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match?.phaseDeadline, match?.phase]);

  // Auto-advance simulation phases
  useEffect(() => {
    if (!match || !matchId) return;
    if ((match.phase === 'simulating1' || match.phase === 'simulating2') && isPlayer1()) {
      const timer = setTimeout(() => {
        advancePhase(matchId).catch(console.error);
      }, 8000); // 8s to view simulation results
      return () => clearTimeout(timer);
    }
  }, [match?.phase, matchId]);

  // Heartbeat
  useEffect(() => {
    if (!matchId || !user?.uid || !match || match.phase === 'results') return;
    const interval = setInterval(() => {
      sendHeartbeat(matchId, user.uid).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [matchId, user?.uid, match?.phase]);

  // Disconnect check
  useEffect(() => {
    if (!matchId || !user?.uid || !match || match.phase === 'results') return;
    const interval = setInterval(async () => {
      const dc = await checkDisconnect(matchId, user.uid);
      if (dc) await claimDisconnectWin(matchId, user.uid);
    }, 15000);
    return () => clearInterval(interval);
  }, [matchId, user?.uid, match?.phase]);

  const isPlayer1 = useCallback(() => match?.player1?.uid === user?.uid, [match, user]);
  const getMyData = () => isPlayer1() ? match?.player1 : match?.player2;
  const getRivalData = () => isPlayer1() ? match?.player2 : match?.player1;
  const getMyKey = () => isPlayer1() ? 'player1' : 'player2';

  const handleSelectTeam = async (teamId) => {
    if (!matchId || !user?.uid) return;
    setSelectedTeam(teamId);
    try {
      await selectTeam(matchId, user.uid, teamId);
    } catch (e) {
      setSelectedTeam(null);
      alert(e.message);
    }
  };

  const handleSubmitConfig = async () => {
    if (!matchId || !user?.uid) return;
    const config = { formation, tactic, morale: 75 };
    await submitRoundConfig(matchId, user.uid, config);
    setConfigSubmitted(true);
    
    // Check if both players submitted
    if (isPlayer1()) {
      // Small delay to allow other player's data to sync
      setTimeout(() => advancePhase(matchId).catch(console.error), 2000);
    }
  };

  const handleTransfer = async (playerName, teamId) => {
    if (!matchId || !user?.uid) return;
    setTransferLoading(true);
    try {
      const result = await attemptRankedTransfer(matchId, user.uid, playerName, teamId);
      setTransferResult(result);
      setTimeout(() => setTransferResult(null), 3000);
    } catch (e) {
      setTransferResult({ success: false, reason: e.message });
    }
    setTransferLoading(false);
  };

  const handleBackToLobby = () => {
    dispatch({ type: 'SET_RANKED_MATCH_ID', payload: null });
    dispatch({ type: 'SET_SCREEN', payload: 'ranked_lobby' });
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Available players for transfer
  const transferablePlayers = useMemo(() => {
    if (!leagueTeams.length || !match) return [];
    const myTeamId = getMyData()?.team;
    const rivalTeamId = getRivalData()?.team;
    const blocked = match.blockedTransfers?.[getMyKey()] || [];
    
    return leagueTeams
      .filter(t => t.id !== myTeamId) // Can't buy from own team
      .flatMap(team => (team.players || []).map(p => ({
        ...p,
        teamName: team.name,
        teamId: team.id,
        isBlocked: blocked.includes(p.name || p.id),
        isRivalTeam: team.id === rivalTeamId,
      })))
      .filter(p => {
        if (!transferSearch) return false; // Don't show all players without search
        const search = transferSearch.toLowerCase();
        return (p.name || '').toLowerCase().includes(search) ||
               (p.teamName || '').toLowerCase().includes(search) ||
               (p.position || '').toLowerCase().includes(search);
      })
      .slice(0, 30); // Limit results
  }, [leagueTeams, match, transferSearch]);

  if (loading || !match) {
    return (
      <div className="ranked-match">
        <div className="ranked-match__loading">
          <Swords size={32} className="spin" />
          <p>Conectando a la partida...</p>
        </div>
      </div>
    );
  }

  const myData = getMyData();
  const rivalData = getRivalData();
  const myTeamInfo = match.teams?.find(t => t.id === myData?.team);
  const rivalTeamInfo = match.teams?.find(t => t.id === rivalData?.team);

  return (
    <div className="ranked-match">
      {/* Header */}
      <div className="ranked-match__header">
        <div className="player-badge me">
          <span className="name">{myData?.displayName}</span>
          <span className="tier">{getTierByLP(myData?.totalLP || 0)?.icon}</span>
        </div>
        <div className="vs">
          <Swords size={20} />
          <span className="phase-label">{getPhaseLabel(match.phase)}</span>
        </div>
        <div className="player-badge rival">
          <span className="tier">{getTierByLP(rivalData?.totalLP || 0)?.icon}</span>
          <span className="name">{rivalData?.displayName}</span>
        </div>
      </div>

      {/* Timer */}
      {!['results', 'simulating1', 'simulating2'].includes(match.phase) && (
        <div className={`ranked-match__timer ${timeLeft <= 30 ? 'urgent' : ''}`}>
          <Clock size={16} />
          <span>{formatTime(timeLeft)}</span>
        </div>
      )}

      <div className="ranked-match__content">
        {/* ── TEAM SELECTION ── */}
        {match.phase === 'team_selection' && (
          <div className="phase-team-selection">
            <h2>🏟️ {match.leagueName}</h2>
            <p className="subtitle">{match.leagueCountry} · {match.matchdays} jornadas</p>
            <p className="hint">Elige tu equipo ({match.teams?.length} opciones)</p>
            <div className="team-grid">
              {match.teams?.map(team => {
                const takenByRival = rivalData?.team === team.id;
                const isSelected = myData?.team === team.id || selectedTeam === team.id;
                return (
                  <button
                    key={team.id}
                    className={`team-card ${isSelected ? 'selected' : ''} ${takenByRival ? 'taken' : ''}`}
                    onClick={() => !takenByRival && !myData?.team && handleSelectTeam(team.id)}
                    disabled={takenByRival || !!myData?.team}
                  >
                    <Shield size={28} />
                    <span className="team-name">{team.name}</span>
                    <div className="team-details">
                      <span className="team-stat">⭐ {team.avgOverall}</span>
                      <span className="team-stat">👥 {team.playerCount}</span>
                      <span className="team-stat">💰 {(team.budget / 1000000).toFixed(1)}M</span>
                    </div>
                    {takenByRival && <span className="taken-label">⛔ Elegido por rival</span>}
                    {isSelected && <Check size={18} className="check-icon" />}
                  </button>
                );
              })}
            </div>
            {myData?.team && !rivalData?.team && (
              <p className="waiting">⏳ Esperando a que el rival elija...</p>
            )}
          </div>
        )}

        {/* ── ROUND 1 / ROUND 2 ── */}
        {(match.phase === 'round1' || match.phase === 'round2') && (
          <div className="phase-round">
            <h2>{match.phase === 'round1' ? '📋 Primera Vuelta' : '📋 Segunda Vuelta'}</h2>
            
            <div className="round-teams">
              <div className="my-team-card">
                <Shield size={18} />
                <span>{myTeamInfo?.name || 'Mi equipo'}</span>
              </div>
              <span className="vs-label">vs</span>
              <div className="rival-team-card">
                <Shield size={18} />
                <span>{rivalTeamInfo?.name || 'Rival'}</span>
              </div>
            </div>

            {/* Mid-season standings (Round 2 only) */}
            {match.phase === 'round2' && match.simulation1 && (
              <div className="midseason-box">
                <h3>📊 Clasificación a media temporada</h3>
                <div className="mini-table">
                  {match.simulation1.table?.slice(0, 6).map((t, i) => (
                    <div key={t.teamId} className={`table-row ${t.teamId === myData?.team ? 'me' : t.teamId === rivalData?.team ? 'rival' : ''}`}>
                      <span className="pos">{i + 1}</span>
                      <span className="name">{t.teamName}</span>
                      <span className="pts">{t.points}pts</span>
                      <span className="record">{t.won}V {t.drawn}E {t.lost}D</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tactics Configuration */}
            {!configSubmitted ? (
              <div className="config-section">
                <h3>⚙️ Configuración</h3>
                
                <div className="config-row">
                  <label>Formación</label>
                  <div className="formation-grid">
                    {FORMATION_OPTIONS.map(f => (
                      <button
                        key={f}
                        className={`formation-btn ${formation === f ? 'active' : ''}`}
                        onClick={() => setFormation(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="config-row">
                  <label>Táctica</label>
                  <div className="tactic-grid">
                    {TACTIC_OPTIONS.map(t => (
                      <button
                        key={t.id}
                        className={`tactic-btn ${tactic === t.id ? 'active' : ''}`}
                        onClick={() => setTactic(t.id)}
                      >
                        <span className="tactic-icon">{t.icon}</span>
                        <span className="tactic-name">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transfer button */}
                <button className="transfer-toggle" onClick={() => setShowTransfers(!showTransfers)}>
                  <Users size={18} />
                  <span>Fichajes</span>
                  <ChevronDown size={16} className={showTransfers ? 'rotated' : ''} />
                </button>

                {/* Transfer panel */}
                {showTransfers && (
                  <div className="transfer-panel">
                    <div className="transfer-search">
                      <Search size={16} />
                      <input
                        type="text"
                        placeholder="Buscar jugador o equipo..."
                        value={transferSearch}
                        onChange={e => setTransferSearch(e.target.value)}
                      />
                    </div>
                    
                    {transferResult && (
                      <div className={`transfer-result ${transferResult.success ? 'success' : 'fail'}`}>
                        {transferResult.success ? <Check size={16} /> : <X size={16} />}
                        <span>{transferResult.reason}</span>
                        {transferResult.value && <span className="value">{(transferResult.value / 1000000).toFixed(1)}M€</span>}
                      </div>
                    )}

                    <div className="transfer-list">
                      {transferablePlayers.map((p, i) => (
                        <div key={`${p.name}-${i}`} className={`transfer-player ${p.isBlocked ? 'blocked' : ''}`}>
                          <div className="player-info">
                            <span className="player-name">{p.name}</span>
                            <span className="player-meta">
                              {p.position} · {p.overall || '?'} · {p.age}a · {p.teamName}
                            </span>
                          </div>
                          {p.isBlocked ? (
                            <span className="blocked-badge"><Lock size={14} /> Bloqueado</span>
                          ) : (
                            <button
                              className="sign-btn"
                              onClick={() => handleTransfer(p.name, p.teamId)}
                              disabled={transferLoading}
                            >
                              Fichar
                            </button>
                          )}
                        </div>
                      ))}
                      {transferSearch && transferablePlayers.length === 0 && (
                        <p className="no-results">No se encontraron jugadores</p>
                      )}
                      {!transferSearch && (
                        <p className="no-results">Escribe para buscar jugadores</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button className="ready-btn" onClick={handleSubmitConfig}>
                  <Zap size={18} />
                  <span>Confirmar y simular</span>
                </button>
              </div>
            ) : (
              <div className="config-submitted">
                <Check size={24} />
                <p>Configuración enviada. Esperando al rival...</p>
              </div>
            )}
          </div>
        )}

        {/* ── SIMULATING ── */}
        {(match.phase === 'simulating1' || match.phase === 'simulating2') && (
          <div className="phase-simulating">
            <div className="sim-animation">
              <div className="sim-ball">⚽</div>
            </div>
            <h2>{match.phase === 'simulating1' ? 'Simulando primera vuelta...' : 'Simulando temporada completa...'}</h2>
            
            {/* Show live standings during simulation */}
            {match.phase === 'simulating1' && match.simulation1?.table && (
              <div className="sim-standings">
                <h3>Clasificación provisional</h3>
                <div className="mini-table">
                  {match.simulation1.table.slice(0, 8).map((t, i) => (
                    <div key={t.teamId} className={`table-row ${t.teamId === myData?.team ? 'me' : t.teamId === rivalData?.team ? 'rival' : ''}`}>
                      <span className="pos">{i + 1}</span>
                      <span className="name">{t.teamName}</span>
                      <span className="pts">{t.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {match.phase === 'simulating2' && match.simulation2?.table && (
              <div className="sim-standings">
                <h3>Clasificación final</h3>
                <div className="mini-table">
                  {match.simulation2.table.slice(0, 10).map((t, i) => (
                    <div key={t.teamId} className={`table-row ${t.teamId === myData?.team ? 'me' : t.teamId === rivalData?.team ? 'rival' : ''}`}>
                      <span className="pos">{i + 1}</span>
                      <span className="name">{t.teamName}</span>
                      <span className="pts">{t.points}</span>
                      <span className="gd">{t.goalDifference > 0 ? '+' : ''}{t.goalDifference}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="sim-wait">Los partidos se están disputando...</p>
          </div>
        )}

        {/* ── RESULTS ── */}
        {match.phase === 'results' && (
          <div className="phase-results">
            {match.results?.disconnection ? (
              <div className="result-disconnection">
                <AlertTriangle size={32} />
                <h2>{match.winner === user.uid ? '🎉 ¡Victoria por desconexión!' : '😞 Derrota por desconexión'}</h2>
              </div>
            ) : (
              <>
                <div className={`result-banner ${match.winner === user.uid ? 'win' : !match.winner ? 'draw' : 'loss'}`}>
                  <h2>
                    {match.winner === user.uid ? '🎉 ¡VICTORIA!' : !match.winner ? '🤝 EMPATE' : '😞 DERROTA'}
                  </h2>
                </div>

                <div className="results-scores">
                  <div className={`score-card ${isPlayer1() ? 'me' : 'rival'}`}>
                    <span className="team-name">{match.simulation2?.player1?.teamName || myTeamInfo?.name}</span>
                    <span className="points">{match.results?.player1Points ?? '?'} pts</span>
                  </div>
                  <div className="score-divider">VS</div>
                  <div className={`score-card ${!isPlayer1() ? 'me' : 'rival'}`}>
                    <span className="team-name">{match.simulation2?.player2?.teamName || rivalTeamInfo?.name}</span>
                    <span className="points">{match.results?.player2Points ?? '?'} pts</span>
                  </div>
                </div>

                {/* Final standings */}
                {match.simulation2?.table && (
                  <div className="final-table">
                    <h3>📊 Clasificación final</h3>
                    <div className="mini-table full">
                      {match.simulation2.table.map((t, i) => (
                        <div key={t.teamId} className={`table-row ${t.teamId === myData?.team ? 'me' : t.teamId === rivalData?.team ? 'rival' : ''}`}>
                          <span className="pos">{i + 1}</span>
                          <span className="name">{t.teamName}</span>
                          <span className="record">{t.won}V {t.drawn}E {t.lost}D</span>
                          <span className="gd">{t.goalDifference > 0 ? '+' : ''}{t.goalDifference}</span>
                          <span className="pts"><strong>{t.points}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Point breakdown */}
                {match.results?.simulation && (
                  <div className="results-breakdown">
                    <div className="breakdown-column">
                      <h4>{isPlayer1() ? 'Tus puntos' : 'Rival'}</h4>
                      {renderBreakdown(match.results.simulation.player1)}
                    </div>
                    <div className="breakdown-column">
                      <h4>{!isPlayer1() ? 'Tus puntos' : 'Rival'}</h4>
                      {renderBreakdown(match.results.simulation.player2)}
                    </div>
                  </div>
                )}

                {/* H2H Results */}
                {match.results?.simulation && (
                  <div className="h2h-results">
                    <h3>⚔️ Enfrentamientos directos</h3>
                    {(isPlayer1() ? match.results.simulation.player1 : match.results.simulation.player2)?.h2hResults?.map((r, i) => (
                      <div key={i} className="h2h-match">
                        <span>{r.home ? '🏠' : '✈️'}</span>
                        <span>{r.goalsFor} - {r.goalsAgainst}</span>
                        <span className={r.goalsFor > r.goalsAgainst ? 'win' : r.goalsFor < r.goalsAgainst ? 'loss' : 'draw'}>
                          {r.goalsFor > r.goalsAgainst ? 'V' : r.goalsFor < r.goalsAgainst ? 'D' : 'E'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <button className="back-btn" onClick={handleBackToLobby}>
              <ArrowLeft size={18} />
              <span>Volver al Lobby</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getPhaseLabel(phase) {
  const labels = {
    team_selection: 'Selección de equipo',
    round1: 'Ronda 1 — Primera vuelta',
    simulating1: 'Simulando...',
    round2: 'Ronda 2 — Segunda vuelta',
    simulating2: 'Simulando...',
    results: 'Resultados',
  };
  return labels[phase] || phase;
}

function renderBreakdown(sim) {
  if (!sim) return null;
  const items = [];
  if (sim.liga) items.push({ label: '🏆 Campeón de Liga', pts: 6 });
  if (sim.championsLeague) items.push({ label: '🏆 Champions League', pts: 10 });
  if (sim.europaLeague) items.push({ label: '🏆 Europa League', pts: 5 });
  if (sim.libertadores) items.push({ label: '🏆 Libertadores', pts: 5 });
  if (sim.conference) items.push({ label: '🏆 Conference League', pts: 3 });
  if (sim.sudamericana) items.push({ label: '🏆 Sudamericana', pts: 3 });
  if (sim.copa) items.push({ label: '🏆 Copa', pts: 3 });
  if (sim.supercopa) items.push({ label: '🏆 Supercopa', pts: 1 });
  if (sim.finishedAboveRival) items.push({ label: '📈 Mejor posición que rival', pts: 2 });
  if (sim.h2hWins > 0) items.push({ label: `⚔️ Victorias directas (${sim.h2hWins})`, pts: sim.h2hWins });
  
  items.push({ label: `📊 Posición liga: ${sim.leaguePosition}º (${sim.leaguePoints} pts)`, pts: null });
  if (sim.europeanCompetition) {
    items.push({ label: `🌍 ${sim.europeanCompetition}: ${sim.europeanRound || '-'}`, pts: null });
  }
  if (sim.cupRound) {
    items.push({ label: `🏆 Copa: ${sim.cupRound}`, pts: null });
  }

  const total = items.reduce((sum, item) => sum + (item.pts || 0), 0);

  return (
    <div className="breakdown-list">
      {items.map((item, i) => (
        <div key={i} className="breakdown-item">
          <span className="label">{item.label}</span>
          {item.pts !== null && <span className="pts">+{item.pts}</span>}
        </div>
      ))}
      <div className="breakdown-total">
        <span>TOTAL</span>
        <span className="pts">{total}</span>
      </div>
    </div>
  );
}
