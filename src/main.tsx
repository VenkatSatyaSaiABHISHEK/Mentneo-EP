import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      // Check for updates on load and when window gains focus
      void reg.update()
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void reg.update()
        }
      })
    } catch (err) {
      console.warn('SW registration failed:', err)
    }
  })

  // Auto-reload once when new service worker takes control so mobile PWA gets latest code immediately
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })
}
