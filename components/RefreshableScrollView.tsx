import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, type ScrollViewProps } from 'react-native';

const REFRESH_TINT = '#008080';

type RefreshableScrollViewProps = ScrollViewProps & {
  onRefreshPage?: () => Promise<void> | void;
};

export default function RefreshableScrollView({
  children,
  onRefreshPage,
  refreshControl,
  ...props
}: RefreshableScrollViewProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await onRefreshPage?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefreshPage]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        refreshControl ?? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[REFRESH_TINT]}
            tintColor={REFRESH_TINT}
          />
        )
      }
      {...props}>
      {children}
    </ScrollView>
  );
}
