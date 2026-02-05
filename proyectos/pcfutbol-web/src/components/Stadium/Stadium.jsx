import React, { useState, useMemo, useEffect, Suspense, Component } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { 
  getLaLigaTeams, getSegundaTeams, getPrimeraRfefTeams, getSegundaRfefTeams,
  getPremierTeams, getSerieATeams, getBundesligaTeams, getLigue1Teams,
  getEredivisieTeams, getPrimeiraLigaTeams, getChampionshipTeams, getBelgianProTeams,
  getSuperLigTeams, getScottishPremTeams, getSerieBTeams, getBundesliga2Teams,
  getLigue2Teams, getSwissTeams, getAustrianTeams, getGreekTeams,
  getDanishTeams, getCroatianTeams, getCzechTeams,
  getArgentinaTeams, getBrasileiraoTeams, getColombiaTeams, getChileTeams,
  getUruguayTeams, getEcuadorTeams, getParaguayTeams, getPeruTeams,
  getBoliviaTeams, getVenezuelaTeams
} from '../../data/teamsFirestore';

// Detect mobile viewport
const getIsMobile = () => typeof window !== 'undefined' && window.innerWidth <= 768;

// ErrorBoundary para capturar errores de Stadium3D sin crashear la app
class Stadium3DErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.warn('Stadium3D error:', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="stadium-3d-fallback">
          <span><Building2 size={20} /></span>
          <p>3D view not available</p>
        </div>
      );
    }
    return this.props.children;
  }
}
import { 
  predictAttendance, 
  calculateMatchIncome,
  calculateSeasonTicketIncome,
  calculateSeasonTickets,
  calculatePriceFactor,
  calculateFairPrice,
  PRICE_CONFIG,
  BIG_TEAMS
} from '../../game/stadiumEconomy';
import { Building2, Mic, Briefcase, Trophy, Ticket, Coins, BarChart3, Megaphone, Users, Sprout, Check, AlertTriangle, XCircle, Lock, Wrench, Tag } from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import './Stadium.scss';

