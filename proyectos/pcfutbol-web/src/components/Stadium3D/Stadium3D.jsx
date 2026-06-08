import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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
// Keep broad ground layers clearly separated to avoid z-fighting/shimmering
// at the elevated oblique stadium camera.
const Y_MID_GRASS = 0.18;
const Y_PLAZA = 0.32;
const Y_PLAZA_BAND = 0.40;
const Y_ROAD = 0.52;
const Y_PARKING = 0.64;
const Y_PITCH_SURROUND = 0.78;
const Y_PITCH_TRACK = 0.92;
const Y_PITCH_BASE = 1.06;
const Y_PITCH_STRIPES = 1.20;
const LINE_Y = 1.36;

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
      {/* Rectangular concrete apron hugging the pitch (replaces the old oval
          moat ring that read as an athletics running track). A flat grey frame
          drawn as a slightly larger rectangle behind the pitch base. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y_PITCH_TRACK, 0]} receiveShadow>
        <planeGeometry args={[PITCH_W + 9, PITCH_H + 9]} />
        <meshStandardMaterial
          color="#6b6f63"
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
// STADIUM_FIELD_REBUILD_RECTANGULAR_20260601
// RECTANGULAR FOOTBALL-FIRST BOWL — four straight stands of 2-3 broad tiers
// hugging the rectangular pitch. This REPLACES the old elliptical OvalRing /
// concentric-bowl rendering (which read as a top-down blue racetrack). The
// CAMPO is now the visual hero: stands are simple massed seating blocks with a
// roof, facade band and team-blue accents only — NOT thousands of blue rings.
// The legacy Oval* components below are retained but are NO LONGER rendered in
// the main scene (see <Stadium/>).
// ═══════════════════════════════════════════════════════════════════════════

// Shared geometry so the stand meshes and the auto-fit camera agree on the
// stadium footprint. Pitch is PITCH_W (x) × PITCH_H (z); stands sit a small gap
// outside the touchlines and recede outward in 2-3 stepped tiers.
const FRONT_GAP = 5;
const SIDE_FRONT_Z = PITCH_H / 2 + FRONT_GAP; // long (N/S) stands
const END_FRONT_X = PITCH_W / 2 + FRONT_GAP; // goal-end (E/W) stands

function rectStandGeometry(level = 0) {
  const tierCount = level >= 3 ? 3 : 2;
  const baseRows = 7 + level * 2;
  const rowDepth = 1.7;
  const rowRise = 0.95;
  const tiers = [];
  let z = -2.2; // first tier starts just behind the front concourse wall
  let y = 1.8;
  for (let t = 0; t < tierCount; t++) {
    const rows = Math.max(4, baseRows - t * 3);
    tiers.push({ rows, rowDepth, rowRise, startZ: z, startY: y });
    z -= rows * rowDepth + 2.6; // walkway gap + set-back before next tier
    y += rows * rowRise + 3.4;
  }
  const depth = -z + 2; // total recede depth (toward outside of stadium)
  const topY = y; // approximate crown height
  return { tierCount, tiers, depth, topY };
}

// One straight grandstand. Built facing local +z (toward the pitch); seats step
// back toward local -z and rise in +y. Callers rotate/position it onto a side.
function RectStand({ length, geom, color, hasRoof, roofColor = '#2a3140', accent }) {
  const { tiers, depth, topY } = geom;
  const seatRows = useMemo(() => {
    const out = [];
    tiers.forEach((tier, ti) => {
      for (let i = 0; i < tier.rows; i++) {
        out.push({
          y: tier.startY + i * tier.rowRise + tier.rowRise / 2,
          z: tier.startZ - i * tier.rowDepth,
          color:
            i % 3 === 0 ? shade(color, 1.18) : i % 3 === 1 ? color : shade(color, 0.86),
          tier: ti,
        });
      }
    });
    return out;
  }, [tiers, color]);

  return (
    <group>
      {/* Front concourse wall / pitch-side perimeter */}
      <mesh position={[0, 0.9, 0.3]} castShadow receiveShadow>
        <boxGeometry args={[length, 1.8, 0.6]} />
        <meshStandardMaterial color="#20242c" roughness={0.9} />
      </mesh>
      {/* Pitch-side advertising / LED board (team accent, single strip) */}
      <mesh position={[0, 0.5, 0.65]}>
        <boxGeometry args={[length * 0.98, 1.0, 0.1]} />
        <meshStandardMaterial color="#16181d" emissive={accent} emissiveIntensity={0.4} roughness={0.4} />
      </mesh>
      {/* Stepped seat rows */}
      {seatRows.map((r, i) => (
        <mesh key={i} position={[0, r.y, r.z]} castShadow receiveShadow>
          <boxGeometry args={[length, 1.0, tiers[0].rowDepth + 0.05]} />
          <meshStandardMaterial color={r.color} roughness={0.85} />
        </mesh>
      ))}
      {/* Tier-division walkways (dark bands between tiers) */}
      {tiers.slice(1).map((tier, i) => (
        <mesh key={i} position={[0, tier.startY - 0.4, tier.startZ + 1.3]} castShadow>
          <boxGeometry args={[length, 0.8, 1.6]} />
          <meshStandardMaterial color="#1b1f26" roughness={0.85} />
        </mesh>
      ))}
      {/* Outer back facade */}
      <mesh position={[0, topY * 0.5, -depth + 0.5]} castShadow receiveShadow>
        <boxGeometry args={[length + 3, topY + 2, 1.4]} />
        <meshStandardMaterial color={shade(color, 0.55)} roughness={0.78} metalness={0.1} />
      </mesh>
      {/* Facade accent band (team color, single highlight strip) */}
      <mesh position={[0, topY * 0.5 + topY * 0.32, -depth + 0.9]}>
        <boxGeometry args={[length + 3.1, 1.0, 0.5]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} roughness={0.45} />
      </mesh>
      {/* Cantilever roof set back over the rear half of the stand. The first
          rectangular rebuild still hid too much of the campo from the default
          3/4 camera; keeping the roof shorter/back lets the pitch remain the
          hero while retaining an architectural crown. */}
      {hasRoof && (
        <group>
          <mesh position={[0, topY + 1.6, -depth * 0.7]} rotation={[0.1, 0, 0]} castShadow>
            <boxGeometry args={[length + 2, 0.55, depth * 0.52]} />
            <meshStandardMaterial color={roofColor} metalness={0.55} roughness={0.35} />
          </mesh>
          {/* Front roof truss */}
          <mesh position={[0, topY + 0.9, 1.5]} castShadow>
            <boxGeometry args={[length + 1.5, 0.4, 0.4]} />
            <meshStandardMaterial color="#c8ccd4" metalness={0.7} roughness={0.25} />
          </mesh>
          {/* Roof support columns at the back corners */}
          {[-0.42, 0.42].map((f, i) => (
            <mesh key={i} position={[length * f, topY * 0.55, -depth + 1.2]} castShadow>
              <boxGeometry args={[0.6, topY + 1, 0.6]} />
              <meshStandardMaterial color="#aeb3bd" metalness={0.6} roughness={0.35} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

// Diagonal block filling the gap between two perpendicular stands.
function RectCorner({ position, rotation, height, color }) {
  const rows = Math.max(5, Math.floor(height / 1.3));
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: rows }).map((_, i) => (
        <mesh key={i} position={[0, i * 1.0 + 1.4, -(i + 0.5) * 1.5]} castShadow receiveShadow>
          <boxGeometry args={[16, 1.0, 1.55]} />
          <meshStandardMaterial color={i % 2 === 0 ? color : shade(color, 1.12)} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, height * 0.45, -rows * 1.5 - 0.5]} castShadow>
        <boxGeometry args={[17, height, 1.2]} />
        <meshStandardMaterial color={shade(color, 0.55)} roughness={0.78} />
      </mesh>
    </group>
  );
}

// Full rectangular bowl: four stands + four corner infills around the pitch.
function RectangularBowl({ level, teamColor }) {
  const geom = useMemo(() => rectStandGeometry(level), [level]);
  const config = LEVELS[level] || LEVELS[0];
  const accent = shade(teamColor, 1.5);
  const { depth, topY } = geom;
  const sideBack = SIDE_FRONT_Z + depth; // outer z of long stands
  const endBack = END_FRONT_X + depth; // outer x of end stands

  return (
    <group>
      {/* South (−z) and North (+z) long stands */}
      <group position={[0, 0, -SIDE_FRONT_Z]} rotation={[0, 0, 0]}>
        <RectStand length={PITCH_W + 4} geom={geom} color={teamColor} hasRoof={config.hasRoof} roofColor={config.roofColor} accent={accent} />
      </group>
      <group position={[0, 0, SIDE_FRONT_Z]} rotation={[0, Math.PI, 0]}>
        <RectStand length={PITCH_W + 4} geom={geom} color={teamColor} hasRoof={config.hasRoof} roofColor={config.roofColor} accent={accent} />
      </group>
      {/* East (+x) and West (−x) goal-end stands */}
      <group position={[END_FRONT_X, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <RectStand length={PITCH_H + 4} geom={geom} color={shade(teamColor, 0.9)} hasRoof={config.hasRoof} roofColor={config.roofColor} accent={accent} />
      </group>
      <group position={[-END_FRONT_X, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <RectStand length={PITCH_H + 4} geom={geom} color={shade(teamColor, 0.9)} hasRoof={config.hasRoof} roofColor={config.roofColor} accent={accent} />
      </group>
      {/* Corner infills */}
      {[
        [END_FRONT_X - 2, sideBack - 2, -Math.PI / 4],
        [-(END_FRONT_X - 2), sideBack - 2, Math.PI / 4],
        [END_FRONT_X - 2, -(sideBack - 2), -Math.PI * 0.75],
        [-(END_FRONT_X - 2), -(sideBack - 2), Math.PI * 0.75],
      ].map(([x, z, rot], i) => (
        <RectCorner key={i} position={[x, 0, z]} rotation={rot} height={topY * 0.7} color={shade(teamColor, 0.78)} />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STADIUM_REFERENCE_CLOSED_BOWL_20260601
// ROUNDED-CANOPY BOWL — low-poly closed reference stadium:
// a fully enclosed rounded-rectangle (superellipse) footprint with contiguous
// red/orange seating tiers, a broad 360° white/cream exterior deck/canopy slab,
// dark concourse divider bands, and team-blue only as the continuous outer trim.
// The field remains open and legible; the stadium shell/bowl itself is closed.
//
// This REPLACES the previous RectangularBowl (four crude straight stands with
// hard pico/corner blocks). The old RectangularBowl / legacy Oval* helpers are
// retained below but are NO LONGER rendered (see <Stadium/>).
// ═══════════════════════════════════════════════════════════════════════════

// Superellipse outline point. n≈4.6 gives the reference rounded-rectangle plan:
// straight-ish long sides with continuous rounded corners, not an oval and not
// four separated stands. a/b are the X/Z half-extents.
function superPoint(t, a, b, n) {
  const ct = Math.cos(t);
  const st = Math.sin(t);
  const x = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n) * a;
  const z = Math.sign(st) * Math.pow(Math.abs(st), 2 / n) * b;
  return [x, z];
}

// Generic quad-strip band between two superellipse loops (lo → hi). Used for
// the canopy ring, the outer facade wall, accent bands and the pitch-side wall.
function buildBandGeometry({ segments = 150, n, lo, hi }) {
  const positions = [];
  const indices = [];
  for (const loop of [lo, hi]) {
    for (let s = 0; s <= segments; s++) {
      const t = (s / segments) * Math.PI * 2;
      const [x, z] = superPoint(t, loop.a, loop.b, n);
      positions.push(x, loop.y, z);
    }
  }
  const stride = segments + 1;
  for (let s = 0; s < segments; s++) {
    const i0 = s;
    const i1 = s + 1;
    const i2 = stride + s;
    const i3 = stride + s + 1;
    indices.push(i0, i2, i1, i1, i2, i3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

// The seating bowl: a single closed superellipse with explicit low-poly treads
// and risers. That stepped construction keeps the rows contiguous all the way
// around while reading as a real enclosed bowl from the default 3/4 camera.
function buildBowlGeometry({ segments = 150, innerA, innerB, rows, rowDepth, rowRise, startY, n, colorFn }) {
  const positions = [];
  const colors = [];
  const indices = [];
  const addLoop = (a, b, y, col) => {
    const start = positions.length / 3;
    for (let s = 0; s <= segments; s++) {
      const t = (s / segments) * Math.PI * 2;
      const [x, z] = superPoint(t, a, b, n);
      positions.push(x, y, z);
      colors.push(col.r, col.g, col.b);
    }
    return start;
  };
  const addStrip = (a, b) => {
    for (let s = 0; s < segments; s++) {
      const i0 = a + s;
      const i1 = a + s + 1;
      const i2 = b + s;
      const i3 = b + s + 1;
      indices.push(i0, i2, i1, i1, i2, i3);
    }
  };
  for (let r = 0; r < rows; r++) {
    const color = colorFn(r, rows);
    const a0 = innerA + r * rowDepth;
    const b0 = innerB + r * rowDepth;
    const a1 = innerA + (r + 0.82) * rowDepth;
    const b1 = innerB + (r + 0.82) * rowDepth;
    const y0 = startY + r * rowRise;
    const y1 = startY + (r + 1) * rowRise;
    const tread0 = addLoop(a0, b0, y0, color);
    const tread1 = addLoop(a1, b1, y0 + rowRise * 0.12, color);
    addStrip(tread0, tread1);
    const riserColor = color.clone().multiplyScalar(0.72);
    const riser0 = addLoop(a1, b1, y0 + rowRise * 0.12, riserColor);
    const riser1 = addLoop(a1, b1, y1, riserColor);
    addStrip(riser0, riser1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

// Warm seating palette — red/orange dominant, blue used only as small accents
// elsewhere (facade band, LED ring, canopy edge).
const SEAT_RED = new THREE.Color('#c33b2b');
const SEAT_RED_HI = new THREE.Color('#df5a40');
const SEAT_RED_LO = new THREE.Color('#9c2c1f');
const SEAT_ORANGE = new THREE.Color('#d4541f');
const SEAT_WALK = new THREE.Color('#363b43');
const CANOPY_CREAM = '#ece8dd';
const CANOPY_WHITE = '#f7f4ec';
const FACADE_CREAM = '#dbd6c8';

function seatRowColor(r, rows) {
  const mid = Math.floor(rows * 0.45);
  if (r === mid || r === mid - 1) return SEAT_WALK; // concourse walkway band between tiers
  if (r >= rows - 2) return SEAT_WALK; // dark rim under the canopy
  if (r % 5 === 0) return SEAT_ORANGE; // occasional orange row for warmth
  const m = r % 3;
  return m === 0 ? SEAT_RED_HI : m === 1 ? SEAT_RED : SEAT_RED_LO;
}

// Footprint + proportions for the closed rounded-rectangle bowl. Single source
// of truth so the seating, facade, canopy and auto-fit camera all agree. Every
// level preserves the same closed shell language; upgrades add height, tiers,
// rim thickness, ribs and trim instead of opening the stadium into stand pieces.
function roundedBowlMetrics(level = 0) {
  const lvl = Math.max(0, Math.min(4, level));
  const innerA = 59.5; // X half-extent of the lowest closed seating row
  const innerB = 42.5; // Z half-extent; keeps the pitch open but bowl closed
  const rows = 7 + lvl * 4; // 7 → 23 stepped rows
  const rowDepth = 1.42 + lvl * 0.08;
  const rowRise = 0.72 + lvl * 0.07;
  const startY = 1.85;
  const n = 4.65; // reference-like rounded rectangle, not an oval
  const bowlDepth = rows * rowDepth;
  const outerA = innerA + bowlDepth;
  const outerB = innerB + bowlDepth;
  const topY = startY + rows * rowRise;
  const deckInset = [1.8, 2.4, 3.1, 3.8, 4.4][lvl];
  const deckOutset = [4.2, 5.4, 7.2, 8.8, 10.6][lvl];
  const canopyInnerA = Math.max(PITCH_W / 2 + 8, innerA + bowlDepth * (0.16 + lvl * 0.035));
  const canopyInnerB = Math.max(PITCH_H / 2 + 7, innerB + bowlDepth * (0.16 + lvl * 0.035));
  const canopyOuterA = outerA + deckOutset;
  const canopyOuterB = outerB + deckOutset;
  const canopyY = topY + 2.3 + lvl * 0.45;
  const facadeA = outerA + deckInset;
  const facadeB = outerB + deckInset;
  const trimWidth = 1.1 + lvl * 0.28;
  const ribCount = [18, 26, 38, 52, 72][lvl];
  return {
    innerA, innerB, rows, rowDepth, rowRise, startY, n, bowlDepth,
    outerA, outerB, topY, canopyInnerA, canopyInnerB,
    canopyOuterA, canopyOuterB, canopyY, facadeA, facadeB,
    trimWidth, ribCount, deckOutset, depth: bowlDepth,
  };
}

function RoundedCanopyBowl({ level = 0, teamColor = '#1e4a74' }) {
  const m = useMemo(() => roundedBowlMetrics(level), [level]);
  const accent = useMemo(() => shade(teamColor, 1.5), [teamColor]);

  const bowlGeo = useMemo(
    () =>
      buildBowlGeometry({
        innerA: m.innerA, innerB: m.innerB, rows: m.rows,
        rowDepth: m.rowDepth, rowRise: m.rowRise, startY: m.startY,
        n: m.n, colorFn: seatRowColor,
      }),
    [m]
  );

  // Pitch-side perimeter wall (dark) the front row sits on top of.
  const innerWallGeo = useMemo(
    () =>
      buildBandGeometry({
        n: m.n,
        lo: { a: m.innerA, b: m.innerB, y: 0 },
        hi: { a: m.innerA, b: m.innerB, y: m.startY + 0.5 },
      }),
    [m]
  );
  // Pitch-side LED / advertising ring — a thin team-accent strip (small accent).
  const ledGeo = useMemo(
    () =>
      buildBandGeometry({
        n: m.n,
        lo: { a: m.innerA - 0.3, b: m.innerB - 0.3, y: 0.9 },
        hi: { a: m.innerA - 0.3, b: m.innerB - 0.3, y: 1.7 },
      }),
    [m]
  );
  // Continuous outer facade wall (cream), ground → crown.
  const facadeGeo = useMemo(
    () =>
      buildBandGeometry({
        n: m.n,
        lo: { a: m.facadeA, b: m.facadeB, y: 0.35 },
        hi: { a: m.facadeA, b: m.facadeB, y: m.topY + 2.0 },
      }),
    [m]
  );
  // Single team-color highlight band on the facade (small accent).
  const facadeBandGeo = useMemo(
    () =>
      buildBandGeometry({
        n: m.n,
        lo: { a: m.facadeA + 0.55, b: m.facadeB + 0.55, y: m.topY * 0.62 },
        hi: { a: m.facadeA + 0.55, b: m.facadeB + 0.55, y: m.topY * 0.62 + 1.5 },
      }),
    [m]
  );
  // Thick continuous canopy ring (cream/white) — inner edge slightly lower than
  // the outer edge so it reads as a roof sloping gently down toward the pitch.
  const canopyGeo = useMemo(
    () =>
      buildBandGeometry({
        n: m.n,
        lo: { a: m.canopyInnerA, b: m.canopyInnerB, y: m.canopyY - 0.95 },
        hi: { a: m.canopyOuterA, b: m.canopyOuterB, y: m.canopyY + 0.2 },
      }),
    [m]
  );
  // Vertical fascia under the outer canopy edge, visually tying roof + facade
  // into one closed shell instead of a floating ring.
  const canopyOuterWallGeo = useMemo(
    () =>
      buildBandGeometry({
        n: m.n,
        lo: { a: m.canopyOuterA, b: m.canopyOuterB, y: m.topY + 0.6 },
        hi: { a: m.canopyOuterA, b: m.canopyOuterB, y: m.canopyY + 0.05 },
      }),
    [m]
  );
  const canopyInnerFasciaGeo = useMemo(
    () =>
      buildBandGeometry({
        n: m.n,
        lo: { a: m.canopyInnerA, b: m.canopyInnerB, y: m.canopyY - 2.15 },
        hi: { a: m.canopyInnerA, b: m.canopyInnerB, y: m.canopyY - 0.82 },
      }),
    [m]
  );
  // Bright inner lip of the canopy (the white leading edge over the seats).
  const innerLipGeo = useMemo(
    () =>
      buildBandGeometry({
        n: m.n,
        lo: { a: m.canopyInnerA - 0.9, b: m.canopyInnerB - 0.9, y: m.canopyY - 1.1 },
        hi: { a: m.canopyInnerA + 1.2, b: m.canopyInnerB + 1.2, y: m.canopyY - 0.85 },
      }),
    [m]
  );
  // Continuous team-accent edge ring around the canopy outer rim.
  const accentRingGeo = useMemo(
    () =>
      buildBandGeometry({
        n: m.n,
        lo: { a: m.canopyOuterA - m.trimWidth, b: m.canopyOuterB - m.trimWidth, y: m.canopyY + 0.33 },
        hi: { a: m.canopyOuterA + 0.65, b: m.canopyOuterB + 0.65, y: m.canopyY + 0.22 },
      }),
    [m]
  );
  const plinthGeo = useMemo(
    () =>
      buildBandGeometry({
        n: m.n,
        lo: { a: m.facadeA + 0.9, b: m.facadeB + 0.9, y: 0.55 },
        hi: { a: m.facadeA + 0.9, b: m.facadeB + 0.9, y: 2.1 },
      }),
    [m]
  );

  // Ribbed petal panels laid radially across the canopy ring.
  const ribs = useMemo(() => {
    const count = m.ribCount;
    const out = [];
    const ra = (m.canopyInnerA + m.canopyOuterA) / 2;
    const rb = (m.canopyInnerB + m.canopyOuterB) / 2;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const [x, z] = superPoint(t, ra, rb, m.n);
      const [xi, zi] = superPoint(t, m.canopyInnerA, m.canopyInnerB, m.n);
      const [xo, zo] = superPoint(t, m.canopyOuterA, m.canopyOuterB, m.n);
      const span = Math.hypot(xo - xi, zo - zi) + 3.8;
      out.push({ x, z, rot: Math.atan2(x, z), span, alt: i % 2 === 0 });
    }
    return out;
  }, [m, level]);

  const DS = THREE.DoubleSide;
  return (
    <group>
      {/* Dark pitch-side perimeter wall + team-accent LED strip */}
      <mesh geometry={innerWallGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#1e232c" roughness={0.9} side={DS} />
      </mesh>
      <mesh geometry={ledGeo}>
        <meshStandardMaterial color="#10141b" emissive={accent} emissiveIntensity={0.45} roughness={0.4} side={DS} />
      </mesh>

      {/* Red/orange raked seating bowl (vertex-colored terraces) */}
      <mesh geometry={bowlGeo} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} side={DS} />
      </mesh>

      {/* Cream outer facade + single team-accent band */}
      <mesh geometry={plinthGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#bfb8a8" roughness={0.82} metalness={0.04} side={DS} />
      </mesh>
      <mesh geometry={facadeGeo} castShadow receiveShadow>
        <meshStandardMaterial color={FACADE_CREAM} roughness={0.7} metalness={0.08} side={DS} />
      </mesh>
      <mesh geometry={facadeBandGeo}>
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} roughness={0.45} side={DS} />
      </mesh>

      {/* Thick white/cream canopy ring with a pitch-sized field opening. */}
      <mesh geometry={canopyGeo} castShadow receiveShadow>
        <meshStandardMaterial color={CANOPY_CREAM} roughness={0.5} metalness={0.12} side={DS} />
      </mesh>
      <mesh geometry={canopyOuterWallGeo} castShadow receiveShadow>
        <meshStandardMaterial color={CANOPY_CREAM} roughness={0.58} metalness={0.1} side={DS} />
      </mesh>
      <mesh geometry={canopyInnerFasciaGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#d9d2c1" roughness={0.62} metalness={0.08} side={DS} />
      </mesh>
      <mesh geometry={innerLipGeo}>
        <meshStandardMaterial color={CANOPY_WHITE} roughness={0.3} metalness={0.2} side={DS} />
      </mesh>
      <mesh geometry={accentRingGeo}>
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} roughness={0.4} side={DS} />
      </mesh>

      {/* Ribbed petal panels across the canopy */}
      {ribs.map((r, i) => (
        <mesh key={i} position={[r.x, m.canopyY + 0.32, r.z]} rotation={[0, r.rot, 0]} castShadow>
          <boxGeometry args={[level >= 3 ? 0.64 : 0.46, 0.42, r.span]} />
          <meshStandardMaterial color={r.alt ? CANOPY_WHITE : CANOPY_CREAM} roughness={0.42} metalness={0.16} />
        </mesh>
      ))}

      {/* Front gold arrival strip, kept secondary to the closed bowl silhouette. */}
      {level >= 2 && (
        <mesh position={[0, m.topY + 0.8, m.facadeB + 0.9]} castShadow>
          <boxGeometry args={[58 + level * 12, 0.82, 0.7]} />
          <meshStandardMaterial color="#d9b44a" emissive="#d9b44a" emissiveIntensity={0.25} roughness={0.36} metalness={0.45} />
        </mesh>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODERN OVAL BOWL — continuous tiers, facade, roof, media band, portals
// (LEGACY — no longer rendered; kept for reference. See RectangularBowl above.)
// ═══════════════════════════════════════════════════════════════════════════
function OvalRing({
  inner,
  outer,
  y,
  color,
  scaleX = 1,
  scaleZ = 1,
  segments = 160,
  start = 0,
  length = Math.PI * 2,
  roughness = 0.75,
  metalness = 0,
  emissive,
  emissiveIntensity = 0,
  opacity = 1,
  side = THREE.DoubleSide,
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} scale={[scaleX, scaleZ, 1]} castShadow receiveShadow>
      <ringGeometry args={[inner, outer, segments, 1, start, length]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive || color}
        emissiveIntensity={emissiveIntensity}
        transparent={opacity < 1}
        opacity={opacity}
        side={side}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

function OvalWall({ radius, y, height, color, scaleX, scaleZ, start = 0, length = Math.PI * 2, metalness = 0.05 }) {
  return (
    <mesh position={[0, y, 0]} scale={[scaleX, 1, scaleZ]} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, 160, 1, true, start, length]} />
      <meshStandardMaterial color={color} roughness={0.68} metalness={metalness} side={THREE.DoubleSide} />
    </mesh>
  );
}

function BowlTier({ tier, scaleX, scaleZ, teamColor }) {
  const rows = useMemo(() => {
    return Array.from({ length: tier.rows }, (_, i) => {
      const t = tier.rows === 1 ? 0 : i / (tier.rows - 1);
      // A single dark vomitory walkway low in the rake reads as a real
      // concourse step rather than the bright light-grey "running-track lane"
      // the old mid-bowl band looked like.
      const walkway = t > 0.34 && t < 0.42;
      return {
        inner: tier.inner + i * tier.rowDepth,
        outer: tier.inner + (i + 0.9) * tier.rowDepth,
        y: tier.y + i * tier.rowRise,
        // Very tight value range so the rake reads as one massed block of
        // seats catching the light, not a stack of high-contrast oval lanes.
        color: walkway
          ? shade(teamColor, 0.6)
          : i % 2 === 0
            ? shade(teamColor, 1.06)
            : shade(teamColor, 0.97),
      };
    });
  }, [tier, teamColor]);

  return (
    <group>
      {rows.map((row, i) => (
        <OvalRing
          key={i}
          inner={row.inner}
          outer={row.outer}
          y={row.y}
          color={row.color}
          scaleX={scaleX}
          scaleZ={scaleZ}
          roughness={0.9}
          metalness={0}
        />
      ))}
      <OvalRing
        inner={tier.inner - 1.3}
        outer={tier.inner - 0.25}
        y={tier.y + 0.16}
        color="#1b2028"
        scaleX={scaleX}
        scaleZ={scaleZ}
        roughness={0.7}
      />
      <OvalRing
        inner={tier.inner + tier.rows * tier.rowDepth + 0.3}
        outer={tier.inner + tier.rows * tier.rowDepth + 1.9}
        y={tier.y + tier.rows * tier.rowRise + 0.28}
        color={shade(teamColor, 0.5)}
        scaleX={scaleX}
        scaleZ={scaleZ}
        roughness={0.7}
        metalness={0.05}
      />
    </group>
  );
}

function StadiumFacade({ config, scaleX, scaleZ, outer, teamColor, naming }) {
  const archCount = config.levelIndex >= 4 ? 28 : config.levelIndex >= 2 ? 22 : 16;
  const facadeHeight = config.facadeHeight;
  const archRadius = outer + 3.8;

  return (
    <group>
      <OvalRing inner={outer - 3.6} outer={outer + 5.2} y={0.96} color="#454b55" scaleX={scaleX} scaleZ={scaleZ} roughness={0.78} />
      <OvalWall radius={outer + 1.8} y={facadeHeight / 2 + 0.9} height={facadeHeight} color={config.facadeColor} scaleX={scaleX} scaleZ={scaleZ} metalness={0.16} />
      <OvalWall radius={outer + 5.0} y={facadeHeight + 1.6} height={1.6} color={shade(teamColor, 1.18)} scaleX={scaleX} scaleZ={scaleZ} metalness={0.3} />
      <OvalRing inner={outer + 3.7} outer={outer + 5.8} y={facadeHeight + 2.55} color="#aeb6c2" scaleX={scaleX} scaleZ={scaleZ} roughness={0.55} metalness={0.25} />

      {Array.from({ length: archCount }).map((_, i) => {
        const a = (i / archCount) * Math.PI * 2;
        const x = Math.cos(a) * archRadius * scaleX;
        const z = Math.sin(a) * archRadius * scaleZ;
        const h = facadeHeight * (i % 2 === 0 ? 0.68 : 0.54);
        return (
          <group key={i} position={[x, h / 2 + 1.2, z]} rotation={[0, -a + Math.PI / 2, 0]}>
            <mesh castShadow>
              <boxGeometry args={[1.1, h, 1.1]} />
              <meshStandardMaterial color="#d0d4dc" roughness={0.45} metalness={0.35} />
            </mesh>
            <mesh position={[0, h * 0.25, -0.72]}>
              <boxGeometry args={[2.7, h * 0.58, 0.16]} />
              <meshStandardMaterial color="#151a22" emissive="#9cc8ff" emissiveIntensity={config.levelIndex >= 3 ? 0.24 : 0.1} roughness={0.28} metalness={0.45} />
            </mesh>
          </group>
        );
      })}

      <group position={[0, 0, (outer + 5.9) * scaleZ]}>
        <mesh position={[0, 4.2, 0]} castShadow>
          <boxGeometry args={[32 + config.levelIndex * 7, 8.4, 2.4]} />
          <meshStandardMaterial color={shade(teamColor, 0.72)} roughness={0.45} metalness={0.28} />
        </mesh>
        <mesh position={[0, 3.0, 1.35]}>
          <boxGeometry args={[21 + config.levelIndex * 5, 4.8, 0.24]} />
          <meshStandardMaterial color="#121821" emissive="#ffd980" emissiveIntensity={0.35} roughness={0.28} />
        </mesh>
        <mesh position={[0, 8.8, 0.2]} castShadow>
          <boxGeometry args={[38 + config.levelIndex * 8, 1.1, 3.6]} />
          <meshStandardMaterial color="#d5b44a" emissive="#d5b44a" emissiveIntensity={0.25} metalness={0.5} roughness={0.32} />
        </mesh>
      </group>

      {naming && (
        <Text
          position={[0, facadeHeight + 5.4, -(outer + 6.4) * scaleZ]}
          rotation={[0, Math.PI, 0]}
          fontSize={3.8 + config.levelIndex * 0.35}
          color="#fff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000"
        >
          {naming.name ? `${naming.name} Arena` : 'Arena'}
        </Text>
      )}
    </group>
  );
}

function StadiumRoof({ config, scaleX, scaleZ, outer, teamColor }) {
  if (!config.roof) return null;

  const roofY = config.roofY;
  const roofInner = outer - config.roofDepth;
  const roofOuter = outer + 8;
  const partial = config.roof === 'partial';
  const arcs = partial
    ? [
        { start: Math.PI * 0.04, length: Math.PI * 0.92 },
        { start: Math.PI * 1.04, length: Math.PI * 0.92 },
      ]
    : [{ start: 0, length: Math.PI * 2 }];
  const ribCount = config.levelIndex >= 4 ? 36 : config.levelIndex >= 3 ? 28 : 18;

  return (
    <group>
      {arcs.map((arc, i) => (
        <OvalRing
          key={i}
          inner={roofInner}
          outer={roofOuter}
          y={roofY}
          color={config.roofColor}
          scaleX={scaleX}
          scaleZ={scaleZ}
          start={arc.start}
          length={arc.length}
          roughness={0.32}
          metalness={0.62}
          opacity={config.levelIndex >= 4 ? 0.92 : 0.84}
        />
      ))}
      <OvalRing inner={roofInner - 1.1} outer={roofInner + 0.7} y={roofY - 0.45} color="#edf1f5" scaleX={scaleX} scaleZ={scaleZ} roughness={0.25} metalness={0.65} />
      <OvalRing inner={roofOuter - 1.5} outer={roofOuter + 0.5} y={roofY - 0.25} color={shade(teamColor, 1.45)} scaleX={scaleX} scaleZ={scaleZ} roughness={0.32} metalness={0.5} emissive={shade(teamColor, 1.7)} emissiveIntensity={0.22} />
      {Array.from({ length: ribCount }).map((_, i) => {
        const a = (i / ribCount) * Math.PI * 2;
        if (partial && Math.sin(a) > -0.08 && Math.sin(a) < 0.08) return null;
        const r = outer - config.roofDepth * 0.45;
        const x = Math.cos(a) * r * scaleX;
        const z = Math.sin(a) * r * scaleZ;
        return (
          <mesh key={i} position={[x, roofY - 0.25, z]} rotation={[0, -a, 0]} castShadow>
            <boxGeometry args={[0.42, 0.5, config.roofDepth + 9]} />
            <meshStandardMaterial color="#d8dde5" roughness={0.3} metalness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

function Scoreboard({ position, rotation, level, teamColor, mountHeight = 0 }) {
  const w = level >= 4 ? 24 : level >= 2 ? 19 : 13;
  const h = level >= 4 ? 11 : level >= 2 ? 8.5 : 6;
  // Support gantry — legs run from the ground up to the panel so the board
  // reads as a pylon-mounted screen behind the goal instead of a black
  // rectangle floating in mid-air.
  const boardBottom = -(h / 2 + 0.6);
  const legBase = -mountHeight;
  const legLen = Math.max(0, boardBottom - legBase);
  const legCenterY = (boardBottom + legBase) / 2;
  const legX = w * 0.34;
  return (
    <group position={position} rotation={rotation}>
      {/* support pylons + ground footings (behind the screen, +z side) */}
      {mountHeight > 0 && legLen > 0 && [-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * legX, legCenterY, 0.55]} castShadow>
            <boxGeometry args={[1.1, legLen, 1.1]} />
            <meshStandardMaterial color="#3a414c" roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[s * legX, legBase + 0.4, 0.55]} castShadow>
            <boxGeometry args={[2.6, 0.8, 2.6]} />
            <meshStandardMaterial color="#4a4f57" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* diagonal brace between the legs for a believable truss */}
      {mountHeight > 0 && legLen > 6 && (
        <mesh position={[0, legCenterY, 0.55]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <boxGeometry args={[0.5, legX * 1.6, 0.5]} />
          <meshStandardMaterial color="#444b55" roughness={0.6} metalness={0.4} />
        </mesh>
      )}
      {/* brushed-metal bezel — lighter than before so the board reads as a
          mounted screen, not a black slab floating behind the goal */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[w + 1.5, h + 1.2, 0.9]} />
        <meshStandardMaterial color="#5a6678" roughness={0.4} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0, -0.52]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#16365a" emissive={shade(teamColor, 1.4)} emissiveIntensity={1.15} roughness={0.18} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
      </mesh>
      {/* faux scoreline panel so the screen reads as an active display */}
      <mesh position={[0, -h * 0.08, -0.6]}>
        <planeGeometry args={[w * 0.82, h * 0.28]} />
        <meshStandardMaterial color="#04101c" emissive="#7fd0ff" emissiveIntensity={0.45} roughness={0.2} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
      </mesh>
      <Text position={[0, h * 0.28, -0.62]} fontSize={level >= 3 ? 2.6 : 1.8} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.035} outlineColor="#000">
        PC GAFFER
      </Text>
      <mesh position={[0, -h * 0.34, -0.65]}>
        <boxGeometry args={[w * 0.68, 0.35, 0.12]} />
        <meshStandardMaterial color="#e7c463" emissive="#e7c463" emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

function IntegratedFloodlights({ config, scaleX, scaleZ, outer }) {
  if (!config.hasLights) return null;
  const count = config.levelIndex >= 4 ? 16 : config.levelIndex >= 2 ? 12 : 8;
  const y = config.roof ? config.roofY + 1.2 : config.facadeHeight + 13;
  const r = outer + 6;
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.PI / count;
        const x = Math.cos(a) * r * scaleX;
        const z = Math.sin(a) * r * scaleZ;
        return (
          <group key={i} position={[x, y, z]} rotation={[0, -a + Math.PI / 2, 0]}>
            <mesh castShadow>
              <boxGeometry args={[4.3, 1.1, 1]} />
              <meshStandardMaterial color="#f4f7ff" emissive="#fff1c7" emissiveIntensity={1.45} roughness={0.2} />
            </mesh>
            {i % 4 === 0 && <pointLight position={[0, -0.2, 0]} intensity={config.levelIndex >= 3 ? 34 : 22} distance={120} color="#fff0c4" decay={1.6} />}
          </group>
        );
      })}
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
function DistrictPlane({ position, size, color, rotation = 0, y = Y_MID_GRASS, roughness = 0.94 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, rotation]} position={[position[0], y, position[1]]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
    </mesh>
  );
}

function Road({ position, size, rotation = 0 }) {
  const longAxis = size[0] >= size[1] ? 'x' : 'z';
  const dashCount = Math.max(4, Math.floor((longAxis === 'x' ? size[0] : size[1]) / 32));

  return (
    <group>
      <DistrictPlane position={position} size={size} rotation={rotation} y={Y_ROAD} color="#2b3036" />
      {Array.from({ length: dashCount }).map((_, i) => {
        const t = (i + 0.5) / dashCount - 0.5;
        const localX = longAxis === 'x' ? t * size[0] : 0;
        const localZ = longAxis === 'z' ? t * size[1] : 0;
        const x = position[0] + localX * Math.cos(rotation) - localZ * Math.sin(rotation);
        const z = position[1] + localX * Math.sin(rotation) + localZ * Math.cos(rotation);
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, rotation]} position={[x, Y_ROAD + 0.015, z]}>
            <planeGeometry args={longAxis === 'x' ? [10, 0.45] : [0.45, 10]} />
            <meshStandardMaterial color="#d5d1bd" roughness={0.8} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
          </mesh>
        );
      })}
    </group>
  );
}

function TinyWheel({ position, radius = 0.34 }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[radius, radius, 0.26, 12]} />
      <meshStandardMaterial color="#101216" roughness={0.5} metalness={0.2} />
    </mesh>
  );
}

function Car({ position, rotation = 0, color = '#d8dee8', long = false }) {
  const bodyL = long ? 5.8 : 3.8;
  const cabinL = long ? 2.5 : 1.7;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[bodyL, 0.9, 1.8]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0.2, 1.0, 0]} castShadow>
        <boxGeometry args={[cabinL, 0.65, 1.55]} />
        <meshStandardMaterial color="#1c2b3a" emissive="#b9dcff" emissiveIntensity={0.15} roughness={0.22} metalness={0.35} />
      </mesh>
      <mesh position={[bodyL * 0.44, 0.56, 0]} castShadow>
        <boxGeometry args={[0.08, 0.42, 1.3]} />
        <meshStandardMaterial color="#f4f0d2" emissive="#ffeaa0" emissiveIntensity={0.35} roughness={0.45} />
      </mesh>
      {[-1, 1].map((x) => [-1, 1].map((z) => (
        <TinyWheel key={`${x}-${z}`} position={[x * bodyL * 0.34, 0.18, z * 0.96]} />
      )))}
    </group>
  );
}

function Bollard({ position, color = '#d9b44a' }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.16, 0.2, 1.1, 8]} />
      <meshStandardMaterial color={color} roughness={0.45} metalness={0.45} />
    </mesh>
  );
}

function Planter({ position, scale = 1 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.28 * scale, 0]} castShadow>
        <boxGeometry args={[2.2 * scale, 0.56 * scale, 1.4 * scale]} />
        <meshStandardMaterial color="#6b5846" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.4 * scale, 0]} castShadow>
        <sphereGeometry args={[0.9 * scale, 10, 8]} />
        <meshStandardMaterial color="#2f6a3a" roughness={0.9} />
      </mesh>
    </group>
  );
}

function DirectionArrow({ position, rotation = 0, color = '#f0eee5' }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1.1]}>
        <planeGeometry args={[0.7, 3.2]} />
        <meshStandardMaterial color={color} roughness={0.8} polygonOffset polygonOffsetFactor={-5} polygonOffsetUnits={-5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.01, 0.75]}>
        <planeGeometry args={[1.45, 1.45]} />
        <meshStandardMaterial color={color} roughness={0.8} polygonOffset polygonOffsetFactor={-5} polygonOffsetUnits={-5} />
      </mesh>
    </group>
  );
}

function Crosswalk({ position, rotation = 0, stripes = 6, width = 12 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: stripes }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-width / 2 + 1 + i * ((width - 2) / Math.max(1, stripes - 1)), Y_PARKING + 0.055, 0]}>
          <planeGeometry args={[0.85, 4.8]} />
          <meshStandardMaterial color="#ece8dc" roughness={0.82} polygonOffset polygonOffsetFactor={-5} polygonOffsetUnits={-5} />
        </mesh>
      ))}
    </group>
  );
}

