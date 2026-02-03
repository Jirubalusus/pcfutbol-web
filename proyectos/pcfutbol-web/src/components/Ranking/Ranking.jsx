import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { loadRanking as fetchRanking, clearRanking as clearFirebaseRanking } from '../../firebase/rankingService';
import { Trophy, ArrowLeft, Timer, Medal, Trash2, Calendar, Loader } from 'lucide-react';
import './Ranking.scss';

export default function Ranking() {
  const { dispatch } = useGame();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchRanking(50);
    setRanking(data);
    setLoading(false);
  };

  const handleClear = async () => {
    if (window.confirm('¿Borrar todos los récords? Esta acción no se puede deshacer.')) {
      await clearFirebaseRanking();
      setRanking([]);
    }
  };

  const getMedalColor = (pos) => {
    if (pos === 1) return '#FFD700';
    if (pos === 2) return '#C0C0C0';
    if (pos === 3) return '#CD7F32';
    return '#556677';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="ranking">
      <div className="ranking__bg">
        <div className="ranking__gradient" />
      </div>

      <div className="ranking__content">
        <div className="ranking__header">
          <button className="btn-back" onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'main_menu' })}>
            <ArrowLeft size={20} /> Menú
          </button>
          <div className="header-title">
            <Trophy size={28} className="trophy-icon" />
            <div>
              <h1>RÉCORDS</h1>
              <p>Modo Contrarreloj — Los mejores tiempos</p>
            </div>
          </div>
          {ranking.length > 0 && (
            <button className="btn-clear" onClick={handleClear}>
              <Trash2 size={14} /> Borrar
            </button>
          )}
        </div>

        {loading ? (
          <div className="ranking__empty">
            <Loader size={48} className="empty-icon spinning" />
            <h2>Cargando ranking...</h2>
          </div>
        ) : ranking.length === 0 ? (
          <div className="ranking__empty">
            <Timer size={48} className="empty-icon" />
            <h2>Sin récords aún</h2>
            <p>Completa el modo Contrarreloj para aparecer en el ranking.</p>
            <button className="btn-play" onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'contrarreloj_setup' })}>
              <Timer size={18} /> Jugar Contrarreloj
            </button>
          </div>
        ) : (
          <div className="ranking__table-wrapper">
            <table className="ranking__table">
              <thead>
                <tr>
                  <th className="col-pos">#</th>
                  <th className="col-player">Jugador</th>
                  <th className="col-team">Equipo</th>
                  <th className="col-score">Puntuación</th>
                  <th className="col-seasons"><Timer size={14} /> Temp.</th>
                  <th className="col-trophies"><Trophy size={14} /> Trofeos</th>
                  <th className="col-comp">Competición</th>
                  <th className="col-date"><Calendar size={14} /> Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((entry, idx) => (
                  <tr key={entry.id || idx} className={idx < 3 ? `top-${idx + 1}` : ''}>
                    <td className="col-pos">
                      <Medal size={16} style={{ color: getMedalColor(idx + 1) }} />
                      <span>{idx + 1}</span>
                    </td>
                    <td className="col-player">{entry.playerName || 'Anónimo'}</td>
                    <td className="col-team">
                      <span className="team-name">{entry.teamName}</span>
                      <span className="league-name">{entry.leagueName || ''}</span>
                    </td>
                    <td className="col-score">
                      <span className="score-value">{(entry.seasonsPlayed || 0) - (entry.difficultyBonus || 0)}</span>
                      {(entry.difficultyBonus || 0) > 0 && <span className="score-bonus">-{entry.difficultyBonus}</span>}
                    </td>
                    <td className="col-seasons">
                      <span className="seasons-value">{entry.seasonsPlayed}</span>
                    </td>
                    <td className="col-trophies">
                      <span className="trophies-value">{entry.trophies?.length || 0}</span>
                      {entry.trophies?.length > 0 && (
                        <span className="trophies-detail">
                          {entry.trophies.map((t, i) => (
                            <span key={i} className="trophy-tag" title={`${t.name} (T${t.season})`}>
                              {t.type === 'champions' || t.type === 'libertadores' ? '🏆' :
                               t.type === 'league' ? '🏅' :
                               t.type === 'cup' ? '🥇' : '🏆'}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="col-comp">
                      <span className={`comp-badge ${entry.wonCompetition === 'champions' ? 'champions' : 'libertadores'}`}>
                        {entry.wonCompetition === 'champions' ? '🏆 Champions' :
                         entry.wonCompetition === 'libertadores' ? '🏆 Libertadores' : '🏆'}
                      </span>
                    </td>
                    <td className="col-date">{formatDate(entry.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
