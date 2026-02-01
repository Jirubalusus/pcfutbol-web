import React, { useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import './Finance.scss';

const WEEKS_PER_YEAR = 52;

const STADIUM_LEVELS = [
  { name: 'Municipal', capacity: 8000, maintenance: 500000 },
  { name: 'Moderno', capacity: 18000, maintenance: 1200000 },
  { name: 'Grande', capacity: 35000, maintenance: 2500000 },
  { name: 'Élite', capacity: 55000, maintenance: 4000000 },
  { name: 'Legendario', capacity: 80000, maintenance: 6000000 }
];

export default function Finance() {
  const { state } = useGame();
  
  const formatMoney = (amount) => {
    if (amount === 0) return '€0';
    const abs = Math.abs(amount);
    const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
    if (abs >= 1000000) return `${sign}€${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${sign}€${(abs / 1000).toFixed(0)}K`;
    return `${sign}€${abs}`;
  };
  
  const formatMoneyPlain = (amount) => {
    const abs = Math.abs(amount);
    if (abs >= 1000000) return `€${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `€${(abs / 1000).toFixed(0)}K`;
    return `€${abs}`;
  };
  
  const finances = useMemo(() => {
    const stadium = state.stadium || {};
    const players = state.team?.players || [];
    const rawLevel = state.facilities?.stadium ?? stadium.level ?? 0;
    const level = Math.max(0, Math.min(STADIUM_LEVELS.length - 1, rawLevel));
    const currentLevel = STADIUM_LEVELS[level];
    
    // === INGRESOS ===
    
    // Abonados
    const seasonTickets = stadium.seasonTicketsFinal ?? 0;
    const seasonTicketPrice = stadium.seasonTicketPriceFinal ?? stadium.seasonTicketPrice ?? 400;
    const seasonTicketIncome = seasonTickets * seasonTicketPrice;
    
    // Entradas acumuladas (ya vendidas en partidos jugados)
    const accumulatedTicketIncome = stadium.accumulatedTicketIncome ?? 0;
    
    // Naming
    const namingIncome = stadium.naming?.yearlyIncome ?? 0;
    
    // Fichajes
    const transferEarned = state.transfersEarned ?? 0;
    
    // Premios
    const prizeIncome = state.prizeIncome ?? 0;
    
    // Total ingresos
    const totalIncome = seasonTicketIncome + accumulatedTicketIncome + namingIncome + transferEarned + prizeIncome;
    
    // === GASTOS ===
    
    // Salarios: se pagan a final de temporada (anual completo)
    const weeklySalaries = players.reduce((sum, p) => sum + (p.salary || 0), 0);
    const weeksPlayed = state.currentWeek || 1;
    const annualSalaries = weeklySalaries * WEEKS_PER_YEAR;
    // No se descuentan semanalmente — se pagan al final de temporada
    const salariesPaid = 0;
    
    // Mantenimiento estadio
    const maintenanceCost = currentLevel?.maintenance || 500000;
    
    // Fichajes comprados
    const transferSpent = state.transfersSpent ?? 0;
    
    // Total gastos (salarios se pagan a fin de temporada, se muestra como pendiente)
    const totalExpenses = annualSalaries + maintenanceCost + transferSpent;
    
    // Balance
    const balance = totalIncome - totalExpenses;
    
    return {
      currentBudget: state.money || 0,
      weeklySalaries,
      annualSalaries,
      weeksPlayed,
      salariesPaid,
      seasonTickets,
      seasonTicketPrice,
      seasonTicketIncome,
      accumulatedTicketIncome,
      namingIncome,
      maintenanceCost,
      transferSpent,
      transferEarned,
      prizeIncome,
      totalIncome,
      totalExpenses,
      balance,
      level: currentLevel?.name || 'Municipal'
    };
  }, [state]);
  
  const FinanceRow = ({ label, amount, detail }) => (
    <div className="finance-row">
      <div className="finance-row__label">
        <span>{label}</span>
        {detail && <span className="detail">{detail}</span>}
      </div>
      <span className={`finance-row__amount ${amount > 0 ? 'positive' : amount < 0 ? 'negative' : ''}`}>
        {formatMoney(amount)}
      </span>
    </div>
  );
  
  return (
    <div className="finance">
      <div className="finance__header">
        <h2>Banco</h2>
        <div className="finance__budget">
          <span className="label">Presupuesto actual</span>
          <span className="amount">{formatMoneyPlain(finances.currentBudget)}</span>
        </div>
      </div>
      
      <div className="finance__section">
        <h3>Temporada Actual</h3>
        
        <div className="finance__group">
          <div className="finance__group-title income">Ingresos</div>
          <FinanceRow 
            label="Abonados" 
            amount={finances.seasonTicketIncome}
            detail={finances.seasonTickets > 0 ? `${finances.seasonTickets.toLocaleString()} × €${finances.seasonTicketPrice}` : 'Sin campaña cerrada'}
          />
          <FinanceRow 
            label="Entradas vendidas" 
            amount={finances.accumulatedTicketIncome}
            detail="Acumulado partidos jugados"
          />
          {finances.namingIncome > 0 && (
            <FinanceRow label="Naming del estadio" amount={finances.namingIncome} />
          )}
          {finances.transferEarned > 0 && (
            <FinanceRow label="Ventas de jugadores" amount={finances.transferEarned} />
          )}
          {finances.prizeIncome > 0 && (
            <FinanceRow label="Premios y recompensas" amount={finances.prizeIncome} />
          )}
        </div>
        
        <div className="finance__group">
          <div className="finance__group-title expense">Gastos</div>
          <FinanceRow 
            label="Salarios plantilla (fin temporada)" 
            amount={-finances.annualSalaries}
            detail={`${formatMoneyPlain(finances.weeklySalaries)}/sem × 52 sem — pendiente`}
          />
          <FinanceRow 
            label="Mantenimiento estadio" 
            amount={-finances.maintenanceCost}
            detail={finances.level}
          />
          {finances.transferSpent > 0 && (
            <FinanceRow label="Fichajes" amount={-finances.transferSpent} />
          )}
        </div>
        
        <div className="finance__total">
          <span>Balance temporada</span>
          <span className={finances.balance >= 0 ? 'positive' : 'negative'}>
            {formatMoney(finances.balance)}
          </span>
        </div>
      </div>
    </div>
  );
}
