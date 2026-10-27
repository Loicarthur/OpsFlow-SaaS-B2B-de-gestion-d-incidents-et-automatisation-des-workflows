import type { TicketPriority, TicketStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  WAITING: 'bg-purple-50 text-purple-700 border-purple-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-muted text-muted-foreground border-border',
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  LOW: 'bg-muted text-muted-foreground border-border',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge data-testid="ticket-status-badge" variant="outline" className={STATUS_STYLES[status]}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant="outline" className={PRIORITY_STYLES[priority]}>
      {priority}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant="outline" className="bg-accent text-accent-foreground border-accent">
      {role}
    </Badge>
  );
}
