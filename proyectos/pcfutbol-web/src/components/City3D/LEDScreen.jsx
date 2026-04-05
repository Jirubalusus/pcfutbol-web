/**
 * LEDScreen.jsx — More realistic LED screens with frame details, pixel grid effect
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function LEDScreen({ position, leagueTable, teamId, nextMatch }) {
  const ref = useRef();
  const glowRef = useRef();
  const scrollOffset = useRef(0);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.material.emissiveIntensity = 0.35 + Math.sin(clock.getElapsedTime() * 2) * 0.08;
    }
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.08 + Math.sin(clock.getElapsedTime() * 1.5) * 0.03;
    }
    scrollOffset.current += 0.005;
  });

  return (
    <group position={position}>
      {/* Back housing */}
      <mesh position={[0, 0, -0.12]} castShadow>
        <boxGeometry args={[3.5, 2.5, 0.2]} />
        <meshToonMaterial color="#1A1A1A" />
      </mesh>
      {/* Frame (beveled border) */}
      <mesh castShadow>
        <boxGeometry args={[3.4, 2.4, 0.15]} />
        <meshToonMaterial color="#263238" />
      </mesh>
      {/* Inner frame */}
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[3.15, 2.15, 0.04]} />
        <meshToonMaterial color="#1A237E" />
      </mesh>
      {/* Screen surface */}
      <mesh ref={ref} position={[0, 0, 0.07]}>
        <planeGeometry args={[3, 2]} />
        <meshBasicMaterial color="#0D47A1" emissive="#1565C0" emissiveIntensity={0.35} />
      </mesh>

      {/* Pixel grid overlay (subtle) */}
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[3, 2]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.08} wireframe />
      </mesh>

      {/* Screen glow effect */}
      <mesh ref={glowRef} position={[0, 0, 0.05]}>
        <planeGeometry args={[3.5, 2.5]} />
        <meshBasicMaterial color="#42A5F5" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      {/* Support structure */}
      <mesh position={[0, -2.8, -0.05]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 3.5, 8]} />
        <meshToonMaterial color="#37474F" />
      </mesh>
      {/* Support base */}
      <mesh position={[0, -4.5, -0.05]}>
        <cylinderGeometry args={[0.5, 0.5, 0.12, 8]} />
        <meshToonMaterial color="#455A64" />
      </mesh>
      {/* Support arm */}
      <mesh position={[0, -0.8, -0.1]} castShadow>
        <boxGeometry args={[0.3, 0.8, 0.1]} />
        <meshToonMaterial color="#455A64" />
      </mesh>

      {/* Corner mounting bolts */}
      {[[-1.55, 1.05], [1.55, 1.05], [-1.55, -1.05], [1.55, -1.05]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.08]}>
          <cylinderGeometry args={[0.03, 0.03, 0.04, 6]} />
          <meshToonMaterial color="#78909C" />
        </mesh>
      ))}

      {/* League data bars */}
      {leagueTable?.slice(0, 6).map((entry, i) => {
        const isPlayer = entry?.teamId === teamId;
        return (
          <group key={i}>
            {/* Position number bar */}
            <mesh position={[-1.2, 0.7 - i * 0.28, 0.08]}>
              <planeGeometry args={[0.2, 0.18]} />
              <meshBasicMaterial color={isPlayer ? '#FFD600' : '#455A64'} transparent opacity={0.9} />
            </mesh>
            {/* Team name bar */}
            <mesh position={[0, 0.7 - i * 0.28, 0.08]}>
              <planeGeometry args={[1.8, 0.18]} />
              <meshBasicMaterial color={isPlayer ? '#FFD600' : '#B3E5FC'} transparent opacity={isPlayer ? 0.9 : 0.6} />
            </mesh>
            {/* Points bar */}
            <mesh position={[1.2, 0.7 - i * 0.28, 0.08]}>
              <planeGeometry args={[0.3, 0.18]} />
              <meshBasicMaterial color={isPlayer ? '#FFD600' : '#81D4FA'} transparent opacity={0.7} />
            </mesh>
          </group>
        );
      })}

      {/* Header bar */}
      <mesh position={[0, 0.88, 0.08]}>
        <planeGeometry args={[2.8, 0.12]} />
        <meshBasicMaterial color="#1565C0" />
      </mesh>

      {/* "LIVE" indicator */}
      <group position={[1.2, 0.88, 0.09]}>
        <mesh>
          <boxGeometry args={[0.4, 0.16, 0.02]} />
          <meshBasicMaterial color="#D32F2F" />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[0.25, 0.08]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        {/* Blinking dot */}
        <mesh position={[-0.15, 0, 0.02]}>
          <circleGeometry args={[0.03, 8]} />
          <meshBasicMaterial color="#FF1744" />
        </mesh>
      </group>

      {/* Bottom ticker area */}
      <mesh position={[0, -0.88, 0.08]}>
        <planeGeometry args={[2.8, 0.15]} />
        <meshBasicMaterial color="#0D47A1" />
      </mesh>
      {/* Ticker text placeholder */}
      <mesh position={[0, -0.88, 0.085]}>
        <planeGeometry args={[2.2, 0.06]} />
        <meshBasicMaterial color="#4FC3F7" transparent opacity={0.7} />
      </mesh>

      {/* Speakers on sides */}
      {[-1.85, 1.85].map((x, i) => (
        <group key={`spk${i}`} position={[x, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.2, 0.6, 0.15]} />
            <meshToonMaterial color="#212121" />
          </mesh>
          <mesh position={[0, 0.1, 0.08]}>
            <circleGeometry args={[0.06, 8]} />
            <meshToonMaterial color="#424242" />
          </mesh>
          <mesh position={[0, -0.1, 0.08]}>
            <circleGeometry args={[0.04, 6]} />
            <meshToonMaterial color="#424242" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
