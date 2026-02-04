// ============================================================
// AUDIO MANAGER - Sistema de música de fondo
// ============================================================
// Gestiona la reproducción de música según la pantalla actual
// Respeta los settings del jugador (soundEnabled, musicVolume)

import { useEffect, useRef, useCallback } from 'react';

// Mapeo de pantallas a pistas de audio
// Estilo: chill/ambient tipo PC Fútbol 5.0
const SCREEN_TRACKS = {
  // Menú principal y selección de equipo - synthwave calm (pads suaves)
  menu: '/pcfutbol-web/audio/synthwave-calm.mp3',
  teamSelection: '/pcfutbol-web/audio/synthwave-calm.mp3',
  contrarrelojSetup: '/pcfutbol-web/audio/synthwave-calm.mp3',
  settings: '/pcfutbol-web/audio/synthwave-calm.mp3',
  saves: '/pcfutbol-web/audio/synthwave-calm.mp3',
  
  // Día de partido - más energético
  matchDay: '/pcfutbol-web/audio/energetic.ogg',
  
  // Oficina y gestión - synth calm relajado (estilo PC Fútbol 5.0)
  default: '/pcfutbol-web/audio/chill-fever.mp3'
};

// Pantallas que se consideran "menú"
const MENU_SCREENS = ['menu', 'teamSelection', 'contrarrelojSetup', 'settings', 'saves'];

function getTrackForScreen(screen, phase) {
  if (MENU_SCREENS.includes(screen)) return SCREEN_TRACKS.menu;
  if (screen === 'matchDay') return SCREEN_TRACKS.matchDay;
  return SCREEN_TRACKS.default;
}

export function useAudioManager(currentScreen, settings, gamePhase) {
  const audioRef = useRef(null);
  const currentTrackRef = useRef(null);
  const fadeIntervalRef = useRef(null);

  const soundEnabled = settings?.soundEnabled ?? true;
  const musicVolume = (settings?.musicVolume ?? 70) / 100;

  // Fade out suave antes de cambiar pista
  const fadeOut = useCallback((audio, duration = 500) => {
    return new Promise(resolve => {
      if (!audio || audio.paused) {
        resolve();
        return;
      }
      const startVolume = audio.volume;
      const steps = 20;
      const stepTime = duration / steps;
      const volumeStep = startVolume / steps;
      let step = 0;

      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      
      fadeIntervalRef.current = setInterval(() => {
        step++;
        audio.volume = Math.max(0, startVolume - (volumeStep * step));
        if (step >= steps) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
          audio.pause();
          audio.volume = startVolume;
          resolve();
        }
      }, stepTime);
    });
  }, []);

  // Cambiar pista
  useEffect(() => {
    const targetTrack = getTrackForScreen(currentScreen, gamePhase);

    if (!soundEnabled || musicVolume === 0) {
      // Silenciar
      if (audioRef.current && !audioRef.current.paused) {
        fadeOut(audioRef.current, 300).then(() => {
          currentTrackRef.current = null;
        });
      }
      return;
    }

    // Si la pista es la misma, no cambiar
    if (currentTrackRef.current === targetTrack && audioRef.current && !audioRef.current.paused) {
      return;
    }

    const switchTrack = async () => {
      // Fade out pista actual si hay una
      if (audioRef.current && !audioRef.current.paused) {
        await fadeOut(audioRef.current, 400);
      }

      // Crear nuevo audio
      const audio = new Audio(targetTrack);
      audio.loop = true;
      audio.volume = musicVolume;
      
      // Intentar reproducir (puede fallar por autoplay policy)
      try {
        await audio.play();
        audioRef.current = audio;
        currentTrackRef.current = targetTrack;
      } catch (e) {
        // Autoplay bloqueado - esperar interacción del usuario
        const resumeOnInteraction = () => {
          audio.play().then(() => {
            audioRef.current = audio;
            currentTrackRef.current = targetTrack;
          }).catch(() => {});
          document.removeEventListener('click', resumeOnInteraction);
          document.removeEventListener('keydown', resumeOnInteraction);
        };
        document.addEventListener('click', resumeOnInteraction, { once: true });
        document.addEventListener('keydown', resumeOnInteraction, { once: true });
      }
    };

    switchTrack();

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, [currentScreen, soundEnabled, musicVolume, gamePhase, fadeOut]);

  // Actualizar volumen en tiempo real
  useEffect(() => {
    if (audioRef.current) {
      const vol = soundEnabled ? musicVolume : 0;
      audioRef.current.volume = vol;
      if (vol === 0 && !audioRef.current.paused) {
        audioRef.current.pause();
        currentTrackRef.current = null;
      }
    }
  }, [musicVolume, soundEnabled]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
}
