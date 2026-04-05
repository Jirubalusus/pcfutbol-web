import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useTranslation } from 'react-i18next';
import { 
  Landmark, TrendingUp, TrendingDown, Wallet, Users, 
  Building2, ShoppingCart, Trophy, Ticket, BadgeDollarSign,
  ArrowUpRight, ArrowDownRight, Minus, Store, ChevronDown, ChevronRight
} from 'lucide-react';
import { STADIUM_SERVICES } from '../../game/stadiumEconomy';
import { getBaseCommercialIncome, getFacilityCostMultiplier } from '../../game/leagueTiers';
import AnimatedNumber from '../AnimatedNumber/AnimatedNumber';
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
  const { t } = useTranslation();
  
  const fmt = (amount) => {
    if (amount === 0) return '€0';
    const abs = Math.abs(amount);
    if (abs >= 1000000) return `€${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `€${Math.round(abs / 1000)}K`;
    return `€${abs}`;
  };
  
  const fmtSigned = (amount) => {
    const prefix = amount > 0 ? '+' : amount < 0 ? '-' : '';
    return `${prefix}${fmt(Math.abs(amount))}`;
  };
  
  const finances = useMemo(() => {
    const stadium = state.stadium || {};
    const players = state.team?.players || [];
    const rawLevel = state.facilities?.stadium ?? stadium.level ?? 0;
    const level = Math.max(0, Math.min(STADIUM_LEVELS.length - 1, rawLevel));
    const currentLevel = STADIUM_LEVELS[level];
    
    const seasonTickets = stadium.seasonTicketsFinal ?? 0;
    const seasonTicketPrice = stadium.seasonTicketPriceFinal ?? stadium.seasonTicketPrice ?? 400;
    const seasonTicketIncome = seasonTickets * seasonTicketPrice;
    const accumulatedTicketIncome = stadium.accumulatedTicketIncome ?? 0;
    const namingIncome = stadium.naming?.yearlyIncome ?? 0;
    const transferEarned = state.transfersEarned ?? 0;
    const prizeIncome = state.prizeIncome ?? 0;
    
    // Commercial weekly income (matches GameContext ADVANCE_WEEK logic)
    const sponsorLevel = state.facilities?.sponsorship || 0;
    const baseCommercial = getBaseCommercialIncome(state.leagueId);
    const facilityBonus = [0, 8000, 53000, 158000, 316000, 527000][sponsorLevel] || 0;
    const glorySponsorMult = state.gloryData?.sponsorMultiplier || 1;
    const sponsorWeekly = Math.round((baseCommercial + facilityBonus) * glorySponsorMult);
    // Sponsorship is paid every ADVANCE_WEEK (including cup/european weeks)
    // Use total calendar weeks (max week number in fixtures) for accurate projection
    const totalCalendarWeeks = (state.fixtures || []).length > 0 ? Math.max(...state.fixtures.map(f => f.week || 0)) : 38;
    const sponsorAnnualIncome = sponsorWeekly * totalCalendarWeeks;
    
    // Stadium services income (accumulated, paid at end of season)
    const accumulatedServicesIncome = stadium.accumulatedServicesIncome ?? 0;
    const servicesBreakdown = stadium.accumulatedServicesBreakdown || {};
    
    const totalIncome = seasonTicketIncome + accumulatedTicketIncome + namingIncome + transferEarned + prizeIncome + sponsorAnnualIncome + accumulatedServicesIncome;
    
    const weeklySalaries = players.reduce((sum, p) => sum + (p.salary || 0), 0);
    const annualSalaries = weeklySalaries * WEEKS_PER_YEAR;
    const maintenanceCost = currentLevel?.maintenance || 500000;
    const transferSpent = state.transfersSpent ?? 0;
    const totalExpenses = annualSalaries + maintenanceCost + transferSpent;
    const balance = totalIncome - totalExpenses;
    
    return {
      currentBudget: state.money || 0,
      weeklySalaries, annualSalaries,
      seasonTickets, seasonTicketPrice, seasonTicketIncome,
      accumulatedTicketIncome, namingIncome,
      maintenanceCost, transferSpent, transferEarned, prizeIncome,
      sponsorAnnualIncome, sponsorWeekly, totalCalendarWeeks,
      accumulatedServicesIncome, servicesBreakdown,
      totalIncome, totalExpenses, balance,
      level: currentLevel?.name || 'Municipal'
    };
  }, [state]);
  
  const incomeItems = [
    { icon: <Ticket size={16} />, label: t('finance.seasonTickets'), amount: finances.seasonTicketIncome, detail: finances.seasonTickets > 0 ? `${finances.seasonTickets.toLocaleString()} × €${finances.seasonTicketPrice}` : null },
    { icon: <Users size={16} />, label: t('finance.ticketsSold'), amount: finances.accumulatedTicketIncome + finances.accumulatedServicesIncome, detail: t('finance.accumulatedMatches'), expandable: true },
    finances.namingIncome > 0 && { icon: <BadgeDollarSign size={16} />, label: t('finance.stadiumNaming'), amount: finances.namingIncome },
    finances.transferEarned > 0 && { icon: <ShoppingCart size={16} />, label: t('finance.playerSales'), amount: finances.transferEarned },
    finances.prizeIncome > 0 && { icon: <Trophy size={16} />, label: t('finance.prizesRewards'), amount: finances.prizeIncome },
    { icon: <Building2 size={16} />, label: t('facilities.facilityNames.sponsorship', 'Comercial'), amount: finances.sponsorAnnualIncome, detail: `${fmt(finances.sponsorWeekly)}/${t('common.week', 'sem')} × ${finances.totalCalendarWeeks}` },
  ].filter(Boolean);
  
  const expenseItems = [
    { icon: <Users size={16} />, label: t('finance.squadSalaries'), amount: finances.annualSalaries, detail: `${fmt(finances.weeklySalaries)}/sem × 52` },
    { icon: <Building2 size={16} />, label: t('finance.stadiumMaintenance'), amount: finances.maintenanceCost, detail: finances.level },
    finances.transferSpent > 0 && { icon: <ShoppingCart size={16} />, label: t('finance.signings'), amount: finances.transferSpent },
  ].filter(Boolean);

  const [servicesOpen, setServicesOpen] = useState(false);
  
  const SERVICE_LABELS = {
    catering: t('stadium.serviceCatering', 'Restauración'),
    merchandise: t('stadium.serviceMerchandise', 'Tienda Oficial'),
    parking: t('stadium.serviceParking', 'Aparcamiento'),
    events: t('stadium.serviceEvents', 'Eventos y Alquiler'),
    vip: t('stadium.serviceVip', 'Palcos VIP'),
  };
  const SERVICE_ICONS = { catering: '🍔', merchandise: '🛍️', parking: '🅿️', events: '🎤', vip: '📺' };

  const balanceTrend = finances.balance > 0 ? 'positive' : finances.balance < 0 ? 'negative' : 'neutral';
  
  return (
    <div className="finance fade-in-up">
      {/* Hero Budget Card */}
      <div className="finance__hero">
        <div className="finance__hero-bg" />
        <div className="finance__hero-content">
          <div className="finance__hero-icon">
            <Landmark size={28} />
          </div>
          <div className="finance__hero-info">
            <span className="finance__hero-label">{t('finance.currentBudget')}</span>
            <span className="finance__hero-amount"><AnimatedNumber value={finances.currentBudget} prefix="€" /></span>
          </div>
        </div>
        <div className="finance__hero-stats">
          <div className="finance__hero-stat income">
            <ArrowUpRight size={14} />
            <span>{fmt(finances.totalIncome)}</span>
          </div>
          <div className="finance__hero-stat expense">
            <ArrowDownRight size={14} />
            <span>{fmt(finances.totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Income Card */}
      <div className="finance__card finance__card--income">
        <div className="finance__card-header">
          <TrendingUp size={18} />
          <h3>{t('finance.income')}</h3>
          <span className="finance__card-total positive">{fmtSigned(finances.totalIncome)}</span>
        </div>
        <div className="finance__card-body">
          {incomeItems.map((item, i) => (
            <React.Fragment key={i}>
              <div className={`finance__line${item.expandable ? ' finance__line--clickable' : ''}`}
                   onClick={item.expandable ? () => setServicesOpen(o => !o) : undefined}>
                <div className="finance__line-icon income">{item.icon}</div>
                <div className="finance__line-info">
                  <span className="finance__line-label">
                    {item.expandable && (servicesOpen ? <ChevronDown size={14} style={{marginRight:4,verticalAlign:'middle'}} /> : <ChevronRight size={14} style={{marginRight:4,verticalAlign:'middle'}} />)}
                    {item.label}
                  </span>
                  {item.detail && <span className="finance__line-detail">{item.detail}</span>}
                </div>
                <span className="finance__line-amount positive">+{fmt(item.amount)}</span>
              </div>
              {item.expandable && servicesOpen && (
                <>
                  <div className="finance__line finance__line--sub">
                    <div className="finance__line-icon income"><Ticket size={14} /></div>
                    <div className="finance__line-info">
                      <span className="finance__line-label">{t('finance.ticketsSold')}</span>
                    </div>
                    <span className="finance__line-amount positive">+{fmt(finances.accumulatedTicketIncome)}</span>
                  </div>
                  {Object.entries(finances.servicesBreakdown).filter(([,v]) => v > 0).map(([key, amount]) => (
                    <div key={key} className="finance__line finance__line--sub">
                      <div className="finance__line-icon income"><span style={{fontSize:14}}>{SERVICE_ICONS[key]}</span></div>
                      <div className="finance__line-info">
                        <span className="finance__line-label">{SERVICE_LABELS[key] || key}</span>
                      </div>
                      <span className="finance__line-amount positive">+{fmt(amount)}</span>
                    </div>
                  ))}
                </>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Expenses Card */}
      <div className="finance__card finance__card--expense">
        <div className="finance__card-header">
          <TrendingDown size={18} />
          <h3>{t('finance.expenses')}</h3>
          <span className="finance__card-total negative">-{fmt(finances.totalExpenses)}</span>
        </div>
        <div className="finance__card-body">
          {expenseItems.map((item, i) => (
            <div key={i} className="finance__line">
              <div className="finance__line-icon expense">{item.icon}</div>
              <div className="finance__line-info">
                <span className="finance__line-label">{item.label}</span>
                {item.detail && <span className="finance__line-detail">{item.detail}</span>}
              </div>
              <span className="finance__line-amount negative">-{fmt(item.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Balance Footer */}
      <div className={`finance__balance finance__balance--${balanceTrend}`}>
        <div className="finance__balance-icon">
          {balanceTrend === 'positive' ? <TrendingUp size={20} /> : balanceTrend === 'negative' ? <TrendingDown size={20} /> : <Minus size={20} />}
        </div>
        <span className="finance__balance-label">{t('finance.seasonBalance')}</span>
        <span className="finance__balance-amount">{finances.balance >= 0 ? '+' : '-'}<AnimatedNumber value={Math.abs(finances.balance)} prefix="€" /></span>
      </div>
    </div>
  );
}
