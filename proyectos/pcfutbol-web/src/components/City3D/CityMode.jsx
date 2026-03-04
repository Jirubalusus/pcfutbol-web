/**
 * CityMode.jsx — Main 3D isometric city component
 * Replaces MainMenu when "Modo 3D" is enabled
 */
import React, { useRef, useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../../context/GameContext';
import { useTranslation } from 'react-i18next';
import { CityScene } from './CityScene';
import { CityHUD } from './CityHUD';
import { Minimap } from './Minimap';
import { TouchJoystick } from './TouchJoystick';
import { getCityLevel, BUILDING_CONFIGS } from './cityData';
import './CityMode.scss';

export default function CityMode({ onExitCity }) {
  const { state, dispatch } = useGame();
  const { t } = useTranslation();
  const [activeBuilding, setActiveBuilding] = useState(null);
  const [showTeleport, setShowTeleport] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 0 });
  const movementRef = useRef({ x: 0, z: 0 });

  const cityLevel = useMemo(() => getCityLevel(state), [
    state.leagueTier, state.currentSeason, state.money,
    state.trophies?.length, state.facilities
  ]);

  const teamColors = useMemo(() => {
    const c = state.team?.colors || { primary: '#1a5276', secondary: '#FFFFFF' };
    return {
      primary: new THREE.Color(c.primary || '#1a5276'),
      secondary: new THREE.Color(c.secondary || '#FFFFFF')
    };
  }, [state.team?.colors]);

  // Building notifications
  const notifications = useMemo(() => {
    const n = {};
    const offers = state.transferOffers?.length || 0;
    if (offers > 0) n.transferOffice = offers;
    const injured = state.team?.players?.filter(p => p.injured)?.length || 0;
    if (injured > 0) n.medicalCenter = injured;
    if (state.pendingMatch || state.pendingCupMatch || state.pendingEuropeanMatch) n.stadium = 1;
    const msgs = state.messages?.filter(m => !m.read)?.length || 0;
    if (msgs > 0) n.newspaperKiosk = msgs;
    return n;
  }, [state.transferOffers, state.team?.players, state.pendingMatch, state.pendingCupMatch, state.pendingEuropeanMatch, state.messages]);

  const handleBuildingEnter = useCallback((buildingId) => {
    setActiveBuilding(buildingId);
    const screenMap = {
      stadium: 'office',
      transferOffice: 'office',
      trainingCenter: 'office',
      museum: 'office',
      townHall: 'office',
      newspaperKiosk: 'office',
      bank: 'office',
      medicalCenter: 'office',
      airport: 'office',
    };
    // Navigate to office with tab context
    const tabMap = {
      stadium: 'stadium',
      transferOffice: 'transfers',
      trainingCenter: 'squad',
      museum: 'trophies',
      townHall: 'settings',
      newspaperKiosk: 'messages',
      bank: 'finances',
      medicalCenter: 'squad',
      airport: 'scouting',
    };
    dispatch({ type: 'SET_SCREEN', payload: 'office' });
    if (tabMap[buildingId]) {
      dispatch({ type: 'SET_OFFICE_TAB', payload: tabMap[buildingId] });
    }
  }, [dispatch]);

  const handleTeleport = useCallback((buildingId) => {
    const config = BUILDING_CONFIGS[buildingId];
    if (config) {
      setPlayerPos({ x: config.position[0], z: config.position[2] + 3 });
      setShowTeleport(false);
    }
  }, []);

  return (
    <div className="city-mode">
      <Canvas
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        dpr={[1, 1.5]}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <CityScene
            cityLevel={cityLevel}
            teamColors={teamColors}
            state={state}
            notifications={notifications}
            movementRef={movementRef}
            playerPos={playerPos}
            setPlayerPos={setPlayerPos}
            onBuildingEnter={handleBuildingEnter}
          />
        </Suspense>
      </Canvas>

      <CityHUD
        teamName={state.team?.name || 'My Club'}
        money={state.money}
        week={state.currentWeek}
        season={state.currentSeason}
        leaguePosition={state.leagueTable?.findIndex(t => t.teamId === state.teamId) + 1 || '-'}
        onBack={onExitCity}
        onTeleport={() => setShowTeleport(!showTeleport)}
        activeBuilding={activeBuilding}
        notifications={notifications}
      />

      <Minimap
        playerPos={playerPos}
        buildings={BUILDING_CONFIGS}
        cityLevel={cityLevel}
        notifications={notifications}
        onTeleport={handleTeleport}
      />

      <TouchJoystick movementRef={movementRef} />

      {showTeleport && (
        <div className="teleport-menu">
          <div className="teleport-menu__title">{t('city.teleport', 'Teletransporte')}</div>
          <div className="teleport-menu__grid">
            {Object.entries(BUILDING_CONFIGS)
              .filter(([, cfg]) => cfg.minLevel <= cityLevel)
              .map(([id, cfg]) => (
                <button
                  key={id}
                  className="teleport-menu__item"
                  onClick={() => handleTeleport(id)}
                >
                  <span className="teleport-menu__icon">{cfg.icon}</span>
                  <span className="teleport-menu__label">{t(cfg.labelKey, cfg.label)}</span>
                  {notifications[id] && (
                    <span className="teleport-menu__badge">{notifications[id]}</span>
                  )}
                </button>
              ))}
          </div>
          <button className="teleport-menu__close" onClick={() => setShowTeleport(false)}>✕</button>
        </div>
      )}
    </div>
  );
}
