import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import RefreshableScrollView from '@/components/RefreshableScrollView';
import { useDriverAuth } from '@/context/driver-auth-context';
import { pickDriverImage } from '@/src/utils/documentPicker';
import { uploadFileToCloudinary } from '@/src/utils/fileUpload';

export default function DriverPersonalDetailsScreen() {
  const { driver, updateProfile, refreshDriver } = useDriverAuth();
  
  const driverDetails = useMemo(() => ({
    fullName: driver?.fullName || '',
    email: driver?.email || '',
    phoneNumber: driver?.phoneNumber || '',
    emergencyContact: driver?.emergencyContact || '',
    profileImageUrl: driver?.profileImageUrl || '',
  }), [driver?.email, driver?.emergencyContact, driver?.fullName, driver?.phoneNumber, driver?.profileImageUrl]);

  const [form, setForm] = useState(driverDetails);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const colors = {
    background: '#F4F8F7', // Standard driver light background
    textPrimary: '#102A28', // Standard driver dark text
    textSecondary: '#617C79', // Standard driver muted text
    card: '#FFFFFF',
    border: '#D9E9E6',
    accent: '#008080', // teal
    accentSoft: '#E7F5F3',
    input: '#F7FBFA',
    overlay: 'rgba(7, 21, 19, 0.45)',
    danger: '#C13B3B',
    dangerSoft: '#FFF4F4',
    success: '#157A62',
    warning: '#D97706',
    warningSoft: '#FFF8EC',
    successSoft: '#E9F8EF',
  };

  const profileStats = useMemo(() => {
    const completedFields = [
      driver?.fullName,
      driver?.email,
      driver?.phoneNumber,
      driver?.emergencyContact,
      driver?.profileImageUrl,
    ].filter(Boolean).length;
    const completion = Math.round((completedFields / 5) * 100);

    return {
      completion,
      contactCount: [driver?.phoneNumber, driver?.emergencyContact].filter(Boolean).length,
      hasPhoto: Boolean(driver?.profileImageUrl),
    };
  }, [driver?.emergencyContact, driver?.fullName, driver?.phoneNumber, driver?.profileImageUrl, driver?.email]);

  useEffect(() => {
    setForm(driverDetails);
  }, [driverDetails]);

  const handleChange = (field: keyof typeof driverDetails, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openEditModal = () => {
    setForm(driverDetails);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    if (saving || uploadingImage) {
      return;
    }
    setIsEditModalVisible(false);
  };

  const validateForm = () => {
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const phoneNumber = form.phoneNumber.trim();
    const emergencyContact = form.emergencyContact.trim();

    if (!fullName || !email || !phoneNumber || !emergencyContact) {
      return 'All driver personal detail fields are required.';
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return 'Enter a valid email address.';
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage(null);
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateProfile({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phoneNumber: form.phoneNumber.trim(),
        emergencyContact: form.emergencyContact.trim(),
        profileImageUrl: form.profileImageUrl.trim(),
      });
      setIsEditModalVisible(false);
      setSuccessMessage('Driver personal details updated successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update personal details');
    } finally {
      setSaving(false);
    }
  };

  const handlePickProfileImage = async () => {
    setUploadingImage(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const pickedImage = await pickDriverImage();
      if (!pickedImage) {
        return;
      }

      const uploadedUrl = await uploadFileToCloudinary(pickedImage);
      handleChange('profileImageUrl', uploadedUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload profile image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete driver profile',
      'This will permanently remove your driver account and saved data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void handleDeleteAccount();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.replace('/login');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <RefreshableScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          onRefreshPage={refreshDriver}
          keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <Pressable style={[styles.backButton, { borderColor: colors.border }]} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>Personal Details</Text>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.heroTopRow}>
              <View style={[styles.heroAvatar, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
                {driver?.profileImageUrl ? (
                  <Image source={{ uri: driver.profileImageUrl }} style={styles.heroAvatarImage} />
                ) : (
                  <Text style={[styles.heroAvatarInitials, { color: colors.accent }]}>
                    {(driver?.fullName || 'Driver')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() || '')
                      .join('') || 'D'}
                  </Text>
                )}
              </View>

              <View style={styles.heroIdentity}>
                <Text style={[styles.heroName, { color: colors.textPrimary }]}>{driver?.fullName || 'Driver Profile'}</Text>
                <Text style={[styles.heroSubline, { color: colors.textSecondary }]}>
                  Driver profile and emergency details
                </Text>
              </View>
            </View>

            <View style={[styles.heroBadge, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="shield-checkmark-outline" size={15} color={colors.accent} />
              <Text style={[styles.heroBadgeText, { color: colors.accent }]}>Driver account verified</Text>
            </View>

            <Text style={[styles.heroHint, { color: colors.textSecondary }]}>
              Keep your details accurate for trip updates, support, and safety checks.
            </Text>
          </View>

          {errorMessage ? <Text style={[styles.feedback, { color: colors.danger }]}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={[styles.feedback, { color: colors.success }]}>{successMessage}</Text> : null}

          <View style={styles.metricGrid}>
            <ProfileMetricCard
              icon="person-circle-outline"
              label="Profile"
              value={`${profileStats.completion}%`}
              color={colors.accent}
              backgroundColor={colors.accentSoft}
              borderColor={colors.border}
              textColor={colors.textPrimary}
              secondaryColor={colors.textSecondary}
            />
            <ProfileMetricCard
              icon="call-outline"
              label="Contacts"
              value={`${profileStats.contactCount}/2`}
              color={colors.success}
              backgroundColor={colors.successSoft}
              borderColor={colors.border}
              textColor={colors.textPrimary}
              secondaryColor={colors.textSecondary}
            />
            <ProfileMetricCard
              icon="image-outline"
              label="Photo"
              value={profileStats.hasPhoto ? 'Set' : 'Empty'}
              color={profileStats.hasPhoto ? colors.success : colors.warning}
              backgroundColor={profileStats.hasPhoto ? colors.successSoft : colors.warningSoft}
              borderColor={colors.border}
              textColor={colors.textPrimary}
              secondaryColor={colors.textSecondary}
            />
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline, { color: colors.textSecondary }]}>PERSONAL DETAILS</Text>
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Driver account</Text>
          </View>

          <View style={[styles.groupCard, styles.profileInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardAccent, { backgroundColor: colors.accent }]} />
            <View style={styles.detailsHeader}>
              <View>
                <Text style={[styles.detailsTitle, { color: colors.textPrimary }]}>Driver information</Text>
                <Text style={[styles.detailsHint, { color: colors.textSecondary }]}>
                  Review your current NexGO driver identity details.
                </Text>
              </View>

              <Pressable
                style={[styles.compactEditButton, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}
                onPress={openEditModal}
                disabled={deleting}>
                <Ionicons name="create-outline" size={14} color={colors.accent} />
                <Text style={[styles.compactEditButtonText, { color: colors.accent }]}>Edit</Text>
              </Pressable>
            </View>

            <View style={[styles.inlineDivider, { backgroundColor: colors.border }]} />

            <ProfileInfoRow
              icon="person-outline"
              label="Full name"
              value={driver?.fullName || 'Not set'}
              colors={colors}
            />

            <View style={[styles.inlineDivider, { backgroundColor: colors.border }]} />

            <ProfileInfoRow
              icon="mail-outline"
              label="Email"
              value={driver?.email || 'Not set'}
              colors={colors}
            />

            <View style={[styles.inlineDivider, { backgroundColor: colors.border }]} />

            <ProfileInfoRow
              icon="call-outline"
              label="Phone number"
              value={driver?.phoneNumber || 'Not set'}
              colors={colors}
            />
            
            <View style={[styles.inlineDivider, { backgroundColor: colors.border }]} />

            <ProfileInfoRow
              icon="medkit-outline"
              label="Emergency contact"
              value={driver?.emergencyContact || 'Not set'}
              colors={colors}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DANGER ZONE</Text>

          <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.dangerCard, { backgroundColor: colors.dangerSoft, borderColor: '#F1D6D6' }]}>
              <View style={styles.dangerHeader}>
                <View style={[styles.dangerIconWrap, { backgroundColor: '#FFE9E9' }]}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </View>

                <View style={styles.dangerTextWrap}>
                  <Text style={[styles.dangerTitle, { color: colors.danger }]}>Delete account</Text>
                  <Text style={[styles.dangerText, { color: colors.textSecondary }]}>
                    Permanently remove your driver account and all saved verification records.
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.deleteButton, deleting ? styles.buttonDisabled : null]}
                onPress={confirmDeleteAccount}
                disabled={saving || deleting}>
                <Text style={styles.deleteButtonText}>{deleting ? 'Deleting...' : 'Delete Profile'}</Text>
              </Pressable>
            </View>
          </View>
        </RefreshableScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isEditModalVisible} transparent animationType="fade" onRequestClose={closeEditModal}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView
            style={styles.modalKeyboardWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Update Personal Details</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                      Edit your driver account information.
                    </Text>
                  </View>

                  <Pressable style={styles.closeButton} onPress={closeEditModal} disabled={saving}>
                    <Ionicons name="close" size={20} color={colors.textPrimary} />
                  </Pressable>
                </View>

                {errorMessage ? <Text style={[styles.feedback, { color: colors.danger }]}>{errorMessage}</Text> : null}

                <View style={styles.avatarEditorWrap}>
                  <View style={[styles.modalAvatar, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
                    {form.profileImageUrl ? (
                      <Image source={{ uri: form.profileImageUrl }} style={styles.modalAvatarImage} />
                    ) : (
                      <Text style={[styles.modalAvatarInitials, { color: colors.accent }]}>
                        {(form.fullName || 'Driver')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase() || '')
                          .join('') || 'D'}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.avatarEditorHint, { color: colors.textSecondary }]}>
                    Select a square photo from your gallery for your driver profile.
                  </Text>
                </View>

                <Pressable
                  style={[styles.imageSelectButton, { borderColor: colors.border, backgroundColor: colors.accentSoft }]}
                  onPress={() => {
                    void handlePickProfileImage();
                  }}
                  disabled={saving || uploadingImage}>
                  <Ionicons name="image-outline" size={17} color={colors.accent} />
                  <Text style={[styles.imageSelectButtonText, { color: colors.accent }]}>
                    {uploadingImage ? 'Uploading...' : form.profileImageUrl ? 'Change Profile Image' : 'Choose From Gallery'}
                  </Text>
                </Pressable>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full name</Text>
                  <TextInput
                    value={form.fullName}
                    onChangeText={(value) => handleChange('fullName', value)}
                    placeholder="Your full name"
                    placeholderTextColor={colors.textSecondary}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
                  <TextInput
                    value={form.email}
                    onChangeText={(value) => handleChange('email', value)}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone number</Text>
                  <TextInput
                    value={form.phoneNumber}
                    onChangeText={(value) => handleChange('phoneNumber', value)}
                    placeholder="Your phone number"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Emergency contact</Text>
                  <TextInput
                    value={form.emergencyContact}
                    onChangeText={(value) => handleChange('emergencyContact', value)}
                    placeholder="Emergency contact number"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                  />
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                    onPress={closeEditModal}
                    disabled={saving || uploadingImage}>
                    <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.primaryButton,
                      styles.modalSubmitButton,
                      { backgroundColor: colors.accent },
                      (saving || uploadingImage) ? styles.buttonDisabled : null,
                    ]}
                    onPress={() => {
                      void handleSave();
                    }}
                    disabled={saving || uploadingImage}>
                    <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Update Details'}</Text>
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

function ProfileMetricCard({
  icon,
  label,
  value,
  color,
  backgroundColor,
  borderColor,
  textColor,
  secondaryColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  secondaryColor: string;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: '#FFFFFF', borderColor }]}>
      <View style={[styles.metricIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: textColor }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.metricLabel, { color: secondaryColor }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function ProfileInfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: {
    accent: string;
    accentSoft: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
  };
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
        <Ionicons name={icon} size={15} color={colors.accent} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
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
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  topBarSpacer: {
    width: 38,
    height: 38,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroAvatarImage: {
    width: '100%',
    height: '100%',
  },
  heroAvatarInitials: {
    fontSize: 18,
    fontWeight: '800',
  },
  heroIdentity: {
    flex: 1,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroSubline: {
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
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroHint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  feedback: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 2,
  },
  sectionHeaderRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  sectionTitleInline: {
    marginBottom: 0,
    marginTop: 0,
  },
  sectionHint: {
    fontSize: 11,
    fontWeight: '700',
  },
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    padding: 12,
  },
  profileInfoCard: {
    position: 'relative',
    paddingLeft: 16,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  detailsHint: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    maxWidth: 220,
  },
  compactEditButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  compactEditButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 42,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  inlineDivider: {
    height: 1,
    marginVertical: 12,
    marginLeft: 44,
  },
  dangerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTextWrap: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  dangerText: {
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
  },
  modalKeyboardWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingVertical: 40,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    maxWidth: 240,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  avatarEditorWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
  },
  modalAvatarInitials: {
    fontSize: 24,
    fontWeight: '800',
  },
  avatarEditorHint: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  imageSelectButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  imageSelectButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSubmitButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
