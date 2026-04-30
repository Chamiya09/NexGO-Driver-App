import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import RefreshableScrollView from '@/components/RefreshableScrollView';
import { useDriverAuth } from '@/context/driver-auth-context';
import { API_BASE_URL, parseApiResponse } from '@/lib/api';

const teal = '#008080';

type Coords = { latitude: number; longitude: number; name?: string };

type RideReview = {
  rideId: string;
  rating: number;
  comment: string;
  status?: 'review' | 'approved' | 'rejected';
  submittedAt?: string | null;
  reviewedAt?: string | null;
  moderatedAt?: string | null;
  updatedAt?: string | null;
};

type DriverReviewRide = {
  id: string;
  pickup: Coords;
  dropoff: Coords;
  vehicleType: string;
  price: number;
  status: string;
  requestedAt: string;
  completedAt?: string | null;
  passenger?: {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    profileImageUrl?: string;
  } | null;
  review?: RideReview | null;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return 'Not available';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleDateString('en-LK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMoney = (value: number) => {
  if (!Number.isFinite(value)) return 'LKR 0';
  return `LKR ${value.toLocaleString()}`;
};

const shortenLocation = (coords?: Coords) => coords?.name || 'Location not available';

const getStatusConfig = (status?: RideReview['status']) => {
  if (status === 'approved') {
    return { label: 'Approved', icon: 'checkmark-circle' as const, bg: '#E9F8EF', text: '#157A62' };
  }

  if (status === 'rejected') {
    return { label: 'Rejected', icon: 'close-circle' as const, bg: '#FFF4F4', text: '#C13B3B' };
  }

  return { label: 'Pending', icon: 'time-outline' as const, bg: '#FFF8EC', text: '#D97706' };
};

export default function DriverMyReviewsScreen() {
  const { token } = useDriverAuth();
  const [rides, setRides] = useState<DriverReviewRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedReview, setSelectedReview] = useState<DriverReviewRide | null>(null);

  const loadReviews = useCallback(async (isRefresh = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/rides/driver-rides?refresh=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      });
      const data = await parseApiResponse<{ rides?: DriverReviewRide[] }>(response);
      const reviewedRides = (data.rides ?? [])
        .filter((ride) => Boolean(ride.review))
        .sort((a, b) =>
          new Date(b.review?.submittedAt ?? b.review?.reviewedAt ?? b.completedAt ?? b.requestedAt).getTime() -
          new Date(a.review?.submittedAt ?? a.review?.reviewedAt ?? a.completedAt ?? a.requestedAt).getTime()
        );

      setRides(reviewedRides);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load driver reviews.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [loadReviews])
  );

  const stats = useMemo(() => {
    const approvedReviews = rides.filter((ride) => ride.review?.status === 'approved');
    const totalRating = approvedReviews.reduce((sum, ride) => sum + (ride.review?.rating ?? 0), 0);
    const average = approvedReviews.length ? (totalRating / approvedReviews.length).toFixed(1) : 'New';
    const pending = rides.filter((ride) => ride.review?.status !== 'approved' && ride.review?.status !== 'rejected').length;

    return { average, approved: approvedReviews.length, pending };
  }, [rides]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <RefreshableScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        onRefreshPage={() => loadReviews(true)}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="star-half-outline" size={24} color={teal} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>My Reviews</Text>
            <Text style={styles.heroSubtitle}>Passenger feedback from your completed rides.</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard label="Average" value={stats.average} icon="star-outline" />
          <MetricCard label="Approved" value={String(stats.approved)} icon="checkmark-circle-outline" />
          <MetricCard label="Pending" value={String(stats.pending)} icon="time-outline" />
        </View>

        {error ? (
          <View style={styles.feedbackCard}>
            <Ionicons name="information-circle-outline" size={17} color="#C13B3B" />
            <Text style={styles.feedbackText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={teal} />
            <Text style={styles.loadingText}>Loading your reviews...</Text>
          </View>
        ) : rides.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="star-outline" size={25} color={teal} />
            </View>
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptyText}>Passenger reviews will appear here after completed rides.</Text>
          </View>
        ) : (
          <View style={styles.reviewList}>
            {rides.map((ride) => (
              <ReviewCard key={ride.id} ride={ride} onView={() => setSelectedReview(ride)} />
            ))}
          </View>
        )}

        {refreshing ? <Text style={styles.refreshText}>Refreshing reviews...</Text> : null}
      </RefreshableScrollView>

      {selectedReview ? (
        <View style={styles.popupOverlay}>
          <Pressable style={styles.popupBackdrop} onPress={() => setSelectedReview(null)} />
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <View style={styles.popupHeaderMain}>
                <View style={styles.popupIcon}>
                  <Ionicons name="star-half-outline" size={20} color={teal} />
                </View>
                <View style={styles.popupTitleWrap}>
              <Text style={styles.popupTitle}>Review Details</Text>
                  <Text style={styles.popupSubtitle} numberOfLines={1}>
                    {selectedReview.passenger?.fullName || 'Passenger not available'}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.popupCloseButton} onPress={() => setSelectedReview(null)}>
                <Ionicons name="close" size={18} color="#617C79" />
              </Pressable>
            </View>

            <View style={styles.popupMessageBox}>
              <Text style={styles.popupSectionLabel}>REVIEW MESSAGE</Text>
              <View style={styles.popupRatingRow}>
                <StarStrip rating={selectedReview.review?.rating ?? 0} />
                <Text style={styles.popupRatingText}>{selectedReview.review?.rating ?? 0}.0 rating</Text>
                <StatusBadge status={selectedReview.review?.status} />
              </View>
              <Text style={styles.popupMessageText}>{selectedReview.review?.comment || 'No written review message.'}</Text>
            </View>

            <View style={styles.popupDetailsBox}>
              <Text style={styles.popupSectionLabel}>PASSENGER DETAILS</Text>
              <DetailLine icon="person-outline" label="Passenger" value={selectedReview.passenger?.fullName || 'Passenger not available'} />
              <DetailLine icon="call-outline" label="Phone" value={selectedReview.passenger?.phoneNumber || 'Not available'} />
              <DetailLine icon="mail-outline" label="Email" value={selectedReview.passenger?.email || 'Not available'} />
            </View>

            <View style={styles.popupDetailsBox}>
              <Text style={styles.popupSectionLabel}>RIDE DETAILS</Text>
              <DetailLine icon="radio-button-on" label="Pickup" value={shortenLocation(selectedReview.pickup)} />
              <DetailLine icon="location" label="Drop-off" value={shortenLocation(selectedReview.dropoff)} />
              <DetailLine icon="wallet-outline" label="Fare" value={formatMoney(selectedReview.price)} />
              <DetailLine icon="calendar-outline" label="Completed" value={formatDate(selectedReview.completedAt)} />
              <DetailLine icon="time-outline" label="Moderated" value={formatDate(selectedReview.review?.moderatedAt)} />
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.metricCard}>
      <Ionicons name={icon} size={17} color={teal} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ReviewCard({ ride, onView }: { ride: DriverReviewRide; onView: () => void }) {
  const review = ride.review;

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTopRow}>
        <View style={styles.reviewIcon}>
          <Ionicons name="star" size={18} color="#D97706" />
        </View>
        <View style={styles.reviewTitleWrap}>
          <Text style={styles.reviewTitle} numberOfLines={1}>
            {ride.passenger?.fullName || 'Passenger not available'}
          </Text>
          <Text style={styles.reviewMeta} numberOfLines={1}>
            {ride.passenger?.phoneNumber || 'No phone'} | {formatDate(review?.submittedAt ?? review?.reviewedAt)}
          </Text>
        </View>
        <StatusBadge status={review?.status} />
      </View>

      <View style={styles.ratingLine}>
        <StarStrip rating={review?.rating ?? 0} />
        <Text style={styles.ratingText}>{review?.rating ?? 0}.0 rating</Text>
      </View>

      <View style={styles.messageBox}>
        <Ionicons name="chatbubble-ellipses-outline" size={15} color={teal} />
        <Text style={styles.messageText} numberOfLines={2}>{review?.comment || 'No written review message.'}</Text>
      </View>

      <Pressable style={styles.detailsButton} onPress={onView}>
        <Ionicons name="eye-outline" size={15} color={teal} />
        <Text style={styles.detailsButtonText}>View Details</Text>
      </Pressable>
    </View>
  );
}

