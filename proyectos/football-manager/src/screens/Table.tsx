import { GameState } from '../types';
import { GameBrain } from '../core/GameBrain';
import { formatLeagueName, formatGroupName } from '../utils/formatters';

interface Props {
  gameState: GameState;
  gameBrain: GameBrain;
}

export function Table({ gameState, gameBrain }: Props) {
  const playerTeam = gameState.teams[gameState.playerTeamId];
  const league = playerTeam.league;
  const group = playerTeam.group;

  const table = gameBrain.getLeagueTable(league, group);

  return (
    <div className="table-screen">
      <h1>Clasificación</h1>
      <h2>{formatLeagueName(league)} - {formatGroupName(group)}</h2>

      <table className="league-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th>PJ</th>
            <th>V</th>
            <th>E</th>
            <th>D</th>
            <th>GF</th>
            <th>GC</th>
            <th>DG</th>
            <th>Pts</th>
            <th>Forma</th>
          </tr>
        </thead>
        <tbody>
          {table.map((team, index) => {
            const gd = team.seasonStats.goalsFor - team.seasonStats.goalsAgainst;
            const isPlayer = team.id === playerTeam.id;
            
            // Zone colors
            let zoneClass = '';
            if (index < 4) zoneClass = 'promotion';
            else if (index >= table.length - 4) zoneClass = 'relegation';

            return (
              <tr 
                key={team.id} 
                className={`${isPlayer ? 'player-team' : ''} ${zoneClass}`}
              >
                <td className="position">{index + 1}</td>
                <td className="team-name">{team.name}</td>
                <td>{team.seasonStats.played}</td>
                <td className="wins">{team.seasonStats.won}</td>
                <td className="draws">{team.seasonStats.drawn}</td>
                <td className="losses">{team.seasonStats.lost}</td>
                <td>{team.seasonStats.goalsFor}</td>
                <td>{team.seasonStats.goalsAgainst}</td>
                <td className={gd > 0 ? 'positive' : gd < 0 ? 'negative' : ''}>
                  {gd > 0 ? '+' : ''}{gd}
                </td>
                <td className="points">{team.seasonStats.points}</td>
                <td className="form">
                  {team.seasonStats.form.map((f, i) => (
                    <span key={i} className={`form-${f.toLowerCase()}`}>{f}</span>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="table-legend">
        <div className="legend-item">
          <span className="legend-color promotion"></span>
          <span>Ascenso</span>
        </div>
        <div className="legend-item">
          <span className="legend-color relegation"></span>
          <span>Descenso</span>
        </div>
      </div>
    </div>
  );
}
