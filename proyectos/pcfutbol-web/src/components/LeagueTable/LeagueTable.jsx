import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { TutorialModal, useTutorial } from '../Tutorial/Tutorial';
import { Trophy, ChevronDown, ChevronUp, Globe, RefreshCw } from 'lucide-react';
import { getLeagueTable, LEAGUE_CONFIG, initializeOtherLeagues, simulateOtherLeaguesWeek, isAperturaClausura, computeAccumulatedTable } from '../../game/multiLeagueEngine';
import { sortTable } from '../../game/leagueEngine';
import { getEuropeanSpotsForLeague } from '../../game/seasonManager';
import { getEuropeanPositionsForLeague } from '../../game/europeanCompetitions';
import { useTranslation } from 'react-i18next';
import CustomSelect from '../common/CustomSelect/CustomSelect';
import TeamCrest from '../TeamCrest/TeamCrest';
import './LeagueTable.scss';

// Per-league zones for UI rendering. European top-flight positions are
// derived from LEAGUE_SLOTS (europeanCompetitions) so the badges shown in
// the table cannot drift from the qualification logic. Only non-European
// fields (relegation, promotion, team count, etc.) live here.
const EURO_ZONES_EXTRA = {
  laliga:             { nameKey: 'leagues.laliga',             relegation: [18, 19, 20], teams: 20 },
  premierLeague:      { nameKey: 'leagues.premierLeague',      relegation: [18, 19, 20], teams: 20 },
  serieA:             { nameKey: 'leagues.serieA',             relegation: [18, 19, 20], teams: 20 },
  bundesliga:         { nameKey: 'leagues.bundesliga',         relegation: [16, 17, 18], teams: 18 },
  ligue1:             { nameKey: 'leagues.ligue1',             relegation: [16, 17, 18], teams: 18 },
  eredivisie:         { nameKey: 'leagues.eredivisie',         relegation: [16, 17, 18], teams: 18 },
  primeiraLiga:       { nameKey: 'leagues.primeiraLiga',       relegation: [16, 17, 18], teams: 18 },
  belgianPro:         { nameKey: 'leagues.belgianPro',         relegation: [15, 16],     teams: 16 },
  superLig:           { nameKey: 'leagues.superLig',           relegation: [17, 18, 19], teams: 19 },
  austrianBundesliga: { nameKey: 'leagues.austrianBundesliga', relegation: [11, 12],     teams: 12 },
  greekSuperLeague:   { nameKey: 'leagues.greekSuperLeague',   relegation: [13, 14],     teams: 14 },
  scottishPrem:       { nameKey: 'leagues.scottishPrem',       relegation: [11, 12],     teams: 12 },
  ukrainePremier:     { nameKey: 'leagues.ukrainePremier',     relegation: [15, 16],     teams: 16 },
  czechLeague:        { nameKey: 'leagues.czechLeague',        relegation: [15, 16],     teams: 16 },
  ekstraklasa:        { nameKey: 'leagues.ekstraklasa',        relegation: [17, 18],     teams: 18 },
  eliteserien:        { nameKey: 'leagues.eliteserien',        relegation: [15, 16],     teams: 16 },
  danishSuperliga:    { nameKey: 'leagues.danishSuperliga',    relegation: [11, 12],     teams: 12 },
  swissSuperLeague:   { nameKey: 'leagues.swissSuperLeague',   relegation: [11, 12],     teams: 12 },
  croatianLeague:     { nameKey: 'leagues.croatianLeague',     relegation: [9, 10],      teams: 10 },
  romaniaSuperliga:   { nameKey: 'leagues.romaniaSuperliga',   relegation: [15, 16],     teams: 16 },
  allsvenskan:        { nameKey: 'leagues.allsvenskan',        relegation: [15, 16],     teams: 16 },
  hungaryNBI:         { nameKey: 'leagues.hungaryNBI',         relegation: [11, 12],     teams: 12 },
  russiaPremier:      { nameKey: 'leagues.russiaPremier',      relegation: [15, 16],     teams: 16 }
};

function buildEuropeanZones() {
  const zones = {};
  for (const [leagueId, extra] of Object.entries(EURO_ZONES_EXTRA)) {
    const positions = getEuropeanPositionsForLeague(leagueId) || { champions: [], europaLeague: [], conference: [] };
    zones[leagueId] = {
      ...extra,
      champions: positions.champions,
      europaLeague: positions.europaLeague,
      conference: positions.conference
    };
  }
  return zones;
}

