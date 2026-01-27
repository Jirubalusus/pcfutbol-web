import { GameState, Match } from '../types';
import { GameBrain } from '../core/GameBrain';
import { formatMoney, formatMarketValue, formatLeagueName, formatGroupName } from '../utils/formatters';

interface Props {
  gameState: GameState;
  gameBrain: GameBrain;
}

export function Dashboard({ gameState, gameBrain }: Props) {
  const team = gameState.teams[gameState.playerTeamId];
  const players = team.playerIds.map(id => gameState.players[id]).filter(Boolean);
  
  // Get next match
  const nextMatch = gameBrain.getUpcomingMatches(team.id, 1)[0];
  
  // Get recent results
  const recentMatches = gameBrain.getRecentResults(team.id, 5);

  // Squad stats
  const avgAge = players.reduce((sum, p) => sum + p.age, 0) / players.length;
  const avgOverall = players.reduce((sum, p) => sum + p.overall, 0) / players.length;
  const injuredCount = players.filter(p => p.injured).length;

  // Top performers
  const topScorers = [...players]
    .sort((a, b) => b.seasonStats.goals - a.seasonStats.goals)
    .slice(0, 3);

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      <div className="dashboard-grid">
        {/* Next match */}
        <div className="card next-match">
          <h2>⚽ Próximo partido</h2>
          {nextMatch ? (
            <div className="match-preview">
              <div className="teams">
                <span className={nextMatch.homeTeamId === team.id ? 'highlight' : ''}>
                  {gameState.teams[nextMatch.homeTeamId]?.name}
                </span>
                <span className="vs">vs</span>
                <span className={nextMatch.awayTeamId === team.id ? 'highlight' : ''}>
                  {gameState.teams[nextMatch.awayTeamId]?.name}
                </span>
              </div>
              <div className="match-info">
                <p>📅 {new Date(nextMatch.date).toLocaleDateString('es-ES')}</p>
                <p>📍 Jornada {nextMatch.matchday}</p>
              </div>
            </div>
          ) : (
            <p>No hay partidos programados</p>
          )}
        </div>

        {/* League position */}
        <div className="card league-position">
          <h2>📋 Clasificación</h2>
          <div className="position-display">
            <span className="position">{team.seasonStats.position || '-'}</span>
            <span className="ordinal">º</span>
          </div>
          <div className="stats-row">
            <span>{team.seasonStats.points} pts</span>
            <span>{team.seasonStats.won}V {team.seasonStats.drawn}E {team.seasonStats.lost}D</span>
          </div>
          <div className="form">
            {team.seasonStats.form.map((f, i) => (
              <span key={i} className={`form-${f.toLowerCase()}`}>{f}</span>
            ))}
          </div>
        </div>

        {/* Squad overview */}
        <div className="card squad-overview">
          <h2>👥 Plantilla</h2>
          <div className="squad-stats">
            <div className="stat">
              <span className="value">{players.length}</span>
              <span className="label">Jugadores</span>
            </div>
            <div className="stat">
              <span className="value">{avgAge.toFixed(1)}</span>
              <span className="label">Edad media</span>
            </div>
            <div className="stat">
              <span className="value">{avgOverall.toFixed(0)}</span>
              <span className="label">Media</span>
            </div>
            <div className="stat">
              <span className="value">{injuredCount}</span>
              <span className="label">Lesionados</span>
            </div>
          </div>
        </div>

        {/* Finances */}
        <div className="card finances">
          <h2>💰 Finanzas</h2>
          <div className="finance-stats">
            <div className="stat">
              <span className="label">Presupuesto</span>
              <span className="value">{formatMoney(team.budget)}</span>
            </div>
            <div className="stat">
              <span className="label">Valor plantilla</span>
              <span className="value">{formatMarketValue(team.marketValue)}</span>
            </div>
            <div className="stat">
              <span className="label">Masa salarial</span>
              <span className="value">{formatMoney(team.currentWages)}/año</span>
            </div>
          </div>
        </div>

        {/* Recent results */}
        <div className="card recent-results">
          <h2>📊 Últimos resultados</h2>
          <div className="results-list">
            {recentMatches.length > 0 ? (
              recentMatches.map(match => {
                const isHome = match.homeTeamId === team.id;
                const opponent = isHome 
                  ? gameState.teams[match.awayTeamId] 
                  : gameState.teams[match.homeTeamId];
                const result = isHome
                  ? `${match.homeScore}-${match.awayScore}`
                  : `${match.awayScore}-${match.homeScore}`;
                const won = isHome 
                  ? match.homeScore! > match.awayScore!
                  : match.awayScore! > match.homeScore!;
                const drew = match.homeScore === match.awayScore;

                return (
                  <div key={match.id} className="result-item">
                    <span className={`result ${won ? 'win' : drew ? 'draw' : 'loss'}`}>
                      {result}
                    </span>
                    <span className="opponent">
                      {isHome ? 'vs' : '@'} {opponent?.name}
                    </span>
                  </div>
                );
              })
            ) : (
              <p>Sin partidos jugados</p>
            )}
          </div>
        </div>

        {/* Top scorers */}
        <div className="card top-scorers">
          <h2>🎯 Goleadores</h2>
          <div className="scorers-list">
            {topScorers.map((player, i) => (
              <div key={player.id} className="scorer-item">
                <span className="rank">{i + 1}</span>
                <span className="name">{player.name}</span>
                <span className="goals">{player.seasonStats.goals} ⚽</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
