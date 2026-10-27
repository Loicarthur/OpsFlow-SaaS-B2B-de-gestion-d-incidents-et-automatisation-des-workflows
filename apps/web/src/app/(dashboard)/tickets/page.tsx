'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResult, Ticket, TicketPriority, TicketStatus } from '@/lib/types';
import { PriorityBadge, StatusBadge } from '@/components/badges';
import { Button, Card, ErrorText, Field, Select, TextArea, TextInput } from '@/components/form-controls';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@opsflow/shared';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function TicketsPage() {
  const { can } = useAuth();
  const [result, setResult] = useState<PaginatedResult<Ticket> | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
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
          <h1 className="text-2xl font-semibold text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-500">All incidents and requests for your organization.</p>
        </div>
        {can(Permission.TICKET_CREATE) && (
          <Button onClick={() => setIsCreateOpen((v) => !v)}>{isCreateOpen ? 'Close' : 'New ticket'}</Button>
        )}
      </div>

      {isCreateOpen && (
        <CreateTicketForm
          onCreated={() => {
            setIsCreateOpen(false);
            load();
          }}
        />
      )}

      <div className="flex gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
        <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && result?.items.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  No tickets found.
                </td>
              </tr>
            )}
            {result?.items.map((ticket) => (
              <tr key={ticket.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/tickets/${ticket.id}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                    {ticket.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400">{new Date(ticket.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function CreateTicketForm({ onCreated }: { onCreated: () => void }) {
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
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="Title">
          <TextInput required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Description">
          <TextArea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={isSubmitting} className="self-start">
          {isSubmitting ? 'Creating…' : 'Create ticket'}
        </Button>
      </form>
    </Card>
  );
}
