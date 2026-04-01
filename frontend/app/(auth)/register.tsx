import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiErrorMessage } from '../../services/error';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [role, setRole] = useState<'need_help' | 'helper'>('need_help');
  const [skills, setSkills] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [hasSentCode, setHasSentCode] = useState(false);

  const handleSendCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert('Email Required', 'Enter your email before requesting a verification code.');
      return;
    }

    setIsSendingCode(true);
    try {
      await authAPI.sendEmailCode(trimmedEmail);
      setHasSentCode(true);
      Alert.alert('Verification Code Sent', `A verification code has been sent to ${trimmedEmail}.`);
    } catch (error: any) {
      Alert.alert('Unable to Send Code', getApiErrorMessage(error, 'Please try again.'));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();
    const skillsArray =
      role === 'helper' && skills.trim()
        ? skills.split(',').map((skill) => skill.trim()).filter(Boolean)
        : [];

    if (!trimmedName || !trimmedPassword || !trimmedEmail) {
      Alert.alert('Error', 'Name, email, and password are required');
      return;
    }

    if (!emailVerificationCode.trim()) {
      Alert.alert('Verification Required', 'Enter the email verification code before creating your account.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.register({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        password: trimmedPassword,
        role,
        skills: skillsArray,
        email_verification_code: emailVerificationCode.trim(),
      });

      const { access_token, user_id } = response.data;
      
      await login(access_token, {
        _id: user_id,
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        role,
        skills: skillsArray,
      });

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Registration Failed', getApiErrorMessage(error, 'Please try again'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.brandPanel}>
              <View style={styles.logoWrap}>
                <Image
                  source={require('../../assets/images/solveconnect-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join SolveConnect today</Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#999"
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#999"
              />

              <TouchableOpacity
                style={[styles.secondaryButton, isSendingCode && styles.secondaryButtonDisabled]}
                onPress={handleSendCode}
                disabled={isSendingCode}
              >
                {isSendingCode ? (
                  <ActivityIndicator color="#111827" />
                ) : (
                  <Text style={styles.secondaryButtonText}>
                    {hasSentCode ? 'Resend Verification Code' : 'Send Verification Code'}
                  </Text>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Email verification code"
                value={emailVerificationCode}
                onChangeText={setEmailVerificationCode}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#999"
              />

              <TextInput
                style={styles.input}
                placeholder="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#999"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>I am a:</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'need_help' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('need_help')}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      role === 'need_help' && styles.roleButtonTextActive,
                    ]}
                  >
                    Need Help
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'helper' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('helper')}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      role === 'helper' && styles.roleButtonTextActive,
                    ]}
                  >
                    Helper
                  </Text>
                </TouchableOpacity>
              </View>

              {role === 'helper' && (
                <TextInput
                  style={styles.input}
                  placeholder="Skills (e.g., electrician, plumber)"
                  value={skills}
                  onChangeText={setSkills}
                  placeholderTextColor="#999"
                />
              )}

              <TouchableOpacity
                style={styles.button}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.linkText}>
                  Already have an account? <Text style={styles.linkTextBold}>Login</Text>
                </Text>
              </TouchableOpacity>
            </View>
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
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  brandPanel: {
    backgroundColor: '#111827',
    borderRadius: 28,
    padding: 24,
    marginBottom: 28,
    alignItems: 'center',
  },
  logoWrap: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 42,
    height: 42,
    tintColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryButtonDisabled: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#666',
  },
  linkTextBold: {
    fontWeight: 'bold',
    color: '#000',
  },
});
