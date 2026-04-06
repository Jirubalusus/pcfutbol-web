import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { GLORY_CARDS, GLORY_DIVISIONS } from '../../game/gloryEngine';
import { BadgePreview } from './BadgeEditor';
import ReplayMatchModal from './ReplayMatchModal';
import LegalTheftModal from './LegalTheftModal';
import BlackMarketModal from './BlackMarketModal';
import ForcedSwapModal from './ForcedSwapModal';
import {
  Dna, Landmark, Eye, Sparkles, CloudRain, Target,
  HeartPulse, Crown, BadgeDollarSign, LayoutGrid, ShieldHalf, Zap,
  Handshake, Megaphone, GraduationCap, RotateCcw, Shuffle,
  Trophy, Star, Swords, Mountain, ChevronRight,
  Skull, Coins, Crosshair, ArrowLeftRight, FileText, Banknote, UserPlus
} from 'lucide-react';
import './GloryMode.scss';

const ICON_MAP = {
  Dna, Landmark, Eye, Sparkles, CloudRain, Target,
  HeartPulse, Crown, BadgeDollarSign, LayoutGrid, ShieldHalf, Zap,
  Handshake, Megaphone, GraduationCap, RotateCcw, Shuffle,
  Skull, Coins, Crosshair, ArrowLeftRight, FileText, Banknote, Swords, UserPlus,
};

const TIER_LABELS = { S: 'LEGENDARIA', A: 'ÉPICA', B: 'RARA' };
const TIER_CLASSES = { S: 'legendary', A: 'epic', B: 'rare' };

// Cards that have an interactive "use" action
const USABLE_CARD_IDS = ['second_chance', 'legal_theft', 'black_market', 'forced_swap', 'diplomat'];

// Status descriptions for each perk (shown in card)
function getPerkStatus(cardId, state) {
  const perks = state.gloryData?.perks || {};
  const gloryData = state.gloryData || {};
  
  switch (cardId) {
    case 'perfect_clone':
      return { status: 'Aplicado', desc: 'Tu mejor jugador fue clonado al recoger esta carta' };
    case 'ghost_sheikh':
      return gloryData.sheikhSeasons > 0
        ? { status: `${gloryData.sheikhSeasons} temporada(s) restante(s)`, desc: 'Presupuesto x10 activo', active: true }
        : { status: 'Expirado', desc: 'El jeque se fue. El presupuesto volvió a la normalidad' };
    case 'future_scout':
      return { status: 'Activo', desc: 'Ves el potencial de los jugadores en el mercado', active: true };
    case 'fountain_of_youth':
      return { status: 'Aplicado', desc: 'Todos tus jugadores rejuvenecieron 3 años' };
    case 'cursed_stadium':
      return { status: 'Activo', desc: '+20% rendimiento local, -15% rival en casa', active: true };
    case 'penalty_master':
      return { status: 'Activo', desc: 'Tu equipo nunca falla penaltis', active: true };
    case 'dr_miracles':
      return { status: 'Activo', desc: 'Lesiones limitadas a 1 semana máximo', active: true };
    case 'local_legend':
      return { status: 'Activo', desc: 'Tu mejor canterano gana +3 OVR cada temporada', active: true };
    case 'legal_theft':
      return gloryData.legalTheftUsed
        ? { status: 'Usado este mercado', desc: 'Se recarga en el próximo mercado' }
        : { status: '1 uso disponible', desc: 'Ficha a cualquier jugador al 50%', active: true };
    case 'tactical_wildcard':
      return { status: 'Activo', desc: 'Formaciones 2-3-5 y 3-1-3-3 desbloqueadas', active: true };
    case 'the_wall':
      return { status: 'Aplicado', desc: 'Tu portero titular recibió +15 OVR', };
    case 'max_speed':
      return { status: 'Aplicado', desc: 'Delanteros +10 velocidad, -5 defensa' };
    case 'fame':
      return { status: 'Activo', desc: `Ingresos por sponsors x${gloryData.sponsorMultiplier || 2}`, active: true };
    case 'golden_academy':
      return { status: 'Activo', desc: 'Aparece un canterano 70+ OVR cada temporada', active: true };
    case 'wild_card':
      return { status: 'Activo', desc: 'Recibes un jugador aleatorio cada temporada', active: true };
    case 'black_market':
      return gloryData.blackMarketUsed
        ? { status: 'Usado', desc: 'Ya elegiste tu leyenda' }
        : { status: '1 uso disponible', desc: 'Elige una leyenda retirada', active: true };
    case 'double_or_nothing':
      return { status: 'Activo', desc: 'Apuesta antes de cada partido', active: true };
    case 'achilles_heel':
      return { status: 'Activo', desc: 'Lesiona a un rival antes de un partido', active: true };
    case 'forced_swap':
      return gloryData.forcedSwapUsed
        ? { status: 'Usado', desc: 'Ya usaste tu intercambio' }
        : { status: '1 uso disponible', desc: 'Intercambia un jugador por uno rival', active: true };
    case 'secret_clause':
      return { status: 'Activo', desc: 'Fichajes: +2 años contrato, -30% salario', active: true };
    case 'goal_bonus': {
      const earned = gloryData.goalBonusEarned || 0;
      return {
        status: 'Activo',
        desc: `+50.000€ por gol · Ganado: ${earned.toLocaleString('es-ES')}€`,
        active: true
      };
    }
    case 'gladiator':
      return { status: 'Activo', desc: 'Tus jugadores son inmunes a rojas', active: true };
    case 'second_chance': {
      const replays = gloryData.replaysLeft || 0;
      return replays > 0
        ? { status: `${replays} uso(s) restante(s)`, desc: 'Rejuga un partido perdido', active: true }
        : { status: 'Agotado', desc: 'Se recarga la próxima temporada' };
    }
    case 'diplomat':
      return gloryData.diplomatUsed
        ? { status: 'Usado', desc: 'Un solo uso' }
        : { status: '1 uso disponible', desc: 'Renueva +3 años a un jugador', active: true };
    default:
      return { status: 'Activo', desc: '', active: true };
  }
}

