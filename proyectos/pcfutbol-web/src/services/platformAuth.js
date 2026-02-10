// Platform-aware authentication service
// - Android: Google Play Games Services
// - Web/PC: Firebase Auth (Google Sign-In + Email/Pass)

import { Capacitor } from '@capacitor/core';
import { 
  loginWithGoogle as firebaseLoginWithGoogle, 
  loginWithEmail as firebaseLoginWithEmail,
  registerWithEmail as firebaseRegisterWithEmail,
  logout as firebaseLogout,
  getCurrentUser,
  onAuthChange
} from '../firebase/authService';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../firebase/config';

// Detect platform
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isWeb = () => Capacitor.getPlatform() === 'web';
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isNative = () => Capacitor.isNativePlatform();

// Google Play Games Services - Native Android only
class PlayGamesService {
  constructor() {
    this.isSignedIn = false;
    this.player = null;
  }

  async signIn() {
    if (!isAndroid()) {
      throw new Error('Google Play Games is only available on Android');
    }

    try {
      // Call native Android plugin via Capacitor bridge
      const { PlayGames } = await import('./playGamesPlugin');
      const result = await PlayGames.signIn();
      
      if (result.isSignedIn) {
        this.isSignedIn = true;
        this.player = result.player;
        
        // Create/update user in Firebase using Play Games ID
        await this.syncWithFirebase(result.player);
        
        return result.player;
      }
      throw new Error('Sign in failed');
    } catch (error) {
      console.error('Play Games sign in error:', error);
      throw error;
    }
  }

  async syncWithFirebase(player) {
    // Create a user document in Firebase using Play Games player ID
    const playerId = player.playerId;
    const userDocRef = doc(db, 'users', `playgames_${playerId}`);
    
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        displayName: player.displayName || 'Player',
        playGamesId: playerId,
        avatarUrl: player.iconImageUrl || null,
        createdAt: serverTimestamp(),
        platform: 'android',
        authProvider: 'play_games'
      });
    }
    
    return userDocRef;
  }

  async signOut() {
    if (!isAndroid()) return;
    
    try {
      const { PlayGames } = await import('./playGamesPlugin');
      await PlayGames.signOut();
      this.isSignedIn = false;
      this.player = null;
    } catch (error) {
      console.error('Play Games sign out error:', error);
    }
  }

  getPlayer() {
    return this.player;
  }

  async isAuthenticated() {
    if (!isAndroid()) return false;
    
    try {
      const { PlayGames } = await import('./playGamesPlugin');
      const result = await PlayGames.isSignedIn();
      return result.isSignedIn;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
const playGamesService = new PlayGamesService();

// Unified auth interface
export const PlatformAuth = {
  // Always use Firebase auth (Play Games disabled for now)
  shouldUsePlayGames: () => false,
  
  // All platforms get Google + Email
  getAvailableMethods: () => {
    return ['google', 'email'];
  },

  // Sign in with Google Play Games (Android only)
  signInWithPlayGames: async () => {
    if (!isAndroid()) {
      throw new Error('Play Games is only available on Android');
    }
    return playGamesService.signIn();
  },

  // Sign in with Google (Firebase on all platforms)
  signInWithGoogle: async () => {
    return firebaseLoginWithGoogle();
  },

  // Sign in with Email/Password (Firebase - Web/PC only)
  signInWithEmail: async (email, password) => {
    if (isAndroid()) {
      throw new Error('Email login not available on Android. Use Google Play Games.');
    }
    return firebaseLoginWithEmail(email, password);
  },

  // Register with Email/Password (Firebase - Web/PC only)
  registerWithEmail: async (email, password, displayName) => {
    if (isAndroid()) {
      throw new Error('Email registration not available on Android. Use Google Play Games.');
    }
    return firebaseRegisterWithEmail(email, password, displayName);
  },

  // Sign out
  signOut: async () => {
    if (isAndroid()) {
      await playGamesService.signOut();
    }
    await firebaseLogout();
  },

  // Get current user
  getCurrentUser: () => {
    if (isAndroid() && playGamesService.isSignedIn) {
      return playGamesService.getPlayer();
    }
    return getCurrentUser();
  },

  // Check if authenticated
  isAuthenticated: async () => {
    if (isAndroid()) {
      return playGamesService.isAuthenticated();
    }
    return !!getCurrentUser();
  },

  // Auth state listener
  onAuthStateChange: (callback) => {
    // For web, use Firebase auth state
    return onAuthChange(callback);
  }
};

export default PlatformAuth;
