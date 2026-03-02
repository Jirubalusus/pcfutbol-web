import React, { useMemo } from 'react';
import './Confetti.scss';

const COLORS = ['#ffd700', '#ffb347', '#6495ED', '#ff6b6b', '#51cf66', '#fff', '#e8c547'];

export default function Confetti({ count = 60 }) {
  const particles = useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2.5 + Math.random() * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
      isCircle: Math.random() > 0.6,
    })), [count]
  );

  return (
    <div className="confetti-overlay">
      {particles.map(p => (
        <div
          key={p.id}
          className={`confetti-particle ${p.isCircle ? 'confetti-particle--circle' : ''}`}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: p.isCircle ? `${p.size}px` : `${p.size * 2.5}px`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
