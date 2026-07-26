import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  profile_photo?: string;
  location?: any;
  skills?: string[];
  rating?: number;
  completed_jobs_count?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

function persistUser(user: User | null) {
  const operation = user
    ? AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user))
    : AsyncStorage.removeItem(USER_DATA_KEY);

  void operation.catch((error) => {
    console.error('Error saving user data:', error);
  });
}

async function clearStoredAuth() {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    persistUser(user);
  },
  
  setToken: (token) => set({ token }),

  login: async (token, user) => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: async () => {
    await clearStoredAuth();
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  loadAuth: async () => {
    try {
      const [[, token], [, userData]] = await AsyncStorage.multiGet([
        AUTH_TOKEN_KEY,
        USER_DATA_KEY,
      ]);

      if (!token) {
        if (userData) {
          await AsyncStorage.removeItem(USER_DATA_KEY);
        }
        set({ token: null, user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      let cachedUser: User | null = null;
      if (userData) {
        try {
          cachedUser = JSON.parse(userData) as User;
        } catch {
          await AsyncStorage.removeItem(USER_DATA_KEY);
        }
      }

      if (cachedUser) {
        set({ token, user: cachedUser, isAuthenticated: true, isLoading: false });
      }

      try {
        // Lazy loading keeps the store independent from the API module at startup.
        const { authAPI } = await import('../services/api');
        const response = await authAPI.getMe();
        const freshUser = response.data as User;

        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(freshUser));
        set({
          token,
          user: freshUser,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error: any) {
        if (error?.response?.status === 401) {
          await clearStoredAuth();
          set({ token: null, user: null, isAuthenticated: false, isLoading: false });
          return;
        }

        // A network or server failure should not sign out a user with a valid cache.
        set({
          token: cachedUser ? token : null,
          user: cachedUser,
          isAuthenticated: !!cachedUser,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
