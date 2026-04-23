import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AuthShell from '@/components/auth/auth-shell';
import { API_BASE_URL, parseApiResponse } from '@/lib/api';

const teal = '#008080';

type DriverAuthResponse = {
  token: string;
  driver: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
  };
};

export default function DriverRegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !phoneNumber.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Please complete all fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/driver-auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          password,
        }),
      });

      await parseApiResponse<DriverAuthResponse>(response);
      Alert.alert('Account created', 'Your driver account has been created. Please sign in.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      Alert.alert('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Start driving"
      title="Create your driver account"
      subtitle="Set up NexGO Driver once and add your vehicle details from your profile after sign in.">
      <View style={styles.formStack}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full name</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={20} color={teal} />
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              autoCapitalize="words"
              textContentType="name"
              placeholderTextColor="#93A5A2"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={20} color={teal} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="driver@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              placeholderTextColor="#93A5A2"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone number</Text>
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={20} color={teal} />
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="07X XXX XXXX"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              placeholderTextColor="#93A5A2"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color={teal} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry={!isPasswordVisible}
              textContentType="newPassword"
              placeholderTextColor="#93A5A2"
            />
            <Pressable
              style={styles.iconButton}
              onPress={() => setIsPasswordVisible((current) => !current)}
              hitSlop={8}>
              <Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={21} color="#617C79" />
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable style={[styles.primaryButton, loading && styles.buttonDisabled]} disabled={loading} onPress={onSubmit}>
        <Text style={styles.primaryButtonText}>{loading ? 'Creating account...' : 'Create account'}</Text>
        <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
      </Pressable>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already registered?</Text>
        <Pressable onPress={() => router.push('/login')}>
          <Text style={styles.footerLink}>Sign in</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  formStack: {
    gap: 13,
  },
  inputGroup: {
    gap: 5,
  },
  label: {
    fontSize: 12,
    color: '#2E4644',
    fontWeight: '800',
  },
  inputRow: {
    minHeight: 46,
    borderBottomWidth: 1.5,
    borderBottomColor: '#CFE0DD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#102A28',
    fontWeight: '600',
    paddingVertical: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    marginTop: 5,
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    backgroundColor: teal,
    shadowColor: '#005D5D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  footerRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: '#617C79',
    fontSize: 14,
    fontWeight: '600',
  },
  footerLink: {
    color: teal,
    fontSize: 14,
    fontWeight: '900',
  },
});
