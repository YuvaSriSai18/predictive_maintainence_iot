// Alert creation and management logic
import Alert from '../models/Alert.model.js';
import Device from '../models/Device.model.js';

const alertQueues = new Map(); // Per-device alert deduplication

export const createAlert = async (deviceId, severity, message, triggerType, sensorReadings = null) => {
  try {
    // Check for duplicate alerts within 1 minute
    const existingAlert = await Alert.findOne(
      {
        deviceId,
        triggerType,
        status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
        createdAt: { $gte: new Date(Date.now() - 60000) }, // Last 1 minute
      },
      null,
      { sort: { createdAt: -1 } }
    );

    if (existingAlert) {
      console.log(`⚠ Duplicate alert suppressed for ${deviceId}: ${triggerType}`);
      return existingAlert;
    }

    const alert = new Alert({
      deviceId,
      severity,
      message,
      triggerType,
      sensorReadings,
      status: 'ACTIVE',
    });

    await alert.save();

    console.log(`🚨 Alert created for ${deviceId}: [${severity}] ${message}`);

    return alert;
  } catch (error) {
    console.error('✗ Error creating alert:', error.message);
    throw error;
  }
};

export const evaluateDeviceAlerts = async (deviceId, healthData) => {
  try {
    const device = await Device.findOne({ deviceId });

    if (!device) {
      console.warn(`⚠ Device ${deviceId} not found for alert evaluation`);
      return [];
    }

    const { healthScore, failureRisk } = healthData;
    const { temperature, vibration, pressure } = healthData.sensorReadings || {};

    const alerts = [];
    const thresholds = device.alertThresholds;

    // Check health score threshold
    if (healthScore < thresholds.healthScoreMin) {
      const alert = await createAlert(
        deviceId,
        'WARNING',
        `Device health score critically low: ${healthScore}%`,
        'HEALTH_SCORE',
        { temperature, vibration, pressure }
      );
      if (alert) alerts.push(alert);
    }

    // Check failure risk
    if (failureRisk === 'HIGH') {
      const alert = await createAlert(
        deviceId,
        'CRITICAL',
        `High failure risk detected`,
        'FAILURE_RISK',
        { temperature, vibration, pressure }
      );
      if (alert) alerts.push(alert);
    } else if (failureRisk === 'MEDIUM') {
      const alert = await createAlert(
        deviceId,
        'WARNING',
        `Medium failure risk detected`,
        'FAILURE_RISK',
        { temperature, vibration, pressure }
      );
      if (alert) alerts.push(alert);
    }

    // Temperature threshold
    if (temperature !== undefined && temperature > thresholds.temperature) {
      const alert = await createAlert(
        deviceId,
        temperature > thresholds.temperature + 10 ? 'CRITICAL' : 'WARNING',
        `Temperature exceeds threshold: ${temperature}°C`,
        'TEMPERATURE',
        { temperature, vibration, pressure }
      );
      if (alert) alerts.push(alert);
    }

    // Vibration threshold
    if (vibration !== undefined && vibration > thresholds.vibration) {
      const alert = await createAlert(
        deviceId,
        vibration > thresholds.vibration + 0.2 ? 'CRITICAL' : 'WARNING',
        `Vibration exceeds threshold: ${vibration}`,
        'VIBRATION',
        { temperature, vibration, pressure }
      );
      if (alert) alerts.push(alert);
    }

    // Pressure threshold
    if (pressure !== undefined && pressure > thresholds.pressure) {
      const alert = await createAlert(
        deviceId,
        pressure > thresholds.pressure + 10 ? 'CRITICAL' : 'WARNING',
        `Pressure exceeds threshold: ${pressure}`,
        'PRESSURE',
        { temperature, vibration, pressure }
      );
      if (alert) alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('✗ Error evaluating device alerts:', error.message);
    throw error;
  }
};

export const acknowledgeAlert = async (alertId, acknowledgedBy = null) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      alertId,
      {
        acknowledged: true,
        status: 'ACKNOWLEDGED',
        acknowledgedBy,
        acknowledgedAt: new Date(),
      },
      { new: true }
    );

    console.log(`✓ Alert acknowledged: ${alertId}`);
    return alert;
  } catch (error) {
    console.error('✗ Error acknowledging alert:', error.message);
    throw error;
  }
};

export const resolveAlert = async (alertId) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      alertId,
      {
        status: 'RESOLVED',
        dismissedAt: new Date(),
      },
      { new: true }
    );

    console.log(`✓ Alert resolved: ${alertId}`);
    return alert;
  } catch (error) {
    console.error('✗ Error resolving alert:', error.message);
    throw error;
  }
};

export const getActiveAlerts = async (limit = 50) => {
  try {
    const alerts = await Alert.find(
      { status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] } },
      null,
      { sort: { timestamp: -1 }, limit }
    );

    return alerts;
  } catch (error) {
    console.error('✗ Error fetching active alerts:', error.message);
    throw error;
  }
};

export const getDeviceAlerts = async (deviceId, limit = 50) => {
  try {
    const alerts = await Alert.find(
      { deviceId },
      null,
      { sort: { timestamp: -1 }, limit }
    );

    return alerts;
  } catch (error) {
    console.error('✗ Error fetching device alerts:', error.message);
    throw error;
  }
};

export const clearResolvedAlerts = async (olderThanHours = 24) => {
  try {
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const result = await Alert.deleteMany({
      status: 'RESOLVED',
      timestamp: { $lt: cutoffDate },
    });

    console.log(`✓ Cleaned up ${result.deletedCount} resolved alerts`);
    return result.deletedCount;
  } catch (error) {
    console.error('✗ Error clearing resolved alerts:', error.message);
    throw error;
  }
};
