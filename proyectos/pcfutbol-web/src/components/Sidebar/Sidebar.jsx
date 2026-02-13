import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
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
  Gamepad2
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
    { id: 'objectives', icon: Target, label: t('sidebar.objectives') },
    { id: 'calendar', icon: Calendar, label: t('sidebar.calendar') },
    { id: 'transfers', icon: Briefcase, label: t('sidebar.transfers') },
    { id: 'competitions', icon: Award, label: t('sidebar.competitions') },
    { id: 'stadium', icon: Building2, label: t('sidebar.stadium') },
    { id: 'finance', icon: Landmark, label: t('sidebar.bank') },
    { id: 'facilities', icon: Wrench, label: t('sidebar.facilities') },
    { id: 'messages', icon: Mail, label: t('sidebar.messages') },
  ];
  
  const menuItems = isRanked
    ? allMenuItems.filter(item => !RANKED_HIDDEN_TABS.includes(item.id))
    : allMenuItems;
  const [showSettings, setShowSettings] = useState(false);
  const lastSeenCountRef = useRef(0);

  // When user opens messages tab, mark all as "seen"
  useEffect(() => {
    if (activeTab === 'messages') {
      lastSeenCountRef.current = (state.messages || []).length;
    }
  }, [activeTab, state.messages]);

  const unreadCount = Math.max(0, (state.messages || []).length - lastSeenCountRef.current);
  
  const handleMainMenu = () => {
    if (isRanked) {
      if (!window.confirm('⚠️ Si sales durante una partida ranked, perderás por desconexión. ¿Seguro?')) return;
    }
    dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
  };
  
  return (
    <>
      <aside className="sidebar">
        <div className="sidebar__logo">
          <Gamepad2 className="sidebar__logo-icon" size={28} strokeWidth={2.5} />
          <span className="sidebar__logo-text">PC Gaffer</span>
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
                {item.id === 'messages' && unreadCount > 0 && (
                  <span className="sidebar__badge sidebar__badge--pulse">{unreadCount > 9 ? '9+' : unreadCount}</span>
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
