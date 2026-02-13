import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthChange, 
  checkRedirectResult,
  loginWithEmail, 
  loginWithGoogle,
  registerWithEmail,
  logout as authLogout,
  resetPassword,
  resendVerificationEmail,
  refreshUser
} from '../firebase/authService';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { PlatformAuth, isAndroid } from '../services/platformAuth';
import { syncLanguageFromFirebase } from '../i18n';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsNickname, setNeedsNickname] = useState(false);
  const [displayName, setDisplayNameState] = useState(null);

  // Check if user has a displayName in Firestore
  const checkNickname = async (uid) => {
    if (!uid) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists() && userDoc.data().displayName) {
        setDisplayNameState(userDoc.data().displayName);
        setNeedsNickname(false);
      } else {
        setNeedsNickname(true);
        setDisplayNameState(null);
      }
    } catch (e) {
      console.error('Error checking nickname:', e);
      setNeedsNickname(true);
    }
  };

  // Save nickname to Firestore
  const setNickname = async (name) => {
    if (!user?.uid) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      displayName: name,
      email: user.email || null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setDisplayNameState(name);
    setNeedsNickname(false);
  };

  useEffect(() => {
    // Check for Google redirect result on load
    checkRedirectResult().catch(() => {});
    
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        // Cargar idioma guardado en Firebase
        await syncLanguageFromFirebase();
        // Check nickname
        if (!firebaseUser.isGuest) {
          await checkNickname(firebaseUser.uid);
        }
      } else {
        setNeedsNickname(false);
        setDisplayNameState(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const user = await loginWithEmail(email, password);
      return user;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const loginGoogle = async () => {
    setError(null);
    try {
      const user = await loginWithGoogle();
      return user;
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.code ? getErrorMessage(err.code) : (err.message || 'Error con Google Sign-In'));
      throw err;
    }
  };

  // Login with Google Play Games (Android only)
  const loginPlayGames = async () => {
    setError(null);
    try {
      const player = await PlatformAuth.signInWithPlayGames();
      // Create a user-like object from Play Games player
      const playGamesUser = {
        uid: `playgames_${player.playerId}`,
        displayName: player.displayName || 'Jugador',
        email: null,
        emailVerified: true, // Play Games accounts are verified
        photoURL: player.iconImageUrl || null,
        isPlayGames: true,
        playerId: player.playerId
      };
      setUser(playGamesUser);
      return playGamesUser;
    } catch (err) {
      setError(err.message || 'Error al conectar con Google Play Games');
      throw err;
    }
  };

  const register = async (email, password, displayName) => {
    setError(null);
    try {
      const user = await registerWithEmail(email, password, displayName);
      return user;
    } catch (err) {
      console.error('Register error:', err);
      setError(err.code ? getErrorMessage(err.code) : (err.message || 'Error al registrar'));
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    // Si es usuario invitado, solo limpiar el estado local
    if (user?.isGuest) {
      setUser(null);
      return;
    }
    try {
      await authLogout();
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const sendPasswordReset = async (email) => {
    setError(null);
    try {
      await resetPassword(email);
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const resendVerification = async () => {
    setError(null);
    try {
      await resendVerificationEmail();
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const checkEmailVerified = async () => {
    const refreshedUser = await refreshUser();
    if (refreshedUser) {
      setUser({ ...refreshedUser });
    }
    return refreshedUser?.emailVerified || false;
  };

  // Modo invitado para pruebas
  const loginAsGuest = () => {
    const guestUser = {
      uid: 'guest_' + Date.now(),
      email: 'invitado@pruebas.local',
      displayName: 'Invitado',
      emailVerified: true,
      isGuest: true
    };
    setUser(guestUser);
    return guestUser;
  };

  const clearError = () => setError(null);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified || false,
    isGuest: user?.isGuest || false,
    isPlayGames: user?.isPlayGames || false,
    needsNickname,
    displayName,
    setNickname,
    isAndroid: isAndroid(),
    login,
    loginGoogle,
    loginPlayGames,
    loginAsGuest,
    register,
    logout,
    sendPasswordReset,
    resendVerification,
    checkEmailVerified,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Spanish error messages
function getErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'Este email ya está registrado',
    'auth/invalid-email': 'Email inválido',
    'auth/operation-not-allowed': 'Operación no permitida',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/user-not-found': 'No existe una cuenta con este email',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-credential': 'Credenciales inválidas',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento',
    'auth/popup-closed-by-user': 'Ventana cerrada. Inténtalo de nuevo',
    'auth/network-request-failed': 'Error de conexión. Comprueba tu internet'
  };
  
  return messages[code] || `Error: ${code || 'desconocido'}`;
}
