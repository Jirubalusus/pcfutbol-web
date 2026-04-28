import React, { useState, useEffect } from 'react';
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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './GloryMode.scss';

export default function GloryMenu() {
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
  }, [user?.uid, isGloryInMemory, state.gloryData?.division, state.gloryData?.season]);

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
    segunda: 'Segunda Division',
    laliga: 'La Liga',
  };
  const collectionProgress = Math.round((unlockedCards.length / 24) * 100);
  const saveDivision = saveInfo ? (divNames[saveInfo.division] || saveInfo.division) : 'Segunda RFEF';
  const lockedCards = Math.max(0, 24 - unlockedCards.length);

  return (
    <div className="glory-menu unified-screen">
      <div className="glory-menu__background" aria-hidden="true">
        <div className="glory-menu__gradient" />
        <div className="glory-menu__pattern" />
      </div>

      <header className="glory-menu__topbar">
        <button className="glory-menu__back" onClick={handleBack} aria-label="Volver">
          <ArrowLeft size={18} />
          <span>Volver</span>
        </button>
        <div className="glory-menu__topline">
          <span>Modo legado</span>
          <strong>Club propio</strong>
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
                <span>Camino a la Gloria</span>
              </div>
              <h1>Crea tu club y conquista Europa.</h1>
              <p>Un modo compacto: diseña tu identidad, sobrevive a cada temporada y escala desde barro hasta Champions.</p>

              <div className="glory-menu__hero-stats" aria-label="Resumen del modo">
                <div>
                  <strong>4</strong>
                  <span>Ascensos</span>
                </div>
                <div>
                  <strong>24</strong>
                  <span>Cartas únicas</span>
                </div>
                <div>
                  <strong>UCL</strong>
                  <span>Meta final</span>
                </div>
              </div>
            </section>

            <aside className="glory-menu__panel" aria-label="Acciones de Camino a la Gloria">
              {hasSave ? (
                <div className="glory-menu__save-card">
                  <div className="glory-menu__save-icon">
                    <Crown size={22} />
                  </div>
                  <div>
                    <span className="glory-menu__eyebrow">Partida activa</span>
                    <h2>Temporada {saveInfo?.season || 1}</h2>
                    <p>{saveDivision}</p>
                  </div>
                </div>
              ) : (
                <div className="glory-menu__save-card glory-menu__save-card--empty">
                  <div className="glory-menu__save-icon">
                    <Shield size={22} />
                  </div>
                  <div>
                    <span className="glory-menu__eyebrow">Nuevo proyecto</span>
                    <h2>Sin partida activa</h2>
                    <p>Crea escudo, equipacion y debuta.</p>
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
                      Continuar Camino
                      <small>T{saveInfo?.season || 1} - {saveDivision}</small>
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
                  <span>{hasSave ? 'Nuevo Camino' : 'Iniciar Camino'}</span>
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="glory-menu__panel-note">
                <Trophy size={16} />
                <span>Las cartas desbloqueadas hacen cada nuevo intento más interesante.</span>
              </div>
            </aside>

            <section className="glory-menu__collection-showcase" aria-label="Coleccion de cartas">
              <div className="glory-menu__collection-copy">
                <span className="glory-menu__eyebrow">Vitrina permanente</span>
                <h2>{unlockedCards.length}/24 cartas desbloqueadas</h2>
                <p>Las cartas conseguidas quedan guardadas y cambian tus futuras temporadas.</p>
              </div>
              <div className="glory-menu__collection-meter">
                <div className="glory-menu__collection-ring" style={{ '--progress': `${collectionProgress}%` }}>
                  <strong>{collectionProgress}%</strong>
                  <span>completo</span>
                </div>
                <div className="glory-menu__collection-stats">
                  <span><Unlock size={15} /> {unlockedCards.length} desbloqueadas</span>
                  <span><Shield size={15} /> {lockedCards} pendientes</span>
                  <span><Trophy size={15} /> 3 rarezas</span>
                </div>
              </div>
              <button className="glory-menu__collection-cta" onClick={() => setView('collection')}>
                Ver vitrina <ChevronRight size={18} />
              </button>
            </section>

            <section className="glory-menu__roadmap" aria-label="Camino de ascenso">
              <span>Segunda RFEF</span>
              <ChevronRight size={16} />
              <span>Primera RFEF</span>
              <ChevronRight size={16} />
              <span>Segunda</span>
              <ChevronRight size={16} />
              <strong>Champions</strong>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
