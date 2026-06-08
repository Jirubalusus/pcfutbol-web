import React from 'react';
import { createRoot } from 'react-dom/client';
import TeamCrest from '../../../src/components/TeamCrest/TeamCrest.jsx';

window.renderGeneratedTeamCrest = function renderGeneratedTeamCrest({ teamId = 'fc-barcelona', size = 128 } = {}) {
  const root = document.getElementById('root');
  createRoot(root).render(React.createElement(TeamCrest, { teamId, size }));
};
