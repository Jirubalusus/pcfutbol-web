import React from 'react';

const CATEGORY_COLORS = {
  press: '#f59e0b',
  camp: '#22c55e',
  scandal: '#ef4444',
  federation: '#6366f1',
  tactical: '#14b8a6',
  weather: '#64748b',
  personal: '#f472b6',
  wildcard: '#a855f7',
  chain: '#fb923c',
};

// Press Conference: Full scene with table, microphones, manager, cameras, spotlights
export function PressIllustration() {
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" fill="none">
      <defs>
        <linearGradient id="press-backdrop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#0f0f1a" />
        </linearGradient>
        <linearGradient id="press-table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c4310" />
          <stop offset="100%" stopColor="#3d2b0a" />
        </linearGradient>
        <linearGradient id="press-spot1" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="press-spot2" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Backdrop wall */}
      <rect x="15" y="10" width="170" height="110" rx="4" fill="url(#press-backdrop)" />
      {/* Logo panels on backdrop */}
      <rect x="30" y="20" width="30" height="20" rx="3" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.8" opacity="0.5" />
      <rect x="85" y="20" width="30" height="20" rx="3" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.8" opacity="0.5" />
      <rect x="140" y="20" width="30" height="20" rx="3" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.8" opacity="0.5" />
      <text x="45" y="34" textAnchor="middle" fontSize="7" fill="#f59e0b" opacity="0.7" fontFamily="sans-serif" fontWeight="700">FIFA</text>
      <text x="100" y="34" textAnchor="middle" fontSize="7" fill="#f59e0b" opacity="0.7" fontFamily="sans-serif" fontWeight="700">WC</text>
      <text x="155" y="34" textAnchor="middle" fontSize="7" fill="#f59e0b" opacity="0.7" fontFamily="sans-serif" fontWeight="700">2026</text>
      {/* Spotlight beams from above */}
      <polygon points="70,0 55,80 85,80" fill="url(#press-spot1)" opacity="0.3" />
      <polygon points="130,0 115,80 145,80" fill="url(#press-spot2)" opacity="0.25" />
      <polygon points="100,0 90,70 110,70" fill="url(#press-spot1)" opacity="0.2" />
      {/* Long table */}
      <rect x="20" y="100" width="160" height="14" rx="3" fill="url(#press-table)" />
      <rect x="22" y="102" width="156" height="3" rx="1.5" fill="#f59e0b" opacity="0.4" />
      {/* Table cloth front */}
      <rect x="20" y="114" width="160" height="30" rx="0" fill="#2a2118" />
      <rect x="20" y="114" width="160" height="2" fill="#5c4310" />
      {/* Manager - center figure */}
      <rect x="85" y="62" width="30" height="38" rx="5" fill="#334155" />
      <rect x="88" y="64" width="24" height="10" rx="3" fill="#475569" />
      <circle cx="100" cy="52" r="13" fill="#d4a574" />
      <ellipse cx="100" cy="46" rx="10" ry="5" fill="#1e293b" />
      <circle cx="96" cy="52" r="1.5" fill="#1e293b" />
      <circle cx="104" cy="52" r="1.5" fill="#1e293b" />
      <path d="M96 57 Q100 60 104 57" stroke="#1e293b" strokeWidth="1" fill="none" />
      {/* Manager arms on table */}
      <rect x="78" y="90" width="18" height="10" rx="4" fill="#334155" />
      <rect x="104" y="90" width="18" height="10" rx="4" fill="#334155" />
      {/* Hands */}
      <ellipse cx="80" cy="98" rx="5" ry="4" fill="#d4a574" />
      <ellipse cx="120" cy="98" rx="5" ry="4" fill="#d4a574" />
      {/* Microphone 1 - gold */}
      <line x1="60" y1="88" x2="60" y2="102" stroke="#94a3b8" strokeWidth="2.5" />
      <circle cx="60" cy="85" r="5" fill="#f59e0b" />
      <circle cx="60" cy="85" r="3" fill="#fbbf24" />
      {/* Microphone 2 - silver */}
      <line x1="80" y1="86" x2="80" y2="102" stroke="#94a3b8" strokeWidth="2.5" />
      <circle cx="80" cy="83" r="5" fill="#64748b" />
      <circle cx="80" cy="83" r="3" fill="#94a3b8" />
      {/* Microphone 3 - red */}
      <line x1="120" y1="86" x2="120" y2="102" stroke="#94a3b8" strokeWidth="2.5" />
      <circle cx="120" cy="83" r="5" fill="#ef4444" />
      <circle cx="120" cy="83" r="3" fill="#f87171" />
      {/* Microphone 4 - blue */}
      <line x1="140" y1="88" x2="140" y2="102" stroke="#94a3b8" strokeWidth="2.5" />
      <circle cx="140" cy="85" r="5" fill="#3b82f6" />
      <circle cx="140" cy="85" r="3" fill="#60a5fa" />
      {/* Water bottle and nameplate on table */}
      <rect x="92" y="96" width="16" height="5" rx="1" fill="#1e293b" />
      <text x="100" y="100" textAnchor="middle" fontSize="4" fill="#f59e0b" fontFamily="sans-serif">MISTER</text>
      <rect x="145" y="95" width="5" height="8" rx="2" fill="#60a5fa" opacity="0.6" />
      {/* Camera crew silhouettes in foreground */}
      {/* Camera person left */}
      <circle cx="30" cy="160" r="8" fill="#1e293b" />
      <rect x="22" y="168" width="16" height="20" rx="4" fill="#1e293b" />
      <rect x="35" y="155" width="18" height="12" rx="3" fill="#334155" />
      <circle cx="44" cy="160" r="3" fill="#475569" />
      <circle cx="44" cy="160" r="1.5" fill="#ef4444" opacity="0.8" />
      {/* Camera person right */}
      <circle cx="170" cy="158" r="8" fill="#1e293b" />
      <rect x="162" y="166" width="16" height="22" rx="4" fill="#1e293b" />
      <rect x="148" y="153" width="18" height="12" rx="3" fill="#334155" />
      <circle cx="157" cy="158" r="3" fill="#475569" />
      <circle cx="157" cy="158" r="1.5" fill="#ef4444" opacity="0.8" />
      {/* Seated journalist silhouettes */}
      <circle cx="70" cy="162" r="6" fill="#1e293b" opacity="0.7" />
      <rect x="64" y="168" width="12" height="16" rx="3" fill="#1e293b" opacity="0.7" />
      <circle cx="100" cy="165" r="6" fill="#1e293b" opacity="0.6" />
      <rect x="94" y="171" width="12" height="14" rx="3" fill="#1e293b" opacity="0.6" />
      <circle cx="130" cy="162" r="6" fill="#1e293b" opacity="0.7" />
      <rect x="124" y="168" width="12" height="16" rx="3" fill="#1e293b" opacity="0.7" />
      {/* Camera flashes */}
      <circle cx="70" cy="155" r="4" fill="#f59e0b" opacity="0.6" />
      <circle cx="130" cy="155" r="3" fill="#fbbf24" opacity="0.5" />
    </svg>
  );
}

