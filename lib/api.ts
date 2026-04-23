import Constants from 'expo-constants';
import { Platform } from 'react-native';

const LOCAL_API_FALLBACK = 'http://localhost:5000/api';

function isPlaceholderApiUrl(value: string) {
  return value.includes('YOUR_LOCAL_IP') || value.includes('192.168.x.x');
}

export const getApiBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl && !isPlaceholderApiUrl(configuredUrl)) {
    return configuredUrl.replace(/\/$/, '');
  }

  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost;

  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    if (host) {
      return `http://${host}:5000/api`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return LOCAL_API_FALLBACK;
};

export const API_BASE_URL = getApiBaseUrl();

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  return data as T;
}
