import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { saveGameToSlot } from '../../firebase/savesService';
import { 
  getLaLigaTeams,
  getSegundaTeams,
  getPrimeraRfefTeams,
  getSegundaRfefTeams,
  getPremierTeams,
  getSerieATeams,
  getBundesligaTeams,
  getLigue1Teams,
  getPrimeraRfefGroups,
  getSegundaRfefGroups
} from '../../data/teamsFirestore';
import { getStadiumInfo, getStadiumLevel } from '../../data/stadiumCapacities';
import { initializeLeague } from '../../game/leagueEngine';
import { generateSeasonObjectives } from '../../game/objectivesEngine';
import EuropeMap from './EuropeMap';
import './TeamSelection.scss';
import './EuropeMap.scss';

const COUNTRIES = [
  { id: 'spain', name: 'España', flag: '🇪🇸', leagues: ['laliga', 'segunda', 'primeraRFEF', 'segundaRFEF'] },
  { id: 'england', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', leagues: ['premierLeague'] },
  { id: 'italy', name: 'Italia', flag: '🇮🇹', leagues: ['serieA'] },
  { id: 'germany', name: 'Alemania', flag: '🇩🇪', leagues: ['bundesliga'] },
  { id: 'france', name: 'Francia', flag: '🇫🇷', leagues: ['ligue1'] },
];

// Función helper para obtener equipos de una liga
function getLeagueTeams(leagueId) {
  switch(leagueId) {
    case 'laliga': return getLaLigaTeams();
    case 'segunda': return getSegundaTeams();
    case 'primeraRFEF': return getPrimeraRfefTeams();
    case 'segundaRFEF': return getSegundaRfefTeams();
    case 'premierLeague': return getPremierTeams();
    case 'serieA': return getSerieATeams();
    case 'bundesliga': return getBundesligaTeams();
    case 'ligue1': return getLigue1Teams();
    default: return [];
  }
}

// Función helper para obtener grupos
function getLeagueGroups(leagueId) {
  switch(leagueId) {
    case 'primeraRFEF': return getPrimeraRfefGroups();
    case 'segundaRFEF': return getSegundaRfefGroups();
    default: return null;
  }
}

const LEAGUE_NAMES = {
  laliga: 'La Liga EA Sports',
  segunda: 'La Liga Hypermotion',
  primeraRFEF: 'Primera Federación',
  segundaRFEF: 'Segunda Federación',
  premierLeague: 'Premier League',
  ligue1: 'Ligue 1',
  bundesliga: 'Bundesliga',
  serieA: 'Serie A',
  eredivisie: 'Eredivisie',
  primeiraLiga: 'Primeira Liga',
};

// Ligas que tienen grupos
const LEAGUES_WITH_GROUPS = ['primeraRFEF', 'segundaRFEF'];

// Generar lista de temporadas disponibles (2025-26 → 2004-05)
const AVAILABLE_SEASONS = Array.from({ length: 22 }, (_, i) => {
  const startYear = 2025 - i;
  return {
    id: `${startYear}-${String(startYear + 1).slice(2)}`,
    label: `${startYear}/${String(startYear + 1).slice(2)}`,
    startYear
  };
});

export default function TeamSelection() {
  const { state, dispatch } = useGame();
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedSeason, setSelectedSeason] = useState(AVAILABLE_SEASONS[0]); // Default: 2025-26
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Determinar si la liga seleccionada tiene grupos
  const hasGroups = selectedLeague && LEAGUES_WITH_GROUPS.includes(selectedLeague);
  
  // Calcular el número total de pasos (simplificado a 2)
  const totalSteps = 2;
  
  // Obtener equipos según liga y grupo
  const teams = useMemo(() => {
    if (!selectedLeague) return [];
    
    // Si tiene grupos y hay uno seleccionado, usar equipos del grupo
    if (hasGroups && selectedGroup) {
      const groups = getLeagueGroups(selectedLeague);
      return groups[selectedGroup]?.teams || [];
    }
    
    // Si no tiene grupos, devolver todos los equipos
    if (!hasGroups) {
      return getLeagueTeams(selectedLeague);
    }
    
    return [];
  }, [selectedLeague, selectedGroup, hasGroups]);

  const filteredTeams = useMemo(() => {
    if (!searchTerm) return teams;
    return teams.filter(t => 
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teams, searchTerm]);
  
  const handleBack = () => {
    if (step === 1) {
      // Si hay país seleccionado, deseleccionarlo primero (especialmente útil en móvil)
      if (selectedCountry) {
        setSelectedCountry(null);
      } else {
        dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
      }
    } else if (step === 2) {
      // Si estamos viendo equipos después de grupos, volver a grupos
      if (hasGroups && selectedGroup) {
        setSelectedGroup(null);
        setSelectedTeam(null);
      } else {
        // Volver al paso 1 (mapa + ligas)
        setStep(1);
        setSelectedLeague(null);
        setSelectedGroup(null);
        setSelectedTeam(null);
      }
    }
  };

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    // Solo selecciona el país, las ligas se muestran en el panel
    // No avanza de paso
  };

  const handleSelectLeague = (leagueId) => {
    setSelectedLeague(leagueId);
    setSelectedGroup(null);
    setStep(2); // Ir a paso 2 (grupos o equipos)
  };

  const handleSelectGroup = (groupId) => {
    setSelectedGroup(groupId);
    // Se queda en step 2, pero ahora muestra equipos
  };

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
  };
  
  const handleStartGame = async () => {
    if (!selectedTeam || !selectedLeague) return;
    
    // Obtener equipos de la liga/grupo para la competición
    let leagueTeams;
    if (hasGroups && selectedGroup) {
      leagueTeams = getLeagueGroups(selectedLeague)?.[selectedGroup]?.teams || [];
    } else {
      leagueTeams = getLeagueTeams(selectedLeague);
    }
    
    const leagueData = initializeLeague(leagueTeams, selectedTeam.id);
    
    // Obtener información del estadio real
    const stadiumInfo = getStadiumInfo(selectedTeam.id, selectedTeam.reputation);
    const stadiumLevel = getStadiumLevel(stadiumInfo.capacity);
    
    dispatch({ 
      type: 'NEW_GAME', 
      payload: { 
        teamId: selectedTeam.id, 
        team: { ...selectedTeam },
        group: selectedGroup,
        stadiumInfo,
        stadiumLevel
      } 
    });
    
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: leagueData.table });
    dispatch({ type: 'SET_FIXTURES', payload: leagueData.fixtures });
    
    const objectives = generateSeasonObjectives(selectedTeam, selectedLeague, leagueData.table);
    dispatch({ type: 'SET_SEASON_OBJECTIVES', payload: objectives });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'welcome',
        title: '¡Bienvenido al club!',
        content: `Has sido nombrado nuevo entrenador del ${selectedTeam.name}. La afición espera grandes cosas de ti.`,
        date: 'Semana 1'
      }
    });
    
    const criticalObj = objectives?.find(o => o.priority === 'critical');
    if (criticalObj) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now() + 1,
          type: 'objectives',
          title: '🎯 Objetivos de temporada',
          content: `La directiva espera: ${criticalObj.name}. ${criticalObj.description}.`,
          date: 'Semana 1'
        }
      });
    }

    // Si hay un slot pendiente y usuario autenticado, guardar automáticamente
    const pendingSlot = localStorage.getItem('pcfutbol_pending_slot');
    if (pendingSlot !== null && isAuthenticated && user) {
      const slotIndex = parseInt(pendingSlot, 10);
      localStorage.removeItem('pcfutbol_pending_slot');
      
      // Construir el estado inicial para guardar
      const initialGameState = {
        gameStarted: true,
        currentWeek: 1,
        currentSeason: 1,
        teamId: selectedTeam.id,
        team: { ...selectedTeam },
        money: selectedTeam.budget,
        leagueTable: leagueData.table,
        fixtures: leagueData.fixtures,
        seasonObjectives: objectives
      };
      
      try {
        await saveGameToSlot(user.uid, slotIndex, initialGameState);
        console.log(`💾 Partida guardada automáticamente en hueco ${slotIndex + 1}`);
      } catch (err) {
        console.error('Error guardando partida inicial:', err);
      }
    }
  };
  
  const formatMoney = (amount) => {
    if (!amount) return '€0';
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(0)}M`;
    return `€${(amount / 1000).toFixed(0)}K`;
  };

  const getDifficulty = (team) => {
    if (!team?.budget) return { label: 'Normal', color: '#ffd60a', stars: 3 };
    if (team.budget >= 150000000) return { label: 'Fácil', color: '#30d158', stars: 1 };
    if (team.budget >= 80000000) return { label: 'Normal', color: '#ffd60a', stars: 2 };
    if (team.budget >= 40000000) return { label: 'Medio', color: '#ff9f0a', stars: 3 };
    if (team.budget >= 15000000) return { label: 'Difícil', color: '#ff6b35', stars: 4 };
    return { label: 'Muy difícil', color: '#ff453a', stars: 5 };
  };

  const getAvgOverall = (team) => {
    if (!team?.players?.length) return 0;
    return Math.round(team.players.reduce((sum, p) => sum + p.overall, 0) / team.players.length);
  };

  // Determinar qué mostrar en cada paso (simplificado a 2 pasos)
  const getCurrentStepContent = () => {
    // PASO 1: Mapa con países + panel de ligas
    if (step === 1) return 'countries';
    
    // PASO 2: Grupos (si aplica) o Equipos
    if (step === 2) {
      if (hasGroups && !selectedGroup) return 'groups';
      return 'teams';
    }
    
    return 'countries';
  };
  
  const currentContent = getCurrentStepContent();

  // Calcular paso visual para el progress bar (simplificado)
  const getVisualStep = () => {
    return step === 1 ? 1 : 2;
  };
  
  return (
    <div className="pcf-team-select">
      {/* HEADER */}
      <div className="pcf-ts-header">
        <div className="header-left">
          <button className="btn-back" onClick={handleBack}>
            ← {step === 1 ? (selectedCountry ? 'PAÍSES' : 'MENÚ') : 'ATRÁS'}
          </button>
        </div>
        <div className="header-center">
          <h1>SELECCIÓN DE EQUIPO</h1>
        </div>
        <div className="header-right">
          <div className="step-indicator">
            Paso {getVisualStep()} de {totalSteps}
          </div>
        </div>
      </div>

      {/* PROGRESS BAR - Solo 2 pasos: País/Liga y Equipo */}
      <div className="pcf-ts-progress">
        <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
          <div className="step-num">1</div>
          <div className="step-label">PAÍS / LIGA</div>
        </div>
        <div className={`progress-line ${step >= 2 ? 'active' : ''}`}></div>
        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
          <div className="step-num">2</div>
          <div className="step-label">EQUIPO</div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="pcf-ts-content">
        {/* PAÍSES - Mapa interactivo */}
        {currentContent === 'countries' && (
          <div className="map-selection">
            {/* Selector de temporada */}
            <div className="season-selector">
              <label className="season-selector__label">Temporada</label>
              <div className="season-selector__wrapper">
                <button 
                  className="season-selector__arrow"
                  onClick={() => {
                    const idx = AVAILABLE_SEASONS.findIndex(s => s.id === selectedSeason.id);
                    if (idx < AVAILABLE_SEASONS.length - 1) {
                      setSelectedSeason(AVAILABLE_SEASONS[idx + 1]);
                    }
                  }}
                  disabled={selectedSeason.id === AVAILABLE_SEASONS[AVAILABLE_SEASONS.length - 1].id}
                >
                  ◀
                </button>
                <select 
                  className="season-selector__select"
                  value={selectedSeason.id}
                  onChange={(e) => {
                    const season = AVAILABLE_SEASONS.find(s => s.id === e.target.value);
                    if (season) setSelectedSeason(season);
                  }}
                >
                  {AVAILABLE_SEASONS.map(season => (
                    <option key={season.id} value={season.id}>
                      {season.label}
                    </option>
                  ))}
                </select>
                <button 
                  className="season-selector__arrow"
                  onClick={() => {
                    const idx = AVAILABLE_SEASONS.findIndex(s => s.id === selectedSeason.id);
                    if (idx > 0) {
                      setSelectedSeason(AVAILABLE_SEASONS[idx - 1]);
                    }
                  }}
                  disabled={selectedSeason.id === AVAILABLE_SEASONS[0].id}
                >
                  ▶
                </button>
              </div>
            </div>
            
            {/* Row con mapa y panel */}
            <div className="map-selection__row">
              {/* Mapa de Europa */}
              <div className="map-selection__map">
                <EuropeMap
                  countries={COUNTRIES}
                  selectedCountry={selectedCountry?.id}
                  onCountryClick={(countryId) => {
                    const country = COUNTRIES.find(c => c.id === countryId);
                    if (country) {
                      setSelectedCountry(country);
                    }
                  }}
                />
              </div>
              
              {/* Panel de ligas del país seleccionado */}
              <div className="map-selection__panel">
              {selectedCountry ? (
                <>
                  <div className="map-selection__title">
                    <span className="flag">{selectedCountry.flag}</span>
                    {selectedCountry.name}
                  </div>
                  <div className="map-selection__leagues">
                    {selectedCountry.leagues.map(leagueId => {
                      const leagueTeams = getLeagueTeams(leagueId);
                      const hasGroupsForLeague = LEAGUES_WITH_GROUPS.includes(leagueId);
                      const groups = hasGroupsForLeague ? getLeagueGroups(leagueId) : null;
                      const numGroups = groups ? Object.keys(groups).length : 0;
                      
                      return (
                        <button
                          key={leagueId}
                          className={`map-selection__league ${leagueTeams.length === 0 ? 'disabled' : ''}`}
                          onClick={() => leagueTeams.length > 0 && handleSelectLeague(leagueId)}
                          disabled={leagueTeams.length === 0}
                        >
                          <div>
                            <div className="map-selection__league-name">{LEAGUE_NAMES[leagueId]}</div>
                            <div className="map-selection__league-info">
                              {leagueTeams.length > 0 
                                ? hasGroupsForLeague 
                                  ? `${numGroups} grupos • ${leagueTeams.length} equipos`
                                  : `${leagueTeams.length} equipos`
                                : 'Próximamente'
                              }
                            </div>
                          </div>
                          <span className="map-selection__league-arrow">
                            {leagueTeams.length > 0 ? '→' : '🔒'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="map-selection__placeholder">
                  <div className="map-selection__placeholder-icon">🗺️</div>
                  <div className="map-selection__placeholder-text">
                    Selecciona un país en el mapa
                  </div>
                </div>
              )}
            </div>
            </div>{/* Cierre map-selection__row */}
          </div>
        )}

        {/* LIGAS */}
        {currentContent === 'leagues' && selectedCountry && (
          <div className="leagues-grid">
            <h2>{selectedCountry.flag} Ligas de {selectedCountry.name}</h2>
            <div className="leagues-list">
              {selectedCountry.leagues.map(leagueId => {
                const leagueTeams = getLeagueTeams(leagueId);
                const hasGroupsForLeague = LEAGUES_WITH_GROUPS.includes(leagueId);
                const groups = hasGroupsForLeague ? getLeagueGroups(leagueId) : null;
                const numGroups = groups ? Object.keys(groups).length : 0;
                
                return (
                  <button
                    key={leagueId}
                    className={`league-card ${leagueTeams.length === 0 ? 'disabled' : ''}`}
                    onClick={() => leagueTeams.length > 0 && handleSelectLeague(leagueId)}
                    disabled={leagueTeams.length === 0}
                  >
                    <div className="league-icon">⚽</div>
                    <div className="info">
                      <span className="name">{LEAGUE_NAMES[leagueId]}</span>
                      <span className="meta">
                        {leagueTeams.length > 0 
                          ? hasGroupsForLeague 
                            ? `${numGroups} grupos • ${leagueTeams.length} equipos`
                            : `${leagueTeams.length} equipos disponibles`
                          : 'Próximamente'
                        }
                      </span>
                    </div>
                    <span className="arrow">{leagueTeams.length > 0 ? '→' : '🔒'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* GRUPOS */}
        {currentContent === 'groups' && selectedLeague && (
          <div className="groups-grid">
            <h2>📋 {LEAGUE_NAMES[selectedLeague]} - Selecciona un grupo</h2>
            <div className="groups-list">
              {Object.entries(getLeagueGroups(selectedLeague) || {}).map(([groupId, group]) => (
                <button
                  key={groupId}
                  className="group-card"
                  onClick={() => handleSelectGroup(groupId)}
                >
                  <div className="group-icon">🏆</div>
                  <div className="info">
                    <span className="name">{group.name}</span>
                    <span className="meta">
                      {group.region ? `${group.region} • ` : ''}{group.teams.length} equipos
                    </span>
                  </div>
                  <span className="arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* EQUIPOS */}
        {currentContent === 'teams' && (
          <div className="teams-layout">
            {/* Panel izquierdo: Lista de equipos */}
            <div className="teams-panel">
              <div className="panel-header">
                <span className="league-name">
                  {selectedCountry?.flag} {LEAGUE_NAMES[selectedLeague]}
                  {selectedGroup && ` - ${getLeagueGroups(selectedLeague)?.[selectedGroup]?.name}`}
                </span>
                <span className="team-count">{teams.length} equipos</span>
              </div>
              
              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Buscar equipo..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="teams-list">
                {filteredTeams.map((team, idx) => {
                  const difficulty = getDifficulty(team);
                  const avgOvr = getAvgOverall(team);
                  const isSelected = selectedTeam?.id === team.id;
                  
                  return (
                    <button
                      key={team.id}
                      className={`team-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectTeam(team)}
                    >
                      <span className="team-num">{idx + 1}</span>
                      <div 
                        className="team-badge"
                        style={{ 
                          background: team.colors?.primary || '#1a3a5a',
                          color: team.colors?.secondary || '#fff'
                        }}
                      >
                        {team.shortName?.slice(0, 3) || team.name?.slice(0, 3)}
                      </div>
                      <div className="team-info">
                        <span className="name">{team.name}</span>
                        <span className="city">{team.city}</span>
                      </div>
                      <span className="team-ovr">{avgOvr || '??'}</span>
                      <span className="team-diff" style={{ color: difficulty.color }}>
                        {'★'.repeat(difficulty.stars)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Panel derecho: Detalles del equipo */}
            <div className="details-panel">
              {selectedTeam ? (
                <div className="team-details">
                  {/* Header del equipo */}
                  <div 
                    className="team-header"
                    style={{ 
                      '--primary': selectedTeam.colors?.primary || '#1a3a5a',
                      '--secondary': selectedTeam.colors?.secondary || '#fff'
                    }}
                  >
                    <div className="badge-large">
                      {selectedTeam.shortName || selectedTeam.name?.slice(0, 3)}
                    </div>
                    <div className="team-title">
                      <h2>{selectedTeam.name}</h2>
                      <p>{selectedTeam.city}, {selectedCountry?.name}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span className="icon">🏟️</span>
                      <span className="label">Estadio</span>
                      <span className="value">{selectedTeam.stadium || 'Municipal'}</span>
                    </div>
                    <div className="stat-card">
                      <span className="icon">👥</span>
                      <span className="label">Capacidad</span>
                      <span className="value">{(selectedTeam.stadiumCapacity || 15000).toLocaleString()}</span>
                    </div>
                    <div className="stat-card">
                      <span className="icon">💰</span>
                      <span className="label">Presupuesto</span>
                      <span className="value highlight">{formatMoney(selectedTeam.budget)}</span>
                    </div>
                    <div className="stat-card">
                      <span className="icon">⭐</span>
                      <span className="label">Reputación</span>
                      <span className="value">{selectedTeam.reputation || 70}/100</span>
                    </div>
                  </div>

                  {/* Dificultad */}
                  <div className="difficulty-bar">
                    <span className="label">Dificultad:</span>
                    <span 
                      className="difficulty-value"
                      style={{ color: getDifficulty(selectedTeam).color }}
                    >
                      {getDifficulty(selectedTeam).label} {'★'.repeat(getDifficulty(selectedTeam).stars)}
                    </span>
                  </div>

                  {/* Plantilla destacada */}
                  {selectedTeam.players && selectedTeam.players.length > 0 && (
                    <div className="squad-preview">
                      <h3>⭐ Jugadores destacados</h3>
                      <div className="players-list">
                        {selectedTeam.players
                          .sort((a, b) => b.overall - a.overall)
                          .slice(0, 5)
                          .map((player, idx) => (
                            <div key={idx} className="player-row">
                              <span className="pos">{player.position}</span>
                              <span className="name">{player.name}</span>
                              <span className="ovr">{player.overall}</span>
                            </div>
                          ))}
                      </div>
                      <div className="squad-total">
                        📋 {selectedTeam.players.length} jugadores en plantilla
                      </div>
                    </div>
                  )}

                  {/* Botón comenzar */}
                  <button className="btn-start" onClick={handleStartGame}>
                    ⚽ COMENZAR CON {selectedTeam.name?.toUpperCase()}
                  </button>
                </div>
              ) : (
                <div className="no-selection">
                  <span className="icon">👈</span>
                  <p>Selecciona un equipo de la lista</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
