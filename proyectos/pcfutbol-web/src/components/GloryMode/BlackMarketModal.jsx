import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { X, Skull, Clock, Check } from 'lucide-react';
import { translatePosition } from '../../game/positionNames';
import { assignRole } from '../../game/playerRoles';
import './GloryMode.scss';

/**
 * Black Market Modal — Pick 1 of 5 legendary retired players in 30 seconds
 */
export default function BlackMarketModal({ onClose }) {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const gloryData = state.gloryData || {};
  const players = gloryData.blackMarketPlayers || [];
  const [timeLeft, setTimeLeft] = useState(30);
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (done) return;
    if (timeLeft <= 0) {
      // Time's up — no player selected
      setDone(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, done]);

  const handleSelect = useCallback((player) => {
    if (done) return;
    setSelected(player);
    setDone(true);

    // Add player to team
    const newPlayer = {
      ...player,
      role: assignRole(player),
      contractYears: 2,
      morale: 85,
      fitness: 100,
      teamId: state.teamId,
    };

    dispatch({
      type: 'UPDATE_GLORY_STATE',
      payload: {
        team: { ...state.team, players: [...(state.team?.players || []), newPlayer] },
        gloryData: { ...gloryData, blackMarketUsed: true }
      }
    });
  }, [done, state, gloryData, dispatch]);

  const timerColor = timeLeft <= 10 ? '#ef5350' : timeLeft <= 20 ? '#ffa726' : '#66bb6a';

  return (
    <div className="theft-modal__overlay" onClick={done ? onClose : undefined}>
      <div className="theft-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="theft-modal__header">
          <h2><Skull size={20} /> {t('glory.blackMarket.title')}</h2>
          {!done && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} style={{ color: timerColor }} />
              <span style={{ fontWeight: 700, fontSize: 18, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>
                {timeLeft}s
              </span>
            </div>
          )}
          <button className="theft-modal__close" onClick={onClose}><X size={18} /></button>
        </div>

        {!done && (
          <p className="theft-modal__desc">
            {t('glory.blackMarket.desc')}
          </p>
        )}

        {done && !selected && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ color: '#ef5350', fontSize: 16, fontWeight: 600 }}>{t('glory.blackMarket.timeUp')}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>{t('glory.blackMarket.noPick')}</p>
            <button className="theft-modal__btn theft-modal__btn--primary" onClick={onClose} style={{ marginTop: 16 }}>
              {t('glory.blackMarket.close')}
            </button>
          </div>
        )}

        {done && selected && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Check size={48} style={{ color: '#66bb6a', marginBottom: 12 }} />
            <p style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{selected.name}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              {translatePosition(selected.position)} · {selected.age} {t('glory.blackMarket.years')} · {selected.overall} OVR
            </p>
            <p style={{ color: '#66bb6a', marginTop: 8, fontWeight: 600 }}>{t('glory.blackMarket.signed')}</p>
            <button className="theft-modal__btn theft-modal__btn--primary" onClick={onClose} style={{ marginTop: 16 }}>
              {t('glory.blackMarket.close')}
            </button>
          </div>
        )}

        {!done && (
          <div className="theft-modal__list">
            {players.map((player, i) => (
              <button
                key={i}
                className="theft-modal__item"
                onClick={() => handleSelect(player)}
              >
                <span className="theft-modal__item-ovr" style={{ color: '#ffd740', fontSize: 20 }}>{player.overall}</span>
                <div className="theft-modal__item-info">
                  <span className="theft-modal__item-name">{player.name}</span>
                  <span className="theft-modal__item-meta">
                    {translatePosition(player.position)} · {player.age} {t('glory.blackMarket.years')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
