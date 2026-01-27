import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  LALIGA_TEAMS, 
  SEGUNDA_TEAMS, 
  PRIMERA_RFEF_TEAMS, 
  SEGUNDA_RFEF_TEAMS,
  PREMIER_LEAGUE_TEAMS,
  LIGUE1_TEAMS,
  BUNDESLIGA_TEAMS,
  SERIE_A_TEAMS,
  EREDIVISIE_TEAMS,
  PRIMEIRA_LIGA_TEAMS,
  LEAGUES 
} from '../../data/teams';
import { initializeLeague } from '../../game/leagueEngine';
import { generateSeasonObjectives } from '../../game/objectivesEngine';
import './TeamSelection.scss';

const COUNTRIES = [
  { id: 'spain', name: 'España', flag: '🇪🇸', leagues: ['laliga', 'segunda', 'primeraRFEF', 'segundaRFEF'] },
  { id: 'england', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', leagues: ['premierLeague'] },
  { id: 'germany', name: 'Alemania', flag: '🇩🇪', leagues: ['bundesliga'] },
  { id: 'italy', name: 'Italia', flag: '🇮🇹', leagues: ['serieA'] },
  { id: 'france', name: 'Francia', flag: '🇫🇷', leagues: ['ligue1'] },
  { id: 'netherlands', name: 'Países Bajos', flag: '🇳🇱', leagues: ['eredivisie'] },
  { id: 'portugal', name: 'Portugal', flag: '🇵🇹', leagues: ['primeiraLiga'] },
];

const LEAGUE_TEAMS = {
  laliga: LALIGA_TEAMS,
  segunda: SEGUNDA_TEAMS,
  primeraRFEF: PRIMERA_RFEF_TEAMS,
  segundaRFEF: SEGUNDA_RFEF_TEAMS,
  premierLeague: PREMIER_LEAGUE_TEAMS || [],
  ligue1: LIGUE1_TEAMS || [],
  bundesliga: BUNDESLIGA_TEAMS || [],
  serieA: SERIE_A_TEAMS || [],
  eredivisie: EREDIVISIE_TEAMS || [],
  primeiraLiga: PRIMEIRA_LIGA_TEAMS || [],
};

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

export default function TeamSelection() {
  const { dispatch } = useGame();
  const [step, setStep] = useState(1); // 1: País, 2: Liga, 3: Equipo
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const teams = useMemo(() => {
    if (!selectedLeague) return [];
    return LEAGUE_TEAMS[selectedLeague] || [];
  }, [selectedLeague]);

  const filteredTeams = useMemo(() => {
    if (!searchTerm) return teams;
    return teams.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teams, searchTerm]);
  
  const handleBack = () => {
    if (step === 1) {
      dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
    } else if (step === 2) {
      setStep(1);
      setSelectedCountry(null);
      setSelectedLeague(null);
    } else {
      setStep(2);
      setSelectedTeam(null);
    }
  };

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    if (country.leagues.length === 1) {
      setSelectedLeague(country.leagues[0]);
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleSelectLeague = (leagueId) => {
    setSelectedLeague(leagueId);
    setStep(3);
  };

  const handleSelectTeam = (teamId) => {
    setSelectedTeam(teamId);
  };
  
  const handleStartGame = () => {
    if (!selectedTeam || !selectedLeague) return;
    
    const team = teams.find(t => t.id === selectedTeam);
    if (!team) return;
    
    const leagueTeams = LEAGUE_TEAMS[selectedLeague];
    const leagueData = initializeLeague(leagueTeams, team.id);
    
    dispatch({ 
      type: 'NEW_GAME', 
      payload: { 
        teamId: selectedTeam, 
        team: { ...team }
      } 
    });
    
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: leagueData.table });
    dispatch({ type: 'SET_FIXTURES', payload: leagueData.fixtures });
    
    // Generar objetivos de temporada
    const objectives = generateSeasonObjectives(team, selectedLeague, leagueData.table);
    dispatch({ type: 'SET_SEASON_OBJECTIVES', payload: objectives });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'welcome',
        title: '¡Bienvenido al club!',
        content: `Has sido nombrado nuevo entrenador del ${team.name}. La afición espera grandes cosas de ti.`,
        date: 'Semana 1'
      }
    });
    
    // Mensaje de objetivos
    const criticalObj = objectives.find(o => o.priority === 'critical');
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
  };
  
  const selectedTeamData = teams.find(t => t.id === selectedTeam);
  
  const formatMoney = (amount) => {
    if (!amount) return '€0';
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(0)}M`;
    return `€${(amount / 1000).toFixed(0)}K`;
  };

  const getDifficulty = (team) => {
    if (!team?.budget) return { label: 'Normal', color: '#888' };
    if (team.budget >= 150000000) return { label: 'Fácil', color: '#30d158' };
    if (team.budget >= 50000000) return { label: 'Normal', color: '#ffd60a' };
    if (team.budget >= 20000000) return { label: 'Difícil', color: '#ff9f0a' };
    return { label: 'Muy difícil', color: '#ff453a' };
  };
  
  return (
    <div className="team-selection">
      {/* Progress bar */}
      <div className="team-selection__progress">
        <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <span className="number">1</span>
          <span className="label">País</span>
        </div>
        <div className="line"></div>
        <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <span className="number">2</span>
          <span className="label">Liga</span>
        </div>
        <div className="line"></div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <span className="number">3</span>
          <span className="label">Equipo</span>
        </div>
      </div>

      {/* Header */}
      <header className="team-selection__header">
        <button className="back-btn" onClick={handleBack}>
          ← {step === 1 ? 'Menú' : 'Atrás'}
        </button>
        <h1>
          {step === 1 && 'Elige un país'}
          {step === 2 && `${selectedCountry?.flag} Elige una liga`}
          {step === 3 && `Elige tu equipo`}
        </h1>
        <div className="spacer"></div>
      </header>
      
      {/* Step 1: Country Selection */}
      {step === 1 && (
        <div className="team-selection__countries">
          {COUNTRIES.map(country => (
            <button
              key={country.id}
              className="country-card"
              onClick={() => handleSelectCountry(country)}
            >
              <span className="flag">{country.flag}</span>
              <span className="name">{country.name}</span>
              <span className="leagues">{country.leagues.length} liga{country.leagues.length > 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: League Selection */}
      {step === 2 && selectedCountry && (
        <div className="team-selection__leagues">
          {selectedCountry.leagues.map(leagueId => (
            <button
              key={leagueId}
              className="league-card"
              onClick={() => handleSelectLeague(leagueId)}
            >
              <div className="league-info">
                <span className="name">{LEAGUE_NAMES[leagueId]}</span>
                <span className="teams">{(LEAGUE_TEAMS[leagueId] || []).length} equipos</span>
              </div>
              <span className="arrow">→</span>
            </button>
          ))}
        </div>
      )}

      {/* Step 3: Team Selection */}
      {step === 3 && (
        <div className="team-selection__content">
          <aside className="team-selection__sidebar">
            <div className="league-badge">
              <span className="flag">{selectedCountry?.flag}</span>
              <span className="name">{LEAGUE_NAMES[selectedLeague]}</span>
            </div>

            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Buscar equipo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="team-list">
              {filteredTeams.map(team => {
                const difficulty = getDifficulty(team);
                return (
                  <button
                    key={team.id}
                    className={`team-item ${selectedTeam === team.id ? 'selected' : ''}`}
                    onClick={() => handleSelectTeam(team.id)}
                  >
                    <div 
                      className="team-badge"
                      style={{ 
                        background: team.colors?.primary || '#333',
                        color: team.colors?.secondary || '#fff'
                      }}
                    >
                      {team.shortName?.slice(0, 3) || team.name.slice(0, 3)}
                    </div>
                    <div className="team-info">
                      <span className="name">{team.name}</span>
                      <span className="meta">{team.city}</span>
                    </div>
                    <div className="difficulty" style={{ color: difficulty.color }}>
                      {difficulty.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
          
          <main className="team-selection__details">
            {selectedTeamData ? (
              <div className="team-card">
                <div 
                  className="team-header"
                  style={{
                    '--primary': selectedTeamData.colors?.primary || '#333',
                    '--secondary': selectedTeamData.colors?.secondary || '#fff'
                  }}
                >
                  <div className="badge">
                    {selectedTeamData.shortName || selectedTeamData.name.slice(0, 3)}
                  </div>
                  <div className="info">
                    <h2>{selectedTeamData.name}</h2>
                    <p>{selectedTeamData.city}, {selectedCountry?.name}</p>
                  </div>
                </div>

                <div className="stats-grid">
                  <div className="stat">
                    <span className="icon">🏟️</span>
                    <div className="content">
                      <span className="label">Estadio</span>
                      <span className="value">{selectedTeamData.stadium || 'Municipal'}</span>
                    </div>
                  </div>
                  <div className="stat">
                    <span className="icon">👥</span>
                    <div className="content">
                      <span className="label">Capacidad</span>
                      <span className="value">{(selectedTeamData.stadiumCapacity || 15000).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="stat">
                    <span className="icon">💰</span>
                    <div className="content">
                      <span className="label">Presupuesto</span>
                      <span className="value">{formatMoney(selectedTeamData.budget)}</span>
                    </div>
                  </div>
                  <div className="stat">
                    <span className="icon">⭐</span>
                    <div className="content">
                      <span className="label">Reputación</span>
                      <span className="value">{selectedTeamData.reputation || 70}/100</span>
                    </div>
                  </div>
                </div>

                {selectedTeamData.players && selectedTeamData.players.length > 0 && (
                  <div className="squad-preview">
                    <h3>Plantilla destacada</h3>
                    <div className="players">
                      {selectedTeamData.players
                        .sort((a, b) => b.overall - a.overall)
                        .slice(0, 5)
                        .map((player, idx) => (
                          <div key={idx} className="player">
                            <span className="pos">{player.position}</span>
                            <span className="name">{player.name}</span>
                            <span className="ovr">{player.overall}</span>
                          </div>
                        ))}
                    </div>
                    <p className="total">
                      {selectedTeamData.players.length} jugadores en plantilla
                    </p>
                  </div>
                )}

                <button className="start-btn" onClick={handleStartGame}>
                  ⚽ Comenzar con {selectedTeamData.name}
                </button>
              </div>
            ) : (
              <div className="placeholder">
                <span className="icon">👈</span>
                <p>Selecciona un equipo de la lista</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
