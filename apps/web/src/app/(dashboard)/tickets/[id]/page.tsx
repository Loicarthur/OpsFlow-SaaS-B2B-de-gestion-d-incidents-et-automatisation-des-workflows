'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { AuditLogEntry, Membership, Ticket, TicketPriority, TicketStatus } from '@/lib/types';
import { PriorityBadge, StatusBadge } from '@/components/badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Field } from '@/components/form-field';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@opsflow/shared';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const UNASSIGNED = 'UNASSIGNED';

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
    if (!ticket || assigneeId === UNASSIGNED) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.post<Ticket>(`/tickets/${ticket.id}/assign`, { assigneeId });
      setTicket(updated);
      await load();
    } finally {
      setIsSaving(false);
    }
  }

  if (!ticket) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-80" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-40 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const canUpdate = can(Permission.TICKET_UPDATE);
  const canAssign = can(Permission.TICKET_ASSIGN);
  const isDone = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{ticket.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{ticket.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <Field label="Status" htmlFor="status">
              <Select disabled={!canUpdate || isSaving} value={ticket.status} onValueChange={(v) => v && updateField('status', v)}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue>{(value: string) => value.replace('_', ' ')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority" htmlFor="priority">
              <Select disabled={!canUpdate || isSaving} value={ticket.priority} onValueChange={(v) => v && updateField('priority', v)}>
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Assignee" htmlFor="assignee">
              <Select disabled={!canAssign || isSaving} value={ticket.assignedToId ?? UNASSIGNED} onValueChange={(v) => v && assignTo(v)}>
                <SelectTrigger id="assignee" className="w-full">
                  <SelectValue>
                    {(value: string) => {
                      if (value === UNASSIGNED) return 'Unassigned';
                      const member = members.find((m) => m.userId === value);
                      return member ? `${member.user.firstName} ${member.user.lastName}` : 'Unassigned';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.user.firstName} {m.user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {canUpdate && !isDone && (
              <Button onClick={() => updateField('status', 'RESOLVED')} disabled={isSaving} className="mt-1">
                <CheckCircle2 />
                Mark as resolved
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System / workflow'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.action.toLowerCase().replaceAll('_', ' ')}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
