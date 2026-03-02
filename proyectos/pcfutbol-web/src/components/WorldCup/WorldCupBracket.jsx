import React from 'react';
import { useTranslation } from 'react-i18next';
import FlagIcon from './FlagIcon';
import './WorldCupBracket.scss';

const TrophySVG = () => (
  <svg className="wc-trophy-svg" viewBox="0 0 100 140" width="90" height="126" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tGold" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="20%" stopColor="#fde68a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="75%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="tGoldDark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#92400e" />
      </linearGradient>
      <linearGradient id="tShine" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
      <linearGradient id="tGlobe" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="tBase" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6d4c0e" />
        <stop offset="100%" stopColor="#3d2a06" />
      </linearGradient>
      <filter id="tGlow">
        <feGaussianBlur stdDeviation="4" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    {/* Globe at top */}
    <circle cx="50" cy="18" r="12" fill="url(#tGlobe)" filter="url(#tGlow)" />
    <ellipse cx="50" cy="18" rx="12" ry="5" fill="none" stroke="#b45309" strokeWidth="0.8" opacity="0.5" />
    <line x1="50" y1="6" x2="50" y2="30" stroke="#b45309" strokeWidth="0.6" opacity="0.4" />
    <ellipse cx="50" cy="18" rx="5" ry="12" fill="none" stroke="#b45309" strokeWidth="0.6" opacity="0.4" />
    {/* Globe shine */}
    <ellipse cx="45" cy="14" rx="5" ry="6" fill="url(#tShine)" opacity="0.5" />

    {/* Left figure - stylized athlete */}
    <path d="M38 30 C34 32, 30 40, 28 52 C26 60, 30 68, 34 72 L38 72 C36 66, 35 60, 36 54 C37 48, 39 40, 42 34 Z" fill="url(#tGold)" />
    {/* Left arm reaching up to globe */}
    <path d="M38 30 C36 28, 38 24, 40 22" fill="none" stroke="url(#tGold)" strokeWidth="3" strokeLinecap="round" />

    {/* Right figure - stylized athlete */}
    <path d="M62 30 C66 32, 70 40, 72 52 C74 60, 70 68, 66 72 L62 72 C64 66, 65 60, 64 54 C63 48, 61 40, 58 34 Z" fill="url(#tGold)" />
    {/* Right arm reaching up to globe */}
    <path d="M62 30 C64 28, 62 24, 60 22" fill="none" stroke="url(#tGold)" strokeWidth="3" strokeLinecap="round" />

    {/* Central column / body connection */}
    <path d="M42 34 C44 42, 44 55, 42 65 L42 72 L58 72 L58 65 C56 55, 56 42, 58 34 Z" fill="url(#tGold)" />

    {/* Shine on central body */}
    <path d="M44 36 C45 44, 45 56, 44 66 L44 72 L50 72 L50 66 C49 56, 49 44, 50 36 Z" fill="url(#tShine)" opacity="0.3" />

    {/* Waist narrowing */}
    <path d="M36 72 L36 78 C36 82, 42 84, 50 84 C58 84, 64 82, 64 78 L64 72 Z" fill="url(#tGoldDark)" />

    {/* Stem */}
    <rect x="46" y="84" width="8" height="12" rx="1" fill="url(#tGoldDark)" />

    {/* Base - two tiers */}
    <path d="M32 96 L32 102 C32 104, 36 106, 50 106 C64 106, 68 104, 68 102 L68 96 C68 95, 64 94, 50 94 C36 94, 32 95, 32 96 Z" fill="url(#tGoldDark)" />
    <ellipse cx="50" cy="96" rx="18" ry="3" fill="url(#tGold)" />

    {/* Bottom base plate */}
    <path d="M26 106 L26 114 C26 116, 34 118, 50 118 C66 118, 74 116, 74 114 L74 106 C74 105, 66 104, 50 104 C34 104, 26 105, 26 106 Z" fill="url(#tBase)" />
    <ellipse cx="50" cy="106" rx="24" ry="3.5" fill="url(#tGoldDark)" />

    {/* Malachite green band on base */}
    <rect x="28" y="109" width="44" height="4" rx="1" fill="#166534" opacity="0.6" />

    {/* Base text */}
    <text x="50" y="126" textAnchor="middle" fontSize="6" fill="#fde68a" fontWeight="700" fontFamily="sans-serif" letterSpacing="1.5" opacity="0.8">FIFA</text>
    <text x="50" y="134" textAnchor="middle" fontSize="4.5" fill="#d4a574" fontWeight="600" fontFamily="sans-serif" letterSpacing="0.8" opacity="0.6">WORLD CUP</text>
  </svg>
);

