import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { AdUnitStatus, CampaignStatus, WebsiteStatus, WithdrawalStatus } from '@/types/api';

type AnyStatus = CampaignStatus | WebsiteStatus | WithdrawalStatus | AdUnitStatus | string;

/**
 * One mapping of status string → badge variant + label, used by every
 * table and detail page across campaigns/websites/withdrawals/ad-units.
 * Adding a new status anywhere in the app means adding one line here,
 * not touching N components.
 */
const STATUS_MAP: Record<string, { variant: BadgeProps['variant']; label: string }> = {
  // Campaigns
  draft: { variant: 'muted', label: 'Draft' },
  pending_approval: { variant: 'warning', label: 'Pending Approval' },
  active: { variant: 'success', label: 'Active' },
  paused: { variant: 'secondary', label: 'Paused' },
  completed: { variant: 'outline', label: 'Completed' },
  rejected: { variant: 'destructive', label: 'Rejected' },
  archived: { variant: 'muted', label: 'Archived' },

  // Websites (some overlap with campaign statuses is intentional — same meaning)
  pending: { variant: 'warning', label: 'Pending' },
  verified: { variant: 'secondary', label: 'Verified' },
  approved: { variant: 'success', label: 'Approved' },
  suspended: { variant: 'destructive', label: 'Suspended' },

  // Withdrawals
  processing: { variant: 'warning', label: 'Processing' },
  failed: { variant: 'destructive', label: 'Failed' },
};

export function StatusBadge({ status, className }: { status: AnyStatus; className?: string }) {
  const entry = STATUS_MAP[status] ?? { variant: 'outline' as const, label: status };
  return (
    <Badge variant={entry.variant} className={className}>
      {entry.label}
    </Badge>
  );
}
