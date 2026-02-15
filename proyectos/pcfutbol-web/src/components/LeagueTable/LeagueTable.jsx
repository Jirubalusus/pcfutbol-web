import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Trophy, ChevronDown, ChevronUp, Globe, RefreshCw } from 'lucide-react';
import { getLeagueTable, LEAGUE_CONFIG, initializeOtherLeagues, simulateOtherLeaguesWeek, isAperturaClausura, computeAccumulatedTable } from '../../game/multiLeagueEngine';
import { sortTable } from '../../game/leagueEngine';
import { useTranslation } from 'react-i18next';
import CustomSelect from '../common/CustomSelect/CustomSelect';
import './LeagueTable.scss';

// Configuración de zonas por liga
const LEAGUE_ZONES = {
  // === ESPAÑA ===
  laliga: {
    name: 'Liga Ibérica',
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
    name: 'First League',
    champions: [1, 2, 3, 4],
    europaLeague: [5],
    conference: [6, 7],
    relegation: [18, 19, 20],
    teams: 20
  },
  serieA: {
    name: 'Calcio League',
    champions: [1, 2, 3, 4],
    europaLeague: [5, 6],
    conference: [7],
    relegation: [18, 19, 20],
    teams: 20
  },
  bundesliga: {
    name: 'Erste Liga',
    champions: [1, 2, 3, 4],
    europaLeague: [5, 6],
    conference: [7],
    relegation: [16, 17, 18],
    teams: 18
  },
  ligue1: {
    name: 'Division Première',
    champions: [1, 2, 3],
    europaLeague: [4],
    conference: [5],
    relegation: [16, 17, 18],
    teams: 18
  },
  // === SEGUNDAS DIVISIONES ===
  championship: {
    name: 'Second League',
    promotion: [1, 2],
    playoff: [3, 4, 5, 6],
    relegation: [22, 23, 24],
    teams: 24
  },
  serieB: {
    name: 'Calcio B',
    promotion: [1, 2],
    playoff: [3, 4, 5, 6, 7, 8],
    relegation: [18, 19, 20],
    teams: 20
  },
  bundesliga2: {
    name: 'Zweite Liga',
    promotion: [1, 2],
    playoff: [3],
    relegation: [16, 17, 18],
    teams: 18
  },
  ligue2: {
    name: 'Division Seconde',
    promotion: [1, 2],
    playoff: [3, 4, 5],
    relegation: [16, 17, 18],
    teams: 18
  },
  // === OTRAS LIGAS EUROPEAS ===
  eredivisie: {
    name: 'Dutch First',
    champions: [1],
    europaLeague: [2, 3],
    conference: [4],
    relegation: [16, 17, 18],
    teams: 18
  },
  primeiraLiga: {
    name: 'Liga Lusitana',
    champions: [1],
    europaLeague: [2, 3],
    conference: [4],
    relegation: [16, 17, 18],
    teams: 18
  },
  belgianPro: {
    name: 'Belgian First',
    champions: [1],
    europaLeague: [2],
    conference: [3],
    relegation: [15, 16],
    teams: 16
  },
  superLig: {
    name: 'Anatolian League',
    champions: [1],
    europaLeague: [2, 3],
    conference: [4],
    relegation: [16, 17, 18],
    teams: 18
  },
  scottishPrem: {
    name: 'Highland League',
    champions: [1],
    europaLeague: [2],
    conference: [3],
    relegation: [11, 12],
    teams: 12
  },
  swissSuperLeague: {
    name: 'Alpine League',
    champions: [1],
    europaLeague: [2],
    conference: [3],
    relegation: [11, 12],
    teams: 12
  },
  austrianBundesliga: {
    name: 'Erste Liga (AT)',
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
  },
  ligaMX: {
    name: 'Liga MX',
    libertadores: [1, 2, 3, 4],
    sudamericana: [5, 6],
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
  venezuelaPrimera: '🇻🇪',
  ligaMX: '🇲🇽'
};

export default function LeagueTable() {
  const { state, dispatch } = useGame();
  const { t } = useTranslation();
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
          {t('leagueTable.title')}
        </h2>
        
        <div className="league-selector">
          <CustomSelect
            value={selectedLeague}
            onChange={(val) => {
              setSelectedLeague(val);
              setShowAllTeams(false);
              setSelectedGroup(null);
            }}
            searchPlaceholder={t('leagueTable.searchLeague')}
            options={[
              { group: t('leagueTable.countries.spain'), icon: '🇪🇸', items: [
                { value: 'laliga', label: 'Liga Ibérica' },
                { value: 'segunda', label: 'Segunda Ibérica' },
                { value: 'primeraRFEF', label: 'Primera Federación' },
                { value: 'segundaRFEF', label: 'Segunda Federación' },
              ]},
              { group: t('leagueTable.countries.england'), icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', items: [
                { value: 'premierLeague', label: 'First League' },
                { value: 'championship', label: 'Second League' },
              ]},
              { group: t('leagueTable.countries.italy'), icon: '🇮🇹', items: [
                { value: 'serieA', label: 'Calcio League' },
                { value: 'serieB', label: 'Calcio B' },
              ]},
              { group: t('leagueTable.countries.germany'), icon: '🇩🇪', items: [
                { value: 'bundesliga', label: 'Erste Liga' },
                { value: 'bundesliga2', label: 'Zweite Liga' },
              ]},
              { group: t('leagueTable.countries.france'), icon: '🇫🇷', items: [
                { value: 'ligue1', label: 'Division Première' },
                { value: 'ligue2', label: 'Division Seconde' },
              ]},
              { group: t('leagueTable.countries.restOfEurope'), icon: '🌍', items: [
                { value: 'eredivisie', icon: '🇳🇱', label: 'Dutch First' },
                { value: 'primeiraLiga', icon: '🇵🇹', label: 'Liga Lusitana' },
                { value: 'belgianPro', icon: '🇧🇪', label: 'Belgian First' },
                { value: 'superLig', icon: '🇹🇷', label: 'Anatolian League' },
                { value: 'scottishPrem', icon: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', label: 'Highland League' },
                { value: 'swissSuperLeague', icon: '🇨🇭', label: 'Alpine League' },
                { value: 'austrianBundesliga', icon: '🇦🇹', label: 'Erste Liga (AT)' },
                { value: 'greekSuperLeague', icon: '🇬🇷', label: 'Super League' },
                { value: 'danishSuperliga', icon: '🇩🇰', label: 'Superligaen' },
                { value: 'croatianLeague', icon: '🇭🇷', label: 'HNL' },
                { value: 'czechLeague', icon: '🇨🇿', label: 'Chance Liga' },
              ]},
              { group: t('leagueTable.countries.southAmerica'), icon: '🌎', items: [
                { value: 'argentinaPrimera', icon: '🇦🇷', label: 'Liga Profesional' },
                { value: 'brasileiraoA', icon: '🇧🇷', label: 'Série A' },
                { value: 'colombiaPrimera', icon: '🇨🇴', label: 'Liga BetPlay' },
                { value: 'chilePrimera', icon: '🇨🇱', label: 'Primera División' },
                { value: 'uruguayPrimera', icon: '🇺🇾', label: 'Primera División' },
                { value: 'ecuadorLigaPro', icon: '🇪🇨', label: 'LigaPro' },
                { value: 'paraguayPrimera', icon: '🇵🇾', label: 'División de Honor' },
                { value: 'peruLiga1', icon: '🇵🇪', label: 'Liga 1' },
                { value: 'boliviaPrimera', icon: '🇧🇴', label: 'Div. Profesional' },
                { value: 'venezuelaPrimera', icon: '🇻🇪', label: 'Liga FUTVE' },
              ]},
            ]}
          />
        </div>
      </div>
      
      {/* Indicador si es la liga del jugador */}
      {isPlayerLeague && (
        <div className="league-table-v2__player-badge">
          ⭐ {t('leagueTable.yourLeague')}
        </div>
      )}
      
      {/* Mensaje si no hay datos */}
      {!hasData && (
        <div className="league-table-v2__no-data">
          <Globe size={48} />
          <p>{t('leagueTable.noData')}</p>
          <p className="hint">{t('leagueTable.noDataHint')}</p>
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
              {t('leagueTable.group')} {groupId.replace('grupo', '')}
            </button>
          ))}
        </div>
      )}

      {/* Apertura-Clausura tournament tabs */}
      {isAPCL && hasData && (
        <div className="league-table-v2__tournament-tabs">
          {/* Show champion if final has been resolved */}
          {(() => {
            const leagueData = selectedLeague === playerLeagueId ? null : state.otherLeagues?.[selectedLeague];
            const finalResult = selectedLeague === playerLeagueId
              ? state.aperturaClausuraFinal
              : leagueData?.finalResult;
            if (finalResult?.winner) {
              return (
                <div className="tournament-indicator tournament-champion">
                  🏆 {t('leagueTable.championLabel')}: <strong>{finalResult.winnerName}</strong>
                  {finalResult.hadFinal && (
                    <span className="final-score">
                      {' '}({t('leagueTable.firstLeg')}: {finalResult.leg1?.homeScore}-{finalResult.leg1?.awayScore}, {t('leagueTable.secondLeg')}: {finalResult.leg2?.homeScore}-{finalResult.leg2?.awayScore})
                    </span>
                  )}
                  {!finalResult.hadFinal && <span> — {t('leagueTable.bothTournamentsChampion')}</span>}
                </div>
              );
            }
            return (
              <div className="tournament-indicator">
                🏆 {apclData?.currentTournament === 'apertura' ? t('leagueTable.apertura') : t('leagueTable.clausura')} {t('leagueTable.inProgress')}
              </div>
            );
          })()}
          <div className="tournament-tab-buttons">
            <button
              className={`tournament-tab ${(tournamentTab === 'current' ? apclData?.currentTournament : tournamentTab) === 'apertura' ? 'active' : ''} ${apclData?.currentTournament === 'apertura' ? 'is-live' : ''}`}
              onClick={() => setTournamentTab('apertura')}
            >
              {t('leagueTable.apertura')}
              {apclData?.currentTournament === 'apertura' && <span className="live-dot" />}
            </button>
            <button
              className={`tournament-tab ${(tournamentTab === 'current' ? apclData?.currentTournament : tournamentTab) === 'clausura' ? 'active' : ''} ${apclData?.currentTournament === 'clausura' ? 'is-live' : ''}`}
              onClick={() => setTournamentTab('clausura')}
              disabled={apclData?.currentTournament === 'apertura'}
            >
              {t('leagueTable.clausura')}
              {apclData?.currentTournament === 'clausura' && <span className="live-dot" />}
            </button>
            <button
              className={`tournament-tab ${(tournamentTab === 'current' ? '' : tournamentTab) === 'acumulada' ? 'active' : ''}`}
              onClick={() => setTournamentTab('acumulada')}
              disabled={apclData?.currentTournament === 'apertura'}
            >
              {t('leagueTable.acumulada')}
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
                <span className="dot"></span> {t('leagueTable.championsLeague')}
              </span>
            )}
            {leagueConfig.libertadores && showZones && (
              <span className="legend-item champions">
                <span className="dot"></span> {t('leagueTable.libertadores')}
              </span>
            )}
            {leagueConfig.europaLeague && showZones && (
              <span className="legend-item europa">
                <span className="dot"></span> {t('leagueTable.europaLeague')}
              </span>
            )}
            {leagueConfig.sudamericana && showZones && (
              <span className="legend-item europa">
                <span className="dot"></span> {t('leagueTable.sudamericana')}
              </span>
            )}
            {leagueConfig.conference && showZones && (
              <span className="legend-item conference">
                <span className="dot"></span> {t('leagueTable.conferenceLeague')}
              </span>
            )}
            {leagueConfig.promotion && showZones && (
              <span className="legend-item promotion">
                <span className="dot"></span> {t('leagueTable.promotion')}
              </span>
            )}
            {leagueConfig.playoff && showZones && (
              <span className="legend-item playoff">
                <span className="dot"></span> {t('leagueTable.playoffPromotion')}
              </span>
            )}
            {showZones && (
              <span className="legend-item relegation">
                <span className="dot"></span> {t('leagueTable.relegation')}
              </span>
            )}
          </div>
          
          {/* Tabla */}
          <div className="league-table-v2__table">
            <div className="table-header">
              <span className="col-pos">#</span>
              <span className="col-team">{t('leagueTable.team')}</span>
              <span className="col-pj">{t('leagueTable.played')}</span>
              <span className="col-w">{t('leagueTable.won')}</span>
              <span className="col-d">{t('leagueTable.drawn')}</span>
              <span className="col-l">{t('leagueTable.lost')}</span>
              <span className="col-gf">{t('leagueTable.goalsFor')}</span>
              <span className="col-ga">{t('leagueTable.goalsAgainst')}</span>
              <span className="col-gd">{t('leagueTable.goalDifference')}</span>
              <span className="col-pts">{t('leagueTable.points')}</span>
              <span className="col-form">{t('leagueTable.form')}</span>
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
                          {f === 'W' ? t('leagueTable.formW') : f === 'L' ? t('leagueTable.formL') : t('leagueTable.formD')}
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
                {isPlayerLeague && playerPosition > 10 && (() => {
                  const playerTeam = activeTable[playerPosition - 1];
                  // Show teams around player (pos-1, player, pos+1) for context
                  const surroundingIndices = [];
                  if (playerPosition > 11) surroundingIndices.push(playerPosition - 2); // team above
                  surroundingIndices.push(playerPosition - 1); // player
                  if (playerPosition < activeTable.length) surroundingIndices.push(playerPosition); // team below
                  
                  return (
                    <div className="player-position-indicator">
                      <div className="separator-dots">···</div>
                      {surroundingIndices.map(idx => {
                        const team = activeTable[idx];
                        if (!team) return null;
                        const pos = idx + 1;
                        return (
                          <div key={idx} className={`table-row ${team.isPlayer ? 'is-player' : ''} ${getZone(pos)}`}>
                            <span className="col-pos">
                              <span className={`pos-badge ${getZone(pos)}`}>{pos}</span>
                            </span>
                            <span className="col-team">
                              <span className="team-badge">
                                {getTeamInitials(team.teamName)}
                              </span>
                              <span className="team-name">{team.teamName}</span>
                            </span>
                            <span className="col-pj">{team.played || 0}</span>
                            <span className="col-w">{team.won || 0}</span>
                            <span className="col-d">{team.drawn || 0}</span>
                            <span className="col-l">{team.lost || 0}</span>
                            <span className="col-gf">{team.goalsFor || 0}</span>
                            <span className="col-ga">{team.goalsAgainst || 0}</span>
                            <span className="col-gd">{(team.goalDifference || 0) > 0 ? '+' : ''}{team.goalDifference || 0}</span>
                            <span className="col-pts">{team.points || 0}</span>
                            <span className="col-form">
                              {(team.form || []).slice(-5).map((f, i) => (
                                <span key={i} className={`form-dot form-${f?.toLowerCase()}`}>{f === 'W' ? t('leagueTable.formW') : f === 'L' ? t('leagueTable.formL') : t('leagueTable.formD')}</span>
                              ))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                
                <button className="show-more-btn" onClick={() => setShowAllTeams(true)}>
                  <ChevronDown size={16} />
                  {t('leagueTable.showAllTeams', { count: activeTable.length })}
                </button>
              </>
            )}
            
            {showAllTeams && activeTable.length > 10 && (
              <button className="show-more-btn" onClick={() => setShowAllTeams(false)}>
                <ChevronUp size={16} />
                {t('leagueTable.showLess')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
