import AnimatedNumber from './AnimatedNumber.tsx';

interface CircularGaugeProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  trackClassName?: string;
  gradientFrom: string;
  gradientTo: string;
  gradientId: string;
  label?: string;
  centerValue?: string;
}

export default function CircularGauge({
  percentage,
  size = 96,
  strokeWidth = 10,
  trackClassName = 'text-gray-200 dark:text-gray-700',
  gradientFrom,
  gradientTo,
  gradientId,
  label,
  centerValue,
}: CircularGaugeProps) {
  const clamped = Math.max(0, Math.min(percentage, 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-gray-900 dark:text-white leading-none">
          <AnimatedNumber value={clamped} format={(v) => `${v.toFixed(0)}%`} />
        </span>
        {centerValue && (
          <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-1">{centerValue}</span>
        )}
      </div>
      {label && (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}
