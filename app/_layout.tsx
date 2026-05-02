import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { Keyboard, Modal, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { DriverAuthProvider, useDriverAuth } from '@/context/driver-auth-context';
import { NotificationsProvider } from '@/context/notifications-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import driverSocket from '@/lib/driverSocket';

export const unstable_settings = {
  anchor: '(tabs)',
};

function KeyboardDismissView({ children }: PropsWithChildren) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        if (keyboardVisible) {
          Keyboard.dismiss();
        }

        return false;
      }}>
      {children}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DriverAuthProvider>
        <NotificationsProvider>
          <KeyboardDismissView>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              <Stack.Screen name="ride-preview/[id]" />
            </Stack>
            <SuspendedOverlay />
            <StatusBar style="auto" />
          </KeyboardDismissView>
        </NotificationsProvider>
      </DriverAuthProvider>
    </ThemeProvider>
  );
}

  function SuspendedOverlay() {
    const { driver, loading, applyStatus } = useDriverAuth();

    useEffect(() => {
      const handleStatus = (payload: { driverId: string; status: string }) => {
        if (!driver?.id || payload.driverId !== driver.id) return;
        applyStatus(payload.status);
      };

      if (driver?.id && driverSocket.connected) {
        driverSocket.emit('registerDriver', driver.id);
      }

      driverSocket.on('connect', () => {
        if (driver?.id) {
          driverSocket.emit('registerDriver', driver.id);
        }
      });
      driverSocket.on('driver_account_status', handleStatus);

      return () => {
        driverSocket.off('driver_account_status', handleStatus);
      };
    }, [driver?.id, applyStatus]);

    if (loading || driver?.status !== 'suspended') {
      return null;
    }

    return (
      <Modal transparent visible animationType="fade">
        <View style={styles.suspendedOverlay}>
          <View style={styles.suspendedCard}>
            <Text style={styles.suspendedTitle}>Account Suspended</Text>
            <Text style={styles.suspendedText}>
              Your driver account is suspended. Please contact NexGO support for help.
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  const styles = StyleSheet.create({
    suspendedOverlay: {
      flex: 1,
      backgroundColor: 'rgba(7, 21, 19, 0.65)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    suspendedCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#D9E9E6',
      backgroundColor: '#FFFFFF',
      padding: 18,
      alignItems: 'center',
    },
    suspendedTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#102A28',
      marginBottom: 6,
    },
    suspendedText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#617C79',
      textAlign: 'center',
    },
  });
