import { lazy, Suspense, useEffect } from 'react';
import Office from './components/Office/Office';
import { GameProvider, useGame } from './context/GameContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataProvider';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationCenter from './components/Notifications/NotificationCenter';
import MainMenu from './components/MainMenu/MainMenu';
import NicknameModal from './components/NicknameModal/NicknameModal';
import PageLoader from './components/common/PageLoader';
import { useAudioManager } from './hooks/useAudioManager';
import { useSoundEffects } from './hooks/useSoundEffects';
import { checkPremiumStatus } from './services/purchaseService';

const TeamSelection = lazy(() => import('./components/TeamSelection/TeamSelection'));
const CityMode = lazy(() => import('./components/City3D/CityMode'));
const ContrarrelojSetup = lazy(() => import('./components/ContrarrelojSetup/ContrarrelojSetup'));
const ContrarrelojEnd = lazy(() => import('./components/ContrarrelojEnd/ContrarrelojEnd'));
const Ranking = lazy(() => import('./components/Ranking/Ranking'));
const RankedLobby = lazy(() => import('./components/Ranked/RankedLobby'));
const RankedMatch = lazy(() => import('./components/Ranked/RankedMatch'));
const DraftMatch = lazy(() => import('./components/Ranked/DraftMatch'));
const RankedLeaderboard = lazy(() => import('./components/Ranked/RankedLeaderboard'));
const ProManagerSetup = lazy(() => import('./components/ProManager/ProManagerSetup'));
const ProManagerSeasonEnd = lazy(() => import('./components/ProManager/ProManagerSeasonEnd'));
const GlorySetup = lazy(() => import('./components/GloryMode/GlorySetup'));
const GloryMenu = lazy(() => import('./components/GloryMode/GloryMenu'));
const WorldCup = lazy(() => import('./components/WorldCup/WorldCup'));
import './index.css';
import './styles/_effects.scss';
import './styles/_laptop-responsive.scss';
import './styles/_unified-screen.scss';

function GameRouter() {
  const { state, dispatch } = useGame();
  const { loading: authLoading, needsNickname, setNickname, isAuthenticated, isEmailVerified } = useAuth();

  // Check premium status (Google Play Billing) on native
  useEffect(() => {
    async function checkPremium() {
      try {
        const isPremium = await checkPremiumStatus();
        if (isPremium) dispatch({ type: 'SET_PREMIUM', payload: true });
      } catch {
        // Non-native platforms can skip billing bootstrap
      }
    }
    if (!authLoading) checkPremium();
  }, [authLoading, dispatch]);
  
  // Audio manager
  const isMatchScreen = state.playingMatch || state.pendingMatch;
  const audioScreen = isMatchScreen ? 'matchDay'
    : state.currentScreen === 'team_selection' ? 'teamSelection'
    : state.currentScreen === 'contrarreloj_setup' ? 'contrarrelojSetup'
    : state.currentScreen === 'office' ? 'default'
    : 'menu';
  useAudioManager(audioScreen, state.settings, state.preseasonPhase ? 'preseason' : 'season');
  
  // SFX
  const { playClick, playToggle } = useSoundEffects(state.settings);
  useEffect(() => {
    const handleClick = (e) => {
      const el = e.target.closest('button, a, [role="button"], .clickable');
      if (!el) return;
      if (el.classList.contains('settings__toggle') || el.querySelector('.toggle-knob')) {
        playToggle();
      } else {
        playClick();
      }
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [playClick, playToggle]);
  
  if (!state.loaded || authLoading) {
    return <PageLoader label="Cargando" />;
  }
  
  const showNotifications = state.gameStarted && state.currentScreen === 'office';

  if (isAuthenticated && isEmailVerified && needsNickname) {
    return <NicknameModal onConfirm={setNickname} />;
  }

  const renderScreen = () => {
    switch (state.currentScreen) {
      case 'team_selection':
        return <TeamSelection />;
      case 'office':
        if (state.settings?.cityMode3D && !state._cityBypass) {
          return <CityMode onExitCity={() => dispatch({ type: 'SET_CITY_BYPASS', payload: true })} />;
        }
        return <Office />;
      case 'contrarreloj_setup':
        return <ContrarrelojSetup />;
      case 'contrarreloj_end':
        return <ContrarrelojEnd />;
      case 'ranking':
        return <Ranking />;
      case 'ranked_lobby':
        return <RankedLobby />;
      case 'ranked_match':
        return <RankedMatch />;
      case 'ranked_draft':
        return <DraftMatch
          matchId={state.rankedMatchId}
          onExit={() => dispatch({ type: 'SET_SCREEN', payload: 'ranked_lobby' })}
        />;
      case 'ranked_leaderboard':
        return <RankedLeaderboard />;
      case 'promanager_setup':
        return <ProManagerSetup />;
      case 'promanager_season_end':
        return <ProManagerSeasonEnd />;
      case 'glory_menu':
        return <GloryMenu />;
      case 'glory_setup':
        return <GlorySetup />;
      case 'worldcup_setup':
      case 'worldcup':
        return <WorldCup onExit={() => dispatch({ type: 'SET_SCREEN', payload: 'main_menu' })} />;
      default:
        return <MainMenu />;
    }
  };

  const getLoadingLabel = () => {
    if (state.currentScreen === 'office' && state.settings?.cityMode3D && !state._cityBypass) {
      return 'Cargando ciudad';
    }

    const labels = {
      office: 'Cargando oficina',
      contrarreloj_setup: 'Cargando contrarreloj',
      contrarreloj_end: 'Cargando resultados',
      ranking: 'Cargando ranking',
      ranked_lobby: 'Cargando lobby',
      ranked_match: 'Cargando partido',
      ranked_draft: 'Cargando draft',
      ranked_leaderboard: 'Cargando clasificación',
      promanager_setup: 'Cargando Pro Manager',
      promanager_season_end: 'Cargando fin de temporada',
      glory_menu: 'Cargando Glory Mode',
      glory_setup: 'Cargando configuración',
      worldcup_setup: 'Cargando Mundial',
      worldcup: 'Cargando Mundial'
    };

    return labels[state.currentScreen] || 'Cargando';
  };

  return (
    <>
      {showNotifications && <NotificationCenter />}
      <Suspense fallback={<PageLoader label={getLoadingLabel()} />}>
        {renderScreen()}
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <GameProvider>
              <GameRouter />
            </GameProvider>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
