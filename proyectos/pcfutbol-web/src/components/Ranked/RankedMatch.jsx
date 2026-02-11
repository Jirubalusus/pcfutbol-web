import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getLaLigaTeams, getPremierTeams, getSerieATeams, getBundesligaTeams,
  getLigue1Teams, getSegundaTeams, getEredivisieTeams, getPrimeiraLigaTeams,
  getChampionshipTeams, getSuperLigTeams,
} from '../../data/teamsFirestore';
import {
  listenToMatch, selectTeam, advancePhase,
  submitRoundResult, finishMatch, reportDisconnect,
} from '../../firebase/rankedService';
// Match simulation is done inline with simplified logic
import { Clock, Shield, Swords, Trophy, XCircle, Loader2, ChevronDown } from 'lucide-react';
import './RankedMatch.scss';

const PHASE_LABELS = {
  team_selection: 'Selección de Equipo',
  round1: 'Ida - Elige Táctica',
  simulating1: 'Simulando Ida...',
  round2: 'Vuelta - Elige Táctica',
  simulating2: 'Simulando Vuelta...',
  results: 'Resultado Final',
};

// Build a flat team list from all loaded leagues
function getAllTeamsFlat() {
  const leagues = [
    { fn: getLaLigaTeams, league: 'La Liga' },
    { fn: getPremierTeams, league: 'Premier League' },
    { fn: getSerieATeams, league: 'Serie A' },
    { fn: getBundesligaTeams, league: 'Bundesliga' },
    { fn: getLigue1Teams, league: 'Ligue 1' },
    { fn: getSegundaTeams, league: 'La Liga 2' },
    { fn: getEredivisieTeams, league: 'Eredivisie' },
    { fn: getPrimeiraLigaTeams, league: 'Liga Portugal' },
    { fn: getChampionshipTeams, league: 'Championship' },
    { fn: getSuperLigTeams, league: 'Süper Lig' },
  ];
  const teams = [];
  for (const { fn, league } of leagues) {
    try {
      const t = fn();
      if (Array.isArray(t)) {
        for (const team of t) {
          if (team?.name) {
            const avgOvr = team.players?.length > 0
              ? Math.round(team.players.reduce((s, p) => s + (p.overall || 60), 0) / team.players.length)
              : 70;
            teams.push({
              id: team.id || team.name,
              name: team.name,
              overall: team.overall || avgOvr,
              league,
              players: team.players,
            });
          }
        }
      }
    } catch (e) { /* league not loaded */ }
  }
  return teams;
}

