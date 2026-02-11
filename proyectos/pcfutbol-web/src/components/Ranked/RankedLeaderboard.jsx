import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../../firebase/rankedService';
import { ArrowLeft, Trophy, Medal, Loader2 } from 'lucide-react';
import './RankedLeaderboard.scss';

export default function RankedLeaderboard({ onBack, userId }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getLeaderboard(50);
        if (!cancelled) setPlayers(data);
      } catch (err) {
        if (!cancelled) setError('Error al cargar la clasificación');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getEloColor = (elo) => {
    if (elo >= 1500) return '#fbbf24'; // Gold
    if (elo >= 1200) return '#818cf8'; // Purple
    if (elo >= 1000) return '#34d399'; // Green
    return '#94a3b8'; // Gray
  };

  return (
    <div className="ranked-leaderboard">
      <header className="ranked-leaderboard__header">
        <button className="ranked-leaderboard__back" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1><Trophy size={24} /> Clasificación</h1>
      </header>

      {loading ? (
        <div className="ranked-leaderboard__loading">
          <Loader2 className="spin" size={40} />
          <p>Cargando clasificación...</p>
        </div>
      ) : error ? (
        <div className="ranked-leaderboard__error">
          <p>{error}</p>
          <button onClick={onBack}>Volver</button>
        </div>
      ) : players.length === 0 ? (
        <div className="ranked-leaderboard__empty">
          <Trophy size={48} style={{ opacity: 0.3 }} />
          <p>No hay jugadores aún</p>
          <p className="ranked-leaderboard__sub">¡Sé el primero en jugar!</p>
        </div>
      ) : (
        <div className="ranked-leaderboard__list">
          {players.map((player, idx) => {
            const rank = idx + 1;
            const isMe = player.id === userId;
            return (
              <div
                key={player.id}
                className={`ranked-leaderboard__row ${isMe ? 'ranked-leaderboard__row--me' : ''} ${rank <= 3 ? 'ranked-leaderboard__row--top' : ''}`}
              >
                <span className="ranked-leaderboard__rank">
                  {getRankIcon(rank)}
                </span>
                <div className="ranked-leaderboard__player-info">
                  <span className="ranked-leaderboard__name">
                    {player.displayName || 'Jugador'}
                    {isMe && <small> (tú)</small>}
                  </span>
                  <span className="ranked-leaderboard__record">
                    {player.wins || 0}W / {player.draws || 0}D / {player.losses || 0}L
                  </span>
                </div>
                <span
                  className="ranked-leaderboard__elo"
                  style={{ color: getEloColor(player.elo || 1000) }}
                >
                  {player.elo || 1000}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
