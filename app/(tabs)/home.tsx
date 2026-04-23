import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDriverAuth } from '@/context/driver-auth-context';
import driverSocket from '@/lib/driverSocket';

const teal = '#008080';

// ── Types ─────────────────────────────────────────────────────────────────────
type Coords = {
  latitude: number;
  longitude: number;
  name?: string;
};

type IncomingRideData = {
  rideId: string;
  passengerId: string;
  passengerName: string;
  vehicleType: string;
  price: number;
  pickup: Coords;
  dropoff: Coords;
  requestedAt: string;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function DriverHomeScreen() {
  const { driver } = useDriverAuth();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const isOnlineRef = useRef(false); // mutable ref for socket callback closure

  // Floating alert card state
  const [alertRide, setAlertRide] = useState<IncomingRideData | null>(null);

  // Slide-in animation for the alert card
  const slideAnim = useRef(new Animated.Value(-200)).current;

  // ── Location broadcasting ─────────────────────────────────────────────────
  // In a real app you'd use expo-location here. We use a static placeholder
  // (driver's last known location) so proximity logic is exercised.
  const MOCK_DRIVER_LOCATION = { latitude: 6.9271, longitude: 79.8612 }; // Colombo

  useEffect(() => {
    if (!driver?.id) return;

    // Register driver location so the backend can do proximity filtering
    const broadcastLocation = () => {
      driverSocket.emit('updateDriverLocation', {
        driverId: driver.id,
        ...MOCK_DRIVER_LOCATION,
      });
    };

    // Send immediately and then every 10 s
    broadcastLocation();
    const interval = setInterval(broadcastLocation, 10_000);
    return () => clearInterval(interval);
  }, [driver?.id]);

  // ── Socket event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const handleIncomingRide = (rideData: IncomingRideData) => {
      console.log('[Driver] incomingRide received:', rideData);

      // Only surface the alert if driver toggled themselves Online
      if (!isOnlineRef.current) return;

      setAlertRide(rideData);
      // Slide the card in from the top
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 9,
      }).start();
    };

    driverSocket.on('incomingRide', handleIncomingRide);
    return () => {
      driverSocket.off('incomingRide', handleIncomingRide);
    };
  }, [slideAnim]);

  // Keep the mutable ref in sync with the React state
  const handleToggleOnline = (value: boolean) => {
    isOnlineRef.current = value;
    setIsOnline(value);
    if (!value) dismissAlert(); // hide card when going offline
  };

  // ── Alert card helpers ────────────────────────────────────────────────────
  const dismissAlert = () => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setAlertRide(null));
  };

  const handleAlertPress = () => {
    if (!alertRide) return;

    // Navigate to the full Ride Preview screen with all data as query params
    router.push({
      pathname: '/ride-preview/[id]',
      params: {
        id: alertRide.rideId,
        passengerName: alertRide.passengerName,
        vehicleType: alertRide.vehicleType,
        price: String(alertRide.price),
        pLat: String(alertRide.pickup.latitude),
        pLng: String(alertRide.pickup.longitude),
        pName: alertRide.pickup.name ?? '',
        dLat: String(alertRide.dropoff.latitude),
        dLng: String(alertRide.dropoff.longitude),
        dName: alertRide.dropoff.name ?? '',
      },
    });

    dismissAlert();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {/* ── Mock Map Background ── */}
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

        {/* ── Floating Incoming Ride Alert Card ── */}
        {alertRide && (
          <Animated.View
            style={[styles.alertCard, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.alertInner}
              onPress={handleAlertPress}>
              {/* Left icon */}
              <View style={styles.alertIconWrap}>
                <Ionicons name="car-sport" size={22} color="#FFF" />
              </View>

              {/* Text */}
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>New Ride Request 🚨</Text>
                <Text style={styles.alertSub} numberOfLines={1}>
                  {alertRide.vehicleType} · {alertRide.pickup.name || 'Nearby pickup'}
                </Text>
                <Text style={styles.alertCta}>Tap to preview →</Text>
              </View>

              {/* Fare chip */}
              <View style={styles.alertFareChip}>
                <Text style={styles.alertFareText}>
                  LKR {alertRide.price.toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Dismiss X */}
            <TouchableOpacity style={styles.alertClose} onPress={dismissAlert}>
              <Ionicons name="close" size={18} color="#617C79" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Top Bar ── */}
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

        {/* ── Driver Summary Card ── */}
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

  // Mock map
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E9F0EF',
    overflow: 'hidden',
  },
  mapRoad: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderColor: '#D9E9E6',
    borderWidth: 1,
  },
  mapRoadPrimary: {
    width: 86, height: '130%', left: '46%', top: -80,
    transform: [{ rotate: '32deg' }],
  },
  mapRoadSecondary: {
    width: '130%', height: 62, left: -70, top: '38%',
    transform: [{ rotate: '-12deg' }],
  },
  mapRoadTertiary: {
    width: '120%', height: 48, left: -40, top: '64%',
    transform: [{ rotate: '14deg' }],
  },
  mapBlock: { position: 'absolute', backgroundColor: '#DDEAE8', borderRadius: 14 },
  mapBlockOne:   { width: 130, height: 86,  left: 22,  top: 132 },
  mapBlockTwo:   { width: 154, height: 104, right: 12, top: 246 },
  mapBlockThree: { width: 122, height: 92,  left: 28,  bottom: 232 },
  locationPin: {
    position: 'absolute', top: '46%', left: '48%',
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: teal,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16, shadowRadius: 12, elevation: 5,
  },

  safeOverlay: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },

  // ── Floating alert card ───────────────────────────────────────────────────
  alertCard: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 32) + 80 : 110,
    left: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 14,
    overflow: 'hidden',
  },
  alertInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    // green left-edge accent
    borderLeftWidth: 5,
    borderLeftColor: '#27AE60',
  },
  alertIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#27AE60',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  alertText: { flex: 1 },
  alertTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#102A28',
    marginBottom: 2,
  },
  alertSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#617C79',
    marginBottom: 4,
  },
  alertCta: {
    fontSize: 12,
    fontWeight: '800',
    color: teal,
  },
  alertFareChip: {
    backgroundColor: '#E9F8EF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexShrink: 0,
  },
  alertFareText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#27AE60',
  },
  alertClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  greeting:  { fontSize: 20, fontWeight: '800', color: '#102A28', marginBottom: 3 },
  subtext:   { fontSize: 12, lineHeight: 17, fontWeight: '600', color: '#617C79' },
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
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#D9E9E6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },

  // ── Summary card ──────────────────────────────────────────────────────────
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
    minHeight: 28, borderRadius: 14,
    backgroundColor: '#F7FBFA', borderWidth: 1, borderColor: '#D9E9E6',
    paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  liveDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A0B3B2' },
  liveDotOn:  { backgroundColor: '#27AE60' },
  liveBadgeText: { color: '#617C79', fontSize: 12, fontWeight: '800' },
  metricRow: { flexDirection: 'row', gap: 10 },
  metricTile: {
    flex: 1, borderRadius: 16, borderWidth: 1,
    borderColor: '#D9E9E6', backgroundColor: '#F7FBFA', padding: 12,
  },
  metricIconWrap: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: '#E7F5F3',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  metricValue: { fontSize: 18, fontWeight: '900', color: '#102A28', marginBottom: 3 },
  metricLabel: { color: '#617C79', fontSize: 12, fontWeight: '700', lineHeight: 16 },
});
