/**
 * useAds hook — manages ad lifecycle based on premium status
 */
import { useEffect, useRef } from 'react';
import { initAds, prepareInterstitial, maybeShowInterstitial, removeAllAds } from '../services/adService';

export function useAds(isPremium) {
  const initialized = useRef(false);

  useEffect(() => {
    if (isPremium) {
      removeAllAds();
      return;
    }

    if (!initialized.current) {
      initialized.current = true;
      initAds().then(() => {
        prepareInterstitial();
      });
    }
  }, [isPremium]);

  return {
    maybeShowInterstitial,
  };
}
