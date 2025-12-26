// Sensor data schema and model
import mongoose from 'mongoose';

const sensorDataSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    temperature: {
      type: Number,
      required: true,
    },
    vibration: {
      type: Number,
      required: true,
    },
    pressure: {
      type: Number,
      required: true,
    },
    metadata: {
      type: {
        location: String,
        zone: String,
      },
      default: {},
    },
  },
  {
    collection: 'sensor_data',
    timestamps: false,
  }
);

sensorDataSchema.index({ deviceId: 1, timestamp: -1 });

const SensorData = mongoose.model('SensorData', sensorDataSchema);

export default SensorData;
