import React from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const teal = '#008080';

const upcomingTrips = [
  {
    id: 'airport-ride',
    time: '04:30 PM',
    pickup: 'Colombo Fort Station',
    dropoff: 'Bandaranaike Airport',
    fare: 'LKR 4,850',
    distance: '28.4 km',
  },
  {
    id: 'hospital-ride',
    time: '06:15 PM',
    pickup: 'Nugegoda Junction',
    dropoff: 'Asiri Central Hospital',
    fare: 'LKR 1,620',
    distance: '8.2 km',
  },
];

const recentTrips = [
  { id: 'r1', route: 'Kollupitiya to Bambalapitiya', fare: 'LKR 780', status: 'Completed' },
  { id: 'r2', route: 'Rajagiriya to Borella', fare: 'LKR 940', status: 'Completed' },
  { id: 'r3', route: 'Wellawatte to Dehiwala', fare: 'LKR 690', status: 'Completed' },
];

export default function DriverTripsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>TRIPS</Text>
          <Text style={styles.title}>Ride activity</Text>
          <Text style={styles.subtitle}>Track upcoming pickups, active ride flow, and recently completed trips.</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusIconWrap}>
            <Ionicons name="radio-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.statusTextWrap}>
            <Text style={styles.statusTitle}>No active ride</Text>
            <Text style={styles.statusSubtitle}>Go online from Home to start receiving nearby requests.</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Ionicons name="calendar-outline" size={18} color={teal} />
            <Text style={styles.summaryValue}>2</Text>
            <Text style={styles.summaryLabel}>Upcoming</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="checkmark-done-outline" size={18} color={teal} />
            <Text style={styles.summaryValue}>12</Text>
            <Text style={styles.summaryLabel}>Today</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="time-outline" size={18} color={teal} />
            <Text style={styles.summaryValue}>41h</Text>
            <Text style={styles.summaryLabel}>Online</Text>
          </View>
        </View>

        <View style={styles.sectionHeadingWrap}>
          <Text style={styles.sectionHeading}>Upcoming Requests</Text>
          <Text style={styles.sectionSubheading}>Scheduled pickups and accepted ride queue</Text>
        </View>

        {upcomingTrips.map((trip) => (
          <View key={trip.id} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <View style={styles.timePill}>
                <Ionicons name="time-outline" size={14} color={teal} />
                <Text style={styles.timePillText}>{trip.time}</Text>
              </View>
              <Text style={styles.tripFare}>{trip.fare}</Text>
            </View>

            <View style={styles.routeBlock}>
              <RoutePoint icon="radio-button-on" label="Pickup" value={trip.pickup} />
              <View style={styles.routeDivider} />
              <RoutePoint icon="location" label="Drop-off" value={trip.dropoff} />
            </View>

            <View style={styles.tripFooter}>
              <Text style={styles.distanceText}>{trip.distance}</Text>
              <Pressable style={styles.detailButton}>
                <Text style={styles.detailButtonText}>View Details</Text>
                <Ionicons name="chevron-forward" size={15} color={teal} />
              </Pressable>
            </View>
          </View>
        ))}

        <View style={styles.sectionHeadingWrap}>
          <Text style={styles.sectionHeading}>Recent Trips</Text>
          <Text style={styles.sectionSubheading}>Completed ride history for quick review</Text>
        </View>

        <View style={styles.recentCard}>
          {recentTrips.map((trip, index) => (
            <View key={trip.id}>
              {index > 0 ? <View style={styles.inlineDivider} /> : null}
              <View style={styles.recentRow}>
                <View style={styles.recentIconWrap}>
                  <Ionicons name="car-outline" size={17} color={teal} />
                </View>
                <View style={styles.recentTextWrap}>
                  <Text style={styles.recentRoute}>{trip.route}</Text>
                  <Text style={styles.recentStatus}>{trip.status}</Text>
                </View>
                <Text style={styles.recentFare}>{trip.fare}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoutePoint({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.routePoint}>
      <View style={styles.routeIconWrap}>
        <Ionicons name={icon} size={16} color={teal} />
      </View>
      <View style={styles.routeTextWrap}>
        <Text style={styles.routeLabel}>{label}</Text>
        <Text style={styles.routeValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8F7',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 34,
  },
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    color: teal,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
  },
  title: {
    color: '#102A28',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 5,
  },
  subtitle: {
    color: '#617C79',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  statusCard: {
    borderRadius: 22,
    backgroundColor: teal,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#005D5D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextWrap: {
    flex: 1,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 3,
  },
  statusSubtitle: {
    color: 'rgba(255, 255, 255, 0.86)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  summaryValue: {
    color: '#102A28',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
  },
  summaryLabel: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeadingWrap: {
    marginBottom: 10,
  },
  sectionHeading: {
    color: '#102A28',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 2,
  },
  sectionSubheading: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '500',
  },
  tripCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 12,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  timePill: {
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: '#E7F5F3',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timePillText: {
    color: teal,
    fontSize: 12,
    fontWeight: '900',
  },
  tripFare: {
    color: '#102A28',
    fontSize: 16,
    fontWeight: '900',
  },
  routeBlock: {
    borderRadius: 16,
    backgroundColor: '#F7FBFA',
    borderWidth: 1,
    borderColor: '#D9E9E6',
    padding: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTextWrap: {
    flex: 1,
  },
  routeLabel: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  routeValue: {
    color: '#102A28',
    fontSize: 14,
    fontWeight: '800',
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#D9E9E6',
    marginVertical: 10,
    marginLeft: 40,
  },
  tripFooter: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  distanceText: {
    color: '#617C79',
    fontSize: 12,
    fontWeight: '800',
  },
  detailButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#E7F5F3',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailButtonText: {
    color: teal,
    fontSize: 12,
    fontWeight: '900',
  },
  recentCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E9E6',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  recentIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#E7F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTextWrap: {
    flex: 1,
  },
  recentRoute: {
    color: '#102A28',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  recentStatus: {
    color: '#617C79',
    fontSize: 11,
    fontWeight: '600',
  },
  recentFare: {
    color: '#102A28',
    fontSize: 13,
    fontWeight: '900',
  },
  inlineDivider: {
    height: 1,
    backgroundColor: '#D9E9E6',
    marginVertical: 10,
  },
});
