/**
 * Building.jsx — Procedural cartoon buildings with cel-shading
 * Each building type has unique geometry reflecting its purpose
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ToonMat({ color, emissive, emissiveIntensity = 0.05 }) {
  return <meshToonMaterial color={color} emissive={emissive || color} emissiveIntensity={emissiveIntensity} />;
}

// Stadium building
function StadiumBuilding({ size, cityLevel, teamColors, visualData }) {
  const stadiumScale = 1 + (cityLevel - 1) * 0.15 + (visualData.stadiumLevel || 0) * 0.1;
  const primaryHex = '#' + teamColors.primary.getHexString();
  
  return (
    <group scale={[stadiumScale, stadiumScale, stadiumScale]}>
      {/* Base oval */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[4, 4.5, 2, 16, 1, true]} />
        <ToonMat color="#B0BEC5" />
      </mesh>
      {/* Stands */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[4.2, 3.8, 0.8, 16, 1, true]} />
        <ToonMat color={primaryHex} />
      </mesh>
      {/* Field (green) */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ellipseGeometry args={[3.5, 2.5, 16]} />
        <ToonMat color={visualData.teamFitness > 70 ? '#4CAF50' : '#8D6E63'} />
      </mesh>
      {/* Floodlights */}
      {[[-3.5, 0, -3], [3.5, 0, -3], [-3.5, 0, 3], [3.5, 0, 3]].map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 2.5, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 3, 6]} />
            <ToonMat color="#78909C" />
          </mesh>
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[0.3, 0.15, 0.15]} />
            <meshBasicMaterial color="#FFF9C4" />
          </mesh>
        </group>
      ))}
      {/* Ticket queues (popularity indicator) */}
      {visualData.attendance > 3000 && (
        <group position={[0, 0, 5]}>
          {Array.from({ length: Math.min(Math.floor(visualData.attendance / 1000), 6) }).map((_, i) => (
            <mesh key={i} position={[i * 0.4 - 1, 0.3, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.3, 4, 6]} />
              <ToonMat color={primaryHex} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

// Skyscraper transfer office
function TransferOfficeBuilding({ size, cityLevel, teamColors, visualData }) {
  const height = size[1] + cityLevel * 0.8;
  const lightOn = visualData.hasPendingOffers;
  
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[size[0], height, size[2]]} />
        <ToonMat color="#1565C0" />
      </mesh>
      {/* Windows */}
      {Array.from({ length: Math.floor(height / 1.2) }).map((_, i) => (
        <group key={i}>
          <mesh position={[-size[0] / 2 - 0.01, 1 + i * 1.2, 0]}>
            <planeGeometry args={[0.01, 0.6]} />
            <meshBasicMaterial color={lightOn ? '#FFF176' : '#90CAF9'} />
          </mesh>
          <mesh position={[size[0] / 2 + 0.01, 1 + i * 1.2, 0]}>
            <planeGeometry args={[0.01, 0.6]} />
            <meshBasicMaterial color={lightOn ? '#FFF176' : '#90CAF9'} />
          </mesh>
        </group>
      ))}
      {/* Roof antenna */}
      <mesh position={[0, height + 0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 6]} />
        <ToonMat color="#455A64" />
      </mesh>
    </group>
  );
}

// Training center
function TrainingCenterBuilding({ size, cityLevel, teamColors, visualData }) {
  const primaryHex = '#' + teamColors.primary.getHexString();
  
  return (
    <group>
      {/* Main building */}
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#4CAF50" />
      </mesh>
      {/* Training pitch */}
      <mesh position={[0, 0.05, size[2] / 2 + 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 3]} />
        <ToonMat color="#66BB6A" />
      </mesh>
      {/* Goals */}
      <mesh position={[-1.5, 0.5, size[2] / 2 + 2]}>
        <boxGeometry args={[0.05, 1, 0.05]} />
        <ToonMat color="#FFFFFF" />
      </mesh>
      <mesh position={[1.5, 0.5, size[2] / 2 + 2]}>
        <boxGeometry args={[0.05, 1, 0.05]} />
        <ToonMat color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 1, size[2] / 2 + 2]}>
        <boxGeometry args={[3, 0.05, 0.05]} />
        <ToonMat color="#FFFFFF" />
      </mesh>
      {/* Ambulance if injured */}
      {visualData.hasInjured && (
        <group position={[-size[0] / 2 - 1.5, 0, 0]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[1.2, 0.7, 0.6]} />
            <ToonMat color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <boxGeometry args={[0.15, 0.15, 0.01]} />
            <meshBasicMaterial color="#F44336" />
          </mesh>
          <mesh position={[0, 0.85, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.15, 0.15, 0.01]} />
            <meshBasicMaterial color="#F44336" />
          </mesh>
        </group>
      )}
    </group>
  );
}

// Museum / Trophy Room
function MuseumBuilding({ size, cityLevel }) {
  return (
    <group>
      {/* Classical building with columns */}
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#FF8F00" />
      </mesh>
      {/* Columns */}
      {[-1, 0, 1].map((x, i) => (
        <mesh key={i} position={[x, size[1] / 2, size[2] / 2 + 0.15]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, size[1], 8]} />
          <ToonMat color="#FFF8E1" />
        </mesh>
      ))}
      {/* Pediment (triangle roof) */}
      <mesh position={[0, size[1] + 0.4, size[2] / 2]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[size[0] / 1.8, 0.8, 3]} />
        <ToonMat color="#FFB300" />
      </mesh>
      {/* Trophy on top */}
      <mesh position={[0, size[1] + 1.2, 0]}>
        <cylinderGeometry args={[0.15, 0.08, 0.3, 8]} />
        <ToonMat color="#FFD700" emissive="#FFD700" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

// Town Hall
function TownHallBuilding({ size, cityLevel }) {
  return (
    <group>
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#6D4C41" />
      </mesh>
      {/* Clock tower */}
      <mesh position={[0, size[1] + 1, 0]} castShadow>
        <boxGeometry args={[1.2, 2, 1.2]} />
        <ToonMat color="#5D4037" />
      </mesh>
      {/* Clock face */}
      <mesh position={[0, size[1] + 1.5, 0.61]}>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial color="#FFF8E1" />
      </mesh>
      {/* Roof */}
      <mesh position={[0, size[1] + 2.5, 0]} castShadow>
        <coneGeometry args={[1, 1, 4]} />
        <ToonMat color="#8D6E63" />
      </mesh>
    </group>
  );
}

// Newspaper Kiosk
function NewspaperKioskBuilding({ size }) {
  return (
    <group>
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#E65100" />
      </mesh>
      {/* Awning */}
      <mesh position={[0, size[1], size[2] / 2 + 0.3]} castShadow>
        <boxGeometry args={[size[0] + 0.5, 0.08, 0.8]} />
        <ToonMat color="#BF360C" />
      </mesh>
      {/* Newspapers on display */}
      {[-0.4, 0, 0.4].map((x, i) => (
        <mesh key={i} position={[x, size[1] * 0.6, size[2] / 2 + 0.01]} rotation={[0, 0, (i - 1) * 0.1]}>
          <planeGeometry args={[0.3, 0.4]} />
          <meshBasicMaterial color={['#E8EAF6', '#FFF3E0', '#E0F2F1'][i]} />
        </mesh>
      ))}
    </group>
  );
}

// Bank
function BankBuilding({ size, cityLevel }) {
  return (
    <group>
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#37474F" />
      </mesh>
      {/* Vault door */}
      <mesh position={[0, size[1] * 0.35, size[2] / 2 + 0.01]}>
        <circleGeometry args={[0.6, 16]} />
        <ToonMat color="#616161" />
      </mesh>
      <mesh position={[0, size[1] * 0.35, size[2] / 2 + 0.02]}>
        <torusGeometry args={[0.5, 0.05, 8, 16]} />
        <ToonMat color="#FFD700" />
      </mesh>
      {/* Columns */}
      {[-1.2, 1.2].map((x, i) => (
        <mesh key={i} position={[x, size[1] / 2, size[2] / 2 + 0.2]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, size[1], 8]} />
          <ToonMat color="#78909C" />
        </mesh>
      ))}
    </group>
  );
}

// Medical Center
function MedicalCenterBuilding({ size, visualData }) {
  return (
    <group>
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#FFFFFF" />
      </mesh>
      {/* Red cross */}
      <mesh position={[0, size[1] * 0.7, size[2] / 2 + 0.01]}>
        <boxGeometry args={[0.8, 0.25, 0.01]} />
        <meshBasicMaterial color="#F44336" />
      </mesh>
      <mesh position={[0, size[1] * 0.7, size[2] / 2 + 0.01]}>
        <boxGeometry args={[0.25, 0.8, 0.01]} />
        <meshBasicMaterial color="#F44336" />
      </mesh>
      {/* Stretcher outside if injured */}
      {visualData.hasInjured && (
        <group position={[size[0] / 2 + 1, 0, 0]}>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.8, 0.05, 0.35]} />
            <ToonMat color="#90A4AE" />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <capsuleGeometry args={[0.08, 0.4, 4, 6]} />
            <ToonMat color="#FFFFFF" />
          </mesh>
        </group>
      )}
    </group>
  );
}

