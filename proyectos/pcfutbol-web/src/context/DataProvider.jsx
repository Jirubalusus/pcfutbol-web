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
        setProgress(20);
        // Animate progress while loading
        const interval = setInterval(() => {
          setProgress(p => p < 85 ? p + Math.random() * 8 : p);
        }, 200);
        const success = await loadAllData();
        clearInterval(interval);
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
        {/* Ambient glow orbs */}
        <div className="loading-orb loading-orb--1"></div>
        <div className="loading-orb loading-orb--2"></div>
        
        <div className="loading-content">
          <div className="loading-icon">⚽</div>

          <h1 className="loading-title">PC GAFFER</h1>
          <p className="loading-subtitle">FOOTBALL MANAGER</p>
          
          <div className="loading-bar-wrapper">
            <div className="loading-bar">
              <div className="loading-progress" style={{ width: `${progress}%` }}>
                <div className="loading-shimmer"></div>
              </div>
            </div>
            <span className="loading-percent">{progress}%</span>
          </div>
          
          <p className="loading-text">Cargando datos de equipos...</p>
        </div>

        <p className="loading-version">v1.16</p>

        <style>{`
          .pcf-loading-screen {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: #080e1a;
            background-image: 
              radial-gradient(ellipse at 30% 20%, rgba(0,212,255,0.08) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 80%, rgba(0,255,136,0.06) 0%, transparent 60%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
            overflow: hidden;
          }

          .loading-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.3;
            animation: orbFloat 6s ease-in-out infinite;
          }
          .loading-orb--1 {
            width: 300px; height: 300px;
            background: radial-gradient(circle, rgba(0,212,255,0.4), transparent 70%);
            top: -80px; left: -60px;
            animation-delay: 0s;
          }
          .loading-orb--2 {
            width: 250px; height: 250px;
            background: radial-gradient(circle, rgba(0,255,136,0.3), transparent 70%);
            bottom: -60px; right: -40px;
            animation-delay: -3s;
          }
          @keyframes orbFloat {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(20px, -20px) scale(1.1); }
          }

          .loading-content {
            text-align: center;
            position: relative;
            z-index: 1;
            animation: fadeIn 0.8s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .loading-icon {
            font-size: 64px;
            margin-bottom: 24px;
            animation: iconPulse 2.5s ease-in-out infinite;
          }
          @keyframes iconPulse {
            0%, 100% { transform: scale(1) translateY(0); }
            50% { transform: scale(1.05) translateY(-6px); }
          }

          .loading-title {
            font-size: 40px;
            font-weight: 800;
            margin: 0;
            letter-spacing: 6px;
            background: linear-gradient(135deg, #ffffff 0%, #00d4ff 50%, #00ff88 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .loading-subtitle {
            font-size: 11px;
            letter-spacing: 8px;
            color: rgba(0,212,255,0.5);
            margin: 6px 0 0;
            font-weight: 500;
          }

          .loading-bar-wrapper {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 36px auto 0;
            width: 280px;
          }
          .loading-bar {
            flex: 1;
            height: 3px;
            background: rgba(255,255,255,0.08);
            border-radius: 4px;
            overflow: hidden;
          }
          .loading-progress {
            height: 100%;
            background: linear-gradient(90deg, #00d4ff, #00ff88);
            border-radius: 4px;
            transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }
          .loading-shimmer {
            position: absolute;
            top: 0; left: -100%; right: 0; bottom: 0;
            width: 200%;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
            animation: shimmer 1.8s ease-in-out infinite;
          }
          @keyframes shimmer {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(50%); }
          }
          .loading-percent {
            font-size: 11px;
            color: rgba(255,255,255,0.3);
            font-variant-numeric: tabular-nums;
            min-width: 28px;
            text-align: right;
          }

          .loading-text {
            margin-top: 20px;
            color: rgba(255,255,255,0.35);
            font-size: 13px;
            letter-spacing: 0.5px;
          }

          .loading-version {
            position: absolute;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255,255,255,0.15);
            font-size: 11px;
            margin: 0;
            letter-spacing: 1px;
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
