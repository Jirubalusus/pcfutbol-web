import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, User } from 'lucide-react';
import './WorldCupMidMatch.scss';

const MID_MATCH_I18N = {
  es: {
    title: 'Decisión en el minuto {min}',
    subDesc: 'Tu delantero está agotado. La grada canta el nombre del joven suplente.',
    keepStarter: 'Mantener al titular',
    keepStarterDesc: 'Experiencia > frescura. Confío en él.',
    makeSub: 'Hacer el cambio',
    makeSubDesc: 'Piernas frescas pueden marcar la diferencia.',
  },
  en: {
    title: 'Decision at minute {min}',
    subDesc: 'Your striker is exhausted. The crowd chants for the young sub.',
    keepStarter: 'Keep the starter',
    keepStarterDesc: 'Experience > freshness. I trust him.',
    makeSub: 'Make the sub',
    makeSubDesc: 'Fresh legs can make the difference.',
  },
  fr: {
    title: 'Décision à la minute {min}',
    subDesc: 'Votre attaquant est épuisé. La foule scande le nom du jeune remplaçant.',
    keepStarter: 'Garder le titulaire',
    keepStarterDesc: 'Expérience > fraîcheur.',
    makeSub: 'Faire le changement',
    makeSubDesc: 'Des jambes fraîches peuvent faire la différence.',
  },
  de: {
    title: 'Entscheidung in Minute {min}',
    subDesc: 'Dein Stürmer ist erschöpft. Die Fans rufen nach dem jungen Ersatzspieler.',
    keepStarter: 'Starter beibehalten',
    keepStarterDesc: 'Erfahrung > Frische.',
    makeSub: 'Wechsel vornehmen',
    makeSubDesc: 'Frische Beine können den Unterschied machen.',
  },
  pt: {
    title: 'Decisão no minuto {min}',
    subDesc: 'O seu avançado está esgotado. A bancada canta pelo jovem suplente.',
    keepStarter: 'Manter o titular',
    keepStarterDesc: 'Experiência > frescura.',
    makeSub: 'Fazer a substituição',
    makeSubDesc: 'Pernas frescas podem fazer a diferença.',
  },
  it: {
    title: 'Decisione al minuto {min}',
    subDesc: 'Il tuo attaccante è esausto. La folla invoca il giovane sostituto.',
    keepStarter: 'Tenere il titolare',
    keepStarterDesc: 'Esperienza > freschezza.',
    makeSub: 'Fare il cambio',
    makeSubDesc: 'Gambe fresche possono fare la differenza.',
  },
};

export default function WorldCupMidMatch({ minute, starter, sub, onDecision }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'es';
  const ui = MID_MATCH_I18N[lang] || MID_MATCH_I18N.es;

  const [chosen, setChosen] = useState(null);

  const handleChoice = useCallback((decision) => {
    if (chosen) return;
    setChosen(decision);
    setTimeout(() => onDecision(decision), 1200);
  }, [chosen, onDecision]);

  const starterName = starter?.name || 'Starter';
  const subName = sub?.name || 'Substitute';

  return (
    <div className="wc-mid">
      <div className="wc-mid__overlay" />
      <div className="wc-mid__card">
        <div className="wc-mid__minute">{minute}'</div>

        <h2 className="wc-mid__title">{ui.title.replace('{min}', minute)}</h2>
        <p className="wc-mid__desc">{ui.subDesc}</p>

        <div className="wc-mid__players">
          <div className="wc-mid__player wc-mid__player--starter">
            <User size={24} />
            <span className="wc-mid__player-name">{starterName}</span>
            <span className="wc-mid__player-tag">😓</span>
          </div>
          <ArrowRightLeft size={20} className="wc-mid__swap-icon" />
          <div className="wc-mid__player wc-mid__player--sub">
            <User size={24} />
            <span className="wc-mid__player-name">{subName}</span>
            <span className="wc-mid__player-tag">⚡</span>
          </div>
        </div>

        <div className={`wc-mid__choices ${chosen ? 'wc-mid__choices--chosen' : ''}`}>
          <button
            className={`wc-mid__choice ${chosen === 'keep' ? 'wc-mid__choice--selected' : ''} ${chosen && chosen !== 'keep' ? 'wc-mid__choice--dimmed' : ''}`}
            onClick={() => handleChoice('keep')}
            disabled={!!chosen}
          >
            <span className="wc-mid__choice-emoji">🔒</span>
            <span className="wc-mid__choice-title">{ui.keepStarter}</span>
            <span className="wc-mid__choice-desc">{ui.keepStarterDesc}</span>
          </button>

          <button
            className={`wc-mid__choice ${chosen === 'sub' ? 'wc-mid__choice--selected' : ''} ${chosen && chosen !== 'sub' ? 'wc-mid__choice--dimmed' : ''}`}
            onClick={() => handleChoice('sub')}
            disabled={!!chosen}
          >
            <span className="wc-mid__choice-emoji">🔄</span>
            <span className="wc-mid__choice-title">{ui.makeSub}</span>
            <span className="wc-mid__choice-desc">{ui.makeSubDesc}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
