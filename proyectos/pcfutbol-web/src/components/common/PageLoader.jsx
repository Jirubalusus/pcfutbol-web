import React from 'react';
import LoadingIndicator from './LoadingIndicator';
import './PageLoader.scss';

export default function PageLoader({ label = 'Cargando', size = 'xl' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader__stage">
        <LoadingIndicator size={size} />
        <span className="page-loader__label">{label}</span>
      </div>
    </div>
  );
}
