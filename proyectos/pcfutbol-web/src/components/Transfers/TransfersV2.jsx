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
  PLAYER_PERSONALITIES, assignPersonality, NEGOTIATION_STATES,
  createFreeAgentNegotiation, createPreContractNegotiation,
  sendFreeAgentOffer, processFreeAgentResponse
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
  const [activeTab, setActiveTab] = useState('explorar');
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
    // Jugadores de equipos
    (state.leagueTeams || []).forEach(team => {
      if (team.id !== state.teamId) {
        (team.players || []).forEach(p => {
          players.push({ ...p, teamName: team.name, teamId: team.id });
        });
      }
    });
    // Jugadores libres (sin equipo)
    (state.freeAgents || []).forEach(p => {
      players.push({ ...p, teamName: 'Libre', teamId: null, isFreeAgent: true });
    });
    return players;
  }, [state.leagueTeams, state.teamId, state.freeAgents]);
  
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
      if (filters.freeOnly && !p.isFreeAgent) return false;
      return true;
    }).sort((a, b) => b.overall - a.overall);
  }, [allPlayers, searchQuery, filters]);

  // Nivel de ojeador (desde facilities)
  const scoutingLevel = state.facilities?.scouting || 0;

  // Tabs del mercado
  const tabs = [
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

      {/* TICKER DE NOTICIAS - desactivado */}
      {/* <NewsTicker transfers={marketSummary.recentTransfers} /> */}

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
          <div className="filter-group">
            <label>
              <input 
                type="checkbox" 
                checked={filters.freeOnly || false}
                onChange={e => setFilters({...filters, freeOnly: e.target.checked})}
              />
              Solo jugadores libres
            </label>
          </div>
        </div>
      )}

      {/* Resultados */}
      <div className="players-grid">
        {players.slice(0, 50).map((player, i) => (
          <div 
            key={i} 
            className={`player-card ${player.isFreeAgent ? 'free-agent' : ''}`}
            onClick={() => onSelectPlayer(player)}
          >
            <div className="card-header">
              <span className="position" data-pos={player.position}>{player.position}</span>
              <span className="overall">{player.overall}</span>
            </div>
            <div className="card-body">
              <h4>{player.name}</h4>
              <p className="team">
                {player.isFreeAgent ? (
                  <span className="free-badge">LIBRE</span>
                ) : (
                  player.teamName
                )}
              </p>
              <div className="meta">
                <span>{player.age} años</span>
                <span className="value">{formatTransferPrice(player.value || player.marketValue || player.overall * 500000)}</span>
              </div>
              {!player.isFreeAgent && (player.contractYears || 0) <= 1 && (
                <span className="contract-expiring">Fin de contrato</span>
              )}
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
  
  const handleCounter = (offer) => {
    dispatch({ type: 'COUNTER_INCOMING_OFFER', payload: offer });
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
            <button className="btn-counter" onClick={() => handleCounter(offer)}>
              <ArrowLeftRight size={16} /> Pedir más
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
    dispatch({ type: 'ACCEPT_COUNTER_OFFER', payload: offer });
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
              <img 
                src={league.flagUrl} 
                alt={league.country} 
                className="league-flag-img"
              />
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
            <h3><img src={leagueInfo?.flagUrl} alt="" style={{ width: '24px', height: '16px', objectFit: 'cover', borderRadius: '2px', verticalAlign: 'middle' }} /> {leagueInfo?.name}</h3>
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
  
  const handleGenerateSuggestions = () => {
    setIsLoading(true);
    setTimeout(() => {
      const result = generateScoutingSuggestions(myTeam, leagueTeams, scoutingLevel, budget);
      setSuggestions(result);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="tab-ojeador">
      {/* Header con nivel */}
      <div className="ojeador-header">
        <div className="ojeador-level">
          <div className="level-icon">
            <Target size={24} />
          </div>
          <div className="level-info">
            <span className="level-name">{config.name}</span>
            <span className="level-desc">{config.description}</span>
          </div>
          <div className="level-badge">Nv. {scoutingLevel}</div>
        </div>
      </div>
      
      {/* Botón generar / refrescar */}
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
        ) : suggestions ? (
          <>
            <RefreshCw size={18} />
            Buscar nuevos jugadores
          </>
        ) : (
          <>
            <Search size={18} />
            Buscar jugadores
          </>
        )}
      </button>
      
      {/* Lista de sugerencias */}
      {suggestions && (
        <div className="suggestions-section">
          <div className="suggestions-header">
            <h4><Star size={16} /> {suggestions.suggestions.length} jugadores encontrados</h4>
          </div>
          
          <div className="suggestions-list">
            {suggestions.suggestions.map((player, i) => (
              <div 
                key={i}
                className="suggestion-card"
                onClick={() => onSelectPlayer(player)}
              >
                <div className="suggestion-pos" data-pos={player.position}>{player.position}</div>
                <div className="suggestion-main">
                  <span className="name">{player.name}</span>
                  <span className="meta">{player.teamName} · {player.age} años</span>
                </div>
                <div className="suggestion-stats">
                  <span className="overall">{player.overall}</span>
                  <span className="value">{formatTransferPrice(player.marketValue)}</span>
                </div>
                <div 
                  className="difficulty-indicator" 
                  style={{ background: player.difficulty?.color }}
                  title={player.difficulty?.difficulty}
                />
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
// MODAL: NEGOCIACIÓN DE FICHAJE - DISEÑO TODO EN UNO
// ============================================================
function PlayerModal({ player, onClose, budget, dispatch, myTeam }) {
  const { state } = useGame();
  const windowStatus = isTransferWindowOpen(state.currentWeek || 1);
  
  // Estados de negociación
  const [offerAmount, setOfferAmount] = useState(0);
  const [salaryOffer, setSalaryOffer] = useState(0);
  const [contractYears, setContractYears] = useState(4);
  const [clubStatus, setClubStatus] = useState('pending'); // pending, negotiating, accepted, rejected, counter
  const [playerStatus, setPlayerStatus] = useState('locked'); // locked, pending, negotiating, accepted, rejected
  const [clubCounter, setClubCounter] = useState(null);
  const [finalResult, setFinalResult] = useState(null); // null, 'success', 'failed'
  const [failReason, setFailReason] = useState('');
  const [signingBonus, setSigningBonus] = useState(0);
  const [usePreContract, setUsePreContract] = useState(false);
  
  // Datos del jugador
  const marketValue = calculateMarketValue(player);
  const currentSalary = player.salary || 50000;
  const personality = player.personality || assignPersonality(player);
  const personalityData = PLAYER_PERSONALITIES[personality];
  
  // Tipo de negociación
  const isFreeAgent = player.isFreeAgent || false;
  const canPreContract = !isFreeAgent && (player.contractYears || 2) <= 1;
  const negotiationType = isFreeAgent ? 'free_agent' : canPreContract ? 'pre_contract_available' : 'normal';
  
  // Tiers
  const sellerTier = getClubTier(player.teamName);
  const buyerTier = getClubTier(myTeam?.name || '');
  const tierDiff = sellerTier - buyerTier;
  const sellerTierData = getTierData(sellerTier);
  const buyerTierData = getTierData(buyerTier);
  
  // Dificultad
  const difficulty = calculateTransferDifficulty(
    { ...player, personality },
    { name: player.teamName },
    { name: myTeam?.name || '' }
  );
  
  // Salario requerido
  const requiredSalary = calculateRequiredSalary(
    { ...player, salary: currentSalary, personality },
    { name: player.teamName },
    { name: myTeam?.name || '' }
  );
  
  // Inicializar valores
  useEffect(() => {
    setOfferAmount(Math.round(marketValue * 0.95));
    setSalaryOffer(Math.round(requiredSalary * 1.1));
    setSigningBonus(isFreeAgent ? Math.round(marketValue * 0.15) : Math.round(marketValue * 0.1));
  }, [marketValue, requiredSalary, isFreeAgent]);
  
  // Calcular probabilidad del club en tiempo real
  const clubProbability = useMemo(() => {
    const ratio = offerAmount / marketValue;
    let prob = 20;
    if (ratio >= 1.2) prob = 95;
    else if (ratio >= 1.1) prob = 85;
    else if (ratio >= 1.0) prob = 70;
    else if (ratio >= 0.9) prob = 50;
    else if (ratio >= 0.8) prob = 30;
    else if (ratio >= 0.7) prob = 15;
    else prob = 5;
    
    // Ajustar por tier del vendedor
    if (sellerTier >= 3) prob -= 10;
    if (sellerTier >= 4) prob -= 10;
    
    return Math.max(5, Math.min(95, prob));
  }, [offerAmount, marketValue, sellerTier]);
  
  // Calcular probabilidad del jugador en tiempo real
  const playerProbability = useMemo(() => {
    const salaryRatio = salaryOffer / requiredSalary;
    let prob = 50; // Base same as evaluatePlayerOffer
    
    // Tier factor (mirrors real function)
    if (tierDiff > 0) {
      prob -= tierDiff * 15;
      const pd = personalityData;
      if (pd) prob += (pd.tierDownPenalty || 0) * 100;
    } else if (tierDiff < 0) {
      prob += Math.abs(tierDiff) * 10;
      const pd = personalityData;
      if (pd) prob += (pd.tierUpBonus || 0) * 100;
    }
    
    // Salary factor (mirrors real function)
    const moneyInfluence = personalityData?.moneyInfluence || 0.5;
    if (salaryRatio >= 1.5) {
      prob += 30 * moneyInfluence + 15;
    } else if (salaryRatio >= 1.2) {
      prob += 20 * moneyInfluence + 10;
    } else if (salaryRatio >= 1.0) {
      prob += 10 * moneyInfluence;
    } else if (salaryRatio >= 0.8) {
      prob -= 15;
    } else {
      prob -= 35;
    }
    
    // Age factor
    if (player.age >= 32) prob += 10;
    if (player.age <= 23) prob += 5;
    
    return Math.max(5, Math.min(95, Math.round(prob)));
  }, [salaryOffer, requiredSalary, tierDiff, personalityData, player.age]);
  
  // Probabilidad para agente libre / pre-contrato
  const freeAgentProbability = useMemo(() => {
    if (!isFreeAgent && !usePreContract) return 0;
    const freeAgentMultiplier = isFreeAgent ? 1.3 : 1.15;
    const expectedSalary = Math.round(requiredSalary * freeAgentMultiplier);
    const expectedBonus = Math.round(marketValue * (isFreeAgent ? 0.15 : 0.1));
    
    const salaryRatio = salaryOffer / expectedSalary;
    const bonusRatio = expectedBonus > 0 ? signingBonus / expectedBonus : 1;
    
    let prob = 50;
    if (salaryRatio >= 1.2) prob += 25;
    else if (salaryRatio >= 1.0) prob += 15;
    else if (salaryRatio >= 0.8) prob -= 10;
    else prob -= 30;
    
    if (bonusRatio >= 1.5) prob += 15;
    else if (bonusRatio >= 1.0) prob += 10;
    else if (bonusRatio >= 0.5) prob += 0;
    else prob -= 15;
    
    if (buyerTier >= 3) prob += 15;
    else if (buyerTier >= 2) prob += 5;
    else if (buyerTier <= 0) prob -= 15;
    
    return Math.max(5, Math.min(95, Math.round(prob)));
  }, [isFreeAgent, usePreContract, salaryOffer, requiredSalary, marketValue, signingBonus, buyerTier]);
  
  // Enviar oferta al club
  const handleClubOffer = () => {
    setClubStatus('negotiating');
    
    setTimeout(() => {
      const response = evaluateClubOffer(
        { amount: offerAmount },
        { ...player, role: { name: 'Titular' } },
        { name: player.teamName, id: player.teamId },
        { name: myTeam?.name, id: state.teamId }
      );
      
      if (response.accepted) {
        setClubStatus('accepted');
        setPlayerStatus('pending');
      } else if (response.rejected) {
        setClubStatus('rejected');
      } else {
        setClubStatus('counter');
        setClubCounter(response.counter);
      }
    }, 1200);
  };
  
  // Aceptar contraoferta
  const handleAcceptCounter = () => {
    setOfferAmount(clubCounter);
    setClubStatus('accepted');
    setPlayerStatus('pending');
    setClubCounter(null);
  };
  
  // Rechazar contraoferta (reintentar)
  const handleRejectCounter = () => {
    setClubStatus('pending');
    setClubCounter(null);
  };
  
  // Enviar oferta al jugador
  const handlePlayerOffer = () => {
    setPlayerStatus('negotiating');
    
    setTimeout(() => {
      const response = evaluatePlayerOffer(
        { salary: salaryOffer, contractYears },
        { ...player, personality, salary: currentSalary },
        { name: player.teamName },
        { name: myTeam?.name }
      );
      
      if (response.accepted) {
        setPlayerStatus('accepted');
        setFinalResult('success');
        completeTransfer();
      } else {
        setPlayerStatus('rejected');
        setFinalResult('failed');
        setFailReason(response.reason || 'El jugador rechazó la oferta');
      }
    }, 1200);
  };
  
  // Reintentar con jugador
  const handleRetryPlayer = () => {
    setPlayerStatus('pending');
    setFinalResult(null);
    setFailReason('');
  };
  
  // Oferta a jugador libre / pre-contrato
  const handleFreeAgentOffer = () => {
    setPlayerStatus('negotiating');
    
    setTimeout(() => {
      const player_data = { ...player, personality, salary: currentSalary };
      const buyerTierNum = buyerTier;
      const personalityInfo = PLAYER_PERSONALITIES[personality] || PLAYER_PERSONALITIES.professional;
      
      // Salario esperado (libres piden más)
      const freeAgentMultiplier = isFreeAgent ? 1.3 : 1.15;
      const expectedSalary = Math.round(requiredSalary * freeAgentMultiplier);
      const expectedBonus = Math.round(marketValue * (isFreeAgent ? 0.15 : 0.1));
      
      const salaryRatio = salaryOffer / expectedSalary;
      const bonusRatio = expectedBonus > 0 ? signingBonus / expectedBonus : 1;
      
      let probability = 0.5;
      if (salaryRatio >= 1.2) probability += 0.25;
      else if (salaryRatio >= 1.0) probability += 0.15;
      else if (salaryRatio >= 0.8) probability -= 0.1;
      else probability -= 0.3;
      
      if (bonusRatio >= 1.5) probability += 0.15;
      else if (bonusRatio >= 1.0) probability += 0.1;
      else if (bonusRatio >= 0.5) probability += 0;
      else probability -= 0.15;
      
      if (buyerTierNum >= 3) probability += 0.15;
      else if (buyerTierNum >= 2) probability += 0.05;
      else if (buyerTierNum <= 0) probability -= 0.15;
      
      probability += personalityInfo.moneyInfluence * (salaryRatio - 1) * 0.3;
      if (player.overall >= 85 && buyerTierNum < 3) probability -= 0.2;
      
      probability = Math.max(0.05, Math.min(0.95, probability));
      const accepted = Math.random() < probability;
      
      if (accepted) {
        setPlayerStatus('accepted');
        setFinalResult('success');
        completeFreeAgentTransfer();
      } else {
        setPlayerStatus('rejected');
        setFinalResult('failed');
        if (salaryRatio < 0.8) setFailReason('La oferta salarial es insuficiente');
        else if (bonusRatio < 0.5) setFailReason('Espera una prima de fichaje mayor');
        else if (buyerTierNum <= 1 && player.overall >= 80) setFailReason('No le convence el nivel del equipo');
        else setFailReason('No le convence la oferta global');
      }
    }, 1200);
  };
  
  // Completar fichaje de agente libre / pre-contrato
  const completeFreeAgentTransfer = () => {
    const newPlayer = {
      ...player,
      personality,
      salary: salaryOffer,
      contractYears,
      teamId: state.teamId,
      isFreeAgent: false
    };
    
    dispatch({ 
      type: 'SIGN_PLAYER', 
      payload: { player: newPlayer, fee: signingBonus } 
    });
    
    if (isFreeAgent) {
      dispatch({ type: 'REMOVE_FREE_AGENT', payload: { playerName: player.name } });
    }
    
    if (usePreContract && !isFreeAgent) {
      const updatedLeagueTeams = (state.leagueTeams || []).map(t => {
        if (t.id === player.teamId) {
          return {
            ...t,
            players: (t.players || []).filter(p => p.name !== player.name)
          };
        }
        return t;
      });
      dispatch({ type: 'UPDATE_LEAGUE_TEAMS', payload: updatedLeagueTeams });
    }
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'transfer',
        title: isFreeAgent ? '✅ Agente libre fichado' : '✅ Pre-contrato firmado',
        content: `${player.name} es nuevo jugador. Prima: ${formatTransferPrice(signingBonus)}, Salario: ${formatTransferPrice(salaryOffer)}/sem`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  // Completar transferencia
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
      payload: { player: newPlayer, fee: offerAmount } 
    });
    
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
        content: `${player.name} es nuevo jugador. Coste: ${formatTransferPrice(offerAmount)}, Salario: ${formatTransferPrice(salaryOffer)}/sem`,
        date: `Semana ${state.currentWeek}`
      }
    });
  };
  
  const canAfford = budget >= offerAmount;
  
  // Color de la barra de probabilidad
  const getProbColor = (prob) => {
    if (prob >= 70) return '#30d158';
    if (prob >= 50) return '#ffd60a';
    if (prob >= 30) return '#ff9f0a';
    return '#ff453a';
  };

  return (
    <div className="transfer-modal-overlay" onClick={onClose}>
      <div className="transfer-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        
        {/* RESULTADO FINAL */}
        {finalResult && (
          <div className={`final-result-overlay ${finalResult}`}>
            <div className="result-content">
              {finalResult === 'success' ? (
                <>
                  <div className="result-icon">🎉</div>
                  <h2>¡FICHAJE!</h2>
                  <p className="player-name">{player.name}</p>
                  <div className="result-details">
                    <span><DollarSign size={16} /> {(isFreeAgent || usePreContract) ? formatTransferPrice(signingBonus) : formatTransferPrice(offerAmount)}</span>
                    <span><Calendar size={16} /> {contractYears} años</span>
                    <span><TrendingUp size={16} /> {formatTransferPrice(salaryOffer)}/sem</span>
                  </div>
                  <button className="result-btn success" onClick={onClose}>
                    <Check size={18} /> Cerrar
                  </button>
                </>
              ) : (
                <>
                  <div className="result-icon">😔</div>
                  <h2>FICHAJE FALLIDO</h2>
                  <p className="fail-reason">{failReason}</p>
                  <div className="result-actions">
                    <button className="result-btn retry" onClick={handleRetryPlayer}>
                      <RefreshCw size={16} /> Mejorar oferta
                    </button>
                    <button className="result-btn close" onClick={onClose}>
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* LAYOUT PRINCIPAL */}
        <div className="modal-layout">
          {/* COLUMNA IZQUIERDA: INFO JUGADOR */}
          <div className="player-column">
            <div className="player-card">
              <div className="card-top">
                <span className="position-badge" data-pos={player.position}>{player.position}</span>
                <span className="overall-badge">{player.overall}</span>
              </div>
              <div className="player-avatar">
                <span className="avatar-letter">{player.name?.charAt(0)}</span>
              </div>
              <h3 className="player-name">{player.name}</h3>
              <div className="player-team">
                <Building2 size={14} />
                {isFreeAgent ? <span className="free-badge">AGENTE LIBRE</span> : player.teamName}
              </div>
              <div className="player-tier">
                <span className="tier-dot" style={{ background: `hsl(${sellerTier * 30 + 120}, 70%, 50%)` }}></span>
                {sellerTierData.name}
              </div>
            </div>
            
            <div className="player-stats">
              <div className="stat-row">
                <span className="stat-label">Edad</span>
                <span className="stat-value">{player.age} años</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Valor</span>
                <span className="stat-value">{formatTransferPrice(marketValue)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Salario</span>
                <span className="stat-value">{formatTransferPrice(currentSalary)}/sem</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Contrato</span>
                <span className="stat-value">{isFreeAgent ? 'Sin contrato' : `${player.contractYears || 2} años`}</span>
              </div>
            </div>
            
            <div className="player-personality">
              <span className="personality-icon">{personalityData?.icon || '⚖️'}</span>
              <div className="personality-text">
                <span className="personality-name">{personalityData?.name || 'Profesional'}</span>
                <span className="personality-desc">{personalityData?.desc}</span>
              </div>
            </div>
            
            {/* Indicador de dificultad */}
            <div className="difficulty-indicator">
              <div className="difficulty-header">
                <span>Dificultad</span>
                <span style={{ color: difficulty.color }}>{difficulty.difficulty}</span>
              </div>
              <div className="difficulty-bar-bg">
                <div 
                  className="difficulty-bar-fill" 
                  style={{ width: `${100 - difficulty.percentage}%`, background: difficulty.color }}
                ></div>
              </div>
              {tierDiff > 0 && (
                <span className="tier-warning">⚠️ Baja {tierDiff} nivel{tierDiff > 1 ? 'es' : ''}</span>
              )}
            </div>
          </div>
          
          {/* COLUMNA DERECHA: NEGOCIACIÓN */}
          <div className="negotiation-column">
            {/* OPCIÓN PRE-CONTRATO (si disponible) */}
            {canPreContract && !isFreeAgent && (
              <div className="pre-contract-toggle">
                <button 
                  className={`toggle-btn ${!usePreContract ? 'active' : ''}`}
                  onClick={() => setUsePreContract(false)}
                >
                  Traspaso normal
                </button>
                <button 
                  className={`toggle-btn ${usePreContract ? 'active' : ''}`}
                  onClick={() => { setUsePreContract(true); setClubStatus('pending'); setPlayerStatus('pending'); }}
                >
                  Pre-contrato (gratis)
                </button>
              </div>
            )}

            {/* FLUJO NORMAL: CLUB + JUGADOR */}
            {!isFreeAgent && !usePreContract && (
              <>
                {/* SECCIÓN CLUB */}
                <div className={`negotiation-section club-section ${clubStatus}`}>
                  <div className="section-header">
                    <div className="section-title">
                      <Building2 size={18} />
                      <span>Negociación con el Club</span>
                    </div>
                    <div className={`status-badge ${clubStatus}`}>
                      {clubStatus === 'pending' && '⏳ Pendiente'}
                      {clubStatus === 'negotiating' && '⏳ Negociando...'}
                      {clubStatus === 'accepted' && '✅ Aceptado'}
                      {clubStatus === 'rejected' && '❌ Rechazado'}
                      {clubStatus === 'counter' && '🔄 Contraoferta'}
                    </div>
                  </div>
                  
                  <div className="offer-row">
                    <label>Oferta de traspaso</label>
                    <div className="offer-input-wrapper">
                      <span className="currency">€</span>
                      <input
                        type="number"
                        value={offerAmount}
                        onChange={e => setOfferAmount(parseInt(e.target.value) || 0)}
                        disabled={clubStatus !== 'pending'}
                        step={500000}
                      />
                      <span className="unit">M</span>
                    </div>
                    <span className="formatted-amount">{formatTransferPrice(offerAmount)}</span>
                  </div>
                  
                  <div className="probability-row">
                    <span className="prob-label">Probabilidad de aceptación</span>
                    <div className="prob-bar-container">
                      <div 
                        className="prob-bar" 
                        style={{ width: `${clubProbability}%`, background: getProbColor(clubProbability) }}
                      ></div>
                    </div>
                    <span className="prob-value" style={{ color: getProbColor(clubProbability) }}>{clubProbability}%</span>
                  </div>
                  
                  {clubStatus === 'counter' && clubCounter && (
                    <div className="counter-offer-box">
                      <span className="counter-label">Contraoferta del club:</span>
                      <span className="counter-amount">{formatTransferPrice(clubCounter)}</span>
                      <div className="counter-actions">
                        <button className="btn-counter-reject" onClick={handleRejectCounter}>Rechazar</button>
                        <button 
                          className="btn-counter-accept" 
                          onClick={handleAcceptCounter}
                          disabled={budget < clubCounter}
                        >
                          Aceptar
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {clubStatus === 'rejected' && (
                    <div className="rejected-box">
                      <span>El club rechazó tu oferta. Prueba con una cantidad mayor.</span>
                      <button className="btn-retry-small" onClick={() => setClubStatus('pending')}>
                        Reintentar
                      </button>
                    </div>
                  )}
                  
                  {clubStatus === 'pending' && (
                    <button 
                      className="btn-send-club"
                      onClick={handleClubOffer}
                      disabled={!canAfford || !windowStatus.open}
                    >
                      {!windowStatus.open ? '🔒 Mercado cerrado' : !canAfford ? `Presupuesto insuficiente (${formatTransferPrice(budget)})` : 'Enviar oferta al club'}
                    </button>
                  )}
                  
                  {clubStatus === 'negotiating' && (
                    <div className="negotiating-indicator">
                      <RefreshCw size={18} className="spinning" />
                      <span>Esperando respuesta...</span>
                    </div>
                  )}
                </div>
                
                {/* SECCIÓN JUGADOR */}
                <div className={`negotiation-section player-section ${playerStatus}`}>
                  <div className="section-header">
                    <div className="section-title">
                      <UserCheck size={18} />
                      <span>Negociación con el Jugador</span>
                    </div>
                    <div className={`status-badge ${playerStatus}`}>
                      {playerStatus === 'locked' && '🔒 Bloqueado'}
                      {playerStatus === 'pending' && '⏳ Pendiente'}
                      {playerStatus === 'negotiating' && '⏳ Negociando...'}
                      {playerStatus === 'accepted' && '✅ Aceptado'}
                      {playerStatus === 'rejected' && '❌ Rechazado'}
                    </div>
                  </div>
                  
                  {playerStatus === 'locked' && (
                    <div className="locked-message">
                      <span>Primero debes llegar a un acuerdo con el club</span>
                    </div>
                  )}
                  
                  {playerStatus !== 'locked' && (
                    <>
                      <div className="offer-row">
                        <label>Salario semanal</label>
                        <div className="offer-input-wrapper">
                          <span className="currency">€</span>
                          <input
                            type="number"
                            value={salaryOffer}
                            onChange={e => setSalaryOffer(parseInt(e.target.value) || 0)}
                            disabled={playerStatus === 'negotiating' || playerStatus === 'accepted'}
                            step={5000}
                          />
                          <span className="unit">/sem</span>
                        </div>
                        <span className="formatted-amount">{formatTransferPrice(salaryOffer)}/sem</span>
                        <span className="salary-hint">
                          Mínimo estimado: {formatTransferPrice(requiredSalary)}/sem
                          {tierDiff > 0 && ` (+${Math.round((requiredSalary/currentSalary - 1) * 100)}%)`}
                        </span>
                      </div>
                      
                      <div className="contract-row">
                        <label>Duración contrato</label>
                        <div className="contract-buttons">
                          {[2, 3, 4, 5].map(y => (
                            <button
                              key={y}
                              className={`contract-btn ${contractYears === y ? 'active' : ''}`}
                              onClick={() => setContractYears(y)}
                              disabled={playerStatus === 'negotiating' || playerStatus === 'accepted'}
                            >
                              {y} años
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="probability-row">
                        <span className="prob-label">Probabilidad de aceptación</span>
                        <div className="prob-bar-container">
                          <div 
                            className="prob-bar" 
                            style={{ width: `${playerProbability}%`, background: getProbColor(playerProbability) }}
                          ></div>
                        </div>
                        <span className="prob-value" style={{ color: getProbColor(playerProbability) }}>{playerProbability}%</span>
                      </div>
                      
                      {playerStatus === 'pending' && (
                        <button className="btn-send-player" onClick={handlePlayerOffer}>
                          Presentar oferta al jugador
                        </button>
                      )}
                      
                      {playerStatus === 'negotiating' && (
                        <div className="negotiating-indicator">
                          <RefreshCw size={18} className="spinning" />
                          <span>El jugador evalúa tu oferta...</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {/* FLUJO LIBRE / PRE-CONTRATO */}
            {(isFreeAgent || usePreContract) && (
              <div className={`negotiation-section free-agent-section ${playerStatus}`}>
                <div className="section-header">
                  <div className="section-title">
                    <UserCheck size={18} />
                    <span>{isFreeAgent ? 'Negociación con Agente Libre' : 'Pre-contrato'}</span>
                  </div>
                  <div className={`status-badge ${playerStatus}`}>
                    {playerStatus === 'pending' && '⏳ Pendiente'}
                    {playerStatus === 'locked' && '⏳ Pendiente'}
                    {playerStatus === 'negotiating' && '⏳ Negociando...'}
                    {playerStatus === 'accepted' && '✅ Aceptado'}
                    {playerStatus === 'rejected' && '❌ Rechazado'}
                  </div>
                </div>
                
                {isFreeAgent && (
                  <div className="free-agent-info">
                    <span className="free-badge-large">AGENTE LIBRE</span>
                    <p>No hay que negociar con ningún club. Negocia directamente con el jugador ofreciendo una prima de fichaje y un salario.</p>
                  </div>
                )}
                
                {usePreContract && !isFreeAgent && (
                  <div className="free-agent-info pre-contract-info">
                    <span className="pre-contract-badge">PRE-CONTRATO</span>
                    <p>Su contrato expira pronto. Puedes negociar directamente con él sin pagar traspaso. Se unirá a tu equipo cuando finalice su contrato.</p>
                  </div>
                )}
                
                <div className="offer-row">
                  <label>Prima de fichaje</label>
                  <div className="offer-input-wrapper">
                    <span className="currency">€</span>
                    <input
                      type="number"
                      value={signingBonus}
                      onChange={e => setSigningBonus(parseInt(e.target.value) || 0)}
                      disabled={playerStatus === 'negotiating' || playerStatus === 'accepted'}
                      step={500000}
                    />
                  </div>
                  <span className="formatted-amount">{formatTransferPrice(signingBonus)}</span>
                  <span className="salary-hint">Sugerido: {formatTransferPrice(Math.round(marketValue * (isFreeAgent ? 0.15 : 0.1)))}</span>
                </div>
                
                <div className="offer-row">
                  <label>Salario semanal</label>
                  <div className="offer-input-wrapper">
                    <span className="currency">€</span>
                    <input
                      type="number"
                      value={salaryOffer}
                      onChange={e => setSalaryOffer(parseInt(e.target.value) || 0)}
                      disabled={playerStatus === 'negotiating' || playerStatus === 'accepted'}
                      step={5000}
                    />
                    <span className="unit">/sem</span>
                  </div>
                  <span className="formatted-amount">{formatTransferPrice(salaryOffer)}/sem</span>
                  <span className="salary-hint">
                    Mínimo estimado: {formatTransferPrice(Math.round(requiredSalary * (isFreeAgent ? 1.3 : 1.15)))}/sem
                  </span>
                </div>
                
                <div className="contract-row">
                  <label>Duración contrato</label>
                  <div className="contract-buttons">
                    {[2, 3, 4, 5].map(y => (
                      <button
                        key={y}
                        className={`contract-btn ${contractYears === y ? 'active' : ''}`}
                        onClick={() => setContractYears(y)}
                        disabled={playerStatus === 'negotiating' || playerStatus === 'accepted'}
                      >
                        {y} años
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="probability-row">
                  <span className="prob-label">Probabilidad de aceptación</span>
                  <div className="prob-bar-container">
                    <div 
                      className="prob-bar" 
                      style={{ width: `${freeAgentProbability}%`, background: getProbColor(freeAgentProbability) }}
                    ></div>
                  </div>
                  <span className="prob-value" style={{ color: getProbColor(freeAgentProbability) }}>{freeAgentProbability}%</span>
                </div>
                
                <div className="total-cost-row">
                  <span className="cost-label">Coste total</span>
                  <span className="cost-value">{formatTransferPrice(signingBonus)} + {formatTransferPrice(salaryOffer)}/sem × {contractYears} años</span>
                </div>
                
                {(playerStatus === 'pending' || playerStatus === 'locked') && (
                  <button 
                    className="btn-send-player"
                    onClick={handleFreeAgentOffer}
                    disabled={budget < signingBonus}
                  >
                    {budget < signingBonus ? `Presupuesto insuficiente (${formatTransferPrice(budget)})` : isFreeAgent ? 'Presentar oferta' : 'Ofrecer pre-contrato'}
                  </button>
                )}
                
                {playerStatus === 'negotiating' && (
                  <div className="negotiating-indicator">
                    <RefreshCw size={18} className="spinning" />
                    <span>El jugador evalúa tu oferta...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
