import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { translatePosition } from '../../game/positionNames';
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

// Facility data with i18n keys (resolved at render time via getFacilities(t))
const getFacilities = (t) => [
  { 
    id: 'stadium', 
    name: t('facilities.facilityNames.stadium'), 
    icon: <Building2 size={20} />, 
    category: 'income',
    color: '#4a9eff',
    description: t('facilities.facilityDescs.stadium'),
    hasSpec: false,
    levels: [
      { name: t('facilities.levelNames.municipal'), capacity: 8000 },
      { name: t('facilities.levelNames.modern'), capacity: 18000 },
      { name: t('facilities.levelNames.large'), capacity: 35000 },
      { name: t('facilities.levelNames.elite'), capacity: 55000 },
      { name: t('facilities.levelNames.legendary'), capacity: 80000 }
    ],
    benefits: [
      t('facilities.benefits.seats', { count: '8,000' }),
      t('facilities.benefits.seats', { count: '18,000' }),
      t('facilities.benefits.seats', { count: '35,000' }),
      t('facilities.benefits.seats', { count: '55,000' }),
      t('facilities.benefits.seats', { count: '80,000' })
    ],
    upgradeCost: [8000000, 25000000, 60000000, 120000000]
  },
  { 
    id: 'sponsorship', 
    name: t('facilities.facilityNames.sponsorship'), 
    icon: <Briefcase size={20} />, 
    category: 'income',
    color: '#ffd60a',
    description: t('facilities.facilityDescs.sponsorship'),
    hasSpec: false,
    levels: [
      { name: t('facilities.levelNames.basic'), income: 25000 },
      { name: t('facilities.levelNames.active'), income: 70000 },
      { name: t('facilities.levelNames.professional'), income: 140000 },
      { name: t('facilities.levelNames.premium'), income: 235000 }
    ],
    benefits: [
      '€1M/' + t('common.season').toLowerCase(),
      '€3M/' + t('common.season').toLowerCase(),
      '€6M/' + t('common.season').toLowerCase(),
      '€10M/' + t('common.season').toLowerCase()
    ],
    upgradeCost: [2000000, 6000000, 18000000]
  },
  { 
    id: 'youth', 
    name: t('facilities.facilityNames.youth'), 
    icon: <Sprout size={20} />, 
    category: 'development',
    color: '#64d97b',
    description: t('facilities.facilityDescs.youth'),
    hasSpec: true,
    levels: [
      { name: t('facilities.levelNames.basic'), talentMax: 60 },
      { name: t('facilities.levelNames.developed'), talentMax: 65 },
      { name: t('facilities.levelNames.advanced'), talentMax: 70 },
      { name: t('facilities.levelNames.elite'), talentMax: 75 }
    ],
    benefits: [
      t('facilities.benefits.youthPlayer', { range: '50-60' }),
      t('facilities.benefits.youthPlayer', { range: '55-65' }),
      t('facilities.benefits.youthPlayer', { range: '58-70' }),
      t('facilities.benefits.youthPlayer', { range: '62-75' })
    ],
    upgradeCost: [5000000, 15000000, 40000000]
  },
  { 
    id: 'medical', 
    name: t('facilities.facilityNames.medical'), 
    icon: <HeartPulse size={20} />, 
    category: 'support',
    color: '#ff6b6b',
    description: t('facilities.facilityDescs.medical'),
    hasSpec: true,
    levels: [
      { name: t('facilities.levelNames.basic'), reduction: 0 },
      { name: t('facilities.levelNames.improved'), reduction: 20 },
      { name: t('facilities.levelNames.advanced'), reduction: 35 },
      { name: t('facilities.levelNames.elite'), reduction: 50 }
    ],
    benefits: [
      t('facilities.benefits.standardRecovery'),
      t('facilities.benefits.injuryReduction', { percent: 20, treatments: 1 }),
      t('facilities.benefits.injuryReduction', { percent: 35, treatments: 1 }),
      t('facilities.benefits.injuryReduction', { percent: 50, treatments: 2 })
    ],
    upgradeCost: [3000000, 12000000, 35000000]
  },
  { 
    id: 'scouting', 
    name: t('facilities.facilityNames.scouting'), 
    icon: <Search size={20} />, 
    category: 'support',
    color: '#bf5af2',
    description: t('facilities.facilityDescs.scouting'),
    hasSpec: false,
    levels: [
      { name: t('facilities.levelNames.local'), discount: 0 },
      { name: t('facilities.levelNames.national'), discount: 10 },
      { name: t('facilities.levelNames.european'), discount: 20 },
      { name: t('facilities.levelNames.worldwide'), discount: 30 }
    ],
    benefits: [
      t('facilities.benefits.noTransferAdvantage'),
      t('facilities.benefits.transferDiscount', { percent: 10 }),
      t('facilities.benefits.transferDiscount', { percent: 20 }),
      t('facilities.benefits.transferDiscount', { percent: 30 })
    ],
    upgradeCost: [2000000, 8000000, 20000000]
  },
];

