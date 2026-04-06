import React from 'react';
import './LoadingIndicator.scss';

export default function LoadingIndicator({ size = 'md', label = null, className = '' }) {
  return (
    <div className={`loading-indicator loading-indicator--${size} ${className}`.trim()}>
      <span className="loading-indicator__ring" aria-hidden="true">
        <span className="loading-indicator__core" />
      </span>
      {label ? <span className="loading-indicator__label">{label}</span> : null}
    </div>
  );
}
