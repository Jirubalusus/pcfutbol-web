import React, { useState } from 'react';
import {
  Home, Users, BarChart3, Menu, Target, Calendar, Award,
  Coins, Building2, Building, Wrench, Mail, FastForward, SkipForward,
  Settings as SettingsIcon, LogOut, X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FootballIcon from '../icons/FootballIcon';
import { useGame } from '../../context/GameContext';
// Market is always open now
import Settings from '../Settings/Settings';
import './MobileNav.scss';

export default function MobileNav({ activeTab, onTabChange, onAdvanceWeek, onSimulate, simulating, isRanked }) {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  
  const RANKED_HIDDEN = ['objectives', 'calendar', 'stadium', 'finance', 'facilities', 'messages'];
  
  const TABS = [
    { id: 'overview', icon: <Home size={20} />, label: t('mobileNav.home') },
    { id: 'plantilla', icon: <Users size={20} />, label: t('sidebar.squad') },
    { id: 'competitions', icon: <Award size={20} />, label: t('mobileNav.competitions') },
    { id: 'menu', icon: <Menu size={20} />, label: t('mobileNav.more') },
  ];

  const MENU_ITEMS = [
    { id: 'formation', icon: <FootballIcon size={20} />, label: t('sidebar.formation') },
    { id: 'objectives', icon: <Target size={20} />, label: t('sidebar.objectives') },
    { id: 'calendar', icon: <Calendar size={20} />, label: t('sidebar.calendar') },
    { id: 'transfers', icon: <Coins size={20} />, label: t('sidebar.transfers') },
    { id: 'stadium', icon: <Building2 size={20} />, label: t('sidebar.stadium') },
    { id: 'finance', icon: <Building size={20} />, label: t('sidebar.finance') },
    { id: 'facilities', icon: <Wrench size={20} />, label: t('sidebar.facilities') },
    { id: 'messages', icon: <Mail size={20} />, label: t('sidebar.messages') },
  ];
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSimOptions, setShowSimOptions] = useState(false);

  const simDisabled = simulating || state.preseasonPhase || !!state.pendingEuropeanMatch || !!state.pendingSAMatch || !!state.pendingCupMatch;
  
  const filteredMenuItems = isRanked
    ? MENU_ITEMS.filter(item => !RANKED_HIDDEN.includes(item.id))
    : MENU_ITEMS;

  const handleTabClick = (tabId) => {
    if (tabId === 'menu') {
      setShowMenu(true);
    } else {
      onTabChange(tabId);
    }
  };

  const handleMenuItemClick = (itemId) => {
    onTabChange(itemId);
    setShowMenu(false);
  };

  const handleMainMenu = () => {
    dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
    setShowMenu(false);
  };

  const handleOpenSettings = () => {
    setShowMenu(false);
    setShowSettings(true);
  };

  const isMenuItemActive = filteredMenuItems.some(item => item.id === activeTab);

  return (
    <>
      <nav className="mobile-nav">
        {!isRanked && <div className="mobile-nav__actions">
          <div className="mobile-nav__sim-wrapper">
            <button
              className="mobile-nav__action-btn mobile-nav__action-btn--sim"
              onClick={() => !simDisabled && setShowSimOptions(!showSimOptions)}
              disabled={simDisabled}
            >
              <FastForward size={14} /> {simulating ? t('office.simulating') : t('office.simulate')}
            </button>
            {showSimOptions && !simDisabled && (() => {
              const maxWeek = state.fixtures?.length > 0
                ? Math.max(...state.fixtures.map(f => f.week)) : 38;
              const halfSeason = Math.ceil(maxWeek / 2);
              const pastHalf = state.currentWeek >= halfSeason;
              const simOptions = [
                { weeks: 3, label: t('office.threeMatches') },
                pastHalf
                  ? { weeks: maxWeek - state.currentWeek + 1, label: t('office.endOfSeason') }
                  : { weeks: halfSeason - state.currentWeek, label: t('office.halfSeason') },
              ];
              return (
                <>
                  <div className="mobile-nav__sim-backdrop" onClick={() => setShowSimOptions(false)} />
                  <div className="mobile-nav__sim-dropdown">
                    {simOptions.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => { onSimulate(opt.weeks); setShowSimOptions(false); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
          <button className="mobile-nav__action-btn mobile-nav__action-btn--advance" onClick={onAdvanceWeek}>
            <SkipForward size={14} /> {t('mobileNav.advance')}
          </button>
        </div>}

        <div className="mobile-nav__tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`mobile-nav__tab ${
                tab.id === 'menu'
                  ? isMenuItemActive ? 'active' : ''
                  : activeTab === tab.id ? 'active' : ''
              }`}
              onClick={() => handleTabClick(tab.id)}
            >
              <span className="icon">{tab.icon}</span>
              <span className="label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Menu Drawer */}
      {showMenu && (
        <div className="mobile-menu" onClick={() => setShowMenu(false)}>
          <div className="mobile-menu__content" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu__header">
              <h3>{t('mobileNav.menu')}</h3>
              <button className="close-btn" onClick={() => setShowMenu(false)}><X size={16} /></button>
            </div>

            <div className="mobile-menu__items">
              {filteredMenuItems.map(item => (
                <button
                  key={item.id}
                  className={`mobile-menu__item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => handleMenuItemClick(item.id)}
                >
                  <span className="icon">{item.icon}</span>
                  <span className="label">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="mobile-menu__footer">
              <button
                className="mobile-menu__footer-btn"
                onClick={handleOpenSettings}
              >
                <span className="icon"><SettingsIcon size={20} /></span>
                <span className="label">{t('sidebar.options')}</span>
              </button>
              <button
                className="mobile-menu__footer-btn mobile-menu__footer-btn--exit"
                onClick={handleMainMenu}
              >
                <span className="icon"><LogOut size={20} /></span>
                <span className="label">{t('sidebar.mainMenu')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mobile-settings-overlay">
          <Settings onClose={() => setShowSettings(false)} />
        </div>
      )}
    </>
  );
}
