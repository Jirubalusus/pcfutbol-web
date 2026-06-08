import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import {
  ArrowLeft,
  ChevronRight,
  Crown,
  Mountain,
  Play,
  Shield,
  Trophy,
  Unlock,
} from 'lucide-react';
import LoadingIndicator from '../common/LoadingIndicator';
import GloryCollection from './GloryCollection';
import { getUnlockedCards } from '../../game/gloryUnlocks';
import { getGlorySave, deleteGlorySave } from '../../firebase/glorySaveService';
import { getLocalGloryInfo, loadLocalGlory, deleteLocalGlory } from '../../game/localGlorySave';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { GLORY_CARDS } from '../../game/gloryEngine';
import './GloryMode.scss';

function cloudSaveMillis(saveData) {
  const ts = saveData?.lastSaved;
  if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts && typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (typeof ts === 'number') return ts;
  return 0;
}

function shouldPreferLocalGloryBackup(local, saveData) {
  if (!local?.state) return false;
  if (local.sync?.pending) return true;
  const localMs = local.savedAt || 0;
  const cloudMs = cloudSaveMillis(saveData);
  return localMs > 0 && localMs > cloudMs;
}

export default function GloryMenu() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state, dispatch } = useGame();
  const [view, setView] = useState('menu');
  const [unlockedCards, setUnlockedCards] = useState([]);
  const [completedMilestones, setCompletedMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [saveInfo, setSaveInfo] = useState(null);

  const isGloryInMemory = state.gameMode === 'glory' && state.gameStarted;

  useEffect(() => {
    async function init() {
      if (!user?.uid) {
        setUnlockedCards(getUnlockedCards([]));
        setLoading(false);
        return;
      }
      try {
        const unlockRef = doc(db, 'glory_unlocks', user.uid);
        const unlockSnap = await getDoc(unlockRef);
        if (unlockSnap.exists()) {
          const data = unlockSnap.data();
          setCompletedMilestones(data.completedMilestones || []);
          setUnlockedCards(getUnlockedCards(data.completedMilestones || []));
        } else {
          setUnlockedCards(getUnlockedCards([]));
        }

        if (isGloryInMemory) {
          setHasSave(true);
          setSaveInfo({
            season: state.gloryData?.season || 1,
            division: state.gloryData?.division || 'segundaRFEF',
          });
        } else {
          const [cloudSave, local] = await Promise.all([
            getGlorySave(user.uid).catch(() => null),
            Promise.resolve(loadLocalGlory({ uid: user.uid })),
          ]);
          if (local?.state && (!cloudSave || shouldPreferLocalGloryBackup(local, cloudSave))) {
            setHasSave(true);
            setSaveInfo({
              season: local.state.gloryData?.season || local.summary?.season || 1,
              division: local.state.gloryData?.division || local.summary?.division || 'segundaRFEF',
            });
          } else if (cloudSave) {
            setHasSave(true);
            setSaveInfo({
              season: cloudSave.gloryData?.season || 1,
              division: cloudSave.gloryData?.division || 'segundaRFEF',
            });
          } else {
            setHasSave(false);
            setSaveInfo(null);
          }
        }
      } catch (e) {
        console.warn('Error loading glory data:', e);
        setUnlockedCards(getUnlockedCards([]));
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user?.uid, isGloryInMemory, state.gloryData?.division, state.gloryData?.season]);

  const handleContinue = async () => {
    if (isGloryInMemory) {
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
      return;
    }
    if (!user?.uid) return;
    setLoadingAction(true);
    try {
      let loaded = false;
      const [saveData, local] = await Promise.all([
        getGlorySave(user.uid).catch(() => null),
        Promise.resolve(loadLocalGlory({ uid: user.uid })),
      ]);
      if (local?.state && (!saveData || shouldPreferLocalGloryBackup(local, saveData))) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...local.state, _gloryUserId: user.uid, gameMode: 'glory', rankedMatchId: null } });
        loaded = true;
      } else if (saveData) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...saveData, _gloryUserId: user.uid, gameMode: 'glory', rankedMatchId: null } });
        loaded = true;
      }
      if (!loaded) return;
      const dn = getAuth().currentUser?.displayName;
      if (dn) dispatch({ type: 'SET_MANAGER_NAME', payload: dn });
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
    } catch (err) {
      console.error('Error loading Glory save:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleNew = async () => {
    if (user?.uid) {
      try { await deleteGlorySave(user.uid); } catch { /* skip */ }
      deleteLocalGlory({ uid: user.uid });
    }
    if (isGloryInMemory) {
      dispatch({ type: 'RESET_GAME' });
    }
    setHasSave(false);
    setSaveInfo(null);
    dispatch({ type: 'SET_SCREEN', payload: 'glory_setup' });
  };

  const handleBack = () => {
    dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
  };

  if (view === 'collection') {
    return (
      <GloryCollection
        unlockedCards={unlockedCards}
        completedMilestones={completedMilestones}
        onBack={() => setView('menu')}
      />
    );
  }

  const totalCards = GLORY_CARDS.length;
  const collectionProgress = Math.round((unlockedCards.length / totalCards) * 100);
  const saveDivision = saveInfo
    ? t(`glory.divisions.${saveInfo.division}`, { defaultValue: saveInfo.division })
    : t('glory.divisions.segundaRFEF');
  const lockedCards = Math.max(0, totalCards - unlockedCards.length);

  return (
    <div className="glory-menu unified-screen">
      <div className="glory-menu__background" aria-hidden="true">
        <div className="glory-menu__gradient" />
        <div className="glory-menu__pattern" />
      </div>

      <header className="glory-menu__topbar">
        <button className="glory-menu__back" onClick={handleBack} aria-label={t('glory.common.back')}>
          <ArrowLeft size={18} />
          <span>{t('glory.common.back')}</span>
        </button>
        <div className="glory-menu__topline">
          <span>{t('glory.menu.legacyMode')}</span>
          <strong>{t('glory.menu.ownClub')}</strong>
        </div>
      </header>

      <main className="glory-menu__content">
        {loading ? (
          <div className="glory-menu__loading">
            <LoadingIndicator size="md" />
          </div>
        ) : (
          <div className="glory-menu__grid">
            <section className="glory-menu__hero">
              <div className="glory-menu__hero-kicker">
                <Mountain size={16} />
                <span>{t('glory.menu.kicker')}</span>
              </div>
              <h1>{t('glory.menu.heroTitle')}</h1>
              <p>{t('glory.menu.heroDesc')}</p>

              <div className="glory-menu__hero-stats" aria-label={t('glory.menu.summaryAria')}>
                <div>
                  <strong>4</strong>
                  <span>{t('glory.menu.promotions')}</span>
                </div>
                <div>
                  <strong>{totalCards}</strong>
                  <span>{t('glory.menu.uniqueCards')}</span>
                </div>
                <div>
                  <strong>UCL</strong>
                  <span>{t('glory.menu.finalGoal')}</span>
                </div>
              </div>
            </section>

            <aside className="glory-menu__panel" aria-label={t('glory.menu.actionsAria')}>
              {hasSave ? (
                <div className="glory-menu__save-card">
                  <div className="glory-menu__save-icon">
                    <Crown size={22} />
                  </div>
                  <div>
                    <span className="glory-menu__eyebrow">{t('glory.menu.activeSave')}</span>
                    <h2>{t('glory.common.season')} {saveInfo?.season || 1}</h2>
                    <p>{saveDivision}</p>
                  </div>
                </div>
              ) : (
                <div className="glory-menu__save-card glory-menu__save-card--empty">
                  <div className="glory-menu__save-icon">
                    <Shield size={22} />
                  </div>
                  <div>
                    <span className="glory-menu__eyebrow">{t('glory.menu.newProject')}</span>
                    <h2>{t('glory.menu.noActiveSave')}</h2>
                    <p>{t('glory.menu.newProjectDesc')}</p>
                  </div>
                </div>
              )}

              <div className="glory-menu__actions">
                {hasSave && (
                  <button
                    className="glory-menu__btn glory-menu__btn--continue"
                    onClick={handleContinue}
                    disabled={loadingAction}
                  >
                    <span className="glory-menu__btn-icon"><Play size={18} /></span>
                    <span>
                      {t('glory.menu.continueRoad')}
                      <small>S{saveInfo?.season || 1} - {saveDivision}</small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                )}
                <button
                  className="glory-menu__btn glory-menu__btn--new"
                  onClick={handleNew}
                  disabled={loadingAction}
                >
                  <span className="glory-menu__btn-icon"><Mountain size={18} /></span>
                  <span>{hasSave ? t('glory.menu.newRoad') : t('glory.menu.startRoad')}</span>
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="glory-menu__panel-note">
                <Trophy size={16} />
                <span>{t('glory.menu.panelNote')}</span>
              </div>
            </aside>

            <section className="glory-menu__collection-showcase" aria-label={t('glory.menu.collectionAria')}>
              <div className="glory-menu__collection-copy">
                <span className="glory-menu__eyebrow">{t('glory.menu.showcaseEyebrow')}</span>
                <h2>{t('glory.menu.cardsUnlocked', { unlocked: unlockedCards.length, total: totalCards })}</h2>
                <p>{t('glory.menu.showcaseDesc')}</p>
              </div>
              <div className="glory-menu__collection-meter">
                <div className="glory-menu__collection-ring" style={{ '--progress': `${collectionProgress}%` }}>
                  <strong>{collectionProgress}%</strong>
                  <span>{t('glory.menu.complete')}</span>
                </div>
                <div className="glory-menu__collection-stats">
                  <span><Unlock size={15} /> {t('glory.menu.unlockedCount', { count: unlockedCards.length })}</span>
                  <span><Shield size={15} /> {t('glory.menu.pendingCount', { count: lockedCards })}</span>
                  <span><Trophy size={15} /> {t('glory.menu.raritiesCount')}</span>
                </div>
              </div>
              <button className="glory-menu__collection-cta" onClick={() => setView('collection')}>
                {t('glory.menu.viewShowcase')} <ChevronRight size={18} />
              </button>
            </section>

            <section className="glory-menu__roadmap" aria-label={t('glory.menu.roadmapAria')}>
              <span>{t('glory.divisions.segundaRFEF')}</span>
              <ChevronRight size={16} />
              <span>{t('glory.divisions.primeraRFEF')}</span>
              <ChevronRight size={16} />
              <span>{t('glory.divisions.segunda')}</span>
              <ChevronRight size={16} />
              <strong>Champions</strong>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
