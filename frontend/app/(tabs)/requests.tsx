import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { getJobPromotion, jobAPI } from '../../services/api';
import * as Location from 'expo-location';

export default function RequestsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<any>(null);

  const loadJobs = useCallback(async (coords?: any) => {
    setLoading(true);
    try {
      let response;
      
      if (user?.role === 'helper') {
        // Helpers see available jobs to accept
        const params: any = { status: 'posted' };
        if (coords) {
          params.lat = coords.latitude;
          params.lng = coords.longitude;
        }
        response = await jobAPI.getJobs(params);
      } else {
        // Users see their posted jobs
        response = await jobAPI.getMyPostedJobs();
      }
      
      setJobs(response.data);
    } catch {
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  const loadData = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        loadJobs(loc.coords);
      } else {
        loadJobs();
      }
    } catch {
      loadJobs();
    }
  }, [loadJobs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcceptJob = async (jobId: string) => {
    try {
      await jobAPI.acceptJob(jobId);
      Alert.alert('Success', 'Job accepted successfully');
      loadJobs(location);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to accept job');
    }
  };

  const renderJobItem = ({ item }: any) => {
    const promotion = getJobPromotion(item);

    return (
      <TouchableOpacity
        style={[
          styles.jobCard,
          promotion?.id === 'top' && styles.jobCardTop,
          promotion?.id === 'boost' && styles.jobCardBoost,
        ]}
        onPress={() => router.push(`/job/${item._id}`)}
      >
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          {item.distance && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.distanceText}>{item.distance} km</Text>
            </View>
          )}
        </View>

        {promotion && promotion.id !== 'free' && (
          <View
            style={[
              styles.promotionBadge,
              promotion.id === 'top' ? styles.promotionBadgeTop : styles.promotionBadgeBoost,
            ]}
          >
            <Ionicons
              name={promotion.id === 'top' ? 'flash' : 'trending-up'}
              size={14}
              color="#111827"
            />
            <Text style={styles.promotionBadgeText}>{promotion.label}</Text>
          </View>
        )}

        <Text style={styles.jobDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.jobMeta}>
          <Text style={styles.budget}>₦{item.budget}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>

        {user?.role === 'helper' && item.status === 'posted' && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptJob(item._id)}
          >
            <Text style={styles.acceptButtonText}>Accept Job</Text>
          </TouchableOpacity>
        )}

        {user?.role === 'need_help' && item.helper_name && (
          <View style={styles.helperInfo}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.helperText}>Helper: {item.helper_name}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {user?.role === 'need_help' && (
        <View style={styles.subscriptionBanner}>
          <View style={styles.subscriptionCopy}>
            <Text style={styles.subscriptionLabel}>Promote your ad</Text>
            <Text style={styles.subscriptionTitle}>Upgrade a request to boosted or top</Text>
            <Text style={styles.subscriptionText}>
              Featured requests stay ahead of free listings and collect responses faster.
            </Text>
          </View>
          <View style={styles.subscriptionPriceBlock}>
            <Text style={styles.subscriptionPrice}>From NGN 2,500</Text>
            <Text style={styles.subscriptionPriceMeta}>7-day boost</Text>
          </View>
        </View>
      )}

      {jobs.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {user?.role === 'helper'
              ? 'No available jobs right now'
              : 'You haven\'t posted any jobs yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadData} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  subscriptionBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 20,
    backgroundColor: '#111827',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  subscriptionCopy: {
    flex: 1,
    gap: 4,
  },
  subscriptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FDE68A',
    textTransform: 'uppercase',
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  subscriptionText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#D1D5DB',
  },
  subscriptionPriceBlock: {
    alignSelf: 'flex-start',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  subscriptionPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  subscriptionPriceMeta: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  listContent: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  jobCardBoost: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  jobCardTop: {
    borderColor: '#FDBA74',
    backgroundColor: '#FFF7ED',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  promotionBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  promotionBadgeBoost: {
    backgroundColor: '#FEF3C7',
  },
  promotionBadgeTop: {
    backgroundColor: '#FED7AA',
  },
  promotionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  jobMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budget: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  statusBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  acceptButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  helperInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});
