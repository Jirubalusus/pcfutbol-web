/**
 * Minimap.jsx — Corner minimap showing building positions and player location
 */
import React, { useMemo } from 'react';

const MAP_SIZE = 120;
const WORLD_SIZE = 50; // -25 to 25

function worldToMap(wx, wz) {
  return {
    x: ((wx + WORLD_SIZE / 2) / WORLD_SIZE) * MAP_SIZE,
    y: ((wz + WORLD_SIZE / 2) / WORLD_SIZE) * MAP_SIZE,
  };
}

export function Minimap({ playerPos, buildings, cityLevel, notifications, onTeleport }) {
  const visibleBuildings = useMemo(() => {
    return Object.entries(buildings)
      .filter(([, cfg]) => cfg.minLevel <= cityLevel)
      .map(([id, cfg]) => ({
        id,
        ...cfg,
        mapPos: worldToMap(cfg.position[0], cfg.position[2]),
      }));
  }, [buildings, cityLevel]);

  const playerMapPos = worldToMap(playerPos.x, playerPos.z);

  return (
    <div className="city-minimap" style={{ width: MAP_SIZE, height: MAP_SIZE }}>
      <svg width={MAP_SIZE} height={MAP_SIZE} viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}>
        {/* Background */}
        <rect width={MAP_SIZE} height={MAP_SIZE} fill="#1B5E20" opacity={0.7} rx={8} />
        
        {/* Roads */}
        <line x1={MAP_SIZE / 2} y1={0} x2={MAP_SIZE / 2} y2={MAP_SIZE} stroke="#616161" strokeWidth={2} opacity={0.5} />
        <line x1={0} y1={MAP_SIZE / 2} x2={MAP_SIZE} y2={MAP_SIZE / 2} stroke="#616161" strokeWidth={2} opacity={0.5} />

        {/* Buildings */}
        {visibleBuildings.map(b => (
          <g key={b.id} onClick={() => onTeleport(b.id)} style={{ cursor: 'pointer' }}>
            <rect
              x={b.mapPos.x - 4}
              y={b.mapPos.y - 4}
              width={8}
              height={8}
              fill={b.color}
              rx={1}
              stroke={notifications?.[b.id] ? '#FF5722' : '#FFFFFF'}
              strokeWidth={notifications?.[b.id] ? 2 : 0.5}
            />
            <text
              x={b.mapPos.x}
              y={b.mapPos.y + 3}
              textAnchor="middle"
              fontSize={6}
              fill="white"
            >
              {b.icon}
            </text>
          </g>
        ))}

        {/* Player dot */}
        <circle
          cx={playerMapPos.x}
          cy={playerMapPos.y}
          r={4}
          fill="#FFEB3B"
          stroke="#FFF"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
