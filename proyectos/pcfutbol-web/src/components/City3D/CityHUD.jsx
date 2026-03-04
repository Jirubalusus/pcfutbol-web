/**
 * CityHUD.jsx — Overlay HUD with team info, back button, teleport
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Home } from 'lucide-react';

export function CityHUD({
  teamName,
  money,
  week,
  season,
  leaguePosition,
  onBack,
  onTeleport,
  activeBuilding,
  notifications,
}) {
  const { t } = useTranslation();
  const totalNotifs = Object.values(notifications || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="city-hud">
      {/* Top bar */}
      <div className="city-hud__top">
        <button className="city-hud__back" onClick={onBack} title={t('common.back', 'Volver')}>
          <ArrowLeft size={20} />
        </button>
        
        <div className="city-hud__info">
          <span className="city-hud__team">{teamName}</span>
          <span className="city-hud__meta">
            {t('city.week', 'Jornada')} {week} · {t('city.season', 'Temporada')} {season}
          </span>
        </div>
        
        <div className="city-hud__stats">
          <span className="city-hud__money">💰 {formatMoney(money)}</span>
          <span className="city-hud__position">#{leaguePosition}</span>
        </div>
      </div>

      {/* Teleport button */}
      <button className="city-hud__teleport" onClick={onTeleport}>
        <MapPin size={18} />
        <span>{t('city.teleport', 'Teleport')}</span>
        {totalNotifs > 0 && <span className="city-hud__notif-badge">{totalNotifs}</span>}
      </button>

      {/* Controls hint */}
      <div className="city-hud__controls">
        <span>WASD {t('city.toMove', 'para moverte')} · Enter {t('city.toEnter', 'para entrar')}</span>
      </div>
    </div>
  );
}

function formatMoney(amount) {
  if (!amount && amount !== 0) return '0';
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
  return amount.toString();
}
