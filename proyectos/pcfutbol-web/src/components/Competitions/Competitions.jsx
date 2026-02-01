import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { getPlayerCompetition } from '../../game/europeanSeason';
import Cup from '../Cup/Cup';
import Europe from '../Europe/Europe';
import { Award, Globe, Trophy } from 'lucide-react';
import './Competitions.scss';

export default function Competitions() {
  const { state } = useGame();

  const hasCup = !!state.cupCompetition;
  const hasEuropean = !!state.europeanCompetitions?.initialized;

  const playerEuropean = useMemo(() => {
    if (!state.europeanCompetitions) return null;
    return getPlayerCompetition(state.europeanCompetitions, state.teamId);
  }, [state.europeanCompetitions, state.teamId]);

  // Tab names
  const tabs = useMemo(() => {
    const t = [];
    if (hasCup) {
      t.push({
        id: 'cup',
        label: state.cupCompetition?.config?.shortName || 'Copa',
        icon: state.cupCompetition?.config?.icon || '🏆'
      });
    }
    if (hasEuropean) {
      const euroLabel = playerEuropean?.state?.config?.shortName || 'Europa';
      const euroIcon = playerEuropean?.state?.config?.icon || '⭐';
      t.push({
        id: 'europe',
        label: euroLabel,
        icon: euroIcon
      });
    }
    return t;
  }, [hasCup, hasEuropean, state.cupCompetition, playerEuropean]);

  const [activeTab, setActiveTab] = useState(() => tabs[0]?.id || 'cup');

  // Empty state
  if (tabs.length === 0) {
    return (
      <div className="competitions">
        <div className="competitions__empty">
          <Trophy size={48} strokeWidth={1.5} />
          <h2>Competiciones</h2>
          <p>No hay competiciones activas esta temporada.</p>
          <p className="competitions__hint">Termina la temporada para desbloquear la copa y competiciones europeas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="competitions">
      {/* Tab bar (only if more than 1 tab) */}
      {tabs.length > 1 && (
        <div className="competitions__tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`competitions__tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="competitions__content">
        {activeTab === 'cup' && hasCup && <Cup />}
        {activeTab === 'europe' && hasEuropean && <Europe />}
      </div>
    </div>
  );
}
