import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import './Training.scss';

// Tipos de entrenamiento
const TRAINING_TYPES = {
  balanced: {
    id: 'balanced',
    name: 'Equilibrado',
    icon: '⚖️',
    description: 'Entrenamiento general que mejora todas las áreas moderadamente',
    effects: { physical: 0.3, technical: 0.3, tactical: 0.3, mental: 0.1 },
    color: '#00D4FF'
  },
  physical: {
    id: 'physical',
    name: 'Físico',
    icon: '💪',
    description: 'Mejora resistencia, velocidad y fuerza. Ideal para defensas y mediocampistas defensivos.',
    effects: { physical: 0.8, technical: 0.1, tactical: 0.05, mental: 0.05 },
    color: '#FF6B6B'
  },
  technical: {
    id: 'technical',
    name: 'Técnico',
    icon: '⚽',
    description: 'Mejora control, pase y disparo. Perfecto para mediapuntas y extremos.',
    effects: { physical: 0.05, technical: 0.8, tactical: 0.1, mental: 0.05 },
    color: '#4ECDC4'
  },
  tactical: {
    id: 'tactical',
    name: 'Táctico',
    icon: '🧠',
    description: 'Mejora posicionamiento y lectura del juego. Esencial para centrales y pivotes.',
    effects: { physical: 0.05, technical: 0.1, tactical: 0.75, mental: 0.1 },
    color: '#FFE66D'
  },
  attacking: {
    id: 'attacking',
    name: 'Ofensivo',
    icon: '🎯',
    description: 'Enfocado en finalización y movimientos de ataque. Para delanteros.',
    effects: { physical: 0.2, technical: 0.5, tactical: 0.2, mental: 0.1 },
    color: '#95E1D3'
  },
  defensive: {
    id: 'defensive',
    name: 'Defensivo',
    icon: '🛡️',
    description: 'Mejora entradas, marcaje y anticipación. Para defensas.',
    effects: { physical: 0.3, technical: 0.2, tactical: 0.4, mental: 0.1 },
    color: '#F38181'
  }
};

const INTENSITY_LEVELS = {
  light: {
    id: 'light',
    name: 'Ligera',
    icon: '🟢',
    modifier: 0.5,
    injuryRisk: 0.02,
    fatigueReduction: true,
    description: 'Menor progresión pero reduce fatiga y riesgo de lesiones'
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    icon: '🟡',
    modifier: 1.0,
    injuryRisk: 0.05,
    fatigueReduction: false,
    description: 'Balance entre progresión y riesgo'
  },
  intense: {
    id: 'intense',
    name: 'Intensa',
    icon: '🔴',
    modifier: 1.5,
    injuryRisk: 0.12,
    fatigueReduction: false,
    description: 'Mayor progresión pero aumenta el riesgo de lesiones'
  }
};

