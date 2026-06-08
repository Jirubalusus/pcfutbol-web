import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { GLORY_CARDS, GLORY_DIVISIONS, getActiveGloryCombos, applyStarSigningRoulette } from '../../game/gloryEngine';
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

const TIER_LABEL_KEYS = { S: 'glory.cards.tierLegendary', A: 'glory.cards.tierEpic', B: 'glory.cards.tierRare' };
const TIER_CLASSES = { S: 'legendary', A: 'epic', B: 'rare' };

// Cards that have an interactive "use" action
const USABLE_CARD_IDS = ['second_chance', 'legal_theft', 'black_market', 'forced_swap', 'diplomat', 'star_signing', 'double_or_nothing'];

// Status descriptions for each perk (shown in card)
function getPerkStatus(cardId, state, t) {
  const perks = state.gloryData?.perks || {};
  const gloryData = state.gloryData || {};
  const fmt = (amount) => Number(amount || 0).toLocaleString('es-ES');

  switch (cardId) {
    case 'perfect_clone':
      return { status: t('glory.perkStatus.applied'), desc: t('glory.perkStatus.clone') };
    case 'ghost_sheikh':
      return gloryData.sheikhSeasons > 0
        ? { status: t('glory.perkStatus.sheikhActiveStatus', { count: gloryData.sheikhSeasons }), desc: t('glory.perkStatus.sheikhActive'), active: true }
        : { status: t('glory.perkStatus.expired'), desc: t('glory.perkStatus.sheikhExpired') };
    case 'future_scout':
      return { status: t('glory.perkStatus.scoutStatus', { count: gloryData.futureScoutMarks ?? 1 }), desc: t('glory.perkStatus.scoutDesc'), active: true };
    case 'fountain_of_youth':
      return { status: t('glory.perkStatus.applied'), desc: t('glory.perkStatus.fountainDesc') };
    case 'cursed_stadium':
      return { status: t('glory.perkStatus.active'), desc: t('glory.perkStatus.cursedDesc'), active: true };
    case 'penalty_master':
      return { status: t('glory.perkStatus.active'), desc: t('glory.perkStatus.penaltyDesc'), active: true };
    case 'dr_miracles':
      return { status: t('glory.perkStatus.active'), desc: t('glory.perkStatus.drMiraclesDesc'), active: true };
    case 'local_legend':
      return { status: t('glory.perkStatus.active'), desc: t('glory.perkStatus.localLegendDesc'), active: true };
    case 'legal_theft':
      return gloryData.legalTheftUsed
        ? { status: t('glory.perkStatus.usedThisWindow'), desc: t('glory.perkStatus.theftReload') }
        : { status: t('glory.perkStatus.oneUse'), desc: t('glory.perkStatus.theftDesc'), active: true };
    case 'tactical_wildcard':
      return { status: t('glory.perkStatus.active'), desc: t('glory.perkStatus.tacticalDesc'), active: true };
    case 'the_wall':
      return { status: perks.imbatibleKeeper ? t('glory.perkStatus.wallTrait') : t('glory.perkStatus.applied'), desc: perks.imbatibleKeeper ? t('glory.perkStatus.wallTraitDesc') : t('glory.perkStatus.wallDesc'), active: !!perks.imbatibleKeeper };
    case 'max_speed':
      return { status: t('glory.perkStatus.applied'), desc: t('glory.perkStatus.maxSpeedDesc') };
    case 'fame':
      return { status: t('glory.perkStatus.active'), desc: t('glory.perkStatus.fameDesc', { mult: gloryData.sponsorMultiplier || 2 }), active: true };
    case 'golden_academy':
      return { status: t('glory.perkStatus.active'), desc: t('glory.perkStatus.goldenDesc'), active: true };
    case 'wild_card':
      return { status: t('glory.perkStatus.active'), desc: t('glory.perkStatus.wildDesc'), active: true };
    case 'black_market':
      return gloryData.blackMarketUsed
        ? { status: t('glory.perkStatus.used'), desc: t('glory.perkStatus.blackUsed') }
        : { status: t('glory.perkStatus.oneUse'), desc: t('glory.perkStatus.blackDesc'), active: true };
    case 'double_or_nothing':
      return gloryData.matchRouletteBet?.status === 'pending'
        ? { status: t('glory.perkStatus.betPending'), desc: t('glory.perkStatus.betPendingDesc', { percent: gloryData.matchRouletteBet.percent, amount: fmt(gloryData.matchRouletteBet.amount) }), active: false }
        : { status: t('glory.perkStatus.betAvailable'), desc: t('glory.perkStatus.betDesc'), active: true };
    case 'achilles_heel':
      return { status: t('glory.perkStatus.active'), desc: t('glory.perkStatus.achillesDesc'), active: true };
    case 'forced_swap':
      return gloryData.forcedSwapUsed
        ? { status: t('glory.perkStatus.used'), desc: t('glory.perkStatus.swapUsed') }
        : { status: t('glory.perkStatus.oneUse'), desc: t('glory.perkStatus.swapDesc'), active: true };
    case 'secret_clause':
      return { status: t('glory.perkStatus.active'), desc: t('glory.perkStatus.secretDesc'), active: true };
    case 'goal_bonus':
      return { status: t('glory.perkStatus.active'), desc: t('glory.perkStatus.goalBonusDesc', { earned: fmt(gloryData.goalBonusEarned || 0) }), active: true };
    case 'gladiator':
      return { status: t('glory.perkStatus.active'), desc: t('glory.perkStatus.gladiatorDesc'), active: true };
    case 'second_chance': {
      const replays = gloryData.replaysLeft || 0;
      return replays > 0
        ? { status: t('glory.perkStatus.replaysLeft', { count: replays }), desc: t('glory.perkStatus.replayDesc'), active: true }
        : { status: t('glory.perkStatus.exhausted'), desc: t('glory.perkStatus.exhaustedDesc') };
    }
    case 'diplomat':
      return gloryData.diplomatUsed
        ? { status: t('glory.perkStatus.used'), desc: t('glory.perkStatus.diplomatUsed') }
        : { status: t('glory.perkStatus.oneUse'), desc: t('glory.perkStatus.diplomatDesc'), active: true };
    case 'star_signing':
      return gloryData.starSigningAvailable
        ? { status: t('glory.perkStatus.starAvailable'), desc: t('glory.perkStatus.starAvailableDesc'), active: true }
        : gloryData.starSigningLast
          ? { status: t('glory.perkStatus.starDone'), desc: t('glory.perkStatus.starDoneDesc', { name: gloryData.starSigningLast.player?.name || 'Star', route: gloryData.starSigningLast.choice || 'roulette' }) }
          : { status: t('glory.perkStatus.starWaiting'), desc: t('glory.perkStatus.starWaitingDesc'), active: false };
    default:
      return { status: t('glory.perkStatus.active'), desc: '', active: true };
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
        <h3>{t('glory.diplomat.title')}</h3>
        <p className="glory-modal__desc">{t('glory.diplomat.desc')}</p>

        {done ? (
          <div className="glory-modal__success">
            <Star size={28} color="#ffd740" />
            <p><Trans i18nKey="glory.diplomat.success" values={{ name: selected.name, years: (selected.contractYears || 1) + 3 }} components={[<strong key="0" />]} /></p>
            <button className="glory-modal__btn" onClick={onClose}>{t('glory.common.close')}</button>
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
              {t('glory.diplomat.renew')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}


function StarSigningModal({ onClose }) {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const gloryData = state.gloryData || {};
  const choices = gloryData.starSigningChoices?.length
    ? gloryData.starSigningChoices
    : [];
  const [selected, setSelected] = useState(0);
  const [done, setDone] = useState(false);

  const handleConfirm = () => {
    const updatedGlory = applyStarSigningRoulette(gloryData, selected);
    dispatch({ type: 'UPDATE_GLORY_STATE', payload: { gloryData: updatedGlory, team: { ...state.team, players: updatedGlory.squad } } });
    setDone(true);
  };

  const result = state.gloryData?.starSigningLast;

  return (
    <div className="glory-modal-overlay" onClick={onClose}>
      <div className="glory-modal glory-modal--star-signing" onClick={e => e.stopPropagation()}>
        <button className="glory-modal__close" onClick={onClose}><span>✕</span></button>
        <UserPlus size={34} color="#ffab00" />
        <h3>{t('glory.starSigning.title')}</h3>
        <p className="glory-modal__desc">{t('glory.starSigning.desc')}</p>

        {done ? (
          <div className="glory-modal__success">
            <Star size={28} color="#ffd740" />
            <p><Trans i18nKey="glory.starSigning.success" values={{ name: result?.player?.name || 'New star' }} components={[<strong key="0" />]} /></p>
            {result?.replaced && <p className="glory-modal__microcopy">{t('glory.starSigning.out', { name: result.replaced.name })}</p>}
            <button className="glory-modal__btn" onClick={onClose}>{t('glory.common.close')}</button>
          </div>
        ) : choices.length === 0 ? (
          <div className="glory-modal__success">
            <p>{t('glory.starSigning.noRoulette')}</p>
            <button className="glory-modal__btn" onClick={onClose}>{t('glory.common.close')}</button>
          </div>
        ) : (
          <>
            <div className="glory-roulette">
              {choices.map((choice, index) => (
                <button
                  key={choice.archetype}
                  className={`glory-roulette__option ${selected === index ? 'glory-roulette__option--selected' : ''}`}
                  onClick={() => setSelected(index)}
                >
                  <span className="glory-roulette__label">{choice.label}</span>
                  <span className="glory-roulette__player">{choice.player.name}</span>
                  <span className="glory-roulette__meta">{choice.player.position} · {choice.player.overall} OVR · {choice.player.age}a</span>
                  <span className="glory-roulette__risk">{choice.risk}</span>
                </button>
              ))}
            </div>
            <button className="glory-modal__btn" onClick={handleConfirm}>{t('glory.starSigning.sign')}</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function GloryPerks() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const gloryData = state.gloryData || {};
  const pickedCards = gloryData.pickedCards || [];
  const perks = gloryData.perks || {};
  const replaysLeft = gloryData.replaysLeft || 0;
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [showTheftModal, setShowTheftModal] = useState(false);
  const [showBlackMarket, setShowBlackMarket] = useState(false);
  const [showForcedSwap, setShowForcedSwap] = useState(false);
  const [showDiplomat, setShowDiplomat] = useState(false);
  const [showStarSigning, setShowStarSigning] = useState(false);
  const [showBetRoulette, setShowBetRoulette] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

  // Get full card info for picked cards
  const collectedCards = pickedCards
    .map(id => GLORY_CARDS.find(c => c.id === id))
    .filter(Boolean);

  // Separate
  const usableCards = collectedCards.filter(c => USABLE_CARD_IDS.includes(c.id));
  const passiveCards = collectedCards.filter(c => !USABLE_CARD_IDS.includes(c.id));
  const comboProgress = getActiveGloryCombos(pickedCards);
  const activeCombos = comboProgress.filter(c => c.active);

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
      case 'star_signing':
        return perks.starSigning && !!gloryData.starSigningAvailable;
      case 'double_or_nothing':
        return perks.doubleOrNothing && state.money > 0 && gloryData.matchRouletteBet?.status !== 'pending';
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
      case 'star_signing':
        setShowStarSigning(true);
        break;
      case 'double_or_nothing':
        setShowBetRoulette(true);
        break;
    }
  };

  const placeRouletteBet = (percent) => {
    const amount = Math.max(0, Math.floor((state.money || 0) * percent / 100));
    if (!amount || gloryData.matchRouletteBet?.status === 'pending') return;
    dispatch({
      type: 'UPDATE_GLORY_STATE',
      payload: {
        gloryData: {
          ...gloryData,
          matchRouletteBet: {
            status: 'pending',
            percent,
            amount,
            placedSeason: state.season || gloryData.season || 1,
            placedWeek: state.currentWeek || 1,
            label: percent === 10 ? t('glory.bet.safeGreen') : percent === 25 ? t('glory.bet.boldGold') : percent === 50 ? t('glory.bet.strongRed') : t('glory.bet.allIn')
          }
        }
      }
    });
    setShowBetRoulette(false);
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
              <Mountain size={20} /> {t('glory.perks.title')}
            </h2>
            <div className="glory-perks__subtitle">
              <span>{currentDiv.name}</span>
              <span className="glory-perks__separator">·</span>
              <span>{t('glory.common.season')} {season}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="glory-perks__stats">
        <div className="glory-perks__stat">
          <Trophy size={16} />
          <span className="glory-perks__stat-value">{history.filter(h => h.promoted).length}</span>
          <span className="glory-perks__stat-label">{t('glory.perks.promotions')}</span>
        </div>
        <div className="glory-perks__stat">
          <Star size={16} />
          <span className="glory-perks__stat-value">{pickedCards.length}</span>
          <span className="glory-perks__stat-label">{t('glory.perks.cards')}</span>
        </div>
        <div className="glory-perks__stat">
          <Swords size={16} />
          <span className="glory-perks__stat-value">{season}</span>
          <span className="glory-perks__stat-label">{t('glory.perks.season')}</span>
        </div>
      </div>

      {/* Hidden combo bonuses */}
      {pickedCards.length > 0 && (
        <div className="glory-perks__section glory-perks__section--combos">
          <h3 className="glory-perks__section-title">
            <Sparkles size={16} /> {t('glory.perks.hiddenBonuses')}
          </h3>
          <div className="glory-combos">
            {comboProgress.map(combo => (
              <div
                key={combo.id}
                className={`glory-combos__item ${combo.active ? 'glory-combos__item--active' : ''}`}
                style={{ '--combo-color': combo.color }}
              >
                <div className="glory-combos__topline">
                  <span className="glory-combos__name">{combo.active ? t(`glory.combos.${combo.id}.name`, { defaultValue: combo.name }) : t('glory.perks.hiddenCombo')}</span>
                  <span className="glory-combos__counter">{combo.count}/{combo.cards.length}</span>
                </div>
                <div className="glory-combos__bar"><span style={{ width: `${Math.min(100, (combo.count / combo.min) * 100)}%` }} /></div>
                <p>{combo.active ? t(`glory.combos.${combo.id}.bonus`, { defaultValue: combo.bonus }) : t('glory.perks.comboLocked', { min: combo.min })}</p>
              </div>
            ))}
          </div>
          {activeCombos.length > 0 && (
            <div className="glory-perks__combo-summary">{t('glory.perks.activeCombos', { combos: activeCombos.map(c => t(`glory.combos.${c.id}.name`, { defaultValue: c.name })).join(' · ') })}</div>
          )}
        </div>
      )}

      {/* Usable cards */}
      {usableCards.length > 0 && (
        <div className="glory-perks__section">
          <h3 className="glory-perks__section-title">
            <Zap size={16} /> {t('glory.perks.usableUpgrades')}
          </h3>
          {usableCards.map(card => {
            const available = isCardAvailable(card);
            const perkStatus = getPerkStatus(card.id, state, t);
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
                    <span className="glory-perks__card-name">{t(`glory.cardData.${card.id}.name`, { defaultValue: card.name })}</span>
                    <span className={`glory-perks__card-tier glory-perks__card-tier--${TIER_CLASSES[card.tier]}`}>
                      {t(TIER_LABEL_KEYS[card.tier])}
                    </span>
                  </div>
                  <p className="glory-perks__card-desc">{t(`glory.cardData.${card.id}.description`, { defaultValue: card.description })}</p>
                  <div className="glory-perks__card-uses">
                    <span className={`glory-perks__card-uses-count ${perkStatus.active ? '' : 'exhausted'}`}>
                      {perkStatus.status}
                    </span>
                    {available ? (
                      <span className="glory-perks__card-cta">
                        <ChevronRight size={12} /> {t('glory.perks.tapToUse')}
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
            <Star size={16} /> {t('glory.perks.permanentUpgrades')}
          </h3>
          {passiveCards.map(card => {
            const perkStatus = getPerkStatus(card.id, state, t);
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
                      <span className="glory-perks__card-name">{t(`glory.cardData.${card.id}.name`, { defaultValue: card.name })}</span>
                      <span className={`glory-perks__card-tier glory-perks__card-tier--${TIER_CLASSES[card.tier]}`}>
                        {t(TIER_LABEL_KEYS[card.tier])}
                      </span>
                    </div>
                    <p className="glory-perks__card-desc">{t(`glory.cardData.${card.id}.description`, { defaultValue: card.description })}</p>
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
                    <div className="glory-perks__dropdown-title">{t('glory.perks.wildCardPlayers')}</div>
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
          <h3>{t('glory.perks.emptyTitle')}</h3>
          <p>{t('glory.perks.emptyDesc')}</p>
        </div>
      )}

      {/* Modals */}
      {showReplayModal && <ReplayMatchModal onClose={() => setShowReplayModal(false)} />}
      {showTheftModal && <LegalTheftModal onClose={() => setShowTheftModal(false)} />}
      {showBlackMarket && <BlackMarketModal onClose={() => setShowBlackMarket(false)} />}
      {showForcedSwap && <ForcedSwapModal onClose={() => setShowForcedSwap(false)} />}
      {showStarSigning && <StarSigningModal onClose={() => setShowStarSigning(false)} />}
      {showBetRoulette && (
        <div className="glory-modal-overlay" onClick={() => setShowBetRoulette(false)}>
          <div className="glory-modal glory-modal--bet-roulette" onClick={e => e.stopPropagation()}>
            <button className="glory-modal__close" onClick={() => setShowBetRoulette(false)}><span>✕</span></button>
            <div className="glory-bet-roulette__icon">🎰</div>
            <h3>{t('glory.bet.title')}</h3>
            <p className="glory-modal__desc">{t('glory.bet.desc')}</p>
            <div className="glory-bet-roulette__options">
              {[10, 25, 50, 100].map(percent => {
                const amount = Math.max(0, Math.floor((state.money || 0) * percent / 100));
                return (
                  <button key={percent} className={`glory-bet-roulette__option glory-bet-roulette__option--${percent}`} onClick={() => placeRouletteBet(percent)}>
                    <strong>{percent}%</strong>
                    <span>{percent === 10 ? t('glory.bet.safeGreen') : percent === 25 ? t('glory.bet.boldGold') : percent === 50 ? t('glory.bet.strongRed') : t('glory.bet.allIn')}</span>
                    <small>€{amount.toLocaleString('es-ES')}</small>
                  </button>
                );
              })}
            </div>
            <div className="glory-bet-roulette__rules">{t('glory.bet.rules')}</div>
          </div>
        </div>
      )}
      {showDiplomat && (
        <DiplomatModal onClose={() => setShowDiplomat(false)} />
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="glory-perks__section">
          <h3 className="glory-perks__section-title">
            <Trophy size={16} /> {t('glory.perks.history')}
          </h3>
          <div className="glory-perks__history">
            {history.map((h, i) => {
              const div = GLORY_DIVISIONS.find(d => d.id === h.division);
              return (
                <div key={i} className={`glory-perks__history-item ${h.promoted ? 'glory-perks__history-item--promoted' : ''}`}>
                  <span className="glory-perks__history-season">T{h.season}</span>
                  <span className="glory-perks__history-div">{div?.name || h.division}</span>
                  <span className="glory-perks__history-pos">{h.position}º</span>
                  {h.promoted && <span className="glory-perks__history-badge">{t('glory.perks.promotionBadge')}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
