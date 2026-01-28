import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import './Plantilla.scss';

// Constantes
const WEEKS_PER_YEAR = 52;

export default function Plantilla() {
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
  
  // Jugadores que necesitan atención
  const playersNeedingAttention = useMemo(() => {
    return players.filter(p => {
      const contractYears = p.contractYears ?? p.personality?.contractYears ?? 2;
      const happiness = p.personality?.happiness ?? 70;
      const wantsToLeave = p.personality?.wantsToLeave ?? false;
      return contractYears <= 1 || happiness <= 40 || wantsToLeave;
    });
  }, [players]);
  
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
          return b.overall - a.overall;
        case 'age':
          return a.age - b.age;
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
    if (pos === 'GK') return '#ffd700';
    if (['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(pos)) return '#00d4ff';
    if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(pos)) return '#30d158';
    return '#ff453a';
  };
  
  const getContractStatus = (player) => {
    const years = player.contractYears ?? player.personality?.contractYears ?? 2;
    if (years <= 0) return { status: 'expired', label: 'Expirado', color: '#ff453a' };
    if (years <= 1) return { status: 'urgent', label: `${years} año`, color: '#ff9500' };
    return { status: 'ok', label: `${years} años`, color: '#30d158' };
  };
  
  const getPlayerValue = (player) => {
    // Valor estimado basado en overall, edad y posición
    const baseValue = Math.pow(player.overall / 50, 3) * 500000;
    const ageFactor = player.age <= 24 ? 1.3 : player.age <= 28 ? 1.1 : player.age <= 32 ? 0.8 : 0.5;
    return Math.round(baseValue * ageFactor);
  };
  
  const getRenewalDemand = (player) => {
    // El jugador pide subida según su overall y edad
    const currentSalary = player.salary || 30000;
    const overallFactor = player.overall / 75;
    const ageFactor = player.age <= 28 ? 1.2 : player.age <= 32 ? 1.0 : 0.85;
    const demandedSalary = Math.round(currentSalary * overallFactor * ageFactor * 1.15); // +15% mínimo
    const demandedYears = player.age <= 28 ? 4 : player.age <= 32 ? 3 : 2;
    return { salary: demandedSalary, years: demandedYears };
  };
  
  const needsAttention = (player) => {
    const contractYears = player.contractYears ?? player.personality?.contractYears ?? 2;
    const happiness = player.personality?.happiness ?? 70;
    const wantsToLeave = player.personality?.wantsToLeave ?? false;
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
    setSelectedPlayer(player);
    setActionModal({ type: 'release', yearlySaved });
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
        personality: {
          ...selectedPlayer.personality,
          contractYears: newYears,
          happiness: Math.min(100, (selectedPlayer.personality?.happiness || 70) + 15),
          wantsToLeave: false
        }
      }
    });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'contract',
        title: `✅ ${selectedPlayer.name} ha renovado`,
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
        title: `🏷️ ${selectedPlayer.name} en venta`,
        content: `Precio: ${formatMoney(actionModal.value)}`,
        date: `Semana ${state.currentWeek}`
      }
    });
    
    closeModal();
  };
  
  const confirmRelease = () => {
    if (!selectedPlayer) return;
    
    const yearlySaved = (selectedPlayer.salary || 0) * WEEKS_PER_YEAR;
    
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
          title: `😔 El vestuario nota la marcha de ${selectedPlayer.name}`,
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
        title: `👋 ${selectedPlayer.name} ha sido liberado`,
        content: `Ahorras ${formatMoney(yearlySaved)}/año en salarios`,
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
          <h2>📋 Plantilla</h2>
          <span className="player-count">{players.length} jugadores</span>
        </div>
        
        <div className="header-finances">
          <div className="finance-box budget">
            <span className="label">Presupuesto</span>
            <span className="value">{formatMoney(budget)}</span>
          </div>
          <div className="finance-box salary">
            <span className="label">Masa salarial</span>
            <span className="value">{formatMoney(totalWeeklySalary)}/sem</span>
            <span className="yearly">{formatMoney(totalYearlySalary)}/año ({salaryPercentage}%)</span>
          </div>
        </div>
      </div>
      
      {/* Alertas de jugadores que necesitan atención */}
      {playersNeedingAttention.length > 0 && (
        <div className="plantilla__alerts">
          <div className="alert-header">
            <span className="alert-icon">🔔</span>
            <span className="alert-title">{playersNeedingAttention.length} jugador{playersNeedingAttention.length > 1 ? 'es' : ''} requiere{playersNeedingAttention.length > 1 ? 'n' : ''} atención</span>
          </div>
          <div className="alert-list">
            {playersNeedingAttention.slice(0, 3).map(p => {
              const contract = getContractStatus(p);
              const wantsLeave = p.personality?.wantsToLeave;
              return (
                <div key={p.name} className="alert-item" onClick={() => handleRenew(p)}>
                  <span className="pos" style={{ color: getPositionColor(p.position) }}>{p.position}</span>
                  <span className="name">{p.name}</span>
                  <span className="reason">
                    {wantsLeave ? '😤 Quiere irse' : `⏰ ${contract.label}`}
                  </span>
                </div>
              );
            })}
            {playersNeedingAttention.length > 3 && (
              <span className="more">+{playersNeedingAttention.length - 3} más</span>
            )}
          </div>
        </div>
      )}
      
      {/* Ordenación */}
      <div className="plantilla__sort">
        <span>Ordenar por:</span>
        <button className={sortBy === 'salary' ? 'active' : ''} onClick={() => setSortBy('salary')}>
          💰 Salario
        </button>
        <button className={sortBy === 'contract' ? 'active' : ''} onClick={() => setSortBy('contract')}>
          📅 Contrato
        </button>
        <button className={sortBy === 'ovr' ? 'active' : ''} onClick={() => setSortBy('ovr')}>
          ⭐ OVR
        </button>
        <button className={sortBy === 'age' ? 'active' : ''} onClick={() => setSortBy('age')}>
          🎂 Edad
        </button>
      </div>
      
      {/* Lista de jugadores */}
      <div className="plantilla__list">
        {sortedPlayers.map(player => {
          const contract = getContractStatus(player);
          const yearlySalary = (player.salary || 0) * WEEKS_PER_YEAR;
          const attention = needsAttention(player);
          const isTransferListed = player.transferListed;
          
          return (
            <div key={player.name} className={`player-row ${attention ? 'attention' : ''} ${isTransferListed ? 'listed' : ''}`}>
              <div className="player-main">
                <span className="pos" style={{ background: getPositionColor(player.position) }}>
                  {player.position}
                </span>
                <div className="info">
                  <span className="name">
                    {player.name}
                    {isTransferListed && <span className="tag-listed">🏷️ En venta</span>}
                  </span>
                  <span className="meta">{player.overall} OVR · {player.age} años</span>
                </div>
              </div>
              
              <div className="player-contract">
                <span className="salary">{formatMoney(player.salary || 0)}/sem</span>
                <span className="yearly">{formatMoney(yearlySalary)}/año</span>
              </div>
              
              <div className="player-status">
                <span className="contract" style={{ color: contract.color }}>
                  📅 {contract.label}
                </span>
              </div>
              
              <div className="player-actions">
                <button className="btn-renew" onClick={() => handleRenew(player)} title="Renovar">
                  ✍️
                </button>
                <button className="btn-sell" onClick={() => handleSell(player)} title="Poner en venta">
                  🏷️
                </button>
                <button className="btn-release" onClick={() => handleRelease(player)} title="Liberar">
                  👋
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Modal de acción */}
      {actionModal && selectedPlayer && (
        <div className="plantilla__modal-overlay" onClick={closeModal}>
          <div className="plantilla__modal" onClick={e => e.stopPropagation()}>
            
            {/* RENOVAR */}
            {actionModal.type === 'renew' && (
              <>
                <div className="modal-header renew">
                  <h3>✍️ Renovar a {selectedPlayer.name}</h3>
                </div>
                <div className="modal-content">
                  <div className="player-summary">
                    <span className="pos" style={{ background: getPositionColor(selectedPlayer.position) }}>
                      {selectedPlayer.position}
                    </span>
                    <span className="ovr">{selectedPlayer.overall}</span>
                    <span className="age">{selectedPlayer.age} años</span>
                  </div>
                  
                  <div className="comparison">
                    <div className="current">
                      <span className="label">Contrato actual</span>
                      <span className="salary">{formatMoney(selectedPlayer.salary || 0)}/sem</span>
                      <span className="yearly">{formatMoney((selectedPlayer.salary || 0) * WEEKS_PER_YEAR)}/año</span>
                    </div>
                    <div className="arrow">→</div>
                    <div className="new">
                      <span className="label">Pide</span>
                      <span className="salary">{formatMoney(actionModal.demand.salary)}/sem</span>
                      <span className="yearly">{formatMoney(actionModal.demand.salary * WEEKS_PER_YEAR)}/año</span>
                      <span className="years">{actionModal.demand.years} años</span>
                    </div>
                  </div>
                  
                  <div className="impact">
                    <span className="impact-label">💰 Impacto en presupuesto:</span>
                    <span className="impact-value negative">
                      {formatMoney((actionModal.demand.salary - (selectedPlayer.salary || 0)) * WEEKS_PER_YEAR)}/año
                    </span>
                  </div>
                  
                  <div className="modal-actions">
                    <button className="btn-confirm" onClick={confirmRenew}>
                      ✅ Aceptar y renovar
                    </button>
                    <button className="btn-cancel" onClick={closeModal}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {/* VENDER */}
            {actionModal.type === 'sell' && (
              <>
                <div className="modal-header sell">
                  <h3>🏷️ Poner en venta a {selectedPlayer.name}</h3>
                </div>
                <div className="modal-content">
                  <div className="player-summary">
                    <span className="pos" style={{ background: getPositionColor(selectedPlayer.position) }}>
                      {selectedPlayer.position}
                    </span>
                    <span className="ovr">{selectedPlayer.overall}</span>
                    <span className="age">{selectedPlayer.age} años</span>
                  </div>
                  
                  <div className="sell-info">
                    <div className="value-box">
                      <span className="label">Valor de mercado</span>
                      <span className="value">{formatMoney(actionModal.value)}</span>
                    </div>
                    <div className="salary-box">
                      <span className="label">Salario actual</span>
                      <span className="value">{formatMoney((selectedPlayer.salary || 0) * WEEKS_PER_YEAR)}/año</span>
                    </div>
                  </div>
                  
                  <div className="impact">
                    <span className="impact-label">💰 Si se vende:</span>
                    <span className="impact-value positive">
                      +{formatMoney(actionModal.value)} + {formatMoney((selectedPlayer.salary || 0) * WEEKS_PER_YEAR)}/año ahorrados
                    </span>
                  </div>
                  
                  <p className="note">El jugador aparecerá en el mercado. Otros equipos pueden hacer ofertas.</p>
                  
                  <div className="modal-actions">
                    <button className="btn-confirm" onClick={confirmSell}>
                      🏷️ Poner en venta
                    </button>
                    <button className="btn-cancel" onClick={closeModal}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {/* LIBERAR */}
            {actionModal.type === 'release' && (
              <>
                <div className="modal-header release">
                  <h3>👋 Liberar a {selectedPlayer.name}</h3>
                </div>
                <div className="modal-content">
                  <div className="player-summary">
                    <span className="pos" style={{ background: getPositionColor(selectedPlayer.position) }}>
                      {selectedPlayer.position}
                    </span>
                    <span className="ovr">{selectedPlayer.overall}</span>
                    <span className="age">{selectedPlayer.age} años</span>
                  </div>
                  
                  <div className="warning-box">
                    <span className="warning-icon">⚠️</span>
                    <span className="warning-text">
                      El jugador se irá GRATIS. No recibirás dinero por él.
                    </span>
                  </div>
                  
                  <div className="impact">
                    <span className="impact-label">💰 Ahorrarás en salarios:</span>
                    <span className="impact-value positive">
                      +{formatMoney(actionModal.yearlySaved)}/año
                    </span>
                  </div>
                  
                  {selectedPlayer.overall >= 75 && (
                    <div className="morale-warning">
                      <span>😔 Esto puede afectar la moral del vestuario</span>
                    </div>
                  )}
                  
                  <div className="modal-actions">
                    <button className="btn-confirm danger" onClick={confirmRelease}>
                      👋 Liberar jugador
                    </button>
                    <button className="btn-cancel" onClick={closeModal}>
                      Cancelar
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
