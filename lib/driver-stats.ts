import { API_BASE_URL, parseApiResponse } from '@/lib/api';

type DriverRide = {
  id: string;
  status: string;
  price?: number;
  requestedAt?: string;
  completedAt?: string | null;
};

type DriverReviewRide = DriverRide & {
  review?: {
    rating?: number;
    status?: string;
  } | null;
};

export type DriverActivity = {
  id: string;
  status: string;
  amount: number;
  dateLabel: string;
};

export type DriverStats = {
  totalRides: number;
  completedRides: number;
  activeRides: number;
  todayEarnings: number;
  availableBalance: number;
  pendingPayout: number;
  averageRating: number | null;
  reviewCount: number;
  weeklyEarnings: number[];
  nextSettlementLabel: string;
  recentActivities: DriverActivity[];
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatLkr(value: number) {
  if (!Number.isFinite(value)) return 'LKR 0';
  return `LKR ${Math.round(value).toLocaleString()}`;
}

export function formatRating(value: number | null) {
  return value === null ? 'New' : value.toFixed(1);
}

function getRideDate(ride: DriverRide) {
  const rawDate = ride.completedAt || ride.requestedAt;
  const date = rawDate ? new Date(rawDate) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function isSameLocalDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatActivityDate(date: Date | null) {
  if (!date) return 'Recent';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNextFridaySettlement() {
  const now = new Date();
  const daysUntilFriday = (5 - now.getDay() + 7) % 7;
  const settlementDate = new Date(now);
  settlementDate.setDate(now.getDate() + daysUntilFriday);

  return `${DAY_LABELS[settlementDate.getDay()]}, 6:00 PM`;
}

export async function fetchDriverStats(token: string): Promise<DriverStats> {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Cache-Control': 'no-cache',
  };

  const [ridesResponse, reviewsResponse, sessionResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/rides/driver-rides?refresh=${Date.now()}`, { headers }),
    fetch(`${API_BASE_URL}/rides/driver-reviews?refresh=${Date.now()}`, { headers }),
    fetch(`${API_BASE_URL}/driver-auth/session?refresh=${Date.now()}`, { headers }),
  ]);

  const ridesData = await parseApiResponse<{ rides?: DriverRide[] }>(ridesResponse);
  const reviewsData = await parseApiResponse<{ reviews?: DriverReviewRide[]; rides?: DriverReviewRide[] }>(reviewsResponse);
  const sessionData = await parseApiResponse<{ driver?: { totalCashedOut?: number } }>(sessionResponse);

  const rides = ridesData.rides ?? [];
  const reviewedRides = (reviewsData.reviews ?? reviewsData.rides ?? []).filter(
    (ride) => ride.review?.status === 'approved' && Number.isFinite(Number(ride.review?.rating))
  );
  const ratings = reviewedRides.map((ride) => Number(ride.review?.rating));
  const now = new Date();
  const weeklyEarnings = Array.from({ length: 7 }, () => 0);

  const completedRides = rides.filter((ride) => ride.status === 'Completed');
  const activeRides = rides.filter((ride) => ride.status === 'Accepted' || ride.status === 'InProgress');
  const recentActivities = rides
    .slice()
    .sort((first, second) => {
      const firstDate = getRideDate(first);
      const secondDate = getRideDate(second);
      return (secondDate?.getTime() ?? 0) - (firstDate?.getTime() ?? 0);
    })
    .slice(0, 4)
    .map((ride) => ({
      id: ride.id,
      status: ride.status,
      amount: Number(ride.price) || 0,
      dateLabel: formatActivityDate(getRideDate(ride)),
    }));

  completedRides.forEach((ride) => {
    const rideDate = getRideDate(ride);
    if (!rideDate) return;
    weeklyEarnings[rideDate.getDay()] += Number(ride.price) || 0;
  });

  return {
    totalRides: rides.length,
    completedRides: completedRides.length,
    activeRides: activeRides.length,
    todayEarnings: completedRides
      .filter((ride) => {
        const rideDate = getRideDate(ride);
        return rideDate ? isSameLocalDay(rideDate, now) : false;
      })
      .reduce((sum, ride) => sum + (Number(ride.price) || 0), 0),
    availableBalance: Math.max(0, completedRides.reduce((sum, ride) => sum + (Number(ride.price) || 0), 0) - (sessionData.driver?.totalCashedOut || 0)),
    pendingPayout: activeRides.reduce((sum, ride) => sum + (Number(ride.price) || 0), 0),
    averageRating: ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : null,
    reviewCount: ratings.length,
    weeklyEarnings,
    nextSettlementLabel: getNextFridaySettlement(),
    recentActivities,
  };
}
