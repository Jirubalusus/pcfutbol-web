import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Trophy, ChevronDown, ChevronUp, Globe, RefreshCw } from 'lucide-react';
import { getLeagueTable, LEAGUE_CONFIG, initializeOtherLeagues, simulateOtherLeaguesWeek } from '../../game/multiLeagueEngine';
import './LeagueTable.scss';

// Configuración de zonas por liga (mantener para retrocompatibilidad)
const LEAGUE_ZONES = {
  laliga: {
    name: 'La Liga',
    champions: [1, 2, 3, 4],
    europaLeague: [5, 6],
    conference: [7],
    relegation: [18, 19, 20],
    teams: 20
  },
  segunda: {
    name: 'Segunda División',
    promotion: [1, 2],
    playoff: [3, 4, 5, 6],
    relegation: [20, 21, 22],
    teams: 22
  },
  primeraRFEF: {
    name: 'Primera Federación',
    isGroupLeague: true,
    promotion: [1],
    relegation: [], // Dynamic based on group size
    relegationFromBottom: 2, // Last 2 per group
    teams: 0 // Dynamic
  },
  segundaRFEF: {
    name: 'Segunda Federación',
    isGroupLeague: true,
    promotion: [1],
    relegation: [],
    teams: 0
  },
  premierLeague: {
    name: 'Premier League',
    champions: [1, 2, 3, 4],
    europaLeague: [5],
    conference: [6, 7],
    relegation: [18, 19, 20],
    teams: 20
  },
  serieA: {
    name: 'Serie A',
    champions: [1, 2, 3, 4],
    europaLeague: [5, 6],
    conference: [7],
    relegation: [18, 19, 20],
    teams: 20
  },
  bundesliga: {
    name: 'Bundesliga',
    champions: [1, 2, 3, 4],
    europaLeague: [5, 6],
    conference: [7],
    relegation: [16, 17, 18],
    teams: 18
  },
  ligue1: {
    name: 'Ligue 1',
    champions: [1, 2, 3],
    europaLeague: [4],
    conference: [5],
    relegation: [16, 17, 18],
    teams: 18
  }
};

// Banderas emoji por país
const COUNTRY_FLAGS = {
  laliga: '🇪🇸',
  segunda: '🇪🇸',
  primeraRFEF: '🇪🇸',
  segundaRFEF: '🇪🇸',
  premierLeague: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  serieA: '🇮🇹',
  bundesliga: '🇩🇪',
  ligue1: '🇫🇷'
};

