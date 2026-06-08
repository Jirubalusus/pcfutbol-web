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

const AMBIGUOUS_COMPACT_CREST_ALIASES = new Set([
  // "Real Racing Club" (Santander) and "Racing Club" (Avellaneda) both collapse
  // to "racing" if generic words are stripped. Exact names/ids are safe; the
  // compact alias is not.
  'racing'
]);

function teamNameAliases(value) {
  const normalized = normalizeTeamAssetKey(value);
  if (!normalized) return [];
  const compact = normalized
    .replace(/\b(real|rcd|rc|cd|cf|ca|sd|ud|fc|club|de|del|la|el)\b/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const aliases = [normalized];
  if (compact && !AMBIGUOUS_COMPACT_CREST_ALIASES.has(compact)) aliases.push(compact);
  return Array.from(new Set(aliases.filter(Boolean)));
}

let historicalCrestManifestPromise = null;
let historicalCrestAliasIndex = null;

function getHistoricalCrestCandidate(keys) {
  const tmKey = keys.find((key) => /^tm-team-\d+$/.test(String(key)));
  if (tmKey) return `/historical-db/crests/${tmKey}.png`;
  const numericTmKey = keys.find((key) => /^\d+$/.test(String(key)));
  if (numericTmKey) return `/historical-db/crests/tm-team-${numericTmKey}.png`;
  return null;
}

function buildHistoricalCrestAliasKeys(value) {
  const aliases = teamNameAliases(value);
  const normalized = normalizeTeamAssetKey(value);
  return Array.from(new Set([normalized, ...aliases].filter(Boolean)));
}

async function getHistoricalCrestAliasIndex() {
  if (historicalCrestAliasIndex) return historicalCrestAliasIndex;
  if (!historicalCrestManifestPromise) {
    historicalCrestManifestPromise = fetch('/historical-db/crests/manifest.json', { cache: 'force-cache' })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
  }

  const manifest = await historicalCrestManifestPromise;
  const index = new Map();
  for (const crest of Object.values(manifest?.crests || {})) {
    if (crest?.status !== 'ready' || !crest.publicPath) continue;
    const values = [
      crest.id,
      crest.transfermarktId,
      ...(Array.isArray(crest.names) ? crest.names : []),
      ...(Array.isArray(crest.slugs) ? crest.slugs : [])
    ];
    for (const value of values) {
      for (const key of buildHistoricalCrestAliasKeys(value)) {
        if (!index.has(key)) index.set(key, crest.publicPath);
      }
    }
  }
  historicalCrestAliasIndex = index;
  return historicalCrestAliasIndex;
}

async function getHistoricalCrestFromManifest(keys) {
  const index = await getHistoricalCrestAliasIndex();
  for (const key of keys) {
    for (const alias of buildHistoricalCrestAliasKeys(key)) {
      const publicPath = index.get(alias);
      if (publicPath) return publicPath;
    }
  }
  return null;
}

export default function TeamCrest({ team = null, teamId, teamName = '', teamSlug = '', lookupKeys = [], seed = '', size = 40, className = '', priority = false }) {
  const editionId = getActiveEditionId();
  const resolvedTeamId = teamId || team?.id || team?.teamId;
  const resolvedTeamName = teamName || team?.displayName || team?.publicName || team?.name || team?.teamName || '';
  const resolvedTeamSlug = teamSlug || team?.slug || '';
  const resolvedLookupKeys = lookupKeys?.length ? lookupKeys : (team?.crestLookupKeys || team?.identity?.crestLookupKeys || []);
  const resolvedSeed = seed || team?.crestSeed || team?.identity?.crestSeed || '';
  const identityKeys = useMemo(() => Array.from(new Set([
    resolvedTeamId,
    resolvedTeamName,
    resolvedTeamSlug,
    ...(Array.isArray(resolvedLookupKeys) ? resolvedLookupKeys : []),
    normalizeTeamAssetKey(resolvedTeamId),
    normalizeTeamAssetKey(resolvedTeamName),
    normalizeTeamAssetKey(resolvedTeamSlug),
    ...teamNameAliases(resolvedTeamId),
    ...teamNameAliases(resolvedTeamName),
    ...teamNameAliases(resolvedTeamSlug)
  ].filter(Boolean))), [resolvedTeamId, resolvedTeamName, resolvedTeamSlug, resolvedLookupKeys]);
  const normalizedTeamKey = normalizeTeamAssetKey(identityKeys[0] || resolvedTeamId);
  const [officialCrestUrl, setOfficialCrestUrl] = useState(() => {
    const cachedAsset = identityKeys.map((key) => getCachedEditionTeamAsset(editionId, key)).find(Boolean);
    const cachedUrl = getOfficialCrestUrlFromAsset(cachedAsset);
    return isCrestImageReady(cachedUrl) ? cachedUrl : null;
  });
  const [historicalCrestUrl, setHistoricalCrestUrl] = useState(null);

  const { primary, secondary, pattern } = useMemo(() => {
    const colors = teamColors[resolvedTeamId];
    if (colors) {
      return {
        primary: colors.primary,
        secondary: colors.secondary,
        pattern: colors.pattern || 'solid',
      };
    }
    const h = hashCode(resolvedSeed || resolvedTeamId || resolvedTeamName || 'unknown');
    return {
      primary: FALLBACK_COLORS[h % FALLBACK_COLORS.length],
      secondary: '#fff',
      pattern: PATTERNS[h % PATTERNS.length],
    };
  }, [resolvedTeamId, resolvedTeamName, resolvedSeed]);

  useEffect(() => {
    let cancelled = false;

    async function loadOfficialCrest() {
      if (!editionId || !normalizedTeamKey) {
        setOfficialCrestUrl(null);
        return;
      }

      for (const key of identityKeys) {
        const nextUrl = await getEditionCrestUrl(editionId, key);
        if (!nextUrl) continue;

        if (isCrestImageReady(nextUrl)) {
          if (!cancelled) setOfficialCrestUrl(nextUrl);
          return;
        }

        const loaded = await preloadCrestImage(nextUrl);
        if (loaded) {
          if (!cancelled) setOfficialCrestUrl(nextUrl);
          return;
        }
      }

      if (!cancelled) setOfficialCrestUrl(null);
    }

    loadOfficialCrest();

    return () => {
      cancelled = true;
    };
  }, [editionId, normalizedTeamKey, resolvedTeamId, identityKeys]);

  useEffect(() => {
    let cancelled = false;
    const candidate = getHistoricalCrestCandidate(identityKeys);

    async function loadHistoricalCrest() {
      if (candidate) {
        if (isCrestImageReady(candidate)) {
          setHistoricalCrestUrl(candidate);
          return;
        }
        const loaded = await preloadCrestImage(candidate);
        if (loaded) {
          if (!cancelled) setHistoricalCrestUrl(candidate);
          return;
        }
      }

      const manifestCandidate = await getHistoricalCrestFromManifest(identityKeys);
      if (!manifestCandidate) {
        if (!cancelled) setHistoricalCrestUrl(null);
        return;
      }
      if (isCrestImageReady(manifestCandidate)) {
        if (!cancelled) setHistoricalCrestUrl(manifestCandidate);
        return;
      }
      const loadedFromManifest = await preloadCrestImage(manifestCandidate);
      if (!cancelled) setHistoricalCrestUrl(loadedFromManifest ? manifestCandidate : null);
    }

    loadHistoricalCrest();

    return () => {
      cancelled = true;
    };
  }, [identityKeys]);

  if (officialCrestUrl || historicalCrestUrl) {
    return (
      <img
        src={officialCrestUrl || historicalCrestUrl}
        alt={resolvedTeamName || resolvedTeamId}
        width={size}
        height={size}
        className={`team-crest ${officialCrestUrl ? 'team-crest--official' : 'team-crest--historical'} ${className}`.trim()}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onError={() => {
          if (officialCrestUrl) setOfficialCrestUrl(null);
          if (historicalCrestUrl) setHistoricalCrestUrl(null);
        }}
      />
    );
  }

  const safeTeamId = (resolvedTeamId || resolvedTeamName || 'unknown').replace(/[^a-zA-Z0-9-]/g, '_');
  const clipId = `shield-clip-${safeTeamId}`;
  const gradientId = `shield-grad-${safeTeamId}`;

  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size}
      className={`team-crest team-crest--generated ${className}`.trim()}
      aria-label={resolvedTeamName || resolvedTeamId}
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
