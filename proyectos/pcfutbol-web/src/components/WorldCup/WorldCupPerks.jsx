import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Lock, Check } from 'lucide-react';
import './WorldCupPerks.scss';

const PERKS_I18N = {
  es: {
    title: 'Habilidades del Entrenador',
    points: 'Puntos disponibles',
    tactical: 'Táctica', motivational: 'Liderazgo', physical: 'Preparación',
    tac1: 'El Vidente',
    tac1d: 'Predices el marcador exacto antes del partido. Si aciertas: +5 a TODOS los recursos',
    tac2: 'Arquitecto Total',
    tac2d: 'Desbloquea las 7 formaciones. Tu equipo se adapta a cualquier rival',
    tac3: 'Mente Maestra',
    tac3d: 'Tus decisiones de descanso tienen DOBLE efecto. El vestuario te sigue ciegamente',
    mot1: 'Gladiador',
    mot1d: 'Cuando vas perdiendo, tu equipo entra en modo berserker: 30% de gol en los últimos 15 min',
    mot2: 'Muro de Hielo',
    mot2d: 'Si la presión supera 70, tu equipo se crece: +3 rating temporal',
    mot3: 'Leyenda Viva',
    mot3d: 'En partidos clave (cuartos+), tu estrella juega al 130%. Se transforma en los momentos grandes',
    phy1: 'Blindaje Total',
    phy1d: 'Cero lesiones en todo el torneo. Tu cuerpo técnico médico es de otro planeta',
    phy2: 'Máquinas',
    phy2d: 'Empiezas la 2ª parte con +3 rating. Tu equipo domina los últimos 30 min',
    phy3: 'Disciplina Absoluta',
    phy3d: 'Tu equipo NUNCA ve una roja. Control total de las emociones en el campo',
    close: 'Cerrar',
  },
  en: {
    title: 'Coach Skills',
    points: 'Available points',
    tactical: 'Tactics', motivational: 'Leadership', physical: 'Preparation',
    tac1: 'The Oracle',
    tac1d: 'Predict the exact score. If correct: +5 to ALL resources',
    tac2: 'Total Architect',
    tac2d: 'Unlock all 7 formations. Your team adapts to any rival',
    tac3: 'Mastermind',
    tac3d: 'Your halftime decisions have DOUBLE effect. The dressing room follows you blindly',
    mot1: 'Gladiator',
    mot1d: 'When losing, your team goes berserk: 30% chance of scoring in last 15 min',
    mot2: 'Ice Wall',
    mot2d: 'When pressure exceeds 70, your team rises: +3 temporary rating',
    mot3: 'Living Legend',
    mot3d: 'In key matches (quarters+), your star plays at 130%. Transforms in big moments',
    phy1: 'Total Shield',
    phy1d: 'Zero injuries all tournament. Your medical staff is from another planet',
    phy2: 'Machines',
    phy2d: 'Start 2nd half with +3 rating. Your team dominates the last 30 min',
    phy3: 'Absolute Discipline',
    phy3d: 'Your team NEVER sees a red card. Total emotional control on the pitch',
    close: 'Close',
  },
  fr: {
    title: 'Compétences d\'entraîneur',
    points: 'Points disponibles',
    tactical: 'Tactique', motivational: 'Leadership', physical: 'Préparation',
    tac1: 'L\'Oracle', tac1d: 'Prédisez le score exact. Si correct : +5 à TOUTES les ressources',
    tac2: 'Architecte Total', tac2d: 'Débloquez les 7 formations. Adaptation totale',
    tac3: 'Cerveau', tac3d: 'Vos décisions à la mi-temps ont un effet DOUBLE',
    mot1: 'Gladiateur', mot1d: 'En retard : 30% de marquer dans les 15 dernières min',
    mot2: 'Mur de Glace', mot2d: 'Si la pression dépasse 70, votre équipe se surpasse : +3 rating',
    mot3: 'Légende Vivante', mot3d: 'En matchs clés (quarts+), votre star joue à 130%',
    phy1: 'Blindage Total', phy1d: 'Zéro blessure pendant tout le tournoi',
    phy2: 'Machines', phy2d: '2ème mi-temps avec +3 rating. Dominez les 30 dernières min',
    phy3: 'Discipline Absolue', phy3d: 'JAMAIS de carton rouge. Contrôle total',
    close: 'Fermer',
  },
  de: {
    title: 'Trainer-Fähigkeiten',
    points: 'Verfügbare Punkte',
    tactical: 'Taktik', motivational: 'Führung', physical: 'Vorbereitung',
    tac1: 'Das Orakel', tac1d: 'Exaktes Ergebnis vorhersagen. Bei Treffer: +5 auf ALLE Ressourcen',
    tac2: 'Totaler Architekt', tac2d: 'Alle 7 Formationen freischalten. Totale Anpassung',
    tac3: 'Mastermind', tac3d: 'Halbzeitentscheidungen haben DOPPELTEN Effekt',
    mot1: 'Gladiator', mot1d: 'Bei Rückstand: 30% Tor in den letzten 15 Min',
    mot2: 'Eiswand', mot2d: 'Bei Druck über 70 wächst dein Team: +3 Rating',
    mot3: 'Lebende Legende', mot3d: 'In K.o.-Spielen (Viertelfinale+) spielt dein Star auf 130%',
    phy1: 'Totaler Schild', phy1d: 'Null Verletzungen im gesamten Turnier',
    phy2: 'Maschinen', phy2d: '2. Halbzeit mit +3 Rating. Dominiere die letzten 30 Min',
    phy3: 'Absolute Disziplin', phy3d: 'NIE eine rote Karte. Totale Kontrolle',
    close: 'Schließen',
  },
  pt: {
    title: 'Habilidades do Treinador',
    points: 'Pontos disponíveis',
    tactical: 'Tática', motivational: 'Liderança', physical: 'Preparação',
    tac1: 'O Vidente', tac1d: 'Prever o resultado exato. Se acertar: +5 a TODOS os recursos',
    tac2: 'Arquiteto Total', tac2d: 'Desbloquear as 7 formações. Adaptação total',
    tac3: 'Mente Mestra', tac3d: 'Decisões do intervalo têm efeito DUPLO',
    mot1: 'Gladiador', mot1d: 'A perder: 30% de marcar nos últimos 15 min',
    mot2: 'Muro de Gelo', mot2d: 'Se a pressão passa 70, a equipa cresce: +3 rating',
    mot3: 'Lenda Viva', mot3d: 'Em jogos decisivos (quartos+), a estrela joga a 130%',
    phy1: 'Blindagem Total', phy1d: 'Zero lesões em todo o torneio',
    phy2: 'Máquinas', phy2d: '2ª parte com +3 rating. Domina os últimos 30 min',
    phy3: 'Disciplina Absoluta', phy3d: 'NUNCA cartão vermelho. Controlo total',
    close: 'Fechar',
  },
  it: {
    title: 'Abilità Allenatore',
    points: 'Punti disponibili',
    tactical: 'Tattica', motivational: 'Leadership', physical: 'Preparazione',
    tac1: 'L\'Oracolo', tac1d: 'Prevedi il risultato esatto. Se corretto: +5 a TUTTE le risorse',
    tac2: 'Architetto Totale', tac2d: 'Sblocca tutte e 7 le formazioni. Adattamento totale',
    tac3: 'Mente Suprema', tac3d: 'Le decisioni dell\'intervallo hanno effetto DOPPIO',
    mot1: 'Gladiatore', mot1d: 'In svantaggio: 30% di segnare negli ultimi 15 min',
    mot2: 'Muro di Ghiaccio', mot2d: 'Se la pressione supera 70, la squadra si esalta: +3 rating',
    mot3: 'Leggenda Vivente', mot3d: 'Nelle partite chiave (quarti+), la star gioca al 130%',
    phy1: 'Scudo Totale', phy1d: 'Zero infortuni in tutto il torneo',
    phy2: 'Macchine', phy2d: '2° tempo con +3 rating. Domina gli ultimi 30 min',
    phy3: 'Disciplina Assoluta', phy3d: 'MAI cartellino rosso. Controllo totale',
    close: 'Chiudi',
  },
};

