import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { LALIGA_TEAMS } from '../../data/teamsFirestore';
import { simulateWeekMatches, simulateMatch, updateTable } from '../../game/leagueEngine';
import Sidebar from '../Sidebar/Sidebar';
import MobileNav from '../MobileNav/MobileNav';
import Squad from '../Squad/Squad';
import Formation from '../Formation/Formation';
import Calendar from '../Calendar/Calendar';
import LeagueTable from '../LeagueTable/LeagueTable';
import Transfers from '../Transfers/Transfers';
import Renewals from '../Renewals/Renewals';
import Stadium from '../Stadium/Stadium';
import Facilities from '../Facilities/Facilities';
import Messages from '../Messages/Messages';
import MatchDay from '../MatchDay/MatchDay';
import Training from '../Training/Training';
import Objectives from '../Objectives/Objectives';
import {
  Trophy,
  TrendingUp,
  Wallet,
  Users,
  Target,
  Save,
  SkipForward,
  FastForward,
  ChevronRight
} from 'lucide-react';
import './Office.scss';

export default function Office() {
  const { state, dispatch, saveGame } = useGame();
  const [activeTab, setActiveTab] = useState('overview');
  const [showMatch, setShowMatch] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const isMobile = window.innerWidth <= 768;
  
  const formatMoney = (amount) => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`;
    }
    return `€${(amount / 1000).toFixed(0)}K`;
  };
  
  const handleAdvanceWeek = () => {
    const weekFixtures = state.fixtures.filter(f => f.week === state.currentWeek && !f.played);
    const playerMatch = weekFixtures.find(f => 
      f.homeTeam === state.teamId || f.awayTeam === state.teamId
    );
    
    if (playerMatch) {
      setShowMatch(true);
    } else {
      simulateOtherMatches();
      dispatch({ type: 'APPLY_TRAINING' });
      dispatch({ type: 'ADVANCE_WEEK' });
    }
  };
  
  const handleMatchComplete = () => {
    setShowMatch(false);
    dispatch({ type: 'APPLY_TRAINING' });
    dispatch({ type: 'ADVANCE_WEEK' });
  };
  
  const simulateOtherMatches = () => {
    const allTeams = LALIGA_TEAMS.map(t => {
      if (t.id === state.teamId) {
        return state.team;
      }
      return t;
    });
    
    const result = simulateWeekMatches(
      state.fixtures,
      state.leagueTable,
      state.currentWeek,
      state.teamId,
      allTeams
    );
    
    dispatch({ type: 'SET_FIXTURES', payload: result.fixtures });
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: result.table });
  };
  
  const handleSimulateWeeks = async (numWeeks) => {
    setSimulating(true);
    
    for (let i = 0; i < numWeeks; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      simulatePlayerMatch();
      simulateOtherMatches();
      dispatch({ type: 'APPLY_TRAINING' });
      dispatch({ type: 'ADVANCE_WEEK' });
      dispatch({ type: 'HEAL_INJURIES' });
    }
    
    setSimulating(false);
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'simulation',
        title: `Simuladas ${numWeeks} semanas`,
        content: `Has avanzado hasta la semana ${state.currentWeek + numWeeks}`,
        date: `Semana ${state.currentWeek + numWeeks}`
      }
    });
  };
  
  const simulatePlayerMatch = () => {
    const weekFixtures = state.fixtures.filter(f => f.week === state.currentWeek && !f.played);
    const playerMatch = weekFixtures.find(f => 
      f.homeTeam === state.teamId || f.awayTeam === state.teamId
    );
    
    if (!playerMatch) return;
    
    const isHome = playerMatch.homeTeam === state.teamId;
    const opponentId = isHome ? playerMatch.awayTeam : playerMatch.homeTeam;
    const opponent = LALIGA_TEAMS.find(t => t.id === opponentId);
    
    const homeTeamData = isHome ? state.team : opponent;
    const awayTeamData = isHome ? opponent : state.team;
    
    const result = simulateMatch(
      playerMatch.homeTeam,
      playerMatch.awayTeam,
      homeTeamData,
      awayTeamData
    );
    
    const updatedFixtures = state.fixtures.map(f => {
      if (f.id === playerMatch.id) {
        return { ...f, played: true, homeScore: result.homeScore, awayScore: result.awayScore };
      }
      return f;
    });
    dispatch({ type: 'SET_FIXTURES', payload: updatedFixtures });
    
    const newTable = updateTable(
      state.leagueTable,
      playerMatch.homeTeam,
      playerMatch.awayTeam,
      result.homeScore,
      result.awayScore
    );
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: newTable });
  };
  
  const renderContent = () => {
    switch (activeTab) {
      case 'squad':
        return <Squad />;
      case 'formation':
        return <Formation />;
      case 'training':
        return <Training />;
      case 'objectives':
        return <Objectives />;
      case 'calendar':
        return <Calendar />;
      case 'table':
        return <LeagueTable />;
      case 'transfers':
        return <Transfers />;
      case 'renewals':
        return <Renewals />;
      case 'stadium':
        return <Stadium />;
      case 'facilities':
        return <Facilities />;
      case 'messages':
        return <Messages />;
      default:
        return renderOverview();
    }
  };
  
  const renderOverview = () => {
    const position = state.leagueTable.findIndex(t => t.teamId === state.teamId) + 1;
    const teamStats = state.leagueTable.find(t => t.teamId === state.teamId);
    const nextMatch = state.fixtures.find(f => 
      f.week >= state.currentWeek && 
      !f.played && 
      (f.homeTeam === state.teamId || f.awayTeam === state.teamId)
    );
    
    return (
      <div className="office__overview">
        <div className="office__welcome">
          <h2>Bienvenido, Míster</h2>
          <p>Temporada {state.currentSeason} · Semana {state.currentWeek}</p>
        </div>
        
        <div className="office__cards">
          <div className="office__card office__card--position">
            <div className="office__card-icon">
              <Trophy size={28} strokeWidth={2} />
            </div>
            <div className="office__card-content">
              <span className="label">Posición</span>
              <span className="value">{position}º</span>
            </div>
          </div>
          
          <div className="office__card office__card--points">
            <div className="office__card-icon">
              <TrendingUp size={28} strokeWidth={2} />
            </div>
            <div className="office__card-content">
              <span className="label">Puntos</span>
              <span className="value">{teamStats?.points || 0}</span>
            </div>
          </div>
          
          <div className="office__card office__card--budget">
            <div className="office__card-icon">
              <Wallet size={28} strokeWidth={2} />
            </div>
            <div className="office__card-content">
              <span className="label">Presupuesto</span>
              <span className="value">{formatMoney(state.money)}</span>
            </div>
          </div>
          
          <div className="office__card office__card--squad">
            <div className="office__card-icon">
              <Users size={28} strokeWidth={2} />
            </div>
            <div className="office__card-content">
              <span className="label">Plantilla</span>
              <span className="value">{state.team?.players?.length || 0}</span>
              <span className="sublabel">jugadores</span>
            </div>
          </div>
        </div>
        
        <div className="office__grid">
          <div className="office__grid-left">
            {nextMatch && (
              <div className="office__next-match">
                <h3>Próximo Partido</h3>
                <span className="office__match-week">Jornada {nextMatch.week}</span>
                <div className="office__match-preview">
                  <div className="team home">
                    <span className="name">{nextMatch.homeTeam === state.teamId ? state.team.name : 
                      state.leagueTable.find(t => t.teamId === nextMatch.homeTeam)?.teamName}</span>
                  </div>
                  <div className="vs">VS</div>
                  <div className="team away">
                    <span className="name">{nextMatch.awayTeam === state.teamId ? state.team.name : 
                      state.leagueTable.find(t => t.teamId === nextMatch.awayTeam)?.teamName}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="office__form">
              <h3>Últimos Resultados</h3>
              <div className="office__form-badges">
                {teamStats?.form && teamStats.form.length > 0 ? (
                  teamStats.form.map((result, idx) => (
                    <span key={idx} className={`form-badge ${result.toLowerCase()}`}>
                      {result}
                    </span>
                  ))
                ) : (
                  <span className="no-results">Sin partidos jugados</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="office__grid-right">
            {state.seasonObjectives?.length > 0 && (
              <div className="office__objective-preview" onClick={() => setActiveTab('objectives')}>
                <h3>
                  <Target size={18} strokeWidth={2} />
                  <span>Objetivo Principal</span>
                </h3>
                {(() => {
                  const criticalObj = state.seasonObjectives.find(o => o.priority === 'critical');
                  if (!criticalObj) return null;
                  
                  let progress = 0;
                  if (criticalObj.type === 'league_position') {
                    if (position <= criticalObj.target) progress = 100;
                    else progress = Math.max(0, Math.round((1 - (position - criticalObj.target) / (20 - criticalObj.target)) * 100));
                  }
                  
                  const status = progress >= 100 ? 'completed' : progress >= 70 ? 'on-track' : progress >= 40 ? 'warning' : 'danger';
                  
                  return (
                    <div className={`objective-item objective-item--${status}`}>
                      <div className="objective-info">
                        <span className="objective-name">{criticalObj.name}</span>
                        <span className="objective-desc">{criticalObj.description}</span>
                      </div>
                      <div className="objective-progress">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="progress-text">{progress}%</span>
                      </div>
                    </div>
                  );
                })()}
                <span className="view-all">
                  <span>Ver todos los objetivos</span>
                  <ChevronRight size={16} />
                </span>
              </div>
            )}
            
            {state.messages.length > 0 && (
              <div className="office__recent-messages" onClick={() => setActiveTab('messages')}>
                <h3>Mensajes Recientes</h3>
                {state.messages.slice(0, 3).map(msg => (
                  <div key={msg.id} className="office__message-preview">
                    <span className="title">{msg.title}</span>
                    <span className="date">{msg.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  if (showMatch) {
    return <MatchDay onComplete={handleMatchComplete} />;
  }
  
  return (
    <div className="office">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <MobileNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onAdvanceWeek={handleAdvanceWeek}
        onSave={saveGame}
      />
      
      <main className="office__main">
        <header className="office__header">
          <div className="office__team-info">
            <h1>{state.team?.name}</h1>
            <span className="office__season">Temporada {state.currentSeason} · Semana {state.currentWeek}</span>
          </div>
          
          <div className="office__actions">
            <div className="office__money">
              <span className="label">Presupuesto</span>
              <span className="value">{formatMoney(state.money)}</span>
            </div>
            
            <button className="office__save-btn" onClick={saveGame}>
              <Save size={18} strokeWidth={2} />
              <span>Guardar</span>
            </button>
            
            <button 
              className="office__advance-btn" 
              onClick={handleAdvanceWeek}
              disabled={simulating}
            >
              <SkipForward size={18} strokeWidth={2} />
              <span>Avanzar Semana</span>
            </button>
            
            <div className="office__sim-dropdown">
              <button className="office__sim-btn" disabled={simulating}>
                <FastForward size={18} strokeWidth={2} />
                <span>{simulating ? 'Simulando...' : 'Simular'}</span>
              </button>
              {!simulating && (
                <div className="office__sim-options">
                  <button onClick={() => handleSimulateWeeks(4)}>4 semanas</button>
                  <button onClick={() => handleSimulateWeeks(10)}>10 semanas</button>
                  <button onClick={() => handleSimulateWeeks(19)}>Media temporada</button>
                  <button onClick={() => handleSimulateWeeks(38)}>Temporada completa</button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        <div className="office__content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
