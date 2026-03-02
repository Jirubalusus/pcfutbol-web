import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import {
  HeartPulse, Briefcase, Mail, FileText, Newspaper, Landmark,
  Trophy, AlertTriangle, ShieldAlert, TrendingUp, Handshake,
  DollarSign, Star, Zap, Users, X, ChevronDown, ChevronUp, Bell
} from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import './NotificationCenter.scss';

// ============================================================
// CONFIG
// ============================================================

const NOTIFICATION_CONFIG = {
  injury:         { icon: HeartPulse,    color: '#ff453a', labelKey: 'notifications.injury' },
  board:          { icon: Landmark,      color: '#ff453a', labelKey: 'notifications.board' },
  fired:          { icon: ShieldAlert,   color: '#ff453a', labelKey: 'notifications.fired' },
  bankruptcy:     { icon: AlertTriangle, color: '#ff453a', labelKey: 'notifications.bankruptcy' },
  yellow:         { icon: AlertTriangle, color: '#ffcc00', labelKey: 'notifications.yellow' },
  red:            { icon: ShieldAlert,   color: '#ff453a', labelKey: 'notifications.red' },
  transfer_offer: { icon: Mail,          color: '#ff9f0a', labelKey: 'notifications.transferOffer' },
  transfer:       { icon: Briefcase,     color: '#0a84ff', labelKey: 'notifications.transfer' },
  loan:           { icon: Handshake,     color: '#bf5af2', labelKey: 'notifications.loan' },
  contract:       { icon: FileText,      color: '#ff9f0a', labelKey: 'notifications.contract' },
  match_result:   { icon: FootballIcon,  color: '#30d158', labelKey: 'notifications.matchResult' },
  cup:            { icon: Trophy,        color: '#ffd60a', labelKey: 'notifications.cup' },
  european:       { icon: Star,          color: '#0a84ff', labelKey: 'notifications.european' },
  southamerican:  { icon: Star,          color: '#30d158', labelKey: 'notifications.southamerican' },
  retirement:     { icon: Users,         color: '#8e8e93', labelKey: 'notifications.retirement' },
  offer:          { icon: DollarSign,    color: '#30d158', labelKey: 'notifications.offer' },
  training:       { icon: TrendingUp,    color: '#30d158', labelKey: 'notifications.training' },
  youth:          { icon: Zap,           color: '#bf5af2', labelKey: 'notifications.youth' },
  medical:        { icon: HeartPulse,    color: '#30d158', labelKey: 'notifications.medical' },
  facility:       { icon: TrendingUp,    color: '#0a84ff', labelKey: 'notifications.facility' },
  stadium:        { icon: Landmark,      color: '#0a84ff', labelKey: 'notifications.facility' },
  news:           { icon: Newspaper,     color: '#8e8e93', labelKey: 'notifications.news' },
  warning:        { icon: AlertTriangle, color: '#ff9f0a', labelKey: 'notifications.default' },
  default:        { icon: Mail,          color: '#8e8e93', labelKey: 'notifications.default' },
};

function getConfig(type) {
  return NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.default;
}

function resolveTitle(msg, t) {
  if (msg.titleKey) {
    const params = { ...msg.titleParams };
    if (params) Object.keys(params).forEach(k => {
      if (k.endsWith('Key') && typeof params[k] === 'string' && !k.endsWith('KeyParams'))
        params[k.slice(0, -3)] = t(params[k], params[`${k}Params`]);
    });
    return t(msg.titleKey, params);
  }
  return msg.title;
}

function resolveContent(msg, t) {
  if (msg.contentKey) {
    const params = { ...msg.contentParams };
    if (params) Object.keys(params).forEach(k => {
      if (k.endsWith('Key') && typeof params[k] === 'string' && !k.endsWith('KeyParams'))
        params[k.slice(0, -3)] = t(params[k], params[`${k}Params`]);
    });
    return t(msg.contentKey, params);
  }
  return msg.content;
}

// ============================================================
// COMPONENT
// ============================================================

const AUTO_DISMISS_MS = 4000;

