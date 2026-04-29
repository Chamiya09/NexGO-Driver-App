import React from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDriverAuth } from '@/context/driver-auth-context';

const teal = '#008080';

type ProfileSection = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?:
    | '/profile/personal-details'
    | '/profile/vehicle-details'
    | '/profile/document-uploads'
    | '/profile/security'
    | '/profile/earnings';
  badge?: string;
};

const baseProfileSections: ProfileSection[] = [
  {
    title: 'Personal Details',
    subtitle: 'Driver identity, phone, email, and account profile',
    icon: 'person-circle-outline',
    route: '/profile/personal-details',
  },
  {
    title: 'Vehicle Details',
    subtitle: 'Add the vehicle assigned to your driver account',
    icon: 'car-sport-outline',
    route: '/profile/vehicle-details',
    badge: 'ADD',
  },
  {
    title: 'Document Uploads',
    subtitle: 'License, insurance, and verification documents',
    icon: 'document-text-outline',
    route: '/profile/document-uploads',
    badge: 'ACTION',
  },
  {
    title: 'Security',
    subtitle: 'Password, privacy controls, and trusted devices',
    icon: 'shield-checkmark-outline',
    route: '/profile/security',
  },
  {
    title: 'Earnings',
    subtitle: 'View your wallet, payout settings, and daily revenue',
    icon: 'wallet-outline',
    route: '/profile/earnings',
  },
];

export default function DriverProfileScreen() {
  const { driver, logout } = useDriverAuth();

  const fullName = driver?.fullName || 'NexGO Driver';
  const documents = driver?.documents || [];
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
  const approvedDocuments = documents.filter((document) => document.status === 'approved').length;
  const documentCount = documents.length || 3;
  const documentsNeedingAction = documents.filter((document) => document.status !== 'approved').length;
  const profileMetrics = [
    { label: 'Status', value: driver?.status || 'pending', icon: 'shield-checkmark-outline' as const },
    { label: 'Docs', value: `${approvedDocuments}/${documentCount}`, icon: 'document-text-outline' as const },
    { label: 'Security', value: driver?.security?.twoStepVerificationEnabled ? '2FA On' : '2FA Off', icon: 'shield-outline' as const },
  ];
  const profileSections = baseProfileSections.map((section) =>
    section.route === '/profile/document-uploads'
      ? {
          ...section,
          badge: documentsNeedingAction > 0 ? `${documentsNeedingAction} left` : 'READY',
        }
      : section
  );

  const confirmLogout = () => {
    Alert.alert('Log out', 'Do you want to sign out of this driver device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.profileHead}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials || 'D'}</Text>
            </View>
            <Text style={styles.profileName}>{fullName}</Text>
            <Text style={styles.memberCaption}>{driver?.email || 'NexGO Driver account'}</Text>
          </View>

          <View style={styles.metricsRow}>
            {profileMetrics.map((metric) => (
              <View key={metric.label} style={styles.metricItem}>
                <Ionicons name={metric.icon} size={16} color={teal} />
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.quickActionButton} onPress={() => router.push('/profile/document-uploads')}>
            <Text style={styles.quickActionText}>Open Driver Verification</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.sectionHeadingWrap}>
          <Text style={styles.sectionHeading}>Driver Tools</Text>
          <Text style={styles.sectionSubheading}>Manage your profile, documents, and security</Text>
        </View>

        {profileSections.map((section) => (
          <Pressable
            key={section.title}
            style={styles.settingRow}
            onPress={() => {
              if (section.route) {
                router.push(section.route);
              }
            }}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name={section.icon} size={20} color={teal} />
              </View>

              <View style={styles.settingTextWrap}>
                <Text style={styles.settingText}>{section.title}</Text>
                <Text style={styles.settingSubtext}>{section.subtitle}</Text>
              </View>
            </View>

            <View style={styles.settingRight}>
              {section.badge ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{section.badge}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={21} color="#617C79" />
            </View>
          </Pressable>
        ))}

        <Pressable style={[styles.settingRow, styles.logoutRow]} onPress={confirmLogout}>
          <View style={styles.settingLeft}>
            <View style={styles.logoutIconWrap}>
              <Ionicons name="log-out-outline" size={20} color="#C13B3B" />
            </View>

            <View style={styles.settingTextWrap}>
              <Text style={styles.logoutRowText}>Log out</Text>
              <Text style={styles.settingSubtext}>Sign out of this driver device</Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={21} color="#617C79" />
        </Pressable>

        <View style={styles.footerWrap}>
          <Text style={styles.footerTop}>NexGO Driver</Text>
          <Text style={styles.footerBottom}>Version 1.0.0 (driver foundation)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8F7',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 34,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 18,
  },
  profileHead: {
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
  },
  avatarInitials: {
    color: teal,
    fontSize: 30,
    fontWeight: '800',
  },
  profileName: {
    color: '#102A28',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  memberCaption: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#F7FBFA',
  },
  metricValue: {
    color: '#102A28',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 1,
  },
  metricLabel: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '600',
  },
  quickActionButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: teal,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeadingWrap: {
    marginBottom: 10,
  },
  sectionHeading: {
    color: '#102A28',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 2,
  },
  sectionSubheading: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '500',
  },
  settingRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextWrap: {
    flex: 1,
  },
  settingText: {
    color: '#102A28',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  settingSubtext: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 10,
  },
  badgePill: {
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    paddingHorizontal: 9,
    height: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePillText: {
    color: teal,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  logoutRow: {
    marginTop: 6,
    backgroundColor: '#FFF4F4',
    borderColor: '#F1D6D6',
  },
  logoutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFE9E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutRowText: {
    color: '#C13B3B',
    fontSize: 15,
    fontWeight: '700',
  },
  footerWrap: {
    paddingVertical: 16,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  footerTop: {
    color: '#102A28',
    fontSize: 14,
    marginBottom: 3,
    fontWeight: '700',
  },
  footerBottom: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '500',
  },
});
