// Sensor data persistence and caching
import SensorData from '../models/SensorData.model.js';
import Device from '../models/Device.model.js';
import { ensureDeviceExists } from './device.service.js';
import { emitSensorUpdate, getIO } from '../sockets/realtime.socket.js';

const predictionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export const saveSensorData = async (sensorPayload) => {
  try {
    const { deviceId, temperature, vibration, pressure, timestamp } = sensorPayload;

    if (!deviceId || temperature === undefined || vibration === undefined || pressure === undefined) {
      throw new Error('Invalid sensor payload: missing required fields');
    }

    await ensureDeviceExists(deviceId);

    // Save to MongoDB time-series collection
    const sensorData = new SensorData({
      deviceId,
      temperature,
      vibration: vibration * 100,
      pressure,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    await sensorData.save();

    // Format and log timestamp
    const savedTime = sensorData.timestamp.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    console.log(`✓ [${savedTime}] Stored sensor data: ${deviceId} | Temp: ${temperature}°C | Vibration: ${(vibration * 100).toFixed(1)} | Pressure: ${pressure} bar`);

    // Update device's last update timestamp
    await Device.updateOne(
      { deviceId },
      { lastUpdate: new Date() },
      { upsert: true }
    );

    emitSensorUpdate(deviceId, {
      temperature,
      vibration: vibration * 100,
      pressure,
      timestamp: sensorData.timestamp.toISOString(),
    });

    return sensorData;
  } catch (error) {
    console.error('✗ Error saving sensor data:', error.message);
    throw error;
  }
};

export const getRecentSensorData = async (deviceId, timeRangeMinutes = 15) => {
  try {
    const since = new Date(Date.now() - timeRangeMinutes * 60 * 1000);

    const data = await SensorData.find(
      {
        deviceId,
        timestamp: { $gte: since },
      },
      null,
      { sort: { timestamp: -1 } }
    ).exec();

    return data;
  } catch (error) {
    console.error('✗ Error fetching sensor data:', error.message);
    throw error;
  }
};

export const calculateAggregateStats = async (deviceId, timeRangeMinutes = 15) => {
  try {
    const since = new Date(Date.now() - timeRangeMinutes * 60 * 1000);

    const stats = await SensorData.aggregate([
      {
        $match: {
          deviceId,
          timestamp: { $gte: since },
        },
      },
      {
        $group: {
          _id: '$deviceId',
          avgTemperature: { $avg: '$temperature' },
          maxTemperature: { $max: '$temperature' },
          minTemperature: { $min: '$temperature' },
          avgVibration: { $avg: '$vibration' },
          maxVibration: { $max: '$vibration' },
          minVibration: { $min: '$vibration' },
          avgPressure: { $avg: '$pressure' },
          maxPressure: { $max: '$pressure' },
          minPressure: { $min: '$pressure' },
          sampleCount: { $sum: 1 },
          latestTimestamp: { $max: '$timestamp' },
        },
      },
    ]);

    return stats[0] || null;
  } catch (error) {
    console.error('✗ Error calculating stats:', error.message);
    throw error;
  }
};

export const invalidatePredictionCache = (deviceId) => {
  predictionCache.delete(deviceId);
};

export const isPredictionCacheValid = (deviceId) => {
  if (!predictionCache.has(deviceId)) return false;

  const cached = predictionCache.get(deviceId);
  const isExpired = Date.now() - cached.timestamp > CACHE_TTL;

  if (isExpired) {
    predictionCache.delete(deviceId);
    return false;
  }

  return true;
};

export const getCachedPrediction = (deviceId) => {
  return predictionCache.get(deviceId)?.data || null;
};

export const cachePrediction = (deviceId, prediction) => {
  predictionCache.set(deviceId, {
    data: prediction,
    timestamp: Date.now(),
  });
};

export const getSensorHistory = async (deviceId, limit = 100) => {
  try {
    const data = await SensorData.find(
      { deviceId },
      null,
      { sort: { timestamp: -1 }, limit }
    ).exec();

    return data;
  } catch (error) {
    console.error('✗ Error fetching sensor history:', error.message);
    throw error;
  }
};
