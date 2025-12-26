// Sensor data persistence with batch processing
import SensorData from '../models/SensorData.model.js';
import Device from '../models/Device.model.js';
import Alert from '../models/Alert.model.js';
import { ensureDeviceExists } from './device.service.js';
import { emitSensorUpdate, emitAlert, getIO } from '../sockets/realtime.socket.js';

const predictionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// Batch processing queue
const sensorBatchQueue = new Map(); // deviceId -> array of readings
const BATCH_SIZE = 10; // Process every 10 readings
const BATCH_TIMEOUT = 30000; // Or every 30 seconds

// Process and save batched sensor data
export const saveSensorData = async (sensorPayload) => {
  try {
    const { deviceId, temperature, vibration, pressure, timestamp } = sensorPayload;

    if (!deviceId || temperature === undefined || vibration === undefined || pressure === undefined) {
      throw new Error('Invalid sensor payload: missing required fields');
    }

    // Auto-register device
    await ensureDeviceExists(deviceId);

    // Add to batch queue
    if (!sensorBatchQueue.has(deviceId)) {
      sensorBatchQueue.set(deviceId, []);
      // Schedule batch processing after timeout
      setTimeout(() => processBatch(deviceId), BATCH_TIMEOUT);
    }

    const batch = sensorBatchQueue.get(deviceId);
    batch.push({
      deviceId,
      temperature,
      vibration: vibration * 100,
      pressure,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    // Emit to frontend immediately (for real-time display)
    emitSensorUpdate(deviceId, {
      temperature,
      vibration: vibration * 100,
      pressure,
      timestamp: new Date().toISOString(),
    });

    // Process batch if size reached
    if (batch.length >= BATCH_SIZE) {
      await processBatch(deviceId);
    }

    return { queued: true, batchSize: batch.length };
  } catch (error) {
    console.error('✗ Batch queue error:', error.message);
    throw error;
  }
};

// Process batch of sensor data (bulk insert)
export const processBatch = async (deviceId) => {
  try {
    if (!sensorBatchQueue.has(deviceId)) return;

    const batch = sensorBatchQueue.get(deviceId);
    if (batch.length === 0) return;

    // Bulk insert to MongoDB
    const saved = await SensorData.insertMany(batch);

    // Format batch log with timestamp
    const batchTime = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    console.log(`✓ [${batchTime}] Batch processed: ${deviceId} | ${batch.length} records saved`);

    // Update device's last update timestamp
    await Device.updateOne(
      { deviceId },
      { lastUpdate: new Date() },
      { upsert: true }
    );

    // Clear processed batch
    sensorBatchQueue.delete(deviceId);

    return saved;
  } catch (error) {
    console.error(`✗ Batch processing error for ${deviceId}:`, error.message);
    throw error;
  }
};

// Flush all pending batches (for graceful shutdown)
export const flushAllBatches = async () => {
  try {
    const promises = [];
    for (const deviceId of sensorBatchQueue.keys()) {
      promises.push(processBatch(deviceId));
    }
    await Promise.all(promises);
    console.log(`✓ All batches flushed on shutdown`);
  } catch (error) {
    console.error('✗ Flush error:', error.message);
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
