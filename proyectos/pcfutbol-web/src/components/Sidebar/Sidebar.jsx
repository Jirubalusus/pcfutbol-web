import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import Settings from '../Settings/Settings';
import {
  Home,
  Users,
  ClipboardList,
  Dumbbell,
  Target,
  Calendar,
  Trophy,
  Briefcase,
  Building2,
  Wrench,
  Mail,
  Settings as SettingsIcon,
  ChevronLeft,
  Gamepad2
} from 'lucide-react';
import './Sidebar.scss';

const menuItems = [
  { id: 'overview', icon: Home, label: 'Despacho' },
  { id: 'plantilla', icon: Users, label: 'Plantilla' },
  { id: 'formation', icon: ClipboardList, label: 'Alineación' },
  { id: 'training', icon: Dumbbell, label: 'Entrenamiento' },
  { id: 'objectives', icon: Target, label: 'Objetivos' },
  { id: 'calendar', icon: Calendar, label: 'Calendario' },
  { id: 'table', icon: Trophy, label: 'Clasificación' },
  { id: 'transfers', icon: Briefcase, label: 'Fichajes' },
  { id: 'stadium', icon: Building2, label: 'Estadio' },
  { id: 'facilities', icon: Wrench, label: 'Instalaciones' },
  { id: 'messages', icon: Mail, label: 'Mensajes' },
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
          <Gamepad2 className="sidebar__logo-icon" size={28} strokeWidth={2.5} />
          <span className="sidebar__logo-text">PC Fútbol</span>
        </div>
        
        <div className="sidebar__team">
          <div className="sidebar__team-badge">
            {state.team?.shortName || '???'}
          </div>
          <span className="sidebar__team-name">{state.team?.name}</span>
        </div>
        
        <nav className="sidebar__nav">
          {menuItems.map(item => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                className={`sidebar__item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => onTabChange(item.id)}
              >
                <IconComponent className="sidebar__item-icon" size={20} strokeWidth={2} />
                <span className="sidebar__item-label">{item.label}</span>
                {item.id === 'messages' && state.messages.length > 0 && (
                  <span className="sidebar__badge">{state.messages.length}</span>
                )}
              </button>
            );
          })}
        </nav>
        
        <div className="sidebar__footer">
          <button 
            className="sidebar__settings-btn" 
            onClick={() => setShowSettings(true)}
          >
            <SettingsIcon size={18} strokeWidth={2} />
            <span>Opciones</span>
          </button>
          <button className="sidebar__menu-btn" onClick={handleMainMenu}>
            <ChevronLeft size={18} strokeWidth={2} />
            <span>Menú Principal</span>
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
