// Classic Dark — the original PC Gaffer theme
const classic = {
  id: 'classic',
  nameKey: 'settings.themeClassic',
  // These match the current :root values in index.css exactly
  variables: {
    '--color-bg-primary': '#0c1424',
    '--color-bg-secondary': '#101a2e',
    '--color-bg-tertiary': '#152238',
    '--color-bg-card': 'rgba(100, 140, 200, 0.08)',
    '--color-bg-card-hover': 'rgba(100, 140, 200, 0.12)',
    '--color-glass': 'rgba(255, 255, 255, 0.03)',
    '--color-glass-border': 'rgba(255, 255, 255, 0.06)',
    '--backdrop-blur': 'blur(12px)',
    '--color-accent': '#00d4ff',
    '--color-accent-rgb': '0, 212, 255',
    '--color-accent-secondary': '#0066ff',
    '--color-accent-secondary-rgb': '0, 102, 255',
    '--color-success': '#30d158',
    '--color-success-rgb': '48, 209, 88',
    '--color-warning': '#ffd60a',
    '--color-warning-rgb': '255, 214, 10',
    '--color-danger': '#ff453a',
    '--color-danger-rgb': '255, 69, 58',
    '--color-text-primary': 'rgba(255, 255, 255, 0.95)',
    '--color-text-secondary': 'rgba(255, 255, 255, 0.65)',
    '--color-text-tertiary': 'rgba(255, 255, 255, 0.40)',
    '--shadow-sm': '0 2px 8px rgba(0, 0, 0, 0.3)',
    '--shadow-md': '0 4px 20px rgba(0, 0, 0, 0.4)',
    '--shadow-lg': '0 8px 40px rgba(0, 0, 0, 0.5)',
    '--shadow-glow': '0 0 30px rgba(0, 212, 255, 0.2)',
    '--shadow-glow-success': '0 0 30px rgba(48, 209, 88, 0.2)',
  },
  colorScheme: 'dark',
  // Preview swatches for the theme picker
  preview: {
    bg: '#0c1424',
    card: '#152238',
    accent: '#00d4ff',
    text: '#ffffff',
  },
};

export default classic;
