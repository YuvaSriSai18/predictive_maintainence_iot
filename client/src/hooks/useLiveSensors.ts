// Hook for managing live sensor data streaming from Socket.IO
import { useEffect, useState, useCallback, useRef } from 'react';
import { onSensorUpdate } from '../services/socket';

export interface LiveSensorReading {
  timestamp: string;
  temperature: number;
  vibration: number;
  pressure: number;
}

interface UseLiveSensorsOptions {
  maxDataPoints?: number;
  deviceFilter?: string[];
}

export const useLiveSensors = (options: UseLiveSensorsOptions = {}) => {
  const { maxDataPoints = 100, deviceFilter } = options;
  
  const [sensorData, setSensorData] = useState<
    Record<string, LiveSensorReading[]>
  >({});
  
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<
    Record<string, string>
  >({});
  
  const [isConnected, setIsConnected] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const addSensorReading = useCallback(
    (
      deviceId: string,
      reading: LiveSensorReading
    ) => {
      if (deviceFilter && !deviceFilter.includes(deviceId)) {
        return;
      }

      setSensorData((prevData) => {
        const deviceReadings = prevData[deviceId] || [];
        
        const updatedReadings = [...deviceReadings, reading];
        if (updatedReadings.length > maxDataPoints) {
          updatedReadings.shift();
        }

        return {
          ...prevData,
          [deviceId]: updatedReadings,
        };
      });

      // Update last update timestamp for this device
      setLastUpdateTimestamp((prev) => ({
        ...prev,
        [deviceId]: reading.timestamp,
      }));
    },
    [maxDataPoints, deviceFilter]
  );

  // Subscribe to sensor updates
  useEffect(() => {
    try {
      unsubscribeRef.current = onSensorUpdate((data) => {
        const reading: LiveSensorReading = {
          timestamp: data.timestamp,
          temperature: data.temperature,
          vibration: data.vibration,
          pressure: data.pressure,
        };

        addSensorReading(data.deviceId, reading);
        setIsConnected(true);
      });
    } catch (error) {
      console.error('Failed to subscribe to sensor updates:', error);
      setIsConnected(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [addSensorReading]);

  // Get sensor readings for a specific device
  const getDeviceSensors = useCallback(
    (deviceId: string): LiveSensorReading[] => {
      return sensorData[deviceId] || [];
    },
    [sensorData]
  );

  // Get latest sensor reading for a device
  const getLatestReading = useCallback(
    (deviceId: string): LiveSensorReading | null => {
      const readings = sensorData[deviceId];
      if (!Array.isArray(readings) || readings.length === 0) {
        return null;
      }
      return readings[readings.length - 1];
    },
    [sensorData]
  );

  // Get average values for a device
  const getAverageValues = useCallback(
    (deviceId: string) => {
      const readings = sensorData[deviceId];
      if (!Array.isArray(readings) || readings.length === 0) {
        return null;
      }

      const sum = readings.reduce(
        (acc, reading) => ({
          temperature: acc.temperature + reading.temperature,
          vibration: acc.vibration + reading.vibration,
          pressure: acc.pressure + reading.pressure,
        }),
        { temperature: 0, vibration: 0, pressure: 0 }
      );

      return {
        temperature: sum.temperature / readings.length,
        vibration: sum.vibration / readings.length,
        pressure: sum.pressure / readings.length,
      };
    },
    [sensorData]
  );

  // Clear data for a device
  const clearDeviceData = useCallback((deviceId: string) => {
    setSensorData((prev) => {
      const updated = { ...prev };
      delete updated[deviceId];
      return updated;
    });

    setLastUpdateTimestamp((prev) => {
      const updated = { ...prev };
      delete updated[deviceId];
      return updated;
    });
  }, []);

  // Clear all data
  const clearAllData = useCallback(() => {
    setSensorData({});
    setLastUpdateTimestamp({});
  }, []);

  return {
    sensorData,
    lastUpdateTimestamp,
    isConnected,
    getDeviceSensors,
    getLatestReading,
    getAverageValues,
    clearDeviceData,
    clearAllData,
  };
};

export default useLiveSensors;
