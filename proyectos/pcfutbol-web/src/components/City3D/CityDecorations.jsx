/**
 * CityDecorations.jsx — Premium decorations: detailed trees, benches, lampposts,
 * trash cans, fire hydrants, mailboxes, flower pots, bus stops, pigeons, cats, birds
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ─── DETAILED TREE ─── */
function Tree({ position, scale = 1, variant = 0 }) {
  const colors = [
    ['#2E7D32', '#388E3C', '#43A047', '#66BB6A'],
    ['#1B5E20', '#2E7D32', '#388E3C', '#4CAF50'],
    ['#33691E', '#558B2F', '#689F38', '#7CB342'],
  ];
  const palette = colors[variant % colors.length];

  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 1, 6]} />
        <meshToonMaterial color="#4E342E" />
      </mesh>
      {/* Trunk texture rings */}
      <mesh position={[0, 0.3, 0.08]}>
        <sphereGeometry args={[0.03, 4, 4]} />
        <meshToonMaterial color="#3E2723" />
      </mesh>
      {/* Main branches (visible) */}
      <mesh position={[-0.15, 0.9, 0]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.025, 0.035, 0.5, 4]} />
        <meshToonMaterial color="#5D4037" />
      </mesh>
      <mesh position={[0.12, 0.85, 0.1]} rotation={[0.3, 0, -0.4]}>
        <cylinderGeometry args={[0.02, 0.03, 0.45, 4]} />
        <meshToonMaterial color="#5D4037" />
      </mesh>
      <mesh position={[0, 0.9, -0.12]} rotation={[-0.4, 0, 0.2]}>
        <cylinderGeometry args={[0.02, 0.03, 0.4, 4]} />
        <meshToonMaterial color="#5D4037" />
      </mesh>
      {/* Foliage clusters (3-4 overlapping spheres) */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.55, 8, 7]} />
        <meshToonMaterial color={palette[0]} />
      </mesh>
      <mesh position={[0.25, 1.35, 0.15]} castShadow>
        <sphereGeometry args={[0.4, 7, 6]} />
        <meshToonMaterial color={palette[1]} />
      </mesh>
      <mesh position={[-0.2, 1.3, -0.15]} castShadow>
        <sphereGeometry args={[0.42, 7, 6]} />
        <meshToonMaterial color={palette[2]} />
      </mesh>
      <mesh position={[0.05, 1.7, 0.1]} castShadow>
        <sphereGeometry args={[0.35, 7, 6]} />
        <meshToonMaterial color={palette[3]} />
      </mesh>
      {/* Shadow on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.6, 12]} />
        <meshBasicMaterial color="#000000" opacity={0.12} transparent />
      </mesh>
    </group>
  );
}

/* ─── LAMPPOST ─── */
function LampPost({ position, isNight }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.16, 8]} />
        <meshToonMaterial color="#37474F" />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.06, 3.2, 6]} />
        <meshToonMaterial color="#455A64" />
      </mesh>
      {/* Decorative ring */}
      <mesh position={[0, 2.5, 0]}>
        <torusGeometry args={[0.06, 0.015, 6, 8]} />
        <meshToonMaterial color="#546E7A" />
      </mesh>
      {/* Curved arm */}
      <mesh position={[0.15, 3.0, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.025, 0.03, 0.5, 4]} />
        <meshToonMaterial color="#455A64" />
      </mesh>
      {/* Lantern housing */}
      <group position={[0.25, 3.15, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.25, 0.2]} />
          <meshToonMaterial color="#37474F" />
        </mesh>
        {/* Glass panels */}
        {[[0, 0, 0.11], [0, 0, -0.11], [0.11, 0, 0], [-0.11, 0, 0]].map((p, i) => (
          <mesh key={i} position={p}>
            <planeGeometry args={[0.15, 0.2]} />
            <meshBasicMaterial color={isNight ? '#FFF9C4' : '#CFD8DC'} transparent opacity={isNight ? 0.9 : 0.4} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {/* Top cap */}
        <mesh position={[0, 0.16, 0]}>
          <coneGeometry args={[0.14, 0.1, 4]} />
          <meshToonMaterial color="#37474F" />
        </mesh>
      </group>
      {isNight && (
        <>
          <pointLight position={[0.25, 3, 0]} color="#FFF176" intensity={4} distance={10} decay={2} />
          {/* Light cone (visible beam) */}
          <mesh position={[0.25, 2.0, 0]}>
            <coneGeometry args={[1.5, 2.5, 8, 1, true]} />
            <meshBasicMaterial color="#FFF9C4" transparent opacity={0.04} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  );
}

/* ─── BENCH ─── */
function Bench({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat (3 slats) */}
      {[-0.08, 0, 0.08].map((z, i) => (
        <mesh key={i} position={[0, 0.3, z]} castShadow>
          <boxGeometry args={[0.9, 0.03, 0.06]} />
          <meshToonMaterial color="#6D4C41" />
        </mesh>
      ))}
      {/* Back rest (2 slats) */}
      {[0.35, 0.45].map((y, i) => (
        <mesh key={`b${i}`} position={[0, y, -0.14]} castShadow>
          <boxGeometry args={[0.9, 0.03, 0.06]} />
          <meshToonMaterial color="#6D4C41" />
        </mesh>
      ))}
      {/* Iron legs */}
      {[-0.35, 0.35].map((x, i) => (
        <group key={i}>
          {/* Front leg */}
          <mesh position={[x, 0.15, 0.08]}>
            <boxGeometry args={[0.04, 0.3, 0.04]} />
            <meshToonMaterial color="#37474F" />
          </mesh>
          {/* Back leg (taller for backrest) */}
          <mesh position={[x, 0.25, -0.14]}>
            <boxGeometry args={[0.04, 0.5, 0.04]} />
            <meshToonMaterial color="#37474F" />
          </mesh>
          {/* Armrest */}
          <mesh position={[x, 0.35, -0.03]}>
            <boxGeometry args={[0.06, 0.04, 0.22]} />
            <meshToonMaterial color="#37474F" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─── FLAG ─── */
function Flag({ position, color, waving = true }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current && waving) {
      ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 2 + position[0]) * 0.25;
      ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 3 + position[2]) * 0.05;
    }
  });

  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 3.6, 6]} />
        <meshToonMaterial color="#78909C" />
      </mesh>
      {/* Pole ball top */}
      <mesh position={[0, 3.6, 0]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshToonMaterial color="#FFD700" />
      </mesh>
      {/* Flag cloth */}
      <mesh ref={ref} position={[0.4, 3.2, 0]}>
        <planeGeometry args={[0.8, 0.5]} />
        <meshToonMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ─── STATUE ─── */
function Statue({ position }) {
  return (
    <group position={position}>
      {/* Pedestal base */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[1.3, 0.3, 1.3]} />
        <meshToonMaterial color="#757575" />
      </mesh>
      {/* Pedestal */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[1, 0.6, 1]} />
        <meshToonMaterial color="#9E9E9E" />
      </mesh>
      {/* Plaque */}
      <mesh position={[0, 0.5, 0.51]}>
        <planeGeometry args={[0.6, 0.25]} />
        <meshToonMaterial color="#FFD700" />
      </mesh>
      {/* Figure body */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.4, 0.5, 0.25]} />
        <meshToonMaterial color="#B0BEC5" />
      </mesh>
      {/* Figure legs */}
      {[-0.1, 0.1].map((x, i) => (
        <mesh key={i} position={[x, 0.8, 0]} castShadow>
          <boxGeometry args={[0.12, 0.35, 0.12]} />
          <meshToonMaterial color="#B0BEC5" />
        </mesh>
      ))}
      {/* Figure head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshToonMaterial color="#B0BEC5" />
      </mesh>
      {/* Arms raised with trophy */}
      <mesh position={[0, 1.7, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.08, 0.35, 0.08]} />
        <meshToonMaterial color="#B0BEC5" />
      </mesh>
      {/* Trophy */}
      <mesh position={[0, 1.95, 0]}>
        <cylinderGeometry args={[0.1, 0.06, 0.2, 8]} />
        <meshToonMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

/* ─── TRASH CAN ─── */
function TrashCan({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.5, 8]} />
        <meshToonMaterial color="#4CAF50" />
      </mesh>
      {/* Lid */}
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.04, 8]} />
        <meshToonMaterial color="#388E3C" />
      </mesh>
      {/* Band */}
      <mesh position={[0, 0.35, 0]}>
        <torusGeometry args={[0.12, 0.01, 4, 8]} />
        <meshToonMaterial color="#2E7D32" />
      </mesh>
    </group>
  );
}

