'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AnalyticsRange } from '@/types/api';

const RANGES: Array<{ value: AnalyticsRange; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'year', label: '1 year' },
];

export function RangeSelect({
  value,
  onChange,
}: {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-1" role="group" aria-label="Date range">
      {RANGES.map((r) => (
        <Button
          key={r.value}
          type="button"
          size="sm"
          variant="ghost"
          aria-pressed={value === r.value}
          onClick={() => onChange(r.value)}
          className={cn('h-8 px-3', value === r.value && 'bg-primary text-primary-foreground hover:bg-primary/90')}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}
