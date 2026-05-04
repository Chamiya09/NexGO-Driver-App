import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

export type OsmLatLng = {
  latitude: number;
  longitude: number;
};

export type OsmRegion = OsmLatLng & {
  latitudeDelta?: number;
  longitudeDelta?: number;
};

export type OsmMarker = {
  id: string;
  coordinate: OsmLatLng;
  color?: string;
  iconUri?: string;
  label?: string;
  title?: string;
  heading?: number;
  kind?: 'pin' | 'dot' | 'vehicle' | 'label';
  zIndex?: number;
};

export type OsmPolyline = {
  id: string;
  coordinates: OsmLatLng[];
  color?: string;
  width?: number;
  opacity?: number;
};

export type CustomOsmMapRef = {
  animateToRegion: (region: OsmRegion, duration?: number) => void;
  animateCamera: (
    camera: { center?: OsmLatLng; zoom?: number; heading?: number; pitch?: number; altitude?: number },
    options?: { duration?: number }
  ) => void;
  fitToCoordinates: (
    coordinates: OsmLatLng[],
    options?: { edgePadding?: { top?: number; right?: number; bottom?: number; left?: number }; animated?: boolean }
  ) => void;
};

type Props = {
  style?: StyleProp<ViewStyle>;
  initialRegion: OsmRegion;
  markers?: OsmMarker[];
  polylines?: OsmPolyline[];
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  onMapReady?: () => void;
  onPanDrag?: () => void;
  onPress?: () => void;
  onMarkerPress?: (markerId: string) => void;
  onRegionChangeComplete?: (region: OsmRegion) => void;
};

const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

function regionToZoom(region: OsmRegion) {
  const delta = Math.max(region.latitudeDelta ?? 0.05, region.longitudeDelta ?? 0.05);
  return Math.max(3, Math.min(18, Math.round(Math.log2(360 / delta))));
}

function toLeafletPoint(point: OsmLatLng): [number, number] {
  return [point.latitude, point.longitude];
}

