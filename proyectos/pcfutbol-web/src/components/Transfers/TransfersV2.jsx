import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  Search, Filter, TrendingUp, TrendingDown, Clock, AlertCircle,
  ChevronRight, X, Check, DollarSign, Calendar, MapPin, Star,
  Users, Newspaper, Target, Zap, ArrowRight, ArrowLeftRight,
  Building2, Briefcase, Bell, RefreshCw
} from 'lucide-react';
import { isTransferWindowOpen, formatTransferPrice } from '../../game/globalTransferEngine';
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

  // Tabs del mercado
  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: Newspaper },
    { id: 'buscar', label: 'Buscar', icon: Search },
    { id: 'recibidas', label: 'Ofertas Recibidas', icon: Bell, badge: state.incomingOffers?.length },
    { id: 'enviadas', label: 'Mis Ofertas', icon: Briefcase, badge: state.outgoingOffers?.length },
    { id: 'noticias', label: 'Noticias', icon: Zap },
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
        
        {activeTab === 'noticias' && (
          <NoticiasTab 
            transfers={marketSummary.recentTransfers}
            rumors={marketSummary.activeRumors}
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
// MODAL: DETALLE JUGADOR
// ============================================================
function PlayerModal({ player, onClose, budget, dispatch }) {
  const [offerAmount, setOfferAmount] = useState(player.value || player.overall * 500000);
  const estimatedValue = player.value || player.overall * 500000;
  const canAfford = budget >= offerAmount;

  const handleMakeOffer = () => {
    if (!canAfford) return;
    
    const newOffer = {
      id: `offer_${Date.now()}`,
      player: {
        name: player.name,
        position: player.position,
        overall: player.overall,
        age: player.age
      },
      toTeam: player.teamName,
      toTeamId: player.teamId,
      amount: offerAmount,
      status: 'pending',
      createdAt: Date.now()
    };
    
    dispatch({ type: 'ADD_OUTGOING_OFFER', payload: newOffer });
    
    // Simular respuesta de la IA después de 1 segundo
    setTimeout(() => {
      dispatch({ type: 'PROCESS_OUTGOING_OFFER', payload: newOffer });
    }, 1000);
    
    onClose();
  };

  return (
    <div className="player-modal-overlay" onClick={onClose}>
      <div className="player-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="player-position" data-pos={player.position}>
            {player.position}
          </div>
          <div className="player-info">
            <h2>{player.name}</h2>
            <p>{player.teamName}</p>
          </div>
          <div className="player-overall">{player.overall}</div>
        </div>

        <div className="modal-stats">
          <div className="stat">
            <span className="label">Edad</span>
            <span className="value">{player.age} años</span>
          </div>
          <div className="stat">
            <span className="label">Valor</span>
            <span className="value">{formatTransferPrice(estimatedValue)}</span>
          </div>
          <div className="stat">
            <span className="label">Salario</span>
            <span className="value">{formatTransferPrice(player.salary || 50000)}/sem</span>
          </div>
        </div>

        <div className="modal-offer">
          <h4>Hacer oferta</h4>
          <div className="offer-input">
            <DollarSign size={18} />
            <input
              type="number"
              value={offerAmount}
              onChange={e => setOfferAmount(parseInt(e.target.value) || 0)}
              step={100000}
            />
          </div>
          <div className="offer-comparison">
            <span className={offerAmount < estimatedValue * 0.8 ? 'low' : offerAmount > estimatedValue * 1.2 ? 'high' : 'fair'}>
              {offerAmount < estimatedValue * 0.8 
                ? '⚠️ Oferta baja - probable rechazo'
                : offerAmount > estimatedValue * 1.2 
                  ? '💰 Oferta generosa'
                  : '✓ Oferta razonable'}
            </span>
          </div>
          {!canAfford && (
            <div className="insufficient-funds">
              <AlertCircle size={16} />
              Presupuesto insuficiente
            </div>
          )}
          <button 
            className="btn-make-offer"
            onClick={handleMakeOffer}
            disabled={!canAfford}
          >
            <Check size={18} />
            Enviar Oferta
          </button>
        </div>
      </div>
    </div>
  );
}
