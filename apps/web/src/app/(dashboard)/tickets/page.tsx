'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResult, Ticket, TicketPriority, TicketStatus } from '@/lib/types';
import { PriorityBadge, StatusBadge } from '@/components/badges';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Field, ErrorText } from '@/components/form-field';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@opsflow/shared';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function TicketsPage() {
  const { can } = useAuth();
  const [result, setResult] = useState<PaginatedResult<Ticket> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);
    const data = await apiClient.get<PaginatedResult<Ticket>>(`/tickets?${params.toString()}`);
    setResult(data);
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-filter-change, load() is also reused after creating a ticket
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tickets</h1>
          <p className="text-sm text-muted-foreground">All incidents and requests for your organization.</p>
        </div>
        {can(Permission.TICKET_CREATE) && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus />
            New ticket
          </Button>
        )}
      </div>

      <CreateTicketSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={() => {
          setIsCreateOpen(false);
          load();
        }}
      />

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses">
              {(value: string) => (value === 'ALL' ? 'All statuses' : value.replace('_', ' '))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All priorities">
              {(value: string) => (value === 'ALL' ? 'All priorities' : value)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && result?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No tickets found.
                </TableCell>
              </TableRow>
            )}
            {result?.items.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <Link href={`/tickets/${ticket.id}`} className="font-medium text-primary hover:underline">
                    {ticket.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={ticket.status} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={ticket.priority} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : '—'}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(ticket.updatedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function CreateTicketSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/tickets', { title, description, priority });
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New ticket</SheetTitle>
          <SheetDescription>Describe the incident or request.</SheetDescription>
        </SheetHeader>
        <form id="create-ticket-form" className="flex flex-col gap-4 px-4" onSubmit={handleSubmit}>
          <Field label="Title" htmlFor="title">
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Priority" htmlFor="priority">
            <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
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
          <ErrorText>{error}</ErrorText>
        </form>
        <SheetFooter>
          <Button type="submit" form="create-ticket-form" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create ticket'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
