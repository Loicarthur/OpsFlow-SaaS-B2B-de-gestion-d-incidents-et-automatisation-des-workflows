'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { Membership } from '@/lib/types';
import { RoleBadge } from '@/components/badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Field, ErrorText } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { OrgRole, Permission } from '@opsflow/shared';

const ROLES: OrgRole[] = [OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MANAGER, OrgRole.AGENT, OrgRole.VIEWER];

export default function TeamPage() {
  const { can, session } = useAuth();
  const [members, setMembers] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const data = await apiClient.get<Membership[]>('/organizations/members');
    setMembers(data);
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, load() is also reused to refetch after actions
    load();
  }, []);

  async function changeRole(membershipId: string, role: OrgRole) {
    await apiClient.patch(`/organizations/members/${membershipId}/role`, { role });
    load();
  }

  async function removeMember(membershipId: string) {
    await apiClient.delete(`/organizations/members/${membershipId}`);
    load();
  }

  const canInvite = can(Permission.MEMBER_INVITE);
  const canChangeRole = can(Permission.MEMBER_ROLE_CHANGE);
  const canRemove = can(Permission.MEMBER_REMOVE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Team</h1>
        <p className="text-sm text-muted-foreground">Manage members and roles for your organization.</p>
      </div>

      {canInvite && <InviteForm onInvited={load} />}

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {(canChangeRole || canRemove) && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  {member.user.firstName} {member.user.lastName}
                </TableCell>
                <TableCell className="text-muted-foreground">{member.user.email}</TableCell>
                <TableCell>
                  {canChangeRole && member.userId !== session?.user.id ? (
                    <Select value={member.role} onValueChange={(v) => changeRole(member.id, v as OrgRole)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <RoleBadge role={member.role} />
                  )}
                </TableCell>
                {(canChangeRole || canRemove) && (
                  <TableCell className="text-right">
                    {canRemove && member.userId !== session?.user.id && (
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              Remove
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {member.user.firstName} {member.user.lastName}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              They will immediately lose access to this organization. This can&apos;t be undone from here.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-white hover:bg-destructive/90"
                              onClick={() => removeMember(member.id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function InviteForm({ onInvited }: { onInvited: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>(OrgRole.AGENT);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/organizations/invitations', { email, role });
      setSuccess(`Invitation sent to ${email}`);
      setEmail('');
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <form className="flex items-end gap-3" onSubmit={handleSubmit}>
          <Field label="Invite by email" htmlFor="invite-email" className="flex-1">
            <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Role" htmlFor="invite-role">
            <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
              <SelectTrigger id="invite-role" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.filter((r) => r !== OrgRole.OWNER).map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" disabled={isSubmitting}>
            <UserPlus />
            {isSubmitting ? 'Sending…' : 'Send invite'}
          </Button>
        </form>
        {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
        {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}
      </CardContent>
    </Card>
  );
}
