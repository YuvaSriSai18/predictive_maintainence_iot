// Health score circular gauge component with color-coded thresholds
import React from 'react';

interface HealthGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const HealthGauge: React.FC<HealthGaugeProps> = ({
  score,
  size = 'md',
  showLabel = true,
}) => {

  // Determine color based on score
  const getColor = (value: number) => {
    if (value > 80) return { bg: 'bg-green-500', text: 'text-green-600' };
    if (value >= 60) return { bg: 'bg-yellow-500', text: 'text-yellow-600' };
    return { bg: 'bg-red-500', text: 'text-red-600' };
  };

  const getStatus = (value: number) => {
    if (value > 80) return 'Healthy';
    if (value >= 60) return 'Degrading';
    return 'Critical';
  };

  const color = getColor(clampedScore);
  const status = getStatus(clampedScore);

  // Determine size dimensions
  const sizeMap = {
    sm: { container: 'w-16 h-16', text: 'text-sm', font: 'font-semibold' },
    md: { container: 'w-24 h-24', text: 'text-lg', font: 'font-bold' },
    lg: { container: 'w-32 h-32', text: 'text-2xl', font: 'font-bold' },
  };

  const dimensions = sizeMap[size];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Circular Gauge */}
      <div className="relative inline-flex items-center justify-center">
        {/* Background circle */}
        <svg
          className={`${dimensions.container} transform -rotate-90`}
          viewBox="0 0 100 100"
        >
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-slate-200"
          />

          {/* Colored progress */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={`${clampedScore * 2.827} 282.7`}
            className={color.text}
            strokeLinecap="round"
          />
        </svg>

        {/* Center content */}
        <div className="absolute flex flex-col items-center justify-center gap-1">
          <span className={`${dimensions.text} ${dimensions.font} ${color.text}`}>
            {clampedScore}
          </span>
          <span className="text-xs font-medium text-slate-500">Score</span>
        </div>
      </div>

      {/* Status Label */}
      {showLabel && (
        <div className="flex flex-col items-center gap-1">
          <span className={`text-xs font-semibold ${color.text}`}>
            {status}
          </span>
          <div
            className={`h-1.5 w-12 rounded-full ${color.bg}`}
          ></div>
        </div>
      )}
    </div>
  );
};

export default HealthGauge;