// Training Camp: Bird's eye view of training pitch
export function CampIllustration() {
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" fill="none">
      <defs>
        <linearGradient id="camp-grass1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#166534" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="camp-grass2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14532d" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
      </defs>
      {/* Full pitch background */}
      <rect x="5" y="5" width="190" height="190" rx="6" fill="#14532d" />
      {/* Mowing pattern stripes */}
      {[0,1,2,3,4,5,6,7,8,9,10,11,12].map((i) => (
        <rect key={i} x="5" y={5 + i * 15} width="190" height="15" fill={i % 2 === 0 ? '#166534' : '#15803d'} opacity="0.7" />
      ))}
      {/* Pitch border lines */}
      <rect x="15" y="15" width="170" height="170" rx="2" stroke="#22c55e" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Center line */}
      <line x1="15" y1="100" x2="185" y2="100" stroke="#22c55e" strokeWidth="1.2" opacity="0.5" />
      {/* Center circle */}
      <circle cx="100" cy="100" r="22" stroke="#22c55e" strokeWidth="1.2" fill="none" opacity="0.4" />
      <circle cx="100" cy="100" r="2" fill="#22c55e" opacity="0.5" />
      {/* Penalty areas */}
      <rect x="55" y="15" width="90" height="35" stroke="#22c55e" strokeWidth="1" fill="none" opacity="0.3" />
      <rect x="55" y="150" width="90" height="35" stroke="#22c55e" strokeWidth="1" fill="none" opacity="0.3" />
      {/* Goal areas */}
      <rect x="75" y="15" width="50" height="15" stroke="#22c55e" strokeWidth="0.8" fill="none" opacity="0.25" />
      <rect x="75" y="170" width="50" height="15" stroke="#22c55e" strokeWidth="0.8" fill="none" opacity="0.25" />
      {/* Corner flags */}
      <line x1="15" y1="15" x2="15" y2="8" stroke="#94a3b8" strokeWidth="1.5" />
      <polygon points="15,8 24,5 15,2" fill="#ef4444" />
      <line x1="185" y1="15" x2="185" y2="8" stroke="#94a3b8" strokeWidth="1.5" />
      <polygon points="185,8 176,5 185,2" fill="#ef4444" />
      <line x1="15" y1="185" x2="15" y2="192" stroke="#94a3b8" strokeWidth="1.5" />
      <polygon points="15,192 24,195 15,198" fill="#f59e0b" />
      <line x1="185" y1="185" x2="185" y2="192" stroke="#94a3b8" strokeWidth="1.5" />
      <polygon points="185,192 176,195 185,198" fill="#f59e0b" />
      {/* Training cones - zigzag pattern */}
      <polygon points="50,70 47,78 53,78" fill="#f59e0b" />
      <polygon points="70,85 67,93 73,93" fill="#f59e0b" />
      <polygon points="90,70 87,78 93,78" fill="#ef4444" />
      <polygon points="110,85 107,93 113,93" fill="#ef4444" />
      <polygon points="130,70 127,78 133,78" fill="#f59e0b" />
      <polygon points="150,85 147,93 153,93" fill="#ef4444" />
      {/* Dotted drill path through cones */}
      <path d="M50,74 L70,89 L90,74 L110,89 L130,74 L150,89" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 3" fill="none" opacity="0.5" />
      {/* Player silhouettes running */}
      <circle cx="55" cy="110" r="5" fill="#1e293b" opacity="0.8" />
      <rect x="51" y="115" width="8" height="12" rx="2" fill="#1e293b" opacity="0.8" />
      <line x1="53" y1="127" x2="50" y2="135" stroke="#1e293b" strokeWidth="2" opacity="0.8" />
      <line x1="57" y1="127" x2="60" y2="135" stroke="#1e293b" strokeWidth="2" opacity="0.8" />

      <circle cx="80" cy="115" r="5" fill="#1e293b" opacity="0.7" />
      <rect x="76" y="120" width="8" height="12" rx="2" fill="#1e293b" opacity="0.7" />
      <line x1="78" y1="132" x2="75" y2="140" stroke="#1e293b" strokeWidth="2" opacity="0.7" />
      <line x1="82" y1="132" x2="85" y2="140" stroke="#1e293b" strokeWidth="2" opacity="0.7" />

      <circle cx="110" cy="108" r="5" fill="#1e293b" opacity="0.8" />
      <rect x="106" y="113" width="8" height="12" rx="2" fill="#1e293b" opacity="0.8" />
      <line x1="108" y1="125" x2="105" y2="133" stroke="#1e293b" strokeWidth="2" opacity="0.8" />
      <line x1="112" y1="125" x2="115" y2="133" stroke="#1e293b" strokeWidth="2" opacity="0.8" />

      <circle cx="140" cy="118" r="5" fill="#1e293b" opacity="0.7" />
      <rect x="136" y="123" width="8" height="12" rx="2" fill="#1e293b" opacity="0.7" />
      <line x1="138" y1="135" x2="135" y2="143" stroke="#1e293b" strokeWidth="2" opacity="0.7" />
      <line x1="142" y1="135" x2="145" y2="143" stroke="#1e293b" strokeWidth="2" opacity="0.7" />

      <circle cx="160" cy="112" r="5" fill="#1e293b" opacity="0.75" />
      <rect x="156" y="117" width="8" height="12" rx="2" fill="#1e293b" opacity="0.75" />
      {/* Coach with clipboard on side */}
      <circle cx="30" cy="130" r="6" fill="#475569" />
      <rect x="24" y="136" width="12" height="16" rx="3" fill="#475569" />
      <rect x="34" y="133" width="8" height="11" rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
      <line x1="36" y1="137" x2="40" y2="137" stroke="#94a3b8" strokeWidth="0.6" />
      <line x1="36" y1="139" x2="40" y2="139" stroke="#94a3b8" strokeWidth="0.6" />
      <line x1="36" y1="141" x2="39" y2="141" stroke="#94a3b8" strokeWidth="0.6" />
      {/* Footballs scattered */}
      <circle cx="100" cy="145" r="5" fill="white" stroke="#1e293b" strokeWidth="0.5" />
      <path d="M100 140 L98 143 L100 145 L102 143Z" fill="#1e293b" />
      <circle cx="65" cy="155" r="4" fill="white" stroke="#1e293b" strokeWidth="0.5" />
    </svg>
  );
}

