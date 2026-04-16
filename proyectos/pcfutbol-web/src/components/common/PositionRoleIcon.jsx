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
 * Renders an SVG with mow stripes, full markings, goals, arcs and a glowing
 * position dot. Designed to be used inside table cells or small panels.
 */
export default function PositionRoleIcon({
  position,
  size = 'md',
  title,
  className = '',
}) {
  const { x, y } = useMemo(() => resolveCoord(position), [position]);

  // Portrait pitch 100 x 140 (wider margin around markings for breathing room).
  // All marking coords are kept proportional to FIFA-ish pitch ratios scaled down.
  const W = 100;
  const H = 140;
  const MX = 6;   // horizontal margin
  const MY = 8;   // vertical margin
  const pw = W - MX * 2; // inner pitch width  = 88
  const ph = H - MY * 2; // inner pitch height = 124

  // Player dot position (data x/y in 0..100 mapped to inner pitch rect)
  const dotX = MX + (x / 100) * pw;
  const dotY = MY + (y / 100) * ph;

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
          {/* Darker grass base with subtle vertical tone variation */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f6b3a" />
            <stop offset="50%" stopColor="#1a5a32" />
            <stop offset="100%" stopColor="#174f2b" />
          </linearGradient>
          {/* Seven horizontal mow stripes via repeating pattern */}
          <pattern
            id={stripeId}
            x={MX}
            y={MY}
            width={pw}
            height={ph / 7}
            patternUnits="userSpaceOnUse"
          >
            <rect
              x="0"
              y="0"
              width={pw}
              height={ph / 14}
              fill="rgba(255,255,255,0.045)"
            />
          </pattern>
          {/* Radial glow for the position dot */}
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0, 245, 160, 0.85)" />
            <stop offset="60%" stopColor="rgba(0, 245, 160, 0.25)" />
            <stop offset="100%" stopColor="rgba(0, 245, 160, 0)" />
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

          {/* Halfway line */}
          <line x1={MX} y1={MY + ph / 2} x2={MX + pw} y2={MY + ph / 2} />

          {/* Center circle + spot */}
          <circle cx={W / 2} cy={MY + ph / 2} r="9" />

          {/* Top penalty box (attacking end) */}
          <rect x={MX + pw * 0.18} y={MY} width={pw * 0.64} height={ph * 0.14} />
          {/* Top 6-yard box */}
          <rect
            x={MX + pw * 0.34}
            y={MY}
            width={pw * 0.32}
            height={ph * 0.055}
          />
          {/* Top penalty arc (the D) */}
          <path
            d={`M ${W / 2 - 5.5} ${MY + ph * 0.14} A 6 6 0 0 0 ${W / 2 + 5.5} ${MY + ph * 0.14}`}
          />

          {/* Bottom penalty box (defensive end) */}
          <rect
            x={MX + pw * 0.18}
            y={MY + ph - ph * 0.14}
            width={pw * 0.64}
            height={ph * 0.14}
          />
          {/* Bottom 6-yard box */}
          <rect
            x={MX + pw * 0.34}
            y={MY + ph - ph * 0.055}
            width={pw * 0.32}
            height={ph * 0.055}
          />
          {/* Bottom penalty arc */}
          <path
            d={`M ${W / 2 - 5.5} ${MY + ph - ph * 0.14} A 6 6 0 0 1 ${W / 2 + 5.5} ${MY + ph - ph * 0.14}`}
          />

          {/* Corner arcs */}
          <path d={`M ${MX + 2} ${MY} A 2 2 0 0 1 ${MX} ${MY + 2}`} />
          <path d={`M ${MX + pw - 2} ${MY} A 2 2 0 0 0 ${MX + pw} ${MY + 2}`} />
          <path d={`M ${MX} ${MY + ph - 2} A 2 2 0 0 0 ${MX + 2} ${MY + ph}`} />
          <path
            d={`M ${MX + pw} ${MY + ph - 2} A 2 2 0 0 1 ${MX + pw - 2} ${MY + ph}`}
          />
        </g>

        {/* Spots (solid) */}
        <g fill="rgba(255,255,255,0.85)">
          <circle cx={W / 2} cy={MY + ph / 2} r="0.9" />
          <circle cx={W / 2} cy={MY + ph * 0.105} r="0.75" />
          <circle cx={W / 2} cy={MY + ph - ph * 0.105} r="0.75" />
        </g>

        {/* Goals: small rects just outside touchlines */}
        <g fill="rgba(255,255,255,0.7)" stroke="rgba(255,255,255,0.85)" strokeWidth="0.4">
          <rect
            x={W / 2 - pw * 0.09}
            y={MY - 2.2}
            width={pw * 0.18}
            height="2.2"
            rx="0.4"
          />
          <rect
            x={W / 2 - pw * 0.09}
            y={MY + ph}
            width={pw * 0.18}
            height="2.2"
            rx="0.4"
          />
        </g>

        {/* Position highlight: glow + dot + center pip */}
        <g className="pri-marker">
          <circle cx={dotX} cy={dotY} r="11" fill={`url(#${glowId})`} />
          <circle
            cx={dotX}
            cy={dotY}
            r="4.4"
            fill="#00f5a0"
            stroke="#0a1410"
            strokeWidth="1"
          />
          <circle cx={dotX} cy={dotY} r="1.4" fill="#0a1410" />
        </g>
      </svg>
    </span>
  );
}