// Airport
function AirportBuilding({ size, cityLevel }) {
  return (
    <group>
      {/* Terminal */}
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <ToonMat color="#0277BD" />
      </mesh>
      {/* Control tower */}
      <mesh position={[size[0] / 2 + 0.5, size[1] + 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.3, 1.6, 8]} />
        <ToonMat color="#01579B" />
      </mesh>
      <mesh position={[size[0] / 2 + 0.5, size[1] + 2, 0]}>
        <cylinderGeometry args={[0.6, 0.4, 0.5, 8]} />
        <ToonMat color="#B3E5FC" />
      </mesh>
      {/* Runway */}
      <mesh position={[0, 0.02, size[2] / 2 + 2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 5]} />
        <ToonMat color="#455A64" />
      </mesh>
      {/* Runway markings */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={i} position={[0, 0.03, size[2] / 2 + 0.5 + i]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, 0.3]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      ))}
    </group>
  );
}

// Main Building component that dispatches to specialized builders
export function Building({
  id,
  position,
  size,
  color,
  cityLevel,
  teamColors,
  notification,
  nearPlayer,
  visualData,
  onEnter,
}) {
  const groupRef = useRef();
  const hoverScale = useRef(1);

  // Pulse when near player
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = nearPlayer ? 1.03 : 1.0;
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
        <sprite position={[0, size[1] + 1.5, 0]} scale={[3, 0.8, 1]}>
          <spriteMaterial color="#1565C0" opacity={0.85} transparent />
        </sprite>
      )}

      {/* Notification badge */}
      {notification && (
        <sprite position={[size[0] / 2 + 0.5, size[1] + 0.5, 0]} scale={[0.8, 0.8, 1]}>
          <spriteMaterial color="#FF5722" />
        </sprite>
      )}

      {/* Construction scaffolding for upgrades */}
      {visualData.isUpgrading && (
        <group>
          {[[-1, 0, -1], [1, 0, -1], [-1, 0, 1], [1, 0, 1]].map((p, i) => (
            <mesh key={i} position={[p[0] * size[0] / 2, size[1] / 2, p[2] * size[2] / 2]}>
              <cylinderGeometry args={[0.03, 0.03, size[1] + 1, 4]} />
              <ToonMat color="#795548" />
            </mesh>
          ))}
        </group>
      )}

      {/* Outline for cel-shading effect */}
      <mesh position={[0, size[1] / 2, 0]}>
        <boxGeometry args={[size[0] + 0.08, size[1] + 0.08, size[2] + 0.08]} />
        <meshBasicMaterial color="#1A1A1A" side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function GenericBuilding({ size, cityLevel }) {
  return (
    <mesh position={[0, size[1] / 2, 0]} castShadow>
      <boxGeometry args={size} />
      <ToonMat color="#9E9E9E" />
    </mesh>
  );
}
