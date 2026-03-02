import React from 'react';
import WorldCupResult from './WorldCupResult';
import './WorldCupGameOver.scss';

// Thin wrapper for mid-tournament game overs (fired/mutiny)
export default function WorldCupGameOver({ reason, state, teams, onPlayAgain, onExit }) {
  return (
    <div className="wc-gameover">
      <WorldCupResult
        type={reason}
        state={state}
        teams={teams}
        onPlayAgain={onPlayAgain}
        onExit={onExit}
      />
    </div>
  );
}
