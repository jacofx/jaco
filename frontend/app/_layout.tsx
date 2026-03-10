import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { SocketProvider } from '../contexts/SocketContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  const { loadAuth, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    loadAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SocketProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/register" />
          </>
        ) : (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="post-problem" options={{ presentation: 'modal', title: 'Post a Problem' }} />
            <Stack.Screen name="job/[id]" options={{ title: 'Job Details' }} />
            <Stack.Screen name="chat/[jobId]" options={{ title: 'Chat' }} />
            <Stack.Screen name="helper/[id]" options={{ title: 'Helper Profile' }} />
          </>
        )}
      </Stack>
    </SocketProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});