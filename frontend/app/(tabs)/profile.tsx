import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import * as ImagePicker from 'expo-image-picker';
import { adsAPI, userAPI } from '../../services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);

  useEffect(() => {
    const loadPurchases = async () => {
      try {
        const response = await adsAPI.getPurchases();
        setPurchases(response.data || []);
      } catch {
        setPurchases([]);
      }
    };

    loadPurchases();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setUploading(true);
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        const response = await userAPI.updateUser({ profile_photo: base64Image });
        setUser(response.data);
        Alert.alert('Success', 'Profile photo updated');
      }
    } catch {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleUploadPhoto} disabled={uploading}>
            <View style={styles.avatarContainer}>
              {user?.profile_photo ? (
                <Image source={{ uri: user.profile_photo }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Ionicons name="person" size={48} color="#999" />
                </View>
              )}
              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>{user?.name}</Text>
          {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
          {user?.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
          
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role === 'helper' ? 'Helper' : 'Need Help'}
            </Text>
          </View>
        </View>

        {user?.role === 'helper' && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.statValue}>
                {user.rating ? user.rating.toFixed(1) : '0.0'}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{user.completed_jobs_count || 0}</Text>
              <Text style={styles.statLabel}>Jobs Completed</Text>
            </View>
          </View>
        )}

        {user?.role === 'helper' && user?.skills && user.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {user.skills.map((skill, index) => (
                <View key={index} style={styles.skillBadge}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <View>
              <Text style={styles.subscriptionEyebrow}>Ads subscription</Text>
              <Text style={styles.subscriptionName}>
                {user?.role === 'helper' ? 'Pro helper visibility' : 'Boosted request plan'}
              </Text>
            </View>
            <View style={styles.subscriptionStatus}>
              <Text style={styles.subscriptionStatusText}>Active</Text>
            </View>
          </View>
          <Text style={styles.subscriptionDescription}>
            {user?.role === 'helper'
              ? 'Get early access to promoted requests, stronger placement in helper searches, and weekly lead visibility.'
              : 'Use boosted and top ad packages to keep urgent requests visible and win faster responses from nearby helpers.'}
          </Text>
          <View style={styles.subscriptionBenefits}>
            <View style={styles.subscriptionBenefit}>
              <Ionicons name="flash" size={16} color="#C2410C" />
              <Text style={styles.subscriptionBenefitText}>Priority exposure</Text>
            </View>
            <View style={styles.subscriptionBenefit}>
              <Ionicons name="megaphone" size={16} color="#C2410C" />
              <Text style={styles.subscriptionBenefitText}>Ad boost tools</Text>
            </View>
            <View style={styles.subscriptionBenefit}>
              <Ionicons name="stats-chart" size={16} color="#C2410C" />
              <Text style={styles.subscriptionBenefitText}>Better conversion</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.subscriptionAction}
            onPress={() => router.push('/payments')}
          >
            <Text style={styles.subscriptionActionText}>View payment history</Text>
            <Ionicons name="arrow-forward" size={18} color="#7C2D12" />
          </TouchableOpacity>
        </View>

        {purchases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Ad Payments</Text>
            <View style={styles.purchaseList}>
              {purchases.slice(0, 3).map((purchase) => (
                <TouchableOpacity
                  key={purchase._id}
                  style={styles.purchaseCard}
                  onPress={() => router.push('/payments')}
                >
                  <View>
                    <Text style={styles.purchaseTitle}>{purchase.package_name}</Text>
                    <Text style={styles.purchaseMeta}>
                      {purchase.currency} {purchase.amount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.purchaseStatus}>
                    <Text style={styles.purchaseStatusText}>{purchase.status}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="person-outline" size={24} color="#000" />
            <Text style={styles.menuItemText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="location-outline" size={24} color="#000" />
            <Text style={styles.menuItemText}>Location Settings</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/payments')}>
            <Ionicons name="card-outline" size={24} color="#000" />
            <Text style={styles.menuItemText}>Ad Payments</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/notifications')}>
            <Ionicons name="notifications-outline" size={24} color="#000" />
            <Text style={styles.menuItemText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color="#000" />
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
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
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  subscriptionCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  subscriptionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
    textTransform: 'uppercase',
  },
  subscriptionName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C2D12',
    marginTop: 4,
  },
  subscriptionStatus: {
    backgroundColor: '#FFEDD5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  subscriptionStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
  },
  subscriptionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#9A3412',
  },
  subscriptionBenefits: {
    gap: 10,
  },
  subscriptionAction: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#FED7AA',
    paddingTop: 12,
  },
  subscriptionActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C2D12',
  },
  subscriptionBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subscriptionBenefitText: {
    fontSize: 14,
    color: '#7C2D12',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  purchaseList: {
    gap: 10,
  },
  purchaseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  purchaseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  purchaseMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  purchaseStatus: {
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  purchaseStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'capitalize',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillBadge: {
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skillText: {
    fontSize: 14,
    color: '#000',
    textTransform: 'capitalize',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
