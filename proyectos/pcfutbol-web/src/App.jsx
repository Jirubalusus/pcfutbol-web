import { useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataProvider';
import { ToastProvider } from './components/Toast/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationCenter from './components/Notifications/NotificationCenter';
import MainMenu from './components/MainMenu/MainMenu';
import TeamSelection from './components/TeamSelection/TeamSelection';
import Office from './components/Office/Office';
import ContrarrelojSetup from './components/ContrarrelojSetup/ContrarrelojSetup';
import ContrarrelojEnd from './components/ContrarrelojEnd/ContrarrelojEnd';
import Ranking from './components/Ranking/Ranking';
import { useAudioManager } from './hooks/useAudioManager';
import { useSoundEffects } from './hooks/useSoundEffects';
import './index.css';

function GameRouter() {
  const { state } = useGame();
  const { loading: authLoading } = useAuth();
  
  // Audio manager - detecta pantalla actual y reproduce música acorde
  const isMatchScreen = state.playingMatch || state.pendingMatch;
  const audioScreen = isMatchScreen ? 'matchDay'
    : state.currentScreen === 'team_selection' ? 'teamSelection'
    : state.currentScreen === 'contrarreloj_setup' ? 'contrarrelojSetup'
    : state.currentScreen === 'office' ? 'default'
    : 'menu';
  useAudioManager(audioScreen, state.settings, state.preseasonPhase ? 'preseason' : 'season');
  
  // SFX - click global en botones
  const { playClick, playToggle } = useSoundEffects(state.settings);
  useEffect(() => {
    const handleClick = (e) => {
      const el = e.target.closest('button, a, [role="button"], .clickable');
      if (!el) return;
      // Toggle para switches
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
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>⚽</h1>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }
  
  const showNotifications = state.gameStarted && state.currentScreen === 'office';

  return (
    <>
      {showNotifications && <NotificationCenter />}
      {(() => {
        switch (state.currentScreen) {
          case 'team_selection':
            return <TeamSelection />;
          case 'office':
            return <Office />;
          case 'contrarreloj_setup':
            return <ContrarrelojSetup />;
          case 'contrarreloj_end':
            return <ContrarrelojEnd />;
          case 'ranking':
            return <Ranking />;
          default:
            return <MainMenu />;
        }
      })()}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <GameProvider>
              <GameRouter />
            </GameProvider>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
