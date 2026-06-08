import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const KIT_STYLES = [
  { id: 'solid', name: 'Liso' },
  { id: 'stripes_v', name: 'Rayas V' },
  { id: 'stripes_h', name: 'Rayas H' },
  { id: 'half', name: 'Mitad' },
  { id: 'sleeves', name: 'Mangas' },
  { id: 'diagonal', name: 'Diagonal' },
  { id: 'chest_band', name: 'Banda' },
];

const COLORS = [
  '#1a237e', '#b71c1c', '#1b5e20', '#e65100', '#4a148c', '#006064', '#263238',
  '#880e4f', '#f57f17', '#0d47a1', '#311b92', '#004d40',
  '#ffffff', '#212121', '#ffd740', '#c0c0c0', '#ff6f00', '#00c853',
];

function KitPreview({ kit, size = 100 }) {
  const { style, primary, secondary } = kit;
  const w = size;
  const h = size * 1.2;

  const getPattern = () => {
    switch (style) {
      case 'stripes_v':
        return `repeating-linear-gradient(90deg, ${primary} 0px, ${primary} ${w / 7}px, ${secondary} ${w / 7}px, ${secondary} ${w / 3.5}px)`;
      case 'stripes_h':
        return `repeating-linear-gradient(0deg, ${primary} 0px, ${primary} ${h / 8}px, ${secondary} ${h / 8}px, ${secondary} ${h / 4}px)`;
      case 'half':
        return `linear-gradient(90deg, ${primary} 50%, ${secondary} 50%)`;
      case 'sleeves':
        return `linear-gradient(90deg, ${secondary} 20%, ${primary} 20%, ${primary} 80%, ${secondary} 80%)`;
      case 'diagonal':
        return `linear-gradient(135deg, ${primary} 50%, ${secondary} 50%)`;
      case 'chest_band':
        return `linear-gradient(180deg, ${primary} 35%, ${secondary} 35%, ${secondary} 55%, ${primary} 55%)`;
      default:
        return primary;
    }
  };

  return (
    <svg width={w} height={h} viewBox="0 0 100 120" className="kit-preview">
      <defs>
        <clipPath id={`kit-${style}-${primary.replace('#', '')}-${secondary.replace('#', '')}`}>
          <path d="M25,0 L40,0 L50,8 L60,0 L75,0 L95,20 L85,35 L75,30 L75,110 L25,110 L25,30 L15,35 L5,20 Z" />
        </clipPath>
      </defs>
      <foreignObject x="0" y="0" width="100" height="120" clipPath={`url(#kit-${style}-${primary.replace('#', '')}-${secondary.replace('#', '')})`}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100px', height: '120px', background: getPattern() }} />
      </foreignObject>
      <path d="M25,0 L40,0 L50,8 L60,0 L75,0 L95,20 L85,35 L75,30 L75,110 L25,110 L25,30 L15,35 L5,20 Z" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="1.5" />
      <path d="M40,0 L50,8 L60,0" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
    </svg>
  );
}

export { KitPreview };

export default function KitEditor({ value, onChange }) {
  const { t } = useTranslation();
  const [kit, setKit] = useState(value || { style: 'solid', primary: '#1a237e', secondary: '#ffd740' });

  const update = (key, val) => {
    const next = { ...kit, [key]: val };
    setKit(next);
    onChange?.(next);
  };

  return (
    <div className="kit-editor" data-glory-step="kit">
      <aside className="kit-editor__preview" data-audit="kit-preview">
        <KitPreview kit={kit} size={150} />
        <div className="kit-editor__swatches">
          <span style={{ background: kit.primary }} />
          <span style={{ background: kit.secondary }} />
        </div>
        <div className="kit-editor__caption">
          <span>{t('glory.kit.styles.' + kit.style)}</span>
        </div>
      </aside>

      <div className="kit-editor__controls">
        <section className="kit-editor__panel">
          <label className="kit-editor__label">{t('glory.kit.style')}</label>
          <div className="kit-editor__styles">
            {KIT_STYLES.map(s => (
              <button
                type="button"
                key={s.id}
                className={`kit-editor__style-btn ${kit.style === s.id ? 'active' : ''}`}
                onClick={() => update('style', s.id)}
              >
                <span className="kit-editor__style-preview">
                  <KitPreview kit={{ ...kit, style: s.id }} size={44} />
                </span>
                <span className="kit-editor__style-name">{t('glory.kit.styles.' + s.id)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="kit-editor__panel">
          <label className="kit-editor__label">{t('glory.kit.primaryColor')}</label>
          <div className="kit-editor__colors">
            {COLORS.map(c => (
              <button
                type="button"
                key={`p_${c}`}
                className={`kit-editor__color-btn ${kit.primary === c ? 'active' : ''}`}
                style={{ '--swatch': c }}
                onClick={() => update('primary', c)}
                aria-label={t('glory.kit.primaryAria', { color: c })}
              >
                <span />
              </button>
            ))}
          </div>

          <label className="kit-editor__label">{t('glory.kit.secondaryColor')}</label>
          <div className="kit-editor__colors">
            {COLORS.map(c => (
              <button
                type="button"
                key={`s_${c}`}
                className={`kit-editor__color-btn ${kit.secondary === c ? 'active' : ''}`}
                style={{ '--swatch': c }}
                onClick={() => update('secondary', c)}
                aria-label={t('glory.kit.secondaryAria', { color: c })}
              >
                <span />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