export default function WorldCupBracket({ bracket, playerTeamId, teams }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'es';

  const teamMap = {};
  (teams || []).forEach(t => { teamMap[t.id] = t; });
  const getTeam = (id) => teamMap[id] || { flag: '🏳️', name: id || '?', nameEs: id || '?' };
  const displayName = (t) => {
    const name = lang === 'es' ? (t.nameEs || t.name) : t.name;
    return name?.length > 12 ? name.slice(0, 10) + '…' : name;
  };

  const renderMatch = (match, idx, isFinal = false) => {
    if (!match) return <div key={idx} className={`wc-bracket__match wc-bracket__match--empty ${isFinal ? 'wc-bracket__match--final' : ''}`}>TBD</div>;

    const home = getTeam(match.home);
    const away = getTeam(match.away);
    const isPlayerHome = match.home === playerTeamId;
    const isPlayerAway = match.away === playerTeamId;

    return (
      <div key={idx} className={`wc-bracket__match ${isFinal ? 'wc-bracket__match--final' : ''}`}>
        <div className={`wc-bracket__team ${isPlayerHome ? 'wc-bracket__team--player' : ''} ${match.played && match.winner === match.home ? 'wc-bracket__team--winner' : ''}`}>
          <span className="wc-bracket__flag"><FlagIcon teamId={home.id} size={isFinal ? 20 : 16} /></span>
          <span className="wc-bracket__name">{displayName(home)}</span>
          {match.played && <span className="wc-bracket__score">{match.homeScore}</span>}
        </div>
        <div className={`wc-bracket__team ${isPlayerAway ? 'wc-bracket__team--player' : ''} ${match.played && match.winner === match.away ? 'wc-bracket__team--winner' : ''}`}>
          <span className="wc-bracket__flag"><FlagIcon teamId={away.id} size={isFinal ? 20 : 16} /></span>
          <span className="wc-bracket__name">{displayName(away)}</span>
          {match.played && <span className="wc-bracket__score">{match.awayScore}</span>}
        </div>
        {!match.played && <span className="wc-bracket__vs">vs</span>}
        {match.penalties && <span className="wc-bracket__pen">pen {match.penalties.home}-{match.penalties.away}</span>}
      </div>
    );
  };

  // Split R16 into left/right (4 each)
  const r16Left = (bracket.round16 || []).slice(0, 4);
  const r16Right = (bracket.round16 || []).slice(4, 8);
  const qfLeft = (bracket.quarters || []).slice(0, 2);
  const qfRight = (bracket.quarters || []).slice(2, 4);
  const sfLeft = (bracket.semis || []).slice(0, 1);
  const sfRight = (bracket.semis || []).slice(1, 2);
  const finalMatch = (bracket.final || []).slice(0, 1);

  return (
    <div className="wc-bracket">
      <div className="wc-bracket__scroll">
        {/* Left side */}
        <div className="wc-bracket__side wc-bracket__side--left">
          <div className="wc-bracket__column">
            <div className="wc-bracket__round-label">R16</div>
            <div className="wc-bracket__round wc-bracket__round--r16">
              {r16Left.map((m, i) => (
                <div key={i} className="wc-bracket__match-wrapper">{renderMatch(m, i)}</div>
              ))}
            </div>
          </div>
          <div className="wc-bracket__column">
            <div className="wc-bracket__round-label">Cuartos</div>
            <div className="wc-bracket__round wc-bracket__round--qf">
              {qfLeft.map((m, i) => (
                <div key={i} className="wc-bracket__match-wrapper">{renderMatch(m, i)}</div>
              ))}
            </div>
          </div>
          <div className="wc-bracket__column">
            <div className="wc-bracket__round-label">Semis</div>
            <div className="wc-bracket__round wc-bracket__round--sf">
              {sfLeft.map((m, i) => (
                <div key={i} className="wc-bracket__match-wrapper">{renderMatch(m, i)}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Final + Trophy */}
        <div className="wc-bracket__center">
          <div className="wc-bracket__round-label wc-bracket__round-label--final">Final</div>
          <TrophySVG />
          {finalMatch.map((m, i) => renderMatch(m, i, true))}
        </div>

        {/* Right side — mirrored: Semis closest to center, R16 at far right */}
        <div className="wc-bracket__side wc-bracket__side--right">
          <div className="wc-bracket__column">
            <div className="wc-bracket__round-label">Semis</div>
            <div className="wc-bracket__round wc-bracket__round--sf">
              {sfRight.map((m, i) => (
                <div key={i} className="wc-bracket__match-wrapper">{renderMatch(m, i)}</div>
              ))}
            </div>
          </div>
          <div className="wc-bracket__column">
            <div className="wc-bracket__round-label">Cuartos</div>
            <div className="wc-bracket__round wc-bracket__round--qf">
              {qfRight.map((m, i) => (
                <div key={i} className="wc-bracket__match-wrapper">{renderMatch(m, i)}</div>
              ))}
            </div>
          </div>
          <div className="wc-bracket__column">
            <div className="wc-bracket__round-label">R16</div>
            <div className="wc-bracket__round wc-bracket__round--r16">
              {r16Right.map((m, i) => (
                <div key={i} className="wc-bracket__match-wrapper">{renderMatch(m, i)}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
