/**
 * CityGround.jsx — Premium ground with cobblestone plaza, textured roads, sidewalks, crosswalks
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';

function CobblestonePattern({ position, radius, density = 12 }) {
  const stones = useMemo(() => {
    const result = [];
    for (let x = -radius; x <= radius; x += 0.35) {
      for (let z = -radius; z <= radius; z += 0.35) {
        const dist = Math.sqrt(x * x + z * z);
        if (dist > radius) continue;
        const offset = (Math.floor(z / 0.35) % 2) * 0.17;
        const shade = 0.55 + Math.random() * 0.2;
        result.push({
          x: x + offset + (Math.random() - 0.5) * 0.05,
          z: z + (Math.random() - 0.5) * 0.05,
          shade,
          sx: 0.28 + Math.random() * 0.06,
          sz: 0.28 + Math.random() * 0.06,
        });
      }
    }
    return result;
  }, [radius, density]);

  // Use instanced mesh for performance
  const meshRef = React.useRef();
  const count = stones.length;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  React.useEffect(() => {
    if (!meshRef.current) return;
    stones.forEach((s, i) => {
      dummy.position.set(s.x, 0.02, s.z);
      dummy.scale.set(s.sx, 0.04, s.sz);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      // Vary color
      const c = new THREE.Color().setHSL(0.07, 0.1, s.shade);
      meshRef.current.setColorAt(i, c);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [stones, dummy]);

  return (
    <group position={position}>
      <instancedMesh ref={meshRef} args={[null, null, count]} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color="#9E9E9E" />
      </instancedMesh>
    </group>
  );
}

function GrassPatches({ bounds, weather }) {
  const patches = useMemo(() => {
    const result = [];
    const baseColor = weather === 'snow' ? '#E0E0E0' : '#558B2F';
    // Create varying grass color patches
    for (let x = -bounds; x <= bounds; x += 2) {
      for (let z = -bounds; z <= bounds; z += 2) {
        // Skip road areas
        if (Math.abs(x) < 2 && Math.abs(z) < 28) continue;
        if (Math.abs(z) < 2 && Math.abs(x) < 28) continue;
        // Skip plaza area
        if (Math.sqrt(x * x + (z - 2) * (z - 2)) < 6) continue;

        const hueShift = Math.random() * 0.03;
        const lightShift = Math.random() * 0.15;
        result.push({ x, z, hueShift, lightShift });
      }
    }
    return result;
  }, [bounds, weather]);

  const meshRef = React.useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  React.useEffect(() => {
    if (!meshRef.current) return;
    patches.forEach((p, i) => {
      dummy.position.set(p.x, -0.01, p.z);
      dummy.scale.set(2 + Math.random() * 0.5, 0.02, 2 + Math.random() * 0.5);
      dummy.rotation.set(0, Math.random() * 0.2, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      const c = weather === 'snow'
        ? new THREE.Color().setHSL(0, 0, 0.85 + p.lightShift * 0.1)
        : new THREE.Color().setHSL(0.25 + p.hueShift, 0.6, 0.3 + p.lightShift);
      meshRef.current.setColorAt(i, c);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [patches, dummy, weather]);

  if (patches.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, patches.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshToonMaterial color={weather === 'snow' ? '#E0E0E0' : '#558B2F'} />
    </instancedMesh>
  );
}

function RoadMarkings({ roadWidth }) {
  return (
    <group>
      {/* Center dashed lines - N/S */}
      {Array.from({ length: 25 }).map((_, i) => (
        <mesh key={`ns${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -24 + i * 2]} receiveShadow>
          <planeGeometry args={[0.08, 0.8]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      ))}
      {/* Center dashed lines - E/W */}
      {Array.from({ length: 25 }).map((_, i) => (
        <mesh key={`ew${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-24 + i * 2, 0.04, 0]} receiveShadow>
          <planeGeometry args={[0.8, 0.08]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      ))}
      {/* Road edge lines (solid white) */}
      {[roadWidth / 2 - 0.1, -roadWidth / 2 + 0.1].map((x, i) => (
        <mesh key={`edgeNS${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.04, 0]} receiveShadow>
          <planeGeometry args={[0.06, 50]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      ))}
      {[roadWidth / 2 - 0.1, -roadWidth / 2 + 0.1].map((z, i) => (
        <mesh key={`edgeEW${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, z]} receiveShadow>
          <planeGeometry args={[50, 0.06]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      ))}
    </group>
  );
}

function Crosswalk({ position, rotation = 0, width = 3 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-width / 2 + 0.3 + i * (width / 6), 0.04, 0]} receiveShadow>
          <planeGeometry args={[0.35, 1.2]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      ))}
    </group>
  );
}

function DrainCover({ position }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.2, 8]} />
        <meshToonMaterial color="#37474F" />
      </mesh>
      {/* Grate lines */}
      {[-0.08, 0, 0.08].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.035, 0]}>
          <planeGeometry args={[0.02, 0.3]} />
          <meshBasicMaterial color="#263238" />
        </mesh>
      ))}
    </group>
  );
}

function Sidewalk({ position, size }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshToonMaterial color="#D7CCC8" />
    </mesh>
  );
}

