// Mathematical health prediction service (formula-based, no AI)
import Device from '../models/Device.model.js';
import SensorData from '../models/SensorData.model.js';

// ==================== HEALTH SCORING FORMULA ====================
// Health Score = (T_Health × 0.30) + (V_Health × 0.35) + (P_Health × 0.35)
// Each component is weighted and calculated from sensor readings
// ================================================================

// Calculate temperature component health (0-100)
const calculateTemperatureHealth = (readings) => {
  if (!readings || readings.length === 0) return 100;

  const temps = readings.map(r => r.temperature);
  const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
  const stdDev = Math.sqrt(temps.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / temps.length);

  let score = 100;

  // Penalty for deviation from ideal range (60-80°C)
  const lowerBound = 60, upperBound = 80;
  if (avg < lowerBound) {
    score -= Math.abs(avg - lowerBound) * 1.5;
  } else if (avg > upperBound) {
    score -= (avg - upperBound) * 2.5;
  }

  // Penalty for high variance (std dev > 5 indicates instability)
  if (stdDev > 5) {
    score -= Math.min(stdDev * 2, 20);
  }

  // Penalty for upward trend (last 3 vs first 3)
  if (readings.length >= 3) {
    const first3Avg = (readings[0].temperature + readings[1].temperature + readings[2].temperature) / 3;
    const last3Avg = (readings[readings.length - 3].temperature + readings[readings.length - 2].temperature + readings[readings.length - 1].temperature) / 3;
    const trend = last3Avg - first3Avg;
    if (trend > 3) score -= Math.min(trend, 15);
  }

  return Math.max(0, Math.min(100, score));
};

// Calculate vibration component health (0-100)
const calculateVibrationHealth = (readings) => {
  if (!readings || readings.length === 0) return 100;

  const vibrations = readings.map(r => r.vibration);
  const avg = vibrations.reduce((a, b) => a + b, 0) / vibrations.length;
  const max = Math.max(...vibrations);
  const stdDev = Math.sqrt(vibrations.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / vibrations.length);

  let score = 100;

  // Penalty for high average vibration (ideal: < 0.3)
  if (avg > 0.3) {
    score -= (avg - 0.3) * 50;
  }

  // Penalty for vibration spikes (max > 0.5 is dangerous)
  if (max > 0.5) {
    score -= (max - 0.5) * 40;
  }

  // Penalty for high variance (indicates instability)
  if (stdDev > 0.15) {
    score -= Math.min(stdDev * 30, 25);
  }

  // Penalty for upward trend (increasing vibration = deterioration)
  if (readings.length >= 3) {
    const first3Avg = (readings[0].vibration + readings[1].vibration + readings[2].vibration) / 3;
    const last3Avg = (readings[readings.length - 3].vibration + readings[readings.length - 2].vibration + readings[readings.length - 1].vibration) / 3;
    const trend = last3Avg - first3Avg;
    if (trend > 0.05) score -= Math.min(trend * 40, 20);
  }

  return Math.max(0, Math.min(100, score));
};

// Calculate pressure component health (0-100)
const calculatePressureHealth = (readings) => {
  if (!readings || readings.length === 0) return 100;

  const pressures = readings.map(r => r.pressure);
  const avg = pressures.reduce((a, b) => a + b, 0) / pressures.length;
  const max = Math.max(...pressures);
  const stdDev = Math.sqrt(pressures.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / pressures.length);

  let score = 100;

  // Penalty for deviation from ideal range (30-40 bar)
  const lowerBound = 30, upperBound = 40;
  if (avg < lowerBound) {
    score -= Math.abs(avg - lowerBound) * 2;
  } else if (avg > upperBound) {
    score -= (avg - upperBound) * 3;
  }

  // Penalty for pressure spikes (max > 50 is critical)
  if (max > 50) {
    score -= (max - 50) * 2;
  }

  // Penalty for high variance (std dev > 3 indicates instability)
  if (stdDev > 3) {
    score -= Math.min(stdDev * 3, 20);
  }

  // Penalty for upward trend (increasing pressure = leak/blockage)
  if (readings.length >= 3) {
    const first3Avg = (pressures[0] + pressures[1] + pressures[2]) / 3;
    const last3Avg = (pressures[pressures.length - 3] + pressures[pressures.length - 2] + pressures[pressures.length - 1]) / 3;
    const trend = last3Avg - first3Avg;
    if (trend > 2) score -= Math.min(trend * 2, 15);
  }

  return Math.max(0, Math.min(100, score));
};

