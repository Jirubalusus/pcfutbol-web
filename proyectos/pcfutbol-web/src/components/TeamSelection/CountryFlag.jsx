import React, { useMemo, useState } from 'react';
import './CountryFlag.scss';

const FLAG_CODES = {
  spain: 'es',
  england: 'gb-eng',
  italy: 'it',
  germany: 'de',
  france: 'fr',
  netherlands: 'nl',
  portugal: 'pt',
  belgium: 'be',
  turkey: 'tr',
  scotland: 'gb-sct',
  switzerland: 'ch',
  austria: 'at',
  greece: 'gr',
  denmark: 'dk',
  norway: 'no',
  sweden: 'se',
  poland: 'pl',
  croatia: 'hr',
  czech: 'cz',
  russia: 'ru',
  ukraine: 'ua',
  romania: 'ro',
  hungary: 'hu',
  argentina: 'ar',
  brazil: 'br',
  colombia: 'co',
  chile: 'cl',
  uruguay: 'uy',
  ecuador: 'ec',
  paraguay: 'py',
  peru: 'pe',
  bolivia: 'bo',
  venezuela: 've',
  usa: 'us',
  saudiArabia: 'sa',
  mexico: 'mx',
  japan: 'jp',
  southKorea: 'kr',
  australia: 'au',
  southAfrica: 'za'
};

const FALLBACK_CODES = {
  england: 'ENG',
  scotland: 'SCO'
};

export default function CountryFlag({ countryId, countryName = '', className = '', size = 'md' }) {
  const [errored, setErrored] = useState(false);
  const flagCode = FLAG_CODES[countryId];
  const fallbackLabel = FALLBACK_CODES[countryId] || countryName.slice(0, 2).toUpperCase();

  const src = useMemo(() => {
    if (!flagCode) return null;
    return `https://hatscripts.github.io/circle-flags/flags/${flagCode}.svg`;
  }, [flagCode]);

  if (!src || errored) {
    return <span className={`country-flag country-flag--fallback country-flag--${size} ${className}`.trim()}>{fallbackLabel}</span>;
  }

  return (
    <span className={`country-flag country-flag--${size} ${className}`.trim()} aria-label={countryName || countryId}>
      <img src={src} alt={countryName || countryId} onError={() => setErrored(true)} loading="lazy" />
    </span>
  );
}