const PERK_TREE = [
  {
    branch: 'tactical',
    color: '#3b82f6',
    emoji: '🧠',
    perks: [
      { id: 'tac1', effect: { resultPredictor: true } },
      { id: 'tac2', effect: { unlockAllFormations: true } },
      { id: 'tac3', effect: { halftimeDoubleEffect: true } },
    ],
  },
  {
    branch: 'motivational',
    color: '#22c55e',
    emoji: '🔥',
    perks: [
      { id: 'mot1', effect: { comebackBoost: 0.30 } },
      { id: 'mot2', effect: { pressureRatingBoost: true } },
      { id: 'mot3', effect: { starKnockoutBoost: true } },
    ],
  },
  {
    branch: 'physical',
    color: '#f59e0b',
    emoji: '💪',
    perks: [
      { id: 'phy1', effect: { noInjuries: true } },
      { id: 'phy2', effect: { secondHalfBoost: 3 } },
      { id: 'phy3', effect: { noRedCards: true } },
    ],
  },
];

export default function WorldCupPerks({ perks, skillPoints, onUnlock, onClose, starPlayer }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'es';
  const ui = PERKS_I18N[lang] || PERKS_I18N.es;

  const unlockedPerks = perks || {};
  const available = skillPoints || 0;

  const canUnlock = (branchIdx, perkIdx) => {
    if (available <= 0) return false;
    const branch = PERK_TREE[branchIdx];
    const perkId = branch.perks[perkIdx].id;
    if (unlockedPerks[perkId]) return false;
    if (perkIdx > 0 && !unlockedPerks[branch.perks[perkIdx - 1].id]) return false;
    return true;
  };

  const handleUnlock = (branchIdx, perkIdx) => {
    if (!canUnlock(branchIdx, perkIdx)) return;
    const perk = PERK_TREE[branchIdx].perks[perkIdx];
    onUnlock(perk.id, perk.effect);
  };

  return (
    <div className="wc-perks-overlay" onClick={onClose}>
      <div className="wc-perks" onClick={e => e.stopPropagation()}>
        <div className="wc-perks__header">
          <h2>{ui.title}</h2>
          <div className="wc-perks__points">
            <span className="wc-perks__points-num">{available}</span>
            <span className="wc-perks__points-label">{ui.points}</span>
          </div>
          <button className="wc-perks__close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="wc-perks__tree">
          {PERK_TREE.map((branch, bi) => (
            <div key={branch.branch} className="wc-perks__branch" style={{ '--branch-color': branch.color }}>
              <div className="wc-perks__branch-header">
                <span>{branch.emoji}</span>
                <span>{ui[branch.branch]}</span>
              </div>
              <div className="wc-perks__nodes">
                {branch.perks.map((perk, pi) => {
                  const unlocked = !!unlockedPerks[perk.id];
                  const available2 = canUnlock(bi, pi);
                  return (
                    <button
                      key={perk.id}
                      className={`wc-perks__node ${unlocked ? 'wc-perks__node--unlocked' : ''} ${available2 ? 'wc-perks__node--available' : ''}`}
                      onClick={() => handleUnlock(bi, pi)}
                      disabled={!available2}
                    >
                      <div className="wc-perks__node-diamond">
                        {unlocked ? <Check size={16} /> : available2 ? <span className="wc-perks__node-plus">+</span> : <Lock size={14} />}
                      </div>
                      <span className="wc-perks__node-label">{ui[perk.id]}</span>
                      <span className="wc-perks__node-desc">
                        {perk.id === 'mot3' && starPlayer
                          ? `${ui[perk.id + 'd']} (${starPlayer})`
                          : ui[perk.id + 'd']}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
