import { useState } from 'react';
import { GameState, Player, Team } from '../types';
import { GameBrain } from '../core/GameBrain';

interface Props {
  gameState: GameState;
  gameBrain: GameBrain;
  onUpdate: () => void;
}

export function Transfers({ gameState, gameBrain, onUpdate }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [maxAge, setMaxAge] = useState<number>(40);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [offerAmount, setOfferAmount] = useState<number>(0);

  const playerTeam = gameState.teams[gameState.playerTeamId];

  // Get all players not on player's team
  const availablePlayers = Object.values(gameState.players)
    .filter(p => p.teamId !== gameState.playerTeamId)
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => selectedPosition === 'all' || p.position === selectedPosition)
    .filter(p => p.age <= maxAge)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 100);

  const positions = ['all', 'GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];

  function makeOffer() {
    if (!selectedPlayer || offerAmount <= 0) return;
    
    const success = gameBrain.makeTransferOffer(selectedPlayer.id, gameState.playerTeamId, offerAmount);
    if (success) {
      alert('Oferta enviada!');
      onUpdate();
    } else {
      alert('No se pudo enviar la oferta. Verifica el presupuesto y la ventana de fichajes.');
    }
  }

  return (
    <div className="transfers-screen">
      <h1>Mercado de fichajes</h1>

      <div className="transfer-status">
        <span className={`window-status ${gameState.transferWindowOpen ? 'open' : 'closed'}`}>
          {gameState.transferWindowOpen ? '🟢 Ventana abierta' : '🔴 Ventana cerrada'}
        </span>
        <span className="budget">
          💰 Presupuesto: {playerTeam.budget.toLocaleString('es-ES')} €
        </span>
      </div>

      <div className="transfers-container">
        {/* Search filters */}
        <div className="search-filters">
          <input
            type="text"
            placeholder="Buscar jugador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select 
            value={selectedPosition} 
            onChange={(e) => setSelectedPosition(e.target.value)}
          >
            {positions.map(pos => (
              <option key={pos} value={pos}>
                {pos === 'all' ? 'Todas las posiciones' : pos}
              </option>
            ))}
          </select>
          <div className="age-filter">
            <label>Edad máx: {maxAge}</label>
            <input
              type="range"
              min={16}
              max={40}
              value={maxAge}
              onChange={(e) => setMaxAge(parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Player list */}
        <div className="players-list">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Pos</th>
                <th>Edad</th>
                <th>Media</th>
                <th>Equipo</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {availablePlayers.map(player => (
                <tr 
                  key={player.id}
                  className={selectedPlayer?.id === player.id ? 'selected' : ''}
                  onClick={() => {
                    setSelectedPlayer(player);
                    setOfferAmount(player.marketValue);
                  }}
                >
                  <td>{player.name}</td>
                  <td>
                    <span className={`pos-badge pos-${player.position.toLowerCase()}`}>
                      {player.position}
                    </span>
                  </td>
                  <td>{player.age}</td>
                  <td>
                    <span className={`overall-badge ov-${Math.floor(player.overall / 10) * 10}`}>
                      {player.overall}
                    </span>
                  </td>
                  <td>{gameState.teams[player.teamId]?.name || 'Libre'}</td>
                  <td>{player.marketValueDisplay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected player / offer */}
        {selectedPlayer && (
          <div className="player-offer">
            <h2>{selectedPlayer.name}</h2>
            <div className="player-quick-info">
              <p>{selectedPlayer.position} | {selectedPlayer.age} años | Media: {selectedPlayer.overall}</p>
              <p>Equipo: {gameState.teams[selectedPlayer.teamId]?.name}</p>
              <p>Valor estimado: {selectedPlayer.marketValueDisplay}</p>
              <p>Contrato hasta: {new Date(selectedPlayer.contractEnd).toLocaleDateString('es-ES')}</p>
            </div>

            <div className="offer-form">
              <h3>Hacer oferta</h3>
              <div className="offer-input">
                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(parseInt(e.target.value) || 0)}
                  step={10000}
                />
                <span>€</span>
              </div>
              <div className="offer-presets">
                <button onClick={() => setOfferAmount(Math.round(selectedPlayer.marketValue * 0.8))}>
                  -20%
                </button>
                <button onClick={() => setOfferAmount(selectedPlayer.marketValue)}>
                  Valor
                </button>
                <button onClick={() => setOfferAmount(Math.round(selectedPlayer.marketValue * 1.2))}>
                  +20%
                </button>
              </div>
              <button 
                className="offer-btn"
                onClick={makeOffer}
                disabled={!gameState.transferWindowOpen || offerAmount > playerTeam.budget}
              >
                💰 Enviar oferta
              </button>
              {offerAmount > playerTeam.budget && (
                <p className="warning">⚠️ Supera el presupuesto</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pending offers */}
      {gameState.pendingOffers.length > 0 && (
        <div className="pending-offers">
          <h2>Ofertas pendientes</h2>
          {gameState.pendingOffers.map(offer => {
            const player = gameState.players[offer.playerId];
            return (
              <div key={offer.id} className={`offer-card ${offer.status}`}>
                <span className="player-name">{player?.name}</span>
                <span className="amount">{offer.amount.toLocaleString('es-ES')} €</span>
                <span className="status">{offer.status}</span>
                {offer.counterAmount && (
                  <span className="counter">Contraoferta: {offer.counterAmount.toLocaleString('es-ES')} €</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
