import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Star, Crown, Trophy, Shield, Sword, Swords, Flame, Zap, Mountain, Anchor,
  Bird, Sun, Moon, Compass, Castle, Waves, Trees, Target, Flag, Medal,
  Heart, Rocket, Gem, Award, Feather, Leaf, Skull, Crosshair, Wind, Snowflake,
  Droplets, Sparkles, Hexagon, Hammer, Axe, Bell, Key, Cat, Fish, Landmark,
  Atom, Bone, Ship, PawPrint, Volleyball, Globe, Shapes, Palette, Type,
} from 'lucide-react';

// ── Crest silhouettes. Each shape is either clip-path (polygon) or border-radius.
// `ratio` is height / width so each silhouette keeps its natural proportions.
const SHAPES = {
  shield:      { label: 'Escudo',    clip: 'polygon(50% 100%, 8% 72%, 8% 4%, 92% 4%, 92% 72%)', ratio: 1.14 },
  pointed:     { label: 'Gótico',    clip: 'polygon(50% 100%, 4% 56%, 10% 4%, 90% 4%, 96% 56%)', ratio: 1.2 },
  classic:     { label: 'Clásico',   clip: 'polygon(50% 100%, 6% 78%, 0% 30%, 12% 4%, 88% 4%, 100% 30%, 94% 78%)', ratio: 1.12 },
  circle:      { label: 'Roundel',   radius: '50%', ratio: 1 },
  oval:        { label: 'Óvalo',     radius: '50%', ratio: 1.24 },
  diamond:     { label: 'Diamante',  clip: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)', ratio: 1 },
  hexagon:     { label: 'Hexágono',  clip: 'polygon(50% 0, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)', ratio: 1.1 },
  pentagon:    { label: 'Pentágono', clip: 'polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)', ratio: 1.04 },
  triangle:    { label: 'Triángulo', clip: 'polygon(50% 2%, 98% 96%, 2% 96%)', ratio: 1 },
  banner:      { label: 'Banderín',  clip: 'polygon(8% 0, 92% 0, 92% 80%, 50% 100%, 8% 80%)', ratio: 1.18 },
  castle:      { label: 'Almenado',  clip: 'polygon(4% 100%, 4% 22%, 20% 22%, 20% 6%, 40% 6%, 40% 22%, 60% 22%, 60% 6%, 80% 6%, 80% 22%, 96% 22%, 96% 100%)', ratio: 1.06 },
  rounded:     { label: 'Moderno',   radius: '24%', ratio: 1.06 },
  badge:       { label: 'Placa',     radius: '14%', ratio: 1.1 },
};
const SHAPE_KEYS = Object.keys(SHAPES);

// ── Layout / pattern fills. Each returns a CSS background string from two colors.
const PATTERNS = {
  gradient:   { label: 'Degradado',  fill: (a, b) => `linear-gradient(160deg, ${a}, ${b})` },
  solid:      { label: 'Liso',       fill: (a) => a },
  split:      { label: 'Diagonal',   fill: (a, b) => `linear-gradient(135deg, ${a} 0 50%, ${b} 50% 100%)` },
  halves:     { label: 'Mitades',    fill: (a, b) => `linear-gradient(90deg, ${a} 0 50%, ${b} 50% 100%)` },
  vertical:   { label: 'Franjas V',  fill: (a, b) => `repeating-linear-gradient(90deg, ${a} 0 14.28%, ${b} 14.28% 28.57%)` },
  horizontal: { label: 'Franjas H',  fill: (a, b) => `repeating-linear-gradient(180deg, ${a} 0 12.5%, ${b} 12.5% 25%)` },
  quarters:   { label: 'Cuartos',    fill: (a, b) => `conic-gradient(${a} 0 90deg, ${b} 90deg 180deg, ${a} 180deg 270deg, ${b} 270deg 360deg)` },
  sash:       { label: 'Banda',      fill: (a, b) => `linear-gradient(115deg, transparent 0 34%, ${b} 34% 55%, transparent 55% 100%), ${a}` },
  chevron:    { label: 'Galón',      fill: (a, b) => `linear-gradient(to bottom right, transparent 49%, ${b} 49% 61%, transparent 61%), linear-gradient(to bottom left, transparent 49%, ${b} 49% 61%, transparent 61%), ${a}` },
  band:       { label: 'Central',    fill: (a, b) => `linear-gradient(180deg, ${a} 0 37%, ${b} 37% 60%, ${a} 60% 100%)` },
  ring:       { label: 'Anillo',     fill: (a, b) => `radial-gradient(circle at 50% 46%, ${a} 0 33%, ${b} 33% 47%, ${a} 47% 100%)` },
};
const PATTERN_KEYS = Object.keys(PATTERNS);

