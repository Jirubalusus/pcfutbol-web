import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, FileText, Key, Gamepad2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isAndroid, isNative } from '../../services/platformAuth';
import './Auth.scss';

export default function Auth({ onBack }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login'); // login, register, reset, verify
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState('web');

  const { 
    login, 
    loginGoogle,
    loginPlayGames,
    register, 
    sendPasswordReset, 
    resendVerification,
    checkEmailVerified,
    error, 
    clearError,
    user,
    isEmailVerified
  } = useAuth();

  // Always use web auth (Google + Email) - Play Games requires extra setup
  useEffect(() => {
    setPlatform('web');
  }, []);

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
          setLocalError(t('auth.enterUsername'));
          setIsLoading(false);
          return;
        }
        await register(email, password, displayName);
        setMode('verify');
        setSuccess(t('auth.accountCreated'));
      } else if (mode === 'reset') {
        await sendPasswordReset(email);
        setSuccess(t('auth.passwordResetSent'));
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

  const handlePlayGamesLogin = async () => {
    setLocalError('');
    clearError();
    setIsLoading(true);
    
    try {
      await loginPlayGames();
    } catch (err) {
      setLocalError(err.message || 'Error al conectar con Google Play Games');
    }
    
    setIsLoading(false);
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      await resendVerification();
      setSuccess(t('auth.verificationResent'));
    } catch (err) {
      // Error is set in context
    }
    setIsLoading(false);
  };

  const handleCheckVerification = async () => {
    setIsLoading(true);
    const verified = await checkEmailVerified();
    if (!verified) {
      setLocalError(t('auth.emailNotVerified'));
    }
    setIsLoading(false);
  };

  // ANDROID: Show only Google Play Games login
  if (platform === 'android') {
    return (
      <div className="auth">
        <div className="auth__card">
          <button className="auth__back" onClick={onBack}>← {t('common.back')}</button>
          
          <div className="auth__header">
            <div className="auth__icon"><Gamepad2 size={22} /></div>
            <h2>{t('auth.login')}</h2>
          </div>

          <div className="auth__android-info">
            <p>Inicia sesión con tu cuenta de Google Play Games para guardar tu progreso y competir en los rankings.</p>
          </div>

          {(error || localError) && (
            <div className="auth__error">{error || localError}</div>
          )}

          <button 
            className="auth__playgames"
            onClick={handlePlayGamesLogin}
            disabled={isLoading}
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="#4CAF50" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>
              {isLoading ? 'Conectando...' : 'Iniciar con Google Play Games'}
            </span>
          </button>

          <div className="auth__android-benefits">
            <h4>Beneficios:</h4>
            <ul>
              <li>✅ Guardado en la nube automático</li>
              <li>🏆 Logros y rankings globales</li>
              <li>🔄 Sincroniza entre dispositivos</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Verification pending screen (Web/PC only)
  if (mode === 'verify' || (user && !isEmailVerified)) {
    return (
      <div className="auth">
        <div className="auth__card">
          <button className="auth__back" onClick={onBack}>← {t('common.back')}</button>
          
          <div className="auth__header">
            <div className="auth__icon"><Mail size={22} /></div>
            <h2>{t('auth.verifyEmail')}</h2>
          </div>

          <div className="auth__verify-message">
            <p>{t('auth.verificationSent')}</p>
            <p className="auth__email-display">{user?.email || email}</p>
            <p>{t('auth.clickLinkToActivate')}</p>
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
              {isLoading ? t('auth.checking') : t('auth.alreadyVerified')}
            </button>
            
            <button 
              className="auth__btn auth__btn--secondary"
              onClick={handleResendVerification}
              disabled={isLoading}
            >
              {t('auth.resendEmail')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // WEB/PC: Show full auth options (Google + Email/Password)
  return (
    <div className="auth">
      <div className="auth__card">
        <button className="auth__back" onClick={onBack}>← {t('common.back')}</button>
        
        <div className="auth__header">
          <div className="auth__icon">
            {mode === 'login' ? <Lock size={22} /> : mode === 'register' ? <FileText size={22} /> : <Key size={22} />}
          </div>
          <h2>
            {mode === 'login' && t('auth.login')}
            {mode === 'register' && t('auth.createAccount')}
            {mode === 'reset' && t('auth.resetPassword')}
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
              {t('auth.continueWithGoogle')}
            </button>
          </>
        )}

        {mode !== 'reset' && (
          <div className="auth__divider">
            <span>{t('auth.orUseEmail')}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth__form">
          {mode === 'register' && (
            <div className="auth__field">
              <label>{t('auth.username')}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('auth.usernamePlaceholder')}
                required
              />
            </div>
          )}

          <div className="auth__field">
            <label>{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
            />
          </div>

          {mode !== 'reset' && (
            <div className="auth__field">
              <label>{t('auth.password')}</label>
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
            {isLoading ? t('common.loading') : (
              mode === 'login' ? t('auth.enter') :
              mode === 'register' ? t('auth.createAccount') :
              t('auth.sendEmail')
            )}
          </button>
        </form>

        <div className="auth__links">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('reset'); clearError(); setSuccess(''); }}>
                {t('auth.forgotPassword')}
              </button>
              <button onClick={() => { setMode('register'); clearError(); setSuccess(''); }}>
                {t('auth.noAccount')}
              </button>
            </>
          )}
          
          {mode === 'register' && (
            <button onClick={() => { setMode('login'); clearError(); setSuccess(''); }}>
              {t('auth.haveAccount')}
            </button>
          )}
          
          {mode === 'reset' && (
            <button onClick={() => { setMode('login'); clearError(); setSuccess(''); }}>
              {t('auth.backToLogin')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
