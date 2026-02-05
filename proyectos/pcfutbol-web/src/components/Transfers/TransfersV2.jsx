import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';

import { useGame } from '../../context/GameContext';
import { translatePosition } from '../../game/positionNames';
import CustomSelect from '../common/CustomSelect/CustomSelect';

import {

  Search, Filter, TrendingUp, TrendingDown, Clock, AlertCircle,

  ChevronRight, X, Check, DollarSign, Calendar, MapPin, Star,

  Users, Newspaper, Target, Zap, ArrowRight, ArrowLeftRight,

  Building2, Briefcase, Bell, RefreshCw, UserCheck, Handshake,

  ThumbsUp, ThumbsDown, MessageSquare, Crown, Shield,

  Ban, Sparkles, CheckCircle, XCircle, Lock, AlertTriangle,

  Trophy, Heart, Swords, ClipboardList, Globe, Home, Coins, Dumbbell, Scale, Trash2

} from 'lucide-react';



const PERSONALITY_ICONS = {

  ambitious: Trophy, mercenary: Coins, loyal: Heart, competitor: Swords,

  professional: ClipboardList, patriot: Globe, adventurous: Globe

};

const SPECIAL_GOAL_ICONS = {

  worldCup: Globe, breakThrough: Star, lastContract: Coins,

  returnHome: Home, winTitles: Trophy, proveWorth: Dumbbell

};

import { isTransferWindowOpen, formatTransferPrice, calculateMarketValue } from '../../game/globalTransferEngine';

import MoneyInput from './MoneyInput';

import {

  getClubTier, getTierData, calculateTransferDifficulty,

  calculateRequiredSalary, evaluateClubOffer, evaluatePlayerOffer,

  PLAYER_PERSONALITIES, assignPersonality, NEGOTIATION_STATES,

  createFreeAgentNegotiation, createPreContractNegotiation,

  sendFreeAgentOffer, processFreeAgentResponse,

  areRivals

} from '../../game/transferNegotiation';

import {

  SCOUTING_LEVELS, generateScoutingSuggestions, analyzeTeamNeeds,

  AVAILABLE_LEAGUES, getTeamsByLeague

} from '../../game/scoutingSystem';

import {

  generateLoanCandidates, evaluateLoanRequest, canLoanPlayer, calculateLoanFee, calculateLoanSalaryShare

} from '../../game/loanSystem';

import './TransfersV2.scss';



// ============================================================

// TRANSFERS V2 - Mercado de Fichajes Renovado

// ============================================================



export default function TransfersV2() {
  const { t } = useTranslation();
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

  const _fixturesArr = Array.isArray(state.fixtures) ? state.fixtures : [];

  const totalWeeks = _fixturesArr.length > 0

    ? Math.max(..._fixturesArr.map(f => f.week))

    : 38;

  const windowStatus = isTransferWindowOpen(state.currentWeek || 1, {

    preseasonPhase: state.preseasonPhase || false,

    totalWeeks

  });

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

          players.push({ ...p, teamName: team.name, teamId: team.id, leagueId: team.leagueId });

        });

      }

    });

    // Jugadores libres (sin equipo)

    (state.freeAgents || []).forEach(p => {

      players.push({ ...p, teamName: t('transfers.freeAgent'), teamId: null, isFreeAgent: true });

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

    { id: 'explorar', label: t('transfers.explore'), icon: Building2 },

    { id: 'ojeador', label: t('transfers.scout'), icon: Target },

    { id: 'buscar', label: t('transfers.search'), icon: Search },

    { id: 'recibidas', label: t('transfers.received'), icon: Bell, badge: (state.incomingOffers?.filter(o => o.status === 'pending')?.length || 0) + (state.incomingLoanOffers?.filter(o => o.status === 'pending')?.length || 0) || undefined },

    { id: 'enviadas', label: t('transfers.sent'), icon: Briefcase, badge: state.outgoingOffers?.filter(o => o.status === 'pending')?.length },

  ];



  return (

    <div className="transfers-v2">

      {/* HEADER */}

      <div className="transfers-header">

        <div className="header-left">

          <h1>{t('transfers.title')}</h1>

          <div className="window-status open">

            <Clock size={16} />

            <span>

              {state.preseasonPhase

                ? t('transfers.preseasonOpen')

                : t('transfers.matchdayOpen', { week: state.currentWeek })}

            </span>

          </div>

        </div>

        <div className="header-right">

          <div className="budget-display">

            <DollarSign size={18} />

            <span className="label">{t('common.budget')}</span>

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

            playerLeagueId={state.leagueId}

            onSelectPlayer={setSelectedPlayer}

            blockedPlayers={state.blockedPlayers || []}

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

            blockedPlayers={state.blockedPlayers || []}

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

            blockedPlayers={state.blockedPlayers || []}

          />

        )}



        {activeTab === 'recibidas' && (

          <OfertasRecibidasTab

            offers={state.incomingOffers || []}

            incomingLoanOffers={state.incomingLoanOffers || []}

            myPlayers={myPlayers}

            dispatch={dispatch}

            state={state}

          />

        )}



        {activeTab === 'enviadas' && (

          <MisOfertasTab

            offers={state.outgoingOffers || []}

            dispatch={dispatch}

            budget={state.money}

            activeLoans={state.activeLoans || []}

            teamId={state.teamId}

            state={state}

          />

        )}



      </div>



      {/* TICKER DE NOTICIAS - desactivado */}

      {/* <NewsTicker transfers={marketSummary.recentTransfers} /> */}



      {/* MODAL JUGADOR */}

      {selectedPlayer && (

        <PlayerModal

          player={selectedPlayer}

          onClose={(blockPlayer) => {

            // Si el fichaje falló, bloquear al jugador

            if (blockPlayer && selectedPlayer) {

              const playerId = selectedPlayer.id || selectedPlayer.name;

              dispatch({ type: 'BLOCK_PLAYER', payload: playerId });

            }

            setSelectedPlayer(null);

          }}

          budget={state.money}

          dispatch={dispatch}

          myTeam={myTeam}

          blockedPlayers={state.blockedPlayers || []}

          scoutingDiscount={[0, 10, 20, 30][state.facilities?.scouting || 0]}

        />

      )}

    </div>

  );

}



// ============================================================

// TAB: RESUMEN

// ============================================================

