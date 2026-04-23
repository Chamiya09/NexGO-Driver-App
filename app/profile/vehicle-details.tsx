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

const teal = '#008080';

const initialVehicleDetails = {
  licensePlate: 'ABC-4821',
  carModel: 'Toyota Prius',
  year: '2020',
  color: 'Pearl White',
  category: 'Comfort',
  registrationNumber: 'WP-CAR-908212',
};

type VehicleDetailsField = keyof typeof initialVehicleDetails;

export default function DriverVehicleDetailsScreen() {
  const [details, setDetails] = useState(initialVehicleDetails);
  const [form, setForm] = useState(initialVehicleDetails);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openEditModal = () => {
    setForm(details);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    setIsEditModalVisible(false);
  };

  const handleChange = (field: VehicleDetailsField, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = () => {
    const nextDetails = {
      licensePlate: form.licensePlate.trim().toUpperCase(),
      carModel: form.carModel.trim(),
      year: form.year.trim(),
      color: form.color.trim(),
      category: form.category.trim(),
      registrationNumber: form.registrationNumber.trim().toUpperCase(),
    };

    if (Object.values(nextDetails).some((value) => !value)) {
      setErrorMessage('All vehicle detail fields are required.');
      return;
    }

    if (!/^\d{4}$/.test(nextDetails.year)) {
      setErrorMessage('Enter a valid 4-digit vehicle year.');
      return;
    }

    setDetails(nextDetails);
    setIsEditModalVisible(false);
    setSuccessMessage('Vehicle details updated.');
  };

  const confirmRemoveVehicle = () => {
    Alert.alert(
      'Remove vehicle',
      'This placeholder action represents removing this vehicle from your driver account.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive' }]
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
            <Text style={styles.topBarTitle}>Vehicle Details</Text>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroAvatar}>
                <Ionicons name="car-sport" size={26} color={teal} />
              </View>

              <View style={styles.heroIdentity}>
                <Text style={styles.heroName}>{details.carModel}</Text>
                <Text style={styles.heroSubline}>
                  {details.licensePlate} • {details.year} • {details.category}
                </Text>
              </View>
            </View>

            <View style={styles.heroBadge}>
              <Ionicons name="checkmark-circle-outline" size={15} color={teal} />
              <Text style={styles.heroBadgeText}>Vehicle approved</Text>
            </View>

            <Text style={styles.heroHint}>Keep your vehicle information accurate so passengers can identify your ride.</Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>

          <View style={styles.groupCard}>
            <View style={styles.detailsHeader}>
              <View>
                <Text style={styles.detailsTitle}>Registered vehicle</Text>
                <Text style={styles.detailsHint}>Review your active NexGO driver vehicle details.</Text>
              </View>

              <Pressable style={styles.compactEditButton} onPress={openEditModal}>
                <Ionicons name="create-outline" size={14} color={teal} />
                <Text style={styles.compactEditButtonText}>Edit</Text>
              </Pressable>
            </View>

            <DetailRow label="License plate" value={details.licensePlate} />
            <DetailRow label="Car model" value={details.carModel} />
            <DetailRow label="Year" value={details.year} />
            <DetailRow label="Color" value={details.color} />
            <DetailRow label="Category" value={details.category} />
            <DetailRow label="Registration no." value={details.registrationNumber} />
          </View>

          <Text style={styles.sectionTitle}>DANGER ZONE</Text>

          <View style={styles.groupCard}>
            <View style={styles.dangerCard}>
              <View style={styles.dangerHeader}>
                <View style={styles.dangerIconWrap}>
                  <Ionicons name="car-outline" size={16} color="#C13B3B" />
                </View>

                <View style={styles.dangerTextWrap}>
                  <Text style={styles.dangerTitle}>Remove vehicle</Text>
                  <Text style={styles.dangerText}>Remove this car from your driver profile and stop receiving rides for it.</Text>
                </View>
              </View>

              <Pressable style={styles.deleteButton} onPress={confirmRemoveVehicle}>
                <Text style={styles.deleteButtonText}>Remove Vehicle</Text>
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
                    <Text style={styles.modalTitle}>Update Vehicle Details</Text>
                    <Text style={styles.modalSubtitle}>Edit your active driver vehicle information.</Text>
                  </View>

                  <Pressable style={styles.closeButton} onPress={closeEditModal}>
                    <Ionicons name="close" size={20} color="#102A28" />
                  </Pressable>
                </View>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                <View style={styles.modalAvatar}>
                  <Ionicons name="car-sport" size={30} color={teal} />
                </View>

                <FormInput
                  label="License plate"
                  value={form.licensePlate}
                  onChangeText={(value) => handleChange('licensePlate', value)}
                />
                <FormInput label="Car model" value={form.carModel} onChangeText={(value) => handleChange('carModel', value)} />
                <FormInput label="Year" value={form.year} onChangeText={(value) => handleChange('year', value)} keyboardType="number-pad" />
                <FormInput label="Color" value={form.color} onChangeText={(value) => handleChange('color', value)} />
                <FormInput label="Category" value={form.category} onChangeText={(value) => handleChange('category', value)} />
                <FormInput
                  label="Registration number"
                  value={form.registrationNumber}
                  onChangeText={(value) => handleChange('registrationNumber', value)}
                />

                <View style={styles.modalActions}>
                  <Pressable style={styles.secondaryButton} onPress={closeEditModal}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>

                  <Pressable style={styles.primaryButton} onPress={handleSave}>
                    <Text style={styles.primaryButtonText}>Update Vehicle</Text>
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
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="sentences"
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
