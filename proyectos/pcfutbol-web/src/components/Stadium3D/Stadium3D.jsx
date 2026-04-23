import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, ContactShadows, Sky } from '@react-three/drei';
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
// Y-STRATIFICATION — each horizontal layer gets its own slab to avoid z-fighting
// ═══════════════════════════════════════════════════════════════════════════
const Y = {
  ground:       0.000,
  sidewalk:     0.010,
  street:       0.018,
  streetMark:   0.024,
  plazaRing:    0.028,
  plazaTile:    0.034,
  parking:      0.030,
  grassEdge:    0.040,
  dirtTrack:    0.046,
  pitchBase:    0.052,
  mowStripe:    0.060,
  pitchLines:   0.072,
};

// ═══════════════════════════════════════════════════════════════════════════
// PITCH — striped grass, full FIFA markings, goals, corner flags
// ═══════════════════════════════════════════════════════════════════════════
const PITCH_W = 105;
const PITCH_H = 68;
const LINE_COLOR = '#f2f2f2';
const LINE_THICK = 0.22;

function Line({ size, position }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={LINE_COLOR} roughness={0.6} />
    </mesh>
  );
}

function Ring({ inner, outer, position, segments = 64, start = 0, length = Math.PI * 2 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <ringGeometry args={[inner, outer, segments, 1, start, length]} />
      <meshStandardMaterial color={LINE_COLOR} roughness={0.6} />
    </mesh>
  );
}

function Spot({ position, radius = 0.25 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <circleGeometry args={[radius, 20]} />
      <meshStandardMaterial color={LINE_COLOR} roughness={0.6} />
    </mesh>
  );
}

