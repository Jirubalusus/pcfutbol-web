import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Environment, ContactShadows, Sky } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════
// COLOR HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const shade = (hex, factor) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return '#' + c.getHexString();
};

// ═══════════════════════════════════════════════════════════════════════════
// PITCH — striped grass, full FIFA markings, goals, corner flags
// ═══════════════════════════════════════════════════════════════════════════
const PITCH_W = 105;
const PITCH_H = 68;
const LINE_COLOR = '#f2f2f2';
const LINE_THICK = 0.22;

// Vertical decal stack — each layer is separated by a healthy gap to avoid
// z-fighting at oblique camera angles. Decals also use negative polygonOffset
// so the GPU biases them toward the camera, robustly preventing flicker even
// when two layers share a Y value at a glancing angle.
const Y_GROUND = 0;
const Y_MID_GRASS = 0.05;
const Y_PLAZA = 0.10;
const Y_PLAZA_BAND = 0.12;
const Y_ROAD = 0.14;
const Y_PARKING = 0.16;
const Y_PITCH_SURROUND = 0.20;
const Y_PITCH_TRACK = 0.24;
const Y_PITCH_BASE = 0.28;
const Y_PITCH_STRIPES = 0.32;
const LINE_Y = 0.38;

function Line({ size, position }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial
        color={LINE_COLOR}
        roughness={0.6}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  );
}

function Ring({ inner, outer, position, segments = 96, start = 0, length = Math.PI * 2 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <ringGeometry args={[inner, outer, segments, 1, start, length]} />
      <meshStandardMaterial
        color={LINE_COLOR}
        roughness={0.6}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  );
}

function Spot({ position, radius = 0.25 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <circleGeometry args={[radius, 20]} />
      <meshStandardMaterial
        color={LINE_COLOR}
        roughness={0.6}
        polygonOffset
        polygonOffsetFactor={-5}
        polygonOffsetUnits={-5}
      />
    </mesh>
  );
}

function FieldMarkings() {
  const y = LINE_Y;
  const half = LINE_THICK / 2;
  return (
    <group>
      {/* Perimeter */}
      <Line size={[PITCH_W, LINE_THICK]} position={[0, y, -PITCH_H / 2 + half]} />
      <Line size={[PITCH_W, LINE_THICK]} position={[0, y, PITCH_H / 2 - half]} />
      <Line size={[LINE_THICK, PITCH_H]} position={[-PITCH_W / 2 + half, y, 0]} />
      <Line size={[LINE_THICK, PITCH_H]} position={[PITCH_W / 2 - half, y, 0]} />
      {/* Center line */}
      <Line size={[LINE_THICK, PITCH_H]} position={[0, y, 0]} />
      {/* Center circle + spot */}
      <Ring inner={9.15 - half} outer={9.15 + half} position={[0, y, 0]} />
      <Spot position={[0, y, 0]} radius={0.3} />

      {/* Penalty & goal areas on both ends */}
      {[-1, 1].map((side) => {
        const xEdge = side * (PITCH_W / 2);
        const xPenInner = xEdge - side * 16.5;
        const xGoalInner = xEdge - side * 5.5;
        const penCenterX = (xEdge + xPenInner) / 2;
        const goalCenterX = (xEdge + xGoalInner) / 2;
        return (
          <group key={side}>
            {/* Penalty area box */}
            <Line size={[LINE_THICK, 40.3]} position={[xPenInner, y, 0]} />
            <Line size={[16.5, LINE_THICK]} position={[penCenterX, y, -20.15 + half]} />
            <Line size={[16.5, LINE_THICK]} position={[penCenterX, y, 20.15 - half]} />
            {/* Goal area (6-yard box) */}
            <Line size={[LINE_THICK, 18.32]} position={[xGoalInner, y, 0]} />
            <Line size={[5.5, LINE_THICK]} position={[goalCenterX, y, -9.16 + half]} />
            <Line size={[5.5, LINE_THICK]} position={[goalCenterX, y, 9.16 - half]} />
            {/* Penalty spot */}
            <Spot position={[xEdge - side * 11, y, 0]} radius={0.25} />
          </group>
        );
      })}
    </group>
  );
}

