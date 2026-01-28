import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import './Stadium.scss';

// === CONFIGURACIÓN ===
const HOME_GAMES_PER_SEASON = 19;
const SEASON_TICKET_DISCOUNT = 0.35; // 35% descuento abonados

const STADIUM_LEVELS = [
  { name: 'Municipal', capacity: 8000, maintenance: 50000, upgradeCost: null, prestige: 1 },
  { name: 'Moderno', capacity: 18000, maintenance: 120000, upgradeCost: 8000000, prestige: 2 },
  { name: 'Grande', capacity: 35000, maintenance: 280000, upgradeCost: 25000000, prestige: 3 },
  { name: 'Élite', capacity: 55000, maintenance: 450000, upgradeCost: 60000000, prestige: 4 },
  { name: 'Legendario', capacity: 80000, maintenance: 700000, upgradeCost: 120000000, prestige: 5 }
];

const NAMING_SPONSORS = [
  { id: 'local', name: 'Banco Regional', offer: 500000, minPrestige: 1, duration: 3 },
  { id: 'telecom', name: 'TeleCom Plus', offer: 1500000, minPrestige: 2, duration: 3 },
  { id: 'car', name: 'AutoMotor', offer: 3000000, minPrestige: 3, duration: 5 },
  { id: 'airline', name: 'FlyAir', offer: 5000000, minPrestige: 4, duration: 5 },
  { id: 'tech', name: 'TechCorp', offer: 8000000, minPrestige: 5, duration: 5 }
];

const SPECIAL_EVENTS = [
  { id: 'friendly', name: 'Amistoso', icon: '⚽', income: 200000, grassDamage: 5, cooldown: 1 },
  { id: 'concert', name: 'Concierto', icon: '🎤', income: 500000, grassDamage: 20, cooldown: 3 },
  { id: 'corporate', name: 'Evento Corporativo', icon: '💼', income: 150000, grassDamage: 3, cooldown: 1 },
  { id: 'legends', name: 'Partido Leyendas', icon: '🏆', income: 400000, grassDamage: 8, cooldown: 2 }
];

