import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Trophy, ChevronDown, ChevronUp, Activity, ShieldAlert,
  HeartPulse, CreditCard, TrendingUp, TrendingDown, Minus,
  ArrowRight, CircleAlert, CircleCheck, X
} from 'lucide-react';
import './SimulationSummary.scss';

/**
 * SimulationSummary — modal shown after simulation with a visual recap.
 *
 * Props:
 *   data: {
 *     playerMatch: { homeTeam, awayTeam, homeScore, awayScore, events, isHome },
 *     leagueResults: [{ homeTeam, awayTeam, homeScore, awayScore }],
 *     cupResult: { homeTeam, awayTeam, homeScore, awayScore } | null,
 *     europeanResult: { homeTeam, awayTeam, homeScore, awayScore, competition } | null,
 *     newInjuries: [{ name, weeksOut }],
 *     recovered: [name],
 *     cards: { yellow: [name], red: [name] },
 *     standingBefore: number,
 *     standingAfter: number,
 *     weekRange: { from, to },  // for batch sim
 *   }
 *   onClose: () => void
 */
export default function SimulationSummary({ data, onClose }) {
  const { t } = useTranslation();

  if (!data) return null;

  const {
    playerMatch,
    batchPlayerResults,
    leagueResults = [],
    cupResult,
    europeanResult,
    newInjuries = [],
    recovered = [],
    cards = { yellow: [], red: [] },
    standingBefore,
    standingAfter,
    weekRange,
  } = data;

  const standingDiff = standingBefore - standingAfter; // positive = improved

  return (
    <div className="sim-summary-overlay" onClick={onClose}>
      <div className="sim-summary" onClick={e => e.stopPropagation()}>
        <header className="sim-summary__header">
          <Trophy size={22} />
          <h2>{weekRange && weekRange.to > weekRange.from
            ? t('simulation.summaryRange', { from: weekRange.from, to: weekRange.to })
            : t('simulation.summary')
          }</h2>
        </header>

        <div className="sim-summary__body">
          {/* BATCH RESULTS (multi-week sim) */}
          {batchPlayerResults && (
            <Section title={t('simulation.yourResults')} icon={<Activity size={18} />} defaultOpen>
              <div className="sim-summary__batch-stats">
                <div className="batch-record">
                  <span className="batch-stat win">{batchPlayerResults.wins}W</span>
                  <span className="batch-stat draw">{batchPlayerResults.draws}D</span>
                  <span className="batch-stat loss">{batchPlayerResults.losses}L</span>
                </div>
                <div className="batch-goals">
                  {t('simulation.goals')}: {batchPlayerResults.goalsFor} - {batchPlayerResults.goalsAgainst}
                </div>
              </div>
              <div className="sim-summary__batch-matches">
                {batchPlayerResults.matches.map((m, i) => (
                  <div key={i} className={`batch-match ${m.gf > m.ga ? 'win' : m.gf < m.ga ? 'loss' : 'draw'}`}>
                    <span className="batch-match__opp">{String(m.opponent)}</span>
                    <span className="batch-match__score">{m.gf}-{m.ga}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* YOUR MATCH (single week) */}
          {!batchPlayerResults && playerMatch && (
            <Section title={t('simulation.yourMatch')} icon={<Activity size={18} />} defaultOpen>
              <div className="sim-summary__match sim-summary__match--main">
                <span className={`team ${playerMatch.isHome ? 'highlight' : ''}`}>{String(playerMatch.homeTeam || '')}</span>
                <span className="score">{playerMatch.homeScore ?? 0} - {playerMatch.awayScore ?? 0}</span>
                <span className={`team ${!playerMatch.isHome ? 'highlight' : ''}`}>{String(playerMatch.awayTeam || '')}</span>
              </div>
              {playerMatch.events?.filter(e => e.type === 'goal').length > 0 && (
                <div className="sim-summary__scorers">
                  {playerMatch.events.filter(e => e.type === 'goal').map((e, i) => {
                    const pName = typeof e.player === 'string' ? e.player : (e.player?.name || e.playerName || '?');
                    return <span key={i} className="scorer">⚽ {pName} {e.minute}'</span>;
                  })}
                </div>
              )}
            </Section>
          )}

          {/* LEAGUE RESULTS */}
          {leagueResults.length > 0 && (
            <Section title={t('simulation.leagueResults')} icon={<Trophy size={18} />}>
              <div className="sim-summary__results">
                {leagueResults.map((m, i) => (
                  <div key={i} className="sim-summary__match sim-summary__match--small">
                    <span className="team">{String(m.homeTeam || '')}</span>
                    <span className="score">{m.homeScore ?? 0} - {m.awayScore ?? 0}</span>
                    <span className="team">{String(m.awayTeam || '')}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* CUP */}
          {cupResult && (
            <Section title={t('simulation.cupResults')} icon={<ShieldAlert size={18} />}>
              <div className="sim-summary__match sim-summary__match--small">
                <span className="team">{cupResult.homeTeam}</span>
                <span className="score">{cupResult.homeScore} - {cupResult.awayScore}</span>
                <span className="team">{cupResult.awayTeam}</span>
              </div>
            </Section>
          )}

          {/* EUROPEAN / SA */}
          {europeanResult && (
            <Section title={europeanResult.competition || t('simulation.europeanResults')} icon={<Trophy size={18} />}>
              <div className="sim-summary__match sim-summary__match--small">
                <span className="team">{europeanResult.homeTeam}</span>
                <span className="score">{europeanResult.homeScore} - {europeanResult.awayScore}</span>
                <span className="team">{europeanResult.awayTeam}</span>
              </div>
            </Section>
          )}

          {/* INJURIES */}
          {newInjuries.length > 0 && (
            <Section title={t('simulation.injuries')} icon={<CircleAlert size={18} />} variant="danger">
              <ul className="sim-summary__list sim-summary__list--danger">
                {newInjuries.map((inj, i) => (
                  <li key={i}>
                    <X size={14} className="icon-danger" />
                    <span className="name">{inj.name}</span>
                    <span className="detail">{t('simulation.weeksOut', { weeks: inj.weeksOut })}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* RECOVERED */}
          {recovered.length > 0 && (
            <Section title={t('simulation.recovered')} icon={<CircleCheck size={18} />} variant="success">
              <ul className="sim-summary__list sim-summary__list--success">
                {recovered.map((name, i) => (
                  <li key={i}>
                    <HeartPulse size={14} className="icon-success" />
                    <span className="name">{name}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* CARDS */}
          {(cards.yellow.length > 0 || cards.red.length > 0) && (
            <Section title={t('simulation.cards')} icon={<CreditCard size={18} />} variant="warning">
              <ul className="sim-summary__list sim-summary__list--cards">
                {cards.yellow.map((name, i) => (
                  <li key={`y${i}`}>
                    <span className="card-icon card-icon--yellow" />
                    <span className="name">{name}</span>
                  </li>
                ))}
                {cards.red.map((name, i) => (
                  <li key={`r${i}`}>
                    <span className="card-icon card-icon--red" />
                    <span className="name">{name}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* STANDING */}
          {standingAfter != null && (
            <Section title={t('simulation.standing')} icon={standingDiff > 0 ? <TrendingUp size={18} /> : standingDiff < 0 ? <TrendingDown size={18} /> : <Minus size={18} />}>
              <div className="sim-summary__standing">
                <span className="pos-before">{standingBefore}º</span>
                <ArrowRight size={16} />
                <span className={`pos-after ${standingDiff > 0 ? 'up' : standingDiff < 0 ? 'down' : ''}`}>
                  {standingAfter}º
                </span>
                {standingDiff !== 0 && (
                  <span className={`diff ${standingDiff > 0 ? 'up' : 'down'}`}>
                    ({standingDiff > 0 ? '+' : ''}{standingDiff})
                  </span>
                )}
              </div>
            </Section>
          )}
        </div>

        <footer className="sim-summary__footer">
          <button className="sim-summary__continue" onClick={onClose}>
            {t('simulation.continue')}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, icon, children, defaultOpen = false, variant = '' }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`sim-summary__section ${variant ? `sim-summary__section--${variant}` : ''}`}>
      <button className="sim-summary__section-header" onClick={() => setOpen(!open)}>
        {icon}
        <span>{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="sim-summary__section-content">{children}</div>}
    </div>
  );
}
