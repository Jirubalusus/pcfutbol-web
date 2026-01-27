import React from 'react';
import { useGame } from '../../context/GameContext';
import './Facilities.scss';

const FACILITIES = [
  { 
    id: 'stadium', 
    name: 'Estadio', 
    icon: '🏟️', 
    description: 'Capacidad y comodidades del estadio',
    levels: [
      { name: 'Básico', capacity: 25000, income: 500000 },
      { name: 'Mejorado', capacity: 40000, income: 900000 },
      { name: 'Moderno', capacity: 60000, income: 1500000 },
      { name: 'Élite', capacity: 85000, income: 2500000 }
    ],
    benefits: [
      '+€500K/semana en taquilla',
      '+€900K/semana, 40.000 asientos',
      '+€1.5M/semana, 60.000 asientos',
      '+€2.5M/semana, 85.000 asientos'
    ],
    upgradeCost: [5000000, 15000000, 40000000]
  },
  { 
    id: 'training', 
    name: 'Centro de Entrenamiento', 
    icon: '⚽', 
    description: 'Mejora el desarrollo de jugadores',
    levels: [
      { name: 'Básico', bonus: 0 },
      { name: 'Mejorado', bonus: 1 },
      { name: 'Profesional', bonus: 2 },
      { name: 'Élite', bonus: 3 }
    ],
    benefits: [
      'Entrenamiento estándar',
      '+1 media a jugadores/temporada',
      '+2 media a jugadores/temporada',
      '+3 media a jugadores/temporada'
    ],
    upgradeCost: [2000000, 8000000, 20000000]
  },
  { 
    id: 'youth', 
    name: 'Academia de Cantera', 
    icon: '🌱', 
    description: 'Genera talentos jóvenes cada temporada',
    levels: [
      { name: 'Básica', talentMax: 65 },
      { name: 'Desarrollada', talentMax: 72 },
      { name: 'Avanzada', talentMax: 78 },
      { name: 'Élite', talentMax: 85 }
    ],
    benefits: [
      'Canteranos hasta 65 de media',
      'Canteranos hasta 72 de media',
      'Canteranos hasta 78 de media',
      'Canteranos hasta 85 de media'
    ],
    upgradeCost: [3000000, 10000000, 25000000]
  },
  { 
    id: 'medical', 
    name: 'Centro Médico', 
    icon: '🏥', 
    description: 'Reduce tiempo de lesiones',
    levels: [
      { name: 'Básico', reduction: 0 },
      { name: 'Mejorado', reduction: 20 },
      { name: 'Avanzado', reduction: 35 },
      { name: 'Élite', reduction: 50 }
    ],
    benefits: [
      'Recuperación estándar',
      '-20% tiempo de lesiones',
      '-35% tiempo de lesiones',
      '-50% tiempo de lesiones'
    ],
    upgradeCost: [1500000, 5000000, 15000000]
  },
  { 
    id: 'scouting', 
    name: 'Red de Ojeadores', 
    icon: '🔍', 
    description: 'Descubre mejores jugadores en el mercado',
    levels: [
      { name: 'Local', range: 'Liga local' },
      { name: 'Nacional', range: 'Todo el país' },
      { name: 'Europeo', range: 'Europa' },
      { name: 'Mundial', range: 'Todo el mundo' }
    ],
    benefits: [
      'Solo jugadores de La Liga',
      'Acceso a Segunda División',
      'Acceso a ligas europeas',
      'Acceso a ligas mundiales'
    ],
    upgradeCost: [1000000, 4000000, 12000000]
  },
  { 
    id: 'sponsorship', 
    name: 'Departamento Comercial', 
    icon: '💼', 
    description: 'Genera ingresos por patrocinios',
    levels: [
      { name: 'Básico', income: 200000 },
      { name: 'Activo', income: 500000 },
      { name: 'Profesional', income: 1000000 },
      { name: 'Premium', income: 2000000 }
    ],
    benefits: [
      '+€200K/semana sponsors',
      '+€500K/semana sponsors',
      '+€1M/semana sponsors',
      '+€2M/semana sponsors'
    ],
    upgradeCost: [2000000, 6000000, 18000000]
  },
];

