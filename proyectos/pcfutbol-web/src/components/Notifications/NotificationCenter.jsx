import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import {
  HeartPulse, Briefcase, Mail, FileText, Newspaper, Landmark,
  Trophy, AlertTriangle, ShieldAlert, TrendingUp, Handshake,
  DollarSign, Star, Zap, Users, X, ChevronDown
} from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import './NotificationCenter.scss';

// ============================================================
// NOTIFICATION PRIORITY & CONFIG
// ============================================================

const NOTIFICATION_CONFIG = {
  // 🔴 Critical — always show, long duration
  injury: { priority: 'critical', icon: HeartPulse, color: '#ff453a', duration: 5000, labelKey: 'notifications.injury' },
  board: { priority: 'critical', icon: Landmark, color: '#ff453a', duration: 5000, labelKey: 'notifications.board' },
  fired: { priority: 'critical', icon: ShieldAlert, color: '#ff453a', duration: 6000, labelKey: 'notifications.fired' },
  bankruptcy: { priority: 'critical', icon: AlertTriangle, color: '#ff453a', duration: 6000, labelKey: 'notifications.bankruptcy' },
  yellow: { priority: 'important', icon: AlertTriangle, color: '#ffcc00', duration: 3500, labelKey: 'notifications.yellow' },
  red: { priority: 'critical', icon: ShieldAlert, color: '#ff453a', duration: 4000, labelKey: 'notifications.red' },

  // 🟡 Important — auto-show, medium duration
  transfer_offer: { priority: 'important', icon: Mail, color: '#ff9f0a', duration: 4000, labelKey: 'notifications.transferOffer' },
  transfer: { priority: 'important', icon: Briefcase, color: '#0a84ff', duration: 4000, labelKey: 'notifications.transfer' },
  loan: { priority: 'important', icon: Handshake, color: '#bf5af2', duration: 4000, labelKey: 'notifications.loan' },
  contract: { priority: 'important', icon: FileText, color: '#ff9f0a', duration: 4000, labelKey: 'notifications.contract' },
  match_result: { priority: 'important', icon: FootballIcon, color: '#30d158', duration: 3500, labelKey: 'notifications.matchResult' },
  cup: { priority: 'important', icon: Trophy, color: '#ffd60a', duration: 4000, labelKey: 'notifications.cup' },
  european: { priority: 'important', icon: Star, color: '#0a84ff', duration: 4000, labelKey: 'notifications.european' },
  southamerican: { priority: 'important', icon: Star, color: '#30d158', duration: 4000, labelKey: 'notifications.southamerican' },
  retirement: { priority: 'important', icon: Users, color: '#8e8e93', duration: 4000, labelKey: 'notifications.retirement' },
  offer: { priority: 'important', icon: DollarSign, color: '#30d158', duration: 4000, labelKey: 'notifications.offer' },

  // 🟢 Info — auto-show, short duration
  training: { priority: 'info', icon: TrendingUp, color: '#30d158', duration: 3000, labelKey: 'notifications.training' },
  youth: { priority: 'info', icon: Zap, color: '#bf5af2', duration: 3500, labelKey: 'notifications.youth' },
  medical: { priority: 'info', icon: HeartPulse, color: '#30d158', duration: 3000, labelKey: 'notifications.medical' },
  facility: { priority: 'info', icon: TrendingUp, color: '#0a84ff', duration: 3000, labelKey: 'notifications.facility' },
  news: { priority: 'info', icon: Newspaper, color: '#8e8e93', duration: 3000, labelKey: 'notifications.news' },

  // Default
  default: { priority: 'info', icon: Mail, color: '#8e8e93', duration: 3000, labelKey: 'notifications.default' }
};

const PRIORITY_ORDER = { critical: 0, important: 1, info: 2 };

// Max toasts visible at once
const MAX_VISIBLE = 3;
// Max total in a batch (rest become "+N más")
const MAX_BATCH = 5;

function getConfig(type, t) {
  const config = NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.default;
  return {
    ...config,
    label: t(config.labelKey)
  };
}

// ============================================================
// NOTIFICATION TOAST COMPONENT
// ============================================================

