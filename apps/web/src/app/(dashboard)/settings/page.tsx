'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-xs text-foreground' : 'font-medium text-foreground'}>{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { session } = useAuth();
  if (!session) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Your account and organization details.</p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Your account</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Name" value={`${session.user.firstName} ${session.user.lastName}`} />
              <Separator />
              <Row label="Email" value={session.user.email} />
              <Separator />
              <Row label="Role" value={session.role} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Name" value={session.organization.name} />
              <Separator />
              <Row label="Organization ID" value={session.organization.id} mono />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
