import React from 'react';

const ID_TO_ISO = {
  spain: 'es', france: 'fr', england: 'gb-eng', belgium: 'be', netherlands: 'nl',
  portugal: 'pt', italy: 'it', germany: 'de', croatia: 'hr', switzerland: 'ch',
  denmark: 'dk', austria: 'at', scotland: 'gb-sct', turkey: 'tr', sweden: 'se',
  norway: 'no', argentina: 'ar', brazil: 'br', uruguay: 'uy', colombia: 'co',
  ecuador: 'ec', chile: 'cl', usa: 'us', mexico: 'mx', canada: 'ca',
  'costa-rica': 'cr', jamaica: 'jm', morocco: 'ma', senegal: 'sn', nigeria: 'ng',
  egypt: 'eg', cameroon: 'cm', 'ivory-coast': 'ci', japan: 'jp', 'south-korea': 'kr',
  iran: 'ir', australia: 'au', 'saudi-arabia': 'sa', wales: 'gb-wls',
  'czech-republic': 'cz', ukraine: 'ua', serbia: 'rs', poland: 'pl',
  paraguay: 'py', peru: 'pe', algeria: 'dz', tunisia: 'tn', qatar: 'qa',
};

export default function FlagIcon({ teamId, size = 24, className = '' }) {
  const iso = ID_TO_ISO[teamId];
  if (!iso) return <span style={{ fontSize: size * 0.8 }}>🏳️</span>;

  return (
    <img
      src={`https://flagcdn.com/w80/${iso}.png`}
      srcSet={`https://flagcdn.com/w160/${iso}.png 2x`}
      alt={teamId}
      width={size}
      height={Math.round(size * 0.75)}
      className={`flag-icon ${className}`}
      style={{ objectFit: 'cover', borderRadius: 2, display: 'inline-block', verticalAlign: 'middle' }}
      loading="lazy"
    />
  );
}

export { ID_TO_ISO };
