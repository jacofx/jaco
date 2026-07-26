import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppButton, BrandMark, EmptyState, LoadingState, StatusBadge } from '../../components/ui';
import { SERVICE_CATEGORIES, colors, layout, radius, shadows, spacing, typography } from '../../constants';
import { getJobPromotion, jobAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/error';
import { useAuthStore } from '../../store/authStore';

type Job = {
  _id: string;
  title?: string;
  description?: string;
  budget?: number | string;
  category?: string;
  status?: string;
  distance?: number;
  created_at?: string;
  [key: string]: any;
};

const FEATURED_CATEGORIES = SERVICE_CATEGORIES.slice(0, 8);

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isHelper = user?.role === 'helper';
  const isWide = width >= 760;
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = isHelper
        ? await jobAPI.getJobs({ status: 'posted' })
        : await jobAPI.getMyPostedJobs();
      const data = Array.isArray(response.data) ? response.data : [];
      setJobs(data.slice(0, 4));
    } catch (loadError) {
      setJobs([]);
      setError(getApiErrorMessage(loadError, 'We could not update your activity right now.'));
    } finally {
      setLoading(false);
    }
  }, [isHelper]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading && jobs.length > 0} onRefresh={loadDashboard} tintColor={colors.primary} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageFrame}>
          <View style={styles.topBar}>
            <BrandMark size="small" />
            <View style={styles.topActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push('/(tabs)/notifications')}
                accessibilityRole="button"
                accessibilityLabel="Open notifications"
              >
                <Ionicons name="notifications-outline" size={22} color={colors.ink} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => router.push('/(tabs)/profile')}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
              >
                <Text style={styles.profileInitial}>{firstName.charAt(0).toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.greetingBlock}>
            <Text style={styles.eyebrow}>{isHelper ? 'PROVIDER WORKSPACE' : 'WELCOME BACK'}</Text>
            <Text style={styles.greeting} accessibilityRole="header">Good to see you, {firstName}</Text>
            <Text style={styles.greetingText}>
              {isHelper
                ? 'Review new requests, respond with a clear offer, and keep your accepted work organized.'
                : 'Start a request, compare responses, or find a provider for what needs to get done.'}
            </Text>
          </View>

          <View style={[styles.actionHero, isWide && styles.actionHeroWide]}>
            <View style={styles.actionHeroCopy}>
              <View style={styles.heroIcon}>
                <Ionicons name={isHelper ? 'briefcase-outline' : 'sparkles-outline'} size={24} color={colors.ink} />
              </View>
              <Text style={styles.actionHeroTitle}>
                {isHelper ? 'Find work that matches what you do' : 'What can SolveConnect help you move forward today?'}
              </Text>
              <Text style={styles.actionHeroText}>
                {isHelper
                  ? 'Open requests are ready to review. Send an offer only when the scope, timing, and price make sense.'
                  : 'Describe the outcome in your own words. Providers can review the request and respond with an offer.'}
              </Text>
            </View>
            <View style={[styles.heroActions, isWide && styles.heroActionsWide]}>
              <AppButton
                label={isHelper ? 'Browse open work' : 'Request help'}
                icon={isHelper ? 'search-outline' : 'add-circle-outline'}
                variant="secondary"
                fullWidth={!isWide}
                onPress={() => router.push(isHelper ? '/(tabs)/requests' : '/post-problem')}
              />
              <AppButton
                label={isHelper ? 'Improve profile' : 'Find a provider'}
                icon={isHelper ? 'person-outline' : 'people-outline'}
                variant="outline"
                fullWidth={!isWide}
                onPress={() => router.push(isHelper ? '/edit-profile' : '/(tabs)/helpers')}
              />
            </View>
          </View>

          {!isHelper ? (
            <View style={styles.processStrip}>
              {[
                { icon: 'create-outline', label: 'Describe the need' },
                { icon: 'git-compare-outline', label: 'Compare offers' },
                { icon: 'checkmark-done-outline', label: 'Connect and track' },
              ].map((step, index) => (
                <React.Fragment key={step.label}>
                  <View style={styles.processStep}>
                    <View style={styles.processIcon}>
                      <Ionicons name={step.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.processText}>{step.label}</Text>
                  </View>
                  {index < 2 ? <Ionicons name="chevron-forward" size={16} color={colors.borderStrong} /> : null}
                </React.Fragment>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>{isHelper ? 'Open opportunities' : 'Your recent requests'}</Text>
                <Text style={styles.sectionSubtitle}>{isHelper ? 'A preview of requests currently accepting responses.' : 'Follow responses and progress from one place.'}</Text>
              </View>
              <TouchableOpacity
                style={styles.textButton}
                onPress={() => router.push('/(tabs)/requests')}
                accessibilityRole="button"
                accessibilityLabel={isHelper ? 'View all open work' : 'View all requests'}
              >
                <Text style={styles.textButtonLabel}>View all</Text>
                <Ionicons name="arrow-forward" size={17} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {loading && jobs.length === 0 ? (
              <LoadingState label={isHelper ? 'Finding open requests...' : 'Updating your requests...'} />
            ) : error ? (
              <View style={styles.inlineState}>
                <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
                <View style={styles.inlineStateCopy}>
                  <Text style={styles.inlineStateTitle}>Activity is temporarily unavailable</Text>
                  <Text style={styles.inlineStateText}>{error}</Text>
                </View>
                <TouchableOpacity style={styles.retryIconButton} onPress={loadDashboard} accessibilityRole="button" accessibilityLabel="Retry activity">
                  <Ionicons name="refresh" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : jobs.length === 0 ? (
              <EmptyState
                compact
                icon={isHelper ? 'briefcase-outline' : 'document-text-outline'}
                title={isHelper ? 'No open requests right now' : 'Your first request starts here'}
                description={isHelper ? 'Pull to refresh or check again as customers post new needs.' : 'Tell us what you need and providers can respond with an offer.'}
                actionLabel={isHelper ? 'Refresh' : 'Request help'}
                onAction={isHelper ? loadDashboard : () => router.push('/post-problem')}
              />
            ) : (
              <View style={[styles.jobsGrid, isWide && styles.jobsGridWide]}>
                {jobs.map((job) => <JobPreview key={job._id} job={job} onPress={() => router.push(`/job/${job._id}`)} wide={isWide} />)}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>Explore services</Text>
                <Text style={styles.sectionSubtitle}>Browse people and businesses by the kind of support you need.</Text>
              </View>
              <TouchableOpacity style={styles.textButton} onPress={() => router.push('/(tabs)/helpers')}>
                <Text style={styles.textButtonLabel}>All services</Text>
                <Ionicons name="arrow-forward" size={17} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.categoriesGrid}>
              {FEATURED_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryCard, isWide ? styles.categoryCardWide : styles.categoryCardMobile]}
                  onPress={() => router.push(`/(tabs)/helpers?category=${category.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Find ${category.label}`}
                  activeOpacity={0.78}
                >
                  <View style={styles.categoryIcon}>
                    <Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.categoryLabel} numberOfLines={2}>{category.shortLabel}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.borderStrong} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.connectionBand, isWide && styles.connectionBandWide]}>
            <View style={styles.connectionIcon}>
              <Ionicons name="people-outline" size={25} color={colors.info} />
            </View>
            <View style={styles.connectionCopy}>
              <Text style={styles.connectionEyebrow}>BEYOND THE REQUEST</Text>
              <Text style={styles.connectionTitle}>Join conversations that strengthen local connections</Text>
              <Text style={styles.connectionText}>Discover community chapters, share useful recommendations, and learn with people around you.</Text>
            </View>
            <AppButton label="Explore community" variant="outline" icon="arrow-forward" iconPosition="right" onPress={() => router.push('/(tabs)/community')} fullWidth={!isWide} />
          </View>

          <View style={styles.supportRow}>
            <View style={styles.supportCopy}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <Text style={styles.supportText}>Keep quotes, messages, and job progress on SolveConnect so each step stays easier to review.</Text>
            </View>
            <TouchableOpacity style={styles.supportAction} onPress={() => router.push('/help-support')} accessibilityRole="button">
              <Text style={styles.supportActionText}>Get support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function JobPreview({ job, onPress, wide }: { job: Job; onPress: () => void; wide: boolean }) {
  const promotion = getJobPromotion(job);
  const status = formatLabel(job.status || 'posted');

  return (
    <TouchableOpacity
      style={[styles.jobCard, wide && styles.jobCardWide]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${job.title || 'Service request'}, ${formatBudget(job.budget)}`}
      activeOpacity={0.8}
    >
      <View style={styles.jobTopRow}>
        <Text style={styles.jobCategory}>{formatLabel(job.category || 'General help')}</Text>
        <StatusBadge label={status} tone={job.status === 'completed' ? 'success' : job.status === 'in_progress' ? 'info' : 'neutral'} compact />
      </View>
      {promotion && promotion.id !== 'free' ? <StatusBadge label={promotion.label} tone="warning" icon={promotion.id === 'top' ? 'flash' : 'trending-up'} compact /> : null}
      <Text style={styles.jobTitle} numberOfLines={2}>{job.title || 'Untitled request'}</Text>
      <Text style={styles.jobDescription} numberOfLines={2}>{job.description || 'Open the request to review the full details.'}</Text>
      <View style={styles.jobBottomRow}>
        <Text style={styles.jobBudget}>{formatBudget(job.budget)}</Text>
        <View style={styles.jobAction}>
          <Text style={styles.jobActionText}>Open</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatBudget(value?: number | string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₦${amount.toLocaleString()}` : 'Budget not set';
}

function formatLabel(value: string) {
  return value.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { paddingBottom: spacing.page },
  pageFrame: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: spacing.lg },
  topBar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  profileButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.ink },
  profileInitial: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: colors.inverse },
  greetingBlock: { paddingTop: spacing.lg, paddingBottom: spacing.xxl, maxWidth: 680 },
  eyebrow: { ...typography.overline, color: colors.primary, marginBottom: spacing.xs },
  greeting: { ...typography.h1, color: colors.ink },
  greetingText: { ...typography.bodyLarge, color: colors.muted, marginTop: spacing.sm },
  actionHero: { padding: spacing.xl, gap: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.primaryDark, ...shadows.card },
  actionHeroWide: { minHeight: 230, flexDirection: 'row', alignItems: 'center', padding: spacing.section, gap: spacing.section },
  actionHeroCopy: { flex: 1, maxWidth: 620 },
  heroIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: '#F6B44B', marginBottom: spacing.lg },
  actionHeroTitle: { ...typography.h2, color: colors.inverse },
  actionHeroText: { ...typography.body, color: '#D5E5DF', marginTop: spacing.sm },
  heroActions: { gap: spacing.sm },
  heroActionsWide: { width: 210 },
  processStrip: { minHeight: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  processStep: { flex: 1, minWidth: 0, alignItems: 'center', gap: spacing.xs },
  processIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.subtle },
  processText: { ...typography.caption, color: colors.ink, textAlign: 'center' },
  section: { paddingTop: spacing.section },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg },
  sectionHeadingCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { ...typography.h3, color: colors.ink },
  sectionSubtitle: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  textButton: { minHeight: layout.minimumTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  textButtonLabel: { ...typography.label, color: colors.primary },
  inlineState: { minHeight: 94, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.dangerSoft, backgroundColor: colors.surface },
  inlineStateCopy: { flex: 1, minWidth: 0 },
  inlineStateTitle: { ...typography.label, color: colors.ink },
  inlineStateText: { ...typography.caption, color: colors.muted, marginTop: spacing.xs },
  retryIconButton: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, alignItems: 'center', justifyContent: 'center' },
  jobsGrid: { gap: spacing.md },
  jobsGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  jobCard: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  jobCardWide: { width: '48.5%', minHeight: 210 },
  jobTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  jobCategory: { ...typography.overline, flex: 1, color: colors.primary },
  jobTitle: { ...typography.title, color: colors.ink },
  jobDescription: { ...typography.body, flex: 1, color: colors.muted },
  jobBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  jobBudget: { ...typography.title, color: colors.ink },
  jobAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  jobActionText: { ...typography.label, color: colors.primary },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  categoryCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  categoryCardWide: { width: '23.5%' },
  categoryCardMobile: { width: '100%' },
  categoryIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.subtle },
  categoryLabel: { ...typography.label, flex: 1, color: colors.ink },
  connectionBand: { gap: spacing.lg, marginTop: spacing.section, padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: '#BFD3E4', backgroundColor: colors.infoSoft },
  connectionBandWide: { flexDirection: 'row', alignItems: 'center', padding: spacing.xxl },
  connectionIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.surface },
  connectionCopy: { flex: 1 },
  connectionEyebrow: { ...typography.overline, color: colors.info },
  connectionTitle: { ...typography.title, color: colors.ink, marginTop: spacing.xs },
  connectionText: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  supportRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  supportCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supportText: { ...typography.caption, flex: 1, color: colors.muted },
  supportAction: { minHeight: layout.minimumTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.sm },
  supportActionText: { ...typography.label, color: colors.primary },
});