/* ─── FIRE HYDRANT ─── */
function FireHydrant({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 8]} />
        <meshToonMaterial color="#D32F2F" />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshToonMaterial color="#C62828" />
      </mesh>
      {/* Side nozzles */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * 0.1, 0.3, 0]} rotation={[0, 0, s * Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.08, 6]} />
          <meshToonMaterial color="#B71C1C" />
        </mesh>
      ))}
    </group>
  );
}

/* ─── MAILBOX ─── */
function Mailbox({ position }) {
  return (
    <group position={position}>
      {/* Post */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1, 4]} />
        <meshToonMaterial color="#78909C" />
      </mesh>
      {/* Box */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.3, 0.25, 0.2]} />
        <meshToonMaterial color="#1565C0" />
      </mesh>
      {/* Rounded top */}
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.06, 8]} rotation={[0, 0, Math.PI / 2]} />
        <meshToonMaterial color="#0D47A1" />
      </mesh>
      {/* Slot */}
      <mesh position={[0, 0.93, 0.11]}>
        <boxGeometry args={[0.18, 0.02, 0.01]} />
        <meshToonMaterial color="#0D47A1" />
      </mesh>
    </group>
  );
}

/* ─── FLOWER POT ─── */
function FlowerPot({ position, flowerColor = '#E91E63' }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.08, 0.2, 6]} />
        <meshToonMaterial color="#795548" />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.02, 6]} />
        <meshToonMaterial color="#3E2723" />
      </mesh>
      {/* Flowers */}
      {[[-0.04, 0.35, 0.02], [0.05, 0.32, -0.03], [0, 0.38, 0.04]].map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.05, 6, 5]} />
          <meshToonMaterial color={flowerColor} />
        </mesh>
      ))}
      {/* Stems */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.15, 4]} />
        <meshToonMaterial color="#388E3C" />
      </mesh>
    </group>
  );
}

