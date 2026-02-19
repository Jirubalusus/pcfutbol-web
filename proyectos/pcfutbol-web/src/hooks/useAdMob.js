import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

// Lazy import — only loads on native
let AdMob, BannerAdSize, BannerAdPosition;

const BANNER_AD_UNIT = 'ca-app-pub-1594664200775140/2381723230';
// Test ad unit for development:
// const BANNER_AD_UNIT = 'ca-app-pub-3940256099942544/6300978111';

/**
 * Hook to show/hide AdMob banner.
 * Only works on native (Android/iOS). No-op on web.
 * @param {boolean} show - Whether the banner should be visible
 * @param {object} options - { isPremium: false }
 */
export function useAdMobBanner(show = false, { isPremium = false } = {}) {
  const isNative = Capacitor.isNativePlatform();
  const bannerVisible = useRef(false);

  const showBanner = useCallback(async () => {
    if (!isNative || bannerVisible.current) return;
    try {
      if (!AdMob) {
        const mod = await import('@capacitor-community/admob');
        AdMob = mod.AdMob;
        BannerAdSize = mod.BannerAdSize;
        BannerAdPosition = mod.BannerAdPosition;

        await AdMob.initialize({
          initializeForTesting: false,
        });
      }

      await AdMob.showBanner({
        adId: BANNER_AD_UNIT,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: false, // Set true for test ads during dev
      });
      bannerVisible.current = true;
    } catch (err) {
      console.warn('[AdMob] showBanner error:', err);
    }
  }, [isNative]);

  const hideBanner = useCallback(async () => {
    if (!isNative || !bannerVisible.current) return;
    try {
      await AdMob.hideBanner();
      bannerVisible.current = false;
    } catch (err) {
      console.warn('[AdMob] hideBanner error:', err);
    }
  }, [isNative]);

  useEffect(() => {
    if (isPremium || !isNative) return;

    if (show) {
      showBanner();
    } else {
      hideBanner();
    }

    return () => {
      // Cleanup: hide banner when component unmounts
      if (bannerVisible.current) {
        hideBanner();
      }
    };
  }, [show, isPremium, isNative, showBanner, hideBanner]);

  return { isNative, bannerVisible: bannerVisible.current };
}
