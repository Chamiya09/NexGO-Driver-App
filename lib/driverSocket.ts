// lib/driverSocket.ts
// Singleton Socket.IO client for the Driver App.
// Import `driverSocket` wherever you need to emit or listen.

import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

const SOCKET_SERVER_URL = API_BASE_URL.replace(/\/api$/, '');
// Create a single persistent socket instance
const driverSocket: Socket = io(SOCKET_SERVER_URL, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: Infinity,
});

driverSocket.on('connect', () => {
  console.log('[DriverSocket] Connected:', driverSocket.id);
});

driverSocket.on('disconnect', (reason) => {
  console.log('[DriverSocket] Disconnected:', reason);
});

export default driverSocket;
