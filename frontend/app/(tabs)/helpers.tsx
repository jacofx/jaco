import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { helperAPI } from '../../services/api';
import * as Location from 'expo-location';

const CATEGORIES = ['electrician', 'plumber', 'generator-tech', 'tailor', 'hairdresser', 'mechanic', 'ac-tech', 'phone-repair', 'caterer', 'event-planner', 'photographer', 'makeup-artist', 'driver', 'cleaner', 'bricklayer', 'carpenter', 'painter', 'welder', 'tiler', 'tutor', 'security', 'laundry', 'dj', 'dispatch'];

export default function HelpersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [helpers, setHelpers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(params.category as string || '');
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    loadLocation();
  }, []);

  useEffect(() => {
    loadHelpers();
  }, [selectedCategory]);

  const loadLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadHelpers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      if (location) {
        params.lat = location.latitude;
        params.lng = location.longitude;
      }
      
      const response = await helperAPI.getHelpers(params);
      setHelpers(response.data);
    } catch (error) {
      console.error('Error loading helpers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHelpers = helpers.filter((helper) =>
    helper.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHelperItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.helperCard}
      onPress={() => router.push(`/helper/${item._id}`)}
    >
      <View style={styles.helperAvatar}>
        {item.profile_photo ? (
          <Image source={{ uri: item.profile_photo }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person" size={32} color="#999" />
        )}
      </View>
      
      <View style={styles.helperInfo}>
        <Text style={styles.helperName}>{item.name}</Text>
        
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>
            {item.rating > 0 ? item.rating.toFixed(1) : 'New'}
          </Text>
          <Text style={styles.jobsCount}>
            ({item.completed_jobs_count} jobs)
          </Text>
        </View>
        
        {item.skills && item.skills.length > 0 && (
          <View style={styles.skillsContainer}>
            {item.skills.slice(0, 2).map((skill: string, index: number) => (
              <View key={index} style={styles.skillBadge}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {item.skills.length > 2 && (
              <Text style={styles.moreSkills}>+{item.skills.length - 2}</Text>
            )}
          </View>
        )}
        
        {item.distance && (
          <View style={styles.distanceContainer}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.distanceText}>{item.distance} km away</Text>
          </View>
        )}
      </View>
      
      <Ionicons name="chevron-forward" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search helpers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={styles.categoriesContainer}>
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipActive,
          ]}
          onPress={() => setSelectedCategory('')}
        >
          <Text
            style={[
              styles.categoryChipText,
              !selectedCategory && styles.categoryChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {filteredHelpers.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No helpers found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredHelpers}
          renderItem={renderHelperItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadHelpers} />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
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
  listContent: {
    padding: 16,
  },
  helperCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  helperAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  helperInfo: {
    flex: 1,
  },
  helperName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  jobsCount: {
    fontSize: 12,
    color: '#666',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  skillBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  moreSkills: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 8,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
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