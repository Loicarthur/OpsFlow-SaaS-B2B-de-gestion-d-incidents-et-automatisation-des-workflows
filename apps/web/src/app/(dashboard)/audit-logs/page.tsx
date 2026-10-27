'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { AuditLogEntry } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<AuditLogEntry[]>('/audit-logs')
      .then(setLogs)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Audit logs</h1>
        <p className="text-sm text-muted-foreground">A complete trail of every meaningful action in your organization.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No activity recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {logs.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System / workflow'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.action.replaceAll('_', ' ')}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.resourceType}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
