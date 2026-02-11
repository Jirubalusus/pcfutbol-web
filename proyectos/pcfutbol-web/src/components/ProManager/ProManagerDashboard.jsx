import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { getBoardMessage } from '../../game/proManagerEngine';
import { Briefcase, Target, TrendingUp, AlertTriangle, Trophy, Activity } from 'lucide-react';
import './ProManagerDashboard.scss';

export default function ProManagerDashboard() {
  const { t } = useTranslation();
  const { state } = useGame();
  const pm = state.proManagerData;

  if (!pm || state.gameMode !== 'promanager') return null;

  const confidence = pm.boardConfidence ?? 60;
  const prestige = pm.prestige ?? 10;
  const objective = pm.objective;
  const boardMsg = getBoardMessage(confidence);

  const confidenceColor = confidence >= 70 ? '#4ade80' : confidence >= 40 ? '#f59e0b' : '#ef4444';
  const prestigeColor = prestige >= 60 ? '#6495ed' : prestige >= 30 ? '#a78bfa' : '#8899aa';

  return (
    <div className="pm-dashboard">
      <div className="pm-dashboard__header">
        <Briefcase size={16} />
        <span>{t('proManager.dashboard')}</span>
      </div>

      {/* Board confidence */}
      <div className="pm-dashboard__section">
        <div className="pm-dashboard__label">
          <Activity size={13} />
          <span>{t('proManager.boardConfidence')}</span>
          <span className="value" style={{ color: confidenceColor }}>{confidence}%</span>
        </div>
        <div className="pm-dashboard__bar">
          <div
            className="pm-dashboard__bar-fill"
            style={{ width: `${confidence}%`, background: confidenceColor }}
          />
        </div>
        <p className={`pm-dashboard__msg pm-dashboard__msg--${boardMsg.type}`}>
          {boardMsg.type === 'warning' && <AlertTriangle size={12} />}
          {t(boardMsg.key)}
        </p>
      </div>

      {/* Objective */}
      {objective && (
        <div className="pm-dashboard__section">
          <div className="pm-dashboard__label">
            <Target size={13} />
            <span>{t('proManager.objective')}</span>
          </div>
          <p className="pm-dashboard__objective-text">
            {t(objective.label, objective.labelParams)}
          </p>
        </div>
      )}

      {/* Prestige */}
      <div className="pm-dashboard__section">
        <div className="pm-dashboard__label">
          <TrendingUp size={13} />
          <span>{t('proManager.prestige')}</span>
          <span className="value" style={{ color: prestigeColor }}>{prestige}</span>
        </div>
        <div className="pm-dashboard__bar pm-dashboard__bar--prestige">
          <div
            className="pm-dashboard__bar-fill"
            style={{ width: `${prestige}%`, background: prestigeColor }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="pm-dashboard__stats">
        <div className="stat">
          <span className="num">{pm.totalMatches || 0}</span>
          <span className="lbl">{t('proManager.matches')}</span>
        </div>
        <div className="stat">
          <span className="num">{pm.totalWins || 0}</span>
          <span className="lbl">{t('proManager.wins')}</span>
        </div>
        <div className="stat">
          <span className="num">{pm.titles || 0}</span>
          <span className="lbl">
            <Trophy size={11} /> {t('proManager.titles')}
          </span>
        </div>
      </div>
    </div>
  );
}
