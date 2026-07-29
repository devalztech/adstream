import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
  className?: string;
}

const trendColor: Record<NonNullable<StatCardProps['trend']>['direction'], string> = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
};

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {trend && <p className={cn('mt-1 text-xs font-medium', trendColor[trend.direction])}>{trend.value}</p>}
        </div>
        {Icon && (
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
