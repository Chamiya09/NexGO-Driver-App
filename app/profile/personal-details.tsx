import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE_URL, parseApiResponse } from '@/lib/api';
import { getDriverToken } from '@/lib/driver-session';

const teal = '#008080';

const initialDriverDetails = {
  fullName: 'Chamod Driver',
  email: 'driver@nexgo.lk',
  phoneNumber: '+94 77 123 4567',
  emergencyContact: '+94 71 987 6543',
};

type DriverDetailsField = keyof typeof initialDriverDetails;

export default function DriverPersonalDetailsScreen() {
  const [details, setDetails] = useState(initialDriverDetails);
  const [form, setForm] = useState(initialDriverDetails);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initials = details.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const openEditModal = () => {
    setForm(details);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    setIsEditModalVisible(false);
  };

  const handleChange = (field: DriverDetailsField, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const phoneNumber = form.phoneNumber.trim();
    const emergencyContact = form.emergencyContact.trim();

    if (!fullName || !email || !phoneNumber || !emergencyContact) {
      setErrorMessage('All driver personal detail fields are required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    const token = getDriverToken();
    if (!token) {
      setErrorMessage('Please sign in again to update your driver profile.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/driver-auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName,
          email: email.toLowerCase(),
          phoneNumber,
          emergencyContact,
        }),
      });

      await parseApiResponse<{ driver: unknown }>(response);
      setDetails({
        fullName,
        email: email.toLowerCase(),
        phoneNumber,
        emergencyContact,
      });
      setIsEditModalVisible(false);
      setSuccessMessage('Driver personal details updated.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update driver personal details.');
    }
  };

  const confirmDeleteProfile = () => {
    Alert.alert(
      'Delete driver profile',
      'This placeholder action represents permanently removing the driver profile from NexGO.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#102A28" />
            </Pressable>
            <Text style={styles.topBarTitle}>Personal Details</Text>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroAvatar}>
                <Text style={styles.heroAvatarInitials}>{initials || 'D'}</Text>
              </View>

              <View style={styles.heroIdentity}>
                <Text style={styles.heroName}>{details.fullName}</Text>
                <Text style={styles.heroSubline}>Driver profile and emergency contact details</Text>
              </View>
            </View>

            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark-outline" size={15} color={teal} />
              <Text style={styles.heroBadgeText}>Driver account verified</Text>
            </View>

            <Text style={styles.heroHint}>Keep these details accurate for trip updates, support, and safety checks.</Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>

          <View style={styles.groupCard}>
            <View style={styles.detailsHeader}>
              <View>
                <Text style={styles.detailsTitle}>Driver information</Text>
                <Text style={styles.detailsHint}>Review your current NexGO driver identity details.</Text>
              </View>

              <Pressable style={styles.compactEditButton} onPress={openEditModal}>
                <Ionicons name="create-outline" size={14} color={teal} />
                <Text style={styles.compactEditButtonText}>Edit</Text>
              </Pressable>
            </View>

            <DetailRow label="Full name" value={details.fullName} />
            <DetailRow label="Email" value={details.email} />
            <DetailRow label="Phone number" value={details.phoneNumber} />
            <DetailRow label="Emergency contact" value={details.emergencyContact} />
          </View>

          <Text style={styles.sectionTitle}>DANGER ZONE</Text>

          <View style={styles.groupCard}>
            <View style={styles.dangerCard}>
              <View style={styles.dangerHeader}>
                <View style={styles.dangerIconWrap}>
                  <Ionicons name="trash-outline" size={16} color="#C13B3B" />
                </View>

                <View style={styles.dangerTextWrap}>
                  <Text style={styles.dangerTitle}>Delete driver profile</Text>
                  <Text style={styles.dangerText}>Remove this driver profile and associated verification records.</Text>
                </View>
              </View>

              <Pressable style={styles.deleteButton} onPress={confirmDeleteProfile}>
                <Text style={styles.deleteButtonText}>Delete Profile</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isEditModalVisible} transparent animationType="fade" onRequestClose={closeEditModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={styles.modalKeyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Update Personal Details</Text>
                    <Text style={styles.modalSubtitle}>Edit your driver account information.</Text>
                  </View>

                  <Pressable style={styles.closeButton} onPress={closeEditModal}>
                    <Ionicons name="close" size={20} color="#102A28" />
                  </Pressable>
                </View>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarInitials}>
                    {form.fullName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() || '')
                      .join('') || 'D'}
                  </Text>
                </View>

                <FormInput label="Full name" value={form.fullName} onChangeText={(value) => handleChange('fullName', value)} />
                <FormInput
                  label="Email"
                  value={form.email}
                  onChangeText={(value) => handleChange('email', value)}
                  keyboardType="email-address"
                />
                <FormInput
                  label="Phone number"
                  value={form.phoneNumber}
                  onChangeText={(value) => handleChange('phoneNumber', value)}
                  keyboardType="phone-pad"
                />
                <FormInput
                  label="Emergency contact"
                  value={form.emergencyContact}
                  onChangeText={(value) => handleChange('emergencyContact', value)}
                  keyboardType="phone-pad"
                />

                <View style={styles.modalActions}>
                  <Pressable style={styles.secondaryButton} onPress={closeEditModal}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>

                  <Pressable style={styles.primaryButton} onPress={handleSave}>
                    <Text style={styles.primaryButtonText}>Update Details</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <View style={styles.inlineDivider} />
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not set'}</Text>
      </View>
    </>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={false}
        placeholderTextColor="#617C79"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8F7',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  keyboardWrap: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  topBar: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E9E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: '#102A28',
    fontSize: 17,
    fontWeight: '900',
  },
  topBarSpacer: {
    width: 38,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarInitials: {
    color: teal,
    fontSize: 18,
    fontWeight: '800',
  },
  heroIdentity: {
    flex: 1,
  },
  heroName: {
    color: '#102A28',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroSubline: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E7F5F3',
  },
  heroBadgeText: {
    color: teal,
    fontSize: 12,
    fontWeight: '700',
  },
  heroHint: {
    color: '#617C79',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  errorText: {
    color: '#C13B3B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  successText: {
    color: '#157A62',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 2,
  },
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 12,
    padding: 12,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailsTitle: {
    color: '#102A28',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  detailsHint: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    maxWidth: 220,
  },
  compactEditButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  compactEditButtonText: {
    color: teal,
    fontSize: 12,
    fontWeight: '800',
  },
  inlineDivider: {
    height: 1,
    backgroundColor: '#D9E9E6',
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    minHeight: 22,
  },
  infoLabel: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
  },
  infoValue: {
    color: '#102A28',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: '#F1D6D6',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFF4F4',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  dangerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFE9E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTextWrap: {
    flex: 1,
  },
  dangerTitle: {
    color: '#C13B3B',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  dangerText: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  deleteButton: {
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C13B3B',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 21, 19, 0.45)',
  },
  modalKeyboardWrap: {
    width: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  modalTitle: {
    color: '#102A28',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
  },
  modalSubtitle: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    maxWidth: 220,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalAvatarInitials: {
    color: teal,
    fontSize: 22,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D9E9E6',
    borderRadius: 12,
    backgroundColor: '#F7FBFA',
    color: '#102A28',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#102A28',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
