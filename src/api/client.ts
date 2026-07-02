import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ── Config ───────────────────────────────────────────────────────────────────
// EXPO_PUBLIC_ vars are inlined at build time by Expo/Metro, so this can be
// overridden per eas.json build profile (e.g. a "staging" profile with its
// own env block) without touching this file. Falls back to production.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://farmasyst-backend.onrender.com/api/v1';

const STORAGE_KEYS = {
  ACCESS:  'farmasyst_access',   // SecureStore keys: letters, digits, '.', '-', '_' only — no colons
  REFRESH: 'farmasyst_refresh',
  USER:    'farmasyst:user',     // non-sensitive profile cache — stays in AsyncStorage
};

// ── Secure token storage ─────────────────────────────────────────────────────
// Access/refresh tokens are auth secrets and must NOT live in plain
// AsyncStorage (unencrypted, readable via adb backup / on rooted devices).
// expo-secure-store backs onto Android Keystore / iOS Keychain instead.
async function setSecureItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
}
async function getSecureItem(key: string) {
  return SecureStore.getItemAsync(key);
}
async function deleteSecureItem(key: string) {
  await SecureStore.deleteItemAsync(key);
}

// ── Client ───────────────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getSecureItem(STORAGE_KEYS.ACCESS);
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) delete config.headers['Content-Type'];
  return config;
});

// ── Refresh mutex ────────────────────────────────────────────────────────────
// Dashboards fire several requests in parallel (Promise.allSettled). If the
// access token has expired, each of those requests hits a 401 at roughly the
// same time — without this, each one independently calls /auth/refresh/,
// which can race and, on backends that rotate/invalidate refresh tokens on
// use, cause some of the parallel calls to fail or the user to get logged
// out unexpectedly. This ensures only ONE refresh call is ever in flight;
// every other caller awaits that same promise instead of starting its own.
let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refresh = await getSecureItem(STORAGE_KEYS.REFRESH);
  if (!refresh) throw new Error('no refresh token');
  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh });
  await setSecureItem(STORAGE_KEYS.ACCESS, data.access);
  return data.access;
}

api.interceptors.response.use(
  r => r,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = performRefresh().finally(() => { refreshPromise = null; });
        }
        const newAccess = await refreshPromise;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        await clearTokens();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// ── Token helpers ────────────────────────────────────────────────────────────
export async function saveTokens(access: string, refresh: string) {
  const ops: Promise<void>[] = [setSecureItem(STORAGE_KEYS.ACCESS, access)];
  // SecureStore rejects empty-string values on some platforms, so only
  // write the refresh token if we actually got one from the backend.
  ops.push(refresh ? setSecureItem(STORAGE_KEYS.REFRESH, refresh) : deleteSecureItem(STORAGE_KEYS.REFRESH).catch(() => {}));
  await Promise.all(ops);
}
export async function clearTokens() {
  await Promise.all([
    deleteSecureItem(STORAGE_KEYS.ACCESS).catch(() => {}),
    deleteSecureItem(STORAGE_KEYS.REFRESH).catch(() => {}),
    AsyncStorage.removeItem(STORAGE_KEYS.USER),
  ]);
}
export async function saveUser(user: object) {
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}
export async function loadUser() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  return raw ? JSON.parse(raw) : null;
}
export async function getAccessToken() {
  return getSecureItem(STORAGE_KEYS.ACCESS);
}
export async function getRefreshToken() {
  return getSecureItem(STORAGE_KEYS.REFRESH);
}
export function toArray<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'object' && 'results' in (data as object)) return ((data as any).results) ?? [];
  return [data as T];
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:              (email: string, password: string) => api.post('/auth/login/', { email, password }),
  register:           (data: object) => api.post('/auth/register/', data),
  verifyOtp:          (data: object) => api.post('/auth/verify-otp/', data),
  resendOtp:          (data: object) => api.post('/auth/resend-otp/', data),
  logout:             (refresh: string) => api.post('/auth/logout/', { refresh }),
  me:                 () => api.get('/auth/me/'),
  updateMe:           (data: FormData | object) => api.patch('/auth/me/', data),
  changePassword:     (data: object) => api.post('/auth/change-password/', data),
  refresh:            (refresh: string) => api.post('/auth/refresh/', { refresh }),
  farmerProfile:      () => api.get('/profiles/farmer/'),
  updateFarmerProfile:(d: object) => api.patch('/profiles/farmer/', d),
  investorProfile:    () => api.get('/profiles/investor/'),
  updateInvestorProfile:(d: object) => api.patch('/profiles/investor/', d),
};

