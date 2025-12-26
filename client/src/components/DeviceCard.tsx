// Device card showing device info, health score and failure risk
import React from 'react';
import { HealthGauge } from './HealthGauge';

interface DeviceCardProps {
  deviceId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  healthScore: number;
  failureRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  lastUpdate: string;
  onClick?: () => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  deviceId,
  name,
  status,
  healthScore,
  failureRisk,
  lastUpdate,
  onClick,
}) => {
  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);

      if (diffMins === 0) return `${diffSecs}s ago`;
      if (diffMins < 60) return `${diffMins}m ago`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;

      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl bg-white overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer border border-slate-200 hover:border-blue-400"
    >
      <div className={`h-1 w-full ${
        status === 'ACTIVE' ? 'bg-linear-to-r from-green-400 to-emerald-500' : 
        status === 'MAINTENANCE' ? 'bg-linear-to-r from-blue-400 to-indigo-500' :
        'bg-linear-to-r from-slate-400 to-slate-500'
      }`}></div>

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              {name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">ID: {deviceId}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
            status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
            status === 'MAINTENANCE' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {status}
          </div>
        </div>

        {/* Health Gauge */}
        <div className="flex justify-center py-2">
          <HealthGauge score={healthScore} size="sm" showLabel={true} />
        </div>

        {/* Risk Indicator */}
        <div className="flex items-center justify-between rounded-lg bg-linear-to-r from-slate-50 to-slate-100 p-3">
          <div>
            <p className="text-xs font-medium text-slate-600">Failure Risk</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{failureRisk}</p>
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-white ${
            failureRisk === 'LOW' ? 'bg-linear-to-br from-green-400 to-emerald-500' :
            failureRisk === 'MEDIUM' ? 'bg-linear-to-br from-yellow-400 to-orange-500' :
            'bg-linear-to-br from-red-400 to-rose-500'
          }`}>
            {failureRisk[0]}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Last Updated */}
          <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
            <p className="text-xs font-medium text-blue-700">Last Update</p>
            <p className="mt-1 text-sm font-semibold text-blue-900">
              {getRelativeTime(lastUpdate)}
            </p>
          </div>

          {/* Health Status Label */}
          <div className={`rounded-lg p-3 border ${
            healthScore > 80 ? 'bg-green-50 border-green-200' :
            healthScore > 60 ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <p className="text-xs font-medium text-slate-600">Status</p>
            <p className={`mt-1 text-sm font-semibold ${
              healthScore > 80 ? 'text-green-700' :
              healthScore > 60 ? 'text-yellow-700' :
              'text-red-700'
            }`}>
              {healthScore > 80 ? 'Excellent' : healthScore > 60 ? 'Fair' : 'Poor'}
            </p>
          </div>
        </div>

        {/* View Details Button */}
        <button className="w-full rounded-lg bg-linear-to-r from-blue-500 to-indigo-600 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:from-blue-600 hover:to-indigo-700 flex items-center justify-center gap-2">
          <span>📊 View Details</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </button>
      </div>
    </div>
  );
};

export default DeviceCard;
