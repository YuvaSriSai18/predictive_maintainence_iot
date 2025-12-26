// Device health prediction and analysis
import { analyzeDeviceHealth } from '../config/openai.js';
import Device from '../models/Device.model.js';
import SensorData from '../models/SensorData.model.js';
import {
  isPredictionCacheValid,
  getCachedPrediction,
  cachePrediction,
  getRecentSensorData,
  calculateAggregateStats,
} from './ingestion.service.js';

export const generateHealthPrediction = async (deviceId) => {
  try {
    if (isPredictionCacheValid(deviceId)) {
      console.log(`✓ Using cached prediction for ${deviceId}`);
      return getCachedPrediction(deviceId);
    }


    const recentData = await getRecentSensorData(deviceId, 15);

    if (!recentData || recentData.length === 0) {
      console.warn(`⚠ No recent sensor data for ${deviceId}`);
      return null;
    }

    // Calculate aggregate statistics
    const stats = await calculateAggregateStats(deviceId, 15);

    // Prepare data for AI analysis
    const analysisData = {
      deviceId,
      avgTemperature: stats?.avgTemperature || 0,
      maxTemperature: stats?.maxTemperature || 0,
      minTemperature: stats?.minTemperature || 0,
      avgVibration: stats?.avgVibration || 0,
      maxVibration: stats?.maxVibration || 0,
      minVibration: stats?.minVibration || 0,
      avgPressure: stats?.avgPressure || 0,
      maxPressure: stats?.maxPressure || 0,
      minPressure: stats?.minPressure || 0,
      sampleCount: stats?.sampleCount || 0,
      recentReadings: recentData.slice(0, 5).map((d) => ({
        temperature: d.temperature,
        vibration: d.vibration,
        pressure: d.pressure,
        timestamp: d.timestamp,
      })),
    };

    // Get AI analysis
    const analysis = await analyzeDeviceHealth(analysisData);

    // Cache the prediction
    cachePrediction(deviceId, analysis);

    // Update device with latest prediction
    await Device.updateOne(
      { deviceId },
      {
        healthScore: analysis.healthScore,
        failureRisk: analysis.failureRisk,
        lastPrediction: {
          timestamp: new Date(),
          healthScore: analysis.healthScore,
          failureRisk: analysis.failureRisk,
          reason: analysis.reason,
        },
        lastUpdate: new Date(),
      },
      { upsert: true }
    );

    return analysis;
  } catch (error) {
    console.error('✗ Prediction generation error:', error.message);

    // Return fallback prediction
    return {
      healthScore: 70,
      failureRisk: 'MEDIUM',
      reason: 'Unable to generate prediction - check API and data',
    };
  }
};

export const predictMultipleDevices = async (deviceIds) => {
  try {
    const predictions = await Promise.all(
      deviceIds.map((deviceId) => generateHealthPrediction(deviceId))
    );

    return predictions.filter((p) => p !== null);
  } catch (error) {
    console.error('✗ Batch prediction error:', error.message);
    throw error;
  }
};

export const getDeviceHealthTrend = async (deviceId, timeRangeMinutes = 60) => {
  try {
    const since = new Date(Date.now() - timeRangeMinutes * 60 * 1000);

    // Get all devices for trend analysis
    const readings = await SensorData.aggregate([
      {
        $match: {
          deviceId,
          timestamp: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%dT%H:%M:00Z',
              date: '$timestamp',
            },
          },
          avgTemperature: { $avg: '$temperature' },
          avgVibration: { $avg: '$vibration' },
          avgPressure: { $avg: '$pressure' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return readings;
  } catch (error) {
    console.error('✗ Health trend error:', error.message);
    throw error;
  }
};

export const detectAnomalies = async (deviceId, threshold = 2.5) => {
  try {
    const recentData = await getRecentSensorData(deviceId, 30);

    if (recentData.length < 5) {
      return [];
    }

    const stats = await calculateAggregateStats(deviceId, 30);

    const anomalies = recentData.filter((reading) => {
      const tempDiff = Math.abs(reading.temperature - (stats?.avgTemperature || 0));
      const vibrationDiff = Math.abs(reading.vibration - (stats?.avgVibration || 0));
      const pressureDiff = Math.abs(reading.pressure - (stats?.avgPressure || 0));

      const tempStdDev = stats?.avgTemperature ? tempDiff / (stats.avgTemperature * 0.1) : 0;
      const vibrationStdDev = stats?.avgVibration ? vibrationDiff / (stats.avgVibration * 0.1) : 0;
      const pressureStdDev = stats?.avgPressure ? pressureDiff / (stats.avgPressure * 0.1) : 0;

      return tempStdDev > threshold || vibrationStdDev > threshold || pressureStdDev > threshold;
    });

    return anomalies;
  } catch (error) {
    console.error('✗ Anomaly detection error:', error.message);
    throw error;
  }
};
