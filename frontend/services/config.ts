import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_BACKEND_PORT = '8000';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function getExpoHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    null;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(':')[0] || null;
}

function getDefaultBackendUrl() {
  const expoHost = getExpoHost();

  if (expoHost) {
    return `http://${expoHost}:${DEFAULT_BACKEND_PORT}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_BACKEND_PORT}`;
  }

  return `http://localhost:${DEFAULT_BACKEND_PORT}`;
}

function resolveNativeLoopbackUrl(url: string) {
  if (Platform.OS === 'web') {
    return url;
  }

  try {
    const parsedUrl = new URL(url);

    if (!LOOPBACK_HOSTS.has(parsedUrl.hostname)) {
      return url;
    }

    const expoHost = getExpoHost();
    if (expoHost) {
      parsedUrl.hostname = expoHost;
      return parsedUrl.toString();
    }

    if (Platform.OS === 'android') {
      parsedUrl.hostname = '10.0.2.2';
      return parsedUrl.toString();
    }
  } catch {
    return url;
  }

  return url;
}

function normalizeBaseUrl(url?: string | null) {
  if (!url) {
    return getDefaultBackendUrl();
  }

  return resolveNativeLoopbackUrl(url.replace(/\/+$/, ''));
}

export const BACKEND_URL = normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
