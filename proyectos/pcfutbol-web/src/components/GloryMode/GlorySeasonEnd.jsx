import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { Trophy, TrendingUp, ArrowUp, ChevronRight, Star } from 'lucide-react';
import GloryCardSelection from './GloryCardSelection';
import GloryUnlockReveal from './GloryUnlockReveal';
import GloryEvent from './GloryEvent';
import { BadgePreview } from './BadgeEditor';
import { applyCard, drawEvent, GLORY_DIVISIONS } from '../../game/gloryEngine';
import { getUnlockedCards, buildGloryStats, checkMilestones } from '../../game/gloryUnlocks';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './GloryMode.scss';

/**
 * Glory Mode Season End — shown after regular SeasonEnd
 * Flow: Summary → Random Event → Card Selection → Next Season
 */
export default function GlorySeasonEnd({ leaguePosition, onComplete }) {
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const gloryData = state.gloryData || {};
  const [phase, setPhase] = useState('summary'); // summary → cards → done
  const [unlockedCardIds, setUnlockedCardIds] = useState(null);
  const [newUnlocks, setNewUnlocks] = useState([]);

  // Load unlocks + check milestones
  useEffect(() => {
    async function syncUnlocks() {
      if (!user?.uid) {
        setUnlockedCardIds(getUnlockedCards([]));
        return;
      }
      try {
        const docRef = doc(db, 'glory_unlocks', user.uid);
        const snap = await getDoc(docRef);
        const existing = snap.exists() ? (snap.data().completedMilestones || []) : [];

        // Check for new milestones
        const stats = buildGloryStats(state);
        const newlyCompleted = checkMilestones(stats, existing);

        if (newlyCompleted.length > 0) {
          const allCompleted = [...existing, ...newlyCompleted];
          await setDoc(docRef, {
            completedMilestones: allCompleted,
            stats,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          setUnlockedCardIds(getUnlockedCards(allCompleted));
          setNewUnlocks(newlyCompleted);
        } else {
          setUnlockedCardIds(getUnlockedCards(existing));
        }

        // Also save cumulative stats
        await setDoc(docRef, { stats, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('Error syncing glory unlocks:', e);
        setUnlockedCardIds(getUnlockedCards([]));
      }
    }
    syncUnlocks();
  }, [user?.uid]);

  // Determine promotion
  const promoted = leaguePosition <= 2;
  const currentDivIndex = GLORY_DIVISIONS.findIndex(d => d.id === gloryData.division);
  const currentDiv = GLORY_DIVISIONS[currentDivIndex] || GLORY_DIVISIONS[0];
  const nextDiv = promoted && currentDivIndex < GLORY_DIVISIONS.length - 1
    ? GLORY_DIVISIONS[currentDivIndex + 1] : null;

  // Random event for this season
  const event = useMemo(() => drawEvent(gloryData.usedEventIds || []), []);

  const handleEventResolve = (option) => {
    // Build state object that event effects expect (squad, budget, etc.)
    // Deep clone to prevent React state mutation
    const effectState = {
      ...gloryData,
      squad: (state.team?.players || []).map(p => ({ ...p })),
      budget: state.money,
    };
    
    // Apply event effect
    const result = option.effect ? option.effect(effectState) : effectState;
    
    // Sync budget changes
    if (result.budget !== state.money) {
      dispatch({ type: 'UPDATE_MONEY', payload: result.budget - state.money });
    }

    // Sync squad changes
    if (result.squad !== effectState.squad) {
      dispatch({
        type: 'UPDATE_GLORY_STATE',
        payload: { team: { ...state.team, players: result.squad } }
      });
    }

    // Track used event
    const usedIds = [...(gloryData.usedEventIds || []), event?.id].filter(Boolean);
    dispatch({
      type: 'UPDATE_GLORY_STATE',
      payload: { gloryData: { ...gloryData, usedEventIds: usedIds } }
    });

    setTimeout(() => setPhase(newUnlocks.length > 0 ? 'reveal' : 'cards'), 600);
  };

  const handleCardSelect = (cardId) => {
    const updatedGlory = applyCard(
      { ...gloryData, squad: state.team?.players || [], budget: state.money },
      cardId
    );

    // Sync squad changes back to team
    if (updatedGlory.squad) {
      dispatch({
        type: 'UPDATE_GLORY_STATE',
        payload: {
          team: { ...state.team, players: updatedGlory.squad },
          gloryData: {
            ...gloryData,
            pickedCards: updatedGlory.pickedCards || [...(gloryData.pickedCards || []), cardId],
            perks: updatedGlory.perks || gloryData.perks,
            replaysLeft: updatedGlory.replaysLeft ?? gloryData.replaysLeft ?? 0,
            sheikhSeasons: updatedGlory.sheikhSeasons ?? gloryData.sheikhSeasons ?? 0,
            unlockedFormations: updatedGlory.unlockedFormations || gloryData.unlockedFormations || [],
            sponsorMultiplier: updatedGlory.sponsorMultiplier ?? gloryData.sponsorMultiplier ?? 1,
            wildCardPlayers: updatedGlory.wildCardPlayers || gloryData.wildCardPlayers || [],
            blackMarketPlayers: updatedGlory.blackMarketPlayers || gloryData.blackMarketPlayers || undefined,
            blackMarketUsed: updatedGlory.blackMarketUsed ?? gloryData.blackMarketUsed ?? false,
            forcedSwapUsed: updatedGlory.forcedSwapUsed ?? gloryData.forcedSwapUsed ?? false,
            diplomatUsed: gloryData.diplomatUsed ?? false,
          }
        }
      });
    }

    // Sync budget
    if (updatedGlory.budget !== state.money) {
      dispatch({ type: 'UPDATE_MONEY', payload: updatedGlory.budget - state.money });
    }

    setTimeout(() => setPhase('done'), 800);
  };

  const handleContinue = () => {
    // Season transition, promotion, aging, perks already handled by handleGloryNewSeason
    // in SeasonEnd.jsx (which runs BEFORE GlorySeasonEnd is shown)
    // Here we just close the glory season end UI
    onComplete?.();
  };

  if (phase === 'event' && event) {
    return <GloryEvent event={event} onResolve={handleEventResolve} />;
  }

  if (phase === 'reveal' && newUnlocks.length > 0) {
    return (
      <GloryUnlockReveal
        milestoneIds={newUnlocks}
        onDone={() => setPhase('cards')}
      />
    );
  }

  if (phase === 'cards') {
    return (
      <GloryCardSelection
        pickedCardIds={gloryData.pickedCards || []}
        season={gloryData.season || 1}
        unlockedCardIds={unlockedCardIds}
        onSelect={handleCardSelect}
      />
    );
  }

  // Summary / Done phase
  return (
    <div className="glory-season-end">
      <div className="glory-season-end__card fade-in-up">
        {gloryData.badge && (
          <div className="glory-season-end__badge">
            <BadgePreview badge={gloryData.badge} size={64} />
          </div>
        )}

        <h2 className="glory-season-end__title">
          {phase === 'done' ? 'Preparado para la siguiente temporada' : `Fin de Temporada ${gloryData.season || 1}`}
        </h2>

        <div className="glory-season-end__division">
          <span>{currentDiv.name}</span>
          {promoted && nextDiv && (
            <>
              <ArrowUp size={16} className="glory-season-end__arrow" />
              <span className="glory-season-end__promoted">{nextDiv.name}</span>
            </>
          )}
        </div>

        <div className="glory-season-end__position">
          <span className="glory-season-end__pos-number">{leaguePosition}º</span>
          <span className="glory-season-end__pos-label">
            {promoted ? 'Ascenso directo' : 'Posición final'}
          </span>
        </div>

        {phase === 'summary' && (
          <div className="glory-season-end__stats">
            <div className="glory-season-end__stat">
              <Trophy size={14} />
              <span>Temporada {gloryData.season || 1}</span>
            </div>
            <div className="glory-season-end__stat">
              <Star size={14} />
              <span>{(gloryData.pickedCards || []).length} cartas recogidas</span>
            </div>
          </div>
        )}

        <button
          className="glory-season-end__btn"
          onClick={() => {
            if (phase === 'summary') {
              // Skip events — go straight to reveals or cards
              if (newUnlocks.length > 0) {
                setPhase('reveal');
              } else {
                setPhase('cards');
              }
            } else {
              handleContinue();
            }
          }}
        >
          {phase === 'summary' && 'Continuar'}
          {phase === 'done' && (
            <>
              {nextDiv ? `Empezar en ${nextDiv.name}` : 'Siguiente temporada'}
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
