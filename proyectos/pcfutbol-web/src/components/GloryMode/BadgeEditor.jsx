import React, { useState } from 'react';
import { Star, Flame, Zap, Shield, Crown, Sword, Mountain, Anchor, Bird, Sun, Moon, Compass, Sparkles } from 'lucide-react';

const SHAPES = ['shield', 'circle', 'diamond', 'rounded'];
const COLORS = ['#1a237e', '#b71c1c', '#1b5e20', '#e65100', '#4a148c', '#006064', '#263238', '#880e4f', '#f57f17', '#0d47a1', '#311b92', '#004d40'];
const METAL_COLORS = ['#ffd740', '#ffffff', '#c0c0c0', '#212121'];
const ICONS = [
  { id: 'star', Icon: Star },
  { id: 'flame', Icon: Flame },
  { id: 'zap', Icon: Zap },
  { id: 'shield', Icon: Shield },
  { id: 'crown', Icon: Crown },
  { id: 'sword', Icon: Sword },
  { id: 'mountain', Icon: Mountain },
  { id: 'anchor', Icon: Anchor },
  { id: 'bird', Icon: Bird },
  { id: 'sun', Icon: Sun },
  { id: 'moon', Icon: Moon },
  { id: 'compass', Icon: Compass },
];

const SHAPE_LABELS = {
  shield: 'Escudo',
  circle: 'Circular',
  diamond: 'Diamante',
  rounded: 'Moderno',
};

function BadgePreview({ badge, size = 100 }) {
  const { shape, color1, color2, icon } = badge;
  const IconComp = ICONS.find(i => i.id === icon)?.Icon || Star;

  const shapeStyles = {
    shield: { borderRadius: '10% 10% 44% 44%', width: size, height: size * 1.15 },
    circle: { borderRadius: '50%', width: size, height: size },
    diamond: { borderRadius: '18px', width: size * 0.85, height: size * 0.85, transform: 'rotate(45deg)' },
    rounded: { borderRadius: '24%', width: size, height: size },
  };

  return (
    <div className="badge-preview" style={{ width: size * 1.45, height: size * 1.45 }}>
      <div
        className={`badge-preview__crest badge-preview__crest--${shape}`}
        style={{
          ...shapeStyles[shape],
          background: `linear-gradient(160deg, ${color1} 0%, ${color1} 48%, ${color2} 48%, ${color2} 100%)`,
        }}
      >
        <div className="badge-preview__glow" />
        <div className="badge-preview__shine" />
        <div className="badge-preview__ring" />
        <div className="badge-preview__icon" style={{ transform: shape === 'diamond' ? 'rotate(-45deg)' : 'none' }}>
          <IconComp size={size * 0.38} color="rgba(255,255,255,0.97)" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

export { BadgePreview };

export default function BadgeEditor({ value, onChange }) {
  const [badge, setBadge] = useState(value || { shape: 'shield', color1: '#1a237e', color2: '#ffd740', icon: 'star' });

  const update = (key, val) => {
    const next = { ...badge, [key]: val };
    setBadge(next);
    onChange?.(next);
  };

  return (
    <div className="badge-editor">
      <div className="badge-editor__hero">
        <div className="badge-editor__hero-copy">
          <span className="badge-editor__eyebrow">Club identity workshop</span>
          <h4>Construye un escudo con presencia</h4>
          <p>Define la silueta, la paleta y el símbolo principal de tu club sin tocar la estructura de datos original.</p>
          <div className="badge-editor__specs">
            <span><strong>Forma:</strong> {SHAPE_LABELS[badge.shape]}</span>
            <span><strong>Primario:</strong> {badge.color1}</span>
            <span><strong>Secundario:</strong> {badge.color2}</span>
          </div>
        </div>

        <div className="badge-editor__preview-stage">
          <div className="badge-editor__preview-frame">
            <div className="badge-editor__preview-meta">
              <span className="badge-editor__preview-kicker">Vista principal</span>
              <Sparkles size={14} />
            </div>
            <BadgePreview badge={badge} size={132} />
            <div className="badge-editor__preview-swatches">
              <span style={{ background: badge.color1 }} />
              <span style={{ background: badge.color2 }} />
            </div>
          </div>
        </div>
      </div>

      <div className="badge-editor__grid">
        <section className="badge-editor__panel badge-editor__panel--shapes">
          <div className="badge-editor__panel-head">
            <label className="badge-editor__label">Forma</label>
            <span className="badge-editor__hint">Base del emblema</span>
          </div>
          <div className="badge-editor__shapes">
            {SHAPES.map(s => (
              <button
                type="button"
                key={s}
                className={`badge-editor__shape-btn ${badge.shape === s ? 'active' : ''}`}
                onClick={() => update('shape', s)}
              >
                <span className="badge-editor__shape-preview">
                  <BadgePreview badge={{ ...badge, shape: s }} size={34} />
                </span>
                <span className="badge-editor__shape-name">{SHAPE_LABELS[s]}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="badge-editor__panel badge-editor__panel--colors">
          <div className="badge-editor__panel-head">
            <label className="badge-editor__label">Paleta</label>
            <span className="badge-editor__hint">Color principal y acabado</span>
          </div>

          <div className="badge-editor__palette-block">
            <span className="badge-editor__mini-label">Principal</span>
            <div className="badge-editor__colors">
              {COLORS.map(c => (
                <button
                  type="button"
                  key={`c1_${c}`}
                  className={`badge-editor__color-btn ${badge.color1 === c ? 'active' : ''}`}
                  style={{ '--swatch': c }}
                  onClick={() => update('color1', c)}
                  aria-label={`Color principal ${c}`}
                >
                  <span />
                </button>
              ))}
            </div>
          </div>

          <div className="badge-editor__palette-block">
            <span className="badge-editor__mini-label">Secundario</span>
            <div className="badge-editor__colors">
              {[...COLORS, ...METAL_COLORS].map(c => (
                <button
                  type="button"
                  key={`c2_${c}`}
                  className={`badge-editor__color-btn ${badge.color2 === c ? 'active' : ''}`}
                  style={{ '--swatch': c }}
                  onClick={() => update('color2', c)}
                  aria-label={`Color secundario ${c}`}
                >
                  <span />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="badge-editor__panel badge-editor__panel--icons">
          <div className="badge-editor__panel-head">
            <label className="badge-editor__label">Símbolo</label>
            <span className="badge-editor__hint">Elemento central del escudo</span>
          </div>
          <div className="badge-editor__icons">
            {ICONS.map(({ id, Icon }) => (
              <button
                type="button"
                key={id}
                className={`badge-editor__icon-btn ${badge.icon === id ? 'active' : ''}`}
                onClick={() => update('icon', id)}
              >
                <span className="badge-editor__icon-wrap">
                  <Icon size={20} />
                </span>
                <span className="badge-editor__icon-name">{id}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