function buildHtml(initialRegion: OsmRegion) {
  const center = JSON.stringify(toLeafletPoint(initialRegion));
  const zoom = regionToZoom(initialRegion);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #EAE6DF; }
    .leaflet-control-attribution { display: none; }
    .osm-attribution {
      position: absolute; right: 6px; bottom: 4px; z-index: 999;
      background: rgba(255,255,255,.86); color: #2f4f4d;
      padding: 2px 6px; border-radius: 5px; font: 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .pin {
      width: 24px; height: 24px; border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg); border: 2px solid #fff;
      box-shadow: 0 3px 10px rgba(0,0,0,.28);
    }
    .dot {
      width: 22px; height: 22px; border-radius: 999px; border: 3px solid #fff;
      box-shadow: 0 3px 10px rgba(0,0,0,.28);
    }
    .vehicle {
      width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center;
      color: #fff; border: 3px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,.28);
      font-size: 18px; line-height: 1; font-weight: 900;
    }
    .vehicle-icon {
      width: 42px; height: 42px; display: grid; place-items: center;
      filter: drop-shadow(0 5px 8px rgba(0,0,0,.24));
    }
    .vehicle-icon img {
      width: 34px; height: 34px; object-fit: contain; display: block;
    }
    .label {
      max-width: 190px; display: flex; align-items: center; gap: 6px;
      background: #fff; color: #123532; border-radius: 18px; padding: 6px 10px;
      box-shadow: 0 3px 10px rgba(0,0,0,.18); font: 700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .label-dot { width: 8px; height: 8px; border-radius: 999px; flex: 0 0 auto; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="osm-attribution">${OSM_ATTRIBUTION}</div>
  <script>
    const map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true
    }).setView(${center}, ${zoom});

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true
    }).addTo(map);

    let markerLayer = L.layerGroup().addTo(map);
    let polylineLayer = L.layerGroup().addTo(map);
    let interactionEnabled = { scroll: true, zoom: true };

    function post(payload) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }

    function iconFor(marker) {
      const color = marker.color || '#169F95';
      const heading = Number(marker.heading || 0);
      const label = marker.label || marker.title || '';
      if (marker.kind === 'vehicle') {
        if (marker.iconUri) {
          return L.divIcon({
            className: '',
            html: '<div class="vehicle-icon" style="--marker-color:' + color + '"><img src="' + escapeHtml(marker.iconUri) + '" alt="' + escapeHtml(label || 'Vehicle') + '" style="transform: rotate(' + heading + 'deg)" /></div>',
            iconSize: [46, 46],
            iconAnchor: [23, 23]
          });
        }
        return L.divIcon({
          className: '',
          html: '<div class="vehicle" style="background:' + color + '; transform: rotate(' + heading + 'deg)">▲</div>',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
      }
      if (marker.kind === 'label') {
        return L.divIcon({
          className: '',
          html: '<div class="label"><span class="label-dot" style="background:' + color + '"></span><span>' + escapeHtml(label) + '</span></div>',
          iconSize: [190, 34],
          iconAnchor: [95, 34]
        });
      }
      if (marker.kind === 'dot') {
        return L.divIcon({ className: '', html: '<div class="dot" style="background:' + color + '"></div>', iconSize: [28, 28], iconAnchor: [14, 14] });
      }
      return L.divIcon({ className: '', html: '<div class="pin" style="background:' + color + '"></div>', iconSize: [30, 30], iconAnchor: [15, 28] });
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, function(char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
      });
    }

    function applyData(data) {
      markerLayer.clearLayers();
      polylineLayer.clearLayers();

      (data.polylines || []).forEach(function(line) {
        if (!line.coordinates || line.coordinates.length < 2) return;
        L.polyline(line.coordinates.map(function(p) { return [p.latitude, p.longitude]; }), {
          color: line.color || '#169F95',
          weight: line.width || 5,
          opacity: line.opacity == null ? 0.9 : line.opacity,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(polylineLayer);
      });

      (data.markers || []).forEach(function(marker) {
        const item = L.marker([marker.coordinate.latitude, marker.coordinate.longitude], {
          icon: iconFor(marker),
          zIndexOffset: marker.zIndex || 0
        }).addTo(markerLayer);
        if (marker.title && marker.kind !== 'label') item.bindPopup(escapeHtml(marker.title));
        item.on('click', function(event) {
          L.DomEvent.stopPropagation(event);
          post({ type: 'markerPress', id: marker.id });
        });
      });

      if (data.scrollEnabled === false) map.dragging.disable(); else map.dragging.enable();
      if (data.zoomEnabled === false) {
        map.touchZoom.disable(); map.scrollWheelZoom.disable(); map.doubleClickZoom.disable(); map.boxZoom.disable();
      } else {
        map.touchZoom.enable(); map.scrollWheelZoom.enable(); map.doubleClickZoom.enable(); map.boxZoom.enable();
      }
    }

    function currentRegion() {
      const center = map.getCenter();
      const bounds = map.getBounds();
      return {
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: Math.abs(bounds.getNorth() - bounds.getSouth()),
        longitudeDelta: Math.abs(bounds.getEast() - bounds.getWest())
      };
    }

    function handleCommand(command) {
      if (command.type === 'update') {
        applyData(command);
      }
      if (command.type === 'animateToRegion') {
        map.flyTo([command.region.latitude, command.region.longitude], command.zoom || map.getZoom(), { duration: (command.duration || 350) / 1000 });
      }
      if (command.type === 'animateCamera' && command.center) {
        map.flyTo([command.center.latitude, command.center.longitude], command.zoom || map.getZoom(), { duration: (command.duration || 350) / 1000 });
      }
      if (command.type === 'fitToCoordinates' && command.coordinates && command.coordinates.length) {
        const bounds = L.latLngBounds(command.coordinates.map(function(p) { return [p.latitude, p.longitude]; }));
        const pad = command.edgePadding || {};
        map.fitBounds(bounds, {
          animate: command.animated !== false,
          paddingTopLeft: [pad.left || 24, pad.top || 24],
          paddingBottomRight: [pad.right || 24, pad.bottom || 24]
        });
      }
    }

    map.on('dragstart', function() { post({ type: 'panDrag' }); });
    map.on('click', function() { post({ type: 'press' }); });
    map.on('moveend zoomend', function() { post({ type: 'regionChangeComplete', region: currentRegion() }); });

    window.document.addEventListener('message', function(event) { handleCommand(JSON.parse(event.data)); });
    window.addEventListener('message', function(event) { handleCommand(JSON.parse(event.data)); });
    setTimeout(function() { post({ type: 'ready' }); }, 250);
  </script>
</body>
</html>`;
}

export const CustomOsmMap = forwardRef<CustomOsmMapRef, Props>(function CustomOsmMap(
  {
    style,
    initialRegion,
    markers = [],
    polylines = [],
    scrollEnabled = true,
    zoomEnabled = true,
    onMapReady,
    onPanDrag,
    onPress,
    onMarkerPress,
    onRegionChangeComplete,
  },
  ref
) {
  const webViewRef = useRef<WebView>(null);
  const html = useMemo(() => buildHtml(initialRegion), []);

  const postCommand = useCallback((command: Record<string, unknown>) => {
    webViewRef.current?.postMessage(JSON.stringify(command));
  }, []);

  const syncData = useCallback(() => {
    postCommand({ type: 'update', markers, polylines, scrollEnabled, zoomEnabled });
  }, [markers, polylines, postCommand, scrollEnabled, zoomEnabled]);

  React.useEffect(() => {
    syncData();
  }, [syncData]);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration = 350) => {
      postCommand({ type: 'animateToRegion', region, duration, zoom: regionToZoom(region) });
    },
    animateCamera: (camera, options) => {
      postCommand({ type: 'animateCamera', ...camera, duration: options?.duration });
    },
    fitToCoordinates: (coordinates, options) => {
      postCommand({
        type: 'fitToCoordinates',
        coordinates,
        edgePadding: options?.edgePadding,
        animated: options?.animated,
      });
    },
  }), [postCommand]);

  return (
    <WebView
      ref={webViewRef}
      style={style}
      source={{ html }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      bounces={false}
      userAgent="NexGO/1.0 OSM Leaflet Mobile"
      onLoadEnd={syncData}
      onMessage={(event) => {
        const payload = JSON.parse(event.nativeEvent.data);
        if (payload.type === 'ready') {
          syncData();
          onMapReady?.();
        }
        if (payload.type === 'panDrag') onPanDrag?.();
        if (payload.type === 'press') onPress?.();
        if (payload.type === 'markerPress') onMarkerPress?.(String(payload.id));
        if (payload.type === 'regionChangeComplete') onRegionChangeComplete?.(payload.region);
      }}
    />
  );
});
