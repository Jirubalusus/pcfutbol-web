/**
 * Building.jsx — Premium procedural cartoon buildings with cel-shading
 * Each building type has rich geometric detail: windows, doors, awnings, balconies, etc.
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ToonMat({ color, emissive, emissiveIntensity = 0.05, side }) {
  return (
    <meshToonMaterial
      color={color}
      emissive={emissive || color}
      emissiveIntensity={emissiveIntensity}
      side={side}
    />
  );
}

/* ─── Shared sub-components ─── */

function WindowRow({ y, count, width, zOffset, lightOn, frameColor = '#5D4037' }) {
  const spacing = width / (count + 1);
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const x = -width / 2 + spacing * (i + 1);
        return (
          <group key={i} position={[x, y, zOffset]}>
            {/* Window frame */}
            <mesh><boxGeometry args={[0.45, 0.55, 0.04]} /><ToonMat color={frameColor} /></mesh>
            {/* Glass */}
            <mesh position={[0, 0, 0.02]}>
              <planeGeometry args={[0.35, 0.45]} />
              <meshBasicMaterial color={lightOn ? '#FFF9C4' : '#90CAF9'} transparent opacity={lightOn ? 0.9 : 0.7} />
            </mesh>
            {/* Window sill */}
            <mesh position={[0, -0.3, 0.06]}>
              <boxGeometry args={[0.5, 0.06, 0.1]} />
              <ToonMat color="#E0E0E0" />
            </mesh>
            {/* Shutters (random open/closed) */}
            {(i + Math.floor(y)) % 3 !== 0 && (
              <>
                <mesh position={[-0.26, 0, 0.03]}>
                  <boxGeometry args={[0.08, 0.5, 0.02]} />
                  <ToonMat color={frameColor} />
                </mesh>
                <mesh position={[0.26, 0, 0.03]}>
                  <boxGeometry args={[0.08, 0.5, 0.02]} />
                  <ToonMat color={frameColor} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Door({ position, width = 0.7, height = 1.2, color = '#4E342E', hasAwning = true, awningColor = '#C62828' }) {
  return (
    <group position={position}>
      {/* Door frame */}
      <mesh><boxGeometry args={[width + 0.15, height + 0.1, 0.06]} /><ToonMat color="#3E2723" /></mesh>
      {/* Door */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[width, height, 0.04]} />
        <ToonMat color={color} />
      </mesh>
      {/* Handle */}
      <mesh position={[width * 0.3, 0, 0.06]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <ToonMat color="#FFD700" emissive="#FFD700" emissiveIntensity={0.1} />
      </mesh>
      {/* Step */}
      <mesh position={[0, -height / 2 - 0.05, 0.15]}>
        <boxGeometry args={[width + 0.3, 0.1, 0.3]} />
        <ToonMat color="#9E9E9E" />
      </mesh>
      {/* Awning */}
      {hasAwning && (
        <mesh position={[0, height / 2 + 0.15, 0.35]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[width + 0.6, 0.04, 0.6]} />
          <ToonMat color={awningColor} />
        </mesh>
      )}
    </group>
  );
}

function Balcony({ position, width = 1.2 }) {
  return (
    <group position={position}>
      {/* Floor */}
      <mesh><boxGeometry args={[width, 0.06, 0.5]} /><ToonMat color="#BDBDBD" /></mesh>
      {/* Railing */}
      <mesh position={[0, 0.2, 0.23]}>
        <boxGeometry args={[width, 0.04, 0.02]} />
        <ToonMat color="#424242" />
      </mesh>
      {/* Railing bars */}
      {Array.from({ length: Math.floor(width / 0.15) }).map((_, i) => (
        <mesh key={i} position={[-width / 2 + 0.1 + i * 0.15, 0.1, 0.23]}>
          <cylinderGeometry args={[0.01, 0.01, 0.2, 4]} />
          <ToonMat color="#424242" />
        </mesh>
      ))}
      {/* Flower pot */}
      <mesh position={[0.3, 0.15, 0.1]}>
        <cylinderGeometry args={[0.08, 0.06, 0.12, 6]} />
        <ToonMat color="#795548" />
      </mesh>
      <mesh position={[0.3, 0.25, 0.1]}>
        <sphereGeometry args={[0.1, 6, 5]} />
        <ToonMat color="#E91E63" />
      </mesh>
    </group>
  );
}

function ACUnit({ position }) {
  return (
    <group position={position}>
      <mesh><boxGeometry args={[0.4, 0.25, 0.2]} /><ToonMat color="#E0E0E0" /></mesh>
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[0.35, 0.04, 0.02]} />
        <ToonMat color="#BDBDBD" />
      </mesh>
    </group>
  );
}

function RoofAntenna({ position }) {
  return (
    <group position={position}>
      <mesh><cylinderGeometry args={[0.02, 0.02, 1.5, 4]} /><ToonMat color="#546E7A" /></mesh>
      <mesh position={[0, 0.6, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 4]} />
        <ToonMat color="#546E7A" />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <ToonMat color="#F44336" />
      </mesh>
    </group>
  );
}

function Cornice({ y, width, depth, color = '#D7CCC8' }) {
  return (
    <mesh position={[0, y, 0]}>
      <boxGeometry args={[width + 0.15, 0.12, depth + 0.15]} />
      <ToonMat color={color} />
    </mesh>
  );
}

function Sign({ position, text, bgColor, textColor = '#FFFFFF', width = 1.5 }) {
  return (
    <group position={position}>
      <mesh><boxGeometry args={[width, 0.4, 0.06]} /><ToonMat color={bgColor} /></mesh>
      {/* Simplified text representation as colored bars */}
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[width * 0.7, 0.15]} />
        <meshBasicMaterial color={textColor} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

/* ─── STADIUM ─── */
function StadiumBuilding({ size, cityLevel, teamColors, visualData }) {
  const stadiumScale = 1 + (cityLevel - 1) * 0.12 + (visualData.stadiumLevel || 0) * 0.08;
  const primaryHex = '#' + teamColors.primary.getHexString();
  const secondaryHex = '#' + teamColors.secondary.getHexString();
  const tiers = Math.min(cityLevel, 3);

  return (
    <group scale={[stadiumScale, stadiumScale, stadiumScale]}>
      {/* Base structure - outer wall */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[5, 5.5, 1.6, 24, 1, true]} />
        <ToonMat color="#78909C" />
      </mesh>
      {/* Decorative band at base */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[5.55, 5.6, 0.2, 24]} />
        <ToonMat color="#546E7A" />
      </mesh>

      {/* Multiple tiers of stands */}
      {Array.from({ length: tiers }).map((_, tier) => (
        <group key={tier}>
          <mesh position={[0, 1.6 + tier * 1.0, 0]} castShadow>
            <cylinderGeometry args={[5.0 - tier * 0.3, 4.5 - tier * 0.3, 0.9, 24, 1, true]} />
            <ToonMat color={tier % 2 === 0 ? primaryHex : secondaryHex} />
          </mesh>
          {/* Seat rows (rings) */}
          <mesh position={[0, 1.3 + tier * 1.0, 0]}>
            <torusGeometry args={[4.7 - tier * 0.3, 0.04, 4, 24]} />
            <ToonMat color="#B0BEC5" />
          </mesh>
        </group>
      ))}

      {/* Roof overhang for top tier */}
      <mesh position={[0, 1.6 + tiers * 1.0, 0]} castShadow>
        <cylinderGeometry args={[5.3, 4.8, 0.1, 24, 1, true]} />
        <ToonMat color="#455A64" />
      </mesh>

      {/* Field (green pitch) */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.5, 24]} />
        <ToonMat color={visualData.teamFitness > 70 ? '#2E7D32' : '#8D6E63'} />
      </mesh>
      {/* Pitch lines */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.4, 3.45, 24]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 0.85, 16]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      {/* Center line */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 0.05]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* 4 Floodlight towers */}
      {[[-4.5, 0, -4.5], [4.5, 0, -4.5], [-4.5, 0, 4.5], [4.5, 0, 4.5]].map((p, i) => (
        <group key={i} position={p}>
          {/* Tower base */}
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.5, 0.4, 0.5]} />
            <ToonMat color="#616161" />
          </mesh>
          {/* Tower pole */}
          <mesh position={[0, 3, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 5.5, 6]} />
            <ToonMat color="#78909C" />
          </mesh>
          {/* Light array (cross beam) */}
          <mesh position={[0, 5.5, 0]} castShadow>
            <boxGeometry args={[1.2, 0.15, 0.15]} />
            <ToonMat color="#546E7A" />
          </mesh>
          {/* Individual lights */}
          {[-0.4, -0.15, 0.1, 0.35].map((lx, li) => (
            <mesh key={li} position={[lx, 5.3, 0]}>
              <boxGeometry args={[0.15, 0.1, 0.1]} />
              <meshBasicMaterial color="#FFF9C4" />
            </mesh>
          ))}
          {/* Light glow */}
          <pointLight position={[0, 5.2, 0]} color="#FFF8E1" intensity={0.5} distance={8} />
        </group>
      ))}

      {/* Entrance gates */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => {
        const gx = Math.sin(angle) * 5.6;
        const gz = Math.cos(angle) * 5.6;
        return (
          <group key={`gate${i}`} position={[gx, 0, gz]} rotation={[0, -angle, 0]}>
            {/* Gate arch */}
            <mesh position={[0, 0.8, 0]} castShadow>
              <boxGeometry args={[1.2, 1.6, 0.3]} />
              <ToonMat color="#455A64" />
            </mesh>
            {/* Gate opening */}
            <mesh position={[0, 0.6, 0.1]}>
              <boxGeometry args={[0.8, 1.2, 0.15]} />
              <ToonMat color="#263238" />
            </mesh>
            {/* Gate pillars */}
            {[-0.6, 0.6].map((x, pi) => (
              <mesh key={pi} position={[x, 0.8, 0.05]} castShadow>
                <boxGeometry args={[0.15, 1.6, 0.25]} />
                <ToonMat color="#546E7A" />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Ticket booths */}
      {[[-6.5, 0, 0], [6.5, 0, 0]].map((p, i) => (
        <group key={`booth${i}`} position={p}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[0.8, 1.2, 0.8]} />
            <ToonMat color="#FFF8E1" />
          </mesh>
          <mesh position={[0, 1.3, 0]}>
            <boxGeometry args={[1.0, 0.08, 1.0]} />
            <ToonMat color="#C62828" />
          </mesh>
          {/* Window */}
          <mesh position={[0, 0.7, 0.41]}>
            <planeGeometry args={[0.5, 0.4]} />
            <meshBasicMaterial color="#90CAF9" transparent opacity={0.7} />
          </mesh>
        </group>
      ))}

      {/* Team banners/flags along perimeter */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const bx = Math.sin(angle) * 6.2;
        const bz = Math.cos(angle) * 6.2;
        return (
          <group key={`banner${i}`} position={[bx, 0, bz]} rotation={[0, -angle, 0]}>
            <mesh position={[0, 2, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 2.5, 4]} />
              <ToonMat color="#78909C" />
            </mesh>
            <mesh position={[0.25, 2.7, 0]}>
              <planeGeometry args={[0.5, 0.7]} />
              <ToonMat color={i % 2 === 0 ? primaryHex : secondaryHex} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}

      {/* Parking lot */}
      <group position={[0, 0, 8]}>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[8, 3]} />
          <meshToonMaterial color="#616161" />
        </mesh>
        {/* Parked cars */}
        {Array.from({ length: 6 }).map((_, i) => {
          const carColors = ['#F44336', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#FF9800'];
          return (
            <group key={`car${i}`} position={[-3 + i * 1.2, 0, 0]}>
              <mesh position={[0, 0.2, 0]} castShadow>
                <boxGeometry args={[0.8, 0.3, 0.45]} />
                <ToonMat color={carColors[i]} />
              </mesh>
              <mesh position={[0, 0.38, 0]} castShadow>
                <boxGeometry args={[0.5, 0.2, 0.4]} />
                <ToonMat color={carColors[i]} />
              </mesh>
              {/* Wheels */}
              {[[-0.3, 0.08, 0.24], [0.3, 0.08, 0.24], [-0.3, 0.08, -0.24], [0.3, 0.08, -0.24]].map((wp, wi) => (
                <mesh key={wi} position={wp}>
                  <cylinderGeometry args={[0.08, 0.08, 0.04, 8]} rotation={[Math.PI / 2, 0, 0]} />
                  <ToonMat color="#1A1A1A" />
                </mesh>
              ))}
            </group>
          );
        })}
        {/* Parking lines */}
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={`pl${i}`} position={[-3.6 + i * 1.2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.05, 2.5]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
      </group>

      {/* Ticket queues */}
      {visualData.attendance > 3000 && (
        <group position={[0, 0, 6.5]}>
          {Array.from({ length: Math.min(Math.floor(visualData.attendance / 800), 8) }).map((_, i) => (
            <mesh key={i} position={[i * 0.35 - 1.2, 0.3, 0]} castShadow>
              <capsuleGeometry args={[0.08, 0.3, 4, 6]} />
              <ToonMat color={i % 2 === 0 ? primaryHex : secondaryHex} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/* ─── TRANSFER OFFICE (Skyscraper) ─── */
function TransferOfficeBuilding({ size, cityLevel, teamColors, visualData }) {
  const height = size[1] + cityLevel * 0.8;
  const lightOn = visualData.hasPendingOffers;
  const floors = Math.floor(height / 1.0);

  return (
    <group>
      {/* Main tower */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[size[0], height, size[2]]} />
        <ToonMat color="#1565C0" />
      </mesh>
      {/* Glass curtain wall effect - slightly offset panels */}
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * (size[0] / 2 + 0.01), height / 2, 0]}>
          <planeGeometry args={[0.01, height]} />
          <meshBasicMaterial color="#0D47A1" transparent opacity={0.3} />
        </mesh>
      ))}
      {/* Window grid on all 4 sides */}
      {Array.from({ length: floors }).map((_, floor) => (
        <group key={floor}>
          {/* Front windows */}
          <WindowRow
            y={0.8 + floor * 1.0}
            count={3}
            width={size[0]}
            zOffset={size[2] / 2 + 0.01}
            lightOn={lightOn && floor < 3}
            frameColor="#0D47A1"
          />
          {/* Back windows */}
          <WindowRow
            y={0.8 + floor * 1.0}
            count={3}
            width={size[0]}
            zOffset={-size[2] / 2 - 0.01}
            lightOn={lightOn && floor === 0}
            frameColor="#0D47A1"
          />
          {/* Floor separator line */}
          <mesh position={[0, 0.5 + floor * 1.0, size[2] / 2 + 0.02]}>
            <planeGeometry args={[size[0], 0.03]} />
            <meshBasicMaterial color="#0D47A1" />
          </mesh>
        </group>
      ))}
      {/* Cornices */}
      <Cornice y={0.05} width={size[0]} depth={size[2]} color="#0D47A1" />
      <Cornice y={height} width={size[0]} depth={size[2]} color="#1565C0" />
      {/* Entrance door */}
      <Door position={[0, 0.6, size[2] / 2 + 0.02]} color="#0D47A1" awningColor="#1565C0" />
      {/* Roof details */}
      <mesh position={[0, height + 0.15, 0]}>
        <boxGeometry args={[size[0] + 0.2, 0.3, size[2] + 0.2]} />
        <ToonMat color="#0D47A1" />
      </mesh>
      {/* Helipad */}
      {cityLevel >= 3 && (
        <group position={[0, height + 0.32, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1, 16]} />
            <ToonMat color="#455A64" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.7, 0.75, 16]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
      )}
      {/* Antenna array */}
      <RoofAntenna position={[0.5, height + 0.3, 0.5]} />
      <RoofAntenna position={[-0.5, height + 0.3, -0.5]} />
      {/* Satellite dish */}
      <mesh position={[0.8, height + 0.5, 0]} rotation={[0.3, 0, 0]}>
        <circleGeometry args={[0.25, 8]} />
        <ToonMat color="#B0BEC5" side={THREE.DoubleSide} />
      </mesh>
      {/* AC units on roof */}
      <ACUnit position={[-0.8, height + 0.4, 0.3]} />
      {/* Sign */}
      <Sign position={[0, height * 0.85, size[2] / 2 + 0.05]} text="TRANSFERS" bgColor="#0D47A1" width={2} />
      {/* Revolving door hint */}
      <mesh position={[0, 0.6, size[2] / 2 + 0.15]}>
        <cylinderGeometry args={[0.35, 0.35, 1.1, 12, 1, true]} />
        <meshBasicMaterial color="#90CAF9" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/* ─── TRAINING CENTER ─── */
function TrainingCenterBuilding({ size, cityLevel, teamColors, visualData }) {
  const primaryHex = '#' + teamColors.primary.getHexString();

  return (
    <group>
      {/* Main building */}
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#2E7D32" />
      </mesh>
      {/* Roof */}
      <mesh position={[0, size[1] + 0.3, 0]} castShadow>
        <boxGeometry args={[size[0] + 0.3, 0.1, size[2] + 0.3]} />
        <ToonMat color="#1B5E20" />
      </mesh>
      {/* Sloped roof section */}
      <mesh position={[0, size[1] + 0.6, 0]} castShadow>
        <boxGeometry args={[size[0] - 0.5, 0.5, size[2] - 0.5]} />
        <ToonMat color="#388E3C" />
      </mesh>
      {/* Windows */}
      <WindowRow y={size[1] * 0.6} count={4} width={size[0]} zOffset={size[2] / 2 + 0.01} lightOn={false} frameColor="#1B5E20" />
      <WindowRow y={size[1] * 0.6} count={4} width={size[0]} zOffset={-size[2] / 2 - 0.01} lightOn={false} frameColor="#1B5E20" />
      {/* Door */}
      <Door position={[0, 0.6, size[2] / 2 + 0.02]} color="#1B5E20" awningColor={primaryHex} />
      {/* Cornices */}
      <Cornice y={0.05} width={size[0]} depth={size[2]} color="#1B5E20" />
      {/* Sign */}
      <Sign position={[0, size[1] * 0.9, size[2] / 2 + 0.05]} text="TRAINING" bgColor="#1B5E20" width={2.5} />

      {/* Training pitch */}
      <group position={[0, 0, size[2] / 2 + 3]}>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5, 4]} />
          <ToonMat color="#43A047" />
        </mesh>
        {/* Pitch border */}
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.8, 3.8]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0} />
        </mesh>
        {/* Pitch lines */}
        {[[-2.4, 0], [2.4, 0]].map(([x], i) => (
          <mesh key={i} position={[x, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.04, 3.8]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
        {[[0, -1.9], [0, 1.9]].map(([, z], i) => (
          <mesh key={`h${i}`} position={[0, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.8, 0.04]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
        {/* Center circle */}
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.54, 16]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>

        {/* Goals */}
        {[-1.9, 1.9].map((z, i) => (
          <group key={`goal${i}`} position={[0, 0, z]}>
            <mesh position={[-0.6, 0.4, 0]}><boxGeometry args={[0.04, 0.8, 0.04]} /><ToonMat color="#FFFFFF" /></mesh>
            <mesh position={[0.6, 0.4, 0]}><boxGeometry args={[0.04, 0.8, 0.04]} /><ToonMat color="#FFFFFF" /></mesh>
            <mesh position={[0, 0.8, 0]}><boxGeometry args={[1.24, 0.04, 0.04]} /><ToonMat color="#FFFFFF" /></mesh>
            {/* Net (simple mesh) */}
            <mesh position={[0, 0.4, i === 0 ? -0.2 : 0.2]}>
              <planeGeometry args={[1.2, 0.8]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={0.15} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}

        {/* Training cones */}
        {[[-1, 0.1, 0.5], [0, 0.1, 0.5], [1, 0.1, 0.5], [-0.5, 0.1, -0.5], [0.5, 0.1, -0.5]].map((p, i) => (
          <mesh key={`cone${i}`} position={p}>
            <coneGeometry args={[0.06, 0.15, 6]} />
            <ToonMat color="#FF6F00" />
          </mesh>
        ))}
      </group>

      {/* Gym equipment visible through side */}
      <group position={[-size[0] / 2 - 0.5, 0, 0]}>
        {/* Dumbbells rack */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.3, 1, 0.8]} />
          <ToonMat color="#424242" />
        </mesh>
      </group>

      {/* Ambulance if injured */}
      {visualData.hasInjured && (
        <group position={[-size[0] / 2 - 2, 0, 1]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[1.4, 0.6, 0.7]} />
            <ToonMat color="#FFFFFF" />
          </mesh>
          <mesh position={[-0.4, 0.55, 0]} castShadow>
            <boxGeometry args={[0.5, 0.35, 0.68]} />
            <ToonMat color="#FFFFFF" />
          </mesh>
          {/* Red cross */}
          <mesh position={[0.2, 0.55, 0.36]}>
            <boxGeometry args={[0.3, 0.08, 0.01]} /><meshBasicMaterial color="#F44336" />
          </mesh>
          <mesh position={[0.2, 0.55, 0.36]}>
            <boxGeometry args={[0.08, 0.3, 0.01]} /><meshBasicMaterial color="#F44336" />
          </mesh>
          {/* Wheels */}
          {[[-0.45, 0.1, 0.36], [0.45, 0.1, 0.36], [-0.45, 0.1, -0.36], [0.45, 0.1, -0.36]].map((wp, wi) => (
            <mesh key={wi} position={wp}>
              <cylinderGeometry args={[0.1, 0.1, 0.04, 8]} />
              <ToonMat color="#1A1A1A" />
            </mesh>
          ))}
          {/* Lights */}
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[0.15, 0.08, 0.08]} />
            <meshBasicMaterial color="#F44336" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* ─── MUSEUM / TROPHY ROOM ─── */
function MuseumBuilding({ size, cityLevel }) {
  return (
    <group>
      {/* Classical base */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[size[0] + 0.5, 0.3, size[2] + 0.5]} />
        <ToonMat color="#FFF8E1" />
      </mesh>
      {/* Main walls */}
      <mesh position={[0, size[1] / 2 + 0.3, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#FF8F00" />
      </mesh>
      {/* Cornice at top */}
      <Cornice y={size[1] + 0.3} width={size[0]} depth={size[2]} color="#FFB300" />
      <Cornice y={size[1] - 0.2} width={size[0] + 0.1} depth={size[2] + 0.1} color="#FFA000" />

      {/* Columns (6 across front) */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = -size[0] / 2 + 0.3 + i * (size[0] - 0.6) / 5;
        return (
          <group key={i}>
            {/* Column shaft */}
            <mesh position={[x, size[1] / 2 + 0.3, size[2] / 2 + 0.2]} castShadow>
              <cylinderGeometry args={[0.1, 0.12, size[1], 8]} />
              <ToonMat color="#FFF8E1" />
            </mesh>
            {/* Column capital */}
            <mesh position={[x, size[1] + 0.2, size[2] / 2 + 0.2]}>
              <boxGeometry args={[0.3, 0.15, 0.3]} />
              <ToonMat color="#FFF8E1" />
            </mesh>
            {/* Column base */}
            <mesh position={[x, 0.35, size[2] / 2 + 0.2]}>
              <boxGeometry args={[0.28, 0.1, 0.28]} />
              <ToonMat color="#FFF8E1" />
            </mesh>
          </group>
        );
      })}

      {/* Grand pediment (triangle) */}
      <mesh position={[0, size[1] + 0.8, size[2] / 2 + 0.1]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[size[0] / 1.6, 1.0, 3]} />
        <ToonMat color="#FFB300" />
      </mesh>

      {/* Grand entrance */}
      <Door position={[0, 0.75, size[2] / 2 + 0.02]} width={0.9} height={1.4} color="#5D4037" hasAwning={false} />

      {/* Windows on sides */}
      <WindowRow y={size[1] * 0.6 + 0.3} count={2} width={size[0]} zOffset={size[2] / 2 + 0.01} lightOn={true} frameColor="#E65100" />

      {/* Trophy on top (golden cup) */}
      <group position={[0, size[1] + 1.8, 0]}>
        {/* Cup base */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.12, 0.18, 0.1, 8]} />
          <ToonMat color="#FFD700" emissive="#FFD700" emissiveIntensity={0.3} />
        </mesh>
        {/* Cup stem */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.2, 6]} />
          <ToonMat color="#FFD700" emissive="#FFD700" emissiveIntensity={0.2} />
        </mesh>
        {/* Cup bowl */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.18, 0.1, 0.3, 8]} />
          <ToonMat color="#FFD700" emissive="#FFD700" emissiveIntensity={0.3} />
        </mesh>
        {/* Cup handles */}
        {[-1, 1].map((s, i) => (
          <mesh key={i} position={[s * 0.22, 0.2, 0]}>
            <torusGeometry args={[0.06, 0.02, 6, 8]} />
            <ToonMat color="#FFD700" emissive="#FFD700" emissiveIntensity={0.2} />
          </mesh>
        ))}
      </group>

      {/* Display cases visible through windows (gold items) */}
      {[-0.6, 0, 0.6].map((x, i) => (
        <mesh key={`display${i}`} position={[x, 0.8, 0]}>
          <boxGeometry args={[0.3, 0.6, 0.3]} />
          <meshBasicMaterial color="#FFF8E1" transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── TOWN HALL ─── */
function TownHallBuilding({ size, cityLevel }) {
  return (
    <group>
      {/* Foundation steps */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[size[0] + 0.6, 0.2, size[2] + 0.6]} />
        <ToonMat color="#8D6E63" />
      </mesh>
      {/* Main building */}
      <mesh position={[0, size[1] / 2 + 0.2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#6D4C41" />
      </mesh>
      {/* Window rows */}
      <WindowRow y={size[1] * 0.4 + 0.2} count={3} width={size[0]} zOffset={size[2] / 2 + 0.01} lightOn={false} frameColor="#4E342E" />
      <WindowRow y={size[1] * 0.7 + 0.2} count={3} width={size[0]} zOffset={size[2] / 2 + 0.01} lightOn={true} frameColor="#4E342E" />
      {/* Cornices */}
      <Cornice y={size[1] + 0.2} width={size[0]} depth={size[2]} color="#5D4037" />
      {/* Balcony on front */}
      <Balcony position={[0, size[1] * 0.55 + 0.2, size[2] / 2 + 0.25]} width={2} />
      {/* Entrance */}
      <Door position={[0, 0.75, size[2] / 2 + 0.02]} color="#3E2723" awningColor="#5D4037" width={0.9} height={1.3} />

      {/* Clock tower */}
      <group position={[0, size[1] + 0.2, 0]}>
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[1.4, 2, 1.4]} />
          <ToonMat color="#5D4037" />
        </mesh>
        {/* Tower windows */}
        {[1, -1].map((side, i) => (
          <mesh key={i} position={[0, 1.2, side * 0.71]}>
            <planeGeometry args={[0.3, 0.5]} />
            <meshBasicMaterial color="#FFF9C4" transparent opacity={0.6} />
          </mesh>
        ))}
        {/* Clock face (4 sides) */}
        {[[0, 0, 0.71], [0, 0, -0.71], [0.71, 0, 0], [-0.71, 0, 0]].map((p, i) => (
          <group key={`clock${i}`} position={[p[0], 1.5, p[2]]} rotation={[0, i * Math.PI / 2, 0]}>
            <mesh>
              <circleGeometry args={[0.35, 16]} />
              <meshBasicMaterial color="#FFF8E1" />
            </mesh>
            {/* Clock hands */}
            <mesh position={[0, 0.1, 0.01]} rotation={[0, 0, 0.3]}>
              <boxGeometry args={[0.02, 0.25, 0.01]} />
              <meshBasicMaterial color="#1A1A1A" />
            </mesh>
            <mesh position={[0.05, 0, 0.01]} rotation={[0, 0, -0.8]}>
              <boxGeometry args={[0.015, 0.18, 0.01]} />
              <meshBasicMaterial color="#1A1A1A" />
            </mesh>
          </group>
        ))}
        {/* Pointed roof */}
        <mesh position={[0, 2.5, 0]} castShadow>
          <coneGeometry args={[1.1, 1.2, 4]} />
          <ToonMat color="#8D6E63" />
        </mesh>
        {/* Weather vane */}
        <mesh position={[0, 3.2, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.4, 4]} />
          <ToonMat color="#FFD700" />
        </mesh>
        <mesh position={[0.1, 3.4, 0]} rotation={[0, 0, 0.1]}>
          <coneGeometry args={[0.06, 0.2, 3]} />
          <ToonMat color="#FFD700" />
        </mesh>
      </group>

      {/* Flag */}
      <mesh position={[size[0] / 2 - 0.3, size[1] + 1.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 2, 4]} />
        <ToonMat color="#78909C" />
      </mesh>
      <mesh position={[size[0] / 2, size[1] + 2.2, 0]}>
        <planeGeometry args={[0.6, 0.4]} />
        <ToonMat color="#F44336" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ─── NEWSPAPER KIOSK ─── */
function NewspaperKioskBuilding({ size }) {
  return (
    <group>
      {/* Main structure */}
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#E65100" />
      </mesh>
      {/* Striped awning */}
      <group position={[0, size[1], size[2] / 2 + 0.4]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[(-size[0] / 2 + 0.15) + i * (size[0] / 8), 0, 0]}>
            <boxGeometry args={[size[0] / 8 - 0.02, 0.06, 0.9]} />
            <ToonMat color={i % 2 === 0 ? '#BF360C' : '#FFF8E1'} />
          </mesh>
        ))}
      </group>
      {/* Counter shelf */}
      <mesh position={[0, size[1] * 0.45, size[2] / 2 + 0.2]}>
        <boxGeometry args={[size[0] + 0.2, 0.06, 0.4]} />
        <ToonMat color="#5D4037" />
      </mesh>
      {/* Newspapers on display */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[-0.6 + i * 0.3, size[1] * 0.65, size[2] / 2 + 0.02]} rotation={[0, 0, (i - 2) * 0.05]}>
          <planeGeometry args={[0.22, 0.32]} />
          <meshBasicMaterial color={['#E8EAF6', '#FFF3E0', '#E0F2F1', '#FCE4EC', '#F3E5F5'][i]} />
        </mesh>
      ))}
      {/* Magazine rack */}
      <mesh position={[-size[0] / 2 - 0.3, size[1] * 0.4, 0]} castShadow>
        <boxGeometry args={[0.15, size[1] * 0.7, size[2] - 0.2]} />
        <ToonMat color="#795548" />
      </mesh>
      {/* Spinning rack */}
      <mesh position={[size[0] / 2 + 0.4, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 1.2, 8]} />
        <ToonMat color="#795548" />
      </mesh>
      {/* Postcards on spinning rack */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`pc${i}`} position={[size[0] / 2 + 0.4, 0.5 + i * 0.25, 0.22]} rotation={[0, i * Math.PI / 4, 0]}>
          <planeGeometry args={[0.15, 0.2]} />
          <meshBasicMaterial color={['#FFEB3B', '#4CAF50', '#2196F3', '#FF5722'][i]} />
        </mesh>
      ))}
      {/* Neon "OPEN" sign */}
      <mesh position={[0, size[1] + 0.2, size[2] / 2 + 0.3]}>
        <boxGeometry args={[0.6, 0.2, 0.04]} />
        <meshBasicMaterial color="#76FF03" />
      </mesh>
    </group>
  );
}

/* ─── BANK ─── */
function BankBuilding({ size, cityLevel }) {
  return (
    <group>
      {/* Foundation */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[size[0] + 0.3, 0.2, size[2] + 0.3]} />
        <ToonMat color="#263238" />
      </mesh>
      {/* Main building */}
      <mesh position={[0, size[1] / 2 + 0.2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#37474F" />
      </mesh>
      {/* Cornices */}
      <Cornice y={size[1] + 0.2} width={size[0]} depth={size[2]} color="#263238" />
      <Cornice y={size[1] * 0.5 + 0.2} width={size[0] + 0.05} depth={size[2] + 0.05} color="#455A64" />
      {/* Windows */}
      <WindowRow y={size[1] * 0.35 + 0.2} count={2} width={size[0]} zOffset={size[2] / 2 + 0.01} lightOn={true} frameColor="#263238" />
      <WindowRow y={size[1] * 0.7 + 0.2} count={2} width={size[0]} zOffset={size[2] / 2 + 0.01} lightOn={false} frameColor="#263238" />
      {/* Vault door (front) */}
      <group position={[0, size[1] * 0.35 + 0.2, size[2] / 2 + 0.02]}>
        <mesh><circleGeometry args={[0.55, 20]} /><ToonMat color="#424242" /></mesh>
        <mesh position={[0, 0, 0.01]}><torusGeometry args={[0.45, 0.04, 8, 20]} /><ToonMat color="#FFD700" emissive="#FFD700" emissiveIntensity={0.15} /></mesh>
        <mesh position={[0, 0, 0.02]}><torusGeometry args={[0.3, 0.02, 6, 12]} /><ToonMat color="#B0BEC5" /></mesh>
        {/* Vault handle */}
        <mesh position={[0.2, 0, 0.03]}><boxGeometry args={[0.25, 0.04, 0.04]} /><ToonMat color="#FFD700" /></mesh>
      </group>
      {/* Columns */}
      {[-1.2, 1.2].map((x, i) => (
        <group key={i}>
          <mesh position={[x, size[1] / 2 + 0.2, size[2] / 2 + 0.25]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, size[1], 8]} />
            <ToonMat color="#78909C" />
          </mesh>
          <mesh position={[x, 0.3, size[2] / 2 + 0.25]}>
            <boxGeometry args={[0.28, 0.1, 0.28]} />
            <ToonMat color="#78909C" />
          </mesh>
          <mesh position={[x, size[1] + 0.15, size[2] / 2 + 0.25]}>
            <boxGeometry args={[0.28, 0.1, 0.28]} />
            <ToonMat color="#78909C" />
          </mesh>
        </group>
      ))}
      {/* ATM on side */}
      <group position={[size[0] / 2 + 0.15, 0.8, 0.5]}>
        <mesh><boxGeometry args={[0.1, 0.8, 0.5]} /><ToonMat color="#1565C0" /></mesh>
        <mesh position={[0.06, 0.15, 0]}>
          <planeGeometry args={[0.01, 0.3]} />
          <meshBasicMaterial color="#81D4FA" />
        </mesh>
      </group>
      {/* Dollar sign on pediment */}
      <Sign position={[0, size[1] + 0.5, size[2] / 2 + 0.05]} text="$" bgColor="#263238" textColor="#FFD700" width={1} />
      {/* Security camera */}
      <group position={[size[0] / 2 - 0.2, size[1] + 0.3, size[2] / 2 + 0.1]}>
        <mesh><boxGeometry args={[0.12, 0.08, 0.15]} /><ToonMat color="#212121" /></mesh>
        <mesh position={[0, 0, 0.1]}>
          <cylinderGeometry args={[0.03, 0.04, 0.08, 6]} rotation={[Math.PI / 2, 0, 0]} />
          <ToonMat color="#212121" />
        </mesh>
      </group>
    </group>
  );
}

/* ─── MEDICAL CENTER ─── */
function MedicalCenterBuilding({ size, visualData }) {
  return (
    <group>
      {/* Main building */}
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#FAFAFA" />
      </mesh>
      {/* Colored stripe */}
      <mesh position={[0, size[1] - 0.15, 0]}>
        <boxGeometry args={[size[0] + 0.02, 0.3, size[2] + 0.02]} />
        <ToonMat color="#E53935" />
      </mesh>
      {/* Windows */}
      <WindowRow y={size[1] * 0.4} count={3} width={size[0]} zOffset={size[2] / 2 + 0.01} lightOn={true} frameColor="#BDBDBD" />
      <WindowRow y={size[1] * 0.7} count={3} width={size[0]} zOffset={size[2] / 2 + 0.01} lightOn={true} frameColor="#BDBDBD" />
      {/* Red cross */}
      <group position={[0, size[1] * 0.85, size[2] / 2 + 0.02]}>
        <mesh><boxGeometry args={[0.7, 0.2, 0.02]} /><meshBasicMaterial color="#F44336" /></mesh>
        <mesh><boxGeometry args={[0.2, 0.7, 0.02]} /><meshBasicMaterial color="#F44336" /></mesh>
      </group>
      {/* Entrance with automatic doors */}
      <group position={[0, 0.6, size[2] / 2 + 0.02]}>
        <mesh><boxGeometry args={[1.2, 1.2, 0.06]} /><ToonMat color="#E0E0E0" /></mesh>
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[1, 1.1]} />
          <meshBasicMaterial color="#90CAF9" transparent opacity={0.4} />
        </mesh>
      </group>
      {/* Emergency sign */}
      <Sign position={[0, size[1] + 0.3, size[2] / 2 + 0.05]} text="URGENCIAS" bgColor="#D32F2F" width={2} />
      {/* Cornices */}
      <Cornice y={size[1]} width={size[0]} depth={size[2]} color="#E0E0E0" />
      {/* AC units */}
      <ACUnit position={[size[0] / 2 - 0.5, size[1] + 0.2, 0]} />
      <ACUnit position={[size[0] / 2 - 0.5, size[1] + 0.2, 0.8]} />

      {/* Stretcher outside if injured */}
      {visualData.hasInjured && (
        <group position={[size[0] / 2 + 1.2, 0, 0.5]}>
          <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.8, 0.04, 0.35]} /><ToonMat color="#90A4AE" /></mesh>
          {/* Legs */}
          {[[-0.3, 0.17, 0.15], [0.3, 0.17, 0.15], [-0.3, 0.17, -0.15], [0.3, 0.17, -0.15]].map((p, i) => (
            <mesh key={i} position={p}><cylinderGeometry args={[0.015, 0.015, 0.34, 4]} /><ToonMat color="#78909C" /></mesh>
          ))}
          <mesh position={[0, 0.45, 0]}>
            <capsuleGeometry args={[0.06, 0.4, 4, 6]} />
            <ToonMat color="#FFFFFF" />
          </mesh>
        </group>
      )}

      {/* Wheelchair ramp */}
      <mesh position={[size[0] / 2 - 0.3, 0.08, size[2] / 2 + 0.6]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.8, 0.06, 1]} />
        <ToonMat color="#BDBDBD" />
      </mesh>
    </group>
  );
}

/* ─── AIRPORT ─── */
function AirportBuilding({ size, cityLevel }) {
  return (
    <group>
      {/* Terminal building - modern curved */}
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#0277BD" />
      </mesh>
      {/* Glass front */}
      <mesh position={[0, size[1] / 2, size[2] / 2 + 0.01]}>
        <planeGeometry args={[size[0] - 0.2, size[1] - 0.3]} />
        <meshBasicMaterial color="#81D4FA" transparent opacity={0.4} />
      </mesh>
      {/* Glass panels (vertical dividers) */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-size[0] / 2 + 0.5 + i * (size[0] - 1) / 5, size[1] / 2, size[2] / 2 + 0.02]}>
          <boxGeometry args={[0.04, size[1] - 0.2, 0.02]} />
          <ToonMat color="#01579B" />
        </mesh>
      ))}
      {/* Roof overhang */}
      <mesh position={[0, size[1] + 0.05, size[2] / 4]} castShadow>
        <boxGeometry args={[size[0] + 0.5, 0.1, size[2] + 1]} />
        <ToonMat color="#01579B" />
      </mesh>
      {/* Entrance doors */}
      {[-1, 0, 1].map(i => (
        <group key={i} position={[i * 1.5, 0.55, size[2] / 2 + 0.03]}>
          <mesh><boxGeometry args={[0.8, 1.1, 0.04]} /><meshBasicMaterial color="#B3E5FC" transparent opacity={0.5} /></mesh>
        </group>
      ))}

      {/* Control tower */}
      <group position={[size[0] / 2 + 1, 0, 0]}>
        {/* Tower shaft */}
        <mesh position={[0, 2.5, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.45, 5, 8]} />
          <ToonMat color="#01579B" />
        </mesh>
        {/* Observation deck */}
        <mesh position={[0, 5.2, 0]}>
          <cylinderGeometry args={[0.8, 0.5, 0.6, 12]} />
          <meshBasicMaterial color="#B3E5FC" transparent opacity={0.6} />
        </mesh>
        {/* Roof */}
        <mesh position={[0, 5.6, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 0.1, 12]} />
          <ToonMat color="#01579B" />
        </mesh>
        {/* Antenna */}
        <mesh position={[0, 6, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
          <ToonMat color="#F44336" />
        </mesh>
        <mesh position={[0, 6.4, 0]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshBasicMaterial color="#F44336" />
        </mesh>
      </group>

      {/* Runway */}
      <group position={[0, 0, size[2] / 2 + 4]}>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, 8]} />
          <meshToonMaterial color="#37474F" />
        </mesh>
        {/* Center line markings */}
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[0, 0.03, -3.5 + i * 1]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.1, 0.5]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
        {/* Edge lines */}
        {[-0.9, 0.9].map((x, i) => (
          <mesh key={`edge${i}`} position={[x, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.06, 8]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
        {/* Threshold markings */}
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh key={`th${i}`} position={[-0.4 + i * 0.25, 0.03, -3.8]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.12, 0.6]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
        {/* Runway lights */}
        {Array.from({ length: 5 }).map((_, i) => (
          <group key={`rl${i}`}>
            <mesh position={[-1.1, 0.05, -3 + i * 1.5]}>
              <sphereGeometry args={[0.04, 6, 6]} />
              <meshBasicMaterial color="#4FC3F7" />
            </mesh>
            <mesh position={[1.1, 0.05, -3 + i * 1.5]}>
              <sphereGeometry args={[0.04, 6, 6]} />
              <meshBasicMaterial color="#4FC3F7" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Parked airplane */}
      <group position={[-size[0] / 2 - 2, 0, size[2] / 2 + 3]} rotation={[0, -0.3, 0]}>
        {/* Fuselage */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <capsuleGeometry args={[0.25, 2, 8, 8]} rotation={[0, 0, Math.PI / 2]} />
          <ToonMat color="#ECEFF1" />
        </mesh>
        {/* Wings */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[0.8, 0.05, 2.5]} />
          <ToonMat color="#CFD8DC" />
        </mesh>
        {/* Tail */}
        <mesh position={[-1, 1, 0]} castShadow>
          <boxGeometry args={[0.05, 0.6, 0.5]} />
          <ToonMat color="#0277BD" />
        </mesh>
        {/* Engines */}
        {[-0.8, 0.8].map((z, i) => (
          <mesh key={i} position={[0.2, 0.45, z]}>
            <cylinderGeometry args={[0.1, 0.1, 0.3, 8]} rotation={[0, 0, Math.PI / 2]} />
            <ToonMat color="#90A4AE" />
          </mesh>
        ))}
        {/* Landing gear */}
        {[[-0.3, 0], [0.5, -0.3], [0.5, 0.3]].map((p, i) => (
          <mesh key={`gear${i}`} position={[p[0], 0.15, p[1]]}>
            <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
            <ToonMat color="#1A1A1A" />
          </mesh>
        ))}
      </group>

      {/* Windsock */}
      <group position={[size[0] / 2 + 2, 0, size[2] / 2 + 6]}>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 3, 4]} />
          <ToonMat color="#78909C" />
        </mesh>
        <mesh position={[0.2, 2.8, 0]} rotation={[0, 0, Math.PI / 4]}>
          <coneGeometry args={[0.08, 0.4, 6]} />
          <ToonMat color="#FF6F00" />
        </mesh>
      </group>

      {/* Sign */}
      <Sign position={[0, size[1] + 0.3, size[2] / 2 + 0.15]} text="AEROPUERTO" bgColor="#01579B" width={3} />
    </group>
  );
}

/* ─── MAIN BUILDING DISPATCHER ─── */
export function Building({
  id, position, size, color, cityLevel, teamColors,
  notification, nearPlayer, visualData, onEnter,
}) {
  const groupRef = useRef();
  const hoverScale = useRef(1);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = nearPlayer ? 1.02 : 1.0;
    hoverScale.current += (target - hoverScale.current) * 5 * delta;
    groupRef.current.scale.setScalar(hoverScale.current);
  });

  const BuildingComponent = {
    stadium: StadiumBuilding,
    transferOffice: TransferOfficeBuilding,
    trainingCenter: TrainingCenterBuilding,
    museum: MuseumBuilding,
    townHall: TownHallBuilding,
    newspaperKiosk: NewspaperKioskBuilding,
    bank: BankBuilding,
    medicalCenter: MedicalCenterBuilding,
    airport: AirportBuilding,
  }[id] || GenericBuilding;

  return (
    <group ref={groupRef} position={position} onClick={nearPlayer ? onEnter : undefined}>
      <BuildingComponent
        size={size}
        cityLevel={cityLevel}
        teamColors={teamColors}
        visualData={visualData}
      />

      {/* Building label */}
      {nearPlayer && (
        <sprite position={[0, size[1] + 2, 0]} scale={[3, 0.8, 1]}>
          <spriteMaterial color="#1565C0" opacity={0.85} transparent />
        </sprite>
      )}

      {/* Notification badge */}
      {notification && (
        <group position={[size[0] / 2 + 0.5, size[1] + 0.5, 0]}>
          <sprite scale={[0.6, 0.6, 1]}>
            <spriteMaterial color="#FF5722" />
          </sprite>
          <sprite scale={[0.35, 0.35, 1]}>
            <spriteMaterial color="#FFFFFF" />
          </sprite>
        </group>
      )}

      {/* Construction scaffolding */}
      {visualData.isUpgrading && (
        <group>
          {[[-1, 0, -1], [1, 0, -1], [-1, 0, 1], [1, 0, 1]].map((p, i) => (
            <group key={i}>
              <mesh position={[p[0] * size[0] / 2, size[1] / 2, p[2] * size[2] / 2]}>
                <cylinderGeometry args={[0.03, 0.03, size[1] + 1, 4]} />
                <ToonMat color="#795548" />
              </mesh>
              {/* Cross braces */}
              <mesh position={[p[0] * size[0] / 2, size[1] * 0.3, p[2] * size[2] / 2]} rotation={[0, 0, 0.3 * p[0]]}>
                <boxGeometry args={[0.02, 1, 0.02]} />
                <ToonMat color="#795548" />
              </mesh>
            </group>
          ))}
          {/* Horizontal scaffolding planks */}
          {[0.3, 0.6].map((h, i) => (
            <mesh key={`plank${i}`} position={[0, size[1] * h, size[2] / 2]}>
              <boxGeometry args={[size[0] + 0.5, 0.04, 0.3]} />
              <ToonMat color="#8D6E63" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function GenericBuilding({ size }) {
  return (
    <group>
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={size} />
        <ToonMat color="#9E9E9E" />
      </mesh>
      <WindowRow y={size[1] * 0.5} count={2} width={size[0]} zOffset={size[2] / 2 + 0.01} lightOn={false} />
    </group>
  );
}
