import React, { useState } from 'react';
import {
  CircleDollarSign, Scale, UserPlus, Building2, TrendingDown, Flame, AlertTriangle,
} from 'lucide-react';
import './GloryMode.scss';

const ICON_MAP = {
  CircleDollarSign, Scale, UserPlus, Building2, TrendingDown, Flame,
};

export default function GloryEvent({ event, onResolve }) {
  const [chosen, setChosen] = useState(null);

  if (!event) return null;

  const IconComp = ICON_MAP[event.icon] || AlertTriangle;

  const handleChoice = (option, key) => {
    setChosen(key);
    setTimeout(() => onResolve(option), 500);
  };

  return (
    <div className="glory-event">
      <div className="glory-event__card fade-in-up">
        <div className="glory-event__icon-wrap">
          <IconComp size={32} strokeWidth={1.5} />
        </div>
        <h3 className="glory-event__title">{event.title}</h3>
        <p className="glory-event__desc">{event.description}</p>

        <div className="glory-event__options">
          <button
            className={`glory-event__option ${chosen === 'a' ? 'chosen' : ''} ${chosen && chosen !== 'a' ? 'dimmed' : ''}`}
            onClick={() => !chosen && handleChoice(event.optionA, 'a')}
            disabled={!!chosen}
          >
            {event.optionA.label}
          </button>
          <button
            className={`glory-event__option ${chosen === 'b' ? 'chosen' : ''} ${chosen && chosen !== 'b' ? 'dimmed' : ''}`}
            onClick={() => !chosen && handleChoice(event.optionB, 'b')}
            disabled={!!chosen}
          >
            {event.optionB.label}
          </button>
        </div>
      </div>
    </div>
  );
}
