import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/context/notifications-context';

const teal = '#008080';

// ── Badge component (unread count) ────────────────────────────────────────────
function NotifTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { unreadCount } = useNotifications();
  return (
    <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons
        size={24}
        name={focused ? 'notifications' : 'notifications-outline'}
        color={color}
      />
      {unreadCount > 0 && (
        <View style={badge.wrap}>
          <Text style={badge.text}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
        </View>
      )}
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: -3, right: -5,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#E74C3C',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  text: { fontSize: 9, fontWeight: '900', color: '#FFFFFF' },
});

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarActiveTintColor: teal,
        tabBarInactiveTintColor: '#A0B3B2',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F0F5F4',
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          elevation: 10,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: -2,
        },
      }}>

      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? 'speedometer' : 'speedometer-outline'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, focused }) => (
            <NotifTabIcon color={color} focused={focused} />
          ),
        }}
      />


      <Tabs.Screen
        name="active-ride"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? 'list-circle' : 'list-circle-outline'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? 'person' : 'person-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
