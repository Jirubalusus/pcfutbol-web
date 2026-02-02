import React, { useState } from 'react';
import { Settings as SettingsIcon, X, Music, Volume2, Save, Check, XCircle, Trash2, AlertTriangle, LogOut } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import './Settings.scss';

export default function Settings({ onClose }) {
  const { state, dispatch, saveGame } = useGame();
  const [settings, setSettings] = useState(state.settings || {
    difficulty: 'normal',
    matchSpeed: 'normal',
    autoSave: true,
    showTutorials: true,
    soundEnabled: true,
    musicVolume: 70,
    sfxVolume: 80
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
  };

  const handleSaveGame = async () => {
    setSaveStatus('saving');
    try {
      await saveGame();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleSaveAndExit = async () => {
    setSaveStatus('saving');
    try {
      await saveGame();
      setSaveStatus('saved');
      setTimeout(() => {
        dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
      }, 500);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleResetGame = () => {
    dispatch({ type: 'RESET_GAME' });
    setShowResetConfirm(false);
    onClose?.();
  };

  const difficultyOptions = [
    { value: 'easy', label: 'Fácil', desc: 'IA menos agresiva, más dinero inicial' },
    { value: 'normal', label: 'Normal', desc: 'Experiencia equilibrada' },
    { value: 'hard', label: 'Difícil', desc: 'IA muy competitiva, menos recursos' }
  ];

  const speedOptions = [
    { value: 'slow', label: 'Lenta', desc: 'Más tiempo para ver los partidos' },
    { value: 'normal', label: 'Normal', desc: 'Velocidad estándar' },
    { value: 'fast', label: 'Rápida', desc: 'Partidos más cortos' }
  ];

  return (
    <div className="settings">
      <div className="settings__header">
        <h2><SettingsIcon size={16} /> Opciones</h2>
        {onClose && (
          <button className="settings__close" onClick={onClose}><X size={16} /></button>
        )}
      </div>

      <div className="settings__content">
        {/* Dificultad */}
        <section className="settings__section">
          <h3>Dificultad</h3>
          <div className="settings__options settings__options--cards">
            {difficultyOptions.map(opt => (
              <button
                key={opt.value}
                className={`settings__option-card ${settings.difficulty === opt.value ? 'active' : ''}`}
                onClick={() => handleSettingChange('difficulty', opt.value)}
              >
                <span className="label">{opt.label}</span>
                <span className="desc">{opt.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Velocidad de partidos */}
        <section className="settings__section">
          <h3>Velocidad de Partidos</h3>
          <div className="settings__options settings__options--cards">
            {speedOptions.map(opt => (
              <button
                key={opt.value}
                className={`settings__option-card ${settings.matchSpeed === opt.value ? 'active' : ''}`}
                onClick={() => handleSettingChange('matchSpeed', opt.value)}
              >
                <span className="label">{opt.label}</span>
                <span className="desc">{opt.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Toggles */}
        <section className="settings__section">
          <h3>General</h3>
          <div className="settings__toggles">
            <div className="settings__toggle-item">
              <div className="info">
                <span className="label">Autoguardado</span>
                <span className="desc">Guarda automáticamente cada 5 minutos</span>
              </div>
              <button
                className={`settings__toggle ${settings.autoSave ? 'active' : ''}`}
                onClick={() => handleSettingChange('autoSave', !settings.autoSave)}
              >
                <span className="toggle-knob"></span>
              </button>
            </div>

            <div className="settings__toggle-item">
              <div className="info">
                <span className="label">Mostrar tutoriales</span>
                <span className="desc">Ayudas y consejos durante el juego</span>
              </div>
              <button
                className={`settings__toggle ${settings.showTutorials ? 'active' : ''}`}
                onClick={() => handleSettingChange('showTutorials', !settings.showTutorials)}
              >
                <span className="toggle-knob"></span>
              </button>
            </div>

            <div className="settings__toggle-item">
              <div className="info">
                <span className="label">Sonido</span>
                <span className="desc">Efectos de sonido y música</span>
              </div>
              <button
                className={`settings__toggle ${settings.soundEnabled ? 'active' : ''}`}
                onClick={() => handleSettingChange('soundEnabled', !settings.soundEnabled)}
              >
                <span className="toggle-knob"></span>
              </button>
            </div>
          </div>
        </section>

        {/* Volumen (si sonido está activado) */}
        {settings.soundEnabled && (
          <section className="settings__section">
            <h3>Volumen</h3>
            <div className="settings__sliders">
              <div className="settings__slider-item">
                <div className="slider-header">
                  <span className="label"><Music size={14} /> Música</span>
                  <span className="value">{settings.musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.musicVolume}
                  onChange={(e) => handleSettingChange('musicVolume', parseInt(e.target.value))}
                />
              </div>

              <div className="settings__slider-item">
                <div className="slider-header">
                  <span className="label"><Volume2 size={14} /> Efectos</span>
                  <span className="value">{settings.sfxVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sfxVolume}
                  onChange={(e) => handleSettingChange('sfxVolume', parseInt(e.target.value))}
                />
              </div>
            </div>
          </section>
        )}

        {/* Datos del juego */}
        <section className="settings__section">
          <h3>Datos de Partida</h3>
          <div className="settings__actions">
            {state.gameStarted && (
              <>
                <button 
                  className={`settings__action-btn save ${saveStatus ? saveStatus : ''}`}
                  onClick={handleSaveGame}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' && <><Save size={14} /> Guardando...</>}
                  {saveStatus === 'saved' && <><Check size={14} /> ¡Guardado!</>}
                  {saveStatus === 'error' && <><XCircle size={14} /> Error al guardar</>}
                  {!saveStatus && <><Save size={14} /> Guardar partida</>}
                </button>

                <button 
                  className={`settings__action-btn exit ${saveStatus === 'saving' ? 'disabled' : ''}`}
                  onClick={handleSaveAndExit}
                  disabled={saveStatus === 'saving'}
                >
                  <LogOut size={14} /> Guardar y salir
                </button>
              </>
            )}

            <button 
              className="settings__action-btn danger"
              onClick={() => setShowResetConfirm(true)}
            >
              <Trash2 size={14} /> Borrar datos y reiniciar
            </button>
          </div>
        </section>

        {/* Info del juego */}
        <section className="settings__section settings__section--info">
          <div className="settings__game-info">
            <p className="title">PC Fútbol Web Edition</p>
            <p className="version">Versión 1.0.0</p>
            <p className="credits">Un tributo al clásico PC Fútbol 5.0</p>
          </div>
        </section>
      </div>

      {/* Modal de confirmación de reset */}
      {showResetConfirm && (
        <div className="settings__modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="settings__modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon"><AlertTriangle size={22} /></div>
            <h3>¿Borrar todos los datos?</h3>
            <p>Esta acción eliminará tu partida guardada y no se puede deshacer.</p>
            <div className="modal-actions">
              <button 
                className="cancel"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancelar
              </button>
              <button 
                className="confirm"
                onClick={handleResetGame}
              >
                Sí, borrar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
