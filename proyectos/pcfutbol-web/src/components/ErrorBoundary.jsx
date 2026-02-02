import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Store component stack for display
    if (errorInfo?.componentStack) {
      this.setState({ componentStack: errorInfo.componentStack });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReset = () => {
    try {
      localStorage.removeItem('pcfutbol_saveId');
      localStorage.removeItem('pcfutbol_local_save');
      localStorage.removeItem('pcfutbol_pending_slot');
    } catch (e) { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'linear-gradient(135deg, #1a0a0a 0%, #2a1414 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '20px'
        }}>
          <div style={{ textAlign: 'center', maxWidth: 500 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ color: '#ff4444', margin: '0 0 12px' }}>Algo salió mal</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>
              Ha ocurrido un error inesperado. Puedes intentar reintentar o reiniciar la app.
            </p>
            {this.state.error && (
              <pre style={{
                background: 'rgba(255,0,0,0.1)', padding: 12, borderRadius: 8,
                fontSize: 11, textAlign: 'left', overflow: 'auto', maxHeight: 200,
                marginBottom: 24, color: '#ff8888', wordBreak: 'break-all'
              }}>
                {this.state.error.toString()}
                {this.state.componentStack && (
                  '\n\nComponent Stack:' + this.state.componentStack.slice(0, 500)
                )}
              </pre>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '12px 24px', background: '#ff4444', border: 'none',
                  color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 16
                }}
              >
                Reintentar
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 16
                }}
              >
                Reiniciar App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
