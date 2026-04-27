// app/(tabs)/notifications.tsx
// Driver App — Ride Request Notifications Screen
// Shows all incoming ride requests with passenger location details.

import React, { useCallback } from 'react';
import {
  FlatList,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotifications, RideNotification } from '@/context/notifications-context';

const teal = '#008080';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-LK', { day: '2-digit', month: 'short' });
}

function shortenName(name?: string, lat?: number, lng?: number): string {
  if (name?.trim()) return name.length > 30 ? name.slice(0, 28) + '…' : name;
  if (lat != null && lng != null) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return 'Unknown';
}

// ── Notification Card ─────────────────────────────────────────────────────────
function NotificationCard({
  item,
  onPress,
}: {
  item: RideNotification;
  onPress: (item: RideNotification) => void;
}) {
  const pickupName  = shortenName(item.pickup.name,  item.pickup.latitude,  item.pickup.longitude);
  const dropoffName = shortenName(item.dropoff.name, item.dropoff.latitude, item.dropoff.longitude);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={() => onPress(item)}>

      {/* Unread dot */}
      {!item.read && <View style={styles.unreadDot} />}

      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={styles.iconBubble}>
          <Ionicons name="car-sport" size={20} color="#FFF" />
        </View>

        <View style={styles.cardTopText}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.passengerName}
            </Text>
            <Text style={styles.cardTime}>{timeAgo(item.receivedAt)}</Text>
          </View>
          <Text style={styles.cardSub}>
            {item.vehicleType} · LKR {item.price.toLocaleString()}
            {item.distanceKm != null ? ` · ${item.distanceKm.toFixed(1)} km away` : ''}
          </Text>
        </View>
      </View>

      {/* Location block */}
      <View style={styles.locationBlock}>
        {/* Pickup */}
        <View style={styles.locRow}>
          <View style={[styles.locDot, { backgroundColor: teal }]} />
          <View style={styles.locTextWrap}>
            <Text style={styles.locLabel}>PASSENGER PICKUP</Text>
            <Text style={styles.locValue} numberOfLines={1}>{pickupName}</Text>
          </View>
          {/* Coordinates badge */}
          <View style={styles.coordBadge}>
            <Ionicons name="location-outline" size={11} color={teal} />
            <Text style={styles.coordText}>
              {item.pickup.latitude.toFixed(4)}, {item.pickup.longitude.toFixed(4)}
            </Text>
          </View>
        </View>

        <View style={styles.locConnector} />

        {/* Dropoff */}
        <View style={styles.locRow}>
          <View style={[styles.locDot, { backgroundColor: '#E74C3C' }]} />
          <View style={styles.locTextWrap}>
            <Text style={styles.locLabel}>DROP-OFF</Text>
            <Text style={styles.locValue} numberOfLines={1}>{dropoffName}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.vehicleChip}>
          <Ionicons name="car-outline" size={13} color={teal} />
          <Text style={styles.vehicleChipText}>{item.vehicleType}</Text>
        </View>
        <Text style={styles.footerFare}>LKR {item.price.toLocaleString()}</Text>
        <View style={styles.previewChip}>
          <Text style={styles.previewChipText}>View Ride</Text>
          <Ionicons name="arrow-forward" size={12} color={teal} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons name="notifications-off-outline" size={38} color={teal} />
      </View>
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySub}>
        Go Online to start receiving ride requests from nearby passengers.
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications();

  const handlePress = useCallback(
    (item: RideNotification) => {
      markRead(item.rideId);
      // Navigate to the Ride Preview screen with all params
      router.push({
        pathname: '/ride-preview/[id]',
        params: {
          id:            item.rideId,
          passengerName: item.passengerName,
          vehicleType:   item.vehicleType,
          price:         String(item.price),
          pLat:  String(item.pickup.latitude),
          pLng:  String(item.pickup.longitude),
          pName: item.pickup.name  ?? '',
          dLat:  String(item.dropoff.latitude),
          dLng:  String(item.dropoff.longitude),
          dName: item.dropoff.name ?? '',
        },
      });
    },
    [markRead, router]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>RIDE REQUESTS</Text>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markReadBtn} onPress={markAllRead}>
              <Text style={styles.markReadText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Unread count pill */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <View style={styles.unreadPingDot} />
          <Text style={styles.unreadBannerText}>
            {unreadCount} unread ride {unreadCount === 1 ? 'request' : 'requests'}
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationCard item={item} onPress={handlePress} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState />}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8F7',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  eyebrow: { fontSize: 11, fontWeight: '900', color: teal, marginBottom: 2 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#102A28' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  markReadBtn: {
    backgroundColor: '#E7F5F3',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  markReadText: { fontSize: 12, fontWeight: '800', color: teal },
  clearBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },

  // Unread banner
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#E9F8EF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBE8CC',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  unreadPingDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#27AE60',
  },
  unreadBannerText: { fontSize: 13, fontWeight: '700', color: '#178A4F' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0EDEB',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardUnread: {
    borderColor: '#A7D9D4',
    borderLeftWidth: 4,
    borderLeftColor: teal,
  },
  unreadDot: {
    position: 'absolute',
    top: 14, right: 14,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#27AE60',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBubble: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#27AE60',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardTopText: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#102A28', flex: 1 },
  cardTime:  { fontSize: 11, fontWeight: '700', color: '#8CA1A0', flexShrink: 0 },
  cardSub:   { fontSize: 12, fontWeight: '600', color: '#617C79' },

  // Location block
  locationBlock: {
    backgroundColor: '#F7FBFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  locTextWrap: { flex: 1 },
  locLabel: { fontSize: 9, fontWeight: '900', color: '#8CA1A0', letterSpacing: 0.4, marginBottom: 1 },
  locValue: { fontSize: 13, fontWeight: '800', color: '#102A28' },
  coordBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#E7F5F3',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, flexShrink: 0,
  },
  coordText: { fontSize: 9, fontWeight: '800', color: teal },
  locConnector: {
    width: 2, height: 14,
    backgroundColor: '#D9E9E6',
    borderRadius: 1,
    marginLeft: 4, marginVertical: 3,
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E7F5F3',
    borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5,
  },
  vehicleChipText: { fontSize: 12, fontWeight: '800', color: teal },
  footerFare: { fontSize: 15, fontWeight: '900', color: '#102A28' },
  previewChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0F5F4',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
  },
  previewChipText: { fontSize: 12, fontWeight: '800', color: teal },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#E7F5F3',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#102A28', marginBottom: 8 },
  emptySub: {
    fontSize: 13, fontWeight: '500', color: '#617C79',
    textAlign: 'center', lineHeight: 20,
  },
});
