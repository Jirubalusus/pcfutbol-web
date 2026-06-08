import React from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Info } from 'lucide-react';
import './TrialBanner.scss';

/**
 * TrialBanner — non-intrusive in-game notice shown while playing a no-login
 * trial Carrera. It makes the "not saved to the cloud" state visible and offers
 * a single conversion CTA that opens the contextual Auth flow.
 *
 * Rendered by the app shell (GameRouter) only when `isTrial` is active and a
 * game is in progress, so the banner itself stays presentational.
 */
export default function TrialBanner({ onSave }) {
  const { t } = useTranslation();

  return (
    <div className="trial-banner" role="status">
      <span className="trial-banner__icon" aria-hidden="true">
        <Info size={16} />
      </span>
      <p className="trial-banner__text">{t('trial.bannerText')}</p>
      <button type="button" className="trial-banner__cta" onClick={onSave}>
        <Save size={15} />
        <span>{t('trial.bannerCta')}</span>
      </button>
    </div>
  );
}
