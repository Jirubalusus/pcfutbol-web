import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Trophy, ChevronDown, ChevronUp, Globe, RefreshCw } from 'lucide-react';
import { getLeagueTable, LEAGUE_CONFIG, initializeOtherLeagues, simulateOtherLeaguesWeek, isAperturaClausura, computeAccumulatedTable } from '../../game/multiLeagueEngine';
import { sortTable } from '../../game/leagueEngine';
import './LeagueTable.scss';

// Configuración de zonas por liga
const LEAGUE_ZONES = {
  // === ESPAÑA ===
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
    relegation: [19, 20, 21, 22],
    teams: 22
  },
  primeraRFEF: {
    name: 'Primera Federación',
    isGroupLeague: true,
    promotion: [1],
    playoff: [2, 3, 4, 5],
    relegation: [],
    relegationFromBottom: 5,
    teams: 0
  },
  segundaRFEF: {
    name: 'Segunda Federación',
    isGroupLeague: true,
    promotion: [1],
    playoff: [2, 3, 4, 5],
    relegation: [],
    teams: 0
  },
  // === TOP 5 LIGAS ===
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
  },
  // === SEGUNDAS DIVISIONES ===
  championship: {
    name: 'Championship',
    promotion: [1, 2],
    playoff: [3, 4, 5, 6],
    relegation: [22, 23, 24],
    teams: 24
  },
  serieB: {
    name: 'Serie B',
    promotion: [1, 2],
    playoff: [3, 4, 5, 6, 7, 8],
    relegation: [18, 19, 20],
    teams: 20
  },
  bundesliga2: {
    name: '2. Bundesliga',
    promotion: [1, 2],
    playoff: [3],
    relegation: [16, 17, 18],
    teams: 18
  },
  ligue2: {
    name: 'Ligue 2',
    promotion: [1, 2],
    playoff: [3, 4, 5],
    relegation: [16, 17, 18],
    teams: 18
  },
  // === OTRAS LIGAS EUROPEAS ===
  eredivisie: {
    name: 'Eredivisie',
    champions: [1],
    europaLeague: [2, 3],
    conference: [4],
    relegation: [16, 17, 18],
    teams: 18
  },
  primeiraLiga: {
    name: 'Primeira Liga',
    champions: [1],
    europaLeague: [2, 3],
    conference: [4],
    relegation: [16, 17, 18],
    teams: 18
  },
  belgianPro: {
    name: 'Jupiler Pro League',
    champions: [1],
    europaLeague: [2],
    conference: [3],
    relegation: [15, 16],
    teams: 16
  },
  superLig: {
    name: 'Süper Lig',
    champions: [1],
    europaLeague: [2, 3],
    conference: [4],
    relegation: [16, 17, 18],
    teams: 18
  },
  scottishPrem: {
    name: 'Scottish Premiership',
    champions: [1],
    europaLeague: [2],
    conference: [3],
    relegation: [11, 12],
    teams: 12
  },
  swissSuperLeague: {
    name: 'Super League',
    champions: [1],
    europaLeague: [2],
    conference: [3],
    relegation: [11, 12],
    teams: 12
  },
  austrianBundesliga: {
    name: 'Bundesliga (AT)',
    champions: [1],
    europaLeague: [2],
    conference: [3],
    relegation: [11, 12],
    teams: 12
  },
  greekSuperLeague: {
    name: 'Super League',
    champions: [1],
    europaLeague: [2],
    conference: [3],
    relegation: [13, 14],
    teams: 14
  },
  danishSuperliga: {
    name: 'Superligaen',
    champions: [1],
    europaLeague: [2],
    conference: [3],
    relegation: [11, 12],
    teams: 12
  },
  croatianLeague: {
    name: 'HNL',
    champions: [1],
    europaLeague: [2],
    conference: [3],
    relegation: [9, 10],
    teams: 10
  },
  czechLeague: {
    name: 'Chance Liga',
    champions: [1],
    europaLeague: [2],
    conference: [3],
    relegation: [15, 16],
    teams: 16
  },
  // === SOUTH AMERICA ===
  argentinaPrimera: {
    name: 'Liga Profesional',
    libertadores: [1, 2, 3, 4],
    sudamericana: [5, 6],
    relegation: [25, 26, 27, 28],
    teams: 28
  },
  brasileiraoA: {
    name: 'Série A',
    libertadores: [1, 2, 3, 4],
    sudamericana: [5, 6, 7, 8],
    relegation: [17, 18, 19, 20],
    teams: 20
  },
  colombiaPrimera: {
    name: 'Liga BetPlay',
    libertadores: [1, 2, 3],
    sudamericana: [4, 5, 6],
    relegation: [18, 19, 20],
    teams: 20
  },
  chilePrimera: {
    name: 'Primera División (CL)',
    libertadores: [1, 2],
    sudamericana: [3, 4],
    relegation: [14, 15, 16],
    teams: 16
  },
  uruguayPrimera: {
    name: 'Primera División (UY)',
    libertadores: [1, 2],
    sudamericana: [3, 4],
    relegation: [14, 15, 16],
    teams: 16
  },
  ecuadorLigaPro: {
    name: 'LigaPro',
    libertadores: [1, 2],
    sudamericana: [3, 4],
    relegation: [14, 15, 16],
    teams: 16
  },
  paraguayPrimera: {
    name: 'División de Honor',
    libertadores: [1],
    sudamericana: [2, 3],
    relegation: [11, 12],
    teams: 12
  },
  peruLiga1: {
    name: 'Liga 1',
    libertadores: [1, 2],
    sudamericana: [3, 4],
    relegation: [16, 17, 18],
    teams: 18
  },
  boliviaPrimera: {
    name: 'División Profesional',
    libertadores: [1],
    sudamericana: [2, 3],
    relegation: [14, 15, 16],
    teams: 16
  },
  venezuelaPrimera: {
    name: 'Liga FUTVE',
    libertadores: [1, 2],
    sudamericana: [3, 4],
    relegation: [16, 17, 18],
    teams: 18
  }
};

