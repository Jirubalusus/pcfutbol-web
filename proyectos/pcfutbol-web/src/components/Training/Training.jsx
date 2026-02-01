import React from 'react';
import { Circle, Dumbbell, Lock, Building2, Info, Check } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import './Training.scss';

const INTENSITY_ICONS = {
  light: <Circle size={16} className="intensity-icon intensity-icon--green" />,
  normal: <Circle size={16} className="intensity-icon intensity-icon--yellow" />,
  intense: <Circle size={16} className="intensity-icon intensity-icon--red" />
};

const INTENSITY_LEVELS = {
  light: {
    id: 'light',
    name: 'Suave',
    statBonus: '+0.6%',
    injuryRisk: '5%',
    description: 'Menor progresión, menos lesiones. Ideal para veteranos.',
    color: '#30d158'
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    statBonus: '+1.1%',
    injuryRisk: '15%',
    description: 'Balance equilibrado entre progresión y riesgo.',
    color: '#ffd60a'
  },
  intense: {
    id: 'intense',
    name: 'Intenso',
    statBonus: '+1.7%',
    injuryRisk: '30%',
    description: 'Máxima progresión, mayor riesgo de lesiones.',
    color: '#ff453a'
  }
};

export default function Training() {
  const { state, dispatch } = useGame();
  const currentIntensity = state.training?.intensity || null;
  const isLocked = currentIntensity !== null;
  const trainingFacilityLevel = state.facilities?.training || 0;
  
  // Bonus por instalaciones
  const facilityBonus = [0, 0.1, 0.2, 0.35][trainingFacilityLevel] || 0;

  const handleSelectIntensity = (intensityId) => {
    if (isLocked) return;
    
    dispatch({
      type: 'SET_TRAINING',
      payload: {
        intensity: intensityId,
        lockedUntilPreseason: true
      }
    });

    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'training',
        title: 'Intensidad de entrenamiento fijada',
        content: `El equipo entrenará con intensidad ${INTENSITY_LEVELS[intensityId].name} durante toda la temporada.`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };

  return (
    <div className="training-simple">
      <div className="training-simple__header">
        <h2><Dumbbell size={16} /> Intensidad de Entrenamiento</h2>
        {isLocked ? (
          <span className="locked-badge"><Lock size={12} /> Bloqueado hasta próxima pretemporada</span>
        ) : (
          <p className="subtitle">Selecciona la intensidad para toda la temporada</p>
        )}
      </div>

      <div className="training-simple__options">
        {Object.values(INTENSITY_LEVELS).map(intensity => {
          const isSelected = currentIntensity === intensity.id;
          
          return (
            <div 
              key={intensity.id}
              className={`intensity-card ${isSelected ? 'selected' : ''} ${isLocked && !isSelected ? 'disabled' : ''}`}
              onClick={() => !isLocked && handleSelectIntensity(intensity.id)}
              style={{ '--intensity-color': intensity.color }}
            >
              <div className="card-header">
                <span className="icon">{INTENSITY_ICONS[intensity.id]}</span>
                <h3>{intensity.name}</h3>
                {isSelected && <span className="check"><Check size={14} /></span>}
              </div>
              
              <p className="description">{intensity.description}</p>
              
              <div className="stats">
                <div className="stat">
                  <span className="label">Mejora stats</span>
                  <span className="value positive">{intensity.statBonus}</span>
                </div>
                <div className="stat">
                  <span className="label">Riesgo lesión</span>
                  <span className="value negative">{intensity.injuryRisk}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="training-simple__info">
        <div className="info-box">
          <span className="icon"><Building2 size={16} /></span>
          <div className="text">
            <span className="label">Nivel instalaciones</span>
            <span className="value">{trainingFacilityLevel}/3 (x{(1 + facilityBonus).toFixed(1)} bonus)</span>
          </div>
        </div>
        
        {isLocked && (
          <div className="info-box locked">
            <span className="icon"><Info size={16} /></span>
            <div className="text">
              <span className="label">Intensidad actual: {INTENSITY_LEVELS[currentIntensity]?.name}</span>
              <span className="value">Podrás cambiarla al inicio de la próxima temporada</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
