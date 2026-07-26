import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { getApiErrorMessage } from '../../services/error';
import { getJobPromotion, jobAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type HelperView = 'available' | 'my_work';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type Job = {
  _id: string;
  title?: string;
  description?: string;
  budget?: number | string;
  category?: string;
  status?: string;
  distance?: number | null;
  created_at?: string;
  user_name?: string;
  helper_name?: string;
  location?: { address?: string };
  ai_analysis?: {
    category?: string;
    urgency?: string;
  };
  [key: string]: any;
};

const STATUS_COLORS: Record<string, { backgroundColor: string; color: string }> = {
  posted: { backgroundColor: '#E8F1FD', color: '#175EA8' },
  accepted: { backgroundColor: '#FFF1D6', color: '#8A4B08' },
  in_progress: { backgroundColor: '#E8F5EE', color: '#176B45' },
  completed: { backgroundColor: '#EDEFF2', color: '#4B5563' },
};

function formatCategory(value?: string) {
  if (!value) return 'General help';

  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatStatus(value?: string) {
  return formatCategory(value || 'posted');
}

function formatBudget(value?: number | string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₦${amount.toLocaleString()}` : 'Budget not set';
}

function formatPostedDate(value?: string) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

export default function RequestsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isHelper = user?.role === 'helper';
  const [helperView, setHelperView] = useState<HelperView>('available');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCoordinates, setCurrentCoordinates] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const savedLatitude = Number(user?.location?.lat);
  const savedLongitude = Number(user?.location?.lng);
  const hasSavedLocation = Number.isFinite(savedLatitude) && Number.isFinite(savedLongitude);
  const queryLatitude = currentCoordinates?.latitude ?? (hasSavedLocation ? savedLatitude : undefined);
  const queryLongitude = currentCoordinates?.longitude ?? (hasSavedLocation ? savedLongitude : undefined);
  const hasQueryLocation = queryLatitude !== undefined && queryLongitude !== undefined;

  const loadJobs = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);

    try {
      let response;

      if (!isHelper) {
        response = await jobAPI.getMyPostedJobs();
      } else if (helperView === 'my_work') {
        response = await jobAPI.getMyAcceptedJobs();
      } else {
        const params: Record<string, string | number> = { status: 'posted' };
        if (queryLatitude !== undefined && queryLongitude !== undefined) {
          params.lat = queryLatitude;
          params.lng = queryLongitude;
        }
        response = await jobAPI.getJobs(params);
      }

      if (requestId === requestSequence.current) {
        setJobs(Array.isArray(response.data) ? response.data : []);
      }
    } catch (requestError: any) {
      if (requestId === requestSequence.current) {
        setJobs([]);
        setError(getApiErrorMessage(requestError, 'Unable to load requests right now.'));
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [helperView, isHelper, queryLatitude, queryLongitude]);

  useFocusEffect(
    useCallback(() => {
      void loadJobs();

      return () => {
        requestSequence.current += 1;
      };
    }, [loadJobs])
  );

  const selectHelperView = (nextView: HelperView) => {
    if (nextView === helperView) return;

    setJobs([]);
    setError(null);
    setLoading(true);
    setHelperView(nextView);
  };

  const handleUseCurrentLocation = async () => {
    if (!isHelper || locating) return;

    setLocating(true);
    setLocationNotice(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationNotice('Location is off. Open jobs are still shown without distance sorting.');
        return;
      }

      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCurrentCoordinates(result.coords);
    } catch {
      setLocationNotice('We could not update your location. Open jobs are still available below.');
    } finally {
      setLocating(false);
    }
  };

  const renderJob = ({ item }: { item: Job }) => {
    const promotion = getJobPromotion(item);
    const status = item.status || 'posted';
    const statusColors = STATUS_COLORS[status] || STATUS_COLORS.completed;
    const postedDate = formatPostedDate(item.created_at);
    const categoryLabel = item.ai_analysis?.category || formatCategory(item.category);
    const actionLabel = isHelper
      ? helperView === 'available'
        ? 'View details and send quote'
        : 'Open work details'
      : 'View request details';

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${item.title || 'Service request'}, ${formatBudget(item.budget)}`}
        accessibilityHint={actionLabel}
        activeOpacity={0.82}
        style={[
          styles.jobCard,
          promotion?.id === 'boost' && styles.jobCardBoost,
          promotion?.id === 'top' && styles.jobCardTop,
        ]}
        onPress={() => router.push(`/job/${item._id}`)}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.categoryRow}>
            <Ionicons name="briefcase-outline" size={15} color="#4B5563" />
            <Text style={styles.categoryText} numberOfLines={1}>
              {categoryLabel}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusColors.color }]}>
              {formatStatus(status)}
            </Text>
          </View>
        </View>

        {promotion && promotion.id !== 'free' ? (
          <View
            style={[
              styles.promotionBadge,
              promotion.id === 'top' ? styles.promotionBadgeTop : styles.promotionBadgeBoost,
            ]}
          >
            <Ionicons
              name={promotion.id === 'top' ? 'flash' : 'trending-up'}
              size={13}
              color="#6B3B08"
            />
            <Text style={styles.promotionText}>{promotion.label}</Text>
          </View>
        ) : null}

        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.title || 'Untitled request'}
        </Text>
        <Text style={styles.jobDescription} numberOfLines={2}>
          {item.description || 'Open this request to review the full scope.'}
        </Text>

        <View style={styles.factsRow}>
          <View style={styles.budgetBlock}>
            <Text style={styles.factLabel}>Budget</Text>
            <Text style={styles.budget}>{formatBudget(item.budget)}</Text>
          </View>

          <View style={styles.contextFacts}>
            {item.distance !== null && item.distance !== undefined ? (
              <View style={styles.inlineFact}>
                <Ionicons name="navigate-outline" size={14} color="#6B7280" />
                <Text style={styles.inlineFactText}>{item.distance} km away</Text>
              </View>
            ) : item.location?.address ? (
              <View style={styles.inlineFact}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.inlineFactText} numberOfLines={1}>
                  {item.location.address}
                </Text>
              </View>
            ) : null}
            {postedDate ? (
              <View style={styles.inlineFact}>
                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                <Text style={styles.inlineFactText}>{postedDate}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {item.ai_analysis?.urgency ? (
          <View style={styles.analysisRow}>
            <Ionicons name="sparkles-outline" size={14} color="#175EA8" />
            <Text style={styles.analysisText}>{item.ai_analysis.urgency} urgency</Text>
          </View>
        ) : null}

        {isHelper && helperView === 'my_work' && item.user_name ? (
          <View style={styles.personRow}>
            <Ionicons name="person-circle-outline" size={18} color="#4B5563" />
            <Text style={styles.personText}>Customer: {item.user_name}</Text>
          </View>
        ) : null}

        {!isHelper && item.helper_name ? (
          <View style={styles.personRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#176B45" />
            <Text style={styles.personText}>Connected with {item.helper_name}</Text>
          </View>
        ) : null}

        <View style={styles.cardAction}>
          <Text style={styles.cardActionText}>{actionLabel}</Text>
        <Ionicons name="arrow-forward" size={18} color="#0B6B4F" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>{isHelper ? 'Provider workspace' : 'Your activity'}</Text>
          <Text style={styles.title}>{isHelper ? 'Find and manage work' : 'Your requests'}</Text>
          <Text style={styles.subtitle}>
            {isHelper
              ? 'Review open requests, send a clear quote, and keep accepted work within reach.'
              : 'Track offers, conversations, and progress from one place.'}
          </Text>
        </View>

        {!isHelper ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Request help"
            style={styles.newRequestButton}
            onPress={() => router.push('/post-problem')}
          >
            <Ionicons name="add" size={21} color="#fff" />
            <Text style={styles.newRequestButtonText}>New</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isHelper ? (
        <View accessibilityRole="tablist" style={styles.segmentedControl}>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: helperView === 'available' }}
            style={[styles.segment, helperView === 'available' && styles.segmentActive]}
            onPress={() => selectHelperView('available')}
          >
            <Ionicons
              name="search-outline"
              size={17}
              color={helperView === 'available' ? '#fff' : '#4B5563'}
            />
            <Text style={[styles.segmentText, helperView === 'available' && styles.segmentTextActive]}>
              Available
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: helperView === 'my_work' }}
            style={[styles.segment, helperView === 'my_work' && styles.segmentActive]}
            onPress={() => selectHelperView('my_work')}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={17}
              color={helperView === 'my_work' ? '#fff' : '#4B5563'}
            />
            <Text style={[styles.segmentText, helperView === 'my_work' && styles.segmentTextActive]}>
              My work
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isHelper && helperView === 'available' ? (
        <View style={styles.locationPanel}>
          <View style={styles.locationCopy}>
            <View style={styles.locationTitleRow}>
              <Ionicons
                name={hasQueryLocation ? 'location' : 'location-outline'}
                size={18}
                color={hasQueryLocation ? '#0B6B4F' : '#4B5563'}
              />
              <Text style={styles.locationTitle}>
                {currentCoordinates
                  ? 'Sorted from your current location'
                  : hasSavedLocation
                    ? 'Sorted from your saved location'
                    : 'Distance sorting is off'}
              </Text>
            </View>
            <Text style={styles.locationText}>
              Location is optional. You can still browse every open request.
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Use current location for job sorting"
            disabled={locating}
            style={[styles.locationButton, locating && styles.buttonDisabled]}
            onPress={handleUseCurrentLocation}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#0B6B4F" />
            ) : (
              <Ionicons name="locate-outline" size={19} color="#0B6B4F" />
            )}
            <Text style={styles.locationButtonText}>{locating ? 'Locating' : 'Update'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {locationNotice && isHelper && helperView === 'available' ? (
        <View style={styles.noticeRow}>
          <Ionicons name="information-circle-outline" size={17} color="#8A4B08" />
          <Text style={styles.noticeText}>{locationNotice}</Text>
        </View>
      ) : null}

      <View style={styles.listHeadingRow}>
        <Text style={styles.listHeading}>
          {isHelper
            ? helperView === 'available'
              ? 'Open requests'
              : 'Accepted work'
            : 'Request history'}
        </Text>
        {!loading && !error ? (
          <Text style={styles.resultCount}>{jobs.length} shown</Text>
        ) : null}
      </View>
    </View>
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#0B6B4F" />
          <Text style={styles.stateText}>Loading requests...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateContainer}>
          <View style={[styles.stateIcon, styles.errorIcon]}>
            <Ionicons name="cloud-offline-outline" size={30} color="#A33B2B" />
          </View>
          <Text style={styles.stateTitle}>Requests could not load</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={loadJobs}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const title = isHelper
      ? helperView === 'available'
        ? 'No open requests right now'
        : 'No accepted work yet'
      : 'Your first request starts here';
    const message = isHelper
      ? helperView === 'available'
        ? 'Pull to refresh, or check again soon for new work in your area.'
        : 'When a customer accepts your quote, the job will stay available in this workspace.'
      : 'Tell us what you need and trusted providers can send you a quote.';

    return (
      <View style={styles.stateContainer}>
        <View style={styles.stateIcon}>
          <Ionicons
            name={isHelper ? 'briefcase-outline' : 'document-text-outline'}
            size={30}
            color="#0B6B4F"
          />
        </View>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateText}>{message}</Text>
        {!isHelper ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.retryButton}
            onPress={() => router.push('/post-problem')}
          >
            <Ionicons name="add" size={19} color="#fff" />
            <Text style={styles.retryButtonText}>Request help</Text>
          </TouchableOpacity>
        ) : helperView === 'my_work' ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.secondaryStateButton}
            onPress={() => selectHelperView('available')}
          >
            <Text style={styles.secondaryStateButtonText}>Browse open requests</Text>
            <Ionicons name="arrow-forward" size={18} color="#0B6B4F" />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentFrame}>
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          renderItem={renderJob}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[styles.listContent, jobs.length === 0 && styles.emptyListContent]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading && jobs.length > 0}
              onRefresh={loadJobs}
              tintColor="#0B6B4F"
              colors={['#0B6B4F']}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F6',
  },
  contentFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  headerContent: {
    paddingTop: 12,
    paddingBottom: 6,
    gap: 16,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  headingCopy: {
    flex: 1,
    gap: 5,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#0B6B4F',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    color: '#10231C',
  },
  subtitle: {
    maxWidth: 580,
    fontSize: 14,
    lineHeight: 21,
    color: '#5D6B64',
  },
  newRequestButton: {
    minWidth: 76,
    minHeight: 46,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#0B6B4F',
  },
  newRequestButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  segmentedControl: {
    height: 48,
    padding: 4,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#E7EBF0',
  },
  segment: {
    flex: 1,
    minWidth: 0,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  segmentActive: {
    backgroundColor: '#10231C',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  segmentTextActive: {
    color: '#fff',
  },
  locationPanel: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: '#D7E2DC',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
  },
  locationCopy: {
    flex: 1,
    gap: 4,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  locationTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#263B33',
  },
  locationText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7280',
  },
  locationButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#B7CEC4',
    borderRadius: 8,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#EDF4F0',
  },
  locationButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B6B4F',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  noticeRow: {
    borderRadius: 8,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF7E7',
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#7A4A14',
  },
  listHeadingRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  listHeading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: '#10231C',
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  jobCard: {
    borderWidth: 1,
    borderColor: '#D7E2DC',
    borderRadius: 8,
    padding: 16,
    gap: 11,
    backgroundColor: '#fff',
    shadowColor: '#10231C',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  jobCardBoost: {
    borderColor: '#E7C970',
    backgroundColor: '#FFFCF3',
  },
  jobCardTop: {
    borderColor: '#E4A86A',
    backgroundColor: '#FFF9F3',
  },
  cardTopRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  statusBadge: {
    minHeight: 26,
    borderRadius: 6,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  promotionBadge: {
    alignSelf: 'flex-start',
    minHeight: 26,
    borderRadius: 6,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  promotionBadgeBoost: {
    backgroundColor: '#FFF0B8',
  },
  promotionBadgeTop: {
    backgroundColor: '#FFE0BE',
  },
  promotionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B3B08',
  },
  jobTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: '#10231C',
  },
  jobDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#5D6B64',
  },
  factsRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
  },
  budgetBlock: {
    gap: 2,
  },
  factLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A8490',
    textTransform: 'uppercase',
  },
  budget: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    color: '#10231C',
  },
  contextFacts: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 4,
  },
  inlineFact: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineFactText: {
    flexShrink: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  analysisRow: {
    alignSelf: 'flex-start',
    minHeight: 28,
    borderRadius: 6,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDF6FF',
  },
  analysisText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#175EA8',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  personText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  cardAction: {
    minHeight: 38,
    marginTop: 1,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#D7E2DC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardActionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#0B6B4F',
  },
  stateContainer: {
    flex: 1,
    minHeight: 300,
    paddingHorizontal: 24,
    paddingVertical: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF4F0',
  },
  errorIcon: {
    backgroundColor: '#FCEDEA',
  },
  stateTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    color: '#10231C',
    textAlign: 'center',
  },
  stateText: {
    maxWidth: 420,
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: '#64746C',
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 46,
    marginTop: 18,
    borderRadius: 8,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#0B6B4F',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  secondaryStateButton: {
    minHeight: 46,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#B7CEC4',
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  secondaryStateButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B6B4F',
  },
});
