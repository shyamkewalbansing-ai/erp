import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Simple in-memory cache for GET requests
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Create axios instance with optimized config
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 second timeout
});

// Add auth token and workspace domain to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Add current domain as header for workspace validation
  config.headers['X-Workspace-Domain'] = window.location.hostname;
  return config;
});

// Handle auth errors and cache responses
api.interceptors.response.use(
  (response) => {
    // Cache GET responses for public endpoints
    if (response.config.method === 'get' && response.config.url?.includes('/public/')) {
      const cacheKey = response.config.url;
      cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Cached GET for public endpoints
export const cachedGet = async (url) => {
  const cacheKey = url;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  return api.get(url);
};

// Clear cache (useful after mutations)
export const clearCache = () => cache.clear();

// Format currency
export const formatCurrency = (amount) => {
  return `SRD ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
};

// Dashboard
export const getDashboard = () => api.get('/dashboard');
export const getNotifications = () => api.get('/notifications');

// Tenants
export const getTenants = () => api.get('/tenants');
export const getTenant = (id) => api.get(`/tenants/${id}`);
export const createTenant = (data) => api.post('/tenants', data);
export const updateTenant = (id, data) => api.put(`/tenants/${id}`, data);
export const deleteTenant = (id) => api.delete(`/tenants/${id}`);
export const getTenantBalance = (id) => api.get(`/tenants/${id}/balance`);
export const getTenantOutstanding = (id) => api.get(`/tenants/${id}/outstanding`);

// Apartments
export const getApartments = () => api.get('/apartments');
export const getApartment = (id) => api.get(`/apartments/${id}`);
export const createApartment = (data) => api.post('/apartments', data);
export const updateApartment = (id, data) => api.put(`/apartments/${id}`, data);
export const deleteApartment = (id) => api.delete(`/apartments/${id}`);
export const assignTenant = (apartmentId, tenantId) => 
  api.post(`/apartments/${apartmentId}/assign-tenant?tenant_id=${tenantId}`);
export const removeTenant = (apartmentId) => 
  api.post(`/apartments/${apartmentId}/remove-tenant`);

// Payments
export const getPayments = () => api.get('/payments');
export const getPayment = (id) => api.get(`/payments/${id}`);
export const createPayment = (data) => api.post('/payments', data);
export const deletePayment = (id) => api.delete(`/payments/${id}`);
export const downloadReceipt = (paymentId) => 
  api.get(`/receipts/${paymentId}/pdf`, { responseType: 'blob' });

// Invoices (Facturen)
export const getInvoices = () => api.get('/invoices');

// Deposits
export const getDeposits = () => api.get('/deposits');
export const createDeposit = (data) => api.post('/deposits', data);
export const updateDeposit = (id, data) => api.put(`/deposits/${id}`, data);
export const deleteDeposit = (id) => api.delete(`/deposits/${id}`);
export const downloadDepositRefund = (depositId) => 
  api.get(`/deposits/${depositId}/refund-pdf`, { responseType: 'blob' });

// Loans (Leningen)
export const getLoans = () => api.get('/loans');
export const createLoan = (data) => api.post('/loans', data);
export const updateLoan = (id, data) => api.put(`/loans/${id}`, data);
export const deleteLoan = (id) => api.delete(`/loans/${id}`);
export const getTenantLoans = (tenantId) => api.get(`/tenants/${tenantId}/loans`);

// Kasgeld (Cash Fund)
export const getKasgeld = () => api.get('/kasgeld');
export const createKasgeld = (data) => api.post('/kasgeld', data);
export const deleteKasgeld = (id) => api.delete(`/kasgeld/${id}`);

// Onderhoud (Maintenance)
export const getMaintenance = () => api.get('/maintenance');
export const getMaintenanceRecord = (id) => api.get(`/maintenance/${id}`);
export const createMaintenance = (data) => api.post('/maintenance', data);
export const updateMaintenance = (id, data) => api.put(`/maintenance/${id}`, data);
export const deleteMaintenance = (id) => api.delete(`/maintenance/${id}`);
export const getApartmentMaintenance = (apartmentId) => api.get(`/maintenance/apartment/${apartmentId}`);

// Werknemers (Employees)
export const getEmployees = () => api.get('/employees');
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);

// Salaris (Salary Payments)
export const getSalaries = () => api.get('/salaries');
export const createSalary = (data) => api.post('/salaries', data);
export const deleteSalary = (id) => api.delete(`/salaries/${id}`);
export const downloadPayslip = (salaryId) => 
  api.get(`/salaries/${salaryId}/pdf`, { responseType: 'blob' });

// Wisselkoers (Exchange Rate)
export const getExchangeRate = () => api.get('/exchange-rate');

// Subscription
export const getSubscriptionStatus = () => api.get('/subscription/status');
export const requestSubscription = () => api.post('/subscription/request');

// Admin - Customers
export const getAdminDashboard = () => api.get('/admin/dashboard');
export const getAdminCustomers = () => api.get('/admin/customers');
export const createAdminCustomer = (data) => api.post('/admin/customers', data);
export const deactivateCustomer = (userId) => api.delete(`/admin/customers/${userId}`);
export const deleteCustomerPermanent = (userId) => api.delete(`/admin/customers/${userId}/permanent`);

// Admin - Subscriptions
export const getAdminSubscriptions = () => api.get('/admin/subscriptions');
export const activateSubscription = (data) => api.post('/admin/subscriptions', data);
export const deleteSubscriptionPayment = (subscriptionId) => api.delete(`/admin/subscriptions/${subscriptionId}`);
export const getSubscriptionRequests = () => api.get('/admin/subscription-requests');
export const downloadSubscriptionReceipt = (subscriptionId) => 
  api.get(`/admin/subscriptions/${subscriptionId}/pdf`, { responseType: 'blob' });

// Admin - Customer Profile Management
export const adminResetPassword = (userId, newPassword) => 
  api.put(`/admin/customers/${userId}/password`, { new_password: newPassword });
export const adminUpdateCustomer = (userId, data) => 
  api.put(`/admin/customers/${userId}/profile`, data);

// Admin - Custom Domains
export const getAdminDomains = () => api.get('/admin/domains');
export const createCustomDomain = (data) => api.post('/admin/domains', data);
export const verifyCustomDomain = (domainId) => api.put(`/admin/domains/${domainId}/verify`);
export const deleteCustomDomain = (domainId) => api.delete(`/admin/domains/${domainId}`);
export const getCustomerDomains = (userId) => api.get(`/admin/domains/customer/${userId}`);

// Add-ons (Public)
export const getAddons = () => api.get('/addons');

// Add-ons (User)
export const getMyAddons = () => api.get('/user/addons');
export const requestAddonActivation = (data) => api.post('/user/addons/request', data);

// Add-ons (Admin)
export const getAdminAddons = () => api.get('/admin/addons');
export const createAddon = (data) => api.post('/admin/addons', data);
export const updateAddon = (id, data) => api.put(`/admin/addons/${id}`, data);
export const deleteAddon = (id) => api.delete(`/admin/addons/${id}`);

// User Add-ons (Admin)
export const getAllUserAddons = () => api.get('/admin/user-addons');
export const getUserAddons = (userId) => api.get(`/admin/users/${userId}/addons`);
export const activateUserAddon = (userId, data) => api.post(`/admin/users/${userId}/addons`, data);
export const deactivateUserAddon = (userId, addonId) => api.delete(`/admin/users/${userId}/addons/${addonId}`);

// Add-on Requests (Admin)
export const getAddonRequests = () => api.get('/admin/addon-requests');
export const approveAddonRequest = (requestId, months = 1) => api.put(`/admin/addon-requests/${requestId}/approve?months=${months}`);
export const rejectAddonRequest = (requestId) => api.put(`/admin/addon-requests/${requestId}/reject`);

// Landing Page (Public) - Use axios directly but with timeout
const publicAxios = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 second timeout
});

export const getLandingSections = () => publicAxios.get('/public/landing/sections');
export const getLandingSettings = () => publicAxios.get('/public/landing/settings');
export const getPublicAddons = () => publicAxios.get('/public/addons');
export const createPublicOrder = (data) => publicAxios.post('/public/orders', data);

// Landing Page (Admin)
export const getAdminLandingSections = () => api.get('/admin/landing/sections');
export const createLandingSection = (data) => api.post('/admin/landing/sections', data);
export const updateLandingSection = (id, data) => api.put(`/admin/landing/sections/${id}`, data);
export const deleteLandingSection = (id) => api.delete(`/admin/landing/sections/${id}`);
export const reorderLandingSections = (orders) => api.put('/admin/landing/sections/reorder', orders);
export const getAdminLandingSettings = () => api.get('/admin/landing/settings');
export const updateLandingSettings = (data) => api.put('/admin/landing/settings', data);

// Public Orders (Admin)
export const getAdminOrders = () => api.get('/admin/orders');
export const updateOrderStatus = (id, status) => api.put(`/admin/orders/${id}/status?status=${status}`);
export const deleteOrder = (id) => api.delete(`/admin/orders/${id}`);

// Mope Payment Settings (Admin)
export const getMopeSettings = () => api.get('/admin/mope/settings');
export const updateMopeSettings = (data) => api.put('/admin/mope/settings', data);

// Public Payment
export const createPaymentForOrder = (orderId, redirectUrl = '') => 
  axios.post(`${API_URL}/public/orders/${orderId}/pay?redirect_url=${encodeURIComponent(redirectUrl)}`);
export const checkPaymentStatus = (orderId) => axios.get(`${API_URL}/public/orders/${orderId}/payment-status`);

// Profile/Settings
export const getProfile = () => api.get('/profile');
export const updateProfile = (data) => api.put('/profile', data);
export const changePassword = (currentPassword, newPassword) => 
  api.put('/profile/password', { current_password: currentPassword, new_password: newPassword });
export const uploadLogo = (logoData) => api.post('/profile/logo', { logo_data: logoData });
export const deleteLogo = () => api.delete('/profile/logo');
export const updateRentSettings = (settings) => api.put('/profile/rent-settings', settings);

// Contracts (Huurcontracten)
export const getContracts = () => api.get('/contracts');
export const getContract = (id) => api.get(`/contracts/${id}`);
export const createContract = (data) => api.post('/contracts', data);
export const updateContract = (id, data) => api.put(`/contracts/${id}`, data);
export const deleteContract = (id) => api.delete(`/contracts/${id}`);
export const downloadContractPdf = (id) => api.get(`/contracts/${id}/pdf`, { responseType: 'blob' });

// Public contract signing (no auth needed)
export const getContractForSigning = (token) => 
  axios.get(`${API_URL}/contracts/sign/${token}`);
export const signContract = (token, signatureData) => 
  axios.post(`${API_URL}/contracts/sign/${token}`, { signature_data: signatureData });

// Format currency in EUR
export const formatCurrencyEUR = (amount) => {
  return `€ ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
};

// System Update / Deployment
export const getDeploymentSettings = () => api.get('/admin/deployment/settings');
export const updateDeploymentSettings = (data) => api.put('/admin/deployment/settings', data);
export const triggerSystemUpdate = () => api.post('/admin/deployment/update');
export const getDeploymentLogs = () => api.get('/admin/deployment/logs');

// Workspaces / Multi-tenant
export const getWorkspaces = () => api.get('/admin/workspaces');
export const getWorkspace = (id) => api.get(`/admin/workspaces/${id}`);
export const createWorkspace = (data) => api.post('/admin/workspaces', data);
export const updateWorkspace = (id, data) => api.put(`/admin/workspaces/${id}`, data);
export const deleteWorkspace = (id) => api.delete(`/admin/workspaces/${id}`);
export const verifyWorkspaceDns = (id) => api.post(`/admin/workspaces/${id}/verify-dns`);
export const activateWorkspaceSsl = (id) => api.post(`/admin/workspaces/${id}/activate-ssl`);
export const getWorkspaceNginxConfig = (id) => api.get(`/admin/workspaces/${id}/nginx-config`);
export const getWorkspaceStats = () => api.get('/admin/workspace-stats');

// Current user workspace
export const getCurrentWorkspace = () => api.get('/workspace/current');
export const updateWorkspaceBranding = (branding) => api.put('/workspace/branding', branding);
export const getWorkspaceSettings = () => api.get('/workspace/settings');
export const updateWorkspaceSettings = (data) => api.put('/workspace/settings', data);
export const updateWorkspaceDomain = (data) => api.put('/workspace/domain', data);
export const verifyWorkspaceDomain = () => api.post('/workspace/domain/verify');
export const createUserWorkspace = (data) => api.post('/workspace/create', data);

// Workspace Users
export const getWorkspaceUsers = () => api.get('/workspace/users');
export const inviteWorkspaceUser = (data) => api.post('/workspace/users/invite', data);
export const updateWorkspaceUserRole = (userId, role) => api.put(`/workspace/users/${userId}/role`, null, { params: { role } });
export const removeWorkspaceUser = (userId) => api.delete(`/workspace/users/${userId}`);

// Workspace Backups
export const getWorkspaceBackups = () => api.get('/workspace/backups');
export const createWorkspaceBackup = (data) => api.post('/workspace/backups', data);
export const restoreWorkspaceBackup = (backupId, confirm = false) => api.post(`/workspace/backups/${backupId}/restore?confirm=${confirm}`);
export const deleteWorkspaceBackup = (backupId) => api.delete(`/workspace/backups/${backupId}`);
export const downloadWorkspaceBackup = (backupId) => api.get(`/workspace/backups/${backupId}/download`);

// ==================== AUTO DEALER MODULE ====================

// Auto Dealer Stats
export const getAutoDealerStats = () => api.get('/autodealer/stats');

// Auto Dealer Vehicles
export const getAutoDealerVehicles = (params) => api.get('/autodealer/vehicles', { params });
export const getAutoDealerVehicle = (id) => api.get(`/autodealer/vehicles/${id}`);
export const createAutoDealerVehicle = (data) => api.post('/autodealer/vehicles', data);
export const updateAutoDealerVehicle = (id, data) => api.put(`/autodealer/vehicles/${id}`, data);
export const deleteAutoDealerVehicle = (id) => api.delete(`/autodealer/vehicles/${id}`);

// Auto Dealer Customers
export const getAutoDealerCustomers = (params) => api.get('/autodealer/customers', { params });
export const getAutoDealerCustomer = (id) => api.get(`/autodealer/customers/${id}`);
export const createAutoDealerCustomer = (data) => api.post('/autodealer/customers', data);
export const updateAutoDealerCustomer = (id, data) => api.put(`/autodealer/customers/${id}`, data);
export const deleteAutoDealerCustomer = (id) => api.delete(`/autodealer/customers/${id}`);

// Auto Dealer Sales
export const getAutoDealerSales = (params) => api.get('/autodealer/sales', { params });
export const getAutoDealerSale = (id) => api.get(`/autodealer/sales/${id}`);
export const createAutoDealerSale = (data) => api.post('/autodealer/sales', data);
export const updateAutoDealerSale = (id, data) => api.put(`/autodealer/sales/${id}`, data);
export const deleteAutoDealerSale = (id) => api.delete(`/autodealer/sales/${id}`);

export default api;
