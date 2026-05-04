import AsyncStorage from '@react-native-async-storage/async-storage';

type StoredPayload<T> = {
  params: T;
  savedAt: number;
};

export type DriverActiveRideParams = {
  id: string;
  status?: string;
  passengerName?: string;
  passengerImage?: string;
  passengerRating?: string;
  vehicleType?: string;
  price?: string;
  pLat?: string;
  pLng?: string;
  pName?: string;
  dLat?: string;
  dLng?: string;
  dName?: string;
  drLat?: string;
  drLng?: string;
};

const STORAGE_KEY = 'nexgo.driver.latestNavigation';

export async function saveDriverActiveRide(params: DriverActiveRideParams): Promise<void> {
  if (!params?.id) return;

  try {
    const payload: StoredPayload<DriverActiveRideParams> = {
      params,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[ActiveRideStorage] Failed to save driver navigation', error);
  }
}

export async function loadDriverActiveRide(): Promise<DriverActiveRideParams | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredPayload<DriverActiveRideParams> | DriverActiveRideParams;
    if (!parsed) return null;

    if ('params' in parsed) {
      return parsed.params ?? null;
    }

    return parsed as DriverActiveRideParams;
  } catch (error) {
    console.warn('[ActiveRideStorage] Failed to load driver navigation', error);
    return null;
  }
}

export async function clearDriverActiveRide(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[ActiveRideStorage] Failed to clear driver navigation', error);
  }
}
