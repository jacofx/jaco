const DEFAULT_BACKEND_URL = 'https://help-nearby-8.preview.emergentagent.com';

function normalizeBaseUrl(url?: string | null) {
  if (!url) {
    return DEFAULT_BACKEND_URL;
  }

  return url.replace(/\/+$/, '');
}

export const BACKEND_URL = normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
