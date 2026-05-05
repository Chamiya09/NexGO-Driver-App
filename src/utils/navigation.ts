import * as geolib from 'geolib';

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type DriverRideStage = 'TO_PICKUP' | 'IN_TRANSIT';

export function safeBearing(previous: LatLng | null, current: LatLng, fallback: number): number {
  if (!previous) return fallback;

  const metersMoved = geolib.getDistance(previous, current);
  if (metersMoved < 2) return fallback;

  const bearing = geolib.getGreatCircleBearing(previous, current);
  return Number.isFinite(bearing) ? bearing : fallback;
}

export function sliceRemainingPolyline(route: LatLng[], current: LatLng): LatLng[] {
  if (!route.length) return [];
  const nearest = geolib.findNearest(current, route) as LatLng;
  const distance = geolib.getDistance(current, nearest);

  if (distance > 50) return route;

  const nearestIndex = route.findIndex(
    (point) => point.latitude === nearest.latitude && point.longitude === nearest.longitude
  );

  if (nearestIndex < 0) return route;
  return route.slice(nearestIndex);
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;

  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}
