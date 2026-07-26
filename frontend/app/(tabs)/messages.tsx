import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
import { messageAPI } from '../../services/api';

interface ConversationUser {
  name?: string;
  profilePhoto?: string;
}

interface Conversation {
  jobId: string;
  jobTitle?: string;
  lastMessage?: string;
  lastMessageTime?: string | number;
  otherUser?: ConversationUser;
  unreadCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeConversations(payload: unknown): Conversation[] {
  const items = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.conversations)
      ? payload.conversations
      : [];

  return items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const jobId =
      typeof item.job_id === 'string' || typeof item.job_id === 'number'
        ? String(item.job_id).trim()
        : '';

    if (!jobId) {
      return [];
    }

    const otherUser = isRecord(item.other_user) ? item.other_user : undefined;
    const rawUnreadCount = Number(item.unread_count ?? 0);

    return [
      {
        jobId,
        jobTitle: optionalText(item.job_title),
        lastMessage: optionalText(item.last_message),
        lastMessageTime:
          typeof item.last_message_time === 'string' ||
          typeof item.last_message_time === 'number'
            ? item.last_message_time
            : undefined,
        otherUser: otherUser
          ? {
              name: optionalText(otherUser.name),
              profilePhoto: optionalText(otherUser.profile_photo),
            }
          : undefined,
        unreadCount: Number.isFinite(rawUnreadCount)
          ? Math.max(0, Math.floor(rawUnreadCount))
          : 0,
      },
    ];
  });
}

function formatConversationTime(value?: string | number): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return undefined;
  }
}

function ConversationAvatar({ name, uri }: { name: string; uri?: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  return (
    <View style={styles.avatar}>
      {uri && !imageFailed ? (
        <Image
          accessibilityLabel={`${name}'s profile photo`}
          onError={() => setImageFailed(true)}
          source={{ uri }}
          style={styles.avatarImage}
        />
      ) : (
        <Ionicons
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          name="person"
          size={22}
          color={colors.primary}
        />
      )}
    </View>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const response = await messageAPI.getConversations();
      setConversations(normalizeConversations(response?.data));
    } catch (loadError) {
      console.error('Error loading conversations:', loadError);
      setError('We could not load your conversations. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const totalUnread = useMemo(
    () => conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    [conversations],
  );
  const pagePadding = width >= 768 ? layout.screenPaddingWide : layout.screenPadding;

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const name = item.otherUser?.name ?? 'SolveConnect member';
    const jobTitle = item.jobTitle ?? 'Service request';
    const lastMessage = item.lastMessage ?? 'No messages yet. Start the conversation.';
    const time = formatConversationTime(item.lastMessageTime);
    const unreadLabel = item.unreadCount
      ? `${item.unreadCount} unread message${item.unreadCount === 1 ? '' : 's'}`
      : undefined;
    const accessibilityLabel = [name, jobTitle, unreadLabel, lastMessage, time]
      .filter(Boolean)
      .join('. ');

    return (
      <Pressable
        accessibilityHint="Opens this conversation"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        android_ripple={{ color: colors.primarySoft }}
        onPress={() => router.push(`/chat/${item.jobId}`)}
        style={({ pressed }) => [
          styles.conversationCard,
          item.unreadCount > 0 && styles.conversationCardUnread,
          pressed && styles.conversationCardPressed,
        ]}
      >
        <ConversationAvatar name={name} uri={item.otherUser?.profilePhoto} />

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text numberOfLines={1} style={styles.userName}>
              {name}
            </Text>
            {time ? (
              <Text numberOfLines={1} style={styles.timeText}>
                {time}
              </Text>
            ) : null}
          </View>

          <View style={styles.jobRow}>
            <Ionicons
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              name="briefcase-outline"
              size={13}
              color={colors.primary}
            />
            <Text numberOfLines={1} style={styles.jobTitle}>
              {jobTitle}
            </Text>
          </View>

          <Text
            numberOfLines={1}
            style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
          >
            {lastMessage}
          </Text>
        </View>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.trailing}
        >
          {item.unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={colors.borderStrong} />
        </View>
      </Pressable>
    );
  };

  const showLoadingState = loading && conversations.length === 0 && !error;
  const showErrorState = Boolean(error) && conversations.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentShell}>
        <ScreenHeader
          title="Messages"
          subtitle="Keep every request and service conversation in one place."
          rightAction={
            width >= 480 && totalUnread > 0 ? (
              <StatusBadge
                compact
                icon="chatbubble-ellipses"
                label={`${totalUnread > 99 ? '99+' : totalUnread} unread`}
                tone="info"
              />
            ) : undefined
          }
          style={[styles.header, { paddingHorizontal: pagePadding }]}
        />

        {showLoadingState ? (
          <LoadingState label="Loading conversations..." style={styles.stateContainer} />
        ) : showErrorState ? (
          <EmptyState
            actionLabel="Try again"
            description={error}
            icon="cloud-offline-outline"
            onAction={loadConversations}
            style={styles.stateContainer}
            title="Messages are unavailable"
          />
        ) : conversations.length === 0 ? (
          <EmptyState
            description="Once you connect on a request, your messages with that person will appear here."
            icon="chatbubbles-outline"
            style={styles.stateContainer}
            title="No conversations yet"
          />
        ) : (
          <FlatList
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: pagePadding },
            ]}
            data={conversations}
            keyExtractor={(item) => item.jobId}
            ListHeaderComponent={
              error ? (
                <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.inlineError}>
                  <View style={styles.inlineErrorCopy}>
                    <Ionicons name="cloud-offline-outline" size={18} color={colors.danger} />
                    <Text style={styles.inlineErrorText}>{error}</Text>
                  </View>
                  <AppButton
                    icon="refresh"
                    label="Retry"
                    onPress={loadConversations}
                    size="small"
                    variant="ghost"
                  />
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl
                colors={[colors.primary]}
                onRefresh={loadConversations}
                refreshing={loading}
                tintColor={colors.primary}
              />
            }
            renderItem={renderConversationItem}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  contentShell: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: layout.readingMaxWidth,
    width: '100%',
  },
  header: {
    paddingBottom: spacing.md,
    paddingTop: spacing.xl,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.page,
    paddingTop: spacing.sm,
  },
  conversationCard: {
    ...shadows.low,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 92,
    padding: spacing.md,
  },
  conversationCardUnread: {
    borderColor: colors.borderStrong,
  },
  conversationCardPressed: {
    backgroundColor: colors.subtle,
    opacity: 0.82,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  conversationContent: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  conversationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  userName: {
    ...typography.bodyStrong,
    color: colors.ink,
    flex: 1,
  },
  timeText: {
    ...typography.caption,
    color: colors.muted,
    flexShrink: 0,
  },
  jobRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  jobTitle: {
    ...typography.caption,
    color: colors.primaryDark,
    flex: 1,
  },
  lastMessage: {
    ...typography.body,
    color: colors.muted,
  },
  lastMessageUnread: {
    color: colors.ink,
    fontWeight: '600',
  },
  trailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: layout.minimumTouchTarget,
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 24,
    minWidth: 24,
    paddingHorizontal: 6,
  },
  unreadText: {
    ...typography.caption,
    color: colors.inverse,
    fontWeight: '800',
  },
  stateContainer: {
    flex: 1,
  },
  inlineError: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  inlineErrorCopy: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  inlineErrorText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
  },
});
