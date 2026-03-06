/**
 * Preload all lazy-loaded chunks for offline support
 */

const modulesToPreload = [
  // Core pages
  () => import('../pages/Dashboard'),
  () => import('../pages/Login'),
  () => import('../pages/Register'),
  () => import('../pages/Admin'),
  () => import('../pages/WorkspaceSettings'),
  
  // Boekhouding Module - in boekhouding folder
  () => import('../pages/boekhouding/DashboardPage'),
  () => import('../pages/boekhouding/GrootboekPage'),
  () => import('../pages/boekhouding/DebiteruenPage'),
  () => import('../pages/boekhouding/CrediteruenPage'),
  () => import('../pages/boekhouding/BankKasPage'),
  () => import('../pages/boekhouding/BTWPage'),
  () => import('../pages/boekhouding/VerkoopPage'),
  () => import('../pages/boekhouding/InkoopPage'),
  () => import('../pages/boekhouding/POSPage'),
  () => import('../pages/boekhouding/VoorraadPage'),
  () => import('../pages/boekhouding/HRMPage'),
  () => import('../pages/boekhouding/VasteActivaPage'),
  () => import('../pages/boekhouding/ProjectenPage'),
  () => import('../pages/boekhouding/RapportagesPage'),
  () => import('../pages/boekhouding/WisselkoersenPage'),
  () => import('../pages/boekhouding/InstellingenPage'),
  
  // HRM pages - in pages root
  () => import('../pages/HRMDashboard'),
  () => import('../pages/HRMPersoneel'),
  () => import('../pages/HRMAanwezigheid'),
  () => import('../pages/HRMContracten'),
  () => import('../pages/HRMLoonlijst'),
  
  // AutoDealer
  () => import('../pages/AutoDealerDashboard'),
  () => import('../pages/AutoDealerVoertuigen'),
  () => import('../pages/AutoDealerKlanten'),
  () => import('../pages/AutoDealerVerkopen'),
  
  // BeautySpa
  () => import('../pages/BeautySpaDashboard'),
  
  // Schuldbeheer
  () => import('../pages/schuldbeheer/DashboardPage'),
  () => import('../pages/schuldbeheer/SchuldenPage'),
  () => import('../pages/schuldbeheer/BetalingenPage'),
  () => import('../pages/schuldbeheer/RelatiesPage'),
  
  // Other
  () => import('../pages/Apartments'),
  () => import('../pages/Tenants'),
  () => import('../pages/Payments'),
  () => import('../pages/Facturen'),
];

let preloadStarted = false;
let preloadComplete = false;
let preloadProgress = 0;

export async function preloadAllModules(onProgress, onComplete) {
  if (preloadStarted) return;
  
  preloadStarted = true;
  console.log(`[Preload] Starting preload of ${modulesToPreload.length} modules...`);
  
  const total = modulesToPreload.length;
  let loaded = 0;
  let failed = 0;
  
  for (let i = 0; i < modulesToPreload.length; i += 3) {
    const batch = modulesToPreload.slice(i, i + 3);
    
    await Promise.allSettled(
      batch.map(async (loadModule) => {
        try {
          await loadModule();
          loaded++;
        } catch (error) {
          failed++;
          // Ignore errors - some modules might not exist
        }
        
        preloadProgress = Math.round(((loaded + failed) / total) * 100);
        if (onProgress) onProgress(preloadProgress, loaded, failed);
      })
    );
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  preloadComplete = true;
  console.log(`[Preload] Done! Loaded: ${loaded}, Failed: ${failed}`);
  
  if (onComplete) onComplete(loaded, failed);
  
  localStorage.setItem('offlinePreloadComplete', 'true');
  localStorage.setItem('offlinePreloadDate', new Date().toISOString());
  
  return { loaded, failed };
}

export function isPreloadComplete() {
  return preloadComplete || localStorage.getItem('offlinePreloadComplete') === 'true';
}

export function getPreloadProgress() {
  return preloadProgress;
}

export function resetPreload() {
  preloadStarted = false;
  preloadComplete = false;
  preloadProgress = 0;
  localStorage.removeItem('offlinePreloadComplete');
  localStorage.removeItem('offlinePreloadDate');
}

export default preloadAllModules;
