import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';

import { useDriverAuth } from '@/context/driver-auth-context';
import { DriverLoadingScreen } from '@/components/DriverLoadingScreen';

export default function IndexScreen() {
  const { driver, token, loading } = useDriverAuth();
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingComplete(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !minLoadingComplete) {
    return <DriverLoadingScreen />;
  }

  if (token && driver) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/login" />;
}
