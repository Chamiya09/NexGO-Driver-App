import React from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const teal = '#008080';

const chartBars = [42, 68, 54, 88, 72, 96, 62];

export default function EarningsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#102A28" />
          </Pressable>
          <Text style={styles.topBarTitle}>Earnings Dashboard</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>EARNINGS</Text>
          <Text style={styles.title}>Your driver wallet</Text>
          <Text style={styles.subtitle}>Track completed rides, payouts, and weekly cash flow.</Text>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceTopRow}>
            <View>
              <Text style={styles.balanceLabel}>Available balance</Text>
              <Text style={styles.balanceValue}>LKR 24,650</Text>
            </View>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
            </View>
          </View>

          <Pressable style={styles.cashOutButton}>
            <Text style={styles.cashOutText}>Cash Out</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.segmentedControl}>
          <View style={styles.segmentActive}>
            <Text style={styles.segmentActiveText}>Weekly</Text>
          </View>
          <View style={styles.segment}>
            <Text style={styles.segmentText}>Daily</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.cardTitle}>Weekly chart</Text>
              <Text style={styles.cardSubtitle}>Placeholder view for rides and income trends</Text>
            </View>
            <Text style={styles.chartTotal}>+18%</Text>
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

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="car-sport-outline" size={19} color={teal} />
            <Text style={styles.statValue}>58</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={19} color={teal} />
            <Text style={styles.statValue}>41h</Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star-outline" size={19} color={teal} />
            <Text style={styles.statValue}>4.9</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
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
    paddingTop: 12,
    paddingBottom: 34,
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
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    color: teal,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
  },
  title: {
    color: '#102A28',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 5,
  },
  subtitle: {
    color: '#617C79',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  balanceCard: {
    borderRadius: 22,
    backgroundColor: teal,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#005D5D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashOutButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cashOutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E9E6',
    padding: 4,
    marginBottom: 14,
  },
  segmentActive: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActiveText: {
    color: teal,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentText: {
    color: '#617C79',
    fontSize: 13,
    fontWeight: '800',
  },
  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#102A28',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 3,
  },
  cardSubtitle: {
    color: '#617C79',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  chartTotal: {
    color: '#157A62',
    fontSize: 13,
    fontWeight: '900',
  },
  chartArea: {
    height: 140,
    borderRadius: 14,
    backgroundColor: '#F7FBFA',
    paddingHorizontal: 12,
    paddingTop: 16,
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    color: '#102A28',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
  },
  statLabel: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
