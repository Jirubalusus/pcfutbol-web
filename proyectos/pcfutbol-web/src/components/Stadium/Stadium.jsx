import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  predictAttendance, 
  calculateMatchIncome,
  calculateSeasonTicketIncome,
  calculateSeasonTickets,
  PRICE_CONFIG,
  BIG_TEAMS
} from '../../game/stadiumEconomy';
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
  // Usar nivel de facilities si existe, sino stadium.level, con clamp a rango válido
  const rawLevel = state.facilities?.stadium ?? stadium.level ?? 0;
  const level = Math.max(0, Math.min(STADIUM_LEVELS.length - 1, rawLevel));
  const currentLevel = STADIUM_LEVELS[level];
  const nextLevel = STADIUM_LEVELS[level + 1];
  const capacity = currentLevel?.capacity || 8000;
  
  // Precios
  const ticketPrice = stadium.ticketPrice ?? 30; // Precio medio por entrada
  const seasonTicketPricePerMatch = ticketPrice * (1 - SEASON_TICKET_DISCOUNT);
  const seasonTicketPrice = seasonTicketPricePerMatch * HOME_GAMES_PER_SEASON; // Precio total abono
  
  // Datos del equipo para calcular abonados
  const teamPlayers = state.team?.players || [];
  const teamOverall = teamPlayers.length > 0 
    ? Math.round(teamPlayers.reduce((sum, p) => sum + (p.overall || 70), 0) / teamPlayers.length)
    : 70;
  const teamPosition = state.table?.findIndex(t => t.teamId === state.team?.id) + 1 || 10;
  const totalTeams = state.table?.length || 20;
  const teamReputation = state.team?.reputation || 70;
  
  // Abonados calculados automáticamente (no controlables manualmente)
  const maxSeasonTickets = Math.floor(capacity * 0.8);
  const seasonTickets = calculateSeasonTickets({
    capacity,
    seasonTicketPrice,
    teamOverall,
    leaguePosition: teamPosition,
    totalTeams,
    previousSeasonPosition: stadium.previousSeasonPosition || null,
    teamReputation
  });
  
  const grassCondition = stadium.grassCondition ?? 100;
  const naming = stadium.naming || null;
  const lastEventWeek = stadium.lastEventWeek ?? 0;
  const seasonTicketIncome = (seasonTickets || 0) * seasonTicketPrice;
  const namingIncome = naming?.yearlyIncome ?? 0;
  const maintenanceCost = (currentLevel?.maintenance || 50000) * 52; // Anual
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
  
  // === PRÓXIMO PARTIDO EN CASA ===
  const nextHomeMatch = useMemo(() => {
    if (!state.fixtures || !state.team) return null;
    
    const currentWeek = state.currentWeek || 1;
    return state.fixtures.find(f => 
      f.week >= currentWeek && 
      !f.played && 
      f.homeTeam === state.team.id
    );
  }, [state.fixtures, state.team, state.currentWeek]);
  
  // Obtener datos del rival y predicción
  const matchPrediction = useMemo(() => {
    if (!nextHomeMatch || !state.allTeams || !state.table) return null;
    
    const rivalTeam = state.allTeams.find(t => t.id === nextHomeMatch.awayTeam);
    const rivalEntry = state.table?.find(t => t.teamId === nextHomeMatch.awayTeam);
    const teamEntry = state.table?.find(t => t.teamId === state.team?.id);
    const totalTeams = state.table?.length || 20;
    
    if (!rivalTeam) return null;
    
    // Precio para este partido (puede tener ajuste)
    const matchPrice = stadium.matchPriceAdjust 
      ? ticketPrice + stadium.matchPriceAdjust 
      : ticketPrice;
    
    return {
      rivalTeam,
      rivalName: rivalTeam.shortName || rivalTeam.name,
      week: nextHomeMatch.week,
      prediction: predictAttendance({
        stadiumCapacity: capacity,
        seasonTickets,
        ticketPrice: matchPrice,
        rivalTeam,
        rivalPosition: rivalEntry?.played > 0 ? state.table.findIndex(t => t.teamId === rivalTeam.id) + 1 : 10,
        teamPosition: teamEntry?.played > 0 ? state.table.findIndex(t => t.teamId === state.team?.id) + 1 : 10,
        totalTeams,
        streak: teamEntry?.streak || 0,
        morale: teamEntry?.morale || 70,
        leagueId: state.leagueId || 'laliga',
        homeTeamId: state.team?.id,
        awayTeamId: rivalTeam.id
      }),
      matchPrice
    };
  }, [nextHomeMatch, state.allTeams, state.table, state.team, state.leagueId, capacity, seasonTickets, ticketPrice, stadium.matchPriceAdjust]);
  
  // Ajustar precio para el próximo partido
  const handleMatchPriceAdjust = (delta) => {
    const current = stadium.matchPriceAdjust || 0;
    const newAdjust = Math.max(-20, Math.min(30, current + delta));
    updateStadium({ matchPriceAdjust: newAdjust });
  };
  
  const resetMatchPriceAdjust = () => {
    updateStadium({ matchPriceAdjust: 0 });
  };

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
        <button className={activeTab === 'tickets' ? 'active' : ''} onClick={() => setActiveTab('tickets')}>
          🎟️ Taquilla
        </button>
        <button className={activeTab === 'sponsors' ? 'active' : ''} onClick={() => setActiveTab('sponsors')}>
          💰 Patrocinio
        </button>
        <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>
          🎤 Eventos
        </button>
      </div>
      
      {/* TAB: GENERAL */}
      {activeTab === 'general' && (
        <div className="stadium-simple__general">
          {/* Abonados (solo lectura) */}
          <div className="card">
            <h3>🎫 Abonados</h3>
            <p className="card-hint">Se renuevan según precio, proyecto y resultados</p>
            
            <div className="abonados-display">
              <div className="abonados-info">
                <span className="big-number">{seasonTickets.toLocaleString()}</span>
                <span className="of-total">/ {maxSeasonTickets.toLocaleString()} máx</span>
              </div>
              <div className="progress-bar">
                <div className="fill" style={{ width: `${(seasonTickets / maxSeasonTickets) * 100}%` }}></div>
              </div>
              <div className="abonados-factors">
                <span title="Overall medio de la plantilla">⭐ {teamOverall}</span>
                <span title="Posición en liga">📊 {teamPosition}º</span>
                <span title="Reputación del club">🏆 {teamReputation}</span>
              </div>
            </div>
          </div>
          
          {/* Precio abono */}
          <div className="card">
            <h3>💵 Precio Abono</h3>
            <p className="card-hint">Precio por partido (abonados pagan 35% menos). Abono más barato = más abonados</p>
            
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
      
      {/* TAB: TICKETS - Precios dinámicos */}
      {activeTab === 'tickets' && (
        <div className="stadium-simple__tickets">
          {/* Próximo partido en casa */}
          {matchPrediction ? (
            <div className="card next-match-card">
              <h3>⚽ Próximo partido en casa</h3>
              <div className="match-info">
                <span className="match-week">Jornada {matchPrediction.week}</span>
                <div className="match-teams">
                  <span className="home-team">{state.team?.shortName || state.team?.name}</span>
                  <span className="vs">vs</span>
                  <span className="away-team">{matchPrediction.rivalName}</span>
                </div>
                <span className={`attraction-badge ${matchPrediction.prediction.factors.rival >= 1.3 ? 'hot' : ''}`}>
                  {matchPrediction.prediction.prediction.attractionLevel}
                </span>
              </div>
              
              {/* Ajuste de precio para este partido */}
              <div className="match-price-section">
                <h4>💵 Precio para este partido</h4>
                <p className="hint">Ajusta el precio según el atractivo del rival</p>
                
                <div className="price-adjust">
                  <button onClick={() => handleMatchPriceAdjust(-5)}>-5€</button>
                  <button onClick={() => handleMatchPriceAdjust(-2)}>-2€</button>
                  <div className="price-display">
                    <span className="base-price">Base: €{ticketPrice}</span>
                    {(stadium.matchPriceAdjust || 0) !== 0 && (
                      <span className={`adjust ${stadium.matchPriceAdjust > 0 ? 'up' : 'down'}`}>
                        {stadium.matchPriceAdjust > 0 ? '+' : ''}{stadium.matchPriceAdjust}€
                      </span>
                    )}
                    <span className="final-price">→ €{matchPrediction.matchPrice}</span>
                  </div>
                  <button onClick={() => handleMatchPriceAdjust(2)}>+2€</button>
                  <button onClick={() => handleMatchPriceAdjust(5)}>+5€</button>
                </div>
                {(stadium.matchPriceAdjust || 0) !== 0 && (
                  <button className="reset-btn" onClick={resetMatchPriceAdjust}>
                    Restablecer precio base
                  </button>
                )}
              </div>
              
              {/* Predicción de asistencia */}
              <div className="attendance-prediction">
                <h4>📊 Predicción de asistencia</h4>
                
                <div className="prediction-stats">
                  <div className="prediction-main">
                    <span className="predicted-number">
                      {matchPrediction.prediction.prediction.expected.toLocaleString()}
                    </span>
                    <span className="prediction-label">espectadores previstos</span>
                    <span className="prediction-range">
                      ({matchPrediction.prediction.prediction.low.toLocaleString()} - {matchPrediction.prediction.prediction.high.toLocaleString()})
                    </span>
                  </div>
                  
                  <div className="fill-rate-bar">
                    <div 
                      className="fill" 
                      style={{ width: `${Math.round(matchPrediction.prediction.fillRate * 100)}%` }}
                    ></div>
                    <span className="fill-percent">{Math.round(matchPrediction.prediction.fillRate * 100)}%</span>
                  </div>
                </div>
                
                {/* Factores */}
                <div className="factors-breakdown">
                  <div className="factor">
                    <span className="factor-name">Rival</span>
                    <span className={`factor-value ${matchPrediction.prediction.factors.rival > 1.2 ? 'positive' : matchPrediction.prediction.factors.rival < 0.9 ? 'negative' : ''}`}>
                      {matchPrediction.prediction.factors.rival > 1 ? '+' : ''}{Math.round((matchPrediction.prediction.factors.rival - 1) * 100)}%
                    </span>
                  </div>
                  <div className="factor">
                    <span className="factor-name">Precio</span>
                    <span className={`factor-value ${matchPrediction.prediction.factors.price > 1 ? 'positive' : matchPrediction.prediction.factors.price < 0.9 ? 'negative' : ''}`}>
                      {matchPrediction.prediction.factors.price > 1 ? '+' : ''}{Math.round((matchPrediction.prediction.factors.price - 1) * 100)}%
                    </span>
                  </div>
                  <div className="factor">
                    <span className="factor-name">Tu racha</span>
                    <span className={`factor-value ${matchPrediction.prediction.factors.performance > 1 ? 'positive' : matchPrediction.prediction.factors.performance < 0.95 ? 'negative' : ''}`}>
                      {matchPrediction.prediction.factors.performance > 1 ? '+' : ''}{Math.round((matchPrediction.prediction.factors.performance - 1) * 100)}%
                    </span>
                  </div>
                  {matchPrediction.prediction.factors.derby > 1 && (
                    <div className="factor derby">
                      <span className="factor-name">🔥 Derby</span>
                      <span className="factor-value positive">+30%</span>
                    </div>
                  )}
                </div>
                
                {/* Ingresos estimados */}
                <div className="estimated-income">
                  <h4>💰 Ingresos estimados</h4>
                  <div className="income-breakdown">
                    <div className="income-row">
                      <span>Taquilla ({matchPrediction.prediction.ticketSales.toLocaleString()} entradas)</span>
                      <span>{formatMoney(matchPrediction.prediction.ticketSales * matchPrediction.matchPrice)}</span>
                    </div>
                    <div className="income-row">
                      <span>Consumiciones</span>
                      <span>{formatMoney(matchPrediction.prediction.attendance * (8 + level * 2))}</span>
                    </div>
                    <div className="income-row total">
                      <span>Total partido</span>
                      <span>{formatMoney(
                        matchPrediction.prediction.ticketSales * matchPrediction.matchPrice + 
                        matchPrediction.prediction.attendance * (8 + level * 2)
                      )}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card no-match">
              <h3>⚽ Sin partidos en casa próximamente</h3>
              <p>No hay partidos en casa programados esta semana.</p>
            </div>
          )}
          
          {/* Consejo estratégico */}
          <div className="card tips-card">
            <h3>💡 Estrategia de precios</h3>
            <ul className="tips-list">
              <li>
                <strong>Partido contra un grande:</strong> Sube el precio, la demanda aguanta.
              </li>
              <li>
                <strong>Rival modesto:</strong> Mantén o baja precio para llenar.
              </li>
              <li>
                <strong>Racha positiva:</strong> La afición responde, puedes subir.
              </li>
              <li>
                <strong>Derby:</strong> 🔥 Lleno asegurado, maximiza ingresos.
              </li>
            </ul>
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
      
    </div>
  );
}
