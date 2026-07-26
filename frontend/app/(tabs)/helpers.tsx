import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { SERVICE_CATEGORIES, colors, layout, radius, spacing, typography } from '../../constants';
import { AppButton, EmptyState, LoadingState, ScreenHeader, StatusBadge } from '../../components/ui';
import { helperAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/error';

type Coordinates = { latitude: number; longitude: number };

type Helper = {
  _id: string;
  name?: string;
  profile_photo?: string;
  skills?: string[];
  rating?: number;
  completed_jobs_count?: number;
  distance?: number;
  is_verified?: boolean;
  verification_status?: string;
};

export default function HelpersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(params.category || '');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    setSelectedCategory(params.category || '');
  }, [params.category]);

  const loadHelpers = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);

    try {
      const query: Record<string, string | number> = {};
      if (selectedCategory) query.category = selectedCategory;
      if (coordinates) {
        query.lat = coordinates.latitude;
        query.lng = coordinates.longitude;
      }

      const response = await helperAPI.getHelpers(query);
      if (requestId === requestSequence.current) {
        setHelpers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setHelpers([]);
        setError(getApiErrorMessage(requestError, 'Unable to load providers right now.'));
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [coordinates, selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      void loadHelpers();
      return () => {
        requestSequence.current += 1;
      };
    }, [loadHelpers]),
  );

  const filteredHelpers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return helpers;

    return helpers.filter((helper) => {
      const searchable = [helper.name || '', ...(helper.skills || [])].join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [helpers, searchQuery]);

  const handleUseLocation = async () => {
    if (locating) return;
    setLocating(true);
    setLocationNotice(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationNotice('Location is off. You can still browse every available provider.');
        return;
      }

      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates(result.coords);
      setLocationNotice('Results can now include distance from your current location.');
    } catch {
      setLocationNotice('We could not update your location. Provider search still works without it.');
    } finally {
      setLocating(false);
    }
  };

  const renderHelper = ({ item }: { item: Helper }) => {
    const rating = Number(item.rating || 0);
    const completedJobs = Number(item.completed_jobs_count || 0);
    const verified = item.is_verified || item.verification_status === 'verified';

    return (
      <TouchableOpacity
        style={styles.providerCard}
        onPress={() => router.push(`/helper/${item._id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name || 'Service provider'} profile`}
        accessibilityHint="Review skills, work history, and reviews"
        activeOpacity={0.8}
      >
        <View style={styles.avatarWrap}>
          {item.profile_photo ? (
            <Image
              source={{ uri: item.profile_photo }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="disk"
              accessibilityLabel={`${item.name || 'Provider'} profile photo`}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{(item.name || 'S').charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={styles.providerInfo}>
          <View style={styles.providerNameRow}>
            <Text style={styles.providerName} numberOfLines={1}>{item.name || 'Service provider'}</Text>
            {verified ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} accessibilityLabel="Verified profile" /> : null}
          </View>

          <View style={styles.providerFacts}>
            {rating > 0 ? (
              <View style={styles.inlineFact}>
                <Ionicons name="star" size={15} color={colors.accent} />
                <Text style={styles.factStrong}>{rating.toFixed(1)}</Text>
              </View>
            ) : (
              <StatusBadge label="New provider" compact />
            )}
            {completedJobs > 0 ? <Text style={styles.factText}>{completedJobs} completed {completedJobs === 1 ? 'job' : 'jobs'}</Text> : null}
            {item.distance !== undefined ? (
              <View style={styles.inlineFact}>
                <Ionicons name="navigate-outline" size={14} color={colors.muted} />
                <Text style={styles.factText}>{item.distance} km</Text>
              </View>
            ) : null}
          </View>

          {item.skills?.length ? (
            <View style={styles.skillsRow}>
              {item.skills.slice(0, 3).map((skill) => (
                <View key={skill} style={styles.skillBadge}>
                  <Text style={styles.skillText}>{formatLabel(skill)}</Text>
                </View>
              ))}
              {item.skills.length > 3 ? <Text style={styles.moreSkills}>+{item.skills.length - 3}</Text> : null}
            </View>
          ) : (
            <Text style={styles.noSkillsText}>Open profile to review service details</Text>
          )}

          <View style={styles.cardActionRow}>
            <Text style={styles.cardActionText}>View profile</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View style={styles.headerContent}>
      <ScreenHeader
        eyebrow="Service marketplace"
        title="Find the right provider"
        subtitle="Search by skill, review real profile details, and connect through a SolveConnect request."
        style={styles.screenHeader}
      />

      <View style={styles.searchShell}>
        <Ionicons name="search-outline" size={20} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or skill"
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search providers by name or skill"
          selectionColor={colors.primary}
        />
        {searchQuery ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear provider search"
          >
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View>
        <Text style={styles.filterLabel}>Filter by service</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroller}
          accessibilityRole="tablist"
        >
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory('')}
            accessibilityRole="tab"
            accessibilityState={{ selected: !selectedCategory }}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>All services</Text>
          </TouchableOpacity>
          {SERVICE_CATEGORIES.map((category) => {
            const selected = category.id === selectedCategory;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryChip, selected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(category.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={16} color={selected ? colors.inverse : colors.muted} />
                <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>{category.shortLabel}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.locationPanel}>
        <View style={styles.locationCopy}>
          <View style={styles.locationTitleRow}>
            <Ionicons name={coordinates ? 'location' : 'location-outline'} size={18} color={coordinates ? colors.primary : colors.muted} />
            <Text style={styles.locationTitle}>{coordinates ? 'Using your current location' : 'Want nearby results?'}</Text>
          </View>
          <Text style={styles.locationText}>Location is optional and only used to calculate distance.</Text>
        </View>
        <AppButton
          label={coordinates ? 'Refresh' : 'Use location'}
          variant="outline"
          size="small"
          icon="locate-outline"
          loading={locating}
          onPress={handleUseLocation}
        />
      </View>
      {locationNotice ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={17} color={colors.info} />
          <Text style={styles.noticeText}>{locationNotice}</Text>
        </View>
      ) : null}

      {!loading && !error ? (
        <View style={styles.resultsRow}>
          <Text style={styles.resultsTitle}>{selectedCategory ? `${formatLabel(selectedCategory)} providers` : 'Available providers'}</Text>
          <Text style={styles.resultsCount}>{filteredHelpers.length} shown</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentFrame}>
        <FlatList
          data={filteredHelpers}
          renderItem={renderHelper}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            loading ? (
              <LoadingState label="Finding providers..." />
            ) : error ? (
              <EmptyState
                icon="cloud-offline-outline"
                title="Providers could not load"
                description={error}
                actionLabel="Try again"
                onAction={loadHelpers}
              />
            ) : (
              <EmptyState
                icon="people-outline"
                title={searchQuery ? 'No matching providers' : 'No providers in this category yet'}
                description={searchQuery ? 'Try another name, skill, or service category.' : 'Choose another service or check again as the network grows.'}
                actionLabel="Show all services"
                onAction={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                }}
              />
            )
          }
          contentContainerStyle={[styles.listContent, filteredHelpers.length === 0 && styles.emptyListContent]}
          refreshControl={<RefreshControl refreshing={loading && helpers.length > 0} onRefresh={loadHelpers} tintColor={colors.primary} colors={[colors.primary]} />}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

function formatLabel(value: string) {
  return value.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  contentFrame: { flex: 1, width: '100%', maxWidth: 820, alignSelf: 'center' },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.section, gap: spacing.md },
  emptyListContent: { flexGrow: 1 },
  headerContent: { gap: spacing.lg, paddingBottom: spacing.sm },
  screenHeader: { paddingHorizontal: 0, paddingTop: spacing.md, paddingBottom: 0 },
  searchShell: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  searchInput: { ...typography.bodyLarge, flex: 1, minWidth: 0, color: colors.ink, paddingVertical: spacing.sm },
  clearButton: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.sm },
  filterLabel: { ...typography.label, color: colors.ink, marginBottom: spacing.sm },
  categoryScroller: { gap: spacing.sm, paddingRight: spacing.lg },
  categoryChip: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  categoryChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  categoryChipText: { ...typography.label, color: colors.muted },
  categoryChipTextActive: { color: colors.inverse },
  locationPanel: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  locationCopy: { flex: 1, gap: spacing.xs },
  locationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  locationTitle: { ...typography.label, flex: 1, color: colors.ink },
  locationText: { ...typography.caption, color: colors.muted },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.infoSoft },
  noticeText: { ...typography.caption, flex: 1, color: colors.info },
  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingTop: spacing.xs },
  resultsTitle: { ...typography.title, color: colors.ink },
  resultsCount: { ...typography.caption, color: colors.muted },
  providerCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  avatarWrap: { paddingTop: spacing.xs },
  avatar: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.subtle },
  avatarFallback: { width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  avatarInitial: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: colors.primaryDark },
  providerInfo: { flex: 1, minWidth: 0 },
  providerNameRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  providerName: { ...typography.title, flex: 1, color: colors.ink },
  providerFacts: { minHeight: 28, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  inlineFact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  factStrong: { ...typography.label, color: colors.ink },
  factText: { ...typography.caption, color: colors.muted },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  skillBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md, backgroundColor: colors.subtle },
  skillText: { ...typography.caption, color: colors.ink },
  moreSkills: { ...typography.caption, color: colors.muted, paddingHorizontal: spacing.xs },
  noSkillsText: { ...typography.caption, color: colors.muted, marginTop: spacing.sm },
  cardActionRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  cardActionText: { ...typography.label, color: colors.primary },
});
