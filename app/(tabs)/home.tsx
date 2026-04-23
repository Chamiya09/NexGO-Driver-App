import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDriverAuth } from '@/context/driver-auth-context';
import driverSocket from '@/lib/driverSocket';
import {
  NotificationAlert,
  NotificationAlertRef,
  RideNotificationData,
  haversineKm,
} from '@/components/NotificationAlert';

const teal = '#008080';

// Mock driver location (replace with expo-location in production)
const MOCK_DRIVER_LOCATION = { latitude: 6.9271, longitude: 79.8612 };

export default function DriverHomeScreen() {
  const { driver } = useDriverAuth();
  const router = useRouter();

  const [isOnline, setIsOnline] = useState(false);
  const isOnlineRef = useRef(false);

  // Ref to the imperative NotificationAlert API
  const alertRef = useRef<NotificationAlertRef>(null);

  // ── Location broadcasting ─────────────────────────────────────────────────
  useEffect(() => {
    if (!driver?.id) return;

    const broadcastLocation = () => {
      driverSocket.emit('updateDriverLocation', {
        driverId: driver.id,
        ...MOCK_DRIVER_LOCATION,
      });
    };

    broadcastLocation();
    const interval = setInterval(broadcastLocation, 10_000);
    return () => clearInterval(interval);
  }, [driver?.id]);

  // ── Incoming ride listener ─────────────────────────────────────────────────
  useEffect(() => {
    const handleIncomingRide = (rideData: RideNotificationData) => {
      console.log('[Driver] incomingRide received:', rideData);
      if (!isOnlineRef.current) return;

      // Compute driver → pickup distance for the alert card
      const distanceKm = haversineKm(
        MOCK_DRIVER_LOCATION.latitude,
        MOCK_DRIVER_LOCATION.longitude,
        rideData.pickup.latitude,
        rideData.pickup.longitude
      );

      alertRef.current?.show({ ...rideData, distanceKm });
    };

    driverSocket.on('incomingRide', handleIncomingRide);
    return () => { driverSocket.off('incomingRide', handleIncomingRide); };
  }, []);

  // ── Online toggle ─────────────────────────────────────────────────────────
  const handleToggleOnline = (value: boolean) => {
    isOnlineRef.current = value;
    setIsOnline(value);
    if (!value) alertRef.current?.dismiss();
  };

  // ── Alert tap → navigate to Ride Preview with "navigate to pickup" mode ───
  const handleAlertPress = (data: RideNotificationData) => {
    router.push({
      pathname: '/ride-preview/[id]',
      params: {
        id: data.rideId,
        passengerName: data.passengerName,
        vehicleType: data.vehicleType,
        price: String(data.price),
        // Pickup (passenger location)
        pLat: String(data.pickup.latitude),
        pLng: String(data.pickup.longitude),
        pName: data.pickup.name ?? '',
        // Dropoff
        dLat: String(data.dropoff.latitude),
        dLng: String(data.dropoff.longitude),
        dName: data.dropoff.name ?? '',
        // Driver's current location → navigate-to-pickup mode
        drLat: String(MOCK_DRIVER_LOCATION.latitude),
        drLng: String(MOCK_DRIVER_LOCATION.longitude),
      },
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {/* ── Mock map background ── */}
      <View style={styles.mapLayer}>
        <View style={[styles.mapRoad, styles.mapRoadPrimary]} />
        <View style={[styles.mapRoad, styles.mapRoadSecondary]} />
        <View style={[styles.mapRoad, styles.mapRoadTertiary]} />
        <View style={[styles.mapBlock, styles.mapBlockOne]} />
        <View style={[styles.mapBlock, styles.mapBlockTwo]} />
        <View style={[styles.mapBlock, styles.mapBlockThree]} />
        <View style={styles.locationPin}>
          <Ionicons name="car-sport" size={18} color="#FFFFFF" />
        </View>
      </View>

      <SafeAreaView style={styles.safeOverlay}>
        {/* ── Floating notification alert (over everything) ── */}
        <NotificationAlert ref={alertRef} onPress={handleAlertPress} timeout={25_000} />

        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>NexGO Driver</Text>
            <Text style={styles.subtext}>
              {isOnline ? 'Online and ready for rides' : 'Go online to receive requests'}
            </Text>
          </View>

          <View style={[styles.statusPill, isOnline ? styles.statusPillOnline : styles.statusPillOffline]}>
            <Text style={[styles.statusText, isOnline ? styles.statusTextOnline : styles.statusTextOffline]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#CDD8D6', true: '#6FCF97' }}
              thumbColor={isOnline ? '#FFFFFF' : '#F7FBFA'}
              ios_backgroundColor="#CDD8D6"
            />
          </View>
        </View>

        <Pressable style={styles.centerLocateButton}>
          <Ionicons name="locate-outline" size={22} color={teal} />
        </Pressable>

        {/* ── Driver summary card ── */}
        <View style={styles.bottomCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardEyebrow}>TODAY</Text>
              <Text style={styles.cardTitle}>Driver Summary</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={[styles.liveDot, isOnline ? styles.liveDotOn : null]} />
              <Text style={styles.liveBadgeText}>{isOnline ? 'Accepting' : 'Paused'}</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricTile}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="cash-outline" size={18} color={teal} />
              </View>
              <Text style={styles.metricValue}>LKR 8,420</Text>
              <Text style={styles.metricLabel}>Today&apos;s Earnings</Text>
            </View>
            <View style={styles.metricTile}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="checkmark-done-outline" size={18} color={teal} />
              </View>
              <Text style={styles.metricValue}>12</Text>
              <Text style={styles.metricLabel}>Rides Completed</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F8F7' },

  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E9F0EF',
    overflow: 'hidden',
  },
  mapRoad: { position: 'absolute', backgroundColor: '#FFFFFF', borderColor: '#D9E9E6', borderWidth: 1 },
  mapRoadPrimary:   { width: 86, height: '130%', left: '46%', top: -80,  transform: [{ rotate: '32deg' }] },
  mapRoadSecondary: { width: '130%', height: 62, left: -70, top: '38%',  transform: [{ rotate: '-12deg' }] },
  mapRoadTertiary:  { width: '120%', height: 48, left: -40, top: '64%',  transform: [{ rotate: '14deg' }] },
  mapBlock: { position: 'absolute', backgroundColor: '#DDEAE8', borderRadius: 14 },
  mapBlockOne:   { width: 130, height: 86,  left: 22,  top: 132 },
  mapBlockTwo:   { width: 154, height: 104, right: 12, top: 246 },
  mapBlockThree: { width: 122, height: 92,  left: 28,  bottom: 232 },
  locationPin: {
    position: 'absolute', top: '46%', left: '48%',
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: teal, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16, shadowRadius: 12, elevation: 5,
  },

  safeOverlay: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },

  topBar: {
    marginHorizontal: 16, marginTop: 14, borderRadius: 22,
    borderWidth: 1, borderColor: '#D9E9E6', backgroundColor: '#FFFFFF',
    padding: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 14, elevation: 4,
  },
  greeting: { fontSize: 20, fontWeight: '800', color: '#102A28', marginBottom: 3 },
  subtext:  { fontSize: 12, lineHeight: 17, fontWeight: '600', color: '#617C79' },

  statusPill: {
    borderRadius: 18, paddingLeft: 12, paddingRight: 4, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  statusPillOnline:  { backgroundColor: '#E9F8EF' },
  statusPillOffline: { backgroundColor: '#F0F5F4' },
  statusText:        { fontSize: 12, fontWeight: '900' },
  statusTextOnline:  { color: '#178A4F' },
  statusTextOffline: { color: '#617C79' },

  centerLocateButton: {
    position: 'absolute', right: 16, bottom: 236,
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#D9E9E6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },

  bottomCard: {
    position: 'absolute', left: 16, right: 16, bottom: 18,
    borderRadius: 22, borderWidth: 1, borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF', padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12, shadowRadius: 18, elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    gap: 12, alignItems: 'flex-start', marginBottom: 14,
  },
  cardEyebrow: { fontSize: 11, fontWeight: '800', color: teal, marginBottom: 2 },
  cardTitle:   { fontSize: 19, fontWeight: '800', color: '#102A28' },
  liveBadge: {
    minHeight: 28, borderRadius: 14, backgroundColor: '#F7FBFA',
    borderWidth: 1, borderColor: '#D9E9E6',
    paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  liveDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A0B3B2' },
  liveDotOn: { backgroundColor: '#27AE60' },
  liveBadgeText: { color: '#617C79', fontSize: 12, fontWeight: '800' },
  metricRow: { flexDirection: 'row', gap: 10 },
  metricTile: {
    flex: 1, borderRadius: 16, borderWidth: 1,
    borderColor: '#D9E9E6', backgroundColor: '#F7FBFA', padding: 12,
  },
  metricIconWrap: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: '#E7F5F3', alignItems: 'center',
    justifyContent: 'center', marginBottom: 10,
  },
  metricValue: { fontSize: 18, fontWeight: '900', color: '#102A28', marginBottom: 3 },
  metricLabel: { color: '#617C79', fontSize: 12, fontWeight: '700', lineHeight: 16 },
});
