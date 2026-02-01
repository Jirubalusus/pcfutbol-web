import React, { useState, useMemo } from 'react';
import { AlertTriangle, FileText, X, Check, XCircle, MessageSquare, RefreshCw, ClipboardList, Star } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { 
  PERSONALITIES, 
  SPECIAL_GOALS,
  evaluateRenewalOffer,
  generateRenewalDemand,
  calculatePlayerHappiness
} from '../../game/playerPersonality';
import './Renewals.scss';

export default function Renewals() {
  const { state, dispatch } = useGame();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [renewalOffer, setRenewalOffer] = useState(null);
  const [negotiationResult, setNegotiationResult] = useState(null);
  
  const players = state.team?.players || [];
  
  // Players needing renewal (contract <= 1 year or unhappy)
  const playersNeedingAttention = useMemo(() => {
    return players.map(player => {
      const contractYears = player.personality?.contractYears || 2;
      const happiness = player.personality?.happiness || 50;
      const wantsToLeave = player.personality?.wantsToLeave || false;
      const minutesPlayed = player.personality?.minutesPlayed || 50;
      
      let urgency = 'normal';
      let urgencyReason = '';
      
      if (contractYears <= 1) {
        urgency = 'high';
        urgencyReason = 'Contrato expira pronto';
      } else if (wantsToLeave) {
        urgency = 'critical';
        urgencyReason = 'Quiere irse';
      } else if (happiness <= 35) {
        urgency = 'high';
        urgencyReason = 'Muy descontento';
      } else if (happiness <= 50) {
        urgency = 'medium';
        urgencyReason = 'Descontento';
      }
      
      return {
        ...player,
        contractYears,
        happiness,
        wantsToLeave,
        minutesPlayed,
        urgency,
        urgencyReason
      };
    }).sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, normal: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }, [players]);
  
  const startRenewal = (player) => {
    const demand = generateRenewalDemand(player, {
      reputation: state.team?.reputation || 80,
      leaguePosition: state.leagueTable?.findIndex(t => t.teamId === state.teamId) + 1 || 10
    });
    
    setSelectedPlayer(player);
    setRenewalOffer({
      newSalary: demand.salary,
      years: demand.years,
      promisedRole: player.minutesPlayed >= 60 ? 'starter' : 'rotation',
      playerDemand: demand
    });
    setNegotiationResult(null);
  };
  
  const submitRenewalOffer = () => {
    if (!selectedPlayer || !renewalOffer) return;
    
    const teamContext = {
      reputation: state.team?.reputation || 80,
      leaguePosition: state.leagueTable?.findIndex(t => t.teamId === state.teamId) + 1 || 10
    };
    
    const result = evaluateRenewalOffer(selectedPlayer, teamContext, renewalOffer);
    setNegotiationResult(result);
    
    if (result.response === 'accept') {
      // Aplicar renovación
      const updatedPlayer = {
        ...selectedPlayer,
        salary: renewalOffer.newSalary,
        personality: {
          ...selectedPlayer.personality,
          contractYears: renewalOffer.years,
          happiness: Math.min(100, (selectedPlayer.personality?.happiness || 50) + 15),
          wantsToLeave: false,
          lastRenewalOffer: state.currentWeek
        }
      };
      
      dispatch({
        type: 'UPDATE_PLAYER',
        payload: updatedPlayer
      });
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'renewal',
          title: `${selectedPlayer.name} ha renovado`,
          content: `Nuevo contrato: ${renewalOffer.years} años, ${formatMoney(renewalOffer.newSalary)}/sem`,
          date: `Semana ${state.currentWeek}`
        }
      });
      
      setTimeout(() => {
        setSelectedPlayer(null);
        setRenewalOffer(null);
        setNegotiationResult(null);
      }, 2000);
    }
  };
  
  const acceptCounterOffer = () => {
    if (!negotiationResult?.counterOffer) return;
    
    setRenewalOffer({
      ...renewalOffer,
      newSalary: negotiationResult.counterOffer.salary,
      years: negotiationResult.counterOffer.years,
      promisedRole: negotiationResult.counterOffer.promisedRole
    });
    setNegotiationResult(null);
  };
  
  const rejectAndClose = () => {
    if (negotiationResult?.response === 'reject') {
      // El jugador está más descontento
      const updatedPlayer = {
        ...selectedPlayer,
        personality: {
          ...selectedPlayer.personality,
          happiness: Math.max(0, (selectedPlayer.personality?.happiness || 50) - 10),
          wantsToLeave: true
        }
      };
      
      dispatch({
        type: 'UPDATE_PLAYER',
        payload: updatedPlayer
      });
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          type: 'renewal',
          title: `${selectedPlayer.name} rechaza renovar`,
          content: `El jugador está descontento y quiere salir del club`,
          date: `Semana ${state.currentWeek}`
        }
      });
    }
    
    setSelectedPlayer(null);
    setRenewalOffer(null);
    setNegotiationResult(null);
  };
  
  const formatMoney = (amount) => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `€${(amount / 1000).toFixed(0)}K`;
    return `€${amount}`;
  };
  
  const getPositionColor = (pos) => {
    if (pos === 'GK') return 'var(--color-warning)';
    if (['RB', 'CB', 'LB'].includes(pos)) return '#3498db';
    if (['CDM', 'CM', 'CAM'].includes(pos)) return 'var(--color-success)';
    return 'var(--color-danger)';
  };
  
  const getHappinessColor = (happiness) => {
    if (happiness >= 70) return 'var(--color-success)';
    if (happiness >= 50) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };
  
  const getUrgencyClass = (urgency) => {
    return `urgency-${urgency}`;
  };
  
  return (
    <div className="renewals">
      <div className="renewals__header">
        <h2>Renovaciones de Contrato</h2>
        <p className="renewals__subtitle">
          Gestiona los contratos de tu plantilla
        </p>
      </div>
      
      <div className="renewals__summary">
        <div className="summary-card critical">
          <span className="count">
            {playersNeedingAttention.filter(p => p.urgency === 'critical').length}
          </span>
          <span className="label">Quieren irse</span>
        </div>
        <div className="summary-card high">
          <span className="count">
            {playersNeedingAttention.filter(p => p.urgency === 'high').length}
          </span>
          <span className="label">Urgentes</span>
        </div>
        <div className="summary-card medium">
          <span className="count">
            {playersNeedingAttention.filter(p => p.urgency === 'medium').length}
          </span>
          <span className="label">Descontentos</span>
        </div>
      </div>
      
      <div className="renewals__list">
        {playersNeedingAttention.map((player, idx) => {
          const personality = PERSONALITIES[player.personality?.type || 'professional'];
          const specialGoal = player.personality?.specialGoal 
            ? SPECIAL_GOALS[player.personality.specialGoal] 
            : null;
          
          return (
            <div key={idx} className={`renewals__player ${getUrgencyClass(player.urgency)}`}>
              <div className="player-main">
                <span className="pos" style={{ color: getPositionColor(player.position) }}>
                  {player.position}
                </span>
                <div className="details">
                  <span className="name">{player.name}</span>
                  <div className="tags">
                    {personality && (
                      <span className="tag personality" title={personality.description}>
                        {personality.icon} {personality.name}
                      </span>
                    )}
                    {specialGoal && (
                      <span className="tag goal" title={specialGoal.description}>
                        {specialGoal.icon}
                      </span>
                    )}
                  </div>
                </div>
                <div className="stats">
                  <span className="ovr">{player.overall}</span>
                  <span className="age">{player.age} años</span>
                </div>
              </div>
              
              <div className="player-status">
                <div className="status-item">
                  <span className="label">Contrato</span>
                  <span className={`value ${player.contractYears <= 1 ? 'danger' : ''}`}>
                    {player.contractYears} año{player.contractYears !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">Salario</span>
                  <span className="value">{formatMoney(player.salary)}/sem</span>
                </div>
                <div className="status-item">
                  <span className="label">Minutos</span>
                  <span className={`value ${player.minutesPlayed < 40 ? 'danger' : ''}`}>
                    {Math.round(player.minutesPlayed)}%
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">Felicidad</span>
                  <div className="happiness-bar">
                    <div 
                      className="fill" 
                      style={{ 
                        width: `${player.happiness}%`,
                        background: getHappinessColor(player.happiness)
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {player.urgencyReason && (
                <div className={`player-alert ${player.urgency}`}>
                  <AlertTriangle size={14} /> {player.urgencyReason}
                </div>
              )}
              
              <div className="player-actions">
                <button 
                  className="renew-btn"
                  onClick={() => startRenewal(player)}
                  disabled={player.retiring || player.contractYears > 2}
                  title={player.retiring ? "Se retira" : player.contractYears > 2 ? "No necesita renovar (más de 2 años de contrato)" : "Negociar renovación"}
                >
                  <FileText size={14} /> Negociar Renovación
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Renewal Modal */}
      {selectedPlayer && renewalOffer && (
        <div className="renewals__modal-overlay">
          <div className="renewals__modal">
            <div className="modal-header">
              <h3>Renovación: {selectedPlayer.name}</h3>
              <button onClick={() => {
                setSelectedPlayer(null);
                setRenewalOffer(null);
                setNegotiationResult(null);
              }}><X size={16} /></button>
            </div>
            
            <div className="modal-content">
              {/* Player Info */}
              <div className="player-info">
                <div className="player-card">
                  <span className="pos" style={{ background: getPositionColor(selectedPlayer.position) }}>
                    {selectedPlayer.position}
                  </span>
                  <span className="ovr">{selectedPlayer.overall}</span>
                  <span className="name">{selectedPlayer.name}</span>
                </div>
                
                <div className="player-personality">
                  {PERSONALITIES[selectedPlayer.personality?.type] && (
                    <div className="trait">
                      <span className="icon">{PERSONALITIES[selectedPlayer.personality.type].icon}</span>
                      <div>
                        <span className="name">{PERSONALITIES[selectedPlayer.personality.type].name}</span>
                        <span className="desc">{PERSONALITIES[selectedPlayer.personality.type].description}</span>
                      </div>
                    </div>
                  )}
                  {selectedPlayer.personality?.specialGoal && SPECIAL_GOALS[selectedPlayer.personality.specialGoal] && (
                    <div className="trait special">
                      <span className="icon">{SPECIAL_GOALS[selectedPlayer.personality.specialGoal].icon}</span>
                      <div>
                        <span className="name">{SPECIAL_GOALS[selectedPlayer.personality.specialGoal].name}</span>
                        <span className="desc">{SPECIAL_GOALS[selectedPlayer.personality.specialGoal].description}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="player-current">
                  <div className="stat">
                    <span>Salario actual:</span>
                    <span>{formatMoney(selectedPlayer.salary)}/sem</span>
                  </div>
                  <div className="stat">
                    <span>Contrato actual:</span>
                    <span>{selectedPlayer.personality?.contractYears || 2} años</span>
                  </div>
                  <div className="stat">
                    <span>Minutos jugados:</span>
                    <span>{Math.round(selectedPlayer.personality?.minutesPlayed || 50)}%</span>
                  </div>
                  <div className="stat">
                    <span>Felicidad:</span>
                    <span style={{ color: getHappinessColor(selectedPlayer.personality?.happiness || 50) }}>
                      {selectedPlayer.personality?.happiness || 50}%
                    </span>
                  </div>
                </div>
                
                {renewalOffer.playerDemand?.conditions?.length > 0 && (
                  <div className="player-demands">
                    <h4><AlertTriangle size={14} /> Condiciones del jugador:</h4>
                    {renewalOffer.playerDemand.conditions.map((cond, i) => (
                      <div key={i} className={`demand ${cond.required ? 'required' : ''}`}>
                        {cond.text} {cond.required && '(obligatorio)'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Negotiation Result */}
              {negotiationResult && (
                <div className={`negotiation-result ${negotiationResult.response}`}>
                  <h4>
                    {negotiationResult.response === 'accept' && <><Check size={14} /> ¡Acepta la oferta!</>}
                    {negotiationResult.response === 'negotiate' && <><MessageSquare size={14} /> Quiere negociar</>}
                    {negotiationResult.response === 'reject' && <><XCircle size={14} /> Rechaza la oferta</>}
                  </h4>
                  
                  <div className="reasons">
                    {negotiationResult.reasons.map((reason, i) => (
                      <div key={i} className={`reason ${reason.positive ? 'positive' : 'negative'}`}>
                        {reason.positive ? <Check size={12} /> : <XCircle size={12} />} {reason.text}
                      </div>
                    ))}
                  </div>
                  
                  {negotiationResult.response === 'negotiate' && negotiationResult.counterOffer && (
                    <div className="counter-offer">
                      <h5>Contraoferta del jugador:</h5>
                      <p>Salario: <strong>{formatMoney(negotiationResult.counterOffer.salary)}/sem</strong></p>
                      {negotiationResult.counterOffer.promisedRole === 'starter' && (
                        <p>Exige: <strong>Rol de titular</strong></p>
                      )}
                      <div className="counter-actions">
                        <button className="accept" onClick={acceptCounterOffer}>
                          Aceptar contraoferta
                        </button>
                        <button className="reject" onClick={rejectAndClose}>
                          Abandonar negociación
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {negotiationResult.response === 'accept' && (
                    <p className="success-msg">El jugador firmará el nuevo contrato</p>
                  )}
                  
                  {negotiationResult.response === 'reject' && (
                    <div className="reject-actions">
                      <p>El jugador no está interesado en renovar con estas condiciones.</p>
                      <button onClick={rejectAndClose}>Cerrar</button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Offer Form */}
              {!negotiationResult && (
                <div className="offer-form">
                  <h4>Tu oferta</h4>
                  
                  <div className="form-group">
                    <label>Nuevo salario semanal</label>
                    <div className="input-row">
                      <button onClick={() => setRenewalOffer({
                        ...renewalOffer,
                        newSalary: Math.max(10000, renewalOffer.newSalary - 10000)
                      })}>-10K</button>
                      <span className="value">{formatMoney(renewalOffer.newSalary)}</span>
                      <button onClick={() => setRenewalOffer({
                        ...renewalOffer,
                        newSalary: renewalOffer.newSalary + 10000
                      })}>+10K</button>
                    </div>
                    <div className="compare">
                      vs actual: {formatMoney(selectedPlayer.salary)} 
                      ({renewalOffer.newSalary > selectedPlayer.salary ? '+' : ''}
                      {Math.round((renewalOffer.newSalary - selectedPlayer.salary) / selectedPlayer.salary * 100)}%)
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Duración del contrato</label>
                    <div className="years-selector">
                      {[1, 2, 3, 4, 5].map(y => (
                        <button 
                          key={y}
                          className={renewalOffer.years === y ? 'active' : ''}
                          onClick={() => setRenewalOffer({ ...renewalOffer, years: y })}
                        >
                          {y} año{y > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Rol prometido</label>
                    <div className="role-selector">
                      <button 
                        className={renewalOffer.promisedRole === 'starter' ? 'active' : ''}
                        onClick={() => setRenewalOffer({ ...renewalOffer, promisedRole: 'starter' })}
                      >
                        <Star size={14} /> Titular
                      </button>
                      <button 
                        className={renewalOffer.promisedRole === 'rotation' ? 'active' : ''}
                        onClick={() => setRenewalOffer({ ...renewalOffer, promisedRole: 'rotation' })}
                      >
                        <RefreshCw size={14} /> Rotación
                      </button>
                      <button 
                        className={renewalOffer.promisedRole === 'backup' ? 'active' : ''}
                        onClick={() => setRenewalOffer({ ...renewalOffer, promisedRole: 'backup' })}
                      >
                        <ClipboardList size={14} /> Suplente
                      </button>
                    </div>
                  </div>
                  
                  <div className="offer-summary">
                    <p>
                      <strong>Coste semanal:</strong> {formatMoney(renewalOffer.newSalary)}
                    </p>
                    <p>
                      <strong>El jugador pide:</strong> {formatMoney(renewalOffer.playerDemand.salary)}/sem, 
                      {renewalOffer.playerDemand.years} años
                    </p>
                  </div>
                  
                  <button className="submit-btn" onClick={submitRenewalOffer}>
                    Enviar Oferta
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
