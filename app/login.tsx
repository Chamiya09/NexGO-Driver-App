import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AuthShell from '@/components/auth/auth-shell';
import { useDriverAuth } from '@/context/driver-auth-context';

const teal = '#008080';

const initialResetForm = {
  email: '',
  otp: '',
  newPassword: '',
  confirmNewPassword: '',
};

type ResetStep = 'email' | 'otp' | 'password';

const resetSteps: ResetStep[] = ['email', 'otp', 'password'];
const resetResendSeconds = 60;

export default function DriverLoginScreen() {
  const { login, loading } = useDriverAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isResetPasswordVisible, setIsResetPasswordVisible] = useState(false);
  const [resetForm, setResetForm] = useState(initialResetForm);
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);

  useEffect(() => {
    if (!isResetPasswordVisible || resendSeconds <= 0) {
      return;
    }

    const timerId = setInterval(() => {
      setResendSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearInterval(timerId);
  }, [isResetPasswordVisible, resendSeconds]);

  const onSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Please enter email and password.');
      return;
    }

    try {
      await login({ email: email.trim(), password });
      router.replace('/(tabs)/home');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      Alert.alert('Login failed', message);
    }
  };

  const handleResetChange = (field: keyof typeof initialResetForm, value: string) => {
    setResetForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openResetPassword = () => {
    setResetForm({
      ...initialResetForm,
      email: email.trim(),
    });
    setResetError(null);
    setResetNotice(null);
    setResetStep('email');
    setResendSeconds(0);
    setIsNewPasswordVisible(false);
    setIsResetPasswordVisible(true);
  };

  const closeResetPassword = () => {
    if (resetLoading) {
      return;
    }

    setIsResetPasswordVisible(false);
  };

  const requestResetOtp = ({ isResend = false } = {}) => {
    const nextEmail = resetForm.email.trim();

    if (!nextEmail) {
      setResetError('Please enter your email address.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    setResetNotice(null);

    setTimeout(() => {
      setResetForm((current) => ({
        ...current,
        email: nextEmail,
      }));
      setResetStep('otp');
      setResendSeconds(resetResendSeconds);
      setResetNotice(isResend ? 'A new reset code has been sent.' : 'If the account exists, a reset code has been sent.');
      setResetLoading(false);
    }, 350);
  };

  const continueFromOtp = () => {
    if (!resetForm.otp.trim()) {
      setResetError('Please enter the reset code from your email.');
      return;
    }

    setResetError(null);
    setResetNotice(null);
    setResetStep('password');
  };

  const submitResetPassword = () => {
    const nextEmail = resetForm.email.trim();
    const nextOtp = resetForm.otp.trim();

    if (!nextEmail || !nextOtp || !resetForm.newPassword || !resetForm.confirmNewPassword) {
      setResetError('Please complete all reset fields.');
      return;
    }

    if (resetForm.newPassword.length < 6) {
      setResetError('New password must be at least 6 characters.');
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmNewPassword) {
      setResetError('New password and confirmation do not match.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    setResetNotice(null);

    setTimeout(() => {
      setEmail(nextEmail);
      setPassword('');
      setIsResetPasswordVisible(false);
      setResetForm(initialResetForm);
      setResetStep('email');
      setResendSeconds(0);
      setResetLoading(false);
      Alert.alert('Password updated', 'Please sign in with your new password.');
    }, 350);
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to drive"
      subtitle="Continue to your driver account and manage trips, earnings, documents, and availability.">
      <View style={styles.formStack}>
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
          <View style={styles.passwordLabelRow}>
            <Text style={styles.label}>Password</Text>
            <Pressable onPress={openResetPassword} hitSlop={8}>
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </Pressable>
          </View>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color={teal} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry={!isPasswordVisible}
              textContentType="password"
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
        <Text style={styles.primaryButtonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
        <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
      </Pressable>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>New to NexGO Driver?</Text>
        <Pressable onPress={() => router.push('/register')}>
          <Text style={styles.footerLink}>Create account</Text>
        </Pressable>
      </View>

      <Modal visible={isResetPasswordVisible} transparent animationType="fade" onRequestClose={closeResetPassword}>
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
                  <View style={styles.modalTitleWrap}>
                    <Text style={styles.modalTitle}>Reset password</Text>
                    <Text style={styles.modalSubtitle}>
                      {resetStep === 'email'
                        ? 'Enter your driver email and we will send a password reset code.'
                        : resetStep === 'otp'
                          ? 'Check your email and enter the code we sent to continue.'
                          : 'Choose a new password for your NexGO driver account.'}
                    </Text>
                  </View>

                  <Pressable style={styles.closeButton} onPress={closeResetPassword} disabled={resetLoading}>
                    <Ionicons name="close" size={20} color="#123532" />
                  </Pressable>
                </View>

                {resetError ? <Text style={styles.resetError}>{resetError}</Text> : null}
                {resetNotice ? <Text style={styles.resetNotice}>{resetNotice}</Text> : null}

                <View style={styles.stepRow}>
                  {resetSteps.map((step, index) => (
                    <View
                      key={step}
                      style={[
                        styles.stepDot,
                        resetStep === step || index < resetSteps.indexOf(resetStep) ? styles.stepDotActive : null,
                      ]}
                    />
                  ))}
                </View>

                {resetStep === 'email' ? (
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.label}>Email address</Text>
                    <View style={styles.inputRow}>
                      <Ionicons name="mail-outline" size={20} color={teal} />
                      <TextInput
                        style={styles.input}
                        value={resetForm.email}
                        onChangeText={(value) => handleResetChange('email', value)}
                        placeholder="driver@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        textContentType="emailAddress"
                        placeholderTextColor="#93A5A2"
                      />
                    </View>
                  </View>
                ) : null}

                {resetStep === 'otp' ? (
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.label}>Reset code</Text>
                    <View style={styles.inputRow}>
                      <Ionicons name="keypad-outline" size={20} color={teal} />
                      <TextInput
                        style={styles.input}
                        value={resetForm.otp}
                        onChangeText={(value) => {
                          handleResetChange('otp', value.replace(/\D/g, '').slice(0, 6));
                          setResetError(null);
                        }}
                        placeholder="Enter 6-digit code"
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        placeholderTextColor="#93A5A2"
                      />
                    </View>
                    <Text style={styles.helperText}>We sent the code to {resetForm.email || 'your email address'}.</Text>
                    <View style={styles.resendRow}>
                      <Text style={styles.helperText}>
                        {resendSeconds > 0 ? `Request a new code in ${resendSeconds}s` : 'Did not receive it?'}
                      </Text>
                      <Pressable
                        onPress={() => {
                          requestResetOtp({ isResend: true });
                        }}
                        disabled={resetLoading || resendSeconds > 0}
                        hitSlop={8}>
                        <Text
                          style={[
                            styles.resendLink,
                            resetLoading || resendSeconds > 0 ? styles.resendLinkDisabled : null,
                          ]}>
                          Resend code
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {resetStep === 'password' ? (
                  <>
                    <View style={styles.modalInputGroup}>
                      <Text style={styles.label}>New password</Text>
                      <View style={styles.inputRow}>
                        <Ionicons name="lock-closed-outline" size={20} color={teal} />
                        <TextInput
                          style={styles.input}
                          value={resetForm.newPassword}
                          onChangeText={(value) => handleResetChange('newPassword', value)}
                          placeholder="At least 6 characters"
                          secureTextEntry={!isNewPasswordVisible}
                          textContentType="newPassword"
                          placeholderTextColor="#93A5A2"
                        />
                        <Pressable
                          style={styles.iconButton}
                          onPress={() => setIsNewPasswordVisible((current) => !current)}
                          hitSlop={8}>
                          <Ionicons
                            name={isNewPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                            size={21}
                            color="#617C79"
                          />
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.modalInputGroup}>
                      <Text style={styles.label}>Confirm password</Text>
                      <View style={styles.inputRow}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={teal} />
                        <TextInput
                          style={styles.input}
                          value={resetForm.confirmNewPassword}
                          onChangeText={(value) => handleResetChange('confirmNewPassword', value)}
                          placeholder="Repeat new password"
                          secureTextEntry={!isNewPasswordVisible}
                          textContentType="newPassword"
                          placeholderTextColor="#93A5A2"
                        />
                      </View>
                    </View>
                  </>
                ) : null}

                {resetStep !== 'email' ? (
                  <Pressable
                    style={styles.backLinkButton}
                    onPress={() => {
                      setResetError(null);
                      setResetNotice(null);
                      setResetStep(resetStep === 'password' ? 'otp' : 'email');
                    }}
                    disabled={resetLoading}>
                    <Ionicons name="arrow-back" size={16} color={teal} />
                    <Text style={styles.backLinkButtonText}>
                      {resetStep === 'password' ? 'Back to code' : 'Change email'}
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  style={[styles.resetButton, resetLoading && styles.buttonDisabled]}
                  onPress={() => {
                    if (resetStep === 'email') {
                      requestResetOtp();
                      return;
                    }

                    if (resetStep === 'otp') {
                      continueFromOtp();
                      return;
                    }

                    submitResetPassword();
                  }}
                  disabled={resetLoading}>
                  <Text style={styles.primaryButtonText}>
                    {resetLoading
                      ? resetStep === 'email'
                        ? 'Sending...'
                        : 'Updating...'
                      : resetStep === 'email'
                        ? 'Send code'
                        : resetStep === 'otp'
                          ? 'Continue'
                          : 'Update password'}
                  </Text>
                  <View style={styles.resetButtonIcon}>
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                  </View>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  formStack: {
    gap: 15,
  },
  inputGroup: {
    gap: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontSize: 12,
    color: '#2E4644',
    fontWeight: '800',
  },
  forgotLink: {
    color: teal,
    fontSize: 12,
    fontWeight: '900',
  },
  inputRow: {
    minHeight: 48,
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
    paddingVertical: 9,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    marginTop: 6,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 21, 19, 0.45)',
    paddingHorizontal: 18,
  },
  modalKeyboardWrap: {
    width: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    borderRadius: 22,
    backgroundColor: '#F4F8F7',
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 14,
  },
  modalTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    color: '#123532',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetError: {
    color: '#C13B3B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  resetNotice: {
    color: '#157A62',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  stepDot: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#CFE0DD',
  },
  stepDotActive: {
    backgroundColor: teal,
  },
  modalInputGroup: {
    gap: 5,
    marginBottom: 12,
  },
  helperText: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    marginTop: 2,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  resendLink: {
    color: teal,
    fontSize: 12,
    fontWeight: '900',
  },
  resendLinkDisabled: {
    color: '#93A5A2',
  },
  backLinkButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  backLinkButtonText: {
    color: teal,
    fontSize: 12,
    fontWeight: '900',
  },
  resetButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: teal,
    marginTop: 4,
  },
  resetButtonIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
