/**
 * PlayerCharacter.jsx — Cartoon player character with club kit, WASD/joystick movement
 */
import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Cel-shading toon material
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
  posRef,
  movementRef,
  teamColors,
  setPlayerPos,
  nearBuilding,
  onEnterBuilding,
}) {
  const groupRef = useRef();
  const walkTime = useRef(0);
  const facingAngle = useRef(0);
  const isMoving = useRef(false);
  const [showEnterPrompt, setShowEnterPrompt] = useState(false);

  const primaryHex = useMemo(() => '#' + teamColors.primary.getHexString(), [teamColors.primary]);
  const secondaryHex = useMemo(() => '#' + teamColors.secondary.getHexString(), [teamColors.secondary]);
  const skinColor = '#F5CBA7';
  const hairColor = '#3E2723';
  const shoeColor = '#1A1A1A';

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    const mv = movementRef.current;
    
    // Get input
    let mx = mv.x || 0;
    let mz = mv.z || 0;
    
    // Also listen for keyboard
    const keys = keyState;
    if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
    
    // Clamp
    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 1) { mx /= len; mz /= len; }
    
    // Rotate to isometric axes
    const angle = -Math.PI / 4;
    const rx = mx * Math.cos(angle) - mz * Math.sin(angle);
    const rz = mx * Math.sin(angle) + mz * Math.cos(angle);
    
    const magnitude = Math.min(len, 1);
    const speed = 8;
    
    if (magnitude > 0.1) {
      posRef.current.x += rx * speed * dt;
      posRef.current.z += rz * speed * dt;
      
      // Clamp to city bounds
      posRef.current.x = Math.max(-25, Math.min(25, posRef.current.x));
      posRef.current.z = Math.max(-25, Math.min(25, posRef.current.z));
      
      facingAngle.current = Math.atan2(rx, rz);
      walkTime.current += dt * 8;
      isMoving.current = true;
    } else {
      isMoving.current = false;
    }
    
    // Position
    groupRef.current.position.x = posRef.current.x;
    groupRef.current.position.z = posRef.current.z;
    groupRef.current.position.y = 0;
    
    // Rotation
    groupRef.current.rotation.y = facingAngle.current;
    
    // Update parent state (throttled)
    setPlayerPos(prev => {
      if (Math.abs(prev.x - posRef.current.x) > 0.5 || Math.abs(prev.z - posRef.current.z) > 0.5) {
        return { x: posRef.current.x, z: posRef.current.z };
      }
      return prev;
    });
    
    // Walk animation
    const wt = walkTime.current;
    const walkAmp = isMoving.current ? 0.3 : 0;
    
    // Legs swing
    if (groupRef.current.children[5]) { // left leg
      groupRef.current.children[5].rotation.x = Math.sin(wt) * walkAmp;
    }
    if (groupRef.current.children[6]) { // right leg
      groupRef.current.children[6].rotation.x = -Math.sin(wt) * walkAmp;
    }
    // Arms swing
    if (groupRef.current.children[3]) { // left arm
      groupRef.current.children[3].rotation.x = -Math.sin(wt) * walkAmp * 0.6;
    }
    if (groupRef.current.children[4]) { // right arm
      groupRef.current.children[4].rotation.x = Math.sin(wt) * walkAmp * 0.6;
    }
    // Body bob
    groupRef.current.position.y = isMoving.current ? Math.abs(Math.sin(wt * 2)) * 0.08 : 0;

    // Show enter prompt when near building
    setShowEnterPrompt(!!nearBuilding);
  });

  // Handle Enter key to enter buildings
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
      {/* Body (torso) - club shirt */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.6, 0.6, 0.35]} />
        <ToonMaterial color={primaryHex} />
      </mesh>
      
      {/* Shirt stripes/secondary color band */}
      <mesh position={[0, 0.9, 0.176]} castShadow>
        <boxGeometry args={[0.62, 0.2, 0.01]} />
        <ToonMaterial color={secondaryHex} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <sphereGeometry args={[0.25, 12, 10]} />
        <ToonMaterial color={skinColor} />
      </mesh>
      
      {/* Left arm */}
      <group position={[-0.4, 0.95, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.5, 0.18]} />
          <ToonMaterial color={primaryHex} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <ToonMaterial color={skinColor} />
        </mesh>
      </group>
      
      {/* Right arm */}
      <group position={[0.4, 0.95, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.5, 0.18]} />
          <ToonMaterial color={primaryHex} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <ToonMaterial color={skinColor} />
        </mesh>
      </group>
      
      {/* Left leg */}
      <group position={[-0.15, 0.35, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.45, 0.2]} />
          <ToonMaterial color={secondaryHex} />
        </mesh>
        <mesh position={[0, -0.28, 0.02]}>
          <boxGeometry args={[0.18, 0.12, 0.24]} />
          <ToonMaterial color={shoeColor} />
        </mesh>
      </group>
      
      {/* Right leg */}
      <group position={[0.15, 0.35, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.45, 0.2]} />
          <ToonMaterial color={secondaryHex} />
        </mesh>
        <mesh position={[0, -0.28, 0.02]}>
          <boxGeometry args={[0.18, 0.12, 0.24]} />
          <ToonMaterial color={shoeColor} />
        </mesh>
      </group>
      
      {/* Hair */}
      <mesh position={[0, 1.62, -0.05]} castShadow>
        <sphereGeometry args={[0.22, 10, 8]} />
        <ToonMaterial color={hairColor} />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.08, 1.48, 0.22]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0.08, 1.48, 0.22]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-0.08, 1.48, 0.245]}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshBasicMaterial color="#1A1A1A" />
      </mesh>
      <mesh position={[0.08, 1.48, 0.245]}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshBasicMaterial color="#1A1A1A" />
      </mesh>

      {/* Enter prompt floating above head */}
      {showEnterPrompt && (
        <sprite position={[0, 2.2, 0]} scale={[1.5, 0.5, 1]}>
          <spriteMaterial color="#FFFFFF" opacity={0.9} transparent />
        </sprite>
      )}

      {/* Shadow on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial color="#000000" opacity={0.2} transparent />
      </mesh>
    </group>
  );
}

// Keyboard state (shared)
const keyState = {};
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { keyState[e.code] = true; });
  window.addEventListener('keyup', (e) => { keyState[e.code] = false; });
}
