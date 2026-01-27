import { GameProvider, useGame } from './context/GameContext';
import { DataProvider } from './context/DataProvider';
import MainMenu from './components/MainMenu/MainMenu';
import TeamSelection from './components/TeamSelection/TeamSelection';
import Office from './components/Office/Office';
import './index.css';

function GameRouter() {
  const { state } = useGame();
  
  if (!state.loaded) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>⚽</h1>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }
  
  switch (state.currentScreen) {
    case 'team_selection':
      return <TeamSelection />;
    case 'office':
      return <Office />;
    default:
      return <MainMenu />;
  }
}

function App() {
  return (
    <DataProvider>
      <GameProvider>
        <GameRouter />
      </GameProvider>
    </DataProvider>
  );
}

export default App;
