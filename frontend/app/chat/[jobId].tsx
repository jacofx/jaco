import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, LoadingState } from '../../components/ui';
import { colors, layout, radius, spacing, typography } from '../../constants/theme';
import { useSocket } from '../../contexts/SocketContext';
import { jobAPI, messageAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/error';
import { useAuthStore } from '../../store/authStore';

interface ChatMessage {
  _id?: string;
  job_id?: string;
  sender_id?: string;
  receiver_id?: string;
  message: string;
  timestamp?: string | number | Date;
}

interface ChatJob {
  _id?: unknown;
  title?: unknown;
  user_id?: unknown;
  helper_id?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asIdentifier(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (isRecord(value)) {
    return asIdentifier(value._id ?? value.id);
  }

  return null;
}

function asMessage(value: unknown): ChatMessage | null {
  if (!isRecord(value) || typeof value.message !== 'string' || !value.message.trim()) {
    return null;
  }

  const timestamp = value.timestamp;

  return {
    _id: asIdentifier(value._id) ?? undefined,
    job_id: asIdentifier(value.job_id) ?? undefined,
    sender_id: asIdentifier(value.sender_id) ?? undefined,
    receiver_id: asIdentifier(value.receiver_id) ?? undefined,
    message: value.message.trim(),
    timestamp:
      typeof timestamp === 'string' ||
      typeof timestamp === 'number' ||
      timestamp instanceof Date
        ? timestamp
        : undefined,
  };
}

function mergeMessages(messages: ChatMessage[]): ChatMessage[] {
  const seenIds = new Set<string>();

  return messages.filter((message) => {
    if (!message._id) {
      return true;
    }

    if (seenIds.has(message._id)) {
      return false;
    }

    seenIds.add(message._id);
    return true;
  });
}

function formatMessageTime(value: ChatMessage['timestamp']): string | null {
  if (value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return null;
  }
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string | string[] }>();
  const routeJobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [job, setJob] = useState<ChatJob | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadRequestRef = useRef(0);
  const sendInFlightRef = useRef(false);
  const isWide = width >= 768;
  const horizontalPadding = isWide ? layout.screenPaddingWide : layout.screenPadding;
  const availableWidth = Math.min(width, layout.readingMaxWidth) - horizontalPadding * 2;
  const bubbleMaxWidth = Math.min(480, Math.max(160, availableWidth * (isWide ? 0.72 : 0.82)));
  const currentUserId = asIdentifier(user?._id);
  const jobTitle = typeof job?.title === 'string' && job.title.trim() ? job.title : 'Conversation';

  const scrollToLatest = useCallback((animated = true) => {
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }

    scrollTimerRef.current = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
      scrollTimerRef.current = null;
    }, 80);
  }, []);

  useEffect(
    () => () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    },
    [],
  );

  const handleNewMessage = useCallback(
    (value: unknown) => {
      const message = asMessage(value);

      if (!message || message.job_id !== routeJobId) {
        return;
      }

      setMessages((current) => mergeMessages([...current, message]));
      scrollToLatest();
    },
    [routeJobId, scrollToLatest],
  );

  const loadJobAndMessages = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setLoadError(null);
    setSendError(null);

    if (!routeJobId) {
      setLoadError('This conversation link is incomplete. Return to your requests and open it again.');
      setLoading(false);
      return;
    }

    if (!currentUserId) {
      setLoadError('Your account details are unavailable. Please sign in again to open this conversation.');
      setLoading(false);
      return;
    }

    try {
      const [jobResponse, messagesResponse] = await Promise.all([
        jobAPI.getJob(routeJobId),
        messageAPI.getJobMessages(routeJobId),
      ]);

      if (requestId !== loadRequestRef.current) {
        return;
      }

      const nextJob = isRecord(jobResponse.data) ? (jobResponse.data as ChatJob) : null;
      const ownerId = asIdentifier(nextJob?.user_id);
      const helperId = asIdentifier(nextJob?.helper_id);
      const nextOtherUserId =
        currentUserId === ownerId ? helperId : currentUserId === helperId ? ownerId : null;
      const loadedMessages = Array.isArray(messagesResponse.data)
        ? messagesResponse.data.map(asMessage).filter((message): message is ChatMessage => Boolean(message))
        : [];

      setJob(nextJob);
      setOtherUserId(nextOtherUserId);
      setMessages((current) =>
        mergeMessages([
          ...loadedMessages,
          ...current.filter((message) => message.job_id === routeJobId),
        ]),
      );
      scrollToLatest(false);
    } catch (error) {
      if (requestId !== loadRequestRef.current) {
        return;
      }

      console.error('Error loading chat:', error);
      setLoadError(
        getApiErrorMessage(error, 'We could not load this conversation. Please try again.'),
      );
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [currentUserId, routeJobId, scrollToLatest]);

  useEffect(() => {
    void loadJobAndMessages();

    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadJobAndMessages]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [handleNewMessage, socket]);

  const handleSendMessage = async () => {
    const messageText = newMessage.trim();

    if (!messageText || !otherUserId || !routeJobId || sendInFlightRef.current) {
      return;
    }

    sendInFlightRef.current = true;
    setSending(true);
    setSendError(null);

    try {
      const response = await messageAPI.sendMessage({
        job_id: routeJobId,
        receiver_id: otherUserId,
        message: messageText,
      });
      const sentMessage = asMessage(response.data);

      if (!sentMessage) {
        throw new Error('The message was sent, but the server returned an invalid response.');
      }

      setMessages((current) => mergeMessages([...current, sentMessage]));
      setNewMessage((current) => (current.trim() === messageText ? '' : current));
      scrollToLatest();
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError(getApiErrorMessage(error, 'Your message could not be sent. Please try again.'));
    } finally {
      sendInFlightRef.current = false;
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = item.sender_id === currentUserId;
    const messageTime = formatMessageTime(item.timestamp);
    const senderLabel = isMyMessage ? 'You' : 'Other participant';

    return (
      <View style={[styles.messageRow, isMyMessage && styles.myMessageRow]}>
        <View
          accessible
          accessibilityLabel={`${senderLabel} said: ${item.message}${messageTime ? `. ${messageTime}` : ''}`}
          style={[
            styles.messageBubble,
            { maxWidth: bubbleMaxWidth },
            isMyMessage && styles.myMessageBubble,
          ]}
        >
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[styles.messageText, isMyMessage && styles.myMessageText]}
          >
            {item.message}
          </Text>
          {messageTime ? (
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[styles.messageTime, isMyMessage && styles.myMessageTime]}
            >
              {messageTime}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const inputUnavailable = !otherUserId;
  const sendDisabled = !newMessage.trim() || sending || inputUnavailable;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerShell}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={spacing.xs}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>

          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.headerGlyph}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
          </View>

          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
              {jobTitle}
            </Text>
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              Request conversation
            </Text>
          </View>

          {routeJobId ? (
            <Pressable
              accessibilityHint="Opens the request details"
              accessibilityLabel="View request details"
              accessibilityRole="button"
              hitSlop={spacing.xs}
              onPress={() => router.push(`/job/${routeJobId}`)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <Ionicons name="information-circle-outline" size={23} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={styles.iconButtonPlaceholder} />
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.chatContainer}
      >
        <View style={[styles.conversation, isWide && styles.conversationWide]}>
          {loading ? (
            <LoadingState fullScreen label="Loading conversation" />
          ) : loadError ? (
            <View style={styles.stateContainer}>
              <EmptyState
                actionLabel="Try again"
                description={loadError}
                icon="cloud-offline-outline"
                onAction={() => void loadJobAndMessages()}
                onSecondaryAction={() => router.back()}
                secondaryActionLabel="Go back"
                title="Conversation unavailable"
              />
            </View>
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                contentContainerStyle={[
                  styles.messagesList,
                  { paddingHorizontal: horizontalPadding },
                  messages.length === 0 && styles.messagesListEmpty,
                ]}
                data={messages}
                initialNumToRender={20}
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item, index) =>
                  item._id ?? `${item.sender_id ?? 'unknown'}-${String(item.timestamp ?? 'message')}-${index}`
                }
                ListEmptyComponent={
                  <EmptyState
                    compact
                    description="Send a message to start the conversation about this request."
                    icon="chatbubbles-outline"
                    title="No messages yet"
                  />
                }
                onLayout={() => scrollToLatest(false)}
                removeClippedSubviews={Platform.OS === 'android'}
                renderItem={renderMessage}
                style={styles.messageList}
                windowSize={9}
              />

              <View style={[styles.composer, { paddingHorizontal: horizontalPadding }]}>
                {sendError ? (
                  <View
                    accessibilityLiveRegion="polite"
                    accessibilityRole="alert"
                    style={styles.inlineMessage}
                  >
                    <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
                    <Text style={styles.inlineErrorText}>{sendError}</Text>
                  </View>
                ) : inputUnavailable ? (
                  <View accessibilityLiveRegion="polite" style={styles.inlineMessage}>
                    <Ionicons name="information-circle-outline" size={17} color={colors.muted} />
                    <Text style={styles.inlineNoticeText}>
                      Messaging becomes available when a provider is connected to this request.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.composerRow}>
                  <View style={[styles.inputShell, inputUnavailable && styles.inputShellDisabled]}>
                    <TextInput
                      accessibilityHint="Maximum 500 characters"
                      accessibilityLabel="Message"
                      editable={!inputUnavailable}
                      maxLength={500}
                      multiline
                      onChangeText={(value) => {
                        setNewMessage(value);
                        if (sendError) {
                          setSendError(null);
                        }
                      }}
                      placeholder={inputUnavailable ? 'Messaging unavailable' : 'Write a message'}
                      placeholderTextColor={colors.muted}
                      selectionColor={colors.primary}
                      style={styles.input}
                      value={newMessage}
                    />
                  </View>

                  <Pressable
                    accessibilityHint="Sends this message to the other participant"
                    accessibilityLabel="Send message"
                    accessibilityRole="button"
                    accessibilityState={{ busy: sending, disabled: sendDisabled }}
                    disabled={sendDisabled}
                    hitSlop={spacing.xs}
                    onPress={() => void handleSendMessage()}
                    style={({ pressed }) => [
                      styles.sendButton,
                      pressed && !sendDisabled && styles.sendButtonPressed,
                      sendDisabled && styles.sendButtonDisabled,
                    ]}
                  >
                    {sending ? (
                      <ActivityIndicator color={colors.inverse} size="small" />
                    ) : (
                      <Ionicons name="send" size={20} color={colors.inverse} />
                    )}
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  headerShell: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  header: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: layout.readingMaxWidth,
    minHeight: 68,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: layout.minimumTouchTarget,
    justifyContent: 'center',
    width: layout.minimumTouchTarget,
  },
  iconButtonPressed: {
    backgroundColor: colors.subtle,
  },
  iconButtonPlaceholder: {
    height: layout.minimumTouchTarget,
    width: layout.minimumTouchTarget,
  },
  headerGlyph: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    ...typography.title,
    color: colors.ink,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.muted,
  },
  chatContainer: {
    alignItems: 'center',
    flex: 1,
  },
  conversation: {
    backgroundColor: colors.surface,
    flex: 1,
    maxWidth: layout.readingMaxWidth,
    width: '100%',
  },
  conversationWide: {
    borderLeftColor: colors.border,
    borderLeftWidth: 1,
    borderRightColor: colors.border,
    borderRightWidth: 1,
  },
  stateContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  messageList: {
    flex: 1,
  },
  messagesList: {
    flexGrow: 1,
    paddingVertical: spacing.xxl,
  },
  messagesListEmpty: {
    justifyContent: 'center',
  },
  messageRow: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    width: '100%',
  },
  myMessageRow: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderTopLeftRadius: radius.xs,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  myMessageBubble: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.xs,
  },
  messageText: {
    ...typography.bodyLarge,
    color: colors.ink,
    flexShrink: 1,
  },
  myMessageText: {
    color: colors.inverse,
  },
  messageTime: {
    ...typography.caption,
    alignSelf: 'flex-end',
    color: colors.muted,
    fontSize: 11,
  },
  myMessageTime: {
    color: '#DDEFE7',
  },
  composer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  inlineMessage: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineErrorText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
  },
  inlineNoticeText: {
    ...typography.caption,
    color: colors.muted,
    flex: 1,
  },
  composerRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputShell: {
    backgroundColor: colors.canvas,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  inputShellDisabled: {
    backgroundColor: colors.disabledSurface,
    borderColor: colors.border,
  },
  input: {
    ...typography.bodyLarge,
    color: colors.ink,
    maxHeight: 112,
    minHeight: 46,
    paddingBottom: 10,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  sendButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  sendButtonDisabled: {
    backgroundColor: colors.disabled,
  },
});
