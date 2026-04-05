import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { Mountain, Play, BookOpen, ArrowLeft, Loader } from 'lucide-react';
import GloryCollection from './GloryCollection';
import { getUnlockedCards } from '../../game/gloryUnlocks';
import { getGlorySave, deleteGlorySave } from '../../firebase/glorySaveService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './GloryMode.scss';

export default function GloryMenu() {
  const { user } = useAuth();
  const { state, dispatch } = useGame();
  const [view, setView] = useState('menu'); // menu | collection
  const [unlockedCards, setUnlockedCards] = useState([]);
  const [completedMilestones, setCompletedMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [saveInfo, setSaveInfo] = useState(null);

  const isGloryInMemory = state.gameMode === 'glory' && state.gameStarted;

  // Load unlocks + check for save
  useEffect(() => {
    async function init() {
      if (!user?.uid) {
        setUnlockedCards(getUnlockedCards([]));
        setLoading(false);
        return;
      }
      try {
        // Load unlocks
        const unlockRef = doc(db, 'glory_unlocks', user.uid);
        const unlockSnap = await getDoc(unlockRef);
        if (unlockSnap.exists()) {
          const data = unlockSnap.data();
          setCompletedMilestones(data.completedMilestones || []);
          setUnlockedCards(getUnlockedCards(data.completedMilestones || []));
        } else {
          setUnlockedCards(getUnlockedCards([]));
        }

        // Check for save
        if (isGloryInMemory) {
          setHasSave(true);
          setSaveInfo({
            season: state.gloryData?.season || 1,
            division: state.gloryData?.division || 'segundaRFEF',
          });
        } else {
          const save = await getGlorySave(user.uid);
          if (save) {
            setHasSave(true);
            setSaveInfo({
              season: save.gloryData?.season || 1,
              division: save.gloryData?.division || 'segundaRFEF',
            });
          }
        }
      } catch (e) {
        console.warn('Error loading glory data:', e);
        setUnlockedCards(getUnlockedCards([]));
      }
      setLoading(false);
    }
    init();
  }, [user?.uid]);

  const handleContinue = async () => {
    if (isGloryInMemory) {
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
      return;
    }
    if (!user?.uid) return;
    setLoadingAction(true);
    try {
      const saveData = await getGlorySave(user.uid);
      if (saveData) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...saveData, _gloryUserId: user.uid, gameMode: 'glory', rankedMatchId: null } });
        const dn = getAuth().currentUser?.displayName;
        if (dn) dispatch({ type: 'SET_MANAGER_NAME', payload: dn });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      }
    } catch (err) {
      console.error('Error loading Glory save:', err);
    }
    setLoadingAction(false);
  };

  const handleNew = async () => {
    if (user?.uid) {
      try { await deleteGlorySave(user.uid); } catch { /* skip */ }
    }
    if (isGloryInMemory) {
      dispatch({ type: 'RESET_GAME' });
    }
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

  const divNames = {
    segundaRFEF: 'Segunda RFEF',
    primeraRFEF: 'Primera RFEF',
    segunda: 'Segunda División',
    laliga: 'La Liga',
  };

  return (
    <div className="glory-menu unified-screen">
      <div className="glory-menu__content">
        <button className="glory-menu__back" onClick={handleBack}>
          <ArrowLeft size={18} /> Volver
        </button>
        <div className="glory-menu__icon">
          <Mountain size={48} />
        </div>
        <h1 className="glory-menu__title">Camino a la Gloria</h1>
        <p className="glory-menu__subtitle">
          Crea tu club, empieza desde abajo y asciende hasta lo más alto
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader size={24} className="spin" />
          </div>
        ) : (
          <div className="glory-menu__buttons">
            {hasSave && (
              <button
                className="glory-menu__btn glory-menu__btn--continue"
                onClick={handleContinue}
                disabled={loadingAction}
              >
                <Play size={18} />
                Continuar Camino
                {saveInfo && (
                  <span className="glory-menu__btn-info">
                    T{saveInfo.season} · {divNames[saveInfo.division] || saveInfo.division}
                  </span>
                )}
              </button>
            )}
            <button
              className="glory-menu__btn glory-menu__btn--new"
              onClick={handleNew}
              disabled={loadingAction}
            >
              <Mountain size={18} /> {hasSave ? 'Nuevo Camino' : 'Iniciar Camino'}
            </button>
            <button
              className="glory-menu__btn glory-menu__btn--collection"
              onClick={() => setView('collection')}
            >
              <BookOpen size={18} /> Colección ({unlockedCards.length}/{24})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
