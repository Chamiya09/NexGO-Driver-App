import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
import { clearDriverActiveRide, saveDriverActiveRide } from '@/lib/activeRideStorage';
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
const NAVIGATION_ANIMATION_MS = 420;
const HEADING_ANIMATION_MS = 220;
const NAVIGATION_ZOOM = 18;
const NAVIGATION_PITCH = 58;
const ROUTE_REFRESH_DISTANCE_METERS = 35;

function normalizeHeadingDelta(delta: number) {
  if (delta > 180) return delta - 360;
  if (delta < -180) return delta + 360;
  return delta;
}

function smoothHeading(previous: number, next: number, factor = 0.38) {
  return previous + normalizeHeadingDelta(next - previous) * factor;
}

function actionStatusToParam(status: RideActionStatus): string {
  if (status === 'ARRIVED') return 'ARRIVED';
  if (status === 'IN_TRANSIT') return 'IN_TRANSIT';
  return 'ACCEPTED';
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

function samePoint(a: LatLng, b: LatLng) {
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

function distanceMeters(a: LatLng, b: LatLng) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthMeters = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthMeters * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
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
  const [remainingRoute, setRemainingRoute] = useState<LatLng[]>(() => createDirectRoute(initialDriverPosition, pickup));
  const [distanceLabel, setDistanceLabel] = useState('—');
  const [durationLabel, setDurationLabel] = useState('—');
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [isRotationEnabled, setIsRotationEnabled] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [arrivalCodeVisible, setArrivalCodeVisible] = useState(false);
  const [arrivalCode, setArrivalCode] = useState('');
  const [requestedArrivalCode, setRequestedArrivalCode] = useState('');
  const [arrivalCodeError, setArrivalCodeError] = useState('');
  const [tripCompletedVisible, setTripCompletedVisible] = useState(false);
  const navigationRouteOriginRef = useRef<LatLng>(initialDriverPosition);
  const hasNavigationOsrmRouteRef = useRef(false);
  const navigationRouteRequestIdRef = useRef(0);
  const tripRouteOriginRef = useRef<LatLng>(pickup);
  const hasTripOsrmRouteRef = useRef(false);
  const tripRouteRequestIdRef = useRef(0);

  const stage: DriverRideStage = actionStatus === 'ACCEPTED' ? 'TO_PICKUP' : 'IN_TRANSIT';
  const highlightedRoute = remainingRoute.length > 1
    ? remainingRoute
    : stage === 'TO_PICKUP'
      ? navigationRoute
      : tripRoute;

  useEffect(() => {
    if (!rideId) return;

    const storedParams = {
      id: rideId,
      status: actionStatusToParam(actionStatus),
      passengerName,
      passengerRating,
      vehicleType: params.vehicleType ?? '',
      price: params.price ?? '',
      pLat: String(pickup.latitude),
      pLng: String(pickup.longitude),
      pName: pickupName,
      dLat: String(dropoff.latitude),
      dLng: String(dropoff.longitude),
      dName: dropoffName,
      ...(Number.isFinite(initialDriverPosition.latitude) && Number.isFinite(initialDriverPosition.longitude)
        ? {
            drLat: String(initialDriverPosition.latitude),
            drLng: String(initialDriverPosition.longitude),
          }
        : {}),
    };

    saveDriverActiveRide(storedParams);
  }, [
    actionStatus,
    dropoff.latitude,
    dropoff.longitude,
    dropoffName,
    initialDriverPosition.latitude,
    initialDriverPosition.longitude,
    params.price,
    params.vehicleType,
    passengerName,
    passengerRating,
    pickup.latitude,
    pickup.longitude,
    pickupName,
    rideId,
  ]);

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
      const routeOrigin = driverPositionRef.current;
      const directNavigationRoute = createDirectRoute(routeOrigin, pickup);
      const tripOrigin = stage === 'TO_PICKUP' ? pickup : routeOrigin;
      const directTripRoute = createDirectRoute(tripOrigin, dropoff);
      if (!hasNavigationOsrmRouteRef.current) {
        setNavigationRoute(directNavigationRoute);
        setRemainingRoute(stage === 'TO_PICKUP' ? sliceRemainingPolyline(directNavigationRoute, routeOrigin) : directTripRoute);
      }
      setTripRoute(directTripRoute);
      setIsLoadingRoute(false);

      const navigationRequestId = ++navigationRouteRequestIdRef.current;
      fetchFastRoutePath(routeOrigin, pickup)
        .then((route) => {
          if (!active || navigationRequestId !== navigationRouteRequestIdRef.current) return;
          hasNavigationOsrmRouteRef.current = true;
          navigationRouteOriginRef.current = routeOrigin;
          setNavigationRoute(route.coordinates);
          if (stage === 'TO_PICKUP') {
            setRemainingRoute(sliceRemainingPolyline(route.coordinates, routeOrigin));
            setDistanceLabel(formatDistance(route.distanceMeters));
            setDurationLabel(formatDuration(route.durationSeconds));
          }
        })
        .catch((error) => {
          console.error('[ActiveRide] OSRM navigation route failed:', error);
        });

      const tripRequestId = ++tripRouteRequestIdRef.current;
      fetchFastRoutePath(tripOrigin, dropoff)
        .then((route) => {
          if (!active || tripRequestId !== tripRouteRequestIdRef.current) return;
          hasTripOsrmRouteRef.current = true;
          tripRouteOriginRef.current = tripOrigin;
          setTripRoute(route.coordinates);
          if (stage === 'IN_TRANSIT') {
            setRemainingRoute(sliceRemainingPolyline(route.coordinates, tripOrigin));
            setDistanceLabel(formatDistance(route.distanceMeters));
            setDurationLabel(formatDuration(route.durationSeconds));
          }
        })
        .catch((error) => {
          console.error('[ActiveRide] OSRM trip route failed:', error);
        });
    };

    hydrateFastRoutes();

    return () => {
      active = false;
    };
  }, [dropoff, pickup, stage]);

  useEffect(() => {
    if (!mapReady) return;

    const center = driverPositionRef.current;
    mapRef.current?.animateCamera(
      {
        center,
        heading: isRotationEnabledRef.current ? cameraHeadingRef.current : 0,
        pitch: isRotationEnabledRef.current ? NAVIGATION_PITCH : 0,
        zoom: NAVIGATION_ZOOM,
        altitude: 380,
      },
      { duration: 220 }
    );
  }, [mapReady]);

  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;
    let headingSub: Location.LocationSubscription | null = null;
    let trackingActive = true;

    const applyHeading = (targetHeading: number, center = driverPositionRef.current, duration = HEADING_ANIMATION_MS) => {
      const heading = smoothHeading(cameraHeadingRef.current, targetHeading);
      cameraHeadingRef.current = heading;

      const currentH = (headingAnim as any)._value || 0;
      let diff = heading - currentH;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      Animated.timing(headingAnim, {
        toValue: currentH + diff,
        duration,
        useNativeDriver: true,
      }).start();

      const rotateCamera = isRotationEnabledRef.current;
      mapRef.current?.animateCamera(
        {
          center,
          heading: rotateCamera ? heading : 0,
          pitch: rotateCamera ? NAVIGATION_PITCH : 0,
          zoom: NAVIGATION_ZOOM,
          altitude: 380,
        },
        { duration }
      );

      return heading;
    };

    const applyDriverLocation = (location: Location.LocationObject) => {
      const next = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      driverPositionRef.current = next;

      if (stage === 'TO_PICKUP') {
        const currentNavigationOrigin = navigationRouteOriginRef.current;
        const shouldRefreshRoute =
          !didRefreshNavigationFromGpsRef.current ||
          samePoint(currentNavigationOrigin, pickup) ||
          distanceMeters(currentNavigationOrigin, next) > ROUTE_REFRESH_DISTANCE_METERS;

        const directNavigationRoute = createDirectRoute(next, pickup);
        if (!hasNavigationOsrmRouteRef.current && directNavigationRoute.length > 1) {
          navigationRouteOriginRef.current = next;
          setNavigationRoute(directNavigationRoute);
          setRemainingRoute(directNavigationRoute);
        }

        if (shouldRefreshRoute) {
          didRefreshNavigationFromGpsRef.current = true;
          navigationRouteOriginRef.current = next;
          const navigationRequestId = ++navigationRouteRequestIdRef.current;

          fetchFastRoutePath(next, pickup)
            .then((route) => {
              if (!trackingActive || navigationRequestId !== navigationRouteRequestIdRef.current) return;
              hasNavigationOsrmRouteRef.current = true;
              navigationRouteOriginRef.current = next;
              setNavigationRoute(route.coordinates);
              setRemainingRoute(sliceRemainingPolyline(route.coordinates, next));
              setDistanceLabel(formatDistance(route.distanceMeters));
              setDurationLabel(formatDuration(route.durationSeconds));
            })
            .catch((error) => {
              console.error('[ActiveRide] live OSRM navigation route failed:', error);
            });
        }
      }

      if (stage === 'IN_TRANSIT') {
        const currentTripOrigin = tripRouteOriginRef.current;
        const shouldRefreshTripRoute =
          !hasTripOsrmRouteRef.current ||
          samePoint(currentTripOrigin, pickup) ||
          distanceMeters(currentTripOrigin, next) > ROUTE_REFRESH_DISTANCE_METERS;

        const directTripRoute = createDirectRoute(next, dropoff);
        if (!hasTripOsrmRouteRef.current && directTripRoute.length > 1) {
          tripRouteOriginRef.current = next;
          setTripRoute(directTripRoute);
          setRemainingRoute(directTripRoute);
        }

        if (shouldRefreshTripRoute) {
          tripRouteOriginRef.current = next;
          const tripRequestId = ++tripRouteRequestIdRef.current;

          fetchFastRoutePath(next, dropoff)
            .then((route) => {
              if (!trackingActive || tripRequestId !== tripRouteRequestIdRef.current) return;
              hasTripOsrmRouteRef.current = true;
              tripRouteOriginRef.current = next;
              setTripRoute(route.coordinates);
              setRemainingRoute(sliceRemainingPolyline(route.coordinates, next));
              setDistanceLabel(formatDistance(route.distanceMeters));
              setDurationLabel(formatDuration(route.durationSeconds));
            })
            .catch((error) => {
              console.error('[ActiveRide] live OSRM trip route failed:', error);
            });
        }
      }

      const reportedHeading =
        typeof location.coords.heading === 'number' && location.coords.heading >= 0
          ? location.coords.heading
          : null;
      const targetHeading = reportedHeading ?? safeBearing(lastPositionRef.current, next, cameraHeadingRef.current);
      lastPositionRef.current = next;
      const heading = applyHeading(targetHeading, next, NAVIGATION_ANIMATION_MS);

      setDriverPosition(next);

      animatedDrCoords.timing({
        latitude: next.latitude,
        longitude: next.longitude,
        useNativeDriver: false,
        duration: NAVIGATION_ANIMATION_MS
      } as Parameters<typeof animatedDrCoords.timing>[0]).start();

      if (driver?.id && rideId) {
        driverSocket.emit('updateDriverLocation', {
          driverId: driver.id,
          latitude: next.latitude,
          longitude: next.longitude,
          heading,
          vehicleCategory: driver.vehicle?.category,
          isOnline: true,
        });
      }
    };

    const beginTracking = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;

      headingSub = await Location.watchHeadingAsync((heading) => {
        const targetHeading =
          typeof heading.trueHeading === 'number' && heading.trueHeading >= 0
            ? heading.trueHeading
            : heading.magHeading;

        if (trackingActive && Number.isFinite(targetHeading)) {
          applyHeading(targetHeading, driverPositionRef.current, HEADING_ANIMATION_MS);
        }
      });

      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
      if (trackingActive && lastKnown) applyDriverLocation(lastKnown);

      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
        .then((location) => {
          if (trackingActive) applyDriverLocation(location);
        })
        .catch((error) => {
          console.log('[ActiveRide] current location warmup failed:', error);
        });

      locationSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 650,
          distanceInterval: 1,
        },
        applyDriverLocation
      );
    };

    beginTracking();

    const handleStatusUpdate = (payload: { rideId: string; canonicalStatus?: string; status?: string }) => {
      if (payload.rideId !== rideId) return;

      const canonical = (payload.canonicalStatus ?? payload.status ?? '').toUpperCase();
      if (canonical === 'ARRIVED') {
        setActionStatus('ARRIVED');
        setIsActionBusy(false);
        setArrivalCodeVisible(false);
        setArrivalCode('');
        setRequestedArrivalCode('');
        setArrivalCodeError('');
      }
      if (canonical === 'IN_TRANSIT' || canonical === 'INPROGRESS') setActionStatus('IN_TRANSIT');
      if (canonical === 'COMPLETED') {
        clearDriverActiveRide();
        setTripCompletedVisible(true);
      }
      if (canonical === 'CANCELLED') {
        clearDriverActiveRide();
        Alert.alert('Ride cancelled', 'The passenger cancelled this ride.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/home') },
        ]);
      }
    };

    const handleRideError = (payload: { message?: string }) => {
      if ((payload as { code?: string })?.code === 'INVALID_ARRIVAL_CODE') {
        setArrivalCodeError(payload?.message || 'Incorrect passenger code.');
      } else if (payload?.message) {
        Alert.alert('Ride update failed', payload.message);
      }
      setIsActionBusy(false);
    };

    const handleArrivalCodeRequested = (payload?: { rideId?: string; code?: string }) => {
      if (payload?.rideId && payload.rideId !== rideId) return;

      setIsActionBusy(false);
      setArrivalCode('');
      setRequestedArrivalCode(payload?.code ?? '');
      setArrivalCodeError('');
      setArrivalCodeVisible(true);
    };

    driverSocket.on('rideStatusUpdate', handleStatusUpdate);
    driverSocket.on('rideCancelled', handleStatusUpdate);
    driverSocket.on('rideError', handleRideError);
    driverSocket.on('arrivalCodeRequested', handleArrivalCodeRequested);

    return () => {
      trackingActive = false;
      locationSub?.remove();
      headingSub?.remove();
      driverSocket.off('rideStatusUpdate', handleStatusUpdate);
      driverSocket.off('rideCancelled', handleStatusUpdate);
      driverSocket.off('rideError', handleRideError);
      driverSocket.off('arrivalCodeRequested', handleArrivalCodeRequested);
    };
  }, [animatedDrCoords, driver?.id, driver?.vehicle?.category, dropoff, headingAnim, pickup, rideId, router, stage]);

  const transitionRide = (eventName: 'driver_arrived' | 'start_trip' | 'complete_trip', optimistic: RideActionStatus) => {
    if (!driver?.id || !rideId || isActionBusy) return;

    setIsActionBusy(true);
    driverSocket.emit(eventName, { rideId, driverId: driver.id });

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActionStatus(optimistic);
    setTimeout(() => setIsActionBusy(false), 400);
  };

  const requestArrivalCode = () => {
    if (!driver?.id || !rideId || isActionBusy) return;

    setIsActionBusy(true);
    setArrivalCodeError('');
    setRequestedArrivalCode('');
    driverSocket.emit('driver_arrived', { rideId, driverId: driver.id });
  };

  const submitArrivalCode = () => {
    if (!driver?.id || !rideId || isActionBusy) return;

    const normalizedCode = arrivalCode.replace(/\D/g, '').slice(0, 6);
    if (normalizedCode.length !== 6) {
      setArrivalCodeError('Enter the 6-digit passenger code.');
      return;
    }

    setIsActionBusy(true);
    setArrivalCodeError('');
    driverSocket.emit('confirm_arrival_code', {
      rideId,
      driverId: driver.id,
      code: normalizedCode,
    });
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
      onPress: requestArrivalCode,
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
        onMapReady={() => setMapReady(true)}
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
          <Polyline coordinates={tripRoute} strokeWidth={3} strokeColor="rgba(17, 75, 122, 0.28)" lineCap="round" />
        )}

        {highlightedRoute.length > 1 && (
          <>
            <Polyline coordinates={highlightedRoute} strokeWidth={7} strokeColor="#074343" lineCap="round" />
            <Polyline coordinates={highlightedRoute} strokeWidth={4} strokeColor={stage === 'TO_PICKUP' ? TEAL : DEEP_BLUE} lineCap="round" />
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

      <Modal
        visible={arrivalCodeVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!isActionBusy) setArrivalCodeVisible(false);
        }}>
        <View style={styles.codeBackdrop}>
          <View style={styles.codeCard}>
            <Pressable
              style={styles.codeCloseButton}
              onPress={() => {
                if (!isActionBusy) setArrivalCodeVisible(false);
              }}
              disabled={isActionBusy}
              accessibilityRole="button"
              accessibilityLabel="Close confirm passenger popup">
              <Ionicons name="close" size={20} color="#4D6F6C" />
            </Pressable>
            <View style={styles.codeIcon}>
              <Ionicons name="shield-checkmark" size={30} color={TEAL} />
            </View>
            <Text style={styles.codeTitle}>Confirm Passenger</Text>
            <Text style={styles.codeSubtitle}>Ask the passenger for their 6-digit code before starting the trip.</Text>

            {!!requestedArrivalCode && (
              <View style={styles.generatedCodeBox}>
                <Text style={styles.generatedCodeLabel}>Passenger code</Text>
                <Text style={styles.generatedCodeValue}>{requestedArrivalCode}</Text>
              </View>
            )}

            <TextInput
              value={arrivalCode}
              onChangeText={(value) => {
                setArrivalCode(value.replace(/\D/g, '').slice(0, 6));
                setArrivalCodeError('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#9DB0AE"
              style={styles.codeInput}
            />

            {!!arrivalCodeError && <Text style={styles.codeError}>{arrivalCodeError}</Text>}

            <Pressable
              style={[styles.codeButton, isActionBusy && styles.codeButtonDisabled]}
              onPress={submitArrivalCode}
              disabled={isActionBusy}>
              {isActionBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.codeButtonText}>Confirm Arrival</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.resendCodeButton, isActionBusy && styles.codeButtonDisabled]}
              onPress={requestArrivalCode}
              disabled={isActionBusy}>
              <Ionicons name="refresh" size={17} color={TEAL} />
              <Text style={styles.resendCodeText}>Resend another code</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={tripCompletedVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.codeBackdrop}>
          <View style={styles.completedCard}>
            <View style={styles.completedIcon}>
              <Ionicons name="checkmark-done" size={30} color={TEAL} />
            </View>
            <Text style={styles.codeTitle}>Trip Completed</Text>
            <Text style={styles.codeSubtitle}>Ride completed successfully. You can now return to the driver home screen.</Text>
            <Pressable
              style={styles.completedButton}
              onPress={() => {
                setTripCompletedVisible(false);
                router.replace('/(tabs)/home');
              }}>
              <Text style={styles.codeButtonText}>Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  codeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 22, 21, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  codeCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
  },
  completedCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  completedIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFE7E2',
  },
  codeCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F7F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  codeIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  codeTitle: { fontSize: 22, fontWeight: '900', color: '#102A28', marginBottom: 8 },
  codeSubtitle: { fontSize: 14, fontWeight: '700', color: '#617C79', textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  codeInput: {
    width: '100%',
    height: 58,
    borderRadius: 16,
    backgroundColor: '#F7FBFA',
    borderWidth: 1,
    borderColor: '#D9E9E6',
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 8,
    color: '#102A28',
  },
  generatedCodeBox: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#F7FBFA',
    borderWidth: 1,
    borderColor: '#D9E9E6',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 14,
  },
  generatedCodeLabel: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  generatedCodeValue: {
    color: '#102A28',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 8,
  },
  codeError: { color: '#C0392B', fontSize: 13, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  codeButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  codeButtonDisabled: { opacity: 0.72 },
  codeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  completedButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  resendCodeButton: {
    minHeight: 44,
    marginTop: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resendCodeText: {
    color: TEAL,
    fontSize: 14,
    fontWeight: '900',
  },
});
