import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useDriverAuth } from '@/context/driver-auth-context';
import driverSocket from '@/lib/driverSocket';

const teal = '#008080';

// ── Types ─────────────────────────────────────────────────────────────────────
type LatLng = { latitude: number; longitude: number };
// 'Accepted' = heading to pickup. 'InProgress' = heading to dropoff.
type ActiveRideStatus = 'Accepted' | 'InProgress';

// ── Route fetcher ────────────────────────────────────────────────────────
async function fetchOsrmRoute(from: LatLng, to: LatLng) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=full&geometries=geojson`;

  const res  = await fetch(url);
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

  const rideId       = params.id;
  const passengerName = params.passengerName ?? 'Passenger';
  const vehicleType  = params.vehicleType   ?? 'Ride';
  const price        = Number(params.price  ?? 0);

  const pickup:  LatLng = { latitude: parseFloat(params.pLat ?? '0'), longitude: parseFloat(params.pLng ?? '0') };
  const dropoff: LatLng = { latitude: parseFloat(params.dLat ?? '0'), longitude: parseFloat(params.dLng ?? '0') };
  const pName = params.pName ?? '';
  const dName = params.dName ?? '';

  const hasDriverCoords = !!(params.drLat && params.drLng);
  // Track continuous mocked location (could use expo-location here)
  const [driverPos, setDriverPos] = useState<LatLng>(
    hasDriverCoords
      ? { latitude: parseFloat(params.drLat!), longitude: parseFloat(params.drLng!) }
      : pickup
  );

  const [status, setStatus] = useState<ActiveRideStatus>('Accepted');
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [distance, setDistance] = useState('—');
  const [duration, setDuration] = useState('—');
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [processing, setProcessing] = useState(false);

  // ── Load map route when status changes ──────────────────────────────────
  useEffect(() => {
    let active = true;
    const fetchRoute = async () => {
      setLoadingRoute(true);
      try {
        const result = status === 'Accepted'
          ? await fetchOsrmRoute(driverPos, pickup) // Heading to pickup
          : await fetchOsrmRoute(pickup, dropoff);  // Heading to drop-off
          
        if (active) {
          setRouteCoords(result.coords);
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
  }, [status, pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude]);

  // ── Status updates from server (just in case they come through here) ───
  useEffect(() => {
    const handleStatusUpdate = (data: { rideId: string; status: string }) => {
      if (data.rideId === rideId) {
        if (data.status === 'Cancelled') {
          Alert.alert('Ride Cancelled', 'The passenger cancelled the request.', [
            { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
          ]);
        }
      }
    };
    driverSocket.on('rideStatusUpdate', handleStatusUpdate);
    driverSocket.on('rideCancelled', handleStatusUpdate);
    return () => {
      driverSocket.off('rideStatusUpdate', handleStatusUpdate);
      driverSocket.off('rideCancelled', handleStatusUpdate);
    };
  }, [rideId, router]); // Fix exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleStartTrip = () => {
    if (!driverSocket.connected || !driver?.id) return;
    setProcessing(true);
    driverSocket.emit('startRide', { rideId, driverId: driver.id });
    // Optimistically update
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

  // ── Call passenger helper ───────────────────────────────────────────────
  const callPassenger = () => {
    Alert.alert('Call Passenger', 'Calling passenger...');
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const isAccepted = status === 'Accepted';

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
          latitude: pickup.latitude || 6.9271,
          longitude: pickup.longitude || 79.8612,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}>
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />

        {/* Driver marker (shows current position if heading to pickup) */}
        {isAccepted && (
          <Marker coordinate={driverPos} anchor={{ x: 0.5, y: 0.5 }} zIndex={5}>
            <View style={styles.driverMarker}>
              <Ionicons name="car-sport" size={16} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Pickup marker */}
        <Marker coordinate={pickup} anchor={{ x: 0.5, y: 1 }} zIndex={4}>
          <View style={styles.markerPill}>
            <View style={[styles.markerDot, { backgroundColor: isAccepted ? '#E74C3C' : '#169F95' }]} />
            <Text style={styles.markerText} numberOfLines={1}>{pName || 'Pickup'}</Text>
          </View>
          <View style={styles.markerPointer} />
        </Marker>

        {/* Dropoff marker (only shown when InProgress) */}
        {!isAccepted && (
          <Marker coordinate={dropoff} anchor={{ x: 0.5, y: 1 }} zIndex={4}>
            <View style={styles.markerPill}>
              <View style={[styles.markerDot, { backgroundColor: '#E74C3C' }]} />
              <Text style={styles.markerText} numberOfLines={1}>{dName || 'Drop-off'}</Text>
            </View>
            <View style={styles.markerPointer} />
          </Marker>
        )}

        {/* Route polyline (outer glow + inner) */}
        {routeCoords.length > 0 && (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor={isAccepted ? '#1A6B3C' : '#017270'}
              strokeWidth={8}
              lineJoin="round" lineCap="round" zIndex={2}
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor={isAccepted ? '#27AE60' : '#169F95'}
              strokeWidth={4}
              lineJoin="round" lineCap="round" zIndex={3}
            />
          </>
        )}
      </MapView>

      {/* ── Top bar ── */}
      <SafeAreaView style={styles.topSafe}>
        <View style={styles.statusPillTop}>
          <View style={styles.statusDotPulse} />
          <Text style={styles.statusPillText}>
            {isAccepted ? 'En route to pickup' : 'Heading to destination'}
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
            {/* Passenger Header */}
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

            {/* Stat chips */}
            <View style={styles.statsRow}>
              <StatChip icon="map-pin" label="Distance" value={distance} color={isAccepted ? '#27AE60' : teal} />
              <StatChip icon="clock"   label="ETA"      value={duration} color={isAccepted ? '#27AE60' : teal} />
            </View>

            {/* Actions */}
            {isAccepted ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#27AE60' }]}
                onPress={handleStartTrip}
                disabled={processing}>
                {processing ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="play" size={20} color="#FFF" />
                    <Text style={styles.primaryBtnText}>Pickup & Start Trip</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleCompleteTrip}
                disabled={processing}>
                {processing ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="flag" size={20} color="#FFF" />
                    <Text style={styles.primaryBtnText}>Drop-off & Complete</Text>
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

  // Markers
  driverMarker: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#27AE60',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  markerPill: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 18, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 5, maxWidth: 200,
  },
  markerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  markerText: { fontSize: 12, fontWeight: '800', color: '#102A28' },
  markerPointer: {
    width: 0, height: 0, backgroundColor: 'transparent',
    borderStyle: 'solid', borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    alignSelf: 'center', marginTop: -1,
  },

  // Bottom sheet
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 20,
  },
  handleRow: { alignItems: 'center', marginBottom: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CCD5D4' },
  
  passengerHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 20,
  },
  passengerAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#A0B3B2',
    alignItems: 'center', justifyContent: 'center'
  },
  passengerName: { fontSize: 20, fontWeight: '900', color: '#102A28' },
  vehicleType: { fontSize: 13, fontWeight: '600', color: '#617C79', marginTop: 2 },
  
  callBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E7F5F3',
    alignItems: 'center', justifyContent: 'center'
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: teal,
    paddingVertical: 16, borderRadius: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
  
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