export function CityGround({ cityLevel, teamColors, weather }) {
  const grassColor = weather === 'snow' ? '#E0E0E0' : '#558B2F';
  const roadColor = '#424242';
  const roadWidth = 2.0 + cityLevel * 0.15;

  return (
    <group>
      {/* Main ground plane (grass base) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshToonMaterial color={grassColor} />
      </mesh>

      {/* Varied grass patches for texture */}
      <GrassPatches bounds={28} weather={weather} />

      {/* Central cobblestone plaza */}
      <CobblestonePattern position={[0, 0, 2]} radius={5 + cityLevel * 0.3} />
      {/* Plaza border ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 2]}>
        <ringGeometry args={[4.8 + cityLevel * 0.3, 5.1 + cityLevel * 0.3, 32]} />
        <meshToonMaterial color="#795548" />
      </mesh>

      {/* ─── ROADS ─── */}
      {/* North-South road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[roadWidth, 56]} />
        <meshToonMaterial color={roadColor} />
      </mesh>
      {/* Subtle road texture variation */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={`rv${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[(Math.random() - 0.5) * roadWidth * 0.8, 0.015, (Math.random() - 0.5) * 50]}>
          <planeGeometry args={[0.5 + Math.random(), 0.3 + Math.random()]} />
          <meshToonMaterial color="#4E4E4E" />
        </mesh>
      ))}
      {/* East-West road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[56, roadWidth]} />
        <meshToonMaterial color={roadColor} />
      </mesh>

      {/* Road markings */}
      <RoadMarkings roadWidth={roadWidth} />

      {/* Crosswalks at intersections */}
      <Crosswalk position={[0, 0, roadWidth / 2 + 0.8]} rotation={0} width={roadWidth} />
      <Crosswalk position={[0, 0, -roadWidth / 2 - 0.8]} rotation={0} width={roadWidth} />
      <Crosswalk position={[roadWidth / 2 + 0.8, 0, 0]} rotation={Math.PI / 2} width={roadWidth} />
      <Crosswalk position={[-roadWidth / 2 - 0.8, 0, 0]} rotation={Math.PI / 2} width={roadWidth} />

      {/* Additional crosswalks near buildings */}
      <Crosswalk position={[0, 0, -8]} rotation={0} width={roadWidth} />
      <Crosswalk position={[0, 0, 8]} rotation={0} width={roadWidth} />
      <Crosswalk position={[8, 0, 0]} rotation={Math.PI / 2} width={roadWidth} />
      <Crosswalk position={[-8, 0, 0]} rotation={Math.PI / 2} width={roadWidth} />

      {/* ─── SIDEWALKS (curbs) ─── */}
      {/* Along N-S road */}
      <Sidewalk position={[roadWidth / 2 + 0.4, 0.06, 0]} size={[0.8, 0.14, 56]} />
      <Sidewalk position={[-roadWidth / 2 - 0.4, 0.06, 0]} size={[0.8, 0.14, 56]} />
      {/* Along E-W road */}
      <Sidewalk position={[0, 0.06, roadWidth / 2 + 0.4]} size={[56, 0.14, 0.8]} />
      <Sidewalk position={[0, 0.06, -roadWidth / 2 - 0.4]} size={[56, 0.14, 0.8]} />

      {/* Drain covers */}
      <DrainCover position={[roadWidth / 2 - 0.3, 0, 5]} />
      <DrainCover position={[-roadWidth / 2 + 0.3, 0, -5]} />
      <DrainCover position={[5, 0, roadWidth / 2 - 0.3]} />
      <DrainCover position={[-5, 0, -roadWidth / 2 + 0.3]} />
      <DrainCover position={[roadWidth / 2 - 0.3, 0, 12]} />
      <DrainCover position={[-roadWidth / 2 + 0.3, 0, -12]} />

      {/* Secondary paths to buildings */}
      {cityLevel >= 2 && (
        <>
          {/* Path to stadium */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -6]} receiveShadow>
            <planeGeometry args={[1.2, 8]} />
            <meshToonMaterial color="#8D6E63" />
          </mesh>
          {/* Path to training center */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6, 0.015, -2]} receiveShadow>
            <planeGeometry args={[8, 1]} />
            <meshToonMaterial color="#8D6E63" />
          </mesh>
          {/* Path to transfer office */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6, 0.015, -2]} receiveShadow>
            <planeGeometry args={[8, 1]} />
            <meshToonMaterial color="#8D6E63" />
          </mesh>
        </>
      )}

      {/* Parking lot near stadium */}
      <group position={[6, 0, -14]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
          <planeGeometry args={[5, 4]} />
          <meshToonMaterial color="#616161" />
        </mesh>
        {/* Parking lines */}
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={`pk${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-2 + i * 0.9, 0.02, 0]} receiveShadow>
            <planeGeometry args={[0.04, 3]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
        {/* Handicap symbol area */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, 0.02, 0]}>
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial color="#1565C0" transparent opacity={0.5} />
        </mesh>
      </group>

      {/* Deterioration for low levels */}
      {cityLevel <= 1 && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.025, 5]} receiveShadow>
            <planeGeometry args={[2, 1.5]} />
            <meshToonMaterial color="#795548" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-7, 0.025, -3]} receiveShadow>
            <planeGeometry args={[1.5, 1]} />
            <meshToonMaterial color="#5D4037" />
          </mesh>
          {/* Cracks */}
          {[[3, 8], [-4, -6], [8, 3]].map(([x, z], i) => (
            <mesh key={`crack${i}`} rotation={[-Math.PI / 2, 0, Math.random()]} position={[x, 0.02, z]}>
              <planeGeometry args={[0.05, 1 + Math.random()]} />
              <meshBasicMaterial color="#3E2723" />
            </mesh>
          ))}
        </>
      )}

      {/* Manhole covers on roads */}
      {[[3, 3], [-5, -7], [10, 0], [-10, 0]].map(([x, z], i) => (
        <group key={`mh${i}`} position={[x, 0, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
            <circleGeometry args={[0.3, 12]} />
            <meshToonMaterial color="#455A64" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.028, 0]}>
            <ringGeometry args={[0.2, 0.25, 12]} />
            <meshToonMaterial color="#37474F" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
