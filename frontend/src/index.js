import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Register Service Worker and cache index.html immediately
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('[App] SW registered:', registration.scope);
      
      // Wait for SW to be ready and cache index.html
      const sw = await navigator.serviceWorker.ready;
      if (sw.active) {
        sw.active.postMessage('CACHE_INDEX');
        console.log('[App] Requested index.html caching');
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
      console.error('[App] SW registration failed:', error);
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
