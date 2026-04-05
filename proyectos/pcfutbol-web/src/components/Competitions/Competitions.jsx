import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { getPlayerCompetition } from '../../game/europeanSeason';
import { getPlayerSACompetition } from '../../game/southAmericanSeason';
import { isSouthAmericanLeague } from '../../game/southAmericanCompetitions';
import LeagueTable from '../LeagueTable/LeagueTable';
import Cup from '../Cup/Cup';
import Europe from '../Europe/Europe';
import SouthAmerica from '../SouthAmerica/SouthAmerica';
import { Globe, Trophy, Shield } from 'lucide-react';
import './Competitions.scss';

export default function Competitions() {
  const { t } = useTranslation();
  const { state } = useGame();

  const isRanked = state.gameMode === 'ranked';
  const hasCup = !!state.cupCompetition;
  const hasEuropean = !!state.europeanCompetitions?.initialized;
  const hasSA = !!state.saCompetitions?.initialized;
  const isInSALeague = isSouthAmericanLeague(state.playerLeagueId);

  const playerEuropean = useMemo(() => {
    if (!state.europeanCompetitions) return null;
    return getPlayerCompetition(state.europeanCompetitions, state.teamId);
  }, [state.europeanCompetitions, state.teamId]);

  const playerSA = useMemo(() => {
    if (!state.saCompetitions) return null;
    return getPlayerSACompetition(state.saCompetitions, state.teamId);
  }, [state.saCompetitions, state.teamId]);

  // Tab names - Liga always visible; Copa and Continental hidden in ranked mode
  const tabs = useMemo(() => {
    const tabList = [];
    tabList.push({ id: 'liga', label: t('competitions.league'), icon: <Shield size={16} /> });
    
    tabList.push({
      id: 'cup',
      label: state.cupCompetition?.config?.shortName || t('competitions.cup'),
      icon: <Trophy size={16} />
    });
    
    if (!isRanked) {
      if (isInSALeague) {
        const saLabel = playerSA?.state?.config?.shortName || t('competitions.continental');
        tabList.push({ id: 'continental', label: saLabel, icon: <Globe size={16} /> });
      } else {
        const euroLabel = playerEuropean?.state?.config?.shortName || t('competitions.europe');
        tabList.push({ id: 'continental', label: euroLabel, icon: <Globe size={16} /> });
      }
    }
    return tabList;
  }, [state.cupCompetition, playerEuropean, playerSA, isInSALeague, isRanked, t]);

  const [activeTab, setActiveTab] = useState('liga');

  const hasContinental = isInSALeague ? hasSA : hasEuropean;
  const continentalPlaceholder = isInSALeague
    ? t('competitions.qualifyForSouthAmerican')
    : t('competitions.qualifyForEuropean');

  return (
    <div className="competitions">
      {/* Tab bar */}
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

      {/* Content */}
      <div className="competitions__content">
        {activeTab === 'liga' && <LeagueTable />}
        {activeTab === 'cup' && (hasCup ? <Cup /> : (
          <div className="competitions__placeholder">
            <Trophy size={48} strokeWidth={1.5} />
            <p>{t('competitions.cupWillStart')}</p>
          </div>
        ))}
        {activeTab === 'continental' && (
          hasContinental
            ? (isInSALeague ? <SouthAmerica /> : <Europe />)
            : (
              <div className="competitions__placeholder">
                <Globe size={48} strokeWidth={1.5} />
                <p>{continentalPlaceholder}</p>
              </div>
            )
        )}
      </div>
    </div>
  );
}
