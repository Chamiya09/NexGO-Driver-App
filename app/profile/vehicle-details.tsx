import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

import RefreshableScrollView from '@/components/RefreshableScrollView';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { VehicleCategoryIcon } from '@/components/VehicleCategoryIcon';
import { type DriverVehicle, useDriverAuth } from '@/context/driver-auth-context';
import { useResponsiveLayout } from '@/lib/responsive';

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

type VehicleModalMode = 'add' | 'edit';

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
  const { driver, createVehicle, updateVehicle, deleteVehicle, getVehicle } = useDriverAuth();
  const responsive = useResponsiveLayout();
  const [form, setForm] = useState<VehicleForm>(initialVehicleForm);
  const [modalMode, setModalMode] = useState<VehicleModalMode>('add');
  const [isVehicleModalVisible, setIsVehicleModalVisible] = useState(false);
  const [isVehicleLoading, setIsVehicleLoading] = useState(false);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
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

  const loadVehicle = useCallback(async ({ showSuccess = false }: { showSuccess?: boolean } = {}) => {
    setIsVehicleLoading(true);
    setErrorMessage(null);

    try {
      await getVehicle();
      if (showSuccess) {
        setSuccessMessage('Vehicle details refreshed.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load vehicle details.');
    } finally {
      setIsVehicleLoading(false);
    }
  }, [getVehicle]);

  useEffect(() => {
    loadVehicle();
  }, [loadVehicle]);

  const openAddModal = () => {
    setModalMode('add');
    setForm(initialVehicleForm);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsVehicleModalVisible(true);
  };

  const openEditModal = () => {
    setModalMode('edit');
    setForm(vehicleForm);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsVehicleModalVisible(true);
  };

  const closeVehicleModal = () => {
    setIsVehicleModalVisible(false);
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
      setIsSavingVehicle(true);
      const payload = {
        category: nextVehicle.category,
        make: nextVehicle.make,
        model: nextVehicle.model,
        year: Number(nextVehicle.year),
        plateNumber: nextVehicle.plateNumber,
        color: nextVehicle.color,
        seats: Number(nextVehicle.seats),
      };

      if (modalMode === 'edit') {
        await updateVehicle(payload);
      } else {
        await createVehicle(payload);
      }

      setForm(nextVehicle);
      setErrorMessage(null);
      setSuccessMessage(modalMode === 'edit' ? 'Vehicle details updated successfully.' : 'Vehicle details added successfully.');
      setIsVehicleModalVisible(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save vehicle details.');
      setSuccessMessage(null);
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const confirmDeleteVehicle = () => {
    setDeleteConfirmVisible(true);
  };

  const handleDeleteVehicle = async () => {
          setIsDeletingVehicle(true);
          setErrorMessage(null);
          setSuccessMessage(null);

          try {
            await deleteVehicle();
            setForm(initialVehicleForm);
            setSuccessMessage('Vehicle details deleted successfully.');
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to delete vehicle details.');
          } finally {
            setIsDeletingVehicle(false);
          }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <RefreshableScrollView
          contentContainerStyle={[styles.container, { paddingHorizontal: responsive.screenPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onRefreshPage={() => loadVehicle({ showSuccess: true })}>
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#102A28" />
            </Pressable>
            <Text style={styles.topBarTitle}>Vehicle Details</Text>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={[styles.heroCard, { padding: responsive.cardPadding }]}>
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

            <Text style={styles.heroHint}>Add, review, update, or remove the vehicle connected to this driver account.</Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <Text style={styles.sectionTitle}>VEHICLE SETUP</Text>

          <View style={styles.groupCard}>
            <View style={styles.setupHeaderRow}>
              <View style={styles.detailsHeader}>
                <View style={styles.vehicleIntroIcon}>
                  <Ionicons name="car-outline" size={20} color={teal} />
                </View>

                <View style={styles.detailsHeaderText}>
                  <Text style={styles.detailsTitle}>{vehicle ? 'Vehicle record added' : 'No vehicle added yet'}</Text>
                  <Text style={styles.detailsHint}>
                    {vehicle
                      ? 'You can update or remove this vehicle record from the saved details section.'
                      : 'Add your assigned vehicle before accepting passenger trips.'}
                  </Text>
                </View>
              </View>

              <View style={styles.setupActions}>
                <Pressable
                  style={[styles.primaryButton, vehicle && styles.primaryButtonDisabled]}
                  onPress={openAddModal}
                  disabled={Boolean(vehicle)}>
                  <Ionicons name={vehicle ? 'checkmark-circle-outline' : 'add'} size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>{vehicle ? 'Added' : 'Add'}</Text>
                </Pressable>

              </View>
            </View>
          </View>

          {isVehicleLoading ? (
            <View style={styles.groupCard}>
              <Text style={styles.loadingText}>Loading vehicle details...</Text>
            </View>
          ) : vehicle ? (
            <>
              <Text style={styles.sectionTitle}>SAVED VEHICLE</Text>
              <View style={styles.vehicleCard}>
                <View style={styles.vehicleCardHeader}>
                  <View style={styles.vehicleHeaderLeft}>
                    <View style={styles.vehicleIconBadge}>
                      <VehicleCategoryIcon category={vehicle.category} size={34} active />
                    </View>

                    <View style={styles.vehicleTitleWrap}>
                      <Text style={styles.vehicleName}>{`${vehicle.make} ${vehicle.model}`}</Text>
                      <View style={styles.vehicleMetaRow}>
                        <View style={styles.vehicleCategoryChip}>
                          <Text style={styles.vehicleCategoryText}>{vehicle.category}</Text>
                        </View>
                        <Text style={styles.vehicleMetaText}>{vehicle.color}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.vehiclePlateBadge}>
                    <Text style={styles.vehiclePlateLabel}>PLATE</Text>
                    <Text style={styles.vehiclePlateText}>{vehicle.plateNumber}</Text>
                  </View>
                </View>

                <View style={styles.vehicleStatsGrid}>
                  <VehicleStat icon="calendar-outline" label="Year" value={String(vehicle.year)} />
                  <VehicleStat icon="people-outline" label="Seats" value={String(vehicle.seats)} />
                  <VehicleStat icon="color-palette-outline" label="Color" value={vehicle.color} />
                </View>

                <View style={styles.vehicleActionsRow}>
                  <Pressable style={styles.editButton} onPress={openEditModal}>
                    <Ionicons name="create-outline" size={16} color={teal} />
                    <Text style={styles.editButtonText}>Edit Vehicle</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.deleteVehicleButton, isDeletingVehicle && styles.deleteVehicleButtonDisabled]}
                    onPress={confirmDeleteVehicle}
                    disabled={isDeletingVehicle}>
                    <Ionicons name="trash-outline" size={16} color="#C13B3B" />
                    <Text style={styles.deleteVehicleButtonText}>{isDeletingVehicle ? 'Deleting' : 'Delete'}</Text>
                  </Pressable>
                </View>
              </View>
            </>
          ) : null}
        </RefreshableScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isVehicleModalVisible} transparent animationType="fade" onRequestClose={closeVehicleModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={styles.modalKeyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={[styles.modalCard, { padding: responsive.cardPadding }]}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{modalMode === 'edit' ? 'Update Vehicle' : 'Add Vehicle'}</Text>
                    <Text style={styles.modalSubtitle}>
                      {modalMode === 'edit'
                        ? 'Change the vehicle assigned to this driver profile.'
                        : 'Enter the vehicle assigned to this driver profile.'}
                    </Text>
                  </View>

                  <Pressable style={styles.closeButton} onPress={closeVehicleModal}>
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
                        <View style={[styles.categoryIconWrap, isSelected && styles.categoryIconWrapActive]}>
                          <VehicleCategoryIcon category={category} size={28} active={isSelected} />
                        </View>
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
                  <Pressable style={styles.secondaryButton} onPress={closeVehicleModal}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.modalPrimaryButton, isSavingVehicle && styles.modalPrimaryButtonDisabled]}
                    onPress={handleSaveVehicle}
                    disabled={isSavingVehicle}>
                    <Text style={styles.modalPrimaryButtonText}>
                      {isSavingVehicle ? 'Saving...' : modalMode === 'edit' ? 'Update Vehicle' : 'Save Vehicle'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="Delete vehicle"
        message="Do you want to remove this vehicle from your driver profile?"
        confirmLabel="Delete"
        destructive
        loading={isDeletingVehicle}
        icon="trash-outline"
        onCancel={() => {
          if (!isDeletingVehicle) setDeleteConfirmVisible(false);
        }}
        onConfirm={async () => {
          await handleDeleteVehicle();
          setDeleteConfirmVisible(false);
        }}
      />
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

function VehicleStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.vehicleStatItem}>
      <View style={styles.vehicleStatIcon}>
        <Ionicons name={icon} size={15} color={teal} />
      </View>
      <Text style={styles.vehicleStatValue}>{value}</Text>
      <Text style={styles.vehicleStatLabel}>{label}</Text>
    </View>
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 12,
    padding: 12,
  },
  setupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
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
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    flexGrow: 1,
    flexBasis: 92,
    minHeight: 72,
    minWidth: 82,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 6,
  },
  categoryPillActive: {
    borderColor: teal,
    backgroundColor: '#E7F5F3',
  },
  categoryIconWrap: {
    width: 44,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconWrapActive: {
    borderColor: '#CFE4E0',
    backgroundColor: '#FFFFFF',
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
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: teal,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    shadowColor: teal,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#8FA6A3',
    shadowOpacity: 0,
  },
  setupActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 8,
  },
  loadingText: {
    color: '#617C79',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  vehicleCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CFE4E0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 12,
  },
  vehicleCardHeader: {
    padding: 14,
    backgroundColor: '#F7FBFA',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  vehicleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vehicleIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTitleWrap: {
    flex: 1,
  },
  vehicleName: {
    color: '#102A28',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  vehicleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  vehicleCategoryChip: {
    minHeight: 24,
    borderRadius: 999,
    backgroundColor: '#E7F5F3',
    borderWidth: 1,
    borderColor: '#CFE4E0',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCategoryText: {
    color: teal,
    fontSize: 12,
    fontWeight: '900',
  },
  vehicleMetaText: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '700',
  },
  vehiclePlateBadge: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 92,
  },
  vehiclePlateLabel: {
    color: '#617C79',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  vehiclePlateText: {
    color: '#102A28',
    fontSize: 13,
    fontWeight: '900',
  },
  vehicleStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#D9E9E6',
  },
  vehicleStatItem: {
    flex: 1,
    minHeight: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  vehicleStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  vehicleStatValue: {
    color: '#102A28',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 1,
  },
  vehicleStatLabel: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  vehicleActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  editButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFE4E0',
    backgroundColor: '#E7F5F3',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editButtonText: {
    color: teal,
    fontSize: 13,
    fontWeight: '800',
  },
  deleteVehicleButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1D6D6',
    backgroundColor: '#FFF4F4',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteVehicleButtonDisabled: {
    opacity: 0.6,
  },
  deleteVehicleButtonText: {
    color: '#C13B3B',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
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
  modalPrimaryButtonDisabled: {
    backgroundColor: '#8FA6A3',
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
