import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adsAPI, jobAPI } from '../services/api';
import * as Location from 'expo-location';
import { getApiErrorMessage } from '../services/error';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

const CATEGORIES = ['electrician', 'plumber', 'generator-tech', 'tailor', 'hairdresser', 'mechanic', 'ac-tech', 'phone-repair', 'caterer', 'event-planner', 'photographer', 'makeup-artist', 'driver', 'cleaner', 'bricklayer', 'carpenter', 'painter', 'welder', 'tiler', 'tutor', 'security', 'laundry', 'dj', 'dispatch'];
const AD_PACKAGES = [
  {
    id: 'free',
    name: 'Free listing',
    price: 'Free',
    description: 'Normal visibility in your area',
    perks: ['Visible in category search', 'Receives direct helper offers'],
    accent: '#E5E7EB',
  },
  {
    id: 'boost',
    name: 'Boosted ad',
    price: 'NGN 2,500',
    description: 'Higher placement for 7 days',
    perks: ['Priority placement', 'Boost label on your request', 'More helper views'],
    accent: '#FACC15',
  },
  {
    id: 'top',
    name: 'Top ad',
    price: 'NGN 6,000',
    description: 'Premium slot with urgent tag for 14 days',
    perks: ['Top of results', 'Urgent + featured labels', 'Priority support'],
    accent: '#FB923C',
  },
] as const;

export default function PostProblemScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<(typeof AD_PACKAGES)[number]['id']>('free');

  const activePackage = AD_PACKAGES.find((item) => item.id === selectedPackage) || AD_PACKAGES[0];

  const promotionPayload = {
    id: activePackage.id,
    label: activePackage.name,
    price: activePackage.price,
    duration_days: activePackage.id === 'boost' ? 7 : activePackage.id === 'top' ? 14 : 0,
    priority_level: activePackage.id === 'boost' ? 1 : activePackage.id === 'top' ? 2 : 0,
    featured: activePackage.id === 'top',
    urgent: activePackage.id === 'top',
  };

  const handleGetLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const nextLocation = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        address: address[0] ? `${address[0].street}, ${address[0].city}` : 'Current Location',
      };
      setLocation(nextLocation);
    } catch {
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setGettingLocation(false);
    }
  };

  const handlePost = async () => {
    if (!title || !description || !budget || !category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Please set your location');
      return;
    }

    setLoading(true);
    try {
      let paymentId: string | undefined;

      if (selectedPackage !== 'free') {
        const redirectUri = Linking.createURL('ads-payment');
        const checkoutResponse = await adsAPI.checkout(selectedPackage, redirectUri);
        paymentId = checkoutResponse.data?.payment?._id;
        const checkoutUrl = checkoutResponse.data?.checkout_url;
        const requiresRedirect = checkoutResponse.data?.requires_redirect;

        if (!paymentId) {
          throw new Error('Payment could not be completed');
        }

        if (requiresRedirect) {
          if (!checkoutUrl) {
            throw new Error('Checkout URL is missing');
          }

          const paymentResult = await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectUri);

          if (paymentResult.type !== 'success' || !paymentResult.url) {
            throw new Error('Payment was cancelled');
          }

          const parsed = Linking.parse(paymentResult.url);
          const status = Array.isArray(parsed.queryParams?.status)
            ? parsed.queryParams?.status[0]
            : parsed.queryParams?.status;
          const sessionId = Array.isArray(parsed.queryParams?.session_id)
            ? parsed.queryParams?.session_id[0]
            : parsed.queryParams?.session_id;

          if (status !== 'success' || !sessionId) {
            throw new Error('Payment was not completed');
          }

          await adsAPI.verify(paymentId, sessionId);
        }
      }

      await jobAPI.createJob({
        title,
        description,
        budget: parseFloat(budget),
        category,
        location,
        ad_package: selectedPackage,
        promotion: promotionPayload,
        promotion_days: promotionPayload.duration_days,
        priority_level: promotionPayload.priority_level,
        is_featured: promotionPayload.featured,
        is_urgent: promotionPayload.urgent,
        payment_id: paymentId,
      });

      Alert.alert(
        'Success',
        selectedPackage === 'free'
          ? 'Problem posted successfully'
          : `${activePackage.name} purchased and saved with your post`,
        [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to post problem'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Post a Problem</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.form}>
            <View style={styles.heroCard}>
              <View style={styles.heroBadge}>
                <Ionicons name="megaphone-outline" size={16} color="#111827" />
                <Text style={styles.heroBadgeText}>Ads subscription</Text>
              </View>
              <Text style={styles.heroTitle}>Post like a marketplace listing</Text>
              <Text style={styles.heroText}>
                Choose a package before publishing. Free works, but boosted ads stay visible longer and get faster helper attention.
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Fix broken pipe"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your problem in detail..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Budget (₦) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 5000"
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoriesContainer}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      category === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location *</Text>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleGetLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <ActivityIndicator color="#111827" />
                ) : (
                  <>
                    <Ionicons name="location-outline" size={24} color="#111827" />
                    <Text style={styles.locationButtonText}>
                      {location ? location.address : 'Get Current Location'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Ad package</Text>
              <View style={styles.packageList}>
                {AD_PACKAGES.map((item) => {
                  const isActive = item.id === selectedPackage;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.packageCard,
                        isActive && styles.packageCardActive,
                        { borderColor: isActive ? item.accent : '#E5E7EB' },
                      ]}
                      onPress={() => setSelectedPackage(item.id)}
                    >
                      <View style={styles.packageHeader}>
                        <View style={styles.packageTitleRow}>
                          <Text style={styles.packageName}>{item.name}</Text>
                          {item.id !== 'free' && (
                            <View style={[styles.packagePill, { backgroundColor: item.accent }]}>
                              <Text style={styles.packagePillText}>Popular</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.packagePrice}>{item.price}</Text>
                      </View>
                      <Text style={styles.packageDescription}>{item.description}</Text>
                      {item.perks.map((perk) => (
                        <View key={perk} style={styles.packagePerkRow}>
                          <Ionicons name="checkmark-circle" size={16} color="#166534" />
                          <Text style={styles.packagePerkText}>{perk}</Text>
                        </View>
                      ))}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Selected package</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTitle}>{activePackage.name}</Text>
                <Text style={styles.summaryPrice}>{activePackage.price}</Text>
              </View>
              <Text style={styles.summaryText}>{activePackage.description}</Text>
            </View>

            <TouchableOpacity
              style={styles.postButton}
              onPress={handlePost}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.postButtonText}>
                  {selectedPackage === 'free' ? 'Post Problem' : `Pay for ${activePackage.name} & Post`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  form: {
    padding: 16,
    gap: 20,
  },
  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDE68A',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#D1D5DB',
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 120,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  categoryChipActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  locationButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  packageList: {
    gap: 12,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  packageCardActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  packageTitleRow: {
    flex: 1,
    gap: 6,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  packageDescription: {
    fontSize: 14,
    color: '#4B5563',
  },
  packagePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  packagePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
  },
  packagePerkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packagePerkText: {
    fontSize: 13,
    color: '#374151',
  },
  summaryCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C2D12',
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C2D12',
  },
  summaryText: {
    fontSize: 14,
    color: '#9A3412',
  },
  postButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