// Scandal: Tabloid newspaper with paparazzi
export function ScandalIllustration() {
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" fill="none">
      <defs>
        <linearGradient id="scandal-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <filter id="scandal-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="3" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>
      {/* Torn/crumpled newspaper background - slightly rotated */}
      <g transform="rotate(-5 100 100)" filter="url(#scandal-shadow)">
        {/* Main newspaper */}
        <rect x="25" y="15" width="150" height="170" rx="3" fill="url(#scandal-paper)" />
        {/* Torn edge effect - right side */}
        <path d="M175 15 L177 25 L174 35 L178 50 L173 65 L177 80 L174 95 L178 110 L173 125 L177 140 L174 155 L178 170 L175 185" stroke="#cbd5e1" strokeWidth="1" fill="url(#scandal-paper)" />
        {/* Red header banner */}
        <rect x="25" y="15" width="150" height="35" rx="3" fill="#ef4444" />
        <rect x="25" y="47" width="150" height="3" fill="#dc2626" />
        {/* SCANDAL header */}
        <text x="100" y="40" textAnchor="middle" fontSize="18" fontWeight="900" fill="white" fontFamily="sans-serif" letterSpacing="2">SCANDAL</text>
        {/* Subheadline */}
        <rect x="35" y="55" width="130" height="4" rx="2" fill="#1e293b" opacity="0.8" />
        <rect x="45" y="62" width="110" height="3" rx="1.5" fill="#64748b" opacity="0.5" />
        {/* Photo area with player silhouette */}
        <rect x="35" y="72" width="60" height="55" rx="3" fill="#cbd5e1" />
        <circle cx="65" cy="88" r="12" fill="#94a3b8" />
        <rect x="55" y="100" width="20" height="22" rx="4" fill="#94a3b8" />
        {/* Red X over photo */}
        <line x1="38" y1="75" x2="92" y2="124" stroke="#ef4444" strokeWidth="3" opacity="0.6" />
        <line x1="92" y1="75" x2="38" y2="124" stroke="#ef4444" strokeWidth="3" opacity="0.6" />
        {/* Article text lines */}
        <rect x="105" y="75" width="60" height="3" rx="1.5" fill="#475569" opacity="0.6" />
        <rect x="105" y="82" width="55" height="3" rx="1.5" fill="#475569" opacity="0.5" />
        <rect x="105" y="89" width="58" height="3" rx="1.5" fill="#475569" opacity="0.4" />
        <rect x="105" y="96" width="50" height="3" rx="1.5" fill="#475569" opacity="0.4" />
        <rect x="105" y="103" width="55" height="3" rx="1.5" fill="#475569" opacity="0.35" />
        <rect x="105" y="110" width="48" height="3" rx="1.5" fill="#475569" opacity="0.3" />
        <rect x="105" y="117" width="52" height="3" rx="1.5" fill="#475569" opacity="0.3" />
        {/* More article below photo */}
        <rect x="35" y="132" width="130" height="3" rx="1.5" fill="#475569" opacity="0.4" />
        <rect x="35" y="139" width="125" height="3" rx="1.5" fill="#475569" opacity="0.35" />
        <rect x="35" y="146" width="128" height="3" rx="1.5" fill="#475569" opacity="0.3" />
        <rect x="35" y="153" width="115" height="3" rx="1.5" fill="#475569" opacity="0.25" />
        <rect x="35" y="160" width="120" height="3" rx="1.5" fill="#475569" opacity="0.25" />
        <rect x="35" y="167" width="100" height="3" rx="1.5" fill="#475569" opacity="0.2" />
      </g>
      {/* Paparazzi camera with flash - top right */}
      <rect x="155" y="5" width="30" height="22" rx="4" fill="#334155" />
      <circle cx="170" cy="16" r="8" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      <circle cx="170" cy="16" r="5" fill="#64748b" />
      <circle cx="170" cy="16" r="2" fill="#94a3b8" />
      <rect x="162" y="4" width="8" height="5" rx="1" fill="#475569" />
      {/* Flash burst */}
      <circle cx="155" cy="8" r="12" fill="#fbbf24" opacity="0.5" />
      <circle cx="155" cy="8" r="6" fill="white" opacity="0.7" />
      <line x1="155" y1="-5" x2="155" y2="0" stroke="#fbbf24" strokeWidth="2.5" opacity="0.6" />
      <line x1="142" y1="5" x2="145" y2="7" stroke="#fbbf24" strokeWidth="2" opacity="0.5" />
      <line x1="143" y1="15" x2="147" y2="13" stroke="#fbbf24" strokeWidth="2" opacity="0.4" />
      <line x1="155" y1="21" x2="155" y2="25" stroke="#fbbf24" strokeWidth="2" opacity="0.4" />
      {/* Social media icons floating */}
      {/* Twitter/X */}
      <circle cx="15" cy="50" r="10" fill="#1e293b" opacity="0.7" />
      <text x="15" y="54" textAnchor="middle" fontSize="11" fill="#60a5fa" fontWeight="700" fontFamily="sans-serif">𝕏</text>
      {/* Instagram */}
      <rect x="5" y="90" width="18" height="18" rx="5" fill="#1e293b" opacity="0.6" />
      <circle cx="14" cy="99" r="5" stroke="#e879f9" strokeWidth="1.5" fill="none" opacity="0.7" />
      <circle cx="14" cy="99" r="1.5" fill="#e879f9" opacity="0.7" />
      {/* Exclamation marks */}
      <text x="10" y="145" fontSize="22" fontWeight="900" fill="#ef4444" opacity="0.4" fontFamily="sans-serif">!</text>
      <text x="190" y="170" fontSize="18" fontWeight="900" fill="#ef4444" opacity="0.35" fontFamily="sans-serif">!</text>
      <text x="185" y="50" fontSize="14" fontWeight="900" fill="#ef4444" opacity="0.3" fontFamily="sans-serif">?!</text>
    </svg>
  );
}

