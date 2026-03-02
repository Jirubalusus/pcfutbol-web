import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Trophy, Frown, Handshake, Heart, Activity, Newspaper, Wallet } from 'lucide-react';
import { WORLD_CUP_EVENTS_I18N } from '../../data/worldCupEventsI18n';
import ResourceBars from './ResourceBars';
import { PressIllustration } from './EventIllustrations';
import './WorldCupPress.scss';

const EFFECT_ICONS = {
  morale: Heart,
  fitness: Activity,
  pressure: Newspaper,
  budget: Wallet,
};

export default function WorldCupPress({ event, resources, matchResult, onChoice, starPlayer }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'es';

  const i18nData = WORLD_CUP_EVENTS_I18N[event.id];
  const rawTexts = i18nData?.[lang] || i18nData?.es || { title: event.id, desc: '', a: 'A', b: 'B' };
  const texts = { ...rawTexts };
  if (starPlayer) {
    texts.desc = (texts.desc || '').replace(/{starPlayer}/g, starPlayer);
    texts.title = (texts.title || '').replace(/{starPlayer}/g, starPlayer);
    texts.a = (texts.a || '').replace(/{starPlayer}/g, starPlayer);
    texts.b = (texts.b || '').replace(/{starPlayer}/g, starPlayer);
  }

  const [chosen, setChosen] = useState(null);
  const [deltas, setDeltas] = useState(null);

  const handleChoice = useCallback((choice, side) => {
    if (chosen) return;
    setChosen(side);
    setDeltas(choice.effects);
    setTimeout(() => {
      onChoice(choice, side);
      setChosen(null);
      setDeltas(null);
    }, 1200);
  }, [chosen, onChoice]);

  const EFFECT_ICON_COLORS = {
    morale: '#f472b6',
    fitness: '#a78bfa',
    pressure: '#fb923c',
    budget: '#34d399',
  };

  const getEffectPreview = (effects) => {
    if (!effects) return null;
    const entries = Object.entries(effects).filter(([, v]) => v !== 0);
    return entries.map(([k, v]) => {
      const Icon = EFFECT_ICONS[k];
      const iconColor = EFFECT_ICON_COLORS[k] || '#fff';
      const isPositive = (k === 'pressure') ? v < 0 : v > 0;
      const textColor = isPositive ? '#4afa7f' : '#ff6b6b';
      const bgColor = isPositive ? 'rgba(74,250,127,0.1)' : 'rgba(255,107,107,0.1)';
      return (
        <span key={k} className="wc-press__effect" style={{ color: textColor, background: bgColor }}>
          {v > 0 ? '+' : ''}{v} {Icon && <Icon size={12} style={{ color: iconColor }} />}
        </span>
      );
    });
  };

  const ResultIcon = matchResult === 'win' ? Trophy : matchResult === 'lose' ? Frown : Handshake;
  const resultColor = matchResult === 'win' ? '#f59e0b' : matchResult === 'lose' ? '#ef4444' : '#94a3b8';
  const pressColor = '#f59e0b';

  return (
    <div className="wc-press">
      <div className="wc-press__stage">
        <div className={`wc-press__card ${chosen ? 'wc-press__card--chosen' : ''}`}>
          <div className="wc-press__flash" />
          {/* Grass top + banner */}
          <div className="wc-press__grass-top">
            <div className="wc-press__category-banner">
              <Mic size={16} style={{ color: pressColor }} />
              <span className="wc-press__title">{texts.title}</span>
              <div className="wc-press__result-badge" style={{ color: resultColor }}>
                <ResultIcon size={20} />
              </div>
            </div>
          </div>

          {/* Illustration */}
          <div className="wc-press__card-illustration">
            <div className="wc-press__illustration-glow">
              <PressIllustration />
            </div>
          </div>

          <div className="wc-press__card-body">
            <p className="wc-press__description">{texts.desc}</p>
          </div>

          <div className="wc-press__choices">
            <button
              className={`wc-press__choice wc-press__choice--a ${chosen === 'A' ? 'wc-press__choice--selected' : ''}`}
              onClick={() => handleChoice(event.choiceA, 'A')}
              disabled={!!chosen}
            >
              <span className="wc-press__choice-text">{texts.a}</span>
              <div className="wc-press__choice-effects">{getEffectPreview(event.choiceA.effects)}</div>
            </button>

            <button
              className={`wc-press__choice wc-press__choice--b ${chosen === 'B' ? 'wc-press__choice--selected' : ''}`}
              onClick={() => handleChoice(event.choiceB, 'B')}
              disabled={!!chosen}
            >
              <span className="wc-press__choice-text">{texts.b}</span>
              <div className="wc-press__choice-effects">{getEffectPreview(event.choiceB.effects)}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
