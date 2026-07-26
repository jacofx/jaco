import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import { useSocket } from '../../contexts/SocketContext';
import { notificationAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/error';

type Notification = {
  _id: string;
  created_at?: string;
  job_id?: string;
  message?: string;
  read?: boolean;
  title?: string;
  type?: string;
};

const COLORS = {
  primary: '#0B6B4F',
  primaryDark: '#07543E',
  primarySoft: '#E8F4EF',
  ink: '#10231C',
  muted: '#5D6B64',
  canvas: '#F5F8F6',
  surface: '#FFFFFF',
  border: '#D7E2DC',
  danger: '#B42318',
  dangerSoft: '#FEF3F2',
  unread: '#FFF7E8',
  unreadBorder: '#EACB91',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setError(null);

    try {
      const response = await notificationAPI.getNotifications();
      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Notifications could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification: Notification) => {
      setNotifications((current) => [
        notification,
        ...current.filter((item) => item._id !== notification._id),
      ]);
    };

    socket.on('new_notification', handleNotification);

    return () => {
      socket.off('new_notification', handleNotification);
    };
  }, [socket]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleRetry = () => {
    setLoading(true);
    void loadNotifications();
  };

  const handleOpenNotification = async (item: Notification) => {
    if (openingId) return;

    setOpeningId(item._id);
    try {
      if (!item.read) {
        const response = await notificationAPI.updateNotification(item._id, true);
        setNotifications((current) => current.map((notification) => (
          notification._id === item._id
            ? { ...notification, ...response.data, read: true }
            : notification
        )));
      }
    } catch {
      Alert.alert(
        'Notification not updated',
        'This update could not be marked as read. You can try again later.'
      );
    } finally {
      setOpeningId(null);
    }

    if (item.job_id) {
      router.push(`/job/${item.job_id}`);
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isOpening = openingId === item._id;
    const title = item.title?.trim() || 'SolveConnect update';
    const message = item.message?.trim() || 'Open this update for more information.';
    const time = formatNotificationTime(item.created_at);

    return (
      <TouchableOpacity
        accessibilityHint={item.job_id ? 'Marks this update as read and opens the related job' : 'Marks this update as read'}
        accessibilityLabel={`${item.read ? '' : 'Unread. '}${title}. ${message}${time ? `. ${time}` : ''}`}
        accessibilityRole="button"
        accessibilityState={{ busy: isOpening, disabled: Boolean(openingId) }}
        activeOpacity={0.75}
        disabled={Boolean(openingId)}
        onPress={() => handleOpenNotification(item)}
        style={[styles.card, !item.read && styles.cardUnread]}
      >
        <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
          {isOpening ? (
            <ActivityIndicator color={COLORS.primaryDark} size="small" />
          ) : (
            <Ionicons
              name={getNotificationIcon(item.type)}
              size={22}
              color={COLORS.primaryDark}
            />
          )}
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            {!item.read ? <View accessibilityLabel="Unread" style={styles.unreadDot} /> : null}
          </View>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.metaRow}>
            {time ? <Text style={styles.timeText}>{time}</Text> : <View />}
            {item.job_id ? (
              <View style={styles.jobLink}>
                <Text style={styles.jobLinkText}>View job</Text>
                <Ionicons name="arrow-forward" size={15} color={COLORS.primaryDark} />
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerShell}>
        <Text style={styles.eyebrow}>Account activity</Text>
        <Text accessibilityRole="header" style={styles.pageTitle}>Notifications</Text>
        <Text style={styles.pageDescription}>
          Updates about requests, offers, payments, and listing promotions.
        </Text>
      </View>

      {loading && notifications.length === 0 ? (
        <StatePanel
          icon="notifications-outline"
          loading
          text="Checking for recent account activity..."
          title="Loading notifications"
        />
      ) : error && notifications.length === 0 ? (
        <StatePanel
          actionLabel="Try again"
          icon="cloud-offline-outline"
          onAction={handleRetry}
          text={error}
          title="Notifications are unavailable"
        />
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.listContentEmpty,
          ]}
          data={notifications}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={(
            <StatePanel
              icon="notifications-off-outline"
              text="New updates will appear here when there is activity on your account."
              title="No notifications yet"
            />
          )}
          ListHeaderComponent={error ? (
            <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={20} color={COLORS.danger} />
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={handleRefresh} style={styles.bannerRetry}>
                <Text style={styles.bannerRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          refreshControl={(
            <RefreshControl
              colors={[COLORS.primary]}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              tintColor={COLORS.primary}
            />
          )}
          renderItem={renderNotificationItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

type StatePanelProps = {
  actionLabel?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  onAction?: () => void;
  text: string;
  title: string;
};

function StatePanel({ actionLabel, icon, loading, onAction, text, title }: StatePanelProps) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={loading ? 'progressbar' : undefined}
      style={styles.statePanel}
    >
      <View style={styles.stateIcon}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" />
        ) : (
          <Ionicons name={icon} size={30} color={COLORS.muted} />
        )}
      </View>
      <Text accessibilityRole="header" style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.75}
          onPress={onAction}
          style={styles.retryButton}
        >
          <Ionicons name="refresh-outline" size={18} color={COLORS.surface} />
          <Text style={styles.retryButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function getNotificationIcon(type?: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (type === 'job_offer_created') return 'pricetag-outline';
  if (type === 'job_offer_accepted') return 'checkmark-circle-outline';
  if (type === 'ad_payment_completed') return 'card-outline';
  if (type === 'promotion_activated') return 'megaphone-outline';
  if (type === 'promotion_expired') return 'time-outline';
  return 'notifications-outline';
}

function formatNotificationTime(value?: string) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return formatDistanceToNow(date, { addSuffix: true });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  headerShell: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pageTitle: {
    marginTop: 5,
    color: COLORS.ink,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  pageDescription: {
    maxWidth: 580,
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  listContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  cardUnread: {
    borderColor: COLORS.unreadBorder,
    backgroundColor: COLORS.unread,
  },
  iconWrap: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 8,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: {
    backgroundColor: COLORS.surface,
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    flexShrink: 0,
    marginTop: 6,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  message: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  timeText: {
    flexShrink: 1,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  jobLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobLinkText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  statePanel: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 620,
    padding: 28,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    marginTop: 16,
    color: COLORS.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    maxWidth: 440,
    marginTop: 7,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
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
  errorBanner: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#F3B7B2',
    borderRadius: 8,
    backgroundColor: COLORS.dangerSoft,
  },
  errorBannerText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  bannerRetry: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  bannerRetryText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});
