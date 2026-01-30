import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Medal,
  Star,
  Calendar,
  Users,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Plane,
  Home,
  Swords,
  Sparkles,
  Zap,
  Globe
} from 'lucide-react';
import {
  getSeasonResult,
  calculateSeasonRewards,
  generatePreseasonOptions,
  getCompetitionName,
  getEuropeanBonus,
  EUROPEAN_SPOTS
} from '../../game/seasonManager';
import { qualifyTeamsForEurope } from '../../game/europeanCompetitions';
import { initializeEuropeanCompetitions } from '../../game/europeanSeason';
import { initializeLeague } from '../../game/leagueEngine';
import { initializeNewSeasonWithPromotions, getLeagueName, getLeagueTable } from '../../game/multiLeagueEngine';
import { generateSeasonObjectives } from '../../game/objectivesEngine';
import {
  generatePlayoffBracket,
  simulatePlayoffMatch,
  advancePlayoffBracket,
  simulateFullPlayoff,
  isTeamInPlayoff,
  getNextPlayoffMatch,
  getPlayoffMatchSummary
} from '../../game/playoffEngine';
import { getSegundaTeams, getLaLigaTeams } from '../../data/teamsFirestore';
import './SeasonEnd.scss';

export default function SeasonEnd({ allTeams, onComplete }) {
  const { state, dispatch } = useGame();
  const playerLeagueId = state.playerLeagueId || 'laliga';
  
  // Determinar si hay playoffs pendientes
  const segundaTable = useMemo(() => {
    if (playerLeagueId === 'segunda') return state.leagueTable;
    return state.otherLeagues?.segunda?.table || [];
  }, [state.leagueTable, state.otherLeagues, playerLeagueId]);
  
  const playerInPlayoff = useMemo(() => {
    if (playerLeagueId !== 'segunda') return false;
    const pos = state.leagueTable.findIndex(t => t.teamId === state.teamId) + 1;
    return pos >= 3 && pos <= 6;
  }, [state.leagueTable, state.teamId, playerLeagueId]);
  
  // Estado inicial: si el jugador está en playoff, empezar ahí
  const [phase, setPhase] = useState(playerInPlayoff ? 'playoff' : 'summary');
  const [selectedPreseason, setSelectedPreseason] = useState(null);
  const [playoffBracket, setPlayoffBracket] = useState(null);
  const [playoffMatchResult, setPlayoffMatchResult] = useState(null);
  const [playerEliminated, setPlayerEliminated] = useState(false);
  
  // Inicializar playoff
  useEffect(() => {
    if (segundaTable.length > 0 && !playoffBracket) {
      const allTeamsData = [...getLaLigaTeams(), ...getSegundaTeams(), ...allTeams];
      // Deduplicar
      const uniqueTeams = [];
      const seen = new Set();
      allTeamsData.forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); uniqueTeams.push(t); }});
      
      if (playerInPlayoff) {
        // Generar bracket sin simular (el jugador jugará los partidos)
        const bracket = generatePlayoffBracket(segundaTable, uniqueTeams);
        setPlayoffBracket(bracket);
      } else {
        // Auto-simular todo el playoff
        const bracket = simulateFullPlayoff(segundaTable, uniqueTeams);
        setPlayoffBracket(bracket);
      }
    }
  }, [segundaTable, playerInPlayoff]);
  
  // Obtener resultado de temporada
  const seasonResult = useMemo(() => {
    return getSeasonResult(state.leagueTable, state.teamId, playerLeagueId);
  }, [state.leagueTable, state.teamId, playerLeagueId]);
  
  // Calcular recompensas de objetivos
  const objectiveRewards = useMemo(() => {
    return calculateSeasonRewards(state.seasonObjectives || [], seasonResult);
  }, [state.seasonObjectives, seasonResult]);
  
  // Generar opciones de pretemporada
  const preseasonOptions = useMemo(() => {
    return generatePreseasonOptions(allTeams, state.team, playerLeagueId);
  }, [allTeams, state.team, playerLeagueId]);
  
  // Bonus europeo
  const europeanBonus = getEuropeanBonus(seasonResult.qualification);
  const competitionName = getCompetitionName(seasonResult.qualification);
  
  // Coste salarial anual (salario semanal × 52)
  const totalSalaryCost = useMemo(() => {
    const players = state.team?.players || [];
    return players.reduce((sum, p) => sum + (p.salary || 0), 0) * 52;
  }, [state.team?.players]);
  
  // Si el jugador ganó el playoff, actualizar su seasonResult
  const playerWonPlayoff = playoffBracket?.winner === state.teamId;
  if (playerWonPlayoff) {
    seasonResult.promotion = true;
    seasonResult.playoff = false;
  }
  
  const formatMoney = (amount) => {
    if (Math.abs(amount) >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    return `€${(amount / 1000).toFixed(0)}K`;
  };
  
  const handleSelectPreseason = (option) => {
    setSelectedPreseason(option);
  };
  
  // Handler para simular un partido de playoff del jugador
  const handlePlayoffMatch = () => {
    if (!playoffBracket) return;
    
    const nextMatch = getNextPlayoffMatch(state.teamId, playoffBracket);
    if (!nextMatch) return;
    
    const result = simulatePlayoffMatch(nextMatch.homeTeam, nextMatch.awayTeam);
    const updatedBracket = advancePlayoffBracket(playoffBracket, nextMatch.id, result);
    
    setPlayoffMatchResult(result);
    setPlayoffBracket(updatedBracket);
    
    // Comprobar si el jugador fue eliminado
    if (result.winnerId !== state.teamId) {
      setPlayerEliminated(true);
      // Auto-simular el resto del playoff si queda la final
      if (updatedBracket.phase === 'final') {
        const allTeamsData = [...getLaLigaTeams(), ...getSegundaTeams(), ...allTeams];
        const uniqueTeams = [];
        const seen = new Set();
        allTeamsData.forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); uniqueTeams.push(t); }});
        
        const finalResult = simulatePlayoffMatch(updatedBracket.final.homeTeam, updatedBracket.final.awayTeam);
        const completedBracket = advancePlayoffBracket(updatedBracket, 'final', finalResult);
        setPlayoffBracket(completedBracket);
      }
    }
  };
  
  const handlePlayoffContinue = () => {
    setPlayoffMatchResult(null);
    
    if (playoffBracket.phase === 'completed' || playerEliminated) {
      setPhase('summary');
    }
    // Si el jugador sigue vivo y queda la final, se queda en 'playoff'
  };
  
  const handleConfirm = () => {
    if (!selectedPreseason) return;
    
    // Calcular total de dinero (ingresos - salarios)
    const totalMoney = objectiveRewards.netResult + europeanBonus - totalSalaryCost;
    
    // Procesar promoción/relegación y generar nuevas ligas (con playoff resuelto)
    const newSeasonData = initializeNewSeasonWithPromotions(state, state.teamId, playoffBracket);
    
    // Generar nuevos objetivos para la nueva liga del jugador
    const newPlayerLeagueId = newSeasonData.newPlayerLeagueId || state.playerLeagueId || 'laliga';
    const newObjectives = generateSeasonObjectives(state.team, newPlayerLeagueId, newSeasonData.playerLeague.table);
    
    // Mensaje si hubo cambio de liga
    if (newSeasonData.changes.relegated.length > 0 || newSeasonData.changes.promoted.length > 0 || newSeasonData.changes.playoffWinner) {
      // Mensaje de descensos
      if (newSeasonData.changes.relegated.length > 0) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: Date.now(),
            type: 'relegation',
            title: '📉 Descensos a Segunda',
            content: `Descienden: ${newSeasonData.changes.relegated.join(', ')}`,
            date: `Fin Temporada ${state.currentSeason}`
          }
        });
      }
      
      // Mensaje de ascensos directos
      if (newSeasonData.changes.promoted.length > 0) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: Date.now() + 1,
            type: 'promotion',
            title: '📈 Ascensos directos a La Liga',
            content: `Ascienden: ${newSeasonData.changes.promoted.join(', ')}`,
            date: `Fin Temporada ${state.currentSeason}`
          }
        });
      }
      
      // Mensaje de ascenso por playoff
      if (newSeasonData.changes.playoffWinner) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: Date.now() + 2,
            type: 'promotion',
            title: '🏆 Ascenso por Playoff',
            content: `${newSeasonData.changes.playoffWinner} gana el playoff y asciende a La Liga`,
            date: `Fin Temporada ${state.currentSeason}`
          }
        });
      }
      
      // Si el jugador cambió de liga
      if (newSeasonData.newPlayerLeagueId !== (state.playerLeagueId || 'laliga')) {
        const isPromotion = newSeasonData.newPlayerLeagueId === 'laliga';
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: Date.now() + 2,
            type: isPromotion ? 'promotion' : 'relegation',
            title: isPromotion ? '🎉 ¡ASCENSO!' : '😔 Descenso',
            content: isPromotion 
              ? `¡${state.team.name} jugará en La Liga la próxima temporada!`
              : `${state.team.name} jugará en Segunda División la próxima temporada.`,
            date: `Fin Temporada ${state.currentSeason}`
          }
        });
      }
    }
    
    // Dispatch para iniciar nueva temporada
    dispatch({
      type: 'START_NEW_SEASON',
      payload: {
        seasonResult,
        objectiveRewards,
        europeanBonus,
        preseasonMatches: selectedPreseason.matches,
        moneyChange: totalMoney,
        newFixtures: newSeasonData.playerLeague.fixtures,
        newTable: newSeasonData.playerLeague.table,
        newObjectives,
        newPlayerLeagueId: newSeasonData.newPlayerLeagueId
      }
    });
    
    // Actualizar otras ligas
    dispatch({
      type: 'SET_OTHER_LEAGUES',
      payload: newSeasonData.otherLeagues
    });
    
    // Actualizar liga del jugador si cambió
    if (newSeasonData.newPlayerLeagueId !== (state.playerLeagueId || 'laliga')) {
      dispatch({
        type: 'SET_PLAYER_LEAGUE',
        payload: newSeasonData.newPlayerLeagueId
      });
    }
    
    // Update player's group ID for group leagues
    if (newSeasonData.playerLeague?.playerGroup) {
      dispatch({
        type: 'SET_PLAYER_GROUP',
        payload: newSeasonData.playerLeague.playerGroup
      });
    } else if (newSeasonData.playerLeague && !newSeasonData.playerLeague.isGroupLeague) {
      dispatch({ type: 'SET_PLAYER_GROUP', payload: null });
    }
    
    // ============================================================
    // EUROPEAN COMPETITIONS — Initialize for next season
    // ============================================================
    try {
      // Build league standings from all leagues (current season final tables)
      const leagueStandings = {};
      const allTeamsMap = {};

      // Player's league
      const playerTable = newSeasonData.playerLeague?.table || state.leagueTable || [];
      const newPlayerLeague = newSeasonData.newPlayerLeagueId || playerLeagueId;
      if (playerTable.length > 0) {
        leagueStandings[newPlayerLeague] = playerTable;
      }
      
      // Other leagues
      const otherLeagues = newSeasonData.otherLeagues || state.otherLeagues || {};
      for (const [leagueId, leagueData] of Object.entries(otherLeagues)) {
        if (leagueData?.table?.length > 0 && leagueId !== newPlayerLeague) {
          leagueStandings[leagueId] = leagueData.table;
        }
      }

      // Build allTeamsMap from all available teams
      allTeams.forEach(t => {
        allTeamsMap[t.id || t.teamId] = t;
      });

      // Qualify teams for European competitions
      const qualifiedTeams = qualifyTeamsForEurope(leagueStandings, allTeamsMap);
      
      // Check if enough teams to form competitions
      const totalQualified = qualifiedTeams.championsLeague.length + 
                             qualifiedTeams.europaLeague.length + 
                             qualifiedTeams.conferenceleague.length;

      if (totalQualified >= 12) {
        // Pad each competition to 32 teams with best remaining teams
        const usedTeamIds = new Set();
        Object.values(qualifiedTeams).forEach(teams => 
          teams.forEach(t => usedTeamIds.add(t.teamId))
        );

        // Get remaining top teams to fill competitions
        const remainingTeams = allTeams
          .filter(t => !usedTeamIds.has(t.id || t.teamId))
          .sort((a, b) => (b.reputation || 0) - (a.reputation || 0));

        // Pad each competition
        for (const compId of ['championsLeague', 'europaLeague', 'conferenceleague']) {
          const needed = 32 - qualifiedTeams[compId].length;
          if (needed > 0) {
            const fillers = remainingTeams.splice(0, needed);
            qualifiedTeams[compId].push(...fillers.map(t => ({
              teamId: t.id || t.teamId,
              teamName: t.name || t.teamName,
              shortName: t.shortName || '',
              league: t.league || 'unknown',
              leaguePosition: 0,
              reputation: t.reputation || 60,
              overall: t.overall || 65,
              players: t.players || [],
              ...t
            })));
          }
        }

        const europeanState = initializeEuropeanCompetitions(qualifiedTeams);
        dispatch({
          type: 'INIT_EUROPEAN_COMPETITIONS',
          payload: europeanState
        });

        // Notify player of European qualification
        const playerQualComp = ['championsLeague', 'europaLeague', 'conferenceleague']
          .find(c => qualifiedTeams[c].some(t => (t.teamId || t.id) === state.teamId));

        if (playerQualComp) {
          const compNames = {
            championsLeague: 'Champions League',
            europaLeague: 'Europa League',
            conferenceleague: 'Conference League'
          };
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now() + 100,
              type: 'european',
              title: `🏆 ¡Competición Europea!`,
              content: `Tu equipo jugará la ${compNames[playerQualComp]} la próxima temporada.`,
              date: `Inicio Temporada ${state.currentSeason + 1}`
            }
          });
        }
      }
    } catch (err) {
      console.error('Error initializing European competitions:', err);
    }
    
    onComplete();
  };
  
  // === FASE PLAYOFF (si el jugador está en playoff de Segunda) ===
  if (phase === 'playoff' && playoffBracket) {
    const nextMatch = getNextPlayoffMatch(state.teamId, playoffBracket);
    const isPlayerHome = nextMatch?.homeTeam?.teamId === state.teamId;
    const opponentEntry = nextMatch ? (isPlayerHome ? nextMatch.awayTeam : nextMatch.homeTeam) : null;
    
    return (
      <div className="season-end">
        <div className="season-end__modal">
          <div className="modal-header">
            <Zap size={32} className="header-icon playoff-icon" />
            <div>
              <h1>Playoff de Ascenso</h1>
              <p>{playoffBracket.phase === 'semifinals' ? 'Semifinales' : '¡FINAL!'}</p>
            </div>
          </div>
          
          {/* Bracket visual */}
          <div className="playoff-bracket">
            <h3>📋 Cuadro de Playoff</h3>
            <div className="bracket-matches">
              {playoffBracket.semifinals.map((semi, idx) => (
                <div key={idx} className={`bracket-match ${semi.played ? 'played' : ''}`}>
                  <span className="bracket-label">{semi.label}</span>
                  <div className="bracket-teams">
                    <span className={`team ${semi.result?.winnerId === semi.homeTeam.teamId ? 'winner' : ''} ${semi.homeTeam.teamId === state.teamId ? 'player-team' : ''}`}>
                      {semi.homeTeam.teamName} ({semi.homeTeam.seed}º)
                    </span>
                    {semi.played && (
                      <span className="score">
                        {semi.result.homeScore} - {semi.result.awayScore}
                        {semi.result.extraTime && !semi.result.penalties && ' (Prór.)'}
                        {semi.result.penalties && ` (Pen: ${semi.result.penalties.homeGoals}-${semi.result.penalties.awayGoals})`}
                      </span>
                    )}
                    <span className={`team ${semi.result?.winnerId === semi.awayTeam.teamId ? 'winner' : ''} ${semi.awayTeam.teamId === state.teamId ? 'player-team' : ''}`}>
                      {semi.awayTeam.teamName} ({semi.awayTeam.seed}º)
                    </span>
                  </div>
                </div>
              ))}
              
              {playoffBracket.final.homeTeam && (
                <div className={`bracket-match final-match ${playoffBracket.final.played ? 'played' : ''}`}>
                  <span className="bracket-label">🏆 Final</span>
                  <div className="bracket-teams">
                    <span className={`team ${playoffBracket.final.result?.winnerId === playoffBracket.final.homeTeam.teamId ? 'winner' : ''} ${playoffBracket.final.homeTeam.teamId === state.teamId ? 'player-team' : ''}`}>
                      {playoffBracket.final.homeTeam.teamName}
                    </span>
                    {playoffBracket.final.played && (
                      <span className="score">
                        {playoffBracket.final.result.homeScore} - {playoffBracket.final.result.awayScore}
                        {playoffBracket.final.result.extraTime && !playoffBracket.final.result.penalties && ' (Prór.)'}
                        {playoffBracket.final.result.penalties && ` (Pen: ${playoffBracket.final.result.homeGoals}-${playoffBracket.final.result.awayGoals})`}
                      </span>
                    )}
                    <span className={`team ${playoffBracket.final.result?.winnerId === playoffBracket.final.awayTeam?.teamId ? 'winner' : ''} ${playoffBracket.final.awayTeam?.teamId === state.teamId ? 'player-team' : ''}`}>
                      {playoffBracket.final.awayTeam?.teamName || '?'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Resultado del último partido */}
          {playoffMatchResult && (
            <div className={`playoff-result ${playoffMatchResult.winnerId === state.teamId ? 'victory' : 'defeat'}`}>
              <h3>{playoffMatchResult.winnerId === state.teamId ? '🎉 ¡Victoria!' : '😔 Derrota'}</h3>
              <p className="result-score">
                {playoffMatchResult.homeTeamName} {playoffMatchResult.homeScore} - {playoffMatchResult.awayScore} {playoffMatchResult.awayTeamName}
              </p>
              {playoffMatchResult.extraTime && !playoffMatchResult.penalties && (
                <p className="result-extra">Prórroga: {playoffMatchResult.finalHomeScore} - {playoffMatchResult.finalAwayScore}</p>
              )}
              {playoffMatchResult.penalties && (
                <p className="result-extra">Penaltis: {playoffMatchResult.penalties.homeGoals} - {playoffMatchResult.penalties.awayGoals}</p>
              )}
              
              {playoffMatchResult.winnerId === state.teamId && playoffBracket.phase === 'completed' && (
                <p className="promotion-msg">🏆 ¡{state.team?.name} ASCIENDE A LA LIGA!</p>
              )}
              {playerEliminated && (
                <p className="elimination-msg">El equipo ha sido eliminado del playoff</p>
              )}
              
              <button className="btn-continue" onClick={handlePlayoffContinue}>
                Continuar <ChevronRight size={20} />
              </button>
            </div>
          )}
          
          {/* Botón para jugar el siguiente partido */}
          {!playoffMatchResult && nextMatch && !playerEliminated && (
            <div className="playoff-next-match">
              <h3>⚡ Próximo partido</h3>
              <p className="next-match-info">
                {nextMatch.label}: <strong>{nextMatch.homeTeam.teamName}</strong> vs <strong>{nextMatch.awayTeam.teamName}</strong>
              </p>
              <p className="next-match-venue">
                {isPlayerHome ? '🏠 Jugamos en casa' : '✈️ Jugamos fuera'}
              </p>
              <button className="btn-continue btn-play-match" onClick={handlePlayoffMatch}>
                ⚽ Jugar partido <ChevronRight size={20} />
              </button>
            </div>
          )}
          
          {/* Si ya no queda partido (eliminado o playoff completado) */}
          {!playoffMatchResult && !nextMatch && (
            <div className="playoff-completed">
              {playoffBracket.phase === 'completed' && (
                <>
                  <h3>🏆 Playoff completado</h3>
                  {playoffBracket.winner === state.teamId ? (
                    <p className="promotion-msg">¡{state.team?.name} ASCIENDE A LA LIGA!</p>
                  ) : (
                    <p>Ganador del playoff: {playoffBracket.final?.result?.winnerName}</p>
                  )}
                </>
              )}
              <button className="btn-continue" onClick={() => setPhase('summary')}>
                Ver resumen de temporada <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // === Fase 1: Resumen de temporada ===
  if (phase === 'summary') {
    return (
      <div className="season-end">
        <div className="season-end__modal">
          <div className="modal-header">
            <Trophy size={32} className="header-icon" />
            <div>
              <h1>Fin de Temporada {state.currentSeason}</h1>
              <p>{state.team?.name}</p>
            </div>
          </div>
          
          {/* Posición Final */}
          <div className="final-position">
            <div className="position-badge">
              <span className="position-number">{seasonResult.position}º</span>
              <span className="position-label">Posición Final</span>
            </div>
            
            <div className="season-stats">
              <div className="stat">
                <span className="value">{seasonResult.points}</span>
                <span className="label">Puntos</span>
              </div>
              <div className="stat">
                <span className="value">{seasonResult.wins}</span>
                <span className="label">Victorias</span>
              </div>
              <div className="stat">
                <span className="value">{seasonResult.draws}</span>
                <span className="label">Empates</span>
              </div>
              <div className="stat">
                <span className="value">{seasonResult.losses}</span>
                <span className="label">Derrotas</span>
              </div>
              <div className="stat">
                <span className={`value ${seasonResult.goalDifference >= 0 ? 'positive' : 'negative'}`}>
                  {seasonResult.goalDifference > 0 ? '+' : ''}{seasonResult.goalDifference}
                </span>
                <span className="label">Dif. Goles</span>
              </div>
            </div>
          </div>
          
          {/* Clasificación Europea */}
          {competitionName && (
            <div className="european-qualification">
              <Star size={24} className="star-icon" />
              <div className="qualification-info">
                <h3>¡Clasificado para {competitionName}!</h3>
                <p>Bonus de clasificación: <strong>{formatMoney(europeanBonus)}</strong></p>
              </div>
            </div>
          )}
          
          {/* European competition prizes earned this season */}
          {state.europeanCompetitions?.competitions && (() => {
            let totalEuropeanPrize = 0;
            let euroCompName = null;
            for (const [cId, cState] of Object.entries(state.europeanCompetitions.competitions)) {
              if (!cState) continue;
              const prize = cState.prizesMoney?.[state.teamId] || 0;
              if (prize > 0) {
                totalEuropeanPrize += prize;
                euroCompName = cState.config?.shortName || cId;
              }
            }
            if (totalEuropeanPrize > 0) {
              return (
                <div className="european-qualification" style={{ borderColor: 'rgba(46,125,50,0.3)' }}>
                  <Globe size={24} className="star-icon" style={{ color: '#66bb6a' }} />
                  <div className="qualification-info">
                    <h3>Premios {euroCompName}</h3>
                    <p>Ingresos por competición europea: <strong>{formatMoney(totalEuropeanPrize)}</strong></p>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Ascenso por playoff */}
          {playerWonPlayoff && (
            <div className="european-qualification promotion-celebration">
              <Trophy size={24} className="star-icon" />
              <div className="qualification-info">
                <h3>🎉 ¡ASCENSO POR PLAYOFF!</h3>
                <p>{state.team?.name} jugará en La Liga la próxima temporada</p>
              </div>
            </div>
          )}
          
          {/* Resultados del playoff de Segunda (si no es el jugador) */}
          {playoffBracket && playoffBracket.phase === 'completed' && !playerInPlayoff && (
            <div className="playoff-summary-box">
              <h3>🏆 Playoff de Ascenso (Segunda)</h3>
              <div className="playoff-summary-results">
                {playoffBracket.semifinals.map((semi, idx) => (
                  <p key={idx}>{getPlayoffMatchSummary(semi)}</p>
                ))}
                <p className="final-result"><strong>{getPlayoffMatchSummary(playoffBracket.final)}</strong></p>
                <p className="playoff-winner">Asciende: <strong>{playoffBracket.final.result?.winnerName}</strong></p>
              </div>
            </div>
          )}
          
          {/* Descenso */}
          {seasonResult.relegation && (
            <div className="relegation-warning">
              <TrendingDown size={24} />
              <div>
                <h3>Descenso de categoría</h3>
                <p>El equipo ha descendido a la división inferior</p>
              </div>
            </div>
          )}
          
          {/* Objetivos */}
          <div className="objectives-summary">
            <h3><Target size={18} /> Objetivos de Temporada</h3>
            
            <div className="objectives-list">
              {objectiveRewards.objectiveResults.map((obj, idx) => (
                <div key={idx} className={`objective-item objective-item--${obj.status}`}>
                  {obj.status === 'completed' ? (
                    <CheckCircle2 size={18} className="icon-completed" />
                  ) : (
                    <XCircle size={18} className="icon-failed" />
                  )}
                  <span className="name">{obj.name}</span>
                  <span className={`amount ${obj.status === 'completed' ? 'positive' : 'negative'}`}>
                    {obj.status === 'completed' ? '+' : ''}{formatMoney(obj.amount || 0)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="objectives-total">
              <span>Balance de objetivos:</span>
              <span className={objectiveRewards.netResult >= 0 ? 'positive' : 'negative'}>
                {objectiveRewards.netResult >= 0 ? '+' : ''}{formatMoney(objectiveRewards.netResult)}
              </span>
            </div>
          </div>
          
          {/* Total */}
          <div className="season-total">
            <div className="total-row">
              <span>Objetivos</span>
              <span className={objectiveRewards.netResult >= 0 ? 'positive' : 'negative'}>
                {objectiveRewards.netResult >= 0 ? '+' : ''}{formatMoney(objectiveRewards.netResult)}
              </span>
            </div>
            {europeanBonus > 0 && (
              <div className="total-row">
                <span>Bonus europeo</span>
                <span className="positive">+{formatMoney(europeanBonus)}</span>
              </div>
            )}
            {(state.stadium?.accumulatedTicketIncome ?? 0) > 0 && (
              <div className="total-row">
                <span>🎟️ Entradas (acumulado)</span>
                <span className="positive">+{formatMoney(state.stadium?.accumulatedTicketIncome ?? 0)}</span>
              </div>
            )}
            <div className="total-row">
              <span>Masa salarial</span>
              <span className="negative">-{formatMoney(totalSalaryCost)}</span>
            </div>
            <div className="total-row total-row--final">
              <span>Balance final</span>
              <span className={(objectiveRewards.netResult + europeanBonus + (state.stadium?.accumulatedTicketIncome ?? 0) - totalSalaryCost) >= 0 ? 'positive' : 'negative'}>
                {(objectiveRewards.netResult + europeanBonus + (state.stadium?.accumulatedTicketIncome ?? 0) - totalSalaryCost) >= 0 ? '+' : ''}
                {formatMoney(objectiveRewards.netResult + europeanBonus + (state.stadium?.accumulatedTicketIncome ?? 0) - totalSalaryCost)}
              </span>
            </div>
          </div>
          
          <button className="btn-continue" onClick={() => setPhase('preseason')}>
            Continuar a Pretemporada
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }
  
  // Fase 2: Selección de pretemporada
  return (
    <div className="season-end">
      <div className="season-end__modal season-end__modal--preseason">
        <div className="modal-header">
          <Calendar size={32} className="header-icon" />
          <div>
            <h1>Pretemporada {state.currentSeason + 1}</h1>
            <p>Elige tu plan de preparación</p>
          </div>
        </div>
        
        <p className="preseason-intro">
          Selecciona uno de los siguientes paquetes de amistosos. 
          El último partido siempre será en casa como presentación del equipo.
        </p>
        
        <div className="preseason-options">
          {preseasonOptions.map(option => (
            <div 
              key={option.id}
              className={`preseason-card ${selectedPreseason?.id === option.id ? 'selected' : ''}`}
              onClick={() => handleSelectPreseason(option)}
            >
              <div className="card-header">
                {option.id === 'prestige' && <Plane size={24} />}
                {option.id === 'balanced' && <Swords size={24} />}
                {option.id === 'regional' && <Home size={24} />}
                <h3>{option.name}</h3>
              </div>
              
              <p className="card-description">{option.description}</p>
              
              <div className="card-details">
                <span className={`difficulty difficulty--${option.difficulty}`}>
                  Dificultad: {option.difficulty === 'high' ? 'Alta' : option.difficulty === 'medium' ? 'Media' : 'Baja'}
                </span>
                <span className="earnings">
                  Ingresos potenciales: {option.potentialEarnings}
                </span>
              </div>
              
              <div className="matches-preview">
                <h4>Rivales:</h4>
                <ul>
                  {option.matches.map((match, idx) => (
                    <li key={idx}>
                      <span className="match-location">
                        {match.isHome ? <Home size={14} /> : <Plane size={14} />}
                      </span>
                      <span className="opponent-name">{match.opponent.name}</span>
                      <span className="opponent-ovr">{match.opponent.reputation} OVR</span>
                      {match.isPresentationMatch && (
                        <span className="presentation-badge">
                          <Sparkles size={12} /> Presentación
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
            </div>
          ))}
        </div>
        
        <div className="preseason-actions">
          <button 
            className="btn-back" 
            onClick={() => setPhase('summary')}
          >
            Volver
          </button>
          <button 
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={!selectedPreseason}
          >
            Comenzar Pretemporada
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