/* ─── BUS STOP ─── */
function BusStop({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Poles */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 2.4, 4]} />
          <meshToonMaterial color="#78909C" />
        </mesh>
      ))}
      {/* Roof */}
      <mesh position={[0, 2.4, -0.1]} castShadow>
        <boxGeometry args={[1.2, 0.06, 0.7]} />
        <meshToonMaterial color="#90A4AE" />
      </mesh>
      {/* Back panel */}
      <mesh position={[0, 1.2, -0.4]}>
        <boxGeometry args={[1.0, 2.0, 0.04]} />
        <meshBasicMaterial color="#B3E5FC" transparent opacity={0.3} />
      </mesh>
      {/* Bench */}
      <mesh position={[0, 0.5, -0.2]}>
        <boxGeometry args={[0.8, 0.04, 0.25]} />
        <meshToonMaterial color="#78909C" />
      </mesh>
      {/* Sign */}
      <mesh position={[0.5, 2.6, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.04]} />
        <meshToonMaterial color="#1565C0" />
      </mesh>
    </group>
  );
}

/* ─── BIKE RACK ─── */
function BikeRack({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={i} position={[i * 0.3 - 0.3, 0.25, 0]}>
          <torusGeometry args={[0.2, 0.015, 6, 12, Math.PI]} />
          <meshToonMaterial color="#78909C" />
        </mesh>
      ))}
      {/* Base bar */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.9, 0.03, 0.04]} />
        <meshToonMaterial color="#78909C" />
      </mesh>
    </group>
  );
}

