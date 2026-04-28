import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
  Animated,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, UrlTile, AnimatedRegion } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import driverSocket from '@/lib/driverSocket';
import { useDriverAuth } from '@/context/driver-auth-context';
import { MAP_TILE_URL_TEMPLATE } from '@/lib/mapTiles';
import {
  DriverRideStage,
  LatLng,
  formatDistance,
  formatDuration,
  safeBearing,
  sliceRemainingPolyline,
} from '@/src/utils/navigation';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TEAL = '#008080';
const DEEP_BLUE = '#114B7A';
const NAVIGATION_ANIMATION_MS = 950;
const NAVIGATION_ZOOM = 18;
const NAVIGATION_PITCH = 58;

function normalizeHeadingDelta(delta: number) {
  if (delta > 180) return delta - 360;
  if (delta < -180) return delta + 360;
  return delta;
}

function smoothHeading(previous: number, next: number, factor = 0.35) {
  return previous + normalizeHeadingDelta(next - previous) * factor;
}

type RideActionStatus = 'ACCEPTED' | 'ARRIVED' | 'IN_TRANSIT';

type RoutePath = {
  coordinates: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
};

type RideParams = {
  id?: string;
  status?: string;
  passengerName?: string;
  passengerRating?: string;
  vehicleType?: string;
  price?: string;
  pLat?: string;
  pLng?: string;
  pName?: string;
  dLat?: string;
  dLng?: string;
  dName?: string;
  drLat?: string;
  drLng?: string;
};

function normalizeStatus(raw: string | undefined): RideActionStatus {
  const value = (raw ?? '').toUpperCase();
  if (value === 'ARRIVED') return 'ARRIVED';
  if (value === 'IN_TRANSIT' || value === 'INPROGRESS') return 'IN_TRANSIT';
  return 'ACCEPTED';
}