const ICONS = [
  { id: 'star', Icon: Star, label: 'Estrella' },
  { id: 'crown', Icon: Crown, label: 'Corona' },
  { id: 'trophy', Icon: Trophy, label: 'Trofeo' },
  { id: 'shield', Icon: Shield, label: 'Defensa' },
  { id: 'sword', Icon: Sword, label: 'Espada' },
  { id: 'swords', Icon: Swords, label: 'Espadas' },
  { id: 'flame', Icon: Flame, label: 'Fuego' },
  { id: 'zap', Icon: Zap, label: 'Rayo' },
  { id: 'mountain', Icon: Mountain, label: 'Cima' },
  { id: 'anchor', Icon: Anchor, label: 'Ancla' },
  { id: 'bird', Icon: Bird, label: 'Ave' },
  { id: 'pawprint', Icon: PawPrint, label: 'Fiera' },
  { id: 'cat', Icon: Cat, label: 'Felino' },
  { id: 'fish', Icon: Fish, label: 'Pez' },
  { id: 'sun', Icon: Sun, label: 'Sol' },
  { id: 'moon', Icon: Moon, label: 'Luna' },
  { id: 'compass', Icon: Compass, label: 'Brújula' },
  { id: 'castle', Icon: Castle, label: 'Castillo' },
  { id: 'landmark', Icon: Landmark, label: 'Monumento' },
  { id: 'waves', Icon: Waves, label: 'Olas' },
  { id: 'droplets', Icon: Droplets, label: 'Gotas' },
  { id: 'trees', Icon: Trees, label: 'Bosque' },
  { id: 'leaf', Icon: Leaf, label: 'Hoja' },
  { id: 'wind', Icon: Wind, label: 'Viento' },
  { id: 'snowflake', Icon: Snowflake, label: 'Nieve' },
  { id: 'target', Icon: Target, label: 'Diana' },
  { id: 'crosshair', Icon: Crosshair, label: 'Punto' },
  { id: 'flag', Icon: Flag, label: 'Bandera' },
  { id: 'medal', Icon: Medal, label: 'Medalla' },
  { id: 'award', Icon: Award, label: 'Galardón' },
  { id: 'gem', Icon: Gem, label: 'Gema' },
  { id: 'heart', Icon: Heart, label: 'Corazón' },
  { id: 'rocket', Icon: Rocket, label: 'Cohete' },
  { id: 'feather', Icon: Feather, label: 'Pluma' },
  { id: 'skull', Icon: Skull, label: 'Calavera' },
  { id: 'bone', Icon: Bone, label: 'Hueso' },
  { id: 'hammer', Icon: Hammer, label: 'Martillo' },
  { id: 'axe', Icon: Axe, label: 'Hacha' },
  { id: 'bell', Icon: Bell, label: 'Campana' },
  { id: 'key', Icon: Key, label: 'Llave' },
  { id: 'atom', Icon: Atom, label: 'Átomo' },
  { id: 'hexagon', Icon: Hexagon, label: 'Núcleo' },
  { id: 'sparkles', Icon: Sparkles, label: 'Destello' },
  { id: 'ship', Icon: Ship, label: 'Barco' },
  { id: 'volleyball', Icon: Volleyball, label: 'Balón' },
  { id: 'globe', Icon: Globe, label: 'Globo' },
];
const ICON_MAP = Object.fromEntries(ICONS.map(i => [i.id, i]));

