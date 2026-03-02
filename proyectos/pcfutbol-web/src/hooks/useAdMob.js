import { useEffect, useRef, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';

// Lazy import — only loads on native
let AdMob;

// Ad unit IDs
const INTERSTITIAL_AD_UNIT = 'ca-app-pub-1594664200775140/4839261087';
// Test interstitial for development:
// const INTERSTITIAL_AD_UNIT = 'ca-app-pub-3940256099942544/1033173712';

/**
 * Hook for AdMob interstitial ads.
 * Returns `showInterstitial()` — call it before simulation.
 * No-op on web or for premium users.
 */
export function useAdMobInterstitial({ isPremium = false } = {}) {
  const isNative = Capacitor.isNativePlatform();
  const initialized = useRef(false);
  const adLoaded = useRef(false);

  const initAdMob = useCallback(async () => {
    if (!isNative || initialized.current) return;
    try {
      if (!AdMob) {
        const mod = await import('@capacitor-community/admob');
        AdMob = mod.AdMob;
        await AdMob.initialize({ initializeForTesting: false });
      }
      initialized.current = true;
    } catch (err) {
      console.warn('[AdMob] init error:', err);
    }
  }, [isNative]);

  // Preload an interstitial ad
  const prepareInterstitial = useCallback(async () => {
    if (!isNative || isPremium || !initialized.current) return;
    try {
      await AdMob.prepareInterstitial({
        adId: INTERSTITIAL_AD_UNIT,
        isTesting: false,
      });
      adLoaded.current = true;
    } catch (err) {
      console.warn('[AdMob] prepareInterstitial error:', err);
      adLoaded.current = false;
    }
  }, [isNative, isPremium]);

  // Initialize on mount and preload first ad
  useEffect(() => {
    if (!isNative || isPremium) return;
    initAdMob().then(() => prepareInterstitial());
  }, [isNative, isPremium, initAdMob, prepareInterstitial]);

  /**
   * Show interstitial ad. Returns a promise that resolves when ad is closed.
   * If no ad is loaded or user is premium, resolves immediately.
   */
  const showInterstitial = useCallback(async () => {
    if (!isNative || isPremium || !initialized.current) return;
    
    // If ad isn't loaded yet, try loading now
    if (!adLoaded.current) {
      await prepareInterstitial();
    }

    if (!adLoaded.current) return; // Still no ad, skip

    try {
      await AdMob.showInterstitial();
    } catch (err) {
      console.warn('[AdMob] showInterstitial error:', err);
    } finally {
      adLoaded.current = false;
      // Preload next ad for next time
      setTimeout(() => prepareInterstitial(), 1000);
    }
  }, [isNative, isPremium, prepareInterstitial]);

  return { showInterstitial, isNative };
}