async function fetchFastRoutePath(origin: LatLng, destination: LatLng): Promise<RoutePath> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
    '?overview=full&geometries=geojson';

  const response = await fetch(url);
  const data = await response.json();
  const route = data?.routes?.[0];

  if (!route) throw new Error('No fallback route available');

  const coordinates = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
    latitude: lat,
    longitude: lng,
  }));

  return {
    coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

function createDirectRoute(origin: LatLng, destination: LatLng): LatLng[] {
  if (!origin.latitude || !origin.longitude || !destination.latitude || !destination.longitude) {
    return [];
  }

  return [origin, destination];
}

export default function DriverActiveRideScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const lastPositionRef = useRef<LatLng | null>(null);
  const cameraHeadingRef = useRef(0);
  const isRotationEnabledRef = useRef(true);
  const didRefreshNavigationFromGpsRef = useRef(false);
  const params = useLocalSearchParams<RideParams>();
  const { driver } = useDriverAuth();

  const rideId = params.id ?? '';
  const passengerName = params.passengerName ?? 'Passenger';
  const passengerRating = params.passengerRating ?? '4.9';
  const pickupName = params.pName ?? 'Pickup point';
  const dropoffName = params.dName ?? 'Destination';

  const pickup = useMemo<LatLng>(
    () => ({ latitude: Number(params.pLat ?? 0), longitude: Number(params.pLng ?? 0) }),
    [params.pLat, params.pLng]
  );

  const dropoff = useMemo<LatLng>(
    () => ({ latitude: Number(params.dLat ?? 0), longitude: Number(params.dLng ?? 0) }),
    [params.dLat, params.dLng]
  );

  const initialDriverPosition = useMemo<LatLng>(
    () => ({
      latitude: Number(params.drLat ?? params.pLat ?? 0),
      longitude: Number(params.drLng ?? params.pLng ?? 0),
    }),
    [params.drLat, params.drLng, params.pLat, params.pLng]
  );
  const driverPositionRef = useRef<LatLng>(initialDriverPosition);

  const [driverPosition, setDriverPosition] = useState<LatLng>(initialDriverPosition);

  const animatedDrCoords = useRef(new AnimatedRegion({
    latitude: initialDriverPosition.latitude,
    longitude: initialDriverPosition.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  })).current;

  const headingAnim = useRef(new Animated.Value(0)).current;

  const [actionStatus, setActionStatus] = useState<RideActionStatus>(normalizeStatus(params.status));
  const [navigationRoute, setNavigationRoute] = useState<LatLng[]>(() => createDirectRoute(initialDriverPosition, pickup));
  const [tripRoute, setTripRoute] = useState<LatLng[]>(() => createDirectRoute(pickup, dropoff));
  const [remainingRoute, setRemainingRoute] = useState<LatLng[]>([]);
  const [distanceLabel, setDistanceLabel] = useState('—');
  const [durationLabel, setDurationLabel] = useState('—');
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [isRotationEnabled, setIsRotationEnabled] = useState(true);

  const stage: DriverRideStage = actionStatus === 'ACCEPTED' ? 'TO_PICKUP' : 'IN_TRANSIT';

  useEffect(() => {
    const nextRemainingRoute =
      stage === 'TO_PICKUP' ? sliceRemainingPolyline(navigationRoute, driverPosition) : sliceRemainingPolyline(tripRoute, driverPosition);
    setRemainingRoute(nextRemainingRoute);
  }, [driverPosition, navigationRoute, stage, tripRoute]);

  useEffect(() => {
    isRotationEnabledRef.current = isRotationEnabled;
  }, [isRotationEnabled]);

  useEffect(() => {
    let active = true;

    const hydrateFastRoutes = async () => {
      setIsLoadingRoute(true);

      const routeOrigin = driverPositionRef.current;
      const directNavigationRoute = createDirectRoute(routeOrigin, pickup);
      const directTripRoute = createDirectRoute(pickup, dropoff);
      setNavigationRoute(directNavigationRoute);
      setTripRoute(directTripRoute);
      setRemainingRoute(stage === 'TO_PICKUP' ? sliceRemainingPolyline(directNavigationRoute, routeOrigin) : directTripRoute);
      setIsLoadingRoute(false);

      try {
        const [navigationResult, tripResult] = await Promise.allSettled([
          fetchFastRoutePath(routeOrigin, pickup),
          fetchFastRoutePath(pickup, dropoff),
        ]);

        if (!active) return;

        let nextNavigationRoute = directNavigationRoute;
        let nextTripRoute = directTripRoute;
        let activeRouteResult: RoutePath | null = null;

        if (navigationResult.status === 'fulfilled') {
          nextNavigationRoute = navigationResult.value.coordinates;
          setNavigationRoute(nextNavigationRoute);
          if (stage === 'TO_PICKUP') activeRouteResult = navigationResult.value;
        }

        if (tripResult.status === 'fulfilled') {
          nextTripRoute = tripResult.value.coordinates;
          setTripRoute(nextTripRoute);
          if (stage === 'IN_TRANSIT') activeRouteResult = tripResult.value;
        }

        setRemainingRoute(
          stage === 'TO_PICKUP'
            ? sliceRemainingPolyline(nextNavigationRoute, routeOrigin)
            : sliceRemainingPolyline(nextTripRoute, routeOrigin)
        );

        if (activeRouteResult) {
          setDistanceLabel(formatDistance(activeRouteResult.distanceMeters));
          setDurationLabel(formatDuration(activeRouteResult.durationSeconds));
        }
      } catch (error) {
        console.error('[ActiveRide] fast route failed:', error);
      } finally {
        if (active) setIsLoadingRoute(false);
      }
    };

    hydrateFastRoutes();

    return () => {
      active = false;
    };
  }, [dropoff, pickup, stage]);

  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;
    let trackingActive = true;

    const beginTracking = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;

      locationSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1600,
          distanceInterval: 3,
        },
        (location) => {
          const next = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          driverPositionRef.current = next;

          if (!didRefreshNavigationFromGpsRef.current && stage === 'TO_PICKUP') {
            didRefreshNavigationFromGpsRef.current = true;
            const directNavigationRoute = createDirectRoute(next, pickup);
            setNavigationRoute(directNavigationRoute);
            setRemainingRoute(sliceRemainingPolyline(directNavigationRoute, next));

            fetchFastRoutePath(next, pickup)
              .then((route) => {
                if (!trackingActive) return;
                setNavigationRoute(route.coordinates);
                setRemainingRoute(sliceRemainingPolyline(route.coordinates, next));
                setDistanceLabel(formatDistance(route.distanceMeters));
                setDurationLabel(formatDuration(route.durationSeconds));
              })
              .catch((error) => {
                console.error('[ActiveRide] live navigation route failed:', error);
              });
          }

          const reportedHeading =
            typeof location.coords.heading === 'number' && location.coords.heading >= 0
              ? location.coords.heading
              : null;
          const targetHeading = reportedHeading ?? safeBearing(lastPositionRef.current, next, cameraHeadingRef.current);
          const heading = smoothHeading(cameraHeadingRef.current, targetHeading);
          lastPositionRef.current = next;
          cameraHeadingRef.current = heading;

          setDriverPosition(next);

          animatedDrCoords.timing({
            latitude: next.latitude,
            longitude: next.longitude,
            useNativeDriver: false,
            duration: NAVIGATION_ANIMATION_MS
          } as Parameters<typeof animatedDrCoords.timing>[0]).start();

          let currentH = (headingAnim as any)._value || 0;
          let diff = heading - currentH;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;

          Animated.timing(headingAnim, {
            toValue: currentH + diff,
            duration: NAVIGATION_ANIMATION_MS,
            useNativeDriver: true,
          }).start();

          const rotateCamera = isRotationEnabledRef.current;
          mapRef.current?.animateCamera(
            {
              center: next,
              heading: rotateCamera ? heading : 0,
              pitch: rotateCamera ? NAVIGATION_PITCH : 0,
              zoom: NAVIGATION_ZOOM,
              altitude: 380,
            },
            { duration: NAVIGATION_ANIMATION_MS }
          );

          if (driver?.id && rideId) {
            driverSocket.emit('updateDriverLocation', {
              driverId: driver.id,
              latitude: next.latitude,
              longitude: next.longitude,
              heading,
              isOnline: true,
            });
          }
        }
      );
    };

    beginTracking();

    const handleStatusUpdate = (payload: { rideId: string; canonicalStatus?: string; status?: string }) => {
      if (payload.rideId !== rideId) return;

      const canonical = (payload.canonicalStatus ?? payload.status ?? '').toUpperCase();
      if (canonical === 'ARRIVED') setActionStatus('ARRIVED');
      if (canonical === 'IN_TRANSIT' || canonical === 'INPROGRESS') setActionStatus('IN_TRANSIT');
      if (canonical === 'COMPLETED') {
        Alert.alert('Trip completed', 'Ride completed successfully.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/home') },
        ]);
      }
      if (canonical === 'CANCELLED') {
        Alert.alert('Ride cancelled', 'The passenger cancelled this ride.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/home') },
        ]);
      }
    };

    const handleRideError = (payload: { message?: string }) => {
      if (payload?.message) Alert.alert('Ride update failed', payload.message);
      setIsActionBusy(false);
    };

    driverSocket.on('rideStatusUpdate', handleStatusUpdate);
    driverSocket.on('rideCancelled', handleStatusUpdate);
    driverSocket.on('rideError', handleRideError);

    return () => {
      trackingActive = false;
      locationSub?.remove();
      driverSocket.off('rideStatusUpdate', handleStatusUpdate);
      driverSocket.off('rideCancelled', handleStatusUpdate);
      driverSocket.off('rideError', handleRideError);
    };
  }, [animatedDrCoords, driver?.id, headingAnim, pickup, rideId, router, stage]);

  const transitionRide = (eventName: 'driver_arrived' | 'start_trip' | 'complete_trip', optimistic: RideActionStatus) => {
    if (!driver?.id || !rideId || isActionBusy) return;

    setIsActionBusy(true);
    driverSocket.emit(eventName, { rideId, driverId: driver.id });

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActionStatus(optimistic);
    setTimeout(() => setIsActionBusy(false), 400);
  };

  const handleToggleRotation = () => {
    const nextRotationEnabled = !isRotationEnabled;
    setIsRotationEnabled(nextRotationEnabled);

    mapRef.current?.animateCamera(
      {
        center: driverPosition,
        heading: nextRotationEnabled ? cameraHeadingRef.current : 0,
        pitch: nextRotationEnabled ? NAVIGATION_PITCH : 0,
        zoom: NAVIGATION_ZOOM,
        altitude: 380,
      },
      { duration: 450 }
    );
  };

  let actionButton: {
    label: string;
    color: string;
    icon: string;
    onPress: () => void;
  };

  if (actionStatus === 'ACCEPTED') {
    actionButton = {
      label: 'I HAVE ARRIVED',
      color: TEAL,
      icon: 'navigate',
      onPress: () => transitionRide('driver_arrived', 'ARRIVED'),
    };
  } else if (actionStatus === 'ARRIVED') {
    actionButton = {
      label: 'START TRIP',
      color: TEAL,
      icon: 'play',
      onPress: () => transitionRide('start_trip', 'IN_TRANSIT'),
    };
  } else {
    actionButton = {
      label: 'COMPLETE TRIP',
      color: DEEP_BLUE,
      icon: 'flag',
      onPress: () => transitionRide('complete_trip', 'IN_TRANSIT'),
    };
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapType="none"
        initialRegion={{
          latitude: initialDriverPosition.latitude || 6.9271,
          longitude: initialDriverPosition.longitude || 79.8612,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}>
        <UrlTile
          urlTemplate={MAP_TILE_URL_TEMPLATE}
          maximumZ={19}
          flipY={false}
        />

        {stage === 'TO_PICKUP' && tripRoute.length > 1 && (
          <Polyline coordinates={tripRoute} strokeWidth={5} strokeColor="rgba(17, 75, 122, 0.38)" lineCap="round" />
        )}

        {remainingRoute.length > 1 && (
          <>
            <Polyline coordinates={remainingRoute} strokeWidth={11} strokeColor="#074343" lineCap="round" />
            <Polyline coordinates={remainingRoute} strokeWidth={6} strokeColor={stage === 'TO_PICKUP' ? TEAL : DEEP_BLUE} lineCap="round" />
          </>
        )}

        <Marker.Animated coordinate={animatedDrCoords as any} anchor={{ x: 0.5, y: 0.5 }} flat>
          <Animated.View style={[styles.markerBubble, {
            transform: [{
              rotate: headingAnim.interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg']
              })
            }]
          }]}>
            <Image source={require('@/assets/images/icon.png')} style={styles.driverAsset} />
          </Animated.View>
        </Marker.Animated>

        {stage === 'TO_PICKUP' && (
          <Marker coordinate={pickup} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.landmarkCard}>
              <Image source={require('@/assets/images/android-icon-foreground.png')} style={styles.landmarkAsset} />
              <Text style={styles.landmarkLabel} numberOfLines={1}>{pickupName}</Text>
            </View>
          </Marker>
        )}

        {stage === 'IN_TRANSIT' && (
          <Marker coordinate={dropoff} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.landmarkCardBlue}>
              <Image source={require('@/assets/images/splash-icon.png')} style={styles.landmarkAsset} />
              <Text style={styles.landmarkLabelBlue} numberOfLines={1}>{dropoffName}</Text>
            </View>
          </Marker>
        )}
      </MapView>

      <SafeAreaView pointerEvents="box-none" style={styles.overlayRoot}>
        <View style={styles.hudCard}>
          <Text style={styles.hudLabel}>Time Remaining</Text>
          <Text style={styles.hudPrimary}>{durationLabel}</Text>
          <Text style={styles.hudSecondary}>{distanceLabel}</Text>
        </View>
      </SafeAreaView>

      <Pressable
        style={[styles.rotationButton, isRotationEnabled ? styles.rotationButtonActive : styles.rotationButtonInactive]}
        onPress={handleToggleRotation}
        accessibilityRole="button"
        accessibilityLabel={isRotationEnabled ? 'Disable map rotation' : 'Enable map rotation'}>
        <Ionicons name={isRotationEnabled ? 'navigate-circle' : 'navigate-circle-outline'} size={23} color={isRotationEnabled ? '#FFFFFF' : TEAL} />
        <Text style={[styles.rotationButtonText, isRotationEnabled ? styles.rotationButtonTextActive : styles.rotationButtonTextInactive]}>
          {isRotationEnabled ? 'Rotate' : 'North'}
        </Text>
      </Pressable>

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        {isLoadingRoute ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={styles.loadingText}>Building smart route…</Text>
          </View>
        ) : (
          <>
            {stage === 'TO_PICKUP' ? (
              <>
                <Text style={styles.sheetTitle}>{passengerName}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#D79A00" />
                  <Text style={styles.ratingText}>{passengerRating} Passenger Rating</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sheetSubtitle}>Destination</Text>
                <Text style={styles.sheetTitle}>{dropoffName}</Text>
              </>
            )}

            <Pressable
              onPress={actionButton.onPress}
              style={[styles.primaryAction, { backgroundColor: actionButton.color }]}
              disabled={isActionBusy}>
              {isActionBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name={actionButton.icon as never} size={24} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>{actionButton.label}</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#DFEEEC' },
  overlayRoot: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, paddingHorizontal: 18 },
  hudCard: {
    marginTop: Platform.OS === 'ios' ? 8 : 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(3, 39, 38, 0.74)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 220,
    alignItems: 'center',
  },
  hudLabel: { color: '#A8D3D0', fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  hudPrimary: { color: '#FFFFFF', fontSize: 35, fontWeight: '900', lineHeight: 40 },
  hudSecondary: { color: '#D9F0EE', fontSize: 17, fontWeight: '700' },
  rotationButton: {
    position: 'absolute',
    right: 18,
    bottom: 170,
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    shadowColor: '#001F1E',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
    zIndex: 35,
  },
  rotationButtonActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  rotationButtonInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9E9E6',
  },
  rotationButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },
  rotationButtonTextActive: {
    color: '#FFFFFF',
  },
  rotationButtonTextInactive: {
    color: TEAL,
  },

  markerBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAsset: { width: 26, height: 26, borderRadius: 6 },
  landmarkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 190,
  },
  landmarkCardBlue: {
    backgroundColor: '#EEF4FF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 190,
    borderWidth: 1,
    borderColor: '#C9DAFF',
  },
  landmarkAsset: { width: 18, height: 18, marginRight: 8, borderRadius: 4 },
  landmarkLabel: { color: '#124240', fontWeight: '800', flexShrink: 1 },
  landmarkLabelBlue: { color: '#133867', fontWeight: '800', flexShrink: 1 },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    shadowColor: '#001F1E',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#D3E6E4',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetSubtitle: { color: '#5D7F7D', fontSize: 13, fontWeight: '700' },
  sheetTitle: { color: '#0D302F', fontSize: 27, fontWeight: '900', marginTop: 6 },
  ratingRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { color: '#406866', fontWeight: '700' },
  primaryAction: {
    marginTop: 18,
    borderRadius: 24,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#003C3A',
    shadowOpacity: 0.34,
    shadowOffset: { width: 0, height: 9 },
    shadowRadius: 14,
    elevation: 12,
  },
  primaryActionText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.6 },
  loadingRow: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '700', color: '#5C7A78' },
});
