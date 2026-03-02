import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldHalf, Zap, Target, Swords, TrendingUp, TrendingDown } from 'lucide-react';
import './WorldCupTeamTalk.scss';

const TEAM_TALK_I18N = {
  es: {
    title: 'TÁCTICA',
    subtitle: 'Elige cómo sale tu equipo al campo',
    parkBus: 'AUTOBÚS',
    parkBusDesc: 'Todos atrás. Que no pasen.',
    parkBusScores: '0-0, 1-0, 0-1',
    parkBusPro: 'Casi no te meten',
    parkBusCon: 'Casi no metes. -10 moral si pierdes.',
    counter: 'CONTRAATAQUE',
    counterDesc: 'Dejar que vengan y salir a la contra.',
    counterScores: '1-0, 2-1, 1-2',
    counterPro: 'Letal al recuperar',
    counterCon: 'Más tarjetas. Si no recuperas, sufres.',
    possession: 'POSESIÓN',
    possessionDesc: 'Tener el balón. Controlar el ritmo.',
    possessionScores: '1-0, 2-0, 1-1',
    possessionPro: 'Control, pocas sorpresas',
    possessionCon: 'Si te marcan primero, cuesta remontar.',
    allOut: 'ATAQUE TOTAL',
    allOutDesc: 'Todos arriba. A por ellos.',
    allOutScores: '3-2, 2-3, 4-1',
    allOutPro: 'Muchos goles',
    allOutCon: 'Muchos en contra. Más rojas.',
    typical: 'Típico',
    chosen: '¡Preparados!',
  },
  en: {
    title: 'TACTICS',
    subtitle: 'Choose how your team takes the field',
    parkBus: 'PARK THE BUS',
    parkBusDesc: 'Everyone back. Lock it down.',
    parkBusScores: '0-0, 1-0, 0-1',
    parkBusPro: 'Almost impossible to score against',
    parkBusCon: 'You barely score either. -10 morale if you lose.',
    counter: 'COUNTER-ATTACK',
    counterDesc: 'Let them come and hit on the break.',
    counterScores: '1-0, 2-1, 1-2',
    counterPro: 'Deadly on the break',
    counterCon: 'More cards. If you can\'t recover, you suffer.',
    possession: 'POSSESSION',
    possessionDesc: 'Keep the ball. Control the tempo.',
    possessionScores: '1-0, 2-0, 1-1',
    possessionPro: 'Control, few surprises',
    possessionCon: 'If they score first, hard to come back.',
    allOut: 'ALL-OUT ATTACK',
    allOutDesc: 'Everyone forward. Go for it.',
    allOutScores: '3-2, 2-3, 4-1',
    allOutPro: 'Lots of goals',
    allOutCon: 'Lots conceded too. More reds.',
    typical: 'Typical',
    chosen: 'Ready!',
  },
  fr: {
    title: 'TACTIQUE',
    subtitle: 'Choisissez comment votre équipe entre en jeu',
    parkBus: 'BÉTON',
    parkBusDesc: 'Tous derrière. Rien ne passe.',
    parkBusScores: '0-0, 1-0, 0-1',
    parkBusPro: 'Presque impossible de marquer contre vous',
    parkBusCon: 'Vous marquez peu. -10 moral si défaite.',
    counter: 'CONTRE-ATTAQUE',
    counterDesc: 'Les laisser venir et frapper en contre.',
    counterScores: '1-0, 2-1, 1-2',
    counterPro: 'Mortel en contre',
    counterCon: 'Plus de cartons. Si pas de récupération, on souffre.',
    possession: 'POSSESSION',
    possessionDesc: 'Garder le ballon. Contrôler le tempo.',
    possessionScores: '1-0, 2-0, 1-1',
    possessionPro: 'Contrôle, peu de surprises',
    possessionCon: 'Si but encaissé, dur de revenir.',
    allOut: 'ATTAQUE TOTALE',
    allOutDesc: 'Tous devant. On y va.',
    allOutScores: '3-2, 2-3, 4-1',
    allOutPro: 'Beaucoup de buts',
    allOutCon: 'Beaucoup encaissés aussi. Plus de rouges.',
    typical: 'Typique',
    chosen: 'Prêts !',
  },
  de: {
    title: 'TAKTIK',
    subtitle: 'Wie geht dein Team auf den Platz?',
    parkBus: 'MAUERTAKTIK',
    parkBusDesc: 'Alle hinten. Nichts durchlassen.',
    parkBusScores: '0-0, 1-0, 0-1',
    parkBusPro: 'Kaum Gegentore',
    parkBusCon: 'Kaum eigene Tore. -10 Moral bei Niederlage.',
    counter: 'KONTER',
    counterDesc: 'Kommen lassen und kontern.',
    counterScores: '1-0, 2-1, 1-2',
    counterPro: 'Tödlich im Konter',
    counterCon: 'Mehr Karten. Ohne Ballgewinn leidet man.',
    possession: 'BALLBESITZ',
    possessionDesc: 'Ball halten. Tempo kontrollieren.',
    possessionScores: '1-0, 2-0, 1-1',
    possessionPro: 'Kontrolle, wenig Überraschungen',
    possessionCon: 'Bei Rückstand schwer aufzuholen.',
    allOut: 'VOLLANGRIFF',
    allOutDesc: 'Alle nach vorne.',
    allOutScores: '3-2, 2-3, 4-1',
    allOutPro: 'Viele Tore',
    allOutCon: 'Viele Gegentore. Mehr Platzverweise.',
    typical: 'Typisch',
    chosen: 'Bereit!',
  },
  pt: {
    title: 'TÁTICA',
    subtitle: 'Escolhe como a equipa entra em campo',
    parkBus: 'AUTOCARRO',
    parkBusDesc: 'Todos atrás. Não passa ninguém.',
    parkBusScores: '0-0, 1-0, 0-1',
    parkBusPro: 'Quase não sofres golos',
    parkBusCon: 'Quase não marcas. -10 moral se perderes.',
    counter: 'CONTRA-ATAQUE',
    counterDesc: 'Deixar virem e sair na transição.',
    counterScores: '1-0, 2-1, 1-2',
    counterPro: 'Letal na transição',
    counterCon: 'Mais cartões. Se não recuperas, sofres.',
    possession: 'POSSE',
    possessionDesc: 'Ter a bola. Controlar o ritmo.',
    possessionScores: '1-0, 2-0, 1-1',
    possessionPro: 'Controlo, poucas surpresas',
    possessionCon: 'Se sofreres primeiro, custa recuperar.',
    allOut: 'ATAQUE TOTAL',
    allOutDesc: 'Todos à frente.',
    allOutScores: '3-2, 2-3, 4-1',
    allOutPro: 'Muitos golos',
    allOutCon: 'Muitos sofridos. Mais vermelhos.',
    typical: 'Típico',
    chosen: 'Preparados!',
  },
  it: {
    title: 'TATTICA',
    subtitle: 'Scegli come la squadra scende in campo',
    parkBus: 'CATENACCIO',
    parkBusDesc: 'Tutti dietro. Non passa nessuno.',
    parkBusScores: '0-0, 1-0, 0-1',
    parkBusPro: 'Quasi impossibile subire gol',
    parkBusCon: 'Segni poco. -10 morale se perdi.',
    counter: 'CONTROPIEDE',
    counterDesc: 'Farli venire e colpire in ripartenza.',
    counterScores: '1-0, 2-1, 1-2',
    counterPro: 'Letale in ripartenza',
    counterCon: 'Più cartellini. Senza recupero, si soffre.',
    possession: 'POSSESSO',
    possessionDesc: 'Tenere la palla. Controllare il ritmo.',
    possessionScores: '1-0, 2-0, 1-1',
    possessionPro: 'Controllo, poche sorprese',
    possessionCon: 'Se subisci per primo, difficile rimontare.',
    allOut: 'ATTACCO TOTALE',
    allOutDesc: 'Tutti avanti.',
    allOutScores: '3-2, 2-3, 4-1',
    allOutPro: 'Tanti gol',
    allOutCon: 'Tanti subiti. Più rossi.',
    typical: 'Tipico',
    chosen: 'Pronti!',
  },
};

