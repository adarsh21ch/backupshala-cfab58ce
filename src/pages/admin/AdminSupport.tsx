import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/format';
import { Mail, CheckCircle, MessageSquare } from 'lucide-react';

const AdminSupport = () => {
  const queryClient = useQueryClient();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['admin-support'],
    queryFn: async () => {
      const { data } = await supabase.from('contact_submissions' as any).select('*').order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('contact_submissions' as any).update({ status: 'read' } as any).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-support'] }),
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Support Submissions</h1>

        {isLoading ? (
          <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : !submissions?.length ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No support submissions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((s: any) => (
              <div key={s.id} className={`rounded-xl border bg-card p-5 ${s.status === 'unread' ? 'border-primary/30' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-heading text-sm font-600">{s.name}</p>
                      <Badge variant={s.status === 'unread' ? 'default' : 'secondary'} className="text-[10px]">{s.status}</Badge>
                      <span className="text-xs text-muted-foreground">{s.subject}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.email} · {timeAgo(s.created_at)}</p>
                    <p className="mt-2 text-sm text-foreground">{s.message}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {s.status === 'unread' && (
                      <Button size="sm" variant="outline" onClick={() => markRead.mutate(s.id)} className="rounded-md">
                        <CheckCircle className="h-3 w-3 mr-1" /> Mark Read
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild className="rounded-md">
                      <a href={`mailto:${s.email}?subject=Re: ${s.subject} — Backupshala Support`}>
                        <Mail className="h-3 w-3 mr-1" /> Reply
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminSupport;
