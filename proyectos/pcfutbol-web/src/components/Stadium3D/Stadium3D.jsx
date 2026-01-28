import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Campo de fútbol
function Field({ grassCondition = 100 }) {
  const grassColor = useMemo(() => {
    // Verde oscuro a marrón según condición
    const good = new THREE.Color(0x228b22);
    const bad = new THREE.Color(0x8b7355);
    return good.lerp(bad, (100 - grassCondition) / 100);
  }, [grassCondition]);

  return (
    <group>
      {/* Campo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[105, 68]} />
        <meshStandardMaterial color={grassColor} />
      </mesh>
      
      {/* Líneas del campo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[9, 9.5, 32]} />
        <meshStandardMaterial color="white" />
      </mesh>
      
      {/* Línea central */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[0.5, 68]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
}

// Grada individual
function Stand({ position, rotation, width, height, depth, color = '#1a4a6e' }) {
  const rows = Math.floor(height / 2);
  
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: rows }).map((_, i) => (
        <mesh key={i} position={[0, i * 2 + 1, -i * 1.5]}>
          <boxGeometry args={[width, 2, depth]} />
          <meshStandardMaterial color={i % 2 === 0 ? color : '#1e5a8a'} />
        </mesh>
      ))}
    </group>
  );
}

// Estadio completo
function Stadium({ level = 0, naming = null, grassCondition = 100 }) {
  const groupRef = useRef();
  
  // Configuración por nivel
  const config = useMemo(() => {
    const levels = [
      { name: 'Municipal', capacity: 8000, stands: 4, height: 6, hasRoof: false, hasLights: false },
      { name: 'Moderno', capacity: 18000, stands: 8, height: 10, hasRoof: false, hasLights: true },
      { name: 'Grande', capacity: 35000, stands: 12, height: 16, hasRoof: true, hasLights: true },
      { name: 'Élite', capacity: 55000, stands: 18, height: 22, hasRoof: true, hasLights: true },
      { name: 'Legendario', capacity: 80000, stands: 24, height: 30, hasRoof: true, hasLights: true },
    ];
    return levels[level] || levels[0];
  }, [level]);

  // Rotación lenta automática
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.3;
    }
  });

  const standColor = level >= 3 ? '#1a365d' : '#1a4a6e';

  return (
    <group ref={groupRef}>
      <Field grassCondition={grassCondition} />
      
      {/* Gradas principales (norte y sur) */}
      <Stand 
        position={[0, 0, -45]} 
        rotation={[0, 0, 0]} 
        width={105} 
        height={config.height} 
        depth={3}
        color={standColor}
      />
      <Stand 
        position={[0, 0, 45]} 
        rotation={[0, Math.PI, 0]} 
        width={105} 
        height={config.height} 
        depth={3}
        color={standColor}
      />
      
      {/* Gradas laterales (este y oeste) */}
      <Stand 
        position={[-60, 0, 0]} 
        rotation={[0, Math.PI / 2, 0]} 
        width={68} 
        height={config.height * 0.8} 
        depth={3}
        color={standColor}
      />
      <Stand 
        position={[60, 0, 0]} 
        rotation={[0, -Math.PI / 2, 0]} 
        width={68} 
        height={config.height * 0.8} 
        depth={3}
        color={standColor}
      />
      
      {/* Focos (nivel 2+) */}
      {config.hasLights && (
        <>
          {[[-55, -40], [-55, 40], [55, -40], [55, 40]].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, config.height + 10, 0]}>
                <cylinderGeometry args={[0.5, 1, config.height + 20, 8]} />
                <meshStandardMaterial color="#444" />
              </mesh>
              <pointLight 
                position={[0, config.height + 15, 0]} 
                intensity={level >= 3 ? 100 : 50} 
                distance={150}
                color="#fff5e0"
              />
            </group>
          ))}
        </>
      )}
      
      {/* Techo (nivel 3+) */}
      {config.hasRoof && (
        <>
          <mesh position={[0, config.height + 5, -48]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[110, 0.5, 15]} />
            <meshStandardMaterial color="#2d3748" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, config.height + 5, 48]} rotation={[-0.3, 0, 0]}>
            <boxGeometry args={[110, 0.5, 15]} />
            <meshStandardMaterial color="#2d3748" metalness={0.8} roughness={0.2} />
          </mesh>
        </>
      )}
      
      {/* Nombre del estadio / Sponsor */}
      {naming && (
        <Text
          position={[0, config.height + 2, -50]}
          fontSize={5}
          color="#fff"
          anchorX="center"
          anchorY="middle"
        >
          {naming.name} Arena
        </Text>
      )}
    </group>
  );
}

// Componente exportado
export default function Stadium3D({ level = 0, naming = null, grassCondition = 100 }) {
  return (
    <div style={{ width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [120, 80, 120], fov: 50 }}
        shadows
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[50, 100, 50]} intensity={1} castShadow />
        
        <Stadium level={level} naming={naming} grassCondition={grassCondition} />
        
        <ContactShadows 
          position={[0, -0.01, 0]} 
          opacity={0.4} 
          scale={200} 
          blur={2} 
        />
        
        <OrbitControls 
          enablePan={false}
          enableZoom={true}
          minDistance={80}
          maxDistance={250}
          maxPolarAngle={Math.PI / 2.2}
        />
        
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
