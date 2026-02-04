import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { loadRanking as fetchRanking, clearRanking as clearFirebaseRanking } from '../../firebase/rankingService';
import { Trophy, ArrowLeft, Timer, Medal, Trash2, Calendar, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Ranking.scss';

export default function Ranking() {
  const { dispatch } = useGame();
  const { t } = useTranslation();
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
    if (window.confirm(t('ranking.confirmClear'))) {
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
            <ArrowLeft size={20} /> {t('common.back')}
          </button>
          <div className="header-title">
            <Trophy size={28} className="trophy-icon" />
            <div>
              <h1>{t('ranking.records')}</h1>
              <p>{t('ranking.subtitle')}</p>
            </div>
          </div>
          {ranking.length > 0 && (
            <button className="btn-clear" onClick={handleClear}>
              <Trash2 size={14} /> {t('ranking.clear')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="ranking__empty">
            <Loader size={48} className="empty-icon spinning" />
            <h2>{t('ranking.loading')}</h2>
          </div>
        ) : ranking.length === 0 ? (
          <div className="ranking__empty">
            <Timer size={48} className="empty-icon" />
            <h2>{t('ranking.noRecords')}</h2>
            <p>{t('ranking.noRecordsDesc')}</p>
            <button className="btn-play" onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'contrarreloj_setup' })}>
              <Timer size={18} /> {t('ranking.playContrarreloj')}
            </button>
          </div>
        ) : (
          <div className="ranking__table-wrapper">
            <table className="ranking__table">
              <thead>
                <tr>
                  <th className="col-pos">#</th>
                  <th className="col-player">{t('ranking.player')}</th>
                  <th className="col-team">{t('ranking.team')}</th>
                  <th className="col-score">{t('ranking.score')}</th>
                  <th className="col-seasons"><Timer size={14} /> {t('ranking.seasons')}</th>
                  <th className="col-trophies"><Trophy size={14} /> {t('ranking.trophies')}</th>
                  <th className="col-comp">{t('ranking.competition')}</th>
                  <th className="col-date"><Calendar size={14} /> {t('ranking.date')}</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((entry, idx) => (
                  <tr key={entry.id || idx} className={idx < 3 ? `top-${idx + 1}` : ''}>
                    <td className="col-pos">
                      <Medal size={16} style={{ color: getMedalColor(idx + 1) }} />
                      <span>{idx + 1}</span>
                    </td>
                    <td className="col-player">{entry.playerName || t('seasonEnd.anonymous')}</td>
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
