/**
 * Ad Service — manages AdMob (Android) and AdSense (Web) ads
 * Premium users (isPremium = true) see no ads
 */
import { Capacitor } from '@capacitor/core';

const IS_NATIVE = Capacitor.isNativePlatform();

// AdMob IDs
const ADMOB_APP_ID = 'ca-app-pub-1594664200775140~8239730162';
const ADMOB_BANNER_ID = 'ca-app-pub-1594664200775140/7410688638';
const ADMOB_INTERSTITIAL_ID = 'ca-app-pub-1594664200775140/4839261087';

let admobPlugin = null;
let initialized = false;
let interstitialLoaded = false;
let simCount = 0;

/**
 * Initialize ads (call once on app start)
 */
export async function initAds() {
  if (initialized) return;
  
  if (IS_NATIVE) {
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      admobPlugin = AdMob;
      await AdMob.initialize({
        requestTrackingAuthorization: false,
        initializeForTesting: false,
      });
      initialized = true;
    } catch (e) {
      console.warn('AdMob init failed:', e);
    }
  } else {
    // Web: AdSense loaded via script tag in index.html
    initialized = true;
  }
}

/**
 * Show banner ad at bottom of screen
 */
export async function showBanner() {
  if (!initialized) return;
  
  if (IS_NATIVE && admobPlugin) {
    try {
      await admobPlugin.showBanner({
        adId: ADMOB_BANNER_ID,
        adSize: 'BANNER',
        position: 'BOTTOM_CENTER',
        margin: 60, // above bottom nav
      });
    } catch (e) {
      console.warn('Banner show failed:', e);
    }
  }
  // Web banners handled by AdSense auto-ads or manual placement
}

/**
 * Hide banner ad
 */
export async function hideBanner() {
  if (IS_NATIVE && admobPlugin) {
    try {
      await admobPlugin.hideBanner();
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Preload interstitial ad
 */
export async function prepareInterstitial() {
  if (!initialized || !ADMOB_INTERSTITIAL_ID) return;
  
  if (IS_NATIVE && admobPlugin) {
    try {
      await admobPlugin.prepareInterstitial({
        adId: ADMOB_INTERSTITIAL_ID,
      });
      interstitialLoaded = true;
    } catch (e) {
      console.warn('Interstitial prep failed:', e);
    }
  }
}

/**
 * Show interstitial ad (every N simulations)
 * Returns true if ad was shown
 */
export async function maybeShowInterstitial() {
  simCount++;
  
  if (IS_NATIVE && admobPlugin && interstitialLoaded) {
    try {
      await admobPlugin.showInterstitial();
      interstitialLoaded = false;
      // Preload next one
      prepareInterstitial();
      return true;
    } catch (e) {
      console.warn('Interstitial show failed:', e);
    }
  }
  return false;
}

/**
 * Remove all ads (premium purchase)
 */
export async function removeAllAds() {
  await hideBanner();
  initialized = false; // Prevent future ad loads
}
