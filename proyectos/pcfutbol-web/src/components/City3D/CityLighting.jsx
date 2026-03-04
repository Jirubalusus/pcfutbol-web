/**
 * CityLighting.jsx — Day/night cycle lighting, weather effects
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function CityLighting({ dayNight, weather }) {
  const dirLightRef = useRef();
  const ambientRef = useRef();

  // Colors based on time of day
  const colors = useMemo(() => {
    if (dayNight > 0.8) {
      // Day
      return {
        ambient: new THREE.Color(0xFFEDD5),
        ambientIntensity: 0.5,
        dir: new THREE.Color(0xFFF0C0),
        dirIntensity: 1.2,
        sky: new THREE.Color(0x87CEEB),
        fog: new THREE.Color(0xE8EEF4),
      };
    }
    if (dayNight > 0.5) {
      // Dawn/dusk
      return {
        ambient: new THREE.Color(0xFFCC80),
        ambientIntensity: 0.4,
        dir: new THREE.Color(0xFF8C00),
        dirIntensity: 0.9,
        sky: new THREE.Color(0xE87040),
        fog: new THREE.Color(0xD4A574),
      };
    }
    // Night
    return {
      ambient: new THREE.Color(0x1A237E),
      ambientIntensity: 0.25,
      dir: new THREE.Color(0x5C6BC0),
      dirIntensity: 0.3,
      sky: new THREE.Color(0x0D1B2A),
      fog: new THREE.Color(0x1A1A2E),
    };
  }, [dayNight]);

  useFrame(({ scene }) => {
    if (scene.background && scene.background.isColor) {
      scene.background.lerp(colors.sky, 0.02);
    } else {
      scene.background = colors.sky.clone();
    }
    if (scene.fog) {
      scene.fog.color.lerp(colors.fog, 0.02);
    } else {
      scene.fog = new THREE.FogExp2(colors.fog, 0.008);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} color={colors.ambient} intensity={colors.ambientIntensity} />
      <hemisphereLight
        color={colors.sky}
        groundColor={0x8BC34A}
        intensity={0.4 * dayNight}
      />
      <directionalLight
        ref={dirLightRef}
        color={colors.dir}
        intensity={colors.dirIntensity}
        position={[25, 35, 15]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.001}
      />
      {/* Night point lights for buildings */}
      {dayNight < 0.5 && (
        <>
          <pointLight position={[0, 3, -10]} color={0xFFE082} intensity={2} distance={15} />
          <pointLight position={[12, 3, -2]} color={0x90CAF9} intensity={1.5} distance={12} />
          <pointLight position={[-12, 3, -2]} color={0xA5D6A7} intensity={1.5} distance={12} />
          <pointLight position={[0, 3, 8]} color={0xFFCC80} intensity={1.5} distance={12} />
        </>
      )}
      {/* Weather: rain particles */}
      {weather === 'rain' && <RainEffect />}
      {weather === 'snow' && <SnowEffect />}
    </>
  );
}

function RainEffect() {
  const ref = useRef();
  const count = 500;
  
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = Math.random() * 30;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= 0.5;
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 30;
        pos[i * 3] = (Math.random() - 0.5) * 60;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color={0x6699CC} size={0.1} transparent opacity={0.6} />
    </points>
  );
}

function SnowEffect() {
  const ref = useRef();
  const count = 300;
  
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = Math.random() * 25;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= 0.08;
      pos[i * 3] += Math.sin(t + i) * 0.02;
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 25;
        pos[i * 3] = (Math.random() - 0.5) * 60;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color={0xFFFFFF} size={0.2} transparent opacity={0.8} />
    </points>
  );
}
