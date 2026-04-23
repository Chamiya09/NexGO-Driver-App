import React, { useEffect, useMemo, useState } from 'react';
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

import { useDriverAuth } from '@/context/driver-auth-context';

const teal = '#008080';

const initialVehicleDetails = {
  licensePlate: '',
  carModel: '',
  year: '',
  color: '',
  category: '',
  registrationNumber: '',
};

const vehicleTypeOptions = [
  { label: 'Bike', value: 'Bike', icon: 'bicycle-outline' as const },
  { label: 'TukTuk', value: 'TukTuk', icon: 'car-outline' as const },
  { label: 'Mini', value: 'Mini', icon: 'car-sport-outline' as const },
  { label: 'Sedan', value: 'Sedan', icon: 'car-sport' as const },
  { label: 'Van', value: 'Van', icon: 'bus-outline' as const },
];

type VehicleDetails = typeof initialVehicleDetails;
type VehicleDetailsField = keyof VehicleDetails;

function hasVehicleDetails(details: VehicleDetails) {
  return Object.values(details).some((value) => value.trim().length > 0);
}

export default function DriverVehicleDetailsScreen() {
  const { driver, updateVehicle } = useDriverAuth();
  const vehicleDetails = useMemo(
    () => ({
      licensePlate: driver?.vehicle?.licensePlate || '',
      carModel: driver?.vehicle?.carModel || '',
      year: driver?.vehicle?.year || '',
      color: driver?.vehicle?.color || '',
      category: driver?.vehicle?.category || '',
      registrationNumber: driver?.vehicle?.registrationNumber || '',
    }),
    [
      driver?.vehicle?.carModel,
      driver?.vehicle?.category,
      driver?.vehicle?.color,
      driver?.vehicle?.licensePlate,
      driver?.vehicle?.registrationNumber,
      driver?.vehicle?.year,
    ]
  );

  const [details, setDetails] = useState(vehicleDetails);
  const [form, setForm] = useState(vehicleDetails);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasVehicle = hasVehicleDetails(details);
  const vehicleStatus = driver?.vehicle?.status || 'pending';
  const selectedHeroVehicleType = vehicleTypeOptions.find((option) => option.value === details.category);

  useEffect(() => {
    setDetails(vehicleDetails);
    setForm(vehicleDetails);
  }, [vehicleDetails]);

  const openEditModal = () => {
    setForm(details);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    setErrorMessage(null);
    setIsEditModalVisible(false);
  };

  const handleChange = (field: VehicleDetailsField, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async () => {
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

    try {
      await updateVehicle(nextDetails);
      setDetails(nextDetails);
      setIsEditModalVisible(false);
      setSuccessMessage(hasVehicle ? 'Vehicle details updated.' : 'Vehicle added successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update vehicle details.');
    }
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
                <Ionicons name={selectedHeroVehicleType?.icon || 'car-sport-outline'} size={26} color={teal} />
              </View>

              <View style={styles.heroIdentity}>
                <Text style={styles.heroName}>{hasVehicle ? details.carModel : 'Add your first vehicle'}</Text>
                <Text style={styles.heroSubline}>
                  {hasVehicle
                    ? `${details.licensePlate} • ${details.year} • ${details.category}`
                    : 'Complete your vehicle profile to start receiving rides with the correct riding vehicle type.'}
                </Text>
              </View>
            </View>

            <View style={styles.heroBadge}>
              <Ionicons name={hasVehicle ? 'checkmark-circle-outline' : 'add-circle-outline'} size={15} color={teal} />
              <Text style={styles.heroBadgeText}>{hasVehicle ? `Vehicle ${vehicleStatus}` : 'Vehicle not added'}</Text>
            </View>

            <Text style={styles.heroHint}>
              {hasVehicle
                ? 'Keep your vehicle information accurate so passengers can identify your ride.'
                : 'Add your driving vehicle, registration details, and ride type so your account is ready for verification.'}
            </Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>

          <View style={styles.groupCard}>
            <View style={styles.detailsHeader}>
              <View>
                <Text style={styles.detailsTitle}>{hasVehicle ? 'Registered vehicle' : 'Add vehicle details'}</Text>
                <Text style={styles.detailsHint}>
                  {hasVehicle
                    ? 'Review your active NexGO driver vehicle details.'
                    : 'Create your driver vehicle profile and choose the ride type you will accept.'}
                </Text>
              </View>

              <Pressable style={styles.compactEditButton} onPress={openEditModal}>
                <Ionicons name={hasVehicle ? 'create-outline' : 'add-outline'} size={14} color={teal} />
                <Text style={styles.compactEditButtonText}>{hasVehicle ? 'Edit' : 'Add'}</Text>
              </Pressable>
            </View>

            {hasVehicle ? (
              <>
                <DetailRow label="License plate" value={details.licensePlate} />
                <DetailRow label="Car model" value={details.carModel} />
                <DetailRow label="Year" value={details.year} />
                <DetailRow label="Color" value={details.color} />
                <DetailRow label="Riding vehicle" value={details.category} />
                <DetailRow label="Registration no." value={details.registrationNumber} />
              </>
            ) : (
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="car-sport-outline" size={24} color={teal} />
                </View>
                <Text style={styles.emptyStateTitle}>No vehicle added yet</Text>
                <Text style={styles.emptyStateText}>
                  Add the vehicle you use for rides and select the same ride category passengers choose in the app.
                </Text>
                <Pressable style={styles.primaryInlineButton} onPress={openEditModal}>
                  <Text style={styles.primaryInlineButtonText}>Add Vehicle</Text>
                </Pressable>
              </View>
            )}
          </View>

          {hasVehicle ? (
            <>
              <Text style={styles.sectionTitle}>DANGER ZONE</Text>

              <View style={styles.groupCard}>
                <View style={styles.dangerCard}>
                  <View style={styles.dangerHeader}>
                    <View style={styles.dangerIconWrap}>
                      <Ionicons name="car-outline" size={16} color="#C13B3B" />
                    </View>

                    <View style={styles.dangerTextWrap}>
                      <Text style={styles.dangerTitle}>Remove vehicle</Text>
                      <Text style={styles.dangerText}>
                        Remove this car from your driver profile and stop receiving rides for it.
                      </Text>
                    </View>
                  </View>

                  <Pressable style={styles.deleteButton} onPress={confirmRemoveVehicle}>
                    <Text style={styles.deleteButtonText}>Remove Vehicle</Text>
                  </Pressable>
                </View>
              </View>
            </>
          ) : null}
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
                    <Text style={styles.modalTitle}>{hasVehicle ? 'Update Vehicle Details' : 'Add Vehicle Details'}</Text>
                    <Text style={styles.modalSubtitle}>
                      {hasVehicle
                        ? 'Edit your active driver vehicle information.'
                        : 'Add the vehicle you will use for rides and choose the riding vehicle type.'}
                    </Text>
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

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Riding vehicle</Text>
                  <View style={styles.vehicleTypeGrid}>
                    {vehicleTypeOptions.map((option) => {
                      const isSelected = form.category === option.value;

                      return (
                        <Pressable
                          key={option.value}
                          style={[styles.vehicleTypeChip, isSelected ? styles.vehicleTypeChipSelected : null]}
                          onPress={() => handleChange('category', option.value)}>
                          <Ionicons name={option.icon} size={18} color={isSelected ? '#FFFFFF' : teal} />
                          <Text style={[styles.vehicleTypeText, isSelected ? styles.vehicleTypeTextSelected : null]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

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
                    <Text style={styles.primaryButtonText}>{hasVehicle ? 'Update Vehicle' : 'Add Vehicle'}</Text>
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
    paddingTop: 10,
    paddingBottom: 20,
  },
  topBar: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroSubline: {
    color: '#617C79',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E7F5F3',
  },
  heroBadgeText: {
    color: teal,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  heroHint: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 16,
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
    marginBottom: 5,
    marginTop: 2,
  },
  groupCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 10,
    padding: 10,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailsTitle: {
    color: '#102A28',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  detailsHint: {
    color: '#617C79',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    maxWidth: 210,
  },
  compactEditButton: {
    minHeight: 32,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    paddingHorizontal: 9,
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
  emptyStateCard: {
    borderRadius: 12,
    backgroundColor: '#F7FBFA',
    borderWidth: 1,
    borderColor: '#D9E9E6',
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyStateIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyStateTitle: {
    color: '#102A28',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyStateText: {
    color: '#617C79',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
  primaryInlineButton: {
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: teal,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryInlineButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  inlineDivider: {
    height: 1,
    backgroundColor: '#D9E9E6',
    marginVertical: 8,
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
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 0,
  },
  infoValue: {
    color: '#102A28',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: '#F1D6D6',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFF4F4',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
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
    minHeight: 38,
    borderRadius: 10,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  modalTitle: {
    color: '#102A28',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  modalSubtitle: {
    color: '#617C79',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    maxWidth: 200,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D9E9E6',
    borderRadius: 10,
    backgroundColor: '#F7FBFA',
    color: '#102A28',
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '600',
  },
  vehicleTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleTypeChip: {
    minHeight: 40,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F7FBFA',
  },
  vehicleTypeChipSelected: {
    backgroundColor: teal,
    borderColor: teal,
  },
  vehicleTypeText: {
    color: '#102A28',
    fontSize: 12,
    fontWeight: '700',
  },
  vehicleTypeTextSelected: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 0,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#102A28',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
