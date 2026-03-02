import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XCircle, RotateCcw } from 'lucide-react';
import { WORLD_CUP_UI_I18N } from '../../data/worldCupEventsI18n';
import FlagIcon from './FlagIcon';
import './WorldCupResult.scss';

const WorldCupTrophy = () => (
  <svg viewBox="0 0 120 170" width="150" height="210" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rGold" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#fef3c7" /><stop offset="15%" stopColor="#fde68a" />
        <stop offset="45%" stopColor="#f59e0b" /><stop offset="70%" stopColor="#d97706" /><stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="rGoldDark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d97706" /><stop offset="100%" stopColor="#92400e" />
      </linearGradient>
      <linearGradient id="rShine" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.5)" /><stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
      <linearGradient id="rGlobe" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="#fef3c7" /><stop offset="40%" stopColor="#fde68a" /><stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="rBase" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#78530d" /><stop offset="100%" stopColor="#3d2a06" />
      </linearGradient>
      <linearGradient id="rSkin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <filter id="rGlow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>

    {/* Globe on top */}
    <circle cx="60" cy="16" r="13" fill="url(#rGlobe)" filter="url(#rGlow)" />
    <ellipse cx="60" cy="16" rx="13" ry="5.5" fill="none" stroke="#b45309" strokeWidth="0.6" opacity="0.4" />
    <line x1="60" y1="3" x2="60" y2="29" stroke="#b45309" strokeWidth="0.5" opacity="0.35" />
    <ellipse cx="60" cy="16" rx="5.5" ry="13" fill="none" stroke="#b45309" strokeWidth="0.5" opacity="0.35" />
    <path d="M52 8 Q56 6, 60 8 Q56 10, 52 8" fill="none" stroke="#b45309" strokeWidth="0.4" opacity="0.25" />
    <ellipse cx="55" cy="12" rx="5" ry="6" fill="url(#rShine)" opacity="0.4" />

    {/* Left figure — human holding globe */}
    <circle cx="44" cy="34" r="4" fill="url(#rSkin)" /> {/* head */}
    <path d="M44 38 L44 58" stroke="url(#rGold)" strokeWidth="3.5" strokeLinecap="round" /> {/* body */}
    <path d="M44 42 L36 36 L40 28" stroke="url(#rGold)" strokeWidth="2.5" strokeLinecap="round" fill="none" /> {/* left arm up */}
    <path d="M44 42 L50 50" stroke="url(#rGold)" strokeWidth="2.5" strokeLinecap="round" fill="none" /> {/* right arm */}
    <path d="M44 58 L38 70" stroke="url(#rGold)" strokeWidth="2.5" strokeLinecap="round" fill="none" /> {/* left leg */}
    <path d="M44 58 L50 70" stroke="url(#rGold)" strokeWidth="2.5" strokeLinecap="round" fill="none" /> {/* right leg */}

    {/* Right figure — human holding globe */}
    <circle cx="76" cy="34" r="4" fill="url(#rSkin)" /> {/* head */}
    <path d="M76 38 L76 58" stroke="url(#rGold)" strokeWidth="3.5" strokeLinecap="round" /> {/* body */}
    <path d="M76 42 L84 36 L80 28" stroke="url(#rGold)" strokeWidth="2.5" strokeLinecap="round" fill="none" /> {/* right arm up */}
    <path d="M76 42 L70 50" stroke="url(#rGold)" strokeWidth="2.5" strokeLinecap="round" fill="none" /> {/* left arm */}
    <path d="M76 58 L70 70" stroke="url(#rGold)" strokeWidth="2.5" strokeLinecap="round" fill="none" /> {/* left leg */}
    <path d="M76 58 L82 70" stroke="url(#rGold)" strokeWidth="2.5" strokeLinecap="round" fill="none" /> {/* right leg */}

    {/* Central column / cup body */}
    <path d="M52 70 C52 62, 54 55, 56 50 L56 45 L64 45 L64 50 C66 55, 68 62, 68 70 Z" fill="url(#rGold)" />
    <path d="M54 70 C54 63, 55 56, 57 51 L57 46 L60 46 L60 51 C59 56, 58 63, 58 70 Z" fill="url(#rShine)" opacity="0.25" />

    {/* Collar ring */}
    <ellipse cx="60" cy="70" rx="10" ry="3" fill="url(#rGoldDark)" />
    <ellipse cx="60" cy="69" rx="10" ry="3" fill="url(#rGold)" />

    {/* Stem */}
    <rect x="56" y="73" width="8" height="16" rx="1.5" fill="url(#rGoldDark)" />
    <rect x="57" y="73" width="3" height="16" rx="1" fill="url(#rShine)" opacity="0.15" />

    {/* Upper base disc */}
    <ellipse cx="60" cy="92" rx="16" ry="4" fill="url(#rGoldDark)" />
    <ellipse cx="60" cy="90" rx="16" ry="4" fill="url(#rGold)" />

    {/* Decorative band */}
    <path d="M40 94 L40 100 Q40 103, 60 103 Q80 103, 80 100 L80 94 Q80 97, 60 97 Q40 97, 40 94 Z" fill="url(#rGoldDark)" />

    {/* Lower base */}
    <path d="M34 103 L34 112 Q34 116, 60 116 Q86 116, 86 112 L86 103 Q86 107, 60 107 Q34 107, 34 103 Z" fill="url(#rBase)" />
    <ellipse cx="60" cy="103" rx="26" ry="4.5" fill="url(#rGoldDark)" />

    {/* Base plate */}
    <path d="M30 116 L30 124 Q30 128, 60 128 Q90 128, 90 124 L90 116 Q90 120, 60 120 Q30 120, 30 116 Z" fill="url(#rBase)" />
    <ellipse cx="60" cy="116" rx="30" ry="5" fill="url(#rGoldDark)" />

    {/* Engravings */}
    <text x="60" y="111" textAnchor="middle" fill="#fde68a" fontSize="5.5" fontWeight="bold" fontFamily="serif" opacity="0.7">FIFA</text>
    <text x="60" y="125" textAnchor="middle" fill="#d4a017" fontSize="3.8" fontFamily="serif" letterSpacing="1" opacity="0.5">WORLD CUP</text>
  </svg>
);

