import React, { useState } from 'react';
import { Globe, X } from 'lucide-react';
import { LEAGUE_CONFIG } from '../../game/multiLeagueEngine';
import './TransferMap.scss';

const COUNTRIES = [
  { id: 'spain', name: 'España', leagues: ['laliga', 'segunda'], x: 25, y: 58, flag: '🇪🇸' },
  { id: 'england', name: 'Inglaterra', leagues: ['premierLeague'], x: 28, y: 35, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'france', name: 'Francia', leagues: ['ligue1'], x: 32, y: 48, flag: '🇫🇷' },
  { id: 'germany', name: 'Alemania', leagues: ['bundesliga'], x: 42, y: 38, flag: '🇩🇪' },
  { id: 'italy', name: 'Italia', leagues: ['serieA'], x: 44, y: 55, flag: '🇮🇹' },
  { id: 'netherlands', name: 'Países Bajos', leagues: ['eredivisie'], x: 38, y: 32, flag: '🇳🇱' },
  { id: 'portugal', name: 'Portugal', leagues: ['primeiraLiga'], x: 18, y: 58, flag: '🇵🇹' },
];

// Build LEAGUE_NAMES from LEAGUE_CONFIG (single source of truth)
const LEAGUE_NAMES = Object.fromEntries(
  Object.entries(LEAGUE_CONFIG).map(([id, cfg]) => [id, cfg.name])
);

export default function TransferMap({ onSelectLeague, onClose }) {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);

  const handleCountryClick = (country) => {
    if (country.leagues.length === 1) {
      onSelectLeague(country.leagues[0]);
    } else {
      setSelectedCountry(country);
    }
  };

  const handleLeagueSelect = (leagueId) => {
    onSelectLeague(leagueId);
    setSelectedCountry(null);
  };

  return (
    <div className="transfer-map">
      <div className="transfer-map__header">
        <h2><Globe size={16} /> Mercado de Fichajes</h2>
        <p>Selecciona un país para explorar jugadores</p>
        <button className="close-btn" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="transfer-map__container">
        {/* Europe Map SVG Background */}
        <svg className="transfer-map__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {/* Simplified Europe shape */}
          <path 
            className="europe-shape"
            d="M15,30 Q20,25 30,28 L35,25 Q45,22 55,25 L65,28 Q75,30 80,35 
               L82,45 Q80,55 75,60 L70,65 Q60,70 50,68 L45,70 Q35,72 25,68 
               L20,62 Q15,55 12,45 L10,38 Q12,32 15,30 Z"
            fill="rgba(0,102,255,0.1)"
            stroke="rgba(0,102,255,0.3)"
            strokeWidth="0.5"
          />
        </svg>

        {/* Country markers */}
        <div className="transfer-map__markers">
          {COUNTRIES.map(country => (
            <button
              key={country.id}
              className={`country-marker ${hoveredCountry === country.id ? 'hovered' : ''} ${selectedCountry?.id === country.id ? 'selected' : ''}`}
              style={{ left: `${country.x}%`, top: `${country.y}%` }}
              onClick={() => handleCountryClick(country)}
              onMouseEnter={() => setHoveredCountry(country.id)}
              onMouseLeave={() => setHoveredCountry(null)}
            >
              <span className="flag">{country.flag}</span>
              <span className="pulse"></span>
            </button>
          ))}
        </div>

        {/* Country tooltip */}
        {hoveredCountry && !selectedCountry && (
          <div 
            className="transfer-map__tooltip"
            style={{ 
              left: `${COUNTRIES.find(c => c.id === hoveredCountry)?.x}%`,
              top: `${COUNTRIES.find(c => c.id === hoveredCountry)?.y - 12}%`
            }}
          >
            {COUNTRIES.find(c => c.id === hoveredCountry)?.name}
          </div>
        )}

        {/* League selection popup */}
        {selectedCountry && (
          <div className="transfer-map__popup">
            <div className="popup-header">
              <span className="flag">{selectedCountry.flag}</span>
              <h3>{selectedCountry.name}</h3>
              <button onClick={() => setSelectedCountry(null)}><X size={14} /></button>
            </div>
            <div className="popup-leagues">
              {selectedCountry.leagues.map(leagueId => (
                <button 
                  key={leagueId}
                  className="league-btn"
                  onClick={() => handleLeagueSelect(leagueId)}
                >
                  {LEAGUE_NAMES[leagueId]}
                  <span className="arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="transfer-map__quick-access">
        <span className="label">Acceso rápido:</span>
        <div className="flags">
          {COUNTRIES.map(country => (
            <button
              key={country.id}
              className="quick-flag"
              onClick={() => handleCountryClick(country)}
              title={country.name}
            >
              {country.flag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
