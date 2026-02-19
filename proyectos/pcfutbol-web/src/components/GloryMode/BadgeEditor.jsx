import React, { useState } from 'react';
import { Star, Flame, Zap, Shield, Crown, Sword, Mountain, Anchor, Bird, Sun, Moon, Compass } from 'lucide-react';

const SHAPES = ['shield', 'circle', 'diamond', 'rounded'];
const COLORS = ['#1a237e', '#b71c1c', '#1b5e20', '#e65100', '#4a148c', '#006064', '#263238', '#880e4f', '#f57f17', '#0d47a1', '#311b92', '#004d40'];
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

function BadgePreview({ badge, size = 100 }) {
  const { shape, color1, color2, icon } = badge;
  const IconComp = ICONS.find(i => i.id === icon)?.Icon || Star;

  const shapeStyles = {
    shield: { borderRadius: '8% 8% 50% 50%', width: size, height: size * 1.15 },
    circle: { borderRadius: '50%', width: size, height: size },
    diamond: { borderRadius: '12px', width: size * 0.85, height: size * 0.85, transform: 'rotate(45deg)' },
    rounded: { borderRadius: '20%', width: size, height: size },
  };

  return (
    <div className="badge-preview" style={{
      ...shapeStyles[shape],
      background: `linear-gradient(160deg, ${color1} 0%, ${color1} 50%, ${color2} 50%, ${color2} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
      border: '2px solid rgba(255,255,255,0.15)',
      position: 'relative',
    }}>
      <div style={{ transform: shape === 'diamond' ? 'rotate(-45deg)' : 'none' }}>
        <IconComp size={size * 0.38} color="rgba(255,255,255,0.95)" strokeWidth={1.5} />
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
      <div className="badge-editor__preview">
        <BadgePreview badge={badge} size={120} />
      </div>

      <div className="badge-editor__section">
        <label className="badge-editor__label">Forma</label>
        <div className="badge-editor__shapes">
          {SHAPES.map(s => (
            <button key={s} className={`badge-editor__shape-btn ${badge.shape === s ? 'active' : ''}`}
              onClick={() => update('shape', s)}>
              <BadgePreview badge={{ ...badge, shape: s }} size={36} />
            </button>
          ))}
        </div>
      </div>

      <div className="badge-editor__section">
        <label className="badge-editor__label">Color principal</label>
        <div className="badge-editor__colors">
          {COLORS.map(c => (
            <button key={`c1_${c}`} className={`badge-editor__color-btn ${badge.color1 === c ? 'active' : ''}`}
              style={{ background: c }} onClick={() => update('color1', c)} />
          ))}
        </div>
      </div>

      <div className="badge-editor__section">
        <label className="badge-editor__label">Color secundario</label>
        <div className="badge-editor__colors">
          {COLORS.map(c => (
            <button key={`c2_${c}`} className={`badge-editor__color-btn ${badge.color2 === c ? 'active' : ''}`}
              style={{ background: c }} onClick={() => update('color2', c)} />
          ))}
          {['#ffd740', '#ffffff', '#c0c0c0', '#212121'].map(c => (
            <button key={`c2x_${c}`} className={`badge-editor__color-btn ${badge.color2 === c ? 'active' : ''}`}
              style={{ background: c }} onClick={() => update('color2', c)} />
          ))}
        </div>
      </div>

      <div className="badge-editor__section">
        <label className="badge-editor__label">Icono</label>
        <div className="badge-editor__icons">
          {ICONS.map(({ id, Icon }) => (
            <button key={id} className={`badge-editor__icon-btn ${badge.icon === id ? 'active' : ''}`}
              onClick={() => update('icon', id)}>
              <Icon size={20} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