export default function WorldCupResult({ type, state, teams, onPlayAgain, onExit }) {
  // type: 'champion' | 'eliminated' | 'fired' | 'mutiny' | 'exhaustion'
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'es';
  const ui = WORLD_CUP_UI_I18N[lang] || WORLD_CUP_UI_I18N.es;

  const [showConfetti, setShowConfetti] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 100);
    if (type === 'champion') setTimeout(() => setShowConfetti(true), 500);
  }, [type]);

  const teamMap = {};
  (teams || []).forEach(t => { teamMap[t.id] = t; });
  const playerTeam = teamMap[state?.playerTeamId] || {};

  const playerResults = (state?.results || []).filter(r => r.home === state?.playerTeamId || r.away === state?.playerTeamId);
  const wins = playerResults.filter(r => r.winner === state?.playerTeamId).length;
  const totalGoals = playerResults.reduce((sum, r) => {
    if (r.home === state?.playerTeamId) return sum + (r.homeScore || 0);
    return sum + (r.awayScore || 0);
  }, 0);

  const titles = {
    champion: ui.youWon,
    eliminated: ui.eliminated,
    fired: ui.fired,
    mutiny: ui.mutiny,
    exhaustion: ui.exhaustion || ui.fired,
  };

  const icons = {
    champion: '',
    eliminated: '😢',
    fired: '🔥',
    mutiny: '💀',
    exhaustion: '🏥',
  };

  return (
    <div className={`wc-result wc-result--${type} ${animateIn ? 'wc-result--visible' : ''}`}>
      {showConfetti && (
        <div className="wc-result__confetti">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="wc-result__confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                backgroundColor: ['#ffd700', '#14b8a6', '#ef4444', '#3b82f6', '#a855f7', '#f59e0b'][Math.floor(Math.random() * 6)],
              }}
            />
          ))}
        </div>
      )}

      <div className="wc-result__content">
        <div className="wc-result__icon-wrap">
          <span className="wc-result__big-icon">{icons[type]}</span>
        </div>

        {type === 'champion' && (
          <div className="wc-result__trophy-animation">
            <WorldCupTrophy />
          </div>
        )}

        <h1 className="wc-result__title">{titles[type]}</h1>

        {playerTeam.id && (
          <div className="wc-result__team-badge">
            <span className="wc-result__team-flag"><FlagIcon teamId={playerTeam.id} size={32} /></span>
            <span className="wc-result__team-name">{lang === 'es' ? playerTeam.nameEs : playerTeam.name}</span>
          </div>
        )}

        <div className="wc-result__stats">
          <div className="wc-result__stat">
            <span className="wc-result__stat-value">{playerResults.length}</span>
            <span className="wc-result__stat-label">{lang === 'es' ? 'Partidos' : 'Matches'}</span>
          </div>
          <div className="wc-result__stat">
            <span className="wc-result__stat-value">{wins}</span>
            <span className="wc-result__stat-label">{lang === 'es' ? 'Victorias' : 'Wins'}</span>
          </div>
          <div className="wc-result__stat">
            <span className="wc-result__stat-value">{totalGoals}</span>
            <span className="wc-result__stat-label">{lang === 'es' ? 'Goles' : 'Goals'}</span>
          </div>
          <div className="wc-result__stat">
            <span className="wc-result__stat-value">{(state?.eventHistory || []).length}</span>
            <span className="wc-result__stat-label">{lang === 'es' ? 'Eventos' : 'Events'}</span>
          </div>
        </div>

        <div className="wc-result__actions">
          <button className="wc-result__btn wc-result__btn--primary" onClick={onPlayAgain}>
            <RotateCcw size={18} />
            {lang === 'es' ? 'Jugar de nuevo' : 'Play Again'}
          </button>
          {onExit && (
            <button className="wc-result__btn wc-result__btn--secondary" onClick={onExit}>
              {lang === 'es' ? 'Menú principal' : 'Main Menu'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
