import { BACKEND_URL } from './config';

export function getApiErrorMessage(error: any, fallback: string) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const firstIssue = detail[0];
    if (typeof firstIssue === 'string' && firstIssue.trim()) {
      return firstIssue;
    }

    if (firstIssue?.msg) {
      return firstIssue.msg;
    }
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  if (!error?.response) {
    return `Unable to reach backend at ${BACKEND_URL}. Set EXPO_PUBLIC_BACKEND_URL if your API is running elsewhere.`;
  }

  return fallback;
}
