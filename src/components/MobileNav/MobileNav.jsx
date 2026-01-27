import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import Settings from '../Settings/Settings';
import './MobileNav.scss';

const TABS = [
  { id: 'overview', icon: '🏠', label: 'Inicio' },
  { id: 'squad', icon: '👥', label: 'Plantilla' },
  { id: 'table', icon: '📊', label: 'Liga' },
  { id: 'menu', icon: '☰', label: 'Más' },
];

const MENU_ITEMS = [
  { id: 'formation', icon: '⚽', label: 'Formación' },
  { id: 'training', icon: '🏋️', label: 'Entrenamiento' },
  { id: 'objectives', icon: '🎯', label: 'Objetivos' },
  { id: 'calendar', icon: '📅', label: 'Calendario' },
  { id: 'transfers', icon: '💰', label: 'Fichajes' },
  { id: 'renewals', icon: '📝', label: 'Renovaciones' },
  { id: 'stadium', icon: '🏟️', label: 'Estadio' },
  { id: 'facilities', icon: '🏗️', label: 'Instalaciones' },
  { id: 'messages', icon: '📬', label: 'Mensajes' },
];

export default function MobileNav({ activeTab, onTabChange, onAdvanceWeek, onSave }) {
  const { dispatch } = useGame();
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
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
  
  const isMenuItemActive = MENU_ITEMS.some(item => item.id === activeTab);
  
  return (
    <>
      <nav className="mobile-nav">
        <div className="mobile-nav__actions">
          <button className="mobile-nav__action-btn mobile-nav__action-btn--save" onClick={onSave}>
            💾 Guardar
          </button>
          <button className="mobile-nav__action-btn mobile-nav__action-btn--advance" onClick={onAdvanceWeek}>
            ⏭️ Avanzar
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
              <button className="close-btn" onClick={() => setShowMenu(false)}>✕</button>
            </div>
            
            <div className="mobile-menu__items">
              {MENU_ITEMS.map(item => (
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
                <span className="icon">⚙️</span>
                <span className="label">Opciones</span>
              </button>
              <button 
                className="mobile-menu__footer-btn mobile-menu__footer-btn--exit"
                onClick={handleMainMenu}
              >
                <span className="icon">🚪</span>
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
