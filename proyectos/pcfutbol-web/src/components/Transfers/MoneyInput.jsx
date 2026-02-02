import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * MoneyInput - Input de dinero con formato M y botones +/- con aceleración suave
 * 
 * Props:
 * - value: valor en unidades (ej: 2500000)
 * - onChange: callback con nuevo valor
 * - step: incremento base (ej: 500000 para 0.5M, 100000 para 0.1M)
 * - min: mínimo (default 0)
 * - max: máximo opcional
 * - disabled: desactivar
 * - suffix: texto después del valor (ej: "/sem")
 * - prefix: texto antes (ej: "€")
 */
export default function MoneyInput({ value, onChange, step = 500000, min = 0, max, disabled, suffix = '', prefix = '€' }) {
  const [holding, setHolding] = useState(null); // 'up' | 'down' | null
  const intervalRef = useRef(null);
  const tickCountRef = useRef(0);
  
  // Formato: K por debajo de 1M, M a partir de 1M
  const formatDisplay = (val) => {
    if (val < 1_000_000) {
      return `${Math.round(val / 1000)}K`;
    }
    const m = val / 1_000_000;
    if (m >= 100) return `${Math.round(m)}M`;
    // Mostrar decimal solo si lo hay
    const fixed1 = m.toFixed(1);
    const fixed2 = m.toFixed(2);
    if (fixed2.endsWith('0')) return `${fixed1}M`;
    return `${fixed2}M`;
  };
  
  // Step dinámico proporcional al valor actual
  const getStep = (currentVal) => {
    if (currentVal < 1_000_000) return 50_000;     // <1M  → 50K
    if (currentVal < 5_000_000) return 100_000;     // 1-5M → 100K
    if (currentVal < 20_000_000) return 250_000;    // 5-20M → 250K
    if (currentVal < 50_000_000) return 500_000;    // 20-50M → 500K
    return 1_000_000;                               // 50M+ → 1M
  };
  
  const clamp = useCallback((val) => {
    let clamped = Math.max(min, val);
    if (max !== undefined) clamped = Math.min(max, clamped);
    return clamped;
  }, [min, max]);
  
  const startHold = useCallback((direction) => {
    if (disabled) return;
    tickCountRef.current = 0;
    
    // Primer click inmediato con step dinámico
    const currentStep = getStep(value);
    if (direction === 'up') {
      onChange(clamp(value + currentStep));
    } else {
      onChange(clamp(value - currentStep));
    }
    
    setHolding(direction);
    
    // Hold: empieza después de 500ms, intervalo 150ms, aceleración suave
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        tickCountRef.current++;
        const ticks = tickCountRef.current;
        // Aceleración suave: x1 hasta 15 ticks (~2.2s), x2 hasta 40 (~6s), x3 después
        let multiplier = 1;
        if (ticks > 40) multiplier = 3;
        else if (ticks > 15) multiplier = 2;
        
        if (direction === 'up') {
          onChange(v => {
            const s = getStep(v);
            return clamp(v + s * multiplier);
          });
        } else {
          onChange(v => {
            const s = getStep(v);
            return clamp(v - s * multiplier);
          });
        }
      }, 150);
      intervalRef.current = interval;
    }, 500);
    
    intervalRef.current = timeout;
  }, [disabled, value, step, clamp, onChange]);
  
  const stopHold = useCallback(() => {
    setHolding(null);
    tickCountRef.current = 0;
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  return (
    <div className={`money-input ${disabled ? 'disabled' : ''}`}>
      <button
        className={`money-btn minus ${holding === 'down' ? 'active' : ''}`}
        onMouseDown={() => startHold('down')}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={() => startHold('down')}
        onTouchEnd={stopHold}
        disabled={disabled || value <= min}
      >
        −
      </button>
      <div className="money-display">
        <span className="money-prefix">{prefix}</span>
        <span className="money-value">{formatDisplay(value)}</span>
        {suffix && <span className="money-suffix">{suffix}</span>}
      </div>
      <button
        className={`money-btn plus ${holding === 'up' ? 'active' : ''}`}
        onMouseDown={() => startHold('up')}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={() => startHold('up')}
        onTouchEnd={stopHold}
        disabled={disabled || (max !== undefined && value >= max)}
      >
        +
      </button>
    </div>
  );
}
