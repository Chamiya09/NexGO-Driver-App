// components/NotificationAlert.tsx
// Reusable, animated floating notification card for incoming ride requests.

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Image,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { VehicleCategoryIcon } from './VehicleCategoryIcon';

const teal = '#008080';

// ── Types ─────────────────────────────────────────────────────────────────────
export type Coords = { latitude: number; longitude: number; name?: string };

export type RideNotificationData = {
  rideId: string;
  passengerId: string;
  passengerName: string;
  passengerImage?: string;
  vehicleType: string;
  price: number;
  pickup: Coords;
  dropoff: Coords;
  requestedAt: string;
  distanceKm?: number;
};

export type NotificationAlertRef = {
  show: (data: RideNotificationData) => void;
  dismiss: () => void;
};

type Props = {
  onPress: (data: RideNotificationData) => void;
  timeout?: number;
};

// ── Haversine helper ──────────────────────────────────────────────────────────
export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Component ─────────────────────────────────────────────────────────────────
export const NotificationAlert = forwardRef<NotificationAlertRef, Props>(
  ({ onPress, timeout = 20_000 }, ref) => {
    // ✅ FIX: useState so the JSX re-renders when new ride data arrives
    const [rideData, setRideData] = useState<RideNotificationData | null>(null);

    const slideY  = useRef(new Animated.Value(-220)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const dismiss = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      Animated.parallel([
        Animated.timing(slideY,  { toValue: -220, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,    duration: 250, useNativeDriver: true }),
      ]).start(() => setRideData(null));
    };

    useImperativeHandle(ref, () => ({
      show(data: RideNotificationData) {
        // Set state FIRST so the upcoming render has correct content
        setRideData(data);
        if (timerRef.current) clearTimeout(timerRef.current);

        // Small delay lets React flush the state update before animating
        requestAnimationFrame(() => {
          Animated.parallel([
            Animated.spring(slideY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 58,
              friction: 9,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 220,
              useNativeDriver: true,
            }),
          ]).start();
        });

        if (timeout > 0) {
          timerRef.current = setTimeout(dismiss, timeout);
        }
      },
      dismiss,
    }));

    useEffect(() => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    const handlePress = () => {
      if (!rideData) return;
      onPress(rideData);
      dismiss();
    };

    const distanceLabel =
      rideData?.distanceKm != null
        ? `${rideData.distanceKm.toFixed(1)} km away`
        : 'Nearby';

    return (
      <Animated.View
        pointerEvents="box-none"
        style={[styles.card, { transform: [{ translateY: slideY }], opacity }]}>

        <TouchableOpacity activeOpacity={0.9} style={styles.inner} onPress={handlePress}>
          {/* Green icon bubble */}
          <View style={styles.iconBubble}>
            {rideData?.passengerImage ? (
              <Image source={{ uri: rideData.passengerImage }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="car-sport" size={22} color="#FFF" />
            )}
          </View>

          {/* Text */}
          <View style={styles.textBlock}>
            <View style={styles.headerRow}>
              <View style={styles.pingDot} />
              <Text style={styles.eyebrow}>NEW RIDE REQUEST</Text>
            </View>
            <View style={styles.titleRow}>
              <View style={styles.vehicleChip}>
                <VehicleCategoryIcon category={rideData?.vehicleType} size={24} active />
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {rideData?.vehicleType ?? '—'} · {rideData?.passengerName ?? '—'}
              </Text>
            </View>
            <Text style={styles.sub} numberOfLines={1}>
              📍 {distanceLabel} · LKR {(rideData?.price ?? 0).toLocaleString()}
            </Text>
            <Text style={styles.cta}>Tap to preview →</Text>
          </View>

          {/* Arrow chip */}
          <View style={styles.arrowChip}>
            <Ionicons name="chevron-forward" size={18} color={teal} />
          </View>
        </TouchableOpacity>

        {/* Dismiss × */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={dismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={15} color="#8CA1A0" />
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

NotificationAlert.displayName = 'NotificationAlert';

// ── Styles ─────────────────────────────────────────────────────────────────────
// Offset from the top of the SCREEN (not SafeAreaView):
// status bar height + top bar card height (~70) + gap
const TOP_OFFSET =
  Platform.OS === 'android'
    ? (RNStatusBar.currentHeight ?? 24) + 78
    : 110;

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: TOP_OFFSET,
    left: 14,
    right: 14,
    zIndex: 9999,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#27AE60',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    paddingRight: 36, // room for × button
    gap: 12,
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#27AE60',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  textBlock: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  pingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#27AE60' },
  eyebrow: { fontSize: 10, fontWeight: '900', color: '#27AE60', letterSpacing: 0.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  vehicleChip: {
    width: 32,
    height: 26,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title:   { flex: 1, fontSize: 14, fontWeight: '900', color: '#102A28' },
  sub:     { fontSize: 12, fontWeight: '600', color: '#617C79', marginBottom: 3 },
  cta:     { fontSize: 11, fontWeight: '800', color: teal },
  arrowChip: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: '#E7F5F3',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#F0F5F4',
    alignItems: 'center', justifyContent: 'center',
  },
});
