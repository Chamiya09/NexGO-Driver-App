import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import MapView, { Marker, Polyline, UrlTile, Camera } from 'react-native-maps';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as geolib from 'geolib';
import * as Location from 'expo-location';
import { useDriverAuth } from '@/context/driver-auth-context';
import driverSocket from '@/lib/driverSocket';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const teal = '#008080';

// ── Types ─────────────────────────────────────────────────────────────────────
type LatLng = { latitude: number; longitude: number };
type ActiveRideStatus = 'Accepted' | 'Arrived' | 'InProgress';
type NavigationPhase = 'PICKUP' | 'TRIP';

// ── Route fetcher ────────────────────────────────────────────────────────
async function fetchOsrmRoute(from: LatLng, to: LatLng) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data?.routes?.length) throw new Error('No route found');

  const route = data.routes[0];
  return {
    coords: route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng })
    ) as LatLng[],
    distanceKm: (route.distance / 1000).toFixed(1),
    durationMin: Math.round(route.duration / 60),
  };
}

export default function ActiveRideScreen() {
  const router = useRouter();
  const { driver } = useDriverAuth();
  const mapRef = useRef<MapView>(null);

  const params = useLocalSearchParams<{
    id: string;
    passengerName: string;
    vehicleType: string;
    price: string;
    pLat: string; pLng: string; pName: string;
    dLat: string; dLng: string; dName: string;
    drLat?: string; drLng?: string;
  }>();

  const rideId = params.id;
  const passengerName = params.passengerName ?? 'Passenger';
  const vehicleType = params.vehicleType ?? 'Ride';
  const price = Number(params.price ?? 0);

  const pickupLocation: LatLng = { latitude: parseFloat(params.pLat ?? '0'), longitude: parseFloat(params.pLng ?? '0') };
  const dropoffLocation: LatLng = { latitude: parseFloat(params.dLat ?? '0'), longitude: parseFloat(params.dLng ?? '0') };
  const pName = params.pName ?? '';
  const dName = params.dName ?? '';

  const hasDriverCoords = !!(params.drLat && params.drLng);
  // Track continuous location
  const [driverPos, setDriverPos] = useState<LatLng>(
    hasDriverCoords
      ? { latitude: parseFloat(params.drLat!), longitude: parseFloat(params.drLng!) }
      : pickupLocation
  );

  const [status, setStatus] = useState<ActiveRideStatus>('Accepted');
  const [navigationPhase, setNavigationPhase] = useState<NavigationPhase>('PICKUP');

  const currentDestination = navigationPhase === 'PICKUP' ? pickupLocation : dropoffLocation;

  const [heading, setHeading] = useState(0);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [slicedRouteCoords, setSlicedRouteCoords] = useState<LatLng[]>([]);
  const [distance, setDistance] = useState('—');
  const [duration, setDuration] = useState('—');
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [processing, setProcessing] = useState(false);

  // ── Load map route when phase changes ──────────────────────────────────
  useEffect(() => {
    let active = true;
    const fetchRoute = async () => {
      setLoadingRoute(true);
      try {
        const result = navigationPhase === 'PICKUP'
          ? await fetchOsrmRoute(driverPos, pickupLocation)
          : await fetchOsrmRoute(pickupLocation, dropoffLocation);

        if (active) {
          setRouteCoords(result.coords);

          // Apply initial geolib slicing
          const closestIndex = geolib.findNearest(driverPos, result.coords) as LatLng;
          const routeMatchedIndex = result.coords.findIndex(c => c.latitude === closestIndex.latitude && c.longitude === closestIndex.longitude);
          const activeSegment = routeMatchedIndex >= 0 ? result.coords.slice(routeMatchedIndex) : result.coords;

          setSlicedRouteCoords(activeSegment);
          setDistance(`${result.distanceKm} km`);
          setDuration(`${result.durationMin} min`);

          setTimeout(() => {
            mapRef.current?.fitToCoordinates(result.coords, {
              edgePadding: { top: 80, right: 40, bottom: 340, left: 40 },
              animated: true,
            });
          }, 600);
        }
      } catch (err) {
        console.error('[ActiveRide] Route fetch error:', err);
      } finally {
        if (active) setLoadingRoute(false);
      }
    };

    fetchRoute();
    return () => { active = false; };
  }, [navigationPhase, pickupLocation.latitude, pickupLocation.longitude, dropoffLocation.latitude, dropoffLocation.longitude]);

  // Continuously snap polyline backwards as driverPos moves
  useEffect(() => {
    if (routeCoords.length > 0) {
      const closestIndex = geolib.findNearest(driverPos, routeCoords) as LatLng;
      const matchedIndex = routeCoords.findIndex(c => c.latitude === closestIndex.latitude && c.longitude === closestIndex.longitude);
      if (matchedIndex >= 0) {
        const remainingPath = routeCoords.slice(matchedIndex);
        setSlicedRouteCoords(remainingPath);
      }
    }
  }, [driverPos, routeCoords]);

  // ── Auto Rotation Tracking & Sockets ───────────────────────────────────
  useEffect(() => {
    let watchSubscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') return;

      watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          const newPos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setDriverPos(newPos);

          if (loc.coords.heading !== null && loc.coords.heading >= 0) {
            setHeading(loc.coords.heading);

            // Auto Layout Camera snapping 45-60° Pitch tracking
            mapRef.current?.animateCamera(
              {
                center: newPos,
                pitch: 55, // Bird's Eye View
                heading: loc.coords.heading,
                altitude: 300,
                zoom: 18,
              },
              { duration: 1500 }
            );
          }
        }
      );
    };

    startTracking();

    const handleStatusUpdate = (data: { rideId: string; status: string }) => {
      if (data.rideId === rideId && data.status === 'Cancelled') {
        Alert.alert('Ride Cancelled', 'The passenger cancelled the request.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
        ]);
      }
    };

    driverSocket.on('rideStatusUpdate', handleStatusUpdate);
    driverSocket.on('rideCancelled', handleStatusUpdate);

    return () => {
      watchSubscription?.remove();
      driverSocket.off('rideStatusUpdate', handleStatusUpdate);
      driverSocket.off('rideCancelled', handleStatusUpdate);
    };
  }, [rideId, router]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleArrived = () => {
    if (!driverSocket.connected || !driver?.id) return;
    setProcessing(true);
    driverSocket.emit('driver_arrived', { rideId, driverId: driver.id });

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStatus('Arrived');
    setNavigationPhase('TRIP');
    setProcessing(false);
  };

  const handleStartTrip = () => {
    if (!driverSocket.connected || !driver?.id) return;
    setProcessing(true);
    driverSocket.emit('start_trip', { rideId, driverId: driver.id });

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStatus('InProgress');
    setProcessing(false);
  };

  const handleCompleteTrip = () => {
    if (!driverSocket.connected || !driver?.id) return;
    setProcessing(true);
    driverSocket.emit('completeRide', { rideId, driverId: driver.id });

    Alert.alert('Trip Completed', 'You have successfully completed the ride.', [
      { text: 'Done', onPress: () => router.replace('/(tabs)/home') }
    ]);
  };

  const callPassenger = () => {
    Alert.alert('Call Passenger', 'Calling passenger...');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* Full-screen Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        mapType="none"
        loadingEnabled={true}
        loadingBackgroundColor="#EAE6DF"
        loadingIndicatorColor="#169F95"
        initialRegion={{
          latitude: pickupLocation.latitude || 6.9271,
          longitude: pickupLocation.longitude || 79.8612,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}>
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />

        {/* Driver marker (Car) */}
        <Marker coordinate={driverPos} anchor={{ x: 0.5, y: 0.5 }} zIndex={5} rotation={heading}>
          <View style={styles.driverCarMarker}>
            <Ionicons name="car-sport" size={20} color="#FFF" />
          </View>
        </Marker>

        {/* Pickup marker (Person) */}
        {navigationPhase === 'PICKUP' && (
          <Marker coordinate={pickupLocation} anchor={{ x: 0.5, y: 1 }} zIndex={4}>
            <View style={styles.premiumDestMarker}>
              <View style={[styles.premiumIconWrap, { backgroundColor: teal }]}>
                <Ionicons name="person" size={14} color="#FFF" />
              </View>
              <Text style={styles.markerText} numberOfLines={1}>{pName || 'Pickup'}</Text>
            </View>
            <View style={[styles.premiumPointer, { borderTopColor: teal }]} />
          </Marker>
        )}

        {/* Dropoff marker (Flag) */}
        {navigationPhase === 'TRIP' && (
          <Marker coordinate={dropoffLocation} anchor={{ x: 0.5, y: 1 }} zIndex={4}>
            <View style={styles.premiumDestMarker}>
              <View style={[styles.premiumIconWrap, { backgroundColor: '#1A365D' }]}>
                <Ionicons name="flag" size={14} color="#FFF" />
              </View>
              <Text style={styles.markerText} numberOfLines={1}>{dName || 'Drop-off'}</Text>
            </View>
            <View style={[styles.premiumPointer, { borderTopColor: '#1A365D' }]} />
          </Marker>
        )}

        {/* Sliced Dynamic Route Polyline */}
        {slicedRouteCoords.length > 0 && (
          <>
            <Polyline
              coordinates={slicedRouteCoords}
              strokeColor={navigationPhase === 'PICKUP' ? '#017270' : '#0B2347'}
              strokeWidth={9}
              lineJoin="round" lineCap="round" zIndex={2}
            />
            <Polyline
              coordinates={slicedRouteCoords}
              strokeColor={navigationPhase === 'PICKUP' ? teal : '#1E40AF'}
              strokeWidth={5}
              lineJoin="round" lineCap="round" zIndex={3}
            />
          </>
        )}
      </MapView>

      {/* ── Top bar ── */}
      <SafeAreaView style={styles.topSafe}>
        <View style={styles.statusPillTop}>
          <View style={[styles.statusDotPulse, { backgroundColor: navigationPhase === 'PICKUP' ? teal : '#1E40AF' }]} />
          <Text style={styles.statusPillText}>
            {status === 'Accepted' ? 'En route to pickup' : status === 'Arrived' ? 'At Pickup' : 'Heading to destination'}
          </Text>
        </View>
      </SafeAreaView>

      {/* ── Bottom Sheet ── */}
      <View style={styles.sheet}>
        <View style={styles.handleRow}><View style={styles.handle} /></View>

        {loadingRoute ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={teal} size="large" />
            <Text style={styles.loadingText}>Updating route...</Text>
          </View>
        ) : (
          <>
            <View style={styles.passengerHeaderRow}>
              <View style={styles.passengerAvatar}>
                <Ionicons name="person" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.passengerName}>{passengerName}</Text>
                <Text style={styles.vehicleType}>{vehicleType} • LKR {price}</Text>
              </View>

              <TouchableOpacity style={styles.callBtn} onPress={callPassenger}>
                <Ionicons name="call" size={20} color={teal} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <StatChip icon="map-pin" label="Distance" value={distance} color={status === 'Accepted' ? '#017270' : '#1A365D'} />
              <StatChip icon="clock" label="ETA" value={duration} color={status === 'Accepted' ? '#017270' : '#1A365D'} />
            </View>

            {/* Actions */}
            {status === 'Accepted' ? (
              <TouchableOpacity
                style={styles.premiumFab}
                onPress={handleArrived}
                disabled={processing}>
                {processing ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="location" size={24} color="#FFF" />
                    <Text style={styles.premiumFabText}>I Have Arrived</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : status === 'Arrived' ? (
              <TouchableOpacity
                style={[styles.premiumFab, { backgroundColor: '#1A365D' }]}
                onPress={handleStartTrip}
                disabled={processing}>
                {processing ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="play" size={24} color="#FFF" />
                    <Text style={styles.premiumFabText}>Start Trip</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.premiumFab, { backgroundColor: '#1E40AF' }]}
                onPress={handleCompleteTrip}
                disabled={processing}>
                {processing ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="flag" size={24} color="#FFF" />
                    <Text style={styles.premiumFabText}>Complete Trip</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatChip({ icon, label, value, color }: {
  icon: keyof typeof Feather.glyphMap; label: string; value: string; color: string;
}) {
  return (
    <View style={[chipStyles.tile, { borderColor: color + '30' }]}>
      <Feather name={icon} size={18} color={color} style={{ marginBottom: 4 }} />
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={[chipStyles.value, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EAE6DF' },

  topSafe: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  statusPillTop: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  statusDotPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: teal },
  statusPillText: { fontSize: 13, fontWeight: '800', color: '#102A28' },

  // Premium Markers
  driverCarMarker: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#017270',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 12,
  },
  premiumDestMarker: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 8, maxWidth: 200,
    borderWidth: 2, borderColor: '#FFF',
  },
  premiumIconWrap: { width: 22, height: 22, borderRadius: 11, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  markerText: { fontSize: 13, fontWeight: '900', color: '#102A28' },
  premiumPointer: {
    width: 0, height: 0, backgroundColor: 'transparent',
    borderStyle: 'solid', borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    alignSelf: 'center', marginTop: -2,
  },

  // Premium Bottom sheet
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.1, shadowRadius: 28, elevation: 24,
  },
  handleRow: { alignItems: 'center', marginBottom: 20 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#D1E0DE' },

  passengerHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 24,
  },
  passengerAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#C8DDD9',
    alignItems: 'center', justifyContent: 'center'
  },
  passengerName: { fontSize: 22, fontWeight: '900', color: '#102A28' },
  vehicleType: { fontSize: 14, fontWeight: '700', color: '#6AA8A4', marginTop: 2 },

  callBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#F0F7F6',
    alignItems: 'center', justifyContent: 'center'
  },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },

  premiumFab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: teal,
    paddingVertical: 18, borderRadius: 24, gap: 12,
    shadowColor: teal, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
  },
  premiumFabText: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },

  loadingWrap: { alignItems: 'center', paddingVertical: 30 },
  loadingText: { marginTop: 10, fontWeight: '700', color: '#617C79' },
});

const chipStyles = StyleSheet.create({
  tile: {
    flex: 1, backgroundColor: '#F7FBFA',
    borderRadius: 14, borderWidth: 1,
    padding: 12, alignItems: 'center',
  },
  label: { fontSize: 11, fontWeight: '800', color: '#8CA1A0', marginBottom: 2 },
  value: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
});
