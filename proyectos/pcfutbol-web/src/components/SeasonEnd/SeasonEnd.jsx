import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Medal,
  Star,
  Calendar,
  Users,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Plane,
  Home,
  Swords,
  Sparkles
} from 'lucide-react';
import {
  getSeasonResult,
  calculateSeasonRewards,
  generatePreseasonOptions,
  getCompetitionName,
  getEuropeanBonus
} from '../../game/seasonManager';
import { initializeLeague } from '../../game/leagueEngine';
import { initializeNewSeasonWithPromotions, getLeagueName } from '../../game/multiLeagueEngine';
import { generateSeasonObjectives } from '../../game/objectivesEngine';
import './SeasonEnd.scss';

export default function SeasonEnd({ allTeams, onComplete }) {
  const { state, dispatch } = useGame();
  const [phase, setPhase] = useState('summary'); // summary, preseason, confirm
  const [selectedPreseason, setSelectedPreseason] = useState(null);
  
  // Obtener resultado de temporada
  const seasonResult = useMemo(() => {
    return getSeasonResult(state.leagueTable, state.teamId, 'laliga');
  }, [state.leagueTable, state.teamId]);
  
  // Calcular recompensas de objetivos
  const objectiveRewards = useMemo(() => {
    return calculateSeasonRewards(state.seasonObjectives || [], seasonResult);
  }, [state.seasonObjectives, seasonResult]);
  
  // Generar opciones de pretemporada
  const preseasonOptions = useMemo(() => {
    return generatePreseasonOptions(allTeams, state.team, 'laliga');
  }, [allTeams, state.team]);
  
  // Bonus europeo
  const europeanBonus = getEuropeanBonus(seasonResult.qualification);
  const competitionName = getCompetitionName(seasonResult.qualification);
  
  const formatMoney = (amount) => {
    if (Math.abs(amount) >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    return `€${(amount / 1000).toFixed(0)}K`;
  };
  
  const handleSelectPreseason = (option) => {
    setSelectedPreseason(option);
  };
  
  const handleConfirm = () => {
    if (!selectedPreseason) return;
    
    // Calcular total de dinero
    const totalMoney = objectiveRewards.netResult + europeanBonus;
    
    // Procesar promoción/relegación y generar nuevas ligas
    const newSeasonData = initializeNewSeasonWithPromotions(state, state.teamId);
    
    // Generar nuevos objetivos para la nueva liga del jugador
    const newPlayerLeagueId = newSeasonData.newPlayerLeagueId || state.playerLeagueId || 'laliga';
    const newObjectives = generateSeasonObjectives(state.team, newPlayerLeagueId, newSeasonData.playerLeague.table);
    
    // Mensaje si hubo cambio de liga
    if (newSeasonData.changes.relegated.length > 0 || newSeasonData.changes.promoted.length > 0) {
      // Mensaje de descensos
      if (newSeasonData.changes.relegated.length > 0) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: Date.now(),
            type: 'relegation',
            title: '📉 Descensos a Segunda',
            content: `Descienden: ${newSeasonData.changes.relegated.join(', ')}`,
            date: `Fin Temporada ${state.currentSeason}`
          }
        });
      }
      
      // Mensaje de ascensos
      if (newSeasonData.changes.promoted.length > 0) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: Date.now() + 1,
            type: 'promotion',
            title: '📈 Ascensos a La Liga',
            content: `Ascienden: ${newSeasonData.changes.promoted.join(', ')}`,
            date: `Fin Temporada ${state.currentSeason}`
          }
        });
      }
      
      // Si el jugador cambió de liga
      if (newSeasonData.newPlayerLeagueId !== (state.playerLeagueId || 'laliga')) {
        const isPromotion = newSeasonData.newPlayerLeagueId === 'laliga';
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: Date.now() + 2,
            type: isPromotion ? 'promotion' : 'relegation',
            title: isPromotion ? '🎉 ¡ASCENSO!' : '😔 Descenso',
            content: isPromotion 
              ? `¡${state.team.name} jugará en La Liga la próxima temporada!`
              : `${state.team.name} jugará en Segunda División la próxima temporada.`,
            date: `Fin Temporada ${state.currentSeason}`
          }
        });
      }
    }
    
    // Dispatch para iniciar nueva temporada
    dispatch({
      type: 'START_NEW_SEASON',
      payload: {
        seasonResult,
        objectiveRewards,
        europeanBonus,
        preseasonMatches: selectedPreseason.matches,
        moneyChange: totalMoney,
        newFixtures: newSeasonData.playerLeague.fixtures,
        newTable: newSeasonData.playerLeague.table,
        newObjectives,
        newPlayerLeagueId: newSeasonData.newPlayerLeagueId
      }
    });
    
    // Actualizar otras ligas
    dispatch({
      type: 'SET_OTHER_LEAGUES',
      payload: newSeasonData.otherLeagues
    });
    
    // Actualizar liga del jugador si cambió
    if (newSeasonData.newPlayerLeagueId !== (state.playerLeagueId || 'laliga')) {
      dispatch({
        type: 'SET_PLAYER_LEAGUE',
        payload: newSeasonData.newPlayerLeagueId
      });
    }
    
    onComplete();
  };
  
  // Fase 1: Resumen de temporada
  if (phase === 'summary') {
    return (
      <div className="season-end">
        <div className="season-end__modal">
          <div className="modal-header">
            <Trophy size={32} className="header-icon" />
            <div>
              <h1>Fin de Temporada {state.currentSeason}</h1>
              <p>{state.team?.name}</p>
            </div>
          </div>
          
          {/* Posición Final */}
          <div className="final-position">
            <div className="position-badge">
              <span className="position-number">{seasonResult.position}º</span>
              <span className="position-label">Posición Final</span>
            </div>
            
            <div className="season-stats">
              <div className="stat">
                <span className="value">{seasonResult.points}</span>
                <span className="label">Puntos</span>
              </div>
              <div className="stat">
                <span className="value">{seasonResult.wins}</span>
                <span className="label">Victorias</span>
              </div>
              <div className="stat">
                <span className="value">{seasonResult.draws}</span>
                <span className="label">Empates</span>
              </div>
              <div className="stat">
                <span className="value">{seasonResult.losses}</span>
                <span className="label">Derrotas</span>
              </div>
              <div className="stat">
                <span className={`value ${seasonResult.goalDifference >= 0 ? 'positive' : 'negative'}`}>
                  {seasonResult.goalDifference > 0 ? '+' : ''}{seasonResult.goalDifference}
                </span>
                <span className="label">Dif. Goles</span>
              </div>
            </div>
          </div>
          
          {/* Clasificación Europea */}
          {competitionName && (
            <div className="european-qualification">
              <Star size={24} className="star-icon" />
              <div className="qualification-info">
                <h3>¡Clasificado para {competitionName}!</h3>
                <p>Bonus de clasificación: <strong>{formatMoney(europeanBonus)}</strong></p>
              </div>
            </div>
          )}
          
          {/* Descenso */}
          {seasonResult.relegation && (
            <div className="relegation-warning">
              <TrendingDown size={24} />
              <div>
                <h3>Descenso de categoría</h3>
                <p>El equipo ha descendido a la división inferior</p>
              </div>
            </div>
          )}
          
          {/* Objetivos */}
          <div className="objectives-summary">
            <h3><Target size={18} /> Objetivos de Temporada</h3>
            
            <div className="objectives-list">
              {objectiveRewards.objectiveResults.map((obj, idx) => (
                <div key={idx} className={`objective-item objective-item--${obj.status}`}>
                  {obj.status === 'completed' ? (
                    <CheckCircle2 size={18} className="icon-completed" />
                  ) : (
                    <XCircle size={18} className="icon-failed" />
                  )}
                  <span className="name">{obj.name}</span>
                  <span className={`amount ${obj.status === 'completed' ? 'positive' : 'negative'}`}>
                    {obj.status === 'completed' ? '+' : ''}{formatMoney(obj.amount || 0)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="objectives-total">
              <span>Balance de objetivos:</span>
              <span className={objectiveRewards.netResult >= 0 ? 'positive' : 'negative'}>
                {objectiveRewards.netResult >= 0 ? '+' : ''}{formatMoney(objectiveRewards.netResult)}
              </span>
            </div>
          </div>
          
          {/* Total */}
          <div className="season-total">
            <div className="total-row">
              <span>Objetivos</span>
              <span>{formatMoney(objectiveRewards.netResult)}</span>
            </div>
            {europeanBonus > 0 && (
              <div className="total-row">
                <span>Bonus europeo</span>
                <span className="positive">+{formatMoney(europeanBonus)}</span>
              </div>
            )}
            <div className="total-row total-row--final">
              <span>Total</span>
              <span className={(objectiveRewards.netResult + europeanBonus) >= 0 ? 'positive' : 'negative'}>
                {(objectiveRewards.netResult + europeanBonus) >= 0 ? '+' : ''}
                {formatMoney(objectiveRewards.netResult + europeanBonus)}
              </span>
            </div>
          </div>
          
          <button className="btn-continue" onClick={() => setPhase('preseason')}>
            Continuar a Pretemporada
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }
  
  // Fase 2: Selección de pretemporada
  return (
    <div className="season-end">
      <div className="season-end__modal season-end__modal--preseason">
        <div className="modal-header">
          <Calendar size={32} className="header-icon" />
          <div>
            <h1>Pretemporada {state.currentSeason + 1}</h1>
            <p>Elige tu plan de preparación</p>
          </div>
        </div>
        
        <p className="preseason-intro">
          Selecciona uno de los siguientes paquetes de amistosos. 
          El último partido siempre será en casa como presentación del equipo.
        </p>
        
        <div className="preseason-options">
          {preseasonOptions.map(option => (
            <div 
              key={option.id}
              className={`preseason-card ${selectedPreseason?.id === option.id ? 'selected' : ''}`}
              onClick={() => handleSelectPreseason(option)}
            >
              <div className="card-header">
                {option.id === 'prestige' && <Plane size={24} />}
                {option.id === 'balanced' && <Swords size={24} />}
                {option.id === 'regional' && <Home size={24} />}
                <h3>{option.name}</h3>
              </div>
              
              <p className="card-description">{option.description}</p>
              
              <div className="card-details">
                <span className={`difficulty difficulty--${option.difficulty}`}>
                  Dificultad: {option.difficulty === 'high' ? 'Alta' : option.difficulty === 'medium' ? 'Media' : 'Baja'}
                </span>
                <span className="earnings">
                  Ingresos potenciales: {option.potentialEarnings}
                </span>
              </div>
              
              <div className="matches-preview">
                <h4>Rivales:</h4>
                <ul>
                  {option.matches.map((match, idx) => (
                    <li key={idx}>
                      <span className="match-location">
                        {match.isHome ? <Home size={14} /> : <Plane size={14} />}
                      </span>
                      <span className="opponent-name">{match.opponent.name}</span>
                      <span className="opponent-ovr">{match.opponent.reputation} OVR</span>
                      {match.isPresentationMatch && (
                        <span className="presentation-badge">
                          <Sparkles size={12} /> Presentación
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              {selectedPreseason?.id === option.id && (
                <div className="selected-indicator">
                  <CheckCircle2 size={20} /> Seleccionado
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="preseason-actions">
          <button 
            className="btn-back" 
            onClick={() => setPhase('summary')}
          >
            Volver
          </button>
          <button 
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={!selectedPreseason}
          >
            Comenzar Pretemporada
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
