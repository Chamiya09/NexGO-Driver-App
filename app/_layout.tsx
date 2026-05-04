import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { DriverAuthProvider, useDriverAuth } from '@/context/driver-auth-context';
import { NotificationsProvider } from '@/context/notifications-context';
import { useAppPermissions } from '@/hooks/useAppPermissions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import driverSocket from '@/lib/driverSocket';

void SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('[Startup] Unable to keep splash screen visible:', error);
});

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
  const { checking: permissionsChecking } = useAppPermissions();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function prepareStartup() {
      try {
        await Font.loadAsync({
          ...Ionicons.font,
          ...Feather.font,
          ...MaterialIcons.font,
        });
      } catch (error) {
        console.warn('[Startup] Font loading failed:', error);
      } finally {
        if (isMounted) {
          setFontsLoaded(true);
        }
      }
    }

    void prepareStartup();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    async function hideSplashWhenReady() {
      if (!fontsLoaded || permissionsChecking) {
        return;
      }

      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.warn('[Startup] Unable to hide splash screen:', error);
      }
    }

    void hideSplashWhenReady();
  }, [fontsLoaded, permissionsChecking]);

  if (!fontsLoaded || permissionsChecking) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary FallbackComponent={RootErrorFallback}>
        <SafeAreaProvider>
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
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

function RootErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <View style={styles.errorScreen}>
      <View style={styles.errorIcon}>
        <Ionicons name="alert-circle" size={34} color="#008080" />
      </View>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>
        NexGO Driver ran into a problem while starting. Please try again, or reopen the app if the issue continues.
      </Text>
      {__DEV__ && (
        <Text selectable style={styles.errorDetails}>
          {errorMessage}
        </Text>
      )}
      <Pressable style={styles.errorButton} onPress={resetErrorBoundary}>
        <Text style={styles.errorButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

function SuspendedOverlay() {
    const { driver, loading, applyStatus } = useDriverAuth();

    useEffect(() => {
      const handleStatus = (payload: { driverId: string; status: string }) => {
        if (!driver?.id || String(payload.driverId) !== String(driver.id)) return;
        applyStatus(payload.status);
      };

      const registerCurrentDriver = () => {
        if (driver?.id) {
          driverSocket.emit('registerDriver', driver.id);
        }
      };

      if (driver?.id && driverSocket.connected) {
        registerCurrentDriver();
      }

      driverSocket.on('connect', registerCurrentDriver);
      driverSocket.on('driver_account_status', handleStatus);

      return () => {
        driverSocket.off('connect', registerCurrentDriver);
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
    errorScreen: {
      flex: 1,
      backgroundColor: '#F7FBFA',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    errorIcon: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: '#E7F5F3',
      borderWidth: 1,
      borderColor: '#CDE9E6',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    errorTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: '#102A28',
      textAlign: 'center',
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#617C79',
      textAlign: 'center',
      lineHeight: 21,
      maxWidth: 360,
    },
    errorDetails: {
      marginTop: 14,
      color: '#9A4A3F',
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    errorButton: {
      minHeight: 50,
      borderRadius: 18,
      backgroundColor: '#008080',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      marginTop: 22,
    },
    errorButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },
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