// Banderas emoji por país
const COUNTRY_FLAGS = {
  laliga: '🇪🇸', segunda: '🇪🇸', primeraRFEF: '🇪🇸', segundaRFEF: '🇪🇸',
  premierLeague: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', championship: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  serieA: '🇮🇹', serieB: '🇮🇹',
  bundesliga: '🇩🇪', bundesliga2: '🇩🇪',
  ligue1: '🇫🇷', ligue2: '🇫🇷',
  eredivisie: '🇳🇱', primeiraLiga: '🇵🇹', belgianPro: '🇧🇪',
  superLig: '🇹🇷', scottishPrem: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  swissSuperLeague: '🇨🇭', austrianBundesliga: '🇦🇹',
  greekSuperLeague: '🇬🇷', danishSuperliga: '🇩🇰',
  croatianLeague: '🇭🇷', czechLeague: '🇨🇿',
  // South America
  argentinaPrimera: '🇦🇷', brasileiraoA: '🇧🇷', colombiaPrimera: '🇨🇴',
  chilePrimera: '🇨🇱', uruguayPrimera: '🇺🇾', ecuadorLigaPro: '🇪🇨',
  paraguayPrimera: '🇵🇾', peruLiga1: '🇵🇪', boliviaPrimera: '🇧🇴',
  venezuelaPrimera: '🇻🇪'
};

