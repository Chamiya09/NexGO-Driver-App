import AsyncStorage from '@react-native-async-storage/async-storage';

const DRIVER_TOKEN_KEY = 'nexgo_driver_token';

let driverToken: string | null = null;

export async function loadDriverToken() {
  if (driverToken) {
    return driverToken;
  }

  const storedToken = await AsyncStorage.getItem(DRIVER_TOKEN_KEY);
  driverToken = storedToken;
  return storedToken;
}

export async function setDriverToken(nextToken: string | null) {
  driverToken = nextToken;
  if (nextToken) {
    await AsyncStorage.setItem(DRIVER_TOKEN_KEY, nextToken);
    return;
  }

  await AsyncStorage.removeItem(DRIVER_TOKEN_KEY);
}

export function getDriverToken() {
  return driverToken;
}

export async function clearDriverToken() {
  driverToken = null;
  await AsyncStorage.removeItem(DRIVER_TOKEN_KEY);
}
