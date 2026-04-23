import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { DriverAuthProvider } from '@/context/driver-auth-context';
import { NotificationsProvider } from '@/context/notifications-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DriverAuthProvider>
        <NotificationsProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="ride-preview/[id]" />
          </Stack>
          <StatusBar style="auto" />
        </NotificationsProvider>
      </DriverAuthProvider>
    </ThemeProvider>
  );
}
