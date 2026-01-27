import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import Settings from '../Settings/Settings';
import './Sidebar.scss';

const menuItems = [
  { id: 'overview', icon: '🏠', label: 'Despacho' },
  { id: 'squad', icon: '👥', label: 'Plantilla' },
  { id: 'formation', icon: '📋', label: 'Alineación' },
  { id: 'calendar', icon: '📅', label: 'Calendario' },
  { id: 'table', icon: '🏆', label: 'Clasificación' },
  { id: 'transfers', icon: '💼', label: 'Fichajes' },
  { id: 'renewals', icon: '📝', label: 'Renovaciones' },
  { id: 'stadium', icon: '🏟️', label: 'Estadio' },
  { id: 'facilities', icon: '🔧', label: 'Instalaciones' },
  { id: 'messages', icon: '📧', label: 'Mensajes' },
];

export default function Sidebar({ activeTab, onTabChange }) {
  const { state, dispatch } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  
  const handleMainMenu = () => {
    dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
  };
  
  return (
    <>
      <aside className="sidebar">
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">⚽</span>
          <span className="sidebar__logo-text">PC Fútbol</span>
        </div>
        
        <div className="sidebar__team">
          <div className="sidebar__team-badge">
            {state.team?.shortName || '???'}
          </div>
          <span className="sidebar__team-name">{state.team?.name}</span>
        </div>
        
        <nav className="sidebar__nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`sidebar__item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <span className="sidebar__item-icon">{item.icon}</span>
              <span className="sidebar__item-label">{item.label}</span>
              {item.id === 'messages' && state.messages.length > 0 && (
                <span className="sidebar__badge">{state.messages.length}</span>
              )}
            </button>
          ))}
        </nav>
        
        <div className="sidebar__footer">
          <button 
            className="sidebar__settings-btn" 
            onClick={() => setShowSettings(true)}
          >
            ⚙️ Opciones
          </button>
          <button className="sidebar__menu-btn" onClick={handleMainMenu}>
            ← Menú Principal
          </button>
        </div>
      </aside>

      {/* Settings Modal */}
      {showSettings && (
        <div className="sidebar__settings-overlay">
          <div className="sidebar__settings-panel">
            <Settings onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}
    </>
  );
}
