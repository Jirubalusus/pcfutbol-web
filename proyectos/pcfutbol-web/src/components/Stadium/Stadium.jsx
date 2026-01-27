import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { LALIGA_TEAMS } from '../../data/teams';
import './Stadium.scss';

// === CONFIGURACIÓN DEL ESTADIO ===
const STADIUM_ZONES = {
  fondo: { name: 'Fondo', icon: '🎫', basePrice: 20, capacityRatio: 0.35, comfort: 1 },
  lateral: { name: 'Lateral', icon: '🎟️', basePrice: 35, capacityRatio: 0.35, comfort: 2 },
  tribuna: { name: 'Tribuna', icon: '💺', basePrice: 60, capacityRatio: 0.20, comfort: 3 },
  vip: { name: 'VIP', icon: '👔', basePrice: 120, capacityRatio: 0.10, comfort: 5 }
};

const SEASON_TICKET_DISCOUNT = 0.35; // 35% descuento por abono (19 partidos)
const HOME_GAMES_PER_SEASON = 19;

const STADIUM_LEVELS = [
  { name: 'Estadio Municipal', capacity: 15000, maintenance: 80000, upgradeCost: null, features: [] },
  { name: 'Estadio Moderno', capacity: 25000, maintenance: 180000, upgradeCost: 15000000, features: ['Pantalla LED', 'Mejor acústica'] },
  { name: 'Estadio Grande', capacity: 45000, maintenance: 350000, upgradeCost: 40000000, features: ['Techo parcial', 'Palcos Premium'] },
  { name: 'Estadio de Élite', capacity: 65000, maintenance: 550000, upgradeCost: 80000000, features: ['Techo retráctil', 'Museo del club'] },
  { name: 'Estadio Legendario', capacity: 90000, maintenance: 800000, upgradeCost: 150000000, features: ['Hotel integrado', 'Centro comercial'] }
];

const EXTRA_SERVICES = {
  parking: { name: 'Parking', icon: '🅿️', price: 8, penetration: 0.20, upgradeCost: 2000000 },
  food: { name: 'Restauración', icon: '🍔', price: 8, penetration: 0.45, upgradeCost: 3000000 },
  merchandise: { name: 'Tienda Oficial', icon: '👕', price: 15, penetration: 0.10, upgradeCost: 1500000 },
  tour: { name: 'Tour del Estadio', icon: '🎒', weeklyVisitors: 300, price: 15, upgradeCost: 1000000 }
};

