/**
 * CityDecorations.jsx — Trees, benches, lampposts, flags, confetti, statues, murals
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Tree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 1.2, 6]} />
        <meshToonMaterial color="#5D4037" />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.6, 8, 6]} />
        <meshToonMaterial color="#388E3C" />
      </mesh>
      <mesh position={[0.2, 1.3, 0.2]} castShadow>
        <sphereGeometry args={[0.4, 6, 5]} />
        <meshToonMaterial color="#43A047" />
      </mesh>
    </group>
  );
}

function LampPost({ position, isNight }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 3, 6]} />
        <meshToonMaterial color="#455A64" />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshBasicMaterial color={isNight ? '#FFF9C4' : '#BDBDBD'} />
      </mesh>
      {isNight && (
        <pointLight position={[0, 3, 0]} color="#FFF176" intensity={3} distance={8} />
      )}
    </group>
  );
}

function Bench({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.8, 0.05, 0.3]} />
        <meshToonMaterial color="#6D4C41" />
      </mesh>
      <mesh position={[0, 0.4, -0.12]}>
        <boxGeometry args={[0.8, 0.3, 0.05]} />
        <meshToonMaterial color="#6D4C41" />
      </mesh>
      {[-0.35, 0.35].map((x, i) => (
        <mesh key={i} position={[x, 0.12, 0]}>
          <boxGeometry args={[0.04, 0.24, 0.28]} />
          <meshToonMaterial color="#455A64" />
        </mesh>
      ))}
    </group>
  );
}

function Flag({ position, color, waving = true }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current && waving) {
      ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 2) * 0.2;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 3, 4]} />
        <meshToonMaterial color="#78909C" />
      </mesh>
      <mesh ref={ref} position={[0.4, 2.5, 0]}>
        <planeGeometry args={[0.8, 0.5]} />
        <meshToonMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Statue({ position }) {
  return (
    <group position={position}>
      {/* Pedestal */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1, 0.8, 1]} />
        <meshToonMaterial color="#9E9E9E" />
      </mesh>
      {/* Figure */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.6, 6, 8]} />
        <meshToonMaterial color="#B0BEC5" />
      </mesh>
      {/* Trophy held up */}
      <mesh position={[0, 1.9, 0.15]}>
        <cylinderGeometry args={[0.1, 0.06, 0.25, 8]} />
        <meshToonMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

function ConfettiSystem() {
  const ref = useRef();
  const count = 100;
  
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const confettiColors = [
      [1, 0.2, 0.2], [0.2, 0.4, 1], [1, 0.9, 0.1],
      [0.1, 0.8, 0.2], [1, 0.4, 0.7], [1, 0.6, 0],
    ];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = Math.random() * 10 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
      const c = confettiColors[i % confettiColors.length];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }
    return { positions, colors };
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= 0.03;
      pos[i * 3] += Math.sin(t + i * 0.5) * 0.015;
      pos[i * 3 + 2] += Math.cos(t + i * 0.3) * 0.01;
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 10 + Math.random() * 3;
        pos[i * 3] = (Math.random() - 0.5) * 15;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
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
      <pointsMaterial size={0.15} vertexColors transparent opacity={0.9} />
    </points>
  );
}

export function CityDecorations({ cityLevel, teamColors, unlockables, weather, recentWin }) {
  const isNight = new Date().getHours() >= 20 || new Date().getHours() < 6;
  const primaryHex = '#' + teamColors.primary.getHexString();
  const secondaryHex = '#' + teamColors.secondary.getHexString();

  // Tree positions based on city level
  const trees = useMemo(() => {
    const base = [
      [-5, 0, -5], [5, 0, -5], [-3, 0, 12], [10, 0, 10],
      [-15, 0, -8], [15, 0, 8], [-18, 0, 12], [18, 0, -10],
    ];
    const extra = cityLevel >= 3 ? [
      [-8, 0, 15], [8, 0, -18], [-20, 0, 0], [20, 0, 5],
      [12, 0, 15], [-12, 0, -15], [-6, 0, 18], [16, 0, -5],
    ] : [];
    return [...base, ...extra];
  }, [cityLevel]);

  const lampposts = useMemo(() => {
    const base = [
      [-2, 0, -3], [2, 0, -3], [-2, 0, 5], [2, 0, 5],
    ];
    const extra = cityLevel >= 2 ? [
      [-2, 0, -8], [2, 0, -8], [-2, 0, 10], [2, 0, 10],
      [-8, 0, 0], [8, 0, 0],
    ] : [];
    return [...base, ...extra];
  }, [cityLevel]);

  const hasStatue = unlockables?.some(u => u.type === 'statue') ||
    (cityLevel >= 4);

  return (
    <group>
      {/* Trees */}
      {trees.map((pos, i) => (
        <Tree key={`tree${i}`} position={pos} scale={0.8 + Math.random() * 0.4} />
      ))}

      {/* Lampposts */}
      {lampposts.map((pos, i) => (
        <LampPost key={`lamp${i}`} position={pos} isNight={isNight} />
      ))}

      {/* Benches */}
      <Bench position={[-3, 0, 3]} />
      <Bench position={[3, 0, 3]} rotation={Math.PI} />
      {cityLevel >= 2 && <Bench position={[-3, 0, -6]} rotation={Math.PI / 2} />}
      {cityLevel >= 3 && <Bench position={[6, 0, 6]} rotation={-Math.PI / 2} />}

      {/* Flags near stadium */}
      <Flag position={[-4, 0, -8]} color={primaryHex} />
      <Flag position={[4, 0, -8]} color={secondaryHex} />
      {cityLevel >= 3 && (
        <>
          <Flag position={[-6, 0, -8]} color={primaryHex} />
          <Flag position={[6, 0, -8]} color={secondaryHex} />
        </>
      )}

      {/* Plaza statue (cup winner or high level) */}
      {hasStatue && <Statue position={[0, 0, 2]} />}

      {/* Confetti after winning */}
      {recentWin && <ConfettiSystem />}

      {/* Club shop (size based on merchandising) */}
      <mesh position={[-4, 0.6, 4]} castShadow>
        <boxGeometry args={[1.5 + cityLevel * 0.2, 1.2, 1.2]} />
        <meshToonMaterial color={primaryHex} />
      </mesh>
      {/* Shop sign */}
      <mesh position={[-4, 1.3, 4.61]}>
        <planeGeometry args={[1.2, 0.3]} />
        <meshBasicMaterial color={secondaryHex} />
      </mesh>

      {/* Flower beds in plaza for high-level cities */}
      {cityLevel >= 4 && (
        <>
          {[[-2, 0.1, 2], [2, 0.1, 2], [0, 0.1, 4]].map((pos, i) => (
            <mesh key={`flower${i}`} position={pos}>
              <cylinderGeometry args={[0.5, 0.5, 0.2, 8]} />
              <meshToonMaterial color="#E91E63" />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
