import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useDriverAuth } from '@/context/driver-auth-context';
import driverSocket from '@/lib/driverSocket';

const teal = '#008080';

// ── Types ─────────────────────────────────────────────────────────────────────
type LatLng = { latitude: number; longitude: number };
type MapMode = 'navigate' | 'trip';  // navigate = driver→pickup | trip = pickup→dropoff

// ── OSRM route fetcher ────────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function RidePreviewScreen() {
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
    /** Driver's current location (for navigate-to-pickup mode) */
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

  // Driver's current coords (passed from home.tsx). Fall back to pickup area if missing.
  const hasDriverCoords = !!(params.drLat && params.drLng);
  const driverPos: LatLng = hasDriverCoords
    ? { latitude: parseFloat(params.drLat!), longitude: parseFloat(params.drLng!) }
    : pickup;

  // ── Map mode ──────────────────────────────────────────────────────────────
  // 'navigate' = driver current position → passenger pickup (where to go NOW)
  // 'trip'     = passenger pickup → dropoff (the ride route preview)
  const [mapMode, setMapMode] = useState<MapMode>(hasDriverCoords ? 'navigate' : 'trip');

  // ── Route state (one per mode) ────────────────────────────────────────────
  type RouteState = { coords: LatLng[]; distanceKm: string; durationMin: number } | null;
  const [navigateRoute, setNavigateRoute] = useState<RouteState>(null);
  const [tripRoute, setTripRoute]         = useState<RouteState>(null);
  const [loadingRoute, setLoadingRoute]   = useState(true);
  const [accepting, setAccepting]         = useState(false);

  // ── Fetch both routes on mount ────────────────────────────────────────────
  useEffect(() => {
    const loadRoutes = async () => {
      setLoadingRoute(true);
      try {
        const [navResult, tripResult] = await Promise.allSettled([
          hasDriverCoords ? fetchOsrmRoute(driverPos, pickup) : Promise.reject('no driver coords'),
          fetchOsrmRoute(pickup, dropoff),
        ]);

        if (navResult.status === 'fulfilled')  setNavigateRoute(navResult.value);
        if (tripResult.status === 'fulfilled') setTripRoute(tripResult.value);

        // Fit map to the default mode's route
        const primaryRoute =
          navResult.status === 'fulfilled' ? navResult.value :
          tripResult.status === 'fulfilled' ? tripResult.value : null;

        if (primaryRoute) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(primaryRoute.coords, {
              edgePadding: { top: 80, right: 40, bottom: 340, left: 40 },
              animated: true,
            });
          }, 600);
        }
      } catch (err) {
        console.error('[RidePreview] Route fetch error:', err);
      } finally {
        setLoadingRoute(false);
      }
    };

    loadRoutes();
  }, []);

  // ── Switch mode + re-fit map ──────────────────────────────────────────────
  const switchMode = (mode: MapMode) => {
    setMapMode(mode);
    const targetRoute = mode === 'navigate' ? navigateRoute : tripRoute;
    if (targetRoute?.coords.length) {
      mapRef.current?.fitToCoordinates(targetRoute.coords, {
        edgePadding: { top: 80, right: 40, bottom: 340, left: 40 },
        animated: true,
      });
    }
  };

  // Active route for the map
  const activeRoute = mapMode === 'navigate' ? navigateRoute : tripRoute;
  const activeStats = activeRoute
    ? { distance: `${activeRoute.distanceKm} km`, duration: `${activeRoute.durationMin} min` }
    : { distance: '—', duration: '—' };

  // ── Accept ────────────────────────────────────────────────────────────────
  const handleAccept = () => {
    if (!driverSocket.connected || !driver?.id) return;
    setAccepting(true);
    driverSocket.emit('acceptRide', { rideId, driverId: driver.id });
    console.log('[RidePreview] acceptRide emitted:', rideId);
    router.replace('/(tabs)/home');
  };

  // ── Decline ───────────────────────────────────────────────────────────────
  const handleDecline = () => router.back();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* Full-screen Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        mapType="standard"
        initialRegion={{
          latitude: pickup.latitude || 6.9271,
          longitude: pickup.longitude || 79.8612,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}>

        {/* Driver position marker (navigate mode) */}
        {mapMode === 'navigate' && hasDriverCoords && (
          <Marker coordinate={driverPos} anchor={{ x: 0.5, y: 0.5 }} zIndex={5}>
            <View style={styles.driverMarker}>
              <Ionicons name="car-sport" size={16} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Pickup marker */}
        {pickup.latitude !== 0 && (
          <Marker coordinate={pickup} anchor={{ x: 0.5, y: 1 }} zIndex={4}>
            <View style={styles.markerPill}>
              <View style={[styles.markerDot, { backgroundColor: '#169F95' }]} />
              <Text style={styles.markerText} numberOfLines={1}>{pName || 'Pickup'}</Text>
            </View>
            <View style={styles.markerPointer} />
          </Marker>
        )}

        {/* Dropoff marker (trip mode) */}
        {mapMode === 'trip' && dropoff.latitude !== 0 && (
          <Marker coordinate={dropoff} anchor={{ x: 0.5, y: 1 }} zIndex={4}>
            <View style={styles.markerPill}>
              <View style={[styles.markerDot, { backgroundColor: '#E74C3C' }]} />
              <Text style={styles.markerText} numberOfLines={1}>{dName || 'Drop-off'}</Text>
            </View>
            <View style={styles.markerPointer} />
          </Marker>
        )}

        {/* Route polyline — outer glow */}
        {activeRoute && (
          <Polyline
            coordinates={activeRoute.coords}
            strokeColor={mapMode === 'navigate' ? '#1A6B3C' : '#017270'}
            strokeWidth={8}
            lineJoin="round" lineCap="round" zIndex={2}
          />
        )}
        {/* Route polyline — inner */}
        {activeRoute && (
          <Polyline
            coordinates={activeRoute.coords}
            strokeColor={mapMode === 'navigate' ? '#27AE60' : '#169F95'}
            strokeWidth={4}
            lineJoin="round" lineCap="round" zIndex={3}
          />
        )}
      </MapView>

      {/* ── Top bar ── */}
      <SafeAreaView style={styles.topSafe}>
        <TouchableOpacity style={styles.backBtn} onPress={handleDecline}>
          <Feather name="arrow-left" size={22} color="#102A28" />
        </TouchableOpacity>

        {/* Mode toggle pill */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mapMode === 'navigate' && styles.modeBtnActive]}
            onPress={() => switchMode('navigate')}>
            <Ionicons
              name="navigate-outline"
              size={14}
              color={mapMode === 'navigate' ? '#FFF' : '#617C79'}
            />
            <Text style={[styles.modeBtnText, mapMode === 'navigate' && styles.modeBtnTextActive]}>
              Navigate
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mapMode === 'trip' && styles.modeBtnActive]}
            onPress={() => switchMode('trip')}>
            <Ionicons
              name="map-outline"
              size={14}
              color={mapMode === 'trip' ? '#FFF' : '#617C79'}
            />
            <Text style={[styles.modeBtnText, mapMode === 'trip' && styles.modeBtnTextActive]}>
              Trip Route
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Bottom Sheet ── */}
      <View style={styles.sheet}>
        <View style={styles.handleRow}><View style={styles.handle} /></View>

        {loadingRoute ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={teal} size="large" />
            <Text style={styles.loadingText}>Plotting route...</Text>
          </View>
        ) : (
          <>
            {/* Mode context label */}
            <Text style={styles.sheetEyebrow}>
              {mapMode === 'navigate' ? '🧭 NAVIGATE TO PASSENGER' : '🚗 RIDE ROUTE PREVIEW'}
            </Text>
            <Text style={styles.sheetTitle}>{vehicleType} · {passengerName}</Text>

            {/* Stat chips */}
            <View style={styles.statsRow}>
              <StatChip icon="map-pin"       label="Distance"  value={activeStats.distance} />
              <StatChip icon="clock"         label="ETA"       value={activeStats.duration} />
              <StatChip icon="user"          label="Passenger" value={passengerName} />
              <StatChip
                icon="dollar-sign"
                label="Fare"
                value={`LKR ${price.toLocaleString()}`}
                color="#27AE60"
              />
            </View>

            {/* Route summary */}
            <View style={styles.routeBlock}>
              {mapMode === 'navigate' ? (
                <>
                  <RoutePoint color="#4A6FA5" label="YOUR LOCATION" value="Current position" />
                  <View style={styles.routeDivider} />
                  <RoutePoint color="#169F95" label="PASSENGER PICKUP" value={pName || `${pickup.latitude.toFixed(4)}, ${pickup.longitude.toFixed(4)}`} />
                </>
              ) : (
                <>
                  <RoutePoint color="#169F95" label="PICKUP"   value={pName || `${pickup.latitude.toFixed(4)}, ${pickup.longitude.toFixed(4)}`} />
                  <View style={styles.routeDivider} />
                  <RoutePoint color="#E74C3C" label="DROP-OFF" value={dName || `${dropoff.latitude.toFixed(4)}, ${dropoff.longitude.toFixed(4)}`} />
                </>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} disabled={accepting}>
                <Ionicons name="close-circle-outline" size={20} color="#617C79" />
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.acceptBtn, accepting && styles.acceptBtnDisabled]}
                onPress={handleAccept}
                disabled={accepting}>
                {accepting
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />}
                <Text style={styles.acceptBtnText}>
                  {accepting ? 'Accepting...' : 'Accept Ride'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatChip({
  icon, label, value, color = teal,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={chipStyles.tile}>
      <Feather name={icon} size={16} color={color} style={{ marginBottom: 4 }} />
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={[chipStyles.value, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function RoutePoint({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={routeStyles.row}>
      <View style={[routeStyles.dot, { backgroundColor: color }]} />
      <View style={routeStyles.textWrap}>
        <Text style={routeStyles.label}>{label}</Text>
        <Text style={routeStyles.value} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EAE6DF' },

  topSafe: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 8,
    gap: 10,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },

  // Mode toggle
  modeToggle: {
    flex: 1, flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 18, gap: 5,
  },
  modeBtnActive: { backgroundColor: teal },
  modeBtnText: { fontSize: 12, fontWeight: '800', color: '#617C79' },
  modeBtnTextActive: { color: '#FFF' },

  // Markers
  driverMarker: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#4A6FA5',
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
  markerText: { fontSize: 12, fontWeight: '800', color: '#017270' },
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
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 20,
  },
  handleRow: { alignItems: 'center', marginBottom: 14 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#A0B3B2', opacity: 0.5 },
  sheetEyebrow: { fontSize: 11, fontWeight: '900', color: teal, marginBottom: 4 },
  sheetTitle:   { fontSize: 22, fontWeight: '900', color: '#102A28', marginBottom: 14 },
  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 14 },
  routeBlock: {
    backgroundColor: '#F7FBFA', borderRadius: 16,
    borderWidth: 1, borderColor: '#D9E9E6',
    padding: 14, marginBottom: 16,
  },
  routeDivider: { height: 1, backgroundColor: '#D9E9E6', marginVertical: 10, marginLeft: 22 },
  actionRow:  { flexDirection: 'row', gap: 12 },
  declineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 16,
    borderWidth: 2, borderColor: '#D9E9E6', gap: 8,
  },
  declineBtnText: { fontSize: 15, fontWeight: '800', color: '#617C79' },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 16,
    backgroundColor: teal, gap: 8,
  },
  acceptBtnDisabled: { backgroundColor: '#4A9A98' },
  acceptBtnText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  loadingWrap: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 10, fontWeight: '700', color: teal },
});

const chipStyles = StyleSheet.create({
  tile: {
    flex: 1, backgroundColor: '#F7FBFA',
    borderRadius: 14, borderWidth: 1, borderColor: '#D9E9E6',
    padding: 10, alignItems: 'center',
  },
  label: { fontSize: 10, fontWeight: '800', color: '#8CA1A0', marginBottom: 2 },
  value: { fontSize: 12, fontWeight: '900', textAlign: 'center' },
});

const routeStyles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot:     { width: 12, height: 12, borderRadius: 6, marginTop: 3, flexShrink: 0 },
  textWrap:{ flex: 1 },
  label:   { fontSize: 10, fontWeight: '900', color: '#8CA1A0', marginBottom: 2, letterSpacing: 0.4 },
  value:   { fontSize: 14, fontWeight: '700', color: '#102A28', lineHeight: 20 },
});
