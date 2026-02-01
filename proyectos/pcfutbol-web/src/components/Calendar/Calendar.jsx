import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Plane,
  Clock,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { isEuropeanWeekDynamic, getPhaseForWeekCompat, isCupWeek as checkIsCupWeek, getCupRoundForWeek } from '../../game/europeanCompetitions';
import { getPlayerCompetition, isTeamAlive } from '../../game/europeanSeason';
import './Calendar.scss';

export default function Calendar() {
  const { state } = useGame();
  const [selectedWeek, setSelectedWeek] = useState(state.currentWeek || 1);

  // Player's European competition (if any)
  const playerEuropean = useMemo(() => {
    if (!state.europeanCompetitions) return null;
    return getPlayerCompetition(state.europeanCompetitions, state.teamId);
  }, [state.europeanCompetitions, state.teamId]);

  const playerAlive = useMemo(() => {
    if (!playerEuropean) return false;
    return isTeamAlive(playerEuropean.state, state.teamId);
  }, [playerEuropean, state.teamId]);

  const totalWeeks = useMemo(() => {
    // v2: If europeanCalendar exists, use its totalWeeks as the season length
    if (state.europeanCalendar) {
      return state.europeanCalendar.totalWeeks;
    }
    let max = state.fixtures?.length
      ? Math.max(...state.fixtures.map(f => f.week), 38)
      : 38;
    // Legacy: extend calendar to week 47 if player is alive in European competition
    if (playerEuropean && playerAlive) {
      max = Math.max(max, 47);
    }
    return max;
  }, [state.fixtures, state.europeanCalendar, playerEuropean, playerAlive]);
  
  const weekFixtures = useMemo(() => {
    return state.fixtures?.filter(f => f.week === selectedWeek) || [];
  }, [state.fixtures, selectedWeek]);

  // European match info for the selected week
  const europeanMatch = useMemo(() => {
    if (!playerEuropean) return null;
    const compState = playerEuropean.state;

    const phaseInfo = getPhaseForWeekCompat(selectedWeek, state.europeanCalendar);
    if (!phaseInfo) return null;

    // Don't show future European matches if eliminated
    if (selectedWeek > state.currentWeek && !playerAlive) return null;

    const { phase, matchday } = phaseInfo;

    // ── LEAGUE PHASE ──
    if (phase === 'league') {
      const fixtures = compState.matchdays?.[matchday - 1];
      if (!fixtures) return null;

      const playerFixture = fixtures.find(f =>
        f.homeTeamId === state.teamId || f.awayTeamId === state.teamId
      );
      if (!playerFixture) return null;

      const isHome = playerFixture.homeTeamId === state.teamId;
      const rivalId = isHome ? playerFixture.awayTeamId : playerFixture.homeTeamId;
      const rivalTeam = compState.teams.find(t => t.teamId === rivalId);

      const result = compState.results?.find(r =>
        r.matchday === matchday &&
        ((r.homeTeamId === state.teamId && r.awayTeamId === rivalId) ||
         (r.awayTeamId === state.teamId && r.homeTeamId === rivalId))
      );

      let playerScore = null, rivalScore = null;
      if (result) {
        const isHomeInResult = result.homeTeamId === state.teamId;
        playerScore = isHomeInResult ? result.homeScore : result.awayScore;
        rivalScore = isHomeInResult ? result.awayScore : result.homeScore;
      }

      return {
        icon: compState.config.icon,
        competitionName: compState.config.shortName,
        phaseLabel: `Jornada ${matchday}`,
        rivalName: rivalTeam?.teamName || rivalId,
        isHome,
        played: !!result,
        playerScore,
        rivalScore,
      };
    }

    // ── KNOCKOUT PHASES ──
    const phaseLabels = {
      playoff: 'Playoff',
      r16: 'Octavos de Final',
      qf: 'Cuartos de Final',
      sf: 'Semifinal',
      final: 'Final',
    };

    let matchup, result;

    if (phase === 'final') {
      matchup = compState.finalMatchup;
      result = compState.finalResult;
    } else {
      const matchups = compState[`${phase}Matchups`] || [];
      const results = compState[`${phase}Results`] || [];

      matchup = matchups.find(m =>
        m.team1?.teamId === state.teamId || m.team2?.teamId === state.teamId
      );
      result = results.find(r =>
        r.team1?.teamId === state.teamId || r.team2?.teamId === state.teamId
      );
    }

    if (!matchup) return null;

    const isTeam1 = matchup.team1?.teamId === state.teamId;
    const rival = isTeam1 ? matchup.team2 : matchup.team1;

    let label = phaseLabels[phase] || phase;
    if (phase !== 'final' && matchday) {
      label += matchday === 1 ? ' — Ida' : ' — Vuelta';
    }

    let playerScore = null, rivalScore = null;
    let played = false;

    if (result?.winner) {
      played = true;
      if (result.leg1) {
        const leg1HomeIsPlayer = result.leg1.homeTeamId === state.teamId;
        playerScore = leg1HomeIsPlayer ? result.leg1.homeScore : result.leg1.awayScore;
        rivalScore = leg1HomeIsPlayer ? result.leg1.awayScore : result.leg1.homeScore;
      } else if (result.aggregate) {
        const parts = result.aggregate.split('-').map(Number);
        playerScore = isTeam1 ? parts[0] : parts[1];
        rivalScore = isTeam1 ? parts[1] : parts[0];
      }
    }

    return {
      icon: compState.config.icon,
      competitionName: compState.config.shortName,
      phaseLabel: label,
      rivalName: rival?.teamName || rival?.teamId || '???',
      isHome: phase === 'final' ? true : (matchday === 1 ? isTeam1 : !isTeam1),
      played,
      playerScore,
      rivalScore,
    };
  }, [playerEuropean, playerAlive, selectedWeek, state.currentWeek, state.teamId, state.europeanCalendar]);

  // ── Helper functions ──

  const getTeamName = (teamId) => {
    const team = state.leagueTable?.find(t => t.teamId === teamId);
    return team?.teamName || teamId;
  };
  
  const getTeamShortName = (teamId) => {
    const teamData = state.leagueTeams?.find(t => t.id === teamId);
    if (teamData?.shortName) return teamData.shortName;
    const name = getTeamName(teamId);
    if (!name || name === teamId) return '???';
    const words = name.split(' ').filter(w => !['CF', 'FC', 'CD', 'UD', 'RC', 'SD', 'CA'].includes(w));
    const main = words[0] || name;
    return main.substring(0, 3).toUpperCase();
  };
  
  const isPlayerMatch = (fixture) => {
    return fixture.homeTeam === state.teamId || fixture.awayTeam === state.teamId;
  };
  
  const isPlayerHome = (fixture) => {
    return fixture.homeTeam === state.teamId;
  };
  
  const getPlayerResult = (fixture) => {
    if (!fixture.played || !isPlayerMatch(fixture)) return null;
    const isHome = isPlayerHome(fixture);
    const playerGoals = isHome ? fixture.homeScore : fixture.awayScore;
    const opponentGoals = isHome ? fixture.awayScore : fixture.homeScore;
    if (playerGoals > opponentGoals) return 'W';
    if (playerGoals < opponentGoals) return 'L';
    return 'D';
  };

  const getEuropeanResult = () => {
    if (!europeanMatch?.played) return null;
    if (europeanMatch.playerScore > europeanMatch.rivalScore) return 'W';
    if (europeanMatch.playerScore < europeanMatch.rivalScore) return 'L';
    return 'D';
  };

  // Check if a week should show the European indicator dot
  const weekHasEuropean = (week) => {
    if (!playerEuropean) return false;
    if (!isEuropeanWeekDynamic(week, state.europeanCalendar)) return false;
    if (week > state.currentWeek && !playerAlive) return false;
    return true;
  };

  // Check if a week is a cup week
  const weekHasCup = (week) => {
    return checkIsCupWeek(week, state.europeanCalendar) && state.cupCompetition;
  };

  // Cup match info for the selected week
  const cupMatch = useMemo(() => {
    if (!state.cupCompetition) return null;
    if (!checkIsCupWeek(selectedWeek, state.europeanCalendar)) return null;

    const cupRoundIdx = getCupRoundForWeek(selectedWeek, state.europeanCalendar);
    if (cupRoundIdx === null) return null;

    const bracket = state.cupCompetition;
    const round = bracket.rounds?.[cupRoundIdx];
    if (!round) return null;

    // Find player's match in this round
    const playerCupMatch = round.matches.find(m =>
      m.homeTeam?.teamId === state.teamId || m.awayTeam?.teamId === state.teamId
    );

    if (!playerCupMatch) {
      // Player eliminated or has a bye
      if (bracket.playerEliminated) return null;
      return null;
    }

    const isHome = playerCupMatch.homeTeam?.teamId === state.teamId;
    const rival = isHome ? playerCupMatch.awayTeam : playerCupMatch.homeTeam;

    if (playerCupMatch.bye) {
      return {
        icon: bracket.config?.icon || '🏆',
        cupName: bracket.config?.shortName || 'Copa',
        roundName: round.name,
        isBye: true,
        played: true
      };
    }

    return {
      icon: bracket.config?.icon || '🏆',
      cupName: bracket.config?.shortName || 'Copa',
      roundName: round.name,
      rivalName: rival?.teamName || '???',
      isHome,
      played: playerCupMatch.played,
      playerScore: playerCupMatch.played
        ? (isHome ? playerCupMatch.homeScore : playerCupMatch.awayScore)
        : null,
      rivalScore: playerCupMatch.played
        ? (isHome ? playerCupMatch.awayScore : playerCupMatch.homeScore)
        : null,
      winnerId: playerCupMatch.winnerId,
      penalties: playerCupMatch.penalties
    };
  }, [state.cupCompetition, selectedWeek, state.teamId, state.europeanCalendar]);

  // ── Render helpers ──

  const renderEuropeanMatch = () => {
    if (!europeanMatch) return null;

    const euroResult = getEuropeanResult();
    const playerTeamName = getTeamName(state.teamId);

    // Show in correct home/away order
    const homeName = europeanMatch.isHome ? playerTeamName : europeanMatch.rivalName;
    const awayName = europeanMatch.isHome ? europeanMatch.rivalName : playerTeamName;
    const homeScore = europeanMatch.played
      ? (europeanMatch.isHome ? europeanMatch.playerScore : europeanMatch.rivalScore)
      : null;
    const awayScore = europeanMatch.played
      ? (europeanMatch.isHome ? europeanMatch.rivalScore : europeanMatch.playerScore)
      : null;

    return (
      <div className="european-section">
        <div className="european-badge">
          <span className="euro-icon">{europeanMatch.icon}</span>
          <span className="euro-name">{europeanMatch.competitionName}</span>
          <span className="euro-sep">·</span>
          <span className="euro-phase">{europeanMatch.phaseLabel}</span>
        </div>
        <div className={`fixture-card is-player european-card ${europeanMatch.played ? 'played' : ''}`}>
          <div className={`team home ${europeanMatch.isHome ? 'is-you' : ''}`}>
            <span className="team-name">{homeName}</span>
          </div>

          <div className="match-center">
            {europeanMatch.played ? (
              <div className={`score result-${(euroResult || 'd').toLowerCase()}`}>
                <span className="home-score">{homeScore}</span>
                <span className="separator">-</span>
                <span className="away-score">{awayScore}</span>
              </div>
            ) : (
              <div className="vs-badge"><span>vs</span></div>
            )}
          </div>

          <div className={`team away ${!europeanMatch.isHome ? 'is-you' : ''}`}>
            <span className="team-name">{awayName}</span>
          </div>

          <div className="match-status">
            {europeanMatch.played ? (
              <span className={`status-dot ${euroResult === 'W' ? 'win' : euroResult === 'L' ? 'loss' : 'draw'}`} />
            ) : selectedWeek === state.currentWeek ? (
              <span className="status-badge pending"><Clock size={14} /></span>
            ) : selectedWeek < state.currentWeek ? (
              <span className="status-badge missed">!</span>
            ) : (
              <span className="status-badge upcoming"><Circle size={10} /></span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-v2">
      {/* Header */}
      <div className="calendar-v2__header">
        <h2>
          <CalendarDays size={24} />
          Calendario
        </h2>
        <span className="season-badge">Temporada {state.currentSeason || 1}</span>
      </div>
      
      {/* Navegación de jornada */}
      <div className="calendar-v2__nav">
        <button 
          className="nav-btn"
          onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
          disabled={selectedWeek <= 1}
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="nav-title">
          <span className="week-label">Jornada</span>
          <span className="week-number">{selectedWeek}</span>
        </div>
        
        <button 
          className="nav-btn"
          onClick={() => setSelectedWeek(Math.min(totalWeeks, selectedWeek + 1))}
          disabled={selectedWeek >= totalWeeks}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      
      {/* Selector de jornadas */}
      <div className="calendar-v2__weeks">
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(week => {
          const weekMatches = state.fixtures?.filter(f => f.week === week) || [];
          const allPlayed = weekMatches.length > 0 && weekMatches.every(f => f.played);
          const isCurrent = week === state.currentWeek;
          const hasEuropean = weekHasEuropean(week);
          const hasCup = weekHasCup(week);
          
          return (
            <button
              key={week}
              className={`week-btn ${week === selectedWeek ? 'selected' : ''} ${isCurrent ? 'current' : ''} ${allPlayed ? 'played' : ''} ${hasEuropean ? 'european' : ''} ${hasCup ? 'cup' : ''}`}
              onClick={() => setSelectedWeek(week)}
            >
              {week}
              {hasEuropean && <span className="euro-dot" />}
              {hasCup && !hasEuropean && <span className="cup-dot" />}
            </button>
          );
        })}
      </div>
      
      {/* Lista de partidos */}
      <div className="calendar-v2__fixtures">
        {weekFixtures.length === 0 && !europeanMatch && !cupMatch ? (
          <div className="no-fixtures">
            <Circle size={48} />
            <p>No hay partidos en esta jornada</p>
          </div>
        ) : (
          <>
            {/* Partido de copa del jugador */}
            {cupMatch && (
              <div className="cup-section">
                <div className="cup-badge">
                  <span className="cup-icon">{cupMatch.icon}</span>
                  <span className="cup-name">{cupMatch.cupName}</span>
                  <span className="euro-sep">·</span>
                  <span className="cup-phase">{cupMatch.roundName}</span>
                </div>
                {cupMatch.isBye ? (
                  <div className="fixture-card is-player cup-card played">
                    <div className="team home is-you">
                      <span className="team-name">{getTeamName(state.teamId)}</span>
                    </div>
                    <div className="match-center">
                      <div className="vs-badge"><span>Exento</span></div>
                    </div>
                    <div className="team away">
                      <span className="team-name">—</span>
                    </div>
                    <div className="match-status">
                      <span className="status-dot win" />
                    </div>
                  </div>
                ) : (
                  <div className={`fixture-card is-player cup-card ${cupMatch.played ? 'played' : ''}`}>
                    <div className={`team home ${cupMatch.isHome ? 'is-you' : ''}`}>
                      <span className="team-name">{cupMatch.isHome ? getTeamName(state.teamId) : cupMatch.rivalName}</span>
                    </div>
                    <div className="match-center">
                      {cupMatch.played ? (
                        <div className={`score ${cupMatch.winnerId === state.teamId ? 'result-w' : 'result-l'}`}>
                          <span className="home-score">
                            {cupMatch.isHome ? cupMatch.playerScore : cupMatch.rivalScore}
                          </span>
                          <span className="separator">-</span>
                          <span className="away-score">
                            {cupMatch.isHome ? cupMatch.rivalScore : cupMatch.playerScore}
                          </span>
                          {cupMatch.penalties && <span className="penalties-tag">(Pen)</span>}
                        </div>
                      ) : (
                        <div className="vs-badge"><span>vs</span></div>
                      )}
                    </div>
                    <div className={`team away ${!cupMatch.isHome ? 'is-you' : ''}`}>
                      <span className="team-name">{cupMatch.isHome ? cupMatch.rivalName : getTeamName(state.teamId)}</span>
                    </div>
                    <div className="match-status">
                      {cupMatch.played ? (
                        <span className={`status-dot ${cupMatch.winnerId === state.teamId ? 'win' : 'loss'}`} />
                      ) : selectedWeek === state.currentWeek ? (
                        <span className="status-badge pending"><Clock size={14} /></span>
                      ) : (
                        <span className="status-badge upcoming"><Circle size={10} /></span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Partido europeo del jugador */}
            {renderEuropeanMatch()}

            {/* Separador si hay partidos de liga + copa/europeo */}
            {weekFixtures.length > 0 && (europeanMatch || cupMatch) && (
              <div className="section-divider">
                <span>Liga</span>
              </div>
            )}

            {/* Partidos de liga */}
            {weekFixtures.map((fixture, idx) => {
              const playerMatch = isPlayerMatch(fixture);
              const playerResult = getPlayerResult(fixture);
              
              return (
                <div 
                  key={fixture.id || idx} 
                  className={`fixture-card ${playerMatch ? 'is-player' : ''} ${fixture.played ? 'played' : ''}`}
                >
                  <div className={`team home ${fixture.homeTeam === state.teamId ? 'is-you' : ''}`}>
                    <span className="team-name">{getTeamName(fixture.homeTeam)}</span>
                  </div>
                  
                  <div className="match-center">
                    {fixture.played ? (
                      <div className={`score ${playerResult ? `result-${playerResult.toLowerCase()}` : ''}`}>
                        <span className="home-score">{fixture.homeScore}</span>
                        <span className="separator">-</span>
                        <span className="away-score">{fixture.awayScore}</span>
                      </div>
                    ) : (
                      <div className="vs-badge">
                        <span>vs</span>
                      </div>
                    )}
                  </div>
                  
                  <div className={`team away ${fixture.awayTeam === state.teamId ? 'is-you' : ''}`}>
                    <span className="team-name">{getTeamName(fixture.awayTeam)}</span>
                  </div>
                  
                  <div className="match-status">
                    {fixture.played ? (
                      <span className={`status-dot ${playerResult === 'W' ? 'win' : playerResult === 'L' ? 'loss' : 'draw'}`}></span>
                    ) : selectedWeek === state.currentWeek ? (
                      <span className="status-badge pending">
                        <Clock size={14} />
                      </span>
                    ) : selectedWeek < state.currentWeek ? (
                      <span className="status-badge missed">!</span>
                    ) : (
                      <span className="status-badge upcoming">
                        <Circle size={10} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
