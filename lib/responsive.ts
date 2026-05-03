import { useWindowDimensions } from 'react-native';

export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const shortestSide = Math.min(width, height);
  const isTinyPhone = shortestSide < 360;
  const isCompactPhone = shortestSide < 390;
  const isTablet = shortestSide >= 768;

  return {
    width,
    height,
    fontScale,
    isTinyPhone,
    isCompactPhone,
    isTablet,
    screenPadding: isTinyPhone ? 12 : isTablet ? 24 : 16,
    cardPadding: isTinyPhone ? 12 : isTablet ? 20 : 16,
    modalPadding: isTinyPhone ? 14 : 20,
    metricMinWidth: isTinyPhone ? 96 : 118,
  };
}
