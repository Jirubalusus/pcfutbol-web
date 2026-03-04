/**
 * CityGround.jsx — Ground plane, roads, paths, plaza
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';

export function CityGround({ cityLevel, teamColors, weather }) {
  const grassColor = weather === 'snow' ? '#E0E0E0' : '#7CB342';
  const roadColor = '#616161';
  const pathColor = cityLevel >= 3 ? '#9E9E9E' : '#8D6E63';
  
  // Roads get better with city level
  const roadWidth = 1.2 + cityLevel * 0.2;

  return (
    <group>
      {/* Main ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshToonMaterial color={grassColor} />
      </mesh>

      {/* Central plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 2]} receiveShadow>
        <circleGeometry args={[4 + cityLevel * 0.5, 32]} />
        <meshToonMaterial color={pathColor} />
      </mesh>

      {/* Main roads */}
      {/* North-South */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[roadWidth, 50]} />
        <meshToonMaterial color={roadColor} />
      </mesh>
      {/* East-West */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[50, roadWidth]} />
        <meshToonMaterial color={roadColor} />
      </mesh>

      {/* Road markings */}
      {cityLevel >= 2 && (
        <>
          {Array.from({ length: 20 }).map((_, i) => (
            <mesh key={`ns${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -24 + i * 2.5]} receiveShadow>
              <planeGeometry args={[0.1, 1]} />
              <meshBasicMaterial color="#FFF176" />
            </mesh>
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <mesh key={`ew${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-24 + i * 2.5, 0.03, 0]} receiveShadow>
              <planeGeometry args={[1, 0.1]} />
              <meshBasicMaterial color="#FFF176" />
            </mesh>
          ))}
        </>
      )}

      {/* Secondary paths to buildings */}
      {cityLevel >= 2 && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6, 0.015, -6]} receiveShadow>
            <planeGeometry args={[0.8, 12]} />
            <meshToonMaterial color={pathColor} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6, 0.015, -6]} receiveShadow>
            <planeGeometry args={[0.8, 12]} />
            <meshToonMaterial color={pathColor} />
          </mesh>
        </>
      )}

      {/* Parking lot near stadium */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6, 0.015, -14]} receiveShadow>
        <planeGeometry args={[4, 3]} />
        <meshToonMaterial color="#757575" />
      </mesh>
      {/* Parking lines */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`pk${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[4.5 + i * 0.8, 0.02, -14]} receiveShadow>
          <planeGeometry args={[0.05, 2.5]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      ))}

      {/* Deterioration: graffiti patches for low city levels */}
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
        </>
      )}

      {/* Sidewalk curbs for higher levels */}
      {cityLevel >= 3 && (
        <>
          <mesh position={[roadWidth / 2 + 0.1, 0.08, 0]}>
            <boxGeometry args={[0.15, 0.16, 50]} />
            <meshToonMaterial color="#BDBDBD" />
          </mesh>
          <mesh position={[-roadWidth / 2 - 0.1, 0.08, 0]}>
            <boxGeometry args={[0.15, 0.16, 50]} />
            <meshToonMaterial color="#BDBDBD" />
          </mesh>
          <mesh position={[0, 0.08, roadWidth / 2 + 0.1]}>
            <boxGeometry args={[50, 0.16, 0.15]} />
            <meshToonMaterial color="#BDBDBD" />
          </mesh>
          <mesh position={[0, 0.08, -roadWidth / 2 - 0.1]}>
            <boxGeometry args={[50, 0.16, 0.15]} />
            <meshToonMaterial color="#BDBDBD" />
          </mesh>
        </>
      )}
    </group>
  );
}
