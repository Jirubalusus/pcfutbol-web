import React from 'react';
import './TeamBadge.scss';

// Simple team badge component with colors
export default function TeamBadge({ team, size = 'md' }) {
  const name = team?.shortName || team?.name?.slice(0, 3) || '???';
  const primary = team?.colors?.primary || '#333';
  const secondary = team?.colors?.secondary || '#fff';
  
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 44,
    lg: 60,
    xl: 80
  };

  const dimension = sizeMap[size] || sizeMap.md;

  return (
    <div 
      className={`team-badge team-badge--${size}`}
      style={{
        width: dimension,
        height: dimension,
        background: `linear-gradient(135deg, ${primary}, ${adjustColor(primary, -20)})`,
        color: secondary
      }}
    >
      <span className="team-badge__text">{name}</span>
    </div>
  );
}

// Darken/lighten color helper
function adjustColor(color, amount) {
  if (!color || color === 'transparent') return color;
  
  // Handle hex colors
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    const num = parseInt(hex, 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }
  
  return color;
}

// Country flag component
export function CountryFlag({ country, size = 'md' }) {
  const flags = {
    spain: '🇪🇸',
    england: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    germany: '🇩🇪',
    italy: '🇮🇹',
    france: '🇫🇷',
    netherlands: '🇳🇱',
    portugal: '🇵🇹',
    // Default
    default: '🏳️'
  };

  const sizeMap = {
    xs: '1rem',
    sm: '1.25rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem'
  };

  return (
    <span 
      className="country-flag"
      style={{ fontSize: sizeMap[size] || sizeMap.md }}
    >
      {flags[country] || flags.default}
    </span>
  );
}

// League badge component
export function LeagueBadge({ leagueId, showName = true }) {
  const leagues = {
    laliga: { name: 'La Liga', icon: '🇪🇸', color: '#ff4b44' },
    segunda: { name: 'Segunda', icon: '🇪🇸', color: '#1e5631' },
    premierLeague: { name: 'Premier League', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#38003c' },
    ligue1: { name: 'Ligue 1', icon: '🇫🇷', color: '#091c3e' },
    bundesliga: { name: 'Bundesliga', icon: '🇩🇪', color: '#d20515' },
    serieA: { name: 'Serie A', icon: '🇮🇹', color: '#024494' },
    eredivisie: { name: 'Eredivisie', icon: '🇳🇱', color: '#ff4500' },
    primeiraLiga: { name: 'Liga Portugal', icon: '🇵🇹', color: '#00843d' }
  };

  const league = leagues[leagueId] || { name: leagueId, icon: '🏆', color: '#666' };

  return (
    <div className="league-badge" style={{ '--league-color': league.color }}>
      <span className="league-badge__icon">{league.icon}</span>
      {showName && <span className="league-badge__name">{league.name}</span>}
    </div>
  );
}
