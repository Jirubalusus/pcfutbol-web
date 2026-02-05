import React, { useState } from 'react';
import { Briefcase, Mail, HeartPulse, FileText, Newspaper, Landmark, Trash2, Inbox, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FootballIcon from '../icons/FootballIcon';
import { useGame } from '../../context/GameContext';
import './Messages.scss';

const MESSAGE_ICONS = {
  match_result: <FootballIcon size={16} />,
  transfer: <Briefcase size={16} />,
  transfer_offer: <Mail size={16} />,
  injury: <HeartPulse size={16} />,
  contract: <FileText size={16} />,
  news: <Newspaper size={16} />,
  board: <Landmark size={16} />,
  default: <Mail size={16} />
};

export default function Messages() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [selectedMessage, setSelectedMessage] = useState(null);
  
  const messages = state.messages || [];

  // i18n helpers: translate keys at render time, fall back to raw fields for old saves
  const getTitle = (msg) => {
    if (msg.titleKey) {
      const params = { ...msg.titleParams };
      // Auto-translate params ending in 'Key' (nested translation keys)
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
  
  const handleDelete = (messageId) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: messageId });
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null);
    }
  };
  
  const handleClearAll = () => {
    if (window.confirm(t('messages.deleteAllConfirm'))) {
      dispatch({ type: 'CLEAR_MESSAGES' });
      setSelectedMessage(null);
    }
  };
  
  return (
    <div className="messages">
      <div className="messages__header">
        <h2>{t('messages.inbox')} ({messages.length})</h2>
        {messages.length > 0 && (
          <button className="messages__clear" onClick={handleClearAll}>
            <Trash2 size={14} /> {t('messages.deleteAll')}
          </button>
        )}
      </div>
      
      {messages.length === 0 ? (
        <div className="messages__empty">
          <span className="icon"><Inbox size={22} /></span>
          <p>{t('messages.noMessages')}</p>
        </div>
      ) : (
        <div className="messages__content">
          <div className="messages__list">
            {messages.map(msg => (
              <div 
                key={msg.id}
                className={`messages__item ${selectedMessage?.id === msg.id ? 'selected' : ''}`}
                onClick={() => setSelectedMessage(msg)}
              >
                <span className="messages__icon">
                  {MESSAGE_ICONS[msg.type] || MESSAGE_ICONS.default}
                </span>
                <div className="messages__item-content">
                  <span className="title">{getTitle(msg)}</span>
                  <span className="date">{getDate(msg)}</span>
                </div>
                <button 
                  className="messages__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(msg.id);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          
          {selectedMessage && (
            <div className="messages__detail">
              <button 
                className="messages__detail-close"
                onClick={() => setSelectedMessage(null)}
              >
                ← {t('messages.backToMessages')}
              </button>
              <div className="messages__detail-header">
                <span className="icon">
                  {MESSAGE_ICONS[selectedMessage.type] || MESSAGE_ICONS.default}
                </span>
                <div className="info">
                  <h3>{getTitle(selectedMessage)}</h3>
                  <span className="date">{getDate(selectedMessage)}</span>
                </div>
              </div>
              <div className="messages__detail-body">
                <p>{getContent(selectedMessage)}</p>
              </div>
              <button 
                className="messages__detail-delete"
                onClick={() => handleDelete(selectedMessage.id)}
              >
                {t('messages.deleteMessage')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
