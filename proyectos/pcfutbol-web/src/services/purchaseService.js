import { Capacitor, registerPlugin } from '@capacitor/core';

const Billing = Capacitor.isNativePlatform()
  ? registerPlugin('Billing')
  : null;

/**
 * Purchase "remove_ads" — opens Google Play billing flow
 * @returns {{ success: boolean, error?: string }}
 */
export async function purchaseRemoveAds() {
  if (!Billing) return { success: false, error: 'Not available on web' };

  try {
    const result = await Billing.purchase();
    return { success: result.success === true };
  } catch (err) {
    if (err?.message?.includes('cancelled')) {
      return { success: false, error: 'cancelled' };
    }
    console.warn('[Billing] Purchase error:', err);
    return { success: false, error: err.message || 'Purchase failed' };
  }
}

/**
 * Check if user has purchased "remove_ads"
 * @returns {boolean}
 */
export async function checkPremiumStatus() {
  if (!Billing) return false;

  try {
    const result = await Billing.checkPremium();
    return result.premium === true;
  } catch (err) {
    console.warn('[Billing] Check premium error:', err);
    return false;
  }
}

/**
 * Restore previous purchases
 * @returns {boolean}
 */
export async function restorePurchases() {
  if (!Billing) return false;

  try {
    const result = await Billing.restorePurchases();
    return result.premium === true;
  } catch (err) {
    console.warn('[Billing] Restore error:', err);
    return false;
  }
}