// Federation: Imposing boardroom scene
export function FederationIllustration() {
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" fill="none">
      <defs>
        <linearGradient id="fed-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>
        <linearGradient id="fed-table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#44403c" />
          <stop offset="100%" stopColor="#292524" />
        </linearGradient>
        <linearGradient id="fed-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Room walls */}
      <rect x="5" y="5" width="190" height="120" fill="url(#fed-wall)" />
      {/* Floor */}
      <rect x="5" y="125" width="190" height="70" fill="#1c1917" />
      {/* Wainscoting / wood panels */}
      <rect x="5" y="85" width="190" height="40" fill="#292524" />
      <line x1="50" y1="85" x2="50" y2="125" stroke="#3f3f46" strokeWidth="0.8" />
      <line x1="100" y1="85" x2="100" y2="125" stroke="#3f3f46" strokeWidth="0.8" />
      <line x1="150" y1="85" x2="150" y2="125" stroke="#3f3f46" strokeWidth="0.8" />
      {/* Federation crest on wall */}
      <path d="M100 18 L118 28 L118 52 Q118 62 100 70 Q82 62 82 52 L82 28 Z" fill="#4338ca" stroke="#6366f1" strokeWidth="2" />
      <path d="M100 24 L114 32 L114 50 Q114 58 100 64 Q86 58 86 50 L86 32 Z" fill="#4f46e5" />
      <text x="100" y="48" textAnchor="middle" fontSize="12" fontWeight="800" fill="white" fontFamily="sans-serif">FIFA</text>
      <circle cx="100" cy="38" r="3" fill="#fbbf24" />
      {/* Chandelier-like light */}
      <line x1="100" y1="5" x2="100" y2="12" stroke="#a5b4fc" strokeWidth="1" />
      <ellipse cx="100" cy="14" rx="15" ry="3" fill="#a5b4fc" opacity="0.3" />
      {/* Light glow */}
      <ellipse cx="100" cy="14" rx="40" ry="20" fill="url(#fed-shine)" />
      {/* Long polished boardroom table */}
      <ellipse cx="100" cy="145" rx="85" ry="20" fill="url(#fed-table)" />
      <ellipse cx="100" cy="143" rx="82" ry="18" fill="#3f3f46" opacity="0.3" />
      {/* Table reflection line */}
      <ellipse cx="100" cy="142" rx="60" ry="5" fill="#6366f1" opacity="0.08" />
      {/* High-backed chairs */}
      {[30, 55, 80, 120, 145, 170].map((x, i) => (
        <g key={i}>
          <rect x={x-8} y={118 + (i < 3 ? 0 : 8)} width="16" height="22" rx="3" fill="#292524" stroke="#3f3f46" strokeWidth="0.8" />
          <rect x={x-6} y={120 + (i < 3 ? 0 : 8)} width="12" height="5" rx="2" fill="#1c1917" />
        </g>
      ))}
      {/* Chairs on far side */}
      {[60, 100, 140].map((x, i) => (
        <g key={`far${i}`}>
          <rect x={x-6} y="128" width="12" height="14" rx="2" fill="#1c1917" opacity="0.6" />
        </g>
      ))}
      {/* Nameplate on table */}
      <rect x="85" y="148" width="30" height="7" rx="1" fill="#1e293b" />
      <rect x="87" y="149" width="26" height="5" rx="1" fill="#334155" />
      {/* Stack of documents */}
      <rect x="130" y="140" width="14" height="2" rx="0.5" fill="#f8fafc" opacity="0.7" />
      <rect x="131" y="138" width="14" height="2" rx="0.5" fill="#e2e8f0" opacity="0.6" />
      <rect x="130" y="136" width="14" height="2" rx="0.5" fill="#f1f5f9" opacity="0.5" />
      {/* Pen */}
      <rect x="150" y="143" width="2" height="12" rx="1" fill="#1e293b" transform="rotate(-25 151 149)" />
      {/* Water glasses */}
      <rect x="60" y="141" width="5" height="7" rx="1" fill="#dbeafe" opacity="0.4" />
      <rect x="155" y="143" width="5" height="7" rx="1" fill="#dbeafe" opacity="0.3" />
      {/* Stars decorative */}
      <circle cx="25" cy="30" r="2" fill="#fbbf24" opacity="0.5" />
      <circle cx="175" cy="25" r="1.5" fill="#fbbf24" opacity="0.4" />
      <circle cx="20" cy="60" r="1.5" fill="#a5b4fc" opacity="0.3" />
      <circle cx="180" cy="55" r="1.5" fill="#a5b4fc" opacity="0.3" />
    </svg>
  );
}

// Tactical: Coach's tactical board with 4-3-3 formation
export function TacticalIllustration() {
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" fill="none">
      <defs>
        <linearGradient id="tac-board" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="tac-pitch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#166534" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>
      </defs>
      {/* Whiteboard frame */}
      <rect x="10" y="8" width="180" height="140" rx="6" fill="url(#tac-board)" stroke="#334155" strokeWidth="3" />
      {/* Board aluminum trim */}
      <rect x="10" y="8" width="180" height="6" rx="3" fill="#475569" />
      {/* Green pitch on board */}
      <rect x="18" y="20" width="164" height="120" rx="3" fill="url(#tac-pitch)" />
      {/* Pitch markings */}
      <rect x="22" y="24" width="156" height="112" stroke="#22c55e" strokeWidth="1" fill="none" opacity="0.4" />
      <line x1="100" y1="24" x2="100" y2="136" stroke="#22c55e" strokeWidth="0.8" opacity="0.35" />
      <circle cx="100" cy="80" r="14" stroke="#22c55e" strokeWidth="0.8" fill="none" opacity="0.3" />
      {/* Penalty areas */}
      <rect x="55" y="24" width="90" height="25" stroke="#22c55e" strokeWidth="0.8" fill="none" opacity="0.3" />
      <rect x="55" y="111" width="90" height="25" stroke="#22c55e" strokeWidth="0.8" fill="none" opacity="0.3" />
      {/* 4-3-3 Formation - BLUE team (circles with numbers) */}
      {/* GK */}
      <circle cx="100" cy="130" r="7" fill="#3b82f6" stroke="#60a5fa" strokeWidth="1.5" />
      <text x="100" y="133" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">1</text>
      {/* Defenders - 4 */}
      <circle cx="45" cy="108" r="7" fill="#3b82f6" stroke="#60a5fa" strokeWidth="1.5" />
      <text x="45" y="111" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">2</text>
      <circle cx="75" cy="108" r="7" fill="#3b82f6" stroke="#60a5fa" strokeWidth="1.5" />
      <text x="75" y="111" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">4</text>
      <circle cx="125" cy="108" r="7" fill="#3b82f6" stroke="#60a5fa" strokeWidth="1.5" />
      <text x="125" y="111" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">5</text>
      <circle cx="155" cy="108" r="7" fill="#3b82f6" stroke="#60a5fa" strokeWidth="1.5" />
      <text x="155" y="111" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">3</text>
      {/* Midfielders - 3 */}
      <circle cx="60" cy="80" r="7" fill="#14b8a6" stroke="#2dd4bf" strokeWidth="1.5" />
      <text x="60" y="83" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">8</text>
      <circle cx="100" cy="80" r="7" fill="#14b8a6" stroke="#2dd4bf" strokeWidth="1.5" />
      <text x="100" y="83" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">6</text>
      <circle cx="140" cy="80" r="7" fill="#14b8a6" stroke="#2dd4bf" strokeWidth="1.5" />
      <text x="140" y="83" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">10</text>
      {/* Forwards - 3 */}
      <circle cx="45" cy="48" r="7" fill="#ef4444" stroke="#f87171" strokeWidth="1.5" />
      <text x="45" y="51" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">11</text>
      <circle cx="100" cy="40" r="7" fill="#ef4444" stroke="#f87171" strokeWidth="1.5" />
      <text x="100" y="43" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">9</text>
      <circle cx="155" cy="48" r="7" fill="#ef4444" stroke="#f87171" strokeWidth="1.5" />
      <text x="155" y="51" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">7</text>
      {/* Tactical arrows - dotted movement lines */}
      <path d="M60 73 L75 58 L90 45" stroke="white" strokeWidth="1.5" strokeDasharray="4 2" fill="none" opacity="0.6" />
      <polygon points="90,45 86,50 92,50" fill="white" opacity="0.6" />
      <path d="M140 73 L130 60 L115 48" stroke="white" strokeWidth="1.5" strokeDasharray="4 2" fill="none" opacity="0.6" />
      <polygon points="115,48 119,53 113,52" fill="white" opacity="0.6" />
      <path d="M100 73 L100 50" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 2" fill="none" opacity="0.5" />
      <polygon points="100,50 97,55 103,55" fill="#fbbf24" opacity="0.5" />
      {/* Curved attacking run */}
      <path d="M45 41 Q65 25 100 33" stroke="#f87171" strokeWidth="1.2" strokeDasharray="3 2" fill="none" opacity="0.4" />
      {/* Magnifying glass over area */}
      <circle cx="148" cy="52" r="18" stroke="#fbbf24" strokeWidth="2.5" fill="#fbbf24" fillOpacity="0.08" />
      <line x1="161" y1="65" x2="172" y2="76" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
      {/* Board stand/tray */}
      <rect x="20" y="148" width="160" height="6" rx="2" fill="#475569" />
      {/* Markers on tray */}
      <rect x="40" y="149" width="20" height="4" rx="2" fill="#ef4444" />
      <rect x="65" y="149" width="20" height="4" rx="2" fill="#3b82f6" />
      <rect x="90" y="149" width="20" height="4" rx="2" fill="#22c55e" />
      {/* Board stand legs */}
      <rect x="60" y="154" width="4" height="40" rx="1" fill="#64748b" />
      <rect x="136" y="154" width="4" height="40" rx="1" fill="#64748b" />
      <rect x="40" y="190" width="120" height="5" rx="2" fill="#475569" />
      {/* Eraser */}
      <rect x="145" y="149" width="12" height="4" rx="1" fill="#f8fafc" />
    </svg>
  );
}