// === COMPONENTE ===
export default function Stadium() {
  const { state, dispatch } = useGame();
  const [activeTab, setActiveTab] = useState('general');
  
  // Estado con defaults seguros
  const stadium = state.stadium || {};
  const level = stadium.level ?? 0;
  const currentLevel = STADIUM_LEVELS[level];
  const nextLevel = STADIUM_LEVELS[level + 1];
  const capacity = currentLevel.capacity;
  
  // Abonados por defecto: 30% de capacidad
  const seasonTickets = stadium.seasonTickets ?? Math.floor(capacity * 0.3);
  const ticketPrice = stadium.ticketPrice ?? 30; // Precio medio por entrada
  const grassCondition = stadium.grassCondition ?? 100;
  const naming = stadium.naming || null;
  const lastEventWeek = stadium.lastEventWeek ?? 0;
  
  // Cálculos
  const maxSeasonTickets = Math.floor(capacity * 0.8); // Max 80% abonados
  const seasonTicketPrice = ticketPrice * HOME_GAMES_PER_SEASON * (1 - SEASON_TICKET_DISCOUNT);
  const seasonTicketIncome = seasonTickets * seasonTicketPrice;
  const namingIncome = naming?.yearlyIncome ?? 0;
  const maintenanceCost = currentLevel.maintenance * 52; // Anual
  const annualBalance = seasonTicketIncome + namingIncome - maintenanceCost;
  
  // Factor cancha simple (basado en nivel + ocupación)
  const occupancyRate = seasonTickets / capacity;
  const homeAdvantage = 1 + (currentLevel.prestige * 0.01) + (occupancyRate > 0.5 ? 0.02 : 0);
  
  // Cooldown eventos
  const weeksSinceEvent = (state.currentWeek || 1) - lastEventWeek;
  const canHostEvent = weeksSinceEvent >= 2;
  
  // Disponibles
  const availableSponsors = NAMING_SPONSORS.filter(s => s.minPrestige <= currentLevel.prestige && !naming);
  
  // === HANDLERS ===
  const updateStadium = (updates) => {
    dispatch({
      type: 'UPDATE_STADIUM',
      payload: { ...stadium, ...updates }
    });
  };
  
  const handleSeasonTicketsChange = (delta) => {
    const newValue = Math.max(0, Math.min(maxSeasonTickets, seasonTickets + delta));
    updateStadium({ seasonTickets: newValue });
  };
  
  const handlePriceChange = (delta) => {
    const newPrice = Math.max(10, Math.min(100, ticketPrice + delta));
    updateStadium({ ticketPrice: newPrice });
  };
  
  const handleAcceptNaming = (sponsor) => {
    updateStadium({
      naming: {
        sponsorId: sponsor.id,
        name: sponsor.name,
        yearsLeft: sponsor.duration,
        yearlyIncome: sponsor.offer
      }
    });
    dispatch({ type: 'UPDATE_MONEY', payload: sponsor.offer });
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: '💰 Naming Rights',
        content: `Acuerdo con ${sponsor.name}: €${(sponsor.offer/1000000).toFixed(1)}M/año por ${sponsor.duration} años`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  const handleCancelNaming = () => {
    updateStadium({ naming: null });
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: '🏟️ Naming cancelado',
        content: 'El estadio recupera su nombre original',
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  const handleHostEvent = (event) => {
    if (!canHostEvent) return;
    
    const newGrass = Math.max(0, grassCondition - event.grassDamage);
    updateStadium({
      grassCondition: newGrass,
      lastEventWeek: state.currentWeek || 1
    });
    dispatch({ type: 'UPDATE_MONEY', payload: event.income });
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: `${event.icon} ${event.name}`,
        content: `Evento celebrado. Ingresos: €${(event.income/1000).toFixed(0)}K`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  const handleRepairGrass = () => {
    const cost = 200000;
    if (state.money < cost) return;
    updateStadium({ grassCondition: 100 });
    dispatch({ type: 'UPDATE_MONEY', payload: -cost });
  };
  
  const handleUpgrade = () => {
    if (!nextLevel || state.money < nextLevel.upgradeCost) return;
    updateStadium({ level: level + 1 });
    dispatch({ type: 'UPDATE_MONEY', payload: -nextLevel.upgradeCost });
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: '🏗️ Estadio ampliado',
        content: `Ahora es ${nextLevel.name} con ${nextLevel.capacity.toLocaleString()} asientos`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  const formatMoney = (n) => {
    if (Math.abs(n) >= 1000000) return `€${(n/1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `€${(n/1000).toFixed(0)}K`;
    return `€${n}`;
  };
  
  // Nombre del estadio
  const stadiumName = naming ? `${naming.name} Arena` : (state.team?.stadium || `Estadio ${currentLevel.name}`);

  return (
    <div className="stadium-simple">
      {/* Header */}
      <div className="stadium-simple__header">
        <div className="stadium-info">
          <h1>{stadiumName}</h1>
          <p>{currentLevel.name} • {capacity.toLocaleString()} asientos</p>
        </div>
        <div className="stadium-stats">
          <div className="stat">
            <span className="value">+{((homeAdvantage - 1) * 100).toFixed(1)}%</span>
            <span className="label">Factor cancha</span>
          </div>
          <div className="stat">
            <span className="value">{Math.round(occupancyRate * 100)}%</span>
            <span className="label">Ocupación</span>
          </div>
          <div className="stat">
            <span className="value">{grassCondition}%</span>
            <span className="label">Césped</span>
          </div>
          <div className="stat highlight">
            <span className="value">{formatMoney(state.money)}</span>
            <span className="label">Presupuesto</span>
          </div>
        </div>
      </div>
      
      {/* Tabs simplificados */}
      <div className="stadium-simple__tabs">
        <button className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}>
          📊 General
        </button>
        <button className={activeTab === 'sponsors' ? 'active' : ''} onClick={() => setActiveTab('sponsors')}>
          💰 Patrocinio
        </button>
        <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>
          🎤 Eventos
        </button>
        <button className={activeTab === 'upgrade' ? 'active' : ''} onClick={() => setActiveTab('upgrade')}>
          🔧 Ampliar
        </button>
      </div>
      
      {/* TAB: GENERAL */}
      {activeTab === 'general' && (
        <div className="stadium-simple__general">
          {/* Abonados */}
          <div className="card">
            <h3>🎫 Abonados</h3>
            <p className="card-hint">Más abonados = ingresos fijos garantizados</p>
            
            <div className="abonados-control">
              <div className="abonados-info">
                <span className="big-number">{seasonTickets.toLocaleString()}</span>
                <span className="of-total">/ {maxSeasonTickets.toLocaleString()} máx</span>
              </div>
              <div className="abonados-buttons">
                <button onClick={() => handleSeasonTicketsChange(-1000)}>-1000</button>
                <button onClick={() => handleSeasonTicketsChange(-100)}>-100</button>
                <button onClick={() => handleSeasonTicketsChange(100)}>+100</button>
                <button onClick={() => handleSeasonTicketsChange(1000)}>+1000</button>
              </div>
              <div className="progress-bar">
                <div className="fill" style={{ width: `${(seasonTickets / maxSeasonTickets) * 100}%` }}></div>
              </div>
            </div>
          </div>
          
          {/* Precio entrada */}
          <div className="card">
            <h3>💵 Precio Entrada</h3>
            <p className="card-hint">Precio medio por partido (abonados pagan 35% menos)</p>
            
            <div className="price-control">
              <button onClick={() => handlePriceChange(-5)}>-5€</button>
              <span className="price-value">€{ticketPrice}</span>
              <button onClick={() => handlePriceChange(5)}>+5€</button>
            </div>
            <p className="price-detail">Abono temporada: {formatMoney(seasonTicketPrice)} ({HOME_GAMES_PER_SEASON} partidos)</p>
          </div>
          
          {/* Balance */}
          <div className="card balance-card">
            <h3>📈 Balance Anual Estimado</h3>
            
            <div className="balance-rows">
              <div className="balance-row income">
                <span>Abonados ({seasonTickets.toLocaleString()})</span>
                <span>{formatMoney(seasonTicketIncome)}</span>
              </div>
              {namingIncome > 0 && (
                <div className="balance-row income">
                  <span>Naming Rights</span>
                  <span>{formatMoney(namingIncome)}</span>
                </div>
              )}
              <div className="balance-row expense">
                <span>Mantenimiento</span>
                <span>-{formatMoney(maintenanceCost)}</span>
              </div>
              <div className={`balance-row total ${annualBalance >= 0 ? 'positive' : 'negative'}`}>
                <span>Balance</span>
                <span>{formatMoney(annualBalance)}</span>
              </div>
            </div>
          </div>
          
          {/* Césped */}
          <div className="card grass-card">
            <h3>🌱 Estado del Césped</h3>
            <div className="grass-bar">
              <div className="fill" style={{ width: `${grassCondition}%` }}></div>
              <span className="grass-percent">{grassCondition}%</span>
            </div>
            {grassCondition < 100 && (
              <p className="grass-hint">Recupera +5%/semana automáticamente</p>
            )}
            {grassCondition < 70 && (
              <button className="repair-btn" onClick={handleRepairGrass} disabled={state.money < 200000}>
                🔧 Reparar césped ({formatMoney(200000)})
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* TAB: SPONSORS */}
      {activeTab === 'sponsors' && (
        <div className="stadium-simple__sponsors">
          {naming ? (
            <div className="current-sponsor">
              <h3>🏷️ Patrocinador Actual</h3>
              <div className="sponsor-info">
                <span className="sponsor-name">{naming.name}</span>
                <span className="sponsor-income">{formatMoney(naming.yearlyIncome)}/año</span>
                <span className="sponsor-years">{naming.yearsLeft} años restantes</span>
              </div>
              <button className="cancel-btn" onClick={handleCancelNaming}>
                Cancelar contrato
              </button>
            </div>
          ) : (
            <>
              <h3>💰 Ofertas de Naming Rights</h3>
              <p className="hint">Vende el nombre del estadio por ingresos anuales</p>
              
              {availableSponsors.length > 0 ? (
                <div className="sponsors-list">
                  {availableSponsors.map(sponsor => (
                    <div key={sponsor.id} className="sponsor-offer">
                      <div className="offer-info">
                        <span className="name">{sponsor.name}</span>
                        <span className="price">{formatMoney(sponsor.offer)}/año</span>
                        <span className="duration">{sponsor.duration} años</span>
                      </div>
                      <button onClick={() => handleAcceptNaming(sponsor)}>Aceptar</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-offers">Mejora tu estadio para atraer patrocinadores</p>
              )}
            </>
          )}
        </div>
      )}
      
      {/* TAB: EVENTS */}
      {activeTab === 'events' && (
        <div className="stadium-simple__events">
          <h3>🎤 Organizar Eventos</h3>
          <p className="hint">Genera ingresos extra (requiere 2 semanas entre eventos)</p>
          
          {!canHostEvent && (
            <div className="cooldown-notice">
              ⏳ Espera {2 - weeksSinceEvent} semana(s) más
            </div>
          )}
          
          <div className="events-list">
            {SPECIAL_EVENTS.map(event => (
              <div key={event.id} className={`event-item ${!canHostEvent ? 'disabled' : ''}`}>
                <span className="event-icon">{event.icon}</span>
                <div className="event-info">
                  <span className="event-name">{event.name}</span>
                  <span className="event-details">
                    {formatMoney(event.income)} • Daño césped: -{event.grassDamage}%
                  </span>
                </div>
                <button onClick={() => handleHostEvent(event)} disabled={!canHostEvent || grassCondition < 30}>
                  Organizar
                </button>
              </div>
            ))}
          </div>
          
          {grassCondition < 30 && (
            <p className="grass-warning">⚠️ Repara el césped antes de organizar eventos</p>
          )}
        </div>
      )}
      
      {/* TAB: UPGRADE */}
      {activeTab === 'upgrade' && (
        <div className="stadium-simple__upgrade">
          <h3>🔧 Ampliar Estadio</h3>
          
          <div className="current-level">
            <div className="level-badge">{level + 1}</div>
            <div className="level-info">
              <span className="level-name">{currentLevel.name}</span>
              <span className="level-capacity">{currentLevel.capacity.toLocaleString()} asientos</span>
            </div>
            <span className="current-tag">Actual</span>
          </div>
          
          {nextLevel ? (
            <div className="next-level">
              <div className="arrow">⬇️</div>
              <div className="level-badge">{level + 2}</div>
              <div className="level-info">
                <span className="level-name">{nextLevel.name}</span>
                <span className="level-capacity">{nextLevel.capacity.toLocaleString()} asientos</span>
                <span className="level-gain">+{(nextLevel.capacity - currentLevel.capacity).toLocaleString()}</span>
              </div>
              <button 
                className="upgrade-btn"
                onClick={handleUpgrade}
                disabled={state.money < nextLevel.upgradeCost}
              >
                <span>Ampliar</span>
                <span className="cost">{formatMoney(nextLevel.upgradeCost)}</span>
              </button>
            </div>
          ) : (
            <div className="max-level">
              🏆 ¡Estadio al máximo nivel!
            </div>
          )}
          
          {/* Roadmap */}
          <div className="upgrade-roadmap">
            {STADIUM_LEVELS.map((lvl, i) => (
              <div key={i} className={`roadmap-item ${i < level ? 'done' : i === level ? 'current' : ''}`}>
                <div className="dot">{i < level ? '✓' : i + 1}</div>
                <span className="name">{lvl.name}</span>
                <span className="cap">{(lvl.capacity / 1000).toFixed(0)}K</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
