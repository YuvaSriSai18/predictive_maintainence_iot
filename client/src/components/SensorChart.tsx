// Real-time sensor data chart component
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useLiveSensors } from '../hooks/useLiveSensors';
import {
  transformSensorDataForChart,
  formatTooltipTimestamp,
  CHART_COLORS,
} from '../utils/chartHelpers';

interface SensorChartProps {
  deviceId: string;
  title?: string;
}

export const SensorChart: React.FC<SensorChartProps> = ({
  deviceId,
  title,
}) => {
  const { getDeviceSensors, isConnected } = useLiveSensors({ deviceFilter: [deviceId] });

  const chartData = useMemo(() => {
    const readings = getDeviceSensors(deviceId);
    return transformSensorDataForChart(readings);
  }, [getDeviceSensors, deviceId]);

  const CustomTooltip = (props: any) => {
    const { active, payload } = props;
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="text-xs font-semibold text-slate-700">
          {formatTooltipTimestamp(data.timestamp)}
        </p>
        <div className="mt-2 space-y-1">
          {payload.map((entry: any, idx: number) => (
            <p key={idx} style={{ color: entry.color }} className="text-xs font-medium">
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </p>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">
          {title || `Sensor Data - ${deviceId}`}
        </CardTitle>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-xs text-slate-500">
            {isConnected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {!isConnected && chartData.length === 0 ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-300 border-t-blue-600"></div>
              <p className="text-sm text-slate-600">Connecting to live stream...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-96 items-center justify-center">
            <p className="text-sm text-slate-500">Waiting for sensor data...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12, fill: '#64748b' }}
                stroke="#cbd5e1"
                label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: '#64748b' }}
                stroke="#cbd5e1"
                label={{ value: 'Vibration / Pressure', angle: 90, position: 'insideRight' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="temperature"
                stroke={CHART_COLORS.temperature}
                dot={false}
                strokeWidth={2}
                name="Temperature (°C)"
                isAnimationActive={false}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="vibration"
                stroke={CHART_COLORS.vibration}
                dot={false}
                strokeWidth={2}
                name="Vibration (mm/s)"
                isAnimationActive={false}
              />

              {/* Pressure Line - Real-time streaming */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="pressure"
                stroke={CHART_COLORS.pressure}
                dot={false}
                strokeWidth={2}
                name="Pressure (bar)"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SensorChart;
