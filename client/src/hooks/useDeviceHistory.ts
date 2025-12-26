/**
 * useDeviceHistory Hook
 * Fetches historical sensor data from MongoDB via REST API
 * Separate from real-time Socket.IO stream to handle historical queries efficiently
 */

import { useEffect, useState, useCallback } from 'react';
import { sensorAPI } from '../services/api';

export interface HistoricalSensorData {
  timestamp: string;
  temperature: number;
  vibration: number;
  pressure: number;
  _id?: string;
}

export interface HistoryStats {
  avgTemperature: number;
  maxTemperature: number;
  minTemperature: number;
  avgVibration: number;
  maxVibration: number;
  avgPressure: number;
  maxPressure: number;
}

export type TimeRange = '15m' | '1h' | '24h' | '7d' | '30d';

interface UseDeviceHistoryOptions {
  timeRange?: TimeRange;
  autoFetch?: boolean;
}

interface UseDeviceHistoryReturn {
  data: HistoricalSensorData[];
  stats: HistoryStats | null;
  loading: boolean;
  error: string | null;
  fetchHistory: (timeRange?: TimeRange) => Promise<void>;
  clearHistory: () => void;
}

/**
 * Custom hook for fetching and managing historical sensor data
 * Fetches from MongoDB, not from live stream
 * Used for historical views, trends, and data analysis
 *
 * @param deviceId - Device to fetch history for
 * @param options - Configuration options
 * @returns Object with data, stats, loading, error, and fetch function
 */
export const useDeviceHistory = (
  deviceId: string,
  options: UseDeviceHistoryOptions = {}
): UseDeviceHistoryReturn => {
  const { timeRange = '24h', autoFetch = true } = options;

  const [data, setData] = useState<HistoricalSensorData[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate time range boundaries
  const getTimeRangeBoundary = useCallback((range: TimeRange): Date => {
    const now = new Date();
    const boundaries: Record<TimeRange, number> = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    return new Date(now.getTime() - boundaries[range]);
  }, []);

  // Calculate statistics from sensor data
  const calculateStats = useCallback((readings: HistoricalSensorData[]): HistoryStats => {
    if (readings.length === 0) {
      return {
        avgTemperature: 0,
        maxTemperature: 0,
        minTemperature: 0,
        avgVibration: 0,
        maxVibration: 0,
        avgPressure: 0,
        maxPressure: 0,
      };
    }

    const temperatures = readings.map((r) => r.temperature);
    const vibrations = readings.map((r) => r.vibration);
    const pressures = readings.map((r) => r.pressure);

    return {
      avgTemperature: Math.round((temperatures.reduce((a, b) => a + b, 0) / temperatures.length) * 10) / 10,
      maxTemperature: Math.max(...temperatures),
      minTemperature: Math.min(...temperatures),
      avgVibration: Math.round((vibrations.reduce((a, b) => a + b, 0) / vibrations.length) * 100) / 100,
      maxVibration: Math.max(...vibrations),
      avgPressure: Math.round((pressures.reduce((a, b) => a + b, 0) / pressures.length) * 10) / 10,
      maxPressure: Math.max(...pressures),
    };
  }, []);

  // Fetch historical data from MongoDB
  const fetchHistory = useCallback(
    async (range: TimeRange = timeRange) => {
      if (!deviceId) {
        setError('Device ID is required');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get sensor readings from the database
        // The API should support filtering by deviceId and timestamp range
        const response = await sensorAPI.getByDevice(deviceId);

        if (!response) {
          throw new Error('Failed to fetch historical data');
        }

        // Filter data by time range
        const startTime = getTimeRangeBoundary(range);
        const filteredData = response
          .filter((item) => {
            const itemTime = new Date(item.timestamp);
            return itemTime >= startTime;
          })
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        setData(filteredData);
        setStats(calculateStats(filteredData));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch historical data';
        setError(message);
        setData([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    },
    [deviceId, timeRange, getTimeRangeBoundary, calculateStats]
  );

  // Auto-fetch on mount or when dependencies change
  useEffect(() => {
    if (autoFetch && deviceId) {
      fetchHistory(timeRange);
    }
  }, [autoFetch, deviceId, timeRange, fetchHistory]);

  // Clear historical data
  const clearHistory = useCallback(() => {
    setData([]);
    setStats(null);
    setError(null);
  }, []);

  return {
    data,
    stats,
    loading,
    error,
    fetchHistory,
    clearHistory,
  };
};

export default useDeviceHistory;
