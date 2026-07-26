import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adsAPI, userAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Purchase = {
  _id: string;
  amount?: number;
  currency?: string;
  package_name?: string;
  status?: string;
};

type MenuRowProps = {
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
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
  dangerSoft: '#FEF3F2',
  warning: '#925B16',
  warningSoft: '#FFF7E8',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [purchasesError, setPurchasesError] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const loadPurchases = useCallback(async () => {
    setLoadingPurchases(true);
    setPurchasesError(null);

    try {
      const response = await adsAPI.getPurchases();
      setPurchases(Array.isArray(response.data) ? response.data : []);
    } catch {
      setPurchasesError('Payment history is unavailable right now.');
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  useEffect(() => {
    void loadPurchases();
  }, [loadPurchases]);

  const performLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch {
      Alert.alert('Logout failed', 'Unable to log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window === 'undefined'
        ? true
        : window.confirm('Are you sure you want to log out?');

      if (confirmed) {
        void performLogout();
      }
      return;
    }

    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: performLogout },
    ]);
  };

  const handleUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo access needed',
          'Allow access to your photo library to choose a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setUploading(true);
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const response = await userAPI.updateUser({ profile_photo: base64Image });
        setUser(response.data);
        Alert.alert('Photo updated', 'Your new profile photo is now visible.');
      }
    } catch {
      Alert.alert('Upload failed', 'Your profile photo could not be updated. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const rating = typeof user?.rating === 'number' && user.rating > 0
    ? user.rating.toFixed(1)
    : 'No rating';
  const showPromotionTools = user?.role !== 'helper' || purchases.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentShell}>
          <View style={styles.pageHeader}>
            <Text style={styles.eyebrow}>Your account</Text>
            <Text accessibilityRole="header" style={styles.pageTitle}>Profile & settings</Text>
            <Text style={styles.pageDescription}>
              Keep your details current so people know who they are connecting with.
            </Text>
          </View>

          <View style={styles.profileHeader}>
            <TouchableOpacity
              accessibilityHint="Opens your photo library"
              accessibilityLabel="Change profile photo"
              accessibilityRole="button"
              accessibilityState={{ busy: uploading, disabled: uploading }}
              activeOpacity={0.8}
              disabled={uploading}
              onPress={handleUploadPhoto}
            >
              <View style={styles.avatarContainer}>
                {user?.profile_photo ? (
                  <Image
                    accessible={false}
                    source={{ uri: user.profile_photo }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Ionicons name="person-outline" size={48} color={COLORS.muted} />
                  </View>
                )}
                <View style={styles.cameraButton}>
                  {uploading ? (
                    <ActivityIndicator color={COLORS.surface} size="small" />
                  ) : (
                    <Ionicons name="camera-outline" size={18} color={COLORS.surface} />
                  )}
                </View>
              </View>
            </TouchableOpacity>

            <Text accessibilityRole="header" style={styles.userName}>{user?.name}</Text>
            {user?.email ? <Text style={styles.contactText}>{user.email}</Text> : null}
            {user?.phone ? <Text style={styles.contactText}>{user.phone}</Text> : null}

            <View style={styles.roleBadge}>
              <Ionicons
                name={user?.role === 'helper' ? 'briefcase-outline' : 'help-circle-outline'}
                size={15}
                color={COLORS.primaryDark}
              />
              <Text style={styles.roleText}>
                {user?.role === 'helper' ? 'Service provider' : 'Looking for help'}
              </Text>
            </View>
          </View>

          {user?.role === 'helper' ? (
            <View accessibilityLabel="Provider activity" style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="star-outline" size={22} color={COLORS.warning} />
                <Text style={styles.statValue}>{rating}</Text>
                <Text style={styles.statLabel}>Customer rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.primary} />
                <Text style={styles.statValue}>{user.completed_jobs_count || 0}</Text>
                <Text style={styles.statLabel}>Completed jobs</Text>
              </View>
            </View>
          ) : null}

          {user?.role === 'helper' && user.skills?.length ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Skills</Text>
              <View style={styles.skillsContainer}>
                {user.skills.map((skill) => (
                  <View key={skill} style={styles.skillBadge}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {showPromotionTools ? (
            <View style={styles.promotionCard}>
              <View style={styles.promotionIcon}>
                <Ionicons name="megaphone-outline" size={22} color={COLORS.primaryDark} />
              </View>
              <View style={styles.promotionCopy}>
                <Text style={styles.promotionEyebrow}>Optional promotion</Text>
                <Text accessibilityRole="header" style={styles.promotionTitle}>
                  Give an urgent request more visibility
                </Text>
                <Text style={styles.promotionDescription}>
                  Free listings remain available. Paid placement is time-limited and does not guarantee responses.
                </Text>
                <TouchableOpacity
                  accessibilityHint="Shows your promotion payment history"
                  accessibilityLabel="Review promotion payments"
                  accessibilityRole="button"
                  activeOpacity={0.75}
                  onPress={() => router.push('/payments')}
                  style={styles.promotionAction}
                >
                  <Text style={styles.promotionActionText}>Review payments</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.primaryDark} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {loadingPurchases || purchasesError || purchases.length > 0 ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Recent promotion payments
              </Text>

              {loadingPurchases ? (
                <View accessibilityLabel="Loading payment history" accessibilityRole="progressbar" style={styles.inlineState}>
                  <ActivityIndicator color={COLORS.primary} size="small" />
                  <Text style={styles.inlineStateText}>Loading payment history...</Text>
                </View>
              ) : purchasesError ? (
                <View accessibilityLiveRegion="polite" style={styles.inlineState}>
                  <Ionicons name="cloud-offline-outline" size={20} color={COLORS.muted} />
                  <Text style={styles.inlineStateText}>{purchasesError}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={loadPurchases}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.purchaseList}>
                  {purchases.slice(0, 3).map((purchase) => {
                    const status = getPaymentStatus(purchase.status);

                    return (
                      <TouchableOpacity
                        accessibilityHint="Opens your full payment history"
                        accessibilityLabel={`${purchase.package_name || 'Promotion payment'}, ${formatPaymentAmount(purchase)}, ${status.label}`}
                        accessibilityRole="button"
                        activeOpacity={0.75}
                        key={purchase._id}
                        onPress={() => router.push('/payments')}
                        style={styles.purchaseCard}
                      >
                        <View style={styles.purchaseCopy}>
                          <Text style={styles.purchaseTitle} numberOfLines={2}>
                            {purchase.package_name || 'Promotion payment'}
                          </Text>
                          <Text style={styles.purchaseMeta}>{formatPaymentAmount(purchase)}</Text>
                        </View>
                        <View style={[styles.purchaseStatus, { backgroundColor: status.backgroundColor }]}>
                          <Text style={[styles.purchaseStatusText, { color: status.color }]}>
                            {status.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Account</Text>
            <View style={styles.menuList}>
              <MenuRow
                description="Update your name, contact details, and skills"
                icon="person-outline"
                label="Edit profile"
                onPress={() => router.push('/edit-profile')}
              />
              <MenuRow
                description="Control the location used for nearby results"
                icon="location-outline"
                label="Location"
                onPress={() => router.push('/location-settings')}
              />
              <MenuRow
                description="Browse local and online groups"
                icon="people-outline"
                label="Community"
                onPress={() => router.push('/(tabs)/community')}
              />
              <MenuRow
                description="See updates about requests, offers, and payments"
                icon="notifications-outline"
                label="Notifications"
                onPress={() => router.push('/(tabs)/notifications')}
              />
              <MenuRow
                description="Review any optional promotion purchases"
                icon="card-outline"
                label="Promotion payments"
                onPress={() => router.push('/payments')}
              />
              <MenuRow
                description="Find support information and common answers"
                icon="help-circle-outline"
                label="Help & support"
                onPress={() => router.push('/help-support')}
              />
            </View>
          </View>

          <TouchableOpacity
            accessibilityLabel="Log out of SolveConnect"
            accessibilityRole="button"
            accessibilityState={{ busy: loggingOut, disabled: loggingOut }}
            activeOpacity={0.75}
            disabled={loggingOut}
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            {loggingOut ? (
              <ActivityIndicator color={COLORS.danger} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={21} color={COLORS.danger} />
                <Text style={styles.logoutButtonText}>Log out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({ description, icon, label, onPress }: MenuRowProps) {
  return (
    <TouchableOpacity
      accessibilityHint={description}
      accessibilityLabel={label}
      accessibilityRole="button"
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.menuItem}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={21} color={COLORS.primaryDark} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuItemText}>{label}</Text>
        <Text style={styles.menuItemDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

function formatPaymentAmount(purchase: Purchase) {
  const amount = Number(purchase.amount);
  const currency = purchase.currency || 'NGN';

  if (!Number.isFinite(amount)) {
    return currency;
  }

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function getPaymentStatus(value?: string) {
  const status = value?.toLowerCase() || 'unknown';

  if (status === 'completed' || status === 'paid') {
    return { label: 'Completed', backgroundColor: COLORS.primarySoft, color: COLORS.primaryDark };
  }

  if (status === 'pending' || status === 'processing') {
    return { label: 'Pending', backgroundColor: COLORS.warningSoft, color: COLORS.warning };
  }

  if (status === 'failed' || status === 'cancelled' || status === 'canceled') {
    return { label: status === 'failed' ? 'Failed' : 'Cancelled', backgroundColor: COLORS.dangerSoft, color: COLORS.danger };
  }

  return { label: value || 'Unknown', backgroundColor: COLORS.canvas, color: COLORS.muted };
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
    maxWidth: 720,
    alignSelf: 'center',
  },
  pageHeader: {
    marginBottom: 28,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pageTitle: {
    marginTop: 6,
    color: COLORS.ink,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  pageDescription: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: COLORS.surface,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    maxWidth: '100%',
    color: COLORS.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  contactText: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
  },
  roleText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 28,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.canvas,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  statValue: {
    marginTop: 7,
    color: COLORS.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabel: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    marginBottom: 12,
    color: COLORS.ink,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '700',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.canvas,
  },
  skillText: {
    color: COLORS.ink,
    fontSize: 14,
    lineHeight: 19,
    textTransform: 'capitalize',
  },
  promotionCard: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
  },
  promotionIcon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promotionCopy: {
    flex: 1,
  },
  promotionEyebrow: {
    color: COLORS.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  promotionTitle: {
    marginTop: 3,
    color: COLORS.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  promotionDescription: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  promotionAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
    paddingRight: 6,
  },
  promotionActionText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  inlineState: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.canvas,
  },
  inlineStateText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  retryButtonText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  purchaseList: {
    gap: 10,
  },
  purchaseCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  purchaseCopy: {
    flex: 1,
  },
  purchaseTitle: {
    color: COLORS.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  purchaseMeta: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  purchaseStatus: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  purchaseStatusText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  menuList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  menuItem: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: {
    flex: 1,
  },
  menuItemText: {
    color: COLORS.ink,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  menuItemDescription: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  logoutButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F3B7B2',
    borderRadius: 8,
    backgroundColor: COLORS.dangerSoft,
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '700',
  },
});
