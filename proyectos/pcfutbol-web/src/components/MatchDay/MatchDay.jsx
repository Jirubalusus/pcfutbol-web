import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  getLaLigaTeams, getSegundaTeams, getPrimeraRfefTeams, getSegundaRfefTeams 
} from '../../data/teamsFirestore';
import { simulateMatch, updateTable, simulateWeekMatches, calculateTeamStrength, FORMATIONS, TACTICS } from '../../game/leagueEngine';
import { simulateOtherLeaguesWeek } from '../../game/multiLeagueEngine';
import { calculateMatchAttendance, calculateMatchIncome } from '../../game/stadiumEconomy';
import './MatchDay.scss';

// Función para obtener todos los equipos dinámicamente
const getAllTeams = () => [
  ...getLaLigaTeams(), ...getSegundaTeams(), ...getPrimeraRfefTeams(), ...getSegundaRfefTeams()
];

export default function MatchDay({ onComplete }) {
  const { state, dispatch } = useGame();
  const [phase, setPhase] = useState('preview'); // preview, playing, result
  const [matchResult, setMatchResult] = useState(null);
  const [eventIndex, setEventIndex] = useState(0);
  const [currentMinute, setCurrentMinute] = useState(0);
  
  // Find player's match
  const playerMatch = state.fixtures.find(f => 
    f.week === state.currentWeek && 
    !f.played && 
    (f.homeTeam === state.teamId || f.awayTeam === state.teamId)
  );
  
  const isHome = playerMatch?.homeTeam === state.teamId;
  const opponentId = isHome ? playerMatch?.awayTeam : playerMatch?.homeTeam;
  const opponent = getAllTeams().find(t => t.id === opponentId);
  
  // Get team strengths for preview
  const playerStrength = calculateTeamStrength(state.team, state.formation, state.tactic);
  const opponentStrength = calculateTeamStrength(opponent, '4-3-3', 'balanced');
  
  // Get morale from table
  const playerTableEntry = state.leagueTable.find(t => t.teamId === state.teamId);
  const opponentTableEntry = state.leagueTable.find(t => t.teamId === opponentId);
  
  const simulateAndPlay = () => {
    try {
      console.log('🎮 simulateAndPlay started');
      setPhase('playing');
      
      const homeTeamData = isHome ? state.team : opponent;
      const awayTeamData = isHome ? opponent : state.team;
      
      console.log('🎮 Teams:', { homeTeamData: homeTeamData?.name, awayTeamData: awayTeamData?.name });
    
    // Calcular asistencia si somos locales
    let attendanceFillRate = 0.7; // Default para partidos de IA
    let matchAttendance = null;
    
    if (isHome && state.stadium) {
      const stadium = state.stadium;
      const stadiumCapacity = [8000, 18000, 35000, 55000, 80000][stadium.level || 0];
      const seasonTickets = stadium.seasonTickets ?? Math.floor(stadiumCapacity * 0.3);
      const ticketPrice = (stadium.ticketPrice ?? 30) + (stadium.matchPriceAdjust || 0);
      
      // Posición del rival en la tabla
      const rivalPosition = state.leagueTable.findIndex(t => t.teamId === opponentId) + 1 || 10;
      const teamPosition = state.leagueTable.findIndex(t => t.teamId === state.teamId) + 1 || 10;
      
      matchAttendance = calculateMatchAttendance({
        stadiumCapacity,
        seasonTickets,
        ticketPrice,
        rivalTeam: opponent,
        rivalPosition,
        teamPosition,
        totalTeams: state.leagueTable.length || 20,
        streak: playerTableEntry?.streak || 0,
        morale: playerTableEntry?.morale || 70,
        leagueId: state.leagueId || 'laliga',
        homeTeamId: state.teamId,
        awayTeamId: opponentId
      });
      
      attendanceFillRate = matchAttendance.fillRate;
    }
    
    // Pass formation and tactic context
    const grassCondition = isHome ? (state.stadium?.grassCondition ?? 100) : 100;
    
    console.log('🎮 About to simulateMatch...');
    const result = simulateMatch(
      playerMatch.homeTeam,
      playerMatch.awayTeam,
      homeTeamData,
      awayTeamData,
      {
        homeFormation: isHome ? state.formation : '4-3-3',
        awayFormation: isHome ? '4-3-3' : state.formation,
        homeTactic: isHome ? state.tactic : 'balanced',
        awayTactic: isHome ? 'balanced' : state.tactic,
        homeMorale: isHome ? (playerTableEntry?.morale || 70) : (opponentTableEntry?.morale || 70),
        awayMorale: isHome ? (opponentTableEntry?.morale || 70) : (playerTableEntry?.morale || 70),
        isDerby: false, // TODO: implement derby detection
        importance: 'normal',
        attendanceFillRate: isHome ? attendanceFillRate : 0.7,
        grassCondition
      }
    );
    
    console.log('🎮 simulateMatch done, result:', result ? 'OK' : 'NULL', result?.homeScore, '-', result?.awayScore);
    
    // Añadir info de asistencia al resultado si somos locales
    if (matchAttendance) {
      result.attendance = matchAttendance;
    }
    
    console.log('🎮 Setting matchResult...');
    setMatchResult(result);
    console.log('🎮 matchResult set, starting animation...');
    
    // Animate minute by minute
    let minute = 0;
    let eventIdx = 0;
    
    const matchInterval = setInterval(() => {
      minute += 3; // Jump 3 minutes each tick
      setCurrentMinute(Math.min(90, minute));
      
      // Show events up to current minute
      while (eventIdx < result.events.length && result.events[eventIdx].minute <= minute) {
        setEventIndex(eventIdx + 1);
        eventIdx++;
      }
      
      if (minute >= 95) {
        clearInterval(matchInterval);
        setEventIndex(result.events.length);
        setTimeout(() => setPhase('result'), 500);
      }
    }, 150);
    } catch (error) {
      console.error('🔴 Error in simulateAndPlay:', error);
      console.error('🔴 Stack:', error.stack);
      // Fallback: show error state
      setPhase('preview');
      alert('Error al simular el partido: ' + error.message);
    }
  };
  
  const skipToEnd = () => {
    if (matchResult) {
      setCurrentMinute(90);
      setEventIndex(matchResult.events.length);
      setPhase('result');
    }
  };
  
  const handleFinish = () => {
    // Update player's match in fixtures
    let updatedFixtures = state.fixtures.map(f => {
      if (f.id === playerMatch.id) {
        return {
          ...f,
          played: true,
          homeScore: matchResult.homeScore,
          awayScore: matchResult.awayScore,
          events: matchResult.events,
          stats: matchResult.stats
        };
      }
      return f;
    });
    
    // Update league table
    let newTable = updateTable(
      state.leagueTable,
      playerMatch.homeTeam,
      playerMatch.awayTeam,
      matchResult.homeScore,
      matchResult.awayScore
    );
    
    // Simulate other matches
    const allTeams = getAllTeams().map(t => t.id === state.teamId ? state.team : t);
    
    const otherMatchesResult = simulateWeekMatches(
      updatedFixtures,
      newTable,
      state.currentWeek,
      state.teamId,
      allTeams
    );
    
    dispatch({ type: 'SET_FIXTURES', payload: otherMatchesResult.fixtures });
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: otherMatchesResult.table });
    
    // Simular otras ligas en paralelo
    if (state.otherLeagues && Object.keys(state.otherLeagues).length > 0) {
      const updatedOtherLeagues = simulateOtherLeaguesWeek(state.otherLeagues, state.currentWeek);
      dispatch({ type: 'SET_OTHER_LEAGUES', payload: updatedOtherLeagues });
    }
    
    // Add result
    dispatch({
      type: 'ADD_RESULT',
      payload: {
        week: state.currentWeek,
        homeTeam: playerMatch.homeTeam,
        awayTeam: playerMatch.awayTeam,
        homeScore: matchResult.homeScore,
        awayScore: matchResult.awayScore
      }
    });
    
    // Add message
    const playerScore = isHome ? matchResult.homeScore : matchResult.awayScore;
    const opponentScore = isHome ? matchResult.awayScore : matchResult.homeScore;
    const resultText = playerScore > opponentScore ? '¡Victoria!' : 
                       playerScore < opponentScore ? 'Derrota' : 'Empate';
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'match_result',
        title: `Resultado: ${state.team.name} ${playerScore} - ${opponentScore} ${opponent.name}`,
        content: resultText,
        date: `Semana ${state.currentWeek}`
      }
    });
    
    // Process injuries for player's team
    const playerTeamSide = isHome ? 'home' : 'away';
    const playerInjuries = matchResult.events.filter(
      e => e.type === 'injury' && e.team === playerTeamSide
    );
    
    playerInjuries.forEach(injury => {
      dispatch({
        type: 'INJURE_PLAYER',
        payload: {
          playerName: injury.player,
          weeksOut: injury.weeksOut,
          severity: injury.severity
        }
      });
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now() + Math.random(),
          type: 'injury',
          title: `🏥 Lesión: ${injury.player}`,
          content: `${injury.player} estará ${injury.weeksOut} semanas de baja (${getInjuryText(injury.severity)})`,
          date: `Semana ${state.currentWeek}`
        }
      });
    });
    
    // Ingresos por taquilla si jugamos en casa
    if (isHome && matchResult.attendance) {
      const att = matchResult.attendance;
      const stadium = state.stadium || {};
      const ticketPrice = (stadium.ticketPrice ?? 30) + (stadium.matchPriceAdjust || 0);
      const stadiumLevel = stadium.level ?? 0;
      
      // Calcular ingresos
      const ticketIncome = att.ticketSales * ticketPrice;
      const concessionRate = 8 + (stadiumLevel * 2); // €8-18 según nivel
      const concessionIncome = att.attendance * concessionRate;
      const totalIncome = ticketIncome + concessionIncome;
      
      dispatch({ type: 'UPDATE_MONEY', payload: totalIncome });
      
      // Guardar datos de última jornada y resetear ajuste de precio
      dispatch({
        type: 'UPDATE_STADIUM',
        payload: { 
          ...stadium, 
          matchPriceAdjust: 0,
          lastMatchAttendance: att.attendance,
          lastMatchIncome: totalIncome
        }
      });
      
      // Mensaje con detalles de taquilla
      const fillPercent = Math.round(att.fillRate * 100);
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now() + 0.1,
          type: 'stadium',
          title: `🎟️ Taquilla: ${att.attendance.toLocaleString()} espectadores (${fillPercent}%)`,
          content: `Entradas: €${(ticketIncome/1000).toFixed(0)}K | Consumiciones: €${(concessionIncome/1000).toFixed(0)}K | Total: €${(totalIncome/1000).toFixed(0)}K`,
          date: `Semana ${state.currentWeek}`
        }
      });
    }
    
    // HEAL_INJURIES se llama en ADVANCE_WEEK, no aquí
    onComplete();
  };
  
  const getInjuryText = (severity) => {
    switch (severity) {
      case 'minor': return 'Lesión leve';
      case 'moderate': return 'Lesión moderada';
      case 'serious': return 'Lesión grave';
      default: return 'Lesión';
    }
  };
  
  const getGoalTypeText = (type) => {
    switch (type) {
      case 'golazo': return '🔥 ¡GOLAZO!';
      case 'great_strike': return '💫 Gran disparo';
      case 'penalty': return '(Penalti)';
      case 'header': return '(Cabezazo)';
      case 'tap_in': return '(A placer)';
      case 'corner': return '(Córner)';
      case 'late': return '🔥 ¡Gol en el descuento!';
      default: return '';
    }
  };
  
  const getFormText = (form) => {
    if (!form || form.length === 0) return 'Sin datos';
    return form.map((r, i) => (
      <span key={i} className={`form-item ${r.toLowerCase()}`}>{r}</span>
    ));
  };
  
  if (!playerMatch || !opponent) {
    // DEBUG: Mostrar info para diagnosticar el problema
    const debugInfo = {
      teamId: state.teamId,
      currentWeek: state.currentWeek,
      fixturesCount: state.fixtures?.length || 0,
      weekFixtures: state.fixtures?.filter(f => f.week === state.currentWeek) || [],
      allTeamsCount: getAllTeams().length,
      playerMatchFound: !!playerMatch,
      opponentFound: !!opponent,
      opponentId: opponentId
    };
    console.error('MatchDay Debug:', debugInfo);
    
    return (
      <div className="match-day">
        <div className="match-day__no-match">
          <p>No hay partido esta semana</p>
          <p style={{fontSize: '12px', color: '#888', marginTop: '10px'}}>
            Debug: teamId={state.teamId}, week={state.currentWeek}, fixtures={state.fixtures?.length || 0}, allTeams={getAllTeams().length}
          </p>
          <button onClick={onComplete}>Continuar</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="match-day">
      <div className="match-day__content">
        {phase === 'preview' && (
          <div className="match-day__preview">
            <h2>Jornada {state.currentWeek}</h2>
            
            <div className="match-day__teams">
              <div className={`match-day__team ${isHome ? 'player' : ''}`}>
                <div className="badge">{isHome ? state.team.shortName : opponent.shortName}</div>
                <h3>{isHome ? state.team.name : opponent.name}</h3>
                {isHome && <span className="home-tag">LOCAL</span>}
                <div className="team-form">
                  {getFormText(isHome ? playerTableEntry?.form : opponentTableEntry?.form)}
                </div>
              </div>
              
              <div className="match-day__vs">VS</div>
              
              <div className={`match-day__team ${!isHome ? 'player' : ''}`}>
                <div className="badge">{!isHome ? state.team.shortName : opponent.shortName}</div>
                <h3>{!isHome ? state.team.name : opponent.name}</h3>
                {!isHome && <span className="away-tag">VISITANTE</span>}
                <div className="team-form">
                  {getFormText(!isHome ? playerTableEntry?.form : opponentTableEntry?.form)}
                </div>
              </div>
            </div>
            
            <div className="match-day__comparison">
              <div className="comparison-row">
                <span className="home-val">{Math.round(playerStrength.overall)}</span>
                <span className="label">Fuerza Global</span>
                <span className="away-val">{Math.round(opponentStrength.overall)}</span>
              </div>
              <div className="comparison-row">
                <span className="home-val">{Math.round(isHome ? playerStrength.attack : opponentStrength.attack)}</span>
                <span className="label">Ataque</span>
                <span className="away-val">{Math.round(isHome ? opponentStrength.attack : playerStrength.attack)}</span>
              </div>
              <div className="comparison-row">
                <span className="home-val">{Math.round(isHome ? playerStrength.defense : opponentStrength.defense)}</span>
                <span className="label">Defensa</span>
                <span className="away-val">{Math.round(isHome ? opponentStrength.defense : playerStrength.defense)}</span>
              </div>
            </div>
            
            <div className="match-day__tactics">
              <div className="tactic-info">
                <span className="label">Tu formación:</span>
                <span className="value">{state.formation}</span>
              </div>
              <div className="tactic-info">
                <span className="label">Tu táctica:</span>
                <span className="value">{TACTICS[state.tactic]?.name || 'Equilibrado'}</span>
              </div>
            </div>
            
            <button className="match-day__play-btn" onClick={simulateAndPlay}>
              ⚽ Jugar Partido
            </button>
          </div>
        )}
        
        {phase === 'playing' && matchResult && (
          <div className="match-day__playing">
            <div className="match-day__minute">
              {currentMinute}'
            </div>
            
            <div className="match-day__score">
              {(() => {
                // Calcular marcador según los eventos mostrados hasta ahora
                const visibleEvents = matchResult.events.slice(0, eventIndex);
                const homeGoals = visibleEvents.filter(e => e.type === 'goal' && e.team === 'home').length;
                const awayGoals = visibleEvents.filter(e => e.type === 'goal' && e.team === 'away').length;
                
                return (
                  <>
                    <div className="team">
                      <span className="name">{isHome ? state.team.shortName : opponent.shortName}</span>
                      <span className="score">{homeGoals}</span>
                    </div>
                    <span className="separator">-</span>
                    <div className="team">
                      <span className="score">{awayGoals}</span>
                      <span className="name">{!isHome ? state.team.shortName : opponent.shortName}</span>
                    </div>
                  </>
                );
              })()}
            </div>
            
            <div className="match-day__live-stats">
              <div className="stat">
                <div className="bar home" style={{ width: `${matchResult.stats.possession.home}%` }}></div>
                <span className="label">Posesión</span>
                <div className="bar away" style={{ width: `${matchResult.stats.possession.away}%` }}></div>
              </div>
            </div>
            
            <div className="match-day__events">
              {matchResult.events.slice(0, eventIndex).map((event, idx) => (
                <div key={idx} className={`match-day__event ${event.team} ${event.type} ${event.goalType || ''}`}>
                  <span className="minute">{event.minute}'</span>
                  <span className="icon">
                    {event.type === 'goal' && '⚽'}
                    {event.type === 'yellow_card' && '🟨'}
                    {event.type === 'red_card' && '🟥'}
                    {event.type === 'injury' && '🏥'}
                  </span>
                  <span className="player">
                    {event.player}
                    {event.assist && <span className="assist"> (asist. {event.assist})</span>}
                    {event.type === 'goal' && event.goalType && <span className="goal-type"> {getGoalTypeText(event.goalType)}</span>}
                    {event.type === 'injury' && <span className="injury-info"> ({event.weeksOut} sem.)</span>}
                  </span>
                </div>
              ))}
            </div>
            
            <button className="match-day__skip-btn" onClick={skipToEnd}>
              ⏭️ Saltar al final
            </button>
          </div>
        )}
        
        {phase === 'result' && matchResult && (
          <div className="match-day__result">
            <h2>Resultado Final</h2>
            
            <div className="match-day__final-score">
              <div className="team">
                <span className="name">{isHome ? state.team.name : opponent.name}</span>
                <span className="score">{matchResult.homeScore}</span>
              </div>
              <span className="separator">-</span>
              <div className="team">
                <span className="score">{matchResult.awayScore}</span>
                <span className="name">{!isHome ? state.team.name : opponent.name}</span>
              </div>
            </div>
            
            <div className="match-day__stats">
              <div className="stat-row">
                <span className="home">{matchResult.stats.possession.home}%</span>
                <span className="label">Posesión</span>
                <span className="away">{matchResult.stats.possession.away}%</span>
              </div>
              <div className="stat-row">
                <span className="home">{matchResult.stats.shots.home}</span>
                <span className="label">Tiros</span>
                <span className="away">{matchResult.stats.shots.away}</span>
              </div>
              <div className="stat-row">
                <span className="home">{matchResult.stats.shotsOnTarget.home}</span>
                <span className="label">A puerta</span>
                <span className="away">{matchResult.stats.shotsOnTarget.away}</span>
              </div>
              <div className="stat-row">
                <span className="home">{matchResult.stats.corners.home}</span>
                <span className="label">Córners</span>
                <span className="away">{matchResult.stats.corners.away}</span>
              </div>
              <div className="stat-row">
                <span className="home">{matchResult.stats.yellowCards.home}</span>
                <span className="label">🟨 Amarillas</span>
                <span className="away">{matchResult.stats.yellowCards.away}</span>
              </div>
              {(matchResult.stats.redCards.home > 0 || matchResult.stats.redCards.away > 0) && (
                <div className="stat-row">
                  <span className="home">{matchResult.stats.redCards.home}</span>
                  <span className="label">🟥 Rojas</span>
                  <span className="away">{matchResult.stats.redCards.away}</span>
                </div>
              )}
            </div>
            
            <div className="match-day__all-events">
              <h4>Eventos del Partido</h4>
              {matchResult.events.map((event, idx) => (
                <div key={idx} className={`event ${event.team} ${event.type}`}>
                  <span className="minute">{event.minute}'</span>
                  <span className="event-icon">
                    {event.type === 'goal' && '⚽'}
                    {event.type === 'yellow_card' && '🟨'}
                    {event.type === 'red_card' && '🟥'}
                    {event.type === 'injury' && '🏥'}
                  </span>
                  <span className="player">
                    {event.player}
                    {event.assist && <span className="assist"> (asist. {event.assist})</span>}
                    {event.type === 'goal' && event.goalType && <span className="goal-type"> {getGoalTypeText(event.goalType)}</span>}
                    {event.type === 'injury' && <span className="injury-info"> - {event.weeksOut} semanas</span>}
                  </span>
                  <span className="team-name">
                    ({event.team === 'home' 
                      ? (isHome ? state.team.shortName : opponent.shortName)
                      : (isHome ? opponent.shortName : state.team.shortName)})
                  </span>
                </div>
              ))}
              {matchResult.events.length === 0 && <p className="no-events">Partido sin incidencias destacadas</p>}
            </div>
            
            <button className="match-day__continue-btn" onClick={handleFinish}>
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
