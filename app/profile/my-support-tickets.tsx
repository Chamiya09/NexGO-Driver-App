import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import RefreshableScrollView from '@/components/RefreshableScrollView';
import { useDriverAuth } from '@/context/driver-auth-context';
import { API_BASE_URL, parseApiResponse } from '@/lib/api';

const teal = '#008080';

type DriverTicket = {
  id: string;
  topic: string;
  subject: string;
  description: string;
  rideReference: string;
  priority: 'Normal' | 'Urgent';
  status: 'Pending' | 'Open' | 'In Review' | 'Resolved' | 'Closed';
  adminNote: string;
  createdAt: string;
  updatedAt: string;
};

const statusTone = {
  Pending: { color: '#B27A00', bg: '#FFF7E2', icon: 'time-outline' as const },
  Open: { color: teal, bg: '#E7F5F3', icon: 'radio-button-on-outline' as const },
  'In Review': { color: '#B27A00', bg: '#FFF7E2', icon: 'hourglass-outline' as const },
  Resolved: { color: '#157A62', bg: '#E8F7F0', icon: 'checkmark-done-outline' as const },
  Closed: { color: '#667085', bg: '#F2F4F7', icon: 'lock-closed-outline' as const },
};

export default function DriverSupportTicketsScreen() {
  const { token } = useDriverAuth();
  const [tickets, setTickets] = useState<DriverTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    if (!token) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/support-tickets/driver/my-tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiResponse<{ tickets: DriverTicket[] }>(response);
      setTickets(data.tickets ?? []);
    } catch (error) {
      Alert.alert('Could not load tickets', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadTickets();
    }, [loadTickets])
  );

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Recently'
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <RefreshableScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} onRefreshPage={loadTickets}>
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#102A28" />
            </Pressable>
            <Text style={styles.topBarTitle}>Support Tickets</Text>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIcon}>
                <Ionicons name="file-tray-full-outline" size={28} color={teal} />
              </View>

              <View style={styles.heroIdentity}>
                <Text style={styles.heroName}>My Tickets</Text>
                <Text style={styles.heroSubline}>Manage your active and past support requests.</Text>
              </View>
            </View>

            <View style={styles.heroBadge}>
              <Ionicons name="chatbubbles-outline" size={15} color={teal} />
              <Text style={styles.heroBadgeText}>Driver Support</Text>
            </View>

            <Text style={styles.heroHint}>Track support status, ticket priority, and admin replies from NexGO operations.</Text>
          </View>

          <Text style={styles.sectionTitle}>TICKET ACTIONS</Text>

          <View style={styles.groupCard}>
            <View style={styles.setupHeaderRow}>
              <View style={styles.detailsHeader}>
                <View style={styles.vehicleIntroIcon}>
                  <Ionicons name="add-circle-outline" size={20} color={teal} />
                </View>

                <View style={styles.detailsHeaderText}>
                  <Text style={styles.detailsTitle}>Create new ticket</Text>
                  <Text style={styles.detailsHint}>Open a new support ticket if you need help with trips, earnings, or app issues.</Text>
                </View>
              </View>

              <View style={styles.setupActions}>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => router.push('/profile/support-help')}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>New</Text>
                </Pressable>

                <Pressable
                  style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
                  onPress={() => void loadTickets()}
                  disabled={loading}>
                  <Ionicons name="refresh" size={18} color={teal} />
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>YOUR TICKETS</Text>

          {loading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Loading tickets...</Text>
            </View>
          ) : tickets.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbox-ellipses-outline" size={30} color={teal} />
              <Text style={styles.emptyTitle}>No driver support tickets yet</Text>
              <Text style={styles.emptyText}>Open a driver support ticket and it will appear here.</Text>
            </View>
          ) : (
            tickets.map((ticket) => {
              const tone = statusTone[ticket.status] ?? statusTone.Pending;
              const isUrgent = ticket.priority === 'Urgent';
              return (
                <View key={ticket.id} style={styles.ticketCard}>
                  <View style={[styles.ticketAccent, { backgroundColor: isUrgent ? '#C13B3B' : teal }]} />
                  <View style={styles.ticketTopRow}>
                    <View style={styles.ticketHeadingRow}>
                      <View style={styles.ticketIconWrap}>
                        <Ionicons name="chatbubble-ellipses-outline" size={18} color={teal} />
                      </View>
                      <View style={styles.ticketTextWrap}>
                        <Text style={styles.ticketTitle}>{ticket.subject}</Text>
                        <Text style={styles.ticketDate}>Created {formatDate(ticket.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
                      <Ionicons name={tone.icon} size={13} color={tone.color} />
                      <Text style={[styles.statusBadgeText, { color: tone.color }]}>{ticket.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.ticketDescription} numberOfLines={3}>{ticket.description}</Text>
                  <View style={styles.metaPanel}>
                    <View style={styles.topicPill}>
                      <Ionicons name="albums-outline" size={14} color={teal} />
                      <Text style={styles.topicText}>{ticket.topic}</Text>
                    </View>
                    <View style={[styles.priorityPill, isUrgent ? styles.priorityUrgent : styles.priorityNormal]}>
                      <Text style={[styles.priorityText, isUrgent && styles.priorityTextUrgent]}>{ticket.priority}</Text>
                    </View>
                    {!!ticket.rideReference && <Text style={styles.referenceText}>Ride {ticket.rideReference}</Text>}
                  </View>
                  {!!ticket.adminNote && (
                    <View style={styles.replyBox}>
                      <Text style={styles.replyLabel}>Support reply</Text>
                      <Text style={styles.replyText}>{ticket.adminNote}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </RefreshableScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  setupActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 8,
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.55,
  },
  emptyCard: {
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: { color: '#102A28', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: '#617C79', fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
  ticketCard: { borderRadius: 16, borderWidth: 1, borderColor: '#D9E9E6', backgroundColor: '#FFFFFF', padding: 14, marginBottom: 12, overflow: 'hidden' },
  ticketAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  ticketTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  ticketHeadingRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ticketIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#E7F5F3', alignItems: 'center', justifyContent: 'center' },
  ticketTextWrap: { flex: 1, gap: 2 },
  ticketTitle: { color: '#102A28', fontSize: 15, fontWeight: '900' },
  ticketDate: { color: '#617C79', fontSize: 11, fontWeight: '600' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusBadgeText: { fontSize: 11, fontWeight: '900' },
  ticketDescription: { color: '#617C79', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  metaPanel: { borderRadius: 13, borderWidth: 1, borderColor: '#D9E9E6', backgroundColor: '#F7FBFA', padding: 10, marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  topicPill: { borderRadius: 999, backgroundColor: '#E7F5F3', paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  topicText: { color: teal, fontSize: 11, fontWeight: '900' },
  priorityPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  priorityNormal: { backgroundColor: '#E7F5F3' },
  priorityUrgent: { backgroundColor: '#FFF1F1' },
  priorityText: { color: teal, fontSize: 11, fontWeight: '900' },
  priorityTextUrgent: { color: '#C13B3B' },
  referenceText: { color: '#617C79', fontSize: 11, fontWeight: '700' },
  replyBox: { borderRadius: 13, borderWidth: 1, borderColor: '#D9E9E6', backgroundColor: '#F7FBFA', padding: 11, marginTop: 12, gap: 4 },
  replyLabel: { color: '#102A28', fontSize: 12, fontWeight: '900' },
  replyText: { color: '#617C79', fontSize: 12, lineHeight: 18, fontWeight: '600' },
});