function NotificationToast({ notification, onDismiss, index, t }) {
  const [exiting, setExiting] = useState(false);
  const config = getConfig(notification.type, t);
  const IconComponent = config.icon;
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(notification.id), 300);
    }, config.duration);

    return () => clearTimeout(timerRef.current);
  }, [notification.id, config.duration, onDismiss]);

  const handleDismiss = () => {
    clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  // Touch swipe to dismiss
  const touchStart = useRef(null);
  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(diff) > 80) handleDismiss();
    touchStart.current = null;
  };

  return (
    <div
      className={`notif-toast notif-toast--${config.priority} ${exiting ? 'notif-toast--exit' : ''}`}
      style={{ '--notif-color': config.color, '--index': index }}
      onClick={handleDismiss}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="notif-toast__icon">
        {typeof IconComponent === 'function' && IconComponent.$$typeof
          ? <IconComponent size={16} />
          : <IconComponent size={16} />
        }
      </div>
      <div className="notif-toast__content">
        <span className="notif-toast__label">{config.label}</span>
        <span className="notif-toast__title">{notification.title}</span>
        {notification.content && (
          <span className="notif-toast__body">{notification.content}</span>
        )}
      </div>
      <button className="notif-toast__close" onClick={(e) => { e.stopPropagation(); handleDismiss(); }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ============================================================
// OVERFLOW INDICATOR
// ============================================================

function OverflowIndicator({ count, onDismiss, t }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`notif-toast notif-toast--overflow ${exiting ? 'notif-toast--exit' : ''}`} onClick={onDismiss}>
      <div className="notif-toast__icon" style={{ '--notif-color': '#8e8e93' }}>
        <ChevronDown size={16} />
      </div>
      <div className="notif-toast__content">
        <span className="notif-toast__title">{t('notifications.moreNotifications', { count })}</span>
        <span className="notif-toast__body">{t('notifications.checkInbox')}</span>
      </div>
    </div>
  );
}

// ============================================================
// MAIN NOTIFICATION CENTER
// ============================================================

export default function NotificationCenter() {
  const { t } = useTranslation();
  const { state } = useGame();
  const [activeToasts, setActiveToasts] = useState([]);
  const [overflow, setOverflow] = useState(0);
  const prevMessagesRef = useRef(state.messages || []);
  const processedIds = useRef(new Set());

  const dismissToast = useCallback((id) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissOverflow = useCallback(() => {
    setOverflow(0);
  }, []);

  // Watch for new messages
  useEffect(() => {
    const prevMessages = prevMessagesRef.current;
    const currentMessages = state.messages || [];

    if (currentMessages === prevMessages) return;

    // Find new messages (they're prepended in the array)
    const prevIds = new Set(prevMessages.map(m => m.id));
    const newMessages = currentMessages.filter(m => !prevIds.has(m.id) && !processedIds.current.has(m.id));

    if (newMessages.length > 0) {
      // Sort by priority
      const sorted = [...newMessages].sort((a, b) => {
        const pa = PRIORITY_ORDER[getConfig(a.type, t).priority] ?? 2;
        const pb = PRIORITY_ORDER[getConfig(b.type, t).priority] ?? 2;
        return pa - pb;
      });

      // Take top N for toasts
      const toShow = sorted.slice(0, MAX_BATCH);
      const remaining = sorted.length - MAX_BATCH;

      // Only show MAX_VISIBLE as full toasts
      const toasts = toShow.slice(0, MAX_VISIBLE);
      const extraCount = toShow.length - MAX_VISIBLE + Math.max(0, remaining);

      // Mark all as processed
      newMessages.forEach(m => processedIds.current.add(m.id));

      // Stagger toast appearance
      toasts.forEach((msg, i) => {
        setTimeout(() => {
          setActiveToasts(prev => {
            // Don't exceed MAX_VISIBLE
            const next = [...prev, msg];
            if (next.length > MAX_VISIBLE) return next.slice(-MAX_VISIBLE);
            return next;
          });
        }, i * 200);
      });

      if (extraCount > 0) {
        setTimeout(() => {
          setOverflow(extraCount);
        }, toasts.length * 200 + 300);
      }
    }

    prevMessagesRef.current = currentMessages;
  }, [state.messages]);

  // Cleanup old processed IDs periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (processedIds.current.size > 200) {
        const arr = Array.from(processedIds.current);
        processedIds.current = new Set(arr.slice(-100));
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (activeToasts.length === 0 && overflow === 0) return null;

  return (
    <div className="notification-center">
      {activeToasts.map((toast, i) => (
        <NotificationToast
          key={toast.id}
          notification={toast}
          onDismiss={dismissToast}
          index={i}
          t={t}
        />
      ))}
      {overflow > 0 && (
        <OverflowIndicator count={overflow} onDismiss={dismissOverflow} t={t} />
      )}
    </div>
  );
}
