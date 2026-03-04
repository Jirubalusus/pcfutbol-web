/**
 * NPCSystem.jsx — NPC fans walking around the city wearing club shirts
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function NPC({ startPos, teamColors, speed, celebrateWin, index }) {
  const ref = useRef();
  const walkTime = useRef(Math.random() * 100);
  const direction = useRef(new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize());
  const changeTimer = useRef(Math.random() * 5 + 3);

  const primaryHex = useMemo(() => '#' + teamColors.primary.getHexString(), [teamColors.primary]);
  const secondaryHex = useMemo(() => '#' + teamColors.secondary.getHexString(), [teamColors.secondary]);
  // Alternate: some NPCs wear primary, some secondary
  const shirtColor = index % 3 === 0 ? secondaryHex : primaryHex;
  const shortsColor = index % 3 === 0 ? primaryHex : secondaryHex;
  const skinTones = ['#F5CBA7', '#D4A574', '#8D6E63', '#FFCC80', '#A1887F'];
  const skinColor = skinTones[index % skinTones.length];

  useFrame((_, delta) => {
    if (!ref.current) return;
    const dt = Math.min(delta, 0.05);
    walkTime.current += dt * 5;
    changeTimer.current -= dt;

    if (changeTimer.current <= 0) {
      direction.current.set(Math.random() - 0.5, Math.random() - 0.5).normalize();
      changeTimer.current = Math.random() * 5 + 3;
    }

    const pos = ref.current.position;
    pos.x += direction.current.x * speed * dt;
    pos.z += direction.current.y * speed * dt;

    // Bounce off bounds
    if (pos.x > 22 || pos.x < -22) direction.current.x *= -1;
    if (pos.z > 22 || pos.z < -22) direction.current.y *= -1;
    pos.x = Math.max(-22, Math.min(22, pos.x));
    pos.z = Math.max(-22, Math.min(22, pos.z));

    // Face direction
    ref.current.rotation.y = Math.atan2(direction.current.x, direction.current.y);

    // Walk bob
    pos.y = Math.abs(Math.sin(walkTime.current)) * 0.06;

    // Leg animation
    if (ref.current.children[2]) ref.current.children[2].rotation.x = Math.sin(walkTime.current) * 0.25;
    if (ref.current.children[3]) ref.current.children[3].rotation.x = -Math.sin(walkTime.current) * 0.25;

    // Celebration jump if recent win
    if (celebrateWin && Math.sin(walkTime.current * 0.5 + index) > 0.8) {
      pos.y += 0.3;
    }
  });

  return (
    <group ref={ref} position={startPos} scale={0.7}>
      {/* Body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.4, 0.45, 0.25]} />
        <meshToonMaterial color={shirtColor} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.18, 8, 6]} />
        <meshToonMaterial color={skinColor} />
      </mesh>
      {/* Left leg */}
      <group position={[-0.1, 0.25, 0]}>
        <mesh>
          <boxGeometry args={[0.14, 0.35, 0.14]} />
          <meshToonMaterial color={shortsColor} />
        </mesh>
      </group>
      {/* Right leg */}
      <group position={[0.1, 0.25, 0]}>
        <mesh>
          <boxGeometry args={[0.14, 0.35, 0.14]} />
          <meshToonMaterial color={shortsColor} />
        </mesh>
      </group>
      {/* Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.2, 8]} />
        <meshBasicMaterial color="#000000" opacity={0.15} transparent />
      </mesh>
    </group>
  );
}

export function NPCSystem({ count, cityLevel, teamColors, recentWin }) {
  const npcs = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      startPos: [
        (Math.random() - 0.5) * 40,
        0,
        (Math.random() - 0.5) * 40,
      ],
      speed: 0.8 + Math.random() * 1.2,
    }));
  }, [count]);

  return (
    <group>
      {npcs.map(npc => (
        <NPC
          key={npc.id}
          startPos={npc.startPos}
          teamColors={teamColors}
          speed={npc.speed}
          celebrateWin={recentWin}
          index={npc.id}
        />
      ))}
    </group>
  );
}
