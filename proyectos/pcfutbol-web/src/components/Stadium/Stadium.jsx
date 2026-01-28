import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { LALIGA_TEAMS } from '../../data/teamsFirestore';
import './Stadium.scss';

// === CONFIGURACIÓN DEL ESTADIO ===
const STADIUM_ZONES = {
  fondo: { name: 'Fondo', icon: '🎫', basePrice: 20, capacityRatio: 0.35, comfort: 1 },
  lateral: { name: 'Lateral', icon: '🎟️', basePrice: 35, capacityRatio: 0.35, comfort: 2 },
  tribuna: { name: 'Tribuna', icon: '💺', basePrice: 60, capacityRatio: 0.20, comfort: 3 },
  vip: { name: 'VIP', icon: '👔', basePrice: 120, capacityRatio: 0.10, comfort: 5 }
};

const SEASON_TICKET_DISCOUNT = 0.35;
const HOME_GAMES_PER_SEASON = 19;

const STADIUM_LEVELS = [
  { name: 'Municipal', capacity: 8000, maintenance: 50000, upgradeCost: null, prestige: 1, features: ['Césped natural', 'Vestuarios básicos'] },
  { name: 'Moderno', capacity: 18000, maintenance: 120000, upgradeCost: 8000000, prestige: 2, features: ['Marcador LED', 'Palcos básicos', 'Tienda oficial'] },
  { name: 'Grande', capacity: 35000, maintenance: 280000, upgradeCost: 25000000, prestige: 3, features: ['Videomarcador', 'Zona VIP', 'Museo del club'] },
  { name: 'Élite', capacity: 55000, maintenance: 450000, upgradeCost: 60000000, prestige: 4, features: ['Techo parcial', 'Hospitality premium', 'Parking subterráneo'] },
  { name: 'Legendario', capacity: 80000, maintenance: 700000, upgradeCost: 120000000, prestige: 5, features: ['Techo retráctil', 'Hotel 5★', 'Centro comercial'] }
];

// Naming Rights - Patrocinadores
const NAMING_SPONSORS = [
  { id: 'local_bank', name: 'Banco Regional', offer: 500000, minPrestige: 1, duration: 3 },
  { id: 'telecom', name: 'TeleCom Plus', offer: 1500000, minPrestige: 2, duration: 3 },
  { id: 'car_brand', name: 'AutoMotor', offer: 3000000, minPrestige: 3, duration: 5 },
  { id: 'airline', name: 'FlyAir', offer: 5000000, minPrestige: 4, duration: 5 },
  { id: 'tech_giant', name: 'TechCorp', offer: 8000000, minPrestige: 5, duration: 5 },
  { id: 'global_brand', name: 'GlobalBrand', offer: 12000000, minPrestige: 5, duration: 7 }
];

// Eventos especiales (daño reducido y balanceado)
const SPECIAL_EVENTS = [
  { id: 'friendly_local', name: 'Amistoso Regional', icon: '⚽', income: 150000, fanHappiness: 5, grassDamage: 5, minLevel: 0, cooldown: 1 },
  { id: 'friendly_euro', name: 'Amistoso Internacional', icon: '🌍', income: 400000, fanHappiness: 10, grassDamage: 8, minLevel: 1, cooldown: 2 },
  { id: 'concert_local', name: 'Concierto Local', icon: '🎸', income: 300000, fanHappiness: -3, grassDamage: 15, minLevel: 1, cooldown: 2 },
  { id: 'concert_star', name: 'Concierto Estrella', icon: '🎤', income: 800000, fanHappiness: 0, grassDamage: 25, minLevel: 2, cooldown: 3 },
  { id: 'corporate', name: 'Evento Corporativo', icon: '💼', income: 200000, fanHappiness: -5, grassDamage: 3, minLevel: 2, cooldown: 1 },
  { id: 'festival', name: 'Festival de Música', icon: '🎪', income: 1500000, fanHappiness: -10, grassDamage: 35, minLevel: 3, cooldown: 4 },
  { id: 'legends_match', name: 'Partido de Leyendas', icon: '🏆', income: 600000, fanHappiness: 25, grassDamage: 8, minLevel: 2, cooldown: 2 }
];

// Constantes de balance
const GRASS_RECOVERY_PER_WEEK = 5; // El césped se recupera 5% por semana
const EVENT_COOLDOWN_WEEKS = 2; // Mínimo 2 semanas entre eventos

