import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const SUPPORT_ITEMS = [
  {
    icon: 'person-circle-outline',
    title: 'Profile updates',
    description: 'Use Edit Profile to change your display name and helper skills.',
  },
  {
    icon: 'location-outline',
    title: 'Location issues',
    description: 'Open Location Settings and save your current position again if nearby results look wrong.',
  },
  {
    icon: 'card-outline',
    title: 'Payment history',
    description: 'Use Ad Payments from your profile to review previous promotion purchases.',
  },
];

export default function HelpSupportScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.subtitle}>
          Use the sections below to troubleshoot common account issues inside the app.
        </Text>

        {SUPPORT_ITEMS.map((item) => (
          <View key={item.title} style={styles.card}>
            <Ionicons name={item.icon as any} size={22} color="#111827" />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
          </View>
        ))}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Need more help?</Text>
          <Text style={styles.infoText}>
            If a feature still fails after retrying, restart the app and sign in again to refresh your session.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  infoBox: {
    marginTop: 8,
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
    gap: 6,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9A3412',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#9A3412',
  },
});
