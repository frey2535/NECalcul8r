import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { registerServiceWorker } from '@/lib/pwa'

registerServiceWorker()

try {
  const redirect = window.sessionStorage.getItem("necalcul8r_redirect");
  if (redirect && window.location.pathname === "/") {
    window.sessionStorage.removeItem("necalcul8r_redirect");
    window.history.replaceState(null, "", redirect);
  }
} catch {
  // Ignore storage failures and continue with the normal app route.
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
