import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { saveRankingEntry, getRankingPosition } from '../../firebase/rankingService';
import { getPromotionsToChampions } from '../../game/leagueTiers';
import { posES } from '../../game/positionNames';
import { Trophy, Timer, UserX, DollarSign, Home, BarChart2, Star, Sparkles, Swords, Users, TrendingUp, Medal } from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import './ContrarrelojEnd.scss';

export default function ContrarrelojEnd() {
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [rankingInfo, setRankingInfo] = useState(null);

  const contrarreloj = state.contrarrelojData;
  const won = contrarreloj?.won || false;
  const loseReason = contrarreloj?.loseReason || 'unknown';

  // Current season stats (add to accumulated totals)
  const currentTable = state.leagueTable || [];
  const currentTeamStats = currentTable.find(t => t.teamId === state.teamId);
  const currentW = currentTeamStats?.won || 0;
  const currentD = currentTeamStats?.drawn || 0;
  const currentL = currentTeamStats?.lost || 0;

  const totalWins = (contrarreloj?.totalWins || 0) + currentW;
  const totalDraws = (contrarreloj?.totalDraws || 0) + currentD;
  const totalLosses = (contrarreloj?.totalLosses || 0) + currentL;
  const totalMatches = totalWins + totalDraws + totalLosses;
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  // Best player (highest OVR in current squad)
  const bestPlayer = (state.team?.players || [])
    .slice()
    .sort((a, b) => (b.overall || 0) - (a.overall || 0))[0];

  // Competition winner name
  const compName = contrarreloj?.wonCompetition === 'libertadores'
    ? 'Copa Libertadores'
    : 'Champions League';

  // Difficulty bonus (promotions needed from start league)
  const difficultyBonus = getPromotionsToChampions(contrarreloj?.startLeague || '');
  const weightedScore = (contrarreloj?.seasonsPlayed || 1) - difficultyBonus;

  // Save winning result to shared Firebase ranking
  useEffect(() => {
    if (won && !saved && contrarreloj) {
      const entry = {
        playerName: user?.displayName || user?.email?.split('@')[0] || 'Anónimo',
        teamName: state.team?.name || contrarreloj.startTeam?.name || 'Desconocido',
        leagueName: contrarreloj.startLeague || '',
        seasonsPlayed: contrarreloj.seasonsPlayed || 1,
        trophies: contrarreloj.trophies || [],
        wonCompetition: contrarreloj.wonCompetition || 'champions',
        totalWins,
        totalDraws,
        totalLosses,
        totalMatches,
        bestPlayer: bestPlayer ? { name: bestPlayer.name, overall: bestPlayer.overall, position: bestPlayer.position } : null,
        difficultyBonus,
        weightedScore,
        date: new Date().toISOString()
      };
      saveRankingEntry(entry).then(() => {
        setSaved(true);
        // Fetch ranking position after save
        getRankingPosition(contrarreloj.seasonsPlayed || 1).then(info => {
          setRankingInfo(info);
        });
      });
    }
  }, [won, saved, contrarreloj, state.team, user]);

  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 100);
  }, []);

  const handleMenu = () => {
    dispatch({ type: 'RESET_GAME' });
    dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
  };

  const handleRanking = () => {
    dispatch({ type: 'RESET_GAME' });
    dispatch({ type: 'SET_SCREEN', payload: 'ranking' });
  };

  return (
    <div className={`contrarreloj-end ${won ? 'victory' : 'defeat'} ${animateIn ? 'animate-in' : ''}`}>
      <div className="contrarreloj-end__overlay" />
      <div className="contrarreloj-end__modal">
        {won ? (
          <>
            {/* Victory header */}
            <div className="contrarreloj-end__icon victory-icon">
              <Trophy size={64} />
              <div className="sparkles">
                {[...Array(6)].map((_, i) => <Sparkles key={i} size={16} className={`sparkle sparkle--${i}`} />)}
              </div>
            </div>
            <h1 className="victory-title">¡CAMPEÓN!</h1>
            <h2>{state.team?.name}</h2>
            <p className="contrarreloj-end__subtitle">
              🏆 ¡{compName} conquistada!
            </p>
          </>
        ) : (
          <>
            {/* Defeat header */}
            <div className="contrarreloj-end__icon defeat-icon">
              {loseReason === 'bankrupt' ? <DollarSign size={64} /> : <UserX size={64} />}
            </div>
            <h1 className="defeat-title">FIN DEL JUEGO</h1>
            <h2>{state.team?.name}</h2>
            <p className="contrarreloj-end__subtitle">
              {loseReason === 'bankrupt'
                ? '💸 Tu equipo ha entrado en bancarrota.'
                : '📋 La directiva ha prescindido de tus servicios.'}
            </p>
          </>
        )}

        {/* Best player */}
        {bestPlayer && (
          <div className="contrarreloj-end__best-player">
            <Star size={16} className="star-icon" />
            <div className="player-info">
              <span className="player-label">Mejor jugador</span>
              <span className="player-name">{bestPlayer.name}</span>
              <span className="player-detail">{posES(bestPlayer.position)} · {bestPlayer.overall} OVR · {bestPlayer.age} años</span>
            </div>
          </div>
        )}

        {/* Match stats */}
        <div className="contrarreloj-end__match-stats">
          <h3><Swords size={14} /> Estadísticas de la run</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{totalMatches}</span>
              <span className="stat-label">Partidos</span>
            </div>
            <div className="stat-item win">
              <span className="stat-value">{totalWins}</span>
              <span className="stat-label">Victorias</span>
            </div>
            <div className="stat-item draw">
              <span className="stat-value">{totalDraws}</span>
              <span className="stat-label">Empates</span>
            </div>
            <div className="stat-item loss">
              <span className="stat-value">{totalLosses}</span>
              <span className="stat-label">Derrotas</span>
            </div>
            <div className="stat-item rate">
              <span className="stat-value">{winRate}%</span>
              <span className="stat-label">% Victoria</span>
            </div>
          </div>
        </div>

        {/* Trophies */}
        {contrarreloj?.trophies?.length > 0 && (
          <div className="contrarreloj-end__trophies">
            <h3><Trophy size={14} /> Palmarés ({contrarreloj.trophies.length})</h3>
            <div className="trophies-list">
              {contrarreloj.trophies.map((t, i) => (
                <div key={i} className="trophy-item">
                  <span className="trophy-icon">
                    {t.type === 'champions' || t.type === 'libertadores' ? '🏆' :
                     t.type === 'league' ? '🏅' :
                     t.type === 'cup' ? '🥇' : '🏆'}
                  </span>
                  <span className="trophy-name">{t.name}</span>
                  <span className="trophy-season">T{t.season}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time — the big number, last */}
        <div className="contrarreloj-end__time">
          <Timer size={28} className="time-icon" />
          <div className="time-content">
            <span className="time-label">{won ? 'Lo conseguiste en' : 'Duraste'}</span>
            <span className="time-value">{contrarreloj?.seasonsPlayed || 1}</span>
            <span className="time-unit">temporada{(contrarreloj?.seasonsPlayed || 1) !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Weighted score with difficulty */}
        {won && difficultyBonus > 0 && (
          <div className="contrarreloj-end__weighted">
            <span className="weighted-formula">
              {contrarreloj?.seasonsPlayed} temp. − {difficultyBonus} ascenso{difficultyBonus !== 1 ? 's' : ''} de ventaja
            </span>
            <span className="weighted-score">Score: <strong>{weightedScore}</strong></span>
          </div>
        )}

        {/* Global ranking position */}
        {won && rankingInfo && rankingInfo.total > 0 && (
          <div className="contrarreloj-end__ranking-pos">
            <Medal size={20} className="medal-icon" />
            {rankingInfo.total >= 10000 ? (
              <span className="ranking-text">
                Posición global: <strong>#{rankingInfo.position}</strong> de {rankingInfo.total.toLocaleString()}
              </span>
            ) : (
              <span className="ranking-text">
                {(() => {
                  const pct = Math.max(1, Math.round((rankingInfo.position / rankingInfo.total) * 100));
                  if (pct <= 1) return '¡Estás en el TOP 1%! 👑';
                  if (pct <= 5) return `¡Estás en el TOP ${pct}%! 🔥`;
                  if (pct <= 20) return `¡Estás entre el ${pct}% mejor! 💪`;
                  if (pct <= 50) return `Estás en el top ${pct}% — ¡Puedes mejorar!`;
                  return `Top ${pct}% — ¿Intentas otra run?`;
                })()}
                <span className="ranking-detail"> ({rankingInfo.position}º de {rankingInfo.total})</span>
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="contrarreloj-end__actions">
          <button className="btn-ranking" onClick={handleRanking}>
            <BarChart2 size={18} />
            <span>Ver Ranking</span>
          </button>
          <button className="btn-menu" onClick={handleMenu}>
            <Home size={18} />
            <span>Menú Principal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
