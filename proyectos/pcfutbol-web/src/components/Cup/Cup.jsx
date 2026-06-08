import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { Award, Trophy, ChevronDown, ChevronUp, Shield, AlertTriangle } from 'lucide-react';
import TeamCrest from '../TeamCrest/TeamCrest';
import { usePreloadTeamCrests } from '../TeamCrest/teamCrestCache';
import './Cup.scss';

export default function Cup() {
  const { t } = useTranslation();
  const { state } = useGame();
  const bracket = state.cupCompetition;
  const [expandedRound, setExpandedRound] = useState(null);
  const rounds = useMemo(
    () => Array.isArray(bracket?.rounds) ? bracket.rounds : [],
    [bracket?.rounds]
  );
  const cupTeamIds = useMemo(() => {
    const ids = new Set();
    rounds.forEach((round) => {
      (Array.isArray(round?.matches) ? round.matches : []).forEach((match) => {
        if (match.homeTeam?.teamId) ids.add(match.homeTeam.teamId);
        if (match.awayTeam?.teamId) ids.add(match.awayTeam.teamId);
      });
    });
    return Array.from(ids);
  }, [rounds]);

  usePreloadTeamCrests(cupTeamIds, { limit: 96 });

  if (!bracket || rounds.length === 0) {
    return (
      <div className="cup">
        <div className="cup__empty">
          <Award size={48} />
          <p>{t('cup.noCupActive')}</p>
        </div>
      </div>
    );
  }

  const { config, currentRound, playerTeamId, playerEliminated, winner } = bracket;
  const safeCurrentRound = Math.min(Math.max(Number.isInteger(currentRound) ? currentRound : 0, 0), rounds.length - 1);

  // Encontrar en qué ronda fue eliminado el jugador
  let eliminationRound = null;
  if (playerEliminated) {
    for (let r = 0; r < rounds.length; r++) {
      const matches = Array.isArray(rounds[r]?.matches) ? rounds[r].matches : [];
      const match = matches.find(m =>
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
            <h2>{config?.name || t('cup.cup')}</h2>
            <span className="cup__subtitle">{t('cup.season')} {state.currentSeason || 1}</span>
          </div>
        </div>

        {/* Estado del jugador */}
        {winner && winner === playerTeamId && (
          <div className="cup__status cup__status--champion">
            <Trophy size={16} />
            <span>{t('cup.champion')}</span>
          </div>
        )}
        {winner && winner !== playerTeamId && (
          <div className="cup__status cup__status--finished">
            <Shield size={16} />
            <span>{t('cup.cupFinished')}</span>
          </div>
        )}
        {playerEliminated && !winner && eliminationRound !== null && (
          <div className="cup__status cup__status--eliminated">
            <AlertTriangle size={16} />
            <span>{t('cup.eliminatedIn')} {rounds[eliminationRound]?.name || `${t('cup.round')} ${eliminationRound + 1}`}</span>
          </div>
        )}
        {!playerEliminated && !winner && (
          <div className="cup__status cup__status--active">
            <Award size={16} />
            <span>{t('cup.inCompetition')} — {rounds[safeCurrentRound]?.name || t('cup.nextRound')}</span>
          </div>
        )}
      </div>

      {/* Bracket - Rondas */}
      <div className="cup__bracket">
        {rounds.map((round, roundIdx) => {
          const matches = Array.isArray(round?.matches) ? round.matches : [];
          const isCurrentRound = roundIdx === safeCurrentRound && !winner;
          const isFutureRound = roundIdx > safeCurrentRound && !winner;
          const hasMatches = matches.some(m => m.homeTeam || m.awayTeam);
          const allPlayed = matches.length > 0 && matches.every(m => m.played || m.bye);
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
                  <span className="cup__round-name">{round?.name || `${t('cup.round')} ${roundIdx + 1}`}</span>
                  <span className="cup__round-count">
                    {matches.filter(m => !m.bye).length} {t('cup.matches')}
                    {matches.filter(m => m.bye).length > 0 &&
                      ` · ${matches.filter(m => m.bye).length} ${t('cup.exempt')}`}
                  </span>
                </div>
                {isCurrentRound && <span className="cup__round-badge">{t('cup.current')}</span>}
                {showMatches ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {showMatches && hasMatches && (
                <div className="cup__matches">
                  {matches.map((match, matchIdx) => {
                    if (match.bye) {
                      return (
                        <div key={matchIdx} className={`cup__match cup__match--bye ${isPlayerTeam(match.homeTeam) ? 'cup__match--player' : ''}`}>
                          <div className="cup__match-team cup__match-team--home">
                            {match.homeTeam?.teamId && <TeamCrest teamId={match.homeTeam.teamId} size={20} />}
                            <span className={`team-name ${isPlayerTeam(match.homeTeam) ? 'is-player' : ''}`}>
                              {getTeamDisplayName(match.homeTeam)}
                            </span>
                          </div>
                          <div className="cup__match-result">
                            <span className="bye-tag">{t('cup.exempt')}</span>
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
                          {match.homeTeam?.teamId && <TeamCrest teamId={match.homeTeam.teamId} size={20} />}
                          <span className={`team-name ${homeIsPlayer ? 'is-player' : ''}`}>
                            {getTeamDisplayName(match.homeTeam)}
                          </span>
                        </div>
                        <div className="cup__match-result">
                          {match.played ? (
                            <span className={`score ${matchHasPlayer ? (playerWon ? 'win' : 'loss') : ''}`}>
                              {match.homeScore} - {match.awayScore}
                              {match.penalties && match.penaltiesDetail && (
                                <span className="pen">({match.penaltiesDetail.home}-{match.penaltiesDetail.away} pen.)</span>
                              )}
                              {match.penalties && !match.penaltiesDetail && <span className="pen">(P)</span>}
                            </span>
                          ) : (
                            <span className="vs">vs</span>
                          )}
                        </div>
                        <div className={`cup__match-team cup__match-team--away ${awayWon ? 'winner' : ''}`}>
                          {match.awayTeam?.teamId && <TeamCrest teamId={match.awayTeam.teamId} size={20} />}
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
            <span className="cup__winner-label">{t('cup.champion')}</span>
            <span className="cup__winner-name">
              {(() => {
                const finalMatches = Array.isArray(rounds[rounds.length - 1]?.matches) ? rounds[rounds.length - 1].matches : [];
                const finalMatch = finalMatches[0];
                return finalMatch?.homeTeam?.teamId === winner
                  ? finalMatch?.homeTeam?.teamName
                  : finalMatch?.awayTeam?.teamName || '???';
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
