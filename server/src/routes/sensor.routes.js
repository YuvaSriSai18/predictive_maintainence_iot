// Sensor data retrieval routes
import express from 'express';
import SensorData from '../models/SensorData.model.js';
import { getRecentSensorData, calculateAggregateStats, saveSensorData } from '../services/ingestion.service.js';

const router = express.Router();

const parseTimeRange = (range) => {
  const match = range?.match(/(\d+)([mhd])/);
  if (!match) return 15; // default 15 minutes

  const [_, value, unit] = match;
  const num = parseInt(value, 10);

  const unitMap = {
    m: 1,
    h: 60,
    d: 1440,
  };

  return num * (unitMap[unit] || 1);
};

// GET recent sensor data for a device
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { range = '15m', limit = 100 } = req.query;

    const timeRangeMinutes = parseTimeRange(range);

    const data = await getRecentSensorData(deviceId, timeRangeMinutes);

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No sensor data found',
      });
    }

    res.json({
      success: true,
      count: data.length,
      deviceId,
      timeRange: range,
      data: data.slice(0, parseInt(limit, 10)),
    });
  } catch (error) {
    console.error('✗ GET /sensors/:deviceId error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor data',
    });
  }
});

// GET aggregated sensor statistics
router.get('/:deviceId/stats', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { range = '15m' } = req.query;

    const timeRangeMinutes = parseTimeRange(range);

    const stats = await calculateAggregateStats(deviceId, timeRangeMinutes);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'No sensor data for statistics',
      });
    }

    res.json({
      success: true,
      deviceId,
      timeRange: range,
      data: stats,
    });
  } catch (error) {
    console.error('✗ GET /sensors/:deviceId/stats error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

// POST new sensor reading (for manual testing)
router.post('/', async (req, res) => {
  try {
    const { deviceId, temperature, vibration, pressure, timestamp } = req.body;

    if (!deviceId || temperature === undefined || vibration === undefined || pressure === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: deviceId, temperature, vibration, pressure',
      });
    }

    const sensorData = await saveSensorData({
      deviceId,
      temperature,
      vibration,
      pressure,
      timestamp,
    });

    res.status(201).json({
      success: true,
      message: 'Sensor data recorded',
      data: sensorData,
    });
  } catch (error) {
    console.error('✗ POST /sensors error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to save sensor data',
    });
  }
});

export default router;
