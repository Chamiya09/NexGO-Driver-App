import React, { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import RefreshableScrollView from '@/components/RefreshableScrollView';
import { useDriverAuth } from '@/context/driver-auth-context';
import { fetchDriverStats, formatLkr, type DriverStats } from '@/lib/driver-stats';

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
    {
      id: 'pending',
      title: 'Pending Payout',
      subtitle: 'Accepted or in-progress ride value',
      icon: 'hourglass-outline',
      value: formatLkr(stats?.pendingPayout ?? 0),
      updatedAt: stats ? `${stats.activeRides} active rides` : 'Loading ride data',
      status: 'processing',
    },
    {
      id: 'next',
      title: 'Next Settlement',
      subtitle: 'Scheduled bank transfer window',
      icon: 'business-outline',
      value: stats?.nextSettlementLabel ?? 'Loading...',
      updatedAt: 'Bank transfer',
      status: 'scheduled',
    },
  ];
}

export default function EarningsScreen() {
  const { driver, token } = useDriverAuth();
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
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