// Weather: Dramatic stormy stadium
export function WeatherIllustration() {
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" fill="none">
      <defs>
        <linearGradient id="storm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="storm-pitch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14532d" />
          <stop offset="100%" stopColor="#1a3a2a" />
        </linearGradient>
        <linearGradient id="storm-reflect" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Dark stormy sky */}
      <rect x="0" y="0" width="200" height="130" fill="url(#storm-sky)" />
      {/* Stadium silhouette - left stand */}
      <path d="M0 130 L0 60 L10 55 L20 50 L30 46 L40 43 L50 42 L55 70 L50 130 Z" fill="#1e293b" />
      {/* Stadium silhouette - right stand */}
      <path d="M200 130 L200 60 L190 55 L180 50 L170 46 L160 43 L150 42 L145 70 L150 130 Z" fill="#1e293b" />
      {/* Stadium back stand */}
      <path d="M50 42 L55 30 L65 25 L80 22 L100 20 L120 22 L135 25 L145 30 L150 42 L145 70 L55 70 Z" fill="#0f172a" />
      {/* Stadium rows suggestion */}
      <line x1="55" y1="35" x2="145" y2="35" stroke="#334155" strokeWidth="0.8" opacity="0.4" />
      <line x1="52" y1="45" x2="148" y2="45" stroke="#334155" strokeWidth="0.8" opacity="0.4" />
      <line x1="50" y1="55" x2="150" y2="55" stroke="#334155" strokeWidth="0.8" opacity="0.3" />
      <line x1="50" y1="65" x2="150" y2="65" stroke="#334155" strokeWidth="0.8" opacity="0.3" />
      {/* Floodlights - left */}
      <rect x="38" y="15" width="4" height="30" fill="#475569" />
      <rect x="32" y="10" width="16" height="8" rx="2" fill="#64748b" />
      <circle cx="36" cy="14" r="2.5" fill="#fbbf24" opacity="0.9" />
      <circle cx="44" cy="14" r="2.5" fill="#fbbf24" opacity="0.9" />
      <circle cx="40" cy="12" r="2" fill="#fef3c7" opacity="0.7" />
      {/* Light beams from left */}
      <polygon points="36,18 10,130 60,130" fill="#fbbf24" opacity="0.04" />
      {/* Floodlights - right */}
      <rect x="158" y="15" width="4" height="30" fill="#475569" />
      <rect x="152" y="10" width="16" height="8" rx="2" fill="#64748b" />
      <circle cx="156" cy="14" r="2.5" fill="#fbbf24" opacity="0.9" />
      <circle cx="164" cy="14" r="2.5" fill="#fbbf24" opacity="0.9" />
      <circle cx="160" cy="12" r="2" fill="#fef3c7" opacity="0.7" />
      {/* Light beams from right */}
      <polygon points="164,18 140,130 190,130" fill="#fbbf24" opacity="0.04" />
      {/* Pitch */}
      <rect x="0" y="130" width="200" height="70" fill="url(#storm-pitch)" />
      {/* Waterlogged reflections */}
      <ellipse cx="60" cy="155" rx="25" ry="6" fill="url(#storm-reflect)" />
      <ellipse cx="140" cy="160" rx="20" ry="5" fill="url(#storm-reflect)" />
      <ellipse cx="100" cy="170" rx="30" ry="7" fill="url(#storm-reflect)" />
      {/* Pitch lines barely visible */}
      <line x1="100" y1="130" x2="100" y2="200" stroke="#22c55e" strokeWidth="0.8" opacity="0.15" />
      {/* Heavy rain - many angled lines */}
      {[15,25,35,45,55,65,75,85,95,105,115,125,135,145,155,165,175,185].map((x, i) => (
        <line key={`r1${i}`} x1={x} y1={10 + (i % 5) * 8} x2={x - 8} y2={40 + (i % 5) * 8} stroke="#60a5fa" strokeWidth="1.2" opacity="0.35" />
      ))}
      {[10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,190].map((x, i) => (
        <line key={`r2${i}`} x1={x} y1={35 + (i % 4) * 10} x2={x - 8} y2={65 + (i % 4) * 10} stroke="#60a5fa" strokeWidth="1" opacity="0.25" />
      ))}
      {[12,22,38,52,68,82,98,112,128,142,158,172,188].map((x, i) => (
        <line key={`r3${i}`} x1={x} y1={60 + (i % 3) * 12} x2={x - 8} y2={90 + (i % 3) * 12} stroke="#60a5fa" strokeWidth="0.8" opacity="0.2" />
      ))}
      {[18,35,55,75,95,115,135,155,175].map((x, i) => (
        <line key={`r4${i}`} x1={x} y1={90 + (i % 4) * 8} x2={x - 6} y2={115 + (i % 4) * 8} stroke="#60a5fa" strokeWidth="0.8" opacity="0.15" />
      ))}
      {/* Lightning bolt */}
      <path d="M120 5 L112 35 L122 35 L108 65 L118 65 L100 100" stroke="#fbbf24" strokeWidth="3" fill="none" opacity="0.8" />
      <path d="M120 5 L112 35 L122 35 L108 65 L118 65 L100 100" stroke="white" strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Lightning glow */}
      <circle cx="110" cy="50" r="20" fill="#fbbf24" opacity="0.06" />
      {/* Wind-blown corner flag */}
      <line x1="15" y1="130" x2="15" y2="115" stroke="#94a3b8" strokeWidth="2" />
      <path d="M15 115 Q25 112 22 118 Q30 115 25 122 L15 122 Z" fill="#ef4444" />
      {/* Clouds */}
      <ellipse cx="50" cy="15" rx="30" ry="12" fill="#334155" opacity="0.6" />
      <ellipse cx="150" cy="12" rx="35" ry="14" fill="#334155" opacity="0.5" />
      <ellipse cx="100" cy="8" rx="25" ry="10" fill="#475569" opacity="0.4" />
    </svg>
  );
}

