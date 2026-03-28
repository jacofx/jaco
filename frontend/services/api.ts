import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from './config';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// User APIs
export const userAPI = {
  getUser: (userId: string) => api.get(`/users/${userId}`),
  updateUser: (data: any) => api.put('/users/me', data),
};

export const adsAPI = {
  getPackages: () => api.get('/ads/packages'),
  checkout: (packageId: string) => api.post('/ads/checkout', { package_id: packageId }),
  verify: (paymentId: string, sessionId: string) =>
    api.post('/ads/verify', { payment_id: paymentId, session_id: sessionId }),
  getPurchases: () => api.get('/ads/purchases'),
};

export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  updateNotification: (notificationId: string, read = true) =>
    api.put(`/notifications/${notificationId}`, { read }),
};

const PROMOTION_FIELD_KEYS = [
  'ad_package',
  'promotion',
  'promotion_days',
  'priority_level',
  'is_featured',
  'is_urgent',
  'payment_id',
] as const;

const PROMOTION_CONFIG = {
  free: {
    id: 'free',
    label: 'Free listing',
    price: 'Free',
    durationDays: 0,
    priorityLevel: 0,
    featured: false,
    urgent: false,
  },
  boost: {
    id: 'boost',
    label: 'Boosted ad',
    price: 'NGN 2,500',
    durationDays: 7,
    priorityLevel: 1,
    featured: false,
    urgent: false,
  },
  top: {
    id: 'top',
    label: 'Top ad',
    price: 'NGN 6,000',
    durationDays: 14,
    priorityLevel: 2,
    featured: true,
    urgent: true,
  },
} as const;

function stripPromotionFields(data: any) {
  const nextPayload = { ...data };

  for (const key of PROMOTION_FIELD_KEYS) {
    delete nextPayload[key];
  }

  return nextPayload;
}

export function getJobPromotion(job: any) {
  if (job?.promotion_expires_at) {
    const expiresAt = new Date(job.promotion_expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
      return PROMOTION_CONFIG.free;
    }
  }

  const rawPromotion =
    job?.promotion ||
    job?.ad_package ||
    job?.adPackage ||
    job?.subscription_plan ||
    job?.subscriptionPlan ||
    job?.plan;

  if (!rawPromotion && !job?.is_featured && !job?.is_urgent && !job?.priority_level) {
    return null;
  }

  const rawId = typeof rawPromotion === 'string'
    ? rawPromotion
    : rawPromotion?.id || rawPromotion?.package || rawPromotion?.name;

  if (rawId && rawId in PROMOTION_CONFIG) {
    return PROMOTION_CONFIG[rawId as keyof typeof PROMOTION_CONFIG];
  }

  if (job?.is_featured || job?.is_urgent || job?.priority_level >= 2) {
    return PROMOTION_CONFIG.top;
  }

  if (job?.priority_level >= 1) {
    return PROMOTION_CONFIG.boost;
  }

  return PROMOTION_CONFIG.free;
}

// Job APIs
export const jobAPI = {
  createJob: async (data: any) => {
    try {
      return await api.post('/jobs', data);
    } catch (error: any) {
      const hasPromotionFields = PROMOTION_FIELD_KEYS.some((key) => key in (data || {}));

      if (
        hasPromotionFields &&
        axios.isAxiosError(error) &&
        error.response &&
        [400, 422].includes(error.response.status)
      ) {
        return api.post('/jobs', stripPromotionFields(data));
      }

      throw error;
    }
  },
  getJobs: (params?: any) => api.get('/jobs', { params }),
  getJob: (jobId: string) => api.get(`/jobs/${jobId}`),
  getMyPostedJobs: () => api.get('/jobs/my/posted'),
  getMyAcceptedJobs: () => api.get('/jobs/my/accepted'),
  acceptJob: (jobId: string) => api.put(`/jobs/${jobId}/accept`),
  updateJobStatus: (jobId: string, status: string) => api.put(`/jobs/${jobId}/status`, { status }),
};

// Helper APIs
export const helperAPI = {
  getHelpers: (params?: any) => api.get('/helpers', { params }),
};

// Message APIs
export const messageAPI = {
  getJobMessages: (jobId: string) => api.get(`/messages/jobs/${jobId}`),
  sendMessage: (data: any) => api.post('/messages', data),
  getConversations: () => api.get('/messages/conversations'),
};

// Review APIs
export const reviewAPI = {
  createReview: (data: any) => api.post('/reviews', data),
  getHelperReviews: (helperId: string) => api.get(`/reviews/helper/${helperId}`),
};

export default api;
