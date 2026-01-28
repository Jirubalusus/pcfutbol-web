import React, { useState, useMemo, Suspense } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  getLaLigaTeams, getSegundaTeams, getPremierTeams, getSerieATeams, getBundesligaTeams, getLigue1Teams
} from '../../data/teamsFirestore';
import { 
  predictAttendance, 
  calculateMatchIncome,
  calculateSeasonTicketIncome,
  calculateSeasonTickets,
  PRICE_CONFIG,
  BIG_TEAMS
} from '../../game/stadiumEconomy';
import './Stadium.scss';

// Función para obtener todos los equipos
const getAllTeams = () => [
  ...getLaLigaTeams(), ...getSegundaTeams(), ...getPremierTeams(), 
  ...getSerieATeams(), ...getBundesligaTeams(), ...getLigue1Teams()
];

// Lazy load del componente 3D
const Stadium3D = React.lazy(() => import('../Stadium3D/Stadium3D'));

// === CONFIGURACIÓN ===
const HOME_GAMES_PER_SEASON = 19;
const SEASON_TICKET_DISCOUNT = 0.35; // 35% descuento abonados

const STADIUM_LEVELS = [
  { name: 'Municipal', capacity: 8000, maintenance: 500000, upgradeCost: null, prestige: 1 },      // €500K/año
  { name: 'Moderno', capacity: 18000, maintenance: 1200000, upgradeCost: 8000000, prestige: 2 },   // €1.2M/año
  { name: 'Grande', capacity: 35000, maintenance: 2500000, upgradeCost: 25000000, prestige: 3 },   // €2.5M/año
  { name: 'Élite', capacity: 55000, maintenance: 4000000, upgradeCost: 60000000, prestige: 4 },    // €4M/año
  { name: 'Legendario', capacity: 80000, maintenance: 6000000, upgradeCost: 120000000, prestige: 5 } // €6M/año
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
  // Usar capacidad real si está disponible, sino la del nivel
  const capacity = stadium.realCapacity || currentLevel?.capacity || 8000;
  
  // Sistema de abonos por temporada
  const currentWeek = state.currentWeek || 1;
  const SEASON_TICKET_DEADLINE = 4; // Semana límite para cerrar campaña (jornada 4)
  
  // Estado de la campaña de abonos
  const seasonTicketsCampaignOpen = stadium.seasonTicketsCampaignOpen ?? (currentWeek <= SEASON_TICKET_DEADLINE);
  const seasonTicketPrice = stadium.seasonTicketPrice ?? 400; // Precio mientras campaña abierta
  const ticketPrice = stadium.ticketPrice ?? 30; // Precio entrada partido suelto
  
  // Datos del equipo para calcular abonados
  const teamPlayers = state.team?.players || [];
  const teamOverall = teamPlayers.length > 0 
    ? Math.round(teamPlayers.reduce((sum, p) => sum + (p.overall || 70), 0) / teamPlayers.length)
    : 70;
  const teamPosition = state.leagueTable?.findIndex(t => t.teamId === state.team?.id) + 1 || 10;
  const totalTeams = state.leagueTable?.length || 20;
  const teamReputation = state.team?.reputation || 70;
  
  // Abonados: si campaña cerrada, usar valor fijado; si abierta, calcular previsión
  const maxSeasonTickets = Math.floor(capacity * 0.8);
  const calculatedSeasonTickets = calculateSeasonTickets({
    capacity,
    seasonTicketPrice,
    teamOverall,
    leaguePosition: teamPosition,
    totalTeams,
    previousSeasonPosition: stadium.previousSeasonPosition || null,
    teamReputation
  });
  
  // Si la campaña está cerrada, usar el valor fijado; si no, mostrar previsión
  const seasonTickets = seasonTicketsCampaignOpen 
    ? calculatedSeasonTickets 
    : (stadium.seasonTicketsFinal ?? calculatedSeasonTickets);
  
  const grassCondition = stadium.grassCondition ?? 100;
  const naming = stadium.naming || null;
  const lastEventWeek = stadium.lastEventWeek ?? 0;
  const seasonTicketIncome = (seasonTickets || 0) * seasonTicketPrice;
  const namingIncome = naming?.yearlyIncome ?? 0;
  const maintenanceCost = currentLevel?.maintenance || 500000; // Ya es anual
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
  
  // Precio del abono (solo si campaña abierta)
  const handleSeasonPriceChange = (delta) => {
    if (!seasonTicketsCampaignOpen) return;
    const newPrice = Math.max(200, Math.min(1000, seasonTicketPrice + delta));
    updateStadium({ seasonTicketPrice: newPrice });
  };
  
  // Cerrar campaña de abonos (fijar precio y cantidad)
  const handleCloseCampaign = () => {
    if (!seasonTicketsCampaignOpen) return;
    updateStadium({
      seasonTicketsCampaignOpen: false,
      seasonTicketsFinal: calculatedSeasonTickets,
      seasonTicketPriceFinal: seasonTicketPrice
    });
  };
  
  // Precio entrada partido (afecta asistencia no-abonados) - siempre modificable
  const handleTicketPriceChange = (delta) => {
    const newPrice = Math.max(5, ticketPrice + delta); // Mínimo 5€, sin máximo
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
    // Penalización por cancelar: 50% del valor restante del contrato
    const penalty = naming ? Math.round(naming.yearlyIncome * naming.yearsLeft * 0.5) : 0;
    
    if (penalty > 0 && state.money < penalty) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'warning',
          title: '⚠️ Fondos insuficientes',
          content: `Necesitas €${(penalty / 1000000).toFixed(1)}M para pagar la penalización por cancelar el contrato.`,
          date: `Semana ${state.currentWeek}`
        }
      });
      return;
    }
    
    updateStadium({ naming: null });
    
    if (penalty > 0) {
      dispatch({ type: 'UPDATE_MONEY', payload: -penalty });
    }
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: '🏟️ Naming cancelado',
        content: penalty > 0 
          ? `El estadio recupera su nombre original. Penalización pagada: €${(penalty / 1000000).toFixed(1)}M`
          : 'El estadio recupera su nombre original',
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
    return `€${Math.round(n)}`;
  };
  
  // Nombre del estadio (mantener nombre original + naming rights si hay sponsor)
  const baseStadiumName = stadium.name || state.team?.stadium || `Estadio ${currentLevel.name}`;
  const displayStadiumName = naming 
    ? `${baseStadiumName} - ${naming.name} Arena` 
    : baseStadiumName;
  
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
    if (!nextHomeMatch) return null;
    
    // Obtener todos los equipos
    const allTeams = getAllTeams();
    const table = state.leagueTable || [];
    
    const rivalTeam = allTeams.find(t => t.id === nextHomeMatch.awayTeam);
    const rivalEntry = table.find(t => t.teamId === nextHomeMatch.awayTeam);
    const teamEntry = table.find(t => t.teamId === state.team?.id);
    const totalTeams = table.length || 20;
    
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
        rivalPosition: rivalEntry?.played > 0 ? table.findIndex(t => t.teamId === rivalTeam.id) + 1 : 10,
        teamPosition: teamEntry?.played > 0 ? table.findIndex(t => t.teamId === state.team?.id) + 1 : 10,
        totalTeams,
        streak: teamEntry?.streak || 0,
        morale: teamEntry?.morale || 70,
        leagueId: state.playerLeagueId || 'laliga',
        homeTeamId: state.team?.id,
        awayTeamId: rivalTeam.id
      }),
      matchPrice
    };
  }, [nextHomeMatch, state.leagueTable, state.team, state.playerLeagueId, capacity, seasonTickets, ticketPrice, stadium.matchPriceAdjust]);
  
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
      {/* Visor 3D del estadio */}
      <div className="stadium-simple__3d-viewer">
        <Suspense fallback={<div className="stadium-3d-loading">Cargando estadio...</div>}>
          <Stadium3D 
            level={level} 
            naming={naming} 
            grassCondition={grassCondition} 
          />
        </Suspense>
      </div>
      
      {/* Header */}
      <div className="stadium-simple__header">
        <div className="stadium-info">
          <h1>{displayStadiumName}</h1>
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
      </div>
      
      {/* TAB: GENERAL */}
      {activeTab === 'general' && (
        <div className="stadium-simple__general">
          {/* Campaña de abonos */}
          <div className="card">
            <h3>🎫 Campaña de Abonos</h3>
            {seasonTicketsCampaignOpen ? (
              <>
                <p className="card-hint campaign-open">
                  📢 Campaña abierta hasta jornada {SEASON_TICKET_DEADLINE} (actual: {currentWeek})
                </p>
                
                {/* Precio del abono */}
                <div className="season-price-section">
                  <label>Precio del abono:</label>
                  <div className="price-control">
                    <button onClick={() => handleSeasonPriceChange(-50)}>-50€</button>
                    <span className="price-value">€{seasonTicketPrice}</span>
                    <button onClick={() => handleSeasonPriceChange(50)}>+50€</button>
                  </div>
                  <p className="price-detail">{HOME_GAMES_PER_SEASON} partidos → {formatMoney(seasonTicketPrice / HOME_GAMES_PER_SEASON)}/partido</p>
                </div>
                
                {/* Previsión de abonados */}
                <div className="season-preview">
                  <label>Previsión de abonados:</label>
                  <div className="abonados-info">
                    <span className="big-number">{calculatedSeasonTickets.toLocaleString()}</span>
                    <span className="of-total">/ {maxSeasonTickets.toLocaleString()} máx</span>
                  </div>
                  <div className="progress-bar">
                    <div className="fill" style={{ width: `${(calculatedSeasonTickets / maxSeasonTickets) * 100}%` }}></div>
                  </div>
                  <div className="abonados-factors">
                    <span title="Overall medio">⭐ {teamOverall}</span>
                    <span title="Posición liga">📊 {teamPosition}º</span>
                    <span title="Reputación">🏆 {teamReputation}</span>
                  </div>
                </div>
                
                {/* Botón cerrar campaña */}
                <button className="btn-close-campaign" onClick={handleCloseCampaign}>
                  ✅ Cerrar campaña y fijar abonados
                </button>
              </>
            ) : (
              <>
                <p className="card-hint campaign-closed">🔒 Campaña cerrada para esta temporada</p>
                
                <div className="abonados-display">
                  <div className="abonados-info">
                    <span className="big-number">{seasonTickets.toLocaleString()}</span>
                    <span className="of-total">abonados</span>
                  </div>
                  <p className="locked-price">Precio fijado: <strong>€{stadium.seasonTicketPriceFinal || seasonTicketPrice}</strong></p>
                </div>
              </>
            )}
          </div>
          
          {/* Precio entrada partido suelto */}
          <div className="card">
            <h3>🎟️ Precio Entrada</h3>
            <p className="card-hint">Para no abonados. Afecta asistencia en cada partido</p>
            
            <div className="price-control">
              <button onClick={() => handleTicketPriceChange(-5)}>-5€</button>
              <span className="price-value">€{ticketPrice}</span>
              <button onClick={() => handleTicketPriceChange(5)}>+5€</button>
            </div>
            
            {/* Última jornada en casa */}
            {(stadium.lastMatchAttendance || stadium.lastMatchIncome) && (
              <div className="last-match-info">
                <h4>📊 Última jornada en casa</h4>
                <div className="last-match-stats">
                  {stadium.lastMatchAttendance && (
                    <div className="stat-row">
                      <span className="label">👥 Asistentes</span>
                      <span className="value">{stadium.lastMatchAttendance.toLocaleString()}</span>
                    </div>
                  )}
                  {stadium.lastMatchIncome && (
                    <div className="stat-row income">
                      <span className="label">💰 Ingresos taquilla</span>
                      <span className="value">{formatMoney(stadium.lastMatchIncome)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
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
              <div className={`fill ${grassCondition < 50 ? 'danger' : grassCondition < 70 ? 'warning' : ''}`} style={{ width: `${grassCondition}%` }}></div>
              <span className="grass-percent">{grassCondition}%</span>
            </div>
            
            {/* Estado y efecto en lesiones */}
            <div className="grass-status">
              {grassCondition >= 80 && <span className="status good">✅ Óptimo</span>}
              {grassCondition >= 50 && grassCondition < 80 && <span className="status warning">⚠️ Riesgo lesiones +{Math.round((100 - grassCondition) / 2)}%</span>}
              {grassCondition < 50 && <span className="status danger">❌ Riesgo lesiones +{Math.round((100 - grassCondition))}%</span>}
            </div>
            
            <p className="grass-hint">
              {grassCondition < 100 ? 'Recupera +5%/semana' : 'En perfectas condiciones'}
              {grassCondition < 70 && ' • El mal estado aumenta lesiones de TUS jugadores'}
            </p>
            
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
              <span className="cancel-warning">
                ⚠️ Penalización: {formatMoney(Math.round(naming.yearlyIncome * naming.yearsLeft * 0.5))}
              </span>
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