// Personal: Player sitting alone on bench in empty stadium
export function PersonalIllustration() {
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" fill="none">
      <defs>
        <linearGradient id="pers-spot" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#f472b6" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Dark stadium background */}
      <rect x="0" y="0" width="200" height="200" fill="#0f172a" />
      {/* Empty seats rows behind - subtle */}
      {[20, 30, 40, 50, 60].map((y, row) => (
        <g key={row}>
          {[15,28,41,54,67,80,93,106,119,132,145,158,171,184].map((x, i) => (
            <rect key={`s${row}${i}`} x={x} y={y} width="10" height="7" rx="2" fill="#1e293b" opacity={0.3 - row * 0.02} />
          ))}
        </g>
      ))}
      {/* Spotlight cone from above */}
      <polygon points="100,0 65,160 135,160" fill="url(#pers-spot)" />
      {/* Spotlight source */}
      <circle cx="100" cy="5" r="4" fill="#f472b6" opacity="0.5" />
      <circle cx="100" cy="5" r="2" fill="white" opacity="0.6" />
      {/* Bench */}
      <rect x="55" y="130" width="90" height="6" rx="2" fill="#475569" />
      <rect x="60" y="136" width="6" height="20" rx="1" fill="#64748b" />
      <rect x="134" y="136" width="6" height="20" rx="1" fill="#64748b" />
      {/* Bench support bar */}
      <rect x="58" y="150" width="84" height="3" rx="1" fill="#334155" />
      {/* Player sitting - head in hands */}
      {/* Body/torso */}
      <rect x="88" y="105" width="24" height="28" rx="5" fill="#334155" />
      {/* Jersey number */}
      <text x="100" y="124" textAnchor="middle" fontSize="14" fontWeight="800" fill="#f472b6" opacity="0.3" fontFamily="sans-serif">10</text>
      {/* Legs sitting on bench */}
      <rect x="90" y="130" width="8" height="18" rx="3" fill="#1e293b" />
      <rect x="102" y="130" width="8" height="18" rx="3" fill="#1e293b" />
      {/* Feet */}
      <rect x="88" y="146" width="12" height="5" rx="2" fill="#1e293b" />
      <rect x="100" y="146" width="12" height="5" rx="2" fill="#1e293b" />
      {/* Arms going up to head */}
      <rect x="84" y="95" width="8" height="20" rx="3" fill="#334155" transform="rotate(10 88 105)" />
      <rect x="108" y="95" width="8" height="20" rx="3" fill="#334155" transform="rotate(-10 112 105)" />
      {/* Head - bowed down, hands covering */}
      <circle cx="100" cy="92" r="13" fill="#d4a574" />
      {/* Hair */}
      <ellipse cx="100" cy="84" rx="11" ry="6" fill="#1e293b" />
      {/* Hands on face */}
      <ellipse cx="93" cy="92" rx="5" ry="6" fill="#d4a574" />
      <ellipse cx="107" cy="92" rx="5" ry="6" fill="#d4a574" />
      {/* Fingers suggesting covering face */}
      <line x1="90" y1="88" x2="90" y2="96" stroke="#c9956a" strokeWidth="1.5" />
      <line x1="93" y1="87" x2="93" y2="97" stroke="#c9956a" strokeWidth="1.5" />
      <line x1="107" y1="87" x2="107" y2="97" stroke="#c9956a" strokeWidth="1.5" />
      <line x1="110" y1="88" x2="110" y2="96" stroke="#c9956a" strokeWidth="1.5" />
      {/* Scattered boots nearby */}
      <path d="M50 152 L55 148 L62 148 L65 152 L62 155 L55 155 Z" fill="#1e293b" />
      <path d="M55 149 L58 152" stroke="#475569" strokeWidth="0.8" />
      <path d="M140 150 L148 147 L153 150 L150 155 L143 155 Z" fill="#1e293b" />
      {/* Ball nearby */}
      <circle cx="155" cy="165" r="7" fill="white" opacity="0.6" />
      <path d="M155 158 L153 161 L155 163 L157 161Z" fill="#1e293b" opacity="0.6" />
      <path d="M148 165 L152 163 L152 167Z" fill="#1e293b" opacity="0.6" />
      {/* Tear drops */}
      <ellipse cx="95" cy="100" rx="1.5" ry="2" fill="#60a5fa" opacity="0.5" />
      <ellipse cx="105" cy="102" rx="1.5" ry="2" fill="#60a5fa" opacity="0.4" />
      {/* Towel draped on bench */}
      <path d="M120 128 Q125 126 130 128 L130 134 Q125 136 120 134 Z" fill="#f8fafc" opacity="0.4" />
    </svg>
  );
}

