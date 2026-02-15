import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { Capacitor } from '@capacitor/core';

const googleProvider = new GoogleAuthProvider();
const isNativePlatform = Capacitor.isNativePlatform();

// Register with email/password
export async function registerWithEmail(email, password, displayName) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Create user document
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    displayName: displayName || email.split('@')[0],
    createdAt: serverTimestamp(),
    emailVerified: false
  });
  
  // Send verification email
  await sendEmailVerification(user, {
    url: isNativePlatform ? 'https://pcfutbol-web.firebaseapp.com' : window.location.origin + '/pcfutbol-web/',
    handleCodeInApp: false
  });
  
  return user;
}

// Login with email/password
export async function loginWithEmail(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Login with Google
export async function loginWithGoogle() {
  if (isNativePlatform) {
    // On Android, use @capgo/capacitor-social-login to get Google token,
    // then sign in to Firebase with that credential
    const { SocialLogin } = await import('@capgo/capacitor-social-login');
    
    await SocialLogin.initialize({
      google: {
        webClientId: '664376263748-9s0h5cdt4od2q3eb5gf4eo2kki71vpdn.apps.googleusercontent.com',
      }
    });
    
    const res = await SocialLogin.login({
      provider: 'google',
      options: {}
    });
    
    // Use the idToken to create a Firebase credential
    const idToken = res.result?.idToken;
    if (!idToken) {
      throw new Error('No se pudo obtener el token de Google');
    }
    
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    await ensureUserDoc(userCredential.user);
    return userCredential.user;
  }
  
  // Try popup first, fallback to redirect (for GitHub Pages / cross-origin issues)
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    await ensureUserDoc(user);
    return user;
  } catch (popupError) {
    console.warn('Popup failed, trying redirect:', popupError.code);
    if (popupError.code === 'auth/popup-blocked' || 
        popupError.code === 'auth/popup-closed-by-user' ||
        popupError.code === 'auth/unauthorized-domain' ||
        popupError.code === 'auth/internal-error') {
      await signInWithRedirect(auth, googleProvider);
      return null; // Will complete after redirect
    }
    throw popupError;
  }
}

async function ensureUserDoc(user) {
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      createdAt: serverTimestamp(),
      emailVerified: true
    });
  }
}

// Logout
export async function logout() {
  await signOut(auth);
}

// Send password reset email
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email, {
    url: window.location.origin + '/pcfutbol-web/',
    handleCodeInApp: false
  });
}

// Resend verification email
export async function resendVerificationEmail() {
  if (auth.currentUser && !auth.currentUser.emailVerified) {
    await sendEmailVerification(auth.currentUser, {
      url: window.location.origin + '/pcfutbol-web/',
      handleCodeInApp: false
    });
  }
}

// Check for redirect result (called on app init)
export async function checkRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await ensureUserDoc(result.user);
      return result.user;
    }
  } catch (e) {
    console.warn('Redirect result error:', e);
  }
  return null;
}

// Auth state listener
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Get current user
export function getCurrentUser() {
  return auth.currentUser;
}

// Save language preference to Firebase
export async function saveLanguagePreference(language) {
  if (auth.currentUser) {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        language
      });
    } catch (e) {
      console.warn('Could not save language preference:', e);
    }
  }
}

// Load language preference from Firebase
export async function loadLanguagePreference() {
  if (auth.currentUser) {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists() && userDoc.data().language) {
        return userDoc.data().language;
      }
    } catch (e) {
      console.warn('Could not load language preference:', e);
    }
  }
  return null;
}

// Refresh user data (for email verification check)
export async function refreshUser() {
  if (auth.currentUser) {
    await auth.currentUser.reload();
    return auth.currentUser;
  }
  return null;
}
