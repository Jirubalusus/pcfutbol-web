import React, { useEffect, useMemo, useState } from 'react';
import teamColors from '../../data/teamColors.json';
import { getActiveEditionId } from '../../data/editions/editionService';
import { getCachedEditionTeamAsset, normalizeTeamAssetKey } from '../../data/editions/editionAssetsService';
import {
  getEditionCrestUrl,
  getOfficialCrestUrlFromAsset,
  isCrestImageReady,
  preloadCrestImage
} from './teamCrestCache';
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

const SHIELD_PATH = 'M5,8 Q5,2 15,2 L85,2 Q95,2 95,8 L95,65 Q95,90 50,118 Q5,90 5,65 Z';
const SHIELD_INNER_PATH = 'M7,9 Q7,4 16,4 L84,4 Q93,4 93,9 L93,64 Q93,88 50,115 Q7,88 7,64 Z';

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
    default:
      return <rect x="0" y="0" width="100" height="120" fill={primary} />;
  }
}

export default function TeamCrest({ teamId, size = 40, className = '' }) {
  const editionId = getActiveEditionId();
  const normalizedTeamKey = normalizeTeamAssetKey(teamId);
  const [officialCrestUrl, setOfficialCrestUrl] = useState(() => {
    const cachedAsset = getCachedEditionTeamAsset(editionId, teamId);
    return getOfficialCrestUrlFromAsset(cachedAsset);
  });

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

  useEffect(() => {
    let cancelled = false;

    async function loadOfficialCrest() {
      if (!editionId || !normalizedTeamKey) {
        setOfficialCrestUrl(null);
        return;
      }

      const cachedAsset = getCachedEditionTeamAsset(editionId, teamId);
      const cachedUrl = getOfficialCrestUrlFromAsset(cachedAsset);
      setOfficialCrestUrl(cachedUrl || null);

      const nextUrl = await getEditionCrestUrl(editionId, teamId);
      if (!nextUrl) {
        if (!cancelled) setOfficialCrestUrl(null);
        return;
      }

      if (isCrestImageReady(nextUrl)) {
        if (!cancelled) setOfficialCrestUrl(nextUrl);
        return;
      }

      const loaded = await preloadCrestImage(nextUrl);

      if (!cancelled && loaded) {
        setOfficialCrestUrl(nextUrl);
      }
    }

    loadOfficialCrest();

    return () => {
      cancelled = true;
    };
  }, [editionId, normalizedTeamKey, teamId]);

  if (officialCrestUrl) {
    return (
      <img
        src={officialCrestUrl}
        alt={teamId}
        width={size}
        height={size}
        className={`team-crest team-crest--official ${className}`.trim()}
      />
    );
  }

  const safeTeamId = (teamId || 'unknown').replace(/[^a-zA-Z0-9-]/g, '_');
  const clipId = `shield-clip-${safeTeamId}`;
  const gradientId = `shield-grad-${safeTeamId}`;

  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size}
      className={`team-crest team-crest--generated ${className}`.trim()}
      aria-label={teamId}
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <path d={SHIELD_INNER_PATH} />
        </clipPath>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <PatternFill pattern={pattern} primary={primary} secondary={secondary} />
        <rect x="0" y="0" width="100" height="120" fill={`url(#${gradientId})`} />
      </g>
      <path
        d={SHIELD_PATH}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2.5"
      />
      <path
        d={SHIELD_INNER_PATH}
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
      />
    </svg>
  );
}
