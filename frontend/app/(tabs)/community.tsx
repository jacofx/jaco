import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { communityAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/error';
import { useAuthStore } from '../../store/authStore';

type Community = {
  _id: string;
  category?: string;
  city?: string;
  joined?: boolean;
  members?: number | string;
  name: string;
  type?: string;
};

const COLORS = {
  primary: '#0B6B4F',
  primaryDark: '#07543E',
  primarySoft: '#E8F4EF',
  accent: '#F28C28',
  ink: '#10231C',
  muted: '#5D6B64',
  canvas: '#F5F8F6',
  surface: '#FFFFFF',
  border: '#D7E2DC',
  danger: '#B42318',
};

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const loadCommunities = useCallback(async () => {
    setLoadError(null);

    try {
      const response = await communityAPI.getCommunities();
      setCommunities(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Communities could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCommunities();
  }, [loadCommunities]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCommunities();
    setRefreshing(false);
  };

  const handlePrimaryAction = () => {
    if (user?.role === 'helper') {
      router.push('/(tabs)/requests');
      return;
    }

    router.push('/post-problem');
  };

  const handleShare = async () => {
    if (sharing) return;

    setSharing(true);
    const message = `${user?.name || 'I'} invited you to SolveConnect, a platform for requesting help and connecting with service providers.`;

    try {
      const result = await Share.share({ message });
      if (result.action !== Share.sharedAction) return;

      try {
        await communityAPI.createReferral({ message });
      } catch {
        Alert.alert(
          'Invite shared',
          'Your invite was shared, but SolveConnect could not record it in your account.'
        );
      }
    } catch {
      Alert.alert('Invite not shared', 'Unable to open sharing right now. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const handleJoin = async (community: Community) => {
    if (community.joined || joiningId) return;

    setJoiningId(community._id);
    try {
      const response = await communityAPI.joinCommunity(community._id);
      const updated = response.data?.community;

      setCommunities((current) => current.map((item) => (
        item._id === community._id
          ? { ...item, ...(updated || {}), _id: item._id, joined: true }
          : item
      )));
      Alert.alert('Community joined', `${community.name} is now in your community list.`);
    } catch (error) {
      Alert.alert(
        'Could not join community',
        getApiErrorMessage(error, 'Your membership was not updated. Please try again.')
      );
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={(
          <RefreshControl
            colors={[COLORS.primary]}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            tintColor={COLORS.primary}
          />
        )}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentShell}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="people-outline" size={23} color={COLORS.primaryDark} />
            </View>
            <Text style={styles.eyebrow}>SolveConnect community</Text>
            <Text accessibilityRole="header" style={styles.heroTitle}>
              Find people around shared skills and local needs.
            </Text>
            <Text style={styles.heroText}>
              Browse the groups available to your account and join the ones that are relevant to you.
            </Text>
            <View style={styles.heroActions}>
              <TouchableOpacity
                accessibilityLabel={user?.role === 'helper' ? 'Browse service requests' : 'Request help'}
                accessibilityRole="button"
                activeOpacity={0.75}
                onPress={handlePrimaryAction}
                style={styles.primaryAction}
              >
                <Ionicons
                  name={user?.role === 'helper' ? 'search-outline' : 'add-circle-outline'}
                  size={20}
                  color={COLORS.surface}
                />
                <Text style={styles.primaryActionText}>
                  {user?.role === 'helper' ? 'Browse requests' : 'Request help'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityHint="Opens your device sharing options"
                accessibilityLabel="Invite someone to SolveConnect"
                accessibilityRole="button"
                accessibilityState={{ busy: sharing, disabled: sharing }}
                activeOpacity={0.75}
                disabled={sharing}
                onPress={handleShare}
                style={styles.secondaryAction}
              >
                {sharing ? (
                  <ActivityIndicator color={COLORS.primaryDark} size="small" />
                ) : (
                  <Ionicons name="share-social-outline" size={19} color={COLORS.primaryDark} />
                )}
                <Text style={styles.secondaryActionText}>Invite</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeadingCopy}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Communities</Text>
                <Text style={styles.sectionDescription}>Local and online groups returned by SolveConnect.</Text>
              </View>
              {!loading && !loadError ? (
                <Text style={styles.resultCount}>
                  {communities.length} {communities.length === 1 ? 'group' : 'groups'}
                </Text>
              ) : null}
            </View>

            {loading ? (
              <View
                accessibilityLabel="Loading communities"
                accessibilityRole="progressbar"
                style={styles.statePanel}
              >
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text style={styles.stateTitle}>Loading communities</Text>
                <Text style={styles.stateText}>Checking which groups are available...</Text>
              </View>
            ) : loadError ? (
              <View accessibilityLiveRegion="polite" style={styles.statePanel}>
                <View style={styles.stateIcon}>
                  <Ionicons name="cloud-offline-outline" size={26} color={COLORS.muted} />
                </View>
                <Text accessibilityRole="header" style={styles.stateTitle}>Communities are unavailable</Text>
                <Text style={styles.stateText}>{loadError}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.75}
                  onPress={() => {
                    setLoading(true);
                    void loadCommunities();
                  }}
                  style={styles.retryButton}
                >
                  <Ionicons name="refresh-outline" size={18} color={COLORS.surface} />
                  <Text style={styles.retryButtonText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : communities.length === 0 ? (
              <View style={styles.statePanel}>
                <View style={styles.stateIcon}>
                  <Ionicons name="people-outline" size={26} color={COLORS.muted} />
                </View>
                <Text accessibilityRole="header" style={styles.stateTitle}>No communities available yet</Text>
                <Text style={styles.stateText}>
                  Groups will appear here when they are published on SolveConnect.
                </Text>
              </View>
            ) : (
              <View style={styles.communityList}>
                {communities.map((community) => {
                  const isJoining = joiningId === community._id;
                  const meta = getCommunityMeta(community);

                  return (
                    <View key={community._id} style={styles.communityCard}>
                      <View style={styles.communityHeader}>
                        <View style={styles.communityIcon}>
                          <Ionicons
                            name={getCommunityIcon(community.type)}
                            size={22}
                            color={COLORS.primaryDark}
                          />
                        </View>
                        <View style={styles.communityHeading}>
                          {meta ? <Text style={styles.communityMeta}>{meta}</Text> : null}
                          <Text accessibilityRole="header" style={styles.communityName}>
                            {community.name}
                          </Text>
                        </View>
                        {community.joined ? (
                          <View style={styles.joinedBadge}>
                            <Ionicons name="checkmark" size={15} color={COLORS.primaryDark} />
                            <Text style={styles.joinedBadgeText}>Joined</Text>
                          </View>
                        ) : null}
                      </View>

                      {community.members !== undefined && community.members !== null ? (
                        <View style={styles.memberRow}>
                          <Ionicons name="people-outline" size={17} color={COLORS.muted} />
                          <Text style={styles.memberText}>{formatMembers(community.members)} members</Text>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        accessibilityLabel={community.joined ? `${community.name} joined` : `Join ${community.name}`}
                        accessibilityRole="button"
                        accessibilityState={{
                          busy: isJoining,
                          disabled: community.joined || Boolean(joiningId),
                        }}
                        activeOpacity={0.75}
                        disabled={community.joined || Boolean(joiningId)}
                        onPress={() => handleJoin(community)}
                        style={[styles.joinButton, community.joined && styles.joinButtonDisabled]}
                      >
                        {isJoining ? (
                          <ActivityIndicator color={COLORS.surface} size="small" />
                        ) : (
                          <Ionicons
                            name={community.joined ? 'checkmark-circle-outline' : 'add-circle-outline'}
                            size={19}
                            color={community.joined ? COLORS.primaryDark : COLORS.surface}
                          />
                        )}
                        <Text style={[
                          styles.joinButtonText,
                          community.joined && styles.joinButtonTextDisabled,
                        ]}>
                          {community.joined ? 'Joined' : 'Join community'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeadingCopy}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Events & workshops</Text>
              <Text style={styles.sectionDescription}>Published dates and registration details will appear here.</Text>
            </View>
            <View style={styles.eventEmpty}>
              <View style={styles.eventIcon}>
                <Ionicons name="calendar-outline" size={24} color={COLORS.primaryDark} />
              </View>
              <View style={styles.eventCopy}>
                <Text style={styles.eventTitle}>No events scheduled</Text>
                <Text style={styles.eventText}>
                  There are no published SolveConnect events or workshops right now.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.inviteBand}>
            <View style={styles.inviteCopy}>
              <Text accessibilityRole="header" style={styles.inviteTitle}>Invite someone useful to the network</Text>
              <Text style={styles.inviteText}>
                Share SolveConnect with a professional, business owner, or someone looking for support.
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Share a SolveConnect invite"
              accessibilityRole="button"
              accessibilityState={{ busy: sharing, disabled: sharing }}
              activeOpacity={0.75}
              disabled={sharing}
              onPress={handleShare}
              style={styles.inviteButton}
            >
              <Ionicons name="share-outline" size={18} color={COLORS.primaryDark} />
              <Text style={styles.inviteButtonText}>Share invite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getCommunityMeta(community: Community) {
  const values = [community.type, community.city]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());

  return [...new Set(values)].join(' / ');
}

function getCommunityIcon(type?: string): React.ComponentProps<typeof Ionicons>['name'] {
  const normalizedType = type?.toLowerCase();

  if (normalizedType === 'city') return 'location-outline';
  if (normalizedType === 'business') return 'storefront-outline';
  if (normalizedType === 'university') return 'school-outline';
  if (normalizedType === 'industry') return 'construct-outline';
  return 'people-outline';
}

function formatMembers(value: string | number) {
  if (typeof value === 'number') {
    return value.toLocaleString('en-NG');
  }

  return value;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  contentShell: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: 32,
  },
  hero: {
    paddingVertical: 12,
  },
  heroIcon: {
    width: 46,
    height: 46,
    marginBottom: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroTitle: {
    maxWidth: 620,
    marginTop: 7,
    color: COLORS.ink,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '700',
  },
  heroText: {
    maxWidth: 620,
    marginTop: 9,
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  primaryAction: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  primaryActionText: {
    color: COLORS.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    minWidth: 108,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  secondaryActionText: {
    color: COLORS.primaryDark,
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  sectionHeadingCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  sectionDescription: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  resultCount: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.canvas,
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  statePanel: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.canvas,
  },
  stateIcon: {
    width: 52,
    height: 52,
    marginBottom: 14,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    marginTop: 12,
    color: COLORS.ink,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    maxWidth: 440,
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  communityList: {
    gap: 12,
  },
  communityCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  communityIcon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityHeading: {
    flex: 1,
  },
  communityMeta: {
    color: COLORS.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  communityName: {
    marginTop: 2,
    color: COLORS.ink,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
  },
  joinedBadgeText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 13,
  },
  memberText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  joinButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 15,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  joinButtonDisabled: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.canvas,
  },
  joinButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  joinButtonTextDisabled: {
    color: COLORS.primaryDark,
  },
  eventEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.canvas,
  },
  eventIcon: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCopy: {
    flex: 1,
  },
  eventTitle: {
    color: COLORS.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  eventText: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  inviteBand: {
    paddingVertical: 22,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  inviteCopy: {
    maxWidth: 600,
  },
  inviteTitle: {
    color: COLORS.ink,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '700',
  },
  inviteText: {
    marginTop: 5,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  inviteButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 14,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  inviteButtonText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
});
