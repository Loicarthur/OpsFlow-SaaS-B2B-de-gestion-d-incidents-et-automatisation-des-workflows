'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Zap } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { Workflow, WorkflowTriggerType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, ErrorText } from '@/components/form-field';

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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Workflows</h1>
          <p className="text-sm text-muted-foreground">Automate actions when ticket events match conditions you define.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus />
                New workflow
              </Button>
            }
          />
          <CreateWorkflowDialog
            onCreated={() => {
              setIsFormOpen(false);
              load();
            }}
          />
        </Dialog>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        )}
        {!isLoading && workflows.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Zap className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No workflows yet. Create one to automate ticket handling.</p>
            </CardContent>
          </Card>
        )}
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{workflow.name}</CardTitle>
                  {workflow.description && <p className="mt-1 text-sm text-muted-foreground">{workflow.description}</p>}
                </div>
                <Badge
                  variant="outline"
                  className={workflow.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}
                >
                  {workflow.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Trigger: {workflow.triggerType.replaceAll('_', ' ')}
              </p>
              <div className="flex flex-wrap gap-2">
                {workflow.actions.map((action) => (
                  <Badge key={action.id} variant="secondary">
                    {action.type.replaceAll('_', ' ')}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CreateWorkflowDialog({ onCreated }: { onCreated: () => void }) {
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
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>New workflow</DialogTitle>
        <DialogDescription>Define a trigger, optional conditions, and the actions to run.</DialogDescription>
      </DialogHeader>
      <form id="create-workflow-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" htmlFor="workflow-name">
            <Input id="workflow-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Trigger" htmlFor="workflow-trigger">
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as WorkflowTriggerType)}>
              <SelectTrigger id="workflow-trigger" className="w-full">
                <SelectValue>{(value: string) => value.replaceAll('_', ' ')}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Description" htmlFor="workflow-description">
          <Input id="workflow-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Conditions (JSON array, optional — empty matches every event)" htmlFor="workflow-conditions">
          <Textarea
            id="workflow-conditions"
            rows={3}
            className="font-mono text-xs"
            placeholder={CONDITIONS_PLACEHOLDER}
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
          />
        </Field>
        <Field label="Actions (JSON array)" htmlFor="workflow-actions">
          <Textarea
            id="workflow-actions"
            required
            rows={4}
            className="font-mono text-xs"
            placeholder={ACTIONS_PLACEHOLDER}
            value={actions}
            onChange={(e) => setActions(e.target.value)}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
      </form>
      <DialogFooter>
        <Button type="submit" form="create-workflow-form" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create workflow'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
