/**
 * DeviceDetails Page
 * Comprehensive device view with live stream and historical analysis
 * 
 * Architecture:
 * - Live Stream: Real-time SensorChart (Socket.IO, no DB latency)
 * - Historical View: Time-range filtered data from MongoDB
 * - Alerts: Real-time updates + historical list
 */

import React, { useEffect, useState, useCallback } from 'react';
import { HealthGauge } from '../components/HealthGauge';
import { SensorChart } from '../components/SensorChart';
import { AlertsPanel } from '../components/AlertsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  deviceAPI,
  alertAPI,
  Device,
  Alert,
} from '../services/api';
import { useDeviceHistory } from '../hooks/useDeviceHistory';
import type { TimeRange } from '../hooks/useDeviceHistory';

interface DeviceDetailsProps {
  deviceId: string;
  onBack?: () => void;
}

export const DeviceDetails: React.FC<DeviceDetailsProps> = ({
  deviceId,
  onBack,
}) => {
  // Device info
  const [device, setDevice] = useState<Device | null>(null);
  const [deviceAlerts, setDeviceAlerts] = useState<Alert[]>([]);
  
  // Historical data for analysis
  const [historyTimeRange, setHistoryTimeRange] = useState<TimeRange>('24h');
  const { data: historyData, stats: historyStats, loading: historyLoading } = 
    useDeviceHistory(deviceId, { timeRange: historyTimeRange });
  
  // Loading states
  const [loadingDevice, setLoadingDevice] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch device details
  const fetchDevice = useCallback(async () => {
    try {
      setLoadingDevice(true);
      setError(null);
      const data = await deviceAPI.getById(deviceId);
      setDevice(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load device';
      setError(errorMessage);
      console.error('Failed to fetch device:', err);
    } finally {
      setLoadingDevice(false);
    }
  }, [deviceId]);

  // Fetch device health
  const fetchHealth = useCallback(async () => {
    try {
      await deviceAPI.getHealth(deviceId);
    } catch (err) {
      console.error('Failed to fetch device health:', err);
    }
  }, [deviceId]);

  // Fetch device alerts
  const fetchDeviceAlerts = useCallback(async () => {
    try {
      const data = await alertAPI.getByDevice(deviceId);
      setDeviceAlerts(data);
    } catch (err) {
      console.error('Failed to fetch device alerts:', err);
    }
  }, [deviceId]);

  // Initial load
  useEffect(() => {
    fetchDevice();
    fetchHealth();
    fetchDeviceAlerts();
  }, [fetchDevice, fetchHealth, fetchDeviceAlerts]);

  if (loadingDevice) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-300 border-t-blue-600"></div>
          <p className="text-sm text-slate-600">Loading device details...</p>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-800">Device not found</h3>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 text-sm font-semibold text-red-600 hover:text-red-700 underline"
          >
            ← Back to Dashboard
          </button>
        )}
      </div>
    );
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-slate-100 text-slate-800';
      case 'MAINTENANCE':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // Get risk badge color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-8 py-8">
      {/* Header */}
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </button>
        )}

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{device.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{device.deviceId}</p>
          </div>
          <Badge className={getStatusColor(device.status)}>
            {device.status}
          </Badge>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-800">⚠️ {error}</p>
        </div>
      )}

      {/* Health Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Health Gauge */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Health Score</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <HealthGauge score={device.healthScore} size="md" showLabel={true} />
          </CardContent>
        </Card>

        {/* Risk Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Failure Risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge className={getRiskColor(device.failureRisk)}>
              {device.failureRisk}
            </Badge>
            <p className="text-xs text-slate-600">
              {device.failureRisk === 'LOW' &&
                'Device is operating within normal parameters'}
              {device.failureRisk === 'MEDIUM' &&
                'Monitor device closely for degradation'}
              {device.failureRisk === 'HIGH' &&
                'Immediate maintenance recommended'}
            </p>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Last Updated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-slate-600">Data</p>
              <p className="text-sm font-semibold text-slate-900">
                {new Date(device.lastUpdate).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Prediction</p>
              <p className="text-sm font-semibold text-slate-900">
                {new Date(device.lastPrediction).toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Sensor Chart */}
      <SensorChart
        deviceId={deviceId}
        title="Real-Time Sensor Readings (Live Stream)"
      />

      {/* Historical Data Analysis Section */}
      <Card className="border-slate-200">
        <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Historical Analysis</CardTitle>
            <div className="text-xs text-slate-600">
              {historyLoading ? 'Loading...' : `${historyData.length} readings`}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Time Range Selection */}
          <div className="mb-6 flex flex-wrap gap-2">
            {(['15m', '1h', '24h', '7d', '30d'] as const).map((range) => (
              <Button
                key={range}
                variant={historyTimeRange === range ? 'default' : 'outline'}
                onClick={() => setHistoryTimeRange(range)}
                className="text-sm"
                disabled={historyLoading}
              >
                {range.toUpperCase()}
              </Button>
            ))}
          </div>

          {/* Statistics */}
          {historyStats && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Avg Temp</p>
                <p className="text-sm font-semibold text-slate-900">
                  {historyStats.avgTemperature.toFixed(1)}°C
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Max Temp</p>
                <p className="text-sm font-semibold text-red-600">
                  {historyStats.maxTemperature.toFixed(1)}°C
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Min Temp</p>
                <p className="text-sm font-semibold text-blue-600">
                  {historyStats.minTemperature.toFixed(1)}°C
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Avg Vibration</p>
                <p className="text-sm font-semibold text-slate-900">
                  {historyStats.avgVibration.toFixed(2)} mm/s
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Max Vibration</p>
                <p className="text-sm font-semibold text-orange-600">
                  {historyStats.maxVibration.toFixed(2)} mm/s
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Avg Pressure</p>
                <p className="text-sm font-semibold text-slate-900">
                  {historyStats.avgPressure.toFixed(1)} bar
                </p>
              </div>
            </div>
          )}

          {/* Historical Chart Placeholder */}
          {historyLoading ? (
            <div className="flex h-96 items-center justify-center">
              <div className="text-center">
                <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-300 border-t-blue-600"></div>
                <p className="text-sm text-slate-600">Loading historical data...</p>
              </div>
            </div>
          ) : historyData.length === 0 ? (
            <div className="flex h-96 items-center justify-center">
              <p className="text-sm text-slate-500">No historical data available for this period</p>
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              Historical chart with {historyData.length} data points for {historyTimeRange}
            </p>
          )}
        </CardContent>
      </Card>


      {/* Thresholds Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Alert Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-600">Temperature Max</p>
              <p className="text-lg font-semibold text-slate-900">
                {device?.alertThresholds?.temperature ?? device?.alertThresholds?.temperatureMax ?? 'N/A'}°C
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Vibration Max</p>
              <p className="text-lg font-semibold text-slate-900">
                {device?.alertThresholds?.vibration ?? device?.alertThresholds?.vibrationMax ?? 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Pressure Max</p>
              <p className="text-lg font-semibold text-slate-900">
                {device?.alertThresholds?.pressure ?? device?.alertThresholds?.pressureMax ?? 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Health Score Min</p>
              <p className="text-lg font-semibold text-slate-900">
                {device?.alertThresholds?.healthScoreMin ?? 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Alerts */}
      <AlertsPanel
        alerts={deviceAlerts}
        onAlertsChange={fetchDeviceAlerts}
      />
    </div>
  );
};

export default DeviceDetails;
