import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  getLaLigaTeams, getSegundaTeams, getPrimeraRfefTeams, getSegundaRfefTeams,
  getPremierTeams, getSerieATeams, getBundesligaTeams, getLigue1Teams
} from '../../data/teamsFirestore';
import { simulateMatch, updateTable, simulateWeekMatches, calculateTeamStrength, FORMATIONS, TACTICS } from '../../game/leagueEngine';
import { simulateOtherLeaguesWeek } from '../../game/multiLeagueEngine';
import { calculateMatchAttendance, calculateMatchIncome } from '../../game/stadiumEconomy';
import './MatchDay.scss';

// Función para obtener todos los equipos dinámicamente (todas las ligas)
const getAllTeams = () => [
  ...getLaLigaTeams(), ...getSegundaTeams(), ...getPrimeraRfefTeams(), ...getSegundaRfefTeams(),
  ...getPremierTeams(), ...getSerieATeams(), ...getBundesligaTeams(), ...getLigue1Teams()
];

export default function MatchDay({ onComplete }) {
  const { state, dispatch } = useGame();
  const [phase, setPhase] = useState('preview'); // preview, playing, result
  const [matchResult, setMatchResult] = useState(null);
  const [eventIndex, setEventIndex] = useState(0);
  const [currentMinute, setCurrentMinute] = useState(0);
  const eventsRef = useRef(null);
  
  // Auto-scroll events list to bottom when new events appear
  useEffect(() => {
    if (eventsRef.current) {
      eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
    }
  }, [eventIndex]);
  
  // Buscar partido: European match → pretemporada → liga
  let playerMatch;
  let isPreseason = false;
  let isEuropeanMatch = false;
  let europeanMatchData = null;

  if (state.pendingEuropeanMatch) {
    // European competition match takes priority
    europeanMatchData = state.pendingEuropeanMatch;
    isEuropeanMatch = true;
    // Build a compatible match object
    const euMatch = state.pendingEuropeanMatch;
    playerMatch = {
      homeTeam: euMatch.homeTeamId || euMatch.homeTeam?.teamId || euMatch.team1?.teamId,
      awayTeam: euMatch.awayTeamId || euMatch.awayTeam?.teamId || euMatch.team2?.teamId,
      week: state.currentWeek,
      isEuropean: true,
      competitionId: euMatch.competitionId,
      competitionName: euMatch.competitionName,
      matchday: euMatch.matchday,
      phase: euMatch.phase
    };
  } else if (state.preseasonPhase && state.preseasonMatches?.length > 0) {
    const preseasonIdx = (state.preseasonWeek || 1) - 1;
    playerMatch = state.preseasonMatches[preseasonIdx];
    isPreseason = true;
  } else {
    playerMatch = state.fixtures.find(f => 
      f.week === state.currentWeek && 
      !f.played && 
      (f.homeTeam === state.teamId || f.awayTeam === state.teamId)
    );
  }

  const isHome = isEuropeanMatch
    ? (europeanMatchData.isHome ?? (playerMatch?.homeTeam === state.teamId))
    : (playerMatch?.homeTeam === state.teamId);
  const opponentId = isHome ? playerMatch?.awayTeam : playerMatch?.homeTeam;
  
  // Resolve opponent data
  let opponent;
  if (isEuropeanMatch) {
    // European match has team data embedded
    const eu = europeanMatchData;
    if (isHome) {
      opponent = eu.awayTeam || eu.team2 || { teamId: opponentId, name: 'Unknown', reputation: 70 };
    } else {
      opponent = eu.homeTeam || eu.team1 || { teamId: opponentId, name: 'Unknown', reputation: 70 };
    }
    // Normalize to match expected shape (id, name, shortName)
    if (!opponent.id && opponent.teamId) opponent = { ...opponent, id: opponent.teamId };
    if (!opponent.name && opponent.teamName) opponent = { ...opponent, name: opponent.teamName };
  } else if (isPreseason && playerMatch?.opponent) {
    opponent = playerMatch.opponent;
  } else {
    opponent = getAllTeams().find(t => t.id === opponentId);
  }
  
  // Get team strengths for preview
  // Guard: si no hay partido o rival, no calcular nada
  if (!playerMatch || !opponent) {
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
    console.error('MatchDay Debug (early guard):', debugInfo);
    
    return (
      <div className="match-day">
        <div className="match-day__no-match">
          <p>No hay partido esta semana</p>
          <button onClick={onComplete}>Continuar</button>
        </div>
      </div>
    );
  }
  
  const playerStrength = calculateTeamStrength(state.team, state.formation, state.tactic, 70, state.lineup);
  // En pretemporada el opponent puede no tener players completo
  const opponentStrength = (opponent?.players?.length > 0)
    ? calculateTeamStrength(opponent, '4-3-3', 'balanced')
    : { overall: opponent?.reputation || 70, attack: (opponent?.reputation || 70) * 0.9, defense: (opponent?.reputation || 70) * 0.85 };
  
  // Get morale from table
  const playerTableEntry = state.leagueTable.find(t => t.teamId === state.teamId);
  const opponentTableEntry = state.leagueTable.find(t => t.teamId === opponentId);
  
  const simulateAndPlay = () => {
    try {
      console.log('🎮 simulateAndPlay started');
      setPhase('playing');
      
      // En pretemporada el opponent puede no tener players: generar equipo sintético
      const resolvedOpponent = (opponent?.players?.length > 0) ? opponent : {
        ...opponent,
        id: opponent?.id || opponentId,
        name: opponent?.name || 'Rival',
        shortName: opponent?.shortName || opponent?.name?.slice(0, 3)?.toUpperCase() || 'RIV',
        players: Array.from({ length: 18 }, (_, i) => ({
          name: `Jugador ${i + 1}`,
          position: ['GK','CB','CB','CB','RB','LB','CM','CM','CDM','CAM','RM','LM','RW','LW','ST','ST','CF','GK'][i],
          overall: Math.round((opponent?.reputation || 70) + (Math.random() * 10 - 5)),
          age: 22 + Math.floor(Math.random() * 10),
          stamina: 80 + Math.floor(Math.random() * 15)
        }))
      };
      const homeTeamData = isHome ? state.team : resolvedOpponent;
      const awayTeamData = isHome ? resolvedOpponent : state.team;
      
      console.log('🎮 Teams:', { homeTeamData: homeTeamData?.name, awayTeamData: awayTeamData?.name });
    
    // Calcular asistencia si somos locales
    let attendanceFillRate = 0.7; // Default para partidos de IA
    let matchAttendance = null;
    
    if (isHome && state.stadium) {
      const stadium = state.stadium;
      const levelCapacity = [8000, 18000, 35000, 55000, 80000][stadium.level || 0];
      const stadiumCapacity = stadium.realCapacity || levelCapacity;
      const seasonTickets = stadium.seasonTicketsFinal ?? stadium.seasonTickets ?? Math.floor(stadiumCapacity * 0.3);
      const ticketPrice = (stadium.ticketPrice ?? 30) + (stadium.matchPriceAdjust || 0);
      
      // Posición del rival en la tabla
      const rivalPosition = state.leagueTable.findIndex(t => t.teamId === opponentId) + 1 || 10;
      const teamPosition = state.leagueTable.findIndex(t => t.teamId === state.teamId) + 1 || 10;
      
      // División según liga (para precio justo dinámico)
      const leagueId = state.leagueId || 'laliga';
      const division = ['segunda', 'segundaRFEF', 'primeraRFEF'].includes(leagueId) ? 2 : 1;
      const teamPlayers = state.team?.players || [];
      const teamOverall = teamPlayers.length > 0 
        ? Math.round(teamPlayers.reduce((sum, p) => sum + (p.overall || 70), 0) / teamPlayers.length) : 70;
      
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
        leagueId,
        homeTeamId: state.teamId,
        awayTeamId: opponentId,
        teamOverall,
        teamReputation: state.team?.reputation || 70,
        division
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
        grassCondition,
        // Pasar lineup del jugador para que la simulación respete su alineación
        homeLineup: isHome ? state.lineup : null,
        awayLineup: isHome ? null : state.lineup
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
    // European match — dispatch special action and return
    if (isEuropeanMatch && europeanMatchData) {
      const euResult = {
        homeTeamId: playerMatch.homeTeam,
        awayTeamId: playerMatch.awayTeam,
        homeScore: matchResult.homeScore,
        awayScore: matchResult.awayScore,
        events: matchResult.events || []
      };

      dispatch({
        type: 'COMPLETE_EUROPEAN_MATCH',
        payload: {
          competitionId: europeanMatchData.competitionId,
          matchResult: euResult,
          matchday: europeanMatchData.matchday,
          phase: europeanMatchData.phase
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
          type: 'european',
          title: `⚽ ${europeanMatchData.competitionName || 'Europa'}: ${state.team.name} ${playerScore} - ${opponentScore} ${opponent?.name || 'Rival'}`,
          content: resultText,
          date: `Semana ${state.currentWeek}`
        }
      });

      // Process injuries
      const playerTeamSide = isHome ? 'home' : 'away';
      const injuries = matchResult.events.filter(e => e.type === 'injury' && e.team === playerTeamSide);
      injuries.forEach(injury => {
        dispatch({
          type: 'INJURE_PLAYER',
          payload: {
            playerName: injury.player,
            weeksOut: injury.weeksOut,
            severity: injury.severity
          }
        });
      });

      // === Also simulate league match + other leagues for this week ===
      // European weeks overlap with domestic fixtures; auto-sim the domestic match
      const leagueMatch = state.fixtures?.find(f =>
        f.week === state.currentWeek && !f.played &&
        (f.homeTeam === state.teamId || f.awayTeam === state.teamId)
      );
      if (leagueMatch) {
        const allTeamsForSim = getAllTeams().map(t => t.id === state.teamId ? state.team : t);
        const leagueOpponentId = leagueMatch.homeTeam === state.teamId ? leagueMatch.awayTeam : leagueMatch.homeTeam;
        const leagueOpponent = allTeamsForSim.find(t => t.id === leagueOpponentId);
        const leagueIsHome = leagueMatch.homeTeam === state.teamId;
        
        if (leagueOpponent) {
          const leagueResult = simulateMatch(
            leagueMatch.homeTeam, leagueMatch.awayTeam,
            leagueIsHome ? state.team : leagueOpponent,
            leagueIsHome ? leagueOpponent : state.team,
            { importance: 'normal', attendanceFillRate: 0.7 }
          );
          
          let updatedFixtures = state.fixtures.map(f =>
            f.id === leagueMatch.id ? { ...f, played: true, homeScore: leagueResult.homeScore, awayScore: leagueResult.awayScore } : f
          );
          let newTable = updateTable(state.leagueTable, leagueMatch.homeTeam, leagueMatch.awayTeam, leagueResult.homeScore, leagueResult.awayScore);
          
          // Simulate other league matches for this week
          const otherMatchesResult = simulateWeekMatches(updatedFixtures, newTable, state.currentWeek, state.teamId, allTeamsForSim);
          dispatch({ type: 'SET_FIXTURES', payload: otherMatchesResult.fixtures });
          dispatch({ type: 'SET_LEAGUE_TABLE', payload: otherMatchesResult.table });
          
          // Add auto-sim result message
          const pScore = leagueIsHome ? leagueResult.homeScore : leagueResult.awayScore;
          const oScore = leagueIsHome ? leagueResult.awayScore : leagueResult.homeScore;
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now() + 0.5,
              type: 'match_result',
              title: `⚽ Liga (auto): ${state.team.name} ${pScore} - ${oScore} ${leagueOpponent.name}`,
              content: pScore > oScore ? '¡Victoria!' : pScore < oScore ? 'Derrota' : 'Empate',
              date: `Semana ${state.currentWeek}`
            }
          });
        }
      }
      
      // Other leagues are simulated in ADVANCE_WEEK (GameContext)

      onComplete();
      return;
    }

    // Solo actualizar tabla/fixtures en partidos de liga (no pretemporada)
    if (!isPreseason) {
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
    
    // Other leagues are simulated in ADVANCE_WEEK (GameContext)
    
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
    } // end if (!isPreseason) — no actualizar liga en amistosos
    
    // Add message (pretemporada y liga)
    const playerScore = isHome ? matchResult.homeScore : matchResult.awayScore;
    const opponentScore = isHome ? matchResult.awayScore : matchResult.homeScore;
    const resultText = playerScore > opponentScore ? '¡Victoria!' : 
                       playerScore < opponentScore ? 'Derrota' : 'Empate';
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'match_result',
        title: `${isPreseason ? '🏟️ Amistoso' : 'Resultado'}: ${state.team.name} ${playerScore} - ${opponentScore} ${opponent.name}`,
        content: resultText,
        date: isPreseason ? `Pretemporada ${state.preseasonWeek}` : `Semana ${state.currentWeek}`
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
          date: isPreseason ? `Pretemporada ${state.preseasonWeek}` : `Semana ${state.currentWeek}`
        }
      });
    });
    
    // Tarjetas y sanciones SOLO en partidos oficiales (NO en pretemporada)
    if (!isPreseason) {
      // 1. Primero: servir sanciones existentes (los que NO jugaron este partido)
      dispatch({ type: 'SERVE_SUSPENSIONS' });

      // 2. Procesar amarillas del partido (solo cuentan para acumulación, no doble amarilla)
      // La doble amarilla ya viene como red_card con reason="Segunda amarilla"
      const playerYellowCards = matchResult.events.filter(
        e => e.type === 'yellow_card' && e.team === playerTeamSide
      );

      if (playerYellowCards.length > 0) {
        dispatch({
          type: 'ADD_YELLOW_CARDS',
          payload: {
            cards: playerYellowCards.map(e => ({ playerName: e.player }))
          }
        });
      }

      // 3. Procesar rojas (doble amarilla = 1 partido, roja directa = 2 partidos)
      const playerRedCards = matchResult.events.filter(
        e => e.type === 'red_card' && e.team === playerTeamSide
      );

      if (playerRedCards.length > 0) {
        dispatch({
          type: 'ADD_RED_CARDS',
          payload: {
            cards: playerRedCards.map(e => ({ 
              playerName: e.player, 
              reason: e.reason || 'Roja directa'
            }))
          }
        });
      }
    }

    // Ingresos por taquilla si jugamos en casa (liga + pretemporada)
    if (isHome && matchResult.attendance) {
      const att = matchResult.attendance;
      const stadium = state.stadium || {};
      const tPrice = (stadium.ticketPrice ?? 30);
      
      // Ingresos = SOLO entradas vendidas (no abonados, ya pagaron en campaña)
      const ticketIncome = att.ticketSales * tPrice;
      
      // ACUMULAR ingresos de entradas (se cobran al final de temporada)
      const prevAccumulated = stadium.accumulatedTicketIncome ?? 0;
      
      // Guardar datos de última jornada + acumular + bloquear precio
      dispatch({
        type: 'UPDATE_STADIUM',
        payload: { 
          ...stadium, 
          lastMatchTicketSales: att.ticketSales,       // Entradas vendidas (sin abonados)
          lastMatchAttendance: att.attendance,          // Asistencia total (con abonados)
          lastMatchIncome: ticketIncome,                // Solo ingresos de entradas vendidas
          accumulatedTicketIncome: prevAccumulated + ticketIncome,
          ticketPriceLocked: true // Se bloquea al jugar el primer partido
        }
      });
      
      // Mensaje con detalles de taquilla
      const fillPercent = Math.round(att.fillRate * 100);
      const availableSeats = att.availableSeats || 0;
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now() + 0.1,
          type: 'stadium',
          title: `🎟️ Taquilla: ${att.ticketSales.toLocaleString()} entradas vendidas (${fillPercent}% aforo)`,
          content: `Ingresos: €${(ticketIncome/1000).toFixed(0)}K (${att.ticketSales} × €${tPrice}) | Acumulado temp.: €${((prevAccumulated + ticketIncome)/1000).toFixed(0)}K`,
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
  
  // Guard duplicado eliminado — ya se comprueba al inicio del componente
  
  return (
    <div className="match-day">
      <div className="match-day__content">
        {phase === 'preview' && (
          <div className="match-day__preview">
            <h2>{isEuropeanMatch ? `${europeanMatchData.competitionName || 'Europa'} — ${europeanMatchData.phase === 'league' ? `Jornada ${europeanMatchData.matchday}` : europeanMatchData.phase}` : isPreseason ? `Amistoso ${state.preseasonWeek}/5` : `Jornada ${state.currentWeek}`}</h2>
            
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
            
            <button className="match-day__skip-btn" onClick={skipToEnd}>
              ⏭️ Saltar al final
            </button>
            
            <div className="match-day__events" ref={eventsRef}>
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
                    {typeof event.player === 'object' ? event.player?.name || 'Desconocido' : event.player}
                    {event.assist && <span className="assist"> (asist. {typeof event.assist === 'object' ? event.assist?.name : event.assist})</span>}
                    {event.type === 'goal' && event.goalType && <span className="goal-type"> {getGoalTypeText(event.goalType)}</span>}
                    {event.type === 'injury' && <span className="injury-info"> ({event.weeksOut} sem.)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {phase === 'result' && matchResult && (() => {
          const homeName = isHome ? state.team.name : opponent.name;
          const homeShort = isHome ? state.team.shortName : opponent.shortName;
          const awayName = !isHome ? state.team.name : opponent.name;
          const awayShort = !isHome ? state.team.shortName : opponent.shortName;
          const playerIsHome = isHome;
          const playerWon = playerIsHome 
            ? matchResult.homeScore > matchResult.awayScore 
            : matchResult.awayScore > matchResult.homeScore;
          const isDraw = matchResult.homeScore === matchResult.awayScore;
          const resultTag = playerWon ? 'V' : isDraw ? 'E' : 'D';
          const resultClass = playerWon ? 'win' : isDraw ? 'draw' : 'loss';
          
          // Separate events by team
          const homeGoals = matchResult.events.filter(e => e.type === 'goal' && e.team === 'home');
          const awayGoals = matchResult.events.filter(e => e.type === 'goal' && e.team === 'away');
          
          // Stats with bar rendering helper
          const stats = matchResult.stats;
          const statRows = [
            { label: 'Posesión', home: stats.possession.home, away: stats.possession.away, suffix: '%', isPercent: true },
            { label: 'Tiros', home: stats.shots.home, away: stats.shots.away },
            { label: 'A puerta', home: stats.shotsOnTarget.home, away: stats.shotsOnTarget.away },
            { label: 'Córners', home: stats.corners.home, away: stats.corners.away },
            { label: 'Faltas', home: stats.fouls?.home ?? 0, away: stats.fouls?.away ?? 0 },
            { label: 'Amarillas', home: stats.yellowCards.home, away: stats.yellowCards.away, icon: '🟨' },
            ...(stats.redCards.home > 0 || stats.redCards.away > 0 
              ? [{ label: 'Rojas', home: stats.redCards.home, away: stats.redCards.away, icon: '🟥' }] 
              : [])
          ];
          
          return (
          <div className={`match-day__result ${resultClass}`}>
            {/* Header badge */}
            <div className="result-header">
              <span className="result-label">Resultado Final</span>
              <span className={`result-badge ${resultClass}`}>{resultTag}</span>
            </div>
            
            {/* Scoreboard */}
            <div className="result-scoreboard">
              <div className={`result-team ${playerIsHome ? 'is-player' : ''}`}>
                <div className="team-badge">{homeShort}</div>
                <span className="team-name">{homeName}</span>
                <div className="team-scorers">
                  {homeGoals.map((g, i) => (
                    <span key={i} className="scorer">
                      ⚽ {typeof g.player === 'object' ? g.player?.name : g.player} {g.minute}'
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="result-score">
                <span className="score-num">{matchResult.homeScore}</span>
                <span className="score-sep">–</span>
                <span className="score-num">{matchResult.awayScore}</span>
              </div>
              
              <div className={`result-team away ${!playerIsHome ? 'is-player' : ''}`}>
                <div className="team-badge">{awayShort}</div>
                <span className="team-name">{awayName}</span>
                <div className="team-scorers">
                  {awayGoals.map((g, i) => (
                    <span key={i} className="scorer">
                      ⚽ {typeof g.player === 'object' ? g.player?.name : g.player} {g.minute}'
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Stats with visual bars */}
            <div className="result-stats">
              <h4>Estadísticas</h4>
              {statRows.map((row, idx) => {
                const total = (row.home + row.away) || 1;
                const homePct = row.isPercent ? row.home : (row.home / total) * 100;
                const awayPct = row.isPercent ? row.away : (row.away / total) * 100;
                const homeWins = row.home > row.away;
                const awayWins = row.away > row.home;
                
                return (
                  <div key={idx} className="stat-row">
                    <span className={`stat-val home ${homeWins ? 'leading' : ''}`}>
                      {row.home}{row.suffix || ''}
                    </span>
                    <div className="stat-center">
                      <div className="stat-bars">
                        <div className={`bar home ${homeWins ? 'leading' : ''}`} style={{ width: `${homePct}%` }} />
                        <div className={`bar away ${awayWins ? 'leading' : ''}`} style={{ width: `${awayPct}%` }} />
                      </div>
                      <span className="stat-label">{row.icon || ''} {row.label}</span>
                    </div>
                    <span className={`stat-val away ${awayWins ? 'leading' : ''}`}>
                      {row.away}{row.suffix || ''}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Events timeline */}
            {matchResult.events.length > 0 && (
              <div className="result-events">
                <h4>Cronología</h4>
                <div className="events-timeline">
                  {matchResult.events.map((event, idx) => {
                    const isHomeEvent = event.team === 'home';
                    const playerName = typeof event.player === 'object' ? event.player?.name || '?' : event.player;
                    const icon = event.type === 'goal' ? '⚽' 
                      : event.type === 'yellow_card' ? '🟨' 
                      : event.type === 'red_card' ? '🟥' 
                      : '🏥';
                    
                    return (
                      <div key={idx} className={`timeline-event ${isHomeEvent ? 'home' : 'away'} ${event.type}`}>
                        <div className="event-minute">{event.minute}'</div>
                        <div className="event-line">
                          <div className="event-dot">{icon}</div>
                        </div>
                        <div className="event-detail">
                          <span className="event-player">{playerName}</span>
                          {event.type === 'goal' && event.assist && (
                            <span className="event-assist">
                              Asist. {typeof event.assist === 'object' ? event.assist?.name : event.assist}
                            </span>
                          )}
                          {event.type === 'goal' && event.goalType && (
                            <span className="event-extra">{getGoalTypeText(event.goalType)}</span>
                          )}
                          {event.type === 'injury' && (
                            <span className="event-extra">🏥 {event.weeksOut} sem.</span>
                          )}
                          <span className="event-team-tag">
                            {isHomeEvent ? homeShort : awayShort}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {matchResult.events.length === 0 && (
              <div className="result-events empty">
                <p>Partido sin incidencias destacadas</p>
              </div>
            )}
            
            <button className="match-day__continue-btn" onClick={handleFinish}>
              Continuar
            </button>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
