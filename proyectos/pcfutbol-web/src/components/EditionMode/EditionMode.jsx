import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { 
  getEditions, 
  setActiveEdition, 
  getActiveEditionId,
  clearActiveEdition,
  submitEdition,
  deleteAllSaves
} from '../../data/editions/editionService';
import { Download, Check, Trash2, AlertTriangle, ArrowLeft, Package, Upload, FileText, Shield, Eye, Loader, RefreshCw, WifiOff } from 'lucide-react';
import './EditionMode.scss';

export default function EditionMode({ onBack, onEditionApplied }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [applying, setApplying] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [activeEdition, setActiveEditionState] = useState(getActiveEditionId());
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [previewPack, setPreviewPack] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadEditions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (!navigator.onLine) {
        setLoadError('offline');
        setLoading(false);
        return;
      }
      const list = await getEditions();
      setEditions(list);
    } catch (err) {
      console.error('Error loading editions:', err);
      setLoadError('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEditions();
  }, [loadEditions]);

  const handleApply = (edition) => {
    setShowConfirm({ action: 'apply', edition });
  };

  const handleRemove = () => {
    setShowConfirm({ action: 'remove' });
  };

  const confirmAction = async () => {
    if (!showConfirm) return;
    
    try {
      if (showConfirm.action === 'apply') {
        setApplying(showConfirm.edition.id);
        
        if (user?.uid) {
          await deleteAllSaves(user.uid);
        }
        
        setActiveEdition(showConfirm.edition.id);
        setActiveEditionState(showConfirm.edition.id);
        
        setApplying(null);
        setShowConfirm(null);
        
        if (onEditionApplied) {
          onEditionApplied(showConfirm.edition);
        }
      } else if (showConfirm.action === 'remove') {
        setApplying('removing');
        
        if (user?.uid) {
          await deleteAllSaves(user.uid);
        }
        
        clearActiveEdition();
        setActiveEditionState(null);
        setApplying(null);
        setShowConfirm(null);
        
        if (onEditionApplied) {
          onEditionApplied(null);
        }
      }
    } catch (err) {
      console.error('Error during edition action:', err);
      setApplying(null);
      setShowConfirm(null);
    }
  };

  const handleImportPreview = () => {
    setImportError('');
    try {
      const data = JSON.parse(importText);
      if (!data.name || !data.teams) {
        setImportError(t('edition.invalidFormat'));
        return;
      }
      if (Object.keys(data.teams).length === 0) {
        setImportError(t('edition.noTeams'));
        return;
      }
      const teamCount = Object.keys(data.teams).length;
      const playerCount = Object.values(data.teams).reduce((sum, team) => 
        sum + (team.players ? Object.keys(team.players).length : 0), 0
      );
      setPreviewPack({ ...data, teamCount, playerCount });
    } catch (err) {
      setImportError(t('edition.invalidJson') + ': ' + err.message);
    }
  };

  const handleSubmitPack = async () => {
    if (!previewPack || submitting) return;
    setImportError('');
    setSubmitting(true);
    
    try {
      if (!navigator.onLine) {
        setImportError(t('edition.offline'));
        setSubmitting(false);
        return;
      }
      
      const pendingId = await submitEdition({
        ...previewPack,
        id: previewPack.id || `pack_${Date.now()}`
      }, user?.uid);
      
      if (pendingId) {
        setImportSuccess('✅ ' + t('edition.submittedSuccess'));
        setImportText('');
        setPreviewPack(null);
      } else {
        setImportError(t('edition.submitError'));
      }
    } catch (err) {
      console.error('Error submitting pack:', err);
      setImportError(t('edition.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const activeEditionData = editions.find(e => e.id === activeEdition);

  return (
    <div className="edition-mode">
      <div className="edition-mode__header">
        <button className="edition-mode__back" onClick={onBack}>
          <ArrowLeft size={20} />
          <span>{t('edition.back')}</span>
        </button>
        <h1>
          <Package size={24} />
          {t('edition.title')}
        </h1>
        <p className="edition-mode__subtitle">
          {t('edition.subtitle')}
        </p>
      </div>

      {/* Active edition banner */}
      {activeEdition && activeEditionData && (
        <div className="edition-mode__active">
          <div className="edition-mode__active-info">
            <Check size={18} />
            <div>
              <strong>{activeEditionData.name}</strong>
              <span className="edition-mode__active-meta">
                {activeEditionData.teamCount} {t('edition.teams')} · {activeEditionData.playerCount} {t('edition.players')}
              </span>
            </div>
          </div>
          <button onClick={handleRemove} className="edition-mode__remove-btn">
            <Trash2 size={14} />
            {t('edition.remove')}
          </button>
        </div>
      )}

      {/* Active edition indicator when data hasn't loaded yet */}
      {activeEdition && !activeEditionData && !loading && (
        <div className="edition-mode__active edition-mode__active--pending">
          <div className="edition-mode__active-info">
            <Check size={18} />
            <div>
              <strong>{activeEdition}</strong>
              <span className="edition-mode__active-meta">{t('edition.active')}</span>
            </div>
          </div>
          <button onClick={handleRemove} className="edition-mode__remove-btn">
            <Trash2 size={14} />
            {t('edition.remove')}
          </button>
        </div>
      )}

      {/* Warning */}
      <div className="edition-mode__warning">
        <AlertTriangle size={18} />
        <p dangerouslySetInnerHTML={{ __html: t('edition.warning') }} />
      </div>

      {/* Editions list */}
      <div className="edition-mode__list">
        <h2>📦 {t('edition.availablePacks')}</h2>
        
        {loading ? (
          <div className="edition-mode__loading">
            <Loader size={24} className="edition-mode__spinner" />
            <p>{t('edition.loading')}</p>
          </div>
        ) : loadError === 'offline' ? (
          <div className="edition-mode__empty edition-mode__empty--error">
            <WifiOff size={40} />
            <p>{t('edition.offlineMsg') || 'Sin conexión a internet'}</p>
            <button className="edition-mode__retry-btn" onClick={loadEditions}>
              <RefreshCw size={16} />
              {t('edition.retry') || 'Reintentar'}
            </button>
          </div>
        ) : loadError === 'error' ? (
          <div className="edition-mode__empty edition-mode__empty--error">
            <AlertTriangle size={40} />
            <p>{t('edition.loadError') || 'Error al cargar los packs'}</p>
            <button className="edition-mode__retry-btn" onClick={loadEditions}>
              <RefreshCw size={16} />
              {t('edition.retry') || 'Reintentar'}
            </button>
          </div>
        ) : editions.length === 0 ? (
          <div className="edition-mode__empty">
            <FileText size={40} />
            <p>{t('edition.noPacks')}</p>
            <p className="edition-mode__empty-hint">{t('edition.noPacksHint')}</p>
          </div>
        ) : (
          <div className="edition-mode__cards">
            {editions.map(edition => (
              <div 
                key={edition.id} 
                className={`edition-mode__card ${activeEdition === edition.id ? 'edition-mode__card--active' : ''}`}
              >
                <div className="edition-mode__card-info">
                  <h3>{edition.name}</h3>
                  {edition.description && <p className="edition-mode__card-desc">{edition.description}</p>}
                  <div className="edition-mode__card-meta">
                    <span>👤 {edition.author || 'PC Gaffer'}</span>
                    <span>⚽ {edition.teamCount || '?'} {t('edition.teams')}</span>
                    <span>🏃 {edition.playerCount || '?'} {t('edition.players')}</span>
                    {edition.version && <span>v{edition.version}</span>}
                  </div>
                </div>
                <div className="edition-mode__card-actions">
                  {activeEdition === edition.id ? (
                    <div className="edition-mode__btn edition-mode__btn--active">
                      <Check size={16} />
                      {t('edition.active')}
                    </div>
                  ) : (
                    <button 
                      className="edition-mode__btn edition-mode__btn--apply"
                      onClick={() => handleApply(edition)}
                      disabled={applying === edition.id}
                    >
                      {applying === edition.id ? (
                        <Loader size={16} className="edition-mode__spinner" />
                      ) : (
                        <Download size={16} />
                      )}
                      {applying === edition.id ? t('edition.applying') : t('edition.apply')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import/Submit section */}
      <div className="edition-mode__section">
        <h2>📤 {t('edition.submitPack')}</h2>
        <p className="edition-mode__section-desc">
          {t('edition.submitDesc')}
        </p>
        
        <button 
          className="edition-mode__import-toggle"
          onClick={() => { setShowImport(!showImport); setPreviewPack(null); setImportError(''); setImportSuccess(''); }}
        >
          <Upload size={18} />
          {showImport ? t('edition.close') : t('edition.importJson')}
        </button>

        {showImport && (
          <div className="edition-mode__import">
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setPreviewPack(null); setImportError(''); }}
              placeholder={t('edition.pasteJson') + '\n\n{\n  "name": "Mi Pack",\n  "teams": {\n    "Nombre Ficticio": {\n      "name": "Nombre Real",\n      "players": { "Ficticio": "Real" }\n    }\n  }\n}'}
              rows={8}
              spellCheck={false}
            />
            
            {importError && <div className="edition-mode__error">{importError}</div>}
            {importSuccess && <div className="edition-mode__success">{importSuccess}</div>}
            
            {!previewPack ? (
              <button 
                onClick={handleImportPreview} 
                disabled={!importText.trim()}
                className="edition-mode__import-btn"
              >
                <Eye size={16} />
                {t('edition.preview')}
              </button>
            ) : (
              <div className="edition-mode__preview">
                <h3>{previewPack.name}</h3>
                {previewPack.description && <p>{previewPack.description}</p>}
                <div className="edition-mode__card-meta">
                  <span>⚽ {previewPack.teamCount} {t('edition.teams')}</span>
                  <span>🏃 {previewPack.playerCount} {t('edition.players')}</span>
                </div>
                <div className="edition-mode__preview-sample">
                  <strong>{t('edition.sample')}:</strong>
                  {Object.entries(previewPack.teams).slice(0, 3).map(([fictName, data]) => (
                    <div key={fictName} className="edition-mode__preview-team">
                      <span className="old">{fictName}</span>
                      <span className="arrow">→</span>
                      <span className="new">{data.name || fictName}</span>
                      {data.players && (
                        <span className="count">({Object.keys(data.players).length} {t('edition.players')})</span>
                      )}
                    </div>
                  ))}
                  {Object.keys(previewPack.teams).length > 3 && (
                    <div className="edition-mode__preview-more">
                      {t('edition.andMore', { count: Object.keys(previewPack.teams).length - 3 })}
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleSubmitPack} 
                  className="edition-mode__import-btn edition-mode__import-btn--submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader size={16} className="edition-mode__spinner" />
                  ) : (
                    <Shield size={16} />
                  )}
                  {submitting ? t('edition.applying') : t('edition.submitForReview')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="edition-mode__overlay" onClick={() => !applying && setShowConfirm(null)}>
          <div className="edition-mode__dialog" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={40} className="edition-mode__dialog-icon" />
            {showConfirm.action === 'apply' ? (
              <>
                <h3>{t('edition.confirmApply', { name: showConfirm.edition.name })}</h3>
                <p>{t('edition.confirmApplyDesc')}</p>
              </>
            ) : (
              <>
                <h3>{t('edition.confirmRemove')}</h3>
                <p>{t('edition.confirmRemoveDesc')}</p>
              </>
            )}
            <p className="edition-mode__dialog-warning">{t('edition.irreversible')}</p>
            <div className="edition-mode__dialog-buttons">
              <button 
                onClick={() => setShowConfirm(null)} 
                className="edition-mode__btn edition-mode__btn--cancel"
                disabled={!!applying}
              >
                {t('edition.cancel')}
              </button>
              <button 
                onClick={confirmAction} 
                className="edition-mode__btn edition-mode__btn--confirm"
                disabled={!!applying}
              >
                {applying ? (
                  <Loader size={16} className="edition-mode__spinner" />
                ) : null}
                {showConfirm.action === 'apply' ? t('edition.applyAndDelete') : t('edition.removeAndDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
