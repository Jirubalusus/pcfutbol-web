import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dice6, Check } from 'lucide-react';
import './NicknameModal.scss';

const NICK_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

const PREFIXES = [
  "ElMister", "TacticBoss", "GafferPro", "Coach", "Mister", "Manager",
  "TheBoss", "LaLiga", "TopManager", "ProCoach", "ElEntrenador",
  "FutbolMaster", "MatchDay", "TeamBoss", "TheTactician"
];

function generateRandomNick() {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const suffix = Math.floor(Math.random() * 90) + 10;
  return `${prefix}_${suffix}`;
}

export default function NicknameModal({ onConfirm }) {
  const { t } = useTranslation();
  const [nick, setNick] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = NICK_REGEX.test(nick);
  const tooShort = nick.length > 0 && nick.length < 3;
  const tooLong = nick.length > 20;
  const invalidChars = nick.length >= 3 && nick.length <= 20 && !NICK_REGEX.test(nick);

  const handleRandom = useCallback(() => {
    setNick(generateRandomNick());
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onConfirm(nick);
    } catch (e) {
      console.error('Error saving nickname:', e);
      setSaving(false);
    }
  }, [nick, isValid, saving, onConfirm]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && isValid && !saving) handleConfirm();
  }, [isValid, saving, handleConfirm]);

  const errorMsg = tooShort ? t('nickname.tooShort')
    : tooLong ? t('nickname.tooLong')
    : invalidChars ? t('nickname.invalid')
    : null;

  return (
    <div className="nickname-overlay">
      <div className="nickname-modal">
        <h2 className="nickname-modal__title">⚽ {t('nickname.title')}</h2>

        <div className={`nickname-modal__input-wrap ${isValid ? 'valid' : ''} ${errorMsg ? 'error' : ''}`}>
          <input
            type="text"
            className="nickname-modal__input"
            placeholder={t('nickname.placeholder')}
            value={nick}
            onChange={(e) => setNick(e.target.value.slice(0, 25))}
            onKeyDown={handleKeyDown}
            maxLength={25}
            autoFocus
          />
          <button className="nickname-modal__random" onClick={handleRandom} title={t('nickname.random')}>
            🎲
          </button>
        </div>

        {errorMsg && <p className="nickname-modal__error">{errorMsg}</p>}

        <button
          className="nickname-modal__confirm"
          disabled={!isValid || saving}
          onClick={handleConfirm}
        >
          {saving ? '...' : <><Check size={18} /> {t('nickname.confirm')}</>}
        </button>
      </div>
    </div>
  );
}
