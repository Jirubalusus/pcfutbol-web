/**
 * PlayerCharacter.jsx — Detailed cartoon player with kit, number, socks, animated hair
 */
import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ToonMaterial({ color, emissive }) {
  return (
    <meshToonMaterial
      color={color}
      emissive={emissive || '#000000'}
      emissiveIntensity={emissive ? 0.1 : 0}
    />
  );
}

export function PlayerCharacter({
  posRef, movementRef, teamColors, setPlayerPos,
  nearBuilding, onEnterBuilding,
}) {
  const groupRef = useRef();
  const hairRef = useRef();
  const walkTime = useRef(0);
  const facingAngle = useRef(0);
  const isMoving = useRef(false);
  const [showEnterPrompt, setShowEnterPrompt] = useState(false);

  const primaryHex = useMemo(() => '#' + teamColors.primary.getHexString(), [teamColors.primary]);
  const secondaryHex = useMemo(() => '#' + teamColors.secondary.getHexString(), [teamColors.secondary]);
  const skinColor = '#F5CBA7';
  const hairColor = '#3E2723';
  const shoeColor = '#1A1A1A';
  const sockColor = '#FFFFFF';

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    const mv = movementRef.current;

    let mx = mv.x || 0;
    let mz = mv.z || 0;

    const keys = keyState;
    if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;

    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 1) { mx /= len; mz /= len; }

    const angle = -Math.PI / 4;
    const rx = mx * Math.cos(angle) - mz * Math.sin(angle);
    const rz = mx * Math.sin(angle) + mz * Math.cos(angle);

    const magnitude = Math.min(len, 1);
    const speed = 8;

    if (magnitude > 0.1) {
      posRef.current.x += rx * speed * dt;
      posRef.current.z += rz * speed * dt;
      posRef.current.x = Math.max(-25, Math.min(25, posRef.current.x));
      posRef.current.z = Math.max(-25, Math.min(25, posRef.current.z));
      facingAngle.current = Math.atan2(rx, rz);
      walkTime.current += dt * 8;
      isMoving.current = true;
    } else {
      isMoving.current = false;
    }

    groupRef.current.position.x = posRef.current.x;
    groupRef.current.position.z = posRef.current.z;
    groupRef.current.rotation.y = facingAngle.current;

    setPlayerPos(prev => {
      if (Math.abs(prev.x - posRef.current.x) > 0.5 || Math.abs(prev.z - posRef.current.z) > 0.5) {
        return { x: posRef.current.x, z: posRef.current.z };
      }
      return prev;
    });

    const wt = walkTime.current;
    const walkAmp = isMoving.current ? 0.35 : 0;

    // Legs
    const leftLeg = groupRef.current.getObjectByName('leftLeg');
    const rightLeg = groupRef.current.getObjectByName('rightLeg');
    if (leftLeg) leftLeg.rotation.x = Math.sin(wt) * walkAmp;
    if (rightLeg) rightLeg.rotation.x = -Math.sin(wt) * walkAmp;

    // Arms
    const leftArm = groupRef.current.getObjectByName('leftArm');
    const rightArm = groupRef.current.getObjectByName('rightArm');
    if (leftArm) leftArm.rotation.x = -Math.sin(wt) * walkAmp * 0.6;
    if (rightArm) rightArm.rotation.x = Math.sin(wt) * walkAmp * 0.6;

    // Body bob
    groupRef.current.position.y = isMoving.current ? Math.abs(Math.sin(wt * 2)) * 0.08 : 0;

    // Hair bounce
    if (hairRef.current) {
      hairRef.current.rotation.x = isMoving.current ? Math.sin(wt * 2) * 0.1 : 0;
      hairRef.current.rotation.z = isMoving.current ? Math.sin(wt * 3) * 0.05 : 0;
    }

    setShowEnterPrompt(!!nearBuilding);
  });

  React.useEffect(() => {
    const handleKey = (e) => {
      if ((e.code === 'Enter' || e.code === 'Space') && nearBuilding) {
        onEnterBuilding(nearBuilding);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nearBuilding, onEnterBuilding]);

  return (
    <group ref={groupRef}>
      {/* ─── TORSO (shirt) ─── */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.6, 0.55, 0.35]} />
        <ToonMaterial color={primaryHex} />
      </mesh>
      {/* Collar */}
      <mesh position={[0, 1.15, 0.05]}>
        <boxGeometry args={[0.35, 0.08, 0.25]} />
        <ToonMaterial color={secondaryHex} />
      </mesh>
      {/* Shirt stripe (horizontal band) */}
      <mesh position={[0, 0.9, 0.177]}>
        <boxGeometry args={[0.62, 0.15, 0.01]} />
        <ToonMaterial color={secondaryHex} />
      </mesh>
      {/* Back number (simplified as colored rectangle) */}
      <mesh position={[0, 0.95, -0.177]}>
        <planeGeometry args={[0.2, 0.25]} />
        <meshBasicMaterial color={secondaryHex} />
      </mesh>
      {/* Shirt number detail dot */}
      <mesh position={[0, 0.95, -0.18]}>
        <planeGeometry args={[0.12, 0.06]} />
        <meshBasicMaterial color={primaryHex} />
      </mesh>

      {/* ─── HEAD ─── */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <sphereGeometry args={[0.25, 14, 12]} />
        <ToonMaterial color={skinColor} />
      </mesh>
      {/* Ears */}
      {[-0.24, 0.24].map((x, i) => (
        <mesh key={i} position={[x, 1.43, 0]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <ToonMaterial color={skinColor} />
        </mesh>
      ))}
      {/* Eyes */}
      {[-0.08, 0.08].map((x, i) => (
        <group key={`eye${i}`}>
          <mesh position={[x, 1.48, 0.22]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[x, 1.48, 0.25]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshBasicMaterial color="#1A1A1A" />
          </mesh>
          {/* Pupil highlight */}
          <mesh position={[x + 0.01, 1.49, 0.27]}>
            <sphereGeometry args={[0.008, 4, 4]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
      ))}
      {/* Eyebrows */}
      {[-0.08, 0.08].map((x, i) => (
        <mesh key={`brow${i}`} position={[x, 1.53, 0.23]} rotation={[0, 0, i === 0 ? 0.1 : -0.1]}>
          <boxGeometry args={[0.08, 0.02, 0.01]} />
          <meshBasicMaterial color={hairColor} />
        </mesh>
      ))}
      {/* Nose */}
      <mesh position={[0, 1.44, 0.26]}>
        <sphereGeometry args={[0.025, 6, 5]} />
        <ToonMaterial color="#E8B897" />
      </mesh>
      {/* Mouth */}
      <mesh position={[0, 1.38, 0.24]}>
        <boxGeometry args={[0.06, 0.015, 0.01]} />
        <meshBasicMaterial color="#C62828" />
      </mesh>

      {/* ─── HAIR (animated) ─── */}
      <group ref={hairRef}>
        <mesh position={[0, 1.62, -0.03]} castShadow>
          <sphereGeometry args={[0.23, 10, 8]} />
          <ToonMaterial color={hairColor} />
        </mesh>
        {/* Spiky hair tufts */}
        <mesh position={[0, 1.72, 0.05]} rotation={[0.2, 0, 0]}>
          <coneGeometry args={[0.06, 0.12, 5]} />
          <ToonMaterial color={hairColor} />
        </mesh>
        <mesh position={[-0.08, 1.7, -0.02]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.05, 0.1, 5]} />
          <ToonMaterial color={hairColor} />
        </mesh>
        <mesh position={[0.08, 1.7, -0.02]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[0.05, 0.1, 5]} />
          <ToonMaterial color={hairColor} />
        </mesh>
      </group>

      {/* ─── LEFT ARM ─── */}
      <group name="leftArm" position={[-0.4, 0.95, 0]}>
        {/* Sleeve */}
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.25, 0.18]} />
          <ToonMaterial color={primaryHex} />
        </mesh>
        {/* Sleeve trim */}
        <mesh position={[0, -0.12, 0]}>
          <boxGeometry args={[0.19, 0.04, 0.19]} />
          <ToonMaterial color={secondaryHex} />
        </mesh>
        {/* Forearm (skin) */}
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.14, 0.15, 0.14]} />
          <ToonMaterial color={skinColor} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.33, 0]}>
          <sphereGeometry args={[0.06, 6, 5]} />
          <ToonMaterial color={skinColor} />
        </mesh>
      </group>

      {/* ─── RIGHT ARM ─── */}
      <group name="rightArm" position={[0.4, 0.95, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.25, 0.18]} />
          <ToonMaterial color={primaryHex} />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <boxGeometry args={[0.19, 0.04, 0.19]} />
          <ToonMaterial color={secondaryHex} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.14, 0.15, 0.14]} />
          <ToonMaterial color={skinColor} />
        </mesh>
        <mesh position={[0, -0.33, 0]}>
          <sphereGeometry args={[0.06, 6, 5]} />
          <ToonMaterial color={skinColor} />
        </mesh>
      </group>

      {/* ─── LEFT LEG ─── */}
      <group name="leftLeg" position={[-0.15, 0.45, 0]}>
        {/* Shorts */}
        <mesh position={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[0.2, 0.25, 0.2]} />
          <ToonMaterial color={secondaryHex} />
        </mesh>
        {/* Shorts trim */}
        <mesh position={[0, -0.07, 0]}>
          <boxGeometry args={[0.21, 0.03, 0.21]} />
          <ToonMaterial color={primaryHex} />
        </mesh>
        {/* Knee/skin */}
        <mesh position={[0, -0.12, 0]}>
          <boxGeometry args={[0.16, 0.08, 0.16]} />
          <ToonMaterial color={skinColor} />
        </mesh>
        {/* Sock */}
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.17, 0.14, 0.17]} />
          <ToonMaterial color={sockColor} />
        </mesh>
        {/* Sock stripe */}
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[0.175, 0.03, 0.175]} />
          <ToonMaterial color={primaryHex} />
        </mesh>
        {/* Shin guard bump */}
        <mesh position={[0, -0.2, 0.08]}>
          <boxGeometry args={[0.1, 0.1, 0.03]} />
          <ToonMaterial color={sockColor} />
        </mesh>
        {/* Boot */}
        <mesh position={[0, -0.32, 0.03]}>
          <boxGeometry args={[0.18, 0.1, 0.26]} />
          <ToonMaterial color={shoeColor} />
        </mesh>
        {/* Boot sole */}
        <mesh position={[0, -0.37, 0.03]}>
          <boxGeometry args={[0.19, 0.02, 0.27]} />
          <ToonMaterial color="#37474F" />
        </mesh>
        {/* Boot studs hint */}
        <mesh position={[0, -0.38, 0.03]}>
          <boxGeometry args={[0.14, 0.01, 0.2]} />
          <ToonMaterial color="#FFD700" />
        </mesh>
      </group>

      {/* ─── RIGHT LEG ─── */}
      <group name="rightLeg" position={[0.15, 0.45, 0]}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[0.2, 0.25, 0.2]} />
          <ToonMaterial color={secondaryHex} />
        </mesh>
        <mesh position={[0, -0.07, 0]}>
          <boxGeometry args={[0.21, 0.03, 0.21]} />
          <ToonMaterial color={primaryHex} />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <boxGeometry args={[0.16, 0.08, 0.16]} />
          <ToonMaterial color={skinColor} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.17, 0.14, 0.17]} />
          <ToonMaterial color={sockColor} />
        </mesh>
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[0.175, 0.03, 0.175]} />
          <ToonMaterial color={primaryHex} />
        </mesh>
        <mesh position={[0, -0.2, 0.08]}>
          <boxGeometry args={[0.1, 0.1, 0.03]} />
          <ToonMaterial color={sockColor} />
        </mesh>
        <mesh position={[0, -0.32, 0.03]}>
          <boxGeometry args={[0.18, 0.1, 0.26]} />
          <ToonMaterial color={shoeColor} />
        </mesh>
        <mesh position={[0, -0.37, 0.03]}>
          <boxGeometry args={[0.19, 0.02, 0.27]} />
          <ToonMaterial color="#37474F" />
        </mesh>
        <mesh position={[0, -0.38, 0.03]}>
          <boxGeometry args={[0.14, 0.01, 0.2]} />
          <ToonMaterial color="#FFD700" />
        </mesh>
      </group>

      {/* Enter prompt */}
      {showEnterPrompt && (
        <group position={[0, 2.2, 0]}>
          <sprite scale={[1.8, 0.55, 1]}>
            <spriteMaterial color="#1565C0" opacity={0.9} transparent />
          </sprite>
          <sprite scale={[1.5, 0.3, 1]}>
            <spriteMaterial color="#FFFFFF" opacity={0.8} transparent />
          </sprite>
        </group>
      )}

      {/* Ground shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#000000" opacity={0.2} transparent />
      </mesh>

      {/* Cel-shading outline */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.66, 1.9, 0.41]} />
        <meshBasicMaterial color="#1A1A1A" side={THREE.BackSide} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

const keyState = {};
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { keyState[e.code] = true; });
  window.addEventListener('keyup', (e) => { keyState[e.code] = false; });
}
