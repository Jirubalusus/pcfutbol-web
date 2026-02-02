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
import './index.css';

function GameRouter() {
  const { state } = useGame();
  const { loading: authLoading } = useAuth();
  
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
