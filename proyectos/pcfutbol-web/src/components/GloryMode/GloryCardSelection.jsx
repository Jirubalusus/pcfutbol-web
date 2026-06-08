import React, { useState, useMemo } from 'react';
import {
  Dna, Landmark, Eye, Sparkles, CloudRain, Target,
  HeartPulse, Crown, BadgeDollarSign, LayoutGrid, ShieldHalf, Zap,
  Handshake, Megaphone, GraduationCap, RotateCcw, Shuffle,
  Trophy, ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

const TIER_GLOW = {
  S: '0 0 30px rgba(224, 64, 251, 0.5), 0 0 60px rgba(224, 64, 251, 0.2)',
  A: '0 0 20px rgba(66, 165, 245, 0.4), 0 0 40px rgba(66, 165, 245, 0.15)',
  B: '0 0 15px rgba(102, 187, 106, 0.3)',
};

export default function GloryCardSelection({ pickedCardIds = [], season, unlockedCardIds = null, onSelect }) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const TIER_LABEL_KEYS = {
    S: 'glory.cards.tierLegendary',
    A: 'glory.cards.tierEpic',
    B: 'glory.cards.tierRare',
  };

  const cards = useMemo(() => drawCards(pickedCardIds, 3, unlockedCardIds), [pickedCardIds, unlockedCardIds]);

  const handleConfirm = () => {
    if (!selectedId) return;
    setConfirmed(true);
    setTimeout(() => onSelect(selectedId), 600);
  };

  return (
    <div className="glory-cards">
      <div className="glory-cards__header">
        <Trophy size={24} className="glory-cards__trophy-icon" />
        <h2>{t('glory.cards.seasonEndTitle', { season })}</h2>
        <p className="glory-cards__subtitle">{t('glory.cards.seasonEndSubtitle')}</p>
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
              <div className="glory-card__tier-badge">{t(TIER_LABEL_KEYS[card.tier])}</div>
              <div className="glory-card__icon-wrap">
                <IconComp size={36} strokeWidth={1.5} />
              </div>
              <h3 className="glory-card__name">{t(`glory.cardData.${card.id}.name`, { defaultValue: card.name })}</h3>
              <p className="glory-card__desc">{t(`glory.cardData.${card.id}.description`, { defaultValue: card.description })}</p>
            </button>
          );
        })}
      </div>

      {selectedId && !confirmed && (
        <button className="glory-cards__confirm-btn fade-in-up" onClick={handleConfirm}>
          {t('glory.cards.confirmChoice')} <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
