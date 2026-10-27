'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@opsflow/shared';

const NAV_ITEMS: { href: string; label: string; permission?: Permission }[] = [
  { href: '/dashboard', label: 'Dashboard', permission: Permission.DASHBOARD_VIEW },
  { href: '/tickets', label: 'Tickets', permission: Permission.TICKET_VIEW },
  { href: '/workflows', label: 'Workflows', permission: Permission.WORKFLOW_MANAGE },
  { href: '/team', label: 'Team' },
  { href: '/audit-logs', label: 'Audit logs', permission: Permission.AUDIT_LOG_VIEW },
  { href: '/settings', label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, isLoading, logout, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !session) router.replace('/login');
  }, [isLoading, session, router]);

  if (isLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white px-4 py-6">
        <div className="mb-8 px-2">
          <p className="text-lg font-bold text-indigo-600">OpsFlow</p>
          <p className="truncate text-xs text-slate-500">{session.organization.name}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.filter((item) => !item.permission || can(item.permission)).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 pt-4">
          <p className="truncate text-sm font-medium text-slate-700">
            {session.user.firstName} {session.user.lastName}
          </p>
          <p className="truncate text-xs text-slate-500">{session.role}</p>
          <button
            onClick={() => logout()}
            className="mt-2 text-sm font-medium text-slate-500 hover:text-red-600"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">{children}</main>
    </div>
  );
}
