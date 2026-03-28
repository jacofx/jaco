import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getJobPromotion, jobAPI, userAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [jobUser, setJobUser] = useState<any>(null);
  const [helper, setHelper] = useState<any>(null);

  const loadJobDetails = useCallback(async () => {
    try {
      const response = await jobAPI.getJob(id as string);
      setJob(response.data);
      
      // Load user info
      if (response.data.user_id) {
        const userResponse = await userAPI.getUser(response.data.user_id);
        setJobUser(userResponse.data);
      }
      
      // Load helper info if job is accepted
      if (response.data.helper_id) {
        const helperResponse = await userAPI.getUser(response.data.helper_id);
        setHelper(helperResponse.data);
      }
    } catch {
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadJobDetails();
  }, [loadJobDetails]);

  const handleAcceptJob = async () => {
    setActionLoading(true);
    try {
      await jobAPI.acceptJob(id as string);
      Alert.alert('Success', 'Job accepted successfully');
      loadJobDetails();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to accept job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await jobAPI.updateJobStatus(id as string, newStatus);
      Alert.alert('Success', 'Status updated successfully');
      loadJobDetails();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChat = () => {
    router.push(`/chat/${id}`);
  };

  const handleCompleteJob = () => {
    Alert.alert(
      'Complete Job',
      'Mark this job as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => handleUpdateStatus('completed'),
        },
      ]
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

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Job not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isJobPoster = user?._id === job.user_id;
  const isHelper = user?._id === job.helper_id;
  const canAccept = user?.role === 'helper' && job.status === 'posted';
  const canChat = (isJobPoster || isHelper) && job.status !== 'posted';
  const promotion = getJobPromotion(job);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.statusBadgeContainer}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{job.status.replace('_', ' ')}</Text>
          </View>
        </View>

        <Text style={styles.title}>{job.title}</Text>

        {promotion && promotion.id !== 'free' && (
          <View
            style={[
              styles.promotionBanner,
              promotion.id === 'top' ? styles.promotionBannerTop : styles.promotionBannerBoost,
            ]}
          >
            <Ionicons
              name={promotion.id === 'top' ? 'flash' : 'trending-up'}
              size={18}
              color="#111827"
            />
            <View style={styles.promotionCopy}>
              <Text style={styles.promotionTitle}>{promotion.label}</Text>
              <Text style={styles.promotionText}>
                {promotion.id === 'top'
                  ? 'This request is pinned with urgent priority and featured placement.'
                  : 'This request has extra visibility and higher placement.'}
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Ionicons name="pricetag-outline" size={20} color="#666" />
            <Text style={styles.category}>{job.category}</Text>
          </View>
          
          {job.location && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.locationText}>{job.location.address}</Text>
            </View>
          )}
        </View>

        <View style={styles.budgetContainer}>
          <Text style={styles.budgetLabel}>Budget</Text>
          <Text style={styles.budget}>${job.budget}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {jobUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Posted By</Text>
            <View style={styles.userCard}>
              <View style={styles.userAvatar}>
                {jobUser.profile_photo ? (
                  <Image source={{ uri: jobUser.profile_photo }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={24} color="#999" />
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{jobUser.name}</Text>
                {jobUser.email && <Text style={styles.userContact}>{jobUser.email}</Text>}
              </View>
            </View>
          </View>
        )}

        {helper && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Helper</Text>
            <TouchableOpacity
              style={styles.userCard}
              onPress={() => router.push(`/helper/${helper._id}`)}
            >
              <View style={styles.userAvatar}>
                {helper.profile_photo ? (
                  <Image source={{ uri: helper.profile_photo }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={24} color="#999" />
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{helper.name}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {helper.rating > 0 ? helper.rating.toFixed(1) : 'New'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {canAccept && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAcceptJob}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Accept Job</Text>
            )}
          </TouchableOpacity>
        )}

        {canChat && (
          <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
            <Ionicons name="chatbubble-outline" size={24} color="#000" />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        )}

        {(isJobPoster || isHelper) && job.status === 'accepted' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleUpdateStatus('in_progress')}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Start Job</Text>
            )}
          </TouchableOpacity>
        )}

        {isJobPoster && job.status === 'in_progress' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCompleteJob}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Mark as Complete</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  statusBadgeContainer: {
    marginBottom: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  promotionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  promotionBannerBoost: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  promotionBannerTop: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  promotionCopy: {
    flex: 1,
    gap: 4,
  },
  promotionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  promotionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },
  metaContainer: {
    gap: 8,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  category: {
    fontSize: 16,
    color: '#666',
    textTransform: 'capitalize',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  budgetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  budgetLabel: {
    fontSize: 16,
    color: '#666',
  },
  budget: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  userContact: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  chatButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
