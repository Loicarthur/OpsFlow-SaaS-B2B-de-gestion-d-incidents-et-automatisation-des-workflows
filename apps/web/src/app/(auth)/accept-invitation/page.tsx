'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';
import { Button, Card, ErrorText, Field, TextInput } from '@/components/form-controls';

function AcceptInvitationForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/invitations/accept', { token, ...form }, { skipAuth: true });
      router.push('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to accept invitation');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm p-8">
      <h1 className="text-xl font-semibold text-slate-900">Join your team on OpsFlow</h1>
      <p className="mt-1 text-sm text-slate-500">Set your name and password to activate your account.</p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="First name">
          <TextInput required value={form.firstName} onChange={update('firstName')} />
        </Field>
        <Field label="Last name">
          <TextInput required value={form.lastName} onChange={update('lastName')} />
        </Field>
        <Field label="Password">
          <TextInput type="password" required minLength={8} value={form.password} onChange={update('password')} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={isSubmitting || !token}>
          {isSubmitting ? 'Joining…' : 'Accept invitation'}
        </Button>
      </form>
    </Card>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <Suspense fallback={null}>
        <AcceptInvitationForm />
      </Suspense>
    </div>
  );
}
