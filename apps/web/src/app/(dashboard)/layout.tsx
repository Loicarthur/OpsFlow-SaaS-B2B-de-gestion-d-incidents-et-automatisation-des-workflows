'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  Workflow,
  Users,
  ScrollText,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@opsflow/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const NAV_ITEMS: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; permission?: Permission }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: Permission.DASHBOARD_VIEW },
  { href: '/tickets', label: 'Tickets', icon: TicketIcon, permission: Permission.TICKET_VIEW },
  { href: '/workflows', label: 'Workflows', icon: Workflow, permission: Permission.WORKFLOW_MANAGE },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/audit-logs', label: 'Audit logs', icon: ScrollText, permission: Permission.AUDIT_LOG_VIEW },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, isLoading, logout, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !session) router.replace('/login');
  }, [isLoading, session, router]);

  if (isLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Workflow className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-sidebar-foreground">OpsFlow</p>
            <p className="truncate text-xs text-muted-foreground">{session.organization.name}</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV_ITEMS.filter((item) => !item.permission || can(item.permission)).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-3" />

        <div className="flex items-center gap-2.5 px-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials(session.user.firstName, session.user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {session.user.firstName} {session.user.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{session.role}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => logout()} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-background p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
