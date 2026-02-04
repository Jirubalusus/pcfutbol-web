// ============================================================
// PC GAFFER - DATA PROVIDER
// Carga datos de Firestore antes de renderizar la app
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadAllData, isDataLoaded } from '../data/teamsFirestore';

const DataContext = createContext();

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
  const [loading, setLoading] = useState(!isDataLoaded());
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isDataLoaded()) {
      setLoading(false);
      return;
    }

    async function init() {
      try {
        setProgress(10);
        const success = await loadAllData();
        setProgress(100);
        
        if (!success) {
          setError('Error cargando datos del juego');
        }
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    init();
  }, []);

  if (loading) {
    return (
      <div className="pcf-loading-screen">
        <div className="loading-content">
          <div className="loading-logo">⚽</div>
          <h1>PC GAFFER</h1>
          <p>WEB EDITION</p>
          <div className="loading-bar">
            <div className="loading-progress" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="loading-text">Cargando datos de equipos...</p>
        </div>
        <style>{`
          .pcf-loading-screen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .loading-content {
            text-align: center;
          }
          .loading-logo {
            font-size: 64px;
            margin-bottom: 16px;
            animation: bounce 1s ease infinite;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .loading-content h1 {
            font-size: 36px;
            margin: 0;
            background: linear-gradient(90deg, #00d4ff, #00ff88);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .loading-content > p {
            color: #00d4ff;
            letter-spacing: 4px;
            font-size: 14px;
            margin: 8px 0 32px;
          }
          .loading-bar {
            width: 300px;
            height: 4px;
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
            overflow: hidden;
            margin: 0 auto;
          }
          .loading-progress {
            height: 100%;
            background: linear-gradient(90deg, #00d4ff, #00ff88);
            transition: width 0.3s ease;
          }
          .loading-text {
            margin-top: 16px;
            color: rgba(255,255,255,0.6);
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pcf-error-screen">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h1>Error de conexión</h1>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
        <style>{`
          .pcf-error-screen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #1a0a0a 0%, #2a1414 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .error-content {
            text-align: center;
          }
          .error-icon {
            font-size: 64px;
            margin-bottom: 16px;
          }
          .error-content h1 {
            color: #ff4444;
          }
          .error-content button {
            margin-top: 20px;
            padding: 12px 24px;
            background: #ff4444;
            border: none;
            color: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
          }
          .error-content button:hover {
            background: #ff6666;
          }
        `}</style>
      </div>
    );
  }

  return (
    <DataContext.Provider value={{ loaded: true }}>
      {children}
    </DataContext.Provider>
  );
}

export default DataProvider;
