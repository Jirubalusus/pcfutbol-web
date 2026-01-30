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
  
  // Siempre formato M (0.1M, 0.5M, 2.0M, etc.)
  const formatDisplay = (val) => {
    const m = val / 1000000;
    if (m >= 100) return `${Math.round(m)}M`;
    if (m >= 10) return `${m.toFixed(1)}M`;
    return `${m.toFixed(1)}M`;
  };
  
  const clamp = useCallback((val) => {
    let clamped = Math.max(min, val);
    if (max !== undefined) clamped = Math.min(max, clamped);
    return clamped;
  }, [min, max]);
  
  const startHold = useCallback((direction) => {
    if (disabled) return;
    tickCountRef.current = 0;
    
    // Primer click inmediato (1x step)
    if (direction === 'up') {
      onChange(clamp(value + step));
    } else {
      onChange(clamp(value - step));
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
          onChange(v => clamp(v + step * multiplier));
        } else {
          onChange(v => clamp(v - step * multiplier));
        }
      }, 150); // 150ms entre ticks (antes era 80ms)
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
