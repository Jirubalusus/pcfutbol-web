import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * MoneyInput - Input de dinero con botones +/- y aceleración suave
 */
export default function MoneyInput({ value, onChange, step = 500000, min = 0, max, disabled, suffix = '', prefix = '€' }) {
  const [holding, setHolding] = useState(null);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const tickCountRef = useRef(0);
  const valueRef = useRef(value);
  
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  
  const formatDisplay = (val) => {
    if (val == null || isNaN(val)) return '0';
    if (val < 1_000_000) {
      return `${Math.round(val / 1000)}K`;
    }
    const m = val / 1_000_000;
    if (m >= 100) return `${Math.round(m)}M`;
    const fixed1 = m.toFixed(1);
    const fixed2 = m.toFixed(2);
    if (fixed2.endsWith('0')) return `${fixed1}M`;
    return `${fixed2}M`;
  };
  
  // Smart step: proportional to current value, snaps to nice numbers
  const getStep = (currentVal) => {
    if (currentVal < 500_000) return 50_000;          // <500K → 50K steps
    if (currentVal < 2_000_000) return 100_000;        // 500K-2M → 100K
    if (currentVal < 10_000_000) return 500_000;       // 2M-10M → 500K
    if (currentVal < 50_000_000) return 1_000_000;     // 10M-50M → 1M
    if (currentVal < 100_000_000) return 2_000_000;    // 50M-100M → 2M
    return 5_000_000;                                   // 100M+ → 5M
  };
  
  const clamp = useCallback((val) => {
    let clamped = Math.max(min, val);
    if (max !== undefined) clamped = Math.min(max, clamped);
    // Round to step to avoid weird decimals
    const s = getStep(clamped);
    clamped = Math.round(clamped / s) * s;
    clamped = Math.max(min, clamped);
    if (max !== undefined) clamped = Math.min(max, clamped);
    return clamped;
  }, [min, max]);
  
  const applyChange = useCallback((direction, multiplier = 1) => {
    const current = valueRef.current;
    const s = getStep(current);
    const newVal = direction === 'up' 
      ? clamp(current + s * multiplier)
      : clamp(current - s * multiplier);
    if (newVal !== current) {
      valueRef.current = newVal;
      onChange(newVal);
    }
  }, [clamp, onChange]);
  
  const startHold = useCallback((direction) => {
    if (disabled) return;
    tickCountRef.current = 0;
    
    // First click — immediate
    applyChange(direction);
    setHolding(direction);
    
    // Hold: starts after 400ms, interval 120ms, smooth acceleration
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      intervalRef.current = setInterval(() => {
        tickCountRef.current++;
        const ticks = tickCountRef.current;
        let multiplier = 1;
        if (ticks > 30) multiplier = 4;
        else if (ticks > 15) multiplier = 2;
        
        applyChange(direction, multiplier);
      }, 120);
    }, 400);
  }, [disabled, applyChange]);
  
  const stopHold = useCallback(() => {
    setHolding(null);
    tickCountRef.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Global mouseup/touchend to catch releases outside the button
  useEffect(() => {
    const handleGlobalUp = () => {
      if (holding) stopHold();
    };
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    window.addEventListener('touchcancel', handleGlobalUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
      window.removeEventListener('touchcancel', handleGlobalUp);
    };
  }, [holding, stopHold]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
  
  return (
    <div className={`money-input ${disabled ? 'disabled' : ''}`}>
      <button
        className={`money-btn minus ${holding === 'down' ? 'active' : ''}`}
        onMouseDown={() => startHold('down')}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={(e) => { e.preventDefault(); startHold('down'); }}
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
        onTouchStart={(e) => { e.preventDefault(); startHold('up'); }}
        onTouchEnd={stopHold}
        disabled={disabled || (max !== undefined && value >= max)}
      >
        +
      </button>
    </div>
  );
}
