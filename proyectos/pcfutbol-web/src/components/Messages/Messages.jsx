import React, { useState } from 'react';
import { Briefcase, Mail, HeartPulse, FileText, Newspaper, Landmark, Trash2, Inbox, X } from 'lucide-react';
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
  const { state, dispatch } = useGame();
  const [selectedMessage, setSelectedMessage] = useState(null);
  
  const messages = state.messages || [];
  
  const handleDelete = (messageId) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: messageId });
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null);
    }
  };
  
  const handleClearAll = () => {
    if (window.confirm('¿Eliminar todos los mensajes?')) {
      dispatch({ type: 'CLEAR_MESSAGES' });
      setSelectedMessage(null);
    }
  };
  
  return (
    <div className="messages">
      <div className="messages__header">
        <h2>Bandeja de Entrada ({messages.length})</h2>
        {messages.length > 0 && (
          <button className="messages__clear" onClick={handleClearAll}>
            <Trash2 size={14} /> Borrar todo
          </button>
        )}
      </div>
      
      {messages.length === 0 ? (
        <div className="messages__empty">
          <span className="icon"><Inbox size={22} /></span>
          <p>No tienes mensajes</p>
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
                  <span className="title">{msg.title}</span>
                  <span className="date">{msg.date}</span>
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
                ← Volver a mensajes
              </button>
              <div className="messages__detail-header">
                <span className="icon">
                  {MESSAGE_ICONS[selectedMessage.type] || MESSAGE_ICONS.default}
                </span>
                <div className="info">
                  <h3>{selectedMessage.title}</h3>
                  <span className="date">{selectedMessage.date}</span>
                </div>
              </div>
              <div className="messages__detail-body">
                <p>{selectedMessage.content}</p>
              </div>
              <button 
                className="messages__detail-delete"
                onClick={() => handleDelete(selectedMessage.id)}
              >
                Eliminar mensaje
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
