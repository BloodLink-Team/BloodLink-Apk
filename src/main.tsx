import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      // Proactively check for an updated Service Worker
      reg.update().catch(() => {});

      // When the user brings the mobile tab or PWA to foreground, re-check
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(() => {});
        }
      });

      // If an update is already waiting, tell it to take over
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Tell the new SW to activate immediately
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    } catch {
      // ignore
    }
  });

  // Reload once when the new Service Worker takes over so users see latest updates immediately
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
