import type { FreshnessKind } from '../lib/analysis/classify';

interface DocumentClockIconProps {
  state?: FreshnessKind | 'neutral';
  size?: number;
  className?: string;
}

export function DocumentClockIcon({
  state = 'neutral',
  size = 32,
  className,
}: DocumentClockIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      data-state={state}
      fill="none"
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      <path
        d="M10 5.5h17l9 9v13.25a14 14 0 0 0-4-2.4V16h-7V9.5H14v27h10.25c.35 1.42.9 2.77 1.62 4H10V5.5Z"
        fill="currentColor"
      />
      <path d="M27.5 9.3V14h4.7l-4.7-4.7Z" fill="var(--od-surface)" />
      <circle cx="34" cy="35" r="10.5" fill="var(--od-surface)" stroke="currentColor" strokeWidth="3" />
      <path d="M34 29.5v6l4 2.25" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}
