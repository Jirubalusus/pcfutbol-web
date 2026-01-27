import { useState } from 'react';
import { Team, Player } from '../types';
import { GameBrain } from '../core/GameBrain';

interface Props {
  team: Team;
  players: { [id: string]: Player };
  gameBrain: GameBrain;
}

type SortKey = 'name' | 'position' | 'age' | 'overall' | 'value';

export function Squad({ team, players, gameBrain }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('overall');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const squadPlayers = team.playerIds
    .map(id => players[id])
    .filter(Boolean)
    .sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'position':
          comparison = a.position.localeCompare(b.position);
          break;
        case 'age':
          comparison = a.age - b.age;
          break;
        case 'overall':
          comparison = a.overall - b.overall;
          break;
        case 'value':
          comparison = a.marketValue - b.marketValue;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const positionOrder = ['GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST', 'CF'];

  return (
    <div className="squad-screen">
      <h1>Plantilla</h1>

      <div className="squad-container">
        <table className="squad-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                Nombre {sortKey === 'name' && (sortAsc ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('position')} className="sortable">
                Pos {sortKey === 'position' && (sortAsc ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('age')} className="sortable">
                Edad {sortKey === 'age' && (sortAsc ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('overall')} className="sortable">
                Media {sortKey === 'overall' && (sortAsc ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('value')} className="sortable">
                Valor {sortKey === 'value' && (sortAsc ? '↑' : '↓')}
              </th>
              <th>Estado</th>
              <th>Stats</th>
            </tr>
          </thead>
          <tbody>
            {squadPlayers.map(player => (
              <tr 
                key={player.id} 
                onClick={() => setSelectedPlayer(player)}
                className={`
                  ${selectedPlayer?.id === player.id ? 'selected' : ''}
                  ${player.injured ? 'injured' : ''}
                  ${player.suspended ? 'suspended' : ''}
                `}
              >
                <td className="name">{player.name}</td>
                <td className="position">
                  <span className={`pos-badge pos-${player.position.toLowerCase()}`}>
                    {player.position}
                  </span>
                </td>
                <td>{player.age}</td>
                <td className="overall">
                  <span className={`overall-badge ov-${Math.floor(player.overall / 10) * 10}`}>
                    {player.overall}
                  </span>
                </td>
                <td className="value">{player.marketValueDisplay || formatValue(player.marketValue)}</td>
                <td className="status">
                  {player.injured && '🤕'}
                  {player.suspended && '🟥'}
                  {player.condition < 50 && '😓'}
                  {!player.injured && !player.suspended && player.condition >= 50 && '✅'}
                </td>
                <td className="stats">
                  {player.seasonStats.goals > 0 && `⚽${player.seasonStats.goals}`}
                  {player.seasonStats.assists > 0 && ` 🅰️${player.seasonStats.assists}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Player detail panel */}
        {selectedPlayer && (
          <div className="player-detail">
            <h2>{selectedPlayer.name}</h2>
            <div className="player-info">
              <p><strong>Posición:</strong> {selectedPlayer.position} ({selectedPlayer.positionOriginal})</p>
              <p><strong>Edad:</strong> {selectedPlayer.age}</p>
              <p><strong>Nacionalidad:</strong> {selectedPlayer.nationalities.join(', ')}</p>
              <p><strong>Media:</strong> {selectedPlayer.overall}</p>
              <p><strong>Potencial:</strong> {selectedPlayer.potential}</p>
              <p><strong>Valor:</strong> {selectedPlayer.marketValueDisplay}</p>
              <p><strong>Salario:</strong> {selectedPlayer.salary.toLocaleString('es-ES')} €/semana</p>
              <p><strong>Contrato hasta:</strong> {new Date(selectedPlayer.contractEnd).toLocaleDateString('es-ES')}</p>
            </div>

            <h3>Atributos</h3>
            <div className="attributes-grid">
              {Object.entries(selectedPlayer.attributes)
                .filter(([_, v]) => v !== undefined)
                .map(([key, value]) => (
                  <div key={key} className="attribute">
                    <span className="attr-name">{formatAttrName(key)}</span>
                    <div className="attr-bar">
                      <div 
                        className="attr-fill" 
                        style={{ width: `${value}%`, backgroundColor: getAttrColor(value as number) }}
                      />
                    </div>
                    <span className="attr-value">{value}</span>
                  </div>
                ))}
            </div>

            <h3>Estadísticas temporada</h3>
            <div className="season-stats">
              <p>Partidos: {selectedPlayer.seasonStats.appearances}</p>
              <p>Goles: {selectedPlayer.seasonStats.goals}</p>
              <p>Asistencias: {selectedPlayer.seasonStats.assists}</p>
              <p>Amarillas: {selectedPlayer.seasonStats.yellowCards}</p>
              <p>Rojas: {selectedPlayer.seasonStats.redCards}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)} mill. €`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)} mil €`;
  return `${value} €`;
}

function formatAttrName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase());
}

function getAttrColor(value: number): string {
  if (value >= 80) return '#22c55e';
  if (value >= 70) return '#84cc16';
  if (value >= 60) return '#eab308';
  if (value >= 50) return '#f97316';
  return '#ef4444';
}
