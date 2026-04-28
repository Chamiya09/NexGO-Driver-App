import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDriverAuth } from '@/context/driver-auth-context';
import { API_BASE_URL } from '@/lib/api';
import driverSocket from '@/lib/driverSocket';
import {
  clearDriverActiveRide,
  DriverActiveRideParams,
  loadDriverActiveRide,
} from '@/lib/activeRideStorage';

// Driver App Primary Teal Theme
const teal = '#008080';

// ── Types ─────────────────────────────────────────────────────────────────────
type RideStatus = 'Pending' | 'Accepted' | 'InProgress' | 'Completed' | 'Cancelled';

type Coords = { latitude: number; longitude: number; name?: string };

type Ride = {
  id: string;
  pickup: Coords;
  dropoff: Coords;
  vehicleType: string;
  price: number;
  status: RideStatus;
  requestedAt: string;
};

// ── Status tag config ─────────────────────────────────────────────────────────
type StatusConfig = {
  label: string;
  bg: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  pulse: boolean;
};

const STATUS_CONFIG: Record<RideStatus, StatusConfig> = {
  Pending: {
    label: 'Pending',
    bg: '#FFF8EC',
    text: '#D97706',
    icon: 'hourglass-outline',
    pulse: true,
  },
  Accepted: {
    label: 'Confirmed',
    bg: '#E9F8EF',
    text: '#178A4F',
    icon: 'checkmark-circle-outline',
    pulse: false,
  },
  InProgress: {
    label: 'In Progress',
    bg: '#E7F5F3',
    text: teal,
    icon: 'car-outline',
    pulse: false,
  },
  Completed: {
    label: 'Completed',
    bg: '#F0F5FA',
    text: '#4A6FA5',
    icon: 'checkmark-done-circle-outline',
    pulse: false,
  },
  Cancelled: {
    label: 'Cancelled',
    bg: '#FEF2F2',
    text: '#DC2626',
    icon: 'close-circle-outline',
    pulse: false,
  },
};

// ── Utility: shorten a location name ─────────────────────────────────────────
const shortenLocation = (name?: string, lat?: number, lng?: number): string => {
  if (name && name.trim()) {
    return name.length > 28 ? name.substring(0, 26) + '…' : name;
  }
  if (lat !== undefined && lng !== undefined) {
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
  return 'Unknown location';
};

// ── Utility: format date ──────────────────────────────────────────────────────
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-LK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ── Pulsing dot sub-component ─────────────────────────────────────────────────
function PulseDot({ color }: { color: string }) {
  const scale = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.55, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scale]);

  return (
    <Animated.View
      style={[
        pulseDotStyles.dot,
        { backgroundColor: color, transform: [{ scale }] },
      ]}
    />
  );
}

const pulseDotStyles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
});

