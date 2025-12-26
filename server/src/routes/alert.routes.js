// Alert management routes
import express from 'express';
import Alert from '../models/Alert.model.js';
import { acknowledgeAlert, resolveAlert, getActiveAlerts, getDeviceAlerts } from '../services/alert.service.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { status = 'all', deviceId, limit = 50 } = req.query;

    let filter = {};

    if (status !== 'all') {
      filter.status = status;
    }

    if (deviceId) {
      filter.deviceId = deviceId;
    }

    const alerts = await Alert.find(filter, null, {
      sort: { timestamp: -1 },
      limit: parseInt(limit, 10),
    });

    const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
    const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;

    res.json({
      success: true,
      count: alerts.length,
      criticalCount,
      warningCount,
      data: alerts,
    });
  } catch (error) {
    console.error('✗ GET /alerts error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
    });
  }
});


router.get('/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50 } = req.query;

    const alerts = await getDeviceAlerts(deviceId, parseInt(limit, 10));

    res.json({
      success: true,
      count: alerts.length,
      deviceId,
      data: alerts,
    });
  } catch (error) {
    console.error('✗ GET /alerts/device/:deviceId error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device alerts',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    console.error('✗ GET /alerts/:id error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert',
    });
  }
});


router.post('/:id/ack', async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy } = req.body;

    const alert = await acknowledgeAlert(id, acknowledgedBy);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      message: 'Alert acknowledged',
      data: alert,
    });
  } catch (error) {
    console.error('✗ POST /alerts/:id/ack error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
    });
  }
});

router.post('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await resolveAlert(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      message: 'Alert resolved',
      data: alert,
    });
  } catch (error) {
    console.error('✗ POST /alerts/:id/resolve error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Alert.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      message: 'Alert deleted',
    });
  } catch (error) {
    console.error('✗ DELETE /alerts/:id error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert',
    });
  }
});

export default router;
