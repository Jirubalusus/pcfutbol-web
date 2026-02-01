import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Award, Trophy, ChevronDown, ChevronUp, Shield, AlertTriangle } from 'lucide-react';
import { getCupRoundName } from '../../game/cupSystem';
import './Cup.scss';

export default function Cup() {
  const { state } = useGame();
  const bracket = state.cupCompetition;
  const [expandedRound, setExpandedRound] = useState(null);

  if (!bracket) {
    return (
      <div className="cup">
        <div className="cup__empty">
          <Award size={48} />
          <p>No hay copa activa esta temporada</p>
        </div>
      </div>
    );
  }

  const { config, rounds, currentRound, playerTeamId, playerEliminated, winner } = bracket;
  const totalRounds = rounds.length;

  // Encontrar en qué ronda fue eliminado el jugador
  let eliminationRound = null;
  if (playerEliminated) {
    for (let r = 0; r < rounds.length; r++) {
      const match = rounds[r].matches.find(m =>
        (m.homeTeam?.teamId === playerTeamId || m.awayTeam?.teamId === playerTeamId) &&
        m.played && m.winnerId !== playerTeamId && !m.bye
      );
      if (match) {
        eliminationRound = r;
        break;
      }
    }
  }

  const toggleRound = (idx) => {
    setExpandedRound(expandedRound === idx ? null : idx);
  };

  const getTeamDisplayName = (team) => {
    if (!team) return '—';
    return team.shortName || team.teamName || '???';
  };

  const isPlayerTeam = (team) => {
    return team?.teamId === playerTeamId;
  };

  return (
    <div className="cup">
      {/* Header */}
      <div className="cup__header">
        <div className="cup__title">
          <span className="cup__icon">{config?.icon || '🏆'}</span>
          <div>
            <h2>{config?.name || 'Copa'}</h2>
            <span className="cup__subtitle">Temporada {state.currentSeason || 1}</span>
          </div>
        </div>

        {/* Estado del jugador */}
        {winner && winner === playerTeamId && (
          <div className="cup__status cup__status--champion">
            <Trophy size={16} />
            <span>¡Campeón!</span>
          </div>
        )}
        {winner && winner !== playerTeamId && (
          <div className="cup__status cup__status--finished">
            <Shield size={16} />
            <span>Copa finalizada</span>
          </div>
        )}
        {playerEliminated && !winner && eliminationRound !== null && (
          <div className="cup__status cup__status--eliminated">
            <AlertTriangle size={16} />
            <span>Eliminado en {rounds[eliminationRound]?.name || `Ronda ${eliminationRound + 1}`}</span>
          </div>
        )}
        {!playerEliminated && !winner && (
          <div className="cup__status cup__status--active">
            <Award size={16} />
            <span>En competición — {rounds[currentRound]?.name || 'Próxima ronda'}</span>
          </div>
        )}
      </div>

      {/* Bracket - Rondas */}
      <div className="cup__bracket">
        {rounds.map((round, roundIdx) => {
          const isCurrentRound = roundIdx === currentRound && !winner;
          const isFutureRound = roundIdx > currentRound && !winner;
          const hasMatches = round.matches.some(m => m.homeTeam || m.awayTeam);
          const allPlayed = round.matches.every(m => m.played || m.bye);
          const isExpanded = expandedRound === roundIdx;

          // En mobile: rondas son colapsables
          // Mostrar expandido: ronda actual, o la que el usuario eligió
          const showMatches = isExpanded || (isCurrentRound && expandedRound === null);

          return (
            <div 
              key={roundIdx} 
              className={`cup__round ${isCurrentRound ? 'cup__round--current' : ''} ${allPlayed ? 'cup__round--played' : ''} ${isFutureRound ? 'cup__round--future' : ''}`}
            >
              <button 
                className="cup__round-header"
                onClick={() => toggleRound(roundIdx)}
              >
                <div className="cup__round-info">
                  <span className="cup__round-name">{round.name}</span>
                  <span className="cup__round-count">
                    {round.matches.filter(m => !m.bye).length} partidos
                    {round.matches.filter(m => m.bye).length > 0 && 
                      ` · ${round.matches.filter(m => m.bye).length} exentos`}
                  </span>
                </div>
                {isCurrentRound && <span className="cup__round-badge">Actual</span>}
                {showMatches ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {showMatches && hasMatches && (
                <div className="cup__matches">
                  {round.matches.map((match, matchIdx) => {
                    if (match.bye) {
                      return (
                        <div key={matchIdx} className={`cup__match cup__match--bye ${isPlayerTeam(match.homeTeam) ? 'cup__match--player' : ''}`}>
                          <div className="cup__match-team cup__match-team--home">
                            <span className={`team-name ${isPlayerTeam(match.homeTeam) ? 'is-player' : ''}`}>
                              {getTeamDisplayName(match.homeTeam)}
                            </span>
                          </div>
                          <div className="cup__match-result">
                            <span className="bye-tag">Exento</span>
                          </div>
                          <div className="cup__match-team cup__match-team--away">
                            <span className="team-name">—</span>
                          </div>
                        </div>
                      );
                    }

                    if (!match.homeTeam && !match.awayTeam) {
                      return (
                        <div key={matchIdx} className="cup__match cup__match--empty">
                          <div className="cup__match-team"><span className="team-name">???</span></div>
                          <div className="cup__match-result"><span className="vs">vs</span></div>
                          <div className="cup__match-team"><span className="team-name">???</span></div>
                        </div>
                      );
                    }

                    const homeIsPlayer = isPlayerTeam(match.homeTeam);
                    const awayIsPlayer = isPlayerTeam(match.awayTeam);
                    const matchHasPlayer = homeIsPlayer || awayIsPlayer;
                    const playerWon = match.winnerId === playerTeamId;
                    const homeWon = match.winnerId === match.homeTeam?.teamId;
                    const awayWon = match.winnerId === match.awayTeam?.teamId;

                    return (
                      <div key={matchIdx} className={`cup__match ${matchHasPlayer ? 'cup__match--player' : ''} ${match.played ? 'cup__match--played' : ''}`}>
                        <div className={`cup__match-team cup__match-team--home ${homeWon ? 'winner' : ''}`}>
                          <span className={`team-name ${homeIsPlayer ? 'is-player' : ''}`}>
                            {getTeamDisplayName(match.homeTeam)}
                          </span>
                        </div>
                        <div className="cup__match-result">
                          {match.played ? (
                            <span className={`score ${matchHasPlayer ? (playerWon ? 'win' : 'loss') : ''}`}>
                              {match.homeScore} - {match.awayScore}
                              {match.penalties && <span className="pen">(P)</span>}
                            </span>
                          ) : (
                            <span className="vs">vs</span>
                          )}
                        </div>
                        <div className={`cup__match-team cup__match-team--away ${awayWon ? 'winner' : ''}`}>
                          <span className={`team-name ${awayIsPlayer ? 'is-player' : ''}`}>
                            {getTeamDisplayName(match.awayTeam)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ganador */}
      {winner && (
        <div className="cup__winner">
          <Trophy size={32} />
          <div className="cup__winner-info">
            <span className="cup__winner-label">Campeón</span>
            <span className="cup__winner-name">
              {rounds[rounds.length - 1]?.matches[0]?.homeTeam?.teamId === winner
                ? rounds[rounds.length - 1]?.matches[0]?.homeTeam?.teamName
                : rounds[rounds.length - 1]?.matches[0]?.awayTeam?.teamName || '???'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
