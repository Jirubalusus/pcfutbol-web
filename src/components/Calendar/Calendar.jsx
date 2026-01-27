import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import './Calendar.scss';

export default function Calendar() {
  const { state } = useGame();
  const [selectedWeek, setSelectedWeek] = useState(state.currentWeek);
  
  const totalWeeks = Math.max(...state.fixtures.map(f => f.week));
  const weekFixtures = state.fixtures.filter(f => f.week === selectedWeek);
  
  const getTeamName = (teamId) => {
    const team = state.leagueTable.find(t => t.teamId === teamId);
    return team?.teamName || teamId;
  };
  
  const isPlayerMatch = (fixture) => {
    return fixture.homeTeam === state.teamId || fixture.awayTeam === state.teamId;
  };
  
  return (
    <div className="calendar">
      <h2>Calendario - Temporada {state.currentSeason}</h2>
      
      <div className="calendar__week-selector">
        <button 
          onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
          disabled={selectedWeek <= 1}
        >
          ←
        </button>
        <span>Jornada {selectedWeek}</span>
        <button 
          onClick={() => setSelectedWeek(Math.min(totalWeeks, selectedWeek + 1))}
          disabled={selectedWeek >= totalWeeks}
        >
          →
        </button>
      </div>
      
      <div className="calendar__week-nav">
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(week => (
          <button
            key={week}
            className={`calendar__week-btn ${week === selectedWeek ? 'active' : ''} ${week === state.currentWeek ? 'current' : ''} ${week < state.currentWeek ? 'past' : ''}`}
            onClick={() => setSelectedWeek(week)}
          >
            {week}
          </button>
        ))}
      </div>
      
      <div className="calendar__fixtures">
        {weekFixtures.map((fixture, idx) => (
          <div 
            key={idx} 
            className={`calendar__fixture ${isPlayerMatch(fixture) ? 'player-match' : ''}`}
          >
            <div className="teams">
              <span className={`team home ${fixture.homeTeam === state.teamId ? 'is-player' : ''}`}>
                {getTeamName(fixture.homeTeam)}
              </span>
              <span className="vs">
                {fixture.played 
                  ? `${fixture.homeScore} - ${fixture.awayScore}`
                  : 'vs'
                }
              </span>
              <span className={`team away ${fixture.awayTeam === state.teamId ? 'is-player' : ''}`}>
                {getTeamName(fixture.awayTeam)}
              </span>
            </div>
            {fixture.played && (
              <span className="status played">Jugado</span>
            )}
            {!fixture.played && fixture.week === state.currentWeek && (
              <span className="status pending">Por jugar</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
