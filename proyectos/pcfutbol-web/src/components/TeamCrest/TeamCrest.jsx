import React, { useMemo } from 'react';
import teamColors from '../../data/teamColors.json';
import './TeamCrest.scss';

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const FALLBACK_COLORS = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#264653','#6a4c93','#1982c4'];
const PATTERNS = ['solid','stripes','half','horiz','diagonal'];

function ShieldPath() {
  return (
    <path d="M5,8 Q5,2 15,2 L85,2 Q95,2 95,8 L95,65 Q95,90 50,118 Q5,90 5,65 Z" />
  );
}

function PatternFill({ pattern, primary, secondary }) {
  switch (pattern) {
    case 'stripes':
      return (
        <>
          <rect x="0" y="0" width="100" height="120" fill={primary} />
          {[0, 2, 4, 6].map(i => (
            <rect key={i} x={i * 14.28} y="0" width="14.28" height="120" fill={i % 2 === 0 ? primary : secondary} />
          ))}
          {[1, 3, 5].map(i => (
            <rect key={`s${i}`} x={i * 14.28} y="0" width="14.28" height="120" fill={secondary} />
          ))}
        </>
      );
    case 'half':
      return (
        <>
          <rect x="0" y="0" width="50" height="120" fill={primary} />
          <rect x="50" y="0" width="50" height="120" fill={secondary} />
        </>
      );
    case 'horiz':
      return (
        <>
          <rect x="0" y="0" width="100" height="120" fill={primary} />
          {[1, 3, 5].map(i => (
            <rect key={i} x="0" y={i * 17.14} width="100" height="17.14" fill={secondary} />
          ))}
        </>
      );
    case 'diagonal':
      return (
        <>
          <rect x="0" y="0" width="100" height="120" fill={primary} />
          <polygon points="30,0 70,0 100,60 100,120 70,120 0,60 0,0" fill={secondary} opacity="0.9" />
        </>
      );
    case 'quarters':
      return (
        <>
          <rect x="0" y="0" width="50" height="60" fill={primary} />
          <rect x="50" y="0" width="50" height="60" fill={secondary} />
          <rect x="0" y="60" width="50" height="60" fill={secondary} />
          <rect x="50" y="60" width="50" height="60" fill={primary} />
        </>
      );
    case 'cross':
      return (
        <>
          <rect x="0" y="0" width="100" height="120" fill={primary} />
          <rect x="40" y="0" width="20" height="120" fill={secondary} />
          <rect x="0" y="45" width="100" height="20" fill={secondary} />
        </>
      );
    case 'circle':
      return (
        <>
          <rect x="0" y="0" width="100" height="120" fill={primary} />
          <circle cx="50" cy="55" r="28" fill={secondary} />
        </>
      );
    default: // solid
      return <rect x="0" y="0" width="100" height="120" fill={primary} />;
  }
}

export default function TeamCrest({ teamId, size = 40, className = '' }) {
  const { primary, secondary, pattern } = useMemo(() => {
    const colors = teamColors[teamId];
    if (colors) {
      return {
        primary: colors.primary,
        secondary: colors.secondary,
        pattern: colors.pattern || 'solid',
      };
    }
    const h = hashCode(teamId || 'unknown');
    return {
      primary: FALLBACK_COLORS[h % FALLBACK_COLORS.length],
      secondary: '#fff',
      pattern: PATTERNS[h % PATTERNS.length],
    };
  }, [teamId]);

  // Use a unique ID combining teamId with a stable suffix to avoid collisions
  const clipId = `shield-clip-${(teamId || 'unknown').replace(/[^a-zA-Z0-9-]/g, '_')}`;
  const gradientId = `shield-grad-${(teamId || 'unknown').replace(/[^a-zA-Z0-9-]/g, '_')}`;

  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      className={`team-crest ${className}`}
      aria-label={teamId}
    >
      <defs>
        <clipPath id={clipId}>
          <ShieldPath />
        </clipPath>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <PatternFill pattern={pattern} primary={primary} secondary={secondary} />
        {/* Gradient overlay for polish */}
        <rect x="0" y="0" width="100" height="120" fill={`url(#${gradientId})`} />
      </g>
      {/* Shield outline */}
      <path
        d="M5,8 Q5,2 15,2 L85,2 Q95,2 95,8 L95,65 Q95,90 50,118 Q5,90 5,65 Z"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2.5"
      />
      {/* Inner highlight */}
      <path
        d="M7,9 Q7,4 16,4 L84,4 Q93,4 93,9 L93,64 Q93,88 50,115 Q7,88 7,64 Z"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
      />
    </svg>
  );
}
