import React, { useState } from 'react';
import {
  Home, Users, BarChart3, Menu, Target, Calendar, Award,
  Coins, Building2, Building, Wrench, Mail, FastForward, SkipForward,
  Settings as SettingsIcon, LogOut, X
} from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import { useGame } from '../../context/GameContext';
import Settings from '../Settings/Settings';
import './MobileNav.scss';

const TABS = [
  { id: 'overview', icon: <Home size={20} />, label: 'Inicio' },
  { id: 'plantilla', icon: <Users size={20} />, label: 'Plantilla' },
  { id: 'competitions', icon: <Award size={20} />, label: 'Compet.' },
  { id: 'menu', icon: <Menu size={20} />, label: 'Más' },
];

const MENU_ITEMS = [
  { id: 'formation', icon: <FootballIcon size={20} />, label: 'Formación' },
  { id: 'objectives', icon: <Target size={20} />, label: 'Objetivos' },
  { id: 'calendar', icon: <Calendar size={20} />, label: 'Calendario' },
  { id: 'transfers', icon: <Coins size={20} />, label: 'Fichajes' },
  { id: 'stadium', icon: <Building2 size={20} />, label: 'Estadio' },
  { id: 'finance', icon: <Building size={20} />, label: 'Banco' },
  { id: 'facilities', icon: <Wrench size={20} />, label: 'Instalaciones' },
  { id: 'messages', icon: <Mail size={20} />, label: 'Mensajes' },
];

export default function MobileNav({ activeTab, onTabChange, onAdvanceWeek, onSimulate, simulating }) {
  const { state, dispatch } = useGame();
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSimOptions, setShowSimOptions] = useState(false);

  const simDisabled = simulating || state.preseasonPhase || !!state.pendingEuropeanMatch || !!state.pendingCupMatch;
  
  const filteredMenuItems = MENU_ITEMS;

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
        <div className="mobile-nav__actions">
          <div className="mobile-nav__sim-wrapper">
            <button
              className="mobile-nav__action-btn mobile-nav__action-btn--sim"
              onClick={() => !simDisabled && setShowSimOptions(!showSimOptions)}
              disabled={simDisabled}
            >
              <FastForward size={14} /> {simulating ? 'Simulando...' : 'Simular'}
            </button>
            {showSimOptions && !simDisabled && (
              <>
                <div className="mobile-nav__sim-backdrop" onClick={() => setShowSimOptions(false)} />
                <div className="mobile-nav__sim-dropdown">
                  {[
                    { weeks: 4, label: '4 semanas' },
                    { weeks: 10, label: '10 semanas' },
                    { weeks: 19, label: 'Media temporada' },
                    { weeks: 38, label: 'Temporada completa' },
                  ].map(opt => (
                    <button
                      key={opt.weeks}
                      onClick={() => { onSimulate(opt.weeks); setShowSimOptions(false); }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button className="mobile-nav__action-btn mobile-nav__action-btn--advance" onClick={onAdvanceWeek}>
            <SkipForward size={14} /> Avanzar
          </button>
        </div>

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
              <h3>Menú</h3>
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
                <span className="label">Opciones</span>
              </button>
              <button
                className="mobile-menu__footer-btn mobile-menu__footer-btn--exit"
                onClick={handleMainMenu}
              >
                <span className="icon"><LogOut size={20} /></span>
                <span className="label">Menú Principal</span>
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