// Wildcard: Slot machine with reels
export function WildcardIllustration() {
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" fill="none">
      <defs>
        <linearGradient id="wild-machine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#581c87" />
        </linearGradient>
        <linearGradient id="wild-neon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#e879f9" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <filter id="wild-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Confetti background */}
      <rect x="18" y="10" width="8" height="4" rx="1" fill="#f59e0b" opacity="0.5" transform="rotate(30 22 12)" />
      <rect x="170" y="15" width="8" height="4" rx="1" fill="#ef4444" opacity="0.5" transform="rotate(-20 174 17)" />
      <rect x="45" y="5" width="6" height="3" rx="1" fill="#22c55e" opacity="0.4" transform="rotate(45 48 7)" />
      <rect x="155" y="3" width="7" height="3" rx="1" fill="#3b82f6" opacity="0.4" transform="rotate(-35 159 5)" />
      <rect x="80" y="2" width="6" height="3" rx="1" fill="#f472b6" opacity="0.5" transform="rotate(15 83 4)" />
      <rect x="130" y="8" width="8" height="3" rx="1" fill="#fbbf24" opacity="0.4" transform="rotate(-45 134 10)" />
      <circle cx="30" cy="30" r="3" fill="#e879f9" opacity="0.3" />
      <circle cx="175" cy="40" r="2" fill="#fbbf24" opacity="0.4" />
      <circle cx="15" cy="100" r="2.5" fill="#22c55e" opacity="0.3" />
      <circle cx="188" cy="90" r="2" fill="#ef4444" opacity="0.3" />
      {/* Slot machine body */}
      <rect x="30" y="25" width="140" height="145" rx="10" fill="url(#wild-machine)" />
      <rect x="30" y="25" width="140" height="145" rx="10" stroke="#a855f7" strokeWidth="2" fill="none" opacity="0.5" />
      {/* Neon top sign */}
      <rect x="45" y="18" width="110" height="22" rx="8" fill="#581c87" stroke="url(#wild-neon)" strokeWidth="2" filter="url(#wild-glow)" />
      <text x="100" y="34" textAnchor="middle" fontSize="13" fontWeight="900" fill="#e879f9" fontFamily="sans-serif">★ LUCKY ★</text>
      {/* Reel window */}
      <rect x="42" y="55" width="116" height="65" rx="6" fill="#0f172a" stroke="#6d28d9" strokeWidth="1.5" />
      {/* Reel dividers */}
      <line x1="80" y1="55" x2="80" y2="120" stroke="#6d28d9" strokeWidth="1" opacity="0.5" />
      <line x1="120" y1="55" x2="120" y2="120" stroke="#6d28d9" strokeWidth="1" opacity="0.5" />
      {/* Reel 1 - Football */}
      <circle cx="61" cy="87" r="14" fill="white" />
      <path d="M61 73 L58 78 L61 82 L64 78Z" fill="#1e293b" />
      <path d="M47 87 L53 83 L53 91Z" fill="#1e293b" />
      <path d="M75 87 L69 83 L69 91Z" fill="#1e293b" />
      <path d="M56 98 L59 94 L61 98 L58 101Z" fill="#1e293b" />
      <path d="M66 98 L63 94 L61 98 L64 101Z" fill="#1e293b" />
      {/* Reel 2 - Trophy */}
      <rect x="92" y="78" width="16" height="4" rx="1" fill="#fbbf24" />
      <path d="M95 78 L95 72 Q100 66 105 72 L105 78Z" fill="#fbbf24" />
      <path d="M89 73 Q86 76 89 78 L95 78 L95 73Z" fill="#f59e0b" />
      <path d="M111 73 Q114 76 111 78 L105 78 L105 73Z" fill="#f59e0b" />
      <rect x="96" y="82" width="8" height="6" rx="1" fill="#f59e0b" />
      <rect x="93" y="88" width="14" height="4" rx="1" fill="#fbbf24" />
      <text x="100" y="102" textAnchor="middle" fontSize="6" fill="#fbbf24" opacity="0.6" fontFamily="sans-serif">MVP</text>
      {/* Reel 3 - Card (yellow) */}
      <rect x="130" y="72" width="20" height="28" rx="2" fill="#fbbf24" />
      <rect x="132" y="74" width="16" height="24" rx="1" stroke="#f59e0b" strokeWidth="1" fill="none" />
      <text x="140" y="92" textAnchor="middle" fontSize="16" fontWeight="900" fill="#f59e0b" fontFamily="sans-serif">!</text>
      {/* Win line */}
      <line x1="42" y1="87" x2="158" y2="87" stroke="#e879f9" strokeWidth="2" strokeDasharray="4 2" opacity="0.6" />
      {/* Question marks */}
      <text x="50" y="52" fontSize="10" fontWeight="700" fill="#a855f7" opacity="0.5" fontFamily="sans-serif">?</text>
      <text x="145" y="52" fontSize="10" fontWeight="700" fill="#a855f7" opacity="0.5" fontFamily="sans-serif">?</text>
      {/* Lever */}
      <rect x="172" y="65" width="8" height="50" rx="3" fill="#64748b" />
      <circle cx="176" cy="62" r="8" fill="#ef4444" stroke="#dc2626" strokeWidth="2" />
      <circle cx="176" cy="62" r="4" fill="#f87171" />
      {/* Coin slot */}
      <rect x="90" y="130" width="20" height="4" rx="2" fill="#1e293b" stroke="#6d28d9" strokeWidth="0.8" />
      {/* Payout tray */}
      <rect x="55" y="145" width="90" height="15" rx="4" fill="#4c1d95" />
      <rect x="58" y="147" width="84" height="11" rx="3" fill="#0f172a" />
      {/* Coins in tray */}
      <circle cx="75" cy="153" r="4" fill="#fbbf24" opacity="0.7" />
      <circle cx="85" cy="152" r="4" fill="#fbbf24" opacity="0.6" />
      <circle cx="95" cy="153" r="4" fill="#fbbf24" opacity="0.7" />
      <circle cx="105" cy="152" r="4" fill="#fbbf24" opacity="0.5" />
      <circle cx="115" cy="153" r="4" fill="#fbbf24" opacity="0.6" />
      {/* Stars and sparkles around */}
      <polygon points="20,60 22,55 24,60 29,60 25,63 26,68 22,65 18,68 19,63 15,60" fill="#fbbf24" opacity="0.7" />
      <polygon points="180,130 181.5,127 183,130 186,130 183.5,132 184,135 181.5,133 179,135 179.5,132 177,130" fill="#fbbf24" opacity="0.5" />
      <polygon points="15,155 16.5,152 18,155 21,155 18.5,157 19,160 16.5,158 14,160 14.5,157 12,155" fill="#e879f9" opacity="0.4" />
      {/* Sparkle crosses */}
      <line x1="35" y1="45" x2="35" y2="55" stroke="#e9d5ff" strokeWidth="1.5" opacity="0.5" />
      <line x1="30" y1="50" x2="40" y2="50" stroke="#e9d5ff" strokeWidth="1.5" opacity="0.5" />
      <line x1="170" y1="150" x2="170" y2="158" stroke="#e9d5ff" strokeWidth="1" opacity="0.4" />
      <line x1="166" y1="154" x2="174" y2="154" stroke="#e9d5ff" strokeWidth="1" opacity="0.4" />
      {/* Bottom decorative */}
      <rect x="50" y="175" width="100" height="8" rx="4" fill="#581c87" opacity="0.5" />
      <text x="100" y="182" textAnchor="middle" fontSize="6" fontWeight="700" fill="#e879f9" opacity="0.4" fontFamily="sans-serif">INSERT COIN</text>
    </svg>
  );
}

