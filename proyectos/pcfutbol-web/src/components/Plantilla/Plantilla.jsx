import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { Check, Tag, ClipboardList, Bell, AlertCircle, Clock, Coins, Calendar, Cake, Flag, PenTool, UserMinus, CircleDollarSign, XCircle, X } from 'lucide-react';
import { FORM_STATES } from '../../game/formSystem';
import { translatePosition, posToEN } from '../../game/positionNames';
import { calculateMarketValue } from '../../game/globalTransferEngine';
import './Plantilla.scss';

// Constantes
const WEEKS_PER_YEAR = 52;

export default function Plantilla() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [sortBy, setSortBy] = useState('salary'); // salary, contract, ovr, age
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [actionModal, setActionModal] = useState(null); // 'renew', 'sell', 'release'
  
  const players = state.team?.players || [];
  const budget = state.money || 0;
  
  // Calcular masa salarial
  const totalWeeklySalary = useMemo(() => 
    players.reduce((sum, p) => sum + (p.salary || 0), 0), [players]);
  const totalYearlySalary = totalWeeklySalary * WEEKS_PER_YEAR;
  const salaryPercentage = budget > 0 ? Math.round((totalYearlySalary / budget) * 100) : 0;
  
  // Jugadores que necesitan atención (excluye recién renovados)
  const currentWeek = state.currentWeek || 1;
  const playersNeedingAttention = useMemo(() => {
    return players.filter(p => {
      const contractYears = p.contractYears ?? p.personality?.contractYears ?? 2;
      const happiness = p.personality?.happiness ?? 70;
      const wantsToLeave = p.personality?.wantsToLeave ?? false;
      // Excluir si se renovó recientemente (cooldown de 30 semanas)
      const lastRenewal = p.personality?.lastRenewalWeek || 0;
      if (lastRenewal > 0 && lastRenewal <= currentWeek && (currentWeek - lastRenewal) < 30) return false;
      return contractYears <= 1 || happiness <= 40 || wantsToLeave;
    });
  }, [players, currentWeek]);
  
  // Ordenar jugadores
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      switch (sortBy) {
        case 'salary':
          return (b.salary || 0) - (a.salary || 0);
        case 'contract':
          const aContract = a.contractYears ?? a.personality?.contractYears ?? 2;
          const bContract = b.contractYears ?? b.personality?.contractYears ?? 2;
          return aContract - bContract;
        case 'ovr':
          return (b.overall || 0) - (a.overall || 0);
        case 'age':
          return (a.age || 99) - (b.age || 99);
        default:
          return 0;
      }
    });
  }, [players, sortBy]);
  
  // Helpers
  const formatMoney = (amount) => {
    if (Math.abs(amount) >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    if (Math.abs(amount) >= 1000) return `€${Math.round(amount / 1000)}K`;
    return `€${amount}`;
  };
  
  const getPositionColor = (pos) => {
    const p = posToEN(pos);
    if (p === 'GK') return '#ffd700';
    if (['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(p)) return '#00d4ff';
    if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(p)) return '#30d158';
    return '#ff453a';
  };
  
  const getContractStatus = (player) => {
    const years = player.contractYears ?? player.personality?.contractYears ?? 2;
    if (years <= 0) return { status: 'expired', label: t('plantilla.expired'), color: '#ff453a' };
    if (years <= 1) return { status: 'urgent', label: t('plantilla.oneYear', { years }), color: '#ff9500' };
    return { status: 'ok', label: t('plantilla.multipleYears', { years }), color: '#30d158' };
  };
  
  const getPlayerValue = (player) => {
    return calculateMarketValue(player, state.leagueId || state.playerLeagueId);
  };
  
  const getRenewalDemand = (player) => {
    const currentSalary = player.salary || 30000;
    const age = player.age || 25;
    const overall = player.overall || 70;
    const potential = player.potential || overall;
    const minutesPlayed = player.personality?.minutesPlayed ?? 50;
    
    // === FACTOR EDAD ===
    // Jóvenes (<23): piden poco salario pero muchos años, salvo si son cracks
    // Prime (24-30): piden según su nivel, subida si rinden bien
    // Veteranos (31-33): piden similar o ligeramente menos
    // Mayores (34+): piden MENOS, saben que están en declive
    let ageSalaryFactor;
    let demandedYears;
    
    if (age <= 21) {
      ageSalaryFactor = 0.85;  // Piden menos, están contentos con jugar
      demandedYears = 4;       // Quieren estabilidad
    } else if (age <= 23) {
      ageSalaryFactor = 0.95;
      demandedYears = 4;
    } else if (age <= 27) {
      ageSalaryFactor = 1.10;  // Prime ascendente, quieren subida
      demandedYears = 4;
    } else if (age <= 30) {
      ageSalaryFactor = 1.15;  // Pico, último gran contrato
      demandedYears = 3;
    } else if (age <= 33) {
      ageSalaryFactor = 0.95;  // Empiezan a aceptar menos
      demandedYears = 2;
    } else {
      ageSalaryFactor = 0.75;  // 34+: saben que están en declive
      demandedYears = 2;       // Mínimo 2 años para que no vuelva a saltar atención
    }
    
    // === FACTOR OVERALL ===
    // Jugadores con más media piden más proporcionalmente
    // 60 OVR → ×0.85, 75 OVR → ×1.0, 85 OVR → ×1.25, 95 OVR → ×1.55
    const overallFactor = 0.55 + (overall / 100) * 1.0;
    
    // === FACTOR POTENCIAL (solo jóvenes) ===
    // Si un joven tiene mucho potencial, pide más porque sabe que vale
    let potentialBonus = 1.0;
    if (age <= 25 && potential > overall) {
      const potentialGap = potential - overall;
      // Gap de 10+ → pide bastante más
      potentialBonus = 1.0 + Math.min(0.3, potentialGap * 0.02);
    }
    
    // === FACTOR RENDIMIENTO ===
    // Si juega mucho (titular), pide más. Si juega poco, pide menos.
    let performanceFactor;
    if (minutesPlayed >= 75) {
      performanceFactor = 1.10; // Titular indiscutible
    } else if (minutesPlayed >= 50) {
      performanceFactor = 1.0;  // Rotación normal
    } else if (minutesPlayed >= 25) {
      performanceFactor = 0.90; // Poco protagonismo
    } else {
      performanceFactor = 0.80; // Apenas juega, acepta lo que sea
    }
    
    // === CÁLCULO FINAL ===
    const demandedSalary = Math.round(
      currentSalary * ageSalaryFactor * overallFactor * potentialBonus * performanceFactor
    );
    
    // El salario pedido nunca baja de un mínimo razonable según overall
    const minSalary = Math.round(overall * overall * 3); // ~15K para 70 OVR, ~22K para 85 OVR
    
    return { 
      salary: Math.max(minSalary, demandedSalary), 
      years: demandedYears 
    };
  };
  
  // ¿El jugador quiere renovar? Solo si le quedan 1-2 años, no se retira, y no renovó recientemente
  const wantsToRenew = (player) => {
    if (player.retiring) return false;
    const contractYears = player.contractYears ?? player.personality?.contractYears ?? 2;
    // No renovar si ya renovó esta temporada (cooldown de 30 semanas)
    const lastRenewal = player.personality?.lastRenewalWeek || 0;
    const currentWeek = state.currentWeek || 1;
    // Si lastRenewal > currentWeek, es de una temporada anterior → ignorar cooldown
    if (lastRenewal > 0 && lastRenewal <= currentWeek && (currentWeek - lastRenewal) < 30) return false;
    return contractYears <= 2;
  };
  
  const needsAttention = (player) => {
    const contractYears = player.contractYears ?? player.personality?.contractYears ?? 2;
    const happiness = player.personality?.happiness ?? 70;
    const wantsToLeave = player.personality?.wantsToLeave ?? false;
    // Excluir si se renovó recientemente
    const lastRenewal = player.personality?.lastRenewalWeek || 0;
    if (lastRenewal > 0 && lastRenewal <= currentWeek && (currentWeek - lastRenewal) < 30) return false;
    return contractYears <= 1 || happiness <= 40 || wantsToLeave;
  };
  
  // Acciones
  const handleRenew = (player) => {
    const demand = getRenewalDemand(player);
    setSelectedPlayer(player);
    setActionModal({ type: 'renew', demand });
  };
  
  const handleSell = (player) => {
    const value = getPlayerValue(player);
    setSelectedPlayer(player);
    setActionModal({ type: 'sell', value });
  };
  
  const handleRelease = (player) => {
    const yearlySaved = (player.salary || 0) * WEEKS_PER_YEAR;
    const contractYears = player.contractYears ?? player.contract ?? player.personality?.contractYears ?? 2;
    // Indemnización = salario anual × años restantes de contrato
    const severanceCost = (player.salary || 0) * WEEKS_PER_YEAR * contractYears;
    setSelectedPlayer(player);
    setActionModal({ type: 'release', yearlySaved, severanceCost, contractYears });
  };
  
  const confirmRenew = () => {
    if (!selectedPlayer || !actionModal) return;
    
    const newSalary = actionModal.demand.salary;
    const newYears = actionModal.demand.years;
    
    dispatch({
      type: 'UPDATE_PLAYER',
      payload: {
        ...selectedPlayer,
        salary: newSalary,
        contractYears: newYears,
        contract: newYears,
        personality: {
          ...selectedPlayer.personality,
          contractYears: newYears,
          happiness: Math.min(100, (selectedPlayer.personality?.happiness || 70) + 15),
          wantsToLeave: false,
          lastRenewalWeek: state.currentWeek // Previene renovar otra vez
        }
      }
    });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'contract',
        title: `${selectedPlayer.name} ha renovado`,
        content: `Nuevo contrato: ${newYears} años, ${formatMoney(newSalary)}/sem`,
        date: `Semana ${state.currentWeek}`
      }
    });
    
    closeModal();
  };
  
  const confirmSell = () => {
    if (!selectedPlayer || !actionModal) return;
    
    // Poner en lista de transferibles
    dispatch({
      type: 'UPDATE_PLAYER',
      payload: {
        ...selectedPlayer,
        transferListed: true,
        askingPrice: actionModal.value
      }
    });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'transfer',
        title: `${selectedPlayer.name} en venta`,
        content: `Precio: ${formatMoney(actionModal.value)}`,
        date: `Semana ${state.currentWeek}`
      }
    });
    
    closeModal();
  };
  
  const handleUnlist = (player) => {
    setSelectedPlayer(player);
    setActionModal({ type: 'unlist' });
  };
  
  const confirmUnlist = () => {
    if (!selectedPlayer) return;
    
    dispatch({
      type: 'UPDATE_PLAYER',
      payload: {
        ...selectedPlayer,
        transferListed: false,
        askingPrice: undefined
      }
    });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'transfer',
        title: `${selectedPlayer.name} retirado del mercado`,
        content: `Ya no está disponible para la venta`,
        date: `Semana ${state.currentWeek}`
      }
    });
    
    closeModal();
  };
  
  const confirmRelease = () => {
    if (!selectedPlayer || !actionModal) return;
    
    const severanceCost = actionModal.severanceCost || 0;
    
    // Descontar indemnización del presupuesto
    if (severanceCost > 0) {
      dispatch({
        type: 'UPDATE_MONEY',
        payload: -severanceCost
      });
    }
    
    // Eliminar jugador
    dispatch({
      type: 'REMOVE_PLAYER',
      payload: selectedPlayer.name
    });
    
    // Impacto en moral si es importante
    if (selectedPlayer.overall >= 75) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'morale',
          title: `El vestuario nota la marcha de ${selectedPlayer.name}`,
          content: `La moral del equipo se ha resentido`,
          date: `Semana ${state.currentWeek}`
        }
      });
    }
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'contract',
        title: `${selectedPlayer.name} ha sido liberado`,
        content: severanceCost > 0 
          ? `Indemnización pagada: ${formatMoney(severanceCost)}`
          : `Jugador liberado sin coste`,
        date: `Semana ${state.currentWeek}`
      }
    });
    
    closeModal();
  };
  
  const closeModal = () => {
    setSelectedPlayer(null);
    setActionModal(null);
  };

  return (
    <div className="plantilla">
      {/* Header con finanzas */}
      <div className="plantilla__header">
        <div className="header-title">
          <h2><ClipboardList size={16} /> {t('plantilla.title')}</h2>
          <span className="player-count">{players.length} {t('plantilla.players')}</span>
        </div>
        
        <div className="header-finances">
          <div className="finance-box budget">
            <span className="label">{t('plantilla.budget')}</span>
            <span className="value">{formatMoney(budget)}</span>
          </div>
          <div className="finance-box salary">
            <span className="label">{t('plantilla.weeklySalary')}</span>
            <span className="value">{formatMoney(totalYearlySalary)}{t('plantilla.perYear')}</span>
            <span className="yearly">{formatMoney(totalWeeklySalary)}{t('plantilla.perWeek')} ({salaryPercentage}% {t('plantilla.ofBudget')})</span>
          </div>
        </div>
      </div>
      
      {/* Alertas de jugadores que necesitan atención */}
      {playersNeedingAttention.length > 0 && (
        <div className="plantilla__alerts">
          <div className="alert-header">
            <span className="alert-icon"><Bell size={14} /></span>
            <span className="alert-title">{t('plantilla.playersNeedAttention', { count: playersNeedingAttention.length })}</span>
          </div>
          <div className="alert-list">
            {playersNeedingAttention.slice(0, 3).map(p => {
              const contract = getContractStatus(p);
              const wantsLeave = p.personality?.wantsToLeave;
              const canRenew = wantsToRenew(p);
              return (
                <div key={p.name} className="alert-item" onClick={() => {
                  if (canRenew) {
                    handleRenew(p);
                  } else {
                    // Can't renew (retiring, cooldown, etc.) — open mobile actions
                    setSelectedPlayer(p);
                    setActionModal({ type: 'mobile-actions', player: p });
                  }
                }}>
                  <span className="pos" style={{ color: getPositionColor(p.position) }}>{translatePosition(p.position)}</span>
                  <span className="name">{p.name}</span>
                  <span className="reason">
                    {p.retiring ? <><AlertCircle size={12} /> {t('plantilla.retiring')}</> 
                      : wantsLeave ? <><AlertCircle size={12} /> {t('plantilla.wantsToLeaveAlert')}</> 
                      : <><Clock size={12} /> {contract.label}</>}
                  </span>
                </div>
              );
            })}
            {playersNeedingAttention.length > 3 && (
              <span className="more">{t('plantilla.more', { count: playersNeedingAttention.length - 3 })}</span>
            )}
          </div>
        </div>
      )}
      
      {/* Ordenación */}
      <div className="plantilla__sort">
        <span>{t('plantilla.sortBy')}:</span>
        <button className={sortBy === 'salary' ? 'active' : ''} onClick={() => setSortBy('salary')}>
          <Coins size={12} /> {t('common.salary')}
        </button>
        <button className={sortBy === 'contract' ? 'active' : ''} onClick={() => setSortBy('contract')}>
          <Calendar size={12} /> {t('common.contract')}
        </button>
        <button className={sortBy === 'ovr' ? 'active' : ''} onClick={() => setSortBy('ovr')}>
          ⭐ OVR
        </button>
        <button className={sortBy === 'age' ? 'active' : ''} onClick={() => setSortBy('age')}>
          <Cake size={12} /> {t('common.age')}
        </button>
      </div>
      
      {/* Table header */}
      <div className="plantilla__table-header">
        <span className="col-pos">{t('common.position')}</span>
        <span className="col-name">{t('plantilla.player')}</span>
        <span className="col-ovr">MED</span>
        <span className="col-salary">{t('common.salary')}</span>
        <span className="col-contract">{t('common.contract')}</span>
      </div>
      
      {/* Lista de jugadores */}
      <div className="plantilla__list">
        {sortedPlayers.map(player => {
          const contract = getContractStatus(player);
          const contractYears = player.contractYears ?? player.personality?.contractYears ?? 2;
          const yearlySalary = (player.salary || 0) * WEEKS_PER_YEAR;
          const totalContractCost = yearlySalary * contractYears;
          const attention = needsAttention(player);
          const isTransferListed = player.transferListed;
          
          return (
            <div key={player.name} className={`player-row ${attention ? 'attention' : ''} ${isTransferListed ? 'listed' : ''}`}
              onClick={(e) => {
                // On mobile, tap row to open action sheet
                if (window.innerWidth <= 768 && !e.target.closest('.player-actions')) {
                  setSelectedPlayer(player);
                  setActionModal({ type: 'mobile-actions', player });
                }
              }}
            >
              <div className="player-main">
                <span className="pos" style={{ background: getPositionColor(player.position) }}>
                  {translatePosition(player.position)}
                </span>
                <div className="info">
                  <div className="name-row">
                    <span className="name">{player.name}</span>
                    {(player.onLoan || isTransferListed || player.retiring) && (
                      <div className="player-tags">
                        {player.onLoan && <span className="tag-loan">🤝 {t('plantilla.onLoanTag')}</span>}
                        {isTransferListed && !player.onLoan && (
                          <span 
                            className="tag-listed tag-listed--clickable" 
                            onClick={(e) => { e.stopPropagation(); handleUnlist(player); }}
                            title={t('plantilla.removeFromSale')}
                          >
                            🏷️ {t('plantilla.forSaleTag')}
                          </span>
                        )}
                        {player.retiring && <span className="tag-retiring"><Flag size={12} /> {t('plantilla.retiring')}</span>}
                      </div>
                    )}
                  </div>
                  <span className="meta">{player.overall} OVR · {player.age} {t('plantilla.years')}</span>
                </div>
              </div>

              {/* OVR badge visible on mobile */}
              <span className="player-ovr-badge">{player.overall}</span>
              
              <div className="player-contract">
                <span className="salary">{formatMoney(yearlySalary)}{t('plantilla.perYear')}</span>
                <span className="yearly">{formatMoney(totalContractCost)} {t('plantilla.total')} ({contractYears}{t('plantilla.years').charAt(0)})</span>
              </div>
              
              <div className="player-status">
                <span className="contract" style={{ color: contract.color }}>
                  <Calendar size={12} /> {contract.label}
                </span>
                <span className={`renew-icon ${wantsToRenew(player) && !player.retiring ? '' : 'hidden'}`} title={t('plantilla.canRenew')}>
                  <PenTool size={12} />
                </span>
              </div>
              
              <div className="player-actions">
                {player.onLoan ? (
                  <>
                    <span className="loan-info-badge" title={`${t('plantilla.loanedBadge')} - ${player.loanFromTeam}`}>
                      🤝 {t('plantilla.loanedBadge')}
                    </span>
                  </>
                ) : (
                  <>
                    <button 
                      className="btn-renew" 
                      onClick={() => handleRenew(player)} 
                      title={player.retiring ? t('plantilla.playerRetiring') : !wantsToRenew(player) ? t('plantilla.cannotRenew') : t('plantilla.renew')}
                      disabled={!wantsToRenew(player)}
                    >
                      <PenTool size={14} />
                    </button>
                    {isTransferListed ? (
                      <button className="btn-sell btn-sell--listed" onClick={() => handleUnlist(player)} title={t('plantilla.removeFromSale')}>
                        🏷️
                      </button>
                    ) : (
                      <button className="btn-sell" onClick={() => handleSell(player)} title={t('plantilla.putForSale')}>
                        <Tag size={14} />
                      </button>
                    )}
                    <button className="btn-release" onClick={() => handleRelease(player)} title={t('plantilla.release')}>
                      <UserMinus size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Modal de acción */}
      {actionModal && selectedPlayer && (
        <div className="plantilla__modal-overlay" onClick={closeModal}>
          <div className="plantilla__modal" onClick={e => e.stopPropagation()}>

            {/* MOBILE ACTION SHEET */}
            {actionModal.type === 'mobile-actions' && (
              <>
                <div className="modal-header">
                  <h3>{selectedPlayer.name}</h3>
                </div>
                <div className="modal-content">
                  <div className="player-summary">
                    <span className="pos" style={{ background: getPositionColor(selectedPlayer.position) }}>
                      {translatePosition(selectedPlayer.position)}
                    </span>
                    <span className="ovr">{selectedPlayer.overall}</span>
                    <span className="age">{selectedPlayer.age} {t('plantilla.years')}</span>
                  </div>
                  <div className="mobile-action-list">
                    {selectedPlayer.onLoan ? (
                      <>
                        <div className="mobile-action-info">
                          🤝 {t('plantilla.loanedBy', { team: selectedPlayer.loanFromTeam })}
                        </div>
                        <button className="mobile-action-btn mobile-action-btn--cancel" onClick={closeModal}>
                          <X size={14} /> {t('common.close')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="mobile-action-btn" onClick={() => { closeModal(); handleRenew(selectedPlayer); }} disabled={!wantsToRenew(selectedPlayer)}>
                          <PenTool size={14} /> {t('plantilla.renewContract')}
                        </button>
                        {selectedPlayer.transferListed ? (
                          <button className="mobile-action-btn mobile-action-btn--unlist" onClick={() => { closeModal(); handleUnlist(selectedPlayer); }}>
                            🏷️ {t('plantilla.removeFromSale')}
                          </button>
                        ) : (
                          <button className="mobile-action-btn" onClick={() => { closeModal(); handleSell(selectedPlayer); }}>
                            <Tag size={14} /> {t('plantilla.putForSale')}
                          </button>
                        )}
                        <button className="mobile-action-btn mobile-action-btn--danger" onClick={() => { closeModal(); handleRelease(selectedPlayer); }}>
                          <UserMinus size={14} /> {t('plantilla.releasePlayerBtn')}
                        </button>
                        <button className="mobile-action-btn mobile-action-btn--cancel" onClick={closeModal}>
                          <X size={14} /> {t('common.cancel')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {/* RENOVAR */}
            {actionModal.type === 'renew' && (() => {
              const currentContractYears = selectedPlayer.personality?.contractYears || selectedPlayer.contractYears || 1;
              const currentYearlySalary = (selectedPlayer.salary || 0) * WEEKS_PER_YEAR;
              const newYearlySalary = actionModal.demand.salary * WEEKS_PER_YEAR;
              const salaryDiff = newYearlySalary - currentYearlySalary;
              
              return (
              <>
                <div className="modal-header renew">
                  <h3>{t('plantilla.renewPlayer', { name: selectedPlayer.name })}</h3>
                </div>
                <div className="modal-content">
                  <div className="player-summary">
                    <span className="pos" style={{ background: getPositionColor(selectedPlayer.position) }}>
                      {translatePosition(selectedPlayer.position)}
                    </span>
                    <span className="ovr">{selectedPlayer.overall}</span>
                    <span className="age">{selectedPlayer.age} {t('plantilla.years')}</span>
                  </div>
                  
                  <div className="comparison">
                    <div className="current">
                      <span className="label">{t('plantilla.currentContractLabel')}</span>
                      <span className="salary">{formatMoney(currentYearlySalary)}{t('plantilla.perYear')}</span>
                      <span className="yearly">{t('plantilla.total')}: {formatMoney(currentYearlySalary * currentContractYears)}</span>
                      <span className="years">{currentContractYears} {t('plantilla.years')}</span>
                    </div>
                    <div className="arrow">→</div>
                    <div className="new">
                      <span className="label">{t('plantilla.demands')}</span>
                      <span className="salary">{formatMoney(newYearlySalary)}{t('plantilla.perYear')}</span>
                      <span className="yearly">{t('plantilla.total')}: {formatMoney(newYearlySalary * actionModal.demand.years)}</span>
                      <span className="years">{actionModal.demand.years} {t('plantilla.years')}</span>
                    </div>
                  </div>
                  
                  <div className="impact">
                    <span className="impact-label">{t('plantilla.budgetImpact')}</span>
                    <span className={`impact-value ${salaryDiff > 0 ? 'negative' : 'positive'}`}>
                      {salaryDiff > 0 ? '+' : ''}{formatMoney(salaryDiff)}{t('plantilla.perYear')}
                    </span>
                  </div>
                  
                  <div className="modal-actions">
                    <button className="btn-confirm" onClick={confirmRenew}>
                      {t('plantilla.acceptAndRenew')}
                    </button>
                    <button className="btn-cancel" onClick={closeModal}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </>
              );
            })()}
            
            {/* VENDER */}
            {actionModal.type === 'sell' && (
              <>
                <div className="modal-header sell">
                  <h3><Tag size={14} /> {t('plantilla.sellPlayer', { name: selectedPlayer.name })}</h3>
                </div>
                <div className="modal-content">
                  <div className="player-summary">
                    <span className="pos" style={{ background: getPositionColor(selectedPlayer.position) }}>
                      {translatePosition(selectedPlayer.position)}
                    </span>
                    <span className="ovr">{selectedPlayer.overall}</span>
                    <span className="age">{selectedPlayer.age} {t('plantilla.years')}</span>
                  </div>
                  
                  <div className="sell-info">
                    <div className="value-box">
                      <span className="label">{t('plantilla.marketValue')}</span>
                      <span className="value">{formatMoney(actionModal.value)}</span>
                    </div>
                    <div className="salary-box">
                      <span className="label">{t('plantilla.currentSalary')}</span>
                      <span className="value">{formatMoney((selectedPlayer.salary || 0) * WEEKS_PER_YEAR)}{t('plantilla.perYear')}</span>
                    </div>
                  </div>
                  
                  <div className="impact">
                    <span className="impact-label"><Coins size={12} /> {t('plantilla.ifSold')}</span>
                    <span className="impact-value positive">
                      +{formatMoney(actionModal.value)} + {formatMoney((selectedPlayer.salary || 0) * WEEKS_PER_YEAR)}{t('plantilla.perYear')} {t('plantilla.savedSalary')}
                    </span>
                  </div>
                  
                  <p className="note">{t('plantilla.sellNote')}</p>
                  
                  <div className="modal-actions">
                    <button className="btn-confirm" onClick={confirmSell}>
                      <Tag size={14} /> {t('plantilla.putForSale')}
                    </button>
                    <button className="btn-cancel" onClick={closeModal}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {/* QUITAR DE VENTA */}
            {actionModal.type === 'unlist' && (
              <>
                <div className="modal-header unlist">
                  <h3>🏷️ {t('plantilla.unlistPlayer', { name: selectedPlayer.name })}</h3>
                </div>
                <div className="modal-content">
                  <div className="player-summary">
                    <span className="pos" style={{ background: getPositionColor(selectedPlayer.position) }}>
                      {translatePosition(selectedPlayer.position)}
                    </span>
                    <span className="ovr">{selectedPlayer.overall}</span>
                    <span className="age">{selectedPlayer.age} {t('plantilla.years')}</span>
                  </div>
                  
                  <div className="sell-info">
                    <p>{t('plantilla.unlistQuestion')}</p>
                    <p className="note">{t('plantilla.unlistNote')}</p>
                  </div>
                  
                  <div className="modal-actions">
                    <button className="btn-confirm" onClick={confirmUnlist}>
                      ✅ {t('plantilla.confirmUnlist')}
                    </button>
                    <button className="btn-cancel" onClick={closeModal}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {/* LIBERAR */}
            {actionModal.type === 'release' && (
              <>
                <div className="modal-header release">
                  <h3><UserMinus size={14} /> {t('plantilla.releasePlayer', { name: selectedPlayer.name })}</h3>
                </div>
                <div className="modal-content">
                  <div className="player-summary">
                    <span className="pos" style={{ background: getPositionColor(selectedPlayer.position) }}>
                      {translatePosition(selectedPlayer.position)}
                    </span>
                    <span className="ovr">{selectedPlayer.overall}</span>
                    <span className="age">{selectedPlayer.age} {t('plantilla.years')}</span>
                  </div>
                  
                  <div className="warning-box danger">
                    <span className="warning-icon"><CircleDollarSign size={14} /></span>
                    <span className="warning-text">
                      {t('plantilla.severanceWarning', { years: actionModal.contractYears })}
                    </span>
                  </div>
                  
                  <div className="impact">
                    <span className="impact-label"><CircleDollarSign size={12} /> {t('plantilla.severanceCost')}</span>
                    <span className="impact-value negative">
                      -{formatMoney(actionModal.severanceCost)}
                    </span>
                  </div>
                  
                  <div className="impact">
                    <span className="impact-label"><Coins size={12} /> {t('plantilla.salarySaved')}</span>
                    <span className="impact-value positive">
                      +{formatMoney(actionModal.yearlySaved)}{t('plantilla.perYear')}
                    </span>
                  </div>
                  
                  {selectedPlayer.overall >= 75 && (
                    <div className="morale-warning">
                      <span>{t('plantilla.moraleWarning')}</span>
                    </div>
                  )}
                  
                  {budget < actionModal.severanceCost && (
                    <div className="morale-warning">
                      <span><XCircle size={12} /> {t('plantilla.insufficientFunds')}</span>
                    </div>
                  )}
                  
                  <div className="modal-actions">
                    <button 
                      className="btn-confirm danger" 
                      onClick={confirmRelease}
                      disabled={budget < actionModal.severanceCost}
                    >
                      <UserMinus size={14} /> {t('plantilla.payAndRelease')} ({formatMoney(actionModal.severanceCost)})
                    </button>
                    <button className="btn-cancel" onClick={closeModal}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