/* ─── PIGEON ─── */
function Pigeon({ position }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      // Subtle bobbing/pecking
      ref.current.position.y = Math.abs(Math.sin(clock.getElapsedTime() * 3 + position[0])) * 0.02;
      ref.current.rotation.y += Math.sin(clock.getElapsedTime() * 0.5 + position[2]) * 0.005;
    }
  });

  return (
    <group ref={ref} position={position}>
      {/* Body */}
      <mesh position={[0, 0.06, 0]} rotation={[0.2, 0, 0]}>
        <sphereGeometry args={[0.06, 6, 5]} />
        <meshToonMaterial color="#757575" />
      </mesh>
      {/* Head */}
      <mesh position={[0.05, 0.1, 0]}>
        <sphereGeometry args={[0.035, 6, 5]} />
        <meshToonMaterial color="#616161" />
      </mesh>
      {/* Beak */}
      <mesh position={[0.085, 0.095, 0]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.01, 0.03, 4]} />
        <meshToonMaterial color="#FF8F00" />
      </mesh>
    </group>
  );
}

/* ─── FLYING BIRD ─── */
function FlyingBird({ startPos, speed = 1 }) {
  const ref = useRef();
  const wingRef = useRef(0);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed;
    ref.current.position.x = startPos[0] + Math.sin(t * 0.3) * 15;
    ref.current.position.z = startPos[2] + Math.cos(t * 0.2) * 12;
    ref.current.position.y = startPos[1] + Math.sin(t * 0.5) * 2;
    ref.current.rotation.y = Math.atan2(
      Math.cos(t * 0.3) * 15 * 0.3,
      -Math.sin(t * 0.2) * 12 * 0.2
    );
    wingRef.current = Math.sin(t * 8) * 0.5;
  });

  return (
    <group ref={ref} position={startPos} scale={0.3}>
      <mesh>
        <sphereGeometry args={[0.1, 4, 4]} />
        <meshToonMaterial color="#212121" />
      </mesh>
      {/* Wings */}
      <mesh position={[-0.15, 0, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.25, 0.01, 0.08]} />
        <meshToonMaterial color="#424242" />
      </mesh>
      <mesh position={[0.15, 0, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.25, 0.01, 0.08]} />
        <meshToonMaterial color="#424242" />
      </mesh>
    </group>
  );
}

/* ─── CONFETTI ─── */
function ConfettiSystem() {
  const ref = useRef();
  const count = 120;

  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const confettiColors = [
      [1, 0.2, 0.2], [0.2, 0.5, 1], [1, 0.85, 0.1],
      [0.1, 0.8, 0.3], [1, 0.35, 0.7], [1, 0.55, 0],
    ];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 12 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      const c = confettiColors[i % confettiColors.length];
      colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
    }
    return { positions, colors };
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= 0.025;
      pos[i * 3] += Math.sin(t * 2 + i * 0.7) * 0.012;
      pos[i * 3 + 2] += Math.cos(t * 1.5 + i * 0.4) * 0.008;
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 12 + Math.random() * 3;
        pos[i * 3] = (Math.random() - 0.5) * 20;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={data.positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={data.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.18} vertexColors transparent opacity={0.9} />
    </points>
  );
}

/* ─── DUST MOTES ─── */
function DustMotes() {
  const ref = useRef();
  const count = 60;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = Math.random() * 8 + 1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      pos[i * 3] += Math.sin(t * 0.3 + i) * 0.005;
      pos[i * 3 + 1] += Math.sin(t * 0.5 + i * 0.7) * 0.003;
      pos[i * 3 + 2] += Math.cos(t * 0.4 + i * 0.5) * 0.004;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#FFF8E1" size={0.06} transparent opacity={0.4} />
    </points>
  );
}

/* ─── TRAFFIC SIGN ─── */
function TrafficSign({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 2, 4]} />
        <meshToonMaterial color="#78909C" />
      </mesh>
      {/* Octagonal stop sign shape */}
      <mesh position={[0, 1.8, 0.03]}>
        <circleGeometry args={[0.18, 8]} />
        <meshToonMaterial color="#D32F2F" />
      </mesh>
      <mesh position={[0, 1.8, 0.04]}>
        <circleGeometry args={[0.13, 8]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

/* ─── NEWSPAPER STAND ─── */
function NewspaperStand({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.5, 0.7, 0.3]} />
        <meshToonMaterial color="#FF6F00" />
      </mesh>
      {/* Papers */}
      <mesh position={[0, 0.7, 0.05]}>
        <boxGeometry args={[0.4, 0.02, 0.25]} />
        <meshToonMaterial color="#FAFAFA" />
      </mesh>
      <mesh position={[0, 0.72, 0.05]}>
        <boxGeometry args={[0.38, 0.02, 0.24]} />
        <meshToonMaterial color="#FFF3E0" />
      </mesh>
    </group>
  );
}

