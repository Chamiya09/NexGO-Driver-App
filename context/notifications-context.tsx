// context/notifications-context.tsx
// Shared store for incoming ride notifications.
// Allows both home.tsx (socket listener) and the Notifications screen
// to read and mutate the same notification list.

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export type RideNotification = {
  id: string;          // = rideId
  rideId: string;
  passengerId: string;
  passengerName: string;
  vehicleType: string;
  price: number;
  pickup: { latitude: number; longitude: number; name?: string };
  dropoff: { latitude: number; longitude: number; name?: string };
  distanceKm?: number;
  receivedAt: string;  // ISO timestamp
  read: boolean;
};

type NotificationsContextValue = {
  notifications: RideNotification[];
  unreadCount: number;
  addNotification: (n: Omit<RideNotification, 'receivedAt' | 'read' | 'id'>) => void;
  markAllRead: () => void;
  markRead: (rideId: string) => void;
  removeNotification: (rideId: string) => void;
  clearAll: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<RideNotification[]>([]);

  const addNotification = useCallback(
    (payload: Omit<RideNotification, 'receivedAt' | 'read' | 'id'>) => {
      setNotifications((prev) => {
        // De-duplicate by rideId — don't add the same ride twice
        if (prev.some((n) => n.rideId === payload.rideId)) return prev;
        return [
          {
            ...payload,
            id: payload.rideId,
            receivedAt: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ];
      });
    },
    []
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((rideId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.rideId === rideId ? { ...n, read: true } : n))
    );
  }, []);

  const removeNotification = useCallback((rideId: string) => {
    setNotifications((prev) => prev.filter((n) => n.rideId !== rideId));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, addNotification, markAllRead, markRead, removeNotification, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationsProvider');
  return ctx;
}
