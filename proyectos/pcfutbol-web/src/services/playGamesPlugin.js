// Google Play Games Services via @capgo/capacitor-social-login
// Wraps the social login plugin to provide our PlayGames API

import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  if (Capacitor.getPlatform() === 'android') {
    await SocialLogin.initialize({
      google: {
        iOSClientId: '', // not needed for Android
        webClientId: '664376263748-9s0h5cdt4od2q3eb5gf4eo2kki71vpdn.apps.googleusercontent.com',
      }
    });
    initialized = true;
  }
}

export const PlayGames = {
  signIn: async () => {
    try {
      await ensureInitialized();
      const result = await SocialLogin.login({
        provider: 'google',
        options: {
          scopes: ['profile', 'email'],
          gamesSignIn: true,
        }
      });

      if (result?.result) {
        const profile = result.result.profile || {};
        return {
          isSignedIn: true,
          player: {
            playerId: profile.id || result.result.idToken || 'unknown',
            displayName: profile.name || profile.displayName || 'Player',
            iconImageUrl: profile.imageUrl || profile.picture || null,
            email: profile.email || null,
          }
        };
      }
      return { isSignedIn: false, player: null };
    } catch (error) {
      console.error('PlayGames.signIn error:', error);
      return { isSignedIn: false, player: null };
    }
  },

  signOut: async () => {
    try {
      await SocialLogin.logout({ provider: 'google' });
    } catch (error) {
      console.error('PlayGames.signOut error:', error);
    }
  },

  isSignedIn: async () => {
    try {
      const result = await SocialLogin.isLoggedIn({ provider: 'google' });
      return { isSignedIn: result?.isLoggedIn || false };
    } catch (error) {
      return { isSignedIn: false };
    }
  },

  getCurrentPlayer: async () => {
    try {
      const result = await SocialLogin.getUser({ provider: 'google' });
      if (result) {
        return {
          playerId: result.id || 'unknown',
          displayName: result.name || 'Player',
          iconImageUrl: result.picture || null,
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  showAchievements: async () => { console.log('Achievements not yet implemented'); },
  showLeaderboards: async () => { console.log('Leaderboards not yet implemented'); },
  unlockAchievement: async () => { console.log('Achievements not yet implemented'); },
  submitScore: async () => { console.log('Leaderboards not yet implemented'); },
};

export default PlayGames;
