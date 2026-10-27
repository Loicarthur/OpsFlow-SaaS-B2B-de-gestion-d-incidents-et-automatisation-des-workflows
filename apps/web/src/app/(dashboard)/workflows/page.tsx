'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Workflow, WorkflowTriggerType } from '@/lib/types';
import { Button, Card, ErrorText, Field, Select, TextArea, TextInput } from '@/components/form-controls';

const TRIGGERS: WorkflowTriggerType[] = [
  'TICKET_CREATED',
  'TICKET_UPDATED',
  'TICKET_STATUS_CHANGED',
  'TICKET_PRIORITY_CHANGED',
  'SLA_BREACHED',
];

const CONDITIONS_PLACEHOLDER = '[{"field":"priority","operator":"equals","value":"CRITICAL"}]';
const ACTIONS_PLACEHOLDER =
  '[{"type":"SEND_NOTIFICATION","config":{"target":"assignee","title":"Critical ticket","body":"A critical ticket needs attention"}}]';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const data = await apiClient.get<Workflow[]>('/workflows');
    setWorkflows(data);
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, load() is also reused to refetch after creating a workflow
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Workflows</h1>
          <p className="text-sm text-slate-500">Automate actions when ticket events match conditions you define.</p>
        </div>
        <Button onClick={() => setIsFormOpen((v) => !v)}>{isFormOpen ? 'Close' : 'New workflow'}</Button>
      </div>

      {isFormOpen && (
        <CreateWorkflowForm
          onCreated={() => {
            setIsFormOpen(false);
            load();
          }}
        />
      )}

      <div className="flex flex-col gap-3">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {!isLoading && workflows.length === 0 && <p className="text-sm text-slate-500">No workflows yet.</p>}
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{workflow.name}</h3>
                <p className="text-sm text-slate-500">{workflow.description}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  workflow.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {workflow.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              Trigger: {workflow.triggerType.replaceAll('_', ' ')}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {workflow.actions.map((action) => (
                <li key={action.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {action.type.replaceAll('_', ' ')}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CreateWorkflowForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>('TICKET_CREATED');
  const [conditions, setConditions] = useState('');
  const [actions, setActions] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    let parsedConditions: unknown[] = [];
    let parsedActions: unknown[];
    try {
      parsedConditions = conditions ? JSON.parse(conditions) : [];
      parsedActions = JSON.parse(actions);
    } catch {
      setError('Conditions and actions must be valid JSON');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/workflows', {
        name,
        description,
        triggerType,
        conditions: parsedConditions,
        actions: parsedActions,
      });
      setName('');
      setDescription('');
      setConditions('');
      setActions('');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create workflow');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <TextInput required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Trigger">
            <Select value={triggerType} onChange={(e) => setTriggerType(e.target.value as WorkflowTriggerType)}>
              {TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {t.replaceAll('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description">
          <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Conditions (JSON array, optional — empty matches every event)">
          <TextArea rows={3} placeholder={CONDITIONS_PLACEHOLDER} value={conditions} onChange={(e) => setConditions(e.target.value)} />
        </Field>
        <Field label="Actions (JSON array)">
          <TextArea required rows={4} placeholder={ACTIONS_PLACEHOLDER} value={actions} onChange={(e) => setActions(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={isSubmitting} className="self-start">
          {isSubmitting ? 'Creating…' : 'Create workflow'}
        </Button>
      </form>
    </Card>
  );
}
