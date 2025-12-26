// Sample device data for seeding database
import Device from '../models/Device.model.js';

export const SAMPLE_DEVICES = [
  {
    deviceId: 'MOTOR_01',
    name: 'Industrial Motor #1',
    status: 'ACTIVE',
    location: 'Factory Floor A',
    healthScore: 95,
    failureRisk: 'LOW',
    alertThresholds: {
      temperature: 85,
      vibration: 0.8,
      pressure: 40,
      healthScoreMin: 60,
    },
  },
  {
    deviceId: 'MOTOR_02',
    name: 'Industrial Motor #2',
    status: 'ACTIVE',
    location: 'Factory Floor B',
    healthScore: 82,
    failureRisk: 'MEDIUM',
    alertThresholds: {
      temperature: 85,
      vibration: 0.8,
      pressure: 40,
      healthScoreMin: 60,
    },
  },
  {
    deviceId: 'PUMP_01',
    name: 'Hydraulic Pump #1',
    status: 'ACTIVE',
    location: 'Pump Station',
    healthScore: 88,
    failureRisk: 'LOW',
    alertThresholds: {
      temperature: 80,
      vibration: 0.6,
      pressure: 45,
      healthScoreMin: 60,
    },
  },
  {
    deviceId: 'COMPRESSOR_01',
    name: 'Air Compressor #1',
    status: 'MAINTENANCE',
    location: 'Utility Room',
    healthScore: 65,
    failureRisk: 'HIGH',
    alertThresholds: {
      temperature: 90,
      vibration: 1.0,
      pressure: 50,
      healthScoreMin: 60,
    },
  },
];

/**
 * Initialize sample devices if none exist
 * Called on server startup
 */
export const initializeSampleDevices = async () => {
  try {
    const existingDevices = await Device.countDocuments();

    if (existingDevices === 0) {
      console.log('📦 Initializing sample devices...');

      await Device.insertMany(SAMPLE_DEVICES);
      console.log(`✓ ${SAMPLE_DEVICES.length} sample devices created successfully`);
    } else {
      console.log(`✓ Found ${existingDevices} devices in database`);
    }
  } catch (error) {
    console.error('✗ Error initializing sample devices:', error.message);
    throw error;
  }
};

/**
 * Seed devices (clears existing and creates fresh)
 * Can be called manually via API or CLI
 */
export const seedDevices = async () => {
  try {
    console.log('🗑️  Clearing existing devices...');
    await Device.deleteMany({});

    console.log('📦 Seeding sample devices...');
    await Device.insertMany(SAMPLE_DEVICES);

    console.log(`✓ Successfully seeded ${SAMPLE_DEVICES.length} devices`);
    return {
      success: true,
      count: SAMPLE_DEVICES.length,
      devices: SAMPLE_DEVICES.map((d) => ({ deviceId: d.deviceId, name: d.name })),
    };
  } catch (error) {
    console.error('✗ Error seeding devices:', error.message);
    throw error;
  }
};

export default {
  initializeSampleDevices,
  seedDevices,
  SAMPLE_DEVICES,
};
