// Alert panel displaying list of device alerts with actions
import React, { useState } from 'react';
import { alertAPI, Alert } from '../services/api';

interface AlertsPanelProps {
  alerts: Alert[];
  loading?: boolean;
  onAlertsChange?: () => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  loading = false,
  onAlertsChange,
}) => {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      setProcessingIds((prev) => new Set(prev).add(alertId));
      await alertAPI.acknowledge(alertId);
      onAlertsChange?.();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      setProcessingIds((prev) => new Set(prev).add(alertId));
      await alertAPI.resolve(alertId);
      onAlertsChange?.();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const otherAlerts = alerts.filter((a) => a.status !== 'ACTIVE');

  return (
    <div className="rounded-xl bg-white overflow-hidden shadow-lg border border-slate-200">
      {/* Header */}
      <div className="bg-linear-to-r from-red-500 to-orange-600 px-6 py-4 border-b border-red-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Active Alerts
          </h3>
          {alerts.length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white"></span>
              <span className="text-sm font-semibold text-white">{activeAlerts.length} Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-300 border-t-blue-600"></div>
              <p className="text-sm text-slate-600">Loading alerts...</p>
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mb-3 text-4xl">✓</div>
            <p className="font-semibold text-slate-700">No Alerts</p>
            <p className="mt-1 text-sm text-slate-500">All systems operating normally</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Active Alerts */}
            {activeAlerts.map((alert) => (
              <div
                key={alert._id}
                className={`group rounded-lg border-l-4 p-4 transition-all ${
                  alert.severity === 'CRITICAL'
                    ? 'border-l-red-600 bg-red-50 hover:bg-red-100 border border-red-200'
                    : alert.severity === 'WARNING'
                    ? 'border-l-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200'
                    : 'border-l-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Severity Badge and Device */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-red-600 text-white'
                          : alert.severity === 'WARNING'
                          ? 'bg-orange-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {alert.severity === 'CRITICAL' ? '🔴 CRITICAL' : alert.severity === 'WARNING' ? '🟠 WARNING' : '🔵 INFO'}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                        {alert.deviceId}
                      </span>
                    </div>

                    {/* Message */}
                    <p className="text-sm font-semibold text-slate-900">
                      {alert.message}
                    </p>

                    {/* Timestamp */}
                    <p className="mt-2 text-xs text-slate-600">
                      📅 {formatTime(alert.createdAt)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 ml-2">
                    {alert.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleAcknowledge(alert._id)}
                        disabled={processingIds.has(alert._id)}
                        className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50 hover:shadow-lg"
                      >
                        {processingIds.has(alert._id) ? '⏳' : '✓ Ack'}
                      </button>
                    )}
                    {alert.status === 'ACKNOWLEDGED' && (
                      <button
                        onClick={() => handleResolve(alert._id)}
                        disabled={processingIds.has(alert._id)}
                        className="whitespace-nowrap rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-green-700 disabled:opacity-50 hover:shadow-lg"
                      >
                        {processingIds.has(alert._id) ? '⏳' : '✓ Resolve'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Other Alerts (if any) */}
            {otherAlerts.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer rounded-lg bg-slate-50 p-3 font-medium text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200">
                  📋 {otherAlerts.length} {otherAlerts.length === 1 ? 'Resolved Alert' : 'Resolved Alerts'}
                </summary>
                <div className="mt-2 space-y-2">
                  {otherAlerts.map((alert) => (
                    <div
                      key={alert._id}
                      className={`rounded-lg border-l-4 p-3 ${
                        alert.status === 'ACKNOWLEDGED'
                          ? 'border-l-yellow-600 bg-yellow-50 border border-yellow-200'
                          : 'border-l-green-600 bg-green-50 border border-green-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              alert.severity === 'CRITICAL'
                                ? 'bg-red-600 text-white'
                                : alert.severity === 'WARNING'
                                ? 'bg-orange-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}>
                              {alert.severity}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">
                              {alert.deviceId}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-900">{alert.message}</p>
                          <p className="mt-1 text-xs text-slate-600">
                            {formatTime(alert.createdAt)}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                          alert.status === 'ACKNOWLEDGED'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-green-200 text-green-800'
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