// Función para obtener todos los equipos
const getAllTeams = () => [
  ...getLaLigaTeams(), ...getSegundaTeams(), ...getPrimeraRfefTeams(), ...getSegundaRfefTeams(),
  ...getPremierTeams(), ...getSerieATeams(), ...getBundesligaTeams(), ...getLigue1Teams(),
  ...getEredivisieTeams(), ...getPrimeiraLigaTeams(), ...getChampionshipTeams(), ...getBelgianProTeams(),
  ...getSuperLigTeams(), ...getScottishPremTeams(), ...getSerieBTeams(), ...getBundesliga2Teams(),
  ...getLigue2Teams(), ...getSwissTeams(), ...getAustrianTeams(), ...getGreekTeams(),
  ...getDanishTeams(), ...getCroatianTeams(), ...getCzechTeams(),
  ...getArgentinaTeams(), ...getBrasileiraoTeams(), ...getColombiaTeams(), ...getChileTeams(),
  ...getUruguayTeams(), ...getEcuadorTeams(), ...getParaguayTeams(), ...getPeruTeams(),
  ...getBoliviaTeams(), ...getVenezuelaTeams()
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

const SPECIAL_EVENTS_DATA = [
  { id: 'friendly', icon: <FootballIcon size={16} />, income: 200000, grassDamage: 5, cooldown: 1 },
  { id: 'concert', icon: <Mic size={16} />, income: 500000, grassDamage: 20, cooldown: 3 },
  { id: 'corporate', icon: <Briefcase size={16} />, income: 150000, grassDamage: 3, cooldown: 1 },
  { id: 'legends', icon: <Trophy size={16} />, income: 400000, grassDamage: 8, cooldown: 2 }
];

// === COMPONENTE ===
export default function Stadium() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [activeTab, setActiveTab] = useState('general');
  const [isMobile, setIsMobile] = useState(getIsMobile);
  
  useEffect(() => {
    const handler = () => setIsMobile(getIsMobile());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  
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
  const ticketPriceLocked = stadium.ticketPriceLocked ?? false; // Se bloquea al empezar la liga
  const accumulatedTicketIncome = stadium.accumulatedTicketIncome ?? 0; // Ingresos acumulados (se cobran a final de temporada)
  
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
  // Precio justo dinámico según contexto del equipo
  const playerLeagueId = state.playerLeagueId || 'laliga';
  const division = ['segunda', 'segundaRFEF', 'primeraRFEF'].includes(playerLeagueId) ? 2 : 1;
  const fairPrice = calculateFairPrice({
    teamOverall,
    teamReputation,
    leaguePosition: teamPosition,
    totalTeams,
    division
  });
  
  // Estimación de ingresos por entradas sueltas (aplica factor precio relativo al justo)
  const availableForTickets = Math.max(0, capacity - seasonTickets);
  const priceFactor = calculatePriceFactor(ticketPrice, 1.0, fairPrice);
  const estimatedTicketSalesPerMatch = Math.round(availableForTickets * PRICE_CONFIG.baseDemandRate * priceFactor);
  const estimatedTicketIncome = estimatedTicketSalesPerMatch * ticketPrice * HOME_GAMES_PER_SEASON;
  const annualBalance = seasonTicketIncome + estimatedTicketIncome + namingIncome - maintenanceCost;
  
  // Ocupación real: abonados + estimación de entradas sueltas vendidas por partido
  const estimatedTotalAttendance = seasonTickets + estimatedTicketSalesPerMatch;
  const occupancyRate = Math.min(1, estimatedTotalAttendance / capacity);
  
  // Factor cancha gradual (basado en nivel + ocupación real)
  // Ocupación 0% → +0%, 50% → +1%, 75% → +2%, 100% → +3%
  const occupancyBonus = occupancyRate * 0.03;
  const homeAdvantage = 1 + (currentLevel.prestige * 0.01) + occupancyBonus;
  
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
  
  // Cerrar campaña de abonos (fijar precio y cantidad — el cobro se realiza a final de temporada)
  const handleCloseCampaign = () => {
    if (!seasonTicketsCampaignOpen) return;
    const totalAbonados = calculatedSeasonTickets;
    const totalSeasonTicketIncome = totalAbonados * seasonTicketPrice;
    
    updateStadium({
      seasonTicketsCampaignOpen: false,
      seasonTicketsFinal: totalAbonados,
      seasonTicketPriceFinal: seasonTicketPrice,
      seasonTicketIncomeCollected: totalSeasonTicketIncome
    });
    
    // No cobrar ahora — los ingresos de abonados se cobran a final de temporada
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'stadium',
        title: t('stadium.seasonTicketsClosed'),
        content: t('stadium.seasonTicketsMessage', { 
          count: totalAbonados.toLocaleString(), 
          price: seasonTicketPrice, 
          total: formatMoney(totalSeasonTicketIncome) 
        }),
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  // Precio entrada partido (solo ajustable en pretemporada, bloqueado durante la temporada)
  const handleTicketPriceChange = (delta) => {
    if (ticketPriceLocked) return;
    const newPrice = Math.max(5, Math.min(150, ticketPrice + delta)); // Mínimo 5€, máximo 150€
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
        title: t('stadium.namingRights'),
        content: t('stadium.namingMessage', { 
          sponsor: sponsor.name, 
          amount: (sponsor.offer/1000000).toFixed(1), 
          duration: sponsor.duration 
        }),
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
          title: t('stadium.insufficientFunds'),
          content: t('stadium.penaltyRequired', { amount: (penalty / 1000000).toFixed(1) }),
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
        title: t('stadium.sponsorshipCancelled'),
        content: penalty > 0 
          ? t('stadium.stadiumNameRestored', { amount: (penalty / 1000000).toFixed(1) })
          : t('stadium.stadiumNameRestoredFree'),
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
        content: t('stadium.eventHosted', { amount: (event.income/1000).toFixed(0) }),
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
        title: t('stadium.stadiumUpgraded'),
        content: t('stadium.nowStadium', { name: nextLevel.name, capacity: nextLevel.capacity.toLocaleString() }),
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
        awayTeamId: rivalTeam.id,
        teamOverall,
        teamReputation,
        division
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
      {/* Visor 3D del estadio — skip on mobile to avoid WebGL crashes */}
      {!isMobile && (
        <div className="stadium-simple__3d-viewer">
          <Stadium3DErrorBoundary>
            <Suspense fallback={<div className="stadium-3d-loading">{t('stadium.loadingStadium')}</div>}>
              <Stadium3D 
                level={level} 
                naming={naming} 
                grassCondition={grassCondition} 
              />
            </Suspense>
          </Stadium3DErrorBoundary>
        </div>
      )}
      
      {/* Header */}
      <div className="stadium-simple__header">
        <div className="stadium-info">
          <h1>{displayStadiumName}</h1>
          <p>{currentLevel.name} • {capacity.toLocaleString()} {t('stadium.seats')}</p>
        </div>
        <div className="stadium-stats">
          <div className="stat">
            <span className="value">+{((homeAdvantage - 1) * 100).toFixed(1)}%</span>
            <span className="label">{t('stadium.homeAdvantage')}</span>
          </div>
          <div className="stat">
            <span className="value">{Math.round(occupancyRate * 100)}%</span>
            <span className="label">{t('stadium.occupation')}</span>
          </div>
          <div className="stat">
            <span className="value">{grassCondition}%</span>
            <span className="label">{t('stadium.grass')}</span>
          </div>
          <div className="stat highlight">
            <span className="value">{formatMoney(state.money)}</span>
            <span className="label">{t('stadium.budget')}</span>
          </div>
        </div>
      </div>
      
      {/* Tabs simplificados */}
      <div className="stadium-simple__tabs">
        <button className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}>
          <BarChart3 size={14} /> {t('stadium.general')}
        </button>
        <button className={activeTab === 'sponsors' ? 'active' : ''} onClick={() => setActiveTab('sponsors')}>
          <Coins size={14} /> {t('stadium.sponsorship')}
        </button>
        <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>
          <Mic size={14} /> {t('stadium.events')}
        </button>
      </div>
      
      {/* TAB: GENERAL */}
      {activeTab === 'general' && (
        <div className="stadium-simple__general">
          {/* Campaña de abonos */}
          <div className="card">
            <h3><Ticket size={14} /> {t('stadium.seasonTicketCampaign')}</h3>
            {seasonTicketsCampaignOpen ? (
              <>
                <p className="card-hint campaign-open">
                  <Megaphone size={12} /> {t('stadium.campaignOpen', { deadline: SEASON_TICKET_DEADLINE, current: currentWeek })}
                </p>
                
                {/* Precio del abono */}
                <div className="season-price-section">
                  <label>{t('stadium.seasonTicketPrice')}</label>
                  <div className="price-control">
                    <button onClick={() => handleSeasonPriceChange(-50)}>-50€</button>
                    <span className="price-value">€{seasonTicketPrice}</span>
                    <button onClick={() => handleSeasonPriceChange(50)}>+50€</button>
                  </div>
                  <p className="price-detail">{t('stadium.pricePerMatch', { matches: HOME_GAMES_PER_SEASON, pricePerMatch: formatMoney(seasonTicketPrice / HOME_GAMES_PER_SEASON) })}</p>
                </div>
                
                {/* Previsión de abonados */}
                <div className="season-preview">
                  <label>{t('stadium.expectedSubscribers')}</label>
                  <div className="abonados-info">
                    <span className="big-number">{calculatedSeasonTickets.toLocaleString()}</span>
                    <span className="of-total">/ {maxSeasonTickets.toLocaleString()} {t('stadium.maxShort')}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="fill" style={{ width: `${(calculatedSeasonTickets / maxSeasonTickets) * 100}%` }}></div>
                  </div>
                  <div className="abonados-factors">
                    <span title="Overall medio">⭐ {teamOverall}</span>
                    <span title="Posición liga"><BarChart3 size={12} /> {teamPosition}º</span>
                    <span title="Reputación"><Trophy size={12} /> {teamReputation}</span>
                  </div>
                </div>
                
                {/* Botón cerrar campaña */}
                <button className="btn-close-campaign" onClick={handleCloseCampaign}>
                  <Check size={14} /> {t('stadium.closeCampaign')}
                </button>
              </>
            ) : (
              <div className="campaign-closed-card">
                <div className="campaign-closed-header">
                  <span className="lock-icon"><Lock size={14} /></span>
                  <span>{t('stadium.campaignClosed')}</span>
                </div>
                
                <div className="campaign-closed-stats">
                  <div className="campaign-stat main">
                    <span className="stat-value">{seasonTickets.toLocaleString()}</span>
                    <span className="stat-label">{t('stadium.subscribers')}</span>
                  </div>
                  <div className="campaign-stat-divider"></div>
                  <div className="campaign-stat">
                    <span className="stat-value">€{stadium.seasonTicketPriceFinal || seasonTicketPrice}</span>
                    <span className="stat-label">{t('stadium.pricePerTicket')}</span>
                  </div>
                  <div className="campaign-stat-divider"></div>
                  <div className="campaign-stat">
                    <span className="stat-value">{formatMoney((seasonTickets || 0) * (stadium.seasonTicketPriceFinal || seasonTicketPrice))}</span>
                    <span className="stat-label">{t('stadium.collected')}</span>
                  </div>
                </div>
                
                <div className="campaign-closed-bar">
                  <div className="bar-fill" style={{ width: `${Math.min(100, (seasonTickets / Math.floor(capacity * 0.8)) * 100)}%` }}></div>
                </div>
                <div className="campaign-closed-footer">
                  <span>{t('stadium.ofCapacitySubscribed', { percent: Math.round((seasonTickets / capacity) * 100) })}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Precio entrada partido suelto */}
          <div className="card">
            <h3><Ticket size={14} /> {t('stadium.ticketPrice')}</h3>
            <p className="card-hint">
              {ticketPriceLocked 
                ? <><Lock size={12} /> {t('stadium.priceLocked')}</>
                : t('stadium.setPriceBeforeLeague')}
            </p>
            
            <div className="price-control">
              <button 
                onClick={() => handleTicketPriceChange(-5)} 
                disabled={ticketPriceLocked}
                className={ticketPriceLocked ? 'locked' : ''}
              >-5€</button>
              <span className="price-value">€{ticketPrice}</span>
              <button 
                onClick={() => handleTicketPriceChange(5)} 
                disabled={ticketPriceLocked}
                className={ticketPriceLocked ? 'locked' : ''}
              >+5€</button>
            </div>
            
            {/* Ingresos acumulados esta temporada */}
            <div className="accumulated-income">
              <div className="accumulated-row">
                <span className="label"><Coins size={12} /> {t('stadium.accumulatedTicketIncome')}</span>
                <span className="value accumulated-value">{formatMoney(accumulatedTicketIncome)}</span>
              </div>
              <p className="accumulated-hint">{t('stadium.onlyTicketsSold')}</p>
            </div>
            
            {/* Última jornada en casa */}
            {(stadium.lastMatchTicketSales != null || stadium.lastMatchIncome != null) && (
              <div className="last-match-info">
                <h4><BarChart3 size={12} /> {t('stadium.lastHomeMatchday')}</h4>
                <div className="last-match-stats">
                  {stadium.lastMatchTicketSales != null && (
                    <div className="stat-row">
                      <span className="label"><Ticket size={12} /> {t('stadium.ticketsSold')}</span>
                      <span className="value">{stadium.lastMatchTicketSales.toLocaleString()}</span>
                    </div>
                  )}
                  {stadium.lastMatchAttendance != null && (
                    <div className="stat-row">
                      <span className="label"><Users size={12} /> {t('stadium.totalAttendance')}</span>
                      <span className="value">{stadium.lastMatchAttendance.toLocaleString()}</span>
                    </div>
                  )}
                  {stadium.lastMatchIncome != null && (
                    <div className="stat-row income">
                      <span className="label"><Coins size={12} /> {t('stadium.ticketIncome')}</span>
                      <span className="value">{formatMoney(stadium.lastMatchIncome)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Césped */}
          <div className="card grass-card">
            <h3><Sprout size={14} /> {t('stadium.grassCondition')}</h3>
            <div className="grass-bar">
              <div className={`fill ${grassCondition < 50 ? 'danger' : grassCondition < 70 ? 'warning' : ''}`} style={{ width: `${grassCondition}%` }}></div>
              <span className="grass-percent">{grassCondition}%</span>
            </div>
            
            {/* Estado y efecto en lesiones */}
            <div className="grass-status">
              {grassCondition >= 80 && <span className="status good"><Check size={12} /> {t('stadium.optimal')}</span>}
              {grassCondition >= 50 && grassCondition < 80 && <span className="status warning"><AlertTriangle size={12} /> {t('stadium.injuryRisk', { percent: Math.round((100 - grassCondition) / 2) })}</span>}
              {grassCondition < 50 && <span className="status danger"><XCircle size={12} /> {t('stadium.injuryRisk', { percent: Math.round((100 - grassCondition)) })}</span>}
            </div>
            
            <p className="grass-hint">
              {grassCondition < 100 ? t('stadium.recovers') : t('stadium.perfectCondition')}
              {grassCondition < 70 && ` • ${t('stadium.poorGrassWarning')}`}
            </p>
            
            {grassCondition < 70 && (
              <button className="repair-btn" onClick={handleRepairGrass} disabled={state.money < 200000}>
                <Wrench size={14} /> {t('stadium.repairGrass', { cost: formatMoney(200000) })}
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
              <h3><Tag size={14} /> {t('stadium.currentSponsor')}</h3>
              <div className="sponsor-info">
                <span className="sponsor-name">{naming.name}</span>
                <span className="sponsor-income">{formatMoney(naming.yearlyIncome)}{t('stadium.perYear')}</span>
                <span className="sponsor-years">{t('stadium.yearsRemaining', { years: naming.yearsLeft })}</span>
              </div>
              <button className="cancel-btn" onClick={handleCancelNaming}>
                {t('stadium.cancelContract')}
              </button>
              <span className="cancel-warning">
                <AlertTriangle size={12} /> {t('stadium.penalty', { amount: formatMoney(Math.round(naming.yearlyIncome * naming.yearsLeft * 0.5)) })}
              </span>
            </div>
          ) : (
            <>
              <h3><Coins size={14} /> {t('stadium.namingOffers')}</h3>
              <p className="hint">{t('stadium.sellStadiumName')}</p>
              
              {availableSponsors.length > 0 ? (
                <div className="sponsors-list">
                  {availableSponsors.map(sponsor => (
                    <div key={sponsor.id} className="sponsor-offer">
                      <div className="offer-info">
                        <span className="name">{sponsor.name}</span>
                        <span className="price">{formatMoney(sponsor.offer)}/año</span>
                        <span className="duration">{sponsor.duration} años</span>
                      </div>
                      <button onClick={() => handleAcceptNaming(sponsor)}>{t('stadium.accept')}</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-offers">{t('stadium.upgradeForSponsors')}</p>
              )}
            </>
          )}
        </div>
      )}
      
      {/* TAB: EVENTS */}
      {activeTab === 'events' && (
        <div className="stadium-simple__events">
          <h3><Mic size={14} /> {t('stadium.organizeEvents')}</h3>
          <p className="hint">{t('stadium.generateExtraIncome')}</p>
          
          {!canHostEvent && (
            <div className="cooldown-notice">
              ⏳ {t('stadium.waitMoreWeeks', { weeks: 2 - weeksSinceEvent })}
            </div>
          )}
          
          <div className="events-list">
            {SPECIAL_EVENTS_DATA.map(event => (
              <div key={event.id} className={`event-item ${!canHostEvent ? 'disabled' : ''}`}>
                <span className="event-icon">{event.icon}</span>
                <div className="event-info">
                  <span className="event-name">{t(`stadium.events.${event.id}`)}</span>
                  <span className="event-details">
                    {formatMoney(event.income)} • {t('stadium.grassDamage', { percent: event.grassDamage })}
                  </span>
                </div>
                <button onClick={() => handleHostEvent({...event, name: t(`stadium.events.${event.id}`)}) } disabled={!canHostEvent || grassCondition < 30}>
                  {t('stadium.organize')}
                </button>
              </div>
            ))}
          </div>
          
          {grassCondition < 30 && (
            <p className="grass-warning"><AlertTriangle size={12} /> {t('stadium.repairGrassBeforeEvents')}</p>
          )}
        </div>
      )}
      
    </div>
  );
}