// ── Status Tag sub-component ──────────────────────────────────────────────────
function StatusTag({ status }: { status: RideStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending;
  return (
    <View style={[tagStyles.badge, { backgroundColor: cfg.bg }]}>
      {cfg.pulse
        ? <PulseDot color={cfg.text} />
        : <Ionicons name={cfg.icon} size={13} color={cfg.text} />}
      <Text style={[tagStyles.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const tagStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 12, fontWeight: '800' },
});

// ── Ride Card sub-component ───────────────────────────────────────────────────
function RideCard({ ride }: { ride: Ride }) {
  const pickupName = shortenLocation(ride.pickup?.name, ride.pickup?.latitude, ride.pickup?.longitude);
  const dropoffName = shortenLocation(ride.dropoff?.name, ride.dropoff?.latitude, ride.dropoff?.longitude);

  return (
    <View style={cardStyles.card}>
      {/* Top row: date + status */}
      <View style={cardStyles.topRow}>
        <View style={cardStyles.dateWrap}>
          <Ionicons name="calendar-outline" size={13} color="#8CA1A0" />
          <Text style={cardStyles.date}>{formatDate(ride.requestedAt)}</Text>
        </View>
        <StatusTag status={ride.status} />
      </View>

      {/* Route block */}
      <View style={cardStyles.routeBlock}>
        {/* Pickup */}
        <View style={cardStyles.routeRow}>
          <View style={[cardStyles.routeDot, { backgroundColor: teal }]} />
          <View style={cardStyles.routeTextWrap}>
            <Text style={cardStyles.routeLabel}>PICKUP</Text>
            <Text style={cardStyles.routeValue} numberOfLines={1}>{pickupName}</Text>
          </View>
        </View>
        {/* Connector line */}
        <View style={cardStyles.connector}>
          <View style={cardStyles.connectorLine} />
        </View>
        {/* Dropoff */}
        <View style={cardStyles.routeRow}>
          <View style={[cardStyles.routeDot, { backgroundColor: '#E74C3C' }]} />
          <View style={cardStyles.routeTextWrap}>
            <Text style={cardStyles.routeLabel}>DROP-OFF</Text>
            <Text style={cardStyles.routeValue} numberOfLines={1}>{dropoffName}</Text>
          </View>
        </View>
      </View>

      {/* Footer: vehicle + fare */}
      <View style={cardStyles.footer}>
        <View style={cardStyles.vehicleChip}>
          <Ionicons name="car-outline" size={13} color={teal} />
          <Text style={cardStyles.vehicleText}>{ride.vehicleType}</Text>
        </View>
        <Text style={cardStyles.fare}>LKR {ride.price.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0EDEB',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  date: { fontSize: 12, fontWeight: '600', color: '#8CA1A0' },
  routeBlock: {
    backgroundColor: '#F7FBFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  routeTextWrap: { flex: 1 },
  routeLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8CA1A0',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  routeValue: { fontSize: 13, fontWeight: '800', color: '#102A28' },
  connector: { paddingLeft: 4, paddingVertical: 3 },
  connectorLine: {
    width: 2,
    height: 12,
    backgroundColor: '#D9E9E6',
    borderRadius: 1,
    marginLeft: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E7F5F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  vehicleText: { fontSize: 12, fontWeight: '800', color: teal },
  fare: { fontSize: 15, fontWeight: '900', color: '#102A28' },
});

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={emptyStyles.wrap}>
      <View style={emptyStyles.iconWrap}>
        <Ionicons name="car-outline" size={40} color={teal} />
      </View>
      <Text style={emptyStyles.title}>No rides yet</Text>
      <Text style={emptyStyles.sub}>
        Your trip history will appear here once you complete or accept your first ride.
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#E7F5F3',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '900', color: '#102A28', marginBottom: 8 },
  sub: {
    fontSize: 13, fontWeight: '500', color: '#617C79',
    textAlign: 'center', lineHeight: 20,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DriverTripsScreen() {
  const { driver, token } = useDriverAuth();
  const router = useRouter();

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestNavigation, setLatestNavigation] = useState<DriverActiveRideParams | null>(null);

  const loadLatestNavigation = useCallback(async () => {
    const stored = await loadDriverActiveRide();
    setLatestNavigation(stored);
  }, []);

  // ── Fetch rides from API ───────────────────────────────────────────────────
  const fetchRides = useCallback(async (isRefresh = false) => {
    if (!token) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/rides/driver-rides`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? 'Failed to load rides');
      }

      const data = await res.json() as { rides: Ride[] };
      // Sort rides newest requested first if not already sorted
      const sortedRides = (data.rides ?? []).sort(
        (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
      setRides(sortedRides);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load rides');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchRides();
    loadLatestNavigation();
  }, [fetchRides, loadLatestNavigation]);

  // ── Socket: real-time status updates ──────────────────────────────────────
  useEffect(() => {
    if (!driver?.id) return;

    const handleRideUpdate = ({ rideId, status }: { rideId: string; status: RideStatus }) => {
      console.log('[DriverTrips] rideStatusUpdate:', rideId, status);
      setRides((prev) =>
        prev.map((r) => (r.id === rideId ? { ...r, status } : r))
      );
    };

    driverSocket.on('rideStatusUpdate', handleRideUpdate);

    return () => {
      driverSocket.off('rideStatusUpdate', handleRideUpdate);
    };
  }, [driver?.id]);

  useEffect(() => {
    if (!latestNavigation) return;

    const matchedRide = rides.find((ride) => ride.id === latestNavigation.id);
    if (!matchedRide) return;

    if (matchedRide.status === 'Completed' || matchedRide.status === 'Cancelled') {
      clearDriverActiveRide();
      setLatestNavigation(null);
    }
  }, [latestNavigation, rides]);

  // ── Summary counts ─────────────────────────────────────────────────────────
  const activeCount = rides.filter((r) => r.status === 'Accepted' || r.status === 'InProgress').length;
  const completedCount = rides.filter((r) => r.status === 'Completed').length;
  const latestRide = latestNavigation
    ? rides.find((ride) => ride.id === latestNavigation.id)
    : null;
  const canResumeNavigation = Boolean(
    latestNavigation &&
    (!latestRide || (latestRide.status !== 'Completed' && latestRide.status !== 'Cancelled'))
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>TRIPS</Text>
          <Text style={styles.title}>Ride Activity</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchRides(true)}>
          <Ionicons name="refresh-outline" size={20} color={teal} />
        </TouchableOpacity>
      </View>

      {/* Summary chips */}
      {rides.length > 0 && (
        <View style={styles.summaryRow}>
          <SummaryChip icon="list-outline" label="Total" value={String(rides.length)} />
          <SummaryChip icon="car-sport-outline" label="Active" value={String(activeCount)} />
          <SummaryChip icon="checkmark-done-outline" label="Done" value={String(completedCount)} />
        </View>
      )}

      {canResumeNavigation && (
        <TouchableOpacity
          style={styles.resumeNavBtn}
          onPress={() =>
            router.push({
              pathname: '/active-ride/[id]',
              params: latestNavigation ?? {},
            })
          }
        >
          <View style={styles.resumeNavIcon}>
            <Ionicons name="navigate" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.resumeNavTextWrap}>
            <Text style={styles.resumeNavTitle}>Return to live navigation</Text>
            <Text style={styles.resumeNavSubtitle}>
              {latestRide?.status === 'InProgress'
                ? 'Ride in progress'
                : 'Driver heading to pickup'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={teal} />
          <Text style={styles.loadingText}>Loading your trips...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={40} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRides()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RideCard ride={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRides(true)}
              colors={[teal]}
              tintColor={teal}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Summary chip component ────────────────────────────────────────────────────
function SummaryChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={chipStyles.chip}>
      <Ionicons name={icon} size={16} color={teal} />
      <Text style={chipStyles.value}>{value}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 3,
  },
  value: { fontSize: 16, fontWeight: '900', color: '#102A28' },
  label: { fontSize: 11, fontWeight: '700', color: '#617C79' },
});

// ── Screen styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8F7',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  eyebrow: {
    color: teal,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  title: {
    color: '#102A28',
    fontSize: 26,
    fontWeight: '900',
  },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#E7F5F3',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#D9E9E6',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  resumeNavBtn: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: teal,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  resumeNavIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeNavTextWrap: {
    flex: 1,
  },
  resumeNavTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  resumeNavSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 32,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: teal,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#617C79',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: teal,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
});