// Chain: Dominoes falling in sequence
export function ChainIllustration() {
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" fill="none">
      <defs>
        <linearGradient id="chain-dom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="chain-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1917" />
          <stop offset="100%" stopColor="#0c0a09" />
        </linearGradient>
        <filter id="chain-shadow">
          <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Dark background floor */}
      <rect x="0" y="120" width="200" height="80" fill="url(#chain-floor)" />
      <rect x="0" y="0" width="200" height="120" fill="#1e1e2e" />
      {/* Perspective floor line */}
      <line x1="0" y1="120" x2="200" y2="120" stroke="#fb923c" strokeWidth="1" opacity="0.2" />
      {/* Ripple effect on floor */}
      <ellipse cx="100" cy="160" rx="80" ry="15" stroke="#fb923c" strokeWidth="1" fill="none" opacity="0.1" />
      <ellipse cx="100" cy="160" rx="60" ry="10" stroke="#fb923c" strokeWidth="0.8" fill="none" opacity="0.15" />
      {/* Domino 1 - fallen flat */}
      <g transform="rotate(-80 25 120)" filter="url(#chain-shadow)">
        <rect x="15" y="60" width="20" height="60" rx="3" fill="url(#chain-dom)" stroke="#94a3b8" strokeWidth="1" />
        <line x1="15" y1="90" x2="35" y2="90" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="25" cy="75" r="5" fill="white" stroke="#fb923c" strokeWidth="1.5" />
        <circle cx="25" cy="75" r="2" fill="#fb923c" />
        <circle cx="22" cy="100" r="2" fill="#334155" />
        <circle cx="28" cy="105" r="2" fill="#334155" />
      </g>
      {/* Domino 2 - very tilted */}
      <g transform="rotate(-55 60 120)" filter="url(#chain-shadow)">
        <rect x="50" y="50" width="20" height="70" rx="3" fill="url(#chain-dom)" stroke="#94a3b8" strokeWidth="1" />
        <line x1="50" y1="85" x2="70" y2="85" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="60" cy="68" r="5" fill="white" stroke="#fb923c" strokeWidth="1.5" />
        <circle cx="60" cy="68" r="2" fill="#fb923c" />
        <circle cx="55" cy="95" r="2" fill="#334155" />
        <circle cx="60" cy="100" r="2" fill="#334155" />
        <circle cx="65" cy="95" r="2" fill="#334155" />
      </g>
      {/* Domino 3 - tilting */}
      <g transform="rotate(-30 100 120)" filter="url(#chain-shadow)">
        <rect x="90" y="40" width="20" height="80" rx="3" fill="url(#chain-dom)" stroke="#94a3b8" strokeWidth="1" />
        <line x1="90" y1="80" x2="110" y2="80" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="100" cy="60" r="5" fill="white" stroke="#fb923c" strokeWidth="1.5" />
        <circle cx="100" cy="60" r="2" fill="#fb923c" />
        <circle cx="95" cy="90" r="2" fill="#334155" />
        <circle cx="100" cy="95" r="2" fill="#334155" />
        <circle cx="105" cy="90" r="2" fill="#334155" />
        <circle cx="100" cy="100" r="2" fill="#334155" />
      </g>
      {/* Domino 4 - slightly tilting */}
      <g transform="rotate(-10 140 120)" filter="url(#chain-shadow)">
        <rect x="130" y="35" width="20" height="85" rx="3" fill="url(#chain-dom)" stroke="#94a3b8" strokeWidth="1" />
        <line x1="130" y1="77" x2="150" y2="77" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="140" cy="56" r="5" fill="white" stroke="#fb923c" strokeWidth="1.5" />
        <circle cx="140" cy="56" r="2" fill="#fb923c" />
        <circle cx="135" cy="87" r="2" fill="#334155" />
        <circle cx="140" cy="92" r="2" fill="#334155" />
        <circle cx="145" cy="87" r="2" fill="#334155" />
        <circle cx="135" cy="100" r="2" fill="#334155" />
        <circle cx="145" cy="100" r="2" fill="#334155" />
      </g>
      {/* Domino 5 - still standing */}
      <g filter="url(#chain-shadow)">
        <rect x="168" y="30" width="22" height="90" rx="3" fill="url(#chain-dom)" stroke="#94a3b8" strokeWidth="1" />
        <line x1="168" y1="75" x2="190" y2="75" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="179" cy="52" r="5" fill="white" stroke="#fb923c" strokeWidth="1.5" />
        <circle cx="179" cy="52" r="2" fill="#fb923c" />
        <circle cx="174" cy="85" r="2" fill="#334155" />
        <circle cx="179" cy="90" r="2" fill="#334155" />
        <circle cx="184" cy="85" r="2" fill="#334155" />
        <circle cx="174" cy="98" r="2" fill="#334155" />
        <circle cx="179" cy="103" r="2" fill="#334155" />
        <circle cx="184" cy="98" r="2" fill="#334155" />
      </g>
      {/* Impact arrows connecting dominoes */}
      <path d="M38 100 Q48 95 50 85" stroke="#fb923c" strokeWidth="2" fill="none" opacity="0.6" />
      <polygon points="50,85 47,90 52,89" fill="#fb923c" opacity="0.6" />
      <path d="M75 95 Q85 88 88 75" stroke="#fb923c" strokeWidth="2" fill="none" opacity="0.5" />
      <polygon points="88,75 85,80 90,79" fill="#fb923c" opacity="0.5" />
      <path d="M115 80 Q125 70 128 60" stroke="#fb923c" strokeWidth="2" fill="none" opacity="0.4" />
      <polygon points="128,60 125,65 130,64" fill="#fb923c" opacity="0.4" />
      <path d="M153 65 Q160 55 166 48" stroke="#fb923c" strokeWidth="2" strokeDasharray="3 2" fill="none" opacity="0.3" />
      <polygon points="166,48 163,53 168,52" fill="#fb923c" opacity="0.3" />
      {/* Impact motion lines at first domino */}
      <line x1="5" y1="90" x2="12" y2="95" stroke="#fb923c" strokeWidth="1.5" opacity="0.5" />
      <line x1="3" y1="100" x2="10" y2="102" stroke="#fb923c" strokeWidth="1.5" opacity="0.4" />
      <line x1="5" y1="110" x2="12" y2="108" stroke="#fb923c" strokeWidth="1.5" opacity="0.3" />
      {/* Football icons on domino tops (the circle on each) are already the football */}
      {/* Sparkle effects at impact points */}
      <circle cx="45" cy="90" r="3" fill="#fb923c" opacity="0.4" />
      <circle cx="82" cy="78" r="2.5" fill="#fb923c" opacity="0.35" />
      <circle cx="122" cy="65" r="2" fill="#fb923c" opacity="0.3" />
      {/* Text label */}
      <text x="100" y="185" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fb923c" opacity="0.3" fontFamily="sans-serif" letterSpacing="4">CHAIN REACTION</text>
    </svg>
  );
}

const ILLUSTRATIONS = {
  press: PressIllustration,
  camp: CampIllustration,
  scandal: ScandalIllustration,
  federation: FederationIllustration,
  tactical: TacticalIllustration,
  weather: WeatherIllustration,
  personal: PersonalIllustration,
  wildcard: WildcardIllustration,
  chain: ChainIllustration,
};

export default function EventIllustration({ category, size = 180 }) {
  const Comp = ILLUSTRATIONS[category];
  if (!Comp) return null;
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Comp />
    </div>
  );
}

export { CATEGORY_COLORS };