function ResumenTab({ windowStatus, summary, myTeam }) {
  const { t } = useTranslation();

  return (

    <div className="tab-resumen">

      {/* Estado del mercado */}

      <div className="market-status-card">

        <div className="status-icon">

          {windowStatus.open ? <Zap className="open" /> : <Clock className="closed" />}

        </div>

        <div className="status-info">

          <h3>{t('transfers.marketOpen')}</h3>

          <p>

            {state.preseasonPhase

              ? t('transfers.preseasonMsg')

              : t('transfers.marketAlwaysOpen')}

          </p>

        </div>

      </div>



      {/* Stats rápidos */}

      <div className="quick-stats">

        <div className="stat-card">

          <ArrowLeftRight size={24} />

          <div className="stat-value">{summary.totalTransfers || 0}</div>

          <div className="stat-label">{t('transfers.totalTransfers')}</div>

        </div>

        <div className="stat-card">

          <TrendingUp size={24} />

          <div className="stat-value">{formatTransferPrice(summary.totalSpent || 0)}</div>

          <div className="stat-label">{t('transfers.moneyMoved')}</div>

        </div>

        <div className="stat-card">

          <Newspaper size={24} />

          <div className="stat-value">{summary.activeRumors?.length || 0}</div>

          <div className="stat-label">{t('transfers.activeRumors')}</div>

        </div>

      </div>



      {/* Últimos fichajes */}

      <div className="section">

        <h3><TrendingUp size={18} /> {t('transfers.recentTransfers')}</h3>

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

              <p>{t('transfers.noRecentTransfers')}</p>

            </div>

          )}

        </div>

      </div>



      {/* Rumores */}

      <div className="section">

        <h3><Newspaper size={18} /> {t('transfers.marketRumors')}</h3>

        <div className="rumors-list">

          {(summary.activeRumors || []).slice(0, 5).map((r, i) => (

            <div key={i} className="rumor-item">

              <div className="rumor-text">{r.text}</div>

              <div className="rumor-reliability">

                <span className={`reliability ${r.reliability > 60 ? 'high' : r.reliability > 40 ? 'medium' : 'low'}`}>

                  {t('transfers.reliable', { pct: r.reliability })}

                </span>

              </div>

            </div>

          ))}

          {(!summary.activeRumors || summary.activeRumors.length === 0) && (

            <div className="empty-state">

              <p>{t('transfers.noActiveRumors')}</p>

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

function BuscarTab({ players, searchQuery, setSearchQuery, filters, setFilters, showFilters, setShowFilters, onSelectPlayer, budget, blockedPlayers = [] }) {
  const { t } = useTranslation();

  return (

    <div className="tab-buscar">

      {/* Barra de búsqueda */}

      <div className="search-bar">

        <div className="search-input-wrapper">

          <Search size={18} />

          <input

            type="text"

            placeholder={t('transfers.searchPlaceholder')}

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

          {t('transfers.filters')}

        </button>

      </div>



      {/* Filtros expandibles */}

      {showFilters && (

        <div className="filters-panel">

          <div className="filter-group">

            <label>{t('transfers.position')}</label>

            <CustomSelect
              compact
              value={filters.position}
              onChange={(val) => setFilters({...filters, position: val})}
              searchable={false}
              options={[
                { value: 'all', label: t('transfers.posAll') },
                { value: 'GK', label: t('transfers.posGK') },
                { value: 'DEF', label: t('transfers.posDEF') },
                { value: 'MID', label: t('transfers.posMID') },
                { value: 'FWD', label: t('transfers.posFWD') },
              ]}
            />

          </div>

          <div className="filter-group">

            <label>{t('transfers.ageRange', { min: filters.ageMin, max: filters.ageMax })}</label>

            <input

              type="range"

              min="16" max="40"

              value={filters.ageMax}

              onChange={e => setFilters({...filters, ageMax: parseInt(e.target.value)})}

            />

          </div>

          <div className="filter-group">

            <label>{t('transfers.minOVR', { ovr: filters.ovrMin })}</label>

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

              {t('transfers.freeAgentsOnly')}

            </label>

          </div>

        </div>

      )}



      {/* Resultados */}

      <div className="players-grid">

        {players.slice(0, 50).map((player, i) => {

          const playerId = player.id || player.name;

          const isBlocked = blockedPlayers.includes(playerId);

          return (

            <div

              key={i}

              className={`player-card ${player.isFreeAgent ? 'free-agent' : ''} ${isBlocked ? 'blocked' : ''}`}

              onClick={() => !isBlocked && onSelectPlayer(player)}

            >

              <div className="card-header">

                <span className="position" data-pos={player.position}>{translatePosition(player.position)}</span>

                <span className="overall">{player.overall}</span>

                {isBlocked && <span className="blocked-icon"><Ban size={14} /></span>}

              </div>

              <div className="card-body">

                <h4>{player.name}</h4>

                <p className="team">

                  {player.isFreeAgent ? (

                    <span className="free-badge">{t('transfers.free')}</span>

                  ) : (

                    player.teamName

                  )}

                </p>

                <div className="meta">

                  <span>{player.age} {t('transfers.years')}</span>

                  <span className="value">{formatTransferPrice(calculateMarketValue(player, player.leagueId))}</span>

                </div>

                {isBlocked && <span className="blocked-label">{t('transfers.blockedThisSeason')}</span>}

                {!isBlocked && !player.isFreeAgent && (player.contractYears || 0) <= 1 && (

                  <span className="contract-expiring">{t('transfers.contractExpiring')}</span>

                )}

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

}



// ============================================================

// TAB: OFERTAS RECIBIDAS

// ============================================================

function OfertasRecibidasTab({ offers, incomingLoanOffers = [], myPlayers, dispatch, state }) {
  const { t } = useTranslation();

  const pendingOffers = offers.filter(o => o.status === 'pending');

  const pastOffers = offers.filter(o => o.status !== 'pending');

  const pendingLoanOffers = incomingLoanOffers.filter(o => o.status === 'pending');



  const handleAccept = (offer) => {

    dispatch({ type: 'ACCEPT_INCOMING_OFFER', payload: offer });

  };



  const handleReject = (offer) => {

    dispatch({ type: 'REJECT_INCOMING_OFFER', payload: offer });

  };



  const handleCounter = (offer) => {

    dispatch({ type: 'COUNTER_INCOMING_OFFER', payload: offer });

  };



  const handleAcceptLoanOffer = (offer) => {

    const player = state?.team?.players?.find(p => p.name === offer.playerId);

    if (!player) return;

    const check = canLoanPlayer(player, state, 'out');

    if (!check.canLoan) {

      dispatch({

        type: 'ADD_MESSAGE',

        payload: {

          id: Date.now(), type: 'warning', title: t('transfers.cannotLoan'),

          content: check.errors.join('. '), date: `${t('transfers.weekShort', { week: state.currentWeek })}`

        }

      });

      return;

    }

    dispatch({ type: 'ACCEPT_LOAN_OFFER', payload: offer });

  };



  const handleRejectLoanOffer = (offer) => {

    dispatch({ type: 'REJECT_LOAN_OFFER', payload: offer });

  };



  if (pendingOffers.length === 0 && pastOffers.length === 0 && pendingLoanOffers.length === 0) {

    return (

      <div className="tab-ofertas empty">

        <Bell size={48} className="empty-icon" />

        <h3>{t('transfers.noOffersReceived')}</h3>

        <p>{t('transfers.noInterestYet')}</p>

      </div>

    );

  }



  return (

    <div className="tab-ofertas">

      {/* Ofertas de traspaso pendientes */}

      {pendingOffers.length > 0 && <h4 className="section-title">{t('transfers.pendingTransferOffers')}</h4>}

      {pendingOffers.map((offer, i) => (

        <div key={offer.id || i} className="offer-card incoming">

          <div className="offer-header">

            <div className="from-team">

              <Building2 size={20} />

              <span>{offer.fromTeam}</span>

            </div>

            <div className="offer-badges">

              <span className="offer-type-badge transfer">{t('transfers.transferBadge')}</span>

              <span className={`status ${offer.status}`}>{t('transfers.pending')}</span>

            </div>

          </div>

          <div className="offer-player">

            <span className="position">{offer.player?.position}</span>

            <span className="name">{offer.player?.name}</span>

            <span className="overall">{offer.player?.overall}</span>

          </div>

          <div className="offer-amount">

            <DollarSign size={18} />

            <span>{formatTransferPrice(offer.amount)}</span>

            {offer.expiryWeek && (

              <span className="expiry-tag">

                <Clock size={12} /> {t('transfers.expiresWeek', { week: offer.expiryWeek })}

                {state.currentWeek >= offer.expiryWeek - 1 && <span className="urgent"> ⚠️</span>}

              </span>

            )}

          </div>

          <div className="offer-actions">

            <button className="btn-accept" onClick={() => handleAccept(offer)}>

              <Check size={16} /> {t('transfers.accept')}

            </button>

            <button className="btn-counter" onClick={() => handleCounter(offer)}>

              <ArrowLeftRight size={16} /> {t('transfers.askMore')}

            </button>

            <button className="btn-reject" onClick={() => handleReject(offer)}>

              <X size={16} /> {t('transfers.reject')}

            </button>

          </div>

        </div>

      ))}



      {/* Ofertas de cesión pendientes */}

      {pendingLoanOffers.length > 0 && <h4 className="section-title">{t('transfers.pendingLoanOffers')}</h4>}

      {pendingLoanOffers.map((offer, i) => (

        <div key={offer.id || `loan_${i}`} className="offer-card incoming loan-offer">

          <div className="offer-header">

            <div className="from-team">

              <Handshake size={20} />

              <span>{offer.toTeamName}</span>

            </div>

            <div className="offer-badges">

              <span className="offer-type-badge loan">{t('transfers.loanBadge')}</span>

              <span className="status pending">{t('transfers.pending')}</span>

            </div>

          </div>

          <div className="offer-player">

            <span className="position">{offer.playerData?.position}</span>

            <span className="name">{offer.playerData?.name || offer.playerId}</span>

            <span className="overall">{offer.playerData?.overall}</span>

          </div>

          <div className="loan-offer-terms">

            <div className="loan-term">

              <span className="term-label">{t('transfers.loanFee')}</span>

              <span className="term-value">{formatTransferPrice(offer.loanFee)}</span>

            </div>

            <div className="loan-term">

              <span className="term-label">{t('transfers.receiverSalary')}</span>

              <span className="term-value">{Math.round(offer.salaryShare * 100)}%</span>

            </div>

            {offer.purchaseOption && (

              <div className="loan-term">

                <span className="term-label">{t('transfers.purchaseOption')}</span>

                <span className="term-value">{formatTransferPrice(offer.purchaseOption)}</span>

              </div>

            )}

          </div>

          <div className="offer-actions">

            <button className="btn-accept" onClick={() => handleAcceptLoanOffer(offer)}>

              <Check size={16} /> {t('transfers.accept')}

            </button>

            <button className="btn-reject" onClick={() => handleRejectLoanOffer(offer)}>

              <X size={16} /> {t('transfers.reject')}

            </button>

          </div>

        </div>

      ))}



      {pastOffers.length > 0 && <h4 className="section-title past">{t('transfers.history')}</h4>}

      {pastOffers.slice(0, 5).map((offer, i) => (

        <div key={offer.id || i} className={`offer-card incoming ${offer.status}`}>

          <div className="offer-header">

            <div className="from-team">

              <Building2 size={20} />

              <span>{offer.fromTeam}</span>

            </div>

            <span className={`status ${offer.status}`}>

              {offer.status === 'rejected' ? t('transfers.rejected') : offer.status}

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

function MisOfertasTab({ offers, dispatch, budget, activeLoans = [], teamId, state }) {
  const { t } = useTranslation();

  const handleAcceptCounter = (offer) => {

    dispatch({ type: 'ACCEPT_COUNTER_OFFER', payload: offer });

  };



  const handleWithdraw = (offer) => {

    dispatch({ type: 'REMOVE_OUTGOING_OFFER', payload: offer.id });

  };



  // Active loans - my players loaned out

  const myLoanedOut = activeLoans.filter(

    l => l.fromTeamId === teamId && l.status === 'active'

  );



  // Active loans - players I have on loan

  const myLoanedIn = activeLoans.filter(

    l => l.toTeamId === teamId && l.status === 'active'

  );



  const handleExercisePurchaseOption = (loan) => {

    if (!loan.purchaseOption || budget < loan.purchaseOption) {

      dispatch({

        type: 'ADD_MESSAGE',

        payload: {

          id: Date.now(), type: 'warning', title: t('transfers.cannotExecute'),

          content: loan.purchaseOption ? t('transfers.insufficientBudget') : t('transfers.noPurchaseOption'),

          date: `${t('transfers.weekShort', { week: state?.currentWeek })}`

        }

      });

      return;

    }

    dispatch({ type: 'EXERCISE_LOAN_PURCHASE', payload: { loanId: loan.id } });

  };



  if (offers.length === 0 && myLoanedOut.length === 0 && myLoanedIn.length === 0) {

    return (

      <div className="tab-ofertas empty">

        <Briefcase size={48} className="empty-icon" />

        <h3>{t('transfers.noSentOffers')}</h3>

        <p>{t('transfers.noSentOffersDesc')}</p>

      </div>

    );

  }



  // Ordenar: pendientes primero, luego resueltas (más recientes primero)
  const sortedOffers = [...offers].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return (b.submittedWeek || 0) - (a.submittedWeek || 0);
  });

  const hasResolved = offers.some(o => o.status === 'resolved');

  const handleClearResolved = () => {
    dispatch({ type: 'CLEAR_RESOLVED_OFFERS' });
  };

  return (

    <div className="tab-ofertas">

      {/* Transfer offers — dual response cards */}

      {offers.length > 0 && (
        <div className="section-title-row">
          <h4 className="section-title"><Target size={16} /> {t('transfers.transferOffers')}</h4>
          {hasResolved && (
            <button className="btn-clear-resolved" onClick={handleClearResolved}>
              <Trash2 size={14} /> {t('transfers.clear')}
            </button>
          )}
        </div>
      )}

      {sortedOffers.map((offer, i) => {

        const bothAccepted = offer.clubResponse === 'accepted' && offer.playerResponse === 'accepted';

        const hasCounter = offer.clubResponse === 'countered';

        const isPending = offer.status === 'pending';

        const isResolved = offer.status === 'resolved';



        return (

          <div key={offer.id || i} className={`offer-card-v2 ${isPending ? 'pending' : ''} ${bothAccepted ? 'success' : ''}`}>

            {/* Player header */}

            <div className="offer-v2-header">

              <span className="pos-badge" data-pos={offer.player?.position}>{translatePosition(offer.player?.position)}</span>

              <div className="offer-v2-info">

                <span className="name">{offer.player?.name || offer.playerName}</span>

                <span className="team">{offer.toTeam} · {offer.player?.age} {t('transfers.years')}</span>

              </div>

              <span className="ovr-badge">{offer.player?.overall}</span>

            </div>



            {/* Amounts */}

            <div className="offer-v2-amounts">

              <span><DollarSign size={14} /> {formatTransferPrice(offer.amount)}</span>

              <span><Users size={14} /> {formatTransferPrice((offer.salaryOffer || 0) * 52)}/{t('transfers.year')}</span>

              <span className="week-tag">{t('transfers.weekShort', { week: offer.submittedWeek || '?' })}</span>

            </div>



            {/* Pending state */}

            {isPending && (

              <div className="offer-v2-pending">

                <Clock size={16} />

                <span>{t('transfers.pendingResponse')}</span>

                <button className="btn-withdraw-small" onClick={() => handleWithdraw(offer)}>

                  <X size={14} /> {t('transfers.withdraw')}

                </button>

              </div>

            )}



            {/* Dual responses */}

            {isResolved && (

              <div className="offer-v2-responses">

                <div className={`response-row ${offer.clubResponse}`}>

                  <Building2 size={16} />

                  <span className="response-label">{t('transfers.club')}</span>

                  {offer.clubResponse === 'accepted' && <span className="response-result accepted"><CheckCircle size={14} /> {t('transfers.accepts')}</span>}

                  {offer.clubResponse === 'rejected' && <span className="response-result rejected"><XCircle size={14} /> {offer.clubReason}</span>}

                  {offer.clubResponse === 'countered' && <span className="response-result countered"><RefreshCw size={14} /> {offer.clubReason}</span>}

                </div>

                <div className={`response-row ${offer.playerResponse}`}>

                  <UserCheck size={16} />

                  <span className="response-label">{t('transfers.playerLabel')}</span>

                  {offer.playerResponse === 'accepted' && <span className="response-result accepted"><CheckCircle size={14} /> {t('transfers.accepts')}</span>}

                  {offer.playerResponse === 'rejected' && <span className="response-result rejected"><XCircle size={14} /> {offer.playerReason}</span>}

                </div>

              </div>

            )}



            {/* Result / Actions */}

            {bothAccepted && (

              <div className="offer-v2-result success">

                <Sparkles size={16} /> {t('transfers.transferCompleted')}

              </div>

            )}



            {hasCounter && offer.playerResponse === 'accepted' && (

              <div className="offer-v2-counter">

                <span>🔄 {t('transfers.clubAsks', { amount: formatTransferPrice(offer.clubCounterAmount) })}</span>

                <div className="counter-btns">

                  {budget >= (offer.clubCounterAmount || 0) && (

                    <button className="btn-accept-counter" onClick={() => handleAcceptCounter(offer)}>

                      <Check size={14} /> {t('transfers.acceptCounter')}

                    </button>

                  )}

                  <button className="btn-withdraw" onClick={() => handleWithdraw(offer)}>

                    <X size={14} /> {t('transfers.withdraw')}

                  </button>

                </div>

              </div>

            )}



            {hasCounter && offer.playerResponse === 'rejected' && (

              <div className="offer-v2-result failed">

                <XCircle size={16} /> {t('transfers.playerRejectedCantComplete')}

                <button className="btn-withdraw-small" onClick={() => handleWithdraw(offer)}>{t('transfers.deleteBtn')}</button>

              </div>

            )}



            {isResolved && !bothAccepted && !hasCounter && (

              <div className="offer-v2-result failed">

                <XCircle size={16} /> {t('transfers.offerRejected')}

                <button className="btn-withdraw-small" onClick={() => handleWithdraw(offer)}>{t('transfers.deleteBtn')}</button>

              </div>

            )}

          </div>

        );

      })}



      {/* Loaned out players */}

      {myLoanedOut.length > 0 && (

        <>

          <h4 className="section-title loan-section-title">

            <Handshake size={16} /> {t('transfers.loanedOutPlayers')}

          </h4>

          <div className="loan-active-list">

            {myLoanedOut.map(loan => (

              <div key={loan.id} className="loan-active-card loaned-out">

                <div className="la-header">

                  <span className="la-direction out">ðŸ"¤ {t('transfers.loanedOut')}</span>

                  <span className="la-weeks"><Clock size={14} /> {t('transfers.weeksShort', { weeks: loan.weeksRemaining })}</span>

                </div>

                <div className="la-player">

                  <span className="la-pos" data-pos={loan.playerData?.position}>{loan.playerData?.position || '?'}</span>

                  <div className="la-info">

                    <span className="la-name">{loan.playerData?.name || loan.playerId}</span>

                    <span className="la-team">ðŸ" {t('transfers.atTeam', { team: loan.toTeamName })}</span>

                  </div>

                  <span className="la-ovr">{loan.playerData?.overall || '?'}</span>

                </div>

                {loan.purchaseOption && (

                  <div className="la-purchase-info">

                    <Target size={14} />

                    <span>{t('transfers.purchaseOption')}: {formatTransferPrice(loan.purchaseOption)}</span>

                  </div>

                )}

              </div>

            ))}

          </div>

        </>

      )}



      {/* Loaned in players */}

      {myLoanedIn.length > 0 && (

        <>

          <h4 className="section-title loan-section-title">

            <Handshake size={16} /> {t('transfers.loanedInPlayers')}

          </h4>

          <div className="loan-active-list">

            {myLoanedIn.map(loan => (

              <div key={loan.id} className="loan-active-card loaned-in">

                <div className="la-header">

                  <span className="la-direction in">📥 {t('transfers.onLoan')}</span>

                  <span className="la-weeks"><Clock size={14} /> {t('transfers.weeksShort', { weeks: loan.weeksRemaining })}</span>

                </div>

                <div className="la-player">

                  <span className="la-pos" data-pos={loan.playerData?.position}>{loan.playerData?.position || '?'}</span>

                  <div className="la-info">

                    <span className="la-name">{loan.playerData?.name || loan.playerId}</span>

                    <span className="la-team">ðŸ  {t('transfers.ownedBy', { team: loan.fromTeamName })}</span>

                  </div>

                  <span className="la-ovr">{loan.playerData?.overall || '?'}</span>

                </div>

                {loan.purchaseOption && (

                  <div className="la-purchase-action">

                    <div className="la-purchase-info">

                      <Target size={14} />

                      <span>{t('transfers.purchaseOptionAmount', { amount: formatTransferPrice(loan.purchaseOption) })}</span>

                    </div>

                    <button

                      className="la-purchase-btn"

                      onClick={() => handleExercisePurchaseOption(loan)}

                      disabled={budget < loan.purchaseOption}

                    >

                      <DollarSign size={14} /> {t('transfers.buyAmount', { amount: formatTransferPrice(loan.purchaseOption) })}

                    </button>

                  </div>

                )}

              </div>

            ))}

          </div>

        </>

      )}

    </div>

  );

}



// ============================================================

// TAB: NOTICIAS

// ============================================================

function NoticiasTab({ transfers, rumors }) {
  const { t } = useTranslation();

  const allNews = [

    ...(transfers || []).map(tr => ({

      type: 'transfer',

      text: t('transfers.newsTransferText', { player: tr.player?.name, to: tr.to?.name, from: tr.from?.name, price: formatTransferPrice(tr.price) }),

      time: tr.date,

      icon: 'transfer'

    })),

    ...(rumors || []).map(r => ({

      type: 'rumor',

      text: r.text,

      time: r.createdAt,

      reliability: r.reliability,

      icon: 'rumor'

    }))

  ].sort((a, b) => new Date(b.time) - new Date(a.time));



  return (

    <div className="tab-noticias">

      <h3><Zap size={20} /> {t('transfers.newsFeed')}</h3>

      <div className="news-feed">

        {allNews.map((news, i) => (

          <div key={i} className={`news-item ${news.type}`}>

            <span className="news-icon">{news.icon === 'transfer' ? <CheckCircle size={14} /> : <Newspaper size={14} />}</span>

            <div className="news-content">

              <p>{news.text}</p>

              {news.reliability && (

                <span className="reliability">{t('transfers.reliable', { pct: news.reliability })}</span>

              )}

            </div>

          </div>

        ))}

        {allNews.length === 0 && (

          <div className="empty-state">

            <p>{t('transfers.noRecentNews')}</p>

          </div>

        )}

      </div>

    </div>

  );

}



// ============================================================

// TAB: EXPLORAR LIGAS Y EQUIPOS

// ============================================================



// Países por continente para detectar zona

const SA_COUNTRIES = new Set(['Argentina', 'Brasil', 'Colombia', 'Chile', 'Uruguay', 'Ecuador', 'Paraguay', 'Perú', 'Bolivia', 'Venezuela']);

const WORLD_COUNTRIES = new Set(['Estados Unidos', 'Arabia Saudí', 'México', 'Japón']);

function getContinent(country) {

  if (SA_COUNTRIES.has(country)) return 'sa';

  if (WORLD_COUNTRIES.has(country)) return 'world';

  return 'eu';

}



// Agrupar ligas por país para la vista de exploración

const LEAGUE_GROUPS = (() => {

  const groups = {};

  AVAILABLE_LEAGUES.forEach(l => {

    if (!groups[l.country]) groups[l.country] = { country: l.country, flagUrl: l.flagUrl, leagues: [], continent: getContinent(l.country) };

    groups[l.country].leagues.push(l);

  });

  return Object.values(groups);

})();



function ExplorarTab({ leagueTeams, myTeamId, playerLeagueId, onSelectPlayer, blockedPlayers = [] }) {
  const { t } = useTranslation();

  const [selectedLeague, setSelectedLeague] = useState(null);

  const [selectedTeam, setSelectedTeam] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [continent, setContinent] = useState('eu');

  

  const teams = useMemo(() => getTeamsByLeague(leagueTeams, selectedLeague), [leagueTeams, selectedLeague]);

  

  const filteredTeams = useMemo(() => {

    if (!searchQuery) return teams;

    return teams.filter(t => t.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  }, [teams, searchQuery]);



  const filteredGroups = useMemo(() => LEAGUE_GROUPS.filter(g => g.continent === continent), [continent]);



  // Vista de ligas â€" grid compacto por continente

  if (!selectedLeague) {

    return (

      <div className="tab-explorar">

        <div className="explorar-continent-tabs">

          <button className={`continent-tab ${continent === 'eu' ? 'active' : ''}`} onClick={() => setContinent('eu')}>

            <span>🌍</span> {t('transfers.europe')}

          </button>

          <button className={`continent-tab ${continent === 'sa' ? 'active' : ''}`} onClick={() => setContinent('sa')}>

            <span>🌎</span> {t('transfers.southAmerica')}

          </button>

          <button className={`continent-tab ${continent === 'world' ? 'active' : ''}`} onClick={() => setContinent('world')}>

            <span>🌏</span> {t('transfers.restOfWorld')}

          </button>

        </div>

        <div className="explorar-country-grid">

          {filteredGroups.map(group => {

            const totalTeams = group.leagues.reduce((sum, l) => sum + (leagueTeams || []).filter(t => t.leagueId === l.id).length, 0);

            return (

              <div key={group.country} className="explorar-country-card">

                <div className="country-card-header">

                  <img src={group.flagUrl} alt={group.country} className="country-card-flag" />

                  <div className="country-card-info">

                    <span className="country-card-name">{group.country}</span>

                    <span className="country-card-meta">{t('transfers.leaguesMeta', { count: group.leagues.length, plural: group.leagues.length > 1 ? 's' : '', teams: totalTeams })}</span>

                  </div>

                </div>

                <div className="country-card-leagues">

                  {group.leagues.map(league => {

                    const count = (leagueTeams || []).filter(t => t.leagueId === league.id).length;

                    return (

                      <button

                        key={league.id}

                        className="country-card-league"

                        onClick={() => { setSelectedLeague(league.id); setSearchQuery(''); }}

                      >

                        <span className="league-name">{league.name}</span>

                        <span className="league-count">{count}</span>

                      </button>

                    );

                  })}

                </div>

              </div>

            );

          })}

        </div>

      </div>

    );

  }



  // Vista de equipos

  const leagueInfo = AVAILABLE_LEAGUES.find(l => l.id === selectedLeague);



  if (!selectedTeam) {

    return (

      <div className="tab-explorar">

        <div className="explorar-header with-back">

          <button className="back-btn" onClick={() => { setSelectedLeague(null); setSearchQuery(''); }}>

            <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />

          </button>

          <div className="header-info">

            <h3>

              <img src={leagueInfo?.flagUrl} alt="" className="header-flag" />

              {leagueInfo?.name}

            </h3>

            <p>{t('transfers.nTeams', { count: teams.length })}</p>

          </div>

        </div>



        {/* Buscador de equipos */}

        {teams.length > 8 && (

          <div className="explorar-search">

            <Search size={16} />

            <input

              type="text"

              placeholder={t('transfers.searchTeamPlaceholder')}

              value={searchQuery}

              onChange={e => setSearchQuery(e.target.value)}

            />

            {searchQuery && (

              <button className="clear-btn" onClick={() => setSearchQuery('')}><X size={14} /></button>

            )}

          </div>

        )}



        <div className="teams-compact-grid">

          {filteredTeams.map(team => {

            const isMine = team.id === myTeamId;

            return (

              <div

                key={team.id}

                className={`team-compact ${isMine ? 'my-team' : ''}`}

                onClick={() => !isMine && setSelectedTeam(team)}

              >

                <div className="tc-badge" style={{ background: team.colors?.primary || `hsl(${(team.name?.charCodeAt(0) || 0) * 7 % 360}, 50%, 35%)` }}>

                  {team.shortName?.slice(0, 3) || team.name?.slice(0, 3)}

                </div>

                <div className="tc-info">

                  <span className="tc-name">{team.name}</span>

                  <span className="tc-meta">

                    <Users size={11} /> {team.players?.length || 0}

                    <Star size={11} /> {team.avgOverall}

                  </span>

                </div>

                {isMine && <span className="tc-mine">{t('transfers.yourTeam')}</span>}

              </div>

            );

          })}

        </div>

      </div>

    );

  }



  // Vista de plantilla del equipo â€" con navegación lateral de equipos

  return (

    <div className="tab-explorar">

      <div className="explorar-header with-back">

        <button className="back-btn" onClick={() => { setSelectedTeam(null); }}>

          <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />

        </button>

        <div className="header-info">

          <h3>

            <img src={leagueInfo?.flagUrl} alt="" className="header-flag" />

            {selectedTeam.name}

          </h3>

          <p>{t('transfers.playersAvgOvr', { count: selectedTeam.players?.length || 0, avg: selectedTeam.avgOverall || '??' })}</p>

        </div>

      </div>



      {/* Tabs de equipos (navegación rápida) */}

      <div className="teams-tabs">

        {teams.map(team => (

          <button

            key={team.id}

            className={`team-tab ${team.id === selectedTeam.id ? 'active' : ''} ${team.id === myTeamId ? 'my-team' : ''}`}

            onClick={() => team.id !== myTeamId && setSelectedTeam(team)}

            disabled={team.id === myTeamId}

          >

            <span className="tab-name">{team.shortName || team.name?.split(' ').pop()}</span>

            <span className="tab-ovr">{team.avgOverall}</span>

          </button>

        ))}

      </div>



      {/* Cabecera de la tabla */}

      <div className="squad-table-header">

        <span className="col-pos">{t('transfers.posHeader')}</span>

        <span className="col-name">{t('transfers.playerHeader')}</span>

        <span className="col-age">{t('transfers.age').toUpperCase()}</span>

        <span className="col-ovr">{t('transfers.ovrHeader')}</span>

        <span className="col-value">{t('transfers.playerValue').toUpperCase()}</span>

      </div>



      <div className="squad-list">

        {(selectedTeam.players || [])

          .sort((a, b) => b.overall - a.overall)

          .map((player, i) => {

            const playerId = player.id || player.name;

            const isBlocked = blockedPlayers.includes(playerId);

            return (

              <div

                key={i}

                className={`squad-player ${isBlocked ? 'blocked' : ''}`}

                onClick={() => !isBlocked && onSelectPlayer({ ...player, teamName: selectedTeam.name, teamId: selectedTeam.id })}

              >

                <span className="player-pos" data-pos={player.position}>{translatePosition(player.position)}</span>

                <span className="player-name">{player.name}</span>

                <span className="player-age">{player.age}</span>

                <span className="player-ovr">{player.overall}</span>

                <span className="player-value">{formatTransferPrice(calculateMarketValue(player, selectedLeague))}</span>

                {isBlocked && <span className="blocked-badge"><Ban size={14} /></span>}

              </div>

            );

          })}

      </div>

    </div>

  );

}



// ============================================================

// TAB: OJEADOR (SCOUTING)

// ============================================================

function OjeadorTab({ myTeam, leagueTeams, scoutingLevel, budget, onSelectPlayer, facilities, dispatch, blockedPlayers = [] }) {
  const { t } = useTranslation();

  const [suggestions, setSuggestions] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  const [selectedPosition, setSelectedPosition] = useState(null);



  const config = SCOUTING_LEVELS[scoutingLevel] || SCOUTING_LEVELS[0];



  const POSITION_CHIPS = [
    { en: 'GK', es: 'POR' },
    { en: 'CB', es: 'DFC' },
    { en: 'LB', es: 'LI' },
    { en: 'RB', es: 'LD' },
    { en: 'LWB', es: 'CRI' },
    { en: 'RWB', es: 'CRD' },
    { en: 'CDM', es: 'MCD' },
    { en: 'CM', es: 'MC' },
    { en: 'CAM', es: 'MCO' },
    { en: 'LM', es: 'MI' },
    { en: 'RM', es: 'MD' },
    { en: 'LW', es: 'EI' },
    { en: 'RW', es: 'ED' },
    { en: 'ST', es: 'DC' },
    { en: 'CF', es: 'SD' },
  ];

  const handleGenerateSuggestions = () => {

    setIsLoading(true);

    setTimeout(() => {

      const result = generateScoutingSuggestions(myTeam, leagueTeams, scoutingLevel, budget, selectedPosition);

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

          <div className="level-badge">{t('transfers.level')} {scoutingLevel}</div>

        </div>

      </div>



      {/* Selector de posición */}

      <div className="position-selector">

        <span className="position-selector__label">{t('transfers.positionToSearch')}:</span>

        <div className="position-selector__chips">

          {POSITION_CHIPS.map(pos => (

            <button

              key={pos.en}

              className={`pos-chip ${selectedPosition === pos.en ? 'pos-chip--active' : ''}`}

              onClick={() => setSelectedPosition(selectedPosition === pos.en ? null : pos.en)}

            >

              {pos.es}

            </button>

          ))}

        </div>

      </div>



      {/* Botón buscar */}

      <button

        className="generate-btn"

        onClick={handleGenerateSuggestions}

        disabled={isLoading}

      >

        {isLoading ? (

          <>

            <RefreshCw size={18} className="spinning" />

            {t('transfers.analyzingMarket')}

          </>

        ) : (

          <>

            <Search size={18} />

            {selectedPosition ? t('transfers.searchSpecific', { pos: POSITION_CHIPS.find(p => p.en === selectedPosition)?.es || '' }) : t('transfers.searchPlayers')}

          </>

        )}

      </button>



      {/* Lista de sugerencias */}

      {suggestions && (

        <div className="suggestions-section">

          <div className="suggestions-header">

            <h4><Star size={16} /> {t('transfers.playersFound', { count: suggestions.suggestions.length })}</h4>

          </div>



          <div className="suggestions-list">

            {suggestions.suggestions.map((player, i) => {

              const playerId = player.id || player.name;

              const isBlocked = blockedPlayers.includes(playerId);

              return (

                <div

                  key={i}

                  className={`suggestion-card ${isBlocked ? 'blocked' : ''}`}

                  onClick={() => !isBlocked && onSelectPlayer(player)}

                >

                  <div className="suggestion-pos" data-pos={player.position}>{translatePosition(player.position)}</div>

                  <div className="suggestion-main">

                    <span className="name">{player.name}</span>

                    <span className="meta">{player.teamName} · {player.age} {t('transfers.years')}</span>

                  </div>

                  <div className="suggestion-stats">

                    <span className="overall">{player.overall}</span>

                    <span className="value">{isBlocked ? <Ban size={14} /> : formatTransferPrice(player.marketValue)}</span>

                  </div>

                  {!isBlocked && (

                    <div

                      className="difficulty-indicator"

                      style={{ background: player.difficulty?.color }}

                      title={player.difficulty?.difficulty}

                    />

                  )}

                </div>

              );

            })}

          </div>

        </div>

      )}

    </div>

  );

}



// CesionesTab removed â€" loan functionality merged into Recibidas, Enviadas, and PlayerModal

// ============================================================

// TICKER DE NOTICIAS (Banner inferior)

// ============================================================

function NewsTicker({ transfers }) {
  const { t } = useTranslation();

  const tickerItems = (transfers || []).slice(0, 10).map(t =>

    `${t.player?.name} â†' ${t.to?.name} (${formatTransferPrice(t.price)})`

  );



  if (tickerItems.length === 0) {

    tickerItems.push(t('transfers.tickerMsg'));

  }



  return (

    <div className="news-ticker">

      <div className="ticker-label">

        <Zap size={14} />

        {t('transfers.breakingNews')}

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

// MODAL: NEGOCIACIÑ"N DE FICHAJE - DISEÑ'O TODO EN UNO

// ============================================================

function PlayerModal({ player, onClose, budget, dispatch, myTeam, blockedPlayers = [], scoutingDiscount = 0 }) {
  const { t } = useTranslation();

  const { state } = useGame();

  const _fixArr2 = Array.isArray(state.fixtures) ? state.fixtures : [];

  const totalWeeksModal = _fixArr2.length > 0

    ? Math.max(..._fixArr2.map(f => f.week))

    : 38;

  const windowStatus = isTransferWindowOpen(state.currentWeek || 1, {

    preseasonPhase: state.preseasonPhase || false,

    totalWeeks: totalWeeksModal

  });



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

  const [negotiationMode, setNegotiationMode] = useState('transfer'); // 'transfer', 'loan', 'precontract'

  const [playerCounter, setPlayerCounter] = useState(null);

  const [isRivalry, setIsRivalry] = useState(false);



  // Loan form state

  const [loanFee, setLoanFee] = useState(0);

  const [loanSalaryShare, setLoanSalaryShare] = useState(50);

  const [loanPurchaseOption, setLoanPurchaseOption] = useState(0);

  const [loanHasPurchaseOption, setLoanHasPurchaseOption] = useState(true);



  // Datos del jugador

  const marketValue = calculateMarketValue(player, player.leagueId || state.leagueId);

  const currentSalary = player.salary || 50000;



  // Personalidad memoizada â€" assignPersonality ahora es determinista (seeded por nombre)

  // pero useMemo evita recalcular en cada render igualmente

  const personality = useMemo(() => {

    return player.personality || assignPersonality(player);

  }, [player.name, player.personality, player.overall, player.age]);

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



  // Dificultad memoizada

  const difficulty = useMemo(() => calculateTransferDifficulty(

    { ...player, personality },

    { name: player.teamName },

    { name: myTeam?.name || '' }

  ), [player.name, player.overall, personality, player.teamName, myTeam?.name]);



  // Salario requerido memoizado

  const requiredSalary = useMemo(() => calculateRequiredSalary(

    { ...player, salary: currentSalary, personality },

    { name: player.teamName },

    { name: myTeam?.name || '' }

  ), [player.name, currentSalary, personality, player.teamName, myTeam?.name]);



  // Descuento del ojeador aplicado al valor de mercado

  const discountFactor = 1 - (scoutingDiscount / 100);

  const effectiveMarketValue = Math.round(marketValue * discountFactor);



  // Redondear a 0.1M (100K)

  const roundTo50K = (val) => Math.round(val / 50000) * 50000;
  const roundTo100K = (val) => Math.round(val / 100000) * 100000;



  // Inicializar valores (con descuento de ojeador)

  useEffect(() => {

    setOfferAmount(roundTo100K(effectiveMarketValue * 0.95));

    setSalaryOffer(roundTo100K(Math.max(requiredSalary * 1.1, 100000)));

    setSigningBonus(roundTo100K(isFreeAgent ? effectiveMarketValue * 0.15 : effectiveMarketValue * 0.1));

    // Initialize loan values

    if (!isFreeAgent) {

      const defaultLoanFee = calculateLoanFee(player, state.leagueId);

      setLoanFee(defaultLoanFee);

      const defaultShare = calculateLoanSalaryShare(player, { name: buyerTierData?.name || 'Mid Table' });

      setLoanSalaryShare(Math.round(defaultShare * 100));

      setLoanPurchaseOption(roundTo100K(effectiveMarketValue * 0.9));

      setLoanHasPurchaseOption(true);

    }

  }, [effectiveMarketValue, requiredSalary, isFreeAgent]);



  // Initialize rivalry state

  useEffect(() => {

    if (!isFreeAgent) {

      setIsRivalry(areRivals(player.teamName, myTeam?.name));

    }

  }, [player.teamName, myTeam?.name, isFreeAgent]);



  // Derived negotiation values



  // Calcular probabilidad del club en tiempo real (mismo cálculo que evaluateClubOffer)

  const clubProbability = useMemo(() => {

    // Calcular askingPrice real (igual que en evaluateClubOffer)

    const diff = calculateTransferDifficulty(

      player,

      { name: player.teamName, id: player.teamId },

      { name: state.team?.name, id: state.teamId }

    );

    const askingPrice = Math.round(effectiveMarketValue * diff.askingMultiplier);

    const ratio = offerAmount / askingPrice;



    // Mapear ratio a probabilidad (refleja la lógica real de evaluateClubOffer)

    let prob;

    if (ratio >= 1.15) prob = 98;         // Acepta siempre

    else if (ratio >= 0.95) prob = 80;     // 80% acepta

    else if (ratio >= 0.80) prob = 55;     // Contraoferta probable, puede aceptar en rondas

    else if (ratio >= 0.65) prob = 30;     // Contraoferta difícil

    else if (ratio >= 0.50) prob = 10;     // Casi seguro rechaza

    else prob = 2;                          // Oferta irrisoria → rechazo directo



    return Math.max(2, Math.min(98, prob));

  }, [offerAmount, effectiveMarketValue, player, state.team, state.teamId]);



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



  // Loan probability

  const loanProbability = useMemo(() => {

    if (negotiationMode !== 'loan' || isFreeAgent) return 0;

    const ownerTeam = (state.leagueTeams || []).find(t => t.id === player.teamId);

    if (!ownerTeam) return 50;

    const ownerPlayers = ownerTeam.players || [];

    const ownerAvg = ownerPlayers.length > 0

      ? Math.round(ownerPlayers.reduce((sum, p) => sum + (p.overall || 70), 0) / ownerPlayers.length)

      : 70;

    let prob = 50;

    if (player.overall < ownerAvg - 3) prob += 20;

    else if (player.overall < ownerAvg) prob += 10;

    if (player.age <= 23 && sellerTier >= 3) prob += 15;

    if ((player.contractYears || 2) >= 3) prob += 10;

    if (loanFee >= marketValue * 0.20) prob += 10;

    if (loanHasPurchaseOption && loanPurchaseOption >= marketValue * 0.90) prob += 10;

    if (sellerTier >= 4) prob -= 15;

    else if (sellerTier >= 3) prob -= 10;

    if (player.overall >= 83) prob -= 25;

    return Math.max(5, Math.min(95, prob));

  }, [negotiationMode, isFreeAgent, player, loanFee, loanPurchaseOption, loanHasPurchaseOption, marketValue, sellerTier, state.leagueTeams]);



  // Probabilidad para agente libre / pre-contrato

  const freeAgentProbability = useMemo(() => {

    if (!isFreeAgent && negotiationMode !== 'precontract') return 0;

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

  }, [isFreeAgent, negotiationMode, salaryOffer, requiredSalary, marketValue, signingBonus, buyerTier]);



  // {t('transfers.sendLoanRequest')}

  const handleLoanRequest = () => {
    const check = canLoanPlayer(player, state, 'in');

    if (!check.canLoan) {

      dispatch({

        type: 'ADD_MESSAGE',

        payload: {

          id: Date.now(), type: 'warning', title: t('transfers.loanNotPossible'),

          content: check.errors.join('. '), date: `${t('transfers.weekShort', { week: state.currentWeek })}`

        }

      });

      return;

    }

    if (budget < loanFee) {

      dispatch({

        type: 'ADD_MESSAGE',

        payload: {

          id: Date.now(), type: 'warning', title: t('transfers.insufficientBudgetTitle'),

          content: t('transfers.insufficientForLoanFee', { amount: formatTransferPrice(loanFee) }),

          date: `${t('transfers.weekShort', { week: state.currentWeek })}`

        }

      });

      return;

    }

    const ownerTeam = (state.leagueTeams || []).find(t => t.id === player.teamId);

    if (!ownerTeam) return;

    setClubStatus('negotiating');

    setTimeout(() => {

      const evaluation = evaluateLoanRequest(

        ownerTeam, player,

        { id: state.teamId, name: myTeam?.name },

        { loanFee, salaryShare: loanSalaryShare / 100, purchaseOption: loanHasPurchaseOption ? loanPurchaseOption : null }

      );

      if (evaluation.accepted) {

        dispatch({

          type: 'LOAN_IN_PLAYER',

          payload: {

            player: {

              name: player.name, position: player.position,

              overall: player.overall, age: player.age,

              salary: player.salary || 50000,

              value: marketValue

            },

            fromTeamId: player.teamId,

            fromTeamName: player.teamName,

            loanFee,

            salaryShare: loanSalaryShare / 100,

            purchaseOption: loanHasPurchaseOption ? loanPurchaseOption : null

          }

        });

        setFinalResult('success');

        setClubStatus('accepted');

      } else {

        setFinalResult('failed');

        setFailReason(

          t('transfers.loanDenied', { team: player.teamName, player: player.name, reasons: evaluation.reasons.filter(r => !r.positive).map(r => r.text).join('. ') })

        );

        setClubStatus('rejected');

      }

    }, 1200);

  };



  // Rechazar contraoferta del jugador (agente libre / pre-contrato)
  const handleRejectPlayerCounter = () => {
    setPlayerStatus('rejected');
    setFinalResult('failed');
    setFailReason(t('transfers.noAgreementReached'));
    setPlayerCounter(null);
  };

  // Hacer una contraoferta al jugador (agente libre / pre-contrato)
  const handleCounterPlayerOffer = () => {
    setPlayerStatus('negotiating');
    setPlayerCounter(null);
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
        completeFreeAgentTransfer();
      } else {
        setPlayerStatus('rejected');
        setFinalResult('failed');
        setFailReason(response.reason || t('transfers.playerRejectedDefinitely'));
      }
    }, 1200);
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

        // Contraoferta del jugador (agente libre / pre-contrato)

        let reason;

        if (salaryRatio < 0.8) reason = t('transfers.insufficientSalaryOffer');

        else if (bonusRatio < 0.5) reason = t('transfers.wantsHigherBonus');

        else if (buyerTierNum <= 1 && player.overall >= 80) reason = t('transfers.teamLevelNotConvincing');

        else reason = t('transfers.overallOfferNotConvincing');



        // La contraoferta siempre debe ser MÁS que lo ofrecido

        const baseSalary = Math.round(expectedSalary * 1.1);

        const counterSalary = baseSalary <= salaryOffer

          ? Math.round(salaryOffer * 1.25) // Pide al menos un 25% más

          : baseSalary;



        // Ajustar razón si el salario era suficiente

        if (baseSalary <= salaryOffer) {

          if (buyerTierNum <= 1 && player.overall >= 80) reason = t('transfers.needsMoreMoney');

          else reason = t('transfers.wantsFinancialImprovement');

        }



        setPlayerCounter({ salary: counterSalary, reason });

        setPlayerStatus('counter');

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



    if (negotiationMode === 'precontract' && !isFreeAgent) {

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

        title: isFreeAgent ? t('transfers.freeAgentSigned') : t('transfers.preContractSigned'),

        content: t('transfers.playerJoined', { name: player.name, bonus: formatTransferPrice(signingBonus), salary: formatTransferPrice(salaryOffer * 52) }),

        date: `${t('transfers.weekShort', { week: state.currentWeek })}`

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

    <div className="transfer-modal-overlay" onClick={() => onClose(finalResult === 'failed')}>

      <div className="transfer-modal" onClick={e => e.stopPropagation()}>

        <button className="modal-close-btn" onClick={() => onClose(finalResult === 'failed')}><X size={20} /></button>



        {/* RESULTADO FINAL */}

        {finalResult && (

          <div className={`final-result-overlay ${finalResult}`}>

            <div className="result-content">

              {finalResult === 'success' ? (

                <>

                  <div className="result-icon"><Sparkles size={48} /></div>

                  <h2>{negotiationMode === 'loan' ? t('transfers.loanSuccess') : t('transfers.signingSuccess')}</h2>

                  <p className="player-name">{player.name}</p>

                  <div className="result-details">

                    <span><DollarSign size={16} /> {

                      negotiationMode === 'loan' ? formatTransferPrice(loanFee) :

                      (isFreeAgent || negotiationMode === 'precontract') ? formatTransferPrice(signingBonus) :

                      formatTransferPrice(offerAmount)

                    }</span>

                    {negotiationMode === 'loan' ? (

                      <span><Calendar size={16} /> {t('transfers.seasonLabel')}</span>

                    ) : (

                      <>

                        <span><Calendar size={16} /> {contractYears} {t('transfers.years')}</span>

                        <span><TrendingUp size={16} /> {formatTransferPrice(salaryOffer * 52 * contractYears)} {t('transfers.totalWord')}</span>

                      </>

                    )}

                  </div>

                  <button className="result-btn success" onClick={() => onClose(false)}>

                    <Check size={18} /> {t('transfers.close')}

                  </button>

                </>

              ) : (

                <>

                  <div className="result-icon"><XCircle size={48} /></div>

                  <h2>{t('transfers.signingFailed')}</h2>

                  <p className="fail-reason">{failReason}</p>

                  <p className="block-notice"><Ban size={14} /> {t('transfers.blockedUntilNextSeason')}</p>

                  <div className="result-actions">

                    <button className="result-btn close" onClick={() => onClose(true)}>

                      {t('transfers.close')}

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

                <span className="position-badge" data-pos={player.position}>{translatePosition(player.position)}</span>

                <span className="overall-badge">{player.overall}</span>

              </div>

              <div className="player-avatar">

                <span className="avatar-letter">{player.name?.charAt(0)}</span>

              </div>

              <h3 className="player-name">{player.name}</h3>

              <div className="player-team">

                <Building2 size={14} />

                {isFreeAgent ? <span className="free-badge">{t('transfers.freeAgent')}</span> : player.teamName}

              </div>

              <div className="player-tier">

                <span className="tier-dot" style={{ background: `hsl(${sellerTier * 30 + 120}, 70%, 50%)` }}></span>

                {sellerTierData.name}

              </div>

            </div>



            <div className="player-stats">

              <div className="stat-row">

                <span className="stat-label">{t('transfers.age')}</span>

                <span className="stat-value">{player.age} {t('transfers.years')}</span>

              </div>

              <div className="stat-row">

                <span className="stat-label">{t('transfers.playerValue')}</span>

                <span className="stat-value">{formatTransferPrice(marketValue)}</span>

              </div>

              <div className="stat-row">

                <span className="stat-label">{t('transfers.salary')}</span>

                <span className="stat-value">{formatTransferPrice(currentSalary * 52)}/{t('transfers.year')}</span>

              </div>

              <div className="stat-row">

                <span className="stat-label">{t('transfers.contract')}</span>

                <span className="stat-value">{isFreeAgent ? t('transfers.noContract') : `${player.contractYears || 2} ${t('transfers.years')}`}</span>

              </div>

            </div>



            <div className="player-personality">

              <span className="personality-icon">{(() => { const Icon = PERSONALITY_ICONS[player.personality?.type] || Scale; return <Icon size={16} />; })()}</span>

              <div className="personality-text">

                <span className="personality-name">{personalityData?.nameKey ? t(personalityData.nameKey) : (personalityData?.name || t('transfers.persProfessional'))}</span>

                <span className="personality-desc">{personalityData?.descKey ? t(personalityData.descKey) : personalityData?.desc}</span>

              </div>

            </div>



            {/* Indicador de dificultad */}

            <div className="difficulty-indicator">

              <div className="difficulty-header">

                <span>{t('transfers.difficulty')}</span>

                <span style={{ color: difficulty.color }}>{difficulty.difficultyKey ? t(difficulty.difficultyKey) : difficulty.difficulty}</span>

              </div>

              <div className="difficulty-bar-bg">

                <div

                  className="difficulty-bar-fill"

                  style={{ width: `${100 - difficulty.percentage}%`, background: difficulty.color }}

                ></div>

              </div>

              {tierDiff > 0 && (

                <span className="tier-warning"><AlertTriangle size={14} /> {t('transfers.tierDropWarning', { count: tierDiff, plural: tierDiff > 1 ? 'es' : '' })}</span>

              )}

            </div>

          </div>



          {/* COLUMNA DERECHA: NEGOCIACIÑ"N */}

          <div className="negotiation-column">

            {/* COMPACT MOBILE HEADER (replaces player card on mobile) */}

            <div className="player-mobile-header">

              <span className="pos-badge" data-pos={player.position}>{translatePosition(player.position)}</span>

              <div className="info">

                <span className="name">{player.name}</span>

                <span className="meta">

                  {isFreeAgent ? t('transfers.freeAgentLabel') : player.teamName} · {player.age} {t('transfers.years')} · {formatTransferPrice(marketValue)}

                </span>

              </div>

              <span className="ovr">{player.overall}</span>

            </div>



            {/* TOGGLE FICHAJE / CESIÑ"N / PRE-CONTRATO */}

            {!isFreeAgent && (

              <div className="pre-contract-toggle">

                <button

                  className={`toggle-btn ${negotiationMode === 'transfer' ? 'active' : ''}`}

                  onClick={() => { setNegotiationMode('transfer'); setClubStatus('pending'); setPlayerStatus('locked'); setFinalResult(null); setFailReason(''); }}

                >

                  {t('transfers.signing')}

                </button>

                <button

                  className={`toggle-btn ${negotiationMode === 'loan' ? 'active' : ''}`}

                  onClick={() => { setNegotiationMode('loan'); setClubStatus('pending'); setPlayerStatus('locked'); setFinalResult(null); setFailReason(''); }}

                >

                  {t('transfers.loanToggle')}

                </button>

                {canPreContract && (

                  <button

                    className={`toggle-btn ${negotiationMode === 'precontract' ? 'active' : ''}`}

                    onClick={() => { setNegotiationMode('precontract'); setClubStatus('pending'); setPlayerStatus('pending'); setFinalResult(null); setFailReason(''); }}

                  >

                    {t('transfers.preContractToggle')}

                  </button>

                )}

              </div>

            )}



            {/* FLUJO CESIÑ"N */}

            {!isFreeAgent && negotiationMode === 'loan' && (

              <div className={`negotiation-section loan-request-section ${clubStatus}`}>

                <div className="section-header">

                  <div className="section-title">

                    <Handshake size={18} />

                    <span>{t('transfers.requestLoan')}</span>

                  </div>

                  <div className={`status-badge ${clubStatus}`}>

                    {clubStatus === 'pending' && <><Clock size={12} /> {t('transfers.pending')}</>}

                    {clubStatus === 'negotiating' && <><Clock size={12} /> {t('transfers.negotiating')}</>}

                    {clubStatus === 'accepted' && <><CheckCircle size={12} /> {t('transfers.accepted')}</>}

                    {clubStatus === 'rejected' && <><XCircle size={12} /> {t('transfers.rejected')}</>}

                  </div>

                </div>



                <div className="offer-row">

                  <label>{t('transfers.loanFee')}</label>

                  <MoneyInput

                    value={loanFee}

                    onChange={(valOrFn) => setLoanFee(prev => typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn)}

                    step={500000}

                    min={100000}

                    max={budget}

                    disabled={clubStatus !== 'pending'}

                  />

                </div>



                <div className="contract-row">

                  <label>{t('transfers.salaryPercentLabel')}</label>

                  <div className="contract-buttons">

                    {[30, 40, 50, 60, 70, 80].map(pct => (

                      <button

                        key={pct}

                        className={`contract-btn ${loanSalaryShare === pct ? 'active' : ''}`}

                        onClick={() => setLoanSalaryShare(pct)}

                        disabled={clubStatus !== 'pending'}

                      >

                        {pct}%

                      </button>

                    ))}

                  </div>

                  <span className="salary-hint">

                    {t('transfers.salaryPayHint', { amount: formatTransferPrice(Math.round((player.salary || 50000) * (loanSalaryShare / 100) * 52)) })}

                  </span>

                </div>



                <div className="offer-row">

                  <label>{t('transfers.purchaseOptionLabel')}</label>

                  {loanHasPurchaseOption ? (

                    <MoneyInput

                      value={loanPurchaseOption}

                      onChange={(valOrFn) => setLoanPurchaseOption(prev => typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn)}

                      step={1000000}

                      min={100000}

                      disabled={clubStatus !== 'pending'}

                    />

                  ) : (

                    <div style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #2a4a6a)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: '0.9rem' }}>

                      {t('transfers.noPurchaseOption')}

                    </div>

                  )}

                  <div className="lm-quick-btns" style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}>

                    <button

                      style={{ flex: 1, padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #2a4a6a', borderRadius: '6px', color: !loanHasPurchaseOption ? '#0a84ff' : '#7a8a9a', fontSize: '0.75rem', cursor: 'pointer' }}

                      onClick={() => { setLoanHasPurchaseOption(false); setLoanPurchaseOption(0); }}

                      disabled={clubStatus !== 'pending'}

                    >{t('transfers.noOption')}</button>

                    <button

                      style={{ flex: 1, padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #2a4a6a', borderRadius: '6px', color: '#7a8a9a', fontSize: '0.75rem', cursor: 'pointer' }}

                      onClick={() => { setLoanHasPurchaseOption(true); setLoanPurchaseOption(roundTo100K(marketValue * 0.9)); }}

                      disabled={clubStatus !== 'pending'}

                    >90% {t('transfers.value')}</button>

                    <button

                      style={{ flex: 1, padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #2a4a6a', borderRadius: '6px', color: '#7a8a9a', fontSize: '0.75rem', cursor: 'pointer' }}

                      onClick={() => { setLoanHasPurchaseOption(true); setLoanPurchaseOption(roundTo100K(marketValue)); }}

                      disabled={clubStatus !== 'pending'}

                    >100% {t('transfers.value')}</button>

                  </div>

                </div>



                <div className="probability-row">

                  <span className="prob-label">{t('transfers.estimatedProbability')}</span>

                  <div className="prob-bar-container">

                    <div

                      className="prob-bar"

                      style={{ width: `${loanProbability}%`, background: getProbColor(loanProbability) }}

                    ></div>

                  </div>

                  <span className="prob-value" style={{ color: getProbColor(loanProbability) }}>{loanProbability}%</span>

                </div>



                {clubStatus === 'pending' && (

                  <button

                    className="btn-send-club"

                    onClick={handleLoanRequest}

                    disabled={budget < loanFee}

                  >

                    {

                     budget < loanFee ? t('transfers.insufficientBudget', { amount: formatTransferPrice(budget) }) :

                     t('transfers.sendLoanRequest')}

                  </button>

                )}



                {clubStatus === 'negotiating' && (

                  <div className="negotiating-indicator">

                    <RefreshCw size={18} className="spinning" />

                    <span>{t('transfers.waitingClubResponse')}</span>

                  </div>

                )}

              </div>

            )}



            {/* FLUJO NORMAL: OFERTA UNIFICADA (estilo PC Fútbol 5.0) */}

            {!isFreeAgent && negotiationMode === 'transfer' && (

              <div className="negotiation-section unified-offer-section">

                <div className="section-header">

                  <div className="section-title">

                    <Target size={18} />

                    <span>{t('transfers.prepareOffer')}</span>

                    {isRivalry && <span className="rivalry-badge">⚔️ {t('transfers.directRival')}</span>}

                  </div>

                </div>



                {/* Oferta al club */}

                <div className="offer-row">

                  <label><Building2 size={14} /> {t('transfers.transferToClub')}</label>

                  <MoneyInput

                    value={offerAmount}

                    onChange={(valOrFn) => setOfferAmount(prev => typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn)}

                    step={500000}

                    min={0}

                    max={state.money}

                  />

                </div>



                <div className="probability-row">

                  <span className="prob-label"><Building2 size={12} /> {t('transfers.clubAccepts')}</span>

                  <div className="prob-bar-container">

                    <div className="prob-bar" style={{ width: `${clubProbability}%`, background: getProbColor(clubProbability) }}></div>

                  </div>

                  <span className="prob-value" style={{ color: getProbColor(clubProbability) }}>{clubProbability}%</span>

                </div>



                <div className="offer-divider"></div>



                {/* Oferta al jugador */}

                <div className="offer-row">

                  <label><UserCheck size={14} /> {t('transfers.annualSalary')}</label>

                  <MoneyInput

                    value={salaryOffer * 52}

                    onChange={(val) => setSalaryOffer(Math.round(val / 52))}

                    step={100000}

                    min={0}

                    suffix={`/${t('transfers.year')}`}

                  />

                  <span className="salary-hint">

                    {t('transfers.minEstimated', { amount: formatTransferPrice(requiredSalary * 52) })}

                  </span>

                </div>



                <div className="contract-row">

                  <label>{t('transfers.contractDuration')}</label>

                  <div className="contract-buttons">

                    {[2, 3, 4, 5].map(y => (

                      <button

                        key={y}

                        className={`contract-btn ${contractYears === y ? 'active' : ''}`}

                        onClick={() => setContractYears(y)}

                      >

                        {y} {t('transfers.years')}

                      </button>

                    ))}

                  </div>

                </div>



                <div className="probability-row">

                  <span className="prob-label"><UserCheck size={12} /> {t('transfers.playerAccepts')}</span>

                  <div className="prob-bar-container">

                    <div className="prob-bar" style={{ width: `${playerProbability}%`, background: getProbColor(playerProbability) }}></div>

                  </div>

                  <span className="prob-value" style={{ color: getProbColor(playerProbability) }}>{playerProbability}%</span>

                </div>



                {/* Resumen y botón de envío */}

                <div className="offer-summary-box">

                  <div className="summary-line">

                    <span>💰 {t('transfers.totalTransferCost')}</span>

                    <span className="amount">{formatTransferPrice(offerAmount)}</span>

                  </div>

                  <div className="summary-line">

                    <span>📋 {t('transfers.totalContractCost')}</span>

                    <span className="amount">{formatTransferPrice(salaryOffer * 52 * contractYears)}</span>

                  </div>

                  <div className="summary-line total">

                    <span>📊 {t('transfers.totalInvestment')}</span>

                    <span className="amount">{formatTransferPrice(offerAmount + salaryOffer * 52 * contractYears)}</span>

                  </div>

                </div>



                <button

                  className="btn-send-offer"

                  onClick={() => {

                    dispatch({

                      type: 'ADD_OUTGOING_OFFER',

                      payload: {

                        id: Date.now(),

                        playerName: player.name,

                        player: { name: player.name, position: player.position, overall: player.overall, age: player.age },

                        toTeam: player.teamName,

                        toTeamId: player.teamId,

                        amount: offerAmount,

                        salaryOffer,

                        contractYears,

                        status: 'pending',

                        submittedWeek: state.currentWeek

                      }

                    });

                    dispatch({

                      type: 'ADD_MESSAGE',

                      payload: {

                        id: Date.now(), type: 'transfer', title: t('transfers.offerSentTitle'),

                        content: t('transfers.offerSentContent', { name: player.name, team: player.teamName, amount: formatTransferPrice(offerAmount), salary: formatTransferPrice(salaryOffer * 52) }),

                        date: `${t('transfers.weekShort', { week: state.currentWeek })}`

                      }

                    });

                    onClose();

                  }}

                  disabled={budget < offerAmount || offerAmount <= 0}

                >

                  <ArrowRight size={18} /> {t('transfers.sendOffer')}

                </button>

                <p className="offer-hint">⏳ {t('transfers.responseAfterMatch')}</p>

              </div>

            )}



            {/* FLUJO LIBRE / PRE-CONTRATO */}

            {(isFreeAgent || negotiationMode === 'precontract') && (

              <div className={`negotiation-section free-agent-section ${playerStatus}`}>

                <div className="section-header">

                  <div className="section-title">

                    <UserCheck size={18} />

                    <span>{isFreeAgent ? t('transfers.freeAgentNegotiation') : t('transfers.preContractSection')}</span>

                  </div>

                  <div className={`status-badge ${playerStatus}`}>

                    {playerStatus === 'pending' && <><Clock size={12} /> {t('transfers.pending')}</>}

                    {playerStatus === 'locked' && <><Clock size={12} /> {t('transfers.pending')}</>}

                    {playerStatus === 'negotiating' && <><Clock size={12} /> {t('transfers.negotiating')}</>}

                    {playerStatus === 'accepted' && <><CheckCircle size={12} /> {t('transfers.accepted')}</>}

                    {playerStatus === 'rejected' && <><XCircle size={12} /> {t('transfers.rejected')}</>}

                    {playerStatus === 'counter' && <><RefreshCw size={12} /> {t('transfers.counterOffer')}</>}

                  </div>

                </div>



                {isFreeAgent && (

                  <div className="free-agent-info">

                    <span className="free-badge-large">{t('transfers.freeAgent')}</span>

                    <p>{t('transfers.freeAgentInfo')}</p>

                  </div>

                )}



                {negotiationMode === 'precontract' && !isFreeAgent && (

                  <div className="free-agent-info pre-contract-info">

                    <span className="pre-contract-badge">{t('transfers.preContractBadge')}</span>

                    <p>{t('transfers.preContractInfo')}</p>

                  </div>

                )}



                <div className="offer-row">

                  <label>{t('transfers.signingBonus')}</label>

                  <MoneyInput

                    value={signingBonus}

                    onChange={(valOrFn) => setSigningBonus(prev => typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn)}

                    step={500000}

                    min={0}

                    disabled={playerStatus === 'negotiating' || playerStatus === 'accepted'}

                  />

                  <span className="salary-hint">{t('transfers.suggested', { amount: formatTransferPrice(Math.round(marketValue * (isFreeAgent ? 0.15 : 0.1))) })}</span>

                </div>



                <div className="offer-row">

                  <label>{t('transfers.annualSalary')}</label>

                  <MoneyInput

                    value={salaryOffer * 52}

                    onChange={(val) => setSalaryOffer(Math.round(val / 52))}

                    step={100000}

                    min={0}

                    disabled={playerStatus === 'negotiating' || playerStatus === 'accepted'}

                    suffix={`/${t('transfers.year')}`}

                  />

                  <span className="formatted-amount total-cost">

                    {t('transfers.totalCostFormatted', { amount: formatTransferPrice(salaryOffer * 52 * contractYears), years: contractYears, plural: contractYears > 1 ? 's' : '' })}

                  </span>

                  <span className="salary-hint">

                    {t('transfers.minEstimated', { amount: formatTransferPrice(Math.round(requiredSalary * (isFreeAgent ? 1.3 : 1.15) * 52)) })}

                  </span>

                </div>



                <div className="contract-row">

                  <label>{t('transfers.contractDuration')}</label>

                  <div className="contract-buttons">

                    {[2, 3, 4, 5].map(y => (

                      <button

                        key={y}

                        className={`contract-btn ${contractYears === y ? 'active' : ''}`}

                        onClick={() => setContractYears(y)}

                        disabled={playerStatus === 'negotiating' || playerStatus === 'accepted'}

                      >

                        {y} {t('transfers.years')}

                      </button>

                    ))}

                  </div>

                </div>



                <div className="probability-row">

                  <span className="prob-label">{t('transfers.acceptanceProbability')}</span>

                  <div className="prob-bar-container">

                    <div

                      className="prob-bar"

                      style={{ width: `${freeAgentProbability}%`, background: getProbColor(freeAgentProbability) }}

                    ></div>

                  </div>

                  <span className="prob-value" style={{ color: getProbColor(freeAgentProbability) }}>{freeAgentProbability}%</span>

                </div>



                {playerStatus === 'counter' && playerCounter && (

                  <div className="counter-offer-box player-counter">

                    <span className="counter-label">{t('transfers.playerCounterLabel')}</span>

                    <span className="counter-amount">{formatTransferPrice(playerCounter.salary * 52)}/{t('transfers.year')}</span>

                    <span className="counter-total">{t('transfers.counterTotalCost', { amount: formatTransferPrice(playerCounter.salary * 52 * contractYears) })}</span>

                    <p className="counter-reason">{playerCounter.reason}</p>

                    <div className="counter-actions">

                      <button className="btn-counter-reject" onClick={handleRejectPlayerCounter}>{t('transfers.reject')}</button>

                      <button className="btn-counter-accept" onClick={handleCounterPlayerOffer}>{t('transfers.counterOfferStatus')}</button>

                      <button className="btn-counter-accept" onClick={() => {

                        setSalaryOffer(playerCounter.salary);

                        setPlayerStatus('accepted');

                        setFinalResult('success');

                        completeFreeAgentTransfer();

                        setPlayerCounter(null);

                      }}>{t('transfers.accept')}</button>

                    </div>

                  </div>

                )}



                <div className="total-cost-row">

                  <span className="cost-label">{t('transfers.totalCostLabel')}</span>

                  <span className="cost-value">{formatTransferPrice(signingBonus)} + {formatTransferPrice(salaryOffer * 52)}/{t('transfers.year')} × {contractYears} {t('transfers.years')}</span>

                </div>



                {(playerStatus === 'pending' || playerStatus === 'locked') && (

                  <button

                    className="btn-send-player"

                    onClick={handleFreeAgentOffer}

                    disabled={budget < signingBonus}

                  >

                    {budget < signingBonus ? t('transfers.insufficientBudget', { amount: formatTransferPrice(budget) }) : isFreeAgent ? t('transfers.presentOffer') : t('transfers.offerPreContract')}

                  </button>

                )}



                {playerStatus === 'negotiating' && (

                  <div className="negotiating-indicator">

                    <RefreshCw size={18} className="spinning" />

                    <span>{t('transfers.playerEvaluating')}</span>

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

