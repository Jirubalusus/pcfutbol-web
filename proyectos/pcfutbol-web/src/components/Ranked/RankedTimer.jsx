import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { onMatchChange, setReady, onReadyChange, advancePhase } from '../../firebase/rankedService';
import { Clock, Check, Zap } from 'lucide-react';
import './RankedTimer.scss';

export default function RankedTimer() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state } = useGame();
  const [match, setMatch] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [readyState, setReadyState] = useState({ player1: false, player2: false });
  const [settingReady, setSettingReady] = useState(false);

  const matchId = state.rankedMatchId;

  // Listen to match changes
  useEffect(() => {
    if (!matchId) return;
    return onMatchChange(matchId, setMatch);
  }, [matchId]);

  // Listen to ready state
  useEffect(() => {
    if (!matchId) return;
    return onReadyChange(matchId, (ready) => {
      setReadyState(ready || { player1: false, player2: false });
    });
  }, [matchId]);

  // Countdown timer
  useEffect(() => {
    if (!match?.phaseDeadline) return;
    const tick = () => {
      const deadline = match.phaseDeadline.toDate ? match.phaseDeadline.toDate() : new Date(match.phaseDeadline);
      const remaining = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);

      // Auto-advance when timer hits 0 (only player1 triggers)
      if (remaining === 0 && isPlayer1() && ['round1', 'round2'].includes(match.phase)) {
        advancePhase(matchId).catch(console.error);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match?.phaseDeadline, match?.phase]);

  // Both ready → trigger simulation
  useEffect(() => {
    if (!match || !matchId) return;
    if (readyState.player1 && readyState.player2 && isPlayer1() && ['round1', 'round2'].includes(match.phase)) {
      advancePhase(matchId).catch(console.error);
    }
  }, [readyState.player1, readyState.player2, match?.phase]);

  const isPlayer1 = useCallback(() => match?.player1?.uid === user?.uid, [match, user]);
  const getMyKey = useCallback(() => isPlayer1() ? 'player1' : 'player2', [match, user]);
  const getRivalData = useCallback(() => isPlayer1() ? match?.player2 : match?.player1, [match, user]);

  const handleReady = async () => {
    if (!matchId || !user?.uid || settingReady) return;
    setSettingReady(true);
    try {
      const playerNum = isPlayer1() ? 1 : 2;
      await setReady(matchId, playerNum);
    } catch (e) {
      console.error('Error setting ready:', e);
    }
    setSettingReady(false);
  };

  if (!match || !['round1', 'round2'].includes(match.phase)) return null;

  const myKey = getMyKey();
  const amReady = readyState[myKey];
  const readyCount = (readyState.player1 ? 1 : 0) + (readyState.player2 ? 1 : 0);
  const rivalData = getRivalData();
  const roundLabel = match.phase === 'round1' ? t('ranked.round1') : t('ranked.round2');

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Timer color class
  let timerClass = 'green';
  if (timeLeft <= 10) timerClass = 'red-pulse';
  else if (timeLeft <= 30) timerClass = 'red';
  else if (timeLeft <= 60) timerClass = 'yellow';

  return (
    <div className={`ranked-timer ranked-timer--${timerClass}`}>
      <div className="ranked-timer__info">
        <div className="ranked-timer__clock">
          <Clock size={16} />
          <span className="ranked-timer__time">{formatTime(timeLeft)}</span>
        </div>
        <div className="ranked-timer__match-info">
          <span className="ranked-timer__round">{roundLabel}</span>
          <span className="ranked-timer__vs">vs {rivalData?.displayName || '...'}</span>
        </div>
      </div>

      <div className="ranked-timer__actions">
        <span className="ranked-timer__ready-status">
          {readyCount}/2 {'✓'.repeat(readyCount)}
        </span>
        <button
          className={`ranked-timer__ready-btn ${amReady ? 'ready' : ''}`}
          onClick={handleReady}
          disabled={amReady || settingReady}
        >
          {amReady ? (
            <><Check size={16} /> {t('ranked.ready')}</>
          ) : (
            <><Zap size={16} /> {t('ranked.setReady')}</>
          )}
        </button>
      </div>
    </div>
  );
}
