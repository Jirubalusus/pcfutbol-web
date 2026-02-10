// Web fallback for Play Games plugin (no-op on web)
// This allows the app to build for web without errors

export class PlayGamesWeb {
  async signIn() {
    console.warn('Google Play Games is not available on web');
    return { isSignedIn: false, player: null };
  }

  async signOut() {
    console.warn('Google Play Games is not available on web');
  }

  async isSignedIn() {
    return { isSignedIn: false };
  }

  async getCurrentPlayer() {
    return { player: null };
  }

  async showAchievements() {
    console.warn('Google Play Games achievements not available on web');
  }

  async showLeaderboards() {
    console.warn('Google Play Games leaderboards not available on web');
  }

  async unlockAchievement() {
    console.warn('Google Play Games achievements not available on web');
  }

  async submitScore() {
    console.warn('Google Play Games leaderboards not available on web');
  }
}
