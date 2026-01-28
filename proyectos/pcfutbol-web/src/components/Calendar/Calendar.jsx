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
import './Calendar.scss';

export default function Calendar() {
  const { state } = useGame();
  const [selectedWeek, setSelectedWeek] = useState(state.currentWeek || 1);
  
  const totalWeeks = useMemo(() => {
    if (!state.fixtures?.length) return 38;
    return Math.max(...state.fixtures.map(f => f.week), 38);
  }, [state.fixtures]);
  
  const weekFixtures = useMemo(() => {
    return state.fixtures?.filter(f => f.week === selectedWeek) || [];
  }, [state.fixtures, selectedWeek]);
  
  // Obtener nombre del equipo
  const getTeamName = (teamId) => {
    const team = state.leagueTable?.find(t => t.teamId === teamId);
    return team?.teamName || teamId;
  };
  
  // Obtener iniciales del equipo
  const getTeamInitials = (teamId) => {
    const name = getTeamName(teamId);
    if (!name || name === teamId) return '??';
    const words = name.split(' ').filter(w => !['CF', 'FC', 'CD', 'UD', 'RC', 'SD', 'CA', 'Real', 'Atlético', 'Athletic', 'Deportivo'].includes(w));
    if (words.length === 0) return name.substring(0, 3).toUpperCase();
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };
  
  const isPlayerMatch = (fixture) => {
    return fixture.homeTeam === state.teamId || fixture.awayTeam === state.teamId;
  };
  
  const isPlayerHome = (fixture) => {
    return fixture.homeTeam === state.teamId;
  };
  
  // Obtener resultado del partido del jugador
  const getPlayerResult = (fixture) => {
    if (!fixture.played || !isPlayerMatch(fixture)) return null;
    const isHome = isPlayerHome(fixture);
    const playerGoals = isHome ? fixture.homeScore : fixture.awayScore;
    const opponentGoals = isHome ? fixture.awayScore : fixture.homeScore;
    if (playerGoals > opponentGoals) return 'W';
    if (playerGoals < opponentGoals) return 'L';
    return 'D';
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
          
          return (
            <button
              key={week}
              className={`week-btn ${week === selectedWeek ? 'selected' : ''} ${isCurrent ? 'current' : ''} ${allPlayed ? 'played' : ''}`}
              onClick={() => setSelectedWeek(week)}
            >
              {week}
            </button>
          );
        })}
      </div>
      
      {/* Lista de partidos */}
      <div className="calendar-v2__fixtures">
        {weekFixtures.length === 0 ? (
          <div className="no-fixtures">
            <Circle size={48} />
            <p>No hay partidos en esta jornada</p>
          </div>
        ) : (
          weekFixtures.map((fixture, idx) => {
            const playerMatch = isPlayerMatch(fixture);
            const playerResult = getPlayerResult(fixture);
            
            return (
              <div 
                key={fixture.id || idx} 
                className={`fixture-card ${playerMatch ? 'is-player' : ''} ${fixture.played ? 'played' : ''}`}
              >
                {/* Equipo local */}
                <div className={`team home ${fixture.homeTeam === state.teamId ? 'is-you' : ''}`}>
                  <div className="team-badge">
                    {getTeamInitials(fixture.homeTeam)}
                  </div>
                  <span className="team-name">{getTeamName(fixture.homeTeam)}</span>
                  {fixture.homeTeam === state.teamId && (
                    <span className="home-indicator">
                      <Home size={14} />
                    </span>
                  )}
                </div>
                
                {/* Marcador / VS */}
                <div className="match-center">
                  {fixture.played ? (
                    <div className={`score ${playerResult ? `result-${playerResult.toLowerCase()}` : ''}`}>
                      <span className="home-score">{fixture.homeScore}</span>
                      <span className="separator">-</span>
                      <span className="away-score">{fixture.awayScore}</span>
                    </div>
                  ) : (
                    <div className="vs-badge">
                      <Clock size={16} />
                      <span>VS</span>
                    </div>
                  )}
                </div>
                
                {/* Equipo visitante */}
                <div className={`team away ${fixture.awayTeam === state.teamId ? 'is-you' : ''}`}>
                  {fixture.awayTeam === state.teamId && (
                    <span className="away-indicator">
                      <Plane size={14} />
                    </span>
                  )}
                  <span className="team-name">{getTeamName(fixture.awayTeam)}</span>
                  <div className="team-badge">
                    {getTeamInitials(fixture.awayTeam)}
                  </div>
                </div>
                
                {/* Estado */}
                <div className="match-status">
                  {fixture.played ? (
                    <span className="status-badge played">
                      <CheckCircle2 size={14} />
                      Jugado
                    </span>
                  ) : selectedWeek === state.currentWeek ? (
                    <span className="status-badge pending">
                      <Clock size={14} />
                      Esta jornada
                    </span>
                  ) : selectedWeek < state.currentWeek ? (
                    <span className="status-badge missed">
                      Aplazado
                    </span>
                  ) : (
                    <span className="status-badge upcoming">
                      Por jugar
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
