import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
// Patch Date.prototype so all toLocale*String calls default to Suriname timezone
// (America/Paramaribo, UTC-3). Must run BEFORE any component imports.
import "@/utils/surinameTime";
import App from "@/App";

// Register Service Worker (only in production or when explicitly needed)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('[App] SW registered:', registration.scope);
      
      // Wait for SW to be ready and cache index.html
      const sw = await navigator.serviceWorker.ready;
      if (sw.active) {
        sw.active.postMessage('CACHE_INDEX');
      }
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[App] New SW version available');
            }
          });
        }
      });
    } catch (error) {
      // Silently handle SW errors in development
      if (process.env.NODE_ENV === 'production') {
        console.error('[App] SW registration failed:', error);
      }
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));

// Use StrictMode only in development for better production performance
if (process.env.NODE_ENV === 'development') {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  root.render(<App />);
}
