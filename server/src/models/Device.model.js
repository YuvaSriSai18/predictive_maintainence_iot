// Device schema and model
import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
      default: 'ACTIVE',
    },
    location: {
      type: String,
      default: 'Unknown',
    },
    healthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    failureRisk: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW',
    },
    lastUpdate: {
      type: Date,
      default: Date.now,
    },
    lastPrediction: {
      timestamp: Date,
      healthScore: Number,
      failureRisk: String,
      reason: String,
    },
    alertThresholds: {
      temperature: {
        type: Number,
        default: 85,
      },
      vibration: {
        type: Number,
        default: 0.8,
      },
      pressure: {
        type: Number,
        default: 40,
      },
      healthScoreMin: {
        type: Number,
        default: 60,
      },
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

const Device = mongoose.model('Device', deviceSchema);

export default Device;
