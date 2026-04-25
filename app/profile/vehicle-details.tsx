import React, { useMemo, useState } from 'react';
import {
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

import { type DriverVehicle, useDriverAuth } from '@/context/driver-auth-context';

const teal = '#008080';

const vehicleCategories = ['Bike', 'Tuk', 'Mini', 'Car', 'Van'] as const;

type VehicleCategory = (typeof vehicleCategories)[number];

type VehicleForm = {
  category: VehicleCategory;
  make: string;
  model: string;
  year: string;
  plateNumber: string;
  color: string;
  seats: string;
};

const initialVehicleForm: VehicleForm = {
  category: 'Car',
  make: '',
  model: '',
  year: '',
  plateNumber: '',
  color: '',
  seats: '',
};

export default function DriverVehicleDetailsScreen() {
  const { driver, createVehicle } = useDriverAuth();
  const [form, setForm] = useState<VehicleForm>(initialVehicleForm);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const vehicle = driver?.vehicle || null;

  const vehicleForm = useMemo(() => mapVehicleToForm(vehicle), [vehicle]);

  const heroTitle = useMemo(() => {
    if (!vehicle) {
      return 'Add your vehicle';
    }

    return `${vehicle.make} ${vehicle.model}`.trim();
  }, [vehicle]);

  const updateField = (field: keyof VehicleForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openAddModal = () => {
    setForm(vehicleForm);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsAddModalVisible(true);
  };

  const closeAddModal = () => {
    setIsAddModalVisible(false);
  };

  const handleSaveVehicle = async () => {
    const nextVehicle = {
      ...form,
      make: form.make.trim(),
      model: form.model.trim(),
      year: form.year.trim(),
      plateNumber: form.plateNumber.trim().toUpperCase(),
      color: form.color.trim(),
      seats: form.seats.trim(),
    };

    if (
      !nextVehicle.category ||
      !nextVehicle.make ||
      !nextVehicle.model ||
      !nextVehicle.year ||
      !nextVehicle.plateNumber ||
      !nextVehicle.color ||
      !nextVehicle.seats
    ) {
      setErrorMessage('All vehicle detail fields are required.');
      setSuccessMessage(null);
      return;
    }

    if (!/^\d{4}$/.test(nextVehicle.year)) {
      setErrorMessage('Enter a valid 4-digit manufacture year.');
      setSuccessMessage(null);
      return;
    }

    if (!/^\d+$/.test(nextVehicle.seats) || Number(nextVehicle.seats) < 1) {
      setErrorMessage('Enter a valid passenger seat count.');
      setSuccessMessage(null);
      return;
    }

    try {
      await createVehicle({
        category: nextVehicle.category,
        make: nextVehicle.make,
        model: nextVehicle.model,
        year: Number(nextVehicle.year),
        plateNumber: nextVehicle.plateNumber,
        color: nextVehicle.color,
        seats: Number(nextVehicle.seats),
      });
      setForm(nextVehicle);
      setErrorMessage(null);
      setSuccessMessage('Vehicle details added successfully.');
      setIsAddModalVisible(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to add vehicle details.');
      setSuccessMessage(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#102A28" />
            </Pressable>
            <Text style={styles.topBarTitle}>Vehicle Details</Text>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIcon}>
                <Ionicons name="car-sport-outline" size={28} color={teal} />
              </View>

              <View style={styles.heroIdentity}>
                <Text style={styles.heroName}>{heroTitle}</Text>
                <Text style={styles.heroSubline}>Register the vehicle used for NexGO driver trips.</Text>
              </View>
            </View>

            <View style={styles.heroBadge}>
              <Ionicons name={vehicle ? 'checkmark-circle-outline' : 'add-circle-outline'} size={15} color={teal} />
              <Text style={styles.heroBadgeText}>{vehicle ? 'Vehicle added' : 'Create vehicle record'}</Text>
            </View>

            <Text style={styles.heroHint}>This step captures the first vehicle profile only. Edit, delete, and list management can come next.</Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <Text style={styles.sectionTitle}>VEHICLE SETUP</Text>

          <View style={styles.groupCard}>
            <View style={styles.detailsHeader}>
              <View style={styles.vehicleIntroIcon}>
                <Ionicons name="car-outline" size={20} color={teal} />
              </View>

              <View style={styles.detailsHeaderText}>
                <Text style={styles.detailsTitle}>{vehicle ? 'Vehicle record added' : 'No vehicle added yet'}</Text>
                <Text style={styles.detailsHint}>
                  {vehicle
                    ? 'Your first vehicle record is ready for the next vehicle management step.'
                    : 'Add your assigned vehicle before accepting passenger trips.'}
                </Text>
              </View>
            </View>

            <Pressable
              style={[styles.primaryButton, vehicle && styles.primaryButtonDisabled]}
              onPress={openAddModal}
              disabled={Boolean(vehicle)}>
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{vehicle ? 'Vehicle Already Added' : 'Add Vehicle'}</Text>
            </Pressable>
          </View>

          {vehicle ? (
            <>
              <Text style={styles.sectionTitle}>SAVED VEHICLE</Text>
              <View style={styles.groupCard}>
                <DetailRow label="Category" value={vehicle.category} />
                <DetailRow label="Vehicle" value={`${vehicle.make} ${vehicle.model}`} />
                <DetailRow label="Year" value={String(vehicle.year)} />
                <DetailRow label="Plate number" value={vehicle.plateNumber} />
                <DetailRow label="Color" value={vehicle.color} />
                <DetailRow label="Passenger seats" value={String(vehicle.seats)} />
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isAddModalVisible} transparent animationType="fade" onRequestClose={closeAddModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={styles.modalKeyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Add Vehicle</Text>
                    <Text style={styles.modalSubtitle}>Enter the vehicle assigned to this driver profile.</Text>
                  </View>

                  <Pressable style={styles.closeButton} onPress={closeAddModal}>
                    <Ionicons name="close" size={20} color="#102A28" />
                  </Pressable>
                </View>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                <Text style={styles.detailsTitle}>Vehicle category</Text>
                <Text style={styles.detailsHint}>Choose the category passengers will see during matching.</Text>

                <View style={styles.categoryGrid}>
                  {vehicleCategories.map((category) => {
                    const isSelected = form.category === category;

                    return (
                      <Pressable
                        key={category}
                        style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                        onPress={() => updateField('category', category)}>
                        <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>{category}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <FormInput label="Make" value={form.make} onChangeText={(value) => updateField('make', value)} placeholder="Toyota" />
                <FormInput label="Model" value={form.model} onChangeText={(value) => updateField('model', value)} placeholder="Aqua" />
                <FormInput
                  label="Manufacture year"
                  value={form.year}
                  onChangeText={(value) => updateField('year', value.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  placeholder="2020"
                />
                <FormInput
                  label="Plate number"
                  value={form.plateNumber}
                  onChangeText={(value) => updateField('plateNumber', value)}
                  autoCapitalize="characters"
                  placeholder="CAB-1234"
                />
                <FormInput label="Color" value={form.color} onChangeText={(value) => updateField('color', value)} placeholder="White" />
                <FormInput
                  label="Passenger seats"
                  value={form.seats}
                  onChangeText={(value) => updateField('seats', value.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  placeholder="4"
                />

                <View style={styles.modalActions}>
                  <Pressable style={styles.secondaryButton} onPress={closeAddModal}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>

                  <Pressable style={styles.modalPrimaryButton} onPress={handleSaveVehicle}>
                    <Text style={styles.modalPrimaryButtonText}>Save Vehicle</Text>
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

function mapVehicleToForm(vehicle?: DriverVehicle | null): VehicleForm {
  if (!vehicle) {
    return initialVehicleForm;
  }

  return {
    category: vehicle.category,
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year),
    plateNumber: vehicle.plateNumber,
    color: vehicle.color,
    seats: String(vehicle.seats),
  };
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
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  placeholder?: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholder={placeholder}
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
  heroIcon: {
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
    gap: 10,
    marginBottom: 12,
  },
  vehicleIntroIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsHeaderText: {
    flex: 1,
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
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    minHeight: 36,
    minWidth: 62,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  categoryPillActive: {
    borderColor: teal,
    backgroundColor: '#E7F5F3',
  },
  categoryPillText: {
    color: '#617C79',
    fontSize: 13,
    fontWeight: '800',
  },
  categoryPillTextActive: {
    color: teal,
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
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: teal,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 2,
  },
  primaryButtonDisabled: {
    backgroundColor: '#8FA6A3',
  },
  primaryButtonText: {
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
    paddingVertical: 18,
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
    maxWidth: 240,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalPrimaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
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
});
