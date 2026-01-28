import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

const googleProvider = new GoogleAuthProvider();

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
    url: window.location.origin + '/pcfutbol-web/',
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
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  
  // Check if user doc exists, create if not
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      createdAt: serverTimestamp(),
      emailVerified: true // Google accounts are verified
    });
  }
  
  return user;
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

// Auth state listener
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Get current user
export function getCurrentUser() {
  return auth.currentUser;
}

// Refresh user data (for email verification check)
export async function refreshUser() {
  if (auth.currentUser) {
    await auth.currentUser.reload();
    return auth.currentUser;
  }
  return null;
}
