import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthChange, 
  loginWithEmail, 
  loginWithGoogle, 
  registerWithEmail,
  logout as authLogout,
  resetPassword,
  resendVerificationEmail,
  refreshUser
} from '../firebase/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
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
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const register = async (email, password, displayName) => {
    setError(null);
    try {
      const user = await registerWithEmail(email, password, displayName);
      return user;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
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
    login,
    loginGoogle,
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
  
  return messages[code] || 'Error de autenticación';
}
