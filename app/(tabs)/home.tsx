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
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useDriverAuth } from '@/context/driver-auth-context';
import { useNotifications } from '@/context/notifications-context';
import driverSocket from '@/lib/driverSocket';
import { MAP_TILE_URL_TEMPLATE } from '@/lib/mapTiles';
import { fetchDriverStats, formatLkr, formatRating, type DriverStats } from '@/lib/driver-stats';
import {
  NotificationAlert,
  NotificationAlertRef,
  RideNotificationData,
  haversineKm,
} from '@/components/NotificationAlert';
import * as Location from 'expo-location';

const teal = '#008080';

// Replaced with dynamic location
// const DRIVER_COORDS = { latitude: 6.9271, longitude: 79.8612 };

// ── Passenger marker pin ──────────────────────────────────────────────────────
type PassengerPin = {
  rideId: string;
  passengerName: string;
  passengerImage?: string;
  vehicleType: string;
  price: number;
  pickup: RideNotificationData['pickup'];
  dropoff: RideNotificationData['dropoff'];
  latitude: number;
  longitude: number;
};

export default function DriverHomeScreen() {
  const { driver, token } = useDriverAuth();
  const router = useRouter();
  const { addNotification, removeNotification, clearAll } = useNotifications();
  const mapRef = useRef<MapView>(null);
  const alertRef = useRef<NotificationAlertRef>(null);

  const [isOnline, setIsOnline] = useState(false);
  const [socketOk, setSocketOk] = useState(driverSocket.connected);
  const [passengerPins, setPassengerPins] = useState<PassengerPin[]>([]);
  const [driverStats, setDriverStats] = useState<DriverStats | null>(null);
  const isOnlineRef = useRef(false);
  const driverCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const hydratedOnlineRef = useRef(false);

  const [driverCoords, setDriverCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    driverCoordsRef.current = driverCoords;
  }, [driverCoords]);

  useEffect(() => {
    if (hydratedOnlineRef.current || typeof driver?.isOnline !== 'boolean') return;

    hydratedOnlineRef.current = true;
    isOnlineRef.current = driver.isOnline;
    setIsOnline(driver.isOnline);
  }, [driver?.isOnline]);

  useEffect(() => {
    if (!token) {
      setDriverStats(null);
      return;
    }

    let mounted = true;
    fetchDriverStats(token)
      .then((stats) => {
        if (mounted) {
          setDriverStats(stats);
        }
      })
      .catch(() => {
        if (mounted) {
          setDriverStats(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  // ── Setup Location ───────────────────────────────────────────────────────
  useEffect(() => {
    let watchSubscription: Location.LocationSubscription | null = null;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Driver] Permission to access location was denied');
        return;
      }
      // Get initial pos immediately to show map fast
      let initPos = await Location.getCurrentPositionAsync({});
      setDriverCoords({ latitude: initPos.coords.latitude, longitude: initPos.coords.longitude });

      watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          setDriverCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      );
    })();
    return () => { watchSubscription?.remove(); };
  }, []);

  // ── Socket connection status ─────────────────────────────────────────────
  useEffect(() => {
    const emitCurrentDriverLocation = () => {
      const coords = driverCoordsRef.current;
      if (!driver?.id || !coords) return;

      driverSocket.emit('updateDriverLocation', {
        driverId: driver.id,
        ...coords,
        vehicleCategory: driver.vehicle?.category,
        isOnline: isOnlineRef.current,
      });
    };

    const onConnect = () => {
      setSocketOk(true);
      emitCurrentDriverLocation();
    };
    const onDisconnect = () => setSocketOk(false);
    driverSocket.on('connect', onConnect);
    driverSocket.on('disconnect', onDisconnect);
    return () => {
      driverSocket.off('connect', onConnect);
      driverSocket.off('disconnect', onDisconnect);
    };
  }, [driver?.id, driver?.vehicle?.category]);

  // ── Location broadcast every 10 s ────────────────────────────────────────
  useEffect(() => {
    if (!driver?.id || !driverCoords) return;
    const emit = () =>
      driverSocket.emit('updateDriverLocation', {
        driverId: driver.id,
        ...driverCoords,
        vehicleCategory: driver.vehicle?.category,
        isOnline: isOnlineRef.current,
      });
    emit();
    const id = setInterval(emit, 10_000);
    return () => clearInterval(id);
  }, [driver?.id, driver?.vehicle?.category, driverCoords, isOnline]);

  // ── Incoming ride listener ────────────────────────────────────────────────
  useEffect(() => {
    const onIncomingRide = (rideData: RideNotificationData) => {
      console.log('[Driver] incomingRide received:', rideData);

      if (!isOnlineRef.current) {
        console.log('[Driver] Incoming ride ignored - driver is Offline');
        alertRef.current?.dismiss();
        return;
      }

      const computedDistance = driverCoords ? haversineKm(
        driverCoords.latitude, driverCoords.longitude,
        rideData.pickup.latitude, rideData.pickup.longitude,
      ) : 0;

      // Always save to the global notifications list
      addNotification({
        rideId: rideData.rideId,
        passengerId: rideData.passengerId,
        passengerName: rideData.passengerName,
        passengerImage: rideData.passengerImage,
        vehicleType: rideData.vehicleType,
        price: rideData.price,
        pickup: rideData.pickup,
        dropoff: rideData.dropoff,
        distanceKm: computedDistance,
      });

      // Show passenger pickup pin on the map
      setPassengerPins((prev) => {
        if (prev.some((p) => p.rideId === rideData.rideId)) return prev;
        return [
          ...prev,
          {
            rideId: rideData.rideId,
            passengerName: rideData.passengerName,
            passengerImage: rideData.passengerImage,
            vehicleType: rideData.vehicleType,
            price: rideData.price,
            pickup: rideData.pickup,
            dropoff: rideData.dropoff,
            latitude: rideData.pickup.latitude,
            longitude: rideData.pickup.longitude,
          },
        ];
      });

      // Show floating alert card only when driver is Online
      if (!isOnlineRef.current) {
        console.log('[Driver] Alert suppressed — driver is Offline');
        return;
      }
      alertRef.current?.show({ ...rideData, distanceKm: computedDistance });
    };

    driverSocket.on('incomingRide', onIncomingRide);
    return () => { driverSocket.off('incomingRide', onIncomingRide); };
  }, [addNotification, driver?.vehicle?.category, driverCoords]);

  // ── Remove ride listener (Atomic acceptance wipe) ─────────────────────────
  useEffect(() => {
    const onRemoveRide = ({ rideId }: { rideId: string }) => {
      setPassengerPins((prev) => prev.filter(p => p.rideId !== rideId));
      removeNotification(rideId);
      alertRef.current?.dismiss();
    };
    driverSocket.on('remove_ride_request', onRemoveRide);
    return () => {
      driverSocket.off('remove_ride_request', onRemoveRide);
    };
  }, [removeNotification]);

  // ── Online toggle ─────────────────────────────────────────────────────────
  const handleToggleOnline = (value: boolean) => {
    isOnlineRef.current = value;
    setIsOnline(value);

    // Attempt local notifications cleanups while pushing database updates asynchronously
    if (!value) {
      alertRef.current?.dismiss();
      setPassengerPins([]);
      clearAll();
    }
    driverSocket.emit('toggle_online_status', { driverId: driver?.id, isOnline: value });

    if (driverCoords) {
      driverSocket.emit('updateDriverLocation', {
        driverId: driver?.id,
        ...driverCoords,
        vehicleCategory: driver?.vehicle?.category,
        isOnline: value,
      });
    }
  };

  // ── Alert tap → Ride Preview ─────────────────────────────────────────────
  const handleAlertPress = (data: RideNotificationData) => {
    router.push({
      pathname: '/ride-preview/[id]',
      params: {
        id: data.rideId,
        passengerName: data.passengerName,
        passengerImage: data.passengerImage ?? '',
        vehicleType: data.vehicleType,
        price: String(data.price),
        pLat: String(data.pickup.latitude),
        pLng: String(data.pickup.longitude),
        pName: data.pickup.name ?? '',
        dLat: String(data.dropoff.latitude),
        dLng: String(data.dropoff.longitude),
        dName: data.dropoff.name ?? '',
        ...(driverCoords && { drLat: String(driverCoords.latitude), drLng: String(driverCoords.longitude) }),
      },
    });
  };

  // ── Re-center map ────────────────────────────────────────────────────────
  const handleLocate = () => {
    if (driverCoords) {
      mapRef.current?.animateToRegion(
        { ...driverCoords, latitudeDelta: 0.018, longitudeDelta: 0.018 },
        600
      );
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* ── Real MapView ── */}
      {driverCoords && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          mapType="none"
          loadingEnabled={true}
          loadingBackgroundColor="#EAE6DF"
          loadingIndicatorColor="#169F95"
          showsUserLocation={false}
          showsMyLocationButton={false}
          initialRegion={{
            ...driverCoords,
            latitudeDelta: 0.025,
            longitudeDelta: 0.025,
          }}>
          <UrlTile
            urlTemplate={MAP_TILE_URL_TEMPLATE}
            maximumZ={19}
            flipY={false}
          />

          {/* ── Driver position marker ── */}
          <Marker coordinate={driverCoords} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.driverPin}>
              <Ionicons name="car-sport" size={18} color="#FFF" />
            </View>
          </Marker>

          {/* ── Passenger pickup markers (one per incoming ride) ── */}
          {passengerPins.map((pin) => (
            <Marker
              key={pin.rideId}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              anchor={{ x: 0.5, y: 1 }}
              onPress={() =>
                router.push({
                  pathname: '/ride-preview/[id]',
                  params: {
                    id: pin.rideId,
                    passengerName: pin.passengerName,
                    passengerImage: pin.passengerImage ?? '',
                    vehicleType: pin.vehicleType,
                    price: String(pin.price),
                    pLat: String(pin.pickup.latitude),
                    pLng: String(pin.pickup.longitude),
                    pName: pin.pickup.name ?? '',
                    dLat: String(pin.dropoff.latitude),
                    dLng: String(pin.dropoff.longitude),
                    dName: pin.dropoff.name ?? '',
                    ...(driverCoords && { drLat: String(driverCoords.latitude), drLng: String(driverCoords.longitude) })
                  },
                })
              }>
              {/* Custom passenger pin */}
              <View style={styles.passengerPinWrap}>
                <View style={styles.passengerPin}>
                  <Ionicons name="person" size={14} color="#FFF" />
                </View>
                <View style={styles.passengerPinLabel}>
                  <Text style={styles.passengerPinText} numberOfLines={1}>
                    {pin.passengerName.split(' ')[0]}
                  </Text>
                </View>
                <View style={styles.passengerPinPointer} />
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/*
        NotificationAlert MUST be at the root View level (not inside SafeAreaView)
        so its position:absolute uses the full screen coordinate space.
      */}
      <NotificationAlert ref={alertRef} onPress={handleAlertPress} timeout={25_000} />

      {/* ── UI overlay ── */}
      <SafeAreaView style={styles.overlay} edges={['top']}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.greeting}>{driver?.fullName || 'NexGO Driver'}</Text>
            <View style={styles.subRow}>
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

        {/* Passenger pins count chip (when there are pending requests) */}
        {passengerPins.length > 0 && (
          <View style={styles.pinCountChip}>
            <View style={styles.pinCountDot} />
            <Text style={styles.pinCountText}>
              {passengerPins.length} passenger{passengerPins.length > 1 ? 's' : ''} nearby
            </Text>
          </View>
        )}
      </SafeAreaView>

      {/* Re-center button */}
      <Pressable style={styles.locateBtn} onPress={handleLocate}>
        <Ionicons name="locate-outline" size={22} color={teal} />
      </Pressable>

      {/* Bottom summary card */}
      <View style={[styles.bottomCard, { paddingBottom: Platform.OS === 'ios' ? 28 : 16 }]}>
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
          <MetricTile icon="cash-outline" value={formatLkr(driverStats?.todayEarnings ?? 0)} label="Today" />
          <MetricTile icon="checkmark-done-outline" value={String(driverStats?.completedRides ?? 0)} label="Rides Done" />
          <MetricTile icon="star-outline" value={formatRating(driverStats?.averageRating ?? null)} label="Rating" />
        </View>
      </View>
    </View>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────
function MetricTile({ icon, value, label }: {
  icon: string; value: string; label: string;
}) {
  return (
    <View style={styles.metricTile}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon as any} size={18} color={teal} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const STATUS_BAR_H = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 0;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EAE6DF' },

  // ── Driver map pin
  driverPin: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: teal,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },

  // ── Passenger pickup pins
  passengerPinWrap: { alignItems: 'center' },
  passengerPin: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#27AE60',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 5,
  },
  passengerPinLabel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
    marginTop: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  passengerPinText: { fontSize: 10, fontWeight: '900', color: '#102A28' },
  passengerPinPointer: {
    width: 0, height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    marginTop: -1,
  },

  // ── Overlay
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },

  // ── Top bar
  topBar: {
    marginHorizontal: 14,
    marginTop: STATUS_BAR_H > 0 ? 8 : 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#D9E9E6',
    padding: 13,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 14, elevation: 5,
  },
  topBarLeft: { flex: 1 },
  greeting: { fontSize: 19, fontWeight: '800', color: '#102A28', marginBottom: 4 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connDot: { width: 7, height: 7, borderRadius: 4 },
  connDotOn: { backgroundColor: '#27AE60' },
  connDotOff: { backgroundColor: '#D97706' },
  subtext: { fontSize: 12, fontWeight: '600', color: '#617C79' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 10, paddingRight: 3, paddingVertical: 3,
    borderRadius: 16, gap: 4,
  },
  pillOnline: { backgroundColor: '#E9F8EF' },
  pillOffline: { backgroundColor: '#F0F5F4' },
  statusLabel: { fontSize: 12, fontWeight: '900' },
  statusLabelOn: { color: '#178A4F' },
  statusLabelOff: { color: '#617C79' },

  // Passenger count chip
  pinCountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    alignSelf: 'flex-start',
    marginLeft: 14, marginTop: 8,
    backgroundColor: '#E9F8EF',
    borderRadius: 12, borderWidth: 1, borderColor: '#BBE8CC',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  pinCountDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#27AE60' },
  pinCountText: { fontSize: 12, fontWeight: '800', color: '#178A4F' },

  // ── Locate button
  locateBtn: {
    position: 'absolute', right: 14, bottom: 220,
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
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#A0B3B2', opacity: 0.4 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14, gap: 10,
  },
  cardEyebrow: { fontSize: 11, fontWeight: '800', color: teal, marginBottom: 2 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#102A28' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F7FBFA',
    borderWidth: 1, borderColor: '#D9E9E6',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A0B3B2' },
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
