// Device auto-creation logic from MQTT data
import Device from '../models/Device.model.js';

const DEFAULT_ALERT_THRESHOLDS = {
  temperature: 85,
  vibration: 0.8,
  pressure: 40,
  healthScoreMin: 60,
};

export const ensureDeviceExists = async (deviceId) => {
  try {
    const existingDevice = await Device.findOne({ deviceId });
    if (existingDevice) {
      return existingDevice;
    }

    // Create new device with minimal defaults
    const newDevice = new Device({
      deviceId,
      name: deviceId,
      status: 'ACTIVE',
      location: 'Unknown',
      healthScore: 100,
      failureRisk: 'LOW',
      alertThresholds: DEFAULT_ALERT_THRESHOLDS,
    });

    const savedDevice = await newDevice.save();
    console.log(`✅ Auto-created device: ${deviceId}`);
    return savedDevice;
  } catch (error) {
    console.error(`✗ Error ensuring device exists for ${deviceId}:`, error.message);
    throw error;
  }
};
