import React from 'react';
import { Circle, Dumbbell, Lock, Building2, Info, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
    nameKey: 'training.intensities.light.name',
    statBonus: '+0.6%',
    injuryRisk: '5%',
    descKey: 'training.intensities.light.description',
    color: '#30d158'
  },
  normal: {
    id: 'normal',
    nameKey: 'training.intensities.normal.name',
    statBonus: '+1.1%',
    injuryRisk: '15%',
    descKey: 'training.intensities.normal.description',
    color: '#ffd60a'
  },
  intense: {
    id: 'intense',
    nameKey: 'training.intensities.intense.name',
    statBonus: '+1.7%',
    injuryRisk: '30%',
    descKey: 'training.intensities.intense.description',
    color: '#ff453a'
  }
};

export default function Training() {
  const { t } = useTranslation();
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
        title: t('training.intensitySet'),
        content: t('training.intensitySetDesc', { intensity: t(INTENSITY_LEVELS[intensityId].nameKey) }),
        date: `Semana ${state.currentWeek}`
      }
    });
  };

  return (
    <div className="training-simple">
      <div className="training-simple__header">
        <h2><Dumbbell size={16} /> {t('training.title')}</h2>
        {isLocked ? (
          <span className="locked-badge"><Lock size={12} /> {t('training.lockedUntil')}</span>
        ) : (
          <p className="subtitle">{t('training.selectIntensity')}</p>
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
                <h3>{t(intensity.nameKey)}</h3>
                {isSelected && <span className="check"><Check size={14} /></span>}
              </div>
              
              <p className="description">{t(intensity.descKey)}</p>
              
              <div className="stats">
                <div className="stat">
                  <span className="label">{t('training.statImprovement')}</span>
                  <span className="value positive">{intensity.statBonus}</span>
                </div>
                <div className="stat">
                  <span className="label">{t('training.injuryRisk')}</span>
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
            <span className="label">{t('training.facilityLevel')}</span>
            <span className="value">{trainingFacilityLevel}/3 (x{(1 + facilityBonus).toFixed(1)} {t('training.bonus')})</span>
          </div>
        </div>
        
        {isLocked && (
          <div className="info-box locked">
            <span className="icon"><Info size={16} /></span>
            <div className="text">
              <span className="label">{t('training.currentIntensity')}: {INTENSITY_LEVELS[currentIntensity] ? t(INTENSITY_LEVELS[currentIntensity].nameKey) : ''}</span>
              <span className="value">{t('training.canChangeNext')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
