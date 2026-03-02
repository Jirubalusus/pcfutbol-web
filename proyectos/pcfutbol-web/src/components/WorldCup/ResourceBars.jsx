import React from 'react';
import { Heart, Activity, Newspaper, Wallet } from 'lucide-react';
import './ResourceBars.scss';

const RESOURCES = [
  { key: 'morale', Icon: Heart, label: { es: 'Moral', en: 'Morale', fr: 'Moral', de: 'Moral', pt: 'Moral', it: 'Morale' }, color: '#f472b6', bgColor: 'rgba(244,114,182,0.15)', colorLow: '#ef4444' },
  { key: 'fitness', Icon: Activity, label: { es: 'Forma', en: 'Fitness', fr: 'Forme', de: 'Fitness', pt: 'Forma', it: 'Forma' }, color: '#a78bfa', bgColor: 'rgba(167,139,250,0.15)', colorLow: '#ef4444' },
  { key: 'pressure', Icon: Newspaper, label: { es: 'Presión', en: 'Pressure', fr: 'Pression', de: 'Druck', pt: 'Pressão', it: 'Pressione' }, color: '#fb923c', bgColor: 'rgba(251,146,60,0.15)', colorHigh: '#ef4444', inverse: true },
  { key: 'budget', Icon: Wallet, label: { es: 'Fondos', en: 'Budget', fr: 'Budget', de: 'Budget', pt: 'Fundos', it: 'Budget' }, color: '#34d399', bgColor: 'rgba(52,211,153,0.15)', colorLow: '#ef4444' },
];

export default function ResourceBars({ resources, labels, deltas, lang = 'es' }) {
  const l = lang?.slice(0, 2) || 'es';

  return (
    <div className="resource-bars">
      {RESOURCES.map(res => {
        const value = resources[res.key] ?? 50;
        const delta = deltas?.[res.key] ?? 0;
        const isCritical = res.inverse ? value >= 85 : value <= 20;
        const barColor = isCritical ? (res.inverse ? res.colorHigh : res.colorLow) : res.color;

        return (
          <div key={res.key} className={`resource-bars__item ${isCritical ? 'resource-bars__item--critical' : ''}`}>
            <div className="resource-bars__icon-wrap" style={{ background: isCritical ? 'rgba(239,68,68,0.15)' : res.bgColor }}>
              <res.Icon size={13} style={{ color: barColor }} />
            </div>
            <span className="resource-bars__label">{res.label[l] || res.label.en}</span>
            <span className="resource-bars__value" style={{ color: barColor }}>{value}</span>
            <div className="resource-bars__mini-bar">
              <div className="resource-bars__mini-fill" style={{ width: `${value}%`, background: barColor }} />
            </div>
            {delta !== 0 && (
              <span className={`resource-bars__delta ${delta > 0 ? 'resource-bars__delta--positive' : 'resource-bars__delta--negative'}`}>
                {delta > 0 ? '+' : ''}{delta}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
