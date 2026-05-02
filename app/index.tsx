import { Redirect } from 'expo-router';

import { useDriverAuth } from '@/context/driver-auth-context';

export default function IndexScreen() {
  const { driver, token, loading } = useDriverAuth();

  if (loading) {
    return null;
  }

  if (token && driver) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/login" />;
}
