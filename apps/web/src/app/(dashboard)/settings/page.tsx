'use client';

import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/form-controls';

export default function SettingsPage() {
  const { session } = useAuth();
  if (!session) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Your account and organization details.</p>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-700">Account</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <dt className="text-slate-500">Name</dt>
          <dd className="text-slate-900">
            {session.user.firstName} {session.user.lastName}
          </dd>
          <dt className="text-slate-500">Email</dt>
          <dd className="text-slate-900">{session.user.email}</dd>
          <dt className="text-slate-500">Role</dt>
          <dd className="text-slate-900">{session.role}</dd>
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-700">Organization</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <dt className="text-slate-500">Name</dt>
          <dd className="text-slate-900">{session.organization.name}</dd>
          <dt className="text-slate-500">Organization ID</dt>
          <dd className="font-mono text-xs text-slate-500">{session.organization.id}</dd>
        </dl>
      </Card>
    </div>
  );
}
