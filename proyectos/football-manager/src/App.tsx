import { useState, useEffect } from 'react';
import { GameBrain } from './core/GameBrain';
import { processScrapedData, createInitialGameState } from './utils/dataProcessor';
import { formatLeagueName, formatGroupName, formatMoney } from './utils/formatters';
import { GameState, Team, Player } from './types';
import './App.css';
import './styles/matchday.css';

// Screens
import { MainMenu } from './screens/MainMenu';
import { TeamSelection } from './screens/TeamSelection';
import { Dashboard } from './screens/Dashboard';
import { Squad } from './screens/Squad';
import { Matches } from './screens/Matches';
import { Table } from './screens/Table';
import { Transfers } from './screens/Transfers';
import { MatchDay } from './screens/MatchDay';
import { Match } from './types';

type Screen = 'menu' | 'teamSelect' | 'dashboard' | 'squad' | 'matches' | 'table' | 'transfers' | 'matchday';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameBrain, setGameBrain] = useState<GameBrain | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [rawData, setRawData] = useState<any>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  // Load scraped data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const response = await fetch('/data/football-data.json');
      if (response.ok) {
        const data = await response.json();
        setRawData(data);
        setDataLoaded(true);
        console.log('Datos cargados:', Object.keys(data.teams).length, 'equipos');
      } else {
        console.error('Error cargando datos:', response.status);
      }
    } catch (error) {
      console.log('Data not yet available, will retry...', error);
      setTimeout(loadData, 5000);
    }
  }

  function startNewGame(teamId: string, playerName: string) {
    if (!rawData) return;

    const processedData = processScrapedData(rawData);
    const initialState = createInitialGameState(processedData, teamId, playerName);
    
    const brain = new GameBrain(initialState);
    
    // Generate fixtures
    brain.generateFixtures();
    
    setGameState(initialState);
    setGameBrain(brain);
    setScreen('dashboard');
  }

  function advanceDay() {
    if (!gameBrain) return;
    gameBrain.advanceDay();
    setGameState({ ...gameBrain.getState() });
  }

  function advanceToNextMatch() {
    if (!gameBrain || !gameState) return;
    
    // Get next match
    const nextMatch = gameBrain.getUpcomingMatches(gameState.playerTeamId, 1)[0];
    
    if (nextMatch) {
      // Advance to match day
      const targetDate = new Date(nextMatch.date);
      const currentDate = new Date(gameState.currentDate);
      
      while (currentDate < targetDate) {
        gameBrain.advanceDay();
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setGameState({ ...gameBrain.getState() });
      setCurrentMatch(nextMatch);
      setScreen('matchday');
    }
  }

  function finishMatch() {
    if (!gameBrain) return;
    gameBrain.advanceDay(); // Move past match day
    setGameState({ ...gameBrain.getState() });
    setCurrentMatch(null);
    setScreen('dashboard');
  }

  // Get current team
  const playerTeam = gameState?.teams[gameState.playerTeamId];

  return (
    <div className="app">
      {screen === 'menu' && (
        <MainMenu
          dataLoaded={dataLoaded}
          onNewGame={() => setScreen('teamSelect')}
          onLoadGame={() => {/* TODO */}}
        />
      )}

      {screen === 'teamSelect' && rawData && (
        <TeamSelection
          teams={Object.values(rawData.teams)}
          onSelect={(teamId, playerName) => startNewGame(teamId, playerName)}
          onBack={() => setScreen('menu')}
        />
      )}

      {gameState && gameBrain && screen !== 'menu' && screen !== 'teamSelect' && (
        <div className="game-container">
          {/* Sidebar */}
          <nav className="sidebar">
            <div className="team-info">
              <h2>{playerTeam?.name}</h2>
              <p>{formatLeagueName(playerTeam?.league || '')} - {formatGroupName(playerTeam?.group || '')}</p>
            </div>
            
            <div className="nav-links">
              <button 
                className={screen === 'dashboard' ? 'active' : ''} 
                onClick={() => setScreen('dashboard')}
              >
                📊 Dashboard
              </button>
              <button 
                className={screen === 'squad' ? 'active' : ''} 
                onClick={() => setScreen('squad')}
              >
                👥 Plantilla
              </button>
              <button 
                className={screen === 'matches' ? 'active' : ''} 
                onClick={() => setScreen('matches')}
              >
                ⚽ Partidos
              </button>
              <button 
                className={screen === 'table' ? 'active' : ''} 
                onClick={() => setScreen('table')}
              >
                📋 Clasificación
              </button>
              <button 
                className={screen === 'transfers' ? 'active' : ''} 
                onClick={() => setScreen('transfers')}
              >
                💰 Fichajes
              </button>
            </div>

            <div className="game-controls">
              <div className="date-display">
                📅 {new Date(gameState.currentDate).toLocaleDateString('es-ES')}
              </div>
              <button className="advance-btn" onClick={advanceDay}>
                Avanzar día →
              </button>
              <button className="advance-btn" onClick={advanceToNextMatch}>
                Ir al partido →→
              </button>
            </div>

            <div className="finances">
              <p>💰 {formatMoney(playerTeam?.budget || 0)}</p>
            </div>
          </nav>

          {/* Main content */}
          <main className="main-content">
            {screen === 'dashboard' && (
              <Dashboard 
                gameState={gameState} 
                gameBrain={gameBrain}
              />
            )}
            {screen === 'squad' && (
              <Squad 
                team={playerTeam!} 
                players={gameState.players}
                gameBrain={gameBrain}
              />
            )}
            {screen === 'matches' && (
              <Matches 
                gameState={gameState}
                gameBrain={gameBrain}
              />
            )}
            {screen === 'table' && (
              <Table 
                gameState={gameState}
                gameBrain={gameBrain}
              />
            )}
            {screen === 'transfers' && (
              <Transfers 
                gameState={gameState}
                gameBrain={gameBrain}
                onUpdate={() => setGameState({ ...gameBrain.getState() })}
              />
            )}
            {screen === 'matchday' && currentMatch && (
              <MatchDay
                gameState={gameState}
                gameBrain={gameBrain}
                match={currentMatch}
                onFinish={finishMatch}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
