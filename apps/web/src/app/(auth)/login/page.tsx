'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { Button, Card, ErrorText, Field, TextInput } from '@/components/form-controls';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-slate-900">Sign in to OpsFlow</h1>
        <p className="mt-1 text-sm text-slate-500">Incident, ticket &amp; workflow automation.</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="Email">
            <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <TextInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          No account yet?{' '}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Create an organization
          </Link>
        </p>
      </Card>
    </div>
  );
}