export default function Training() {
  const { state, dispatch } = useGame();
  const [selectedType, setSelectedType] = useState(state.training?.type || 'balanced');
  const [selectedIntensity, setSelectedIntensity] = useState(state.training?.intensity || 'normal');
  const [selectedPlayers, setSelectedPlayers] = useState(state.training?.specialPlayers || []);
  const [showPlayerSelect, setShowPlayerSelect] = useState(false);

  const players = state.team?.players || [];
  const trainingFacilityLevel = state.facilities?.training || 0;

  // Calcular bonus por instalaciones
  const facilityBonus = useMemo(() => {
    const bonuses = [0, 0.1, 0.2, 0.35];
    return bonuses[trainingFacilityLevel] || 0;
  }, [trainingFacilityLevel]);

  // Calcular progresión esperada de un jugador
  const calculateExpectedProgress = (player, trainingType, intensity) => {
    const type = TRAINING_TYPES[trainingType];
    const intensityLevel = INTENSITY_LEVELS[intensity];
    
    // Factor de edad: jóvenes mejoran más
    const ageFactor = player.age <= 21 ? 1.5 : 
                      player.age <= 25 ? 1.2 : 
                      player.age <= 29 ? 1.0 : 
                      player.age <= 33 ? 0.6 : 0.3;
    
    // Factor de nivel actual: jugadores con menor media mejoran más rápido
    const levelFactor = player.overall < 70 ? 1.3 :
                        player.overall < 75 ? 1.1 :
                        player.overall < 80 ? 1.0 :
                        player.overall < 85 ? 0.8 : 0.5;
    
    // Factor de posición
    const positionBonus = getPositionBonus(player.position, trainingType);
    
    // Progresión base semanal
    const baseProgress = 0.05; // 0.05 de media por semana base
    
    const totalProgress = baseProgress * 
      intensityLevel.modifier * 
      ageFactor * 
      levelFactor * 
      (1 + facilityBonus) *
      (1 + positionBonus);
    
    return Math.round(totalProgress * 100) / 100;
  };

  const getPositionBonus = (position, trainingType) => {
    const bonusMap = {
      physical: { GK: 0.1, CB: 0.3, RB: 0.2, LB: 0.2, CDM: 0.3, CM: 0.1, CAM: 0, RW: 0.1, LW: 0.1, ST: 0.1 },
      technical: { GK: 0, CB: 0, RB: 0.1, LB: 0.1, CDM: 0, CM: 0.2, CAM: 0.4, RW: 0.3, LW: 0.3, ST: 0.2 },
      tactical: { GK: 0.1, CB: 0.4, RB: 0.2, LB: 0.2, CDM: 0.4, CM: 0.3, CAM: 0.2, RW: 0.1, LW: 0.1, ST: 0.1 },
      attacking: { GK: 0, CB: 0, RB: 0.1, LB: 0.1, CDM: 0, CM: 0.1, CAM: 0.3, RW: 0.3, LW: 0.3, ST: 0.5 },
      defensive: { GK: 0.2, CB: 0.5, RB: 0.3, LB: 0.3, CDM: 0.4, CM: 0.2, CAM: 0, RW: 0, LW: 0, ST: 0 },
      balanced: { GK: 0.1, CB: 0.1, RB: 0.1, LB: 0.1, CDM: 0.1, CM: 0.1, CAM: 0.1, RW: 0.1, LW: 0.1, ST: 0.1 }
    };
    return bonusMap[trainingType]?.[position] || 0;
  };

  const handleApplyTraining = () => {
    dispatch({
      type: 'SET_TRAINING',
      payload: {
        type: selectedType,
        intensity: selectedIntensity,
        specialPlayers: selectedPlayers
      }
    });

    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'training',
        title: '📋 Plan de entrenamiento actualizado',
        content: `Nuevo plan: ${TRAINING_TYPES[selectedType].name} - Intensidad ${INTENSITY_LEVELS[selectedIntensity].name}`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };

  const togglePlayerSelection = (playerName) => {
    setSelectedPlayers(prev => 
      prev.includes(playerName)
        ? prev.filter(p => p !== playerName)
        : [...prev, playerName].slice(0, 3) // Máximo 3 jugadores con entrenamiento especial
    );
  };

  // Agrupar jugadores por potencial de mejora
  const playersByPotential = useMemo(() => {
    return [...players]
      .map(p => ({
        ...p,
        expectedProgress: calculateExpectedProgress(p, selectedType, selectedIntensity)
      }))
      .sort((a, b) => b.expectedProgress - a.expectedProgress);
  }, [players, selectedType, selectedIntensity]);

  const getProgressColor = (progress) => {
    if (progress >= 0.08) return 'var(--color-success)';
    if (progress >= 0.05) return 'var(--color-warning)';
    return 'var(--color-text-tertiary)';
  };

  const currentType = TRAINING_TYPES[selectedType];
  const currentIntensity = INTENSITY_LEVELS[selectedIntensity];

  return (
    <div className="training">
      <div className="training__header">
        <div>
          <h2>🏋️ Centro de Entrenamiento</h2>
          <p className="training__subtitle">
            Nivel de instalaciones: {['Básico', 'Mejorado', 'Avanzado', 'Élite'][trainingFacilityLevel]}
            <span className="bonus">+{Math.round(facilityBonus * 100)}% efectividad</span>
          </p>
        </div>
      </div>

      <div className="training__content">
        {/* Tipo de entrenamiento */}
        <section className="training__section">
          <h3>Tipo de Entrenamiento</h3>
          <div className="training__types">
            {Object.values(TRAINING_TYPES).map(type => (
              <button
                key={type.id}
                className={`training__type-card ${selectedType === type.id ? 'active' : ''}`}
                onClick={() => setSelectedType(type.id)}
                style={{ '--type-color': type.color }}
              >
                <span className="icon">{type.icon}</span>
                <span className="name">{type.name}</span>
                {selectedType === type.id && (
                  <span className="check">✓</span>
                )}
              </button>
            ))}
          </div>
          
          <div className="training__type-info">
            <p>{currentType.description}</p>
            <div className="effects">
              <span className="effect">
                💪 Físico: <strong>{Math.round(currentType.effects.physical * 100)}%</strong>
              </span>
              <span className="effect">
                ⚽ Técnico: <strong>{Math.round(currentType.effects.technical * 100)}%</strong>
              </span>
              <span className="effect">
                🧠 Táctico: <strong>{Math.round(currentType.effects.tactical * 100)}%</strong>
              </span>
            </div>
          </div>
        </section>

        {/* Intensidad */}
        <section className="training__section">
          <h3>Intensidad</h3>
          <div className="training__intensity">
            {Object.values(INTENSITY_LEVELS).map(level => (
              <button
                key={level.id}
                className={`training__intensity-card ${selectedIntensity === level.id ? 'active' : ''}`}
                onClick={() => setSelectedIntensity(level.id)}
              >
                <div className="intensity-header">
                  <span className="icon">{level.icon}</span>
                  <span className="name">{level.name}</span>
                </div>
                <div className="intensity-stats">
                  <span className="stat">
                    Progresión: <strong>x{level.modifier}</strong>
                  </span>
                  <span className="stat risk">
                    Riesgo: <strong>{Math.round(level.injuryRisk * 100)}%</strong>
                  </span>
                </div>
              </button>
            ))}
          </div>
          <p className="training__intensity-hint">
            {currentIntensity.description}
          </p>
        </section>

        {/* Previsión de progreso */}
        <section className="training__section">
          <h3>Previsión de Progreso Semanal</h3>
          <div className="training__progress-list">
            {playersByPotential.slice(0, 8).map(player => (
              <div key={player.name} className="training__progress-item">
                <div className="player-info">
                  <span className="pos">{player.position}</span>
                  <span className="name">{player.name}</span>
                  <span className="age">{player.age} años</span>
                </div>
                <div className="progress-info">
                  <span className="current">{player.overall}</span>
                  <span className="arrow">→</span>
                  <span 
                    className="expected"
                    style={{ color: getProgressColor(player.expectedProgress) }}
                  >
                    +{player.expectedProgress.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="training__hint">
            Los jugadores jóvenes y con menor media mejoran más rápido
          </p>
        </section>

        {/* Resumen y aplicar */}
        <section className="training__section training__summary">
          <div className="summary-content">
            <div className="summary-item">
              <span className="label">Plan actual:</span>
              <span className="value">{currentType.icon} {currentType.name}</span>
            </div>
            <div className="summary-item">
              <span className="label">Intensidad:</span>
              <span className="value">{currentIntensity.icon} {currentIntensity.name}</span>
            </div>
            <div className="summary-item warning">
              <span className="label">Riesgo de lesiones:</span>
              <span className="value">{Math.round(currentIntensity.injuryRisk * 100)}% por semana</span>
            </div>
          </div>
          
          <button 
            className="training__apply-btn"
            onClick={handleApplyTraining}
          >
            ✓ Aplicar Plan de Entrenamiento
          </button>
        </section>
      </div>
    </div>
  );
}
