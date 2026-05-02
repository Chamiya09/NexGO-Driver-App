import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import RefreshableScrollView from '@/components/RefreshableScrollView';
import { useDriverAuth } from '@/context/driver-auth-context';
import { fetchDriverStats, formatLkr, type DriverActivity, type DriverStats } from '@/lib/driver-stats';
import { API_BASE_URL } from '@/lib/api';

const teal = '#008080';

type EarningsStatus = 'ready' | 'processing' | 'scheduled';

type EarningsCardItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  updatedAt: string;
  status: EarningsStatus;
};

const statusMeta = {
  ready: {
    label: 'READY',
    color: '#157A62',
    backgroundColor: '#E9F8EF',
    icon: 'checkmark-circle-outline' as const,
  },
  processing: {
    label: 'PROCESSING',
    color: '#9A6B00',
    backgroundColor: '#FFF7E0',
    icon: 'time-outline' as const,
  },
  scheduled: {
    label: 'SCHEDULED',
    color: teal,
    backgroundColor: '#E7F5F3',
    icon: 'calendar-outline' as const,
  },
};

function buildEarningsCards(stats: DriverStats | null): EarningsCardItem[] {
  return [
    {
      id: 'available',
      title: 'Available Balance',
      subtitle: 'Completed ride income in your driver account',
      icon: 'wallet-outline',
      value: formatLkr(stats?.availableBalance ?? 0),
      updatedAt: stats ? `${stats.completedRides} completed rides` : 'Loading ride data',
      status: 'ready',
    },
  ];
}