function CornerFlags() {
  const positions = [
    [-PITCH_W / 2, -PITCH_H / 2],
    [PITCH_W / 2, -PITCH_H / 2],
    [-PITCH_W / 2, PITCH_H / 2],
    [PITCH_W / 2, PITCH_H / 2],
  ];
  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.25, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 2.5, 6]} />
            <meshStandardMaterial color="#eeeeee" />
          </mesh>
          <mesh position={[0.35 * (x < 0 ? 1 : -1), 2.1, 0]} castShadow>
            <boxGeometry args={[0.6, 0.32, 0.04]} />
            <meshStandardMaterial color="#ff3344" emissive="#5a1014" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Goal({ x, side }) {
  // x = ±52.5, side = -1 (left goal, posts face +x) or +1 (right goal, posts face -x)
  const height = 2.44;
  const width = 7.32;
  const depth = 2.2;
  const postR = 0.08;
  const white = '#f5f5f5';
  return (
    <group position={[x, 0, 0]}>
      {/* Posts */}
      <mesh position={[0, height / 2, -width / 2]} castShadow>
        <cylinderGeometry args={[postR, postR, height, 10]} />
        <meshStandardMaterial color={white} roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[0, height / 2, width / 2]} castShadow>
        <cylinderGeometry args={[postR, postR, height, 10]} />
        <meshStandardMaterial color={white} roughness={0.45} metalness={0.15} />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[postR, postR, width, 10]} />
        <meshStandardMaterial color={white} roughness={0.45} metalness={0.15} />
      </mesh>
      {/* Back frame top */}
      <mesh position={[side * depth, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[postR * 0.7, postR * 0.7, width, 8]} />
        <meshStandardMaterial color={white} />
      </mesh>
      {/* Net back panel */}
      <mesh position={[side * depth * 0.5, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#dcdcdc"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          roughness={0.9}
        />
      </mesh>
      {/* Net top slope */}
      <mesh
        position={[side * depth * 0.5, height + 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[depth, width]} />
        <meshStandardMaterial
          color="#dcdcdc"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          roughness={0.9}
        />
      </mesh>
    </group>
  );
}

function Pitch({ grassCondition = 100 }) {
  const { baseColor, stripeColor, edgeColor } = useMemo(() => {
    const healthy = new THREE.Color(0x2f7a36);
    const unhealthy = new THREE.Color(0x8d7a4c);
    const t = (100 - grassCondition) / 100;
    const base = healthy.clone().lerp(unhealthy, t);
    const stripe = base.clone().multiplyScalar(1.22);
    const edge = base.clone().multiplyScalar(0.78);
    return {
      baseColor: '#' + base.getHexString(),
      stripeColor: '#' + stripe.getHexString(),
      edgeColor: '#' + edge.getHexString(),
    };
  }, [grassCondition]);

  const stripes = useMemo(() => {
    const count = 18;
    const w = PITCH_W / count;
    return Array.from({ length: count }, (_, i) => ({
      x: -PITCH_W / 2 + i * w + w / 2,
      w,
      color: i % 2 === 0 ? baseColor : stripeColor,
    }));
  }, [baseColor, stripeColor]);

  return (
    <group>
      {/* Grass surround (slightly larger, darker) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y_PITCH_SURROUND, 0]} receiveShadow>
        <planeGeometry args={[PITCH_W + 14, PITCH_H + 14]} />
        <meshStandardMaterial
          color={edgeColor}
          roughness={0.95}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      {/* Dirt track (athletics-style margin) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y_PITCH_TRACK, 0]} receiveShadow>
        <ringGeometry args={[Math.hypot(PITCH_W / 2, PITCH_H / 2) + 3, Math.hypot(PITCH_W / 2, PITCH_H / 2) + 7, 96]} />
        <meshStandardMaterial
          color="#9c6b3a"
          roughness={0.95}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      {/* Pitch base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y_PITCH_BASE, 0]} receiveShadow>
        <planeGeometry args={[PITCH_W, PITCH_H]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.9}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      {/* Mow stripes */}
      {stripes.map((s, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[s.x, Y_PITCH_STRIPES, 0]}
          receiveShadow
        >
          <planeGeometry args={[s.w, PITCH_H]} />
          <meshStandardMaterial
            color={s.color}
            roughness={0.95}
            polygonOffset
            polygonOffsetFactor={-3}
            polygonOffsetUnits={-3}
          />
        </mesh>
      ))}
      <FieldMarkings />
      <CornerFlags />
      <Goal x={-PITCH_W / 2} side={-1} />
      <Goal x={PITCH_W / 2} side={1} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STANDS — stepped terraces with seat color variation
// ═══════════════════════════════════════════════════════════════════════════
function SeatedStand({
  position,
  rotation,
  width,
  height,
  depth = 18,
  color = '#1a4a6e',
  hasRoof = false,
  roofColor = '#2a3140',
}) {
  const rowCount = Math.max(8, Math.floor(height / 1.2));
  const rowHeight = 1.0;
  const rowDepth = depth / rowCount;
  const seatRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < rowCount; i++) {
      rows.push({
        y: i * rowHeight + rowHeight / 2 + 1.2, // raised above concourse wall
        z: -(i + 0.5) * rowDepth - 1,
        color: i % 3 === 0 ? shade(color, 1.2) : i % 3 === 1 ? color : shade(color, 0.85),
      });
    }
    return rows;
  }, [rowCount, rowDepth, color]);

  return (
    <group position={position} rotation={rotation}>
      {/* Concourse wall (front, perimeter fence) */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 1.8, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      {/* Advertising boards — placed in front of the concourse wall with a
          healthy gap so its back face never collides with the wall's front. */}
      <mesh position={[0, 0.55, 0.38]} castShadow>
        <boxGeometry args={[width * 0.98, 1.1, 0.08]} />
        <meshStandardMaterial
          color="#2b2b2b"
          emissive="#4a5e9e"
          emissiveIntensity={0.35}
          roughness={0.4}
        />
      </mesh>
      {/* Stepped seat rows */}
      {seatRows.map((r, i) => (
        <mesh key={i} position={[0, r.y, r.z]} castShadow receiveShadow>
          <boxGeometry args={[width, rowHeight, rowDepth + 0.05]} />
          <meshStandardMaterial color={r.color} roughness={0.85} />
        </mesh>
      ))}
      {/* Mid-tier walkway stripe */}
      <mesh
        position={[0, rowCount * rowHeight * 0.5 + 1.2, -rowCount * rowDepth * 0.5 - 1]}
        castShadow
      >
        <boxGeometry args={[width, 0.15, rowDepth * 1.3]} />
        <meshStandardMaterial color="#d8d8d8" roughness={0.8} />
      </mesh>
      {/* Outer back wall (exterior facade panel from this side) */}
      <mesh position={[0, height * 0.55 + 1.5, -depth - 1]} castShadow receiveShadow>
        <boxGeometry args={[width + 2, height * 1.3 + 3, 1.2]} />
        <meshStandardMaterial color={shade(color, 0.55)} roughness={0.75} metalness={0.1} />
      </mesh>
      {/* Facade accent band */}
      <mesh position={[0, height * 1.2 + 3, -depth - 0.4]}>
        <boxGeometry args={[width + 2.1, 0.8, 0.4]} />
        <meshStandardMaterial
          color={shade(color, 1.4)}
          emissive={shade(color, 1.6)}
          emissiveIntensity={0.45}
          roughness={0.45}
        />
      </mesh>
      {/* Roof */}
      {hasRoof && (
        <group>
          <mesh
            position={[0, height + 4, -depth / 2]}
            rotation={[0.18, 0, 0]}
            castShadow
          >
            <boxGeometry args={[width + 1.5, 0.5, depth + 3]} />
            <meshStandardMaterial
              color={roofColor}
              metalness={0.6}
              roughness={0.35}
            />
          </mesh>
          {/* Roof front truss */}
          <mesh position={[0, height + 3.5, 0.6]} castShadow>
            <boxGeometry args={[width + 1, 0.35, 0.35]} />
            <meshStandardMaterial color="#c8ccd4" metalness={0.7} roughness={0.25} />
          </mesh>
          {/* Roof supports */}
          {[-0.3, 0.3].map((f, i) => (
            <mesh
              key={i}
              position={[width * f, height + 1.5, -depth * 0.35]}
              rotation={[0.35, 0, 0]}
              castShadow
            >
              <boxGeometry args={[0.4, height * 0.4, 0.4]} />
              <meshStandardMaterial color="#b0b4bc" metalness={0.65} roughness={0.35} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function CornerInfill({ position, rotation, height, color, hasRoof }) {
  const rowCount = Math.max(6, Math.floor(height / 1.4));
  const rowHeight = 1.0;
  const rowDepth = 1.5;
  const width = 14;
  return (
    <group position={position} rotation={rotation}>
      {/* Concourse wall */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[width, 1.8, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      {/* Stepped rows */}
      {Array.from({ length: rowCount }).map((_, i) => (
        <mesh
          key={i}
          position={[0, i * rowHeight + 1.7, -(i + 0.5) * rowDepth - 1]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width, rowHeight, rowDepth + 0.04]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? color : shade(color, 1.15)}
            roughness={0.85}
          />
        </mesh>
      ))}
      {/* Outer wall */}
      <mesh
        position={[0, height * 0.55 + 1.5, -rowCount * rowDepth - 1.5]}
        castShadow
      >
        <boxGeometry args={[width + 2, height * 1.3 + 3, 1.2]} />
        <meshStandardMaterial color={shade(color, 0.55)} roughness={0.75} />
      </mesh>
      {hasRoof && (
        <mesh
          position={[0, height + 4, -rowCount * rowDepth * 0.5 - 1]}
          rotation={[0.18, 0, 0]}
          castShadow
        >
          <boxGeometry args={[width + 1.5, 0.4, rowCount * rowDepth + 2]} />
          <meshStandardMaterial color="#2a3140" metalness={0.6} roughness={0.35} />
        </mesh>
      )}
    </group>
  );
}

function FloodlightTower({ position, height, intensity }) {
  return (
    <group position={position}>
      {/* Concrete base */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.2, 2.4]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
      </mesh>
      {/* Pylon */}
      <mesh position={[0, height / 2 + 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.7, height, 8]} />
        <meshStandardMaterial color="#5a5e66" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, height + 1.2, 0]} castShadow>
        <boxGeometry args={[5, 0.3, 1.8]} />
        <meshStandardMaterial color="#3c4048" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Lamp array */}
      {[-1.8, -0.6, 0.6, 1.8].map((x, i) => (
        <mesh key={i} position={[x, height + 1.5, 0]} castShadow>
          <boxGeometry args={[0.8, 0.5, 1.2]} />
          <meshStandardMaterial
            color="#eef3ff"
            emissive="#fff5e0"
            emissiveIntensity={1.4}
            roughness={0.2}
          />
        </mesh>
      ))}
      {/* Actual light */}
      <pointLight
        position={[0, height + 1.8, 0]}
        intensity={intensity}
        distance={180}
        color="#fff5e0"
        decay={1.5}
      />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SURROUNDINGS — ground, paths, parking, houses, trees
// ═══════════════════════════════════════════════════════════════════════════
function House({ position, color, roofColor, height = 6, width = 8, depth = 8, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Body */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Roof (pyramid via cone) */}
      <mesh position={[0, height + 1.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[Math.max(width, depth) * 0.72, 2.6, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.8} />
      </mesh>
      {/* Windows suggestion (emissive stripes) — sit clearly in front of the
          facade with polygonOffset to prevent flicker at grazing angles. */}
      <mesh position={[0, height * 0.55, depth / 2 + 0.06]}>
        <planeGeometry args={[width * 0.72, height * 0.35]} />
        <meshStandardMaterial
          color="#2a2d3a"
          emissive="#ffd86b"
          emissiveIntensity={0.35}
          roughness={0.25}
          metalness={0.3}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
    </group>
  );
}

function Apartment({ position, color, height = 18, width = 10, depth = 10, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Flat roof cap */}
      <mesh position={[0, height + 0.3, 0]} castShadow>
        <boxGeometry args={[width + 0.4, 0.6, depth + 0.4]} />
        <meshStandardMaterial color={shade(color, 0.5)} roughness={0.9} />
      </mesh>
      {/* Window grid - emissive stripes, sit in front of the facade with
          polygonOffset so they never z-fight with the building body. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, height / 2, (depth / 2 + 0.08) * side]}>
          <planeGeometry args={[width * 0.85, height * 0.8]} />
          <meshStandardMaterial
            color="#1a1f2e"
            emissive="#a8c8ff"
            emissiveIntensity={0.22}
            roughness={0.2}
            metalness={0.4}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ position, scale = 1 }) {
  const h = 5 * scale;
  return (
    <group position={position}>
      <mesh position={[0, h * 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.25 * scale, 0.35 * scale, h * 0.5, 6]} />
        <meshStandardMaterial color="#5a3b22" roughness={0.95} />
      </mesh>
      <mesh position={[0, h * 0.75, 0]} castShadow>
        <coneGeometry args={[1.8 * scale, h * 1.2, 8]} />
        <meshStandardMaterial color="#2f5a2a" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Deterministic LCG — returns a pure sequence for any seed
function seededSequence(seed, count) {
  const out = new Array(count);
  let s = seed >>> 0;
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280;
    out[i] = s / 233280;
  }
  return out;
}

function Surroundings({ stadiumRadius = 80 }) {
  const houses = useMemo(() => {
    const list = [];
    const palette = ['#c4a67d', '#d6b89b', '#a89078', '#b89e80', '#d9c4a0', '#a38872'];
    const roofs = ['#7a3a2a', '#8a4030', '#5c3024', '#6b3a28'];
    const r1 = seededSequence(12345, 36 * 7);
    let k = 0;
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2 + r1[k++] * 0.12;
      const r = 125 + r1[k++] * 55;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      if (Math.abs(x) < stadiumRadius + 25 && Math.abs(z) < stadiumRadius + 25) {
        k += 5;
        continue;
      }
      list.push({
        kind: 'house',
        position: [x, 0, z],
        color: palette[Math.floor(r1[k++] * palette.length)],
        roof: roofs[Math.floor(r1[k++] * roofs.length)],
        height: 5 + r1[k++] * 3,
        width: 6 + r1[k++] * 4,
        depth: 6 + r1[k++] * 4,
        rotation: -angle + Math.PI / 2 + (r1[k - 1] - 0.5) * 0.4,
      });
    }
    const aptColors = ['#8a95a8', '#a8b0c0', '#7a8494', '#9ea6b6', '#c8bfa8'];
    const r2 = seededSequence(67890, 22 * 7);
    let j = 0;
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2 + r2[j++] * 0.2;
      const r = 210 + r2[j++] * 70;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      list.push({
        kind: 'apt',
        position: [x, 0, z],
        color: aptColors[Math.floor(r2[j++] * aptColors.length)],
        height: 14 + r2[j++] * 18,
        width: 8 + r2[j++] * 6,
        depth: 8 + r2[j++] * 6,
        rotation: -angle + Math.PI / 2 + (r2[j++] - 0.5) * 0.3,
      });
    }
    return list;
  }, [stadiumRadius]);

  const trees = useMemo(() => {
    const list = [];
    const r3 = seededSequence(24680, 60 * 3);
    let j = 0;
    for (let i = 0; i < 60; i++) {
      const angle = r3[j++] * Math.PI * 2;
      const r = stadiumRadius + 12 + r3[j++] * 140;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const scale = 0.7 + r3[j++] * 0.9;
      if (Math.abs(x) < stadiumRadius + 8 && Math.abs(z) < stadiumRadius + 8) continue;
      list.push({ position: [x, 0, z], scale });
    }
    return list;
  }, [stadiumRadius]);

  return (
    <group>
      {/* Perimeter concourse / plaza (asphalt ring around the stadium) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y_PLAZA, 0]} receiveShadow>
        <ringGeometry args={[stadiumRadius + 2, stadiumRadius + 28, 96]} />
        <meshStandardMaterial
          color="#3a3d42"
          roughness={0.95}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      {/* Plaza tile pattern hints (lighter ring) — sits on top of the plaza,
          separated in Y and pushed forward with polygonOffset so it never
          z-fights with the asphalt ring below. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y_PLAZA_BAND, 0]} receiveShadow>
        <ringGeometry args={[stadiumRadius + 14, stadiumRadius + 16, 96]} />
        <meshStandardMaterial
          color="#6a6d72"
          roughness={0.9}
          polygonOffset
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
        />
      </mesh>
      {/* Access road (wide asphalt strip) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, Y_ROAD, -(stadiumRadius + 55)]}
        receiveShadow
      >
        <planeGeometry args={[260, 12]} />
        <meshStandardMaterial
          color="#2e3136"
          roughness={0.95}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, Y_ROAD, stadiumRadius + 55]}
        receiveShadow
      >
        <planeGeometry args={[260, 12]} />
        <meshStandardMaterial
          color="#2e3136"
          roughness={0.95}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-(stadiumRadius + 55), Y_ROAD, 0]}
        receiveShadow
      >
        <planeGeometry args={[12, 260]} />
        <meshStandardMaterial
          color="#2e3136"
          roughness={0.95}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[stadiumRadius + 55, Y_ROAD, 0]}
        receiveShadow
      >
        <planeGeometry args={[12, 260]} />
        <meshStandardMaterial
          color="#2e3136"
          roughness={0.95}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* Parking lot (north side) */}
      <group position={[-60, Y_PARKING, -(stadiumRadius + 40)]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[70, 30]} />
          <meshStandardMaterial
            color="#44474c"
            roughness={0.95}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
        {/* Parked car blobs */}
        {Array.from({ length: 18 }).map((_, i) => {
          const row = Math.floor(i / 9);
          const col = i % 9;
          const carColors = ['#c83c3c', '#3c6ec8', '#3ca85a', '#e0e0e0', '#2b2b2b', '#d8a83a'];
          return (
            <mesh
              key={i}
              position={[-30 + col * 7.5, 0.7, -10 + row * 20]}
              castShadow
            >
              <boxGeometry args={[4.2, 1.4, 2]} />
              <meshStandardMaterial
                color={carColors[i % carColors.length]}
                roughness={0.5}
                metalness={0.3}
              />
            </mesh>
          );
        })}
      </group>

      {/* Houses and apartments */}
      {houses.map((h, i) =>
        h.kind === 'house' ? (
          <House key={i} {...h} roofColor={h.roof} />
        ) : (
          <Apartment key={i} {...h} />
        )
      )}

      {/* Trees around stadium + lining streets */}
      {trees.map((t, i) => (
        <Tree key={i} position={t.position} scale={t.scale} />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STADIUM
// ═══════════════════════════════════════════════════════════════════════════
const LEVELS = [
  {
    name: 'Municipal',
    height: 7,
    standDepth: 12,
    hasRoof: false,
    hasLights: false,
    color: '#3c5a7a',
    hasCorners: false,
  },
  {
    name: 'Moderno',
    height: 11,
    standDepth: 16,
    hasRoof: false,
    hasLights: true,
    color: '#1e4a74',
    hasCorners: true,
  },
  {
    name: 'Grande',
    height: 16,
    standDepth: 20,
    hasRoof: true,
    hasLights: true,
    color: '#143a63',
    hasCorners: true,
  },
  {
    name: 'Élite',
    height: 22,
    standDepth: 24,
    hasRoof: true,
    hasLights: true,
    color: '#102a4a',
    hasCorners: true,
  },
  {
    name: 'Legendario',
    height: 30,
    standDepth: 28,
    hasRoof: true,
    hasLights: true,
    color: '#0a1d3a',
    hasCorners: true,
  },
];

function Stadium({ level = 0, naming = null, grassCondition = 100 }) {
  const config = LEVELS[level] || LEVELS[0];
  const sideHeight = config.height;
  const endHeight = config.height * 0.85;
  const standColor = config.color;

  const longSideOffset = PITCH_H / 2 + 4; // distance from pitch center to stand front
  const shortSideOffset = PITCH_W / 2 + 4;

  const outerRadius = Math.hypot(shortSideOffset + config.standDepth, longSideOffset + config.standDepth);

  return (
    <group>
      <Pitch grassCondition={grassCondition} />

      {/* Long-side stands (facing +Z and -Z, parallel to X axis) */}
      <SeatedStand
        position={[0, 0, -longSideOffset]}
        rotation={[0, 0, 0]}
        width={PITCH_W + 8}
        height={sideHeight}
        depth={config.standDepth}
        color={standColor}
        hasRoof={config.hasRoof}
      />
      <SeatedStand
        position={[0, 0, longSideOffset]}
        rotation={[0, Math.PI, 0]}
        width={PITCH_W + 8}
        height={sideHeight}
        depth={config.standDepth}
        color={standColor}
        hasRoof={config.hasRoof}
      />

      {/* End stands (behind goals) */}
      <SeatedStand
        position={[-shortSideOffset, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={PITCH_H + 8}
        height={endHeight}
        depth={config.standDepth * 0.85}
        color={shade(standColor, 1.05)}
        hasRoof={config.hasRoof}
      />
      <SeatedStand
        position={[shortSideOffset, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={PITCH_H + 8}
        height={endHeight}
        depth={config.standDepth * 0.85}
        color={shade(standColor, 1.05)}
        hasRoof={config.hasRoof}
      />

      {/* Corner infills for higher levels */}
      {config.hasCorners && (
        <>
          {[
            [-shortSideOffset - 2, -longSideOffset - 2, Math.PI / 4],
            [shortSideOffset + 2, -longSideOffset - 2, -Math.PI / 4],
            [-shortSideOffset - 2, longSideOffset + 2, Math.PI - Math.PI / 4],
            [shortSideOffset + 2, longSideOffset + 2, Math.PI + Math.PI / 4],
          ].map(([x, z, rot], i) => (
            <CornerInfill
              key={i}
              position={[x, 0, z]}
              rotation={[0, rot, 0]}
              height={endHeight * 0.95}
              color={shade(standColor, 0.95)}
              hasRoof={config.hasRoof}
            />
          ))}
        </>
      )}

      {/* Floodlight towers (at 4 corners, beyond corner infills) */}
      {config.hasLights && (
        <>
          {[
            [-shortSideOffset - 14, -longSideOffset - 14],
            [shortSideOffset + 14, -longSideOffset - 14],
            [-shortSideOffset - 14, longSideOffset + 14],
            [shortSideOffset + 14, longSideOffset + 14],
          ].map(([x, z], i) => (
            <FloodlightTower
              key={i}
              position={[x, 0, z]}
              height={config.height + 18}
              intensity={level >= 3 ? 80 : 45}
            />
          ))}
        </>
      )}

      {/* Stadium naming — large illuminated sign on far end outer wall */}
      {naming && (
        <Text
          position={[0, sideHeight + 2.2, -longSideOffset - config.standDepth - 1.75]}
          fontSize={4.2}
          color="#fff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000"
        >
          {naming.name ? `${naming.name} Arena` : 'Arena'}
        </Text>
      )}

      {/* Surroundings — city around the stadium */}
      <Surroundings stadiumRadius={outerRadius + 6} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TOP-LEVEL CANVAS
// ═══════════════════════════════════════════════════════════════════════════
export default function Stadium3D({ level = 0, naming = null, grassCondition = 100 }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 340,
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #b8d5ea 0%, #e6d7c3 100%)',
      }}
    >
      <Canvas
        camera={{ position: [130, 85, 160], fov: 42, near: 1, far: 1800 }}
        shadows
        dpr={[1, 1.6]}
        gl={{ logarithmicDepthBuffer: true, antialias: true, powerPreference: 'high-performance' }}
      >
        {/* Sky + atmospheric fog for depth */}
        <Sky
          distance={4500}
          sunPosition={[120, 80, -90]}
          inclination={0.5}
          azimuth={0.25}
          turbidity={6}
          rayleigh={1.2}
          mieCoefficient={0.008}
          mieDirectionalG={0.85}
        />
        <fog attach="fog" args={['#d6dde6', 260, 620]} />

        {/* Lighting — warm key light + soft ambient + sky fill */}
        <ambientLight intensity={0.35} color="#cfd8e3" />
        <hemisphereLight args={['#cfe4ff', '#c2a880', 0.55]} />
        <directionalLight
          position={[120, 160, 80]}
          intensity={1.35}
          color="#fff3d6"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-220}
          shadow-camera-right={220}
          shadow-camera-top={220}
          shadow-camera-bottom={-220}
          shadow-camera-near={1}
          shadow-camera-far={500}
          shadow-bias={-0.0005}
        />

        {/* Ground plane — extends to the horizon with grass tone */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y_GROUND, 0]} receiveShadow>
          <planeGeometry args={[1600, 1600]} />
          <meshStandardMaterial color="#6f8a4c" roughness={0.95} />
        </mesh>
        {/* Grass mid-ring — lifted well above the ground with polygonOffset
            so it never z-fights with the infinite ground plane below. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y_MID_GRASS, 0]} receiveShadow>
          <ringGeometry args={[120, 300, 96]} />
          <meshStandardMaterial
            color="#7a9a58"
            roughness={0.95}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>

        <Stadium level={level} naming={naming} grassCondition={grassCondition} />

        {/* ContactShadows — sits below every decal layer with depthWrite off,
            so it only darkens the base ground outside the stadium footprint
            and never competes with the stacked pitch/plaza decals above. */}
        <ContactShadows
          position={[0, Y_GROUND + 0.01, 0]}
          opacity={0.4}
          scale={240}
          blur={2.4}
          far={80}
          frames={1}
        />

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={80}
          maxDistance={420}
          maxPolarAngle={Math.PI / 2.15}
          minPolarAngle={Math.PI / 6}
          autoRotate
          autoRotateSpeed={0.35}
          enableDamping
          dampingFactor={0.06}
        />

        <Environment preset="sunset" />
      </Canvas>
    </div>
  );
}
