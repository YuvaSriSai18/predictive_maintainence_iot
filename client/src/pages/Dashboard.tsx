import React, { useEffect, useState, useCallback } from 'react';
import { AlertsPanel } from '../components/AlertsPanel';
import { Badge } from '../components/ui/badge';
import { deviceAPI, alertAPI, Device, Alert } from '../services/api';
import {
  initSocket,
  onSensorUpdate,
  onNewAlert,
  onAlertAcknowledged,
  onAlertResolved,
} from '../services/socket';
import SensorChart from '../components/SensorChart';

interface DashboardProps {
  onDeviceSelect?: (deviceId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onDeviceSelect }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    initSocket();
  }, []);

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);
      setError(null);
      const data = await deviceAPI.getAll();
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load devices';
      setError(errorMessage);
      console.error('Failed to fetch devices:', err);
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      setLoadingAlerts(true);
      const data = await alertAPI.getAll();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDevices();
    fetchAlerts();

    // Set up 10-second refresh for devices and alerts
    const deviceInterval = setInterval(() => {
      fetchDevices();
    }, 10000); // Refresh devices every 10 seconds

    const alertInterval = setInterval(() => {
      fetchAlerts();
    }, 10000); // Refresh alerts every 10 seconds

    return () => {
      clearInterval(deviceInterval);
      clearInterval(alertInterval);
    };
  }, [fetchDevices, fetchAlerts]);

  // Real-time sensor updates
  useEffect(() => {
    const unsubscribe = onSensorUpdate((data) => {
      // Update device last update time
      setDevices((prevDevices) => {
        if (!Array.isArray(prevDevices)) return prevDevices;
        return prevDevices.map((device) =>
          device.deviceId === data.deviceId
            ? { ...device, lastUpdate: data.timestamp }
            : device
        );
      });
    });

    return unsubscribe;
  }, []);

  // Real-time alert updates
  useEffect(() => {
    const unsubscribe = onNewAlert((data) => {
      setAlerts((prevAlerts) => {
        if (!Array.isArray(prevAlerts)) prevAlerts = [];
        return [
          {
            _id: data._id,
            deviceId: data.deviceId,
            severity: data.severity,
            message: data.message,
            status: 'ACTIVE',
            triggerType: '',
            createdAt: data.createdAt,
          },
          ...prevAlerts,
        ];
      });
    });

    return unsubscribe;
  }, []);

  // Real-time alert acknowledgment
  useEffect(() => {
    const unsubscribe = onAlertAcknowledged((data) => {
      setAlerts((prevAlerts) => {
        if (!Array.isArray(prevAlerts)) return prevAlerts;
        return prevAlerts.map((alert) =>
          alert._id === data.alertId
            ? { ...alert, status: 'ACKNOWLEDGED' }
            : alert
        );
      });
    });

    return unsubscribe;
  }, []);

  // Real-time alert resolution
  useEffect(() => {
    const unsubscribe = onAlertResolved((data) => {
      setAlerts((prevAlerts) => {
        if (!Array.isArray(prevAlerts)) return prevAlerts;
        return prevAlerts.map((alert) =>
          alert._id === data.alertId
            ? { ...alert, status: 'RESOLVED' }
            : alert
        );
      });
    });

    return unsubscribe;
  }, []);

  // Stats calculations
  const healthyDevices = Array.isArray(devices) ? devices.filter((d) => d.healthScore > 80).length : 0;
  const criticalDevices = Array.isArray(devices) ? devices.filter((d) => d.healthScore < 60).length : 0;
  const activeAlerts = Array.isArray(alerts) ? alerts.filter((a) => a.status === 'ACTIVE').length : 0;

  // Get selected device data
  const selectedDevice = Array.isArray(devices) && selectedDeviceId
    ? devices.find((d) => d.deviceId === selectedDeviceId)
    : null;

  // Get alerts for selected device
  const selectedDeviceAlerts = selectedDeviceId && Array.isArray(alerts)
    ? alerts.filter((a) => a.deviceId === selectedDeviceId)
    : [];

  // Handle device selection
  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    onDeviceSelect?.(deviceId);
  };

  return (
    <div className="space-y-8 py-8 bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Stats Section */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Devices */}
        <div className="group relative rounded-xl bg-linear-to-br from-blue-500 to-blue-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-400">
          <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-5 transition-opacity"></div>
          <div className="relative">
            <p className="text-sm font-medium text-blue-100">Total Devices</p>
            <p className="mt-3 text-4xl font-bold text-white">
              {devices.length || 0}
            </p>
            <p className="mt-2 text-xs text-blue-100">All IoT devices monitored</p>
          </div>
        </div>

        {/* Healthy Devices */}
        <div className="group relative rounded-xl bg-linear-to-br from-green-500 to-emerald-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-green-400">
          <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-5 transition-opacity"></div>
          <div className="relative">
            <p className="text-sm font-medium text-green-100">Healthy Devices</p>
            <p className="mt-3 text-4xl font-bold text-white">
              {healthyDevices}
            </p>
            <p className="mt-2 text-xs text-green-100">Score {"> 80"}</p>
          </div>
        </div>

        {/* Critical Devices */}
        <div className="group relative rounded-xl bg-linear-to-br from-red-500 to-rose-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-red-400">
          <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-5 transition-opacity"></div>
          <div className="relative">
            <p className="text-sm font-medium text-red-100">Critical Devices</p>
            <p className="mt-3 text-4xl font-bold text-white">
              {criticalDevices}
            </p>
            <p className="mt-2 text-xs text-red-100">Score {"< 60"}</p>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="group relative rounded-xl bg-linear-to-br from-orange-500 to-amber-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-400">
          <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-5 transition-opacity"></div>
          <div className="relative">
            <p className="text-sm font-medium text-orange-100">Active Alerts</p>
            <p className="mt-3 text-4xl font-bold text-white">
              {activeAlerts}
            </p>
            <p className="mt-2 text-xs text-orange-100">Requires immediate attention</p>
          </div>
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl bg-linear-to-r from-red-50 to-rose-50 border-l-4 border-red-600 p-4 shadow-md">
          <p className="text-sm font-semibold text-red-800">❌ {error}</p>
          <button
            onClick={fetchDevices}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-red-700 hover:shadow-lg"
          >
            🔄 Retry Connection
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="space-y-8">
        {/* Connected Devices Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             Connected Devices
          </h2>

          {loadingDevices ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-lg bg-linear-to-br from-slate-200 to-slate-100 animate-pulse border border-slate-300"
                ></div>
              ))}
            </div>
          ) : !Array.isArray(devices) || devices.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-12 text-center shadow-sm">
              <p className="text-lg font-semibold text-blue-900">🔍 No Devices Found</p>
              <p className="mt-2 text-blue-700">
                Start the simulator to see live device data
              </p>
              <code className="mt-4 inline-block rounded-lg bg-blue-900 px-4 py-2 text-sm text-blue-100">
                npm run simulate
              </code>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(Array.isArray(devices) ? devices : []).map((device) => (
                <div
                  key={device._id}
                  onClick={() => handleDeviceSelect(device.deviceId)}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-300 ${
                    selectedDeviceId === device.deviceId
                      ? 'border-blue-600 bg-blue-50 shadow-lg'
                      : 'border-slate-200 bg-white shadow-md hover:shadow-lg hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{device.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">ID: {device.deviceId}</p>
                    </div>
                    <Badge
                      className={`text-xs whitespace-nowrap ml-2 ${
                        device.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : device.status === 'MAINTENANCE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {device.status}
                    </Badge>
                  </div>

                  {/* Health Score */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Health</span>
                    <span
                      className={`text-sm font-bold ${
                        device.healthScore > 80
                          ? 'text-green-600'
                          : device.healthScore > 60
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {device.healthScore}%
                    </span>
                  </div>

                  {/* Failure Risk */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Risk</span>
                    <Badge
                      className={`text-xs ${
                        device.failureRisk === 'LOW'
                          ? 'bg-green-100 text-green-800'
                          : device.failureRisk === 'MEDIUM'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {device.failureRisk}
                    </Badge>
                  </div>

                  {/* Last Update */}
                  <p className="mt-3 text-xs text-slate-500">
                    Updated: {new Date(device.lastUpdate).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Device Details */}
        {selectedDevice && (
          <div className="space-y-6">
            {/* Device Header */}
            <div className="rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 p-6 text-white shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold">{selectedDevice.name}</h2>
                  <p className="mt-2 text-blue-100">Device ID: {selectedDevice.deviceId}</p>
                </div>
                <button
                  onClick={() => setSelectedDeviceId(null)}
                  className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/30"
                >
                  ✕ Close
                </button>
              </div>

              {/* Quick Stats */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-white/10 p-4">
                  <p className="text-xs text-blue-100">Status</p>
                  <p className="mt-2 text-lg font-bold text-white">{selectedDevice.status}</p>
                </div>
                <div className="rounded-lg bg-white/10 p-4">
                  <p className="text-xs text-blue-100">Health Score</p>
                  <p className="mt-2 text-lg font-bold text-white">{selectedDevice.healthScore}%</p>
                </div>
                <div className="rounded-lg bg-white/10 p-4">
                  <p className="text-xs text-blue-100">Failure Risk</p>
                  <p className="mt-2 text-lg font-bold text-white">{selectedDevice.failureRisk}</p>
                </div>
              </div>
            </div>

            {/* Sensor Charts */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">📊 Live Sensor Data</h3>
              <SensorChart
                deviceId={selectedDevice.deviceId}
                title={`${selectedDevice.name} - Real-time Sensors`}
              />
            </div>

            {/* Device Alerts */}
            {selectedDeviceAlerts.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">🚨 Device Alerts</h3>
                <AlertsPanel
                  alerts={selectedDeviceAlerts}
                  loading={false}
                  onAlertsChange={() => fetchAlerts()}
                />
              </div>
            )}

            {/* No Alerts Message */}
            {selectedDeviceAlerts.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-green-300 bg-green-50/50 p-8 text-center">
                <p className="text-lg font-semibold text-green-900">✅ No Active Alerts</p>
                <p className="mt-2 text-green-700">This device is operating normally</p>
              </div>
            )}
          </div>
        )}

        {/* Global Alerts Section */}
        {!selectedDeviceId && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  Connected Devices Detail View
                </h2>
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
                  <p className="text-lg font-semibold text-slate-900">👆 Select a device above</p>
                  <p className="mt-2 text-slate-700">
                    Click on any device container to view its real-time sensor data and alerts
                  </p>
                </div>
              </div>
            </div>

            {/* Global Alerts */}
            <div>
              <AlertsPanel
                alerts={Array.isArray(alerts) ? alerts : []}
                loading={loadingAlerts}
                onAlertsChange={fetchAlerts}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
