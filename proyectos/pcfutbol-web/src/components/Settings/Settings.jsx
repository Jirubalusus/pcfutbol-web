import React, { useState } from 'react';
import { Settings as SettingsIcon, X, Music, Volume2, Save, Check, XCircle, Trash2, AlertTriangle, LogOut, Globe, User, Pencil, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { themeList } from '../../themes';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../firebase/config';
import './Settings.scss';

export default function Settings({ onClose }) {
  const { t, i18n } = useTranslation();
  const { state, dispatch, saveGame } = useGame();
  const { user } = useAuth();
  const { themeId, changeTheme } = useTheme();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [nameStatus, setNameStatus] = useState(null);
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

  const handleNameSave = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length < 2) { setNameStatus('tooShort'); return; }
    if (trimmed.length > 24) { setNameStatus('tooLong'); return; }
    setNameStatus('saving');
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });
      setNameStatus('saved');
      setEditingName(false);
      setTimeout(() => setNameStatus(null), 2000);
    } catch (e) {
      console.error('Name update error:', e);
      setNameStatus('error');
      setTimeout(() => setNameStatus(null), 3000);
    }
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

        {/* Apariencia / Theme */}
        <section className="settings__section">
          <h3><Palette size={16} /> {t('settings.appearance')}</h3>
          <div className="settings__theme-grid">
            {themeList.map(theme => (
              <button
                key={theme.id}
                className={`settings__theme-card ${themeId === theme.id ? 'active' : ''}`}
                onClick={() => changeTheme(theme.id)}
              >
                <div className="theme-preview" style={{
                  background: theme.preview.bg,
                  borderColor: themeId === theme.id ? theme.preview.accent : 'transparent',
                }}>
                  <div className="theme-preview__card" style={{ background: theme.preview.card }}>
                    <div className="theme-preview__line" style={{ background: theme.preview.text, opacity: 0.7 }} />
                    <div className="theme-preview__line theme-preview__line--short" style={{ background: theme.preview.text, opacity: 0.4 }} />
                  </div>
                  <div className="theme-preview__accent" style={{ background: theme.preview.accent }} />
                </div>
                <span className="theme-name">{t(theme.nameKey)}</span>
                {themeId === theme.id && <Check size={14} className="theme-check" />}
              </button>
            ))}
          </div>
        </section>

        {/* Nombre del manager */}
        {user && (
          <section className="settings__section">
            <h3><User size={16} /> {t('settings.managerName')}</h3>
            <div className="settings__name-editor">
              {!editingName ? (
                <div className="settings__name-display">
                  <span className="current-name">{user.displayName || t('office.manager')}</span>
                  <button className="settings__name-edit-btn" onClick={() => { setNewName(user.displayName || ''); setEditingName(true); }}>
                    <Pencil size={14} /> {t('settings.changeName')}
                  </button>
                </div>
              ) : (
                <div className="settings__name-form">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    maxLength={24}
                    placeholder={t('settings.namePlaceholder')}
                    autoFocus
                  />
                  <div className="settings__name-actions">
                    <button className="cancel" onClick={() => { setEditingName(false); setNameStatus(null); }}>
                      <X size={14} /> {t('common.cancel')}
                    </button>
                    <button className="confirm" onClick={handleNameSave} disabled={nameStatus === 'saving'}>
                      <Check size={14} /> {nameStatus === 'saving' ? t('common.loading') : t('common.save')}
                    </button>
                  </div>
                  {nameStatus === 'tooShort' && <p className="settings__name-error">{t('settings.nameTooShort')}</p>}
                  {nameStatus === 'tooLong' && <p className="settings__name-error">{t('settings.nameTooLong')}</p>}
                  {nameStatus === 'error' && <p className="settings__name-error">{t('settings.nameError')}</p>}
                  {nameStatus === 'saved' && <p className="settings__name-success">{t('settings.nameSaved')}</p>}
                </div>
              )}
            </div>
          </section>
        )}

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