function DiplomatModal({ onClose }) {
  const { state, dispatch } = useGame();
  const players = state.team?.players || [];
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);

  const handleConfirm = () => {
    if (!selected) return;
    // Add +3 years to selected player's contract
    const updatedPlayers = players.map(p =>
      p.name === selected.name ? { ...p, contractYears: (p.contractYears || 1) + 3 } : p
    );
    dispatch({ type: 'UPDATE_TEAM', payload: { players: updatedPlayers } });
    dispatch({
      type: 'UPDATE_GLORY_STATE',
      payload: { gloryData: { ...state.gloryData, diplomatUsed: true } }
    });
    setDone(true);
  };

  return (
    <div className="glory-modal-overlay" onClick={onClose}>
      <div className="glory-modal glory-modal--diplomat" onClick={e => e.stopPropagation()}>
        <button className="glory-modal__close" onClick={onClose}><span>✕</span></button>
        <Handshake size={32} color="#26c6da" />
        <h3>Diplomático</h3>
        <p className="glory-modal__desc">Elige un jugador para renovarle +3 años de contrato</p>

        {done ? (
          <div className="glory-modal__success">
            <Star size={28} color="#ffd740" />
            <p><strong>{selected.name}</strong> renovado — ahora tiene {(selected.contractYears || 1) + 3} años de contrato</p>
            <button className="glory-modal__btn" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <>
            <div className="glory-modal__player-list">
              {players
                .filter(p => !p.onLoan)
                .sort((a, b) => (b.overall || 0) - (a.overall || 0))
                .map(p => (
                  <button
                    key={p.name}
                    className={`glory-modal__player-row ${selected?.name === p.name ? 'glory-modal__player-row--selected' : ''}`}
                    onClick={() => setSelected(p)}
                  >
                    <span className="glory-modal__player-pos">{p.position}</span>
                    <span className="glory-modal__player-name">{p.name}</span>
                    <span className="glory-modal__player-ovr">{p.overall}</span>
                    <span className="glory-modal__player-contract">{p.contractYears || 1}a</span>
                  </button>
                ))}
            </div>
            <button
              className="glory-modal__btn"
              disabled={!selected}
              onClick={handleConfirm}
            >
              Renovar +3 años
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function GloryPerks() {
  const { state } = useGame();
  const gloryData = state.gloryData || {};
  const pickedCards = gloryData.pickedCards || [];
  const perks = gloryData.perks || {};
  const replaysLeft = gloryData.replaysLeft || 0;
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [showTheftModal, setShowTheftModal] = useState(false);
  const [showBlackMarket, setShowBlackMarket] = useState(false);
  const [showForcedSwap, setShowForcedSwap] = useState(false);
  const [showDiplomat, setShowDiplomat] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

  // Get full card info for picked cards
  const collectedCards = pickedCards
    .map(id => GLORY_CARDS.find(c => c.id === id))
    .filter(Boolean);

  // Separate
  const usableCards = collectedCards.filter(c => USABLE_CARD_IDS.includes(c.id));
  const passiveCards = collectedCards.filter(c => !USABLE_CARD_IDS.includes(c.id));

  // Current division info
  const currentDiv = GLORY_DIVISIONS.find(d => d.id === gloryData.division) || GLORY_DIVISIONS[0];
  const season = gloryData.season || 1;
  const history = gloryData.history || [];

  // Check availability for usable cards
  const hasPlayedMatches = (state.fixtures || []).some(f =>
    f.played && (f.homeTeam === state.teamId || f.awayTeam === state.teamId)
  );

  const isCardAvailable = (card) => {
    switch (card.id) {
      case 'second_chance':
        return perks.secondChance && replaysLeft > 0 && hasPlayedMatches;
      case 'legal_theft':
        return perks.legalTheft && !gloryData.legalTheftUsed;
      case 'black_market':
        return perks.blackMarket && !gloryData.blackMarketUsed;
      case 'forced_swap':
        return perks.forcedSwap && !gloryData.forcedSwapUsed;
      case 'diplomat':
        return perks.diplomat && !gloryData.diplomatUsed;
      default:
        return false;
    }
  };

  const handleCardClick = (card) => {
    if (!isCardAvailable(card)) return;
    switch (card.id) {
      case 'second_chance':
        setShowReplayModal(true);
        break;
      case 'legal_theft':
        setShowTheftModal(true);
        break;
      case 'black_market':
        setShowBlackMarket(true);
        break;
      case 'forced_swap':
        setShowForcedSwap(true);
        break;
      case 'diplomat':
        setShowDiplomat(true);
        break;
    }
  };

  const renderCardIcon = (card) => {
    const IconComponent = ICON_MAP[card.icon];
    if (!IconComponent) return <Star size={24} />;
    return <IconComponent size={24} />;
  };

  return (
    <div className="glory-perks">
      {/* Header */}
      <div className="glory-perks__header">
        <div className="glory-perks__header-info">
          {gloryData.badge && <BadgePreview badge={gloryData.badge} size={48} />}
          <div>
            <h2 className="glory-perks__title">
              <Mountain size={20} /> Camino a la Gloria
            </h2>
            <div className="glory-perks__subtitle">
              <span>{currentDiv.name}</span>
              <span className="glory-perks__separator">·</span>
              <span>Temporada {season}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="glory-perks__stats">
        <div className="glory-perks__stat">
          <Trophy size={16} />
          <span className="glory-perks__stat-value">{history.filter(h => h.promoted).length}</span>
          <span className="glory-perks__stat-label">Ascensos</span>
        </div>
        <div className="glory-perks__stat">
          <Star size={16} />
          <span className="glory-perks__stat-value">{pickedCards.length}</span>
          <span className="glory-perks__stat-label">Cartas</span>
        </div>
        <div className="glory-perks__stat">
          <Swords size={16} />
          <span className="glory-perks__stat-value">{season}</span>
          <span className="glory-perks__stat-label">Temporada</span>
        </div>
      </div>

      {/* Usable cards */}
      {usableCards.length > 0 && (
        <div className="glory-perks__section">
          <h3 className="glory-perks__section-title">
            <Zap size={16} /> Mejoras Activables
          </h3>
          {usableCards.map(card => {
            const available = isCardAvailable(card);
            const perkStatus = getPerkStatus(card.id, state);
            return (
              <div
                key={card.id}
                className={`glory-perks__card glory-perks__card--usable glory-perks__card--${TIER_CLASSES[card.tier]} ${available ? 'glory-perks__card--available' : ''}`}
                onClick={() => handleCardClick(card)}
                role={available ? 'button' : undefined}
                style={available ? { cursor: 'pointer' } : undefined}
              >
                <div className="glory-perks__card-icon" style={{ color: card.color }}>
                  {renderCardIcon(card)}
                </div>
                <div className="glory-perks__card-info">
                  <div className="glory-perks__card-header">
                    <span className="glory-perks__card-name">{card.name}</span>
                    <span className={`glory-perks__card-tier glory-perks__card-tier--${TIER_CLASSES[card.tier]}`}>
                      {TIER_LABELS[card.tier]}
                    </span>
                  </div>
                  <p className="glory-perks__card-desc">{card.description}</p>
                  <div className="glory-perks__card-uses">
                    <span className={`glory-perks__card-uses-count ${perkStatus.active ? '' : 'exhausted'}`}>
                      {perkStatus.status}
                    </span>
                    {available ? (
                      <span className="glory-perks__card-cta">
                        <ChevronRight size={12} /> Toca para usar
                      </span>
                    ) : (
                      <span className="glory-perks__card-hint">{perkStatus.desc}</span>
                    )}
                  </div>
                </div>
                {available && <ChevronRight size={18} className="glory-perks__card-chevron" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Passive cards */}
      {passiveCards.length > 0 && (
        <div className="glory-perks__section">
          <h3 className="glory-perks__section-title">
            <Star size={16} /> Mejoras Permanentes
          </h3>
          {passiveCards.map(card => {
            const perkStatus = getPerkStatus(card.id, state);
            const isExpanded = expandedCard === card.id;
            const hasDropdown = card.id === 'wild_card' && (gloryData.wildCardPlayers || []).length > 0;
            const hasGoldenDropdown = card.id === 'golden_academy';
            return (
              <div key={card.id}>
                <div
                  className={`glory-perks__card glory-perks__card--${TIER_CLASSES[card.tier]} ${hasDropdown ? 'glory-perks__card--expandable' : ''}`}
                  onClick={hasDropdown ? () => setExpandedCard(isExpanded ? null : card.id) : undefined}
                  style={hasDropdown ? { cursor: 'pointer' } : undefined}
                >
                  <div className="glory-perks__card-icon" style={{ color: card.color }}>
                    {renderCardIcon(card)}
                  </div>
                  <div className="glory-perks__card-info">
                    <div className="glory-perks__card-header">
                      <span className="glory-perks__card-name">{card.name}</span>
                      <span className={`glory-perks__card-tier glory-perks__card-tier--${TIER_CLASSES[card.tier]}`}>
                        {TIER_LABELS[card.tier]}
                      </span>
                    </div>
                    <p className="glory-perks__card-desc">{card.description}</p>
                    <div className="glory-perks__card-status">
                      <span className={`glory-perks__card-active ${perkStatus.active ? '' : 'glory-perks__card-active--expired'}`}>
                        {perkStatus.status}
                      </span>
                      {perkStatus.desc && (
                        <span className="glory-perks__card-status-desc">{perkStatus.desc}</span>
                      )}
                    </div>
                  </div>
                  {hasDropdown && (
                    <ChevronRight size={18} className={`glory-perks__card-chevron ${isExpanded ? 'glory-perks__card-chevron--open' : ''}`} />
                  )}
                </div>
                {/* Wild Card player list dropdown */}
                {card.id === 'wild_card' && isExpanded && (
                  <div className="glory-perks__dropdown">
                    <div className="glory-perks__dropdown-title">Jugadores traídos por Wild Card</div>
                    {(gloryData.wildCardPlayers || []).map((p, i) => (
                      <div key={i} className="glory-perks__dropdown-player">
                        <span className="glory-perks__dropdown-pos">{p.position}</span>
                        <span className="glory-perks__dropdown-name">{p.name}</span>
                        <span className="glory-perks__dropdown-age">{p.age}a</span>
                        <span className={`glory-perks__dropdown-ovr ${p.overall >= 72 ? 'good' : p.overall >= 55 ? 'avg' : 'bad'}`}>
                          {p.overall}
                        </span>
                        <span className="glory-perks__dropdown-season">T{p.season}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {pickedCards.length === 0 && (
        <div className="glory-perks__empty">
          <Star size={48} />
          <h3>Sin mejoras todavía</h3>
          <p>Completa una temporada para elegir tu primera carta de mejora.</p>
        </div>
      )}

      {/* Modals */}
      {showReplayModal && <ReplayMatchModal onClose={() => setShowReplayModal(false)} />}
      {showTheftModal && <LegalTheftModal onClose={() => setShowTheftModal(false)} />}
      {showBlackMarket && <BlackMarketModal onClose={() => setShowBlackMarket(false)} />}
      {showForcedSwap && <ForcedSwapModal onClose={() => setShowForcedSwap(false)} />}
      {showDiplomat && (
        <DiplomatModal onClose={() => setShowDiplomat(false)} />
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="glory-perks__section">
          <h3 className="glory-perks__section-title">
            <Trophy size={16} /> Historial
          </h3>
          <div className="glory-perks__history">
            {history.map((h, i) => {
              const div = GLORY_DIVISIONS.find(d => d.id === h.division);
              return (
                <div key={i} className={`glory-perks__history-item ${h.promoted ? 'glory-perks__history-item--promoted' : ''}`}>
                  <span className="glory-perks__history-season">T{h.season}</span>
                  <span className="glory-perks__history-div">{div?.name || h.division}</span>
                  <span className="glory-perks__history-pos">{h.position}º</span>
                  {h.promoted && <span className="glory-perks__history-badge">Ascenso</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
