import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Auth.scss';

export default function Auth({ onBack }) {
  const [mode, setMode] = useState('login'); // login, register, reset, verify
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { 
    login, 
    loginGoogle,
    loginAsGuest,
    register, 
    sendPasswordReset, 
    resendVerification,
    checkEmailVerified,
    error, 
    clearError,
    user,
    isEmailVerified
  } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccess('');
    clearError();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        if (!displayName.trim()) {
          setLocalError('Introduce un nombre de usuario');
          setIsLoading(false);
          return;
        }
        await register(email, password, displayName);
        setMode('verify');
        setSuccess('¡Cuenta creada! Revisa tu email para verificar tu cuenta.');
      } else if (mode === 'reset') {
        await sendPasswordReset(email);
        setSuccess('Email de recuperación enviado. Revisa tu bandeja de entrada.');
      }
    } catch (err) {
      // Error is set in context
    }
    
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLocalError('');
    clearError();
    setIsLoading(true);
    
    try {
      await loginGoogle();
    } catch (err) {
      // Error is set in context
    }
    
    setIsLoading(false);
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      await resendVerification();
      setSuccess('Email de verificación reenviado');
    } catch (err) {
      // Error is set in context
    }
    setIsLoading(false);
  };

  const handleCheckVerification = async () => {
    setIsLoading(true);
    const verified = await checkEmailVerified();
    if (!verified) {
      setLocalError('Email aún no verificado. Revisa tu bandeja de entrada.');
    }
    setIsLoading(false);
  };

  // Verification pending screen
  if (mode === 'verify' || (user && !isEmailVerified)) {
    return (
      <div className="auth">
        <div className="auth__card">
          <button className="auth__back" onClick={onBack}>← Volver</button>
          
          <div className="auth__header">
            <div className="auth__icon">📧</div>
            <h2>Verifica tu email</h2>
          </div>

          <div className="auth__verify-message">
            <p>Hemos enviado un email de verificación a:</p>
            <p className="auth__email-display">{user?.email || email}</p>
            <p>Haz clic en el enlace del email para activar tu cuenta.</p>
          </div>

          {(error || localError) && (
            <div className="auth__error">{error || localError}</div>
          )}
          
          {success && (
            <div className="auth__success">{success}</div>
          )}

          <div className="auth__verify-actions">
            <button 
              className="auth__btn auth__btn--primary"
              onClick={handleCheckVerification}
              disabled={isLoading}
            >
              {isLoading ? 'Comprobando...' : 'Ya lo verifiqué'}
            </button>
            
            <button 
              className="auth__btn auth__btn--secondary"
              onClick={handleResendVerification}
              disabled={isLoading}
            >
              Reenviar email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <button className="auth__back" onClick={onBack}>← Volver</button>
        
        <div className="auth__header">
          <div className="auth__icon">
            {mode === 'login' ? '🔐' : mode === 'register' ? '📝' : '🔑'}
          </div>
          <h2>
            {mode === 'login' && 'Iniciar Sesión'}
            {mode === 'register' && 'Crear Cuenta'}
            {mode === 'reset' && 'Recuperar Contraseña'}
          </h2>
        </div>

        {mode !== 'reset' && (
          <>
            <button 
              className="auth__google"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>
            
            <button 
              className="auth__guest"
              onClick={loginAsGuest}
              disabled={isLoading}
            >
              🧪 Entrar como Invitado (Pruebas)
            </button>
          </>
        )}

        {mode !== 'reset' && (
          <div className="auth__divider">
            <span>o usa tu email</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth__form">
          {mode === 'register' && (
            <div className="auth__field">
              <label>Nombre de usuario</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre en el juego"
                required
              />
            </div>
          )}

          <div className="auth__field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </div>

          {mode !== 'reset' && (
            <div className="auth__field">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          )}

          {(error || localError) && (
            <div className="auth__error">{error || localError}</div>
          )}
          
          {success && (
            <div className="auth__success">{success}</div>
          )}

          <button 
            type="submit" 
            className="auth__btn auth__btn--primary"
            disabled={isLoading}
          >
            {isLoading ? 'Cargando...' : (
              mode === 'login' ? 'Entrar' :
              mode === 'register' ? 'Crear cuenta' :
              'Enviar email'
            )}
          </button>
        </form>

        <div className="auth__links">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('reset'); clearError(); setSuccess(''); }}>
                ¿Olvidaste tu contraseña?
              </button>
              <button onClick={() => { setMode('register'); clearError(); setSuccess(''); }}>
                ¿No tienes cuenta? Regístrate
              </button>
            </>
          )}
          
          {mode === 'register' && (
            <button onClick={() => { setMode('login'); clearError(); setSuccess(''); }}>
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          )}
          
          {mode === 'reset' && (
            <button onClick={() => { setMode('login'); clearError(); setSuccess(''); }}>
              Volver a iniciar sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
