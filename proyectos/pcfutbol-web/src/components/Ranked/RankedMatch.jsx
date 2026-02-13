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
import { getCupTeams, generateCupBracket } from '../../game/cupSystem';
import {
  getLaLigaTeams, getSegundaTeams, getPremierTeams, getSerieATeams,
  getBundesligaTeams, getLigue1Teams, getEredivisieTeams, getPrimeiraLigaTeams,
  getChampionshipTeams, getBelgianProTeams, getSuperLigTeams, getScottishPremTeams,
  getSerieBTeams, getBundesliga2Teams, getLigue2Teams, getArgentinaTeams,
  getBrasileiraoTeams, getColombiaTeams, getChileTeams, getUruguayTeams, getLigaMXTeams,
} from '../../data/teamsFirestore';
import {
  Swords, Shield, Clock, Trophy, ChevronRight, AlertTriangle,
  Check, X, ArrowLeft, Star, Zap, Target, Users, Search,
  ChevronDown, Lock, Unlock, TrendingUp, Award
} from 'lucide-react';

const LEAGUE_TEAMS_GETTERS = {
  laliga: getLaLigaTeams, segunda: getSegundaTeams,
  premierLeague: getPremierTeams, serieA: getSerieATeams,
  bundesliga: getBundesligaTeams, ligue1: getLigue1Teams,
  eredivisie: getEredivisieTeams, primeiraLiga: getPrimeiraLigaTeams,
  championship: getChampionshipTeams, belgianPro: getBelgianProTeams,
  superLig: getSuperLigTeams, scottishPrem: getScottishPremTeams,
  serieB: getSerieBTeams, bundesliga2: getBundesliga2Teams,
  ligue2: getLigue2Teams, argentinaPrimera: getArgentinaTeams,
  brasileiraoA: getBrasileiraoTeams, colombiaPrimera: getColombiaTeams,
  chilePrimera: getChileTeams, uruguayPrimera: getUruguayTeams,
  ligaMX: getLigaMXTeams,
};
import RankedResultsModal from './RankedResultsModal';
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

  // When round starts, load team into GameContext and show Office
  useEffect(() => {
    if (!match || !user?.uid) return;
    if (match.phase === 'round1' || match.phase === 'round2') {
      const myTeamId = match.player1?.uid === user.uid ? match.player1.team : match.player2.team;
      if (!myTeamId) return;

      // Load full team data from the league
      const leagueTeams = getLeagueTeamsForMatch(match.leagueId);
      const fullTeam = leagueTeams.find(t => t.id === myTeamId);
      if (!fullTeam) return;

      // Build a basic league table from match teams
      const leagueTable = leagueTeams.map((t, i) => ({
        teamId: t.id,
        teamName: t.name,
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
      }));

      // Use mid-season table if available (round2)
      const simTable = match.phase === 'round2' && match.simulation1?.table
        ? match.simulation1.table
        : leagueTable;

      dispatch({
        type: 'LOAD_RANKED_TEAM',
        payload: {
          team: JSON.parse(JSON.stringify(fullTeam)),
          leagueId: match.leagueId,
          leagueTable: simTable,
          money: fullTeam.transferBudget || fullTeam.budget || 5000000,
          gameMode: 'ranked',
        }
      });

      // Initialize cup competition for ranked
      try {
        const cupData = getCupTeams(match.leagueId, fullTeam, {}, simTable);
        if (cupData?.teams?.length >= 2) {
          const cupBracket = generateCupBracket(cupData.teams, fullTeam.id);
          if (cupBracket) dispatch({ type: 'INIT_CUP_COMPETITION', payload: cupBracket });
        }
      } catch { /* skip */ }

      // Load all league teams for the transfer market
      const allLeagueTeams = [];
      try {
        for (const [lid, getter] of Object.entries(LEAGUE_TEAMS_GETTERS)) {
          try {
            const teams = getter();
            for (const t of teams) {
              allLeagueTeams.push({ ...t, leagueId: lid, budget: t.budget || 20_000_000 });
            }
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
      if (allLeagueTeams.length > 0) {
        dispatch({ type: 'UPDATE_LEAGUE_TEAMS', payload: allLeagueTeams });
      }

      // Stay on RankedMatch screen — don't navigate to Office
      // RankedMatch has its own formation/tactic/transfer UI
    }
  }, [match?.phase, user?.uid]);

  // Countdown timer
  const advanceTriggeredRef = useRef(false);
  useEffect(() => {
    // Reset the flag when phase changes
    advanceTriggeredRef.current = false;
  }, [match?.phase]);
  
  useEffect(() => {
    if (!match?.phaseDeadline) return;
    const tick = () => {
      const deadline = match.phaseDeadline.toDate ? match.phaseDeadline.toDate() : new Date(match.phaseDeadline);
      const remaining = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      // Auto-advance when timer hits 0 — only once per phase
      if (remaining === 0 && !advanceTriggeredRef.current && ['team_selection', 'round1', 'round2'].includes(match.phase)) {
        advanceTriggeredRef.current = true;
        advancePhase(matchId).catch(console.error);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match?.phaseDeadline, match?.phase]);

  // When simulation/results phase starts, ensure we're showing the RankedMatch screen
  useEffect(() => {
    if (!match) return;
    // Only pull back to ranked_match for non-office phases (team selection, simulation, results)
    // During round1/round2, player should be in Office managing their team
    if (state.currentScreen === 'office' && state.gameMode === 'ranked' &&
        ['team_selection', 'simulating1', 'simulating2', 'results'].includes(match.phase)) {
      dispatch({ type: 'SET_SCREEN', payload: 'ranked_match' });
    }
  }, [match?.phase]);

  // Auto-advance simulation phases
  useEffect(() => {
    if (!match || !matchId) return;
    if (match.phase === 'simulating1' || match.phase === 'simulating2') {
      const timer = setTimeout(() => {
        advancePhase(matchId).catch(console.error);
      }, 8000); // 8s to view simulation results
      return () => clearTimeout(timer);
    }
  }, [match?.phase, matchId]);

  // Heartbeat — send immediately + every 5s
  useEffect(() => {
    if (!matchId || !user?.uid || !match || match.phase === 'results' || match.phase === 'finished') return;
    // Send immediately
    sendHeartbeat(matchId, user.uid).catch(() => {});
    const interval = setInterval(() => {
      sendHeartbeat(matchId, user.uid).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [matchId, user?.uid, match?.phase]);

  // Disconnect check — every 8s, 15s timeout
  useEffect(() => {
    if (!matchId || !user?.uid || !match || match.phase === 'results' || match.phase === 'finished') return;
    const interval = setInterval(async () => {
      try {
        const dc = await checkDisconnect(matchId, user.uid);
        if (dc) await claimDisconnectWin(matchId, user.uid);
      } catch { /* quota or network error, ignore */ }
    }, 8000);
    return () => clearInterval(interval);
  }, [matchId, user?.uid, match?.phase]);

  // Detect page exit/navigation — mark as disconnected
  useEffect(() => {
    if (!matchId || !user?.uid || !match || match.phase === 'results' || match.phase === 'finished') return;
    
    const handleBeforeUnload = (e) => {
      // Warn user about leaving during ranked match
      e.preventDefault();
      e.returnValue = '⚠️ Tienes una partida ranked en curso. Si sales, perderás por desconexión.';
      return e.returnValue;
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Returned — send heartbeat immediately
        sendHeartbeat(matchId, user.uid).catch(() => {});
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
    try {
      const config = { formation, tactic, morale: 75 };
      await submitRoundConfig(matchId, user.uid, config);
      setConfigSubmitted(true);
      
      // Try to advance phase after submitting (any player can trigger)
      setTimeout(() => advancePhase(matchId).catch(console.error), 2000);
    } catch (e) {
      console.error('Error submitting config:', e);
      alert('Error al enviar configuración. Inténtalo de nuevo.');
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
    dispatch({ type: 'CLEAR_RANKED_TEAM' });
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
                  {match.simulation1.table?.map((t, i) => (
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
            {(() => {
              const sim = match.phase === 'simulating1' ? match.simulation1 : match.simulation2;
              const isHalf = match.phase === 'simulating1';
              if (!sim?.table) return <p className="sim-wait">Los partidos se están disputando...</p>;
              
              const myTeamId = myData?.team;
              const rivalTeamId = rivalData?.team;
              const myPos = sim.table.findIndex(t => t.teamId === myTeamId) + 1;
              const rivalPos = sim.table.findIndex(t => t.teamId === rivalTeamId) + 1;
              
              // Get H2H and cup info from full sim (simulating2 only)
              const myKey = isP1 ? 'player1' : 'player2';
              const rivalKey = isP1 ? 'player2' : 'player1';
              const mySim = sim[myKey];
              const rivalSim = sim[rivalKey];
              
              return (
                <>
                  <div className="sim-standings">
                    <h3>{isHalf ? 'Clasificación provisional' : 'Clasificación final'}</h3>
                    <div className="mini-table">
                      {sim.table.map((t, i) => (
                        <div key={t.teamId} className={`table-row ${t.teamId === myTeamId ? 'me' : t.teamId === rivalTeamId ? 'rival' : ''}`}>
                          <span className="pos">{i + 1}</span>
                          <span className="name">{t.teamName}</span>
                          <span className="pts">{t.points}</span>
                          {!isHalf && <span className="gd">{t.goalDifference > 0 ? '+' : ''}{t.goalDifference}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Quick summary */}
                  <div className="sim-summary">
                    <div className="sim-summary-row">
                      <div className="sim-summary-card me">
                        <span className="summary-team">{myData?.displayName || 'TÚ'}</span>
                        <span className="summary-pos">📊 {myPos}º</span>
                        {mySim?.cupRound && <span className="summary-detail">🏆 Copa: {mySim.cupRound}</span>}
                        {mySim?.europeanRound && <span className="summary-detail">🌍 {mySim.europeanCompetition}: {mySim.europeanRound}</span>}
                        {mySim?.liga && <span className="summary-highlight">🏆 ¡Campeón!</span>}
                        {mySim?.copa && <span className="summary-highlight">🏆 ¡Copa!</span>}
                      </div>
                      <div className="sim-summary-card rival">
                        <span className="summary-team">{rivalData?.displayName || 'RIVAL'}</span>
                        <span className="summary-pos">📊 {rivalPos}º</span>
                        {rivalSim?.cupRound && <span className="summary-detail">🏆 Copa: {rivalSim.cupRound}</span>}
                        {rivalSim?.europeanRound && <span className="summary-detail">🌍 {rivalSim.europeanCompetition}: {rivalSim.europeanRound}</span>}
                        {rivalSim?.liga && <span className="summary-highlight">🏆 ¡Campeón!</span>}
                        {rivalSim?.copa && <span className="summary-highlight">🏆 ¡Copa!</span>}
                      </div>
                    </div>
                    
                    {/* H2H summary */}
                    {mySim?.h2hResults?.length > 0 && (
                      <div className="sim-h2h">
                        <span className="h2h-label">⚔️ H2H:</span>
                        {mySim.h2hResults.map((r, i) => (
                          <span key={i} className={`h2h-result ${r.goalsFor > r.goalsAgainst ? 'win' : r.goalsFor < r.goalsAgainst ? 'loss' : 'draw'}`}>
                            {r.goalsFor}-{r.goalsAgainst} {r.goalsFor > r.goalsAgainst ? 'V' : r.goalsFor < r.goalsAgainst ? 'D' : 'E'}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {myPos < rivalPos && <p className="sim-verdict win">📈 Vas por encima de tu rival</p>}
                    {myPos > rivalPos && <p className="sim-verdict loss">📉 Tu rival va por encima</p>}
                    {myPos === rivalPos && <p className="sim-verdict draw">🤝 Empatados en posición</p>}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ── RESULTS ── */}
        {match.phase === 'results' && (
          <RankedResultsModal match={match} onBackToLobby={handleBackToLobby} />
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
