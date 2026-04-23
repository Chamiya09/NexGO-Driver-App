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
const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

// ── Types ─────────────────────────────────────────────────────────────────────
type LatLng = { latitude: number; longitude: number };

export default function RidePreviewScreen() {
  const router = useRouter();
  const { driver } = useDriverAuth();
  const params = useLocalSearchParams<{
    id: string;
    passengerName: string;
    vehicleType: string;
    price: string;
    pLat: string; pLng: string; pName: string;
    dLat: string; dLng: string; dName: string;
  }>();

  const mapRef = useRef<MapView>(null);

  // Parse URL params
  const rideId       = params.id;
  const passengerName = params.passengerName ?? 'Passenger';
  const vehicleType  = params.vehicleType ?? 'Ride';
  const price        = Number(params.price ?? 0);
  const pLat = parseFloat(params.pLat ?? '0');
  const pLng = parseFloat(params.pLng ?? '0');
  const pName = params.pName ?? '';
  const dLat = parseFloat(params.dLat ?? '0');
  const dLng = parseFloat(params.dLng ?? '0');
  const dName = params.dName ?? '';

  // Route polyline state (fetched from OSRM — no API key required)
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [routeDistance, setRouteDistance] = useState('');
  const [routeDuration, setRouteDuration] = useState('');
  const [loadingRoute, setLoadingRoute] = useState(true);

  const [accepting, setAccepting] = useState(false);

  // ── Fetch route via OSRM (free, no key) ──────────────────────────────────
  useEffect(() => {
    if (!pLat || !pLng || !dLat || !dLng) return;

    const fetchRoute = async () => {
      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`;

        const res = await fetch(url);
        const data = await res.json();

        if (data?.routes?.length) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng })
          );
          setRouteCoords(coords);
          setRouteDistance(`${(route.distance / 1000).toFixed(1)} km`);
          setRouteDuration(`${Math.round(route.duration / 60)} min`);

          // Fit map to cover both markers + the route
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(coords, {
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

    fetchRoute();
  }, [pLat, pLng, dLat, dLng]);

  // ── Accept Ride ───────────────────────────────────────────────────────────
  const handleAccept = () => {
    if (!driverSocket.connected) return;
    if (!driver?.id) return;

    setAccepting(true);

    driverSocket.emit('acceptRide', {
      rideId,
      driverId: driver.id,
    });

    console.log('[RidePreview] acceptRide emitted for rideId:', rideId);

    // Navigate to an Active Tracker screen (replace so back button skips preview)
    // Adjust the pathname to whatever your active tracker route is.
    router.replace('/(tabs)/home');
  };

  // ── Decline ───────────────────────────────────────────────────────────────
  const handleDecline = () => {
    router.back();
  };

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
          latitude: pLat || 6.9271,
          longitude: pLng || 79.8612,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}>

        {/* Pickup Marker */}
        {pLat !== 0 && (
          <Marker coordinate={{ latitude: pLat, longitude: pLng }} anchor={{ x: 0.5, y: 1 }} zIndex={4}>
            <View style={styles.markerPill}>
              <View style={[styles.markerDot, { backgroundColor: '#169F95' }]} />
              <Text style={styles.markerText} numberOfLines={1}>
                {pName || 'Pickup'}
              </Text>
            </View>
            <View style={[styles.markerPointer, { borderTopColor: '#FFFFFF' }]} />
          </Marker>
        )}

        {/* Dropoff Marker */}
        {dLat !== 0 && (
          <Marker coordinate={{ latitude: dLat, longitude: dLng }} anchor={{ x: 0.5, y: 1 }} zIndex={4}>
            <View style={styles.markerPill}>
              <View style={[styles.markerDot, { backgroundColor: '#E74C3C' }]} />
              <Text style={styles.markerText} numberOfLines={1}>
                {dName || 'Drop-off'}
              </Text>
            </View>
            <View style={[styles.markerPointer, { borderTopColor: '#FFFFFF' }]} />
          </Marker>
        )}

        {/* Route Polyline — outer border */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#017270"
            strokeWidth={8}
            lineJoin="round"
            lineCap="round"
            zIndex={2}
          />
        )}
        {/* Route Polyline — inner teal */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#169F95"
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
            zIndex={3}
          />
        )}
      </MapView>

      {/* Back button */}
      <SafeAreaView style={styles.topSafe}>
        <TouchableOpacity style={styles.backBtn} onPress={handleDecline}>
          <Feather name="arrow-left" size={22} color="#102A28" />
        </TouchableOpacity>
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>Ride Preview</Text>
        </View>
      </SafeAreaView>

      {/* ── Bottom Sheet ─────────────────────────────────────────────────── */}
      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {loadingRoute ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={teal} size="large" />
            <Text style={styles.loadingText}>Plotting route...</Text>
          </View>
        ) : (
          <>
            {/* Eyebrow + vehicle */}
            <Text style={styles.sheetEyebrow}>RIDE REQUEST</Text>
            <Text style={styles.sheetTitle}>{vehicleType} Ride</Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatChip icon="map-pin" label="Distance" value={routeDistance || '—'} />
              <StatChip icon="clock"   label="Duration" value={routeDuration || '—'} />
              <StatChip icon="user"    label="Passenger" value={passengerName} />
              <StatChip icon="dollar-sign" label="Fare" value={`LKR ${price.toLocaleString()}`} color="#27AE60" />
            </View>

            {/* Route block */}
            <View style={styles.routeBlock}>
              <RoutePoint
                color="#169F95"
                label="PICKUP"
                value={pName || `${pLat.toFixed(4)}, ${pLng.toFixed(4)}`}
              />
              <View style={styles.routeDivider} />
              <RoutePoint
                color="#E74C3C"
                label="DROP-OFF"
                value={dName || `${dLat.toFixed(4)}, ${dLng.toFixed(4)}`}
              />
            </View>

            {/* Action buttons */}
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
function StatChip({ icon, label, value, color = teal }: {
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

  // Top safe row
  topSafe: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 8,
    gap: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  topBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  topBadgeText: { fontSize: 14, fontWeight: '800', color: '#102A28' },

  // Markers
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
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 20,
  },
  handleRow: { alignItems: 'center', marginBottom: 14 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#A0B3B2', opacity: 0.5,
  },
  sheetEyebrow: { fontSize: 11, fontWeight: '900', color: teal, marginBottom: 2 },
  sheetTitle:   { fontSize: 24, fontWeight: '900', color: '#102A28', marginBottom: 16 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

  routeBlock: {
    backgroundColor: '#F7FBFA', borderRadius: 16,
    borderWidth: 1, borderColor: '#D9E9E6',
    padding: 14, marginBottom: 18,
  },
  routeDivider: {
    height: 1, backgroundColor: '#D9E9E6',
    marginVertical: 10, marginLeft: 22,
  },

  actionRow: { flexDirection: 'row', gap: 12 },
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
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3, flexShrink: 0 },
  textWrap: { flex: 1 },
  label: { fontSize: 10, fontWeight: '900', color: '#8CA1A0', marginBottom: 2, letterSpacing: 0.4 },
  value: { fontSize: 14, fontWeight: '700', color: '#102A28', lineHeight: 20 },
});