export default function LeagueTable() {
  const { state, dispatch } = useGame();
  const playerLeagueId = state.playerLeagueId || 'laliga';
  const [selectedLeague, setSelectedLeague] = useState(playerLeagueId);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAllTeams, setShowAllTeams] = useState(false);
  
  // Inicializar otras ligas si no existen (para partidas antiguas)
  useEffect(() => {
    if (!state.gameStarted) return;
    
    // Verificar si necesitamos inicializar otras ligas
    const needsInit = !state.otherLeagues || Object.keys(state.otherLeagues).length === 0 ||
      Object.values(state.otherLeagues).every(l => {
        if (l.isGroupLeague) return !l.groups || Object.keys(l.groups).length === 0;
        return !l.table || l.table.length === 0;
      });
    
    if (needsInit) {
      console.log('Inicializando otras ligas...');
      const otherLeagues = initializeOtherLeagues(playerLeagueId);
      
      // Simular hasta la semana actual
      let simulatedLeagues = otherLeagues;
      for (let week = 1; week < (state.currentWeek || 1); week++) {
        simulatedLeagues = simulateOtherLeaguesWeek(simulatedLeagues, week);
      }
      
      dispatch({ type: 'SET_OTHER_LEAGUES', payload: simulatedLeagues });
    }
  }, [state.gameStarted, state.otherLeagues, playerLeagueId, state.currentWeek, dispatch]);
  
  // Detect if selected league is a group league
  const isGroupLeague = LEAGUE_ZONES[selectedLeague]?.isGroupLeague || 
    state.otherLeagues?.[selectedLeague]?.isGroupLeague ||
    LEAGUE_CONFIG[selectedLeague]?.isGroupLeague;
  
  // Get available groups for group leagues
  const playerGroupId = state.playerGroupId;
  const availableGroups = useMemo(() => {
    if (!isGroupLeague) return [];
    
    const leagueData = state.otherLeagues?.[selectedLeague];
    const groups = leagueData?.groups ? Object.keys(leagueData.groups) : [];
    
    // If this is the player's league and they have a group, include it
    if (selectedLeague === playerLeagueId && playerGroupId) {
      if (!groups.includes(playerGroupId)) {
        groups.push(playerGroupId);
      }
    }
    
    return groups.sort();
  }, [isGroupLeague, selectedLeague, playerLeagueId, playerGroupId, state.otherLeagues]);
  
  // Auto-select first group when switching to a group league
  useEffect(() => {
    if (isGroupLeague && availableGroups.length > 0 && !availableGroups.includes(selectedGroup)) {
      setSelectedGroup(availableGroups[0]);
    } else if (!isGroupLeague) {
      setSelectedGroup(null);
    }
  }, [isGroupLeague, availableGroups, selectedGroup]);
  
  // Obtener tabla según la liga seleccionada
  const table = useMemo(() => {
    if (isGroupLeague) {
      // Player's own group uses leagueTable (most up-to-date)
      if (selectedLeague === playerLeagueId && selectedGroup === playerGroupId) {
        return state.leagueTable || [];
      }
      
      // Other groups come from otherLeagues
      const leagueData = state.otherLeagues?.[selectedLeague];
      if (!leagueData?.groups || !selectedGroup) return [];
      return leagueData.groups[selectedGroup]?.table || [];
    }
    
    if (selectedLeague === playerLeagueId) {
      return state.leagueTable || [];
    }
    return state.otherLeagues?.[selectedLeague]?.table || [];
  }, [selectedLeague, selectedGroup, isGroupLeague, playerLeagueId, playerGroupId, state.leagueTable, state.otherLeagues]);
  
  const leagueConfig = LEAGUE_ZONES[selectedLeague] || LEAGUE_ZONES.laliga;
  const isPlayerLeague = selectedLeague === playerLeagueId;
  
  // Función para obtener la zona de una posición
  const getZone = (position) => {
    if (leagueConfig.champions?.includes(position)) return 'champions';
    if (leagueConfig.europaLeague?.includes(position)) return 'europa';
    if (leagueConfig.conference?.includes(position)) return 'conference';
    if (leagueConfig.promotion?.includes(position)) return 'promotion';
    if (leagueConfig.playoff?.includes(position)) return 'playoff';
    if (leagueConfig.relegation?.includes(position)) return 'relegation';
    // Dynamic relegation for group leagues (last N teams)
    if (leagueConfig.relegationFromBottom && table.length > 0) {
      if (position > table.length - leagueConfig.relegationFromBottom) return 'relegation';
    }
    return '';
  };
  
  // Función para generar iniciales estilizadas
  const getTeamInitials = (name) => {
    if (!name) return '??';
    const words = name.split(' ').filter(w => !['CF', 'FC', 'CD', 'UD', 'RC', 'SD', 'CA', 'Real', 'Atlético', 'Athletic', 'Deportivo'].includes(w));
    if (words.length === 0) return name.substring(0, 3).toUpperCase();
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };
  
  // Equipos a mostrar
  const displayedTeams = showAllTeams ? table : table.slice(0, 10);
  const playerPosition = table.findIndex(t => t.isPlayer) + 1;
  
  // Verificar si hay datos para la liga seleccionada
  const hasData = table.length > 0;

  return (
    <div className="league-table-v2">
      {/* Header con selector de liga */}
      <div className="league-table-v2__header">
        <h2>
          <Trophy size={24} />
          Clasificación
        </h2>
        
        <div className="league-selector">
          <select 
            value={selectedLeague} 
            onChange={(e) => {
              setSelectedLeague(e.target.value);
              setShowAllTeams(false);
              setSelectedGroup(null);
            }}
          >
            <optgroup label="🇪🇸 España">
              <option value="laliga">La Liga</option>
              <option value="segunda">Segunda División</option>
              <option value="primeraRFEF">Primera Federación</option>
              <option value="segundaRFEF">Segunda Federación</option>
            </optgroup>
            <optgroup label="🌍 Europa">
              <option value="premierLeague">{COUNTRY_FLAGS.premierLeague} Premier League</option>
              <option value="serieA">{COUNTRY_FLAGS.serieA} Serie A</option>
              <option value="bundesliga">{COUNTRY_FLAGS.bundesliga} Bundesliga</option>
              <option value="ligue1">{COUNTRY_FLAGS.ligue1} Ligue 1</option>
            </optgroup>
          </select>
        </div>
      </div>
      
      {/* Indicador si es la liga del jugador */}
      {isPlayerLeague && (
        <div className="league-table-v2__player-badge">
          ⭐ Tu liga
        </div>
      )}
      
      {/* Mensaje si no hay datos */}
      {!hasData && (
        <div className="league-table-v2__no-data">
          <Globe size={48} />
          <p>No hay datos disponibles para esta liga.</p>
          <p className="hint">Los datos se generarán al avanzar en la temporada.</p>
        </div>
      )}
      
      {/* Group tabs for group leagues */}
      {isGroupLeague && availableGroups.length > 0 && (
        <div className="league-table-v2__group-tabs">
          {availableGroups.map(groupId => (
            <button
              key={groupId}
              className={`group-tab ${selectedGroup === groupId ? 'active' : ''}`}
              onClick={() => { setSelectedGroup(groupId); setShowAllTeams(false); }}
            >
              {groupId.replace('grupo', 'Grupo ')}
            </button>
          ))}
        </div>
      )}

      {hasData && (
        <>
          {/* Leyenda de zonas */}
          <div className="league-table-v2__legend">
            {leagueConfig.champions && (
              <span className="legend-item champions">
                <span className="dot"></span> Champions League
              </span>
            )}
            {leagueConfig.europaLeague && (
              <span className="legend-item europa">
                <span className="dot"></span> Europa League
              </span>
            )}
            {leagueConfig.conference && (
              <span className="legend-item conference">
                <span className="dot"></span> Conference League
              </span>
            )}
            {leagueConfig.promotion && (
              <span className="legend-item promotion">
                <span className="dot"></span> Ascenso directo
              </span>
            )}
            {leagueConfig.playoff && (
              <span className="legend-item playoff">
                <span className="dot"></span> Playoff ascenso
              </span>
            )}
            <span className="legend-item relegation">
              <span className="dot"></span> Descenso
            </span>
          </div>
          
          {/* Tabla */}
          <div className="league-table-v2__table">
            <div className="table-header">
              <span className="col-pos">#</span>
              <span className="col-team">Equipo</span>
              <span className="col-pj">PJ</span>
              <span className="col-w">G</span>
              <span className="col-d">E</span>
              <span className="col-l">P</span>
              <span className="col-gf">GF</span>
              <span className="col-ga">GC</span>
              <span className="col-gd">DIF</span>
              <span className="col-pts">PTS</span>
              <span className="col-form">Forma</span>
            </div>
            
            <div className="table-body">
              {displayedTeams.map((team, idx) => {
                const position = idx + 1;
                const zone = getZone(position);
                
                return (
                  <div 
                    key={team.teamId} 
                    className={`table-row ${zone} ${team.isPlayer ? 'is-player' : ''}`}
                  >
                    <span className="col-pos">
                      <span className={`pos-badge ${zone}`}>{position}</span>
                    </span>
                    <span className="col-team">
                      <span className="team-badge">
                        {getTeamInitials(team.teamName)}
                      </span>
                      <span className="team-name">{team.teamName}</span>
                    </span>
                    <span className="col-pj">{team.played || 0}</span>
                    <span className="col-w">{team.won}</span>
                    <span className="col-d">{team.drawn}</span>
                    <span className="col-l">{team.lost}</span>
                    <span className="col-gf">{team.goalsFor || 0}</span>
                    <span className="col-ga">{team.goalsAgainst || 0}</span>
                    <span className={`col-gd ${team.goalDifference > 0 ? 'positive' : team.goalDifference < 0 ? 'negative' : ''}`}>
                      {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                    </span>
                    <span className="col-pts">{team.points}</span>
                    <span className="col-form">
                      {(team.form || []).slice(-5).map((f, i) => (
                        <span key={i} className={`form-dot form-${f?.toLowerCase()}`}>
                          {f}
                        </span>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Separador si hay más equipos */}
            {!showAllTeams && table.length > 10 && (
              <>
                {/* Mostrar posición del jugador si está fuera del top 10 */}
                {isPlayerLeague && playerPosition > 10 && (
                  <div className="player-position-indicator">
                    <span className="dots">···</span>
                    <div className={`table-row is-player ${getZone(playerPosition)}`}>
                      <span className="col-pos">
                        <span className={`pos-badge ${getZone(playerPosition)}`}>{playerPosition}</span>
                      </span>
                      <span className="col-team">
                        <span className="team-badge">
                          {getTeamInitials(table[playerPosition - 1]?.teamName)}
                        </span>
                        <span className="team-name">{table[playerPosition - 1]?.teamName}</span>
                      </span>
                      <span className="col-pj">{table[playerPosition - 1]?.played || 0}</span>
                      <span className="col-w">{table[playerPosition - 1]?.won}</span>
                      <span className="col-d">{table[playerPosition - 1]?.drawn}</span>
                      <span className="col-l">{table[playerPosition - 1]?.lost}</span>
                      <span className="col-gf">{table[playerPosition - 1]?.goalsFor || 0}</span>
                      <span className="col-ga">{table[playerPosition - 1]?.goalsAgainst || 0}</span>
                      <span className="col-gd">{table[playerPosition - 1]?.goalDifference > 0 ? '+' : ''}{table[playerPosition - 1]?.goalDifference}</span>
                      <span className="col-pts">{table[playerPosition - 1]?.points}</span>
                      <span className="col-form">
                        {(table[playerPosition - 1]?.form || []).slice(-5).map((f, i) => (
                          <span key={i} className={`form-dot form-${f?.toLowerCase()}`}>{f}</span>
                        ))}
                      </span>
                    </div>
                    <span className="dots">···</span>
                  </div>
                )}
                
                <button className="show-more-btn" onClick={() => setShowAllTeams(true)}>
                  <ChevronDown size={16} />
                  Ver todos los equipos ({table.length})
                </button>
              </>
            )}
            
            {showAllTeams && table.length > 10 && (
              <button className="show-more-btn" onClick={() => setShowAllTeams(false)}>
                <ChevronUp size={16} />
                Ver menos
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
