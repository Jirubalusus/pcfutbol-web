import React, { useState, useMemo } from 'react';
import {
  Dna, Landmark, Eye, Sparkles, CloudRain, Target,
  HeartPulse, Crown, BadgeDollarSign, LayoutGrid, ShieldHalf, Zap,
  Handshake, Megaphone, GraduationCap, RotateCcw, Shuffle,
  Trophy, ChevronRight,
} from 'lucide-react';
import { drawCards } from '../../game/gloryEngine';
import './GloryMode.scss';

import {
  Skull, Coins, Crosshair, ArrowLeftRight, FileText, Banknote, Swords, UserPlus,
} from 'lucide-react';

const ICON_MAP = {
  Dna, Landmark, Eye, Sparkles, CloudRain, Target,
  HeartPulse, Crown, BadgeDollarSign, LayoutGrid, ShieldHalf, Zap,
  Handshake, Megaphone, GraduationCap, RotateCcw, Shuffle,
  Skull, Coins, Crosshair, ArrowLeftRight, FileText, Banknote, Swords, UserPlus,
};

const TIER_LABEL = { S: 'LEGENDARIA', A: 'ÉPICA', B: 'RARA' };
const TIER_GLOW = {
  S: '0 0 30px rgba(224, 64, 251, 0.5), 0 0 60px rgba(224, 64, 251, 0.2)',
  A: '0 0 20px rgba(66, 165, 245, 0.4), 0 0 40px rgba(66, 165, 245, 0.15)',
  B: '0 0 15px rgba(102, 187, 106, 0.3)',
};

export default function GloryCardSelection({ pickedCardIds = [], season, unlockedCardIds = null, onSelect }) {
  const [selectedId, setSelectedId] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const cards = useMemo(() => drawCards(pickedCardIds, 3, unlockedCardIds), [unlockedCardIds]);

  const handleConfirm = () => {
    if (!selectedId) return;
    setConfirmed(true);
    setTimeout(() => onSelect(selectedId), 600);
  };

  return (
    <div className="glory-cards">
      <div className="glory-cards__header">
        <Trophy size={24} className="glory-cards__trophy-icon" />
        <h2>Fin de Temporada {season}</h2>
        <p className="glory-cards__subtitle">Elige una mejora permanente para tu club</p>
      </div>

      <div className="glory-cards__grid">
        {cards.map((card) => {
          const IconComp = ICON_MAP[card.icon] || Sparkles;
          const isSelected = selectedId === card.id;

          return (
            <button
              key={card.id}
              className={`glory-card ${isSelected ? 'selected' : ''} ${confirmed && isSelected ? 'confirmed' : ''} glory-card--tier-${card.tier.toLowerCase()}`}
              onClick={() => !confirmed && setSelectedId(card.id)}
              style={{
                '--card-color': card.color,
                '--card-glow': TIER_GLOW[card.tier],
              }}
            >
              <div className="glory-card__tier-badge">{TIER_LABEL[card.tier]}</div>
              <div className="glory-card__icon-wrap">
                <IconComp size={36} strokeWidth={1.5} />
              </div>
              <h3 className="glory-card__name">{card.name}</h3>
              <p className="glory-card__desc">{card.description}</p>
            </button>
          );
        })}
      </div>

      {selectedId && !confirmed && (
        <button className="glory-cards__confirm-btn fade-in-up" onClick={handleConfirm}>
          Confirmar elección <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
