import React from 'react';
import './LoadingIndicator.scss';

export default function LoadingIndicator({ size = 'md', label = null, className = '' }) {
  return (
    <div
      className={`loading-indicator loading-indicator--${size} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <svg
        className="loading-indicator__mark"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
      >
        <circle className="loading-indicator__ring-outer" cx="24" cy="24" r="20" />
        <circle className="loading-indicator__ring-inner" cx="24" cy="24" r="14" />
        <circle className="loading-indicator__spot" cx="24" cy="24" r="1.6" />
        <circle className="loading-indicator__sweep" cx="24" cy="24" r="20" />
      </svg>
      {label ? <span className="loading-indicator__label">{label}</span> : null}
    </div>
  );
}