// ── Users (admin) ─────────────────────────────────────────────────────────────
export const usersApi = {
  list:              (params?: object) => api.get('/users/', { params }),
  get:               (id: string) => api.get(`/users/${id}/`),
  verify:            (id: string) => api.post(`/users/${id}/verify/`),
  suspend:           (id: string) => api.post(`/users/${id}/suspend/`),
  unsuspend:         (id: string) => api.post(`/users/${id}/unsuspend/`),
  deleteUser:        (id: string) => api.delete(`/users/${id}/`),
  updateCreditScore: (id: string, score: number) => api.post(`/users/${id}/update_credit_score/`, { credit_score: score }),
};

// ── Profiles ──────────────────────────────────────────────────────────────────
export const profilesApi = {
  listFarmers:  (params?: object) => api.get('/profiles/farmers/', { params }),
  getFarmer:    (id: string) => api.get(`/profiles/farmers/${id}/`),
  listInvestors: () => api.get('/profiles/investors/'),
};

// ── Farms ─────────────────────────────────────────────────────────────────────
export const farmsApi = {
  list:           (params?: object) => api.get('/farms/', { params }),
  get:            (id: string) => api.get(`/farms/${id}/`),
  create:         (d: object) => api.post('/farms/', d),
  update:         (id: string, d: object) => api.patch(`/farms/${id}/`, d),
  assignOfficer:  (id: string, officerId: string) => api.post(`/farms/${id}/assign_officer/`, { officer_id: officerId }),
  activityLogs:   (farmId: string, params?: object) => api.get(`/farms/${farmId}/activity-logs/`, { params }),
  createLog:      (farmId: string, d: object) => api.post(`/farms/${farmId}/activity-logs/`, d),
  createLogForm:  (farmId: string, d: FormData) => api.post(`/farms/${farmId}/activity-logs/`, d),
  auditReports:   (params?: object) => api.get('/farm-audit-reports/', { params }),
  submitAudit:    (d: FormData) => api.post('/farm-audit-reports/', d),
};

// ── Credit ────────────────────────────────────────────────────────────────────
export const creditApi = {
  listApps:        (params?: object) => api.get('/credit/applications/', { params }),
  getApp:          (id: string) => api.get(`/credit/applications/${id}/`),
  createApp:       (d: object) => api.post('/credit/applications/', d),
  updateApp:       (id: string, d: object) => api.patch(`/credit/applications/${id}/`, d),
  submitApp:       (id: string) => api.post(`/credit/applications/${id}/submit/`),
  approveApp:      (id: string, d: object) => api.post(`/credit/applications/${id}/approve/`, d),
  rejectApp:       (id: string, d: object) => api.post(`/credit/applications/${id}/reject/`, d),
  matchApp:        (id: string, d: object) => api.post(`/credit/applications/${id}/match/`, d),
  acceptMatch:     (id: string) => api.post(`/credit/applications/${id}/accept/`),
  declineMatch:    (id: string) => api.post(`/credit/applications/${id}/decline_match/`),
  uploadDoc:       (appId: string, form: FormData) => api.post(`/credit/applications/${appId}/documents/`, form),
  listAgreements:  (params?: object) => api.get('/credit/agreements/', { params }),
  getAgreement:    (id: string) => api.get(`/credit/agreements/${id}/`),
  signAgreement:   (id: string) => api.post(`/credit/agreements/${id}/sign/`),
  generateDoc:     (id: string) => api.post(`/credit/agreements/${id}/generate_document/`),
  listProjects:    (params?: object) => api.get('/credit/projects/', { params }),
  createProject:   (d: object) => api.post('/credit/projects/', d),
  updateProject:   (id: string, d: object) => api.patch(`/credit/projects/${id}/`, d),
  submitProject:   (id: string) => api.post(`/credit/projects/${id}/submit/`),
  withdrawProject: (id: string) => api.post(`/credit/projects/${id}/withdraw/`),
  addFarmerToProject: (projId: string, d: object) => api.post(`/credit/projects/${projId}/add_farmer/`, d),
  removeFarmerFromProject: (projId: string, entryId: string) => api.delete(`/credit/projects/${projId}/remove_farmer/${entryId}/`),

  // Aliases used in some screen files (keep both names consistent)
  listApplications: (params?: object) => api.get('/credit/applications/', { params }),
  match:            (id: string, d: object) => api.post(`/credit/applications/${id}/match/`, d),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  schedules:          (params?: object) => api.get('/payments/schedules/', { params }),
  initiateRepayment:  (d: object) => api.post('/payments/initiate-repayment/', d),
  payFullBalance:     (d: object) => api.post('/payments/pay-full-balance/', d),
  disbursements:      (params?: object) => api.get('/payments/disbursements/', { params }),
  disbursementRequests: (params?: object) => api.get('/payments/disbursement-requests/', { params }),
  requestDisbursement: (d: object) => api.post('/payments/disbursement-requests/', d),
  approveDisbRequest:  (id: string, d: object) => api.post(`/payments/disbursement-requests/${id}/approve/`, d),
  rejectDisbRequest:   (id: string, d: object) => api.post(`/payments/disbursement-requests/${id}/reject/`, d),
};

