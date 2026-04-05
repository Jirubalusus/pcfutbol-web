/**
 * CityLighting.jsx — Premium lighting: warm ambient, directional shadows,
 * sky gradient sphere, clouds, weather effects, atmospheric fog
 */
import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ─── SKY DOME ─── */
function SkyDome({ dayNight }) {
  const colors = useMemo(() => {
    if (dayNight > 0.8) return { top: '#4FC3F7', bottom: '#B3E5FC', horizon: '#E1F5FE' };
    if (dayNight > 0.5) return { top: '#FF7043', bottom: '#FFB74D', horizon: '#FFE0B2' };
    return { top: '#1A237E', bottom: '#283593', horizon: '#3949AB' };
  }, [dayNight]);

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[120, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshBasicMaterial color={colors.top} side={THREE.BackSide} />
    </mesh>
  );
}

/* ─── CLOUDS ─── */
function Clouds({ dayNight }) {
  const cloudsRef = useRef();
  const cloudData = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      x: (Math.random() - 0.5) * 80,
      y: 25 + Math.random() * 15,
      z: (Math.random() - 0.5) * 80,
      scaleX: 4 + Math.random() * 6,
      scaleZ: 2 + Math.random() * 3,
      speed: 0.2 + Math.random() * 0.5,
      opacity: 0.3 + Math.random() * 0.3,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!cloudsRef.current) return;
    const t = clock.getElapsedTime();
    cloudsRef.current.children.forEach((cloud, i) => {
      cloud.position.x = cloudData[i].x + t * cloudData[i].speed;
      if (cloud.position.x > 50) cloud.position.x = -50;
    });
  });

  const cloudColor = dayNight > 0.5 ? '#FFFFFF' : '#7986CB';

  return (
    <group ref={cloudsRef}>
      {cloudData.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]}>
          <mesh>
            <planeGeometry args={[c.scaleX, c.scaleZ]} />
            <meshBasicMaterial
              color={cloudColor}
              transparent
              opacity={c.opacity * (dayNight > 0.8 ? 1 : 0.6)}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Secondary cloud puff */}
          <mesh position={[c.scaleX * 0.3, 0.5, 0.3]}>
            <planeGeometry args={[c.scaleX * 0.6, c.scaleZ * 0.7]} />
            <meshBasicMaterial
              color={cloudColor}
              transparent
              opacity={c.opacity * 0.6}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─── RAIN EFFECT ─── */
function RainEffect() {
  const ref = useRef();
  const count = 600;

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
      pos[i * 3 + 1] -= 0.6;
      pos[i * 3] -= 0.05; // Wind drift
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
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={0x6699CC} size={0.08} transparent opacity={0.5} />
    </points>
  );
}

/* ─── SNOW EFFECT ─── */
function SnowEffect() {
  const ref = useRef();
  const count = 350;

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
      pos[i * 3 + 1] -= 0.06;
      pos[i * 3] += Math.sin(t + i) * 0.015;
      pos[i * 3 + 2] += Math.cos(t * 0.7 + i) * 0.01;
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
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={0xFFFFFF} size={0.15} transparent opacity={0.8} />
    </points>
  );
}

/* ─── MAIN LIGHTING ─── */
export function CityLighting({ dayNight, weather }) {
  const dirLightRef = useRef();

  const colors = useMemo(() => {
    if (dayNight > 0.8) {
      return {
        ambient: new THREE.Color(0xFFF5E6),
        ambientIntensity: 0.55,
        hemisphere: { sky: 0x87CEEB, ground: 0x558B2F },
        hemisphereIntensity: 0.45,
        dir: new THREE.Color(0xFFF0C0),
        dirIntensity: 1.4,
        sky: new THREE.Color(0x87CEEB),
        fog: new THREE.Color(0xE8EEF4),
        fogDensity: 0.004,
      };
    }
    if (dayNight > 0.5) {
      return {
        ambient: new THREE.Color(0xFFCC80),
        ambientIntensity: 0.4,
        hemisphere: { sky: 0xFF7043, ground: 0x5D4037 },
        hemisphereIntensity: 0.35,
        dir: new THREE.Color(0xFF8C00),
        dirIntensity: 1.0,
        sky: new THREE.Color(0xE87040),
        fog: new THREE.Color(0xD4A574),
        fogDensity: 0.005,
      };
    }
    return {
      ambient: new THREE.Color(0x3949AB),
      ambientIntensity: 0.35,
      hemisphere: { sky: 0x1A237E, ground: 0x1B5E20 },
      hemisphereIntensity: 0.2,
      dir: new THREE.Color(0x7986CB),
      dirIntensity: 0.4,
      sky: new THREE.Color(0x1A2744),
      fog: new THREE.Color(0x1A2744),
      fogDensity: 0.008,
    };
  }, [dayNight]);

  const { scene } = useThree();

  React.useEffect(() => {
    scene.background = colors.sky.clone();
    scene.fog = new THREE.FogExp2(colors.fog, colors.fogDensity);
  }, []);

  useFrame(() => {
    if (scene.background) scene.background.lerp(colors.sky, 0.03);
    if (scene.fog) {
      scene.fog.color.lerp(colors.fog, 0.03);
      scene.fog.density += (colors.fogDensity - scene.fog.density) * 0.03;
    }
  });

  return (
    <>
      {/* Sky dome */}
      <SkyDome dayNight={dayNight} />

      {/* Clouds */}
      <Clouds dayNight={dayNight} />

      {/* Ambient light (warm fill) */}
      <ambientLight color={colors.ambient} intensity={colors.ambientIntensity} />

      {/* Hemisphere light (sky/ground gradient) */}
      <hemisphereLight
        color={colors.hemisphere.sky}
        groundColor={colors.hemisphere.ground}
        intensity={colors.hemisphereIntensity}
      />

      {/* Main directional light (sun) */}
      <directionalLight
        ref={dirLightRef}
        color={colors.dir}
        intensity={colors.dirIntensity}
        position={[30, 40, 20]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={150}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      {/* Secondary fill light (softer, opposite direction) */}
      <directionalLight
        color={dayNight > 0.5 ? 0xB3E5FC : 0x3949AB}
        intensity={0.15}
        position={[-20, 10, -15]}
      />

      {/* Night building lights */}
      {dayNight < 0.5 && (
        <>
          <pointLight position={[0, 4, -10]} color={0xFFE082} intensity={3} distance={18} decay={2} />
          <pointLight position={[12, 3, -2]} color={0x90CAF9} intensity={2} distance={14} decay={2} />
          <pointLight position={[-12, 3, -2]} color={0xA5D6A7} intensity={2} distance={14} decay={2} />
          <pointLight position={[0, 3, 8]} color={0xFFCC80} intensity={2} distance={14} decay={2} />
          <pointLight position={[8, 3, 8]} color={0xFFE082} intensity={1.5} distance={12} decay={2} />
          <pointLight position={[-8, 3, -8]} color={0xCE93D8} intensity={1.5} distance={12} decay={2} />
        </>
      )}

      {/* Weather effects */}
      {weather === 'rain' && <RainEffect />}
      {weather === 'snow' && <SnowEffect />}

      {/* Ground-contact darkening (fake AO) - dark ring around buildings base area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0, 30, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.03} />
      </mesh>
    </>
  );
}