/* ─── MAIN EXPORT ─── */
export function CityDecorations({ cityLevel, teamColors, unlockables, weather, recentWin }) {
  const isNight = new Date().getHours() >= 20 || new Date().getHours() < 6;
  const primaryHex = '#' + teamColors.primary.getHexString();
  const secondaryHex = '#' + teamColors.secondary.getHexString();

  const trees = useMemo(() => {
    const base = [
      [-5, 0, -5], [5, 0, -5], [-3, 0, 12], [10, 0, 10],
      [-15, 0, -8], [15, 0, 8], [-18, 0, 12], [18, 0, -10],
      [-8, 0, -3], [8, 0, -3], [3, 0, 15], [-10, 0, 15],
    ];
    const extra = cityLevel >= 3 ? [
      [-8, 0, 15], [8, 0, -18], [-20, 0, 0], [20, 0, 5],
      [12, 0, 15], [-12, 0, -15], [-6, 0, 18], [16, 0, -5],
      [-20, 0, -15], [20, 0, -12], [-15, 0, 18], [15, 0, 18],
    ] : [];
    return [...base, ...extra];
  }, [cityLevel]);

  const lampposts = useMemo(() => {
    const base = [
      [-2.5, 0, -4], [2.5, 0, -4], [-2.5, 0, 6], [2.5, 0, 6],
      [-2.5, 0, 0], [2.5, 0, 0],
    ];
    const extra = cityLevel >= 2 ? [
      [-2.5, 0, -10], [2.5, 0, -10], [-2.5, 0, 12], [2.5, 0, 12],
      [-10, 0, -1.5], [10, 0, -1.5], [-10, 0, 1.5], [10, 0, 1.5],
    ] : [];
    return [...base, ...extra];
  }, [cityLevel]);

  const hasStatue = unlockables?.some(u => u.type === 'statue') || cityLevel >= 4;

  return (
    <group>
      {/* Trees */}
      {trees.map((pos, i) => (
        <Tree key={`tree${i}`} position={pos} scale={0.9 + (i % 5) * 0.1} variant={i % 3} />
      ))}

      {/* Lampposts */}
      {lampposts.map((pos, i) => (
        <LampPost key={`lamp${i}`} position={pos} isNight={isNight} />
      ))}

      {/* Benches */}
      <Bench position={[-3.5, 0, 3.5]} />
      <Bench position={[3.5, 0, 3.5]} rotation={Math.PI} />
      <Bench position={[-3.5, 0, 0.5]} rotation={Math.PI / 2} />
      {cityLevel >= 2 && <Bench position={[3.5, 0, -4]} rotation={-Math.PI / 2} />}
      {cityLevel >= 3 && <Bench position={[7, 0, 7]} rotation={Math.PI / 4} />}

      {/* Flags near stadium */}
      <Flag position={[-5, 0, -8]} color={primaryHex} />
      <Flag position={[5, 0, -8]} color={secondaryHex} />
      {cityLevel >= 3 && (
        <>
          <Flag position={[-7, 0, -8]} color={primaryHex} />
          <Flag position={[7, 0, -8]} color={secondaryHex} />
        </>
      )}

      {/* Statue */}
      {hasStatue && <Statue position={[0, 0, 2]} />}

      {/* Trash cans */}
      <TrashCan position={[-3, 0, -2]} />
      <TrashCan position={[3, 0, -2]} />
      <TrashCan position={[0, 0, 7]} />
      {cityLevel >= 2 && <TrashCan position={[-8, 0, 5]} />}
      {cityLevel >= 2 && <TrashCan position={[8, 0, -5]} />}

      {/* Fire hydrants */}
      <FireHydrant position={[2, 0, -6]} />
      <FireHydrant position={[-4, 0, 8]} />
      {cityLevel >= 3 && <FireHydrant position={[10, 0, 3]} />}

      {/* Mailboxes */}
      <Mailbox position={[4, 0, 4]} />
      {cityLevel >= 2 && <Mailbox position={[-6, 0, -4]} />}

      {/* Flower pots around plaza */}
      {cityLevel >= 2 && (
        <>
          <FlowerPot position={[-2.5, 0, 3]} flowerColor="#E91E63" />
          <FlowerPot position={[2.5, 0, 3]} flowerColor="#FF9800" />
          <FlowerPot position={[0, 0, 4.5]} flowerColor="#9C27B0" />
          <FlowerPot position={[-1.5, 0, 4]} flowerColor="#F44336" />
          <FlowerPot position={[1.5, 0, 4]} flowerColor="#FFEB3B" />
        </>
      )}

      {/* Bus stop */}
      <BusStop position={[4, 0, -3]} rotation={Math.PI / 2} />
      {cityLevel >= 3 && <BusStop position={[-4, 0, 10]} rotation={-Math.PI / 2} />}

      {/* Bike rack */}
      <BikeRack position={[-5, 0, 5]} rotation={Math.PI / 4} />
      {cityLevel >= 3 && <BikeRack position={[6, 0, -6]} />}

      {/* Traffic signs */}
      <TrafficSign position={[1.5, 0, 3]} />
      <TrafficSign position={[-1.5, 0, -3]} rotation={Math.PI} />
      {cityLevel >= 2 && <TrafficSign position={[3, 0, 1.5]} rotation={Math.PI / 2} />}
      {cityLevel >= 2 && <TrafficSign position={[-3, 0, -1.5]} rotation={-Math.PI / 2} />}

      {/* Newspaper stands */}
      <NewspaperStand position={[5, 0, 2]} />
      {cityLevel >= 3 && <NewspaperStand position={[-7, 0, 6]} rotation={Math.PI / 2} />}

      {/* Pigeons */}
      {cityLevel >= 2 && (
        <>
          <Pigeon position={[1, 0, 3]} />
          <Pigeon position={[1.3, 0, 2.8]} />
          <Pigeon position={[0.7, 0, 3.2]} />
          <Pigeon position={[-0.5, 0, 2.5]} />
          {cityLevel >= 3 && <Pigeon position={[2, 0, 4]} />}
          {cityLevel >= 3 && <Pigeon position={[-1, 0, 3.5]} />}
        </>
      )}

      {/* Flying birds */}
      <FlyingBird startPos={[0, 15, 0]} speed={0.8} />
      <FlyingBird startPos={[5, 18, -5]} speed={0.6} />
      {cityLevel >= 2 && <FlyingBird startPos={[-8, 16, 8]} speed={0.7} />}
      {cityLevel >= 3 && <FlyingBird startPos={[10, 20, 10]} speed={0.5} />}

      {/* Dust motes in sunlight */}
      {!isNight && weather !== 'rain' && weather !== 'snow' && <DustMotes />}

      {/* Confetti after winning */}
      {recentWin && <ConfettiSystem />}

      {/* Club shop */}
      <group position={[-4, 0, 4]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[1.5 + cityLevel * 0.15, 1.4, 1.2]} />
          <meshToonMaterial color={primaryHex} />
        </mesh>
        {/* Awning */}
        <mesh position={[0, 1.4, 0.8]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[1.8, 0.04, 0.6]} />
          <meshToonMaterial color={secondaryHex} />
        </mesh>
        {/* Door */}
        <mesh position={[0, 0.5, 0.61]}>
          <boxGeometry args={[0.5, 0.9, 0.04]} />
          <meshToonMaterial color="#3E2723" />
        </mesh>
        {/* Display window */}
        <mesh position={[0.5, 0.6, 0.61]}>
          <planeGeometry args={[0.5, 0.6]} />
          <meshBasicMaterial color="#90CAF9" transparent opacity={0.4} />
        </mesh>
        {/* Sign */}
        <mesh position={[0, 1.25, 0.62]}>
          <boxGeometry args={[1.2, 0.25, 0.04]} />
          <meshBasicMaterial color={secondaryHex} />
        </mesh>
      </group>
    </group>
  );
}