function ParkingLot({ position, rotation = 0, columns = 8, rows = 3, size = [76, 34] }) {
  const colors = ['#f4f6f8', '#1f2d40', '#c72f35', '#2172b4', '#e1b640', '#66717f'];
  const cars = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      if ((r + c) % 5 === 0) continue;
      cars.push({
        x: -size[0] / 2 + 8 + c * ((size[0] - 16) / Math.max(1, columns - 1)),
        z: -size[1] / 2 + 8 + r * ((size[1] - 16) / Math.max(1, rows - 1)),
        color: colors[(r * columns + c) % colors.length],
      });
    }
  }

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <DistrictPlane position={[0, 0]} size={size} y={Y_PARKING} color="#24292f" />
      <DistrictPlane position={[0, 0]} size={[size[0] - 5, size[1] - 5]} y={Y_PARKING + 0.01} color="#323941" />
      <DistrictPlane position={[0, 0]} size={[size[0] - 10, 6.5]} y={Y_PARKING + 0.025} color="#20262d" />
      <DirectionArrow position={[-size[0] * 0.22, Y_PARKING + 0.06, 0]} rotation={Math.PI / 2} />
      <DirectionArrow position={[size[0] * 0.2, Y_PARKING + 0.06, 0]} rotation={-Math.PI / 2} />
      <Crosswalk position={[-size[0] / 2 + 8, 0, size[1] / 2 - 4]} rotation={Math.PI / 2} stripes={5} width={9} />
      {Array.from({ length: columns + 1 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-size[0] / 2 + 4 + i * ((size[0] - 8) / columns), Y_PARKING + 0.03, 0]}>
          <planeGeometry args={[0.38, size[1] - 10]} />
          <meshStandardMaterial color="#f2f4f7" emissive="#ffffff" emissiveIntensity={0.16} roughness={0.78} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
        </mesh>
      ))}
      {Array.from({ length: rows + 1 }).map((_, i) => (
        <mesh key={`row-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, Y_PARKING + 0.032, -size[1] / 2 + 5 + i * ((size[1] - 10) / rows)]}>
          <planeGeometry args={[size[0] - 10, 0.28]} />
          <meshStandardMaterial color="#dfe5ee" emissive="#ffffff" emissiveIntensity={0.1} roughness={0.85} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
        </mesh>
      ))}
      {cars.map((car, i) => (
        <Car key={i} position={[car.x, Y_PARKING + 0.45, car.z]} rotation={Math.PI / 2} color={car.color} />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <LampPost position={[s * (size[0] / 2 - 5), 0, -size[1] / 2 + 5]} />
          <Planter position={[s * (size[0] / 2 - 7), Y_PARKING, size[1] / 2 - 5]} scale={0.75} />
        </group>
      ))}
    </group>
  );
}

function TreeRow({ points, count, scale = 1 }) {
  const [a, b] = points;
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const x = a[0] + (b[0] - a[0]) * t;
        const z = a[1] + (b[1] - a[1]) * t;
        const offset = (i % 3 - 1) * 1.4;
        return <Tree key={i} position={[x + offset, 0, z - offset * 0.35]} scale={scale + (i % 2) * 0.08} />;
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CAMPUS FEATURES
// Each appears ONLY when its matching stadium service is built (level > 0) and
// grows in scale/detail with the level. This makes service upgrades physically
// visible in the campus around the stadium.
// ═══════════════════════════════════════════════════════════════════════════
function SignText({ position, children, size = 1.4, color = '#fff', outline = '#0a0a0a', rotation = [0, 0, 0] }) {
  return (
    <Text
      position={position}
      rotation={rotation}
      fontSize={size}
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={size * 0.03}
      outlineColor={outline}
      maxWidth={48}
    >
      {children}
    </Text>
  );
}

// MERCHANDISE → official club shop / megastore near the main entrance
function MerchStore({ position, rotation = 0, level = 1, teamColor = '#1e4a74' }) {
  const w = 24 + level * 5.2;
  const d = 13 + level * 1.9;
  const twoStorey = level >= 3;
  const h = twoStorey ? 14 : 8.8;
  const accent = shade(teamColor, 1.55);
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <DistrictPlane position={[0, d * 0.5 + 5]} size={[w + 22, 18]} y={Y_PARKING} color="#c4bba6" />
      <DistrictPlane position={[0, d * 0.5 + 5]} size={[w * 0.86, 4.2]} y={Y_PARKING + 0.025} color="#ede7d8" />
      {/* main body */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#eef1f5" roughness={0.6} metalness={0.05} />
      </mesh>
      {/* team-colored crown / fascia */}
      <mesh position={[0, h + 0.6, 0]} castShadow>
        <boxGeometry args={[w + 1.4, 2.4, d + 1.3]} />
        <meshStandardMaterial color={teamColor} roughness={0.42} metalness={0.28} emissive={accent} emissiveIntensity={0.38} />
      </mesh>
      {/* glazed storefront — front face (+Z), toward the approach */}
      <mesh position={[0, h * 0.42, d / 2 + 0.07]}>
        <planeGeometry args={[w * 0.92, h * 0.68]} />
        <meshStandardMaterial
          color="#0c2536"
          emissive="#cfeaff"
          emissiveIntensity={0.45}
          roughness={0.12}
          metalness={0.6}
          polygonOffset
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
        />
      </mesh>
      {[-0.32, 0, 0.32].map((x, i) => (
        <mesh key={i} position={[x * w, h * 0.42, d / 2 + 0.1]}>
          <planeGeometry args={[0.18, h * 0.56]} />
          <meshStandardMaterial color="#dce8f2" roughness={0.28} metalness={0.35} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * w * 0.27, 0, d / 2 + 0.18]}>
          <mesh position={[-0.65, 1.65, 0]}>
            <planeGeometry args={[0.85, 2.2]} />
            <meshStandardMaterial color="#f5f5f5" emissive="#ffffff" emissiveIntensity={0.25} polygonOffset polygonOffsetFactor={-5} polygonOffsetUnits={-5} />
          </mesh>
          <mesh position={[0, 1.75, 0]}>
            <planeGeometry args={[0.8, 2.4]} />
            <meshStandardMaterial color={teamColor} emissive={accent} emissiveIntensity={0.22} polygonOffset polygonOffsetFactor={-5} polygonOffsetUnits={-5} />
          </mesh>
          <mesh position={[0.65, 1.65, 0]}>
            <planeGeometry args={[0.85, 2.2]} />
            <meshStandardMaterial color="#f5f5f5" emissive="#ffffff" emissiveIntensity={0.25} polygonOffset polygonOffsetFactor={-5} polygonOffsetUnits={-5} />
          </mesh>
        </group>
      ))}
      {/* entrance canopy */}
      <mesh position={[0, h * 0.6, d / 2 + 1.8]} castShadow>
        <boxGeometry args={[w * 0.66, 0.44, 3.8]} />
        <meshStandardMaterial color={teamColor} roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * w * 0.17, 1.5, d / 2 + 0.16]}>
          <planeGeometry args={[1.7, 3]} />
          <meshStandardMaterial color="#10141b" emissive="#75c8ff" emissiveIntensity={0.22} polygonOffset polygonOffsetFactor={-5} polygonOffsetUnits={-5} />
        </mesh>
      ))}
      {/* shop sign on the fascia */}
      <SignText position={[0, h + 0.8, d / 2 + 0.8]} size={2.45} color="#ffffff" outline={shade(teamColor, 0.25)}>
        MEGASTORE
      </SignText>
      {[-1, 1].map((s) => <Planter key={s} position={[s * (w * 0.5 + 2.2), Y_PARKING, d / 2 + 4.2]} scale={0.85} />)}
      {/* vertical totem sign for established stores */}
      {level >= 2 && (
        <group position={[w / 2 + 2.4, 0, d / 2 - 0.5]}>
          <mesh position={[0, 5.5, 0]} castShadow>
            <boxGeometry args={[0.5, 11, 0.5]} />
            <meshStandardMaterial color="#3a3f48" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 9.8, 0]} castShadow>
            <boxGeometry args={[3.6, 4.5, 0.55]} />
            <meshStandardMaterial color={teamColor} emissive={accent} emissiveIntensity={0.5} roughness={0.4} />
          </mesh>
          <SignText position={[0, 9.8, 0.36]} size={1.45} color="#fff" outline={shade(teamColor, 0.35)}>
            CLUB
          </SignText>
        </group>
      )}
      {/* flagship banners flanking the entrance (megastore) */}
      {twoStorey &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[s * w * 0.34, h * 0.45, d / 2 + 0.12]}>
            <planeGeometry args={[1.6, h * 0.7]} />
            <meshStandardMaterial
              color={accent}
              emissive={accent}
              emissiveIntensity={0.3}
              roughness={0.5}
              polygonOffset
              polygonOffsetFactor={-4}
              polygonOffsetUnits={-4}
            />
          </mesh>
        ))}
    </group>
  );
}

function Kiosk({ position, color = '#c9543b', awning = '#e7e2d6' }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 2.8, 3]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.5, 1.52]}>
        <planeGeometry args={[2.6, 1.1]} />
        <meshStandardMaterial color="#161a22" emissive="#ffd98a" emissiveIntensity={0.3} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      <mesh position={[0, 2.85, 1.9]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[3.6, 0.12, 1.6]} />
        <meshStandardMaterial color={awning} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 1.82]} castShadow>
        <boxGeometry args={[3, 0.38, 0.32]} />
        <meshStandardMaterial color="#f0e5cc" roughness={0.75} />
      </mesh>
    </group>
  );
}

function CafeTable({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.72, 0.12, 14]} />
        <meshStandardMaterial color="#ede5d3" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6, 8]} />
        <meshStandardMaterial color="#555b63" metalness={0.35} roughness={0.55} />
      </mesh>
      {[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, z], i) => (
        <mesh key={i} position={[x * 1.05, 0.36, z * 1.05]} castShadow>
          <boxGeometry args={[0.48, 0.32, 0.48]} />
          <meshStandardMaterial color="#607082" roughness={0.78} />
        </mesh>
      ))}
    </group>
  );
}

function Umbrella({ position, color = '#d8533d' }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.1, 12]} />
        <meshStandardMaterial color="#cfcabb" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.2, 6]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[0, 2.3, 0]} castShadow>
        <coneGeometry args={[1.8, 0.8, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <CafeTable position={[0, 0, 0]} />
    </group>
  );
}

// CATERING → fan food court: concession building, kiosks, terrace
function FoodCourt({ position, rotation = 0, level = 1, teamColor = '#1e4a74' }) {
  const restW = 20 + level * 3.3;
  const kioskCount = Math.min(5, 1 + level);
  const umbrellaCount = Math.min(6, 2 + level);
  const kioskColors = ['#c9543b', '#3b7dc9', '#d7a93f', '#3ca06a', '#a14bd1'];
  const umbColors = ['#d8533d', '#e0a23a', '#3f9a5c'];
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <DistrictPlane position={[0, 1]} size={[restW + 34, 29]} y={Y_PARKING} color="#b9b09b" />
      <DistrictPlane position={[0, 5.5]} size={[restW + 24, 7.2]} y={Y_PARKING + 0.025} color="#d9cfb8" />
      {/* restaurant / concession building */}
      <mesh position={[-restW * 0.2, 2.4, -5]} castShadow receiveShadow>
        <boxGeometry args={[restW, 6.2, 11.5]} />
        <meshStandardMaterial color="#d9c4a0" roughness={0.75} />
      </mesh>
      <mesh position={[-restW * 0.2, 6.55, -5]} castShadow>
        <boxGeometry args={[restW + 1.2, 0.9, 12.5]} />
        <meshStandardMaterial color={shade(teamColor, 0.8)} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[-restW * 0.2, 3.3, 0.8]}>
        <planeGeometry args={[restW * 0.86, 2.9]} />
        <meshStandardMaterial color="#1a1f29" emissive="#ffce7a" emissiveIntensity={0.3} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      {[-0.35, 0, 0.35].map((x, i) => (
        <mesh key={i} position={[-restW * 0.2 + x * restW * 0.55, 1.25, 0.1]}>
          <planeGeometry args={[2.4, 1.25]} />
          <meshStandardMaterial color="#4b2a18" emissive="#ffb85c" emissiveIntensity={0.28} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
        </mesh>
      ))}
      <SignText position={[-restW * 0.2, 7.1, 0.8]} size={1.45} color="#fff" outline="#5a3b22">
        FOOD
      </SignText>
      {/* kiosk row */}
      {Array.from({ length: kioskCount }).map((_, i) => (
        <Kiosk key={i} position={[restW * 0.5 - 2 + i * 4.4, 0, 2]} color={kioskColors[i % kioskColors.length]} />
      ))}
      {/* terrace umbrellas */}
      {Array.from({ length: umbrellaCount }).map((_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return <Umbrella key={i} position={[-restW * 0.45 + col * 3.2, 0, 6 + row * 3.2]} color={umbColors[i % 3]} />;
      })}
      {level >= 2 && <Planter position={[restW * 0.72, Y_PARKING, 8.2]} scale={0.8} />}
    </group>
  );
}

// EVENTS → event plaza with stage, truss rig, marquees and loading zone
function EventStage({ position, rotation = 0, level = 1 }) {
  const stageW = 18 + level * 4;
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <DistrictPlane position={[0, 0]} size={[stageW + 34, 44]} y={Y_PARKING} color="#9a9385" />
      <DistrictPlane position={[0, 8]} size={[stageW + 18, 15]} y={Y_PARKING + 0.025} color="#b9b09b" />
      {/* stage deck */}
      <mesh position={[0, 1.2, -10]} castShadow receiveShadow>
        <boxGeometry args={[stageW, 2.4, 9]} />
        <meshStandardMaterial color="#2b2f37" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.65, -5.3]} castShadow>
        <boxGeometry args={[stageW * 0.92, 0.24, 1.1]} />
        <meshStandardMaterial color="#11151d" roughness={0.55} />
      </mesh>
      {/* backdrop screen */}
      <mesh position={[0, 6.5, -14]} castShadow>
        <boxGeometry args={[stageW * 0.92, 8, 0.6]} />
        <meshStandardMaterial color="#0c0f15" emissive="#3a6ea5" emissiveIntensity={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 6.55, -13.65]}>
        <planeGeometry args={[stageW * 0.74, 5.4]} />
        <meshStandardMaterial color="#12243b" emissive="#3ca7ff" emissiveIntensity={0.38} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
      </mesh>
      <SignText position={[0, 6.65, -13.3]} size={1.1} color="#d9f0ff" outline="#07101d">
        EVENTOS
      </SignText>
      {/* truss uprights + crossbar */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * stageW * 0.48, 0, -9]}>
          {[0, 1].map((j) => (
            <mesh key={j} position={[j * s * 0.55, 6, 0]} castShadow>
              <boxGeometry args={[0.28, 12, 0.28]} />
              <meshStandardMaterial color="#3a3f48" metalness={0.7} roughness={0.35} />
            </mesh>
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <mesh key={`brace-${i}`} position={[s * 0.28, 2.3 + i * 2.5, 0]} rotation={[0, 0, s * 0.58]} castShadow>
              <boxGeometry args={[0.25, 1.55, 0.25]} />
              <meshStandardMaterial color="#56606c" metalness={0.65} roughness={0.35} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 12, -9]} castShadow>
        <boxGeometry args={[stageW + 1, 0.6, 0.6]} />
        <meshStandardMaterial color="#3a3f48" metalness={0.7} roughness={0.35} />
      </mesh>
      {[-0.3, -0.1, 0.1, 0.3].map((f, i) => (
        <mesh key={i} position={[f * stageW, 11.4, -9]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#fff" emissive="#ffe9b0" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {/* marquee tents */}
      {level >= 2 &&
        [-1, 1].map((s) => (
          <group key={s} position={[s * (stageW * 0.5 + 6), 0, 7]}>
            <mesh position={[0, 1.4, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 2.8, 6]} />
              <meshStandardMaterial color="#777" />
            </mesh>
            <mesh position={[0, 3.2, 0]} castShadow>
              <coneGeometry args={[5, 3, 4]} />
              <meshStandardMaterial color="#e9e4d8" roughness={0.85} />
            </mesh>
          </group>
        ))}
      {/* loading truck */}
      {level >= 3 && (
        <group position={[stageW * 0.5 + 12, 0, -8]}>
          <mesh position={[0, 2, 0]} castShadow>
            <boxGeometry args={[10, 4, 4]} />
            <meshStandardMaterial color="#b6bcc6" />
          </mesh>
          <mesh position={[-6, 1.5, 0]} castShadow>
            <boxGeometry args={[3, 3, 3.6]} />
            <meshStandardMaterial color="#586071" />
          </mesh>
        </group>
      )}
      {Array.from({ length: Math.min(10, 4 + level * 2) }).map((_, i) => (
        <mesh key={i} position={[-stageW * 0.4 + (i % 5) * stageW * 0.2, 0.35, 7 + Math.floor(i / 5) * 4]} castShadow>
          <boxGeometry args={[1.2, 0.7, 1.2]} />
          <meshStandardMaterial color={i % 2 ? '#495260' : '#303844'} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// VIP → premium arrival building with lounge, valet loop and suite terrace
function VipArrival({ position, rotation = 0, level = 1 }) {
  const gold = '#d9b44a';
  const w = 30 + level * 5.8;
  const d = 14 + level * 1.8;
  const h = level >= 2 ? 12.2 : 8.6;
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <DistrictPlane position={[0, 1]} size={[w + 24, 30]} y={Y_PARKING} color="#22262e" />
      <DistrictPlane position={[0, d * 0.5 + 5.5]} size={[w * 0.78, 4.8]} y={Y_PARKING + 0.03} color="#a21f25" />
      <DistrictPlane position={[0, 4.1]} size={[w + 14, 7.2]} y={Y_PARKING + 0.02} color="#151b23" />
      <DirectionArrow position={[-w * 0.28, Y_PARKING + 0.055, 3.8]} rotation={Math.PI / 2} color="#d8d2bd" />
      <DirectionArrow position={[w * 0.26, Y_PARKING + 0.055, 3.8]} rotation={-Math.PI / 2} color="#d8d2bd" />
      <Crosswalk position={[-w * 0.42, 0, d * 0.5 + 4.8]} rotation={Math.PI / 2} stripes={4} width={7} />

      <mesh position={[0, h / 2, -1.4]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#11151c" roughness={0.42} metalness={0.25} />
      </mesh>
      <mesh position={[0, h * 0.48, d / 2 - 1.25]}>
        <planeGeometry args={[w * 0.88, h * 0.68]} />
        <meshStandardMaterial color="#06101a" emissive="#cceeff" emissiveIntensity={0.44} roughness={0.12} metalness={0.62} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
      </mesh>
      {[-0.33, 0, 0.33].map((x, i) => (
        <mesh key={i} position={[x * w, h * 0.48, d / 2 - 1.2]}>
          <planeGeometry args={[0.16, h * 0.58]} />
          <meshStandardMaterial color="#d7e4eb" roughness={0.24} metalness={0.35} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.42, -1.4]} castShadow>
        <boxGeometry args={[w + 1.8, 1.1, d + 1.5]} />
        <meshStandardMaterial color="#2b3038" roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[0, h * 0.64, d / 2 + 1.4]} castShadow>
        <boxGeometry args={[w + 5.5, 0.78, 6.4]} />
        <meshStandardMaterial color={gold} metalness={0.65} roughness={0.28} emissive={gold} emissiveIntensity={0.34} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * w * 0.42, h * 0.32, d / 2 + 0.4]} castShadow>
          <cylinderGeometry args={[0.34, 0.42, h * 0.64, 10]} />
          <meshStandardMaterial color="#e8e2d4" roughness={0.4} metalness={0.45} />
        </mesh>
      ))}
      {level >= 2 && (
        <group position={[0, h + 1.2, -1.4]}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[w * 0.62, 1.4, d * 0.56]} />
            <meshStandardMaterial color="#10141b" roughness={0.38} metalness={0.35} />
          </mesh>
          <mesh position={[0, 1.52, 0]}>
            <boxGeometry args={[w * 0.5, 0.26, d * 0.45]} />
            <meshStandardMaterial color={gold} metalness={0.65} roughness={0.28} emissive={gold} emissiveIntensity={0.18} />
          </mesh>
        </group>
      )}
      <Car position={[-w * 0.2, Y_PARKING + 0.45, 4.1]} rotation={Math.PI / 2} color="#090b0f" long />
      {level >= 2 && <Car position={[w * 0.24, Y_PARKING + 0.45, 3.3]} rotation={-Math.PI / 2} color="#151922" />}
      {[-3, -2, -1, 1, 2, 3].map((i) => <Bollard key={i} position={[i * 1.7, Y_PARKING + 0.55, d / 2 + 2.8]} color={gold} />)}
      {[-1, 1].map((s) => <Planter key={s} position={[s * (w * 0.5 + 2.6), Y_PARKING, d / 2 + 4.2]} scale={0.8} />)}
      <SignText position={[0, h * 0.68, d / 2 + 2.35]} size={2.35} color={gold} outline="#1a1206">
        VIP
      </SignText>
    </group>
  );
}

// PARKING → surface lot + barrier + multi-storey garage, scaled by level
function ParkingBarrier({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[2.3, 1.2, -1.7]} castShadow>
        <boxGeometry args={[2.8, 2.4, 2.2]} />
        <meshStandardMaterial color="#d6d0be" roughness={0.72} />
      </mesh>
      <mesh position={[2.3, 1.45, -0.55]}>
        <planeGeometry args={[1.8, 0.85]} />
        <meshStandardMaterial color="#182231" emissive="#8fc9ff" emissiveIntensity={0.25} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.5, 1.2, 0.5]} />
        <meshStandardMaterial color="#c33" />
      </mesh>
      <mesh position={[1.6, 1.0, 0]} castShadow>
        <boxGeometry args={[3, 0.16, 0.16]} />
        <meshStandardMaterial color="#eee" emissive="#e33" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[2.4, 0.7, 0]} castShadow>
        <boxGeometry args={[1.4, 1.4, 1.4]} />
        <meshStandardMaterial color="#5a6270" />
      </mesh>
    </group>
  );
}

function ParkingGarage({ position, rotation = 0, floors = 3 }) {
  const w = 48;
  const d = 34;
  const fh = 3.8;
  const H = floors * fh;
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <DistrictPlane position={[0, 0]} size={[w + 12, d + 12]} y={Y_PARKING} color="#2b3037" />
      {Array.from({ length: floors }).map((_, i) => (
        <group key={i}>
          <mesh position={[0, 0.3 + i * fh, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.6, d]} />
            <meshStandardMaterial color={i % 2 ? '#c1c7cf' : '#aeb5bf'} roughness={0.78} />
          </mesh>
          <mesh position={[0, 1.05 + i * fh, d / 2 + 0.24]} castShadow>
            <boxGeometry args={[w + 0.7, 0.44, 0.48]} />
            <meshStandardMaterial color="#eef2f7" roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.05 + i * fh, -d / 2 - 0.24]} castShadow>
            <boxGeometry args={[w + 0.7, 0.44, 0.48]} />
            <meshStandardMaterial color="#eef2f7" roughness={0.6} />
          </mesh>
          {[-0.32, 0, 0.32].map((x, j) => (
            <mesh key={`stripe-${j}`} position={[x * w, 0.66 + i * fh, d / 2 + 0.52]}>
              <boxGeometry args={[0.36, 0.3, 1.05]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.16} roughness={0.55} />
            </mesh>
          ))}
          {[-0.28, 0.28].map((x, j) => (
            <Car key={j} position={[x * w, 0.9 + i * fh, j ? d * 0.23 : -d * 0.24]} rotation={Math.PI / 2} color={j ? '#40516a' : '#d8dee8'} />
          ))}
        </group>
      ))}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}-${sz}`} position={[sx * (w / 2 - 2), H / 2, sz * (d / 2 - 2)]} castShadow>
          <boxGeometry args={[0.8, H, 0.8]} />
          <meshStandardMaterial color="#707782" roughness={0.72} />
        </mesh>
      )))}
      {[-0.33, 0, 0.33].map((x, i) => (
        <mesh key={i} position={[x * w, H / 2, d / 2 + 0.2]} castShadow>
          <boxGeometry args={[0.55, H, 0.55]} />
          <meshStandardMaterial color="#707782" roughness={0.72} />
        </mesh>
      ))}
      <mesh position={[0, H + 0.85, 0]} castShadow>
        <boxGeometry args={[w + 1.6, 1.2, d + 1.6]} />
        <meshStandardMaterial color="#8f98a5" roughness={0.74} />
      </mesh>
      <mesh position={[-w / 2 - 0.72, H * 0.68, d * 0.32]} castShadow>
        <boxGeometry args={[0.65, 7.2, 6.4]} />
        <meshStandardMaterial color="#1459df" emissive="#2563eb" emissiveIntensity={0.55} />
      </mesh>
      <SignText position={[-w / 2 - 0.86, H * 0.7, d * 0.3]} size={4.1} color="#fff" outline="#061643" rotation={[0, -Math.PI / 2, 0]}>
        P
      </SignText>
      <mesh position={[0, H * 0.7, d / 2 + 0.68]} castShadow>
        <boxGeometry args={[13, 7.4, 0.7]} />
        <meshStandardMaterial color="#1459df" emissive="#2563eb" emissiveIntensity={0.5} />
      </mesh>
      <SignText position={[0, H * 0.7, d / 2 + 1.06]} size={4.2} color="#fff" outline="#061643">
        P
      </SignText>
      <mesh position={[w / 2 + 3, 1.35, 0]} rotation={[0, 0, -0.25]} castShadow>
        <boxGeometry args={[11, 0.62, d * 0.6]} />
        <meshStandardMaterial color="#444a54" roughness={0.76} />
      </mesh>
      {floors >= 4 && (
        <mesh position={[-w * 0.18, H + 1.45, 0]} castShadow>
          <boxGeometry args={[w * 0.45, 0.9, d * 0.42]} />
          <meshStandardMaterial color="#c8cdd5" roughness={0.7} />
        </mesh>
      )}
    </group>
  );
}

