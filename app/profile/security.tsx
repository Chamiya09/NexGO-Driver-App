import React, { useEffect, useState } from 'react';
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
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDriverAuth } from '@/context/driver-auth-context';

const teal = '#008080';

export default function DriverSecurityScreen() {
  const { driver, loading, changePassword, updateSecurity } = useDriverAuth();
  const [twoStepEnabled, setTwoStepEnabled] = useState(driver?.security?.twoStepVerificationEnabled ?? true);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setTwoStepEnabled(driver?.security?.twoStepVerificationEnabled ?? true);
  }, [driver?.security?.twoStepVerificationEnabled]);

  const handleChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openPasswordModal = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsPasswordModalVisible(true);
  };

  const closePasswordModal = () => {
    if (loading) {
      return;
    }

    setIsPasswordModalVisible(false);
  };

  const validatePasswordForm = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      return 'Please fill in all password fields.';
    }

    if (passwordForm.newPassword.length < 6) {
      return 'New password must be at least 6 characters long.';
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      return 'New password and confirmation do not match.';
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      return 'Choose a new password that is different from the current one.';
    }

    return null;
  };

  const submitPasswordChange = async () => {
    const validationError = validatePasswordForm();
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage(null);
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      await changePassword(passwordForm);

      setIsPasswordModalVisible(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setSuccessMessage('Password updated successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update password.');
    }
  };

  const updateTwoStepVerification = async (nextValue: boolean) => {
    const previousValue = twoStepEnabled;
    setTwoStepEnabled(nextValue);

    try {
      await updateSecurity(nextValue);
    } catch (error) {
      setTwoStepEnabled(previousValue);
      const message = error instanceof Error ? error.message : 'Unable to update security settings.';
      Alert.alert('Update failed', message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#102A28" />
          </Pressable>
          <Text style={styles.topBarTitle}>Security</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroAvatar}>
              <Ionicons name="shield-checkmark" size={26} color={teal} />
            </View>

            <View style={styles.heroIdentity}>
              <Text style={styles.heroName}>Account protected</Text>
              <Text style={styles.heroSubline}>Last security check: Today, 10:42 AM</Text>
            </View>
          </View>

          <View style={styles.heroBadge}>
            <Ionicons name="lock-closed-outline" size={15} color={teal} />
            <Text style={styles.heroBadgeText}>Secure driver account</Text>
          </View>

          <Text style={styles.heroHint}>Keep your account locked down to protect payouts, documents, and active rides.</Text>
        </View>

        <Text style={styles.sectionTitle}>ACCOUNT PROTECTION</Text>

        {errorMessage && !isPasswordModalVisible ? <Text style={styles.pageFeedbackError}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.pageFeedbackSuccess}>{successMessage}</Text> : null}

        <View style={styles.groupCard}>
          <SecurityActionRow
            icon="key-outline"
            title="Change password"
            subtitle="Update your sign-in password regularly"
            onPress={openPasswordModal}
          />
          <InlineDivider />
          <SecuritySwitchRow
            icon="phone-portrait-outline"
            title="Two-step verification"
            subtitle="Require an OTP when signing in"
            value={twoStepEnabled}
            onValueChange={(nextValue) => {
              void updateTwoStepVerification(nextValue);
            }}
          />
        </View>
      </ScrollView>

      <Modal visible={isPasswordModalVisible} transparent animationType="fade" onRequestClose={closePasswordModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboardWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Change Password</Text>
                    <Text style={styles.modalSubtitle}>
                      Confirm your current password and set a new one for your driver account.
                    </Text>
                  </View>

                  <Pressable style={styles.closeButton} onPress={closePasswordModal} disabled={loading}>
                    <Ionicons name="close" size={20} color="#102A28" />
                  </Pressable>
                </View>

                {errorMessage ? <Text style={styles.modalFeedback}>{errorMessage}</Text> : null}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current password</Text>
                  <TextInput
                    value={passwordForm.currentPassword}
                    onChangeText={(value) => handleChange('currentPassword', value)}
                    placeholder="Enter current password"
                    placeholderTextColor="#93A5A2"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New password</Text>
                  <TextInput
                    value={passwordForm.newPassword}
                    onChangeText={(value) => handleChange('newPassword', value)}
                    placeholder="Enter new password"
                    placeholderTextColor="#93A5A2"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm new password</Text>
                  <TextInput
                    value={passwordForm.confirmNewPassword}
                    onChangeText={(value) => handleChange('confirmNewPassword', value)}
                    placeholder="Confirm new password"
                    placeholderTextColor="#93A5A2"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>

                <View style={styles.modalActions}>
                  <Pressable style={styles.secondaryButton} onPress={closePasswordModal} disabled={loading}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
                    onPress={() => {
                      void submitPasswordChange();
                    }}
                    disabled={loading}>
                    <Text style={styles.primaryButtonText}>{loading ? 'Updating...' : 'Update Password'}</Text>
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

function SecurityActionRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.securityRow} onPress={onPress}>
      <View style={styles.securityLeft}>
        <View style={styles.securityIconWrap}>
          <Ionicons name={icon} size={19} color={teal} />
        </View>
        <View style={styles.securityTextWrap}>
          <Text style={styles.securityTitle}>{title}</Text>
          <Text style={styles.securitySubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#617C79" />
    </Pressable>
  );
}

function SecuritySwitchRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.securityRow}>
      <View style={styles.securityLeft}>
        <View style={styles.securityIconWrap}>
          <Ionicons name={icon} size={19} color={teal} />
        </View>
        <View style={styles.securityTextWrap}>
          <Text style={styles.securityTitle}>{title}</Text>
          <Text style={styles.securitySubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#CDD8D6', true: '#80C9C9' }}
        thumbColor={value ? teal : '#F7FBFA'}
        ios_backgroundColor="#CDD8D6"
      />
    </View>
  );
}

function InlineDivider() {
  return <View style={styles.inlineDivider} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8F7',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
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
  pageFeedbackError: {
    color: '#C13B3B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  pageFeedbackSuccess: {
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
  securityRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  securityLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  securityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTextWrap: {
    flex: 1,
  },
  securityTitle: {
    color: '#102A28',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  securitySubtitle: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  inlineDivider: {
    height: 1,
    backgroundColor: '#D9E9E6',
    marginVertical: 10,
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
    maxWidth: 230,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFeedback: {
    color: '#C13B3B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
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
  buttonDisabled: {
    opacity: 0.7,
  },
});
