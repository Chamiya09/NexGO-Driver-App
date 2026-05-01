import React, { useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import RefreshableScrollView from '@/components/RefreshableScrollView';
import { useDriverAuth } from '@/context/driver-auth-context';
import { API_BASE_URL, parseApiResponse } from '@/lib/api';

const teal = '#008080';

type TicketPriority = 'Normal' | 'Urgent';

const DRIVER_TOPICS = [
  { title: 'Trip assignment issue', icon: 'navigate-outline' as const, hint: 'Wrong requests, pickup problems, or trip flow issues.' },
  { title: 'Passenger issue', icon: 'people-outline' as const, hint: 'Passenger behavior, no-shows, or communication concerns.' },
  { title: 'Earnings or payout', icon: 'wallet-outline' as const, hint: 'Fare mismatch, payout delay, bonus, or wallet questions.' },
  { title: 'Document verification', icon: 'document-text-outline' as const, hint: 'License, insurance, registration, or approval status.' },
  { title: 'Vehicle profile issue', icon: 'car-sport-outline' as const, hint: 'Vehicle category, plate, seats, or profile updates.' },
  { title: 'Driver app issue', icon: 'phone-portrait-outline' as const, hint: 'App crashes, notifications, maps, or online status.' },
  { title: 'Account activation', icon: 'shield-checkmark-outline' as const, hint: 'Account approval, suspension, or profile access.' },
  { title: 'Safety incident', icon: 'alert-circle-outline' as const, hint: 'Report urgent safety concerns during driver trips.' },
];

export default function DriverSupportHelpScreen() {
  const { token } = useDriverAuth();
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(DRIVER_TOPICS[0].title);
  const [priority, setPriority] = useState<TicketPriority>('Normal');
  const [subject, setSubject] = useState('');
  const [rideReference, setRideReference] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const topic = useMemo(
    () => DRIVER_TOPICS.find((item) => item.title === selectedTopic) ?? DRIVER_TOPICS[0],
    [selectedTopic]
  );

  const submitTicket = async () => {
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();

    if (!token) {
      Alert.alert('Login required', 'Please sign in before opening a support ticket.');
      return;
    }

    if (trimmedSubject.length < 3) {
      Alert.alert('Add a subject', 'Subject must be at least 3 characters.');
      return;
    }

    if (trimmedDescription.length < 12) {
      Alert.alert('Add more detail', 'Description must be at least 12 characters.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/support-tickets/driver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: selectedTopic,
          subject: trimmedSubject,
          rideReference: rideReference.trim(),
          description: trimmedDescription,
          priority,
        }),
      });
      const data = await parseApiResponse<{ ticket: { id: string } }>(response);

      setSubject('');
      setRideReference('');
      setDescription('');
      setPriority('Normal');
      Alert.alert('Ticket opened', 'Your driver support ticket is now pending.', [
        { text: 'View Tickets', onPress: () => router.push('/profile/my-support-tickets') },
        { text: 'OK' },
      ]);
      void data;
    } catch (error) {
      Alert.alert('Could not open ticket', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <RefreshableScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Ionicons name="headset-outline" size={16} color={teal} />
            <Text style={styles.heroBadgeText}>Driver support</Text>
          </View>
          <Text style={styles.heroTitle}>Open Driver Support Ticket</Text>
          <Text style={styles.heroSubtitle}>Get support for trips, payouts, documents, passengers, and account access.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Support Topic</Text>
          <Pressable style={styles.dropdownButton} onPress={() => setTopicMenuOpen((open) => !open)}>
            <View style={styles.topicIcon}>
              <Ionicons name={topic.icon} size={18} color={teal} />
            </View>
            <View style={styles.dropdownTextWrap}>
              <Text style={styles.dropdownTitle}>{topic.title}</Text>
              <Text style={styles.dropdownHint} numberOfLines={1}>{topic.hint}</Text>
            </View>
            <Ionicons name={topicMenuOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={19} color="#617C79" />
          </Pressable>

          {topicMenuOpen && (
            <View style={styles.dropdownMenu}>
              {DRIVER_TOPICS.map((item) => (
                <Pressable
                  key={item.title}
                  style={[styles.dropdownOption, selectedTopic === item.title && styles.dropdownOptionActive]}
                  onPress={() => {
                    setSelectedTopic(item.title);
                    setTopicMenuOpen(false);
                  }}>
                  <Ionicons name={item.icon} size={17} color={teal} />
                  <View style={styles.dropdownOptionTextWrap}>
                    <Text style={styles.dropdownOptionTitle}>{item.title}</Text>
                    <Text style={styles.dropdownOptionHint} numberOfLines={2}>{item.hint}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <TextInput value={subject} onChangeText={setSubject} placeholder="Subject" placeholderTextColor="#8AA09D" style={styles.input} />
          <TextInput
            value={rideReference}
            onChangeText={setRideReference}
            placeholder="Ride ID or reference (optional)"
            placeholderTextColor="#8AA09D"
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what happened"
            placeholderTextColor="#8AA09D"
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.descriptionInput]}
          />

          <View style={styles.priorityRow}>
            {(['Normal', 'Urgent'] as const).map((option) => {
              const isSelected = priority === option;
              const isUrgent = option === 'Urgent';
              return (
                <Pressable
                  key={option}
                  onPress={() => setPriority(option)}
                  style={[styles.priorityOption, isSelected && (isUrgent ? styles.priorityUrgent : styles.priorityNormal)]}>
                  <Ionicons name={isUrgent ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={16} color={isSelected && isUrgent ? '#C13B3B' : teal} />
                  <Text style={[styles.priorityText, isSelected && isUrgent && styles.priorityUrgentText]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable disabled={saving} style={[styles.submitButton, saving && styles.submitButtonDisabled]} onPress={() => void submitTicket()}>
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>{saving ? 'Opening ticket...' : 'Open Driver Ticket'}</Text>
          </Pressable>
        </View>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8F7' },
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  heroCard: { borderRadius: 22, borderWidth: 1, borderColor: '#D9E9E6', backgroundColor: '#FFFFFF', padding: 16, marginBottom: 14 },
  heroBadge: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#E7F5F3', paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  heroBadgeText: { color: teal, fontSize: 12, fontWeight: '900' },
  heroTitle: { color: '#102A28', fontSize: 22, fontWeight: '900', marginBottom: 6 },
  heroSubtitle: { color: '#617C79', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  formCard: { borderRadius: 18, borderWidth: 1, borderColor: '#D9E9E6', backgroundColor: '#FFFFFF', padding: 14, gap: 10 },
  fieldLabel: { color: '#102A28', fontSize: 13, fontWeight: '900' },
  dropdownButton: { minHeight: 62, borderRadius: 13, borderWidth: 1, borderColor: '#D9E9E6', backgroundColor: '#F7FBFA', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  topicIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#E7F5F3', alignItems: 'center', justifyContent: 'center' },
  dropdownTextWrap: { flex: 1, gap: 2 },
  dropdownTitle: { color: '#102A28', fontSize: 14, fontWeight: '900' },
  dropdownHint: { color: '#617C79', fontSize: 12, fontWeight: '600' },
  dropdownMenu: { borderRadius: 13, borderWidth: 1, borderColor: '#D9E9E6', backgroundColor: '#FFFFFF', overflow: 'hidden' },
  dropdownOption: { minHeight: 62, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#EAF0EF' },
  dropdownOptionActive: { backgroundColor: '#E7F5F3' },
  dropdownOptionTextWrap: { flex: 1, gap: 2 },
  dropdownOptionTitle: { color: '#102A28', fontSize: 13, fontWeight: '900' },
  dropdownOptionHint: { color: '#617C79', fontSize: 11, lineHeight: 15, fontWeight: '600' },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#D9E9E6', backgroundColor: '#F7FBFA', paddingHorizontal: 12, paddingVertical: 10, color: '#102A28', fontSize: 14, fontWeight: '700' },
  descriptionInput: { minHeight: 116, lineHeight: 20 },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityOption: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#D9E9E6', backgroundColor: '#F7FBFA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  priorityNormal: { backgroundColor: '#E7F5F3', borderColor: teal },
  priorityUrgent: { backgroundColor: '#FFF1F1', borderColor: '#C13B3B' },
  priorityText: { color: teal, fontSize: 13, fontWeight: '900' },
  priorityUrgentText: { color: '#C13B3B' },
  submitButton: { minHeight: 50, borderRadius: 13, backgroundColor: teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitButtonDisabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
