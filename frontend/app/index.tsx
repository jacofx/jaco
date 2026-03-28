import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function IndexScreen() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/register" />;
}
