import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ImageBackground,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { getJobPromotion, jobAPI } from '../../services/api';
import * as Location from 'expo-location';

const CATEGORIES = [
  { id: 'electrician', name: 'Electrician', icon: 'flash', accent: '#FACC15', surface: '#FEF3C7', ink: '#92400E', ornament: 'flash-outline', backgroundIcon: 'transmission-tower' },
  { id: 'plumber', name: 'Plumber', icon: 'water', accent: '#38BDF8', surface: '#E0F2FE', ink: '#0C4A6E', ornament: 'build-outline', backgroundIcon: 'pipe-wrench' },
  { id: 'generator-tech', name: 'Generator Tech', icon: 'hardware-chip', accent: '#A78BFA', surface: '#EDE9FE', ink: '#4C1D95', ornament: 'flash-outline', backgroundIcon: 'generator-portable' },
  { id: 'tailor', name: 'Tailor/Fashion', icon: 'shirt', accent: '#F472B6', surface: '#FCE7F3', ink: '#9D174D', ornament: 'cut-outline', backgroundIcon: 'sewing-machine' },
  { id: 'hairdresser', name: 'Hairdresser', icon: 'cut', accent: '#FB7185', surface: '#FFE4E6', ink: '#9F1239', ornament: 'sparkles-outline', backgroundIcon: 'hair-dryer' },
  { id: 'mechanic', name: 'Mechanic', icon: 'car', accent: '#F97316', surface: '#FFEDD5', ink: '#9A3412', ornament: 'cog-outline', backgroundIcon: 'car-wrench' },
  { id: 'ac-tech', name: 'AC Technician', icon: 'snow', accent: '#60A5FA', surface: '#DBEAFE', ink: '#1D4ED8', ornament: 'snow-outline', backgroundIcon: 'air-conditioner' },
  { id: 'phone-repair', name: 'Phone Repair', icon: 'phone-portrait', accent: '#22C55E', surface: '#DCFCE7', ink: '#166534', ornament: 'construct-outline', backgroundIcon: 'cellphone-cog' },
  { id: 'caterer', name: 'Caterer', icon: 'restaurant', accent: '#F59E0B', surface: '#FEF3C7', ink: '#92400E', ornament: 'wine-outline', backgroundIcon: 'silverware-fork-knife' },
  { id: 'event-planner', name: 'Event Planner', icon: 'calendar', accent: '#8B5CF6', surface: '#F3E8FF', ink: '#6B21A8', ornament: 'balloon-outline', backgroundIcon: 'calendar-star' },
  { id: 'event-ticket-sales', name: 'Event Ticket Sales', icon: 'ticket', accent: '#F43F5E', surface: '#FFE4E6', ink: '#9F1239', ornament: 'pricetag-outline', backgroundIcon: 'ticket-confirmation' },
  { id: 'photographer', name: 'Photographer', icon: 'camera', accent: '#0EA5E9', surface: '#E0F2FE', ink: '#075985', ornament: 'aperture-outline', backgroundIcon: 'camera-iris' },
  { id: 'makeup-artist', name: 'Makeup Artist', icon: 'color-palette', accent: '#EC4899', surface: '#FCE7F3', ink: '#9D174D', ornament: 'flower-outline', backgroundIcon: 'lipstick' },
  { id: 'driver', name: 'Driver', icon: 'car-sport', accent: '#14B8A6', surface: '#CCFBF1', ink: '#115E59', ornament: 'navigate-outline', backgroundIcon: 'steering' },
  { id: 'cleaner', name: 'Cleaner', icon: 'sparkles', accent: '#2DD4BF', surface: '#CCFBF1', ink: '#115E59', ornament: 'water-outline', backgroundIcon: 'spray-bottle' },
  { id: 'bricklayer', name: 'Bricklayer', icon: 'cube', accent: '#B45309', surface: '#FDE68A', ink: '#78350F', ornament: 'apps-outline', backgroundIcon: 'wall' },
  { id: 'carpenter', name: 'Carpenter', icon: 'hammer', accent: '#D97706', surface: '#FED7AA', ink: '#7C2D12', ornament: 'square-outline', backgroundIcon: 'hammer-screwdriver' },
  { id: 'painter', name: 'Painter', icon: 'brush', accent: '#8B5CF6', surface: '#EDE9FE', ink: '#5B21B6', ornament: 'color-fill-outline', backgroundIcon: 'format-paint' },
  { id: 'welder', name: 'Welder', icon: 'flame', accent: '#EF4444', surface: '#FEE2E2', ink: '#991B1B', ornament: 'flash-outline', backgroundIcon: 'welding-torch' },
  { id: 'tiler', name: 'Tiler', icon: 'grid', accent: '#0F766E', surface: '#CCFBF1', ink: '#134E4A', ornament: 'grid-outline', backgroundIcon: 'grid-large' },
  { id: 'tutor', name: 'Tutor', icon: 'school', accent: '#2563EB', surface: '#DBEAFE', ink: '#1E3A8A', ornament: 'book-outline', backgroundIcon: 'book-education' },
  { id: 'security', name: 'Security Guard', icon: 'shield-checkmark', accent: '#475569', surface: '#E2E8F0', ink: '#1E293B', ornament: 'lock-closed-outline', backgroundIcon: 'shield-account' },
  { id: 'laundry', name: 'Laundry Service', icon: 'water', accent: '#06B6D4', surface: '#CFFAFE', ink: '#155E75', ornament: 'shirt-outline', backgroundIcon: 'washing-machine' },
  { id: 'dj', name: 'DJ', icon: 'musical-notes', accent: '#7C3AED', surface: '#EDE9FE', ink: '#4C1D95', ornament: 'disc-outline', backgroundIcon: 'disc-player' },
  { id: 'dispatch', name: 'Dispatch Rider', icon: 'bicycle', accent: '#16A34A', surface: '#DCFCE7', ink: '#166534', ornament: 'speedometer-outline', backgroundIcon: 'bike-fast' },
];

