import React, { useState, useEffect, useRef } from 'react';
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
  const advancingRef = useRef(false);

  const matchId = state.rankedMatchId;
  const amPlayer1 = match?.player1?.uid === user?.uid;

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

  // Countdown timer + auto-advance at 0
  useEffect(() => {
    if (!match?.phaseDeadline) return;
    const tick = () => {
      const deadline = match.phaseDeadline.toDate ? match.phaseDeadline.toDate() : new Date(match.phaseDeadline);
      const remaining = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && amPlayer1 && !advancingRef.current && ['round1', 'round2'].includes(match.phase)) {
        advancingRef.current = true;
        advancePhase(matchId).catch(console.error).finally(() => { advancingRef.current = false; });
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match?.phaseDeadline, match?.phase, amPlayer1, matchId]);

  // Both ready → trigger simulation immediately
  useEffect(() => {
    if (!match || !matchId || advancingRef.current) return;
    if (readyState.player1 && readyState.player2 && amPlayer1 && ['round1', 'round2'].includes(match.phase)) {
      advancingRef.current = true;
      advancePhase(matchId).catch(console.error).finally(() => { advancingRef.current = false; });
    }
  }, [readyState.player1, readyState.player2, match?.phase, amPlayer1, matchId]);

  const handleReady = async () => {
    if (!matchId || !user?.uid || settingReady) return;
    setSettingReady(true);
    try {
      await setReady(matchId, amPlayer1 ? 1 : 2);
    } catch (e) {
      console.error('Error setting ready:', e);
    }
    setSettingReady(false);
  };

  if (!match || !['round1', 'round2'].includes(match.phase)) return null;

  const myKey = amPlayer1 ? 'player1' : 'player2';
  const amReady = readyState[myKey];
  const readyCount = (readyState.player1 ? 1 : 0) + (readyState.player2 ? 1 : 0);
  const rivalData = amPlayer1 ? match?.player2 : match?.player1;
  const roundLabel = match.phase === 'round1' ? (t('ranked.round1') || 'RONDA 1 — PRIMERA VUELTA') : (t('ranked.round2') || 'RONDA 2 — SEGUNDA VUELTA');

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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
            <><Check size={16} /> {t('ranked.ready') || 'Listo'}</>
          ) : (
            <><Zap size={16} /> {t('ranked.setReady') || 'Listo'}</>
          )}
        </button>
      </div>
    </div>
  );
}
