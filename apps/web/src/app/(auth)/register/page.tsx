'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Workflow } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, ErrorText } from '@/components/form-field';

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
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Workflow className="h-5 w-5" />
            <span className="text-sm font-semibold">OpsFlow</span>
          </div>
          <CardTitle className="text-xl">Create your organization</CardTitle>
          <CardDescription>You&apos;ll be the owner and can invite teammates after.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Field label="Organization name" htmlFor="organizationName">
              <Input id="organizationName" required value={form.organizationName} onChange={update('organizationName')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" htmlFor="firstName">
                <Input id="firstName" required value={form.firstName} onChange={update('firstName')} />
              </Field>
              <Field label="Last name" htmlFor="lastName">
                <Input id="lastName" required value={form.lastName} onChange={update('lastName')} />
              </Field>
            </div>
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" required value={form.email} onChange={update('email')} />
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
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Creating…' : 'Create organization'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
