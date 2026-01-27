import { useState, useEffect } from 'react';
import { GameState, Match, MatchEvent } from '../types';
import { GameBrain } from '../core/GameBrain';

interface Props {
  gameState: GameState;
  gameBrain: GameBrain;
  match: Match;
  onFinish: () => void;
}

export function MatchDay({ gameState, gameBrain, match, onFinish }: Props) {
  const [currentMinute, setCurrentMinute] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedMatch, setSimulatedMatch] = useState<Match | null>(null);
  const [visibleEvents, setVisibleEvents] = useState<MatchEvent[]>([]);

  const homeTeam = gameState.teams[match.homeTeamId];
  const awayTeam = gameState.teams[match.awayTeamId];
  const isPlayerHome = match.homeTeamId === gameState.playerTeamId;
  const playerTeam = isPlayerHome ? homeTeam : awayTeam;
  const opponentTeam = isPlayerHome ? awayTeam : homeTeam;

  // Get lineups
  const homeLineup = homeTeam.lineup.length === 11 
    ? homeTeam.lineup.map(id => gameState.players[id]).filter(Boolean)
    : homeTeam.playerIds.slice(0, 11).map(id => gameState.players[id]).filter(Boolean);
  
  const awayLineup = awayTeam.lineup.length === 11
    ? awayTeam.lineup.map(id => gameState.players[id]).filter(Boolean)
    : awayTeam.playerIds.slice(0, 11).map(id => gameState.players[id]).filter(Boolean);

  function startSimulation() {
    setIsSimulating(true);
    
    // Simulate the match
    const result = gameBrain.simulateMatch(match);
    setSimulatedMatch(result);
    
    // Animate through the match
    let minute = 0;
    const events = result.events || [];
    
    const interval = setInterval(() => {
      minute += 1;
      setCurrentMinute(minute);
      
      // Show events up to current minute
      const eventsToShow = events.filter(e => e.minute <= minute);
      setVisibleEvents(eventsToShow);
      
      if (minute >= 90) {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 100); // 100ms per minute = ~9 seconds for full match
  }

  function skipToEnd() {
    if (!simulatedMatch) {
      const result = gameBrain.simulateMatch(match);
      setSimulatedMatch(result);
      setVisibleEvents(result.events || []);
    }
    setCurrentMinute(90);
    setIsSimulating(false);
  }

  const homeScore = simulatedMatch?.homeScore ?? 0;
  const awayScore = simulatedMatch?.awayScore ?? 0;
  const matchStats = simulatedMatch?.stats;

  return (
    <div className="match-day">
      <div className="match-header">
        <div className="team home">
          <h2>{homeTeam.name}</h2>
          <div className="score">{currentMinute > 0 ? homeScore : '-'}</div>
        </div>
        
        <div className="match-info">
          <div className="minute">{currentMinute > 0 ? `${currentMinute}'` : 'vs'}</div>
          <div className="competition">Jornada {match.matchday}</div>
        </div>
        
        <div className="team away">
          <h2>{awayTeam.name}</h2>
          <div className="score">{currentMinute > 0 ? awayScore : '-'}</div>
        </div>
      </div>

      {/* Pre-match */}
      {currentMinute === 0 && !isSimulating && (
        <div className="pre-match">
          <div className="lineups">
            <div className="lineup home">
              <h3>Alineación {homeTeam.shortName}</h3>
              <ul>
                {homeLineup.map(p => (
                  <li key={p.id}>
                    <span className="pos">{p.position}</span>
                    <span className="name">{p.name}</span>
                    <span className="rating">{p.overall}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lineup away">
              <h3>Alineación {awayTeam.shortName}</h3>
              <ul>
                {awayLineup.map(p => (
                  <li key={p.id}>
                    <span className="pos">{p.position}</span>
                    <span className="name">{p.name}</span>
                    <span className="rating">{p.overall}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="match-controls">
            <button className="play-btn" onClick={startSimulation}>
              ▶️ Simular partido
            </button>
            <button className="skip-btn" onClick={skipToEnd}>
              ⏭️ Saltar al resultado
            </button>
          </div>
        </div>
      )}

      {/* During match */}
      {(isSimulating || currentMinute > 0) && (
        <div className="match-live">
          {/* Progress bar */}
          <div className="progress-bar">
            <div className="progress" style={{ width: `${(currentMinute / 90) * 100}%` }} />
            <div className="markers">
              <span className="marker" style={{ left: '50%' }}>45'</span>
            </div>
          </div>

          {/* Events */}
          <div className="events-feed">
            <h3>Eventos</h3>
            {visibleEvents.length === 0 ? (
              <p className="no-events">Sin incidencias...</p>
            ) : (
              <ul>
                {visibleEvents.map((event, i) => {
                  const player = gameState.players[event.playerId];
                  const team = gameState.teams[event.teamId];
                  const isHome = event.teamId === match.homeTeamId;
                  
                  return (
                    <li key={i} className={`event ${event.type} ${isHome ? 'home' : 'away'}`}>
                      <span className="minute">{event.minute}'</span>
                      <span className="icon">{getEventIcon(event.type)}</span>
                      <span className="description">
                        {getEventDescription(event, player?.name, team?.shortName)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Live stats */}
          {matchStats && currentMinute >= 45 && (
            <div className="live-stats">
              <h3>Estadísticas</h3>
              <div className="stat-row">
                <span>{matchStats.possession[0]}%</span>
                <span className="label">Posesión</span>
                <span>{matchStats.possession[1]}%</span>
              </div>
              <div className="stat-row">
                <span>{matchStats.shots[0]}</span>
                <span className="label">Tiros</span>
                <span>{matchStats.shots[1]}</span>
              </div>
              <div className="stat-row">
                <span>{matchStats.shotsOnTarget[0]}</span>
                <span className="label">A puerta</span>
                <span>{matchStats.shotsOnTarget[1]}</span>
              </div>
              <div className="stat-row">
                <span>{matchStats.corners[0]}</span>
                <span className="label">Córners</span>
                <span>{matchStats.corners[1]}</span>
              </div>
              <div className="stat-row">
                <span>{matchStats.fouls[0]}</span>
                <span className="label">Faltas</span>
                <span>{matchStats.fouls[1]}</span>
              </div>
            </div>
          )}

          {/* Controls during simulation */}
          {isSimulating && (
            <div className="sim-controls">
              <button onClick={skipToEnd}>⏭️ Saltar al final</button>
            </div>
          )}
        </div>
      )}

      {/* Post-match */}
      {currentMinute >= 90 && !isSimulating && simulatedMatch && (
        <div className="post-match">
          <div className="final-result">
            <h2>Final del partido</h2>
            <div className="final-score">
              <span className={homeScore > awayScore ? 'winner' : ''}>{homeTeam.shortName}</span>
              <span className="score">{homeScore} - {awayScore}</span>
              <span className={awayScore > homeScore ? 'winner' : ''}>{awayTeam.shortName}</span>
            </div>
          </div>

          {/* Goal scorers */}
          <div className="scorers">
            <div className="home-scorers">
              {visibleEvents
                .filter(e => e.type === 'goal' && e.teamId === match.homeTeamId)
                .map((e, i) => (
                  <div key={i} className="scorer">
                    ⚽ {gameState.players[e.playerId]?.name} {e.minute}'
                  </div>
                ))}
            </div>
            <div className="away-scorers">
              {visibleEvents
                .filter(e => e.type === 'goal' && e.teamId === match.awayTeamId)
                .map((e, i) => (
                  <div key={i} className="scorer">
                    ⚽ {gameState.players[e.playerId]?.name} {e.minute}'
                  </div>
                ))}
            </div>
          </div>

          {/* Player ratings would go here */}
          
          <button className="continue-btn" onClick={onFinish}>
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
}

function getEventIcon(type: string): string {
  switch (type) {
    case 'goal': return '⚽';
    case 'assist': return '🅰️';
    case 'yellow': return '🟨';
    case 'red': return '🟥';
    case 'substitution': return '🔄';
    case 'injury': return '🤕';
    case 'penalty_scored': return '⚽🎯';
    case 'penalty_missed': return '❌🎯';
    case 'own_goal': return '⚽🔙';
    default: return '📋';
  }
}

function getEventDescription(event: MatchEvent, playerName?: string, teamName?: string): string {
  const name = playerName || 'Jugador';
  const team = teamName || '';
  
  switch (event.type) {
    case 'goal': return `¡GOOOL! ${name} marca para ${team}`;
    case 'assist': return `Asistencia de ${name}`;
    case 'yellow': return `Tarjeta amarilla para ${name}`;
    case 'red': return `¡Tarjeta roja! ${name} expulsado`;
    case 'substitution': return `Cambio en ${team}`;
    case 'injury': return `${name} se lesiona`;
    case 'penalty_scored': return `¡Penalti marcado por ${name}!`;
    case 'penalty_missed': return `Penalti fallado por ${name}`;
    case 'own_goal': return `Autogol de ${name}`;
    default: return event.type;
  }
}
