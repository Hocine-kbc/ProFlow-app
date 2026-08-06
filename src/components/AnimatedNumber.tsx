import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

export default function AnimatedNumber({ value, format, duration = 700, className }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);
  const frameRef = useRef<number>();

  useEffect(() => {
    const from = previousValueRef.current;
    const to = value;

    if (from === to) {
      setDisplayValue(to);
      return;
    }

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      setDisplayValue(from + (to - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        previousValueRef.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className={className}>
      {format ? format(displayValue) : Math.round(displayValue).toLocaleString('fr-FR')}
    </span>
  );
}
