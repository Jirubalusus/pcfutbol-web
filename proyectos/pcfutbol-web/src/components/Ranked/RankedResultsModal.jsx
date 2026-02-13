import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  getTierByLP, getLPInDivision, calculateLPChange,
  calculateMatchPoints, LP_PER_DIVISION, TIERS
} from './tierUtils';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './RankedResultsModal.scss';

export default function RankedResultsModal({ match, onBackToLobby }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [animPhase, setAnimPhase] = useState('idle'); // idle → filling → done
  const [showTierChange, setShowTierChange] = useState(false);
  const [particles, setParticles] = useState([]);

  const isP1 = match?.player1?.uid === user?.uid;
  const myData = isP1 ? match?.player1 : match?.player2;
  const rivalData = isP1 ? match?.player2 : match?.player1;
  const myKey = isP1 ? 'player1' : 'player2';
  const rivalKey = isP1 ? 'player2' : 'player1';

  const isDisconnection = match?.results?.disconnection;
  const isWin = match?.winner === user?.uid;
  const isDraw = !match?.winner && !isDisconnection;
  const isLoss = !isWin && !isDraw;

  // Calculate LP changes
  const lpCalc = useMemo(() => {
    const myLP = myData?.totalLP || 0;
    const rivalLP = rivalData?.totalLP || 0;

    let lpChange = 0;
    if (isDisconnection) {
      lpChange = isWin ? 20 : -15;
    } else if (isDraw) {
      lpChange = 5;
    } else if (isWin) {
      lpChange = calculateLPChange(myLP, rivalLP, false);
    } else {
      const winnerGain = calculateLPChange(rivalLP, myLP, false);
      lpChange = -Math.ceil(winnerGain * 0.7);
    }

    const oldTotalLP = myLP;
    const newTotalLP = Math.max(0, myLP + lpChange);
    const oldTier = getTierByLP(oldTotalLP);
    const newTier = getTierByLP(newTotalLP);
    const oldLPInDiv = getLPInDivision(oldTotalLP);
    const newLPInDiv = getLPInDivision(newTotalLP);
    const tierChanged = oldTier.id !== newTier.id;
    const isPromotion = tierChanged && newTier.division > oldTier.division;
    const isDemotion = tierChanged && newTier.division < oldTier.division;

    return {
      lpChange, oldTotalLP, newTotalLP,
      oldTier, newTier, oldLPInDiv, newLPInDiv,
      tierChanged, isPromotion, isDemotion
    };
  }, [myData, rivalData, isWin, isDraw, isDisconnection]);

  // Sim results for breakdown
  const mySim = match?.results?.simulation?.[myKey];
  const rivalSim = match?.results?.simulation?.[rivalKey];
  const myPoints = isP1 ? match?.results?.player1Points : match?.results?.player2Points;
  const rivalPoints = isP1 ? match?.results?.player2Points : match?.results?.player1Points;

  // Animation sequence
  useEffect(() => {
    const t1 = setTimeout(() => setAnimPhase('filling'), 800);
    const t2 = setTimeout(() => {
      setAnimPhase('done');
      if (lpCalc.tierChanged) {
        setShowTierChange(true);
        if (lpCalc.isPromotion) {
          // Generate confetti particles
          const p = Array.from({ length: 24 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            delay: Math.random() * 0.6,
            duration: 1.5 + Math.random() * 1.5,
            color: ['#ffd700', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'][i % 5],
            size: 4 + Math.random() * 6,
          }));
          setParticles(p);
        }
      }
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [lpCalc.tierChanged, lpCalc.isPromotion]);

  const resultType = isWin ? 'win' : isDraw ? 'draw' : 'loss';

  return (
    <div className="ranked-results-overlay">
      <div className="ranked-results-card">
        {/* Confetti particles */}
        {particles.length > 0 && (
          <div className="confetti-container">
            {particles.map(p => (
              <div
                key={p.id}
                className="confetti-particle"
                style={{
                  left: `${p.x}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  backgroundColor: p.color,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Result Header */}
        <div className={`result-header result-header--${resultType}`}>
          <span className="result-emoji">
            {isDisconnection ? (isWin ? '🔌' : '😞') : isWin ? '🎉' : isDraw ? '🤝' : '😔'}
          </span>
          <h1 className="result-title">
            {isDisconnection
              ? (isWin ? t('rankedResults.disconnectWin') : t('rankedResults.disconnectLoss'))
              : isWin ? t('rankedResults.victory')
              : isDraw ? t('rankedResults.draw')
              : t('rankedResults.defeat')
            }
          </h1>
        </div>

        {/* Score Summary */}
        {!isDisconnection && (
          <div className="score-summary">
            <div className={`score-team ${isP1 ? 'me' : 'rival'}`}>
              <span className="score-team-name">{mySim?.teamName || t('rankedResults.myTeam')}</span>
              <span className="score-pts">{myPoints ?? '?'} pts</span>
            </div>
            <span className="score-vs">VS</span>
            <div className={`score-team ${!isP1 ? 'me' : 'rival'}`}>
              <span className="score-team-name">{rivalSim?.teamName || t('rankedResults.rivalTeam')}</span>
              <span className="score-pts">{rivalPoints ?? '?'} pts</span>
            </div>
          </div>
        )}

        {/* LP Change Animation */}
        <div className="lp-section">
          <div className={`tier-badge ${showTierChange ? (lpCalc.isPromotion ? 'promotion' : 'demotion') : ''}`}>
            <span className="tier-icon">{showTierChange ? lpCalc.newTier.icon : lpCalc.oldTier.icon}</span>
            <span className="tier-name" style={{ color: showTierChange ? lpCalc.newTier.color : lpCalc.oldTier.color }}>
              {showTierChange ? lpCalc.newTier.name : lpCalc.oldTier.name}
            </span>
          </div>

          {lpCalc.tierChanged && showTierChange && (
            <div className={`tier-change ${lpCalc.isPromotion ? 'promo' : 'demo'}`}>
              <span>{lpCalc.oldTier.icon} {lpCalc.oldTier.name}</span>
              <span className="arrow">→</span>
              <span>{lpCalc.newTier.icon} {lpCalc.newTier.name}</span>
            </div>
          )}

          <div className="lp-bar-container">
            <div className="lp-bar-bg">
              <div
                className={`lp-bar-fill lp-bar-fill--${resultType}`}
                style={{
                  width: animPhase === 'idle'
                    ? `${lpCalc.oldLPInDiv}%`
                    : `${lpCalc.tierChanged ? (lpCalc.isPromotion ? 100 : 0) : lpCalc.newLPInDiv}%`,
                  transition: animPhase === 'idle' ? 'none' : 'width 2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
            <div className="lp-bar-labels">
              <span>0 LP</span>
              <span>{LP_PER_DIVISION} LP</span>
            </div>
          </div>

          <div className={`lp-change lp-change--${resultType}`}>
            {lpCalc.lpChange > 0 ? <TrendingUp size={18} /> : lpCalc.lpChange < 0 ? <TrendingDown size={18} /> : <Minus size={18} />}
            <span className="lp-change-value">
              {lpCalc.lpChange > 0 ? '+' : ''}{lpCalc.lpChange} LP
            </span>
          </div>
        </div>

        {/* Stats Breakdown */}
        {!isDisconnection && mySim && (
          <div className="stats-breakdown">
            <h3>{t('rankedResults.breakdown')}</h3>
            <div className="stats-columns">
              <div className="stats-col">
                <h4>{t('rankedResults.you')}</h4>
                <BreakdownList sim={mySim} t={t} />
              </div>
              <div className="stats-col">
                <h4>{t('rankedResults.rival')}</h4>
                <BreakdownList sim={rivalSim} t={t} />
              </div>
            </div>
          </div>
        )}

        {/* H2H */}
        {!isDisconnection && mySim?.h2hResults?.length > 0 && (
          <div className="h2h-section">
            <h3>⚔️ {t('rankedResults.h2h')}</h3>
            {mySim.h2hResults.map((r, i) => (
              <div key={i} className="h2h-row">
                <span>{r.home ? '🏠' : '✈️'}</span>
                <span className="h2h-score">{r.goalsFor} - {r.goalsAgainst}</span>
                <span className={`h2h-result ${r.goalsFor > r.goalsAgainst ? 'win' : r.goalsFor < r.goalsAgainst ? 'loss' : 'draw'}`}>
                  {r.goalsFor > r.goalsAgainst ? 'V' : r.goalsFor < r.goalsAgainst ? 'D' : 'E'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Back to Lobby */}
        <button className="lobby-btn" onClick={onBackToLobby}>
          <ArrowLeft size={18} />
          <span>{t('rankedResults.backToLobby')}</span>
        </button>
      </div>
    </div>
  );
}

function BreakdownList({ sim, t }) {
  if (!sim) return null;
  const items = [];
  if (sim.liga) items.push({ label: `🏆 ${t('rankedResults.leagueChampion')}`, pts: 6 });
  if (sim.championsLeague) items.push({ label: '🏆 Champions League', pts: 10 });
  if (sim.europaLeague) items.push({ label: '🏆 Europa League', pts: 5 });
  if (sim.libertadores) items.push({ label: '🏆 Libertadores', pts: 5 });
  if (sim.conference) items.push({ label: '🏆 Conference League', pts: 3 });
  if (sim.sudamericana) items.push({ label: '🏆 Sudamericana', pts: 3 });
  if (sim.copa) items.push({ label: `🏆 ${t('rankedResults.cup')}`, pts: 3 });
  if (sim.supercopa) items.push({ label: `🏆 ${t('rankedResults.superCup')}`, pts: 1 });
  // Cup round bonus (QF+)
  const cupRoundPoints = { 'QF': 1, 'SF': 2, 'Final': 3 };
  if (sim.cupRound && cupRoundPoints[sim.cupRound]) {
    items.push({ label: `🏆 Copa: ${sim.cupRound}`, pts: cupRoundPoints[sim.cupRound] });
  }
  if (sim.finishedAboveRival) items.push({ label: `📈 ${t('rankedResults.aboveRival')}`, pts: 2 });
  // H2H: recalculate from results if h2hWins is missing
  let h2hWins = sim.h2hWins || 0;
  if (!h2hWins && sim.h2hResults?.length > 0) {
    h2hWins = sim.h2hResults.filter(r => r.goalsFor > r.goalsAgainst).length;
  }
  const h2hPts = Math.min(2, h2hWins);
  if (h2hPts > 0) items.push({ label: `⚔️ ${t('rankedResults.h2hWins', { count: h2hWins })}`, pts: h2hPts });

  items.push({ label: `📊 ${t('rankedResults.leaguePos', { pos: sim.leaguePosition, pts: sim.leaguePoints })}`, pts: null });
  if (sim.europeanCompetition) {
    items.push({ label: `🌍 ${sim.europeanCompetition}: ${sim.europeanRound || '-'}`, pts: null });
  }
  if (sim.cupRound && !cupRoundPoints[sim.cupRound]) {
    items.push({ label: `🏆 ${t('rankedResults.cupRound', { round: sim.cupRound })}`, pts: null });
  }

  const total = items.reduce((sum, item) => sum + (item.pts || 0), 0);

  return (
    <div className="bd-list">
      {items.map((item, i) => (
        <div key={i} className="bd-item">
          <span className="bd-label">{item.label}</span>
          {item.pts !== null && <span className="bd-pts">+{item.pts}</span>}
        </div>
      ))}
      <div className="bd-total">
        <span>TOTAL</span>
        <span className="bd-pts">{total}</span>
      </div>
    </div>
  );
}
