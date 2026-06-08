import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Info, AlertTriangle } from 'lucide-react';
import './Toast.scss';

const ToastContext = createContext();

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Track whether the provider is still mounted so we never setState afterwards.
  const mountedRef = useRef(true);
  // Map of toast id -> setTimeout handle, so we can clear pending removals.
  const timeoutsRef = useRef(new Map());
  // Monotonic counter guarantees unique ids even within the same millisecond.
  const seqRef = useRef(0);

  const removeToast = useCallback((id) => {
    const handle = timeoutsRef.current.get(id);
    if (handle !== undefined) {
      clearTimeout(handle);
      timeoutsRef.current.delete(id);
    }
    if (!mountedRef.current) return;
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    if (!mountedRef.current) return;
    seqRef.current += 1;
    const id = `${seqRef.current}`;
    setToasts(prev => [...prev, { id, message, type }]);
    const handle = setTimeout(() => {
      timeoutsRef.current.delete(id);
      if (!mountedRef.current) return;
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    timeoutsRef.current.set(id, handle);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const timeouts = timeoutsRef.current;
    return () => {
      mountedRef.current = false;
      // Clear every pending removal so no setState fires after unmount.
      timeouts.forEach(handle => clearTimeout(handle));
      timeouts.clear();
    };
  }, []);

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
  };

  const container = (
    <div className="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast toast--${t.type}`}
          onClick={() => removeToast(t.id)}
        >
          <span className="toast__icon">
            {t.type === 'success' && <Check size={14} />}
            {t.type === 'error' && <X size={14} />}
            {t.type === 'info' && <Info size={14} />}
            {t.type === 'warning' && <AlertTriangle size={14} />}
          </span>
          <span className="toast__message">{t.message}</span>
        </div>
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {typeof document !== 'undefined' && document.body
        ? createPortal(container, document.body)
        : container}
    </ToastContext.Provider>
  );
}