function ParkingComplex({ position, rotation = 0, level = 1 }) {
  const columns = Math.round(5 + level * 2.2);
  const rows = level >= 3 ? 4 : 3;
  const lotW = 42 + level * 10;
  const lotD = level >= 3 ? 46 : 34;
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <ParkingLot position={[0, 0]} columns={columns} rows={rows} size={[lotW, lotD]} />
      {level >= 2 && <ParkingBarrier position={[-lotW / 2 - 1.5, 0, lotD / 2 - 3]} />}
      {level >= 3 && <ParkingGarage position={[lotW * 0.18, -lotD / 2 - 31]} floors={level >= 4 ? 4 : 3} />}
      {level >= 2 && <SignText position={[-lotW * 0.32, 3.2, -lotD / 2 - 1.2]} size={1.8} color="#fff" outline="#10234c">PARKING</SignText>}
    </group>
  );
}

function LampPost({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 6, 6]} />
        <meshStandardMaterial color="#3a3f48" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 6.1, 0]}>
        <boxGeometry args={[0.7, 0.3, 0.7]} />
        <meshStandardMaterial color="#fff" emissive="#ffeec2" emissiveIntensity={1.1} />
      </mesh>
    </group>
  );
}

function EntranceGate({ position, rotation = 0, color = '#1e4a74' }) {
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 4, 2.6, 0]} castShadow>
          <boxGeometry args={[1.4, 5.2, 1.4]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 5.4, 0]} castShadow>
        <boxGeometry args={[10, 1.1, 1.6]} />
        <meshStandardMaterial color={shade(color, 1.3)} emissive={shade(color, 1.4)} emissiveIntensity={0.2} roughness={0.5} />
      </mesh>
      {[-2, -0.7, 0.7, 2].map((x, i) => (
        <mesh key={i} position={[x, 1.1, 0]} castShadow>
          <boxGeometry args={[0.12, 2.2, 0.12]} />
          <meshStandardMaterial color="#cfd3da" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function seededSequence(seed, count) {
  const out = new Array(count);
  let s = seed >>> 0;
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280;
    out[i] = s / 233280;
  }
  return out;
}

function DesignedSurroundings({ stadiumRadius = 80, services = {}, teamColor = '#1e4a74', xExtent = 90, zExtent = 70 }) {
  const svc = services || {};
  const district = useMemo(() => {
    const jitter = seededSequence(8128, 96);
    const housePalette = ['#bfa98d', '#d1bea0', '#a9957e', '#c9b18f'];
    const roofs = ['#70362a', '#5d3528', '#7d4931'];
    const houses = [];
    const neighborhoodRows = [
      { z: -265, xs: [-168, -142, -116, -90, 92, 118, 144, 170], rot: 0 },
      { z: 266, xs: [-170, -144, -118, -92, 94, 120, 146, 172], rot: Math.PI },
    ];
    let n = 0;
    neighborhoodRows.forEach((row) => {
      row.xs.forEach((x) => {
        houses.push({
          kind: 'house',
          position: [x + (jitter[n++] - 0.5) * 2.4, 0, row.z + (jitter[n++] - 0.5) * 2.2],
          color: housePalette[n % housePalette.length],
          roof: roofs[n % roofs.length],
          height: 5.4 + jitter[n++] * 1.4,
          width: 7.2 + jitter[n++] * 1.6,
          depth: 7 + jitter[n++] * 1.8,
          rotation: row.rot + (jitter[n++] - 0.5) * 0.06,
        });
      });
    });

    const apartments = [
      [-236, -305, 24, 12, 13], [-212, -305, 18, 11, 11], [-188, -305, 30, 13, 12],
      [188, -305, 22, 12, 12], [214, -305, 28, 13, 12], [240, -305, 20, 11, 12],
      [-236, 306, 20, 11, 13], [-210, 306, 28, 13, 12], [-184, 306, 23, 12, 12],
      [188, 306, 26, 13, 13], [216, 306, 32, 14, 12], [244, 306, 24, 12, 12],
    ].map(([x, z, height, width, depth], i) => ({
      kind: 'apt',
      position: [x, 0, z],
      color: ['#8792a1', '#a2a999', '#7d8796', '#b5aa96'][i % 4],
      height,
      width,
      depth,
      rotation: z < 0 ? 0 : Math.PI,
    }));

    return { buildings: [...houses, ...apartments] };
  }, []);

  const plazaOuter = stadiumRadius + 30;
  const plazaInner = stadiumRadius + 3;
  const boulevard = stadiumRadius + 56;
  const serviceEdge = stadiumRadius + 92;
  const approachLength = serviceEdge - plazaOuter;
  const approachOffset = plazaOuter + approachLength / 2;

  return (
    <group>
      {/* Intentional ground zoning: stadium campus, service blocks, residential strips, distant skyline. */}
      <DistrictPlane position={[0, 0]} size={[470, 430]} y={Y_MID_GRASS} color="#7f8d65" />
      <DistrictPlane position={[0, 0]} size={[310, 270]} y={Y_MID_GRASS + 0.01} color="#87936f" />
      <DistrictPlane position={[0, -serviceEdge - 36]} size={[370, 76]} y={Y_MID_GRASS + 0.02} color="#6f7f59" />
      <DistrictPlane position={[0, serviceEdge + 36]} size={[370, 76]} y={Y_MID_GRASS + 0.02} color="#6f7f59" />
      <DistrictPlane position={[0, -serviceEdge - 105]} size={[520, 58]} y={Y_MID_GRASS + 0.015} color="#6a7659" />
      <DistrictPlane position={[0, serviceEdge + 105]} size={[520, 58]} y={Y_MID_GRASS + 0.015} color="#6a7659" />

      {/* Rectangular paved plaza apron around the stadium footprint (replaces
          the old concentric plaza rings that reinforced the racetrack look). */}
      <DistrictPlane position={[0, 0]} size={[plazaOuter * 2, plazaOuter * 2]} y={Y_PLAZA} color="#c7bfae" />
      <DistrictPlane position={[0, 0]} size={[(stadiumRadius + 16) * 2, (stadiumRadius + 16) * 2]} y={Y_PLAZA_BAND} color="#ded7c7" />

      <DistrictPlane position={[0, -boulevard]} size={[240, 18]} y={Y_PLAZA + 0.01} color="#b8af9c" />
      <DistrictPlane position={[0, boulevard]} size={[240, 18]} y={Y_PLAZA + 0.01} color="#b8af9c" />
      <DistrictPlane position={[-boulevard, 0]} size={[18, 210]} y={Y_PLAZA + 0.01} color="#b8af9c" />
      <DistrictPlane position={[boulevard, 0]} size={[18, 210]} y={Y_PLAZA + 0.01} color="#b8af9c" />

      <Road position={[0, -approachOffset]} size={[14, approachLength]} />
      <Road position={[0, approachOffset]} size={[14, approachLength]} />
      <Road position={[-approachOffset, 0]} size={[approachLength, 14]} />
      <Road position={[approachOffset, 0]} size={[approachLength, 14]} />
      <Road position={[0, -serviceEdge]} size={[360, 13]} />
      <Road position={[0, serviceEdge]} size={[360, 13]} />
      <Road position={[-serviceEdge, 0]} size={[13, 310]} />
      <Road position={[serviceEdge, 0]} size={[13, 310]} />
      <DistrictPlane position={[0, zExtent + 15]} size={[148, 11]} y={Y_PLAZA + 0.03} color="#ded7c7" />
      <DistrictPlane position={[-50, zExtent + 16]} size={[9, 26]} y={Y_PLAZA + 0.035} color="#d5cdbb" />
      <DistrictPlane position={[50, zExtent + 16]} size={[9, 26]} y={Y_PLAZA + 0.035} color="#d5cdbb" />
      <DistrictPlane position={[0, zExtent + 14]} size={[12, 22]} y={Y_PLAZA + 0.04} color="#d5cdbb" />
      <DistrictPlane position={[xExtent + 20, -6]} size={[52, 9]} y={Y_PLAZA + 0.035} color="#d5cdbb" />
      <DistrictPlane position={[-(xExtent + 20), 6]} size={[52, 9]} y={Y_PLAZA + 0.035} color="#d5cdbb" />

      {/* ─── Service-driven campus features (only render when built) ───
          merchandise + VIP + catering live on the front (+Z) commercial belt,
          events on the rear (−Z) plaza, parking on the (±X) flanks. */}
      {svc.merchandise > 0 && (
        <MerchStore position={[-52, zExtent + 16]} rotation={0} level={svc.merchandise} teamColor={teamColor} />
      )}
      {svc.catering > 0 && (
        <FoodCourt position={[52, zExtent + 16]} rotation={0} level={svc.catering} teamColor={teamColor} />
      )}
      {svc.vip > 0 && <VipArrival position={[0, zExtent + 12]} rotation={0} level={svc.vip} />}
      {svc.events > 0 && <EventStage position={[0, -(zExtent + 26)]} rotation={Math.PI} level={svc.events} />}
      {svc.parking > 0 && <ParkingComplex position={[xExtent + 24, -6]} rotation={0} level={svc.parking} />}
      {svc.parking >= 2 && <ParkingComplex position={[-(xExtent + 24), 6]} rotation={Math.PI} level={svc.parking - 1} />}

      {/* Ceremonial entrance gates flanking the main (+Z) tribune */}
      <EntranceGate position={[-17, zExtent + 3]} rotation={0} color={teamColor} />
      <EntranceGate position={[17, zExtent + 3]} rotation={0} color={teamColor} />
      <EntranceGate position={[0, -(zExtent + 3)]} rotation={Math.PI} color={teamColor} />

      {/* Plaza lamp posts arranged on the concourse ring */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const r = stadiumRadius + 20;
        return <LampPost key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} />;
      })}

      {district.buildings.map((h, i) =>
        h.kind === 'house' ? (
          <House key={i} {...h} roofColor={h.roof} />
        ) : (
          <Apartment key={i} {...h} />
        )
      )}

      <TreeRow points={[[-126, -boulevard - 14], [126, -boulevard - 14]]} count={11} scale={0.95} />
      <TreeRow points={[[-126, boulevard + 14], [126, boulevard + 14]]} count={11} scale={0.95} />
      <TreeRow points={[[-boulevard - 14, -92], [-boulevard - 14, 92]]} count={9} scale={0.9} />
      <TreeRow points={[[boulevard + 14, -92], [boulevard + 14, 92]]} count={9} scale={0.9} />
      <TreeRow points={[[-178, -serviceEdge - 50], [178, -serviceEdge - 50]]} count={13} scale={1.02} />
      <TreeRow points={[[-178, serviceEdge + 50], [178, serviceEdge + 50]]} count={13} scale={1.02} />
      <TreeRow points={[[-186, -serviceEdge - 90], [186, -serviceEdge - 90]]} count={11} scale={0.9} />
      <TreeRow points={[[-186, serviceEdge + 90], [186, serviceEdge + 90]]} count={11} scale={0.9} />
    </group>
  );
}

