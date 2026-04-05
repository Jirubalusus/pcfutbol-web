/**
 * CityScene.jsx — Premium scene composition with post-processing effects
 */
import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
// postprocessing removed — React 19 context conflict
// import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Building } from './buildings/Building';
import { PlayerCharacter } from './PlayerCharacter';
import { NPCSystem } from './NPCSystem';
import { CityGround } from './CityGround';
import { CityDecorations } from './CityDecorations';
import { CityLighting } from './CityLighting';
import { LEDScreen } from './LEDScreen';
import { BUILDING_CONFIGS, getCityLevel, getNPCCount, getDayNightFactor, getCityWeather } from './cityData';

function IsometricCamera({ target }) {
  const { camera, size, gl } = useThree();
  const smoothTarget = useRef(new THREE.Vector3(0, 0, 0));
  const zoomLevel = useRef(18);
  const MIN_ZOOM = 8;
  const MAX_ZOOM = 30;

  useEffect(() => {
    const aspect = size.width / size.height;
    const d = zoomLevel.current;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.near = 0.1;
    camera.far = 300;
    camera.position.set(40, 40, 40);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    const onWheel = (e) => {
      e.preventDefault();
      zoomLevel.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel.current + e.deltaY * 0.01));
    };
    gl.domElement.addEventListener('wheel', onWheel, { passive: false });
    return () => gl.domElement.removeEventListener('wheel', onWheel);
  }, [camera, size, gl]);

  useFrame(() => {
    if (!target.current) return;
    const pos = target.current;
    smoothTarget.current.lerp(new THREE.Vector3(pos.x, 0, pos.z), 0.08);

    const d = zoomLevel.current;
    const aspect = size.width / size.height;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;

    camera.position.set(
      smoothTarget.current.x + 40,
      40,
      smoothTarget.current.z + 40
    );
    camera.lookAt(smoothTarget.current.x, 0, smoothTarget.current.z);
    camera.updateProjectionMatrix();
  });

  return null;
}

// PostProcessing disabled — React 19 compat issue
function PostProcessingEffects() { return null; }

export function CityScene({
  cityLevel, teamColors, state, notifications,
  movementRef, playerPos, setPlayerPos, onBuildingEnter,
}) {
  const playerPosRef = useRef({ x: playerPos.x, y: 0, z: playerPos.z });
  const [nearBuilding, setNearBuilding] = useState(null);

  useEffect(() => {
    playerPosRef.current.x = playerPos.x;
    playerPosRef.current.z = playerPos.z;
  }, [playerPos.x, playerPos.z]);

  const dayNight = getDayNightFactor();
  const weather = getCityWeather(state.team?.name || '');

  const leaguePos = useMemo(() => {
    return state.leagueTable?.findIndex(t => t.teamId === state.teamId) + 1 || 10;
  }, [state.leagueTable, state.teamId]);

  const npcCount = getNPCCount(cityLevel, leaguePos);

  const visibleBuildings = useMemo(() => {
    return Object.entries(BUILDING_CONFIGS)
      .filter(([, cfg]) => cfg.minLevel <= cityLevel)
      .map(([id, cfg]) => ({ id, ...cfg }));
  }, [cityLevel]);

  useFrame(() => {
    const px = playerPosRef.current.x;
    const pz = playerPosRef.current.z;
    let closest = null;
    let closestDist = Infinity;

    for (const b of visibleBuildings) {
      const dx = px - b.position[0];
      const dz = pz - b.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      const threshold = Math.max(b.size[0], b.size[2]) + 2.5;
      if (dist < threshold && dist < closestDist) {
        closest = b.id;
        closestDist = dist;
      }
    }

    if (closest !== nearBuilding) {
      setNearBuilding(closest);
    }
  });

  const visualData = useMemo(() => ({
    teamFitness: state.team?.players?.reduce((a, p) => a + (p.fitness || 80), 0) / Math.max(state.team?.players?.length || 1, 1),
    hasInjured: state.team?.players?.some(p => p.injured),
    hasPendingOffers: (state.transferOffers?.length || 0) > 0,
    attendance: state.stadium?.seasonTickets || 2400,
    stadiumLevel: state.stadium?.level || 0,
    isUpgrading: false,
    recentWin: state.results?.length > 0 && state.results[state.results.length - 1]?.result === 'win',
    merchandising: state.stadium?.services?.merchandise || 0,
    teamMood: state.team?.players?.reduce((a, p) => a + (p.morale || 70), 0) / Math.max(state.team?.players?.length || 1, 1),
  }), [state.team, state.transferOffers, state.stadium, state.results]);

  // Enable shadows on renderer
  const { gl } = useThree();
  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.1;
  }, [gl]);

  return (
    <>
      <CityLighting dayNight={dayNight} weather={weather} />

      <IsometricCamera target={playerPosRef} />

      <CityGround cityLevel={cityLevel} teamColors={teamColors} weather={weather} />

      {/* Buildings */}
      {visibleBuildings.map(b => (
        <Building
          key={b.id}
          id={b.id}
          position={b.position}
          size={b.size}
          color={b.color}
          cityLevel={cityLevel}
          teamColors={teamColors}
          notification={notifications[b.id]}
          nearPlayer={nearBuilding === b.id}
          visualData={visualData}
          onEnter={() => onBuildingEnter(b.id)}
        />
      ))}

      {/* LED Screens */}
      {cityLevel >= 3 && (
        <>
          <LEDScreen
            position={[6, 4, -8]}
            leagueTable={state.leagueTable}
            teamId={state.teamId}
            nextMatch={state.fixtures?.[state.currentWeek - 1]}
          />
          <LEDScreen
            position={[-6, 4, 10]}
            leagueTable={state.leagueTable}
            teamId={state.teamId}
            nextMatch={state.fixtures?.[state.currentWeek - 1]}
          />
        </>
      )}

      {/* Player */}
      <PlayerCharacter
        posRef={playerPosRef}
        movementRef={movementRef}
        teamColors={teamColors}
        setPlayerPos={setPlayerPos}
        nearBuilding={nearBuilding}
        onEnterBuilding={onBuildingEnter}
      />

      {/* NPCs */}
      <NPCSystem
        count={npcCount}
        cityLevel={cityLevel}
        teamColors={teamColors}
        recentWin={visualData.recentWin}
      />

      {/* Decorations */}
      <CityDecorations
        cityLevel={cityLevel}
        teamColors={teamColors}
        unlockables={[]}
        weather={weather}
        recentWin={visualData.recentWin}
      />

      {/* Notification bubble */}
      {nearBuilding && notifications[nearBuilding] && (
        <sprite position={[
          BUILDING_CONFIGS[nearBuilding].position[0],
          BUILDING_CONFIGS[nearBuilding].size[1] + 2.5,
          BUILDING_CONFIGS[nearBuilding].position[2]
        ]} scale={[2, 1, 1]}>
          <spriteMaterial color="#FF5722" opacity={0.9} transparent />
        </sprite>
      )}

      {/* Post-processing */}
      <Suspense fallback={null}>
        <PostProcessingEffects dayNight={dayNight} />
      </Suspense>
    </>
  );
}
