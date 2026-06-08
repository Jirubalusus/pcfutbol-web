import React, { useState, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { X, BadgeDollarSign, Search, Check, ChevronRight, Star } from 'lucide-react';
import { translatePosition } from '../../game/positionNames';
import { formatTransferPrice, calculateMarketValue } from '../../game/globalTransferEngine';
import { generateSalary } from '../../game/salaryGenerator';
import { assignRole } from '../../game/playerRoles';
import './GloryMode.scss';

/**
 * LegalTheftModal — "Robo Legal" perk
 * Browse any player from rival teams, sign at 50% market value. 1 per transfer window.
 */
export default function LegalTheftModal({ onClose }) {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [phase, setPhase] = useState('browse'); // browse | confirm | done
  const [posFilter, setPosFilter] = useState('all');

  const leagueTeams = state.leagueTeams || [];
  const myTeamId = state.teamId;

  // Get all players from league teams (excluding own team)
  const allPlayers = useMemo(() => {
    const players = [];
    for (const team of leagueTeams) {
      if (team.id === myTeamId) continue;
      if (!team.players) continue;
      for (const p of team.players) {
        players.push({
          ...p,
          teamId: team.id,
          teamName: team.name || team.shortName || team.id,
          marketValue: calculateMarketValue(p, state.leagueId),
        });
      }
    }
    return players.sort((a, b) => b.overall - a.overall);
  }, [leagueTeams, myTeamId, state.leagueId]);

  // Filter
  const filtered = useMemo(() => {
    let result = allPlayers;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q));
    }
    if (posFilter !== 'all') {
      result = result.filter(p => p.position === posFilter);
    }
    return result.slice(0, 50); // Limit for performance
  }, [allPlayers, search, posFilter]);

  const handleSteal = () => {
    if (!selectedPlayer) return;

    const halfPrice = Math.round(selectedPlayer.marketValue * 0.5);
    
    if (halfPrice > state.money) {
      import('sileo').then(({ sileo }) => sileo.warning({ title: t('glory.theft.noBudget') }));
      return;
    }

    // Generate proper salary and role for the player
    const salary = selectedPlayer.salary || generateSalary(selectedPlayer, state.leagueId);
    const role = selectedPlayer.role || assignRole(selectedPlayer);

    const newPlayer = {
      ...selectedPlayer,
      salary,
      role,
      contractYears: 3,
      morale: 80,
      goals: 0,
      assists: 0,
      matchesPlayed: 0,
      yellowCards: 0,
      redCards: 0,
      injured: false,
      injuryWeeksLeft: 0,
    };

    // Remove extra fields
    delete newPlayer.teamId;
    delete newPlayer.teamName;
    delete newPlayer.marketValue;

    // Add to squad and deduct money
    const updatedPlayers = [...(state.team?.players || []), newPlayer];
    dispatch({
      type: 'UPDATE_GLORY_STATE',
      payload: {
        team: { ...state.team, players: updatedPlayers },
        money: state.money - halfPrice,
        gloryData: {
          ...state.gloryData,
          legalTheftUsed: true, // Track usage this window
        },
      },
    });

    setPhase('done');
  };

  const POSITIONS = ['all', 'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

  if (phase === 'done') {
    return (
      <div className="theft-modal__overlay" onClick={onClose}>
        <div className="theft-modal theft-modal--done" onClick={e => e.stopPropagation()}>
          <div className="theft-modal__done-icon">
            <Check size={48} />
          </div>
          <h2>{t('glory.theft.done')}</h2>
          <p>
            <Trans
              i18nKey="glory.theft.joined"
              values={{ name: selectedPlayer.name, price: formatTransferPrice(Math.round(selectedPlayer.marketValue * 0.5)) }}
              components={[<strong key="0" />]}
            />
          </p>
          <p className="theft-modal__done-note">{t('glory.theft.doneNote', { value: formatTransferPrice(selectedPlayer.marketValue) })}</p>
          <button className="theft-modal__btn theft-modal__btn--primary" onClick={onClose}>
            {t('glory.theft.close')}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'confirm' && selectedPlayer) {
    const halfPrice = Math.round(selectedPlayer.marketValue * 0.5);
    const canAfford = halfPrice <= state.money;

    return (
      <div className="theft-modal__overlay" onClick={() => setPhase('browse')}>
        <div className="theft-modal theft-modal--confirm" onClick={e => e.stopPropagation()}>
          <div className="theft-modal__header">
            <h2><BadgeDollarSign size={20} /> {t('glory.theft.confirmTitle')}</h2>
            <button className="theft-modal__close" onClick={() => setPhase('browse')}><X size={18} /></button>
          </div>

          <div className="theft-modal__player-card">
            <div className="theft-modal__player-ovr">{selectedPlayer.overall}</div>
            <div className="theft-modal__player-info">
              <h3>{selectedPlayer.name}</h3>
              <span className="theft-modal__player-pos">{translatePosition(selectedPlayer.position)}</span>
              <span className="theft-modal__player-team">{selectedPlayer.teamName}</span>
            </div>
            {state.gloryData?.perks?.futureScout && selectedPlayer.potential && (
              <div className="theft-modal__player-potential">
                <Star size={12} /> {t('glory.theft.potential')} {selectedPlayer.potential}
              </div>
            )}
          </div>

          <div className="theft-modal__price-compare">
            <div className="theft-modal__price-item theft-modal__price-item--old">
              <span className="label">{t('glory.theft.marketValue')}</span>
              <span className="price">{formatTransferPrice(selectedPlayer.marketValue)}</span>
            </div>
            <ChevronRight size={16} />
            <div className="theft-modal__price-item theft-modal__price-item--new">
              <span className="label">{t('glory.theft.yourPrice')}</span>
              <span className="price">{formatTransferPrice(halfPrice)}</span>
            </div>
          </div>

          <div className="theft-modal__budget">
            <span>{t('glory.theft.yourBudget')} <strong>{formatTransferPrice(state.money)}</strong></span>
            {canAfford && <span className="theft-modal__budget-after">{t('glory.theft.after')} {formatTransferPrice(state.money - halfPrice)}</span>}
          </div>

          <div className="theft-modal__actions">
            <button
              className="theft-modal__btn theft-modal__btn--primary"
              onClick={handleSteal}
              disabled={!canAfford}
            >
              {canAfford ? t('glory.theft.signHalf') : t('glory.theft.insufficient')}
            </button>
            <button className="theft-modal__btn theft-modal__btn--secondary" onClick={() => setPhase('browse')}>
              {t('glory.theft.back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Browse phase
  return (
    <div className="theft-modal__overlay" onClick={onClose}>
      <div className="theft-modal" onClick={e => e.stopPropagation()}>
        <div className="theft-modal__header">
          <h2><BadgeDollarSign size={20} /> {t('glory.theft.title')}</h2>
          <button className="theft-modal__close" onClick={onClose}><X size={18} /></button>
        </div>

        <p className="theft-modal__desc">{t('glory.theft.desc')}</p>

        <div className="theft-modal__search">
          <Search size={16} />
          <input
            type="text"
            placeholder={t('glory.theft.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="theft-modal__filters">
          {POSITIONS.map(pos => (
            <button
              key={pos}
              className={`theft-modal__filter ${posFilter === pos ? 'active' : ''}`}
              onClick={() => setPosFilter(pos)}
            >
              {pos === 'all' ? t('glory.theft.all') : pos}
            </button>
          ))}
        </div>

        <div className="theft-modal__list">
          {filtered.map(player => (
            <button
              key={player.id || player.name}
              className="theft-modal__item"
              onClick={() => { setSelectedPlayer(player); setPhase('confirm'); }}
            >
              <span className="theft-modal__item-ovr">{player.overall}</span>
              <div className="theft-modal__item-info">
                <span className="theft-modal__item-name">{player.name}</span>
                <span className="theft-modal__item-meta">
                  {translatePosition(player.position)} · {player.age} {t('glory.theft.years')} · {player.teamName}
                </span>
              </div>
              <div className="theft-modal__item-price">
                <span className="theft-modal__item-price-old">{formatTransferPrice(player.marketValue)}</span>
                <span className="theft-modal__item-price-new">{formatTransferPrice(Math.round(player.marketValue * 0.5))}</span>
              </div>
              <ChevronRight size={14} />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="theft-modal__empty">{t('glory.theft.empty')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
