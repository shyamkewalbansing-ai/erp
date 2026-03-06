/**
 * Preload all lazy-loaded chunks for offline support
 * This file contains ALL existing page modules
 */

const modulesToPreload = [
  // ==================== ROOT PAGES ====================
  () => import('../pages/AIAssistantPage'),
  () => import('../pages/Abonnement'),
  () => import('../pages/Admin'),
  () => import('../pages/Apartments'),
  () => import('../pages/AutoDealerDashboard'),
  () => import('../pages/AutoDealerKlanten'),
  () => import('../pages/AutoDealerPortalDashboard'),
  () => import('../pages/AutoDealerPortalLogin'),
  () => import('../pages/AutoDealerPortalPurchases'),
  () => import('../pages/AutoDealerVerkopen'),
  () => import('../pages/AutoDealerVoertuigen'),
  () => import('../pages/BeautySpaDashboard'),
  () => import('../pages/BetaalmethodesPage'),
  () => import('../pages/BoekhoudingDashboard'),
  () => import('../pages/CMSPage'),
  () => import('../pages/ContactPage'),
  () => import('../pages/Contracten'),
  () => import('../pages/CustomerSettings'),
  () => import('../pages/Dashboard'),
  () => import('../pages/DemoPage'),
  () => import('../pages/Deposits'),
  () => import('../pages/DomainManagementPage'),
  () => import('../pages/DomeinenPage'),
  () => import('../pages/EmployeePortalDashboard'),
  () => import('../pages/EmployeePortalLogin'),
  () => import('../pages/Facturen'),
  () => import('../pages/FaqPage'),
  () => import('../pages/GratisFactuurAuth'),
  () => import('../pages/GratisFactuurDashboard'),
  () => import('../pages/GratisFactuurFacturen'),
  () => import('../pages/GratisFactuurInstellingen'),
  () => import('../pages/GratisFactuurKlanten'),
  () => import('../pages/HRM'),
  () => import('../pages/HRMAanwezigheid'),
  () => import('../pages/HRMContracten'),
  () => import('../pages/HRMDashboard'),
  () => import('../pages/HRMDocumenten'),
  () => import('../pages/HRMInstellingen'),
  () => import('../pages/HRMLoonlijst'),
  () => import('../pages/HRMPersoneel'),
  () => import('../pages/HRMVerlof'),
  () => import('../pages/HRMWerving'),
  () => import('../pages/Instellingen'),
  () => import('../pages/Kasgeld'),
  () => import('../pages/LandingPage'),
  () => import('../pages/Leningen'),
  () => import('../pages/LiveChatStaffManager'),
  () => import('../pages/Login'),
  () => import('../pages/Meterstanden'),
  () => import('../pages/MijnModules'),
  () => import('../pages/ModuleDetailPage'),
  () => import('../pages/ModulesOverviewPage'),
  () => import('../pages/ModulesPage'),
  () => import('../pages/Onderhoud'),
  () => import('../pages/OndertekeningPage'),
  () => import('../pages/OverOnsPage'),
  () => import('../pages/Payments'),
  () => import('../pages/PrijzenPage'),
  () => import('../pages/PrivacyPage'),
  () => import('../pages/PublicInvoiceGenerator'),
  () => import('../pages/Register'),
  () => import('../pages/ResetPassword'),
  () => import('../pages/SpaBookingPage'),
  () => import('../pages/StaffChatDashboard'),
  () => import('../pages/SuribetMachines'),
  () => import('../pages/TenantDashboard'),
  () => import('../pages/TenantLogin'),
  () => import('../pages/Tenants'),
  () => import('../pages/VoorwaardenPage'),
  () => import('../pages/WebsiteBeheer'),
  () => import('../pages/Werknemers'),
  () => import('../pages/WorkspaceSettings'),
  () => import('../pages/WorkspacesPage'),

  // ==================== BOEKHOUDING ====================
  () => import('../pages/boekhouding/AuditTrailPage'),
  () => import('../pages/boekhouding/BTWPage'),
  () => import('../pages/boekhouding/BankKasPage'),
  () => import('../pages/boekhouding/BoekhoudingLayout'),
  () => import('../pages/boekhouding/CrediteruenPage'),
  () => import('../pages/boekhouding/DashboardPage'),
  () => import('../pages/boekhouding/DebiteruenPage'),
  () => import('../pages/boekhouding/DocumentenPage'),
  () => import('../pages/boekhouding/GrootboekPage'),
  () => import('../pages/boekhouding/HRMPage'),
  () => import('../pages/boekhouding/HerinneringenPage'),
  () => import('../pages/boekhouding/InkoopPage'),
  () => import('../pages/boekhouding/InstellingenPage'),
  () => import('../pages/boekhouding/NieuweBTWAangiftePage'),
  () => import('../pages/boekhouding/NieuweDebiteurPage'),
  () => import('../pages/boekhouding/NieuweFactuurPage'),
  () => import('../pages/boekhouding/NieuweLeverancierPage'),
  () => import('../pages/boekhouding/NieuweOffertePage'),
  () => import('../pages/boekhouding/POSMobileScannerPage'),
  () => import('../pages/boekhouding/POSPage'),
  () => import('../pages/boekhouding/POSPermanentScannerPage'),
  () => import('../pages/boekhouding/POSPublicScannerPage'),
  () => import('../pages/boekhouding/ProjectenPage'),
  () => import('../pages/boekhouding/RapportagesPage'),
  () => import('../pages/boekhouding/VasteActivaPage'),
  () => import('../pages/boekhouding/VerkoopPage'),
  () => import('../pages/boekhouding/VoorraadPage'),
  () => import('../pages/boekhouding/WisselkoersenPage'),

  // ==================== SCHULDBEHEER ====================
  () => import('../pages/schuldbeheer/BetalingenPage'),
  () => import('../pages/schuldbeheer/DashboardPage'),
  () => import('../pages/schuldbeheer/DocumentenPage'),
  () => import('../pages/schuldbeheer/InkomstenPage'),
  () => import('../pages/schuldbeheer/PlanningPage'),
  () => import('../pages/schuldbeheer/RapportagesPage'),
  () => import('../pages/schuldbeheer/RekeningenPage'),
  () => import('../pages/schuldbeheer/RelatiesPage'),
  () => import('../pages/schuldbeheer/SchuldbeheerLayout'),
  () => import('../pages/schuldbeheer/SchuldenPage'),
  () => import('../pages/schuldbeheer/UitgavenPage'),
];

let preloadStarted = false;
let preloadComplete = false;
let preloadProgress = 0;

export async function preloadAllModules(onProgress, onComplete) {
  if (preloadStarted) return { loaded: 0, failed: 0 };
  
  preloadStarted = true;
  console.log(`[Preload] Starting preload of ${modulesToPreload.length} modules...`);
  
  const total = modulesToPreload.length;
  let loaded = 0;
  let failed = 0;
  
  // Load in batches of 5 for faster loading
  const batchSize = 5;
  
  for (let i = 0; i < modulesToPreload.length; i += batchSize) {
    const batch = modulesToPreload.slice(i, i + batchSize);
    
    await Promise.allSettled(
      batch.map(async (loadModule) => {
        try {
          await loadModule();
          loaded++;
        } catch (error) {
          failed++;
          console.warn('[Preload] Failed to load module');
        }
        
        preloadProgress = Math.round(((loaded + failed) / total) * 100);
        if (onProgress) onProgress(preloadProgress, loaded, failed);
      })
    );
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  preloadComplete = true;
  console.log(`[Preload] Complete! Loaded: ${loaded}, Failed: ${failed}`);
  
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
