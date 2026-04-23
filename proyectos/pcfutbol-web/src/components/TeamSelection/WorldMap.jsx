import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Globe as GlobeIcon } from 'lucide-react';
import Globe from 'react-globe.gl';
import './WorldMap.scss';

// Merged country data: Europe + South America
const COUNTRY_DATA = {
  // Europe
  spain: { lat: 40.0, lng: -4.0, name: 'España', code: 'ES', color: '#FF4444', continent: 'europe' },
  england: { lat: 53.0, lng: -1.5, name: 'Reino Unido', code: 'UK', color: '#4466FF', continent: 'europe' },
  germany: { lat: 51.0, lng: 10.0, name: 'Alemania', code: 'DE', color: '#FFCC00', continent: 'europe' },
  italy: { lat: 42.5, lng: 12.5, name: 'Italia', code: 'IT', color: '#33CC33', continent: 'europe' },
  france: { lat: 46.5, lng: 2.5, name: 'Francia', code: 'FR', color: '#5555FF', continent: 'europe' },
  portugal: { lat: 39.5, lng: -8.0, name: 'Portugal', code: 'PT', color: '#22AA44', continent: 'europe' },
  netherlands: { lat: 52.3, lng: 5.3, name: 'Países Bajos', code: 'NL', color: '#FF7700', continent: 'europe' },
  belgium: { lat: 50.8, lng: 4.4, name: 'Bélgica', code: 'BE', color: '#FFDD00', continent: 'europe' },
  turkey: { lat: 39.0, lng: 35.0, name: 'Turquía', code: 'TR', color: '#E30A17', continent: 'europe' },
  scotland: { lat: 56.5, lng: -4.0, name: 'Escocia', code: 'SCO', color: '#003399', continent: 'europe' },
  switzerland: { lat: 46.8, lng: 8.2, name: 'Suiza', code: 'CH', color: '#FF0000', continent: 'europe' },
  austria: { lat: 47.5, lng: 14.5, name: 'Austria', code: 'AT', color: '#ED2939', continent: 'europe' },
  greece: { lat: 38.5, lng: 23.7, name: 'Grecia', code: 'GR', color: '#0D5EAF', continent: 'europe' },
  denmark: { lat: 56.0, lng: 10.0, name: 'Dinamarca', code: 'DK', color: '#C60C30', continent: 'europe' },
  croatia: { lat: 45.1, lng: 15.2, name: 'Croacia', code: 'HR', color: '#FF3333', continent: 'europe' },
  czech: { lat: 49.8, lng: 15.5, name: 'Chequia', code: 'CZ', color: '#11457E', continent: 'europe' },
  // South America
  argentina: { lat: -34.6, lng: -58.4, name: 'Argentina', code: 'AR', color: '#75AADB', continent: 'southamerica' },
  brazil: { lat: -14.2, lng: -51.9, name: 'Brasil', code: 'BR', color: '#009739', continent: 'southamerica' },
  colombia: { lat: 4.6, lng: -74.1, name: 'Colombia', code: 'CO', color: '#FCD116', continent: 'southamerica' },
  chile: { lat: -33.4, lng: -70.6, name: 'Chile', code: 'CL', color: '#D52B1E', continent: 'southamerica' },
  uruguay: { lat: -34.9, lng: -56.2, name: 'Uruguay', code: 'UY', color: '#001489', continent: 'southamerica' },
  ecuador: { lat: -0.2, lng: -78.5, name: 'Ecuador', code: 'EC', color: '#FFD100', continent: 'southamerica' },
  paraguay: { lat: -25.3, lng: -57.6, name: 'Paraguay', code: 'PY', color: '#D52B1E', continent: 'southamerica' },
  peru: { lat: -12.0, lng: -77.0, name: 'Perú', code: 'PE', color: '#D91023', continent: 'southamerica' },
  bolivia: { lat: -16.5, lng: -68.2, name: 'Bolivia', code: 'BO', color: '#007934', continent: 'southamerica' },
  venezuela: { lat: 10.5, lng: -66.9, name: 'Venezuela', code: 'VE', color: '#CF142B', continent: 'southamerica' },
};

const MOBILE_BREAKPOINT = 768;

export default function WorldMap({ countries, selectedCountry, onCountryClick }) {
  const globeEl = useRef();
  const [size, setSize] = useState(400);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive + mobile detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width < MOBILE_BREAKPOINT);
      if (width < 500) {
        setSize(Math.min(280, width * 0.7));
      } else if (width < 768) {
        setSize(Math.min(340, width * 0.55));
      } else if (width < 1200) {
        // Medium desktop — use 55% of available left column width (~60% of screen)
        const availableWidth = width * 0.55;
        const availableHeight = height - 160; // subtract header + progress bar
        setSize(Math.min(520, availableWidth * 0.85, availableHeight * 0.8));
      } else {
        // Large desktop — go big
        const availableWidth = width * 0.55;
        const availableHeight = height - 160;
        setSize(Math.min(620, availableWidth * 0.85, availableHeight * 0.8));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Center on Europe initially
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 48, lng: 5, altitude: 2.0 }, 0);
    }
  }, []);

  // Zoom to selected country
  useEffect(() => {
    if (globeEl.current && selectedCountry && COUNTRY_DATA[selectedCountry]) {
      const { lat, lng } = COUNTRY_DATA[selectedCountry];
      globeEl.current.pointOfView({ lat, lng, altitude: 1.6 }, 600);
    }
  }, [selectedCountry]);

  // Build markers from all countries
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
        continent: data.continent,
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

  // Mobile view: grouped country list
  if (isMobile) {
    if (selectedCountry) {
      return null;
    }

    const europeCountries = countries.filter(c => COUNTRY_DATA[c.id]?.continent === 'europe');
    const saCountries = countries.filter(c => COUNTRY_DATA[c.id]?.continent === 'southamerica');

    return (
      <div className="countries-mobile">
        <h3 className="countries-mobile__title"><GlobeIcon size={16} /> Selecciona un país</h3>
        <div className="countries-mobile__list">
          {europeCountries.length > 0 && (
            <>
              <div className="countries-mobile__header">🌍 Europa</div>
              {europeCountries.map(country => (
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
            </>
          )}
          {saCountries.length > 0 && (
            <>
              <div className="countries-mobile__header">🌎 Sudamérica</div>
              {saCountries.map(country => (
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
            </>
          )}
        </div>
      </div>
    );
  }

  // Desktop: 3D globe with all markers
  return (
    <div className="globe-wrapper">
      <Globe
        ref={globeEl}
        width={size}
        height={size}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundColor="rgba(0,0,0,0)"

        // Points
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

        // Labels with country code
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
      <p className="globe-hint">Arrastra para girar • Clic en un país</p>
    </div>
  );
}
