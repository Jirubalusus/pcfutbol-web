import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { ChevronRight, X } from 'lucide-react';
import './Tutorial.scss';

/**
 * SpotlightTutorial — tooltip-style tutorial that highlights specific elements.
 * Each step targets a CSS selector; the tooltip appears next to the element.
 * 
 * Props:
 *  - steps: [{ selector: '.my-btn', text: 'Short explanation' }, ...]
 *  - onComplete: called when all steps are done
 *  - onDismiss: called when user dismisses all tutorials
 */
export function SpotlightTutorial({ steps, onComplete, onDismiss }) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [pos, setPos] = useState(null);
  const [targetRect, setTargetRect] = useState(null);
  const tooltipRef = useRef(null);
  const step = steps[current];
  const isLast = current === steps.length - 1;

  const updatePosition = useCallback(() => {
    if (!step?.selector) {
      setPos({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      setTargetRect(null);
      return;
    }

    // Try each selector in comma-separated list
    let el = null;
    const selectors = step.selector.split(',').map(s => s.trim());
    for (const sel of selectors) {
      try { el = document.querySelector(sel); } catch(e) { /* skip invalid */ }
      if (el) break;
    }

    if (!el) {
      setPos({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    // Measure tooltip if available
    const tooltipEl = tooltipRef.current;
    const tooltipW = tooltipEl ? Math.min(tooltipEl.offsetWidth, 300) : 280;
    const tooltipH = tooltipEl ? tooltipEl.offsetHeight : 120;

    const pad = 12;
    const margin = 12; // min distance from screen edge
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left, placement;

    // Mobile (< 600px): always position centered horizontally, above or below
    const isMobile = vw < 600;

    if (isMobile) {
      left = Math.max(margin, (vw - tooltipW) / 2);
      if (rect.bottom + pad + tooltipH + margin < vh) {
        top = rect.bottom + pad;
        placement = 'below';
      } else {
        top = Math.max(margin, rect.top - pad - tooltipH);
        placement = 'above';
      }
    } else {
      // Desktop: prefer below, then above, then side
      const centerLeft = Math.max(margin, Math.min(rect.left + rect.width / 2 - tooltipW / 2, vw - tooltipW - margin));

      if (rect.bottom + pad + tooltipH + margin < vh) {
        top = rect.bottom + pad;
        left = centerLeft;
        placement = 'below';
      } else if (rect.top - pad - tooltipH > margin) {
        top = rect.top - pad - tooltipH;
        left = centerLeft;
        placement = 'above';
      } else {
        top = Math.max(margin, Math.min(rect.top + rect.height / 2 - tooltipH / 2, vh - tooltipH - margin));
        if (rect.right + pad + tooltipW + margin < vw) {
          left = rect.right + pad;
          placement = 'right';
        } else {
          left = Math.max(margin, rect.left - pad - tooltipW);
          placement = 'left';
        }
      }
    }

    setPos({ top: `${top}px`, left: `${left}px`, placement });
  }, [step]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [current, updatePosition]);

  // Small delay for DOM to settle on mount
  useEffect(() => {
    const t = setTimeout(updatePosition, 100);
    return () => clearTimeout(t);
  }, [current, updatePosition]);

  const handleNext = () => {
    if (isLast) {
      onComplete?.();
    } else {
      setCurrent(c => c + 1);
    }
  };

  const handleSkip = () => {
    onDismiss?.();
  };

  if (!pos) return null;

  return (
    <div className="spotlight-overlay">
      {/* Spotlight cutout */}
      {targetRect && (
        <svg className="spotlight-svg" viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}>
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="10"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.65)"
            mask="url(#spotlight-mask)"
          />
          {/* Highlight border */}
          <rect
            x={targetRect.left - 6}
            y={targetRect.top - 6}
            width={targetRect.width + 12}
            height={targetRect.height + 12}
            rx="10"
            fill="none"
            stroke="rgba(0,122,255,0.6)"
            strokeWidth="2"
            className="spotlight-ring"
          />
        </svg>
      )}
      {!targetRect && <div className="spotlight-backdrop" />}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`spotlight-tooltip ${pos.placement || ''}`}
        style={{ top: pos.top, left: pos.left, transform: pos.transform || 'none' }}
      >
        <div className="spotlight-tooltip__text">{step.text}</div>
        <div className="spotlight-tooltip__footer">
          <button className="spotlight-tooltip__skip" onClick={handleSkip}>
            {t('tutorial.dismissAll')}
          </button>
          <div className="spotlight-tooltip__right">
            {steps.length > 1 && (
              <span className="spotlight-tooltip__counter">
                {current + 1}/{steps.length}
              </span>
            )}
            <button className="spotlight-tooltip__next" onClick={handleNext}>
              {isLast ? t('tutorial.understood') : t('tutorial.next')}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Legacy TutorialModal — keep for backward compatibility but redirect to SpotlightTutorial
 * when steps have selectors. Falls back to centered tooltip if no selectors.
 */
export function TutorialModal({ id, steps, onComplete, onDismissAll }) {
  // Convert legacy steps (title/content) to spotlight steps
  const spotlightSteps = steps.map(s => ({
    selector: s.selector || null,
    text: s.content || s.text || ''
  }));

  return (
    <SpotlightTutorial
      steps={spotlightSteps}
      onComplete={onComplete}
      onDismiss={onDismissAll}
    />
  );
}

export function WelcomeModal({ onAccept, onDecline }) {
  const { t } = useTranslation();

  return (
    <div className="spotlight-overlay">
      <div className="spotlight-backdrop" />
      <div className="spotlight-tooltip spotlight-tooltip--welcome" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <div className="spotlight-tooltip__welcome-icon">⚽</div>
        <div className="spotlight-tooltip__title">{t('tutorial.welcomeTitle')}</div>
        <div className="spotlight-tooltip__text">{t('tutorial.welcomeContent')}</div>
        <div className="spotlight-tooltip__footer spotlight-tooltip__footer--welcome">
          <button className="spotlight-tooltip__skip" onClick={onDecline}>
            {t('tutorial.noHelp')}
          </button>
          <button className="spotlight-tooltip__next" onClick={onAccept}>
            {t('tutorial.yesHelp')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage tutorial state for a specific screen.
 * Only shows on first play of each game mode (never in ranked/contrarreloj).
 */
export function useTutorial(id) {
  const { state, dispatch } = useGame();
  const settings = state.settings || {};

  const tutorialCompleted = settings.tutorialCompleted === true;
  const tutorialDismissed = settings.tutorialDismissed === true;
  const showTutorials = settings.showTutorials !== false;
  const tutorialsSeen = settings.tutorialsSeen || {};
  const welcomeShown = settings.welcomeShown === true;

  // Never show tutorials in ranked mode (contrarreloj)
  const isRanked = state.gameMode === 'contrarreloj' || state.gameMode === 'ranked';

  // Tutorial system is active when not completed, not dismissed, enabled, and not ranked
  const isActive = !tutorialCompleted && !tutorialDismissed && showTutorials && !isRanked;

  // Welcome modal: DISABLED for now
  // const showWelcome = isActive && !welcomeShown && !tutorialsSeen.welcome;
  const showWelcome = false;

  // Contextual tutorial: DISABLED for now
  // const shouldShow = isActive && welcomeShown && !tutorialsSeen[id];
  const shouldShow = false;

  const markSeen = () => {
    dispatch({ type: 'MARK_TUTORIAL_SEEN', payload: { id } });
  };

  const dismissAll = () => {
    dispatch({ type: 'DISMISS_TUTORIALS' });
  };

  const acceptWelcome = () => {
    dispatch({ type: 'MARK_TUTORIAL_SEEN', payload: { id: 'welcome' } });
    dispatch({ type: 'UPDATE_SETTINGS', payload: { welcomeShown: true } });
  };

  const declineWelcome = () => {
    dispatch({ type: 'DISMISS_TUTORIALS' });
  };

  return { shouldShow, showWelcome, markSeen, dismissAll, acceptWelcome, declineWelcome, isActive };
}