const LEAGUE_ZONES = {
  // === European top-flight leagues (zones derived from LEAGUE_SLOTS) ===
  ...buildEuropeanZones(),
  // === ESPAÑA (second & third tier) ===
  segunda: {
    nameKey: 'leagues.segunda',
    promotion: [1, 2],
    playoff: [3, 4, 5, 6],
    relegation: [19, 20, 21, 22],
    teams: 22
  },
  primeraRFEF: {
    nameKey: 'leagues.primeraRFEF',
    isGroupLeague: true,
    promotion: [1],
    playoff: [2, 3, 4, 5],
    relegation: [],
    relegationFromBottom: 5,
    teams: 0
  },
  segundaRFEF: {
    nameKey: 'leagues.segundaRFEF',
    isGroupLeague: true,
    promotion: [1],
    playoff: [2, 3, 4, 5],
    relegation: [],
    teams: 0
  },
  // === SEGUNDAS DIVISIONES EXTRANJERAS ===
  championship: {
    nameKey: 'leagues.championship',
    promotion: [1, 2],
    playoff: [3, 4, 5, 6],
    relegation: [22, 23, 24],
    teams: 24
  },
  serieB: {
    nameKey: 'leagues.serieB',
    promotion: [1, 2],
    playoff: [3, 4, 5, 6, 7, 8],
    relegation: [18, 19, 20],
    teams: 20
  },
  bundesliga2: {
    nameKey: 'leagues.bundesliga2',
    promotion: [1, 2],
    playoff: [3],
    relegation: [16, 17, 18],
    teams: 18
  },
  ligue2: {
    nameKey: 'leagues.ligue2',
    promotion: [1, 2],
    playoff: [3, 4, 5],
    relegation: [16, 17, 18],
    teams: 18
  },
  // === SOUTH AMERICA ===
  argentinaPrimera: {
    nameKey: 'leagues.argentinaPrimera',
    libertadores: [1, 2, 3, 4],
    sudamericana: [5, 6],
    relegation: [25, 26, 27, 28],
    teams: 28
  },
  brasileiraoA: {
    nameKey: 'leagues.brasileiraoA',
    libertadores: [1, 2, 3, 4],
    sudamericana: [5, 6, 7, 8],
    relegation: [17, 18, 19, 20],
    teams: 20
  },
  colombiaPrimera: {
    nameKey: 'leagues.colombiaPrimera',
    libertadores: [1, 2, 3],
    sudamericana: [4, 5, 6],
    relegation: [18, 19, 20],
    teams: 20
  },
  chilePrimera: {
    nameKey: 'leagues.chilePrimera',
    libertadores: [1, 2],
    sudamericana: [3, 4],
    relegation: [14, 15, 16],
    teams: 16
  },
  uruguayPrimera: {
    nameKey: 'leagues.uruguayPrimera',
    libertadores: [1, 2],
    sudamericana: [3, 4],
    relegation: [14, 15, 16],
    teams: 16
  },
  ecuadorLigaPro: {
    nameKey: 'leagues.ecuadorLigaPro',
    libertadores: [1, 2],
    sudamericana: [3, 4],
    relegation: [14, 15, 16],
    teams: 16
  },
  paraguayPrimera: {
    nameKey: 'leagues.paraguayPrimera',
    libertadores: [1],
    sudamericana: [2, 3],
    relegation: [11, 12],
    teams: 12
  },
  peruLiga1: {
    nameKey: 'leagues.peruLiga1',
    libertadores: [1, 2],
    sudamericana: [3, 4],
    relegation: [16, 17, 18],
    teams: 18
  },
  boliviaPrimera: {
    nameKey: 'leagues.boliviaPrimera',
    libertadores: [1],
    sudamericana: [2, 3],
    relegation: [14, 15, 16],
    teams: 16
  },
  venezuelaPrimera: {
    nameKey: 'leagues.venezuelaPrimera',
    libertadores: [1, 2],
    sudamericana: [3, 4],
    relegation: [16, 17, 18],
    teams: 18
  },
  ligaMX: {
    nameKey: 'leagues.ligaMX',
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
  eliteserien: '🇳🇴', allsvenskan: '🇸🇪', ekstraklasa: '🇵🇱',
  russiaPremier: '🇷🇺', ukrainePremier: '🇺🇦', romaniaSuperliga: '🇷🇴', hungaryNBI: '🇭🇺',
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
  const leagueTableTutorial = useTutorial('leagueTable');
  const playerLeagueId = state.playerLeagueId || 'laliga';
  const [selectedLeague, setSelectedLeague] = useState(playerLeagueId);
  // For group leagues, auto-initialize selectedGroup to playerGroupId
  const [selectedGroup, setSelectedGroup] = useState(() => {
    const zones = LEAGUE_ZONES[playerLeagueId];
    if (zones?.isGroupLeague && state.playerGroupId) {
      return state.playerGroupId;
    }
    return null;
  });
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
  
  const baseLeagueConfig = LEAGUE_ZONES[selectedLeague] || {};
  const dynamicEuropeanSpots = getEuropeanSpotsForLeague(selectedLeague) || {};
  const leagueConfig = { ...baseLeagueConfig, ...dynamicEuropeanSpots };
  const isPlayerLeague = selectedLeague === playerLeagueId;
  const playerLeagueName = t(LEAGUE_ZONES[playerLeagueId]?.nameKey || 'leagues.laliga');
  
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
    if (!name) return '—';
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
      {leagueTableTutorial.shouldShow && (
        <TutorialModal
          id="leagueTable"
          steps={[{ text: t('tutorial.leagueTableQuick') }]}
          onComplete={leagueTableTutorial.markSeen}
          onDismissAll={leagueTableTutorial.dismissAll}
        />
      )}
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
                { value: 'laliga', label: t('leagues.laliga') },
                { value: 'segunda', label: t('leagues.segunda') },
                { value: 'primeraRFEF', label: t('leagues.primeraRFEF') },
                { value: 'segundaRFEF', label: t('leagues.segundaRFEF') },
              ]},
              { group: t('leagueTable.countries.england'), icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', items: [
                { value: 'premierLeague', label: t('leagues.premierLeague') },
                { value: 'championship', label: t('leagues.championship') },
              ]},
              { group: t('leagueTable.countries.italy'), icon: '🇮🇹', items: [
                { value: 'serieA', label: t('leagues.serieA') },
                { value: 'serieB', label: t('leagues.serieB') },
              ]},
              { group: t('leagueTable.countries.germany'), icon: '🇩🇪', items: [
                { value: 'bundesliga', label: t('leagues.bundesliga') },
                { value: 'bundesliga2', label: t('leagues.bundesliga2') },
              ]},
              { group: t('leagueTable.countries.france'), icon: '🇫🇷', items: [
                { value: 'ligue1', label: t('leagues.ligue1') },
                { value: 'ligue2', label: t('leagues.ligue2') },
              ]},
              { group: t('leagueTable.countries.restOfEurope'), icon: '🌍', items: [
                { value: 'eredivisie', icon: '🇳🇱', label: t('leagues.eredivisie') },
                { value: 'primeiraLiga', icon: '🇵🇹', label: t('leagues.primeiraLiga') },
                { value: 'belgianPro', icon: '🇧🇪', label: t('leagues.belgianPro') },
                { value: 'superLig', icon: '🇹🇷', label: t('leagues.superLig') },
                { value: 'scottishPrem', icon: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', label: t('leagues.scottishPrem') },
                { value: 'swissSuperLeague', icon: '🇨🇭', label: t('leagues.swissSuperLeague') },
                { value: 'austrianBundesliga', icon: '🇦🇹', label: t('leagues.austrianBundesliga') },
                { value: 'greekSuperLeague', icon: '🇬🇷', label: t('leagues.greekSuperLeague') },
                { value: 'danishSuperliga', icon: '🇩🇰', label: t('leagues.danishSuperliga') },
                { value: 'croatianLeague', icon: '🇭🇷', label: t('leagues.croatianLeague') },
                { value: 'czechLeague', icon: '🇨🇿', label: t('leagues.czechLeague') },
                { value: 'eliteserien', icon: '🇳🇴', label: t('leagues.eliteserien') },
                { value: 'allsvenskan', icon: '🇸🇪', label: t('leagues.allsvenskan') },
                { value: 'ekstraklasa', icon: '🇵🇱', label: t('leagues.ekstraklasa') },
                { value: 'russiaPremier', icon: '🇷🇺', label: t('leagues.russiaPremier') },
                { value: 'ukrainePremier', icon: '🇺🇦', label: t('leagues.ukrainePremier') },
                { value: 'romaniaSuperliga', icon: '🇷🇴', label: t('leagues.romaniaSuperliga') },
                { value: 'hungaryNBI', icon: '🇭🇺', label: t('leagues.hungaryNBI') },
              ]},
              { group: t('leagueTable.countries.southAmerica'), icon: '🌎', items: [
                { value: 'argentinaPrimera', icon: '🇦🇷', label: t('leagues.argentinaPrimera') },
                { value: 'brasileiraoA', icon: '🇧🇷', label: t('leagues.brasileiraoA') },
                { value: 'colombiaPrimera', icon: '🇨🇴', label: t('leagues.colombiaPrimera') },
                { value: 'chilePrimera', icon: '🇨🇱', label: t('leagues.chilePrimera') },
                { value: 'uruguayPrimera', icon: '🇺🇾', label: t('leagues.uruguayPrimera') },
                { value: 'ecuadorLigaPro', icon: '🇪🇨', label: t('leagues.ecuadorLigaPro') },
                { value: 'paraguayPrimera', icon: '🇵🇾', label: t('leagues.paraguayPrimera') },
                { value: 'peruLiga1', icon: '🇵🇪', label: t('leagues.peruLiga1') },
                { value: 'boliviaPrimera', icon: '🇧🇴', label: t('leagues.boliviaPrimera') },
                { value: 'venezuelaPrimera', icon: '🇻🇪', label: t('leagues.venezuelaPrimera') },
              ]},
            ]}
          />
        </div>
      </div>
      
      {/* Indicador si es la liga del jugador */}
      {isPlayerLeague && (
        <div className="league-table-v2__player-badge">
          <span>⭐ {t('leagueTable.yourLeague')}</span>
          <span className="league-table-v2__player-badge-separator">·</span>
          <strong>{playerLeagueName}</strong>
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
                      <TeamCrest teamId={team.teamId} size={20} />
                      <span className="team-info">
                        <span className="team-name">{team.teamName}</span>
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
                              <TeamCrest teamId={team.teamId} size={20} />
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
