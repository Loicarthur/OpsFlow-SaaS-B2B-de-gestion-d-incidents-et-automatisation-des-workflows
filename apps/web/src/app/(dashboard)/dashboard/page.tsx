'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { DashboardStats } from '@/lib/types';
import { Card } from '@/components/form-controls';

function StatTile({ label, value, tone }: { label: string; value: number; tone?: 'danger' }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${tone === 'danger' ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<DashboardStats>('/dashboard/stats')
      .then(setStats)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <p className="text-sm text-slate-500">Loading dashboard…</p>;
  if (!stats) return <p className="text-sm text-slate-500">No data available.</p>;

  const openCount = stats.ticketsByStatus.find((s) => s.status === 'OPEN')?.count ?? 0;
  const criticalCount = stats.ticketsByPriority.find((p) => p.priority === 'CRITICAL')?.count ?? 0;
  const resolvedCount = stats.ticketsByStatus.find((s) => s.status === 'RESOLVED')?.count ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">An overview of your organization&apos;s support activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Open tickets" value={openCount} />
        <StatTile label="Critical priority" value={criticalCount} />
        <StatTile label="Resolved" value={resolvedCount} />
        <StatTile label="SLA overdue" value={stats.overdueSlaCount} tone={stats.overdueSlaCount > 0 ? 'danger' : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-700">Tickets by status</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {stats.ticketsByStatus.map((row) => (
              <li key={row.status} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{row.status.replace('_', ' ')}</span>
                <span className="font-semibold text-slate-900">{row.count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-700">Tickets by priority</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {stats.ticketsByPriority.map((row) => (
              <li key={row.priority} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{row.priority}</span>
                <span className="font-semibold text-slate-900">{row.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-700">Recent activity</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {stats.recentActivity.length === 0 && <p className="text-sm text-slate-500">No activity yet.</p>}
          {stats.recentActivity.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm last:border-0">
              <span className="text-slate-600">
                <span className="font-medium text-slate-900">{entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System'}</span>{' '}
                {entry.action.toLowerCase().replaceAll('_', ' ')}
              </span>
              <span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
