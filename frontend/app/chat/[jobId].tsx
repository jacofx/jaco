import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { messageAPI, jobAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../contexts/SocketContext';
import { formatDistanceToNow } from 'date-fns';

export default function ChatScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const handleNewMessage = useCallback((message: any) => {
    if (message.job_id === jobId) {
      setMessages((prev) => [...prev, message]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [jobId]);

  const loadJobAndMessages = useCallback(async () => {
    try {
      // Load job details
      const jobResponse = await jobAPI.getJob(jobId as string);
      setJob(jobResponse.data);
      
      // Determine other user ID
      const otherId = jobResponse.data.user_id === user?._id
        ? jobResponse.data.helper_id
        : jobResponse.data.user_id;
      setOtherUserId(otherId);
      
      // Load messages
      const messagesResponse = await messageAPI.getJobMessages(jobId as string);
      setMessages(messagesResponse.data);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  }, [jobId, user?._id]);

  useEffect(() => {
    loadJobAndMessages();
  }, [loadJobAndMessages]);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', handleNewMessage);
      return () => {
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [handleNewMessage, socket]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !otherUserId) return;
    
    setSending(true);
    try {
      const response = await messageAPI.sendMessage({
        job_id: jobId as string,
        receiver_id: otherUserId,
        message: newMessage.trim(),
      });
      
      setMessages((prev) => [...prev, response.data]);
      setNewMessage('');
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: any) => {
    const isMyMessage = item.sender_id === user?._id;
    
    return (
      <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
        <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}>
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
            {item.message}
          </Text>
          <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {job?.title || 'Chat'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push(`/job/${jobId}`)}>
          <Ionicons name="information-circle-outline" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  chatContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 12,
  },
  myMessageBubble: {
    backgroundColor: '#000',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#000',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
