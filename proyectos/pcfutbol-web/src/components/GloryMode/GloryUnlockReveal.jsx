import React, { useState, useEffect } from 'react';
import { GLORY_CARDS } from '../../game/gloryEngine';
import { MILESTONES } from '../../game/gloryUnlocks';
import {
  Dna, Landmark, Eye, Sparkles, CloudRain, Target,
  HeartPulse, Crown, BadgeDollarSign, LayoutGrid, ShieldHalf, Zap,
  Handshake, Megaphone, GraduationCap, RotateCcw, Shuffle,
  Skull, Coins, Crosshair, ArrowLeftRight, FileText, Banknote, Swords,
  Trophy, Star, Lock, Unlock
} from 'lucide-react';
import './GloryMode.scss';

const ICON_MAP = {
  Dna, Landmark, Eye, Sparkles, CloudRain, Target,
  HeartPulse, Crown, BadgeDollarSign, LayoutGrid, ShieldHalf, Zap,
  Handshake, Megaphone, GraduationCap, RotateCcw, Shuffle,
  Skull, Coins, Crosshair, ArrowLeftRight, FileText, Banknote, Swords,
};

const TIER_LABELS = { S: 'LEGENDARIA', A: 'ÉPICA', B: 'RARA' };
const TIER_CLASSES = { S: 'legendary', A: 'epic', B: 'rare' };

/**
 * Full-screen reveal animation when a new card is unlocked.
 * Shows one card at a time. When multiple are unlocked, chains them.
 */
export default function GloryUnlockReveal({ milestoneIds = [], onDone }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState('lock'); // lock → unlock → card → idle

  const current = milestoneIds[currentIdx];
  const milestone = MILESTONES.find(m => m.id === current);
  const card = milestone ? GLORY_CARDS.find(c => c.id === milestone.cardId) : null;

  // Animation sequence
  useEffect(() => {
    if (!current) { onDone?.(); return; }
    setPhase('lock');
    const t1 = setTimeout(() => setPhase('unlock'), 800);
    const t2 = setTimeout(() => setPhase('card'), 1600);
    const t3 = setTimeout(() => setPhase('idle'), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [currentIdx, current]);

  const handleNext = () => {
    if (currentIdx < milestoneIds.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      onDone?.();
    }
  };

  if (!current || !card) return null;

  const IconComponent = ICON_MAP[card.icon] || Star;

  return (
    <div className="glory-reveal" onClick={phase === 'idle' ? handleNext : undefined}>
      {/* Background particles */}
      <div className={`glory-reveal__bg glory-reveal__bg--${TIER_CLASSES[card.tier]}`} />

      {/* Lock phase */}
      <div className={`glory-reveal__lock ${phase === 'lock' ? 'visible' : 'hidden'}`}>
        <Lock size={64} />
      </div>

      {/* Unlock burst */}
      <div className={`glory-reveal__burst ${phase === 'unlock' ? 'visible' : 'hidden'}`}>
        <Unlock size={64} />
        <div className="glory-reveal__ring" />
        <div className="glory-reveal__ring glory-reveal__ring--2" />
      </div>

      {/* Card reveal */}
      <div className={`glory-reveal__card ${phase === 'card' || phase === 'idle' ? 'visible' : 'hidden'}`}>
        <div className="glory-reveal__milestone-tag">
          <Trophy size={14} /> {milestone.name}
        </div>

        <div className={`glory-reveal__card-frame glory-reveal__card-frame--${TIER_CLASSES[card.tier]}`}>
          <div className="glory-reveal__card-icon" style={{ color: card.color }}>
            <IconComponent size={48} />
          </div>
        </div>

        <span className={`glory-reveal__tier glory-reveal__tier--${TIER_CLASSES[card.tier]}`}>
          {TIER_LABELS[card.tier]}
        </span>

        <h2 className="glory-reveal__name">{card.name}</h2>
        <p className="glory-reveal__desc">{card.description}</p>

        {phase === 'idle' && (
          <button className="glory-reveal__continue" onClick={(e) => { e.stopPropagation(); handleNext(); }}>
            {currentIdx < milestoneIds.length - 1 ? 'Siguiente' : 'Continuar'}
          </button>
        )}

        <span className="glory-reveal__counter">
          {currentIdx + 1} / {milestoneIds.length}
        </span>
      </div>
    </div>
  );
}
