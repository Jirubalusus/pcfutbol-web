/**
 * LEDScreen.jsx — LED screens showing league table and next match info
 * Uses HTML overlay via drei's Html component alternative (sprite-based for perf)
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function LEDScreen({ position, leagueTable, teamId, nextMatch }) {
  const ref = useRef();
  const scrollOffset = useRef(0);

  useFrame(({ clock }) => {
    if (ref.current) {
      // Gentle glow pulse
      ref.current.material.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
    }
    scrollOffset.current += 0.005;
  });

  return (
    <group position={position}>
      {/* Screen frame */}
      <mesh castShadow>
        <boxGeometry args={[3.2, 2.2, 0.15]} />
        <meshToonMaterial color="#263238" />
      </mesh>
      {/* Screen surface */}
      <mesh ref={ref} position={[0, 0, 0.08]}>
        <planeGeometry args={[3, 2]} />
        <meshBasicMaterial color="#0D47A1" emissive="#1565C0" emissiveIntensity={0.3} />
      </mesh>
      {/* Support pole */}
      <mesh position={[0, -2.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 3, 6]} />
        <meshToonMaterial color="#455A64" />
      </mesh>
      {/* Simplified "text" bars representing league data */}
      {leagueTable?.slice(0, 5).map((entry, i) => {
        const isPlayer = entry?.teamId === teamId;
        return (
          <mesh key={i} position={[0, 0.6 - i * 0.3, 0.09]}>
            <planeGeometry args={[2.5, 0.15]} />
            <meshBasicMaterial
              color={isPlayer ? '#FFD600' : '#B3E5FC'}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}
      {/* "LIVE" indicator */}
      <mesh position={[1.1, 0.85, 0.09]}>
        <planeGeometry args={[0.5, 0.18]} />
        <meshBasicMaterial color="#F44336" />
      </mesh>
    </group>
  );
}
