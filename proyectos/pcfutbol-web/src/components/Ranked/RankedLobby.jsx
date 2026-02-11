import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import {
  getOrCreatePlayerProfile,
  joinQueue, leaveQueue, listenToQueue,
  createMatch, listenForMyMatch, getActiveMatch,
} from '../../firebase/rankedService';
import RankedMatch from './RankedMatch';
import RankedLeaderboard from './RankedLeaderboard';
import { Trophy, Swords, ArrowLeft, Loader2, Users, Wifi, WifiOff } from 'lucide-react';
import './RankedLobby.scss';

export default function RankedLobby() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dispatch } = useGame();

  const [profile, setProfile] = useState(null);
  const [searching, setSearching] = useState(false);
  const [matchId, setMatchId] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  const unsubQueueRef = useRef(null);
  const unsubMatchRef = useRef(null);
  const searchTimerRef = useRef(null);

  // Load profile
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getOrCreatePlayerProfile(user.uid, user.displayName || user.email?.split('@')[0] || 'Jugador');
        if (!cancelled) setProfile(p);

        // Check for active match
        const active = await getActiveMatch(user.uid);
        if (!cancelled && active) {
          setMatchId(active.id);
          setMatchData(active);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Search timer
  useEffect(() => {
    if (searching) {
      setSearchTime(0);
      searchTimerRef.current = setInterval(() => setSearchTime(s => s + 1), 1000);
    } else {
      clearInterval(searchTimerRef.current);
      setSearchTime(0);
    }
    return () => clearInterval(searchTimerRef.current);
  }, [searching]);

  const startSearch = useCallback(async () => {
    if (!user || !profile) return;
    setError(null);
    setSearching(true);

    try {
      await joinQueue(user.uid, profile.displayName);

      // Listen for opponents in queue
      let matchCreated = false;
      unsubQueueRef.current = listenToQueue(user.uid, async (opponent) => {
        if (matchCreated) return;
        matchCreated = true;

        try {
          const id = await createMatch(
            user.uid, profile.displayName,
            opponent.userId, opponent.displayName
          );
          setMatchId(id);
          setSearching(false);
        } catch (err) {
          // Maybe other player already created the match
          matchCreated = false;
        }
      });

      // Also listen for matches where we're player2 (other player created it)
      unsubMatchRef.current = listenForMyMatch(user.uid, (match) => {
        if (match && !matchCreated) {
          matchCreated = true;
          setMatchId(match.id);
          setMatchData(match);
          setSearching(false);
        }
      });
    } catch (err) {
      setError(err.message);
      setSearching(false);
    }
  }, [user, profile]);

  const cancelSearch = useCallback(async () => {
    setSearching(false);
    if (unsubQueueRef.current) { unsubQueueRef.current(); unsubQueueRef.current = null; }
    if (unsubMatchRef.current) { unsubMatchRef.current(); unsubMatchRef.current = null; }
    if (user) await leaveQueue(user.uid);
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubQueueRef.current) unsubQueueRef.current();
      if (unsubMatchRef.current) unsubMatchRef.current();
      clearInterval(searchTimerRef.current);
      // Leave queue on unmount
      if (user) leaveQueue(user.uid).catch(() => {});
    };
  }, [user]);

  const handleMatchEnd = useCallback(() => {
    setMatchId(null);
    setMatchData(null);
    // Reload profile to get updated stats
    if (user) {
      getOrCreatePlayerProfile(user.uid, user.displayName || 'Jugador')
        .then(setProfile)
        .catch(() => {});
    }
  }, [user]);

  const goBack = () => {
    cancelSearch();
    dispatch({ type: 'SET_SCREEN', screen: 'main' });
  };

  // If in a match, show match screen
  if (matchId) {
    return (
      <RankedMatch
        matchId={matchId}
        userId={user.uid}
        onMatchEnd={handleMatchEnd}
      />
    );
  }

  if (showLeaderboard) {
    return <RankedLeaderboard onBack={() => setShowLeaderboard(false)} userId={user?.uid} />;
  }

  if (loading) {
    return (
      <div className="ranked-lobby ranked-lobby--loading">
        <Loader2 className="spin" size={48} />
        <p>Cargando modo ranked...</p>
      </div>
    );
  }

  return (
    <div className="ranked-lobby">
      <header className="ranked-lobby__header">
        <button className="ranked-lobby__back" onClick={goBack}>
          <ArrowLeft size={24} />
        </button>
        <h1><Swords size={28} /> Ranked 1v1</h1>
      </header>

      {error && (
        <div className="ranked-lobby__error">
          <WifiOff size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {profile && (
        <div className="ranked-lobby__profile">
          <div className="ranked-lobby__avatar">
            {profile.displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="ranked-lobby__info">
            <h2>{profile.displayName}</h2>
            <div className="ranked-lobby__stats">
              <span className="ranked-lobby__elo">⭐ {profile.elo || 1000} ELO</span>
              <span className="ranked-lobby__record">
                {profile.wins || 0}W / {profile.draws || 0}D / {profile.losses || 0}L
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="ranked-lobby__actions">
        {!searching ? (
          <button className="ranked-lobby__play-btn" onClick={startSearch}>
            <Swords size={32} />
            <span>Buscar Partida</span>
          </button>
        ) : (
          <div className="ranked-lobby__searching">
            <div className="ranked-lobby__searching-anim">
              <Loader2 className="spin" size={40} />
            </div>
            <p className="ranked-lobby__searching-text">
              Buscando oponente...
            </p>
            <p className="ranked-lobby__searching-time">
              {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}
            </p>
            <button className="ranked-lobby__cancel-btn" onClick={cancelSearch}>
              Cancelar
            </button>
          </div>
        )}

        <button className="ranked-lobby__leaderboard-btn" onClick={() => setShowLeaderboard(true)}>
          <Trophy size={22} />
          <span>Clasificación</span>
        </button>
      </div>

      <div className="ranked-lobby__info-panel">
        <h3>¿Cómo funciona?</h3>
        <ul>
          <li>🏟️ Elige un equipo real</li>
          <li>⚽ Se simulan 2 partidos (ida y vuelta)</li>
          <li>🏆 El ganador sube de ELO</li>
          <li>⏱️ Cada fase tiene un temporizador</li>
        </ul>
      </div>
    </div>
  );
}
