/**
 * Performance utilities for Facturatie
 * Helps improve PageSpeed scores and overall app performance
 */

// Debounce function - prevents excessive function calls
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function - limits function calls to once per interval
export function throttle(func, limit = 100) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Request idle callback polyfill
export const requestIdleCallback = 
  window.requestIdleCallback || 
  function(cb) {
    const start = Date.now();
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
      });
    }, 1);
  };

// Cancel idle callback polyfill
export const cancelIdleCallback = 
  window.cancelIdleCallback || 
  function(id) {
    clearTimeout(id);
  };

// Run function when browser is idle
export function whenIdle(callback) {
  return requestIdleCallback(callback, { timeout: 2000 });
}

// Lazy load a module
export function lazyLoad(importFn) {
  return new Promise((resolve) => {
    whenIdle(() => {
      importFn().then(resolve);
    });
  });
}

// Prefetch a route/component
export function prefetch(importFn) {
  whenIdle(() => {
    importFn().catch(() => {});
  });
}

// Check if user prefers reduced motion
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Measure component render time (development only)
export function measureRender(componentName) {
  if (process.env.NODE_ENV !== 'production') {
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`[Performance] ${componentName} rendered in ${(end - start).toFixed(2)}ms`);
    };
  }
  return () => {};
}

// Web Vitals reporter
export function reportWebVitals(onReport) {
  if ('web-vitals' in window) {
    return;
  }
  
  // Core Web Vitals
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      onReport({
        name: entry.name,
        value: entry.startTime,
        id: entry.name
      });
    }
  });
  
  try {
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    observer.observe({ type: 'first-input', buffered: true });
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // Browser doesn't support these metrics
  }
}

// Memory cleanup helper
export function cleanupMemory() {
  // Clear any cached data that's no longer needed
  if (window.gc) {
    window.gc();
  }
  
  // Clear console in production
  if (process.env.NODE_ENV === 'production') {
    console.clear();
  }
}

// Network status helper
export function isOnline() {
  return navigator.onLine;
}

// Connection quality helper
export function getConnectionQuality() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) {
    return 'unknown';
  }
  
  if (connection.saveData) {
    return 'save-data';
  }
  
  const effectiveType = connection.effectiveType;
  
  switch (effectiveType) {
    case '4g':
      return 'fast';
    case '3g':
      return 'medium';
    case '2g':
    case 'slow-2g':
      return 'slow';
    default:
      return 'unknown';
  }
}

// Should load heavy content based on connection
export function shouldLoadHeavyContent() {
  const quality = getConnectionQuality();
  return quality === 'fast' || quality === 'unknown';
}

// Intersection Observer helper for visibility detection
export function createVisibilityObserver(callback, options = {}) {
  const defaultOptions = {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target);
      }
    });
  }, defaultOptions);
}

// Batch DOM updates
export function batchUpdates(updates) {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
}

// Smooth scroll with fallback
export function smoothScrollTo(element, offset = 0) {
  if (!element) return;
  
  const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
  
  if ('scrollBehavior' in document.documentElement.style) {
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  } else {
    window.scrollTo(0, targetPosition);
  }
}

// Clear old service worker caches
export function clearOldCaches() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.controller?.postMessage('CLEAR_OLD_CACHES');
  }
}

// Initialize performance monitoring
export function initPerformanceMonitoring() {
  // Clear old caches on app start
  clearOldCaches();
  
  // Report web vitals in production
  if (process.env.NODE_ENV === 'production') {
    reportWebVitals((metric) => {
      // You can send this to your analytics service
      console.log('[WebVitals]', metric);
    });
  }
}
