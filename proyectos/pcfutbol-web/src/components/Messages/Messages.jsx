import React, { useState } from 'react';
import { Briefcase, Mail, HeartPulse, FileText, Newspaper, Landmark, Trash2, Inbox, X, ExternalLink, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FootballIcon from '../icons/FootballIcon';
import { useGame } from '../../context/GameContext';
import './Messages.scss';

const MESSAGE_NAV_MAP = {
  transfer: { tab: 'transfers', labelKey: 'messages.goToTransfers' },
  transfer_offer: { tab: 'transfers', labelKey: 'messages.goToTransfers' },
  loan: { tab: 'transfers', labelKey: 'messages.goToTransfers' },
  offer: { tab: 'transfers', labelKey: 'messages.goToTransfers' },
  match_result: { tab: 'competitions', labelKey: 'messages.goToCompetitions' },
  injury: { tab: 'formation', labelKey: 'messages.goToFormation' },
  medical: { tab: 'formation', labelKey: 'messages.goToFormation' },
  contract: { tab: 'formation', labelKey: 'messages.goToFormation' },
  retirement: { tab: 'plantilla', labelKey: 'messages.goToSquad' },
  cup: { tab: 'competitions', labelKey: 'messages.goToCompetitions' },
  european: { tab: 'competitions', labelKey: 'messages.goToCompetitions' },
  southamerican: { tab: 'competitions', labelKey: 'messages.goToCompetitions' },
  training: { tab: 'facilities', labelKey: 'messages.goToFacilities' },
  youth: { tab: 'plantilla', labelKey: 'messages.goToSquad' },
};

const MESSAGE_ICONS = {
  match_result: <FootballIcon size={15} />,
  transfer: <Briefcase size={15} />,
  transfer_offer: <Mail size={15} />,
  injury: <HeartPulse size={15} />,
  contract: <FileText size={15} />,
  news: <Newspaper size={15} />,
  board: <Landmark size={15} />,
  default: <Mail size={15} />
};

export default function Messages() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [expandedId, setExpandedId] = useState(null);
  
  const messages = state.messages || [];
  const unreadCount = messages.filter(m => !m.read).length;

  const toggleMessage = (msg) => {
    if (!msg.read) {
      dispatch({ type: 'MARK_MESSAGE_READ', payload: msg.id });
    }
    setExpandedId(expandedId === msg.id ? null : msg.id);
  };

  const getTitle = (msg) => {
    if (msg.titleKey) {
      const params = { ...msg.titleParams };
      if (params) {
        Object.keys(params).forEach(key => {
          if (key.endsWith('Key') && typeof params[key] === 'string' && !key.endsWith('KeyParams')) {
            const baseKey = key.slice(0, -3);
            params[baseKey] = t(params[key], params[`${key}Params`]);
          }
        });
      }
      return t(msg.titleKey, params);
    }
    return msg.title;
  };

  const getContent = (msg) => {
    if (msg.contentKey) {
      const params = { ...msg.contentParams };
      if (params) {
        Object.keys(params).forEach(key => {
          if (key.endsWith('Key') && typeof params[key] === 'string' && !key.endsWith('KeyParams')) {
            const baseKey = key.slice(0, -3);
            params[baseKey] = t(params[key], params[`${key}Params`]);
          }
        });
      }
      return t(msg.contentKey, params);
    }
    return msg.content;
  };

  const getDate = (msg) => {
    if (msg.dateKey) return t(msg.dateKey, msg.dateParams);
    return msg.date;
  };
  
  const handleDelete = (e, messageId) => {
    e.stopPropagation();
    dispatch({ type: 'DELETE_MESSAGE', payload: messageId });
    if (expandedId === messageId) setExpandedId(null);
  };
  
  const handleClearAll = () => {
    if (window.confirm(t('messages.deleteAllConfirm'))) {
      dispatch({ type: 'CLEAR_MESSAGES' });
      setExpandedId(null);
    }
  };
  
  return (
    <div className="messages">
      {/* Hero */}
      <div className="messages__hero">
        <div className="messages__hero-icon"><Mail size={24} /></div>
        <div className="messages__hero-info">
          <span className="messages__hero-label">{t('messages.inbox')}</span>
          <span className="messages__hero-count">
            {unreadCount > 0 ? `${unreadCount} ${t('messages.unread')}` : `${messages.length} ${t('messages.total') || ''}`}
          </span>
        </div>
        {messages.length > 0 && (
          <button className="messages__hero-clear" onClick={handleClearAll}><Trash2 size={14} /></button>
        )}
      </div>
      
      {messages.length === 0 ? (
        <div className="messages__empty">
          <Inbox size={32} strokeWidth={1.5} />
          <p>{t('messages.noMessages')}</p>
        </div>
      ) : (
        <div className="messages__list">
          {messages.map(msg => {
            const isExpanded = expandedId === msg.id;
            const nav = MESSAGE_NAV_MAP[msg.type];
            return (
              <div key={msg.id} className={`messages__card ${isExpanded ? 'expanded' : ''} ${!msg.read ? 'unread' : ''}`}>
                {/* Row header — always visible */}
                <div className="messages__card-header" onClick={() => toggleMessage(msg)}>
                  <span className="messages__card-icon">
                    {MESSAGE_ICONS[msg.type] || MESSAGE_ICONS.default}
                  </span>
                  <div className="messages__card-info">
                    <span className="messages__card-title">{getTitle(msg)}</span>
                    <span className="messages__card-date">{getDate(msg)}</span>
                  </div>
                  <ChevronDown size={16} className={`messages__card-chevron ${isExpanded ? 'open' : ''}`} />
                  <button className="messages__card-delete" onClick={(e) => handleDelete(e, msg.id)}>
                    <X size={13} />
                  </button>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="messages__card-body">
                    <p className="messages__card-content">{getContent(msg)}</p>
                    <div className="messages__card-actions">
                      {nav && (
                        <button
                          className="messages__card-nav"
                          onClick={() => dispatch({ type: 'NAVIGATE_TAB', payload: nav.tab })}
                        >
                          <ExternalLink size={13} /> {t(nav.labelKey)}
                        </button>
                      )}
                      <button className="messages__card-remove" onClick={(e) => handleDelete(e, msg.id)}>
                        <Trash2 size={13} /> {t('messages.deleteMessage')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