// ── Marketplace ───────────────────────────────────────────────────────────────
export const marketApi = {
  listProduce:   (params?: object) => api.get('/marketplace/produce/', { params }),
  getProduce:    (id: string) => api.get(`/marketplace/produce/${id}/`),
  createListing: (d: FormData) => api.post('/marketplace/produce/', d),
  updateListing: (id: string, d: object) => api.patch(`/marketplace/produce/${id}/`, d),
  deleteListing: (id: string) => api.delete(`/marketplace/produce/${id}/`),
  listOrders:    (params?: object) => api.get('/marketplace/orders/', { params }),
  getOrder:      (id: string) => api.get(`/marketplace/orders/${id}/`),
  createOrder:   (d: object) => api.post('/marketplace/orders/', d),
  confirmOrder:  (id: string) => api.post(`/marketplace/orders/${id}/confirm/`),
  cancelOrder:   (id: string) => api.post(`/marketplace/orders/${id}/cancel/`),
  initiatePayment: (orderId: string, d: object) => api.post(`/marketplace/orders/${orderId}/initiate_payment/`, d),
};

// ── Training ──────────────────────────────────────────────────────────────────
export const trainingApi = {
  modules:        (params?: object) => api.get('/training/modules/', { params }),
  getModule:      (id: string) => api.get(`/training/modules/${id}/`),
  createModule:   (d: object) => api.post('/training/modules/', d),
  updateModule:   (id: string, d: object) => api.patch(`/training/modules/${id}/`, d),
  enrolments:     () => api.get('/training/enrolments/'),
  enrol:          (moduleId: string) => api.post('/training/enrolments/', { module: moduleId }),
  updateProgress: (enrolId: string, pct: number) => api.post(`/training/enrolments/${enrolId}/update_progress/`, { progress_pct: pct }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifApi = {
  list:        () => api.get('/notifications/'),
  unreadCount: () => api.get('/notifications/unread_count/'),
  markRead:    (id: string) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.post('/notifications/mark_all_read/'),
};

// ── Vets ──────────────────────────────────────────────────────────────────────
export const vetApi = {
  profiles:       (params?: object) => api.get('/vet/profiles/', { params }),
  myProfile:      () => api.get('/vet/profiles/me/'),
  updateMyProfile:(d: object) => api.patch('/vet/profiles/me/', d),
  services:       (params?: object) => api.get('/vet/services/', { params }),
  myServices:     () => api.get('/vet/services/my_services/'),
  createService:  (d: object) => api.post('/vet/services/', d),
  updateService:  (id: string, d: object) => api.patch(`/vet/services/${id}/`, d),
  deleteService:  (id: string) => api.delete(`/vet/services/${id}/`),
  bookings:       (params?: object) => api.get('/vet/bookings/', { params }),
  myBookings:     (params?: object) => api.get('/vet/bookings/my_bookings/', { params }),
  createBooking:  (d: object) => api.post('/vet/bookings/', d),
  confirmBooking: (id: string) => api.post(`/vet/bookings/${id}/confirm/`),
  cancelBooking:  (id: string) => api.post(`/vet/bookings/${id}/cancel/`),
  completeBooking:(id: string, d: object) => api.post(`/vet/bookings/${id}/complete/`, d),
};

// ── Inputs ────────────────────────────────────────────────────────────────────
export const inputsApi = {
  listings:      (params?: object) => api.get('/inputs/listings/', { params }),
  myListings:    () => api.get('/inputs/listings/my_listings/'),
  createInput:   (d: FormData) => api.post('/inputs/listings/', d),
  updateInput:   (id: string, d: FormData | object) => api.patch(`/inputs/listings/${id}/`, d),
  deleteInput:   (id: string) => api.delete(`/inputs/listings/${id}/`),
  myDealerProfile: () => api.get('/inputs/dealers/me/'),
  updateDealerProfile: (d: object) => api.patch('/inputs/dealers/me/', d),
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiApi = {
  // General assistant chat — screens call aiApi.chat(message, session_id?)
  chat:        (message: string, session_id?: string) =>
                 api.post('/ai/chat/', { message, session_id }),

  // AI disease detection for a farm, with optional media payload
  disease:     (farm_id: string, payload?: object) =>
                 api.post('/ai/disease-detection/', { farm_id, ...(payload ?? {}) }),

  // AI credit-worthiness scoring for a farmer
  credit:      (farmer_id: string) =>
                 api.post('/ai/creditworthiness/', { farmer_id }),

  // Flock count from image
  flockCount:  (d: object) => api.post('/ai/flock-count/', d),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  analytics: () => api.get('/admin/analytics/'),
};

export default api;
