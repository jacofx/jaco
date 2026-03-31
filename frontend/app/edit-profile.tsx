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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { userAPI } from '../services/api';
import { getApiErrorMessage } from '../services/error';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [skills, setSkills] = useState(user?.skills?.join(', ') ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const skillsArray =
      user?.role === 'helper'
        ? skills.split(',').map((skill) => skill.trim()).filter(Boolean)
        : undefined;

    if (!trimmedName) {
      Alert.alert('Missing Name', 'Name is required.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await userAPI.updateUser({
        name: trimmedName,
        ...(user?.role === 'helper' ? { skills: skillsArray } : {}),
      });

      setUser(response.data);
      Alert.alert('Profile Updated', 'Your profile changes have been saved.');
      router.back();
    } catch (error: any) {
      Alert.alert('Update Failed', getApiErrorMessage(error, 'Unable to update profile.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update the details shown on your account.</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#999"
            />
          </View>

          {user?.email ? (
            <View style={styles.section}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.readonlyField}>
                <Text style={styles.readonlyText}>{user.email}</Text>
              </View>
            </View>
          ) : null}

          {user?.phone ? (
            <View style={styles.section}>
              <Text style={styles.label}>Phone</Text>
              <View style={styles.readonlyField}>
                <Text style={styles.readonlyText}>{user.phone}</Text>
              </View>
            </View>
          ) : null}

          {user?.role === 'helper' ? (
            <View style={styles.section}>
              <Text style={styles.label}>Skills</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={skills}
                onChangeText={setSkills}
                placeholder="electrician, plumber, painter"
                placeholderTextColor="#999"
                multiline
              />
              <Text style={styles.helperText}>Separate skills with commas.</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
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
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  readonlyField: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
  },
  readonlyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