const SYMBOL_SIZES = { s: { label: 'S', factor: 0.3 }, m: { label: 'M', factor: 0.42 }, l: { label: 'L', factor: 0.54 } };
const TRIMS = { none: { label: 'Sin', factor: 0 }, thin: { label: 'Fino', factor: 0.028 }, med: { label: 'Medio', factor: 0.05 }, bold: { label: 'Grueso', factor: 0.085 } };

export const DEFAULT_BADGE = {
  shape: 'shield',
  pattern: 'gradient',
  color1: '#1a237e',
  color2: '#ffd740',
  borderColor: '#ffd740',
  symbolColor: '#ffffff',
  icon: 'star',
  symbolSize: 'm',
  trim: 'med',
  initials: '',
  showInitials: false,
};

// Normalize any saved badge (including legacy { shape, color1, color2, icon }) into
// the full shape the preview understands, falling back gracefully on unknown values.
function normalizeBadge(badge) {
  const b = badge || {};
  const color2 = b.color2 || b.accentColor || DEFAULT_BADGE.color2;
  return {
    shape: SHAPES[b.shape] ? b.shape : DEFAULT_BADGE.shape,
    // legacy badges have no pattern field — keep their two-tone diagonal look
    pattern: PATTERNS[b.pattern] ? b.pattern : (b.pattern == null ? 'split' : DEFAULT_BADGE.pattern),
    color1: b.color1 || DEFAULT_BADGE.color1,
    color2,
    borderColor: b.borderColor || color2,
    symbolColor: b.symbolColor || DEFAULT_BADGE.symbolColor,
    icon: ICON_MAP[b.icon] ? b.icon : DEFAULT_BADGE.icon,
    symbolSize: SYMBOL_SIZES[b.symbolSize] ? b.symbolSize : DEFAULT_BADGE.symbolSize,
    trim: TRIMS[b.trim] ? b.trim : DEFAULT_BADGE.trim,
    initials: typeof b.initials === 'string' ? b.initials.slice(0, 3) : '',
    showInitials: !!b.showInitials,
  };
}

