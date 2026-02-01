import React, { useState, useEffect } from 'react';
import { FolderOpen, Save, FolderCog, Trash2, PlusCircle, Play, ArrowLeft } from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { getUserSaves, loadGameFromSlot, deleteSaveSlot, saveGameToSlot } from '../../firebase/savesService';
import './SaveSlots.scss';

export default function SaveSlots({ mode = 'load', onBack, onSlotSelected }) {
  // mode: 'load' | 'save' | 'manage'
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
      setError('Error al cargar las partidas');
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
      setError('Error al cargar la partida');
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
      setError('Error al guardar la partida');
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
      setError('Error al eliminar la partida');
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
    if (!timestamp) return 'Nunca';
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
          <p>Cargando partidas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="save-slots">
      <div className="save-slots__container">
        <button className="save-slots__back" onClick={onBack}><ArrowLeft size={14} /> Volver</button>
        
        <div className="save-slots__header">
          <h2>
            {mode === 'load' && <><FolderOpen size={16} /> Cargar Partida</>}
            {mode === 'save' && <><Save size={16} /> Guardar Partida</>}
            {mode === 'manage' && <><FolderCog size={16} /> Gestionar Partidas</>}
          </h2>
          <p className="save-slots__subtitle">
            {mode === 'load' && 'Selecciona una partida guardada o crea una nueva'}
            {mode === 'save' && 'Elige un hueco para guardar tu progreso'}
            {mode === 'manage' && 'Administra tus partidas guardadas'}
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
                <span className="save-slots__slot-number">Hueco {index + 1}</span>
                {!slot.empty && (
                  <span className="save-slots__slot-date">
                    {formatDate(slot.lastSaved)}
                  </span>
                )}
              </div>

              {slot.empty ? (
                <div className="save-slots__slot-empty">
                  <div className="save-slots__empty-icon"><PlusCircle size={36} /></div>
                  <p>Hueco vacío</p>
                  
                  {mode === 'load' && (
                    <button 
                      className="save-slots__btn save-slots__btn--new"
                      onClick={() => handleNewGame(index)}
                    >
                      Nueva Partida
                    </button>
                  )}
                  
                  {mode === 'save' && state.gameStarted && (
                    <button 
                      className="save-slots__btn save-slots__btn--save"
                      onClick={() => handleSaveSlot(index)}
                      disabled={actionLoading === index}
                    >
                      {actionLoading === index ? 'Guardando...' : 'Guardar aquí'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="save-slots__slot-content">
                  <div className="save-slots__team-info">
                    <div className="save-slots__team-badge"><FootballIcon size={20} /></div>
                    <div className="save-slots__team-details">
                      <h3>{slot.summary?.teamName || 'Equipo desconocido'}</h3>
                      <p>
                        Temporada {slot.summary?.season || 1} · 
                        Jornada {slot.summary?.week || 1}
                        {slot.summary?.position && ` · ${slot.summary.position}º`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="save-slots__stats">
                    <div className="save-slots__stat">
                      <span className="label">Presupuesto</span>
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
                        {actionLoading === index ? 'Cargando...' : <><Play size={14} /> Cargar</>}
                      </button>
                    )}
                    
                    {mode === 'save' && (
                      <>
                        {confirmDelete === index ? (
                          <div className="save-slots__confirm">
                            <p>¿Sobrescribir?</p>
                            <button 
                              className="save-slots__btn save-slots__btn--danger"
                              onClick={() => handleSaveSlot(index)}
                            >
                              Sí
                            </button>
                            <button 
                              className="save-slots__btn save-slots__btn--cancel"
                              onClick={() => setConfirmDelete(null)}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="save-slots__btn save-slots__btn--save"
                            onClick={() => setConfirmDelete(index)}
                            disabled={actionLoading === index}
                          >
                            <Save size={14} /> Guardar aquí
                          </button>
                        )}
                      </>
                    )}
                    
                    {mode === 'manage' && (
                      <>
                        {confirmDelete === index ? (
                          <div className="save-slots__confirm">
                            <p>¿Eliminar partida?</p>
                            <button 
                              className="save-slots__btn save-slots__btn--danger"
                              onClick={() => handleDeleteSlot(index)}
                              disabled={actionLoading === index}
                            >
                              {actionLoading === index ? '...' : 'Sí'}
                            </button>
                            <button 
                              className="save-slots__btn save-slots__btn--cancel"
                              onClick={() => setConfirmDelete(null)}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              className="save-slots__btn save-slots__btn--load"
                              onClick={() => handleLoadSlot(index)}
                              disabled={actionLoading === index}
                            >
                              <Play size={14} /> Cargar
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
