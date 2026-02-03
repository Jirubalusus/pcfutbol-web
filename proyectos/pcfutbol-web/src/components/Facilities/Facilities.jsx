import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { posES } from '../../game/positionNames';
import { 
  FACILITY_SPECIALIZATIONS, 
  getMedicalTreatmentsAvailable,
  getMedicalSlots,
  getMedicalHealingWeeks,
  getMedicalTreatmentCost
} from '../../game/facilitiesSystem';
import { getFacilityCostMultiplier, getEconomyMultiplier } from '../../game/leagueTiers';
import { Building2, Briefcase, Sprout, HeartPulse, Search, Coins, TrendingUp, Wrench, Zap, Target, Check, BarChart3, Stethoscope, Syringe, Clock } from 'lucide-react';
import './Facilities.scss';

const FACILITIES = [
  { 
    id: 'stadium', 
    name: 'Estadio', 
    icon: <Building2 size={20} />, 
    category: 'income',
    color: '#4a9eff',
    description: 'Capacidad y factor cancha',
    hasSpec: false,
    levels: [
      { name: 'Municipal', capacity: 8000 },
      { name: 'Moderno', capacity: 18000 },
      { name: 'Grande', capacity: 35000 },
      { name: 'Élite', capacity: 55000 },
      { name: 'Legendario', capacity: 80000 }
    ],
    benefits: [
      '8.000 asientos',
      '18.000 asientos',
      '35.000 asientos',
      '55.000 asientos',
      '80.000 asientos'
    ],
    upgradeCost: [8000000, 25000000, 60000000, 120000000]
  },
  { 
    id: 'sponsorship', 
    name: 'Comercial', 
    icon: <Briefcase size={20} />, 
    category: 'income',
    color: '#ffd60a',
    description: 'Ingresos por patrocinios',
    hasSpec: false,
    levels: [
      { name: 'Básico', income: 25000 },
      { name: 'Activo', income: 70000 },
      { name: 'Profesional', income: 140000 },
      { name: 'Premium', income: 235000 }
    ],
    benefits: [
      '€1M/temporada',
      '€3M/temporada',
      '€6M/temporada',
      '€10M/temporada'
    ],
    upgradeCost: [2000000, 6000000, 18000000]
  },
  { 
    id: 'youth', 
    name: 'Cantera', 
    icon: <Sprout size={20} />, 
    category: 'development',
    color: '#64d97b',
    description: 'Genera jóvenes talentos',
    hasSpec: true,
    levels: [
      { name: 'Básica', talentMax: 60 },
      { name: 'Desarrollada', talentMax: 65 },
      { name: 'Avanzada', talentMax: 70 },
      { name: 'Élite', talentMax: 75 }
    ],
    benefits: [
      '1 canterano/temporada (50-60)',
      '1 canterano/temporada (55-65)',
      '1 canterano/temporada (58-70)',
      '1 canterano/temporada (62-75)'
    ],
    upgradeCost: [5000000, 15000000, 40000000]
  },
  { 
    id: 'medical', 
    name: 'Centro Médico', 
    icon: <HeartPulse size={20} />, 
    category: 'support',
    color: '#ff6b6b',
    description: 'Reduce tiempo de lesiones',
    hasSpec: true,
    levels: [
      { name: 'Básico', reduction: 0 },
      { name: 'Mejorado', reduction: 20 },
      { name: 'Avanzado', reduction: 35 },
      { name: 'Élite', reduction: 50 }
    ],
    benefits: [
      'Recuperación estándar',
      '-20% lesiones • 1 tratamiento',
      '-35% lesiones • 1 tratamiento',
      '-50% lesiones • 2 tratamientos'
    ],
    upgradeCost: [3000000, 12000000, 35000000]
  },
  { 
    id: 'scouting', 
    name: 'Ojeadores', 
    icon: <Search size={20} />, 
    category: 'support',
    color: '#bf5af2',
    description: 'Reduce costes de fichaje',
    hasSpec: false,
    levels: [
      { name: 'Local', discount: 0 },
      { name: 'Nacional', discount: 10 },
      { name: 'Europeo', discount: 20 },
      { name: 'Mundial', discount: 30 }
    ],
    benefits: [
      'Sin ventaja en fichajes',
      '-10% coste fichajes',
      '-20% coste fichajes',
      '-30% coste fichajes'
    ],
    upgradeCost: [2000000, 8000000, 20000000]
  },
];

