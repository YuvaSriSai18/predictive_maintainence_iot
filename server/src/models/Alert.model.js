// Alert schema and model
import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    reason: String,
    sensorReadings: {
      temperature: Number,
      vibration: Number,
      pressure: Number,
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
    acknowledgedBy: String,
    acknowledgedAt: Date,
    dismissedAt: Date,
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'ACTIVE',
    },
    triggerType: {
      type: String,
      enum: ['HEALTH_SCORE', 'FAILURE_RISK', 'TEMPERATURE', 'VIBRATION', 'PRESSURE', 'RULE_BASED'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ deviceId: 1, timestamp: -1 });
alertSchema.index({ status: 1, timestamp: -1 });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
