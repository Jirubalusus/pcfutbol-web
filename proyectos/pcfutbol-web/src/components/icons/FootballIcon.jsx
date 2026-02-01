import React from 'react';

/**
 * Professional football/soccer ball icon.
 * Drop-in replacement for Lucide icons (same props API).
 */
export default function FootballIcon({ size = 24, className = '', style = {}, strokeWidth = 2, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      {...props}
    >
      {/* Outer circle */}
      <circle cx="12" cy="12" r="10" />
      {/* Center pentagon */}
      <polygon points="12,7 15.09,9.18 13.9,12.82 10.1,12.82 8.91,9.18" />
      {/* Lines from pentagon vertices to edge */}
      <line x1="12" y1="7" x2="12" y2="2.5" />
      <line x1="15.09" y1="9.18" x2="19.8" y2="7.2" />
      <line x1="13.9" y1="12.82" x2="18.5" y2="16" />
      <line x1="10.1" y1="12.82" x2="5.5" y2="16" />
      <line x1="8.91" y1="9.18" x2="4.2" y2="7.2" />
    </svg>
  );
}
