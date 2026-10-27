'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDot, Flame } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { DashboardStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'danger';
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between py-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${tone === 'danger' && value > 0 ? 'text-destructive' : 'text-foreground'}`}>
            {value}
          </p>
        </div>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            tone === 'danger' && value > 0 ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground'
          }`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardContent>
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!stats) return <p className="text-sm text-muted-foreground">No data available.</p>;

  const openCount = stats.ticketsByStatus.find((s) => s.status === 'OPEN')?.count ?? 0;
  const criticalCount = stats.ticketsByPriority.find((p) => p.priority === 'CRITICAL')?.count ?? 0;
  const resolvedCount = stats.ticketsByStatus.find((s) => s.status === 'RESOLVED')?.count ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">An overview of your organization&apos;s support activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Open tickets" value={openCount} icon={CircleDot} />
        <StatTile label="Critical priority" value={criticalCount} icon={Flame} />
        <StatTile label="Resolved" value={resolvedCount} icon={CheckCircle2} />
        <StatTile label="SLA overdue" value={stats.overdueSlaCount} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Tickets by status</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {stats.ticketsByStatus.map((row) => (
                <li key={row.status} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.status.replace('_', ' ')}</span>
                  <span className="font-semibold tabular-nums text-foreground">{row.count}</span>
                </li>
              ))}
              {stats.ticketsByStatus.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Tickets by priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {stats.ticketsByPriority.map((row) => (
                <li key={row.priority} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.priority}</span>
                  <span className="font-semibold tabular-nums text-foreground">{row.count}</span>
                </li>
              ))}
              {stats.ticketsByPriority.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentActivity.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.action.toLowerCase().replaceAll('_', ' ')}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