export default function LeagueTable() {
  const { state, dispatch } = useGame();
  const playerLeagueId = state.playerLeagueId || 'laliga';
  const [selectedLeague, setSelectedLeague] = useState(playerLeagueId);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [tournamentTab, setTournamentTab] = useState('current'); // 'apertura' | 'clausura' | 'acumulada' | 'current'
  
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
      const otherLeagues = initializeOtherLeagues(playerLeagueId, state.playerGroupId);
      
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
  
  // Apertura-Clausura detection
  const isAPCL = isAperturaClausura(selectedLeague);
  
  // Get AP-CL data for selected league
  const apclData = useMemo(() => {
    if (!isAPCL) return null;
    
    if (selectedLeague === playerLeagueId) {
      return {
        aperturaTable: state.aperturaTable,
        currentTournament: state.currentTournament || 'apertura',
        currentTable: state.leagueTable || []
      };
    }
    
    const leagueData = state.otherLeagues?.[selectedLeague];
    if (!leagueData) return null;
    return {
      aperturaTable: leagueData.aperturaTable,
      accumulatedTable: leagueData.accumulatedTable,
      currentTournament: leagueData.currentTournament || 'apertura',
      currentTable: leagueData.table || []
    };
  }, [isAPCL, selectedLeague, playerLeagueId, state.aperturaTable, state.currentTournament, state.leagueTable, state.otherLeagues]);
  
  // Compute the displayed table based on tournament tab
  const displayTable = useMemo(() => {
    if (!isAPCL || !apclData) return table;
    
    const activeTab = tournamentTab === 'current' 
      ? apclData.currentTournament 
      : tournamentTab;
    
    if (activeTab === 'apertura') {
      if (apclData.currentTournament === 'apertura') {
        return apclData.currentTable; // Apertura in progress
      }
      return apclData.aperturaTable || []; // Frozen apertura
    }
    
    if (activeTab === 'clausura') {
      if (apclData.currentTournament === 'clausura') {
        return apclData.currentTable; // Clausura in progress
      }
      return []; // Not started yet
    }
    
    if (activeTab === 'acumulada') {
      // For other leagues, use stored accumulated table
      if (apclData.accumulatedTable) {
        return apclData.accumulatedTable;
      }
      // For player's league, compute on the fly
      if (apclData.aperturaTable) {
        return computeAccumulatedTable(apclData.aperturaTable, apclData.currentTable);
      }
      return apclData.currentTable; // Still in apertura, accumulated = current
    }
    
    return table;
  }, [isAPCL, apclData, tournamentTab, table]);
  
  // Reset tournament tab when switching leagues
  useEffect(() => {
    setTournamentTab('current');
  }, [selectedLeague]);
  
  const leagueConfig = LEAGUE_ZONES[selectedLeague] || LEAGUE_ZONES.laliga;
  const isPlayerLeague = selectedLeague === playerLeagueId;
  
  // Determine effective active tab for zone display
  const effectiveTab = isAPCL 
    ? (tournamentTab === 'current' ? (apclData?.currentTournament || 'apertura') : tournamentTab) 
    : null;
  const showZones = !isAPCL || effectiveTab === 'acumulada';
  
  // Función para obtener la zona de una posición
  const getZone = (position) => {
    // For AP-CL, only show classification zones in accumulated table
    if (isAPCL && !showZones) return '';
    
    if (leagueConfig.champions?.includes(position)) return 'champions';
    if (leagueConfig.libertadores?.includes(position)) return 'champions'; // Same color as CL
    if (leagueConfig.europaLeague?.includes(position)) return 'europa';
    if (leagueConfig.sudamericana?.includes(position)) return 'europa'; // Same color as EL
    if (leagueConfig.conference?.includes(position)) return 'conference';
    if (leagueConfig.promotion?.includes(position)) return 'promotion';
    if (leagueConfig.playoff?.includes(position)) return 'playoff';
    if (leagueConfig.relegation?.includes(position)) return 'relegation';
    // Dynamic relegation for group leagues (last N teams)
    if (leagueConfig.relegationFromBottom && displayTable.length > 0) {
      if (position > displayTable.length - leagueConfig.relegationFromBottom) return 'relegation';
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
  
  // Use displayTable for AP-CL, fall back to table for standard
  const activeTable = isAPCL ? displayTable : table;
  
  // Equipos a mostrar
  const displayedTeams = showAllTeams ? activeTable : activeTable.slice(0, 10);
  const playerPosition = activeTable.findIndex(t => t.isPlayer) + 1;
  
  // Verificar si hay datos para la liga seleccionada
  const hasData = activeTable.length > 0;

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
            <optgroup label="🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra">
              <option value="premierLeague">Premier League</option>
              <option value="championship">Championship</option>
            </optgroup>
            <optgroup label="🇮🇹 Italia">
              <option value="serieA">Serie A</option>
              <option value="serieB">Serie B</option>
            </optgroup>
            <optgroup label="🇩🇪 Alemania">
              <option value="bundesliga">Bundesliga</option>
              <option value="bundesliga2">2. Bundesliga</option>
            </optgroup>
            <optgroup label="🇫🇷 Francia">
              <option value="ligue1">Ligue 1</option>
              <option value="ligue2">Ligue 2</option>
            </optgroup>
            <optgroup label="Resto de Europa">
              <option value="eredivisie">🇳🇱 Eredivisie</option>
              <option value="primeiraLiga">🇵🇹 Primeira Liga</option>
              <option value="belgianPro">🇧🇪 Jupiler Pro League</option>
              <option value="superLig">🇹🇷 Süper Lig</option>
              <option value="scottishPrem">🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish Prem</option>
              <option value="swissSuperLeague">🇨🇭 Super League</option>
              <option value="austrianBundesliga">🇦🇹 Bundesliga (AT)</option>
              <option value="greekSuperLeague">🇬🇷 Super League</option>
              <option value="danishSuperliga">🇩🇰 Superligaen</option>
              <option value="croatianLeague">🇭🇷 HNL</option>
              <option value="czechLeague">🇨🇿 Chance Liga</option>
            </optgroup>
            <optgroup label="🌎 Sudamérica">
              <option value="argentinaPrimera">🇦🇷 Liga Profesional</option>
              <option value="brasileiraoA">🇧🇷 Série A</option>
              <option value="colombiaPrimera">🇨🇴 Liga BetPlay</option>
              <option value="chilePrimera">🇨🇱 Primera División</option>
              <option value="uruguayPrimera">🇺🇾 Primera División</option>
              <option value="ecuadorLigaPro">🇪🇨 LigaPro</option>
              <option value="paraguayPrimera">🇵🇾 División de Honor</option>
              <option value="peruLiga1">🇵🇪 Liga 1</option>
              <option value="boliviaPrimera">🇧🇴 Div. Profesional</option>
              <option value="venezuelaPrimera">🇻🇪 Liga FUTVE</option>
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

      {/* Apertura-Clausura tournament tabs */}
      {isAPCL && hasData && (
        <div className="league-table-v2__tournament-tabs">
          <div className="tournament-indicator">
            🏆 {apclData?.currentTournament === 'apertura' ? 'Apertura' : 'Clausura'} en curso
          </div>
          <div className="tournament-tab-buttons">
            <button
              className={`tournament-tab ${(tournamentTab === 'current' ? apclData?.currentTournament : tournamentTab) === 'apertura' ? 'active' : ''} ${apclData?.currentTournament === 'apertura' ? 'is-live' : ''}`}
              onClick={() => setTournamentTab('apertura')}
            >
              Apertura
              {apclData?.currentTournament === 'apertura' && <span className="live-dot" />}
            </button>
            <button
              className={`tournament-tab ${(tournamentTab === 'current' ? apclData?.currentTournament : tournamentTab) === 'clausura' ? 'active' : ''} ${apclData?.currentTournament === 'clausura' ? 'is-live' : ''}`}
              onClick={() => setTournamentTab('clausura')}
              disabled={apclData?.currentTournament === 'apertura'}
            >
              Clausura
              {apclData?.currentTournament === 'clausura' && <span className="live-dot" />}
            </button>
            <button
              className={`tournament-tab ${(tournamentTab === 'current' ? '' : tournamentTab) === 'acumulada' ? 'active' : ''}`}
              onClick={() => setTournamentTab('acumulada')}
              disabled={apclData?.currentTournament === 'apertura'}
            >
              Acumulada
            </button>
          </div>
        </div>
      )}

      {hasData && (
        <>
          {/* Leyenda de zonas */}
          <div className="league-table-v2__legend">
            {leagueConfig.champions && showZones && (
              <span className="legend-item champions">
                <span className="dot"></span> Champions League
              </span>
            )}
            {leagueConfig.libertadores && showZones && (
              <span className="legend-item champions">
                <span className="dot"></span> Libertadores
              </span>
            )}
            {leagueConfig.europaLeague && showZones && (
              <span className="legend-item europa">
                <span className="dot"></span> Europa League
              </span>
            )}
            {leagueConfig.sudamericana && showZones && (
              <span className="legend-item europa">
                <span className="dot"></span> Sudamericana
              </span>
            )}
            {leagueConfig.conference && showZones && (
              <span className="legend-item conference">
                <span className="dot"></span> Conference League
              </span>
            )}
            {leagueConfig.promotion && showZones && (
              <span className="legend-item promotion">
                <span className="dot"></span> Ascenso directo
              </span>
            )}
            {leagueConfig.playoff && showZones && (
              <span className="legend-item playoff">
                <span className="dot"></span> Playoff ascenso
              </span>
            )}
            {showZones && (
              <span className="legend-item relegation">
                <span className="dot"></span> Descenso
              </span>
            )}
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
                      <span className="team-info">
                        <span className="team-name">{team.teamName}</span>
                        {(team.form || []).length > 0 && (
                          <span className="team-form-mobile">
                            {(team.form || []).slice(-5).map((f, i) => (
                              <span key={i} className={`form-pip form-${f?.toLowerCase()}`} />
                            ))}
                          </span>
                        )}
                      </span>
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
            {!showAllTeams && activeTable.length > 10 && (
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
                          {getTeamInitials(activeTable[playerPosition - 1]?.teamName)}
                        </span>
                        <span className="team-name">{activeTable[playerPosition - 1]?.teamName}</span>
                      </span>
                      <span className="col-pj">{activeTable[playerPosition - 1]?.played || 0}</span>
                      <span className="col-w">{activeTable[playerPosition - 1]?.won}</span>
                      <span className="col-d">{activeTable[playerPosition - 1]?.drawn}</span>
                      <span className="col-l">{activeTable[playerPosition - 1]?.lost}</span>
                      <span className="col-gf">{activeTable[playerPosition - 1]?.goalsFor || 0}</span>
                      <span className="col-ga">{activeTable[playerPosition - 1]?.goalsAgainst || 0}</span>
                      <span className="col-gd">{activeTable[playerPosition - 1]?.goalDifference > 0 ? '+' : ''}{activeTable[playerPosition - 1]?.goalDifference}</span>
                      <span className="col-pts">{activeTable[playerPosition - 1]?.points}</span>
                      <span className="col-form">
                        {(activeTable[playerPosition - 1]?.form || []).slice(-5).map((f, i) => (
                          <span key={i} className={`form-dot form-${f?.toLowerCase()}`}>{f}</span>
                        ))}
                      </span>
                    </div>
                    <span className="dots">···</span>
                  </div>
                )}
                
                <button className="show-more-btn" onClick={() => setShowAllTeams(true)}>
                  <ChevronDown size={16} />
                  Ver todos los equipos ({activeTable.length})
                </button>
              </>
            )}
            
            {showAllTeams && activeTable.length > 10 && (
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
