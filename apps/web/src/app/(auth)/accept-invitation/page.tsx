'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Workflow } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, ErrorText } from '@/components/form-field';

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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="mb-1 flex items-center gap-2 text-primary">
          <Workflow className="h-5 w-5" />
          <span className="text-sm font-semibold">OpsFlow</span>
        </div>
        <CardTitle className="text-xl">Join your team</CardTitle>
        <CardDescription>Set your name and password to activate your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="First name" htmlFor="firstName">
            <Input id="firstName" required value={form.firstName} onChange={update('firstName')} />
          </Field>
          <Field label="Last name" htmlFor="lastName">
            <Input id="lastName" required value={form.lastName} onChange={update('lastName')} />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={update('password')}
            />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={isSubmitting || !token} className="w-full">
            {isSubmitting ? 'Joining…' : 'Accept invitation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/30 p-6">
      <Suspense fallback={null}>
        <AcceptInvitationForm />
      </Suspense>
    </div>
  );
}
