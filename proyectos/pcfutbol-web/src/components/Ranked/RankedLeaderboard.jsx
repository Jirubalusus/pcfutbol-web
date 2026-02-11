import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { getLeaderboard } from '../../firebase/rankedService';
import { getTierByLP, getLPInDivision } from './tierUtils';
import { Trophy, ArrowLeft, Crown, Medal } from 'lucide-react';
import './RankedLeaderboard.scss';

export default function RankedLeaderboard() {
  const { user } = useAuth();
  const { dispatch } = useGame();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getLeaderboard(100)
      .then(setPlayers)
      .catch((e) => { console.error(e); setError('Error al cargar la clasificación'); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="ranked-leaderboard">
      <div className="ranked-leaderboard__header">
        <button className="back-btn" onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'ranked_lobby' })}>
          <ArrowLeft size={20} />
        </button>
        <h1><Trophy size={22} /> Clasificación Global</h1>
      </div>

      {loading ? (
        <div className="ranked-leaderboard__loading">Cargando...</div>
      ) : error ? (
        <div className="ranked-leaderboard__empty">{error}</div>
      ) : players.length === 0 ? (
        <div className="ranked-leaderboard__empty">No hay jugadores aún.</div>
      ) : (
        <div className="ranked-leaderboard__list">
          {players.map((p, i) => {
            const tier = getTierByLP(p.totalLP || 0);
            const isMe = p.id === user?.uid;
            return (
              <div key={p.id} className={`lb-row ${isMe ? 'me' : ''} ${i < 3 ? `top-${i + 1}` : ''}`}>
                <span className="lb-rank">
                  {i === 0 ? <Crown size={16} className="gold" /> :
                   i === 1 ? <Medal size={16} className="silver" /> :
                   i === 2 ? <Medal size={16} className="bronze" /> :
                   `#${i + 1}`}
                </span>
                <span className="lb-tier">{tier.icon}</span>
                <div className="lb-info">
                  <span className="lb-name">{p.displayName}</span>
                  <span className="lb-tier-name" style={{ color: tier.color }}>{tier.name}</span>
                </div>
                <div className="lb-stats">
                  <span className="lb-lp">{p.totalLP || 0} LP</span>
                  <span className="lb-record">{p.wins || 0}V {p.losses || 0}D</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
