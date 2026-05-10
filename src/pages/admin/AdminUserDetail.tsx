import { useParams, Link } from 'react-router-dom';
import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';
import { ArrowLeft, Eye, Mail, Phone, User as UserIcon } from 'lucide-react';

const AdminUserDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: profile } = useQuery({
    queryKey: ['admin-user-profile', id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', id!).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: enrollments } = useQuery({
    queryKey: ['admin-user-enrollments', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('id, enrolled_at, amount_paid, is_completed, tier, courses(title, slug)')
        .eq('student_id', id!)
        .order('enrolled_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ['admin-user-payments', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, created_at, amount_total, status, courses(title)')
        .eq('student_id', id!)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/admin/students">
              <Button size="sm" variant="ghost"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            </Link>
            <h1 className="text-2xl font-heading font-bold">View as user</h1>
            <Badge variant="outline" className="gap-1"><Eye className="h-3 w-3" /> Read-only</Badge>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" /> {profile?.full_name || '—'}</div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {profile?.email}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {profile?.phone || '—'}</div>
            <div>Wallet: <span className="font-semibold">{formatINR(profile?.wallet_balance ?? 0)}</span></div>
            <div>Earned: <span className="font-semibold">{formatINR(profile?.total_earned ?? 0)}</span></div>
            <div>Referred: <span className="font-semibold">{profile?.total_referred ?? 0}</span></div>
            <div className="text-muted-foreground">Joined: {profile?.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy') : '—'}</div>
            <div className="text-muted-foreground">Referrer: {profile?.referrer_email}</div>
            {profile?.deleted_at && <div className="text-destructive">Deleted: {format(new Date(profile.deleted_at), 'dd MMM yyyy')}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Enrollments ({enrollments?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(enrollments ?? []).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <div className="font-medium">{e.courses?.title || 'Untitled'}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(e.enrolled_at), 'dd MMM yyyy')} · {e.tier}</div>
                </div>
                <div className="text-right">
                  <div>{formatINR(e.amount_paid)}</div>
                  {e.is_completed && <Badge variant="secondary" className="text-[10px]">Completed</Badge>}
                </div>
              </div>
            ))}
            {!enrollments?.length && <p className="text-muted-foreground">No enrollments.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payments ({payments?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(payments ?? []).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <div className="font-medium">{p.courses?.title || '—'}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'dd MMM yyyy HH:mm')}</div>
                </div>
                <div className="text-right">
                  <div>{formatINR(p.amount_total)}</div>
                  <Badge variant={p.status === 'paid' ? 'default' : 'outline'} className="text-[10px]">{p.status}</Badge>
                </div>
              </div>
            ))}
            {!payments?.length && <p className="text-muted-foreground">No payments.</p>}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminUserDetail;
