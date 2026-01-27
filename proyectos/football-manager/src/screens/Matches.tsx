import { GameState, Match } from '../types';
import { GameBrain } from '../core/GameBrain';

interface Props {
  gameState: GameState;
  gameBrain: GameBrain;
}

export function Matches({ gameState, gameBrain }: Props) {
  const team = gameState.teams[gameState.playerTeamId];
  
  const upcomingMatches = gameBrain.getUpcomingMatches(team.id, 10);
  const recentMatches = gameBrain.getRecentResults(team.id, 10);

  function renderMatch(match: Match, showResult: boolean) {
    const isHome = match.homeTeamId === team.id;
    const opponent = isHome 
      ? gameState.teams[match.awayTeamId] 
      : gameState.teams[match.homeTeamId];

    const result = showResult && match.played
      ? (isHome 
        ? `${match.homeScore} - ${match.awayScore}`
        : `${match.awayScore} - ${match.homeScore}`)
      : null;

    const won = match.played && (isHome 
      ? match.homeScore! > match.awayScore!
      : match.awayScore! > match.homeScore!);
    const drew = match.played && match.homeScore === match.awayScore;

    return (
      <div key={match.id} className={`match-card ${match.played ? (won ? 'win' : drew ? 'draw' : 'loss') : ''}`}>
        <div className="match-date">
          {new Date(match.date).toLocaleDateString('es-ES', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short' 
          })}
        </div>
        <div className="match-teams">
          <span className="venue">{isHome ? '🏠' : '✈️'}</span>
          <span className="opponent">{opponent?.name}</span>
        </div>
        {result && (
          <div className={`match-result ${won ? 'win' : drew ? 'draw' : 'loss'}`}>
            {result}
          </div>
        )}
        <div className="match-meta">
          <span>Jornada {match.matchday}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="matches-screen">
      <h1>Partidos</h1>

      <div className="matches-container">
        <div className="matches-section">
          <h2>📅 Próximos partidos</h2>
          <div className="matches-list">
            {upcomingMatches.length > 0 ? (
              upcomingMatches.map(m => renderMatch(m, false))
            ) : (
              <p className="no-matches">No hay partidos programados</p>
            )}
          </div>
        </div>

        <div className="matches-section">
          <h2>📊 Resultados recientes</h2>
          <div className="matches-list">
            {recentMatches.length > 0 ? (
              recentMatches.map(m => renderMatch(m, true))
            ) : (
              <p className="no-matches">Sin partidos jugados</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
