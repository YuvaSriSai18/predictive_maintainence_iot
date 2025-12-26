// Chart formatting and data transformation utilities
import type { LiveSensorReading } from '../hooks/useLiveSensors';

// Sensor color mapping
export const CHART_COLORS = {
  temperature: '#EF4444', // Red
  vibration: '#A855F7', // Purple
  pressure: '#3B82F6', // Blue
  healthScore: '#10B981', // Green
  failureRisk: '#F59E0B', // Amber
} as const;

export const formatChartTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return timestamp;
  }
};

export const formatTooltipTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return timestamp;
  }
};

export const transformSensorDataForChart = (
  readings: LiveSensorReading[]
): Array<{
  time: string;
  timestamp: string;
  temperature: number;
  vibration: number;
  pressure: number;
}> => {
  if (!Array.isArray(readings)) {
    return [];
  }

  return readings.map((reading) => ({
    time: formatChartTimestamp(reading.timestamp),
    timestamp: reading.timestamp,
    temperature: Math.round(reading.temperature * 10) / 10,
    vibration: Math.round(reading.vibration * 100) / 100,
    pressure: Math.round(reading.pressure * 10) / 10,
  }));
};

export const getValueColor = (
  sensorType: 'temperature' | 'vibration' | 'pressure',
  value: number,
  thresholds: { warning?: number; critical?: number }
): string => {
  if (thresholds.critical && value >= thresholds.critical) {
    return '#EF4444'; // Red
  }
  if (thresholds.warning && value >= thresholds.warning) {
    return '#F59E0B'; // Amber
  }
  return CHART_COLORS[sensorType];
};

export const formatSensorValue = (
  sensorType: 'temperature' | 'vibration' | 'pressure',
  value: number
): string => {
  switch (sensorType) {
    case 'temperature':
      return `${value.toFixed(1)}°C`;
    case 'vibration':
      return `${value.toFixed(2)} mm/s`;
    case 'pressure':
      return `${value.toFixed(1)} bar`;
    default:
      return value.toFixed(2);
  }
};

// Calculate min/max for chart axis
export const calculateAxisBounds = (values: number[]): { min: number; max: number } => {
  if (!Array.isArray(values) || values.length === 0) {
    return { min: 0, max: 100 };
  }

  const validValues = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (validValues.length === 0) {
    return { min: 0, max: 100 };
  }

  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const padding = (max - min) * 0.1 || 10;

  return {
    min: Math.floor((min - padding) * 10) / 10,
    max: Math.ceil((max + padding) * 10) / 10,
  };
};

// Get health score color
export const getHealthScoreColor = (score: number): string => {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
};

// Get health score label
export const getHealthScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Fair';
  return 'Poor';
};

// Get failure risk color
export const getFailureRiskColor = (risk: string): string => {
  switch (risk) {
    case 'LOW':
      return '#10B981'; // Green
    case 'MEDIUM':
      return '#F59E0B'; // Amber
    case 'HIGH':
      return '#EF4444'; // Red
    default:
      return '#6B7280'; // Gray
  }
};

// Format risk label
export const formatRiskLabel = (risk: string): string => {
  return risk.charAt(0).toUpperCase() + risk.slice(1).toLowerCase();
};

// Smooth data by averaging nearby points (reduces noise for visualization)
export const smoothSensorData = (
  readings: LiveSensorReading[],
  windowSize: number = 3
): LiveSensorReading[] => {
  if (!Array.isArray(readings) || readings.length < windowSize) {
    return readings;
  }

  const smoothed: LiveSensorReading[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < readings.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(readings.length, i + halfWindow + 1);
    const window = readings.slice(start, end);

    const avgTemp = window.reduce((sum, r) => sum + r.temperature, 0) / window.length;
    const avgVib = window.reduce((sum, r) => sum + r.vibration, 0) / window.length;
    const avgPres = window.reduce((sum, r) => sum + r.pressure, 0) / window.length;

    smoothed.push({
      timestamp: readings[i].timestamp,
      temperature: avgTemp,
      vibration: avgVib,
      pressure: avgPres,
    });
  }

  return smoothed;
};

// Detect anomalies in sensor data
export const detectAnomalies = (
  readings: LiveSensorReading[],
  thresholds: {
    temperature: { min: number; max: number };
    vibration: { min: number; max: number };
    pressure: { min: number; max: number };
  }
): { index: number; type: string; value: number }[] => {
  const anomalies: { index: number; type: string; value: number }[] = [];

  if (!Array.isArray(readings)) {
    return anomalies;
  }

  readings.forEach((reading, index) => {
    if (reading.temperature < thresholds.temperature.min || reading.temperature > thresholds.temperature.max) {
      anomalies.push({
        index,
        type: 'temperature',
        value: reading.temperature,
      });
    }

    if (reading.vibration > thresholds.vibration.max) {
      anomalies.push({
        index,
        type: 'vibration',
        value: reading.vibration,
      });
    }

    if (reading.pressure < thresholds.pressure.min || reading.pressure > thresholds.pressure.max) {
      anomalies.push({
        index,
        type: 'pressure',
        value: reading.pressure,
      });
    }
  });

  return anomalies;
};

export default {
  CHART_COLORS,
  formatChartTimestamp,
  formatTooltipTimestamp,
  transformSensorDataForChart,
  getValueColor,
  formatSensorValue,
  calculateAxisBounds,
  getHealthScoreColor,
  getHealthScoreLabel,
  getFailureRiskColor,
  formatRiskLabel,
  smoothSensorData,
  detectAnomalies,
};
