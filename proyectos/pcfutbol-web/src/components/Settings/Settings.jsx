import React, { useState } from 'react';
import { Settings as SettingsIcon, X, Music, Volume2, Save, Check, XCircle, Trash2, AlertTriangle, LogOut, Globe, User, Pencil, Palette, ShieldCheck, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { themeList } from '../../themes';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { auth } from '../../firebase/config';
import { deleteAllSaves } from '../../data/editions/editionService';
import { purchaseRemoveAds, restorePurchases } from '../../services/purchaseService';
// Uses native Google Play Billing via custom Capacitor plugin
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
  const [purchaseStatus, setPurchaseStatus] = useState(null); // null, 'loading', 'success', 'error', 'cancelled'
  const isNative = Capacitor.isNativePlatform();
  const isPremium = state.premium === true;

  const handlePurchaseRemoveAds = async () => {
    setPurchaseStatus('loading');
    try {
      const result = await purchaseRemoveAds();
      if (result.success) {
        dispatch({ type: 'SET_PREMIUM', payload: true });
        setPurchaseStatus('success');
      } else if (result.error === 'cancelled') {
        setPurchaseStatus(null);
      } else {
        setPurchaseStatus('error');
        setTimeout(() => setPurchaseStatus(null), 3000);
      }
    } catch (e) {
      console.error('Purchase error:', e);
      setPurchaseStatus('error');
      setTimeout(() => setPurchaseStatus(null), 3000);
    }
  };

  const handleRestorePurchases = async () => {
    setPurchaseStatus('loading');
    try {
      const isPrem = await restorePurchases();
      if (isPrem) {
        dispatch({ type: 'SET_PREMIUM', payload: true });
        setPurchaseStatus('success');
      } else {
        setPurchaseStatus('noRestore');
        setTimeout(() => setPurchaseStatus(null), 3000);
      }
    } catch (e) {
      setPurchaseStatus('error');
      setTimeout(() => setPurchaseStatus(null), 3000);
    }
  };
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
      const uid = user?.uid || auth.currentUser?.uid;
      const isGuestUser = user?.isGuest;

      if (!isGuestUser && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: trimmed });
      }

      // Persist manager name for cross-device loading.
      // Keep both collections in sync because different parts of the app read from each one.
      if (uid) {
        await Promise.all([
          setDoc(doc(db, 'user_profiles', uid), { managerName: trimmed }, { merge: true }),
          setDoc(doc(db, 'users', uid), { displayName: trimmed }, { merge: true })
        ]);
      }

      dispatch({ type: 'SET_MANAGER_NAME', payload: trimmed });
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

  const handleResetGame = async () => {
    // Delete all saves from Firebase
    if (user?.uid) {
      try { await deleteAllSaves(user.uid); } catch (e) { console.error('Error deleting saves:', e); }
    }
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
    <div className="settings unified-screen fade-in-up">
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

        {/* Apariencia / Theme — oculto temporalmente hasta producción
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
        */}

        {/* Nombre del manager */}
        {user && (
          <section className="settings__section">
            <h3><User size={16} /> {t('settings.managerName')}</h3>
            <div className="settings__name-editor">
              {!editingName ? (
                <div className="settings__name-display">
                  <span className="current-name">{state.managerName || user?.displayName || t('office.manager')}</span>
                  <button className="settings__name-edit-btn" onClick={() => { setNewName(state.managerName || user?.displayName || ''); setEditingName(true); }}>
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

        {/* Toggles — only when logged in */}
        {user && <section className="settings__section">
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

            <div className="settings__toggle-item">
              <div className="info">
                <span className="label">🏙️ {t('settings.cityMode3D', 'Modo 3D Ciudad')}</span>
                <span className="desc">{t('settings.cityMode3DDesc', 'Explora tu ciudad en 3D isométrico en vez del menú clásico')}</span>
              </div>
              <button
                className={`settings__toggle ${settings.cityMode3D ? 'active' : ''}`}
                onClick={() => handleSettingChange('cityMode3D', !settings.cityMode3D)}
              >
                <span className="toggle-knob"></span>
              </button>
            </div>

            {/* Game tutorials toggle — hidden for now
            <div className="settings__toggle-item">
              <div className="info">
                <span className="label">{t('settings.gameTutorials')}</span>
                <span className="desc">{t('settings.gameTutorialsDesc')}</span>
              </div>
              <button
                className={`settings__toggle ${settings.showTutorials !== false ? 'active' : ''}`}
                onClick={() => {
                  const newVal = settings.showTutorials === false;
                  handleSettingChange('showTutorials', newVal);
                  if (newVal) {
                    dispatch({ type: 'ENABLE_TUTORIALS' });
                  }
                }}
              >
                <span className="toggle-knob"></span>
              </button>
            </div>
            */}

          </div>
        </section>}

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

        {/* Quitar anuncios / Premium */}
        {isNative && (
          <section className="settings__section">
            <h3><ShieldCheck size={16} /> {t('settings.removeAds', 'Quitar anuncios')}</h3>
            {isPremium ? (
              <div className="settings__premium-active">
                <Check size={16} />
                <span>{t('settings.premiumActive', '¡Sin anuncios! Gracias por tu apoyo 💚')}</span>
              </div>
            ) : (
              <div className="settings__premium-purchase">
                <p className="settings__premium-desc">
                  {t('settings.removeAdsDesc', 'Elimina todos los anuncios del juego con un único pago.')}
                </p>
                <div className="settings__premium-actions">
                  <button
                    className="settings__action-btn premium"
                    onClick={handlePurchaseRemoveAds}
                    disabled={purchaseStatus === 'loading'}
                  >
                    <ShieldCheck size={14} />
                    {purchaseStatus === 'loading'
                      ? t('common.loading', 'Cargando...')
                      : t('settings.buyRemoveAds', 'Quitar anuncios — 0,99€')}
                  </button>
                  <button
                    className="settings__action-btn restore"
                    onClick={handleRestorePurchases}
                    disabled={purchaseStatus === 'loading'}
                  >
                    <RefreshCw size={14} />
                    {t('settings.restorePurchases', 'Restaurar compras')}
                  </button>
                </div>
                {purchaseStatus === 'success' && (
                  <p className="settings__purchase-msg success">{t('settings.purchaseSuccess', '¡Compra realizada! Anuncios eliminados.')}</p>
                )}
                {purchaseStatus === 'error' && (
                  <p className="settings__purchase-msg error">{t('settings.purchaseError', 'Error en la compra. Inténtalo de nuevo.')}</p>
                )}
                {purchaseStatus === 'noRestore' && (
                  <p className="settings__purchase-msg info">{t('settings.noRestore', 'No se encontraron compras previas.')}</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Datos del juego — only when logged in */}
        {user && <section className="settings__section">
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
        </section>}

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
