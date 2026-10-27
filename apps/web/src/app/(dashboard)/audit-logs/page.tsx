'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { AuditLogEntry } from '@/lib/types';
import { Card } from '@/components/form-controls';

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
        <h1 className="text-2xl font-semibold text-slate-900">Audit logs</h1>
        <p className="text-sm text-slate-500">A complete trail of every meaningful action in your organization.</p>
      </div>

      <Card>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Resource</th>
              <th className="px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && logs.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  No activity recorded yet.
                </td>
              </tr>
            )}
            {logs.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System / workflow'}
                </td>
                <td className="px-4 py-3 text-slate-600">{entry.action.replaceAll('_', ' ')}</td>
                <td className="px-4 py-3 text-slate-500">{entry.resourceType}</td>
                <td className="px-4 py-3 text-slate-400">{new Date(entry.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
