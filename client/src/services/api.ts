// API service for device, sensor and alert endpoints
const API_BASE_URL = 'http://localhost:3000/api';

// API service for device, sensor and alert endpoints
// Type definitions
export interface Device {
  _id: string;
  deviceId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  healthScore: number;
  failureRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  lastUpdate: string;
  lastPrediction: string;
  alertThresholds: {
    temperatureMax: number;
    vibrationMax: number;
    pressureMax: number;
    healthScoreMin: number;
  };
}

export interface SensorData {
  _id: string;
  deviceId: string;
  timestamp: string;
  temperature: number;
  vibration: number;
  pressure: number;
}

export interface Alert {
  _id: string;
  deviceId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  triggerType: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface DeviceHealth {
  deviceId: string;
  healthScore: number;
  failureRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  prediction: string;
  lastUpdate: string;
}

// Device API
export const deviceAPI = {
  getAll: async (): Promise<Device[]> => {
    const response = await fetch(`${API_BASE_URL}/devices`);
    if (!response.ok) throw new Error('Failed to fetch devices');
    const result = await response.json();
    // Handle both direct array and wrapped response format
    return Array.isArray(result) ? result : (result.data || []);
  },

  getById: async (deviceId: string): Promise<Device> => {
    const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`);
    if (!response.ok) throw new Error(`Failed to fetch device ${deviceId}`);
    return response.json();
  },

  getHealth: async (deviceId: string): Promise<DeviceHealth> => {
    const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/health`);
    if (!response.ok) throw new Error(`Failed to fetch health for ${deviceId}`);
    return response.json();
  },

  create: async (device: Omit<Device, '_id'>): Promise<Device> => {
    const response = await fetch(`${API_BASE_URL}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device),
    });
    if (!response.ok) throw new Error('Failed to create device');
    return response.json();
  },

  update: async (deviceId: string, data: Partial<Device>): Promise<Device> => {
    const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to update device ${deviceId}`);
    return response.json();
  },
};

// Sensor Data API
export const sensorAPI = {
  getByDevice: async (
    deviceId: string,
    range: '15m' | '1h' | '24h' | '7d' = '1h'
  ): Promise<SensorData[]> => {
    const response = await fetch(`${API_BASE_URL}/sensors/${deviceId}?range=${range}`);
    if (!response.ok) throw new Error(`Failed to fetch sensor data for ${deviceId}`);
    const result = await response.json();
    // Handle both direct array and wrapped response format
    return Array.isArray(result) ? result : (result.data || []);
  },

  getStats: async (deviceId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/sensors/${deviceId}/stats`);
    if (!response.ok) throw new Error(`Failed to fetch sensor stats for ${deviceId}`);
    return response.json();
  },
};

// Alert API
export const alertAPI = {
  getAll: async (): Promise<Alert[]> => {
    const response = await fetch(`${API_BASE_URL}/alerts`);
    if (!response.ok) throw new Error('Failed to fetch alerts');
    const result = await response.json();
    // Handle both direct array and wrapped response format
    return Array.isArray(result) ? result : (result.data || []);
  },

  getByDevice: async (deviceId: string): Promise<Alert[]> => {
    const response = await fetch(`${API_BASE_URL}/alerts/device/${deviceId}`);
    if (!response.ok) throw new Error(`Failed to fetch alerts for ${deviceId}`);
    const result = await response.json();
    // Handle both direct array and wrapped response format
    return Array.isArray(result) ? result : (result.data || []);
  },

  acknowledge: async (alertId: string): Promise<Alert> => {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to acknowledge alert ${alertId}`);
    return response.json();
  },

  resolve: async (alertId: string): Promise<Alert> => {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to resolve alert ${alertId}`);
    return response.json();
  },
};

export default { deviceAPI, sensorAPI, alertAPI };
