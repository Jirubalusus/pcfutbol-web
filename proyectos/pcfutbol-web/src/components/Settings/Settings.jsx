import React, { useState } from 'react';
import { Settings as SettingsIcon, X, Music, Volume2, Save, Check, XCircle, Trash2, AlertTriangle, LogOut, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import './Settings.scss';

export default function Settings({ onClose }) {
  const { t, i18n } = useTranslation();
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

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
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

  const languageOptions = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
  ];

  const difficultyOptions = [
    { value: 'easy', label: t('settings.easy'), desc: t('settings.difficultyEasyDesc') },
    { value: 'normal', label: t('settings.normal'), desc: t('settings.difficultyNormalDesc') },
    { value: 'hard', label: t('settings.hard'), desc: t('settings.difficultyHardDesc') }
  ];

  const speedOptions = [
    { value: 'slow', label: t('settings.speedSlow'), desc: t('settings.speedSlowDesc') },
    { value: 'normal', label: t('settings.normal'), desc: t('settings.speedNormalDesc') },
    { value: 'fast', label: t('settings.speedFast'), desc: t('settings.speedFastDesc') }
  ];

  return (
    <div className="settings">
      <div className="settings__header">
        <h2><SettingsIcon size={16} /> {t('settings.title')}</h2>
        {onClose && (
          <button className="settings__close" onClick={onClose}><X size={16} /></button>
        )}
      </div>

      <div className="settings__content">
        {/* Idioma / Language */}
        <section className="settings__section">
          <h3><Globe size={16} /> {t('settings.language')}</h3>
          <div className="settings__language-grid">
            {languageOptions.map(lang => (
              <button
                key={lang.code}
                className={`settings__language-card ${i18n.language === lang.code ? 'active' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                <span className="flag">{lang.flag}</span>
                <span className="name">{lang.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Dificultad y Velocidad eliminadas - siempre normal */}

        {/* Toggles */}
        <section className="settings__section">
          <h3>{t('settings.general')}</h3>
          <div className="settings__toggles">
            <div className="settings__toggle-item">
              <div className="info">
                <span className="label">{t('settings.autosaveLabel')}</span>
                <span className="desc">{t('settings.autosaveDesc')}</span>
              </div>
              <button
                className={`settings__toggle ${settings.autoSave ? 'active' : ''}`}
                onClick={() => handleSettingChange('autoSave', !settings.autoSave)}
              >
                <span className="toggle-knob"></span>
              </button>
            </div>

          </div>
        </section>

        {/* Volumen */}
        <section className="settings__section">
          <h3>{t('settings.volume')}</h3>
          <div className="settings__sliders">
            <div className="settings__slider-item">
              <div className="slider-header">
                <span className="label"><Music size={14} /> {t('settings.music')}</span>
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
                <span className="label"><Volume2 size={14} /> {t('settings.effects')}</span>
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

        {/* Datos del juego */}
        <section className="settings__section">
          <h3>{t('settings.gameData')}</h3>
          <div className="settings__actions">
            {state.gameStarted && (
                <button 
                  className={`settings__action-btn exit ${saveStatus === 'saving' ? 'disabled' : ''}`}
                  onClick={handleSaveAndExit}
                  disabled={saveStatus === 'saving'}
                >
                  <LogOut size={14} /> {t('settings.saveAndExit')}
                </button>
            )}

            <button 
              className="settings__action-btn danger"
              onClick={() => setShowResetConfirm(true)}
            >
              <Trash2 size={14} /> {t('settings.deleteAndReset')}
            </button>
          </div>
        </section>

        {/* Info del juego */}
        <section className="settings__section settings__section--info">
          <div className="settings__game-info">
            <p className="title">{t('settings.appTitle')}</p>
            <p className="version">{t('settings.appVersion')}</p>
            <p className="credits">{t('settings.appTribute')}</p>
          </div>
        </section>
      </div>

      {/* Modal de confirmación de reset */}
      {showResetConfirm && (
        <div className="settings__modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="settings__modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon"><AlertTriangle size={22} /></div>
            <h3>{t('settings.deleteConfirm')}</h3>
            <p>{t('settings.deleteMessage')}</p>
            <div className="modal-actions">
              <button 
                className="cancel"
                onClick={() => setShowResetConfirm(false)}
              >
                {t('common.cancel')}
              </button>
              <button 
                className="confirm"
                onClick={handleResetGame}
              >
                {t('settings.yesDeleteAll')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