export default function RankedMatch({ matchId, userId, onMatchEnd }) {
  const { t } = useTranslation();

  const [match, setMatch] = useState(null);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamFilter, setTeamFilter] = useState('');
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const timerRef = useRef(null);
  const unsubRef = useRef(null);
  const hasAdvancedRef = useRef(false);

  // Determine if I'm player1 or player2
  const playerKey = useMemo(() => {
    if (!match) return null;
    return match.player1?.userId === userId ? 'player1' : 'player2';
  }, [match, userId]);

  const opponentKey = playerKey === 'player1' ? 'player2' : 'player1';
  const myData = match?.[playerKey];
  const opponentData = match?.[opponentKey];

  // Subscribe to match
  useEffect(() => {
    unsubRef.current = listenToMatch(matchId, (data) => {
      if (!data) {
        setError('La partida ya no existe');
        return;
      }
      setMatch(data);
      hasAdvancedRef.current = false;
    });

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [matchId]);

  // Timer countdown
  useEffect(() => {
    if (!match?.timer?.phaseStart) return;

    const updateTimer = () => {
      const start = match.timer.phaseStart?.toMillis?.()
        || match.timer.phaseStart?.seconds * 1000
        || Date.now();
      const duration = (match.timer.phaseDuration || 60) * 1000;
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setTimeLeft(remaining);

      // Auto-advance when timer expires (only player1 does this to avoid conflicts)
      if (remaining === 0 && playerKey === 'player1' && !hasAdvancedRef.current) {
        hasAdvancedRef.current = true;
        handleTimerExpired();
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    return () => clearInterval(timerRef.current);
  }, [match?.timer, match?.phase, playerKey]);

  const handleTimerExpired = useCallback(async () => {
    if (!match) return;
    const phase = match.phase;

    try {
      if (phase === 'team_selection') {
        // Auto-select random teams if not chosen
        if (!match.player1?.ready || !match.player2?.ready) {
          // Just advance - players without teams get random ones
          await advancePhase(matchId, 'round1');
        }
      } else if (phase === 'round1') {
        await handleSimulation(1);
      } else if (phase === 'simulating1') {
        await advancePhase(matchId, 'round2');
      } else if (phase === 'round2') {
        await handleSimulation(2);
      } else if (phase === 'simulating2') {
        await advancePhase(matchId, 'results');
      } else if (phase === 'results') {
        await handleFinish();
      }
    } catch (err) {
      console.error('Timer expire error:', err);
    }
  }, [match, matchId]);

  // Get team list for picker
  const allTeamsList = useMemo(() => getAllTeamsFlat(), []);
  
  const teamList = useMemo(() => {
    let teams = allTeamsList;

    if (teamFilter) {
      const filter = teamFilter.toLowerCase();
      teams = teams.filter(t =>
        t.name.toLowerCase().includes(filter) ||
        t.league.toLowerCase().includes(filter)
      );
    }

    // Sort by overall descending
    return [...teams].sort((a, b) => b.overall - a.overall);
  }, [allTeamsList, teamFilter]);

  // Handle team selection
  const handleSelectTeam = useCallback(async (teamId) => {
    if (!match || myData?.ready) return;
    setSelectedTeamId(teamId);
    setShowTeamPicker(false);

    const team = allTeamsList.find(t => t.id === teamId);
    if (!team) return;

    try {
      await selectTeam(matchId, playerKey, {
        id: teamId,
        name: team.name,
        overall: team.overall || 70,
      });
    } catch (err) {
      setError(err.message);
      setSelectedTeamId(null);
    }
  }, [match, matchId, playerKey, myData, allTeams]);

  // Both players ready → advance (player1 triggers)
  useEffect(() => {
    if (!match || match.phase !== 'team_selection') return;
    if (match.player1?.ready && match.player2?.ready && playerKey === 'player1') {
      advancePhase(matchId, 'round1').catch(console.error);
    }
  }, [match?.player1?.ready, match?.player2?.ready, match?.phase, playerKey, matchId]);

  // Handle match simulation
  const handleSimulation = useCallback(async (round) => {
    if (!match) return;

    const p1Team = match.player1?.team;
    const p2Team = match.player2?.team;
    if (!p1Team || !p2Team) return;

    // Build simplified team data for simulation
    const homeTeam = {
      name: round === 1 ? p1Team.name : p2Team.name,
      overall: round === 1 ? p1Team.overall : p2Team.overall,
      players: generateSimPlayers(round === 1 ? p1Team.overall : p2Team.overall),
    };
    const awayTeam = {
      name: round === 1 ? p2Team.name : p1Team.name,
      overall: round === 1 ? p2Team.overall : p1Team.overall,
      players: generateSimPlayers(round === 1 ? p2Team.overall : p1Team.overall),
    };

    // Simple simulation based on overall
    const result = simulateQuickMatch(homeTeam.overall, awayTeam.overall);
    setSimResult({ round, ...result });

    const p1Score = round === 1 ? result.homeGoals : result.awayGoals;
    const p2Score = round === 1 ? result.awayGoals : result.homeGoals;

    try {
      await submitRoundResult(matchId, round, p1Score, p2Score);
      const nextPhase = round === 1 ? 'simulating1' : 'simulating2';
      await advancePhase(matchId, nextPhase);
    } catch (err) {
      setError(err.message);
    }
  }, [match, matchId]);

  // Trigger simulation when entering round phase (player1 only)
  useEffect(() => {
    if (!match || playerKey !== 'player1') return;
    if (match.phase === 'round1' && !hasAdvancedRef.current) {
      hasAdvancedRef.current = true;
      // Small delay for UX
      setTimeout(() => handleSimulation(1), 2000);
    } else if (match.phase === 'round2' && !hasAdvancedRef.current) {
      hasAdvancedRef.current = true;
      setTimeout(() => handleSimulation(2), 2000);
    } else if (match.phase === 'simulating1' && timeLeft === 0 && !hasAdvancedRef.current) {
      hasAdvancedRef.current = true;
      advancePhase(matchId, 'round2').catch(console.error);
    } else if (match.phase === 'simulating2' && timeLeft === 0 && !hasAdvancedRef.current) {
      hasAdvancedRef.current = true;
      advancePhase(matchId, 'results').catch(console.error);
    }
  }, [match?.phase, playerKey, timeLeft]);

  const handleFinish = useCallback(async () => {
    if (!match) return;

    const s = match.scores;
    const p1Total = (s.player1?.[0] || 0) + (s.player1?.[1] || 0);
    const p2Total = (s.player2?.[0] || 0) + (s.player2?.[1] || 0);

    const p1Id = match.player1.userId;
    const p2Id = match.player2.userId;

    if (p1Total > p2Total) {
      await finishMatch(matchId, p1Id, p2Id, false);
    } else if (p2Total > p1Total) {
      await finishMatch(matchId, p2Id, p1Id, false);
    } else {
      await finishMatch(matchId, p1Id, p2Id, true);
    }
  }, [match, matchId]);

  // Results phase auto-finish
  useEffect(() => {
    if (match?.phase === 'results' && match?.status === 'finished') {
      // Show results for a bit, then go back
      const timer = setTimeout(() => onMatchEnd(), 8000);
      return () => clearTimeout(timer);
    }
    if (match?.status === 'abandoned') {
      setTimeout(() => onMatchEnd(), 3000);
    }
  }, [match?.phase, match?.status, onMatchEnd]);

  // Auto-finish on results phase if player1
  useEffect(() => {
    if (match?.phase === 'results' && match?.status === 'active' && playerKey === 'player1' && !hasAdvancedRef.current) {
      hasAdvancedRef.current = true;
      handleFinish().catch(console.error);
    }
  }, [match?.phase, match?.status, playerKey]);

  if (!match) {
    return (
      <div className="ranked-match ranked-match--loading">
        <Loader2 className="spin" size={48} />
        <p>Conectando a la partida...</p>
      </div>
    );
  }

  if (match.status === 'abandoned') {
    return (
      <div className="ranked-match ranked-match--abandoned">
        <XCircle size={64} className="ranked-match__icon-error" />
        <h2>Partida Abandonada</h2>
        <p>Tu oponente se ha desconectado</p>
        <button className="ranked-match__btn" onClick={onMatchEnd}>Volver al Lobby</button>
      </div>
    );
  }

  const phase = match.phase;
  const timerDanger = timeLeft <= 10;
  const timerWarn = timeLeft <= 20 && timeLeft > 10;

  return (
    <div className="ranked-match">
      {/* Timer bar */}
      <div className={`ranked-match__timer ${timerDanger ? 'danger' : timerWarn ? 'warn' : ''}`}>
        <Clock size={18} />
        <span className="ranked-match__timer-value">{timeLeft}s</span>
        <span className="ranked-match__phase-label">{PHASE_LABELS[phase] || phase}</span>
      </div>

      {/* Error */}
      {error && (
        <div className="ranked-match__error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Scoreboard */}
      <div className="ranked-match__scoreboard">
        <div className="ranked-match__player ranked-match__player--left">
          <div className="ranked-match__player-name">{match.player1?.displayName || 'Player 1'}</div>
          <div className="ranked-match__team-badge">
            {match.player1?.team?.name || '?'}
          </div>
        </div>
        <div className="ranked-match__vs">
          <div className="ranked-match__score-display">
            {match.scores?.player1?.filter(s => s !== null).map((s, i) => (
              <span key={i}>{s}</span>
            )).reduce((acc, cur, i) => i === 0 ? [cur] : [...acc, <small key={`sep${i}`}>,</small>, cur], []) || '-'}
          </div>
          <span className="ranked-match__vs-text">VS</span>
          <div className="ranked-match__score-display">
            {match.scores?.player2?.filter(s => s !== null).map((s, i) => (
              <span key={i}>{s}</span>
            )).reduce((acc, cur, i) => i === 0 ? [cur] : [...acc, <small key={`sep${i}`}>,</small>, cur], []) || '-'}
          </div>
        </div>
        <div className="ranked-match__player ranked-match__player--right">
          <div className="ranked-match__player-name">{match.player2?.displayName || 'Player 2'}</div>
          <div className="ranked-match__team-badge">
            {match.player2?.team?.name || '?'}
          </div>
        </div>
      </div>

      {/* Phase content */}
      <div className="ranked-match__content">
        {phase === 'team_selection' && (
          <div className="ranked-match__team-selection">
            {myData?.ready ? (
              <div className="ranked-match__waiting">
                <Loader2 className="spin" size={32} />
                <p>Has elegido <strong>{myData.team?.name}</strong></p>
                <p className="ranked-match__sub">Esperando al oponente...</p>
              </div>
            ) : (
              <>
                <h3>Elige tu equipo</h3>
                <div className="ranked-match__team-search">
                  <input
                    type="text"
                    placeholder="Buscar equipo..."
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="ranked-match__team-list">
                  {teamList.slice(0, 50).map((team) => (
                    <button
                      key={team.id}
                      className={`ranked-match__team-item ${selectedTeamId === team.id ? 'selected' : ''}`}
                      onClick={() => handleSelectTeam(team.id)}
                    >
                      <span className="ranked-match__team-name">{team.name}</span>
                      <span className="ranked-match__team-ovr">{team.overall}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {(phase === 'round1' || phase === 'round2') && (
          <div className="ranked-match__simulating">
            <Swords size={48} className="ranked-match__sim-icon" />
            <h3>{phase === 'round1' ? 'Partido de Ida' : 'Partido de Vuelta'}</h3>
            <p className="ranked-match__sim-teams">
              {phase === 'round1'
                ? `${match.player1?.team?.name || '?'} vs ${match.player2?.team?.name || '?'}`
                : `${match.player2?.team?.name || '?'} vs ${match.player1?.team?.name || '?'}`
              }
            </p>
            <Loader2 className="spin" size={32} />
            <p>Simulando partido...</p>
          </div>
        )}

        {(phase === 'simulating1' || phase === 'simulating2') && (
          <div className="ranked-match__sim-result">
            <h3>⚽ Resultado {phase === 'simulating1' ? 'Ida' : 'Vuelta'}</h3>
            <div className="ranked-match__result-display">
              <span>{match.scores?.player1?.[phase === 'simulating1' ? 0 : 1] ?? '-'}</span>
              <span className="ranked-match__result-sep">-</span>
              <span>{match.scores?.player2?.[phase === 'simulating1' ? 0 : 1] ?? '-'}</span>
            </div>
          </div>
        )}

        {phase === 'results' && (
          <div className="ranked-match__results">
            <Trophy size={56} className="ranked-match__trophy" />
            <h2>Resultado Final</h2>
            
            <div className="ranked-match__final-scores">
              <div className="ranked-match__final-row">
                <span>{match.player1?.team?.name}</span>
                <span className="ranked-match__final-agg">
                  {(match.scores?.player1?.[0] || 0) + (match.scores?.player1?.[1] || 0)}
                </span>
                <small>({match.scores?.player1?.[0] ?? 0} + {match.scores?.player1?.[1] ?? 0})</small>
              </div>
              <div className="ranked-match__final-row">
                <span>{match.player2?.team?.name}</span>
                <span className="ranked-match__final-agg">
                  {(match.scores?.player2?.[0] || 0) + (match.scores?.player2?.[1] || 0)}
                </span>
                <small>({match.scores?.player2?.[0] ?? 0} + {match.scores?.player2?.[1] ?? 0})</small>
              </div>
            </div>

            {match.status === 'finished' && (
              <div className="ranked-match__winner">
                {match.isDraw ? '🤝 Empate' :
                  match.winnerId === userId ? '🎉 ¡Has Ganado!' : '😢 Has Perdido'}
              </div>
            )}

            <button className="ranked-match__btn" onClick={onMatchEnd}>
              Volver al Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper: quick match simulation based on overall ratings
function simulateQuickMatch(homeOverall, awayOverall) {
  const diff = homeOverall - awayOverall;
  const homeBias = 0.15; // Home advantage
  const homeStrength = homeOverall + diff * 0.3 + homeBias * 10;
  const awayStrength = awayOverall - diff * 0.3;

  const avgGoals = 2.7;
  const homeExpected = avgGoals * (homeStrength / (homeStrength + awayStrength));
  const awayExpected = avgGoals * (awayStrength / (homeStrength + awayStrength));

  const homeGoals = poissonRandom(Math.max(0.3, homeExpected));
  const awayGoals = poissonRandom(Math.max(0.2, awayExpected));

  return { homeGoals, awayGoals };
}

function poissonRandom(lambda) {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function generateSimPlayers(overall) {
  // Generate 11 dummy players for simulation
  const positions = ['GK', 'CB', 'CB', 'RB', 'LB', 'CM', 'CM', 'CM', 'RW', 'LW', 'ST'];
  return positions.map((pos, i) => ({
    name: `Player ${i + 1}`,
    position: pos,
    overall: overall + Math.floor(Math.random() * 10) - 5,
  }));
}
