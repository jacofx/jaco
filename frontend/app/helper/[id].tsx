import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppButton,
  EmptyState,
  LoadingState,
  ScreenHeader,
  StatusBadge,
} from '../../components/ui';
import { colors, layout, radius, shadows, spacing, typography } from '../../constants/theme';
import { reviewAPI, userAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/error';
import { useAuthStore } from '../../store/authStore';

type PublicLocation = {
  area?: string;
  city?: string;
  state?: string;
};

type HelperProfile = {
  _id: string;
  name?: string;
  role?: string;
  profile_photo?: string | null;
  skills?: unknown;
  location?: PublicLocation | null;
  rating?: number | null;
  rating_count?: number | null;
  completed_jobs_count?: number | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  identity_verified?: boolean;
  is_verified?: boolean;
};

type HelperReview = {
  _id?: string;
  rating?: number;
  comment?: string | null;
  user_name?: string | null;
  created_at?: string | null;
};

function getStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function getServiceArea(location?: PublicLocation | null) {
  if (!location) return null;

  const parts = [location.area, location.city, location.state]
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());

  return [...new Set(parts)].join(', ') || null;
}

function getReviewDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getReviewRating(value?: number) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return 0;
  return Math.min(5, Math.max(0, Math.round(rating)));
}

export default function HelperProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
  const helperId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isWide = width >= 760;

  const [helper, setHelper] = useState<HelperProfile | null>(null);
  const [reviews, setReviews] = useState<HelperReview[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const loadHelper = useCallback(async () => {
    if (!helperId) {
      setProfileError('This provider profile link is incomplete.');
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setProfileError(null);

    try {
      const response = await userAPI.getUser(helperId);
      const nextHelper = response.data as HelperProfile;

      if (!nextHelper || nextHelper.role !== 'helper') {
        setHelper(null);
        setProfileError('This service provider profile is not available.');
        return;
      }

      setHelper(nextHelper);
    } catch (requestError) {
      setHelper(null);
      setProfileError(
        getApiErrorMessage(requestError, 'Unable to load this provider profile right now.'),
      );
    } finally {
      setProfileLoading(false);
    }
  }, [helperId]);

  const loadReviews = useCallback(async () => {
    if (!helperId) {
      setReviews([]);
      setReviewsLoading(false);
      return;
    }

    setReviewsLoading(true);
    setReviewsError(null);

    try {
      const response = await reviewAPI.getHelperReviews(helperId);
      setReviews(Array.isArray(response.data) ? (response.data as HelperReview[]) : []);
    } catch (requestError) {
      setReviews([]);
      setReviewsError(
        getApiErrorMessage(requestError, 'Reviews are unavailable right now.'),
      );
    } finally {
      setReviewsLoading(false);
    }
  }, [helperId]);

  useEffect(() => {
    void loadHelper();
  }, [loadHelper]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/helpers');
  };

  const skills = useMemo(() => getStringList(helper?.skills), [helper?.skills]);
  const serviceArea = getServiceArea(helper?.location);
  const helperName = helper?.name?.trim() || 'Service provider';
  const completedJobs = Number(helper?.completed_jobs_count);
  const hasCompletedJobs = Number.isFinite(completedJobs) && completedJobs >= 0;
  const averageRating = Number(helper?.rating);
  const hasRating = Number.isFinite(averageRating) && averageRating > 0;
  const reportedRatingCount = Number(helper?.rating_count);
  const reviewCount = Number.isFinite(reportedRatingCount) && reportedRatingCount > 0
    ? reportedRatingCount
    : reviews.length;
  const isOwnProfile = Boolean(helperId && user?._id === helperId);
  const identityVerified = helper?.identity_verified === true || helper?.is_verified === true;
  const hasVerification = identityVerified
    || helper?.email_verified === true
    || helper?.phone_verified === true;

  const primaryAction = useMemo(() => {
    if (!helperId) return null;

    if (isOwnProfile) {
      return {
        label: 'Manage your profile',
        icon: 'create-outline' as const,
        hint: 'Opens your profile settings',
        onPress: () => router.push('/edit-profile'),
      };
    }

    if (user?.role === 'need_help') {
      return {
        label: `Request help from ${helperName.split(' ')[0]}`,
        icon: 'briefcase-outline' as const,
        hint: 'Starts a SolveConnect request for this provider',
        onPress: () => {
          router.push(`/post-problem?provider=${encodeURIComponent(helperId)}` as Href);
        },
      };
    }

    if (user?.role === 'helper') {
      return {
        label: 'Browse open requests',
        icon: 'search-outline' as const,
        hint: 'Opens available customer requests',
        onPress: () => router.push('/(tabs)/requests'),
      };
    }

    return null;
  }, [helperId, helperName, isOwnProfile, router, user?.role]);

  if (profileLoading && !helper) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader bordered compact onBack={goBack} title="Provider profile" />
        <LoadingState fullScreen label="Loading provider profile" />
      </SafeAreaView>
    );
  }

  if (!helper) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader bordered compact onBack={goBack} title="Provider profile" />
        <EmptyState
          actionLabel="Try again"
          description={profileError || 'This provider profile is not available.'}
          icon="cloud-offline-outline"
          onAction={() => void loadHelper()}
          onSecondaryAction={goBack}
          secondaryActionLabel="Go back"
          style={styles.fullState}
          title="Could not open profile"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        bordered
        compact
        onBack={goBack}
        subtitle="Review real work history before starting a request."
        title="Provider profile"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {profileError ? (
            <View accessibilityLiveRegion="polite" style={styles.inlineError}>
              <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
              <Text style={styles.inlineErrorText}>{profileError}</Text>
              <AppButton
                label="Retry"
                onPress={() => void loadHelper()}
                size="small"
                variant="ghost"
              />
            </View>
          ) : null}

          <View style={[styles.profileHero, isWide && styles.profileHeroWide]}>
            {helper.profile_photo ? (
              <Image
                accessibilityLabel={`${helperName}'s profile photo`}
                resizeMode="cover"
                source={{ uri: helper.profile_photo }}
                style={styles.avatar}
              />
            ) : (
              <View
                accessible
                accessibilityLabel={`${helperName} has no profile photo`}
                style={styles.avatarPlaceholder}
              >
                <Ionicons name="person-outline" size={46} color={colors.primary} />
              </View>
            )}

            <View style={styles.profileCopy}>
              <Text accessibilityRole="header" style={styles.name}>
                {helperName}
              </Text>
              <Text style={styles.roleLabel}>Service provider on SolveConnect</Text>

              {hasVerification ? (
                <View style={styles.badges}>
                  {identityVerified ? (
                    <StatusBadge icon="shield-checkmark" label="Identity verified" tone="success" />
                  ) : null}
                  {helper.email_verified === true ? (
                    <StatusBadge icon="mail" label="Email verified" tone="success" />
                  ) : null}
                  {helper.phone_verified === true ? (
                    <StatusBadge icon="call" label="Phone verified" tone="success" />
                  ) : null}
                </View>
              ) : null}

              {serviceArea ? (
                <View accessible accessibilityLabel={`Service area: ${serviceArea}`} style={styles.areaRow}>
                  <Ionicons name="location-outline" size={18} color={colors.muted} />
                  <Text style={styles.areaText}>{serviceArea}</Text>
                </View>
              ) : null}
            </View>

            {primaryAction ? (
              <View style={styles.heroAction}>
                <AppButton
                  accessibilityHint={primaryAction.hint}
                  fullWidth={!isWide}
                  icon={primaryAction.icon}
                  label={primaryAction.label}
                  onPress={primaryAction.onPress}
                />
                {!isOwnProfile ? (
                  <View style={styles.safetyRow}>
                    <Ionicons name="lock-closed-outline" size={15} color={colors.muted} />
                    <Text style={styles.safetyText}>
                      Requests, offers, and messages stay inside SolveConnect.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {(hasRating || hasCompletedJobs) ? (
            <View style={styles.statsRow}>
              {hasRating ? (
                <View
                  accessible
                  accessibilityLabel={`${averageRating.toFixed(1)} out of 5 from ${reviewCount} reviews`}
                  style={styles.stat}
                >
                  <Ionicons name="star" size={22} color={colors.accent} />
                  <Text style={styles.statValue}>{averageRating.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>
                    {reviewCount > 0 ? `${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}` : 'Customer rating'}
                  </Text>
                </View>
              ) : null}
              {hasCompletedJobs ? (
                <View
                  accessible
                  accessibilityLabel={`${completedJobs} completed jobs`}
                  style={styles.stat}
                >
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  <Text style={styles.statValue}>{completedJobs.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Completed jobs</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {skills.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Services and skills</Text>
                <Text style={styles.sectionMeta}>{skills.length} listed</Text>
              </View>
              <View style={styles.skillsContainer}>
                {skills.map((skill) => (
                  <View key={skill} style={styles.skillBadge}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Customer reviews</Text>
              {!reviewsLoading && !reviewsError && reviews.length > 0 ? (
                <Text style={styles.sectionMeta}>{reviews.length} shown</Text>
              ) : null}
            </View>

            {reviewsLoading ? (
              <LoadingState label="Loading customer reviews" style={styles.reviewsState} />
            ) : reviewsError ? (
              <View accessibilityLiveRegion="polite" style={styles.reviewError}>
                <Ionicons name="cloud-offline-outline" size={26} color={colors.danger} />
                <View style={styles.reviewErrorCopy}>
                  <Text style={styles.reviewErrorTitle}>Reviews could not load</Text>
                  <Text style={styles.reviewErrorText}>{reviewsError}</Text>
                </View>
                <AppButton
                  label="Retry"
                  onPress={() => void loadReviews()}
                  size="small"
                  variant="outline"
                />
              </View>
            ) : reviews.length === 0 ? (
              <EmptyState
                compact
                description="Completed customer reviews will appear here."
                icon="chatbox-outline"
                title="No reviews yet"
              />
            ) : (
              <View style={styles.reviewList}>
                {reviews.map((review, index) => {
                  const rating = getReviewRating(review.rating);
                  const reviewDate = getReviewDate(review.created_at);
                  const comment = review.comment?.trim();
                  const author = review.user_name?.trim();

                  return (
                    <View
                      key={review._id || `${review.created_at || 'review'}-${index}`}
                      style={styles.reviewCard}
                    >
                      <View style={styles.reviewHeader}>
                        <View
                          accessible
                          accessibilityLabel={`${rating} out of 5 stars`}
                          style={styles.ratingContainer}
                        >
                          {Array.from({ length: 5 }, (_, starIndex) => (
                            <Ionicons
                              accessibilityElementsHidden
                              importantForAccessibility="no-hide-descendants"
                              key={starIndex}
                              name={starIndex < rating ? 'star' : 'star-outline'}
                              size={17}
                              color={colors.accent}
                            />
                          ))}
                        </View>
                        {reviewDate ? <Text style={styles.reviewDate}>{reviewDate}</Text> : null}
                      </View>
                      {comment ? <Text style={styles.reviewComment}>{comment}</Text> : null}
                      {author ? <Text style={styles.reviewAuthor}>{author}</Text> : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  fullState: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: spacing.page,
  },
  content: {
    gap: spacing.xxl,
    maxWidth: 900,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xxl,
    width: '100%',
  },
  inlineError: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inlineErrorText: {
    ...typography.body,
    color: colors.danger,
    flex: 1,
  },
  profileHero: {
    ...shadows.low,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xxl,
  },
  profileHeroWide: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  avatar: {
    backgroundColor: colors.subtle,
    borderRadius: radius.lg,
    height: 104,
    width: 104,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  profileCopy: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  name: {
    ...typography.h2,
    color: colors.ink,
    textAlign: 'center',
  },
  roleLabel: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  badges: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  areaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  areaText: {
    ...typography.body,
    color: colors.muted,
  },
  heroAction: {
    alignItems: 'stretch',
    gap: spacing.sm,
    justifyContent: 'center',
    maxWidth: 280,
    width: '100%',
  },
  safetyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  safetyText: {
    ...typography.caption,
    color: colors.muted,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stat: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minWidth: 150,
    padding: spacing.lg,
  },
  statValue: {
    ...typography.h3,
    color: colors.ink,
  },
  statLabel: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
  },
  section: {
    gap: spacing.md,
  },
  sectionHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.ink,
    flex: 1,
  },
  sectionMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skillBadge: {
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skillText: {
    ...typography.bodyStrong,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  reviewsState: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  reviewError: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.lg,
  },
  reviewErrorCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 200,
  },
  reviewErrorTitle: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  reviewErrorText: {
    ...typography.body,
    color: colors.danger,
  },
  reviewList: {
    gap: spacing.md,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  reviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  reviewDate: {
    ...typography.caption,
    color: colors.muted,
  },
  reviewComment: {
    ...typography.body,
    color: colors.ink,
  },
  reviewAuthor: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: '700',
  },
});
