import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <RefreshableScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#102A28" />
            </Pressable>
            <Text style={styles.topBarTitle}>Driver Support</Text>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIcon}>
                <Ionicons name="headset-outline" size={28} color={teal} />
              </View>

              <View style={styles.heroIdentity}>
                <Text style={styles.heroName}>Open Support Ticket</Text>
                <Text style={styles.heroSubline}>Get help from NexGO operations.</Text>
              </View>
            </View>

            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark-outline" size={15} color={teal} />
              <Text style={styles.heroBadgeText}>Driver Assistance</Text>
            </View>

            <Text style={styles.heroHint}>Submit a request for trips, payouts, documents, passengers, and account access.</Text>
          </View>

          <Text style={styles.sectionTitle}>TICKET DETAILS</Text>

          <View style={styles.groupCard}>
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput value={subject} onChangeText={setSubject} placeholder="Brief summary" placeholderTextColor="#617C79" style={styles.input} />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ride Reference</Text>
              <TextInput
                value={rideReference}
                onChangeText={setRideReference}
                placeholder="Optional (e.g. Ride ID)"
                placeholderTextColor="#617C79"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what happened in detail..."
                placeholderTextColor="#617C79"
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.descriptionInput]}
              />
            </View>

            <Text style={styles.fieldLabel}>Ticket Priority</Text>
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
            
            <View style={styles.inlineDivider} />

            <Pressable disabled={saving} style={[styles.submitButton, saving && styles.submitButtonDisabled]} onPress={() => void submitTicket()}>
              <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
              <Text style={styles.submitText}>{saving ? 'Submitting...' : 'Open Driver Ticket'}</Text>
            </Pressable>
          </View>
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
  fieldLabel: {
    color: '#102A28',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },
  dropdownButton: {
    minHeight: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  topicIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownTextWrap: {
    flex: 1,
    gap: 2,
  },
  dropdownTitle: {
    color: '#102A28',
    fontSize: 14,
    fontWeight: '900',
  },
  dropdownHint: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownMenu: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 14,
  },
  dropdownOption: {
    minHeight: 62,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF0EF',
  },
  dropdownOptionActive: {
    backgroundColor: '#E7F5F3',
  },
  dropdownOptionTextWrap: {
    flex: 1,
    gap: 2,
  },
  dropdownOptionTitle: {
    color: '#102A28',
    fontSize: 13,
    fontWeight: '900',
  },
  dropdownOptionHint: {
    color: '#617C79',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#102A28',
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionInput: {
    minHeight: 116,
    lineHeight: 20,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  priorityNormal: {
    backgroundColor: '#E7F5F3',
    borderColor: teal,
  },
  priorityUrgent: {
    backgroundColor: '#FFF1F1',
    borderColor: '#C13B3B',
  },
  priorityText: {
    color: teal,
    fontSize: 13,
    fontWeight: '900',
  },
  priorityUrgentText: {
    color: '#C13B3B',
  },
  inlineDivider: {
    height: 1,
    backgroundColor: '#D9E9E6',
    marginVertical: 14,
  },
  submitButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
