// Event system for triggering data refreshes across the application

// Event types
export const REFRESH_EVENTS = {
  TENANTS: 'refresh:tenants',
  APARTMENTS: 'refresh:apartments',
  PAYMENTS: 'refresh:payments',
  LOANS: 'refresh:loans',
  DEPOSITS: 'refresh:deposits',
  KASGELD: 'refresh:kasgeld',
  DASHBOARD: 'refresh:dashboard',
  ALL: 'refresh:all'
};

// Dispatch a refresh event
export const triggerRefresh = (eventType = REFRESH_EVENTS.ALL) => {
  window.dispatchEvent(new CustomEvent(eventType));
  
  // Also dispatch ALL event if a specific event is triggered
  if (eventType !== REFRESH_EVENTS.ALL) {
    window.dispatchEvent(new CustomEvent(REFRESH_EVENTS.ALL));
  }
};

// Hook to subscribe to refresh events
export const useRefreshListener = (eventType, callback) => {
  const { useEffect } = require('react');
  
  useEffect(() => {
    const handler = () => callback();
    
    window.addEventListener(eventType, handler);
    window.addEventListener(REFRESH_EVENTS.ALL, handler);
    
    return () => {
      window.removeEventListener(eventType, handler);
      window.removeEventListener(REFRESH_EVENTS.ALL, handler);
    };
  }, [eventType, callback]);
};
