'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Membership } from '@/lib/types';
import { RoleBadge } from '@/components/badges';
import { Button, Card, ErrorText, Field, Select, TextInput } from '@/components/form-controls';
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
        <h1 className="text-2xl font-semibold text-slate-900">Team</h1>
        <p className="text-sm text-slate-500">Manage members and roles for your organization.</p>
      </div>

      {canInvite && <InviteForm onInvited={load} />}

      <Card>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              {(canChangeRole || canRemove) && <th className="px-4 py-3 font-medium">Actions</th>}
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
            {members.map((member) => (
              <tr key={member.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {member.user.firstName} {member.user.lastName}
                </td>
                <td className="px-4 py-3 text-slate-600">{member.user.email}</td>
                <td className="px-4 py-3">
                  {canChangeRole && member.userId !== session?.user.id ? (
                    <Select value={member.role} onChange={(e) => changeRole(member.id, e.target.value as OrgRole)}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <RoleBadge role={member.role} />
                  )}
                </td>
                {(canChangeRole || canRemove) && (
                  <td className="px-4 py-3">
                    {canRemove && member.userId !== session?.user.id && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
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
    <Card className="p-5">
      <form className="flex items-end gap-3" onSubmit={handleSubmit}>
        <Field label="Invite by email" className="flex-1">
          <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
            {ROLES.filter((r) => r !== OrgRole.OWNER).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send invite'}
        </Button>
      </form>
      {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
      {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}
    </Card>
  );
}
