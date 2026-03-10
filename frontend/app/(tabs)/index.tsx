import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { jobAPI } from '../../services/api';
import * as Location from 'expo-location';

const CATEGORIES = [
  { id: 'electrician', name: 'Electrician', icon: 'flash' },
  { id: 'plumber', name: 'Plumber', icon: 'water' },
  { id: 'generator-tech', name: 'Generator Tech', icon: 'hardware-chip' },
  { id: 'tailor', name: 'Tailor/Fashion', icon: 'shirt' },
  { id: 'hairdresser', name: 'Hairdresser', icon: 'cut' },
  { id: 'mechanic', name: 'Mechanic', icon: 'car' },
  { id: 'ac-tech', name: 'AC Technician', icon: 'snow' },
  { id: 'phone-repair', name: 'Phone Repair', icon: 'phone-portrait' },
  { id: 'caterer', name: 'Caterer', icon: 'restaurant' },
  { id: 'event-planner', name: 'Event Planner', icon: 'calendar' },
  { id: 'photographer', name: 'Photographer', icon: 'camera' },
  { id: 'makeup-artist', name: 'Makeup Artist', icon: 'color-palette' },
  { id: 'driver', name: 'Driver', icon: 'car-sport' },
  { id: 'cleaner', name: 'Cleaner', icon: 'sparkles' },
  { id: 'bricklayer', name: 'Bricklayer', icon: 'cube' },
  { id: 'carpenter', name: 'Carpenter', icon: 'hammer' },
  { id: 'painter', name: 'Painter', icon: 'brush' },
  { id: 'welder', name: 'Welder', icon: 'flame' },
  { id: 'tiler', name: 'Tiler', icon: 'grid' },
  { id: 'tutor', name: 'Tutor', icon: 'school' },
  { id: 'security', name: 'Security Guard', icon: 'shield-checkmark' },
  { id: 'laundry', name: 'Laundry Service', icon: 'water' },
  { id: 'dj', name: 'DJ', icon: 'musical-notes' },
  { id: 'dispatch', name: 'Dispatch Rider', icon: 'bicycle' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [nearbyJobs, setNearbyJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    loadLocation();
  }, []);

  const loadLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show nearby jobs');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      loadNearbyJobs(loc.coords);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadNearbyJobs = async (coords?: any) => {
    if (user?.role !== 'helper') return;
    
    setLoading(true);
    try {
      const params: any = { status: 'posted' };
      if (coords || location) {
        const { latitude, longitude } = coords || location;
        params.lat = latitude;
        params.lng = longitude;
      }
      
      const response = await jobAPI.getJobs(params);
      setNearbyJobs(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    loadLocation();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.name}!</Text>
          <Text style={styles.subtitle}>
            {user?.role === 'helper' ? 'Find jobs near you' : 'Get help from nearby helpers'}
          </Text>
        </View>

        {user?.role === 'need_help' && (
          <TouchableOpacity
            style={styles.postButton}
            onPress={() => router.push('/post-problem')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.postButtonText}>Post a Problem</Text>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => router.push(`/(tabs)/helpers?category=${category.id}`)}
              >
                <Ionicons name={category.icon as any} size={32} color="#000" />
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {user?.role === 'helper' && nearbyJobs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Jobs</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/requests')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {nearbyJobs.map((job) => (
              <TouchableOpacity
                key={job._id}
                style={styles.jobCard}
                onPress={() => router.push(`/job/${job._id}`)}
              >
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  {job.distance && (
                    <View style={styles.distanceBadge}>
                      <Ionicons name="location-outline" size={14} color="#666" />
                      <Text style={styles.distanceText}>{job.distance} km</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.jobDescription} numberOfLines={2}>
                  {job.description}
                </Text>
                <View style={styles.jobFooter}>
                  <Text style={styles.jobBudget}>${job.budget}</Text>
                  <Text style={styles.jobCategory}>{job.category}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {user?.role === 'need_help' && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={24} color="#666" />
            <Text style={styles.infoText}>
              Post your problem and get help from skilled helpers nearby.
            </Text>
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
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  categoryName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  jobCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
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
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobBudget: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  jobCategory: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});