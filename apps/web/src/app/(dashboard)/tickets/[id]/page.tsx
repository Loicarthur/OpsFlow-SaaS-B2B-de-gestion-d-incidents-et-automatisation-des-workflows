'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { AuditLogEntry, Membership, Ticket, TicketPriority, TicketStatus } from '@/lib/types';
import { PriorityBadge, StatusBadge } from '@/components/badges';
import { Button, Card, Field, Select } from '@/components/form-controls';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@opsflow/shared';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    const [ticketData, membersData, logsData] = await Promise.all([
      apiClient.get<Ticket>(`/tickets/${id}`),
      apiClient.get<Membership[]>('/organizations/members'),
      apiClient.get<AuditLogEntry[]>(`/audit-logs?ticketId=${id}`),
    ]);
    setTicket(ticketData);
    setMembers(membersData);
    setAuditLogs(logsData);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, load() is also reused to refetch after actions
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateField(field: 'status' | 'priority', value: string) {
    if (!ticket) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.patch<Ticket>(`/tickets/${ticket.id}`, { [field]: value });
      setTicket(updated);
      await load();
    } finally {
      setIsSaving(false);
    }
  }

  async function assignTo(assigneeId: string) {
    if (!ticket || !assigneeId) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.post<Ticket>(`/tickets/${ticket.id}/assign`, { assigneeId });
      setTicket(updated);
      await load();
    } finally {
      setIsSaving(false);
    }
  }

  if (!ticket) return <p className="text-sm text-slate-500">Loading…</p>;

  const canUpdate = can(Permission.TICKET_UPDATE);
  const canAssign = can(Permission.TICKET_ASSIGN);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{ticket.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{ticket.description}</p>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <Field label="Status">
            <Select
              disabled={!canUpdate || isSaving}
              value={ticket.status}
              onChange={(e) => updateField('status', e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select
              disabled={!canUpdate || isSaving}
              value={ticket.priority}
              onChange={(e) => updateField('priority', e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assignee">
            <Select
              disabled={!canAssign || isSaving}
              value={ticket.assignedToId ?? ''}
              onChange={(e) => assignTo(e.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.firstName} {m.user.lastName}
                </option>
              ))}
            </Select>
          </Field>
          {canUpdate && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
            <Button onClick={() => updateField('status', 'RESOLVED')} disabled={isSaving}>
              Mark as resolved
            </Button>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-700">Activity</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {auditLogs.length === 0 && <p className="text-sm text-slate-500">No activity recorded yet.</p>}
          {auditLogs.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm last:border-0">
              <span className="text-slate-600">
                <span className="font-medium text-slate-900">
                  {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System / workflow'}
                </span>{' '}
                {entry.action.toLowerCase().replaceAll('_', ' ')}
              </span>
              <span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
