import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import {
  getOrCreatePlayer, onPlayerChange, joinQueue, leaveQueue,
  onQueueChange, findOpponent, createMatch, getMatchHistory,
  abandonActiveMatches, findAndCreateMatch, findMyActiveMatch
} from '../../firebase/rankedService';
import {
  joinDraftQueue, leaveDraftQueue, findAndCreateDraftMatch,
  findMyActiveDraftMatch, onDraftQueueChange,
} from '../../firebase/draftService';
import { getTierByLP, getLPInDivision } from './tierUtils';
import { Swords, Trophy, Search, ArrowLeft, Clock, ChevronRight, Wifi, WifiOff, Users } from 'lucide-react';
import './RankedLobby.scss';

export default function RankedLobby() {
  const { t } = useTranslation();
  const { user, displayName: authDisplayName } = useAuth();
  const { dispatch } = useGame();
  const [player, setPlayer] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(null); // '1v1' | 'draft'
  const [matchId, setMatchId] = useState(null);
  const [history, setHistory] = useState([]);
  const [searchTime, setSearchTime] = useState(0);
  const [loading, setLoading] = useState(true);

  // Clear any leftover ranked game state on mount
  useEffect(() => {
    dispatch({ type: 'CLEAR_RANKED_TEAM' });
  }, []);

  // Load player data
  useEffect(() => {
    if (!user?.uid) return;
    let unsub;
    (async () => {
      await getOrCreatePlayer(user.uid, authDisplayName || user.displayName || user.email?.split('@')[0]);
      unsub = onPlayerChange(user.uid, (data) => {
        setPlayer(data);
        setLoading(false);
      });
    })();
    return () => unsub?.();
  }, [user?.uid]);

  // Load match history
  useEffect(() => {
    if (!user?.uid) return;
    getMatchHistory(user.uid, 10).then(setHistory).catch(() => {});
  }, [user?.uid]);

  // Search timer
  useEffect(() => {
    if (!searching) { setSearchTime(0); return; }
    const interval = setInterval(() => setSearchTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [searching]);

  // Queue listener + matchmaking polling
  useEffect(() => {
    if (!searching || !user?.uid) return;
    let cancelled = false;
    let unsubQueue;

    // Listen for queue doc changes (e.g., matched by another player)
    if (searchMode === 'draft') {
      // Exact same pattern as 1v1: listen to queue doc, when deleted → find active match
      unsubQueue = onDraftQueueChange(user.uid, async (queueData) => {
        if (!queueData && searching && !matchId && !cancelled) {
          try {
            const activeMatch = await findMyActiveDraftMatch(user.uid);
            if (activeMatch && !cancelled) {
              setMatchId(activeMatch.id);
              setSearching(false);
            }
          } catch (e) {
            console.error('Error checking active draft match:', e);
          }
        }
      });
    } else {
      unsubQueue = onQueueChange(user.uid, async (queueData) => {
        if (!queueData && searching && !matchId && !cancelled) {
          try {
            const activeMatch = await findMyActiveMatch(user.uid);
            if (activeMatch && !cancelled) {
              setMatchId(activeMatch.id);
              setSearching(false);
            }
          } catch (e) {
            console.error('Error checking active match:', e);
          }
        }
      });
    }

    // Poll for opponents every 3s using transactional matchmaking
    const poll = setInterval(async () => {
      if (cancelled) return;
      try {
        let match;
        if (searchMode === 'draft') {
          match = await findAndCreateDraftMatch(user.uid, player?.displayName, player?.totalLP || 0);
        } else {
          match = await findAndCreateMatch(user.uid, player?.displayName, player?.totalLP || 0);
        }
        if (match && !cancelled) {
          setMatchId(match.id);
          setSearching(false);
        }
      } catch (e) {
        console.error('Matchmaking error:', e);
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      unsubQueue?.();
    };
  }, [searching, user?.uid, player?.totalLP, matchId, searchMode]);

  // Navigate to match when found
  useEffect(() => {
    if (matchId) {
      if (searchMode === 'draft') {
        dispatch({ type: 'SET_SCREEN', payload: 'ranked_draft' });
      } else {
        dispatch({ type: 'SET_SCREEN', payload: 'ranked_match' });
      }
      dispatch({ type: 'SET_RANKED_MATCH_ID', payload: matchId });
    }
  }, [matchId, dispatch, searchMode]);

  const handleFindMatch = async (mode = '1v1') => {
    if (!user?.uid || !player) return;
    setSearching(true);
    setSearchMode(mode);
    try {
      if (mode === 'draft') {
        await joinDraftQueue(user.uid, player.displayName, player.totalLP || 0);
      } else {
        await abandonActiveMatches(user.uid);
        await joinQueue(user.uid, player.displayName, player.totalLP || 0);
      }
    } catch (e) {
      console.error('Error joining queue:', e);
      setSearching(false);
      setSearchMode(null);
    }
  };

  const handleCancelSearch = async () => {
    setSearching(false);
    if (user?.uid) {
      try {
        if (searchMode === 'draft') {
          await leaveDraftQueue(user.uid);
        } else {
          await leaveQueue(user.uid);
        }
      } catch (e) { console.warn('Failed to leave queue:', e); }
    }
    setSearchMode(null);
  };

  const tier = player ? getTierByLP(player.totalLP || 0) : null;
  const lpInDiv = player ? getLPInDivision(player.totalLP || 0) : 0;

  // BUG 12 fix: move dispatch to useEffect instead of render body
  useEffect(() => {
    if (!user?.uid) dispatch({ type: 'SET_SCREEN', payload: 'menu' });
  }, [user?.uid]);
  if (!user?.uid) return null;

  if (loading) {
    return (
      <div className="ranked-lobby">
        <div className="ranked-lobby__loading">
          <Swords size={32} className="spin" />
          <p>{t('ranked.loadingProfile')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ranked-lobby">
      <div className="ranked-lobby__header">
        <button className="btn-back" onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'menu' })}>
          <ArrowLeft size={16} /> {t('common.back')}
        </button>
        <h1><Swords size={24} /> {t('ranked.title')}</h1>
      </div>

      {/* Rank Card */}
      <div className="ranked-lobby__rank-card" style={{ '--tier-color': tier?.color }}>
        <div className="rank-icon">{tier?.icon}</div>
        <div className="rank-info">
          <span className="rank-name">{tier?.name}</span>
          <div className="rank-lp">
            <div className="lp-bar">
              <div className="lp-fill" style={{ width: `${lpInDiv}%` }} />
            </div>
            <span className="lp-text">{lpInDiv} LP</span>
          </div>
        </div>
        <div className="rank-stats">
          <span className="wins">{player?.wins || 0}V</span>
          <span className="sep">/</span>
          <span className="losses">{player?.losses || 0}D</span>
        </div>
      </div>

      {/* Find Match */}
      <div className="ranked-lobby__matchmaking">
        {!searching ? (
          <div className="ranked-lobby__mode-buttons">
            <button className="ranked-lobby__find-btn" onClick={() => handleFindMatch('1v1')}>
              <Swords size={22} />
              <span>1v1 Clásico</span>
            </button>
            <button className="ranked-lobby__find-btn ranked-lobby__find-btn--draft" onClick={() => handleFindMatch('draft')}>
              <Users size={22} />
              <span>Draft</span>
            </button>
          </div>
        ) : (
          <div className="ranked-lobby__searching">
            <div className="searching-animation">
              <Swords size={28} className="pulse" />
            </div>
            <p>{t('ranked.searching')} <span className="time">{Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}</span></p>
            <button className="cancel-btn" onClick={handleCancelSearch}>{t('ranked.cancel')}</button>
          </div>
        )}
      </div>

      {/* Leaderboard link */}
      <button
        className="ranked-lobby__leaderboard-btn"
        onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'ranked_leaderboard' })}
      >
        <Trophy size={18} />
        <span>{t('ranked.globalRanking')}</span>
        <ChevronRight size={16} />
      </button>

      {/* Match History */}
      <div className="ranked-lobby__history">
        <h3><Clock size={16} /> {t('ranked.recentHistory')}</h3>
        {history.length === 0 ? (
          <p className="empty">{t('ranked.noMatchesYet')}</p>
        ) : (
          <div className="history-list">
            {history.map(match => {
              const isP1 = match.player1?.uid === user.uid;
              const won = match.winner === user.uid;
              const draw = !match.winner;
              const rival = isP1 ? match.player2 : match.player1;
              const myPts = isP1 ? match.results?.player1Points : match.results?.player2Points;
              const theirPts = isP1 ? match.results?.player2Points : match.results?.player1Points;
              return (
                <div key={match.id} className={`history-item ${won ? 'win' : draw ? 'draw' : 'loss'}`}>
                  <span className="result">{won ? 'V' : draw ? 'E' : 'D'}</span>
                  <span className="rival">{rival?.displayName}</span>
                  <span className="score">{myPts ?? '?'} - {theirPts ?? '?'}</span>
                  {match.results?.disconnection && <WifiOff size={12} className="dc-icon" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
