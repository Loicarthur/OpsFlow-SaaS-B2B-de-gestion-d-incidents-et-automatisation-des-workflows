'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { Button, Card, ErrorText, Field, TextInput } from '@/components/form-controls';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    organizationName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
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
      await register(form);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create your organization');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-semibold text-slate-900">Create your organization</h1>
        <p className="mt-1 text-sm text-slate-500">You&apos;ll be the owner and can invite teammates after.</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="Organization name">
            <TextInput required value={form.organizationName} onChange={update('organizationName')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <TextInput required value={form.firstName} onChange={update('firstName')} />
            </Field>
            <Field label="Last name">
              <TextInput required value={form.lastName} onChange={update('lastName')} />
            </Field>
          </div>
          <Field label="Email">
            <TextInput type="email" required value={form.email} onChange={update('email')} />
          </Field>
          <Field label="Password">
            <TextInput type="password" required minLength={8} value={form.password} onChange={update('password')} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create organization'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
