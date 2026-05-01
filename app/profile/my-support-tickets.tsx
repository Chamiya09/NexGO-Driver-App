import React, { useCallback, useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
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
      <RefreshableScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} onRefreshPage={loadTickets}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="file-tray-full-outline" size={22} color={teal} />
          </View>
          <Text style={styles.heroTitle}>My Driver Support Tickets</Text>
          <Text style={styles.heroSubtitle}>Track support status, ticket priority, and admin replies from NexGO operations.</Text>
          <Pressable style={styles.newButton} onPress={() => router.push('/profile/support-help')}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.newButtonText}>New Ticket</Text>
          </Pressable>
        </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8F7' },
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  heroCard: { borderRadius: 18, borderWidth: 1, borderColor: '#D9E9E6', backgroundColor: '#FFFFFF', padding: 14, marginBottom: 14, gap: 10 },
  heroIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E7F5F3', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#102A28', fontSize: 21, fontWeight: '900' },
  heroSubtitle: { color: '#617C79', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  newButton: { minHeight: 46, borderRadius: 13, backgroundColor: teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  newButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  emptyCard: { minHeight: 180, borderRadius: 18, borderWidth: 1, borderColor: '#D9E9E6', backgroundColor: '#FFFFFF', padding: 18, alignItems: 'center', justifyContent: 'center', gap: 10 },
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
