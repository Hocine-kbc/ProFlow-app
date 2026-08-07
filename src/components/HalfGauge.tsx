interface HalfGaugeProps {
  percentage: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  trackClassName?: string;
  className?: string;
}

export default function HalfGauge({
  percentage,
  color,
  size = 56,
  strokeWidth = 7,
  trackClassName = 'text-gray-200 dark:text-gray-700',
  className = '',
}: HalfGaugeProps) {
  const clamped = Math.max(0, Math.min(percentage, 100));
  const r = (size - strokeWidth) / 2;
  const cy = r + strokeWidth / 2;
  const height = r + strokeWidth;
  const arcLength = Math.PI * r;
  const offset = arcLength - (clamped / 100) * arcLength;
  const d = `M ${strokeWidth / 2} ${cy} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${cy}`;

  const fontSize = Math.max(11, Math.round(size * 0.24));

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height }}>
      <svg width={size} height={height} viewBox={`0 0 ${size} ${height}`} className="relative">
        <path d={d} fill="none" stroke="currentColor" className={trackClassName} strokeWidth={strokeWidth} strokeLinecap="round" />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <span
        className="absolute inset-x-0 bottom-0 text-center font-extrabold leading-none"
        style={{ fontSize, color }}
      >
        {Math.round(clamped)}%
      </span>
    </div>
  );
}
