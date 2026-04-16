import React, { useMemo } from 'react';
import './PositionRoleIcon.scss';

const POSITION_COORDS = {
  GK:  { x: 50, y: 92 },
  CB:  { x: 50, y: 78 },
  LCB: { x: 35, y: 78 },
  RCB: { x: 65, y: 78 },
  LB:  { x: 15, y: 72 },
  RB:  { x: 85, y: 72 },
  LWB: { x: 12, y: 62 },
  RWB: { x: 88, y: 62 },
  CDM: { x: 50, y: 64 },
  DM:  { x: 50, y: 64 },
  CM:  { x: 50, y: 50 },
  LCM: { x: 35, y: 50 },
  RCM: { x: 65, y: 50 },
  LM:  { x: 15, y: 50 },
  RM:  { x: 85, y: 50 },
  CAM: { x: 50, y: 36 },
  AM:  { x: 50, y: 36 },
  LW:  { x: 17, y: 26 },
  RW:  { x: 83, y: 26 },
  SS:  { x: 50, y: 22 },
  CF:  { x: 50, y: 18 },
  ST:  { x: 50, y: 12 },
};

function resolveCoord(position) {
  if (!position) return POSITION_COORDS.CM;
  const key = String(position).toUpperCase().trim();
  if (POSITION_COORDS[key]) return POSITION_COORDS[key];
  const first = key.split(/[\s,/\-|]/)[0];
  return POSITION_COORDS[first] || POSITION_COORDS.CM;
}

/**
 * Compact football-pitch icon that highlights where a player plays.
 * Renders a landscape SVG with mow stripes, full markings, goals, arcs and a
 * glowing yellow position dot. Designed to be used inside table cells or small
 * panels.
 */