const CATEGORIES = {
  income: { nameKey: 'facilities.categories.income', icon: <Coins size={14} />, color: '#ffd60a' },
  development: { nameKey: 'facilities.categories.development', icon: <TrendingUp size={14} />, color: '#30d158' },
  support: { nameKey: 'facilities.categories.support', icon: <Wrench size={14} />, color: '#bf5af2' }
};

export default function Facilities() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  
  const facilities = state.facilities || {};
  const facilitySpecs = state.facilitySpecs || {};
  const facilityStats = state.facilityStats || {};
  const pendingEvent = state.pendingEvent;
  
  const FACILITIES = useMemo(() => getFacilities(t), [t]);
  
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
      // Comercial: mismos valores para todas las ligas (no escala)
      if (f.id === 'sponsorship') {
        const baseIncomes = [25000, 70000, 140000, 235000]; // weekly
        scaled.benefits = baseIncomes.map(w => {
          const annual = Math.round(w * 38);
          return `${formatScaled(annual)}/temporada`;
        });
      }
      return scaled;
    });
  }, [state.leagueId, FACILITIES]);
  
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
        title: `${facility.name} ${t('facilities.upgraded')}`,
        content: `${t('facilities.level')}: ${facility.levels[currentLevel + 1].name}. ${facility.benefits[currentLevel + 1]}`,
        date: `${t('common.week')} ${state.currentWeek}`
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
              {t('facilities.ignore')}
            </button>
          </div>
        </div>
      )}
      
      {/* Specialization Modal */}
      {selectedFacility && FACILITY_SPECIALIZATIONS[selectedFacility] && !facilitySpecsLocked[selectedFacility] && (
        <div className="facilities-v2__modal-overlay" onClick={() => setSelectedFacility(null)}>
          <div className="facilities-v2__modal facilities-v2__modal--spec" onClick={e => e.stopPropagation()}>
            <h3><Target size={14} /> {FACILITY_SPECIALIZATIONS[selectedFacility].name}</h3>
            <p className="modal-subtitle">{t('facilities.chooseSpecDesc')}</p>
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
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* Header with summary */}
      <div className="facilities-v2__header">
        <div className="header-title">
          <h2><Wrench size={16} /> {t('facilities.title')}</h2>
          <p>{t('facilities.subtitle')}</p>
        </div>
        <div className="header-stats">
          <div className="stat-box stat-box--income">
            <span className="stat-icon"><Coins size={14} /></span>
            <div className="stat-content">
              <span className="stat-value">{formatMoney(weeklyIncome * 43)}</span>
              <span className="stat-label">{t('facilities.incomePerSeason')}</span>
            </div>
          </div>
          <div className="stat-box stat-box--budget">
            <span className="stat-icon"><Building2 size={14} /></span>
            <div className="stat-content">
              <span className="stat-value">{formatMoney(state.money)}</span>
              <span className="stat-label">{t('common.budget')}</span>
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
              <h3>{t('facilities.medical.infirmary')}</h3>
            </div>
            <div className="medical-treatments">
              <span className="treatment-badge">
                <Stethoscope size={12} /> {t('facilities.medical.doctors')}: {treatmentsAvailable}/{totalSlots} {t('facilities.medical.available')}
              </span>
              {medicalLevel > 0 && (
                <span className="treatment-info">
                  {t('facilities.medical.heals')}: -{healingWeeks} {t('facilities.medical.weeks')} | {t('facilities.medical.cost')}: {formatMoney(treatmentCost)}
                </span>
              )}
            </div>
          </div>
          
          {injuredPlayers.length === 0 ? (
            <div className="medical-empty">
              <span><Check size={14} /></span> {t('facilities.medical.noInjured')}
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
                      <span>{translatePosition(player.position)}</span>
                    </div>
                    <div className="player-details">
                      <span className="player-name">{player.name}</span>
                      <span className="player-injury">
                        <HeartPulse size={12} /> {player.injuryWeeksLeft} {t('facilities.medical.weeksShort')}{player.injuryWeeksLeft > 1 ? t('facilities.medical.weeksPlural') : t('facilities.medical.weeksSingular')}
                      </span>
                    </div>
                    {hasDoctor ? (
                      <span className="player-badge treated"><Stethoscope size={12} /> {t('facilities.medical.inTreatment')}</span>
                    ) : medicalLevel === 0 ? (
                      <span className="player-badge minor">{t('facilities.medical.noMedicalCenter')}</span>
                    ) : (
                      <button 
                        className="treat-button"
                        onClick={() => canTreat && handleTreatPlayer(player.name)}
                        disabled={!canTreat}
                        title={!canTreat ? t('facilities.medical.noDoctorsAvailable') : `${t('facilities.medical.reduceTo')} ${newWeeks} ${t('facilities.medical.weeks')}`}
                      >
                        <Syringe size={12} /> → {newWeeks} {t('facilities.medical.weeksShort')} ({formatMoney(treatmentCost)})
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
              <h3>{t(category.nameKey)}</h3>
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
                            <span className="spec-label">{t('facilities.specialization')}:</span>
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
                                  <span className="spec-sparkle">✦</span> {t('facilities.notChosen')}
                                </span>
                                <span className="spec-edit">{t('facilities.choose')} →</span>
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* Upgrade Section */}
                        {canUpgrade ? (
                          <div className="facility-card__upgrade">
                            <div className="upgrade-info">
                              <span className="upgrade-label">{t('facilities.nextLevel')}:</span>
                              <span className="upgrade-name">{facility.levels[level + 1].name}</span>
                              <span className="upgrade-benefit">{facility.benefits[level + 1]}</span>
                            </div>
                            <button 
                              className={`upgrade-button ${canAfford ? '' : 'disabled'}`}
                              onClick={(e) => { e.stopPropagation(); handleUpgrade(facility); }}
                              disabled={!canAfford}
                            >
                              <span className="upgrade-text">{t('facilities.upgrade')}</span>
                              <span className="upgrade-cost">{formatMoney(upgradeCost)}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="facility-card__maxed">
                            {t('facilities.maxLevel')}
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
          <h3><BarChart3 size={14} /> {t('facilities.impact.title')}</h3>
          <div className="impact-grid">
            {facilityStats.youth?.playersGenerated > 0 && (
              <div className="impact-item">
                <span className="impact-icon"><Sprout size={14} /></span>
                <span className="impact-value">{facilityStats.youth.playersGenerated}</span>
                <span className="impact-label">{t('facilities.impact.youth')} ({youthAvgOvr} OVR)</span>
              </div>
            )}
            {facilityStats.medical?.treatmentsApplied > 0 && (
              <div className="impact-item">
                <span className="impact-icon"><Syringe size={12} /></span>
                <span className="impact-value">{facilityStats.medical.treatmentsApplied}</span>
                <span className="impact-label">{t('facilities.impact.treatments')}</span>
              </div>
            )}
            {facilityStats.medical?.weeksSaved > 0 && (
              <div className="impact-item">
                <span className="impact-icon"><Clock size={16} /></span>
                <span className="impact-value">{facilityStats.medical.weeksSaved}</span>
                <span className="impact-label">{t('facilities.impact.weeksSaved')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
