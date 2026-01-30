import React, { useRef, useEffect, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import './EuropeMap.scss';

// Datos de países
const COUNTRY_DATA = {
  spain: { lat: 40.0, lng: -4.0, name: 'España', code: 'ES', color: '#FF4444' },
  england: { lat: 53.0, lng: -1.5, name: 'Reino Unido', code: 'UK', color: '#4466FF' },
  germany: { lat: 51.0, lng: 10.0, name: 'Alemania', code: 'DE', color: '#FFCC00' },
  italy: { lat: 42.5, lng: 12.5, name: 'Italia', code: 'IT', color: '#33CC33' },
  france: { lat: 46.5, lng: 2.5, name: 'Francia', code: 'FR', color: '#5555FF' },
  portugal: { lat: 39.5, lng: -8.0, name: 'Portugal', code: 'PT', color: '#22AA44' },
  netherlands: { lat: 52.3, lng: 5.3, name: 'Países Bajos', code: 'NL', color: '#FF7700' },
  belgium: { lat: 50.8, lng: 4.4, name: 'Bélgica', code: 'BE', color: '#FFDD00' },
  turkey: { lat: 39.0, lng: 35.0, name: 'Turquía', code: 'TR', color: '#E30A17' },
  scotland: { lat: 56.5, lng: -4.0, name: 'Escocia', code: 'SCO', color: '#003399' },
  switzerland: { lat: 46.8, lng: 8.2, name: 'Suiza', code: 'CH', color: '#FF0000' },
  austria: { lat: 47.5, lng: 14.5, name: 'Austria', code: 'AT', color: '#ED2939' },
  greece: { lat: 38.5, lng: 23.7, name: 'Grecia', code: 'GR', color: '#0D5EAF' },
  denmark: { lat: 56.0, lng: 10.0, name: 'Dinamarca', code: 'DK', color: '#C60C30' },
  croatia: { lat: 45.1, lng: 15.2, name: 'Croacia', code: 'HR', color: '#FF3333' },
  czech: { lat: 49.8, lng: 15.5, name: 'Chequia', code: 'CZ', color: '#11457E' }
};

// Breakpoint para móvil
const MOBILE_BREAKPOINT = 768;

export default function EuropeMap({ countries, selectedCountry, onCountryClick, hideOnMobileWhenSelected = false }) {
  const globeEl = useRef();
  const [size, setSize] = useState(400);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive + detección móvil
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width < MOBILE_BREAKPOINT);
      // En pantallas pequeñas, globo más pequeño
      if (width < 500) {
        setSize(Math.min(280, width * 0.7));
      } else if (width < 768) {
        setSize(Math.min(320, width * 0.5));
      } else {
        setSize(Math.min(450, width * 0.32));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Centrar en Europa
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 48, lng: 5, altitude: 2.0 }, 0);
    }
  }, []);

  // Zoom al país seleccionado
  useEffect(() => {
    if (globeEl.current && selectedCountry && COUNTRY_DATA[selectedCountry]) {
      const { lat, lng } = COUNTRY_DATA[selectedCountry];
      globeEl.current.pointOfView({ lat, lng, altitude: 1.6 }, 600);
    }
  }, [selectedCountry]);

  // Crear marcadores
  const markersData = useMemo(() => {
    return countries.map(c => {
      const data = COUNTRY_DATA[c.id];
      if (!data) return null;
      return {
        id: c.id,
        lat: data.lat,
        lng: data.lng,
        name: c.name,
        flag: c.flag,
        code: data.code,
        color: data.color,
        leagues: c.leagues.length,
        isSelected: selectedCountry === c.id
      };
    }).filter(Boolean);
  }, [countries, selectedCountry]);

  const handleClick = (d) => {
    if (d?.id) {
      onCountryClick(d.id);
    }
  };

  // Vista móvil: lista de países (ocultar si ya hay país seleccionado)
  if (isMobile) {
    // Si ya hay país seleccionado, no mostrar la lista (el panel de ligas se mostrará)
    if (selectedCountry) {
      return null;
    }
    
    return (
      <div className="countries-mobile">
        <h3 className="countries-mobile__title">🌍 Selecciona un país</h3>
        <div className="countries-mobile__list">
          {countries.map(country => (
            <button
              key={country.id}
              className={`countries-mobile__item ${selectedCountry === country.id ? 'selected' : ''}`}
              onClick={() => onCountryClick(country.id)}
            >
              <span className="countries-mobile__flag">{country.flag}</span>
              <span className="countries-mobile__name">{country.name}</span>
              <span className="countries-mobile__leagues">{country.leagues.length} liga{country.leagues.length > 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Vista desktop: globo 3D
  return (
    <div className="globe-wrapper">
      <Globe
        ref={globeEl}
        width={size}
        height={size}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundColor="rgba(0,0,0,0)"
        
        // Puntos
        pointsData={markersData}
        pointLat="lat"
        pointLng="lng"
        pointColor={d => d.isSelected ? '#00FF88' : d.color}
        pointAltitude={d => d.isSelected ? 0.15 : 0.06}
        pointRadius={0.6}
        pointLabel={d => `
          <div style="background:rgba(0,0,0,0.9);color:#fff;padding:10px 14px;border-radius:10px;text-align:center;border:2px solid ${d.isSelected ? '#00FF88' : d.color};">
            <div style="font-size:24px;margin-bottom:4px;">${d.flag}</div>
            <div style="font-weight:bold;font-size:16px;">${d.name}</div>
            <div style="font-size:13px;color:#aaa;margin-top:4px;">${d.leagues} liga${d.leagues !== 1 ? 's' : ''}</div>
          </div>
        `}
        onPointClick={handleClick}
        
        // Labels con código de país (sin emojis)
        labelsData={markersData}
        labelLat="lat"
        labelLng="lng"
        labelText="code"
        labelSize={1.8}
        labelDotRadius={0}
        labelColor={d => d.isSelected ? '#00FF88' : '#FFFFFF'}
        labelResolution={2}
        labelAltitude={0.02}
        onLabelClick={handleClick}
        
        atmosphereColor="lightskyblue"
        atmosphereAltitude={0.15}
      />
      <p className="globe-hint">🌍 Arrastra para girar • Clic en un país</p>
    </div>
  );
}