const CATEGORY_IMAGES: Partial<Record<string, ImageSourcePropType>> = {
  electrician: require('../../assets/categories/electrician.png'),
  plumber: require('../../assets/categories/plumber.png'),
  'generator-tech': require('../../assets/categories/generator-tech.png'),
  tailor: require('../../assets/categories/tailor.png'),
  hairdresser: require('../../assets/categories/hairdresser.png'),
  mechanic: require('../../assets/categories/mechanic.png'),
  'ac-tech': require('../../assets/categories/ac-tech.png'),
  'phone-repair': require('../../assets/categories/phone-repair.png'),
  caterer: require('../../assets/categories/caterer.png'),
  'event-planner': require('../../assets/categories/event-planner.png'),
  'event-ticket-sales': require('../../assets/categories/event-ticket-sales.png'),
  photographer: require('../../assets/categories/photographer.png'),
  'makeup-artist': require('../../assets/categories/makeup-artist.png'),
  driver: require('../../assets/categories/driver.png'),
  cleaner: require('../../assets/categories/cleaner.png'),
  bricklayer: require('../../assets/categories/bricklayer.png'),
  carpenter: require('../../assets/categories/carpenter.png'),
  painter: require('../../assets/categories/painter.png'),
  welder: require('../../assets/categories/welder.png'),
  tiler: require('../../assets/categories/tiler.png'),
  tutor: require('../../assets/categories/tutor.png'),
  security: require('../../assets/categories/security.png'),
  laundry: require('../../assets/categories/laundry.png'),
  dj: require('../../assets/categories/dj.png'),
  dispatch: require('../../assets/categories/dispatch.png'),
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [nearbyJobs, setNearbyJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<any>(null);

  const loadNearbyJobs = useCallback(async (coords?: any) => {
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
  }, [location, user?.role]);

  const loadLocation = useCallback(async () => {
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
  }, [loadNearbyJobs]);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  const onRefresh = () => {
    loadLocation();
  };

  const renderCategoryArtwork = (category: typeof CATEGORIES[number]) => {
    const imageSource = CATEGORY_IMAGES[category.id];

    if (imageSource) {
      return (
        <ImageBackground
          source={imageSource}
          style={styles.categoryArtwork}
          imageStyle={styles.categoryArtworkImage}
        >
          <View style={styles.categoryArtworkOverlay} />
          <View style={styles.categoryLabelOverlay}>
            <Text style={styles.categoryName}>{category.name}</Text>
          </View>
        </ImageBackground>
      );
    }

    return (
      <View style={styles.categoryArtwork}>
        <MaterialCommunityIcons
          name={category.backgroundIcon as any}
          size={64}
          color={category.ink}
          style={styles.categoryBackgroundIcon}
        />
        <View
          style={[
            styles.categoryGlow,
            { backgroundColor: category.accent },
          ]}
        />
        <View
          style={[
            styles.categoryOrbit,
            { borderColor: category.ink },
          ]}
        />
        <View
          style={[
            styles.categoryIconWrap,
            { backgroundColor: category.accent },
          ]}
        >
          <Ionicons name={category.icon as any} size={28} color="#fff" />
        </View>
        <View
          style={[
            styles.categoryMiniBadge,
            { backgroundColor: '#fff' },
          ]}
        >
          <Ionicons name={category.ornament as any} size={14} color={category.ink} />
        </View>
        <View style={styles.categoryLabelOverlay}>
          <Text style={styles.categoryName}>{category.name}</Text>
        </View>
      </View>
    );
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

        {user?.role === 'need_help' ? (
          <View style={styles.marketingCard}>
            <View style={styles.marketingBadge}>
              <Ionicons name="star" size={14} color="#111827" />
              <Text style={styles.marketingBadgeText}>Ad subscription</Text>
            </View>
            <Text style={styles.marketingTitle}>Push your request above regular listings</Text>
            <Text style={styles.marketingText}>
              Boosted and top ads stay pinned longer, carry urgent labels, and get faster helper attention.
            </Text>
            <View style={styles.marketingStats}>
              <View style={styles.marketingStat}>
                <Text style={styles.marketingStatValue}>7 days</Text>
                <Text style={styles.marketingStatLabel}>Boost cycle</Text>
              </View>
              <View style={styles.marketingStat}>
                <Text style={styles.marketingStatValue}>Top slot</Text>
                <Text style={styles.marketingStatLabel}>Premium placement</Text>
              </View>
              <View style={styles.marketingStat}>
                <Text style={styles.marketingStatValue}>Urgent tag</Text>
                <Text style={styles.marketingStatLabel}>More visibility</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.helperSubscriptionCard}>
            <View>
              <Text style={styles.helperSubscriptionLabel}>Seller tools</Text>
              <Text style={styles.helperSubscriptionTitle}>Weekly visibility plan</Text>
            </View>
            <Text style={styles.helperSubscriptionText}>
              Stay first in line for promoted requests and track boosted jobs near you.
            </Text>
          </View>
        )}

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
                style={[styles.categoryCard, { backgroundColor: category.surface }]}
                onPress={() => router.push(`/(tabs)/helpers?category=${category.id}`)}
              >
                {renderCategoryArtwork(category)}
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
              (() => {
                const promotion = getJobPromotion(job);

                return (
                  <TouchableOpacity
                    key={job._id}
                    style={[
                      styles.jobCard,
                      promotion?.id === 'top' && styles.jobCardTop,
                      promotion?.id === 'boost' && styles.jobCardBoost,
                    ]}
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
                    {promotion && promotion.id !== 'free' && (
                      <View
                        style={[
                          styles.jobPromotionBadge,
                          promotion.id === 'top' ? styles.jobPromotionBadgeTop : styles.jobPromotionBadgeBoost,
                        ]}
                      >
                        <Ionicons
                          name={promotion.id === 'top' ? 'flash' : 'trending-up'}
                          size={14}
                          color="#111827"
                        />
                        <Text style={styles.jobPromotionText}>{promotion.label}</Text>
                      </View>
                    )}
                    <Text style={styles.jobDescription} numberOfLines={2}>
                      {job.description}
                    </Text>
                    <View style={styles.jobFooter}>
                      <Text style={styles.jobBudget}>₦{job.budget}</Text>
                      <Text style={styles.jobCategory}>{job.category}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })()
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
  marketingCard: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 18,
    gap: 12,
    marginBottom: 20,
  },
  marketingBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDE68A',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  marketingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
  },
  marketingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  marketingText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#D1D5DB',
  },
  marketingStats: {
    flexDirection: 'row',
    gap: 10,
  },
  marketingStat: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  marketingStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  marketingStatLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  helperSubscriptionCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 22,
    padding: 18,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  helperSubscriptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
    textTransform: 'uppercase',
  },
  helperSubscriptionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#7C2D12',
  },
  helperSubscriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#9A3412',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
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
    gap: 8,
  },
  categoryCard: {
    width: '32%',
    borderRadius: 18,
    justifyContent: 'flex-start',
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    overflow: 'hidden',
  },
  categoryArtwork: {
    width: '100%',
    height: 94,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.46)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryArtworkImage: {
    borderRadius: 16,
  },
  categoryArtworkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.10)',
    borderRadius: 16,
  },
  categoryLabelOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  categoryGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    opacity: 0.18,
    top: -12,
    right: -18,
  },
  categoryBackgroundIcon: {
    position: 'absolute',
    left: 6,
    top: 6,
    opacity: 0.12,
  },
  categoryOrbit: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    opacity: 0.18,
    top: 8,
    left: 10,
  },
  categoryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  categoryMiniBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 15,
    width: '100%',
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
  jobPromotionBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  jobPromotionBadgeBoost: {
    backgroundColor: '#FEF3C7',
  },
  jobPromotionBadgeTop: {
    backgroundColor: '#FED7AA',
  },
  jobPromotionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
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
