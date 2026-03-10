import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

// Job APIs
export const jobAPI = {
  createJob: (data: any) => api.post('/jobs', data),
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