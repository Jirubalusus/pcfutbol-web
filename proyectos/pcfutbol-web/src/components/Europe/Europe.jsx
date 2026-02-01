// ============================================================
// EUROPE — European Competitions UI Component
// ============================================================
// Shows Swiss league table, knockout brackets, prize money, etc.
// ============================================================

import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { COMPETITIONS } from '../../game/europeanCompetitions';
import { SA_COMPETITIONS } from '../../game/southAmericanCompetitions';
import { getPlayerCompetition, isTeamAlive } from '../../game/europeanSeason';
import { getPlayerSACompetition, isTeamAliveInSA } from '../../game/southAmericanSeason';
import { isSouthAmericanLeague } from '../../game/southAmericanCompetitions';
import { Trophy, Globe, Star, ChevronDown, ChevronUp, Award, Zap } from 'lucide-react';
import './Europe.scss';

export default function Europe() {
  const { state } = useGame();
  const [selectedComp, setSelectedComp] = useState(null);
  const [sortBy, setSortBy] = useState('points');
  const [sortDir, setSortDir] = useState('desc');

  const isInSA = isSouthAmericanLeague(state.playerLeagueId);
  
  // Use SA or European competitions depending on the player's league
  const european = isInSA ? state.saCompetitions : state.europeanCompetitions;
  
  // Find player's competition
  const playerComp = useMemo(() => {
    if (!european?.competitions) return null;
    if (isInSA) return getPlayerSACompetition(european, state.teamId);
    return getPlayerCompetition(european, state.teamId);
  }, [european, state.teamId, isInSA]);

  // Default to player's competition, or first available
  const activeCompId = selectedComp || playerComp?.competitionId || 
    (european?.competitions ? Object.keys(european.competitions).find(k => european.competitions[k]) : null);
  
  const activeComp = european?.competitions?.[activeCompId];

  if (!european || !european.initialized) {
    return (
      <div className="europe">
        <div className="europe__empty">
          <Globe size={48} strokeWidth={1.5} />
          <h2>Competiciones Europeas</h2>
          <p>No estás clasificado para competiciones europeas esta temporada.</p>
          <p className="europe__hint">Termina en los primeros puestos de tu liga para clasificarte.</p>
        </div>
      </div>
    );
  }

  // Is player's team in this competition?
  const playerInComp = activeComp?.teams?.some(t => t.teamId === state.teamId);
  const playerAlive = activeComp ? isTeamAlive(activeComp, state.teamId) : false;

  // Prize money for player's team
  const playerPrizeMoney = activeComp?.prizesMoney?.[state.teamId] || 0;

  // Sorted standings
  const sortedStandings = useMemo(() => {
    if (!activeComp?.standings) return [];
    const standings = [...activeComp.standings];
    
    standings.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name': aVal = a.teamName; bVal = b.teamName; break;
        case 'played': aVal = a.played; bVal = b.played; break;
        case 'won': aVal = a.won; bVal = b.won; break;
        case 'drawn': aVal = a.drawn; bVal = b.drawn; break;
        case 'lost': aVal = a.lost; bVal = b.lost; break;
        case 'gf': aVal = a.goalsFor; bVal = b.goalsFor; break;
        case 'ga': aVal = a.goalsAgainst; bVal = b.goalsAgainst; break;
        case 'gd': aVal = a.goalDifference; bVal = b.goalDifference; break;
        case 'points': 
        default:
          aVal = a.points; bVal = b.points; break;
      }
      if (sortBy === 'name') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return standings;
  }, [activeComp?.standings, sortBy, sortDir]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return null;
    return sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
  };

  const formatMoney = (amount) => {
    if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `€${(amount / 1_000).toFixed(0)}K`;
    return `€${amount}`;
  };

  const getPositionZone = (pos) => {
    if (pos <= 8) return 'direct';       // Direct to R16
    if (pos <= 24) return 'playoff';     // Playoffs
    return 'eliminated';                  // Out
  };

  const getPhaseLabel = (phase) => {
    const labels = {
      league: 'Fase de Liga',
      playoff: 'Playoffs',
      r16: 'Octavos de Final',
      qf: 'Cuartos de Final',
      sf: 'Semifinales',
      final: 'Final',
      completed: 'Competición Finalizada'
    };
    return labels[phase] || phase;
  };

  return (
    <div className="europe">
      {/* Competition Tabs */}
      <div className="europe__tabs">
        {Object.entries(COMPETITIONS).map(([compId, comp]) => {
          const compState = european.competitions[compId];
          if (!compState) return null;
          const isActive = activeCompId === compId;
          const isPlayerComp = playerComp?.competitionId === compId;
          
          return (
            <button
              key={compId}
              className={`europe__tab ${isActive ? 'active' : ''} ${isPlayerComp ? 'player' : ''}`}
              onClick={() => setSelectedComp(compId)}
            >
              <span className="europe__tab-icon">{comp.icon}</span>
              <span className="europe__tab-name">{comp.shortName}</span>
              {isPlayerComp && <Star size={12} className="europe__tab-star" />}
            </button>
          );
        })}
      </div>

      {!activeComp && (
        <div className="europe__empty">
          <p>Selecciona una competición</p>
        </div>
      )}

      {activeComp && (
        <div className="europe__content">
          {/* Header */}
          <div className="europe__header">
            <div className="europe__header-info">
              <h2>
                <span className="europe__comp-icon">{activeComp.config.icon}</span>
                {activeComp.config.name}
              </h2>
              <div className="europe__phase-badge">
                {getPhaseLabel(activeComp.phase)}
                {activeComp.phase === 'league' && activeComp.currentMatchday > 0 && (
                  <span> — Jornada {activeComp.currentMatchday}/8</span>
                )}
              </div>
            </div>
            
            {playerInComp && (
              <div className="europe__player-info">
                <div className="europe__prize">
                  <Award size={16} />
                  <span>Premios: {formatMoney(playerPrizeMoney)}</span>
                </div>
                {!playerAlive && activeComp.phase !== 'league' && (
                  <div className="europe__eliminated-badge">
                    <Zap size={14} />
                    <span>Eliminado</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Swiss League Table */}
          {(activeComp.phase === 'league' || sortedStandings.length > 0) && (
            <div className="europe__standings">
              <h3>Clasificación — Fase de Liga</h3>
              <div className="europe__table-wrapper">
                <table className="europe__table">
                  <thead>
                    <tr>
                      <th className="pos">#</th>
                      <th className="team" onClick={() => handleSort('name')}>
                        Equipo <SortIcon column="name" />
                      </th>
                      <th className="league-flag">Liga</th>
                      <th className="num" onClick={() => handleSort('played')}>
                        PJ <SortIcon column="played" />
                      </th>
                      <th className="num" onClick={() => handleSort('won')}>
                        G <SortIcon column="won" />
                      </th>
                      <th className="num" onClick={() => handleSort('drawn')}>
                        E <SortIcon column="drawn" />
                      </th>
                      <th className="num" onClick={() => handleSort('lost')}>
                        P <SortIcon column="lost" />
                      </th>
                      <th className="num" onClick={() => handleSort('gf')}>
                        GF <SortIcon column="gf" />
                      </th>
                      <th className="num" onClick={() => handleSort('ga')}>
                        GC <SortIcon column="ga" />
                      </th>
                      <th className="num" onClick={() => handleSort('gd')}>
                        DG <SortIcon column="gd" />
                      </th>
                      <th className="num pts" onClick={() => handleSort('points')}>
                        Pts <SortIcon column="points" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStandings.map((team, idx) => {
                      const pos = idx + 1;
                      const zone = getPositionZone(pos);
                      const isPlayer = team.teamId === state.teamId;
                      const leagueFlags = {
                        laliga: '🇪🇸',
                        segunda: '🇪🇸',
                        premierLeague: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
                        serieA: '🇮🇹',
                        bundesliga: '🇩🇪',
                        ligue1: '🇫🇷',
                        eredivisie: '🇳🇱',
                        primeiraLiga: '🇵🇹',
                        belgianPro: '🇧🇪',
                        superLig: '🇹🇷',
                        scottishPrem: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
                        austrianBundesliga: '🇦🇹',
                        greekSuperLeague: '🇬🇷',
                        swissSuperLeague: '🇨🇭',
                        danishSuperliga: '🇩🇰',
                        croatianLeague: '🇭🇷',
                        czechLeague: '🇨🇿'
                      };

                      return (
                        <tr 
                          key={team.teamId} 
                          className={`${zone} ${isPlayer ? 'is-player' : ''}`}
                        >
                          <td className="pos">
                            <span className={`pos-badge ${zone}`}>{pos}</span>
                          </td>
                          <td className="team">
                            {team.teamName || team.shortName}
                            {isPlayer && <Star size={10} className="player-star" />}
                          </td>
                          <td className="league-flag">{leagueFlags[team.league] || <Globe size={14} />}</td>
                          <td className="num">{team.played}</td>
                          <td className="num">{team.won}</td>
                          <td className="num">{team.drawn}</td>
                          <td className="num">{team.lost}</td>
                          <td className="num">{team.goalsFor}</td>
                          <td className="num">{team.goalsAgainst}</td>
                          <td className="num">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                          <td className="num pts">{team.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Zone legend */}
              <div className="europe__legend">
                <span className="legend-item direct">
                  <span className="dot"></span> 1-8: Octavos directos
                </span>
                <span className="legend-item playoff">
                  <span className="dot"></span> 9-24: Playoffs
                </span>
                <span className="legend-item eliminated">
                  <span className="dot"></span> 25-32: Eliminado
                </span>
              </div>
            </div>
          )}

          {/* Knockout Bracket */}
          {activeComp.phase !== 'league' && activeComp.phase !== 'completed' && (
            <div className="europe__knockout">
              <h3>Fase Eliminatoria — {getPhaseLabel(activeComp.phase)}</h3>
              {renderKnockoutPhase(activeComp, state.teamId)}
            </div>
          )}

          {/* Final Result */}
          {activeComp.phase === 'completed' && activeComp.finalResult && (
            <div className="europe__final-result">
              <Trophy size={32} />
              <h3>¡{activeComp.config.name} — Campeón!</h3>
              <p className="europe__winner-name">
                {activeComp.finalResult.winner?.teamName || 'Desconocido'}
              </p>
              <p className="europe__final-score">
                Final: {activeComp.finalResult.aggregate}
              </p>
            </div>
          )}

          {/* Recent Results */}
          {activeComp.results.length > 0 && (
            <div className="europe__results">
              <h3>Últimos Resultados</h3>
              <div className="europe__results-list">
                {activeComp.results.slice(-12).reverse().map((r, idx) => {
                  const homeTeam = activeComp.teams.find(t => t.teamId === r.homeTeamId);
                  const awayTeam = activeComp.teams.find(t => t.teamId === r.awayTeamId);
                  const isPlayerMatch = r.homeTeamId === state.teamId || r.awayTeamId === state.teamId;
                  
                  return (
                    <div key={idx} className={`europe__result-item ${isPlayerMatch ? 'player-match' : ''}`}>
                      <span className="matchday">J{r.matchday}</span>
                      <span className="home-team">{homeTeam?.teamName || homeTeam?.shortName || r.homeTeamId}</span>
                      <span className="score">{r.homeScore} - {r.awayScore}</span>
                      <span className="away-team">{awayTeam?.teamName || awayTeam?.shortName || r.awayTeamId}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Render knockout phase matchups
 */
function renderKnockoutPhase(compState, playerTeamId) {
  const phaseMatchups = {
    playoff: compState.playoffResults || compState.playoffMatchups || [],
    r16: compState.r16Results || compState.r16Matchups || [],
    qf: compState.qfResults || compState.qfMatchups || [],
    sf: compState.sfResults || compState.sfMatchups || [],
    final: compState.finalResult ? [compState.finalResult] : (compState.finalMatchup ? [compState.finalMatchup] : [])
  };

  const currentPhase = compState.phase;
  const phasesToShow = ['playoff', 'r16', 'qf', 'sf', 'final'].filter(p => 
    phaseMatchups[p].length > 0
  );

  if (phasesToShow.length === 0) {
    return <p className="europe__no-data">Pendiente de sorteo...</p>;
  }

  return (
    <div className="europe__bracket">
      {phasesToShow.map(phase => (
        <div key={phase} className="europe__bracket-round">
          <h4 className="europe__bracket-title">
            {phase === 'playoff' ? 'Playoffs' :
             phase === 'r16' ? 'Octavos' :
             phase === 'qf' ? 'Cuartos' :
             phase === 'sf' ? 'Semifinales' : 'Final'}
          </h4>
          <div className="europe__bracket-matchups">
            {phaseMatchups[phase].map((matchup, idx) => {
              const team1 = matchup.team1;
              const team2 = matchup.team2;
              const hasResult = matchup.winner != null;
              const isPlayerMatchup = team1?.teamId === playerTeamId || team2?.teamId === playerTeamId;

              return (
                <div key={idx} className={`europe__matchup ${isPlayerMatchup ? 'player' : ''} ${hasResult ? 'completed' : 'pending'}`}>
                  <div className={`europe__matchup-team ${matchup.winner?.teamId === team1?.teamId ? 'winner' : ''}`}>
                    <span className="team-name">{team1?.teamName || team1?.shortName || '?'}</span>
                    {matchup.leg1 && (
                      <span className="leg-score">{matchup.leg1.homeScore}-{matchup.leg1.awayScore}</span>
                    )}
                  </div>
                  <div className={`europe__matchup-team ${matchup.winner?.teamId === team2?.teamId ? 'winner' : ''}`}>
                    <span className="team-name">{team2?.teamName || team2?.shortName || '?'}</span>
                    {matchup.leg2 && (
                      <span className="leg-score">{matchup.leg2.homeScore}-{matchup.leg2.awayScore}</span>
                    )}
                  </div>
                  {hasResult && (
                    <div className="europe__matchup-agg">
                      Agg: {matchup.aggregate}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
