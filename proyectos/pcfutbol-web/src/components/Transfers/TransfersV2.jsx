import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  Search, Filter, TrendingUp, TrendingDown, Clock, AlertCircle,
  ChevronRight, X, Check, DollarSign, Calendar, MapPin, Star,
  Users, Newspaper, Target, Zap, ArrowRight, ArrowLeftRight,
  Building2, Briefcase, Bell, RefreshCw, UserCheck, Handshake,
  ThumbsUp, ThumbsDown, MessageSquare, Crown, Shield
} from 'lucide-react';
import { isTransferWindowOpen, formatTransferPrice, calculateMarketValue } from '../../game/globalTransferEngine';
import { 
  getClubTier, getTierData, calculateTransferDifficulty, 
  calculateRequiredSalary, evaluateClubOffer, evaluatePlayerOffer,
  PLAYER_PERSONALITIES, assignPersonality, NEGOTIATION_STATES
} from '../../game/transferNegotiation';
import {
  SCOUTING_LEVELS, generateScoutingSuggestions, analyzeTeamNeeds,
  AVAILABLE_LEAGUES, getTeamsByLeague
} from '../../game/scoutingSystem';
import './TransfersV2.scss';

// ============================================================
// TRANSFERS V2 - Mercado de Fichajes Renovado
// ============================================================

export default function TransfersV2() {
  const { state, dispatch } = useGame();
  const [activeTab, setActiveTab] = useState('resumen');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    position: 'all',
    ageMin: 16,
    ageMax: 40,
    ovrMin: 50,
    priceMax: 200_000_000
  });
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Estado del mercado
  const windowStatus = isTransferWindowOpen(state.currentWeek || 1);
  const marketSummary = state.globalMarket?.summary || { 
    recentTransfers: [], 
    activeRumors: [],
    totalTransfers: 0 
  };
  
  // Datos
  const myTeam = state.team;
  const myPlayers = myTeam?.players || [];
  const allPlayers = useMemo(() => {
    const players = [];
    // Jugadores de otros equipos (simulado por ahora)
    (state.leagueTeams || []).forEach(team => {
      if (team.id !== state.teamId) {
        (team.players || []).forEach(p => {
          players.push({ ...p, teamName: team.name, teamId: team.id });
        });
      }
    });
    return players;
  }, [state.leagueTeams, state.teamId]);
  
  // Filtrar jugadores
  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(p => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filters.position !== 'all') {
        const posMap = {
          GK: ['GK'],
          DEF: ['CB', 'RB', 'LB', 'RWB', 'LWB'],
          MID: ['CM', 'CDM', 'CAM', 'RM', 'LM'],
          FWD: ['ST', 'CF', 'RW', 'LW']
        };
        if (!posMap[filters.position]?.includes(p.position)) return false;
      }
      if (p.age < filters.ageMin || p.age > filters.ageMax) return false;
      if (p.overall < filters.ovrMin) return false;
      return true;
    }).sort((a, b) => b.overall - a.overall);
  }, [allPlayers, searchQuery, filters]);

  // Nivel de ojeador (desde facilities)
  const scoutingLevel = state.facilities?.scouting || 0;

  // Tabs del mercado
  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: Newspaper },
    { id: 'explorar', label: 'Explorar', icon: Building2 },
    { id: 'ojeador', label: 'Ojeador', icon: Target },
    { id: 'buscar', label: 'Buscar', icon: Search },
    { id: 'recibidas', label: 'Recibidas', icon: Bell, badge: state.incomingOffers?.filter(o => o.status === 'pending')?.length },
    { id: 'enviadas', label: 'Enviadas', icon: Briefcase, badge: state.outgoingOffers?.filter(o => o.status === 'pending')?.length },
  ];

  return (
    <div className="transfers-v2">
      {/* HEADER */}
      <div className="transfers-header">
        <div className="header-left">
          <h1>Mercado de Fichajes</h1>
          <div className={`window-status ${windowStatus.open ? 'open' : 'closed'}`}>
            <Clock size={16} />
            <span>
              {windowStatus.open 
                ? `${windowStatus.type === 'summer' ? 'Mercado de Verano' : 'Mercado de Invierno'} ABIERTO`
                : 'Mercado CERRADO'}
            </span>
          </div>
        </div>
        <div className="header-right">
          <div className="budget-display">
            <DollarSign size={18} />
            <span className="label">Presupuesto</span>
            <span className="amount">{formatTransferPrice(state.money || 0)}</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="transfers-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
            {tab.badge > 0 && <span className="badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="transfers-content">
        {activeTab === 'resumen' && (
          <ResumenTab 
            windowStatus={windowStatus}
            summary={marketSummary}
            myTeam={myTeam}
          />
        )}
        
        {activeTab === 'explorar' && (
          <ExplorarTab
            leagueTeams={state.leagueTeams || []}
            myTeamId={state.teamId}
            onSelectPlayer={setSelectedPlayer}
          />
        )}
        
        {activeTab === 'ojeador' && (
          <OjeadorTab
            myTeam={myTeam}
            leagueTeams={state.leagueTeams || []}
            scoutingLevel={scoutingLevel}
            budget={state.money}
            onSelectPlayer={setSelectedPlayer}
            facilities={state.facilities}
            dispatch={dispatch}
          />
        )}
        
        {activeTab === 'buscar' && (
          <BuscarTab
            players={filteredPlayers}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filters={filters}
            setFilters={setFilters}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            onSelectPlayer={setSelectedPlayer}
            budget={state.money}
          />
        )}
        
        {activeTab === 'recibidas' && (
          <OfertasRecibidasTab 
            offers={state.incomingOffers || []}
            myPlayers={myPlayers}
            dispatch={dispatch}
          />
        )}
        
        {activeTab === 'enviadas' && (
          <MisOfertasTab 
            offers={state.outgoingOffers || []}
            dispatch={dispatch}
            budget={state.money}
          />
        )}
        
      </div>

      {/* TICKER DE NOTICIAS */}
      <NewsTicker transfers={marketSummary.recentTransfers} />

      {/* MODAL JUGADOR */}
      {selectedPlayer && (
        <PlayerModal 
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          budget={state.money}
          dispatch={dispatch}
          myTeam={myTeam}
        />
      )}
    </div>
  );
}

