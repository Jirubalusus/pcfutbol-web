import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * MoneyInput - Input de dinero con formato M/K y botones +/- con aceleración
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
  const speedRef = useRef(1); // Multiplicador de velocidad
  const tickCountRef = useRef(0);
  
  const formatDisplay = (val) => {
    if (val >= 1000000) {
      const m = val / 1000000;
      // Mostrar decimal solo si no es entero
      return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
    }
    if (val >= 1000) {
      const k = val / 1000;
      return k % 1 === 0 ? `${k}K` : `${k.toFixed(0)}K`;
    }
    return `${val}`;
  };
  
  const clamp = useCallback((val) => {
    let clamped = Math.max(min, val);
    if (max !== undefined) clamped = Math.min(max, clamped);
    return clamped;
  }, [min, max]);
  
  const increment = useCallback(() => {
    tickCountRef.current++;
    // Aceleración: después de 5 ticks sube x2, después de 15 sube x5, después de 30 sube x10
    const ticks = tickCountRef.current;
    let multiplier = 1;
    if (ticks > 30) multiplier = 10;
    else if (ticks > 15) multiplier = 5;
    else if (ticks > 5) multiplier = 2;
    
    onChange(prev => clamp((typeof prev === 'function' ? prev : value) + step * multiplier));
  }, [value, step, clamp, onChange]);
  
  const decrement = useCallback(() => {
    tickCountRef.current++;
    const ticks = tickCountRef.current;
    let multiplier = 1;
    if (ticks > 30) multiplier = 10;
    else if (ticks > 15) multiplier = 5;
    else if (ticks > 5) multiplier = 2;
    
    onChange(prev => clamp((typeof prev === 'function' ? prev : value) - step * multiplier));
  }, [value, step, clamp, onChange]);
  
  const startHold = useCallback((direction) => {
    if (disabled) return;
    tickCountRef.current = 0;
    
    // Primer click inmediato
    if (direction === 'up') {
      onChange(clamp(value + step));
    } else {
      onChange(clamp(value - step));
    }
    
    setHolding(direction);
    
    // Inicio del hold después de 400ms
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        tickCountRef.current++;
        const ticks = tickCountRef.current;
        let multiplier = 1;
        if (ticks > 30) multiplier = 10;
        else if (ticks > 15) multiplier = 5;
        else if (ticks > 5) multiplier = 2;
        
        if (direction === 'up') {
          onChange(v => clamp(v + step * multiplier));
        } else {
          onChange(v => clamp(v - step * multiplier));
        }
      }, 80); // 80ms entre ticks cuando se mantiene pulsado
      intervalRef.current = interval;
    }, 400);
    
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
