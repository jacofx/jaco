import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { AppButton, EmptyState, ScreenHeader, StatusBadge } from '../components/ui';
import { colors, layout, radius, spacing, typography } from '../constants/theme';
import { userAPI } from '../services/api';
import { getApiErrorMessage } from '../services/error';
import { useAuthStore } from '../store/authStore';

function buildAddressFromGeocode(result?: Location.LocationGeocodedAddress | null) {
  if (!result) return '';

  return [result.name, result.street, result.city, result.region, result.country]
    .filter(Boolean)
    .join(', ');
}

export default function LocationSettingsScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const location = user?.location;
  const latitude = Number(location?.lat);
  const longitude = Number(location?.lng);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const busy = isFetching || isSaving;
  const locationButtonLabel = isSaving
    ? 'Saving location'
    : isFetching
      ? 'Finding location'
      : location
        ? 'Update current location'
        : 'Use current location';

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/profile');
  };

  const handleUseCurrentLocation = async () => {
    setError(null);
    setIsFetching(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is off. Allow access in your device settings, then try again.');
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

      setIsFetching(false);
      setIsSaving(true);
      const response = await userAPI.updateUser({ location: payload });
      setUser(response.data);
      Alert.alert('Location updated', 'Nearby results will now use this saved location.', [
        { text: 'Done', onPress: goBack },
      ]);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError, 'Unable to update your location right now.'));
    } finally {
      setIsFetching(false);
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.frame}>
        <ScreenHeader
          title="Location settings"
          subtitle="Use a saved location to improve nearby provider and work results."
          eyebrow="Matching preferences"
          onBack={goBack}
          bordered
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {error ? (
            <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.locationCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={styles.locationIcon}>
                  <Ionicons name="location" size={21} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Saved location</Text>
              </View>
              {location ? <StatusBadge label="Saved" tone="success" /> : null}
            </View>

            {location ? (
              <View style={styles.locationDetails}>
                <Text style={styles.locationAddress}>
                  {location.address || 'Saved location'}
                </Text>
                {hasCoordinates ? (
                  <Text style={styles.locationMeta}>
                    {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </Text>
                ) : null}
              </View>
            ) : (
              <EmptyState
                compact
                description="Use your current position to make distance sorting more useful."
                icon="navigate-outline"
                title="No location saved"
              />
            )}
          </View>

          <AppButton
            accessibilityHint="Requests location permission and saves your current position"
            fullWidth
            icon="locate-outline"
            label={locationButtonLabel}
            loading={busy}
            onPress={handleUseCurrentLocation}
            size="large"
          />

          <View style={styles.privacyNote}>
            <Ionicons name="shield-checkmark-outline" size={21} color={colors.primary} />
            <View style={styles.privacyCopy}>
              <Text style={styles.privacyTitle}>Used for local matching</Text>
              <Text style={styles.privacyText}>
                SolveConnect uses this location to calculate nearby results. You choose when to update it.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  frame: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: layout.readingMaxWidth,
    width: '100%',
  },
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: spacing.page,
  },
  errorBanner: {
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    flex: 1,
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  locationIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardTitle: {
    ...typography.title,
    color: colors.ink,
  },
  locationDetails: {
    gap: spacing.xs,
  },
  locationAddress: {
    ...typography.bodyLarge,
    color: colors.ink,
    fontWeight: '700',
  },
  locationMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  privacyNote: {
    alignItems: 'flex-start',
    backgroundColor: colors.subtle,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  privacyCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  privacyTitle: {
    ...typography.bodyStrong,
    color: colors.ink,
  },
  privacyText: {
    ...typography.body,
    color: colors.muted,
  },
});
