import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { 
  getEditions, 
  getEdition,
  setActiveEdition, 
  getActiveEditionId,
  clearActiveEdition 
} from '../../data/editions/editionService';
import { Download, Check, Trash2, AlertTriangle, ArrowLeft, Package, Upload, FileText } from 'lucide-react';
import './EditionMode.scss';

export default function EditionMode({ onBack, onEditionApplied }) {
  const { t } = useTranslation();
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
    setShowConfirm(edition);
  };

  const confirmApply = async () => {
    if (!showConfirm) return;
    setApplying(showConfirm.id);
    
    try {
      setActiveEdition(showConfirm.id);
      setActiveEditionState(showConfirm.id);
      
      // Notify parent to clear saves and reload data
      if (onEditionApplied) {
        onEditionApplied(showConfirm);
      }
    } catch (err) {
      console.error('Error applying edition:', err);
    }
    
    setApplying(null);
    setShowConfirm(null);
  };

  const handleRemove = () => {
    clearActiveEdition();
    setActiveEditionState(null);
    if (onEditionApplied) {
      onEditionApplied(null); // null = revert to default
    }
  };

  const handleImport = async () => {
    setImportError('');
    setImportSuccess('');
    
    try {
      const data = JSON.parse(importText);
      
      // Validate format
      if (!data.name || !data.teams) {
        setImportError('Formato inválido. Se requiere: { "name": "...", "teams": { ... } }');
        return;
      }

      // Validate teams structure
      const teamCount = Object.keys(data.teams).length;
      const playerCount = Object.values(data.teams).reduce((sum, t) => 
        sum + (t.players ? Object.keys(t.players).length : 0), 0
      );

      if (teamCount === 0) {
        setImportError('El pack no contiene equipos');
        return;
      }

      // Save to Firebase
      const { saveEdition } = await import('../../data/editions/editionService');
      const editionId = data.id || `edition_${Date.now()}`;
      const editionData = {
        ...data,
        id: editionId,
        author: data.author || user?.displayName || 'Anónimo',
        createdAt: new Date().toISOString(),
        teamCount,
        playerCount
      };
      
      const ok = await saveEdition(editionId, editionData);
      if (ok) {
        setImportSuccess(`✅ Pack "${data.name}" importado (${teamCount} equipos, ${playerCount} jugadores)`);
        setImportText('');
        loadEditions();
      } else {
        setImportError('Error al guardar en Firebase');
      }
    } catch (err) {
      setImportError('JSON inválido: ' + err.message);
    }
  };

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
          Aplica packs de la comunidad para personalizar nombres de equipos y jugadores
        </p>
      </div>

      {/* Active edition banner */}
      {activeEdition && (
        <div className="edition-mode__active">
          <Check size={18} />
          <span>Pack activo: <strong>{editions.find(e => e.id === activeEdition)?.name || activeEdition}</strong></span>
          <button onClick={handleRemove} className="edition-mode__remove-btn">
            <Trash2 size={16} />
            Quitar
          </button>
        </div>
      )}

      {/* Warning */}
      <div className="edition-mode__warning">
        <AlertTriangle size={18} />
        <p>Al aplicar un pack se <strong>borrarán todas las partidas guardadas</strong> (carrera y contrarreloj). Esta acción no se puede deshacer.</p>
      </div>

      {/* Import section */}
      <div className="edition-mode__section">
        <button 
          className="edition-mode__import-toggle"
          onClick={() => setShowImport(!showImport)}
        >
          <Upload size={18} />
          {showImport ? 'Cerrar importación' : 'Importar pack (JSON)'}
        </button>

        {showImport && (
          <div className="edition-mode__import">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='Pega aquí el JSON del pack...'
              rows={8}
            />
            {importError && <div className="edition-mode__error">{importError}</div>}
            {importSuccess && <div className="edition-mode__success">{importSuccess}</div>}
            <button 
              onClick={handleImport} 
              disabled={!importText.trim()}
              className="edition-mode__import-btn"
            >
              <Download size={16} />
              Importar Pack
            </button>
          </div>
        )}
      </div>

      {/* Editions list */}
      <div className="edition-mode__list">
        <h2>Packs disponibles</h2>
        
        {loading ? (
          <div className="edition-mode__loading">Cargando packs...</div>
        ) : editions.length === 0 ? (
          <div className="edition-mode__empty">
            <FileText size={40} />
            <p>No hay packs disponibles</p>
            <p className="edition-mode__empty-hint">Importa un pack JSON o espera a que la comunidad suba packs</p>
          </div>
        ) : (
          editions.map(edition => (
            <div 
              key={edition.id} 
              className={`edition-mode__card ${activeEdition === edition.id ? 'edition-mode__card--active' : ''}`}
            >
              <div className="edition-mode__card-info">
                <h3>{edition.name}</h3>
                {edition.description && <p>{edition.description}</p>}
                <div className="edition-mode__card-meta">
                  <span>👤 {edition.author || 'Anónimo'}</span>
                  <span>⚽ {edition.teamCount || '?'} equipos</span>
                  <span>🏃 {edition.playerCount || '?'} jugadores</span>
                </div>
              </div>
              <div className="edition-mode__card-actions">
                {activeEdition === edition.id ? (
                  <button className="edition-mode__btn edition-mode__btn--active" disabled>
                    <Check size={16} />
                    Aplicado
                  </button>
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

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="edition-mode__overlay">
          <div className="edition-mode__dialog">
            <AlertTriangle size={40} className="edition-mode__dialog-icon" />
            <h3>¿Aplicar "{showConfirm.name}"?</h3>
            <p>Se borrarán <strong>todas las partidas guardadas</strong> (carrera y contrarreloj). Los nombres de equipos y jugadores se actualizarán con este pack.</p>
            <p className="edition-mode__dialog-warning">Esta acción no se puede deshacer.</p>
            <div className="edition-mode__dialog-buttons">
              <button onClick={() => setShowConfirm(null)} className="edition-mode__btn edition-mode__btn--cancel">
                Cancelar
              </button>
              <button onClick={confirmApply} className="edition-mode__btn edition-mode__btn--confirm">
                Aplicar y borrar partidas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
