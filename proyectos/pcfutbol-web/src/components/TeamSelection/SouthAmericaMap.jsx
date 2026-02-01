import React, { useRef, useEffect, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import './SouthAmericaMap.scss';

// Datos de países sudamericanos
const COUNTRY_DATA = {
  argentina: { lat: -34.6, lng: -58.4, name: 'Argentina', code: 'AR', color: '#75AADB' },
  brazil: { lat: -14.2, lng: -51.9, name: 'Brasil', code: 'BR', color: '#009739' },
  colombia: { lat: 4.6, lng: -74.1, name: 'Colombia', code: 'CO', color: '#FCD116' },
  chile: { lat: -33.4, lng: -70.6, name: 'Chile', code: 'CL', color: '#D52B1E' },
  uruguay: { lat: -34.9, lng: -56.2, name: 'Uruguay', code: 'UY', color: '#001489' },
  ecuador: { lat: -0.2, lng: -78.5, name: 'Ecuador', code: 'EC', color: '#FFD100' },
  paraguay: { lat: -25.3, lng: -57.6, name: 'Paraguay', code: 'PY', color: '#D52B1E' },
  peru: { lat: -12.0, lng: -77.0, name: 'Perú', code: 'PE', color: '#D91023' },
  bolivia: { lat: -16.5, lng: -68.2, name: 'Bolivia', code: 'BO', color: '#007934' },
  venezuela: { lat: 10.5, lng: -66.9, name: 'Venezuela', code: 'VE', color: '#CF142B' }
};

const MOBILE_BREAKPOINT = 768;

export default function SouthAmericaMap({ countries, selectedCountry, onCountryClick }) {
  const globeEl = useRef();
  const [size, setSize] = useState(400);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < MOBILE_BREAKPOINT);
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

  // Center on South America
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: -15, lng: -60, altitude: 2.2 }, 0);
    }
  }, []);

  // Zoom to selected country
  useEffect(() => {
    if (globeEl.current && selectedCountry && COUNTRY_DATA[selectedCountry]) {
      const { lat, lng } = COUNTRY_DATA[selectedCountry];
      globeEl.current.pointOfView({ lat, lng, altitude: 1.6 }, 600);
    }
  }, [selectedCountry]);

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
        isSelected: c.id === selectedCountry,
        leagues: c.leagues?.length || 1
      };
    }).filter(Boolean);
  }, [countries, selectedCountry]);

  // On mobile, show country list instead of globe
  if (isMobile) {
    return (
      <div className="sa-map sa-map--mobile">
        <div className="sa-map__list">
          {countries.map(c => (
            <button
              key={c.id}
              className={`sa-map__country-btn ${selectedCountry === c.id ? 'active' : ''}`}
              onClick={() => onCountryClick(c.id)}
            >
              <span className="country-flag">{c.flag}</span>
              <span className="country-name">{c.name}</span>
              <span className="country-leagues">{c.leagues?.length || 1} liga{(c.leagues?.length || 1) > 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sa-map" style={{ width: size, height: size }}>
      <Globe
        ref={globeEl}
        width={size}
        height={size}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#ffffff"
        atmosphereAltitude={0.15}
        // Markers
        pointsData={markersData}
        pointLat="lat"
        pointLng="lng"
        pointColor={d => d.isSelected ? '#ffffff' : d.color}
        pointAltitude={d => d.isSelected ? 0.08 : 0.04}
        pointRadius={d => d.isSelected ? 0.7 : 0.45}
        pointLabel={d => `
          <div style="text-align:center;background:#1a1a2e;padding:8px 12px;border-radius:8px;border:1px solid ${d.color}">
            <div style="font-size:24px">${d.flag}</div>
            <div style="color:#fff;font-weight:bold;font-size:13px;margin-top:4px">${d.name}</div>
          </div>
        `}
        onPointClick={d => onCountryClick(d.id)}
        // Disable rotation for easier clicking
        enablePointerInteraction={true}
        animateIn={false}
      />
    </div>
  );
}