// === COMPONENTE PRINCIPAL ===
export default function Stadium() {
  const { state, dispatch } = useGame();
  const [activeTab, setActiveTab] = useState('overview');
  const [priceAdjustments, setPriceAdjustments] = useState({
    fondo: 0,
    lateral: 0,
    tribuna: 0,
    vip: 0
  });
  
  // Estado del estadio
  const stadiumState = state.stadium || {
    level: 0,
    seasonTickets: { fondo: 0, lateral: 0, tribuna: 0, vip: 0 },
    ticketPrices: { fondo: 25, lateral: 45, tribuna: 75, vip: 150 },
    services: { parking: false, food: false, merchandise: false, tour: false },
    lastMatchIncome: 0,
    totalSeasonIncome: 0
  };
  
  const currentLevel = STADIUM_LEVELS[stadiumState.level] || STADIUM_LEVELS[0];
  const nextLevel = STADIUM_LEVELS[stadiumState.level + 1];
  
  // Calcular capacidad por zona
  const zoneCapacities = useMemo(() => {
    const total = currentLevel.capacity;
    return {
      fondo: Math.floor(total * STADIUM_ZONES.fondo.capacityRatio),
      lateral: Math.floor(total * STADIUM_ZONES.lateral.capacityRatio),
      tribuna: Math.floor(total * STADIUM_ZONES.tribuna.capacityRatio),
      vip: Math.floor(total * STADIUM_ZONES.vip.capacityRatio)
    };
  }, [currentLevel.capacity]);
  
  // Precios actuales con ajustes
  const currentPrices = useMemo(() => ({
    fondo: Math.max(10, STADIUM_ZONES.fondo.basePrice + priceAdjustments.fondo),
    lateral: Math.max(15, STADIUM_ZONES.lateral.basePrice + priceAdjustments.lateral),
    tribuna: Math.max(30, STADIUM_ZONES.tribuna.basePrice + priceAdjustments.tribuna),
    vip: Math.max(80, STADIUM_ZONES.vip.basePrice + priceAdjustments.vip)
  }), [priceAdjustments]);
  
  // Simular próximo partido
  const simulateNextMatch = useMemo(() => {
    // Obtener próximo rival
    const fixtures = state.fixtures || [];
    const nextMatch = fixtures.find(f => 
      !f.played && 
      (f.homeTeam === state.teamId || f.awayTeam === state.teamId) &&
      f.homeTeam === state.teamId // Solo partidos en casa
    );
    
    if (!nextMatch) return null;
    
    const rival = LALIGA_TEAMS.find(t => t.id === nextMatch.awayTeam);
    if (!rival) return null;
    
    // Factor de atracción del rival (equipos grandes llenan más)
    const rivalAttraction = Math.min(1, (rival.reputation || 70) / 85);
    
    // Factor de posición en liga
    const teamPosition = (state.leagueTable?.findIndex(t => t.teamId === state.teamId) || 10) + 1;
    const positionFactor = teamPosition <= 6 ? 1.1 : teamPosition >= 15 ? 0.85 : 1;
    
    // Factor de precio (precios más altos = menos asistencia)
    const avgPriceRatio = (
      (currentPrices.fondo / STADIUM_ZONES.fondo.basePrice) * 0.35 +
      (currentPrices.lateral / STADIUM_ZONES.lateral.basePrice) * 0.35 +
      (currentPrices.tribuna / STADIUM_ZONES.tribuna.basePrice) * 0.20 +
      (currentPrices.vip / STADIUM_ZONES.vip.basePrice) * 0.10
    );
    const priceFactor = Math.max(0.5, 1.2 - avgPriceRatio * 0.3);
    
    // Calcular asistencia por zona
    const baseAttendance = 0.65; // 65% base
    const attendance = {};
    const income = { tickets: 0, services: 0, total: 0 };
    
    Object.entries(STADIUM_ZONES).forEach(([zone, config]) => {
      const zoneCapacity = zoneCapacities[zone];
      const seasonTickets = stadiumState.seasonTickets?.[zone] || 0;
      const availableSeats = zoneCapacity - seasonTickets;
      
      // Ocupación de asientos libres
      const occupancyRate = Math.min(1, baseAttendance * rivalAttraction * positionFactor * priceFactor);
      const soldTickets = Math.floor(availableSeats * occupancyRate);
      
      attendance[zone] = {
        seasonTickets,
        soldTickets,
        total: seasonTickets + soldTickets,
        capacity: zoneCapacity,
        occupancy: Math.round(((seasonTickets + soldTickets) / zoneCapacity) * 100)
      };
      
      // Ingresos (abonados ya pagaron al inicio de temporada)
      income.tickets += soldTickets * currentPrices[zone];
    });
    
    // Ingresos por servicios extra
    const totalAttendance = Object.values(attendance).reduce((sum, z) => sum + z.total, 0);
    
    if (stadiumState.services?.parking) {
      income.services += Math.floor(totalAttendance * EXTRA_SERVICES.parking.penetration * EXTRA_SERVICES.parking.price);
    }
    if (stadiumState.services?.food) {
      income.services += Math.floor(totalAttendance * EXTRA_SERVICES.food.penetration * EXTRA_SERVICES.food.price);
    }
    if (stadiumState.services?.merchandise) {
      income.services += Math.floor(totalAttendance * EXTRA_SERVICES.merchandise.penetration * EXTRA_SERVICES.merchandise.price);
    }
    
    income.total = income.tickets + income.services;
    
    return {
      rival,
      week: nextMatch.week,
      attendance,
      totalAttendance,
      income,
      factors: { rivalAttraction, positionFactor, priceFactor }
    };
  }, [state.fixtures, state.teamId, state.leagueTable, currentPrices, zoneCapacities, stadiumState]);
  
  // Calcular ingresos por abonos
  const seasonTicketIncome = useMemo(() => {
    let total = 0;
    Object.entries(stadiumState.seasonTickets || {}).forEach(([zone, count]) => {
      const fullPrice = currentPrices[zone] * HOME_GAMES_PER_SEASON;
      const discountedPrice = fullPrice * (1 - SEASON_TICKET_DISCOUNT);
      total += count * discountedPrice;
    });
    return total;
  }, [stadiumState.seasonTickets, currentPrices]);
  
  // Ingresos semanales del tour
  const weeklyTourIncome = stadiumState.services?.tour 
    ? EXTRA_SERVICES.tour.weeklyVisitors * EXTRA_SERVICES.tour.price 
    : 0;
  
  // === HANDLERS ===
  const handlePriceChange = (zone, delta) => {
    setPriceAdjustments(prev => ({
      ...prev,
      [zone]: prev[zone] + delta
    }));
  };
  
  const handleSeasonTicketChange = (zone, delta) => {
    const current = stadiumState.seasonTickets?.[zone] || 0;
    const maxCapacity = Math.floor(zoneCapacities[zone] * 0.8); // Máximo 80% abonados
    const newValue = Math.max(0, Math.min(maxCapacity, current + delta));
    
    dispatch({
      type: 'UPDATE_STADIUM',
      payload: {
        ...stadiumState,
        seasonTickets: {
          ...stadiumState.seasonTickets,
          [zone]: newValue
        }
      }
    });
  };
  
  const handleUpgradeStadium = () => {
    if (!nextLevel || state.money < nextLevel.upgradeCost) return;
    
    dispatch({
      type: 'UPDATE_STADIUM',
      payload: {
        ...stadiumState,
        level: stadiumState.level + 1
      }
    });
    
    dispatch({
      type: 'UPDATE_MONEY',
      payload: -nextLevel.upgradeCost
    });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: '🏟️ Estadio ampliado',
        content: `¡Tu estadio ahora es ${nextLevel.name}! Capacidad: ${nextLevel.capacity.toLocaleString()} espectadores`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  const handleUnlockService = (serviceId) => {
    const service = EXTRA_SERVICES[serviceId];
    if (!service || state.money < service.upgradeCost) return;
    
    dispatch({
      type: 'UPDATE_STADIUM',
      payload: {
        ...stadiumState,
        services: {
          ...stadiumState.services,
          [serviceId]: true
        }
      }
    });
    
    dispatch({
      type: 'UPDATE_MONEY',
      payload: -service.upgradeCost
    });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: `${service.icon} Servicio desbloqueado`,
        content: `${service.name} ahora disponible en tu estadio`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  const formatMoney = (amount) => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `€${(amount / 1000).toFixed(0)}K`;
    return `€${amount}`;
  };
  
  // === RENDER ===
  return (
    <div className="stadium">
      {/* Header */}
      <div className="stadium__header">
        <div className="stadium__title">
          <h2>🏟️ {state.team?.stadium || currentLevel.name}</h2>
          <span className="stadium__level">{currentLevel.name} - {currentLevel.capacity.toLocaleString()} asientos</span>
        </div>
        <div className="stadium__budget">
          <span className="label">Presupuesto:</span>
          <span className="value">{formatMoney(state.money)}</span>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="stadium__tabs">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
          📊 Resumen
        </button>
        <button className={activeTab === 'tickets' ? 'active' : ''} onClick={() => setActiveTab('tickets')}>
          🎫 Entradas
        </button>
        <button className={activeTab === 'seasonTickets' ? 'active' : ''} onClick={() => setActiveTab('seasonTickets')}>
          📋 Abonos
        </button>
        <button className={activeTab === 'services' ? 'active' : ''} onClick={() => setActiveTab('services')}>
          🏪 Servicios
        </button>
        <button className={activeTab === 'upgrade' ? 'active' : ''} onClick={() => setActiveTab('upgrade')}>
          🔧 Ampliación
        </button>
      </div>
      
      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="stadium__overview">
          {/* Mapa del estadio */}
          <div className="stadium__map">
            <div className="stadium-visual">
              <div className="field">⚽</div>
              <div className="zone vip" style={{ '--occupancy': `${simulateNextMatch?.attendance.vip.occupancy || 0}%` }}>
                <span className="zone-name">VIP</span>
                <span className="zone-capacity">{zoneCapacities.vip.toLocaleString()}</span>
              </div>
              <div className="zone tribuna" style={{ '--occupancy': `${simulateNextMatch?.attendance.tribuna.occupancy || 0}%` }}>
                <span className="zone-name">Tribuna</span>
                <span className="zone-capacity">{zoneCapacities.tribuna.toLocaleString()}</span>
              </div>
              <div className="zone lateral left" style={{ '--occupancy': `${simulateNextMatch?.attendance.lateral.occupancy || 0}%` }}>
                <span className="zone-name">Lateral</span>
              </div>
              <div className="zone lateral right" style={{ '--occupancy': `${simulateNextMatch?.attendance.lateral.occupancy || 0}%` }}>
                <span className="zone-name">Lateral</span>
              </div>
              <div className="zone fondo top" style={{ '--occupancy': `${simulateNextMatch?.attendance.fondo.occupancy || 0}%` }}>
                <span className="zone-name">Fondo</span>
              </div>
              <div className="zone fondo bottom" style={{ '--occupancy': `${simulateNextMatch?.attendance.fondo.occupancy || 0}%` }}>
                <span className="zone-name">Fondo</span>
              </div>
            </div>
          </div>
          
          {/* Stats rápidas */}
          <div className="stadium__quick-stats">
            <div className="stat-card">
              <span className="icon">🎫</span>
              <div className="info">
                <span className="value">{currentLevel.capacity.toLocaleString()}</span>
                <span className="label">Capacidad total</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="icon">📋</span>
              <div className="info">
                <span className="value">
                  {Object.values(stadiumState.seasonTickets || {}).reduce((a, b) => a + b, 0).toLocaleString()}
                </span>
                <span className="label">Abonados</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="icon">💰</span>
              <div className="info">
                <span className="value">{formatMoney(seasonTicketIncome)}</span>
                <span className="label">Ingresos abonos</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="icon">🔧</span>
              <div className="info">
                <span className="value">{formatMoney(currentLevel.maintenance)}/sem</span>
                <span className="label">Mantenimiento</span>
              </div>
            </div>
          </div>
          
          {/* Próximo partido */}
          {simulateNextMatch && (
            <div className="stadium__next-match">
              <h3>📅 Próximo partido en casa</h3>
              <div className="match-info">
                <div className="rival">
                  <span className="vs">vs</span>
                  <span className="name">{simulateNextMatch.rival.name}</span>
                  <span className="week">Jornada {simulateNextMatch.week}</span>
                </div>
                <div className="prediction">
                  <div className="attendance-prediction">
                    <span className="label">Asistencia prevista:</span>
                    <span className="value">{simulateNextMatch.totalAttendance.toLocaleString()}</span>
                    <span className="percent">
                      ({Math.round((simulateNextMatch.totalAttendance / currentLevel.capacity) * 100)}%)
                    </span>
                  </div>
                  <div className="income-prediction">
                    <span className="label">Ingresos previstos:</span>
                    <span className="value highlight">{formatMoney(simulateNextMatch.income.total)}</span>
                  </div>
                  <div className="income-breakdown">
                    <span>Taquilla: {formatMoney(simulateNextMatch.income.tickets)}</span>
                    <span>Servicios: {formatMoney(simulateNextMatch.income.services)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Precios de entradas */}
      {activeTab === 'tickets' && (
        <div className="stadium__tickets">
          <h3>💵 Precios de entradas por partido</h3>
          <p className="hint">Ajusta los precios. Precios más altos = más ingresos pero menos asistencia.</p>
          
          <div className="ticket-zones">
            {Object.entries(STADIUM_ZONES).map(([zoneId, zone]) => (
              <div key={zoneId} className="ticket-zone">
                <div className="zone-header">
                  <span className="icon">{zone.icon}</span>
                  <span className="name">{zone.name}</span>
                  <span className="capacity">{zoneCapacities[zoneId].toLocaleString()} asientos</span>
                </div>
                <div className="price-control">
                  <button onClick={() => handlePriceChange(zoneId, -5)}>-5€</button>
                  <div className="current-price">
                    <span className="amount">€{currentPrices[zoneId]}</span>
                    {priceAdjustments[zoneId] !== 0 && (
                      <span className={`adjustment ${priceAdjustments[zoneId] > 0 ? 'up' : 'down'}`}>
                        {priceAdjustments[zoneId] > 0 ? '+' : ''}{priceAdjustments[zoneId]}€
                      </span>
                    )}
                  </div>
                  <button onClick={() => handlePriceChange(zoneId, 5)}>+5€</button>
                </div>
                <div className="price-info">
                  <span>Base: €{zone.basePrice}</span>
                  <span>Ingreso máx/partido: {formatMoney(zoneCapacities[zoneId] * currentPrices[zoneId])}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="price-summary">
            <h4>📊 Impacto estimado</h4>
            <div className="impact-grid">
              <div className="impact-item">
                <span className="label">Ingreso potencial/partido:</span>
                <span className="value">
                  {formatMoney(
                    Object.entries(zoneCapacities).reduce((sum, [zone, cap]) => 
                      sum + cap * currentPrices[zone], 0
                    )
                  )}
                </span>
              </div>
              <div className="impact-item">
                <span className="label">Factor de ocupación:</span>
                <span className={`value ${simulateNextMatch?.factors.priceFactor < 0.9 ? 'warning' : ''}`}>
                  {((simulateNextMatch?.factors.priceFactor || 1) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Abonos */}
      {activeTab === 'seasonTickets' && (
        <div className="stadium__season-tickets">
          <h3>📋 Gestión de abonados</h3>
          <p className="hint">
            Los abonados pagan al inicio de temporada con {Math.round(SEASON_TICKET_DISCOUNT * 100)}% de descuento 
            ({HOME_GAMES_PER_SEASON} partidos). Garantizan ingresos fijos.
          </p>
          
          <div className="season-ticket-zones">
            {Object.entries(STADIUM_ZONES).map(([zoneId, zone]) => {
              const current = stadiumState.seasonTickets?.[zoneId] || 0;
              const maxCapacity = Math.floor(zoneCapacities[zoneId] * 0.8);
              const fullSeasonPrice = currentPrices[zoneId] * HOME_GAMES_PER_SEASON;
              const discountedPrice = fullSeasonPrice * (1 - SEASON_TICKET_DISCOUNT);
              
              return (
                <div key={zoneId} className="season-ticket-zone">
                  <div className="zone-header">
                    <span className="icon">{zone.icon}</span>
                    <span className="name">{zone.name}</span>
                  </div>
                  <div className="zone-stats">
                    <div className="stat">
                      <span className="label">Abonados:</span>
                      <span className="value">{current.toLocaleString()} / {maxCapacity.toLocaleString()}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Precio abono:</span>
                      <span className="value">{formatMoney(discountedPrice)}</span>
                      <span className="discount">({formatMoney(fullSeasonPrice - discountedPrice)} ahorro)</span>
                    </div>
                    <div className="stat">
                      <span className="label">Ingresos totales:</span>
                      <span className="value highlight">{formatMoney(current * discountedPrice)}</span>
                    </div>
                  </div>
                  <div className="zone-controls">
                    <button onClick={() => handleSeasonTicketChange(zoneId, -500)}>-500</button>
                    <button onClick={() => handleSeasonTicketChange(zoneId, -100)}>-100</button>
                    <div className="progress-bar">
                      <div 
                        className="fill" 
                        style={{ width: `${(current / maxCapacity) * 100}%` }}
                      />
                    </div>
                    <button onClick={() => handleSeasonTicketChange(zoneId, 100)}>+100</button>
                    <button onClick={() => handleSeasonTicketChange(zoneId, 500)}>+500</button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="season-ticket-summary">
            <div className="summary-card">
              <span className="icon">👥</span>
              <div className="info">
                <span className="value">
                  {Object.values(stadiumState.seasonTickets || {}).reduce((a, b) => a + b, 0).toLocaleString()}
                </span>
                <span className="label">Total abonados</span>
              </div>
            </div>
            <div className="summary-card highlight">
              <span className="icon">💰</span>
              <div className="info">
                <span className="value">{formatMoney(seasonTicketIncome)}</span>
                <span className="label">Ingresos por abonos</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Servicios */}
      {activeTab === 'services' && (
        <div className="stadium__services">
          <h3>🏪 Servicios del estadio</h3>
          <p className="hint">Desbloquea servicios adicionales para aumentar los ingresos por partido.</p>
          
          <div className="services-grid">
            {Object.entries(EXTRA_SERVICES).map(([serviceId, service]) => {
              const isUnlocked = stadiumState.services?.[serviceId];
              const canAfford = state.money >= service.upgradeCost;
              
              return (
                <div key={serviceId} className={`service-card ${isUnlocked ? 'unlocked' : ''}`}>
                  <div className="service-icon">{service.icon}</div>
                  <div className="service-info">
                    <h4>{service.name}</h4>
                    {serviceId === 'tour' ? (
                      <p className="service-detail">
                        {service.weeklyVisitors} visitantes/semana × €{service.price} = 
                        <strong> {formatMoney(service.weeklyVisitors * service.price)}/sem</strong>
                      </p>
                    ) : (
                      <p className="service-detail">
                        €{service.price}/persona × {Math.round(service.penetration * 100)}% asistentes
                      </p>
                    )}
                  </div>
                  {isUnlocked ? (
                    <div className="service-status unlocked">
                      <span>✓ Activo</span>
                    </div>
                  ) : (
                    <button 
                      className={`unlock-btn ${canAfford ? '' : 'disabled'}`}
                      onClick={() => handleUnlockService(serviceId)}
                      disabled={!canAfford}
                    >
                      <span>Desbloquear</span>
                      <span className="cost">{formatMoney(service.upgradeCost)}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          
          {weeklyTourIncome > 0 && (
            <div className="tour-income">
              <span className="icon">🎒</span>
              <span>Ingresos semanales por tours: <strong>{formatMoney(weeklyTourIncome)}</strong></span>
            </div>
          )}
        </div>
      )}
      
      {/* Ampliación */}
      {activeTab === 'upgrade' && (
        <div className="stadium__upgrade">
          <h3>🔧 Ampliación del estadio</h3>
          
          <div className="current-stadium">
            <div className="stadium-card current">
              <div className="stadium-visual-small">🏟️</div>
              <div className="stadium-details">
                <h4>{currentLevel.name}</h4>
                <p className="capacity">{currentLevel.capacity.toLocaleString()} asientos</p>
                <p className="maintenance">Mantenimiento: {formatMoney(currentLevel.maintenance)}/sem</p>
                {currentLevel.features.length > 0 && (
                  <ul className="features">
                    {currentLevel.features.map((f, i) => <li key={i}>✓ {f}</li>)}
                  </ul>
                )}
              </div>
              <div className="status-badge">Actual</div>
            </div>
          </div>
          
          {nextLevel ? (
            <div className="upgrade-section">
              <div className="upgrade-arrow">⬇️</div>
              <div className="stadium-card next">
                <div className="stadium-visual-small">🏟️✨</div>
                <div className="stadium-details">
                  <h4>{nextLevel.name}</h4>
                  <p className="capacity">{nextLevel.capacity.toLocaleString()} asientos (+{(nextLevel.capacity - currentLevel.capacity).toLocaleString()})</p>
                  <p className="maintenance">Mantenimiento: {formatMoney(nextLevel.maintenance)}/sem</p>
                  {nextLevel.features.length > 0 && (
                    <ul className="features">
                      {nextLevel.features.map((f, i) => <li key={i}>+ {f}</li>)}
                    </ul>
                  )}
                </div>
                <button 
                  className={`upgrade-btn ${state.money >= nextLevel.upgradeCost ? '' : 'disabled'}`}
                  onClick={handleUpgradeStadium}
                  disabled={state.money < nextLevel.upgradeCost}
                >
                  <span>Ampliar estadio</span>
                  <span className="cost">{formatMoney(nextLevel.upgradeCost)}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-level">
              <span className="icon">🏆</span>
              <span>¡Tu estadio está al máximo nivel!</span>
            </div>
          )}
          
          {/* Historial de ampliaciones futuras */}
          <div className="upgrade-roadmap">
            <h4>🗺️ Niveles de estadio</h4>
            <div className="roadmap">
              {STADIUM_LEVELS.map((level, idx) => (
                <div 
                  key={idx} 
                  className={`roadmap-item ${idx < stadiumState.level ? 'completed' : idx === stadiumState.level ? 'current' : ''}`}
                >
                  <div className="roadmap-dot" />
                  <div className="roadmap-info">
                    <span className="name">{level.name}</span>
                    <span className="capacity">{level.capacity.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
