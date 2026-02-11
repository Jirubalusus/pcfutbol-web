import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  getEditions, 
  setActiveEdition, 
  getActiveEditionId,
  clearActiveEdition,
  submitEdition,
  deleteAllSaves
} from '../../data/editions/editionService';
import { Download, Check, Trash2, AlertTriangle, ArrowLeft, Package, Upload, FileText, Shield, Eye } from 'lucide-react';
import './EditionMode.scss';

export default function EditionMode({ onBack, onEditionApplied }) {
  const { user } = useAuth();
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [activeEdition, setActiveEditionState] = useState(getActiveEditionId());
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [previewPack, setPreviewPack] = useState(null);

  useEffect(() => {
    loadEditions();
  }, []);

  const loadEditions = async () => {
    setLoading(true);
    const list = await getEditions();
    setEditions(list);
    setLoading(false);
  };

  const handleApply = (edition) => {
    setShowConfirm({ action: 'apply', edition });
  };

  const handleRemove = () => {
    setShowConfirm({ action: 'remove' });
  };

  const confirmAction = async () => {
    if (!showConfirm) return;
    
    if (showConfirm.action === 'apply') {
      setApplying(showConfirm.edition.id);
      
      // Delete all saves
      if (user?.uid) {
        await deleteAllSaves(user.uid);
      }
      
      // Set active edition
      setActiveEdition(showConfirm.edition.id);
      setActiveEditionState(showConfirm.edition.id);
      
      setApplying(null);
      setShowConfirm(null);
      
      if (onEditionApplied) {
        onEditionApplied(showConfirm.edition);
      }
    } else if (showConfirm.action === 'remove') {
      // Delete all saves
      if (user?.uid) {
        await deleteAllSaves(user.uid);
      }
      
      clearActiveEdition();
      setActiveEditionState(null);
      setShowConfirm(null);
      
      if (onEditionApplied) {
        onEditionApplied(null);
      }
    }
  };

  const handleImportPreview = () => {
    setImportError('');
    try {
      const data = JSON.parse(importText);
      if (!data.name || !data.teams) {
        setImportError('Formato inválido. Se requiere: { "name": "...", "teams": { ... } }');
        return;
      }
      const teamCount = Object.keys(data.teams).length;
      const playerCount = Object.values(data.teams).reduce((sum, t) => 
        sum + (t.players ? Object.keys(t.players).length : 0), 0
      );
      setPreviewPack({ ...data, teamCount, playerCount });
    } catch (err) {
      setImportError('JSON inválido: ' + err.message);
    }
  };

  const handleSubmitPack = async () => {
    if (!previewPack) return;
    setImportError('');
    
    const pendingId = await submitEdition({
      ...previewPack,
      id: previewPack.id || `pack_${Date.now()}`
    }, user?.uid);
    
    if (pendingId) {
      setImportSuccess('✅ Pack enviado para revisión. Será visible cuando el administrador lo apruebe.');
      setImportText('');
      setPreviewPack(null);
    } else {
      setImportError('Error al enviar el pack');
    }
  };

  const activeEditionData = editions.find(e => e.id === activeEdition);

  return (
    <div className="edition-mode">
      <div className="edition-mode__header">
        <button className="edition-mode__back" onClick={onBack}>
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>
        <h1>
          <Package size={24} />
          Modo Edición
        </h1>
        <p className="edition-mode__subtitle">
          Personaliza nombres de equipos y jugadores con packs de la comunidad
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
                {activeEditionData.teamCount} equipos · {activeEditionData.playerCount} jugadores
              </span>
            </div>
          </div>
          <button onClick={handleRemove} className="edition-mode__remove-btn">
            <Trash2 size={14} />
            Quitar
          </button>
        </div>
      )}

      {/* Warning */}
      <div className="edition-mode__warning">
        <AlertTriangle size={18} />
        <p>Al aplicar o quitar un pack se <strong>borrarán todas las partidas guardadas</strong>. Los datos del juego se recargarán con los nuevos nombres.</p>
      </div>

      {/* Editions list */}
      <div className="edition-mode__list">
        <h2>📦 Packs disponibles</h2>
        
        {loading ? (
          <div className="edition-mode__loading">Cargando packs...</div>
        ) : editions.length === 0 ? (
          <div className="edition-mode__empty">
            <FileText size={40} />
            <p>No hay packs disponibles</p>
            <p className="edition-mode__empty-hint">Los packs aparecerán aquí cuando sean aprobados</p>
          </div>
        ) : (
          editions.map(edition => (
            <div 
              key={edition.id} 
              className={`edition-mode__card ${activeEdition === edition.id ? 'edition-mode__card--active' : ''}`}
            >
              <div className="edition-mode__card-info">
                <h3>{edition.name}</h3>
                {edition.description && <p className="edition-mode__card-desc">{edition.description}</p>}
                <div className="edition-mode__card-meta">
                  <span>👤 {edition.author || 'PC Gaffer'}</span>
                  <span>⚽ {edition.teamCount || '?'} equipos</span>
                  <span>🏃 {edition.playerCount || '?'} jugadores</span>
                  {edition.version && <span>v{edition.version}</span>}
                </div>
              </div>
              <div className="edition-mode__card-actions">
                {activeEdition === edition.id ? (
                  <div className="edition-mode__btn edition-mode__btn--active">
                    <Check size={16} />
                    Activo
                  </div>
                ) : (
                  <button 
                    className="edition-mode__btn edition-mode__btn--apply"
                    onClick={() => handleApply(edition)}
                    disabled={applying === edition.id}
                  >
                    <Download size={16} />
                    {applying === edition.id ? 'Aplicando...' : 'Aplicar'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Import/Submit section */}
      <div className="edition-mode__section">
        <h2>📤 Enviar pack</h2>
        <p className="edition-mode__section-desc">
          Crea tu propio pack y envíalo para revisión. Será visible para todos cuando se apruebe.
        </p>
        
        <button 
          className="edition-mode__import-toggle"
          onClick={() => { setShowImport(!showImport); setPreviewPack(null); setImportError(''); setImportSuccess(''); }}
        >
          <Upload size={18} />
          {showImport ? 'Cerrar' : 'Importar pack (JSON)'}
        </button>

        {showImport && (
          <div className="edition-mode__import">
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setPreviewPack(null); }}
              placeholder={'Pega aquí el JSON del pack...\n\nFormato:\n{\n  "name": "Mi Pack",\n  "description": "...",\n  "teams": {\n    "Nombre Ficticio": {\n      "name": "Nombre Real",\n      "players": { "Ficticio": "Real" }\n    }\n  }\n}'}
              rows={10}
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
                Vista previa
              </button>
            ) : (
              <div className="edition-mode__preview">
                <h3>{previewPack.name}</h3>
                {previewPack.description && <p>{previewPack.description}</p>}
                <div className="edition-mode__card-meta">
                  <span>⚽ {previewPack.teamCount} equipos</span>
                  <span>🏃 {previewPack.playerCount} jugadores</span>
                </div>
                <div className="edition-mode__preview-sample">
                  <strong>Muestra:</strong>
                  {Object.entries(previewPack.teams).slice(0, 3).map(([fictName, data]) => (
                    <div key={fictName} className="edition-mode__preview-team">
                      <span className="old">{fictName}</span>
                      <span className="arrow">→</span>
                      <span className="new">{data.name || fictName}</span>
                      {data.players && (
                        <span className="count">({Object.keys(data.players).length} jugadores)</span>
                      )}
                    </div>
                  ))}
                  {Object.keys(previewPack.teams).length > 3 && (
                    <div className="edition-mode__preview-more">
                      ...y {Object.keys(previewPack.teams).length - 3} equipos más
                    </div>
                  )}
                </div>
                <button onClick={handleSubmitPack} className="edition-mode__import-btn edition-mode__import-btn--submit">
                  <Shield size={16} />
                  Enviar para revisión
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="edition-mode__overlay">
          <div className="edition-mode__dialog">
            <AlertTriangle size={40} className="edition-mode__dialog-icon" />
            {showConfirm.action === 'apply' ? (
              <>
                <h3>¿Aplicar "{showConfirm.edition.name}"?</h3>
                <p>Se borrarán <strong>todas las partidas guardadas</strong> (carrera y contrarreloj). Los nombres de equipos y jugadores se actualizarán.</p>
              </>
            ) : (
              <>
                <h3>¿Quitar pack activo?</h3>
                <p>Se borrarán <strong>todas las partidas guardadas</strong> y se volverá a los nombres por defecto.</p>
              </>
            )}
            <p className="edition-mode__dialog-warning">Esta acción no se puede deshacer.</p>
            <div className="edition-mode__dialog-buttons">
              <button onClick={() => setShowConfirm(null)} className="edition-mode__btn edition-mode__btn--cancel">
                Cancelar
              </button>
              <button onClick={confirmAction} className="edition-mode__btn edition-mode__btn--confirm">
                {showConfirm.action === 'apply' ? 'Aplicar y borrar partidas' : 'Quitar y borrar partidas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