// ============================================================
// TAB: RESUMEN
// ============================================================
function ResumenTab({ windowStatus, summary, myTeam }) {
  return (
    <div className="tab-resumen">
      {/* Estado del mercado */}
      <div className="market-status-card">
        <div className="status-icon">
          {windowStatus.open ? <Zap className="open" /> : <Clock className="closed" />}
        </div>
        <div className="status-info">
          <h3>{windowStatus.open ? 'Mercado Abierto' : 'Mercado Cerrado'}</h3>
          <p>
            {windowStatus.open 
              ? `El ${windowStatus.type === 'summer' ? 'mercado de verano' : 'mercado de invierno'} está activo. ¡Es momento de reforzar la plantilla!`
              : 'El mercado de fichajes está cerrado. Los rumores continúan...'}
          </p>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="quick-stats">
        <div className="stat-card">
          <ArrowLeftRight size={24} />
          <div className="stat-value">{summary.totalTransfers || 0}</div>
          <div className="stat-label">Fichajes Totales</div>
        </div>
        <div className="stat-card">
          <TrendingUp size={24} />
          <div className="stat-value">{formatTransferPrice(summary.totalSpent || 0)}</div>
          <div className="stat-label">Dinero Movido</div>
        </div>
        <div className="stat-card">
          <Newspaper size={24} />
          <div className="stat-value">{summary.activeRumors?.length || 0}</div>
          <div className="stat-label">Rumores Activos</div>
        </div>
      </div>

      {/* Últimos fichajes */}
      <div className="section">
        <h3><TrendingUp size={18} /> Últimos Fichajes</h3>
        <div className="transfers-list">
          {(summary.recentTransfers || []).slice(0, 5).map((t, i) => (
            <div key={i} className="transfer-item">
              <div className="player-info">
                <span className="position">{t.player?.position}</span>
                <span className="name">{t.player?.name}</span>
                <span className="overall">{t.player?.overall}</span>
              </div>
              <div className="transfer-flow">
                <span className="from">{t.from?.name}</span>
                <ArrowRight size={16} />
                <span className="to">{t.to?.name}</span>
              </div>
              <div className="price">{formatTransferPrice(t.price)}</div>
            </div>
          ))}
          {(!summary.recentTransfers || summary.recentTransfers.length === 0) && (
            <div className="empty-state">
              <p>No hay fichajes recientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Rumores */}
      <div className="section">
        <h3><Newspaper size={18} /> Rumores del Mercado</h3>
        <div className="rumors-list">
          {(summary.activeRumors || []).slice(0, 5).map((r, i) => (
            <div key={i} className="rumor-item">
              <div className="rumor-text">{r.text}</div>
              <div className="rumor-reliability">
                <span className={`reliability ${r.reliability > 60 ? 'high' : r.reliability > 40 ? 'medium' : 'low'}`}>
                  {r.reliability}% fiable
                </span>
              </div>
            </div>
          ))}
          {(!summary.activeRumors || summary.activeRumors.length === 0) && (
            <div className="empty-state">
              <p>No hay rumores activos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB: BUSCAR JUGADORES
// ============================================================
function BuscarTab({ players, searchQuery, setSearchQuery, filters, setFilters, showFilters, setShowFilters, onSelectPlayer, budget }) {
  return (
    <div className="tab-buscar">
      {/* Barra de búsqueda */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar jugador por nombre..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <button 
          className={`filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
          Filtros
        </button>
      </div>

      {/* Filtros expandibles */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Posición</label>
            <select value={filters.position} onChange={e => setFilters({...filters, position: e.target.value})}>
              <option value="all">Todas</option>
              <option value="GK">Portero</option>
              <option value="DEF">Defensa</option>
              <option value="MID">Centrocampista</option>
              <option value="FWD">Delantero</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Edad: {filters.ageMin} - {filters.ageMax}</label>
            <input 
              type="range" 
              min="16" max="40" 
              value={filters.ageMax}
              onChange={e => setFilters({...filters, ageMax: parseInt(e.target.value)})}
            />
          </div>
          <div className="filter-group">
            <label>OVR mínimo: {filters.ovrMin}</label>
            <input 
              type="range" 
              min="50" max="95" 
              value={filters.ovrMin}
              onChange={e => setFilters({...filters, ovrMin: parseInt(e.target.value)})}
            />
          </div>
        </div>
      )}

      {/* Resultados */}
      <div className="results-header">
        <span>{players.length} jugadores encontrados</span>
      </div>

      <div className="players-grid">
        {players.slice(0, 50).map((player, i) => (
          <div 
            key={i} 
            className="player-card"
            onClick={() => onSelectPlayer(player)}
          >
            <div className="card-header">
              <span className="position" data-pos={player.position}>{player.position}</span>
              <span className="overall">{player.overall}</span>
            </div>
            <div className="card-body">
              <h4>{player.name}</h4>
              <p className="team">{player.teamName}</p>
              <div className="meta">
                <span>{player.age} años</span>
                <span>{formatTransferPrice(player.value || player.overall * 500000)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TAB: OFERTAS RECIBIDAS
// ============================================================
function OfertasRecibidasTab({ offers, myPlayers, dispatch }) {
  const pendingOffers = offers.filter(o => o.status === 'pending');
  const pastOffers = offers.filter(o => o.status !== 'pending');
  
  const handleAccept = (offer) => {
    dispatch({ type: 'ACCEPT_INCOMING_OFFER', payload: offer });
  };
  
  const handleReject = (offer) => {
    dispatch({ type: 'REJECT_INCOMING_OFFER', payload: offer });
  };
  
  if (pendingOffers.length === 0 && pastOffers.length === 0) {
    return (
      <div className="tab-ofertas empty">
        <Bell size={48} className="empty-icon" />
        <h3>Sin ofertas recibidas</h3>
        <p>Ningún club ha mostrado interés en tus jugadores... por ahora.</p>
      </div>
    );
  }

  return (
    <div className="tab-ofertas">
      {pendingOffers.length > 0 && <h4 className="section-title">Ofertas pendientes</h4>}
      {pendingOffers.map((offer, i) => (
        <div key={offer.id || i} className="offer-card incoming">
          <div className="offer-header">
            <div className="from-team">
              <Building2 size={20} />
              <span>{offer.fromTeam}</span>
            </div>
            <span className={`status ${offer.status}`}>Pendiente</span>
          </div>
          <div className="offer-player">
            <span className="position">{offer.player?.position}</span>
            <span className="name">{offer.player?.name}</span>
            <span className="overall">{offer.player?.overall}</span>
          </div>
          <div className="offer-amount">
            <DollarSign size={18} />
            <span>{formatTransferPrice(offer.amount)}</span>
          </div>
          <div className="offer-actions">
            <button className="btn-accept" onClick={() => handleAccept(offer)}>
              <Check size={16} /> Aceptar
            </button>
            <button className="btn-reject" onClick={() => handleReject(offer)}>
              <X size={16} /> Rechazar
            </button>
          </div>
        </div>
      ))}
      
      {pastOffers.length > 0 && <h4 className="section-title past">Historial</h4>}
      {pastOffers.slice(0, 5).map((offer, i) => (
        <div key={offer.id || i} className={`offer-card incoming ${offer.status}`}>
          <div className="offer-header">
            <div className="from-team">
              <Building2 size={20} />
              <span>{offer.fromTeam}</span>
            </div>
            <span className={`status ${offer.status}`}>
              {offer.status === 'rejected' ? 'Rechazada' : offer.status}
            </span>
          </div>
          <div className="offer-player">
            <span className="position">{offer.player?.position}</span>
            <span className="name">{offer.player?.name}</span>
          </div>
          <div className="offer-amount faded">
            {formatTransferPrice(offer.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// TAB: MIS OFERTAS
// ============================================================
function MisOfertasTab({ offers, dispatch, budget }) {
  const handleAcceptCounter = (offer) => {
    // Aceptar contraoferta - procesar como nueva oferta aceptada
    const updatedOffer = { ...offer, amount: offer.counterAmount, status: 'accepted' };
    dispatch({ type: 'PROCESS_OUTGOING_OFFER', payload: updatedOffer });
  };
  
  const handleWithdraw = (offer) => {
    dispatch({ type: 'REMOVE_OUTGOING_OFFER', payload: offer.id });
  };
  
  if (offers.length === 0) {
    return (
      <div className="tab-ofertas empty">
        <Briefcase size={48} className="empty-icon" />
        <h3>Sin ofertas enviadas</h3>
        <p>No tienes ofertas activas. ¡Busca jugadores para reforzar tu equipo!</p>
      </div>
    );
  }

  return (
    <div className="tab-ofertas">
      {offers.map((offer, i) => (
        <div key={offer.id || i} className={`offer-card outgoing ${offer.status}`}>
          <div className="offer-header">
            <div className="to-team">
              <Target size={20} />
              <span>{offer.toTeam}</span>
            </div>
            <span className={`status ${offer.status}`}>
              {offer.status === 'pending' ? 'Pendiente' :
               offer.status === 'accepted' ? 'Aceptada' :
               offer.status === 'rejected' ? 'Rechazada' :
               offer.status === 'countered' ? 'Contraoferta' : offer.status}
            </span>
          </div>
          <div className="offer-player">
            <span className="position">{offer.player?.position}</span>
            <span className="name">{offer.player?.name}</span>
            <span className="overall">{offer.player?.overall}</span>
          </div>
          <div className="offer-amount">
            <DollarSign size={18} />
            <span>{formatTransferPrice(offer.amount)}</span>
          </div>
          <div className="offer-status-detail">
            {offer.status === 'pending' && <span>⏳ Esperando respuesta...</span>}
            {offer.status === 'accepted' && <span className="success">✅ ¡Fichaje completado!</span>}
            {offer.status === 'rejected' && <span className="rejected">❌ Oferta rechazada</span>}
            {offer.status === 'countered' && (
              <div className="counter-offer">
                <span>🔄 Piden {formatTransferPrice(offer.counterAmount)}</span>
                {budget >= offer.counterAmount && (
                  <button className="btn-accept-counter" onClick={() => handleAcceptCounter(offer)}>
                    <Check size={14} /> Aceptar
                  </button>
                )}
                <button className="btn-withdraw" onClick={() => handleWithdraw(offer)}>
                  <X size={14} /> Retirar
                </button>
              </div>
            )}
          </div>
          {offer.status === 'pending' && (
            <button className="btn-withdraw-small" onClick={() => handleWithdraw(offer)}>
              Retirar oferta
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// TAB: NOTICIAS
// ============================================================
function NoticiasTab({ transfers, rumors }) {
  const allNews = [
    ...(transfers || []).map(t => ({ 
      type: 'transfer', 
      text: `${t.player?.name} ficha por ${t.to?.name} desde ${t.from?.name} por ${formatTransferPrice(t.price)}`,
      time: t.date,
      icon: '✅'
    })),
    ...(rumors || []).map(r => ({ 
      type: 'rumor', 
      text: r.text,
      time: r.createdAt,
      reliability: r.reliability,
      icon: '📰'
    }))
  ].sort((a, b) => new Date(b.time) - new Date(a.time));

  return (
    <div className="tab-noticias">
      <h3><Zap size={20} /> Feed de Noticias</h3>
      <div className="news-feed">
        {allNews.map((news, i) => (
          <div key={i} className={`news-item ${news.type}`}>
            <span className="news-icon">{news.icon}</span>
            <div className="news-content">
              <p>{news.text}</p>
              {news.reliability && (
                <span className="reliability">{news.reliability}% fiable</span>
              )}
            </div>
          </div>
        ))}
        {allNews.length === 0 && (
          <div className="empty-state">
            <p>No hay noticias recientes</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB: EXPLORAR LIGAS Y EQUIPOS
// ============================================================
function ExplorarTab({ leagueTeams, myTeamId, onSelectPlayer }) {
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  const teams = useMemo(() => getTeamsByLeague(leagueTeams, selectedLeague), [leagueTeams, selectedLeague]);
  
  // Vista de ligas
  if (!selectedLeague) {
    return (
      <div className="tab-explorar">
        <div className="explorar-header">
          <h3><Building2 size={20} /> Explorar Ligas</h3>
          <p>Selecciona una liga para ver sus equipos</p>
        </div>
        <div className="leagues-grid">
          {AVAILABLE_LEAGUES.map(league => (
            <div 
              key={league.id}
              className="league-card"
              style={{ '--league-color': league.color }}
              onClick={() => setSelectedLeague(league.id)}
            >
              <span className="league-flag">{league.flag}</span>
              <div className="league-info">
                <span className="league-name">{league.name}</span>
                <span className="league-country">{league.country}</span>
              </div>
              <ChevronRight size={20} className="arrow" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Vista de equipos
  if (!selectedTeam) {
    const leagueInfo = AVAILABLE_LEAGUES.find(l => l.id === selectedLeague);
    return (
      <div className="tab-explorar">
        <div className="explorar-header with-back">
          <button className="back-btn" onClick={() => setSelectedLeague(null)}>
            <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div>
            <h3>{leagueInfo?.flag} {leagueInfo?.name}</h3>
            <p>{teams.length} equipos</p>
          </div>
        </div>
        <div className="teams-grid">
          {teams.map(team => (
            <div 
              key={team.id}
              className={`team-card ${team.id === myTeamId ? 'my-team' : ''}`}
              onClick={() => team.id !== myTeamId && setSelectedTeam(team)}
            >
              <div className="team-badge">{team.name?.charAt(0)}</div>
              <div className="team-info">
                <span className="team-name">{team.name}</span>
                <div className="team-stats">
                  <span className="stat">
                    <Users size={12} />
                    {team.players?.length || 0}
                  </span>
                  <span className="stat">
                    <Star size={12} />
                    {team.avgOverall}
                  </span>
                  <span className="stat tier" data-tier={team.tier}>
                    T{team.tier}
                  </span>
                </div>
              </div>
              {team.id !== myTeamId && <ChevronRight size={18} className="arrow" />}
              {team.id === myTeamId && <span className="my-badge">Tu equipo</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Vista de plantilla del equipo
  return (
    <div className="tab-explorar">
      <div className="explorar-header with-back">
        <button className="back-btn" onClick={() => setSelectedTeam(null)}>
          <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div>
          <h3>{selectedTeam.name}</h3>
          <p>Media: {selectedTeam.avgOverall} | Valor: {formatTransferPrice(selectedTeam.totalValue)}</p>
        </div>
      </div>
      <div className="squad-list">
        {(selectedTeam.players || [])
          .sort((a, b) => b.overall - a.overall)
          .map((player, i) => (
            <div 
              key={i}
              className="squad-player"
              onClick={() => onSelectPlayer({ ...player, teamName: selectedTeam.name, teamId: selectedTeam.id })}
            >
              <span className="player-pos" data-pos={player.position}>{player.position}</span>
              <span className="player-name">{player.name}</span>
              <span className="player-age">{player.age} años</span>
              <span className="player-ovr">{player.overall}</span>
              <span className="player-value">{formatTransferPrice(calculateMarketValue(player))}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ============================================================
// TAB: OJEADOR (SCOUTING)
// ============================================================
function OjeadorTab({ myTeam, leagueTeams, scoutingLevel, budget, onSelectPlayer, facilities, dispatch }) {
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const config = SCOUTING_LEVELS[scoutingLevel] || SCOUTING_LEVELS[0];
  const { needs, teamAvgOvr } = useMemo(() => analyzeTeamNeeds(myTeam, scoutingLevel), [myTeam, scoutingLevel]);
  
  const handleGenerateSuggestions = () => {
    setIsLoading(true);
    setTimeout(() => {
      const result = generateScoutingSuggestions(myTeam, leagueTeams, scoutingLevel, budget);
      setSuggestions(result);
      setIsLoading(false);
    }, 1000);
  };
  
  const handleUpgrade = () => {
    if (scoutingLevel >= 3) return;
    const costs = [2_000_000, 5_000_000, 15_000_000];
    const cost = costs[scoutingLevel];
    if (budget >= cost) {
      dispatch({ type: 'UPGRADE_FACILITY', payload: { facilityId: 'scouting', cost } });
    }
  };
  
  const upgradeCost = [2_000_000, 5_000_000, 15_000_000][scoutingLevel];

  return (
    <div className="tab-ojeador">
      {/* Header con nivel del ojeador */}
      <div className="ojeador-header">
        <div className="ojeador-level">
          <div className="level-icon">
            <Target size={28} />
          </div>
          <div className="level-info">
            <span className="level-name">{config.name}</span>
            <span className="level-desc">{config.description}</span>
          </div>
          <div className="level-badge">Nv. {scoutingLevel}</div>
        </div>
        
        {scoutingLevel < 3 && (
          <button 
            className="upgrade-btn"
            onClick={handleUpgrade}
            disabled={budget < upgradeCost}
          >
            <TrendingUp size={16} />
            Mejorar ({formatTransferPrice(upgradeCost)})
          </button>
        )}
      </div>
      
      {/* Features del nivel actual */}
      <div className="ojeador-features">
        {config.features.map((feature, i) => (
          <span key={i} className="feature-tag">
            <Check size={12} /> {feature}
          </span>
        ))}
      </div>
      
      {/* Análisis de necesidades */}
      <div className="needs-section">
        <h4><AlertCircle size={16} /> Necesidades del equipo</h4>
        <div className="needs-grid">
          {needs.slice(0, 4).map((need, i) => (
            <div key={i} className={`need-card ${need.priority}`}>
              <span className="need-position">{need.group}</span>
              <span className="need-reason">{need.reason}</span>
              <span className="need-priority">{
                need.priority === 'critical' ? '🔴 Crítico' :
                need.priority === 'high' ? '🟠 Alta' :
                need.priority === 'medium' ? '🟡 Media' : '🟢 Baja'
              }</span>
            </div>
          ))}
          {needs.length === 0 && (
            <div className="no-needs">✅ Plantilla equilibrada</div>
          )}
        </div>
      </div>
      
      {/* Botón generar sugerencias */}
      {!suggestions && (
        <button 
          className="generate-btn"
          onClick={handleGenerateSuggestions}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw size={18} className="spinning" />
              Analizando mercado...
            </>
          ) : (
            <>
              <Search size={18} />
              Generar {config.maxSuggestions} sugerencias
            </>
          )}
        </button>
      )}
      
      {/* Lista de sugerencias */}
      {suggestions && (
        <div className="suggestions-section">
          <div className="suggestions-header">
            <h4><Star size={16} /> Sugerencias del ojeador</h4>
            <button className="refresh-btn" onClick={handleGenerateSuggestions} disabled={isLoading}>
              <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
            </button>
          </div>
          
          <div className="suggestions-list">
            {suggestions.suggestions.map((player, i) => (
              <div 
                key={i}
                className={`suggestion-card ${player.matchesNeed ? 'matches-need' : ''}`}
                onClick={() => onSelectPlayer(player)}
              >
                <div className="suggestion-rank">#{i + 1}</div>
                <div className="suggestion-main">
                  <div className="player-header">
                    <span className="position" data-pos={player.position}>{player.position}</span>
                    <span className="name">{player.name}</span>
                    <span className="overall">{player.overall}</span>
                  </div>
                  <div className="player-meta">
                    <span>{player.teamName}</span>
                    <span>{player.age} años</span>
                    <span>{formatTransferPrice(player.marketValue)}</span>
                  </div>
                  {scoutingLevel >= 2 && player.recommendation && (
                    <div className="recommendation">{player.recommendation}</div>
                  )}
                </div>
                <div className="suggestion-side">
                  <div 
                    className="difficulty-dot" 
                    style={{ background: player.difficulty?.color }}
                    title={player.difficulty?.difficulty}
                  ></div>
                  {player.matchesNeed && (
                    <span className="need-badge" data-priority={player.needPriority}>
                      {player.needPriority === 'critical' ? '🎯' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TICKER DE NOTICIAS (Banner inferior)
// ============================================================
function NewsTicker({ transfers }) {
  const tickerItems = (transfers || []).slice(0, 10).map(t => 
    `🔄 ${t.player?.name} → ${t.to?.name} (${formatTransferPrice(t.price)})`
  );

  if (tickerItems.length === 0) {
    tickerItems.push('📰 Mercado de fichajes activo | Mantente atento a las novedades');
  }

  return (
    <div className="news-ticker">
      <div className="ticker-label">
        <Zap size={14} />
        ÚLTIMA HORA
      </div>
      <div className="ticker-content">
        <div className="ticker-scroll">
          {tickerItems.map((item, i) => (
            <span key={i} className="ticker-item">{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: NEGOCIACIÓN DE FICHAJE (Sistema Profundo)
// ============================================================
function PlayerModal({ player, onClose, budget, dispatch, myTeam }) {
  const { state } = useGame();
  
  // Estados de la negociación
  const [phase, setPhase] = useState('info'); // info -> club -> player -> result
  const [offerAmount, setOfferAmount] = useState(0);
  const [salaryOffer, setSalaryOffer] = useState(0);
  const [contractYears, setContractYears] = useState(4);
  const [clubResponse, setClubResponse] = useState(null);
  const [playerResponse, setPlayerResponse] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Datos del jugador y equipos
  const marketValue = calculateMarketValue(player);
  const currentSalary = player.salary || 50000;
  const personality = player.personality || assignPersonality(player);
  const personalityData = PLAYER_PERSONALITIES[personality];
  
  // Info de tiers
  const sellerTier = getClubTier(player.teamName);
  const buyerTier = getClubTier(myTeam?.name || '');
  const sellerTierData = getTierData(sellerTier);
  const buyerTierData = getTierData(buyerTier);
  
  // Dificultad del fichaje
  const difficulty = calculateTransferDifficulty(
    { ...player, personality },
    { name: player.teamName },
    { name: myTeam?.name || '' }
  );
  
  // Salario requerido estimado
  const requiredSalary = calculateRequiredSalary(
    { ...player, salary: currentSalary, personality },
    { name: player.teamName },
    { name: myTeam?.name || '' }
  );
  
  // Inicializar ofertas con valores por defecto
  useEffect(() => {
    setOfferAmount(Math.round(marketValue * 0.9));
    setSalaryOffer(Math.round(requiredSalary * 1.05));
  }, [marketValue, requiredSalary]);
  
  const canAffordTransfer = budget >= offerAmount;
  const weeklyWageBudget = (budget * 0.05) / 52; // ~5% del presupuesto anual
  const canAffordWages = salaryOffer <= weeklyWageBudget * 3;
  
  // Enviar oferta al club
  const handleClubOffer = () => {
    setIsProcessing(true);
    
    setTimeout(() => {
      const response = evaluateClubOffer(
        { amount: offerAmount },
        { ...player, role: { name: 'Titular' } },
        { name: player.teamName, id: player.teamId },
        { name: myTeam?.name, id: state.teamId }
      );
      
      setClubResponse(response);
      setIsProcessing(false);
      
      if (response.accepted) {
        setPhase('player');
      }
    }, 1500);
  };
  
  // Aceptar contraoferta del club
  const handleAcceptCounter = () => {
    setOfferAmount(clubResponse.counter);
    setClubResponse({ ...clubResponse, accepted: true });
    setPhase('player');
  };
  
  // Enviar oferta al jugador
  const handlePlayerOffer = () => {
    setIsProcessing(true);
    
    setTimeout(() => {
      const response = evaluatePlayerOffer(
        { salary: salaryOffer, contractYears },
        { ...player, personality, salary: currentSalary },
        { name: player.teamName },
        { name: myTeam?.name }
      );
      
      setPlayerResponse(response);
      setIsProcessing(false);
      setPhase('result');
      
      // Si acepta, completar el fichaje
      if (response.accepted) {
        completeTransfer();
      }
    }, 1500);
  };
  
  // Completar la transferencia
  const completeTransfer = () => {
    const newPlayer = {
      ...player,
      personality,
      salary: salaryOffer,
      contractYears,
      teamId: state.teamId
    };
    
    dispatch({ 
      type: 'SIGN_PLAYER', 
      payload: { 
        player: newPlayer, 
        fee: clubResponse?.accepted ? (clubResponse.finalPrice || offerAmount) : offerAmount 
      } 
    });
    
    // Actualizar leagueTeams
    const updatedLeagueTeams = (state.leagueTeams || []).map(t => {
      if (t.id === player.teamId) {
        return {
          ...t,
          players: (t.players || []).filter(p => p.name !== player.name),
          budget: (t.budget || 50_000_000) + offerAmount
        };
      }
      return t;
    });
    
    dispatch({ type: 'UPDATE_LEAGUE_TEAMS', payload: updatedLeagueTeams });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'transfer',
        title: '✅ Fichaje completado',
        content: `${player.name} es nuevo jugador del equipo. Traspaso: ${formatTransferPrice(offerAmount)}, Salario: ${formatTransferPrice(salaryOffer)}/sem`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };

  return (
    <div className="player-modal-overlay" onClick={onClose}>
      <div className="player-modal player-modal--negotiation" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        {/* HEADER CON INFO DEL JUGADOR */}
        <div className="modal-header">
          <div className="player-position" data-pos={player.position}>
            {player.position}
          </div>
          <div className="player-info">
            <h2>{player.name}</h2>
            <div className="team-tier">
              <Building2 size={14} />
              <span>{player.teamName}</span>
              <span className="tier-badge" style={{ background: `hsl(${sellerTier * 30 + 120}, 70%, 40%)` }}>
                {sellerTierData.name}
              </span>
            </div>
          </div>
          <div className="player-overall">{player.overall}</div>
        </div>

        {/* INDICADOR DE FASE */}
        <div className="negotiation-phases">
          <div className={`phase ${phase === 'info' ? 'active' : phase !== 'info' ? 'done' : ''}`}>
            <span className="phase-num">1</span>
            <span className="phase-label">Info</span>
          </div>
          <div className="phase-line"></div>
          <div className={`phase ${phase === 'club' ? 'active' : ['player', 'result'].includes(phase) ? 'done' : ''}`}>
            <span className="phase-num">2</span>
            <span className="phase-label">Club</span>
          </div>
          <div className="phase-line"></div>
          <div className={`phase ${phase === 'player' ? 'active' : phase === 'result' ? 'done' : ''}`}>
            <span className="phase-num">3</span>
            <span className="phase-label">Jugador</span>
          </div>
          <div className="phase-line"></div>
          <div className={`phase ${phase === 'result' ? 'active' : ''}`}>
            <span className="phase-num">4</span>
            <span className="phase-label">Resultado</span>
          </div>
        </div>

        {/* FASE 1: INFO */}
        {phase === 'info' && (
          <div className="phase-content phase-info">
            <div className="info-grid">
              <div className="info-card">
                <span className="label">Valor de mercado</span>
                <span className="value">{formatTransferPrice(marketValue)}</span>
              </div>
              <div className="info-card">
                <span className="label">Salario actual</span>
                <span className="value">{formatTransferPrice(currentSalary)}/sem</span>
              </div>
              <div className="info-card">
                <span className="label">Edad</span>
                <span className="value">{player.age} años</span>
              </div>
              <div className="info-card">
                <span className="label">Contrato</span>
                <span className="value">{player.contractYears || 2} años</span>
              </div>
            </div>
            
            {/* DIFICULTAD DEL FICHAJE */}
            <div className="difficulty-section">
              <h4><Target size={16} /> Dificultad del fichaje</h4>
              <div className="difficulty-bar">
                <div 
                  className="difficulty-fill" 
                  style={{ 
                    width: `${100 - difficulty.percentage}%`,
                    background: difficulty.color 
                  }}
                ></div>
              </div>
              <div className="difficulty-info">
                <span className="difficulty-label" style={{ color: difficulty.color }}>
                  {difficulty.difficulty}
                </span>
                <span className="difficulty-detail">
                  {difficulty.tierDiff > 0 
                    ? `⚠️ Bajas ${difficulty.tierDiff} nivel${difficulty.tierDiff > 1 ? 'es' : ''} de prestigio`
                    : difficulty.tierDiff < 0
                      ? `✓ Subes ${Math.abs(difficulty.tierDiff)} nivel${Math.abs(difficulty.tierDiff) > 1 ? 'es' : ''}`
                      : '○ Mismo nivel de prestigio'}
                </span>
              </div>
            </div>
            
            {/* PERSONALIDAD DEL JUGADOR */}
            <div className="personality-section">
              <h4><UserCheck size={16} /> Personalidad</h4>
              <div className="personality-card">
                <span className="personality-icon">{personalityData?.icon || '⚖️'}</span>
                <div className="personality-info">
                  <span className="personality-name">{personalityData?.name || 'Profesional'}</span>
                  <span className="personality-desc">{personalityData?.desc || 'Evalúa todo con equilibrio'}</span>
                </div>
              </div>
              {difficulty.tierDiff > 0 && personalityData?.name === 'Ambicioso' && (
                <div className="personality-warning">
                  ⚠️ Este jugador es ambicioso y no querrá dar un paso atrás en su carrera
                </div>
              )}
            </div>
            
            {/* COMPARACIÓN DE TIERS */}
            <div className="tier-comparison">
              <div className="tier-box seller">
                <Crown size={16} />
                <span className="tier-name">{sellerTierData.name}</span>
                <span className="team-name">{player.teamName}</span>
              </div>
              <div className="tier-arrow">
                <ArrowRight size={20} />
              </div>
              <div className="tier-box buyer">
                <Shield size={16} />
                <span className="tier-name">{buyerTierData.name}</span>
                <span className="team-name">{myTeam?.name || 'Tu equipo'}</span>
              </div>
            </div>
            
            {/* SALARIO ESTIMADO NECESARIO */}
            <div className="salary-estimate">
              <MessageSquare size={16} />
              <span>
                Salario mínimo estimado: <strong>{formatTransferPrice(requiredSalary)}/sem</strong>
                {difficulty.tierDiff > 0 && (
                  <span className="salary-note"> (+{Math.round((requiredSalary / currentSalary - 1) * 100)}% por bajar de nivel)</span>
                )}
              </span>
            </div>
            
            <button className="btn-next" onClick={() => setPhase('club')}>
              Iniciar negociación <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* FASE 2: OFERTA AL CLUB */}
        {phase === 'club' && (
          <div className="phase-content phase-club">
            <h3><Building2 size={20} /> Negociación con {player.teamName}</h3>
            
            {!clubResponse ? (
              <>
                <div className="offer-section">
                  <label>Oferta de traspaso</label>
                  <div className="offer-input-group">
                    <DollarSign size={18} />
                    <input
                      type="number"
                      value={offerAmount}
                      onChange={e => setOfferAmount(parseInt(e.target.value) || 0)}
                      step={500000}
                      min={0}
                    />
                  </div>
                  <div className="offer-reference">
                    <span>Valor de mercado: {formatTransferPrice(marketValue)}</span>
                    <span className={
                      offerAmount < marketValue * 0.7 ? 'low' : 
                      offerAmount > marketValue * 1.2 ? 'high' : 'fair'
                    }>
                      {offerAmount < marketValue * 0.7 
                        ? '⚠️ Muy baja - probable rechazo'
                        : offerAmount < marketValue * 0.9
                          ? '⚠️ Baja - posible contraoferta'
                          : offerAmount > marketValue * 1.2 
                            ? '💰 Generosa - alta aceptación'
                            : '✓ Razonable'}
                    </span>
                  </div>
                </div>
                
                {!canAffordTransfer && (
                  <div className="insufficient-funds">
                    <AlertCircle size={16} />
                    Presupuesto insuficiente ({formatTransferPrice(budget)} disponible)
                  </div>
                )}
                
                <div className="action-buttons">
                  <button className="btn-back" onClick={() => setPhase('info')}>
                    Volver
                  </button>
                  <button 
                    className="btn-send-offer"
                    onClick={handleClubOffer}
                    disabled={!canAffordTransfer || isProcessing}
                  >
                    {isProcessing ? 'Enviando...' : 'Enviar oferta al club'}
                  </button>
                </div>
              </>
            ) : (
              <div className="club-response">
                {clubResponse.accepted ? (
                  <div className="response-card success">
                    <ThumbsUp size={32} />
                    <h4>¡Club acepta!</h4>
                    <p>{clubResponse.reason}</p>
                    <p className="final-price">Precio acordado: {formatTransferPrice(clubResponse.finalPrice || offerAmount)}</p>
                  </div>
                ) : clubResponse.rejected ? (
                  <div className="response-card rejected">
                    <ThumbsDown size={32} />
                    <h4>Oferta rechazada</h4>
                    <p>{clubResponse.reason}</p>
                    <button className="btn-retry" onClick={() => setClubResponse(null)}>
                      Intentar con otra oferta
                    </button>
                  </div>
                ) : (
                  <div className="response-card counter">
                    <Handshake size={32} />
                    <h4>Contraoferta</h4>
                    <p>{clubResponse.reason}</p>
                    <p className="counter-amount">Piden: {formatTransferPrice(clubResponse.counter)}</p>
                    <div className="counter-actions">
                      <button className="btn-reject" onClick={() => setClubResponse(null)}>
                        Rechazar
                      </button>
                      <button 
                        className="btn-accept"
                        onClick={handleAcceptCounter}
                        disabled={budget < clubResponse.counter}
                      >
                        Aceptar contraoferta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* FASE 3: NEGOCIACIÓN CON JUGADOR */}
        {phase === 'player' && (
          <div className="phase-content phase-player">
            <h3><UserCheck size={20} /> Negociación con {player.name}</h3>
            
            <div className="player-negotiation-info">
              <div className="personality-reminder">
                <span className="icon">{personalityData?.icon}</span>
                <span>{personalityData?.name}: {personalityData?.desc}</span>
              </div>
            </div>
            
            <div className="offer-section">
              <label>Oferta salarial (semanal)</label>
              <div className="offer-input-group">
                <DollarSign size={18} />
                <input
                  type="number"
                  value={salaryOffer}
                  onChange={e => setSalaryOffer(parseInt(e.target.value) || 0)}
                  step={5000}
                  min={0}
                />
              </div>
              <div className="offer-reference">
                <span>Salario actual: {formatTransferPrice(currentSalary)}/sem</span>
                <span>Mínimo estimado: {formatTransferPrice(requiredSalary)}/sem</span>
                <span className={
                  salaryOffer < requiredSalary * 0.8 ? 'low' : 
                  salaryOffer > requiredSalary * 1.3 ? 'high' : 'fair'
                }>
                  {salaryOffer < requiredSalary * 0.8 
                    ? '⚠️ Insuficiente'
                    : salaryOffer < requiredSalary
                      ? '⚠️ Por debajo del mínimo'
                      : salaryOffer > requiredSalary * 1.3 
                        ? '💰 Muy generosa'
                        : '✓ Aceptable'}
                </span>
              </div>
            </div>
            
            <div className="offer-section contract-section">
              <label>Duración del contrato</label>
              <div className="contract-options">
                {[2, 3, 4, 5].map(years => (
                  <button 
                    key={years}
                    className={`contract-btn ${contractYears === years ? 'active' : ''}`}
                    onClick={() => setContractYears(years)}
                  >
                    {years} años
                  </button>
                ))}
              </div>
            </div>
            
            <div className="action-buttons">
              <button className="btn-back" onClick={() => {
                setPhase('club');
                setClubResponse(null);
              }}>
                Volver
              </button>
              <button 
                className="btn-send-offer"
                onClick={handlePlayerOffer}
                disabled={isProcessing}
              >
                {isProcessing ? 'Negociando...' : 'Presentar oferta al jugador'}
              </button>
            </div>
          </div>
        )}

        {/* FASE 4: RESULTADO */}
        {phase === 'result' && (
          <div className="phase-content phase-result">
            {playerResponse?.accepted ? (
              <div className="result-card success">
                <div className="result-icon">🎉</div>
                <h3>¡Fichaje completado!</h3>
                <p>{player.name} es nuevo jugador de {myTeam?.name}</p>
                <div className="transfer-summary">
                  <div className="summary-item">
                    <span className="label">Traspaso</span>
                    <span className="value">{formatTransferPrice(offerAmount)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Salario</span>
                    <span className="value">{formatTransferPrice(salaryOffer)}/sem</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Contrato</span>
                    <span className="value">{contractYears} años</span>
                  </div>
                </div>
                <button className="btn-close-success" onClick={onClose}>
                  <Check size={18} /> Cerrar
                </button>
              </div>
            ) : (
              <div className="result-card failed">
                <div className="result-icon">😔</div>
                <h3>Fichaje fallido</h3>
                <p>{playerResponse?.reason || 'El jugador ha rechazado la oferta'}</p>
                <div className="failure-details">
                  <span>Probabilidad de aceptación: {playerResponse?.probability || 0}%</span>
                  {playerResponse?.tierDiff > 0 && (
                    <span className="tier-warning">
                      ⚠️ El salto de {playerResponse.tierDiff} nivel(es) hacia abajo fue determinante
                    </span>
                  )}
                </div>
                <div className="action-buttons">
                  <button className="btn-back" onClick={() => setPhase('player')}>
                    Mejorar oferta
                  </button>
                  <button className="btn-close" onClick={onClose}>
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
