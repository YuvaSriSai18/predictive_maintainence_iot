// WebSocket server setup for real-time communication
import { Server } from 'socket.io';

let io = null;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`✓ Client connected: ${socket.id}`);

    socket.on('subscribe:device', (deviceId) => {
      socket.join(`device:${deviceId}`);
      console.log(`✓ Client subscribed to device: ${deviceId}`);
    });

    socket.on('unsubscribe:device', (deviceId) => {
      socket.leave(`device:${deviceId}`);
      console.log(`✓ Client unsubscribed from device: ${deviceId}`);
    });

    socket.on('subscribe:alerts', () => {
      socket.join('alerts');
      console.log(`✓ Client subscribed to all alerts`);
    });

    socket.on('disconnect', () => {
      console.log(`✗ Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => io;

export const emitSensorUpdate = (deviceId, sensorData) => {
  if (io) {
    io.to(`device:${deviceId}`).emit('sensor:update', {
      deviceId,
      timestamp: new Date(),
      data: sensorData,
    });
  }
};

export const emitDeviceHealth = (deviceId, healthData) => {
  if (io) {
    io.to(`device:${deviceId}`).emit('device:health', {
      deviceId,
      timestamp: new Date(),
      ...healthData,
    });
  }
};

export const emitDeviceHealthBroadcast = (deviceId, healthData) => {
  if (io) {
    io.emit('device:health', {
      deviceId,
      timestamp: new Date(),
      ...healthData,
    });
  }
};

export const emitAlert = (alert) => {
  if (io) {
    io.to('alerts').emit('alert:new', {
      _id: alert._id,
      deviceId: alert.deviceId,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp,
      triggerType: alert.triggerType,
    });

    io.to(`device:${alert.deviceId}`).emit('alert:new', {
      _id: alert._id,
      deviceId: alert.deviceId,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp,
      triggerType: alert.triggerType,
    });
  }
};

export const emitAlertAcknowledged = (alertId, deviceId) => {
  if (io) {
    io.to('alerts').emit('alert:acknowledged', {
      _id: alertId,
      deviceId,
      timestamp: new Date(),
    });
  }
};

export const emitAlertResolved = (alertId, deviceId) => {
  if (io) {
    io.to('alerts').emit('alert:resolved', {
      _id: alertId,
      deviceId,
      timestamp: new Date(),
    });
  }
};

export const getConnectedClients = () => {
  return io ? io.engine.clientsCount : 0;
};