function FieldMarkings() {
  const y = Y.pitchLines;
  const half = LINE_THICK / 2;
  return (
    <group>
      <Line size={[PITCH_W, LINE_THICK]} position={[0, y, -PITCH_H / 2 + half]} />
      <Line size={[PITCH_W, LINE_THICK]} position={[0, y, PITCH_H / 2 - half]} />
      <Line size={[LINE_THICK, PITCH_H]} position={[-PITCH_W / 2 + half, y, 0]} />
      <Line size={[LINE_THICK, PITCH_H]} position={[PITCH_W / 2 - half, y, 0]} />
      <Line size={[LINE_THICK, PITCH_H]} position={[0, y, 0]} />
      <Ring inner={9.15 - half} outer={9.15 + half} position={[0, y, 0]} />
      <Spot position={[0, y, 0]} radius={0.3} />

      {[-1, 1].map((side) => {
        const xEdge = side * (PITCH_W / 2);
        const xPenInner = xEdge - side * 16.5;
        const xGoalInner = xEdge - side * 5.5;
        const penCenterX = (xEdge + xPenInner) / 2;
        const goalCenterX = (xEdge + xGoalInner) / 2;
        return (
          <group key={side}>
            <Line size={[LINE_THICK, 40.3]} position={[xPenInner, y, 0]} />
            <Line size={[16.5, LINE_THICK]} position={[penCenterX, y, -20.15 + half]} />
            <Line size={[16.5, LINE_THICK]} position={[penCenterX, y, 20.15 - half]} />
            <Line size={[LINE_THICK, 18.32]} position={[xGoalInner, y, 0]} />
            <Line size={[5.5, LINE_THICK]} position={[goalCenterX, y, -9.16 + half]} />
            <Line size={[5.5, LINE_THICK]} position={[goalCenterX, y, 9.16 - half]} />
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
  const height = 2.44;
  const width = 7.32;
  const depth = 2.2;
  const postR = 0.08;
  const white = '#f5f5f5';
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, height / 2, -width / 2]} castShadow>
        <cylinderGeometry args={[postR, postR, height, 10]} />
        <meshStandardMaterial color={white} roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[0, height / 2, width / 2]} castShadow>
        <cylinderGeometry args={[postR, postR, height, 10]} />
        <meshStandardMaterial color={white} roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[postR, postR, width, 10]} />
        <meshStandardMaterial color={white} roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[side * depth, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[postR * 0.7, postR * 0.7, width, 8]} />
        <meshStandardMaterial color={white} />
      </mesh>
      <mesh position={[side * depth * 0.5, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#dcdcdc"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          roughness={0.9}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[side * depth * 0.5, height + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[depth, width]} />
        <meshStandardMaterial
          color="#dcdcdc"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          roughness={0.9}
          depthWrite={false}
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.grassEdge, 0]} receiveShadow>
        <planeGeometry args={[PITCH_W + 14, PITCH_H + 14]} />
        <meshStandardMaterial color={edgeColor} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.dirtTrack, 0]} receiveShadow>
        <ringGeometry args={[Math.hypot(PITCH_W / 2, PITCH_H / 2) + 3, Math.hypot(PITCH_W / 2, PITCH_H / 2) + 7, 48]} />
        <meshStandardMaterial color="#9c6b3a" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.pitchBase, 0]} receiveShadow>
        <planeGeometry args={[PITCH_W, PITCH_H]} />
        <meshStandardMaterial color={baseColor} roughness={0.9} />
      </mesh>
      {stripes.map((s, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[s.x, Y.mowStripe, 0]}
          receiveShadow
        >
          <planeGeometry args={[s.w, PITCH_H]} />
          <meshStandardMaterial color={s.color} roughness={0.95} />
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
// STANDS
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
        y: i * rowHeight + rowHeight / 2 + 1.2,
        z: -(i + 0.5) * rowDepth - 1,
        color: i % 3 === 0 ? shade(color, 1.2) : i % 3 === 1 ? color : shade(color, 0.85),
      });
    }
    return rows;
  }, [rowCount, rowDepth, color]);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 1.8, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, 0.28]} castShadow>
        <boxGeometry args={[width * 0.98, 1.1, 0.06]} />
        <meshStandardMaterial
          color="#2b2b2b"
          emissive="#4a5e9e"
          emissiveIntensity={0.35}
          roughness={0.4}
        />
      </mesh>
      {seatRows.map((r, i) => (
        <mesh key={i} position={[0, r.y, r.z]} castShadow receiveShadow>
          <boxGeometry args={[width, rowHeight, rowDepth + 0.05]} />
          <meshStandardMaterial color={r.color} roughness={0.85} />
        </mesh>
      ))}
      <mesh
        position={[0, rowCount * rowHeight * 0.5 + 1.2, -rowCount * rowDepth * 0.5 - 1]}
        castShadow
      >
        <boxGeometry args={[width, 0.15, rowDepth * 1.3]} />
        <meshStandardMaterial color="#d8d8d8" roughness={0.8} />
      </mesh>
      <mesh position={[0, height * 0.55 + 1.5, -depth - 1]} castShadow receiveShadow>
        <boxGeometry args={[width + 2, height * 1.3 + 3, 1.2]} />
        <meshStandardMaterial color={shade(color, 0.55)} roughness={0.75} metalness={0.1} />
      </mesh>
      <mesh position={[0, height * 1.2 + 3, -depth - 0.4]}>
        <boxGeometry args={[width + 2.1, 0.8, 0.4]} />
        <meshStandardMaterial
          color={shade(color, 1.4)}
          emissive={shade(color, 1.6)}
          emissiveIntensity={0.45}
          roughness={0.45}
        />
      </mesh>
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
          <mesh position={[0, height + 3.5, 0.6]} castShadow>
            <boxGeometry args={[width + 1, 0.35, 0.35]} />
            <meshStandardMaterial color="#c8ccd4" metalness={0.7} roughness={0.25} />
          </mesh>
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
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[width, 1.8, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
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
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.2, 2.4]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
      </mesh>
      <mesh position={[0, height / 2 + 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.7, height, 8]} />
        <meshStandardMaterial color="#5a5e66" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0, height + 1.2, 0]} castShadow>
        <boxGeometry args={[5, 0.3, 1.8]} />
        <meshStandardMaterial color="#3c4048" roughness={0.6} metalness={0.2} />
      </mesh>
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
// BUILDINGS — house and apartment primitives
// ═══════════════════════════════════════════════════════════════════════════
function House({ position, color, roofColor, height = 6, width = 8, depth = 8, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, height + 1.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[Math.max(width, depth) * 0.72, 2.6, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, height * 0.55, depth / 2 + 0.02]}>
        <planeGeometry args={[width * 0.72, height * 0.35]} />
        <meshStandardMaterial
          color="#2a2d3a"
          emissive="#ffd86b"
          emissiveIntensity={0.3}
          roughness={0.25}
          metalness={0.3}
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
      <mesh position={[0, height + 0.3, 0]} castShadow>
        <boxGeometry args={[width + 0.4, 0.6, depth + 0.4]} />
        <meshStandardMaterial color={shade(color, 0.5)} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, height / 2, (depth / 2 + 0.02) * side]}>
          <planeGeometry args={[width * 0.85, height * 0.82]} />
          <meshStandardMaterial
            color="#1a1f2e"
            emissive="#a8c8ff"
            emissiveIntensity={0.22}
            roughness={0.2}
            metalness={0.4}
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

