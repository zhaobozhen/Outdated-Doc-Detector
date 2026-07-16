import {
  FileCheck2,
  FileClock,
  FileWarning,
  FileX2,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

import type { FreshnessKind } from '../lib/analysis/classify';

type FreshnessIconState = FreshnessKind | 'neutral';

const icons: Record<FreshnessIconState, LucideIcon> = {
  neutral: FileClock,
  current: FileCheck2,
  behind: FileClock,
  outdated: FileWarning,
  stale: FileX2,
};

interface FreshnessIconProps extends Omit<LucideProps, 'ref'> {
  state?: FreshnessIconState;
}

export function FreshnessIcon({ state = 'neutral', ...props }: FreshnessIconProps) {
  const Icon = icons[state];
  return <Icon {...props} aria-hidden="true" data-state={state} />;
}