function StatusBadge({ status }: { status?: RideReview['status'] }) {
  const config = getStatusConfig(status);

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={12} color={config.text} />
      <Text style={[styles.statusText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

function StarStrip({ rating }: { rating: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={14}
          color={star <= rating ? '#F5A623' : '#B7C7C5'}
        />
      ))}
    </View>
  );
}

function DetailLine({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailLine}>
      <Ionicons name={icon} size={14} color={teal} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8F7',
  },
  container: {
    padding: 16,
    paddingBottom: 30,
    gap: 12,
  },
  heroCard: {
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    color: '#102A28',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 3,
  },
  heroSubtitle: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    color: '#102A28',
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '700',
  },
  feedbackCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1D6D6',
    backgroundColor: '#FFF4F4',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackText: {
    flex: 1,
    color: '#C13B3B',
    fontSize: 12,
    fontWeight: '800',
  },
  loadingCard: {
    minHeight: 90,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#617C79',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#102A28',
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
  reviewList: {
    gap: 10,
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 10,
  },
  reviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF8EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  reviewTitle: {
    color: '#102A28',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  reviewMeta: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '900',
  },
  messageBox: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  messageText: {
    flex: 1,
    color: '#102A28',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  detailsButton: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  detailsButtonText: {
    color: teal,
    fontSize: 12,
    fontWeight: '900',
  },
  statusBadge: {
    minHeight: 26,
    borderRadius: 999,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  refreshText: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  popupOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  popupBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 53, 50, 0.36)',
  },
  popupCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 10,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  popupHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  popupIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  popupTitle: {
    color: '#102A28',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  popupSubtitle: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '700',
  },
  popupCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupMessageBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
    padding: 10,
    gap: 8,
  },
  popupSectionLabel: {
    color: '#617C79',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  popupRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  popupRatingText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '900',
  },
  popupMessageText: {
    color: '#102A28',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  popupDetailsBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#F7FBFA',
    padding: 10,
    gap: 8,
  },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  detailLabel: {
    width: 76,
    color: '#617C79',
    fontSize: 11,
    fontWeight: '800',
  },
  detailValue: {
    flex: 1,
    color: '#102A28',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
});