// Deterministic LCG
function seededSequence(seed, count) {
  const out = new Array(count);
  let s = seed >>> 0;
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280;
    out[i] = s / 233280;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// SURROUNDINGS — coherent stadium district: plaza, ring road, grid streets,
// city blocks, trees, park, parking — all aligned to cardinal axes.
// ═══════════════════════════════════════════════════════════════════════════
const DISTRICT_HALF = 260; // scene extent

function Surroundings({ stadiumRadius = 80 }) {
  const plazaInner = stadiumRadius + 1;
  const plazaOuter = stadiumRadius + 20;
  const ringInner  = plazaOuter + 0.5;
  const ringOuter  = plazaOuter + 11;
  const cityStart  = ringOuter + 4;  // first building setback

  const GRID_CELL = 24;
  const BLOCK_SPAN = 3;              // cells per block
  const STREET_WIDTH = 6;            // asphalt strip width

  // ── City blocks: produce individual buildings on a deterministic grid ────
  const buildings = useMemo(() => {
    const list = [];
    const rng = seededSequence(91117, 3000);
    let k = 0;
    const next = () => rng[(k++) % rng.length];

    const housePalette = ['#c4a67d', '#d6b89b', '#a89078', '#b89e80', '#d9c4a0', '#a38872', '#bda58a', '#cdb798'];
    const roofPalette  = ['#7a3a2a', '#8a4030', '#5c3024', '#6b3a28', '#834030'];
    const aptPalette   = ['#8a95a8', '#a8b0c0', '#7a8494', '#9ea6b6', '#c8bfa8', '#b8a890'];

    const gridRange = Math.floor(DISTRICT_HALF / GRID_CELL);

    for (let gx = -gridRange; gx <= gridRange; gx++) {
      for (let gz = -gridRange; gz <= gridRange; gz++) {
        // Skip cells that fall on street lanes
        if (gx % BLOCK_SPAN === 0) continue;
        if (gz % BLOCK_SPAN === 0) continue;

        const cx = gx * GRID_CELL;
        const cz = gz * GRID_CELL;
        const dist = Math.hypot(cx, cz);

        // Exclusion: stadium + ring + access road corridor
        if (dist < cityStart + GRID_CELL * 0.5) continue;
        if (Math.abs(cx) < GRID_CELL * 0.6) continue; // N-S avenue clear
        if (Math.abs(cz) < GRID_CELL * 0.6) continue; // E-W avenue clear
        if (dist > DISTRICT_HALF - 10) continue;

        // Park zone — southeast quadrant: leave a 3x3 block cluster empty
        const inPark =
          gx >= 4 && gx <= 7 && gz >= -7 && gz <= -4;
        if (inPark) continue;

        // Orientation: building faces the nearest cardinal street
        // distance (in cells) to nearest horizontal (gz-parallel) street
        const modX = ((gx % BLOCK_SPAN) + BLOCK_SPAN) % BLOCK_SPAN;
        const modZ = ((gz % BLOCK_SPAN) + BLOCK_SPAN) % BLOCK_SPAN;
        const distToXStreet = Math.min(modZ, BLOCK_SPAN - modZ); // vertical distance to an E-W street
        const distToZStreet = Math.min(modX, BLOCK_SPAN - modX); // horizontal distance to a N-S street
        const faceEW = distToXStreet <= distToZStreet; // face +/- Z
        const rotation = faceEW ? 0 : Math.PI / 2;

        // Building type: apartments closer in, houses further out
        const downtown = dist < cityStart + 80;
        const isApt = downtown ? next() < 0.7 : next() < 0.1;

        const w = GRID_CELL * 0.72;
        const d = GRID_CELL * 0.72;
        if (isApt) {
          list.push({
            kind: 'apt',
            position: [cx, 0, cz],
            color: aptPalette[Math.floor(next() * aptPalette.length)],
            height: downtown ? 16 + next() * 16 : 12 + next() * 8,
            width: w,
            depth: d,
            rotation,
          });
        } else {
          list.push({
            kind: 'house',
            position: [cx, 0, cz],
            color: housePalette[Math.floor(next() * housePalette.length)],
            roofColor: roofPalette[Math.floor(next() * roofPalette.length)],
            height: 5 + next() * 2.5,
            width: w * 0.9,
            depth: d * 0.9,
            rotation,
          });
        }
      }
    }
    return list;
  }, [cityStart]);

  // ── Street network: horizontal & vertical asphalt strips ────────────────
  const streetLines = useMemo(() => {
    const range = Math.floor(DISTRICT_HALF / GRID_CELL);
    const len = range * GRID_CELL * 2;
    const lines = [];
    for (let g = -range; g <= range; g++) {
      if (g % BLOCK_SPAN !== 0) continue;
      const pos = g * GRID_CELL;
      // Skip lines that overlap stadium interior
      lines.push({ axis: 'x', pos, len, width: STREET_WIDTH });
      lines.push({ axis: 'z', pos, len, width: STREET_WIDTH });
    }
    return lines;
  }, []);

  // ── Tree placement: intersections + park cluster + ring road edge ───────
  const trees = useMemo(() => {
    const r = seededSequence(77777, 400);
    let k = 0;
    const next = () => r[(k++) % r.length];
    const list = [];
    const range = Math.floor(DISTRICT_HALF / GRID_CELL);

    // Trees along ring road (inside edge of city)
    const ringTreeCount = 28;
    for (let i = 0; i < ringTreeCount; i++) {
      const a = (i / ringTreeCount) * Math.PI * 2;
      const rad = ringOuter + 2.5;
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad;
      if (Math.abs(x) < STREET_WIDTH + 4 || Math.abs(z) < STREET_WIDTH + 4) continue;
      list.push({ position: [x, 0, z], scale: 0.85 + next() * 0.3 });
    }

    // Trees at block-corner intersections
    for (let gx = -range; gx <= range; gx += BLOCK_SPAN) {
      for (let gz = -range; gz <= range; gz += BLOCK_SPAN) {
        const cx = gx * GRID_CELL;
        const cz = gz * GRID_CELL;
        const dist = Math.hypot(cx, cz);
        if (dist < cityStart + 6) continue;
        if (dist > DISTRICT_HALF - 12) continue;
        if (Math.abs(cx) < GRID_CELL * 0.5 || Math.abs(cz) < GRID_CELL * 0.5) continue;
        // Nudge into block corner, four per intersection
        const off = GRID_CELL * 0.4;
        [[ off,  off], [-off,  off], [ off, -off], [-off, -off]].forEach(([ox, oz]) => {
          // only drop trees on ~half of corners, deterministic-ish
          if (next() < 0.5) return;
          list.push({
            position: [cx + ox, 0, cz + oz],
            scale: 0.6 + next() * 0.5,
          });
        });
      }
    }

    // Dense park cluster (southeast quadrant)
    for (let i = 0; i < 22; i++) {
      const u = next();
      const v = next();
      const x = 4 * GRID_CELL + u * (GRID_CELL * 3);
      const z = -7 * GRID_CELL + v * (GRID_CELL * 3);
      list.push({ position: [x, 0, z], scale: 0.9 + next() * 0.5 });
    }

    return list;
  }, [ringOuter, cityStart]);

  // Parking lots (4 wedges between plaza and ring road, on diagonals)
  const parkingLots = useMemo(() => {
    const lots = [];
    const offsets = [
      [-1, -1], [1, -1], [-1, 1], [1, 1],
    ];
    offsets.forEach(([sx, sz], i) => {
      const r = (plazaOuter + ringInner) / 2;
      lots.push({
        position: [sx * r * 0.72, Y.parking, sz * r * 0.72],
        size: [28, 28],
        rotation: 0,
        key: i,
      });
    });
    return lots;
  }, [plazaOuter, ringInner]);

  const carColors = ['#c83c3c', '#3c6ec8', '#3ca85a', '#e0e0e0', '#2b2b2b', '#d8a83a', '#8a8a8a'];

  // Park ground patch (southeast)
  const parkCenter = [5.5 * GRID_CELL, 0, -5.5 * GRID_CELL];
  const parkSize = GRID_CELL * 3.2;

  return (
    <group>
      {/* Ground is painted green in <Stadium3D>. Here we add paved/urban layers. */}

      {/* ─── Suburban sidewalk tone: large soft patch under city to hint blocks ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.sidewalk, 0]} receiveShadow>
        <ringGeometry args={[cityStart, DISTRICT_HALF - 8, 48]} />
        <meshStandardMaterial color="#7f7a6a" roughness={0.95} />
      </mesh>

      {/* ─── Stadium apron plaza (concrete ring) ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.plazaRing, 0]} receiveShadow>
        <ringGeometry args={[plazaInner, plazaOuter, 64]} />
        <meshStandardMaterial color="#8a8a8a" roughness={0.95} />
      </mesh>
      {/* Plaza accent band (lighter stripe) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.plazaTile, 0]} receiveShadow>
        <ringGeometry args={[plazaOuter - 4, plazaOuter - 2.5, 64]} />
        <meshStandardMaterial color="#b7b4ab" roughness={0.85} />
      </mesh>

      {/* ─── Ring road (asphalt) around the plaza ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.street, 0]} receiveShadow>
        <ringGeometry args={[ringInner, ringOuter, 64]} />
        <meshStandardMaterial color="#30333a" roughness={0.95} />
      </mesh>
      {/* Ring road center line (dashed look via thin lighter ring) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.streetMark, 0]}>
        <ringGeometry args={[
          (ringInner + ringOuter) / 2 - 0.08,
          (ringInner + ringOuter) / 2 + 0.08,
          64,
        ]} />
        <meshStandardMaterial color="#d6cf9a" roughness={0.8} />
      </mesh>

      {/* ─── Grid street network (asphalt strips) ─── */}
      {streetLines.map((l, i) => {
        const isX = l.axis === 'x';
        // X-axis means street is a horizontal strip at z=pos → size = [len, width]
        // Actually our loop naming is odd; axis 'x' means iterating along gx producing N-S streets at x=pos
        // Let's standardize: axis 'x' = street running N-S (constant x, long along z)
        const size = isX ? [l.width, l.len] : [l.len, l.width];
        const pos = isX ? [l.pos, Y.street, 0] : [0, Y.street, l.pos];
        // Dim the portion overlapping stadium by skipping visual rendering near center
        // (cheaper than clipping — just draw full strips; stadium covers them)
        return (
          <group key={i}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={pos} receiveShadow>
              <planeGeometry args={size} />
              <meshStandardMaterial color="#2e3136" roughness={0.95} />
            </mesh>
            {/* Center dashed marking */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[pos[0], Y.streetMark, pos[2]]}
            >
              <planeGeometry args={isX ? [0.18, l.len] : [l.len, 0.18]} />
              <meshStandardMaterial color="#d6cf9a" roughness={0.85} />
            </mesh>
          </group>
        );
      })}

      {/* ─── Wider cardinal avenues (connect to stadium) ─── */}
      {[
        { pos: [0, Y.street, -(ringOuter + 12)], size: [40, 14] },
        { pos: [0, Y.street,  (ringOuter + 12)], size: [40, 14] },
        { pos: [-(ringOuter + 12), Y.street, 0], size: [14, 40] },
        { pos: [ (ringOuter + 12), Y.street, 0], size: [14, 40] },
      ].map((a, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={a.pos} receiveShadow>
          <planeGeometry args={a.size} />
          <meshStandardMaterial color="#30333a" roughness={0.95} />
        </mesh>
      ))}

      {/* ─── Parking lots (between plaza and ring road on diagonals) ─── */}
      {parkingLots.map((lot) => (
        <group key={lot.key} position={lot.position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={lot.size} />
            <meshStandardMaterial color="#44474c" roughness={0.95} />
          </mesh>
          {/* parking stripes */}
          {Array.from({ length: 6 }).map((_, r) => (
            <mesh
              key={r}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.004, -lot.size[1] / 2 + 4 + r * 4]}
            >
              <planeGeometry args={[lot.size[0] * 0.9, 0.12]} />
              <meshStandardMaterial color="#cfc38a" roughness={0.85} />
            </mesh>
          ))}
          {/* parked cars */}
          {Array.from({ length: 12 }).map((_, j) => {
            const row = Math.floor(j / 6);
            const col = j % 6;
            return (
              <mesh
                key={j}
                position={[-10 + col * 4, 0.7, -6 + row * 12]}
                castShadow
              >
                <boxGeometry args={[3.6, 1.4, 1.8]} />
                <meshStandardMaterial
                  color={carColors[(j + lot.key * 3) % carColors.length]}
                  roughness={0.5}
                  metalness={0.3}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* ─── Park (southeast quadrant) ─── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[parkCenter[0], Y.sidewalk + 0.002, parkCenter[2]]}
        receiveShadow
      >
        <planeGeometry args={[parkSize, parkSize]} />
        <meshStandardMaterial color="#5f8347" roughness={0.95} />
      </mesh>
      {/* Park pond */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[parkCenter[0] + 6, Y.plazaRing, parkCenter[2] - 4]}
      >
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial
          color="#3a6b8c"
          emissive="#27506a"
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.35}
        />
      </mesh>

      {/* ─── Buildings ─── */}
      {buildings.map((b, i) =>
        b.kind === 'house' ? (
          <House key={i} {...b} />
        ) : (
          <Apartment key={i} {...b} />
        )
      )}

      {/* ─── Trees ─── */}
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

  const longSideOffset = PITCH_H / 2 + 4;
  const shortSideOffset = PITCH_W / 2 + 4;

  const outerRadius = Math.hypot(shortSideOffset + config.standDepth, longSideOffset + config.standDepth);

  return (
    <group>
      <Pitch grassCondition={grassCondition} />

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
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 380,
        aspectRatio: '16 / 10',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #b8d5ea 0%, #e6d7c3 100%)',
      }}
    >
      <Canvas
        camera={{ position: [130, 90, 165], fov: 42 }}
        shadows
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
        }}
        style={{ position: 'absolute', inset: 0, display: 'block' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#b8d5ea', 1);
        }}
      >
        {/* Sky dome — single source of background to avoid Sky/Environment conflict */}
        <Sky
          distance={4500}
          sunPosition={[120, 80, -90]}
          turbidity={6}
          rayleigh={1.2}
          mieCoefficient={0.008}
          mieDirectionalG={0.85}
        />
        <fog attach="fog" args={['#d6dde6', 300, 680]} />

        {/* Lighting */}
        <ambientLight intensity={0.4} color="#cfd8e3" />
        <hemisphereLight args={['#cfe4ff', '#a8a084', 0.5]} />
        <directionalLight
          position={[120, 160, 80]}
          intensity={1.3}
          color="#fff3d6"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-240}
          shadow-camera-right={240}
          shadow-camera-top={240}
          shadow-camera-bottom={-240}
          shadow-camera-near={1}
          shadow-camera-far={520}
          shadow-bias={-0.00015}
          shadow-normalBias={0.04}
        />

        {/* Ground — single base plane for the entire scene */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.ground, 0]} receiveShadow>
          <planeGeometry args={[1800, 1800]} />
          <meshStandardMaterial color="#6f8a4c" roughness={0.95} />
        </mesh>

        <Stadium level={level} naming={naming} grassCondition={grassCondition} />

        <ContactShadows
          position={[0, Y.plazaRing + 0.002, 0]}
          opacity={0.35}
          scale={340}
          blur={2.6}
          far={80}
          resolution={1024}
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
          autoRotateSpeed={0.28}
          enableDamping
          dampingFactor={0.06}
        />
      </Canvas>
    </div>
  );
}
