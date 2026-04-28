import React, { useState } from 'react';
import { GLORY_CARDS } from '../../game/gloryEngine';
import { MILESTONES, STARTER_CARDS } from '../../game/gloryUnlocks';
import {
  Dna, Landmark, Eye, Sparkles, CloudRain, Target,
  HeartPulse, Crown, BadgeDollarSign, LayoutGrid, ShieldHalf, Zap,
  Handshake, Megaphone, GraduationCap, RotateCcw, Shuffle,
  Skull, Coins, Crosshair, ArrowLeftRight, FileText, Banknote, Swords,
  UserPlus, Lock, ArrowLeft, Star, X, Trophy, CheckCircle
} from 'lucide-react';
import './GloryMode.scss';

const ICON_MAP = {
  Dna, Landmark, Eye, Sparkles, CloudRain, Target,
  HeartPulse, Crown, BadgeDollarSign, LayoutGrid, ShieldHalf, Zap,
  Handshake, Megaphone, GraduationCap, RotateCcw, Shuffle,
  Skull, Coins, Crosshair, ArrowLeftRight, FileText, Banknote, Swords,
  UserPlus,
};

const TIER_LABELS = { S: 'LEGENDARIA', A: 'EPICA', B: 'RARA' };
const TIER_CLASSES = { S: 'legendary', A: 'epic', B: 'rare' };

export default function GloryCollection({ unlockedCards = [], completedMilestones = [], onBack }) {
  const [selectedCard, setSelectedCard] = useState(null);

  const tierOrder = { S: 0, A: 1, B: 2 };
  const sortedCards = [...GLORY_CARDS].sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

  const isUnlocked = (cardId) => unlockedCards.includes(cardId);
  const isStarter = (cardId) => STARTER_CARDS.includes(cardId);
  const getMilestone = (cardId) => MILESTONES.find(m => m.cardId === cardId);
  const totalUnlocked = sortedCards.filter(c => isUnlocked(c.id)).length;
  const progress = Math.round((totalUnlocked / sortedCards.length) * 100);

  const renderCardIcon = (card, unlocked) => {
    if (!unlocked) return <Lock size={36} />;
    const IconComponent = ICON_MAP[card.icon];
    if (!IconComponent) return <Star size={36} />;
    return <IconComponent size={36} />;
  };

  return (
    <div className="glory-collection unified-screen">
      <div className="glory-collection__header">
        <button className="glory-collection__back" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={18} />
        </button>
        <div className="glory-collection__headline">
          <span className="glory-collection__eyebrow">Vitrina permanente</span>
          <h2 className="glory-collection__title">Coleccion de cartas</h2>
          <p className="glory-collection__subtitle">{totalUnlocked}/{sortedCards.length} desbloqueadas</p>
        </div>
      </div>

      <section className="glory-collection__hero">
        <div>
          <span className="glory-collection__eyebrow">Progreso</span>
          <h3>{progress}% completo</h3>
          <p>Abre cada carta para ver su rareza y condicion de desbloqueo.</p>
        </div>
        <div className="glory-collection__hero-stats">
          <span><Star size={16} /> {sortedCards.filter(c => c.tier === 'S' && isUnlocked(c.id)).length} legendarias</span>
          <span><CheckCircle size={16} /> {totalUnlocked} activas</span>
          <span><Lock size={16} /> {sortedCards.length - totalUnlocked} ocultas</span>
        </div>
      </section>

      <div className="glory-collection__progress">
        <div className="glory-collection__progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="glory-collection__grid">
        {sortedCards.map(card => {
          const unlocked = isUnlocked(card.id);
          return (
            <button
              key={card.id}
              className={`glory-collection__cell glory-collection__cell--${TIER_CLASSES[card.tier]} ${unlocked ? 'glory-collection__cell--unlocked' : 'glory-collection__cell--locked'}`}
              onClick={() => setSelectedCard(card)}
            >
              <div className="glory-collection__cell-icon" style={unlocked ? { color: card.color } : undefined}>
                {renderCardIcon(card, unlocked)}
              </div>
              <span className="glory-collection__cell-name">{unlocked ? card.name : '???'}</span>
            </button>
          );
        })}
      </div>

      {selectedCard && (
        <div className="glory-collection__modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="glory-collection__modal" onClick={e => e.stopPropagation()}>
            <button className="glory-collection__modal-close" onClick={() => setSelectedCard(null)} aria-label="Cerrar">
              <X size={18} />
            </button>

            {isUnlocked(selectedCard.id) ? (
              <>
                <div className="glory-collection__modal-icon" style={{ color: selectedCard.color }}>
                  {renderCardIcon(selectedCard, true)}
                </div>
                <span className={`glory-collection__modal-tier glory-collection__modal-tier--${TIER_CLASSES[selectedCard.tier]}`}>
                  {TIER_LABELS[selectedCard.tier]}
                </span>
                <h3 className="glory-collection__modal-name">{selectedCard.name}</h3>
                <p className="glory-collection__modal-desc">{selectedCard.description}</p>
                {isStarter(selectedCard.id) ? (
                  <span className="glory-collection__modal-starter">Desbloqueada de inicio</span>
                ) : (
                  <span className="glory-collection__modal-unlocked">
                    <CheckCircle size={14} /> Desbloqueada
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="glory-collection__modal-icon glory-collection__modal-icon--locked">
                  <Lock size={36} />
                </div>
                <span className={`glory-collection__modal-tier glory-collection__modal-tier--${TIER_CLASSES[selectedCard.tier]}`}>
                  {TIER_LABELS[selectedCard.tier]}
                </span>
                <h3 className="glory-collection__modal-name">???</h3>
                {(() => {
                  const milestone = getMilestone(selectedCard.id);
                  if (!milestone) return <p className="glory-collection__modal-desc">Mejora secreta</p>;
                  return (
                    <div className="glory-collection__modal-milestone">
                      <Trophy size={16} />
                      <div>
                        <span className="glory-collection__modal-milestone-name">{milestone.name}</span>
                        <span className="glory-collection__modal-milestone-req">{milestone.description}</span>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
