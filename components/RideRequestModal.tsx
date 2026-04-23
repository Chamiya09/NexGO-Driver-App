import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const teal = '#008080';

type RideRequestModalProps = {
  visible: boolean;
  countdownSeconds?: number;
  onAccept?: () => void;
  onDecline?: () => void;
};

export default function RideRequestModal({
  visible,
  countdownSeconds = 12,
  onAccept,
  onDecline,
}: RideRequestModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>INCOMING RIDE</Text>
              <Text style={styles.title}>Passenger request</Text>
            </View>
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownText}>{countdownSeconds}s</Text>
            </View>
          </View>

          <View style={styles.passengerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>SM</Text>
            </View>
            <View>
              <Text style={styles.passengerName}>Sarah Mendis</Text>
              <Text style={styles.passengerMeta}>4.8 rating</Text>
            </View>
          </View>

          <View style={styles.routeCard}>
            <RouteLine icon="radio-button-on" label="Pickup Location" value="Colombo Fort Station" />
            <View style={styles.routeDivider} />
            <RouteLine icon="location" label="Drop-off Location" value="Bandaranaike Airport" />
          </View>

          <View style={styles.tripStatsRow}>
            <View style={styles.tripStat}>
              <Ionicons name="navigate-outline" size={18} color={teal} />
              <Text style={styles.tripStatValue}>28.4 km</Text>
              <Text style={styles.tripStatLabel}>Distance</Text>
            </View>
            <View style={styles.tripStat}>
              <Ionicons name="cash-outline" size={18} color={teal} />
              <Text style={styles.tripStatValue}>LKR 4,850</Text>
              <Text style={styles.tripStatLabel}>Estimated Fare</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.declineButton} onPress={onDecline}>
              <Text style={styles.declineText}>Decline</Text>
            </Pressable>
            <Pressable style={styles.acceptButton} onPress={onAccept}>
              <Text style={styles.acceptText}>Accept</Text>
              <View style={styles.acceptCountdownRing}>
                <Text style={styles.acceptCountdownText}>{countdownSeconds}</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RouteLine({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.routeLine}>
      <View style={styles.routeIconWrap}>
        <Ionicons name={icon} size={17} color={teal} />
      </View>
      <View style={styles.routeTextWrap}>
        <Text style={styles.routeLabel}>{label}</Text>
        <Text style={styles.routeValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 21, 19, 0.45)',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    alignSelf: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  eyebrow: {
    color: teal,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 3,
  },
  title: {
    color: '#102A28',
    fontSize: 20,
    fontWeight: '900',
  },
  countdownBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: teal,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F5F3',
  },
  countdownText: {
    color: teal,
    fontSize: 13,
    fontWeight: '900',
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E7F5F3',
    borderWidth: 1,
    borderColor: '#D9E9E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: teal,
    fontSize: 16,
    fontWeight: '900',
  },
  passengerName: {
    color: '#102A28',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  passengerMeta: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '600',
  },
  routeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
    padding: 12,
    marginBottom: 12,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTextWrap: {
    flex: 1,
  },
  routeLabel: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  routeValue: {
    color: '#102A28',
    fontSize: 14,
    fontWeight: '800',
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#D9E9E6',
    marginVertical: 10,
    marginLeft: 42,
  },
  tripStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  tripStat: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  tripStatValue: {
    color: '#102A28',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 6,
    marginBottom: 2,
  },
  tripStatLabel: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  declineButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1D6D6',
    backgroundColor: '#FFF4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    color: '#C13B3B',
    fontSize: 15,
    fontWeight: '900',
  },
  acceptButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: teal,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  acceptCountdownRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptCountdownText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
});
