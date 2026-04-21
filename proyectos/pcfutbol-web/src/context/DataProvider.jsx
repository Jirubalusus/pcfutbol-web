// ============================================================
// PC GAFFER - DATA PROVIDER
// Carga datos de Firestore antes de renderizar la app
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import LoadingIndicator from '../components/common/LoadingIndicator';

const DataContext = createContext();

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval;

    async function init() {
      try {
        const teamsModule = await import('../data/teamsFirestore');

        if (teamsModule.isDataLoaded()) {
          setProgress(100);
          setLoading(false);
          return;
        }

        setProgress(20);
        // Animate progress while loading
        interval = setInterval(() => {
          setProgress(p => p < 85 ? p + Math.random() * 8 : p);
        }, 200);

        const success = await teamsModule.loadAllData();
        setProgress(100);

        if (!success) {
          setError('Error cargando datos del juego');
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      } finally {
        if (interval) clearInterval(interval);
      }
    }

    init();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="pcf-loading-screen">
        {/* Ambient glow orbs */}
        <div className="loading-orb loading-orb--1"></div>
        <div className="loading-orb loading-orb--2"></div>
        
        <div className="loading-content">
          <div className="loading-mark"><LoadingIndicator size="xl" /></div>

          <h1 className="loading-title">PC GAFFER</h1>
          <p className="loading-subtitle">FOOTBALL MANAGER</p>

          <div className="loading-bar-wrapper">
            <div className="loading-bar">
              <div className="loading-progress" style={{ width: `${progress}%` }} />
            </div>
            <span className="loading-percent">{Math.round(progress)}%</span>
          </div>

          <p className="loading-text">Cargando datos de equipos</p>
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

          .loading-mark {
            margin-bottom: 28px;
            display: flex;
            justify-content: center;
          }

          .loading-title {
            font-size: 34px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 7px;
            color: rgba(255,255,255,0.92);
          }

          .loading-subtitle {
            font-size: 10px;
            letter-spacing: 8px;
            color: rgba(255,255,255,0.38);
            margin: 8px 0 0;
            font-weight: 500;
            text-transform: uppercase;
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
            background: rgba(255,255,255,0.78);
            border-radius: 4px;
            transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .loading-percent {
            font-size: 11px;
            color: rgba(255,255,255,0.42);
            font-variant-numeric: tabular-nums;
            min-width: 28px;
            text-align: right;
            letter-spacing: 0.04em;
          }

          .loading-text {
            margin-top: 22px;
            color: rgba(255,255,255,0.42);
            font-size: 11px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            font-weight: 600;
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
