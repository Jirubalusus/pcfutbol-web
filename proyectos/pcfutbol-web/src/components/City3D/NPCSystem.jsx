/**
 * NPCSystem.jsx — Better NPC models with more detail, varied appearances
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function NPC({ startPos, teamColors, speed, celebrateWin, index }) {
  const ref = useRef();
  const walkTime = useRef(Math.random() * 100);
  const direction = useRef(new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize());
  const changeTimer = useRef(Math.random() * 5 + 3);
  const idleTimer = useRef(0);
  const isIdle = useRef(false);

  const primaryHex = useMemo(() => '#' + teamColors.primary.getHexString(), [teamColors.primary]);
  const secondaryHex = useMemo(() => '#' + teamColors.secondary.getHexString(), [teamColors.secondary]);

  const appearance = useMemo(() => {
    const skinTones = ['#F5CBA7', '#D4A574', '#8D6E63', '#FFCC80', '#A1887F', '#EFCEB9'];
    const hairColors = ['#3E2723', '#5D4037', '#212121', '#BF360C', '#FF8F00', '#795548'];
    const scarfColors = ['#F44336', '#2196F3', '#FF9800', '#4CAF50', '#9C27B0'];
    const hatTypes = ['none', 'none', 'none', 'beanie', 'cap'];

    return {
      skin: skinTones[index % skinTones.length],
      hair: hairColors[index % hairColors.length],
      shirt: index % 4 === 0 ? secondaryHex : index % 4 === 1 ? primaryHex : index % 4 === 2 ? '#FAFAFA' : primaryHex,
      shorts: index % 3 === 0 ? primaryHex : index % 3 === 1 ? secondaryHex : '#1A237E',
      hasScarf: index % 5 === 0,
      scarfColor: scarfColors[index % scarfColors.length],
      hat: hatTypes[index % hatTypes.length],
      isFemale: index % 4 === 2,
      scale: 0.65 + (index % 3) * 0.05,
    };
  }, [index, primaryHex, secondaryHex]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const dt = Math.min(delta, 0.05);
    walkTime.current += dt * 5;
    changeTimer.current -= dt;

    // Occasional idle pause
    if (isIdle.current) {
      idleTimer.current -= dt;
      if (idleTimer.current <= 0) isIdle.current = false;
      return;
    }

    if (changeTimer.current <= 0) {
      direction.current.set(Math.random() - 0.5, Math.random() - 0.5).normalize();
      changeTimer.current = Math.random() * 5 + 3;
      // Chance to idle
      if (Math.random() < 0.15) {
        isIdle.current = true;
        idleTimer.current = 1 + Math.random() * 3;
      }
    }

    const pos = ref.current.position;
    pos.x += direction.current.x * speed * dt;
    pos.z += direction.current.y * speed * dt;

    if (pos.x > 22 || pos.x < -22) direction.current.x *= -1;
    if (pos.z > 22 || pos.z < -22) direction.current.y *= -1;
    pos.x = Math.max(-22, Math.min(22, pos.x));
    pos.z = Math.max(-22, Math.min(22, pos.z));

    ref.current.rotation.y = Math.atan2(direction.current.x, direction.current.y);
    pos.y = Math.abs(Math.sin(walkTime.current)) * 0.05;

    // Animate legs
    const leftLeg = ref.current.getObjectByName(`npcLL${index}`);
    const rightLeg = ref.current.getObjectByName(`npcRL${index}`);
    if (leftLeg) leftLeg.rotation.x = Math.sin(walkTime.current) * 0.25;
    if (rightLeg) rightLeg.rotation.x = -Math.sin(walkTime.current) * 0.25;

    // Arms
    const leftArm = ref.current.getObjectByName(`npcLA${index}`);
    const rightArm = ref.current.getObjectByName(`npcRA${index}`);
    if (leftArm) leftArm.rotation.x = -Math.sin(walkTime.current) * 0.15;
    if (rightArm) rightArm.rotation.x = Math.sin(walkTime.current) * 0.15;

    // Celebration
    if (celebrateWin && Math.sin(walkTime.current * 0.5 + index) > 0.8) {
      pos.y += 0.3;
    }
  });

  return (
    <group ref={ref} position={startPos} scale={appearance.scale}>
      {/* Body/shirt */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.4, 0.45, 0.25]} />
        <meshToonMaterial color={appearance.shirt} />
      </mesh>
      {/* Shirt detail stripe */}
      <mesh position={[0, 0.7, 0.126]}>
        <boxGeometry args={[0.41, 0.1, 0.01]} />
        <meshToonMaterial color={appearance.shirt === primaryHex ? secondaryHex : primaryHex} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.08, 0]}>
        <sphereGeometry args={[0.17, 10, 8]} />
        <meshToonMaterial color={appearance.skin} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 1.18, -0.02]}>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshToonMaterial color={appearance.hair} />
      </mesh>
      {/* Eyes */}
      {[-0.05, 0.05].map((x, i) => (
        <mesh key={i} position={[x, 1.1, 0.15]}>
          <sphereGeometry args={[0.02, 6, 4]} />
          <meshBasicMaterial color="#1A1A1A" />
        </mesh>
      ))}

      {/* Hat */}
      {appearance.hat === 'beanie' && (
        <mesh position={[0, 1.22, 0]}>
          <sphereGeometry args={[0.17, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshToonMaterial color={primaryHex} />
        </mesh>
      )}
      {appearance.hat === 'cap' && (
        <group position={[0, 1.2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.17, 0.17, 0.06, 8]} />
            <meshToonMaterial color={primaryHex} />
          </mesh>
          <mesh position={[0, 0, 0.15]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.2, 0.02, 0.15]} />
            <meshToonMaterial color={primaryHex} />
          </mesh>
        </group>
      )}

      {/* Scarf */}
      {appearance.hasScarf && (
        <mesh position={[0, 0.92, 0.06]}>
          <boxGeometry args={[0.35, 0.08, 0.15]} />
          <meshToonMaterial color={appearance.scarfColor} />
        </mesh>
      )}

      {/* Left arm */}
      <group name={`npcLA${index}`} position={[-0.27, 0.75, 0]}>
        <mesh>
          <boxGeometry args={[0.1, 0.35, 0.1]} />
          <meshToonMaterial color={appearance.shirt} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <sphereGeometry args={[0.04, 5, 4]} />
          <meshToonMaterial color={appearance.skin} />
        </mesh>
      </group>

      {/* Right arm */}
      <group name={`npcRA${index}`} position={[0.27, 0.75, 0]}>
        <mesh>
          <boxGeometry args={[0.1, 0.35, 0.1]} />
          <meshToonMaterial color={appearance.shirt} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <sphereGeometry args={[0.04, 5, 4]} />
          <meshToonMaterial color={appearance.skin} />
        </mesh>
      </group>

      {/* Left leg */}
      <group name={`npcLL${index}`} position={[-0.08, 0.25, 0]}>
        <mesh>
          <boxGeometry args={[0.13, 0.32, 0.13]} />
          <meshToonMaterial color={appearance.shorts} />
        </mesh>
        <mesh position={[0, -0.2, 0.02]}>
          <boxGeometry args={[0.12, 0.08, 0.15]} />
          <meshToonMaterial color="#1A1A1A" />
        </mesh>
      </group>

      {/* Right leg */}
      <group name={`npcRL${index}`} position={[0.08, 0.25, 0]}>
        <mesh>
          <boxGeometry args={[0.13, 0.32, 0.13]} />
          <meshToonMaterial color={appearance.shorts} />
        </mesh>
        <mesh position={[0, -0.2, 0.02]}>
          <boxGeometry args={[0.12, 0.08, 0.15]} />
          <meshToonMaterial color="#1A1A1A" />
        </mesh>
      </group>

      {/* Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.2, 8]} />
        <meshBasicMaterial color="#000000" opacity={0.12} transparent />
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
      speed: 0.6 + Math.random() * 1.0,
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
