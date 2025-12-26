// Socket.IO service for real-time communication
import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;

// Initialize Socket.IO connection
export const initSocket = (): Socket => {
  if (socket) return socket;

  socket = io(SOCKET_SERVER_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket.IO disconnected');
  });

  socket.on('error', (error) => {
    console.error('❌ Socket.IO error:', error);
  });

  return socket;
};

// Get socket instance (initialize if not exists)
export const getSocket = (): Socket => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

// Disconnect socket
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Check if socket is connected
export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};

// Listen to sensor updates
export const onSensorUpdate = (
  callback: (data: {
    deviceId: string;
    temperature: number;
    vibration: number;
    pressure: number;
    timestamp: string;
  }) => void
): (() => void) => {
  const socketInstance = getSocket();
  socketInstance.on('sensor:update', callback);

  // Return unsubscribe function
  return () => {
    socketInstance.off('sensor:update', callback);
  };
};

// Listen to device health updates
export const onDeviceHealth = (
  callback: (data: {
    deviceId: string;
    healthScore: number;
    failureRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    timestamp: string;
  }) => void
): (() => void) => {
  const socketInstance = getSocket();
  socketInstance.on('device:health', callback);

  return () => {
    socketInstance.off('device:health', callback);
  };
};

// Listen to new alerts
export const onNewAlert = (
  callback: (data: {
    _id: string;
    deviceId: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    createdAt: string;
  }) => void
): (() => void) => {
  const socketInstance = getSocket();
  socketInstance.on('alert:new', callback);

  return () => {
    socketInstance.off('alert:new', callback);
  };
};

// Listen to alert acknowledgments
export const onAlertAcknowledged = (
  callback: (data: { alertId: string; deviceId: string }) => void
): (() => void) => {
  const socketInstance = getSocket();
  socketInstance.on('alert:acknowledged', callback);

  return () => {
    socketInstance.off('alert:acknowledged', callback);
  };
};

// Listen to alert resolutions
export const onAlertResolved = (
  callback: (data: { alertId: string; deviceId: string }) => void
): (() => void) => {
  const socketInstance = getSocket();
  socketInstance.on('alert:resolved', callback);

  return () => {
    socketInstance.off('alert:resolved', callback);
  };
};

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  isSocketConnected,
  onSensorUpdate,
  onDeviceHealth,
  onNewAlert,
  onAlertAcknowledged,
  onAlertResolved,
};
