import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Star, Check, X, Clock } from 'lucide-react';

const AdminCreatorPro = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['admin-pro-subs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_pro_subscriptions')
        .select('*, creator:profiles!creator_pro_subscriptions_creator_id_fkey(full_name, email, creator_display_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ subId, updates }: { subId: string; updates: any }) => {
      const { error } = await supabase
        .from('creator_pro_subscriptions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pro-subs'] });
      toast({ title: 'Plan updated ✓' });
    },
    onError: () => toast({ title: 'Failed to update', variant: 'destructive' }),
  });

  const statusBadge = (plan: string, status: string) => {
    if (status === 'cancelled') return <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-destructive/10 text-destructive">Cancelled</span>;
    if (plan === 'trial') return <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-accent/10 text-accent">Trial</span>;
    if (plan === 'pro') return <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary">Pro</span>;
    return <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-secondary text-muted-foreground">Free</span>;
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-700 flex items-center gap-2">
          <Star className="h-6 w-6 text-accent" /> Creator Pro Plans
        </h1>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : subs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No Pro plan subscriptions yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-card border-b border-border">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Creator</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Plan</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Started</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Expires</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subs.map((s: any) => (
                  <tr key={s.id} className="hover:bg-secondary/30">
                    <td className="p-3">
                      <p className="font-medium">{s.creator?.creator_display_name || s.creator?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{s.creator?.email}</p>
                    </td>
                    <td className="p-3 capitalize">{s.plan}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {s.plan === 'trial' && s.trial_started_at
                        ? new Date(s.trial_started_at).toLocaleDateString()
                        : s.pro_started_at
                        ? new Date(s.pro_started_at).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {s.plan === 'trial' && s.trial_ends_at
                        ? new Date(s.trial_ends_at).toLocaleDateString()
                        : s.pro_ends_at
                        ? new Date(s.pro_ends_at).toLocaleDateString()
                        : 'Indefinite'}
                    </td>
                    <td className="p-3">{statusBadge(s.plan, s.status)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {s.plan !== 'pro' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs rounded-md"
                            onClick={() => updatePlan.mutate({
                              subId: s.id,
                              updates: { plan: 'pro', status: 'active', pro_started_at: new Date().toISOString() },
                            })}
                          >
                            Activate Pro
                          </Button>
                        )}
                        {s.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-destructive rounded-md"
                            onClick={() => updatePlan.mutate({
                              subId: s.id,
                              updates: { status: 'cancelled' },
                            })}
                          >
                            Cancel
                          </Button>
                        )}
                        {s.status === 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs rounded-md"
                            onClick={() => updatePlan.mutate({
                              subId: s.id,
                              updates: { status: 'active' },
                            })}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminCreatorPro;
