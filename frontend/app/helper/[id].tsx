import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { userAPI, reviewAPI } from '../../services/api';

export default function HelperProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [helper, setHelper] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHelperProfile = useCallback(async () => {
    try {
      const [helperResponse, reviewsResponse] = await Promise.all([
        userAPI.getUser(id as string),
        reviewAPI.getHelperReviews(id as string),
      ]);
      
      setHelper(helperResponse.data);
      setReviews(reviewsResponse.data);
    } catch (error) {
      console.error('Error loading helper profile:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadHelperProfile();
  }, [loadHelperProfile]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  if (!helper) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Helper not found</Text>
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
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {helper.profile_photo ? (
              <Image source={{ uri: helper.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={64} color="#999" />
              </View>
            )}
          </View>
          
          <Text style={styles.name}>{helper.name}</Text>
          {helper.email && <Text style={styles.contact}>{helper.email}</Text>}
          {helper.phone && <Text style={styles.contact}>{helper.phone}</Text>}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={32} color="#FFD700" />
            <Text style={styles.statValue}>
              {helper.rating > 0 ? helper.rating.toFixed(1) : '0.0'}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
            <Text style={styles.statValue}>{helper.completed_jobs_count || 0}</Text>
            <Text style={styles.statLabel}>Jobs Completed</Text>
          </View>
        </View>

        {helper.skills && helper.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {helper.skills.map((skill: string, index: number) => (
                <View key={index} style={styles.skillBadge}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {helper.location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.locationText}>{helper.location.address}</Text>
            </View>
          </View>
        )}

        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
            {reviews.map((review) => (
              <View key={review._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.ratingContainer}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < review.rating ? 'star' : 'star-outline'}
                        size={16}
                        color="#FFD700"
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
                {review.user_name && (
                  <Text style={styles.reviewAuthor}>- {review.user_name}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  header: {
    padding: 16,
  },
  scrollContent: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  contact: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillBadge: {
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  skillText: {
    fontSize: 14,
    color: '#000',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewAuthor: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});
