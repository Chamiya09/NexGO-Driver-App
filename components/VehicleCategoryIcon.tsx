import React from 'react';
import { Image, ImageSourcePropType, StyleSheet } from 'react-native';

type VehicleCategory = 'Bike' | 'Tuk' | 'TukTuk' | 'Mini' | 'Car' | 'Sedan' | 'Van';

const vehicleMarkerImages: Record<VehicleCategory | 'Default', ImageSourcePropType> = {
  Bike: require('../assets/images/vehicle-markers/bike-top.png'),
  Tuk: require('../assets/images/vehicle-markers/tuk-top.png'),
  TukTuk: require('../assets/images/vehicle-markers/tuk-top.png'),
  Mini: require('../assets/images/vehicle-markers/mini-top.png'),
  Car: require('../assets/images/vehicle-markers/car-top.png'),
  Sedan: require('../assets/images/vehicle-markers/car-top.png'),
  Van: require('../assets/images/vehicle-markers/van-top.png'),
  Default: require('../assets/images/vehicle-markers/car-top.png'),
};

export function VehicleCategoryIcon({
  category,
  size = 30,
  active = false,
}: {
  category?: string | null;
  size?: number;
  active?: boolean;
}) {
  const source = vehicleMarkerImages[normalizeVehicleCategory(category) || 'Default'];

  return (
    <Image
      source={source}
      style={[
        styles.icon,
        {
          width: size,
          height: size,
          opacity: active ? 1 : 0.88,
        },
      ]}
    />
  );
}

function normalizeVehicleCategory(category?: string | null): VehicleCategory | null {
  const value = String(category || '').trim().toLowerCase();

  if (value === 'bike' || value === 'motorbike') return 'Bike';
  if (value === 'tuk' || value === 'tuktuk' || value === 'threewheel') return 'Tuk';
  if (value === 'mini') return 'Mini';
  if (value === 'car' || value === 'sedan') return 'Car';
  if (value === 'van') return 'Van';
  return null;
}

const styles = StyleSheet.create({
  icon: {
    resizeMode: 'contain',
  },
});