export default function EarningsScreen() {
  const { driver, token } = useDriverAuth();
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
  });
  const [cashoutVisible, setCashoutVisible] = useState(false);
  const [cashoutAmount, setCashoutAmount] = useState('');
  const completedMetrics = stats
    ? [stats.availableBalance > 0, stats.completedRides > 0, stats.reviewCount > 0].filter(Boolean).length
    : 0;
  const totalMetrics = 3;
  const earningsCards = buildEarningsCards(stats);
  const maxWeeklyEarning = Math.max(...(stats?.weeklyEarnings ?? [0]), 0);
  const chartBars = (stats?.weeklyEarnings ?? Array.from({ length: 7 }, () => 0)).map((value) =>
    maxWeeklyEarning > 0 ? Math.max(20, Math.round((value / maxWeeklyEarning) * 96)) : 20
  );

  const loadStats = useCallback(async () => {
    if (!token) return;

    try {
      setErrorMessage('');
      const nextStats = await fetchDriverStats(token);
      setStats(nextStats);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load driver earnings.');
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats])
  );

  const canCashout =
    bankDetails.bankName.trim().length > 0 &&
    bankDetails.accountName.trim().length > 0 &&
    bankDetails.accountNumber.trim().length > 0;

  const availableBalance = stats?.availableBalance ?? 0;
  const cashoutValue = Number(cashoutAmount);
  const cashoutIsValid =
    Number.isFinite(cashoutValue) && cashoutValue > 0 && cashoutValue <= availableBalance;

  const executeCashout = async (amount: number, onComplete: () => void) => {
    if (!Number.isFinite(amount) || amount <= 0 || amount > availableBalance) {
      Alert.alert('Invalid amount', 'Enter a cashout amount within your available balance.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/driver-auth/me/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Unable to process checkout');
      }

      setStats((current) => {
        if (!current) return current;
        
        const newActivity: DriverActivity = {
          id: `checkout-${Date.now()}`,
          status: 'Checkout',
          amount: -amount,
          dateLabel: 'Just now',
        };

        return {
          ...current,
          availableBalance: Math.max(0, current.availableBalance - amount),
          pendingPayout: (current.pendingPayout ?? 0) + amount,
          recentActivities: [newActivity, ...current.recentActivities].slice(0, 4),
        };
      });

      onComplete();
    } catch (error) {
      Alert.alert('Checkout Failed', error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  const handleCashout = () => {
    executeCashout(cashoutValue, () => {
      setCashoutAmount('');
      setCashoutVisible(false);
    });
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <RefreshableScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        onRefreshPage={loadStats}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#102A28" />
          </Pressable>
          <Text style={styles.topBarTitle}>Earnings</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroAvatar}>
              <Ionicons name="wallet-outline" size={26} color={teal} />
            </View>

            <View style={styles.heroIdentity}>
              <Text style={styles.heroName}>{driver?.fullName || 'Driver'} earnings</Text>
              <Text style={styles.heroSubline}>
                {completedMetrics} of {totalMetrics} payout checkpoints ready
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(completedMetrics / totalMetrics) * 100}%` }]} />
          </View>

          <View style={styles.heroBadge}>
            <Ionicons name="trending-up-outline" size={15} color={teal} />
            <Text style={styles.heroBadgeText}>{driver?.status || 'Driver account'}</Text>
          </View>

          <Text style={styles.heroHint}>Track your wallet, payout timing, and recent driver performance in one place.</Text>
        </View>

        <Text style={styles.sectionTitle}>EARNING SUMMARY</Text>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color="#C13B3B" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {earningsCards.map((item) => (
          <EarningsCard key={item.id} item={item} />
        ))}

        <Text style={styles.sectionTitle}>CASHOUT</Text>

        <View style={styles.cashoutCard}>
          <View style={styles.cashoutHeader}>
            <View>
              <Text style={styles.cashoutTitle}>Bank details</Text>
              <Text style={styles.cashoutSubtitle}>Add a verified account to receive payouts</Text>
            </View>
            <View style={styles.cashoutBadge}>
              <Ionicons name="cash-outline" size={12} color={teal} />
              <Text style={styles.cashoutBadgeText}>Payout ready</Text>
            </View>
          </View>

          <View style={styles.formGrid}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Bank name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Commercial Bank"
                placeholderTextColor="#9CB3AF"
                value={bankDetails.bankName}
                onChangeText={(value) => setBankDetails((prev) => ({ ...prev, bankName: value }))}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Account name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Driver name"
                placeholderTextColor="#9CB3AF"
                value={bankDetails.accountName}
                onChangeText={(value) => setBankDetails((prev) => ({ ...prev, accountName: value }))}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Account number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="1234567890"
                placeholderTextColor="#9CB3AF"
                keyboardType="number-pad"
                value={bankDetails.accountNumber}
                onChangeText={(value) => setBankDetails((prev) => ({ ...prev, accountNumber: value }))}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Branch (optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Colombo"
                placeholderTextColor="#9CB3AF"
                value={bankDetails.branch}
                onChangeText={(value) => setBankDetails((prev) => ({ ...prev, branch: value }))}
              />
            </View>
          </View>

          <View style={styles.cashoutActions}>
            <Pressable
              style={[styles.cashoutButton, !canCashout && styles.cashoutButtonDisabled]}
              disabled={!canCashout}
              onPress={() => setCashoutVisible(true)}>
              <Ionicons name="wallet-outline" size={16} color="#FFF" />
              <Text style={styles.cashoutButtonText}>Checkout</Text>
            </Pressable>
          </View>

          <View style={styles.cashoutNote}>
            <Ionicons name="information-circle-outline" size={16} color="#617C79" />
            <Text style={styles.cashoutNoteText}>
              Cashouts are processed within 1-2 business days after verification.
            </Text>
          </View>

        </View>

        <Text style={styles.sectionTitle}>RECENT ACTIVITIES</Text>

        {stats?.recentActivities?.length ? (
          <View style={styles.activityCard}>
            {stats.recentActivities.map((activity) => {
              const tone = getActivityTone(activity.status);

              return (
                <View key={activity.id} style={styles.activityRow}>
                  <View style={[styles.activityIconWrap, { backgroundColor: tone.bg }]}>
                    <Ionicons name={tone.icon} size={14} color={tone.text} />
                  </View>
                  <View style={styles.activityTextWrap}>
                    <Text style={styles.activityTitle}>{formatActivityTitle(activity.status)}</Text>
                    <Text style={styles.activitySubtitle}>{activity.dateLabel}</Text>
                  </View>
                  <Text style={styles.activityAmount}>{formatLkr(activity.amount)}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyActivityCard}>
            <Ionicons name="pulse-outline" size={18} color={teal} />
            <Text style={styles.emptyActivityText}>No recent activities yet.</Text>
          </View>
        )}

        <Modal transparent visible={cashoutVisible} animationType="fade" onRequestClose={() => setCashoutVisible(false)}>
          <View style={styles.cashoutOverlay}>
            <View style={styles.cashoutModal}>
              <View style={styles.cashoutModalHeader}>
                <Text style={styles.cashoutModalTitle}>Cashout request</Text>
                <Pressable onPress={() => setCashoutVisible(false)} style={styles.cashoutClose}>
                  <Ionicons name="close" size={16} color="#617C79" />
                </Pressable>
              </View>

              <Text style={styles.cashoutModalSubtitle}>
                Available balance: {formatLkr(availableBalance)}
              </Text>

              <Text style={styles.formLabel}>Cashout amount</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2500"
                placeholderTextColor="#9CB3AF"
                keyboardType="number-pad"
                value={cashoutAmount}
                onChangeText={setCashoutAmount}
              />

              <View style={styles.cashoutModalActions}>
                <Pressable style={styles.saveButton} onPress={() => setCashoutVisible(false)}>
                  <Text style={styles.saveButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.cashoutButton, !cashoutIsValid && styles.cashoutButtonDisabled]}
                  disabled={!cashoutIsValid}
                  onPress={handleCashout}>
                  <Text style={styles.cashoutButtonText}>Confirm cashout</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>


        <Text style={styles.sectionTitle}>WEEKLY PERFORMANCE</Text>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Weekly income trend</Text>
              <Text style={styles.chartSubtitle}>Ride income and online activity snapshot</Text>
            </View>
            <View style={styles.growthPill}>
              <Ionicons name="cash-outline" size={12} color="#157A62" />
              <Text style={styles.growthPillText}>{formatLkr(stats?.todayEarnings ?? 0)}</Text>
            </View>
          </View>

          <View style={styles.chartArea}>
            {chartBars.map((height, index) => (
              <View key={index} style={styles.barColumn}>
                <View style={[styles.bar, { height }]} />
                <Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>PAYOUT GUIDELINES</Text>

        <View style={styles.groupCard}>
          <GuidelineRow icon="checkmark-done-outline" text="Completed trips are added to your wallet after ride confirmation." />
          <GuidelineRow icon="card-outline" text="Bank payouts follow the active settlement schedule on your driver account." />
          <GuidelineRow icon="shield-checkmark-outline" text="Keep documents and account security updated to avoid payout delays." />
        </View>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

function EarningsCard({ item }: { item: EarningsCardItem }) {
  const meta = statusMeta[item.status];

  return (
    <View style={styles.documentCard}>
      <View style={styles.documentHeader}>
        <View style={styles.documentLeft}>
          <View style={styles.documentIconWrap}>
            <Ionicons name={item.icon} size={21} color={teal} />
          </View>

          <View style={styles.documentTextWrap}>
            <Text style={styles.documentTitle}>{item.title}</Text>
            <Text style={styles.documentSubtitle}>{item.subtitle}</Text>
          </View>
        </View>

        <View style={[styles.statusPill, { backgroundColor: meta.backgroundColor }]}>
          <Ionicons name={meta.icon} size={13} color={meta.color} />
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.inlineDivider} />

      <View style={styles.documentFooter}>
        <View style={styles.updatedWrap}>
          <Text style={styles.earningValue}>{item.value}</Text>
          <Text style={styles.updatedText}>{item.updatedAt}</Text>
        </View>

        <Pressable style={styles.uploadButton}>
          <Ionicons name="open-outline" size={15} color={teal} />
          <Text style={styles.uploadButtonText}>View</Text>
        </Pressable>
      </View>
    </View>
  );
}

function GuidelineRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.guidelineRow}>
      <View style={styles.guidelineIconWrap}>
        <Ionicons name={icon} size={17} color={teal} />
      </View>
      <Text style={styles.guidelineText}>{text}</Text>
    </View>
  );
}

function getActivityTone(status: DriverActivity['status'] | string) {
  if (status === 'Completed') {
    return { text: '#157A62', bg: '#E9F8EF', icon: 'checkmark-circle-outline' as const };
  }
  if (status === 'Cancelled') {
    return { text: '#C13B3B', bg: '#FFF1F1', icon: 'close-circle-outline' as const };
  }
  if (status === 'Pending') {
    return { text: '#9A6B00', bg: '#FFF7E0', icon: 'time-outline' as const };
  }
  if (status === 'Checkout') {
    return { text: teal, bg: '#E7F5F3', icon: 'wallet-outline' as const };
  }

  return { text: teal, bg: '#E7F5F3', icon: 'navigate-outline' as const };
}

function formatActivityTitle(status: DriverActivity['status'] | string) {
  if (status === 'InProgress') return 'Ride in progress';
  if (status === 'Checkout') return 'Bank checkout';
  return `${status} ride`;
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
    marginBottom: 12,
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
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D9E9E6',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: teal,
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
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0C6C6',
    backgroundColor: '#FFF4F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#C13B3B',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  documentCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 10,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  documentLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 11,
  },
  documentIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentTextWrap: {
    flex: 1,
  },
  documentTitle: {
    color: '#102A28',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  documentSubtitle: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  statusPill: {
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  inlineDivider: {
    height: 1,
    backgroundColor: '#D9E9E6',
    marginVertical: 11,
  },
  documentFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  updatedWrap: {
    flex: 1,
    gap: 4,
  },
  earningValue: {
    color: '#102A28',
    fontSize: 18,
    fontWeight: '900',
  },
  updatedText: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '600',
  },
  uploadButton: {
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
  uploadButtonText: {
    color: teal,
    fontSize: 12,
    fontWeight: '800',
  },
  cashoutCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 12,
  },
  cashoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  cashoutTitle: {
    color: '#102A28',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  cashoutSubtitle: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '500',
  },
  cashoutBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E7F5F3',
  },
  cashoutBadgeText: {
    color: teal,
    fontSize: 10,
    fontWeight: '800',
  },
  formGrid: {
    gap: 10,
    marginBottom: 12,
  },
  formField: {
    gap: 6,
  },
  formLabel: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '700',
  },
  formInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
    paddingHorizontal: 12,
    color: '#102A28',
    fontSize: 13,
    fontWeight: '600',
  },
  cashoutActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  saveButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveButtonText: {
    color: teal,
    fontSize: 12,
    fontWeight: '800',
  },
  cashoutButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cashoutButtonDisabled: {
    backgroundColor: '#5CA39E',
    opacity: 0.7,
  },
  cashoutButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cashoutNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
    padding: 10,
  },
  cashoutNoteText: {
    flex: 1,
    color: '#617C79',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  cashoutOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 21, 19, 0.45)',
    paddingHorizontal: 16,
  },
  cashoutModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  cashoutModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cashoutModalTitle: {
    color: '#102A28',
    fontSize: 16,
    fontWeight: '800',
  },
  cashoutModalSubtitle: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  cashoutClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashoutModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  activityCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextWrap: {
    flex: 1,
  },
  activityTitle: {
    color: '#102A28',
    fontSize: 13,
    fontWeight: '800',
  },
  activitySubtitle: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '600',
  },
  activityAmount: {
    color: '#102A28',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyActivityCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emptyActivityText: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 10,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 11,
  },
  chartTitle: {
    color: '#102A28',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  chartSubtitle: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  growthPill: {
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E9F8EF',
  },
  growthPillText: {
    color: '#157A62',
    fontSize: 10,
    fontWeight: '900',
  },
  chartArea: {
    height: 132,
    borderRadius: 14,
    backgroundColor: '#F7FBFA',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    width: 20,
    borderRadius: 10,
    backgroundColor: teal,
  },
  barLabel: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '800',
  },
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  guidelineIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidelineText: {
    flex: 1,
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
});
