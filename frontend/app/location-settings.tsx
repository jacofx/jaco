import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { userAPI } from '../services/api';
import { getApiErrorMessage } from '../services/error';

function buildAddressFromGeocode(result?: Location.LocationGeocodedAddress | null) {
  if (!result) {
    return '';
  }

  return [
    result.name,
    result.street,
    result.city,
    result.region,
    result.country,
  ]
    .filter(Boolean)
    .join(', ');
}

export default function LocationSettingsScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const location = user?.location;

  const handleUseCurrentLocation = async () => {
    setIsFetching(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to save your current location.');
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const geocode = await Location.reverseGeocodeAsync({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      });

      const payload = {
        lat: currentPosition.coords.latitude,
        lng: currentPosition.coords.longitude,
        address: buildAddressFromGeocode(geocode[0]) || 'Current location',
      };

      setIsSaving(true);
      const response = await userAPI.updateUser({ location: payload });
      setUser(response.data);
      Alert.alert('Location Updated', 'Your saved location has been updated.');
      router.back();
    } catch (error: any) {
      Alert.alert('Update Failed', getApiErrorMessage(error, 'Unable to update location.'));
    } finally {
      setIsFetching(false);
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Location Settings</Text>
        <Text style={styles.subtitle}>
          Save your current location so nearby jobs and helpers are more accurate.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={20} color="#111827" />
            <Text style={styles.cardTitle}>Saved Location</Text>
          </View>

          {location ? (
            <>
              <Text style={styles.locationAddress}>{location.address}</Text>
              <Text style={styles.locationMeta}>
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </Text>
            </>
          ) : (
            <Text style={styles.emptyText}>No location saved yet.</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleUseCurrentLocation}
          disabled={isFetching || isSaving}
        >
          {isFetching || isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Use Current Location</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          The app uses your saved location to improve nearby helper discovery and job matching.
        </Text>
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
    gap: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  locationAddress: {
    fontSize: 16,
    color: '#111827',
  },
  locationMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6B7280',
  },
});
