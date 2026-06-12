import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Config ────────────────────────────────────────────────────────────────────
// Change to your backend URL. Use your machine's LAN IP when testing on a device.
export const BASE_URL = 'https://apple-choosing-willing.ngrok-free.dev/api/v1';

const STORAGE_KEYS = {
  ACCESS:  'farmasyst:access',
  REFRESH: 'farmasyst:refresh',
  USER:    'farmasyst:user',
};

// ── Client ────────────────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  r => r,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH);
        if (!refresh) throw new Error('no refresh token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS, data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        await clearTokens();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// ── Token helpers ─────────────────────────────────────────────────────────────
export async function saveTokens(access: string, refresh: string) {
  await Promise.all([AsyncStorage.setItem(
    STORAGE_KEYS.ACCESS, access), AsyncStorage.setItem(
    STORAGE_KEYS.REFRESH, refresh)
  ]);
}

export async function clearTokens() {
  await Promise.all([AsyncStorage.removeItem(STORAGE_KEYS.ACCESS), AsyncStorage.removeItem(STORAGE_KEYS.REFRESH), AsyncStorage.removeItem(STORAGE_KEYS.USER)]);
}

export async function saveUser(user: object) {
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export async function loadUser() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  return raw ? JSON.parse(raw) : null;
}

export async function getAccessToken() {
  return AsyncStorage.getItem(STORAGE_KEYS.ACCESS);
}

// ── Auth endpoints ────────────────────────────────────────────────────────────
export const authApi = {
  login:          (email: string, password: string) =>
    api.post('/auth/login/',    { email, password }),
  register:       (data: object) =>
    api.post('/auth/register/', data),
  logout:         (refresh: string) =>
    api.post('/auth/logout/',   { refresh }),
  me:             () => api.get('/auth/me/'),
  updateMe:       (data: object) => api.patch('/auth/me/', data),
  changePassword: (data: object) => api.post('/auth/change-password/', data),
  refresh:        (refresh: string) => api.post('/auth/refresh/', { refresh }),
};

// ── Profiles ──────────────────────────────────────────────────────────────────
export const profileApi = {
  farmerProfile:    ()       => api.get('/profiles/farmer/'),
  updateFarmer:     (d: object) => api.patch('/profiles/farmer/', d),
  investorProfile:  ()       => api.get('/profiles/investor/'),
  updateInvestor:   (d: object) => api.patch('/profiles/investor/', d),
  listFarmers:      (params?: object) => api.get('/profiles/farmers/', { params }),
  getFarmer:        (id: string) => api.get(`/profiles/farmers/${id}/`),
  listInvestors:    () => api.get('/profiles/investors/'),
};

// ── Users (admin) ─────────────────────────────────────────────────────────────
export const usersApi = {
  list:    (params?: object) => api.get('/users/', { params }),
  get:     (id: string)      => api.get(`/users/${id}/`),
  verify:  (id: string)      => api.post(`/users/${id}/verify/`),
  suspend: (id: string)      => api.post(`/users/${id}/suspend/`),
  update:  (id: string, d: object) => api.patch(`/users/${id}/`, d),
};

// ── Farms ─────────────────────────────────────────────────────────────────────
export const farmsApi = {
  list:           (params?: object) => api.get('/farms/', { params }),
  get:            (id: string)      => api.get(`/farms/${id}/`),
  create:         (d: object)       => api.post('/farms/', d),
  update:         (id: string, d: object) => api.patch(`/farms/${id}/`, d),
  assignOfficer:  (id: string, officer_id: string) =>
    api.post(`/farms/${id}/assign_officer/`, { officer_id }),
  requestReport:  (id: string) => api.post(`/farms/${id}/request_report/`),
  activityLogs:   (farmId: string, params?: object) =>
    api.get(`/farms/${farmId}/activity-logs/`, { params }),
  logActivity:    (farmId: string, d: object) =>
    api.post(`/farms/${farmId}/activity-logs/`, d),
  updateLog:      (farmId: string, logId: string, d: object) =>
    api.patch(`/farms/${farmId}/activity-logs/${logId}/`, d),
  auditReports:   (params?: object) => api.get('/farm-audit-reports/', { params }),
  submitAudit:    (d: object)       => api.post('/farm-audit-reports/', d),
};

// ── Credit ────────────────────────────────────────────────────────────────────
export const creditApi = {
  listApplications:  (params?: object)     => api.get('/credit/applications/', { params }),
  getApplication:    (id: string)          => api.get(`/credit/applications/${id}/`),
  createApplication: (d: object)           => api.post('/credit/applications/', d),
  updateApplication: (id: string, d: object) => api.patch(`/credit/applications/${id}/`, d),
  submit:            (id: string)          => api.post(`/credit/applications/${id}/submit/`),
  approve:           (id: string, d: object) => api.post(`/credit/applications/${id}/approve/`, d),
  reject:            (id: string, d: object) => api.post(`/credit/applications/${id}/reject/`, d),
  match:             (id: string, d: object) => api.post(`/credit/applications/${id}/match/`, d),
  accept:            (id: string)          => api.post(`/credit/applications/${id}/accept/`),
  declineMatch:      (id: string)          => api.post(`/credit/applications/${id}/decline_match/`),
  uploadDoc:         (appId: string, form: FormData) =>
    api.post(`/credit/applications/${appId}/documents/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  listAgreements:    (params?: object)     => api.get('/credit/agreements/', { params }),
  getAgreement:      (id: string)          => api.get(`/credit/agreements/${id}/`),
  signAgreement:     (id: string)          => api.post(`/credit/agreements/${id}/sign/`),
  generateDoc:       (id: string)          => api.post(`/credit/agreements/${id}/generate_document/`),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  schedules:          (params?: object) => api.get('/payments/schedules/', { params }),
  initiateRepayment:  (d: object)       => api.post('/payments/initiate-repayment/', d),
  payFullBalance:     (d: object)       => api.post('/payments/pay-full-balance/', d),
  disbursements:      (params?: object) => api.get('/payments/disbursements/', { params }),
  disbursementRequests: (params?: object) => api.get('/payments/disbursement-requests/', { params }),
  createDisbRequest:  (d: object)       => api.post('/payments/disbursement-requests/', d),
  approveDisbRequest: (id: string, d: object) =>
    api.post(`/payments/disbursement-requests/${id}/approve/`, d),
  rejectDisbRequest:  (id: string, d: object) =>
    api.post(`/payments/disbursement-requests/${id}/reject/`, d),
};

// ── Marketplace ───────────────────────────────────────────────────────────────
export const marketApi = {
  listProduce:   (params?: object) => api.get('/marketplace/produce/', { params }),
  getProduce:    (id: string)      => api.get(`/marketplace/produce/${id}/`),
  createListing: (d: object)       => api.post('/marketplace/produce/', d),
  updateListing: (id: string, d: object) => api.patch(`/marketplace/produce/${id}/`, d),
  deleteListing: (id: string)      => api.delete(`/marketplace/produce/${id}/`),
  listOrders:    (params?: object) => api.get('/marketplace/orders/', { params }),
  getOrder:      (id: string)      => api.get(`/marketplace/orders/${id}/`),
  createOrder:   (d: object)       => api.post('/marketplace/orders/', d),
  confirmOrder:  (id: string)      => api.post(`/marketplace/orders/${id}/confirm/`),
  cancelOrder:   (id: string)      => api.post(`/marketplace/orders/${id}/cancel/`),
  reviews:       (produceId: string) => api.get(`/marketplace/produce/${produceId}/reviews/`),
  addReview:     (produceId: string, d: object) =>
    api.post(`/marketplace/produce/${produceId}/reviews/`, d),
};

// ── Training ──────────────────────────────────────────────────────────────────
export const trainingApi = {
  modules:        (params?: object) => api.get('/training/modules/', { params }),
  getModule:      (id: string)      => api.get(`/training/modules/${id}/`),
  createModule:   (d: object)       => api.post('/training/modules/', d),
  updateModule:   (id: string, d: object) => api.patch(`/training/modules/${id}/`, d),
  enrolments:     ()                => api.get('/training/enrolments/'),
  enrol:          (moduleId: string) => api.post('/training/enrolments/', { module: moduleId }),
  updateProgress: (enrolId: string, pct: number) =>
    api.post(`/training/enrolments/${enrolId}/update_progress/`, { progress_pct: pct }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifApi = {
  list:         () => api.get('/notifications/'),
  unreadCount:  () => api.get('/notifications/unread_count/'),
  markRead:     (id: string) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead:  () => api.post('/notifications/mark_all_read/'),
};

// ── Vets ──────────────────────────────────────────────────────────────────────
export const vetApi = {
  profiles:    (params?: object) => api.get('/vet/profiles/', { params }),
  myProfile:   ()                => api.get('/vet/profiles/me/'),
  services:    (params?: object) => api.get('/vet/services/', { params }),
  myServices:  ()                => api.get('/vet/services/my_services/'),
  addService:  (d: object)       => api.post('/vet/services/', d),
  updateService:(id: string, d: object) => api.patch(`/vet/services/${id}/`, d),
  bookings:    (params?: object) => api.get(`/vet/bookings/`, { params }),
  myBookings:  (params?: object) => api.get(`/vet/bookings/my_bookings/`, { params }),
  createBooking:(d: object)      => api.post('/vet/bookings/', d),
  confirmBooking:(id: string)    => api.post(`/vet/bookings/${id}/confirm/`),
  cancelBooking: (id: string)    => api.post(`/vet/bookings/${id}/cancel/`),
};

// ── Inputs ────────────────────────────────────────────────────────────────────
export const inputsApi = {
  listings:     (params?: object) => api.get('/inputs/listings/', { params }),
  myListings:   ()                => api.get('/inputs/listings/my_listings/'),
  createInput:  (d: object)       => api.post('/inputs/listings/', d),
  updateInput:  (id: string, d: object) => api.patch(`/inputs/listings/${id}/`, d),
  deleteInput:  (id: string)      => api.delete(`/inputs/listings/${id}/`),
  dealerProfile:(params?: object) => api.get('/inputs/dealers/', { params }),
  myDealerProfile: ()             => api.get('/inputs/dealers/me/'),
};

export default api;
