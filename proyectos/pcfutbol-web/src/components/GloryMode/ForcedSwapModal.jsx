import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { X, ArrowLeftRight, Search, Check, ChevronRight } from 'lucide-react';
import { translatePosition } from '../../game/positionNames';
import { assignRole } from '../../game/playerRoles';
import { generateSalary } from '../../game/salaryGenerator';
import './GloryMode.scss';

/**
 * Forced Swap Modal — Exchange one of your players for a rival player of similar OVR
 */
export default function ForcedSwapModal({ onClose }) {
  const { state, dispatch } = useGame();
  const gloryData = state.gloryData || {};
  const [phase, setPhase] = useState('selectMine'); // selectMine → selectTheirs → confirm → done
  const [myPlayer, setMyPlayer] = useState(null);
  const [theirPlayer, setTheirPlayer] = useState(null);
  const [search, setSearch] = useState('');

  const myPlayers = useMemo(() => 
    (state.team?.players || []).sort((a, b) => b.overall - a.overall),
    [state.team]
  );

  // Find rival players within ±3 OVR of selected player
  const rivalPlayers = useMemo(() => {
    if (!myPlayer) return [];
    const minOvr = myPlayer.overall - 3;
    const maxOvr = myPlayer.overall + 3;
    const players = [];
    (state.leagueTeams || []).forEach(team => {
      if (team.id === state.teamId) return;
      (team.players || []).forEach(p => {
        if (p.overall >= minOvr && p.overall <= maxOvr) {
          players.push({ ...p, teamName: team.name, teamId: team.id });
        }
      });
    });
    return players.sort((a, b) => b.overall - a.overall);
  }, [myPlayer, state.leagueTeams, state.teamId]);

  const filteredRivals = useMemo(() => {
    if (!search) return rivalPlayers;
    const q = search.toLowerCase();
    return rivalPlayers.filter(p => p.name.toLowerCase().includes(q) || p.teamName?.toLowerCase().includes(q));
  }, [rivalPlayers, search]);

  const handleSwap = () => {
    if (!myPlayer || !theirPlayer) return;

    const newPlayer = {
      ...theirPlayer,
      role: assignRole(theirPlayer),
      contractYears: 3,
      salary: generateSalary(theirPlayer, state.playerLeagueId),
      teamId: state.teamId,
      morale: 75,
      fitness: 100,
    };

    // Remove my player, add theirs
    const updatedPlayers = state.team.players
      .filter(p => p.name !== myPlayer.name)
      .concat(newPlayer);

    // Remove their player from rival team, add mine
    const updatedLeagueTeams = (state.leagueTeams || []).map(t => {
      if (t.id === theirPlayer.teamId) {
        return {
          ...t,
          players: (t.players || [])
            .filter(p => p.name !== theirPlayer.name)
            .concat({ ...myPlayer, teamId: t.id })
        };
      }
      return t;
    });

    dispatch({
      type: 'UPDATE_GLORY_STATE',
      payload: {
        team: { ...state.team, players: updatedPlayers },
        leagueTeams: updatedLeagueTeams,
        gloryData: { ...gloryData, forcedSwapUsed: true }
      }
    });

    setPhase('done');
  };

  if (phase === 'done') {
    return (
      <div className="theft-modal__overlay" onClick={onClose}>
        <div className="theft-modal theft-modal--done" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Check size={48} style={{ color: '#66bb6a', marginBottom: 12 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Intercambio completado</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
              {myPlayer?.name} → {theirPlayer?.teamName}<br />
              {theirPlayer?.name} → Tu equipo
            </p>
            <button className="theft-modal__btn theft-modal__btn--primary" onClick={onClose} style={{ marginTop: 16 }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'confirm') {
    return (
      <div className="theft-modal__overlay" onClick={() => setPhase('selectTheirs')}>
        <div className="theft-modal theft-modal--confirm" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
          <div className="theft-modal__header">
            <h2><ArrowLeftRight size={20} /> Confirmar intercambio</h2>
            <button className="theft-modal__close" onClick={() => setPhase('selectTheirs')}><X size={18} /></button>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, textAlign: 'center', padding: 12, background: 'rgba(239,83,80,0.1)', borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: '#ef5350', fontWeight: 600, marginBottom: 4 }}>SALE</p>
                <p style={{ fontWeight: 700, color: '#fff' }}>{myPlayer?.name}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{myPlayer?.position} · {myPlayer?.overall} OVR</p>
              </div>
              <ArrowLeftRight size={20} style={{ color: 'rgba(255,255,255,0.4)' }} />
              <div style={{ flex: 1, textAlign: 'center', padding: 12, background: 'rgba(102,187,106,0.1)', borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: '#66bb6a', fontWeight: 600, marginBottom: 4 }}>ENTRA</p>
                <p style={{ fontWeight: 700, color: '#fff' }}>{theirPlayer?.name}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{theirPlayer?.position} · {theirPlayer?.overall} OVR</p>
              </div>
            </div>
            <button className="theft-modal__btn theft-modal__btn--primary" onClick={handleSwap} style={{ width: '100%' }}>
              Confirmar intercambio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Select their player
  if (phase === 'selectTheirs') {
    return (
      <div className="theft-modal__overlay" onClick={onClose}>
        <div className="theft-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
          <div className="theft-modal__header">
            <h2><ArrowLeftRight size={20} /> Elige rival (±3 OVR de {myPlayer?.overall})</h2>
            <button className="theft-modal__close" onClick={() => setPhase('selectMine')}><X size={18} /></button>
          </div>
          <div className="theft-modal__search">
            <Search size={16} />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="theft-modal__list">
            {filteredRivals.map((player, i) => (
              <button key={i} className="theft-modal__item" onClick={() => { setTheirPlayer(player); setPhase('confirm'); }}>
                <span className="theft-modal__item-ovr">{player.overall}</span>
                <div className="theft-modal__item-info">
                  <span className="theft-modal__item-name">{player.name}</span>
                  <span className="theft-modal__item-meta">{translatePosition(player.position)} · {player.age} años · {player.teamName}</span>
                </div>
                <ChevronRight size={14} />
              </button>
            ))}
            {filteredRivals.length === 0 && <div className="theft-modal__empty">No hay jugadores de media similar</div>}
          </div>
        </div>
      </div>
    );
  }

  // Select my player
  return (
    <div className="theft-modal__overlay" onClick={onClose}>
      <div className="theft-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="theft-modal__header">
          <h2><ArrowLeftRight size={20} /> Elige tu jugador para intercambiar</h2>
          <button className="theft-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="theft-modal__desc">Elige uno de tus jugadores. Luego elegirás un rival de media similar (±3 OVR).</p>
        <div className="theft-modal__list">
          {myPlayers.map((player, i) => (
            <button key={i} className="theft-modal__item" onClick={() => { setMyPlayer(player); setPhase('selectTheirs'); setSearch(''); }}>
              <span className="theft-modal__item-ovr">{player.overall}</span>
              <div className="theft-modal__item-info">
                <span className="theft-modal__item-name">{player.name}</span>
                <span className="theft-modal__item-meta">{translatePosition(player.position)} · {player.age} años</span>
              </div>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
