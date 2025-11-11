import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize unique tab ID for tracking multi-tab scenarios
if (!sessionStorage.getItem('tabId')) {
  const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('tabId', tabId);
  console.log('[APP] Tab initialized with ID:', tabId);
}

// StrictMode disabled to prevent double-firing issues with async operations
createRoot(document.getElementById('root')!).render(
  <App />
)
