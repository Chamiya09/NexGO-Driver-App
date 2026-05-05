<div align="center">
  <img src="./assets/images/Driver%20Dark%20App%20Logo.png" width="110" alt="NexGO Driver logo" />

# NexGO Driver

### Go online, accept rides, complete trips, and manage earnings.

[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=111111)](https://reactnative.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Live_Dispatch-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)

</div>

## Experience

`NexGO-Driver-App` is the driver workspace for onboarding, online availability, ride acceptance, trip execution, document management, ratings, support, and earnings.

## Feature Grid

| Area | Capabilities |
| --- | --- |
| Account | Register, login, session verification, logout |
| Driver Profile | Personal details, security, profile updates |
| Vehicle | Vehicle details and category management |
| Documents | License, insurance, registration uploads |
| Dispatch | Online status, live location, incoming ride requests |
| Trip Flow | Accept ride, arrive, verify code, start trip, complete trip |
| Work History | Trips, earnings, checkout, reviews |
| Help | Driver support tickets |

## Launch

```bash
npm install
cp .env.example .env
npm start
```

Set `.env`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000/api
```

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:5000/api
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Open Expo dev server |
| `npm run start:offline` | Start Expo in offline mode |
| `npm run android` | Launch Android target |
| `npm run ios` | Launch iOS target |
| `npm run web` | Launch web target |
| `npm run lint` | Run Expo linting |

## App Navigation

| Route | Screen |
| --- | --- |
| `/login` | Driver login |
| `/register` | Driver onboarding |
| `/(tabs)/home` | Dashboard, online status, ride requests |
| `/(tabs)/active-ride` | Current ride tab |
| `/ride-preview/[id]` | Incoming ride preview |
| `/active-ride/[id]` | Active ride lifecycle |
| `/(tabs)/trips` | Trip history |
| `/(tabs)/notifications` | Notifications |
| `/profile/*` | Details, vehicle, documents, earnings, reviews, support, security |

## Backend Contract

API base:

```text
http://<SERVER_HOST>:5000/api
```

Socket base:

```text
http://<SERVER_HOST>:5000
```

Main backend groups:

`/api/driver-auth`, `/api/rides`, `/api/reviews`, `/api/support-tickets`, `/api/upload`.

Realtime driver events:

`registerDriver`, `updateDriverLocation`, `toggle_online_status`, `acceptRide`, `driver_arrived`, `confirm_arrival_code`, `start_trip`, `complete_trip`.

## Device Notes

- Start `NexGO-BackEnd` first.
- Cloudinary must be configured for document uploads.
- Physical phones need your computer LAN IP, not `localhost`.
- Keep `EXPO_PUBLIC_API_URL` ending with `/api`.
- Location permission powers availability, dispatch, and ride matching.