const TALK_OPTIONS = [
  {
    id: 'parkBus',
    Icon: ShieldHalf,
    color: '#3b82f6',
    matchEffects: { playerGoalMod: -0.45, opponentGoalMod: -0.55, redCardMod: 0, moralePenaltyOnLoss: 10 },
  },
  {
    id: 'counter',
    Icon: Zap,
    color: '#a855f7',
    matchEffects: { playerGoalMod: -0.05, opponentGoalMod: -0.15, redCardMod: 0.12, yellowCardMod: 0.25 },
  },
  {
    id: 'possession',
    Icon: Target,
    color: '#22c55e',
    matchEffects: { playerGoalMod: 0.05, opponentGoalMod: -0.20, redCardMod: 0, comebackPenalty: true },
  },
  {
    id: 'allOut',
    Icon: Swords,
    color: '#ef4444',
    matchEffects: { playerGoalMod: 0.40, opponentGoalMod: 0.30, redCardMod: 0.20 },
  },
];

export default function WorldCupTeamTalk({ resources, onChoice }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'es';
  const ui = TEAM_TALK_I18N[lang] || TEAM_TALK_I18N.es;

  const [chosen, setChosen] = useState(null);

  const handleChoice = (option) => {
    if (chosen) return;
    setChosen(option.id);
    setTimeout(() => {
      onChoice(option);
    }, 1000);
  };

  return (
    <div className="wc-talk">
      <div className="wc-talk__content">
        <div className="wc-talk__header">
          <h2>{ui.title}</h2>
          <p>{ui.subtitle}</p>
        </div>

        <div className="wc-talk__huddle">
          <svg viewBox="0 0 200 130" width="200" height="130" style={{ opacity: 0.25 }}>
            {/* Mini tactical pitch */}
            <rect x="10" y="10" width="180" height="110" rx="4" fill="none" stroke="#fff" strokeWidth="1.5"/>
            <line x1="100" y1="10" x2="100" y2="120" stroke="#fff" strokeWidth="1" strokeDasharray="4,3"/>
            <circle cx="100" cy="65" r="20" fill="none" stroke="#fff" strokeWidth="1"/>
            <rect x="10" y="35" width="30" height="60" fill="none" stroke="#fff" strokeWidth="1"/>
            <rect x="160" y="35" width="30" height="60" fill="none" stroke="#fff" strokeWidth="1"/>
            <circle cx="100" cy="65" r="2" fill="#fff"/>
          </svg>
        </div>

        <div className={`wc-talk__options ${chosen ? 'wc-talk__options--chosen' : ''}`}>
          {TALK_OPTIONS.map(option => {
            const isChosen = chosen === option.id;
            const Icon = option.Icon;
            return (
              <button
                key={option.id}
                className={`wc-talk__option ${isChosen ? 'wc-talk__option--selected' : ''} ${chosen && !isChosen ? 'wc-talk__option--dimmed' : ''}`}
                style={{ '--talk-color': option.color }}
                onClick={() => handleChoice(option)}
                disabled={!!chosen}
              >
                <div className="wc-talk__option-icon" style={{ background: `${option.color}20`, border: `2px solid ${option.color}40` }}>
                  <Icon size={28} color={option.color} />
                </div>
                <div className="wc-talk__option-body">
                  <span className="wc-talk__option-title" style={{ color: option.color }}>
                    {ui[option.id]}
                  </span>
                  <span className="wc-talk__option-desc">{ui[option.id + 'Desc']}</span>
                  <div className="wc-talk__option-tradeoff">
                    <span className="wc-talk__pro"><TrendingUp size={14} /> {ui[option.id + 'Pro']}</span>
                    <span className="wc-talk__con"><TrendingDown size={14} /> {ui[option.id + 'Con']}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {chosen && (
          <div className="wc-talk__ready">
            <span>{ui.chosen}</span>
          </div>
        )}
      </div>
    </div>
  );
}
