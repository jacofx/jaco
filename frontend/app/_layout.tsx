import { Stack } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SocketProvider } from '../contexts/SocketContext';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const { loadAuth, isLoading, isAuthenticated } = useAuthStore();

  const initializeAuth = useCallback(() => {
    loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingBrand}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.loadingLogo}
            resizeMode="cover"
            accessibilityLabel="SolveConnect"
          />
          <Text style={styles.loadingTitle}>SolveConnect</Text>
        </View>
        <ActivityIndicator size="small" color="#0B6B4F" />
        <Text style={styles.loadingText}>Preparing your workspace...</Text>
      </View>
    );
  }

  return (
    <SocketProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: '#F6F9F7' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/register" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
          <Stack.Screen name="location-settings" options={{ title: 'Location Settings' }} />
          <Stack.Screen name="help-support" options={{ title: 'Help & Support' }} />
          <Stack.Screen name="post-problem" options={{ presentation: 'modal', title: 'Post a Problem' }} />
          <Stack.Screen name="payments" options={{ title: 'Ad Payments' }} />
          <Stack.Screen name="ads-payment" options={{ title: 'Promotion Payment' }} />
          <Stack.Screen name="job/[id]" options={{ title: 'Job Details' }} />
          <Stack.Screen name="chat/[jobId]" options={{ title: 'Chat' }} />
          <Stack.Screen name="helper/[id]" options={{ title: 'Helper Profile' }} />
        </Stack.Protected>
      </Stack>
    </SocketProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F6F9F7',
  },
  loadingBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  loadingLogo: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#102A23',
  },
  loadingText: {
    fontSize: 13,
    color: '#5F7069',
  },
});