function BadgePreview({ badge, size = 100 }) {
  const b = normalizeBadge(badge);
  const shape = SHAPES[b.shape];
  const IconComp = ICON_MAP[b.icon].Icon;
  const w = size;
  const h = size * shape.ratio;

  const clipStyle = shape.clip ? { clipPath: shape.clip } : { borderRadius: shape.radius };
  const trimPx = Math.max(shape.clip ? 0 : 0, size * TRIMS[b.trim].factor);
  const fill = PATTERNS[b.pattern].fill(b.color1, b.color2);
  const showInitials = b.showInitials && b.initials && size >= 52;
  const iconFactor = SYMBOL_SIZES[b.symbolSize].factor;

  return (
    <div className="badge-preview" style={{ width: w, height: h }}>
      <div className="badge-preview__crest" style={{ width: w, height: h, ...clipStyle, background: b.borderColor }}>
        <div
          className="badge-preview__fill"
          style={{
            position: 'absolute',
            inset: trimPx,
            ...clipStyle,
            background: fill,
          }}
        >
          <div className="badge-preview__glow" />
          <div className="badge-preview__shine" />
        </div>
        <div
          className="badge-preview__content"
          style={{ transform: b.shape === 'diamond' ? 'rotate(0deg)' : 'none' }}
        >
          <span className="badge-preview__icon">
            <IconComp size={size * iconFactor} color={b.symbolColor} strokeWidth={1.75} />
          </span>
          {showInitials && (
            <span
              className="badge-preview__initials"
              style={{ color: b.symbolColor, fontSize: size * 0.2, marginTop: size * 0.02 }}
            >
              {b.initials.toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export { BadgePreview, normalizeBadge };

const TABS = [
  { id: 'shape', label: 'Forma', Icon: Shapes },
  { id: 'pattern', label: 'Patrón', Icon: Hexagon },
  { id: 'color', label: 'Colores', Icon: Palette },
  { id: 'symbol', label: 'Símbolo', Icon: Type },
];

const PRESET_COLORS = [
  '#1a237e', '#0d47a1', '#006064', '#1b5e20', '#2e7d32', '#33691e',
  '#b71c1c', '#880e4f', '#4a148c', '#311b92', '#e65100', '#f57f17',
  '#bf360c', '#3e2723', '#263238', '#212121', '#004d40', '#01579b',
];
const PRESET_ACCENTS = [
  '#ffd740', '#ffffff', '#c0c0c0', '#ffab40', '#00e676', '#40c4ff',
  '#ff5252', '#e040fb', '#69f0ae', '#ffd180', '#b9f6ca', '#212121',
];

function ColorRow({ label, value, presets, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="badge-editor__color-row">
      <div className="badge-editor__color-row-head">
        <span className="badge-editor__color-row-label">{label}</span>
        <label className="badge-editor__color-picker" style={{ background: value }}>
          <input type="color" value={value} onChange={e => onChange(e.target.value)} aria-label={t('glory.badge.custom', { label })} />
        </label>
      </div>
      <div className="badge-editor__swatch-row">
        {presets.map(c => (
          <button
            type="button"
            key={c}
            className={`badge-editor__swatch ${value?.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
            style={{ '--swatch': c }}
            onClick={() => onChange(c)}
            aria-label={`${label} ${c}`}
          >
            <span />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BadgeEditor({ value, onChange, teamName = '' }) {
  const { t } = useTranslation();
  const [badge, setBadge] = useState(() => normalizeBadge(value || DEFAULT_BADGE));
  const [tab, setTab] = useState('shape');

  const update = (patch) => {
    const next = { ...badge, ...patch };
    setBadge(next);
    onChange?.(next);
  };

  const fallbackInitials = (teamName || '').replace(/[^a-zA-ZÀ-ÿ ]/g, '').split(/\s+/).filter(Boolean)
    .map(w => w[0]).join('').slice(0, 3).toUpperCase();

  return (
    <div className="badge-editor" data-glory-step="badge">
      <aside className="badge-editor__preview" data-audit="badge-preview">
        <BadgePreview badge={badge} size={150} />
        <div className="badge-editor__swatches">
          <span style={{ background: badge.color1 }} title={t('glory.badge.primaryTitle')} />
          <span style={{ background: badge.color2 }} title={t('glory.badge.secondaryTitle')} />
          <span style={{ background: badge.borderColor }} title={t('glory.badge.borderLabel')} />
          <span style={{ background: badge.symbolColor }} title={t('glory.badge.symbol')} />
        </div>
        <div className="badge-editor__caption">
          <span>{t('glory.badge.shapes.' + badge.shape)}</span>
          <span>{t('glory.badge.patterns.' + badge.pattern)}</span>
          <span>{t('glory.badge.icons.' + badge.icon)}</span>
        </div>
      </aside>

      <div className="badge-editor__controls">
        <div className="badge-editor__tabs" role="tablist">
          {TABS.map(({ id, Icon }) => (
            <button
              type="button"
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={`badge-editor__tab ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={15} /> <span>{t('glory.badge.tabs.' + id)}</span>
            </button>
          ))}
        </div>

        <div className="badge-editor__panel">
          {tab === 'shape' && (
            <div className="badge-editor__grid badge-editor__grid--shapes">
              {SHAPE_KEYS.map(s => (
                <button
                  type="button"
                  key={s}
                  className={`badge-editor__tile ${badge.shape === s ? 'active' : ''}`}
                  onClick={() => update({ shape: s })}
                >
                  <span className="badge-editor__tile-preview">
                    <BadgePreview badge={{ ...badge, shape: s }} size={34} />
                  </span>
                  <span className="badge-editor__tile-name">{t('glory.badge.shapes.' + s)}</span>
                </button>
              ))}
            </div>
          )}

          {tab === 'pattern' && (
            <div className="badge-editor__grid badge-editor__grid--patterns">
              {PATTERN_KEYS.map(p => (
                <button
                  type="button"
                  key={p}
                  className={`badge-editor__tile ${badge.pattern === p ? 'active' : ''}`}
                  onClick={() => update({ pattern: p })}
                >
                  <span className="badge-editor__tile-swatch" style={{ background: PATTERNS[p].fill(badge.color1, badge.color2) }} />
                  <span className="badge-editor__tile-name">{t('glory.badge.patterns.' + p)}</span>
                </button>
              ))}
            </div>
          )}

          {tab === 'color' && (
            <div className="badge-editor__colors">
              <ColorRow label={t('glory.badge.primary')} value={badge.color1} presets={PRESET_COLORS} onChange={v => update({ color1: v })} />
              <ColorRow label={t('glory.badge.secondary')} value={badge.color2} presets={[...PRESET_ACCENTS, ...PRESET_COLORS.slice(0, 6)]} onChange={v => update({ color2: v })} />
              <ColorRow label={t('glory.badge.border')} value={badge.borderColor} presets={PRESET_ACCENTS} onChange={v => update({ borderColor: v })} />
              <ColorRow label={t('glory.badge.symbol')} value={badge.symbolColor} presets={PRESET_ACCENTS} onChange={v => update({ symbolColor: v })} />
              <div className="badge-editor__seg-block">
                <span className="badge-editor__seg-label">{t('glory.badge.borderWidth')}</span>
                <div className="badge-editor__seg">
                  {Object.entries(TRIMS).map(([id]) => (
                    <button type="button" key={id} className={`badge-editor__seg-btn ${badge.trim === id ? 'active' : ''}`} onClick={() => update({ trim: id })}>
                      {t('glory.badge.trims.' + id)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'symbol' && (
            <div className="badge-editor__symbol-tab">
              <div className="badge-editor__grid badge-editor__grid--icons">
                {ICONS.map(({ id, Icon }) => (
                  <button
                    type="button"
                    key={id}
                    title={t('glory.badge.icons.' + id)}
                    aria-label={t('glory.badge.icons.' + id)}
                    className={`badge-editor__icon-btn ${badge.icon === id ? 'active' : ''}`}
                    onClick={() => update({ icon: id })}
                  >
                    <Icon size={19} />
                  </button>
                ))}
              </div>

              <div className="badge-editor__symbol-rows">
                <div className="badge-editor__seg-block">
                  <span className="badge-editor__seg-label">{t('glory.badge.symbolSize')}</span>
                  <div className="badge-editor__seg">
                    {Object.entries(SYMBOL_SIZES).map(([id, s]) => (
                      <button type="button" key={id} className={`badge-editor__seg-btn ${badge.symbolSize === id ? 'active' : ''}`} onClick={() => update({ symbolSize: id })}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="badge-editor__initials">
                  <button
                    type="button"
                    className={`badge-editor__toggle ${badge.showInitials ? 'active' : ''}`}
                    onClick={() => update({ showInitials: !badge.showInitials, initials: badge.initials || fallbackInitials })}
                    aria-pressed={badge.showInitials}
                  >
                    <span className="badge-editor__toggle-dot" /> {t('glory.badge.initials')}
                  </button>
                  <input
                    type="text"
                    className="badge-editor__initials-input"
                    value={badge.initials}
                    placeholder={fallbackInitials || 'ABC'}
                    maxLength={3}
                    disabled={!badge.showInitials}
                    onChange={e => update({ initials: e.target.value.toUpperCase().replace(/[^A-ZÀ-ÿ0-9]/gi, '') })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
