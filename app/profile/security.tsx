import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDriverAuth } from '@/context/driver-auth-context';

const teal = '#008080';

export default function DriverSecurityScreen() {
  const { driver, updateSecurity } = useDriverAuth();
  const [twoStepEnabled, setTwoStepEnabled] = useState(driver?.security?.twoStepVerificationEnabled ?? true);

  const showPlaceholder = (title: string) => {
    Alert.alert(title, 'This is a placeholder action for the driver security flow.');
  };

  useEffect(() => {
    setTwoStepEnabled(driver?.security?.twoStepVerificationEnabled ?? true);
  }, [driver?.security?.twoStepVerificationEnabled]);

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

        <View style={styles.groupCard}>
          <SecurityActionRow
            icon="key-outline"
            title="Change password"
            subtitle="Update your sign-in password regularly"
            onPress={() => showPlaceholder('Change password')}
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
});
