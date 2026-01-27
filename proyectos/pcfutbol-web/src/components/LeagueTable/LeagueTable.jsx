import React from 'react';
import { useGame } from '../../context/GameContext';
import './LeagueTable.scss';

export default function LeagueTable() {
  const { state } = useGame();
  
  return (
    <div className="league-table">
      <h2>Clasificación - La Liga</h2>
      
      <div className="league-table__container">
        <div className="league-table__header">
          <span className="col-pos">#</span>
          <span className="col-team">EQUIPO</span>
          <span className="col-w">G</span>
          <span className="col-d">E</span>
          <span className="col-l">P</span>
          <span className="col-gd">DIF</span>
          <span className="col-pts">PTS</span>
          <span className="col-form">FORMA</span>
        </div>
        
        {state.leagueTable.map((team, idx) => (
          <div 
            key={team.teamId} 
            className={`league-table__row ${team.isPlayer ? 'is-player' : ''} ${idx < 4 ? 'ucl' : ''} ${idx >= state.leagueTable.length - 3 ? 'relegation' : ''}`}
          >
            <span className="col-pos">{idx + 1}</span>
            <span className="col-team">
              <span className="short">{team.shortName}</span>
              <span className="full">{team.teamName}</span>
            </span>
            <span className="col-w">{team.won}</span>
            <span className="col-d">{team.drawn}</span>
            <span className="col-l">{team.lost}</span>
            <span className="col-gd">{team.goalDifference > 0 ? '+' : ''}{team.goalDifference}</span>
            <span className="col-pts">{team.points}</span>
            <span className="col-form">
              {team.form.map((f, i) => (
                <span key={i} className={`form-dot ${f.toLowerCase()}`}>{f}</span>
              ))}
            </span>
          </div>
        ))}
      </div>
      
      <div className="league-table__legend">
        <span className="legend-item ucl">Champions</span>
        <span className="legend-item relegation">Descenso</span>
      </div>
    </div>
  );
}