function Surroundings({ stadiumRadius = 80, services, teamColor, xExtent, zExtent }) {
  return (
    <DesignedSurroundings
      stadiumRadius={stadiumRadius}
      services={services}
      teamColor={teamColor}
      xExtent={xExtent}
      zExtent={zExtent}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STADIUM
// ═══════════════════════════════════════════════════════════════════════════
const LEVELS = [
  {
    name: 'Municipal',
    levelIndex: 0,
    height: 7,
    standDepth: 11,
    hasRoof: false,
    hasLights: false,
    color: '#3c5a7a',
    facadeColor: '#68717a',
    facadeHeight: 7,
    roof: null,
    roofY: 0,
    roofDepth: 0,
    roofColor: '#2a3140',
    tiers: [{ inner: 48, rows: 7, rowDepth: 1.85, rowRise: 0.82, y: 2.1 }],
  },
  {
    name: 'Moderno',
    levelIndex: 1,
    height: 11,
    standDepth: 15,
    hasRoof: false,
    hasLights: true,
    color: '#1e4a74',
    facadeColor: '#56616d',
    facadeHeight: 10,
    roof: null,
    roofY: 0,
    roofDepth: 0,
    roofColor: '#2a3140',
    tiers: [{ inner: 48, rows: 10, rowDepth: 1.85, rowRise: 0.9, y: 2.2 }],
  },
  {
    name: 'Grande',
    levelIndex: 2,
    height: 16,
    standDepth: 21,
    hasRoof: true,
    hasLights: true,
    color: '#143a63',
    facadeColor: '#48515d',
    facadeHeight: 15,
    roof: 'partial',
    roofY: 23,
    roofDepth: 16,
    roofColor: '#303844',
    tiers: [
      { inner: 47.5, rows: 9, rowDepth: 1.75, rowRise: 0.86, y: 2.2 },
      { inner: 66.5, rows: 8, rowDepth: 1.85, rowRise: 0.96, y: 12.4 },
    ],
  },
  {
    name: 'Élite',
    levelIndex: 3,
    height: 22,
    standDepth: 26,
    hasRoof: true,
    hasLights: true,
    color: '#194a77',
    facadeColor: '#4a5664',
    facadeHeight: 20,
    roof: 'partial',
    roofY: 30,
    roofDepth: 20,
    roofColor: '#35404c',
    tiers: [
      { inner: 47.2, rows: 10, rowDepth: 1.7, rowRise: 0.88, y: 2.3 },
      { inner: 66.2, rows: 10, rowDepth: 1.78, rowRise: 1.0, y: 13.8 },
      { inner: 84.5, rows: 5, rowDepth: 1.8, rowRise: 1.08, y: 25.2 },
    ],
  },
  {
    name: 'Legendario',
    levelIndex: 4,
    height: 30,
    standDepth: 31,
    hasRoof: true,
    hasLights: true,
    color: '#183d68',
    facadeColor: '#44505e',
    facadeHeight: 27,
    roof: 'full',
    roofY: 39,
    roofDepth: 26,
    roofColor: '#303b48',
    tiers: [
      { inner: 46.8, rows: 11, rowDepth: 1.65, rowRise: 0.88, y: 2.4 },
      { inner: 66.5, rows: 11, rowDepth: 1.76, rowRise: 1.02, y: 14.8 },
      { inner: 87.2, rows: 8, rowDepth: 1.84, rowRise: 1.12, y: 28.2 },
    ],
  },
];

// Single source of truth for the bowl proportions and footprint so the scene
// and the auto-fit camera can never drift apart. scaleX is deliberately kept
// closer to scaleZ than before — the previous 1.38 read as a flat athletics
// oval; a rounder plan looks like a real stadium bowl while still clearing the
// 105×68 pitch (inner ring × scaleX/scaleZ stays outside the touchlines).
function stadiumMetrics(level = 0) {
  const config = LEVELS[level] || LEVELS[0];
  const geom = roundedBowlMetrics(level);
  // Rounded footprint: the canopy outer half-extents plus a small plaza margin.
  const xExtent = geom.canopyOuterA + 10;
  const zExtent = geom.canopyOuterB + 10;
  return { config, geom, xExtent, zExtent };
}

function Stadium({ level = 0, naming = null, grassCondition = 100, services = {} }) {
  const { config, geom, xExtent, zExtent } = stadiumMetrics(level);
  const standColor = config.color;
  const vipLevel = services?.vip || 0;
  const stadiumRadius = Math.max(xExtent, zExtent);

  return (
    <group>
      <Pitch grassCondition={grassCondition} />

      {/* STADIUM_REFERENCE_CLOSED_BOWL_20260601 — rounded-rectangle closed bowl
          with continuous red/orange seating and a broad white/cream 360° deck.
          The pitch is open; the stadium shell is not. */}
      <RoundedCanopyBowl level={level} teamColor={standColor} />

      {/* Floodlight towers at the four corners (always present so the campo is
          lit and the silhouette reads as a real stadium). */}
      {[
        [xExtent - 6, zExtent - 6],
        [-xExtent + 6, zExtent - 6],
        [xExtent - 6, -zExtent + 6],
        [-xExtent + 6, -zExtent + 6],
      ].map(([x, z], i) => (
        <FloodlightTower key={i} position={[x, 0, z]} height={geom.topY + 12} intensity={config.hasLights ? (level >= 3 ? 70 : 42) : 18} />
      ))}

      {/* Scoreboards at both closed end curves, just inside the canopy opening. */}
      <Scoreboard position={[geom.canopyInnerA + 2.5, geom.topY + 4.6, 0]} rotation={[0, -Math.PI / 2, 0]} level={level} teamColor={standColor} mountHeight={geom.topY + 4.6} />
      <Scoreboard position={[-(geom.canopyInnerA + 2.5), geom.topY + 4.6, 0]} rotation={[0, Math.PI / 2, 0]} level={level} teamColor={standColor} mountHeight={geom.topY + 4.6} />

      {naming?.name && (
        <Text
          position={[0, geom.topY + 3, geom.facadeB + 1.6]}
          rotation={[0, 0, 0]}
          fontSize={4.5}
          color="#fff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.06}
          outlineColor="#000"
        >
          {`${naming.name} Arena`}
        </Text>
      )}

      {/* Player tunnel and vomitory portals at the main stand. */}
      <group position={[0, 0, SIDE_FRONT_Z - 1]}>
        <mesh position={[0, 2.3, 0]} castShadow>
          <boxGeometry args={[11, 4.6, 2.2]} />
          <meshStandardMaterial color="#10141b" emissive="#0d1824" emissiveIntensity={0.35} roughness={0.55} />
        </mesh>
        <mesh position={[0, 4.75, 1.05]} castShadow>
          <boxGeometry args={[14, 0.7, 2.8]} />
          <meshStandardMaterial color="#cfd4dc" roughness={0.45} metalness={0.15} />
        </mesh>
      </group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 38, 0, SIDE_FRONT_Z - 1.5]}>
          <mesh position={[0, 3.2, 0]} castShadow>
            <boxGeometry args={[7, 4.2, 1.4]} />
            <meshStandardMaterial color="#151a22" emissive="#395d84" emissiveIntensity={0.18} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* VIP suites — golden executive band integrated into the main (+Z)
          stand's camera-facing outer facade, only when the VIP service is built */}
      {vipLevel > 0 && (
        <group position={[0, 0, geom.facadeB - 0.8]}>
          <mesh position={[0, config.height + 4.4, 0]} castShadow>
            <boxGeometry args={[58 + level * 10, 3.2, 0.7]} />
            <meshStandardMaterial
              color="#15171d"
              emissive="#e7c463"
              emissiveIntensity={0.55}
              metalness={0.5}
              roughness={0.25}
              polygonOffset
              polygonOffsetFactor={-3}
              polygonOffsetUnits={-3}
            />
          </mesh>
          <mesh position={[0, config.height + 6.25, 0.06]}>
            <boxGeometry args={[61 + level * 10, 0.5, 0.62]} />
            <meshStandardMaterial
              color="#d9b44a"
              metalness={0.7}
              roughness={0.3}
              emissive="#d9b44a"
              emissiveIntensity={0.3}
              polygonOffset
              polygonOffsetFactor={-3}
              polygonOffsetUnits={-3}
            />
          </mesh>
          {vipLevel >= 2 && (
            <SignText position={[0, config.height + 7.5, 0.5]} size={2.2} color="#e7c463" outline="#2a1d05">
              VIP
            </SignText>
          )}
        </group>
      )}

      {/* Surroundings — managed commercial campus around the stadium */}
      <Surroundings
        stadiumRadius={stadiumRadius + 7}
        services={services}
        teamColor={standColor}
        xExtent={xExtent}
        zExtent={zExtent}
      />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TOP-LEVEL CANVAS
// ═══════════════════════════════════════════════════════════════════════════
// Composition constants for the hero three-quarter shot. Elevation/azimuth are
// chosen to show the bowl interior and give real depth (not a flat top-down).
const VIEW = {
  lookY: 8,
  elevDeg: 34, // high enough to show the whole campo, still a 3/4 view rather than the old top-down racetrack
  azimDeg: 48,
  margin: 0.9, // closer football-first framing: the pitch is the hero, not the outer campus
  padding: 2, // only a little plaza margin; don't zoom out to show the whole district
};

// Auto-fit: position the camera so the stadium footprint always fits inside the
// viewer with clear margins, regardless of stadium level OR viewport aspect
// (desktop vs mobile). Framing a bounding sphere of the footprint makes it
// rotation-invariant, so the auto-rotate never swings the bowl into the border.
function FitCamera({ frameRadius, controls }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = Math.max(0.5, size.width / size.height);
    // Narrow/mobile viewers crop diagonals much more aggressively. Add extra
    // breathing room there so the bowl never feels glued to the rounded card
    // border while keeping the desktop hero shot reasonably close.
    // Mobile gets a little extra breathing room: the campo remains large, but
    // the near stand no longer kisses/crops against the rounded viewer border.
    const responsiveMargin = aspect < 1.15 ? 1.18 : aspect < 1.45 ? 1.08 : 1;
    const S = (frameRadius + VIEW.padding) * VIEW.margin * responsiveMargin;
    const vHalf = (camera.fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const dist = S / Math.sin(Math.min(vHalf, hHalf));

    const elev = (VIEW.elevDeg * Math.PI) / 180;
    const azim = (VIEW.azimDeg * Math.PI) / 180;
    const hd = dist * Math.cos(elev);
    camera.position.set(hd * Math.cos(azim), VIEW.lookY + dist * Math.sin(elev), hd * Math.sin(azim));
    camera.lookAt(0, VIEW.lookY, 0);
    camera.near = 1;
    camera.far = Math.max(2800, dist * 3.4);
    camera.updateProjectionMatrix();

    // Keep the orbit target/limits in sync so user drags + auto-rotate stay
    // centered on the same point and can't be clamped back into a crop.
    if (controls?.current) {
      controls.current.target.set(0, VIEW.lookY, 0);
      controls.current.minDistance = Math.max(60, dist * 0.55);
      controls.current.maxDistance = dist * 1.9;
      controls.current.update();
    }
  }, [camera, size, frameRadius, controls]);
  return null;
}

export default function Stadium3D({ level = 0, naming = null, grassCondition = 100, services = {} }) {
  const controlsRef = useRef(null);
  // Bounding radius of the whole footprint (the half-diagonal of the X/Z
  // extents), NOT just xExtent. The bowl is an ellipse, so its corners reach
  // hypot(xExtent, zExtent) — framing only xExtent let those corners and the
  // surrounding plaza spill past the frame and get clipped by the card border.
  // Using the true footprint radius makes the fit rotation-invariant so the
  // auto-rotate never swings any part of the stadium into the edge.
  const frameRadius = useMemo(() => {
    const { xExtent, zExtent } = stadiumMetrics(level);
    // Deliberately frame the stadium tighter than the full footprint diagonal.
    // The previous safety sphere made the campo tiny; Pablo wants the field to
    // read first. Campus services add a small margin so the rebuilt VIP/shop/
    // parking features remain visible without turning the stadium into a dot.
    const hasCampusServices = Object.values(services || {}).some((value) => Number(value) > 0);
    return Math.hypot(xExtent, zExtent) * (hasCampusServices ? 0.96 : 0.82);
  }, [level, services]);

  return (
    <div
      data-stadium3d-root="1"
      data-stadium-rebuild="STADIUM_REFERENCE_CLOSED_BOWL_20260601"
      data-stadium-services-rebuild="STADIUM_SERVICE_CAMPUS_REBUILD_20260601"
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
        camera={{ position: [200, 165, 250], fov: 42, near: 1, far: 2800 }}
        shadows
        dpr={[1, 1.6]}
        gl={{ logarithmicDepthBuffer: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          window.requestAnimationFrame(() => {
            gl.domElement.dataset.sceneReady = '1';
            gl.domElement.closest('[data-stadium3d-root]')?.setAttribute('data-scene-ready', '1');
          });
        }}
      >
        {/* Explicit scene background so the viewer never captures as a blank dark canvas before the sky shader resolves. */}
        <color attach="background" args={['#b8d5ea']} />
        <FitCamera frameRadius={frameRadius} controls={controlsRef} />
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
        {/* Fog pushed well back so the (now correctly-framed, further-away)
            stadium stays crisp at every level and only the distant skyline /
            horizon ground hazes into the sky for depth. */}
        <fog attach="fog" args={['#d6dde6', 900, 2600]} />

        {/* Lighting — warm key light + soft ambient + sky fill */}
        <ambientLight intensity={0.48} color="#dbe7f4" />
        <hemisphereLight args={['#d9ecff', '#d7bd8f', 0.72]} />
        <directionalLight
          position={[120, 160, 80]}
          intensity={1.65}
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
          <meshStandardMaterial color="#6f775b" roughness={0.96} />
        </mesh>
        {/* Rectangular campus grass. This used to be a circular ring and helped
            the whole shot read like a racetrack; keep the ground football/campus
            shaped instead. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y_MID_GRASS, 0]} receiveShadow>
          <planeGeometry args={[620, 470]} />
          <meshStandardMaterial
            color="#77855f"
            roughness={0.95}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>

        <Stadium level={level} naming={naming} grassCondition={grassCondition} services={services} />

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
          ref={controlsRef}
          target={[0, VIEW.lookY, 0]}
          enablePan={false}
          enableZoom
          minDistance={80}
          maxDistance={900}
          maxPolarAngle={Math.PI / 2.15}
          minPolarAngle={Math.PI / 6}
          autoRotate={false}
          autoRotateSpeed={0}
          enableDamping
          dampingFactor={0.06}
        />

        <Environment preset="sunset" />
      </Canvas>
    </div>
  );
}