const CATEGORIES = {
  income: { name: 'Ingresos', icon: <Coins size={14} />, color: '#ffd60a' },
  development: { name: 'Desarrollo', icon: <TrendingUp size={14} />, color: '#30d158' },
  support: { name: 'Soporte', icon: <Wrench size={14} />, color: '#bf5af2' }
};

export default function Facilities() {
  const { state, dispatch } = useGame();
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  
  const facilities = state.facilities || {};
  const facilitySpecs = state.facilitySpecs || {};
  const facilityStats = state.facilityStats || {};
  const pendingEvent = state.pendingEvent;
  
  // Escalar costes de instalaciones y beneficios por tier de liga
  const scaledFacilities = useMemo(() => {
    const costMult = getFacilityCostMultiplier(state.leagueId);
    const econMult = state.leagueId ? getEconomyMultiplier(state.leagueId) : 1.0;
    const formatScaled = (amount) => {
      if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
      if (amount >= 1000) return `€${Math.round(amount / 1000)}K`;
      return `€${amount}`;
    };
    return FACILITIES.map(f => {
      const scaled = {
        ...f,
        upgradeCost: f.upgradeCost.map(c => Math.round(c * costMult))
      };
      // Escalar beneficios de Comercial (income × economyMult)
      if (f.id === 'sponsorship') {
        const baseIncomes = [25000, 70000, 140000, 235000]; // weekly
        scaled.benefits = baseIncomes.map(w => {
          const annual = Math.round(w * econMult * 38);
          return `${formatScaled(annual)}/temporada`;
        });
      }
      return scaled;
    });
  }, [state.leagueId]);
  
  // Nuevo sistema de slots médicos
  const medicalLevel = facilities.medical || 0;
  const medicalSlots = state.medicalSlots || []; // Array de nombres de jugadores en tratamiento
  const totalSlots = getMedicalSlots(medicalLevel);
  const treatmentsAvailable = getMedicalTreatmentsAvailable(medicalLevel, medicalSlots);
  const treatmentCost = getMedicalTreatmentCost(medicalLevel, state.leagueId);
  const healingWeeks = getMedicalHealingWeeks(medicalLevel);
  const injuredPlayers = state.team?.players?.filter(p => p.injured && p.injuryWeeksLeft > 0) || [];
  // Solo se puede tratar si no tiene médico asignado
  const treatablePlayers = injuredPlayers.filter(p => !medicalSlots.includes(p.name));
  
  const formatMoney = (amount) => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    return `€${(amount / 1000).toFixed(0)}K`;
  };
  
  const calculateWeeklyIncome = () => {
    // Solo patrocinios dan ingreso fijo semanal
    // El estadio genera ingresos por taquilla (ver pestaña Estadio)
    const sponsorLevel = facilities.sponsorship || 0;
    const sponsorIncome = scaledFacilities[1].levels[sponsorLevel].income;
    return sponsorIncome;
  };
  
  const handleUpgrade = (facility) => {
    const currentLevel = facilities[facility.id] || 0;
    const maxLevel = facility.levels.length - 1;
    if (currentLevel >= maxLevel) return;
    
    const cost = facility.upgradeCost[currentLevel];
    if (state.money < cost) return;
    
    dispatch({
      type: 'UPGRADE_FACILITY',
      payload: { facilityId: facility.id, cost }
    });
    
    // Si es el estadio, también actualizar state.stadium.level para sincronizar
    if (facility.id === 'stadium') {
      dispatch({
        type: 'UPDATE_STADIUM',
        payload: { ...(state.stadium || {}), level: currentLevel + 1 }
      });
    }
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'facility',
        title: `${facility.icon} ${facility.name} mejorado`,
        content: `Nivel: ${facility.levels[currentLevel + 1].name}. ${facility.benefits[currentLevel + 1]}`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  const handleSpecChange = (facilityId, specId) => {
    dispatch({
      type: 'SET_FACILITY_SPEC',
      payload: { facility: facilityId, spec: specId }
    });
    setSelectedFacility(null);
  };
  
  const handleEventChoice = (choiceId) => {
    dispatch({ type: 'HANDLE_EVENT_CHOICE', payload: choiceId });
  };
  
  const handleDismissEvent = () => {
    dispatch({ type: 'DISMISS_EVENT' });
  };
  
  const handleTreatPlayer = (playerName) => {
    // Verificar que hay slots disponibles y dinero
    if (treatmentsAvailable <= 0 || state.money < treatmentCost) return;
    
    dispatch({ 
      type: 'APPLY_MEDICAL_TREATMENT', 
      payload: { 
        playerName, 
        healingWeeks,
        cost: treatmentCost 
      } 
    });
  };
  
  const facilitySpecsLocked = state.facilitySpecsLocked || {};
  
  const getSpecForFacility = (facilityId) => {
    const specConfig = FACILITY_SPECIALIZATIONS[facilityId];
    if (!specConfig) return null;
    
    const currentSpec = facilitySpecs[facilityId];
    if (!currentSpec) return null; // No spec selected yet
    return specConfig.options.find(o => o.id === currentSpec) || null;
  };
  
  const weeklyIncome = calculateWeeklyIncome();
  const youthAvgOvr = facilityStats.youth?.playersGenerated > 0 
    ? Math.round(facilityStats.youth.totalOvr / facilityStats.youth.playersGenerated) 
    : 0;

  // Group facilities by category
  const facilitiesByCategory = scaledFacilities.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});
  
  return (
    <div className="facilities-v2">
      {/* Event Modal */}
      {pendingEvent && (
        <div className="facilities-v2__modal-overlay">
          <div className="facilities-v2__modal">
            <div className="modal-header">
              <span className="modal-icon"><Zap size={22} /></span>
              <h3>{pendingEvent.title}</h3>
            </div>
            <p className="modal-message">{pendingEvent.message}</p>
            <div className="modal-choices">
              {pendingEvent.choices.map(choice => (
                <button 
                  key={choice.id}
                  className="modal-choice"
                  onClick={() => handleEventChoice(choice.id)}
                >
                  {choice.text}
                  {choice.cost && <span className="choice-cost">({formatMoney(choice.cost)})</span>}
                </button>
              ))}
            </div>
            <button className="modal-dismiss" onClick={handleDismissEvent}>
              Ignorar
            </button>
          </div>
        </div>
      )}
      
      {/* Specialization Modal */}
      {selectedFacility && FACILITY_SPECIALIZATIONS[selectedFacility] && !facilitySpecsLocked[selectedFacility] && (
        <div className="facilities-v2__modal-overlay" onClick={() => setSelectedFacility(null)}>
          <div className="facilities-v2__modal facilities-v2__modal--spec" onClick={e => e.stopPropagation()}>
            <h3><Target size={14} /> {FACILITY_SPECIALIZATIONS[selectedFacility].name}</h3>
            <p className="modal-subtitle">Elige la especialización (se bloqueará hasta la próxima temporada)</p>
            <div className="spec-grid">
              {FACILITY_SPECIALIZATIONS[selectedFacility].options.map(opt => {
                const isSelected = facilitySpecs[selectedFacility] === opt.id;
                return (
                  <button
                    key={opt.id}
                    className={`spec-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSpecChange(selectedFacility, opt.id)}
                  >
                    <span className="spec-card__icon">{opt.icon}</span>
                    <span className="spec-card__name">{opt.name}</span>
                    <span className="spec-card__desc">{opt.description}</span>
                    {isSelected && <span className="spec-card__check"><Check size={12} /></span>}
                  </button>
                );
              })}
            </div>
            <button className="modal-close" onClick={() => setSelectedFacility(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Header with summary */}
      <div className="facilities-v2__header">
        <div className="header-title">
          <h2><Wrench size={16} /> Instalaciones</h2>
          <p>Mejora tu club para competir al máximo nivel</p>
        </div>
        <div className="header-stats">
          <div className="stat-box stat-box--income">
            <span className="stat-icon"><Coins size={14} /></span>
            <div className="stat-content">
              <span className="stat-value">{formatMoney(weeklyIncome * 43)}</span>
              <span className="stat-label">Ingresos/temporada</span>
            </div>
          </div>
          <div className="stat-box stat-box--budget">
            <span className="stat-icon"><Building2 size={14} /></span>
            <div className="stat-content">
              <span className="stat-value">{formatMoney(state.money)}</span>
              <span className="stat-label">Presupuesto</span>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Bay */}
      {medicalLevel >= 2 && (
        <div className="facilities-v2__medical-bay">
          <div className="medical-header">
            <div className="medical-title">
              <span className="medical-icon"><HeartPulse size={16} /></span>
              <h3>Enfermería</h3>
            </div>
            <div className="medical-treatments">
              <span className="treatment-badge">
                <Stethoscope size={12} /> Médicos: {treatmentsAvailable}/{totalSlots} disponibles
              </span>
              {medicalLevel > 0 && (
                <span className="treatment-info">
                  Cura: -{healingWeeks} sem | Coste: {formatMoney(treatmentCost)}
                </span>
              )}
            </div>
          </div>
          
          {injuredPlayers.length === 0 ? (
            <div className="medical-empty">
              <span><Check size={14} /></span> Sin jugadores lesionados
            </div>
          ) : (
            <div className="medical-list">
              {injuredPlayers.map(player => {
                const hasDoctor = medicalSlots.includes(player.name);
                const canTreat = treatmentsAvailable > 0 && !hasDoctor && medicalLevel > 0;
                const newWeeks = Math.max(0, player.injuryWeeksLeft - healingWeeks);
                
                return (
                  <div key={player.name} className={`medical-player ${hasDoctor ? 'treated' : ''}`}>
                    <div className="player-avatar">
                      <span>{posES(player.position)}</span>
                    </div>
                    <div className="player-details">
                      <span className="player-name">{player.name}</span>
                      <span className="player-injury">
                        <HeartPulse size={12} /> {player.injuryWeeksLeft} sem{player.injuryWeeksLeft > 1 ? 'anas' : 'ana'}
                      </span>
                    </div>
                    {hasDoctor ? (
                      <span className="player-badge treated"><Stethoscope size={12} /> En tratamiento</span>
                    ) : medicalLevel === 0 ? (
                      <span className="player-badge minor">Sin centro médico</span>
                    ) : (
                      <button 
                        className="treat-button"
                        onClick={() => canTreat && handleTreatPlayer(player.name)}
                        disabled={!canTreat}
                        title={!canTreat ? 'No hay médicos disponibles' : `Reducir a ${newWeeks} semanas`}
                      >
                        <Syringe size={12} /> → {newWeeks} sem ({formatMoney(treatmentCost)})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Facilities by Category */}
      {Object.entries(facilitiesByCategory).map(([categoryId, categoryFacilities]) => {
        const category = CATEGORIES[categoryId];
        return (
          <div key={categoryId} className="facilities-v2__category">
            <div className="category-header" style={{ '--cat-color': category.color }}>
              <span className="category-icon">{category.icon}</span>
              <h3>{category.name}</h3>
            </div>
            
            <div className="category-grid">
              {categoryFacilities.map(facility => {
                const level = facilities[facility.id] || 0;
                const maxLevel = facility.levels.length - 1;
                const canUpgrade = level < maxLevel;
                const upgradeCost = canUpgrade ? facility.upgradeCost[level] : null;
                const canAfford = upgradeCost && state.money >= upgradeCost;
                const spec = getSpecForFacility(facility.id);
                const isExpanded = expandedCard === facility.id;
                
                return (
                  <div 
                    key={facility.id} 
                    className={`facility-card ${isExpanded ? 'expanded' : ''}`}
                    style={{ '--facility-color': facility.color }}
                  >
                    <div className="facility-card__main" onClick={() => setExpandedCard(isExpanded ? null : facility.id)}>
                      <div className="facility-card__icon-wrap">
                        <span className="facility-card__icon">{facility.icon}</span>
                        <div className="facility-card__level-badge">
                          {level + 1}
                        </div>
                      </div>
                      
                      <div className="facility-card__info">
                        <h4>{facility.name}</h4>
                        <p className="facility-card__desc">{facility.description}</p>
                        
                        <div className="facility-card__level-bar">
                          {facility.levels.map((_, i) => (
                            <div 
                              key={i} 
                              className={`level-segment ${i <= level ? 'filled' : ''}`}
                            />
                          ))}
                        </div>
                        
                        <div className="facility-card__benefit">
                          {facility.benefits[level]}
                        </div>
                      </div>
                      
                      <div className="facility-card__arrow">
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="facility-card__expanded">
                        {/* Specialization */}
                        {facility.hasSpec && (
                          <div 
                            className={`facility-card__spec ${facilitySpecsLocked[facility.id] ? 'locked' : ''} ${!spec ? 'pending' : ''}`}
                            onClick={() => !facilitySpecsLocked[facility.id] && setSelectedFacility(facility.id)}
                          >
                            <span className="spec-label">Especialización:</span>
                            {spec ? (
                              <>
                                <span className="spec-value spec-value--active">
                                  {spec.icon} {spec.name}
                                </span>
                                <span className="spec-locked">🔒</span>
                              </>
                            ) : (
                              <>
                                <span className="spec-value spec-value--none">
                                  <span className="spec-sparkle">✦</span> Sin elegir
                                </span>
                                <span className="spec-edit">Elegir →</span>
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* Upgrade Section */}
                        {canUpgrade ? (
                          <div className="facility-card__upgrade">
                            <div className="upgrade-info">
                              <span className="upgrade-label">Siguiente nivel:</span>
                              <span className="upgrade-name">{facility.levels[level + 1].name}</span>
                              <span className="upgrade-benefit">{facility.benefits[level + 1]}</span>
                            </div>
                            <button 
                              className={`upgrade-button ${canAfford ? '' : 'disabled'}`}
                              onClick={(e) => { e.stopPropagation(); handleUpgrade(facility); }}
                              disabled={!canAfford}
                            >
                              <span className="upgrade-text">Mejorar</span>
                              <span className="upgrade-cost">{formatMoney(upgradeCost)}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="facility-card__maxed">
                            Nivel Máximo
                          </div>
                        )}
                        
                        {/* All Levels */}
                        <div className="facility-card__levels">
                          {facility.levels.map((lvl, i) => (
                            <div key={i} className={`level-item ${i <= level ? 'unlocked' : ''} ${i === level ? 'current' : ''}`}>
                              <span className="level-num">{i + 1}</span>
                              <span className="level-name">{lvl.name}</span>
                              <span className="level-benefit">{facility.benefits[i]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Impact Stats */}
      {(facilityStats.youth?.playersGenerated > 0 || facilityStats.medical?.weeksSaved > 0 || facilityStats.medical?.treatmentsApplied > 0) && (
        <div className="facilities-v2__impact">
          <h3><BarChart3 size={14} /> Impacto de tus instalaciones</h3>
          <div className="impact-grid">
            {facilityStats.youth?.playersGenerated > 0 && (
              <div className="impact-item">
                <span className="impact-icon"><Sprout size={14} /></span>
                <span className="impact-value">{facilityStats.youth.playersGenerated}</span>
                <span className="impact-label">Canteranos ({youthAvgOvr} OVR)</span>
              </div>
            )}
            {facilityStats.medical?.treatmentsApplied > 0 && (
              <div className="impact-item">
                <span className="impact-icon"><Syringe size={12} /></span>
                <span className="impact-value">{facilityStats.medical.treatmentsApplied}</span>
                <span className="impact-label">Tratamientos</span>
              </div>
            )}
            {facilityStats.medical?.weeksSaved > 0 && (
              <div className="impact-item">
                <span className="impact-icon"><Clock size={16} /></span>
                <span className="impact-value">{facilityStats.medical.weeksSaved}</span>
                <span className="impact-label">Semanas ahorradas</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
