import React, { useEffect, useRef, useState } from 'react';

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedNumber({ value, prefix = '', suffix = '', duration = 600 }) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = prevValue.current;
    const to = value;
    prevValue.current = value;
    
    if (from === to) return;
    
    const start = performance.now();
    
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const formatted = Math.abs(display) >= 1000000 
    ? `${(Math.abs(display) / 1000000).toFixed(1)}M`
    : Math.abs(display) >= 1000 
      ? `${Math.round(Math.abs(display) / 1000)}K`
      : `${Math.abs(display)}`;
  
  const sign = display < 0 ? '-' : '';
  
  return <span>{sign}{prefix}{formatted}{suffix}</span>;
}
