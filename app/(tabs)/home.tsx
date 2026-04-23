import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useDriverAuth } from '@/context/driver-auth-context';
import driverSocket from '@/lib/driverSocket';
import {
  NotificationAlert,
  NotificationAlertRef,
  RideNotificationData,
  haversineKm,
} from '@/components/NotificationAlert';

const teal = '#008080';

// ── Driver location ───────────────────────────────────────────────────────────
// Using a static Colombo position. Replace broadcastLocation() with
// expo-location when real GPS is needed.
const DRIVER_COORDS = { latitude: 6.9271, longitude: 79.8612 };

export default function DriverHomeScreen() {
  const { driver } = useDriverAuth();
  const router    = useRouter();
  const mapRef    = useRef<MapView>(null);

  const [isOnline, setIsOnline]       = useState(false);
  const [socketOk, setSocketOk]       = useState(driverSocket.connected);
  const isOnlineRef                   = useRef(false);

  // Ref to the imperative NotificationAlert API
  const alertRef = useRef<NotificationAlertRef>(null);

  // ── Socket connection status ─────────────────────────────────────────────
  useEffect(() => {
    const onConnect    = () => setSocketOk(true);
    const onDisconnect = () => setSocketOk(false);
    driverSocket.on('connect',    onConnect);
    driverSocket.on('disconnect', onDisconnect);
    return () => {
      driverSocket.off('connect',    onConnect);
      driverSocket.off('disconnect', onDisconnect);
    };
  }, []);

  // ── Location broadcasting every 10 s ─────────────────────────────────────
  useEffect(() => {
    if (!driver?.id) return;
    const emit = () =>
      driverSocket.emit('updateDriverLocation', {
        driverId: driver.id,
        ...DRIVER_COORDS,
      });
    emit();
    const id = setInterval(emit, 10_000);
    return () => clearInterval(id);
  }, [driver?.id]);

  // ── Incoming ride listener ────────────────────────────────────────────────
  useEffect(() => {
    const onIncomingRide = (rideData: RideNotificationData) => {
      console.log('[Driver] incomingRide received:', rideData);

      // Always log it; only show alert when Online
      if (!isOnlineRef.current) {
        console.log('[Driver] Alert suppressed — driver is Offline');
        return;
      }

      const distanceKm = haversineKm(
        DRIVER_COORDS.latitude,  DRIVER_COORDS.longitude,
        rideData.pickup.latitude, rideData.pickup.longitude,
      );
      alertRef.current?.show({ ...rideData, distanceKm });
    };

    driverSocket.on('incomingRide', onIncomingRide);
    return () => { driverSocket.off('incomingRide', onIncomingRide); };
  }, []); // runs once — alertRef and isOnlineRef are refs, no deps needed

  // ── Online toggle ────────────────────────────────────────────────────────
  const handleToggleOnline = (value: boolean) => {
    isOnlineRef.current = value;
    setIsOnline(value);
    if (!value) alertRef.current?.dismiss();
  };

  // ── Alert tap → Ride Preview ─────────────────────────────────────────────
  const handleAlertPress = (data: RideNotificationData) => {
    router.push({
      pathname: '/ride-preview/[id]',
      params: {
        id:            data.rideId,
        passengerName: data.passengerName,
        vehicleType:   data.vehicleType,
        price:         String(data.price),
        pLat:  String(data.pickup.latitude),
        pLng:  String(data.pickup.longitude),
        pName: data.pickup.name  ?? '',
        dLat:  String(data.dropoff.latitude),
        dLng:  String(data.dropoff.longitude),
        dName: data.dropoff.name ?? '',
        drLat: String(DRIVER_COORDS.latitude),
        drLng: String(DRIVER_COORDS.longitude),
      },
    });
  };

  // ── Re-center map ────────────────────────────────────────────────────────
  const handleLocate = () => {
    mapRef.current?.animateToRegion({
      ...DRIVER_COORDS,
      latitudeDelta:  0.018,
      longitudeDelta: 0.018,
    }, 600);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* ── REAL MapView (fills screen) ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        mapType="standard"
        showsUserLocation={false}
        showsMyLocationButton={false}
        initialRegion={{
          ...DRIVER_COORDS,
          latitudeDelta:  0.025,
          longitudeDelta: 0.025,
        }}>

        {/* Driver position marker */}
        <Marker coordinate={DRIVER_COORDS} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.driverPin}>
            <Ionicons name="car-sport" size={18} color="#FFF" />
          </View>
        </Marker>
      </MapView>

      {/*
        ── IMPORTANT: NotificationAlert MUST be a sibling of MapView at root
           level, NOT inside SafeAreaView.  Placing it in SafeAreaView causes
           the absolute positioning to be clipped / offset incorrectly.
      */}
      <NotificationAlert ref={alertRef} onPress={handleAlertPress} timeout={25_000} />

      {/* ── UI overlay (SafeAreaView for padding) ── */}
      <SafeAreaView style={styles.overlay} edges={['top']}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.greeting}>NexGO Driver</Text>
            <View style={styles.subRow}>
              {/* Socket connected indicator */}
              <View style={[styles.connDot, socketOk ? styles.connDotOn : styles.connDotOff]} />
              <Text style={styles.subtext}>
                {isOnline ? 'Online — ready for rides' : 'Go online to receive requests'}
              </Text>
            </View>
          </View>

          <View style={[styles.statusPill, isOnline ? styles.pillOnline : styles.pillOffline]}>
            <Text style={[styles.statusLabel, isOnline ? styles.statusLabelOn : styles.statusLabelOff]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#CDD8D6', true: '#6FCF97' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#CDD8D6"
            />
          </View>
        </View>
      </SafeAreaView>

      {/* Re-center button */}
      <Pressable
        style={[styles.locateBtn, { bottom: 220 }]}
        onPress={handleLocate}>
        <Ionicons name="locate-outline" size={22} color={teal} />
      </Pressable>

      {/* Bottom summary card */}
      <View style={[
        styles.bottomCard,
        { paddingBottom: Platform.OS === 'ios' ? 28 : 16 },
      ]}>
        <View style={styles.handleRow}><View style={styles.handle} /></View>

        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardEyebrow}>TODAY</Text>
            <Text style={styles.cardTitle}>Driver Summary</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={[styles.liveDot, isOnline && styles.liveDotOn]} />
            <Text style={styles.liveBadgeText}>{isOnline ? 'Accepting rides' : 'Paused'}</Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricTile}>
            <View style={styles.metricIcon}>
              <Ionicons name="cash-outline" size={18} color={teal} />
            </View>
            <Text style={styles.metricValue}>LKR 8,420</Text>
            <Text style={styles.metricLabel}>Today's Earnings</Text>
          </View>
          <View style={styles.metricTile}>
            <View style={styles.metricIcon}>
              <Ionicons name="checkmark-done-outline" size={18} color={teal} />
            </View>
            <Text style={styles.metricValue}>12</Text>
            <Text style={styles.metricLabel}>Rides Completed</Text>
          </View>
          <View style={styles.metricTile}>
            <View style={styles.metricIcon}>
              <Ionicons name="star-outline" size={18} color={teal} />
            </View>
            <Text style={styles.metricValue}>4.9</Text>
            <Text style={styles.metricLabel}>Rating</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const STATUS_BAR_H = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 0;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EAE6DF' },

  // ── Map driver pin
  driverPin: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: teal,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },

  // ── UI overlay
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    // No bottom — let it just wrap the top bar
  },

  // ── Top bar
  topBar: {
    marginHorizontal: 14,
    marginTop: STATUS_BAR_H > 0 ? 8 : 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#D9E9E6',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 14, elevation: 5,
  },
  topBarLeft: { flex: 1 },
  greeting:  { fontSize: 19, fontWeight: '800', color: '#102A28', marginBottom: 4 },
  subRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connDot:   { width: 7, height: 7, borderRadius: 4 },
  connDotOn: { backgroundColor: '#27AE60' },
  connDotOff:{ backgroundColor: '#D97706' },
  subtext:   { fontSize: 12, fontWeight: '600', color: '#617C79' },

  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 10, paddingRight: 3, paddingVertical: 3,
    borderRadius: 16, gap: 4,
  },
  pillOnline:  { backgroundColor: '#E9F8EF' },
  pillOffline: { backgroundColor: '#F0F5F4' },
  statusLabel:    { fontSize: 12, fontWeight: '900' },
  statusLabelOn:  { color: '#178A4F' },
  statusLabelOff: { color: '#617C79' },

  // ── Locate button
  locateBtn: {
    position: 'absolute', right: 14,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#D9E9E6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
  },

  // ── Bottom card
  bottomCard: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderWidth: 1, borderColor: '#D9E9E6',
    paddingHorizontal: 18, paddingTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08, shadowRadius: 18, elevation: 12,
  },
  handleRow: { alignItems: 'center', marginBottom: 12 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: '#A0B3B2', opacity: 0.4 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14, gap: 10,
  },
  cardEyebrow: { fontSize: 11, fontWeight: '800', color: teal, marginBottom: 2 },
  cardTitle:   { fontSize: 18, fontWeight: '900', color: '#102A28' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F7FBFA',
    borderWidth: 1, borderColor: '#D9E9E6',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
  },
  liveDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A0B3B2' },
  liveDotOn: { backgroundColor: '#27AE60' },
  liveBadgeText: { fontSize: 12, fontWeight: '800', color: '#617C79' },
  metricRow: { flexDirection: 'row', gap: 10 },
  metricTile: {
    flex: 1, backgroundColor: '#F7FBFA',
    borderRadius: 14, borderWidth: 1, borderColor: '#D9E9E6', padding: 12,
  },
  metricIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#E7F5F3',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  metricValue: { fontSize: 16, fontWeight: '900', color: '#102A28', marginBottom: 2 },
  metricLabel: { fontSize: 11, fontWeight: '700', color: '#617C79', lineHeight: 15 },
});
