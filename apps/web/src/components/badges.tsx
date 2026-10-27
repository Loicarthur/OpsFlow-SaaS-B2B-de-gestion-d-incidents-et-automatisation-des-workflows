import type { TicketPriority, TicketStatus } from '@/lib/types';

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  WAITING: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-200 text-slate-600',
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

function Pill({
  className,
  children,
  testId,
}: {
  className: string;
  children: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Pill testId="ticket-status-badge" className={STATUS_STYLES[status]}>
      {status.replace('_', ' ')}
    </Pill>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Pill className={PRIORITY_STYLES[priority]}>{priority}</Pill>;
}

export function RoleBadge({ role }: { role: string }) {
  return <Pill className="bg-indigo-100 text-indigo-700">{role}</Pill>;
}
