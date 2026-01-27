import { useState } from 'react';
import { formatMarketValue } from '../utils/formatters';

interface TeamData {
  id: string;
  name: string;
  league: string;
  group: string;
  marketValue: number;
  marketValueDisplay: string;
}

interface Props {
  teams: TeamData[];
  onSelect: (teamId: string, playerName: string) => void;
  onBack: () => void;
}

export function TeamSelection({ teams, onSelect, onBack }: Props) {
  const [selectedLeague, setSelectedLeague] = useState<string>('primeraFederacion');
  const [selectedGroup, setSelectedGroup] = useState<string>('E3G1');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');

  const leagues = [
    { id: 'primeraFederacion', name: 'Primera Federación', groups: ['E3G1', 'E3G2'] },
    { id: 'segundaFederacion', name: 'Segunda Federación', groups: ['E4G1', 'E4G2', 'E4G3', 'E4G4', 'E4G5'] },
  ];

  const filteredTeams = teams.filter(t => t.league === selectedLeague && t.group === selectedGroup);

  const canStart = selectedTeam && playerName.trim().length > 0;

  return (
    <div className="team-selection">
      <header>
        <button className="back-btn" onClick={onBack}>← Volver</button>
        <h1>Selecciona tu equipo</h1>
      </header>

      <div className="selection-container">
        {/* League selection */}
        <div className="league-select">
          <h2>Liga</h2>
          <div className="league-buttons">
            {leagues.map(league => (
              <button
                key={league.id}
                className={selectedLeague === league.id ? 'active' : ''}
                onClick={() => {
                  setSelectedLeague(league.id);
                  setSelectedGroup(league.groups[0]);
                  setSelectedTeam('');
                }}
              >
                {league.name}
              </button>
            ))}
          </div>
        </div>

        {/* Group selection */}
        <div className="group-select">
          <h2>Grupo</h2>
          <div className="group-buttons">
            {leagues.find(l => l.id === selectedLeague)?.groups.map(groupId => (
              <button
                key={groupId}
                className={selectedGroup === groupId ? 'active' : ''}
                onClick={() => {
                  setSelectedGroup(groupId);
                  setSelectedTeam('');
                }}
              >
                {groupId.replace('E3G', 'Grupo ').replace('E4G', 'Grupo ')}
              </button>
            ))}
          </div>
        </div>

        {/* Team list */}
        <div className="team-list">
          <h2>Equipos ({filteredTeams.length})</h2>
          <div className="teams-grid">
            {filteredTeams
              .sort((a, b) => b.marketValue - a.marketValue)
              .map(team => (
                <div
                  key={team.id}
                  className={`team-card ${selectedTeam === team.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTeam(team.id)}
                >
                  <h3>{team.name}</h3>
                  <p className="market-value">{team.marketValueDisplay || formatMarketValue(team.marketValue)}</p>
                </div>
              ))}
          </div>
        </div>

        {/* Manager name */}
        {selectedTeam && (
          <div className="manager-input">
            <h2>Tu nombre</h2>
            <input
              type="text"
              placeholder="Nombre del entrenador"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={30}
            />
          </div>
        )}

        {/* Start button */}
        <div className="start-section">
          <button
            className="start-btn"
            disabled={!canStart}
            onClick={() => onSelect(selectedTeam, playerName)}
          >
            🚀 Comenzar carrera
          </button>
        </div>
      </div>
    </div>
  );
}
