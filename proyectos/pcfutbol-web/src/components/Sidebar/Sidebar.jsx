import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import TeamCrest from '../TeamCrest/TeamCrest';
import Settings from '../Settings/Settings';
import {
  Home,
  Users,
  ClipboardList,
  Target,
  Calendar,
  Trophy,
  Briefcase,
  Building2,
  Wrench,
  Mail,
  Landmark,
  Award,
  Settings as SettingsIcon,
  ChevronLeft,
  Mountain
} from 'lucide-react';
import './Sidebar.scss';

export default function Sidebar({ activeTab, onTabChange, isRanked }) {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  
  const RANKED_HIDDEN_TABS = ['objectives', 'calendar', 'stadium', 'finance', 'facilities', 'messages'];
  
  const allMenuItems = [
    { id: 'overview', icon: Home, label: t('sidebar.office') },
    { id: 'plantilla', icon: Users, label: t('sidebar.squad') },
    { id: 'formation', icon: ClipboardList, label: t('sidebar.formation') },
    { id: 'objectives', icon: Target, label: state.gameMode === 'glory' ? 'Directiva' : t('sidebar.objectives') },
    { id: 'calendar', icon: Calendar, label: t('sidebar.calendar') },
    { id: 'transfers', icon: Briefcase, label: t('sidebar.transfers') },
    { id: 'competitions', icon: Award, label: t('sidebar.competitions') },
    { id: 'stadium', icon: Building2, label: t('sidebar.stadium') },
    { id: 'finance', icon: Landmark, label: t('sidebar.bank') },
    { id: 'facilities', icon: Wrench, label: t('sidebar.facilities') },
    { id: 'messages', icon: Mail, label: t('sidebar.messages') },
  ];
  
  // Add Glory Perks tab for glory mode
  if (state.gameMode === 'glory') {
    allMenuItems.splice(3, 0, { id: 'glory_perks', icon: Mountain, label: 'Mejoras' });
  }
  
  const menuItems = isRanked
    ? allMenuItems.filter(item => !RANKED_HIDDEN_TABS.includes(item.id))
    : allMenuItems;
  const [showSettings, setShowSettings] = useState(false);
  const lastSeenCountRef = useRef(0);

  const unreadCount = (state.messages || []).filter(m => !m.read).length;
  
  const handleMainMenu = () => {
    if (isRanked) {
      if (!window.confirm(t('sidebar.rankedExitWarning'))) return;
    }
    dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
  };
  
  return (
    <>
      <aside className="sidebar">
        <div className="sidebar__logo" onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'main_menu' })} style={{ cursor: 'pointer' }}>
          <svg className="sidebar__logo-icon" width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4"/>
            <polygon points="50,22 61,30 57,43 43,43 39,30" fill="currentColor"/>
            <polygon points="27,58 22,45 32,36 42,44 37,57" fill="currentColor"/>
            <polygon points="73,58 78,45 68,36 58,44 63,57" fill="currentColor"/>
            <polygon points="38,72 42,61 55,61 62,72 55,78 42,78" fill="currentColor"/>
            <path d="M50,2 L50,22" stroke="currentColor" strokeWidth="3"/>
            <path d="M61,30 L82,18" stroke="currentColor" strokeWidth="3"/>
            <path d="M78,45 L98,42" stroke="currentColor" strokeWidth="3"/>
            <path d="M73,58 L88,74" stroke="currentColor" strokeWidth="3"/>
            <path d="M62,72 L68,92" stroke="currentColor" strokeWidth="3"/>
            <path d="M42,78 L32,92" stroke="currentColor" strokeWidth="3"/>
            <path d="M27,58 L12,74" stroke="currentColor" strokeWidth="3"/>
            <path d="M22,45 L2,42" stroke="currentColor" strokeWidth="3"/>
            <path d="M32,36 L18,18" stroke="currentColor" strokeWidth="3"/>
            <path d="M39,30 L50,22 L61,30" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M57,43 L58,44 L68,36 L78,45" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M63,57 L62,61 L62,72" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M38,72 L42,61 L37,57" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M27,58 L22,45 L32,36 L43,43 L42,44" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
          <span className="sidebar__logo-text">PC Gaffer</span>
        </div>
        
        <div className="sidebar__team">
          <div className="sidebar__team-badge">
            <TeamCrest teamId={state.teamId} size={48} />
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
                {item.id === 'messages' && unreadCount > 0 && (
                  <span className="sidebar__badge sidebar__badge--pulse">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
            );
          })}
        </nav>
        
        <div className="sidebar__footer">
          <a 
            href="https://buymeacoffee.com/jirubalusus" 
            target="_blank" 
            rel="noopener noreferrer"
            className="sidebar__bmc-link"
          >
            ☕ {t('mainMenu.supportUs', 'Support the project')}
          </a>
          <button 
            className="sidebar__settings-btn" 
            onClick={() => setShowSettings(true)}
          >
            <SettingsIcon size={18} strokeWidth={2} />
            <span>{t('sidebar.options')}</span>
          </button>
          <button className="sidebar__menu-btn" onClick={handleMainMenu}>
            <ChevronLeft size={18} strokeWidth={2} />
            <span>{t('sidebar.mainMenu')}</span>
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