export default function NotificationCenter() {
  const { t } = useTranslation();
  const { state } = useGame();
  const prevMessagesRef = useRef(state.messages || []);
  const processedIds = useRef(new Set());
  const [batch, setBatch] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [exiting, setExiting] = useState(false);
  const dismissTimer = useRef(null);
  const batchRef = useRef(batch);
  batchRef.current = batch;

  // Stable dismiss — no stale closures
  const dismiss = useCallback(() => {
    clearTimeout(dismissTimer.current);
    if (batchRef.current.length === 0) return;
    setExiting(true);
    setTimeout(() => {
      setBatch([]);
      setExpanded(false);
      setExiting(false);
    }, 300);
  }, []);

  // Clear all when simulation starts or week advances
  useEffect(() => {
    if (state.isSimulating) dismiss();
  }, [state.isSimulating, dismiss]);

  // Clear on week advance
  const weekRef = useRef(state.currentWeek);
  useEffect(() => {
    if (state.currentWeek !== weekRef.current) {
      weekRef.current = state.currentWeek;
      clearTimeout(dismissTimer.current);
      setBatch([]);
      setExpanded(false);
      setExiting(false);
      processedIds.current.clear();
    }
  }, [state.currentWeek]);

  // Schedule auto-dismiss (call imperatively, not from useEffect)
  const scheduleAutoDismiss = useCallback(() => {
    clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
  }, [dismiss]);

  // Watch for new messages
  useEffect(() => {
    const prev = prevMessagesRef.current;
    const current = state.messages || [];
    if (current === prev) return;

    if (state.isSimulating) {
      prevMessagesRef.current = current;
      return;
    }

    const prevIds = new Set(prev.map(m => m.id));
    const newMsgs = current.filter(m => !prevIds.has(m.id) && !processedIds.current.has(m.id));

    if (newMsgs.length > 0) {
      newMsgs.forEach(m => processedIds.current.add(m.id));
      setExiting(false);
      setExpanded(false);
      setBatch(newMsgs);
      // Start auto-dismiss for new batch
      clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    }

    prevMessagesRef.current = current;
  }, [state.messages, state.isSimulating, dismiss]);

  // Cleanup processed IDs
  useEffect(() => {
    const interval = setInterval(() => {
      if (processedIds.current.size > 200)
        processedIds.current = new Set(Array.from(processedIds.current).slice(-100));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (batch.length === 0) return null;

  const isSingle = batch.length === 1;
  const firstMsg = batch[0];
  const firstConfig = getConfig(firstMsg.type);

  const handleClick = () => {
    const willExpand = !expanded;
    if (isSingle) {
      if (resolveContent(firstMsg, t)) {
        setExpanded(willExpand);
      } else return;
    } else {
      setExpanded(willExpand);
    }
    // Expanding → pause timer; Collapsing → dismiss immediately
    if (willExpand) {
      clearTimeout(dismissTimer.current);
    } else {
      dismiss();
    }
  };

  return (
    <div className={`nc ${exiting ? 'nc--exit' : ''}`}>
      <div className="nc__toast" onClick={handleClick}>
        {/* Header */}
        <div className="nc__header">
          <div className="nc__icon" style={{ '--nc-color': isSingle ? firstConfig.color : '#0a84ff' }}>
            {isSingle
              ? React.createElement(firstConfig.icon, { size: 15 })
              : <Bell size={15} />
            }
          </div>
          <div className="nc__title">
            {isSingle
              ? resolveTitle(firstMsg, t)
              : t('notifications.multipleNotifications', { count: batch.length })
            }
          </div>
          {(!isSingle || resolveContent(firstMsg, t)) && (
            <div className="nc__chevron">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          )}
          <button className="nc__close" onClick={e => { e.stopPropagation(); dismiss(); }}>
            <X size={14} />
          </button>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="nc__body">
            {isSingle ? (
              <div className="nc__single-content">
                {resolveContent(firstMsg, t)}
              </div>
            ) : (
              <div className="nc__list">
                {batch.map((msg, i) => {
                  const cfg = getConfig(msg.type);
                  return (
                    <div key={msg.id || i} className="nc__item">
                      <span className="nc__dot" style={{ backgroundColor: cfg.color }} />
                      <div className="nc__item-text">
                        <span className="nc__item-title">{resolveTitle(msg, t)}</span>
                        {resolveContent(msg, t) && (
                          <span className="nc__item-desc">{resolveContent(msg, t)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
