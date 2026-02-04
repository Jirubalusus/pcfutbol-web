// ============================================================
// SOUND EFFECTS - Efectos de sonido para UI
// ============================================================
// Click suave tipo PC Fútbol para botones e interacciones

import { useCallback, useRef } from 'react';

const SFX = {
  click: '/pcfutbol-web/audio/click.ogg',
  select: '/pcfutbol-web/audio/select.ogg',
  toggle: '/pcfutbol-web/audio/toggle.ogg',
};

// Pool de audio pre-creados para evitar lag
const audioPool = {};

function getAudio(src) {
  if (!audioPool[src]) {
    audioPool[src] = [];
  }
  // Buscar uno libre (que no esté sonando)
  let audio = audioPool[src].find(a => a.paused || a.ended);
  if (!audio) {
    audio = new Audio(src);
    audioPool[src].push(audio);
  }
  return audio;
}

export function useSoundEffects(settings) {
  const enabled = settings?.soundEnabled ?? true;
  const volume = ((settings?.sfxVolume ?? settings?.effectsVolume ?? 80) / 100);
  const lastPlayRef = useRef(0);

  const play = useCallback((type = 'click') => {
    if (!enabled || volume === 0) return;
    
    // Throttle: mínimo 50ms entre sonidos para no saturar
    const now = Date.now();
    if (now - lastPlayRef.current < 50) return;
    lastPlayRef.current = now;

    const src = SFX[type] || SFX.click;
    try {
      const audio = getAudio(src);
      audio.volume = volume;
      audio.currentTime = 0;
      audio.play().catch(() => {}); // Ignorar error de autoplay
    } catch (e) {
      // Silenciar errores
    }
  }, [enabled, volume]);

  const playClick = useCallback(() => play('click'), [play]);
  const playSelect = useCallback(() => play('select'), [play]);
  const playToggle = useCallback(() => play('toggle'), [play]);

  return { play, playClick, playSelect, playToggle };
}
