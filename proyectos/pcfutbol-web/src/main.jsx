import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './i18n' // Inicializar i18n

const shouldReloadForDynamicImportError = (error) => {
  const message = String(error?.message || error || '').toLowerCase()
  return message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('chunkloaderror')
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  window.location.reload()
})

window.addEventListener('error', (event) => {
  if (shouldReloadForDynamicImportError(event?.error || event?.message)) {
    window.location.reload()
  }
})

window.addEventListener('unhandledrejection', (event) => {
  if (shouldReloadForDynamicImportError(event?.reason)) {
    event.preventDefault()
    window.location.reload()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