// Main health score calculation using weighted formula
export const calculateHealthScoreFormula = (readings) => {
  if (!readings || readings.length === 0) {
    return { healthScore: 100, failureRisk: 'LOW', status: 'STABLE' };
  }

  const tempHealth = calculateTemperatureHealth(readings);
  const vibHealth = calculateVibrationHealth(readings);
  const pressHealth = calculatePressureHealth(readings);

  // Weighted formula: T(30%) + V(35%) + P(35%)
  const healthScore = Math.round(
    (tempHealth * 0.30) + (vibHealth * 0.35) + (pressHealth * 0.35)
  );

  // Determine failure risk & status based on thresholds
  let failureRisk = 'LOW';
  let status = 'STABLE';

  if (healthScore < 30) {
    failureRisk = 'HIGH';
    status = 'CRITICAL';
  } else if (healthScore < 50) {
    failureRisk = 'HIGH';
    status = 'DEGRADING';
  } else if (healthScore < 70) {
    failureRisk = 'MEDIUM';
    status = 'DEGRADING';
  } else {
    failureRisk = 'LOW';
    status = 'STABLE';
  }

  return {
    healthScore,
    failureRisk,
    status,
    componentScores: {
      temperature: tempHealth,
      vibration: vibHealth,
      pressure: pressHealth,
    },
  };
};

// Generate health prediction for a device
export const generateHealthPrediction = (readings) => {
  try {
    if (!readings || readings.length === 0) {
      return {
        healthScore: 100,
        failureRisk: 'LOW',
        status: 'STABLE',
        reason: 'Insufficient data',
      };
    }

    const prediction = calculateHealthScoreFormula(readings);

    // Generate reason based on component scores
    let reason = '';
    const components = prediction.componentScores;

    if (components.temperature < 60) {
      reason += 'Temperature critical. ';
    } else if (components.temperature < 70) {
      reason += 'Temperature concerns. ';
    }

    if (components.vibration < 60) {
      reason += 'High vibration levels. ';
    } else if (components.vibration < 70) {
      reason += 'Vibration rising. ';
    }

    if (components.pressure < 60) {
      reason += 'Pressure instability. ';
    } else if (components.pressure < 70) {
      reason += 'Pressure fluctuations. ';
    }

    if (!reason) {
      reason = 'All metrics within normal range. System operating optimally.';
    }

    return {
      healthScore: prediction.healthScore,
      failureRisk: prediction.failureRisk,
      status: prediction.status,
      reason: reason.trim(),
      componentScores: components,
    };
  } catch (error) {
    console.error(`✗ Prediction error:`, error.message);
    return {
      healthScore: 100,
      failureRisk: 'LOW',
      status: 'STABLE',
      reason: 'Prediction calculation error',
    };
  }
};

// Update device health in database
export const updateDeviceHealth = async (deviceId, prediction) => {
  try {
    await Device.findOneAndUpdate(
      { deviceId },
      {
        healthScore: prediction.healthScore,
        failureRisk: prediction.failureRisk,
        lastPrediction: {
          timestamp: new Date(),
          reason: prediction.reason,
          status: prediction.status,
          componentScores: prediction.componentScores,
        },
        lastUpdate: new Date(),
      },
      { upsert: true, new: true }
    );
    return true;
  } catch (error) {
    console.error(`✗ Database update error:`, error.message);
    return false;
  }
};