export default function Facilities() {
  const { state, dispatch } = useGame();
  
  const facilities = state.facilities || {
    stadium: 0,
    training: 0,
    youth: 0,
    medical: 0,
    scouting: 0,
    sponsorship: 0
  };
  
  const formatMoney = (amount) => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    return `€${(amount / 1000).toFixed(0)}K`;
  };
  
  // Calculate weekly income from facilities
  const calculateWeeklyIncome = () => {
    const stadiumLevel = facilities.stadium || 0;
    const sponsorLevel = facilities.sponsorship || 0;
    
    const stadiumIncome = FACILITIES[0].levels[stadiumLevel].income;
    const sponsorIncome = FACILITIES[5].levels[sponsorLevel].income;
    
    return stadiumIncome + sponsorIncome;
  };
  
  const handleUpgrade = (facility) => {
    const currentLevel = facilities[facility.id] || 0;
    if (currentLevel >= 3) return;
    
    const cost = facility.upgradeCost[currentLevel];
    if (state.money < cost) return;
    
    dispatch({
      type: 'UPGRADE_FACILITY',
      payload: { facilityId: facility.id, cost }
    });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'facility',
        title: `${facility.name} mejorado`,
        content: `Ahora tienes: ${facility.levels[currentLevel + 1].name}. ${facility.benefits[currentLevel + 1]}`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  const weeklyIncome = calculateWeeklyIncome();
  
  return (
    <div className="facilities">
      <div className="facilities__header">
        <div>
          <h2>Instalaciones del Club</h2>
          <p className="facilities__subtitle">
            Mejora las instalaciones para potenciar tu equipo
          </p>
        </div>
        <div className="facilities__income">
          <span className="label">Ingresos semanales:</span>
          <span className="value">{formatMoney(weeklyIncome)}</span>
        </div>
      </div>
      
      <div className="facilities__grid">
        {FACILITIES.map(facility => {
          const level = facilities[facility.id] || 0;
          const canUpgrade = level < 3;
          const upgradeCost = canUpgrade ? facility.upgradeCost[level] : null;
          const canAfford = upgradeCost && state.money >= upgradeCost;
          const currentBenefit = facility.benefits[level];
          const nextBenefit = canUpgrade ? facility.benefits[level + 1] : null;
          
          return (
            <div key={facility.id} className="facilities__card">
              <div className="facilities__icon">{facility.icon}</div>
              <div className="facilities__info">
                <h3>{facility.name}</h3>
                <p className="description">{facility.description}</p>
                <div className="level">
                  <span className="label">Nivel:</span>
                  <span className="value">{facility.levels[level].name}</span>
                </div>
                <div className="level-bar">
                  {[0, 1, 2, 3].map(i => (
                    <div 
                      key={i} 
                      className={`level-pip ${i <= level ? 'filled' : ''}`} 
                    />
                  ))}
                </div>
                <div className="current-benefit">
                  <span className="benefit-icon">✓</span>
                  {currentBenefit}
                </div>
                {nextBenefit && (
                  <div className="next-benefit">
                    <span className="benefit-icon">→</span>
                    Siguiente: {nextBenefit}
                  </div>
                )}
              </div>
              {canUpgrade && (
                <button 
                  className={`facilities__upgrade ${canAfford ? '' : 'disabled'}`}
                  onClick={() => handleUpgrade(facility)}
                  disabled={!canAfford}
                >
                  <span className="upgrade-text">Mejorar</span>
                  <span className="upgrade-cost">{formatMoney(upgradeCost)}</span>
                </button>
              )}
              {!canUpgrade && (
                <div className="facilities__maxed">
                  ✓ Nivel Máximo
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