// Colores de asientos disponibles
const SEAT_COLORS = [
  { id: 'blue', name: 'Azul Clásico', color: '#1a5fb4' },
  { id: 'red', name: 'Rojo Pasión', color: '#c01c28' },
  { id: 'green', name: 'Verde Esperanza', color: '#2ec27e' },
  { id: 'yellow', name: 'Amarillo Sol', color: '#f5c211' },
  { id: 'purple', name: 'Púrpura Real', color: '#813d9c' },
  { id: 'orange', name: 'Naranja Fuego', color: '#e66100' },
  { id: 'white', name: 'Blanco Puro', color: '#f0f0f0' },
  { id: 'black', name: 'Negro Elegante', color: '#1c1c1c' }
];

// Palcos VIP
const VIP_BOXES = [
  { id: 'standard', name: 'Palco Estándar', capacity: 12, basePrice: 50000, minLevel: 1 },
  { id: 'premium', name: 'Palco Premium', capacity: 20, basePrice: 100000, minLevel: 2 },
  { id: 'presidential', name: 'Palco Presidencial', capacity: 30, basePrice: 200000, minLevel: 3 },
  { id: 'corporate', name: 'Suite Corporativa', capacity: 50, basePrice: 350000, minLevel: 4 }
];

// === COMPONENTE PRINCIPAL ===
export default function Stadium() {
  const { state, dispatch } = useGame();
  const [activeTab, setActiveTab] = useState('overview');
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Estado del estadio con defaults mejorados
  const stadiumState = state.stadium || {
    level: 0,
    seasonTickets: { fondo: 0, lateral: 0, tribuna: 0, vip: 0 },
    ticketPrices: { fondo: 25, lateral: 45, tribuna: 75, vip: 150 },
    services: { parking: false, food: false, merchandise: false, tour: false },
    // Nuevos campos
    naming: null, // { sponsorId, yearsLeft, yearlyIncome }
    customName: null, // Nombre personalizado si no hay sponsor
    seatColor: 'blue',
    grassCondition: 100,
    fanHappiness: 70,
    atmosphere: 50,
    vipBoxes: [], // [{ boxType, company, yearsLeft, yearlyIncome }]
    lastEventWeek: 0, // Para cooldown entre eventos
    records: {
      maxAttendance: 0,
      maxAttendanceRival: null,
      maxAttendanceDate: null,
      maxIncome: 0,
      totalEvents: 0,
      totalIncome: 0
    },
    history: [] // [{ type, description, date, income }]
  };
  
  // Calcular semanas desde último evento (para cooldown)
  const weeksSinceLastEvent = (state.currentWeek || 1) - (stadiumState.lastEventWeek || 0);
  const canHostEvent = weeksSinceLastEvent >= EVENT_COOLDOWN_WEEKS;
  
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
  
  // Calcular nombre del estadio
  const stadiumName = useMemo(() => {
    if (stadiumState.naming) {
      const sponsor = NAMING_SPONSORS.find(s => s.id === stadiumState.naming.sponsorId);
      return `${sponsor?.name || 'Sponsor'} Arena`;
    }
    if (stadiumState.customName) {
      return stadiumState.customName;
    }
    return state.team?.stadium || `Estadio ${currentLevel.name}`;
  }, [stadiumState.naming, stadiumState.customName, state.team?.stadium, currentLevel.name]);
  
  // Calcular factor cancha (1.00 - 1.15)
  const homeAdvantage = useMemo(() => {
    let factor = 1.00;
    
    // Base por nivel de estadio
    factor += currentLevel.prestige * 0.01; // +1% por nivel
    
    // Ambiente de la afición
    factor += (stadiumState.atmosphere / 100) * 0.05; // hasta +5%
    
    // Felicidad de fans
    factor += ((stadiumState.fanHappiness - 50) / 100) * 0.03; // -1.5% a +1.5%
    
    // Condición del césped
    if (stadiumState.grassCondition < 50) {
      factor -= 0.02; // -2% si césped malo
    }
    
    // Ocupación alta
    const totalSeasonTickets = Object.values(stadiumState.seasonTickets || {}).reduce((a, b) => a + b, 0);
    const occupancyRate = totalSeasonTickets / currentLevel.capacity;
    if (occupancyRate > 0.7) {
      factor += 0.02; // +2% si más del 70% abonados
    }
    
    return Math.min(1.15, Math.max(1.00, factor));
  }, [currentLevel, stadiumState]);
  
  // Calcular ingresos por abonos
  const seasonTicketIncome = useMemo(() => {
    let total = 0;
    const prices = stadiumState.ticketPrices || { fondo: 25, lateral: 45, tribuna: 75, vip: 150 };
    Object.entries(stadiumState.seasonTickets || {}).forEach(([zone, count]) => {
      const fullPrice = prices[zone] * HOME_GAMES_PER_SEASON;
      const discountedPrice = fullPrice * (1 - SEASON_TICKET_DISCOUNT);
      total += count * discountedPrice;
    });
    return total;
  }, [stadiumState.seasonTickets, stadiumState.ticketPrices]);
  
  // Ingresos anuales por naming rights
  const namingIncome = stadiumState.naming?.yearlyIncome || 0;
  
  // Ingresos por palcos VIP
  const vipBoxIncome = useMemo(() => {
    return (stadiumState.vipBoxes || []).reduce((sum, box) => sum + (box.yearlyIncome || 0), 0);
  }, [stadiumState.vipBoxes]);
  
  // Sponsors disponibles para naming rights
  const availableSponsors = useMemo(() => {
    return NAMING_SPONSORS.filter(s => s.minPrestige <= currentLevel.prestige);
  }, [currentLevel.prestige]);
  
  // Eventos disponibles
  const availableEvents = useMemo(() => {
    return SPECIAL_EVENTS.filter(e => e.minLevel <= stadiumState.level);
  }, [stadiumState.level]);
  
  // === HANDLERS ===
  const handleUpgradeStadium = () => {
    if (!nextLevel || state.money < nextLevel.upgradeCost) return;
    
    const newStadiumState = {
      ...stadiumState,
      level: stadiumState.level + 1,
      history: [
        ...(stadiumState.history || []),
        {
          type: 'upgrade',
          description: `Ampliación a ${nextLevel.name}`,
          date: `Temporada ${state.season}, Semana ${state.currentWeek}`,
          income: -nextLevel.upgradeCost
        }
      ]
    };
    
    dispatch({ type: 'UPDATE_STADIUM', payload: newStadiumState });
    dispatch({ type: 'UPDATE_MONEY', payload: -nextLevel.upgradeCost });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: '🏟️ ¡Ampliación completada!',
        content: `Tu estadio ahora es ${nextLevel.name}. Capacidad: ${nextLevel.capacity.toLocaleString()} espectadores`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  const handleAcceptNaming = (sponsor) => {
    // Calcular penalización de fans según historial del estadio
    const isHistoric = (state.team?.reputation || 70) > 80;
    const fanPenalty = isHistoric ? -15 : -5;
    
    const newStadiumState = {
      ...stadiumState,
      naming: {
        sponsorId: sponsor.id,
        yearsLeft: sponsor.duration,
        yearlyIncome: sponsor.offer
      },
      fanHappiness: Math.max(0, (stadiumState.fanHappiness || 70) + fanPenalty),
      history: [
        ...(stadiumState.history || []),
        {
          type: 'naming',
          description: `Naming rights vendidos a ${sponsor.name}`,
          date: `Temporada ${state.season || 1}, Semana ${state.currentWeek}`,
          income: sponsor.offer * sponsor.duration
        }
      ]
    };
    
    dispatch({ type: 'UPDATE_STADIUM', payload: newStadiumState });
    dispatch({ type: 'UPDATE_MONEY', payload: sponsor.offer }); // Primer año
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: '💰 Naming Rights',
        content: `El estadio ahora se llama "${sponsor.name} Arena". Ingresos: €${(sponsor.offer / 1000000).toFixed(1)}M/año durante ${sponsor.duration} años.${isHistoric ? ' Los fans históricos no están contentos...' : ''}`,
        date: `Semana ${state.currentWeek}`
      }
    });
    
    setShowNamingModal(false);
  };
  
  const handleRemoveNaming = () => {
    const fanBonus = (state.team?.reputation || 70) > 80 ? 10 : 3;
    
    const newStadiumState = {
      ...stadiumState,
      naming: null,
      fanHappiness: Math.min(100, (stadiumState.fanHappiness || 70) + fanBonus),
      history: [
        ...(stadiumState.history || []),
        {
          type: 'naming',
          description: 'Naming rights eliminados - Estadio recupera nombre histórico',
          date: `Temporada ${state.season || 1}, Semana ${state.currentWeek}`,
          income: 0
        }
      ]
    };
    
    dispatch({ type: 'UPDATE_STADIUM', payload: newStadiumState });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: '🏟️ Nombre restaurado',
        content: 'El estadio recupera su nombre histórico. ¡Los fans lo celebran!',
        date: `Semana ${state.currentWeek}`
      }
    });
    
    setShowNamingModal(false);
  };
  
  const handleHostEvent = (event) => {
    // Verificar cooldown
    if (!canHostEvent) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'warning',
          title: '⏳ Cooldown activo',
          content: `Debes esperar ${EVENT_COOLDOWN_WEEKS - weeksSinceLastEvent} semanas más antes de organizar otro evento.`,
          date: `Semana ${state.currentWeek}`
        }
      });
      return;
    }
    
    // Aplicar efectos del evento
    const newGrassCondition = Math.max(0, (stadiumState.grassCondition || 100) - event.grassDamage);
    const newFanHappiness = Math.max(0, Math.min(100, (stadiumState.fanHappiness || 70) + event.fanHappiness));
    
    const newStadiumState = {
      ...stadiumState,
      grassCondition: newGrassCondition,
      fanHappiness: newFanHappiness,
      lastEventWeek: state.currentWeek || 1, // Guardar semana del evento
      records: {
        ...stadiumState.records,
        totalEvents: (stadiumState.records?.totalEvents || 0) + 1,
        totalIncome: (stadiumState.records?.totalIncome || 0) + event.income
      },
      history: [
        ...(stadiumState.history || []),
        {
          type: 'event',
          description: event.name,
          date: `Temporada ${state.season || 1}, Semana ${state.currentWeek}`,
          income: event.income
        }
      ]
    };
    
    dispatch({ type: 'UPDATE_STADIUM', payload: newStadiumState });
    dispatch({ type: 'UPDATE_MONEY', payload: event.income });
    
    let message = `${event.name} celebrado con éxito. Ingresos: €${(event.income / 1000).toFixed(0)}K`;
    if (event.grassDamage > 20) {
      message += `. ⚠️ El césped ha sufrido daños (${event.grassDamage}%)`;
    }
    if (event.fanHappiness < 0) {
      message += `. Los fans puristas no están contentos.`;
    } else if (event.fanHappiness > 0) {
      message += `. ¡Los fans están encantados!`;
    }
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: `${event.icon} Evento celebrado`,
        content: message,
        date: `Semana ${state.currentWeek}`
      }
    });
    
    setShowEventModal(false);
    setSelectedEvent(null);
  };
  
  const handleRepairGrass = () => {
    const repairCost = 200000;
    if (state.money < repairCost) return;
    
    const newStadiumState = {
      ...stadiumState,
      grassCondition: 100
    };
    
    dispatch({ type: 'UPDATE_STADIUM', payload: newStadiumState });
    dispatch({ type: 'UPDATE_MONEY', payload: -repairCost });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: '🌱 Césped renovado',
        content: 'El césped ha sido completamente renovado. Condición: 100%',
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  const handleChangeSeatColor = (colorId) => {
    const newStadiumState = {
      ...stadiumState,
      seatColor: colorId
    };
    dispatch({ type: 'UPDATE_STADIUM', payload: newStadiumState });
    setShowCustomizeModal(false);
  };
  
  const handleChangeStadiumName = (newName) => {
    if (!newName.trim()) return;
    const newStadiumState = {
      ...stadiumState,
      customName: newName.trim(),
      naming: null // Quitar sponsor si pone nombre custom
    };
    dispatch({ type: 'UPDATE_STADIUM', payload: newStadiumState });
  };
  
  const formatMoney = (amount) => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `€${(amount / 1000).toFixed(0)}K`;
    return `€${amount}`;
  };
  
  const getSeatColor = () => {
    const color = SEAT_COLORS.find(c => c.id === stadiumState.seatColor);
    return color?.color || '#1a5fb4';
  };
  
  // === RENDER ===
  return (
    <div className="stadium-v2">
      {/* Header con vista del estadio */}
      <div className="stadium-v2__hero">
        <div className="stadium-v2__visual" style={{ '--seat-color': getSeatColor() }}>
          <div className="stadium-iso">
            <div className="stadium-iso__base">
              <div className="stadium-iso__field">
                <div className="field-lines"></div>
              </div>
              <div className="stadium-iso__stands stands-north">
                <div className="stand-fill" style={{ height: `${Math.min(100, (stadiumState.atmosphere || 50))}%` }}></div>
              </div>
              <div className="stadium-iso__stands stands-south">
                <div className="stand-fill" style={{ height: `${Math.min(100, (stadiumState.atmosphere || 50))}%` }}></div>
              </div>
              <div className="stadium-iso__stands stands-east">
                <div className="stand-fill" style={{ height: `${Math.min(100, (stadiumState.atmosphere || 50))}%` }}></div>
              </div>
              <div className="stadium-iso__stands stands-west">
                <div className="stand-fill" style={{ height: `${Math.min(100, (stadiumState.atmosphere || 50))}%` }}></div>
              </div>
              {stadiumState.level >= 2 && <div className="stadium-iso__roof"></div>}
              {stadiumState.level >= 3 && <div className="stadium-iso__lights"></div>}
            </div>
            <div className="stadium-iso__level-badge">{stadiumState.level + 1}</div>
          </div>
        </div>
        
        <div className="stadium-v2__info">
          <h1 className="stadium-name">{stadiumName}</h1>
          <p className="stadium-type">{currentLevel.name} • {currentLevel.capacity.toLocaleString()} asientos</p>
          
          <div className="stadium-v2__quick-stats">
            <div className="quick-stat">
              <span className="icon">🔥</span>
              <span className="value">+{((homeAdvantage - 1) * 100).toFixed(1)}%</span>
              <span className="label">Factor cancha</span>
            </div>
            <div className="quick-stat">
              <span className="icon">😊</span>
              <span className="value">{stadiumState.fanHappiness || 70}%</span>
              <span className="label">Fans</span>
            </div>
            <div className="quick-stat">
              <span className="icon">🌱</span>
              <span className="value">{stadiumState.grassCondition || 100}%</span>
              <span className="label">Césped</span>
            </div>
            <div className="quick-stat highlight">
              <span className="icon">💰</span>
              <span className="value">{formatMoney(state.money)}</span>
              <span className="label">Presupuesto</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="stadium-v2__tabs">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
          📊 Resumen
        </button>
        <button className={activeTab === 'naming' ? 'active' : ''} onClick={() => setActiveTab('naming')}>
          💰 Patrocinio
        </button>
        <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>
          🎤 Eventos
        </button>
        <button className={activeTab === 'vip' ? 'active' : ''} onClick={() => setActiveTab('vip')}>
          👔 VIP
        </button>
        <button className={activeTab === 'customize' ? 'active' : ''} onClick={() => setActiveTab('customize')}>
          🎨 Personalizar
        </button>
        <button className={activeTab === 'upgrade' ? 'active' : ''} onClick={() => setActiveTab('upgrade')}>
          🔧 Ampliar
        </button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
          📜 Historial
        </button>
      </div>
      
      {/* === TAB: OVERVIEW === */}
      {activeTab === 'overview' && (
        <div className="stadium-v2__overview">
          {/* Factor Cancha */}
          <div className="overview-card atmosphere-card">
            <div className="card-header">
              <h3>🔥 Factor Cancha</h3>
              <span className="factor-value">+{((homeAdvantage - 1) * 100).toFixed(1)}%</span>
            </div>
            <p className="card-desc">Bonus a tu equipo en partidos de casa</p>
            
            <div className="atmosphere-breakdown">
              <div className="factor-item">
                <span className="label">Nivel estadio</span>
                <span className="value">+{currentLevel.prestige}%</span>
              </div>
              <div className="factor-item">
                <span className="label">Ambiente afición</span>
                <span className="value">+{((stadiumState.atmosphere || 50) / 100 * 5).toFixed(1)}%</span>
              </div>
              <div className="factor-item">
                <span className="label">Felicidad fans</span>
                <span className="value">{(((stadiumState.fanHappiness || 70) - 50) / 100 * 3).toFixed(1)}%</span>
              </div>
              {stadiumState.grassCondition < 50 && (
                <div className="factor-item negative">
                  <span className="label">Césped dañado</span>
                  <span className="value">-2%</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Ingresos */}
          <div className="overview-card income-card">
            <div className="card-header">
              <h3>💵 Ingresos Anuales</h3>
            </div>
            
            <div className="income-breakdown">
              <div className="income-item">
                <span className="icon">🎫</span>
                <span className="label">Abonos</span>
                <span className="value">{formatMoney(seasonTicketIncome)}</span>
              </div>
              {namingIncome > 0 && (
                <div className="income-item">
                  <span className="icon">🏷️</span>
                  <span className="label">Naming Rights</span>
                  <span className="value">{formatMoney(namingIncome)}</span>
                </div>
              )}
              {vipBoxIncome > 0 && (
                <div className="income-item">
                  <span className="icon">👔</span>
                  <span className="label">Palcos VIP</span>
                  <span className="value">{formatMoney(vipBoxIncome)}</span>
                </div>
              )}
              <div className="income-item maintenance">
                <span className="icon">🔧</span>
                <span className="label">Mantenimiento</span>
                <span className="value negative">-{formatMoney(currentLevel.maintenance * 52)}</span>
              </div>
              <div className="income-total">
                <span className="label">Balance anual</span>
                <span className="value">{formatMoney(seasonTicketIncome + namingIncome + vipBoxIncome - currentLevel.maintenance * 52)}</span>
              </div>
            </div>
          </div>
          
          {/* Estado del césped */}
          <div className="overview-card grass-card">
            <div className="card-header">
              <h3>🌱 Estado del Césped</h3>
              <span className={`grass-value ${stadiumState.grassCondition < 50 ? 'warning' : ''}`}>
                {stadiumState.grassCondition || 100}%
              </span>
            </div>
            
            <div className="grass-bar">
              <div 
                className="grass-fill" 
                style={{ width: `${stadiumState.grassCondition || 100}%` }}
              ></div>
            </div>
            
            {(stadiumState.grassCondition || 100) < 100 && (
              <p className="grass-recovery">
                ♻️ Recuperación natural: +{GRASS_RECOVERY_PER_WEEK}%/semana
                {stadiumState.grassCondition < 100 && (
                  <span> (100% en ~{Math.ceil((100 - (stadiumState.grassCondition || 100)) / GRASS_RECOVERY_PER_WEEK)} semanas)</span>
                )}
              </p>
            )}
            
            {stadiumState.grassCondition < 70 && (
              <button 
                className="repair-btn"
                onClick={handleRepairGrass}
                disabled={state.money < 200000}
              >
                <span>🔧 Renovar césped (instantáneo)</span>
                <span className="cost">{formatMoney(200000)}</span>
              </button>
            )}
            
            {stadiumState.grassCondition < 50 && (
              <p className="grass-warning">⚠️ El mal estado del césped afecta al rendimiento del equipo (-2% factor cancha)</p>
            )}
          </div>
          
          {/* Records */}
          <div className="overview-card records-card">
            <div className="card-header">
              <h3>🏆 Récords del Estadio</h3>
            </div>
            
            <div className="records-grid">
              <div className="record-item">
                <span className="record-icon">👥</span>
                <span className="record-value">{(stadiumState.records?.maxAttendance || 0).toLocaleString()}</span>
                <span className="record-label">Récord asistencia</span>
                {stadiumState.records?.maxAttendanceRival && (
                  <span className="record-detail">vs {stadiumState.records.maxAttendanceRival}</span>
                )}
              </div>
              <div className="record-item">
                <span className="record-icon">💰</span>
                <span className="record-value">{formatMoney(stadiumState.records?.maxIncome || 0)}</span>
                <span className="record-label">Mejor taquilla</span>
              </div>
              <div className="record-item">
                <span className="record-icon">🎪</span>
                <span className="record-value">{stadiumState.records?.totalEvents || 0}</span>
                <span className="record-label">Eventos celebrados</span>
              </div>
              <div className="record-item">
                <span className="record-icon">📈</span>
                <span className="record-value">{formatMoney(stadiumState.records?.totalIncome || 0)}</span>
                <span className="record-label">Ingresos totales</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* === TAB: NAMING RIGHTS === */}
      {activeTab === 'naming' && (
        <div className="stadium-v2__naming">
          <div className="naming-current">
            <h3>🏷️ Nombre actual del estadio</h3>
            <div className="current-name-card">
              <span className="name">{stadiumName}</span>
              {stadiumState.naming && (
                <div className="naming-details">
                  <span className="sponsor">Patrocinado por {NAMING_SPONSORS.find(s => s.id === stadiumState.naming.sponsorId)?.name}</span>
                  <span className="duration">{stadiumState.naming.yearsLeft} años restantes</span>
                  <span className="income">{formatMoney(stadiumState.naming.yearlyIncome)}/año</span>
                  <button className="remove-naming-btn" onClick={handleRemoveNaming}>
                    Rescindir contrato
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {!stadiumState.naming && (
            <>
              <h3>💰 Ofertas de Naming Rights</h3>
              <p className="naming-hint">
                Vende el nombre de tu estadio a un patrocinador. 
                {(state.team?.reputation || 70) > 80 && (
                  <span className="warning"> ⚠️ Tu estadio es histórico: los fans se enfadarán si vendes el nombre.</span>
                )}
              </p>
              
              <div className="sponsors-grid">
                {availableSponsors.map(sponsor => (
                  <div key={sponsor.id} className="sponsor-card">
                    <div className="sponsor-header">
                      <span className="sponsor-name">{sponsor.name}</span>
                      <span className="sponsor-prestige">{'⭐'.repeat(sponsor.minPrestige)}</span>
                    </div>
                    <div className="sponsor-offer">
                      <span className="amount">{formatMoney(sponsor.offer)}</span>
                      <span className="per-year">/año</span>
                    </div>
                    <div className="sponsor-details">
                      <span>Duración: {sponsor.duration} años</span>
                      <span>Total: {formatMoney(sponsor.offer * sponsor.duration)}</span>
                    </div>
                    <button 
                      className="accept-sponsor-btn"
                      onClick={() => handleAcceptNaming(sponsor)}
                    >
                      Aceptar oferta
                    </button>
                  </div>
                ))}
              </div>
              
              {availableSponsors.length === 0 && (
                <div className="no-sponsors">
                  <p>No hay ofertas disponibles. Mejora tu estadio para atraer patrocinadores.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* === TAB: EVENTS === */}
      {activeTab === 'events' && (
        <div className="stadium-v2__events">
          <h3>🎤 Eventos Especiales</h3>
          <p className="events-hint">
            Organiza eventos para generar ingresos extra. Cuidado: algunos dañan el césped o molestan a los fans.
          </p>
          
          {/* Cooldown indicator */}
          {!canHostEvent && (
            <div className="events-cooldown">
              ⏳ Cooldown activo: puedes organizar otro evento en <strong>{EVENT_COOLDOWN_WEEKS - weeksSinceLastEvent} semana(s)</strong>
            </div>
          )}
          
          <div className="events-grid">
            {availableEvents.map(event => (
              <div key={event.id} className={`event-card ${!canHostEvent ? 'disabled' : ''}`}>
                <div className="event-icon">{event.icon}</div>
                <div className="event-info">
                  <h4>{event.name}</h4>
                  <div className="event-stats">
                    <span className="income">💰 {formatMoney(event.income)}</span>
                    <span className={`grass ${event.grassDamage > 15 ? 'warning' : ''}`}>
                      🌱 -{event.grassDamage}%
                    </span>
                    <span className={`fans ${event.fanHappiness < 0 ? 'warning' : event.fanHappiness > 0 ? 'positive' : ''}`}>
                      😊 {event.fanHappiness > 0 ? '+' : ''}{event.fanHappiness}%
                    </span>
                  </div>
                </div>
                <button 
                  className="host-event-btn"
                  onClick={() => handleHostEvent(event)}
                  disabled={!canHostEvent || stadiumState.grassCondition < 30}
                >
                  {canHostEvent ? 'Organizar' : '⏳ Espera'}
                </button>
              </div>
            ))}
          </div>
          
          {stadiumState.grassCondition < 30 && (
            <div className="events-warning">
              ⚠️ El césped está muy dañado. Repáralo antes de organizar más eventos.
            </div>
          )}
        </div>
      )}
      
      {/* === TAB: VIP === */}
      {activeTab === 'vip' && (
        <div className="stadium-v2__vip">
          <h3>👔 Palcos VIP y Corporativos</h3>
          <p className="vip-hint">
            Vende palcos a empresas para ingresos fijos anuales. Mayor prestigio = mejores ofertas.
          </p>
          
          <div className="vip-boxes-grid">
            {VIP_BOXES.filter(box => box.minLevel <= stadiumState.level).map(box => {
              const soldBox = (stadiumState.vipBoxes || []).find(b => b.boxType === box.id);
              const price = box.basePrice * (1 + currentLevel.prestige * 0.2);
              
              return (
                <div key={box.id} className={`vip-box-card ${soldBox ? 'sold' : ''}`}>
                  <div className="box-header">
                    <span className="box-name">{box.name}</span>
                    <span className="box-capacity">{box.capacity} personas</span>
                  </div>
                  
                  {soldBox ? (
                    <div className="box-sold">
                      <span className="company">{soldBox.company}</span>
                      <span className="duration">{soldBox.yearsLeft} años restantes</span>
                      <span className="income">{formatMoney(soldBox.yearlyIncome)}/año</span>
                    </div>
                  ) : (
                    <div className="box-available">
                      <span className="price">{formatMoney(price)}/año</span>
                      <button 
                        className="sell-box-btn"
                        onClick={() => {
                          // Simular venta a empresa aleatoria
                          const companies = ['Banco Nacional', 'Tech Solutions', 'Grupo Industrial', 'Media Corp', 'Inversiones Global'];
                          const company = companies[Math.floor(Math.random() * companies.length)];
                          const years = 3 + Math.floor(Math.random() * 3);
                          
                          const newStadiumState = {
                            ...stadiumState,
                            vipBoxes: [
                              ...(stadiumState.vipBoxes || []),
                              { boxType: box.id, company, yearsLeft: years, yearlyIncome: price }
                            ]
                          };
                          
                          dispatch({ type: 'UPDATE_STADIUM', payload: newStadiumState });
                          dispatch({ type: 'UPDATE_MONEY', payload: price });
                          
                          dispatch({
                            type: 'ADD_MESSAGE',
                            payload: {
                              id: Date.now(),
                              type: 'stadium',
                              title: '👔 Palco VIP vendido',
                              content: `${company} ha alquilado el ${box.name} por ${years} años. Ingresos: ${formatMoney(price)}/año`,
                              date: `Semana ${state.currentWeek}`
                            }
                          });
                        }}
                      >
                        Vender palco
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="vip-summary">
            <span className="icon">💼</span>
            <span>Ingresos anuales por palcos: <strong>{formatMoney(vipBoxIncome)}</strong></span>
          </div>
        </div>
      )}
      
      {/* === TAB: CUSTOMIZE === */}
      {activeTab === 'customize' && (
        <div className="stadium-v2__customize">
          <h3>🎨 Personalizar Estadio</h3>
          
          {/* Color de asientos */}
          <div className="customize-section">
            <h4>Color de los asientos</h4>
            <div className="colors-grid">
              {SEAT_COLORS.map(color => (
                <button
                  key={color.id}
                  className={`color-option ${stadiumState.seatColor === color.id ? 'selected' : ''}`}
                  style={{ '--option-color': color.color }}
                  onClick={() => handleChangeSeatColor(color.id)}
                >
                  <span className="color-preview"></span>
                  <span className="color-name">{color.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Nombre personalizado */}
          <div className="customize-section">
            <h4>Nombre del estadio</h4>
            <p className="customize-hint">Dale un nombre único a tu estadio (sin patrocinador)</p>
            <div className="name-input-group">
              <input
                type="text"
                placeholder="Ej: Estadio La Bombonera"
                defaultValue={stadiumState.customName || ''}
                maxLength={30}
              />
              <button onClick={(e) => {
                const input = e.target.previousElementSibling;
                handleChangeStadiumName(input.value);
              }}>
                Guardar
              </button>
            </div>
          </div>
          
          {/* Características actuales */}
          <div className="customize-section features-section">
            <h4>Características del estadio</h4>
            <div className="features-list">
              {currentLevel.features.map((feature, i) => (
                <div key={i} className="feature-item">
                  <span className="check">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
              {nextLevel && nextLevel.features.map((feature, i) => (
                <div key={`next-${i}`} className="feature-item locked">
                  <span className="lock">🔒</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* === TAB: UPGRADE === */}
      {activeTab === 'upgrade' && (
        <div className="stadium-v2__upgrade">
          <h3>🔧 Ampliación del Estadio</h3>
          
          <div className="upgrade-current">
            <div className="current-level">
              <span className="level-number">{stadiumState.level + 1}</span>
              <div className="level-info">
                <h4>{currentLevel.name}</h4>
                <p>{currentLevel.capacity.toLocaleString()} asientos</p>
              </div>
              <span className="current-badge">Actual</span>
            </div>
          </div>
          
          {nextLevel ? (
            <div className="upgrade-next">
              <div className="upgrade-arrow">⬇️</div>
              <div className="next-level">
                <span className="level-number">{stadiumState.level + 2}</span>
                <div className="level-info">
                  <h4>{nextLevel.name}</h4>
                  <p>{nextLevel.capacity.toLocaleString()} asientos (+{(nextLevel.capacity - currentLevel.capacity).toLocaleString()})</p>
                  <ul className="new-features">
                    {nextLevel.features.map((f, i) => <li key={i}>+ {f}</li>)}
                  </ul>
                </div>
                <button
                  className={`upgrade-btn ${state.money >= nextLevel.upgradeCost ? '' : 'disabled'}`}
                  onClick={handleUpgradeStadium}
                  disabled={state.money < nextLevel.upgradeCost}
                >
                  <span>Ampliar</span>
                  <span className="cost">{formatMoney(nextLevel.upgradeCost)}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-level-reached">
              <span className="icon">🏆</span>
              <span>¡Tu estadio está al máximo nivel!</span>
            </div>
          )}
          
          {/* Roadmap */}
          <div className="upgrade-roadmap">
            <h4>Niveles de estadio</h4>
            <div className="roadmap-track">
              {STADIUM_LEVELS.map((level, idx) => (
                <div 
                  key={idx}
                  className={`roadmap-stop ${idx < stadiumState.level ? 'completed' : idx === stadiumState.level ? 'current' : 'future'}`}
                >
                  <div className="stop-dot">
                    {idx < stadiumState.level ? '✓' : idx + 1}
                  </div>
                  <div className="stop-info">
                    <span className="stop-name">{level.name}</span>
                    <span className="stop-capacity">{level.capacity.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* === TAB: HISTORY === */}
      {activeTab === 'history' && (
        <div className="stadium-v2__history">
          <h3>📜 Historial del Estadio</h3>
          
          {(stadiumState.history || []).length > 0 ? (
            <div className="history-timeline">
              {[...(stadiumState.history || [])].reverse().map((entry, idx) => (
                <div key={idx} className={`history-entry ${entry.type}`}>
                  <div className="entry-icon">
                    {entry.type === 'upgrade' && '🏗️'}
                    {entry.type === 'naming' && '🏷️'}
                    {entry.type === 'event' && '🎪'}
                    {entry.type === 'record' && '🏆'}
                  </div>
                  <div className="entry-content">
                    <span className="entry-desc">{entry.description}</span>
                    <span className="entry-date">{entry.date}</span>
                  </div>
                  {entry.income !== 0 && (
                    <span className={`entry-income ${entry.income > 0 ? 'positive' : 'negative'}`}>
                      {entry.income > 0 ? '+' : ''}{formatMoney(entry.income)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="history-empty">
              <span className="icon">📝</span>
              <p>El historial del estadio se irá llenando con tus decisiones y logros.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
