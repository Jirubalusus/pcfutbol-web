import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { saveRankingEntry } from '../../firebase/rankingService';
import { Trophy, Timer, UserX, DollarSign, Home, BarChart2, Star, Sparkles } from 'lucide-react';
import './ContrarrelojEnd.scss';

export default function ContrarrelojEnd() {
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const contrarreloj = state.contrarrelojData;
  const won = contrarreloj?.won || false;
  const loseReason = contrarreloj?.loseReason || 'unknown';

  // Save winning result to shared Firebase ranking
  useEffect(() => {
    if (won && !saved && contrarreloj) {
      const entry = {
        playerName: user?.displayName || user?.email?.split('@')[0] || 'Anónimo',
        teamName: state.team?.name || contrarreloj.startTeam?.name || 'Unknown',
        leagueName: contrarreloj.startLeague || '',
        seasonsPlayed: contrarreloj.seasonsPlayed || 1,
        trophies: contrarreloj.trophies || [],
        wonCompetition: contrarreloj.wonCompetition || 'champions',
        date: new Date().toISOString()
      };
      saveRankingEntry(entry).then(() => setSaved(true));
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
            {/* Victory */}
            <div className="contrarreloj-end__icon victory-icon">
              <Trophy size={64} />
              <div className="sparkles">
                {[...Array(6)].map((_, i) => <Sparkles key={i} size={16} className={`sparkle sparkle--${i}`} />)}
              </div>
            </div>
            <h1 className="victory-title">¡CAMPEÓN!</h1>
            <h2>{state.team?.name}</h2>
            <p className="contrarreloj-end__subtitle">
              {contrarreloj?.wonCompetition === 'libertadores'
                ? '🏆 ¡Copa Libertadores conquistada!'
                : '🏆 ¡Champions League conquistada!'}
            </p>

            <div className="contrarreloj-end__stats">
              <div className="stat gold">
                <Timer size={20} />
                <span className="label">Temporadas</span>
                <span className="value">{contrarreloj?.seasonsPlayed || 1}</span>
              </div>
              <div className="stat">
                <Trophy size={20} />
                <span className="label">Trofeos</span>
                <span className="value">{contrarreloj?.trophies?.length || 0}</span>
              </div>
              <div className="stat">
                <Star size={20} />
                <span className="label">Equipo inicial</span>
                <span className="value">{contrarreloj?.startTeam?.name || state.team?.name}</span>
              </div>
            </div>

            {contrarreloj?.trophies?.length > 0 && (
              <div className="contrarreloj-end__trophies">
                <h3><Trophy size={14} /> Palmarés</h3>
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
          </>
        ) : (
          <>
            {/* Defeat */}
            <div className="contrarreloj-end__icon defeat-icon">
              {loseReason === 'bankrupt' ? <DollarSign size={64} /> : <UserX size={64} />}
            </div>
            <h1 className="defeat-title">GAME OVER</h1>
            <h2>{state.team?.name}</h2>
            <p className="contrarreloj-end__subtitle">
              {loseReason === 'bankrupt'
                ? '💸 Tu equipo ha entrado en bancarrota. Presupuesto negativo.'
                : '📋 La directiva ha decidido prescindir de tus servicios.'}
            </p>

            <div className="contrarreloj-end__stats">
              <div className="stat">
                <Timer size={20} />
                <span className="label">Temporadas jugadas</span>
                <span className="value">{contrarreloj?.seasonsPlayed || 1}</span>
              </div>
              <div className="stat">
                <Trophy size={20} />
                <span className="label">Trofeos ganados</span>
                <span className="value">{contrarreloj?.trophies?.length || 0}</span>
              </div>
            </div>
          </>
        )}

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
