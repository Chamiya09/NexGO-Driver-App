import { Platform } from 'react-native';

const OPEN_STREET_MAP_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const CARTO_LIGHT_TILE_URL = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

// Some Android devices/providers aggressively rate-limit or block direct OSM tile usage
// from app clients. Use a more app-tolerant raster source there while keeping OSM on iOS.
export const MAP_TILE_URL_TEMPLATE =
  Platform.OS === 'android' ? CARTO_LIGHT_TILE_URL : OPEN_STREET_MAP_TILE_URL;

export const MAP_TILE_USER_AGENT = 'NexGO-Driver/1.0';
