export const googleClientIds = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
};

export function getGoogleIdToken(response: any) {
  return response?.authentication?.idToken || response?.params?.id_token || response?.idToken;
}

export function getGoogleAccessToken(response: any) {
  return response?.authentication?.accessToken || response?.params?.access_token || response?.accessToken;
}

export function hasGoogleClientId() {
  return Boolean(
    googleClientIds.webClientId ||
    googleClientIds.iosClientId ||
    googleClientIds.androidClientId
  );
}
