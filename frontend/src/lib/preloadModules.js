/**
 * Preload modules - ALLEEN BOEKHOUDING
 * All other modules removed for memory efficiency
 */

// Export empty functions for backwards compatibility
export async function preloadAllModules() {
  return { loaded: 0, failed: 0 };
}

export function isPreloadComplete() {
  return localStorage.getItem('boekhoudingOffline') === 'true';
}

export function getPreloadProgress() {
  return 0;
}

export function resetPreload() {
  localStorage.removeItem('boekhoudingOffline');
  localStorage.removeItem('boekhoudingOfflineDate');
}

export default preloadAllModules;
