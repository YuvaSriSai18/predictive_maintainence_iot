// Device routes for CRUD operations
import express from 'express';
import Device from '../models/Device.model.js';
import { generateHealthPrediction } from '../services/prediction.service.js';
import { getRecentSensorData } from '../services/ingestion.service.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const devices = await Device.find(
      {},
      {
        deviceId: 1,
        name: 1,
        status: 1,
        location: 1,
        healthScore: 1,
        failureRisk: 1,
        lastUpdate: 1,
      }
    ).sort({ lastUpdate: -1 });

    res.json({
      success: true,
      count: devices.length,
      data: devices,
    });
  } catch (error) {
    console.error('✗ GET /devices error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch devices',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findOne({ deviceId: id });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    res.json({
      success: true,
      data: device,
    });
  } catch (error) {
    console.error('✗ GET /devices/:id error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device',
    });
  }
});

router.get('/:id/health', async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findOne({ deviceId: id });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    // Generate fresh prediction
    const prediction = await generateHealthPrediction(id);

    if (!prediction) {
      return res.status(400).json({
        success: false,
        error: 'No recent sensor data available',
      });
    }

    res.json({
      success: true,
      data: {
        deviceId: id,
        healthScore: prediction.healthScore,
        failureRisk: prediction.failureRisk,
        reason: prediction.reason,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('✗ GET /devices/:id/health error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate health',
    });
  }
});

// POST create or update device
router.post('/', async (req, res) => {
  try {
    const { deviceId, name, status, location, alertThresholds } = req.body;

    if (!deviceId || !name) {
      return res.status(400).json({
        success: false,
        error: 'deviceId and name are required',
      });
    }

    let device = await Device.findOne({ deviceId });

    if (device) {
      // Update existing device
      device.name = name || device.name;
      device.status = status || device.status;
      device.location = location || device.location;
      if (alertThresholds) {
        device.alertThresholds = { ...device.alertThresholds, ...alertThresholds };
      }
      device.updatedAt = new Date();
    } else {
      // Create new device
      device = new Device({
        deviceId,
        name,
        status,
        location,
        alertThresholds,
      });
    }

    await device.save();

    res.status(201).json({
      success: true,
      message: 'Device saved successfully',
      data: device,
    });
  } catch (error) {
    console.error('✗ POST /devices error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to save device',
    });
  }
});

// PUT update device status
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const device = await Device.findOneAndUpdate(
      { deviceId: id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    res.json({
      success: true,
      message: 'Device updated successfully',
      data: device,
    });
  } catch (error) {
    console.error('✗ PUT /devices/:id error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update device',
    });
  }
});

// DELETE device
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Device.deleteOne({ deviceId: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    res.json({
      success: true,
      message: 'Device deleted successfully',
    });
  } catch (error) {
    console.error('✗ DELETE /devices/:id error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete device',
    });
  }
});

export default router;
