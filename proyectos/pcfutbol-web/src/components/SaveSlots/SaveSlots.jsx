import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Save, FolderCog, Trash2, PlusCircle, Play, ArrowLeft } from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { getUserSaves, loadGameFromSlot, deleteSaveSlot, saveGameToSlot } from '../../firebase/savesService';
import './SaveSlots.scss';

export default function SaveSlots({ mode = 'load', onBack, onSlotSelected }) {
  // mode: 'load' | 'save' | 'manage'
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state, dispatch } = useGame();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSlots();
  }, [user]);

  const loadSlots = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      const saves = await getUserSaves(user.uid);
      setSlots(saves);
    } catch (err) {
      console.error('Error loading saves:', err);
      setError(t('saveSlots.errorLoadGames'));
    }
    
    setLoading(false);
  };

  const handleLoadSlot = async (slotIndex) => {
    if (!user) return;
    
    setActionLoading(slotIndex);
    setError('');
    
    try {
      const saveData = await loadGameFromSlot(user.uid, slotIndex);
      if (saveData) {
        dispatch({ type: 'LOAD_SAVE', payload: saveData });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
        if (onSlotSelected) onSlotSelected(slotIndex);
      }
    } catch (err) {
      console.error('Error loading slot:', err);
      setError(t('saveSlots.errorLoadGame'));
    }
    
    setActionLoading(null);
  };

  const handleSaveSlot = async (slotIndex) => {
    if (!user || !state.gameStarted) return;
    
    setActionLoading(slotIndex);
    setError('');
    
    try {
      await saveGameToSlot(user.uid, slotIndex, state);
      await loadSlots();
      if (onSlotSelected) onSlotSelected(slotIndex);
    } catch (err) {
      console.error('Error saving slot:', err);
      setError(t('saveSlots.errorSaveGame'));
    }
    
    setActionLoading(null);
  };

  const handleDeleteSlot = async (slotIndex) => {
    if (!user) return;
    
    setActionLoading(slotIndex);
    setError('');
    
    try {
      await deleteSaveSlot(user.uid, slotIndex);
      setConfirmDelete(null);
      await loadSlots();
    } catch (err) {
      console.error('Error deleting slot:', err);
      setError(t('saveSlots.errorDeleteGame'));
    }
    
    setActionLoading(null);
  };

  const handleNewGame = (slotIndex) => {
    // Store selected slot for after team selection
    localStorage.setItem('pcfutbol_pending_slot', slotIndex.toString());
    dispatch({ type: 'SET_SCREEN', payload: 'team_selection' });
    if (onSlotSelected) onSlotSelected(slotIndex);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return t('saveSlots.never');
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMoney = (amount) => {
    if (!amount) return '0€';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="save-slots">
        <div className="save-slots__loading">
          <div className="save-slots__spinner"><FootballIcon size={22} /></div>
          <p>{t('saveSlots.loadingGames')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="save-slots">
      <div className="save-slots__container">
        <button className="save-slots__back" onClick={onBack}><ArrowLeft size={14} /> {t('saveSlots.back')}</button>
        
        <div className="save-slots__header">
          <h2>
            {mode === 'load' && <><FolderOpen size={16} /> {t('saveSlots.loadGame')}</>}
            {mode === 'save' && <><Save size={16} /> {t('saveSlots.saveGame')}</>}
            {mode === 'manage' && <><FolderCog size={16} /> {t('saveSlots.manageGames')}</>}
          </h2>
          <p className="save-slots__subtitle">
            {mode === 'load' && t('saveSlots.selectOrCreate')}
            {mode === 'save' && t('saveSlots.chooseSlot')}
            {mode === 'manage' && t('saveSlots.manageSlots')}
          </p>
        </div>

        {error && <div className="save-slots__error">{error}</div>}

        <div className="save-slots__grid">
          {slots.map((slot, index) => (
            <div 
              key={index}
              className={`save-slots__slot ${slot.empty ? 'save-slots__slot--empty' : ''}`}
            >
              <div className="save-slots__slot-header">
                <span className="save-slots__slot-number">{t('saveSlots.slot')} {index + 1}</span>
                {!slot.empty && (
                  <span className="save-slots__slot-date">
                    {formatDate(slot.lastSaved)}
                  </span>
                )}
              </div>

              {slot.empty ? (
                <div className="save-slots__slot-empty">
                  <div className="save-slots__empty-icon"><PlusCircle size={36} /></div>
                  <p>{t('saveSlots.emptySlot')}</p>
                  
                  {mode === 'load' && (
                    <button 
                      className="save-slots__btn save-slots__btn--new"
                      onClick={() => handleNewGame(index)}
                    >
                      {t('saveSlots.newGame')}
                    </button>
                  )}
                  
                  {mode === 'save' && state.gameStarted && (
                    <button 
                      className="save-slots__btn save-slots__btn--save"
                      onClick={() => handleSaveSlot(index)}
                      disabled={actionLoading === index}
                    >
                      {actionLoading === index ? t('saveSlots.saving') : t('saveSlots.saveHere')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="save-slots__slot-content">
                  <div className="save-slots__team-info">
                    <div className="save-slots__team-badge"><FootballIcon size={20} /></div>
                    <div className="save-slots__team-details">
                      <h3>{slot.summary?.teamName || t('saveSlots.unknownTeam')}</h3>
                      <p>
                        {t('common.season')} {slot.summary?.season || 1} · 
                        {t('common.week')} {slot.summary?.week || 1}
                        {slot.summary?.position && ` · ${slot.summary.position}º`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="save-slots__stats">
                    <div className="save-slots__stat">
                      <span className="label">{t('common.budget')}</span>
                      <span className="value">{formatMoney(slot.summary?.money)}</span>
                    </div>
                  </div>

                  <div className="save-slots__actions">
                    {mode === 'load' && (
                      <button 
                        className="save-slots__btn save-slots__btn--load"
                        onClick={() => handleLoadSlot(index)}
                        disabled={actionLoading === index}
                      >
                        {actionLoading === index ? t('saveSlots.loading') : <><Play size={14} /> {t('saveSlots.load')}</>}
                      </button>
                    )}
                    
                    {mode === 'save' && (
                      <>
                        {confirmDelete === index ? (
                          <div className="save-slots__confirm">
                            <p>{t('saveSlots.overwrite')}</p>
                            <button 
                              className="save-slots__btn save-slots__btn--danger"
                              onClick={() => handleSaveSlot(index)}
                            >
                              {t('common.yes')}
                            </button>
                            <button 
                              className="save-slots__btn save-slots__btn--cancel"
                              onClick={() => setConfirmDelete(null)}
                            >
                              {t('common.no')}
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="save-slots__btn save-slots__btn--save"
                            onClick={() => setConfirmDelete(index)}
                            disabled={actionLoading === index}
                          >
                            <Save size={14} /> {t('saveSlots.saveHere')}
                          </button>
                        )}
                      </>
                    )}
                    
                    {mode === 'manage' && (
                      <>
                        {confirmDelete === index ? (
                          <div className="save-slots__confirm">
                            <p>{t('saveSlots.deleteGame')}</p>
                            <button 
                              className="save-slots__btn save-slots__btn--danger"
                              onClick={() => handleDeleteSlot(index)}
                              disabled={actionLoading === index}
                            >
                              {actionLoading === index ? t('common.loading') : t('common.yes')}
                            </button>
                            <button 
                              className="save-slots__btn save-slots__btn--cancel"
                              onClick={() => setConfirmDelete(null)}
                            >
                              {t('common.no')}
                            </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              className="save-slots__btn save-slots__btn--load"
                              onClick={() => handleLoadSlot(index)}
                              disabled={actionLoading === index}
                            >
                              <Play size={14} /> {t('saveSlots.load')}
                            </button>
                            <button 
                              className="save-slots__btn save-slots__btn--delete"
                              onClick={() => setConfirmDelete(index)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
