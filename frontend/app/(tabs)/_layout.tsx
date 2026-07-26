import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';

const ACTIVE = '#0B6B4F';
const INACTIVE = '#64746C';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
  const isDesktop = Platform.OS === 'web' && width >= 900;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarHideOnKeyboard: true,
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarLabelPosition: isDesktop ? 'beside-icon' : 'below-icon',
        tabBarStyle: isDesktop
          ? {
              width: 220,
              paddingTop: 24,
              paddingHorizontal: 12,
              backgroundColor: '#FFFFFF',
              borderRightWidth: 1,
              borderRightColor: '#D7E2DC',
            }
          : {
              height: 68,
              paddingTop: 7,
              paddingBottom: 8,
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#D7E2DC',
            },
        tabBarItemStyle: isDesktop
          ? {
              minHeight: 52,
              maxHeight: 52,
              borderRadius: 8,
              marginBottom: 4,
              justifyContent: 'flex-start',
            }
          : { minHeight: 52 },
        tabBarLabelStyle: {
          fontSize: isDesktop ? 14 : 11,
          fontWeight: '600',
          marginLeft: isDesktop ? 10 : 0,
        },
        tabBarActiveBackgroundColor: isDesktop ? '#EDF4F0' : '#FFFFFF',
        sceneStyle: { backgroundColor: '#F5F8F6' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: user?.role === 'helper' ? 'Work' : 'Requests',
          tabBarAccessibilityLabel: user?.role === 'helper' ? 'Available work and my jobs' : 'My requests',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="helpers"
        options={{
          title: 'Find',
          tabBarAccessibilityLabel: 'Find service providers',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarAccessibilityLabel: 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile and settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="community" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
