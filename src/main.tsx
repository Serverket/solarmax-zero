/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LegalPages } from './components/LegalPages'

function Root() {
  const path = window.location.pathname;
  if (path === '/privacy' || path === '/imprintprivacypolicy') {
    return <LegalPages type="privacy" />;
  }
  if (path === '/tos') {
    return <LegalPages type="tos" />;
  }
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