export default function PositionRoleIcon({
  position,
  size = 'md',
  title,
  className = '',
}) {
  const { x, y } = useMemo(() => resolveCoord(position), [position]);

  // Landscape pitch 140 x 100. Defending goal on the left, attacking goal on
  // the right (standard tactical view, attack flows left → right).
  const W = 140;
  const H = 100;
  const MX = 8;
  const MY = 6;
  const pw = W - MX * 2; // inner pitch width  = 124
  const ph = H - MY * 2; // inner pitch height = 88

  // Source coords use a portrait frame (y=0 attack/top, y=100 defense/bottom).
  // Rotate 90° clockwise so that defense → left, attack → right.
  const dotX = MX + ((100 - y) / 100) * pw;
  const dotY = MY + (x / 100) * ph;

  const gradId = 'pri-grass';
  const stripeId = 'pri-stripes';
  const glowId = 'pri-glow';

  const label = title || String(position || '').toUpperCase();

  return (
    <span
      className={`position-role-icon position-role-icon--${size} ${className}`.trim()}
      role="img"
      aria-label={label ? `Posición ${label}` : 'Posición'}
      title={label}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        focusable="false"
      >
        <defs>
          {/* Darker grass base with subtle horizontal tone variation */}
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1f6b3a" />
            <stop offset="50%" stopColor="#1a5a32" />
            <stop offset="100%" stopColor="#174f2b" />
          </linearGradient>
          {/* Seven vertical mow stripes (perpendicular to pitch length) */}
          <pattern
            id={stripeId}
            x={MX}
            y={MY}
            width={pw / 7}
            height={ph}
            patternUnits="userSpaceOnUse"
          >
            <rect
              x="0"
              y="0"
              width={pw / 14}
              height={ph}
              fill="rgba(255,255,255,0.045)"
            />
          </pattern>
          {/* Radial glow for the position ball (vivid yellow, high punch) */}
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 230, 0, 1)" />
            <stop offset="45%" stopColor="rgba(255, 213, 0, 0.65)" />
            <stop offset="100%" stopColor="rgba(255, 213, 0, 0)" />
          </radialGradient>
        </defs>

        {/* Outer frame / board around the pitch */}
        <rect
          x="1"
          y="1"
          width={W - 2}
          height={H - 2}
          rx="4"
          ry="4"
          fill="#0a1410"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.8"
        />

        {/* Grass background */}
        <rect
          x={MX}
          y={MY}
          width={pw}
          height={ph}
          fill={`url(#${gradId})`}
        />
        {/* Mow stripes overlay */}
        <rect
          x={MX}
          y={MY}
          width={pw}
          height={ph}
          fill={`url(#${stripeId})`}
        />

        {/* Pitch outline */}
        <g
          stroke="rgba(255,255,255,0.82)"
          strokeWidth="0.7"
          fill="none"
          strokeLinecap="square"
        >
          <rect x={MX} y={MY} width={pw} height={ph} />

          {/* Halfway line (vertical) */}
          <line x1={MX + pw / 2} y1={MY} x2={MX + pw / 2} y2={MY + ph} />

          {/* Center circle + spot */}
          <circle cx={MX + pw / 2} cy={MY + ph / 2} r="9" />

          {/* Left penalty box (defending end) */}
          <rect
            x={MX}
            y={MY + ph * 0.18}
            width={pw * 0.14}
            height={ph * 0.64}
          />
          {/* Left 6-yard box */}
          <rect
            x={MX}
            y={MY + ph * 0.34}
            width={pw * 0.055}
            height={ph * 0.32}
          />
          {/* Left penalty arc (D opens to the right) */}
          <path
            d={`M ${MX + pw * 0.14} ${MY + ph / 2 - 5.5} A 6 6 0 0 1 ${MX + pw * 0.14} ${MY + ph / 2 + 5.5}`}
          />

          {/* Right penalty box (attacking end) */}
          <rect
            x={MX + pw - pw * 0.14}
            y={MY + ph * 0.18}
            width={pw * 0.14}
            height={ph * 0.64}
          />
          {/* Right 6-yard box */}
          <rect
            x={MX + pw - pw * 0.055}
            y={MY + ph * 0.34}
            width={pw * 0.055}
            height={ph * 0.32}
          />
          {/* Right penalty arc (D opens to the left) */}
          <path
            d={`M ${MX + pw - pw * 0.14} ${MY + ph / 2 - 5.5} A 6 6 0 0 0 ${MX + pw - pw * 0.14} ${MY + ph / 2 + 5.5}`}
          />

          {/* Corner arcs */}
          <path d={`M ${MX + 2} ${MY} A 2 2 0 0 1 ${MX} ${MY + 2}`} />
          <path d={`M ${MX + pw - 2} ${MY} A 2 2 0 0 0 ${MX + pw} ${MY + 2}`} />
          <path d={`M ${MX} ${MY + ph - 2} A 2 2 0 0 0 ${MX + 2} ${MY + ph}`} />
          <path
            d={`M ${MX + pw} ${MY + ph - 2} A 2 2 0 0 1 ${MX + pw - 2} ${MY + ph}`}
          />
        </g>

        {/* Spots (solid): center + two penalty spots */}
        <g fill="rgba(255,255,255,0.85)">
          <circle cx={MX + pw / 2} cy={MY + ph / 2} r="0.9" />
          <circle cx={MX + pw * 0.105} cy={MY + ph / 2} r="0.75" />
          <circle cx={MX + pw - pw * 0.105} cy={MY + ph / 2} r="0.75" />
        </g>

        {/* Goals: small rects just outside touchlines (left + right) */}
        <g fill="rgba(255,255,255,0.7)" stroke="rgba(255,255,255,0.85)" strokeWidth="0.4">
          <rect
            x={MX - 2.2}
            y={MY + ph / 2 - ph * 0.09}
            width="2.2"
            height={ph * 0.18}
            rx="0.4"
          />
          <rect
            x={MX + pw}
            y={MY + ph / 2 - ph * 0.09}
            width="2.2"
            height={ph * 0.18}
            rx="0.4"
          />
        </g>

        {/* Position highlight: vivid yellow ball, halo ring + glow for punch */}
        <g className="pri-marker">
          <circle cx={dotX} cy={dotY} r="12" fill={`url(#${glowId})`} />
          <circle
            cx={dotX}
            cy={dotY}
            r="5.2"
            fill="rgba(0,0,0,0.55)"
          />
          <circle
            cx={dotX}
            cy={dotY}
            r="4.6"
            fill="#ffe600"
            stroke="#ffffff"
            strokeWidth="0.9"
          />
          <circle
            cx={dotX}
            cy={dotY}
            r="4.6"
            fill="none"
            stroke="#0a1410"
            strokeWidth="0.45"
            strokeOpacity="0.85"
          />
          <circle cx={dotX} cy={dotY} r="1.3" fill="#0a1410" />
        </g>
      </svg>
    </span>
  );
}
